/* Server amulet forge test (v2.3.1192, handoff item I follow-up; spec:
 * docs/specs/amulet-forge.md).  Amulets were a client-crafted blob --
 * the v2.3.1180 sanitizer bounded the SHAPE but the residual forgery
 * ceiling was a free legit mythic flame amulet (+10.5% authoritative
 * elemDmg) because there was no server mint.  amulet.js is the mint.
 * Checks:
 *   1. Join ingestion: fresh identities capture the client-claimed
 *      nugget/bar ledger CLAMPED; reconnects ignore the claim (stored
 *      wins); pre-ledger stored records capture once.
 *   2. smelt: consumes NUGGETS_PER_BAR nuggets -> +1 bar, echoes
 *      player_state; insufficient nuggets is a silent no-op.
 *   3. craft: validates blacksmithing level + bars + coins from SERVER
 *      state, consumes, mints {tier, gem:null, name} + blacksmithing
 *      XP; every gate denies silently; '__proto__' can't NaN-poison.
 *   4. gem: requires an equipped amulet + a server-held polished gem,
 *      consumes it, sets gem + name + enchanting XP; unknown gems and
 *      gemless-server states deny.
 *   5. Guard gear lock (threat.js) blocks craft/gem but not smelt.
 *   6. Persistence: the ledger + minted amulet survive _saveRpg and a
 *      reconnect (the pre-slice reconnect used to stomp mid-session
 *      crafts back to the stale stored blob).
 *   7. caps.amuletForge advertised in state_sync (deploy-order gate for
 *      the client's sends + its legacy local nugget roll).
 *   8. _amuletNuggetOnKill: increments exactly on a sub-rate roll.
 */
import { GameRoom } from '../src/index.js';
import { AMULET_FORGE_TIERS, NUGGETS_PER_BAR, GOLD_NUGGET_MONSTER_DROP } from '../src/data.js';

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
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, extraData) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: 'T', phrase: 'p-' + id,
    data: { x: 0, y: 0, z: 'town', ...(extraData || {}) },
  }));
}
const forge = (ws, payload) =>
  room.webSocketMessage(ws, JSON.stringify({ type: 'amulet_forge_request', payload }));
const lastPlayerState = (ws) => [...ws.sent].reverse().find((m) => m.type === 'player_state');
const realRandom = Math.random;

// ── 1. join ingestion: capture + clamp on first connect ──
const ws = fakeWs('a');
await join(ws, 'bp_am_p', { rpgGoldNuggets: 12, rpgGoldBars: 3 });
const ps = room.playerState['bp_am_p'];
check('first connect captures the claimed ledger', ps.goldNuggets === 12 && ps.goldBars === 3, { n: ps.goldNuggets, b: ps.goldBars });

const wsCheat = fakeWs('cheat');
await join(wsCheat, 'bp_am_cheat', { rpgGoldNuggets: 999999, rpgGoldBars: 999999 });
const psCheat = room.playerState['bp_am_cheat'];
check('first-connect ledger claim is clamped', psCheat.goldNuggets === 250 && psCheat.goldBars === 50, { n: psCheat.goldNuggets, b: psCheat.goldBars });

// caps advertisement (deploy-order gate, rule 19)
{
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  check('state_sync advertises caps.amuletForge', sync && sync.caps && sync.caps.amuletForge === true, sync && sync.caps);
}

// ── 2. smelt ──
ps.goldNuggets = 7; ps.goldBars = 0;
ws.sent.length = 0;
await forge(ws, { op: 'smelt' });
check('smelt consumes ' + NUGGETS_PER_BAR + ' nuggets -> +1 bar', ps.goldNuggets === 2 && ps.goldBars === 1, { n: ps.goldNuggets, b: ps.goldBars });
{
  const echo = lastPlayerState(ws);
  check('smelt echoes player_state with the new ledger', echo && echo.payload.goldNuggets === 2 && echo.payload.goldBars === 1, echo && { n: echo.payload.goldNuggets, b: echo.payload.goldBars });
}
await forge(ws, { op: 'smelt' });
check('smelt with insufficient nuggets is a silent no-op', ps.goldNuggets === 2 && ps.goldBars === 1, { n: ps.goldNuggets, b: ps.goldBars });

