/* ═══ v2.3.6791: NO TUTORIAL MESSAGE OVER THE CONTROLLER (card UI3, PR 11) ═══
 *
 * The owner, 2026-11-27, after the new controller landed: "Needs to fix
 * tutorial messages over new controller area."  The rule is
 * src/game/tutorClear.js (what it does is tested here, on the controller's
 * own layout, padSkin.js padLayout); the messages ask it through
 * src/ui/tutorSpot.js; mp-tutorclear plays them on the phone page.
 *
 *   1  the housings from the layout: upright 375 (the stick's lobe, the low
 *      rail, the tall right lobe, on the band), sideways 667 (the shell as
 *      tall as at 430, the rail stretched), the tier on the right lobe, none
 *      with no controller;
 *   2  a card hung BELOW a target near the stick (upright): up, AIR over the
 *      highest housing it spans;
 *   3  a centred "Next:" toast 14 px over the band: over the right lobe,
 *      upright and sideways (the band's height is not the controller's);
 *   4  sideways, the coach's card below the Mayor, on the right lobe: slides
 *      into the open middle and keeps its height (nearer its target);
 *   5  a tall card on a short screen: never over the ceiling, shrinks;
 *   6  a box clear already, or no controller: unchanged;
 *   7  THE MESSAGES ASK (the syntax tree): each of TUTOR_MESSAGES' elements
 *      carries its data-tutor and takes its place from a call of the rule's
 *      glue (coachClear, tutorOver, tutorTop, ctlCardClear; the arrow's
 *      place() calls clearOf with tutorKeep);
 *   8  A CENSUS of messages hung from the band by a fixed `bottom` (a style
 *      whose bottom is the band's height plus px, not asking the rule) in
 *      src/ui: per file, it may only fall.
 * Plants (each must turn its own check red):
 *   T1 the rule clearing the band only (the housings' tops ignored): 2, 3
 *   T2 right upright, wrong sideways (the shell's height taken from the
 *      column's width, uncapped): 1
 *   T3 a message pushed over the ceiling to clear the controller: 5
 *   T4 the toast hung at a fixed `bottom` again: 7 (and 8)
 *   T5 the coach's card placed without asking (the welcome fixed, the
 *      coach's below-target card left): 7
 *   T6 a new message tomorrow, `bottom: calc(var(--dash-h) + 160px)`: 8
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { visit } from './lib/writesOf.mjs';
import { bigFiles } from './lib/bigFileSuites.mjs';   /* the big files by their names, never their paths written here */
import { housingBoxes, clearOf, meets, AIR, TUTOR_MESSAGES, HOUSING_TOP_REF, REF_H } from '../../src/game/tutorClear.js';
import { padLayout } from '../../src/game/padSkin.js';
import { PAD_ART } from '../../src/data/padArt.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? '  (' + detail + ')' : '')); }
}
const near = (a, b, e = 0.6) => Math.abs(a - b) <= e;

/* ── 0. the outline's tops sit over the housing's measured inside ── */
{
  const top = PAD_ART.housing.inside.top.filter((v) => typeof v === 'number');
  const railIn = PAD_ART.housing.inside.top[Math.round(400 / PAD_ART.housing.inside.step)];
  check('0  the outline is over its inside (the lobes, the rail)', HOUSING_TOP_REF.right <= Math.min(...top)
    && HOUSING_TOP_REF.left < 50 && HOUSING_TOP_REF.rail < railIn && railIn - HOUSING_TOP_REF.rail < 30, JSON.stringify({ railIn }));
}

