/* ═══ v2.3.5320: TRAPS INTO GUARDS, THE SERVER'S WORD AND THE SAVED CHARACTER (card V PR 1) ═══
 *
 * Grand plan step 8.2: each trap of docs/TRAPS.md held by a check with a
 * break proof.  This file holds the two of card V's first batch that read
 * source (the third, §3, is the worker's behaviour: server/test/party.test.mjs
 * §13).  The census of what holds each trap: docs/plan/census/traps.md.
 *
 * TRAPS §2 (the rule): every field a handler writes on a player's `ps` under server/src/ is in _saveRpg's fixed list (persistence.js) or in SCRATCH below (memory only, or a record of its own, on purpose); the count in neither only falls. Break: server/src/dice.js: `ps.diceWins = (ps.diceWins || 0) + 1;` in _handleDice -> FAIL (tried 2026-11-14).
 * TRAPS §1 (the rule): card N's wire table (server/src/wire/, held to the code by wire-table.test) has no `arena_bet` row in any direction, the server's code names it nowhere, and one place in src/'s code names it: the router's case, which only breaks. Break: server/src/wire/relays.js: an `arena_bet` row beside 'campfire_lit's, with `'arena_bet',` back in RELAY.TYPES -> FAIL (tried 2026-11-14).
 *
 * §2, HOW IT READS.  The code of every file under server/src/, comments
 * dropped (lib/codeOnly.mjs) and strings blanked (lib/maskCode.mjs).  A
 * player's state is any name `ps`, `_ps`, `tps`, `psA`, `targetPs`... (the
 * room's one convention for it), and any other name bound to
 * `this.playerState[...]`, inside its own block.  A write is `NAME.field`
 * with `=`, `+=`, `||=`... or `++`, `this.playerState[id].field = `, the keys
 * of `Object.assign(ps, {...})` and of the join's `this.playerState[id] =
 * {...}`.  Not read: a write by a computed name (`ps[field] = `: the gear
 * slots and stashes, all saved) and the join's allowlisted copy of the
 * phone's own data (`...cleanJoinData`: the wire's again at every join).
 * The saved list is read off the `put('rpg:' + playerId, {...})` itself.
 * v2.3.5327 (card V PR 8): the files are card N's walker's
 * (server/test/src-walk.mjs `srcFiles`: every .js and .mjs file in depth,
 * its LEFT_OUT folders skipped, the vendored signer), one list of the
 * worker's files for every door (the plan's rule 2: a shape is designed
 * once), compiled by codeOnly's one build.
 *
 * §2 IS A CENSUS (the plan's rule 3): a field in neither list is KNOWN
 * (stepped in today, each one under Found in docs/plan/status/V.md) or new;
 * their count may only fall (FIELD_LINE), and only the gatekeeper makes it
 * strict.  A new field: put it in _saveRpg's list (and the join's restore:
 * TRAPS §2), or, if it is meant to be lost at a leave, in SCRATCH with why.
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §2  server/src/dice.js: `ps.diceWins = (ps.diceWins || 0) + 1;`       -> FAIL §2 census (2 > 1)
 *       the same through another name, `const me = this.playerState[pid];
 *       me.diceWins = 1;`, and as `this.playerState[pid].diceWins = 1;`  -> FAIL §2 census
 *       (a rename does not dodge it: the scan follows every name bound to
 *       the room's playerState)
 *   §2  persistence.js: drop `svKills` from the put                       -> FAIL §2 census (svKills)
 *   §1  wire/relays.js: an `arena_bet` row                                -> FAIL §1 table
 *       relay.js: `'arena_bet',` back in RELAY.TYPES (and its row)        -> FAIL §1 server
 *       (and card N's wire-table guard fails a key with no row)
 *   §1  PartyPanel.jsx: `sendGameEvent('arena_bet', { amount })`          -> FAIL §1 senders
 *   §1  gameEvents.js: `case 'arena_bet': setArenaBets(payload); break;`  -> FAIL §1 ignore
 *
 * Run from the repository's root: node tools/guards/traps-server-word.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode, blockEnd } from './lib/maskCode.mjs';
import { srcFiles } from '../../server/test/src-walk.mjs';   /* v2.3.5327: card N's walker, the one list of the worker's files */

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* ── §2: the fields a player's state is given, against the saved list ── */

