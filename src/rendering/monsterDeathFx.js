/* ═══ v2.3.2913: MONSTERS DIE IN MORE THAN ONE WAY ═══
 *
 * Owner: "I think it would be cool for monsters to have different death
 * animations.  Sliced in half upon death, head chopped off, leg falls off,
 * include the normal death too for variety.  You'd have to do that with code
 * though."
 *
 * So every kill rolls one of:
 *   normal -- the monster's own death strip / slime splat, exactly as before
 *             (this module returns NONE and entityRenderer draws it)
 *   slice  -- a diagonal cut through the middle: the top half slides down the
 *             cut, drops and lies flat; the bottom half slumps over
 *   decap  -- the head pops off, spins, bounces and rolls; the body stands a
 *             beat, spurting, and topples
 *   leg    -- one leg drops away and the body, losing its footing, falls to
 *             that side
 * Slimes and wisps (anything drawn on the slime sheets) have no neck or legs,
 * so they roll normal / slice / decap -- "decap" on a blob is its top popping
 * off, which reads fine; a blob losing a "leg" does not.
 *
 * HOW, IN CODE, WITH NO NEW ART: the piece art IS the monster, as it stood on
 * its last living frame.  Each piece is a Sprite of that very texture, with the
 * same anchor/tint, masked to a polygon -- the cut -- and given a body of its
 * own: free pieces fly with gravity, bounce and settle flat on whichever edge
 * lands; standing pieces topple about a foot like a felled tree.  The cut edge
 * is lined in the monster's own material (hitMaterialOf -- goo in the slime's
 * colour, bone chips off a skeleton, blood off a goblin), and a spray of the
 * same comes out of the wound.
 *
 * EVERY CLIENT SEES THE SAME DEATH: the roll is a hash of the monster id and
 * where it died (the worker's x/y), not Math.random, so a party watching the
 * same kill watches the same head fly the same way.
 *
 * WHERE IT LIVES: a child container of the monster's own display, so it rides
 * the display's position, zone scale and depth sort (depthSort.js) for free --
 * the same trick deathCrumble.js uses for the player.  It is keyed on the
 * death stamp entityRenderer already keeps (m._slimeDeathStart /
 * m._snowmanDeathStart), which both respawn paths null, so a respawned
 * monster starts clean without either of them learning about this file.
 *
 * SHAPES COME FROM THE PIXELS, NOT THE CUT: each texture is read back once
 * into a coarse coverage grid (which cells hold body, which hold air).  A
 * piece's collision outline is the convex hull of ITS body cells, its centre
 * of mass their mean, and a wound line / spray is only drawn where the cut
 * actually passes through body -- a first cut that used the cut rectangles
 * stood a slime's dome on an invisible corner of air, drew red lines across
 * empty frame, and lifted a torch-carrying goblin off the ground as he fell
 * (his box's corner was the end of his torch, not his foot).
 *
 * Units: everything below is in the sprite's own texture pixels (the root
 * copies the body sprite's transform, mirror included), and every speed and
 * gravity is a multiple of the body's measured height H, so a 40px slime and a
 * 150px skeleton fall on the same clock.
 */
import { Container, Sprite, Graphics, Rectangle } from 'pixi.js';
import { hitMaterialOf, hitFxTintOf } from '@/data/monsterVariants.js';

export const DEATH_NONE = 0;   /* not handled: draw the normal death */
export const DEATH_LIVE = 1;   /* drawn this frame: keep the display */
export const DEATH_DONE = 2;   /* finished: let the display go */

const KINDS_BODY = ['normal', 'slice', 'decap', 'leg'];
const KINDS_BLOB = ['normal', 'slice', 'decap'];

const DUR_MS = 1750;           /* whole effect, fade included */
const FADE_FROM_MS = 1300;
const G = 14;                  /* gravity, in body heights per s^2 */
const MAX_PARTS = 70;

const BLOOD = 0xa3221c, BLOOD_D = 0x5e0f0c;

let _renderer = null;
export function setMonsterDeathRenderer(r) { _renderer = r; }

/* ── the roll ── */
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}
/* a tiny seeded PRNG, so every client derives the same angles and speeds */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export function rollDeathKind(m, blob) {
  let forced = null;
  try { forced = (typeof window !== 'undefined') ? window.__btDeathKind : null; } catch (e) { forced = null; }
  const kinds = blob ? KINDS_BLOB : KINDS_BODY;
  /* a forced kind this body cannot do (a slime's `leg`) is the normal death */
  if (forced && KINDS_BODY.indexOf(forced) >= 0) return kinds.indexOf(forced) >= 0 ? forced : 'normal';
  const h = hash32(`${m.id}|${Math.round(m.x)}|${Math.round(m.y)}`);
  return kinds[h % kinds.length];
}

/* ── what the body really covers ──
   Read back once per texture (a monster reuses a handful of frames, so after
   the first few kills of a type this is a map lookup) into a coverage grid of
   ~48 cells on the long side, in ORIG space (a Sprite at anchor 0). */
