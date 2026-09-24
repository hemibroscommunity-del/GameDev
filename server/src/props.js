/* ═══ v2.3.2652: THE WORKER LEARNS WHERE THE SCENERY IS ═══
 *
 * Owner: "I would like it if these props could block my and enemy attacks."
 *
 * The worker has never had geometry of any kind -- no walkability, no
 * collision, nothing but positions -- because it never needed any: monsters
 * chase in a straight line and damage is a distance check.  Blocking an
 * attack is the first rule that needs to know a rock is there.
 *
 * ── WHY A MIRROR AND NOT A SHARED MODULE ──
 * `server/` builds as its own Worker bundle and imports nothing from `src/`;
 * every client/server constant in this codebase is a hand-copied mirror for
 * that reason (see data.js's header).  The guard against drift is mechanical
 * rather than remembered: server/test/mirror-audit.test.mjs imports BOTH
 * sides and fails if a footprint here disagrees with worldProps.js, which is
 * the same treatment the spawn tables and the T2 bench already get after the
 * v2.3.1147 sky-table drift.
 *
 * ── ONLY PROPS THAT BLOCK MOVEMENT APPEAR HERE ──
 * The list is `propsForZone(z)` filtered to those with a footprint, so the
 * rule is "if you could not walk that line, a shot cannot fly it".  Scenery
 * you can stroll through (none today -- v2.3.2073 made everything solid)
 * would block nothing, which is the honest answer rather than a special case.
 *
 * ── DEPLOY-ORDER SAFETY: NONE NEEDED, AND THAT IS NOT AN OVERSIGHT ──
 * Both halves of this feature degrade safely on their own. An old client
 * against this worker simply has a hit refused that it predicted, which is
 * the ordinary prediction miss `monster_hit` already corrects. A new client
 * against an old worker just declines to claim a shot it would have claimed.
 * So no caps flag: adding one would gate a behaviour that is already safe in
 * both directions, and a caps flag that never turns anything off is a lie in
 * the registry.
 */

/* zone -> blocking footprints, as the sprite's bottom-centre plus its box.
   Mirrors src/data/worldProps.js (x, y, blockW, blockD). `id` is carried for
   the audit's benefit and for readable failures; nothing at runtime reads it. */
export const ZONE_PROPS = {
  town: [
    { id: 'mayor-house', x: 1001, y: 622, blockW: 454, blockD: 206 },
    { id: 'forge', x: 522, y: 1198, blockW: 470, blockD: 200 },
    { id: 'auction-house', x: 1632, y: 1290, blockW: 321, blockD: 220 },
    { id: 'fountain', x: 957, y: 1521, blockW: 252, blockD: 95 },
    { id: 'market-stall', x: 522, y: 1705, blockW: 228, blockD: 74 },
    { id: 'lamp-plaza-w', x: 740, y: 1613, blockW: 57, blockD: 33 },
    { id: 'bench-w', x: 653, y: 1428, blockW: 72, blockD: 34 },
    { id: 'anvil', x: 566, y: 1336, blockW: 52, blockD: 27 },
    { id: 'bank', x: 1495, y: 760, blockW: 357, blockD: 154 },
  ],
  frost: [
    /* v2.3.2894: three snowbanks in a line, nothing else (owner: "the small
       zone needs space and not props") -- MIRROR of src/data/worldProps.js */
    { id: 'frost-snowbank-w', x: 140, y: 570, blockW: 202, blockD: 42 },
    { id: 'frost-rock-ridge', x: 430, y: 570, blockW: 202, blockD: 42 },
    { id: 'frost-snowbank-e', x: 720, y: 570, blockW: 202, blockD: 42 },
  ],
};

/* zone -> [{x0,x1,y0,y1}], built once. The footprint is the box `blockW` wide
   and `blockD` deep at the sprite's base, which is propFootprint()'s own
   arithmetic and must stay identical to it. */
const _boxes = Object.create(null);
function boxesFor(zoneId) {
  if (!zoneId) return [];
  if (_boxes[zoneId]) return _boxes[zoneId];
  const rows = Object.prototype.hasOwnProperty.call(ZONE_PROPS, zoneId) ? ZONE_PROPS[zoneId] : null;
  /* Object.create(null) for the cache and hasOwnProperty for the lookup:
     `zoneId` reaches here from ps.z, which is client-supplied (CLAUDE.md
     rule 4 -- a plain {} no-ops on '__proto__', three incidents in one day). */
  const out = rows ? rows.map((p) => ({
    x0: p.x - p.blockW / 2, x1: p.x + p.blockW / 2, y0: p.y - p.blockD, y1: p.y,
  })) : [];
  _boxes[zoneId] = out;
  return out;
}