/* Memory only on purpose, or kept in a record of its own: each one a
   field the scan finds written and _saveRpg does not write.  Grouped by
   why.  The room's convention: an underscore field is in-memory scratch
   (abilities.js, persistence.js), with the saved exceptions in the put. */
const SCRATCH = {
  /* where you are and what you are doing: the move's own fields, sent with
     every move; the place across a leave is lastplace.js's */
  move: ['x', 'y', 'z', 'd', 'f', 'vx', 'vy', 'ba', 'po', 'ex', 'eqc', 'eql', 'eqs', 'lastMoveAt',
    '_exAt', '_exX', '_exY', '_exAttackAt', '_mp', '_mvBudget', '_mvBudgetAt', '_mvFollow',
    '_wheelArrive', '_wheelBack', '_wheelSizes', '_entryGraceAt', '_zoneEntryGraceUntil',
    '_rollKind', '_rollUntil', '_fireLit', '_guardDownAt'],
  /* the fight of the moment: its phases, timers and running sums */
  fight: ['blocking', 'blockStartT', 'dodging', 'dmgFromMonster', 'lastDamageAt', '_abilCd', '_abilFrom',
    '_arrowBlastCdUntil', '_burstCdUntil', '_chillUntil', '_cursedUntil', '_dazeImmuneUntil', '_dazeUntil',
    '_dmgFromPlayer', '_evadeAcc', '_freezeImmuneUntil', '_freezeUntil', '_fs', '_pfb', '_guardBrokenUntil',
    '_gustLeft', '_gustUntil', '_hitBucket', '_lastCollisionMana', '_lastDealtAt', '_lastStandReadyAt',
    '_luckyAcc', '_lungeAt', '_monHitCad', '_pveSpec', '_pvpSpecLeft', '_pvpSpecUntil', '_resonanceStreak',
    '_secondWindReadyAt', '_soakUntil', '_staggerUntil', '_stuckImmuneUntil', '_stuckUntil',
    '_thornRecoilAt', '_threatCdUntil', '_wst', '_deathShield', '_godUntil', '_heapBurnAt'],
  /* the life phase (life.js _lifeTo) and the death's own; a death across a
     join is its note, `life:<pid>` */
  life: ['life', 'dead', 'dying', 'respawnAt', '_deathKeepsBag', '_lifeResumed', '_lootRecovered'],
  /* the session: a socket's, gone with it */
  session: ['disconnected', 'lingering', '_lingerUntil', '_lingerZ', '_bodyWait', '_testMode', '_regenDirty',
    '_regenSaveAt', '_spar', 'name', '_lookWholeSeq', '_petWire', '_shieldKnown', '_gearLockNotifAt',
    '_gearLockUntil', '_p3FreshRespec', '_questGrantOverflow', '_questWeaponUnfit', '_apOnceDirty',
    '_apOnceFailed', '_arenaMatch', '_race', '_raceStartedAt', '_ride', '_rideAt', '_ridePid', '_restAt',
    '_dg', '_dgXp', '_cookHits'],
  /* a sprint's metering (sprint.js) */
  sprint: ['_sprintAt', '_sprintLastPaid', '_sprintOwed', '_sprintPrevPaid', '_sprintStep', '_sprintTally'],
  /* No man's land's choice and its last hit (nomansland.js) */
  nml: ['_nml', '_nmlAllowAt', '_nmlChoiceAt', '_nmlLastHitAt', '_nmlLastHitBy', '_nmlLockAskAt'],
  /* a rate limit of the session (a room Map keeps the ones that must
     outlive it: pointsreset.js) */
  pace: ['_diceAt', '_dropAt', '_lastAceFlipAt', '_lastCookAt', '_lastDailySpinAt', '_lastGambleAt',
    '_lastRewardsGetAt', '_lastSalvageAt', '_pointsResetAt'],
  /* worked out again from what is saved, or claimed again by the phone at
     each join and clamped (grids.js "session-only equipment-derived") */
  derived: ['manaBlocks', 'stamBlocks', 'def', 'amuletHpRegen', 'amuletStaminaRegen'],
  /* kept in a record of its own (registered in ARCHITECTURE-HANDOFF's
     rule-2 table), put on `ps` when it loads */
  ownRecord: ['apOnce' /* aponce:<pid> */, 'bro', 'broN' /* the Hemi Bro link */, 'allyTag' /* the party's */],
};
/* Stepped in today: written meaning to last, in neither list.  Each is a
   line under Found in docs/plan/status/V.md, for the card whose file it is. */