const GRID_CELLS = 48;
const _covCache = new Map();
function coverage(tex) {
  const key = tex.uid;
  if (_covCache.has(key)) return _covCache.get(key);
  let out = null;
  if (_renderer && _renderer.extract) {
    const probe = new Sprite(tex);
    const lb = probe.getLocalBounds();
    let shot = null;
    try {
      shot = _renderer.generateTexture({ target: probe, frame: new Rectangle(lb.x, lb.y, Math.max(1, lb.width), Math.max(1, lb.height)), resolution: 1 });
      const px = _renderer.extract.pixels(shot);
      const W = px.width, Hh = px.height, d = px.pixels;
      const rx = W / Math.max(1, lb.width);
      const cellPx = Math.max(1, Math.ceil(Math.max(W, Hh) / GRID_CELLS));   /* in shot px */
      const gw = Math.ceil(W / cellPx), gh = Math.ceil(Hh / cellPx);
      const grid = new Uint8Array(gw * gh);
      let x0 = W, y0 = Hh, x1 = -1, y1 = -1;
      for (let y = 0; y < Hh; y++) {
        for (let x = 0; x < W; x++) {
          if (d[(y * W + x) * 4 + 3] > 60) {
            grid[((y / cellPx) | 0) * gw + ((x / cellPx) | 0)]++;
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      /* a cell is body when a fifth of it is */
      const need = Math.max(1, (cellPx * cellPx) / 5);
      for (let i = 0; i < grid.length; i++) grid[i] = grid[i] >= need ? 1 : 0;
      if (x1 > x0 && y1 > y0) {
        out = {
          x0: lb.x + x0 / rx, y0: lb.y + y0 / rx, x1: lb.x + (x1 + 1) / rx, y1: lb.y + (y1 + 1) / rx,
          ox: lb.x, oy: lb.y, cell: cellPx / rx, gw, gh, grid,
        };
      }
    } catch (e) { out = null; }
    if (shot) { try { shot.destroy(true); } catch (e) { /* gone */ } }
    probe.destroy();
  }
  if (_covCache.size > 300) _covCache.clear();
  _covCache.set(key, out);
  return out;
}

/* ── geometry (sprite-local px) ── */
/* clip a polygon to the half-plane  n.(p - c) <= 0 */
function clipHalf(poly, cx, cy, nx, ny) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = nx * (a[0] - cx) + ny * (a[1] - cy);
    const db = nx * (b[0] - cx) + ny * (b[1] - cy);
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop();
  return lo.concat(up);
}

/* The body cells of the texture that fall inside `poly`: their mean (centre
   of mass) and the hull of their corners (collision outline). */
function bodyOf(cov, sx, sy, poly) {
  const pts = [], corners = [];
  const c = cov.cell, h = c / 2;
  let mx = 0, my = 0;
  for (let gy = 0; gy < cov.gh; gy++) {
    for (let gx = 0; gx < cov.gw; gx++) {
      if (!cov.grid[gy * cov.gw + gx]) continue;
      const x = cov.ox + (gx + 0.5) * c - sx, y = cov.oy + (gy + 0.5) * c - sy;
      if (!inPoly(x, y, poly)) continue;
      pts.push([x, y]); mx += x; my += y;
      corners.push([x - h, y - h], [x + h, y - h], [x + h, y + h], [x - h, y + h]);
    }
  }
  if (pts.length < 2) return null;
  return { com: [mx / pts.length, my / pts.length], hull: hull(corners), n: pts.length };
}

/* Where along a->b the line passes through body: the solid runs. */
function solidRuns(cov, sx, sy, a, b) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(len / (cov.cell * 0.5)));
  const runs = [];
  let start = -1;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const x = a[0] + (b[0] - a[0]) * f + sx, y = a[1] + (b[1] - a[1]) * f + sy;
    const gx = Math.floor((x - cov.ox) / cov.cell), gy = Math.floor((y - cov.oy) / cov.cell);
    const on = gx >= 0 && gy >= 0 && gx < cov.gw && gy < cov.gh && !!cov.grid[gy * cov.gw + gx];
    if (on && start < 0) start = f;
    if ((!on || i === n) && start >= 0) {
      const e = on ? f : (i - 1) / n;
      if (e > start) runs.push([[a[0] + (b[0] - a[0]) * start, a[1] + (b[1] - a[1]) * start], [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e]]);
      start = -1;
    }
  }
  return runs;
}

/* ═══ v2.3.2923: A CUT IS NOT A RULER LINE ═══
   Owner: "they look a little too artificial just doing a straight slice.
   Vary the cuts a little bit so it looks better."  A cut is now a POLYLINE
   across the body: bowed (a swing that followed through in an arc), ragged
   (a blade that tore more than it sliced), stepped (it caught on something
   and jumped), or near-clean with a little jitter -- the style and every
   offset from the death's seeded roll, so every client still sees the same
   cut.  The two halves are the path closed off above and below it, clipped
   to the body's box; bodies, wound lines and the spray all read off the same
   path, so nothing else had to learn it was no longer straight. */
/* ═══ v2.3.2928: ...AND NOT A RULER LINE WITH THREE KINKS IN IT EITHER ═══
   Owner: "the biggest problem is an artificial razor straight line that the
   enemy gets cut into.  It really doesn't need to be precise in any way
   because the monster is already dead at this point.  So make the lines look
   naturally a little jagged for each cut point."
   The v2.3.2923 path spread its 11-15 points across W+H either side of the
   cut -- most of them far outside the monster -- so only three to five bends
   ever crossed the body, and its jitter was a fraction of a pixel at a
   slime's size: between the bends, a ruler.  Now the path is DENSE across the
   body only (a point every ~2 texels, the far ends kept just to close the
   halves off), and every point carries three things summed: the swing's bow,
   a slow WANDER (value noise, a few knots across the body) and sharp TEETH
   sized in the monster's own texels (at least a texel, so they survive its
   resolution), with the odd deeper notch where the blade tore.  Styles and
   every offset still come from the death's seeded roll, so every client sees
   the same cut; the two halves share the one path, so they still fit. */
