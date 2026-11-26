/* ═══ v2.3.6688: THE TWO-PANEL WORKSPACE HOLDS (card UI2-gear PR 2, the build's step 5) ═══
 *
 * src/game/workspace.js: one state, one transition (wsStep), what each side
 * shows (wsPanels).  Gear is its first user (dash/GearPanels.jsx); the shop,
 * the bank, a bench and a trade call it later (the plan's step 8).  It holds
 * the owner's specification (part 5: "Keep the source panel in its original
 * location during quick inspection; the opposite panel is replaced with the
 * summary. No shifting the inventory to the other side ... Provide a clear
 * way back to management and preserve selection/scroll context"):
 *   1. a pick on one side makes the OTHER side the summary; the source keeps
 *      its side, from either side;
 *   2. the way back: the same thing tapped again, or the summary's close,
 *      gives management with both panels as they were;
 *   3. the scroll kept: a side's scroll recorded while shown, kept while it
 *      is covered, given back when it is drawn again (the bag after a look
 *      from the Equipped side);
 *   4. Details and Back: the full page, then the SAME look with the SAME
 *      pick (the acceptance task: "find full comparison and return to the
 *      same selected item");
 *   5. a covered side takes no tap; an empty cell is picked in management
 *      (no summary of nothing); a pick that is gone goes back to management;
 *   6. the state is frozen, and an unknown event leaves it as it is;
 *   7. in the source: Gear's panels draw from wsPanels and move by wsStep
 *      only, the summary's Details opens the ONE item page (openItemPage),
 *      the picked square wears the kit's selected state, and today's Gear is
 *      kept under `?ui2=0` (GearTab hands over to GearPanels only under the
 *      frame).
 *
 * THE DODGES, played every run (a plant that stays green fails the suite):
 *   P1 the look moving the source panel to the other side
 *   P2 the bag's scroll lost on the way back
 *   P3 the picked slot lost on the way back from the full page
 *   P4 the summary drawn over the source (the same side)
 *   P5 a second tap that opens the look again instead of putting it down
 *   P6 the covered side's scroll overwritten while it is covered
 *   P7 an empty cell opening a summary of nothing
 *
 * Run: node tools/guards/workspace.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wsStart, wsStep, wsPanels, wsPicked, wsScroll } from '../../src/game/workspace.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 800))); }
}
const txt = (o) => JSON.stringify(o);
const REAL = { start: wsStart, step: wsStep, panels: wsPanels, picked: wsPicked, scroll: wsScroll };
const run = (M, evs, s0) => evs.reduce((s, e) => M.step(s, e), s0 || M.start());

const CHECKS = {
  C1(M) {
    const a = run(M, [{ type: 'pick', side: 'left', key: 'b3' }]);
    const pa = M.panels(a);
    if (a.mode !== 'look' || pa.left !== 'panel' || pa.right !== 'summary') return 'from the left: ' + txt([a, pa]);
    if (!M.picked(a, 'left', 'b3') || M.picked(a, 'right', 'b3')) return 'the pick: ' + txt(a);
    const b = run(M, [{ type: 'pick', side: 'right', key: 'sword' }]);
    const pb = M.panels(b);
    if (b.mode !== 'look' || pb.right !== 'panel' || pb.left !== 'summary') return 'from the right: ' + txt([b, pb]);
    const m = M.panels(M.start());
    if (m.left !== 'panel' || m.right !== 'panel' || m.page) return 'management: ' + txt(m);
    return '';
  },
  C2(M) {
    const a = run(M, [{ type: 'pick', side: 'left', key: 'b3' }, { type: 'pick', side: 'left', key: 'b3' }]);
    if (a.mode !== 'manage' || a.pick !== null || M.panels(a).right !== 'panel') return 'tapped again: ' + txt(a);
    const b = run(M, [{ type: 'pick', side: 'right', key: 'bow' }, { type: 'close' }]);
    if (b.mode !== 'manage' || b.pick !== null || M.panels(b).left !== 'panel') return 'closed: ' + txt(b);
    const c = run(M, [{ type: 'pick', side: 'left', key: 'b3' }, { type: 'pick', side: 'left', key: 'b7' }]);
    if (c.mode !== 'look' || c.pick !== 'b7' || c.from !== 'left') return 'another pick in the source: ' + txt(c);
    return '';
  },
  C3(M) {
    const s = run(M, [{ type: 'scroll', side: 'left', top: 240 }, { type: 'pick', side: 'right', key: 'sword' }, { type: 'scroll', side: 'left', top: 0 }, { type: 'close' }]);
    if (M.scroll(s, 'left') !== 240) return 'the bag\'s scroll after a look from the Equipped side: ' + M.scroll(s, 'left');
    const t = run(M, [{ type: 'scroll', side: 'left', top: 120 }, { type: 'pick', side: 'left', key: 'b9' }, { type: 'scroll', side: 'left', top: 180 }, { type: 'details' }, { type: 'back' }, { type: 'close' }]);
    if (M.scroll(t, 'left') !== 180) return 'the bag\'s scroll after the page: ' + M.scroll(t, 'left');
    const u = run(M, [{ type: 'scroll', side: 'left', top: -5 }]);
    if (M.scroll(u, 'left') !== 0 || M.scroll(u, 'nowhere') !== 0) return 'a scroll below the top: ' + txt(u);
    return '';
  },
  C4(M) {
    const a = run(M, [{ type: 'pick', side: 'left', key: 'b3' }, { type: 'details' }]);
    if (a.mode !== 'page' || !M.panels(a).page) return 'details: ' + txt(a);
    if (run(M, [{ type: 'pick', side: 'left', key: 'b5' }], a).pick !== 'b3') return 'a tap under the page moved the pick';
    const b = M.step(a, { type: 'back' });
    if (b.mode !== 'look' || b.pick !== 'b3' || b.from !== 'left' || !M.picked(b, 'left', 'b3')) return 'back: ' + txt(b);
    const c = run(M, [{ type: 'pick', side: 'right', key: 'chest' }, { type: 'details' }, { type: 'back' }]);
    if (c.mode !== 'look' || c.pick !== 'chest' || c.from !== 'right' || M.panels(c).left !== 'summary') return 'back from the right: ' + txt(c);
    if (M.step(M.start(), { type: 'details' }).mode !== 'manage') return 'details with nothing picked';
    return '';
  },
  C5(M) {
    const a = run(M, [{ type: 'pick', side: 'left', key: 'b3' }, { type: 'pick', side: 'right', key: 'sword' }]);
    if (a.pick !== 'b3' || a.from !== 'left') return 'a tap on the covered side: ' + txt(a);
    const e = run(M, [{ type: 'pick', side: 'right', key: 'cape', look: false }]);
    if (e.mode !== 'manage' || M.panels(e).left !== 'panel' || !M.picked(e, 'right', 'cape')) return 'an empty cell: ' + txt(e);
    const g = run(M, [{ type: 'pick', side: 'left', key: 'b3' }, { type: 'gone', keys: ['b1', 'b2'] }]);
    if (g.mode !== 'manage' || g.pick !== null) return 'gone: ' + txt(g);
    const h = run(M, [{ type: 'pick', side: 'left', key: 'b3' }, { type: 'gone', keys: ['b3'] }]);
    if (h.mode !== 'look' || h.pick !== 'b3') return 'still there: ' + txt(h);
    return '';
  },
  C6(M) {
    const s = run(M, [{ type: 'pick', side: 'left', key: 'b3' }]);
    if (!Object.isFrozen(s) || !Object.isFrozen(s.scroll)) return 'not frozen';
    if (M.step(s, { type: 'nope' }) !== s || M.step(s, null) !== s) return 'an unknown event moved it';
    if (M.step(s, { type: 'pick', side: 'middle', key: 'x' }) !== s) return 'a third side';
    if (txt(M.step(s, { type: 'reset' })) !== txt(M.start())) return 'reset';
    if (txt(M.step(null, { type: 'close' })) !== txt(M.start())) return 'no state';
    return '';
  },
};

for (const [k, fn] of Object.entries(CHECKS)) {
  let r;
  try { r = fn(REAL); } catch (e) { r = 'threw ' + (e && e.stack || e); }
  check(`${k}: the workspace holds`, !r, r);
}

/* ── the dodges ── */
const PLANTS = [
  ['P1', 'C1', 'the look moving the source to the other side', { ...REAL, panels: (s) => (s.mode === 'look' ? Object.freeze({ left: 'summary', right: 'panel', page: false }) : wsPanels(s)) }],
  ['P2', 'C3', 'the bag\'s scroll lost on the way back', { ...REAL, step: (s, e) => { const n = wsStep(s, e); return e && e.type === 'close' ? Object.freeze({ ...n, scroll: Object.freeze({ left: 0, right: 0 }) }) : n; } }],
  ['P3', 'C4', 'the pick lost on the way back from the page', { ...REAL, step: (s, e) => { const n = wsStep(s, e); return e && e.type === 'back' ? Object.freeze({ ...n, mode: 'manage', pick: null }) : n; } }],
  ['P4', 'C1', 'the summary over the source', { ...REAL, panels: (s) => (s.mode === 'look' ? Object.freeze({ left: 'panel', right: 'panel', [s.from]: 'summary', page: false }) : wsPanels(s)) }],
  ['P5', 'C2', 'a second tap opening the look again', { ...REAL, step: (s, e) => (e && e.type === 'pick' && s && s.pick === String(e.key) ? s : wsStep(s, e)) }],
  ['P6', 'C3', 'the covered side\'s scroll overwritten', { ...REAL, step: (s, e) => (e && e.type === 'scroll' && s && s.mode === 'look' ? Object.freeze({ ...s, scroll: Object.freeze({ ...s.scroll, [e.side]: Math.max(0, e.top) }) }) : wsStep(s, e)) }],
  ['P7', 'C5', 'an empty cell opening a summary', { ...REAL, step: (s, e) => wsStep(s, e && e.type === 'pick' ? { ...e, look: true } : e) }],
];
for (const [p, c, what, M] of PLANTS) {
  let r;
  try { r = CHECKS[c](M); } catch (e) { r = 'threw'; }
  check(`${p} (${what}) turns ${c} red`, !!r, 'the plant stayed green');
}

