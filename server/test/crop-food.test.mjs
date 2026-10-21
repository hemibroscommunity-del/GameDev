/* EVERY CROP IS FOOD -- v2.3.3537 (docs/specs/crop-food.md).
 *
 * The owner: "I value SIMPLICITY and INTELLIGIBILITY".  Ten of the sixteen
 * crops were grown for nothing; the rule agreed for all sixteen is one a
 * player can guess: any crop can be eaten, raw, for a small heal -- half what
 * a fish heals at the same level.
 *
 *   1. The table: every crop's Farming level has a heal; each is half (rounded
 *      up) of the fish caught at the same Fishing level (FISH_HEAL by
 *      GATHER_REQ_LVL.fishSpot), and the page's copy is the worker's, crop by
 *      crop.  Nothing else is a crop: seeds, compost, fish, junk, inherited
 *      names.
 *   2. Eating: each of the sixteen heals its number, takes one from the bag,
 *      is saved and echoed; the heal stops at the bar's top.
 *   3. The cooked fish's refusals hold for a crop: none in the bag, dead, an
 *      arena match, the one-bite rule in a fight -- each resent -- and a crop
 *      eaten starts the one-bite clock.
 *   4. A seed or compost is not eaten (silently, as any unknown key).
 *   5. `cropeat: false` refuses a crop (resent, nothing taken) and the caps
 *      say cropeat true, false under the switch.
 *   6. The page: a crop is a heal eaten at once (the one-bite rule), its
 *      display heal is the worker's, and the one-tap quick eat never picks a
 *      crop. */
import { GameRoom } from '../src/index.js';
import { FISH_HEAL, FISH_TIERS, PVP_HEAL } from '../src/data.js';
import { FARM, CROP_HEAL, cropHealFor } from '../src/farm.js';
import { GATHER_REQ_LVL } from '../src/gathering.js';
import { CROP_HEAL as CLIENT_CROP_HEAL, farmCropHeal, FARM as CLIENT_FARM } from '../../src/data/farmCrops.js';
import * as FF from '../../src/game/fightFood.js';
import * as QE from '../../src/game/quickEat.js';
import { dishFor } from '../../src/data/dishes.js';
import { calcDisplayHeal as clientCalcDisplayHeal, setFishHealEnabled } from '../../src/data/gameSystems.js';

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

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const CROP_IDS = Object.keys(FARM.CROPS);
const itemOf = (id) => FARM.CROPS[id].item;

// ── 1. the table ──
{
  check('1: sixteen crops (guard)', CROP_IDS.length === 16, CROP_IDS.length);
  const noHeal = CROP_IDS.filter((id) => !(cropHealFor(itemOf(id)) > 0));
  check('1: every crop heals something', noHeal.length === 0, noHeal);
  /* the best fish a Fishing level of L can catch: the highest tier whose spot
     asks L or less */
  const fishAt = (L) => {
    let best = null;
    for (const t of FISH_TIERS) if ((GATHER_REQ_LVL.fishSpot[t.lvl] || 1) <= L) best = t.name;
    return best;
  };
  const levels = [...new Set(CROP_IDS.map((id) => FARM.CROPS[id].lvl))].sort((a, b) => a - b);
  check('1: the crops open at Farming 1, 5, 10, 15 and 20 -- the five Fishing levels',
    JSON.stringify(levels) === JSON.stringify([1, 5, 10, 15, 20])
      && JSON.stringify(Object.values(GATHER_REQ_LVL.fishSpot)) === JSON.stringify([1, 5, 10, 15, 20]),
    { levels, fish: GATHER_REQ_LVL.fishSpot });
  const off = levels.filter((L) => CROP_HEAL[L] !== Math.ceil(FISH_HEAL[fishAt(L)] / 2));
  check('1: each level heals half the fish caught at that level, rounded up (50, 75, 113, 163, 238)',
    off.length === 0 && JSON.stringify(levels.map((L) => CROP_HEAL[L])) === JSON.stringify([50, 75, 113, 163, 238]),
    { off, table: CROP_HEAL, fish: levels.map((L) => fishAt(L)) });
  check('1: the page\'s table is the worker\'s', JSON.stringify(CLIENT_CROP_HEAL) === JSON.stringify(CROP_HEAL),
    { client: CLIENT_CROP_HEAL, server: CROP_HEAL });
  const diff = CROP_IDS.filter((id) => farmCropHeal(itemOf(id)) !== cropHealFor(itemOf(id))
    || CLIENT_FARM.CROPS[id].item !== itemOf(id));
  check('1: ...and every crop heals the same on the page as on the worker', diff.length === 0, diff);
  const notCrops = ['seed_carrot', 'seed_heartroot', 'compost', 'cooked_fish_minnow', 'fish_minnow',
    'meal_garden_stew', 'herb_sunpetal', 'crop_', 'herb_', '', '__proto__', 'constructor', 'toString',
    'hasOwnProperty', null, undefined, 42, {}];
  const bad = notCrops.filter((k) => cropHealFor(k) !== 0 || farmCropHeal(k) !== 0);
  check('1: nothing else is a crop (seeds, compost, fish, dishes, junk, inherited names)', bad.length === 0, bad);
}

