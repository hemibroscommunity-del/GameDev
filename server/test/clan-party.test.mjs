/* v2.3.3320: CLANS BECOME PARTIES (clanparty.js; docs/specs/alliance.md
 * "Step 3: clans become parties").
 *
 *   1. The first join after the deploy turns every clan into a stored party:
 *      its members in no party yet, its leader leading (else its oldest free
 *      member), its name and tag kept as a former clan's (`ally.clan`); the
 *      clan's records gone in the same run.
 *   2. Names from the room, else the stored character, else 'Bro'.
 *   3. A clan left with fewer than two free members is no party: its records
 *      go and its name and tag are free.  A member in a party keeps theirs.
 *   4. The tag: worn below 20 (the owner's third decision), on the joiner, on
 *      a member who joins later, on every other phone (player_update).
 *   5. No new clans: create, accept and war refused; a clan invite not relayed.
 *   6. The name and tag stay reserved (_allyTaken); a rename waits for 20.
 *   7. A clan at war waits for the war's end, then converts -- no `clan:`
 *      record brought back by the war's own writes.
 *   8. A deploy reads the former clan back, tag and all.
 *   9. Twenty active make it an alliance (clan mark and tag kept); below 15 it
 *      is a party again and still wears the tag.
 *  10. The kill switch (`clanparty: false`), `partykeep: false`, and the switch
 *      turned on at runtime.
 */
import { GameRoom } from '../src/index.js';
import { PARTY } from '../src/party.js';
import { ALLIANCE } from '../src/alliance.js';
import { CLAN_PARTY } from '../src/clanparty.js';

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
const flush = async (n = 1) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const P = (n) => 'bp_cp_' + n;
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(room, ws, id, name, opts) {
  const o = opts || {};
  room.sessions.set(ws, baseSession());
  const data = Object.assign({ x: 0, y: 0, z: 'town' }, o.data || {});
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: name || 'T', phrase: 'p-' + id, data }));
  await flush();
  if (o.level !== undefined && room.playerState[id]) room.playerState[id].level = o.level;
}
const cmd = async (room, ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await flush(); };
const close = async (room, ws) => { await room.webSocketClose(ws); await flush(); };
const names = (pre, n) => Array.from({ length: n }, (_, i) => pre + i);

const DAY = 86400000;
const t0 = Date.now();
function clanSeed(id, name, tag, leader, members, extra) {
  const out = [['clan:' + id, Object.assign({ id, name, tag, color1: '#a78bfa', color2: '#5b52ff', logo: null, leaderId: P(leader), members: members.map(P), createdAt: t0 - 3 * DAY }, extra || {})]];
  for (const m of members) out.push(['clan_by_player:' + P(m), id]);
  return out;
}
function partySeed(id, leader, members) {
  const meta = {};
  for (const m of members) meta[P(m)] = { name: m.toUpperCase(), level: 6, at: t0 - DAY, seen: t0 - DAY };
  const out = [['party:' + id, { v: 1, id, leader: P(leader), members: members.map(P), meta, ts: t0 - DAY }]];
  for (const m of members) out.push(['party_by_player:' + P(m), id]);
  return out;
}

