/* ═══ v2.3.6688: THE ONE COMPARISON HOLDS (card UI2-gear PR 2, the build's step 5) ═══
 *
 * src/game/compare.js (the transformation form), src/game/equipProject.js
 * (you now, and you if equipped) and itemInspect.js's itemSummary (the quick
 * look, cut from the one page's model).  Here, not in server/test (a file
 * there deploys the worker).  It holds the owner's specification (part 3.1:
 * "Current and comparison values, then signed change (percentage where
 * meaningful)"; part 5.1: "Compare final outcome, not merely raw item
 * modifiers ... Do not label items universally better/worse"):
 *   1. a percentage only from a real baseline above zero: never from 0,
 *      never with nothing worn ("Nothing worn" and the plain value), never a
 *      percent of a percent (Damage cut, Block);
 *   2. each metric's good way: an attack's seconds LOWER is good, so a slower
 *      weapon's seconds are never a gain; direction by an arrow and a word,
 *      not by colour alone; unchanged reads "No change";
 *   3. the subjects by mode: "Now" / "If equipped" for a piece you would put
 *      on, "You" / their name between two players (never "If equipped");
 *   4. a weapon leads with DPS, armour with "Damage cut", a shield with
 *      Block; no effective-health number anywhere (F1, the owner's);
 *   5. the projected DPS is calcDisplayDps on YOUR character with that
 *      weapon in its lane (two characters, one sword: two numbers), never the
 *      item's own numbers; armour's is your whole cut with the piece in;
 *   6. no verdict: nothing calls an item better or worse overall, and the
 *      tradeoff line speaks only when one number went each way;
 *   7. the summary is the page's model cut short (same name, grade, facts):
 *      an item that is not yours has no action; one you cannot wear keeps
 *      Equip off WITH its reason; Sell only at a shop; a consumable has its
 *      own facts and action, never only a name and Details;
 *   8. at most two supporting rows; a restricted item says why.
 *
 * THE DODGES, played every run (a plant that stays green fails the suite):
 *   P1 a percentage worked from a zero baseline
 *   P2 nothing worn read as 0 (a gain over nothing as a percentage)
 *   P3 a slower weapon's attack seconds shown as a gain (higher is better)
 *   P4 "If equipped" between two players
 *   P5 the projected DPS from the item's raw numbers, not your character
 *   P6 armour headed by an effective-health number
 *   P7 an item called better overall
 *   P8 a percentage of a percentage (Damage cut)
 *   P9 the summary's facts made apart from the page's model
 *  P10 the summary's action kept on another player's item
 *  P11 unchanged read as a change
 *  P12 the colour alone: no arrow or word on a change
 *
 * Run: node tools/guards/compare.test.mjs
 */
import { compareRow, compareSet, compareSubjects, metricDef, tradeoffLine, COMPARE_PLAN } from '../../src/game/compare.js';
import { projectEquip, weaponNumbers, cutNumbers, wornNumbers, projectKind } from '../../src/game/equipProject.js';
import { inspectItem, itemSummary } from '../../src/game/itemInspect.js';
import { SAY } from '../../src/data/say/compare.js';
import { calcDisplayDps } from '../../src/data/gameSystems.js';

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 800))); }
}

/* ── fixtures: two characters and the pieces a bag holds ── */
const SWORD_A = { type: 'sword', damage: 10, name: 'Iron Sword', quality: 'normal' };
const SWORD_B = { type: 'sword', damage: 22, name: 'Rare Steel Sword', quality: 'rare' };
const WEAK = { level: 3, power: 1, weapon: SWORD_A, maxHp: 100 };
const STRONG = { level: 30, power: 40, weapon: SWORD_A, maxHp: 300 };

const VERDICT = /\b(better|worse|upgrade|downgrade|best|worst)\b/i;
const EHP = /effective|\behp\b/i;
const txt = (o) => JSON.stringify(o);

/* the makers a plant can replace: the row, the set, the projection, the summary */
const REAL = { row: compareRow, set: compareSet, subjects: compareSubjects, project: projectEquip, summary: itemSummary };

