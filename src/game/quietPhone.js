/* ═══ v2.3.3254: THE QUIET PHONE -- send less, and nothing anyone would see ═══
 *
 * Owner, 2026-10-14: "I want you to cut as much as you possibly can IF the
 * loss in quality is negligible or unnoticeable."
 *
 * Every message a phone sends to the worker may count against the account's
 * 100,000 Durable Object requests a day on Cloudflare's free plan (whether the
 * daily limit counts each socket message, or 20 to a request as the bill does,
 * is the lab's limit test: docs/specs/cloudflare-lab.md).  What a phone sent
 * and what it sends now (docs/specs/quiet-phone.md has the measured numbers):
 *
 *   1. ONE FRAME A MOMENT (caps.bundle; server/src/bundle.js).  Everything a
 *      phone has to send at one moment -- the move, the swing beside it, the
 *      damage it claims -- went as a frame each.  Now as one: a JSON array the
 *      worker takes message by message, as if each had come alone.  Nothing is
 *      sent later than before (wsClient.js wsOut: the frame goes at the end of
 *      the same turn of the page's loop).
 *   2. RIDERS.  What is not urgent rides on the next frame that goes anyway,
 *      and only goes alone when nothing has by its deadline:
 *        - the answer to the worker's ping (every ~3 s): within PONG_RIDE_MS,
 *          saying how long it waited (`hd`) so the round trip is still exact;
 *          a phone with nothing else to send answers one ping in PONG_EVERY
 *          (the round trip matters for hits between players, which are never
 *          sent by a phone with nothing to send);
 *        - the look (`track`, built every 2 s): what is NEWS to the others (a
 *          hat, a shield, a skull -- the worker's own rule, lookrelay.js
 *          LOOK_RELAY, mirrored here as LOOK_NEWS) goes at once; the rest
 *          (where you are, your HP, the inspect card's counters, which the
 *          worker relays to nobody on their own) rides along, or goes alone
 *          every TRACK_QUIET_MS -- well inside the worker's 2-minute away
 *          clock, which an `aw: 0` track resets;
 *        - the open world map's heartbeat (MAP_BEAT_MS) and the tree you chop
 *          (`gather_node`, GATHER_NODE_MS): the same deadlines as before,
 *          riding when they can.
 *   3. STANDING STILL.  A standing phone sent its whole move once a second
 *      (the v2.3.1107 keepalive) and, while gathering, twice (the v2.3.1092
 *      harvest heartbeat).  Both healed a peer who missed something -- which
 *      the worker's own roster has done every second since v2.3.1112, near
 *      players whole (tick.js).  Now: one copy KEEP_CONFIRM_MS after you stop
 *      (it heals a refused last step, as the keepalive did), then one every
 *      KEEP_QUIET_MS; no harvest heartbeat (the start and the stop still go
 *      at once).
 *   4. MOVES WITH NOBODY NEAR.  A phone sends every 33 ms while a peer shares
 *      its zone, every 66 ms alone (v2.3.1635 / v2.3.1767, the owner's call:
 *      "raise the floor everywhere").  The Wheel is one zone, so one other
 *      player anywhere in it meant 33 ms -- for nobody: the worker sends a
 *      player's moves only to phones within NEAR_R (tick.js FAR_PLAYERS).  Now
 *      33 ms only with a peer within NEAR_R (and in an arena match), 66 ms
 *      otherwise: the rate a phone alone in its zone has always sent at,
 *      monsters included.
 *   5. A STEADY WALK, ANYWHERE.  v2.3.3204 held a steady walk's moves to 66 ms
 *      on the safe ground only (moveDiet.js).  Off it the worker's copy of you
 *      is what monsters chase and what other players hit -- but out of a fight
 *      (no lock, no attack held, no duel or match) and with no player near who
 *      may fight you there (No man's land's own rule, nmlCanAttack), it is
 *      used for nothing a 66 ms step is not already used for when you are
 *      alone.
 *
 * `quiet: false` / `bundle: false` in the worker's live flags puts every phone
 * back as it was from its next join.  No imports: node-tested
 * (server/test/quiet-phone.test.mjs).
 */
export const QUIET = Object.freeze({
  /* the worker sends a player's moves to the phones within this (tick.js
     FAR_PLAYERS.NEAR_R; the test pins the two) */
  NEAR_R: 2400,
  /* moves: a peer near, nobody near (wsClient.js MOVE_GAP_SEEN_MS / _SOLO_MS) */
  SEEN_GAP_MS: 33,
  ALONE_GAP_MS: 66,
  /* standing still: a copy this long after the last move, then every ... */
  KEEP_CONFIRM_MS: 1000,
  KEEP_QUIET_MS: 10000,
  /* the look: alone, when nothing is news, at most every ... (the worker
     logs out a player whose last sign of a thumb is 2 minutes old) */
  TRACK_QUIET_MS: 30000,
  /* the ping's answer: rides for this long, else one in PONG_EVERY alone */
  PONG_RIDE_MS: 1000,
  PONG_EVERY: 4,
  /* the open map's heartbeat (presence2.js MAP_HEARTBEAT_MS) and the tree's
     (BroTown.jsx gather_node): never later than they were */
  MAP_BEAT_MS: 4000,
  GATHER_NODE_MS: 2000,
  /* a frame: at most this many messages (server bundle.js BUNDLE.MAX) and
     this many characters (the worker refuses a frame over 16 KB) */
  BUNDLE_MAX: 24,
  BUNDLE_CHARS: 15000,
});

