/* ═══ v2.3.4386: GEAR THE PHONE SHOWS BEFORE THE WORKER ANSWERS ═══
 *
 * The state-machine sweep (2026-11-03, V9b): a gear tap moves the piece on
 * the phone at once and asks the worker, which has the final say.  Three
 * roads left the phone showing something untrue:
 *   1. the rejoin's armour rescue (wsClient.js _rescueDisplacedArmor) knew a
 *      piece by name and tierMult, which every grade of a forged piece
 *      shares: a Rare Copper Torso put on while the socket was closed met
 *      the worker's echo of the Normal one, and the phone kept two Normals
 *      and lost the Rare (the worker still held it).  Now a piece with a
 *      ledger id is known by its id;
 *   2. the Hero page's weapon picker took a weapon off into a full bag (the
 *      worker refuses at eight; the next echo hid the weapon), and every
 *      bag weapon's Equip put one above your trained level in your hand
 *      (the worker refused it silently).  Both asked first now, the worker's
 *      own way (equipActions.js weaponBagFull / weaponBlocked);
 *   3. the worker's level-gate refusal (gear.js _handleEquipRequest) is
 *      answered with the weapon fields, as its type mismatch already was;
 *      `gearresend: false` brings back the silence.
 * The phone's code is cut from src/ and run here as written, with stubs for
 * what it reaches (weapon-pick.test's way).
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { GameRoom } from '../src/index.js';
import { setProg3Enabled, prog3Live } from '../../src/data/prog3.js';
import { canEquipItem, getEquipReqLabel, WEAPON_STASH_MAX } from '../../src/data/gameSystems.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* the text of the block opening at `open` (a '{'), skipping strings and
   comments so a brace in either does not end it */
function block(s, open) {
  let d = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === '/' && n === '*') { i = s.indexOf('*/', i + 2) + 1; continue; }
    if (c === '/' && n === '/') { i = s.indexOf('\n', i); continue; }
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < s.length && s[i] !== c; i++) if (s[i] === '\\') i++;
      continue;
    }
    if (c === '{') d++;
    else if (c === '}' && --d === 0) return s.slice(open, i + 1);
  }
  return null;
}
/* `function name(...) {...}` as written, or '' when there is none */
function fnSrc(s, name) {
  const at = s.search(new RegExp('(^|\\n)(export )?function ' + name + '\\('));
  if (at < 0) return '';
  const start = s.indexOf('function ' + name + '(', at);
  const b = block(s, s.indexOf('{', s.indexOf(')', start)));
  return b ? s.slice(start, s.indexOf('{', s.indexOf(')', start))) + b : '';
}

setProg3Enabled(true);
const lvl1 = () => ({ sk: { sword: { level: 1, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } }, alloc: {}, atk: {}, pool: 0, ms: {} });
const wpn = (type, gearBase, name) => ({ type, gearBase, tierMult: 1, name: name || (type + ':' + gearBase) });