const KNOWN = {
  capeOff: 'eventcapes.js _handleCapeEquip: "a PREFERENCE ... on the player\'s own blob", saved by _saveRpgPaced, '
    + 'but not in _saveRpg\'s list nor read back at the join: a cape taken off is worn again after a rejoin',
};
/* the count in neither SCRATCH nor the saved list: only falls (rule 3) */
const FIELD_LINE = 1;

const ID = String.raw`[A-Za-z_$][\w$]*`;
const OP = String.raw`(?:=(?![=>])|\+=|-=|\*\*=|\*=|\/=|%=|\|\|=|&&=|\?\?=|\|=|&=|\^=|<<=|>>>=|>>=|\+\+|--)`;
const PS_NAME = /^(?:_?t?ps|ps[A-Z0-9][\w$]*|[\w$]+Ps)$/;
const esc = (s) => s.replace(/\$/g, '\\$');

/* the top-level keys of the object literal whose `{` is at `open` */
function literalKeys(m, open) {
  const keys = [];
  let depth = 0;
  for (let k = open; k < m.length; k++) {
    const c = m[k];
    if (c === '{' || c === '[' || c === '(') { depth++; continue; }
    if (c === '}' || c === ']' || c === ')') { if (--depth === 0) return keys; continue; }
    if (depth === 1 && (m[k - 1] === '{' || m[k - 1] === ',')) {
      const r = new RegExp('^(' + ID + ')(?::|,|})').exec(m.slice(k, k + 80));
      if (r) keys.push(r[1]);
    }
  }
  return keys;
}

