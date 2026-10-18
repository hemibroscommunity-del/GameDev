/* ═══ v2.3.3363: YOUR BRO MOVES (docs/specs/emote-moves.md) ═══
 *
 * The fun & social plan's Phase 1 (docs/FUN-SOCIAL-PLAN.md), the owner's "Go
 * recommended": emotes that move the WHOLE drawn bro in code -- an offset, a
 * squash or stretch, a tilt, a flip -- so every look and every hat works with
 * no new art and no new memory.  Two kinds:
 *
 *   ONCE  wave, laugh, flex, shrug, facepalm, cheer -- a moment, relayed as
 *         the `emote` relay's `{move}` (server/src/emotes.js) to the players
 *         near you, and over in a second or two;
 *   HOLD  sit, sleep, flop and three dances -- held until you move, so they
 *         are STATE: the worker keeps `po` on your player and the tick tells
 *         every phone near you (server/src/poses.js, tick.js `po`), and a
 *         player who walks up later sees you sitting (TRAPS §176: a one-off
 *         message would show them you standing).
 *
 * This file is the table and the curves, nothing drawn: rendering/emoteFx.js
 * puts each frame on the figure, feet planted, the name plate held still.
 * The worker's copy of the two id lists is server/src/emotes.js EMOTE.MOVES and
 * server/src/poses.js POSE.IDS (mirror-audit holds them equal).
 *
 * A frame is { hop, dx, rot, kx, ky }:
 *   hop   world px UP (the shadow stays on the ground under it, as a jump's)
 *   dx    world px sideways
 *   rot   radians, about the feet
 *   kx/ky the figure's scale, 1 = as drawn; kx < 0 mirrors it
 * When rot is not 0, kx is +-ky (a tilt never squashes), which is what lets
 * emoteFx hold the name plate exactly still (see there).
 *
 * The dances keep time by the clock on the wall (Date.now()), not by when
 * each started, so bros dancing side by side bob together -- as near as
 * their phones' clocks agree.  The plan's Phase 2 brings the server's beat.
 *
 * No imports, so it can be read in node. */

/* 120 beats a minute */
export const DANCE_BEAT_MS = 500;
/* how long a held pose takes to settle in */
const HOLD_IN_MS = 220;

/* The moves, in the picker's order.  `icon` is its button; `pop` the emoji it
   pops over the head (effectsRenderer _updateEmotePops), `every` how often a
   held one pops it again. */
export const EMOTE_MOVES = Object.freeze({
  wave: { kind: 'once', ms: 1300, name: 'Wave', icon: '👋', pop: '👋' },
  laugh: { kind: 'once', ms: 1500, name: 'Laugh', icon: '😂', pop: '😂' },
  flex: { kind: 'once', ms: 1600, name: 'Flex', icon: '💪', pop: '💪' },
  shrug: { kind: 'once', ms: 1000, name: 'Shrug', icon: '🤷', pop: '🤷' },
  facepalm: { kind: 'once', ms: 1700, name: 'Facepalm', icon: '🤦', pop: '🤦' },
  cheer: { kind: 'once', ms: 1100, name: 'Cheer', icon: '🙌', pop: '🎉' },
  sit: { kind: 'hold', name: 'Sit', icon: '🪑' },
  sleep: { kind: 'hold', name: 'Sleep', icon: '😴', pop: '💤', every: 1800 },
  flop: { kind: 'hold', name: 'Flop', icon: '🫠', pop: '💨' },
  bounce: { kind: 'hold', dance: true, name: 'Bro Bounce', icon: '🕺', pop: '🎵', every: 2000 },
  robot: { kind: 'hold', dance: true, name: 'Robot', icon: '🤖', pop: '🎶', every: 2000 },
  sprinkler: { kind: 'hold', dance: true, name: 'Sprinkler', icon: '💦', pop: '🎵', every: 2000 },
});
export const EMOTE_MOVE_IDS = Object.freeze(Object.keys(EMOTE_MOVES));
export const EMOTE_ONCE_IDS = Object.freeze(EMOTE_MOVE_IDS.filter((k) => EMOTE_MOVES[k].kind === 'once'));
export const EMOTE_HOLD_IDS = Object.freeze(EMOTE_MOVE_IDS.filter((k) => EMOTE_MOVES[k].kind === 'hold'));

