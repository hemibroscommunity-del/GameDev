/* ═══ v2.3.6646: THE GOLD BESIDE THE CONTROLLER IS STEEL (card PAD part 11) ═══
 *
 * The owner, 2026-11-26, asked which gold was still beside the steel
 * controller (the rings on Whirlwind and Shield Bash, the ready glow on
 * Attack and Special, the five energy blocks): "Turn steel".  The colours
 * are the steel sheet's own (src/game/padSkin.js PAD_STEEL, measured on
 * assets/icons-source/owner-2026-11-26-pad4/sheet.png); `?padgold=1` gives
 * the gold back for one phone.  This fails, played on the module and read
 * off the files that wear it:
 *
 *   1. A RING LEFT GOLD: padMetal not 'steel' in the tier by default; a stop
 *      of the steel ring gold (or not the steel's blue); the gradient not
 *      handed to the page (controlSkin RING_GRADIENTS), Skin not writing
 *      data-metal, AbilityButtons not asking tierMetal for the tier's
 *      buttons, or game.css's steel rule not painting the ring with it;
 *   2. THE READY GLOW NO BRIGHTER THAN NOT-READY: padFace's glow on a state
 *      that is not Ready, or off on Ready; the glow's opacity not above the
 *      not-ready's in game.css (the socket's and the attack disc's hot); the
 *      glow's colour less bright against the steel than the gold it replaced
 *      (WCAG contrast on the rim's side and its dark); PadSkin not reading
 *      padAccent with the switch;
 *   3. A FULL ENERGY BLOCK EQUAL TO AN EMPTY ONE: (part 11's question to the
 *      orchestrator: the blocks are a painted strip; see the status file);
 *   4. A GOLD HEX LEFT in the three places under the default (the accents,
 *      the ring's stops, the steel rules of game.css);
 *   5. THE SWITCH: `?padgold=1` throws it, absent or `=0` does not, and
 *      `?padskin=0` (what it needs) throws it too.
 *
 * A guard under tools/guards (server/test/run.mjs runs it; nothing deploys).
 */
import fs from 'node:fs';
import { PAD_STEEL, PAD_STEEL_RING, PAD_ACCENT, PAD_GOLD, padAccent, padMetal, padFace } from '../../src/game/padSkin.js';
import { readerFor } from '../../src/game/switches.js';

