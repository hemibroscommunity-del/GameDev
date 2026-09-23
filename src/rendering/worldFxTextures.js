/* ═══ v2.3.2703: THE TEXTURES THE WORLD EFFECTS ARE DRAWN FROM ═══
 *
 * Time of day, dust prints, blood and the crumbling skeleton (worldFx.js,
 * deathCrumble.js) all draw pooled SPRITES off the textures minted here --
 * never per-frame Graphics.  The owner's standing verdict on code-drawn
 * effects ("code-drawn effects look bad", v2.3.2200) is about exactly that:
 * a Graphics circle is a hard-edged vector disc in a painted world.  These
 * are soft, pre-rendered bitmaps (a light's falloff, a cloud's ragged edge,
 * a blood fleck), and the bones are hand-placed PIXEL ART written out below,
 * drawn at one art pixel per world pixel with nearest filtering so they sit
 * in the same chunky register as the game's sprites.
 *
 * MINTED ON THE LOADING SCREEN (preloadWorldAnimations), per the animation
 * preloading law: nothing here is a network load, but a first-use canvas
 * upload is still a GPU hitch at the worst moment -- the first time you are
 * hit, or the first time you die.  All of it together is well under 1MB.
 */
import { Texture } from 'pixi.js';

const _tex = Object.create(null);

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function toTex(c, nearest) {
  const t = Texture.from(c);
  try { t.source.scaleMode = nearest ? 'nearest' : 'linear'; } catch (e) { /* older pixi */ }
  return t;
}
/* Deterministic noise, so a reload mints the same cloud rather than a new one
   (and QA screenshots compare like with like). */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* A light: white, bright core, long smooth tail.  Drawn ADDITIVELY into the
   night's light map, so its falloff IS the lantern's falloff. */
function mintGlow() {
  const S = 128, c = canvas(S, S), g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.28)');
  grd.addColorStop(0.8, 'rgba(255,255,255,0.07)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return toTex(c);
}

/* ═══ v2.3.2707: A SOFTBOX, FOR NAME PLATES ═══
   A small square of light with a 4px soft border, drawn as a NINE-SLICE: the
   bright middle stretches to exactly cover a name plate or a monster's health
   bar in the night's light map, and the soft border stays 4 light-map px (16
   CSS px) wide whatever the plate's size.  The first cut stretched one soft
   rectangle over the plate, and because its fully-bright middle was a fixed
   share of it, a long plate needed a huge one -- town at night grew glowing
   yellow boxes round every name.  Built per pixel (smoothstep) rather than
   with ctx.filter blur, which Safari's canvas does not have. */
export const SOFTBOX_EDGE = 4;
function mintSoftbox() {
  const E = SOFTBOX_EDGE, W = E * 2 + 4, H = E * 2 + 4, c = canvas(W, H), g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const edge = (u) => { const t = Math.min(1, u / E); return t * t * (3 - 2 * t); };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = edge(Math.min(x + 0.5, W - x - 0.5)) * edge(Math.min(y + 0.5, H - y - 0.5));
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * a);
    }
  }
  g.putImageData(img, 0, 0);
  return toTex(c);
}

/* A cloud: a dozen overlapping soft discs, so the edge is ragged the way a
   cloud's shadow is and not the perfect ellipse that gives a blob away. */
function mintCloud(seed) {
  const W = 256, H = 160, c = canvas(W, H), g = c.getContext('2d');
  const r = rng(seed);
  for (let i = 0; i < 14; i++) {
    const x = W * (0.2 + r() * 0.6), y = H * (0.3 + r() * 0.4);
    const rad = 34 + r() * 44;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, 'rgba(255,255,255,0.55)');
    grd.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
  }
  return toTex(c);
}

/* A dust print: one foot's scuff -- a soft oval, heavier at the toe, with a
   few grains at the rim.  White, tinted to the zone's ground. */
function mintPrint() {
  const W = 16, H = 24, c = canvas(W, H), g = c.getContext('2d');
  const r = rng(7);
  const blob = (x, y, rx, ry, a) => {
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    grd.addColorStop(0, `rgba(255,255,255,${a})`);
    grd.addColorStop(0.7, `rgba(255,255,255,${a * 0.6})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  blob(8, 8, 6, 7.5, 0.9);    /* toe pad, facing -y */
  blob(8, 17, 4.5, 5.5, 0.8); /* heel */
  for (let i = 0; i < 9; i++) {
    g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.4})`;
    g.fillRect(Math.floor(2 + r() * 12), Math.floor(2 + r() * 20), 1, 1);
  }
  return toTex(c);
}

/* A puff: the little cloud a footfall kicks up, or a bone landing does. */
function mintPuff() {
  const S = 48, c = canvas(S, S), g = c.getContext('2d');
  const r = rng(11);
  for (let i = 0; i < 7; i++) {
    const x = S * (0.3 + r() * 0.4), y = S * (0.35 + r() * 0.3), rad = 9 + r() * 10;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, 'rgba(255,255,255,0.5)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
  }
  return toTex(c);
}

/* A mote: a pinpoint with a halo -- pollen in the sun, an ember, a firefly. */
function mintMote() {
  const S = 16, c = canvas(S, S), g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.2, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.3)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return toTex(c);
}

/* ── blood ──
   Painted in its own colour rather than white-and-tinted: a drop is not one
   flat red but a dark body with a wet highlight, and a tint cannot put two
   colours in one sprite. */
