/* The farm -- v2.3.3127 (docs/specs/farm.md, docs/FARMING-PLAN.md Phase 1).
 *
 * Owner: "mechanics similar to the old FarmVille game where you have to wait
 * to harvest and each has a wait time different depending on what it is.
 * Need to dig, plant seeds, fertilize, water, etc."
 *
 *   1. caps.farm is advertised; opening the window hands out the free deed
 *      (six rough beds) and stores it under farm:<pid>.
 *   2. Dig turns rough beds to tilled, once.
 *   3. Seeds and compost are bought for coins, whole orders only, and never
 *      above the farmer's level; junk keys buy nothing.
 *   4. Plant takes one seed per tilled bed, in the order the finger went,
 *      and stops (saying so) when the seeds run out; a locked crop refuses.
 *   5. A crop is ripe only when the worker's clock passes its time; watering
 *      makes that 25% sooner, once; fertilizing takes a bag of compost and
 *      makes the harvest 3 where it would be 2.
 *   6. Harvest pays the crop and Farming XP per bed, returns the bed to
 *      rough, and a resent harvest pays nothing.
 *   7. Crops grow while you are away: a rejoin is told what is ripe.
 *   8. Bed indexes from the wire: out of range, junk, duplicates and a huge
 *      array are all harmless.  A corrupt stored record heals to rough beds.
 *   9. The rate limit drops a script; the kill switch refuses and
 *      un-advertises.
 *  10. Diego: selling a seed or compost you just bought is always a loss.
 *  11. The Cookhouse: Herb Bread heals (v2.3.3130: twice the out-of-combat
 *      trickle, for half an hour), Firebloom Tea is +20% damage as its card
 *      says, both cook from farm herbs -- and a cook with `carry` puts the
 *      dish in the bag to eat later; a meal runs beside a brew.
 *  12. The bed turns before anything is paid: a Farming skill stored as a
 *      bare number (a first join keeps the client's skills as sent) once made
 *      the XP throw after the crops were paid, so one bed paid on every
 *      message.  It heals at the join, and a throw costs only the XP.
 *  13. A character restart takes the farm with it.
 *  14. A record from a newer worker (FARM.V) is refused whole: nothing
 *      opened, acted on, announced or ripened, and storage untouched -- a
 *      rollback to this worker never rewrites beds it does not know.
 */
import { GameRoom } from '../src/index.js';
import { FARM, farmGrowMs, farmYield, FARM_SHOP_BASE } from '../src/farm.js';

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
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* The worker's clock, movable: crops ripen on Date.now(), so the suite moves
   it instead of waiting six real minutes for a carrot. */
const realNow = Date.now;
let skew = 0;
Date.now = () => realNow() + skew;
const later = (ms) => { skew += ms; };

const st = makeState();
const room = new GameRoom(st, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
}
const settle = () => new Promise((r) => setTimeout(r, 10));
/* Send a farm message and return the farm_state it was answered with. */
async function farm(ws, type, payload) {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  await settle();
  const all = ws.sent.filter((m) => m.type === 'farm_state');
  return all.length ? all[all.length - 1].payload : null;
}
const act = (ws, op, beds, crop) => farm(ws, 'farm_act', crop ? { op, beds, crop } : { op, beds });
const buy = (ws, item, count) => farm(ws, 'farm_buy', { item, count });
const resetRate = () => { room._farmRate = new Map(); };

const PID = 'bp_farm_a';
const ws = fakeWs();
await join(ws, PID);
const ps = () => room.playerState[PID];
const inv = () => ps().inventory;
const farming = () => (ps().lifeSkills && ps().lifeSkills.farming) || { level: 1, xp: 0 };
const stored = () => st._store.get('farm:' + PID);
const C = FARM.CROPS;

// ── 1. caps + the free deed ──
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.farm is advertised', !!sync && sync.caps.farm === true);
  check('a player who never farmed is sent no farm on join', !ws.sent.some((m) => m.type === 'farm_state'));
  const v = await farm(ws, 'farm_open', {});
  check('opening the window hands out the free deed: six beds, all rough',
    !!v && v.beds === FARM.FREE_BEDS && v.plots.length === 6 && v.plots.every((p) => p.s === 'rough'), v);
  check('...stored under farm:<pid>, not on the rpg blob', !!stored() && stored().beds === 6 && stored().plots.length === 6, stored());
  check('...and the view carries the worker\'s clock', !!v && Math.abs(v.now - Date.now()) < 1000, v && v.now);
}