const room = new GameRoom(makeState(), mockEnv);
const settle = () => new Promise((r) => setTimeout(r, 10));
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  return room.sessions.get(ws);
}
async function send(ws, type, payload) {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  await settle();
}
const now = () => Date.now();

const ws = fakeWs();
const ses = await join(ws, 'bp_cf_a');
const P = room.playerState.bp_cf_a;
const clk = () => room._pvpHealClock('bp_cf_a');
/* out of every fight, a big bar, far from full */
const hurt = () => {
  P.maxHp = 5000; P.hp = 100; P.dead = false; P.dying = false; P._arenaMatch = null;
  P.lastDamageAt = 0; P._lastDealtAt = 0;
  const c = clk(); if (c) { c.pvpAt = 0; c.healAt = 0; }
};
const resent = () => ws.sent.some((m) => m.type === 'player_state' && m.payload && m.payload.inventory);
const eat = (key) => send(ws, 'eat_request', { invKey: key });

// ── 2. eating every crop ──
{
  P.inventory = Object.create(null);
  for (const id of CROP_IDS) P.inventory[itemOf(id)] = 3;
  const wrong = [];
  for (const id of CROP_IDS) {
    hurt();
    const key = itemOf(id);
    await eat(key);
    const want = CROP_HEAL[FARM.CROPS[id].lvl];
    if (P.hp !== 100 + want || P.inventory[key] !== 2) wrong.push({ id, hp: P.hp, want: 100 + want, left: P.inventory[key] });
    if (!ws.sent.some((m) => m.type === 'player_state')) wrong.push({ id, echo: false });
  }
  check('2: each of the sixteen crops heals its number and takes one from the bag, echoed', wrong.length === 0, wrong);
  const saved = room.state._store.get('rpg:bp_cf_a');
  check('2: ...and the bag is saved (the last crop eaten is 2 on file)',
    !!saved && saved.inventory && saved.inventory[itemOf(CROP_IDS[CROP_IDS.length - 1])] === 2,
    saved && saved.inventory);
  P.maxHp = 5000; P.hp = 4990;
  await eat('crop_carrot');
  check('2: the heal stops at the top of the bar', P.hp === 5000 && P.inventory.crop_carrot === 1, { hp: P.hp, left: P.inventory.crop_carrot });
}

