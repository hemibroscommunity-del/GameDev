/* ═══ v2.3.5281: THE STASHES' DOOR (grand plan step 4.3, card R PR 2) ═══
 * (the door: server/src/stash.js; the spec: docs/specs/stash-door.md)
 *
 * A player's stashes -- the weapon bag and the five gear lists -- were written
 * by hand in about forty places across sixteen files.  Every change goes
 * through stashGive / stashTake / stashSet now, each call naming its ROAD, its
 * row in STASH_ROADS.  This suite holds it, as gold-door.test holds the purse:
 *
 *   1. THE DOOR: a give appends and is REFUSED at the stash's cap (handoff
 *      rule 3, moved here: false, nothing added); a take returns the piece or
 *      null; a set makes the list, or one place; the list is made when
 *      missing; a wrong road, verb or stash throws, the list untouched;
 *   2. ONE DOOR: no stash is written anywhere in server/src but stash.js --
 *      by its name (`.weaponStash.push`, `= []`, `[i] =`, `.length =`), by a
 *      field held in a name inside a function that touches a stash
 *      (`ps[field].push`), or through a name that holds one
 *      (`const bag = ps.shieldStash; bag.push`); what is not a stash is
 *      listed with why;
 *   3. ONE ROW, ONE PLACE: every call names a road the table has, with its
 *      verb, from its row's file -- the door's own calls and the three
 *      helpers that hand it their caller's road (gearstash.js
 *      _gearStashLiveAdd / _gearStashLiveTake, shieldwear.js bagIt); every
 *      road has exactly one caller;
 *   4. THE CLASSES: every road is a mint, a burn, a move or an escrow (gold.js
 *      classFaults); a move is within the same player (`other: 'self'`); an
 *      escrow names a place that holds (ESCROW_PLACES); the door's gear lists
 *      are gearstash.js's;
 *   2b. (v2.3.6446, sitting 59) THE ALLOW LIST: a stash, or a piece of one,
 *      appears outside stash.js only in a form the scan knows (a read, a
 *      test, a copy or a name it follows, an argument of the door's calls, a
 *      pure global, a function of the same file); handed to a function of
 *      another file, returned, put into an object or a list written out is a
 *      write it cannot follow, RED unless a row of HANDED_OUT (which only
 *      falls; 31 appearances in 24 rows at v2.3.6446);
 *   5. THE CAP IS THE DOOR'S: `_saveRpg` keeps every weapon of a bag over its
 *      cap (never cut at the save), and a weapon by the mail to a full bag is
 *      refused at the door (the mail keeps it), the bag untouched.
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-14:
 *   - `ps.weaponStash.push(w);` put back in inbox.js           -> FAIL 2 (a second writer)
 *   - `if (list.length >= stashCap(field, room)) return false;` deleted -> FAIL 1, FAIL 5
 *   - a second `stashTake(ps, 'weaponStash', 0, 'salvage_weapon')` in store.js -> FAIL 3 (two callers; and the wrong file)
 *   - (v2.3.6446) `tuneFirst(ps.weaponStash)` in gear.js, tuneFirst in gearstash.js writing `list[0].lvl = 99` -> FAIL 2 (handed out; plants-scans.json)
 *
 * A new way to change a stash: a row in STASH_ROADS and one call that names it.
 */
import { readFileSync } from 'node:fs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { STASH_ROADS, STASH_FIELDS, STASH_SELF, stashGive, stashTake, stashSet, stashCap } from '../src/stash.js';
import { GEAR_STASH_FIELDS, gearStashCap } from '../src/gearstash.js';
import { classFaults, CLASSES, ESCROW_PLACES } from '../src/gold.js';
import { makeStorage, openRoom, settle, playTour, roomGuard } from './testroom.mjs';
import { GEAR_PROV_FIELD, GEAR_PROV_FIELDS } from '../src/gearprov.js';
import { writesOf, doorWrites, doorCalls, where } from '../../tools/guards/lib/writesOf.mjs';   /* v2.3.6441: the scans read the syntax tree (card DG PR 2) */

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 900) : ''); }
}
const throws = (fn) => { try { fn(); return false; } catch (e) { return true; } };
const ROOM = { WEAPON_STASH_CAP: 3 };

