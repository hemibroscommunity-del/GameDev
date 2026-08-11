/* ═══ v2.3.1664: ON-CHAIN SCORE CHECKPOINTS ═══
 *
 * The game-facing half of the Hemi integration (the signing/encoding half is
 * chainwriter.js; the contract is contracts/BroTownScores.sol; the operator
 * runbook is docs/specs/progression-onchain.md).
 *
 * WHAT GETS ATTESTED, AND WHY ONLY THIS.  Two numbers: character level and
 * kills.  Both are SERVER-COMPUTED — level is `_prog3Recompute`'s sum of
 * trained skills, and `svKills` is incremented in `_resolveMonsterKill`,
 * which is the same function that pays the XP and spawns the loot.  The
 * leaderboard's other columns (gold earned, playtime, dungeons) are still
 * client-reported vanity, and putting a client-reported number on a
 * permanent public ledger would make the chain record LOOK authoritative
 * while being no better than the client's word.  So they are deliberately
 * left off.  If those become server-owned later, widen the attestation then.
 *
 * WHEN.  On milestone crossings only — levels 5, 10, 25, 50, 100, 150, 200,
 * 250, 300.  A write costs real gas, so the cadence is bounded at nine
 * transactions per character for the lifetime of the account, and the stored
 * `chain_score:<pid>` record makes a repeat write impossible even across
 * deploys.  This is not a per-kill ledger and should not become one.
 *
 * FAILURE POSTURE (the load-bearing rule).  A chain problem MUST NOT be a
 * game problem.  Every path here is fire-and-forget with the failure
 * swallowed: an RPC outage, an unfunded relayer, a missing secret and a
 * reverted transaction all end the same way — nothing is stored, the player
 * notices nothing, and the next milestone (or the next level-up at the same
 * milestone) retries.  Nothing in a combat path ever awaits this.
 */

import { sendRecordScore, normalizePrivKey } from './chainwriter.js';
import { CHAIN } from './onchain.js';

export const CHAIN_SCORE = {
  /* Nine lifetime checkpoints against a 300 cap.  Level 3 is a fresh prog3
     character (three level-1 trained skills), so 5 is the first that means
     anything actually happened. */
  MILESTONES: [5, 10, 25, 50, 100, 150, 200, 250, 300],
  KEY: (pid) => 'chain_score:' + pid,
};

export const chainScoreMethods = {
  /** Configured only when BOTH secrets exist.  Absent = the feature is off
   *  and every entry point below no-ops; the game is unaffected, which is
   *  what lets this ship before the contract is deployed. */
  _chainScoreConfigured() {
    return !!(this.env && this.env.RELAYER_KEY && this.env.SCORES_CONTRACT);
  },

  /** The highest milestone this level has reached, or 0 for none. */
  _chainScoreMilestone(level) {
    let hit = 0;
    for (const m of CHAIN_SCORE.MILESTONES) if ((level || 0) >= m) hit = m;
    return hit;
  },

  /**
   * Consider writing a checkpoint for this player.  Safe to call on every
   * level-up; it exits cheaply in the overwhelmingly common case.
   * Returns a result object for the test suite and the admin route — game
   * callers ignore it.
   */
  async _chainScoreCheckpoint(playerId, ps) {
    if (!playerId || !ps) return { ok: false, reason: 'no-player' };
    if (!this._chainScoreConfigured()) return { ok: false, reason: 'not-configured' };

    const level = ps.level || 0;
    const milestone = this._chainScoreMilestone(level);
    if (!milestone) return { ok: false, reason: 'below-first-milestone' };

    /* In-flight guard.  The DO handles one event at a time, but this method
       AWAITS — first storage, then the network — so a second level-up can
       re-enter mid-flight.  Two checkpoints for the same player would build
       the SAME nonce, double-spend gas, and leave one transaction to fail
       with "nonce too low".
       CLAIM THE LANE BEFORE THE FIRST AWAIT.  An earlier version added to
       the set after the storage read, which left the whole read window
       unguarded — both callers saw an empty set and proceeded.  The
       chainscore suite's re-entrancy case pins this ordering; if you move
       this line below an await, that test deadlocks rather than fails,
       which is the loudest possible reminder.
       Memory-only (rule 11): a deploy just re-opens the lane. */
    if (!this._chainInFlight) this._chainInFlight = new Set();
    if (this._chainInFlight.has(playerId)) return { ok: false, reason: 'in-flight' };
    this._chainInFlight.add(playerId);

    try {
      let stored = null;
      try { stored = await this.state.storage.get(CHAIN_SCORE.KEY(playerId)); } catch (e) { /* treat as absent */ }
      if (stored && (stored.milestone || 0) >= milestone) {
        return { ok: false, reason: 'already-recorded' };
      }

      const kills = Math.max(0, Math.floor(ps.svKills || 0));
      /* The contract enforces monotonicity, so a stale local view can only
         ever be REJECTED on-chain, never silently overwrite a better score. */
      const nonce = (stored && stored.nonce ? stored.nonce : 0) + 1;

      let priv;
      try {
        priv = normalizePrivKey(this.env.RELAYER_KEY);
      } catch (e) {
        /* A malformed secret is an operator error, not a player error.
           Never echo the value — only that it failed to parse. */
        return { ok: false, reason: 'relayer-key-malformed' };
      }

      const res = await sendRecordScore({
        playerId,
        level,
        kills,
        nonce,
        contract: this.env.SCORES_CONTRACT,
        priv,
        chainId: Number(this.env.CHAIN_ID || CHAIN.id),
        /* Test seam, mirroring onchain.js's `fetchImpl` convention: the
           suite sets `_chainRpcOpts` to run this whole path with no
           network.  Unset in production. */
        opts: this._chainRpcOpts || {},
      });

      if (!res.ok) return res;

      await this.state.storage.put(CHAIN_SCORE.KEY(playerId), {
        milestone, nonce, level, kills, txHash: res.txHash, at: Date.now(),
      });

      /* Tell the player their run is on-chain.  Privileged event — a forged
         one would paint a fake explorer link. */
      const ws = this._wsBySessionId(playerId);
      if (ws) {
        try {
          ws.send(JSON.stringify({
            type: 'chain_score_recorded',
            payload: {
              level, kills, milestone, txHash: res.txHash,
              explorer: CHAIN.explorer + '/tx/' + res.txHash,
            },
          }));
        } catch (e) {}
      }
      return { ok: true, txHash: res.txHash, milestone, level, kills };
    } finally {
      this._chainInFlight.delete(playerId);
    }
  },

  /**
   * Fire-and-forget wrapper for game paths.  NOTHING in combat awaits the
   * chain: this returns immediately and the promise's failure is swallowed.
   * Called from the prog3 level-up (prog3.js `_prog3AwardXp`).
   */
  _chainScoreOnLevelUp(playerId, ps) {
    if (!this._chainScoreConfigured()) return;
    if (!this._chainScoreMilestone(ps && ps.level)) return;   // cheap pre-filter
    try {
      Promise.resolve(this._chainScoreCheckpoint(playerId, ps)).catch(() => {});
    } catch (e) { /* never propagates into combat */ }
  },

  /** The player's last on-chain record, for the client's badge/link. */
  async _chainScoreRead(playerId) {
    try { return (await this.state.storage.get(CHAIN_SCORE.KEY(playerId))) || null; }
    catch (e) { return null; }
  },
};
