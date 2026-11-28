/* ═══ v2.3.6843: BRO LEADS WITH THE THREE WEAPONS (card UI4 PR 4, the owner's V17) ═══
 *
 * The owner's V17 (docs/design/v17/MASTER-IMPLEMENTATION.md line 55): "Bro
 * presents recognizable Sword/Bow/Staff artwork, levels/progress and
 * available points first, then Character stats and Pets, with active weapon
 * damage and health afterward. Distinguish equipped weapon from in-hand
 * weapon."  The rules are src/game/broV17.js; the page sheet/BroV17.jsx;
 * the switch `?v17bro` (on; `=0` remembered gives sheet/BroLanding.jsx).
 *
 * This suite runs what the rules DO (finish.md part 5 rule 5) and reads the
 * SYNTAX TREE of the page and of BroCard (rule 2), and fails:
 *   1. the switch: not on by default; `=0` not off or not remembered; `=1`
 *      not forgetting; a stored "0" not off; storage that throws not the
 *      default; another switch's name throwing it;
 *   2. the weapons: not Sword, Bow, Staff in that order; a lane's level, XP
 *      or points not the Combat hub's (combatHubDoors: the worker's pools);
 *      a cue at zero points, or none while there are some; another player's
 *      page given your cue or your hand;
 *   3. the hand: the held lane not "held"; a merely worn one "held"; a lane
 *      with nothing worn anything but "none"; two held at once;
 *   4. the two doors: not Shared then Pets; Shared's points not the shared
 *      pool's, or its cue at zero; Pets not locked without `petbook`;
 *   5. NOTHING LOST: a door of Bro's six (broHub.js BRO_HUB_DOORS) or an entry
 *      of its strip (BRO_STRIP) on neither row of the new page (Combat's
 *      weapons ARE the first row); an entry twice;
 *   6. the strip: a page that does not hold its entries WHOLE beside its
 *      pager at a width (a word cut at the edge); an entry on no page, or on
 *      two; an entry narrower than its least width; a pager where every
 *      entry fits; a page beyond the last not wrapping to the first;
 *   7. the room: a phone on its side not one row ('side'); a computer's or a
 *      tablet's 600 px block not 'wide'; an upright phone not 'upright';
 *      the facts in the doors' row where it is under its least width;
 *   8. the page (its syntax tree): a kit piece made with no `intent`; a
 *      weapon tile not the kit's level tile; a fact given a handler (a
 *      passive number pressable); a portrait, a name or a combat level read
 *      (the HUD has them: charPage.combatLv, portraitSrc, CharacterHud); a
 *      "+" drawn in a weapon's tile; the cue drawn without asking `cue`; the
 *      state's words not drawn (a colour alone); `S` reached for (the page is
 *      handed it: open-hand.test); a raw <button> (built FROM the kit);
 *   9. BroCard (its syntax tree): the switch not read through v17BroWanted,
 *      or BroLanding not the off branch (=0 must give the six and the strip);
 *      the Combat hub's door (`combat`) or the hub's page gone from BroCard.
 * THE DODGES (finish.md part 5 rule 1) are planted in part P, each red.
 *
 * Run: node tools/guards/bro-v17.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500))); }
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;

let B = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try {
    const req = createRequire(path.join(ROOT, pkg));
    const tr = req('@babel/traverse');
    B = { parse: req('@babel/parser').parse, traverse: tr.default || tr };
    break;
  } catch (e) { /* the next */ }
}
check('0. @babel/parser and @babel/traverse load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });

const mem = (init) => { const m = new Map(init || []); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'brov17-'));
let nTmp = 0;
/* a copy of a module with `src` for its text, its relative imports made absolute from `dir` */
async function moduleOf(src, dir) {
  const abs = src.replace(/from '(\.{1,2}\/[^']+)'/g, (m0, rel) => `from '${pathToFileURL(path.resolve(ROOT, dir, rel)).href}'`);
  const f = path.join(TMP, 'm' + (nTmp++) + '.mjs');
  fs.writeFileSync(f, abs);
  return import(pathToFileURL(f).href);
}

const CH = await import(url('src/game/combatHub.js'));
const BH = await import(url('src/game/broHub.js'));
const P3 = await import(url('src/data/prog3.js'));

