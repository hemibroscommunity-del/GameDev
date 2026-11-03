/* ═══ v2.3.4154: A NUMBER KEY TAKES UP ONLY A WEAPON YOU HOLD ═══
 *
 * The state-machine sweep (2026-11-03, VB-1 G2-17): on a computer the 2 key
 * put a character with no bow into the empty bow slot.  Every attack was then
 * refused for want of a weapon, the name over the head said "undefined", and
 * since v2.3.4151 the pick is told to the worker (set_active_slot), which
 * saves any of the three slots (server/src/gear.js _handleSetActiveSlot): the
 * empty slot came back on every join.  The 3 key asked for a staff at the
 * key; the 2 key asked nothing.  Now both ask in one place, BroTown's
 * _desktopSelectSlot (the computer's weapon bar, WeaponBar.jsx, runs it too),
 * by the cycle's own rule (src/game/weaponSlots.js ownedWeaponSlots, v2.3.1845:
 * "neither offers a slot you cannot fill"), and a slot saved before this
 * version is healed to melee when the phone adopts it at join.
 *   1. pickSlot, the direct pick's rule: the slot to take up, or null;
 *   2. ...the same answer as the cycle's own list, for every loadout and slot;
 *   3. healedSlot, the heal: the slot in hand while you can fill it, else melee;
 *   4. the wiring, the real code run here as written: BroTown's
 *      _desktopSelectSlot, the 1, 2 and 3 keys (each through it, with no rule
 *      of their own), and wsClient's player_state, which heals the worker's
 *      saved slot and tells the worker.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as W from '../../src/game/weaponSlots.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
/* called through the module, so a missing helper is a FAIL line, not a crash */
const pick = (rpg, slot) => (typeof W.pickSlot === 'function' ? W.pickSlot(rpg, slot) : 'no pickSlot');
const heal = (rpg) => (typeof W.healedSlot === 'function' ? W.healedSlot(rpg) : 'no healedSlot');

const SWORD = { type: 'sword', name: 'Rusty Sword' };
const BOW = { type: 'bow', name: 'Oak Bow' };
const STAFF = { type: 'staff', name: 'Ash Staff' };
/* a judge's first minutes: Mayor Bro's first quest taken, so a sword and no
   bow or staff yet (gameSystems.js: every slot starts empty; the sword comes
   with tut_1, the bow when it is handed in, the staff after) */
const fresh = { weapon: SWORD, rangedWeapon: null, staffWeapon: null, activeSlot: 'melee' };

/* ── 1. the direct pick ── */
check('1a both helpers exported', typeof W.pickSlot === 'function' && typeof W.healedSlot === 'function',
  { pickSlot: typeof W.pickSlot, healedSlot: typeof W.healedSlot });
check('1b a sword and no bow yet: 2 takes up nothing (the bug: the empty bow slot)', pick(fresh, 'ranged') === null, pick(fresh, 'ranged'));
check('1c ...3 takes up nothing (no staff), and 1 nothing (the sword already in hand)',
  pick(fresh, 'staff') === null && pick(fresh, 'melee') === null, [pick(fresh, 'staff'), pick(fresh, 'melee')]);
check('1d with a bow, 2 takes up the bow; with a staff, 3 the staff',
  pick({ ...fresh, rangedWeapon: BOW }, 'ranged') === 'ranged' && pick({ ...fresh, staffWeapon: STAFF }, 'staff') === 'staff');
check('1e with all three, 1 from the bow takes up the sword', pick({ ...fresh, rangedWeapon: BOW, staffWeapon: STAFF, activeSlot: 'ranged' }, 'melee') === 'melee');
check('1f melee always exists: no sword at all, 1 from the bow takes up the fists', pick({ rangedWeapon: BOW, activeSlot: 'ranged' }, 'melee') === 'melee');
check('1g a save stuck in an empty bow slot (before this version): 1 takes it back to melee, 2 nothing',
  pick({ ...fresh, activeSlot: 'ranged' }, 'melee') === 'melee' && pick({ ...fresh, activeSlot: 'ranged' }, 'ranged') === null);
check('1h no character, or a slot that is none of the three: nothing',
  pick(null, 'melee') === null && pick(undefined, 'ranged') === null && pick({ ...fresh, rangedWeapon: BOW }, 'bow') === null
  && pick({ ...fresh, rangedWeapon: BOW }, '__proto__') === null && pick({ ...fresh, rangedWeapon: BOW }, undefined) === null);