// ── 3. craft ──
ps.coins = 100; ps.goldBars = 1; ps.amulet = null;
ps.lifeSkills = { blacksmithing: { level: 1, xp: 0 } };
await forge(ws, { op: 'craft', tierKey: 'simple' });
check('craft simple consumes 1 bar + 50g and mints the amulet',
  ps.goldBars === 0 && ps.coins === 50
  && ps.amulet && ps.amulet.tier === 'simple' && ps.amulet.gem === null
  && ps.amulet.name === 'Simple Gold Amulet',
  { bars: ps.goldBars, coins: ps.coins, amulet: ps.amulet });
check('craft grants blacksmithing XP (minLvl*3, client parity)', ps.lifeSkills.blacksmithing.xp === 3, ps.lifeSkills.blacksmithing);

// denial gates -- each leaves state untouched
const snap = () => JSON.stringify({ b: ps.goldBars, c: ps.coins, a: ps.amulet });
ps.goldBars = 10; ps.coins = 1200;
{
  const before = snap();
  await forge(ws, { op: 'craft', tierKey: 'mythic' }); // bs level 1 < 60
  check('craft denies below the blacksmithing gate', snap() === before, snap());
  ps.lifeSkills.blacksmithing.level = 60;
  ps.goldBars = 9;
  const b2 = snap();
  await forge(ws, { op: 'craft', tierKey: 'mythic' }); // 9 < 10 bars
  check('craft denies on insufficient bars', snap() === b2, snap());
  ps.goldBars = 10; ps.coins = 1199;
  const b3 = snap();
  await forge(ws, { op: 'craft', tierKey: 'mythic' }); // 1199 < 1200g
  check('craft denies on insufficient gold', snap() === b3, snap());
  const b4 = snap();
  await forge(ws, { op: 'craft', tierKey: 'godtier' }); // unknown tier
  await forge(ws, { op: 'craft', tierKey: 42 });
  await forge(ws, { op: 'nonsense' });
  check('unknown tier / op deny silently', snap() === b4, snap());
  // prototype-key hardening: '__proto__' resolves to a truthy inherited
  // object whose undefined costs would NaN-poison coins without the
  // own-property gate.
  const b5 = snap();
  await forge(ws, { op: 'craft', tierKey: '__proto__' });
  await forge(ws, { op: 'craft', tierKey: 'constructor' });
  check('prototype tier keys cannot NaN-poison the wallet', snap() === b5 && Number.isFinite(ps.coins), snap());
}
// mythic happy path
ps.coins = 1200; ps.goldBars = 10;
await forge(ws, { op: 'craft', tierKey: 'mythic' });
check('craft mythic consumes 10 bars + 1200g',
  ps.goldBars === 0 && ps.coins === 0 && ps.amulet && ps.amulet.tier === 'mythic' && ps.amulet.name === 'Mythic Gold Amulet',
  { bars: ps.goldBars, coins: ps.coins, amulet: ps.amulet });

// ── 4. gem ──
ps.lifeSkills.gems = { polished_flame: 1 };
ps.lifeSkills.enchanting = { level: 1, xp: 0 };
await forge(ws, { op: 'gem', gem: 'nuclear' }); // not one of the nine
check('unknown gem denies', ps.amulet.gem === null, ps.amulet);
await forge(ws, { op: 'gem', gem: 'frost' }); // no polished_frost held
check('gem denies without a server-held polished gem', ps.amulet.gem === null, { amulet: ps.amulet, gems: ps.lifeSkills.gems });
await forge(ws, { op: 'gem', gem: 'flame' });
check('gem consumes the polished gem and activates the amulet',
  ps.amulet.gem === 'flame' && ps.amulet.name === 'Mythic Flame Amulet'
  && !('polished_flame' in ps.lifeSkills.gems),
  { amulet: ps.amulet, gems: ps.lifeSkills.gems });
check('gem grants enchanting XP 20 (client parity)', ps.lifeSkills.enchanting.xp === 20, ps.lifeSkills.enchanting);
{
  // the minted+gemmed amulet is exactly what the sanitizer whitelists
  const sane = room._sanitizeAmulet(ps.amulet);
  check('server-minted amulet round-trips _sanitizeAmulet unchanged', sane && sane.tier === 'mythic' && sane.gem === 'flame' && sane.name === 'Mythic Flame Amulet', sane);
}
await forge(ws, { op: 'gem' }); // missing gem field
check('gem without a gem field denies', ps.amulet.gem === 'flame');

