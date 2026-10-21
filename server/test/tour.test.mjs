/* The tour -- v2.3.3525 (server/src/data.js QUEST_REWARDS tut_1's header,
 * server/src/quests.js, server/src/race.js).  docs/specs/demo-quest-line.md.
 *
 * The owner, a week before an exposé: "it would be more fun if the quest line
 * was more diversified instead of spending so much time with just going to
 * different lands, killing a certain number of monsters until you have the
 * right number of their remains, then turning it back in."  The tour hands a
 * new player from Mayor Bro to the townsfolk and back, every step a different
 * part of the game, every step checked here by the worker.  Then the owner:
 * "Maybe mayor bro is the only quest available for the first quest then after
 * completing that other NPCs begin having quest icons appear above their
 * head" -- so the Mayor's first quest comes alone, and then the whole town at
 * once.
 *
 *   1. THE TABLE: the suggested order (QUEST_TOUR) a player may follow; the
 *      Mayor's first quest opening nothing by `next` and six townsfolk waiting
 *      on it; each giver's second step on his first; Zoom Juice on the carrots
 *      AND Diego's cooking; the snowmen on Blacksmith Bro's ore and Diego's
 *      fish (v2.3.3533; it was the whole town); no `next` that skips
 *      an `after`; every step checked; the retired errands; tools `max: 1`.
 *   2. ORDER: a step is refused before what it waits for is handed in; with
 *      tut_1 in, all six first steps are taken at once; farm_2 waits for
 *      fish_1 too; a retired quest is refused, and one already active still
 *      hands in.
 *   3. farm_1 through the farm's own handlers: seeds and compost on accept,
 *      only waters while it runs count, the count saved with the player.
 *   4. smith_1 / smith_2: the pickaxe once, five ore for five bars; a copper
 *      SWORD at Smithing 1 and Melee 1 from those five bars counts, copper
 *      armour counts, a bow does not.
 *   5. wood_1 / wood_2: the axe, five logs for five hardened pine; a pine bow
 *      from FIVE hardened pine (and Woodworking XP for it); the trade -- the
 *      bow in your hands first, its grade kept, the stash's pine left alone;
 *      a staff from the bag; nothing to trade refuses the hand-in whole.
 *   6. SOFTWOOD is free to wear and to make at Bow/Magic 1; Woodworking 5 makes
 *      it; the forge asks what wearing asks.
 *   7. fish_1: the rod and two logs, two cooked fish for ten cooked
 *      clownfish.
 *   8. farm_2 and ZOOM JUICE: row 9 from three carrots into the bag, counted;
 *      another recipe is not; drunk, 1.25x for five minutes, the move bound
 *      widened by as much.
 *   9. race_1 / race.js: every refusal; nothing before the gun; the flags in
 *      order, tested along the step; a win before Lil Bro's time credits and
 *      saves, a late one does not; leaving the Wheel ends it; the switch.
 *  10. The Mayor's snowmen (v2.3.3533): refused until both the ore and the
 *      fish are in, taken then with the rest of the town still to do, then
 *      tut_3, and the town still there after them.
 *  11. The owner's levers: /dev/tour jumps to a step, /dev/questcount sets a
 *      counted step's count.
 */
import { GameRoom } from '../src/index.js';
import { QUEST_REWARDS, QUEST_RETIRED, QUEST_TOUR, WOODWORKING_TIERS, BLACKSMITH_TIERS, COOKING_RECIPES, SHOP_ITEMS } from '../src/data.js';
import { QUEST_COUNTED } from '../src/quests.js';
import { RACE, lilLapMs, lilLapPx, segDist } from '../src/race.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

/* ── a movable clock ── */
const realNow = Date.now;
let clock = realNow();
Date.now = () => clock;
const tick = (ms) => { clock += ms; };

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
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const last = (ws, type) => { const r = msgsOfType(ws, type); return r.length ? r[r.length - 1].payload : null; };

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
}
const send = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
const settle = () => new Promise((r) => setTimeout(r, 0));

const TOUR = QUEST_TOUR;
const FIRSTS = ['farm_1', 'smith_1', 'wood_1', 'fish_1', 'race_1', 'beast_1'];
/* v2.3.3533: the Mayor's snowmen wait on these two, no longer the whole town */
const SNOW_GATE = ['smith_1', 'fish_1'];
const listOf = (af) => (Array.isArray(af) ? af : af ? [af] : []);

