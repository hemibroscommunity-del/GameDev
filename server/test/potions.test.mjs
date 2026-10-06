/* THE TWO DRAUGHTS (v2.3.2062).
 *
 * Owner: "Make the mana potion refill at a quick rate so you can just do
 * special attacks constantly for 3 mins" and "Then do a speed potion that lets
 * you run 1.5x speed 3 mins."
 *
 * Both are written against the BEHAVIOUR, not the field. That is deliberate
 * and it is the lesson of v2.3.2056: the Fury Tonic set a timer for months
 * that no combat path read, so the potion was a visual effect that cost 35
 * coins, and a test asserting "the buff is set" would have passed the whole
 * time. So:
 *   - the mana test SPENDS mana at the real cadence a player casting nonstop
 *     spends it, and asserts they never run dry;
 *   - the speed test drives the real _handleMove and asserts the server
 *     ACCEPTS a move the un-buffed cap would have rejected -- which is the
 *     failure that would actually reach a player, as rubber-banding.
 */
import { GameRoom } from '../src/index.js';
import { PROG3 } from '../src/prog3.js';
import { SHOP_ITEMS, manaSurgePerTick, MANA_SURGE } from '../src/data.js';
import { REGEN_TICKS } from '../src/tick.js';

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
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(makeState(), mockEnv);
const TICK_MS = REGEN_TICKS * room.TICK_RATE;

/* v2.3.3105: a potion is DRUNK FROM THE BAG.  These used to buy-and-apply in
   one go through the vendor building's shop_purchase; the tonics are brewed at
   the Cookhouse now and no longer on sale (data.js DIEGO_SHELF), so a bottle is
   put in the bag and drunk through the real potion_drink handler -- the effect
   code under test (_applyShopItem) is the same either way. */
const drink = (id, key) => {
  const p = room.playerState[id];
  if (!p.inventory) p.inventory = Object.create(null);
  p.inventory[key] = (p.inventory[key] || 0) + 1;
  room._handleDrinkRequest({ id }, { invKey: key });
};

/* ═══════════════ THE MANA DRAUGHT ═══════════════ */
room.playerState.caster = {
  z: 'meadow', x: 100, y: 100, hp: 100, maxHp: 100,
  mana: 10, maxMana: 100, stamina: 100, maxStamina: 100, coins: 500,
};
const ps = room.playerState.caster;

check('a special costs what the client thinks it costs (guard)',
  PROG3.SPECIAL_MANA_COST === 25, PROG3.SPECIAL_MANA_COST);

/* ── DRINKING FILLS THE POOL ──
   Without this the first special waits on regen, which is not "constantly". */
drink('caster', 'manaShard');
check('drinking it fills the pool immediately', ps.mana === ps.maxMana, ps.mana);
check('...and uses up the bottle', !ps.inventory.manaShard && ps.coins === 500, { bag: ps.inventory, coins: ps.coins });
check('...and arms a three-minute timer',
  ps._buffs.mana > Date.now() + 175 * 1000 && ps._buffs.mana < Date.now() + 185 * 1000,
  { remainingMs: ps._buffs.mana - Date.now() });

/* ── THE FLOOR SURVIVES A SAVE ──
   _pruneBuffs reads every key in _buffs as an endsAt, and manaFlat is a small
   number that is very much <= now. v2.3.2058 shipped the magnitude registry
   for exactly this; the mana one has to be in it too. */
room._pruneBuffs(ps);
check('the regen floor is not mistaken for an expired timer and deleted',
  ps._buffs.manaFlat > 0, ps._buffs);

/* ── CASTING NONSTOP NEVER RUNS DRY ──
   The real loop: three minutes of alternating "spend a special" and "regen a
   tick", at the rates the game actually uses. IN COMBAT (lastDamageAt is now),
   because that is when you are casting. */
const simulate = (withPotion) => {
  const p = room.playerState.sim = {
    z: 'meadow', x: 0, y: 0, hp: 100, maxHp: 100,
    mana: 100, maxMana: 100, stamina: 100, maxStamina: 100, coins: 500,
  };
  if (withPotion) drink('sim', 'manaShard');
  let casts = 0, dry = 0, sinceCast = 0;
  const TOTAL_MS = 180 * 1000;
  for (let t = 0; t < TOTAL_MS; t += TICK_MS) {
    p.lastDamageAt = Date.now();          /* in combat, the harder case */
    sinceCast += TICK_MS;
    /* cast whenever the cooldown is up and the pool allows */
    while (sinceCast >= MANA_SURGE.SWIPE_CD_MS) {
      sinceCast -= MANA_SURGE.SWIPE_CD_MS;
      if (p.mana >= PROG3.SPECIAL_MANA_COST) { p.mana -= PROG3.SPECIAL_MANA_COST; casts++; }
      else dry++;
    }
    room._tickPlayerRegen();
  }
  return { casts, dry, endMana: p.mana };
};

