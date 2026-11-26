/* ═══ v2.3.6681: ESC CLOSES THE INNERMOST FIRST (card UI2-frame, part 3) ═══
 *
 * On a computer Esc presses the ✕ in front (src/game/deskKeys.js
 * frontControl, ESC_SEL).  Under the dashboard's frame the kit's header
 * carries a Close that shuts the WHOLE dashboard, and in the page's order it
 * can come after a page's own ✕: with the Ranks picker up, Esc shut the
 * dashboard and the picker went with it (mp-ranksstyle stopped at 3c, the
 * frame "closed").  The rule now: the frame's Close says it is the OUTER one
 * (`data-esc-outer`) and is pressed only when no other ✕ is in front.  True
 * for every page under the frame (Gear's filter menu and its card, the item
 * card, the Codex's...), not Ranks alone.
 *
 * Here, not in server/test (a file there deploys the worker).  deskKeys.js
 * imports through the page's '@/' paths, so the suite lifts frontControl's
 * own text out of the file and runs it against a small page made in node:
 * elements in the page's order, each with a box, and elementFromPoint
 * answering the last painted element under a point (a scrim over a window
 * covers it).
 *   part 1  what Esc presses (each a named check);
 *   part 2  THE DODGES, each PLANTED as a change to the real function's text
 *           and the checks run against it: each must turn a check red, every
 *           run (a plant that stays green fails the suite):
 *     D1 the first in the page's order wins, not the last
 *     D2 the frame's Close is an ordinary ✕ (the last in order wins: the
 *        header's Close over an open picker -- the bug as it was)
 *     D3 the outer Close is preferred to an inner ✕
 *     D4 an inner ✕ that is hidden, covered or removed still wins (the
 *        "in front" test skipped)
 *     D5 a second outer Close does not replace the first (the first kept)
 *     D6 a press on a ✕'s own glyph (a child under the point) does not count
 *     D7 with no inner ✕ the outer Close is never pressed
 *   part 3  the code: the ALLOW list of files that wear `data-esc-outer`
 *           (only the kit's header), and the header's Close wears it.
 *
 * Run: node tools/guards/esc-front.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 600))); }
}

/* ── the real function's text ── */
const DESK = read('src/game/deskKeys.js');
const start = DESK.indexOf('export function frontControl(');
const end = DESK.indexOf('\n}\n', start);
check('0 frontControl is found in deskKeys.js', start >= 0 && end > start);
const SRC = DESK.slice(start, end + 2).replace('export function', 'function');
const build = (src) => new Function('innerWidth', 'innerHeight', src + '\nreturn frontControl;');

/* ── a small page ── */
const VW = 400, VH = 800;
function page() {
  const all = [];          /* the page's order (and the paint order) */
  const mk = (name, box, attrs = {}, parent = null) => {
    const el = {
      name, box, attrs, parent, attached: true,
      getBoundingClientRect() {
        return this.attached && !this.hidden ? { left: box[0], top: box[1], width: box[2], height: box[3] } : { left: 0, top: 0, width: 0, height: 0 };
      },
      hasAttribute(a) { return Object.prototype.hasOwnProperty.call(this.attrs, a); },
      getAttribute(a) { return this.hasAttribute(a) ? this.attrs[a] : null; },
      contains(o) { for (let x = o; x; x = x.parent) if (x === this) return true; return false; },
    };
    all.push(el);
    return el;
  };
  const doc = {
    querySelectorAll() { return all.filter((e) => e.attached && e.hasAttribute('data-esc')); },
    elementFromPoint(x, y) {
      let hit = null;
      for (const e of all) {
        if (!e.attached || e.hidden) continue;
        const [l, t, w, h] = e.box;
        if (x >= l && x < l + w && y >= t && y < t + h) hit = e;
      }
      return hit;
    },
  };
  return { mk, doc, all };
}
const CLOSE = { 'data-esc': '', 'data-esc-outer': '' };
const X = { 'data-esc': '' };

