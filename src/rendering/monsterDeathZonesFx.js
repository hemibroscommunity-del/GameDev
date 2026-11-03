/* ═══ v2.3.3954: A MONSTER DIES IN PIECES THAT FIT IT ═══
 *
 * The owner: "Make actual monster death animations", and "Death animation
 * idea label zones for each monster that can apply physics and effects for."
 *
 * The cut deaths (monsterDeathFx.js) cut every body on the same guessed
 * lines.  This plays a look's OWN death, from the parts labelled for it in
 * src/data/monsterDeathZones.js: each zone a piece of the frame the monster
 * died on, with its own material, weight, bounce and roll, coming off its own
 * way (flying, popping, crumbling, sagging, tipping over, or staying put).
 * docs/specs/monster-death-zones.md has the whole of it.
 *
 * THE BEAT, THEN THE PIECES.  Every death opens on BEAT_MS (~120 ms) of the
 * blow landing: the whole body squashed (wider, shorter, about its feet) and
 * flashed white -- its own picture drawn over it once more, added (a sprite
 * of its own, never a tint: a tint only darkens, TRAPS §252, and the pieces
 * keep the monster's own colour, the owner's v2.3.3499 "Don't turn enemies
 * red").  Then the zones part, each throwing what it is made of.
 *
 * THE PIECES ARE THE PICTURE, NO NEW ART AND NO NEW MEMORY.  A rectangle zone
 * is a sub-frame Texture of the very picture the monster was drawn from (the
 * same source: no mask, so it batches with everything else); a polygon zone
 * (a rock's break, a slime's tear) is a Sprite of the whole frame masked by
 * a Graphics (the stencil, TRAPS §221) as the cut deaths' pieces are.  So
 * nothing loads (the look's own frames are loaded with the look, which is
 * the only way the monster was drawn at all: wheelMonsterArt.js), and nothing
 * reads a pixel on the CPU (coverage() renders the frame and reads that back,
 * as the cuts do -- never a colour-numbered source's `resource`, TRAPS §165).
 * A rectangle piece takes a texel more of its neighbour along each inside
 * edge (TRAPS §114), so no hairline opens between them in the beat.
 *
 * EVERYTHING IT MAKES IS LET GO WHEN IT ENDS (the memory law): the pieces,
 * their masks and their Graphics with the root, then each sub-frame Texture
 * (the texture only, never its source: that is the look's).  A death whose
 * monster went before it finished (its display destroyed) is found and let
 * go by the next one (prune()).
 *
 * CAPS: at most MAX_LIVE of these at once and MAX_PIECES pieces each; past
 * that, monsterDeathFx plays today's simpler death.
 *
 * EVERY CLIENT SEES THE SAME DEATH: every speed, side and spin comes from a
 * PRNG seeded on the monster's id and where it died (as the cuts' roll).
 *
 * v2.3.3954, THE BLOW (the owner: "premade sections like head, eyes, arms,
 * torso, legs, etc. that can separate and simulate physics based on the
 * direction they're hit in").  `ctx.blow` is the killing blow's direction
 * (game/deathBlow.js: from the killer toward the monster), and every piece
 * is pushed along it on top of its seeded throw -- a light one (an eye, an
 * arm, a hat, a chip) the farther, a heavy one barely -- across the screen
 * AND along the ground (a piece thrown away from the camera lands higher on
 * the screen: its own ground line, `gz`); a sagging body leans and a
 * toppling one falls that way.  The push adds to the seeded numbers and
 * draws none of its own, so a phone that does not know who struck (a player
 * off its screen) plays the same death with the seeded direction only.
 * `ctx.big`: the explosion -- each zone's `big` way off (monsterDeathZones
 * bigOff), thrown harder, twice the spray, a burst of what the look is made
 * of thrown along the blow (`bigFx`: snow, smoke, dust, bone, splash,
 * leaves) and a harder beat; an ordinary kill is the gentler collapse.
 *
 * `?deathzones=0` turns it off for one phone (the cuts and the normal deaths
 * play exactly as before).
 *
 * The cut deaths' own tools (coverage, bodyOf, setHinge, ...) are handed in
 * as `K` by monsterDeathFx, so this file imports nothing of it (no cycle).
 */
import { Container, Sprite, Graphics, Texture, Rectangle } from 'pixi.js';
import { BEAT_MS, MAX_LIVE, MAX_PIECES, zoneOff } from '@/data/monsterDeathZones.js';

const _off = (() => {
  try { return typeof location !== 'undefined' && /[?&]deathzones=0(?:&|$)/.test(location.search || ''); } catch (e) { return false; }
})();
/** Zone deaths on (the default; `?deathzones=0` is today's deaths only). */
export function deathZonesOn() { return !_off; }

