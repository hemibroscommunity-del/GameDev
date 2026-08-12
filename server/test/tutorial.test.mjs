/* Tutorial-arc test (v2.3.1665; rewritten v2.3.1673) — remnant objectives
 * and item rewards.
 *
 * v2.3.1673 (owner: "use actual zones and monsters ... and require the number
 * of slime remnants instead of certain number killed"): the arc no longer
 * counts kills.  Each step asks for the REMNANTS the named zone's real
 * monsters drop, and the turn-in CONSUMES them — which is the property that
 * makes it an arc at all, since without it a single stack of remnants would
 * satisfy every step at once and the five-quest chain would collapse into one
 * turn-in.  That is the headline thing pinned below.
 *
 * The zone-scoped KILL machinery is still live (legacy chains use it) and is
 * still covered here, because the tutorial no longer exercising it is exactly
 * how it would rot unnoticed.
 *
 * The arc is what makes the demo "completable by judges" rather than
 * merely playable, so the properties worth pinning are the ones that would
 * quietly break the run-through:
 *   - a kill in the WRONG zone must not count (legacy chains rely on it)
 *   - a legacy zone-less quest must keep counting kills anywhere
 *   - item rewards land, and their tiers are LOW ENOUGH TO EQUIP (since
 *     v2.3.1661 gear is gated on trained level / defense points, so a
 *     generous gift would be granted and then refused)
 *   - a full weapon stash must not swallow the gold and xp too
 *   - the chain unlocks step by step and pays each step exactly once
 */
import { GameRoom } from '../src/index.js';
import { QUEST_REWARDS, BLACKSMITH_TIERS, ZONES } from '../src/data.js';

/* Can each named zone actually yield the remnant its step asks for?  Resolved
   from the LIVE spawn table + the same variant map the drop path uses, so a
   content edit that empties a zone (as v2.3.1534 did to Verdant's brutes)
   fails here instead of shipping an impossible quest. */
function ZONE_DROPS_OK() {
  const VAR = {
    ember: { fodder: 'fireGoblin' },
    sky: { fodder: 'mummy', stalker: 'mummy', hexer: 'mummy', volatile: 'mummy', brute: 'mummy' },
    verdant: { fodder: 'mossSlime' },
    mist: { fodder: 'mireWisp' },
  };
  const keyFor = (arch, zone) => {
    const v = (VAR[zone] && VAR[zone][arch]) || arch;
    if (v === 'fireGoblin') return 'fire-goblin-remnants';
    if (v === 'mummy' || v === 'skeleton') return 'skeleton-remnants';
    if (arch === 'fodder') return 'slime-remnants';
    if (arch === 'snowman') return 'snowman';
    return null;
  };
  return ['tut_1', 'tut_2', 'tut_3', 'tut_4'].every((id) => {
    const o = QUEST_REWARDS[id].objective;
    const z = ZONES[o.zone];
    if (!z || !z.spawns) return false;
    return z.spawns.some((sp) => keyFor(sp.arch, o.zone) === o.invKey);
  });
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(store),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

const room = new GameRoom(makeState(), mockEnv);
const ws = fakeWs('t');
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({
  type: 'join', id: 'bp_t', name: 'Tourist', protocolVersion: 2,
  data: { x: -100000, y: -100000, z: 'meadow' },
}));
const ps = room.playerState.bp_t;
const sess = { id: 'bp_t' };

