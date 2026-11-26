/* ═══ v2.3.6683: A SCREEN'S PIECES HOLD (card UI2-bro, the build's step 3, PR 1) ═══
 *
 * src/game/screenZones.js (a screen's zones; its row of actions, each in its
 * place, on or off with its own rule's reason; which ask first) and
 * src/game/pending.js (what is out, what it holds, when its outcome is
 * unknown): the pieces every later page of the new dashboard uses, drawn by
 * the kit (Zones.jsx, ActionRow.jsx, Confirm.jsx).  Here, not in server/test
 * (a file there deploys the worker).
 *
 * THE DODGES (the card's list).  The checks are played against the real
 * rules (part 1) and against each PLANT, a wrapper that writes the dodge;
 * each plant must turn its own check red, every run (part 2).
 *   Z1 an empty zone keeps its room
 *   Z2 an action that is off loses its reason
 *   Z3 an action moves when its neighbour is absent
 *   Z4 a routine action asks for confirmation
 *   Z5 a costly or irreversible action does not ask
 *   Z6 a second press goes out while the first is out
 *   Z7 an unknown outcome reads as success (or frees its control)
 *   Z8 an action with no rule, or a rule that throws, is quietly on
 *
 * Run: node tools/guards/screen-zones.test.mjs
 */
import { SCREEN_ZONES, screenZones, screenActions, needsConfirm } from '../../src/game/screenZones.js';
import { pendingInit, pendingStep, pendingMark, pendingHolds, PENDING_WAIT_MS } from '../../src/game/pending.js';

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? '  -- ' + detail : '')); }
}

/* the checks, against an implementation { zones, actions, confirm, step, mark } */
function suite(I) {
  const out = [];
  const c = (name, ok, detail) => out.push({ name, ok: !!ok, detail });

  const z = I.zones({ identity: 'me', summary: null, doors: [], actions: ['equip'] });
  const ids = z.map((x) => x.id);
  c('Z1 an empty zone gives its room back (summary and doors left out; identity grows)',
    ids.join(' ') === 'identity actions' && z[0].grow, ids.join(' '));
  const all = I.zones({ identity: 1, summary: 1, doors: [1], actions: [1] });
  c('Z1b every zone drawn, in order, the doors growing',
    all.map((x) => x.id).join(' ') === SCREEN_ZONES.join(' ') && all.filter((x) => x.grow).map((x) => x.id).join() === 'doors',
    JSON.stringify(all));
  c('Z1c no actions: the actions\' zone is left out', I.zones({ identity: 1, actions: [] }).every((x) => x.id !== 'actions'));

  const ACTS = [
    { id: 'equip', slot: 0, cost: 'routine', check: () => null },
    { id: 'sell', slot: 1, cost: 'costly', check: () => 'Not at a shop' },
    { id: 'drop', slot: 2, cost: 'irreversible', check: () => null },
  ];
  const row = I.actions(ACTS);
  c('Z2 an action that is off stays, disabled, with its rule\'s own reason',
    row[1] && row[1].id === 'sell' && !row[1].on && row[1].why === 'Not at a shop', JSON.stringify(row[1]));
  c('Z2b an action that is on has no reason', row[0] && row[0].on && row[0].why == null);
  const gap = I.actions(ACTS.filter((a) => a.id !== 'sell'));
  c('Z3 an action keeps its place when its neighbour is absent (Drop stays third, the second an empty cell)',
    gap.length === 3 && gap[1] === null && gap[2] && gap[2].id === 'drop' && gap[0].id === 'equip', JSON.stringify(gap));
  c('Z3b no actions at all: an empty row', I.actions([]).length === 0 && I.actions(null).length === 0);
  c('Z4 a routine action never asks', !I.confirm(ACTS[0]) && row[0] && !row[0].confirm);
  c('Z5 a costly and an irreversible action ask first', I.confirm(ACTS[1]) && I.confirm(ACTS[2]) && row[2] && row[2].confirm);
  const odd = I.actions([{ id: 'x', slot: 0 }, { id: 'y', slot: 1, check: () => { throw new Error('no'); } }]);
  c('Z8 an action with no rule, or a rule that throws, is off (never quietly on)',
    odd[0] && !odd[0].on && odd[0].why && odd[1] && !odd[1].on && odd[1].why, JSON.stringify(odd));

  let p = pendingInit();
  p = I.step(p, { type: 'send', id: 'r1', holds: ['title:equip'], now: 1000 });
  const twice = I.step(p, { type: 'send', id: 'r2', holds: ['title:equip'], now: 1100 });
  c('Z6 a second press does not go out while the first is out', twice === p && !Object.prototype.hasOwnProperty.call(twice, 'r2'),
    Object.keys(twice).join(','));
  c('Z6b the control reads out (the pending mark) while it waits', I.mark(p, 'title:equip', 1500) === 'out');
  c('Z6c a control the request does not hold is free', I.mark(p, 'pet:rename', 1500) === 'free');
  const late = I.mark(p, 'title:equip', 1000 + PENDING_WAIT_MS + 1);
  c('Z7 no answer past its window reads unknown, never done, and still holds its control',
    late === 'unknown' && I.step(p, { type: 'send', id: 'r3', holds: ['title:equip'], now: 1000 + PENDING_WAIT_MS + 2 }) === p, late);
  const settled = I.step(p, { type: 'settle', id: 'r1' });
  c('Z7b the worker\'s word settles it: the control is free again', I.mark(settled, 'title:equip', 9e9) === 'free');
  const cleared = I.step(p, { type: 'clear' });
  c('Z7c a fresh state_sync settles everything out', Object.keys(cleared).length === 0);
  return out;
}

