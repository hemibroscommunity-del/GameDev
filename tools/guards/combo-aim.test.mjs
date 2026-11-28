/* ═══ v2.3.6650: THE COMBO GOES AT THE LAST TARGET (card PAD part 14; src/game/comboAim.js) ═══
 *
 * The owner, 2026-11-28: "Also for combos it's hard to have to tap the
 * button and aim at the same time.  Just make the combo auto-attack the last
 * target.  If the line of site is lined up just make the combo be first
 * attack".  In the two buttons (`?manual=5`) with a bow or a staff (the
 * Attack disc a stick, card PAD part 13) a Special pressed with the thumb off
 * the disc goes at the last target, else at the lined-up monster.  Played on
 * the module and on the REAL specialAttack (bow-special.test's loader: the
 * page's `@/` alias, pixi.js and the .jsx files as stubs):
 *
 *   1. THE CHOICE (comboPick): the last target first, else the lined-up one;
 *      a thumb aiming, the switch off, or off the stick: null (today's);
 *   2. THE SWITCH: `?comboaim=0` off and REMEMBERED; absent reads the memory;
 *      `=1` forgets it;
 *   3. THE LAST TARGET (lastTarget): the newest hit of yours, within LAST_MS,
 *      alive, in reach, in view; the next newest is never taken;
 *   4. THE BOW, end to end: a monster you hit NE of a bro facing WEST: ONE
 *      press, the volley leaves at once toward it, nothing locked;
 *   5. a thumb aiming the disc wins: today's road (the queue);
 *   6. the last target dead (or its hit too old): today's road;
 *   7. LINED UP, nothing hit yet: the special is the first attack, at it;
 *   8. THE STAFF: its big bolt leaves toward the last target, not the facing;
 *   9. `?comboaim=0`: today's, the bow's queue and the staff's facing;
 *  10. the sword (the latch) and the other schemes: comboMon null.
 *
 * Break proof, tried by hand (v2.3.6650): playerActions.js's comboMon call
 * dropped -> FAIL 4, 7, 8; comboPick's `aiming === true` dropped -> FAIL 1,
 * 5; lastTarget's age test dropped -> FAIL 3, 6; bowSpecialTake's stick
 * return dropped -> FAIL 4 (a lock taken); comboAimOn's memory read dropped
 * -> FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { register } from 'node:module';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* the page's `@/` alias, pixi.js as a stub, and .json as a module
   (guard-page-door.test's hook) */
