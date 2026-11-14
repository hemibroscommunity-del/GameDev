/* ═══ v2.3.5212: THE PARTY DOOR (card L PR 5; docs/specs/party-door.md) ═══
 *
 * A player's place in a party is one field, their entry in
 * this._partyByPlayer (a party, or none), written only by party.js _partyIn,
 * by a way of PARTY_WAYS; a member always stands in the party's own list
 * (live flag `partydoor: false` lets the door write anyway, as the old lines
 * would have).  This suite:
 *
 *   1. the door's own rules: each way goes to its own place (a party, or
 *      none) and no other; a party that does not name its member is refused;
 *      the kill switch;
 *   2. A SECOND WRITER FAILS: a set, delete or clear of _partyByPlayer, or a
 *      new Map for it, anywhere in server/src that is not _partyIn's, beside
 *      its two births (an empty map before a load or a clan fills it).  The
 *      phase table's guard reads the same off the syntax tree, a Map's own
 *      calls included (tools/guards/phase-table.test.mjs §2);
 *   3. every way, played through the real room: an invite and its accept
 *      (`join`, the inviter and the accepter), a leave and a kick (`leave`),
 *      the last two parting (`disband`), and a deploy's join reading the
 *      party back from storage (`load`) -- and after each, the map and the
 *      parties' own lists agree;
 *   4. step 1 changes nothing: an invite is still no member.
 *
 * v2.3.5214: a birth is the whole guarded line (`if (!...) ... = new Map();`);
 * an unconditional `this._partyByPlayer = new Map();` in a new function of
 * party.js -> FAIL 2.
 *
 * Break proof, tried by hand: `this._partyByPlayer.set(accepterId, p);` put
 * back in _handlePartyAccept -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { partyMethods, PARTY_WAYS } from '../src/party.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. the door's own rules ── */
{
  check('1. the ways: load, join, clan to a party; leave, disband to none',
    JSON.stringify(PARTY_WAYS) === JSON.stringify({ load: 'member', join: 'member', clan: 'member', leave: 'none', disband: 'none' }));
  const door = Object.assign(Object.create(null), partyMethods, { _liveFlags: {} });
  const p = { id: 'p1', members: ['a', 'b'] };
  check('1. join puts a listed member in', door._partyIn('a', p, 'join') === true && door._partyByPlayer.get('a') === p);
  check('1. load and clan do too', door._partyIn('b', p, 'load') === true && door._partyIn('b', p, 'clan') === true && door._partyByPlayer.get('b') === p);
  check('1. a party that does not name its member is refused', door._partyIn('c', p, 'join') === false && !door._partyByPlayer.has('c'));
  check('1. a way to a party takes a party, not none', door._partyIn('a', null, 'join') === false && door._partyByPlayer.get('a') === p);
  check('1. a way to none takes none, not a party', door._partyIn('a', p, 'leave') === false && door._partyByPlayer.get('a') === p);
  check('1. leave takes one out', door._partyIn('a', null, 'leave') === true && !door._partyByPlayer.has('a'));
  check('1. disband takes one out', door._partyIn('b', null, 'disband') === true && !door._partyByPlayer.has('b'));
  check('1. an unknown way, one off the prototype, or no player id is refused',
    door._partyIn('a', p, 'nope') === false && door._partyIn('a', p, 'toString') === false && door._partyIn('', p, 'join') === false && door._partyIn(7, p, 'join') === false);
  check('1. a hostile id is a key like any other (a Map)', door._partyIn('__proto__', { members: ['__proto__'] }, 'join') === true && door._partyByPlayer.has('__proto__') && door._partyIn('__proto__', null, 'leave') === true);
  const bare = Object.assign(Object.create(null), partyMethods, { _liveFlags: {} });
  check('1. a leave before any party is no error (no map yet)', bare._partyIn('a', null, 'leave') === true && bare._partyByPlayer === undefined);
  door._liveFlags = { partydoor: false };
  check('1. partydoor: false puts in a member the party does not list, as the old lines would have', door._partyIn('c', p, 'join') === true && door._partyByPlayer.get('c') === p);
  check('1. ...but never by a wrong way', door._partyIn('c', p, 'leave') === false && door._partyByPlayer.get('c') === p);
}