// ── 1-4: the first join turns every clan into a party ──
const WAR_ID = 'war-1';
const state = makeState([
  ...clanSeed('cA', 'Gold Crew', 'GOLD', 'a0', names('a', 5)),
  ...clanSeed('cB', 'Blue Note', 'BLUE', 'b0', ['b0', 'b1']),
  ...clanSeed('cC', 'Lone Wolf', 'SOLO', 'c0', ['c0']),
  ...clanSeed('cE', 'East Side', 'EAST', 'e0', ['e0', 'e1', 'e2']),
  /* a leader who is not the oldest member leads the party too */
  ...clanSeed('cH', 'Hill Gang', 'HILL', 'h2', ['h0', 'h1', 'h2']),
  ...clanSeed('cW1', 'War One', 'WAR1', 'w0', ['w0', 'w1'], { lastWarEnd: 0 }),
  ...clanSeed('cW2', 'War Two', 'WAR2', 'v0', ['v0', 'v1'], { lastWarEnd: 0 }),
  /* b1 and e0 are in parties already (the parties keep them) */
  ...partySeed('pX', 'x0', ['x0', 'b1']),
  ...partySeed('pY', 'y0', ['y0', 'e0']),
  /* an offline member's name comes from their character */
  ['char:' + P('a3'), { name: 'Ann Three', look: { sc: '#c08050' }, createdAt: t0 - 9 * DAY }],
  /* two clans at war, not over yet */
  ['clan_war:' + WAR_ID, { id: WAR_ID, zone: 'meadow', status: 'active', startTime: t0 - 60000, endTime: t0 + 20 * 60000,
    challenger: { clanId: 'cW1', tag: 'WAR1', name: 'War One', score: 1, members: [P('w0'), P('w1')], fought: [P('w0')] },
    defender: { clanId: 'cW2', tag: 'WAR2', name: 'War Two', score: 0, members: [P('v0'), P('v1')], fought: [P('v0')] },
    killLog: [] }],
]);
const room = new GameRoom(state, mockEnv);
const wss = {};
wss.a0 = fakeWs('a0');
await join(room, wss.a0, P('a0'), 'Alpha', { level: 8 });
await flush(3);

const pA = room._partyOf(P('a0'));
check('1. the clan\'s leader is in a party after their join', !!pA, null);
check('1. ...every member of the clan, its leader leading', pA && pA.members.length === 5 && names('a', 5).every((n) => pA.members.includes(P(n))) && pA.leader === P('a0'), pA && { members: pA.members, leader: pA.leader });
check('1. ...carrying the clan\'s name and tag as a former clan\'s', pA && pA.ally && pA.ally.clan === 1 && pA.ally.name === 'Gold Crew' && pA.ally.tag === 'GOLD' && pA.ally.on === false, pA && pA.ally);
const recA = pA && state._store.get('party:' + pA.id);
check('1. ...stored, shape 2, with `clan`', recA && recA.v === PARTY.V && recA.ally && recA.ally.clan === 1 && recA.ally.tag === 'GOLD', recA && { v: recA.v, ally: recA.ally });
check('1. ...every member indexed to it', pA && names('a', 5).every((n) => state._store.get('party_by_player:' + P(n)) === pA.id));
check('1. ...and its board row written (its name reserved)', pA && state._store.get('ally:' + pA.id) && state._store.get('ally:' + pA.id).tag === 'GOLD' && state._store.get('ally:' + pA.id).on === false, pA && state._store.get('ally:' + pA.id));
check('1. the clan\'s records are gone', !state._store.has('clan:cA') && names('a', 5).every((n) => !state._store.has('clan_by_player:' + P(n))) && !room._clans.has('cA'));
check('2. names: the one here from the room, an offline one from their character, else Bro',
  pA && pA.meta[P('a0')].name === 'Alpha' && pA.meta[P('a3')].name === 'Ann Three' && pA.meta[P('a1')].name === 'Bro', pA && Object.fromEntries(pA.members.map((m) => [m, pA.meta[m].name])));
check('2. ...the one here counts from now, the rest from their next join (seen 0)', pA && pA.meta[P('a0')].seen > 0 && pA.meta[P('a1')].seen === 0, pA && { a0: pA.meta[P('a0')].seen, a1: pA.meta[P('a1')].seen });

check('3. a clan left with one free member is no party (b1 is in a party already)', !room._partyOf(P('b0')) && !state._store.has('party_by_player:' + P('b0')));
check('3. ...b1 keeps the party they were in', state._store.get('party_by_player:' + P('b1')) === 'pX' && (state._store.get('party:pX') || {}).members.length === 2);
check('3. ...and the clan\'s records are gone, its name and tag free', !state._store.has('clan:cB') && !state._store.has('clan_by_player:' + P('b0')) && !state._store.has('clan_by_player:' + P('b1')) && room._allyTaken('Blue Note', 'BLUE', null) === null);
check('3. a clan of one: its records gone, no party', !state._store.has('clan:cC') && !state._store.has('clan_by_player:' + P('c0')) && !state._store.has('party_by_player:' + P('c0')));
const eId = state._store.get('party_by_player:' + P('e1'));
const recE = eId && state._store.get('party:' + eId);
check('3. a clan whose leader is in another party: the rest form one, its oldest free member leading',
  recE && recE.members.length === 2 && recE.members.includes(P('e1')) && recE.members.includes(P('e2')) && recE.leader === P('e1') && recE.ally && recE.ally.tag === 'EAST'
  && state._store.get('party_by_player:' + P('e0')) === 'pY', recE);