// ── 1. THE TABLE ──
{
  check('the tour\'s suggested order: the Mayor\'s slimes, Blacksmith Bro\'s ore and forge, Diego\'s fish, the Mayor\'s snowmen, then the rest of the town (v2.3.3533)',
    TOUR.join() === 'tut_1,smith_1,smith_2,fish_1,tut_2,farm_1,wood_1,wood_2,farm_2,race_1,beast_1,beast_2', TOUR);
  check('every step of the tour is checked by the worker', TOUR.every((q) => !!QUEST_REWARDS[q].objective), TOUR.filter((q) => !QUEST_REWARDS[q].objective));
  check('the Mayor\'s first quest opens nothing by `next`, and six townsfolk wait on it (`after: tut_1`)',
    !QUEST_REWARDS.tut_1.next && FIRSTS.every((q) => QUEST_REWARDS[q].after === 'tut_1'), FIRSTS.map((q) => [q, QUEST_REWARDS[q].after]));
  check('each giver\'s second step waits on his first, which opens it (`next`): smith_2, wood_2, beast_2',
    [['smith_1', 'smith_2'], ['wood_1', 'wood_2'], ['beast_1', 'beast_2']].every(([a, b]) => QUEST_REWARDS[b].after === a && QUEST_REWARDS[a].next === b));
  check('Zoom Juice waits on the carrots AND Diego\'s cooking (farm_2 after farm_1 and fish_1), and neither opens it early',
    JSON.stringify(QUEST_REWARDS.farm_2.after) === '["farm_1","fish_1"]' && !QUEST_REWARDS.farm_1.next && !QUEST_REWARDS.fish_1.next, QUEST_REWARDS.farm_2.after);
  check('the Mayor\'s snowmen wait on Blacksmith Bro\'s ore and Diego\'s fish, not the whole town (v2.3.3533)',
    JSON.stringify(QUEST_REWARDS.tut_2.after) === JSON.stringify(SNOW_GATE), QUEST_REWARDS.tut_2.after);
  /* a `next` opens its step at once, and the worker never refuses a step it
     opened -- so a `next` that led to a step waiting on more than the step
     before it would open it early */
  const leaks = Object.keys(QUEST_REWARDS).filter((q) => {
    const nx = QUEST_REWARDS[q].next;
    const af = nx && QUEST_REWARDS[nx] ? listOf(QUEST_REWARDS[nx].after) : [];
    return af.length > 0 && !(af.length === 1 && af[0] === q);
  });
  check('no `next` opens a step that waits on anything more than the step that opened it', leaks.length === 0, leaks);
  const early = TOUR.filter((q, i) => listOf(QUEST_REWARDS[q].after).some((a) => { const j = TOUR.indexOf(a); return j < 0 || j >= i; }));
  check('the suggested order is one a player may follow: whatever a step waits on comes before it', early.length === 0, early);
  check('the Beastmaster\'s own line waits on the snowmen (beast_3 after tut_2)', QUEST_REWARDS.beast_3.after === 'tut_2', QUEST_REWARDS.beast_3);
  check('every objective type the tour uses is a counted kind or collect', TOUR.every((q) => {
    const t = QUEST_REWARDS[q].objective.type;
    return t === 'collect' || QUEST_COUNTED.indexOf(t) >= 0;
  }), TOUR.map((q) => QUEST_REWARDS[q].objective.type));
  /* v2.3.3542: and the first quest's Melee XP, a first level-up at the
     hand-in -- named (`xpTo`), so still no skill to choose */
  check('no step of the tour but the Mayor\'s snowmen and his first quest\'s fixed Melee XP pays combat XP (the trades pay their own XP)',
    TOUR.filter((q) => q !== 'tut_2' && q !== 'tut_1').every((q) => QUEST_REWARDS[q].xp === 0) && QUEST_REWARDS.tut_2.xp > 0
      && QUEST_REWARDS.tut_1.xp > 0 && QUEST_REWARDS.tut_1.xpTo === 'sword',
    TOUR.map((q) => [q, QUEST_REWARDS[q].xp, QUEST_REWARDS[q].xpTo || null]));
  check('life_1 and life_2 are retired', QUEST_RETIRED.indexOf('life_1') >= 0 && QUEST_RETIRED.indexOf('life_2') >= 0, QUEST_RETIRED);
  const tools = [['smith_1', 'mining_pickaxe'], ['wood_1', 'woodcutting_axe'], ['fish_1', 'fishing_pole']];
  check('each tool comes from the man whose trade it is, on accept, never a second', tools.every(([q, k]) =>
    (QUEST_REWARDS[q].grantOnAccept || []).some((g) => g.kind === 'inv' && g.key === k && g.max === 1)), tools);
  check('...and Diego adds two pine logs for the fire (the Woodworker\'s axe may not be yours yet)',
    (QUEST_REWARDS.fish_1.grantOnAccept || []).some((g) => g.kind === 'inv' && g.key === 'wood_pine_log' && g.n === 2), QUEST_REWARDS.fish_1.grantOnAccept);
  check('the race is Lil Bro\'s lap: a flag on each corner and the finish at his spot, the lap ~24 s at 165 px/s',
    RACE.FLAGS.length === 5 && RACE.FLAGS[4][0] === RACE.START[0] && RACE.FLAGS[4][1] === RACE.START[1]
      && RACE.FLAGS.slice(0, 4).every((f, i) => f[0] === RACE.LIL_PATH[i + 1][0] && f[1] === RACE.LIL_PATH[i + 1][1])
      && lilLapPx() > 3900 && lilLapPx() < 4100 && lilLapMs() > 23500 && lilLapMs() < 25000, { px: lilLapPx(), ms: lilLapMs() });
  /* THE TUNE.  The shortest line a player may run (each turn anywhere within
     FLAG_R of its flag, the lap begun at Lil Bro's spot), worked out by
     pulling each turn toward the straight line between its neighbours; then a
     player's real line, 8% longer, with 0.4 s lost at the gun.  A walk is 150
     px a second, a sprint 1.33x for a full bar (100 stamina at 11 a second),
     Zoom Juice 1.25x.  Walking loses, a sprint wins, the juice wins walking. */
  const pts = [RACE.START.slice(), ...RACE.FLAGS.map((f) => f.slice())];
  const ctr = [RACE.START, ...RACE.FLAGS], rad = [0, ...RACE.FLAGS.map(() => RACE.FLAG_R)];
  for (let it = 0; it < 3000; it++) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = i + 1 < pts.length ? pts[i + 1] : pts[i - 1], c = ctr[i];
      const vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy;
      const t = i + 1 < pts.length && L ? Math.max(0, Math.min(1, ((c[0] - a[0]) * vx + (c[1] - a[1]) * vy) / L)) : 0;
      const tx = a[0] + vx * t, ty = a[1] + vy * t, dx = tx - c[0], dy = ty - c[1], d = Math.hypot(dx, dy);
      pts[i] = d <= rad[i] ? [tx, ty] : [c[0] + dx / d * rad[i], c[1] + dy / d * rad[i]];
    }
  }
  let shortest = 0;
  for (let i = 1; i < pts.length; i++) shortest += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const real = shortest * 1.08, gun = 400, bar = 100 / 11, fast = 150 * 1.33;
  const walkMs = real / 150 * 1000 + gun, juiceMs = real / (150 * 1.25) * 1000 + gun;
  const sprintMs = (fast * bar >= real ? real / fast : bar + (real - fast * bar) / 150) * 1000 + gun;
  check(`the tune: the shortest line ${Math.round(shortest)} px; on a real line a walk loses (${Math.round(walkMs)} ms against Lil Bro's ${lilLapMs()}), a bar of sprint wins (${Math.round(sprintMs)}), Zoom Juice wins walking (${Math.round(juiceMs)})`,
    walkMs > lilLapMs() + 1000 && sprintMs < lilLapMs() - 1000 && juiceMs < lilLapMs() - 2500, { shortest, walkMs, sprintMs, juiceMs, lil: lilLapMs() });
  check('segDist: a segment that passes a point is near it, one that stops short is not',
    segDist(0, 0, 200, 0, 100, 50) === 50 && Math.round(segDist(0, 0, 40, 0, 100, 0)) === 60, {});
}

