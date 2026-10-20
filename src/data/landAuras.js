/* ═══ v2.3.3511: EACH LAND'S SPECKS, AS DATA (no imports) ═══
 *
 * The table src/rendering/landAuras.js draws from (v2.3.3402, moved here so
 * the server's suite can read it without Pixi: server/test/land-auras.test.mjs)
 * -- what each of the Wheel's lands puts round its trees and rocks, and the
 * arithmetic of how many sprites a resource keeps for it.  The why of each
 * look is in the renderer's header; the owner's words that changed it:
 * "land tree effects: fire looks like sparkles, water looks like sweating"
 * (2026-10-19, a playtest).
 */

/* at most this many specks alive, all resources together, and on one (its
   pool of sprites for the kinds the rate makes: a splash's own ring and
   droplets come on top) */
export const AURA_MAX = 260;
export const PER_MAX = 36;
/* a resource's specks are made while its picture's box is within VIEW_IN
   world px of the view, and let go past VIEW_OUT (v2.3.3511: the node view
   reaches 480 px past the screen, and a resource out there made specks no one
   saw) */
export const AURA_VIEW_IN = 160, AURA_VIEW_OUT = 420;

/* A resource's land: the worker names its Wheel nodes `wn-<land>-<k>`
   (wheelzone.js _wheelSpawnNodes); the commons is no land */
export function auraLandOf(node) {
  const m = node && /^wn-([a-z]+)-/.exec(String(node.id));
  return m ? m[1] : null;
}

/* ── each land's specks ──
   rate     how many a second for a resource 100 world px across (a bigger one
            makes more, a smaller fewer) -- each a burst or an arc where a
            kind is one
   parts    the kinds it makes, each its share `w` of them (0: never by the
            rate -- a drip's splash makes it):
     id       its name, unique in its land (a resource's pool is kept by it)
     on       'tree' or 'rock': only on that (the shares of the rest scaled up)
     tex      the shape (the renderer's textures, AURA_TEX)
     life     ms, [min, max]
     from     where it starts: 'crown' (the box's upper two thirds), 'top' (its
              upper quarter), 'all', 'low' (its lower half), 'foot' (at the
              ground: round a tree's trunk, across a rock's middle, or
              `spread` of the box's width either side),
              'crownEdge' (a tree's crown's lower edge, as its picture has it:
              tierTrees.js treeCrownEdge)
     v        world px a second, [vx, vy], each +/- `jit`
     g        added to vy each second (+ falls faster, - rises faster)
     sway     a sideways wander, px; `curl` makes it grow with age
     orient   turned the way it moves (a streak: head first)
     stretch  longer the faster it goes: x (1 + px a second * stretch)
     colors   picked at random; or `ramp`, its colour through its life
     size     world px across, [min, max] (a streak's length); `thick` a
              streak's thickness, its glow's (v2.3.3511: the bright core is the
              middle quarter of it); `grow` [start, end] times through its life;
              `squash` its height to its width (a ring lying on the ground)
     add      drawn added to what is under it (a light)
     blink    how often a frame dims it (the fireflies' and the light realm's)
     flick    a smooth flicker, how deep (an ember's)
     spin     turns as it goes, radians a second (petals, flakes)
     still    stays where it starts (a glint); `fly` wanders (a firefly)
     fade     'in-out', 'out', 'pulse' (up and down once) or 'late' (full,
              then out over its last 40%)
     alpha    its strongest
     burst    [min, max] made at once from one point (sparks)
     zap      an arc: this many specks along a jagged line, all at once
     toGround ends where it reaches the ground (the foot's line)
     kind     'drip': hangs `hang` ms at the crown's edge as it swells, then
              falls at `g` to the ground and splashes (`splash`: [[id, n]]);
              'ring': spreads from `grow`[0] to [1] times, squashed, fading
     anchor   [x, y] the sprite's (a hanging drop hangs from its top)
   base     a glow at its foot: colour, [min, max] alpha, its width and
            height as shares of the resource's width, added or not;
            `flicker` electric (at random), `coal` two slow waves */