const recH = state._store.get('party:' + state._store.get('party_by_player:' + P('h0')));
check('1. the clan\'s leader leads, oldest member or not', recH && recH.leader === P('h2') && recH.members.length === 3, recH && recH.leader);
check('4. the joiner wears the tag (state and session)', room.playerState[P('a0')].allyTag === 'GOLD'
  && [...room.sessions.values()].find((s) => s.id === P('a0')).data.allyTag === 'GOLD', room.playerState[P('a0')].allyTag);
const ps0 = msgsOfType(wss.a0, 'party_state').map((m) => m.payload);
check('4. ...and was told: party_state with the former clan\'s block', ps0.some((x) => x.state === 'open' && x.ally && x.ally.clan === 1 && x.ally.tag === 'GOLD' && x.ally.name === 'Gold Crew'), ps0.map((x) => x.ally));
check('4. ...the conversion said so (`fromClan`)', ps0.some((x) => x.fromClan === 1), ps0.map((x) => x.fromClan));
const sync0 = msgsOfType(wss.a0, 'state_sync').pop();   /* caps ride the message itself */
check('5. caps.clanparty', sync0 && sync0.caps && sync0.caps.clanparty === true, sync0 && sync0.caps && sync0.caps.clanparty);
check('7. the clans at war are still clans', room._clans.has('cW1') && room._clans.has('cW2') && state._store.has('clan:cW1') && state._store.has('clan:cW2'));

// ── 4: a member who joins later, and the others' screens ──
wss.z0 = fakeWs('z0');
await join(room, wss.z0, P('z0'), 'Zed', { level: 4 });
wss.a1 = fakeWs('a1');
await join(room, wss.a1, P('a1'), 'Abe', { level: 8 });
await flush(2);
check('4. a member joining later is in the party, wearing the tag', room._partyOf(P('a1')) === pA && room.playerState[P('a1')].allyTag === 'GOLD', room.playerState[P('a1')] && room.playerState[P('a1')].allyTag);
check('4. ...their party window says so', (() => { const x = last(wss.a1, 'party_state'); return x && x.ally && x.ally.tag === 'GOLD' && x.ally.clan === 1; })(), last(wss.a1, 'party_state'));
check('4. ...and another phone is told their tag', msgsOfType(wss.z0, 'player_update').some((m) => m.id === P('a1') && m.data && m.data.allyTag === 'GOLD'));
check('2. ...their name and level written at their join', pA.meta[P('a1')].name === 'Abe' && pA.meta[P('a1')].seen > 0, pA.meta[P('a1')]);

// ── 5: no new clans ──
const coins0 = room.playerState[P('z0')].coins;
room.playerState[P('z0')].coins = 5000;
await cmd(room, wss.z0, 'clan_create', { name: 'New Clan', tag: 'NEWC' });
check('5. clan_create is refused ("Clans are parties now")', (last(wss.z0, 'clan_error') || {}).text === CLAN_PARTY.REFUSE && !room._clanOf(P('z0')), last(wss.z0, 'clan_error'));
check('5. ...before anything is charged', room.playerState[P('z0')].coins === 5000, { before: coins0, now: room.playerState[P('z0')].coins });
await cmd(room, wss.z0, 'clan_join_accept', { inviter: P('a0') });
check('5. clan_join_accept is refused', (last(wss.z0, 'clan_error') || {}).text === CLAN_PARTY.REFUSE);
await cmd(room, wss.a0, 'clan_war_declare', { defenderTag: 'WAR1', zone: 'meadow' });
check('5. clan_war_declare is refused', (last(wss.a0, 'clan_error') || {}).text === CLAN_PARTY.REFUSE);
/* a relay waits in the event buffer for the room's next tick */
const relayed = () => room.eventBuffer.filter((e) => e && e.type === 'clan_invite').length;
const zBefore = relayed();
await cmd(room, wss.a0, 'clan_invite', { target: P('z0'), clanTag: 'GOLD', clanName: 'Gold Crew' });
check('5. a clan invite is not relayed', relayed() === zBefore, relayed());

