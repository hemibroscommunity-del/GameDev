/* ═══ v2.3.5760: TRAPS INTO GUARDS, MONEY (card V2 PR 1) ═══
 *
 * Grand plan step 8.2, card V2's first batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.
 *
 * TRAPS §147 (the rule): in the economy's server files, no function awaits between a door's take or give (gold, bag, stash) and the nearest stamp or record write (`storage.put`, `_opStamp`, `_saveRpg`) after it, nor between a stamp or record write and the door call it guards; today's places listed (a census). Break: server/src/inbox.js: `await this._opStamp(opId);` before `_goldTake` in _escrowDebitGold -> FAIL (tried 2026-11-17).
 * TRAPS §321 (the rule): the same scan, the record's write after the payment: no await between. Break: server/src/storeoffer.js: `await this.state.storage.put('store_listing:' + rec.id, rec);` before the gold door in _soPlaceOneWrite -> FAIL (tried 2026-11-17).
 * TRAPS §150 (the rule): every handler the router's `_onMessage` calls that reaches a gold, bag or stash TAKE (through this.* calls, five deep) reads the life phase (`.dying`, `.dead`, `.life`, `lifeOf(`) on the way; today's handlers that do not are listed (a census). Break: server/src/shop.js: the `ps.dying || ps.dead || ps.disconnected` line of _shopSell gone -> FAIL (tried 2026-11-17).
 * TRAPS §290 (the rule): every function in server/src/ that removes a pile from `this.loot` (`delete this.loot[`, a splice, shift or pop of a list read from it, a new list put in its place) calls `_deathPileGone`, or is listed with why. Break: server/src/index.js: `if (p._saved) this._deathPileGone(p);` gone from _tickLoot -> FAIL (tried 2026-11-17).
 * TRAPS §188 (the rule): the families `_QUEST_KEEP_SPEC()` keeps through a death (every quest objective's `invPrefix`), computed by the worker's own code, are the pinned list; a new one names why. Break: server/src/data.js: the mining quest's `invPrefix:'ore_'` made `'wood_'` -> FAIL (tried 2026-11-17).
 * TRAPS §308 (one case): the wire's one `arena_stake_error` case calls `dropRefusedStake` (whose own rule silent-refusals.test §2 holds); one case because the trap is that one refusal's. Break: gameEvents.js: the case's `setArenaBets(... dropRefusedStake(prev, payload) ...)` line gone -> FAIL (tried 2026-11-17).
 *
 * HOW IT READS.  The code of every file under server/src/ (comments dropped:
 * lib/codeOnly.mjs; strings blanked: lib/maskCode.mjs), one function at a
 * time (lib/fnSpans.mjs).  The files by system (lib/filesOf.mjs): §147 and
 * §321 the economy's server files, §150 the router found in the wire's
 * files by its name `_onMessage`, §308 the wire's files.  Lists name a
 * function, never a file and line.
 *
 * §147/§321: for each door call (`_goldTake`, `_goldGive`, `_goldSet`,
 * `bagTake`, `bagGive`, `bagSet`, `stashTake`, `stashGive`, `stashSet`), the
 * NEAREST write after it in its function, and the nearest write before it
 * whose block holds it; an `await` of that function between them is a
 * place (an `await` directly on the later write is the run's end, not a
 * gap; one in another branch of an if/else or a try's catch is not on the
 * way).  A write handed to `Promise.all` or a helper (`_creditLiveTogether`)
 * is not seen: the scan holds the plain spelling, the one #147 had.
 *
 * §150 follows `this.NAME(` calls from each case of `_onMessage` to the
 * functions of server/src/ by name, five deep; a path that reaches a
 * function with a take and has read the life phase nowhere on the way is
 * a place, named by the handler the case calls.  The router's own
 * preamble (the fight lock, the value pause) is not a life read.
 *
 * BOTH CENSUSES (the plan's rule 3): a place not listed fails, and the
 * listed count only falls; a listed place that is gone fails until its
 * name comes off (each known one is under Found in docs/plan/status/V2.md).
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §147  inbox.js _escrowDebitGold: `await this._opStamp(opId);` before
 *         `this._goldTake(ps, amt, ...)`                            -> FAIL §147/§321 (stamp, await, take)
 *   §147  inbox.js _escrowDebitGold: `await this._loadRpg(playerId);`
 *         between `_goldTake` and `this._saveRpg(playerId, ps)`     -> FAIL §147/§321 (take, await, save)
 *         gold.js: the door renamed `_goldTake2`                    -> FAIL §147 doors (the door's name gone)
 *   §321  storeoffer.js _soPlaceOneWrite: `await this.state.storage.put(
 *         'store_listing:' + rec.id, rec);` before the gold door     -> FAIL §147/§321 (put, await, give)
 *   §150  shop.js _shopSell: the dying/dead/disconnected line gone  -> FAIL §150 (_shopSell reaches a take; and the trap's counter check)
 *   §290  index.js _tickLoot: `if (p._saved) this._deathPileGone(p);` gone -> FAIL §290
 *         deathpile.js: `_deathPileGone2(pile) {`                     -> FAIL §290 (defined once)
 *   §188  data.js: the mining quest's `invPrefix:'ore_'` made 'wood_'  -> FAIL §188
 *   §308  gameEvents.js: the case's dropRefusedStake line gone      -> FAIL §308
 *
 * Run from the repository's root: node tools/guards/traps-money.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { filesOf, readSystem } from './lib/filesOf.mjs';
import { spansOf, innerFn, blockAt, otherBranch } from './lib/fnSpans.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

const code = codeOf(['server/src']);
const masked = new Map();
const spans = new Map();
const M = (f) => { if (!masked.has(f)) { const m = maskCode(code.get(f)); masked.set(f, m); spans.set(f, spansOf(m)); } return masked.get(f); };

/* a census: the places found against the known list and its line */
function census(tag, what, found, known, line) {
  const fresh = [...found].filter((k) => !Object.hasOwn(known, k)).sort();
  const gone = Object.keys(known).filter((k) => !found.has(k));
  check(`${tag}: ${what}: ${found.size} today, none new`, fresh.length === 0, fresh);
  check(`${tag}: every listed place is still there (a fixed one's name comes off)`, gone.length === 0, gone);
  check(`${tag}: the listed count ${Object.keys(known).length} is at or under its line ${line}`, Object.keys(known).length <= line);
}

