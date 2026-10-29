/* ═══ v2.3.3806: THE PET'S FETCH (docs/specs/pet-fetch.md) ═══
   The owner: "Also make pets run towards loot drops and pick them up for you".

   When a monster pile you may claim lies within PET_FETCH.RADIUS of you, your
   own pet leaves its place at your heels and RUNS to it, at SPEED_K times your
   run, and back.  It asks for nothing itself: the loot vacuum in BroTown.jsx
   (PET_LOOT_RADIUS, v2.3.1200) sends the one `loot_pickup` {viaPet: true}
   when the pet comes near the pile, as it always has, and the worker now
   reaches that far for such a pile (server/src/pets.js PETS.FETCH_RANGE, only
   against a worker that says caps.petfetch).

   It gives up -- and the pile is left alone for SKIP_MS -- when the pile goes,
   you walk LEASH from it, it runs for GIVE_UP_MS, or it is boxed in.  It never
   sets off across water (its straight line to the pile), and it goes round a
   bush, a rock or a wall on the way (a few turns either side; a building it
   cannot get round runs out its GIVE_UP_MS).  Leaving the zone drops the
   fetch at once.

   No imports, so node can test it (server/test/petfetch.test.mjs). */

export const PET_FETCH = {
  /* how far from YOU a pile may lie: a little under half the phone's
     sideways screen (~900 game px wide), so the pet runs only to piles you
     can see, and well past the vacuum's 80 px at your heels */
  RADIUS: 450,
  /* you walking this far from the pile ends the run.  The worker's reach
     (PETS.FETCH_RANGE, 600) is this plus ~50 px of its lag behind your walk */
  LEASH: 550,
  SPEED_K: 1.5,      /* the owner's ~1.5x your run */
  ARRIVE: 14,        /* px: at the pile */
  /* a wall this close to the pile (a pile dropped against a rock or a
     fence): the pet stops there and the vacuum (PET_LOOT_RADIUS 80) asks */
  REACH: 70,
  HOME: 60,          /* px: back at your heels, the follow takes over */
  GIVE_UP_MS: 4000,  /* the longest run to one pile */
  BACK_MS: 4000,     /* the longest run back (then the follow's catch-up) */
  SKIP_MS: 8000,     /* a pile given up on is left alone this long */
  LINE_MS: 1000,     /* ...and one behind water or a wall, this long (you may step round) */
  LOOK_MS: 200,      /* how often an idle pet looks for a pile */
  SAMPLE: 32,        /* px between the points read along its line */
};

/* a pile your pet may fetch: the worker's, a monster's (never a death drop or
   a dropped item, which keep the vacuum's 240), yours to claim, not already
   taken, and not one you put down yourself */
export function petFetchOk(p, me) {
  if (!p || !p._serverLoot || !p.lootId) return false;
  if (p.isDeathDrop || p.dropped) return false;
  if (p._collected || p._expired) return false;
  if (!Array.isArray(p.recipients) || p.recipients.indexOf(me) < 0) return false;
  return true;
}

/* the nearest such pile within RADIUS of (px, py), or null; `skipped(id)`
   says a pile was given up on */
export function petFetchPick(piles, px, py, me, skipped) {
  if (!piles || !piles.length) return null;
  let best = null, bestD = PET_FETCH.RADIUS * PET_FETCH.RADIUS;
  for (let i = 0; i < piles.length; i++) {
    const p = piles[i];
    if (!petFetchOk(p, me)) continue;
    if (skipped && skipped(p.lootId)) continue;
    const dx = p.x - px, dy = p.y - py, d = dx * dx + dy * dy;
    if (d <= bestD) { best = p; bestD = d; }
  }
  return best;
}

/* true when every SAMPLE px along the line is open (`blockedAt(x, y)` true for
   water or a wall; null means "no ground to read": open) */
export function petLineClear(x0, y0, x1, y1, blockedAt) {
  if (!blockedAt) return true;
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / PET_FETCH.SAMPLE));
  for (let i = 1; i <= n; i++) {
    if (blockedAt(x0 + dx * i / n, y0 + dy * i / n)) return false;
  }
  return true;
}

/* the turns a running pet tries, in radians: straight, then ever wider round
   to the side it last went, then the other */
const TURNS = [0, 0.6, 1.1, 1.6];
function turnsFrom(side) {
  const out = [0];
  for (let i = 1; i < TURNS.length; i++) out.push(TURNS[i] * side, -TURNS[i] * side);
  return out;
}

const skipIt = (F, id, now, ms) => { if (id) F.skip.set(id, now + (ms || PET_FETCH.SKIP_MS)); };

/* One frame of the fetch.  F is the fetch's own state (S._petFetch; made by
   petFetchState), c: { now, zone, me, piles, px, py (you), petX, petY,
   stepPx (the pet's step this frame), pace (its step in px a 60 Hz frame,
   for QA), blockedAt (water, a wall, an object), waterAt (water alone) }.
   Returns the pet's place
   {x, y} while it runs, or null when the follow has it. */