/* ── the cases, each a function of (housingBoxes, clearOf), so a plant can break one ── */
const C = {
  one(HB) {
    const bad = [];
    const up = padLayout(false, 375), side = padLayout(true, 667);
    const u = HB(up, 0), s = HB(side, 0);
    const k = up.shell.h / REF_H;
    if (u.length !== 3) bad.push('upright: three housings');
    else {
      if (!near(u[0].hi, (REF_H - HOUSING_TOP_REF.left) * k)) bad.push('upright stick lobe ' + u[0].hi);
      if (!near(u[1].hi, (REF_H - HOUSING_TOP_REF.rail) * k)) bad.push('upright rail ' + u[1].hi);
      if (!near(u[2].hi, up.shell.h)) bad.push('upright right lobe ' + u[2].hi);
      if (!(u[1].hi < u[0].hi && u[0].hi < u[2].hi)) bad.push('upright: the rail low, the right lobe tallest');
      if (!near(u[2].r, 375) || !near(u[1].l, up.shell.cutL)) bad.push('upright: the cuts');
    }
    if (s.length !== 3) bad.push('sideways: three housings');
    else {
      /* sideways the shell is as tall as at 430 (padLayout's cap), the rail stretched to 667 */
      if (!near(s[2].hi, Math.round(REF_H * 430 / 920))) bad.push('sideways right lobe ' + s[2].hi);
      if (!near(s[2].r, 667) || !(s[1].r - s[1].l > 300)) bad.push('sideways: the rail stretched ' + (s[1].r - s[1].l));
    }
    const t = HB(up, 40);
    if (!t.length || !near(t[2].hi, up.shell.h + 40) || !near(t[0].hi, u[0].hi)) bad.push('the tier on the right lobe only');
    if (HB(null, 0).length !== 0) bad.push('no controller: no housings');
    return bad;
  },
  two(HB, CO) {
    const L = padLayout(false, 375), keep = HB(L, 0);
    const want = { l: 8, r: 228, lo: 40, hi: 92 };   /* below a target near the stick */
    const got = CO(want, keep, { ceil: 600 });
    const bad = [];
    if (keep.some((k) => meets(got, k))) bad.push('still meets a housing ' + JSON.stringify(got));
    const reach = Math.max(...keep.filter((k) => got.l < k.r && got.r > k.l).map((k) => k.hi));
    if (!near(got.lo, reach + AIR, 1)) bad.push('not AIR over the highest housing it spans: ' + got.lo + ' vs ' + (reach + AIR));
    if (got.hi - got.lo !== 52 || got.cut !== 0) bad.push('its height kept');
    return bad;
  },
  three(HB, CO) {
    const bad = [];
    for (const [land, vw] of [[false, 375], [true, 667]]) {
      const L = padLayout(land, vw), keep = HB(L, 0);
      const w = Math.min(320, vw - 28), l = (vw - w) / 2;
      const got = CO({ l, r: l + w, lo: 14, hi: 58 }, keep, {});
      if (keep.some((k) => meets(got, k))) bad.push((land ? 'sideways' : 'upright') + ': the toast meets a housing at ' + got.lo);
      if (got.lo < 14 + L.shell.h * 0.5) bad.push((land ? 'sideways' : 'upright') + ': the band cleared, not the housings (' + got.lo + ')');
    }
    return bad;
  },
  four(HB, CO) {
    const L = padLayout(true, 667), keep = HB(L, 0);
    /* the Mayor's card below him: page top 156, 50 tall, band top at 327 -> lo 121, hi 171; x 289-509 */
    const want = { l: 289, r: 509, lo: 121, hi: 171 };
    const got = CO(want, keep, { slide: 160, minL: 8, maxR: 659 });
    const bad = [];
    if (keep.some((k) => meets(got, k))) bad.push('meets a housing');
    if (!near(got.lo, want.lo)) bad.push('rose (' + got.lo + ') where a slide into the open middle kept it by its target');
    if (!(got.l < want.l && want.l - got.l <= 160)) bad.push('no slide left, off the right lobe: ' + got.l);
    return bad;
  },
  five(HB, CO) {
    const L = padLayout(true, 667), keep = HB(L, 40);
    /* a 176 px tour card sideways, 375 tall with a 46 px band: the room under
       the top bar (ceil, px over the band) is short of it */
    const ceil = 375 - 46 - 56;
    const got = CO({ l: 160, r: 496, lo: 0, hi: 176 }, keep, { ceil });
    const bad = [];
    if (got.hi > ceil + 0.01) bad.push('over the ceiling: ' + got.hi + ' > ' + ceil);
    if (keep.some((k) => meets(got, k))) bad.push('meets a housing');
    if (!(got.cut > 0 && near(got.hi - got.lo, 176 - got.cut))) bad.push('not shrunk to the room: cut ' + got.cut);
    return bad;
  },
  six(HB, CO) {
    const bad = [];
    const keep = HB(padLayout(false, 375), 0);
    const clear = { l: 100, r: 300, lo: 300, hi: 350 };
    const g = CO(clear, keep, { ceil: 320 });
    if (g.moved || g.lo !== 300 || g.l !== 100) bad.push('a clear box moved');
    const n = CO({ l: 0, r: 375, lo: 10, hi: 50 }, HB(null, 0), {});
    if (n.moved || n.lo !== 10) bad.push('with no controller it moved');
    return bad;
  },
};
const run = (name, HB, CO) => C[name](HB, CO);
check('1  the housings from the controller\'s layout, upright and sideways, the tier', run('one', housingBoxes, clearOf).length === 0, run('one', housingBoxes, clearOf).join('; '));
check('2  a card below a target near the stick goes up, AIR over the highest housing', run('two', housingBoxes, clearOf).length === 0, run('two', housingBoxes, clearOf).join('; '));
check('3  a centred toast 14 px over the band clears the housings, upright and sideways', run('three', housingBoxes, clearOf).length === 0, run('three', housingBoxes, clearOf).join('; '));
check('4  sideways the Mayor\'s card slides off the right lobe, its height kept', run('four', housingBoxes, clearOf).length === 0, run('four', housingBoxes, clearOf).join('; '));
check('5  a tall card on a short screen: under the ceiling, shrunk', run('five', housingBoxes, clearOf).length === 0, run('five', housingBoxes, clearOf).join('; '));
check('6  a clear box, or no controller: unchanged', run('six', housingBoxes, clearOf).length === 0, run('six', housingBoxes, clearOf).join('; '));

