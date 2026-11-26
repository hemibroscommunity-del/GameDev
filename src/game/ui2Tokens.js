/* ═══ v2.3.6680: THE NEW DASHBOARD'S TOKENS, ONE SOURCE (card UI2, the build's step 1) ═══
 *
 * The owner, 2026-11-25, with the master specification and three pictures
 * (docs/plan/cards/UI2-kit.md): "Establish a centralized UI design system
 * before migrating individual menus. Render all gradients, bevels, shine,
 * shadows, borders and interactive states programmatically."  Every later
 * screen of the new dashboard is built from ONE kit (src/ui/kit/), and the
 * kit reads ONLY these numbers, so a change of the look is a change here.
 *
 * WHERE THEY GO.  The kit's style sheet (src/ui/kit/ui2.css) carries them as
 * custom properties under ONE scope class, `.ui2`, so nothing that exists
 * today changes its look.  That block is WRITTEN FROM this module
 * (`node tools/guards/ui2-tokens.test.mjs --write`) and held equal to it by
 * the same suite: never edit the block by hand.
 *
 * THE COLOURS.  The game's own eight (src/styles/game.css :105-192: band-top
 * #26383E, sheet #1E2E34, raised #293B41, well #111E23, well-deep #0B161B,
 * brass #D8AA58, brass-highlight #EAC675, text #F4F0E7) are the base.  The
 * benchmark (reference 01, the Character page) is a richer BLUE metal than
 * the game's green-grey slate, so each surface here is the game's own,
 * turned 12 to 15 degrees towards blue and a little deeper in colour, at
 * the same lightness: the same family, the benchmark's feel (the card:
 * "a tuning of them, yours to judge on the fixture").  Brass and the text
 * are the game's, to the digit.
 *
 * THE ACTIONS.  Five light metallic faces, ONE dark label on all five (the
 * spec, part 2: "Do not switch action text from black to white between
 * colors").  Each face is three stops (top, middle, bottom) and its pressed
 * face three more; the suite works out the label's contrast on EVERY stop,
 * pressed included: 4.5 to 1 at least.  Red is lighter than the game's
 * danger red (#D8635D gives only 4.6 flat: the audit's "The action
 * buttons"), so its darker stops still pass.
 *
 * RARITY.  The GAME's grades and colours (src/ui/mobile/dash/common.js
 * :67-93; the owner, v2.3.3142: "So rare is blue, elite is orange, godly is
 * prismatic"): Normal, Rare, Elite, Godly.  Never "common" or "epic".  The
 * non-colour cue is the game's own: stars, one for Normal up to four.
 *
 * NO IMPORTS: node tests it (tools/guards/ui2-tokens.test.mjs), and the kit
 * imports it. */

/* ── the dark surfaces: every one carries ivory and muted text at 4.5 to 1 ── */
export const UI2_SURFACE = Object.freeze({
  /* the dashboard's frame: a shallow brushed slate, top to bottom */
  frameTop: '#223D53',
  frameMid: '#1C3549',
  frameBottom: '#172C3E',
  /* the page under the header (game: sheet #1E2E34) */
  page: '#193145',
  /* a raised control: a broad gradient, lighter at the top (game: raised #293B41, raised-high #32454C) */
  raisedTop: '#294765',
  raisedMid: '#27425D',
  raisedBottom: '#1F374E',
  /* the same control SELECTED: pushed in, its light inverted (darker at the top) */
  sunkTop: '#122334',
  sunkBottom: '#1B3349',
  /* a recessed group, track or socket (game: well #111E23, well-soft #16262C, well-deep #0B161B) */
  well: '#102336',
  wellSoft: '#152B3F',
  wellDeep: '#0A1724',
});

/* ── the rim and the gold (the game's brass, to the digit) ── */
export const UI2_BRASS = Object.freeze({
  brass: '#D8AA58',
  highlight: '#EAC675',
  deep: '#8C6530',
});

/* ── the text ── */
export const UI2_TEXT = Object.freeze({
  ivory: '#F4F0E7',      /* ordinary words and values on the dark (game: text) */
  muted: '#BCC8CC',      /* a label beside a value (game: text-secondary, turned with the slate) */
  disabled: '#6F8087',   /* a control that cannot be used (its REASON is muted, never this) */
  onAction: '#141D22',   /* the ONE dark label on all five action faces (game: text-on-accent #172126, a shade darker) */
  gold: '#EAC675',       /* a level's number, the one warm word on a line */
});

