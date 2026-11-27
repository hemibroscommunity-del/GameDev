/* ═══ v2.3.5942: TRAPS INTO GUARDS, ECONOMY, SOCIAL AND THE WIRE, ONE CASE TO THE RULE (card V4 PR 3) ═══
 *
 * Grand plan step 8.2, card V4's third batch (the form: tools/guards/README.md,
 * "A trap held").  Each trap below was held by a suite for the ONE case it
 * found (docs/plan/census/traps.md, "Held today by"); this guard holds its
 * rule wherever the trap could come back.
 *
 * TRAPS §149 (the rule): every worker function that chooses between the wood and the metal tables (WOODWORKING_TIERS, HARDEN_WOOD_BY_TIER, "woodworking" against their metal twins) compares no slot to the bow or staff slot, but hardenIsWood's legacy line; hardenIsWood, run over every type, gearBase and slot, decides by the item and by the slot only for a weapon with neither. Break: server/src/forgeladder.js: `const ww = gb.indexOf('ww_') === 0 || slot === 'rangedWeapon';` in _hardenLevelFor -> FAIL (tried 2026-11-17).
 * TRAPS §158 (the rule): every worker function that turns a piece's `.gem` into a polished gem ("polished_" + x.gem, or the gem door handed x.gem) reads its `prov === 'minted'` on the way; _extractableGems, run over eight provenances, pays only 'minted'. Break: server/src/amulet.js: `item.prov === 'minted' &&` gone from _extractableGems' shield line -> FAIL (tried 2026-11-17).
 * TRAPS §160 (the rule): every worker function that gives the bag a key that is no literal is listed with why it cannot multiply a capped item (a census), and the one generic multiplier, Ace's item wager, skips TICKET_PREFIX before it stakes. Break: server/src/gamble.js: `if (k.startsWith(TICKET_PREFIX)) continue;` gone -> FAIL (tried 2026-11-17).
 * TRAPS §163 (the rule): every war roster frozen at a declare (`members: ..., fought: []`) filters out a player already on an active war's roster, or is listed as join-gated, and then every way into its clans (`.members.push(`) tests the active wars and returns before it adds. Break: server/src/clans.js: the `return this._clanError(..., 'Cannot join during a clan war')` of _handleClanJoinAccept made `void 0;` -> FAIL (tried 2026-11-17).
 * TRAPS §176 (the rule): every type the wire table places (ROOM_PLACED, RELAY_PLACED) is listed with the reading that its handler keeps nothing past the moment; no type a phone keeps (a kill, a shield, a transform, a campfire, a pile) is placed, and placeOf places no type it does not know. Break: server/src/wire/out.js: `placed: { m: 'monsterId' }` on the monster_kill row -> FAIL (tried 2026-11-17).
 * TRAPS §178 (the rule): in src/, every `x._away = true` parks the copy in its own function, every loop that moves other players' copies (`o.renderX +=` over S.others) parks an `_away` copy first, and every read of a roster's `nr` parks the missing. Break: src/game/visualSystems.js: `if (o._away) parkAway(S, o);` gone from the peers' loop -> FAIL (tried 2026-11-17).
 * TRAPS §202 (the rule): every per-connection counter the worker keeps (`session.x++`, the lenient branch's "for visibility") is listed with the refusal or the narrow allowance it counts; the harvest's strike with no start of its own asks _harvestRecoverOk and refuses on its no. Break: server/src/gathering.js: `if (!this._harvestRecoverOk(session.id, now)) {` made `if (false) {` -> FAIL (tried 2026-11-17).
 * TRAPS §245 (the rule): every moment-named field written on a monster in src/ (`m._xAt`, `Start`, `From`, `Until`, `Clock`...) is on monsterCarry.js's CARRY_ALIVE, CARRY_DEAD or PHONE_NEW_LIFE, or listed (a census); carryMonsterState keeps every listed field in the same life or death and none across one. Break: src/game/monsterCarry.js: '_bandEngagedAt' off CARRY_ALIVE -> FAIL (tried 2026-11-17).
 * TRAPS §265 (the rule): every request in src/ that names a weapon by its stash place (`stashIdx`, `stashIndex`, a weaponStash `idx`) has its GID_PLACE row (the door adds the id), and every post that puts a weapon up for sale is made under a one-tap lock (claimPlace or claimSell). Break: src/ui/panels/buildings/ExchangePanel.jsx: `if (!claimPlace(S)) return;` gone -> FAIL (tried 2026-11-17).
 * TRAPS §269 (the rule): the gates the trade window shares with two more roads out of the bag are listed, each on the gift or not with why, and the gift's offer and its accept ask _giftClosed and each of them. Break: server/src/trade.js: `this._giftClosed() ||` gone from the trade_offer gate -> FAIL (tried 2026-11-17).
 * TRAPS §274 (the rule): every social worker function that reads a member's `seen` is listed with what its 0 counts as, and the party's leader clock reads `seen || at || ...`. Break: server/src/party.js: the leader clock read `const since = +lm.seen;` only -> FAIL (tried 2026-11-17).
 * TRAPS §286 (the rule): every function in src/ that says two pieces are the same by name and one more piece field reads their ids, or is listed (a census); _armorSame answers by the ids first. Break: wsClient.js: `if (_gidOf(a) && _gidOf(b)) return _gidOf(a) === _gidOf(b);` gone from _armorSame -> FAIL (tried 2026-11-17).
 * TRAPS §287 (the rule): every test in src/ of a socket send's answer reads `!== false` / `=== false` (a truthy or `=== true` test is listed), every dedupe signature kept on the state is kept under `!== false`, and the channel's closed branch answers false. Break: wsClient.js: the channel's `return false;` made `return;` -> FAIL (tried 2026-11-17).
 * TRAPS §288 (the rule): postWithin, run over every way of hearing nothing, answers { ok:false, unsure:true } and passes a real yes and no through; every post that puts something up (the action door's POST /list and /place routes, and any wrapper posting one) has its caller read `unsure` before it frees the card, or is listed. Break: src/game/storeAnswer.js: postWithin's time-out resolves without `unsure: true` -> FAIL (tried 2026-11-17).
 * TRAPS §289 (the rule): in the worker, no counter bumped for each record WALKED bounds a sweep (`n++ >= ...SWEEP...`) but the listed kill-switch pass, and every SWEEP bound on a list counts a list pushed only behind its test. Break: server/src/store.js: the offer pass's bound made `if (walked++ >= STORE.SWEEP_MAX) break;` -> FAIL (tried 2026-11-17).
 * TRAPS §331 (the rule): every read in src/ of the shared Login Key slot (`bt_passphrase`, or a function that hands it back) that is neither a compare nor the TAB_ID_OFF off-ramp is listed by function and what it is put in (a census), and the join builds its key with joinIdentity. Break: wsClient.js: `var _jk = localStorage.getItem('bt_passphrase'); S._joinKey = _jk;` in _tabMoved -> FAIL (tried 2026-11-17).
 *
 * HOW IT READS.  The worker's files (server/src/, card N's walker
 * server/test/src-walk.mjs) and the page's (src/), comments dropped
 * (lib/codeOnly.mjs: esbuild's output, strings in double quotes), strings
 * blanked where a name is searched (lib/maskCode.mjs), one function at a time
 * (lib/fnSpans.mjs).  Systems by name (lib/filesOf.mjs): §163 and §274 the
 * social system's worker files, §176 and §178 the wire's client files, §147's
 * economy for §160.  Pure modules are imported and run across their inputs
 * (§149 hardening.js hardenIsWood, §158 amulet.js _extractableGems, §176 the
 * wire table's placed lists, §245 monsterCarry.js, §265 actions.js, §288
 * storeAnswer.js postWithin).  It READS BroTown.jsx and
 * src/rendering/ (by system, never by path) and edits nothing.  Every list
 * names a function, a field, an action or a type, never a file and line; a
 * name a scan reads is checked to still exist, so a rename turns it red.
 *
 * THE CENSUSES (the plan's rule 3): a place not listed fails, and a listed
 * count only falls; a listed place that is gone fails until its name comes
 * off.  Each known place is under Found in the card's notes.
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch worktree, then undone:
 *   §149  hardening.js hardenIsWood: the slot line moved first            -> FAIL §149 (hardenIsWood decides by the item)
 *         forgeladder.js _hardenLevelFor: `|| slot === 'rangedWeapon'`   -> FAIL §149 (choosers ... compare a slot: _hardenLevelFor)
 *         hardening.js: hardenIsWood renamed hardenIsWoodX               -> FAIL §149 (listed place gone; hardenIsWood runs)
 *   §158  amulet.js _extractableGems: `item.prov === 'minted' &&` gone   -> FAIL §158 (paying without prov; only 'minted')
 *         amulet.js: `_shieldGemCash(ps) { gemGive(ps, ps.shield.gem, false, 1); }` -> FAIL §158 (_shieldGemCash)
 *         amulet.js: _extractableGems renamed                            -> FAIL §158 (loads and runs)
 *   §160  gamble.js: `if (k.startsWith(TICKET_PREFIX)) continue;` gone   -> FAIL §160 (the item wager skips every golden ticket)
 *         gamble.js: a new `aceDouble` giving `bagGive(ps.inventory, k, ...)` -> FAIL §160 (24 today: aceDouble)
 *         eventcapes.js: TICKET_PREFIX renamed                           -> FAIL §160 (eventcapes.js loads)
 *   §163  clans.js _handleClanJoinAccept: the war refusal made `void 0;` -> FAIL §163 (every way into a join-gated clan refuses)
 *         clans.js: its `w.status === 'active'` made 'gone'              -> FAIL §163 (the same; the roster checkers)
 *         alliance.js _handleAllianceWar: `members: p.members.slice()`  -> FAIL §163 (war freezes that do not filter: _handleAllianceWar)
 *         alliance.js: _allyOnWarRoster renamed                          -> FAIL §163 (the same)
 *   §176  wire/out.js: `placed: { m: 'monsterId' }` on monster_kill      -> FAIL §176 (placed types; kept types; the worker places)
 *         eventplace.js placeOf: an unknown type placed                 -> FAIL §176 (the worker places none ... an allowlist)
 *   §178  visualSystems.js: `if (o._away) parkAway(S, o);` gone          -> FAIL §178 (each parks an `_away` copy every frame)
 *         nearJoin.js parkFar: its parkAway gone                        -> FAIL §178 (each one parks the copy: parkFar)
 *         presence2.js: parkAway renamed                                -> FAIL §178 (presence2.js exports)
 *   §202  gathering.js: `if (!this._harvestRecoverOk(...)) {` made `if (false) {` -> FAIL §202 (the allowance and the refusal)
 *         gathering.js: `session.legacyStrikes = (session.legacyStrikes || 0) + 1;` -> FAIL §202 (counters: legacyStrikes)
 *         gathering.js: _harvestRecoverOk renamed                       -> FAIL §202 (defined, bounded by RECOVER_MS)
 *   §245  monsterCarry.js: '_bandEngagedAt' off CARRY_ALIVE             -> FAIL §245 (moment fields on no carry list: _bandEngagedAt)
 *         monsterCarry.js carryMonsterState: its loop from 1            -> FAIL §245 (keeps every listed field)
 *         monsterCarry.js: carryMonsterState renamed                    -> FAIL §245 (loads)
 *   §265  ExchangePanel.jsx: `if (!claimPlace(S)) return;` gone         -> FAIL §265 (each is posted under a one-tap lock)
 *         actions.js: the market place's GID_PLACE row gone             -> FAIL §265 (its row in GID_PLACE)
 *         TradeWindowPanel.jsx: `send('unequip_request', { stashIdx: i })` -> FAIL §265 (unequip_request has no GID_PLACE row)
 *   §269  trade.js: `this._giftClosed() ||` gone from the offer          -> FAIL §269 (_giftClosed on the offer)
 *         trade.js: the fight lock gone from the accept                 -> FAIL §269 (_bagLockedByFight on the accept)
 *         trade.js: _giftClosed renamed                                 -> FAIL §269 (defined in the worker)
 *   §274  party.js: the leader clock `const since = +lm.seen;`          -> FAIL §274 (reads `seen || at || ...`)
 *         alliance.js: a new `_allySeenAgo` reading `p.meta[m].seen`    -> FAIL §274 (social functions that read seen: _allySeenAgo)
 *   §286  wsClient.js _armorSame: the gid line gone                     -> FAIL §286 (_armorSame in the census; ids first)
 *   §287  wsClient.js: the channel's closed `return false;` made `return;` -> FAIL §287 (answers false when not OPEN)
 *         questKept.js: `act(...) !== false` made `=== true`            -> FAIL §287 (truthy or === true: _send)
 *   §288  storeAnswer.js postWithin: the time-out without `unsure: true` -> FAIL §288 (every way of hearing nothing)
 *         ItemDetailPopup.jsx: the `ans.kind === 'unsure'` return gone  -> FAIL §288 (listing posts ... without unsure: ItemDetailPopup)
 *         storeAnswer.js: postWithin renamed                            -> FAIL §288 (loads and runs)
 *   §289  store.js _stSweep: `if (walked++ >= STORE.SWEEP_MAX) break;`  -> FAIL §289 (sweeps that count every record walked: _stSweep: walked)
 *         store.js _stSweep: `due.push(rec)` with no test                -> FAIL §289 (each list is pushed only behind its test)
 *   §331  wsClient.js _tabMoved: `var _jk = localStorage.getItem('bt_passphrase')` -> FAIL §331 (_tabMoved: _jk)
 *         networking/index.js: getBtPassphrase renamed                  -> FAIL §331 (the functions that hand the slot back)
 *
 * Run from the repository's root: node tools/guards/traps-economy-social.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { filesOf } from './lib/filesOf.mjs';
import { spansOf, innerFn, namedFn, closeOf, blockAt } from './lib/fnSpans.mjs';
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
const imp = (rel) => import(pathToFileURL(join(ROOT, rel)).href);

/* v2.3.5942: one build of both trees (one esbuild call) */
const SERVER = srcFiles().map((f) => 'server/src/' + f);
const built = codeOf(['server/src', 'src']);
const SRC = [...built.keys()].filter((f) => f.startsWith('src/'));
const masked = new Map();
const spans = new Map();
const M = (f) => { if (!masked.has(f)) { const m = maskCode(built.get(f)); masked.set(f, m); spans.set(f, spansOf(m)); } return masked.get(f); };
const C = (f) => built.get(f);
const F = (f) => { M(f); return spans.get(f).fns; };
const body = (f, fn) => C(f).slice(fn.a, fn.b + 1);
/* every function by name, in the given files: Map(name -> [{ f, fn }]) */
const defsOf = (files) => {
  const d = new Map();
  for (const f of files) for (const fn of F(f)) {
    if (fn.name === '=>' || fn.name === 'function') continue;
    if (!d.has(fn.name)) d.set(fn.name, []);
    d.get(fn.name).push({ f, fn });
  }
  return d;
};
const SDEFS = defsOf(SERVER);
const sBody = (name) => (SDEFS.get(name) || []).map(({ f, fn }) => body(f, fn)).join('\n');
const nameAt = (f, p) => namedFn(F(f), p) || '(top)';
const outerOrNamed = (f, p) => { const n = nameAt(f, p); return n === '(top)' ? outerName(f, p) : n; };
/* the outermost function around p, by its name or the `const NAME =` it is
   given (a component: `export const PetsPanel = () => {`) */