/* v2.3.6688: the mutants the suite first let live */
{
  const r = run(REAL, [{ type: 'scroll', side: 'right', top: 50 }, { type: 'pick', side: 'left', key: 'b1' }, { type: 'close' }]);
  check('the right side\'s scroll is kept too', wsScroll(r, 'right') === 50 && wsScroll(run(REAL, [{ type: 'scroll', side: 'right', top: -3 }]), 'right') === 0, txt(r));
  const s0 = wsStart();
  check('a pick with no key, or no side, changes nothing', wsStep(s0, { type: 'pick', side: 'left' }) === s0 && wsStep(s0, { type: 'pick', key: 'b1' }) === s0);
  check('close at rest is the same state', wsStep(s0, { type: 'close' }) === s0);
  const ec = run(REAL, [{ type: 'pick', side: 'right', key: 'cape', look: false }, { type: 'close' }]);
  check('close puts down an empty cell picked in management', ec.mode === 'manage' && ec.pick === null, txt(ec));
  const pg = run(REAL, [{ type: 'pick', side: 'left', key: 'b1' }, { type: 'details' }]);
  check('a scroll under the page, or of no side, is not recorded', wsStep(pg, { type: 'scroll', side: 'left', top: 9 }) === pg && wsStep(s0, { type: 'scroll', side: 'x', top: 9 }) === s0);
  check('a look is not the page', wsPanels(run(REAL, [{ type: 'pick', side: 'left', key: 'b1' }])).page === false);
}

