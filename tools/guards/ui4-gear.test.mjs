/* ═══ v2.3.6845: GEAR, KEPT AND MEASURED AGAINST V17 (card UI4 PR 6, the owner's V17) ═══
 *
 * The owner, 2026-11-27: "Some things may be better designed as already in the
 * game like probably the bag menu"; of Gear's side-by-side, 2026-11-26: "one of
 * your better layouts".  So Gear is kept; this suite holds what card UI4 PR 6
 * changed (src/game/v17Gear.js, behind `?v17gear`) to what it is FOR:
 *
 *   A  the switch: on by default, `=0` remembered, `=1` forgets;
 *   B  the roles (V17:44-45): equip commits, drop is the danger, each named
 *      role the one its colour already wore (no look changes by naming it);
 *   C  `=0` is the day before: the geometry with no `opts` and with `v17`
 *      differ ONLY where a mend is (the sideways row's 12 px, a 320 phone's
 *      two label rows, a computer's columns), over W 300-1000 and H 50-420;
 *   D  the fit: the sideways Equipped row's width is the style sheet's own
 *      sum (read from gearPanels.css), so it fits its pane; the upright body's
 *      three rows fit its room; the bag's columns are WHOLE and as many as the
 *      panel holds; no square larger than the day before (V17:31 "not larger
 *      art"); every phone keeps today's 3 across;
 *   E  the quick look (V17:57): what it claims fits its box, its buttons
 *      (two 44s and the ✕) always counted, never traded for a fact;
 *   F  the page (read by the syntax tree): the reason sits ABOVE the buttons
 *      and Details keeps its half (fixed buttons); the comparison is the kit's
 *      Comparison, fed the row's own decimals and its better way; the item
 *      page wears data-v17-gear and its name is unclamped there (full name in
 *      Details: read from itemPage.css).
 *   P  THE DODGES (finish.md part 5 rule 1), planted: each must turn its
 *      check red.
 *
 * Run: node tools/guards/ui4-gear.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  v17GearWanted, V17_GEAR_KEY, ITEM_ACT_INTENT, itemActIntent, GEAR_INTENT,
  sideRowW, SIDE_CELL_GAP, SIDE_GROUP_PAD, SIDE_GROUP_GAP, invTitleFits, wornHeadFits, wholeCols, sumLayout, SUM,
} from '../../src/game/v17Gear.js';
import { gearPanelsGeometry, GEAR_PAD, GEAR_G, GEAR_MIN, GEAR_BODY_G, GEAR_HEAD } from '../../src/game/gearGeometry.js';
import { ROLE_FACES, uiRole, KIT_PIECES } from '../../src/game/uiRoles.js';
import { ACTION_FACE } from '../../src/game/itemInspect.js';
import { compareRow } from '../../src/game/compare.js';
import { cssRules } from './lib/cssRules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500))); }
}
/* a plant: the rule run on a planted fault must say "bad" */
function plant(name, rule, planted) {
  let red = false;
  try { red = rule(planted) !== true; } catch (e) { red = true; }
  check('P plant: ' + name + ' turns its check red', red);
}

/* ── A. the switch ── */
function store() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; }
{
  const s = store();
  const a = v17GearWanted('', s);
  const b = v17GearWanted('?v17gear=0', s);
  const kept = s.getItem(V17_GEAR_KEY);
  const c = v17GearWanted('', s);
  const d = v17GearWanted('?v17gear=1', s);
  const e = v17GearWanted('', s);
  check('A1. on by default; =0 off and remembered; =1 on and forgets', a === true && b === false && kept === '0' && c === false && d === true && e === true && s.getItem(V17_GEAR_KEY) === null, { a, b, kept, c, d, e });
  check('A2. no storage: the address alone decides, the default on', v17GearWanted('', null) === true && v17GearWanted('?v17gear=0', null) === false);
}

