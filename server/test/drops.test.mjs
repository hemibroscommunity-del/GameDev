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
 *   6. THE IRON GREATSWORD IS THE FORGE'S OWN OBJECT.  It has to be
 *      indistinguishable from a crafted one — same fields, `gearBase` set
 *      (which is what the client rebuilds the name and the tint from) — or it
 *      arrives as a nameless grey blade.  And because a pile carries ONE
 *      weapon, the ordering when both weapon rolls land is a real decision
 *      with a real cost; it is pinned so it cannot drift silently.
 *   7. A PILE THAT WOULD OTHERWISE BE EMPTY still spawns for these.  The
 *      early-out in _spawnLootForKill lists what counts as "nothing of
 *      value", and a new drop not added to it is a drop that vanishes on
 *      any monster with no gold and no skull.
 */
import { GameRoom } from '../src/index.js';
import { MONSTER_ARMOR_DROPS, RARE_GEM_MONSTER_DROP, RARE_GEM_KEY, MONSTER_IRON_WEAPON_DROP } from '../src/data.js';
/* v2.3.1925: the CLIENT's own armour formula, imported so the two can be
   compared directly.  mirror-audit.test.mjs already reaches across the same
   boundary for the constant tables; this reaches for the function, because
   what has to agree here is the arithmetic, not a number. */
import { getArmorPieceDr } from '../../src/data/gameSystems.js';

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

/* ── 1c. the iron greatsword ──────────────────────────────────────────── */
check('the iron greatsword drops at 1 in 500', MONSTER_IRON_WEAPON_DROP.chance === 1 / 500,
  MONSTER_IRON_WEAPON_DROP.chance);
check('a roll just UNDER 1/500 mints the blade',
  !!withRandom([1 / 500 - 1e-9], () => room._rollIronWeaponForKill()));
check('a roll just OVER 1/500 mints nothing',
  withRandom([1 / 500 + 1e-9], () => room._rollIronWeaponForKill()) === null);

const blade = withRandom([0], () => room._rollIronWeaponForKill());
check('it is a greatsword (guard)', !!blade && blade.type === 'greatsword', blade);
/* Claim 6.  `gearBase` is the field the client rebuilds the display name AND
   the blade's tint and icon from (materialTints weaponMaterial); without it
   this is a nameless grey greatsword that says "iron" nowhere. */
check('...carrying gearBase iron, which is what names and tints it',
  !!blade && blade.gearBase === 'iron', blade && blade.gearBase);
check('...at iron’s own tier multiplier', !!blade && blade.tierMult === 1.25, blade && blade.tierMult);
/* Every field the forge sets, set here too — a dropped blade and a crafted
   one must not be tellable apart by anything downstream. */
const FORGE_FIELDS = ['type', 'tier', 'tierMult', 'element1', 'element2', 'name',
  'gearBase', 'isVolatile', 'reforgeBonus', 'hardenBonus', 'quality', 'hardness', 'temper'];
const missing = FORGE_FIELDS.filter((f) => !(f in (blade || {})));
check('...and every field the forge mint sets, so nothing downstream can tell them apart',
  missing.length === 0, missing);
check('...with a quality actually rolled, not left undefined',
  !!blade && typeof blade.quality === 'string' && blade.quality.length > 0, blade && blade.quality);

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
/* v2.3.1924b: the iron blade rolls in this function too, and BEFORE the
   armour — silenced here for the same reason, so the sequence below belongs
   to the lanes under test.  Its own behaviour, including which weapon wins
   when both rolls land, gets its own section at the bottom. */
room._rollIronWeaponForKill = () => null;

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

/* ── 6b. WHICH WEAPON WINS ────────────────────────────────────────────────
   A pile carries ONE weapon.  When both weapon rolls land the iron blade
   takes the slot, which is what keeps the owner's 1-in-500 exact — and it
   costs an ordinary drop that would have happened on the same corpse.  That
   is a deliberate trade with a measured price (see the note at the roll
   site), so it is pinned in BOTH directions: silently flipping it would make
   the owner's number 1-in-515 at level 100, and silently dropping the
   ordinary roll entirely would gut weapon drops. */
