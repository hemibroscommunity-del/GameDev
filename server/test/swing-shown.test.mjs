/* ═══ v2.3.4387: A TAPPED SWING IS SHOWN TO THE OTHERS (VB-1) ═══
 *
 * The state-machine sweep (2026-11-03, cluster VB-1, the phone's fight
 * control).  Each part runs the phone's own code, cut from src/ as written
 * (the way weapon-pick.test does), with stubs for what it calls:
 *   1. G1-5: a swing made with a TAP or a CLICK (playerActions swingAttack)
 *      raises the flag monsterCombat's sweep relays a swing on, so the others
 *      see it; one player_swing a swing, never two (a phone's messages cost
 *      money); a refused press raises nothing;
 *   2. G1-4: the held loop does not swing while a parry has you staggered
 *      (the press already refused it);
 *   3. G1-7: a one-gem bow's or staff's special carries its one gem, as the
 *      sword's special and the worker do (weapongem.js weaponHitElement);
 *   4. D1-1: a collision pays mana (and floats "+N MP") only when it
 *      resonates, as the worker pays it (combat.js _collisionResonance).
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolveCollision, lookupCollision } from '../../src/data/gameSystems.js';
import { ELEMENTS } from '../../src/data/elements.js';
import { weaponHitElement } from '../src/weapongem.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* the text from `start` to the brace that closes the first `{` after it */
function cutBlock(text, start) {
  const i = text.indexOf(start);
  if (i < 0) return null;
  let d = 0;
  for (let j = text.indexOf('{', i); j < text.length; j++) {
    if (text[j] === '{') d++;
    else if (text[j] === '}' && --d === 0) return text.slice(i, j + 1);
  }
  return null;
}

const PA = src('src/game/playerActions.js');
const MC = src('src/game/monsterCombat.js');
const PJ = src('src/game/projectiles.js');

/* ── 1. the tapped swing is relayed ── */
const swingSrc = cutBlock(PA, 'export function swingAttack(S)').replace(/^export /, '');
const relaySrc = cutBlock(MC, 'if (S._swingBcastPending) {');
check('1a the phone\'s code is found (swingAttack, the sweep\'s relay)', !!swingSrc && !!relaySrc);

const no = () => false;
const ctx = vm.createContext({
  Date, Math,
  isPlayerDead: no, swimRefused: no, dazeRefused: no, staggerRefused: no, airRefused: no,
  dropShield: (S) => { S._shieldUp = false; },
  SWING_COOLDOWN: 500, swingCooldownMult: () => 1, weaponSwingMult: () => 1,
  clearSwingHitFlags: () => {}, meleeSwingSfx: () => 'swordSwing',
  accShot: () => 0,   /* v2.3.4495: a basic swing is numbered for accuracy (game/accuracy.js); not this suite's */
  getActiveWeapon: (R) => (R.activeSlot === 'ranged' ? R.rangedWeapon : R.weapon),
});
vm.runInContext(swingSrc + '\nthis.swingAttack = swingAttack;\n'
  + 'this.sweep = function (S, baseAngle) { ' + relaySrc + ' };', ctx);

function bro(over) {
  const sent = [];
  const S = {
    myId: 'bp_me', swingTimer: 0, isSwinging: false,
    rpg: { activeSlot: 'melee', weapon: { type: 'sword', name: 'Rusty Sword' }, rangedWeapon: { type: 'bow' } },
    channel: { send: (m) => sent.push(m) },
    ...over,
  };
  return { S, sent };
}
const swings = (sent) => sent.filter((m) => m.type === 'broadcast' && m.event === 'player_swing');