// ── 2. dig ──
{
  const v = await act(ws, 'dig', [0, 1, 2]);
  check('dig turns rough beds to tilled', !!v && v.did.n === 3 && v.plots[0].s === 'tilled' && v.plots[2].s === 'tilled' && v.plots[3].s === 'rough', v);
  const again = await act(ws, 'dig', [0, 1]);
  check('...and digging a tilled bed does nothing (err nothing)', !!again && again.did.n === 0 && again.err === 'nothing', again);
  check('...saved: the stored beds are tilled', stored().plots[1].s === 'tilled');
}

// ── 3. buying seeds and compost ──
{
  ps().coins = 100;
  const v = await buy(ws, 'seed_carrot', 5);
  check('5 carrot seeds cost 10 coins and land in the bag', ps().coins === 90 && inv().seed_carrot === 5 && !!v && v.did.n === 5 && v.did.cost === 10, { coins: ps().coins, inv: inv(), v });
  check('...followed by a player_state with the bag', ws.sent.some((m) => m.type === 'player_state'));
  const c = await buy(ws, 'compost', 3);
  check('3 bags of compost cost 12 coins', ps().coins === 78 && inv().compost === 3, { coins: ps().coins, inv: inv() });
  ps().coins = 5;
  const poor = await buy(ws, 'seed_firebloom', 2);
  check('an order you cannot pay for buys nothing, and says coins', !!poor && poor.err === 'coins' && ps().coins === 5 && !inv().seed_firebloom, { poor, inv: inv() });
  ps().coins = 1000;
  const locked = await buy(ws, 'seed_rock_vine', 1);
  check('a seed above your Farming level is not sold (err level)', !!locked && locked.err === 'level' && !inv().seed_rock_vine && ps().coins === 1000, locked);
  for (const bad of ['__proto__', 'constructor', 'toString', 'crop_carrot', 'herb_firebloom', 'seed_mandrake', 'whetstone', 42, null]) {
    const x = await buy(ws, bad, 1);
    check('a junk item (' + String(bad) + ') buys nothing', x === null && ps().coins === 1000);
  }
  resetRate();
  const big = await buy(ws, 'seed_firebloom', 1e9);
  check('a forged huge count buys at most BUY_MAX (' + FARM.BUY_MAX + ')', !!big && big.did.n === FARM.BUY_MAX && inv().seed_firebloom === FARM.BUY_MAX
    && ps().coins === 1000 - FARM.BUY_MAX * C.firebloom.price, { inv: inv(), coins: ps().coins });
  const neg = await buy(ws, 'compost', -4);
  check('a negative count buys one', !!neg && neg.did.n === 1 && inv().compost === 4, inv());
}

// ── 4. plant ──
{
  /* beds 0-2 tilled; dig 3 too.  Then plant carrots across 3,0,1,2 with
     only 3 seeds: the finger's order, and it says why it stopped. */
  await act(ws, 'dig', [3]);
  inv().seed_carrot = 3;
  const t0 = Date.now();
  const v = await act(ws, 'plant', [3, 0, 1, 2], 'carrot');
  check('plant takes one seed per tilled bed, in the order dragged', !!v && v.did.n === 3 && v.plots[3].s === 'planted' && v.plots[0].s === 'planted'
    && v.plots[1].s === 'planted' && v.plots[2].s === 'tilled', v);
  check('...and says the seeds ran out (err no-seeds)', !!v && v.err === 'no-seeds', v && v.err);
  check('...the seeds are gone from the bag', !inv().seed_carrot, inv());
  const p = v.plots[3];
  check('...a planted bed knows its crop and its time on the worker\'s clock (8 min unwatered)',
    p.crop === 'carrot' && p.readyAt - p.plantedAt === farmGrowMs(C.carrot, false) && farmGrowMs(C.carrot, false) === 8 * 60000
    && Math.abs(p.plantedAt - t0) < 1000 && p.water === 0 && p.feed === 0, p);
  const rough = await act(ws, 'plant', [4], 'firebloom');
  check('a rough bed cannot be planted (dig first)', !!rough && rough.did.n === 0 && rough.plots[4].s === 'rough', rough);
  await act(ws, 'dig', [4, 5]);
  const lock = await act(ws, 'plant', [4], 'cloudpetal');
  check('a crop above your Farming level is refused (err level)', !!lock && lock.err === 'level' && lock.plots[4].s === 'tilled', lock);
  for (const bad of ['__proto__', 'constructor', 'mandrake', 7, null]) {
    const x = await act(ws, 'plant', [4], bad);
    check('a junk crop (' + String(bad) + ') plants nothing', x === null && stored().plots[4].s === 'tilled');
  }
  const none = await act(ws, 'plant', [4], 'firebloom');   /* 51 firebloom seeds from §3 */
  check('firebloom plants from the bought seeds', !!none && none.did.n === 1 && none.plots[4].crop === 'firebloom' && inv().seed_firebloom === FARM.BUY_MAX - 1, none);
}

