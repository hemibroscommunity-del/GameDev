/* ═══ v2.3.6697: THE BAND'S PULL HANDLE IS GONE, AND THE FOLD KEEPS ITS HOOK (card UI2-grip) ═══
 *
 * The owner, 2026-11-26: "remove the pull handle on the dashboard.  It has an
 * open button making pull handle redundant.  Also pull handle implies
 * stretching when dashboard is really just minimized or expanded".
 *
 * What this holds (src/ui/mobile/dash/bandGripSwitch.js, BandGrip.jsx,
 * DashHeader.jsx, BottomDashboard.jsx; the files read off their syntax tree):
 *   1  the switch: no address, no handle, and the row's control wears the
 *      fold's hook ('min' folded, 'open' shown); `?bandgrip=1` the handle,
 *      and the row's control wears none (one wearer at a time); sideways none;
 *   2  BottomDashboard draws <BandGrip> only behind `bandGripOn()`;
 *   3  under the new frame the header's Gear tile (folded) and its Close
 *      (shown) wear data-dash-fold, from the `foldHook` prop, and the band
 *      hands the header `!bandGripOn()`;
 *   4  under `?ui2=0` the OPEN / CLOSE chip wears data-dash-fold from its
 *      `hook`, which the band computes with foldHook;
 *   5  `?bandgrip` is a row of the switch table;
 *   6  the coach says "Tap the handle" only while the handle is drawn
 *      (QuestCoach.jsx: each such line asks bandGripOn(); the points tip's
 *      'fold' words, which server/test/points-tips pins, likewise).
 * Its plants, each must turn its own check red (the ways a tired programmer
 * would write them):
 *   G1 the grip drawn again with only `!land` in front of it
 *   G2 the Gear tile's hook dropped (the coach's "open the dashboard" ring and
 *      H.unfoldBand would find nothing folded)
 *   G3 Close's hook dropped (H.foldBand, H.closeDest find nothing shown)
 *   G4 CLOSE's hook written without the switch (both it and the handle wear it)
 *   G5 the header handed a constant true (the handle and Gear both wear it)
 *   G6 a coach line saying "Tap the handle" with no switch in front of it
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from './lib/writesOf.mjs';
import { bandGripOn, foldHook } from '../../src/ui/mobile/dash/bandGripSwitch.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? '  (' + detail + ')' : '')); }
}

/* ── 1. the switch, at each address ── */
function at(search, fn) {
  const was = globalThis.location;
  globalThis.location = { search, href: 'http://x/' + search };
  try { return fn(); } finally { if (was === undefined) delete globalThis.location; else globalThis.location = was; }
}
check('1a no address: no handle', at('', () => bandGripOn()) === false);
check('1b no address: the row wears min folded, open shown', at('', () => foldHook(true, false) === 'min' && foldHook(false, false) === 'open'));
check('1c sideways: none (game.css hides the hook there; the landscape band never drew the fold here)', at('', () => foldHook(true, true) === undefined && foldHook(false, true) === undefined));
check('1d ?bandgrip=1: the handle', at('?bandgrip=1', () => bandGripOn()) === true);
check('1e ?bandgrip=1: the row wears none (the handle alone wears it, as before)', at('?bandgrip=1', () => foldHook(true, false) === undefined && foldHook(false, false) === undefined));
check('1f ?bandgrip=0 and a longer name do not bring it back', at('?bandgrip=0', () => bandGripOn()) === false && at('?bandgripx=1', () => bandGripOn()) === false);

/* ── the trees ── */
function walk(n, visit, up = []) {
  if (!n || typeof n.type !== 'string') return;
  visit(n, up);
  const next = up.concat([n]);
  for (const key of Object.keys(n)) {
    if (key === 'loc' || /Comments$/.test(key)) continue;
    const v = n[key];
    if (Array.isArray(v)) v.forEach((x) => walk(x, visit, next)); else if (v && typeof v === 'object') walk(v, visit, next);
  }
}
const src = (code, n) => code.slice(n.start, n.end);
const elName = (n) => n.openingElement && n.openingElement.name && n.openingElement.name.name;
const attrOf = (n, name) => (n.openingElement ? n.openingElement.attributes : []).find((a) => a.type === 'JSXAttribute' && a.name && a.name.name === name);

