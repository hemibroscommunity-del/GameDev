/* ═══ v2.3.4401: A QUEST TAP THE WORKER REFUSES IS ANSWERED ═══
 *
 * The state-machine sweep (V9a G4-1, S9-1, P2-13): the game draws a quest
 * taken, or handed in and paid (gold, XP, +5 achievement points, the giver's
 * next quest), BEFORE the worker answers.  Four hand-in refusals and two
 * accept refusals sent nothing back -- and on protocol v2 nothing came later
 * either, because the delta sends only what changed -- so the phone kept a
 * reward the worker never paid until the next join.
 *
 * This suite sends every quest message (`quest_accept`, `quest_turn_in`) each
 * refusable request it has, on protocol v1 AND v2, against the real GameRoom,
 * and fails on silence (review R2's "fails on silence", for the QUEST
 * messages only).  It also holds:
 *   - the echo carries the worker's own `_quests`, `coins` and
 *     `achievementPoints` (the barred and trade echoes too: they used to send
 *     only the first two);
 *   - a refusal writes nothing to storage;
 *   - the kill switch `disable_quest_echo` puts back the old silence;
 *   - a hand-in the worker accepts still pays, once.
 */
import { GameRoom } from '../src/index.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* storage that counts every row written (cost-guard.test's) */
function countingState() {
  const m = new Map();
  const writes = [];
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  return {
    writes,
    storage: {
      async get(k) {
        if (Array.isArray(k)) { const r = new Map(); for (const x of k) if (m.has(x)) r.set(x, clone(m.get(x))); return r; }
        return clone(m.get(k));
      },
      async put(k, v) {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { writes.push(kk); m.set(kk, clone(vv)); } return; }
        writes.push(String(k)); m.set(k, clone(v));
      },
      async delete(k) {
        if (Array.isArray(k)) { for (const x of k) { writes.push(x); m.delete(x); } return k.length; }
        writes.push(String(k)); return m.delete(k);
      },
      async list(opts) {
        const r = new Map(); const p = (opts && opts.prefix) || '';
        for (const [k, v] of m) if (k.startsWith(p)) r.set(k, clone(v));
        return r;
      },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() }; }

const state = countingState();
const room = new GameRoom(state, mockEnv);
room._liveFlags = {};

async function join(id, pv) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: id, phrase: 'p-' + id, data: { x: 1000, y: 1000, z: 'town' } };
  if (pv === 2) msg.protocolVersion = 2;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return ws;
}
/* the player_state messages a request brought back, and the rows it wrote */
async function ask(ws, id, type, payload) {
  const s0 = ws.sent.length;
  const w0 = state.writes.length;
  await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  await new Promise((r) => setTimeout(r, 0));
  const ps = ws.sent.slice(s0).filter((m) => m.type === 'player_state').map((m) => m.payload);
  const rows = state.writes.slice(w0).filter((k) => k.indexOf(id) >= 0);
  return { ps, rows };
}
/* a fresh player in a known quest state */
async function fresh(id, pv, quests, extra) {
  const ws = await join(id, pv);
  const p = room.playerState[id];
  p._quests = Object.assign(Object.create(null), quests);
  p._questKills = Object.create(null);
  p.coins = 7;
  p.achievementPoints = 11;
  if (extra) extra(p);
  /* settle the join's first full emit, so v2's cache holds every field */
  room._sendPlayerState(ws, id);
  return { ws, p };
}
/* an echo that tells the phone the worker's own values */
function saysTruth(st, qid, want) {
  const last = st[st.length - 1];
  return !!last && last._quests && last._quests[qid] === want && last.coins === 7 && last.achievementPoints === 11;
}