{
  const { S, sent } = bro();
  ctx.swingAttack(S);
  check('1b a tap swings (the swing starts on the phone)', S.isSwinging === true);
  check('1c ...and raises the relay flag (the bug: only the held loop did)', S._swingBcastPending === true, S._swingBcastPending);
  ctx.sweep(S, 0.75);
  const out = swings(sent);
  check('1d the sweep\'s first frame sends ONE player_swing, with the sword and its angle',
    out.length === 1 && out[0].payload.wpn === 'sword' && out[0].payload.ang === 0.75 && out[0].payload.id === 'bp_me', out);
  ctx.sweep(S, 0.75); ctx.sweep(S, 0.8);
  check('1e the swing\'s later frames send nothing more (one message a swing)', swings(sent).length === 1, swings(sent).length);
  ctx.swingAttack(S);
  ctx.sweep(S, 0.8);
  check('1f a second tap inside the cooldown is refused: no swing, nothing sent', swings(sent).length === 1, swings(sent).length);
}
{
  const { S } = bro({ rpg: { activeSlot: 'melee', weapon: null } });
  ctx.swingAttack(S);
  check('1g no sword: no swing and no flag', !S.isSwinging && !S._swingBcastPending);
}
{
  const { S } = bro({ rpg: { activeSlot: 'ranged', weapon: { type: 'sword' }, rangedWeapon: { type: 'bow' } } });
  ctx.swingAttack(S);
  check('1h the bow in hand: the tap leaves the shot to the loop (which relays its own), no flag',
    !S.isSwinging && !S._swingBcastPending);
}
check('1i the loop\'s melee start waits on !isSwinging, so it cannot start (and relay) the same swing again',
  /\} else if \(!S\.isSwinging\) \{\s*S\.swingTimer = Date\.now\(\);/.test(MC));

/* ── 2. the held loop asks the stagger ── */
{
  const m = MC.match(/if \((!_lootSwingBlock && [^\n]*)\) \{\n/);
  check('2a the loop\'s inner gate is found', !!m);
  const gate = m && m[1];
  const run = (S) => vm.runInNewContext(gate, {
    S, Date, _lootSwingBlock: false, isPlayerDead: () => false,
    isStaggered: (s, now) => !!(s && s._staggerUntil && now < s._staggerUntil),
  });
  if (gate) {
    check('2b not staggered: the held attack goes on', run({}) === true);
    check('2c staggered by a parry: the held attack waits (the bug: it swung and sent)', run({ _staggerUntil: Date.now() + 800 }) === false);
    check('2d the stagger over: it goes on again', run({ _staggerUntil: Date.now() - 1 }) === true);
  }
  check('2e isStaggered is imported where the loop reads it', /import \{ isStaggered \} from '@\/game\/elemHits\.js'/.test(MC));
}

/* ── 3. a one-gem special carries its gem ── */
{
  const m = PJ.match(/var arrowElem = ([^;]*);/);
  check('3a the arrow\'s element line is found', !!m);
  const el = (activeWpn, isSpecial) => vm.runInNewContext(m[1], { activeWpn, a: { isSpecial } });
  if (m) {
    const one = { type: 'bow', element1: 'flame', element2: null };
    const two = { type: 'staff', element1: 'flame', element2: 'water' };
    check('3b a one-gem bow\'s special: its one gem (the bug: none)', el(one, true) === 'flame', el(one, true));
    check('3c a two-gem special: the second gem; an ordinary shot: the first',
      el(two, true) === 'water' && el(two, false) === 'flame' && el(one, false) === 'flame');
    check('3d ...the worker\'s own answer every time',
      [[one, true], [one, false], [two, true], [two, false]].every(([w, s]) => (el(w, s) || null) === weaponHitElement(w, s)));
    check('3e no weapon: no element, no throw', !el(null, true) && !el(undefined, false));
  }
}

/* ── 4. mana on a resonating collision only ── */
{
  const names = Object.keys(ELEMENTS);
  let pair = null;
  for (const a of names) for (const b of names) if (!pair && a !== b && lookupCollision(a, b)) pair = [a, b];
  check('4a a collision pair exists', !!pair);
  const rpg = { maxMana: 100, mana: 10, activeSlot: 'melee', weapon: { type: 'sword' } };
  const target = (remaining) => ({ statuses: { s1: { id: 's1', element: pair[0], appliedAt: 1, remaining, maxDur: 4000 } } });
  const now = 1e7;
  const me = {};
  const plain = resolveCollision(target(3900), pair[1], me, rpg, now);
  check('4b a plain collision: no mana, no "+N MP" (the bug: 4% and a popup the worker never paid)',
    plain && !plain.resonating && plain.manaRestored === 0 && rpg.mana === 10, plain && [plain.resonating, plain.manaRestored, rpg.mana]);
  check('4c ...and it does not use up the 3 s throttle', !me._lastCollisionMana, me._lastCollisionMana);
  const res = resolveCollision(target(200), pair[1], me, rpg, now + 100);
  check('4d a resonating one right after pays, as the worker does', res && res.resonating && res.manaRestored > 0 && rpg.mana > 10,
    res && [res.resonating, res.manaRestored, rpg.mana]);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