function jagOffsets(n, H, rand, amp, ragged) {
  /* the wander: cosine-interpolated knots, ~1 per 8 points */
  const knots = [];
  const K = Math.max(2, Math.ceil(n / 8) + 1);
  const wAmp = H * amp * (ragged ? 0.05 : 0.032);
  for (let k = 0; k <= K; k++) knots.push((rand() - 0.5) * 2 * wAmp);
  const tooth = Math.max(1.1, H * amp * (ragged ? 0.05 : 0.034));
  const out = [];
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const kf = (i / Math.max(1, n - 1)) * K, k0 = Math.floor(kf), t = kf - k0;
    const e = (1 - Math.cos(Math.PI * t)) / 2;
    const wander = knots[k0] * (1 - e) + knots[Math.min(K, k0 + 1)] * e;
    /* teeth lean away from the last one, so the edge zigzags instead of
       wobbling; now and then a notch two or three times as deep */
    let tt = (rand() - 0.5) * 2 * tooth;
    if (Math.sign(tt) === Math.sign(prev) && rand() < 0.6) tt = -tt;
    if (rand() < 0.09) tt *= 2 + rand();
    prev = tt;
    out.push(wander + tt);
  }
  return out;
}
/* a jagged line from a to b (end points kept exactly), for the leg cut */
function jagLine(a, b, H, rand, amp) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(3, Math.round(len / Math.max(1.6, H / 28)) + 1);
  const ux = (b[0] - a[0]) / (len || 1), uy = (b[1] - a[1]) / (len || 1);
  const off = jagOffsets(n, H, rand, amp, false);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const o = (i === 0 || i === n - 1) ? 0 : off[i];
    pts.push([a[0] + (b[0] - a[0]) * f - uy * o, a[1] + (b[1] - a[1]) * f + ux * o]);
  }
  return pts;
}
function cutPath(cx, cy, dx, dy, W, H, rand, calm) {
  const far = W + H;
  const nx = -dy, ny = dx;
  const r = rand();
  const style = calm ? (r < 0.5 ? 'clean' : 'ragged') : (r < 0.25 ? 'clean' : r < 0.55 ? 'arc' : r < 0.8 ? 'ragged' : 'step');
  const amp = calm ? 0.6 : 1;
  const bow = (rand() < 0.5 ? -1 : 1) * H * amp * (style === 'arc' ? 0.08 + rand() * 0.07 : 0.01 + rand() * 0.03);
  const stepAt = (rand() - 0.5) * 0.6;   /* where across the body a step jumps, in half-widths */
  const stepH = (rand() < 0.5 ? -1 : 1) * H * amp * (0.06 + rand() * 0.05);
  /* dense across the body (and a margin past it), in texels along the cut */
  const half = W / 2 * 1.35;
  const ds = Math.max(1.4, H / 34);
  const n = Math.max(12, Math.min(160, Math.round((2 * half) / ds) + 1));
  const off = jagOffsets(n, H, rand, amp, style === 'ragged');
  const pts = [[cx - dx * far, cy - dy * far]];
  for (let i = 0; i < n; i++) {
    const along = -half + (2 * half * i) / (n - 1);
    const u = along / Math.max(1, W / 2);          /* -1..1 across the body */
    const inside = Math.max(0, 1 - u * u);
    let o = bow * inside + off[i];
    if (style === 'step') o += (u > stepAt ? 0.5 : -0.5) * stepH * Math.min(1, inside * 4);
    pts.push([cx + dx * along + nx * o, cy + dy * along + ny * o]);
  }
  pts.push([cx + dx * far, cy + dy * far]);
  return { pts, style, nx, ny };
}
/* clip any polygon to the (convex) box */
function clipRect(poly, xl, yt, xr, yb) {
  let p = clipHalf(poly, xl, 0, -1, 0);
  if (p.length) p = clipHalf(p, xr, 0, 1, 0);
  if (p.length) p = clipHalf(p, 0, yt, 0, -1);
  if (p.length) p = clipHalf(p, 0, yb, 0, 1);
  return p;
}
/* the y of a (monotonic-in-x) path at x */
function pathYAt(pts, x) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if ((x - a[0]) * (x - b[0]) <= 0 && a[0] !== b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }
  return pts[Math.floor(pts.length / 2)][1];
}

/* ── the pieces ── */
function makePiece(root, sb, mask, body, wounds, woundCol) {
  const c = new Container();
  const spr = new Sprite(sb.texture);
  spr.anchor.set(sb.anchor.x, sb.anchor.y);
  spr.tint = sb.tint;
  const mg = new Graphics();
  mg.poly(mask.flat()).fill({ color: 0xffffff });
  c.addChild(spr);
  c.addChild(mg);
  spr.mask = mg;
  /* the cut face: a line of the monster's own insides, only where the cut
     went through body */
  if (wounds && wounds.length) {
    const w = new Graphics();
    for (const [a, b] of wounds) w.moveTo(a[0], a[1]).lineTo(b[0], b[1]);
    /* v2.3.2923: a wet dark edge under a brighter core, so a ragged cut reads
       as torn flesh / goo rather than a drawn line */
    w.stroke({ color: shade(woundCol, 0.55), width: 4.5, alpha: 0.9, join: 'round', cap: 'round' });
    for (const [a, b] of wounds) w.moveTo(a[0], a[1]).lineTo(b[0], b[1]);
    w.stroke({ color: woundCol, width: 2.2, alpha: 0.95, join: 'round', cap: 'round' });
    c.addChild(w);
  }
  c.pivot.set(body.com[0], body.com[1]);
  c.position.set(body.com[0], body.com[1]);
  root.addChild(c);
  return {
    c, hull: body.hull, com: body.com,
    free: false, vx: 0, vy: 0, spin: 0, rest: false,
    hinge: null, hdir: 0, hdelay: 0, hmax: Math.PI / 2, hAt: null,
    slide: null, slump: null,
  };
}

