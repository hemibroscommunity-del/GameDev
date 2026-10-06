/* Salvage and essences at the blacksmith -- v2.3.3110 (server/src/salvage.js).
 *
 * Owner: "all items like iron armor, bronze armor, etc should be salvageable
 * at the blacksmith for 50% of the bars it took to make them.  So maybe
 * chest, legs, and sword each take 4 bars to make (5 ore makes 1 bar).  If
 * you salvage them you get 2 bars back" -- and "if you salvage the rare,
 * elite, and godly armor you can get back that tier's 'essence' and use it on
 * whatever same tier armor or weapon you want."
 *
 *   1. The numbers: caps.salvage under a kill-switch name; four bars a piece
 *      everywhere a piece is made (armour forge, weapon forge), two back.
 *   2. The helpers: essence keys (and junk), grades, a piece's metal.
 *   3. A sword forged from four bars (and not from ore any more).
 *   4. Armour salvaged: two bars, the ledger row gone, the server's stash
 *      entry gone; a Rare piece leaves its essence.
 *   5. Armour refused, nothing taken: worn, in the mail, made before the
 *      ledger, the wrong list, not a metal with bars, junk.
 *   6. Weapons salvaged from the weapon bag by index and signature; a moved
 *      list, a dropped weapon, a bow, titanium, an empty slot refused.
 *   7. Essences: raise a lower piece of the same metal, armour (its ledger
 *      row, its stash entry) and weapon; refused for the wrong metal, an equal
 *      or higher grade, none held, junk, a worn piece.
 *   8. The shopkeeper prices them; the cooldown; the kill switch.
 */
import { GameRoom } from '../src/index.js';
import {
  SALVAGE, essenceKey, parseEssenceKey, gradeRank, armourMetal, weaponMetal, weaponSig,
} from '../src/salvage.js';
import { ARMOR_FORGE } from '../src/armorforge.js';
import { SMELT } from '../src/smelting.js';
import { BLACKSMITH_TIERS } from '../src/data.js';
import { LIVEOPS } from '../src/liveops.js';

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

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const PID = 'bp_salvage_a';
const ws = fakeWs();
await join(ws, PID);
const ps = () => room.playerState[PID];
const inv = () => ps().inventory;
const setSmith = (level) => { ps().lifeSkills = ps().lifeSkills || {}; ps().lifeSkills.blacksmithing = { level, xp: 0 }; };
const rows = () => ((room._gearProvOf(PID) || { list: [] }).list || []);
const rowOf = (gid) => rows().find((r) => r.id === gid) || null;
/* the next roll of the quality dice */
let nextGrade = 'normal';
room._rollWeaponQuality = () => nextGrade;
const send = async (type, payload) => {
  ps()._lastSalvageAt = 0;   /* the cooldown is its own check, in section 8 */
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
};
const result = (type) => { const m = ws.sent.filter((x) => x.type === type); return m.length ? m[m.length - 1].payload : null; };
const forgeArmor = async (recipe, grade) => {
  const r = ARMOR_FORGE.RECIPES[recipe];
  setSmith(Math.max(r.minLvl, 10));
  inv()[r.bar] = (inv()[r.bar] || 0) + r.bars;
  nextGrade = grade || 'normal';
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'forge_armor', payload: { recipe } }));
  const m = ws.sent.find((x) => x.type === 'forge_armor_result');
  return m ? m.payload.piece : null;
};
const salvage = async (payload) => { await send('smith_salvage', payload); return result('smith_salvage_result'); };
const apply = async (payload) => { await send('essence_apply', payload); return result('essence_result'); };
const bars = (k) => Math.floor(inv()[k] || 0);

