/* ═══ v2.3.6040: MAPS WITH NO PROTOTYPE, ONE CASE A SITE (card V6 PR 1, TRAPS §6) ═══
 *
 * TRAPS §6: a plain `{}` keyed by a client's id silently no-ops on
 * `'__proto__'` (the assignment sets the object's prototype, no key is made)
 * and reads `'constructor'` as Object's own function.  The trap's guard
 * (tools/guards/traps-saves.test.mjs) listed eight plain `{}` beside an
 * id-shaped index on 2026-11-17 (card V2's Found); each is a map with no
 * prototype now, and each has its case here, through the function that
 * builds it:
 *   1. charwatch.js _watchWipe: the `player_update` that clears a wiped
 *      drawing carries every wiped key, `__proto__` too, as null (on a plain
 *      {} the null SET the prototype and no key went: no phone cleared it);
 *   2. eventcapes.js _capePublicStatus and 3. _capeAdminRoute: a cape named
 *      `__proto__` is a row of the answer, and `constructor` reads nothing;
 *   4. feedback.js vote: a ticket kept with no voters takes a vote under
 *      `constructor` and `__proto__`, and takes it back;
 *   5. feedback.js sweep: the mend keeps `__proto__` and `constructor`
 *      voters and drops only the bad vote, the counts following;
 *   6. party.js _partyStore and 7. _partyOnRejoin: members named
 *      `__proto__` and `constructor` each get their own row, stored, and the
 *      row has no prototype;
 *   8. spar.js _sparSpawn: a clone's buff map has no prototype: a buff named
 *      `__proto__` is kept, `constructor` is no buff.
 * Break proofs (2026-11-18, each site put back to a plain {} in a scratch
 * copy, then undone): 1 -> FAIL 1 (no `__proto__` in the update); 2 -> FAIL 2;
 * 3 -> FAIL 3; 6 -> FAIL 6 (the row has a prototype); 7 -> FAIL 7;
 * 8 -> FAIL 8.  4 and 5 already held their keys (the vote's map was built
 * with no prototype since v2.3.5593); their cases pin the stand-ins.
 */
import { GameRoom } from '../src/index.js';
import { Feedback } from '../src/feedback.js';
import { EVENT_CAPES } from '../src/eventcapes.js';
import { DRAWING_KEYS } from '../src/join.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
let T = 1_900_000_000_000;
Date.now = () => T;
function makeState() {
  const store = new Map();
  const puts = [];
  return {
    _store: store, _puts: puts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { puts.push([k, v]); store.set(k, typeof v === 'string' ? v : JSON.parse(JSON.stringify(v))); },
      list: async (o) => { const out = new Map(); for (const [k, v] of [...store].sort((a, b) => (a[0] < b[0] ? -1 : 1))) { if (o?.prefix && !k.startsWith(o.prefix)) continue; if (o?.startAfter && k <= o.startAfter) continue; if (o?.limit && out.size >= o.limit) break; out.set(k, v); } return out; },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} });
const noProto = (o) => !!o && typeof o === 'object' && Object.getPrototypeOf(o) === null;

const st = makeState();
const room = new GameRoom(st, mockEnv);
clearInterval(room.tickInterval); room.tickInterval = null;

// ── 1. charwatch.js _watchWipe ──
{
  const pid = 'bp_proto_wipe';
  /* JSON.parse makes `__proto__` an own key, as a stored record's would be */
  await st.storage.put('char:' + pid, JSON.parse('{"look":{"__proto__":"ink","sa":"ink2"}}'));
  const sent = [];
  const was = { bx: room.broadcastExcept, sb: room._sessionById, ws: room._wsBySessionId, lf: room._lookForget };
  room.broadcastExcept = (ws, m) => { sent.push(m); };
  room._sessionById = () => ({ id: pid, char: { look: {} }, data: {} });
  room._wsBySessionId = () => null;
  room._lookForget = () => {};
  DRAWING_KEYS.add('__proto__');   /* a drawing key named so: the map must still carry it */
  let r;
  try { r = await room._watchWipe(pid); } finally {
    DRAWING_KEYS.delete('__proto__');
    room.broadcastExcept = was.bx; room._sessionById = was.sb; room._wsBySessionId = was.ws; room._lookForget = was.lf;
  }
  const upd = sent.find((m) => m && m.type === 'player_update');
  const wire = upd ? JSON.parse(JSON.stringify(upd)) : null;
  check('1: _watchWipe: the update clears every wiped key, `__proto__` too, as null (a plain {} took the null as its prototype and sent no key)',
    r && r.ok && r.wiped.includes('__proto__') && wire && Object.hasOwn(wire.data, '__proto__') && wire.data.__proto__ === null && wire.data.sa === null,
    { r, wire });
  check('1: _watchWipe: its map has no prototype (`constructor` reads nothing)', upd && noProto(upd.data) && upd.data.constructor === undefined);
}

