/* ═══ v2.3.6688 (the mends): UNDER THE FRAME GEAR MOUNTS THE TWO PANELS; UNDER ?ui2=0 TODAY'S TAB (card UI2-gear) ═══
 *
 * The incident (the tests part, 2026-11-26): GearTab.jsx's GearTabTurn drew
 * `<GearTab>`, and inside that module `GearTab` is TODAY's three-panel tab
 * (only the EXPORT is renamed `GearTabChoice as GearTab`), so DashColumns ->
 * GearTabDeferred -> GearTabTurn drew today's Gear under the frame and the
 * two panels never mounted (mp-ui2gear 2 of 6).  A text pattern was what let
 * it through: the name read right and meant the other thing.
 *
 * So this suite reads the SYNTAX TREE and follows each JSX name through its
 * BINDING (Babel's scopes: a local name, an import followed into its file,
 * React.memo unwrapped), from `DashColumns` (what the band draws for Gear's
 * root), once with the frame's switch on and once off:
 *   - a branch on `ui2FrameOn()` (the frame's ONE switch, src/ui/mobile/
 *     ui2Frame.js, which is false under `?ui2=0`), directly or through a
 *     const that calls it, is taken one way: the other branch is not drawn,
 *     and an early return under it ends the block;
 *   - any other branch is drawn both ways (a choice on another switch
 *     cannot choose);
 *   - the workspace is the component whose own JSX carries `data-gear-ws`
 *     (GearPanels' root); today's tab is any component whose own JSX carries
 *     `data-gear-pane` (its Inventory, Equipped and card panes): found by
 *     their marks, never by their names, so a rename cannot dodge it.
 *   1. frame on: the workspace is reached, today's tab is not;
 *   2. frame off (`?ui2=0`): today's tab is reached, the workspace is not.
 *
 * THE DODGES, played every run on the real files with one change each (a
 * plant that stays green fails the suite):
 *   P1 the turn drawing the module's old component again (the incident)
 *   P2 the choice made on the wrong switch (not ui2FrameOn)
 *   P3 both mounted under the frame
 *   P4 the choice turned round (the panels under ?ui2=0)
 *
 * v2.3.6691: the follower is tools/guards/lib/jsxMount.mjs (shared with
 * quests-mount.test.mjs).
 * Run: node tools/guards/gear-mount.test.mjs  (needs @babel/parser and
 * @babel/traverse: npm install in the root or server/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBabel, mountReach } from './lib/jsxMount.mjs';   /* v2.3.6691: the follower, shared with quests-mount (card UI2-quests) */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 800))); }
}

const B = loadBabel(ROOT);
check('0. @babel/parser and @babel/traverse load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);

const START = { file: 'src/ui/mobile/dash/DashColumns.jsx', name: 'DashColumns' };
const GEAR = 'src/ui/mobile/dash/GearTab.jsx';
const analyse = (over) => {
  const r = mountReach({ B, root: ROOT, start: START, switchFile: 'src/ui/mobile/ui2Frame.js', switchName: 'ui2FrameOn', marks: ['data-gear-ws', 'data-gear-pane'], over });
  const side = (x) => (x.error ? { error: x.error } : { ws: x.found['data-gear-ws'], old: x.found['data-gear-pane'], order: x.order });
  return { on: side(r.on), off: side(r.off) };
};

const verdict = (r) => {
  const bad = [];
  if (r.on.error || r.off.error) return [r.on.error || r.off.error];
  if (!r.on.ws.length) bad.push('frame on: the workspace (data-gear-ws) is not reached; drawn: ' + r.on.order.slice(0, 8).join(' > '));
  if (r.on.old.length) bad.push('frame on: today\'s tab is reached too: ' + r.on.old.join(', '));
  if (!r.off.old.length) bad.push('?ui2=0: today\'s tab (data-gear-pane) is not reached');
  if (r.off.ws.length) bad.push('?ui2=0: the workspace is reached: ' + r.off.ws.join(', '));
  return bad;
};

const real = analyse(null);
const bad = verdict(real);
if (real.on.error || real.off.error) { check('1. the start found', false, real.on.error || real.off.error); process.exit(1); }
check('1. frame on: Gear\'s root mounts the two panels (' + real.on.ws.join(', ') + ') and not today\'s tab', !bad.some((b) => b.startsWith('frame on')), bad.join('\n     '));
check('2. ?ui2=0: Gear\'s root mounts today\'s tab (' + real.off.old.join(', ') + ') and not the workspace', !bad.some((b) => b.startsWith('?ui2=0')), bad.join('\n     '));

/* the dodges: one change each to GearTab.jsx's text, read again */
const gear = fs.readFileSync(path.join(ROOT, GEAR), 'utf8');
const swap = (from, to) => { if (gear.split(from).length !== 2) return null; return gear.replace(from, to); };
const PLANTS = [
  ['P1', 'the turn drawing the module\'s old component', swap('return <GearTabChoice R={p.R} desk={p.desk} />;', 'return <GearTab R={p.R} desk={p.desk} />;')],
  ['P2', 'the choice made on the wrong switch', swap('try { return ui2FrameOn(); }', 'try { return !!(typeof window !== \'undefined\' && window.__btUi2); }')],
  ['P3', 'both mounted under the frame', swap('if (frameOn) return <GearPanels R={props.R} />;', 'if (frameOn) return <><GearPanels R={props.R} /><GearTab {...props} /></>;')],
  ['P4', 'the choice turned round', swap('if (frameOn) return <GearPanels R={props.R} />;', 'if (!frameOn) return <GearPanels R={props.R} />;')],
];
for (const [id, what, text] of PLANTS) {
  if (text === null) { check(`${id} (${what}): its line is found once in GearTab.jsx`, false, 'the plant\'s line moved: update the plant'); continue; }
  const b = verdict(analyse({ [GEAR]: text }));
  check(`${id} (${what}) turns the suite red`, b.length > 0, 'the plant stayed green');
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
