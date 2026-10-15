/* ═══ v2.3.3201: A MONSTER LOOKS FOR PLAYERS NEAR IT, NOT THROUGH EVERY ONE ═══
 *
 * Every tick each of the Wheel's 384 monsters looks for the nearest player it
 * may go after (index.js _tickMonsters).  It did that by measuring the
 * distance to EVERY player in the Wheel: at 150 players that is 57,600
 * distances a tick, ~2.6 million a second, and the load test's profile put
 * that one loop at about a quarter of all the room's work
 * (docs/specs/load-test.md).  Almost all of it is wasted: a monster only
 * notices a player within its aggro range (120 px; a snowman 300), and nearly
 * every player is thousands of pixels away from nearly every monster.
 *
 * So, once a tick, the Wheel's players are dropped into square cells
 * (CELL px a side), and a monster looks only in the cells its aggro range
 * reaches -- usually four.
 *
 * THE SAME PICK, EXACTLY.  The full loop chooses the nearest player that is
 * not harvesting and not sheltered by the safe ground, the FIRST in the
 * zone's list on a tie (its `<`).  The grid finds every player within the
 * range (the cells cover the range's square, plus PAD px for rounding), and
 * keeps the one with the smallest (distance, place in the list) -- the same
 * player, by the same arithmetic.  A player beyond the range can never be
 * chased, so the full loop's "nearest" out there only reached code that
 * behaves the same either way: the wander branch, and the leash's clearing
 * of an old sticky-aggro override, which index.js now does up front for any
 * override that has run out (nothing reads one after it runs out).
 * server/test/aggro-grid.test.mjs runs the whole room both ways, tick by
 * tick, and compares every monster and every message.
 *
 * The full loop still answers whenever the grid cannot: a zone other than
 * the Wheel, fewer than MIN_PLAYERS players, a player or monster whose
 * position is not an ordinary number, or a range wider than MAX_CELLS cells
 * (the 1,200 px of a sticky aggro whose target just left).
 *
 * Kill switch: `aggrogrid: false` in the live flags -- the full loop
 * everywhere, at once, no deploy.
 */

export const AGGRO_GRID = Object.freeze({
  /* a cell's side, px.  A 120 px reach (241 px across with PAD) spans at most
     two cells each way -- four looked up */
  CELL: 256,
  /* the most cells one monster may look in; a reach that needs more asks the
     full loop (a snowman's 300 px needs at most 4 x 4) */
  MAX_CELLS: 25,
  /* below this many players in the zone the full loop is as cheap */
  MIN_PLAYERS: 8,
  /* px added to the reach when choosing cells, so rounding in a distance can
     never leave a player in range outside the cells looked in */
  PAD: 1,
});

/* a cell's key: cx * KEY_STRIDE + cy, unique while |cy| < KEY_LIM */
const KEY_STRIDE = 2 ** 21;
const KEY_LIM = 2 ** 20 - 2;

function plainNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

export const aggroGridMethods = {
  /* `aggrogrid: false` in the live flags: the full loop, as before */
  _aggroGridOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'aggrogrid') && !f.aggrogrid);
  },

  /* The cells for one zone's players this tick: Map(key -> indices into
     `players`, ascending), or null when the full loop must answer for the
     whole zone (off, too few players, a position that is not an ordinary
     number).  Harvesters are left out: the full loop skips them too. */
  _aggroGridOf(players) {
    if (!players || players.length < AGGRO_GRID.MIN_PLAYERS || this._aggroGridOff()) return null;
    const C = AGGRO_GRID.CELL;
    const cells = new Map();
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.extracting) continue;
      const x = p.x, y = p.y;
      /* the full loop would subtract whatever this is; only plain numbers are
         put in cells, so anything else sends the zone to the full loop */
      if (!plainNumber(x) || !plainNumber(y)) return null;
      const cx = Math.floor(x / C), cy = Math.floor(y / C);
      if (cx < -KEY_LIM || cx > KEY_LIM || cy < -KEY_LIM || cy > KEY_LIM) return null;
      const key = cx * KEY_STRIDE + cy;
      const b = cells.get(key);
      if (b) b.push(i); else cells.set(key, [i]);
    }
    return cells;
  },

  /* The player monster `m` goes after: the index in `players` of the nearest
     one within `range` that is not sheltered, the first in the list on a tie;
     -1 for none; -2 when the grid cannot answer (ask the full loop). */
  _aggroGridPick(cells, players, m, range, zoneId, wheel, now) {
    const mx = m.x, my = m.y;
    if (!plainNumber(mx) || !plainNumber(my) || !plainNumber(range) || !(range > 0)) return -2;
    const C = AGGRO_GRID.CELL, reach = range + AGGRO_GRID.PAD;
    const cx0 = Math.floor((mx - reach) / C), cx1 = Math.floor((mx + reach) / C);
    const cy0 = Math.floor((my - reach) / C), cy1 = Math.floor((my + reach) / C);
    if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > AGGRO_GRID.MAX_CELLS) return -2;
    if (cx0 < -KEY_LIM || cx1 > KEY_LIM || cy0 < -KEY_LIM || cy1 > KEY_LIM) return -2;
    let best = -1, bestDist = Infinity;
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const b = cells.get(cx * KEY_STRIDE + cy);
        if (b === undefined) continue;
        for (let k = 0; k < b.length; k++) {
          const i = b[k];
          const p = players[i];
          /* the full loop's own arithmetic, so the same distance to the bit */
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (!(dist < range)) continue;
          if (dist < bestDist || (dist === bestDist && i < best)) {
            /* v2.3.2978 / v2.3.3056: the safe ground, unless provoked from it
               (asked only of a player who would be the pick, as the full
               loop does; it has no side effects) */
            if (wheel && this._wheelSheltered(m, p.id, p.x, p.y, now)) continue;
            best = i;
            bestDist = dist;
          }
        }
      }
    }
    return best;
  },
};