/* ══════════ 1. THE DOOR ══════════ */
{
  const ps = {};
  check('1. a give makes the list when missing, and appends', stashGive(ps, 'weaponStash', { n: 1 }, 'loot_weapon', ROOM) === true && Array.isArray(ps.weaponStash) && ps.weaponStash.length === 1);
  stashGive(ps, 'weaponStash', { n: 2 }, 'reveal_dev', ROOM);
  stashGive(ps, 'weaponStash', { n: 3 }, 'quest_reward', ROOM);
  const full = stashGive(ps, 'weaponStash', { n: 4 }, 'mail_weapon', ROOM);
  check('1. a give at the cap is REFUSED: false, nothing added (rule 3, never cut at the save)', full === false && ps.weaponStash.length === 3 && ps.weaponStash.every((w, i) => w.n === i + 1), ps.weaponStash);
  check('1. ...the weapon bag\'s cap is the room\'s; without a room it throws', stashCap('weaponStash', ROOM) === 3 && throws(() => stashCap('weaponStash', {})) && throws(() => stashGive({}, 'weaponStash', {}, 'loot_weapon')));
  check('1. ...a gear list\'s is gearstash.js\'s', stashCap('armorStash') === gearStashCap());
  const t = stashTake(ps, 'weaponStash', 1, 'salvage_weapon');
  check('1. a take returns the piece at its place, the rest closing up', t && t.n === 2 && ps.weaponStash.map((w) => w.n).join() === '1,3');
  check('1. ...nothing there: null, nothing taken', stashTake(ps, 'weaponStash', 9, 'weapon_sell') === null && stashTake(ps, 'weaponStash', -1, 'weapon_sell') === null && stashTake(ps, 'weaponStash', 0.5, 'weapon_sell') === null && ps.weaponStash.length === 2);
  check('1. a set at a place makes that place; a place that is not one: false', stashSet(ps, 'weaponStash', { n: 9 }, 'equip_swap', 0) === true && ps.weaponStash[0].n === 9 && stashSet(ps, 'weaponStash', { n: 8 }, 'equip_swap', 5) === false && ps.weaponStash.length === 2);
  check('1. a set makes the whole list; anything not a list, an empty one', stashSet(ps, 'weaponStash', [{ n: 7 }], 'join_stored') === true && ps.weaponStash.length === 1 && stashSet(ps, 'weaponStash', 'junk', 'nml_weapons') === true && Array.isArray(ps.weaponStash) && ps.weaponStash.length === 0);
  const before = JSON.stringify(ps);
  const wrong = [
    () => stashGive(ps, 'weaponStash', {}, 'no_such_road', ROOM),
    () => stashGive(ps, 'weaponStash', {}, 'salvage_weapon', ROOM),     /* a take road, given */
    () => stashTake(ps, 'weaponStash', 0, 'loot_weapon'),               /* a give road, taken */
    () => stashGive(ps, 'armorStash', {}, 'loot_weapon', ROOM),          /* a weapon road on a gear list */
    () => stashGive(ps, 'weaponStash', {}, 'gear_loot', ROOM),           /* a gear road on the weapon bag */
    () => stashGive(ps, 'weaponStash', {}, 'constructor', ROOM),         /* an Object.prototype name */
    () => stashSet(ps, 'weaponStash', [], 'toString'),
  ];
  check('1. a wrong road, verb or stash throws, the list untouched', wrong.every(throws) && JSON.stringify(ps) === before);
}

/* ══════════ 2. ONE DOOR ══════════ */
/* Comments out, line numbers kept (gold-door.test's strip). */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const files = srcFiles();
const code = Object.create(null);
for (const f of files) code[f] = strip(readFileSync(new URL(f, SRC_DIR), 'utf8'));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;
/* v2.3.6441 (card DG PR 2): the scan reads the syntax tree
   (tools/guards/lib/writesOf.mjs), never a pattern of text: a stash by its
   name, by a field held in a name (`for (const f of STASH_FIELDS)`,
   `GEAR_PROV_FIELD.shield`, `liveField(slot)`), through a name that holds one
   (`const bag = ps.shieldStash`, `const { weaponStash } = ps`, a helper of
   the file handed it), a list's own changers, `Object.assign(ps, {
   weaponStash: [...] })` (plants1 STASH-1, STASH-2). */