/* 'once', 'hold', or null for anything that is not a move */
export function moveKind(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(EMOTE_MOVES, id) ? EMOTE_MOVES[id].kind : null;
}

/* The chat's slash commands for the moves: /wave, /sit, /dance ... */
const SLASH = Object.freeze({
  wave: 'wave', hi: 'wave', laugh: 'laugh', lol: 'laugh', flex: 'flex', shrug: 'shrug',
  facepalm: 'facepalm', cheer: 'cheer', sit: 'sit', sleep: 'sleep', nap: 'sleep', flop: 'flop',
  dance: 'bounce', bounce: 'bounce', robot: 'robot', sprinkler: 'sprinkler',
});
export function slashMove(text) {
  if (typeof text !== 'string') return null;
  const m = /^\/([a-z]+)\s*$/i.exec(text.trim());
  if (!m) return null;
  const k = m[1].toLowerCase();
  return Object.prototype.hasOwnProperty.call(SLASH, k) ? SLASH[k] : null;
}

const ZERO = Object.freeze({ hop: 0, dx: 0, rot: 0, kx: 1, ky: 1 });
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const smooth = (t) => t * t * (3 - 2 * t);
/* in, then out, over a move of `ms`: 0 -> 1 in the first `edge` ms, 1 -> 0 in the last */
const env = (t, ms, edge) => clamp01(Math.min(t / edge, (ms - t) / edge));

/* one frame of a ONCE move, `t` ms after it began (null when it is over) */
export function onceFrame(id, t) {
  const m = EMOTE_MOVES[id];
  if (!m || m.kind !== 'once' || !(t >= 0) || t >= m.ms) return null;
  const e = env(t, m.ms, 160);
  switch (id) {
    case 'wave':      /* three quick side-to-side tilts */
      return { hop: 0, dx: 0, rot: 0.13 * Math.sin((2 * Math.PI * t) / 430) * e, kx: 1, ky: 1 };
    case 'laugh':     /* a fast up-and-down shake, a little sway */
      return { hop: 5 * Math.abs(Math.sin((2 * Math.PI * t) / 360)) * e, dx: 0, rot: 0.04 * Math.sin((2 * Math.PI * t) / 300) * e, kx: 1, ky: 1 };
    case 'flex': {    /* squash down, stretch tall and hold, then back */
      let ky = 1, kx = 1;
      if (t < 240) { const u = smooth(t / 240); ky = 1 - 0.14 * u; kx = 1 + 0.08 * u; }
      else if (t < 460) { const u = smooth((t - 240) / 220); ky = 0.86 + 0.28 * u; kx = 1.08 - 0.14 * u; }
      else if (t < 1300) { ky = 1.14; kx = 0.94; }
      else { const u = smooth((t - 1300) / 300); ky = 1.14 - 0.14 * u; kx = 0.94 + 0.06 * u; }
      return { hop: 0, dx: 0, rot: 0, kx, ky };
    }
    case 'shrug':     /* a small hop with a tilt */
      return { hop: t < 460 ? 11 * Math.sin((Math.PI * t) / 460) : 0, dx: 0, rot: 0.11 * Math.sin((Math.PI * t) / m.ms), kx: 1, ky: 1 };
    case 'facepalm': { /* lean in (sink a little), hold, a slow head shake */
      const lean = easeOut(clamp01(t / 260)) * env(t, m.ms, 260);
      return { hop: -4 * lean, dx: 0, rot: (t > 300 ? 0.07 * Math.sin((2 * Math.PI * (t - 300)) / 620) : 0) * lean, kx: 1, ky: 1 };
    }
    case 'cheer':     /* two big hops */
      return { hop: 24 * Math.abs(Math.sin((2 * Math.PI * t) / m.ms)), dx: 0, rot: 0, kx: 1, ky: 1 };
    default:
      return null;
  }
}

