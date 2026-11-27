/* ═══ v2.3.6696: PETS' PAGES SAY THE GAME'S OWN TRUTH (card UI2-pets) ═══
 *
 * src/game/petPages.js makes what Pets' pages show under the new dashboard
 * (the companion and its doors, Owned, a pet's page, All, another player's)
 * and every action's rule.  The checks, on the real module and the game's
 * real tables (src/data/trapping.js):
 *   R1  no pets: the how-to-catch state, both doors still there;
 *   R2  pets but none out: "No pet out with you", never the first pet of the
 *       list shown as the companion;
 *   R3  one out: it is the companion, with its level, XP (caps.petlevels) and
 *       ward (caps.petwards), and one action, Put away;
 *   R4  a pet above your Trapping level works at it, with the held note;
 *   R5  NO STAT IS ADDED TO A PET: a pet's view holds exactly the game's
 *       (kind, stage, name, level, XP, ward, Golden, Big, land): never a
 *       rarity, an attack, health, an ability or a species;
 *   R6  "No pets yet" never said to a player who has pets;
 *   R7  Release is for good (the kit asks first); Take out, Put away and
 *       Rename are routine (no question);
 *   R8  Sell only where the store sells pets; off on the pet out and before
 *       its hold ends, with the trade rule's own words beside it;
 *   R9  More room at the game's price, and never offered at 120 (full);
 *   R10 the journal's count is the record's journal, never the list;
 *   R11 another player's: only the pet out with them, read-only: no action,
 *       no Owned, no Sell, no name (none is on the wire);
 *   R12 a second press of Take out never goes out while the first is out;
 *       the record moving lets it go;
 *   R13 the record not here yet reads loading (never "No pets yet" as the
 *       truth), and not ready reads today's words;
 *   R14 Owned: a card a pet, "With you" only on the one out, the game's
 *       badges (Golden, Big from 1.18), More room at exactly its price;
 *   R15 the edges: an old pet's kind, a record not live (no XP, ward or
 *       action), a stale active, odd journal rows, the page ids.
 * Mutation-run by hand (2026-11-27, tools of the session's scratchpad: each
 * operator flipped and each statement dropped, line by line, the suite run):
 * the mutants left alive are listed in the PR with why.
 *
 * THE DODGES, each a one-line change to petPages.js planted in memory
 * (lib/plantImport.mjs) and seen red (a plant that stays green fails).
 *
 * Run: node tools/guards/pet-pages.test.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { plantText, importAs } from './lib/plantImport.mjs';
import { needsConfirm } from '../../src/game/screenZones.js';
import { petKindName } from '../../src/data/trapping.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REL = 'src/game/petPages.js';
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 800))); }
}

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const pet = (id, o) => ({ id, kind: 'snowling', look: 'snowman', home: 'frost', stage: 1, gold: false, size: 1, name: '', lv: 10, xp: 3, at: NOW - 2 * DAY, tradeAfter: NOW - DAY, ...(o || {}) });
const A = pet('p1');
const B = pet('p2', { kind: 'gobling', home: 'ember', name: 'Rex', gold: true, size: 1.2, lv: 25 });
const NEW = pet('p3', { tradeAfter: NOW + 2 * 3600_000 });
const bookOf = (list, active, journal, cap) => ({ v: 1, cap: cap || 30, active: active || null, list, journal: journal || {} });
const base = (list, active, extra) => ({ live: true, book: bookOf(list, active && active.id, (extra && extra.journal) || {}, extra && extra.cap), list, active: active || null,
  T: 20, levels: true, wards: true, house: true, coins: 5000, sellOn: true, now: NOW, ...(extra || {}) });
const words = (o) => JSON.stringify(o);
const VIEW_KEYS = ['id', 'kind', 'stage', 'pet', 'name', 'kindWord', 'gold', 'big', 'out', 'level', 'xp', 'ward', 'land'].sort().join();
const NO_STAT = /rarity|attack|health|\bhp\b|abilit|species|damage|defen/i;

/* the checks, on a module (the real one, or a planted copy): the ids that fail */
function verdict(M) {
  const bad = [];
  const say = (id, ok) => { let v = false; try { v = !!ok(); } catch (e) { v = false; } if (!v) bad.push(id); };
  const tryIt = (f) => { try { return f(); } catch (e) { return null; } };
  /* R1 */
  const e = tryIt(() => M.petsLanding(base([], null)));
  say('R1', () => (!!e && e.state === 'empty' && e.pet === null && /No pets yet/.test(e.empty.title) && e.empty.how === 'pets.emptySteps'
    && e.doors.length === 2 && e.doors[0].page === 'petsOwned' && e.doors[1].page === 'petsAll' && e.actions.length === 0));
  /* R2 */
  const n = tryIt(() => M.petsLanding(base([A, B], null)));
  say('R2', () => (!!n && n.state === 'none' && n.pet === null && /No pet out with you/.test(n.empty.title) && n.doors.length === 2 && n.actions.length === 0
    && !words(n).includes('Snowling') && !words(n).includes('Rex')));
  /* R3 */
  const o = tryIt(() => M.petsLanding(base([A, B], A)));
  say('R3', () => (!!o && o.state === 'pet' && o.pet && o.pet.id === 'p1' && o.pet.out === true && o.pet.level.words === 'Lv 10'
    && !!o.pet.xp && o.pet.xp.words === '3 / ' + o.pet.xp.need + ' XP' && !!o.pet.ward && /Softens chills \d+%/.test(o.pet.ward.words)
    && o.actions.length === 1 && o.actions[0].id === 'away' && o.actions[0].check() == null
    && o.doors[0].summary === '2 of 30'));
  const noCaps = tryIt(() => M.petsLanding(base([A], A, { levels: false, wards: false })));
  say('R3', () => (!!noCaps && noCaps.pet && noCaps.pet.xp === null && noCaps.pet.ward === null));
  /* R4 */
  const h = tryIt(() => M.petsLanding(base([B], B)));
  say('R4', () => (!!h && h.pet && h.pet.level.shown === 20 && h.pet.level.own === 25 && h.pet.level.held === true
    && h.pet.level.words === 'Lv 20 (25)' && /Works at Lv 20 until your Trapping reaches 25/.test(h.pet.level.note || '')));
  const low = tryIt(() => M.petView(A, 20, {}));
  say('R4', () => (!!low && low.level.held === false && low.level.note === null && low.level.shown === 10));
  /* R5 */
  const views = [o && o.pet, h && h.pet, tryIt(() => M.petView(B, 30, { live: true, levels: true, wards: true })),
    tryIt(() => M.petsOne(base([A, B], A, { id: 'p2' }))), tryIt(() => M.petsOwned(base([A, B], A)))];
  say('R5', () => (views.every(Boolean) && [views[0], views[1], views[2]].every((v) => Object.keys(v).sort().join() === VIEW_KEYS)
    && Object.keys(views[3].pet).filter((k) => k !== 'badges').sort().join() === VIEW_KEYS
    && views.every((v) => !NO_STAT.test(Object.keys(v).join() + words(Object.keys(v.pet || {}))) && !NO_STAT.test(words(v)))));
  /* R6 */
  const withPets = [n, o, h, tryIt(() => M.petsLanding(base([NEW], null)))];
  say('R6', () => (withPets.every((x) => !!x && !/No pets yet/.test(words(x)))));
  /* R7 */
  const one = tryIt(() => M.petsOne(base([A, B], A, { id: 'p1' })));
  const two = tryIt(() => M.petsOne(base([A, B], A, { id: 'p2' })));
  const act = (m, id) => (m && m.actions.find((a) => a.id === id)) || null;
  say('R7', () => (!!one && !!two && needsConfirm(act(one, 'release')) && act(one, 'release').cost === 'irreversible'
    && !needsConfirm(act(one, 'active')) && !needsConfirm(act(two, 'active')) && !needsConfirm(act(one, 'rename'))
    && act(one, 'active').away === true && act(two, 'active').away === false
    && !!o && !needsConfirm(o.actions[0])));
  /* R8 */
  const nw = tryIt(() => M.petsOne(base([A, NEW], A, { id: 'p3' })));
  const noStore = tryIt(() => M.petsOne(base([A, B], A, { id: 'p2', sellOn: false })));
  say('R8', () => (!!one && !!two && !!nw && !!noStore
    && act(one, 'sell') && act(one, 'sell').check() === 'Put it away to trade or sell it'
    && act(nw, 'sell') && /^Tradeable in /.test(act(nw, 'sell').check() || '')
    && act(two, 'sell') && act(two, 'sell').check() == null && !needsConfirm(act(two, 'sell'))
    && act(noStore, 'sell') === null && noStore.trade && noStore.trade.ok === true));
  /* R9 */
  const h30 = tryIt(() => M.petsOwned(base([A], A)));
  const h120 = tryIt(() => M.petsOwned(base([A], A, { cap: 120 })));
  const poor = tryIt(() => M.petsOwned(base([A], A, { cap: 40, coins: 10 })));
  const noHouse = tryIt(() => M.petsOwned(base([A], A, { house: false })));
  say('R9', () => (!!h30 && h30.house && h30.house.state === 'offer' && h30.house.price === 1000 && h30.house.cap === 30 && h30.house.can === true
    && !!h120 && h120.house && h120.house.state === 'full' && /holds 120/.test(h120.house.words)
    && !!poor && poor.house.state === 'offer' && poor.house.price === 2000 && poor.house.can === false && poor.house.have === 10
    && !!noHouse && noHouse.house === null));
  /* R10 */
  const j0 = tryIt(() => M.petsLanding(base([A, B], A)));
  const jr = tryIt(() => M.petsJournal(bookOf([A], 'p1', { 'snowling.1': { tries: 5, n: 2, gold: 1, big: 1.12 }, 'gobling.2': { tries: 1, n: 0 } })));
  say('R10', () => (!!j0 && j0.doors[1].summary === '0 of 18 caught'
    && !!jr && jr.caught === 1 && jr.total === 18 && jr.words === '1 of 18 caught' && jr.cells[1].length === 9 && jr.cells[2].length === 9
    && jr.cells[1][0].kind === 'snowling' && jr.cells[1][0].n === 2 && jr.cells[1][0].gold === 1 && jr.cells[1][0].big === 112
    && jr.cells[2].find((c) => c.kind === 'gobling').tried === true && jr.cells[2].find((c) => c.kind === 'gobling').caught === false
    && typeof jr.cells[1][0].land === 'string' && jr.cells[1][0].land.length > 0 && !/wheel/i.test(words(jr))));
  /* R11 */
  const oth = tryIt(() => M.petsLanding(base([A, B], A, { who: 'Ana', wire: 'gobling.2.1.120.7' })));
  const othNone = tryIt(() => M.petsLanding(base([A, B], A, { who: 'Ana', wire: null })));
  const othOne = tryIt(() => M.petsOne(base([A, B], A, { who: 'Ana', id: 'p1' })));
  say('R11', () => (!!oth && oth.state === 'other' && oth.doors.length === 0 && oth.actions.length === 0 && oth.pet
    && oth.pet.name === petKindName('gobling', 2) && oth.pet.kindWord === null && oth.pet.gold === true && oth.pet.big === true
    && oth.pet.level.words === 'Lv 7' && oth.pet.xp === null && oth.pet.ward === null && /Only the pet out with them is shared/.test(oth.note)
    && !words(oth).includes('Rex') && !words(oth).includes('Snowling')
    && !!othNone && othNone.state === 'otherNone' && othNone.doors.length === 0 && othNone.actions.length === 0 && othNone.pet === null
    && othOne === null));
  /* R12 */
  let sent = 0;
  const send = () => { sent++; return true; };
  const p0 = {};
  const r1 = tryIt(() => M.petsPress(p0, 'pet:active', 4, NOW, send));
  const r2 = r1 && tryIt(() => M.petsPress(r1.pend, 'pet:active', 4, NOW + 10, send));
  const r3 = r2 && tryIt(() => M.petsPress(M.petsSettle(r2.pend, 4), 'pet:active', 4, NOW + 20, send));
  const settled = r1 && tryIt(() => M.petsSettle(r1.pend, 5));
  const r4 = settled && tryIt(() => M.petsPress(settled, 'pet:active', 5, NOW + 30, send));
  const dead = tryIt(() => M.petsPress(p0, 'pet:active', 4, NOW, () => false));
  say('R12', () => (!!r1 && r1.go === true && !!r2 && r2.go === false && !!r3 && r3.go === false && sent === 2
    && !!settled && Object.keys(settled).length === 0 && !!r4 && r4.go === true
    && !!dead && dead.go === false && Object.keys(dead.pend).length === 0));
  /* R13 */
  const ld = tryIt(() => M.petsLanding({ ...base([], null), book: null }));
  const nr = tryIt(() => M.petsLanding({ ...base([], null), book: { unavailable: true, list: [], cap: 0, active: null, journal: {} } }));
  say('R13', () => (!!ld && ld.state === 'loading' && !/No pets yet/.test(words(ld)) && !!nr && nr.state === 'notReady' && /not ready yet/.test(nr.empty.title)
    && nr.doors.length === 0 && tryIt(() => M.petsOne({ ...base([A], A, { id: 'p1' }), book: null })) === null));
  /* R14 Owned's cards: one a pet, "With you" only on the one out, the game's badges */
  const ow = tryIt(() => M.petsOwned(base([A, B], A)));
  const owNone = tryIt(() => M.petsOwned(base([A, B], null)));
  const edge = tryIt(() => M.petsOwned(base([pet('e', { size: 1.18, stage: 2 })], null, { coins: 1000 })));
  say('R14', () => (!!ow && ow.cards.length === 2 && ow.cards[0].id === 'p1' && ow.cards[0].out === true && ow.cards[1].out === false
    && ow.cards[0].badges.join() === 'With you' && ow.cards[1].badges.join() === 'Golden,Big' && ow.cards[1].level.words === 'Lv 20 (25)'
    && ow.cards[1].kindWord === petKindName('gobling', 1) && ow.head === '2 of 30'
    && !!owNone && owNone.cards.every((c) => c.out === false && !c.badges.includes('With you'))
    && !!edge && edge.cards[0].big === true && edge.cards[0].stage === 2 && edge.house.can === true && edge.house.have === null));
  /* R15 the edges: an old pet, a record not live, a stale active, odd journal rows, the page ids */
  const old = tryIt(() => M.petView({ id: 'o', element: 'frost', level: 3 }, 20));
  const notLive = tryIt(() => M.petsLanding(base([A], A, { live: false })));
  const stale = tryIt(() => M.petsLanding(base([A], pet('gone'))));
  const odd = tryIt(() => M.petsJournal(bookOf([], null, { 'snowling.1': 7, 'dewdrop.1': { n: 0, tries: 0, big: 1.1 }, 'gobling.1': { n: 0, tries: 2 } })));
  say('R15', () => (!!old && old.kind === 'snowling' && old.level.shown === 3 && old.out === false
    && !!notLive && notLive.pet && notLive.pet.xp === null && notLive.pet.ward === null && notLive.actions.length === 0
    && tryIt(() => M.petsOne(base([A], A, { id: 'p1', live: false }))) === null
    && tryIt(() => M.petsOne({ ...base([A], A, { id: 'p1' }), book: { unavailable: true, list: [A], cap: 30, active: 'p1', journal: {} } })) === null
    && M.petsOne(base([A], A, { id: 'nope' })) === null   /* never a throw: the page draws its gone state */
    && !!stale && stale.state === 'none'
    && M.petsJournal(null).caught === 0 && !!odd && odd.caught === 0
    && odd.cells[1].find((c) => c.kind === 'dewdrop').big === 0 && odd.cells[1].find((c) => c.kind === 'dewdrop').tried === false
    && odd.cells[1].find((c) => c.kind === 'gobling').tried === true
    && M.isPetsPage('petsOne') && M.isPetsPage('petsAll') && M.isPetsPage('petsOwned') && !M.isPetsPage('pets')
    && !!oth && oth.pet && oth.pet.out === true && oth.pet.id === null));
  return bad;
}

