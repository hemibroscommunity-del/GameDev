/* ═══ v2.3.5940: TRAPS INTO GUARDS, THE WORKER'S ONE-CASE TRAPS (card V4 PR 1) ═══
 *
 * Grand plan step 8.2, card V4's first batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.  Thirteen traps of the worker's own behaviour,
 * each held until now by ONE case of a server suite; each held here by its
 * RULE, over every file of server/src/ (a scan), a closed list, or the
 * worker's own function run across its inputs (a pure method, no room).
 *
 * TRAPS §145 (the rule): a weapon-bag entry moved into a hand named by the client (`ps[slot] = entry`) is checked for the slot (`_isWeaponSlot`), for being a weapon (`_isGearNotWeapon`) and for its type's slot (`_weaponSlotFor`); a hand named by a variable moved into the weapon bag is a weapon hand (`_isWeaponSlot`, the three names, or a slot made of them); and the three gates answer right for every slot and type. Break: server/src/gear.js: `if (!this._isWeaponSlot(slot)) return;` gone from _handleEquipRequest -> FAIL (tried 2026-11-17).
 * TRAPS §146 (the rule): in every system that keeps a per-player record with a dirty mark (`_<x>MarkDirty`: the daily rewards), a function handed the record that reaches a payment marks it dirty or saves it itself, and every act that loads the record and reaches a payment saves it; today's helpers that do neither listed (a census). Break: server/src/dailyrewards.js: `if (changed) this._drMarkDirty(pid);` gone from _drRollover -> FAIL (tried 2026-11-17).
 * TRAPS §152 (the rule): every group debit (`_escrowDebitGoldTogether`) that takes money from two or more players compares each one's amount to a number the accepting player's own message sent (`payload.`), refusing a stake above it. Break: server/src/duel.js: `if (wager > shown) return declineBoth();` gone -> FAIL (tried 2026-11-17).
 * TRAPS §153 (the rule): the death's wipe and pile, run across random bags, shields and both kinds of death, keep plus drop exactly what the bag held for every key; and every reader of the shield (`_deathShield`) is a listed function. Break: server/src/index.js: _wipeInventoryOnDeath keeps the whole shield[k] (the `Math.min(..., have)` gone) -> FAIL (tried 2026-11-17).
 * TRAPS §154 (the rule): every key built from a place (`"<family>_" + zone / land / home`) anywhere in server/src is gated in its function on a fixed table (`hasOwnProperty.call(TABLE, x)`, `own(TABLE, x)`, `.has`, `.includes`, or a loop over the table's keys); today's ungated ones listed (a census). Break: server/src/index.js: `if (!Object.prototype.hasOwnProperty.call(ZONES, zoneId)) return null;` gone from _rollShardForKill -> FAIL (tried 2026-11-17).
 * TRAPS §155 (the rule): every status, phase or state guard on the way to a take (a gold, bag or stash take or an escrow debit, in the taker or the function that calls it) is an allow-list (`!== 'the one allowed'`), never a deny of one state (`=== 'running'` then return). Break: server/src/gladiator.js: `this._arena.status !== 'gathering'` made `=== 'running'` in _arenaJoin -> FAIL (tried 2026-11-17).
 * TRAPS §156 (the rule): every refund keyed only on lasting ids (a tournament, a match, a player) carries a counter suffix (`this._<x>Sfx(n)`), the debit of the same act carries the same one, and every such suffix function gives a different id for every n; today's exceptions listed with why. Break: server/src/gladiator.js: _arenaEntrySfx returns '' for every n -> FAIL (tried 2026-11-17).
 * TRAPS §159 (the rule): every join cap (a `*BOOTSTRAP*` constant, or a clamp function made of one) is applied to the phone's claim (`msg.data`, a claim, or a name made from them), or to the server's record only under its capture stamp (`Captured`). Break: server/src/amulet.js: _gemsAdoptOnJoin calls `this._sanitizeGems(ps.lifeSkills.gems)` with its default cap always -> FAIL (tried 2026-11-17).
 * TRAPS §161 (the rule): in every function of server/src that writes an op stamp (`_opStamp`), no await comes between two of its writes (a put, a stamp, a save, a credit, a gold, bag or stash door), an awaited write included, unless the first's block returns before the second; today's places listed (a census). Break: server/src/eventcapes.js: `this._saveRpg(session.id, ps);` moved below `await this._opStamp(opKey)` in _handleCapeRedeem -> FAIL (tried 2026-11-17).
 * TRAPS §184 (the rule): no function awaits a credit (`_creditPlayer`, `_creditWith`) after a take of its own (a debit and its credit in one run, `_creditLiveTogether`), counted per function against today's list (a census); and every write of a mailbox is in its queue (§219's scan). Break: server/src/trade2.js: the `_creditLiveTogether(...)` run replaced by an awaited `_creditPlayer` per credit after the debits (`for (const c of credits) await this._creditPlayer(c.pid, c.entry); const together = null;`) -> FAIL (tried 2026-11-17).
 * TRAPS §219 (the rule): every write of a queued record (the mailbox `inbox:`, the login record `auth:`) is inside its queue (`_inboxSerial`, `_authSerial`) or in a function reached only through it, and a new queue names its record; today's writers outside listed (a census). Break: server/src/join.js: _verifyJoinAuth calls _verifyJoinAuthNow directly, not through _authSerial -> FAIL (tried 2026-11-17).
 * TRAPS §242 (the rule): the gem set's XP counts what a player MADE: the callers of `_gemMade` are a closed list of making roads, only the listed functions touch `gemsUnpaid`, only `_gemSetXp` pays the set's Enchanting XP, and `_gemSetXp` run across random makes and sets pays exactly once per gem made and never for one not made. Break: server/src/weapongem.js: _gemSetXp pays WEAPON_GEM.XP with nothing owed (`if (owed < 1) { this._addLifeSkillXp(ps, 'enchanting', WEAPON_GEM.XP); return { xp: WEAPON_GEM.XP }; }`) -> FAIL (tried 2026-11-17).
 * TRAPS §275 (the rule): every cache of server/src that evicts on a size cap and whose entries are written to storage either re-reads storage on a miss or spares an online player's entry; and `_botfpRecord`, run past its cap with random players online, never drops an online player's record. Break: server/src/botfp.js: _botfpRecord's `keep` made `() => false` (evict the oldest even when online) -> FAIL (tried 2026-11-17).
 *
 * HOW IT READS.  The code of every file under server/src/ (comments dropped:
 * lib/codeOnly.mjs; strings blanked: lib/maskCode.mjs, the raw output read
 * at the same places for a string's words), one function at a time
 * (lib/fnSpans.mjs).  Lists name a function, never a file and line; every
 * scan checks that the names it reads are still there, so a rename turns it
 * red, never silently green.  Four rules run the worker's own pure methods
 * on a bare object (server/src/index.js's GameRoom prototype, gear.js,
 * weapongem.js; no room, no storage): §145's gates, §153's death, §156's
 * suffixes, §242's XP, §275's eviction.
 *
 * ALL CENSUSES (the plan's rule 3): a place not listed fails, the listed
 * count only falls, a listed place that is gone fails until its name comes
 * off.  Each known one is under Found in the card's notes.
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy (a worktree), then undone:
 *   §145  gear.js _handleEquipRequest: `if (!this._isWeaponSlot(slot)) return;` gone
 *              -> FAIL §145: a bag entry put into a hand checks the slot ... (_handleEquipRequest: ps[slot]=stashItem)
 *         gear.js: `_isWeaponSlot` renamed `_isWeaponSlot2` -> FAIL §145: the three gates are methods of the worker
 *   §146  dailyrewards.js _drRollover: `if (changed) this._drMarkDirty(pid);` gone
 *              -> FAIL §146: functions that reach a payment ... 4 today, none new (_drRollover)
 *         dailyrewards.js: `_drMarkDirty` renamed -> FAIL §146: the per-player records with a dirty mark are found
 *   §152  duel.js: `if (wager > shown) return declineBoth();` gone
 *              -> FAIL §152: each amount a group debit takes is refused ... (_interceptDuel: amount wager)
 *         inbox.js: `_escrowDebitGoldTogether` renamed -> FAIL §152: the group debit door ... is defined
 *   §153  index.js _wipeInventoryOnDeath: `const q = Math.floor(Number(shield[k]) || 0);` (no min)
 *              -> FAIL §153: kept + dropped == held ... (bar_iron: held 6, kept 18)
 *         index.js: `_wipeInventoryOnDeath` renamed -> FAIL §153: the death's wipe and pile are methods of the worker
 *   §154  index.js _rollShardForKill: the ZONES gate gone -> FAIL §154: ... 3 today, none new (_rollShardForKill)
 *         index.js: `_rollShardForKill` renamed -> FAIL §154: _rollShardForKill, the trap's own, is read
 *   §155  gladiator.js _arenaJoin: `!== 'gathering'` made `=== 'running'`
 *              -> FAIL §155: no guard on the way to a take refuses one state ... (_arenaJoin)
 *   §156  gladiator.js _arenaEntrySfx: `return '';`  -> FAIL §156: _arenaEntrySfx gives a different id for every n
 *         gladiator.js _arenaJoin: the stamp's `+ this._arenaEntrySfx(n)` gone
 *              -> FAIL §156: the debit of each such act carries the same suffix as its refund
 *   §159  amulet.js _gemsAdoptOnJoin: `this._sanitizeGems(ps.lifeSkills.gems)` -> FAIL §159: every join cap is applied to the phone's claim ...
 *         amulet.js: `_sanitizeGems` renamed -> FAIL §159: the join caps are found ... and the clamps made of them
 *   §161  eventcapes.js _handleCapeRedeem: the save below `await this._opStamp(opKey)`
 *              -> FAIL §161: ... 3 today, none new (_handleCapeRedeem)
 *         eventcapes.js: `_handleCapeRedeem` renamed -> FAIL §161: _handleCapeRedeem, the trap's own, is among them
 *   §184  trade2.js _handleTrade2Confirm: `for (const c of credits) await this._creditPlayer(c.pid, c.entry);
 *         const together = null;` -> FAIL §184: ... none new and none grown (_handleTrade2Confirm 5 -> 6)
 *         inbox.js: `_creditLiveTogether` renamed -> FAIL §184: the swaps' one run ... is defined and called
 *   §219  join.js _verifyJoinAuth: `return this._verifyJoinAuthNow(id, phrase, opts);`
 *              -> FAIL §219: ... 3 today, none new (_deviceRemember, _verifyJoinAuthNow)
 *         inbox.js: `_inboxSerial` renamed -> FAIL §219: every record queue names its record
 *   §242  weapongem.js _gemSetXp: pays with nothing owed -> FAIL §242: _gemSetXp pays 400 once per gem made ... (paid 9600, want 5600)
 *         weapongem.js: `_gemMade` renamed -> FAIL §242: the functions that touch the owed count ... none new
 *   §275  botfp.js _botfpRecord: `const keep = () => false;`
 *              -> FAIL §275: each re-reads storage on a miss or spares ...; and ... never drops an online player's record
 *         botfp.js: `_botfpRecord` renamed -> FAIL §275: the scan finds the evicting caches ...
 *
 * Run from the repository's root: node tools/guards/traps-worker.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { spansOf, innerFn, namedFn, blockAt, otherBranch, closeOf } from './lib/fnSpans.mjs';

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

const code = codeOf(['server/src']);
const masked = new Map();
const spans = new Map();
const M = (f) => { if (!masked.has(f)) { const m = maskCode(code.get(f)); masked.set(f, m); spans.set(f, spansOf(m)); } return masked.get(f); };
for (const f of code.keys()) M(f);
const esc = (s) => s.replace(/[$.*+?()[\]{}|\\^]/g, '\\$&');
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);

/* every named function of server/src: { f, name, a, b } (a..b its body's braces) */
const FNS = [];
for (const f of code.keys()) for (const fn of spans.get(f).fns) if (fn.name !== '=>') FNS.push({ f, ...fn });
const byName = new Map();
for (const x of FNS) { if (!byName.has(x.name)) byName.set(x.name, []); byName.get(x.name).push(x); }
/* the named function a place sits in (an arrow's place is its named function's) */
const namedAt = (f, p) => {
  const n = namedFn(spans.get(f).fns, p);
  return FNS.filter((x) => x.f === f && x.name === n && x.a < p && p < x.b).pop() || null;
};
const bodyOf = (x) => masked.get(x.f).slice(x.a, x.b + 1);
const rawOf = (x) => code.get(x.f).slice(x.a, x.b + 1);
/* the parameters' text of a named function (its default values included) */
const headOf = (x) => { const m = masked.get(x.f); const h = m.lastIndexOf(x.name + '(', x.a); return h < 0 ? '' : m.slice(h, x.a); };
/* every `this.NAME(` call: { f, at, fn } */
const callsOf = (name) => {
  const out = [];
  const re = new RegExp('this\\.' + esc(name) + '\\(', 'g');
  for (const f of code.keys()) for (const x of masked.get(f).matchAll(re)) out.push({ f, at: x.index, fn: namedAt(f, x.index) });
  return out;
};
/* the args of the call whose `(` is at `open`: [{ a, b }] split at depth 0 */
const argsAt = (m, open) => {
  const close = closeOf(m, open);
  const out = [];
  let d = 0, s = open + 1;
  for (let k = open + 1; k < close; k++) {
    const c = m[k];
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') d--;
    else if (c === ',' && d === 0) { out.push({ a: s, b: k }); s = k + 1; }
  }
  if (close > open + 1) out.push({ a: s, b: close });
  return out;
};
/* the statement around p: from the last `;`/`{`/`}` before it to the `;` that ends it */
const stmtAt = (m, p) => {
  let a = p; while (a > 0 && !';{}'.includes(m[a - 1])) a--;
  let b = p, d = 0;
  for (; b < m.length; b++) {
    const c = m[b];
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') { if (d === 0) break; d--; } else if (c === ';' && d === 0) break;
  }
  return { a, b };
};