/* A fresh player in the Wheel, joined as a phone joins */
async function fresh(id) {
  const ws = fakeWs(id);
  await join(ws, id);
  const ps = room.playerState[id];
  ps.z = WHEEL_ZONE;
  ps._quests = Object.create(null);
  ps._questKills = Object.create(null);
  ps.inventory = {};
  ps.coins = 1000;
  return { ws, ps, sess: { id } };
}
const turnIn = (P, questId, extra) => send(P.ws, 'quest_turn_in', Object.assign({ questId }, extra || {}));
const accept = (P, questId) => send(P.ws, 'quest_accept', { questId });

// ── 2. ORDER ──
{
  const P = await fresh('bp_tour_order');
  await accept(P, 'farm_1');
  check('farm_1 is refused before the Mayor\'s first quest is handed in', !P.ps._quests.farm_1, P.ps._quests);
  P.ps._quests.tut_1 = 'turnedIn';
  await accept(P, 'farm_1');
  check('...and taken once it is', P.ps._quests.farm_1 === 'active', P.ps._quests);
  await accept(P, 'smith_2');
  check('smith_2 is refused ahead of smith_1 (its `after`)', !P.ps._quests.smith_2, P.ps._quests);
  for (const q of FIRSTS) await accept(P, q);
  check('with tut_1 in, all six townsfolk\'s first steps are taken at once', FIRSTS.every((q) => P.ps._quests[q] === 'active'), P.ps._quests);
  P.ps._quests.farm_1 = 'turnedIn';
  await accept(P, 'farm_2');
  check('farm_2 is refused with the carrots in but not Diego\'s fish_1', !P.ps._quests.farm_2, P.ps._quests);
  P.ps._quests.fish_1 = 'turnedIn';
  await accept(P, 'farm_2');
  check('...and taken once both are', P.ps._quests.farm_2 === 'active', P.ps._quests);
  await accept(P, 'life_1');
  check('a retired quest (life_1) is taken by nobody', !P.ps._quests.life_1, P.ps._quests);
  P.ps._quests.life_2 = 'available';
  await accept(P, 'life_2');
  check('...not even one an old save holds as available', P.ps._quests.life_2 === 'available', P.ps._quests);
  P.ps._quests.life_1 = 'active';
  P.ps.inventory.cooked_fish_minnow = 2;
  const c0 = P.ps.coins;
  await turnIn(P, 'life_1', { xpCat: 'sword' });
  check('...while one an old save holds ACTIVE still hands in', P.ps._quests.life_1 === 'turnedIn' && P.ps.coins === c0 + QUEST_REWARDS.life_1.gold, { q: P.ps._quests.life_1, coins: P.ps.coins - c0 });
}

// ── 3. farm_1, through the farm's own handlers ──
{
  const P = await fresh('bp_tour_farm');
  P.ps._quests.tut_1 = 'turnedIn';
  await send(P.ws, 'farm_open', {});
  await settle();
  await send(P.ws, 'farm_act', { op: 'dig', beds: [0, 1, 2, 3] });
  P.ps.inventory.seed_carrot = 1;
  await send(P.ws, 'farm_act', { op: 'plant', crop: 'carrot', beds: [3] });
  await send(P.ws, 'farm_act', { op: 'water', beds: [3] });
  check('farm_1: a bed watered before the quest is taken counts for nothing', !P.ps._questKills.farm_1, P.ps._questKills);
  await accept(P, 'farm_1');
  check('farm_1: accepted, three carrot seeds and three compost handed over',
    P.ps._quests.farm_1 === 'active' && P.ps.inventory.seed_carrot === 3 && P.ps.inventory.compost === 3, P.ps.inventory);
  await send(P.ws, 'farm_act', { op: 'plant', crop: 'carrot', beds: [0, 1, 2] });
  check('farm_1: planting is not watering (the act is named)', !P.ps._questKills.farm_1, P.ps._questKills);
  await turnIn(P, 'farm_1');
  check('farm_1: refused before three beds are watered', P.ps._quests.farm_1 === 'active');
  await send(P.ws, 'farm_act', { op: 'water', beds: [0, 1] });
  await send(P.ws, 'farm_act', { op: 'water', beds: [2] });
  check('farm_1: two waters and one more are three', P.ps._questKills.farm_1 === 3, P.ps._questKills);
  await settle();
  const saved = state._store.get('rpg:bp_tour_farm');
  check('farm_1: a watering that moved the count saved the player (it writes only the farm otherwise)',
    !!saved && saved._questKills && saved._questKills.farm_1 === 3, saved && saved._questKills);
  const c0 = P.ps.coins;
  await turnIn(P, 'farm_1');
  check('farm_1: handed in -- 40 gold, no skill asked, and nothing opened by it (Zoom Juice waits for Diego\'s fish_1 too)',
    P.ps._quests.farm_1 === 'turnedIn' && P.ps.coins === c0 + 40 && !P.ps._quests.farm_2 && !P.ps._quests.smith_1, { coins: P.ps.coins - c0, q: P.ps._quests });
}