/* ── 1. the armour rescue knows a recorded piece by its id ── */
{
  const ws = src('src/networking/wsClient.js');
  const code = ['_armorSame', '_gidOf', '_rescueDisplacedArmor'].map((n) => fnSrc(ws, n)).join('\n');
  const popups = [];
  const run = (S, slot, stashKey, incoming) => {
    try {
      vm.runInNewContext(code + '\n_rescueDisplacedArmor(S, slot, stashKey, incoming); S.rpg[slot] = incoming;',
        { S, slot, stashKey, incoming, Date, pushDmgPopup: (s, x, y, t) => popups.push(t) });
      return null;
    } catch (e) { return String(e).slice(0, 200); }
  };
  const torso = (gid, quality) => ({ name: 'Copper Torso', mat: 'copper', slot: 'armor', tierMult: 1, quality, gid });
  /* the road: wearing the Normal (A), the Rare (B) in the bag; offline, the
     phone swaps them (B worn, A in the bag) and the send is dropped; the
     rejoin's full player_state says the worker still has A on */
  const A = torso('g_A', 'normal'), B = torso('g_B', 'rare');
  const S = { rpg: { armor: B, armorStash: [A] }, player: { x: 0, y: 0 } };
  const err = run(S, 'armor', 'armorStash', { ...A });
  const gids = (S.rpg.armorStash || []).map((p) => p.gid);
  check('1a the rescue runs as written', err === null, err);
  check('1b the Rare one put on offline is back in the bag (it was lost: two Normals)', gids.includes('g_B'), gids);
  check('1c ...the Normal the worker kept is worn, and not ALSO in the bag', S.rpg.armor.gid === 'g_A' && !gids.includes('g_A'), { worn: S.rpg.armor.gid, gids });
  check('1d ...so the phone holds what the worker holds: one of each', gids.length === 1, gids);
  /* the echo repeats (every rejoin, every delta that names the slot) */
  run(S, 'armor', 'armorStash', { ...A });
  check('1e a repeated echo changes nothing', S.rpg.armor.gid === 'g_A' && S.rpg.armorStash.map((p) => p.gid).join() === 'g_B', S.rpg.armorStash.map((p) => p.gid));
  /* the legs, the same road */
  const L1 = { name: 'Iron Greaves', tierMult: 2, gid: 'g_L1' }, L2 = { name: 'Iron Greaves', tierMult: 2, gid: 'g_L2', quality: 'elite' };
  const SL = { rpg: { legsArmor: L2, legsStash: [L1] }, player: { x: 0, y: 0 } };
  run(SL, 'legsArmor', 'legsStash', { ...L1 });
  check('1f the legs too: the Elite greaves back in the bag, the worn pair not doubled',
    SL.rpg.legsArmor.gid === 'g_L1' && SL.rpg.legsStash.map((p) => p.gid).join() === 'g_L2', SL.rpg.legsStash);
  /* a piece made before the ledger (no id) is known by name as before:
     the worker's echo of the same name keeps it worn, nothing bagged */
  const old = { name: 'Copper Torso', tierMult: 1 };
  const SO = { rpg: { armor: old, armorStash: [] }, player: { x: 0, y: 0 } };
  run(SO, 'armor', 'armorStash', { name: 'Copper Torso', tierMult: 1 });
  check('1g a piece with no id: name and tierMult still decide (unchanged)', SO.rpg.armorStash.length === 0, SO.rpg.armorStash);
  /* the ordinary swap, online: the echo names the piece the phone put on */
  const SN = { rpg: { armor: B, armorStash: [A] }, player: { x: 0, y: 0 } };
  run(SN, 'armor', 'armorStash', { ...B });
  check('1h an accepted swap: the echo of the piece put on moves nothing', SN.rpg.armor.gid === 'g_B' && SN.rpg.armorStash.map((p) => p.gid).join() === 'g_A', SN.rpg.armorStash);
}

/* ── 2. the phone asks the worker's two weapon refusals first ── */
const EA = src('src/ui/mobile/dash/equipActions.js');
const eaCode = ['weaponBlocked', 'weaponBagFull', 'sameWeapon', 'resolveStashIdx', 'weaponSlotFor', 'equipStashWeapon']
  .map((n) => fnSrc(EA, n)).join('\n');
