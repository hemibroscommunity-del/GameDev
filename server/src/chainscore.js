/* ═══ v2.3.1664: ON-CHAIN SCORE CHECKPOINTS ═══
 *
 * The game-facing half of the Hemi integration (the signing/encoding half is
 * chainwriter.js; the contract is contracts/BroTownScores.sol; the operator
 * runbook is docs/specs/progression-onchain.md).
 *
 * WHAT GETS ATTESTED, AND WHY ONLY THIS.  Every SERVER-COMPUTED progression
 * number the game owns:
 *
 *   - the three trained combat skills (melee / bow / magic), from `ps.prog3`,
 *     which `_prog3AwardXp` raises and nothing client-side can write;
 *   - the ten life skills, from `ps.lifeSkills`, raised by `_addLifeSkillXp`
 *     in gathering.js — server-side, in the same function that grants the
 *     harvest;
 *   - `kills`, incremented in `_resolveMonsterKill`, the same function that
 *     pays the XP and spawns the loot.
 *
 * The leaderboard's REMAINING columns — gold earned, playtime, dungeons —
 * are still client-reported vanity, and putting a client-reported number on a
 * permanent public ledger would make the chain record LOOK authoritative
 * while being worth no more than the client's word.  They are deliberately
 * left off.  If they become server-owned later, widen SERIES then; the
 * contract needs no change to accept a new key.
 *
 * KNOWN SOFT SPOT, recorded rather than hidden: join.js can bootstrap
 * `lifeSkills` from a client-sent blob on a legacy record's FIRST join (the
 * pre-server-ownership migration path).  Everything after that first join is
 * server-computed.  So a life-skill level is authoritative going forward but
 * could, for an old account, have started from a claim.  Combat levels and
 * kills have no such path.
 *
 * WHEN.  On combat-level milestone crossings only — levels 5, 10, 25, 50,
 * 100, 150, 200, 250, 300.  A write costs real gas, so the cadence is bounded
 * at nine transactions per character for the lifetime of the account, and the
 * stored `chain_score:<pid>` record makes a repeat write impossible even
 * across deploys.  This is not a per-kill ledger and should not become one.
 * Life-skill levels ride along on those same nine writes rather than
 * triggering their own — ten more skills must not mean ten times the gas.
 *
 * FAILURE POSTURE (the load-bearing rule).  A chain problem MUST NOT be a
 * game problem.  Every path here is fire-and-forget with the failure
 * swallowed: an RPC outage, an unfunded relayer, a missing secret and a
 * reverted transaction all end the same way — nothing is stored, the player
 * notices nothing, and the next milestone retries.  Nothing in a combat path
 * ever awaits this.
 */

import {
  sendRecordScore, normalizePrivKey, privToAddress,
  readPlayerNonce, readContractSigner, playerKey,
} from './chainwriter.js';
import { CHAIN, rpcCall } from './onchain.js';
import { PROG3 } from './prog3.js';

/* The life skills the game tracks server-side.  Mirrors LIFE_SKILLS in
   src/data/lifeSkills.js — if that list grows, add it here and the chain
   picks it up with NO contract change (skills are addressed by name, see the
   contract's header). */
export const LIFE_SKILL_KEYS = [
  'woodcutting', 'fishing', 'mining', 'farming', 'cooking',
  'blacksmithing', 'woodworking', 'gemCutting', 'enchanting', 'trapping',
];

/* On-chain key names.  The three combat skills are stored internally as
   sword/bow/staff but have always been PRESENTED as Melee/Bow/Magic, and the
   chain record is a presentation surface — a reader should not need the
   repo's glossary to understand a column. */