/* ── 7. in the source ── */
{
  const rd = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; } };
  const panels = rd('src/ui/mobile/dash/GearPanels.jsx');
  const gear = rd('src/ui/mobile/dash/GearTab.jsx');
  const bus = rd('src/ui/mobile/dash/gearTabBus.js');
  check('Gear\'s two panels draw from wsPanels', /\bwsPanels\(/.test(panels));
  check('the workspace moves only by wsStep (gearTabBus.ws)', /\bwsStep\(/.test(bus) && !/\bwsStep\(/.test(panels) && !/\bws\s*=\s*\{\s*mode/.test(panels));
  check('the summary\'s Details opens the ONE item page', /import \{ openItemPage[^}]*\} from '\.\/itemPageOpen\.js'/.test(panels) && /openItemPage\(\{ from: 'gear'/.test(panels) && !/data-item-page=/.test(panels));
  const cell = rd('src/ui/kit/ItemGrid.jsx');
  check('the picked square wears the kit\'s selected state (the grid\'s selectedKey, the worn cell\'s selected; the kit cell draws is-sel)',
    /selectedKey=\{selKey\}/.test(panels) && /selected=\{picked\}/.test(panels) && /' is-sel'/.test(cell) && /\bwsPicked\(/.test(panels));
  check('the summary is the page\'s model cut short (itemSummary of inspectItem)', /\bitemSummary\(/.test(panels) && /\binspectItem\(/.test(panels) && /\bcompareSet\(/.test(panels) && /\bprojectEquip\(/.test(panels));
  check('today\'s Gear stays under ?ui2=0: GearTab hands over only under the frame', /if \(frameOn\) return <GearPanels\b/.test(gear) && /\bui2FrameOn\(\)/.test(gear));
  check('no middle column in the panels (no figure, no bars)', !/CharacterView|VitalBar/.test(panels));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