const raw = Object.create(null);
for (const f of files) raw[f] = readFileSync(new URL(f, SRC_DIR), 'utf8');
const SCAN = {
  containers: [...STASH_FIELDS],
  words: { STASH_FIELDS: [...STASH_FIELDS], GEAR_STASH_FIELDS: [...GEAR_STASH_FIELDS], GEAR_PROV_FIELDS: [...GEAR_PROV_FIELDS], GEAR_PROV_FIELD: Object.values(GEAR_PROV_FIELD), 'liveField()': ['armorStash', 'legsStash'] },
};
/* What looks like a stash write and is not one, and why: its file, its
   function, its field, how many writes.  A stale entry fails. */
const NOT_A_STASH = [];   /* none today: a worn slot (`ps[f] = null` over WORN_WEAPONS) is not bound to a stash field */
/* v2.3.6441 (the orchestrator's note on the purpose review, sitting 56): a
   stash ITEM changed in place (`ps.weaponStash[0].lvl = 99`, an item held in
   a name, a loop over the stash) is a write of the stash.  The places that
   reshape their own items in place today, each with why; a new one fails.
   None adds or takes an item: what the stash holds is the door's. */
const GEAR = 'armorStash|legsStash|shieldStash|gearStash|amuletStash';
const IN_PLACE = [
  { file: 'amulet.js', fn: '_stripGems', field: 'weaponStash', n: 7, why: 'the forge\'s gem extraction: the gems taken off an item and its name rebuilt (what the phone predicted), the item kept where it is' },
  { file: 'gearprov.js', fn: 'visit', field: GEAR, n: 2, why: 'the provenance sweep: a piece whose id was claimed twice loses its id and is marked legacy' },
  { file: 'gscopper.js', fn: 'oldGreatswordToMetal', field: 'weaponStash', n: 6, why: 'a stored old greatsword given its metal (a migration on a blob, and the mail\'s landing), never weaker' },
  { file: 'migrations.js', fn: 'fix', field: 'weaponStash', n: 1, why: 'the migrations: a renamed weapon\'s name' },
  { file: 'revealbag.js', fn: '_revealBagOpen', field: 'weaponStash', n: 1, why: 'the reveal bag: an unrevealed weapon revealed (its flag taken off)' },
  { file: 'revealbag.js', fn: '_revealBagOnJoin', field: 'armorStash|legsStash|shieldStash|amuletStash|gearStash', n: 1, why: 'the reveal bag at the join: a piece with no id has no secret to keep (its flag taken off)' },
  { file: 'swordconvert.js', fn: 'swordToGreatsword', field: 'weaponStash', n: 8, why: 'the owner\'s sword conversion (owner call 1): a stored sword made a greatsword in place' },
];
/* v2.3.6446 (sitting 59: `tuneFirst(ps.weaponStash)`, tuneFirst in
   gearstash.js writing `list[0].lvl = 99`, stayed green: the scan followed a
   stash only within one file).  THE ALLOW LIST (writesOf opts.handout): a
   stash, or a piece of one (its items are objects), appears outside the door
   only as a read, a test, a copy or a name the scan follows, an argument of
   the door's own calls, of a pure global or of a function of the same file;
   every other appearance -- handed to a function of another file, returned,
   put into an object or a list written out -- is a write the scan cannot
   follow, RED unless it is a row below.  The rows only fall: each says why
   the piece handed out is read there, or copied, never changed. */