// ── 1. The chain is well-formed and reachable from a standing start ──
{
  const ids = ['tut_1', 'tut_2', 'tut_3', 'tut_4'];
  for (const id of ids) check(`${id} exists server-side`, !!QUEST_REWARDS[id], id);
  check('the chain links tut_1 → … → tut_4 → end',
    QUEST_REWARDS.tut_1.next === 'tut_2' && QUEST_REWARDS.tut_2.next === 'tut_3'
    && QUEST_REWARDS.tut_3.next === 'tut_4' && QUEST_REWARDS.tut_4.next === null);
  check('every tutorial step is server-verified (has an objective)',
    ids.every((id) => !!QUEST_REWARDS[id].objective));
  check('every tutorial step names a zone',
    ids.every((id) => typeof QUEST_REWARDS[id].objective.zone === 'string'));

  /* v2.3.1673: every step is a remnant hand-in, and every remnant key it asks
     for must be one the game can ACTUALLY drop — a typo here is a quest that
     can never be completed, and no other test would catch it. */
  const DROPPABLE = ['slime-remnants', 'snowman', 'fire-goblin-remnants', 'skeleton-remnants'];
  check('every tutorial step collects remnants rather than counting kills',
    ids.every((id) => QUEST_REWARDS[id].objective.type === 'collect'),
    ids.map((id) => QUEST_REWARDS[id].objective.type));
  check('every requested remnant key is one the game actually drops',
    ids.every((id) => DROPPABLE.includes(QUEST_REWARDS[id].objective.invKey)),
    ids.map((id) => QUEST_REWARDS[id].objective.invKey));
  check('every step consumes what it asks for (or one stack clears the arc)',
    ids.every((id) => QUEST_REWARDS[id].objective.consume === true));
  check('the named zone can actually drop the key it asks for',
    ZONE_DROPS_OK(), ids.map((id) => [QUEST_REWARDS[id].objective.zone, QUEST_REWARDS[id].objective.invKey]));
  /* The gate hazard: granted-then-unequippable is the worst new-player
     moment.  tierIndex 0 => requirement 0 under _prog3EquipOk. */
  check('the granted weapon is tierIndex 0 (equippable at any trained level)',
    Object.keys(BLACKSMITH_TIERS).indexOf(QUEST_REWARDS.tut_1.item.tierKey) === 0,
    QUEST_REWARDS.tut_1.item.tierKey);
  check('the granted armor estimates to tierIndex 0 (needs 0 defense points)',
    Math.round((QUEST_REWARDS.tut_4.item.tierMult - 1) * 6) === 0,
    QUEST_REWARDS.tut_4.item.tierMult);
}

// ── 2. Zone scoping: the whole point of the tour ──
{
  ps._quests = Object.create(null);
  ps._questKills = Object.create(null);
  /* v2.3.1673: the tutorial steps are `collect` now, so the zone-scoped KILL
     path needs a kill quest to exercise.  Injected here rather than pointed at
     a live chain, so this section keeps testing the machinery even as content
     moves around. */
  QUEST_REWARDS.__zonetest = { gold: 0, xp: 0, next: null,
    objective: { type: 'kill', arch: null, zone: 'frost', count: 5 } };
  room._handleQuestAccept(sess, { questId: '__zonetest' });
  check('accept marks the quest active', ps._quests.__zonetest === 'active', ps._quests);

  room._creditQuestObjective('bp_t', 'kill', 'fodder', 'meadow');
  room._creditQuestObjective('bp_t', 'kill', 'fodder', 'verdant');
  check('kills in the wrong zone do not count',
    (ps._questKills.__zonetest || 0) === 0, ps._questKills.__zonetest);

  room._creditQuestObjective('bp_t', 'kill', 'snowman', 'frost');
  check('a kill in the named zone counts', ps._questKills.__zonetest === 1, ps._questKills.__zonetest);

  // A legacy quest with no zone must still count anywhere.
  room._handleQuestAccept(sess, { questId: 'mayor_2' });
  room._creditQuestObjective('bp_t', 'kill', 'fodder', 'ember');
  check('a zone-less legacy objective still counts anywhere',
    ps._questKills.mayor_2 === 1, ps._questKills.mayor_2);

  // An omitted zone argument (older call sites) must not break.
  room._creditQuestObjective('bp_t', 'kill', 'fodder');
  check('an omitted zone argument still credits zone-less quests',
    ps._questKills.mayor_2 === 2, ps._questKills.mayor_2);
  check('an omitted zone argument does NOT credit zone-scoped quests',
    ps._questKills.__zonetest === 1, ps._questKills.__zonetest);
  delete QUEST_REWARDS.__zonetest;
}