/* ── 2. no second writer ── */
{
  /* v2.3.5214 (the gatekeeper's low, sitting 15): a birth is the whole
     guarded line, so it only ever makes a map that is missing; an
     unconditional `this._partyByPlayer = new Map()` (a wipe) is no birth */
  const BIRTH = /^\s*if \(!this\._partyByPlayer\) this\._partyByPlayer = new Map\(\);\s*$/;
  const BIRTHS = [
    { file: 'server/src/party.js', re: BIRTH, text: 'if (!this._partyByPlayer) this._partyByPlayer = new Map();', why: 'the map\'s birth, empty, only where missing (a load, an accept)' },
    { file: 'server/src/clanparty.js', re: BIRTH, text: 'if (!this._partyByPlayer) this._partyByPlayer = new Map();', why: 'the map\'s birth, empty, only where missing (a clan becoming a party)' },
  ];
  const ROOT = new URL('../../', import.meta.url);
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) { if (n !== 'vendor') walk(r + '/'); }
      else if (/\.(js|mjs)$/.test(n)) files.push(r);
    }
  })('server/src/');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const WRITE = /_partyByPlayer\s*(?:\.\s*(?:set|delete|clear)\s*\(|=(?!=))|\[\s*['"]_partyByPlayer['"]\s*\]\s*=(?!=)|delete\s+[\w$.]+\._partyByPlayer\b/;
  const outside = [];
  const seen = new Set();
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('_partyByPlayer')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/party.js') {
        if (/^\s{2}_partyIn\(pid, p, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      const b = BIRTHS.find((x) => x.file === f && x.re.test(l));
      if (b) { seen.add(b); continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _partyIn writes the place (its delete, its birth, its set)', doorWrites === 3, doorWrites);
  check('2. no write of _partyByPlayer in server/src outside _partyIn but its births', outside.length === 0, outside);
  const stale = BIRTHS.filter((x) => !seen.has(x)).map((x) => x.file + ' "' + x.text + '"');
  check('2. every birth still stands (a stale one is deleted)', stale.length === 0, stale);
  const src = readFileSync(new URL('server/src/party.js', ROOT), 'utf8') + readFileSync(new URL('server/src/clanparty.js', ROOT), 'utf8');
  const ways = [...src.matchAll(/this\._partyIn\([^,]+,\s*[^,]+,\s*'([a-z]+)'\)/g)].map((m) => m[1]).sort();
  check('2. every way has its callers: load x2, join x2, clan, leave, disband', ways.join() === 'clan,disband,join,join,leave,load,load', ways);
}

/* ── 3. every way, through the real room ── */
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => {
        if (Array.isArray(k)) { const out = new Map(); for (const x of k) if (store.has(x)) out.set(x, store.get(x)); return out; }
        return store.get(k);
      },
      put: async (k, v) => { if (k && typeof k === 'object' && !Array.isArray(k)) { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const x of k) store.delete(x); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const flush = () => new Promise((r) => setTimeout(r, 0));
const P = (n) => 'bp_pdoor_' + n;
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(room, ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id.slice(-1).toUpperCase(), phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
  await flush();
}
const cmd = async (room, ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await flush(); };
/* the map and the parties' own lists agree: every entry's party names its
   player, and every listed member of a live party is in the map */
function agrees(room) {
  const bad = [];
  for (const [pid, p] of room._partyByPlayer || []) if (!p.members.includes(pid)) bad.push('map ' + pid + ' -> ' + p.id + ' not listed');
  for (const p of (room._parties || new Map()).values()) for (const m of p.members) if (room._partyByPlayer.get(m) !== p) bad.push('listed ' + m + ' not mapped to ' + p.id);
  return bad;
}
{
  const state = makeState();
  const room = new GameRoom(state, mockEnv);
  const ws = {};
  for (const n of ['a', 'b', 'c', 'd']) { ws[n] = fakeWs(n); await join(room, ws[n], P(n)); }

  await cmd(room, ws.a, 'party_invite', { target: P('b') });
  check('4. an invite is no member (step 1)', !room._partyOf(P('b')) && !room._partyOf(P('a')));
  await cmd(room, ws.b, 'party_accept', { target: P('a') });
  const p = room._partyOf(P('a'));
  check('3. join: the accept puts the inviter and the accepter in one party', p && room._partyOf(P('b')) === p && p.members.length === 2);
  await cmd(room, ws.a, 'party_invite', { target: P('c') });
  await cmd(room, ws.c, 'party_accept', { target: P('a') });
  await cmd(room, ws.a, 'party_invite', { target: P('d') });
  await cmd(room, ws.d, 'party_accept', { target: P('a') });
  check('3. ...and a third and a fourth join the same party', room._partyOf(P('c')) === p && room._partyOf(P('d')) === p && p.members.length === 4);
  check('3. the map and the lists agree after the joins', agrees(room).length === 0, agrees(room));

  await cmd(room, ws.d, 'party_leave');
  check('3. leave: a leave takes its player out', !room._partyOf(P('d')) && !p.members.includes(P('d')));
  await cmd(room, ws.a, 'party_kick', { target: P('c') });
  check('3. leave: a kick takes its player out', !room._partyOf(P('c')) && !p.members.includes(P('c')));
  check('3. the map and the lists agree after a leave and a kick', agrees(room).length === 0, agrees(room));

  /* a deploy: the same storage, a new room; the first member back reads it */
  const roomB = new GameRoom(state, mockEnv);
  const wb = fakeWs('b2');
  await join(roomB, wb, P('b'));
  const pb = roomB._partyOf(P('b'));
  check('3. load: after a deploy, the party is read back from storage at a join', pb && pb.id === p.id && pb.members.includes(P('a')) && pb.members.includes(P('b')), pb && pb.members);
  check('3. ...with every member it lists in the map (load)', roomB._partyOf(P('a')) === pb && agrees(roomB).length === 0, agrees(roomB));

  await cmd(roomB, wb, 'party_leave');
  check('3. disband: two parting leave nobody in it', !roomB._partyOf(P('b')) && !roomB._partyOf(P('a')) && !roomB._parties.has(pb.id));
  check('3. the map and the lists agree after a disband', agrees(roomB).length === 0, agrees(roomB));
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
