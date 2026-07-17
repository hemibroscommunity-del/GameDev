/* Persistence roundtrip test (v2.3.1142, PR "core test safety net").
 * The rpg:<id> blob is the corruption-recovery layer for every player
 * character and had ZERO dedicated coverage (optimization-roadmap P1
 * covered combat; the heavy-systems suites cover their own keys).
 * Checks:
 *   1.  _saveRpg roundtrip fidelity: one representative of every
 *       persisted field family survives storage.
 *   2.  FIXED-FIELD RULE (ARCHITECTURE-HANDOFF): _saveRpg rewrites the
 *       blob from a fixed list -- runtime-only fields (dmgFromMonster,
 *       _lastGambleAt, arbitrary flags) must NOT persist.
 *   3.  _pruneBuffs on save: expired buff timers dropped, future kept.
 *   4.  weaponStash cap truncation: slice(0, WEAPON_STASH_CAP) keeps
 *       the FIRST 8 -- the NEWEST entries are the ones silently
 *       dropped (documented quirk; see handoff item L / inbox weapon
 *       parking which exists to avoid exactly this).
 *   5.  _healLifeSkills: the v2.3.769 corruption shapes (pets as
 *       spread-object, activePet {}) heal on _loadRpg, re-persist
 *       healed, and are idempotent on the second load.
 *   6.  Reconnect rebuild: a second join on the same id restores the
 *       stored values (not the join payload's), with the non-strict
 *       sanitizer keeping server-minted quality/hardness fields.
 * Never starts startTickLoop (real 22ms interval); ticks are not
 * needed here.  Uses the shared map-backed mock storage pattern from
 * hardening.test.mjs. */
import { GameRoom } from '../src/index.js';

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
async function join(ws, id, data) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: Object.assign({ x: 0, y: 0, z: 'town' }, data || {}) }));
}

// ── 1. roundtrip fidelity across every persisted family ──
const ws = fakeWs('p');
await join(ws, 'bp_pt_a');
const ps = room.playerState['bp_pt_a'];
const FUTURE = Date.now() + 3600000;
const PAST = Date.now() - 1000;
ps.coins = 1234;
ps.inventory = { ore_iron_ore: 7, fish_minnow: 2 };
ps.lifeSkills = { cooking: { level: 9, xp: 40 }, blacksmithing: { level: 11, xp: 0 } };
ps.level = 12; ps.xp = 340;
ps.unspentT2 = 3; ps.buildPointsThisLvl = 2;
ps.hp = 55; ps.maxHp = 140;
ps.stamina = 77; ps.maxStamina = 110;
ps.mana = 33; ps.maxMana = 120;
ps.power = 9; ps.vitality = 8; ps.endurance = 7; ps.agility = 6; ps.mind = 5;
ps._buffs = { regen: FUTURE, damage: PAST }; // damage is expired -> pruned on save
ps.weapon = { type: 'sword', tierMult: 1.25, gearBase: 'iron', quality: 'elite', hardness: 2, temper: 4, hardenBonus: null, reforgeBonus: null };
ps.rangedWeapon = { type: 'bow', tierMult: 1.12 };
ps.staffWeapon = null;
ps.activeSlot = 'ranged';
ps.armor = { tierMult: 1.4 };
ps.shield = { tierMult: 1.0 };
ps.amulet = { stat: 'elemResist', value: 5 };
ps.weaponStash = [{ type: 'staff', tierMult: 1.0, quality: 'rare', hardness: 0, temper: 0 }];
ps._quests = { mayor_1: 'active' };
ps._questFlags = { met_mayor: true };
ps._questKills = { mayor_2: 3 };
ps.achievementPoints = 15;
ps._perfectHistory = [PAST];
ps._cookHistory = [PAST];
ps.weaponSkills = { melee: { level: 3, xp: 10 } };
ps.weaponUnspent = { melee: 2 };
ps.weaponSpecs = { melee: { damage: 5 } };
ps.defenseSkill = { level: 2, xp: 5 };
ps.defenseUnspent = 1;
ps.defenseSpec = { bulwark: 2, ironskin: 1 };
// Runtime-only state that must NOT persist (fixed-field rule):
ps.dmgFromMonster = { 'sm-meadow-0': 12 };
ps._lastGambleAt = Date.now();
ps._someRuntimeFlag = 1;

