/* ═══ v2.3.6687: THE ONE ITEM PAGE HOLDS (card UI2-gear PR 1, the build's step 5) ═══
 *
 * src/game/itemInspect.js turns what an opener knows of an item into what the
 * one item page (src/ui/mobile/dash/ItemPage.jsx) draws.  Here, not in
 * server/test (a file there deploys the worker), this suite plays it and
 * holds the owner's specification (part 5: "Context and permissions govern
 * available actions; read-only inspection for others. Do not duplicate the
 * data model"; Q83: an action you cannot take stays, off, with its reason)
 * and the game's own content over the mockup's (the grades are Normal, Rare,
 * Elite, Godly):
 *   1. every stored quality reads as one of the game's four grades with its
 *      stars (one to four); anything else (a mockup's "common", "epic",
 *      "legendary") reads Normal, and no word of the model says them;
 *   2. another player's item, a shop's goods and a Codex entry offer no
 *      action at all (no Equip on what is not yours);
 *   3. an action that is off always carries its reason;
 *   4. an item whose requirement is not met keeps Equip, OFF, with the
 *      requirement's two numbers beside it ("Sword level 18, requires 25");
 *      met, or unknown (an older worker), Equip stays on;
 *   5. Sell only in a shop (the bag while one is open), never elsewhere;
 *   6. ONE item, ONE page: the same item opened from the bag, worn, the
 *      Codex or another player's page has the same name, grade, stars and
 *      facts (only `where` and the actions differ);
 *   7. an off action of the one list is kept, never dropped;
 *   8. no item is called better or worse overall;
 *   9. a "?" piece (not yet revealed) shows no grade, no stars, no numbers;
 *  10. the lead action first (the list's primary even when off); "Speed"
 *      reads "Attack speed"; at most six facts;
 *  11. one page in the source: ItemPage.jsx draws the model (inspectItem)
 *      and nothing else under src/ui draws an item page (data-item-page);
 *      the frame has ONE 'item' page; Gear's card opens it (openItemPage).
 *
 * THE DODGES, played every run (a plant that stays green fails the suite):
 * each is a tired way to write the model, and must turn its check red.
 *   P1 the grade's word made from the stored quality ("epic" -> "Epic")
 *   P2 the actions kept on another player's item (Equip on what is not yours)
 *   P3 Equip turned off by its requirement with no reason beside it
 *   P4 Equip left on although the requirement is not met
 *   P5 Sell kept away from a shop
 *   P6 the facts made by place (the Codex shows fewer than Gear)
 *   P7 an action that is off dropped from the row instead of kept
 *   P8 an overall verdict ("Better") among the facts
 *   P9 a "?" piece's grade shown
 *  P10 the lead action not first
 *
 * Run: node tools/guards/item-inspect.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectItem, itemGrade, ITEM_GRADES, reqWords, itemSummary } from '../../src/game/itemInspect.js';
import { SAY } from '../../src/data/say/itemInspect.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 800))); }
}

/* ── the fixtures: the one list's answers as itemActions.js gives them ── */
const LIST = () => [
  { id: 'equip', label: 'Equip', tone: 'primary', off: false, why: '', attrs: null },
  { id: 'sell', label: 'Sell', tone: undefined, off: false, why: '', attrs: null },
  { id: 'drop', label: 'Drop', tone: undefined, off: true, why: 'Pinned: unpin it first', attrs: null },
  { id: 'lock', label: 'Pin', tone: undefined, off: false, why: '', attrs: null },
];
const SWORD = (over) => ({
  place: 'bag', kind: 'sword', name: 'Rare Iron Longsword', quality: 'rare', art: '/x.webp',
  rows: [{ k: 'Damage', v: '12–18' }, { k: 'DPS', v: '9.4' }, { k: 'Speed', v: '1.2/s' }, { k: 'Range', v: '1.4' }],
  hardness: 3, gems: ['Fire Gem'], req: { stat: 'sword', req: 25, have: 18, met: false, label: 'Melee Lv' },
  actions: LIST(), ...(over || {}),
});
const FISH = (over) => ({
  place: 'bag', kind: 'item', name: 'Cooked Trout', quality: null, line: 'Heals 40 HP', count: 7,
  actions: [{ id: 'eat', label: 'Eat', tone: 'primary', off: false, why: '' }, { id: 'drop', label: 'Drop', off: false, why: '' }],
  ...(over || {}),
});
const MOCK_WORDS = /\b(common|epic|legendary)\b/i;
/* v2.3.6688 (the mends): today's card's words for a "?" piece, read off game/revealBag.js revealCardFor (its
   imports are the page's, so its text is read, not run): the page must say the same */