/* ── B. the roles ── */
function rolesAgree(table) {
  for (const [id, role] of Object.entries(table)) {
    const face = ACTION_FACE[id];
    if (!uiRole(role) || KIT_PIECES.Ui2Action.roles.indexOf(role) < 0) return `${id}: ${role} is not an Action's role`;
    if (!face || (ROLE_FACES[role] || []).indexOf(face) < 0) return `${id}: ${role} on a ${face} face`;
  }
  if (table.drop !== 'danger') return 'drop is not the danger';
  if (table.equip !== 'commit' || table.unequip !== 'commit') return 'equip and unequip do not commit';
  return true;
}
check('B1. each item action\'s role is the one its colour wore (no look changes by naming it); drop is the danger, equip and unequip commit', rolesAgree(ITEM_ACT_INTENT) === true, rolesAgree(ITEM_ACT_INTENT));
check('B2. an id the table does not know gives no role (its colour says it, as before)', itemActIntent('inspect') === null && itemActIntent('__proto__') === null && itemActIntent('drop') === 'danger');
check('B3. Gear\'s pieces: Details goes (=0: adjusts, its silver), Show all adjusts, the gold is a fact, a door goes',
  GEAR_INTENT.details === 'go' && GEAR_INTENT.detailsWas === 'adjust' && GEAR_INTENT.showAll === 'adjust' && GEAR_INTENT.coins === 'info' && GEAR_INTENT.door === 'go'
  && KIT_PIECES.Ui2Stat.roles.includes(GEAR_INTENT.coins) && KIT_PIECES.Ui2Tile.roles.includes(GEAR_INTENT.door));

/* ── C. =0 is the day before ── */
const SIZES = [];
for (let W = 300; W <= 1000; W += 7) for (let H = 50; H <= 420; H += 3) SIZES.push([W, H]);
function sameExceptMends(geo) {
  for (const [W, H] of SIZES) {
    const a = geo(W, H), b = geo(W, H, { v17: true });
    if (a.short !== b.short) return `${W}x${H}: the shape changed`;
    if (a.short) {
      /* sideways: the row its true width; the cell smaller ONLY where the day before's row and two bag squares overflowed */
      const over = a.eqW + 3 * 2 * SIDE_GROUP_PAD + 2 * a.cell + 2 * GEAR_PAD + 4 > W;
      if (b.cell !== a.cell && !(over && b.cell < a.cell && b.cell >= GEAR_MIN)) return `${W}x${H}: sideways cell ${a.cell} -> ${b.cell}`;
      if (b.cell === a.cell && b.eqW - a.eqW !== 3 * 2 * SIDE_GROUP_PAD) return `${W}x${H}: sideways row ${a.eqW} -> ${b.eqW}`;
      continue;
    }
    if (a.bagCell !== b.bagCell || a.rows !== b.rows || a.bagH !== b.bagH) return `${W}x${H}: the bag's square or rows moved`;
    if (a.invW !== b.invW || a.eqW !== b.eqW) return `${W}x${H}: the panels' widths moved`;
    if (b.cols !== a.cols && a.cols * (a.bagCell + GEAR_G) - GEAR_G + (a.bagCell + GEAR_G) > a.invW - 2 * GEAR_PAD) return `${W}x${H}: columns ${a.cols} -> ${b.cols} where one more did not fit`;
    if (b.wornHead && (a.bodyCell !== b.bodyCell || a.torsoW !== b.torsoW)) return `${W}x${H}: the body moved under its label row`;
    if (!a.wornHead || !a.invTitle) return `${W}x${H}: no opts dropped a label`;
  }
  return true;
}
check('C1. no opts (?v17gear=0) and v17 differ only where a mend is (sideways +12, a computer\'s columns, a 320 phone\'s labels)', sameExceptMends(gearPanelsGeometry) === true, sameExceptMends(gearPanelsGeometry));
/* the phones mp-v17fit measures: the bag's 3 across and both labels kept (only the 320 drops them) */
{
  /* the panels' box on each phone, as the page drew it (mp-v17fit's gearBox, data-gear-box) */
  const PH = { '390x844': [382, 183], '375x667': [367, 179], '360x780': [352, 175], '414x896': [406, 191], '430x932': [422, 197], '320x568': [312, 161] };
  const out = {};
  let ok = true;
  for (const [k, [W, H]] of Object.entries(PH)) {
    const g = gearPanelsGeometry(W, H, { v17: true });
    out[k] = [g.cols, g.wornHead, g.invTitle];
    if (g.cols !== 3) ok = false;
    if (k === '320x568' ? (g.wornHead || g.invTitle) : (!g.wornHead || !g.invTitle)) ok = false;
  }
  check('C2. every upright phone keeps the bag 3 across; only the 320 phone gives up the two label rows\' words', ok, out);
}