/* Tip over about a FOOT: the outermost of the piece's lowest points on the
   side it falls to.  (Not the box corner -- see the header.) */
function setHinge(pc, dir, delayMs, maxAng) {
  let lo = -Infinity;
  for (const p of pc.hull) if (p[1] > lo) lo = p[1];
  let fx = null;
  for (const p of pc.hull) {
    if (p[1] < lo - 3) continue;
    if (fx == null || (dir > 0 ? p[0] > fx : p[0] < fx)) fx = p[0];
  }
  pc.c.pivot.set(fx, lo);
  pc.c.position.set(fx, lo);
  pc.hinge = [fx, lo]; pc.hdir = dir; pc.hdelay = delayMs; pc.hmax = maxAng || Math.PI / 2;
}

/* lowest point of a piece, in root space */
function lowestY(pc) {
  const cos = Math.cos(pc.c.rotation), sin = Math.sin(pc.c.rotation);
  const sy = pc.c.scale.y, sx = pc.c.scale.x;
  let lo = -Infinity;
  for (const p of pc.hull) {
    const dx = (p[0] - pc.c.pivot.x) * sx, dy = (p[1] - pc.c.pivot.y) * sy;
    const y = pc.c.position.y + sin * dx + cos * dy;
    if (y > lo) lo = y;
  }
  return lo;
}

/* the rotation that lays the piece on the hull face now closest to facing down */
function flatTarget(pc) {
  const r = pc.c.rotation;
  let best = r, bestD = Infinity;
  const n = pc.hull.length;
  for (let i = 0; i < n; i++) {
    const a = pc.hull[i], b = pc.hull[(i + 1) % n];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    if (len < 2) continue;
    let nx = ey / len, ny = -ex / len;
    const mx = (a[0] + b[0]) / 2 - pc.com[0], my = (a[1] + b[1]) / 2 - pc.com[1];
    if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
    const want = Math.PI / 2 - Math.atan2(ny, nx);
    let d = want - r;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    /* a long face is a steadier bed than a short one: favour it a little */
    const score = Math.abs(d) - Math.min(0.35, len * 0.004);
    if (score < bestD) { bestD = score; best = r + d; }
  }
  return best;
}

function shade(c, k) {
  const r = ((c >> 16) & 255) * k, g = ((c >> 8) & 255) * k, b = (c & 255) * k;
  return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
}

/* QA can play a death in slow motion to photograph it (window.__btDeathSlow,
   house style: __btSouthTilt) -- a headless screenshot takes longer than a
   whole cut.  Read once per death. */
function qaSlow() {
  try {
    const k = (typeof window !== 'undefined') ? Number(window.__btDeathSlow) : 0;
    return k > 0 ? Math.min(20, k) : 1;
  } catch (e) { return 1; }
}

