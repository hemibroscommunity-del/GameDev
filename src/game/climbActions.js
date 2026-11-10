/* ═══ v2.3.3994: CLIMBING AND JUMPING UP A FACE — the part that touches the game ═══
 *
 * game/climb.js has the rules (pure, node-tested); this is the part that
 * reads the rises the ground worker sent (wheelTrial.js wheelRises, only with
 * `?climb=1`) and moves the player through them.  BroTown's loop calls, each
 * frame in the Wheel:
 *
 *   riseSolidAt   from isSolid, before the walk grid: a face, rim, vine or
 *                 chest cell is a wall -- but the vines of the strip you are
 *                 climbing are open, and so is a face a jump has entered
 *                 (climb.js faceEntry: north, high enough; or south off its
 *                 top), for the rest of that jump and its flip;
 *   climbBegin    before the walk: at a strip's foot pushing north, or its top
 *                 pushing south, the climb starts (your feet put on the
 *                 strip's middle);
 *   climbSteer    the climb's step: straight up or down, or nothing while a
 *                 drop carries you;
 *   climbSpeed    its pace: CLIMB_MULT of the walk (a sprint does not hurry
 *                 it), nothing while dropping;
 *   climbTick     after the walk: the climb ends at the top or the foot; a jump
 *                 that crossed into a face is judged where it came down
 *                 (climb.js faceLanding) and a miss drops you back where you
 *                 jumped from; feet found inside a face otherwise (a login
 *                 there) are put at its foot; and the chest.
 *
 * The worker hears a walk (climb.js).  Other players see you move up the
 * face; their screens draw you climbing by the same test at your feet
 * (riseClimbingAt), so nothing new goes over the wire.
 */
import { wheelRises } from '@/game/wheelTrial.js';
import { jumpActive } from '@/game/jump.js';
import { cue } from '@/game/eventSounds.js';
import {
  CLIMB_MULT, CLIMB_NOTE, CHEST_NOTE, CHEST_WORDS, chestPrizeNote, FEET_HS,
  riseCellAt, riseShuts, feetInBand, faceEntry, faceLanding, footOf, climbStartAt, climbWay, climbOut, CLIMB_REACH,
  startDrop, dropAt, atChest,
} from '@/game/climb.js';

/* what QA reads (__btClimb) */
export const climbStats = {
  climbs: 0, tops: 0, foots: 0,       /* climbs begun, ended at the top, at the foot */
  entries: [],                        /* faces entered by a jump: { id, dir } (last 8) */
  landings: [],                       /* how each such jump came down: { id, dir, flip, fate } (last 8) */
  drops: 0, rescues: 0,               /* drops back, and feet found in a face put at its foot */
  chestOpens: 0, chestAt: 0,
  refused: 0,
};
const keep8 = (arr, v) => { arr.push(v); if (arr.length > 8) arr.shift(); };

/** On the vines now? */
export function isClimbing(S) { return !!(S && S._climb); }

/**
 * isSolid's question for the Wheel's feet grid at (x, fy) -- feet px: true
 * (a wall), false (open), or null when no rise is there (ask the grid).
 * `gdy` is the feet's offset below the body's centre (playerGroundDy).
 */