const STASH_DOORS = ['stashGive', 'stashTake', 'stashSet', 'stashCap', 'weaponIdOk', 'weaponIdGive', 'weaponIdsAll'];
const SCAN_OUT = { ...SCAN, handout: { doors: STASH_DOORS, objects: [...STASH_FIELDS] } };
const O = (file, fn, field, n, why) => ({ file, fn, field, out: true, n, why });
const GEARS = 'armorStash|legsStash|shieldStash|amuletStash|gearStash';
const HANDED_OUT = [
  O('amulet.js', '_handleAmuletForge', 'weaponStash', 1, 'the forged piece\'s id stamped in the provenance book (_gearProvTouch reads its gid)'),
  O('gear.js', '_prog3EquipOk', 'weaponStash', 2, 'the equip gate asks whether a piece is an armour-ladder piece and its defence need (isArmourLadderPiece, armorDefReq: reads)'),
  O('gear.js', '_handleEquipRequest', 'weaponStash', 1, 'a blade still a "?" opened as it is worn (_revealBagOnWear: the reveal bag\'s own flag)'),
  O('gearstash.js', '_gearStashAdoptOnJoin', 'armorStash|legsStash|shieldStash|gearStash|amuletStash', 3, 'the join\'s stored gear lists resolved against the provenance book (_gearProvResolveList hands back a new list, through stashSet)'),
  O('gscopper.js', 'gameNamesFor', 'weaponStash', 1, 'a gem set\'s name read (weaponGemName)'),
  O('gscopper.js', 'oldGreatswordToMetal', 'weaponStash', 1, 'the same name read for the migration\'s rename (weaponGemName; the write is IN_PLACE\'s row)'),
  O('join.js', '_handleJoin', 'weaponStash', 1, 'the stored weapon bag cleaned (_sanitizeWeaponList hands back new pieces) into stashSet'),
  O('market.js', '_mktPlaceOrder', 'weaponStash', 1, 'a weapon listed on the market: a clean copy (_sanitizeWeapon)'),
  O('nomansland.js', '_nmlOnDeath', 'weaponStash', 1, 'No man\'s land\'s death: each weapon lost handed to the mail\'s credit (the stash is emptied through the door: nml_weapons)'),
  O('nomansland.js', '_nmlOnDeath', GEARS, 1, 'No man\'s land\'s death: a worn piece kept in the list the door sets back (keep.push)'),
  O('persistence.js', 'capStash', 'amuletStash', 1, 'the echo\'s copy of a gear list, cut at the cap (a new list for the message)'),
  O('persistence.js', 'keepStash', 'amuletStash', 1, 'the save\'s copy of a gear list, cut at the keep cap (a new list for the record)'),
  O('persistence.js', '_saveRpg', 'weaponStash', 1, 'the save: a copy of the weapon bag into the stored record'),
  O('persistence.js', '_sendPlayerState', 'weaponStash', 1, 'the echo: the weapon bag\'s public view (revealPublicList hands back new pieces)'),
  O('revealbag.js', '_revealBagOpen', 'weaponStash', 3, 'the reveal bag\'s answer: the opened piece handed back to its handler and read for its reveals (_revealsFor)'),
  O('revealbag.js', '_revealBagOpen', GEARS, 1, 'the reveal bag: the copies of a gear piece gathered to be opened together'),
  O('revealbag.js', '_revealBagAchv', 'weaponStash', 1, 'an achievement asked of the opened piece (_achvOnPiece reads it)'),
  O('salvage.js', '_salvageWeaponAt', 'weaponStash', 2, 'the salvage\'s look-up: the weapon read (_isGearNotWeapon) and handed back to its handler, which takes it through the door'),
  O('shieldgem.js', '_shieldGemPiece', GEARS, 2, 'the shield to gem found (its predicate a function of the file) and handed back to the gem handler'),
  O('shieldwear.js', 'bag', GEARS, 1, 'the shield list read by the wear handler\'s helper (bagIt gives through the door)'),
  O('store.js', '_stCreateListing', 'weaponStash', 1, 'a weapon listed in the store: a clean copy (_sanitizeWeapon)'),
  O('swordconvert.js', 'gameNamesFor', 'weaponStash', 1, 'a gem set\'s name read (weaponGemName)'),
  O('swordconvert.js', 'swordToGreatsword', 'weaponStash', 1, 'the same name read for the conversion\'s rename (weaponGemName; the write is IN_PLACE\'s row)'),
  O('trade2.js', '_handleTrade2StageWeapon', 'weaponStash', 1, 'a weapon staged in a trade: a clean copy (_sanitizeWeapon)'),
];
{
  const r = doorWrites(raw, { skip: ['stash.js'], ...SCAN_OUT, listed: [...NOT_A_STASH, ...IN_PLACE, ...HANDED_OUT] });
  check('2. no stash is written in server/src but through the door (stash.js): by its name, by a field in a name, or through a name that holds one', r.found.length === 0, r.found.map(where));
  check('2. ...every NOT_A_STASH and IN_PLACE entry still holds its count of writes (a stale one is deleted, a second spelling is one too many)', r.stale.length === 0, r.stale);
  const plant = (txt) => writesOf(txt, SCAN).length;
  const mustFind = [
    'export const x = {\n  _a(ps, w) {\n    ps.weaponStash.push(w);\n  },\n};',
    'export const x = {\n  _a(ps) {\n    ps.armorStash = [];\n  },\n};',
    'export const x = {\n  _a(ps, i, w) {\n    ps.weaponStash[i] = w;\n  },\n};',
    'export const x = {\n  _a(ps) {\n    ps.weaponStash.length = 8;\n  },\n};',
    'export const x = {\n  _a(ps, p) {\n    const field = GEAR_PROV_FIELD.shield;\n    ps[field].push(p);\n  },\n};',
    'export const x = {\n  _a(ps, p) {\n    const bag = ps.shieldStash;\n    bag.splice(0, 1);\n  },\n};',
    'export const x = {\n  _a(ps) {\n    ps[\'gearStash\'].pop();\n  },\n};',
    'export const x = {\n  _a(ps, w) {\n    for (const f of STASH_FIELDS) ps[f].push(w);\n  },\n};',
    'export const x = {\n  _a(ps, slot, p) {\n    const field = liveField(slot);\n    ps[field].unshift(p);\n  },\n};',
    /* v2.3.6441: the shape review's (plants1 STASH-1, STASH-2) */
    'export const x = {\n  _a(ps, w) {\n    const { weaponStash } = ps;\n    weaponStash.push(w);\n  },\n};',
    'export const x = {\n  _a(ps, w) {\n    Object.assign(ps, { weaponStash: [...(ps.weaponStash || []), w] });\n  },\n};',
    /* v2.3.6441: an item changed in place (the purpose review's note, sitting 56) */
    'export const x = {\n  _a(ps) {\n    ps.weaponStash[0].lvl = 99;\n  },\n};',
    'export const x = {\n  _a(ps) {\n    for (const w of ps.weaponStash) w.lvl = 99;\n  },\n};',
  ];
  const missed = mustFind.filter((t) => plant(t) === 0);
  check('2. ...the scanner finds each shape of a second writer (' + mustFind.length + ' planted)', missed.length === 0, missed);
  check('2. ...and reads a compare as no write', plant('export const x = {\n  _a(ps) {\n    if (ps.weaponStash == null) return;\n    return ps.weaponStash.length === 3;\n  },\n};') === 0);
  /* v2.3.6446 (sitting 59): THE ALLOW LIST -- a stash or a piece of it
     handed where the scan cannot follow is red; the allowed forms are not */
  const outs = (t) => writesOf(t, SCAN_OUT).filter((w) => w.out).length;
  const mustOut = [
    'export const x = {\n  _a(ps) {\n    tuneFirst(ps.weaponStash);\n  },\n};',                          /* the review's: a function of another file */
    'export const x = {\n  _a(ps) {\n    this._tune(ps.armorStash[0]);\n  },\n};',                       /* a piece handed to a method of another file */
    'export const x = {\n  _a(ps) {\n    return ps.weaponStash;\n  },\n};',                               /* handed back */
    'export const x = {\n  _a(ps) {\n    const o = { list: ps.weaponStash };\n    send(o);\n  },\n};',     /* a property of an object written out */
    'export const x = {\n  _a(ps) {\n    keep([...ps.weaponStash]);\n  },\n};',                          /* a copy of the list: the same pieces */
    'export const x = {\n  _a(ps) {\n    for (const [, w] of Object.entries(ps.weaponStash)) fix(w);\n  },\n};',
    'export const x = {\n  _a(ps) {\n    const w = ps.weaponStash.find((p) => p.lvl > 1);\n    polish(w);\n  },\n};',
    'export const x = {\n  _a(ps) {\n    ps.weaponStash.forEach(tidy);\n  },\n};',                         /* a callback of another file */
  ];
  const missedOut = mustOut.filter((t) => outs(t) === 0);
  check('2. ...ALLOW LIST: a stash or a piece handed where the scan cannot follow is red (' + mustOut.length + ' planted)', missedOut.length === 0, missedOut);
  check('2. ...and the allowed forms are not: a read, a length, a test, a door\'s call, a pure global, a function of the file, a field of a piece, a key',
    outs('export const x = {\n  _a(ps, i) {\n    const n = ps.weaponStash.length;\n    if (!Array.isArray(ps.weaponStash) || ps.weaponStash.includes(null)) return;\n    stashGive(ps, \'weaponStash\', ps.weaponStash[0], \'loot_weapon\', this);\n    log(ps.weaponStash[i].name, JSON.stringify(ps.weaponStash));\n    look(ps.weaponStash);\n    for (const w of ps.weaponStash) say(w.name + w.lvl);\n    return T[ps.weaponStash[0].type];\n  },\n};\nfunction look(l) { return l.length; }') === 0);
}