// ── 5. ripening, water, compost ──
{
  const v0 = await act(ws, 'harvest', [3, 0, 1]);
  check('an unripe crop cannot be harvested', !!v0 && v0.did.n === 0 && v0.err === 'nothing' && v0.plots[3].s === 'planted', v0);
  const w = await act(ws, 'water', [3]);
  const pw = w.plots[3];
  check('watering makes the crop ready 25% sooner (8 -> 6 min)', !!w && w.did.n === 1 && pw.water === 1
    && pw.readyAt - pw.plantedAt === farmGrowMs(C.carrot, true) && farmGrowMs(C.carrot, true) === 6 * 60000, pw);
  const w2 = await act(ws, 'water', [3]);
  check('...once: watering it again does nothing', !!w2 && w2.did.n === 0, w2);
  const f = await act(ws, 'feed', [3, 0]);
  check('fertilizing takes one bag of compost per bed', !!f && f.did.n === 2 && f.plots[3].feed === 1 && f.plots[0].feed === 1 && inv().compost === 2, { f, inv: inv() });
  const f2 = await act(ws, 'feed', [3]);
  check('...once per planting', !!f2 && f2.did.n === 0 && inv().compost === 2, f2);
  inv().compost = 0; delete inv().compost;
  const f3 = await act(ws, 'feed', [1]);
  check('...and with no compost it says so (err no-compost)', !!f3 && f3.err === 'no-compost' && f3.plots[1].feed === 0, f3);

  later(6 * 60000 + 1000);   /* 6 min: the watered carrot is ripe, the dry ones are not */
  resetRate();
  const early = await act(ws, 'harvest', [0, 1]);
  check('at 6 minutes the UNWATERED carrots are still growing', !!early && early.did.n === 0, early);
  const lvl0 = farming().level || 1, xp0 = farming().xp || 0;
  const h = await act(ws, 'harvest', [3]);
  check('the watered, fertilized carrot is ripe: 3 carrots (2 x 1.5)', !!h && h.did.n === 1 && h.did.items.crop_carrot === 3 && inv().crop_carrot === 3, { h, inv: inv() });
  check('...pays the crop\'s Farming XP', h.did.xp === C.carrot.xp && ((farming().level > lvl0) || farming().xp - xp0 === C.carrot.xp), { did: h.did, farming: farming() });
  check('...and the bed is rough again', h.plots[3].s === 'rough' && stored().plots[3].s === 'rough');
  const again = await act(ws, 'harvest', [3]);
  check('a resent harvest pays nothing (the bed is the replay guard)', !!again && again.did.n === 0 && inv().crop_carrot === 3, again);

  later(2 * 60000);          /* 8 min: the dry carrots ripen */
  const h2 = await act(ws, 'harvest', [0, 1]);
  check('the unwatered carrots ripen at 8 minutes: 3 (fertilized) + 2', !!h2 && h2.did.n === 2 && h2.did.items.crop_carrot === 5 && inv().crop_carrot === 8, { h2, inv: inv() });
  check('...and the XP is per bed (2 x ' + C.carrot.xp + ')', h2.did.xp === 2 * C.carrot.xp, h2.did);
  check('the yield rule: 2 dry, 3 fertilized, for every starter crop',
    Object.values(C).every((c) => farmYield(c, false) === 2 && farmYield(c, true) === 3));
}