// ── 4. smith_1 / smith_2 ──
{
  const P = await fresh('bp_tour_smith');
  P.ps._quests.tut_1 = 'turnedIn';
  await accept(P, 'smith_1');
  check('smith_1: the pickaxe on accept', P.ps.inventory.mining_pickaxe === 1, P.ps.inventory);
  check('...and a second never: a player holding one keeps one',
    room._grantQuestItem(P.ps, { kind: 'inv', key: 'mining_pickaxe', n: 1, max: 1 }, 'bp_tour_smith') === false && P.ps.inventory.mining_pickaxe === 1, P.ps.inventory);
  P.ps.inventory.ore_copper_ore = 4;
  await turnIn(P, 'smith_1');
  check('smith_1: refused on four ore', P.ps._quests.smith_1 === 'active' && P.ps.inventory.ore_copper_ore === 4);
  P.ps.inventory.ore_copper_ore = 6;
  await turnIn(P, 'smith_1');
  check('smith_1: five copper ore for FIVE copper bars (one left over)',
    P.ps._quests.smith_1 === 'turnedIn' && P.ps.inventory.bar_copper === 5 && P.ps.inventory.ore_copper_ore === 1, P.ps.inventory);

  await accept(P, 'smith_2');
  P.ps.lifeSkills = Object.assign(P.ps.lifeSkills || {}, { blacksmithing: { level: 1, xp: 0 }, woodworking: { level: 1, xp: 0 } });
  if (P.ps.prog3 && P.ps.prog3.sk) P.ps.prog3.sk.sword.level = 1;
  /* a bow made does not count for the smith */
  P.ps.inventory.hardened_pine = 5;
  P.ps.rangedWeapon = null;
  await send(P.ws, 'forge_weapon', { weaponType: 'bow', tierKey: 'pine', isWoodwork: true });
  check('smith_2: a bow from the woodworker\'s bench is not the smith\'s (`what`)', !!P.ps.rangedWeapon && !P.ps._questKills.smith_2, { bow: P.ps.rangedWeapon, k: P.ps._questKills });
  P.ps.weapon = null;
  await send(P.ws, 'forge_weapon', { weaponType: 'sword', tierKey: 'copper', isWoodwork: false });
  check('smith_2: a copper sword made at Smithing 1 and Melee 1, from the five bars he gave (none left), counts',
    !!P.ps.weapon && P.ps.weapon.gearBase === 'copper' && !P.ps.inventory.bar_copper && BLACKSMITH_TIERS.copper.bars === 5 && P.ps._questKills.smith_2 === 1,
    { w: P.ps.weapon, bars: P.ps.inventory.bar_copper, k: P.ps._questKills });
  const c0 = P.ps.coins;
  await turnIn(P, 'smith_2');
  check('smith_2: handed in, 60 gold, and nothing opened by it', P.ps._quests.smith_2 === 'turnedIn' && P.ps.coins === c0 + 60 && !P.ps._quests.wood_1, P.ps._quests);

  /* armour from the armour forge counts the same */
  const A = await fresh('bp_tour_armour');
  A.ps._quests.smith_1 = 'turnedIn';
  await accept(A, 'smith_2');
  A.ps.inventory.bar_copper = 5;
  A.ps.lifeSkills = Object.assign(A.ps.lifeSkills || {}, { blacksmithing: { level: 1, xp: 0 } });
  await send(A.ws, 'forge_armor', { recipe: 'copper_torso' });
  check('smith_2: a copper torso from the armour forge counts too', A.ps._questKills.smith_2 === 1 && !A.ps.inventory.bar_copper, { k: A.ps._questKills, inv: A.ps.inventory });
}