const REAL = { zones: screenZones, actions: screenActions, confirm: needsConfirm, step: pendingStep, mark: pendingMark };

console.log('1. the rules, as built');
for (const r of suite(REAL)) check('1. ' + r.name, r.ok, r.detail);
check('1. the pending state is safe for any request id (no prototype)',
  pendingHolds(pendingStep(pendingInit(), { type: 'send', id: '__proto__', holds: ['a'], now: 0 }), 'a') === '__proto__');

console.log('2. each dodge, planted, turns its check red');
const wrap = (patch) => Object.assign({}, REAL, patch);
const PLANTS = [
  ['Z1 an empty zone keeps its room', 'Z1', wrap({ zones: (h) => SCREEN_ZONES.map((id, i) => ({ id, grow: i === 2 })) })],
  ['Z2 an off action loses its reason', 'Z2', wrap({ actions: (a) => screenActions(a).map((x) => (x ? { ...x, why: null } : x)) })],
  ['Z2 an off action is dropped', 'Z2', wrap({ actions: (a) => screenActions(a).filter((x) => x && x.on) })],
  ['Z3 actions packed to the left', 'Z3', wrap({ actions: (a) => screenActions(a).filter(Boolean) })],
  ['Z4 every action asks', 'Z4', wrap({ confirm: () => true, actions: (a) => screenActions(a).map((x) => (x ? { ...x, confirm: true } : x)) })],
  ['Z5 nothing asks', 'Z5', wrap({ confirm: () => false, actions: (a) => screenActions(a).map((x) => (x ? { ...x, confirm: false } : x)) })],
  ['Z6 a second press goes out', 'Z6', wrap({ step: (s, a) => (a.type === 'send' ? { ...s, [a.id]: { holds: a.holds, since: a.now } } : pendingStep(s, a)) })],
  ['Z7 an unknown outcome reads as done', 'Z7', wrap({ mark: (s, c, now) => { const m = pendingMark(s, c, now); return m === 'unknown' ? 'free' : m; } })],
  ['Z8 no rule means on', 'Z8', wrap({ actions: (a) => screenActions((a || []).map((x) => (x && !x.check ? { ...x, check: () => null } : x))) })],
];
for (const [name, want, impl] of PLANTS) {
  let res;
  try { res = suite(impl); } catch (e) { res = [{ name: want + ' (threw)', ok: false }]; }
  const red = res.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
  check(`2. plant ${name}: turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
