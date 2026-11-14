/* ═══ v2.3.4382: WHAT A REJOIN CLEARS, AND WHAT THE WORKER SAYS AGAIN ═══
 *
 * The state-machine sweep (2026-11-03; V6 N2-18, V8b P2-1, review R2 W1.3 and
 * "Missing 3a"): the phone kept its own copies of a worker session across a
 * reconnect.  A duel that ended while the phone was away (the 15 s forfeit, a
 * server update) stayed on it until a reload; a phone back inside the 15 s was
 * never told its duel was still on; a trade window whose trade the worker had
 * cancelled stayed up; an invite card the worker still held was dropped.
 *
 * The rule, the party's since v2.3.1185: the phone CLEARS its copy at every
 * state_sync, and the worker SAYS AGAIN, right after state_sync and to that
 * socket only, whatever is still live (server/src/rejoinresend.js).  So what
 * the phone shows after a rejoin is what the worker holds -- nothing more.
 *
 * DEPLOY ORDER.  The worker says how many of the slots below it re-sends in
 * `state_sync.caps.rejoinResend`, a COUNT that grows (TRAPS §9): a slot with
 * `since: n` is cleared here only when the count is n or more.  An old worker
 * (no count, or the kill switch `rejoinresend: false` in the live flags) gets
 * exactly today's phone: nothing new is cleared, so no live duel or trade is
 * lost against a worker that would not put it back.
 *
 * THE REGISTRY.  Every slot the phone clears at state_sync is a row, with the
 * worker method that re-sends it (or why none is needed).
 * server/test/rejoin-resend.test.mjs fails a clear in wsClient.js's
 * state_sync case that no row names, and a row whose re-send is missing or is
 * not called after state_sync in server/src/join.js.
 *
 * No imports but the duel lock, the trade slot and the resets' door (none
 * of their own), so node can test it. */
import { lockOntoDuelOpponent } from './duelLock.js';
import { t2OnStateSync } from './tradeSlot.js';
import { runResets } from './resetOn.js';   /* v2.3.5203: the rejoin edge's one door (card L) */

export const REJOIN_SLOTS = Object.freeze([
  /* v2.3.1185: the party HUD (wsClient.js setParty(null)); party.js */
  Object.freeze({ slot: 'party', since: 0, clears: ['setParty'], resend: '_partyOnRejoin' }),
  /* v2.3.3776: the skateboard -- the worker stores nothing and ends it too */
  Object.freeze({ slot: 'ride', since: 0, clears: ['clearRide'], resend: null, why: 'the worker forgets the ride as well (ride.js stores nothing)' }),
  /* v2.3.4362: the trade's invite card, waiting drawer and receipt.  Since
     v2.3.4382 an invite still live comes back (_t2Resend) */
  Object.freeze({ slot: 'trade-invite', since: 0, clears: ['t2OnStateSync'], resend: '_t2Resend' }),
  /* v2.3.4382: a social or wagered duel (_inDuel, _activeDuel, the lock) */
  Object.freeze({ slot: 'duel', since: 1, clears: ['rejoinClear'], resend: '_duelResend' }),
  /* v2.3.3713's arena match rides the same _inDuel: cleared with the duel,
     said again by the arena's own arena_match_start (gladiator.js) */
  Object.freeze({ slot: 'arena', since: 1, clears: ['rejoinClear'], resend: '_arenaOnRejoin' }),
  /* v2.3.4382: an open trade window (S._t2Live) */
  Object.freeze({ slot: 'trade', since: 2, clears: ['rejoinClear'], resend: '_t2Resend' }),
  /* v2.3.4415: your own held pose (S._pose; sweep V17b R10-8), against ANY
     worker: every join makes the player's state afresh (join.js), so no
     worker keeps a pose across a reconnect or a deploy */
  Object.freeze({ slot: 'pose', since: 0, clears: ['rejoinClear'], resend: null, why: 'every join makes ps afresh with no po (join.js; poses.js: "a deploy stands everyone up"), so the phone stands up too' }),
]);

/* phone copies of a worker session that still outlive a reconnect, each its
   own change (left for later).  v2.3.4628: the duel challenge card left the list:
   it has the worker's own clock now (duelPending.js DUEL_CARD), so a card
   carried over a reconnect closes when its challenge runs out on the worker */
export const REJOIN_NOT_YET = Object.freeze([]);

/* the count the worker said (0 for an old worker or the kill switch) */
export function rejoinCount(caps) {
  const n = caps && Number(caps.rejoinResend);
  return n > 0 && isFinite(n) ? Math.floor(n) : 0;
}

/* state_sync: clear the duel and the trade window, as far as the worker says
   it re-sends them.  Returns the slots it cleared (for tests). */
export function rejoinClear(S, count, setTrade2, clearIv) {
  const done = [];
  if (!S) return done;
  /* v2.3.4415: the held pose, whatever the count: the worker that answered
     this join holds none, so a phone still drawing you seated (and the
     moves' sounds and the townsfolk's reactions reading S._pose) stood
     alone until you moved.  Cleared, not said again (poses.js: "a deploy
     stands everyone up"); no word to the worker, which already holds none. */
  if (S._pose) { done.push('pose'); S._pose = null; }
  const n = rejoinCount({ rejoinResend: count });
  if (n >= 1) {
    if (S._inDuel || S._activeDuel) done.push('duel');
    S._inDuel = null;
    S._activeDuel = null;
    /* a lock on a player is only ever a duel lock (duelLock.js, duel_end) */
    if (S.lockedTarget && S.lockedTarget.type === 'player') S.lockedTarget = null;
  }
  if (n >= 2) {
    if (S._t2Live) done.push('trade');
    /* the window too: the worker re-sends a trade still open.  A leave
       already asked for keeps its timer (tradeSlot.js t2Leave). */
    S._t2Live = null;
    t2OnStateSync(S, setTrade2, clearIv);
  }
  /* v2.3.5203 (grand plan step 5.3, card L): this is the rejoin edge's ONE
     door (wsClient.js calls it once, at every state_sync), so the state a
     system registered for the rejoin (game/resetOn.js resetOn('rejoin', ...))
     goes back here.  TRAPS §278 holds for each: a rejoin reset is only for a
     field the worker says again AFTER this (the join's train) or forgets
     too -- never one state_sync set above this call, which it would wipe
     (docs/specs/state-resets.md). */
  runResets('rejoin', S, { count: n });
  return done;
}

/* the worker's `duel_resume` (rejoinresend.js): this duel is still on.  The
   phone enters it as the challenger's duel_accept does (gameEvents.js), with
   no "DUEL STARTED!" -- it started before. */
export function duelResume(S, payload, now) {
  if (!S || !payload || payload.foe == null) return false;
  const t = now === undefined ? Date.now() : now;
  S._activeDuel = { partnerId: payload.foe, startTs: t };
  S._inDuel = {
    opponent: payload.foe,
    opponentName: payload.foeName || '',
    wager: payload.wager || 0,
    startTime: t,
  };
  lockOntoDuelOpponent(S, payload.foe);
  return true;
}
