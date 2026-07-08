/* Alignment-register verification test (v2.3.1218).
 * The moral-progression foundation: four register counters accrued at NPC
 * chain CAPSTONE quests, plus the pure dominant-register / five-ending
 * resolvers.  Checks:
 *   PURE (alignment.js):
 *   1. dominantRegister: untested / each strict-max / balanced (ties).
 *   2. resolveEnding: null when untested; the four dominant endings; and
 *      Weaver on every tie shape (2/3/4-way, 1/1/1/1).
 *   3. sanitizeAlignment clamps counters, drops junk choices/titles, and
 *      never trusts an over-cap or non-register value.
 *   INTEGRATION (quests.js _handleQuestTurnIn capstone gate):
 *   4. A capstone turn-in with a legal path increments the right counter,
 *      records the permanent choice, awards the title, pays base gold/xp.
 *   5. Re-turn-in (replay) or a second path is rejected -- permanent per chain.
 *   6. A capstone turn-in with a missing/invalid path pays nothing and
 *      leaves the quest active.
 *   7. The counters survive save->load (persistence round-trip).
 */
import {
  REGISTERS, dominantRegister, resolveEnding, sanitizeAlignment,
  defaultAlignment, REGISTER_COUNT_CAP,
} from '../src/alignment.js';
import { GameRoom } from '../src/index.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

// Build an alignment blob from a {register: count} spec.
function align(spec) {
  const a = defaultAlignment();
  for (const [reg, n] of Object.entries(spec)) a[reg + 'Count'] = n;
  return a;
}

// ── 1. dominantRegister ──
check('dominant: untested when all zero', dominantRegister(defaultAlignment()) === 'untested');
check('dominant: responsible strict max', dominantRegister(align({ responsible: 3, cool: 1 })) === 'responsible');
check('dominant: mischievous strict max', dominantRegister(align({ mischievous: 2 })) === 'mischievous');
check('dominant: cool strict max', dominantRegister(align({ cool: 5, ruthless: 4 })) === 'cool');
check('dominant: ruthless strict max', dominantRegister(align({ ruthless: 1 })) === 'ruthless');
check('dominant: two-way tie -> balanced', dominantRegister(align({ responsible: 2, ruthless: 2 })) === 'balanced');
check('dominant: 1/1/1/1 -> balanced', dominantRegister(align({ responsible: 1, mischievous: 1, cool: 1, ruthless: 1 })) === 'balanced');

// ── 2. resolveEnding ──
check('ending: untested -> null', resolveEnding(defaultAlignment()) === null);
check('ending: responsible -> hero', resolveEnding(align({ responsible: 2, mischievous: 1 })) === 'hero');
check('ending: mischievous -> trickster', resolveEnding(align({ mischievous: 3 })) === 'trickster');
check('ending: cool -> arbiter', resolveEnding(align({ cool: 4, responsible: 1 })) === 'arbiter');
check('ending: ruthless -> sovereign', resolveEnding(align({ ruthless: 5, cool: 2 })) === 'sovereign');
check('ending: 2-way tie -> weaver', resolveEnding(align({ responsible: 3, ruthless: 3 })) === 'weaver');
check('ending: 3-way tie -> weaver', resolveEnding(align({ responsible: 2, mischievous: 2, cool: 2 })) === 'weaver');
check('ending: 4-way tie -> weaver', resolveEnding(align({ responsible: 4, mischievous: 4, cool: 4, ruthless: 4 })) === 'weaver');
check('ending: 1/1/1/1 balanced -> weaver', resolveEnding(align({ responsible: 1, mischievous: 1, cool: 1, ruthless: 1 })) === 'weaver');

// ── 3. sanitizeAlignment ──
{
  const dirty = sanitizeAlignment({
    responsibleCount: 999, mischievousCount: -4, coolCount: 2.9, ruthlessCount: 'x',
    choices: { mayor_3: 'responsible', bad_q: 'notaregister', __proto__: 'ruthless' },
    titlesEarned: ['Protector', 42, 'Jester'],
  });
  check('sanitize: over-cap counter clamped to cap', dirty.responsibleCount === REGISTER_COUNT_CAP, dirty.responsibleCount);
  check('sanitize: negative counter -> 0', dirty.mischievousCount === 0, dirty.mischievousCount);
  check('sanitize: fractional counter floored', dirty.coolCount === 2, dirty.coolCount);
  check('sanitize: non-numeric counter -> 0', dirty.ruthlessCount === 0, dirty.ruthlessCount);
  check('sanitize: valid choice kept', dirty.choices.mayor_3 === 'responsible', dirty.choices);
  check('sanitize: invalid-register choice dropped', !('bad_q' in dirty.choices), dirty.choices);
  check('sanitize: choices map is null-proto', Object.getPrototypeOf(dirty.choices) === null);
  check('sanitize: titles keep strings only', dirty.titlesEarned.length === 2 && dirty.titlesEarned.includes('Protector') && dirty.titlesEarned.includes('Jester'), dirty.titlesEarned);
  check('sanitize: garbage input -> fresh default', dominantRegister(sanitizeAlignment(null)) === 'untested');
  check('sanitize: registers list is the four', REGISTERS.length === 4 && REGISTERS.join(',') === 'responsible,mischievous,cool,ruthless');
}