/* ── build one death ── */
function build(kind, display, m, blob, now) {
  const sb = display._spriteBody;
  const tex = sb && sb.texture;
  if (!tex || !tex.source) return null;
  const cov = coverage(tex);
  if (!cov) return null;
  /* orig space -> the sprite's own local space (what the root, the masks and
     every number below are in) */
  const ow = (tex.orig && tex.orig.width) || tex.width, oh = (tex.orig && tex.orig.height) || tex.height;
  const sx = sb.anchor.x * ow, sy = sb.anchor.y * oh;
  const x0 = cov.x0 - sx, x1 = cov.x1 - sx, y0 = cov.y0 - sy, y1 = cov.y1 - sy;
  const W = x1 - x0, H = y1 - y0;
  if (W < 4 || H < 4) return null;

  const matKey = display._variantKey || (m && (m.arch || m.type));
  const mat = hitMaterialOf(matKey) || {};
  const matKind = mat.fx || mat.kind || 'goo';
  const bloody = matKind === 'goblin' || matKind === 'ember';
  /* hitFxTintOf follows a slime's recolour, so a blue slime bleeds blue */
  const col = bloody ? BLOOD : (hitFxTintOf(matKey) || 0x5ca84c);
  const colD = bloody ? BLOOD_D : shade(col, 0.6);
  const rand = rng(hash32(`${m.id}|${Math.round(m.x)}|${Math.round(m.y)}|p`));
  const side = rand() < 0.5 ? -1 : 1;
  const pad = 2;
  const rect = [[x0 - pad, y0 - pad], [x1 + pad, y0 - pad], [x1 + pad, y1 + pad], [x0 - pad, y1 + pad]];

  /* cut the box by the line through (cx,cy) along (dx,dy): masks, bodies,
     and the wound runs where the line crosses body */
  /* v2.3.2923: along a polyline (cutPath), not a straight line */
  const cutBy = (cx, cy, dx, dy, calm) => {
    const cp = cutPath(cx, cy, dx, dy, W, H, rand, calm);
    const pts = cp.pts, BIG = (W + H) * 3;
    const p0 = pts[0], pN = pts[pts.length - 1];
    /* the normal (nx, ny) points DOWN (dx > 0 for every cut rolled here) */
    const upPoly = pts.concat([[pN[0] - cp.nx * BIG, pN[1] - cp.ny * BIG], [p0[0] - cp.nx * BIG, p0[1] - cp.ny * BIG]]);
    const dnPoly = pts.concat([[pN[0] + cp.nx * BIG, pN[1] + cp.ny * BIG], [p0[0] + cp.nx * BIG, p0[1] + cp.ny * BIG]]);
    const A = clipRect(upPoly, x0 - pad, y0 - pad, x1 + pad, y1 + pad);
    const B = clipRect(dnPoly, x0 - pad, y0 - pad, x1 + pad, y1 + pad);
    let runs = [];
    for (let i = 1; i < pts.length; i++) runs = runs.concat(solidRuns(cov, sx, sy, pts[i - 1], pts[i]));
    return { A, B, runs, pts, style: cp.style };
  };

  let spec = null;
  if (kind === 'slice') {
    const cx = x0 + W * (0.4 + rand() * 0.2);
    const cy = y0 + H * (0.36 + rand() * 0.26);
    const ang = side * (0.12 + rand() * 0.55);         /* v2.3.2923: 7-38 degrees, was 17-37 */
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const k = cutBy(cx, cy, dx, dy, false);
    /* normal (-dy, dx) points DOWN, so A is the top */
    spec = { top: k.A, bot: k.B, runs: k.runs, dx, dy, pts: k.pts, style: k.style };
  } else if (kind === 'decap') {
    const neckY = y0 + H * ((blob ? 0.4 : 0.28) + rand() * 0.05);
    const tilt = (rand() - 0.5) * 0.45;                /* v2.3.2923: was +/-0.125 */
    const dx = Math.cos(tilt), dy = Math.sin(tilt);
    const k = cutBy(x0 + W / 2, neckY, dx, dy, true);  /* a neck is narrow: a calmer path */
    spec = { top: k.A, bot: k.B, runs: k.runs, dx, dy, pts: k.pts, style: k.style };
  } else if (kind === 'leg') {
    /* the leg: the lower third, on one side of the body's own middle */
    const hipY = y0 + H * 0.68;
    const b = bodyOf(cov, sx, sy, [[x0 - pad, hipY], [x1 + pad, hipY], [x1 + pad, y1 + pad], [x0 - pad, y1 + pad]]);
    const mid = b ? b.com[0] : x0 + W / 2;
    /* v2.3.2928: both edges of the leg's cut are jagged too (they were two
       ruler lines); the hip and the inner edge each get their own teeth, and
       the two pieces share them so they still fit */
    const outX = side > 0 ? x1 + pad : x0 - pad;
    const hip = jagLine([mid, hipY], [outX, hipY], H, rand, 0.8);        /* mid -> outer edge */
    const inner = jagLine([mid, hipY], [mid, y1 + pad], H, rand, 0.8);   /* hip -> ground */
    const L = hip.concat([[outX, y1 + pad]], inner.slice().reverse().slice(0, -1));
    const R = side > 0
      ? [[x0 - pad, y0 - pad], [x1 + pad, y0 - pad]].concat(hip.slice().reverse(), inner.slice(1), [[x0 - pad, y1 + pad]])
      : [[x0 - pad, y0 - pad], [x1 + pad, y0 - pad], [x1 + pad, y1 + pad]].concat(inner.slice().reverse(), hip.slice(1));
    let runs = [];
    for (let i = 1; i < hip.length; i++) runs = runs.concat(solidRuns(cov, sx, sy, hip[i - 1], hip[i]));
    spec = { top: R, bot: L, runs, mid, hipY, dx: side, dy: 0 };
  } else {
    return null;
  }
  if (!spec.runs.length) return null;   /* the cut missed the body entirely */

  const topBody = bodyOf(cov, sx, sy, spec.top), botBody = bodyOf(cov, sx, sy, spec.bot);
  if (!topBody || !botBody) return null;   /* nothing on one side to separate */

  const root = new Container();
  root.label = 'monster-death-fx';
  root.position.set(sb.x, sb.y);
  root.scale.set(sb.scale.x, sb.scale.y);
  root.rotation = sb.rotation || 0;
  display.addChild(root);

  const pieces = [];
  let spurt = null;
  if (kind === 'slice') {
    const T = makePiece(root, sb, spec.top, topBody, spec.runs, col);
    const B = makePiece(root, sb, spec.bot, botBody, spec.runs, col);
    const down = spec.dy >= 0 ? 1 : -1;
    /* the top slides DOWN the cut before it clears the lower half */
    T.slide = { dx: spec.dx * down, dy: spec.dy * down, until: 170 + rand() * 90, speed: 0,
      /* v2.3.2923: and then it is THROWN off -- owner: "increase the
         explosiveness of the limb/head fling" */
      popX: spec.dx * down * H * (1.3 + rand() * 1.1), popY: -H * (1.6 + rand() * 1.4) };
    T.spin = down * (6 + rand() * 5);
    if (blob) B.slump = { from: 380, px: botBody.com[0], py: y1 };
    else setHinge(B, -down, 420, Math.PI / 2 * (0.8 + rand() * 0.2));
    pieces.push(B, T);
    const r0 = spec.runs[Math.floor(spec.runs.length / 2)];
    spurt = { piece: B, x: (r0[0][0] + r0[1][0]) / 2, y: (r0[0][1] + r0[1][1]) / 2, up: true, dur: 420 };
  } else if (kind === 'decap') {
    const Hd = makePiece(root, sb, spec.top, topBody, spec.runs, col);
    const Bd = makePiece(root, sb, spec.bot, botBody, spec.runs, col);
    Hd.free = true;
    /* v2.3.2923: harder, and mostly OUTWARD -- was vx 1.1-1.9 H, vy 3.6-4.6 H,
       spin 7-12.  The extra goes sideways and into the spin rather than up: a
       head thrown much higher is still in the air when the corpse fades. */
    Hd.vx = side * H * (2.2 + rand() * 1.5);
    Hd.vy = -H * (4.0 + rand() * 1.2);
    Hd.spin = side * (11 + rand() * 8);
    if (blob) Bd.slump = { from: 200, px: botBody.com[0], py: y1 };
    else setHinge(Bd, -side, 520, Math.PI / 2);
    pieces.push(Bd, Hd);
    spurt = { piece: Bd, x: topBody.com[0], y: pathYAt(spec.pts, topBody.com[0]), up: true, dur: 700 };
  } else {
    const Bd = makePiece(root, sb, spec.top, topBody, spec.runs, col);
    const L = makePiece(root, sb, spec.bot, botBody, spec.runs, col);
    L.free = true;
    /* v2.3.2923: harder -- was vx 0.9-1.5 H, vy 1.2-1.8 H, spin 4-7 */
    L.vx = side * H * (1.7 + rand() * 1.1);
    L.vy = -H * (2.6 + rand() * 1.2);
    L.spin = side * (8 + rand() * 6);
    /* the body lost that support: it goes down on the side the leg left from */
    setHinge(Bd, side, 140, Math.PI / 2);
    pieces.push(Bd, L);
    spurt = { piece: Bd, x: botBody.com[0], y: spec.hipY, up: false, dur: 520 };
  }

  /* ═══ v2.3.2923: THE CUT THROWS WHAT THE MONSTER IS MADE OF ═══
     Owner: "at the cut site add some of the hit material (the stuff that
     comes out during a hit) from the cut side to help hide the simple slice
     effect and to increase the spectacle in general."  The same crisp,
     physical material a hit throws (hitMaterialFx -- goo, snow, bone, ash,
     blood and char), as sword bursts along the cut the moment it happens and
     a second, smaller one from the wound as the pieces part.  Queued here in
     the root's local space; drawMonsterDeath hands them to S._debrisBursts in
     world space (this module never sees S). */
  const matBursts = [];
  {
    const runsN = spec.runs.length;
    const pick = [spec.runs[0], spec.runs[Math.floor(runsN / 2)], spec.runs[runsN - 1]];
    const seen = new Set();
    for (const r of pick) {
      if (!r || seen.has(r)) continue;
      seen.add(r);
      matBursts.push({ at: 0, x: (r[0][0] + r[1][0]) / 2, y: (r[0][1] + r[1][1]) / 2,
        dx: spec.dx || 1, dy: spec.dy || 0, weapon: 'sword', big: true });
    }
    matBursts.push({ at: kind === 'slice' ? 200 : 90, piece: spurt.piece, x: spurt.x, y: spurt.y,
      dx: spec.dx || 1, dy: spec.dy || 0, weapon: 'splash', big: true });
  }

  const fx = new Graphics();
  root.addChild(fx);
  const st = {
    kind, root, pieces, fx, runs: spec.runs, spurt, col, colD, H, W, groundY: y1, rand,
    parts: [], born: now, last: now, sprayAcc: 0, slow: qaSlow(), burst: false,
    matBursts, matKind, style: spec.style || null,
  };
  return st;
}