/* a character: three lanes at their levels, the pools as the worker holds them (prog3.pool / poolShared) */
function rpgOf({ lv = [3, 1, 2], pool = 0, shared = 0, lanes = null } = {}) {
  const sk = {};
  ['sword', 'bow', 'staff'].forEach((c, i) => { sk[c] = { level: lv[i], xp: 10 * (i + 1) }; });
  /* prog3.js: `pool` the lanes' total, `poolBy` a lane's own, `shared` the shared pool (prog3Shared) */
  const prog3 = { sk, alloc: {}, pool: lanes ? Object.values(lanes).reduce((a, b) => a + b, 0) : pool, shared };
  if (lanes) prog3.poolBy = lanes;
  return { prog3, activeSlot: 'melee', maxHp: 100 };
}

/* ── the behaviour: a list of what is wrong (empty: right) ── */
function behave(M) {
  const bad = [];
  const t = (name, ok) => { if (!ok) bad.push(name); };
  const safe = (fn, d) => { try { return fn(); } catch (e) { return d === undefined ? 'threw ' + e.message : d; } };
  /* 1. the switch */
  const on = (search, store) => safe(() => M.v17BroWanted(search, store));
  t('1 on by default', on('', mem()) === true);
  const s0 = mem();
  t('1 ?v17bro=0 off', on('?v17bro=0', s0) === false);
  t('1 ...remembered (bt_v17bro "0")', s0.getItem('bt_v17bro') === '0');
  t('1 ...the next visit with no address off', on('', s0) === false);
  t('1 ?v17bro=1 on, and the stored off forgotten', on('?v17bro=1', s0) === true && s0.getItem('bt_v17bro') === null);
  t('1 a stored "0" off', on('', mem([['bt_v17bro', '0']])) === false);
  const boom = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => { throw new Error('no'); } };
  t('1 storage that throws: on', on('', boom) === true);
  t('1 ...and ?v17bro=0 still off this visit', on('?v17bro=0', boom) === false);
  for (const other of ['?bro=0', '?v17brox=0', '?v17look=0', '?v17wide=0', '?xv17bro=0']) t(`1 ${other} is not the switch`, on(other, mem()) === true);

  /* 2. the weapons, against the Combat hub's own doors */
  for (const [label, R, chan] of [['no points', rpgOf(), false], ['pooled points', rpgOf({ pool: 2 }), false], ['lanes', rpgOf({ lanes: { sword: 0, bow: 3, staff: 0 }, shared: 1 }), true]]) {
    const hand = { held: 'sword', worn: { sword: true, bow: true, staff: false } };
    const W = safe(() => M.broV17Weapons(R, chan, null, hand), []);
    const H = CH.combatHubDoors(R, chan, null).filter((d) => d.cat);
    t(`2 ${label}: Sword, Bow, Staff in that order`, Array.isArray(W) && W.map((w) => w.cat).join(',') === 'sword,bow,staff');
    for (let i = 0; i < 3; i++) {
      const w = W[i] || {}, h = H[i];
      t(`2 ${label}: ${h.cat}'s level, XP and points are the hub's`, !!w.progress && w.progress.level === h.progress.level && w.progress.xpNow === h.progress.xpNow && w.points === h.points);
      t(`2 ${label}: ${h.cat}'s picture and page are the hub's`, w.art === h.art && w.opens === h.opens);
      t(`2 ${label}: ${h.cat}'s cue only while it has points (${h.points})`, w.cue === (h.points > 0));
    }
    const O = safe(() => M.broV17Weapons(R, chan, { name: 'Sunburn' }, hand), []);
    t(`2 ${label}: another player's page: no cue, no points, no hand`, O.length === 3 && O.every((w) => w.cue === false && w.points == null && w.hand == null));
  }
  /* 3. the hand */
  const hh = (held, worn) => safe(() => M.broV17Weapons(rpgOf(), false, null, { held, worn }).map((w) => w.hand).join(','), '');
  t('3 held sword, all worn: held, worn, worn', hh('sword', { sword: true, bow: true, staff: true }) === 'held,worn,worn');
  t('3 held staff: worn, worn, held', hh('staff', { sword: true, bow: true, staff: true }) === 'worn,worn,held');
  t('3 nothing worn in the bow: none', hh('sword', { sword: true, bow: false, staff: true }) === 'held,none,worn');
  t('3 the held lane with nothing worn: none, never held', hh('bow', { sword: true, bow: false, staff: true }) === 'worn,none,worn');
  t('3 nothing worn at all: none three times', hh('sword', {}) === 'none,none,none');
  t('3 never two held', ['sword', 'bow', 'staff'].every((c) => hh(c, { sword: true, bow: true, staff: true }).split(',').filter((x) => x === 'held').length === 1));
  /* 4. the two doors (a worker with the shared pool: prog3.js setProg3SharedEnabled, set back after) */
  for (const [label, R, chan, caps, sharedOn] of [['no points', rpgOf(), false, { petbook: true }, false], ['shared 4', rpgOf({ shared: 4, lanes: { sword: 2, bow: 0, staff: 0 } }), true, { petbook: true }, true], ['no petbook', rpgOf({ pool: 1 }), false, {}, false]]) {
    P3.setProg3SharedEnabled(sharedOn);
    const D = safe(() => M.broV17Doors(R, chan, caps, null), []);
    const hub = CH.combatHubDoors(R, chan, null).find((d) => d.id === 'shared');
    t(`4 ${label}: Shared then Pets`, D.map((d) => d.id).join(',') === 'shared,pets');
    const s = D[0] || {};
    t(`4 ${label}: Shared's points the shared pool's (${hub.points}), its cue only while some`, s.points === hub.points && s.cue === (hub.points > 0) && s.opens === 'page:broShared');
    const p = D[1] || {};
    const petsHub = BH.broHubDoors(caps).find((d) => d.id === 'pets');
    t(`4 ${label}: Pets locked exactly when Bro's own Pets is (petbook)`, p.locked === !!petsHub.locked && p.opens === petsHub.opens && p.art === petsHub.art);
    P3.setProg3SharedEnabled(false);
  }
  /* 5. nothing lost */
  for (const [inStrip, petsIn] of [[false, false], [true, false], [true, true]]) {
    const S = safe(() => M.broV17Strip(inStrip, petsIn), []);
    const ids = S.map((e) => e.kind + ':' + e.id);
    const doors = S.filter((e) => e.kind === 'door' || e.kind === 'pets').map((e) => e.id);
    const rows = new Set(doors.concat(petsIn ? [] : ['pets']));   /* Pets is a door of row 2, or the strip's first */
    t(`5 (pets in the strip: ${petsIn}) Pets the strip's first entry exactly when it leaves the row`, (S[0] && S[0].kind === 'pets') === petsIn && S.filter((e) => e.id === 'pets').length === (petsIn ? 1 : 0));
    const lost = BH.BRO_HUB_DOORS.filter((d) => d.id !== 'combat' && !rows.has(d.id)).map((d) => d.id);
    t(`5 (facts in the strip: ${inStrip}) every door of Bro's six on the page (combat's weapons are the first row): lost ${lost.join(',')}`, lost.length === 0);
    const have = S.filter((e) => e.kind === 'have').map((e) => e.id);
    t(`5 (facts in the strip: ${inStrip}) every entry of the strip (${BH.BRO_STRIP.join(',')})`, BH.BRO_STRIP.every((id) => have.indexOf(id) >= 0));
    t(`5 (facts in the strip: ${inStrip}) no entry twice`, new Set(ids).size === ids.length);
    t(`5 (facts in the strip: ${inStrip}) the facts lead the strip (after Pets) exactly when they are not in the row`, (S.filter((e) => e.kind === 'fact').length === 2) === inStrip && (!inStrip || (S[petsIn ? 1 : 0] && S[petsIn ? 1 : 0].kind === 'fact')));
  }
  const D2 = safe(() => M.broV17Doors(rpgOf(), false, { petbook: true }, null), []);
  t('5 the page\'s second row is Shared and Pets (Character stats and Pets)', D2.length === 2);
  /* 6. the strip's pages */
  const R0 = M.BRO_V17_ROOM || {};
  for (const n of [8, 10]) {
    for (let w = 120; w <= 900; w += 7) {
      const p = safe(() => M.broV17StripPages(n, w), null);
      if (!p || typeof p !== 'object') { t(`6 ${n} entries at ${w}: pages`, false); break; }
      const used = p.per * p.entryW + (p.per - 1) * R0.GAP + (p.pager ? R0.PAGER_W + R0.GAP : 0);
      if (!(used <= w)) { t(`6 ${n} entries at ${w}: whole entries beside the pager (${used} > ${w})`, false); break; }
      if (!(p.entryW >= R0.ENTRY_MIN)) { t(`6 ${n} entries at ${w}: each ${R0.ENTRY_MIN} wide or more (${p.entryW})`, false); break; }
      const fits = n * R0.ENTRY_MIN + (n - 1) * R0.GAP <= w;
      if (fits === p.pager) { t(`6 ${n} entries at ${w}: a pager exactly when they do not all fit`, false); break; }
      if (p.pages !== Math.ceil(n / p.per)) { t(`6 ${n} entries at ${w}: pages ${p.pages}`, false); break; }
      const all = [];
      const list = Array.from({ length: n }, (_, i) => 'e' + i);
      for (let i = 0; i < p.pages; i++) all.push(...safe(() => M.broV17StripPage(list, p.per, i).entries, []));
      if (all.join() !== list.join()) { t(`6 ${n} entries at ${w}: every entry on one page, in order`, false); break; }
      const wrap = safe(() => M.broV17StripPage(list, p.per, p.pages).entries.join(), '');
      if (wrap !== list.slice(0, p.per).join()) { t(`6 ${n} entries at ${w}: the page after the last is the first`, false); break; }
    }
  }
  t('6 nothing to show: no page', safe(() => M.broV17StripPages(0, 400).pages, -1) === 0);
  t('6 the least sizes: a 44 px pager, entries 72 or more', R0.PAGER_W >= 44 && R0.ENTRY_MIN >= 72 && R0.ROW >= 44);
  /* 7. the room (each the box mp-v17fit measured Bro's page at) */
  const shape = (w, h, s) => safe(() => M.broV17Shape(w, h, s), '');
  t('7 upright phones: upright', [[390, 191], [375, 187], [320, 169], [360, 183], [414, 199], [430, 205]].every(([w, h]) => shape(w, h, false) === 'upright'));
  t('7 sideways phones: one row (side)', [[844, 82], [667, 77], [740, 72], [932, 95]].every(([w, h]) => shape(w, h, true) === 'side'));
  t('7 a computer\'s 840 block and the 480 of ?v17wide=0', shape(840, 191, false) === 'wide' && shape(480, 191, false) === 'upright');
  const fr = (s, w) => safe(() => M.broV17FactsInRow(s, w), null);
  t('7 the facts in the doors\' row from its least width, else in the strip', fr('upright', 390) === true && fr('upright', 320) === false && fr('wide', 840) === true);
  t('7 sideways: the facts beside only where the strip keeps two entries beside its pager (no phone; a 1000 px page yes)', fr('side', 1000) === true && fr('side', 894) === true && fr('side', 814) === false && fr('side', 646) === false);
  const pr = (s, w) => safe(() => M.broV17PetsInRow(s, w), null);
  t('7 Pets leaves the row only on the narrowest sideways pages (667 x 375, 740 x 360)', pr('side', 646) === false && pr('side', 712) === false && pr('side', 814) === true && pr('upright', 306) === true && pr('wide', 840) === true);
  return bad;
}