const HIDDEN_LINE = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'src/game/revealBag.js'), 'utf8');
  const body = src.slice(src.indexOf('export function revealCardFor'));
  const m = body.match(/\binfo:\s*'([^']+)'/);
  return m ? m[1] : '(revealCardFor\'s info not found)';
})();
const allText = (m) => JSON.stringify([m.title, m.name, m.gradeWord, m.where, m.line, m.facts, m.actions.map((a) => [a.label, a.why])]);

/* ── the checks, each a function of a model maker, so a plant can be played ── */
const CHECKS = {
  C1(make) {
    const want = { normal: 'Normal', rare: 'Rare', elite: 'Elite', godly: 'Godly' };
    for (const q of Object.keys(want)) {
      const m = make(SWORD({ quality: q }));
      if (m.gradeWord !== want[q] || m.stars !== ITEM_GRADES[q] || m.grade !== q) return `quality ${q}: ${m.grade} ${m.gradeWord} ${m.stars}`;
    }
    for (const q of [undefined, null, 'common', 'epic', 'legendary', 'EPIC', '__proto__']) {
      const m = make(SWORD({ quality: q }));
      if (m.grade !== 'normal' || m.gradeWord !== 'Normal' || m.stars !== 1) return `quality ${q}: ${m.grade} ${m.gradeWord} ${m.stars}`;
      if (MOCK_WORDS.test(allText(m))) return `quality ${q}: a mockup's grade word in ${allText(m)}`;
    }
    return '';
  },
  C2(make) {
    for (const place of ['other', 'shop', 'codex']) {
      const m = make(SWORD({ place, owner: 'Diego', req: { stat: 'sword', req: 1, have: 9, met: true } }));
      if (m.actions.length) return `${place}: ${m.actions.map((a) => a.id)}`;
      if (!m.readOnly) return `${place}: not read-only`;
    }
    return '';
  },
  C3(make) {
    for (const i of [SWORD(), SWORD({ req: null }), FISH(), SWORD({ actions: [{ id: 'equip', label: 'Equip', tone: 'primary', off: true, why: '' }] })]) {
      const bad = make(i).actions.find((a) => a.off && !String(a.why || '').trim());
      if (bad) return `${bad.id} off with no reason`;
    }
    return '';
  },
  C4(make) {
    const m = make(SWORD());
    const eq = m.actions.find((a) => a.id === 'equip');
    if (!eq || !eq.off || !/18/.test(eq.why) || !/25/.test(eq.why) || !/Sword/.test(eq.why)) return `unmet: ${JSON.stringify(eq)}`;
    const met = make(SWORD({ req: { stat: 'sword', req: 25, have: 30, met: true } })).actions.find((a) => a.id === 'equip');
    if (!met || met.off) return `met: ${JSON.stringify(met)}`;
    const old = make(SWORD({ req: { stat: 'power', req: 10, label: 'Power' } })).actions.find((a) => a.id === 'equip');
    if (!old || old.off) return `unknown (an older worker): ${JSON.stringify(old)}`;
    return '';
  },
  C5(make) {
    for (const i of [SWORD(), SWORD({ place: 'worn' }), SWORD({ place: 'worn', atShop: true })]) {
      if (make(i).actions.some((a) => a.id === 'sell')) return `Sell at ${i.place} atShop=${!!i.atShop}`;
    }
    if (!make(SWORD({ atShop: true })).actions.some((a) => a.id === 'sell')) return 'no Sell in the bag at a shop';
    return '';
  },
  C6(make) {
    const pick = (m) => JSON.stringify([m.title, m.name, m.grade, m.gradeWord, m.stars, m.facts, m.line, m.art]);
    for (const base of [SWORD, FISH]) {
      const a = pick(make(base({ place: 'bag' })));
      for (const place of ['worn', 'codex', 'other', 'shop']) {
        const b = pick(make(base({ place, owner: 'Sam' })));
        if (a !== b) return `${place}:\n${a}\n${b}`;
      }
    }
    return '';
  },
  C7(make) {
    const m = make(SWORD({ req: null }));
    const d = m.actions.find((a) => a.id === 'drop');
    return d && d.off && d.why === 'Pinned: unpin it first' ? '' : `drop: ${JSON.stringify(d)}`;
  },
  C8(make) {
    for (const i of [SWORD(), SWORD({ quality: 'godly', req: null }), FISH()]) {
      const m = make(i);
      const t = JSON.stringify([m.title, m.facts, m.where, m.actions.map((a) => [a.label, a.why])]);
      if (/\b(better|worse|upgrade|downgrade)\b/i.test(t)) return t;
    }
    return '';
  },
  C9(make) {
    const m = make(SWORD({ hidden: true, name: 'Unrevealed Sword' }));
    if (m.gradeWord || m.stars || m.facts.some((f) => /\d/.test(f.v))) return JSON.stringify([m.gradeWord, m.stars, m.facts]);
    /* v2.3.6688 (the mends; mp-revealbag 3): a "?" with its rows and a real grade on file says today's card's words
       and shows nothing the reveal gives (no grade, no stars, no number, its own name only) */
    const t = make(SWORD({ hidden: true, name: 'Iron Torso', kind: 'chest', quality: 'elite', rows: [{ k: 'Damage cut', v: '12%' }],
      actions: [{ id: 'reveal', label: 'Reveal', tone: 'primary', off: false, why: '' }, { id: 'equip', label: 'Equip', off: false, why: '' }] }));
    if (t.line !== HIDDEN_LINE) return 'the line: ' + JSON.stringify(t.line) + ' (today\'s card: ' + HIDDEN_LINE + ')';
    if (t.grade || t.gradeWord || t.stars) return 'a grade: ' + JSON.stringify([t.grade, t.gradeWord, t.stars]);
    if (t.facts.some((f) => /\d/.test(f.v))) return 'a number: ' + JSON.stringify(t.facts);
    if (t.name !== 'Iron Torso' || /\b(Normal|Rare|Elite|Godly)\b/.test(t.name)) return 'the name: ' + t.name;
    const ids = t.actions.map((a) => a.id);
    if (!ids.includes('reveal') || !ids.includes('equip')) return 'the actions: ' + ids;
    const s = itemSummary(t, 'chest', null);
    if (s.line !== HIDDEN_LINE || s.stars || s.gradeWord || s.head || s.facts.some((f) => /\d/.test(f.v))) return 'the summary: ' + JSON.stringify(s);
    return '';
  },
  C10(make) {
    const m = make(SWORD());
    if (!m.actions.length || m.actions[0].id !== 'equip' || !m.actions[0].lead) return `lead: ${m.actions.map((a) => a.id)}`;
    if (!m.facts.some((f) => f.k === 'Attack speed') || m.facts.some((f) => f.k === 'Speed')) return `speed: ${JSON.stringify(m.facts)}`;
    if (m.facts.length > 6) return `${m.facts.length} facts`;
    const f = make(FISH());
    if (f.actions[0].id !== 'eat' || !f.facts.some((x) => x.k === 'You hold' && x.v === '7')) return JSON.stringify(f);
    return '';
  },
};