function scanServer() {
  /* v2.3.5327: the worker's files are card N's walker's; codeOnly compiles them */
  const walked = srcFiles().map((f) => 'server/src/' + f);
  const built = codeOf(['server/src']);
  const code = new Map(walked.filter((f) => built.has(f)).map((f) => [f, built.get(f)]));
  if (code.size !== walked.length) throw new Error('codeOnly gave no code for: ' + walked.filter((f) => !built.has(f)).join(', '));
  const fields = new Map();   /* field -> Set(file) */
  const add = (f, file) => { if (!fields.has(f)) fields.set(f, new Set()); fields.get(f).add(file); };
  for (const [file, c] of code) {
    const m = maskCode(c);
    const spans = [];   /* [name, from, to] */
    const psNames = new Set(['ps']);
    for (const x of m.matchAll(new RegExp('(?<![\\w$.])(?:\\+\\+|--)?(' + ID + ')\\.' + ID, 'g'))) if (PS_NAME.test(x[1])) psNames.add(x[1]);
    for (const n of psNames) spans.push([n, 0, m.length]);
    /* `q=this.playerState[id]`, `ps=this.playerState&&this.playerState[id]`,
       `q=id?this.playerState[id]:null`: a name whose value is a player */
    for (const x of m.matchAll(new RegExp('(?<![\\w$.])(' + ID + ')=(?:[\\w$.&|!]{1,60}(?:&&|\\?))?this\\.playerState\\[[^\\[\\]]*\\](?=[;,):]|\\|\\|)', 'g'))) {
      if (!PS_NAME.test(x[1])) spans.push([x[1], x.index, blockEnd(m, x.index)]);
    }
    for (const [n, a, b] of spans) {
      const part = m.slice(a, b);
      for (const x of part.matchAll(new RegExp('(?<![\\w$.])' + esc(n) + '\\.(' + ID + ')' + OP, 'g'))) add(x[1], file);
      for (const x of part.matchAll(new RegExp('(?<![\\w$.])(?:\\+\\+|--)' + esc(n) + '\\.(' + ID + ')(?![\\w$.\\[(])', 'g'))) add(x[1], file);
      for (const x of part.matchAll(new RegExp('Object\\.assign\\(' + esc(n) + ',\\{', 'g'))) for (const k of literalKeys(part, x.index + x[0].length - 1)) add(k, file);
    }
    for (const x of m.matchAll(new RegExp('this\\.playerState\\[[^\\[\\]]*\\]\\.(' + ID + ')' + OP, 'g'))) add(x[1], file);
    for (const x of m.matchAll(/this\.playerState\[[^[\]]*\]=\{/g)) for (const k of literalKeys(m, x.index + x[0].length - 1)) add(k, file);
  }
  const p = code.get('server/src/persistence.js') || '';
  const at = p.indexOf('put("rpg:"+playerId,{');
  const saved = at < 0 ? [] : literalKeys(maskCode(p), at + 'put("rpg:"+playerId,'.length);
  return { fields, saved, code };
}

const { fields, saved, code } = scanServer();
{
  const savedSet = new Set(saved);
  check(`§2: _saveRpg's fixed list read off its put (${saved.length} fields)`,
    saved.length >= 40 && savedSet.has('coins') && savedSet.has('_econ'), saved);
  check(`§2: the scan finds the fields a handler writes on a player (${fields.size})`,
    fields.size >= 100, fields.size);
  const scratch = new Map();
  for (const [why, list] of Object.entries(SCRATCH)) for (const f of list) {
    if (scratch.has(f)) check(`§2: ${f} is in SCRATCH once`, false, [scratch.get(f), why]);
    scratch.set(f, why);
  }
  const both = [...scratch.keys()].filter((f) => savedSet.has(f));
  check('§2: no field is both saved and memory only', both.length === 0, both);
  const gone = [...scratch.keys(), ...Object.keys(KNOWN)].filter((f) => !fields.has(f));
  check('§2: every field the lists name is still written (a gone one\'s name comes off)', gone.length === 0, gone);
  const neither = [...fields.keys()].filter((f) => !savedSet.has(f) && !scratch.has(f)).sort();
  const fresh = neither.filter((f) => !Object.hasOwn(KNOWN, f));
  check(`§2: fields a player is given that are neither saved nor memory only: ${neither.length}, at or under the line ${FIELD_LINE}`
    + ' (save it in _saveRpg and read it back at the join, or name it in SCRATCH with why)',
    neither.length <= FIELD_LINE,
    fresh.map((f) => `${f}: ${[...fields.get(f)].join(', ')}`).concat(neither.filter((f) => !fresh.includes(f)).map((f) => `${f} (known)`)));
  if (neither.length < FIELD_LINE) console.log(`     (room: ${neither.length} under the line ${FIELD_LINE}; the gatekeeper may lower it)`);
  for (const [f, why] of Object.entries(KNOWN)) if (neither.includes(f)) console.log(`     known: ${f}: ${why}`);
}

/* ── §1: the arena_bet relay stays dead ── */
{
  /* v2.3.5327: card N's wire table, every message a phone and the worker
     trade (wire-table.test holds it to RELAY.TYPES, PRIVILEGED_EVENTS and the
     router's cases): no row of `arena_bet`, in any direction */
  const rows = [];
  for (const f of ['in', 'relays', 'out', 'http']) {
    const m = await import(pathToFileURL(join(ROOT, `server/src/wire/${f}.js`)).href);
    for (const list of Object.values(m)) if (Array.isArray(list)) rows.push(...list);
  }
  const bet = rows.filter((r) => r && /(?:^|:)arena_bet$/.test(String(r.name)));
  check(`§1 table: card N's wire table has no \`arena_bet\` row, relayed, routed or sent (${rows.length} rows, ${rows.filter((r) => r.dir === 'relay').length} relays)`,
    rows.length > 100 && rows.some((r) => r.dir === 'relay') && bet.length === 0, bet.map((r) => r.dir + ' ' + r.name));
  const page = codeOf(['src']);
  const named = [];
  for (const [file, c] of page) {
    for (const x of c.matchAll(/["'`]arena_bet["'`]/g)) named.push({ file, at: x.index, near: c.slice(Math.max(0, x.index - 40), x.index + 40) });
  }
  /* one place in the page's code names it: the router's case that drops it
     (gameEvents.js, found by what it says, never by its path: card B's
     tests-by-system) */
  const caseOnly = named.length === 1
    && /^case\s*"arena_bet"\s*:\s*break\s*;/.test(page.get(named[0].file).slice(page.get(named[0].file).lastIndexOf('case', named[0].at)));
  check('§1 senders: one place in src/\'s code names `arena_bet`', named.length === 1, named);
  check('§1 ignore: ...and it is a case that only breaks (the router drops it)', caseOnly, named.map((n) => `${n.file}: ${n.near}`));
  /* the server sends no `arena_bet` of its own either (a stake is arena_sponsor's) */
  const srv = [];
  for (const [file, c] of code) if (/["'`]arena_bet["'`]/.test(c)) srv.push(file);
  check('§1 server: no file under server/src/ names `arena_bet` in its code', srv.length === 0, srv);
}

process.exit(failed ? 1 : 0);