// ── 5. wood_1 / wood_2, and the trade ──
{
  const P = await fresh('bp_tour_wood');
  P.ps._quests.tut_1 = 'turnedIn';
  await accept(P, 'wood_1');
  check('wood_1: the axe on accept', P.ps.inventory.woodcutting_axe === 1, P.ps.inventory);
  P.ps.inventory.wood_pine_log = 5;
  await turnIn(P, 'wood_1');
  check('wood_1: five pine logs for FIVE hardened pine', P.ps._quests.wood_1 === 'turnedIn' && P.ps.inventory.hardened_pine === 5 && !P.ps.inventory.wood_pine_log, P.ps.inventory);

  await accept(P, 'wood_2');
  P.ps.lifeSkills = Object.assign(P.ps.lifeSkills || {}, { woodworking: { level: 1, xp: 0 } });
  /* the Mayor's pine bow and staff in the bag, nothing in hand */
  P.ps.weaponStash = [
    { type: 'bow', tier: 'common', tierMult: 1, gearBase: 'ww_pine', name: 'Pine Bow', quality: 'normal', hardness: 0 },
    { type: 'staff', tier: 'common', tierMult: 1, gearBase: 'ww_pine', name: 'Pine Staff', quality: 'normal', hardness: 0 },
  ];
  P.ps.rangedWeapon = null;
  const xp0 = (P.ps.lifeSkills.woodworking && P.ps.lifeSkills.woodworking.xp) || 0;
  P.ps.inventory.wood_pine_log = 9;
  await send(P.ws, 'forge_weapon', { weaponType: 'bow', tierKey: 'pine', isWoodwork: true });
  check('wood_2: a pine bow is made from FIVE hardened pine -- the five he gave, not logs -- and counts',
    !!P.ps.rangedWeapon && P.ps.rangedWeapon.gearBase === 'ww_pine' && !P.ps.inventory.hardened_pine && WOODWORKING_TIERS.pine.hardenedCost === 5
      && P.ps.inventory.wood_pine_log === 9 && P.ps._questKills.wood_2 === 1,
    { bow: P.ps.rangedWeapon, inv: P.ps.inventory, k: P.ps._questKills });
  const ww = P.ps.lifeSkills.woodworking;
  check('...and pays a sword\'s XP for it (1,000 Woodworking XP for five hardened pine, as a copper sword for five bars)',
    !!ww && ((ww.level > 1) || ww.xp - xp0 === WOODWORKING_TIERS.pine.xp) && WOODWORKING_TIERS.pine.xp === 1000 && BLACKSMITH_TIERS.copper.xp === 1000, ww);
  /* the bow just made rolls its grade; make it Rare to see the trade keep it */
  P.ps.rangedWeapon.quality = 'rare';
  P.ps.rangedWeapon.hardness = 1;
  const c0 = P.ps.coins;
  await turnIn(P, 'wood_2', { trade: 'bow' });
  check('wood_2: handed in with the bow traded -- the one in your HANDS, now softwood, its grade and hardening kept',
    P.ps._quests.wood_2 === 'turnedIn' && P.ps.rangedWeapon.gearBase === 'ww_softwood'
      && P.ps.rangedWeapon.tierMult === WOODWORKING_TIERS.softwood.tierMult && P.ps.rangedWeapon.quality === 'rare'
      && P.ps.rangedWeapon.hardness === 1 && P.ps.rangedWeapon.name === 'Softwood Bow' && P.ps.coins === c0 + 60,
    { w: P.ps.rangedWeapon, coins: P.ps.coins - c0 });
  check('...the pine bow and staff in the bag left alone, and nothing opened by it',
    P.ps.weaponStash[0].gearBase === 'ww_pine' && P.ps.weaponStash[1].gearBase === 'ww_pine' && !P.ps._quests.fish_1,
    { stash: P.ps.weaponStash.map((w) => w.gearBase), q: P.ps._quests.fish_1 });
  check('the softwood bow is free to wear at Bow 1 (gear.js _isFreeTierGear)',
    room._prog3EquipOk(P.ps, 'rangedWeapon', P.ps.rangedWeapon) === true, P.ps.prog3 && P.ps.prog3.sk && P.ps.prog3.sk.bow);

  /* a staff from the bag, when that is the pick */
  const S = await fresh('bp_tour_staff');
  S.ps._quests.wood_1 = 'turnedIn';
  await accept(S, 'wood_2');
  S.ps._questKills.wood_2 = 1;
  S.ps.staffWeapon = { type: 'staff', tierMult: 1.25, gearBase: 'ww_hardwood', name: 'Hardwood Staff' };
  S.ps.weaponStash = [{ type: 'staff', tier: 'common', tierMult: 1, gearBase: 'ww_pine', name: 'Pine Staff', quality: 'normal' }];
  await turnIn(S, 'wood_2', { trade: 'staff' });
  check('wood_2: a staff picked from the BAG when the one in hand is not pine -- traded where it lies',
    S.ps._quests.wood_2 === 'turnedIn' && S.ps.weaponStash[0].gearBase === 'ww_softwood' && S.ps.staffWeapon.gearBase === 'ww_hardwood',
    { stash: S.ps.weaponStash, staff: S.ps.staffWeapon });

  /* nothing pine to trade: refused whole */
  const N = await fresh('bp_tour_notrade');
  N.ps._quests.wood_1 = 'turnedIn';
  await accept(N, 'wood_2');
  N.ps._questKills.wood_2 = 1;
  N.ps.weaponStash = []; N.ps.rangedWeapon = null; N.ps.staffWeapon = null;
  const n0 = N.ps.coins;
  await turnIn(N, 'wood_2', { trade: 'bow' });
  check('wood_2: with no pine bow or staff to trade the hand-in is refused whole -- no gold, still active, the phone told',
    N.ps._quests.wood_2 === 'active' && N.ps.coins === n0, { q: N.ps._quests.wood_2, coins: N.ps.coins - n0 });
  /* a pick the trade does not take falls back to the first it does */
  N.ps.weaponStash = [{ type: 'staff', tier: 'common', tierMult: 1, gearBase: 'ww_pine', name: 'Pine Staff' }];
  await turnIn(N, 'wood_2', { trade: '__proto__' });
  check('...and a pick it does not take ("__proto__") trades the first it has instead',
    N.ps._quests.wood_2 === 'turnedIn' && N.ps.weaponStash[0].gearBase === 'ww_softwood', N.ps.weaponStash);
}