export function riseSolidAt(S, x, fy, gdy) {
  const R = wheelRises();
  if (!R) return null;
  const c = riseCellAt(R, x, fy);
  if (!c || !riseShuts(c.kind)) return null;
  if (S._climbDrop) return false;
  /* the strip you are climbing */
  if (S._climb) return !(c.kind === 'climb' && c.r.k === S._climb.k);
  const P = S.player;
  if (!P) return true;
  const now = Date.now();
  /* a face (its vines included) in the air: entered once, open for the rest
     of the jump and its flip */
  if ((c.kind === 'face' || c.kind === 'climb') && S._jump && jumpActive(S._jump, now)) {
    const X = S._riseCross;
    if (X && X.k === c.r.k) return false;
    const dir = faceEntry(c.r, S._jump, now, P.x, P.y + (gdy || 0), P.vx || 0, P.vy || 0, FEET_HS);
    if (dir) {
      S._riseCross = { k: c.r.k, id: c.r.id, dir, flip: !!S._jump.flip, at: now,
        x0: Number.isFinite(S._jump.x0) ? S._jump.x0 : P.x, y0: Number.isFinite(S._jump.y0) ? S._jump.y0 : P.y };
      keep8(climbStats.entries, { id: c.r.id, dir });
      return false;
    }
    return true;
  }
  /* never trap someone already standing in a rim or the chest (isSolid's own
     rule, v2.3.2075): they walk out */
  if (c.kind === 'rim' || c.kind === 'chest') {
    const here = riseCellAt(R, P.x, P.y + (gdy || 0));
    if (here && (here.kind === 'rim' || here.kind === 'chest')) return false;
  }
  return true;
}

/** Before the walk: start a climb if the feet are at a strip's foot and the
    stick pushes north.  True while climbing. */
export function climbBegin(S, dx, dy, gdy) {
  if (S._climb) return true;
  const R = wheelRises();
  if (!R || !S.player || S._climbDrop) return false;
  if ((S._jump && jumpActive(S._jump, Date.now())) || (S._wheelSwim && S._wheelSwim.on) || S._dodgeRoll || S._sled) return false;
  const P = S.player;
  const r = climbStartAt(R, P.x, P.y + (gdy || 0), dx, dy, FEET_HS);
  if (!r) return false;
  /* on the strip's middle: the feet box well inside its vines */
  P.x = (r.climb.x0 + r.climb.x1) / 2;
  /* `fresh`: not judged out on its first frame (it begins with the feet
     just off the strip, the step that frame takes them onto it) */
  S._climb = { k: r.k, id: r.id, t0: Date.now(), dist: 0, lastY: P.y, way: dy < 0 ? -1 : 1, fresh: true };
  S.autoAttack = false;
  S._atkPending = false;
  S.isSwinging = false;
  S._aiming = false;
  climbStats.climbs++;
  return true;
}

/** The step while climbing (straight up or down) or dropping (none). */
export function climbSteer(S, dx, dy) {
  S._pushY = dy;   /* v2.3.4139: the way you push, for the chest's walk-in (a blocked computer walk has no vy) */
  if (S._climbDrop) return [0, 0];
  if (!S._climb) return [dx, dy];
  const w = climbWay(dy);
  S._climb.way = w || S._climb.way;
  S._climb.push = w;   /* v2.3.4139: this frame's push (climbTick's foot) */
  return [0, w];
}

/** The walk's pace on the vines (CLIMB_MULT of the walk, whatever a sprint
    says: `sprintK` is the sprint's multiplier, taken back out), nothing
    while a drop carries you; 1 otherwise. */
export function climbSpeed(S, sprintK) {
  if (S._climbDrop) return 0;
  if (!S._climb) return 1;
  return CLIMB_MULT / (sprintK > 0 ? sprintK : 1);
}

/** A refusal for what needs your hands (the swing, the shield, a roll...):
    true while climbing, having said so (combatHelpers.swimRefused asks). */
export function climbRefused(S, say) {
  if (!S || !(S._climb || S._climbDrop)) return false;
  climbStats.refused++;
  if (say) say(CLIMB_NOTE);
  return true;
}

/** After the walk: the climb's end, a face-crossing jump's landing, a drop's
    progress, feet stuck in a face, the chest.  `gdy` playerGroundDy. */