/* The worker's rule for what in a look is news (server/src/lookrelay.js
   LOOK_RELAY; the test pins the two). */
export const LOOK_NEWS = Object.freeze({
  RIDE_ALONG: Object.freeze(['x', 'y', 'dir']),
  LAZY: Object.freeze(['rpgHp', 'rpgMaxHp']),
  LAZY_IN: Object.freeze({ rpgData: Object.freeze(['kills', 'svKills', 'goldEarned', 'playtime']) }),
});
const SKIP = new Set([...LOOK_NEWS.RIDE_ALONG, ...LOOK_NEWS.LAZY]);
const LAZY_IN = new Map(Object.entries(LOOK_NEWS.LAZY_IN).map(([k, v]) => [k, new Set(v)]));

/** Does this worker want the quiet phone?  (caps.quiet; `quiet: false` in
    its live flags turns it off) */
export function quietOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.quiet === true);
}
/** May this phone send several messages in one frame?  (caps.bundle) */
export function bundleOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.bundle === true);
}

/** What in a look (a `track`) is news to the others, as one string: two looks
    with the same string relay nothing new. */
export function lookNews(data) {
  if (!data || typeof data !== 'object') return '';
  let s = '';
  for (const k of Object.keys(data).sort()) {
    if (SKIP.has(k)) continue;
    let v = data[k];
    if (v === undefined) continue;
    const lazy = LAZY_IN.get(k);
    if (lazy && v && typeof v === 'object' && !Array.isArray(v)) {
      const o = {};
      for (const kk of Object.keys(v).sort()) if (!lazy.has(kk)) o[kk] = v[kk];
      v = o;
    }
    let j;
    try { j = JSON.stringify(v); } catch (e) { j = '\u0000' + Math.random(); }
    s += k + '\u0001' + j + '\u0002';
  }
  return s;
}

/** Is a player near you -- in your zone, within `r` -- who passes `pred`
    (any, without one)?  A copy the worker parked out of sight (presence v2,
    `_away`) is far; one whose zone or place is not known yet counts as near,
    so the doubt always costs a few messages, never smoothness. */
export function peerNear(S, r, pred) {
  try {
    const R = r || QUIET.NEAR_R;
    if (!S || !S.others) return true;   /* nothing heard yet: the old rule's doubt */
    const P = S.player, zone = S.currentZone;
    if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y) || !zone) return true;
    for (const id of Object.keys(S.others)) {
      const o = S.others[id];
      if (!o) continue;
      const oz = o.zone || o.z;
      if (oz && oz !== zone) continue;
      if (oz && o._away) continue;
      const ox = Number.isFinite(o.x) ? o.x : o.renderX, oy = Number.isFinite(o.y) ? o.y : o.renderY;
      const near = !oz || !Number.isFinite(ox) || !Number.isFinite(oy)
        || (ox - P.x) * (ox - P.x) + (oy - P.y) * (oy - P.y) <= R * R;
      if (near && (!pred || pred(id, o))) return true;
    }
    return false;
  } catch (e) {
    return true;
  }
}

/** The quiet phone's move gap: 33 ms with a peer near you or in an arena
    match, 66 ms otherwise. */
export function quietMoveGap(S) {
  try {
    if (S && S._arenaMatch) return QUIET.SEEN_GAP_MS;
    return peerNear(S) ? QUIET.SEEN_GAP_MS : QUIET.ALONE_GAP_MS;
  } catch (e) {
    return QUIET.SEEN_GAP_MS;
  }
}

/** Standing still: is the keepalive due?  `sinceMove` is how long since a move
    last went, `confirmed` whether a keepalive has gone since the last real
    move. */
export function keepaliveDue(sinceMove, confirmed) {
  return sinceMove >= (confirmed ? QUIET.KEEP_QUIET_MS : QUIET.KEEP_CONFIRM_MS);
}

/** Split messages into frames: each at most BUNDLE_MAX messages and
    BUNDLE_CHARS characters (a message bigger than that goes alone, as it
    always did).  Returns the strings to send: one message as itself, more as
    a JSON array. */
export function framesOf(msgs) {
  const out = [];
  let cur = [], curChars = 2;
  const flush = () => {
    if (!cur.length) return;
    out.push(cur.length === 1 ? cur[0] : '[' + cur.join(',') + ']');
    cur = []; curChars = 2;
  };
  for (const m of msgs) {
    let j;
    try { j = JSON.stringify(m); } catch (e) { continue; }
    if (typeof j !== 'string') continue;
    if (cur.length && (cur.length >= QUIET.BUNDLE_MAX || curChars + j.length + 1 > QUIET.BUNDLE_CHARS)) flush();
    cur.push(j);
    curChars += j.length + 1;
  }
  flush();
  return out;
}