const SRC = new URL('../../src/', import.meta.url);
const pixiNames = new Set();
(function walk(d) {
  for (const f of readdirSync(d)) {
    const u = new URL(f, d);
    if (statSync(u).isDirectory()) walk(new URL(f + '/', d));
    else if (/\.(js|jsx|mjs)$/.test(f)) {
      for (const m of readFileSync(u, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]pixi\.js['"]/g)) {
        for (const x of m[1].split(',')) { const k = x.trim().split(/\s+as\s+/)[0].trim(); if (/^[A-Za-z_$][\w$]*$/.test(k)) pixiNames.add(k); }
      }
    }
  }
})(SRC);
const PIXI_STUB = 'const P = new Proxy(function () {}, { get: (t, k) => (k === "prototype" ? t.prototype : k === Symbol.toPrimitive ? () => 0 : (typeof k === "symbol" ? undefined : P)), apply: () => P, construct: () => ({}) });\nexport default P;\n'
  + [...pixiNames].map((n) => `export const ${n} = P;`).join('\n');
register('data:text/javascript,' + encodeURIComponent(
  `export async function resolve(s, c, next) {
     if (s === 'pixi.js') return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(PIXI_STUB)}), shortCircuit: true };
     if (s.startsWith('@/')) { let u = ${JSON.stringify(SRC.href)} + s.slice(2); if (!/\\.[a-z]+$/.test(u)) u += '.js'; return next(u, c); }
     return next(s, c);
   }
   export async function load(url, c, next) {
     if (url.startsWith('file:') && url.endsWith('.jsx')) {
       /* the page's React files: a stub with their export names (specialAttack's
          graph reaches a few overlays; none runs here) */
       const { readFileSync } = await import('node:fs');
       const t = readFileSync(new URL(url), 'utf8');
       const names = new Set();
       for (const m of t.matchAll(/export\\s+(?:async\\s+)?(?:function\\*?|const|let|var|class)\\s+([A-Za-z_$][\\w$]*)/g)) names.add(m[1]);
       for (const m of t.matchAll(/export\\s*\\{([^}]*)\\}/g)) for (const x of m[1].split(',')) { const k = x.trim().split(/\\s+as\\s+/).pop().trim(); if (/^[A-Za-z_$][\\w$]*$/.test(k)) names.add(k); }
       const src = 'const P = function () { return null; };\\nexport default P;\\n' + [...names].filter((n) => n !== 'default').map((n) => 'export const ' + n + ' = P;').join('\\n');
       return { format: 'module', source: src, shortCircuit: true };
     }
     if (url.startsWith('file:') && url.endsWith('.json')) {
       const { readFileSync } = await import('node:fs');
       return { format: 'module', source: 'export default ' + readFileSync(new URL(url), 'utf8') + ';', shortCircuit: true };
     }
     return next(url, c);
   }`));

const warn = console.warn, error = console.error;
const quiet = (f) => (...a) => { if (!/^\[fx-strips\]/.test(String(a[0]))) f(...a); };
console.warn = quiet(warn); console.error = quiet(error);

/* the device: a touch screen (deviceProfile reads the pointer's MediaQueryList) */
const mq = { matches: false };
globalThis.window = globalThis.window || {};
globalThis.window.matchMedia = () => mq;
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');



const C = await import(new URL('game/comboAim.js', SRC).href);
const { specialAttack } = await import(new URL('game/playerActions.js', SRC).href);
const { setActionTransport } = await import(new URL('game/actions.js', SRC).href);
const { setManualCombat } = await import(new URL('game/manualCombat.js', SRC).href);
const L = await import(new URL('game/latch.js', SRC).href);
const R = await import(new URL('game/rangedStick.js', SRC).href);

let clock = 1_900_000_000_000;
Date.now = () => clock;
const sent = [];
setActionTransport({ send: (m) => { sent.push(m); return true; } });

/* a Storage stand-in (the phone's memory) */
function store() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; }
const LS = store();
globalThis.localStorage = LS;

/* ── 1. the choice ── */
{
  const P = C.comboPick;
  check('1. the last target first', P(true, true, false, 'a', 'b') === 'a');
  check('1. ...none: the lined-up one (the first attack)', P(true, true, false, null, 'b') === 'b' && P(true, true, false, '', 'b') === 'b');
  check('1. ...an id 0 is an id', P(true, true, false, 0, 'b') === 0 && P(true, true, false, null, 0) === 0);
  check('1. nothing: null (today\'s road)', P(true, true, false, null, null) === null);
  check('1. a thumb aiming the disc wins: null', P(true, true, true, 'a', 'b') === null);
  check('1. the switch off, or off the stick: null; a truthy stand-in is no', P(true, false, false, 'a', 'b') === null && P(false, true, false, 'a', 'b') === null && P(1, true, false, 'a', 'b') === null && P(true, 1, false, 'a', 'b') === null);
}

/* ── 2. the switch, remembered ── */
{
  const s = store();
  check('2. on by default', C.comboAimOn('', s) === true && C.comboAimOn('?comboaim=1', s) === true && C.comboAimOn('?xcomboaim=0', s) === true);
  check('2. `?comboaim=0` is off and remembered', C.comboAimOn('?comboaim=0', s) === false && s.getItem('bt_comboaim') === '0');
  check('2. ...the next address without it still off (the memory)', C.comboAimOn('', s) === false);
  check('2. `?comboaim=1` forgets it', C.comboAimOn('?comboaim=1', s) === true && s.getItem('bt_comboaim') === null && C.comboAimOn('', s) === true);
  check('2. no memory at all: the address alone', C.comboAimOn('?comboaim=0', null) === false && C.comboAimOn('', null) === true);
}

