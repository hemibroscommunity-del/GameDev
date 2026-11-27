/* ═══ v2.3.6695: FEATS, WHAT IT MAY NEVER SAY (card UI2-feats, the build's step 6) ═══
 *
 * The owner, 2026-11-25: "Feats is the approved replacement for
 * Accomplishments"; the master specification 4.5: "AP (Achievement Points) is
 * the dominant headline of Feats, with a drill-down into its actual sources";
 * "Do not silently alter achievement requirements or AP values"; "never
 * fabricate a progression relation"; "Do not invent retroactive tracking."
 * 2026-11-26: "Titles could live within Feats."
 *
 * The rules (src/game/feats.js), run on seeded records, and the pages' files
 * read by their syntax tree.  It fails:
 *   F1  AP shown as the medals' sum instead of the worker's total;
 *   F2  "the rest" named as one of its parts ("from quests");
 *   F3  a tree whose joins miss the root (walked by metricTree.js treeMismatches);
 *   F4  the lever-lit case (the parts do not add up) drawn as a split;
 *   F5  the arena filed under Rare, or a tier called Gold, Silver or Bronze;
 *   F6  a tier's points as its value times its count (the fish rows pay their own);
 *   F7  a medal shown earned that the worker did not send;
 *   F8  a progress count where achvProgress has none ("0 of 1");
 *   F9  a title (Equip's road) on an unearned medal or on another player's;
 *   F10 a second list of titles (Feats' own, beside Character's one TitlesPage);
 *   F11 a Discoveries door (the worker keeps none);
 *   F12 a career row from Duels Won or Deepest Zone (no writer anywhere);
 *   F13 AP 0 before S._achv has come (the placeholder, never 0);
 *   F14 the Bro strip's title entry left after Feats took Titles;
 *   F15 Titles reachable from neither Feats nor Bro;
 *   F16 the worn title shown nowhere on Feats.
 * Each is PLANTED below, the tired programmer's way, and must turn its check
 * red (part 2), so the suite cannot rot into a pass.
 *
 * Run: node tools/guards/feats.test.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBabel } from './lib/jsxMount.mjs';
import * as F from '../../src/game/feats.js';
import { treeMismatches, treeNodes, SOURCES } from '../../src/game/metricTree.js';
import { ACHIEVEMENTS, ACHV_TIERS, achvAp } from '../../src/data/achievements.js';
import { achvApTotal, achvProgress } from '../../src/game/achievements.js';
import { BRO_STRIP, broStrip, BRO_PROGRESS_ROADS, PASSPORT_DOORS, titleActions } from '../../src/game/broHub.js';
import { SAY } from '../../src/data/say/feats.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1200))); }
}

/* ── the records: a worker's achv_state, as the phone keeps it (achievements.js onAchvState) ── */
const T0 = Date.UTC(2026, 10, 20);
const own = (o) => Object.assign(Object.create(null), o);
const rec = (got, ap, t) => ({ _achv: { known: true, unavailable: false, got: own(got), n: own({}), dg: own({}), t: t || null, ap, rev: 1 } });
/* First Blood, Blooded, an albino fish (its own 5), Gladiator, and 105 from quests and rungs */
const S_MINE = rec({ first_blood: T0, combat_10: T0 + 1, albino_minnow: T0 + 2, gladiator: T0 + 3 }, 10 + 10 + 5 + 500 + 105, 'combat_10');
/* the owner's lever lit Gladiator: it paid nothing, so the parts (510) pass the total (10) */
const S_LEVER = rec({ first_blood: T0, gladiator: T0 + 3 }, 10);
const S_NONE = {};                          /* nothing from the worker yet */
const S_EMPTY = rec({}, 0);
const S_EXACT = rec({ first_blood: T0 }, 10);                 /* only achievements: the parts are the total */
const S_UNAV = { _achv: { known: true, unavailable: true, got: own({}), n: own({}), dg: own({}), t: null, ap: 7, rev: 1 } };
const S_UNKNOWN = { _achv: { known: false, unavailable: false, got: own({ first_blood: T0 }), n: own({}), dg: own({}), t: null, ap: null, rev: 0 } };
const S_LV = Object.assign(rec({ combat_10: T0 }, 10), { rpg: { prog3: { sk: { sword: { level: 12 } } } } });   /* a weapon at 12: Veteran's hint */                 /* a new character, the record come */
const R_SEED = { svKills: 41, xp: 1234, _compStats: { deaths: 3, totalGoldEarned: 5600, duelsWon: 0, deepestZone: 'shallow' } };
const PASS = (id) => ({ titleId: id, earned: (x) => x === id, titleText: (x) => (x === 'combat_10' ? 'Blooded' : null), ap: 630, quests: 4 });