// ── 1. The numbers ──
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.salvage is advertised', !!sync && sync.caps.salvage === true);
  check('...under a name the liveflags route accepts (lower case: a kill switch)', LIVEOPS.FLAG_NAME_RE.test('salvage'));
  check('salvage gives back half of what a piece takes: two of four bars', SALVAGE.COST_BARS === 4 && SALVAGE.BARS === 2);
  check('the armour forge takes four bars for every torso and greaves (the owner\'s "4 bars")',
    Object.values(ARMOR_FORGE.RECIPES).every((r) => r.bars === SALVAGE.COST_BARS), Object.values(ARMOR_FORGE.RECIPES).map((r) => r.bars));
  const metals = Object.keys(SALVAGE.METALS);
  check('every metal salvage knows is one the smelter makes a bar of', metals.every((m) => Object.prototype.hasOwnProperty.call(SMELT.RECIPES, SALVAGE.METALS[m].bar)));
  check('...and its swords are forged from four of those bars (data.js BLACKSMITH_TIERS)',
    metals.every((m) => { const t = BLACKSMITH_TIERS[SALVAGE.METALS[m].gearBase]; return !!t && t.bar === SALVAGE.METALS[m].bar && t.bars === SALVAGE.COST_BARS && !('oreCost' in t); }),
    metals.map((m) => BLACKSMITH_TIERS[SALVAGE.METALS[m].gearBase]));
  check('...and its armour from them too', metals.every((m) => Object.values(ARMOR_FORGE.RECIPES).some((r) => r.mat === m && r.bar === SALVAGE.METALS[m].bar)));
  check('a sword pays the armour forge\'s XP for the same four bars',
    metals.every((m) => { const t = BLACKSMITH_TIERS[SALVAGE.METALS[m].gearBase]; const a = Object.values(ARMOR_FORGE.RECIPES).find((r) => r.mat === m); return t.xp === a.xp; }));
  check('the metals past black steel keep their ore (no bar yet)', !BLACKSMITH_TIERS.titanium.bar && BLACKSMITH_TIERS.titanium.oreCost > 0 && !BLACKSMITH_TIERS.wood.bar);
}

// ── 2. The helpers ──
{
  check('an essence key names its grade and metal', essenceKey('rare', 'iron') === 'essence_rare_iron'
    && JSON.stringify(parseEssenceKey('essence_elite_blacksteel')) === JSON.stringify({ grade: 'elite', metal: 'blacksteel' }));
  const junk = ['essence_normal_iron', 'essence_rare_wood', 'essence_rare_', 'essence__iron', 'essence_rare_iron_x', '__proto__', 'constructor',
    'essence_rare___proto__', 'essence_godly_titanium', 'bar_iron', '', null, 5, {}, 'essence_rare_' + 'x'.repeat(40)];
  check('anything else is no essence', junk.every((k) => parseEssenceKey(k) === null));
  check('grades rank normal < rare < elite < godly, anything unknown as normal',
    gradeRank('normal') === 0 && gradeRank('rare') === 1 && gradeRank('elite') === 2 && gradeRank('godly') === 3 && gradeRank('legendary') === 0 && gradeRank(undefined) === 0);
  check('an armour piece\'s metal is its mat', armourMetal({ mat: 'iron' }) === 'iron' && armourMetal({ mat: 'blacksteel' }) === 'blacksteel'
    && armourMetal({ mat: 'leather' }) === null && armourMetal({ mat: '__proto__' }) === null && armourMetal(null) === null);
  check('a forged sword\'s metal is its gearBase (black steel\'s is still "steel")',
    weaponMetal({ type: 'sword', gearBase: 'copper' }) === 'copper' && weaponMetal({ type: 'greatsword', gearBase: 'steel' }) === 'blacksteel');
  check('...a dropped weapon, a bow, wood and titanium have none',
    weaponMetal({ type: 'sword' }) === null && weaponMetal({ type: 'bow', gearBase: 'iron' }) === null
      && weaponMetal({ type: 'sword', gearBase: 'wood' }) === null && weaponMetal({ type: 'sword', gearBase: 'titanium' }) === null
      && weaponMetal({ type: 'sword', gearBase: 'ww_pine' }) === null);
}