export const LAND_AURAS = Object.freeze({
  frost: { rate: 5.5, parts: [
    { id: 'flake', w: 0.85, tex: 'flake', life: [2200, 3400], from: 'crown', v: [4, 15], jit: [5, 4], sway: 9, colors: [0xffffff, 0xeef7ff, 0xdcefff], size: [5, 7], spin: 1.2, fade: 'in-out' },
    { id: 'rime', w: 0.15, tex: 'glint', life: [500, 900], from: 'all', v: [0, 0], jit: [0, 0], colors: [0xf4fbff, 0xd8f0ff], size: [11, 15], add: true, still: true, fade: 'pulse' },
  ] },
  /* v2.3.3511: fire, not sparkles (the renderer's header) */
  ember: { rate: 7.5, base: { color: 0xff6a1e, alpha: [0.14, 0.4], w: 1.0, h: 0.34, add: true, coal: true }, parts: [
    { id: 'ember', w: 0.66, tex: 'ember', life: [750, 1250], from: 'crown', v: [0, -30], jit: [9, 8], g: -62, sway: 6, curl: true, orient: true, stretch: 0.008,
      ramp: [0xfff6c8, 0xffc24a, 0xff7a24, 0xc0361a], size: [22, 30], thick: [14, 17], grow: [1, 0.35], add: true, flick: 0.22, fade: 'late' },
    { id: 'pop', w: 0.14, tex: 'ember', life: [420, 700], from: 'foot', v: [0, -105], jit: [34, 22], g: 330, orient: true, stretch: 0.006, toGround: true,
      ramp: [0xfff6c8, 0xffa040, 0xd04018], size: [16, 20], thick: [11, 13], grow: [1, 0.5], add: true, flick: 0.15, fade: 'late' },
    { id: 'smoke', w: 0.16, tex: 'puff', life: [2600, 3800], from: 'top', v: [3, -15], jit: [4, 4], g: -3, sway: 9, curl: true,
      colors: [0x3b3431, 0x4a423d], size: [16, 22], grow: [0.8, 2.2], alpha: 0.28, fade: 'in-out' },
    { id: 'ash', w: 0.12, tex: 'dot', life: [1600, 2600], from: 'crown', v: [3, 12], jit: [6, 4], sway: 5, colors: [0x4a4440, 0x6b625a], size: [3, 4.5], spin: 2, fade: 'in-out' },
  ] },
  sky: { rate: 8, parts: [
    { id: 'sand', w: 1, tex: 'streak', life: [600, 1100], from: 'all', v: [-75, 5], jit: [22, 6], sway: 2, colors: [0xead6a0, 0xd9bf7e, 0xf6e8bf], size: [11, 16], thick: [2.4, 3.2], fade: 'in-out' },
  ] },
  /* v2.3.3511: the crystal glints are a rock's alone -- winking all over a
     tree they read as sparkles; a crumb of stone falls off a rock */
  hollows: { rate: 4.5, parts: [
    { id: 'dust', w: 0.65, tex: 'dot', life: [1600, 2600], from: 'all', v: [0, 9], jit: [3, 3], sway: 3, colors: [0xcdbfa8, 0xb8a990, 0xe3d6c0], size: [3, 4.5], fade: 'in-out' },
    { id: 'grit', on: 'rock', w: 0.15, tex: 'dot', life: [700, 1200], from: 'crown', v: [0, 12], jit: [10, 6], g: 260, spin: 4, toGround: true, colors: [0x8f8576, 0xa89c88, 0x7a7266], size: [3.5, 5], fade: 'late' },
    { id: 'crystal', on: 'rock', w: 0.35, tex: 'glint', life: [600, 1000], from: 'all', v: [0, 0], jit: [0, 0], colors: [0xc9ecff, 0xe2d4ff, 0xffffff], size: [11, 15], add: true, still: true, fade: 'pulse' },
  ] },
  /* v2.3.3511: sparks thrown in bursts that arc down, not lights blinking
     at random */
  thunder: { rate: 5.5, base: { color: 0xb8a8ff, alpha: [0.1, 0.42], w: 0.9, h: 0.32, add: true, flicker: true }, parts: [
    { id: 'spark', w: 0.7, tex: 'spark', burst: [3, 5], life: [240, 420], from: 'all', v: [0, -70], jit: [130, 80], g: 520, orient: true, stretch: 0.004,
      ramp: [0xffffff, 0xfff6a8, 0xd8c8ff], size: [12, 17], thick: [8.5, 10], grow: [1, 0.55], add: true, fade: 'late' },
    { id: 'arc', w: 0.3, tex: 'dot', life: [110, 200], from: 'all', v: [0, 0], jit: [0, 0], colors: [0xf4f0ff, 0xfff8c0], size: [3, 4], add: true, still: true, fade: 'out', zap: 6 },
  ] },
  /* v2.3.3511: water that drips and lands, not sweat (the renderer's header) */
  tidal: { rate: 5.5, parts: [
    { id: 'drip', on: 'tree', w: 0.6, tex: 'drop', kind: 'drip', from: 'crownEdge', hang: [180, 420], g: 700, anchor: [0.5, 0.12],
      colors: [0xc8eeff, 0x96d8f2, 0xeefaff], size: [5, 6.5], splash: [['splash', 1], ['bead', 2]] },
    { id: 'splash', w: 0, tex: 'ring', kind: 'ring', life: [330, 380], colors: [0xd6f4ff, 0xbfe9f7], size: [9, 12], grow: [0.5, 2], squash: 0.45, alpha: 0.85, fade: 'out' },
    { id: 'bead', w: 0, tex: 'dot', life: [260, 360], v: [0, -70], jit: [26, 14], g: 520, toGround: true, colors: [0xd6f4ff, 0xffffff], size: [2, 2.6], fade: 'late' },
    { id: 'mist', w: 0.2, tex: 'puff', life: [3000, 4600], from: 'foot', spread: 0.42, v: [7, -1], jit: [5, 1], colors: [0xd6f4ff, 0xbfe9f7], size: [26, 36], squash: 0.4, grow: [0.8, 1.5], alpha: 0.22, fade: 'in-out' },
    { id: 'wet', w: 0.2, tex: 'glint', life: [500, 800], from: 'crown', v: [0, 0], jit: [0, 0], colors: [0xeefaff, 0xd6f4ff], size: [8, 11], add: true, still: true, fade: 'pulse' },
    { id: 'ripple', on: 'rock', w: 0.45, tex: 'ring', kind: 'ring', life: [1400, 2000], from: 'foot', spread: 0.15, colors: [0xd6f4ff, 0xbfe9f7], size: [20, 26], grow: [0.6, 1.9], squash: 0.4, alpha: 0.5, fade: 'out' },
  ] },
  mist: { rate: 5, base: { color: 0x9cff6a, alpha: [0.1, 0.24], w: 1.0, h: 0.32, add: true }, parts: [
    { id: 'spore', w: 1, tex: 'glow', life: [1700, 2900], from: 'crown', v: [0, -13], jit: [5, 4], sway: 8, colors: [0xb6f07a, 0x92e25c, 0xdcff9e], size: [10, 14], add: true, fade: 'in-out' },
  ] },
  verdant: { rate: 4, parts: [
    { id: 'petal', w: 0.72, tex: 'petal', life: [2200, 3400], from: 'crown', v: [7, 14], jit: [6, 4], sway: 10, colors: [0xffbfd6, 0xfff2f6, 0xffe27a, 0xf59ac0], size: [6, 8], spin: 2.4, fade: 'in-out' },
    { id: 'firefly', w: 0.28, tex: 'glow', life: [2400, 3800], from: 'all', v: [0, 0], jit: [0, 0], colors: [0xf4ff8a, 0xd6ff70], size: [10, 13], add: true, fly: true, fade: 'in-out' },
  ] },
  /* the owner's other two elements: the Dark and Light realms past the far
     gates are not built yet, so nothing wears these until a resource there
     has an id that names them (`wn-dark-<k>`, `wn-light-<k>`) */
  dark: { rate: 4, base: { color: 0x2a1a3a, alpha: [0.2, 0.34], w: 1.0, h: 0.36, add: false }, parts: [
    { id: 'wisp', w: 1, tex: 'glow', life: [1700, 2700], from: 'crown', v: [0, -12], jit: [5, 4], sway: 6, colors: [0x3a2a4a, 0x241a30, 0x5a3f73], size: [14, 20], alpha: 0.7, fade: 'in-out' },
  ] },
  light: { rate: 4, base: { color: 0xfff1b0, alpha: [0.14, 0.28], w: 1.0, h: 0.32, add: true }, parts: [
    { id: 'mote', w: 1, tex: 'glow', life: [1500, 2500], from: 'all', v: [0, -16], jit: [4, 3], sway: 4, colors: [0xfff8d0, 0xffffff, 0xffe9a0], size: [10, 14], add: true, blink: 0.1, fade: 'in-out' },
  ] },
});

