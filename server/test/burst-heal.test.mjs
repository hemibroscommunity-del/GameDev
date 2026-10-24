/* v2.3.3600: A SLIME'S BLAST ON ITS KILLER FORFEITS THE MELEE HEAL.
   The owner: "If the slime death damage happens forfeit your heal on melee.
   I keep healing simultaneously as the damage and it just shows a heal
   message".  telegraph.js _resolveSlimeBurst marks `_burstHitKiller` when
   the blast reaches the killer; combat.js's kill then pays no lifesteal
   (reason 'burst') and forgets what that slime dealt.  A killer the blast
   misses keeps the heal. */
import { GameRoom } from '../src/index.js';
import { SLIME_BURST } from '../src/telegraph.js';

const mockState = () => ({
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
});
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}
Math.random = () => 0.999;

const room = new GameRoom(mockState(), mockEnv);
const ws = fakeWs('p1');
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'p1', name: 'P1', protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
const P = room.playerState.p1;
const zone = P.z;

function run(near) {
  ws.sent.length = 0;
  P.dead = false; P.dying = false; P.maxHp = 1000; P.hp = 500; P.activeSlot = 'melee';
  const m = { id: 'm' + (near ? 'n' : 'f'), x: P.x + (near ? 10 : 2000), y: P.y, hp: 0, maxHp: 50, level: 1, xp: 1,
    arch: 'slime', variant: Object.keys(SLIME_BURST.VARIANTS)[0], alive: true };
  (room.monsters[zone] = room.monsters[zone] || []).push(m);
  P.dmgFromMonster = { [m.id]: 200 };
  const now = Date.now();
  m._burstUntil = now - 1; m._burstR = 400; m._burstKiller = 'p1'; m._burstSlot = 'melee';
  const before = P.hp;
  room._resolveSlimeBurst(zone, m, now);
  const ls = ws.sent.find((e) => e.type === 'lifesteal_credit');
  return { before, after: P.hp, ls: ls && ls.payload, left: P.dmgFromMonster && P.dmgFromMonster[m.id], flag: m._burstHitKiller };
}

const a = run(true);
check('the blast on its killer pays no heal: lifesteal_credit refund 0, reason "burst"', a.ls && a.ls.refund === 0 && a.ls.reason === 'burst', a);
check('...the killer is not healed by the kill (hp no higher than before the blast)', a.after <= a.before, a);
check('...what that slime dealt is forgotten, and the mark is cleared after', a.left === undefined && a.flag === false, a);
const b = run(false);
check('a killer the blast misses keeps the heal (refund > 0)', b.ls && b.ls.refund > 0 && b.ls.reason === 'ok', b);

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