/* one frame of a HOLD pose begun at `startedAt`, at `now` (both wall-clock ms) */
export function holdFrame(id, now, startedAt) {
  const m = EMOTE_MOVES[id];
  if (!m || m.kind !== 'hold') return null;
  const since = Math.max(0, now - (startedAt || now));
  const inK = smooth(clamp01(since / HOLD_IN_MS));
  const beat = (now % DANCE_BEAT_MS) / DANCE_BEAT_MS;           /* 0..1 within a beat */
  const bar = (now % (DANCE_BEAT_MS * 4)) / (DANCE_BEAT_MS * 4); /* 0..1 within four beats */
  switch (id) {
    case 'sit':       /* down to 70% of the height */
      return { hop: 0, dx: 0, rot: 0, kx: 1 + 0.06 * inK, ky: 1 - 0.3 * inK };
    case 'sleep': {   /* tipped over flat, breathing */
      const tip = easeOut(clamp01(since / 420));
      const breathe = 1 + 0.025 * Math.sin((2 * Math.PI * now) / 2600) * tip;
      return { hop: 0, dx: 0, rot: -Math.PI / 2 * tip, kx: breathe, ky: breathe };
    }
    case 'flop': {    /* a face-plant with a bounce */
      let a;
      if (since < 230) a = easeOut(since / 230) * 1.12;
      else if (since < 380) a = 1.12 - 0.12 * smooth((since - 230) / 150);
      else a = 1;
      return { hop: 0, dx: 0, rot: (Math.PI / 2) * a, kx: 1, ky: 1 };
    }
    case 'bounce':    /* bob on every beat, lean left and right */
      return { hop: 7 * Math.abs(Math.sin(Math.PI * beat)) * inK, dx: 0, rot: 0.11 * Math.sin(2 * Math.PI * bar * 2) * inK, kx: 1, ky: 1 };
    case 'robot': {   /* snappy steps on the quarter beats, no easing */
      const q = Math.floor(now / (DANCE_BEAT_MS / 2)) % 4;
      const rot = [0, 0.16, 0, -0.16][q] * inK;
      const k = q % 2 ? 1 - 0.05 * inK : 1;
      return { hop: q === 2 ? 3 * inK : 0, dx: 0, rot, kx: k, ky: k };
    }
    case 'sprinkler': { /* face-flips in steps, then one long sweep */
      const cycle = now % (DANCE_BEAT_MS * 6);
      if (cycle < DANCE_BEAT_MS * 3) {
        const step = Math.floor(cycle / (DANCE_BEAT_MS / 2));
        return { hop: 0, dx: 0, rot: 0.06 * step * inK - 0.15 * inK, kx: step % 2 ? -1 : 1, ky: 1 };
      }
      const u = (cycle - DANCE_BEAT_MS * 3) / (DANCE_BEAT_MS * 3);
      return { hop: 0, dx: 0, rot: (0.21 - 0.42 * u) * inK, kx: 1, ky: 1 };
    }
    default:
      return null;
  }
}

/* The frame to draw for a holder (you: S._emoteMove / S._pose; a peer:
   o._emoteMove / o._po + o._poAt), or ZERO.  A held pose wins over a moment. */
export function emoteFrameFor(once, hold, holdAt, now) {
  if (hold && moveKind(hold) === 'hold') return holdFrame(hold, now, holdAt) || ZERO;
  if (once && once.id && moveKind(once.id) === 'once') return onceFrame(once.id, now - (once.at || 0)) || ZERO;
  return ZERO;
}
export const EMOTE_ZERO = ZERO;

/* the frame as emoteFx applies it: a tilt never squashes (kx = +-ky) */
export function settleFrame(f) {
  if (!f) return ZERO;
  const rot = Number.isFinite(f.rot) ? f.rot : 0;
  let ky = Number.isFinite(f.ky) && f.ky > 0.2 ? f.ky : 1;
  let kx = Number.isFinite(f.kx) && Math.abs(f.kx) > 0.2 ? f.kx : 1;
  if (Math.abs(rot) > 1e-6) kx = (kx < 0 ? -1 : 1) * ky;
  return { hop: Number.isFinite(f.hop) ? f.hop : 0, dx: Number.isFinite(f.dx) ? f.dx : 0, rot, kx, ky };
}

