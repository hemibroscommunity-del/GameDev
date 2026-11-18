/* ═══ v2.3.5941: TRAPS INTO GUARDS, COMBAT, ONE CASE TO THE RULE (card V4 PR 2) ═══
 *
 * Grand plan step 8.2, card V4's second batch (the form: tools/guards/README.md,
 * "A trap held").  Each trap here was held by a node suite for ONE case (its
 * row in docs/plan/census/traps.md); this guard holds its RULE, wherever the
 * trap could come back.  It reads BroTown.jsx and src/rendering/ (the code of
 * every page file is scanned) and changes nothing.
 *
 * TRAPS §5 (the rule): every away or grace clock the worker writes (a field named away/grace) is keyed by a player (`x.away[pid]`, `meta[pid].awaySince`, a player's own state), and a record's away field is a map (`Object.create(null)`), never one slot (`awayId`, `graceUntil`), in all of server/src. Break: server/src/duel.js: the duel's `away: Object.create(null)` made `awayId: null, graceUntil: 0` -> FAIL (tried 2026-11-17).
 * TRAPS §19 (the rule): every way `_pvpAllowed` says yes but consent (a duel, the arena, a spar pair) refuses two players of one party first, its own lawless branch and each function it hands the yes to (`_nmlAllowed`). Break: server/src/index.js: `return true` before the `_partyOf` comparison in _pvpAllowed's lawless branch -> FAIL (tried 2026-11-17).
 * TRAPS §24 (the rule): the AFK clock (`.lastRecv`) is stamped only in the router's chain, which names its heartbeats; every message the page sends on a timer (a `setInterval`, followed two calls deep) is one the chain excludes or judges by content, today's others listed; the sweep's close code is one the page does not reconnect on. Break: server/src/index.js: the chain's first branch `msg.type === 'pong' || msg.type === 'report'` made `msg.type === 'report'` -> FAIL (tried 2026-11-17).
 * TRAPS §101 (the rule): sweepBlockPoint stops a flight stepped through ANY box (every prop of every zone with props, and made-up boxes 4 to 60 px deep, at 4 to 60 px a step, four ways); and the whole-line forms (`attackBlockPoint`, `attackBlocked`) have a closed list of callers, each a whole line asked once. Break: src/data/worldProps.js sweepBlockPoint: also skip a box when the step ENDS inside it -> FAIL (tried 2026-11-17).
 * TRAPS §151 (the rule): in `_handlePlayerDeath` the duel's hook runs first and every hook after it that is a kill's consequence is gated on `_duelKill` (an if, a ternary, or a block it guards); the hooks a duel kill runs too are listed. Break: server/src/index.js _handlePlayerDeath: `_hook('war', ...)` without the `if (!_duelKill)` in front -> FAIL (tried 2026-11-17).
 * TRAPS §157 (the rule): no loop in server/src that pushes onto a shared list (`x.P.push`) calls, in the same body, a function that reads `.P` three calls deep (it would see the list half-built); today's two listed. Break: server/src/gladiator.js: `t.matches.push(nm); this._arenaTryActivate(nm);` in one loop of the next round -> FAIL (tried 2026-11-17).
 * TRAPS §183 (the rule): a flag the worker copies from a phone's message (`ps.X = !!msg.X`) is read by no function that lands a hit (calls `_applyDamage`, `_monsterHit`, `_hpSet`), but listed; and every reader a hit calls (`_rollOn`, `_rollIFrames`), RUN with the flag alone and no window the worker opened, says no. Break: server/src/movement.js _rollOn: `return !!(ps && ps.dodging);` first -> FAIL (tried 2026-11-17).
 * TRAPS §237 (the rule): arrowEdgeRoom answers along the flight for every point of the view and every angle (an arrow by an edge flying away flies on); ARROW_EDGE_PX is read nowhere else; every page rule (src/game) that reads the view's size calls arrowEdgeRoom or is listed as no flight. Break: src/game/arrowEdge.js: arrowEdgeRoom returns 0 within ARROW_EDGE_PX of any edge, whichever way it flies -> FAIL (tried 2026-11-17).
 * TRAPS §239 (the rule): shotGroundOffset, across random shots: an aimed shot's ground runs from the boots (d = 0) to the target's feet (at its nearest approach and after); a shot at nothing keeps the parallel line; and every page function that asks a prop question of a drawn shot (`_renderX` with sweepBlockPoint, attackBlockPoint, boxExitPoint) calls shotGroundOffset. Break: src/game/shotGround.js: shotGroundOffset returns [gx, gy] whatever the aim -> FAIL (tried 2026-11-17).
 * TRAPS §240 (the rule): no worker function on a hit's road reads an element off a phone's message (`payload.element`...) but after asking the kill switch (`_weaponGemOff`); and no test, tool or page function writes an element on the page's weapon, but the listed pictures and the old worker's road. Break: server/src/pvpextras.js _pvpClaimElement: the `_weaponGemOff` road gone, the claim read first -> FAIL (tried 2026-11-17).
 * TRAPS §249 (the rule): every server function that moves a monster (writes its x) calls `_keepMonsterIn`, or is listed (a placing, the walk through slideMove); none clamps a monster by `_getZoneConfig`. Break: server/src/combat.js _handleMonsterDamage: the knockback's `this._keepMonsterIn(zone, m)` gone -> FAIL (tried 2026-11-17).
 * TRAPS §273 (the rule): every place the worker reads a phone's report of the old track (`payload.weaponSkills`, `defenseSkill`, `weaponUnspent`, `defenseUnspent`) asks the prog3 freeze in its condition, today's one pool recompute listed. Break: server/src/grids.js _handleStatsUpdate: `!_skillFrozen &&` gone from the weaponSkills branch -> FAIL (tried 2026-11-17).
 * TRAPS §293 (the rule): the two starts of a basic swing (every block that sets `S.isSwinging = true` and counts a melee shot: the tapped swingAttack, the held loop) do the same things, and each refusal of the tapped start has its twin in the held start's conditions; today's differences listed. Break: src/game/playerActions.js swingAttack: `S._swingBcastPending = true` gone -> FAIL (tried 2026-11-17).
 * TRAPS §296 (the rule): every page arc test that decides a blow (`isAttackInShieldArc` in a damage or block decision) is behind `localBlockApplies` or the local zone's own `!S._serverMonsters`, today's local-only roads listed. Break: gameEvents.js: the monster_attack fallback `S._shieldUp && !_srvResolved && isAttackInShieldArc(...)` in place of localBlockApplies -> FAIL (tried 2026-11-17).
 * TRAPS §311 (the rule): every no-damage clock `_applyDamage` honours (`if (ps.X && Date.now() < ps.X) ... graced`) is written only under a give gate that refuses mid-fight (`_lingerFightRecent`) and within a gap (`_GAP_MS`), or by the listed admin lever. Break: server/src/movement.js _handleMove: `ps._zoneEntryGraceUntil = _gNow + ...` outside the `_entryGraceGive` if -> FAIL (tried 2026-11-17).
 * TRAPS §325 (the rule): every gap a sword can swing again on is above the blade's contact plus a frame (MANUAL.FREE_GAP_MS, what mcSwingGapMs returns, the floors of swingCooldownMultFor times SWING_COOLDOWN), and the worker's MIN_SWING_GAP_MS is at or under the phone's. Break: src/game/manualCombat.js: FREE_GAP_MS 100 -> FAIL (tried 2026-11-17).
 * TRAPS §327 (the rule): every server function that lowers a monster's hp is reached only through a function that asks the Wheel's step (`_wheelSpectator` / `_wheelInStep`), today's others listed; the doors (`_handleMonsterDamage`, `_applyMonsterDot`) ask it themselves; and `_pvpAllowed` asks it before any yes but consent. Break: server/src/index.js _applyMonsterDot: its `_wheelSpectator` line gone -> FAIL (tried 2026-11-17).
 *
 * HOW IT READS.  The code of server/src/ and src/ (comments dropped:
 * lib/codeOnly.mjs; strings blanked where a scan must not read them:
 * lib/maskCode.mjs), one function at a time (lib/fnSpans.mjs), found by the
 * rule's own names (`_pvpAllowed`, `_handlePlayerDeath`, `_applyDamage`,
 * `swingAttack`...), never a file and line; each name a scan reads is asked
 * for first, so a rename turns it red.  The worker's call graph is
 * `this.NAME(` calls by name.  §101, §237, §239 and §325 import the rule's
 * own module (worldProps.js, arrowEdge.js, shotGround.js, manualCombat.js,
 * the data system's gameSystems, freeswing.js) and ask it across its inputs.  §240 also
 * reads tools/qa/ (the phone scenarios and tools).
 *
 * CENSUSES (the plan's rule 3): a place not listed fails, the listed count
 * only falls, and a listed place that is gone fails until its name comes
 * off.  Each known place is under Found in lane B's notes (card V4).
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch worktree, then undone:
 *   §5    duel.js _makeDuel: `awayId: null, graceUntil: 0` in the record       -> FAIL §5 one slot (awayId:null, graceUntil:0)
 *         duel.js _duelOnDisconnect: `duel.awayId = playerId;`               -> FAIL §5 one slot (duel.awayId=playerId)
 *   §19   index.js _pvpAllowed: `return true;` first in the lawless branch     -> FAIL §19 (a plain yes with no party refusal)
 *         nomansland.js _nmlAllowed: the party line gone                       -> FAIL §19 (_nmlAllowed: says yes with no party refusal)
 *         index.js: `_pvpAllowed` renamed                                      -> FAIL §19 (_pvpAllowed is found)
 *   §24   index.js _onMessage: the chain's `msg.type === 'pong' || ` gone      -> FAIL §24 chain read; FAIL §24 timers (pong)
 *         wsClient.js: `setInterval(function () { act('shop_list', {}); }, 5000);` -> FAIL §24 timers (shop_list)
 *         tick.js: the sweep's `close(4006` made `close(4099`                  -> FAIL §24 close code (4099)
 *   §101  worldProps.js sweepBlockPoint: `|| pointInBox(x1, y1, b)` skip       -> FAIL §101 sweep (town mayor-house at 4 px a step...)
 *         projectiles.js updateArrows: the step asked of attackBlockPoint      -> FAIL §101 callers (projectiles.js updateArrows)
 *   §151  index.js _handlePlayerDeath: `_hook('war', ...)` without its if      -> FAIL §151 (war)
 *   §157  gladiator.js: `t.matches.push(nm); this._arenaTryActivate(nm);` in one loop -> FAIL §157 (_arenaOnMatchResolved: pushes onto .matches and calls _arenaTryActivate)
 *         gladiator.js: `_arenaTryActivate` renamed                            -> FAIL §157 (the crown's reader is found)
 *   §183  movement.js _rollOn: `return !!(ps && ps.dodging);` first            -> FAIL §183 readers run (_rollOn ... said true)
 *         pvpextras.js _strikePlayer: `if (targetPs.dodging) return null;`     -> FAIL §183 (_strikePlayer dodging)
 *   §237  arrowEdge.js: 0 within ARROW_EDGE_PX of any edge                    -> FAIL §237 answers (x 1, y 1, ang 0: got 0, want 365)
 *         projectiles.js: ARROW_EDGE_PX imported and compared beside the room  -> FAIL §237 margin (src/game/projectiles.js)
 *         targeting.js: a new `shotPastView` reading S._viewW                  -> FAIL §237 view readers (shotPastView)
 *   §239  shotGround.js: `return [gx, gy];` whatever the aim                   -> FAIL §239 (the nearest approach is not the feet)
 *   §240  pvpextras.js _pvpClaimElement: the _weaponGemOff road gone           -> FAIL §240 worker (_pvpClaimElement)
 *         mp-weapongem.mjs: `S.rpg.weapon.element1 = 'flame'`                  -> FAIL §240 writers (mp-weapongem.mjs)
 *   §249  combat.js _handleMonsterDamage: the knockback's _keepMonsterIn gone  -> FAIL §249 (_handleMonsterDamage)
 *         dungeon.js: `_keepMonsterIn` renamed                                 -> FAIL §249 (_keepMonsterIn is found)
 *   §273  grids.js _handleStatsUpdate: `!_skillFrozen &&` gone                 -> FAIL §273 (payload.weaponSkills)
 *   §293  playerActions.js swingAttack: `S._swingBcastPending = true` gone     -> FAIL §293 effects (held S._swingBcastPending)
 *         monsterCombat.js: `&& !isStaggered(S, Date.now())` gone from the held gate -> FAIL §293 refusals (staggerRefused)
 *         playerActions.js: `swingAttack` renamed                              -> FAIL §293 starts found
 *         monsterCombat.js: `!S._extraction && ` gone from the held gate       -> FAIL §293 refusals (_extraction) (v2.3.6080)
 *   §296  gameEvents.js: `!_srvResolved` in place of localBlockApplies         -> FAIL §296 (gameEvents.js processGameEvent)
 *   §311  movement.js _handleMove: the grace written before the give gate's if -> FAIL §311 (_handleMove _zoneEntryGraceUntil)
 *         movement.js: `_entryGraceGive` renamed                               -> FAIL §311 gates
 *   §325  manualCombat.js: FREE_GAP_MS 100                                     -> FAIL §325 (100 >= 136)
 *   §327  index.js _applyMonsterDot: its `_wheelSpectator` line gone           -> FAIL §327 (_applyMonsterDot; the doors ask)
 *         abilities.js: the cast's `_wheelSpectator` whiff gone                -> FAIL §327 (_abilityStrikeMonster)
 *   (burst.js's own `_wheelSpectator` line, the census row's break, is NOT a
 *   break of the rule: the burst lands through _applyMonsterDot and
 *   _strikePlayer, which ask; world-size.test pins that one line.)
 *
 * Run from the repository's root: node tools/guards/traps-combat-rules.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { spansOf, innerFn, namedFn, blockAt, closeOf } from './lib/fnSpans.mjs';
import { filesOf } from './lib/filesOf.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
/* a census: the places found against the known list and its line */
function census(tag, what, found, known, line) {
  const fresh = [...found].filter((k) => !Object.hasOwn(known, k)).sort();
  const gone = Object.keys(known).filter((k) => !found.has(k));
  check(`${tag}: ${what}: ${found.size} today, none new`, fresh.length === 0, fresh);
  check(`${tag}: every listed place is still there (a fixed one's name comes off)`, gone.length === 0, gone);
  check(`${tag}: the listed count ${Object.keys(known).length} is at or under its line ${line}`, Object.keys(known).length <= line);
}
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const base = (f) => f.slice(f.lastIndexOf('/') + 1);