/* ══════════ 3. ONE ROW, ONE PLACE ══════════ */
/* the door's own three, and the helpers that hand it their caller's road:
   [name, verb, the file it is defined in, the argument its road is].
   v2.3.6441: every call by any receiver, read off the syntax tree. */
const DOOR = [['stashGive', 'give'], ['stashTake', 'take'], ['stashSet', 'set']];
const HELPERS = [['_gearStashLiveAdd', 'give', 'gearstash.js', 3], ['_gearStashLiveTake', 'take', 'gearstash.js', 3], ['bagIt', 'give', 'shieldwear.js', 3]];
{
  const byRoad = Object.create(null);
  const bad = [];
  const take = (c, verb, road) => {
    const w = c.file + ':' + c.line;
    if (!road || !/^[A-Za-z0-9_]+$/.test(road)) { bad.push(w + ' names no road as a plain string'); return; }
    if (!Object.prototype.hasOwnProperty.call(STASH_ROADS, road)) { bad.push(w + ' names "' + road + '", which STASH_ROADS has not got'); return; }
    const row = STASH_ROADS[road];
    if (row.verb !== verb) bad.push(w + ' ' + road + ' is a ' + row.verb + ', called as a ' + verb);
    if (row.at.split(' ')[0] !== c.file) bad.push(w + ' ' + road + '\'s row says it is in ' + row.at.split(' ')[0]);
    (byRoad[road] = byRoad[road] || []).push(w);
  };
  const names = [...DOOR.map(([n]) => n), ...HELPERS.map(([h]) => h)];
  const { calls, odd } = doorCalls(raw, { skip: ['stash.js'], names, road: () => null });
  check('3. the door and its helpers are called plainly, by name (no bind, .call, apply or a name made of it)', odd.length === 0, odd.map((o) => where(o) + ' (' + o.how + ')'));
  for (const c of calls) {
    const door = DOOR.find(([n]) => n === c.name);
    if (door) {
      /* inside a helper, the road is its caller's: the parameter `road` */
      const inside = HELPERS.find(([h, hv, hf]) => hf === c.file && hv === door[1] && c.fn === h);
      if (inside && c.argSrc[3] === 'road') continue;
      take(c, door[1], c.args[3]);
      continue;
    }
    const [, verb, , at] = HELPERS.find(([h]) => h === c.name);
    take(c, verb, c.args[at]);
  }
  check('3. every call names a road the table has, with its verb, from its row\'s file (the helpers\' callers too)', bad.length === 0, bad);
  const none = Object.keys(STASH_ROADS).filter((r) => !byRoad[r]);
  const twice = Object.keys(byRoad).filter((r) => byRoad[r].length > 1).map((r) => r + ': ' + byRoad[r].join(', '));
  check('3. every road has a caller (a row nobody calls is deleted with its feature)', none.length === 0, none);
  check('3. no road has two callers, by any receiver (a second place is a second row)', twice.length === 0, twice);
}

