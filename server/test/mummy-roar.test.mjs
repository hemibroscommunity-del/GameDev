/* THE MUMMY'S ROAR -- v2.3.3621 (server/src/telegraph.js TELEGRAPH.ELEM_KITS,
 * _kitFor; monsterstatus.js the longer shove).
 *
 * The owner's list of 2026-10-26: "Mummies: today a 48 px shove when they
 * hit.  Then: a roar, wound up so you can see it coming, that blows you back
 * from a few steps away."
 *   1. WHO ROARS: a wind monster (the Wind Dunes' mummies, whatever their
 *      archetype); a brute keeps its slam and fodder its lunge; a snowman and
 *      a monster with no element have no kit; `mummyroar: false` none.
 *   2. THE WIND-UP: a mummy in cast range winds up a roar -- the ring, its
 *      size and length on the event -- and deals nothing while it does.
 *   3. THE ROAR: everyone within its ring, measured where each one is when it
 *      goes off, takes half a hit and is blown back its shove straight away
 *      from it, the worker granting the room; one outside the ring nothing;
 *      the execute says it landed.
 *   4. A SHIELD facing it blocks it (no shove); a player walked out of the
 *      ring before it goes is missed.
 *   5. AFTER: its cooldown; the mummy's own swing still shoves 48 px; the
 *      switch thrown mid-roar ends the cast quietly. */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { TELEGRAPH } from '../src/telegraph.js';
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
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
const mummy = wheel.find((m) => m.home === 'sky');

function alongSpoke(m, r) {
  const ux = m.spawnX - WHEEL_CENTRE[0], uy = m.spawnY - WHEEL_CENTRE[1], ul = Math.hypot(ux, uy);
  return { x: WHEEL_CENTRE[0] + (ux / ul) * r, y: WHEEL_CENTRE[1] + (uy / ul) * r };
}
/* the mummy out on its spoke; p1 at 60 px east of it, p2 100 px north, p3 300 px west */
function stage() {
  const at = alongSpoke(mummy, WHEEL_SAFE_R + 600);
  Object.assign(mummy, { x: at.x, y: at.y, alive: true, hp: mummy.maxHp, atkCd: 0, _attackingUntil: 0,
    _tgPhase: null, _tgUntil: 0, _tgAim: null, _tgTarget: null, _tgNextAt: 0, _tgRadius: 0, statuses: {} });
  const place = { p1: [60, 0], p2: [0, -100], p3: [-300, 0] };
  for (const id of Object.keys(place)) {
    const ps = P(id);
    Object.assign(ps, { z: WHEEL_ZONE, x: at.x + place[id][0], y: at.y + place[id][1], dead: false, dying: false, disconnected: false,
      blocking: false, ba: null, _zoneEntryGraceUntil: 0, _godUntil: 0, _gustLeft: 0, _gustUntil: 0, _stuckUntil: 0, _dazeUntil: 0 });
    ps.maxHp = 5000; ps.hp = 5000;
  }
  room.eventBuffer.length = 0;
}
const abilities = () => room.eventBuffer.filter((e) => e.type === 'monster_ability' && e.payload.monsterId === mummy.id);
const hitsOn = (id) => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.targetId === id).map((e) => e.payload);
const withFlags = (flags, fn) => { const keep = room._liveFlags; room._liveFlags = Object.assign({}, keep || {}, flags); try { return fn(); } finally { room._liveFlags = keep; } };

/* ── 1. who roars ── */
{
  check('1: the Wind Dunes have a mummy (guard)', !!mummy && mummy.element === 'wind', mummy && { arch: mummy.arch, el: mummy.element });
  const k = room._kitFor(mummy);
  check('1: a wind monster roars (its element\'s kit, whatever its archetype)', !!k && k.kind === 'roar' && k === TELEGRAPH.ELEM_KITS.wind, k);
  const allSky = wheel.filter((m) => m.home === 'sky');
  check(`1: every one of the Wind Dunes' ${allSky.length} roars`, allSky.every((m) => (room._kitFor(m) || {}).kind === 'roar'));
  check('1: a brute keeps its slam, fodder its lunge (an archetype\'s kit first)',
    room._kitFor({ arch: 'brute', element: 'wind' }) === TELEGRAPH.KITS.brute && room._kitFor({ arch: 'fodder', element: 'wind' }) === TELEGRAPH.KITS.fodder);
  check('1: a snowman, and a monster with no element, have none',
    room._kitFor(wheel.find((m) => m.home === 'frost')) === null && room._kitFor({ arch: 'hexer' }) === null && room._kitFor({ arch: 'hexer', element: '__proto__' }) === null);
  check('1: `mummyroar: false`: no roar', withFlags({ mummyroar: false }, () => room._kitFor(mummy)) === null);
  const R = TELEGRAPH.ELEM_KITS.wind;
  check('1: "from a few steps away": its ring wider than a swing\'s reach, its shove longer than the swing\'s 48 px, under the shove the phone accepts (200)',
    R.radius > room.MONSTER_ATTACK_RANGE * 1.5 && R.shove > GUST.PX * 2 && R.shove <= 200 && R.windupMs >= 800 && R.cooldownMs >= 5 * room.MONSTER_ATTACK_CD, R);
}