export const COMBAT_SKILL_KEYS = { sword: 'melee', bow: 'bow', staff: 'magic' };

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

  /** RPC options for every chain call this module makes (v2.3.1682).  One
   *  helper, four call sites (send, preflight, nonce read, chainstatus), so
   *  a CHAIN_RPC override cannot apply to some of them and not others.  The
   *  test seam `_chainRpcOpts` wins outright — a suite that stubs the node
   *  must never half-escape to a real URL. */
  _chainRpcOptions() {
    if (this._chainRpcOpts) return this._chainRpcOpts;
    return (this.env && this.env.CHAIN_RPC) ? { rpc: this.env.CHAIN_RPC } : {};
  },

  /**
   * v2.3.1682: PREFLIGHT — prove the config can possibly work before
   * spending gas on it.  The two failure modes this closes were the worst
   * kind, silent and permanent: a wrong `_SIGNER` at deploy meant every
   * write reverted BadSignature forever, and a typoed SCORES_CONTRACT
   * pointing at an EOA meant sends "succeeded" (calls to an EOA do) and got
   * recorded as real.  Three checks, cheapest first:
   *   1. address well-formed + non-zero        (pure, no RPC)
   *   2. eth_getCode is not '0x'               (is there a contract at all?)
   *   3. contract.signer() == our relayer addr (will it accept our key?)
   *
   * CACHED for the DO lifetime (memory-only, rule 11): definitive verdicts
   * only.  Env can only change via a deploy, and a deploy wipes the DO — so
   * the cache self-heals at exactly the moment the operator could have
   * fixed the config.  Transient RPC failure is NOT a verdict and is not
   * cached.
   */
  async _chainScorePreflight(priv) {
    if (this._chainPreflightResult) return this._chainPreflightResult;
    const contract = String((this.env && this.env.SCORES_CONTRACT) || '');
    if (!/^0x[0-9a-fA-F]{40}$/.test(contract)) {
      return (this._chainPreflightResult = { ok: false, reason: 'contract-malformed' });
    }
    if (/^0x0{40}$/.test(contract)) {
      return (this._chainPreflightResult = { ok: false, reason: 'contract-zero' });
    }
    const relayer = privToAddress(priv).toLowerCase();
    const opts = this._chainRpcOptions();
    let code, signerOnContract;
    try {
      code = await rpcCall('eth_getCode', [contract, 'latest'], opts);
      if (!code || code === '0x') {
        return (this._chainPreflightResult = { ok: false, reason: 'no-contract-code' });
      }
      signerOnContract = await readContractSigner({ contract, opts });
    } catch (e) {
      /* An unreachable node says nothing about the config — retry next
         checkpoint, and never let one outage stick as a permanent verdict. */
      return { ok: false, reason: 'preflight-unreachable' };
    }
    if (signerOnContract !== relayer) {
      /* Cached even though the guardian could rotate the signer under us:
         rotation is an operator action, and the operator's next move after
         rotating is redeploying the worker with the new RELAYER_KEY secret —
         which wipes this cache anyway. */
      return (this._chainPreflightResult = { ok: false, reason: 'signer-mismatch', signerOnContract, relayer });
    }
    return (this._chainPreflightResult = { ok: true, relayer, signerOnContract });
  },

  /** v2.3.1682: at most ONE send in flight per DO, ever.  The per-player
   *  `_chainInFlight` lane cannot stop two DIFFERENT players from reading
   *  the same eth_getTransactionCount('pending') and broadcasting two
   *  transactions with the same relayer nonce — one of which loses.  A
   *  promise chain is the whole fix: everything chain-touching runs behind
   *  the previous job.  Memory-only (rule 11); a deploy wiping it mid-job is
   *  the receipt-gate's already-safe 'unconfirmed' case. */
  _chainEnqueue(job) {
    const run = (this._chainSendQueue || Promise.resolve()).then(job, job);
    this._chainSendQueue = run.then(() => {}, () => {});
    return run;
  },

  /** The highest milestone this level has reached, or 0 for none. */
  _chainScoreMilestone(level) {
    let hit = 0;
    for (const m of CHAIN_SCORE.MILESTONES) if ((level || 0) >= m) hit = m;
    return hit;
  },

  /**
   * Every server-owned number worth attesting, as { skillName: level }.
   * Zero-valued entries are dropped: an untouched life skill is noise on a
   * permanent ledger, and a skill absent from the contract simply reads 0.
   */
  _chainScoreSeries(ps) {
    const out = {};
    /* The trained-skill block is `prog3.sk`, NOT `prog3.skills` — see
       prog3FromLegacy / prog3Fresh.  An earlier version of this read
       `.skills`, found undefined, and reported an empty series: every board
       came back with zero rows while `level` (read from a different field)
       kept working, so the endpoint looked healthy.  The headless scenario
       caught it; no unit test would have, because the unit tests hand this
       function a hand-built ps. */
    const p3 = ps && ps.prog3;
    if (p3 && p3.sk) {
      for (const cat of PROG3.SKILLS) {
        const lvl = Math.max(0, Math.floor((p3.sk[cat] && p3.sk[cat].level) || 0));
        if (lvl > 0) out[COMBAT_SKILL_KEYS[cat] || cat] = lvl;
      }
    }
    const ls = ps && ps.lifeSkills;
    if (ls && typeof ls === 'object') {
      for (const name of LIFE_SKILL_KEYS) {
        const lvl = Math.max(0, Math.floor((ls[name] && ls[name].level) || 0));
        if (lvl > 0) out[name] = lvl;
      }
    }
    const kills = Math.max(0, Math.floor((ps && ps.svKills) || 0));
    if (kills > 0) out.kills = kills;
    return out;
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

      const series = this._chainScoreSeries(ps);

      /* Send only what CHANGED since the last accepted write.  Calldata and
         a cold SSTORE per skill are the whole cost of a checkpoint, and most
         of a player's fourteen series do not move between milestones.  Safe
         to get wrong in either direction: the contract's monotonic guard is
         `>=`, so re-sending an unchanged value is accepted and ignored, and
         a value we wrongly believe we already wrote is simply picked up at
         the next milestone. */
      const prev = (stored && stored.series) || {};
      const skills = [];
      const values = [];
      for (const [name, lvl] of Object.entries(series)) {
        if ((prev[name] || 0) === lvl) continue;
        skills.push(name);
        values.push(lvl);
      }
      if (!skills.length) return { ok: false, reason: 'nothing-changed' };

      let priv;
      try {
        priv = normalizePrivKey(this.env.RELAYER_KEY);
      } catch (e) {
        /* A malformed secret is an operator error, not a player error.
           Never echo the value — only that it failed to parse. */
        return { ok: false, reason: 'relayer-key-malformed' };
      }

      /* v2.3.1682: everything that touches the chain runs behind the per-DO
         queue — preflight, the nonce read, the send, and the receipt poll —
         so two players' checkpoints can never interleave their
         eth_getTransactionCount reads and collide on the relayer nonce. */
      const res = await this._chainEnqueue(async () => {
        const pre = await this._chainScorePreflight(priv);
        if (!pre.ok) return { ok: false, reason: pre.reason };

        /* v2.3.1682: the attestation nonce is now anchored to the CONTRACT,
           not just DO storage.  The old `stored.nonce + 1` had a cliff: lose
           the chain_score record (storage reset, migration bug) and the
           server restarts at 1 while the chain holds a higher nonces[player]
           — every future write for that player reverts StaleNonce forever,
           silently.  max(stored, chain) + 1 makes a lost record cost one
           read instead of the player's entire on-chain future.  Fail CLOSED
           on a failed read: a guessed-wrong nonce is the exact gas-burning
           revert this exists to prevent. */
        let chainNonce;
        try {
          chainNonce = await readPlayerNonce({
            contract: this.env.SCORES_CONTRACT,
            player: playerKey(playerId),
            opts: this._chainRpcOptions(),
          });
        } catch (e) {
          return { ok: false, reason: 'nonce-read-failed' };
        }
        const storedNonce = (stored && stored.nonce) || 0;
        const nonce = Math.max(storedNonce, chainNonce) + 1;

        const sent = await sendRecordScore({
          playerId,
          skills,
          values,
          nonce,
          contract: this.env.SCORES_CONTRACT,
          priv,
          chainId: Number(this.env.CHAIN_ID || CHAIN.id),
          opts: this._chainRpcOptions(),
        });
        return sent.ok ? { ...sent, nonce } : sent;
      });

      if (!res.ok) return res;
      const nonce = res.nonce;

      await this.state.storage.put(CHAIN_SCORE.KEY(playerId), {
        milestone, nonce, level, series,
        kills: series.kills || 0,
        txHash: res.txHash, at: Date.now(),
      });

      /* Tell the player their run is on-chain.  Privileged event — a forged
         one would paint a fake explorer link. */
      const ws = this._wsBySessionId(playerId);
      if (ws) {
        try {
          ws.send(JSON.stringify({
            type: 'chain_score_recorded',
            payload: {
              level, milestone, series,
              kills: series.kills || 0,
              txHash: res.txHash,
              explorer: CHAIN.explorer + '/tx/' + res.txHash,
            },
          }));
        } catch (e) {}
      }
      return { ok: true, txHash: res.txHash, milestone, level, series, skills };
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

  /**
   * v2.3.1682: GET /api/admin/chainstatus[?id=<pid>] — the operator's "did
   * it work" answer, in one page.  Registered from _adminFetch (auth already
   * passed there; this returns null for paths it doesn't own, the
   * _liveopsRoutes convention).  Admin-gated because every operator read in
   * this repo is, and an open version would be a free RPC amplifier plus a
   * player-id enumeration surface.
   *
   * This is what the runbook's failure checklist points at: instead of four
   * things to check with no way to check them, one URL that says which of
   * the four it is — `signer-mismatch`, `no-contract-code`, a zero balance,
   * or nothing wrong at all.
   */
  async _chainScoreAdminRoute(request, url, path, json) {
    if (!(request.method === 'GET' && path === '/chainstatus')) return null;

    const out = {
      ok: true,
      configured: this._chainScoreConfigured(),
      contract: (this.env && this.env.SCORES_CONTRACT) || '',
      chainId: Number((this.env && this.env.CHAIN_ID) || CHAIN.id),
      rpc: (this.env && this.env.CHAIN_RPC) || CHAIN.rpc,
    };
    if (!out.configured) {
      out.missing = [
        !(this.env && this.env.RELAYER_KEY) ? 'RELAYER_KEY (Cloudflare secret)' : null,
        !(this.env && this.env.SCORES_CONTRACT) ? 'SCORES_CONTRACT (wrangler.toml)' : null,
      ].filter(Boolean);
      return json(out);
    }

    let priv = null;
    try {
      priv = normalizePrivKey(this.env.RELAYER_KEY);
      out.relayerAddress = privToAddress(priv);
    } catch (e) {
      out.relayerKey = 'malformed';   // never the value, only the verdict
      return json(out);
    }

    /* A status check is the one moment the operator WANTS a fresh answer —
       they may have just fixed the thing — so drop the cached verdict and
       re-run the preflight live. */
    this._chainPreflightResult = null;
    const pre = await this._chainScorePreflight(priv);
    out.codePresent = pre.reason !== 'no-contract-code' && pre.reason !== 'contract-malformed' && pre.reason !== 'contract-zero';
    out.signerOnContract = pre.signerOnContract || null;
    out.signerMatch = !!pre.ok;
    if (!pre.ok) out.problem = pre.reason;

    try {
      const balHex = await rpcCall('eth_getBalance', [out.relayerAddress, 'latest'], this._chainRpcOptions());
      const wei = BigInt(balHex);
      out.balanceWei = wei.toString();
      /* Four decimal places is plenty for "do I need to top up" — this is a
         readout for a human, not an accounting system. */
      out.balanceEth = (Number(wei / 1000000000000n) / 1e6).toFixed(4);
    } catch (e) {
      out.balance = 'unreadable';
    }

    const pid = url.searchParams.get('id');
    if (pid) {
      const rec = await this._chainScoreRead(pid);
      out.player = rec ? {
        ...rec,
        playerKey: '0x' + Array.from(playerKey(pid)).map((b) => b.toString(16).padStart(2, '0')).join(''),
        explorer: rec.txHash ? CHAIN.explorer + '/tx/' + rec.txHash : null,
      } : null;
    } else {
      /* Room-scale prefix list (the /economy precedent): count + newest. */
      try {
        const all = await this.state.storage.list({ prefix: 'chain_score:' });
        let newest = null;
        for (const [, v] of all) if (!newest || (v.at || 0) > (newest.at || 0)) newest = v;
        out.writes = all.size;
        out.lastWrite = newest ? {
          milestone: newest.milestone, level: newest.level, txHash: newest.txHash, at: newest.at,
          explorer: newest.txHash ? CHAIN.explorer + '/tx/' + newest.txHash : null,
        } : null;
      } catch (e) { /* listing is best-effort */ }
    }
    return json(out);
  },
};
