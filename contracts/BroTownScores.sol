// SPDX-License-Identifier: MIT
/* v2.3.1682: pragma PINNED to the exact compiler every fixture came from.
   The digest constant in server/test/chainwriter.test.mjs, the recordScore
   selector (0xfc9f73a9) and the measured gas numbers were all produced by
   solc 0.8.26 via tools/dev/evm-conformance.mjs; a floating ^0.8.20 meant
   Remix could legally deploy bytecode no fixture had ever seen.  One
   compiler, stated once, used everywhere: Remix, the conformance harness,
   and the explorer's source verification form.
   CANONICAL BUILD SETTINGS (needed again, verbatim, when verifying the
   source on explorer.hemi.xyz): solc 0.8.26, optimizer ENABLED, runs 200. */
pragma solidity 0.8.26;

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
 * There is no owner, no pause, no upgrade path and no withdrawal function.
 * The contract holds no funds and cannot be rewritten — the deployment IS
 * the commitment.
 *
 * ── THE TRUST MODEL, PLAINLY (v2.3.1682) ──────────────────────────────────
 *
 * Nobody can change anything except which key signs NEW scores, and only the
 * guardian holds that switch.  History is untouchable by everyone:
 *
 *   - The GUARDIAN (an address fixed forever at deploy — the operator's
 *     personal wallet, never stored on any server) has exactly one power:
 *     `rotateSigner`.  It cannot write scores, cannot erase them, cannot
 *     pause the contract, cannot move funds (there are none), and cannot
 *     hand its role to anyone else.
 *   - Rotation exists because the SIGNER key must live on a server to sign
 *     attestations, and server keys can leak.  Before v2.3.1682 the signer
 *     was immutable, so a leaked key meant fake scores at this address
 *     forever and the only remedy was redeploying — stranding every score
 *     ever written.  Now a leak is a five-minute fix: the guardian rotates,
 *     the new key signs, the old key is dead HERE, and history stays put.
 *   - Worst case if the guardian key itself leaks: the thief can rotate the
 *     signer to a key they control — i.e. gain the power the signer already
 *     had.  They still cannot touch a single recorded score.  Adding the
 *     guardian therefore strictly reduces risk; it does not concentrate it.
 *
 * Levels are monotonic per skill: a value may only ever increase — enforced
 * against live storage at the moment of each write (v2.3.1682), so not even
 * a maliciously crafted attestation with duplicate keys can end a skill
 * below the highest value it attests.  A compromised or buggy server can
 * therefore inflate a level but can never erase or roll one back.
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
    /// @notice The game server's attestation key.  Rotatable by the guardian
    /// alone (see the trust model above); every other property of the
    /// contract is fixed at deploy.
    address public signer;

    /// @notice The one address that can rotate `signer`.  Immutable: the
    /// guardian role itself can never move, be renounced, or be widened.
    address public immutable guardian;

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

    /// @notice The signer changed.  Indexed both ways so an explorer can
    /// answer "when did key X stop signing" without scanning bodies.
    event SignerRotated(address indexed prev, address indexed next);

    error BadSignature();
    error StaleNonce();
    error NotMonotonic();
    error LengthMismatch();
    error EmptyUpdate();

    constructor(address _signer, address _guardian) {
        require(_signer != address(0), "signer required");
        require(_guardian != address(0), "guardian required");
        signer = _signer;
        guardian = _guardian;
    }

    /// @notice Replace the attestation key.  Guardian only.
    /// Require-with-string rather than a custom error, deliberately: this is
    /// a cold path a human operator drives from an explorer's Write tab in
    /// an emergency, and "not guardian" in the wallet popup beats a four-byte
    /// selector they would have to look up.
    function rotateSigner(address next) external {
        require(msg.sender == guardian, "not guardian");
        require(next != address(0), "signer required");
        address prev = signer;
        signer = next;
        emit SignerRotated(prev, next);
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

        /* v2.3.1682: signature verified BEFORE any storage loop.  Two wins:
           an unauthenticated spam call now reverts before paying for a pass
           of SLOADs, and — the real one — the monotonic guard below can run
           against LIVE storage at the moment of each write.  The old shape
           (a read-only pre-pass, then a write loop) had a hole: duplicate
           keys in one call, e.g. ("melee",50),("melee",45) over a stored 40,
           passed the pre-pass (both >= 40) and last-write-wins stored 45 —
           BELOW the 50 the very same message attested.  Only the signer
           could craft that message, but "values only ever increase" should
           be a property of the contract, not a courtesy of the server. */
        if (_recover(digest(player, skillKeys, values, nonce), sig) != signer) {
            revert BadSignature();
        }

        if (!_seenPlayer[player]) {
            _seenPlayer[player] = true;
            players.push(player);
        }

        for (uint256 i = 0; i < skillKeys.length; i++) {
            bytes32 k = skillKeys[i];
            if (values[i] < levels[player][k]) revert NotMonotonic();
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