// ── 6. Farming levels, and the Grower's Guild can finally see them ──
{
  ps().lifeSkills.farming = { level: 1, xp: 0 };
  later(60 * 60000);   /* the firebloom from §4 is long ripe */
  resetRate();
  const v = await act(ws, 'harvest', [4]);
  check('a firebloom harvest pays Firebloom (the Cookhouse\'s herb) and 50 XP', !!v && v.did.items.herb_firebloom === 2 && v.did.xp === 50 && farming().xp === 50, { v, farming: farming() });
  /* Enough XP to level: six ripe Cloudpetal beds pay 6 x 180 = 1,080 XP
     on top of the 50 just earned -- 1,130, past what Farming 2 costs (the
     worker's own curve, read here, not copied: v2.3.3090 doubled it, and
     this test's 770-XP Rock Vine harvest stopped levelling). */
  const T2 = room._lifeSkillXpThreshold(1);
  const total = 50 + 6 * C.cloudpetal.xp;
  check('(the test\'s harvest is worth a level: ' + total + ' XP >= ' + T2 + ')', total >= T2 && total < T2 + room._lifeSkillXpThreshold(2));
  const st0 = stored();
  st0.plots = st0.plots.map(() => ({ s: 'planted', crop: 'cloudpetal', plantedAt: Date.now() - 12 * 3600000, readyAt: Date.now() - 1 }));
  await room.state.storage.put('farm:' + PID, st0);
  const lv = await act(ws, 'harvest', [0, 1, 2, 3, 4, 5]);
  check('harvesting enough levels Farming, and says so (Farming 2, the rest carried over)', !!lv && lv.did.leveled === true && lv.did.fromLevel === 1
    && lv.did.newLevel === 2 && farming().level === 2 && farming().xp === total - T2 && lv.did.items.herb_cloudpetal === 12, { did: lv && lv.did, farming: farming(), T2 });
}

// ── 7. growing while you are away ──
{
  resetRate();
  await act(ws, 'dig', [0, 1]);
  inv().seed_carrot = 2;
  await act(ws, 'plant', [0, 1], 'carrot');
  const ws2 = fakeWs();
  /* the same player comes back after an hour on a new connection */
  room.sessions.delete(ws);
  later(60 * 60000);
  await join(ws2, PID);
  const login = ws2.sent.find((m) => m.type === 'farm_state' && m.payload && m.payload.login);
  const ripe = login ? login.payload.plots.filter((p) => p.s === 'planted' && p.readyAt <= login.payload.now).length : -1;
  check('a rejoin is sent the farm, flagged login, with the two carrots ripe', !!login && ripe === 2, login && login.payload);
}

const wsB = fakeWs();
await join(wsB, 'bp_farm_b');
const psB = () => room.playerState['bp_farm_b'];
const stored2 = () => st._store.get('farm:bp_farm_b');

// ── 8. junk bed indexes, a corrupt record ──
{
  await farm(wsB, 'farm_open', {});
  const v = await act(wsB, 'dig', [-1, 6, 99, 'x', '0', null, 2.7, 3, 3, 3]);
  check('out-of-range, junk, non-number and duplicate beds are skipped: only bed 3, once', !!v && v.did.n === 1 && v.plots[3].s === 'tilled'
    && v.plots.filter((p) => p.s === 'tilled').length === 1, v);
  /* 4,000 entries fits under the room's 16 KB frame gate, so this one reaches
     the handler -- which reads only the first MAX_BEDS * 2 of them. */
  const long = new Array(4000).fill(5);
  const h = await act(wsB, 'dig', long);
  check('a four-thousand-entry bed list digs one bed, once', !!h && h.did.n === 1 && h.plots[5].s === 'tilled', h && h.did);
  const huge = new Array(100000).fill(0);
  const dropped = await act(wsB, 'dig', huge);
  check('a hundred-thousand-entry list never reaches the farm (the room\'s frame gate drops it)', dropped === null && stored2().plots[0].s === 'rough');
  check('a beds field that is not a list does nothing', (await act(wsB, 'dig', { 0: 1 })) === null);
  check('an unknown op does nothing', (await farm(wsB, 'farm_act', { op: 'steal', beds: [0] })) === null
    && (await farm(wsB, 'farm_act', { op: '__proto__', beds: [0] })) === null);
  await room.state.storage.put('farm:bp_farm_b', { beds: 1e9, plots: [
    { s: 'planted', crop: '__proto__', plantedAt: 0, readyAt: 0 },
    { s: 'planted', crop: 'carrot', plantedAt: 'x', readyAt: 0 },
    { s: 'ripe' }, null, 'junk',
  ] });
  resetRate();
  const healed = await farm(wsB, 'farm_open', {});
  check('a corrupt record heals: beds clamped to ' + FARM.MAX_BEDS + ', unreadable plantings become rough beds',
    !!healed && healed.beds === FARM.MAX_BEDS && healed.plots.length === FARM.MAX_BEDS && healed.plots.every((p) => p.s === 'rough'), healed && healed.plots.slice(0, 5));
  const nothing = await act(wsB, 'harvest', [0, 1]);
  check('...and pays nothing', !!nothing && nothing.did.n === 0 && !psB().inventory.crop_carrot);
}