const REAL = {
  ap: F.featsAp, tree: F.apTree, tiers: F.featsTiers, gallery: F.featsGallery, medal: F.featsMedal,
  career: F.careerRows, landing: F.featsLanding, doors: F.FEATS_DOORS, TIERS: F.FEATS_TIERS, word: (k) => SAY[k],
  tierWord: F.featsWord, strip: broStrip, STRIP: BRO_STRIP, roads: BRO_PROGRESS_ROADS, fams: F.TITLE_FAMILIES, family: F.titleFamily,
};

function suite(I) {
  const out = [];
  const c = (name, ok, detail) => out.push({ name, ok: !!ok, detail });
  const ap = I.ap(S_MINE);
  c('F1 AP is the worker\'s total (achvApTotal), not the medals\' sum', ap.total === achvApTotal(S_MINE) && ap.total === 630 && ap.achv === 525, ap);
  const rest = String(I.word('feats.tRest') || '');
  c('F2 "the rest" names quests, guild rungs and the arena together, never one alone', /quests/i.test(rest) && /guild/i.test(rest) && /arena/i.test(rest), rest);
  const t = I.tree(S_MINE);
  const nodes = t ? treeNodes(t) : [];
  c('F3 AP\'s tree: every join gives its own value, the root the worker\'s total, its two parts achievements and the rest',
    !!t && treeMismatches(t).length === 0 && t.value === 630 && t.kids.map((k) => k.id + '=' + k.value).join(',') === 'fromAchv=525,rest=105'
      && nodes.every(({ node }) => node.kids || (node.source && SOURCES.includes(node.source.kind))),
    t ? { mis: treeMismatches(t), kids: t.kids.map((k) => [k.id, k.value]) } : null);
  const medalLeaves = nodes.filter(({ node }) => node.source && node.source.kind === 'medal' && node.source.id).map(({ node }) => node.id + '=' + node.value).sort().join(',');
  c('F3b each earned medal a leaf with its own points (the fish its 5)', medalLeaves === 'albino_minnow=5,combat_10=10,first_blood=10,gladiator=500', medalLeaves);
  const lv = I.ap(S_LEVER);
  c('F4 a lever-lit row (the parts pass the total): no split, no tree', !lv.known && lv.rest == null && I.tree(S_LEVER) === null && lv.total === 10, { lv, tree: !!I.tree(S_LEVER) });
  const tiers = I.tiers(S_MINE);
  const words = I.TIERS.map((x) => I.tierWord(x));
  const rareGal = I.gallery(S_MINE, 'rare').map((r) => r.id);
  c('F5 the game\'s four tiers, each its own (the arena not under Rare); never Gold, Silver or Bronze',
    I.TIERS.join(',') === 'common,rare,arena,superrare' && tiers.map((x) => x.id).join(',') === 'common,rare,arena,superrare'
      && rareGal.indexOf('gladiator') < 0 && I.gallery(S_MINE, 'arena').map((r) => r.id).join(',') === 'gladiator'
      && words.join(',') === 'Common,Rare,Arena,Super-rare' && !words.some((w) => /gold|silver|bronze/i.test(w)),
    { tiers: tiers.map((x) => x.id), words, rareGal });
  const want = Object.keys(ACHV_TIERS).map((k) => ACHIEVEMENTS.filter((d) => d.tier === k).reduce((n, d) => n + achvAp(d.id), 0));
  c('F6 a tier\'s points by each row\'s own (Common 95 possible, 25 earned with the fish\'s 5)',
    tiers.map((x) => x.max).join(',') === want.join(',') && tiers[0].max === 95 && tiers[0].pts === 25 && tiers[0].n === 3 && tiers[0].of === 12 && tiers[2].pts === 500,
    tiers.map((x) => [x.id, x.n, x.of, x.pts, x.max]));
  const g = I.medal(S_MINE, 'codex_all', null, T0);
  const gal = I.gallery(S_MINE, 'rare');
  c('F7 a medal is earned only when the worker sent it', g && !g.got && gal.every((r) => !r.got) && I.medal(S_MINE, 'gladiator', null, T0).got
    && I.gallery(S_NONE, 'common').every((r) => !r.got), { g, gal: gal.filter((r) => r.got).map((r) => r.id) });
  const tm = I.medal(S_MINE, 'tempered', null, T0);
  c('F8 no progress count where the game has none (Perfectly Tempered), achvProgress\'s words where it has (Veteran)',
    tm && tm.progress === null && achvProgress(S_MINE, 'tempered') === '' && I.medal(rec({}, 0), 'combat_50', null, T0).progress === null
      && I.medal(S_LV, 'combat_50', null, T0).progress === 'Your best: Lv 12',
    { tm: tm && tm.progress });
  const un = I.medal(S_MINE, 'combat_50', null, T0), them = I.medal(S_MINE, 'combat_10', { name: 'Sunburn' }, T0), mine = I.medal(S_MINE, 'combat_10', null, T0);
  c('F9 a title only on your own earned medal (never an unearned one, never another player\'s); Equip none for another player',
    un && un.title === null && them && them.title === null && !them.got && mine && mine.title && mine.title.name === 'Blooded' && mine.title.worn
      && titleActions({ name: 'Sunburn' }, 'combat_10', null, () => true).length === 0, { un: un && un.title, them: them && them.title, mine: mine && mine.title });
  const tdoor = I.doors.find((d) => d.id === 'titles');
  c('F10 Feats lists no titles of its own: its Titles door opens Character\'s one page (broTitles)', !!tdoor && tdoor.opens === PASSPORT_DOORS.titles && PASSPORT_DOORS.titles === 'page:broTitles', tdoor);
  c('F11 four doors, no Discoveries', I.doors.map((d) => d.id).join(',') === 'achievements,titles,quests,records', I.doors.map((d) => d.id));
  const cr = I.career(R_SEED);
  c('F12 the career rows only what has a writer: kills (the worker\'s), deaths, lifetime gold, lifetime XP; no Duels Won or Deepest Zone',
    cr.map((r) => r.id).join(',') === 'kills,deaths,gold,xp' && cr[0].v === 41 && !cr.some((r) => /duel|zone/i.test(r.id + r.k + r.icon)), cr);
  const wait = I.ap(S_NONE), wl = I.landing(S_NONE, null, PASS(null));
  c('F13 AP before the worker\'s record: the placeholder, never 0', wait.loading && wait.total === null && wl.ap.loading && wl.ap.total === null
    && I.ap(S_EMPTY).total === 0 && !I.ap(S_EMPTY).loading, { wait, empty: I.ap(S_EMPTY) });
  const st = I.strip(PASS('combat_10'), null).map((x) => x.id);
  c('F14 the Bro strip carries no title entry (Titles is Feats\')', I.STRIP.indexOf('title') < 0 && st.indexOf('title') < 0 && st.join(',') === 'ap,quests,clan,guilds', st);
  c('F15 Titles reachable for yourself: Feats\' Titles door, its road bro:feats/titles', !!tdoor && tdoor.opens === 'page:broTitles' && I.roads.titles === 'bro:feats/titles', { door: tdoor, road: I.roads.titles });
  const L = I.landing(S_MINE, null, PASS('combat_10'));
  const td = L.doors.find((d) => d.id === 'titles') || {};
  c('F16 the worn title shown on Feats (the Titles door\'s line)', td.worn === 'Blooded' && L.title && L.title.text === 'Blooded', td);
  /* another player's Feats: the stamped AP and title, "Not shared" for the rest, nothing opening */
  const O = I.landing(S_MINE, { name: 'Sunburn' }, PASS('combat_10'));
  c('F9b another player\'s Feats: the worker\'s AP and title; every door "Not shared" and opening nothing',
    O.ap.total === 630 && !O.ap.known && O.title && O.title.text === 'Blooded' && O.doors.every((d) => !d.shared && d.opens === null), O);
  /* the one family: got, next, locked by the record */
  const fam = I.family(S_MINE, I.fams[0]).map((x) => x.id + ':' + x.state).join(',');
  c('F17 one family only (Blooded, Veteran, Centurion), got, next, locked by what the worker sent', I.fams.length === 1 && fam === 'combat_10:got,combat_50:next,combat_100:locked', fam);
  /* the exact shapes (each line of feats.js held by one check: the mutation run of tag 6695) */
  const icon = (id) => (ACHIEVEMENTS.find((d) => d.id === id) || {}).icon;
  c('S1 a tier\'s page names its tier', Object.keys(F.FEATS_TIER_PAGES).every((t) => F.tierOfPage(F.FEATS_TIER_PAGES[t]) === t) && F.tierOfPage('featsMedal') === null);
  const unav = I.ap(rec({}, 0)), ex = I.ap(S_EXACT);
  c('S2 loading: not known; a worker that says unavailable: its total, not loading, not known', wait.known === false && !I.ap(S_UNAV).loading && !I.ap(S_UNAV).known && unav.known,
    { wait, unav: I.ap(S_UNAV) });
  c('S3 only achievements (the parts equal the total): known, the rest 0, a tree', ex.known && ex.rest === 0 && !!I.tree(S_EXACT) && treeMismatches(I.tree(S_EXACT)).length === 0, ex);
  const tl = I.tiers(S_UNKNOWN);
  c('S4 a record not yet come: every tier\'s count the placeholder (null)', tl.every((x) => x.n === null), tl.map((x) => x.n));
  c('S5 a tier wears its latest earned badge (the fish, the last of Common\'s), else its first muted; it opens its own gallery',
    tiers[0].art === icon('albino_minnow') && !tiers[0].muted && tiers[3].art === icon('tempered') && tiers[3].muted && tiers.map((x) => x.opens).join(',') === 'page:featsCommon,page:featsRare,page:featsArena,page:featsSuperrare',
    tiers.map((x) => [x.id, x.art, x.muted, x.opens]));
  c('S6 a gallery\'s earned badges are the worker\'s', I.gallery(S_MINE, 'common').filter((r) => r.got).map((r) => r.id).join(',') === 'first_blood,combat_10,albino_minnow');
  c('S7 an earned medal shows no progress (Blooded, a weapon past 10)', I.medal(S_LV, 'combat_10', null, T0).progress === null && I.medal(S_LV, 'combat_10', null, T0).got);
  c('S8 the family: none for no family; Blooded is in it, First Blood not', I.family(S_MINE, null).length === 0 && F.inTitleFamily('combat_10') && F.inTitleFamily('combat_100') && !F.inTitleFamily('first_blood'));
  c('S9 the worn title\'s requirement, and none with none worn or worn but not earned', F.wornHow(S_MINE) === 'Raise Melee, Bow or Magic to level 10.' && F.wornHow(S_NONE) === ''
    && F.wornHow(rec({ first_blood: T0 }, 10, 'combat_10')) === '' && F.wornHow(rec({ first_blood: T0 }, 10, 5)) === '');
  const c0 = I.career({}), cr2 = I.career(R_SEED);
  c('S10 the career rows with nothing kept: 0s; with the seed: the numbers as Journey writes them', c0.map((r) => String(r.v)).join(',') === '0,0,0,0' && cr2.map((r) => String(r.v)).join(',') === '41,3,5,600,1,234',
    [c0.map((r) => r.v), cr2.map((r) => r.v)]);
  const doorsL = L.doors;
  c('S11 your doors: open, shared; Achievements "4 of 33" (the others none); Titles wears your title\'s badge, the rest their own pictures',
    doorsL.every((d) => d.shared && d.opens) && doorsL[0].sub && doorsL[0].sub.n === 4 && doorsL[0].sub.total === 33 && doorsL.slice(1).every((d) => d.sub === null)
      && doorsL[1].art === icon('combat_10') && doorsL[0].art === F.FEATS_DOORS[0].art && doorsL[2].art === F.FEATS_DOORS[2].art && doorsL[3].art === F.FEATS_DOORS[3].art
      && I.landing(S_MINE, null, PASS(null)).doors[1].art === F.FEATS_DOORS[0].art,
    doorsL);
  c('S12 another player\'s AP is not loading (the worker stamped it)', O.ap.loading === false);
  return out;
}