function phone(R) {
  const sent = [], popups = [];
  const S = { rpg: R, player: { x: 0, y: 0 } };
  const ctx = {
    S, getState: () => S, prog3Live, canEquipItem, getEquipReqLabel, WEAPON_STASH_MAX,
    pushDmgPopup: (s, x, y, t) => popups.push(t), syncWeaponSlot: (m) => sent.push(m), persist() {}, _equipTick() {},
    ACTIVE_FOR: { weapon: 'melee', rangedWeapon: 'ranged', staffWeapon: 'staff' },
  };
  vm.createContext(ctx);
  let err = null;
  try { vm.runInContext(eaCode, ctx); } catch (e) { err = String(e).slice(0, 200); }
  return { S, sent, popups, ctx, err };
}
{
  /* a steel greatsword bought at Melee 1 (the gate: Melee 5 and up) */
  const steel = wpn('greatsword', 'steel', 'Steel Greatsword'), copper = wpn('greatsword', 'copper', 'Copper Greatsword');
  const R = { prog3: lvl1(), weapon: copper, weaponStash: [steel], activeSlot: 'melee' };
  check('2a the steel greatsword is above Melee 1, the worker\'s way', canEquipItem(R, steel, 'weapon') === false);
  const P = phone(R);
  let ok = 'not run';
  try { ok = P.ctx.equipStashWeapon(steel, 0); } catch (e) { ok = String(e).slice(0, 200); }
  check('2b Equip on it moves nothing (it went into the hand while the worker kept the copper one)',
    ok === false && R.weapon === copper && R.weaponStash.length === 1 && R.weaponStash[0] === steel, { ok, weapon: R.weapon && R.weapon.name });
  check('2c ...asks the worker nothing', P.sent.length === 0, P.sent);
  check('2d ...and says why', P.popups.some((t) => /^NEEDS /.test(t)), P.popups);
  /* a weapon you can use still goes on, as before */
  const iron = wpn('greatsword', 'iron', 'Iron Greatsword');
  const R2 = { prog3: lvl1(), weapon: copper, weaponStash: [iron], activeSlot: 'melee' };
  const P2 = phone(R2);
  let ok2 = 'not run';
  try { ok2 = P2.ctx.equipStashWeapon(iron, 0); } catch (e) { ok2 = String(e).slice(0, 200); }
  check('2e an iron greatsword (free at any level) still goes on and is sent',
    ok2 === true && R2.weapon === iron && P2.sent.some((m) => m.type === 'equip_request'), { ok2, sent: P2.sent });
  /* a character the worker does not gate (no prog3) is not gated here */
  const R3 = { weapon: copper, weaponStash: [steel], activeSlot: 'melee' };
  const P3 = phone(R3);
  let ok3 = 'not run';
  try { ok3 = P3.ctx.equipStashWeapon(steel, 0); } catch (e) { ok3 = String(e).slice(0, 200); }
  check('2f no prog3 record: no gate, as the worker passes it', ok3 === true && R3.weapon === steel, ok3);
}

/* ── 3. the Hero page's weapon picker, its toggle run as written ── */
{
  const IDP = src('src/ui/mobile/dash/ItemDetailPopup.jsx');
  const anchor = IDP.indexOf('v2.3.1687: three cases now that every weapon is listed');
  const tStart = IDP.lastIndexOf('toggle: () => {', anchor);
  const body = tStart >= 0 ? block(IDP, IDP.indexOf('{', tStart)) : null;
  check('3a the picker\'s toggle is found', !!body);
  const slotFor = (t) => (t === 'bow' ? 'rangedWeapon' : t === 'staff' ? 'staffWeapon' : 'weapon');
  const runToggle = (R2, w, extra) => {
    const P = phone(R2);
    const ctx = Object.assign(P.ctx, { R2, w, wIdx: R2.weaponStash.indexOf(w), slotFor, refresh() {} }, extra);
    try { vm.runInContext('(() => ' + body + ')()', ctx); return { ...P, err: null }; } catch (e) { return { ...P, err: String(e).slice(0, 200) }; }
  };
  /* eight weapons in the bag, tap the weapon in hand */
  const hand = wpn('greatsword', 'copper', 'Hand');
  const bag8 = Array.from({ length: WEAPON_STASH_MAX }, (_, i) => wpn('greatsword', 'iron', 'Bag ' + i));
  const R = { prog3: lvl1(), weapon: hand, weaponStash: bag8.slice(), activeSlot: 'melee' };
  const T = runToggle(R, hand, { on: true, prop: 'weapon', active: 'melee' });
  check('3b the toggle runs', T.err === null, T.err);
  check('3c a full bag: the weapon in hand stays in hand (it went to a 9th place the worker refuses)',
    R.weapon === hand && R.weaponStash.length === WEAPON_STASH_MAX, { hand: R.weapon && R.weapon.name, bag: R.weaponStash.length });
  check('3d ...nothing sent, and WEAPON BAG FULL said', T.sent.length === 0 && T.popups.includes('WEAPON BAG FULL'), { sent: T.sent, popups: T.popups });
  /* seven: the unequip goes ahead as before */
  const R7 = { prog3: lvl1(), weapon: hand, weaponStash: bag8.slice(0, 7), activeSlot: 'melee' };
  const T7 = runToggle(R7, hand, { on: true, prop: 'weapon', active: 'melee' });
  check('3e seven in the bag: it comes off and the worker is asked', R7.weapon === null && R7.weaponStash.length === 8 && T7.sent.some((m) => m.type === 'unequip_request'), T7.sent);
  /* the picker's own Equip of a weapon above your trained level */
  const steel = wpn('greatsword', 'steel', 'Steel Greatsword');
  const RS = { prog3: lvl1(), weapon: hand, weaponStash: [steel], activeSlot: 'melee' };
  const TS = runToggle(RS, steel, { on: false, prop: 'weapon', active: 'melee' });
  check('3f the picker\'s Equip of a steel greatsword at Melee 1: nothing moves, nothing sent',
    TS.err === null && RS.weapon === hand && RS.weaponStash[0] === steel && TS.sent.length === 0, { err: TS.err, sent: TS.sent });
}