/* 2: every <BandGrip> in BottomDashboard is the result of a test that calls bandGripOn() */
function check2(code) {
  const bad = [];
  let n = 0;
  walk(parse(code).program, (node, up) => {
    if (node.type !== 'JSXElement' || elName(node) !== 'BandGrip') return;
    n++;
    const gate = up.slice().reverse().find((a) => (a.type === 'ConditionalExpression' || a.type === 'LogicalExpression')
      && /\bbandGripOn\(\)/.test(src(code, a.type === 'ConditionalExpression' ? a.test : a.left)));
    if (!gate) bad.push('ungated <BandGrip> at line ' + node.loc.start.line);
  });
  if (!n) bad.push('no <BandGrip> found');
  return bad;
}
/* 3a: DashHeader: the gear tile and closeCtl wear data-dash-fold from foldHook */
function check3a(code) {
  const bad = [];
  let gear = 0; let close = 0;
  walk(parse(code).program, (node) => {
    if (node.type === 'JSXElement') {
      const ctl = attrOf(node, 'data-dash-ctl');
      if (ctl && ctl.value && ctl.value.value === 'gear') {
        gear++;
        const f = attrOf(node, 'data-dash-fold');
        if (!f || !f.value || !/foldHook\s*\?\s*'min'/.test(src(code, f.value))) bad.push('the Gear tile wears no fold hook (line ' + node.loc.start.line + ')');
      }
    }
    if (node.type === 'VariableDeclarator' && node.id && node.id.name === 'closeCtl' && node.init && node.init.type === 'ObjectExpression') {
      close++;
      const p = node.init.properties.find((q) => q.key && (q.key.value === 'data-dash-fold' || q.key.name === 'data-dash-fold'));
      if (!p || !/foldHook\s*\?\s*'open'/.test(src(code, p.value))) bad.push('Close wears no fold hook');
    }
  });
  if (gear !== 1) bad.push(gear + ' Gear tiles');
  if (close !== 1) bad.push(close + ' closeCtl');
  return bad;
}
/* 3b and 4: the band hands the header !bandGripOn(), and CLOSE foldHook(...) */
function check34(code) {
  const bad = [];
  let head = 0; let chip = 0;
  walk(parse(code).program, (node) => {
    if (node.type !== 'JSXElement') return;
    if (elName(node) === 'DashHeader') {
      head++;
      const a = attrOf(node, 'foldHook');
      if (!a || !a.value || !/!\s*bandGripOn\(\)/.test(src(code, a.value))) bad.push('the header is not handed !bandGripOn()');
    }
    if (elName(node) === 'BandClose') {
      chip++;
      const a = attrOf(node, 'hook');
      if (!a || !a.value || !/\bfoldHook\(/.test(src(code, a.value))) bad.push('CLOSE\'s hook is not foldHook(...)');
    }
  });
  if (head !== 1 || chip !== 1) bad.push(`${head} headers, ${chip} CLOSE chips`);
  return bad;
}
function check4b(code) {
  let ok = false;
  walk(parse(code).program, (node) => {
    if (node.type === 'VariableDeclarator' && node.id && node.id.name === 'BandClose') {
      walk(node, (m) => {
        if (m.type === 'JSXAttribute' && m.name && m.name.name === 'data-dash-fold' && m.value && /^\{\s*hook\s*\}$/.test(src(code, m.value))) ok = true;
      });
    }
  });
  return ok;
}

const dash = read('src/ui/mobile/BottomDashboard.jsx');
const head = read('src/ui/mobile/dash/DashHeader.jsx');
const grip = read('src/ui/mobile/dash/BandGrip.jsx');
{
  const b2 = check2(dash);
  check('2  BottomDashboard draws the handle only behind bandGripOn() (off its tree)', b2.length === 0, b2.join('; '));
  const b3 = check3a(head);
  check('3a the header\'s Gear tile and Close wear data-dash-fold from foldHook (off its tree)', b3.length === 0, b3.join('; '));
  const b34 = check34(dash);
  check('3b/4 the band hands the header !bandGripOn(), and CLOSE foldHook(...) (off its tree)', b34.length === 0, b34.join('; '));
  check('4b BandClose wears data-dash-fold={hook} (off its tree)', check4b(grip));
  check('5  ?bandgrip is a switch row of the table', /name: '\?bandgrip', side: 'page', system: 'ui', kind: 'switch'[^\n]*thrown: '=1'/.test(read('tools/guards/lib/switches.mjs')));
}

/* 6: the coach's words for a handle that is gone */
function check6(code) {
  const bad = [];
  code.split('\n').forEach((line, i) => {
    if (/Tap the handle/.test(line) && !/bandGripOn\(\)\s*\?/.test(line)) bad.push('line ' + (i + 1));
    if (/pointsTipWords\(\s*'fold'/.test(line)) bad.push('line ' + (i + 1) + ': pointsTipWords(\'fold\') without the switch');
  });
  if (!/pointsTipWords\(bandGripOn\(\) \? 'fold' : 'side'/.test(code)) bad.push('the points tip does not choose by the switch');
  return bad;
}
const coach = read('src/ui/mobile/QuestCoach.jsx');
{
  const b6 = check6(coach);
  check('6  the coach says "Tap the handle" only while the handle is drawn', b6.length === 0, b6.join('; '));
}

/* ── the plants: each must turn its own check red ── */
{
  const gated = /\{!land && bandGripOn\(\) \? <BandGrip /;
  check('plant G1 the grip ungated: turns 2 red', gated.test(dash) && check2(dash.replace(gated, '{!land ? <BandGrip ')).length > 0);
  const gearHook = " data-dash-fold={foldHook ? 'min' : undefined}";
  check('plant G2 Gear\'s hook dropped: turns 3a red', head.includes(gearHook) && check3a(head.replace(gearHook, '')).length > 0);
  const closeHook = " 'data-dash-fold': foldHook ? 'open' : undefined,";
  check('plant G3 Close\'s hook dropped: turns 3a red', head.includes(closeHook) && check3a(head.replace(closeHook, '')).length > 0);
  const chipHook = 'hook={foldHook(dashMin, land)}';
  check('plant G4 CLOSE\'s hook without the switch: turns 4 red', dash.includes(chipHook) && check34(dash.replace(chipHook, "hook={dashMin ? 'min' : 'open'}")).length > 0);
  const headHook = 'foldHook={!land && !bandGripOn()}';
  check('plant G5 the header handed a constant: turns 3b red', dash.includes(headHook) && check34(dash.replace(headHook, 'foldHook={true}')).length > 0);
  const g6 = coach.replace(/body: function \(\) \{ return bandGripOn\(\) \? ('Mayor Bro paid you in gear\. Tap the handle to find it\.') : [^}]*\} \},/, 'body: $1 },');
  check('plant G6 a coach line saying "Tap the handle" unswitched: turns 6 red', g6 !== coach && check6(g6).length > 0);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