/* ── part 1: what Esc presses ── */
function cases(front) {
  const out = [];
  const ok = (name, cond, detail) => out.push({ name, ok: !!cond, detail });
  const at = (doc) => { const el = front('[data-esc]', doc); return el ? el.name : null; };

  /* 1a two ✕s inside the page, both in front: the last in the page's order */
  { const p = page(); p.mk('gearFilterX', [10, 100, 44, 44], X); p.mk('gearCardX', [100, 100, 44, 44], X);
    ok('1a of two ✕s in front, the last in the page\'s order is pressed', at(p.doc) === 'gearCardX', at(p.doc)); }
  /* 1b the frame's Close AFTER the picker's ✕ in the page's order: the picker's */
  { const p = page(); p.mk('pickerX', [300, 200, 44, 44], X); p.mk('headClose', [340, 10, 44, 44], CLOSE);
    ok('1b the picker\'s ✕ wins over the header\'s Close that comes after it', at(p.doc) === 'pickerX', at(p.doc)); }
  /* 1c ...and before it */
  { const p = page(); p.mk('headClose', [340, 10, 44, 44], CLOSE); p.mk('pickerX', [300, 200, 44, 44], X);
    ok('1c the picker\'s ✕ wins over the header\'s Close that comes before it', at(p.doc) === 'pickerX', at(p.doc)); }
  /* 1d only the frame's Close: Esc shuts the dashboard */
  { const p = page(); p.mk('headClose', [340, 10, 44, 44], CLOSE);
    ok('1d with no ✕ inside the page, the header\'s Close is pressed', at(p.doc) === 'headClose', at(p.doc)); }
  /* 1e an inner ✕ hidden (display: none, no box) */
  { const p = page(); const x = p.mk('pickerX', [300, 200, 44, 44], X); x.hidden = true; p.mk('headClose', [340, 10, 44, 44], CLOSE);
    ok('1e a hidden inner ✕ does not keep the Close from its press', at(p.doc) === 'headClose', at(p.doc)); }
  /* 1f an inner ✕ removed from the page: the next Esc after the picker shut */
  { const p = page(); const x = p.mk('pickerX', [300, 200, 44, 44], X); p.mk('headClose', [340, 10, 44, 44], CLOSE);
    const first = at(p.doc); x.attached = false;
    ok('1f the first Esc shuts the picker, the next (its ✕ gone) the dashboard', first === 'pickerX' && at(p.doc) === 'headClose', first + ' then ' + at(p.doc)); }
  /* 1g an inner ✕ covered (a scrim drawn over it, not over the header) */
  { const p = page(); p.mk('pickerX', [300, 200, 44, 44], X); p.mk('headClose', [340, 10, 44, 44], CLOSE); p.mk('scrim', [0, 100, VW, 700], {});
    ok('1g a covered inner ✕ does not keep the Close from its press', at(p.doc) === 'headClose', at(p.doc)); }
  /* 1h an inner ✕ off the screen */
  { const p = page(); p.mk('pickerX', [300, VH + 40, 44, 44], X); p.mk('headClose', [340, 10, 44, 44], CLOSE);
    ok('1h an inner ✕ off the screen does not keep the Close from its press', at(p.doc) === 'headClose', at(p.doc)); }
  /* 1i the point lands on the ✕'s glyph (a child of the button) */
  { const p = page(); const x = p.mk('pickerX', [300, 200, 44, 44], X); p.mk('glyph', [300, 200, 44, 44], {}, x); p.mk('headClose', [340, 10, 44, 44], CLOSE);
    ok('1i an inner ✕ whose glyph is under its middle is in front', at(p.doc) === 'pickerX', at(p.doc)); }
  /* 1j two outer Closes (a frame over a frame): the last */
  { const p = page(); p.mk('closeA', [340, 10, 44, 44], CLOSE); p.mk('closeB', [340, 60, 44, 44], CLOSE);
    ok('1j of two outer Closes, the last in the page\'s order', at(p.doc) === 'closeB', at(p.doc)); }
  /* 1k nothing at all */
  { const p = page(); ok('1k nothing to press: null', at(p.doc) === null, at(p.doc)); }
  /* 1l a window over the dashboard, its own ✕ in front, the header's under the scrim */
  { const p = page(); p.mk('headClose', [340, 10, 44, 44], CLOSE); p.mk('scrim', [0, 0, VW, VH], {}); p.mk('popupX', [200, 300, 44, 44], X);
    ok('1l a window\'s ✕ over the dashboard is pressed', at(p.doc) === 'popupX', at(p.doc)); }
  return out;
}