/* the real model passes every check */
for (const [k, fn] of Object.entries(CHECKS)) {
  let r;
  try { r = fn(inspectItem); } catch (e) { r = 'threw ' + (e && e.stack || e); }
  check(`${k}: the model holds`, !r, r);
}

/* ── the dodges: each tired spelling must turn its check red ── */
const re = (m, patch) => Object.freeze({ ...m, ...patch });
const PLANTS = [
  ['P1', 'C1', 'the grade word from the stored quality', (i) => { const m = inspectItem(i); const q = String(i.quality || 'normal'); return re(m, { gradeWord: q.charAt(0).toUpperCase() + q.slice(1) }); }],
  ['P2', 'C2', 'the actions kept on another player\'s item', (i) => { const m = inspectItem({ ...i, place: 'bag' }); return re(inspectItem(i), { actions: m.actions }); }],
  ['P3', 'C3', 'Equip off by its requirement with no reason', (i) => { const m = inspectItem(i); return re(m, { actions: m.actions.map((a) => (a.off && a.id === 'equip' ? { ...a, why: '' } : a)) }); }],
  ['P4', 'C4', 'Equip left on though the requirement is not met', (i) => inspectItem({ ...i, req: i.req ? { ...i.req, met: true } : i.req })],
  ['P5', 'C5', 'Sell kept away from a shop', (i) => inspectItem({ ...i, atShop: true, place: i.place === 'worn' ? 'bag' : i.place })],
  ['P6', 'C6', 'the facts made by place', (i) => { const m = inspectItem(i); return i.place === 'codex' ? re(m, { facts: m.facts.slice(0, 1) }) : m; }],
  ['P7', 'C7', 'an off action dropped', (i) => { const m = inspectItem(i); return re(m, { actions: m.actions.filter((a) => !a.off) }); }],
  ['P8', 'C8', 'an overall verdict among the facts', (i) => { const m = inspectItem(i); return re(m, { facts: [...m.facts, { k: 'Overall', v: 'Better' }] }); }],
  ['P9', 'C9', 'a "?" piece\'s grade shown', (i) => { const m = inspectItem(i); const g = itemGrade(i.quality); return re(m, { gradeWord: g.word, stars: g.stars }); }],
  ['P10', 'C10', 'the lead not first', (i) => { const m = inspectItem(i); return re(m, { actions: [...m.actions].reverse() }); }],
  ['P11', 'C9', 'a "?" piece\'s name shown with its grade', (i) => { const m = inspectItem(i); return i.hidden && i.quality ? re(m, { name: itemGrade(i.quality).word + ' ' + m.name }) : m; }],
  ['P12', 'C9', 'a "?" piece\'s stars shown (the grade at rest)', (i) => { const m = inspectItem(i); return i.hidden && i.quality ? re(m, { grade: itemGrade(i.quality).grade, stars: itemGrade(i.quality).stars }) : m; }],
  ['P13', 'C9', 'a "?" piece\'s line lost behind its rows', (i) => { const m = inspectItem(i); return i.hidden && i.rows ? re(m, { line: '' }) : m; }],
];
for (const [p, c, what, plant] of PLANTS) {
  let r;
  try { r = CHECKS[c](plant); } catch (e) { r = 'threw'; }
  check(`${p} (${what}) turns ${c} red`, !!r, 'the plant stayed green');
}