const CHECKS = {
  C1(M) {   /* percentages only from a real baseline */
    const z = M.row('dps', 0, 5);
    if (!z || z.change.pct != null || /%/.test(z.change.v) || /Infinity|NaN/.test(txt(z))) return 'zero baseline: ' + txt(z && z.change);
    const n = M.row('dps', null, 5);
    if (!n || n.change.pct != null || n.change.v !== '' || n.change.say !== 'Nothing worn' || n.a.v !== 'Nothing worn' || n.b.v !== '5') return 'nothing worn: ' + txt(n);
    const r = M.row('dps', 10, 12.5);
    if (!r || r.change.pct !== 25 || r.change.v !== '+25%' || r.a.v !== '10' || r.b.v !== '12.5') return 'a real baseline: ' + txt(r);
    const d = M.row('dps', 20, 15);
    if (!d || d.change.pct !== -25 || d.change.v !== '−25%') return 'a fall: ' + txt(d && d.change);
    return '';
  },
  C2(M) {   /* each metric's good way */
    const slow = M.row('swing', 0.6, 0.9);
    if (!slow || slow.change.good !== -1 || slow.change.dir !== 'up' || !/slower/.test(slow.change.words)) return 'a slower weapon: ' + txt(slow && slow.change);
    const fast = M.row('swing', 0.9, 0.6);
    if (!fast || fast.change.good !== 1 || !/faster/.test(fast.change.words)) return 'a faster weapon: ' + txt(fast && fast.change);
    const up = M.row('dps', 10, 11);
    if (!up || up.change.good !== 1 || up.change.dir !== 'up') return 'dps up: ' + txt(up && up.change);
    if (metricDef('swing').goodWay !== 'lower') return 'swing is not lower-is-better';
    for (const k of ['dps', 'hit', 'cut', 'block', 'def', 'stamina']) if (metricDef(k).goodWay !== 'higher') return k + ' is not higher-is-better';
    return '';
  },
  C3(M) {   /* the subjects */
    const e = M.subjects('equip');
    if (e.a !== 'Now' || e.b !== 'If equipped') return 'equip: ' + txt(e);
    const v = M.subjects('versus', 'Diego');
    if (v.a !== 'You' || v.b !== 'Diego' || /equipped/i.test(txt(v))) return 'versus: ' + txt(v);
    const s = M.set({ kind: 'sword', mode: 'versus', name: 'Diego', a: { dps: 5 }, b: { dps: 6 } });
    if (!s || /equipped/i.test(txt(s.subjects))) return 'a set between two players: ' + txt(s && s.subjects);
    return '';
  },
  C4(M) {   /* the headlines */
    for (const k of ['sword', 'bow', 'staff']) { const s = M.set({ kind: k, a: { dps: 1, hit: 1, swing: 1 }, b: { dps: 2, hit: 2, swing: 1 } }); if (!s || s.head.key !== 'dps') return k + ': ' + (s && s.head.key); }
    for (const k of ['chest', 'legs']) { const s = M.set({ kind: k, a: { cut: 10 }, b: { cut: 20 } }); if (!s || s.head.key !== 'cut' || s.head.label !== 'Damage cut') return k + ': ' + txt(s && s.head); }
    const sh = M.set({ kind: 'shield', a: null, b: { block: 20, def: 3, stamina: 5 } });
    if (!sh || sh.head.key !== 'block') return 'shield: ' + txt(sh && sh.head);
    const all = txt([COMPARE_PLAN, ['dps', 'hit', 'swing', 'cut', 'block', 'def', 'stamina'].map(metricDef), M.set({ kind: 'chest', a: { cut: 1 }, b: { cut: 2 } })]);
    if (EHP.test(all) || EHP.test(Object.values(SAY).join(' '))) return 'an effective-health number: ' + all.slice(0, 300);
    if (M.set({ kind: 'amulet', a: null, b: { dps: 1 } }) !== null || M.set({ kind: 'item', b: {} }) !== null) return 'a kind with nothing to compare got a comparison';
    return '';
  },
  C5(M) {   /* projected on YOUR character, by calcDisplayDps */
    const w = M.project(WEAK, SWORD_B, 'weapon');
    const s = M.project(STRONG, SWORD_B, 'weapon');
    if (!w || !s || w.kind !== 'sword') return 'no projection: ' + txt(w);
    const want = (R) => calcDisplayDps({ ...R, weapon: SWORD_B, activeSlot: 'melee' }, SWORD_B);
    if (Math.abs(w.then.dps - want(WEAK)) > 1e-9 || Math.abs(s.then.dps - want(STRONG)) > 1e-9) return `then.dps ${w.then.dps}/${s.then.dps} against ${want(WEAK)}/${want(STRONG)}`;
    if (Math.abs(w.then.dps - s.then.dps) < 1e-9) return 'two characters, one sword, one number: the item\'s own numbers';
    const nowWant = calcDisplayDps({ ...WEAK, activeSlot: 'melee' }, SWORD_A);
    if (Math.abs(w.now.dps - nowWant) > 1e-9) return `now.dps ${w.now.dps} against ${nowWant}`;
    const bow = M.project(WEAK, { type: 'bow', damage: 9 }, 'weapon');
    if (!bow || bow.kind !== 'bow' || bow.now !== null || !(bow.then.dps > 0)) return 'a bow with no bow worn: ' + txt(bow);
    const ch = M.project(WEAK, { name: 'Iron Torso', dr: 0.1, quality: 'rare' }, 'chest');
    const chWant = cutNumbers({ ...WEAK, armor: { name: 'Iron Torso', dr: 0.1, quality: 'rare' } }).cut;
    if (!ch || ch.then.cut !== chWant || ch.now.cut !== cutNumbers(WEAK).cut) return 'armour: ' + txt(ch) + ' want ' + chWant;
    return '';
  },
  C6(M) {   /* no verdict */
    const sets = [
      M.set({ kind: 'sword', a: { dps: 5, hit: 5, swing: 0.6 }, b: { dps: 9, hit: 9, swing: 0.9 } }),
      M.set({ kind: 'sword', a: { dps: 9, hit: 9, swing: 0.6 }, b: { dps: 5, hit: 5, swing: 0.6 } }),
      M.set({ kind: 'chest', a: { cut: 5 }, b: { cut: 9 } }),
    ];
    for (const s of sets) {
      if (!s) return 'no set';
      if (VERDICT.test(txt(s)) || 'verdict' in s || 'better' in s || 'best' in s) return 'a verdict: ' + txt(s).slice(0, 300);
    }
    if (sets[0].tradeoff !== 'More damage per second, stronger hits, slower attacks') return 'the tradeoff: ' + sets[0].tradeoff;
    if (sets[1].tradeoff !== '' || sets[2].tradeoff !== '') return 'a tradeoff where all went one way: ' + sets[1].tradeoff + ' / ' + sets[2].tradeoff;
    if (VERDICT.test(Object.values(SAY).join(' '))) return 'a verdict in the words table';
    return '';
  },
  C7(M) {   /* the summary is the page's model cut short */
    const input = { place: 'bag', kind: 'sword', name: 'Rare Steel Sword', quality: 'rare', rows: [{ k: 'Damage', v: '12–18' }, { k: 'DPS', v: '9.4' }, { k: 'Speed', v: '1.2/s' }],
      actions: [{ id: 'equip', label: 'Equip', tone: 'primary' }, { id: 'sell', label: 'Sell' }, { id: 'drop', label: 'Drop' }] };
    const page = inspectItem(input);
    const sum = M.summary(page, 'sword', null);
    if (sum.name !== page.name || sum.gradeWord !== page.gradeWord || sum.stars !== page.stars || sum.where !== page.where) return 'identity: ' + txt(sum);
    if (!sum.head || sum.head.k !== 'DPS' || sum.head.v !== '9.4' || !sum.facts.every((f) => page.facts.some((g) => g.k === f.k && g.v === f.v))) return 'facts not the page\'s: ' + txt([sum.head, sum.facts]);
    if (!sum.action || sum.action.id !== 'equip') return 'the action: ' + txt(sum.action);
    if (sum.actions.some((a) => a.id === 'sell')) return 'Sell away from a shop';
    const other = M.summary(inspectItem({ ...input, place: 'other', owner: 'Diego' }), 'sword', null);
    if (other.action || other.actions.length) return 'an action on another player\'s item: ' + txt(other.actions);
    const locked = M.summary(inspectItem({ ...input, req: { stat: 'sword', req: 25, have: 18, met: false } }), 'sword', null);
    if (!locked.action || locked.action.id !== 'equip' || !locked.action.off || !/18.*25/.test(locked.action.why)) return 'a piece you cannot wear: ' + txt(locked.action);
    const fish = M.summary(inspectItem({ place: 'bag', kind: 'item', name: 'Cooked Trout', line: 'Heals 40 HP', count: 7, actions: [{ id: 'eat', label: 'Eat', tone: 'primary' }] }), 'item', null);
    if (!fish.action || fish.action.id !== 'eat' || fish.line !== 'Heals 40 HP' || !fish.facts.some((f) => f.v === '7')) return 'a consumable\'s own facts and action: ' + txt(fish);
    return '';
  },
  C8(M) {   /* at most two rows; the restricted reason; unchanged; arrows and words */
    const s = M.set({ kind: 'sword', a: { dps: 5, hit: 5, swing: 0.6 }, b: { dps: 5, hit: 6, swing: 0.6 }, restricted: 'Sword level 18, requires 25' });
    if (!s || s.rows.length > 2 || s.restricted !== 'Sword level 18, requires 25') return txt(s);
    if (s.head.change.dir !== 'same' || s.head.change.say !== 'No change' || s.head.change.good !== 0 || s.head.change.v !== '') return 'unchanged: ' + txt(s.head.change);
    const r = s.rows.find((x) => x.key === 'hit');
    if (!r || r.change.arrow !== '▲' || !r.change.words || !r.change.say.includes(r.change.words)) return 'a change without its arrow and word: ' + txt(r && r.change);
    const dn = M.row('hit', 6, 5);
    if (!dn || dn.change.arrow !== '▼' || !/weaker/.test(dn.change.words)) return 'a fall without its arrow and word: ' + txt(dn && dn.change);
    const cut = M.row('cut', 10, 15);
    if (!cut || cut.change.pct != null || cut.change.v !== '+5%' || cut.a.v !== '10%') return 'a percent of a percent: ' + txt(cut);
    return '';
  },
};