/* the shapes the table names (the renderer makes each, AURA_TEX) */
export const AURA_TEX = Object.freeze(['dot', 'glow', 'flake', 'streak', 'drop', 'petal', 'glint', 'ember', 'spark', 'puff', 'ring']);

/** The kinds land `land` puts on a resource of `type` ('tree' or 'rock'),
 *  every one a drip's splash names included (they come only from it). */
export function auraPartsFor(land, type) {
  const A = Object.prototype.hasOwnProperty.call(LAND_AURAS, land) ? LAND_AURAS[land] : null;
  if (!A) return [];
  const on = A.parts.filter((P) => !P.on || P.on === type);
  const want = new Set(on.filter((P) => P.w > 0).map((P) => P.id));
  for (const P of on) if (P.w > 0 && P.splash) for (const [id] of P.splash) want.add(id);
  return on.filter((P) => want.has(P.id));
}

/* a part's mean life, seconds: a drip hangs, then falls about half a second */
function meanLife(P) {
  if (P.kind === 'drip') return ((P.hang[0] + P.hang[1]) / 2 + 450) / 1000;
  return ((P.life[0] + P.life[1]) / 2) / 1000;
}
/* specks one making of a kind gives: a burst's mean, an arc's dots, else 1 */
function perMaking(P) {
  return P.zap ? P.zap : P.burst ? (P.burst[0] + P.burst[1]) / 2 : 1;
}