// ── 3. A sword from four bars ──
{
  setSmith(6);
  ps().coins = 100;
  ps().weapon = null;
  /* the forge's own stat gate (gear.js): a copper blade asks trained sword 5,
     or agility 10 on a legacy save -- not what this section is about */
  ps().agility = 50; ps().power = 50;
  if (ps().prog3) { ps().prog3.sk = ps().prog3.sk || {}; ps().prog3.sk.sword = { ...(ps().prog3.sk.sword || {}), level: 20 }; }
  inv().ore_copper_ore = 10;
  delete inv().bar_copper;
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'forge_weapon', payload: { weaponType: 'sword', tierKey: 'copper', isWoodwork: false } }));
  check('copper ore alone forges no copper sword any more', !ps().weapon && inv().ore_copper_ore === 10 && ps().coins === 100, ps().weapon);
  inv().bar_copper = 5;
  const xp0 = ps().lifeSkills.blacksmithing.xp;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'forge_weapon', payload: { weaponType: 'sword', tierKey: 'copper', isWoodwork: false } }));
  const w = ps().weapon;
  const smith = ps().lifeSkills.blacksmithing;
  check('four copper bars and the gold forge a copper sword', !!w && w.gearBase === 'copper' && w.type === 'sword' && bars('bar_copper') === 1
    && ps().coins === 100 - BLACKSMITH_TIERS.copper.goldCost && inv().ore_copper_ore === 10, { w, inv: inv(), coins: ps().coins });
  check('...paying the bars\' XP (' + BLACKSMITH_TIERS.copper.xp + ')', smith.level > 6 || smith.xp - xp0 === BLACKSMITH_TIERS.copper.xp, smith);
}

// ── 4. Armour salvaged ──
{
  const piece = await forgeArmor('iron_torso', 'normal');
  const barsBefore = bars('bar_iron');
  check('an iron torso forged (the piece to salvage)', !!piece && !!rowOf(piece.gid) && piece.mat === 'iron', piece);
  /* the server's stash has adopted it (the next join would) */
  ps().armorStash = [{ ...piece }];
  const r = await salvage({ field: 'armorStash', gid: piece.gid });
  check('salvaged: two iron bars back', !!r && r.ok === true && bars('bar_iron') === barsBefore + 2 && r.bar === 'bar_iron' && r.bars === 2, { r, inv: inv() });
  check('...no essence from a normal piece', r.essence === null && !Object.keys(inv()).some((k) => k.startsWith('essence_')), r);
  check('...its ledger row gone and the server\'s stash entry with it', !rowOf(piece.gid) && ps().armorStash.length === 0, { rows: rows().length, stash: ps().armorStash });
  check('...answered with the piece\'s id, then a player_state', r.gid === piece.gid && r.field === 'armorStash' && ws.sent.some((m) => m.type === 'player_state'));
  const again = await salvage({ field: 'armorStash', gid: piece.gid });
  check('the same piece cannot be salvaged twice', !!again && again.ok === false && again.reason === 'not_held' && bars('bar_iron') === barsBefore + 2, again);

  const legs = await forgeArmor('blacksteel_greaves', 'rare');
  const bs0 = bars('bar_black_steel');
  const r2 = await salvage({ field: 'legsStash', gid: legs.gid });
  check('Rare black steel greaves: two black steel bars AND a Rare Black Steel Essence', !!r2 && r2.ok && bars('bar_black_steel') === bs0 + 2
    && r2.essence === 'essence_rare_blacksteel' && inv().essence_rare_blacksteel === 1 && r2.grade === 'rare' && r2.metal === 'blacksteel', { r2, inv: inv() });
  const t3 = await forgeArmor('copper_torso', 'godly');
  const r3 = await salvage({ field: 'armorStash', gid: t3.gid });
  check('a Godly copper torso leaves a Godly Copper Essence', !!r3 && r3.ok && r3.essence === 'essence_godly_copper' && inv().essence_godly_copper === 1, r3);
}

