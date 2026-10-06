/* The armor forge -- bars into armor (v2.3.3092, server/src/armorforge.js).
 *
 * Asked "Should smelted bars make armour?", the owner said "Yes".
 *
 *   1. caps.armorforge is advertised, under a name the liveflags route takes.
 *   2. A copper torso: exactly five copper bars taken, the piece minted into
 *      the ledger (src 'forge') with its id, metal, slot, step and a rolled
 *      grade -- and NO gearBase or type, which would move it off the armor
 *      ladder; the Smithing XP paid; forge_armor_result + player_state.
 *   3. Copper greaves: three bars, the legs slot.
 *   4. Refusals leave everything as it was: a Smithing level short, bars
 *      short, a junk / inherited / unknown recipe, a dead player.
 *   5. Iron at Smithing 5, black steel at 10: their own bars, their own step.
 *   6. The piece is worn by its id (stats_update armorRef), as every minted
 *      piece is; black steel asks 5 Defense first (armorDefReq).
 *   7. The kill switch refuses and un-advertises.
 */
import { GameRoom } from '../src/index.js';
import { ARMOR_FORGE } from '../src/armorforge.js';
import { SMELT } from '../src/smelting.js';
import { LIVEOPS } from '../src/liveops.js';

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
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(makeState(), mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const forge = async (ws, payload) => {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'forge_armor', payload }));
  return ws.sent.find((m) => m.type === 'forge_armor_result') || null;
};

const PID = 'bp_armorforge_a';
const ws = fakeWs();
await join(ws, PID);
const ps = () => room.playerState[PID];
const smith = () => (ps().lifeSkills && ps().lifeSkills.blacksmithing) || { level: 1, xp: 0 };
const setSmith = (level) => { ps().lifeSkills = ps().lifeSkills || {}; ps().lifeSkills.blacksmithing = { level, xp: 0 }; };
const rows = () => ((room._gearProvOf(PID) || { list: [] }).list || []);
/* what XP `xp` does to a skill at `level` -- the worker's own curve, so this
   suite holds whatever a level costs */
const after = (level, xp) => { const t = { lifeSkills: { s: { level, xp: 0 } } }; const r = room._addLifeSkillXp(t, 's', xp); return { level: t.lifeSkills.s.level, xp: t.lifeSkills.s.xp, leveled: r.leveled }; };

// ── 1. caps ──
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.armorforge is advertised', !!sync && sync.caps.armorforge === true);
  check('...under a name the liveflags route accepts (lower case: a kill switch)', LIVEOPS.FLAG_NAME_RE.test('armorforge'));
  check('every recipe is forged from a bar the smelter makes, and opens no earlier than that bar',
    Object.values(ARMOR_FORGE.RECIPES).every((r) => Object.prototype.hasOwnProperty.call(SMELT.RECIPES, r.bar) && r.minLvl >= SMELT.RECIPES[r.bar].minLvl));
}

// ── 2. A copper torso ──
{
  setSmith(1);
  ps().inventory.bar_copper = 7;
  const rows0 = rows().length;
  const want = after(1, ARMOR_FORGE.RECIPES.copper_torso.xp);
  const r = await forge(ws, { recipe: 'copper_torso' });
  const p = r && r.payload && r.payload.piece;
  check('a copper torso takes exactly five copper bars', ps().inventory.bar_copper === 2, ps().inventory);
  check('...and makes the piece the game already knows: Copper Torso, copper, the chest, step 1',
    !!p && p.name === 'Copper Torso' && p.mat === 'copper' && p.slot === 'armor' && p.tierMult === 1, p);
  check('...with a grade rolled as every piece\'s is', !!p && ['normal', 'rare', 'elite', 'godly'].indexOf(p.quality) >= 0, p && p.quality);
  check('...and NO gearBase or type (either would move it off the armor ladder)', !!p && !('gearBase' in p) && !('type' in p), p);
  const row = rows().find((x) => p && x.id === p.gid);
  check('...minted into the ledger with its id, from the forge', !!p && typeof p.gid === 'string' && p.prov === 'minted'
    && rows().length === rows0 + 1 && !!row && row.slot === 'armor' && row.src === 'forge', { gid: p && p.gid, row });
  check('...and pays the Smithing XP (' + ARMOR_FORGE.RECIPES.copper_torso.xp + ')', smith().level === want.level && smith().xp === want.xp, { smith: smith(), want });
  check('...announced in forge_armor_result', !!r && r.payload.recipe === 'copper_torso' && r.payload.xp === ARMOR_FORGE.RECIPES.copper_torso.xp
    && r.payload.fromLevel === 1 && r.payload.newLevel === want.level && r.payload.leveled === want.leveled, r && r.payload);
  check('...followed by a player_state', ws.sent.some((m) => m.type === 'player_state'));
}

