/* Operator-toolkit test (v2.3.1148; spec docs/specs/admin.md).
 * Drives the /api/admin surface through the REAL GameRoom.fetch with a
 * mock env carrying ADMIN_KEY, plus the join-time freeze gate and the
 * lazy daily snapshot ring.  Checks:
 *   1.  Fail-closed auth: no configured secret -> 404 for everything;
 *       missing/wrong bearer -> 401; correct key -> 200.
 *   2.  /overview shape (sessions, players, tick, buffers).
 *   3.  /economy aggregates (totalGold across blobs, top10).
 *   4.  /grant routes through _creditPlayer: offline target lands in
 *       inbox: and drains on join with inbox_delivered; a retry with
 *       the echoed opId converges as dup (rule 5).
 *   5.  freeze -> join gets join_rejected {reason:'frozen'} + close
 *       4004 and no playerState; unfreeze -> join succeeds.  Freezing
 *       an ONLINE player kicks them.
 *   6.  /kick closes the target socket (code 4008).
 *   7.  Snapshot ring: first join snapshots the stored blob, a rejoin
 *       within 20h does NOT double-snapshot, the ring prunes to KEEP.
 *   8.  /restore: 409 while online; offline restore writes the
 *       snapshot AND saves the current blob as prerestore- first;
 *       bad snapKey rejected.
 *   9.  /player inspection shape; /log records mutating ops. */