let _lastS = null;   /* the game's state, for the QA probe */
export function climbTick(S, now, gdy, popup) {
  _lastS = S;
  const R = wheelRises();
  const P = S && S.player;
  if (!P) return;
  if (!R) { S._climb = null; S._climbDrop = null; S._riseCross = null; S._nearChest = null; return; }
  const fx = P.x, fy = P.y + (gdy || 0);
  /* a drop under way: it carries you (BroTown's walk stood still) */
  if (S._climbDrop) {
    const d = dropAt(S._climbDrop, now);
    P.x = d.x; P.y = d.y;
    if (d.done) {
      S._climbDrop = null;
      try { cue('jumpLand', 0.8); } catch (e) { /* sound only */ }
    }
    return;
  }
  /* a jump that entered a face: carried on through its flip, judged on the
     ground */
  const X = S._riseCross;
  if (X) {
    if (S._jump && jumpActive(S._jump, now)) {
      if (S._jump.flip) X.flip = true;
    } else {
      S._riseCross = null;
      const r = R.list[X.k];
      const fate = r ? faceLanding(r, X.dir, X.flip, fx, fy, FEET_HS) : 'clear';
      keep8(climbStats.landings, { id: X.id, dir: X.dir, flip: X.flip, fate });
      if (fate === 'back') {
        S._climbDrop = startDrop(P.x, P.y, X.x0, X.y0, now, 'back');
        climbStats.drops++;
        return;
      }
      if (fate === 'foot') {
        const f = footOf(r, fx, FEET_HS);
        S._climbDrop = startDrop(P.x, P.y, f.x, f.y - (gdy || 0), now, 'foot');
        climbStats.drops++;
        return;
      }
    }
  }
  /* on the vines: out at the top or the foot, else count the climb */
  if (S._climb) {
    const r = R.list[S._climb.k];
    let out = S._climb.fresh ? null : r ? climbOut(r, fy, FEET_HS) : 'foot';
    /* v2.3.4139: a climb begins with the feet up to CLIMB_REACH short of the
       vines, and at 0.4 of the walk they take several frames to reach them:
       judged 'foot' on its second frame it ended at once wherever the walk
       had stopped the feet a step short (on a computer, the owner's
       "I don't see the lagoon" pictures).  Pushing up within that reach it
       goes on; let go or push down there and it ends at the foot. */
    if (out === 'foot' && r && S._climb.push === -1 && fy - FEET_HS < r.face.y1 + CLIMB_REACH) out = null;
    S._climb.fresh = false;
    if (out) {
      S._climb = null;
      if (out === 'top') climbStats.tops++; else climbStats.foots++;
    } else {
      S._climb.dist += Math.abs(P.y - S._climb.lastY);
      S._climb.lastY = P.y;
    }
  } else if (!(S._jump && jumpActive(S._jump, now))) {
    /* feet in a face with no climb, jump or drop to explain it (a login
       there, a teleport): put at its foot */
    for (const r of R.list) {
      if (feetInBand(r, fx, fy, FEET_HS - 1)) {
        const f = footOf(r, fx, FEET_HS);
        S._climbDrop = startDrop(P.x, P.y, f.x, f.y - (gdy || 0), now, 'rescue');
        climbStats.rescues++;
        return;
      }
    }
  }
  /* the chest: at its front, on its top */
  S._nearChest = null;
  for (const r of R.list) {
    if (r.chest && atChest(r, fx, fy, FEET_HS)) { S._nearChest = r; break; }
  }
  /* ...and walking into it opens it, as a tap or E does (desktopControls) */
  if (S._nearChest && (S.player.vy < 0 || (S.stickY || 0) < -0.5 || (S._pushY || 0) < -0.3) && fy - FEET_HS <= S._nearChest.chest.y1 + CLIMB_REACH) openRiseChest(S, popup);
  /* v2.3.4139: ...within a step of its front (CLIMB_REACH, was 3 px): a computer's walk stops the feet
     6 px further off a wall than a phone's, and the chest never opened walking into it there */
}

/** Open the chest you stand at.  v2.3.4438: the worker pays its prize, once
    a character, to feet at it (server/src/risechest.js): the ask goes
    (`rise_chest_open`), and its answer says the prize or why not
    (onRiseChest).  Against a worker that does not say `risechest` (an older
    one, or the switch thrown) the chest is empty, as it was.  True when
    there was one to open. */
