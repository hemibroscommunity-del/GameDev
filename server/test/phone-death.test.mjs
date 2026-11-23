/* THE PHONE NEVER DIES ON ITS OWN WORD -- v2.3.4363.
 *
 * The 2026-11-03 state-machine sweep (V2, U1-2): a fresh page warmed S.rpg
 * from a bt_rpg cache holding hp 0 (saved during the dying window), and the
 * loop's catch-all showed "YOU DIED" on the first frame, before the worker had
 * said anything; the worker's real death was then skipped as "already dying".
 * And two single-player "stand up again" copies (the catch-all in BroTown.jsx
 * and the client-local monster hit in gameEvents.js) skipped the steps the one
 * applyLocalRespawn does (freeing the zone's art, the npc list, the dungeon
 * flags, the target lock, the trip to the Wheel's BroTown, the cue and the chat
 * line), landed somewhere else, and took 10% off the gold SHOWN, which the
 * worker never takes.  The rules are src/game/phoneDeath.js; BroTown.jsx and
 * gameEvents.js are files node does not run, so their wiring is read from the
 * source:
 *   1. a cached hp of 0 warms to full; a living hp is left alone;
 *   2. the catch-all waits for the worker's word, and stays off where the
 *      worker runs the monsters or a death is already playing;
 *   3. BroTown's two warm starts heal a cached 0 after recalcDerived;
 *   4. the catch-all asks the rule, takes no gold, and stands up through
 *      applyLocalRespawn (no TOWN_SPAWN copy of its own);
 *   5. gameEvents' client-local death takes no gold and stands up through
 *      applyLocalRespawn (no 24 * TILE copy);
 *   6. the 20-second watchdog is untouched. */
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import * as D from '../../src/game/phoneDeath.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const bro = read('src/ui/BroTown.jsx');
const ge = read('src/networking/gameEvents.js');

/* v2.3.6520 (card WL, the shape review's plant 4a): "it takes no gold" was
   `!/coins\s*=/` over the block's text, and `S.rpg.coins -= Math.floor(
   S.rpg.coins * 0.1);` planted in the catch-all passed it (`-=` is not
   `coins =`).  Now any write to the purse is read off the syntax tree (the
   plan's rule 2): an assignment of any operator, `++` / `--`, `delete`, a
   destructuring target, `Object.assign` / `Reflect.set` /
   `Object.defineProperty`, through any receiver, and an object literal with
   a `coins` key (a record built with a purse in it).  Only a key held in a
   variable (`r[k] = `) cannot be read here: no rule can, short of running it.
   BREAK (tried 2026-11-23): BroTown.jsx: `S.rpg.coins -= Math.floor(S.rpg.coins * 0.1);`
   after `S.rpg._compStats.deaths++;` in the catch-all -> FAIL 4c; and each of
   `var _r = S.rpg; _r.coins--;`, `Object.assign(S.rpg, { coins: 0 });`,
   `S.rpg = { ...S.rpg, coins: 0 };`, `S.rpg['coins'] *= 0.9;`,
   `({ c: S.rpg.coins } = { c: 1 });` -> FAIL 4c; gameEvents.js: `R2.coins -= 5;`
   after `R2._compStats.deaths++;` in the client-local death -> FAIL 5c. */
let _babel = null;
for (const pkg of ['../package.json', '../../package.json']) {
  try {
    const req = createRequire(new URL(pkg, import.meta.url));
    const t = req('@babel/traverse');
    _babel = { parse: req('@babel/parser').parse, traverse: t.default || t };
    break;
  } catch { /* the next */ }
}
const _trees = new Map();
const PURSE = 'coins';
const keyText = (n) => (!n ? null : n.type === 'StringLiteral' ? n.value
  : (n.type === 'TemplateLiteral' && n.expressions.length === 0 ? n.quasis[0].value.cooked : null));
const propOf = (m) => (m && (m.type === 'MemberExpression' || m.type === 'OptionalMemberExpression')
  ? (!m.computed && m.property.type === 'Identifier' ? m.property.name : keyText(m.property)) : null);
const keyOf = (pr) => (pr && (pr.type === 'ObjectProperty' || pr.type === 'ObjectMethod')
  ? (!pr.computed && pr.key.type === 'Identifier' ? pr.key.name : keyText(pr.key)) : null);