/* the real modules pass every check */
for (const [k, fn] of Object.entries(CHECKS)) {
  let r;
  try { r = fn(REAL); } catch (e) { r = 'threw ' + (e && e.stack || e); }
  check(`${k}: the comparison holds`, !r, r);
}

/* ── the dodges ── */
const withRow = (patch) => ({ ...REAL, row: (k, a, b) => { const r = compareRow(k, a, b); return r ? patch(r, k, a, b) : r; }, set: (i) => compareSet(i) });
const PLANTS = [
  ['P1', 'C1', 'a percentage from a zero baseline', { ...REAL, row: (k, a, b) => { const r = compareRow(k, a, b); if (r && a === 0) r.change = { ...r.change, pct: Infinity, v: '+∞%' }; return r; } }],
  ['P2', 'C1', 'nothing worn read as 0', { ...REAL, row: (k, a, b) => compareRow(k, a == null ? 0 : a, b) }],
  ['P3', 'C2', 'a slower weapon\'s seconds shown as a gain', { ...REAL, row: (k, a, b) => compareRow(k === 'swing' ? { ...metricDef('swing'), goodWay: 'higher' } : k, a, b) }],
  ['P4', 'C3', '"If equipped" between two players', { ...REAL, subjects: () => compareSubjects('equip'), set: (i) => compareSet({ ...i, mode: 'equip' }) }],
  ['P5', 'C5', 'the projected DPS from the item\'s raw numbers', { ...REAL, project: (R, item, kind) => { const p = projectEquip(R, item, kind); if (p && p.then && item && item.damage) p.then = { ...p.then, dps: item.damage / 0.6 / 5 }; return p; } }],
  ['P6', 'C4', 'armour headed by effective health', { ...REAL, set: (i) => { const s = compareSet(i); return s && (i.kind === 'chest' || i.kind === 'legs') ? { ...s, head: { ...s.head, key: 'ehp', label: 'Effective health' } } : s; } }],
  ['P7', 'C6', 'an item called better overall', { ...REAL, set: (i) => { const s = compareSet(i); return s ? { ...s, verdict: s.head.change.good > 0 ? 'Better' : 'Worse' } : s; } }],
  ['P8', 'C8', 'a percentage of a percentage', { ...REAL, row: (k, a, b) => compareRow(k === 'cut' ? { ...metricDef('cut'), pct: true } : k, a, b) }],
  ['P9', 'C7', 'the summary\'s facts made apart from the page', { ...REAL, summary: (m, k, c) => { const s = itemSummary(m, k, c); return { ...s, head: s.head ? { ...s.head, v: '99' } : s.head }; } }],
  ['P10', 'C7', 'the summary\'s action on another player\'s item', { ...REAL, summary: (m, k, c) => { const s = itemSummary(m, k, c); return m.readOnly ? { ...s, action: { id: 'equip', label: 'Equip' }, actions: [{ id: 'equip' }] } : s; } }],
  ['P11', 'C8', 'unchanged read as a change', { ...REAL, set: (i) => { const s = compareSet(i); return s && s.head.change.dir === 'same' ? { ...s, head: { ...s.head, change: { ...s.head.change, dir: 'up', good: 1, v: '+0%', say: '0% more' } } } : s; } }],
  ['P12', 'C8', 'the colour alone, no arrow or word', withRow((r) => ({ ...r, change: { ...r.change, arrow: '', words: '' } }))],
];
for (const [p, c, what, M] of PLANTS) {
  let r;
  try { r = CHECKS[c](M); } catch (e) { r = 'threw'; }
  check(`${p} (${what}) turns ${c} red`, !!r, 'the plant stayed green');
}

