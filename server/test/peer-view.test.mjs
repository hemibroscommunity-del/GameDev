/* ═══ v2.3.3214: WHAT THE OTHER PLAYERS ARE TOLD ABOUT YOU ═══
 *
 * index.js PEER_PUBLIC_KEYS / _peerPublic: a joining phone's snapshot
 * (state_sync's players) and the player_join every phone gets when someone
 * joins carry only what is public anyway -- position, name, look, the gear
 * on show -- and none of a player's purse, bag, stashes, quests or the
 * anti-cheat's notes.  Checked here:
 *
 *   1. a played character as another phone is told about them on its join:
 *      every key public, none of the private ones, all of what is drawn;
 *   2. every key a phone reads on the snapshot road (wsClient.js state_sync,
 *      src/networking/peerCosmetics.js) still goes out when it is set;
 *   3. player_join: the joiner's look, not their rpg* claims;
 *   4. the look the phone sent still wins over the state (as before);
 *   5. the snapshot's size, against the old composition.
 */
import { GameRoom, TRACK_COSMETIC_KEYS } from '../src/index.js';
import { JOIN_COSMETIC_KEYS } from '../src/join.js';
import { PEER_COSMETIC_FIELDS, PEER_PASSTHROUGH_FIELDS } from '../../src/networking/peerCosmetics.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

function mockState() {
  const store = new Map();
  return {
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
const room = new GameRoom(mockState(), mockEnv);
function msgs(ws, type) { return ws.sent.map((s) => JSON.parse(s)).filter((m) => m.type === type); }

/* a phone's look, as its join carries it (wsClient.js) */
const LOOK = { name: 'Ava', color: '#a33', bt: '#123456', bl: '#654321', hw: 'cap', fh: 'none', hr: 'spiky', sk: 'tan', hc: '#222',
  htc: '#f00', fhc: '#333', st: 'tshirt', stc: '#0a0', ec: 'blue', pt: 'jeans', sh: 'boots', bs: 'broad', hg: 'tall', fr: 'lean',
  eqc: 'iron', eql: 'none', eqs: 'none', eqst: 'tshirt', wpnMat: 'iron' };
/* ...and its claims about itself, which the server reads at the join and
   nobody else should see */
const CLAIMS = { rpgCoins: 4321, rpgInventory: { ore_iron_ore: 9, meal_garden_stew: 2 }, rpgLifeSkills: { mining: { level: 5, xp: 10 } },
  rpgLevel: 7, rpgXp: 999, rpgWeapon: { name: 'Iron Sword', tierMult: 2 }, rpgArmor: { name: 'Iron Torso' }, rpgAmulet: null,
  rpgGoldNuggets: 3, rpgLv: 7, rpgHp: 80, rpgMaxHp: 90 };

async function join(id, extra = {}) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: extra.name || id, protocolVersion: 2,
    data: Object.assign({ x: 1000, y: 1000, z: 'town', d: 'down' }, extra) }));
  return ws;
}

/* the keys that are public anyway: the look relay's, the join's look, and what every tick says (tick.js playerWire) */
const PUBLIC = new Set([...TRACK_COSMETIC_KEYS, ...JOIN_COSMETIC_KEYS, 'name', 'x', 'y', 'd', 'z', 'vx', 'vy', 'f', 'ex', 'bro']);
const PRIVATE = ['coins', 'inventory', 'goldBars', 'goldNuggets', 'weaponStash', 'armorStash', 'gearStash', 'shieldStash',
  'amuletStash', 'legsStash', '_quests', '_questFlags', '_questKills', '_cookHistory', '_perfectHistory', '_buffs',
  'lifeSkills', 'prog3', 'xp', 'level', 'hp', 'maxHp', 'mana', 'weapon', 'armor', 'shield', 'amulet', 'weaponSkills',
  'rpgCoins', 'rpgInventory', 'rpgLifeSkills', 'rpgLevel', 'rpgXp', 'rpgWeapon', 'rpgArmor', 'rpgGoldNuggets'];