/* ── one frame ── */
function step(st, now) {
  /* FIXED SUBSTEPS: a phone dropping to 20 fps (or a hitch) must not slow the
     physics down against the clock that times the tipping and the fade, and a
     big step would let a piece pass through the ground.  So the elapsed time
     is spent in <= 1/60 s steps, capped at a quarter second per frame. */
  let left = Math.min(0.25, Math.max(0, (now - st.last) / 1000)) / st.slow;
  st.last = now;
  const tEnd = (now - st.born) / st.slow;
  let tSim = tEnd - left * 1000;
  while (left > 1e-6) {
    const dt = Math.min(1 / 60, left);
    left -= dt;
    tSim += dt * 1000;
    physics(st, tSim, dt);
  }
  draw(st, tEnd);
}

function drop(st, x, y, vx, vy, s, col) {
  if (st.parts.length >= MAX_PARTS) return;
  /* each drop lands at its own depth, so the landed spray is a splat on the
     ground and not a ruled line along the feet */
  const gy = st.groundY + (st.rand() - 0.35) * st.H * 0.16;
  st.parts.push({ x, y, vx, vy, s, col, gy, land: false });
}

function physics(st, t, dt) {
  const H = st.H, g = G * H, gy = st.groundY;

  for (const pc of st.pieces) {
    const c = pc.c;
    if (pc.slide) {
      if (t < pc.slide.until) {
        pc.slide.speed += H * 9 * dt;
        c.position.x += pc.slide.dx * pc.slide.speed * dt;
        c.position.y += pc.slide.dy * pc.slide.speed * dt;
        continue;
      }
      pc.free = true;
      pc.vx = pc.slide.dx * pc.slide.speed * 1.4 + (pc.slide.popX || 0);
      pc.vy = pc.slide.dy * pc.slide.speed + (pc.slide.popY || 0);
      pc.slide = null;
    }
    if (pc.free) {
      if (!pc.rest) {
        pc.vy += g * dt;
        c.position.x += pc.vx * dt;
        c.position.y += pc.vy * dt;
        c.rotation += pc.spin * dt;
      }
      const lo = lowestY(pc);
      if (lo > gy) {
        c.position.y -= (lo - gy);
        if (!pc.rest) {
          if (pc.vy > H * 0.9) {
            pc.vy = -pc.vy * 0.32;
            pc.vx *= 0.6;
            pc.spin *= 0.45;
            puff(st, c.position.x, gy, 3);
          } else {
            pc.vy = 0; pc.rest = true;
          }
        }
      }
      if (pc.rest) {
        /* roll to a stop, and lie down on a face instead of a corner */
        pc.vx *= Math.pow(0.02, dt);
        c.position.x += pc.vx * dt;
        const want = flatTarget(pc);
        c.rotation += (want - c.rotation) * Math.min(1, dt * 14);
        c.position.y -= (lowestY(pc) - gy);
      }
    } else if (pc.hinge) {
      const ht = (t - pc.hdelay) / 1000;
      if (ht > 0) {
        const a = 0.5 * 11 * ht * ht;   /* tipping: slow, then fast */
        if (a < pc.hmax) {
          c.rotation = pc.hdir * a;
        } else {
          if (pc.hAt == null) { pc.hAt = t; puff(st, c.position.x + pc.hdir * H * 0.6, gy, 6); }
          const bt = (t - pc.hAt) / 180;
          const bounce = bt < 1 ? Math.sin(Math.PI * bt) * 0.12 * (pc.hmax / (Math.PI / 2)) : 0;
          c.rotation = pc.hdir * (pc.hmax - bounce);
        }
        /* rolling over the foot, the body's lowest point stays ON the ground
           -- never through it, never floating above it */
        c.position.y -= (lowestY(pc) - gy);
      }
    } else if (pc.slump) {
      const s = Math.max(0, Math.min(1, (t - pc.slump.from) / 260));
      const e = 1 - Math.pow(1 - s, 2);
      c.pivot.set(pc.slump.px, pc.slump.py);
      c.position.set(pc.slump.px, pc.slump.py);
      c.scale.set(1 + 0.25 * e, 1 - 0.45 * e);
    }
  }

  /* at the moment of the cut, a burst along it -- only where it cut body */
  if (!st.burst) {
    st.burst = true;
    /* v2.3.2928: a jagged cut is dozens of short runs, so the count is
       carried across them (it was at least 2 per run -- a jagged cut would
       have sprayed several times the drops of a straight one) */
    let acc = 0;
    for (const [a, b] of st.runs) {
      acc += 26 * Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.max(1, st.W);   /* v2.3.2923: was 16 */
      const n = Math.floor(acc); acc -= n;
      for (let i = 0; i < n; i++) {
        const f = st.rand();
        const ang = -Math.PI / 2 + (st.rand() - 0.5) * 2.0;
        const v = H * (1.2 + st.rand() * 2.6);
        drop(st, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.cos(ang) * v, Math.sin(ang) * v,
          st.rand() < 0.3 ? 3 : 2, st.rand() < 0.65 ? st.col : st.colD);
      }
    }
  }
  /* the wound sprays for a moment, from wherever that piece has got to */
  const sp = st.spurt;
  if (sp && t < sp.dur) {
    st.sprayAcc += dt * 60;
    const c = sp.piece.c;
    const cos = Math.cos(c.rotation), sin = Math.sin(c.rotation);
    const lx = (sp.x - c.pivot.x) * c.scale.x, ly = (sp.y - c.pivot.y) * c.scale.y;
    const wx = c.position.x + cos * lx - sin * ly, wy = c.position.y + sin * lx + cos * ly;
    while (st.sprayAcc >= 1) {
      st.sprayAcc -= 1;
      const r = st.rand;
      const base = (sp.up ? -Math.PI / 2 : Math.PI / 2) + c.rotation;
      const a = base + (r() - 0.5) * 1.2;
      const v = H * (1.6 + r() * 2.4);
      drop(st, wx, wy, Math.cos(a) * v, Math.sin(a) * v, r() < 0.3 ? 3 : 2, r() < 0.7 ? st.col : st.colD);
    }
  }

  for (const p of st.parts) {
    if (p.land) continue;
    p.vy += g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.vy > 0 && p.y >= p.gy) { p.y = p.gy; p.land = true; }
  }
}