/* v2.3.5941: one esbuild run for both trees; each file masked and cut into functions once */
const code = codeOf(['server/src', 'src']);
const FILES = new Map();
for (const [f, c] of code) {
  const m = maskCode(c);
  FILES.set(f, { c, m, ...spansOf(m) });
}
const SERVER = [...FILES.keys()].filter((f) => f.startsWith('server/src/'));
const PAGE = [...FILES.keys()].filter((f) => f.startsWith('src/'));

/* every named function: name -> [{ f, fn }] */
function defsOf(files) {
  const d = new Map();
  for (const f of files) for (const fn of FILES.get(f).fns) {
    if (fn.name === '=>' || fn.name === 'function') continue;
    if (!d.has(fn.name)) d.set(fn.name, []);
    d.get(fn.name).push({ f, fn });
  }
  return d;
}
const DS = defsOf(SERVER);
const DP = defsOf(PAGE);
const bodyM = (x) => FILES.get(x.f).m.slice(x.fn.a, x.fn.b + 1);
const bodyC = (x) => FILES.get(x.f).c.slice(x.fn.a, x.fn.b + 1);
const oneDef = (defs, name) => (defs.get(name) || [])[0] || null;
const thisCalls = (s) => [...new Set([...s.matchAll(/this\.([\w$]+)\(/g)].map((x) => x[1]))].filter((n) => DS.has(n));

/* the worker's call graph by name: callers of each function */
const CALLERS = new Map();
for (const [name, list] of DS) for (const x of list) for (const n of thisCalls(bodyM(x))) {
  if (!CALLERS.has(n)) CALLERS.set(n, new Set());
  CALLERS.get(n).add(name);
}
/* a function reaches `target` through this.* calls, `depth` deep */
function reaches(name, re, depth, seen = new Set()) {
  if (seen.has(name) || depth < 0) return false;
  seen.add(name);
  for (const x of DS.get(name) || []) {
    const b = bodyM(x);
    if (re.test(b)) return true;
    for (const n of thisCalls(b)) if (reaches(n, re, depth - 1, seen)) return true;
  }
  return false;
}

/* the ( that opens the ) at k in masked code */
function openOf(m, k) {
  let d = 0;
  for (let i = k; i >= 0; i--) {
    const ch = m[i];
    if (ch === ')' || ch === ']' || ch === '}') d++;
    else if (ch === '(' || ch === '[' || ch === '{') { if (--d === 0) return i; }
  }
  return -1;
}
/* the conditions over a point, inside its function: each `if(...)`/`while(...)`
   whose block holds it, each `if(` whose parens hold it, the condition of a
   braceless `if(...)stmt` it sits in, and its own statement */
function condsAt(F, pos) {
  const { m } = F;
  const fn = innerFn(F.fns, pos);
  const lo = fn ? fn.a : 0;
  const out = [];
  for (const [a, b] of F.blocks) {
    if (!(a < pos && pos < b) || a <= lo) continue;
    let k = a - 1;
    while (k >= 0 && /\s/.test(m[k])) k--;
    if (m[k] !== ')') continue;
    const o = openOf(m, k);
    if (/(?:if|while)\s*$/.test(m.slice(Math.max(0, o - 6), o))) out.push(m.slice(o, k + 1));
  }
  /* parens that hold it: an if's condition */
  let d = 0;
  for (let i = pos; i > lo; i--) {
    const ch = m[i];
    if (ch === ')' || ch === ']' || ch === '}') d++;
    else if (ch === '(' || ch === '[' || ch === '{') {
      if (d > 0) { d--; continue; }
      if (ch === '{') break;
      if (ch === '(' && /(?:if|while)\s*$/.test(m.slice(Math.max(0, i - 6), i))) out.push(m.slice(i, closeOf(m, i) + 1));
    }
  }
  /* its statement, back to a ; { } at its depth, and the braceless if in front */
  let s = pos; d = 0;
  for (; s > lo; s--) {
    const ch = m[s - 1];
    if (ch === ')' || ch === ']') d++;
    else if (ch === '(' || ch === '[') { if (d === 0) continue; d--; }
    else if (d === 0 && (ch === ';' || ch === '{' || ch === '}')) break;
  }
  let e = pos; d = 0;
  for (; e < m.length; e++) {
    const ch = m[e];
    if (ch === '(' || ch === '[' || ch === '{') d++;
    else if (ch === ')' || ch === ']' || ch === '}') { if (d === 0) break; d--; }
    else if (d === 0 && ch === ';') break;
  }
  out.push(m.slice(s, e));
  return out;
}

/* ── §5: an away clock is per player, never one slot ── */
{
  const CLOCK = /^[\w$]*?(?:away|Away|grace|Grace)(?:[A-Z][\w$]*)?$/;
  const NOT_CLOCK = new Set(['graced', 'entrygrace']);   /* a hit's answer flag; the live flag's name */
  const PLAYER_ROOT = /^(?:ps|targetPs|attackerPs|player|_ps)$|^this\.playerState\[/;
  const found = new Set();
  let keyed = 0;
  const maps = [];
  for (const f of SERVER) {
    const { m, c, fns } = FILES.get(f);
    for (const x of m.matchAll(/((?:this\.)?[\w$]+(?:\.[\w$]+|\[[^\][=]*\])*)\.([\w$]+)((?:\[[^\][=]*\])*)=(?![=>])/g)) {
      const name = x[2];
      if (!CLOCK.test(name) || NOT_CLOCK.has(name)) continue;
      const lhs = x[1];
      const val = m.slice(x.index + x[0].length, x.index + x[0].length + 20);
      if (x[3] || lhs.includes('[') || PLAYER_ROOT.test(lhs)) { keyed++; continue; }
      if (/^(?:Object\.create\(null\)|new Map\()/.test(val)) { maps.push(lhs + '.' + name); continue; }
      found.add(`${base(f)} ${namedFn(fns, x.index)}: ${c.slice(x.index, x.index + x[0].length + 12)}`);
    }
    for (const x of m.matchAll(/[{,]([\w$]+):(?!:)/g)) {
      const name = x[1];
      if (!CLOCK.test(name) || NOT_CLOCK.has(name)) continue;
      const val = m.slice(x.index + x[0].length, x.index + x[0].length + 20);
      if (/^(?:Object\.create\(null\)|new Map\()/.test(val)) { maps.push(name); continue; }
      /* a slot is a clock, an id or nothing yet: `awayId:null`, `graceUntil:0`,
         `awayUntil:Date.now()+...`; a flag (`away:!ps` on a member's wire row)
         or a distance (`away:cfg.knockback`) is no clock */
      if (!/^(?:null|void 0|undefined|-?\d|Date\.now\(\)|[\w$]*(?:[Ii]d|[Pp]id|Until|At|Since)(?![\w$]))/.test(val)) continue;
      found.add(`${base(f)} ${namedFn(fns, x.index)}: ${c.slice(x.index + 1, x.index + x[0].length + 16)}`);
    }
  }
  check(`§5: the worker writes away clocks keyed by a player (${keyed}), the duel's own among them`, keyed >= 4, keyed);
  check(`§5: a record's away field is made a map (${maps.join(', ')})`, maps.includes('away') && maps.includes('awayZone'), maps);
  census('§5', 'away or grace fields held in ONE slot (not keyed by a player, not a map)', found, {}, 0);
}

/* ── §19: a yes from _pvpAllowed but consent refuses a party ── */
const PARTY_NO = /_partyOf\([\s\S]*\.id===[\w$]+\.id\)return false/;
const PVP = oneDef(DS, '_pvpAllowed');
{
  check('§19: _pvpAllowed is found in the worker', !!PVP);
  const CONSENT = ['_sparPair', '_pvpConsent'];
  if (PVP) {
    const F = FILES.get(PVP.f);
    const b = bodyM(PVP);
    check('§19: the consent names the scan reads are in _pvpAllowed (' + CONSENT.join(', ') + ')', CONSENT.every((n) => b.includes(n)));
    const yes = [...b.matchAll(/return true/g)].map((x) => x.index);
    const plain = [], delegates = [], consent = [], bad = [];
    for (const at of yes) {
      const pos = PVP.fn.a + at;
      const cs = condsAt(F, pos);
      const own = cs[cs.length - 1];                         /* its statement */
      const imm = /if\(([\s\S]*)\)return true$/.exec(own.trim());
      const ifCond = imm ? imm[1] : null;
      const all = cs.join(' ');
      if (CONSENT.some((n) => (ifCond || '').includes(n)) || (cs.slice(0, -1).some((t) => t.includes('_pvpConsent')))) { consent.push(at); continue; }
      const del = ifCond && [...ifCond.matchAll(/this\.([\w$]+)\(/g)].map((x) => x[1]);
      if (del && del.length) {
        for (const n of del) {
          delegates.push(n);
          const db = (DS.get(n) || []).map(bodyM).join('\n');
          const lastYes = db.lastIndexOf('return true');
          if (!db || !PARTY_NO.test(db.slice(0, lastYes))) bad.push(`${n}: says yes with no party refusal before it`);
        }
        continue;
      }
      if (ifCond === null && all) {
        plain.push(at);
        /* the plain yes: its block, before it, refuses a party */
        const bl = blockAt(F.blocks, pos);
        if (!PARTY_NO.test(F.m.slice(bl[0], pos))) bad.push('_pvpAllowed: a plain yes with no party refusal before it in its block');
        continue;
      }
      bad.push('_pvpAllowed: a yes the scan cannot read: ' + own.slice(0, 80));
    }
    check(`§19: _pvpAllowed's yes are read: consent ${consent.length}, handed on ${delegates.length} (${delegates.join(', ')}), plain ${plain.length}`,
      consent.length >= 2 && delegates.includes('_nmlAllowed') && plain.length >= 1, { consent: consent.length, delegates, plain: plain.length });
    check('§19: every yes but consent refuses two players of one party first (party.test §11 holds one, nomansland.test the other)', bad.length === 0, bad);
    /* §327's other half, read here: the step is asked before every yes but consent */
    const askAt = b.indexOf('_wheelSpectator(');
    const firstNonConsent = yes.filter((y) => !consent.includes(y))[0];
    check('§327: _pvpAllowed asks _wheelSpectator before any yes but consent', askAt > 0 && firstNonConsent !== undefined && askAt < firstNonConsent
      && b.indexOf('_nmlAllowed(') > askAt, { askAt, firstNonConsent });
  }
}

/* ── §24: the AFK clock: stamped in one chain that names its heartbeats ── */
{
  const writers = new Set();
  for (const f of SERVER) {
    const F = FILES.get(f);
    for (const x of F.m.matchAll(/\.lastRecv=(?!=)/g)) writers.add(namedFn(F.fns, x.index));
  }
  check('§24: the AFK clock (.lastRecv) is stamped only by the router (_onMessage)', writers.size === 1 && writers.has('_onMessage'), [...writers]);
  const R = oneDef(DS, '_onMessage');
  const excluded = new Set(), judged = new Set();
  let chainOk = false;
  if (R) {
    const F = FILES.get(R.f);
    const { m, c } = F;
    const end = m.indexOf('else{session.lastRecv=Date.now()}', R.fn.a);
    if (end > 0 && end < R.fn.b) {
      let k = end;
      for (;;) {
        let j = k - 1;
        while (/\s/.test(m[j])) j--;
        if (m[j] !== '}') break;
        const o = openOf(m, j);
        let p = o - 1;
        while (/\s/.test(m[p])) p--;
        if (m[p] !== ')') break;
        const po = openOf(m, p);
        const cond = c.slice(po, p + 1);
        const body = m.slice(o, j + 1);
        const types = [...cond.matchAll(/msg\.type==="([\w]+)"/g)].map((x) => x[1]);
        if (!/lastRecv=/.test(body)) types.forEach((t) => excluded.add(t));
        else if (/if\([^]*lastRecv=/.test(body)) types.forEach((t) => judged.add(t));
        const pre = m.slice(Math.max(0, po - 12), po);
        const el = /else\s*if\s*$/.exec(pre);
        if (!el) { chainOk = /if\s*$/.test(pre); break; }
        k = po - el[0].length;
      }
    }
  }
  check(`§24: the router's stamp chain is read (heartbeats ${[...excluded].join(', ')}; judged by content ${[...judged].join(', ')})`,
    chainOk && excluded.has('pong') && judged.has('move') && judged.has('track'), { chainOk, excluded: [...excluded], judged: [...judged] });
  /* the page's timers: what each setInterval sends, three calls deep */
  const IMPORTS = new Map();
  for (const f of PAGE) {
    const map = new Map();
    for (const x of FILES.get(f).m.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
      for (const part of x[1].split(',')) { const mm = /^\s*([\w$]+)(?:\s+as\s+([\w$]+))?\s*$/.exec(part); if (mm) map.set(mm[2] || mm[1], mm[1]); }
    }
    IMPORTS.set(f, map);
  }
  const DOOR_NAMES = new Set(['act', '_ride', 'send', '_send', 'doorRefuse']);
  const resolvePage = (name, f) => {
    const own = (DP.get(name) || []).filter((d) => d.f === f);
    if (own.length) return own;
    const orig = IMPORTS.get(f).get(name);
    return orig ? (DP.get(orig) || []).filter((d) => d.f !== f) : [];
  };
  const { WIRE_IN } = await imp('server/src/wire/in.js');
  const IN = new Set(WIRE_IN.map((r) => r.name));
  const sent = new Map();
  let timers = 0;
  for (const f of PAGE) {
    const { m, c } = FILES.get(f);
    for (const x of m.matchAll(/(?<![\w$.])setInterval\(/g)) {
      timers++;
      const o = x.index + x[0].length - 1;
      let text = c.slice(o, closeOf(m, o) + 1);
      const seen = new Set();
      /* a name read in the timer's arguments (a call, or a callback handed by
         name: `setInterval(_poll, ...)`), followed through its own file or
         the file it is imported from, two deep */
      let frontier = [{ f, t: m.slice(o, closeOf(m, o) + 1) }];
      for (let depth = 0; depth < 2; depth++) {
        const next = [];
        for (const fr of frontier) for (const y of fr.t.matchAll(/(?<![\w$.])([\w$]+)(?=\(|[,)])/g)) {
          if (DOOR_NAMES.has(y[1])) continue;   /* the send itself (its own text names every type) */
          for (const d of resolvePage(y[1], fr.f)) {
            const key = d.f + ' ' + d.fn.a;
            if (seen.has(key)) continue;
            seen.add(key);
            text += bodyC(d); next.push({ f: d.f, t: bodyM(d) });
          }
        }
        frontier = next;
      }
      for (const y of text.matchAll(/(?<![\w$])(?:act|_ride|send|_send)\("(\w+)"|type:"(\w+)"/g)) {
        const t = y[1] || y[2];
        if (!IN.has(t)) continue;
        if (!sent.has(t)) sent.set(t, new Set());
        sent.get(t).add(base(f));
      }
    }
  }
  check(`§24: the page's timers are read (${timers}) and what they send found (${[...sent.keys()].join(', ')})`, timers >= 20 && sent.has('report'), [...sent.keys()]);
  /* Stepped in today: each under Found in lane B's notes */
  const TIMER_KNOWN = {
    map_watch: 'WorldMapOverlay.jsx: the open World map says so every MAP_HEARTBEAT_MS (presence2.js sendMapWatch); the worker stamps the AFK clock on it, so a tab left with the map open is never swept: FOUND',
    acc_request: 'JourneyPanel.jsx: the Journey panel asks for the accuracy every 15 s while open (accuracy.js askAccuracy); it stamps the AFK clock the same: FOUND',
    bank_open: 'BankPanel.jsx: the bank asks again every 3 s while a read has failed (bank.js bankOpen), only while open: a retry, but it stamps',
    loginspin_ask: 'LoginSpinWindow.jsx: the login spin asks on a timer until its window opens (loadingGate.js), once a sitting',
    join: 'wsClient.js: the thaw watch (_aliveTimer) recovers a page that was frozen (_resumeRecover, _forceRejoin): a new session, its clock new',
    set_active_slot: 'wsClient.js: the same recovery re-sends the weapon slot after its rejoin',
  };
  const found = new Set([...sent.keys()].filter((t) => !excluded.has(t) && !judged.has(t)));
  census('§24', 'messages the page sends on a timer that stamp the AFK clock', found, TIMER_KNOWN, 6);
  /* the sweep's close code is one the page does not reconnect on */
  const T = oneDef(DS, '_tickPingAndAfk');
  const sweep = T ? bodyC(T) : '';
  const at = sweep.indexOf('IDLE_TIMEOUT_MS');
  const cc = at < 0 ? null : /\.close\((\d{4}),/.exec(sweep.slice(at));
  const pageKnows = cc && PAGE.filter((f) => f.startsWith('src/networking/')).some((f) => new RegExp('\\.code===' + cc[1] + '(?!\\d)').test(FILES.get(f).c));
  check(`§24: the AFK sweep closes with its own code (${cc && cc[1]}) and the page's connection reads it (an eviction stays one)`, !!pageKnows, cc && cc[1]);
}

/* ── §101: the sweep form stops every stepped flight; the whole-line form's callers ── */
{
  const wp = await imp('src/data/worldProps.js');
  const zones = [...new Set(wp.WORLD_PROPS.map((p) => p.zone))];
  const SPEEDS = [4, 6, 8, 11, 20, 40, 60];
  const through = [];
  let flights = 0;
  const fly = (zone, b) => {
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const ways = [[cx - (b.x1 - b.x0) / 2 - 90, cy, 1, 0], [cx + (b.x1 - b.x0) / 2 + 90, cy, -1, 0], [cx, cy - (b.y1 - b.y0) / 2 - 90, 0, 1], [cx, cy + (b.y1 - b.y0) / 2 + 90, 0, -1]];
    for (const [x, y, ux, uy] of ways) for (const v of SPEEDS) {
      flights++;
      let px = x, py = y, hit = null;
      const len = (Math.abs(ux) * (b.x1 - b.x0) + Math.abs(uy) * (b.y1 - b.y0)) + 180;
      for (let s = 0; s < len && !hit; s += v) { const nx = px + ux * v, ny = py + uy * v; hit = wp.sweepBlockPoint(zone, px, py, nx, ny); px = nx; py = ny; }
      if (!hit) through.push(`${zone} ${b.id || '?'} at ${v} px a step`);
    }
  };
  for (const z of zones) for (const b of wp.zoneBlockers(z)) fly(z, b);
  /* made-up boxes, thin to deep, through the hook the Wheel uses */
  const made = [];
  for (let i = 0; i < 24; i++) { const w = 4 + i * 11, d = 4 + ((i * 7) % 57); made.push({ id: 'qa' + i, x0: 1000 + i * 400, x1: 1000 + i * 400 + w, y0: 500, y1: 500 + d }); }
  wp.setZoneBlockerHook((z) => (z === '__qa_boxes' ? made : null));
  for (const b of made) fly('__qa_boxes', b);
  const lineMisses = made.filter((b) => { let px = b.x0 - 90, hit = null; const cy = (b.y0 + b.y1) / 2; for (let s = 0; s < 400 && !hit; s += 6) { hit = wp.attackBlockPoint('__qa_boxes', px, cy, px + 6, cy); px += 6; } return !hit; }).length;
  wp.setZoneBlockerHook(null);
  check(`§101: sweepBlockPoint stops every stepped flight through every box (${flights} flights, ${zones.length} zones with props and 24 made-up boxes)`, through.length === 0, through.slice(0, 12));
  check(`§101: ...and the whole-line form lets stepped flights through (${lineMisses} of 24: why a step needs the sweep)`, lineMisses > 0, lineMisses);
  const KNOWN_LINE = {
    'gameEvents.js processGameEvent': 'the snowball: the worker\'s own release -> aim line, asked once as it spawns (TRAPS §101\'s second half)',
    'worldProps.js attackBlocked': 'the yes/no form of attackBlockPoint itself',
    'worldProps.js (top)': 'the QA probe window.__btBlockPoint',
    'projectiles.js _sightLine': 'the bow\'s sight: the ground from the grip to a target\'s feet, asked once a shot',
    'projectiles.js _coverOf': 'the sight: is a nearer thing covered, a line to it, once a shot',
    'projectiles.js nmlSightAsk': 'No man\'s land\'s ask on an empty line: the ground to a player\'s feet, once a shot',
    'projectiles.js _rockBetween': 'the hit: a rock between the shot\'s ground point and the target\'s feet, asked as it lands',
    'hits.js _hitMissed': 'the worker: a door-sighted blow, the line from the door to the player',
    'index.js _tickMonsters': 'the worker: a monster\'s ranged shot, its line from the monster to its target, once a shot',
  };
  const found = new Set();
  for (const f of [...PAGE, ...SERVER]) {
    const F = FILES.get(f);
    for (const x of F.m.matchAll(/(?<![\w$.])(?:attackBlockPoint|attackBlocked)\(/g)) {
      const fn = innerFn(F.fns, x.index);
      if (fn && x.index === fn.a - x[0].length) continue;
      if (/function\s*$/.test(F.m.slice(Math.max(0, x.index - 10), x.index))) continue;
      found.add(base(f) + ' ' + namedFn(F.fns, x.index));
    }
  }
  census('§101', 'callers of the whole-line forms (attackBlockPoint, attackBlocked), each a whole line asked once', found, KNOWN_LINE, 9);
}

/* ── §151: a duel kill's hooks ── */
{
  const D = oneDef(DS, '_handlePlayerDeath');
  check('§151: _handlePlayerDeath is found in the worker', !!D);
  /* the hooks a duel kill runs too, with why */
  const DUEL_TOO = {
    pvpConsent: 'clears the dead player\'s consent pairs, a duel\'s with them',
  };
  if (D) {
    const F = FILES.get(D.f);
    const b = bodyC(D);
    const hooks = [...b.matchAll(/_hook\("(\w+)"/g)].map((x) => ({ label: x[1], at: D.fn.a + x.index }));
    const duel = hooks.find((h) => h.label === 'duel');
    const dk = /const _duelKill=_hook\("duel"/.test(b);
    check('§151: the duel\'s hook runs first and its answer is `_duelKill`', dk && duel && hooks[0] === duel, hooks.map((h) => h.label));
    const ungated = new Set();
    for (const h of hooks) {
      if (h === duel) continue;
      if (condsAt(F, h.at).some((t) => /_duelKill/.test(t))) continue;
      ungated.add(h.label);
    }
    check(`§151: the hooks after it are read (${hooks.length - 1})`, hooks.length >= 6, hooks.length);
    census('§151', 'hooks of a death not gated on _duelKill (a duel kill runs them)', ungated, DUEL_TOO, 1);
  }
}

/* ── §157: a list is built whole before it is acted on ── */
{
  check('§157: _arenaCrown is found in the worker', DS.has('_arenaCrown'));
  const crowns = new Set(['_arenaCrown']);
  for (const n of DS.keys()) if (reaches(n, /this\._arenaCrown\(/, 6)) crowns.add(n);
  check(`§157: the functions that can crown the arena are found (${crowns.size}), _arenaTryActivate among them`, crowns.has('_arenaTryActivate'), crowns.size);
  const found = new Set();
  let loops = 0;
  for (const f of SERVER) {
    const F = FILES.get(f);
    const { m } = F;
    for (const x of m.matchAll(/(?<![\w$.])(?:for|while)\s*\(/g)) {
      const po = x.index + x[0].length - 1;
      const pc = closeOf(m, po);
      let k = pc + 1;
      while (/\s/.test(m[k])) k++;
      let body;
      if (m[k] === '{') body = m.slice(k, closeOf(m, k) + 1);
      else { let e = k, d = 0; for (; e < m.length; e++) { const ch = m[e]; if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) { if (d === 0) break; d--; } else if (d === 0 && ch === ';') break; } body = m.slice(k, e); }
      const lists = [...new Set([...body.matchAll(/[\w$\]]\.([\w$]+)\.push\(/g)].map((y) => y[1]))];
      if (!lists.length) continue;
      loops++;
      /* a function the body calls that reads the list it is building (not
         another push onto it), three calls deep: it sees the list half-built */
      for (const P of lists) {
        const READ = new RegExp('\\.' + P.replace(/\$/g, '\\$') + '(?![\\w$]|\\.push\\()');
        const bad = thisCalls(body).filter((n) => reaches(n, READ, 3));
        if (bad.length) found.add(`${namedFn(F.fns, x.index)}: pushes onto .${P} and calls ${bad.join(', ')}`);
      }
    }
  }
  check(`§157: the worker's loops that push onto a shared list are read (${loops})`, loops >= 20, loops);
  check('§157: ...the arena\'s next round among them (a loop pushing onto .matches), and _arenaTryActivate reads .matches within three calls',
    [...FILES.values()].some((F) => /\.matches\.push\(/.test(F.m)) && reaches('_arenaTryActivate', /\.matches(?![\w$]|\.push\()/, 3));
  const LOOP_KNOWN = {
    '_allyWarOnDeath: pushes onto .fought and calls _partyBroadcast': 'alliance.js: the loop is over the wars; one war\'s tally (fought, kills) is whole for this death before its own broadcast',
    '_allyWarOnDeath: pushes onto .kills and calls _partyBroadcast': 'alliance.js: the same war\'s kill list, whole before its broadcast',
  };
  census('§157', 'loops that push onto a shared list and call a function that reads it', found, LOOP_KNOWN, 2);
}

/* ── §183: a flag the phone sets is no protection by itself ── */
{
  const HIT = /(?<![\w$])(?:_applyDamage|_monsterHit|_hpSet)\(/;
  const flags = new Set();
  for (const f of SERVER) {
    for (const x of FILES.get(f).m.matchAll(/(?<![\w$.])[\w$]+\.([\w$]+)=(?:!!(?:msg|payload|p|data|d|claim)\.\1(?![\w$])|(?:msg|payload|p|data|d|claim)\.\1===true|Boolean\((?:msg|payload|p|data|d|claim)\.\1\))/g)) flags.add(x[1]);
  }
  check(`§183: the flags the worker copies from a phone are found (${[...flags].join(', ')}), dodging among them`, flags.has('dodging'), [...flags]);
  const hitFns = new Set([...DS.keys()].filter((n) => ['_applyDamage', '_monsterHit', '_hpSet'].includes(n) || DS.get(n).some((x) => HIT.test(bodyM(x)))));
  check(`§183: the functions that land a hit are found (${hitFns.size})`, hitFns.has('_resolvePvPAttack') || hitFns.size >= 10, hitFns.size);
  const KNOWN_READ = {
    '_resolvePvPAttack dodging': 'combat.js: a rewind snapshot\'s `dodging`, which the tick wrote from _rollOn (the worker\'s window); the live target asks _rollOn',
  };
  const found = new Set();
  const windowless = [];
  const ran = [];
  for (const X of flags) {
    const re = new RegExp('\\.' + X + '(?![\\w$]|=[^=])');
    for (const [n, list] of DS) {
      if (!list.some((x) => re.test(bodyM(x)))) continue;
      if (hitFns.has(n)) found.add(`${n} ${X}`);
      /* a reader a hit calls (two calls up), RUN with the phone's flag alone (no window the
         worker opened, every switch of `this` answering false): it must say no */
      const calledByHit = [...(CALLERS.get(n) || [])].some((c) => hitFns.has(c) || [...(CALLERS.get(c) || [])].some((cc) => hitFns.has(cc)));
      if (!calledByHit || hitFns.has(n)) continue;
      ran.push(n);
      for (const x of list) {
        const F = FILES.get(x.f);
        const po = openOf(F.m, x.fn.a - 1);
        const params = F.c.slice(po + 1, x.fn.a - 1).split(',').map((q) => q.trim());
        let said;
        try {
          const run = new Function(...params, F.c.slice(x.fn.a + 1, x.fn.b));
          const self = new Proxy({}, { get: (t, k) => (k === '_liveFlags' ? undefined : () => false) });
          said = run.call(self, ...params.map((q, i) => (i === 0 ? { [X]: true, z: 'meadow' } : Date.now())));
        } catch (e) { said = 'threw: ' + e.message; }
        if (said) windowless.push(`${n}(${params.join(', ')}) with .${X} alone said ${JSON.stringify(said)}`);
      }
    }
  }
  census('§183', 'functions that land a hit and read a phone\'s flag themselves', found, KNOWN_READ, 1);
  check(`§183: every reader of a phone's flag that a hit calls (${ran.join(', ')}), run with the flag alone, says no (only a window the worker opened counts)`, ran.includes('_rollOn') && windowless.length === 0, windowless);
  check('§183: _rollOn is such a reader (a hit calls it)', [...(CALLERS.get('_rollOn') || [])].some((c) => hitFns.has(c)), [...(CALLERS.get('_rollOn') || [])]);
}

/* ── §237: the edge a flight flies toward ── */
{
  const AE = await imp('src/game/arrowEdge.js');
  const PX = AE.ARROW_EDGE_PX;
  const cam = { x: 1000, y: 2000 }, W = 390, H = 700;
  const bad = [];
  let asked = 0;
  for (let x = cam.x + 1; x < cam.x + W; x += 13) for (let y = cam.y + 1; y < cam.y + H; y += 23) for (let a = 0; a < 64; a++) {
    const ang = (a / 64) * Math.PI * 2 - Math.PI;
    const c = Math.cos(ang), s = Math.sin(ang);
    let t = Infinity;
    if (c > 1e-9) t = Math.min(t, (cam.x + W - x) / c); else if (c < -1e-9) t = Math.min(t, (cam.x - x) / c);
    if (s > 1e-9) t = Math.min(t, (cam.y + H - y) / s); else if (s < -1e-9) t = Math.min(t, (cam.y - y) / s);
    const want = Math.max(0, t - PX);
    const got = AE.arrowEdgeRoom(cam, W, H, x, y, ang);
    asked++;
    if (!(Math.abs(got - want) < 1e-6)) { if (bad.length < 6) bad.push({ x: x - cam.x, y: y - cam.y, ang: +ang.toFixed(3), got, want }); }
  }
  check(`§237: arrowEdgeRoom is the room along the flight to the edge it flies toward, less ARROW_EDGE_PX, at every point of the view and angle (${asked})`, bad.length === 0, bad);
  check('§237: ...so an arrow 5 px from the west edge flying east flies on, flying west it comes down',
    AE.arrowEdgeRoom(cam, W, H, cam.x + 5, cam.y + 300, 0) > 300 && AE.arrowEdgeRoom(cam, W, H, cam.x + 5, cam.y + 300, Math.PI) === 0);
  const margin = PAGE.filter((f) => f !== 'src/game/arrowEdge.js' && /(?<![\w$])ARROW_EDGE_PX(?![\w$])/.test(FILES.get(f).m));
  check('§237: ARROW_EDGE_PX is read nowhere but arrowEdge.js (a new limit goes in the function, not beside it)', margin.length === 0, margin);
  /* every page rule that reads the view's size: a flight's calls arrowEdgeRoom */
  const NO_FLIGHT = {
    lockTooFar: 'targeting.js: a lock let go past the screen (not a flight)',
    onScreen: 'killRoll.js: the kill roll\'s card shown on screen',
    inView: 'dropLines.js: a drop line drawn while in view',
    townsfolkFrame: 'townsfolkDay.js: townsfolk walk only in view',
  };
  const found = new Set();
  let flights = 0;
  for (const f of PAGE.filter((p) => p.startsWith('src/game/'))) {
    const F = FILES.get(f);
    for (const fn of F.fns) {
      if (fn.name === '=>' || fn.name === 'function') continue;
      const b = F.m.slice(fn.a, fn.b + 1);
      if (!/_view[WH](?![\w$])/.test(b)) continue;
      if (/(?<![\w$.])arrowEdgeRoom\(/.test(b)) { flights++; continue; }
      found.add(fn.name);
    }
  }
  check(`§237: the page rules that measure a flight against the view call arrowEdgeRoom (${flights}: the arrows, the volley, the bow's gate)`, flights >= 3, flights);
  census('§237', 'page rules (src/game) that read the view\'s size and do not call arrowEdgeRoom', found, NO_FLIGHT, 4);
}

/* ── §239: an aimed shot's ground runs boots to feet ── */
{
  const SG = await imp('src/game/shotGround.js');
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const bad = [];
  let aimed = 0;
  for (let i = 0; i < 4000; i++) {
    const ox = rnd() * 2000, oy = rnd() * 2000, ang = rnd() * Math.PI * 2 - Math.PI;
    const gx = (rnd() - 0.5) * 30, gy = -(10 + rnd() * 40);
    const dist = 40 + rnd() * 500, r = 6 + rnd() * 30;
    const off = (rnd() - 0.5) * 1.6 * r;
    const cx = ox + Math.cos(ang) * dist - Math.sin(ang) * off, cy = oy + Math.sin(ang) * dist + Math.cos(ang) * off;
    const fx = cx + (rnd() - 0.5) * 20, fy = cy + 10 + rnd() * 40;
    const aim = SG.shotAim(cx, cy, r, fx, fy);
    const t = (cx - ox) * Math.cos(ang) + (cy - oy) * Math.sin(ang);
    const at = (d) => { const o = SG.shotGroundOffset(ox, oy, ang, gx, gy, aim, d); return [ox + Math.cos(ang) * d - o[0], oy + Math.sin(ang) * d - o[1]]; };
    const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6;
    const boots = [ox - gx, oy - gy];
    if (!near(at(0), boots)) bad.push({ i, at: 'd=0 is not the boots' });
    if (t > 1) {
      aimed++;
      if (!near(at(t), [fx, fy])) bad.push({ i, at: 'the nearest approach is not the feet' });
      if (!near(at(t + 50), [fx + Math.cos(ang) * 50, fy + Math.sin(ang) * 50])) bad.push({ i, at: 'past it, not on from the feet' });
    }
    const plain = SG.shotGroundOffset(ox, oy, ang, gx, gy, null, dist);
    if (plain[0] !== gx || plain[1] !== gy) bad.push({ i, at: 'a shot at nothing left its parallel line' });
    if (bad.length > 6) break;
  }
  check(`§239: shotGroundOffset, 4000 random shots (${aimed} aimed): boots at the start, feet at the nearest approach and on past it, the parallel line at nothing`, bad.length === 0 && aimed > 1000, bad.slice(0, 6));
  const PROP_Q = /(?<![\w$.])(?:sweepBlockPoint|attackBlockPoint|attackBlocked|boxExitPoint)\(/;
  const found = new Set();
  let askers = 0;
  for (const f of PAGE) {
    const F = FILES.get(f);
    for (const fn of F.fns) {
      if (fn.name === '=>' || fn.name === 'function') continue;
      const b = F.m.slice(fn.a, fn.b + 1);
      if (!PROP_Q.test(b) || !/\._render[XY](?![\w$])/.test(b)) continue;
      askers++;
      if (!/(?<![\w$.])shotGroundOffset\(/.test(b)) found.add(base(f) + ' ' + fn.name);
    }
  }
  check(`§239: the page functions that ask a prop question of a drawn shot are found (${askers})`, askers >= 2, askers);
  census('§239', 'page functions that ask a prop question of a drawn shot without shotGroundOffset', found, {}, 0);
}

/* ── §240: a hit's element is the worker's own ── */
{
  const HIT = /(?<![\w$])(?:_applyWeaponElementStatus|_applyDamage|_monsterHit|_elemUpMult|_applyMonsterDot)\(/;
  const onHit = (n) => DS.get(n).some((x) => HIT.test(bodyM(x))) || [...(CALLERS.get(n) || [])].some((c) => DS.get(c).some((x) => HIT.test(bodyM(x))));
  const found = new Set();
  let readers = 0;
  for (const [n, list] of DS) for (const x of list) {
    const b = bodyM(x);
    const r = /(?<![\w$.])(?:payload|msg|data|claim)\.(?:element|element1|element2|elem)(?![\w$])/.exec(b);
    if (!r) continue;
    readers++;
    if (!onHit(n)) continue;
    const sw = b.indexOf('_weaponGemOff');
    if (!(sw >= 0 && sw < r.index)) found.add(n);
  }
  check(`§240: the worker's readers of a claimed element are found (${readers})`, readers >= 1, readers);
  check('§240: a monster hit reads the worker\'s own copy (_handleMonsterDamage calls _weaponHitElement)',
    (DS.get('_handleMonsterDamage') || []).some((x) => /_weaponHitElement\(/.test(bodyM(x))));
  census('§240', 'worker functions on a hit\'s road that read a claimed element before asking the kill switch', found, {}, 0);
  /* the page and the tools: an element written on the page's weapon */
  const PAGE_KNOWN = {
    'EnchantPanel.jsx onClick': 'the Enchanter\'s gem for a worker without the weapongem cap (wgOnServer false); against today\'s worker it asks (askWeaponGem) and returns first',
    'shot-thumbbtn.mjs': 'a picture: the thumb button\'s skin for an Ember Sword (no fight)',
    'mp-oneband.mjs': 'a picture: the Element Burst button shown in the band (no fight)',
  };
  const found2 = new Set();
  for (const f of PAGE) {
    const F = FILES.get(f);
    for (const x of F.m.matchAll(/\.element[12]=(?!=)/g)) found2.add(base(f) + ' ' + namedFn(F.fns, x.index));
  }
  const walk = (d, out) => { for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); } else if (/\.(mjs|js)$/.test(e.name)) out.push(p); } return out; };
  const qa = walk('tools/qa', []);
  for (const f of qa) {
    const t = readFileSync(join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
    if (/\.element[12]\s*=[^=]/.test(t) || /[wW]eapon\s*=\s*\{[^}]*element[12]\s*:/.test(t)) found2.add(base(f));
  }
  check(`§240: the phone scenarios and tools are read (${qa.length})`, qa.length >= 100, qa.length);
  census('§240', 'page functions, scenarios and tools that write an element on the page\'s weapon (H.weaponGem is the way)', found2, PAGE_KNOWN, 3);
}

/* ── §249: a monster that something moves is kept in ── */
{
  const KEEP = oneDef(DS, '_keepMonsterIn');
  check('§249: _keepMonsterIn is found in the worker', !!KEEP);
  const KNOWN_MOVE = {
    _keepMonsterIn: { why: 'the box itself', needs: /_monsterBox\(/ },
    _tickMonsters: { why: 'the walk: every step through slideMove (the zone\'s walls), the knockback\'s debt repaid as a step', needs: /slideMove\(/ },
    _dungeonSpawnBoss: { why: 'a new boss placed at its spawn', needs: null },
    _monsterNewLife: { why: 'a respawn at its spawn point', needs: /\.spawnX/ },
    _wheelDungeonWave: { why: 'a wave placed', needs: null },
    _wheelSpawnMonsters: { why: 'the Wheel\'s monsters placed', needs: null },
  };
  const found = new Set();
  const clamps = [];
  const stale = [];
  let movers = 0;
  for (const [n, list] of DS) for (const x of list) {
    const b = bodyM(x);
    if (!/(?<![\w$.])(?:m|mm|mon|monster|tm|target|t)\.x(?:\+|-)?=(?!=)/.test(b)) continue;
    movers++;
    if (/_getZoneConfig\(/.test(b) && /(?<![\w$.])(?:m|mm|mon|monster|tm|target|t)\.x=Math\.(?:max|min)\(/.test(b)) clamps.push(n);
    if (/this\._keepMonsterIn\(/.test(b) && n !== '_keepMonsterIn') continue;
    found.add(n);
    if (KNOWN_MOVE[n] && KNOWN_MOVE[n].needs && !KNOWN_MOVE[n].needs.test(b)) stale.push(n);
  }
  check(`§249: the worker's functions that move a monster are read (${movers})`, movers >= 10, movers);
  check('§249: no function clamps a monster by _getZoneConfig (it knows no dungeon arena)', clamps.length === 0, clamps);
  census('§249', 'functions that move a monster without _keepMonsterIn', found, Object.fromEntries(Object.entries(KNOWN_MOVE).map(([k, v]) => [k, v.why])), 6);
  check('§249: each listed one still does what its line says (the walk through slideMove...)', stale.length === 0, stale);
}

/* ── §273: a phone's report of the old track waits for the freeze ── */
{
  const FREEZE = /_skillFrozen|_skillFreezeOff\(|\.prog3(?![\w$])/;
  const KNOWN_TRACK = {
    '_handleStatsUpdate: payload.weaponSpecs||payload.weaponSkills': 'grids.js: recomputes the max pools from the STORED tracks (computeCanonicalPools); a frozen report changed none of them, nothing healed or saved',
    /* v2.3.6083 (card V7 PR 4, step 1 read): harmless, so no freeze.  On a
       prog3 character a stored unspent count buys nothing: no worker path
       spends it (the legacy specs it would buy are gated off for prog3 at
       _t2Flat and the point helpers, and _clampBuildTotal holds them to
       COMBAT_BUILD_CEILING, never to an unspent count), prog3FromLegacy never reads it, and the join
       only restores it to the same field.  Only the retired T2 panel shows
       it, a system nothing reads (heroSectionBus.js). */
    '_handleStatsUpdate: payload.weaponUnspent': 'grids.js: a prog3 character\'s reported unspent weapon points are stored (sanitised): harmless, no worker path spends them and prog3FromLegacy never reads them (card V7)',
    '_handleStatsUpdate: payload.defenseUnspent': 'grids.js: the same for the unspent defence points (clamped 0..999): harmless, nothing on the worker spends or converts them (card V7)',
  };
  const found = new Set();
  let reads = 0;
  for (const f of SERVER) {
    const F = FILES.get(f);
    for (const x of F.m.matchAll(/(?<![\w$.])(?:payload|msg|claim|claims|data|body)\.(?:weaponSkills|defenseSkill|weaponUnspent|defenseUnspent)(?![\w$])/g)) {
      reads++;
      const cs = condsAt(F, x.index);
      if (cs.some((t) => FREEZE.test(t))) continue;
      const st = cs[cs.length - 1];
      const head = /(?:payload|msg|claim|claims|data|body)\.[\w$]+(?:\|\|(?:payload|msg|claim|claims|data|body)\.[\w$]+)?/.exec(st.replace(/^\s*if\(/, ''));
      found.add(`${namedFn(F.fns, x.index)}: ${head ? head[0] : st.slice(0, 40)}`);
    }
  }
  check(`§273: the worker's reads of a reported old track are found (${reads})`, reads >= 3, reads);
  census('§273', 'reads of a reported old track whose condition does not ask the prog3 freeze', found, KNOWN_TRACK, 3);
}

/* ── §293: the two starts of a swing ── */
{
  const starts = [];
  for (const f of PAGE) {
    const F = FILES.get(f);
    for (const x of F.m.matchAll(/S\.isSwinging=true/g)) {
      const bl = blockAt(F.blocks, x.index);
      const raw = F.c.slice(bl[0], bl[1] + 1);
      if (!/accShot\(S,"melee"\)/.test(raw)) continue;
      starts.push({ f, F, bl, name: namedFn(F.fns, x.index), raw, m: F.m.slice(bl[0], bl[1] + 1) });
    }
  }
  const tap = starts.find((s) => s.name === 'swingAttack');
  const held = starts.filter((s) => s !== tap);
  check(`§293: the starts of a basic swing are found (${starts.map((s) => s.name).join(', ')}): the tapped one and one held`, !!tap && held.length === 1, starts.map((s) => s.name));
  if (tap && held.length === 1) {
    const h = held[0];
    const effects = (s) => {
      const from = s.m.indexOf('S.swingTimer=');
      const t = s.m.slice(Math.max(0, from));
      return new Set([...t.matchAll(/S\.([\w$]+)=(?!=)|(?<![\w$.])([\w$]+)\(/g)].map((x) => (x[1] ? 'S.' + x[1] : x[2] + '()')).filter((e) => !/^(?:Date|now|if|for|while|switch|return|typeof)\(\)$/.test(e)));
    };
    const et = effects(tap), eh = effects(h);
    /* the differences on purpose (or found): each under Found in lane B's notes */
    const ONE_START = {
      /* v2.3.6080 (card V7): kept tap-only on purpose -- a held swing that
         flashed the sword's feel is a visible change, the owner's eye */
      'tap swordFeelSwing()': 'the sword\'s feel (swordFeel.js) is the tapped stroke\'s, kept so (card V7): a held swing flashing it is a visible feel change, the owner\'s eye',
      'held tapAttackDone()': 'the held loop ends a tap-to-attack it carried on (v2.3.3712); the tapped start has none to end (by design: nothing to fix)',
    };
    const diff = new Set([...[...et].filter((e) => !eh.has(e) && e !== 'now()' ).map((e) => 'tap ' + e), ...[...eh].filter((e) => !et.has(e)).map((e) => 'held ' + e)].filter((e) => !/ (?:Date|now)\(\)$/.test(e)));
    census('§293', 'what one start of a swing does and the other does not', diff, ONE_START, 2);
    /* refusals: each of the tapped start's has its twin over the held start */
    const TWIN = {
      isPlayerDead: /isPlayerDead\(/, swimRefused: /isWheelSwimming\(/, dazeRefused: /isDazed\(/, staggerRefused: /isStaggered\(/,
      airRefused: /jumpAirborne\(/, _playerStunUntil: /_playerStunUntil/,
      /* v2.3.6080 (card V7): the two the held start lacked, now over it */
      _extraction: /!S\._extraction(?![\w$])/, climbRefused: /!climbRefused\(S\)/,
    };
    const NO_TWIN = {};
    const fnBody = bodyM({ f: tap.f, fn: innerFn(tap.F.fns, tap.bl[0] + 1) || { a: tap.bl[0], b: tap.bl[1] } });
    const pre = fnBody.slice(0, fnBody.indexOf('S.swingTimer=Date.now()'));
    const refusals = new Set([...pre.matchAll(/(?<![\w$.])([\w$]*Refused|isPlayerDead)\(|S\.(_extraction|_playerStunUntil)(?![\w$])/g)].map((x) => x[1] || x[2]));
    if (refusals.has('swimRefused')) refusals.add('climbRefused');
    const over = condsAt(h.F, h.bl[0] + 1).join(' ');
    const missing = new Set([...refusals].filter((r) => !(TWIN[r] && TWIN[r].test(over))));
    check(`§293: the tapped start's refusals are read (${[...refusals].join(', ')})`, refusals.size >= 6, [...refusals]);
    census('§293', 'refusals of the tapped swing with no twin over the held start', missing, NO_TWIN, 0);   /* v2.3.6080: 2 -> 0 (card V7) */
  }
}

/* ── §296: in a server zone the worker's blocked flag is the only block ── */
{
  const LOCAL_ONLY = {
    'monsterCombat.js updateMonsterCombat': 'the page\'s own monster AI (skipped in a server zone unless the variant moves on the page, usesClientSideMovement): a boss\'s slam, sweep and bite blocked here',
    'projectiles.js updateSlimeProjectiles': 'a thrown ball: the worker\'s (displayOnly) asks the arc only for the shield\'s sound (_shotShield); the legacy local ball rolls its own block',
  };
  const found = new Set();
  let tests = 0;
  for (const f of PAGE) {
    const F = FILES.get(f);
    for (const x of F.m.matchAll(/(?<![\w$.])isAttackInShieldArc\(/g)) {
      const fn = innerFn(F.fns, x.index);
      if (fn && x.index === fn.a - x[0].length) continue;
      if (/function\s*$/.test(F.m.slice(Math.max(0, x.index - 10), x.index))) continue;
      tests++;
      const cs = condsAt(F, x.index);
      const st = cs[cs.length - 1];
      if (/^\s*[\w$]+:/.test(st) || /inArc:/.test(F.m.slice(x.index - 40, x.index))) continue;   /* a log's field, not a decision */
      if (cs.some((t) => /localBlockApplies\(|!S\._serverMonsters/.test(t))) continue;
      found.add(base(f) + ' ' + namedFn(F.fns, x.index));
    }
  }
  check(`§296: the page's arc tests are read (${tests})`, tests >= 5, tests);
  check('§296: localBlockApplies is false in a server zone and when the worker resolved the blow', (() => {
    const L = DP.get('localBlockApplies');
    return !!L && /!srvResolved&&!\(S&&S\._serverMonsters\)/.test(bodyM(L[0]));
  })());
  census('§296', 'page arc tests that decide a blow with no localBlockApplies (or !S._serverMonsters) over them', found, LOCAL_ONLY, 2);
}

/* ── §311: a no-damage moment is given at most so often, never mid-fight ── */
{
  const A = oneDef(DS, '_applyDamage');
  check('§311: _applyDamage is found in the worker', !!A);
  const graces = A ? [...bodyM(A).matchAll(/if\(ps\.([\w$]+)&&Date\.now\(\)<ps\.\1\)\{return\{[^}]*graced:true/g)].map((x) => x[1]) : [];
  check(`§311: the no-damage clocks _applyDamage honours are read (${graces.join(', ')})`, graces.includes('_zoneEntryGraceUntil'), graces);
  const ADMIN = { '_devVitals _godUntil': 'devtools.js: the Test panel\'s god mode (an admin lever, not the phone\'s event)' };
  const found = new Set();
  const gates = new Set();
  for (const G of graces) {
    for (const f of SERVER) {
      const F = FILES.get(f);
      for (const x of F.m.matchAll(new RegExp('\\.' + G.replace(/\$/g, '\\$') + '=(?!=)(?!0[;,}]|null|void 0|undefined)', 'g'))) {
        const cs = condsAt(F, x.index).slice(0, -1);
        const g = cs.map((t) => [...t.matchAll(/this\.([\w$]+Give)\(/g)].map((y) => y[1])).flat();
        if (g.length) { g.forEach((n) => gates.add(n)); continue; }
        found.add(`${namedFn(F.fns, x.index)} ${G}`);
      }
    }
  }
  const badGate = [...gates].filter((n) => !(DS.get(n) || []).some((x) => /_lingerFightRecent\(/.test(bodyM(x)) && /_GAP_MS(?![\w$])/.test(bodyM(x))));
  check(`§311: every give gate (${[...gates].join(', ')}) refuses mid-fight (_lingerFightRecent) and within a gap (_GAP_MS)`, gates.size >= 1 && badGate.length === 0, badGate);
  census('§311', 'no-damage clocks written without a give gate', found, ADMIN, 1);
}

/* ── §325: a sword swings no sooner than its contact plus a frame ── */
{
  const FRAME = 16;
  const { MANUAL, mcSwingGapMs } = await imp('src/game/manualCombat.js');
  /* the game's big table of rules, found by its system (tests-by-system) */
  const gsFile = filesOf('data').find((f) => base(f) === 'gameSystems.js');
  check('§325: the data system holds gameSystems.js', !!gsFile);
  const GS = await imp(gsFile);
  const { FREE_SWING } = await imp('server/src/freeswing.js');
  const C = GS.MELEE_CONTACT_MS;
  check(`§325: the blade's contact (${C} ms) and the trial's gap (${MANUAL.FREE_GAP_MS} ms) are read`, C > 0 && MANUAL.FREE_GAP_MS > 0);
  check(`§325: the trial's gap is above contact plus a frame (${MANUAL.FREE_GAP_MS} >= ${C + FRAME})`, MANUAL.FREE_GAP_MS >= C + FRAME);
  check(`§325: the worker counts a swing no sooner than ${FREE_SWING.MIN_SWING_GAP_MS} ms, at or under the phone's ${MANUAL.FREE_GAP_MS} (the rest is the network's wobble)`,
    FREE_SWING.MIN_SWING_GAP_MS > 0 && FREE_SWING.MIN_SWING_GAP_MS <= MANUAL.FREE_GAP_MS);
  /* what mcSwingGapMs can return: the MANUAL numbers its body names */
  const MG = DP.get('mcSwingGapMs');
  const named = MG ? [...bodyC(MG[0]).matchAll(/MANUAL\.([\w$]+)/g)].map((x) => x[1]) : [];
  check(`§325: mcSwingGapMs returns only gaps above contact plus a frame (${named.join(', ')})`, named.length >= 1 && named.every((k) => MANUAL[k] >= C + FRAME), named.map((k) => [k, MANUAL[k]]));
  check('§325: ...asked, it answers null or one of them', [{}, { _manual: 3 }, { rpg: {} }].every((S) => { const g = mcSwingGapMs(S); return g === null || g >= C + FRAME; }));
  /* the plain cadence's floors */
  const SC = DP.get('swingCooldownMultFor');
  const floors = SC ? [...bodyM(SC[0]).matchAll(/Math\.max\(([\d.]+),/g)].map((x) => +x[1]) : [];
  const low = Math.min(...floors) * GS.SWING_COOLDOWN * GS.weaponSwingMult('melee');
  check(`§325: the plain sword cadence's floor (${floors.join(', ')} x ${GS.SWING_COOLDOWN} ms) is above contact plus a frame (${low} ms)`, floors.length >= 1 && low >= C + FRAME, { floors, low });
}

/* ── §327: a road to a monster asks the Wheel's step ── */
{
  const ASK = /_wheelSpectator\(|_wheelInStep\(/;
  const writers = [];
  for (const [n, list] of DS) if (list.some((x) => /(?<![\w$.])(?:m|mm|mon|monster|target|t|tm|victim|boss)\.hp-=/.test(bodyM(x)))) writers.push(n);
  check(`§327: the worker's functions that lower a monster's hp are found (${writers.join(', ')})`, writers.includes('_handleMonsterDamage') && writers.includes('_applyMonsterDot'), writers);
  const memo = new Map();
  const guarded = (n, stack = new Set()) => {
    if (memo.has(n)) return memo.get(n);
    if ((DS.get(n) || []).some((x) => ASK.test(bodyM(x)))) { memo.set(n, true); return true; }
    if (stack.has(n)) return true;   /* a cycle: judged by its way in */
    stack.add(n);
    const cs = [...(CALLERS.get(n) || [])];
    const ok = cs.length > 0 && cs.every((c) => guarded(c, stack));
    stack.delete(n);
    memo.set(n, ok);
    return ok;
  };
  const KNOWN_ROAD = {
    _legacyThornsReflect: 'hits.js: a monster\'s blow reflected (legacy thorns); a monster never aims at a page out of step (wheelzone.js asks _wheelInStep), so no blow reaches one',
  };
  const found = new Set(writers.filter((n) => !guarded(n)));
  census('§327', 'functions that lower a monster\'s hp on a road that never asks the Wheel\'s step', found, KNOWN_ROAD, 1);
  check('§327: the doors ask it themselves (_handleMonsterDamage, _applyMonsterDot)', ['_handleMonsterDamage', '_applyMonsterDot'].every((n) => (DS.get(n) || []).some((x) => ASK.test(bodyM(x)))));
}

process.exit(failed ? 1 : 0);