/* ═══ WHERE THE FIGURE GOES: FEET PLANTED, NAME PLATE HELD STILL ═══
 * The figure is the entity pass's display container -- body, gear, weapon,
 * cape, the HUD layer -- drawn at its origin (the body's CENTRE: the boots are
 * `F` of its own units below it, entityRenderer figureFeetUnits) with scale
 * (sx, sy) and no rotation, as every living figure is.  A frame is applied
 * ABOUT THE FEET: tilt, squash and mirror there, then slide by (dx, -hop),
 * which in the display's own terms is
 *     scale    (kx sx, ky sy),  rotation rot,
 *     position x + dx + ky sy F sin(rot),  y + sy F - hop - ky sy F cos(rot)
 * so the boots stay where the server knows they are (and only move by dx and
 * the hop).  Pixi draws a container as R(rot) S(scale): with kx = +-ky
 * whenever rot is not 0 (settleFrame) that is exactly "about the feet".
 *
 * The HUD inside it -- name plate, HP bar, the threat skull, the spend bars
 * -- must NOT tilt, squash or flip.  Each such child is given the matrix
 * inv(P') D P U (P the display as it was, P' as it is now, U the child's own,
 * D a drop straight down), so it draws exactly as if no emote were on, only
 * lower: `q` below is inv(P') D P, and holdMatrix(q, u) the child's.  Pixi's
 * setFromMatrix turns that back into position, scale, rotation and skew (a
 * mirror becomes a skew of pi).
 *
 * The DROP (`hudDrop`, world px) is how far the top of the figure came down:
 * a sitter's head is 30% lower, so is his plate; a sleeper is lying on the
 * ground, so his plate comes down to just over him (a lying bro is about 0.4
 * of his height deep: HUD_LYING) instead of floating at a standing bro's
 * height.  Never up: a hop, a cheer or a stretch leaves the plate where it
 * was, as a tilt within a dance does.  `H` is the boots-to-crown height in
 * the figure's own units (entityRenderer figureSwimLine).
 *
 * `feetFix` is what figureFeetY takes off to read the ground under the figure
 * again (the hop, and the tilt's give), and `xFix` what figureFeetX takes off:
 * a shadow stays on the ground under a hop, as under a jump.
 * Pixi's matrix is [a c tx; b d ty]: x' = a x + c y + tx, y' = b x + d y + ty. */
const HUD_LYING = 0.4;
export function placeEmote(b, f, F, H) {
  const c = Math.cos(f.rot), s = Math.sin(f.rot);
  const tall = Math.abs(c) + HUD_LYING * Math.abs(s);   /* the figure's height now, as a share */
  const fall = Math.abs(b.sy) * (H > 0 ? H : 0) * (1 - Math.abs(f.ky) * tall) - f.hop;
  const hudDrop = fall > 0 ? fall : 0;
  const sx2 = f.kx * b.sx, sy2 = f.ky * b.sy;
  const reach = f.ky * b.sy * F;                   /* origin to boots, drawn */
  const x = b.x + f.dx + reach * s;
  const y = b.y + b.sy * F - f.hop - reach * c;
  const pa = sx2 * c, pb = sx2 * s, pc = -sy2 * s, pd = sy2 * c;
  const det = pa * pd - pb * pc;                   /* sx2 * sy2, never 0 here */
  const ia = pd / det, ib = -pb / det, ic = -pc / det, id = pa / det;
  const itx = -(ia * x + ic * y), ity = -(ib * x + id * y);
  const by = b.y + hudDrop;                        /* D P: the old place, dropped */
  const q = {
    a: ia * b.sx, b: ib * b.sx, c: ic * b.sy, d: id * b.sy,
    tx: ia * b.x + ic * by + itx, ty: ib * b.x + id * by + ity,
  };
  return { x, y, rot: f.rot, sx: sx2, sy: sy2, q, hudDrop, feetFix: reach * (1 - c) - f.hop, xFix: reach * s };
}
/* a held child's matrix: q (above) times the child's own, `u` = {x, y, sx, sy}
   (no rotation or skew of its own, as the HUD has none) */
export function holdMatrix(q, u) {
  return {
    a: q.a * u.sx, b: q.b * u.sx, c: q.c * u.sy, d: q.d * u.sy,
    tx: q.a * u.x + q.c * u.y + q.tx, ty: q.b * u.x + q.d * u.y + q.ty,
  };
}