// ── 6: reserved, and renamed only as an alliance ──
check('6. the former clan\'s name and tag stay reserved', room._allyTaken('gold crew', null, null) === 'name' && room._allyTaken(null, 'GOLD', null) === 'tag');
await cmd(room, wss.a0, 'alliance_name', { name: 'Gold Rush', tag: 'GR' });
check('6. a rename below 20 is refused (as any party\'s)', (last(wss.a0, 'alliance_error') || {}).reason === 'not-alliance' && pA.ally.tag === 'GOLD', last(wss.a0, 'alliance_error'));

// ── 7: a war's clans convert at its end ──
const war = room._clanWars.get(WAR_ID);
check('7. (setup) the war is live in the room', !!war && war.status === 'active');
war.endTime = Date.now() - 1000;
await room._clansEnsure();          /* the lazy resolve, as any wake does */
await flush(12);
const w0p = state._store.get('party_by_player:' + P('w0'));
const v0p = state._store.get('party_by_player:' + P('v0'));
check('7. after the war, both clans are parties', !!w0p && !!v0p && w0p !== v0p
  && (state._store.get('party:' + w0p) || {}).ally && state._store.get('party:' + w0p).ally.tag === 'WAR1'
  && (state._store.get('party:' + v0p) || {}).ally && state._store.get('party:' + v0p).ally.tag === 'WAR2', { w0p, v0p });
check('7. ...and their clan records are gone for good (the war\'s own writes came first)', !state._store.has('clan:cW1') && !state._store.has('clan:cW2') && !room._clans.has('cW1') && !room._clans.has('cW2'));
check('7. ...the war itself still settled (its record ended)', (state._store.get('clan_war:' + WAR_ID) || {}).status === 'ended');

// ── 8: a deploy ──
await close(room, wss.a0); await close(room, wss.a1); await close(room, wss.z0);
const room2 = new GameRoom(state, mockEnv);
const w2 = { a2: fakeWs('a2'), q0: fakeWs('q0') };
await join(room2, w2.q0, P('q0'), 'Quin', { level: 5 });
await join(room2, w2.a2, P('a2'), 'Ada', { level: 9 });
await flush(2);
const pA2 = room2._partyOf(P('a2'));
check('8. a deploy: a member\'s join reads the former clan back', !!pA2 && pA2.id === pA.id && pA2.ally && pA2.ally.clan === 1 && pA2.ally.tag === 'GOLD', pA2 && pA2.ally);
check('8. ...and they wear its tag, told to the others', room2.playerState[P('a2')].allyTag === 'GOLD' && msgsOfType(w2.q0, 'player_update').some((m) => m.id === P('a2') && m.data && m.data.allyTag === 'GOLD'));
check('8. ...no clan comes back', !(room2._clans && room2._clans.size), room2._clans && [...room2._clans.keys()]);

// ── 9: twenty active make it an alliance, and the tag stays below 15 ──
{
  const G = names('g', 22);
  const st9 = makeState([...clanSeed('cBig', 'Big Clan', 'BIG', 'g0', G)]);
  const r9 = new GameRoom(st9, mockEnv);
  const w9 = {};
  for (const n of G) { w9[n] = fakeWs(n); await join(r9, w9[n], P(n), n.toUpperCase(), { level: 8 }); }
  const p9 = r9._partyOf(P('g0'));
  check('9. (setup) the big clan is a party of 22', !!p9 && p9.members.length === 22, p9 && p9.members.length);
  const flip = r9._allyCheck(p9, Date.now());
  check('9. twenty active make it an alliance', (flip === 'alliance' || (p9.ally && p9.ally.on)) && p9.ally.on === true, { flip, ally: p9.ally });
  check('9. ...still a former clan, with its name and tag', p9.ally.clan === 1 && p9.ally.tag === 'BIG' && p9.ally.name === 'Big Clan');
  for (const n of G.slice(14)) await cmd(r9, w9[n], 'party_leave', {});
  const flip2 = r9._allyCheck(p9, Date.now());
  check('9. under 15 it is a party again', p9.ally.on === false && p9.members.length === 14, { flip2, on: p9.ally.on, n: p9.members.length });
  check('9. ...and its members still wear the tag (the owner\'s "keep theirs below 20")', r9.playerState[P('g0')].allyTag === 'BIG' && r9.playerState[P('g13')].allyTag === 'BIG', r9.playerState[P('g0')].allyTag);
  check('9. ...one who left wears none', !r9.playerState[P('g20')].allyTag, r9.playerState[P('g20')].allyTag);
}