console.log('1. the rules');
for (const r of suite(REAL)) check('1. ' + r.name, r.ok, r.detail);

/* ── 2. the files: Feats' pages read by their syntax tree ── */
console.log('2. the pages (syntax tree)');
const B = loadBabel(ROOT);
check('2. @babel/parser and traverse load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);
const FILES = ['src/ui/mobile/sheet/FeatsPage.jsx', 'src/ui/mobile/sheet/MedalTiers.jsx', 'src/ui/mobile/sheet/MedalPage.jsx', 'src/ui/mobile/sheet/QuestHistory.jsx', 'src/ui/mobile/sheet/featsGo.js'];
const SRC = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
function facts(src) {
  const ids = new Set(), attrs = new Set(), strs = [];
  B.traverse(B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true }), {
    Identifier(p) { ids.add(p.node.name); },
    ImportSpecifier(p) { ids.add(p.node.imported.name || p.node.imported.value); },
    JSXAttribute(p) { if (p.node.name.type === 'JSXIdentifier') attrs.add(p.node.name.name); },
    StringLiteral(p) { strs.push(p.node.value); },
    TemplateElement(p) { strs.push(p.node.value.cooked || ''); },
  });
  return { ids, attrs, strs };
}
function pages(X) {
  const out = [];
  const c = (name, ok, detail) => out.push({ name, ok: !!ok, detail });
  const all = Object.entries(X).map(([f, s]) => [f, facts(s)]);
  const lists = all.filter(([, x]) => x.attrs.has('data-title-row') || x.ids.has('sendAchvTitle') || x.ids.has('earnedTitles') || x.ids.has('titleActions'));
  c('F10 no Feats page draws a list of titles or changes one (data-title-row, sendAchvTitle, titleActions)', lists.length === 0, lists.map(([f]) => f));
  const disc = all.filter(([, x]) => x.strs.some((s) => /discover/i.test(s)));
  c('F11 no Feats page offers Discoveries', disc.length === 0, disc.map(([f]) => f));
  const zero = all.filter(([, x]) => x.ids.has('achvSummary') || x.ids.has('achvApTotal'));
  c('F1 the pages read AP only through feats.js (no second count of it)', zero.length === 0, zero.map(([f]) => f));
  const duels = all.filter(([, x]) => x.ids.has('duelsWon') || x.ids.has('deepestZone') || x.strs.some((s) => /duelsWon|deepestZone/.test(s)));
  c('F12 no Feats page reads Duels Won or Deepest Zone', duels.length === 0, duels.map(([f]) => f));
  const quest = facts(X['src/ui/mobile/sheet/QuestHistory.jsx']);
  c('Q Quest History calls the Quests pages\' DonePane and questJournalList (never a copy)', quest.ids.has('DonePane') && quest.ids.has('questJournalList') && quest.attrs.has('L'), [...quest.ids].filter((i) => /Done|journal/i.test(i)));
  return out;
}
for (const r of pages(SRC)) check('2. ' + r.name, r.ok, r.detail);

