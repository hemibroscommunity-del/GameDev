// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  BroTownScores
 * @notice A public, append-only record of BroTown player skill levels on Hemi.
 *
 * WHY THIS SHAPE.  BroTown's server is authoritative for combat, XP and loot
 * (it rolls every hit; the client only sends intent).  Pretending otherwise
 * would be theatre, so this contract does not try to re-derive game state
 * on-chain.  What it does instead is make the server's claims *permanent and
 * public*, and — the part that matters — make them impossible for the server
 * to quietly retract:
 *
 *   - The server signs a score attestation off-chain.
 *   - `recordScore` is PERMISSIONLESS.  Anyone holding a valid attestation can
 *     post it.  So once the server has signed a score, any player who kept
 *     that signature can put it on-chain themselves, forever, whether or not
 *     the operator still wants it there.
 *   - The server relays by default and pays the gas, so playing stays free.
 *
 * The signer is immutable and there is no owner, no pause, no upgrade path and
 * no withdrawal function.  The contract holds no funds and cannot be rewritten
 * — the deployment IS the commitment.
 *
 * Levels are monotonic per skill: a value may only ever increase.  A
 * compromised or buggy server can therefore inflate a level but can never
 * erase or roll one back.
 *
 * ── WHY SKILLS ARE NAMES, NOT FIELDS ───────────────────────────────────────
 *
 * An earlier draft of this contract had a fixed struct — `level` and `kills`.
 * That was a mistake for something that can never be upgraded: adding
 * per-skill boards (melee / bow / magic) or the ten life skills would have
 * meant deploying a SECOND contract and stranding every score already written
 * at the old address.
 *
 * So the store is `player => skill => level`, where `skill` is the skill's
 * short name written directly as bytes32 ("melee", "fishing", "trapping").
 * The consequences are the point:
 *
 *   - A skill added years from now needs NO contract change.  The game starts
 *     signing a new name and it works.
 *   - There is no id registry to keep in sync, and therefore no way for the
 *     repo and the chain to disagree about what id 7 meant.
 *   - Short ASCII names are mostly zero bytes, which are the cheap kind of
 *     calldata, and they render as readable text in a block explorer.  A
 *     reader sees `fishing`, not `skillId: 7`.
 *
 * `kills` rides along as just another key.  It is not a level, but it is a
 * server-computed monotonic counter, which is the only property this contract
 * actually cares about.
 */