// ── 3. Copper greaves ──
{
  setSmith(1);
  ps().inventory.bar_copper = 3;
  const r = await forge(ws, { recipe: 'copper_greaves' });
  const p = r && r.payload && r.payload.piece;
  check('copper greaves take three bars, for the legs slot', !(ps().inventory.bar_copper > 0) && !!p && p.slot === 'legsArmor' && p.name === 'Copper Greaves'
    && rows().some((x) => x.id === p.gid && x.slot === 'legsArmor'), { inv: ps().inventory, p });
}

// ── 4. Refusals ──
{
  const snap = () => JSON.stringify({ inv: ps().inventory, smith: smith(), rows: rows().length });
  setSmith(4);
  ps().inventory.bar_iron = 9;
  ps().inventory.bar_copper = 2;
  let s0 = snap();
  let r = await forge(ws, { recipe: 'iron_torso' });
  check('iron at Smithing 4: refused, nothing taken', r === null && snap() === s0);
  r = await forge(ws, { recipe: 'copper_torso' });
  check('two copper bars for a torso: refused, nothing taken', r === null && snap() === s0);
  const junk = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'mythril_torso', '', 5, null, { recipe: 'copper_torso' }];
  let bad = 0;
  for (const k of junk) { if (await forge(ws, { recipe: k })) bad++; }
  if (await forge(ws, null)) bad++;
  check('junk, inherited and unknown recipes forge nothing', bad === 0 && snap() === s0, { bad, after: snap() });
  ps().inventory.bar_copper = 9;
  setSmith(3);
  s0 = snap();
  ps().dead = true;
  r = await forge(ws, { recipe: 'copper_torso' });
  ps().dead = false;
  check('a dead player forges nothing', r === null && snap() === s0);
}

// ── 5. Iron and black steel ──
{
  setSmith(5);
  ps().inventory.bar_iron = 5;
  let r = await forge(ws, { recipe: 'iron_torso' });
  let p = r && r.payload && r.payload.piece;
  check('iron at Smithing 5: an Iron Torso, step 2, from five iron bars', !!p && p.name === 'Iron Torso' && p.mat === 'iron' && p.tierMult === 2 && !(ps().inventory.bar_iron > 0), p);
  setSmith(9);
  ps().inventory.bar_black_steel = 4;
  r = await forge(ws, { recipe: 'blacksteel_greaves' });
  check('black steel at Smithing 9: refused', r === null && ps().inventory.bar_black_steel === 4);
  setSmith(10);
  r = await forge(ws, { recipe: 'blacksteel_greaves' });
  p = r && r.payload && r.payload.piece;
  check('...at 10: Black Steel Greaves, step 3, in the metal the art calls blacksteel', !!p && p.name === 'Black Steel Greaves' && p.mat === 'blacksteel'
    && p.tierMult === 3 && p.slot === 'legsArmor' && ps().inventory.bar_black_steel === 1, p);
}

// ── 6. Worn by its id ──
{
  const send = (payload) => room.webSocketMessage(ws, JSON.stringify({ type: 'stats_update', payload }));
  setSmith(10);
  ps().inventory.bar_copper = 5;
  const cu = (await forge(ws, { recipe: 'copper_torso' })).payload.piece;
  await send({ armorRef: cu.gid });
  check('a forged torso is worn by its id: the worker\'s own copy', !!ps().armor && ps().armor.gid === cu.gid && ps().armor.mat === 'copper' && ps().armor.prov === 'minted', ps().armor);
  ps().inventory.bar_black_steel = 5;
  const bs = (await forge(ws, { recipe: 'blacksteel_torso' })).payload.piece;
  const had = ps().armor && ps().armor.gid;
  await send({ armorRef: bs.gid });
  const def = room._prog3EquipOk ? room._prog3EquipOk(ps(), 'armor', bs) : null;
  check('black steel asks 5 Defense first: without it, the copper stays on', def === false && !!ps().armor && ps().armor.gid === had, { def, worn: ps().armor && ps().armor.name });
}

// ── 7. Kill switch ──
{
  room._liveFlags = { ...(room._liveFlags || {}), armorforge: false };
  setSmith(10);
  ps().inventory.bar_copper = 10;
  const r = await forge(ws, { recipe: 'copper_torso' });
  check('switched off: nothing forges', r === null && ps().inventory.bar_copper === 10);
  const ws2 = fakeWs();
  await join(ws2, 'bp_armorforge_b');
  const sync = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is told the forge is shut', !!sync && sync.caps.armorforge === false);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall armor forge checks passed');
process.exit(failures ? 1 : 0);
