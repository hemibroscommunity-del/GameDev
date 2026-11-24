/* ═══ v2.3.6446: A KEY THE TREE CANNOT KNOW, ON A PLAYER'S RECORD (card DG, sitting 59's mend) ═══
 *
 * WHY.  Every "one door" test (gold, life, experience, build points, the
 * bag, the stashes, quest state) asks the shared scanner
 * (tools/guards/lib/writesOf.mjs) who writes ITS fields.  A write through a
 * key the tree cannot know (`ps[k] = v`, `delete ps[k]`, k from data) names
 * no field, so each door's scan passed it: it may be any of them.  The
 * running room (testroom.mjs, card DG PR 1) refuses one on a path a suite
 * plays; this scan refuses the rest.  Deny by default: such a write on a
 * record that holds a guarded field -- a name the file reads or writes a
 * guarded field of, or a player's record `this.playerState[id]` -- is RED,
 * unless it is a row of KNOWN below (file, function, count, why), a list
 * that only falls.
 *
 *   1. no write through an unknown key on a record holding a guarded field
 *      outside the doors' own files, but the KNOWN rows (their counts held);
 *   2. the scan, planted: `ps[k] = v`, `delete ps[k]`, `ps[k] += n`,
 *      `this.playerState[id][k] = v`, through an alias of the record, are red;
 *      a key the tree knows (`ps['coins']` is gold-door's), a record of no
 *      guarded field, and a read are not.
 *
 * BREAK PROOF (rule 8), 2026-11-24: `ps[k] = 0;` with k a parameter, in
 * shop.js _shopSell -> FAIL 1 (plants-scans.json).
 */
import { readFileSync } from 'node:fs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { STASH_FIELDS } from '../src/stash.js';
import { QUEST_KEPT } from '../src/queststate.js';
import { writesOf, doorWrites, where } from '../../tools/guards/lib/writesOf.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 1500) : ''); }
}

/* every door's fields (each door suite's own scan) */
const FIELDS = ['coins', 'hp', 'dying', 'dead', 'life', 'xp', 'level', 'lifeSkills', 'weaponSkills', 'defenseSkill', 'sk',
  'pool', 'shared', 'ppl', 'spl', 'unspentT2', 'buildPointsThisLvl', 'prog3'];
const CONTAINERS = ['poolBy', 'alloc', 'atk', 'inventory', ...STASH_FIELDS, '_quests', '_questKills', '_questFlags', ...QUEST_KEPT];
const DOORS = ['gold.js', 'life.js', 'xp.js', 'skillpoints.js', 'bag.js', 'stash.js', 'queststate.js'];
const SCAN = { fields: FIELDS, containers: CONTAINERS, unknownKeys: true, keep: (w) => w.field === '[?]' };

/* the writes through a key the tree cannot know, each with why it is not a
   second writer of a guarded field.  It only falls. */
const K = (file, fn, n, why) => ({ file, fn, field: '[?]', n, why });
const KNOWN = [
  K('gear.js', '_handleUnequipRequest', 1, 'a worn slot emptied: `slot` is checked against the worn slots (weapon, armor, legs, shield, amulet...) before'),
  K('gear.js', '_handleEquipRequest', 1, 'a worn slot filled from the stash: the same checked slot'),
  K('grids.js', '_handleStatsUpdate', 1, 'the stats update: `s` is a key of the closed list of stats it may set'),
  K('index.js', '_onMessage', 1, 'the tracker\'s copy of a moving player (`_trackPs`), its keys the cleaned state\'s, TRACK_STATE_EXCLUDED kept out'),
  K('join.js', '_handleJoin', 1, 'the join drops the keys of an old record that start with the rpg prefix (JOIN_RPG_PREFIX_RE) before the stored one loads'),
  K('join.js', '_sanitizeJoinData', 2, 'the join\'s data cleaned into a NEW object (`out`), its keys the allowed list\'s'),
  K('monsterlife.js', '_monsterNewLife', 1, 'a MONSTER\'s new life, its keys MONSTER_LIFE.NEW\'s (a monster, never a player)'),
  K('playerrestore.js', 'restoredCharacter', 1, 'the owner\'s restore of a character from a snapshot into a NEW record (`work`), SKIP kept out'),
  K('quests.js', '_questTradeApply', 1, 'a quest trade puts the made piece on its worn slot (`pick.slot`, from the trade\'s own table)'),
  K('spar.js', '_sparSpawn', 2, 'a sparring CLONE\'s record copied from the player\'s (never a player\'s record)'),
];

const raw = Object.create(null);
for (const f of srcFiles()) raw[f] = readFileSync(new URL(f, SRC_DIR), 'utf8');

/* ══════════ 1. THE WORKER ══════════ */
{
  const r = doorWrites(raw, { skip: DOORS, ...SCAN, listed: KNOWN });
  check('1. no write through a key the tree cannot know, on a record holding a guarded field, outside the doors (but KNOWN)', r.found.length === 0, r.found.map(where));
  check('1. ...every KNOWN row still holds its count (it only falls)', r.stale.length === 0, r.stale);
}

/* ══════════ 2. THE SCAN, PLANTED ══════════ */
{
  const n = (body) => writesOf('export const x = {\n  _a(ps, k, v, id, row) {\n' + body + '\n  },\n};', SCAN).filter((w) => w.field === '[?]').length;
  const red = ['if (ps.coins > 0) ps[k] = v;', 'ps.hp = ps.hp || 1;\ndelete ps[k];', 'ps.inventory && (ps[k] += 1);',
    'this.playerState[id][k] = v;', 'const me = this.playerState[id];\nme[row.field] = v;', 'const q = ps; if (ps.xp) q[k] = 0;'];
  const missed = red.filter((b) => n(b) === 0);
  check('2. a key the tree cannot know on a record of a guarded field is red (' + red.length + ' planted)', missed.length === 0, missed);
  check('2. ...and a known key, a record of no guarded field, a read, are not',
    n('ps[\'coins\'] = 1;\nconst o = {};\no[k] = v;\nconst t = ps[k];\nif (ps.coins) log(ps[k]);') === 0);
}

if (failures) { console.log(failures + ' FAILED'); process.exit(1); }
console.log('record-key-door: all passed');
