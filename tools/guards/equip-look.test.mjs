/* ═══ v2.3.6698: THE EQUIPPED PANEL'S PALE GREEN, AND ITS PICTURES AT 94% (card UI2-equipgreen) ═══
 *
 * The owner, 2026-11-27: "Also on equipped page might the background color a
 * pale green color and make the thumbnail icons fill each slot better like
 * the inventory icons do".  The look is src/ui/mobile/dash/gearPanels.css
 * (the token --u2-gp-equip-ground), switched by src/game/equipLook.js
 * (`?equiplook=0` the old).  This suite reads the RULES of the two sheets
 * (gearPanels.css and the kit's ui2.css; a small rule reader below, as
 * ui3-weights.test's, since CI installs no CSS parser) and fails:
 *
 *   E1  the ground's token missing from gearPanels.css, not a hex, or
 *       defined in the kit's ui2.css (other cards' file);
 *   E2  a pale ground with pale words on it: the Equipped panel's label row
 *       given no colour of its own on the green (it would inherit the kit's
 *       muted ivory), or any `color:` under the green panel, or the ink the
 *       label row takes, under 4.5 to 1 against the ground;
 *   E3  the 94% leaking to every kit slot: a rule in gearPanels.css sizing
 *       `.u2-slot-art` that is not scoped to a worn cell's marked picture
 *       (`.u2-gp-worn ... .u2-slot-art.is-fill`), or the kit's own
 *       `.u2-slot-art` no longer 72% (`?uikit=1` unchanged);
 *   E4  the switch changing nothing: the green not gated on the root's
 *       `data-equip-look`, the root not wearing it from equipLookOn(), the
 *       worn picture's `is-fill` not given from equipLookOn() in WornCell (the
 *       ONE cell Gear and Bro's Equipment showcase share), or the CSS's 94%
 *       not equipLook.js's EQUIP_FILL;
 *   E5  the green on the wrong panel: a green rule on the Bag panel
 *       (`is-storage`), a look's summary (`is-summary`) or the showcase.
 *
 * THE DODGES are planted below (part P): each must be red.
 * Run: node tools/guards/equip-look.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EQUIP_FILL, EQUIP_FILL_WAS, EQUIP_MIN_CONTRAST } from '../../src/game/equipLook.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let fails = 0;
const ok = (name, cond, why) => { if (cond) console.log('ok   ' + name); else { fails++; console.log('FAIL ' + name + (why ? '  ' + JSON.stringify(why) : '')); } };

/* ── the rule reader: comments out, then `selector { body }` at the top level ── */
export function rules(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const decl = Object.create(null);
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      decl[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    }
    for (const sel of m[1].split(',')) out.push({ sel: sel.trim().replace(/\s+/g, ' '), decl });
  }
  return out;
}
/* the kit's tokens, as hex (the first definition: the `.ui2` block, today's look) */
export function tokens(css) {
  const t = Object.create(null);
  for (const r of rules(css)) for (const k in r.decl) if (k.startsWith('--') && !(k in t)) t[k] = r.decl[k];
  return t;
}
const hexRgb = (h) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h || '').trim());
  if (!m) return null;
  const x = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
};
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a, b) {
  const A = hexRgb(a), B = hexRgb(b);
  if (!A || !B) return 0;
  const la = lum(A), lb = lum(B);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const resolve = (v, toks) => {
  let s = String(v || '').trim();
  for (let i = 0; i < 4; i++) {
    const m = /^var\((--[\w-]+)\)$/.exec(s);
    if (!m) break;
    s = String(toks[m[1]] || '').trim();
  }
  return s;
};

const GREEN = '[data-equip-look]';
const WORN = '.u2-pane.is-worn';
const TOKEN = '--u2-gp-equip-ground';

/* every fault of the two sheets and the panel's source */
export function faults({ gp, kit, jsx }) {
  const out = [];
  const R = rules(gp);
  const kitToks = tokens(kit);
  const gpToks = tokens(gp);
  const toks = Object.assign(Object.create(null), kitToks, gpToks);
  /* E1 */
  const ground = gpToks[TOKEN];
  if (!ground || !hexRgb(ground)) out.push({ rule: 'E1', what: `gearPanels.css defines no hex ${TOKEN} (${ground})` });
  if (TOKEN in kitToks) out.push({ rule: 'E1', what: `${TOKEN} is defined in the kit's ui2.css` });
  /* E2: the label row's own ink on the green, and every colour under the green panel */
  const green = R.filter((r) => r.sel.includes(GREEN) && r.sel.includes(WORN));
  const head = green.find((r) => /\.u2-pane-head$/.test(r.sel) && r.decl.color);
  if (!head) out.push({ rule: 'E2', what: 'the Equipped panel\'s label row takes no colour of its own on the green (the kit\'s muted ivory on a pale ground)' });
  for (const r of green) {
    if (!r.decl.color) continue;
    const c = resolve(r.decl.color, toks);
    const k = contrast(c, ground);
    if (k < EQUIP_MIN_CONTRAST) out.push({ rule: 'E2', what: `${r.sel} { color: ${r.decl.color} } is ${k.toFixed(2)} to 1 on ${ground}` });
  }
  if (!green.some((r) => /background/.test(Object.keys(r.decl).join(' ')) && /var\(--u2-gp-equip-ground\)/.test(r.decl.background || r.decl['background-color'] || '')))
    out.push({ rule: 'E4', what: `no rule under ${GREEN} ${WORN} paints var(${TOKEN})` });
  /* E5: the token painted anywhere else */
  for (const r of R) {
    const bg = (r.decl.background || '') + (r.decl['background-color'] || '');
    if (!bg.includes(TOKEN)) continue;
    if (!(r.sel.includes(GREEN) && r.sel.includes(WORN)) || /is-storage|is-summary|data-gear-showcase/.test(r.sel))
      out.push({ rule: 'E5', what: `${r.sel} paints the green outside the Equipped panel` });
  }
  /* E3 */
  const pct = Math.round(EQUIP_FILL * 100) + '%';
  const art = R.filter((r) => /\.u2-slot-art\b/.test(r.sel) && (r.decl.width || r.decl.height));
  if (!art.length) out.push({ rule: 'E3', what: 'gearPanels.css sizes no worn picture' });
  for (const r of art) {
    if (!/\.u2-gp-worn\b.*\.u2-slot-art\.is-fill\b/.test(r.sel)) out.push({ rule: 'E3', what: `${r.sel} sizes .u2-slot-art outside a worn cell's marked picture` });
    else if (r.decl.width !== pct || r.decl.height !== pct) out.push({ rule: 'E4', what: `${r.sel} is ${r.decl.width} x ${r.decl.height}, not equipLook.js's ${pct}` });
  }
  const kitArt = rules(kit).find((r) => r.sel === '.ui2 .u2-slot-art');
  const was = Math.round(EQUIP_FILL_WAS * 100) + '%';
  if (!kitArt || kitArt.decl.width !== was || kitArt.decl.height !== was) out.push({ rule: 'E3', what: `the kit's .ui2 .u2-slot-art is not ${was} (${kitArt && kitArt.decl.width})` });
  /* E4: the source wears the switch (the root's mark, WornCell's picture) */
  if (!/data-equip-look=\{\s*equipLookOn\(\)\s*\?\s*'1'\s*:\s*undefined\s*\}/.test(jsx)) out.push({ rule: 'E4', what: 'GearPanels\' root does not wear data-equip-look from equipLookOn()' });
  const wc = /function WornCell\b[\s\S]*?\n\}\n/.exec(jsx);
  if (!wc || !/'u2-slot-art'\s*\+\s*\(\s*equipLookOn\(\)\s*\?\s*' is-fill'\s*:\s*''\s*\)/.test(wc[0])) out.push({ rule: 'E4', what: 'WornCell\'s picture is not marked is-fill from equipLookOn()' });
  return out;
}