/* ── 7. the messages ask the rule (their syntax tree) ── */
const RULE = new Set(['coachClear', 'tutorOver', 'tutorTop', 'ctlCardClear', 'clearOf']);
/* does this expression (or a binding it reads, three steps deep) call the rule */
function asks(p, node, depth = 0) {
  if (!node || depth > 3) return false;
  let hit = false;
  const walk = (n) => {
    if (!n || hit || typeof n !== 'object') return;
    if (n.type === 'CallExpression' && n.callee && RULE.has(n.callee.name)) { hit = true; return; }
    if (n.type === 'Identifier' && depth < 3) {
      const b = p.scope.getBinding(n.name);
      if (b) {
        const inits = [b.path.node.init].concat(b.constantViolations.map((v) => v.node.right));
        for (const i of inits) if (i && asks(b.path, i, depth + 1)) { hit = true; return; }
      }
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'leadingComments' || k === 'trailingComments') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v);
    }
  };
  walk(node);
  return hit;
}
const keyOf = (k) => (k && (k.name || k.value)) || '';
/* each element carrying `attr`: { tutor, placed } -- placed: its style asks
   (the style object a rule call, or its top / bottom asks) */
function messagesIn(code, attr) {
  const out = [];
  const judge = (p, styleNode, tutor) => {
    let placed = false;
    if (styleNode) {
      if (styleNode.type === 'CallExpression' && RULE.has(styleNode.callee.name)) placed = true;
      else if (styleNode.type === 'ObjectExpression') {
        for (const pr of styleNode.properties) if ((keyOf(pr.key) === 'top' || keyOf(pr.key) === 'bottom') && asks(p, pr.value)) placed = true;
      }
    }
    out.push({ tutor, placed });
  };
  visit(code, {
    JSXOpeningElement(p) {
      const at = p.node.attributes.filter((a) => a.type === 'JSXAttribute');
      if (!at.some((a) => a.name.name === attr)) return;
      const t = at.find((a) => a.name.name === 'data-tutor');
      const st = at.find((a) => a.name.name === 'style');
      judge(p, st && st.value && st.value.expression, t && t.value && t.value.value);
    },
    ObjectExpression(p) {
      const props = p.node.properties.filter((x) => x.type === 'ObjectProperty');
      if (!props.some((x) => keyOf(x.key) === attr)) return;
      const t = props.find((x) => keyOf(x.key) === 'data-tutor');
      const st = props.find((x) => keyOf(x.key) === 'style');
      judge(p, st && st.value, t && t.value && t.value.value);
    },
  });
  return out;
}
function check7(files) {
  const bad = [];
  for (const [id, m] of Object.entries(TUTOR_MESSAGES)) {
    const code = files[m.file];
    if (id === 'arrow') {
      /* a DOM node: its words wear the attribute (setAttribute), and place() moves the arrow by the rule */
      if (!code.includes("setAttribute('" + m.attr + "'") || !code.includes("setAttribute('data-tutor', 'arrow')")) bad.push('arrow: its words unmarked');
      let ok = false;
      visit(code, { FunctionDeclaration(p) {
        if (p.node.id.name !== 'place') return;
        let k = false, c = false;
        p.traverse({ CallExpression(q) { const n = q.node.callee.name; if (n === '_keep') k = true; if (n === 'clearOf') c = true; } });
        ok = k && c;
      } });
      if (!ok) bad.push('arrow: place() does not ask the rule (clearOf with the housings handed in, _keep)');
      if (!/^guideArrowKeep\(tutorKeep\);$/m.test(files['src/ui/tutorSpot.js'] || '')) bad.push('arrow: tutorSpot.js never hands it the housings (guideArrowKeep(tutorKeep))');
      continue;
    }
    const els = messagesIn(code, m.attr);
    if (!els.length) bad.push(id + ': no element carries ' + m.attr + ' in ' + m.file);
    for (const e of els) {
      if (e.tutor !== id) bad.push(id + ': ' + m.attr + ' without data-tutor="' + id + '"');
      if (!e.placed && id !== 'controls') bad.push(id + ': placed without asking the rule');
    }
    if (id === 'controls') {
      /* the tour's card: its top is cardTop, which the rule's answer writes */
      let ok = false;
      visit(code, { AssignmentExpression(p) {
        const l = p.node.left, r = p.node.right;
        if (l.type === 'Identifier' && l.name === 'cardTop' && r.type === 'MemberExpression' && asks(p, r.object)) ok = true;
      } });
      if (!ok) bad.push('controls: cardTop never takes the rule\'s answer');
    }
  }
  return bad;
}
const FILES = Object.create(null);
for (const m of Object.values(TUTOR_MESSAGES)) FILES[m.file] = read(m.file);
FILES['src/ui/tutorSpot.js'] = read('src/ui/tutorSpot.js');
{
  const b = check7(FILES);
  check('7  every message asks the rule (coach, toast, install card, the arrow\'s words, the tour\'s card)', b.length === 0, b.join('; '));
}