/* reqWords: the numbers and the game's one vocabulary */
{
  const w = reqWords({ stat: 'bow', req: 12, have: 3, met: false });
  check('reqWords: a bow\'s requirement in the new screens\' words', w.asks === 'Bow level 12' && w.why === 'Bow level 3, requires 12', JSON.stringify(w));
  const l = reqWords({ stat: 'level', req: 5, have: 5, met: true });
  check('reqWords: a met level requirement asks, and says no reason', l.asks === 'Level 5' && l.why === '', JSON.stringify(l));
  check('reqWords: nothing asked, nothing said', JSON.stringify(reqWords(null)) === JSON.stringify({ asks: '', why: '' }));
}

/* the words table: none of the mockup's grades, no verdict */
{
  /* v2.3.6688 (the mends): the ONE allowed "better": a "?" piece's "Rare or better" (today's card's words, a range of
     grades the pile promises, not a verdict on the item) */
  const words = Object.entries(SAY).filter(([k]) => k !== 'itemInspect.hiddenLine').map(([, v]) => v).join(' | ');
  check('the page\'s words name no mockup grade and no verdict', !MOCK_WORDS.test(words) && !/\b(better|worse)\b/i.test(words), words);
}

/* ── 11. one page in the source ── */
{
  const rd = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; } };
  const page = rd('src/ui/mobile/dash/ItemPage.jsx');
  check('ItemPage.jsx draws the model (inspectItem) and wears data-item-page', /\binspectItem\(/.test(page) && /data-item-page=/.test(page));
  const drawers = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else if (/\.(jsx?|mjs)$/.test(e.name) && /data-item-page=/.test(rd(rel))) drawers.push(rel);
    }
  };
  walk('src');
  check('ONE item page: nothing else under src/ draws data-item-page', drawers.length === 1 && drawers[0].endsWith('ItemPage.jsx'), drawers.join(', '));
  const bd = rd('src/ui/mobile/BottomDashboard.jsx');
  const rows = bd.match(/^\s*item:\s*\{[^\n]*Component:\s*ItemPage\b/mg) || [];
  check('the frame has ONE \'item\' page, drawn by ItemPage', rows.length === 1, rows.length);
  /* v2.3.6688: under the frame Gear is the two panels (GearPanels.jsx), whose summary's Details is the door */
  const gear = rd('src/ui/mobile/dash/GearPanels.jsx');
  check('Gear\'s Details opens the one item page (openItemPage)', /import \{ openItemPage, itemPageInput \} from '\.\/itemPageOpen\.js'/.test(gear) && /openItemPage\(\{ from: 'gear'/.test(gear));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