/** Where the segment (x0,y0)->(x1,y1) ENTERS the box `b`, as t in [0,1], or
 *  -1 if it never does.  Slab method; a zero component means the segment is
 *  parallel to that pair of edges and can only cross if it lies between them.
 *  Character-for-character the same test as segEnterT in
 *  src/data/worldProps.js -- the two must agree or the client will claim hits
 *  the worker refuses.  The worker only needs the boolean, but it computes the
 *  same value so that a future divergence is a visible edit rather than a
 *  quiet reimplementation. */
function segEnterT(x0, y0, x1, y1, b) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  const axes = [[dx, x0, b.x0, b.x1], [dy, y0, b.y0, b.y1]];
  for (let i = 0; i < 2; i++) {
    const d = axes[i][0], p = axes[i][1], lo = axes[i][2], hi = axes[i][3];
    if (d === 0) { if (p < lo || p > hi) return -1; continue; }
    let a = (lo - p) / d, c = (hi - p) / d;
    if (a > c) { const s = a; a = c; c = s; }
    if (a > t0) t0 = a;
    if (c < t1) t1 = c;
    if (t0 > t1) return -1;
  }
  return t0;
}

function pointInBox(x, y, b) {
  return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
}

/** Is a solid prop standing between these two GROUND points?
 *  An endpoint INSIDE a blocker never blocks: monsters have no collision on
 *  the worker, so one standing in the rock ridge would otherwise become an
 *  invincible turret -- unable to be answered and still able to swing. */
export function attackBlocked(zoneId, x0, y0, x1, y1) {
  if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) return false;
  const boxes = boxesFor(zoneId);
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (pointInBox(x0, y0, b) || pointInBox(x1, y1, b)) continue;
    if (segEnterT(x0, y0, x1, y1, b) >= 0) return true;
  }
  return false;
}

/* ═══ v2.3.2653: AND MONSTERS STOP AT THEM TOO ═══
 *
 * v2.3.2652 made a prop stop an ATTACK.  It left the sillier half untouched:
 * the worker has no collision of any kind, so a snowman walked straight
 * THROUGH the rock ridge whose hits it could no longer land past.  A monster
 * gliding through a rock is more obviously broken than one whose swing is
 * refused, and it undercuts the cover rule -- take cover and the thing you
 * are hiding from simply walks into you.
 *
 * ── AXIS SLIDE, NOT A FLAT REFUSAL ──
 * Refusing any blocked step is the naive version and it STICKS: a monster
 * chasing diagonally into a flat rock face stops dead and vibrates against it
 * for as long as you stand there, because every tick asks for the same
 * rejected move.  Trying the two axes separately lets it slide along the face
 * and round the corner, which is the standard cheap fix and looks like it is
 * walking around the rock rather than failing to walk into it.
 *
 * ── A POINT TEST IS ENOUGH HERE, AND HERE IS WHY ──
 * No swept test: a monster's step is m.spd per tick -- a snowman chases at
 * ~18px/s, so under 2px a tick -- against footprints 27 to 220px deep.  There
 * is no step size in the game that can tunnel one.  If a fast archetype is
 * ever added, this is the assumption to revisit.
 *
 * `pad` matches the player's own collision half-width (PLAYER_HS = 10,
 * zoneTransitions.js) so a monster stops the same distance off a rock as you
 * do; without it the two would crowd to different lines against the same wall
 * and the rock would look like it had two edges.
 *
 * ── STARTING INSIDE NEVER BLOCKS ──
 * Same rule as the attack test, for the same reason: monsters are spawned and
 * leashed without consulting geometry, so one WILL end up inside a footprint.
 * Trapping it there forever is worse than letting it walk out, and a monster
 * that cannot leave a rock is a monster you cannot fight.
 */
const MONSTER_PAD = 10;

/** Resolve a desired move against the zone's props.
 *  Returns the position actually taken — the full move, an axis slide, or the
 *  original point. */
export function slideMove(zoneId, x, y, nx, ny, pad) {
  const boxes = boxesFor(zoneId);
  if (!boxes.length) return { x: nx, y: ny };
  const p = pad === undefined ? MONSTER_PAD : pad;
  const blocked = (px, py) => {
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (px > b.x0 - p && px < b.x1 + p && py > b.y0 - p && py < b.y1 + p) return true;
    }
    return false;
  };
  if (blocked(x, y)) return { x: nx, y: ny };   /* already inside: walk out freely */
  if (!blocked(nx, ny)) return { x: nx, y: ny };
  if (!blocked(nx, y)) return { x: nx, y };      /* slide along the face, X */
  if (!blocked(x, ny)) return { x, y: ny };      /* ...or Y */
  return { x, y };
}