export function petFetchStep(F, c) {
  const P = PET_FETCH;
  if (F.zone !== c.zone) { F.zone = c.zone; F.phase = null; F.lootId = null; F.skip.clear(); }
  for (const [id, until] of F.skip) if (c.now > until) F.skip.delete(id);
  if (!F.phase) {
    if (c.now < F.lookAt) return null;
    F.lookAt = c.now + P.LOOK_MS;
    const pile = petFetchPick(c.piles, c.px, c.py, c.me, (id) => F.skip.has(id));
    if (!pile) return null;
    /* never across water (the sea, a river): its line to REACH short of the
       pile (a pile at the water's edge is asked for from there, as the
       vacuum always could).  A bush, a rock or a wall on the way it goes
       round as it runs (below). */
    const ld = Math.hypot(pile.x - c.petX, pile.y - c.petY), lk = ld > P.REACH ? (ld - P.REACH) / ld : 0;
    if (!petLineClear(c.petX, c.petY, c.petX + (pile.x - c.petX) * lk, c.petY + (pile.y - c.petY) * lk, c.waterAt)) {
      skipIt(F, pile.lootId, c.now, P.LINE_MS); F.why = 'water'; return null;
    }
    F.phase = 'go'; F.lootId = pile.lootId; F.t0 = c.now; F.atPile = false; F.closest = Infinity; F.goSteps = 0; F.side = 1; F.runs = (F.runs || 0) + 1;
  }
  let x = c.petX, y = c.petY;
  if (F.phase === 'go') {
    let pile = null;
    for (let i = 0; c.piles && i < c.piles.length; i++) if (c.piles[i].lootId === F.lootId) { pile = c.piles[i]; break; }
    const gone = !pile || pile._expired;
    const far = pile && Math.hypot(pile.x - c.px, pile.y - c.py) > P.LEASH;
    if (gone || far || c.now - F.t0 > P.GIVE_UP_MS) {
      if (!gone) skipIt(F, F.lootId, c.now);
      F.why = gone ? 'gone' : far ? 'leash' : 'time';
      F.phase = 'back'; F.t0 = c.now;
    } else {
      const dx = pile.x - x, dy = pile.y - y, d = Math.hypot(dx, dy);
      if (!(F.closest <= d)) F.closest = d;
      if (F.atPile || d <= Math.max(P.ARRIVE, c.stepPx)) {
        if (!F.atPile) { x = pile.x; y = pile.y; }
        F.atPile = true;
        /* at the pile; it waits there until the vacuum has asked for it (a
           pile younger than the vacuum's half second is not asked for yet) */
        if (pile._petPickupPending || pile._collected) {
          skipIt(F, F.lootId, c.now);   /* fetched: never run to it twice */
          F.got = (F.got || 0) + 1;
          F.phase = 'back'; F.t0 = c.now;
        }
      } else {
        /* straight at it, or round what is in the way: the first open one of
           a few turns, the side it last went round first (no dithering) */
        let moved = false;
        for (const a of turnsFrom(F.side || 1)) {
          const ca = Math.cos(a), sa = Math.sin(a);
          const ux = (dx * ca - dy * sa) / d, uy = (dx * sa + dy * ca) / d;
          const nx = x + ux * c.stepPx, ny = y + uy * c.stepPx;
          if (c.blockedAt && c.blockedAt(nx, ny)) {
            /* by the pile and the way in shut: close enough, never circle it */
            if (a === 0 && d <= P.REACH) break;
            continue;
          }
          if (a !== 0) F.side = a > 0 ? 1 : -1;
          x = nx; y = ny; moved = true;
          F.goSteps = (F.goSteps || 0) + 1; F.pace = c.pace || 0;
          break;
        }
        if (!moved) {
          if (d <= P.REACH) { F.atPile = true; F.why = 'near'; }   /* close enough: wait here for the ask */
          else { skipIt(F, F.lootId, c.now); F.why = 'wall'; F.phase = 'back'; F.t0 = c.now; }
        }
      }
      if (F.phase === 'go') return { x, y };
    }
  }
  /* back: straight home at the same pace (the follow never minds walls) */
  const dx = c.px - x, dy = c.py - y, d = Math.hypot(dx, dy);
  if (d <= P.HOME || c.now - F.t0 > P.BACK_MS) { F.phase = null; F.lootId = null; return null; }
  const s = Math.min(c.stepPx, d - P.HOME + 1);
  return { x: x + dx / d * s, y: y + dy / d * s };
}

/* the vacuum (BroTown.jsx) holds its ask for the pile the pet runs to until
   the pet is there, so the pet touches what it fetches */
export function petFetchHolds(F, lootId) {
  return !!(F && F.phase === 'go' && F.lootId === lootId && !F.atPile);
}

export function petFetchState() {
  /* why: the last reason a run ended early, or a pile was passed over (QA) */
  return { phase: null, lootId: null, zone: null, t0: 0, lookAt: 0, skip: new Map(), runs: 0, got: 0, why: null, atPile: false };
}