/* ── 2. the wind-up ── */
{
  stage();
  const t0 = Date.now();
  const started = room._maybeStartTelegraph(WHEEL_ZONE, mummy, { id: 'p1', extracting: false }, 60, t0);
  const tele = abilities()[0];
  check('2: a mummy in cast range winds up a roar', started && !!tele && tele.payload.ability === 'roar' && tele.payload.phase === 'telegraph'
    && tele.payload.radius === TELEGRAPH.ELEM_KITS.wind.radius && tele.payload.ms === TELEGRAPH.ELEM_KITS.wind.windupMs, tele && tele.payload);
  check('2: ...and deals nothing while it does', hitsOn('p1').length === 0 && hitsOn('p2').length === 0 && P('p1').hp === 5000);
  check('2: ...planted for the tell', mummy._tgPhase === 'telegraph' && mummy._attackingUntil > t0);
}

/* ── 3. the roar ── */
{
  room.eventBuffer.length = 0;
  mummy._tgUntil = Date.now() - 1;
  const now = Date.now();
  room._resolveMonsterTelegraph(WHEEL_ZONE, mummy, now);
  const h1 = hitsOn('p1')[0], h2 = hitsOn('p2')[0], h3 = hitsOn('p3');
  const len = (h) => (h && Array.isArray(h.kb) ? Math.hypot(h.kb[0], h.kb[1]) : 0);
  const R = TELEGRAPH.ELEM_KITS.wind;
  check(`3: everyone in its ring is blown back ${R.shove} px (${Math.round(len(h1))}, ${Math.round(len(h2))}) over ${R.shoveMs} ms, with the wind on the number`,
    !!h1 && !!h2 && h1.st === 'gust' && h2.st === 'gust' && Math.abs(len(h1) - R.shove) <= 2 && Math.abs(len(h2) - R.shove) <= 2
      && h1.stMs === R.shoveMs && h1.elem === 'wind' && h1.ability === 'roar', { h1, h2 });
  check('3: ...each straight away from it (east of it east, north of it north)',
    h1 && h1.kb[0] > 100 && Math.abs(h1.kb[1]) <= 2 && h2 && h2.kb[1] < -100 && Math.abs(h2.kb[0]) <= 2, { kb1: h1 && h1.kb, kb2: h2 && h2.kb });
  const half = Math.ceil(mummy.dmg * R.dmgMult);
  check(`3: ...for half a hit (${h1 && h1.dmg} of ${mummy.dmg})`, !!h1 && h1.dmg > 0 && h1.dmg <= half + 1, { dmg: h1 && h1.dmg, half });
  check('3: one outside its ring: nothing', h3.length === 0, h3);
  check('3: the worker grants the room for the shove (the move check reads it)',
    P('p1')._gustLeft >= R.shove && P('p1')._gustLeft <= Math.ceil(R.shove * 1.25) + 1 && P('p1')._gustUntil > now, { left: P('p1')._gustLeft });
  const ex = abilities().find((e) => e.payload.phase === 'execute');
  check('3: the execute says it landed, at its ring', !!ex && ex.payload.hit === true && ex.payload.radius === R.radius, ex && ex.payload);
  check('3: its cooldown starts', mummy._tgNextAt >= now + R.cooldownMs - 5 && mummy._tgPhase === null);
  check('3: the shove\'s size went with the roar (none left on the mummy)', !mummy._gustPx && !mummy._gustMs);
}

/* ── 4. a shield, and stepping out ── */
{
  stage();
  room._maybeStartTelegraph(WHEEL_ZONE, mummy, { id: 'p1', extracting: false }, 60, Date.now());
  /* p1 faces it with a shield (it is east of the mummy: the mummy is west, angle PI) */
  Object.assign(P('p1'), { blocking: true, ba: Math.PI });
  /* p2 walks out of the ring before it goes */
  P('p2').y = mummy.y - 400;
  room.eventBuffer.length = 0;
  mummy._tgUntil = Date.now() - 1;
  room._resolveMonsterTelegraph(WHEEL_ZONE, mummy, Date.now());
  const b = hitsOn('p1')[0];
  check('4: a shield facing it blocks the roar: no shove, no damage', !!b && b.blocked === true && !b.kb && P('p1').hp === 5000, b);
  check('4: walked out of the ring before it goes: missed', hitsOn('p2').length === 0);
}

/* ── 5. after ── */
{
  stage();
  room.eventBuffer.length = 0;
  room._monsterStrikePlayer(WHEEL_ZONE, mummy, 'p1', mummy.x, mummy.y);
  const s = hitsOn('p1')[0];
  check(`5: the mummy's own swing still shoves ${GUST.PX} px over ${GUST.MS} ms`, !!s && s.st === 'gust' && Math.abs(Math.hypot(s.kb[0], s.kb[1]) - GUST.PX) <= 2 && s.stMs === GUST.MS, s);
  stage();
  room._maybeStartTelegraph(WHEEL_ZONE, mummy, { id: 'p1', extracting: false }, 60, Date.now());
  withFlags({ mummyroar: false }, () => {
    room.eventBuffer.length = 0;
    mummy._tgUntil = Date.now() - 1;
    const owned = room._resolveMonsterTelegraph(WHEEL_ZONE, mummy, Date.now());
    check('5: the switch thrown mid-roar: the cast ends quietly (no blow, the mummy free to swing)',
      owned === false && mummy._tgPhase === null && hitsOn('p1').length === 0 && hitsOn('p2').length === 0);
  });
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
