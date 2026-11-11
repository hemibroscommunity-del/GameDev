/* EACH QUEST'S PHONE CHECK AGREES WITH THE SERVER'S GOAL -- v2.3.4641.
 *
 * The state-machine sweep's "what is left" (docs/STATE-MACHINES.md, #1486,
 * #1503): "a test that holds each quest's phone check to the server's goal, so
 * the two cannot drift apart."  The phone decides when to show a quest as ready
 * to hand in (gameSystems.js QUEST_CHAINS[q].check); the worker decides whether
 * to pay it (data.js QUEST_REWARDS[q].objective, quests.js _questObjectiveMet).
 * Two copies of one rule: when they disagree, the phone either offers a Claim
 * the worker refuses (the reward shown, then taken back) or never offers one
 * the worker would pay.
 *
 * For EVERY quest the worker checks, this builds the character the objective
 * describes just short of its goal and exactly at it, and asks both: the
 * worker's own _questObjectiveMet on a real GameRoom, and the phone's check on
 * the same record.  They must agree, below and at.  A new objective type with
 * no state built here fails until it is taught (never skipped in silence). */
import { GameRoom } from '../src/index.js';
import { QUEST_REWARDS } from '../src/data.js';
import { QUEST_COUNTED } from '../src/quests.js';
import { QUEST_CHAINS } from '../../src/data/gameSystems.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
function makeState() {
  const store = new Map();
  return {
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const room = new GameRoom(makeState(), { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });

/* the record at `n` of the objective's measure, for quest `q`; null when this
   test does not know the type */
function recordAt(q, o, n) {
  const r = { inventory: {}, lifeSkills: {}, _questKills: Object.create(null), _questFlags: {} };
  if (QUEST_COUNTED.indexOf(o.type) >= 0) { r._questKills[q] = n; return r; }
  if (o.type === 'collect' && o.invKey) { if (n > 0) r.inventory[o.invKey] = n; return r; }
  if (o.type === 'collect' && o.invPrefix) {
    /* spread over two keys of the family, as a real bag would hold them */
    const a = Math.ceil(n / 2), b = n - a;
    if (a > 0) r.inventory[o.invPrefix + 'drift_a'] = a;
    if (b > 0) r.inventory[o.invPrefix + 'drift_b'] = b;
    return r;
  }
  if (o.type === 'skill') { r.lifeSkills[o.skill] = { level: n, xp: 0 }; return r; }
  if (o.type === 'dungeon_clear') {
    r.lifeSkills.dungeonClears = {};
    for (let i = 0; i < n; i++) r.lifeSkills.dungeonClears['drift_' + i] = true;
    return r;
  }
  if (o.type === 'flag') { if (n > 0) r._questFlags[o.flag] = true; return r; }
  return null;
}
const goalOf = (o) => (o.type === 'skill' ? (o.level || 1) : o.type === 'flag' ? 1 : (o.count || 1));

const checked = [];
for (const [q, reward] of Object.entries(QUEST_REWARDS)) {
  const o = reward && reward.objective;
  if (!o) continue;
  const c = QUEST_CHAINS[q];
  if (!c || typeof c.check !== 'function') { check(q + ': the phone has a check for the quest the worker checks', false, { objective: o }); continue; }
  const goal = goalOf(o);
  /* below: the skill's floor is level 1, so "just short" of level L is L-1 */
  const below = recordAt(q, o, goal - 1), at = recordAt(q, o, goal);
  if (!below || !at) { check(q + ': this test knows how to build its objective (' + o.type + ')', false, o); continue; }
  const srvBelow = room._questObjectiveMet(below, q, o), srvAt = room._questObjectiveMet(at, q, o);
  let phBelow, phAt;
  try { phBelow = !!c.check(below, {}); phAt = !!c.check(at, {}); } catch (e) { phBelow = phAt = 'threw: ' + e.message; }
  check(q + ' (' + o.type + '): the worker and the phone agree just short of the goal and at it',
    srvBelow === false && srvAt === true && phBelow === srvBelow && phAt === srvAt,
    { objective: o, worker: [srvBelow, srvAt], phone: [phBelow, phAt] });
  checked.push(q);
}
check('every quest the worker checks was held (' + checked.length + ')', checked.length > 0 && checked.length === Object.values(QUEST_REWARDS).filter((r) => r && r.objective).length);
/* one known shape of drift, by name: a dungeon clear the record holds as not-true
   (dungeon.js writes true; the phone counts the keys) */
{
  const q = 'mayor_3', o = QUEST_REWARDS[q] && QUEST_REWARDS[q].objective, c = QUEST_CHAINS[q];
  if (o && c && o.type === 'dungeon_clear') {
    const r = { lifeSkills: { dungeonClears: { hollows: false } } };
    check('mayor_3: a clear recorded as not-true counts for neither', room._questObjectiveMet(r, q, o) === !!c.check(r, {}), { worker: room._questObjectiveMet(r, q, o), phone: !!c.check(r, {}) });
  }
}
console.log(`\nquest-check-drift: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