/* ══════════ 4. THE CLASSES ══════════ */
{
  const faults = classFaults(STASH_ROADS, { [STASH_SELF]: true });
  check('4. every road is a mint, a burn, a move or an escrow, with its other side (gold.js classFaults)', faults.length === 0 && Object.values(STASH_ROADS).every((r) => CLASSES.includes(r.class)), faults);
  const between = Object.entries(STASH_ROADS).filter(([, r]) => r.class === 'move' && r.other !== STASH_SELF).map(([k]) => k);
  check('4. a move is within the same player (`other: \'self\'`): between players a piece is held (an escrow)', between.length === 0, between);
  check('4. ...every escrow names a place that holds (ESCROW_PLACES)', Object.values(STASH_ROADS).filter((r) => r.class === 'escrow').every((r) => ESCROW_PLACES.includes(r.other)) && ESCROW_PLACES.includes('trade2wpn:'));
  check('4. the door\'s gear lists are gearstash.js\'s', JSON.stringify(STASH_FIELDS.slice(1)) === JSON.stringify(GEAR_STASH_FIELDS) && STASH_FIELDS[0] === 'weaponStash');
  check('4. every road touches stashes the door knows', Object.values(STASH_ROADS).every((r) => r.fields.length && r.fields.every((f) => STASH_FIELDS.includes(f))));
}

