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
 * The drawing (W1, W2; E1-E8 planted) is read off Babel's tree: see its block
 * at the end (the mend of sitting 72).
 *
 * Run: node tools/guards/pet-pages.test.mjs  (W1, W2 need @babel/parser and
 * @babel/traverse: npm install in the root or server/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { plantText, importAs } from './lib/plantImport.mjs';
import { loadBabel } from './lib/jsxMount.mjs';
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

/* ═══ v2.3.6696, the mend of sitting 72 (the gatekeeper held #2413: "'Release
 * with no confirmation' (PetsPage.jsx ~263 sends sendPetRelease with no ask)
 * and 'a second press of Take out sent while the first is out' (no
 * `press()`)": D7 and D16 were red in petPages.js but green planted at the
 * page).  So the DRAWING is read too, off Babel's tree of
 * src/ui/mobile/dash/PetsPage.jsx:
 *   W1  Release asks first: every sendPetRelease sits in the `onYes` of the
 *       kit's Ui2Confirm (or, under ?menus3, v2.3.6871, the yes of the one
 *       Card's `pet.release`) (imported from the kit), whose action costs
 *       'irreversible' and is labelled with the card's words (pets.releaseYes,
 *       the question pets.releaseAsk); the kit's dialog answers Enter on its
 *       yes and Esc on its no (Confirm.jsx: data-enter, data-esc); and no
 *       other send sits in a Ui2Confirm but the Pet House's (a confirmation on
 *       Take out);
 *   W2  one request out at a time: every send (sendPetActive, sendPetName,
 *       sendPetRelease, sendPetHouseBuy) is the arrow handed to `press(hold,
 *       () => ...)`, `press` the page's usePress, whose body goes out through
 *       petsPressNow (petsPageOpen.js, which runs petPages.js petsPress: R12);
 *       Take out's hold is PET_HOLDS.active, Release's PET_HOLDS.release.
 * THE DODGES at the drawing, each planted in memory and seen red:
 *   E1 Release sends at its first tap (no ask)     E2 the ask's yes sends without press()
 *   E3 the ask made routine (no question drawn)     E4 Take out sent without press()
 *   E5 the landing's Put away sent without press()  E6 press() that sends at once (no pending state)
 *   E7 a confirmation on Take out                   E8 the ask's question not the card's words
 *   E9 the ask's way back not "Keep" (the kit's Confirm takes `no`, the orchestrator's leave) */
const BB = loadBabel(ROOT);
check('W0. @babel/parser and @babel/traverse load', !!BB);
const PAGE = 'src/ui/mobile/dash/PetsPage.jsx';
const KIT = 'src/ui/kit/Confirm.jsx';
const OPENER = 'src/ui/mobile/dash/petsPageOpen.js';
const readRel = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SENDS = new Set(['sendPetActive', 'sendPetName', 'sendPetRelease', 'sendPetHouseBuy']);
const parseJsx = (src) => BB.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
const nameOfEl = (p) => (p && p.node && p.node.name && p.node.name.name) || '';
/* the hold a press names: 'active', 'release', 'name', 'house' or '' */
function holdOf(arg) {
  if (!arg) return '';
  const m = arg.type === 'CallExpression' ? arg.callee : arg;
  return m && m.type === 'MemberExpression' && m.object.type === 'Identifier' && m.object.name === 'PET_HOLDS' ? (m.property.name || '') : '';
}
const sayKey = (node) => (node && node.type === 'CallExpression' && node.callee.name === 'say' && node.arguments[1] && node.arguments[1].type === 'StringLiteral' ? node.arguments[1].value : '');
const propOf = (obj, k) => (obj && obj.type === 'ObjectExpression' ? obj.properties.find((x) => x.type === 'ObjectProperty' && (x.key.name || x.key.value) === k) : null);

function drawingVerdict(files) {
  const bad = new Set();
  if (!BB) return ['W1', 'W2'];
  const page = files[PAGE];
  let kitImported = false, opened = false, usePressOk = false, releases = 0, actives = 0;
  BB.traverse(parseJsx(page), {
    ImportDeclaration(p) {
      if (p.node.source.value === '@/ui/kit/index.js' && p.node.specifiers.some((x) => x.imported && x.imported.name === 'Ui2Confirm' && x.local.name === 'Ui2Confirm')) kitImported = true;
      if (p.node.source.value === './petsPageOpen.js' && p.node.specifiers.some((x) => x.imported && x.imported.name === 'petsPressNow')) opened = true;
    },
    FunctionDeclaration(p) {
      if (p.node.id.name !== 'usePress') return;
      /* its returned press: (control, send) => { const went = petsPressNow(control, <rev>, send); ...; return went; } */
      let ok = false;
      p.traverse({
        ArrowFunctionExpression(q) {
          const [c, s] = q.node.params.map((x) => x.name);
          if (!c || !s) return;
          let calls = 0, sendCalled = false;
          q.traverse({
            CallExpression(r) {
              const cal = r.node.callee;
              if (cal.type === 'Identifier' && cal.name === 'petsPressNow' && r.node.arguments[0] && r.node.arguments[0].name === c && r.node.arguments[2] && r.node.arguments[2].name === s) calls++;
              if (cal.type === 'Identifier' && cal.name === s) sendCalled = true;
            },
          });
          if (calls === 1 && !sendCalled) ok = true;
        },
      });
      usePressOk = ok;
    },
    CallExpression(p) {
      const c = p.node.callee;
      if (!(c.type === 'Identifier' && SENDS.has(c.name))) return;
      if (c.name === 'sendPetRelease') releases++;
      if (c.name === 'sendPetActive') actives++;
      /* W2: the send is the body of the arrow handed to press(hold, () => send(...)), press = usePress(...) */
      const arrow = p.parentPath;
      const call = arrow && arrow.parentPath;
      const inPress = arrow && arrow.node.type === 'ArrowFunctionExpression' && arrow.node.body === p.node
        && call && call.node.type === 'CallExpression' && call.node.callee.type === 'Identifier' && call.node.callee.name === 'press' && call.node.arguments[1] === arrow.node;
      let pressIsHook = false;
      if (inPress) {
        const b = call.scope.getBinding('press');
        const init = b && b.path.node.type === 'VariableDeclarator' ? b.path.node.init : null;
        pressIsHook = !!(init && init.type === 'CallExpression' && init.callee.name === 'usePress');
      }
      const hold = inPress ? holdOf(call.node.arguments[0]) : '';
      const wantHold = { sendPetActive: 'active', sendPetRelease: 'release', sendPetName: 'name', sendPetHouseBuy: 'house' }[c.name];
      if (!(inPress && pressIsHook && hold === wantHold)) bad.add('W2');
      /* W1: where a send sits in the kit's dialog */
      const attr = p.findParent((x) => x.isJSXAttribute());
      const el = attr && attr.parentPath;
      const inConfirm = !!(el && el.isJSXOpeningElement() && nameOfEl(el) === 'Ui2Confirm');
      if (c.name === 'sendPetRelease') {
        /* v2.3.6871 (card MN step 3): under ?menus3 the ask is the one Card (Menus3Card kind
           "pet.release", its words and its Keep / Release held by server/test/menus3-card.test.mjs);
           its send only on the yes */
        const inCard = !!(el && el.isJSXOpeningElement() && nameOfEl(el) === 'Menus3Card' && attr.node.name.name === 'onAnswer');
        if (inCard) {
          const kind = el.node.attributes.find((x) => x.type === 'JSXAttribute' && x.name.name === 'kind');
          const onYesOnly = !!p.findParent((x) => x.isIfStatement() && x.node.test.type === 'BinaryExpression' && x.node.test.right.type === 'StringLiteral' && x.node.test.right.value === 'yes');
          if (!(kind && kind.value && kind.value.type === 'StringLiteral' && kind.value.value === 'pet.release' && onYesOnly)) bad.add('W1');
          return;
        }
        if (!(inConfirm && attr.node.name.name === 'onYes')) { bad.add('W1'); return; }
        const at = (k) => el.node.attributes.find((x) => x.type === 'JSXAttribute' && x.name.name === k);
        const act = at('action') && at('action').value && at('action').value.expression;
        const cost = propOf(act, 'cost');
        const label = propOf(act, 'label');
        const words = at('words') && at('words').value && at('words').value.expression;
        if (!(cost && cost.value.type === 'StringLiteral' && cost.value.value === 'irreversible' && sayKey(label && label.value) === 'pets.releaseYes' && sayKey(words) === 'pets.releaseAsk')) bad.add('W1');
        if (!at('onNo') || sayKey(at('no') && at('no').value && at('no').value.expression) !== 'pets.releaseKeep') bad.add('W1');   /* "Keep", as today's page */
      } else if (inConfirm && c.name !== 'sendPetHouseBuy') bad.add('W1');   /* a confirmation on Take out (or Rename) */
    },
  });
  if (!kitImported || releases < 1) bad.add('W1');
  if (!opened || !usePressOk || actives < 2) bad.add('W2');
  /* the kit's dialog: Enter on its yes, Esc on its no (CLAUDE.md section 7) */
  let yes = false, no = false;
  BB.traverse(parseJsx(files[KIT]), {
    JSXOpeningElement(p) {
      if (nameOfEl(p) !== 'Ui2Action') return;
      const has = (k) => p.node.attributes.some((x) => x.type === 'JSXAttribute' && x.name.name === k);
      const onClick = p.node.attributes.find((x) => x.type === 'JSXAttribute' && x.name.name === 'onClick');
      const fn = onClick && onClick.value && onClick.value.expression && onClick.value.expression.name;
      if (fn === 'onYes' && has('data-enter')) yes = true;
      if (fn === 'onNo' && has('data-esc')) no = true;
    },
  });
  if (!(yes && no)) bad.add('W1');
  /* the opener runs petPages.js's one pending state (R12 tests it) */
  if (!/export function petsPressNow\(control, rev, send\) \{\n  const r = petsPress\(_pend, control, rev, Date\.now\(\), send\);/.test(files[OPENER])) bad.add('W2');
  return [...bad];
}

const DFILES = Object.freeze({ [PAGE]: readRel(PAGE), [KIT]: readRel(KIT), [OPENER]: readRel(OPENER) });
const dBad = drawingVerdict(DFILES);
for (const id of ['W1', 'W2']) check(id + ' on the real PetsPage.jsx', !dBad.includes(id), dBad.join(', '));
const DRAW_PLANTS = [
  ['E1', 'W1', 'Release sends at its first tap (no ask)', PAGE, "release: { label: say(SAY, 'pets.release'), c: 'red', onPress: () => setMode('release') },",
    "release: { label: say(SAY, 'pets.release'), c: 'red', onPress: () => press(PET_HOLDS.release(id), () => sendPetRelease(S, id)) },"],
  ['E2', 'W2', 'the ask\'s yes sends without press()', PAGE, 'onYes={() => { press(PET_HOLDS.release(id), () => sendPetRelease(S, id)); setMode(null); }}', 'onYes={() => { sendPetRelease(S, id); setMode(null); }}'],
  ['E3', 'W1', 'the ask made routine', PAGE, "action={{ id: 'release', cost: 'irreversible',", "action={{ id: 'release', cost: 'routine',"],
  ['E4', 'W2', 'Take out sent without press() (a second press goes out)', PAGE, 'onPress: () => press(PET_HOLDS.active, () => sendPetActive(S, v.out ? null : id)) },', 'onPress: () => sendPetActive(S, v.out ? null : id) },'],
  ['E5', 'W2', 'the landing\'s Put away sent without press()', PAGE, 'onPress: () => press(PET_HOLDS.active, () => sendPetActive(S, null)) }', 'onPress: () => sendPetActive(S, null) }'],
  ['E6', 'W2', 'press() that sends at once', PAGE, '    const went = petsPressNow(control, revOf(getS()), send);', '    const went = send();'],
  ['E7', 'W1', 'a confirmation on Take out', PAGE, "onPress: () => press(PET_HOLDS.active, () => sendPetActive(S, v.out ? null : id)) },",
    "onPress: () => press(PET_HOLDS.active, () => sendPetActive(S, v.out ? null : id)), ask: <Ui2Confirm action={{ id: 'active', cost: 'costly' }} onYes={() => press(PET_HOLDS.active, () => sendPetActive(S, id))} /> },"],
  ['E8', 'W1', 'the ask\'s question not the card\'s words', PAGE, "words={say(SAY, 'pets.releaseAsk', { name: v.name })}", 'words={null}'],
  ['E9', 'W1', 'the ask\'s way back not "Keep"', PAGE, " no={say(SAY, 'pets.releaseKeep')} />", ' />'],
  ['E10', 'W1', 'the Card\'s release sent on any answer (v2.3.6871)', PAGE, "onAnswer={(a) => { if (a === 'yes') press(PET_HOLDS.release(id)", "onAnswer={(a) => { press(PET_HOLDS.release(id)"],
];
for (const [id, want, what, rel, from, to] of DRAW_PLANTS) {
  const t = plantText(ROOT, rel, from, to);
  if (t === null) { check(`${id} (${what}): its line is found once in ${path.basename(rel)}`, false, 'the plant\'s line moved: update the plant'); continue; }
  const red = drawingVerdict({ ...DFILES, [rel]: t });
  check(`${id} plant (${what}) turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