// ── 5. guard gear lock gates craft/gem but not smelt ──
ps._gearLockUntil = Date.now() + 60000;
ps.goldBars = 1; ps.coins = 50;
const lockedAmulet = JSON.stringify(ps.amulet);
await forge(ws, { op: 'craft', tierKey: 'simple' });
check('gear lock blocks craft', JSON.stringify(ps.amulet) === lockedAmulet && ps.goldBars === 1 && ps.coins === 50, ps.amulet);
ps.lifeSkills.gems = { polished_frost: 1 };
await forge(ws, { op: 'gem', gem: 'frost' });
check('gear lock blocks gem slot', ps.amulet.gem === 'flame' && ps.lifeSkills.gems.polished_frost === 1, ps.amulet);
ps.goldNuggets = NUGGETS_PER_BAR;
await forge(ws, { op: 'smelt' });
check('gear lock does NOT block smelt (resource conversion, not gear)', ps.goldNuggets === 0 && ps.goldBars === 2, { n: ps.goldNuggets, b: ps.goldBars });
ps._gearLockUntil = 0;

// ── 6. persistence + reconnect (stored wins over a fresh claim) ──
{
  const stored = state._store.get('rpg:bp_am_p');
  check('_saveRpg persists the ledger + minted amulet',
    stored && stored.goldNuggets === 0 && stored.goldBars === 2
    && stored.amulet && stored.amulet.tier === 'mythic' && stored.amulet.gem === 'flame',
    stored && { n: stored.goldNuggets, b: stored.goldBars, a: stored.amulet });
  const ws2 = fakeWs('re');
  await join(ws2, 'bp_am_p', { rpgGoldNuggets: 250, rpgGoldBars: 50, rpgAmulet: { tier: 'simple', gem: null, name: 'Simple Gold Amulet' } });
  const ps2 = room.playerState['bp_am_p'];
  check('reconnect ignores the client ledger claim (stored wins)', ps2.goldNuggets === 0 && ps2.goldBars === 2, { n: ps2.goldNuggets, b: ps2.goldBars });
  check('reconnect keeps the server-minted amulet over the client blob', ps2.amulet && ps2.amulet.tier === 'mythic' && ps2.amulet.gem === 'flame', ps2.amulet);
}

// pre-ledger stored record (typeof undefined) captures the claim once
{
  const legacyId = 'bp_am_legacy';
  const wsl = fakeWs('l1');
  await join(wsl, legacyId, { rpgGoldNuggets: 5, rpgGoldBars: 1 });
  const rec = state._store.get('rpg:' + legacyId);
  delete rec.goldNuggets; // simulate a record written before v2.3.1192
  delete rec.goldBars;
  const wsl2 = fakeWs('l2');
  await join(wsl2, legacyId, { rpgGoldNuggets: 30, rpgGoldBars: 4 });
  const psl = room.playerState[legacyId];
  check('pre-ledger stored record captures the join claim once (clamped path)', psl.goldNuggets === 30 && psl.goldBars === 4, { n: psl.goldNuggets, b: psl.goldBars });
}

// ── 7. dead/dying players cannot forge ──
ps.goldNuggets = NUGGETS_PER_BAR; ps.goldBars = 0;
ps.dead = true;
await forge(ws, { op: 'smelt' });
check('dead players cannot forge', ps.goldNuggets === NUGGETS_PER_BAR && ps.goldBars === 0, { n: ps.goldNuggets, b: ps.goldBars });
ps.dead = false;

// ── 8. nugget kill roll ──
{
  const target = { goldNuggets: 0 };
  Math.random = () => GOLD_NUGGET_MONSTER_DROP / 2; // under the rate -> hit
  room._amuletNuggetOnKill(target);
  Math.random = () => GOLD_NUGGET_MONSTER_DROP * 2; // over the rate -> miss
  room._amuletNuggetOnKill(target);
  Math.random = realRandom;
  check('_amuletNuggetOnKill pays exactly on a sub-rate roll', target.goldNuggets === 1, target);
  check('mint table sanity: 4 tiers, mythic costs 10 bars/1200g', Object.keys(AMULET_FORGE_TIERS).length === 4 && AMULET_FORGE_TIERS.mythic.bars === 10 && AMULET_FORGE_TIERS.mythic.goldCost === 1200, AMULET_FORGE_TIERS);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
