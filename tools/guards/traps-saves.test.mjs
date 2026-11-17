/* ═══ v2.3.5761: TRAPS INTO GUARDS, SAVES AND WHO A PLAYER IS (card V2 PR 2) ═══
 *
 * Grand plan step 8.2, card V2's second batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.
 *
 * TRAPS §6 (the rule): precheck's proto-safety heuristic (its own id-shaped index, read from tools/dev/precheck.mjs), over every file of server/src/ as a FAIL: a plain `{}` with an id-shaped index within five lines carries `proto-ok:<why>` or is listed; precheck keeps its warning. Break: server/src/party.js: `const seen = {}; seen[pid] = 1;` in _partyStore -> FAIL (tried 2026-11-17).
 * TRAPS §76 (the rule): every `storage.list(` in server/src/ names a `limit` (in its argument, or the options object it is handed) or is listed; a listed one the join reaches (through this.* calls from `_handleJoin`) is listed apart, and that list only falls. Break: server/src/daybook.js: the `limit` of bookRead's list gone -> FAIL (tried 2026-11-17).
 * TRAPS §209 (the rule): the places that send `reason: 'auth'` are a closed list (two in the join, one in the account's login), by function and count. Break: server/src/join.js: the device refusal's `reason: 'device'` made `'auth'` -> FAIL (tried 2026-11-17).
 * TRAPS §276 (the rule): every field of a player's `ps` compared with the time in a refusal (`if (now - ps.x < N) return`) is in _saveRpg's list (read off its put in persistence.js) or listed with why; the listed count only falls. Break: server/src/dice.js: `if (now - (ps._diceDayAt || 0) < 864e5) return;` in _handleDice -> FAIL (tried 2026-11-17).
 * TRAPS §298 (the rule): every function of the live levers' server files (admin, devtools, the restores) that writes with a `rpg:` key reads `playerState[...]` before its write. Break: server/src/playerrestore.js: the `room.playerState[pid]` refusal gone from playerRestore -> FAIL (tried 2026-11-17).
 *
 * HOW IT READS.  The worker's files are card N's walker's (server/test/
 * src-walk.mjs `srcFiles`), compiled without comments (lib/codeOnly.mjs),
 * strings blanked (lib/maskCode.mjs), one function at a time
 * (lib/fnSpans.mjs).  §6 reads the files' own lines, as precheck does (its
 * `proto-ok` marks are comments).  Lists name a function (and what it
 * names: a variable, a prefix, a field), never a file and line.
 *
 * §6, §76 AND §276 ARE CENSUSES (the plan's rule 3): a place not listed
 * fails, the listed count only falls, and a listed place that is gone fails
 * until its name comes off.  Each one stepped in today is under Found in
 * docs/plan/status/V2.md, for the card whose file it is.
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §6    party.js _partyStore: `const seen = {}; seen[pid] = 1;`       -> FAIL §6
 *         precheck.mjs: `const idIndex` renamed                         -> FAIL §6 (precheck's rule read)
 *   §76   daybook.js bookRead: `limit: want` gone                       -> FAIL §76
 *         join.js: `this._metricsMaybe(Date.now());` beside the sweeps -> FAIL §76 join
 *   §209  join.js: the device refusal's reason made 'auth'             -> FAIL §209
 *   §276  dice.js _handleDice: a refusal on `ps._diceDayAt`            -> FAIL §276
 *   §298  playerrestore.js playerRestore: the playerState refusal gone -> FAIL §298
 *
 * Run from the repository's root: node tools/guards/traps-saves.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { filesOf } from './lib/filesOf.mjs';
import { spansOf, innerFn, closeOf } from './lib/fnSpans.mjs';
import { srcFiles } from '../../server/test/src-walk.mjs';

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

const FILES = srcFiles().map((f) => 'server/src/' + f);
const built = codeOf(['server/src']);
const code = new Map(FILES.map((f) => [f, built.get(f)]));
check(`the worker's files compile (${FILES.length})`, FILES.every((f) => typeof code.get(f) === 'string'), FILES.filter((f) => typeof code.get(f) !== 'string'));
const masked = new Map();
const spans = new Map();
const M = (f) => { if (!masked.has(f)) { const m = maskCode(code.get(f)); masked.set(f, m); spans.set(f, spansOf(m)); } return masked.get(f); };
for (const f of FILES) M(f);

/* ── §6: a plain {} near an id-shaped index ── */