/* what a material throws (hitMaterialFx's kinds) and its drops' colours;
   goo and flesh are the look's own (`ctx`) */
const MAT_FX = { snow: 'snow', goo: 'goo', bone: 'bone', stone: 'stone', wood: 'wood', cloth: 'ash', flame: 'ember' };
const MAT_COL = {
  snow: [0xeef6ff, 0xa3bfe2], bone: [0xe6ddc8, 0xb39e78], stone: [0x8a8a8a, 0x5b5b5b],
  wood: [0x6b4a2b, 0x3f2a17], cloth: [0xd8cdb4, 0x8f8778], flame: [0xffb02e, 0xea580c],
};
/* a burst kind's material (a look's bigFx tinted as its material) */
const FX_MAT = { snow: 'snow', bone: 'bone', stone: 'stone', wood: 'wood', leaf: 'wood', ash: 'cloth', ember: 'flame' };
/* the burst's tint, where the material is not the look's own */
const MAT_TINT = { snow: 0xe8f4ff, bone: 0xe6ddc8, stone: 0x8a8a8a, wood: 0x6b4a2b, cloth: 0xd8cdb4, flame: 0xea580c };

const OVERLAP = 1;         /* texels a rectangle piece takes of each inside neighbour (TRAPS §114) */
const SLUMP_MS = 300, SINK_MS = 1000, GUTTER_MS = 460, FLOP_MS = 240;
const VY_MAX = 4.2;        /* the fastest up, in body heights a second (~0.6 s in the air) */
/* v2.3.3954: the blow's push, in body heights a second (x the piece's
   lightness, at most REACH_MAX), across and along the ground; a crumbling
   piece takes half */
const PUSH_X = { big: 1.2, calm: 0.6 }, PUSH_Z = { big: 0.8, calm: 0.45 };
const REACH_MAX = 1.4;
const GZ_MAX = 1.2;        /* how far along the ground a piece may go, in body heights */
/* the explosion throws harder, the collapse gentler (x the seeded speeds) */
const SPEED = { big: { x: 1.3, y: 1.1 }, calm: { x: 0.85, y: 0.9 } };
const BOUNCES = 2;         /* then it lies down, whatever it is made of */

/* ── the live ones, for the cap and for letting go ── */
const _live = new Set();
let _made = 0, _freed = 0;
function prune(now, K) {
  for (const st of _live) {
    const old = now != null && K && (now - st.born) > K.DUR_MS * st.slow + 2000;
    if (!st.root || st.root.destroyed || old) freeZoneDeath(st);
  }
}
/** How many zone deaths are playing (the cap's count). */
export function zoneDeathsLive(now, K) { prune(now, K); return _live.size; }
/** QA: made and let go, ever (a leak shows as made - freed growing). */
export function zoneDeathStats() { return { live: _live.size, made: _made, freed: _freed, on: deathZonesOn() }; }

/** Let one death go: its root (pieces, masks, Graphics) and every sub-frame
 *  Texture it made -- the texture only, never the look's own source. */
export function freeZoneDeath(st) {
  if (!st || st.freed) return;
  st.freed = true;
  _live.delete(st);
  _freed++;
  if (st.root && !st.root.destroyed) {
    try { st.root.destroy({ children: true }); } catch (e) { /* gone with its display */ }
  }
  for (const t of st.subTex || []) {
    try { if (!t.destroyed) t.destroy(false); } catch (e) { /* already gone */ }
  }
  if (st.subTex) st.subTex.length = 0;
}

/* A rectangle of the sprite's local space as a Sprite of a sub-frame of the
   same picture, at the same place: null for a picture this cannot cut
   (rotated in its atlas), { empty } where the rectangle holds none of it. */
function rectSprite(tex, sb, lx0, ly0, lx1, ly1) {
  if (tex.rotate) return null;
  const F = tex.frame, O = tex.orig || F, T = tex.trim || null;
  if (!F || !(F.width > 0) || !(F.height > 0)) return null;
  const tx = T ? T.x : 0, ty = T ? T.y : 0;
  const ax = sb.anchor.x * O.width, ay = sb.anchor.y * O.height;
  /* local -> the frame's own texels (orig = local + anchor; frame = orig - trim) */
  const a = Math.max(0, Math.floor(lx0 + ax - tx)), b = Math.max(0, Math.floor(ly0 + ay - ty));
  const c = Math.min(F.width, Math.ceil(lx1 + ax - tx)), d = Math.min(F.height, Math.ceil(ly1 + ay - ty));
  if (c - a < 1 || d - b < 1) return { empty: true };
  const t = new Texture({ source: tex.source, frame: new Rectangle(F.x + a, F.y + b, c - a, d - b) });
  const s = new Sprite(t);
  s.anchor.set(0, 0);
  s.position.set(a + tx - ax, b + ty - ay);
  return { spr: s, tex: t, h: d - b };
}

