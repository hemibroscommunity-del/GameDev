/* MONSTER DROPS: THE IRON PIECES AND THE RARE GEM (v2.3.1924).
 *
 * Owner: "make it so monsters now have a 1 in 500 chance to drop an iron
 * chest and 1 in 500 of dropping iron legs.  Add a 1 in 200 chance to drop a
 * rare gem."
 *
 * Three rates and three delivery paths, and each of them can be wrong in a
 * way the others hide.  What this pins, and why each one is here:
 *
 *   1. THE RATES ARE THE OWNER'S NUMBERS.  Asserted against the constants
 *      AND against the roll, with Math.random stubbed either side of each
 *      threshold — a `<` that should be `<=`, or a constant read from the
 *      wrong row, both survive a test that only reads the table.
 *   2. THE TWO PIECES ROLL INDEPENDENTLY.  The obvious wrong implementation
 *      is one roll that picks a side, which halves each rate while still
 *      dropping iron often enough to look right in play.  So a run where
 *      both pass their own roll must produce BOTH pieces.
 *   3. THE CLAIMS DO NOT EAT EACH OTHER.  The pile already had two claim
 *      lanes (the one-of inventory slot, and the weapon's own flag,
 *      v2.3.1141); the armour adds a third and the gem joins the first.
 *      A picker taking the gem must not consume the armour, and the second
 *      picker must get neither.
 *   4. THE GEM IS CREDITED SERVER-SIDE.  It is a plain stackable, so unlike
 *      the armour it lands in the authoritative ps.inventory — if it only
 *      rode the wire the next player_state would erase it (rule 20).
 *   5. THE ARMOUR IS *NOT* CREDITED SERVER-SIDE, and that is deliberate:
 *      there is no server armour stash (handoff rule 1), so the piece must
 *      arrive in the private credit for the client's own stash.  Pinned
 *      because "it works" and "the worker silently grew an armour store"
 *      look identical from the client.
 *   6. A PILE THAT WOULD OTHERWISE BE EMPTY still spawns for these.  The
 *      early-out in _spawnLootForKill lists what counts as "nothing of
 *      value", and a new drop not added to it is a drop that vanishes on
 *      any monster with no gold and no skull.
 */
import { GameRoom } from '../src/index.js';
import { MONSTER_ARMOR_DROPS, RARE_GEM_MONSTER_DROP, RARE_GEM_KEY } from '../src/data.js';

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

/* ── 1. the owner's numbers, in the table ─────────────────────────────── */
const chest = MONSTER_ARMOR_DROPS.find((d) => d.slot === 'armor');
const legs = MONSTER_ARMOR_DROPS.find((d) => d.slot === 'legsArmor');
check('there is a chest piece and a legs piece (guard)', !!chest && !!legs,
  MONSTER_ARMOR_DROPS.map((d) => d.slot));
check('the chest piece drops at 1 in 500', chest.chance === 1 / 500, chest.chance);
check('the legs piece drops at 1 in 500', legs.chance === 1 / 500, legs.chance);
check('the rare gem drops at 1 in 200', RARE_GEM_MONSTER_DROP === 1 / 200, RARE_GEM_MONSTER_DROP);
/* Iron, not a third copper: the metal is what picks the art, the icon and
   (through tierMult) the damage reduction. */
check('both pieces are IRON', chest.mat === 'iron' && legs.mat === 'iron', { c: chest.mat, l: legs.mat });
check('...priced at iron’s own tier multiplier, not a hand-picked number',
  chest.tierMult === 1.25 && legs.tierMult === 1.25, { c: chest.tierMult, l: legs.tierMult });

/* ── 1b. ...and in the ROLL.  Stub Math.random either side of each
   threshold; a table read alone cannot catch an off-by-one comparison. ── */
const realRandom = Math.random;
const withRandom = (vals, fn) => {
  let i = 0;
  Math.random = () => (i < vals.length ? vals[i++] : vals[vals.length - 1]);
  try { return fn(); } finally { Math.random = realRandom; }
};
check('a roll just UNDER 1/500 mints the chest piece',
  (withRandom([1 / 500 - 1e-9, 1], () => room._rollArmorDropsForKill()) || []).length === 1);
check('a roll just OVER 1/500 mints nothing',
  withRandom([1 / 500 + 1e-9, 1], () => room._rollArmorDropsForKill()) === null);
check('a roll just UNDER 1/200 mints the gem',
  withRandom([1 / 200 - 1e-9], () => room._rollRareGemForKill()) === RARE_GEM_KEY);
check('a roll just OVER 1/200 mints nothing',
  withRandom([1 / 200 + 1e-9], () => room._rollRareGemForKill()) === null);

/* ── 2. independence ──────────────────────────────────────────────────── */
const both = withRandom([0, 0], () => room._rollArmorDropsForKill());
check('when both pieces pass their own roll, BOTH are minted',
  Array.isArray(both) && both.length === 2, both);
check('...one for each slot, not the same piece twice',
  !!both && new Set(both.map((p) => p.slot)).size === 2, both && both.map((p) => p.slot));
const onlyLegs = withRandom([1, 0], () => room._rollArmorDropsForKill());
check('the second piece can drop without the first',
  !!onlyLegs && onlyLegs.length === 1 && onlyLegs[0].slot === 'legsArmor', onlyLegs);

/* ── 3/4/5/6. the pile, and who gets what on pickup ───────────────────── */
/* The other two rolls in _spawnLootForKill — the shard and the weapon — run
   BEFORE these and draw from the same Math.random.  A fixed sequence of
   stubbed values therefore pins this suite to the ORDER of rolls it does not
   care about: the first cut of this test fed its zeros to the shard roll and
   reported the armour missing.  Stub the two neighbours to "no drop" instead,
   and the sequence below belongs entirely to the code under test.  (The first
   run also turned up something worth knowing on its way past: a town kill
   rolls `shard_town`.  Not this change's business, but it is why the pile
   below is built with those two silenced rather than with a longer array.) */