// ── 5. Armour refused, nothing taken ──
{
  const snap = () => JSON.stringify({ inv: inv(), rows: rows().map((r) => r.id).sort() });
  const piece = await forgeArmor('copper_torso', 'normal');
  /* worn: equipped by its id, the real route */
  await room.webSocketMessage(ws, JSON.stringify({ type: 'stats_update', payload: { armorRef: piece.gid } }));
  let s0 = snap();
  let r = await salvage({ field: 'armorStash', gid: piece.gid });
  check('a piece you wear is refused ("worn"), nothing taken', !!ps().armor && ps().armor.gid === piece.gid && r && r.ok === false && r.reason === 'worn' && snap() === s0, r);
  ps().armor = null;
  room._gearProvMailMark(PID, piece.gid, true);
  r = await salvage({ field: 'armorStash', gid: piece.gid });
  check('a piece still in the mail is refused ("in_mail")', r && r.reason === 'in_mail' && snap() === s0, r);
  room._gearProvMailMark(PID, piece.gid, false);
  r = await salvage({ field: 'legsStash', gid: piece.gid });
  check('a torso named as greaves is refused ("wrong_slot")', r && r.reason === 'wrong_slot' && snap() === s0, r);
  r = await salvage({ field: 'armorStash' });
  check('a piece with no id (made before the ledger) is refused ("legacy")', r && r.reason === 'legacy' && snap() === s0, r);
  r = await salvage({ field: 'armorStash', gid: 'gNOTMINE.1.abcd' });
  check('an id that is not yours is refused ("not_held")', r && r.reason === 'not_held' && snap() === s0, r);
  /* a piece of armour that is not one of the metals with bars */
  const leather = room._gearProvRecord(PID, 'armor', { name: 'Leather Vest', mat: 'leather', slot: 'armor', tierMult: 1, quality: 'rare' }, 'quest');
  s0 = snap();
  r = await salvage({ field: 'armorStash', gid: leather.gid });
  check('a piece of no metal with bars is refused ("not_metal") and KEPT', r && r.reason === 'not_metal' && !!rowOf(leather.gid) && snap() === s0, r);
  const junk = [null, {}, { field: '__proto__', gid: piece.gid }, { field: 'shieldStash', gid: piece.gid }, { field: 'armorStash', gid: 5 },
    { field: 'armorStash', gid: 'x'.repeat(41) }, { field: 'weaponStash', idx: '0' }, { field: 'weaponStash', idx: -1 }, { field: 'constructor' }];
  let paid = 0;
  for (const j of junk) { const x = await salvage(j); if (x && x.ok) paid++; }
  check('junk salvages nothing', paid === 0 && snap() === s0 && !!rowOf(piece.gid));
  ps().dead = true;
  ws.sent.length = 0;
  ps()._lastSalvageAt = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'smith_salvage', payload: { field: 'armorStash', gid: piece.gid } }));
  ps().dead = false;
  check('a dead player salvages nothing', !ws.sent.some((m) => m.type === 'smith_salvage_result') && !!rowOf(piece.gid));
}

