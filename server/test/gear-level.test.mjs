/* ARMOUR, SHIELDS AND AMULETS ASK YOUR LEVEL -- v2.3.3544
 * (docs/specs/gear-level.md, gear.js _gearOnLevel).
 *
 * The owner, of one level: "I'm thinking of gating armor and weapons on combat
 * level instead of primary combat skill level and defense level."  What you
 * WEAR asks the character level (one level: the best weapon's), at the very
 * numbers it asked in Defense points; weapons keep their own skill.
 *
 *   1. A new character's join advertises caps.gearlevel.
 *   2. Through the real doors -- forge_armor, then stats_update {armorRef} --
 *      a Black Steel Torso is refused at level 1 and at level 4 (even with 30
 *      Defense points), and worn at level 5 with none; the level is the best
 *      weapon's, so a Bow 5 character wears it too.
 *   3. `gearlevel: false` through the admin route: Defense points again (level
 *      30 refused with none, worn with 5), and the next join is told.
 *   4. `onelevel: false` puts Defense points back too (a sum of three reads 3
 *      for a new character, so "level 5" would mean little).
 *   5. The page: canEquipItem and the card's words ("Level 5", you 4) against
 *      caps.gearlevel; Defense points without it.
 */
import { GameRoom } from '../src/index.js';
import { setProg3Enabled } from '../../src/data/prog3.js';
import { setOneLevelEnabled, setGearOnLevel } from '../../src/data/oneFormula.js';
import { canEquipItem, getEquipReqLabel, prog3GearReq } from '../../src/data/gameSystems.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const settle = () => new Promise((r) => setTimeout(r, 5));

const room = new GameRoom(makeState(), mockEnv);
room._liveFlags = {};
async function join(ws, id) {
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
}
const capsOf = (ws) => { const m = ws.sent.find((x) => x.type === 'state_sync' && x.caps); return m ? m.caps : null; };
const flag = async (name, value) => {
  const json = (o) => o;
  if (value === undefined) await room._liveopsRoutes({ method: 'DELETE', json: async () => ({}) }, new URL('http://x/admin/flags?name=' + name), '/flags', json);
  else await room._liveopsRoutes({ method: 'POST', json: async () => ({ name, value }) }, new URL('http://x/admin/flags'), '/flags', json);
};

// ── 1. the join ──
const PID = 'bp_gearlevel_a';
const ws = fakeWs();
await join(ws, PID);
const ps = () => room.playerState[PID];
check('1: a new character\'s join advertises caps.gearlevel', !!capsOf(ws) && capsOf(ws).gearlevel === true, capsOf(ws) && capsOf(ws).gearlevel);
check('1: ...beside one level, which it needs', capsOf(ws).onelevel === true);

// ── 2. a Black Steel Torso through the real doors ──
const setSkills = (sw, bw, st) => {
  ps().prog3.sk.sword = { level: sw, xp: 0 };
  ps().prog3.sk.bow = { level: bw, xp: 0 };
  ps().prog3.sk.staff = { level: st, xp: 0 };
  room._prog3Recompute(ps());
};
const setDef = (d) => { ps().prog3.alloc = { ...(ps().prog3.alloc || {}), def: d }; };
const wear = async (gid) => room.webSocketMessage(ws, JSON.stringify({ type: 'stats_update', payload: { armorRef: gid } }));
const off = async () => room.webSocketMessage(ws, JSON.stringify({ type: 'stats_update', payload: { armorRef: null } }));
ps().lifeSkills = { ...(ps().lifeSkills || {}), blacksmithing: { level: 10, xp: 0 } };
ps().inventory = { ...(ps().inventory || {}), bar_black_steel: 5 };
ws.sent.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'forge_armor', payload: { recipe: 'blacksteel_torso' } }));
const made = ws.sent.find((m) => m.type === 'forge_armor_result');
const bs = made && made.payload && made.payload.piece;
check('2: the forge makes a Black Steel Torso, by its id (guard)', !!bs && bs.name === 'Black Steel Torso' && typeof bs.gid === 'string', bs);
{
  setSkills(1, 1, 1); setDef(0);
  await wear(bs.gid);
  check('2: at level 1 it stays in the bag', !ps().armor, ps().armor);
  setSkills(4, 1, 1); setDef(30);
  await wear(bs.gid);
  check('2: ...and at level 4, even with 30 Defense points (they no longer count)', !ps().armor, { level: ps().level, armor: ps().armor });
  setSkills(5, 1, 1); setDef(0);
  await wear(bs.gid);
  check('2: at level 5 it goes on, with no Defense point at all', !!ps().armor && ps().armor.gid === bs.gid, { level: ps().level, armor: ps().armor });
  await off();
  setSkills(1, 5, 1);
  await wear(bs.gid);
  check('2: the level is the BEST weapon\'s: a Bow 5 character (Melee 1) wears it too', !!ps().armor && ps().armor.gid === bs.gid && ps().level === 5, { level: ps().level, armor: ps().armor });
  await off();
}

