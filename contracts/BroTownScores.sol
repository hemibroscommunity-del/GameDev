// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  BroTownScores
 * @notice A public, append-only record of BroTown player milestones on Hemi.
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
 * Scores are monotonic: a level or kill count may only ever increase.  A
 * compromised or buggy server can therefore inflate a score but can never
 * erase or roll one back.
 */
contract BroTownScores {
    /// @notice The game server's attestation key.  Immutable by design.
    address public immutable signer;

    struct Score {
        uint32 level;   // character level (prog3: sum of trained skills, cap 300)
        uint32 kills;   // lifetime monster kills
        uint64 at;      // block timestamp of the last accepted attestation
        uint64 nonce;   // strictly increasing per player; replay protection
    }

    /// @notice player key => latest recorded score.  The key is
    /// keccak256(bytes(playerId)) — the game's stable `bp_` identity, hashed so
    /// the raw id never lands on a public chain.
    mapping(bytes32 => Score) public scores;

    /// @notice Every player key ever recorded, for enumeration by a UI.
    bytes32[] public players;
    mapping(bytes32 => bool) private _seen;

    event ScoreRecorded(
        bytes32 indexed player,
        uint32 level,
        uint32 kills,
        uint64 nonce,
        address relayer
    );

    error BadSignature();
    error StaleNonce();
    error NotMonotonic();

    constructor(address _signer) {
        require(_signer != address(0), "signer required");
        signer = _signer;
    }

    function playerCount() external view returns (uint256) {
        return players.length;
    }

    /// @notice Read a page of the board without an archive node.
    function page(uint256 start, uint256 count)
        external
        view
        returns (bytes32[] memory keys, Score[] memory out)
    {
        uint256 n = players.length;
        if (start >= n) return (new bytes32[](0), new Score[](0));
        uint256 end = start + count;
        if (end > n) end = n;
        uint256 len = end - start;
        keys = new bytes32[](len);
        out = new Score[](len);
        for (uint256 i = 0; i < len; i++) {
            keys[i] = players[start + i];
            out[i] = scores[keys[i]];
        }
    }

    /**
     * @notice Post a server-signed score attestation.  Anyone may call this.
     * @param player keccak256 of the player's stable game id
     * @param level  character level being attested
     * @param kills  lifetime kills being attested
     * @param nonce  strictly increasing per player
     * @param sig    65-byte secp256k1 signature from `signer` over `digest()`
     */
    function recordScore(
        bytes32 player,
        uint32 level,
        uint32 kills,
        uint64 nonce,
        bytes calldata sig
    ) external {
        Score storage s = scores[player];
        if (nonce <= s.nonce) revert StaleNonce();
        if (level < s.level || kills < s.kills) revert NotMonotonic();
        if (_recover(digest(player, level, kills, nonce), sig) != signer) {
            revert BadSignature();
        }

        if (!_seen[player]) {
            _seen[player] = true;
            players.push(player);
        }
        s.level = level;
        s.kills = kills;
        s.nonce = nonce;
        s.at = uint64(block.timestamp);

        emit ScoreRecorded(player, level, kills, nonce, msg.sender);
    }

    /**
     * @notice The exact message the server signs.
     *
     * `block.chainid` and `address(this)` are bound into the inner hash so an
     * attestation signed for this contract on Hemi cannot be replayed against
     * another deployment or another chain.  The outer wrap is the EIP-191
     * personal_sign envelope, which is what the off-chain signer produces.
     */
    function digest(bytes32 player, uint32 level, uint32 kills, uint64 nonce)
        public
        view
        returns (bytes32)
    {
        bytes32 inner = keccak256(
            abi.encodePacked(block.chainid, address(this), player, level, kills, nonce)
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
