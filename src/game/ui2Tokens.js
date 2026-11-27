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
 * v2.3.6780 (card UI3-kit, the owner's suggestions of 2026-11-26,
 * docs/design/UI_FEEDBACK_2026-11-26.md part 6): *"I would keep the navy and
 * gold aesthetic ... The dashboard's muted blue-gray background is what makes
 * it feel somewhat disconnected"*, and their six: dashboard base #14232F,
 * navigation #223D53, recessed panels #0E1D29, subtle borders #4B6275,
 * primary text #F1F0E9, gold accents #EAC474.  Each is HERE to the digit:
 * the base is the page and the frame's middle stop, navigation the raised
 * face's middle, recessed the well's; the stops around each are this card's
 * (a step lighter above, a step darker below, the same hue), every one
 * holding ivory, muted and gold at 4.5 to 1 (suite 2).  Their border colour
 * is a LINE, not a surface (`UI2_LINE`: as a surface muted and gold words
 * would read 3.7 and 3.8 to 1 on it), and it replaces the four hand-written
 * edges of the style sheet.  Part 4: *"reduce the button bevels and
 * shadows"*: the bevel 2 to 1, the drop shadow .42 to .30, the soft drop
 * .28 to .16 (a token now, as the bevel's shade).  `UI2_WAS` keeps
 * yesterday's values, so `?ui2look=0` (src/ui/kit/shine.js) gives the
 * owner the look before this card on their own phone, to compare.
 *
 * NO IMPORTS: node tests it (tools/guards/ui2-tokens.test.mjs), and the kit
 * imports it. */

/* ── the dark surfaces: every one carries ivory and muted text at 4.5 to 1 ── */
export const UI2_SURFACE = Object.freeze({
  /* the dashboard's frame: a shallow brushed slate, top to bottom (v2.3.6780: its middle the owner's base #14232F) */
  frameTop: '#1A2E3D',
  frameMid: '#14232F',
  frameBottom: '#0F1C26',
  /* the page under the header (game: sheet #1E2E34; v2.3.6780: the owner's "Dashboard base" #14232F) */
  page: '#14232F',
  /* a raised control: a broad gradient, lighter at the top (game: raised #293B41, raised-high #32454C;
     v2.3.6780: its middle the owner's "Navigation" #223D53) */
  raisedTop: '#294963',
  raisedMid: '#223D53',
  raisedBottom: '#1B3243',
  /* the same control SELECTED: pushed in, its light inverted (darker at the top) */
  sunkTop: '#0A1620',
  sunkBottom: '#132636',
  /* a recessed group, track or socket (game: well #111E23, well-soft #16262C, well-deep #0B161B;
     v2.3.6780: the well the owner's "Recessed panels" #0E1D29) */
  well: '#0E1D29',
  wellSoft: '#132533',
  wellDeep: '#09141D',
});

/* ── the rim and the gold (the game's brass, to the digit) ── */
export const UI2_BRASS = Object.freeze({
  brass: '#D8AA58',
  highlight: '#EAC474',   /* v2.3.6780: the owner's "Gold accents" (was the game's #EAC675) */
  deep: '#8C6530',
});

/* ── v2.3.6780: the LINE (the owner's "Subtle borders" #4B6275): an edge, never a surface, so it is
   not in UI2_SURFACE (suite 2 reads every surface under words).  `faint` is the same line sunk 55%
   toward the well, for a control that cannot be used (the old edge there was a tenth as strong). ── */
export const UI2_LINE = Object.freeze({
  line: '#4B6275',
  faint: '#293C4B',
});

/* ── the text ── */
export const UI2_TEXT = Object.freeze({
  ivory: '#F1F0E9',      /* ordinary words and values on the dark (game: text #F4F0E7; v2.3.6780: the owner's "Primary text") */
  muted: '#BCC8CC',      /* a label beside a value (game: text-secondary, turned with the slate) */
  disabled: '#6F8087',   /* a control that cannot be used (its REASON is muted, never this) */
  onAction: '#141D22',   /* the ONE dark label on all five action faces (game: text-on-accent #172126, a shade darker) */
  gold: '#EAC474',       /* a level's number, the one warm word on a line (v2.3.6780: the owner's "Gold accents"; "gold for progression and important numbers") */
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
  bevel: 1,         /* the depth of a raised face's lower edge (v2.3.6780: 2 to 1, "reduce the button bevels and shadows") */
  sink: 3,          /* the depth a SELECTED control is pushed in */
  focus: 2,         /* the keyboard's focus ring */
  bar: 10,          /* a progress track's height */
});

export const UI2_RADIUS = Object.freeze({ frame: 14, tile: 12, button: 11, group: 10, slot: 8, pill: 999 });

export const UI2_SPACE = Object.freeze({ xs: 2, s: 4, m: 6, l: 8, xl: 12 });

/* ── type: ONE face, its sizes and weights ──
 * v2.3.6785 (card UI3-type): the owner, 2026-11-26, "Also swap out the typography (font style) on
 * all menus to be same as the 'logout' font": the game's own sans-serif, spelled as the Log Out
 * button and the top bar spell it (AccountPanel.jsx, ZoneHeader.jsx), over the master
 * specification's serif.  Merriweather is no longer asked of Google Fonts.  Its weights are two of
 * the three the page loads Source Sans 3 at (400, 600, 700: src/index.html), so no weight is faked. */
export const UI2_FONT = Object.freeze({
  fontFamily: "'Source Sans 3', sans-serif",
  weights: Object.freeze([400, 700]),   /* the kit's regular and bold (src/index.html asks both, upright) */
});
/** v2.3.6785: rows of yesterday that `?ui2look=0` does NOT wear (the suite's yesterday still reads
 *  them, so main 7ec316e9's block is rebuilt to the byte).  The letters: the owner's word is "all
 *  menus", and the serif is no longer loaded, so yesterday's colours wear today's letters. */
export const UI2_WAS_UNWORN = Object.freeze({
  '--ui2-font': "'Merriweather', Georgia, 'Times New Roman', serif",
});
export const UI2_TYPE = Object.freeze({
  badge: 10,    /* a count badge only */
  small: 11,    /* the floor for words */
  body: 12,
  label: 13,
  nav: 13,      /* v2.3.6780: every navigation button's word, one size (a tile's label, a header control): "use the same typography across all navigation buttons" */
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
  shadow: 0.3,         /* the drop shadow under a raised face (black, this strong; v2.3.6780: .42 to .30) */
  drop: 0.16,          /* v2.3.6780: the soft drop around a raised face or an action (was a hand-written .28) */
  bevelShade: 0.18,    /* v2.3.6780: the shade of a raised face's lower bevel (was a hand-written .26) */
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
  put('line', UI2_LINE.line);   /* v2.3.6780 */
  put('line-faint', UI2_LINE.faint);
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

/* ══ v2.3.6780: YESTERDAY'S LOOK, for `?ui2look=0` (the owner compares on their phone) ══
 * Every custom property whose value this card changed, or which it made (the line, the soft drop,
 * the bevel's shade), at its value on main 7ec316e9 (or, for a new one, the value the sheet wrote by
 * hand there).  The suite rebuilds yesterday's whole block from today's with these over it, less
 * the properties born since (`UI2_BORN`), and holds it to main's, to the byte: a token changed and
 * left out is red. */
export const UI2_WAS = Object.freeze({
  '--ui2-frame-top': '#223D53',
  '--ui2-frame-mid': '#1C3549',
  '--ui2-frame-bottom': '#172C3E',
  '--ui2-page': '#193145',
  '--ui2-raised-top': '#294765',
  '--ui2-raised-mid': '#27425D',
  '--ui2-raised-bottom': '#1F374E',
  '--ui2-sunk-top': '#122334',
  '--ui2-sunk-bottom': '#1B3349',
  '--ui2-well': '#102336',
  '--ui2-well-soft': '#152B3F',
  '--ui2-well-deep': '#0A1724',
  '--ui2-brass-highlight': '#EAC675',
  '--ui2-line': 'rgba(150, 195, 230, 0.24)',
  '--ui2-line-faint': 'rgba(150, 195, 230, 0.1)',
  '--ui2-text-ivory': '#F4F0E7',
  '--ui2-text-gold': '#EAC675',
  '--ui2-size-bevel': '2px',
  '--ui2-shadow': '0.42',
  '--ui2-drop': '0.28',
  '--ui2-bevel-shade': '0.26',
});

/** The custom properties made since main 7ec316e9 (v2.3.6780), so yesterday's block leaves them out
 *  (the navigation size is new and the same 13 the tiles read then, so it needs no `UI2_WAS` row). */
export const UI2_BORN = Object.freeze(['--ui2-line', '--ui2-line-faint', '--ui2-fs-nav', '--ui2-drop', '--ui2-bevel-shade']);

/* ══ v2.3.6841: THE OWNER'S V17 LOOK, for `?v17look` (card UI4 PR 2; on by default, `=0` today's) ══
 * The owner's menu redesign, V17 (docs/design/v17/MASTER-IMPLEMENTATION.md, the table of lines 37-47
 * and line 49): "Passive information | Recessed #0A1620 or flat aligned facts; no button border";
 * "Inspection | Recessed, restrained contrasting border #91A9B9, chevron or explicit Details";
 * "Navigation/preparation | Raised slate #294963, edge #698397"; "Selected tab/filter | Slate with
 * gold border/underline, persistent text cue and selected semantics"; "Adjust/toggle/dismiss | Neutral
 * slate ... not gold merely because interactive"; "Commit | Solid gold #E4BA68, dark text #141D22";
 * "Destructive/high-risk commit | Red #753439, clear light text"; "Disabled | Muted but readable,
 * reason available".  The values V17's words leave open (the selected tab's slate and gold, the neutral
 * slate, the disabled face, a danger's edge, the cue of a point to spend) are read from the owner's own
 * prototype's last rule for each role (`prototype.html` on claude/owner-handoff-v17, by grep:
 * `button[data-ui-role="tab"].active`, `"adjust"`, `:disabled`, `"danger"`, `.v17priority`), never made
 * up here.  Every one holds its words at 4.5 to 1 (tools/guards/ui2-tokens.test.mjs 15).  These are
 * NOT in ui2Vars() (yesterday's hash, suite 13, reads that): they are their own block, `.ui2.ui2-v17`,
 * which the kit root wears only while the look is on (src/ui/kit/shine.js), so `?v17look=0` draws
 * every pixel as before. */
export const UI2_V17 = Object.freeze({
  info: '#0A1620',          /* V17:39 passive: recessed */
  inspectEdge: '#91A9B9',   /* V17:40 inspection's border */
  go: '#294963',            /* V17:41 navigation's slate */
  goEdge: '#698397',        /* V17:41 its edge */
  tab: '#1A2E3D',           /* a tab not chosen (the prototype's "tab"; the kit's frame top) */
  selectEdge: '#EAC474',    /* V17:42 the chosen one's gold border and underline (the prototype's; the kit's brass highlight) */
  selectText: '#EAC474',    /* its words (the prototype's) */
  adjust: '#203644',        /* V17:43 the neutral slate (the prototype's "adjust", "dismiss", "toggle") */
  commit: '#E4BA68',        /* V17:44 solid gold */
  onCommit: '#141D22',      /* V17:44 dark text */
  danger: '#753439',        /* V17:45 */
  onDanger: '#FFFFFF',      /* V17:45 "clear light text" (the prototype's #fff) */
  dangerEdge: '#EE958A',    /* the prototype's (the kit's red face) */
  off: '#20303B',           /* V17:46 disabled: the prototype's face */
  offEdge: '#4B6275',       /* its edge (the owner's line) */
  offText: '#BCC8CC',       /* "muted but readable": the supporting colour, never the dim #6F8087 */
  ivory: '#F1F0E9',         /* V17:49 base ivory */
  muted: '#BCC8CC',         /* V17:49 supporting; also the chevron (#91A9B9 on a raised slate is 3.85 to 1) */
  priorityEdge: '#BC9B60',  /* V17:20 "Available points deserve a priority cue but not commit-style gold": the prototype's .v17priority edge */
  priorityText: '#F5CF83',  /* and its count's words (bold) */
});
/** V17:49's type scale, each band [least, most]; `token` the size the look gives it (the kit's own
 *  where it already sits in the band).  The smallest WORD is 12 (V17's metadata), never 11, save on
 *  the screens of UI2_V17_SMALL11 (measured: tools/qa/mp/mp-v17look.mjs); a count badge stays 10. */
export const UI2_V17_TYPE = Object.freeze({
  headline: Object.freeze({ band: Object.freeze([22, 26]), token: 24 }),
  title: Object.freeze({ band: Object.freeze([17, 19]), token: 17 }),
  primary: Object.freeze({ band: Object.freeze([14, 16]), token: 15 }),
  supporting: Object.freeze({ band: Object.freeze([13, 14]), token: 13 }),
  metadata: Object.freeze({ band: Object.freeze([12, 13]), token: 12 }),
  badge: Object.freeze({ band: Object.freeze([10, 11]), token: 10 }),
});
/** The kit's sizes under the look, and the V17 band each wears (the suite holds each inside it). */
export const UI2_V17_SIZES = Object.freeze({
  big: Object.freeze({ px: 24, band: 'headline' }),
  title: Object.freeze({ px: 17, band: 'title' }),
  value: Object.freeze({ px: 15, band: 'primary' }),
  label: Object.freeze({ px: 13, band: 'supporting' }),
  nav: Object.freeze({ px: 13, band: 'supporting' }),
  body: Object.freeze({ px: 12, band: 'metadata' }),
  small: Object.freeze({ px: 12, band: 'metadata' }),
  badge: Object.freeze({ px: 10, band: 'badge' }),
});
/** The screens that KEEP 11 for the smallest word under the look: at 12 the band would scroll more
 *  or cut a word there (mp-v17look measures 11 against 12).  Each is its root's own class or data mark.
 *  Measured 2026-11-27 (390 x 844 and 844 x 390): Bro's strip (AP, Quests, Clan, Guilds) runs 2 px past
 *  its labels' boxes at 12 (their descenders would be cut), both ways up; the Sword's page one line
 *  upright; the Shared page is the same template (attrTemplate.jsx) and keeps the Sword's size. */
export const UI2_V17_SMALL11 = Object.freeze(['[data-bro-landing]', '[data-weapon-page]', '[data-shared-page]']);

/** The look's custom properties, as [name, value] (the `.ui2.ui2-v17` block). */
export function ui2V17Vars() {
  const out = [];
  for (const k of Object.keys(UI2_V17)) out.push(['--ui2-v17-' + kebab(k), UI2_V17[k]]);
  for (const k of Object.keys(UI2_V17_TYPE)) out.push(['--ui2-v17-fs-' + k, UI2_V17_TYPE[k].token + 'px']);
  for (const k of Object.keys(UI2_V17_SIZES)) {
    if (UI2_V17_SIZES[k].px !== UI2_TYPE[k]) out.push(['--ui2-fs-' + kebab(k), UI2_V17_SIZES[k].px + 'px']);
  }
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
  /* v2.3.6780: `?ui2look=0` (`.ui2-was`): yesterday's values over today's, every one that changed */
  L.push('.ui2.ui2-was {');
  for (const n of Object.keys(UI2_WAS)) L.push(`  ${n}: ${UI2_WAS[n]};`);
  L.push('}');
  /* v2.3.6841: `?v17look` (`.ui2-v17`, on by default): V17's colours and type, after yesterday's */
  L.push('.ui2.ui2-v17 {');
  for (const [n, v] of ui2V17Vars()) L.push(`  ${n}: ${v};`);
  L.push('}');
  for (const sel of UI2_V17_SMALL11) L.push(`.ui2.ui2-v17${sel} { --ui2-fs-small: ${UI2_TYPE.small}px; }`);
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