const MOD = 'src/game/broV17.js';
const mSrc = read(MOD);
{
  const bad = behave(await import(url(MOD)));
  check('1-7. the rules do what the card says', bad.length === 0, bad.join('\n     '));
  const b2 = behave(await moduleOf(mSrc, 'src/game'));
  check('1-7. ...and the same from a copy (the plants below are read the same way)', b2.length === 0, b2.join('; '));
}

/* ── 8. the page, by its syntax tree ── */
const PAGE = 'src/ui/mobile/sheet/BroV17.jsx';
const KIT = ['Ui2LevelTile', 'Ui2Tile', 'Ui2Fact', 'Ui2Stat', 'Ui2Action'];
function pageFaults(src) {
  const bad = [];
  let ast;
  try { ast = parse(src); } catch (e) { return ['parse: ' + e.message]; }
  const name = (n) => (n && n.type === 'JSXIdentifier' ? n.name : n && n.type === 'JSXMemberExpression' ? name(n.object) + '.' + n.property.name : '');
  const attr = (el, a) => el.attributes.find((x) => x.type === 'JSXAttribute' && x.name.name === a);
  const spreads = (el) => el.attributes.filter((x) => x.type === 'JSXSpreadAttribute');
  let levelTiles = 0, markDrawn = false, cueAsked = false, sReached = false;
  B.traverse(ast, {
    JSXOpeningElement(p) {
      const n = name(p.node.name);
      if (KIT.includes(n) && !attr(p.node, 'intent')) bad.push(`8 a ${n} made with no intent (line ${p.node.loc.start.line})`);
      if (n === 'Ui2LevelTile') {
        levelTiles++;
        if (attr(p.node, 'mark')) markDrawn = true;
        const c = attr(p.node, 'cue');
        if (c && c.value && c.value.type === 'JSXExpressionContainer') {
          const e = c.value.expression;
          /* the cue is the rule's `cue` asked in place, or a name whose one value asks it (`pts = w.cue ? ...`) */
          if (e.type === 'ConditionalExpression' && /\.cue$/.test(src.slice(e.test.start, e.test.end))) cueAsked = true;
          if (e.type === 'Identifier') {
            const b = p.scope.getBinding(e.name);
            const i = b && b.path.node.type === 'VariableDeclarator' ? b.path.node.init : null;
            if (i && i.type === 'ConditionalExpression' && /\.cue$/.test(src.slice(i.test.start, i.test.end)) && i.alternate.type === 'NullLiteral') cueAsked = true;
          }
        }
      }
      if (n === 'Ui2Fact') {
        const i = attr(p.node, 'intent');
        const info = i && i.value && i.value.type === 'StringLiteral' && i.value.value === 'info';
        if (info && (attr(p.node, 'onClick') || spreads(p.node).some((s) => /frameTap/.test(src.slice(s.start, s.end))))) bad.push(`8 a passive fact given a handler (line ${p.node.loc.start.line})`);
      }
      if (n === 'button') bad.push(`8 a raw <button> (build from the kit) (line ${p.node.loc.start.line})`);
      if (n === 'CharacterHud' || n === 'BoardFace') bad.push(`8 the HUD's identity drawn again: <${n}>`);
    },
    JSXText(p) {
      if (/\+/.test(p.node.value)) bad.push(`8 a "+" drawn (line ${p.node.loc.start.line})`);
    },
    StringLiteral(p) {
      const v = p.node.value;
      if (/^charPage\.(combatLv|combatAria|noName)$/.test(v)) bad.push(`8 a combat level or a name read: '${v}'`);
      if (v === '+' && p.parent && p.parent.type === 'JSXExpressionContainer') bad.push('8 a "+" drawn');
    },
    Identifier(p) {
      if (p.node.name === 'portraitSrc' || p.node.name === 'readPassportFace') bad.push(`8 a portrait read: ${p.node.name}`);
    },
    MemberExpression(p) {
      const o = p.node.object;
      if (o && o.type === 'Identifier' && o.name === 'window' && p.node.property && /^(__btState|BT_STATE|S)$/.test(p.node.property.name || '')) sReached = true;
    },
    ImportDeclaration(p) {
      const s = p.node.source.value;
      if (/hud\/CharacterHud|playerProfile|gameState/.test(s)) bad.push(`8 the page imports ${s} (it is handed S; the HUD has who you are)`);
    },
  });
  if (levelTiles < 1) bad.push('8 the weapons are not the kit\'s level tile (Ui2LevelTile)');
  if (!markDrawn) bad.push('8 the state\'s words (In hand, Worn) not drawn: a colour alone');
  if (!cueAsked) bad.push('8 the points\' cue drawn without asking the rule\'s `cue` (a cue at zero)');
  if (sReached) bad.push('8 the page reaches for the game\'s state (it is handed S)');
  return bad;
}
const pSrc = read(PAGE);
{
  const bad = pageFaults(pSrc);
  check('8. the page is built from the kit, names its roles, draws no identity and no "+" at zero', bad.length === 0, bad.join('\n     '));
}