const real = cases(build(SRC)(VW, VH));
for (const c of real) check(c.name, c.ok, c.detail);

/* ── part 2: the dodges, planted ── */
const PLANTS = [
  ['D1 the first in order wins', (s) => s.replace("outer = el;\n    else front = el;", "{ if (!outer) outer = el; }\n    else if (!front) front = el;")],
  ['D2 the frame\'s Close is an ordinary ✕', (s) => s.replace("el.hasAttribute && el.hasAttribute('data-esc-outer')", 'false')],
  ['D3 the outer Close preferred', (s) => s.replace('return front || outer;', 'return outer || front;')],
  ['D4 the "in front" test skipped', (s) => s.replace('if (!(at && (at === el || el.contains(at)))) continue;', '').replace('if (!(r.width > 0 && r.height > 0)) continue;', '').replace('if (x < 0 || y < 0 || x >= vw || y >= vh) continue;', '')],
  ['D5 a second outer Close does not replace the first', (s) => s.replace("outer = el;\n    else", "{ if (!outer) outer = el; }\n    else")],
  ['D6 a child under the point does not count', (s) => s.replace('(at === el || el.contains(at))', '(at === el)')],
  ['D7 the outer Close never pressed', (s) => s.replace('return front || outer;', 'return front;')],
];
for (const [name, plant] of PLANTS) {
  const src = plant(SRC);
  if (src === SRC) { check('2 ' + name + ': the plant applies to the real text', false, 'the text it changes is gone'); continue; }
  let reds;
  try { reds = cases(build(src)(VW, VH)).filter((c) => !c.ok).map((c) => c.name.slice(0, 2)); }
  catch (e) { reds = ['threw ' + e.message]; }
  check('2 ' + name + ': turns red (' + reds.join(', ') + ')', reds.length > 0);
}

/* ── part 3: the code ── */
function walk(dir, out = []) {
  for (const n of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const p = dir + '/' + n.name;
    if (n.isDirectory()) walk(p, out);
    else if (/\.(jsx?|mjs)$/.test(n.name)) out.push(p);
  }
  return out;
}
const ALLOW = ['src/ui/kit/Header.jsx'];
const wearers = walk('src').filter((p) => /data-esc-outer=/.test(read(p)));
check('3a only the kit\'s header wears data-esc-outer (the ALLOW list: ' + ALLOW.join(', ') + ')',
  JSON.stringify(wearers) === JSON.stringify(ALLOW), wearers.join(', '));
const HEAD = read('src/ui/kit/Header.jsx');
const closeTag = (HEAD.match(/<button[^>]*data-u2="close"[^>]*>/) || [''])[0];
check('3b the header\'s Close wears data-esc and data-esc-outer', /data-esc=""/.test(closeTag) && /data-esc-outer=""/.test(closeTag), closeTag);
const RANKS = read('src/ui/mobile/dash/RanksPage.jsx');
const pickTag = (RANKS.match(/<button[^>]*data-lb-menu-close[^>]*>/) || [''])[0];
check('3c the Ranks picker\'s ✕ wears data-esc and is an inner ✕', /data-esc=""/.test(pickTag) && !/data-esc-outer/.test(pickTag), pickTag);
check('3d ESC_SEL still presses every [data-esc]', /export const ESC_SEL = '\[data-esc\]/.test(DESK));

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
