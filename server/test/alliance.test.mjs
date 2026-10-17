/* v2.3.3313: THE ALLIANCE (alliance.js, docs/specs/alliance.md).
 *
 * A party of 20 active members -- played in the last 7 days, level 5 or more
 * -- is an alliance until it falls below 15.  Its leader names it (once a day)
 * and gives it a tag shown on every member; it fights 30-minute wars in No
 * man's land that pay only the members who fought; and a board ranks every
 * alliance by active members, then levels.
 *
 *   1. caps.alliance; a party's roster says how far off 20 it is (`ally`),
 *      and marks the members who count (`act`).
 *   2. Who counts: level 5+ and on in the last 7 days; a level-3 newcomer and
 *      a member gone 8 days do not.
 *   3. The 20th active member makes it an alliance: `became`, the record
 *      shape 2 with `ally`, the board's row written with it.
 *   4. Naming: the leader only, an alliance only, the name and tag checked,
 *      once a day; the tag on every member (state, session, the others told
 *      with the build keys), in a new joiner's snapshot; no phone can send one.
 *   5. Unique across alliances and clans, both ways.
 *   6. Hysteresis: at 15 it stays, below it it is a party again and the tags
 *      come off; leaving takes yours off.
 *   7. A deploy: the record read back (shape 2), the tag re-told at the join.
 *   8. The board: by active members then levels, yours, one answer a 5 s; an
 *      alliance nobody is on counted from its row; a stale one falls off.
 *   9. Wars: who may declare on whom; the rosters frozen; a kill under No
 *      man's land's rule scores, any other death does not; the end pays the
 *      members who fought and are still in it, 500 / 50; 0-0 pays nobody; an
 *      hour's rest after.
 *  10. A party that ends takes its row and frees its name.
 *  11. The kill switch (and partykeep: false): no caps, no `ally`, 'off', the
 *      tags off at the next echo.
 *  12. Names: hidden characters stripped, lengths, tags upper-cased.
 */
import { GameRoom } from '../src/index.js';
import { PARTY } from '../src/party.js';
import { ALLIANCE, allyName, allyTagOk, allyRowOf, allyRowLive, cleanAlly } from '../src/alliance.js';