/* ══════════ 5. THE CAP IS THE DOOR'S ══════════ */
{
  const st = makeStorage();
  const room = await openRoom(st);
  room._liveFlags.roomrow = false;
  const cap = room.WEAPON_STASH_CAP;
  const pid = 'bp_stash_a';
  const ps = { coins: 0, inventory: {}, level: 1, hp: 10, maxHp: 10 };
  room.playerState[pid] = ps;
  const over = Array.from({ length: cap + 3 }, (_, i) => ({ name: 'Blade ' + i, type: 'sword', tierMult: 1 }));
  stashSet(ps, 'weaponStash', over.slice(), 'join_stored');
  await room._saveRpg(pid, ps);
  await settle();
  const stored = st._store.get('rpg:' + pid);
  check('5. _saveRpg keeps every weapon of a bag over its cap (never cut at the save)', stored && Array.isArray(stored.weaponStash) && stored.weaponStash.length === cap + 3, stored && stored.weaponStash && stored.weaponStash.length);
  const before = ps.weaponStash.length;
  const landed = room._applyCreditToPs(ps, { kind: 'weapon', payload: { weapon: { name: 'Mailed', type: 'sword', tierMult: 1 } } }, pid);
  check('5. a weapon by the mail to a full bag is refused at the door (the mail keeps it), the bag untouched', landed === false && ps.weaponStash.length === before && !ps.weaponStash.some((w) => w && w.name === 'Mailed'), { landed, n: ps.weaponStash.length });
}

/* ══════════ R. THE RUNNING ROOM (v2.3.6440, card DG PR 1) ══════════
   The tour (testroom.mjs playTour: a quest handed in) played on a guarded
   room.  A second writer of the stashes planted on its paths is refused there,
   however it is spelled (Object.assign, `||=`, a computed key, an alias, a
   destructure, `delete`), and fails this suite: testroom.mjs "THE RUNNING
   ROOM REFUSES".  Break proof: plants1.json (tools/dev/plants/). */
{
  const t = await playTour({ tag: 'stash' });
  check('R. the tour plays under the running room\'s guard', roomGuard.armed());
  check('R. ...the guard is ON the tour\'s record (coins its accessor, the bag its Proxy, the room\'s map the guarded one: the purpose review, sitting 56)', roomGuard.holds(t.ps, t.room).length === 0, roomGuard.holds(t.ps, t.room));
  check('R. ...each of its steps did what it does (a quest handed in, paid)', t.steps.length > 0 && t.steps.every((x) => x.paid), t.steps);
  check('R. ...and no write of a guarded field was refused (testroom.mjs)', roomGuard.refusals().length === 0, roomGuard.refusals().slice(0, 5));
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('stash-door: FAILED'); process.exit(1); }
console.log('all stash-door checks passed');