/* ── D. the fit ── */
function cssNum(rules, sel, prop) {
  for (const r of rules) if (r.sel.split(',').map((x) => x.trim()).includes(sel)) for (const d of r.decls) if (d.prop === prop) return d.value;
  return null;
}
const gpRules = cssRules(read('src/ui/mobile/dash/gearPanels.css'));
function rowMatchesSheet(rowW) {
  const rowGap = parseFloat(cssNum(gpRules, '.ui2 .u2-gp-bodyrow', 'gap'));
  const grpGap = parseFloat(cssNum(gpRules, '.ui2 .u2-gp-group', 'gap'));
  const grpPad = String(cssNum(gpRules, '.ui2 .u2-gp-group', 'padding') || '').split(/\s+/).map(parseFloat);
  const side = grpPad.length >= 2 ? grpPad[1] : grpPad[0];
  for (const cell of [44, 48, 53, 56]) {
    const want = 3 * (3 * cell + 2 * grpGap + 2 * side) + 2 * rowGap + 2 * GEAR_PAD;
    if (rowW(cell, GEAR_PAD) !== want) return `cell ${cell}: ${rowW(cell, GEAR_PAD)} against the sheet's ${want}`;
  }
  return true;
}
check('D1. the sideways Equipped row\'s width is the style sheet\'s own sum (cells, gaps, groups\' padding): it fits its pane', rowMatchesSheet(sideRowW) === true, rowMatchesSheet(sideRowW));
check('D1b. its numbers named (2 px in a group, 2 px a group\'s pad, 12 px between groups)', SIDE_CELL_GAP === 2 && SIDE_GROUP_PAD === 2 && SIDE_GROUP_GAP === 12);
function sideFits(geo) {
  for (const [W, H] of SIZES) {
    const g = geo(W, H, { v17: true });
    if (!g.short) continue;
    if (g.cell > GEAR_MIN && g.eqW + 4 + g.invW > W) return `${W}x${H}: the row ${g.eqW} and the bag ${g.invW} overflow ${W}`;
    if (g.cell < GEAR_MIN) return `${W}x${H}: a cell under 44`;
  }
  return true;
}
check('D1c. sideways the nine-cell row and the bag share the width (the cells shrink toward 44, never under)', sideFits(gearPanelsGeometry) === true, sideFits(gearPanelsGeometry));
function bodyFits(geo) {
  for (const [W, H] of SIZES) {
    const g = geo(W, H, { v17: true });
    if (g.short) continue;
    const room = g.wornHead ? g.below : H - 2 * GEAR_PAD;
    if (3 * GEAR_MIN + 2 * GEAR_G > H - 2 * GEAR_PAD) continue;   /* a box no layout of 44s fits: not a phone */
    if (3 * g.bodyCell + 2 * GEAR_G > room) return `${W}x${H}: the body ${g.bodyCell} x3 in ${room}`;
    if (g.bodyCell < GEAR_MIN) return `${W}x${H}: a body cell under 44`;
  }
  return true;
}
check('D2. upright, the body\'s three rows of 44 or more fit their room (under the label row, or without it)', bodyFits(gearPanelsGeometry) === true, bodyFits(gearPanelsGeometry));
function colsWhole(geo) {
  for (const [W, H] of SIZES) {
    const g = geo(W, H, { v17: true });
    if (g.short) continue;
    const inner = g.invW - 2 * GEAR_PAD;
    const used = g.cols * g.bagCell + (g.cols - 1) * GEAR_G;
    if (used > inner) return `${W}x${H}: ${g.cols} columns of ${g.bagCell} in ${inner}`;
    if (g.cols > 3 && used + GEAR_G + g.bagCell <= inner) return `${W}x${H}: room for one more column left empty`;
    if (g.bagCell > geo(W, H).bagCell) return `${W}x${H}: a larger square`;
  }
  return true;
}
check('D3. the bag\'s columns are whole, as many as the panel holds, the square never larger (V17:31)', colsWhole(gearPanelsGeometry) === true, colsWhole(gearPanelsGeometry));
{
  const g = gearPanelsGeometry(832, 183, { v17: true });   /* a computer at 1440 x 900, ?v17wide: the 840 block (its drawn box) */
  check('D4. a computer\'s 840: more of the bag in view (8 across, 24 squares against 9), the square the same', g.cols === 8 && g.bagCell === gearPanelsGeometry(832, 183).bagCell, { cols: g.cols, cell: g.bagCell });
}
check('D5. the helpers: whole columns floor, never fewer than given; the title\'s line; the body\'s room',
  wholeCols(200, 45, 3, 3) === 4 && wholeCols(100, 45, 3, 3) === 3 && invTitleFits(162) && !invTitleFits(142) && wornHeadFits(139, 44, 3) && !wornHeadFits(121, 44, 3));