// ── 6. Weapons, from the weapon bag ──
const mkSword = (gearBase, type, quality) => ({ type: type || 'sword', tier: 'common', tierMult: (BLACKSMITH_TIERS[gearBase] || { tierMult: 1 }).tierMult,
  element1: null, element2: null, isVolatile: false, name: gearBase + ' ' + (type || 'sword'), gearBase, reforgeBonus: null, hardenBonus: null,
  quality: quality || 'normal', hardness: 0, temper: 0 });
{
  ps().weaponStash = [mkSword('iron', 'greatsword'), mkSword('steel', 'sword', 'elite'), { type: 'sword', tier: 'common', tierMult: 1, name: 'Sword', quality: 'rare' },
    mkSword('iron', 'bow'), mkSword('titanium', 'sword')];
  const iron0 = bars('bar_iron');
  const r = await salvage({ field: 'weaponStash', idx: 0, sig: weaponSig(ps().weaponStash[0]) });
  check('an iron greatsword from the weapon bag: two iron bars, out of the bag', !!r && r.ok && bars('bar_iron') === iron0 + 2 && ps().weaponStash.length === 4
    && r.idx === 0 && r.metal === 'iron' && r.essence === null, { r, stash: ps().weaponStash.map((w) => w.name) });
  const bs0 = bars('bar_black_steel');
  const wrongSig = await salvage({ field: 'weaponStash', idx: 0, sig: weaponSig(ps().weaponStash[1]) });
  check('a signature that does not match the slot is refused ("changed"), nothing taken', wrongSig && wrongSig.reason === 'changed' && ps().weaponStash.length === 4, wrongSig);
  const r2 = await salvage({ field: 'weaponStash', idx: 0, sig: weaponSig(ps().weaponStash[0]) });
  check('an Elite black steel sword: two black steel bars and an Elite Black Steel Essence', !!r2 && r2.ok && bars('bar_black_steel') === bs0 + 2
    && r2.essence === 'essence_elite_blacksteel' && inv().essence_elite_blacksteel === 1, r2);
  const left = ps().weaponStash.length;
  let refused = [];
  for (let i = 0; i < ps().weaponStash.length; i++) {
    const x = await salvage({ field: 'weaponStash', idx: i, sig: weaponSig(ps().weaponStash[i]) });
    refused.push(x && x.reason);
  }
  check('a dropped weapon, a bow and a titanium sword are refused ("not_metal")', refused.join(',') === 'not_metal,not_metal,not_metal' && ps().weaponStash.length === left, refused);
  const gone = await salvage({ field: 'weaponStash', idx: 9, sig: 'x' });
  check('an empty slot is refused ("gone")', gone && gone.reason === 'gone', gone);
  ps().weapon = mkSword('copper');
  const cu0 = bars('bar_copper');
  await salvage({ field: 'weapon', idx: 0, sig: weaponSig(ps().weapon) });
  check('the weapon in your hand can not be named', !!ps().weapon && bars('bar_copper') === cu0);
}