import { GameRoom } from '../src/index.js';
import { SNAPSHOT } from '../src/admin.js';

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
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
  ADMIN_KEY: 'test-secret-key',
};
function fakeWs(label) {
  return {
    label, sent: [], closed: null,
    send(s) { this.sent.push(JSON.parse(s)); },
    close(code, reason) { this.closed = { code, reason }; },
  };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  // v2.3.1149: pre-settle today's daily login reward -- the grant test
  // asserts exactly ONE inbox_delivered on join; the cadence reward
  // would add a second.
  await room.state.storage.put('cadence:login:' + id, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town' } }));
}
const req = (method, path, body, key) => room.fetch(new Request('https://x' + path, {
  method,
  headers: key === null ? {} : { Authorization: 'Bearer ' + (key || 'test-secret-key') },
  body: body ? JSON.stringify(body) : undefined,
}));
const jbody = async (r) => ({ status: r.status, body: await r.json() });

// ── 1. fail-closed auth ──
{
  const bare = new GameRoom(makeState(), { LEADERBOARD: mockEnv.LEADERBOARD }); // no ADMIN_KEY
  const r = await bare.fetch(new Request('https://x/api/admin/overview', { headers: { Authorization: 'Bearer whatever' } }));
  check('no configured secret -> whole surface 404s (fail closed)', r.status === 404);
}
{
  const r1 = await req('GET', '/api/admin/overview', null, null);
  const r2 = await req('GET', '/api/admin/overview', null, 'wrong-key');
  check('missing bearer -> 401', r1.status === 401);
  check('wrong key -> 401', r2.status === 401);
}

// ── 2. overview ──
const wsA = fakeWs('a');
await join(wsA, 'bp_adm_a');
{
  const { status, body } = await jbody(await req('GET', '/api/admin/overview'));
  check('overview: 200 with live shape', status === 200 && body.ok
    && body.sessions === 1 && typeof body.players === 'number'
    && typeof body.tickRunning === 'boolean' && Array.isArray(body.zones)
    && body.protocolVersions && typeof body.eventBufferLen === 'number', body);
}

// ── 3. economy aggregates ──
room.playerState['bp_adm_a'].coins = 700;
await room._saveRpg('bp_adm_a', room.playerState['bp_adm_a']);
state._store.set('rpg:bp_adm_rich', { coins: 5000, level: 40 });
{
  const { status, body } = await jbody(await req('GET', '/api/admin/economy'));
  check('economy: totalGold sums every blob, top10 sorted', status === 200
    && body.totalGold === 5700 && body.playerBlobs === 2
    && body.top10[0].id === 'bp_adm_rich' && body.top10[0].coins === 5000, body);
}

// ── 4. grant via _creditPlayer (offline -> inbox -> drain; opId dup) ──
{
  const g1 = await jbody(await req('POST', '/api/admin/grant', { playerId: 'bp_adm_off', kind: 'gold', payload: { amount: 150 }, note: 'sorry for the bug' }));
  check('grant to OFFLINE player is inboxed (rule 4 path)', g1.status === 200 && g1.body.result === 'inboxed' && typeof g1.body.opId === 'string', g1.body);
  const g2 = await jbody(await req('POST', '/api/admin/grant', { playerId: 'bp_adm_off', kind: 'gold', payload: { amount: 150 }, opId: g1.body.opId }));
  check('grant retry with the echoed opId converges as dup (rule 5)', g2.body.result === 'dup');
  const wsOff = fakeWs('off');
  await join(wsOff, 'bp_adm_off');
  const delivered = msgsOfType(wsOff, 'inbox_delivered');
  check('inboxed grant drains on join with inbox_delivered + the note',
    room.playerState['bp_adm_off'].coins >= 150
    && delivered.length === 1 && delivered[0].payload.entries[0].note === 'sorry for the bug',
    { coins: room.playerState['bp_adm_off'].coins, delivered });
  check('grant rejects unsupported kinds (weapons v1)', (await req('POST', '/api/admin/grant', { playerId: 'x', kind: 'weapon', payload: {} })).status === 400);
}

// ── 5. freeze / unfreeze ──
{
  const f = await jbody(await req('POST', '/api/admin/freeze', { playerId: 'bp_adm_frz', note: 'dupe exploit' }));
  check('freeze stores the gate record', f.status === 200 && !!state._store.get('frozen:bp_adm_frz'));
  const wsF = fakeWs('frz');
  await join(wsF, 'bp_adm_frz');
  const rej = msgsOfType(wsF, 'join_rejected');
  check('frozen join rejected with reason frozen + close 4004 + no playerState',
    rej.length === 1 && rej[0].reason === 'frozen'
    && wsF.closed && wsF.closed.code === 4004
    && !room.playerState['bp_adm_frz'], { rej, closed: wsF.closed });
  await req('DELETE', '/api/admin/freeze?id=bp_adm_frz');
  const wsF2 = fakeWs('frz2');
  await join(wsF2, 'bp_adm_frz');
  check('unfreeze -> join succeeds', !!room.playerState['bp_adm_frz'] && msgsOfType(wsF2, 'join_rejected').length === 0);
  // Freezing an ONLINE player kicks them.
  const f2 = await jbody(await req('POST', '/api/admin/freeze', { playerId: 'bp_adm_frz' }));
  check('freezing an online player kicks the live socket', f2.body.wasOnline === true && wsF2.closed && wsF2.closed.code === 4004, wsF2.closed);
  await req('DELETE', '/api/admin/freeze?id=bp_adm_frz');
}

// ── 6. kick ──
{
  const wsK = fakeWs('k');
  await join(wsK, 'bp_adm_k');
  const k = await jbody(await req('POST', '/api/admin/kick', { playerId: 'bp_adm_k', reason: 'afk-bot' }));
  check('kick closes the target socket with 4008', k.body.wasOnline === true && wsK.closed && wsK.closed.code === 4008, wsK.closed);
  const k2 = await jbody(await req('POST', '/api/admin/kick', { playerId: 'bp_adm_k' }));
  check('kick on an offline player reports wasOnline false', k2.body.wasOnline === false);
}

// ── 7. snapshot ring ──
{
  // bp_adm_a has a stored blob (saved in §3).  A rejoin triggers the
  // first snapshot; a second rejoin inside 20h must not add another.
  const wsS1 = fakeWs('s1');
  await join(wsS1, 'bp_adm_a');
  const snaps1 = [...state._store.keys()].filter((k) => k.startsWith('rpgsnap:bp_adm_a:'));
  check('first join after save snapshots the stored blob', snaps1.length === 1 && state._store.get(snaps1[0]).coins === 700, snaps1);
  const wsS2 = fakeWs('s2');
  await join(wsS2, 'bp_adm_a');
  const snaps2 = [...state._store.keys()].filter((k) => k.startsWith('rpgsnap:bp_adm_a:'));
  check('rejoin within 20h does not double-snapshot', snaps2.length === 1);
  // Ring prune: seed KEEP+3 snapshots, trigger the prune via a
  // backdated marker, assert the ring holds at KEEP.
  for (let i = 0; i < SNAPSHOT.KEEP + 3; i++) state._store.set('rpgsnap:bp_adm_a:2026010' + i, { coins: i });
  state._store.set('rpgsnap_at:bp_adm_a', Date.now() - SNAPSHOT.INTERVAL_MS - 1000);
  const wsS3 = fakeWs('s3');
  await join(wsS3, 'bp_adm_a');
  const snaps3 = [...state._store.keys()].filter((k) => k.startsWith('rpgsnap:bp_adm_a:'));
  check('ring prunes to SNAPSHOT.KEEP', snaps3.length === SNAPSHOT.KEEP, snaps3.length);

  /* v2.3.1617: BOTH parachute prefixes prune as their own ring.
     `:prereset-` (persistence.js, self-service character restart) was
     added in v2.3.1347 and never registered with the v2.3.1179 class
     test, which matched the literal ':prerestore-' only.  It therefore
     fell into the DAILY class, and because 'p' > '9' it sorted after
     every yyyymmdd key while the excess slice comes off the FRONT — so
     a player who restarted their character had their real daily
     snapshots deleted to make room, and the prereset key never expired.
     This asserts the dailies SURVIVE and the parachutes are bounded;
     against the pre-fix code the dailies get eaten and it fails. */
  const store = state._store;
  for (const k of [...store.keys()]) if (k.startsWith('rpgsnap:bp_adm_a:')) store.delete(k);
  for (let i = 0; i < SNAPSHOT.KEEP; i++) store.set('rpgsnap:bp_adm_a:2026020' + i, { day: i });
  for (let i = 0; i < SNAPSHOT.KEEP + 3; i++) store.set('rpgsnap:bp_adm_a:prereset-17900000000' + i, { pre: i });
  store.set('rpgsnap_at:bp_adm_a', Date.now() - SNAPSHOT.INTERVAL_MS - 1000);
  const wsS4 = fakeWs('s4');
  await join(wsS4, 'bp_adm_a');
  const after = [...store.keys()].filter((k) => k.startsWith('rpgsnap:bp_adm_a:'));
  const dailies = after.filter((k) => !k.includes(':prereset-') && !k.includes(':prerestore-'));
  const presets = after.filter((k) => k.includes(':prereset-'));
  /* the join itself writes today's daily, so the daily class is KEEP after
     its own prune — the point is that NONE of them were evicted by the
     prereset keys, which is what the old code did. */
  check('prereset keys do NOT evict the real daily snapshots',
    dailies.length === SNAPSHOT.KEEP, { dailies: dailies.length, want: SNAPSHOT.KEEP });
  check('prereset keys prune as their OWN bounded ring',
    presets.length === SNAPSHOT.KEEP, { presets: presets.length, want: SNAPSHOT.KEEP });
  check('the surviving prereset keys are the NEWEST ones (oldest evicted)',
    presets.sort()[0] === 'rpgsnap:bp_adm_a:prereset-179000000003', presets.sort()[0]);
}

// ── 8. restore ──
{
  // bp_adm_a is ONLINE (wsS3 session) -> 409.
  const snapKey = [...state._store.keys()].filter((k) => k.startsWith('rpgsnap:bp_adm_a:')).sort()[0];
  const r409 = await req('POST', '/api/admin/restore', { playerId: 'bp_adm_a', snapKey });
  check('restore rejects while the player is online (kick first)', r409.status === 409);
  await req('POST', '/api/admin/kick', { playerId: 'bp_adm_a' });
  const before = state._store.get('rpg:bp_adm_a');
  const snapVal = state._store.get(snapKey);
  const rOk = await jbody(await req('POST', '/api/admin/restore', { playerId: 'bp_adm_a', snapKey }));
  const preKeys = [...state._store.keys()].filter((k) => k.startsWith('rpgsnap:bp_adm_a:prerestore-'));
  check('restore writes the snapshot blob', rOk.status === 200 && state._store.get('rpg:bp_adm_a') === snapVal, rOk.body);
  check('restore saved the CURRENT blob as prerestore first (never destroys data)',
    preKeys.length === 1 && state._store.get(preKeys[0]) === before, preKeys);
  const rBad = await req('POST', '/api/admin/restore', { playerId: 'bp_adm_a', snapKey: 'rpgsnap:bp_other:x' });
  check('restore rejects a snapKey for a different player', rBad.status === 400);
}

// ── 8b. v2.3.1179: the prune distinguishes the two snapshot key classes ──
// 'prerestore-' sorts lexically AFTER every yyyymmdd key ('p' > '9'),
// so the old single sorted-list prune evicted the OLDEST REAL DAILY
// snapshots first and prerestore copies lived forever.  Each class now
// prunes to KEEP independently.
{
  const pid = 'bp_adm_prune';
  for (let i = 0; i < 9; i++) state._store.set('rpgsnap:' + pid + ':2026010' + i, { coins: i });
  for (let i = 0; i < 9; i++) state._store.set('rpgsnap:' + pid + ':prerestore-170000000000' + i, { coins: i });
  await room._rpgSnapshotMaybe(pid, { coins: 999 }); // no throttle marker yet -> snapshots + prunes
  const keys = [...state._store.keys()].filter((k) => k.startsWith('rpgsnap:' + pid + ':'));
  const daily = keys.filter((k) => !k.includes(':prerestore-'));
  const pre = keys.filter((k) => k.includes(':prerestore-'));
  check('daily ring prunes to KEEP despite prerestore keys present', daily.length === SNAPSHOT.KEEP, daily);
  check('today\'s snapshot survives the prune (old code evicted dailies first)',
    daily.some((k) => state._store.get(k).coins === 999), daily);
  check('prerestore ring prunes separately to KEEP', pre.length === SNAPSHOT.KEEP, pre);
  check('prerestore eviction is oldest-first', !pre.includes('rpgsnap:' + pid + ':prerestore-1700000000000')
    && pre.includes('rpgsnap:' + pid + ':prerestore-1700000000008'), pre);
}

// ── 9. player inspection + admin log ──
{
  const { status, body } = await jbody(await req('GET', '/api/admin/player?id=bp_adm_a'));
  check('player inspection: blob + online + snapshots list', status === 200 && body.rpg
    && body.online === false && Array.isArray(body.snapshots) && body.snapshots.length > 0, body);
  const { body: logBody } = await jbody(await req('GET', '/api/admin/log'));
  const ops = logBody.log.map((e) => e.op);
  check('admin log recorded the mutating ops', ['grant', 'kick', 'freeze', 'unfreeze', 'restore'].every((o) => ops.includes(o)), ops);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