/* A polygon of the sprite's local space as the whole frame under a mask. */
function maskSprite(sb, poly, holes) {
  const s = new Sprite(sb.texture);
  s.anchor.set(sb.anchor.x, sb.anchor.y);
  const mg = new Graphics();
  mg.poly(poly.flat()).fill({ color: 0xffffff });
  /* v2.3.3954: its holes (each wholly inside it: the table's check), one
     path cut once */
  if (holes && holes.length) { for (const h of holes) mg.poly(h.flat()); mg.cut(); }
  s.mask = mg;
  return { spr: s, mask: mg };
}

/**
 * Build a look's own death on `display` (the dying monster's), or null when
 * it cannot be made here (the cap, no art, nothing measured) -- monsterDeathFx
 * then plays today's.  `ctx`: { key, view, look, zones, col, colD, matKind,
 * tint, bloody }.
 */
export function buildZoneDeath(K, display, m, now, ctx) {
  prune(now, K);
  if (_live.size >= MAX_LIVE) return null;
  const sb = display._spriteBody;
  const tex = sb && sb.texture;
  if (!tex || !tex.source || !ctx || !ctx.zones || !ctx.zones.length) return null;
  const cov = K.coverage(tex);
  if (!cov) return null;
  const ow = (tex.orig && tex.orig.width) || tex.width, oh = (tex.orig && tex.orig.height) || tex.height;
  const sx = sb.anchor.x * ow, sy = sb.anchor.y * oh;
  const x0 = cov.x0 - sx, x1 = cov.x1 - sx, y0 = cov.y0 - sy, y1 = cov.y1 - sy;
  const W = x1 - x0, H = y1 - y0;
  if (W < 4 || H < 4) return null;
  /* box fractions -> local; an edge at 0 or 1 reaches the frame's own edge */
  const fL = Math.min(-sx, x0 - 2), fR = Math.max(ow - sx, x1 + 2), fT = Math.min(-sy, y0 - 2), fB = Math.max(oh - sy, y1 + 2);
  const X = (v) => (v <= 0 ? fL : v >= 1 ? fR : x0 + v * W);
  const Y = (v) => (v <= 0 ? fT : v >= 1 ? fB : y0 + v * H);
  const rand = K.rng(K.hash32(`${m.id}|${Math.round(m.x)}|${Math.round(m.y)}|z`));
  /* v2.3.3954: the blow, in the picture's own space (the root mirrors a
     monster facing left, so a world direction is mirrored into it) */
  const big = !!ctx.big;
  const blow = ctx.blow && ctx.blow.known ? ctx.blow : null;

  const whole = K.bodyOf(cov, sx, sy, [[fL, fT], [fR, fT], [fR, fB], [fL, fB]]);
  const cx = whole ? whole.com[0] : x0 + W / 2;
  const gy = y1;
  /* the body's feet: the outermost of its lowest points each side (as
     setHinge finds a piece's) -- what a crumpling body leans over */
  const footAt = (side) => {
    if (!whole) return side > 0 ? x1 : x0;
    let lo = -Infinity, fx = null;
    for (const p of whole.hull) if (p[1] > lo) lo = p[1];
    for (const p of whole.hull) {
      if (p[1] < lo - Math.max(3, H * 0.04)) continue;
      if (fx == null || (side > 0 ? p[0] > fx : p[0] < fx)) fx = p[0];
    }
    return fx;
  };

  const root = K.deathRoot(display, sb);
  const mir = (root.scale.x < 0 ? -1 : 1) * ((display.scale && display.scale.x < 0) ? -1 : 1);
  const bx = blow ? blow.dx * mir : 0, bz = blow ? blow.dy : 0;
  /* the blow's side, where it has one worth leaning to */
  const bSide = blow && Math.abs(bx) > 0.15 ? (bx > 0 ? 1 : -1) : 0;
  const SP = big ? SPEED.big : SPEED.calm;
  const under = new Graphics();      /* a puddle, under everything */
  const body = new Container();      /* the pieces: squashed as one in the beat */
  body.pivot.set(cx, gy); body.position.set(cx, gy);
  const fx = new Graphics();         /* the drops */
  root.addChild(under);
  root.addChild(body);
  root.addChild(fx);

  const tint = sb._btBaseTint != null ? sb._btBaseTint : sb.tint;
  const subTex = [];
  const pieces = [];
  const leanSide0 = rand() < 0.5 ? -1 : 1;
  const leanSide = bSide || leanSide0;   /* v2.3.3954: a crumpling body goes over the way it was hit */
  let clip = null;                   /* a sinking piece's ground (one Graphics, the stencil) */
  const zones = ctx.zones.slice(0, MAX_PIECES);
  for (const z of zones) {
    const b = z.rect || null;
    const poly = b
      ? [[X(b[0]), Y(b[1])], [X(b[2]), Y(b[1])], [X(b[2]), Y(b[3])], [X(b[0]), Y(b[3])]]
      : z.poly.map((p) => [X(p[0]), Y(p[1])]);
    let bd = K.bodyOf(cov, sx, sy, poly);
    let off = zoneOff(z, big);   /* v2.3.3954: the explosion's way off, or the collapse's */
    if (!bd) {
      /* a zone with (almost) none of the body in it this frame: kept where
         it is, so whatever faint pixels it holds do not vanish */
      let mx = 0, my = 0;
      for (const p of poly) { mx += p[0]; my += p[1]; }
      bd = { com: [mx / poly.length, my / poly.length], hull: poly.map((p) => [p[0], p[1]]), n: 0 };
      off = 'stays';
    }
    let made = null;
    /* v2.3.3954: a zone with holes cut in it (the eyes in a head) is the
       frame under a mask: the holes are the mask's (a Graphics, TRAPS §221) */
    const holes = (z.cutZones || []).map((cz) => (cz.rect
      ? [[X(cz.rect[0]), Y(cz.rect[1])], [X(cz.rect[2]), Y(cz.rect[1])], [X(cz.rect[2]), Y(cz.rect[3])], [X(cz.rect[0]), Y(cz.rect[3])]]
      : cz.poly.map((p) => [X(p[0]), Y(p[1])])));
    if (b && !holes.length) {
      /* + a texel into each inside neighbour (an outside edge is the frame's) */
      const ex0 = b[0] > 0 ? OVERLAP : 0, ey0 = b[1] > 0 ? OVERLAP : 0, ex1 = b[2] < 1 ? OVERLAP : 0, ey1 = b[3] < 1 ? OVERLAP : 0;
      made = rectSprite(tex, sb, poly[0][0] - ex0, poly[0][1] - ey0, poly[2][0] + ex1, poly[2][1] + ey1);
      if (made && made.empty) continue;
    }
    let mask = null;
    if (!made) { made = maskSprite(sb, poly, holes); mask = made.mask; }
    else subTex.push(made.tex);
    const spr = made.spr;
    spr.tint = tint;
    const c = new Container();
    c.addChild(spr);
    if (mask) c.addChild(mask);
    c.pivot.set(bd.com[0], bd.com[1]);
    c.position.set(bd.com[0], bd.com[1]);
    body.addChild(c);
    const pc = {
      c, spr, hull: bd.hull, com: bd.com, z, off, sub: !mask,
      sprY: spr.y, sprH: made.h || 0,
      free: false, vx: 0, vy: 0, spin: 0, rest: false, delay: z.delay || 0,
      hinge: null, hdir: 0, hdelay: 0, hmax: Math.PI / 2, hAt: null, flop: 0, flopK: -1,
      slump: null, gutter: z.mat === 'flame', sinks: false,
      gz: 0, vz: 0, eye: z.part === 'eyes',   /* v2.3.3954: its own ground line, thrown along the ground */
    };
    /* how it comes off -- every number from the death's seeded roll */
    const mk = Math.sqrt(Math.max(0.2, z.mass || 1));
    /* up is weighed more gently than across, and capped: everything must be
       down and still before the fade (FADE_FROM_MS) -- a hat thrown up at a
       light piece's full speed was still in the air when the corpse faded */
    const mv = Math.pow(Math.max(0.2, z.mass || 1), 0.25);
    const upCap = (v) => Math.max(-H * VY_MAX, v);
    const push = z.push != null ? z.push : 1, lift = z.lift != null ? z.lift : 1;
    const away = bd.com[0] < cx ? -1 : 1;
    if (off === 'fly' || off === 'pop' || off === 'crumble') {
      pc.free = true;
      if (off === 'fly') {
        const dir = z.dir || away;
        pc.vx = dir * H * (1.4 + rand() * 1.0) * push / mk * SP.x;
        pc.vy = upCap(-H * (2.2 + rand() * 1.0) * lift / mv * SP.y);
        pc.spin = dir * (6 + rand() * 6) / mk;
      } else if (off === 'pop') {
        const dir = z.dir || (rand() < 0.5 ? -1 : 1);
        pc.vx = dir * H * (0.5 + rand() * 0.7) * push / mk * SP.x;
        pc.vy = upCap(-H * (3.4 + rand() * 0.9) * lift / mv * SP.y);
        pc.spin = dir * (5 + rand() * 5) / mk;
      } else {
        const dir = z.dir || away;
        pc.vx = dir * H * (0.25 + rand() * 0.45) * push / mk;
        pc.vy = upCap(-H * (0.2 + rand() * 0.6) * lift / mv);
        pc.spin = dir * (1.5 + rand() * 2.5) / mk;
      }
      /* v2.3.3954: the blow's push, on top of the seeded throw: a light
         piece the farther (an eye, a hat, an arm), a heavy stone barely,
         across the screen and along the ground; it spins the way it goes */
      if (blow) {
        /* a piece the seeded throw sends back toward the killer goes only a
           little that way: the blow carries the whole body off it */
        if (pc.vx * bx < 0) pc.vx *= 1 - 0.7 * Math.min(1, Math.abs(bx));
        const reach = Math.min(REACH_MAX, 1 / mk) * (off === 'crumble' ? 0.5 : 1);
        pc.vx += bx * H * (big ? PUSH_X.big : PUSH_X.calm) * reach;
        pc.vz = bz * H * (big ? PUSH_Z.big : PUSH_Z.calm) * reach;
        if (off === 'fly' && pc.vx * pc.spin < 0) pc.spin = -pc.spin;
      }
    } else if (off === 'slump') {
      /* every slump piece of a death about ONE point, so they sag as one: under
         the body's middle -- or, for one that leans as it crumples, its foot on
         the side it leans to (turning about the middle would sink the other
         foot through the ground; about the box's corner, which is an arm or
         an ear as often as a foot, lifted the whole body off it) */
      const lean = (z.lean || 0) * leanSide;
      const px = lean !== 0 ? footAt(lean > 0 ? 1 : -1) : cx;
      pc.slump = { px, py: gy, squash: z.squash != null ? z.squash : 0.45, lean, sink: z.sink || 0 };
      if (pc.slump.sink > 0) {
        if (!clip) {
          clip = new Graphics();
          clip.rect(fL - W * 2, fT - H * 3, (fR - fL) + W * 4, (gy + 1) - (fT - H * 3)).fill({ color: 0xffffff });
          root.addChild(clip);
        }
        c.mask = clip;
        pc.sinks = true;
      }
    } else if (off === 'hinge') {
      /* v2.3.3954: a heavy body topples the way it was hit */
      K.setHinge(pc, bSide || z.dir || leanSide, 0, Math.PI / 2 * (0.85 + rand() * 0.15));
      pc.flop = z.flop || 0;
    } else {
      pc.rest = true;   /* stays */
    }
    pieces.push(pc);
  }
  if (!pieces.length) { try { root.destroy({ children: true }); } catch (e) { /* gone */ } for (const t of subTex) t.destroy(false); return null; }

  /* the flash: the frame once more, added over the pieces, for the beat */
  const flash = new Sprite(sb.texture);
  flash.anchor.set(sb.anchor.x, sb.anchor.y);
  flash.blendMode = 'add';
  flash.alpha = 0;
  body.addChild(flash);

  /* what it throws: one burst for each thing it is made of (heaviest piece
     of each, at most three), the moment the pieces part */
  const matBursts = [];
  const seen = new Set();
  const movers = pieces.filter((p) => p.off !== 'stays').sort((a, b) => (b.z.mass || 1) - (a.z.mass || 1));
  /* v2.3.3954: along the blow where it is known (the burst keeps that way),
     else out from the body's middle as before */
  const bdx = (p) => (blow ? bx : (p.com[0] < cx ? -1 : 1)), bdy = blow ? bz : -0.3;
  for (const p of movers) {
    const kind = p.z.fx || matFx(p.z.mat, ctx);
    if (seen.has(kind) || matBursts.length >= 3) continue;
    seen.add(kind);
    matBursts.push({ at: BEAT_MS, piece: p, x: p.com[0], y: p.com[1], dx: bdx(p), dy: bdy, blow: !!blow,
      weapon: 'splash', big: true, kind, tint: matTint(p.z.mat, ctx, kind) });
  }
  /* v2.3.3954: the explosion throws what the look is made of, a blast from
     its middle (bigFx: a snowman's snow, a goblin's smoke, a rock's dust and
     pebbles, a skeleton's bone, a fishman's splash, a shambler's leaves) */
  if (big) {
    for (const kind of (ctx.look && ctx.look.bigFx) || []) {
      if (matBursts.length >= 5) break;
      const tint = (kind === 'goo' || kind === ctx.matKind) ? ctx.tint : (MAT_TINT[FX_MAT[kind]] != null ? MAT_TINT[FX_MAT[kind]] : ctx.tint);
      matBursts.push({ at: BEAT_MS, piece: null, x: cx, y: gy - H * 0.45, dx: blow ? bx : 0, dy: blow ? bz : -1, blow: true,
        weapon: 'bolt', big: true, kind, tint });
    }
  }

  const main = (movers[0] || pieces[0]).z.mat;
  const [col, colD] = matCols(main, ctx);
  const st = {
    own: true, kind: 'own', root, body, under, fx, flash, clip, pieces, subTex, look: ctx.key, view: ctx.view,
    big, blow: blow ? { dx: +blow.dx.toFixed(3), dy: +blow.dy.toFixed(3) } : null, mir, bSide,   /* v2.3.3954 */
    puddle: !!(ctx.look && ctx.look.puddle), cx, H, W, groundY: gy, rand, col, colD, ctx,
    runs: [], spurt: null, parts: [], born: now, last: now, sprayAcc: 0, slow: K.qaSlow(), burst: true,
    parted: false, matBursts, matKind: ctx.matKind, style: null, freed: false,
  };
  st.dispose = () => freeZoneDeath(st);
  _live.add(st);
  _made++;
  return st;
}