// ── 9. rate limit, kill switch ──
{
  resetRate();
  let answered = 0;
  for (let i = 0; i < FARM.MSG_PER_MIN + 10; i++) {
    wsB.sent.length = 0;
    await room.webSocketMessage(wsB, JSON.stringify({ type: 'farm_open', payload: {} }));
    await new Promise((r) => setImmediate(r));
    if (wsB.sent.some((m) => m.type === 'farm_state')) answered++;
  }
  await settle();
  check('past ' + FARM.MSG_PER_MIN + ' farm messages in a minute, the worker stops answering', answered <= FARM.MSG_PER_MIN && answered >= FARM.MSG_PER_MIN - 2, answered);
  later(61000);
  check('...and a minute later it answers again', !!(await farm(wsB, 'farm_open', {})));

  room._liveFlags = { ...(room._liveFlags || {}), farm: false };
  const off = await act(ws2Ref(), 'harvest', [0, 1]);
  check('switched off: a harvest is refused with err off', !!off && off.err === 'off' && !off.did);
  check('...the farm keeps its beds and times', stored().plots[0].s === 'planted' && stored().plots[1].s === 'planted');
  const ws3 = fakeWs();
  await join(ws3, 'bp_farm_c');
  const sync = ws3.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is told the farm is off', !!sync && sync.caps.farm === false);
  room._liveFlags = { ...room._liveFlags, farm: true };
}
function ws2Ref() {
  for (const [w, s] of room.sessions) if (s && s.id === PID) return w;
  return ws;
}

// ── 10. Diego can never be a farm faucet ──
{
  let ok = true;
  const bad = [];
  for (const c of Object.values(C)) {
    const pay = room._shopBuyPrice(c.seed, 0);
    if (pay > c.price) { ok = false; bad.push({ seed: c.seed, pay, price: c.price }); }
    if (room._shopBaseValue(c.item) !== c.base) { ok = false; bad.push({ item: c.item, base: room._shopBaseValue(c.item), want: c.base }); }
  }
  const cp = room._shopBuyPrice('compost', 0);
  if (cp > FARM.COMPOST_PRICE) { ok = false; bad.push({ compost: cp }); }
  check('Diego pays less for a seed or compost than the Feed & Seed charges, and values each crop at the plan\'s price', ok, bad);
  check('...every farm key is in his table', Object.keys(FARM_SHOP_BASE).every((k) => room._shopBaseValue(k) === FARM_SHOP_BASE[k]));
  check('...a carrot fetches 4 into an empty pile, a Cloudpetal 20', room._shopBuyPrice('crop_carrot', 0) === 4 && room._shopBuyPrice('herb_cloudpetal', 0) === 20);
}