// ── 6. softwood: made at Woodworking 5, worn and made at Bow/Magic 1 ──
{
  const P = await fresh('bp_tour_softwood');
  P.ps.lifeSkills = Object.assign(P.ps.lifeSkills || {}, { woodworking: { level: 4, xp: 0 } });
  if (P.ps.prog3 && P.ps.prog3.sk) { P.ps.prog3.sk.bow.level = 1; P.ps.prog3.sk.staff.level = 1; }
  P.ps.inventory.hardened_softwood = 8;
  P.ps.rangedWeapon = null;
  await send(P.ws, 'forge_weapon', { weaponType: 'bow', tierKey: 'softwood', isWoodwork: true });
  check('softwood: not made at Woodworking 4', !P.ps.rangedWeapon && P.ps.inventory.hardened_softwood === 8, P.ps.rangedWeapon);
  P.ps.lifeSkills.woodworking.level = 5;
  await send(P.ws, 'forge_weapon', { weaponType: 'bow', tierKey: 'softwood', isWoodwork: true });
  check('softwood: made at Woodworking 5 and Bow 1, from five hardened softwood',
    !!P.ps.rangedWeapon && P.ps.rangedWeapon.gearBase === 'ww_softwood' && P.ps.inventory.hardened_softwood === 3, { w: P.ps.rangedWeapon, inv: P.ps.inventory });
  check('every wood with a hardened wood makes its bow or staff from five of it (as five bars make a sword or a piece of armour)',
    ['pine', 'softwood', 'hardwood', 'cedar', 'maple'].every((k) => WOODWORKING_TIERS[k].hardenedCost === 5)
      && ['copper', 'iron', 'steel'].every((k) => BLACKSMITH_TIERS[k].bars === 5), {});
  check('softwood: the minLvl table is the hardened wood\'s (1 / 5 / 10 / 15 / 20)',
    ['pine', 'softwood', 'hardwood', 'cedar', 'maple'].map((k) => WOODWORKING_TIERS[k].minLvl).join() === '1,5,10,15,20', {});
  check('the swords from bars are made at the bars\' levels (copper 1, iron 5, black steel 10)',
    ['copper', 'iron', 'steel'].map((k) => BLACKSMITH_TIERS[k].minLvl).join() === '1,5,10', {});
  const hardwood = { type: 'bow', gearBase: 'ww_hardwood', tierMult: 1.25 };
  check('the ladder above softwood still gates (a hardwood bow asks Bow 10 to wear)',
    room._prog3EquipOk(P.ps, 'rangedWeapon', hardwood) === false, {});
}

// ── 7. fish_1 ──
{
  const P = await fresh('bp_tour_fish');
  P.ps._quests.tut_1 = 'turnedIn';
  await accept(P, 'fish_1');
  check('fish_1: the rod and two pine logs on accept', P.ps.inventory.fishing_pole === 1 && P.ps.inventory.wood_pine_log === 2, P.ps.inventory);
  P.ps.inventory.cooked_fish_minnow = 1;
  P.ps.inventory.cooked_fish_trout = 1;
  await turnIn(P, 'fish_1');
  check('fish_1: two cooked fish of any kind for TEN cooked clownfish',
    P.ps._quests.fish_1 === 'turnedIn' && P.ps.inventory.cooked_fish_clownfish === 10 && !P.ps.inventory.cooked_fish_minnow && !P.ps.inventory.cooked_fish_trout,
    P.ps.inventory);
}

// ── 8. farm_2 and Zoom Juice ──
{
  const row = COOKING_RECIPES.findIndex((r) => r.makes === 'zoomJuice');
  check('Zoom Juice is recipe row 9, three carrots at Cooking 1', row === 9 && COOKING_RECIPES[9].ingredients.crop_carrot === 3 && COOKING_RECIPES[9].cookLvl === 1, COOKING_RECIPES[row]);
  check('...a brew of 1.25x speed for five minutes (SHOP_ITEMS zoomJuice)',
    SHOP_ITEMS.zoomJuice && SHOP_ITEMS.zoomJuice.effect === 'spdBuff' && SHOP_ITEMS.zoomJuice.mult === 1.25 && SHOP_ITEMS.zoomJuice.duration === 300, SHOP_ITEMS.zoomJuice);
  const P = await fresh('bp_tour_juice');
  P.ps._quests.farm_1 = 'turnedIn';
  P.ps._quests.fish_1 = 'turnedIn';
  await accept(P, 'farm_2');
  P.ps.inventory.crop_carrot = 5;
  await send(P.ws, 'cook_recipe', { recipeIdx: 8, carry: true });
  check('farm_2: a Stamina Tonic is not Zoom Juice (`what`)', !P.ps._questKills.farm_2 && P.ps.inventory.staminaSalts === 1, { k: P.ps._questKills, inv: P.ps.inventory });
  await send(P.ws, 'cook_recipe', { recipeIdx: 9, carry: true });
  check('farm_2: three carrots cook a Zoom Juice into the bag, and it counts',
    P.ps.inventory.zoomJuice === 1 && !P.ps.inventory.crop_carrot && P.ps._questKills.farm_2 === 1, { inv: P.ps.inventory, k: P.ps._questKills });
  await turnIn(P, 'farm_2');
  check('farm_2: handed in, the juice kept for the race, and nothing opened by it',
    P.ps._quests.farm_2 === 'turnedIn' && P.ps.inventory.zoomJuice === 1 && !P.ps._quests.race_1, P.ps._quests);
  await send(P.ws, 'potion_drink', { invKey: 'zoomJuice' });
  const until = P.ps._buffs && P.ps._buffs.spd;
  check('Zoom Juice drunk: 1.25x for five minutes, the bottle gone',
    !P.ps.inventory.zoomJuice && P.ps._buffs.spdMul === 1.25 && until - Date.now() > 299000 && until - Date.now() <= 300000, P.ps._buffs);
  check('...and the move bound widens by as much (movement.js _moveSpeedK)', room._moveSpeedK(P.ps).spdCap === 1.25, room._moveSpeedK(P.ps));
}

