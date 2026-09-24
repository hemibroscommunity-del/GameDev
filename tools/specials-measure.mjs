/* ═══ v2.3.2849: WHAT EACH SPECIAL IS WORTH, THROUGH THE WORKER'S OWN HANDLER ═══
 *
 * docs/specs/specials-rebalance.md's tables come from this.  It joins a real
 * GameRoom on the mocked storage the server suites use, hands the character
 * the starter kit (Copper Great Sword, Pine Bow, Pine Staff), parks a target
 * with six monsters round it inside the staff bolt's blast, and drives
 * monster_damage through webSocketMessage -- so the lanes, the ceilings,
 * `part`, `orbs` and the splash scan are all the real ones.
 *
 * TRAPS §118: every hit trains the skill that dealt it, and a few thousand
 * measured hits level the character up mid-run (the first cut read the
 * greatsword's special at ~166 instead of ~41).  _prog3AwardXp is stubbed.
 *
 *   node tools/specials-measure.mjs [N=4000] [--level L=1] [--ticks T=4]
 * --ticks is how many burn ticks the bow volley lands (a volley burns 2.5 s
 * at 500 ms: 4; the lone arrow's 4 s: 7).  Zero dependencies.
 */
import { GameRoom } from '../server/src/index.js';
import { BLACKSMITH_TIERS, WOODWORKING_TIERS } from '../server/src/data.js';

const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? Number(argv[i + 1]) : def; };
const N = Number(argv.find((a) => /^\d+$/.test(a)) || 4000);
const LVL = flag('--level', 1);
const TICKS = flag('--ticks', 4);

const mockState = { storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} }, getWebSockets: () => [], acceptWebSocket: () => {} };
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const room = new GameRoom(mockState, mockEnv);
const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'pm', name: 'Meas', protocolVersion: 2, data: { x: -100000, y: -100000, z: 'meadow' } }));
const ps = room.playerState.pm;
room._prog3AwardXp = () => {};   /* measuring, not training -- TRAPS §118 */
if (ps.prog3 && ps.prog3.sk) for (const c of ['sword', 'bow', 'staff']) ps.prog3.sk[c].level = LVL;
ps.weapon = { type: 'greatsword', tierMult: BLACKSMITH_TIERS.copper.tierMult, gearBase: 'copper', quality: 'normal' };
ps.rangedWeapon = { type: 'bow', tierMult: WOODWORKING_TIERS.pine.tierMult, gearBase: 'ww_pine', quality: 'normal' };
ps.staffWeapon = { type: 'staff', tierMult: WOODWORKING_TIERS.pine.tierMult, gearBase: 'ww_pine', quality: 'normal' };
ps.z = 'meadow';

const mons = room.monsters.meadow;
const tgt = mons[0];
const pack = mons.slice(1, 7);
const reset = () => {
  if (ps._monHitCad) ps._monHitCad.clear();
  tgt.x = 1000; tgt.y = 1000;
  pack.forEach((m, i) => { const a = i / pack.length * Math.PI * 2; m.x = 1000 + Math.cos(a) * 50; m.y = 1000 + Math.sin(a) * 50; });
  for (const m of [tgt, ...pack]) { m.alive = true; m.hp = m.maxHp = 1e9; m.dmgByPlayer = Object.create(null); m.statuses = undefined; }
  ps.x = 900; ps.y = 1000;
  room.eventBuffer.length = 0;
};
const send = (payload) => room.webSocketMessage(ws, JSON.stringify({ type: 'monster_damage', payload: { monsterId: tgt.id, zone: 'meadow', ...payload } }));
const hits = () => room.eventBuffer.filter((e) => e.type === 'monster_hit' && !e.payload.collision);
const onTgt = () => hits().filter((e) => e.payload.monsterId === tgt.id).reduce((s, e) => s + e.payload.dmg, 0);
const stat = (xs) => {
  if (!xs.length) return null;
  xs = xs.slice().sort((a, b) => a - b);
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length);
  const q = (p) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))];
  return { mean: +m.toFixed(1), cv: Math.round(sd / m * 100) + '%', min: xs[0], p10: q(0.1), p50: q(0.5), p90: q(0.9), max: xs[xs.length - 1] };
};

const out = {};
{ const xs = []; for (let i = 0; i < N; i++) { reset(); await send({ slot: 'melee', special: true }); xs.push(onTgt()); } out['greatsword special, each monster'] = stat(xs); }
{ const up = [], burn = [], tot = [];
  for (let i = 0; i < N; i++) {
    reset(); for (let a = 0; a < 3; a++) await send({ slot: 'ranged', special: true, part: 3 });
    const u = onTgt(); room.eventBuffer.length = 0;
    for (let t = 0; t < TICKS; t++) { const c = ps._monHitCad && ps._monHitCad.get(tgt.id); if (c) c.n = 0; await send({ slot: 'ranged', special: false, noKb: true }); }
    const b = onTgt(); up.push(u); burn.push(b); tot.push(u + b);
  }
  out['bow volley, arrows'] = stat(up); out[`bow volley, burn (${TICKS} ticks)`] = stat(burn); out['bow volley, total'] = stat(tot);
}
{ const xs = [], nb = [];
  for (let i = 0; i < N; i++) {
    reset(); await send({ slot: 'staff', special: true, orbs: 3 });
    xs.push(onTgt());
    for (const e of hits()) if (e.payload.monsterId !== tgt.id) nb.push(e.payload.dmg);
  }
  out['staff big bolt, its target'] = stat(xs);
  out['staff big bolt, each monster in the blast'] = stat(nb);
}
console.log(`fresh character, skill ${LVL}, starter kit, ${N} specials each (special ceiling ${room._maxDmgForAttacker(ps, true)})`);
for (const [k, v] of Object.entries(out)) console.log('  ' + k.padEnd(44), v ? JSON.stringify(v) : '(none)');