/* ── E. the quick look ── */
function sumFits(layout) {
  for (let w = 100; w <= 600; w += 3) {
    for (let h = 40; h <= 200; h += 3) {
      for (const short of [false, true]) {
        for (const why of [false, true]) {
          const L = layout(w, h, short, why, false);
          if (short) {
            const base = SUM.nameSide + SUM.ctl + SUM.acts + 2 * SUM.rowGap;
            const claim = base + (L.pic ? SUM.pic : 0) + (L.head ? SUM.fact : 0) + (L.rows ? SUM.fact2 : 0);
            if ((L.pic || L.head) && claim > w) return `sideways ${w}: claims ${claim}`;
            if (L.head && !L.pic) return `sideways ${w}: a fact before the picture`;
          } else {
            const claim = 2 * SUM.ctl + 2 * SUM.gap + (why ? SUM.line + SUM.gap : 0) + SUM.head + L.rows * SUM.row + (L.line ? SUM.line : 0);
            if ((L.rows || L.line) && claim > h) return `upright ${w}x${h}: claims ${claim}`;
            if (L.rows > 2) return 'more than two rows';
            if (L.pic && w - SUM.pic - SUM.ctl - 8 < SUM.nameUp) return `upright ${w}: the picture squeezes the name`;
          }
        }
      }
    }
  }
  return true;
}
check('E1. what the quick look claims fits its box, the buttons and the ✕ always counted', sumFits(sumLayout) === true, sumFits(sumLayout));
{
  const s844 = sumLayout(264, 58, true, false, false), s932 = sumLayout(352, 71, true, false, false), bag = sumLayout(552, 58, true, false, true);
  const u390 = sumLayout(181, 167, false, false, false), u320 = sumLayout(146, 145, false, false, false);
  check('E2. measured sizes: 844 sideways the name and buttons (no picture, no fact); 932 the picture; a bag pick sideways all; 390 the picture and two rows; 320 one row, no picture',
    !s844.pic && !s844.head && s932.pic && !s932.head && bag.pic && bag.head && u390.pic && u390.rows === 2 && !u320.pic && u320.rows === 1, { s844, s932, bag, u390, u320 });
}