room.loot = {};
room._rollIronWeaponForKill = GameRoom.prototype._rollIronWeaponForKill;
room._rollWeaponDropForKill = () => ({ type: 'sword', tier: 'elemental', tierMult: 2, name: 'Flame Sword' });
const D = mkPlayer('pD');
const bothWeapons = withRandom([0], () =>
  room._spawnLootForKill('town', { ...monster, id: 'm4' }, 'pD', ['pD'], { pD: 1 }));
check('when both weapon rolls land, the IRON blade takes the slot',
  !!bothWeapons && bothWeapons.weapon && bothWeapons.weapon.gearBase === 'iron',
  bothWeapons && bothWeapons.weapon);

/* ...and the ordinary drop is untouched when the iron roll misses. */
room.loot = {};
const ordinaryOnly = withRandom([1], () =>
  room._spawnLootForKill('town', { ...monster, id: 'm5' }, 'pD', ['pD'], { pD: 1 }));
check('when the iron roll misses, the ordinary weapon drop still lands',
  !!ordinaryOnly && ordinaryOnly.weapon && ordinaryOnly.weapon.name === 'Flame Sword',
  ordinaryOnly && ordinaryOnly.weapon);

/* The kill switch covers it.  disable_weapon_drops exists to stop weapons
   entering the economy (v2.3.1150); a drop that ignored the lever would be a
   hole in it rather than a feature. */
room.loot = {};
const realFlag = room._flagOn;
room._flagOn = (f) => f === 'disable_weapon_drops';
const flagged = withRandom([0], () =>
  room._spawnLootForKill('town', { ...monster, id: 'm6' }, 'pD', ['pD'], { pD: 1 }));
room._flagOn = realFlag;
check('disable_weapon_drops stops the iron blade too, not just the ordinary roll',
  !!flagged && !flagged.weapon, flagged && flagged.weapon);

/* ── 8. v2.3.1925: THE RARITY LADDER ─────────────────────────────────────
   Owner: "I also want the drop to consider a rarity system ... If it's on
   rare tier or above, the item becomes a silhouette with a question mark.
   You get to roll again to see if it reaches the next tier."

   Four claims, and the first two are the security ones — a grade that leaks
   onto the pile broadcast means every other client in the zone knows what is
   in someone else's mystery, and a client that can compute the ladder itself
   holds the answer before the animation reaches it. */
room._rollShardForKill = () => null;
room._rollWeaponDropForKill = () => null;
room._rollIronWeaponForKill = () => null;
room.loot = {};
const E = mkPlayer('pE');

/* Force both armour rolls to hit, then stamp a known grade on each so the
   assertions are about the PLUMBING, not about waiting for a 1-in-400,000. */
/* Four zeros then a one: each piece now burns TWO randoms — its drop roll and
   its quality roll — so the sequence is chest-drop, chest-grade, legs-drop,
   legs-grade, and the trailing 1 makes the gem miss.  (The first cut of this
   passed [0,0,1] and got one piece: the quality roll had eaten the legs' drop
   roll.  Worth the note — every stubbed sequence in this file is coupled to
   how many randoms the code under it draws.) */
const gPile = withRandom([0, 0, 0, 0, 1], () =>
  room._spawnLootForKill('town', { ...monster, id: 'm7' }, 'pE', ['pE'], { pE: 1 }));
check('an armour pile spawned to grade (guard)', !!gPile && !!gPile.armor && gPile.armor.length === 2, gPile && gPile.armor);
check('every dropped piece carries a quality grade',
  !!gPile && gPile.armor.every((a) => typeof a.quality === 'string' && a.quality), gPile && gPile.armor.map((a) => a.quality));
gPile.armor[0].quality = 'godly';
gPile.armor[1].quality = 'normal';

/* 1. THE GRADE NEVER REACHES THE WIRE. */
const gWire = room._serializePile(gPile);
check('the broadcast strips the grade from every piece',
  gWire.armor.every((a) => a.quality === undefined), gWire.armor);
check('...but still names the piece, so you know WHAT dropped',
  gWire.armor.every((a) => typeof a.name === 'string' && a.name.length > 0), gWire.armor);
/* GDD §4.6b.ii: rare and godly are indistinguishable on the ground.  Both
   pieces are on this pile — one godly, one normal — so the flags must
   separate them by "is there a secret", never by which secret. */
check('...marking only the rare-or-better piece as a mystery',
  gWire.armor[0].mystery === true && gWire.armor[1].mystery === false,
  gWire.armor.map((a) => a.mystery));