/* ── the edges of the pieces themselves ── */
{
  check('projectKind: a bow by its type, armour as itself, a cape is nothing', projectKind({ type: 'bow' }, 'weapon') === 'bow' && projectKind({}, 'chest') === 'chest' && projectKind({}, 'cape') === null);
  check('projectEquip: nothing for a cape, an amulet or no item', projectEquip(WEAK, {}, 'cape') === null && projectEquip(WEAK, null, 'weapon') === null);
  check('weaponNumbers: no weapon in the lane is null', weaponNumbers({ level: 1 }, 'bow') === null);
  const wn = wornNumbers(WEAK, 'sword');
  check('wornNumbers: the worn sword on you', wn && Math.abs(wn.dps - calcDisplayDps({ ...WEAK, activeSlot: 'melee' }, SWORD_A)) < 1e-9, txt(wn));
  check('wornNumbers: nothing worn is null', wornNumbers(WEAK, 'bow') === null && wornNumbers(WEAK, 'chest') === null && wornNumbers(WEAK, 'cape') === null);
  const sh = projectEquip(WEAK, { name: 'Buckler', quality: 'normal', blockPct: 20 }, 'shield');
  check('a shield with none worn: nothing now, its numbers then', sh && sh.now === null && sh.then && Number.isFinite(sh.then.def), txt(sh));
  const sw = projectEquip(WEAK, SWORD_B, 'sword');
  check('the equip gate\'s requirement comes back for the reason', sw && 'req' in sw, txt(sw));
  check('compareRow: a number the item does not have is no row', compareRow('dps', 5, null) === null && compareRow('nope', 1, 2) === null);
  check('tradeoffLine: one way only is silent', tradeoffLine([compareRow('dps', 1, 2), compareRow('hit', 1, 2)]) === '' && tradeoffLine([]) === '');
  const tiny = compareRow('dps', 100, 100.1);
  check('a change under one percent prints its amount, never "+0%"', tiny && tiny.change.pct === null && tiny.change.v === '+0.1', txt(tiny && tiny.change));
  const sec = compareRow('swing', 0.6, 0.75);
  check('seconds print with their unit', sec && sec.a.v === '0.6s' && sec.b.v === '0.75s' && sec.change.pct === 25 && sec.change.v === '+25%', txt(sec));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