/* ── 8. the census: messages hung from the band at a fixed `bottom` ── */
/* the controller's own files place controls, not messages */
const CONTROLS = /^src\/ui\/panels\/(ShieldButton|TouchControls|PadHousings|TrapButton|JumpButton|SprintButton|QuickEatButton|AbilityButtons|WeaponPill|SkateButton|ElementBurstButton|BlockButton)\b/;
function bandHung(code) {
  let n = 0;
  visit(code, { ObjectProperty(p) {
    if (keyOf(p.node.key) !== 'bottom') return;
    let src = '';
    const grab = (x) => {
      if (!x) return;
      if (x.type === 'StringLiteral') src += x.value;
      else if (x.type === 'TemplateLiteral') x.quasis.forEach((q) => { src += q.value.cooked; });
      else if (x.type === 'BinaryExpression') { grab(x.left); grab(x.right); }
      else if (x.type === 'ConditionalExpression') { grab(x.consequent); grab(x.alternate); }
    };
    grab(p.node.value);
    if (!/--(dash|sheet)-h/.test(src)) return;
    if (asks(p, p.node.value)) return;
    n++;
  } });
  return n;
}
function walkSrc(dir, acc) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) walkSrc(rel, acc);
    else if (/\.(jsx?|mjs)$/.test(e.name) && !CONTROLS.test(rel)) acc.push(rel);
  }
  return acc;
}
/* the census on main at this PR (tag 6791): it only falls.  A message moved
   onto the rule leaves it; a new one hung from the band is red. */