function matFx(mat, ctx) {
  if (mat === 'goo') return 'goo';
  if (mat === 'flesh') return ctx.bloody ? 'goblin' : (ctx.matKind || 'goo');
  return MAT_FX[mat] || ctx.matKind || 'goo';
}
function matCols(mat, ctx) {
  if (mat === 'goo' || mat === 'flesh' || !MAT_COL[mat]) return [ctx.col, ctx.colD];
  return MAT_COL[mat];
}
function matTint(mat, ctx, kind) {
  if (mat === 'goo' || mat === 'flesh' || kind === ctx.matKind) return ctx.tint;
  return MAT_TINT[mat] != null ? MAT_TINT[mat] : ctx.tint;
}

/* ── one frame ── */
export function stepZoneDeath(K, st, now) {
  /* the cuts' FIXED SUBSTEPS (monsterDeathFx step): <= 1/60 s, at most a
     quarter second a frame */
  /* (the cap on the SIMULATED time: under QA's slow motion a slow test
     machine's frames would otherwise each lose most of theirs, and the
     pieces would still be in the air at the fade) */
  let left = Math.min(0.25, Math.max(0, (now - st.last) / 1000) / st.slow);
  st.last = now;
  const tEnd = (now - st.born) / st.slow;
  st.tNow = tEnd;   /* v2.3.3954: the probe's clock (the death's own, TRAPS §200) */
  let tSim = tEnd - left * 1000;
  while (left > 1e-6) {
    const dt = Math.min(1 / 60, left);
    left -= dt;
    tSim += dt * 1000;
    physics(K, st, tSim, dt);
  }
  draw(K, st, tEnd);
}

