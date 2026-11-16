/* ═══ v2.3.5521: THE GUARD'S PAGE DOOR -- ONE WRITER OF YOUR RAISED SHIELD (card L PR 5) ═══
 * (docs/specs/guard-door.md)
 *
 * Your shield on the phone is one field, `S._shieldUp` (down, or up),
 * written only by src/game/guardDoor.js guardTo, by a way of
 * GUARD_PAGE_WAYS (raise, drop).  Its rules are raiseShieldToggle's and
 * dropShield's own checks (`?guarddoor=0` lifts them).  This suite:
 *
 *   1. the door's own rules: each way's phase, up only from down with a
 *      shield in hand and out of the cooldown, down only from up, the
 *      switch;
 *   2. A SECOND WRITER FAILS: a write of `S._shieldUp` anywhere in src/
 *      outside guardTo (a peer's copy, shieldCopies.js `other._shieldUp`, is
 *      theirs); every way has its caller (shieldToggle.js raise and drop,
 *      playerActions.js's unused raise, held by its text: that module pulls
 *      in a .jsx node cannot load).  The phase table's guard reads the
 *      same off the syntax tree (tools/guards/phase-table.test.mjs §2,
 *      DOOR_SUITES);
 *   3. game/shieldToggle.js ITSELF, loaded here (its `@/` imports resolved
 *      to src/, pixi.js stubbed, .json read): a raise and its
 *      `player_shield up` to the worker, the swing it ends; a toggle down and
 *      its word; a raise in the cooldown, and with no shield, refused;
 *   4. step 1 changes nothing: a raise while up still answers true and says
 *      nothing more, a drop of none still says nothing, a raise in the
 *      water is still refused first.
 *
 * Break proof, tried by hand: `S._shieldUp = false;` put back in
 * dropShield -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { register } from 'node:module';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* the page's `@/` alias, pixi.js as a stub, and .json as a module, for
   shieldToggle.js and what it imports (ladder-passes.test's hook) */
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
     if (url.startsWith('file:') && url.endsWith('.json')) {
       const { readFileSync } = await import('node:fs');
       return { format: 'module', source: 'export default ' + readFileSync(new URL(url), 'utf8') + ';', shortCircuit: true };
     }
     return next(url, c);
   }`));

/* the art loaders some of the graph starts at import only warn here (no Image in node) */
const warn = console.warn, error = console.error;
const quiet = (f) => (...a) => { if (!/^\[fx-strips\]/.test(String(a[0]))) f(...a); };
console.warn = quiet(warn); console.error = quiet(error);

const { guardTo, guardPhase, GUARD_PAGE_WAYS } = await import(new URL('game/guardDoor.js', SRC).href);
const T = await import(new URL('game/shieldToggle.js', SRC).href);
const { setActionTransport } = await import(new URL('game/actions.js', SRC).href);

let clock = 1_900_000_000_000;
Date.now = () => clock;
const setSearch = (s) => { globalThis.location = { search: s }; };

/* ── 1. the door's own rules ── */
{
  check('1. the ways and their phases (the phase table\'s words)', JSON.stringify(GUARD_PAGE_WAYS) === JSON.stringify({ raise: 'up', drop: 'down' }));
  setSearch('');
  const S = { rpg: { shield: { key: 'wood' } }, _shieldUp: false };
  check('1. down at first, and a drop of none is refused', guardPhase(S) === 'down' && guardTo(S, 'drop', clock) === false && S._shieldUp === false);
  check('1. a raise: up', guardTo(S, 'raise', clock) === true && S._shieldUp === true && guardPhase(S) === 'up');
  check('1. ...and only from down', guardTo(S, 'raise', clock) === false && S._shieldUp === true);
  check('1. a drop: down', guardTo(S, 'drop', clock) === true && S._shieldUp === false);
  S._shieldCdUntil = clock + 2000;
  check('1. no raise in the cooldown a broken guard leaves', guardTo(S, 'raise', clock) === false && S._shieldUp === false);
  check('1. ...and one at its end', guardTo(S, 'raise', clock + 2000) === true && (guardTo(S, 'drop', clock), true));
  S._shieldCdUntil = 0;
  const N = { rpg: { shield: null }, _shieldUp: false };
  check('1. no raise with no shield in hand (v2.3.212)', guardTo(N, 'raise', clock) === false && guardTo({ _shieldUp: false }, 'raise', clock) === false);
  check('1. an unknown way, one off the prototype, or no state is refused',
    guardTo(S, 'nope', clock) === false && guardTo(S, 'toString', clock) === false && guardTo(null, 'raise', clock) === false);
  setSearch('?guarddoor=0');
  check('1. ?guarddoor=0: a raise with no shield, a raise over a raised one, a drop of none, as the old lines could have',
    guardTo(N, 'raise', clock) === true && guardTo(N, 'raise', clock) === true && (guardTo(N, 'drop', clock), guardTo(N, 'drop', clock)) === true && N._shieldUp === false);
  setSearch('');
}

/* ── 2. no second writer ── */
{
  const ROOT = new URL('../../', import.meta.url);
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) { if (n !== 'vendor' && n !== 'node_modules') walk(r + '/'); }
      else if (/\.(js|mjs|jsx)$/.test(n)) files.push(r);
    }
  })('src/');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const WRITE = /(?:\._shieldUp|\[\s*['"`]_shieldUp['"`]\s*\])\s*(?:\?\?|\|\||&&|\*\*|[-+*/%])?=(?!=)|delete\s+[\w$.]+\._shieldUp\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_shieldUp\s*:/;
  const outside = [];
  let doorWrites = 0, peers = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('_shieldUp')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/guardDoor.js') {
        if (/^export function guardTo\(S, way, now\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      /* a peer's copy of their guard (player_shield), not yours */
      if (f === 'src/game/shieldCopies.js' && /\bother\._shieldUp = up;/.test(l)) { peers++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. guardTo writes the guard (up, and down)', doorWrites === 2, doorWrites);
  check('2. no write of S._shieldUp in src/ outside guardTo (a peer\'s copy aside)', outside.length === 0 && peers === 1, { outside, peers });
  const code = (p) => strip(readFileSync(new URL(p, ROOT), 'utf8'));
  const ways = (src) => [...src.matchAll(/guardTo\(S,\s*'([a-z]+)'/g)].map((m) => m[1]).sort();
  const st = code('src/game/shieldToggle.js');
  check('2. shieldToggle.js asks raise (raiseShieldToggle) and drop (dropShield)', ways(st).join() === 'drop,raise', ways(st));
  const dsb = st.slice(st.indexOf('export function dropShield'));
  check('2. ...the drop in dropShield, after its own check', /if \(!S \|\| !S\._shieldUp\) return false;\s*\n\s*guardTo\(S, 'drop'\);/.test(dsb.slice(0, dsb.indexOf('\n}'))));
  check('2. playerActions.js\'s unused raise asks raise', ways(code('src/game/playerActions.js')).join() === 'raise');
}

/* ── 3 and 4. game/shieldToggle.js itself ── */
{
  const sent = [];
  /* the worker hears the page through the action door (actions.js act) */
  setActionTransport({ send: (m) => { sent.push(m); return true; } });
  /* its row is a relay: { type: 'broadcast', event: 'player_shield', payload } */
  const words = () => sent.filter((m) => m.type === 'player_shield' || m.event === 'player_shield').map((m) => (m.payload || m).up);
  const S = { myId: 'bp_me', rpg: { shield: { key: 'wood' }, hp: 100 }, player: { x: 0, y: 0 }, dmgNumbers: [], _shieldUp: false, isSwinging: true, autoAttack: true };
  check('3. a raise: up, the swing it ends, and `player_shield up` to the worker',
    T.raiseShieldToggle(S) === true && guardPhase(S) === 'up' && S.isSwinging === false && S.autoAttack === false && words().join() === 'true', { up: S._shieldUp, words: words() });
  check('4. a raise while up still answers true and says nothing more', T.raiseShieldToggle(S) === true && words().length === 1);
  check('3. a toggle: down, and its word', T.toggleShield(S) === false && guardPhase(S) === 'down' && S._shieldDroppedWhy === 'tap' && words().join() === 'true,false', words());
  check('4. a drop of none still says nothing', T.dropShield(S, 'tap') === false && words().length === 2);
  S._shieldCdUntil = clock + 2000;
  check('3. a raise in the cooldown is refused', T.raiseShieldToggle(S) === false && guardPhase(S) === 'down' && words().length === 2);
  clock += 2000;
  check('3. ...and at its end it goes up', T.raiseShieldToggle(S) === true && guardPhase(S) === 'up' && (T.dropShield(S, 'block'), guardPhase(S) === 'down') && S._shieldDroppedWhy === 'block');
  const N = { myId: 'bp_me', rpg: { shield: null }, player: { x: 0, y: 0 }, dmgNumbers: [], _shieldUp: false };
  check('3. no shield in hand: refused', T.raiseShieldToggle(N) === false && guardPhase(N) === 'down');
  const W = { myId: 'bp_me', rpg: { shield: { key: 'wood' } }, player: { x: 0, y: 0 }, dmgNumbers: [], _shieldUp: false, _wheelSwim: { on: true } };
  const n = sent.length;
  check('4. a raise in the water is still refused first (no block in the water)', T.raiseShieldToggle(W) === false && guardPhase(W) === 'down' && sent.length === n);
  setActionTransport(null);
}

console.log(`\nguard-page-door: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