room._rollShardForKill = () => null;
room._rollWeaponDropForKill = () => null;

/* A monster worth NOTHING otherwise — no gold, no skull-bearing archetype —
   so the pile can only exist because of the new drops (claim 6). */
const monster = { id: 'm1', arch: 'slime', variant: null, level: 5, x: 100, y: 100, gold: 0, xp: 10 };
room.playerState = room.playerState || {};
const mkPlayer = (id) => {
  room.playerState[id] = { x: 100, y: 100, z: 'town', hp: 50, maxHp: 50, inventory: {}, coins: 0, dead: false, disconnected: false };
  return room.playerState[id];
};
const A = mkPlayer('pA');
const B = mkPlayer('pB');
room.loot = {};
room._wsBySessionId = () => null;      /* no socket: exercise the state writes */
room._sendPlayerState = () => {};
room.eventBuffer = [];

/* Everything hits. */
const pile = withRandom([0], () =>
  room._spawnLootForKill('town', monster, 'pA', ['pA', 'pB'], { pA: 0.5, pB: 0.5 }));
check('a pile spawns for a monster whose ONLY value is the new drops', !!pile, pile);
check('...carrying both armour pieces', !!pile && !!pile.armor && pile.armor.length === 2,
  pile && pile.armor);
check('...and the gem', !!pile && pile.gem === RARE_GEM_KEY, pile && pile.gem);

/* The broadcast names them.  Unlike the weapon there is nothing hidden to
   reveal at pickup, so a pile the player can see should say what is on it. */
const wire = room._serializePile(pile);
check('the broadcast carries the armour by name (no mystery to withhold)',
  Array.isArray(wire.armor) && wire.armor.length === 2 && /Iron/.test(wire.armor[0].name), wire.armor);
check('...and the gem', wire.gem === RARE_GEM_KEY, wire.gem);

/* Pickup by A. */
room._handleLootPickup({ id: 'pA', name: 'A' }, { lootId: pile.lootId, zone: 'town' });

check('the gem is credited to the SERVER inventory, not just the wire',
  A.inventory[RARE_GEM_KEY] === 1, A.inventory);
/* Claim 5: the worker must NOT have grown an armour store of its own. */
check('the armour is NOT stashed server-side (there is no server armour stash)',
  A.armorStash === undefined && A.legsStash === undefined && A.armor === undefined,
  { armorStash: A.armorStash, legsStash: A.legsStash, armor: A.armor });
check('...and the pile records the armour as claimed', pile.armorClaimed === true, pile.armorClaimed);
check('...and the one-of inventory slot as claimed', pile.inventoryClaimed === true);

/* Claim 3: B was a legitimate recipient and gets neither — one pile, one
   set of one-of drops.  Coins would still be theirs; these are not. */
room._handleLootPickup({ id: 'pB', name: 'B' }, { lootId: pile.lootId, zone: 'town' });
check('the second picker does not get a second gem', B.inventory[RARE_GEM_KEY] === undefined, B.inventory);
check('...and the armour is still exactly the one set, still claimed',
  !!pile.armor && pile.armor.length === 2 && pile.armorClaimed === true, pile.armor);

/* Claim 3 again, from the other side: a pile with ONLY armour must not have
   its armour eaten by the inventory slot being taken.  Armour rolls first, so
   two zeros then a miss gives both pieces and no gem. */
room.loot = {};
const C = mkPlayer('pC');
const armorOnly = withRandom([0, 0, 1], () =>
  room._spawnLootForKill('town', { ...monster, id: 'm2' }, 'pC', ['pC'], { pC: 1 }));
check('an armour-only pile spawns (guard)', !!armorOnly && !!armorOnly.armor && !armorOnly.gem,
  armorOnly && { armor: !!armorOnly.armor, gem: armorOnly.gem });
room._handleLootPickup({ id: 'pC', name: 'C' }, { lootId: armorOnly.lootId, zone: 'town' });
check('armour claims on its OWN flag, independent of the inventory slot',
  !!armorOnly && armorOnly.armorClaimed === true,
  armorOnly && { armorClaimed: armorOnly.armorClaimed, inv: armorOnly.inventoryClaimed });

/* And the honest negative: every roll missing.
   NOTE, because the first version of this test asserted the wrong thing and
   was right to fail: the early-out in _spawnLootForKill is RECIPIENT-gated
   ("no skull AND nobody to claim AND no gold AND ..."), so a kill with a live
   recipient list has always produced a pile even when it carries nothing.
   That is pre-existing behaviour and not this change's to alter — which also
   means the `&& !armor && !gem` terms added to that early-out are
   belt-and-braces that cannot fire today, and are there so the condition
   stays correct if the rolls are ever ungated.  What IS worth pinning is
   that a miss is a clean miss: no piece, no gem, and no empty array left
   behind for the wire to describe as a drop. */
room.loot = {};
const nothing = withRandom([1], () =>
  room._spawnLootForKill('town', { ...monster, id: 'm3' }, 'pC', ['pC'], { pC: 1 }));
check('every roll missing leaves no armour on the pile', !!nothing && nothing.armor === null,
  nothing && nothing.armor);
check('...and no gem', !!nothing && !nothing.gem, nothing && nothing.gem);
const wireMiss = nothing && room._serializePile(nothing);
check('...and the broadcast advertises neither',
  !!wireMiss && wireMiss.armor === null && wireMiss.gem === null,
  wireMiss && { armor: wireMiss.armor, gem: wireMiss.gem });

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