export function openRiseChest(S, popup) {
  const r = S && S._nearChest;
  if (!r) return false;
  const now = Date.now();
  if (now - climbStats.chestAt < 2500) return true;
  climbStats.chestAt = now;
  climbStats.chestOpens++;
  const c = r.chest;
  const say = (words) => { if (popup) popup((c.x0 + c.x1) / 2, c.y0 - 40, words); };
  const pays = !!(S._serverCaps && S._serverCaps.risechest === true);
  if (!pays) { say(CHEST_NOTE); try { cue('discovery', 0.6); } catch (e) { /* sound only */ } return true; }
  if (S._riseChestGot && S._riseChestGot[r.id]) { say(CHEST_WORDS.got); return true; }
  S._riseChestAsk = { id: r.id, x: (c.x0 + c.x1) / 2, y: c.y0 - 40, at: now };
  climbStats.chestAsks = (climbStats.chestAsks || 0) + 1;
  try { S.channel.send({ type: 'rise_chest_open', payload: { id: r.id } }); } catch (e) { say(CHEST_NOTE); }
  return true;
}

/** The worker's answer to an opened chest (wsClient's direct switch):
    `{id, ok: true, coins}` or `{id, ok: false, why}`.  Said over the chest
    (where the ask was made), and a chest this character has had is
    remembered so the next tap does not ask again.  The coins themselves
    arrive by the game's own delivery (the worker's credit): this is the word. */
export function onRiseChest(S, p, popup) {
  if (!S || !p || typeof p !== 'object') return;
  const ask = S._riseChestAsk;
  S._riseChestAsk = null;
  const id = typeof p.id === 'string' ? p.id : (ask && ask.id) || '';
  if (p.ok || p.why === 'got') {
    if (!S._riseChestGot) S._riseChestGot = Object.create(null);
    if (id) S._riseChestGot[id] = 1;
  }
  climbStats.chestAnswer = p.ok ? 'ok' : String(p.why || 'no');
  climbStats.chestCoins = p.ok ? Math.floor(Number(p.coins) || 0) : 0;
  const words = p.ok ? chestPrizeNote(p.coins) : (CHEST_WORDS[p.why] || CHEST_NOTE);
  climbStats.chestSaid = words;   /* QA: the words over the chest (a popup is gone in a second) */
  let x = ask ? ask.x : null, y = ask ? ask.y : null;
  if (x == null && S.player) { x = S.player.x; y = S.player.y - 40; }
  try { if (popup && x != null) popup(x, y, words, p.ok ? '#FFE23A' : undefined); } catch (e) { /* display only */ }
  if (p.ok) { try { cue('discovery', 0.9); } catch (e) { /* sound only */ } }
}

/** Is a figure whose feet are at (x, fy) on a strip of vines?  Another
    player's screen draws them climbing by this (entityRenderer). */
export function riseClimbingAt(x, fy) {
  const R = wheelRises();
  if (!R) return false;
  const c = riseCellAt(R, x, fy);
  return !!(c && c.kind === 'climb');
}

/* QA: the rises the game holds, and what the climb has done */
if (typeof window !== 'undefined') {
  window.__btClimb = () => {
    const R = wheelRises();
    const S = _lastS;
    return {
      on: !!R,
      rises: R ? R.list.map((r) => ({ id: r.id, h: r.h, box: r.box, face: r.face, climb: r.climb, chest: r.chest })) : [],
      stats: { ...climbStats, entries: climbStats.entries.slice(), landings: climbStats.landings.slice() },
      /* what the player is doing now */
      climbing: !!(S && S._climb), climb: S && S._climb ? { id: S._climb.id, dist: S._climb.dist, way: S._climb.way } : null,
      frame: S ? (S._climbFrame != null ? S._climbFrame : null) : null,
      dropping: !!(S && S._climbDrop), drop: S && S._climbDrop ? { why: S._climbDrop.why } : null,
      cross: S && S._riseCross ? { id: S._riseCross.id, dir: S._riseCross.dir, flip: S._riseCross.flip } : null,
      nearChest: !!(S && S._nearChest),
    };
  };
}