const gp = read('src/ui/mobile/dash/gearPanels.css');
const kit = read('src/ui/kit/ui2.css');
const jsx = read('src/ui/mobile/dash/GearPanels.jsx');

/* ── part 1: the tree as it is ── */
const now = faults({ gp, kit, jsx });
ok('E1-E5: the Equipped panel\'s look holds (the token, the ink, the 94% scoped, the switch, the panel)', now.length === 0, now);
const toks = Object.assign(Object.create(null), tokens(kit), tokens(gp));
const ground = toks[TOKEN];
const ink = resolve((rules(gp).find((r) => r.sel.includes(GREEN) && /\.u2-pane-head$/.test(r.sel)) || { decl: {} }).decl.color, toks);
console.log(`     the ground ${ground}, its label ink ${ink}: ${contrast(ink, ground).toFixed(2)} to 1`);

/* ── part P: the dodges, planted; each must be red ── */
const red = (name, f, rule) => ok('plant red: ' + name, f.some((x) => x.rule === rule), f);
red('the token gone', faults({ gp: gp.replace(/--u2-gp-equip-ground:\s*#[0-9A-Fa-f]+;/, ''), kit, jsx }), 'E1');
red('the token moved into the kit', faults({ gp, kit: kit.replace('.ui2 {', '.ui2 { --u2-gp-equip-ground: #C6DCCD;'), jsx }), 'E1');
red('the label row left the kit\'s muted ivory', faults({ gp: gp.replace(/(\.u2-pane\.is-worn \.u2-pane-head \{ )color: [^;]+;/, '$1'), kit, jsx }), 'E2');
red('pale words on the pale ground', faults({ gp: gp.replace(/(\.u2-pane\.is-worn \.u2-pane-head \{ color: )[^;]+;/, '$1var(--ui2-text-muted);'), kit, jsx }), 'E2');
red('a pale ground near white under ivory words', faults({ gp: gp + '\n.ui2.u2-gp[data-equip-look] .u2-pane.is-worn .u2-x { color: var(--ui2-text-ivory); }', kit, jsx }), 'E2');
red('the 94% on every kit slot', faults({ gp: gp + '\n.ui2 .u2-slot-art { width: 94%; height: 94%; }', kit, jsx }), 'E3');
red('the 94% on every worn picture, not only the marked one', faults({ gp: gp.replace('.u2-slot-art.is-fill {', '.u2-slot-art {'), kit, jsx }), 'E3');
red('the kit\'s own slot picture changed', faults({ gp, kit: kit.replace('.u2-slot-art { width: 72%; height: 72%;', '.u2-slot-art { width: 94%; height: 94%;'), jsx }), 'E3');
red('the green not gated on the switch', faults({ gp: gp.replace(/\.ui2\.u2-gp\[data-equip-look\] \.u2-pane\.is-worn \{/, '.ui2.u2-gp .u2-pane.is-worn {'), kit, jsx }), 'E4');
red('the root wearing the mark always', faults({ gp, kit, jsx: jsx.replace(/data-equip-look=\{equipLookOn\(\) \? '1' : undefined\}/, "data-equip-look=\"1\"") }), 'E4');
red('the picture marked always (the switch changing nothing)', faults({ gp, kit, jsx: jsx.replace("'u2-slot-art' + (equipLookOn() ? ' is-fill' : '')", "'u2-slot-art is-fill'") }), 'E4');
red('the CSS at 90%, not EQUIP_FILL', faults({ gp: gp.replace('.u2-slot-art.is-fill { width: 94%; height: 94%; }', '.u2-slot-art.is-fill { width: 90%; height: 90%; }'), kit, jsx }), 'E4');
red('the green on the Bag panel', faults({ gp: gp + '\n.ui2.u2-gp[data-equip-look] .u2-pane.is-storage { background: var(--u2-gp-equip-ground); }', kit, jsx }), 'E5');
red('the green on a look\'s summary', faults({ gp: gp + '\n.ui2.u2-gp .u2-pane.is-summary { background: var(--u2-gp-equip-ground); }', kit, jsx }), 'E5');

console.log(fails ? `${fails} FAILED` : 'all green');
process.exit(fails ? 1 : 0);