const outerName = (f, p) => {
  const fn = F(f).filter((x) => x.a <= p && p <= x.b)[0];
  if (!fn) return '(top)';
  if (fn.name !== '=>' && fn.name !== 'function') return fn.name;
  const head = C(f).slice(Math.max(0, fn.a - 200), fn.a);
  const k = /(?:const|let|var)\s+([\w$]+)=(?:async\s*)?(?:\([^)]*\)|[\w$]+)=>$|(?:const|let|var)\s+([\w$]+)=function\([^)]*\)$/.exec(head);
  return k ? (k[1] || k[2]) : nameAt(f, p);
};

/* ── §149: the item decides its kind, never the slot a phone named ── */
{
  const WOOD = /WOODWORKING_TIERS|HARDEN_WOOD_BY_TIER|"woodworking"|hardenIsWood\(/;
  const METAL = /BLACKSMITH_TIERS|HARDEN_BAR_BY_TIER|"blacksmithing"/;
  const SLOT_EQ = /(?<![\w$.])[\w$.]+\s*===?\s*"(?:rangedWeapon|staffWeapon)"|"(?:rangedWeapon|staffWeapon)"\s*===?\s*[\w$]/g;
  /* v2.3.5942: the one slot read a chooser may make, with why */
  const SLOT_KNOWN = {
    hardenIsWood: 'hardening.js: a LEGACY weapon with neither a `ww_` gearBase nor a type is known only by its slot (its last line; the unit run below holds the order)',
  };
  let choosers = 0;
  const found = new Set();
  for (const f of SERVER) for (const fn of F(f)) {
    if (fn.name === '=>' || fn.name === 'function') continue;
    const b = body(f, fn);
    if (!WOOD.test(b) || !METAL.test(b)) continue;
    choosers++;
    if ([...b.matchAll(SLOT_EQ)].length) found.add(fn.name);
  }
  for (const f of SERVER) for (const fn of F(f)) if (fn.name === 'hardenIsWood' && SLOT_EQ.test(body(f, fn))) found.add('hardenIsWood');
  check(`§149: the worker's functions that choose between the wood and the metal tables are read (${choosers})`, choosers >= 6, choosers);
  census('§149', 'choosers of wood or metal that compare a slot to the bow or staff slot', found, SLOT_KNOWN, 1);
  try {
    const { hardenIsWood } = await imp('server/src/hardening.js');
    const SLOTS = ['weapon', 'rangedWeapon', 'staffWeapon', 'shield', undefined, '', '__proto__'];
    const TYPES = ['bow', 'staff', 'greatsword', 'sword', 'dagger', 'axe'];
    const bad = [];
    for (const type of TYPES) for (const gb of ['copper', 'iron', undefined]) {
      const want = type === 'bow' || type === 'staff';
      for (const slot of SLOTS) if (hardenIsWood({ type, gearBase: gb }, slot) !== want) bad.push({ type, gb, slot });
    }
    for (const gb of ['ww_pine', 'ww_hardwood']) for (const type of [undefined, 'greatsword', 'bow']) for (const slot of SLOTS) {
      if (hardenIsWood({ type, gearBase: gb }, slot) !== true) bad.push({ type, gb, slot });
    }
    check('§149: hardenIsWood decides by the item (a `ww_` gearBase, else its type) in every slot; the slot only for a weapon with neither', bad.length === 0, bad);
  } catch (e) { check('§149: hardening.js loads and hardenIsWood runs', false, String(e && e.message)); }
}

/* ── §158: a gem the server cannot prove it set is never paid out ── */
{
  /* a piece's `.gem` turned into a polished gem: the concatenation, or the
     gem door handed a piece's gem */
  const PAY = /"polished_"\s*\+\s*[\w$.[\]]+\.gem(?![\w$])|gemGive\([^;]*?[\w$\]]\.gem(?![\w$])/g;
  const PROV = /\.prov\s*===\s*(?:"minted"|PROV_MINTED)/;
  const KNOWN = {};
  const found = new Set();
  let payers = 0;
  for (const f of SERVER) for (const fn of F(f)) {
    if (fn.name === '=>' || fn.name === 'function') continue;
    const b = body(f, fn);
    for (const x of b.matchAll(PAY)) {
      payers++;
      const before = b.slice(0, x.index + x[0].length);
      if (!PROV.test(before.slice(Math.max(0, before.lastIndexOf(';', x.index) - 200)))) found.add(fn.name);
    }
  }
  check(`§158: the scan finds where a piece's gem is paid out (${payers})`, payers >= 1, payers);
  census('§158', 'functions paying a piece\'s gem without reading its `prov` minted on the way', found, KNOWN, 0);
  try {
    const { amuletMethods } = await imp('server/src/amulet.js');
    const x = Object.create(amuletMethods);
    const bad = [];
    for (const prov of ['minted', 'legacy', undefined, null, 'MINTED', true, 1, '']) {
      const got = x._extractableGems({ prov, gem: 'flame', gearBase: 'copper' }, 'shield');
      if ((got.length > 0) !== (prov === 'minted')) bad.push({ prov, got });
    }
    check('§158: _extractableGems pays a shield\'s gem only for `prov: \'minted\'`, every other provenance nothing', bad.length === 0, bad);
  } catch (e) { check('§158: amulet.js loads and _extractableGems runs', false, String(e && e.message)); }
}

/* ── §160: a generic operation on the bag never multiplies a capped item ── */
{
  /* bagGive with a key that is no literal: by the function, why it cannot
     multiply a one-of item (a golden ticket, eventcapes.js TICKET_PREFIX) */
  const GIVE_KNOWN = {
    _handleAceItemFlipRequest: 'gamble.js: THE generic one: doubles any stack the request names; skips TICKET_PREFIX (checked below)',
    _handleBankMove: 'bank.js: moves a stack between the bank and the bag, the count it took',
    _handleCookRequest: 'cooking.js: the cooked key of a fish (a server table)',
    _handleChestOpen: 'dailychest.js: a prize from the chest\'s own table',
    _devKit: 'devtools.js: the owner\'s Test panel kit (admin)',
    _dungeonReward: 'dungeonreward.js: the boss chest\'s own table',
    _handleCookRecipe: 'cooking.js: a recipe\'s dish (the recipe table)',
    _claimCapeTicket: 'eventcapes.js: THE ticket\'s own drop, under its cap',
    _handleCapeRedeem: 'eventcapes.js: the cape a ticket buys, once',
    _handleFarmAct: 'farm.js: a harvest\'s crops (the farm\'s table)',
    _handleFarmBuy: 'farm.js: a seed from the farm\'s shop',
    _fishCatch: 'fishlog.js: a catch (the fish table)',
    _fishDev: 'fishlog.js: the owner\'s fish lever (admin)',
    _handleNodeStrike: 'gathering.js: a node\'s yield and its shard (the node table)',
    gemGive: 'gems.js: the gem door (its key made from a gem element)',
    _handleMakeHardenedWood: 'hardenedwood.js: hardened wood (its table)',
    _applyCreditToPs: 'inbox.js: a mailed credit, the count its sender paid',
    _handleLootPickup: 'index.js: a loot pile\'s items, each once (the pile is claimed)',
    _grantQuestItem: 'quests.js: a quest reward (the quest table)',
    _handleSmithSalvage: 'salvage.js: a salvage\'s bars and essence',
    _shopBuy: 'shop.js: the shop\'s goods (its table)',
    _handleSmeltBar: 'smelting.js: a bar (the smelting table)',
    _trapJoinConvert: 'trapping.js: traps at the join',
    _handleMakeTraps: 'trapping.js: traps made',
  };
  const GIVE_RE = /(?<![\w$.])bagGive\(([^,]+),\s*([^,]+),/g;
  const found = new Set();
  const where = new Map();
  for (const f of SERVER) {
    const c = C(f);
    for (const x of c.matchAll(GIVE_RE)) {
      if (/^\s*"/.test(x[2])) continue;
      const fn = innerFn(F(f), x.index);
      if (fn && x.index === fn.a - x[0].length) continue;
      if (/function\s+bagGive\($/.test(c.slice(Math.max(0, x.index - 9), x.index + 8))) continue;
      const n = nameAt(f, x.index);
      if (n === 'bagGive') continue;
      found.add(n); where.set(n, f);
    }
  }
  census('§160', 'functions that give the bag a key that is no literal (each says why it cannot multiply a capped item)', found, GIVE_KNOWN, 24);
  const flip = sBody('_handleAceItemFlipRequest');
  check('§160: the item wager (the bag\'s one generic multiplier) skips every golden ticket before it stakes',
    /\.startsWith\(TICKET_PREFIX\)\)continue/.test(flip.replace(/\s+/g, '')) && /bagGive\(/.test(flip));
  try {
    const { TICKET_PREFIX } = await imp('server/src/eventcapes.js');
    check(`§160: eventcapes.js still names the ticket family (TICKET_PREFIX "${TICKET_PREFIX}")`, typeof TICKET_PREFIX === 'string' && TICKET_PREFIX.length > 0);
  } catch (e) { check('§160: eventcapes.js loads', false, String(e && e.message)); }
}

/* ── §163: nobody on an active war's roster is frozen onto a second one ── */
{
  const social = filesOf('social').filter((f) => f.startsWith('server/src/'));
  /* a roster checker: reads a war's status 'active' and its sides' members */
  const checkers = new Set();
  for (const f of SERVER) for (const fn of F(f)) {
    if (fn.name === '=>' || fn.name === 'function') continue;
    const b = body(f, fn);
    if (/\.status\s*===\s*"active"/.test(b) && /\.members(?:\|\|\[\])?\)?\.includes\(/.test(b)) checkers.add(fn.name);
  }
  /* the war freezes: a side `{ ..., members: X, fought: [] }` */
  const freezes = [];
  for (const f of SERVER) {
    const c = C(f);
    for (const x of c.matchAll(/members:([^,}]+),fought:\[\]/g)) freezes.push({ f, fn: nameAt(f, x.index), expr: x[1], at: x.index });
  }
  check(`§163: the war rosters frozen at a declare are found (${freezes.length})`, freezes.length >= 4, freezes.map((z) => z.fn));
  /* by the function that freezes, the join gate that stands for its filter */
  const JOIN_GATED = {
    _handleClanWarDeclare: 'clans.js: the old clans freeze the whole clan; the guard is on the far side, every way INTO a clan refuses a member on an active war\'s roster',
  };
  const unfiltered = new Set();
  for (const z of freezes) {
    const call = /^\s*([\w$]+)\(/.exec(z.expr);
    const fnBody = (() => { const fn = innerFn(F(z.f), z.at); return fn ? body(z.f, fn) : ''; })();
    let ok = false;
    if (call) {
      if (checkers.has(call[1])) ok = true;
      const local = new RegExp('(?:const|let|var)\\s+' + call[1].replace(/\$/g, '\\$') + '=(?:\\([^)]*\\)|[\\w$]+)=>([^;]+)').exec(fnBody);
      if (local && [...checkers].some((k) => local[1].includes('this.' + k + '('))) ok = true;
    }
    if (!ok) unfiltered.add(z.fn);
  }
  census('§163', 'war freezes that do not filter out a player already on an active war\'s roster', unfiltered, JOIN_GATED, 1);
  /* each join-gated freeze: every way into its clans asks the rosters */
  const gatedFiles = new Set(freezes.filter((z) => Object.hasOwn(JOIN_GATED, z.fn)).map((z) => z.f));
  const pushers = [];
  for (const f of gatedFiles) {
    const c = C(f);
    for (const x of c.matchAll(/(?<![\w$])[\w$]+\.members\.push\(/g)) {
      const n = nameAt(f, x.index);
      const b = sBody(n);
      /* it asks the rosters AND refuses on a yes: a `return` right after its
         active-war test, before the member is added */
      const pushAt = b.search(/\.members\.push\(/);
      const tests = [...b.matchAll(/\.status\s*===\s*"active"/g)].map((t) => t.index)
        .concat([...checkers].flatMap((k) => [...b.matchAll(new RegExp('if\\(!?this\\.' + k.replace(/\$/g, '\\$') + '\\(', 'g'))].map((t) => t.index)));
      const asks = tests.some((i) => i < pushAt && /(?<![\w$])return(?![\w$])/.test(b.slice(i, Math.min(pushAt, i + 300))));
      pushers.push({ n, asks });
    }
  }
  check(`§163: the ways into a join-gated clan are found (${pushers.length})`, pushers.length >= 1, pushers);
  check('§163: every way into a join-gated clan refuses a player on an active war\'s roster', pushers.every((p) => p.asks), pushers.filter((p) => !p.asks));
  check(`§163: the social system holds the roster checkers (${[...checkers].join(', ')})`,
    [...checkers].length >= 2 && social.some((f) => /_allyOnWarRoster\(/.test(C(f))), [...checkers]);
}

/* ── §176: a type a phone keeps is never placed ── */
{
  /* v2.3.5942: every PLACED type (the wire table's `placed` column), with the
     reading that its client handler keeps nothing past the moment */
  const PLACED_READ = {
    dice_roll: 'a die\'s throw: drawn for a moment',
    ability_windup: 'a monster\'s wind-up: drawn for its own short clock',
    element_nova: 'a burst: an effect',
    arrow_boom: 'an explosion: an effect',
    monster_attack: 'a swing: the tick carries the monster',
    monster_hit: 'a hit\'s number and flash; the tick carries the hp',
    monster_projectile: 'a shot in flight',
    monster_ability: 'an effect',
    fire_trail: 'a trail that burns out on its own clock',
    parry: 'a parry\'s spark',
    emote: 'an emote drawn for a few seconds (v2.3.3391)',
    gather_node: 'a node\'s swing; the node\'s state is the zone\'s',
    monster_dmg_at: 'a damage number',
    player_dodge: 'a dodge drawn once',
    player_hurt_by_monster: 'a flash; the hp is the tick\'s',
    player_jump: 'a jump',
    player_projectile: 'a shot in flight',
    player_swing: 'a swing',
  };
  /* what a phone KEEPS (TRAPS §176): never placed */
  const KEPT = ['monster_kill', 'player_shield', 'monster_transform', 'campfire_lit', 'campfire_out', 'loot_drop', 'loot_claimed', 'loot_despawn'];
  try {
    const { ROOM_PLACED, RELAY_PLACED } = await imp('server/src/wire/lists.js');
    const placed = new Set([...Object.keys(ROOM_PLACED), ...RELAY_PLACED]);
    check(`§176: the wire table's placed types are read (${placed.size})`, placed.size >= 10, placed.size);
    census('§176', 'placed types (each read: its handler keeps nothing past the moment)', placed, PLACED_READ, Object.keys(PLACED_READ).length);
    check('§176: no type a phone keeps (a kill, a shield, a transform, a campfire, a pile) is placed', KEPT.every((t) => !placed.has(t)), KEPT.filter((t) => placed.has(t)));
    const { placeOf } = await imp('server/src/eventplace.js');
    const leaked = ['some_new_type', ...KEPT].filter((t) => placeOf({ type: t, from: 'pa', payload: { zone: 'wheel', monsterId: 'm', x: 1, y: 1, id: 'pa' } }, () => ({ x: 1, y: 1 }), () => ({ z: 'wheel', x: 1, y: 1 })) !== null);
    check('§176: the worker places none of them, nor a type it does not know (an allowlist)', leaked.length === 0, leaked);
  } catch (e) { check('§176: the wire table and eventplace.js load', false, String(e && e.message)); }
}

/* ── §178: a copy the phone stops hearing about is parked where it is made ── */
{
  /* 1. every `_away = true` parks in its own function */
  const setters = [];
  for (const f of SRC) {
    const c = C(f);
    for (const x of c.matchAll(/(?<![\w$])([\w$]+)\._away=(?:true|!0)/g)) {
      const fn = innerFn(F(f), x.index);
      setters.push({ f, n: nameAt(f, x.index), parks: !!fn && /parkAway\(/.test(body(f, fn)) });
    }
  }
  check(`§178: the places that mark a copy not heard (\`_away = true\`) are found (${setters.length})`, setters.length >= 2, setters);
  check('§178: each one parks the copy in the same function (parkAway)', setters.every((s) => s.parks), setters.filter((s) => !s.parks));
  /* 2. every loop that moves other players' copies each frame parks `_away` first */
  const loops = [];
  for (const f of SRC) {
    const c = C(f);
    for (const x of c.matchAll(/(?<![\w$])([\w$]+)\.renderX\+=/g)) {
      const fn = innerFn(F(f), x.index);
      if (!fn) continue;
      const v = x[1].replace(/\$/g, '\\$');
      const head = c.slice(Math.max(0, fn.a - 160), fn.b + 1);
      if (!/S\.others/.test(head) || !new RegExp('function\\(' + v + '\\)|' + v + '=S\\.others\\[').test(head)) continue;
      loops.push({ f, n: nameAt(f, x.index), parks: new RegExp('if\\(' + v + '\\._away\\)parkAway\\(').test(body(f, fn)) });
    }
  }
  check(`§178: the loops that move other players' copies are found (${loops.length})`, loops.length >= 1, loops);
  check('§178: each parks an `_away` copy every frame (never a ghost where it was last seen)', loops.every((l) => l.parks), loops.filter((l) => !l.parks));
  /* 3. a roster marked `nr` parks the missing */
  const wire = filesOf('wire').filter((f) => f.startsWith('src/'));
  const nrReads = [];
  for (const f of wire) {
    const c = C(f);
    for (const x of c.matchAll(/(?<![\w$])[\w$]+\.nr(?![\w$])/g)) nrReads.push({ f, parks: /parkMissing\(/.test(c.slice(x.index, x.index + 120)) });
  }
  check(`§178: the wire's reads of a roster's \`nr\` are found (${nrReads.length})`, nrReads.length >= 1, nrReads);
  check('§178: each parks the players missing from it (parkMissing)', nrReads.every((r) => r.parks), nrReads.filter((r) => !r.parks));
  try {
    const p2 = await imp('src/game/presence2.js');
    check('§178: presence2.js exports parkAway and parkMissing', typeof p2.parkAway === 'function' && typeof p2.parkMissing === 'function');
  } catch (e) { check('§178: presence2.js loads', false, String(e && e.message)); }
}

/* ── §202: a lenient branch is counted, listed, and narrow ── */
{
  /* v2.3.5942: every per-connection counter the worker keeps (the smell:
     "count its uses for visibility, and move on"), with what follows it */
  const COUNTER_KNOWN = {
    _extractionRejects: 'gathering.js: a too-early strike, refused (too-early)',
    _extractionMissing: 'gathering.js: a strike with no start of its own: a recovery strike (_harvestRecoverOk) or refused no-start',
    _extractionOtherNode: 'gathering.js: a strike with another node\'s start: the same, refused other-node',
    _extractionRecovered: 'gathering.js: a recovery strike paid, once in RECOVER_MS',
    msgDropped: 'flood.js: a message over the pace, dropped',
    roomN: 'flood.js: the room pace\'s count',
    oversize: 'index.js: a frame over the size limit, dropped',
    relayDropped: 'index.js: a relay over its tokens, dropped',
    relayBytesDropped: 'relay.js: a relay over its bytes, dropped',
    reqAgain: 'reqonce.js: a repeat answered once',
    wireDoor: 'wire/door.js: a message whose field broke its trust form, refused',
  };
  const found = new Set();
  const RE = /(?<![\w$.])(?:session|ws)\.([\w$]+)(?:\+\+|=\((?:session|ws)\.\1\|\|0\)\+1)/g;
  for (const f of SERVER) for (const x of C(f).matchAll(RE)) found.add(x[1]);
  census('§202', 'per-connection counters (each a refusal, or a named narrow allowance)', found, COUNTER_KNOWN, 11);
  /* the harvest's: a strike with no start of its own pays only through the allowance */
  const strike = sBody('_handleNodeStrike');
  const elseAt = strike.indexOf('_extractionMissing');
  const tail = elseAt >= 0 ? strike.slice(elseAt) : '';
  check('§202: the harvest strike with no start of its own asks the narrow allowance (_harvestRecoverOk) and refuses on its no (_strikeRefused)',
    /if\(!this\._harvestRecoverOk\(/.test(tail) && tail.indexOf('_strikeRefused(') > tail.indexOf('_harvestRecoverOk(') && /return(?:;|\})/.test(tail.slice(tail.indexOf('_strikeRefused('), tail.indexOf('_strikeRefused(') + 1600)));
  check('§202: _harvestRecoverOk is defined, and bounded by HARVEST_PROOF.RECOVER_MS', /HARVEST_PROOF\.RECOVER_MS/.test(sBody('_harvestRecoverOk')));
}

/* ── §245: a re-pushed monster keeps its moments ── */
{
  try {
    const { CARRY_ALIVE, CARRY_DEAD, PHONE_NEW_LIFE, carryMonsterState } = await imp('src/game/monsterCarry.js');
    const listed = new Set([...CARRY_ALIVE, ...CARRY_DEAD, ...Object.keys(PHONE_NEW_LIFE)]);
    /* a moment field written on a monster anywhere in the page: by its name */
    const MOMENT_RE = /(?<![\w$.])(?:m|mon|monster|mm|_m|tm|mob)\.(_[A-Za-z][\w$]*(?:At|Start|From|Until|Clock|Played|WasAlive|Mine))=(?!=)/g;
    /* v2.3.5942: moment-named fields on no list today (each under Found: a
       fresh object drops it, which ends the clock early rather than replay).
       v2.3.6082 (card V7): the three wind-ups are carried now (CARRY_ALIVE);
       each of the ten left says why a fresh object losing it is harmless. */
    const MOMENT_KNOWN = {
      _chargeUntil: 'monsterCombat.js: the phone\'s own AI\'s charge (a zone it models, which the worker never re-pushes); a fresh object stops charging, no replay',
      _chaseUntil: 'monsterCombat.js, projectiles.js: the phone\'s own AI\'s chase after a hit; a fresh object goes back to its leash, no replay',
      _hitAnimStart: 'monsterCombat.js, projectiles.js, gameEvents.js: a hit\'s flinch (400-600 ms); a fresh object ends it early, the next hit flinches again',
      _hitSndAt: 'hitSounds.js: the spacing between hit sounds; a fresh object at worst lets one echo through',
      _kbUntil: 'monsterCombat.js, projectiles.js: the phone\'s own 200 ms knock-back; a fresh object stands where the worker puts it',
      _noiseAt: 'monsterNoises.js: the spacing between a monster\'s calls; a fresh object at worst calls once more',
      _shootAnimStart: 'monsterCombat.js, gameEvents.js: an attack pose (its _shootAnimEnd beside it is not carried either); a fresh object stands, the hit still lands',
      _stunUntil: 'monsterCombat.js, zoneMechanics.js: a stun; the worker\'s tick sends it again (md.st, wsClient.js) on the next frame',
      _throwReleaseAt: 'monsterMoveEvents.js: a throw\'s release frame, read only within its _shootAnimStart: goes with the pose',
      _transformStart: 'monsterVariants.js, gameEvents.js: a transform\'s shimmer (cleared by monsterNewLife); a fresh object built mid-shimmer ends it early, it never plays again',
    };
    const fields = new Set();
    for (const f of SRC) for (const x of C(f).matchAll(MOMENT_RE)) fields.add(x[1]);
    const off = new Set([...fields].filter((k) => !listed.has(k)));
    check(`§245: the moment fields written on monsters are found (${fields.size}), ${fields.size - off.size} on monsterCarry.js's lists`, fields.size >= 10 && fields.size > off.size);
    census('§245', 'moment fields on no carry list (a new one goes on CARRY_ALIVE/CARRY_DEAD/PHONE_NEW_LIFE in the same change)', off, MOMENT_KNOWN, 10);   /* v2.3.6082: 13 -> 10 (card V7) */
    /* the carry itself, across its four cases, every listed field */
    const bad = [];
    for (const [alive, list] of [[true, CARRY_ALIVE], [false, CARRY_DEAD]]) for (const k of list) {
      const prev = { alive, bs: 1, hp: 0, [k]: 7 };
      const same = carryMonsterState({ alive, bs: 1, hp: 0 }, prev);
      const flip = carryMonsterState({ alive: !alive, bs: 1, hp: 0 }, prev);
      if (same[k] !== 7) bad.push('kept? ' + k);
      if (flip[k] === 7) bad.push('met afresh? ' + k);
    }
    check('§245: carryMonsterState keeps every listed field in the same life or death, and none across one', bad.length === 0, bad);
    const uses = SRC.filter((f) => /carryMonsterState\(/.test(C(f)) && f !== 'src/game/monsterCarry.js');
    check(`§245: a list the phone replaces is carried (carryMonsterState used in ${uses.join(', ')})`, uses.length >= 1, uses);
  } catch (e) { check('§245: monsterCarry.js loads', false, String(e && e.message)); }
}

/* ── §265: a sale names its weapon by id, one tap at a time ── */
{
  try {
    const { GID_PLACE, ACTIONS } = await imp('src/game/actions.js');
    /* 1. every request in the page that names a stash place has its id added */
    const PLACE_KEYS = /(?:^|[,{])(stashIdx|stashIndex|idx):/;
    const missing = [];
    let named = 0;
    for (const f of SRC) {
      const c = C(f);
      const m = M(f);
      for (const x of c.matchAll(/(?<![\w$.])(?:act|send)\("([\w:/-]+)",\s*\{/g)) {
        const open = x.index + x[0].length - 1;
        const lit = c.slice(open, closeOf(m, open) + 1);
        const k = PLACE_KEYS.exec(lit);
        if (!k || !Object.hasOwn(ACTIONS, x[1])) continue;
        if (k[1] === 'idx' && !/weaponStash/.test(lit) && !(GID_PLACE[x[1]] && GID_PLACE[x[1]].key === 'idx')) continue;
        named++;
        if (!GID_PLACE[x[1]] || GID_PLACE[x[1]].key !== k[1]) missing.push(x[1] + ' (' + nameAt(f, x.index) + ')');
      }
    }
    check(`§265: the page's requests that name a weapon by its stash place are found (${named})`, named >= 3, named);
    check('§265: each has its row in GID_PLACE (the action door adds the weapon\'s id: the worker finds it by id, never by a place that moved)', missing.length === 0, missing);
    /* 2. a post that puts a weapon up for sale holds a lock until its answer */
    const SALE_ROUTES = Object.keys(GID_PLACE).filter((n) => n.startsWith('http:'));
    const wrappers = new Map();
    for (const f of SRC) for (const x of C(f).matchAll(/(?<![\w$.])const ([\w$]+)=(?:\([^)]*\)|[\w$]+)=>post\("([\w:/-]+)"/g)) if (SALE_ROUTES.includes(x[2])) wrappers.set(x[1], x[2]);
    const sites = [];
    for (const f of SRC) {
      const c = C(f);
      const re = new RegExp('(?<![\\w$.])(?:act\\("(?:' + SALE_ROUTES.join('|').replace(/[/:]/g, (s) => s) + ')"|(?:' + ([...wrappers.keys()].join('|') || '\\b\\B') + ')\\()', 'g');
      for (const x of c.matchAll(re)) {
        if (/const $/.test(c.slice(Math.max(0, x.index - 40), x.index))) continue;
        const near = c.slice(Math.max(0, x.index - 6000), x.index);
        sites.push({ at: outerName(f, x.index), locks: /(?<![\w$])(?:claimPlace|claimSell)\(/.test(near) });
      }
    }
    check(`§265: the posts that put a weapon up for sale are found (${sites.length}: ${SALE_ROUTES.join(', ')})`, sites.length >= 2, sites);
    check('§265: each is posted under a one-tap lock (claimPlace or claimSell), never a panel ref alone', sites.every((s) => s.locks), sites.filter((s) => !s.locks));
  } catch (e) { check('§265: actions.js loads', false, String(e && e.message)); }
}

/* ── §269: every rule of the bag's roads is on the gift's offer and accept ── */
{
  const econ = filesOf('economy').filter((f) => f.startsWith('server/src/'));
  const window2 = econ.find((f) => /(?:^|[,{}\s;])(?:async\s+)?_handleTrade2Confirm\(/.test(M(f)));
  const gateCalls = (f) => new Set([...C(f).matchAll(/if\([^{;]*?this\.(_[\w$]+)\(/g)].map((x) => x[1]));
  const shared = new Set();
  if (window2) {
    for (const n of gateCalls(window2)) if (econ.filter((f) => f !== window2 && gateCalls(f).has(n)).length >= 2) shared.add(n);
  }
  /* v2.3.5942: the gates the trade window shares with two more roads: on the gift or not, and why */
  const ROAD_RULES = {
    _bagLockedByFight: { on: 'both', why: 'the fight lock: no road out of the bag while fighting a player (v2.3.3183)' },
    _invCount: { on: 'accept', why: 'own-property counts: the gift\'s accept proves the goods (the offer moves nothing)' },
    _paceTake: { on: 'none', why: 'the message pace, not a rule of the bag (the gift rides the relay\'s bucket)' },
    _opSeen: { on: 'none', why: 'an opId\'s once; the gift is single-shot by its pending offer instead' },
    /* v2.3.6022 (card RV): the dying take nothing (life.js; TRAPS §150) */
    _deadTakeOn: { on: 'accept', why: 'a dying sender gives nothing: the gift\'s accept is where it takes (the offer moves nothing), trade.js _interceptTrade (v2.3.6022)' },
  };
  check('§269: the trade window (_handleTrade2Confirm) is found in the economy\'s files', !!window2);
  census('§269', 'gates the trade window shares with two more roads out of the bag', shared, ROAD_RULES, 5);   /* v2.3.6022: 4 -> 5, `deadtake` on the window, the gift and the arena (a new rule of the bag's roads, listed as the trap asks) */
  let offer = '';
  let accept = '';
  for (const f of SERVER) {
    const c = C(f);
    const m = M(f);
    const x = /if\(msg\.type==="trade_offer"\)\{/.exec(c);
    if (!x) continue;
    const open = x.index + x[0].length - 1;
    const close = closeOf(m, open);
    const fn = innerFn(F(f), x.index);
    offer = c.slice(open, close + 1);
    accept = fn ? c.slice(close + 1, fn.b + 1) : '';
  }
  check('§269: the gift\'s offer and accept are found (the `trade_offer` branch and what follows it)', offer.length > 0 && accept.length > 0);
  const miss = [];
  for (const [n, r] of [['_giftClosed', { on: 'both' }], ...Object.entries(ROAD_RULES)]) {
    const call = 'this.' + n + '(';
    if ((r.on === 'both') && !offer.includes(call)) miss.push(n + ' on the offer');
    if ((r.on === 'both' || r.on === 'accept') && !accept.includes(call)) miss.push(n + ' on the accept');
  }
  check('§269: the gift asks _giftClosed and every road rule on its offer AND its accept', miss.length === 0, miss);
  const undef = ['_giftClosed', ...Object.keys(ROAD_RULES)].filter((n) => !SDEFS.has(n));
  check('§269: _giftClosed and every road rule are defined in the worker (a rename turns this red)', undef.length === 0, undef);
}

/* ── §274: a `seen` of 0 is read by every clock, each saying what it counts from ── */
{
  const social = filesOf('social').filter((f) => f.startsWith('server/src/'));
  /* v2.3.5942: every function of the social system's worker files that reads a
     member's `seen`, and what its 0 ("not known") counts as */
  const SEEN_READ = {
    allyRowOf: 'alliance.js: the board\'s act list: 0 is not active (an unknown member does not count, the safe side)',
    _allyCount: 'alliance.js: who counts now: 0 is not active (the same)',
    _partyWire: 'party.js: the "last on" seconds: 0 shows none',
    _partyStore: 'party.js: the stored meta written (`+m.seen || 0`, a copy, and its `ss`)',
    _partyLoad: 'party.js: a stored meta read back (a copy, and its `ss`)',
    _partyOnRejoin: 'party.js: THE leader clock at a member\'s join: `seen || at || ts` (kill switch leaderidleat)',
  };
  const found = new Set();
  for (const f of social) {
    const c = C(f);
    for (const x of c.matchAll(/(?<=[\w$\])])\.seen(?![\w$])(?!=[^=])/g)) found.add(nameAt(f, x.index));
  }
  census('§274', 'social functions that read a member\'s `seen`', found, SEEN_READ, 6);
  const clocks = [];
  for (const f of social) for (const fn of F(f)) {
    if (fn.name === '=>' || fn.name === 'function') continue;
    const b = body(f, fn);
    if (/leader/.test(b) && /\.seen(?![\w$])/.test(b) && /PARTY\.LEADER_IDLE|LEADER_IDLE/.test(b)) clocks.push({ n: fn.name, falls: /\+?[\w$]+\.seen\|\|\+?[\w$]+\.at\|\|/.test(b.replace(/\s+/g, '')) });
  }
  check(`§274: the party's leader clock is found (${clocks.map((c) => c.n).join(', ')})`, clocks.length >= 1, clocks);
  check('§274: it reads `seen || at || ...`: a never-seen leader counts from when they joined', clocks.every((c) => c.falls), clocks);
}

/* ── §286: two pieces with ids are the same only by their ids ── */
{
  /* a function that says two pieces are the same by name and one more piece
     field of both (a signature), the name maybe wrapped (`String(a.name || '')`) */
  const SIG = /(?<![\w$.])([\w$]+)\.name[^;=]{0,10}===[^;]{0,10}?(?<![\w$.])([\w$]+)\.name(?![\w$])/;
  const FIELD = '\\.(?:tierMult|gearBase|type|quality)(?![\\w$])';
  const GID = /\.gid(?![\w$])|_gidOf\(|gidOf\(/;
  /* v2.3.5942: matched by signature with no id today (each under Found) */
  const SAME_KNOWN = {
    sameWeapon: 'equipActions.js: a bag weapon found again after the array was replaced, by signature at the tapped index (no gid read)',
    refreshTarget: 'revealBag.js: the opened blade found at its place by name, type and gearBase (no gid read)',
  };
  const found = new Set();
  const withId = [];
  for (const f of SRC) {
    if (!/\.name[^;=]{0,10}===/.test(C(f))) continue;
    for (const fn of F(f)) {
      const b = body(f, fn);
      const x = SIG.exec(b);
      if (!x || x[1] === x[2]) continue;
      const e = (v) => v.replace(/\$/g, '\\$');
      if (!new RegExp('(?<![\\w$.])' + e(x[1]) + FIELD).test(b) || !new RegExp('(?<![\\w$.])' + e(x[2]) + FIELD).test(b)) continue;
      const n = fn.name === '=>' || fn.name === 'function' ? nameAt(f, fn.a) : fn.name;
      if (GID.test(b)) withId.push(n); else found.add(n);
    }
  }
  check(`§286: the pieces matched by signature that read the id first are found (${withId.join(', ')})`, withId.includes('_armorSame'), withId);
  census('§286', 'functions matching two pieces by name and signature with no id read', found, SAME_KNOWN, 2);
  const as = (() => { for (const f of SRC) for (const fn of F(f)) if (fn.name === '_armorSame') return body(f, fn); return ''; })();
  check('§286: _armorSame answers by the ids when both pieces carry one, before name and tierMult',
    /if\(_gidOf\(a\)&&_gidOf\(b\)\)return _gidOf\(a\)===_gidOf\(b\)/.test(as) && as.indexOf('_gidOf(') < as.indexOf('.name'));
}

/* ── §287: a send's answer is `false` only when it dropped ── */
{
  /* 1. every test of a socket send's answer reads `!== false` / `=== false` */
  const SEND = /(?<![\w$.])(?:act|[\w$]*\.channel\.send|channelShim\.send)\(/g;
  const TRUTHY_KNOWN = {
    /* v2.3.6082 (card V7, the planning session's reading (b)): kept, with why */
    _sendMute: 'chatMute.js: `=== true`, on purpose: server/test/mute-kept.test.mjs 6c pins it (v2.3.4402), and the mute\'s path (a broadcast) answers only true (sent) or false (dropped), so both readings agree; the undefined answers are other ways (wsOut)',
  };
  const found = new Set();
  let tested = 0;
  for (const f of SRC) {
    const c = C(f);
    const m = M(f);
    for (const x of c.matchAll(SEND)) {
      const open = x.index + x[0].length - 1;
      if (/^"http:/.test(c.slice(open + 1, open + 7))) continue;
      const close = closeOf(m, open);
      const after = c.slice(close + 1, close + 12);
      const pre = c.slice(Math.max(0, x.index - 2), x.index);
      const cmp = /^\s*([!=]==?)\s*(true|false|!0|!1)/.exec(after);
      if (cmp) {
        tested++;
        if (/true|!0/.test(cmp[2])) found.add(nameAt(f, x.index));
      } else if (/!$/.test(pre) && !/!=$/.test(pre)) { tested++; found.add(nameAt(f, x.index)); }
    }
  }
  check(`§287: the tests of a send's answer are found (${tested})`, tested >= 2, tested);
  census('§287', 'functions that read a send\'s answer as truthy or `=== true` (undefined is SENT)', found, TRUTHY_KNOWN, 1);
  /* 2. a dedupe signature is kept only when its message went */
  const marks = [];
  for (const f of SRC) {
    const c = C(f);
    for (const x of c.matchAll(/(?<![\w$.])S\.(_last[\w$]*Sig[\w$]*)=(?!=)/g)) {
      marks.push({ k: x[1], gated: /if\([\w$]+!==false\)$/.test(c.slice(Math.max(0, x.index - 40), x.index)) });
    }
  }
  check(`§287: the dedupe signatures kept on the state are found (${marks.map((x) => x.k).join(', ')})`, marks.length >= 1, marks);
  check('§287: each is kept only when the send did not answer false', marks.every((x) => x.gated), marks.filter((x) => !x.gated));
  /* 3. the channel answers false when the socket is not open */
  const wire = filesOf('wire').filter((f) => f.startsWith('src/'));
  /* the channel's `send` (the one whose first test is the socket's state) */
  const shims = [];
  for (const f of wire) {
    const m = M(f);
    for (const fn of F(f)) {
      if (fn.name !== 'send') continue;
      const b = body(f, fn);
      const x = /^\{if\(!ws\|\|ws\.readyState!==WebSocket\.OPEN\)\{/.exec(b);
      if (!x) continue;
      const open = fn.a + x[0].length - 1;
      const blk = C(f).slice(open, closeOf(m, open) + 1);
      shims.push(/return false\}$/.test(blk));
    }
  }
  check(`§287: the channel's send is found (${shims.length}), and answers false when the socket is not OPEN (its closed branch ends \`return false\`)`,
    shims.length === 1 && shims[0], shims);
}

/* ── §288: no answer from the store is "not sure", never "no" ── */
{
  try {
    const { postWithin, cardAnswer } = await imp('src/game/storeAnswer.js');
    const never = () => new Promise(() => {});
    const cases = [
      ['a fetch that throws', () => Promise.reject(new Error('net'))],
      ['an answer that is not JSON', () => Promise.resolve({ json: () => Promise.reject(new Error('cut')) })],
      ['no answer in time', never],
      ['a fetch with no json', () => Promise.resolve({})],
    ];
    const bad = [];
    for (const [what, fi] of cases) {
      const r = await postWithin(fi, '/x', {}, 20);
      if (!r || r.ok !== false || r.unsure !== true) bad.push({ what, r });
    }
    const yes = await postWithin(() => Promise.resolve({ json: () => Promise.resolve({ ok: true, id: 1 }) }), '/x', {}, 50);
    const no = await postWithin(() => Promise.resolve({ json: () => Promise.resolve({ ok: false, error: 'Nope' }) }), '/x', {}, 50);
    check('§288: postWithin answers { ok:false, unsure:true } for every way of hearing nothing', bad.length === 0, bad);
    check('§288: ...and passes the store\'s own yes and no through, never unsure', yes.ok === true && !yes.unsure && no.ok === false && !no.unsure, { yes, no });
    check('§288: cardAnswer reads unsure as unsure', cardAnswer({ ok: false, unsure: true }, 1, 1).kind === 'unsure');
  } catch (e) { check('§288: storeAnswer.js loads and postWithin runs', false, String(e && e.message)); }
  /* every post that puts something UP (a listing: its repeat makes a second
     copy) has its caller read `unsure` before it frees the card */
  const LIST_ROUTES = [];
  try {
    const { ACTIONS } = await imp('src/game/actions.js');
    for (const [n, r] of Object.entries(ACTIONS)) if (r.way === 'http' && r.method === 'POST' && /\/api\/(?:store|market)\/(?:list|place)$/.test(r.path || '')) LIST_ROUTES.push(n);
  } catch (e) { /* §265 said */ }
  check(`§288: the listing routes are read off the action door (${LIST_ROUTES.join(', ')})`, LIST_ROUTES.length >= 2, LIST_ROUTES);
  /* a wrapper whose post names a listing route, or a route that is no row */
  const wrappers = new Map();
  for (const f of SRC) for (const x of C(f).matchAll(/(?<![\w$.])const ([\w$]+)=(?:\([^)]*\)|[\w$]+)=>post\("([^"]*)"/g)) {
    if (LIST_ROUTES.includes(x[2]) || /\/list$/.test(x[2])) wrappers.set(x[1], x[2]);
  }
  /* v2.3.5942: by the function that awaits it, with why (each under Found) */
  const UNSURE_KNOWN = {
    PetsWas: 'PetsPanel.jsx (v2.3.6696: today\'s page, `?ui2=0`, named PetsWas since the choice took PetsPanel): the pet\'s List frees its button on any answer and says "Not listed" on unsure (and storeListPet posts "/list", a route with no action row: the door refuses it, so it never leaves the page)',
    ExchangePanel: 'ExchangePanel.jsx: the General Store\'s Place posts with no time limit (no postWithin); a fetch error frees the lock (storeSellTap.js: interim, until the worker names a weapon by its id)',
  };
  const found = new Set();
  const seen = [];
  for (const f of SRC) {
    const c = C(f);
    const re = new RegExp('(?<![\\w$.])(?:act\\("(?:' + LIST_ROUTES.join('|') + ')"|(?:' + ([...wrappers.keys()].join('|') || '\\b\\B') + ')\\()', 'g');
    for (const x of c.matchAll(re)) {
      if (/const $/.test(c.slice(Math.max(0, x.index - 40), x.index))) continue;
      const fn = innerFn(F(f), x.index);
      const b = fn ? c.slice(x.index, fn.b + 1) : '';
      const n = outerName(f, x.index);
      seen.push(n);
      if (!/\.unsure(?![\w$])|cardAnswer\(/.test(b)) found.add(n);
    }
  }
  check(`§288: the listing posts are found (${seen.length})`, seen.length >= 2, seen);
  census('§288', 'listing posts whose caller frees the card without reading `unsure`', found, UNSURE_KNOWN, 2);
}

/* ── §289: a sweep is bounded by what it ACTS on ── */
{
  /* a sweep's bound: a constant named SWEEP; a counter bumped as each record is
     WALKED (`looked++ >= ...SWEEP...`) is the trap; a list of the due ones is the rule */
  const WALK_KNOWN = {
    '_stSweep: looked': 'store.js: `disable_offer_sweep_all`, the kill switch\'s old first-20 pass, kept on purpose',
  };
  const found = new Set();
  const due = [];
  for (const f of SERVER) {
    const c = C(f);
    for (const x of c.matchAll(/(?<![\w$.])([\w$]+)\+\+\s*>=?\s*[\w$.]*SWEEP[\w$]*/g)) found.add(nameAt(f, x.index) + ': ' + x[1]);
    for (const x of c.matchAll(/(?<![\w$.])([\w$]+)\.length\s*>=?\s*[\w$.]*SWEEP[\w$]*\)break/g)) {
      const fn = innerFn(F(f), x.index);
      const b = fn ? body(f, fn) : '';
      const v = x[1].replace(/\$/g, '\\$');
      /* the list is pushed only for a record that is DUE: behind an `if`, or after a `continue` */
      const push = new RegExp('(?:if\\([^;]*\\)|continue;[^]*?)' + v + '\\.push\\(').test(b);
      due.push({ n: nameAt(f, x.index), list: x[1], push });
    }
  }
  check(`§289: the sweeps bounded by a list of what they act on are found (${due.length})`, due.length >= 3, due);
  check('§289: each list is pushed only for a record that is due (behind its test)', due.every((d) => d.push), due.filter((d) => !d.push));
  census('§289', 'sweeps that count every record walked toward their bound', found, WALK_KNOWN, 1);
  check('§289: _soHasDue (the offer pass\'s test) is defined', SDEFS.has('_soHasDue'));
}

/* ── §331: the page's identity is the pair it started with ── */
{
  /* every read of the shared Login Key slot, by function and what it is put
     in; a function that only returns it (getBtPassphrase, activePhrase) is
     the slot too, and each call of it a read */
  const SLOT = '(?:localStorage\\.getItem|_ls)\\("bt_passphrase"\\)';
  const wrappers = new Set();
  for (const f of SRC) for (const x of C(f).matchAll(new RegExp('function ([\\w$]+)\\(\\)\\{return ' + SLOT + '\\}', 'g'))) wrappers.add(x[1]);
  check(`§331: the functions that hand the slot back are found (${[...wrappers].join(', ')})`, wrappers.has('getBtPassphrase') && wrappers.size === 2, [...wrappers]);
  const READ = new RegExp(SLOT + '|(?<![\\w$.])(?:' + [...wrappers].join('|') + ')\\(\\)', 'g');
  /* v2.3.5942: by `function: what it is put in`, with why it is no
     substitute for the tab's own pair (S._tabKey, S.myId) */
  const SLOT_KNOWN = {
    'getBtPassphrase: (direct)': 'networking/index.js: the slot, handed back (each call below is listed)',
    'activePhrase: (direct)': 'charRoster.js: the slot, handed back (no caller today but its export)',
    'getBtPlayerId: phrase': 'networking/index.js: the id of the slot\'s key (exported to the console only)',
    'applyAccountLogin: prev': 'networking/index.js: the Login form\'s switch: the old key kept as prev before the new one is written',
    'readRoster: cur': 'charRoster.js: the character list\'s seeding, which key is active',
    'adoptSharedPhrase: (direct)': 'charRoster.js: a first boot adopts the roster\'s key only when the slot is empty',
    'activateChar: cur': 'charRoster.js: the picker\'s switch: no write when it is already the slot',
    'BroTown2: _pf': 'BroTown.jsx: S.myId at the page\'s start, the pair\'s id',
    'BroTown2: (direct)': 'BroTown.jsx: S._tabKey at the page\'s start, the pair\'s key',
    'onCreateNew: _curPf': 'BroTown.jsx: Create: is the slot still the key this session IS (compared with S.myId)',
    '_tabRowKey: (direct)': 'BroTown.jsx: rowKey compares the slot with the tab\'s key (game/tabIdentity.js)',
    'BroTown2: _fp': 'BroTown.jsx: the boot: a stale ?create (the slot\'s key already in the roster)',
    'BroTown2: _p': 'BroTown.jsx: the boot\'s door check (?login=1): before any tab plays',
    'BroTown2: phrase': 'BroTown.jsx: the boot: no key in the slot is the login door',
    'AccountKeyCard: phrase': 'AccountKeyCard.jsx: the account card shows the key to write down',
    'statusFor: (direct)': 'MorePanel.jsx: the Log out row\'s words (is there a key)',
    'AccountLoginForm: curKey': 'AccountLoginForm.jsx: the confirm view shows which key is in use',
    '_tabJoin: _slot': 'wsClient.js: joinIdentity COMPARES it with the tab\'s pair (game/tabIdentity.js)',
    'connect: _oldPf': 'wsClient.js: the key_new road under TAB_ID_OFF: the old key kept as prev',
    'connect: _kcur': 'wsClient.js: key_new: keyNewPlan compares it with the tab\'s pair',
    'connect: _kslot': 'wsClient.js: the fallback: slotIsMine compares it with the tab\'s pair',
  };
  const found = new Set();
  for (const f of SRC) {
    const c = C(f);
    for (const x of c.matchAll(READ)) {
      const end = x.index + x[0].length;
      const after = c.slice(end, end + 4);
      const before = c.slice(Math.max(0, x.index - 60), x.index);
      if (/^\s*[!=]==/.test(after) || /[!=]==\s*$/.test(before)) continue;   /* compared */
      if (/TAB_ID_OFF\?$/.test(before)) continue;                            /* the off-ramp, one phone */
      if (/function\s*$/.test(before)) continue;                              /* a wrapper's own name */
      const v = /(?:var |let |const )?([\w$]+)=(?:\(\)=>)?$/.exec(before.replace(/try\{$/, '').replace(/[;{]?var [\w$]+;try\{$/, ''));
      found.add(outerOrNamed(f, x.index) + ': ' + (v ? v[1] : '(direct)'));
    }
  }
  census('§331', 'reads of the shared Login Key slot that are neither a compare nor the off-ramp (each says what it is for)', found, SLOT_KNOWN, 21);
  /* the join's key is the tab's own (joinIdentity), never the slot at send */
  const wire = filesOf('wire').filter((f) => f.startsWith('src/'));
  const joins = wire.filter((f) => /joinIdentity\(/.test(C(f)));
  check(`§331: the join builds its key from the tab's pair (joinIdentity in ${joins.join(', ')})`, joins.length >= 1, joins);
  try {
    const ti = await imp('src/game/tabIdentity.js');
    check('§331: tabIdentity.js exports joinIdentity', typeof ti.joinIdentity === 'function');
  } catch (e) { check('§331: tabIdentity.js loads', false, String(e && e.message)); }
}

process.exit(failed ? 1 : 0);