/* ── 2. the pick and the cycle never disagree ── */
const LOADOUTS = [];
for (const w of [null, SWORD]) for (const r of [null, BOW]) for (const s of [null, STAFF]) {
  for (const a of ['melee', 'ranged', 'staff', undefined]) LOADOUTS.push({ weapon: w, rangedWeapon: r, staffWeapon: s, activeSlot: a });
}
const shape = (R) => [!!R.weapon, !!R.rangedWeapon, !!R.staffWeapon, R.activeSlot || '-'];
const wrongPick = [];
for (const R of LOADOUTS) {
  for (const slot of ['melee', 'ranged', 'staff']) {
    const want = slot !== R.activeSlot && W.ownedWeaponSlots(R).includes(slot) ? slot : null;
    if (pick(R, slot) !== want) wrongPick.push({ R: shape(R), slot, got: pick(R, slot) });
  }
}
check(`2a for all ${LOADOUTS.length} loadouts and the three slots: a slot is taken up exactly when it is yours and not already in hand`,
  wrongPick.length === 0, wrongPick.slice(0, 4));
const cycleRefused = [];
for (const R of LOADOUTS) {
  for (const to of [W.nextWeaponSlot(R), W.prevWeaponSlot(R)]) {
    if (to !== (R.activeSlot || 'melee') && pick(R, to) !== to) cycleRefused.push({ R: shape(R), to });
  }
}
check('2b ...so every step the cycle takes (Tab, the wheel, the pill) is one a key may take too', cycleRefused.length === 0, cycleRefused.slice(0, 4));

/* ── 3. the heal at join ── */
check('3a an empty bow slot saved by the worker heals to melee; an empty staff slot too',
  heal({ ...fresh, activeSlot: 'ranged' }) === 'melee' && heal({ ...fresh, activeSlot: 'staff' }) === 'melee',
  [heal({ ...fresh, activeSlot: 'ranged' }), heal({ ...fresh, activeSlot: 'staff' })]);
check('3b a bow or a staff you hold stays in hand',
  heal({ ...fresh, rangedWeapon: BOW, activeSlot: 'ranged' }) === 'ranged' && heal({ ...fresh, staffWeapon: STAFF, activeSlot: 'staff' }) === 'staff');
check('3c melee stays melee, with a sword or none (fists are a weapon: weaponSlots.js)',
  heal(fresh) === 'melee' && heal({ activeSlot: 'melee' }) === 'melee');
check('3d no slot, no character, or a slot that is none of the three: melee',
  heal({ weapon: SWORD }) === 'melee' && heal(null) === 'melee' && heal({ ...fresh, rangedWeapon: BOW, activeSlot: 'bow' }) === 'melee');
const healOff = LOADOUTS.filter((R) => !W.ownedWeaponSlots(R).includes(heal(R)) || (W.ownedWeaponSlots(R).includes(R.activeSlot) && heal(R) !== R.activeSlot));
check(`3e for all ${LOADOUTS.length} loadouts the heal lands on a slot you can fill, and never moves one you could`, healOff.length === 0,
  healOff.slice(0, 4).map((R) => shape(R).concat([heal(R)])));

/* ── 4. the wiring, the real code run here as written ── */
const bro = src('src/ui/BroTown.jsx');
const selSrc = (/var _desktopSelectSlot = useCallback\((function \(slot\) \{[\s\S]*?\n {2}\}), \[\]\);/.exec(bro) || [])[1] || '';
/* BroTown's _desktopSelectSlot, with what it reaches for stubbed: the hand
   it leaves, what it tells the worker, what it floats and plays */
function select(rpg, slot) {
  const sent = [], floated = [], played = [];
  const S = { rpg, player: { x: 0, y: 0 }, channel: { send: (m) => sent.push(m) } };
  try {
    const fn = vm.runInNewContext('(' + selSrc + ')', {
      stateRef: { current: S }, setRpgState() {}, _objectSpread: (a, b) => Object.assign({}, a, b),
      pushDmgPopup: (_s, _x, _y, text) => floated.push(String(text)), cue: (n) => played.push(n),
      pickSlot: W.pickSlot,
    });
    fn(slot);
  } catch (e) { return { error: String(e).slice(0, 200) }; }
  return { hand: rpg.activeSlot, sent: sent.map((m) => m.type + ':' + (m.payload && m.payload.slot)), floated, played };
}
const s2 = select({ ...fresh }, 'ranged');
check('4a _desktopSelectSlot as BroTown writes it: with no bow, 2 leaves the sword in hand, tells the worker nothing, floats and plays nothing',
  !!selSrc && s2.hand === 'melee' && s2.sent.length === 0 && s2.floated.length === 0 && s2.played.length === 0, s2);