// ── 11. the Cookhouse's herb recipes work, and do what their cards say ──
{
  const P = psB();
  P.inventory.herb_firebloom = 3;
  P.inventory.herb_rock_vine = 1;
  P.inventory.herb_cloudpetal = 1;
  /* Herb Bread (index 0): 1 Firebloom -> its `rest` timer (v2.3.3130) */
  wsB.sent.length = 0;
  await room.webSocketMessage(wsB, JSON.stringify({ type: 'cook_recipe', payload: { recipeIdx: 0 } }));
  await settle();
  check('Herb Bread cooks from one farm Firebloom', P.inventory.herb_firebloom === 2 && room._buffActive(P, 'rest'), { inv: P.inventory, buffs: P._buffs });
  /* v2.3.3130: an OLD client's cook (no `carry`) is the meal at once, and a
     meal lasts half an hour now. */
  check('...a meal: half an hour', P._buffs.rest > Date.now() + 29 * 60000, P._buffs);
  P.z = 'wheel';               /* a combat zone, not a hub */
  P.maxHp = 200; P.hp = 100;
  P.lastDamageAt = Date.now() - 10000;   /* out of combat: the trickle runs */
  P._lastDealtAt = Date.now() - 10000;
  room._tickPlayerRegen();
  const plain = Math.round(200 * room.SPOKE_REGEN_PCT);
  check('...and HEALS: twice the out-of-combat trickle (' + (2 * plain) + ' HP a tick at 200 max HP, against ' + plain + ')',
    P.hp === 100 + 2 * plain, { hp: P.hp, plain });
  P.hp = 100;
  P.lastDamageAt = Date.now();   /* mid-fight: no trickle, and no bread either */
  P._lastDealtAt = Date.now();
  room._tickPlayerRegen();
  check('...but not mid-fight: a half-hour meal that healed in a fight would be a full bar every minute', P.hp === 100, P.hp);
  P._buffs = {};
  P.lastDamageAt = Date.now() - 10000;
  P._lastDealtAt = Date.now() - 10000;
  room._tickPlayerRegen();
  check('...which is the bread: with no buff, the plain trickle', P.hp === 100 + plain, P.hp);
  /* v2.3.3127: the recipe's Cooking level is the WORKER's gate, not only the
     window's: at Cooking 1 the Tea (Cooking 6) is refused, nothing is used,
     and the bag is echoed so a predicted cook snaps back. */
  P.lifeSkills.cooking = { level: 1, xp: 0 };
  wsB.sent.length = 0;
  await room.webSocketMessage(wsB, JSON.stringify({ type: 'cook_recipe', payload: { recipeIdx: 2 } }));
  await settle();
  check('Firebloom Tea is refused below Cooking 6: no buff, no herbs used, no XP, the bag echoed',
    P.inventory.herb_firebloom === 2 && !room._buffActive(P, 'damage') && P.lifeSkills.cooking.xp === 0
    && wsB.sent.some((m) => m.type === 'player_state'), { inv: P.inventory, buffs: P._buffs, ck: P.lifeSkills.cooking });
  await room.webSocketMessage(wsB, JSON.stringify({ type: 'cook_recipe', payload: { recipeIdx: 1 } }));
  await settle();
  check('...and Root Stew below Cooking 3', P.inventory.herb_rock_vine === 1 && P.inventory.herb_cloudpetal === 1 && !room._buffActive(P, 'resist'));
  P.lifeSkills.cooking = { level: 6, xp: 0 };
  /* Firebloom Tea (index 2): 2 Firebloom -> damage x1.20 */
  await room.webSocketMessage(wsB, JSON.stringify({ type: 'cook_recipe', payload: { recipeIdx: 2 } }));
  await settle();
  check('Firebloom Tea cooks from two Firebloom and is +20% damage, as its card says', P.inventory.herb_firebloom === undefined
    && room._buffActive(P, 'damage') && P._buffs.damageMul === 1.2, { inv: P.inventory, buffs: P._buffs });
  /* Root Stew (index 1): Rock Vine + Cloudpetal -> resist */
  await room.webSocketMessage(wsB, JSON.stringify({ type: 'cook_recipe', payload: { recipeIdx: 1 } }));
  await settle();
  check('Root Stew cooks from a Rock Vine and a Cloudpetal, and runs BESIDE the tea (v2.3.3130: one meal and one brew)', room._buffActive(P, 'resist')
    && room._buffActive(P, 'damage') && P._buffs.damageMul === 1.2 && !P.inventory.herb_rock_vine && !P.inventory.herb_cloudpetal, P._buffs);

  /* ═══ v2.3.3130: A COOK WITH `carry` PUTS THE DISH IN THE BAG ═══ */
  P._buffs = {};
  P.inventory.herb_firebloom = 1;
  const xp0 = P.lifeSkills.cooking.xp;
  wsB.sent.length = 0;
  await room.webSocketMessage(wsB, JSON.stringify({ type: 'cook_recipe', payload: { recipeIdx: 0, carry: true } }));
  await settle();
  check('a carried cook makes a Herb Bread in the bag, uses the Firebloom and pays the Cooking XP -- and runs nothing yet',
    P.inventory.meal_herb_bread === 1 && !P.inventory.herb_firebloom && P.lifeSkills.cooking.xp === xp0 + 25
    && !room._buffActive(P, 'rest') && wsB.sent.some((m) => m.type === 'player_state'), { inv: P.inventory, buffs: P._buffs, ck: P.lifeSkills.cooking });
  await room.webSocketMessage(wsB, JSON.stringify({ type: 'eat_request', payload: { invKey: 'meal_herb_bread' } }));
  await settle();
  check('...eaten later, it is the meal: half an hour of the bread', !P.inventory.meal_herb_bread && room._buffActive(P, 'rest')
    && P._buffs.rest > Date.now() + 29 * 60000, { inv: P.inventory, buffs: P._buffs });
}