/* ── §147, §321: no await between a door's move and its stamp or record ── */

const DOORS = ['_goldTake', '_goldGive', '_goldSet', 'bagTake', 'bagGive', 'bagSet', 'stashTake', 'stashGive', 'stashSet'];
const DOOR_RE = new RegExp('(?<![\\w$])(' + DOORS.join('|') + ')\\(', 'g');
const WRITE_RE = /(?<![\w$])(storage\.put|_opStamp|_saveRpg)\(/g;
/* Stepped in today, by function: each one under Found in docs/plan/status/V2.md */
const ONE_WRITE_KNOWN = {
  _mktUnwind: 'market.js: the await is the mail of a weapon the stash door REFUSED (stashGive false: nothing was given), then the save; '
    + 'not a gap in a payment, but the scan cannot see the `if (!stashGive(...))`',
};
const ONE_WRITE_LINE = 1;
{
  const econ = filesOf('economy').filter((f) => f.startsWith('server/src/'));
  check(`§147: the economy's server files (${econ.length}) hold the gold, bag and stash doors`,
    ['server/src/gold.js', 'server/src/bag.js', 'server/src/stash.js'].every((f) => econ.includes(f)), econ);
  const doorsDefined = DOORS.filter((d) => econ.some((f) => new RegExp('(?:function\\s+|[,{]\\s*)' + d.replace('$', '\\$') + '\\(').test(M(f))));
  check('§147: every door the scan reads is defined in the economy\'s files (a renamed door turns this red)',
    doorsDefined.length === DOORS.length, DOORS.filter((d) => !doorsDefined.includes(d)));
  const found = new Set();
  const detail = [];
  let doorCalls = 0;
  for (const f of econ) {
    const m = M(f);
    const { fns, blocks } = spans.get(f);
    const awaits = [...m.matchAll(/(?<![\w$.])await(?![\w$])/g)].map((x) => x.index);
    const writes = [...m.matchAll(WRITE_RE)].map((w) => {
      const pre = /await\s*(?:this\.)?(?:state\.)?$/.exec(m.slice(Math.max(0, w.index - 24), w.index));
      return { at: w.index, start: w.index - (pre ? pre[0].length : 0), awaited: !!pre, what: w[1], fn: innerFn(fns, w.index) };
    });
    for (const d of m.matchAll(DOOR_RE)) {
      const fd = innerFn(fns, d.index);
      if (!fd || d.index === fd.a - d[0].length) continue;
      doorCalls++;
      const same = writes.filter((w) => w.fn === fd);
      const gap = (a, b, wAt) => awaits.some((x) => x >= a && x < b && innerFn(fns, x) === fd && !otherBranch(m, blocks, x, wAt));
      const after = same.find((w) => w.at > d.index);
      if (after && gap(d.index, after.awaited ? after.start : after.at, after.at)) {
        found.add(fd.name); detail.push(`${fd.name}: ${d[1]}, await, ${after.what}`);
      }
      const before = same.filter((w) => {
        if (w.at >= d.index) return false;
        const bl = blockAt(blocks, w.at);
        return bl && bl[0] < d.index && d.index < bl[1];
      }).pop();
      if (before && gap(before.start, d.index, d.index)) {
        found.add(fd.name); detail.push(`${fd.name}: ${before.what}, await, ${d[1]}`);
      }
    }
  }
  check(`§147: the scan reads the door calls of the economy's server files (${doorCalls})`, doorCalls >= 40, doorCalls);
  census('§147/§321', 'functions that await between a door\'s move and its stamp or record (' + detail.join('; ') + ')',
    found, ONE_WRITE_KNOWN, ONE_WRITE_LINE);
}

/* ── §150: a handler that reaches a take reads the life phase on the way ── */

const TAKE_RE = /(?<![\w$])(?:_goldTake|bagTake|stashTake)\(/;
const LIFE_RE = /\.(?:dying|dead|life)(?![\w$])|(?<![\w$])lifeOf\(/;
/* Stepped in today, by the handler `_onMessage` calls: each under Found in
   docs/plan/status/V2.md, for the card whose file it is */
const LIFE_KNOWN = {
  _handleCookRequest: 'cooking.js: takes the raw fish',
  _handleStatsUpdate: 'grids.js: the armour grid\'s stash take (_gridsApplyArmor > _gearStashLiveTake)',
  _handleFarmAct: 'farm.js: seeds and the farm\'s takes',
  _handleFarmOrder: 'farm.js: an order\'s goods',
  _handleFarmBuy: 'farm.js: a plot or a seed\'s price',
  _handleSmithSalvage: 'salvage: the piece and its provenance',
  _handleEssenceApply: 'an essence from the bag',
  _handleShieldWear: 'shieldwear.js: a shield from the stash',
  _handleArenaSponsor: 'the arena\'s stake (escrow debit)',
  _handleStoreOffer: 'the Auction House\'s offer (escrow debit)',
  _handlePetHouseBuy: 'the pet house\'s price',
  _interceptTrade: 'trade.js: the gift trade\'s debit',
  _handleTrade2Confirm: 'trade2.js: the trade window\'s Accept checks `disconnected` only; the opening (_handleTrade2Open) checks dying and dead',
};
const LIFE_LINE = 13;
{
  const wire = filesOf('wire').filter((f) => f.startsWith('server/src/'));
  const router = wire.find((f) => /(?:^|[,{}\s;])(?:async\s+)?_onMessage\(/.test(M(f)));
  check('§150: the router (`_onMessage`) is found in the wire\'s files', !!router, wire);
  const defs = new Map();
  for (const f of code.keys()) {
    const m = M(f);
    for (const fn of spans.get(f).fns) {
      if (fn.name === '=>') continue;
      if (!defs.has(fn.name)) defs.set(fn.name, []);
      defs.get(fn.name).push(m.slice(fn.a, fn.b + 1));
    }
  }
  const calls = (s) => [...new Set([...s.matchAll(/this\.([\w$]+)\(/g)].map((x) => x[1]))].filter((n) => defs.has(n));
  const found = new Set();
  let cases = 0;
  if (router) {
    const m = M(router);
    const om = spans.get(router).fns.find((fn) => fn.name === '_onMessage');
    const body = om ? m.slice(om.a, om.b) : '';
    const at = [...body.matchAll(/case"\s*"\s*:/g)].map((x) => x.index);
    cases = at.length;
    for (let i = 0; i < at.length; i++) {
      const cb = body.slice(at[i], i + 1 < at.length ? at[i + 1] : body.length);
      const caseLife = LIFE_RE.test(cb);
      for (const root of calls(cb)) {
        const seen = new Set();
        const walk = (name, life, depth) => {
          if (seen.has(name) || depth > 5) return;
          seen.add(name);
          for (const b of defs.get(name)) {
            const l = life || LIFE_RE.test(b);
            if (!l && TAKE_RE.test(b)) found.add(root);
            for (const n of calls(b)) walk(n, l, depth + 1);
          }
        };
        walk(root, caseLife, 0);
      }
    }
  }
  check(`§150: the router's cases are read (${cases})`, cases >= 100, cases);
  check('§150: _shopSell, the trap\'s counter, takes and reads the life phase (the scan sees both)',
    (defs.get('_shopSell') || []).some((b) => TAKE_RE.test(b) && LIFE_RE.test(b)));
  census('§150', 'handlers that reach a gold, bag or stash take and read the life phase nowhere on the way', found, LIFE_KNOWN, LIFE_LINE);
}

/* ── §290: a pile leaves this.loot only with _deathPileGone ── */

/* by function, with why */
const PILE_KNOWN = {
  _despawnLoot: 'index.js: removes a pile its caller has settled: the pickup calls _deathPileGone in the run that hands the bag over, '
    + 'and an all-claimed pile\'s bag went the same way',
};
{
  const found = new Set();
  let removers = 0;
  let gone = 0;
  for (const f of code.keys()) {
    const m = M(f);
    if (/_deathPileGone\(/.test(m) && /(?:^|[,{}\s;])_deathPileGone\(pile\)\{/.test(m)) gone++;
    for (const fn of spans.get(f).fns) {
      if (fn.name === '=>' || fn.name === 'constructor') continue;
      const b = m.slice(fn.a, fn.b + 1);
      if (!/this\.loot(?![\w$])/.test(b)) continue;
      const names = [...b.matchAll(/(?:const|let|var)\s*([\w$]+)=this\.loot\[[^\]]*\](?:\|\|\[\])?[;,]/g)].map((x) => x[1]);
      const rm = [/delete this\.loot\[/, /this\.loot\[[^\]]*\]=(?!=)(?!\[\])/, /this\.loot=(?!=)/, /this\.loot\[[^\]]*\]\.(?:splice|shift|pop)\(|this\.loot\[[^\]]*\]\.length=/,
        ...names.map((n) => new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '\\.(?:splice|shift|pop)\\(|(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '\\.length='))];
      if (!rm.some((r) => r.test(b))) continue;
      removers++;
      if (!/_deathPileGone\(/.test(b)) found.add(fn.name);
    }
  }
  check('§290: _deathPileGone(pile) is defined once', gone === 1, gone);
  check(`§290: the scan finds the functions that remove a pile (${removers})`, removers >= 3, removers);
  census('§290', 'functions that remove a pile from this.loot without _deathPileGone', found, PILE_KNOWN, 1);
}

/* ── §188: the families a death keeps ── */

const KEEP_FAMILIES = {
  cooked_fish_: 'the first quests ask for cooked fish of any species (TRAPS §188): every cooked fish is kept by an ordinary death',
  ore_: 'the mining quest asks for ore of any kind: every ore is kept by an ordinary death (No man\'s land takes it all: `all`)',
};
{
  let spec = null;
  try {
    const { questMethods } = await import(pathToFileURL(join(ROOT, 'server/src/quests.js')).href);
    spec = Object.create(questMethods)._QUEST_KEEP_SPEC();
  } catch (e) { check('§188: quests.js loads and _QUEST_KEEP_SPEC() runs', false, String(e && e.message)); }
  if (spec) {
    const fams = [...new Set(spec.prefixes)].sort();
    const pinned = Object.keys(KEEP_FAMILIES).sort();
    check(`§188: _QUEST_KEEP_SPEC() keeps ${spec.keys.size} exact keys and the families ${fams.join(', ')}`, spec.keys.size > 0 && fams.length > 0);
    check('§188: the families a death keeps are the pinned list (a new one names why in KEEP_FAMILIES)',
      JSON.stringify(fams) === JSON.stringify(pinned), { computed: fams, pinned });
  }
}

/* ── §308: the arena's refusal drops only the refused bet ── */
{
  const cases = [];
  for (const [f, src] of readSystem('wire', { only: /^src\/.*\.jsx?$/ })) {
    const m = maskCode(src.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, (s) => ' '.repeat(s.length)));
    for (const x of src.matchAll(/case\s*'arena_stake_error'\s*:/g)) {
      const rest = m.slice(x.index + x[0].length);
      const end = rest.search(/\bcase\s*['"]|\bdefault\s*:/);
      cases.push({ f, body: src.slice(x.index, x.index + x[0].length + (end < 0 ? rest.length : end)) });
    }
  }
  check(`§308: one \`arena_stake_error\` case in the wire's client files (${cases.length})`, cases.length === 1, cases.map((c) => c.f));
  check('§308: it calls dropRefusedStake (an already-staked refusal keeps the bet; silent-refusals.test §2 holds that)',
    cases.length === 1 && /dropRefusedStake\(/.test(cases[0].body.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')));
}

process.exit(failed ? 1 : 0);
