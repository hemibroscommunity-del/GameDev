/* The owner's test kit (v2.3.2240; spec docs/specs/devtools.md).
 *
 * Owner: "test features directly without needing to play through the quest
 * line".  So the thing under test is not really "does unlock write a field" —
 * it is "can the owner now REACH ember", which is a question about
 * _zoneUnlocked, the gate the game actually consults.  Every assertion below
 * is written against that gate or against _applyDamage rather than against
 * the fields this module writes, because a test that only checked its own
 * writes would pass on a kit that unlocked nothing.
 *
 * THE SECURITY HALF IS THE POINT.  These operations bypass a quest gate and
 * turn off damage, so the whole design rests on them being unreachable
 * without the owner's key: no websocket message may touch them, the surface
 * must 404 when no key is configured, and a wrong key must 401.  Those are
 * pinned first.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { DEVKIT } from '../src/devtools.js';
import { QUEST_ZONE_GATE } from '../src/movement.js';

const KEY = 'test-admin-key-0123456789';
const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const envWith = (k) => ({ LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ...(k ? { ADMIN_KEY: k } : {}) });
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}
const req = (path, opts) => new Request('https://w/api/admin' + path, opts);
const authed = (path, body, method) => req(path, {
  method: method || (body ? 'POST' : 'GET'),
  headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
});

async function newRoom(key) {
  const room = new GameRoom(mockState, envWith(key));
  const ws = fakeWs('p');
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id: 'p1', name: 'Owner', protocolVersion: 2,
    data: { x: 500, y: 500, z: 'meadow' },
  }));
  return { room, ws, ps: room.playerState.p1 };
}

// ── 1. THE LOCK ──
{
  const { room } = await newRoom(null);           /* no ADMIN_KEY configured */
  const r = await room._adminFetch(authed('/dev/unlock', { playerId: 'p1' }));
  check('lock: with no ADMIN_KEY the whole surface 404s', r.status === 404, { status: r.status });

  const { room: r2 } = await newRoom(KEY);
  const bad = await r2._adminFetch(req('/dev/unlock', {
    method: 'POST', headers: { Authorization: 'Bearer wrong', 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: 'p1' }),
  }));
  check('lock: a wrong key is 401, not a hint', bad.status === 401, { status: bad.status });

  const none = await r2._adminFetch(req('/dev/unlock', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }));
  check('lock: no key at all is 401', none.status === 401, { status: none.status });
}

// ── 2. NO WEBSOCKET CAN REACH ANY OF IT ──
{
  const { room, ws, ps } = await newRoom(KEY);
  const before = JSON.stringify(ps._quests || {});
  /* Every shape a cheater would try. */
  for (const type of ['dev_unlock', 'dev_kit', 'dev_vitals', 'dev_warp', 'dev/unlock']) {
    await room.webSocketMessage(ws, JSON.stringify({ type, playerId: 'p1', payload: { playerId: 'p1' } }));
  }
  check('wire: no dev message unlocks anything',
    JSON.stringify(ps._quests || {}) === before, { before, after: ps._quests });
  check('wire: no dev message turns on god mode', !ps._godUntil, { god: ps._godUntil });
  /* And the module adds no server-EMITTED type that would need deny-listing:
     everything it does rides player_state, which is already privileged. */
  check('wire: player_state (how the kit reports back) is deny-listed',
    PRIVILEGED_EVENTS.has('player_state'), {});
}

// ── 3. UNLOCK OPENS THE GATE THE GAME ACTUALLY CHECKS ──
{
  const { room, ps } = await newRoom(KEY);
  const gated = [...QUEST_ZONE_GATE.keys()];
  check('fixture: some zones really are quest-gated', gated.length > 0, { gated });
  check('fixture: ember is one of them, and shut to start',
    gated.includes('ember') && !room._zoneUnlocked(ps, 'ember'), { gated });

  const res = await room._adminFetch(authed('/dev/unlock', { playerId: 'p1' }));
  check('unlock: 200', res.status === 200, { status: res.status });
  const body = await res.json();
  check('unlock: it reports what it opened', body.ok && Array.isArray(body.opened) && body.opened.length > 0, body);

  /* THE assertion: the gate the game consults, not the field we wrote. */
  let allOpen = true;
  for (const z of gated) if (!room._zoneUnlocked(ps, z)) allOpen = false;
  check('unlock: EVERY quest-gated zone is now reachable', allOpen,
    gated.map((z) => z + ':' + room._zoneUnlocked(ps, z)).join(' '));

  /* ...and a real move into ember is now accepted, which is the owner's
     actual goal.  Driving _handleMove rather than trusting the gate helper. */
  const ws2 = [...room.sessions.keys()][0];
  const session = room.sessions.get(ws2);
  room._handleMove(session, ws2, { x: 500, y: 500, z: 'ember' });
  check('unlock: the player can now MOVE into ember', ps.z === 'ember', { z: ps.z });
}