// ── 7. Essences ──
{
  const greaves = await forgeArmor('iron_greaves', 'normal');
  ps().legsStash = [{ ...greaves }];
  inv().essence_rare_iron = 2;
  let r = await apply({ essence: 'essence_rare_iron', field: 'legsStash', gid: greaves.gid });
  check('a Rare Iron Essence makes plain iron greaves Rare', !!r && r.ok && r.grade === 'rare' && r.piece && r.piece.quality === 'rare' && r.piece.gid === greaves.gid
    && rowOf(greaves.gid).p.quality === 'rare' && ps().legsStash[0].quality === 'rare' && inv().essence_rare_iron === 1, { r, row: rowOf(greaves.gid) });
  const stored = state._store.get('gear_prov:' + PID);
  const srow = stored && stored.list && stored.list.find((x) => x.id === greaves.gid);
  check('...in the ledger as stored, so the next join rebuilds it Rare', !!srow && srow.p.quality === 'rare', srow);
  r = await apply({ essence: 'essence_rare_iron', field: 'legsStash', gid: greaves.gid });
  check('a second Rare Essence on a Rare piece is refused ("not_lower"), not used', r && r.reason === 'not_lower' && inv().essence_rare_iron === 1, r);
  inv().essence_elite_iron = 1;
  r = await apply({ essence: 'essence_elite_iron', field: 'legsStash', gid: greaves.gid });
  check('an Elite Essence raises it again, and is used up', r && r.ok && rowOf(greaves.gid).p.quality === 'elite' && !('essence_elite_iron' in inv()), r);
  inv().essence_rare_copper = 1;
  r = await apply({ essence: 'essence_rare_copper', field: 'legsStash', gid: greaves.gid });
  check('a copper essence on iron is refused ("wrong_metal")', r && r.reason === 'wrong_metal' && inv().essence_rare_copper === 1, r);
  r = await apply({ essence: 'essence_godly_iron', field: 'legsStash', gid: greaves.gid });
  check('an essence you do not hold is refused ("no_essence")', r && r.reason === 'no_essence' && rowOf(greaves.gid).p.quality === 'elite', r);
  let ok = 0;
  for (const k of ['__proto__', 'essence_normal_iron', 'bar_iron', 'essence_rare_wood', null, 7]) {
    inv()[typeof k === 'string' ? k : 'x'] = inv()[typeof k === 'string' ? k : 'x'] || 1;
    const x = await apply({ essence: k, field: 'legsStash', gid: greaves.gid });
    if (x && x.ok) ok++;
  }
  check('junk essences change nothing', ok === 0 && rowOf(greaves.gid).p.quality === 'elite');
  /* a worn piece is refused */
  const torso = await forgeArmor('iron_torso', 'normal');
  await room.webSocketMessage(ws, JSON.stringify({ type: 'stats_update', payload: { armorRef: torso.gid } }));
  r = await apply({ essence: 'essence_rare_iron', field: 'armorStash', gid: torso.gid });
  check('a worn piece is refused ("worn") and keeps its grade', r && r.reason === 'worn' && rowOf(torso.gid).p.quality === 'normal' && inv().essence_rare_iron === 1, r);
  ps().armor = null;
  /* a weapon */
  ps().weaponStash = [mkSword('copper', 'greatsword')];
  r = await apply({ essence: 'essence_rare_copper', field: 'weaponStash', idx: 0, sig: weaponSig(ps().weaponStash[0]) });
  check('a Rare Copper Essence makes a copper greatsword Rare', r && r.ok && ps().weaponStash[0].quality === 'rare' && !('essence_rare_copper' in inv()), r);
  inv().essence_rare_iron = 1;
  r = await apply({ essence: 'essence_rare_iron', field: 'weaponStash', idx: 0, sig: weaponSig(ps().weaponStash[0]) });
  check('...an iron essence on it is refused ("wrong_metal")', r && r.reason === 'wrong_metal', r);
  r = await apply({ essence: 'essence_rare_iron', field: 'weaponStash', idx: 0, sig: 'stale' });
  check('...a stale signature is refused ("changed")', r && r.reason === 'changed', r);
}

// ── 8. The shopkeeper, the cooldown, the kill switch ──
{
  check('the shopkeeper prices essences by their grade', room._shopBaseValue('essence_rare_iron') === 1500
    && room._shopBaseValue('essence_elite_copper') === 8000 && room._shopBaseValue('essence_godly_blacksteel') === 250000);
  const piece = await forgeArmor('copper_greaves', 'normal');
  const cu0 = bars('bar_copper');
  ps()._lastSalvageAt = Date.now();
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'smith_salvage', payload: { field: 'legsStash', gid: piece.gid } }));
  check('an act inside the cooldown is dropped', !ws.sent.some((m) => m.type === 'smith_salvage_result') && !!rowOf(piece.gid) && bars('bar_copper') === cu0);
  room._liveFlags = { ...(room._liveFlags || {}), salvage: false };
  ps()._lastSalvageAt = 0;
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'smith_salvage', payload: { field: 'legsStash', gid: piece.gid } }));
  inv().essence_rare_copper = 1;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'essence_apply', payload: { essence: 'essence_rare_copper', field: 'legsStash', gid: piece.gid } }));
  check('switched off: neither act, nothing taken or changed', !ws.sent.some((m) => m.type === 'smith_salvage_result' || m.type === 'essence_result')
    && !!rowOf(piece.gid) && rowOf(piece.gid).p.quality === 'normal' && inv().essence_rare_copper === 1);
  const ws2 = fakeWs();
  await join(ws2, 'bp_salvage_b');
  const sync = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is told salvage is shut', !!sync && sync.caps.salvage === false);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall salvage checks passed');
process.exit(failures ? 1 : 0);