contract BroTownScores {
    /// @notice The game server's attestation key.  Immutable by design.
    address public immutable signer;

    /// @notice player key => skill key => level.  The player key is
    /// keccak256(bytes(playerId)) — the game's stable `bp_` identity, hashed so
    /// the raw id never lands on a public chain.  The skill key is the skill's
    /// short name as bytes32, in the clear, because it is not a secret and
    /// being readable is the whole point.
    mapping(bytes32 => mapping(bytes32 => uint32)) public levels;

    /// @notice Replay protection, strictly increasing per player.
    mapping(bytes32 => uint64) public nonces;

    /// @notice Block timestamp of each player's last accepted attestation.
    mapping(bytes32 => uint64) public updatedAt;

    /// @notice Every player key ever recorded, for enumeration by a UI.
    bytes32[] public players;
    mapping(bytes32 => bool) private _seenPlayer;

    /// @notice Every skill key ever recorded.  Lets a reader discover the
    /// board's columns from the chain alone, without consulting the game.
    bytes32[] public skills;
    mapping(bytes32 => bool) private _seenSkill;

    event ScoreRecorded(
        bytes32 indexed player,
        bytes32[] skillKeys,
        uint32[] values,
        uint64 nonce,
        address relayer
    );

    error BadSignature();
    error StaleNonce();
    error NotMonotonic();
    error LengthMismatch();
    error EmptyUpdate();

    constructor(address _signer) {
        require(_signer != address(0), "signer required");
        signer = _signer;
    }

    function playerCount() external view returns (uint256) {
        return players.length;
    }

    function skillCount() external view returns (uint256) {
        return skills.length;
    }

    /// @notice Read one page of a single skill's board without an archive
    /// node.  Returns player keys and their levels in insertion order; ranking
    /// is the reader's job, which keeps the write path cheap.
    function page(bytes32 skill, uint256 start, uint256 count)
        external
        view
        returns (bytes32[] memory keys, uint32[] memory out)
    {
        uint256 n = players.length;
        if (start >= n) return (new bytes32[](0), new uint32[](0));
        uint256 end = start + count;
        if (end > n) end = n;
        uint256 len = end - start;
        keys = new bytes32[](len);
        out = new uint32[](len);
        for (uint256 i = 0; i < len; i++) {
            keys[i] = players[start + i];
            out[i] = levels[keys[i]][skill];
        }
    }

    /// @notice Read every tracked skill for one player in a single call.
    function playerSkills(bytes32 player, bytes32[] calldata skillKeys)
        external
        view
        returns (uint32[] memory out)
    {
        out = new uint32[](skillKeys.length);
        for (uint256 i = 0; i < skillKeys.length; i++) {
            out[i] = levels[player][skillKeys[i]];
        }
    }

    /**
     * @notice Post a server-signed attestation covering one or more skills.
     *         Anyone may call this.
     * @param player    keccak256 of the player's stable game id
     * @param skillKeys skill short names as bytes32, e.g. bytes32("fishing")
     * @param values    the level being attested for each key, same order
     * @param nonce     strictly increasing per player
     * @param sig       65-byte secp256k1 signature from `signer` over `digest()`
     *
     * Sending only the skills that CHANGED is both allowed and expected — the
     * monotonic guard uses `>=`, so re-sending an unchanged value is harmless
     * if the server ever loses track of what it already wrote.
     */
    function recordScore(
        bytes32 player,
        bytes32[] calldata skillKeys,
        uint32[] calldata values,
        uint64 nonce,
        bytes calldata sig
    ) external {
        if (skillKeys.length != values.length) revert LengthMismatch();
        if (skillKeys.length == 0) revert EmptyUpdate();
        if (nonce <= nonces[player]) revert StaleNonce();

        for (uint256 i = 0; i < skillKeys.length; i++) {
            if (values[i] < levels[player][skillKeys[i]]) revert NotMonotonic();
        }

        if (_recover(digest(player, skillKeys, values, nonce), sig) != signer) {
            revert BadSignature();
        }

        if (!_seenPlayer[player]) {
            _seenPlayer[player] = true;
            players.push(player);
        }

        for (uint256 i = 0; i < skillKeys.length; i++) {
            bytes32 k = skillKeys[i];
            if (!_seenSkill[k]) {
                _seenSkill[k] = true;
                skills.push(k);
            }
            levels[player][k] = values[i];
        }

        nonces[player] = nonce;
        updatedAt[player] = uint64(block.timestamp);

        emit ScoreRecorded(player, skillKeys, values, nonce, msg.sender);
    }

    /**
     * @notice The exact message the server signs.
     *
     * `block.chainid` and `address(this)` are bound into the inner hash so an
     * attestation signed for this contract on Hemi cannot be replayed against
     * another deployment or another chain.  The outer wrap is the EIP-191
     * personal_sign envelope, which is what the off-chain signer produces.
     *
     * The two arrays are hashed SEPARATELY and their digests folded in as
     * fixed-size words.  Packing two dynamic arrays adjacently would let an
     * attacker slide the boundary between them and produce a different
     * (skillKeys, values) pair with an identical preimage; hashing first makes
     * every component of the outer hash fixed-width, so there is no boundary
     * to move.
     */
    function digest(
        bytes32 player,
        bytes32[] calldata skillKeys,
        uint32[] calldata values,
        uint64 nonce
    ) public view returns (bytes32) {
        bytes32 inner = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                player,
                keccak256(abi.encodePacked(skillKeys)),
                keccak256(abi.encodePacked(values)),
                nonce
            )
        );
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
    }

    function _recover(bytes32 d, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        // EIP-2: reject the malleable high-s half of the curve.
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return address(0);
        }
        return ecrecover(d, v, r, s);
    }
}