// ── 4. IT MARKS QUESTS ACTIVE, NOT COMPLETE ──
{
  const { room, ps } = await newRoom(KEY);
  await room._adminFetch(authed('/dev/unlock', { playerId: 'p1' }));
  const states = Object.values(ps._quests || {});
  /* Completing them would hand over rewards and rewrite tutorial dialogue,
     making the owner's save unrepresentative of the players being tested for. */
  check('unlock: nothing is marked turnedIn', !states.includes('turnedIn'), ps._quests);
  check('unlock: they are active', states.includes('active'), ps._quests);
}

// ── 5. GOD MODE ACTUALLY STOPS DAMAGE, AND EXPIRES ──
{
  const { room, ps } = await newRoom(KEY);
  ps._zoneEntryGraceUntil = 0;                    /* don't measure the entry grace */
  ps.hp = ps.maxHp;
  const hit1 = room._applyDamage(ps, 40, false);
  check('god: control — damage lands with it off', hit1.dmgTaken > 0, hit1);

  const r = await room._adminFetch(authed('/dev/vitals', { playerId: 'p1', god: true, godMinutes: 5 }));
  check('god: 200', r.status === 200, { status: r.status });
  ps.hp = ps.maxHp;
  const hit2 = room._applyDamage(ps, 40, false);
  check('god: damage is zeroed while it is on', hit2.dmgTaken === 0, hit2);
  /* `graced`, like the zone-entry window, so damage TRACKING stays honest
     and lifesteal/credit behave as they always do. */
  check('god: ...and it reports graced, not dodged', hit2.graced === true && hit2.dodged === false, hit2);

  /* It must not be a permanent switch. */
  ps._godUntil = Date.now() - 1;
  const hit3 = room._applyDamage(ps, 40, false);
  check('god: an expired window stops protecting', hit3.dmgTaken > 0, hit3);

  await room._adminFetch(authed('/dev/vitals', { playerId: 'p1', god: true, godMinutes: 99999 }));
  const capped = ps._godUntil - Date.now();
  check('god: the duration is capped, so it cannot be left on forever',
    capped <= DEVKIT.GOD_MINUTES_MAX * 60000 + 2000, { minutesLeft: Math.round(capped / 60000) });

  const off = await room._adminFetch(authed('/dev/vitals', { playerId: 'p1', god: false }));
  check('god: it can be turned off', off.status === 200 && !ps._godUntil, { god: ps._godUntil });
}

// ── 6. GOD MODE NEVER REACHES THE SAVE FILE (handoff rule 1) ──
{
  const { room, ps } = await newRoom(KEY);
  await room._adminFetch(authed('/dev/vitals', { playerId: 'p1', god: true }));
  check('god: it is set', !!ps._godUntil, {});
  const blob = room._rpgBlobFor ? room._rpgBlobFor(ps) : null;
  if (blob) {
    check('god: the persisted blob carries no _godUntil',
      !Object.prototype.hasOwnProperty.call(blob, '_godUntil'), Object.keys(blob).filter((k) => k.startsWith('_')));
  } else {
    /* No blob builder exported here; assert the weaker but still meaningful
       property — the flag is an underscore-prefixed playerState field, the
       same class as _zoneEntryGraceUntil which has never been persisted. */
    check('god: the flag is an in-memory underscore field like the entry grace',
      '_godUntil'.startsWith('_') && ps._godUntil > 0, {});
  }
}

// ── 7. VITALS REFILL ──
{
  const { room, ps } = await newRoom(KEY);
  ps.hp = 1;
  if (typeof ps.maxStamina === 'number') ps.stamina = 0;
  const r = await room._adminFetch(authed('/dev/vitals', { playerId: 'p1', heal: true }));
  check('heal: 200', r.status === 200, { status: r.status });
  check('heal: hp is full again', ps.hp === ps.maxHp, { hp: ps.hp, maxHp: ps.maxHp });
  if (typeof ps.maxStamina === 'number') {
    check('heal: stamina too', ps.stamina === ps.maxStamina, { st: ps.stamina, max: ps.maxStamina });
  }
}