const withOut = simulate(false);
const withPot = simulate(true);
const possible = Math.floor(180 * 1000 / MANA_SURGE.SWIPE_CD_MS);

check(`without it you run dry fast -- ${withOut.casts} of ${possible} casts land, `
    + `${withOut.dry} attempts fizzle (the control)`,
  withOut.dry > possible * 0.5, withOut);
check(`WITH it you cast constantly for the full three minutes -- ${withPot.casts} `
    + `of ${possible}, ${withPot.dry} fizzles`,
  withPot.dry === 0 && withPot.casts === possible, withPot);
check('...and it is the potion doing it, not a change to everyone\'s regen',
  withPot.casts > withOut.casts * 1.5, { withOut: withOut.casts, withPot: withPot.casts });

/* ── AND IT ENDS ── */
const after = room.playerState.sim;
after._buffs.mana = Date.now() - 1;
after.mana = 0;
after.lastDamageAt = Date.now();
room._tickPlayerRegen();
check('when the three minutes are up the surge stops',
  after.mana < manaSurgePerTick(PROG3.SPECIAL_MANA_COST, TICK_MS), after.mana);

/* ── A CORRUPTED SAVE IS NOT AN INFINITE POOL ── */
const ev = room.playerState.evil = {
  z: 'meadow', hp: 100, maxHp: 100, mana: 0, maxMana: 100,
  _buffs: { mana: Date.now() + 60000, manaFlat: 99999 },
  lastDamageAt: Date.now(),
};
room._tickPlayerRegen();
check('an absurd stored regen floor is rejected, not applied', ev.mana < 50, ev.mana);

/* ═══════════════ THE SWIFT DRAUGHT ═══════════════ */
room.playerState.runner = {
  z: 'meadow', x: 1000, y: 1000, hp: 100, maxHp: 100,
  mana: 100, maxMana: 100, stamina: 100, maxStamina: 100, coins: 500,
};
const rp = room.playerState.runner;
const sess = { id: 'runner', name: 'R', data: {} };
const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };

/* Move at a speed the plain cap refuses. The bound is 500 px/sec + 80 slack,
   so over 1s a 640px step is over it; at 1.5x the allowance is 750 + 80. */
const STEP_MS = 1000, STEP_PX = 640;
const tryStep = () => {
  rp.x = 1000; rp.y = 1000;
  rp.lastMoveAt = Date.now() - STEP_MS;
  room._handleMove(sess, ws, { type: 'move', x: 1000 + STEP_PX, y: 1000, z: 'meadow' });
  return rp.x;
};

check('un-buffed, a 640px-per-second sprint is refused as a teleport (the control)',
  tryStep() === 1000, { x: rp.x });

drink('runner', 'swiftDraught');
check('the Swift Draught arms a three-minute timer',
  rp._buffs.spd > Date.now() + 175 * 1000, { remainingMs: rp._buffs.spd - Date.now() });
check('...carrying its own 1.5x, not the cooked-food 1.15',
  rp._buffs.spdMul === 1.5, rp._buffs);
room._pruneBuffs(rp);
check('...which survives a save', rp._buffs.spdMul === 1.5, rp._buffs);

check('WITH it the same sprint is accepted -- the server does not rubber-band '
    + 'a player for using the potion it sold them',
  tryStep() === 1000 + STEP_PX, { x: rp.x });

/* The cap must widen by the buff and no further: a cheater with the potion up
   still cannot teleport. */
rp.x = 1000; rp.y = 1000; rp.lastMoveAt = Date.now() - 1000;
room._handleMove(sess, ws, { type: 'move', x: 1000 + 2000, y: 1000, z: 'meadow' });
check('...but a real teleport is still refused while it is up',
  rp.x === 1000, { x: rp.x });

/* And it lapses. */
rp._buffs.spd = Date.now() - 1;
check('when the three minutes are up the sprint is refused again',
  tryStep() === 1000, { x: rp.x });

/* A tampered magnitude cannot widen the cap arbitrarily. */
rp._buffs.spd = Date.now() + 60000;
rp._buffs.spdMul = 99;
rp.x = 1000; rp.y = 1000; rp.lastMoveAt = Date.now() - 1000;
room._handleMove(sess, ws, { type: 'move', x: 1000 + 2000, y: 1000, z: 'meadow' });
check('an absurd stored speed multiplier does not open the cap', rp.x === 1000, { x: rp.x });

