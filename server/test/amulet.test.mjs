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
 *
 * v2.3.1198 (gem income, the successor slice this file's §4 pointed
 * at): the polished-gem economy moves server-side so the gem op stops
 * denying legitimately mined+cut gems.  Added checks:
 *   9.  _gemRawOnKill: zone-element raw gem exactly on a sub-rate roll;
 *       element-less zones never pay.
 *   10. gem_cut_request: consumes a server-held raw gem, rolls success
 *       from the SERVER gemCutting level (GEM_CUT_TIERS ladder), mints
 *       the polished gem + gemCutting XP, answers with the private
 *       gem_cut_result; denies silently on no-raw / unknown gem / dead.
 *   11. End-to-end: a server-cut polished gem is accepted by the
 *       amulet gem op (the deny-by-default hole this slice closes).
 *   12. Join adoption: first-connect gems claim is whitelisted+clamped;
 *       a pre-slice stored record max-merges the claim ONCE
 *       (gemsCaptured stamp); reconnect claims are ignored forever
 *       after.  caps.gems advertised (deploy-order gate).
 *
 * v2.3.1209 (extraction, the successor slice §4's Residuals named):
 * ForgePanel's two Extract buttons move server-side (op:'extract').
 *   13. extract: strips the four equipped gearBase slots
 *       (weapon/rangedWeapon/staffWeapon elements, shield gem) and
 *       stash weapons by index, credits polished gems, charges
 *       ceil(25*tierMult), rebuilds the display name (blacksmith +
 *       multi-word woodworking + weapon-type labels); the AMULET is
 *       rejected (its extract button is dead code -- gearBase filter);
 *       denies on insufficient coins (no partial spend), nothing
 *       socketed, unknown/OOB target, dead; gear lock blocks equipped
 *       extraction but not stash; caps.gemExtract advertised.
 */
import { GameRoom } from '../src/index.js';
import { AMULET_FORGE_TIERS, NUGGETS_PER_BAR, GOLD_NUGGET_MONSTER_DROP, GEM_RAW_MONSTER_DROP, GEM_CUT_TIERS } from '../src/data.js';

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

/* ═══ v2.3.1198: gem income (successor slice) ═══ */
const cut = (wsx, payload) =>
  room.webSocketMessage(wsx, JSON.stringify({ type: 'gem_cut_request', payload }));
const lastCutResult = (wsx) => [...wsx.sent].reverse().find((m) => m.type === 'gem_cut_result');

// ── 9. raw-gem kill roll (zone element, killer-only call site) ──
{
  const target = { lifeSkills: {} };
  Math.random = () => GEM_RAW_MONSTER_DROP / 2; // under the rate -> hit
  room._gemRawOnKill(target, 'ember'); // ember element = flame
  Math.random = () => GEM_RAW_MONSTER_DROP * 2; // over the rate -> miss
  room._gemRawOnKill(target, 'ember');
  Math.random = () => 0; // would always hit...
  room._gemRawOnKill(target, 'meadow'); // ...but meadow has no element
  room._gemRawOnKill(target, 'dungeon:crypt-1'); // ...and instances have no zone config
  Math.random = realRandom;
  check('_gemRawOnKill pays raw_<zone element> exactly on a sub-rate roll',
    target.lifeSkills.gems && target.lifeSkills.gems.raw_flame === 1
    && Object.keys(target.lifeSkills.gems).length === 1,
    target.lifeSkills.gems);
}

// ── 10. gem_cut_request: server-held raw consume + server-rolled cut ──
// Fresh socket + identity: §6's reconnect evicted the original ws
// session, so sends on it would silently drop (v2.3.702 eviction).
const wsc = fakeWs('cutter');
await join(wsc, 'bp_gem_cutter', {});
const psc = room.playerState['bp_gem_cutter'];
psc.lifeSkills.gems = { raw_flame: 2 };
psc.lifeSkills.gemCutting = { level: 1, xp: 0 };
wsc.sent.length = 0;
Math.random = () => 0.59; // level 1 -> rough 0.6 rate: 0.59 succeeds
await cut(wsc, { gem: 'flame' });
Math.random = realRandom;
check('cut consumes the raw gem and mints the polished gem on a success roll',
  psc.lifeSkills.gems.raw_flame === 1 && psc.lifeSkills.gems.polished_flame === 1,
  psc.lifeSkills.gems);
check('cut grants gemCutting XP 15 (client parity)', psc.lifeSkills.gemCutting.xp === 15, psc.lifeSkills.gemCutting);
{
  const res = lastCutResult(wsc);
  check('cut answers with the private gem_cut_result (success:true)',
    res && res.payload.gem === 'flame' && res.payload.success === true, res && res.payload);
  const echo = lastPlayerState(wsc);
  check('cut echoes player_state with the new gems map',
    echo && echo.payload.lifeSkills && echo.payload.lifeSkills.gems
    && echo.payload.lifeSkills.gems.polished_flame === 1,
    echo && echo.payload.lifeSkills && echo.payload.lifeSkills.gems);
}
wsc.sent.length = 0;
Math.random = () => 0.61; // level 1 -> rough 0.6 rate: 0.61 shatters
await cut(wsc, { gem: 'flame' });
Math.random = realRandom;
check('a failed roll consumes the raw gem WITHOUT minting (shatter, raw key deleted at zero)',
  !('raw_flame' in psc.lifeSkills.gems) && psc.lifeSkills.gems.polished_flame === 1,
  psc.lifeSkills.gems);
check('shatter still grants the XP (client parity: 15 either way)', psc.lifeSkills.gemCutting.xp === 30, psc.lifeSkills.gemCutting);
{
  const res = lastCutResult(wsc);
  check('shatter answers gem_cut_result success:false', res && res.payload.success === false, res && res.payload);
}
// success ladder reads the SERVER-held skill level
psc.lifeSkills.gems = { raw_frost: 1 };
psc.lifeSkills.gemCutting.level = 60; // perfect cut: 0.98
Math.random = () => 0.9; // fails rough (0.6) but succeeds perfect (0.98)
await cut(wsc, { gem: 'frost' });
Math.random = realRandom;
check('cut success rate follows the GEM_CUT_TIERS ladder from the SERVER-held level',
  psc.lifeSkills.gems.polished_frost === 1 && GEM_CUT_TIERS.perfect.successRate === 0.98,
  psc.lifeSkills.gems);
// denial gates -- silent, state untouched
{
  const gemsBefore = JSON.stringify(psc.lifeSkills.gems);
  await cut(wsc, { gem: 'frost' }); // no raw_frost held
  await cut(wsc, { gem: 'nuclear' }); // not one of the nine
  await cut(wsc, { gem: '__proto__' }); // prototype key can't be a gem
  await cut(wsc, {}); // missing field
  check('cut denies silently on no-raw / unknown gem / prototype key / missing field',
    JSON.stringify(psc.lifeSkills.gems) === gemsBefore, psc.lifeSkills.gems);
  psc.lifeSkills.gems.raw_flame = 1;
  psc.dead = true;
  await cut(wsc, { gem: 'flame' });
  check('dead players cannot cut', psc.lifeSkills.gems.raw_flame === 1, psc.lifeSkills.gems);
  psc.dead = false;
}

// ── 11. end-to-end: a server-cut gem satisfies the amulet gem op ──
{
  psc.lifeSkills.gems = { raw_venom: 1 };
  psc.lifeSkills.gemCutting = { level: 60, xp: 0 };
  Math.random = () => 0.5;
  await cut(wsc, { gem: 'venom' });
  Math.random = realRandom;
  psc.amulet = { tier: 'mythic', gem: null, name: 'Mythic Gold Amulet' };
  await forge(wsc, { op: 'gem', gem: 'venom' });
  check('the amulet gem op accepts a gem earned through the server cut (the hole this slice closes)',
    psc.amulet.gem === 'venom' && !('polished_venom' in psc.lifeSkills.gems),
    { amulet: psc.amulet, gems: psc.lifeSkills.gems });
}

// ── 12. join adoption: whitelist + clamp + one-time capture ──
{
  const wsg = fakeWs('g1');
  await join(wsg, 'bp_gem_p', {
    rpgLifeSkills: { gems: {
      raw_flame: 3, polished_frost: 999999, // legit-shaped, huge value clamps
      raw_bogus: 5, coins_hack: 12, polished_nuclear: 7, // junk keys drop
      raw_storm: -4, polished_wind: 'NaNny', // non-positive / NaN drop
    } },
  });
  const psg = room.playerState['bp_gem_p'];
  check('first connect whitelists + clamps the claimed gems map',
    psg.lifeSkills.gems.raw_flame === 3 && psg.lifeSkills.gems.polished_frost === 200
    && Object.keys(psg.lifeSkills.gems).length === 2,
    psg.lifeSkills.gems);
  check('first connect stamps gemsCaptured into the stored record',
    psg.gemsCaptured === true && state._store.get('rpg:bp_gem_p').gemsCaptured === true,
    state._store.get('rpg:bp_gem_p').gemsCaptured);
  // reconnect: stored wins, a fatter claim is ignored
  const wsg2 = fakeWs('g2');
  await join(wsg2, 'bp_gem_p', { rpgLifeSkills: { gems: { raw_flame: 200, polished_light: 200 } } });
  const psg2 = room.playerState['bp_gem_p'];
  check('reconnect ignores the gems claim (stored wins, gemsCaptured stamped)',
    psg2.lifeSkills.gems.raw_flame === 3 && !psg2.lifeSkills.gems.polished_light,
    psg2.lifeSkills.gems);
  // pre-slice stored record (no stamp) max-merges the claim ONCE --
  // max, not add: the stored map already holds what the original
  // bootstrap captured, adding would double-count it.
  const rec = state._store.get('rpg:bp_gem_p');
  delete rec.gemsCaptured; // simulate a record written before v2.3.1198
  const wsg3 = fakeWs('g3');
  await join(wsg3, 'bp_gem_p', { rpgLifeSkills: { gems: { raw_flame: 2, polished_water: 4 } } });
  const psg3 = room.playerState['bp_gem_p'];
  check('pre-slice stored record max-merges the claim once (server-earned counts never shrink)',
    psg3.lifeSkills.gems.raw_flame === 3 && psg3.lifeSkills.gems.polished_water === 4,
    psg3.lifeSkills.gems);
  // caps advertisement (deploy-order gate, rule 19) -- narrow flag, NOT
  // amuletForge: a v2.3.1192 worker advertises amuletForge but has no
  // cut op.
  const sync = wsg.sent.find((m) => m.type === 'state_sync');
  check('state_sync advertises caps.gems', sync && sync.caps && sync.caps.gems === true, sync && sync.caps);
}

// ── 13. v2.3.1209 gem EXTRACTION (op:'extract'): server-settled strip
// of the gear blob + polished-gem credit, mirroring ForgePanel's two
// Extract buttons.  Fresh identity so the earlier sections' churn on
// bp_am_p can't leak in. ──
{
  const wsx = fakeWs('x');
  await join(wsx, 'bp_ext_p', {});
  const px = room.playerState['bp_ext_p'];
  px.lifeSkills = px.lifeSkills || {};
  px.lifeSkills.gems = {};

  // caps advertisement (deploy-order gate, rule 19) -- narrow flag
  {
    const sync = wsx.sent.find((m) => m.type === 'state_sync');
    check('state_sync advertises caps.gemExtract', sync && sync.caps && sync.caps.gemExtract === true, sync && sync.caps);
  }

  // The amulet is deliberately NOT an extract target: its Extract button
  // never renders (ForgePanel's list filters on s.item.gearBase, which
  // amulets lack -- dead code), so per the dormant-content rule the op
  // rejects target:'amulet' like any unknown target (asserted below).

  // --- melee weapon: both elements out, tier->common, name rebuilt,
  //     cost = ceil(25 * tierMult) ---
  px.coins = 100;
  px.weapon = { type: 'greatsword', gearBase: 'iron', tier: 'fusion', tierMult: 2.25, element1: 'flame', element2: 'storm', isVolatile: true, name: 'FlameStorm Great Sword' };
  wsx.sent.length = 0;
  await forge(wsx, { op: 'extract', target: 'weapon' });
  check('extract weapon: both elements credited, tier reset, name rebuilt, ceil(25*2.25)=57 charged',
    px.weapon.element1 === null && px.weapon.element2 === null
    && px.weapon.tier === 'common' && px.weapon.isVolatile === false
    && px.weapon.name === 'Iron Great Sword'
    && px.lifeSkills.gems.polished_flame === 1 && px.lifeSkills.gems.polished_storm === 1
    && px.coins === 43,
    { weapon: px.weapon, gems: px.lifeSkills.gems, coins: px.coins });
  check('extract echoes player_state', !!lastPlayerState(wsx), null);
  {
    const before = JSON.stringify({ w: px.weapon, g: px.lifeSkills.gems, c: px.coins });
    await forge(wsx, { op: 'extract', target: 'weapon' }); // stripped now
    check('extract on an element-less weapon is a silent no-op', JSON.stringify({ w: px.weapon, g: px.lifeSkills.gems, c: px.coins }) === before, before);
  }

  // --- ranged/staff slots are extractable too (all four gearBase slots) ---
  px.coins = 100;
  px.rangedWeapon = { type: 'bow', gearBase: 'copper', tier: 'elemental', tierMult: 1.12, element1: 'wind', element2: null, isVolatile: false, name: 'Wind Bow' };
  await forge(wsx, { op: 'extract', target: 'rangedWeapon' });
  // ceil(25*1.12)=29 (25*1.12 floats to 28.0000000000000004) -- the
  // client computes the identical Math.ceil, so the coin gate matches.
  check('extract rangedWeapon slot strips + credits (ceil(25*1.12)=29)',
    px.rangedWeapon.element1 === null && px.rangedWeapon.name === 'Copper Bow'
    && px.lifeSkills.gems.polished_wind === 1 && px.coins === 71,
    { ranged: px.rangedWeapon, coins: px.coins });

  // --- woodworking weapon: the multi-word label table is exercised ---
  px.coins = 100;
  px.staffWeapon = { type: 'staff', gearBase: 'ww_crystalwood', tier: 'elemental', tierMult: 1, element1: 'frost', element2: null, isVolatile: false, name: 'Frost Staff' };
  await forge(wsx, { op: 'extract', target: 'staffWeapon' });
  check('extract woodworking staff rebuilds the multi-word tier label',
    px.staffWeapon.name === 'Crystal Wood Staff' && px.lifeSkills.gems.polished_frost === 1 && px.coins === 75,
    { name: px.staffWeapon.name, coins: px.coins });

  // --- shield extraction: single gem, blacksmith label, flat 25g (no tierMult) ---
  px.coins = 100;
  px.shield = { gearBase: 'steel', gem: 'venom', name: 'Venom Shield' };
  await forge(wsx, { op: 'extract', target: 'shield' });
  check('extract shield: gem removed + blacksmith name rebuilt + polished credited + flat 25g',
    px.shield.gem === null && px.shield.name === 'Steel Shield' && px.lifeSkills.gems.polished_venom === 1 && px.coins === 75,
    { shield: px.shield, coins: px.coins });

  // --- insufficient coins: no partial spend (gear + gems untouched) ---
  px.coins = 10;
  px.shield = { gearBase: 'steel', gem: 'water', name: 'Water Shield' };
  const gemsBefore = JSON.stringify(px.lifeSkills.gems);
  await forge(wsx, { op: 'extract', target: 'shield' }); // 25 > 10
  check('extract denied on insufficient coins leaves gear + gems untouched',
    px.shield.gem === 'water' && px.coins === 10 && JSON.stringify(px.lifeSkills.gems) === gemsBefore,
    { shield: px.shield, coins: px.coins });

  // --- stash extraction by index; out-of-range / non-integer deny ---
  px.coins = 100;
  px.weaponStash = [
    { type: 'sword', gearBase: 'iron', tier: 'elemental', tierMult: 1, element1: 'dark', element2: null, isVolatile: false, name: 'Dark Sword' },
  ];
  await forge(wsx, { op: 'extract', target: 'stash', stashIdx: 5 }); // OOB
  check('extract stash out-of-range index denies', px.weaponStash[0].element1 === 'dark' && px.coins === 100, { stash: px.weaponStash, coins: px.coins });
  await forge(wsx, { op: 'extract', target: 'stash', stashIdx: '0' }); // non-integer
  check('extract stash non-integer index denies', px.weaponStash[0].element1 === 'dark' && px.coins === 100, { stash: px.weaponStash });
  await forge(wsx, { op: 'extract', target: 'stash', stashIdx: 0 });
  check('extract stash strips the indexed weapon + credits + charges',
    px.weaponStash[0].element1 === null && px.weaponStash[0].tier === 'common'
    && px.weaponStash[0].name === 'Iron Sword' && px.lifeSkills.gems.polished_dark === 1 && px.coins === 75,
    { stash: px.weaponStash, gems: px.lifeSkills.gems, coins: px.coins });

  // --- unknown / dormant-amulet target denies ---
  {
    const c = px.coins;
    px.amulet = { tier: 'mythic', gem: 'flame', name: 'Mythic Flame Amulet' };
    await forge(wsx, { op: 'extract', target: 'amulet' }); // dead flow, not supported
    await forge(wsx, { op: 'extract', target: 'trousers' });
    await forge(wsx, { op: 'extract' });
    check('extract with amulet/unknown/absent target denies silently',
      px.coins === c && px.amulet.gem === 'flame', { coins: px.coins, amulet: px.amulet });
  }

  // --- gear lock blocks EQUIPPED extraction but not stash (stash isn't worn) ---
  px.coins = 100;
  px.shield = { gearBase: 'steel', gem: 'light', name: 'Light Shield' };
  px.weaponStash = [{ type: 'staff', gearBase: 'iron', tier: 'elemental', tierMult: 1, element1: 'stone', element2: null, isVolatile: false, name: 'Stone Staff' }];
  px._gearLockUntil = Date.now() + 60000;
  await forge(wsx, { op: 'extract', target: 'shield' });
  check('gear lock blocks equipped extraction', px.shield.gem === 'light' && px.coins === 100, { shield: px.shield, coins: px.coins });
  await forge(wsx, { op: 'extract', target: 'stash', stashIdx: 0 });
  check('gear lock does NOT block stash extraction (not equipped gear)',
    px.weaponStash[0].element1 === null && px.lifeSkills.gems.polished_stone === 1,
    { stash: px.weaponStash, gems: px.lifeSkills.gems });
  px._gearLockUntil = 0;

  // --- dead players cannot extract ---
  px.coins = 100;
  px.shield = { gearBase: 'steel', gem: 'wind', name: 'Wind Shield' };
  px.dead = true;
  await forge(wsx, { op: 'extract', target: 'shield' });
  check('dead player cannot extract', px.shield.gem === 'wind' && px.coins === 100, { shield: px.shield, coins: px.coins });
  px.dead = false;
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