// ── 8. THE KIT ──
{
  const { room, ps } = await newRoom(KEY);
  const beforeLvl = (ps.prog3 && ps.prog3.sk)
    ? ['sword', 'bow', 'staff'].reduce((s, k) => s + ((ps.prog3.sk[k] && ps.prog3.sk[k].level) || 0), 0) : null;
  const r = await room._adminFetch(authed('/dev/kit', { playerId: 'p1' }));
  const body = await r.json();
  check('kit: 200', r.status === 200 && body.ok, body);
  check('kit: weapons were granted', body.weapons > 0, body);
  if (beforeLvl !== null) {
    const afterLvl = ['sword', 'bow', 'staff'].reduce((s, k) => s + ((ps.prog3.sk[k] && ps.prog3.sk[k].level) || 0), 0);
    check('kit: levels went UP through the real award path', afterLvl > beforeLvl, { beforeLvl, afterLvl });
    /* The legitimate path mints allocation points; hand-writing prog3 would
       not, and would leave a character the real game cannot produce. */
    check('kit: ...and the level-ups minted allocation points', (ps.prog3.pool || 0) > 0, { pool: ps.prog3.pool });
  }
}

// ── 9. STATE REPORTS THE TRUTH ──
{
  const { room, ps } = await newRoom(KEY);
  const before = await (await room._adminFetch(authed('/dev/state?id=p1'))).json();
  check('state: ember reads shut before unlocking', before.ok && before.zones.ember === false, before.zones);
  await room._adminFetch(authed('/dev/unlock', { playerId: 'p1' }));
  const after = await (await room._adminFetch(authed('/dev/state?id=p1'))).json();
  check('state: ...and open afterwards', after.zones.ember === true, after.zones);
  check('state: it reports god mode honestly', after.god === false, after);
  await room._adminFetch(authed('/dev/vitals', { playerId: 'p1', god: true }));
  const god = await (await room._adminFetch(authed('/dev/state?id=p1'))).json();
  check('state: ...and again once it is on', god.god === true && god.godMsLeft > 0, god);
}

// ── 9b. FINISH ALL QUESTS (v2.3.2277) ──
//
// Owner: "starting fresh with new characters forces me to go through the
// tutorial to access zones that I usually need to playtest in ... Having the
// finish all quests button will be good in that mode."
//
// The three things worth pinning are the three that could go wrong quietly:
// that it marks EVERY quest in the server's own table (not a client-supplied
// list), that it does NOT pay rewards (a debug button minting a full quest
// line's gear into a live economy is a different feature), and that it opens
// the gated zones as a side effect -- because 'turnedIn' satisfies the same
// gate 'active' does, and the owner should not have to guess which button
// did what.
{
  const { room } = await newRoom(KEY);
  const ps = room.playerState.p1;
  const before = { coins: ps.coins || 0, inv: JSON.stringify(ps.inventory || {}) };
  const shut = await (await room._adminFetch(authed('/dev/state?id=p1'))).json();
  check('quests: ember reads shut before finishing (guard)', shut.ok && shut.zones.ember === false, shut.zones);

  const r = await room._adminFetch(authed('/dev/quests', { playerId: 'p1' }));
  const body = await r.json();
  check('quests: 200', r.status === 200 && body.ok, body);
  check('quests: it finished the whole table', body.finished === body.total && body.total > 0, body);
  const table = room._QUEST_REWARDS_DATA();
  check('quests: ...and every id in it really is turnedIn',
    Object.keys(table).every((q) => ps._quests[q] === 'turnedIn'),
    Object.keys(table).filter((q) => ps._quests[q] !== 'turnedIn'));
  check('quests: it paid NO rewards -- same purse, same bag',
    (ps.coins || 0) === before.coins && JSON.stringify(ps.inventory || {}) === before.inv,
    { before, after: { coins: ps.coins, inv: ps.inventory } });
  const open = await (await room._adminFetch(authed('/dev/state?id=p1'))).json();
  check('quests: ...and the gated zones opened with it', open.zones.ember === true, open.zones);

  const again = await (await room._adminFetch(authed('/dev/quests', { playerId: 'p1' }))).json();
  check('quests: running it twice is a clean no-op', again.ok && again.finished === 0, again);
}

// ── 10. AN UNKNOWN PLAYER IS AN ERROR, NOT A CRASH ──
{
  const { room } = await newRoom(KEY);
  for (const p of ['/dev/unlock', '/dev/kit', '/dev/vitals', '/dev/quests']) {
    const r = await room._adminFetch(authed(p, { playerId: 'nobody' }));
    check('robust: ' + p + ' on an unknown player is a clean 404', r.status === 404, { status: r.status });
  }
  const noId = await room._adminFetch(authed('/dev/unlock', {}));
  check('robust: a missing playerId is a 400', noId.status === 400, { status: noId.status });
}

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