/* ── F. the page, by its syntax tree ── */
let B = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr }; break; } catch (e) { /* the next */ }
}
check('F0. @babel/parser and traverse load (npm install in the root or server/)', !!B);
const jsxName = (n) => (n && n.name && n.name.type === 'JSXIdentifier' ? n.name.name : null);
const attrOf = (el, name) => (el.openingElement.attributes || []).find((a) => a.type === 'JSXAttribute' && a.name && a.name.name === name);
const strAttr = (el, name) => { const a = attrOf(el, name); return a && a.value && a.value.type === 'StringLiteral' ? a.value.value : null; };
/* in the function `fn` of `src`: the summary's root's children in order; `why` must come before the acts row */
function whyAboveButtons(src) {
  const ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  let verdict = 'no Summary';
  B.traverse(ast, {
    FunctionDeclaration(p) {
      if (!p.node.id || p.node.id.name !== 'Summary') return;
      verdict = 'no root';
      p.traverse({
        JSXElement(q) {
          if (strAttr(q.node, 'className') !== null || !attrOf(q.node, 'data-gear-summary')) return;
          const kids = q.node.children.filter((c) => c.type !== 'JSXText');
          const isActs = (c) => c.type === 'JSXElement' && strAttr(c, 'className') === 'u2-gp-acts';
          const mentionsWhy = (c) => c.type === 'JSXExpressionContainer' && /\bwhy\b/.test(src.slice(c.start, c.end));
          const iActs = kids.findIndex(isActs);
          const iWhyOn = kids.findIndex((c) => mentionsWhy(c) && /\bon\s*\?\s*why\b/.test(src.slice(c.start, c.end)));
          if (iActs < 0) { verdict = 'no acts row'; return; }
          if (iWhyOn < 0 || iWhyOn > iActs) { verdict = 'the reason (on) is not above the buttons'; return; }
          const acts = kids[iActs];
          const gap = src.slice(acts.start, acts.end).includes('data-gear-act-gap');
          verdict = gap ? true : 'Details has no partner when there is no action';
          q.stop();
        },
      });
    },
  });
  return verdict;
}
const GP = read('src/ui/mobile/dash/GearPanels.jsx');
if (B) check('F1. fixed buttons: the reason above them, and Details keeps its half with no action (V17:57)', whyAboveButtons(GP) === true, whyAboveButtons(GP));
/* the comparison: a Ui2Comparison fed the row's decimals and better way */
function cmpThroughKit(src) {
  const ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  let found = null;
  B.traverse(ast, {
    JSXElement(p) {
      if (jsxName(p.node.openingElement) !== 'Ui2Comparison') return;
      const need = ['before', 'after', 'lower', 'digits', 'k'];
      const miss = need.filter((n) => !attrOf(p.node, n));
      found = miss.length ? 'a Comparison without ' + miss.join(', ') : true;
    },
  });
  return found || 'no Ui2Comparison in Gear';
}
if (B) check('F2. the comparison is the kit\'s Comparison (signed words and colour), fed numbers, decimals and the better way', cmpThroughKit(GP) === true, cmpThroughKit(GP));
{
  const r = compareRow('swing', 1.25, 1.1);
  check('F3. a comparison row carries its decimals and unit (the Comparison writes them as the game does)', r && r.dec === 2 && r.unit === 's' && r.goodWay === 'lower');
}
function fullNameInDetails(rules) {
  const r = rules.find((x) => /\[data-v17-gear\]/.test(x.sel) && /\.u2-item-name/.test(x.sel));
  if (!r) return 'no rule for the item page\'s name under data-v17-gear';
  const v = (p) => (r.decls.find((d) => d.prop === p) || {}).value;
  if (v('-webkit-line-clamp') !== 'unset' && v('display') !== 'block') return 'the name is still clamped';
  if (v('overflow') === 'hidden') return 'the name is still cut';
  return true;
}
const ipRules = cssRules(read('src/ui/mobile/dash/itemPage.css'));
check('F4. the full name in Details: the item page\'s name is not clamped under the switch (V17:57)', fullNameInDetails(ipRules) === true, fullNameInDetails(ipRules));
check('F5. the item page wears data-v17-gear from the switch', /data-v17-gear=\{v17GearOn\(\)/.test(read('src/ui/mobile/dash/ItemPage.jsx')));
function centred(rules) {
  const r = rules.find((x) => /\[data-v17-gear\]/.test(x.sel) && /\.u2-gp-ctl(?![-\w])/.test(x.sel));
  return r && r.decls.some((d) => d.prop === 'justify-content' && d.value === 'center') ? true : 'the filter\'s word is not centred';
}
check('F6. the owner\'s "I\'d prefer centered": the filter\'s word, alone in its box, centred under the switch', centred(gpRules) === true, centred(gpRules));

/* ── P. the dodges ── */
plant('the sideways row without the groups\' padding (the day before\'s sum)', rowMatchesSheet, (cell, pad) => 9 * cell + 6 * 2 + 2 * GEAR_BODY_G * 2 + 2 * pad);
plant('the sideways cell kept at 56 where the row overflows', sideFits, (W, H, o) => { const g = gearPanelsGeometry(W, H, o); return g.short ? { ...g, cell: 56, eqW: sideRowW(56, GEAR_PAD), invW: Math.max(120, W - 4 - sideRowW(56, GEAR_PAD)) } : g; });
plant('a mend that moves a phone\'s geometry (the body 2 px smaller everywhere)', sameExceptMends, (W, H, o) => { const g = gearPanelsGeometry(W, H, o); return o && !g.short ? { ...g, bodyCell: g.bodyCell - 2 } : g; });
plant('the body kept under its label row on a 320 phone', bodyFits, (W, H, o) => { const g = gearPanelsGeometry(W, H, o); return { ...g, wornHead: true, bodyCell: Math.max(44, g.bodyCell) }; });
plant('more columns than fit (cols + 1 on a computer)', colsWhole, (W, H, o) => { const g = gearPanelsGeometry(W, H, o); return o && g.cols > 3 ? { ...g, cols: g.cols + 1 } : g; });
plant('a larger square to fill the width', colsWhole, (W, H, o) => { const g = gearPanelsGeometry(W, H, o); return o && !g.short ? { ...g, cols: 3, bagCell: Math.max(g.bagCell, Math.floor((g.invW - 8 - 6) / 3)) } : g; });
plant('a quick look that counts no buttons (rows into their room)', sumFits, (w, h, s, why, c) => (s ? sumLayout(w, h, s, why, c) : { ...sumLayout(w, h, s, why, c), rows: 2, line: true }));
plant('a quick look that shows a fact before the picture sideways', sumFits, (w, h, s, why, c) => (s && w > 300 ? { pic: false, head: true, rows: 0 } : sumLayout(w, h, s, why, c)));
plant('drop made a commit', rolesAgree, { ...ITEM_ACT_INTENT, drop: 'commit' });
plant('an action named a role its colour contradicts (unequip as danger)', rolesAgree, { ...ITEM_ACT_INTENT, unequip: 'danger' });
if (B) {
  plant('the reason left under the buttons', whyAboveButtons, GP.replace('{on ? why : null}', '').replace('{on ? null : why}', '{why}'));
  plant('Details alone across the row (no gap)', whyAboveButtons, GP.replace(/data-gear-act-gap=""/g, ''));
  plant('Gear\'s own arrows kept (no Comparison)', cmpThroughKit, GP.replace(/Ui2Comparison/g, 'GearChange'));
  plant('a Comparison with no better way (lower missing)', cmpThroughKit, GP.replace(/ lower=\{[^}]*\}/, ''));
}
plant('the item page\'s name still clamped', fullNameInDetails, cssRules('.ui2[data-v17-gear] .u2-item-name { -webkit-line-clamp: 2; overflow: hidden; }'));
plant('the filter left-aligned', centred, cssRules('.ui2.u2-gp[data-v17-gear] .u2-gp-ctl { justify-content: flex-start; }'));

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