// ── 12. the bed turns before anything is paid (v2.3.3127, review) ──
{
  const PD = 'bp_farm_d';
  const wsD = fakeWs();
  room.sessions.set(wsD, baseSession());
  await room.webSocketMessage(wsD, JSON.stringify({ type: 'join', id: PD, name: 'D', phrase: 'p-' + PD,
    data: { x: 0, y: 0, z: 'town', rpgCoins: 50, rpgLifeSkills: { farming: 1, mining: 'x', fishing: true, woodcutting: [] } } }));
  await settle();
  const pD = room.playerState[PD];
  check('a first join\'s life skill that is not an object is kept as a fresh skill (1, \'x\', true, [])', !!pD
    && pD.lifeSkills.farming && pD.lifeSkills.farming.level === 1 && pD.lifeSkills.farming.xp === 0
    && pD.lifeSkills.mining.level === 1 && pD.lifeSkills.fishing.level === 1
    && !Array.isArray(pD.lifeSkills.woodcutting) && pD.lifeSkills.woodcutting.level === 1, pD && pD.lifeSkills);
  /* A record already holding one, from before that heal: the in-memory state
     the exploit ran on. */
  pD.lifeSkills.farming = 1;
  resetRate();
  await farm(wsD, 'farm_open', {});
  await buy(wsD, 'seed_carrot', 1);
  await act(wsD, 'dig', [0]);
  await act(wsD, 'plant', [0], 'carrot');
  later(8 * 60000);
  const h1 = await act(wsD, 'harvest', [0]);
  const h2 = await act(wsD, 'harvest', [0]);
  const h3 = await act(wsD, 'harvest', [0]);
  const rD = st._store.get('rpg:' + PD);
  check('a bare-number Farming skill: the harvest pays its 2 carrots and its XP, once', !!h1 && h1.did.n === 1
    && h1.did.items.crop_carrot === 2 && h1.did.xp === C.carrot.xp && pD.lifeSkills.farming.xp === C.carrot.xp, { h1: h1 && h1.did, ls: pD.lifeSkills.farming });
  check('...a resent harvest finds grass and pays nothing, twice over', !!h2 && h2.did.n === 0 && !!h3 && h3.did.n === 0
    && pD.inventory.crop_carrot === 2, { h2: h2 && h2.did, h3: h3 && h3.did, inv: pD.inventory });
  check('...and storage agrees: the bed is grass and the saved bag holds 2', st._store.get('farm:' + PD).plots[0].s === 'rough'
    && !!rD && rD.inventory.crop_carrot === 2, { bed: st._store.get('farm:' + PD).plots[0], inv: rD && rD.inventory });
  /* And should paying the XP throw anyway, the harvest still lands once. */
  pD.inventory.seed_carrot = 1;
  await act(wsD, 'dig', [0]);
  await act(wsD, 'plant', [0], 'carrot');
  later(8 * 60000);
  const realXp = room._addLifeSkillXp;
  room._addLifeSkillXp = () => { throw new Error('test: the XP fails'); };
  const realErr = console.error;
  console.error = () => {};
  const t1 = await act(wsD, 'harvest', [0]);
  const t2 = await act(wsD, 'harvest', [0]);
  console.error = realErr;
  room._addLifeSkillXp = realXp;
  check('if paying the XP throws, the harvest still lands once: the crops, no XP, the bed grass in storage', !!t1 && t1.did.n === 1
    && t1.did.xp === 0 && !!t2 && t2.did.n === 0 && pD.inventory.crop_carrot === 4
    && st._store.get('farm:' + PD).plots[0].s === 'rough' && st._store.get('rpg:' + PD).inventory.crop_carrot === 4,
    { t1: t1 && t1.did, t2: t2 && t2.did, inv: pD.inventory });
}