await room._saveRpg('bp_pt_a', ps);
const blob = state._store.get('rpg:bp_pt_a');
check('blob written under rpg:<id>', !!blob);
check('economy family (coins/inventory) survives', blob.coins === 1234 && blob.inventory.ore_iron_ore === 7 && blob.inventory.fish_minnow === 2);
check('progression family (level/xp/T2/buildPoints) survives', blob.level === 12 && blob.xp === 340 && blob.unspentT2 === 3 && blob.buildPointsThisLvl === 2);
check('pools family (hp/stamina/mana + maxima) survives', blob.hp === 55 && blob.maxHp === 140 && blob.stamina === 77 && blob.maxStamina === 110 && blob.mana === 33 && blob.maxMana === 120);
check('five T1 stats survive', blob.power === 9 && blob.vitality === 8 && blob.endurance === 7 && blob.agility === 6 && blob.mind === 5);
check('lifeSkills survive', blob.lifeSkills.cooking.level === 9 && blob.lifeSkills.blacksmithing.level === 11);
check('equipment slots survive as-is (opaque blobs incl. quality/hardness)', blob.weapon.quality === 'elite' && blob.weapon.hardness === 2 && blob.rangedWeapon.type === 'bow' && blob.staffWeapon === null && blob.activeSlot === 'ranged' && blob.armor.tierMult === 1.4 && blob.shield.tierMult === 1.0 && blob.amulet.stat === 'elemResist');
check('weaponStash survives (with its own quality fields)', blob.weaponStash.length === 1 && blob.weaponStash[0].quality === 'rare');
check('quest family survives', blob._quests.mayor_1 === 'active' && blob._questFlags.met_mayor === true && blob._questKills.mayor_2 === 3 && blob.achievementPoints === 15);
check('rate-limit histories survive (reconnect-cycling defense)', Array.isArray(blob._perfectHistory) && blob._perfectHistory.length === 1 && Array.isArray(blob._cookHistory) && blob._cookHistory.length === 1);
check('weapon/defense skill track survives', blob.weaponSkills.melee.level === 3 && blob.weaponUnspent.melee === 2 && blob.weaponSpecs.melee.damage === 5 && blob.defenseSkill.level === 2 && blob.defenseUnspent === 1 && blob.defenseSpec.bulwark === 2);

// ── 2. fixed-field rule ──
check('runtime-only fields are NOT persisted (fixed-field rule)',
  blob.dmgFromMonster === undefined && blob._lastGambleAt === undefined && blob._someRuntimeFlag === undefined,
  Object.keys(blob).filter((k) => ['dmgFromMonster', '_lastGambleAt', '_someRuntimeFlag'].includes(k)));

// ── 3. buff pruning on save ──
check('_pruneBuffs: expired buff dropped, future buff kept', blob._buffs.regen === FUTURE && blob._buffs.damage === undefined, blob._buffs);

// ── 4. stash cap truncation ──
ps.weaponStash = Array.from({ length: 10 }, (_, i) => ({ type: 'sword', tierMult: 1, _idx: i }));
await room._saveRpg('bp_pt_a', ps);
const blob2 = state._store.get('rpg:bp_pt_a');
// Documented quirk (handoff item L adjacent): slice(0, CAP) keeps the
// FIRST 8 -- entries pushed past the cap are the ones destroyed.  The
// inbox weapon-parking path exists to route around this; if the policy
// ever changes to keep-newest, update this assertion deliberately.
check('stash truncates to WEAPON_STASH_CAP keeping the FIRST entries',
  blob2.weaponStash.length === room.WEAPON_STASH_CAP && blob2.weaponStash[0]._idx === 0 && blob2.weaponStash[room.WEAPON_STASH_CAP - 1]._idx === room.WEAPON_STASH_CAP - 1,
  blob2.weaponStash.map((w) => w._idx));

// ── 5. _healLifeSkills on load (v2.3.769 corruption shapes) ──
state._store.set('rpg:bp_pt_heal', {
  coins: 5, level: 1, xp: 0,
  lifeSkills: { pets: { 0: { name: 'a' }, 1: { name: 'b' } }, activePet: {}, cooking: { level: 2, xp: 0 } },
});
const healed = await room._loadRpg('bp_pt_heal');
check('corrupted pets object heals to an array', Array.isArray(healed.lifeSkills.pets) && healed.lifeSkills.pets.length === 2 && healed.lifeSkills.pets[1].name === 'b', healed.lifeSkills.pets);
check('empty-object activePet heals to null', healed.lifeSkills.activePet === null);
check('healed shape RE-PERSISTED (storage converges clean)', Array.isArray(state._store.get('rpg:bp_pt_heal').lifeSkills.pets));
const healedAgain = await room._loadRpg('bp_pt_heal');
check('second load is a no-op (heal is idempotent)', Array.isArray(healedAgain.lifeSkills.pets) && healedAgain.lifeSkills.pets.length === 2 && healedAgain.lifeSkills.activePet === null && healedAgain.lifeSkills.cooking.level === 2);

// ── 6. reconnect rebuild from the stored blob ──
ps.weaponStash = [{ type: 'staff', tierMult: 1.0, quality: 'rare', hardness: 0, temper: 0 }];
ps.coins = 1234;
await room._saveRpg('bp_pt_a', ps);
const ws2 = fakeWs('p2');
// Join payload claims different values -- the stored blob must win.
await join(ws2, 'bp_pt_a', { rpg: { coins: 999999 } });
const ps2 = room.playerState['bp_pt_a'];
// NOTE: level is NOT restored verbatim -- v2.3.910 made combat level
// derived, and v2.3.1342 re-based it on T2 points PLACED (cap 1000):
// here defenseSpec bulwark 2 + ironskin 1 = 3 (the weaponSpecs entry
// uses the legacy non-canonical 'melee.damage' shape, which the
// canonical summation ignores).  The blob's stored `level` is a
// snapshot for legacy readers; the join bootstrap recomputes.  Coins
// must come from the store, not the join payload.
check('reconnect restores stored coins; level re-derives as 1 + placed T2 points', ps2.coins === 1234 && ps2.level === 4, { coins: ps2.coins, level: ps2.level });
check('reconnect stash passes the NON-strict clamp (server-minted quality kept)', ps2.weaponStash.length === 1 && ps2.weaponStash[0].quality === 'rare', ps2.weaponStash);
check('reconnect restores the defense track', ps2.defenseSkill && ps2.defenseSkill.level === 2 && ps2.defenseSpec && ps2.defenseSpec.ironskin === 1);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