/* ── the five action colours: light metallic faces (top, middle, bottom; pressed the same) ── */
export const UI2_ACTIONS = Object.freeze({
  /* routine (Equip, Buy, Craft) */
  gold:   Object.freeze({ face: ['#F3D894', '#E4BA68', '#D2A24E'], pressed: ['#C99644', '#D4A655', '#DDB565'], edge: '#EAC675', rim: '#8C6530' }),
  /* accept, confirm, claim */
  green:  Object.freeze({ face: ['#B4E8C9', '#7FCDA2', '#5DBB8E'], pressed: ['#52AD82', '#61BA8F', '#70C69C'], edge: '#A6E2C0', rim: '#2F7457' }),
  /* guidance and movement (Track, Travel) */
  blue:   Object.freeze({ face: ['#B6D7F7', '#88BBEE', '#66A6E6'], pressed: ['#5D9BDB', '#6CA8E3', '#7BB4EA'], edge: '#A9CDF3', rim: '#2F5F92' }),
  /* destructive only (Discard, Abandon, Delete) */
  red:    Object.freeze({ face: ['#F6BBB2', '#EE958A', '#E57D70'], pressed: ['#DC7366', '#E38276', '#E99084'], edge: '#F2ADA3', rim: '#8E3B33' }),
  /* neutral and dismissive (Cancel, Decline) */
  silver: Object.freeze({ face: ['#EEF2F3', '#CFD8D9', '#B3C0C2'], pressed: ['#A8B5B8', '#B6C2C4', '#C3CED0'], edge: '#F4F7F7', rim: '#5D6B70' }),
});
export const UI2_ACTION_NAMES = Object.freeze(['gold', 'green', 'blue', 'red', 'silver']);

/* ── rarity: the game's grades (common.js QUALITY_COLOR; their words are the game's QUALITY_LABEL, read
   by the slot); stars are the non-colour cue ── */
export const UI2_RARITY = Object.freeze({
  normal: Object.freeze({ colour: '#7E8F97', stars: 1 }),   /* the plain slot: a neutral hairline, no glow */
  rare:   Object.freeze({   colour: '#5B99DE', stars: 2 }),
  elite:  Object.freeze({  colour: '#E8893A', stars: 3, light: '#F6C08A' }),   /* light: its metallic top edge */
  godly:  Object.freeze({  colour: '#F0C45F', stars: 4, prism: Object.freeze(['#FF6B6B', '#FFD166', '#6BFF95', '#5CB8FF', '#C77DFF']) }),
});
export const UI2_GRADES = Object.freeze(['normal', 'rare', 'elite', 'godly']);

/* ── the marks: a count badge (ivory on a warm red), the "new" dot, the rare warm light ── */
export const UI2_MARK = Object.freeze({
  count: '#B23A31',
  countText: '#FFF6EC',
  dot: '#E9C46A',
  glowInner: '#FFD98A',
  glowOuter: '#E07B2E',
});

/* ── progress: a continuous metallic fill in a recessed track ── */
export const UI2_FILL = Object.freeze({ top: '#F1D58E', mid: '#D9AE5C', bottom: '#B98B3E' });

/* ── sizes (CSS px) ── */
export const UI2_SIZE = Object.freeze({
  touch: 44,        /* the least box a finger presses (docs/UI-BIBLE.md :196) */
  header: 44,       /* the header's controls; the row they stand in is 48 or 52 (sheetGeometry) */
  rim: 2,           /* the frame's gold rim: thin and restrained */
  edge: 1,          /* a control's light edge */
  bevel: 2,         /* the depth of a raised face's lower edge */
  sink: 3,          /* the depth a SELECTED control is pushed in */
  focus: 2,         /* the keyboard's focus ring */
  bar: 10,          /* a progress track's height */
});

export const UI2_RADIUS = Object.freeze({ frame: 14, tile: 12, button: 11, group: 10, slot: 8, pill: 999 });

export const UI2_SPACE = Object.freeze({ xs: 2, s: 4, m: 6, l: 8, xl: 12 });

/* ── type: ONE serif, its sizes and weights ── */
export const UI2_FONT = Object.freeze({
  fontFamily: "'Merriweather', Georgia, 'Times New Roman', serif",
  weights: Object.freeze([400, 700]),   /* the only two asked of Google Fonts (src/index.html) */
});
export const UI2_TYPE = Object.freeze({
  badge: 10,    /* a count badge only */
  small: 11,    /* the floor for words */
  body: 12,
  label: 13,
  value: 15,
  title: 17,
  big: 24,
});
export const UI2_TYPE_FLOOR = 11;
export const UI2_BADGE_FLOOR = 10;