/* ── 3. each dodge, planted ── */
console.log('3. each dodge, planted, turns its check red');
const wrap = (patch) => Object.assign({}, REAL, patch);
const PLANTS = [
  ['F1', 'AP shown as the medals\' sum', wrap({ ap: (S) => { const a = F.featsAp(S); return a.loading ? a : { ...a, total: a.achv }; } })],
  ['F2', '"the rest" named "From quests"', wrap({ word: (k) => (k === 'feats.tRest' ? 'From quests' : SAY[k]) })],
  ['F3', 'the rest left out of the tree', wrap({ tree: (S) => { const t = F.apTree(S); return t ? { ...t, kids: t.kids.slice(0, 1) } : t; } })],
  ['F3', 'a medal leaf at its tier\'s value (the fish at 10)', wrap({ tree: (S) => {
    const t = F.apTree(S);
    if (!t) return t;
    const fa = t.kids[0];
    const com = fa.kids.find((k) => k.id === 'common');
    const kids = com.kids.map((k) => (k.id === 'albino_minnow' ? { ...k, value: 10 } : k));
    const com2 = { ...com, kids };
    return { ...t, kids: [{ ...fa, kids: fa.kids.map((k) => (k.id === 'common' ? com2 : k)) }, t.kids[1]] };
  } })],
  ['F4', 'the lever-lit case drawn as a split', wrap({ ap: (S) => { const a = F.featsAp(S); return a.loading ? a : { ...a, known: true, rest: Math.max(0, a.total - (a.achv || 0)) }; },
    tree: (S) => F.apTree(S) || (F.featsAp(S).loading ? null : { id: 'ap', value: F.featsAp(S).total, op: 'sum', kids: [] }) })],
  ['F5', 'the arena filed under Rare', wrap({ gallery: (S, t) => (t === 'arena' ? [] : t === 'rare' ? [...F.featsGallery(S, 'rare'), ...F.featsGallery(S, 'arena')] : F.featsGallery(S, t)) })],
  ['F5', 'a tier called Gold', wrap({ tierWord: (id) => (id === 'superrare' ? 'Gold' : F.featsWord(id)) })],
  ['F6', 'a tier\'s points as its value times its count', wrap({ tiers: (S) => F.featsTiers(S).map((x) => ({ ...x, max: ACHV_TIERS[x.id].ap * x.of })) })],
  ['F7', 'a medal earned from its count, not the worker\'s got', wrap({ medal: (S, id, w, n) => { const m = F.featsMedal(S, id, w, n); return m && id === 'codex_all' ? { ...m, got: true } : m; } })],
  ['F8', '"0 of 1" where the game has none', wrap({ medal: (S, id, w, n) => { const m = F.featsMedal(S, id, w, n); return m && !m.got && !m.progress ? { ...m, progress: '0 of 1' } : m; } })],
  ['F9', 'a title on an unearned medal', wrap({ medal: (S, id, w, n) => { const m = F.featsMedal(S, id, w, n); return m && !m.title ? { ...m, title: { name: m.name, worn: false } } : m; } })],
  ['F10', 'Feats\' own Titles page', wrap({ doors: F.FEATS_DOORS.map((d) => (d.id === 'titles' ? { ...d, opens: 'page:featsTitles' } : d)) })],
  ['F11', 'a Discoveries door', wrap({ doors: [...F.FEATS_DOORS, { id: 'discoveries', opens: 'page:featsDiscoveries' }] })],
  ['F12', 'Duels Won back on the records', wrap({ career: (R) => [...F.careerRows(R), { id: 'duels', k: 'journey.duelsWon', v: 0, icon: 'rec-duels' }] })],
  ['F13', 'AP 0 before the record', wrap({ ap: (S) => { const a = F.featsAp(S); return a.loading ? { ...a, loading: false, total: 0 } : a; } })],
  ['F14', 'the strip\'s title entry left', wrap({ STRIP: [...BRO_STRIP, 'title'], strip: (r, w) => [...broStrip(r, w), { id: 'title', opens: PASSPORT_DOORS.titles }] })],
  ['F15', 'Titles reachable from neither Feats nor Bro', wrap({ doors: F.FEATS_DOORS.filter((d) => d.id !== 'titles'), roads: { ...BRO_PROGRESS_ROADS, titles: 'bro:strip/title' } })],
  ['F16', 'the worn title shown nowhere', wrap({ landing: (S, w, r) => { const L = F.featsLanding(S, w, r); return { ...L, doors: L.doors.map((d) => ({ ...d, worn: null })) }; } })],
  ['F9', 'Feats opening another player\'s medals', wrap({ landing: (S, w, r) => { const L = F.featsLanding(S, w, r); return w == null ? L : { ...L, doors: F.featsLanding(S, null, r).doors }; } })],
  ['F17', 'a family made up (Gotcha and Golden Catch)', wrap({ fams: [...F.TITLE_FAMILIES, { id: 'pets', ids: ['first_pet', 'golden_pet'] }] })],
];
for (const [want, what, impl] of PLANTS) {
  let res;
  try { res = suite(impl); } catch (e) { res = [{ name: want + ' (threw: ' + e.message + ')', ok: false }]; }
  const red = res.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
  check(`3. plant ${want} (${what}): turns ${want} red`, red.some((x) => x === want || x.startsWith(want)), 'red: ' + (red.join(', ') || 'nothing'));
}
const IMPORT_AT = "import React from 'react';";
const swap = (f, from, to) => (SRC[f].indexOf(from) < 0 ? null : { ...SRC, [f]: SRC[f].replace(from, to) });
const TPLANTS = [
  ['F10', 'a list of titles on Feats', swap('src/ui/mobile/sheet/MedalTiers.jsx', IMPORT_AT, IMPORT_AT + "\nexport const T = ({ list }) => list.map((t) => <button key={t.id} data-title-row={t.id}>{t.text}</button>);")],
  ['F11', 'a Discoveries door in the page', swap('src/ui/mobile/sheet/FeatsPage.jsx', IMPORT_AT, IMPORT_AT + "\nexport const D = () => <span>{'Discoveries'}</span>;")],
  ['F1', 'the page adding the medals itself', swap('src/ui/mobile/sheet/FeatsPage.jsx', IMPORT_AT, IMPORT_AT + "\nimport { achvSummary } from '@/game/achievements.js';")],
  ['F12', 'the page reading Duels Won', swap('src/ui/mobile/sheet/FeatsPage.jsx', IMPORT_AT, IMPORT_AT + "\nexport const W = ({ cs }) => <span>{cs.duelsWon}</span>;")],
  ['Q', 'Quest History drawing its own list', swap('src/ui/mobile/sheet/QuestHistory.jsx', '<DonePane L={L} tap={tap} onPick={openQuest} />', '<div>{L.done.map((r) => <span key={r.id}>{r.title}</span>)}</div>')],
];
for (const [want, what, X] of TPLANTS) {
  if (!X) { check(`3. plant ${want} (${what}): its anchor is in the file`, false, 'write the plant again'); continue; }
  const red = pages(X).filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
  check(`3. plant ${want} (${what}): turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