/* v2.3.3954: a puff of dust where a piece lands on its own ground line (the
   cuts' puff, its drops moved down to that line) */
function puffAt(K, st, x, gz, n) {
  const i0 = st.parts.length;
  K.puff(st, x, st.groundY + gz, n);
  for (let i = i0; i < st.parts.length; i++) st.parts[i].gy += gz;
}

function spray(K, st, pc, n) {
  const [col, colD] = matCols(pc.z.mat, st.ctx);
  const r = st.rand;
  /* v2.3.3954: the way the blow went, where it is known */
  const away = st.bSide || (pc.com[0] < st.cx ? -1 : 1);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + away * (0.2 + r() * 0.9) + (r() - 0.5) * 0.6;
    const v = st.H * (1.0 + r() * 2.2);
    K.drop(st, pc.c.position.x + (r() - 0.5) * st.W * 0.2, pc.c.position.y, Math.cos(a) * v, Math.sin(a) * v, r() < 0.3 ? 3 : 2, r() < 0.65 ? col : colD);
  }
}

function physics(K, st, t, dt) {
  const H = st.H, gy = st.groundY;
  if (t < BEAT_MS) return;
  const tp = t - BEAT_MS;   /* time since the pieces parted */
  if (!st.parted) {
    st.parted = true;
    for (const pc of st.pieces) if (pc.off !== 'stays') spray(K, st, pc, (pc.off === 'slump' || pc.off === 'hinge' ? 5 : 3) * (st.big ? 2 : 1));
    /* v2.3.3954: the explosion's ring of its material at its feet */
    if (st.big) K.puff(st, st.cx, gy, 8);
  }
  const g = K.G * H;
  for (const pc of st.pieces) {
    const c = pc.c;
    if (pc.gutter) {
      /* a flame gutters out: it shrinks into its base, flickers and goes,
         throwing a spark or two */
      const k = Math.min(1, tp / GUTTER_MS);
      pc.spr.alpha = Math.max(0, (1 - k) * (0.75 + 0.25 * Math.sin(t * 0.07)));
      if (pc.sub) { pc.spr.scale.y = 1 - 0.6 * k; pc.spr.y = pc.sprY + pc.sprH * 0.6 * k; }
      if (k < 1 && st.rand() < dt * 10) {
        const r = st.rand;
        K.drop(st, pc.c.position.x + (r() - 0.5) * st.W * 0.3, pc.c.position.y, (r() - 0.5) * H, -H * (1.4 + r() * 1.2), 2, r() < 0.5 ? 0xffb02e : 0xea580c);
      }
    }
    if (pc.free) {
      if (tp < pc.delay) continue;
      /* v2.3.3954: thrown along the ground too (the blow's depth), so its
         own ground line moves with it */
      if (!pc.rest) {
        pc.vy += g * dt;
        c.position.x += pc.vx * dt;
        c.position.y += (pc.vy + pc.vz) * dt;
        pc.gz += pc.vz * dt;
        c.rotation += pc.spin * dt;
      }
      const lo = K.lowestY(pc);
      if (lo > gy + pc.gz) {
        c.position.y -= (lo - gy - pc.gz);
        if (!pc.rest) {
          const bounce = pc.z.bounce || 0;
          if (pc.vy > H * 0.9 && bounce > 0.02 && (pc.bounces = (pc.bounces || 0) + 1) <= BOUNCES) {
            pc.vy = -pc.vy * bounce;
            pc.vx *= 0.7;
            pc.vz *= 0.7;
            pc.spin *= 0.5;
            puffAt(K, st, c.position.x, pc.gz, 2);
          } else {
            pc.vy = 0; pc.rest = true;
            puffAt(K, st, c.position.x, pc.gz, 3);
          }
        }
      }
      if (pc.rest) {
        /* a round thing rolls on (a snowman's head), the rest stops and
           lies down on a face */
        const roll = pc.z.roll || 0;
        const fr = Math.pow(0.02 + 0.55 * roll, dt);
        pc.vx *= fr;
        pc.vz *= fr;
        c.position.x += pc.vx * dt;
        pc.gz += pc.vz * dt;
        c.position.y += pc.vz * dt;
        if (roll >= 0.4 && Math.abs(pc.vx) > H * 0.12) {
          let lo2 = Infinity, hi2 = -Infinity;
          for (const p of pc.hull) { if (p[0] < lo2) lo2 = p[0]; if (p[0] > hi2) hi2 = p[0]; }
          c.rotation += pc.vx / Math.max(2, (hi2 - lo2) / 2) * dt;
        } else {
          const want = K.flatTarget(pc);
          c.rotation += (want - c.rotation) * Math.min(1, dt * 14);
        }
        c.position.y -= (K.lowestY(pc) - gy - pc.gz);
      }
      if (Math.abs(pc.gz) > H * GZ_MAX) {
        /* not off into the distance: it stops at the edge of the splash */
        const lim = Math.sign(pc.gz) * H * GZ_MAX;
        c.position.y -= (pc.gz - lim);
        pc.gz = lim; pc.vz = 0;
      }
    } else if (pc.hinge) {
      const ht = (tp - pc.hdelay) / 1000;
      if (ht > 0) {
        const a = 0.5 * 11 * ht * ht;
        let wob = 0, hop = 0;
        if (a < pc.hmax) {
          c.rotation = pc.hdir * a;
        } else {
          if (pc.hAt == null) { pc.hAt = t; K.puff(st, c.position.x + pc.hdir * H * 0.6, gy, 6); }
          const bt = (t - pc.hAt) / 180;
          const bounce = bt < 1 ? Math.sin(Math.PI * bt) * 0.12 * (pc.hmax / (Math.PI / 2)) : 0;
          /* a landed fish flops: a few hops, each smaller */
          if (pc.flop > 0) {
            const ft = (t - pc.hAt - 180) / FLOP_MS;
            const k = Math.floor(ft);
            if (ft > 0 && k < pc.flop) {
              const ph = ft - k, amp = 1 / (k + 1);
              hop = Math.sin(Math.PI * ph) * H * 0.1 * amp;
              wob = Math.sin(2 * Math.PI * ph) * 0.14 * amp;
              if (k !== pc.flopK) { pc.flopK = k; spray(K, st, pc, 3); }
            }
          }
          c.rotation = pc.hdir * (pc.hmax - bounce) + wob;
        }
        c.position.y -= (K.lowestY(pc) - gy);
        c.position.y -= hop;
      }
    } else if (pc.slump) {
      const sl = pc.slump;
      const s = Math.max(0, Math.min(1, (tp - pc.delay) / (sl.sink > 0 ? SINK_MS : SLUMP_MS)));
      const e = 1 - Math.pow(1 - s, 2);
      c.pivot.set(sl.px, sl.py);
      c.position.set(sl.px, sl.py + sl.sink * H * e);
      c.scale.set(1 + 0.55 * sl.squash * e, 1 - sl.squash * e);
      c.rotation = sl.lean * e;
    }
  }
  for (const p of st.parts) {
    if (p.land) continue;
    p.vy += g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.vy > 0 && p.y >= p.gy) { p.y = p.gy; p.land = true; }
  }
}