// ── INTEGRATION harness (mirrors quests.test.mjs) ──
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, z = 'town') {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: -100000, y: -100000, z } }));
}

const ws = fakeWs('a');
await join(ws, 'bp_align_p');
const ps = room.playerState['bp_align_p'];

// ── caps advertised (deploy-order gate, rule 19) ──
const sync = ws.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.questCapstone', sync && sync.caps && sync.caps.questCapstone === true, sync && sync.caps);

// ── 4. capstone turn-in with a legal path ──
check('join bootstraps a fresh alignment', ps._alignment && ps._alignment.responsibleCount === 0 && Object.getPrototypeOf(ps._alignment.choices) === null, ps._alignment);
ps._quests = { mayor_3: 'active' };
const coins0 = ps.coins || 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_3', path: 'ruthless' } }));
check('capstone turn-in completes the quest', ps._quests.mayor_3 === 'turnedIn', ps._quests);
check('capstone increments the chosen register', ps._alignment.ruthlessCount === 1, ps._alignment);
check('capstone leaves other registers at 0', ps._alignment.responsibleCount === 0 && ps._alignment.coolCount === 0, ps._alignment);
check('capstone records the permanent choice', ps._alignment.choices.mayor_3 === 'ruthless', ps._alignment.choices);
check('capstone awards the path title', ps._alignment.titlesEarned.includes('Lone Wolf'), ps._alignment.titlesEarned);
check('capstone pays base gold', (ps.coins || 0) === coins0 + 300, ps.coins);
check('dominant reads the choice', dominantRegister(ps._alignment) === 'ruthless');

// ── 5. permanence: replay + re-pick rejected ──
{
  const rBefore = ps._alignment.ruthlessCount;
  const cBefore = ps.coins;
  // replay the same (already turnedIn) quest
  await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_3', path: 'ruthless' } }));
  check('replayed capstone pays nothing / no double-count', ps._alignment.ruthlessCount === rBefore && ps.coins === cBefore, { r: ps._alignment.ruthlessCount, coins: ps.coins });
  // force it active again and try a DIFFERENT path -> choice already recorded, reject
  ps._quests.mayor_3 = 'active';
  await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_3', path: 'responsible' } }));
  check('re-pick of a decided chain is rejected', ps._alignment.responsibleCount === 0 && ps._quests.mayor_3 === 'active' && ps._alignment.choices.mayor_3 === 'ruthless', ps._alignment);
  ps._quests.mayor_3 = 'turnedIn';
}

// ── 6. missing / invalid path on a fresh capstone ──
{
  const ws2 = fakeWs('a2');
  await join(ws2, 'bp_align_q');
  const ps2 = room.playerState['bp_align_q'];
  ps2._quests = { mayor_3: 'active' };
  const c0 = ps2.coins || 0;
  await room.webSocketMessage(ws2, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_3' } }));
  check('capstone with NO path pays nothing, stays active', ps2._quests.mayor_3 === 'active' && (ps2.coins || 0) === c0, { q: ps2._quests.mayor_3, coins: ps2.coins });
  await room.webSocketMessage(ws2, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_3', path: 'constructor' } }));
  check('capstone with junk path rejected', ps2._quests.mayor_3 === 'active' && !Object.prototype.hasOwnProperty.call(ps2._alignment.choices, 'mayor_3'), ps2._alignment.choices);
  // now a valid path works
  await room.webSocketMessage(ws2, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_3', path: 'cool' } }));
  check('valid path after rejections completes', ps2._quests.mayor_3 === 'turnedIn' && ps2._alignment.coolCount === 1 && ps2._alignment.titlesEarned.includes('Uninvolved'), ps2._alignment);
}

// ── 7. persistence round-trip ──
{
  await room._saveRpg('bp_align_p', ps);
  const stored = await state.storage.get('rpg:bp_align_p');
  check('saved blob carries _alignment', stored && stored._alignment && stored._alignment.ruthlessCount === 1 && stored._alignment.choices.mayor_3 === 'ruthless', stored && stored._alignment);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