for (const pv of [1, 2]) {
  const tag = ' (v' + pv + ')';
  let n = 0;
  const pid = () => 'bp_qecho_' + pv + '_' + (++n);

  /* ── 1. hand in a quest that is not active ── */
  {
    const id = pid();
    const { ws } = await fresh(id, pv, { mayor_2: 'available' });
    const r = await ask(ws, id, 'quest_turn_in', { questId: 'mayor_2', xpCat: 'sword' });
    check('1. hand-in of a quest not active is answered' + tag, r.ps.length === 1 && saysTruth(r.ps, 'mayor_2', 'available'), r.ps);
    check('1. and writes nothing' + tag, r.rows.length === 0, r.rows);
  }
  /* ── 2. hand in with the objective unmet ── */
  {
    const id = pid();
    const { ws, p } = await fresh(id, pv, { mayor_2: 'active' });
    const r = await ask(ws, id, 'quest_turn_in', { questId: 'mayor_2', xpCat: 'sword' });
    check('2. hand-in with the objective unmet is answered' + tag, r.ps.length === 1 && saysTruth(r.ps, 'mayor_2', 'active'), r.ps);
    check('2. and pays nothing, writes nothing' + tag, p.coins === 7 && p.achievementPoints === 11 && p._quests.mayor_2 === 'active' && r.rows.length === 0, { coins: p.coins, rows: r.rows });
  }
  /* ── 3. hand in while dying ── */
  {
    const id = pid();
    const { ws, p } = await fresh(id, pv, { mayor_2: 'active' }, (q) => { q._questKills.mayor_2 = 5; });
    p.dying = true;
    const r = await ask(ws, id, 'quest_turn_in', { questId: 'mayor_2', xpCat: 'sword' });
    check('3. hand-in while dying is answered' + tag, r.ps.length === 1 && saysTruth(r.ps, 'mayor_2', 'active'), r.ps);
    check('3. and writes nothing' + tag, r.rows.length === 0 && p.coins === 7, r.rows);
    p.dying = false;
  }
  /* ── 4. hand in a quest that pays XP with no skill named ── */
  {
    const id = pid();
    const { ws, p } = await fresh(id, pv, { mayor_2: 'active' }, (q) => { q._questKills.mayor_2 = 5; });
    if (!p.prog3) p.prog3 = room.playerState[id].prog3 || { lv: {} };
    const r = await ask(ws, id, 'quest_turn_in', { questId: 'mayor_2' });
    check('4. hand-in with no XP skill named is answered' + tag, r.ps.length === 1 && saysTruth(r.ps, 'mayor_2', 'active'), r.ps);
    check('4. and writes nothing' + tag, r.rows.length === 0 && p.coins === 7, r.rows);
  }
  /* ── 5. accept a quest already handed in ── */
  {
    const id = pid();
    const { ws } = await fresh(id, pv, { tut_1: 'turnedIn', mayor_1: 'turnedIn' });
    const r = await ask(ws, id, 'quest_accept', { questId: 'mayor_1' });
    check('5. accept of a quest handed in is answered' + tag, r.ps.length === 1 && saysTruth(r.ps, 'mayor_1', 'turnedIn'), r.ps);
    check('5. and writes nothing' + tag, r.rows.length === 0, r.rows);
  }
  /* ── 6. accept while dead ── */
  {
    const id = pid();
    const { ws, p } = await fresh(id, pv, { tut_1: 'turnedIn', mayor_2: 'available' });
    p.dead = true;
    const r = await ask(ws, id, 'quest_accept', { questId: 'mayor_2' });
    check('6. accept while dead is answered' + tag, r.ps.length === 1 && saysTruth(r.ps, 'mayor_2', 'available'), r.ps);
    check('6. and writes nothing' + tag, r.rows.length === 0 && p._quests.mayor_2 === 'available', r.rows);
    p.dead = false;
  }
  /* ── 7. the barred echo (v2.3.3179) now carries the points too ── */
  {
    const id = pid();
    const { ws } = await fresh(id, pv, { mayor_1: 'active' });   /* unchecked, tut_1 not in: 'first' */
    const r = await ask(ws, id, 'quest_turn_in', { questId: 'mayor_1', xpCat: 'sword' });
    check('7. a barred hand-in echoes the achievement points too' + tag, r.ps.length === 1 && saysTruth(r.ps, 'mayor_1', 'active'), r.ps);
  }
  /* ── 8. the kill switch: silent again ── */
  {
    const id = pid();
    const { ws } = await fresh(id, pv, { mayor_2: 'active' });
    room._liveFlags = { disable_quest_echo: true };
    const r = await ask(ws, id, 'quest_turn_in', { questId: 'mayor_2', xpCat: 'sword' });
    room._liveFlags = {};
    check('8. disable_quest_echo: the refusal is silent again' + tag, r.ps.length === 0, r.ps);
  }
  /* ── 9. a hand-in the worker accepts still pays, once ── */
  {
    const id = pid();
    const { ws, p } = await fresh(id, pv, { tut_1: 'turnedIn', mayor_2: 'active' }, (q) => { q._questKills.mayor_2 = 5; });
    const r = await ask(ws, id, 'quest_turn_in', { questId: 'mayor_2', xpCat: 'sword' });
    check('9. a met hand-in pays' + tag, p._quests.mayor_2 === 'turnedIn' && p.coins === 107 && p.achievementPoints === 16, { coins: p.coins, ap: p.achievementPoints });
    check('9. and tells the phone' + tag, r.ps.some((s) => s.coins === 107), r.ps);
    const r2 = await ask(ws, id, 'quest_turn_in', { questId: 'mayor_2', xpCat: 'sword' });
    check('9. a second hand-in pays nothing and is answered' + tag, p.coins === 107 && r2.ps.length === 1 && r2.rows.length === 0, { coins: p.coins, ps: r2.ps });
  }
}

/* ── 10. a join with the echo in place writes what it wrote before ── */
{
  const w0 = state.writes.length;
  await join('bp_qecho_join', 2);
  const rows = state.writes.slice(w0).filter((k) => k.indexOf('bp_qecho_join') >= 0);
  const w1 = state.writes.length;
  room._liveFlags = { disable_quest_echo: true };
  await join('bp_qecho_join2', 2);
  room._liveFlags = {};
  const rows2 = state.writes.slice(w1).filter((k) => k.indexOf('bp_qecho_join2') >= 0);
  check('10. a join writes the same rows with the echo on as off', rows.length === rows2.length, { on: rows, off: rows2 });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