const { GameRoom } = await imp('server/src/index.js');
const room = () => Object.create(GameRoom.prototype);

/* ── §145: the weapon bag and the hands, both ways ── */
{
  const { WEAPON_HANDS } = await imp('server/src/stash.js');
  const GATES = ['_isWeaponSlot', '_weaponSlotFor', '_isGearNotWeapon'];
  const r = room();
  check('§145: the three gates are methods of the worker (' + GATES.join(', ') + ')', GATES.every((g) => typeof r[g] === 'function'), GATES.filter((g) => typeof r[g] !== 'function'));
  if (GATES.every((g) => typeof r[g] === 'function')) {
    const SLOTS = [...WEAPON_HANDS, 'armor', 'legsArmor', 'shield', 'amulet', 'gear', 'activeSlot', '__proto__', 'constructor', '', null, undefined, 7, 'Weapon'];
    check('§145: _isWeaponSlot is true for the three weapon hands and nothing else', SLOTS.every((s) => r._isWeaponSlot(s) === WEAPON_HANDS.includes(s)),
      SLOTS.filter((s) => r._isWeaponSlot(s) !== WEAPON_HANDS.includes(s)));
    const TYPES = ['bow', 'staff', 'sword', 'greatsword', 'dagger', 'armor', '', null, undefined, '__proto__'];
    const want = (t) => (t === 'bow' ? 'rangedWeapon' : t === 'staff' ? 'staffWeapon' : 'weapon');
    check('§145: _weaponSlotFor names a weapon hand for every type (a bow the ranged, a staff the staff, anything else the melee)',
      TYPES.every((t) => r._weaponSlotFor({ type: t }) === want(t)) && [null, undefined, 5, 'x'].every((w) => r._weaponSlotFor(w) === 'weapon'));
    check('§145: _isGearNotWeapon: a piece with the ledger\'s `prov`, or a gid the minter did not write, is gear; a plain weapon is not',
      r._isGearNotWeapon({ type: 'sword', prov: 'chest' }) && r._isGearNotWeapon({ type: 'sword', gid: 'not-a-gid' })
      && !r._isGearNotWeapon({ type: 'sword', tierMult: 1 }) && !r._isGearNotWeapon(null));
  }
  /* bag -> hand: `REC[K] = V` where V was read from the weapon bag */
  let intoHand = 0;
  const badIn = [];
  /* hand -> bag: a stash give or set into the weapon bag of a V read from `REC[K]` */
  let outOfHand = 0;
  const badOut = [];
  for (const x of FNS) {
    const raw = rawOf(x);
    const b = bodyOf(x);
    for (const w of b.matchAll(/(?<![\w$.])([\w$]+)\[([\w$]+)\]=(?![=>])([\w$]+)[;,})]/g)) {
      const [, , K, V] = w;
      if (!new RegExp('(?:const|let|var)\\s*' + esc(V) + '=[\\w$.]+\\.weaponStash\\[').test(raw)) continue;
      intoHand++;
      const need = [`_isWeaponSlot(${K})`, `_isGearNotWeapon(${V})`, `_weaponSlotFor(${V})`].filter((g) => !b.includes(g));
      if (need.length) badIn.push(`${x.name}: ${w[0]} without ${need.join(', ')}`);
    }
    for (const g of raw.matchAll(/(?<![\w$.])stash(?:Give|Set)\(/g)) {
      const open = g.index + g[0].length - 1;
      const args = argsAt(b, open);
      if (args.length < 3 || raw.slice(args[1].a, args[1].b) !== '"weaponStash"') continue;
      const V = b.slice(args[2].a, args[2].b);
      if (!/^[\w$]+$/.test(V)) continue;
      const from = new RegExp('(?:const|let|var)\\s*' + esc(V) + '=[\\w$.]+\\[([\\w$]+)\\](?:\\|\\|null)?[;,]').exec(b);
      if (!from) continue;
      const K = from[1];
      outOfHand++;
      const kk = esc(K);
      const chain = WEAPON_HANDS.every((h) => new RegExp(kk + '==="' + h + '"').test(raw.slice(0, g.index)));
      const made = new RegExp('(?:const|let)\\s*' + kk + '=([^;]*);').exec(raw);
      /* a slot made of the weapon hands alone: `const slot = t === 'bow' ? 'rangedWeapon' : ... : 'weapon'` */
      const onlyHands = !!made && made[1].includes('?')
        && [...made[1].matchAll(/[?:]\s*"([^"]*)"/g)].length > 0 && [...made[1].matchAll(/[?:]\s*"([^"]*)"/g)].every((s) => WEAPON_HANDS.includes(s[1]));
      if (!(b.includes(`_isWeaponSlot(${K})`) || chain || onlyHands)) badOut.push(`${x.name}: ${V} from a hand ${K} not held to the weapon hands`);
    }
  }
  check(`§145: the scan finds a weapon-bag entry put into a hand named by a variable (${intoHand})`, intoHand >= 1, intoHand);
  check('§145: a bag entry put into a hand checks the slot (_isWeaponSlot), that it is a weapon (_isGearNotWeapon) and its type\'s slot (_weaponSlotFor)', badIn.length === 0, badIn);
  check(`§145: the scan finds hands named by a variable moved into the weapon bag (${outOfHand})`, outOfHand >= 3, outOfHand);
  check('§145: a hand moved into the weapon bag is a weapon hand (_isWeaponSlot, the three names, or a slot made of them)', badOut.length === 0, badOut);
}