// ── 3. Turn-in gating and item grants ──
{
  ps._quests = Object.create(null);
  ps._questKills = Object.create(null);
  ps.coins = 0; ps.armor = null; ps.weapon = null; ps.weaponStash = [];

  // tut_4 pays armor for 6 fire-goblin remnants.
  ps.inventory = { 'fire-goblin-remnants': 5 };
  room._handleQuestAccept(sess, { questId: 'tut_4' });
  room._handleQuestTurnIn(sess, { questId: 'tut_4', xpCat: 'sword' });
  check('an unmet objective pays nothing and stays active',
    ps._quests.tut_4 === 'active' && ps.coins === 0 && ps.armor === null,
    { st: ps._quests.tut_4, coins: ps.coins, armor: ps.armor });
  check('a REFUSED turn-in does not take the items',
    ps.inventory['fire-goblin-remnants'] === 5, ps.inventory);

  ps.inventory['fire-goblin-remnants'] = 7;   // one spare, to prove exact deduction
  room._handleQuestTurnIn(sess, { questId: 'tut_4', xpCat: 'sword' });
  check('a met objective turns the quest in', ps._quests.tut_4 === 'turnedIn', ps._quests.tut_4);
  check('gold is paid', ps.coins === QUEST_REWARDS.tut_4.gold, ps.coins);
  check('the armor reward is granted and named',
    ps.armor && ps.armor.name === "Scout's Vest", ps.armor);
  check('granted armor raises maxHp (it went through _recomputeMaxes)',
    ps.maxHp > 100, ps.maxHp);
  check('the remnants were handed over, exactly the count required',
    ps.inventory['fire-goblin-remnants'] === 1, ps.inventory);

  const coinsAfter = ps.coins;
  room._handleQuestTurnIn(sess, { questId: 'tut_4', xpCat: 'sword' });
  check('a turned-in quest cannot be claimed twice', ps.coins === coinsAfter, ps.coins);

  // Armor already worn: the grant must not silently replace the player's.
  ps._quests.tut_4 = 'active';
  ps.armor = { name: 'Player Choice', tierMult: 3 };
  room._handleQuestTurnIn(sess, { questId: 'tut_4', xpCat: 'sword' });
  check('an armor grant never overwrites armor the player is wearing',
    ps.armor.name === 'Player Choice', ps.armor);
}

// ── 4. Weapon grant, and the stash-full hazard ──
{
  ps._quests = Object.create(null);
  ps._questKills = Object.create(null);
  ps.weapon = null; ps.rangedWeapon = null; ps.staffWeapon = null; ps.weaponStash = [];

  /* v2.3.1675: the arc's weapon rewards are a BOW then a STAFF, and both land
     in their own slots (rangedWeapon / staffWeapon), not ps.weapon.  Asserting
     ps.weapon here reported "no weapon granted" against a grant that had in
     fact worked perfectly — the slot routing is the thing worth pinning. */
  ps.inventory = { snowman: 9 };
  room._handleQuestAccept(sess, { questId: 'tut_1' });
  room._handleQuestTurnIn(sess, { questId: 'tut_1', xpCat: 'bow' });
  /* v2.3.1676: accepting tut_1 hands over the sword+shield (grantOnAccept),
     and turning it in pays the bow.  So after this sequence the player holds
     BOTH — and each is in its own slot, which is the routing worth pinning. */
  /* v2.3.1681: the melee grant is a GREATSWORD.  weaponType 'sword' at wood
     tier is the bamboo stick (its icon and its in-hand sprite both), which is
     not what "he gives you a sword" should put in your hand.  Pinned by type
     rather than just by name so the art can't quietly revert. */
  check('accepting the first quest arms you with the sword and shield',
    ps.weapon && ps.weapon.type === 'greatsword' && ps.weapon.name === "Bro's Sword"
    && ps.shield && ps.shield.name === "Bro's Shield",
    { w: ps.weapon, sh: ps.shield });
  check('a granted BOW lands in the ranged slot, not the melee one',
    ps.rangedWeapon && ps.rangedWeapon.name === "Bro's Bow"
    && ps.rangedWeapon.type === 'bow' && ps.weapon.type === 'greatsword',
    { r: ps.rangedWeapon, w: ps.weapon });
  check('the granted weapon has a forge-shaped blob',
    ps.rangedWeapon && ps.rangedWeapon.gearBase === 'ww_wood' && ps.rangedWeapon.hardness === 0
    && ps.rangedWeapon.tier === 'common', ps.rangedWeapon);
  check('the granted weapon quality is FIXED, not rolled',
    ps.rangedWeapon.quality === 'normal', ps.rangedWeapon.quality);
  check('the granted weapon is equippable under the prog3 tier gate',
    room._prog3EquipOk(ps, 'weapon', ps.rangedWeapon) === true);

  /* And the STAFF from the next step goes somewhere else again. */
  ps.inventory = { 'slime-remnants': 6 };
  room._handleQuestAccept(sess, { questId: 'tut_2' });
  room._handleQuestTurnIn(sess, { questId: 'tut_2', xpCat: 'staff' });
  check('a granted STAFF lands in the staff slot',
    ps.staffWeapon && ps.staffWeapon.type === 'staff', ps.staffWeapon);

  // Occupied slot + full stash: the grant fails but must NOT eat the rest.
  ps._quests = Object.create(null); ps._questKills = Object.create(null);
  ps.weapon = { type: 'sword', tierMult: 1, name: 'Keeper' };
  ps.shield = { name: 'Own Shield' };   /* occupied: grantOnAccept must not replace it */
  ps.weaponStash = new Array(room.WEAPON_STASH_CAP).fill(0).map(() => ({ type: 'sword', tierMult: 1 }));
  ps.coins = 0;
  /* The bow's own slot must be OCCUPIED too, or the grant simply lands there
     and never reaches the stash-full path this section exists to test. */
  ps.rangedWeapon = { type: 'bow', tierMult: 1, name: 'Old Bow' };
  ps.inventory = { snowman: 9 };
  room._handleQuestAccept(sess, { questId: 'tut_1' });
  room._handleQuestTurnIn(sess, { questId: 'tut_1', xpCat: 'bow' });
  check('a full stash does not destroy the equipped weapon',
    ps.weapon.name === 'Keeper' && ps.rangedWeapon.name === 'Old Bow',
    { w: ps.weapon, r: ps.rangedWeapon });
  check('the accept-time grant never replaces gear the player is holding',
    ps.shield.name === 'Own Shield', ps.shield);
  check('a full stash stays at cap (rule 3: no silent overflow)',
    ps.weaponStash.length === room.WEAPON_STASH_CAP, ps.weaponStash.length);
  check('a failed item grant still pays the gold and completes the quest',
    ps.coins === QUEST_REWARDS.tut_1.gold && ps._quests.tut_1 === 'turnedIn',
    { coins: ps.coins, st: ps._quests.tut_1 });
}

