/* ═══ v2.3.3766: THE TOWN HALL'S BOARD AND ITS PINS (the phone's half) ═══
 *
 * The owner: "at the town hall it was just a big menu board of all the things
 * to do ... with a page that describes what each thing does and pin drop you
 * can put on the map to go to the one you want (two pins can be active at
 * once - red pin and blue pin)".
 *   1. The board (src/data/townBoard.js): every row has a unique id the pins
 *      can keep, a group the board has, a picture that exists, 1-4 sentences
 *      and a where; each is found by a door of the town, a townsperson the
 *      town places, a dungeon's land or a land -- never a coordinate; no row
 *      says "Wheel" or "tap" (deskWords' word: the page is read on computers
 *      too).
 *   2. The pins (src/game/mapPins.js): a press puts a pin on a place, moving
 *      it from wherever it was; the same press there lifts it; red and blue
 *      at once (even on one place); kept per character, read back after a
 *      reload; an id no longer on the board, or a hostile one, is dropped.
 */
import { existsSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const B = await import('../../src/data/townBoard.js');
const P = await import('../../src/game/mapPins.js');
const D = await import('../../src/data/wheelBuildingDoors.js');
const L = await import('../../src/data/wheelLands.js');
const W = await import('../../src/data/wheelDungeons.js');

/* ── 1. the board ── */
{
  const ids = B.BOARD.map((e) => e.id);
  check('1a every row has a unique id the pins can keep', new Set(ids).size === ids.length && ids.every((id) => /^[a-z0-9-]{1,40}$/.test(id)), ids);
  const groups = new Set(B.GROUPS.map((g) => g.id));
  check('1b every row is under one of the board\'s headings, and every heading has rows',
    B.BOARD.every((e) => groups.has(e.group)) && B.GROUPS.every((g) => B.BOARD.some((e) => e.group === g.id)), B.BOARD.filter((e) => !groups.has(e.group)).map((e) => e.id));
  const missing = B.BOARD.filter((e) => !existsSync(new URL('public' + e.icon.split('?')[0], root))).map((e) => e.icon);
  check('1c every tile\'s picture is one the game already has (public/)', missing.length === 0, missing);
  const plots = new Set(Object.keys(D.WHEEL_BUILDING_ICONS));
  const folk = new Set(D.WHEEL_TOWNSFOLK.map((t) => t.name));
  const bad = B.BOARD.filter((e) => {
    const a = e.at || {};
    const keys = Object.keys(a);
    if (keys.length !== 1) return true;
    if (a.door) return !plots.has(a.door);
    if (a.npc) return !folk.has(a.npc);
    if (a.mouth) return !W.WHEEL_DUNGEON_HOMES.includes(a.mouth);
    if (a.land) return !L.WHEEL_LANDS.includes(a.land);
    return true;
  }).map((e) => e.id);
  check('1d every place is found at runtime: a door of the town, a townsperson the town places, a dungeon\'s land or a land (no coordinate)', bad.length === 0, bad);
  check('1e ...and every dungeon row waits for its dungeon to be open', B.BOARD.filter((e) => e.at && e.at.mouth).every((e) => e.mouth === e.at.mouth));
  const pages = B.BOARD.filter((e) => !Array.isArray(e.page) || e.page.length < 1 || e.page.length > 4 || typeof e.where !== 'string' || !e.where).map((e) => e.id);
  check('1f every page is 1-4 sentences and says where', pages.length === 0, pages);
  const words = B.BOARD.filter((e) => /\bwheel\b|\btap\b|\btapping\b/i.test([e.name, e.where, ...e.page].join(' '))).map((e) => e.id);
  check('1g no row says "Wheel" (players read "the world") or "tap" (deskWords\' word)', words.length === 0, words);
  check('1h boardEntry finds a row, and nothing for a hostile id', B.boardEntry('arena') && B.boardEntry('arena').name === 'The Arena' && B.boardEntry('__proto__') === null && B.boardEntry(5) === null);
  check('1i the four dungeons, the arena, the forge and the Gambling Den are on the board', ['goo-grotto', 'great-cave', 'foundry-dome', 'buried-city', 'arena', 'forge', 'gambling', 'woodworker'].every((id) => !!B.boardEntry(id)));
}

/* ── 2. the pins ── */
{
  const store = new Map();
  const isPlace = (id) => !!B.boardEntry(id);
  const S = { myId: 'bp_a' };
  P.loadPins(S, store, isPlace);
  check('2a nothing pinned at first', P.pinsOf(S).red === null && P.pinsOf(S).blue === null);
  P.togglePin(S, 'red', 'arena', store);
  P.togglePin(S, 'blue', 'forge', store);
  check('2b red and blue at once', P.pinsOf(S).red === 'arena' && P.pinsOf(S).blue === 'forge', P.pinsOf(S));
  const v0 = P.pinsVersion(S);
  P.togglePin(S, 'red', 'gambling', store);
  check('2c red pinned elsewhere moves (one red pin)', P.pinsOf(S).red === 'gambling' && P.pinsOf(S).blue === 'forge' && P.pinsVersion(S) > v0);
  P.togglePin(S, 'blue', 'forge', store);
  check('2d the same press where it is lifts it', P.pinsOf(S).blue === null);
  P.togglePin(S, 'blue', 'gambling', store);
  check('2e both on one place', P.pinsOn(S, 'gambling').join() === 'red,blue', P.pinsOn(S, 'gambling'));
  const S2 = { myId: 'bp_a' };
  P.loadPins(S2, store, isPlace);
  check('2f a reload reads them back', P.pinsOf(S2).red === 'gambling' && P.pinsOf(S2).blue === 'gambling', P.pinsOf(S2));
  const S3 = { myId: 'bp_b' };
  P.loadPins(S3, store, isPlace);
  check('2g another character has his own (none)', P.pinsOf(S3).red === null && P.pinsOf(S3).blue === null);
  store.set('bp_pins:x', 'junk');
  store.set('bt_pins:bp_c', JSON.stringify({ red: 'not-on-board', blue: '__proto__' }));
  const S4 = { myId: 'bp_c' };
  P.loadPins(S4, store, isPlace);
  check('2h a stored id no longer on the board, or a hostile one, is dropped', P.pinsOf(S4).red === null && P.pinsOf(S4).blue === null);
  check('2i a bad colour or id changes nothing', P.togglePin(S, 'green', 'arena', store) === null && P.togglePin(S, 'red', '<x>', store) === 'gambling' && P.pinsOf(S).red === 'gambling');
  store.set('bt_pins:bp_d', '{not json');
  const S5 = { myId: 'bp_d' };
  P.loadPins(S5, store, isPlace);
  check('2j a broken record is no pins, never a throw', P.pinsOf(S5).red === null);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) { console.log(`${failed} FAILURE(S)`); process.exit(1); }
console.log('ALL PASS');