function makeState(seed) {
  const store = new Map(seed || []);
  const st = {
    puts: [], deletes: [],
    storage: {
      get: async (k) => {
        if (Array.isArray(k)) { const out = new Map(); for (const x of k) if (store.has(x)) out.set(x, store.get(x)); return out; }
        return store.get(k);
      },
      put: async (k, v) => { st.puts.push(k); store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { for (const x of Array.isArray(k) ? k : [k]) { st.deletes.push(x); store.delete(x); } },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
  return st;
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const last = (ws, type) => { const r = msgsOfType(ws, type); return r[r.length - 1] && r[r.length - 1].payload; };
const lastParty = (ws) => last(ws, 'party_state');
const lastErr = (ws) => last(ws, 'alliance_error');
const flush = async (n = 1) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const P = (n) => 'bp_al_' + n;
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(room, ws, id, name, opts) {
  const o = opts || {};
  room.sessions.set(ws, baseSession());
  const data = Object.assign({ x: 0, y: 0, z: 'town' }, o.data || {});
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: name || 'T', phrase: 'p-' + id, data }));
  await flush();
  /* the character level the alliance counts (ps.level): a new character is 3 */
  if (o.level !== undefined && room.playerState[id]) room.playerState[id].level = o.level;
}
const cmd = async (room, ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await flush(); };
const close = async (room, ws) => { await room.webSocketClose(ws); await flush(); };
async function form(room, wss, leader, others) {
  for (const o of others) {
    await cmd(room, wss[leader], 'party_invite', { target: P(o) });
    await cmd(room, wss[o], 'party_accept', { target: P(leader) });
  }
}
const names = (pre, n) => Array.from({ length: n }, (_, i) => pre + i);

// ── 1-3: counting, and becoming an alliance ──
/* v2.3.3321: §5 and §10 make clans, to prove a name is unique across both --
   clans are parties now (clanparty.js), so these rooms run with the switch
   that keeps them, `clanparty: false`; the conversion has its own suite */
const state = makeState([['liveflags', { clanparty: false }]]);
const room = new GameRoom(state, mockEnv);
const wss = {};
const A = names('a', 22);          /* the first alliance: a0 leads */
for (const n of A) { wss[n] = fakeWs(n); await join(room, wss[n], P(n), n.toUpperCase(), { level: 8, data: n === 'a1' ? { hg: 'tall', fr: 'broad' } : {} }); }
wss.low = fakeWs('low');
await join(room, wss.low, P('low'), 'LOW');   /* level 3: never counts */

const sync = wss.a0.sent.find((m) => m.type === 'state_sync');
check('1. state_sync advertises caps.alliance', sync && sync.caps && sync.caps.alliance === true, sync && sync.caps && sync.caps.alliance);

await form(room, wss, 'a0', ['a1', 'low']);
let pa = lastParty(wss.a0);
check('1. a party\'s roster says how far off it is: ally {on false, active, at 20, drop 15}',
  pa && pa.ally && pa.ally.on === false && pa.ally.active === 2 && pa.ally.at === ALLIANCE.AT && pa.ally.drop === ALLIANCE.DROP, pa && pa.ally);
check('2. ...a level-3 member does not count (no `act`), the level-8 ones do',
  pa && pa.members.find((m) => m.id === P('low')) && !pa.members.find((m) => m.id === P('low')).act && pa.members.find((m) => m.id === P('a1')).act === 1, pa && pa.members);
const pid1 = pa && pa.id;
check('3. a party that never was an alliance is stored as shape 1, no `ally`, no row',
  state._store.get('party:' + pid1).v === 1 && !state._store.get('party:' + pid1).ally && !state._store.has('ally:' + pid1), state._store.get('party:' + pid1));

await form(room, wss, 'a0', A.slice(2, 19));    /* a0..a18 + low: 19 active */
pa = lastParty(wss.a0);
check('2. 19 active of 20 members is not yet an alliance', pa && pa.ally.on === false && pa.ally.active === 19 && pa.members.length === 20, pa && pa.ally);
wss.a0.sent.length = 0;
await form(room, wss, 'a0', ['a19']);           /* the 20th active member */
pa = lastParty(wss.a0);
const becameMsg = msgsOfType(wss.a0, 'party_state').find((m) => m.payload.became);
check('3. the 20th active member makes it an alliance: `became: alliance`, on, since',
  becameMsg && becameMsg.payload.became === 'alliance' && pa.ally.on === true && pa.ally.since > 0 && pa.ally.active === 20, { became: becameMsg && becameMsg.payload.became, ally: pa && pa.ally });
let rec = state._store.get('party:' + pid1);
check('3. ...the record is shape 2 and carries `ally` {on, since, name, tag, renamedAt}',
  rec && rec.v === 2 && PARTY.V === 2 && rec.ally && rec.ally.on === true && rec.ally.since > 0 && rec.ally.name === null && rec.ally.tag === null, rec && { v: rec.v, ally: rec.ally });
let row = state._store.get('ally:' + pid1);
check('3. ...and the board\'s row with it: on, 21 members, 20 counting [until, level]',
  row && row.id === pid1 && row.on === true && row.members === 21 && row.act.length === 20 && row.act.every((e) => e[1] === 8 && e[0] > Date.now()), row && { on: row.on, members: row.members, act: row.act.length });
check('2. offline for 8 days does not count', (() => {
  const meta = { x: { level: 9, seen: Date.now() - 8 * 86400000 }, y: { level: 9, seen: Date.now() - 86400000 } };
  const r = allyRowOf('q', { on: true }, ['x', 'y'], meta);
  return allyRowLive(r, Date.now()).active === 1;
})());

// ── 4: naming ──
await cmd(room, wss.a3, 'alliance_name', { name: 'Iron Bros', tag: 'IRN' });
check("4. only the leader names it ('not-leader')", lastErr(wss.a3) && lastErr(wss.a3).reason === 'not-leader', lastErr(wss.a3));
await cmd(room, wss.a0, 'alliance_name', { name: 'Ir', tag: 'IRN' });
check("4. a name of 2 characters is refused ('bad-name')", lastErr(wss.a0) && lastErr(wss.a0).reason === 'bad-name', lastErr(wss.a0));
await cmd(room, wss.a0, 'alliance_name', { name: 'Iron Bros', tag: 'IRON5' });
check("4. a tag of 5 is refused ('bad-tag')", lastErr(wss.a0) && lastErr(wss.a0).reason === 'bad-tag', lastErr(wss.a0));
wss.a5.sent.length = 0;
await cmd(room, wss.a0, 'alliance_name', { name: 'Iron Bros', tag: 'irn' });
pa = lastParty(wss.a0);
check('4. the leader names it: the roster says the name and the tag (upper-cased)', pa && pa.ally.name === 'Iron Bros' && pa.ally.tag === 'IRN' && pa.ally.renameIn > 0, pa && pa.ally);
rec = state._store.get('party:' + pid1);
row = state._store.get('ally:' + pid1);
check('4. ...stored in the record and the row', rec.ally.name === 'Iron Bros' && rec.ally.tag === 'IRN' && rec.ally.renamedAt > 0 && row.name === 'Iron Bros' && row.tag === 'IRN', { rec: rec.ally, row: { name: row.name, tag: row.tag } });
const ses = (id) => { let s = null; for (const [, x] of room.sessions) if (x.id === id) s = x; return s; };
check('4. ...every member wears it, in their state and their session\'s look',
  A.slice(0, 20).every((n) => room.playerState[P(n)].allyTag === 'IRN' && ses(P(n)).data.allyTag === 'IRN') && room.playerState[P('low')].allyTag === 'IRN', A.slice(0, 20).map((n) => room.playerState[P(n)].allyTag));
const upd = msgsOfType(wss.a5, 'player_update').filter((m) => m.data && m.data.allyTag === 'IRN');
const updA1 = upd.find((m) => m.id === P('a1'));
check('4. ...the others are told by player_update, with the build keys the phone resets from it',
  upd.length >= 19 && updA1 && updA1.data.hg === 'tall' && updA1.data.fr === 'broad', { n: upd.length, a1: updA1 && updA1.data });
check('4. ...and not the one it is about', !msgsOfType(wss.a5, 'player_update').some((m) => m.id === P('a5') && m.data && 'allyTag' in m.data));
await cmd(room, wss.a0, 'alliance_name', { name: 'Iron Brothers', tag: 'IRB' });
check("4. a change within a day is refused ('rename-wait', ms left)", lastErr(wss.a0) && lastErr(wss.a0).reason === 'rename-wait' && lastErr(wss.a0).ms > ALLIANCE.RENAME_MS - 60000, lastErr(wss.a0));
/* a new joiner sees the tags in their snapshot */
wss.new1 = fakeWs('new1');
await join(room, wss.new1, P('new1'), 'NEW1', { data: { allyTag: 'FAKE' } });
const snap = wss.new1.sent.find((m) => m.type === 'state_sync');
const snapA2 = snap && snap.players && (Array.isArray(snap.players) ? snap.players.find((q) => q.id === P('a2')) : snap.players[P('a2')]);
check('4. a new joiner\'s snapshot carries a member\'s tag (allyTag)', snapA2 && snapA2.allyTag === 'IRN', snapA2 && snapA2.allyTag);
check('4. ...and a tag a phone sends in its join is not kept', !room.playerState[P('new1')].allyTag && !ses(P('new1')).data.allyTag, { ps: room.playerState[P('new1')].allyTag, data: ses(P('new1')).data.allyTag });
await cmd(room, wss.new1, 'track', { allyTag: 'FAKE', name: 'NEW1' });
check('4. ...nor one in a track', !room.playerState[P('new1')].allyTag && !ses(P('new1')).data.allyTag);

// ── 5: unique across alliances and clans ──
const B = names('b', 20);          /* the second alliance: b0 leads */
for (const n of B) { wss[n] = fakeWs(n); await join(room, wss[n], P(n), n.toUpperCase(), { level: n === 'b0' ? 12 : 9 }); }
await form(room, wss, 'b0', B.slice(1));
let pb = lastParty(wss.b0);
const pid2 = pb && pb.id;
check('5. (a second party of 20 active becomes an alliance)', pb && pb.ally && pb.ally.on === true, pb && pb.ally);
await cmd(room, wss.b0, 'alliance_name', { name: 'Gold Crew', tag: 'IRN' });
check("5. another alliance's tag is taken ('tag-taken')", lastErr(wss.b0) && lastErr(wss.b0).reason === 'tag-taken', lastErr(wss.b0));
await cmd(room, wss.b0, 'alliance_name', { name: 'iron BROS', tag: 'GLD' });
check("5. ...its name, in any case ('name-taken')", lastErr(wss.b0) && lastErr(wss.b0).reason === 'name-taken', lastErr(wss.b0));
/* a clan */
wss.c0 = fakeWs('c0');
await join(room, wss.c0, P('c0'), 'C0');
room.playerState[P('c0')].coins = 5000;
await cmd(room, wss.c0, 'clan_create', { name: 'Gold Crew', tag: 'GOLD' });
await cmd(room, wss.b0, 'alliance_name', { name: 'Gold Crew', tag: 'GLD' });
check("5. a clan's name is taken too", lastErr(wss.b0) && lastErr(wss.b0).reason === 'name-taken', lastErr(wss.b0));
await cmd(room, wss.b0, 'alliance_name', { name: 'Gilded', tag: 'GOLD' });
check("5. ...and a clan's tag", lastErr(wss.b0) && lastErr(wss.b0).reason === 'tag-taken', lastErr(wss.b0));
await cmd(room, wss.b0, 'alliance_name', { name: 'Gilded', tag: 'GLD' });
pb = lastParty(wss.b0);
check('5. a free name and tag are taken', pb && pb.ally.name === 'Gilded' && pb.ally.tag === 'GLD', pb && pb.ally);
wss.c1 = fakeWs('c1');
await join(room, wss.c1, P('c1'), 'C1');
room.playerState[P('c1')].coins = 5000;
await cmd(room, wss.c1, 'clan_create', { name: 'Other', tag: 'GLD' });
check('5. a clan cannot take an alliance\'s tag', !room._clanOf(P('c1')) && (last(wss.c1, 'clan_error') || {}).text === 'Tag [GLD] is taken', last(wss.c1, 'clan_error'));
await cmd(room, wss.c1, 'clan_create', { name: 'gilded', tag: 'ZZ' });
check('5. ...nor its name', !room._clanOf(P('c1')) && (last(wss.c1, 'clan_error') || {}).text === 'Name is taken', last(wss.c1, 'clan_error'));

// ── 9: wars ──
await cmd(room, wss.a3, 'alliance_war', { tag: 'GLD' });
check("9. only the leader declares ('not-leader')", lastErr(wss.a3) && lastErr(wss.a3).reason === 'not-leader', lastErr(wss.a3));
await cmd(room, wss.a0, 'alliance_war', { tag: 'IRN' });
check("9. not on yourself ('self')", lastErr(wss.a0) && lastErr(wss.a0).reason === 'self', lastErr(wss.a0));
await cmd(room, wss.a0, 'alliance_war', { tag: 'NOPE' });
check("9. not on a tag nobody has ('no-such')", lastErr(wss.a0) && lastErr(wss.a0).reason === 'no-such', lastErr(wss.a0));
await cmd(room, wss.a0, 'alliance_war', { tag: 'GOLD' });
check("9. not on a clan ('no-such': wars are between alliances)", lastErr(wss.a0) && lastErr(wss.a0).reason === 'no-such', lastErr(wss.a0));
await cmd(room, wss.a0, 'alliance_war', { tag: 'GLD' });
pa = lastParty(wss.a0); pb = lastParty(wss.b0);
check('9. the leader declares: both sides\' rosters show the war (us, them, 30 minutes)',
  pa && pa.ally.war && pa.ally.war.them.tag === 'GLD' && pa.ally.war.us === 0 && pa.ally.war.endsIn > ALLIANCE.WAR_MS - 5000
    && pb && pb.ally.war && pb.ally.war.them.tag === 'IRN', { a: pa && pa.ally.war, b: pb && pb.ally.war });
const warKey = [...state._store.keys()].find((k) => k.startsWith('ally_war:'));
let war = warKey && state._store.get(warKey);
check('9. ...stored, with the rosters frozen (21 and 20 members)', war && war.status === 'active' && war.a.members.length === 21 && war.b.members.length === 20, war && { a: war.a.members.length, b: war.b.members.length });
await cmd(room, wss.b0, 'alliance_war', { tag: 'IRN' });
check("9. one war at a time ('at-war')", lastErr(wss.b0) && lastErr(wss.b0).reason === 'at-war', lastErr(wss.b0));
await form(room, wss, 'a0', ['a21']);    /* joins after the declaration */
const kill = (victim, killer, nml) => {
  const ps = room.playerState[P(victim)];
  ps.dying = false; ps.dead = false;
  if (nml) { ps._nmlLastHitBy = P(killer); ps._nmlLastHitAt = Date.now(); } else { ps._nmlLastHitBy = null; }
  room._handlePlayerDeath(ps, P(victim), 'pvp:' + P(killer));
};
kill('b3', 'a2', true);
war = room._allyWarOf(pid1);
check('9. a kill under No man\'s land\'s rule scores for the killer\'s side', war && war.a.score === 1 && war.b.score === 0, war && [war.a.score, war.b.score]);
check('9. ...and both of them fought', war.a.fought.includes(P('a2')) && war.b.fought.includes(P('b3')), { a: war.a.fought, b: war.b.fought });
kill('b4', 'a2', false);
check('9. a kill not under the rule (no last blow through it) does not score', war.a.score === 1, war.a.score);
kill('b5', 'a21', true);
check('9. a kill by a member who joined after the declaration does not score', war.a.score === 1 && !war.a.fought.includes(P('a21')), war.a.score);
kill('a6', 'b6', true);
kill('a7', 'b6', true);
check('9. the other side scores the same way (2 for GLD)', war.b.score === 2 && war.b.fought.includes(P('b6')), war.b.score);
const msgKill = msgsOfType(wss.a0, 'party_state').filter((m) => m.payload.war === 'kill');
check('9. ...each kill re-sends both rosters (war: kill)', msgKill.length >= 3, msgKill.length);
/* a fighter who leaves before the end is not paid */
await cmd(room, wss.a7, 'party_leave');
const coins0 = Object.fromEntries([...A, ...B].map((n) => [n, room.playerState[P(n)] ? room.playerState[P(n)].coins || 0 : 0]));
war.endTime = Date.now() - 1;
room._tickAllyWars(Date.now());
await flush(20);
const gain = (n) => (room.playerState[P(n)].coins || 0) - coins0[n];
check('9. at the end the winner\'s fighters get 500 (b6)', gain('b6') === ALLIANCE.REWARD_WIN, gain('b6'));
check('9. ...the loser\'s fighters 50 (a2, a6)', gain('a2') === ALLIANCE.REWARD_LOSE && gain('a6') === ALLIANCE.REWARD_LOSE, [gain('a2'), gain('a6')]);
check('9. ...a fighter who left the party nothing (a7)', gain('a7') === 0, gain('a7'));
check('9. ...the ones who never fought nothing (a3, b9); a winner who was only killed fought too (b3: 500)',
  gain('a3') === 0 && gain('b9') === 0 && gain('b3') === ALLIANCE.REWARD_WIN, [gain('a3'), gain('b9'), gain('b3')]);
const endA2 = last(wss.a2, 'alliance_war_end'), endB6 = last(wss.b6, 'alliance_war_end'), endA3 = last(wss.a3, 'alliance_war_end');
check('9. ...each member online is told: won, the score, who, what it paid them',
  endB6 && endB6.won === true && endB6.us === 2 && endB6.them === 1 && endB6.vs === 'IRN' && endB6.paid === 500
    && endA2 && endA2.won === false && endA2.paid === 50 && endA3 && endA3.paid === 0, { endB6, endA2, endA3 });
war = state._store.get(warKey);
check('9. ...the war stored as ended, with whom it paid', war && war.status === 'ended' && war.paid && war.paid.b.includes(P('b6')), war && { status: war.status, paid: war.paid });
pa = lastParty(wss.a0);
check('9. ...the roster no longer shows a war, and says the hour\'s rest', pa && !pa.ally.war && pa.ally.warIn > ALLIANCE.WAR_COOLDOWN - 60000, pa && pa.ally);
await cmd(room, wss.b0, 'alliance_war', { tag: 'IRN' });
check("9. an hour's rest after a war ('rest')", lastErr(wss.b0) && lastErr(wss.b0).reason === 'rest' && lastErr(wss.b0).ms > 0, lastErr(wss.b0));
/* a 0-0 war pays nobody */
room._allyEnds.clear();
await cmd(room, wss.b0, 'alliance_war', { tag: 'IRN' });
const w2 = room._allyWarOf(pid2);
check('9. (a second war, once rested)', !!w2, lastErr(wss.b0));
const coins1 = Object.fromEntries([...A, ...B].map((n) => [n, room.playerState[P(n)] ? room.playerState[P(n)].coins || 0 : 0]));
if (w2) w2.endTime = Date.now() - 1;
room._tickAllyWars(Date.now());
await flush(20);
check('9. a 0-0 war pays nobody', [...A, ...B].every((n) => !room.playerState[P(n)] || (room.playerState[P(n)].coins || 0) === coins1[n]));

// ── 8: the board ──
/* IRN: a0..a21 but a7 (left), and low: 20 active at level 8 (160);
   GLD: 20 active, b0 at 12 and 19 at 9 (183) -- a tie, settled by levels */
wss.low.sent.length = 0;
await cmd(room, wss.low, 'alliance_board');
let board = last(wss.low, 'alliance_rows');
check('8. the board: both alliances; 20 active each, so by their levels added up (GLD 183, IRN 160)',
  board && board.rows.length === 2 && board.rows[0].tag === 'GLD' && board.rows[0].total === 183 && board.rows[1].tag === 'IRN'
    && board.rows[1].active === 20 && board.rows[1].total === 160 && board.n === 2, board);
check('8. ...yours, with its rank (low is in IRN: not counted, but in it)', board && board.mine && board.mine.rank === 2 && board.mine.tag === 'IRN', board && board.mine);
check('8. ...no ids on the wire', board && board.rows.every((r) => !('id' in r)));
await cmd(room, wss.low, 'alliance_board');
check('8. one answer every 5 s a player', msgsOfType(wss.low, 'alliance_rows').length === 1, msgsOfType(wss.low, 'alliance_rows').length);
/* active members first: a7 back makes IRN 21 active, first with fewer levels (168) */
await cmd(room, wss.a0, 'party_invite', { target: P('a7') });
await cmd(room, wss.a7, 'party_accept', { target: P('a0') });
ses(P('low'))._allyBoardAt = 0;
await cmd(room, wss.low, 'alliance_board');
board = last(wss.low, 'alliance_rows');
check('8. more active members ranks first, whatever the levels (IRN 21 / 168 over GLD 20 / 183)',
  board && board.rows[0].tag === 'IRN' && board.rows[0].active === 21 && board.rows[0].total === 168 && board.mine.rank === 1, board && board.rows);
await cmd(room, wss.a7, 'party_leave');
/* drop IRN to 18 active */
await cmd(room, wss.a20, 'party_leave');
await cmd(room, wss.a21, 'party_leave');
await cmd(room, wss.a19, 'party_leave');   /* IRN: a0..a18 minus a7 = 18 active */
ses(P('b0'))._allyBoardAt = 0;
await cmd(room, wss.b0, 'alliance_board');
board = last(wss.b0, 'alliance_rows');
check('8. GLD (20 active) above IRN (18) now', board && board.rows[0].tag === 'GLD' && board.rows[1].tag === 'IRN' && board.mine.rank === 1, board && board.rows);

// ── 6: hysteresis ──
pa = lastParty(wss.a0);
check('6. 18 active is still an alliance (it stays one down to 15)', pa && pa.ally.on === true && pa.ally.active === 18, pa && pa.ally);
check('6. leaving takes your tag off (a19), and the others are told (allyTag null)',
  !room.playerState[P('a19')].allyTag && msgsOfType(wss.b1, 'player_update').some((m) => m.id === P('a19') && m.data && m.data.allyTag === null), room.playerState[P('a19')].allyTag);
for (const n of ['a18', 'a17', 'a16']) await cmd(room, wss[n], 'party_leave');
pa = lastParty(wss.a0);
check('6. at 15 it stays', pa && pa.ally.on === true && pa.ally.active === 15, pa && pa.ally);
wss.a0.sent.length = 0;
await cmd(room, wss.a15, 'party_leave');
pa = lastParty(wss.a0);
check('6. below 15 it is a party again (became: party), its name kept', pa && pa.ally.on === false && pa.ally.tag === 'IRN' && msgsOfType(wss.a0, 'party_state').some((m) => m.payload.became === 'party'), pa && pa.ally);
check('6. ...and every member\'s tag comes off', A.slice(0, 15).every((n) => !room.playerState[P(n)].allyTag), A.slice(0, 15).map((n) => room.playerState[P(n)].allyTag));
await cmd(room, wss.a0, 'alliance_name', { name: 'New Name', tag: 'NEW' });
check("6. ...and it cannot be renamed ('not-alliance')", lastErr(wss.a0) && lastErr(wss.a0).reason === 'not-alliance', lastErr(wss.a0));
await cmd(room, wss.b0, 'alliance_name', { name: 'Taker', tag: 'IRN' });
check('5. a fallen alliance\'s tag stays its own while the party lasts', lastErr(wss.b0) && (lastErr(wss.b0).reason === 'tag-taken' || lastErr(wss.b0).reason === 'rename-wait'), lastErr(wss.b0));
/* back to 20: a15..a20 (a7 and a21 are out) */
for (const n of ['a15', 'a16', 'a17', 'a18', 'a19', 'a20']) {
  await cmd(room, wss.a0, 'party_invite', { target: P(n) });
  await cmd(room, wss[n], 'party_accept', { target: P('a0') });
}
pa = lastParty(wss.a0);
check('6. back to 20 active, an alliance again, the tags back on', pa && pa.ally.on === true && room.playerState[P('a15')].allyTag === 'IRN', pa && pa.ally);

// ── 7: a deploy ──
for (const [k, ws] of Object.entries(wss)) await close(room, ws);
const room2 = new GameRoom(state, mockEnv);
const w2s = {};
w2s.b3 = fakeWs('b3x');
await join(room2, w2s.b3, P('b3'), 'B3', { level: 9 });
const syncB = w2s.b3.sent.find((m) => m.type === 'state_sync');
let pb2 = lastParty(w2s.b3);
check('7. after a deploy the alliance is read back: on, its name and tag', pb2 && pb2.ally && pb2.ally.on === true && pb2.ally.tag === 'GLD' && pb2.ally.name === 'Gilded', pb2 && pb2.ally);
check('7. ...the joiner wears its tag again', room2.playerState[P('b3')].allyTag === 'GLD', room2.playerState[P('b3')].allyTag);
w2s.x = fakeWs('x');
await join(room2, w2s.x, P('x'), 'X');
w2s.b4 = fakeWs('b4x');
await join(room2, w2s.b4, P('b4'), 'B4', { level: 9 });
check('7. ...and a member joining later is told to everyone (player_update allyTag)', msgsOfType(w2s.x, 'player_update').some((m) => m.id === P('b4') && m.data && m.data.allyTag === 'GLD'));
/* a war on an alliance nobody is on (IRN): the rest first, then its roster
   from its stored record */
w2s.b0 = fakeWs('b0x');
await join(room2, w2s.b0, P('b0'), 'B0', { level: 12 });
await cmd(room2, w2s.b0, 'alliance_war', { tag: 'IRN' });
check("7. the hour's rest outlives a deploy (read back from the ended wars)", lastErr(w2s.b0) && lastErr(w2s.b0).reason === 'rest', lastErr(w2s.b0));
room2._allyEnds.clear();
await cmd(room2, w2s.b0, 'alliance_war', { tag: 'IRN' });
const w3 = room2._allyWarOf(pid2);
const irnRec = state._store.get('party:' + pid1);
check('7. a war on an alliance nobody is on takes its roster from its stored record',
  w3 && w3.b.pid === pid1 && w3.b.tag === 'IRN' && w3.b.members.length === irnRec.members.length && w3.a.members.length === 20, w3 && { b: w3.b.members.length, rec: irnRec.members.length });
if (w3) { room2._allyWars.delete(w3.id); }
/* the board after a deploy: IRN has nobody on, counted from its row */
await cmd(room2, w2s.x, 'alliance_board');
board = last(w2s.x, 'alliance_rows');
check('8. after a deploy, an alliance nobody is on is counted from its row (IRN 20)', board && board.rows.some((r) => r.tag === 'IRN' && r.active === 20) && board.mine === null, board);
/* stale: everyone of IRN last seen 8 days ago */
{
  const rowI = state._store.get('ally:' + pid1);
  const st3 = makeState([...state._store.entries()]);
  const r3 = st3._store.get('ally:' + pid1);
  r3.act = r3.act.map((e) => [Date.now() - 86400000, e[1]]);
  st3._store.set('ally:' + pid1, r3);
  const room3 = new GameRoom(st3, mockEnv);
  const wy = fakeWs('y');
  await join(room3, wy, P('y'), 'Y');
  await cmd(room3, wy, 'alliance_board');
  const b3 = last(wy, 'alliance_rows');
  check('8. an alliance whose members all stopped playing falls off the board', b3 && !b3.rows.some((r) => r.tag === 'IRN') && b3.rows.some((r) => r.tag === 'GLD'), b3 && b3.rows);
  check('8. (guard: its row was there)', rowI && rowI.tag === 'IRN');
}

// ── 10: a party that ends frees its name ──
{
  const st4 = makeState([['liveflags', { clanparty: false }]]);   /* v2.3.3321: a clan is made below */
  const r4 = new GameRoom(st4, mockEnv);
  const w4 = {};
  const C = names('d', 20);
  for (const n of C) { w4[n] = fakeWs(n); await join(r4, w4[n], P(n), n.toUpperCase(), { level: 7 }); }
  await form(r4, w4, 'd0', C.slice(1));
  await cmd(r4, w4.d0, 'alliance_name', { name: 'Short Lived', tag: 'SL' });
  const pd = lastParty(w4.d0);
  check('10. (an alliance named SL)', pd && pd.ally.tag === 'SL', pd && pd.ally);
  for (const n of C.slice(1)) await cmd(r4, w4[n], 'party_leave');
  check('10. a party down to one deletes its row: the name and tag are free', !st4._store.has('ally:' + pd.id) && !st4._store.has('party:' + pd.id) && !r4._allyIndex.has(pd.id));
  check('10. ...and the last one\'s tag is off', !r4.playerState[P('d0')].allyTag);
  w4.e0 = fakeWs('e0');
  await join(r4, w4.e0, P('e0'), 'E0');
  r4.playerState[P('e0')].coins = 5000;
  await cmd(r4, w4.e0, 'clan_create', { name: 'Short Lived', tag: 'SL' });
  check('10. ...a clan may take them now', !!r4._clanOf(P('e0')), last(w4.e0, 'clan_error'));
}

// ── 11: the kill switch ──
{
  const st5 = makeState([['liveflags', { alliance: false }]]);
  const r5 = new GameRoom(st5, mockEnv);
  const w5 = {};
  for (const n of ['f0', 'f1']) { w5[n] = fakeWs(n); await join(r5, w5[n], P(n), n.toUpperCase(), { level: 9 }); }
  const sy = w5.f0.sent.find((m) => m.type === 'state_sync');
  check('11. alliance: false un-advertises caps.alliance', sy && sy.caps && sy.caps.alliance === false, sy && sy.caps && sy.caps.alliance);
  await form(r5, w5, 'f0', ['f1']);
  const pf = lastParty(w5.f0);
  check('11. ...the roster carries no `ally`', pf && pf.id && !('ally' in pf), pf);
  for (const t of ['alliance_name', 'alliance_war', 'alliance_board']) {
    await cmd(r5, w5.f0, t, { name: 'Abc', tag: 'AB' });
    check(`11. ...${t} is answered 'off'`, lastErr(w5.f0) && lastErr(w5.f0).reason === 'off', lastErr(w5.f0));
    w5.f0.sent.length = 0;
  }
  const st6 = makeState([['liveflags', { partykeep: false }]]);
  const r6 = new GameRoom(st6, mockEnv);
  const w6 = fakeWs('g0');
  await join(r6, w6, P('g0'), 'G0');
  await cmd(r6, w6, 'alliance_board');
  check("11. partykeep: false turns it off too ('off')", lastErr(w6) && lastErr(w6).reason === 'off', lastErr(w6));
}
/* thrown at runtime: the tags come off at the next vitals echo */
{
  const st7 = makeState();
  const r7 = new GameRoom(st7, mockEnv);
  const w7 = {};
  const C = names('h', 20);
  for (const n of C) { w7[n] = fakeWs(n); await join(r7, w7[n], P(n), n.toUpperCase(), { level: 7 }); }
  await form(r7, w7, 'h0', C.slice(1));
  await cmd(r7, w7.h0, 'alliance_name', { name: 'Switch', tag: 'SW' });
  check('11. (an alliance named SW, tags on)', r7.playerState[P('h3')].allyTag === 'SW');
  r7._liveFlags = { alliance: false };
  r7._tickParties(Date.now() + PARTY.VITALS_MS + 10);
  check('11. thrown at runtime, every tag comes off at the next vitals echo', C.every((n) => !r7.playerState[P(n)].allyTag), C.map((n) => r7.playerState[P(n)].allyTag));
  check('11. ...and the record keeps its alliance for when it is back', st7._store.get('party:' + r7._partyOf(P('h0')).id).ally.tag === 'SW');
  r7._liveFlags = {};
  r7._tickParties(Date.now() + 2 * PARTY.VITALS_MS + 20);
  check('11. switched back, the tags come back', C.every((n) => r7.playerState[P(n)].allyTag === 'SW'));
}

// ── 12: names ──
check('12. hidden and direction characters are stripped from a name', allyName('Iron‮​Bros') === 'IronBros', allyName('Iron‮​Bros'));
check('12. runs of spaces fold, the ends are trimmed', allyName('  Iron    Bros  ') === 'Iron Bros');
check('12. 3 to 16 characters', allyName('abc') === 'abc' && allyName('ab') === null && allyName('a'.repeat(16)) === 'a'.repeat(16) && allyName('a'.repeat(17)) === null);
check('12. tags: 1-4 letters or numbers, upper-cased', allyTagOk('ab1') === 'AB1' && allyTagOk('ABCDE') === null && allyTagOk('A B') === null && allyTagOk('') === null && allyTagOk(7) === null);
check('12. a stored `ally` read back keeps only what is valid', (() => {
  const c = cleanAlly({ on: 1, since: '5', name: 'x', tag: 'toolong', renamedAt: 'no', extra: 1 });
  return c.on === true && c.since === 5 && c.name === null && c.tag === null && c.renamedAt === 0 && !('extra' in c);
})());

// ── 13: what a newer or broken record does ──
{
  const st8 = makeState([
    ['ally:pnew', { v: ALLIANCE.ROW_V + 1, id: 'pnew', on: true, name: 'Future Folk', tag: 'FUT', act: [[Date.now() + 1e9, 50]] }],
    ['ally_war:wbad', { id: 'wbad', status: 'active', a: { pid: 'x' }, b: null }],
    ['ally_war:wnew', { v: ALLIANCE.WAR_V + 1, id: 'wnew', status: 'active', a: {}, b: {} }],
  ]);
  const r8 = new GameRoom(st8, mockEnv);
  await r8._allyEnsure();
  check('13. a newer worker\'s row keeps its name and tag taken', r8._allyTaken('Other', 'FUT', null) === 'tag' && r8._allyTaken('future folk', 'ZZ', null) === 'name');
  check('13. ...and is off the board until it is back', r8._allyIndex.get('pnew').on === false && r8._allyIndex.get('pnew').act.length === 0);
  check('13. a broken war record is deleted, a newer one left whole and unread',
    !st8._store.has('ally_war:wbad') && st8._store.has('ally_war:wnew') && !r8._allyWars.has('wnew') && !r8._allyWars.has('wbad'));
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