/** How many sprites a resource keeps for each kind (by id): what its rate
 *  keeps alive, a third more and one to spare, at least two (an arc's whole
 *  line); the kinds the rate makes held to PER_MAX in all, scaled down
 *  together, and a splash's kinds sized to the drips that make them.
 *  `f` is the resource's size: its width over 100 world px, a rock as if 70
 *  across at the least. */
export function auraPoolPlan(land, type, f) {
  const A = LAND_AURAS[land];
  const parts = auraPartsFor(land, type);
  const sumW = parts.reduce((s, P) => s + (P.w > 0 ? P.w : 0), 0) || 1;
  const ev = Object.create(null);
  for (const P of parts) if (P.w > 0) ev[P.id] = A.rate * f * (P.w / sumW);
  for (const P of parts) if (P.w > 0 && P.splash) for (const [id, n] of P.splash) ev[id] = (ev[id] || 0) + ev[P.id] * n;
  const want = Object.create(null);
  let made = 0;
  for (const P of parts) {
    const alive = (ev[P.id] || 0) * meanLife(P) * perMaking(P);
    want[P.id] = Math.max(2, P.zap || 0, Math.ceil(alive * 1.3) + 1);
    if (P.w > 0) made += want[P.id];
  }
  if (made > PER_MAX) {
    const k = PER_MAX / made;
    for (const P of parts) if (P.w > 0) want[P.id] = Math.max(2, P.zap || 0, Math.floor(want[P.id] * k));
  }
  return want;
}

/** A colour `q` (0..1) of the way through `ramp`, a list of 0xRRGGBB. */
export function auraRampAt(ramp, q) {
  const n = ramp.length - 1;
  if (n <= 0) return ramp[0];
  const f = Math.max(0, Math.min(1, q)) * n;
  const i = Math.min(n - 1, Math.floor(f)), t = f - i;
  const a = ramp[i], b = ramp[i + 1];
  const ch = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A speck's strength `q` (0..1) of the way through its life, by its fade. */
export function auraFade(fade, q) {
  if (fade === 'out') return 1 - q;
  if (fade === 'pulse') return Math.sin(q * Math.PI);
  if (fade === 'late') return q < 0.08 ? q / 0.08 : q > 0.6 ? (1 - q) / 0.4 : 1;
  return q < 0.18 ? q / 0.18 : q > 0.72 ? (1 - q) / 0.28 : 1;
}