/* ── 9. BroCard: the switch, and =0 the six and the strip ── */
const CARD = 'src/ui/mobile/sheet/BroCard.jsx';
function cardFaults(src) {
  const bad = [];
  let ast;
  try { ast = parse(src); } catch (e) { return ['parse: ' + e.message]; }
  let readsSwitch = false, offIsLanding = false, onIsV17 = false, hub = false;
  B.traverse(ast, {
    VariableDeclarator(p) {
      if (p.node.id.name === 'V17_BRO') {
        const i = p.node.init;
        readsSwitch = !!(i && i.type === 'CallExpression' && i.callee.name === 'v17BroWanted' && i.arguments.length === 0);
      }
      if (p.node.id.name === 'landing') {
        let i = p.node.init;
        while (i && i.type === 'ParenthesizedExpression') i = i.expression;
        if (i && i.type === 'ConditionalExpression' && i.test.type === 'Identifier' && i.test.name === 'V17_BRO') {
          const tag = (e) => { while (e && e.type === 'ParenthesizedExpression') e = e.expression; return e && e.type === 'JSXElement' ? e.openingElement.name.name : null; };
          onIsV17 = tag(i.consequent) === 'BroV17';
          offIsLanding = tag(i.alternate) === 'BroLanding';
        }
      }
    },
    IfStatement(p) {
      const s = src.slice(p.node.test.start, p.node.test.end);
      if (/door === 'combat'/.test(s) && /CombatHub/.test(src.slice(p.node.consequent.start, p.node.consequent.end))) hub = true;
    },
  });
  if (!readsSwitch) bad.push('9 the switch not read through v17BroWanted() (the address and the phone\'s memory)');
  if (!onIsV17) bad.push('9 ?v17bro on does not draw BroV17');
  if (!offIsLanding) bad.push('9 ?v17bro=0 does not draw BroLanding (the six and the strip)');
  if (!hub) bad.push('9 the Combat hub\'s page gone from BroCard (its old roads must still reach it)');
  return bad;
}
const cSrc = read(CARD);
{
  const bad = cardFaults(cSrc);
  check('9. BroCard: V17 on, BroLanding the off branch, the Combat hub kept', bad.length === 0, bad.join('\n     '));
  const hubRow = BH.BRO_HUB_DOORS.find((d) => d.id === 'combat');
  check('9. the Combat hub\'s door kept in broHub.js (=0, the HUD\'s road)', !!hubRow && hubRow.opens === 'page:broCombat');
  const hud = read('src/ui/hud/HudArt.jsx');
  check('9. the HUD\'s weapon bar still opens Bro, the Combat hub and the weapon (the hub\'s old road)', /push\('broCombat'\)/.test(hud));
}

