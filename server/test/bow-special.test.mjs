/* ═══ v2.3.6557: THE BOW'S SPECIAL AT ONCE (card CT part 23, PR 2) ═══
 * In the two buttons (`?manual=5`) a press of Special with the bow and a
 * monster to take (the latch's lock, else the one a press of Attack would
 * take now: latch.js sightNow) shoots the special at it NOW, the latch taking
 * it as Attack's press would; with nothing to take it is readied for 2.5 s as
 * before (playerActions.js specialAttack's queue).  The sword's and the
 * staff's specials, and the other modes, are untouched; `?specialnow=0`
 * gives the queue back.  game/bowSpecialNow.js.
 *
 * The card's plants, each red here:
 *   firing with nothing to take          -> 3b, 1
 *   readying with a monster to take      -> 3a, 2
 *   spending twice (the queue AND the shot) -> 3a, 3c
 *   the sword's (or the staff's) special changed -> 3d, 1
 *   the switch not giving the queue back -> 3e, 1
 * It drives the real specialAttack (the page's `@/` alias and pixi.js as a
 * stub, guard-page-door.test's hook), so a plant in playerActions.js's calls
 * is caught as well as one in the module. */
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

const B = await import(new URL('game/bowSpecialNow.js', SRC).href);
const { specialAttack } = await import(new URL('game/playerActions.js', SRC).href);
const { setActionTransport } = await import(new URL('game/actions.js', SRC).href);
const { setManualCombat } = await import(new URL('game/manualCombat.js', SRC).href);
const L = await import(new URL('game/latch.js', SRC).href);

let clock = 1_900_000_000_000;
Date.now = () => clock;
const sent = [];
setActionTransport({ send: (m) => { sent.push(m); return true; } });

/* ── 1. the choice (pure) ── */
{
  const P = B.bowSpecialPick;
  check('1. the bow, mode 5, the switch on: the lock first', P(true, 'ranged', 'bow', true, 'a', 'b') === 'a');
  check('1. ...no lock: the sighting', P(true, 'ranged', 'bow', true, null, 'b') === 'b' && P(true, 'ranged', 'bow', true, '', 'b') === 'b' && P(true, 'ranged', 'bow', true, undefined, 'b') === 'b');
  check('1. ...an id 0 is an id (lock and sighting)', P(true, 'ranged', 'bow', true, 0, 'b') === 0 && P(true, 'ranged', 'bow', true, null, 0) === 0);
  check('1. nothing to take: null (the queue)', P(true, 'ranged', 'bow', true, null, null) === null && P(true, 'ranged', 'bow', true, '', '') === null && P(true, 'ranged', 'bow', true, undefined, undefined) === null);
  check('1. the sword\'s and the staff\'s special: null', P(true, 'melee', 'sword', true, 'a', 'b') === null && P(true, 'staff', 'staff', true, 'a', 'b') === null && P(true, undefined, 'bow', true, 'a', 'b') === null && P(true, 'melee', 'bow', true, 'a', 'b') === null);
  check('1. a ranged slot with no bow (the sword it falls back to): null', P(true, 'ranged', 'sword', true, 'a', 'b') === null && P(true, 'ranged', undefined, true, 'a', 'b') === null);
  check('1. off the two buttons: null', P(false, 'ranged', 'bow', true, 'a', 'b') === null && P(1, 'ranged', 'bow', true, 'a', 'b') === null);
  check('1. the switch thrown: null', P(true, 'ranged', 'bow', false, 'a', 'b') === null && P(true, 'ranged', 'bow', 1, 'a', 'b') === null);
}

/* ── 2. the switch ── */
check('2. on by default, off only at ?specialnow=0', B.specialNowOn('') === true && B.specialNowOn('?specialnow=0') === false && B.specialNowOn('?specialnow=1') === true && B.specialNowOn('?nearpick=0') === true);
setSearch('?specialnow=0');
check('2. ...and the page\'s own address is read', B.specialNowOn() === false);
setSearch('');
check('2. ...back on', B.specialNowOn() === true);