// ── 3. the kill switch, thrown live ──
{
  await flag('gearlevel', false);
  setSkills(30, 1, 1); setDef(0);
  await wear(bs.gid);
  check('3: gearlevel false through the admin route: Defense points again -- level 30 with none, refused', !ps().armor, ps().armor);
  setDef(5);
  await wear(bs.gid);
  check('3: ...and worn with 5', !!ps().armor && ps().armor.gid === bs.gid, ps().armor);
  await off();
  const ws2 = fakeWs();
  await join(ws2, 'bp_gearlevel_b');
  check('3: ...and the next join is told (caps.gearlevel false)', !!capsOf(ws2) && capsOf(ws2).gearlevel === false, capsOf(ws2) && capsOf(ws2).gearlevel);
  await flag('gearlevel');
  check('3: switched back: the level again', room._gearOnLevel() === true);
}

// ── 4. only with one level ──
{
  await flag('onelevel', false);
  const ws3 = fakeWs();
  await join(ws3, 'bp_gearlevel_c');
  check('4: onelevel false: caps.gearlevel false too, and the gate asks Defense points', !!capsOf(ws3) && capsOf(ws3).gearlevel === false && room._gearOnLevel() === false,
    capsOf(ws3) && capsOf(ws3).gearlevel);
  await flag('onelevel');
  setSkills(1, 1, 1);
}

// ── 5. the page ──
{
  setProg3Enabled(true);
  setOneLevelEnabled(true);
  setGearOnLevel(true);
  const rpg = (L, def) => ({ prog3: { sk: { sword: { level: L }, bow: { level: 1 }, staff: { level: 1 } }, alloc: { def }, atk: {}, pool: {}, ms: {} } });
  const piece = { name: 'Black Steel Torso', mat: 'blacksteel', tierMult: 3 };
  const lab = getEquipReqLabel(piece, 'armor', rpg(4, 30));
  check('5: against caps.gearlevel the card reads "Level 5", you 4, not met -- and the gate agrees',
    !!lab && lab.stat === 'level' && lab.label === 'Level' && lab.req === 5 && lab.have === 4 && lab.met === false
      && canEquipItem(rpg(4, 30), piece, 'armor') === false && canEquipItem(rpg(5, 0), piece, 'armor') === true, lab);
  const shieldReq = prog3GearReq(rpg(9, 0), 'shield', 2);
  check('5: ...the forge\'s shield line too ("Level 10", you 9)', shieldReq.label === 'Level' && shieldReq.value === 10 && shieldReq.have === 9 && shieldReq.met === false, shieldReq);
  setGearOnLevel(false);
  const old = getEquipReqLabel(piece, 'armor', rpg(30, 4));
  check('5: without it (an older worker, or the switch), Defense points as before: "Defense 5", you 4',
    !!old && old.stat === 'defensePts' && old.label === 'Defense' && old.req === 5 && old.have === 4 && old.met === false
      && canEquipItem(rpg(30, 4), piece, 'armor') === false && canEquipItem(rpg(1, 5), piece, 'armor') === true, old);
  setOneLevelEnabled(false);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