/* ═══════════════ ONE BREW AT A TIME ═══════════════
   Owner: "Only 1 effect active at a time though."  v2.3.3105: one MEAL and one
   BREW (the farming plan) -- the three tonics are brews, so this rule holds
   between them exactly as it did; a meal now runs beside a brew (below).

   Stated as what a player would notice: the buff they were running STOPS when
   they drink something else. Checked on the magnitudes as well as the timers,
   because a leftover multiplier with no timer is the failure mode
   BUFF_MAGNITUDES exists to catch. */
const one = room.playerState.only = {
  z: 'meadow', hp: 100, maxHp: 100, mana: 50, maxMana: 100,
  stamina: 100, maxStamina: 100, coins: 1000,
  inventory: Object.create(null), lifeSkills: { cooking: { level: 6, xp: 0 } },   /* v2.3.3102: the Tea asks Cooking 6 (cooking.js) */
};
drink('only', 'swiftDraught');
check('the Swift Draught is running (guard)',
  room._buffActive(one, 'spd') && one._buffs.spdMul === 1.5, one._buffs);

drink('only', 'whetstone');
check('drinking a Fury Tonic ENDS the Swift Draught -- one brew at a time',
  !room._buffActive(one, 'spd'), one._buffs);
check('...and takes its multiplier with it, leaving nothing stranded',
  one._buffs.spdMul === undefined, one._buffs);
check('...while the tonic itself is now the one that is running',
  room._buffActive(one, 'damage') && one._buffs.damageMul === 2.0, one._buffs);

drink('only', 'manaShard');
check('and the Mana Draught ends the tonic in turn',
  !room._buffActive(one, 'damage') && one._buffs.damageMul === undefined, one._buffs);
check('...leaving exactly the mana surge', room._buffActive(one, 'mana')
  && one._buffs.manaFlat > 0, one._buffs);

/* The Cookhouse's Firebloom Tea is a brew too: cooked by an OLD client (no
   `carry`), it is made and drunk at once, and ends the brew that was running. */
const { COOKING_RECIPES: RECIPES, DISHES } = await import('../src/data.js');
const teaIdx = RECIPES.findIndex((r) => r.makes === 'brew_firebloom_tea');
one.inventory = Object.assign(Object.create(null), one.inventory,
  Object.fromEntries(Object.entries(RECIPES[teaIdx].ingredients).map(([k, v]) => [k, v + 5])));
room._handleCookRecipe({ id: 'only' }, { recipeIdx: teaIdx });
check('the Firebloom Tea ends the potion that was running (both are brews)',
  !room._buffActive(one, 'mana') && one._buffs.manaFlat === undefined, one._buffs);
/* v2.3.3102: the tea STATES its strength -- 1 + its power, x1.20 -- where it
   used to leave damageMul unset and lean on the combat reader's 1.20 default.
   The point of this check is unchanged: not the tonic's x2. */
const teaMul = 1 + DISHES.brew_firebloom_tea.power;
check('...and the tea is what is running now, at ITS strength not the potion\'s',
  room._buffActive(one, 'damage') && one._buffs.damageMul === teaMul && teaMul !== 2.0, one._buffs);

/* ═══════════════ A MEAL RUNS BESIDE A BREW (v2.3.3105) ═══════════════ */
one.inventory.meal_root_stew = 1;
room._handleEatRequest({ id: 'only' }, { invKey: 'meal_root_stew' });
check('eating a Root Stew leaves the brew running',
  room._buffActive(one, 'damage') && one._buffs.damageMul === teaMul, one._buffs);
check('...and runs beside it, for half an hour',
  room._buffActive(one, 'resist') && one._buffs.resist > Date.now() + 29 * 60 * 1000, one._buffs);
drink('only', 'swiftDraught');
check('a new brew replaces the old brew and nothing else -- the meal keeps going',
  room._buffActive(one, 'spd') && !room._buffActive(one, 'damage') && one._buffs.damageMul === undefined
    && room._buffActive(one, 'resist'), one._buffs);
one.inventory.meal_herb_bread = 1;
room._handleEatRequest({ id: 'only' }, { invKey: 'meal_herb_bread' });
check('...and a new meal replaces the old meal and nothing else -- the brew keeps going',
  room._buffActive(one, 'rest') && !room._buffActive(one, 'resist') && room._buffActive(one, 'spd')
    && one._buffs.spdMul === 1.5, one._buffs);

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