/* ── 3. the last target ── */
const mon = (id, x, y = 0, hitAt) => { const m = { id, x, y, alive: true, curHp: 50, maxHp: 50, level: 1 }; if (hitAt != null) m._hitByMeAt = hitAt; return m; };
{
  const me = { x: 0, y: 0 }, now = 1000000, V = null;
  const A = mon('a', 200, 0, now - 3000), B = mon('b', -200, 0, now - 1000);
  check('3. the newest hit of yours', C.lastTarget([A, B], me, 500, now, V) === B);
  check('3. ...never hit: none', C.lastTarget([mon('c', 100)], me, 500, now, V) === null);
  const old = mon('o', 100, 0, now - C.COMBO_AIM.LAST_MS - 1);
  check('3. a hit older than LAST_MS: none (and LAST_MS is 8 s)', C.lastTarget([old], me, 500, now, V) === null && C.COMBO_AIM.LAST_MS === 8000);
  const dead = mon('d', 100, 0, now - 100); dead.curHp = 0;
  check('3. the newest dead: none, the next newest NOT taken', C.lastTarget([A, dead], me, 500, now, V) === null);
  const gone = mon('g', 100, 0, now - 100); gone.alive = false;
  check('3. ...gone (not alive): none', C.lastTarget([gone], me, 500, now, V) === null);
  check('3. out of reach: none', C.lastTarget([mon('f', 900, 0, now - 100)], me, 500, now, V) === null);
  check('3. out of view: none; in view: it', C.lastTarget([mon('v', 300, 0, now - 100)], me, 500, now, { x: -100, y: -100, w: 200, h: 200 }) === null && !!C.lastTarget([mon('v', 50, 0, now - 100)], me, 500, now, { x: -100, y: -100, w: 200, h: 200 }));
}

/* ── the page ── */
const bow = { id: 'w1', type: 'bow', tier: 'common', name: 'Bow' };
const sword = { id: 'w2', type: 'sword', tier: 'common', name: 'Sword' };
const staff = { id: 'w3', type: 'staff', tier: 'common', name: 'Staff' };
/* a bro at the origin facing WEST: whatever goes east-ish went at a monster, not the facing */
function page(slot, mons, face) {
  const S = {
    myId: 'me', currentZone: 'wheel', player: { x: 0, y: 0, vx: 0, vy: 0 },
    _renderFacing: face || 'west', _facingAngle: face === 'east' ? 0 : Math.PI, _facing: face === 'east' ? 'right' : 'left',
    camera: { x: -400, y: -300 }, _viewW: 800, _viewH: 600,
    monsters: mons, arrows: [], projectiles: [], others: {},
    rpg: { level: 10, activeSlot: slot, weapon: sword, rangedWeapon: bow, staffWeapon: staff, mana: 100, maxMana: 100, stats: {}, buildUses: {} },
  };
  R.discFrame(S, clock, false, slot, 1, 800, 600);   /* the step input: the disc's kind made current */
  return S;
}
function press(S) {
  sent.length = 0;
  let err = null;
  try { specialAttack(S); } catch (e) { err = e; }
  const uses = sent.filter((m) => m && (m.type === 'ability_use' || m.event === 'ability_use' || (m.payload && m.payload.type === 'swipe'))).length;
  return { err: err && String(err.stack || err).slice(0, 300), uses, mana: S.rpg.mana, queued: S._bowSpecialQueued || 0, arrows: S.arrows.length, proj: S.projectiles.length, lock: L.latchPhase(S) };
}
const offAng = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const NE = Math.atan2(-200, 200);
setManualCombat(5);
globalThis.location = { search: '' };