const BIG = bigFiles().find((p) => /\/BroTown\.jsx$/.test(p));
const KNOWN = Object.freeze({
  [BIG]: 10,   /* the big file (filesOf.mjs reads code by system; its path is not written here) */
  'src/ui/mobile/BottomDashboard.jsx': 2,
  'src/ui/mobile/ChatBubble.jsx': 1,
  'src/ui/mobile/FarmBedPrompt.jsx': 1,
  'src/ui/mobile/NmlBadge.jsx': 1,
  'src/ui/mobile/WorldChatFeed.jsx': 1,
  'src/ui/mobile/dash/ItemDetailPopup.jsx': 2,
  'src/ui/panels/EmotePanel.jsx': 1,
  'src/ui/panels/InfoPanel.jsx': 1,
  'src/ui/panels/ShopkeeperPanel.jsx': 1,
  'src/ui/panels/TradeWindowPanel.jsx': 1,
});
function census(files) {
  const got = Object.create(null), over = [];
  for (const f of files) { const n = bandHung(files === null ? '' : read(f)); if (n) got[f] = n; }
  for (const [f, n] of Object.entries(got)) if (n > (KNOWN[f] || 0)) over.push(f + ' ' + n + ' (known ' + (KNOWN[f] || 0) + ')');
  return { got, over };
}
const SRC = walkSrc('src/ui', []);
const cen = census(SRC);
if (process.argv.includes('--print')) console.log(JSON.stringify(cen.got, null, 1));
check('8  no new message hung from the band at a fixed bottom (the census only falls)', cen.over.length === 0, cen.over.join('; '));
{
  const stale = Object.entries(KNOWN).filter(([f, n]) => (cen.got[f] || 0) < n).map(([f]) => f);
  if (stale.length) console.log('  note the census fell (lower KNOWN): ' + stale.join(', '));
}

/* ── the plants ── */
{
  const bandOnly = (L, rise) => housingBoxes(L, rise).map((b) => ({ ...b, hi: 0 }));
  check('plant T1 the rule clearing the band only: turns 2 and 3 red', run('two', bandOnly, clearOf).length > 0 && run('three', bandOnly, clearOf).length > 0);
  const uncapped = (L, rise) => L ? housingBoxes({ ...L, shell: { ...L.shell, h: Math.round(REF_H * L.shell.w / 920) } }, rise) : [];
  check('plant T2 right upright, wrong sideways (the height uncapped): turns 1 red', run('one', uncapped, clearOf).length > 0 && run('two', uncapped, clearOf).length === 0);
  const noCeil = (want, keep, o) => clearOf(want, keep, { ...(o || {}), ceil: Infinity });
  check('plant T3 pushed over the ceiling: turns 5 red', run('five', housingBoxes, noCeil).length > 0);
  const toast = 'src/ui/mobile/StoreToast.jsx';
  const t4 = FILES[toast].replace("'calc(var(--sheet-h, var(--dash-h)) + ' + over + 'px)'", "'calc(var(--dash-h) + 14px)'");
  check('plant T4 the toast at a fixed bottom again: turns 7 red', t4 !== FILES[toast] && check7({ ...FILES, [toast]: t4 }).length > 0 && bandHung(t4) > (KNOWN[toast] || 0));
  const coach = 'src/ui/mobile/QuestCoach.jsx';
  const t5 = FILES[coach].replace('style: coachClear(box, pg, {', 'style: ({').replace("fontFamily: 'Source Sans 3,sans-serif',\n      }),", "fontFamily: 'Source Sans 3,sans-serif',\n      }),");
  check('plant T5 the coach\'s card placed without asking: turns 7 red', t5 !== FILES[coach] && check7({ ...FILES, [coach]: t5 }).length > 0);
  const t6 = "export const X = () => React.createElement('div', { 'data-hint': '', style: { position: 'fixed', bottom: 'calc(var(--dash-h) + 160px)' } }, 'Tap here!');";
  check('plant T6 a new message hung from the band: turns 8 red', bandHung(t6) === 1);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