// ── 10: the kill switch, partykeep, and the switch turned on ──
{
  const st10 = makeState([['liveflags', { clanparty: false }], ...clanSeed('cK', 'Kept Clan', 'KEPT', 'k0', ['k0', 'k1'])]);
  const r10 = new GameRoom(st10, mockEnv);
  const w10 = { k0: fakeWs('k0'), n0: fakeWs('n0') };
  await join(r10, w10.k0, P('k0'), 'Kay', { level: 8 });
  check('10. clanparty: false -- the clan stays a clan', !!r10._clanOf(P('k0')) && st10._store.has('clan:cK') && !r10._partyOf(P('k0')));
  const s10 = msgsOfType(w10.k0, 'state_sync').pop();
  check('10. ...caps.clanparty is off', s10 && s10.caps && s10.caps.clanparty === false, s10 && s10.caps && s10.caps.clanparty);
  await join(r10, w10.n0, P('n0'), 'Neo', { level: 8 });
  r10.playerState[P('n0')].coins = 2000;
  await cmd(r10, w10.n0, 'clan_create', { name: 'Fresh Clan', tag: 'FRSH' });
  check('10. ...and a clan can be made, as before', !!r10._clanOf(P('n0')) && r10.playerState[P('n0')].coins === 1500, last(w10.n0, 'clan_error'));
  /* turned on while the room runs: the next clan touch converts */
  r10._liveFlags = {};
  await r10._clansEnsure();
  await flush(3);
  check('10. turned on at runtime: the next clan load converts', !r10._clanOf(P('k0')) && !!r10._partyOf(P('k0')) && r10._partyOf(P('k0')).ally.tag === 'KEPT' && !st10._store.has('clan:cK'));
  /* k0 was here all along: the conversion itself tags them, tells them, and
     takes the clan's tag off every screen */
  check('10. ...a member here at the time wears the tag at once', r10.playerState[P('k0')].allyTag === 'KEPT', r10.playerState[P('k0')].allyTag);
  check('10. ...is told (party_state, fromClan)', msgsOfType(w10.k0, 'party_state').some((m) => m.payload && m.payload.fromClan === 1 && m.payload.ally && m.payload.ally.tag === 'KEPT'));
  check('10. ...and the others see the clan tag go and the new one come', msgsOfType(w10.n0, 'player_update').some((m) => m.id === P('k0') && m.data && m.data.clanTag === null)
    && msgsOfType(w10.n0, 'player_update').some((m) => m.id === P('k0') && m.data && m.data.allyTag === 'KEPT'));
  check('10. ...their clan window is told there is no clan', (last(w10.k0, 'clan_state') || {}).clan === null, last(w10.k0, 'clan_state'));
  check('10. ...a clan of one made under the switch just goes', !r10._clanOf(P('n0')) && !r10._partyOf(P('n0')) && !st10._store.has('clan_by_player:' + P('n0')));

  const st11 = makeState([['liveflags', { partykeep: false }], ...clanSeed('cP', 'Pk Clan', 'PK', 'm0', ['m0', 'm1'])]);
  const r11 = new GameRoom(st11, mockEnv);
  const w11 = { m0: fakeWs('m0') };
  await join(r11, w11.m0, P('m0'), 'Em', { level: 8 });
  check('10. partykeep: false -- nothing is converted (a party could not be stored)', !!r11._clanOf(P('m0')) && st11._store.has('clan:cP') && !r11._partyOf(P('m0')));
}

console.log(failures ? `\n${failures} FAILED` : '\nall clan-party checks passed');
process.exit(failures ? 1 : 0);