/* Stepped in today, `function: variable` (precheck has warned on each when its file changed) */
const PROTO_KNOWN = {
  '_watchWipe: data': 'charwatch.js',
  '_capePublicStatus: capes': 'eventcapes.js',
  '_capeAdminRoute: out': 'eventcapes.js',
  'vote: ticket.voters': 'feedback.js (the Feedback object)',
  'sweep: voters': 'feedback.js (the Feedback object)',
  '_partyStore: p.meta[pid]': 'party.js',
  '_partyOnRejoin: p.meta[playerId]': 'party.js',
  '_sparSpawn: _buffs': 'spar.js',
};
{
  const pre = readFileSync(join(ROOT, 'tools/dev/precheck.mjs'), 'utf8');
  const def = /const idIndex = (\/.+\/);\n/.exec(pre);
  check('§6: precheck\'s proto-safety rule is read from tools/dev/precheck.mjs (`const idIndex = /.../;`)', !!def);
  const idIndex = def ? new RegExp(def[1].slice(1, -1)) : /(?!)/;
  const LIT = /(?:=|:)\s*\{\s*\}/;
  const DEF = /^\s*(?:export\s+)?(?:static\s+)?(?:async\s+)?(?:function\s*\*?\s*)?([\w$]+)\s*\([^;]*\)\s*\{\s*(?:\/[*/].*)?$/;
  const found = new Set();
  let marked = 0;
  for (const f of FILES) {
    const lines = readFileSync(join(ROOT, f), 'utf8').split('\n');
    for (let li = 0; li < lines.length; li++) {
      if (!LIT.test(lines[li])) continue;
      if (!lines.slice(Math.max(0, li - 5), Math.min(lines.length, li + 6)).some((l) => idIndex.test(l))) continue;
      if (/proto-ok\b/.test(lines[li])) { marked++; continue; }
      let fn = '(top)';
      for (let k = li; k >= 0; k--) {
        const d = DEF.exec(lines[k]);
        if (d && !/^(?:if|for|while|switch|catch|return|with)$/.test(d[1])) { fn = d[1]; break; }
      }
      const v = (/([\w$.\]['"[]+)\s*(?:=|:)\s*\{\s*\}/.exec(lines[li]) || [])[1];
      found.add(fn + ': ' + v);
    }
  }
  check(`§6: the scan reads the places precheck's rule matches (${marked} marked proto-ok)`, marked >= 10, marked);
  census('§6', 'plain {} literals near an id-shaped index, not marked proto-ok', found, PROTO_KNOWN, 8);
}

/* ── §76: every storage.list names a limit; none on the join path ── */

/* `function: prefix`, stepped in today: each one a whole prefix in one read */
const LIST_KNOWN = {
  '_accAdminDays: accday:': 'accuracy.js, the owner\'s page', '_accDayFlush: accday:': 'accuracy.js',
  '_adminFetch: rpgsnap:': 'admin.js, the owner\'s page (one player\'s copies)', '_rpgSnapshotMaybe: rpgsnap:': 'admin.js (one player\'s copies)',
  '_chainScoreAdminRoute: chain_score:': 'chainscore.js, the owner\'s page', '_chatModAdminRoute: chat_report:': 'chatmod.js, the owner\'s page',
  '_clansEnsure: clan:': 'clans.js', '_clansEnsure: clan_war:': 'clans.js',
  '_duelEscrowSweep: duelEscrow:': 'duel.js', '_arenaBroadcastStakeBoard: arena_stake:': 'gladiator.js (one tournament)',
  '_arenaEntrySweep: arena_entry:': 'gladiator.js', '_arenaPlanScan: arena_settle:': 'gladiator.js',
  '_arenaSettleStakes: arena_stake:': 'gladiator.js (one match)', '_arenaStakeSweep: arena_settle:': 'gladiator.js',
  '_arenaStakeSweep: arena_stake:': 'gladiator.js', '_topRead: gone:': 'leaderboard.js (the Leaderboard object)',
  'faceless: player:': 'leaderboard.js (the Leaderboard object)', 'markGone: gone:': 'leaderboard.js (the Leaderboard object)',
  '_metricsMaybe: metrics:': 'liveops.js (the trap\'s own: off the join since)', '_mktEnsureIndex: mkt_order:': 'market.js',
  '_ensureIndex: order:': 'marketplace.js (the old Marketplace object)', '_resetCharacterData: oplog:questitem:': 'persistence.js (one player\'s)',
  '_silenceEnsure: silence:': 'silence.js', '_bountySweep: bounty:': 'threat.js', '_trade2WpnSweep: trade2wpn:': 'trade2.js',
};
/* the listed ones a join reaches today (the trap's "never on the join path"): only falls */
const JOIN_KNOWN = ['_accDayFlush: accday:', '_rpgSnapshotMaybe: rpgsnap:', '_clansEnsure: clan:', '_clansEnsure: clan_war:',
  '_duelEscrowSweep: duelEscrow:', '_arenaEntrySweep: arena_entry:', '_arenaStakeSweep: arena_settle:', '_arenaStakeSweep: arena_stake:',
  '_silenceEnsure: silence:', '_bountySweep: bounty:', '_trade2WpnSweep: trade2wpn:'];
const defs = new Map();
for (const f of FILES) {
  const m = masked.get(f);
  for (const fn of spans.get(f).fns) {
    if (fn.name === '=>') continue;
    if (!defs.has(fn.name)) defs.set(fn.name, []);
    defs.get(fn.name).push(m.slice(fn.a, fn.b + 1));
  }
}
{
  const LIMIT = /(?<![\w$])limit(?![\w$])/;
  const found = new Set();
  let lists = 0;
  for (const f of FILES) {
    const c = code.get(f);
    const m = masked.get(f);
    const { fns } = spans.get(f);
    for (const x of m.matchAll(/storage\.list\(/g)) {
      lists++;
      const o = x.index + x[0].length - 1;
      const arg = c.slice(o + 1, closeOf(m, o));
      const fn = innerFn(fns, x.index);
      const body = fn ? m.slice(fn.a, fn.b) : m;
      let lim = LIMIT.test(arg);
      if (!lim && /^[\w$]+$/.test(arg)) {
        const d = new RegExp('(?<![\\w$.])' + arg.replace(/\$/g, '\\$') + '=\\{').exec(body);
        const at = d ? body.indexOf('{', d.index) : -1;
        lim = (at >= 0 && LIMIT.test(body.slice(at, closeOf(body, at)))) || new RegExp('(?<![\\w$])' + arg.replace(/\$/g, '\\$') + '\\.limit=').test(body);
      }
      if (lim) continue;
      const pre = /prefix:([\w$.]+|"[^"]*")/.exec(arg);
      const prefix = !pre ? arg.slice(0, 40) : pre[1].startsWith('"') ? pre[1].slice(1, -1) : pre[1];
      const named = prefix === 'SILENCE.KEY' ? 'silence:' : prefix;
      found.add((fn ? fn.name : '(top)') + ': ' + named);
    }
  }
  check(`§76: the scan reads every storage.list of the worker (${lists})`, lists >= 40, lists);
  census('§76', 'storage.list calls that name no limit', found, LIST_KNOWN, 25);
  /* the join's reach: this.* calls from _handleJoin, eight deep */
  const reach = new Set();
  const q = [['_handleJoin', 0]];
  while (q.length) {
    const [n, d] = q.shift();
    if (reach.has(n) || d > 8) continue;
    reach.add(n);
    for (const b of defs.get(n) || []) for (const x of b.matchAll(/this\.([\w$]+)\(/g)) if (defs.has(x[1])) q.push([x[1], d + 1]);
  }
  check(`§76: the join's reach is read from _handleJoin (${reach.size} functions)`, reach.size >= 100, reach.size);
  const onJoin = new Set([...found].filter((k) => reach.has(k.slice(0, k.indexOf(':')))));
  const freshJoin = [...onJoin].filter((k) => !JOIN_KNOWN.includes(k));
  check(`§76: unbounded lists the join reaches: ${onJoin.size}, none new (the trap: never on the join path)`, freshJoin.length === 0, freshJoin);
  check(`§76: the listed join ones are still reached (a moved one comes off JOIN_KNOWN) and number ${JOIN_KNOWN.length} or fewer than 11`,
    JOIN_KNOWN.every((k) => onJoin.has(k)) && JOIN_KNOWN.length <= 11, JOIN_KNOWN.filter((k) => !onJoin.has(k)));
}

/* ── §209: who sends reason 'auth' ── */

const AUTH_PLACES = { _handleJoin: 2, _accountLogin: 1 };
{
  const got = Object.create(null);
  for (const f of FILES) {
    const c = code.get(f);
    const { fns } = spans.get(f);
    for (const x of c.matchAll(/reason:"auth"|reason:'auth'|reason:`auth`/g)) {
      const fn = innerFn(fns, x.index);
      const n = fn ? fn.name : '(top)';
      got[n] = (got[n] || 0) + 1;
    }
  }
  check('§209: `reason: \'auth\'` is sent from the closed list (two in the join, one in the login): a refusal of the right key has its own reason',
    JSON.stringify(Object.entries(got).sort()) === JSON.stringify(Object.entries(AUTH_PLACES).sort()), { got, want: AUTH_PLACES });
}

/* ── §276: a limit stamped on ps lasts one connection ── */

/* the fields compared with the time in a refusal, not saved, by why */
const LIMIT_KNOWN = {
  /* the fight of the moment: a blow's or a state's timer; a rejoin ends the fight */
  _abilCd: 'fight', _arrowBlastCdUntil: 'fight', _burstCdUntil: 'fight', _dazeUntil: 'fight',
  _godUntil: 'fight', _gustUntil: 'fight', _lastDealtAt: 'fight', _lungeAt: 'fight',
  _nmlLastHitAt: 'fight', _stuckUntil: 'fight', _thornRecoilAt: 'fight', _zoneEntryGraceUntil: 'fight', _guardBrokenUntil: 'fight',
  _sprintAt: 'fight (a sprint\'s metering)', _gearLockUntil: 'fight (the threat\'s gear lock)', _threatCdUntil: 'fight (a threat\'s)',
  /* the life phase: a death across a join is its note, life:<pid> */
  respawnAt: 'life',
  /* a request's pace, stamped on ps: a rejoin forgets it (the trap's own
     shape; each under Found: a room Map, as _pointsResetAts, if its cost counts) */
  _diceAt: 'pace', _dropAt: 'pace', _lastAceFlipAt: 'pace', _lastDailySpinAt: 'pace',
  _lastGambleAt: 'pace', _lastRewardsGetAt: 'pace', _lastSalvageAt: 'pace', _raceStartedAt: 'pace', _restAt: 'pace',
};
{
  const p = masked.get('server/src/persistence.js') || '';
  const at = (code.get('server/src/persistence.js') || '').indexOf('put("rpg:"+playerId,{');
  check('§276: _saveRpg\'s put is found in persistence.js', at >= 0);
  const open = at + 'put("rpg:"+playerId,'.length;
  const putLit = at < 0 ? '' : code.get('server/src/persistence.js').slice(open, closeOf(p, open));
  const saved = new Set();
  { let d = 0; for (let k = 0; k < putLit.length; k++) { const ch = putLit[k];
    if ('{[('.includes(ch)) d++; else if ('}])'.includes(ch)) d--;
    else if (d === 1 && (putLit[k - 1] === '{' || putLit[k - 1] === ',')) { const r = /^([\w$]+)(?=[:,}])/.exec(putLit.slice(k)); if (r) saved.add(r[1]); } } }
  check(`§276: _saveRpg's fixed list read off its put (${saved.size} fields)`, saved.size >= 40 && saved.has('coins'), saved.size);
  const PS = String.raw`(?<![\w$.])(?:_?t?ps|ps[A-Z0-9][\w$]*|[\w$]+Ps)`;
  const NOW = String.raw`(?:Date\.now\(\)|now|_now|nowMs)`;
  const res = [
    new RegExp(NOW + String.raw`-\(?` + PS + String.raw`\.([\w$]+)`, 'g'),
    new RegExp(PS + String.raw`\.([\w$]+)(?:\|\|0\)?)?(?:>=|<=|>|<)` + NOW + '(?![\\w$])', 'g'),
    new RegExp(NOW + String.raw`(?:>=|<=|>|<)\(?` + PS + String.raw`\.([\w$]+)`, 'g'),
  ];
  const REFUSE = /^[^;{}]*\)\s*(?:return|\{\s*return|continue|throw)|^[^;{}]*\)\s*\{[^}]*(?:return|_send)/;
  const found = new Set();
  let compares = 0;
  for (const f of FILES) {
    const m = masked.get(f);
    for (const r of res) for (const x of m.matchAll(r)) {
      compares++;
      if (!REFUSE.test(m.slice(x.index, x.index + 200))) continue;
      if (!saved.has(x[1])) found.add(x[1]);
    }
  }
  check(`§276: the scan reads the fields of ps compared with the time (${compares})`, compares >= 50, compares);
  census('§276', 'fields of ps a refusal compares with the time, not in _saveRpg\'s list', found, LIMIT_KNOWN, 30);
}

/* ── §298: an admin write over a record reads the room first ── */
{
  const levers = filesOf('liveops').filter((f) => f.startsWith('server/src/'));
  const writers = [];
  const bad = [];
  for (const f of levers) {
    const c = code.get(f);
    const m = masked.get(f);
    for (const fn of spans.get(f).fns) {
      if (fn.name === '=>') continue;
      const raw = c.slice(fn.a, fn.b);
      const mm = m.slice(fn.a, fn.b);
      if (!/"rpg:"|'rpg:'|`rpg:/.test(raw)) continue;
      const w = /(?:storage\.put|storage\.delete|\.put)\(/.exec(mm);
      if (!w) continue;
      writers.push(fn.name);
      if (!/playerState\[/.test(mm.slice(0, w.index))) bad.push(fn.name);
    }
  }
  check(`§298: the levers' functions that write with a rpg: key are found (${writers.join(', ')})`, writers.includes('playerRestore'), writers);
  check('§298: each reads playerState[...] before its write (a body left in a fight has no socket and saves when it goes)', bad.length === 0, bad);
}

process.exit(failed ? 1 : 0);