/* every write to the purse in src[a, b): [{ line, text }] (null: no parser) */
function purseWrites(src, a, b) {
  if (!_babel) return null;
  let ast = _trees.get(src);
  if (!ast) { ast = _babel.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true }); _trees.set(src, ast); }
  const out = [];
  const inside = (n) => n.start >= a && n.end <= b;
  const hit = (n) => { if (inside(n)) out.push({ line: n.loc.start.line, text: src.slice(n.start, Math.min(n.end, n.start + 80)) }); };
  const targets = (n, acc) => {
    if (!n) return acc;
    if (n.type === 'MemberExpression') acc.push(n);
    else if (n.type === 'ObjectPattern') for (const pr of n.properties) targets(pr.type === 'RestElement' ? pr.argument : pr.value, acc);
    else if (n.type === 'ArrayPattern') for (const el of n.elements) targets(el, acc);
    else if (n.type === 'AssignmentPattern') targets(n.left, acc);
    else if (n.type === 'RestElement') targets(n.argument, acc);
    return acc;
  };
  _babel.traverse(ast, {
    AssignmentExpression(p) { if (targets(p.node.left, []).some((m) => propOf(m) === PURSE)) hit(p.node); },
    UpdateExpression(p) { if (propOf(p.node.argument) === PURSE) hit(p.node); },
    UnaryExpression(p) { if (p.node.operator === 'delete' && propOf(p.node.argument) === PURSE) hit(p.node); },
    'ForOfStatement|ForInStatement'(p) { if (targets(p.node.left, []).some((m) => propOf(m) === PURSE)) hit(p.node); },
    ObjectExpression(p) { if (p.node.properties.some((pr) => keyOf(pr) === PURSE)) hit(p.node); },
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== 'MemberExpression' || c.object.type !== 'Identifier') return;
      const who = c.object.name, how = propOf(c);
      if ((who === 'Object' && how === 'defineProperty') || (who === 'Reflect' && ['set', 'defineProperty', 'deleteProperty'].includes(how))) {
        if (keyText(p.node.arguments[1]) === PURSE) hit(p.node);
      }
    },
  });
  return out;
}

/* 1 */
{
  const r = { hp: 0, maxHp: 120 };
  check('1a a cached hp of 0 warms to maxHp', D.warmStartHp(r) === true && r.hp === 120, r);
  const n = { hp: -4, maxHp: 80 };
  check('1b ...and a negative one', D.warmStartHp(n) === true && n.hp === 80, n);
  const m = { maxHp: 50 };
  check('1c ...and a missing one', D.warmStartHp(m) === true && m.hp === 50, m);
  const a = { hp: 7, maxHp: 120 };
  check('1d a living hp is left as it was (a hurt player stays hurt)', D.warmStartHp(a) === false && a.hp === 7, a);
  const z = { hp: 0, maxHp: 0 };
  check('1e no maxHp, no change (nothing to fill to)', D.warmStartHp(z) === false && z.hp === 0);
  check('1f no rpg is no change', D.warmStartHp(null) === false);
}

/* 2 */
{
  const base = () => ({ rpg: { hp: 0 }, _serverMonsters: false, _rpgFromServer: true, _dying: false });
  check('2a hp 0 after the worker has spoken, off the worker\'s monsters: the catch-all runs', D.catchAllDies(base()) === true);
  const fresh = base(); fresh._rpgFromServer = false;
  check('2b a fresh page before the first player_state: never (the sweep\'s first-frame "YOU DIED")', D.catchAllDies(fresh) === false);
  const boot = base(); delete boot._rpgFromServer;
  check('2c ...nor at the boot warm start, where the flag is not set yet', D.catchAllDies(boot) === false);
  const srv = base(); srv._serverMonsters = true;
  check('2d where the worker runs the monsters it sends player_died itself: never', D.catchAllDies(srv) === false);
  const dy = base(); dy._dying = true;
  check('2e a death already playing: never', D.catchAllDies(dy) === false);
  const alive = base(); alive.rpg.hp = 1;
  check('2f alive: never', D.catchAllDies(alive) === false);
}

/* 3 */
{
  const imp = /import\s*\{[^}]*\bwarmStartHp\b[^}]*\bcatchAllDies\b[^}]*\}\s*from\s*'@\/game\/phoneDeath\.js'/.test(bro)
    || /import\s*\{[^}]*\bcatchAllDies\b[^}]*\bwarmStartHp\b[^}]*\}\s*from\s*'@\/game\/phoneDeath\.js'/.test(bro);
  check('3a BroTown imports the rules', imp);
  /* the boot initializer: the cache read, then recalcDerived, then the heal */
  const boot = bro.indexOf("return JSON.parse(localStorage.getItem('bt_rpg'));");
  const bootRecalc = boot >= 0 ? bro.indexOf('recalcDerived(S.rpg);', boot) : -1;
  const bootHeal = bootRecalc >= 0 ? bro.indexOf('warmStartHp(S.rpg)', bootRecalc) : -1;
  check('3b the boot warm start heals a cached 0 right after its recalcDerived', bootHeal > 0 && bootHeal - bootRecalc < 400, { boot, bootRecalc, bootHeal });
  /* joinTown's: _cachedRpg, recalcDerived, the heal, then setRpgState */
  const join = bro.indexOf("_cachedRpg = JSON.parse(localStorage.getItem('bt_rpg'));");
  const joinRecalc = join >= 0 ? bro.indexOf('recalcDerived(S.rpg);', join) : -1;
  const joinHeal = joinRecalc >= 0 ? bro.indexOf('warmStartHp(S.rpg)', joinRecalc) : -1;
  const joinSet = joinRecalc >= 0 ? bro.indexOf('setRpgState(', joinRecalc) : -1;
  check('3c joinTown\'s warm start heals it after recalcDerived and before it is shown', joinHeal > 0 && joinHeal < joinSet, { join, joinRecalc, joinHeal, joinSet });
}

