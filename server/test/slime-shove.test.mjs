/* A SLIME'S BLAST BLOWS YOU BACK -- v2.3.3747 (server/src/telegraph.js
 * SLIME_BURST.SHOVE, _blastShove; monsterstatus.js _grantShove).
 *
 * The owner, 2026-10-28: "if you take damage from a slime explosion I want
 * the character to be blown back a bit (moved back)".
 *   1. THE BLOWBACK: a blue slime going off blows everyone it hurts
 *      SLIME_BURST.SHOVE px straight away from where it went off, over
 *      SHOVE_MS (`kb`, `kbMs` on the hit, no gust `st`), the worker granting
 *      the room as a gust's; one outside the blast nothing.
 *   2. A SHIELD facing it blocks it: no damage, no shove.
 *   3. A WIND SLIME's own gust carries the blast's 90 px (st 'gust'), not a
 *      second shove on top.
 *   4. THE SPLITTING BOSS's blast is the same kit: it shoves too.
 *   5. `slimeshove: false`: the blast hurts as before and shoves nothing. */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { SLIME_BURST } from '../src/telegraph.js';
import { GUST } from '../src/monsterstatus.js';

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* every blow a sure one (the dodge roll) */
Math.random = () => 0.999;

const room = new GameRoom(mockState, mockEnv);
for (const id of ['p1', 'p2', 'p3']) {
  const ws = fakeWs(id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288, z: WHEEL_ZONE }));
}
const P = (id) => room.playerState[id];
const withFlags = (flags, fn) => { const keep = room._liveFlags; room._liveFlags = Object.assign({}, keep || {}, flags); try { return fn(); } finally { room._liveFlags = keep; } };
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
/* a monster out on a spoke, made a blue slime of the given element */
const slime = wheel.find((m) => m.home === 'sky');

/* the slime out on its spoke, off the safe ground; p1 60 px east of it, p2
   300 px west (outside the 110 blast), p3 50 px north */
function stage(element) {
  const ux = slime.spawnX - WHEEL_CENTRE[0], uy = slime.spawnY - WHEEL_CENTRE[1], ul = Math.hypot(ux, uy);
  const r = WHEEL_SAFE_R + 600;
  const at = { x: WHEEL_CENTRE[0] + (ux / ul) * r, y: WHEEL_CENTRE[1] + (uy / ul) * r };
  Object.assign(slime, { x: at.x, y: at.y, alive: true, hp: 0, variant: Object.keys(SLIME_BURST.VARIANTS)[0], element,
    _burstUntil: Date.now() - 1, _burstR: SLIME_BURST.RADIUS, _burstKiller: null, _burstSlot: null, statuses: {} });
  const place = { p1: [60, 0], p2: [-300, 0], p3: [0, -50] };
  for (const id of Object.keys(place)) {
    Object.assign(P(id), { z: WHEEL_ZONE, x: at.x + place[id][0], y: at.y + place[id][1], dead: false, dying: false, disconnected: false,
      blocking: false, ba: null, _zoneEntryGraceUntil: 0, _godUntil: 0, _gustLeft: 0, _gustUntil: 0, _stuckUntil: 0, _stuckImmuneUntil: 0, _dazeUntil: 0 });
    P(id).maxHp = 5000; P(id).hp = 5000;
  }
  room.eventBuffer.length = 0;
  return at;
}
const hitsOn = (pid) => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.targetId === pid).map((e) => e.payload);
const len = (kb) => Math.hypot(kb[0], kb[1]);