/* ── depth and light ── */
export const UI2_LIGHT = Object.freeze({
  shine: 0.5,          /* the strength of the gloss on a raised face; ?ui2shine=0 sets it to 0 */
  gloss: 0.12,         /* the gloss's white at its top, at full shine: what a label sits on is the face mixed toward white by shine x gloss (the suite's worst case) */
  edgeLight: 0.16,     /* the light top edge of a raised face (white, this strong) */
  shadow: 0.42,        /* the drop shadow under a raised face (black, this strong) */
  sinkShadow: 0.55,    /* the inner shadow of a pushed-in or recessed face */
  brush: 0.035,        /* the frame's brushed lines (white, this strong): fine and low */
});

/* ── motion (ms); prefers-reduced-motion stops every loop and every move ── */
export const UI2_MOTION = Object.freeze({ press: 70, state: 140, loop: 1400 });

/* ══ the custom properties, made from the tables above (the style sheet's block) ══ */

const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

/** Every custom property, in order, as [name, value]. */
export function ui2Vars() {
  const out = [];
  const put = (name, value) => out.push(['--ui2-' + name, String(value)]);
  for (const k of Object.keys(UI2_SURFACE)) put(kebab(k), UI2_SURFACE[k]);
  for (const k of Object.keys(UI2_BRASS)) put('brass-' + kebab(k), UI2_BRASS[k]);
  for (const k of Object.keys(UI2_TEXT)) put('text-' + kebab(k), UI2_TEXT[k]);
  for (const n of UI2_ACTION_NAMES) {
    const a = UI2_ACTIONS[n];
    a.face.forEach((c, i) => put(`${n}-face-${i}`, c));
    a.pressed.forEach((c, i) => put(`${n}-press-${i}`, c));
    put(`${n}-edge`, a.edge);
    put(`${n}-rim`, a.rim);
  }
  for (const g of UI2_GRADES) put('grade-' + g, UI2_RARITY[g].colour);
  put('grade-elite-light', UI2_RARITY.elite.light);
  UI2_RARITY.godly.prism.forEach((c, i) => put('prism-' + i, c));
  for (const k of Object.keys(UI2_MARK)) put('mark-' + kebab(k), UI2_MARK[k]);
  for (const k of Object.keys(UI2_FILL)) put('fill-' + kebab(k), UI2_FILL[k]);
  for (const k of Object.keys(UI2_SIZE)) put('size-' + kebab(k), UI2_SIZE[k] + 'px');
  for (const k of Object.keys(UI2_RADIUS)) put('radius-' + kebab(k), UI2_RADIUS[k] + 'px');
  for (const k of Object.keys(UI2_SPACE)) put('space-' + kebab(k), UI2_SPACE[k] + 'px');
  put('font', UI2_FONT.fontFamily);
  for (const k of Object.keys(UI2_TYPE)) put('fs-' + kebab(k), UI2_TYPE[k] + 'px');
  for (const k of Object.keys(UI2_LIGHT)) put(kebab(k), UI2_LIGHT[k]);
  for (const k of Object.keys(UI2_MOTION)) put('motion-' + kebab(k), UI2_MOTION[k] + 'ms');
  return out;
}

export const UI2_BLOCK_START = '/* @@ui2-tokens: made by `node tools/guards/ui2-tokens.test.mjs --write` from src/game/ui2Tokens.js. Do not edit. */';
export const UI2_BLOCK_END = '/* @@ui2-tokens-end */';

/** The style sheet's generated block: the properties under `.ui2`, the shine
 *  switch (`.ui2-noshine`, thrown by ?ui2shine=0) and reduced motion. */
export function ui2Css() {
  const L = [UI2_BLOCK_START, '.ui2 {'];
  for (const [n, v] of ui2Vars()) L.push(`  ${n}: ${v};`);
  L.push('}');
  L.push('.ui2.ui2-noshine { --ui2-shine: 0; }');
  L.push('@media (prefers-reduced-motion: reduce) {');
  L.push('  .ui2 { --ui2-motion-press: 0ms; --ui2-motion-state: 0ms; --ui2-motion-loop: 0ms; }');
  L.push('}');
  L.push(UI2_BLOCK_END);
  return L.join('\n');
}

/* ══ contrast (WCAG 2), for the suite and for any screen that checks its own pairing ══ */

/** '#RRGGBB' (or '#RGB') -> [r, g, b] in 0..255; null for anything else. */
export function ui2Rgb(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** The relative luminance of a colour (0 black .. 1 white). */
export function ui2Luminance(hex) {
  const rgb = ui2Rgb(hex);
  if (!rgb) return NaN;
  const lin = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** a mixed toward b by t (0..1), as '#rrggbb': a gloss of white at t over a face. */
export function ui2Mix(a, b, t) {
  const x = ui2Rgb(a);
  const y = ui2Rgb(b);
  if (!x || !y) return null;
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** The contrast ratio of two colours (1 .. 21), whichever is lighter. */
export function ui2Contrast(a, b) {
  const la = ui2Luminance(a);
  const lb = ui2Luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