/* ── 3. the press, end to end (the real specialAttack) ── */
const mon = (id, x, y = 0) => ({ id, x, y, alive: true, curHp: 50, maxHp: 50, level: 1 });
const bow = { id: 'w1', type: 'bow', tier: 'common', name: 'Bow' };
const sword = { id: 'w2', type: 'sword', tier: 'common', name: 'Sword' };
const staff = { id: 'w3', type: 'staff', tier: 'common', name: 'Staff' };
function page(slot, mons) {
  return {
    myId: 'me', currentZone: 'wheel', player: { x: 0, y: 0, vx: 0, vy: 0 }, _renderFacing: 'east', _facingAngle: 0,
    camera: { x: -400, y: -300 }, _viewW: 800, _viewH: 600,
    monsters: mons, arrows: [], projectiles: [], others: {},
    rpg: { level: 10, activeSlot: slot, weapon: sword, rangedWeapon: bow, staffWeapon: staff, mana: 100, maxMana: 100, stats: {}, buildUses: {} },
  };
}
function press(S) {
  sent.length = 0;
  let err = null;
  try { specialAttack(S); } catch (e) { err = e; }
  const uses = sent.filter((m) => m && (m.type === 'ability_use' || m.event === 'ability_use' || (m.payload && m.payload.type === 'swipe'))).length;
  return { err: err && String(err.stack || err).slice(0, 300), uses, all: sent.map((m) => m.type + ':' + (m.event || '')), mana: S.rpg.mana, queued: S._bowSpecialQueued || 0, swipe: S._lastSwipe || 0, arrows: S.arrows.length };
}
function sighted(S) { L.latchFrame(S, clock, false, S.rpg.activeSlot, 1, S._viewW, S._viewH); }
setManualCombat(5);
{
  /* a. a monster in the pick, the drawn line on nothing (no _bowSight): it flies NOW */
  const S = page('ranged', [mon('g', 300, 90)]);
  sighted(S);
  check('3a. the pick has the monster (sightNow) and the latch is idle', (L.sightNow(S) || {}).id === 'g' && L.latchPhase(S) === 'idle');
  check('3a. bowSpecialMon finds it', B.bowSpecialMon(S, bow) === S.monsters[0]);
  const r = press(S);
  check('3a. ONE press: the special leaves at once (an ability_use, its arrows), not readied', !r.err && r.uses === 1 && r.arrows > 0 && r.queued === 0, r);
  check('3a. mana spent once, the cooldown started', r.mana < 100 && r.swipe === clock, r);
  check('3a. the latch took it as Attack\'s press would (a tap\'s lock)', L.latchPhase(S) === 'active' && S._latchId === 'g');
  const ang = S.arrows[0] && S.arrows[0].ang;
  check('3a. the arrows fly along the line to it, not the way the body faced (east)', typeof ang === 'number' && Math.abs(ang - Math.atan2(90, 300)) < 0.08, ang);
  const mana1 = S.rpg.mana;
  clock += 50;
  const r2 = press(S);
  check('3a. a second press in the cooldown spends nothing and readies nothing (never the queue AND the shot)', r2.uses === 0 && r2.mana === mana1 && r2.queued === 0, r2);
  clock += 2000;
  const r3 = press(S);
  check('3a. after the cooldown, with the lock: at once again, the lock kept', r3.uses === 1 && r3.queued === 0 && L.latchPhase(S) === 'active' && S._latchId === 'g', r3);
}
{
  /* a2. the lock first: locked on one, another nearer in the pick */
  clock += 5000;
  const S = page('ranged', [mon('far', 500), mon('near', 200)]);
  sighted(S); L.latchTo(S, 'active', 'far');
  check('3a2. the lock first, the nearer sighting after it', B.bowSpecialMon(S, bow) === S.monsters[0] && (L.sightNow(S) || {}).id === 'near');
  const r = press(S);
  check('3a2. ...the special flies at the lock, which stays', r.uses === 1 && S._latchId === 'far' && L.latchPhase(S) === 'active', r);
}
{
  /* b. nothing to take: readied as before, nothing spent */
  clock += 5000;
  const S = page('ranged', [mon('behind', -300)]);
  sighted(S);
  check('3b. nothing in the pick', L.sightNow(S) === null && B.bowSpecialMon(S, bow) === null);
  const r = press(S);
  check('3b. readied for 2.5 s, nothing sent, nothing spent', r.queued === clock && r.uses === 0 && r.mana === 100 && r.swipe === 0 && r.arrows === 0, r);
  check('3b. ...and the latch untouched', L.latchPhase(S) === 'idle');
}
{
  /* c. a monster to take after one readied: it fires and the request goes (spent once) */
  clock += 5000;
  const S = page('ranged', []);
  sighted(S);
  press(S);
  check('3c. readied first (nothing to take)', S._bowSpecialQueued === clock);
  S.monsters.push(mon('g', 250));
  sighted(S);
  clock += 100;
  const r = press(S);
  check('3c. a press with a monster now: at once, and the readied one is consumed', r.uses === 1 && r.queued === 0 && r.mana < 100, r);
}
/* the outcome of a press with the module's path off, to hold the others to */
function outcome(slot, search, mode) {
  setSearch(search); setManualCombat(mode);
  clock += 5000;
  const S = page(slot, [mon('g', 300)]);
  sighted(S);
  const r = press(S);
  const o = { uses: r.uses, all: r.all.join(','), mana: r.mana, queued: r.queued ? 1 : 0, swipe: r.swipe ? 1 : 0, arrows: r.arrows, latch: L.latchPhase(S), id: S._latchId || null, err: !!r.err };
  setSearch(''); setManualCombat(5);
  return o;
}
{
  /* d. the sword's and the staff's specials: as with the switch off */
  const s1 = outcome('melee', '', 5), s0 = outcome('melee', '?specialnow=0', 5);
  check('3d. the sword\'s special: the same with or without the switch, and no lock taken', JSON.stringify(s1) === JSON.stringify(s0) && s1.latch === 'idle' && !s1.err, [s1, s0]);
  const t1 = outcome('staff', '', 5), t0 = outcome('staff', '?specialnow=0', 5);
  check('3d. the staff\'s special: the same, no lock taken', JSON.stringify(t1) === JSON.stringify(t0) && t1.latch === 'idle' && !t1.err, [t1, t0]);
}
{
  /* e. ?specialnow=0: the queue back */
  const o = outcome('ranged', '?specialnow=0', 5);
  check('3e. ?specialnow=0, a monster to take: readied, nothing spent, no lock', o.queued === 1 && o.uses === 0 && o.mana === 100 && o.latch === 'idle', o);
  /* f. the other modes: as before */
  const m4 = outcome('ranged', '', 4);
  check('3f. mode 4, a monster about: readied as before', m4.queued === 1 && m4.uses === 0 && m4.latch === 'idle', m4);
  mq.matches = true;
  const mouse = outcome('ranged', '', 5);
  mq.matches = false;
  check('3f. a mouse on a touch screen (the gate shut): readied as before', mouse.queued === 1 && mouse.uses === 0 && mouse.latch === 'idle', mouse);
}