/* ── §146: a function that pays marks its own record ── */
{
  const PAY = /(?<![\w$])(?:_creditPlayer|_creditLiveTogether|_creditWith|_goldGive|bagGive|stashGive|xpGive|pointsGive)\(/;
  /* by function, with why */
  const PAY_KNOWN = {
    _spinPay: 'dailyrewards.js: pays the open pot; its two callers keep the record: _drRollover marks it dirty, _handleDailySpin saves it in the same run',
    _seGrant: 'dailyrewards.js: pays one season tier; called by _seClose (inside _drRollover, which marks) and _handleSeasonClaim (which saves)',
    _seClose: 'dailyrewards.js: mails a finished season\'s tiers; called only by _drRollover, which marks the record dirty',
  };
  const PAY_LINE = 3;
  const marks = FNS.filter((x) => /^_\w+MarkDirty$/.test(x.name) && /\(pid\)$/.test(headOf(x)));
  check(`§146: the per-player records with a dirty mark are found (${marks.map((x) => x.name).join(', ')})`, marks.some((x) => x.name === '_drMarkDirty'), marks.map((x) => x.name));
  const found = new Set();
  let payers = 0;
  for (const mk of marks) {
    const P = mk.name.replace(/MarkDirty$/, '');
    const fileFns = FNS.filter((x) => x.f === mk.f);
    const has = (n) => fileFns.some((x) => x.name === n);
    check(`§146: ${mk.f.replace('server/src/', '')}: its record is loaded and saved by ${P}Load and ${P}Save`, has(P + 'Load') && has(P + 'Save'));
    const pays = new Set(fileFns.filter((x) => PAY.test(bodyOf(x))).map((x) => x.name));
    for (let grew = true; grew;) {
      grew = false;
      for (const x of fileFns) if (!pays.has(x.name) && [...pays].some((p) => bodyOf(x).includes('this.' + p + '('))) { pays.add(x.name); grew = true; }
    }
    for (const x of fileFns) {
      if (!pays.has(x.name)) continue;
      payers++;
      const b = bodyOf(x);
      const loads = b.includes(P + 'Load(');
      const saves = b.includes(P + 'Save(');
      const marked = b.includes(mk.name + '(');
      if (loads ? !saves : !(saves || marked)) found.add(x.name);
    }
  }
  check(`§146: the scan finds the functions that reach a payment (${payers})`, payers >= 8, payers);
  census('§146', 'functions that reach a payment and neither mark their record dirty nor save it (an act that loads it: saves it)', found, PAY_KNOWN, PAY_LINE);
}

/* ── §152: two players' money, each one's own number ── */
{
  let groups = 0;
  const bad = [];
  for (const c of callsOf('_escrowDebitGoldTogether')) {
    const m = masked.get(c.f);
    const open = c.at + 'this._escrowDebitGoldTogether'.length;
    const args = argsAt(m, open);
    if (!args.length || !c.fn) continue;
    const list = m.slice(args[0].a, args[0].b);
    const amounts = [...list.matchAll(/amount:([\w$.]+)/g)].map((x) => x[1]);
    if ((list.match(/\{id:/g) || []).length < 2) continue;
    groups++;
    const b = bodyOf(c.fn);
    for (const a of new Set(amounts)) {
      const cmp = new RegExp('if\\(' + esc(a) + '>([\\w$]+)\\)return').exec(b);
      const own = cmp && new RegExp('(?:const|let)\\s*' + esc(cmp[1]) + '=[^;]*payload\\.').test(b);
      if (!own) bad.push(`${c.fn.name}: amount ${a} is not refused above the accepter's own number (payload.)`);
    }
  }
  check('§152: the group debit door (_escrowDebitGoldTogether) is defined', byName.has('_escrowDebitGoldTogether'));
  check(`§152: the scan finds the group debits that take from two players (${groups})`, groups >= 1, groups);
  check('§152: each amount a group debit takes is refused above a number the accepter\'s own message sent', bad.length === 0, bad);
}

/* ── §153: what the death keeps and drops sums to what was held ── */
{
  /* by function, with why */
  const SHIELD_READERS = {
    _wipeInventoryOnDeath: 'the bag kept: min(shield, held) (the property below)',
    _spawnDeathPile: 'the pile: held - shield (the property below)',
    _handlePlayerDeath: 'sets the shield at the death (`_deathRecoveryShield`): what a pickup handed over in the last second',
    _tickPlayerRespawn: 'clears it at the respawn, once the wipe has run: one death, one shield',
  };
  const readers = new Set();
  for (const f of code.keys()) for (const x of masked.get(f).matchAll(/\._deathShield(?![\w$])/g)) { const fn = namedAt(f, x.index); readers.add(fn ? fn.name : '(top)'); }
  census('§153', 'functions that read or write the death shield (each in the property below, or why)', readers, SHIELD_READERS, 4);
  const r = room();
  const ok = ['_wipeInventoryOnDeath', '_spawnDeathPile', '_keptThroughDeath'].every((n) => typeof r[n] === 'function');
  check('§153: the death\'s wipe and pile are methods of the worker', ok);
  if (ok) {
    let seed = 1530;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const KEYS = ['ore_copper_ore', 'bar_iron', 'cooked_fish_trout', 'raw_trout', 'shard_frost', 'wood_pine', 'gem_flame', 'pickaxe_basic', 'axe_basic', 'fishing_rod', 'slime_goo'];
    const bad = [];
    let runs = 0;
    for (let i = 0; i < 400; i++) {
      const inv = {};
      for (const k of KEYS) if (rnd() < 0.6) inv[k] = 1 + Math.floor(rnd() * 20);
      const shield = {};
      for (const k of KEYS) if (rnd() < 0.4) shield[k] = Math.floor(rnd() * 30);
      const all = rnd() < 0.3;
      const rr = room();
      Object.assign(rr, { sessions: new Map(), loot: Object.create(null), eventBuffer: [], DEATH_PILE_OWNER_MS: 1000, DEATH_PILE_TOTAL_MS: 2000, _serializePile: () => ({}) });
      const ps = { z: 'wheel', x: 0, y: 0, inventory: { ...inv }, _deathShield: rnd() < 0.85 ? shield : undefined };
      let kept, pile;
      try {
        pile = rr._spawnDeathPile(ps, 'p1', all ? { all: true } : undefined);
        kept = rr._wipeInventoryOnDeath(ps, all);
      } catch (e) { bad.push('threw: ' + e.message); break; }
      runs++;
      const dropped = {};
      for (const it of (pile && pile.deathItems) || []) dropped[it.key] = (dropped[it.key] || 0) + it.qty;
      for (const k of new Set([...Object.keys(inv), ...Object.keys(shield), ...Object.keys(kept || {})])) {
        const sum = ((kept && kept[k]) || 0) + (dropped[k] || 0);
        if (sum !== (inv[k] || 0)) { bad.push({ k, held: inv[k] || 0, kept: (kept && kept[k]) || 0, dropped: dropped[k] || 0, shield: ps._deathShield && ps._deathShield[k], all }); break; }
      }
      if (bad.length) break;
    }
    check(`§153: kept + dropped == held for every key, over ${runs} random deaths (bags, shields over and under what is held, No man's land's \`all\`)`, bad.length === 0 && runs === 400, bad);
  }
}

/* ── §154: a key built from a place is gated on a table ── */
{
  const PLACE = /(?:zone|land|home)(?:Id)?$|^z$/i;
  /* by function, with why */
  const PLACE_KNOWN = {
    _rollHarvestShard: 'gathering.js: `shard_` + the node\'s zone, ungated (its caller passes a Wheel node\'s home, else the node\'s zone or the room\'s): Found',
    _dungeonComplete: 'dungeon.js: `wheel_` + the dungeon\'s home is a key of lifeSkills.dungeonClears, not an item (the instance\'s cfg is the dungeon table\'s row)',
  };
  const found = new Set();
  let built = 0;
  for (const f of code.keys()) {
    const c = code.get(f);
    for (const x of c.matchAll(/"([a-z][a-z_]*_)"\+((?:this\.)?[\w$]+(?:\.[\w$]+)*)/g)) {
      const X = x[2];
      if (!PLACE.test(X.split('.').pop())) continue;
      const fn = namedAt(f, x.index);
      if (!fn) continue;
      built++;
      const b = bodyOf(fn);
      const e = esc(X);
      const T = '[A-Z_][\\w$.]*';
      const gated = new RegExp('hasOwnProperty\\.call\\(' + T + ',' + e + '\\)|(?<![\\w$])own\\(' + T + ',' + e + '\\)|' + T + '\\.(?:has|includes)\\(' + e + '\\)|(?<![\\w$.])' + e + '\\s*in\\s*' + T
        + '|for\\((?:const|let)\\s*' + e + '\\s*of\\s*Object\\.keys\\(' + T + '\\)\\)'
        /* or the name itself made only when the table holds it: `const land = ... own(TABLE, p.land) ? p.land : null` */
        + '|(?:const|let)\\s*' + e + '=[^;]*(?:hasOwnProperty\\.call|(?<![\\w$])own)\\(' + T + ',').test(b);
      if (!gated) found.add(fn.name);
    }
  }
  check(`§154: the scan finds the keys built from a place (${built})`, built >= 5, built);
  check('§154: _rollShardForKill, the trap\'s own, is read', byName.has('_rollShardForKill'));
  census('§154', 'functions that build a key from a place without a table gate', found, PLACE_KNOWN, 2);
}

/* ── §155: the one allowed state, on the way to a take ── */
{
  const TAKE = /(?<![\w$])(?:_goldTake|bagTake|stashTake|_escrowDebitGold|_escrowDebitGoldTogether|_escrowTakeItem)\(/;
  const takers = FNS.filter((x) => !['_goldTake', 'bagTake', 'stashTake', '_escrowDebitGold', '_escrowDebitGoldTogether', '_escrowTakeItem'].includes(x.name) && TAKE.test(bodyOf(x)));
  let guards = 0;
  const deny = [];
  const seenArena = [];
  const scan = (x, upTo) => {
    const b = bodyOf(x);
    const raw = rawOf(x);
    for (const i of b.matchAll(/(?<![\w$])if\(/g)) {
      const open = i.index + 2;
      const close = closeOf(b, open);
      if (close > upTo) continue;
      const cond = raw.slice(open, close + 1);
      const t = /\.(?:status|phase|state|stage)(===|!==|==|!=)"(\w*)"/.exec(cond);
      if (!t) continue;
      guards++;
      if (x.name === '_arenaJoin') seenArena.push(t[1] + t[2]);
      const after = b.slice(close + 1, close + 10);
      if ((t[1] === '===' || t[1] === '==') && /^\{?return/.test(after)) deny.push(`${x.name}: ${cond.slice(0, 90)}`);
    }
  };
  for (const x of takers) {
    const p = bodyOf(x).search(TAKE);
    scan(x, p);
    for (const c of callsOf(x.name)) if (c.fn && c.fn !== x) scan(c.fn, c.at - c.fn.a);
  }
  check(`§155: the scan reads the state guards on the way to a take (${guards}, in ${takers.length} takers and their callers)`, guards >= 2 && takers.length >= 30, { guards, takers: takers.length });
  check('§155: _arenaJoin, the trap\'s own, is read and gates on the one allowed state (`!=="gathering"`)', seenArena.includes('!==gathering'), seenArena);
  check('§155: no guard on the way to a take refuses one state it thought of (`=== "x"` then return): gate on the allowed one', deny.length === 0, deny);
}

/* ── §156: a new act, a new id ── */
{
  const LASTING = /^(?:playerId|pid|sessionId|session\.id|sponsorId|rec\.sponsorId|targetId|rec\.targetId|tid|rec\.tid|t\.id|matchId|rec\.matchId|m\.id)$/;
  /* by the refund's opId prefix, with why */
  const LASTING_KNOWN = {
    arenastakerefund: 'gladiator.js _arenaStakeSweep: refunds a stake only after a restart voided the tournament (the bracket is gone), so no later stake on that match exists to share its id; one stake a match (the record\'s key)',
  };
  const refunds = [];
  for (const f of code.keys()) {
    const c = code.get(f);
    for (const x of c.matchAll(/opId:"([a-z]*)refund:"((?:\+[^,}]+)*)/g)) refunds.push({ f, p: x[1], tail: x[2], fn: namedAt(f, x.index) });
  }
  check(`§156: the scan finds the refunds (${refunds.length})`, refunds.length >= 5, refunds.length);
  const found = new Set();
  const bad = [];
  const sfxNames = new Set();
  for (const r of refunds) {
    const parts = r.tail.split('+').filter(Boolean);
    const sfx = parts.map((s) => /^this\.(_\w+Sfx)\(/.exec(s)).find(Boolean);
    const ids = parts.filter((s) => !/^"/.test(s) && !/^this\./.test(s));
    if (!ids.every((s) => LASTING.test(s))) continue;   /* an id of the act's own (a duel's, an order's) */
    if (!sfx) { found.add(r.p + 'refund'); continue; }
    sfxNames.add(sfx[1]);
    /* the debit of the same act: a stamp or opId whose key starts `"<p>:"` */
    let debits = 0;
    for (const f of code.keys()) {
      const c = code.get(f);
      for (const d of c.matchAll(new RegExp('(?:_opStamp\\(|opId:)"' + esc(r.p) + ':"([^,;)}]*)', 'g'))) {
        debits++;
        if (!d[1].includes('this.' + sfx[1] + '(') && !bad.some((x) => x.startsWith(r.p + ': the debit "' + r.p + ':"' + d[1].slice(0, 60)))) bad.push(`${r.p}: the debit "${r.p}:"${d[1].slice(0, 60)} lacks this.${sfx[1]}(`);
      }
    }
    if (!debits) bad.push(`${r.p}: no debit of the act found (a stamp or opId "${r.p}:")`);
  }
  census('§156', 'refunds keyed only on lasting ids with no counter suffix', found, LASTING_KNOWN, 1);
  check('§156: the debit of each such act carries the same suffix as its refund', bad.length === 0, bad);
  for (const x of FNS) if (/Sfx$/.test(x.name)) sfxNames.add(x.name);
  check(`§156: the counter suffixes are found (${[...sfxNames].join(', ')})`, sfxNames.has('_arenaEntrySfx'), [...sfxNames]);
  const r = room();
  for (const n of sfxNames) {
    const fnc = r[n];
    const ids = typeof fnc === 'function' ? Array.from({ length: 50 }, (_, i) => String(fnc.call(r, i + 1))) : [];
    check(`§156: ${n} gives a different id for every n (1..50)`, ids.length === 50 && new Set(ids).size === 50, ids.slice(0, 5));
  }
}

/* ── §159: a join's cap is for the claim ── */
{
  const BOOT = /(?<![\w$])[A-Z_]*BOOTSTRAP[A-Z_]*(?![\w$])/g;
  const caps = new Set();
  for (const f of code.keys()) for (const x of masked.get(f).matchAll(/(?:const|let)\s*([A-Z_]*BOOTSTRAP[A-Z_]*)=/g)) caps.add(x[1]);
  /* a clamp made of a cap: a cap in its parameters, or a small body with one */
  const clamps = new Set(FNS.filter((x) => { BOOT.lastIndex = 0; const h = BOOT.test(headOf(x)); BOOT.lastIndex = 0; return h || (x.b - x.a < 300 && BOOT.test(bodyOf(x))); }).map((x) => x.name));
  BOOT.lastIndex = 0;
  check(`§159: the join caps are found (${caps.size}) and the clamps made of them (${[...clamps].join(', ')})`, caps.size >= 6 && clamps.has('_sanitizeGems'), [...clamps]);
  const bad = [];
  let uses = 0;
  for (const x of FNS) {
    if (clamps.has(x.name)) continue;
    const b = bodyOf(x);
    const list = [];
    for (const u of b.matchAll(BOOT)) if (!/(?:const|let)\s*$/.test(b.slice(Math.max(0, u.index - 6), u.index))) list.push({ at: u.index, what: u[0] });
    for (const cf of clamps) for (const u of b.matchAll(new RegExp('this\\.' + esc(cf) + '\\(', 'g'))) list.push({ at: u.index, what: cf, call: true });
    if (!list.length) continue;
    /* the names made from the claim: assigned from it, or looped over it */
    const taint = new Set();
    const T = () => new RegExp('msg\\.data|[Cc]laim|Captured' + (taint.size ? '|(?<![\\w$.])(?:' + [...taint].map(esc).join('|') + ')(?![\\w$])' : ''));
    for (let grew = true; grew;) {
      grew = false;
      for (const a of b.matchAll(/(?:const|let|var)\s*([\w$]+)=([^;]*)/g)) if (!taint.has(a[1]) && T().test(a[2])) { taint.add(a[1]); grew = true; }
      for (const a of b.matchAll(/for\((?:const|let)\s*\[?([\w$]+)(?:,([\w$]+))?\]?\s*of\s*([^)]*\)?)\)/g)) if (T().test(a[3])) for (const v of [a[1], a[2]]) if (v && !taint.has(v)) { taint.add(v); grew = true; }
    }
    const blocks = spansOf(b).blocks;
    const ctx = (p) => {
      const s = stmtAt(b, p);
      const bl = blockAt(blocks, p);
      let h = '';
      if (bl) { let a = bl[0]; while (a > 0 && !';{}'.includes(b[a - 1])) a--; h = b.slice(a, bl[0]); }
      return b.slice(s.a, s.b) + ' ' + h;
    };
    for (const u of list) {
      uses++;
      let ok;
      if (u.call) ok = T().test(b.slice(u.at, closeOf(b, u.at + ('this.' + u.what).length) + 1));
      else {
        const s = b.slice(stmtAt(b, u.at).a, stmtAt(b, u.at).b);
        ok = T().test(ctx(u.at));
        const v = /^(?:const|let)\s*([\w$]+)=/.exec(s);
        if (!ok && v) {
          const at = [...b.matchAll(new RegExp('(?<![\\w$.])' + esc(v[1]) + '(?![\\w$])', 'g'))].map((y) => y.index).filter((p) => p > u.at);
          ok = at.length > 0 && at.every((p) => T().test(ctx(p)));
        }
      }
      if (!ok) bad.push(`${x.name}: ${u.what}: ${b.slice(stmtAt(b, u.at).a, stmtAt(b, u.at).b).slice(0, 120)}`);
    }
  }
  check(`§159: the scan reads the uses of the join caps and their clamps (${uses})`, uses >= 10, uses);
  check('§159: every join cap is applied to the phone\'s claim, or to the server\'s record only under its capture stamp', bad.length === 0, bad);
}

/* ── §161: a stamp's writes, one run ── */
const WRITE_RE = /(?<![\w$])(storage\.put|_opStamp|_saveRpg|_creditPlayer|_creditWith|_goldTake|_goldGive|_goldSet|bagTake|bagGive|bagSet|stashTake|stashGive|stashSet)\(/g;
{
  /* by function, with why */
  const STAMP_KNOWN = {
    _handleChestOpen: 'dailychest.js: the key taken and the prize given in memory, then `await this._opStamp(opKey)`, then _saveRpg: a restart at the await keeps the stamp and loses the save (Found)',
    _arenaSettleStakes: 'gladiator.js: the old order behind the one-write plan (after its `return`): each loser\'s stamp awaited in turn, then the credits',
  };
  const found = new Set();
  const detail = [];
  let stampers = 0;
  for (const f of code.keys()) {
    const m = masked.get(f);
    const { fns, blocks } = spans.get(f);
    const awaits = [...m.matchAll(/(?<![\w$.])await(?![\w$])/g)].map((x) => x.index);
    for (const fn of fns) {
      if (fn.name === '=>' || fn.name === '_opStamp') continue;
      if (!/_opStamp\(/.test(m.slice(fn.a, fn.b))) continue;
      stampers++;
      const ws = [...m.slice(fn.a, fn.b).matchAll(WRITE_RE)].map((w) => {
        const at = fn.a + w.index;
        const pre = /await\s*(?:this\.)?(?:state\.)?$/.exec(m.slice(Math.max(0, at - 24), at));
        return { at, start: at - (pre ? pre[0].length : 0), what: w[1] };
      }).filter((w) => innerFn(fns, w.at) === fn);
      for (let i = 0; i + 1 < ws.length; i++) {
        const [w1, w2] = [ws[i], ws[i + 1]];
        if (otherBranch(m, blocks, w1.at, w2.at)) continue;
        /* a return (or throw) in w1's block before w2: w2 is not on w1's way */
        const bl = blockAt(blocks, w1.at);
        if (bl && bl[1] < w2.at && [...m.slice(w1.at, bl[1]).matchAll(/(?<![\w$])(?:return|throw)(?![\w$])/g)].some((r) => blockAt(blocks, w1.at + r.index) === bl)) continue;
        if (awaits.some((x) => x >= w1.start && x < w2.start && innerFn(fns, x) === fn)) { found.add(fn.name); detail.push(`${fn.name}: ${w1.what}, await, ${w2.what}`); }
      }
    }
  }
  check(`§161: the scan reads the functions that write an op stamp (${stampers})`, stampers >= 10, stampers);
  check('§161: _handleCapeRedeem, the trap\'s own, is among them', FNS.some((x) => x.name === '_handleCapeRedeem' && /_opStamp\(/.test(bodyOf(x))));
  census('§161', 'functions that await between two of a stamp\'s writes (' + detail.join('; ') + ')', found, STAMP_KNOWN, 2);
}

/* ── §184: a debit and its credit in one run ── */
{
  const TAKE = /(?<![\w$])(?:_goldTake|bagTake|stashTake|_escrowDebitGold|_escrowTakeItem|_escrowDebitGoldTogether)\(/g;
  /* by function: how many awaited credits after its takes today, with why */
  const CREDIT_KNOWN = {
    _handleTrade2Confirm: [5, 'trade2.js: the fallback when _creditLiveTogether cannot run (a side\'s state gone) and the weapons\' delivery past the run'],
    _interceptTrade: [2, 'trade.js: the gift trade\'s fallback when _creditLiveTogether cannot run'],
    _mktPlaceOrder: [3, 'market.js: a crossing order\'s settlement credits (the store\'s escrow, held by market-settle.test)'],
    _stCreateListing: [1, 'store.js: an unwind of a listing that failed to write, giving back what was taken'],
  };
  const found = new Map();
  for (const f of code.keys()) {
    const m = masked.get(f);
    const { fns, blocks } = spans.get(f);
    for (const fn of fns) {
      if (fn.name === '=>') continue;
      const b = m.slice(fn.a, fn.b);
      const takes = [...b.matchAll(TAKE)].map((x) => fn.a + x.index).filter((p) => innerFn(fns, p) === fn);
      if (!takes.length) continue;
      const cr = [...b.matchAll(/await\s*this\.(?:_creditPlayer|_creditWith)\(/g)].map((x) => fn.a + x.index).filter((p) => innerFn(fns, p) === fn);
      const n = cr.filter((p) => takes.some((t) => t < p && !otherBranch(m, blocks, t, p))).length;
      if (n) found.set(fn.name, n);
    }
  }
  const fresh = [...found].filter(([k, n]) => !Object.hasOwn(CREDIT_KNOWN, k) || n > CREDIT_KNOWN[k][0]).map(([k, n]) => `${k} ${Object.hasOwn(CREDIT_KNOWN, k) ? CREDIT_KNOWN[k][0] : 0} -> ${n}`);
  const fell = Object.entries(CREDIT_KNOWN).filter(([k, [n]]) => (found.get(k) || 0) < n).map(([k, [n]]) => `${k} ${n} -> ${found.get(k) || 0}`);
  check(`§184: functions that await a credit after a take of their own: ${found.size} today, none new and none grown`, fresh.length === 0, fresh);
  check('§184: every listed count is still the count (a fallen one comes down)', fell.length === 0, fell);
  check('§184: the swaps\' one run (_creditLiveTogether) is defined and called', byName.has('_creditLiveTogether') && callsOf('_creditLiveTogether').length >= 2);
}

/* ── §219 (and §184's mailbox): a queued record is written in its queue ── */
{
  const QUEUES = { _inboxSerial: 'inbox:', _authSerial: 'auth:' };
  /* by function, with why */
  const OUTSIDE_KNOWN = {
    _deviceFill: 'devicelock.js: the owner\'s fill of devices into old login records reads a batch of `auth:` records and puts them back outside _authSerial: a join\'s handout in between is written over (Found)',
  };
  const serials = FNS.filter((x) => /^_\w+Serial$/.test(x.name)).map((x) => x.name);
  check(`§219: every record queue names its record (${serials.join(', ')})`, serials.length >= 2 && serials.every((s) => Object.hasOwn(QUEUES, s)) && Object.keys(QUEUES).every((q) => serials.includes(q)),
    { defined: serials, named: Object.keys(QUEUES) });
  const inSerial = (fn, p, q) => {
    const m = masked.get(fn.f);
    for (const c of m.slice(fn.a, fn.b).matchAll(new RegExp('this\\.' + esc(q) + '\\(', 'g'))) {
      const open = fn.a + c.index + q.length + 5;
      if (open < p && p < closeOf(m, open)) return true;
    }
    return false;
  };
  const queued = (fn, q, seen = new Set()) => {
    if (seen.has(fn)) return true;
    seen.add(fn);
    const cs = callsOf(fn.name).filter((c) => c.fn);
    return cs.length > 0 && cs.every((c) => inSerial(c.fn, c.at, q) || queued(c.fn, q, seen));
  };
  const found = new Set();
  for (const [q, R] of Object.entries(QUEUES)) {
    let writes = 0;
    /* the names a function holds the record's key in: made from it here
       (`const key = "inbox:" + id`), or a parameter a caller hands such a name */
    const madeKey = (fn) => [...rawOf(fn).matchAll(new RegExp('(?:const|let)\\s*([\\w$]+)="' + esc(R) + '"\\+', 'g'))].map((x) => x[1]);
    const keyParams = (fn) => {
      const params = headOf(fn).replace(/^[\w$]+\(/, '').replace(/\)$/, '').split(',').map((s) => s.split('=')[0].trim());
      const out = [];
      for (const c of callsOf(fn.name)) {
        if (!c.fn) continue;
        const m = masked.get(c.f);
        const held = madeKey(c.fn);
        argsAt(m, c.at + fn.name.length + 5).forEach((a, i) => { if (held.includes(m.slice(a.a, a.b)) && params[i]) out.push(params[i]); });
      }
      return out;
    };
    /* the functions handed such a name: called with it by a function that made it */
    const handed = new Set();
    for (const fn of FNS) {
      const held = madeKey(fn);
      if (!held.length) continue;
      const b = bodyOf(fn);
      for (const c of b.matchAll(/this\.([\w$]+)\(([^()]*)/g)) if (c[2].split(',').some((a) => held.includes(a.trim()))) handed.add(c[1]);
    }
    for (const fn of FNS) {
      const raw = rawOf(fn);
      const names = [...madeKey(fn), ...(raw.includes('"' + R + '"') || !handed.has(fn.name) ? [] : keyParams(fn))];
      if (!raw.includes('"' + R + '"') && !names.length) continue;
      const keyRe = new RegExp('"' + esc(R) + '"' + (names.length ? '|(?<![\\w$.])(?:' + names.map(esc).join('|') + ')(?![\\w$])' : ''));
      /* a batch: `puts["auth:" + id] = ...` then `S.put(puts)` */
      const batch = [...raw.matchAll(new RegExp('([\\w$]+)\\["' + esc(R) + '"\\+', 'g'))].map((x) => x[1]);
      const m = masked.get(fn.f);
      /* storage's own writes: `storage.put(`, or a name held for it (`const S = this.state.storage`) */
      const st = ['storage', ...[...raw.matchAll(/(?:const|let)\s*([\w$]+)=this\.state\.storage[;,]/g)].map((x) => x[1])];
      for (const w of m.slice(fn.a, fn.b).matchAll(/(?<![\w$])([\w$]+)\.(?:put|delete)\(/g)) {
        if (!st.includes(w[1])) continue;
        const p = fn.a + w.index + w[0].length - 1;
        if (namedAt(fn.f, p) !== fn) continue;
        const args = code.get(fn.f).slice(p, closeOf(m, p) + 1);
        const one = /^\(([\w$]+)\)$/.exec(args);
        if (!(keyRe.test(args) || (one && batch.includes(one[1])))) continue;
        writes++;
        if (!(inSerial(fn, p, q) || queued(fn, q))) found.add(fn.name);
      }
    }
    check(`§219: the scan finds the writes of the record "${R}" (${writes})`, writes >= (R === 'auth:' ? 4 : 1), writes);
  }
  census('§219', 'functions that write a queued record outside its queue', found, OUTSIDE_KNOWN, 1);
}

/* ── §242: the set's XP counts what was made ── */
{
  /* by function, with why */
  const MAKERS = {
    _gemsAdoptOnJoin: 'amulet.js: the old pouch moved into the bag at a join: the pouch never traded, so every polished gem in it was made by this player',
    _handleGemCut: 'amulet.js: the old cut, a gem made on success',
    _handleGemCombine: 'shardcrack.js: a combine or a Rare Gem\'s cut, a gem made',
    _devKit: 'devtools.js: the owner\'s test kit makes polished gems for its player',
  };
  const UNPAID = { _gemsUnpaidOf: 'its keeper', _gemMade: 'adds one owed', _gemSetXp: 'pays one owed', _gemsAdoptOnJoin: 'heals the owed map at the join' };
  const SETXP = { _gemSetXp: 'the one payer' };
  const makers = new Set(callsOf('_gemMade').map((c) => (c.fn ? c.fn.name : '(top)')));
  census('§242', 'the roads that call _gemMade (each one MAKES a gem)', makers, MAKERS, 4);
  const touch = new Set(FNS.filter((x) => /gemsUnpaid|_gemsUnpaidOf\(/.test(rawOf(x))).map((x) => x.name));
  census('§242', 'the functions that touch the owed count (gemsUnpaid)', touch, UNPAID, 4);
  const xp = new Set(FNS.filter((x) => /_addLifeSkillXp\([^,]*,"enchanting",(?:WEAPON_GEM\.XP|GEM_SET_XP)/.test(rawOf(x))).map((x) => x.name));
  census('§242', 'the functions that pay the set\'s Enchanting XP', xp, SETXP, 1);
  const { weaponGemMethods, WEAPON_GEM } = await imp('server/src/weapongem.js');
  const { GEM_ELEMENTS } = await imp('server/src/gems.js').catch(() => ({}));
  const els = GEM_ELEMENTS ? [...GEM_ELEMENTS] : ['flame', 'frost'];
  let seed = 2420;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const bad = [];
  for (let run = 0; run < 200 && !bad.length; run++) {
    const r = Object.create(weaponGemMethods);
    let paid = 0;
    r._addLifeSkillXp = (ps, skill, n) => { if (skill === 'enchanting') paid += n; return { leveled: false, newLevel: 1 }; };
    const ps = { lifeSkills: {} };
    const owed = Object.create(null);
    let want = 0;
    try {
      for (let i = 0; i < 40; i++) {
        const e = els[Math.floor(rnd() * els.length)];
        if (rnd() < 0.35) { const n = 1 + Math.floor(rnd() * 3); r._gemMade(ps, e, n); owed[e] = (owed[e] || 0) + n; }
        else { r._gemSetXp(ps, e); if ((owed[e] || 0) > 0) { owed[e]--; want += WEAPON_GEM.XP; } }
      }
    } catch (e) { bad.push({ run, threw: e.message }); break; }
    if (paid !== want) bad.push({ run, paid, want });
  }
  check(`§242: _gemSetXp pays ${WEAPON_GEM && WEAPON_GEM.XP} once per gem made and nothing for one not made (200 random runs of makes and sets)`, bad.length === 0, bad);
}

/* ── §275: a record cache spares the live ── */
{
  const caches = [];
  const bad = [];
  for (const x of FNS) {
    const b = bodyOf(x);
    for (const mapName of new Set([...b.matchAll(/this\.([\w$]+)\.get\(/g)].map((y) => y[1]))) {
      const e = esc(mapName);
      if (!new RegExp('this\\.' + e + '\\.set\\(').test(b) || !new RegExp('this\\.' + e + '\\.size').test(b) || !new RegExp('this\\.' + e + '\\.delete\\(').test(b)) continue;
      const writers = FNS.filter((y) => new RegExp('this\\.' + e + '(?:\\.get\\(|\\.values\\(|\\.entries\\()').test(bodyOf(y)) && /storage\.put\(/.test(bodyOf(y)));
      if (!writers.length) continue;
      caches.push(`${x.name}: ${mapName}`);
      const load = /storage\.get\(/.test(b);
      const online = /playerState\[|_\w*Online\(|this\.sessions(?![\w$])|_wsBySessionId\(/.test(b);
      if (!load && !online) bad.push(`${x.name}: ${mapName} (written back by ${writers.map((y) => y.name).join(', ')})`);
    }
  }
  check(`§275: the scan finds the evicting caches whose entries are written to storage (${caches.join('; ')})`, caches.some((c) => c.startsWith('_botfpRecord:')), caches);
  check('§275: each re-reads storage on a miss or spares an online player\'s entry', bad.length === 0, bad);
  const { BOTFP } = await imp('server/src/botfp.js');
  let seed = 2750;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const lost = [];
  for (let run = 0; run < 20 && !lost.length; run++) {
    const r = room();
    r.playerState = Object.create(null);
    r._liveFlags = {};
    r._botfpMaybePut = () => {};
    const live = new Map();
    for (let i = 0; i < BOTFP.MAP_CAP * 3; i++) {
      const id = 'bp_' + run + '_' + i;
      if (rnd() < 0.3 && Object.keys(r.playerState).length < 100) r.playerState[id] = { disconnected: false };
      let rec;
      try { rec = r._botfpRecord(id, 1000 + i); } catch (e) { lost.push({ run, threw: e.message }); break; }
      rec.lastStrikeAt = Math.floor(rnd() * 1e6);
      if (r.playerState[id]) live.set(id, rec);
      for (const [lid, lrec] of live) if (r._botfp.get(lid) !== lrec) { lost.push({ run, i, lid }); break; }
      if (lost.length) break;
    }
  }
  check(`§275: _botfpRecord, run past its cap (${BOTFP.MAP_CAP}) with players online, never drops an online player's record`, lost.length === 0, lost);
}

process.exit(failed ? 1 : 0);