{
  const S = page('ranged', [mon('t', 200, -200, clock - 2000)]);
  check('4. the bow in the two buttons is a stick', R.discKind(S) === 'stick');
  check('4. comboMon finds the last target', C.comboMon(S, 1, clock) === S.monsters[0]);
  const r = press(S);
  check('4. ONE press: the volley leaves at once, nothing readied, mana spent', !r.err && r.uses === 1 && r.arrows > 0 && r.queued === 0 && r.mana < 100, r);
  const ang = S.arrows[0] && S.arrows[0].ang;
  check('4. ...toward the last target (north-east), not the facing (west)', typeof ang === 'number' && offAng(ang, NE) < 0.1, ang);
  check('4. ...and nothing locked (the stick keeps none)', r.lock === 'idle' && S._latchId == null, r);
}
{
  clock += 5000;
  const S = page('ranged', [mon('t', 200, -200, clock - 2000)]);
  S._aiming = true; S._aimSrc = 'stick'; S._aimAngle = Math.PI / 2; S._lastAimAngle = Math.PI / 2;
  check('5. a thumb aiming the disc: comboMon null', C.comboMon(S, 1, clock) === null);
  const r = press(S);
  check('5. ...today\'s road: the bow\'s special readied along the aim, nothing sent', r.uses === 0 && r.queued === clock && r.arrows === 0, r);
}
{
  clock += 5000;
  const d = mon('t', 200, -200, clock - 2000); d.curHp = 0;
  const S = page('ranged', [d]);
  const r = press(S);
  check('6. the last target dead: today\'s road (readied, nothing sent)', C.comboMon(S, 1, clock) === null && r.uses === 0 && r.queued === clock, r);
  clock += 5000;
  const S2 = page('ranged', [mon('t', 200, -200, clock - 9000)]);
  check('6. ...its hit older than 8 s: today\'s road', C.comboMon(S2, 1, clock) === null && press(S2).queued === clock);
}
{
  clock += 5000;
  /* facing west, a monster lined up 300 px west and a little north, never hit */
  const S = page('ranged', [mon('w', -300, -40)]);
  const m = C.comboMon(S, 1, clock);
  check('7. lined up, nothing hit yet: comboMon takes it', m === S.monsters[0]);
  const r = press(S);
  const ang = S.arrows[0] && S.arrows[0].ang;
  check('7. ...the special is the first attack, at once, at it', !r.err && r.uses === 1 && r.queued === 0 && typeof ang === 'number' && offAng(ang, Math.atan2(-40, -300)) < 0.1, { r, ang });
  clock += 5000;
  const S2 = page('ranged', [mon('e', 300, 0)]);   /* behind the bro: not lined up */
  check('7. a monster behind, never hit: nothing (today\'s road)', C.comboMon(S2, 1, clock) === null);
}
function shotAng(S) {
  const p = S.projectiles[S.projectiles.length - 1] || S.arrows[S.arrows.length - 1];
  if (!p) return null;
  if (typeof p.ang === 'number') return p.ang;
  if (typeof p.angle === 'number') return p.angle;
  if (typeof p.vx === 'number' && typeof p.vy === 'number') return Math.atan2(p.vy, p.vx);
  if (typeof p.dx === 'number' && typeof p.dy === 'number') return Math.atan2(p.dy, p.dx);
  return null;
}
{
  clock += 5000;
  const S = page('staff', [mon('t', 200, -200, clock - 2000)]);
  check('8. the staff in the two buttons is a stick too', R.discKind(S) === 'stick' && C.comboMon(S, 1, clock) === S.monsters[0]);
  const r = press(S);
  const ang = shotAng(S);
  check('8. the staff\'s special leaves toward the last target, not the facing', !r.err && r.uses === 1 && typeof ang === 'number' && offAng(ang, NE) < 0.1, { r, ang });
  check('8. ...and nothing locked', r.lock === 'idle');
}
{
  clock += 5000;
  globalThis.location = { search: '?comboaim=0' };
  const S = page('ranged', [mon('t', 200, -200, clock - 2000)]);
  check('9. `?comboaim=0`: comboMon null', C.comboMon(S, 1, clock) === null);
  const r = press(S);
  check('9. ...the bow\'s special readied as before', r.uses === 0 && r.queued === clock, r);
  clock += 5000;
  globalThis.location = { search: '' };   /* remembered: still off */
  const S2 = page('staff', [mon('t', 200, -200, clock - 2000)]);
  const r2 = press(S2);
  const ang = shotAng(S2);
  check('9. ...remembered: the staff\'s special along the facing (west), as before', C.comboMon(S2, 1, clock) === null && r2.uses === 1 && typeof ang === 'number' && offAng(ang, Math.PI) < 0.1, { r2, ang });
  globalThis.location = { search: '?comboaim=1' };
  C.comboAimOn();
  globalThis.location = { search: '' };
  check('9. `?comboaim=1` brings it back', C.comboAimOn() === true && LS.getItem('bt_comboaim') === null);
}
{
  clock += 5000;
  const S = page('melee', [mon('t', 200, -200, clock - 2000)]);
  check('10. the sword (the latch): comboMon null, its special the latch\'s as ever', R.discKind(S) === 'latch' && C.comboMon(S, 1, clock) === null);
  setManualCombat(4);
  const S4 = page('ranged', [mon('t', 200, -200, clock - 2000)]);
  check('10. mode 4 (not the two buttons): comboMon null', C.comboMon(S4, 1, clock) === null);
  setManualCombat(5);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