function draw(K, st, t) {
  /* the beat: squashed about its feet, and flashed */
  if (t < BEAT_MS) {
    const k = Math.sin(Math.PI * Math.max(0, t) / BEAT_MS);
    /* (v2.3.3954: the explosion's beat lands harder) */
    st.body.scale.set(1 + (st.big ? 0.16 : 0.1) * k, 1 - (st.big ? 0.18 : 0.12) * k);
    if (st.flash) st.flash.alpha = (st.big ? 0.9 : 0.7) * (1 - Math.max(0, t) / BEAT_MS);
  } else {
    if (st.body.scale.x !== 1 || st.body.scale.y !== 1) st.body.scale.set(1, 1);
    if (st.flash) { st.flash.destroy(); st.flash = null; }
  }
  if (st.puddle) {
    const k = Math.max(0, Math.min(1, (t - BEAT_MS) / SINK_MS));
    const e = 1 - Math.pow(1 - k, 2);
    st.under.clear();
    if (e > 0) {
      st.under.ellipse(st.cx, st.groundY, st.W * 0.55 * e, st.H * 0.08 * e).fill({ color: st.colD, alpha: 0.85 });
      st.under.ellipse(st.cx, st.groundY - st.H * 0.01 * e, st.W * 0.4 * e, st.H * 0.05 * e).fill({ color: st.col, alpha: 0.7 });
    }
  }
  const fx = st.fx;
  fx.clear();
  for (const p of st.parts) {
    fx.rect(p.x - p.s / 2, p.y - p.s / 2, p.land ? p.s * 1.6 : p.s, p.land ? p.s * 0.7 : p.s).fill({ color: p.col, alpha: 1 });
  }
  st.root.alpha = t < K.FADE_FROM_MS ? 1 : Math.max(0, 1 - (t - K.FADE_FROM_MS) / (K.DUR_MS - K.FADE_FROM_MS));
}