// ── 9. race_1 ──
{
  const [cx, cy] = room._wheelT().WHEEL_CENTRE;
  const at = (p) => ({ x: cx + p[0], y: cy + p[1] });
  const P = await fresh('bp_tour_race');
  const stand = (x, y) => { P.ps.x = x; P.ps.y = y; P.ps.z = WHEEL_ZONE; };
  const step = async (x, y, ms) => {
    tick(ms || 100);
    P.ps.lastMoveAt = undefined;   /* the move budget is not what is under test (move-budget suite) */
    await room.webSocketMessage(P.ws, JSON.stringify({ type: 'move', x, y, z: WHEEL_ZONE }));
  };
  const s0 = at(RACE.START);
  stand(s0.x, s0.y);
  await send(P.ws, 'race_start', {});
  check('race: refused with race_1 not running', last(P.ws, 'race_end') && last(P.ws, 'race_end').err === 'quest', last(P.ws, 'race_end'));
  P.ps._quests.tut_1 = 'turnedIn';
  await accept(P, 'race_1');
  stand(s0.x + 600, s0.y);
  await send(P.ws, 'race_start', {});
  check('race: refused far from Lil Bro', last(P.ws, 'race_end').err === 'far', last(P.ws, 'race_end'));
  P.ps.z = 'town';
  await send(P.ws, 'race_start', {});
  check('race: refused outside the Wheel', last(P.ws, 'race_end').err === 'where', last(P.ws, 'race_end'));
  stand(s0.x + 40, s0.y);
  tick(5000);
  await send(P.ws, 'race_start', {});
  const st = last(P.ws, 'race_state');
  check('race: on your marks -- the course in the room\'s own coordinates, the gun in three seconds, Lil Bro\'s time',
    !!st && st.in === RACE.COUNTDOWN_MS && st.flags.length === RACE.FLAGS.length && st.flags[0][0] === cx + RACE.FLAGS[0][0] && st.lilMs === lilLapMs() && st.path.length === RACE.LIL_PATH.length,
    st);
  /* before the gun: walking through the first flag counts for nothing */
  const [f0, f1, f2, f3] = RACE.FLAGS.slice(0, 4).map(at);
  await step(f0.x, f0.y, 500);
  check('race: a flag touched before the gun counts for nothing', msgsOfType(P.ws, 'race_cp').length === 0, msgsOfType(P.ws, 'race_cp'));
  stand(s0.x, s0.y);
  tick(RACE.COUNTDOWN_MS);
  /* skipping a flag: the finish is not the next flag */
  await step(s0.x + 10, s0.y, 100);
  check('race: the finish before the flags is no finish', !msgsOfType(P.ws, 'race_end').some((m) => m.payload.won === true) && !!P.ps._race, P.ps._race);
  /* the first corner passed THROUGH between two moves (stood on by neither) */
  await step(f0.x + 160, f0.y, 1500);
  await step(f0.x - 160, f0.y, 1500);   /* the step's line crosses the first flag */
  check('race: a flag passed through between two moves counts (the step, not its end)', msgsOfType(P.ws, 'race_cp').length === 1 && last(P.ws, 'race_cp').i === 0, msgsOfType(P.ws, 'race_cp'));
  await step(f1.x, f1.y, 4000);
  await step(f2.x, f2.y, 5500);
  await step(f3.x, f3.y, 4000);
  check('race: four corners touched, in order', msgsOfType(P.ws, 'race_cp').map((m) => m.payload.i).join() === '0,1,2,3', msgsOfType(P.ws, 'race_cp'));
  await step(s0.x, s0.y, 4000);
  const end = last(P.ws, 'race_end');
  check('race: the finish before Lil Bro\'s time is a WIN, and race_1 counts it', !!end && end.won === true && end.ms < end.lilMs && P.ps._questKills.race_1 === 1 && !P.ps._race,
    { end, k: P.ps._questKills });
  await settle();
  check('...saved with the player', (state._store.get('rpg:bp_tour_race') || {})._questKills && state._store.get('rpg:bp_tour_race')._questKills.race_1 === 1, (state._store.get('rpg:bp_tour_race') || {})._questKills);
  const c0 = P.ps.coins;
  await turnIn(P, 'race_1');
  check('race_1: handed in, 50 gold, and nothing opened by it', P.ps._quests.race_1 === 'turnedIn' && P.ps.coins === c0 + 50 && !P.ps._quests.beast_1, P.ps._quests);

  /* a late finish loses, and counts nothing */
  const L = await fresh('bp_tour_race_late');
  L.ps._quests.race_1 = 'active';
  L.ps.x = s0.x; L.ps.y = s0.y; L.ps.z = WHEEL_ZONE;
  tick(5000);
  await send(L.ws, 'race_start', {});
  tick(RACE.COUNTDOWN_MS);
  const lstep = async (p, ms) => { tick(ms); L.ps.lastMoveAt = undefined; await room.webSocketMessage(L.ws, JSON.stringify({ type: 'move', x: p.x, y: p.y, z: WHEEL_ZONE })); };
  await lstep(f0, 6000); await lstep(f1, 6000); await lstep(f2, 6000); await lstep(f3, 6000); await lstep(s0, 6000);
  const lend = last(L.ws, 'race_end');
  check('race: a finish after Lil Bro\'s is LOST, and counts nothing', !!lend && lend.won === false && lend.ms > lend.lilMs && !L.ps._questKills.race_1, { lend, k: L.ps._questKills });
  /* walking off during the countdown is a false start */
  tick(5000);
  L.ps.x = s0.x; L.ps.y = s0.y; L.ps.z = WHEEL_ZONE;
  await send(L.ws, 'race_start', {});
  await lstep({ x: s0.x - 400, y: s0.y }, 1000);    /* before the gun: counted for nothing, but it moved them */
  await lstep({ x: s0.x - 450, y: s0.y }, RACE.COUNTDOWN_MS);
  check('race: a lap begun away from Lil Bro (walked off in the countdown) is a false start, lost',
    !L.ps._race && last(L.ws, 'race_end').err === 'early' && !L.ps._questKills.race_1, last(L.ws, 'race_end'));
  /* leaving the Wheel ends a race */
  tick(5000);
  L.ps.x = s0.x; L.ps.y = s0.y;
  await send(L.ws, 'race_start', {});
  L.ps.lastMoveAt = undefined;
  await room.webSocketMessage(L.ws, JSON.stringify({ type: 'move', x: 500, y: 500, z: 'town' }));
  check('race: leaving the Wheel ends the race, lost', !L.ps._race && last(L.ws, 'race_end').err === 'left', last(L.ws, 'race_end'));
  /* the switch */
  L.ps.z = WHEEL_ZONE; L.ps.x = s0.x; L.ps.y = s0.y;
  tick(5000);
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { race: false });
  await send(L.ws, 'race_start', {});
  check('race: `race: false` starts none', last(L.ws, 'race_end').err === 'off' && !L.ps._race, last(L.ws, 'race_end'));
  room._liveFlags = Object.assign({}, room._liveFlags, { race: true });
  check('race: never in the saved player', !('_race' in (state._store.get('rpg:bp_tour_race_late') || {})), Object.keys(state._store.get('rpg:bp_tour_race_late') || {}));
}