/* ── 1. the blowback ── */
{
  stage('flora');
  const now = Date.now();
  room._resolveSlimeBurst(WHEEL_ZONE, slime, now);
  const h = hitsOn('p1')[0];
  check('1: the blast hurts the one beside it', !!h && h.dmgTaken > 0 && P('p1').hp < 5000, h);
  check('1: and blows them SHOVE px straight away from it (east)', !!h && Array.isArray(h.kb)
    && Math.abs(len(h.kb) - SLIME_BURST.SHOVE) <= 1 && h.kb[0] > 0 && Math.abs(h.kb[1]) <= 1, h && h.kb);
  check('1: "a bit": between the swing\'s gust and the roar\'s', SLIME_BURST.SHOVE > GUST.PX && SLIME_BURST.SHOVE < 130);
  check('1: over SHOVE_MS, no gust status of its own (a flora slime\'s hold stays its st)',
    !!h && h.kbMs === SLIME_BURST.SHOVE_MS && h.st !== 'gust', h);
  check('1: the worker grants the room for it', P('p1')._gustLeft >= SLIME_BURST.SHOVE && P('p1')._gustLeft <= Math.ceil(SLIME_BURST.SHOVE * 1.25) + 1
    && P('p1')._gustUntil > now, { left: P('p1')._gustLeft });
  const h3 = hitsOn('p3')[0];
  check('1: one north of it is blown north', !!h3 && Array.isArray(h3.kb) && h3.kb[1] < 0 && Math.abs(len(h3.kb) - SLIME_BURST.SHOVE) <= 1, h3 && h3.kb);
  check('1: one outside the blast: nothing', hitsOn('p2').length === 0 && P('p2')._gustLeft === 0);
  check('1: the slime carries no shove after its blow', !(slime._gustPx > 0) && !(slime._gustMs > 0));
}

/* ── 2. a shield ── */
{
  stage('flora');
  /* p1 is east of the slime: facing it is facing west (PI) */
  Object.assign(P('p1'), { blocking: true, ba: Math.PI });
  room._resolveSlimeBurst(WHEEL_ZONE, slime, Date.now());
  const b = hitsOn('p1')[0];
  check('2: a shield facing it blocks the blast: no damage, no shove', !!b && b.blocked === true && !b.kb && P('p1').hp === 5000 && P('p1')._gustLeft === 0, b);
}

/* ── 3. a wind slime ── */
{
  stage('wind');
  room._resolveSlimeBurst(WHEEL_ZONE, slime, Date.now());
  const h = hitsOn('p1')[0];
  check('3: a wind slime\'s gust IS the blowback: 90 px, st gust, no second kb field', !!h && h.st === 'gust' && Array.isArray(h.kb)
    && Math.abs(len(h.kb) - SLIME_BURST.SHOVE) <= 1 && h.stMs === SLIME_BURST.SHOVE_MS && h.kbMs === undefined, h);
  check('3: granted once, not twice', P('p1')._gustLeft <= Math.ceil(SLIME_BURST.SHOVE * 1.25) + 1, { left: P('p1')._gustLeft });
}

/* ── 4. the splitting boss's blast (slimeboss.js: the same kit) ── */
{
  const at = stage('flora');
  const kit = { kind: 'burst', radius: 180, dmgMult: 1, flat: SLIME_BURST.DMG };
  room._telegraphHitPlayer(WHEEL_ZONE, slime, 'p1', kit);
  const h = hitsOn('p1')[0];
  check('4: a boss\'s split blast blows back the same way', !!h && Array.isArray(h.kb) && h.kb[0] > 0 && Math.abs(len(h.kb) - SLIME_BURST.SHOVE) <= 1, h);
  check('4: a plain kit (a slam) shoves nothing of the blast\'s', (() => {
    stage('flora');
    room._telegraphHitPlayer(WHEEL_ZONE, slime, 'p1', { kind: 'slam', radius: 90, dmgMult: 1 });
    const s = hitsOn('p1')[0];
    return !!s && !s.kb && !s.kbMs;
  })());
  void at;
}

/* ── 5. the kill switch ── */
{
  stage('flora');
  withFlags({ slimeshove: false }, () => room._resolveSlimeBurst(WHEEL_ZONE, slime, Date.now()));
  const h = hitsOn('p1')[0];
  check('5: `slimeshove: false`: the blast still hurts', !!h && h.dmgTaken > 0, h);
  check('5: ...and shoves nothing', !!h && !h.kb && !h.kbMs && P('p1')._gustLeft === 0, h);
  stage('wind');
  withFlags({ slimeshove: false }, () => room._resolveSlimeBurst(WHEEL_ZONE, slime, Date.now()));
  const w = hitsOn('p1')[0];
  check('5: a wind slime\'s blast with it off is its plain gust again (48 px)', !!w && w.st === 'gust' && Math.abs(len(w.kb) - GUST.PX) <= 1, w);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