/* ── 4. the worker answers its level-gate refusal ── */
{
  const mockState = {
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const room = new GameRoom(mockState, mockEnv);
  const sent = [];
  const ws = { send(s) { sent.push(JSON.parse(s)); }, close() {} };
  room._wsBySessionId = () => ws;
  room._resendPlayerState = (w, id, fields) => sent.push({ type: 'resend', fields });
  room._sendPlayerState = () => sent.push({ type: 'player_state' });
  room._saveRpgPaced = () => {};
  const copper = wpn('greatsword', 'copper'), steel = wpn('greatsword', 'steel');
  const fresh = () => { room.playerState.g1 = { prog3: lvl1(), z: 'town', x: 0, y: 0, weapon: copper, weaponStash: [steel], activeSlot: 'melee' }; sent.length = 0; };

  fresh();
  room._liveFlags = {};
  room._handleEquipRequest({ id: 'g1' }, { stashIdx: 0, slot: 'weapon' });
  const ps = room.playerState.g1;
  check('4a the steel greatsword at Melee 1 is still refused', ps.weapon === copper && ps.weaponStash[0] === steel);
  const rs = sent.find((m) => m.type === 'resend');
  check('4b ...and answered: the weapon fields re-sent (it was silent)',
    !!rs && ['weapon', 'rangedWeapon', 'staffWeapon', 'weaponStash', 'activeSlot'].every((f) => rs.fields.includes(f)), sent);

  fresh();
  room._liveFlags = { gearresend: false };
  room._handleEquipRequest({ id: 'g1' }, { stashIdx: 0, slot: 'weapon' });
  check('4c `gearresend: false` brings back the silent refusal', sent.length === 0 && room.playerState.g1.weapon === copper, sent);
  check('4d ...off only when written false', room._gearResendOff && room._gearResendOff() === true
    && (room._liveFlags = {}, room._gearResendOff() === false) && (room._liveFlags = { gearresend: true }, room._gearResendOff() === false));

  /* an accepted equip is untouched: one player_state, no resend */
  fresh();
  room._liveFlags = {};
  room.playerState.g1.prog3.sk.sword.level = 30;
  room._handleEquipRequest({ id: 'g1' }, { stashIdx: 0, slot: 'weapon' });
  check('4e an equip the worker accepts swaps in place and echoes once, as before',
    room.playerState.g1.weapon === steel && room.playerState.g1.weaponStash[0] === copper
    && sent.length === 1 && sent[0].type === 'player_state', sent);
  delete room.playerState.g1;
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