function draw(st, t) {
  /* the slash flash (along the body it cut, a little past it), then the
     drops -- a landed drop stays as a flat splat */
  const fx = st.fx;
  fx.clear();
  if (t < 150 && st.kind !== 'leg' && st.runs.length) {
    /* v2.3.2923: along the cut as it really runs (a polyline now), trailing
       a little past the body at both ends */
    const k = 1 - t / 150;
    /* v2.3.2928: the overshoot runs along the cut's CHORD -- the first and
       last runs are single teeth now and would point it anywhere */
    const R = st.runs, a = R[0][0], b = R[R.length - 1][1];
    const lc = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / lc, uy = (b[1] - a[1]) / lc;
    const ext = st.W * 0.18;
    fx.moveTo(a[0] - ux * ext, a[1] - uy * ext);
    for (const r of R) fx.lineTo(r[0][0], r[0][1]).lineTo(r[1][0], r[1][1]);
    fx.lineTo(b[0] + ux * ext, b[1] + uy * ext);
    fx.stroke({ color: 0xffffff, width: 2 + 4 * k, alpha: 0.9 * k, join: 'round', cap: 'round' });
  }
  for (const p of st.parts) {
    fx.rect(p.x - p.s / 2, p.y - p.s / 2, p.land ? p.s * 1.6 : p.s, p.land ? p.s * 0.7 : p.s)
      .fill({ color: p.col, alpha: 1 });
  }
  st.root.alpha = t < FADE_FROM_MS ? 1 : Math.max(0, 1 - (t - FADE_FROM_MS) / (DUR_MS - FADE_FROM_MS));
}