const real = await import('../../src/game/petPages.js');
const bad = verdict(real);
const IDS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15'];
for (const id of IDS) check(id + ' on the real petPages.js', !bad.includes(id), id);

const PLANTS = [
  ['D1', 'R5', 'a rarity on a pet', '    land: petLandName(has(', "    rarity: 'Common', land: petLandName(has("],
  ['D2', 'R5', 'an attack and health on a pet', '    land: petLandName(has(', '    attack: 12, health: 80, land: petLandName(has('],
  ['D3', 'R4', 'the level above your Trapping level, no held note', '  const held = own > shown;', '  const held = false;'],
  ['D4', 'R4', 'the pet\'s own level shown, above your Trapping level', '  const shown = petEffectiveLevel(pp, T);', '  const shown = own;'],
  ['D5', 'R2', 'the first pet of the list as the companion when none is out',
    '  const out = f.active && list.find((p) => p && f.active && p.id === f.active.id) ? f.active : null;', '  const out = f.active || list[0] || null;'],
  ['D6', 'R6', '"No pets yet" said to a player who has pets', '  if (!list.length) {', '  if (!f.active) {'],
  ['D7', 'R7', 'Release with no confirmation', "    Object.freeze({ id: 'release', slot: 2, cost: 'irreversible', check: () => null }),", "    Object.freeze({ id: 'release', slot: 2, cost: 'routine', check: () => null }),"],
  ['D8', 'R7', 'a confirmation on Take out', "    Object.freeze({ id: 'active', slot: 0, cost: 'routine', check: () => null, away: isOut }),", "    Object.freeze({ id: 'active', slot: 0, cost: 'costly', check: () => null, away: isOut }),"],
  ['D9', 'R8', 'Sell offered on the pet out (no reason)', '  if (f.sellOn && trade) actions.push(Object.freeze({ id: \'sell\', slot: 3, cost: \'routine\', check: () => (trade.ok ? null : trade.words) }));',
    '  if (f.sellOn && trade) actions.push(Object.freeze({ id: \'sell\', slot: 3, cost: \'routine\', check: () => null }));'],
  ['D10', 'R8', 'Sell offered before its hold ends', '(trade.ok ? null : trade.words)', "(trade.ok || trade.why === 'too-new' ? null : trade.words)"],
  ['D11', 'R9', 'More room offered at 120', '    if (!(price > 0)) house =', '    if (false) house ='],
  ['D12', 'R10', 'the journal\'s count made from the list', '  const journal = petsJournal(book);',
    "  const journal = petsJournal({ journal: Object.fromEntries(list.map((p) => [p.kind + '.' + (p.stage || 1), { n: 1, tries: 1 }])) });"],
  ['D13', 'R11', 'another player\'s pet drawn as yours (its name, Owned, Put away)', '  if (f.who != null) return petsOther(f.wire);', '  if (f.who === undefined) return petsOther(f.wire);'],
  ['D14', 'R11', 'an action on another player\'s pet', '  if (f.who != null || !f.live || !book || book.unavailable) return null;', '  if (!f.live || !book || book.unavailable) return null;'],
  ['D15', 'R11', 'Owned offered on another player\'s pet', '  return Object.freeze({ state: \'other\', pet, doors: [], actions: [], note, empty: null });',
    "  return Object.freeze({ state: 'other', pet, doors: petsDoors([], PET_HOUSE.CAP, petsJournal(null)), actions: [], note, empty: null });"],
  ['D16', 'R12', 'a second press of Take out sent while the first is out', '  if (pendingHolds(pend, c)) return { pend, go: false };', '  if (false) return { pend, go: false };'],
  ['D17', 'R13', '"No pets yet" while the record is on its way', "  if (f.live && !book) return Object.freeze({ state: 'loading', pet: null, doors: [], actions: [], empty: null });", ''],
];
for (const [id, want, what, from, to] of PLANTS) {
  const text = plantText(ROOT, REL, from, to);
  if (text === null) { check(`${id} (${what}): its line is found once in petPages.js`, false, 'the plant\'s line moved: update the plant'); continue; }
  const red = verdict(await importAs(ROOT, REL, text));
  check(`${id} plant (${what}) turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