check('...and the pile advertises that it holds one', gWire.mystery === true, gWire.mystery);

/* A pile of ordinary drops must NOT pulse — normal is ~90% of everything and
   a question mark over every kill is just a slower pickup. */
gPile.armor[0].quality = 'normal';
check('a pile with nothing above normal is not a mystery',
  room._serializePile(gPile).mystery === false, room._serializePile(gPile).mystery);
gPile.armor[0].quality = 'godly';

/* 2. THE LADDER IS THE SERVER'S. */
check('a rare plays one stage, landing on rare',
  JSON.stringify(room._revealLadder('rare')) === JSON.stringify(['rare']), room._revealLadder('rare'));
check('an elite plays one stage that escalates past rare',
  JSON.stringify(room._revealLadder('elite')) === JSON.stringify(['elite']), room._revealLadder('elite'));
check('a godly plays TWO stages — elite, then the escalation',
  JSON.stringify(room._revealLadder('godly')) === JSON.stringify(['elite', 'godly']), room._revealLadder('godly'));
check('a normal has no ceremony at all', room._revealLadder('normal') === null, room._revealLadder('normal'));

/* 3. THE CREDIT CARRIES THE CEREMONY, AND ONLY FOR HIDDEN GRADES. */
/* Capture what the picker is actually SENT.  Up to here the suite has read
   server state with no socket; the reveal only exists on the wire, so this is
   the one section that has to listen to it. */
let credit = null;
room._wsBySessionId = () => ({ send: (str) => {
  const m = JSON.parse(str);
  if (m.type === 'loot_credit') credit = m.payload;
} });
room._handleLootPickup({ id: 'pE', name: 'E' }, { lootId: gPile.lootId, zone: 'town' });
room._wsBySessionId = () => null;
check('the private credit carries a reveal for the godly piece',
  !!credit && Array.isArray(credit.reveals) && credit.reveals.length === 1, credit && credit.reveals);
check('...naming the true grade, which only the picker learns',
  !!credit && credit.reveals[0].quality === 'godly', credit && credit.reveals[0]);
check('...with the two-stage ladder to play',
  !!credit && JSON.stringify(credit.reveals[0].ladder) === JSON.stringify(['elite', 'godly']),
  credit && credit.reveals[0].ladder);
/* The normal piece is on the same pickup and must not get a ceremony. */
check('...and nothing for the normal piece on the same pickup',
  !!credit && credit.reveals.length === 1, credit && credit.reveals);

/* 4. QUALITY REACHES THE DAMAGE MATHS, AND BOTH SIDES AGREE.
   The server's number is what damage is computed with; the client's is what
   the item card promises.  A drift between them is invisible on screen — the
   card says one thing and the hits say another — so they are compared
   directly rather than each being checked against a hand-written expectation. */
const DR_CASES = [
  { tierMult: 1.25, quality: 'normal' },
  { tierMult: 1.25, quality: 'rare' },
  { tierMult: 1.25, quality: 'elite' },
  { tierMult: 1.25, quality: 'godly' },
  { tierMult: 1.00, quality: 'normal' },
];
const drBad = [];
for (const c of DR_CASES) {
  const srv = room._armorDrMult({ armor: { ...c }, legsArmor: null });
  const cli = 1 - getArmorPieceDr({ ...c }, 'chest');
  if (Math.abs(srv - cli) > 1e-9) drBad.push({ c, srv, cli });
}
check('server and client compute the SAME armour reduction at every grade',
  drBad.length === 0, drBad);
/* And it actually moves — a grade that changed nothing would pass the parity
   check above by both sides ignoring it. */
const drNormal = 1 - room._armorDrMult({ armor: { tierMult: 1.25, quality: 'normal' }, legsArmor: null });
const drGodly = 1 - room._armorDrMult({ armor: { tierMult: 1.25, quality: 'godly' }, legsArmor: null });
check('a godly chest mitigates measurably more than a normal one',
  drGodly > drNormal + 0.05, { normal: drNormal, godly: drGodly });
/* ...and cannot escape the ladder the formula was built for.  Multiplying the
   REDUCTION instead of the tier would put this at 0.90 and leave the 0.75
   clamp doing all the work. */
check('...without running straight into the 0.75 clamp',
  drGodly < 0.70, drGodly);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