function mintDrop() {
  const W = 10, H = 10, c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#5e0a0e'; g.beginPath(); g.arc(5, 5.3, 3.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#a3141b'; g.beginPath(); g.arc(4.7, 4.8, 2.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,190,190,0.85)'; g.fillRect(3, 3, 1.5, 1.5);
  return toTex(c);
}
function mintSplat(seed) {
  const S = 32, c = canvas(S, S), g = c.getContext('2d');
  const r = rng(seed);
  const disc = (x, y, rad, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill(); };
  /* body: a few merged discs, then satellites flung off one side */
  for (let i = 0; i < 5; i++) disc(16 + (r() - 0.5) * 7, 16 + (r() - 0.5) * 5, 4 + r() * 3.5, '#5a0a0d');
  for (let i = 0; i < 4; i++) disc(16 + (r() - 0.5) * 5, 16 + (r() - 0.5) * 3, 2.5 + r() * 2.5, '#7c0f14');
  for (let i = 0; i < 7; i++) {
    const a = (r() - 0.5) * 1.6, d = 9 + r() * 6;
    disc(16 + Math.cos(a) * d, 16 + Math.sin(a) * d * 0.6, 0.8 + r() * 1.4, '#5a0a0d');
  }
  disc(14, 14.5, 1.3, 'rgba(210,90,90,0.45)');   /* wet catch-light */
  return toTex(c);
}
function mintMist() {
  const S = 48, c = canvas(S, S), g = c.getContext('2d');
  const r = rng(23);
  for (let i = 0; i < 6; i++) {
    const x = S * (0.3 + r() * 0.4), y = S * (0.3 + r() * 0.4), rad = 8 + r() * 11;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, 'rgba(150,14,20,0.55)');
    grd.addColorStop(1, 'rgba(150,14,20,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
  }
  return toTex(c);
}

/* ── bones ──
   Pixel art, one character per art pixel:
     o outline   L bone   M bone shade   k socket/hole   . clear
   Drawn in the palette of the existing death sheet (death-v1.png): a warm
   cream with a dark plum outline, so a pile of these sits beside that art
   rather than looking like a different game's. */
const BONE_PAL = { o: '#3a2a2e', L: '#efe3b4', M: '#c9b680', k: '#2a1c1f' };
export const BONE_ART = {
  skull: [
    '...oooooo...',
    '..oLLLLLLo..',
    '.oLLLLLLLMo.',
    'oLLLLLLLLLMo',
    'oLkkkLLkkkMo',
    'oLkkkLLkkkMo',
    'oLLLLkkLLLMo',
    '.oLLLkkLLMo.',
    '..oMLLLLMo..',
    '..oLoLoLo...',
    '...ooooo....',
  ],
  ribs: [
    '....oLLo....',
    '.ooooLLoooo.',
    'oLLLLLLLLLMo',
    'oooooLLooooo',
    '.oLLLLLLLMo.',
    '.ooooLLoooo.',
    '..oLLLLLMo..',
    '..oooLLooo..',
    '...oLLLMo...',
    '...ooLLoo...',
    '....oLMo....',
    '....oLMo....',
  ],
  pelvis: [
    '.oo......oo.',
    'oLLo.oo.oLMo',
    'oLLLoLMoLLMo',
    '.oLLLLLLLMo.',
    '..oLLooLMo..',
    '...oo..oo...',
  ],
  femur: [
    '.oo.oo.',
    'oLLoLMo',
    'oLLLLMo',
    '.oLLMo.',
    '..oLo..',
    '..oLo..',
    '..oLo..',
    '..oLo..',
    '..oLo..',
    '..oLo..',
    '.oLLMo.',
    'oLLLLMo',
    'oLLoLMo',
    '.oo.oo.',
  ],
  shin: [
    '.oo.oo.',
    'oLLoLMo',
    '.oLLMo.',
    '..oLo..',
    '..oLo..',
    '..oLo..',
    '..oLo..',
    '..oLo..',
    '.oLLMo.',
    'oLLoLMo',
    '.oo.oo.',
  ],
  arm: [
    '.ooo.',
    'oLLMo',
    '.oLo.',
    '.oLo.',
    '.oLo.',
    '.oLo.',
    '.oLo.',
    '.oLo.',
    'oLLMo',
    '.ooo.',
  ],
  hand: [
    '.o.o.',
    'oLoLo',
    'oLLMo',
    '.oMo.',
  ],
};
function mintArt(rows) {
  const W = rows[0].length, H = rows.length, c = canvas(W, H), g = c.getContext('2d');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = rows[y][x];
      if (ch === '.' || !BONE_PAL[ch]) continue;
      g.fillStyle = BONE_PAL[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return toTex(c, true);
}

/** Mint everything once.  Returns the count, for the preload manifest's log. */
export function mintWorldFxTextures() {
  if (_tex.glow) return Object.keys(_tex).length;
  if (typeof document === 'undefined') return 0;
  try {
    _tex.glow = mintGlow();
    _tex.softbox = mintSoftbox();
    _tex.cloud0 = mintCloud(3); _tex.cloud1 = mintCloud(9); _tex.cloud2 = mintCloud(17);
    _tex.print = mintPrint();
    _tex.puff = mintPuff();
    _tex.mote = mintMote();
    _tex.drop = mintDrop();
    _tex.splat0 = mintSplat(5); _tex.splat1 = mintSplat(13); _tex.splat2 = mintSplat(29);
    _tex.mist = mintMist();
    for (const k of Object.keys(BONE_ART)) _tex['bone_' + k] = mintArt(BONE_ART[k]);
    /* Named, so a probe that lists what is drawn by its art file
       (window.__btCorpse, mp-deathstrip) can say "a bone" instead of "?". */
    for (const k of Object.keys(_tex)) { try { _tex[k].source.label = 'worldfx/' + k; } catch (e) { /* unnamed is fine */ } }
  } catch (e) { /* a missing effect texture leaves the effect off; it never breaks the game */ }
  return Object.keys(_tex).length;
}

/** One minted texture by name, or null (the caller skips the effect). */
export function fxTex(name) {
  return _tex[name] || null;
}