let failures = 0, passes = 0;
const check = (name, ok, detail) => {
  if (ok) { passes++; console.log('  ok   ' + name); }
  else { failures++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};
const read = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* a colour's hue (degrees), saturation and lightness, from '#RRGGBB' */
function hsl(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex));
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}
/* gold: a warm hue (orange to yellow) with colour in it */
const isGold = (hex) => { const c = hsl(hex); return !!c && c.h >= 20 && c.h <= 65 && c.s > 0.3 && c.l > 0.12; };
/* the steel's blue: the sheet's rim and light sit at 205 to 215 degrees */
const isSteel = (hex) => { const c = hsl(hex); return !!c && c.h >= 195 && c.h <= 225 && c.s > 0.1 && c.s < 0.75; };
function lum(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex));
  const v = [m[1], m[2], m[3]].map((h) => { const x = parseInt(h, 16) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const css = read('src/styles/game.css');
const skin = read('src/ui/panels/controlSkin.jsx');
const abil = read('src/ui/panels/AbilityButtons.jsx');
/* a rule's body by its exact selector (the first), or '' */
const ruleOf = (sel) => {
  const i = css.indexOf(sel + '{');
  if (i < 0) return '';
  return css.slice(i + sel.length + 1, css.indexOf('}', i));
};
const opacityOf = (body) => { const m = /(?:^|;)\s*opacity:\s*([0-9.]+)/.exec(body); return m ? Number(m[1]) : null; };

/* 1. the rings */
check('1a. padMetal: steel in the tier by default; the gold ring under ?padgold=1 and out of the tier',
  padMetal(true, false) === 'steel' && padMetal(true, true) === null && padMetal(false, false) === null);
const stops = [].concat(PAD_STEEL_RING.ring, PAD_STEEL_RING.press);
check('1b. every stop of the steel ring is the steel\'s blue, none gold',
  stops.length >= 6 && stops.every((s) => isSteel(s[1]) && !isGold(s[1])), stops.filter((s) => !isSteel(s[1]) || isGold(s[1])));
check('1c. the ring runs light to dark, top to bottom (the sheet\'s rim)',
  lum(PAD_STEEL_RING.ring[0][1]) > lum(PAD_STEEL_RING.ring[PAD_STEEL_RING.ring.length - 1][1]) * 3);
check('1d. controlSkin hands the steel gradients to the page (RING_GRADIENTS)',
  /btSkinSteel: PAD_STEEL_RING\.ring,/.test(skin) && /btSkinSteelPress: PAD_STEEL_RING\.press,/.test(skin));
check('1e. Skin writes data-metal; tierMetal asks padMetal with the switch',
  /'data-metal': props\.metal \|\| undefined,/.test(skin)
  && /export function tierMetal\(inTier\) \{ return padMetal\(!!inTier, sw\('padgold'\)\) \|\| undefined; \}/.test(skin));
check('1f. AbilityButtons (Whirlwind, Shield Bash) asks tierMetal for a button in the tier',
  /metal: tierMetal\(anchor\.face > 0\),/.test(abil));
const steelRing = ruleOf('.bt-skin[data-metal="steel"][data-state="normal"] .bt-skin-ringc,.bt-skin[data-metal="steel"][data-state="ready"] .bt-skin-ringc,.bt-skin[data-metal="steel"][data-state="on"] .bt-skin-ringc');
const pressRing = ruleOf('[data-pressed="1"] .bt-skin[data-metal="steel"][data-state] .bt-skin-ringc');
const hexOf = (body) => (/#[0-9A-Fa-f]{6}/.exec(body) || [''])[0];
check('1g. game.css paints the tier\'s ring with the steel gradient, its fallback the steel',
  /stroke:url\(#btSkinSteel\)/.test(steelRing) && isSteel(hexOf(steelRing)), steelRing);
check('1h. pressed, the steel a step darker (never the gold press)',
  /stroke:url\(#btSkinSteelPress\)/.test(pressRing) && isSteel(hexOf(pressRing)), pressRing);

/* 2. the ready glow */
for (const n of ['attack', 'special']) {
  check('2a. ' + n + ': the glow on Ready only',
    padFace(n, 'ready').glow === true && ['normal', 'disabled', 'cooldown', 'quiet', 'on'].every((s) => padFace(n, s).glow === false));
}
const base = opacityOf(ruleOf('.bt-pad-glow'));
const lit = opacityOf(ruleOf('.bt-pad[data-glow="1"] .bt-pad-glow'));
const hot = opacityOf(ruleOf('.bt-rjoy-base[data-pad][data-rstate="hot"] .bt-pad-glow'));
check('2b. the glow shows on Ready (a socket\'s and the attack disc\'s hot) and not otherwise',
  base === 0 && lit >= 0.6 && hot >= 0.6, { base, lit, hot });
check('2c. the glow is drawn in the accent (box-shadow in --pad-acc)',
  /box-shadow:0 0 0 2px var\(--pad-acc\),0 0 8px 2px var\(--pad-acc\)/.test(css));
for (const n of ['attack', 'special']) {
  const steel = padAccent(n, false), gold = padAccent(n, true);
  const sMid = contrast(steel, PAD_STEEL.rimMid), gMid = contrast(gold, PAD_STEEL.rimMid);
  const sDark = contrast(steel, PAD_STEEL.rimDark), gDark = contrast(gold, PAD_STEEL.rimDark);
  check('2d. ' + n + ': the glow at least as bright against the steel as the gold was (rim ' + sMid.toFixed(2) + ' vs ' + gMid.toFixed(2) + ', dark ' + sDark.toFixed(2) + ' vs ' + gDark.toFixed(2) + ')',
    sMid >= gMid && sDark >= gDark && sMid >= 3);
}
check('2e. PadSkin reads the accent through padAccent with the switch',
  /var acc = padAccent\(name, sw\('padgold'\)\);/.test(skin) && !/PAD_ACCENT\[name\]/.test(skin));

/* 4. no gold under the default */
check('4a. Attack\'s and Special\'s accents are the steel\'s cold light, not gold',
  [PAD_ACCENT.attack, PAD_ACCENT.special].every((h) => isSteel(h) && !isGold(h)) && PAD_ACCENT.attack === PAD_STEEL.light && PAD_ACCENT.special === PAD_STEEL.light);
check('4b. the gold is kept only for ?padgold=1 (PAD_GOLD is gold, and only there)',
  isGold(PAD_GOLD.attack) && isGold(PAD_GOLD.special) && padAccent('attack', true) === PAD_GOLD.attack && padAccent('special', false) !== PAD_GOLD.special);
check('4c. every PAD_STEEL colour is the steel\'s',
  Object.values(PAD_STEEL).every((h) => isSteel(h) && !isGold(h)), PAD_STEEL);
const steelRules = css.split('\n').filter((l) => l.includes('[data-metal="steel"]'));
const goldInRules = steelRules.flatMap((l) => (l.match(/#[0-9A-Fa-f]{6}/g) || []).filter(isGold)
  .concat((l.match(/rgba?\((\d+),(\d+),(\d+)/g) || []).map((r) => '#' + r.replace(/rgba?\(/, '').split(',').map((x) => Number(x).toString(16).padStart(2, '0')).join('')).filter(isGold)));
check('4d. the steel rules of game.css hold no gold (' + steelRules.length + ' rules)', steelRules.length >= 5 && goldInRules.length === 0, goldInRules);

/* 5. the switch */
const r = (q) => readerFor(q).sw('padgold');
check('5. ?padgold=1 throws it; absent, =0 and a longer name do not; ?padskin=0 throws it (what it needs)',
  r('?padgold=1') === true && r('') === false && r('?padgold=0') === false && r('?xpadgold=1') === false && r('?padskin=0') === true);

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
