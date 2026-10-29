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
 *      v2.3.3779, the owner: "it should be classified by 'dungeon' not by
 *      'fight' ... Also use better icons for each one" -- the dungeons have
 *      their own heading; every tile its own picture, a new one 256 colours
 *      at most; a land's name is never spelt here but read from the world's
 *      plan (lane K's rename lands in plan.js alone).
 *      v2.3.3788, the owner: "'Gambling' should be another category ... list
 *      the level ranges below the dungeons (e.g lvl 10+ for goo grotto) ...
 *      (quests should've be another one)" -- a Quests heading first (the
 *      Mayor's story, the townsfolk's, the guild ladders, Lil Bro's race),
 *      a Gambling heading after Money and trade, and each dungeon's level
 *      line from the dungeon tables; the quests' numbers are the worker's.
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
const SD = await import('../src/data.js');
const { PLAN } = await import('../../public/tools/world/plan.js');
const { inflateSync } = await import('node:zlib');
const { readFileSync } = await import('node:fs');

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
    if (e.nopin) return e.at !== null;   /* v2.3.3766: No man's land, nowhere in particular */
    const a = e.at || {};
    const keys = Object.keys(a);
    if (keys.length !== 1) return true;
    if (a.door) return !plots.has(a.door);
    if (a.npc) return !folk.has(a.npc) && !Object.prototype.hasOwnProperty.call(D.WHEEL_KEEPERS, a.npc);   /* v2.3.3788: + Mayor Bro, at the hall he keeps */
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
  check('1j No man\'s land is on the board under Fight with no place and no pins, its level words general (no numbers)',
    !!B.boardEntry('nomansland') && B.boardEntry('nomansland').group === 'fight' && B.boardEntry('nomansland').at === null
      && !B.boardPinnable('nomansland') && B.boardPinnable('arena') && !/\d/.test(B.boardEntry('nomansland').page.join(' ')));
  /* ── v2.3.3779 ── */
  const dungeons = B.BOARD.filter((e) => e.group === 'dungeons').map((e) => e.id).sort().join();
  check('1k the four dungeons have their own heading, Dungeons, after Fight; Fight keeps the Arena, No man\'s land and Duels',
    dungeons === 'buried-city,foundry-dome,goo-grotto,great-cave' && B.GROUPS.map((g) => g.id).join() === 'quests,fight,dungeons,lands,make,money,gambling,people'
      && B.BOARD.filter((e) => e.group === 'fight').map((e) => e.id).join() === 'arena,nomansland,duel', { dungeons, groups: B.GROUPS.map((g) => g.id) });
  const pics = B.BOARD.map((e) => e.icon.split('?')[0]);
  check('1l every tile has its own picture (no two alike)', new Set(pics).size === pics.length, pics.filter((p, i) => pics.indexOf(p) !== i));
  /* a PNG's colours: palette PNGs (PLTE) of 256 entries or fewer */
  const plte = (f) => {
    const b = readFileSync(f); let o = 8;
    while (o < b.length) { const n = b.readUInt32BE(o), t = b.toString('latin1', o + 4, o + 8); if (t === 'PLTE') return n / 3; if (t === 'IDAT') return 0; o += 12 + n; }
    return 0;
  };
  const newPics = pics.filter((p) => p.startsWith('/icons/board/'));
  const fat = newPics.filter((p) => { const n = plte(new URL('public' + p, root)); return !(n > 0 && n <= 256); });
  check('1m the board\'s own pictures (public/icons/board/) are palette pictures of 256 colours or fewer', newPics.length === 5 && fat.length === 0, { newPics, fat });
  const landNames = Object.values(PLAN.regions).map((r) => r && r.name).filter((n) => typeof n === 'string' && n.length > 3);
  const spelt = B.BOARD.filter((e) => landNames.some((n) => [e.name, e.where, ...e.page].join(' ').includes(n))).map((e) => e.id);
  check('1n no row spells a land\'s name: each is {land}, read from the world\'s plan', spelt.length === 0 && landNames.length >= 8, spelt);
  const toks = new Set();
  for (const e of B.BOARD) for (const t of [e.name, e.where, ...e.page].join(' ').matchAll(/\{([^}]*)\}/g)) toks.add(t[1]);
  check('1o every {land} is one of the eight lands', [...toks].every((t) => L.WHEEL_LANDS.includes(t)) && toks.size === 8, [...toks]);
  const names = Object.create(null);
  for (const id of L.WHEEL_LANDS) names[id] = PLAN.regions[id].name;
  const verd = B.boardEntry('land-verdant');
  check('1p a land\'s tile and pages read its name from the plan (a rename lands there alone); without the map, its element',
    B.boardName(verd, names) === PLAN.regions.verdant.name && B.boardName(verd, null) === 'The flora land'
      && B.boardWords(B.boardEntry('goo-grotto').where, { verdant: 'Earth Forest' }).includes('Earth Forest')
      && B.boardWords('{__proto__} {toString}', names) === '{__proto__} {toString}',
    [B.boardName(verd, names), B.boardName(verd, null)]);
  check('1q every land\'s tile is its scene (the owner\'s pick 1b), drawn wide', B.BOARD.filter((e) => e.group === 'lands').every((e) => /^\/ui\/banners\/land-/.test(e.icon) && e.iconAspect === 2));
  /* ── v2.3.3788 ── */
  const inGroup = (g) => B.BOARD.filter((e) => e.group === g).map((e) => e.id).join();
  check('1r Quests first (the Mayor\'s story, the townsfolk\'s, the Guild Hall, Lil Bro\'s race); Gambling (the Den, Ace) after Money and trade; People and Money keep the rest',
    inGroup('quests') === 'mayor,townquests,guildhall,race' && inGroup('gambling') === 'gambling,ace' && inGroup('money') === 'store,diego,auction,bank' && inGroup('people') === 'saloon,post,hotel',
    { quests: inGroup('quests'), gambling: inGroup('gambling'), money: inGroup('money'), people: inGroup('people') });
  check('1s the Mayor\'s story pins on Mayor Bro; the townsfolk\'s quests (six people) have no pins',
    B.boardPinnable('mayor') && B.boardEntry('mayor').at.npc === 'Mayor Bro' && !B.boardPinnable('townquests') && B.boardEntry('townquests').at === null);
  /* the quests' numbers are the worker's (server/src/data.js) */
  const R = SD.QUEST_REWARDS, live = (k) => R[k] && !SD.QUEST_DORMANT.includes(k) && !SD.QUEST_RETIRED.includes(k);
  /* his line: tut_1, then (after the tour's first steps) tut_2 to tut_4 by
     `next`, then mayor_2 on (data.js QUEST_RETIRED's note) */
  const chain = ['tut_1']; for (let k = 'tut_2'; k; k = R[k].next) chain.push(k);
  for (let n = 2; live('mayor_' + n); n++) chain.push('mayor_' + n);
  const mayorGold = chain.filter(live).reduce((t, k) => t + R[k].gold, 0);
  const mayorPage = B.boardEntry('mayor').page.join(' ');
  const folkQ = Object.keys(R).filter((k) => live(k) && /^(smith|wood|farm|beast|fish|race)_\d$/.test(k));
  const folkPage = B.boardEntry('townquests').page.join(' ');
  const guildPage = B.boardEntry('guildhall').page.join(' ');
  const lv = SD.GUILD_QUESTS.map((q) => q.checkLvl);
  check('1t the quests\' numbers are the worker\'s: the Mayor\'s six and their gold, the townsfolk\'s twelve, the guild ladder\'s levels and gold',
    chain.filter(live).length === 6 && /six/.test(mayorPage) && mayorPage.includes(mayorGold.toLocaleString('en-US') + ' gold')
      && folkQ.length === 12 && /Twelve/.test(folkPage)
      && guildPage.includes(lv.slice(0, -1).join(', ') + ' and ' + lv[lv.length - 1]) && SD.GUILD_QUESTS.length === 8 && /eight/.test(guildPage)
      && guildPage.includes(SD.GUILD_QUESTS[0].gold + ' at the first') && guildPage.includes(SD.GUILD_QUESTS[7].gold.toLocaleString('en-US') + ' at the last'),
    { chain, mayorGold, folk: folkQ.length });
  /* the dungeons' level lines: the party row and the level it is for, else the
     lowest of the place's levels (the plan's landmark tier) */
  const lvls = (id) => { const t = PLAN.regions[id].landmark.tier, n = PLAN.wheel.levelsPerTier; return [(t - 1) * n + 1, t * n]; };
  const line = (id, party) => W.dungeonBoardLine(party ? W.WHEEL_DUNGEON_PARTY[id] || null : null, lvls(id), W.WHEEL_DUNGEON_REC[id] || 0);
  const lines = { verdant: line('verdant', true), hollows: line('hollows', true), thunder: line('thunder', true), sky: line('sky', true) };
  check('1u each dungeon\'s level line, from the dungeon tables: Goo Grotto "Lv 10+ · party of 2–3", Great Cave and Foundry Dome "Lv 26+", Buried City "Lv 41+"',
    lines.verdant === 'Lv 10+ · party of 2–3' && lines.hollows === 'Lv 26+' && lines.thunder === 'Lv 26+' && lines.sky === 'Lv 41+'
      && line('verdant', false) === 'Lv 1+' && W.dungeonBoardLine(null, null, 0) === null, lines);
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
  store.set('bt_pins:bp_e', JSON.stringify({ red: 'nomansland', blue: 'arena' }));
  const S6 = { myId: 'bp_e' };
  P.loadPins(S6, store, B.boardPinnable);
  check('2k a pin stored on a place with no pins (No man\'s land) is dropped; one on a pinnable place kept', P.pinsOf(S6).red === null && P.pinsOf(S6).blue === 'arena', P.pinsOf(S6));
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