// ── 3. the cooked fish's refusals hold for a crop ──
{
  P.inventory = Object.assign(Object.create(null), { crop_wheat: 5 });
  hurt();
  await eat('crop_strawberry');
  check('3: none in the bag: nothing healed, and the bag is resent', P.hp === 100 && resent(), { hp: P.hp });

  hurt(); P.dead = true;
  await eat('crop_wheat');
  check('3: dead: refused, resent', P.inventory.crop_wheat === 5 && resent(), P.inventory);

  hurt(); P._arenaMatch = { id: 'x' };
  await eat('crop_wheat');
  check('3: in an arena match: refused, resent (no healing there)', P.inventory.crop_wheat === 5 && P.hp === 100 && resent(), { hp: P.hp });

  /* the one-bite rule: a blow taken within WINDOW_MS, a bite within GAP_MS */
  hurt(); P.lastDamageAt = now(); clk().healAt = now();
  await eat('crop_wheat');
  check('3: in a fight, a bite just taken holds the crop back (one bite at a time)',
    P.inventory.crop_wheat === 5 && P.hp === 100 && resent(), { hp: P.hp, left: P.inventory.crop_wheat });
  check('3: ...and says why (eat_refused)', ws.sent.some((m) => m.type === 'eat_refused'));
  hurt(); P.lastDamageAt = now(); clk().healAt = now() - PVP_HEAL.GAP_MS - 1;
  await eat('crop_wheat');
  check('3: past the gap the crop is eaten mid-fight', P.inventory.crop_wheat === 4 && P.hp === 150, { hp: P.hp });
  check('3: ...and starts the one-bite clock, as a fish does', now() - clk().healAt < 1000, clk().healAt);
  P.inventory.cooked_fish_minnow = 2;
  P.hp = 100;
  await eat('cooked_fish_minnow');
  check('3: so a fish right after it in the fight waits', P.inventory.cooked_fish_minnow === 2 && P.hp === 100, { hp: P.hp });
}

// ── 4. not crops ──
{
  hurt();
  P.inventory = Object.assign(Object.create(null), { seed_carrot: 3, compost: 3 });
  await eat('seed_carrot');
  await eat('compost');
  check('4: a seed and compost are not eaten', P.inventory.seed_carrot === 3 && P.inventory.compost === 3 && P.hp === 100, P.inventory);
}

// ── 5. the switch, and the caps ──
{
  hurt();
  P.inventory = Object.assign(Object.create(null), { crop_carrot: 3, cooked_fish_minnow: 1 });
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { cropeat: false });
  await eat('crop_carrot');
  check('5: cropeat false: a crop is refused, nothing taken, resent', P.inventory.crop_carrot === 3 && P.hp === 100 && resent(), { hp: P.hp });
  await eat('cooked_fish_minnow');
  check('5: ...a cooked fish still eats', P.inventory.cooked_fish_minnow === undefined && P.hp > 100, { hp: P.hp });

  const wsB = fakeWs();
  await join(wsB, 'bp_cf_b');
  const syncOff = wsB.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('5: ...and the caps say cropeat false under the switch',
    !!syncOff && syncOff.caps.cropeat === false, syncOff && syncOff.caps.cropeat);
  delete room._liveFlags.cropeat;
  const wsC = fakeWs();
  await join(wsC, 'bp_cf_c');
  const syncOn = wsC.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('5: the caps say cropeat true', !!syncOn && syncOn.caps.cropeat === true, syncOn && syncOn.caps.cropeat);
  hurt();
  await eat('crop_carrot');
  check('5: switched back on, the carrot is eaten', P.inventory.crop_carrot === 2 && P.hp === 150, { hp: P.hp });
}

// ── 6. the page ──
{
  check('6: a crop is a heal eaten at once (the one-bite rule)',
    CROP_IDS.every((id) => FF.isInstantHeal(itemOf(id), dishFor(itemOf(id)))));
  check('6: ...a seed is not', !FF.isInstantHeal('seed_carrot', dishFor('seed_carrot')) && !FF.isInstantHeal('compost', null));
  setFishHealEnabled(true);
  const R = { hp: 10, maxHp: 1000, inventory: { crop_carrot: 9, crop_pumpkin: 2, cooked_fish_minnow: 1, herb_heartroot: 4 } };
  const shown = CROP_IDS.filter((id) => clientCalcDisplayHeal(R, itemOf(id)) !== cropHealFor(itemOf(id)));
  check('6: the page predicts each crop\'s heal as the worker heals it', shown.length === 0, shown);
  const S = { rpg: R, _serverCaps: { pvpheal: true } };
  const choices = QE.quickEatChoices(S, clientCalcDisplayHeal).map((c) => c.key);
  check('6: the one-tap quick eat never offers a crop (only the cooked fish here)',
    JSON.stringify(choices) === JSON.stringify(['cooked_fish_minnow']), choices);
  R.inventory = { crop_carrot: 9 };
  check('6: ...so with only crops in the bag it has nothing to show', QE.quickEatView(S, clientCalcDisplayHeal) === null);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