// ── 2 and 3. eventcapes.js: a cape named `__proto__` ──
{
  const base = EVENT_CAPES[Object.keys(EVENT_CAPES)[0]];
  Object.defineProperty(EVENT_CAPES, '__proto__', { value: { ...base }, enumerable: true, configurable: true, writable: true });
  let pub, adm;
  const wasLoad = room._capeLedgersLoad;
  try {
    pub = room._capePublicStatus();
    room._capeLedgersLoad = async () => {};
    adm = await room._capeAdminRoute({ method: 'GET' }, new URL('https://x/capes'), '/capes', (o) => o);
  } finally {
    delete EVENT_CAPES.__proto__;
    room._capeLedgersLoad = wasLoad;
  }
  const pubWire = JSON.parse(JSON.stringify(pub));
  check('2: _capePublicStatus: a cape named `__proto__` is a row of the answer (a plain {} made it the prototype, and it was not sent)',
    Object.hasOwn(pubWire.capes, '__proto__') && pubWire.capes.__proto__.cap === base.cap, pubWire);
  check('2: _capePublicStatus: the capes map has no prototype (`constructor` reads nothing)', noProto(pub.capes) && pub.capes.constructor === undefined);
  const admWire = adm ? JSON.parse(JSON.stringify(adm)) : null;
  check('3: _capeAdminRoute: a cape named `__proto__` is a row of the owner\'s answer',
    admWire && admWire.ok && Object.hasOwn(admWire.capes, '__proto__') && admWire.capes.__proto__.cap === base.cap, admWire);
  check('3: _capeAdminRoute: the capes map has no prototype (`constructor` reads nothing)', adm && noProto(adm.capes) && adm.capes.constructor === undefined);
  check('2-3: the test\'s cape is gone again (guard)', !Object.hasOwn(EVENT_CAPES, '__proto__'));
}

// ── 4. feedback.js vote: a ticket kept with no voters ──
{
  const fst = makeState();
  const fb = new Feedback(fst, {});
  await fst.storage.put('ticket:old1', JSON.stringify({ id: 'old1', playerId: 'bp_a', playerName: 'A', category: 'bug', topic: 'ui', text: 'x', up: 0, down: 0, ts: 1 }));
  const c1 = await fb.vote({ ticketId: 'old1', playerId: 'constructor', vote: 'up' }, '203.0.113.71');
  const p1 = await fb.vote({ ticketId: 'old1', playerId: '__proto__', vote: 'down' }, '203.0.113.72');
  const kept = JSON.parse(await fst.storage.get('ticket:old1'));
  check('4: vote: a ticket kept with no voters takes a vote under `constructor` and `__proto__`, each its own key',
    c1.ok && c1.myVote === 'up' && p1.ok && p1.myVote === 'down' && kept.up === 1 && kept.down === 1
      && Object.hasOwn(kept.voters, 'constructor') && Object.hasOwn(kept.voters, '__proto__'), { c1, p1, kept });
  T += 1000;
  const c2 = await fb.vote({ ticketId: 'old1', playerId: 'constructor', vote: 'up' }, '203.0.113.71');
  check('4: vote: and `constructor` takes it back as any other', c2.ok && c2.up === 0 && c2.myVote === null, c2);
}