function puff(st, x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (st.rand() - 0.5) * 2.2;
    const v = st.H * (0.4 + st.rand() * 0.7);
    drop(st, x, y - 1, Math.cos(a) * v, Math.sin(a) * v, 2, st.colD);
  }
}

/**
 * Called by entityRenderer for a DEAD monster, every frame, BEFORE its
 * normal death branches.  `deathKey` is the death stamp (it changes on every
 * new life), `blob` is true for anything on the slime sheets.
 * Returns DEATH_NONE (draw the normal death), DEATH_LIVE or DEATH_DONE.
 */
export function drawMonsterDeath(m, display, deathKey, blob, now, S) {   /* v2.3.2923: + S, for the cut's material bursts */
  if (!display || deathKey == null) return DEATH_NONE;
  let st = display._deathFx;
  if (st && st.key !== deathKey) { disposeFx(display); st = null; }
  if (!st) {
    /* decided ONCE per death, on the first dead frame -- while the body
       sprite still shows the pose it died in.  A cut that cannot be made
       (no art yet, the cut misses the body) is the normal death. */
    const kind = rollDeathKind(m, blob);
    let built = null;
    if (kind !== 'normal' && display._spriteBody && display._spriteBody.visible !== false) {
      try { built = build(kind, display, m, blob, now); } catch (e) { built = null; }
    }
    st = display._deathFx = built ? Object.assign(built, { key: deathKey }) : { key: deathKey, kind: 'normal', none: true };
  }
  if (st.none) return DEATH_NONE;
  if ((now - st.born) / st.slow >= DUR_MS) {
    st.root.visible = false;
    return DEATH_DONE;
  }
  step(st, now);
  if (S && st.matBursts && st.matBursts.length) { try { flushMatBursts(st, m, display, S, now); } catch (e) { st.matBursts.length = 0; } }
  return DEATH_LIVE;
}

/* v2.3.2923: root-local point -> world (the display sits at the monster's
   world x/y; the root copies the body sprite's transform) */
function toWorld(st, display, x, y) {
  const r = st.root;
  const cos = Math.cos(r.rotation || 0), sin = Math.sin(r.rotation || 0);
  const lx = x * r.scale.x, ly = y * r.scale.y;
  const dx = r.position.x + cos * lx - sin * ly, dy = r.position.y + sin * lx + cos * ly;
  return [display.x + dx * display.scale.x, display.y + dy * display.scale.y];
}

function flushMatBursts(st, m, display, S, now) {
  const t = (now - st.born) / st.slow;
  if (!S._debrisBursts) S._debrisBursts = [];
  const gy = toWorld(st, display, 0, st.groundY)[1];
  const keep = [];
  for (let i = 0; i < st.matBursts.length; i++) {
    const b = st.matBursts[i];
    if (t < b.at) { keep.push(b); continue; }
    if (S._debrisBursts.length >= 24) continue;
    let x = b.x, y = b.y;
    if (b.piece) {
      /* from wherever that piece has got to */
      const c = b.piece.c;
      const cos = Math.cos(c.rotation), sin = Math.sin(c.rotation);
      const lx = (b.x - c.pivot.x) * c.scale.x, ly = (b.y - c.pivot.y) * c.scale.y;
      x = c.position.x + cos * lx - sin * ly; y = c.position.y + sin * lx + cos * ly;
    }
    const w = toWorld(st, display, x, y);
    /* the root's mirror (a monster facing left) turns the cut's direction too */
    const mir = st.root.scale.x < 0 ? -1 : 1;
    const ang = Math.atan2(b.dy, b.dx * mir) + (i % 2 ? Math.PI : 0);
    S._debrisBursts.push({
      /* a key of its own per burst, so the renderer's per-monster 150 ms gap
         (which the killing hit has just used) does not swallow it */
      monsterId: `${m.id}:cut:${i}:${st.born}`, kind: st.matKind,
      tint: hitFxTintOf(display._variantKey || (m && (m.arch || m.type))),
      x: w[0], y: w[1], gy, h: Math.max(8, gy - w[1]),
      ang, t0: now, weapon: b.weapon, crit: true, big: !!b.big, heavy: false, elem: null,
      hitX: w[0], hitY: w[1],
    });
  }
  st.matBursts = keep;
}

function disposeFx(display) {
  const st = display._deathFx;
  display._deathFx = null;
  if (st && st.root && !st.root.destroyed) {
    try { st.root.destroy({ children: true }); } catch (e) { /* gone with the display */ }
  }
}

/** A live monster must never carry a corpse's pieces (a respawn on the same
 *  display, before the stamp changes). */
export function clearMonsterDeath(display) {
  if (display && display._deathFx) disposeFx(display);
}

/** QA probe: what one display's death is doing. */
export function monsterDeathState(display) {
  const st = display && display._deathFx;
  if (!st) return null;
  if (st.none) return { kind: st.kind, pieces: 0 };
  const gy = st.groundY;
  return {
    kind: st.kind,
    pieces: st.pieces.length,
    parts: st.parts.length,
    alpha: +st.root.alpha.toFixed(2),
    rest: st.pieces.map((p) => !!(p.rest || p.hAt != null || p.slump)),
    rot: st.pieces.map((p) => +p.c.rotation.toFixed(2)),
    /* how far each piece's lowest point is off the ground, in body heights:
       0 = standing or lying on it, negative = floating above it */
    ground: st.pieces.map((p) => +((lowestY(p) - gy) / st.H).toFixed(3)),
  };
}