/* 4: the catch-all block, from its banner to the npc spawn after it */
{
  const a = bro.indexOf('═══ Defensive death-flow catch ═══');
  const b = a >= 0 ? bro.indexOf('Re-initialize NPCs when entering town', a) : -1;
  const blk = a >= 0 && b > a ? bro.slice(a, b) : '';
  check('4a the catch-all block is found', blk.length > 0);
  check('4b it asks the rule (no hand copy of the condition)', /if\s*\(\s*catchAllDies\(S\)\s*\)/.test(blk) && !/!S\._serverMonsters\s*&&\s*S\.rpg\s*&&\s*S\.rpg\.hp\s*<=\s*0/.test(blk));
  const purse4 = a >= 0 && b > a ? purseWrites(bro, a, b) : [];
  check('4c it takes no gold (the worker never does): no write to the purse, read off the tree', purse4 !== null && purse4.length === 0
    && !/DEATH_GOLD_PENALTY/.test(blk) && !/'G'/.test(blk), purse4 === null ? '@babel loads from neither server/ nor the root (npm install)' : purse4);
  check('4d it stands up through applyLocalRespawn', /applyLocalRespawn\(S,\s*'town'\)/.test(blk));
  check('4e ...with no landing of its own (TOWN_SPAWN, generateZoneMap, its own player_respawned)',
    !/TOWN_SPAWN/.test(blk) && !/generateZoneMap/.test(blk) && !/event:\s*'player_respawned'/.test(blk));
  check('4f a stand-up the worker already did is not done twice', /if\s*\(\s*!S\._dying\s*\)\s*return;/.test(blk));
  check('4g it still says YOU DIED when it does run', /'YOU DIED'/.test(blk));
}

/* 5: gameEvents' client-local death */
{
  check('5a gameEvents imports applyLocalRespawn and refillPools',
    /import\s*\{\s*applyLocalRespawn\s*\}\s*from\s*'@\/game\/respawn\.js'/.test(ge) && /\brefillPools\b[^\n]*from\s*'@\/game\/phoneDeath\.js'/.test(ge));
  const a = ge.indexOf('Player death from client-local monster');
  const b = a >= 0 ? ge.indexOf("case 'player_hurt_by_monster':", a) : -1;
  const blk = a >= 0 && b > a ? ge.slice(a, b) : '';
  check('5b the client-local death block is found', blk.length > 0);
  const purse5 = a >= 0 && b > a ? purseWrites(ge, a, b) : [];
  check('5c it takes no gold: no write to the purse, read off the tree (v2.3.6520)', purse5 !== null && purse5.length === 0
    && !/DEATH_GOLD_PENALTY/.test(blk) && !/'G'/.test(blk), purse5 === null ? '@babel loads from neither server/ nor the root (npm install)' : purse5);
  check('5d it stands up through applyLocalRespawn', /applyLocalRespawn\(S,\s*'town'\)/.test(blk));
  check('5e ...with no landing of its own (24 * TILE, generateZoneMap, its own player_respawned)',
    !/24\s*\*\s*TILE/.test(blk) && !/generateZoneMap/.test(blk) && !/event:\s*'player_respawned'/.test(blk));
  check('5f a stand-up already done is not done twice', /if\s*\(\s*!S\._dying\s*\)\s*return;/.test(blk));
  check('5g gameEvents keeps no gold penalty anywhere', !/DEATH_GOLD_PENALTY/.test(ge));
}

/* 6: the watchdog, exactly as it stood (v2.3.1822) */
check('6a the 20-second watchdog is unchanged',
  bro.includes("if (S._dying && S._deathStart && (Date.now() - S._deathStart) > 20000\n            && S.rpg && S.rpg.hp > 0) {\n          try { applyLocalRespawn(S, 'town'); } catch (e) { dyingTo(S, 'respawn'); }"));   /* v2.3.5534: its fallback through the life's page door */

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nphone-death: all passed');