// ── 5. feedback.js sweep: the mend keeps the odd names ──
{
  const fst = makeState();
  const fb = new Feedback(fst, {});
  await fst.storage.put('ticket:m1', '{"id":"m1","playerId":"bp_a","playerName":"A","category":"bug","topic":"ui","text":"x","up":2,"down":1,"ts":1,'
    + '"voters":{"__proto__":"up","constructor":"down","bp_ok":"up","bp_odd":"sideways"}}');
  await fst.storage.put('ticket:m2', '{"id":"m2","playerId":"bp_b","playerName":"B","category":"bug","topic":"ui","text":"y","up":0,"down":0,"ts":2}');
  const r = await fb.sweep({});
  const m1 = JSON.parse(await fst.storage.get('ticket:m1'));
  check('5: sweep: the mend keeps the `__proto__` and `constructor` voters and drops only the bad vote, the counts following',
    r.ok && r.mended === 1 && m1.up === 2 && m1.down === 1 && Object.hasOwn(m1.voters, '__proto__') && Object.hasOwn(m1.voters, 'constructor')
      && !Object.hasOwn(m1.voters, 'bp_odd'), { r, m1 });
  check('5: sweep: a ticket with no voters is left as it was', !!(await fst.storage.get('ticket:m2')) && r.big === 0, r);
}

// ── 6 and 7. party.js: members named `__proto__` and `constructor` ──
{
  const names = ['__proto__', 'constructor'];
  const p = { id: 'pt_proto', leader: '__proto__', members: names.slice(), meta: Object.create(null), ts: T };
  const was = room._partyStorageDo;
  const puts = [];
  room._partyStorageDo = (op, k, v) => { if (op === 'put') puts.push([k, v]); };
  try { room._partyStore(p); } finally { room._partyStorageDo = was; }
  const rec = puts.find(([k]) => k === 'party:pt_proto');
  const wire = rec ? JSON.parse(JSON.stringify(rec[1])) : null;
  check('6: _partyStore: each member named `__proto__` or `constructor` has its own stored row',
    wire && names.every((n) => Object.hasOwn(wire.meta, n) && wire.meta[n].level === 1), wire);
  check('6: _partyStore: a member\'s row made here has no prototype (`constructor` reads nothing)',
    names.every((n) => noProto(p.meta[n]) && p.meta[n].constructor === undefined));

  /* 7: a rejoin into a party in memory, its rows not yet made */
  const q = { id: 'pt_proto2', leader: '__proto__', members: names.slice(), meta: Object.create(null), ts: T };
  const wasOf = room._partyOf, wasKeep = room._partyKeepOn, wasName = room._partyNameOf;
  room._partyOf = () => q; room._partyKeepOn = () => false; room._partyNameOf = (id) => 'N' + id.length;
  room.playerState['constructor'] = { level: 3 };
  try { for (const n of names) await room._partyOnRejoin(n); } finally {
    room._partyOf = wasOf; room._partyKeepOn = wasKeep; room._partyNameOf = wasName;
    delete room.playerState['constructor'];
  }
  check('7: _partyOnRejoin: each member named `__proto__` or `constructor` gets its own row, with no prototype',
    names.every((n) => Object.hasOwn(q.meta, n) && noProto(q.meta[n])), Object.keys(q.meta));
}

// ── 8. spar.js _sparSpawn: a clone's buffs ──
{
  const OWNER = 'bp_proto_owner';
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: OWNER, name: 'Proto', phrase: 'p-' + OWNER, protocolVersion: 2, ws: [1, 5],
    data: { x: 0, y: 0, z: 'town', sk: 'tan', hr: 'mohawk' } }));
  await new Promise((r) => setTimeout(r, 5));
  clearInterval(room.tickInterval); room.tickInterval = null;
  const O = room.playerState[OWNER];
  check('8: the clone\'s owner joined (guard)', !!O);
  const before = new Set(Object.keys(room.playerState));
  room._sparSpawn(OWNER, O, 'sword');
  const cid = Object.keys(room.playerState).find((k) => !before.has(k) && k.startsWith('spar_'));
  const C = cid ? room.playerState[cid] : null;
  check('8: _sparSpawn: a clone\'s buff map has no prototype (`constructor` is no buff)', C && noProto(C._buffs) && C._buffs.constructor === undefined, cid);
  if (C) C._buffs['__proto__'] = T + 5000;
  check('8: _sparSpawn: a buff named `__proto__` is kept as a key', C && Object.hasOwn(C._buffs, '__proto__') && Object.keys(C._buffs).includes('__proto__'));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
