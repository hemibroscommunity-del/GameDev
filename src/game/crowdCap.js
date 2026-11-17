/* ═══ v2.3.3241: THE CROWD CAP -- AT MOST K OTHER PLAYERS DRAWN IN FULL ═══
 *
 * The owner, on the server split plan (docs/SERVER-SPLIT-PLAN.md, Phase 0a):
 * "Go recommended" -- the nearest 50 other players drawn in full, and always
 * your party, your target, whoever is fighting you and your duel; the rest not
 * drawn (they stay on the minimap); `?crowd=K` to try another number.
 *
 * WHY.  A phone's frame grows with every other player it draws: each is 43
 * display objects posed, dressed and handed to Pixi every frame
 * (mp-crowdbots: the QA box's frame 5.4 ms alone, 14.7 with 50 players on
 * screen, 35 with 146).  BroTown's square is where everyone arrives, after a
 * login and after a death, so a full room's crowd stands there.  Far off
 * screen they are not drawn at all (PEER_FAR_MARGIN, entityRenderer); this is
 * for the crowd ON the screen.
 *
 * No imports: the renderer calls it every frame and server/test/crowd-cap
 * runs it in node.  (v2.3.5226: but the lanes' table, itself a leaf.)
 *
 * v2.3.5226 (card O PR 6): THE CAP IS A KNOB OF THE LADDER.  crowdK() is the
 * cap now: `?crowd=K` where the address names one (its meaning kept until
 * card O's PR 12 makes it an override), else the lane's `crowd` at the
 * governor's rung, read through the lanes' one reader, laneKnob('crowd'):
 * the owner's 50 in `full`'s row, then 30, then 15 -- the work axis's first
 * two rungs, before the rate (docs/LANES.md).  `?laddercrowd=0`: the owner's
 * 50 whatever the rung.  Always drawn, at every rung: your party, your
 * target, whoever fights you, your duel (crowdPick's own rule).
 */
import { laneKnob, ladderCrowdOn, seeKnob } from './drawLanes.js';
import { readerFor, swValue } from './switches.js';   /* v2.3.5232 (card O PR 12): `?crowd` through the page's one reader */   /* v2.3.5226: the crowd's knob (card O) */

/* the owner's number */
export const CROWD_K = 50;

/* A player drawn last frame keeps their place until CROWD_HOLD more players
   are nearer than the nearest K, so the edge of the crowd does not flicker as
   people walk across it: at most K + CROWD_HOLD are drawn. */
export const CROWD_HOLD = 8;

/** `?crowd=K` from an address's search string: K (1-500) a cap of K,
 *  `?crowd=0` or `?crowd=all` no cap (Infinity); null when not given. */
export function crowdFromSearch(search) {
  /* v2.3.5232: the value through the page's one reader (an address handed
     in, by its own); decoded there */
  const raw = typeof search === 'string' ? readerFor(search).swValue('crowd') : swValue('crowd');
  if (raw === null) return null;
  const v = String(raw).trim().toLowerCase();
  if (v === 'all' || v === '0' || v === 'off') return Infinity;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(500, n) : null;
}

/* v2.3.5226: the address's word, read once (undefined: not read yet) */
let _urlK;
/** v2.3.5226: the cap now -- `?crowd=K`, else the lane's crowd at the
 *  ladder's rung (`?laddercrowd=0`: the owner's 50).  The renderer asks it
 *  every frame: a read of the lanes' table, no allocation.  `search` (the
 *  tests') in place of the page's address. */
export function crowdK(search) {
  if (search !== undefined) {
    const q = crowdFromSearch(search);
    return q != null ? q : ladderCrowdOn(search) ? _knob() : CROWD_K;
  }
  if (_urlK === undefined) {
    const q = crowdFromSearch();
    _urlK = q != null ? q : ladderCrowdOn() ? null : CROWD_K;   /* null: the knob's, each ask */
  }
  return _urlK != null ? _urlK : _knob();
}
function _knob() {
  try { const v = Number(laneKnob('crowd')); return v > 0 ? v : CROWD_K; } catch (e) { return CROWD_K; }
}
/** For the tests only: forget the address. */
export function _resetCrowdK() { _urlK = undefined; }

/* ═══ v2.3.5226 (the gatekeeper's sitting 15 on #1836): A CROWD STEP THAT HIDES NO ONE IS PASSED ═══
   The renderer counts the other players near each frame (noteCrowdNear);
   the screen sees a cap as the players drawn: the cap, or the players near
   if fewer.  The governor compares what the screen sees (drawLanes.js
   knobSeen), so with 30 or fewer near the 30-step changes nothing and is
   passed, and with 15 or fewer the 15-step too: a hot spell goes straight
   to the rate, as before the crowd was a knob.  An address that pins the
   cap (`?crowd=K`, `?crowd=all`) makes every crowd step change nothing.
   Until the renderer has counted (no frame yet), every step may matter. */
let _near = Infinity;
/** The renderer's count of the other players near this frame (0 where the
 *  crowd is not capped at all: `?nopeercull`). */
export function noteCrowdNear(n) { _near = n >= 0 ? n : Infinity; }
/** What the screen sees of a crowd cap `v`: the players drawn by it. */
export function crowdSeen(v) {
  if (_urlK === undefined) crowdK();
  if (_urlK != null) return _urlK;   /* the address pins it: no step changes it */
  const k = Number(v) > 0 ? Number(v) : CROWD_K;
  return Math.min(k, _near);
}
seeKnob('crowd', crowdSeen);

/**
 * Which players to draw in full.
 *
 * @param {Array<{id: string, d2: number, prio: boolean}>} cands
 *        the other players near enough to be drawn: id, squared distance from
 *        you, and whether they are always drawn (party, target, fighting you,
 *        your duel)
 * @param {number} k            how many at most (Infinity: everyone)
 * @param {Set<string>|null} shownBefore  who was drawn last frame
 * @param {Set<string>} [out]   v2.3.4883: a Set to clear and fill instead of
 *        a new one every frame.  It must NOT be `shownBefore` (the caller
 *        keeps two and swaps them); the returned Set is `out` itself.
 * @returns {Set<string>|null}  the ids to draw, or null for everyone
 */
const _rest = [];   /* v2.3.4883: the sort's scratch list, reused each frame */
const _byNear = (a, b) => (a.d2 - b.d2) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
export function crowdPick(cands, k, shownBefore, out) {
  if (!(k > 0) || !Number.isFinite(k) || cands.length <= k) return null;
  const keep = out && out !== shownBefore ? out : new Set();
  keep.clear();
  const rest = _rest;
  rest.length = 0;
  try {
    for (let i = 0; i < cands.length; i++) {
      const c = cands[i];
      if (c.prio) keep.add(c.id); else rest.push(c);
    }
    const room = k - keep.size;
    if (room <= 0) return keep;
    if (rest.length <= room) { for (let i = 0; i < rest.length; i++) keep.add(rest[i].id); return keep; }
    /* nearest first; equal distances in id order, so the pick does not depend
       on the order the players happen to be listed in */
    rest.sort(_byNear);
    const held = Math.min(rest.length, room + CROWD_HOLD);
    for (let i = 0; i < held; i++) {
      const c = rest[i];
      if (i < room || (shownBefore && shownBefore.has(c.id))) keep.add(c.id);
    }
    return keep;
  } finally {
    rest.length = 0;   /* hold no player records between frames */
  }
}