/* ── 1. a played character, as another phone's join is told ───────────── */
const wsA = await join('bp_aaaaaaaaaaaaaaaaaaaa_ava', Object.assign({}, LOOK, CLAIMS));
const A = 'bp_aaaaaaaaaaaaaaaaaaaa_ava';
{
  /* what a played character carries on the server */
  const ps = room.playerState[A];
  ps.coins = 12345; ps.goldBars = 2;
  ps.inventory = { ore_copper_ore: 40, wood_pine: 20, fish_minnow: 12 };
  ps.weaponStash = [{ name: 'Copper Sword', tierMult: 1 }];
  ps._quests = { tut_1: { done: true } };
  ps._cookHistory = [1, 2, 3];
  /* ...and its 2 s look, with the inspect card and a cape */
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'track', data: Object.assign({}, LOOK, { x: 1010, y: 1020,
    rpgLv: 7, rpgHp: 80, rpgMaxHp: 90, rpgData: { kills: 12, shield: 'buckler' }, wpnType: 'sword', mask: 'none' }) }));
}
const wsB = await join('bp_bbbbbbbbbbbbbbbbbbbb_bob', { name: 'Bob' });
const sync = msgs(wsB, 'state_sync')[0];
const eA = sync && sync.players ? sync.players[A] : null;
{
  const keys = eA ? Object.keys(eA) : [];
  const notPublic = keys.filter((k) => !PUBLIC.has(k));
  check('1a another phone is told only public keys of a played character', !!eA && notPublic.length === 0, { notPublic, keys });
  const leaked = PRIVATE.filter((k) => eA && Object.prototype.hasOwnProperty.call(eA, k));
  check('1b ...none of their purse, bag, stashes, quests, skills or the anti-cheat\'s notes, nor the join\'s claims', !!eA && leaked.length === 0, leaked);
  const drawn = ['name', 'x', 'y', 'z', 'd', 'color', 'bt', 'bl', 'hw', 'hr', 'sk', 'hc', 'st', 'stc', 'pt', 'sh', 'bs', 'hg', 'fr',
    'eqc', 'eqst', 'wpnMat', 'wpnType', 'rpgLv', 'rpgHp', 'rpgMaxHp', 'rpgData'];
  const missing = drawn.filter((k) => !eA || eA[k] === undefined);
  check('1c ...and all of what they are drawn with: position, name, look, gear on show, level and the inspect card', !!eA && missing.length === 0, { missing });
  check('1d the inspect card whole', !!eA && eA.rpgData && eA.rpgData.kills === 12 && eA.rpgData.shield === 'buckler', eA && eA.rpgData);
}

/* ── 2. every key a phone reads on the snapshot road still goes out ──── */
{
  /* wsClient.js state_sync's peer literal, and peerCosmetics.js's two tables */
  const LITERAL = ['x', 'y', 'name', 'color', 'avatar', 'd', 'bt', 'bl', 'eqc', 'eql', 'eqs', 'eqst', 'st', 'rpgLv', 'rpgHp', 'rpgMaxHp', 'z'];
  const read = [...new Set([...LITERAL, ...Object.keys(PEER_COSMETIC_FIELDS), ...PEER_PASSTHROUGH_FIELDS])];
  const data = Object.create(null);
  for (const k of read) data[k] = 'v-' + k;
  const out = room._peerPublic({}, { data });
  const dropped = read.filter((k) => out[k] !== 'v-' + k);
  check(`2a all ${read.length} keys a phone reads on the snapshot road are sent when set`, dropped.length === 0, dropped);
}