/* ── P. THE DODGES: each planted, each red ── */
async function plantRule(label, from, to) {
  if (mSrc.indexOf(from) < 0) { check('P plant "' + label + '" finds its text', false, from); return; }
  let bad;
  try { bad = behave(await moduleOf(mSrc.split(from).join(to), 'src/game')); } catch (e) { bad = ['threw']; }
  check('P plant red: ' + label, bad.length > 0);
}
await plantRule('the switch off by default', "  try { return !(ls && ls.getItem(V17_BRO_KEY) === '0'); } catch (e) { return true; }", "  try { return !!(ls && ls.getItem(V17_BRO_KEY) === '1'); } catch (e) { return false; }");
await plantRule('?v17bro=0 not remembered', "if (v === '0') ls.setItem(V17_BRO_KEY, '0'); else ls.removeItem(V17_BRO_KEY);", 'void 0;');
await plantRule('a cue at zero (a plus that does nothing)', '    cue: d.pointsShown === true,', '    cue: who == null,');
await plantRule('the cue only from the pooled count (a lane\'s own forgotten)', '    cue: d.pointsShown === true,', '    cue: who == null && Number(rpg && rpg.prog3 && rpg.prog3.pool) > 0,');
await plantRule('the Staff left out (two weapons)', ".filter((d) => d.cat).map(", ".filter((d) => d.cat && d.cat !== 'staff').map(");
await plantRule('the held weapon decided by the hand alone (nothing worn still "in hand")', "  if (!has) return 'none';\n  return cat === held ? 'held' : 'worn';", "  if (cat === held) return 'held';\n  return has ? 'worn' : 'none';");
await plantRule('every worn weapon "held" (worn and in hand the same)', "  return cat === held ? 'held' : 'worn';", "  return 'held';");
await plantRule('another player\'s page given your hand', '  if (who != null) return null;\n', '');
await plantRule('Journey lost from the page (a door of the six dropped)', "BRO_HUB_DOORS.filter((d) => d.id !== 'combat' && d.id !== 'pets')", "BRO_HUB_DOORS.filter((d) => d.id !== 'combat' && d.id !== 'pets' && d.id !== 'journey')");
await plantRule('Guilds lost from the strip', "['ap', 'quests', 'clan', 'guilds']", "['ap', 'quests', 'clan']");
await plantRule('Pets never locked (the cap forgotten)', 'locked: !!(pets && pets.locked)', 'locked: false');
await plantRule('Shared\'s points a weapon\'s (the wrong pool)', "combatHubDoors(rpg, chan, who == null ? null : who).find((d) => d.id === 'shared')", "combatHubDoors(rpg, chan, who == null ? null : who).find((d) => d.id === 'bow')");
await plantRule('a strip page one entry too many (the last word cut at the edge)', '  const k = Math.max(1, Math.floor((room + R.GAP) / (R.ENTRY_MIN + R.GAP)));', '  const k = Math.max(1, Math.ceil((room + R.GAP) / (R.ENTRY_MIN + R.GAP)));');
await plantRule('the pager\'s room forgotten (entries under the "more")', '  const room = W - R.PAGER_W - R.GAP;', '  const room = W;');
await plantRule('global shrink-to-fit (every entry squeezed onto one page)', '  if (N * R.ENTRY_MIN + (N - 1) * R.GAP <= W) return', '  if (true) return');
await plantRule('the last page dropped (an entry on no page)', '  return Object.freeze({ per: k, pages: Math.ceil(N / k),', '  return Object.freeze({ per: k, pages: Math.floor(N / k),');
await plantRule('a page beyond the last empty (no wrap)', '  const i = ((Math.floor(Number(p) || 0) % pages) + pages) % pages;', '  const i = Math.floor(Number(p) || 0);');
await plantRule('Pets dropped where it leaves the row (lost on a small phone on its side)', "  if (petsInStrip) out.push(Object.freeze({ kind: 'pets', id: 'pets' }));\n", '');
await plantRule('sideways stacked in two rows (the 63 px page)', "  if (short) return 'side';\n", '');
await plantRule('a computer\'s block the phone\'s layout (larger tiles, not more entries)', "  return Number(w) >= BRO_V17_ROOM.WIDE_MIN ? 'wide' : 'upright';", "  return 'upright';");
await plantRule('the facts squeezed into a narrow doors\' row', '  if (shape === \'upright\') return Number(w) >= R.FACTS_ROW_MIN;', '  if (shape === \'upright\') return true;');
async function plantPage(label, from, to) {
  if (pSrc.indexOf(from) < 0) { check('P plant "' + label + '" finds its text', false, from); return; }
  check('P plant red: ' + label, pageFaults(pSrc.split(from).join(to)).length > 0);
}
await plantPage('a weapon tile with no intent', '<Ui2LevelTile key={w.id} intent="go"', '<Ui2LevelTile key={w.id}');
await plantPage('the cue drawn at zero', 'const pts = w.cue ? poolText(w.pointsWords) : null;', 'const pts = poolText(w.pointsWords);');
await plantPage('the state a colour alone (no words)', 'cue={pts} mark={state} held=', 'cue={pts} held=');
await plantPage('a passive fact pressable', '<Ui2Fact key={\'f-\' + id} intent="info" k={facts[id].k}', '<Ui2Fact key={\'f-\' + id} intent="info" onClick={() => push(\'broSword\')} k={facts[id].k}');
await plantPage('a "+" on a weapon', 'label={name} level=', 'label={<>{name} +</>} level=');
await plantPage('the combat level drawn again', "const catWord = (cat) => chWord('combatHub.' + cat);", "const catWord = (cat) => chWord('combatHub.' + cat);\nconst lvWord = say(SAY_CH, 'charPage.combatLv');");
await plantPage('a raw button for a weapon', '<Ui2LevelTile key={w.id} intent="go"', '<button key={w.id} type="button" />;\n      <Ui2LevelTile key={w.id} intent="go"');
await plantPage('the page reaching for the game\'s state', 'const R = (S && S.rpg) || null;\n  const chan', 'const R = (window.__btState && window.__btState.rpg) || null;\n  const chan');
async function plantCard(label, from, to) {
  if (cSrc.indexOf(from) < 0) { check('P plant "' + label + '" finds its text', false, from); return; }
  check('P plant red: ' + label, cardFaults(cSrc.split(from).join(to)).length > 0);
}
await plantCard('=0 draws the new page too (the off-ramp gone)', '  ) : (\n    <BroLanding', '  ) : (\n    <BroV17');
await plantCard('the switch always on', 'const V17_BRO = v17BroWanted();', 'const V17_BRO = true;');
await plantCard('the Combat hub deleted', "if (door === 'combat') return <CombatHub", "if (door === 'combat') return <BroV17");

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* a temp dir */ }
console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