// ── 13. a character restart takes the farm with it (v2.3.3127, review) ──
{
  const PR = 'bp_farm_r';
  const wsR = fakeWs();
  await join(wsR, PR);
  resetRate();
  await farm(wsR, 'farm_open', {});
  room.playerState[PR].inventory.seed_carrot = 2;
  await act(wsR, 'dig', [0, 1]);
  await act(wsR, 'plant', [0, 1], 'carrot');
  check('(a farm with two carrots in the ground)', st._store.get('farm:' + PR).plots[1].s === 'planted');
  await room._resetCharacterData(PR);
  check('a character restart deletes farm:<pid> with rpg:<pid>', st._store.get('farm:' + PR) === undefined && st._store.get('rpg:' + PR) === undefined);
  later(60 * 60000);
  const wsR2 = fakeWs();
  await join(wsR2, PR);
  check('...the fresh character is told of no ripe beds', !wsR2.sent.some((m) => m.type === 'farm_state'));
  const v = await farm(wsR2, 'farm_open', {});
  check('...and the Feed & Seed hands out the free deed again: six rough beds', !!v && v.beds === FARM.FREE_BEDS
    && v.plots.length === FARM.FREE_BEDS && v.plots.every((p) => p.s === 'rough'), v);
}

// ── 14. a newer worker's record is left alone (v2.3.3127, review) ──
{
  const PN = 'bp_farm_n';
  const wsN = fakeWs();
  await join(wsN, PN);
  resetRate();
  const future = { v: FARM.V + 1, beds: 8, helpers: ['bp_friend'], plots: [
    { s: 'planted', crop: 'potato', plantedAt: Date.now() - 3600000, readyAt: Date.now() - 1, water: 1, feed: 1, quality: 2 },
    { s: 'rough' }, { s: 'tilled' }, { s: 'rough' }, { s: 'rough' }, { s: 'rough' }, { s: 'rough' }, { s: 'rough' },
  ] };
  await room.state.storage.put('farm:' + PN, future);
  const before = JSON.stringify(st._store.get('farm:' + PN));
  const o = await farm(wsN, 'farm_open', {});
  check('a record from a newer worker: opening the window answers err newer, with no beds', !!o && o.err === 'newer' && !o.plots, o);
  const a = await act(wsN, 'dig', [1]);
  const h = await act(wsN, 'harvest', [0]);
  check('...a dig and a harvest are refused the same way', !!a && a.err === 'newer' && !!h && h.err === 'newer', { a, h });
  check('...nothing paid', !room.playerState[PN].inventory.crop_potato, room.playerState[PN].inventory);
  const r = await room._devFarmRipe(PN);
  check('...the dev op ripens nothing', r.ok === true && r.ripened === 0, r);
  const wsN2 = fakeWs();
  room.sessions.delete(wsN);
  await join(wsN2, PN);
  check('...no join notice is sent from it', !wsN2.sent.some((m) => m.type === 'farm_state'));
  check('...and storage holds the newer record exactly as it was', JSON.stringify(st._store.get('farm:' + PN)) === before);
  const deed = st._store.get('farm:bp_farm_r');   /* §13's free deed, made after the restart */
  check('this worker\'s own records say which shape they are (v ' + FARM.V + ')', stored().v === FARM.V && !!deed && deed.v === FARM.V, { a: stored().v, deed: deed && deed.v });
}

Date.now = realNow;
console.log(failures ? `\n${failures} FAILURE(S)` : '\nall farm checks passed');
process.exit(failures ? 1 : 0);