/* ── 3. player_join: the look, not the claims ──────────────────────────── */
{
  wsB.sent.length = 0;
  /* a character on file, so its join's rpg* claims are kept (a new one's are
     dropped at the join anyway, v2.3.3138) and reach the broadcast */
  await room.state.storage.put('rpg:bp_cccccccccccccccccccc_cy', { coins: 100, inventory: { wood_pine: 1 }, level: 7 });
  await join('bp_cccccccccccccccccccc_cy', Object.assign({}, LOOK, CLAIMS, { name: 'Cy' }));
  const sC = [...room.sessions.values()].find((x) => x.id === 'bp_cccccccccccccccccccc_cy');
  check('3- (the room does hold the join\'s claims for a character on file, so the broadcast is what is tested)',
    !!sC && sC.data && sC.data.rpgCoins === 4321 && sC.data.rpgLv === 7, sC && sC.data && { rpgCoins: sC.data.rpgCoins, rpgLv: sC.data.rpgLv });
  const pj = msgs(wsB, 'player_join').find((m) => m.id === 'bp_cccccccccccccccccccc_cy');
  const d = pj ? pj.data || {} : null;
  const notPublic = d ? Object.keys(d).filter((k) => !PUBLIC.has(k)) : null;
  check('3a player_join tells the others only public keys', !!d && notPublic.length === 0, { notPublic, keys: d && Object.keys(d) });
  check('3b ...not the phone\'s coins, bag, skills, level or weapon claims', !!d && d.rpgCoins === undefined && d.rpgInventory === undefined
    && d.rpgLifeSkills === undefined && d.rpgLevel === undefined && d.rpgWeapon === undefined && d.rpgGoldNuggets === undefined, d);
  check('3c ...and its look, position and the level it shows', !!d && d.hw === 'cap' && d.sk === 'tan' && d.eqc === 'iron' && d.x === 1000 && d.rpgLv === 7, d);
  const u = room._peerPublic(null, { data: Object.assign({}, LOOK, CLAIMS) });
  const kept = Object.keys(CLAIMS).filter((k) => k in u).sort().join(',');
  check('3d of the join\'s claims only the level and HP it shows go out', kept === 'rpgHp,rpgLv,rpgMaxHp', kept);
}

/* ── 4. the look the phone sent wins, as before ───────────────────────── */
{
  /* the track's x/y (session.data) over the state's, the session's name over the state's */
  check('4a position from the phone\'s last look (as before)', !!eA && eA.x === 1010 && eA.y === 1020, eA && [eA.x, eA.y]);
  const out = room._peerPublic({ name: 'Old', x: 1, eqc: 'copper' }, { name: 'New', data: { eqc: 'iron' } });
  check('4b the look\'s key over the state\'s, the session\'s name over the state\'s', out.eqc === 'iron' && out.name === 'New' && out.x === 1, out);
  const out2 = room._peerPublic({ x: 5, coins: 9 }, { data: { x: undefined } });
  check('4c a key the look holds as undefined is left out, as the old spread did', !('x' in out2) && !('coins' in out2), out2);
}

/* ── 5. the size ───────────────────────────────────────────────────────── */
{
  for (let i = 0; i < 20; i++) {
    const id = 'bp_' + String(i).padStart(20, 'x') + '_p' + i;
    await join(id, Object.assign({}, LOOK, CLAIMS, { name: 'P' + i }));
    const ps = room.playerState[id];
    ps.coins = 5000 + i; ps.inventory = { ore_copper_ore: 40, wood_pine: 20, fish_minnow: 12, ore_iron_ore: 7, meal_herb_bread: 3 };
    ps.weaponStash = [{ name: 'Copper Sword', tierMult: 1 }, { name: 'Iron Bow', tierMult: 2 }];
    ps._quests = { tut_1: { done: true }, mayor_1: { n: 2 } };
  }
  const wsZ = await join('bp_zzzzzzzzzzzzzzzzzzzz_zed', { name: 'Zed' });
  const s2 = msgs(wsZ, 'state_sync')[0];
  const now = JSON.stringify(s2.players).length;
  /* the old composition, for the same room */
  const old = {};
  for (const [, s] of room.sessions) if (s.id) old[s.id] = room._gearProvCropPeer({ ...room.playerState[s.id], name: s.name, ...s.data });
  const was = JSON.stringify(old).length;
  console.log(`      the snapshot's players for ${Object.keys(s2.players).length} players: ${was} -> ${now} bytes (${Math.round(100 - 100 * now / was)}% smaller)`);
  check('5a the snapshot is smaller by more than half', now < was / 2, { was, now });
}

console.log(`\npeer-view: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