const s3 = select({ ...fresh }, 'staff');
const s1 = select({ ...fresh, activeSlot: 'ranged' }, 'melee');
check('4b ...3 with no staff, nothing either; 1 from a stale empty bow slot takes the sword back and tells the worker',
  s3.hand === 'melee' && s3.sent.length === 0 && s1.hand === 'melee' && s1.sent.join() === 'set_active_slot:melee' && s1.floated.join() === 'Rusty Sword', { s3, s1 });
const sBow = select({ ...fresh, rangedWeapon: BOW }, 'ranged');
check('4c ...with a bow, 2 takes it up: the hand, the worker told, the bow\'s name and sound',
  sBow.hand === 'ranged' && sBow.sent.join() === 'set_active_slot:ranged' && sBow.floated.join() === 'Oak Bow' && sBow.played.join() === 'swapBow', sBow);
check('4d ...pickSlot imported from game/weaponSlots.js (a missing import throws on the first key press)',
  /import \{[^}]*\bpickSlot\b[^}]*\} from '@\/game\/weaponSlots\.js';/.test(bro));
const ctl = src('src/game/desktopControls.js');
const keyGoes = (code, slot) => new RegExp(`if \\(e\\.code === '${code}'\\) \\{\\s*_desktopSelectSlot\\('${slot}'\\);\\s*return;\\s*\\}`).test(ctl);
check('4e the 1, 2 and 3 keys each go to _desktopSelectSlot with no rule of their own (3 asked for the staff at the key; 2 asked nothing)',
  keyGoes('Digit1', 'melee') && keyGoes('Digit2', 'ranged') && keyGoes('Digit3', 'staff'),
  { 1: keyGoes('Digit1', 'melee'), 2: keyGoes('Digit2', 'ranged'), 3: keyGoes('Digit3', 'staff') });
check('4f ...and the computer\'s weapon bar runs the same pick (registered on the action bus)',
  /actionBus\.registerSelectSlot\(_desktopSelectSlot\)/.test(bro) && /actionBus\.selectSlot\(cell\.active\)/.test(src('src/ui/mobile/dash/WeaponBar.jsx')));

const ws = src('src/networking/wsClient.js');
const adoptSrc = (/(if \(typeof msg\.payload\.activeSlot === 'string' && !S\._userCycledSlot\) \{[\s\S]*?\n {14}\})/.exec(ws) || [])[1] || '';
/* wsClient's player_state lines for the worker's activeSlot */
function adopt(rpg, payloadSlot, latched) {
  const sent = [];
  const S = { rpg, _userCycledSlot: !!latched, channel: { send: (m) => sent.push(m) } };
  try {
    vm.runInNewContext('(function () {' + adoptSrc + '})', { msg: { payload: { activeSlot: payloadSlot } }, S, healedSlot: W.healedSlot })();
  } catch (e) { return { error: String(e).slice(0, 200) }; }
  return { hand: rpg.activeSlot, sent: sent.map((m) => m.type + ':' + (m.payload && m.payload.slot)) };
}
const aStuck = adopt({ ...fresh }, 'ranged');
check('4g player_state as wsClient writes it: a worker\'s saved bow slot with no bow is taken as melee, and the worker told (the save heals)',
  !!adoptSrc && aStuck.hand === 'melee' && aStuck.sent.join() === 'set_active_slot:melee', aStuck);
const aBow = adopt({ ...fresh, rangedWeapon: BOW }, 'ranged');
const aMelee = adopt({ ...fresh, activeSlot: 'ranged', rangedWeapon: BOW }, 'melee');
const aMine = adopt({ ...fresh, rangedWeapon: BOW, activeSlot: 'ranged' }, 'staff', true);
check('4h ...a bow you hold is taken as it was saved, melee as melee, nothing sent; after your own pick the worker\'s slot is not read (as before)',
  aBow.hand === 'ranged' && aBow.sent.length === 0 && aMelee.hand === 'melee' && aMelee.sent.length === 0
  && aMine.hand === 'ranged' && aMine.sent.length === 0, { aBow, aMelee, aMine });
const psCase = (/case 'player_state':([\s\S]*?)case 'player_died':/.exec(ws) || [])[1] || '';
const iRanged = psCase.indexOf("if ('rangedWeapon' in msg.payload)"), iStaff = psCase.indexOf("if ('staffWeapon' in msg.payload)");
const iHeal = psCase.indexOf('healedSlot(S.rpg)');
check('4i ...the heal comes after the weapons the same payload carries (a bow arriving with its slot counts)',
  iRanged >= 0 && iStaff >= 0 && iHeal > iRanged && iHeal > iStaff, { iRanged, iStaff, iHeal });
check('4j ...healedSlot imported from game/weaponSlots.js', /import \{[^}]*\bhealedSlot\b[^}]*\} from '@\/game\/weaponSlots\.js';/.test(ws));

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