/* ── 4. bowSpecialTake ── */
{
  const S = page('ranged', [mon('a', 200)]);
  check('4. no state, no monster: null', B.bowSpecialTake(null, S.monsters[0]) === null && B.bowSpecialTake(S, null) === null && B.bowSpecialTake(S, { x: 1 }) === null);
  check('4. idle: takes it (a tap\'s lock)', B.bowSpecialTake(S, S.monsters[0]) === 'lock' && L.latchPhase(S) === 'active' && S._latchId === 'a');
  check('4. locked: keeps the lock', B.bowSpecialTake(S, { id: 'z' }) === null && S._latchId === 'a' && L.latchPhase(S) === 'active');
  L.latchTo(S, 'auto', 'a');
  check('4. auto-attack on: the take never lets it go (a press on auto would)', B.bowSpecialTake(S, S.monsters[0]) === null && L.latchPhase(S) === 'auto' && S._latchId === 'a');
  setSearch('?holdauto=0');
  const T = page('ranged', [mon('a', 200)]);
  check('4. ?holdauto=0: the lock is auto at once, as Attack\'s press', B.bowSpecialTake(T, T.monsters[0]) === 'lock' && L.latchPhase(T) === 'auto');
  setSearch('');
  check('4. bowSpecialMon: no state or no character, null', B.bowSpecialMon(null, bow) === null && B.bowSpecialMon({ player: { x: 0, y: 0 } }, bow) === null);
  const U = page('ranged', [mon('a', 200)]); sighted(U); U.monsters.length = 0;
  check('4. bowSpecialMon: a picked id no longer in the list, null', B.bowSpecialMon(U, bow) === null);
  const N = page('ranged', [mon(7, 200)]); sighted(N); L.latchTo(N, 'active', '7');
  const X = page('ranged', [mon('a', 200)]); sighted(X); L.latchTo(X, 'active', 'a'); X.monsters = null;
  check('4. bowSpecialMon: no monster list, null (no throw)', B.bowSpecialMon(X, bow) === null);
  check('4. bowSpecialMon: a ranged slot holding the sword, null', B.bowSpecialMon(page('ranged', [mon('a', 200)]), sword) === null);
  const H = page('ranged', [mon(null, -300)]); sighted(H);
  check('4. bowSpecialMon: nothing to take finds no monster, not even one with no id', B.bowSpecialMon(H, bow) === null);
  check('4. bowSpecialMon: no weapon, null', B.bowSpecialMon(page('ranged', [mon('a', 200)])) === null);
  const G = page('ranged', [null, mon('a', 200)]); sighted(G);
  check('4. bowSpecialMon: a hole in the list is passed over', B.bowSpecialMon(G, bow) === G.monsters[1]);
  check('4. bowSpecialMon: a number id matches its string (the wire)', B.bowSpecialMon(N, bow) === N.monsters[0]);
}

delete globalThis.window.matchMedia;
console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