/* QA probe, house style: the zone deaths made, playing and let go */
if (typeof window !== 'undefined') window.__btDeathZones = zoneDeathStats;

/** QA: what one zone death is doing (monsterDeathState adds it). */
export function zoneDeathProbe(st) {
  return {
    look: st.look, view: st.view, parted: !!st.parted,
    zones: st.pieces.map((p) => p.z.id),
    offs: st.pieces.map((p) => p.off),
    sub: st.pieces.filter((p) => p.sub).length,
    masked: st.pieces.filter((p) => !p.sub).length,
    sinks: st.pieces.map((p) => !!p.sinks),
    bodyScale: st.body && !st.body.destroyed ? [+st.body.scale.x.toFixed(3), +st.body.scale.y.toFixed(3)] : null,
    flash: !!st.flash,
    /* v2.3.3954: big or ordinary, the blow it knew, how many pieces were
       thrown, its eyes, and where the pieces have got to: the mean of each
       moving piece's centre from where it started, in world px (x right,
       y down the screen: along the ground) */
    big: !!st.big,
    blow: st.blow,
    t: st.tNow != null ? Math.round(st.tNow) : null,
    thrown: st.pieces.filter((p) => p.off === 'fly' || p.off === 'pop').length,
    eyes: st.pieces.filter((p) => p.eye).length,
    drift: driftOf(st),
    stats: zoneDeathStats(),
  };
}

function driftOf(st) {
  if (!st.root || st.root.destroyed) return null;
  let sx = 0, sz = 0, n = 0;
  for (const p of st.pieces) {
    if (p.off === 'stays') continue;
    const c = p.c, cos = Math.cos(c.rotation), sin = Math.sin(c.rotation);
    const lx = (p.com[0] - c.pivot.x) * c.scale.x, ly = (p.com[1] - c.pivot.y) * c.scale.y;
    sx += c.position.x + cos * lx - sin * ly - p.com[0];
    sz += p.gz || 0;
    n++;
  }
  if (!n) return null;
  const k = st.root.scale, ds = (st.root.parent && st.root.parent.scale) || { x: 1, y: 1 };
  return { x: +(sx / n * k.x * ds.x).toFixed(2), z: +(sz / n * k.y * ds.y).toFixed(2), n };
}