// ── 5. A bad reward definition must never break a turn-in ──
{
  ps._quests = Object.create(null);
  check('an unknown item kind is ignored', room._grantQuestItem(ps, { kind: 'nonsense' }) === false);
  check('a weapon with an unknown tier key is refused',
    room._grantQuestItem(ps, { kind: 'weapon', weaponType: 'sword', tierKey: 'unobtanium' }) === false);
  check('a prototype tier key is refused',
    room._grantQuestItem(ps, { kind: 'weapon', weaponType: 'sword', tierKey: 'constructor' }) === false);
  check('a null item is refused', room._grantQuestItem(ps, null) === false);
  const before = JSON.stringify(ps.inventory || {});
  check('an inventory grant lands',
    room._grantQuestItem(ps, { kind: 'inv', key: 'ore_copper_ore', n: 3 }) === true
    && ps.inventory.ore_copper_ore === 3, { before, after: ps.inventory });
}

// ── 6. v2.3.1669: quest XP must name a trained skill ──
{
  const sess = { id: 'bp_t' };
  ps._quests = Object.create(null);
  ps._questKills = Object.create(null);
  ps.coins = 0; ps.armor = null;

  ps.inventory = { snowman: 4 };
  room._handleQuestAccept(sess, { questId: 'tut_1' });

  /* No category, unknown category, prototype key — all refused, and
     refused WHOLE: the quest must stay claimable, not end up turnedIn
     with the reward unpaid. */
  for (const bad of [undefined, 'trebuchet', '__proto__', 42]) {
    room._handleQuestTurnIn(sess, { questId: 'tut_1', xpCat: bad });
  }
  check('an XP-paying turn-in with no valid skill is refused',
    ps._quests.tut_1 === 'active' && ps.coins === 0, { st: ps._quests.tut_1, coins: ps.coins });
  /* v2.3.1673: and a refusal at the XP-category gate must not eat the
     remnants either — that gate fires BEFORE the consume step, which is the
     ordering this pins. */
  check('a turn-in refused for a missing skill keeps the items',
    ps.inventory.snowman === 4, ps.inventory);

  const bowBefore = ps.prog3.sk.bow.level + ps.prog3.sk.bow.xp;
  const swordBefore = ps.prog3.sk.sword.level + ps.prog3.sk.sword.xp;
  room._handleQuestTurnIn(sess, { questId: 'tut_1', xpCat: 'bow' });
  check('naming a skill completes the turn-in', ps._quests.tut_1 === 'turnedIn', ps._quests.tut_1);
  check('the XP went into the NAMED skill',
    ps.prog3.sk.bow.level + ps.prog3.sk.bow.xp > bowBefore, ps.prog3.sk.bow);
  check('the XP did NOT go anywhere else',
    ps.prog3.sk.sword.level + ps.prog3.sk.sword.xp === swordBefore, ps.prog3.sk.sword);
  check('gold is still paid alongside', ps.coins === QUEST_REWARDS.tut_1.gold, ps.coins);
}