// ── 10. the Mayor's snowmen, after the ore and the fish (v2.3.3533) ──
{
  const P = await fresh('bp_tour_tail');
  P.ps._quests.tut_1 = 'turnedIn';
  await accept(P, 'tut_2');
  check('tut_2 is refused with only the Mayor\'s first quest in', !P.ps._quests.tut_2, P.ps._quests);
  P.ps._quests.smith_1 = 'turnedIn';
  await accept(P, 'tut_2');
  check('...and with Blacksmith Bro\'s ore in but not Diego\'s fish', !P.ps._quests.tut_2, P.ps._quests);
  delete P.ps._quests.smith_1;
  P.ps._quests.fish_1 = 'turnedIn';
  await accept(P, 'tut_2');
  check('...and with Diego\'s fish in but not the ore', !P.ps._quests.tut_2, P.ps._quests);
  P.ps._quests.smith_1 = 'turnedIn';
  await accept(P, 'tut_2');
  check('...and taken once both are in, with the rest of the town still to do', P.ps._quests.tut_2 === 'active'
    && ['smith_2', 'farm_1', 'wood_1', 'race_1', 'beast_1'].every((q) => !P.ps._quests[q]), P.ps._quests);
  P.ps.inventory.snowman = 4;
  const c0 = P.ps.coins;
  await turnIn(P, 'tut_2', { xpCat: 'sword' });
  check('tut_2: four snowman remains, 200 gold, and on to tut_3', P.ps._quests.tut_2 === 'turnedIn' && P.ps.coins === c0 + 200 && P.ps._quests.tut_3 === 'available', P.ps._quests);
  await accept(P, 'farm_1');
  check('...and the rest of the town is still there after the snowmen (farm_1 taken)', P.ps._quests.farm_1 === 'active', P.ps._quests);
}

// ── 11. the owner's levers: jump the tour to a step, set a counted step ──
{
  const P = await fresh('bp_tour_lever');
  const r = room._devTour('bp_tour_lever', { at: 'race_1' });
  /* v2.3.3533: in the new order the snowmen (tut_2) come before race_1 */
  const before = ['tut_1', 'smith_1', 'smith_2', 'fish_1', 'tut_2', 'farm_1', 'wood_1', 'wood_2', 'farm_2'];
  check('/dev/tour: every step before race_1 handed in, race_1 offered, the steps after it forgotten, the tools given',
    r.ok && r.step === 10 && r.of === 12 && before.every((q) => P.ps._quests[q] === 'turnedIn')
      && P.ps._quests.race_1 === 'available' && !P.ps._quests.beast_1 && !P.ps._quests.beast_2
      && ['mining_pickaxe', 'woodcutting_axe', 'fishing_pole'].every((k) => P.ps.inventory[k] === 1),
    { r, q: P.ps._quests, inv: P.ps.inventory });
  await accept(P, 'race_1');
  check('...and the worker takes it from there (race_1 accepted)', P.ps._quests.race_1 === 'active', P.ps._quests);
  const back = room._devTour('bp_tour_lever', { at: 'smith_1' });
  check('...jumped back, the later steps are forgotten (race_1 too) and the tools are not given twice',
    back.ok && P.ps._quests.smith_1 === 'available' && !P.ps._quests.race_1 && !P.ps._quests.smith_2
      && P.ps.inventory.mining_pickaxe === 1 && P.ps.inventory.fishing_pole === 1, { back, q: P.ps._quests, inv: P.ps.inventory });
  check('/dev/tour: a quest off the tour (beast_3), or none, is refused', !room._devTour('bp_tour_lever', { at: 'beast_3' }).ok
    && !room._devTour('bp_tour_lever', {}).ok);
  const off = room._devQuestCount('bp_tour_lever', { quest: 'farm_1', n: 3 });
  room._devTour('bp_tour_lever', { at: 'farm_1' });
  await accept(P, 'farm_1');
  const on = room._devQuestCount('bp_tour_lever', { quest: 'farm_1', n: 3 });
  check('/dev/questcount: refused while the quest is not active; set while it is, and it hands in',
    !off.ok && on.ok && P.ps._questKills.farm_1 === 3, { off, on });
  await turnIn(P, 'farm_1');
  check('...the seeded farm_1 handed in', P.ps._quests.farm_1 === 'turnedIn', P.ps._quests);
  room._devTour('bp_tour_lever', { at: 'smith_2' });
  await accept(P, 'smith_2');
  const big = room._devQuestCount('bp_tour_lever', { quest: 'smith_2', n: 5000 });
  const neg = room._devQuestCount('bp_tour_lever', { quest: 'smith_2', n: -4 });
  check('/dev/questcount: an unknown quest is refused, a count is clamped to 0-999',
    !room._devQuestCount('bp_tour_lever', { quest: 'nope', n: 1 }).ok && big.n === 999 && neg.n === 0 && P.ps._questKills.smith_2 === 0, { big, neg });
}

Date.now = realNow;
console.log(failures ? `\n${failures} TOUR FAILURE(S)` : '\ntour: ALL PASS');
process.exit(failures ? 1 : 0);