// ── 7. v2.3.1679: WORN ARMOR IS REAL MITIGATION ──
{
  /* Owner: "30% damage reduction on torso and 20% damage reduction on legs.
     Higher tiers will go up from there."
     Before this, armor did nothing per hit — Phase 1 retired `def` reduction
     and folded armor into maxHp, so a chest piece was a bigger health bar and
     nothing else.  These pin the numbers AND the properties that keep them
     safe: multiplicative stacking, a hard cap, and a floor of 1. */
  const mk = () => ({ hp: 10000, maxHp: 10000, level: 1 });
  const dr = (ps) => room._armorDrMult(ps);

  const bare = mk();
  check('no armor = no reduction', dr(bare) === 1, dr(bare));

  const chest = mk(); chest.armor = { name: 'Vest', tierMult: 1 };
  check('a base torso piece cuts 30%', Math.abs(dr(chest) - 0.70) < 1e-9, dr(chest));

  const legs = mk(); legs.legsArmor = { name: 'Greaves', tierMult: 1 };
  check('a base legs piece cuts 20%', Math.abs(dr(legs) - 0.80) < 1e-9, dr(legs));

  const both = mk();
  both.armor = { name: 'Vest', tierMult: 1 };
  both.legsArmor = { name: 'Greaves', tierMult: 1 };
  /* MULTIPLICATIVE, not additive: 1 - 0.7*0.8 = 0.44, not 0.50.  The whole
     reason to stack this way is that it cannot reach 100% however many
     layers are added. */
  check('both pieces stack multiplicatively (44%, not 50%)',
    Math.abs(dr(both) - 0.56) < 1e-9, dr(both));

  const hiChest = mk(); hiChest.armor = { name: 'Vest', tierMult: 3 };
  check('higher tiers reduce more', dr(hiChest) < dr(chest), { t3: dr(hiChest), t1: dr(chest) });

  const maxed = mk();
  maxed.armor = { name: 'Vest', tierMult: 99 };        // clamped to 8 inside
  maxed.legsArmor = { name: 'Greaves', tierMult: 99 };
  check('the cap holds at 75% however absurd the tier', dr(maxed) >= 0.25 - 1e-9, dr(maxed));
  check('...and armor can never make a player immune', dr(maxed) > 0, dr(maxed));

  /* End to end through the real damage path: the reduction must actually
     reach hp, and a floor of 1 must survive it. */
  const ps = mk();
  ps.armor = { name: 'Vest', tierMult: 1 };
  ps.legsArmor = { name: 'Greaves', tierMult: 1 };
  const r1 = room._applyDamage(ps, 100, false);
  check('a 100-damage hit lands for ~56 through both pieces',
    r1.dodged || (r1.dmgTaken >= 50 && r1.dmgTaken <= 60), r1);
  const tiny = mk();
  tiny.armor = { name: 'Vest', tierMult: 8 };
  tiny.legsArmor = { name: 'Greaves', tierMult: 8 };
  const r2 = room._applyDamage(tiny, 1, false);
  check('a 1-damage hit still lands for at least 1 (chip damage survives)',
    r2.dodged || r2.dmgTaken >= 1, r2);
}

console.log(failures === 0 ? '\ntutorial: ALL PASS' : `\ntutorial: ${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
