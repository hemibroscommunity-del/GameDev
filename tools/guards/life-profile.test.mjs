/* ═══ v2.3.6694: LIFE SKILLS' RULES DO WHAT THE PAGES CLAIM (card UI2-life, the build's step 6) ═══
 *
 * The owner, 2026-11-25 (the master specification 4.4): "Sum of life skill
 * levels as headline statistic ... a separate measure from combat level";
 * "Each skill destination includes a compact XP progress bar"; 3.3: "Reveal
 * all skill unlocks in the complete roadmap, including future rewards";
 * "Meaningful unlocks, not arbitrary intervals".  And 2026-11-26: "Enlarge the
 * icons and cards to occupy the unused vertical space. Put level indicators
 * inside the cards instead of having badges protrude from them. Match the
 * rest of the game's typography."
 *
 * Part A runs src/game/lifeProfile.js (what the rules DO, against numbers
 * worked out here from the worker's own formula, never read from the module
 * under test).  Part B reads the pages' SYNTAX TREE and their style sheet
 * (the owner's three asks and the kit's weights).  Each dodge a tired
 * programmer would write is a numbered check; the break proofs (each check
 * seen red by a one-line change) are in the PR's words and in the mutants
 * run by hand (docs/plan/status/UI2-life.md).
 *
 *   A1  the sum is over the TEN only (rpg.lifeSkills also holds pets,
 *       resources, gems, gemsBack, dungeonClears ...): Object.values fails it
 *   A2  a skill at 0, missing, or not a number reads 1 (its tile's reading,
 *       the worker's `level || 1`), so a new character's total is 10
 *   A3  the landing's ten: ten, each once, in the roster's display order,
 *       never resorted by level
 *   A4  the XP a level needs is the WORKER's at every level: ceil(1000 x
 *       1.08^(level-1)); items.js skillXpRequired multiplies by 1.10 past 100
 *       and fails at 101
 *   A5  the roadmap is the WHOLE ladder (every tier, not today's next and
 *       later), its states got / next / later by level
 *   A6  trapping and enchanting: no rung (null), never one invented
 *   A7  farming's rungs are its crops, every one, each at the level it asks
 *   A8  another player's: levels only (no XP, no fraction, no dot)
 *   A9  the facts: the next unlock and the latest one, the guild's line
 *   A10 the ten page ids: one a skill, each a row of FRAME_PAGES and
 *       BRO_HUB_PAGES, its header word the skill's own name
 *   B1  the dot is read BEFORE the page marks them seen (unseenSkillKeys in
 *       the first state's reader; markSkillsSeen in an effect)
 *   B2  no label of what kind of player you are, no radar, in the pages'
 *       words (the specification's 4.1: the owner's to define)
 *   B3  "Lv N" INSIDE the tile: drawn inside the tile's button, never by a
 *       Ui2Badge or a `u2-badge`, and no rule places a tile's part outside it
 *       (a negative offset)
 *   B4  the tiles FILL the room: the landing's rows `1fr`, no fixed height on
 *       a tile or its rows
 *   B5  no font size of the pages' own: every `font-size` a kit token, no
 *       inline fontSize; the tile's name wears the kit's `u2-tile-label`
 *   B6  "Total level" is the STAT, recessed (`Ui2Stat`, no handler, never
 *       `u2-raised`); the ten are raised doors with a handler
 *
 * Run: node tools/guards/life-profile.test.mjs   (Part B needs @babel/parser
 * and @babel/traverse: npm install in the root or server/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadBabel } from './lib/jsxMount.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700))); }
}
/* the phone's storage, for skillsModel's seen marks (node has none) */
const store = Object.create(null);
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };

const L = await imp('src/game/lifeProfile.js');
const M = await imp('src/ui/mobile/sheet/skillsModel.js');
const { LIFE_SKILLS } = await imp('src/data/lifeSkills.js');
const { FARM } = await imp('src/data/farmCrops.js');
const { skillXpRequired } = await imp('src/data/items.js');
const { FRAME_PAGES } = await imp('src/game/dashDests.js');
const { BRO_HUB_PAGES } = await imp('src/game/broHub.js');
const { SAY: FRAME_SAY } = await imp('src/data/say/dashFrame.js');
const { SAY: LIFE_SAY } = await imp('src/data/say/lifePage.js');

/* the worker's formula, written here (server/src/gathering.js _lifeSkillXpThreshold) */
const WORKER_NEED = (lv) => Math.ceil(1000 * Math.pow(1.08, lv - 1));
const DISPLAY = ['woodcutting', 'fishing', 'mining', 'farming', 'trapping', 'cooking', 'blacksmithing', 'woodworking', 'gemCutting', 'enchanting'];
const rec = (levels) => { const ls = {}; for (const k of Object.keys(levels)) ls[k] = { level: levels[k], xp: 0 }; return ls; };

/* ── A1, A2: the sum ── */
{
  const ls = rec({ woodcutting: 12, fishing: 3, mining: 7, farming: 5, trapping: 2, cooking: 9, blacksmithing: 4, woodworking: 1, gemCutting: 15, enchanting: 101 });
  Object.assign(ls, { pets: { level: 40 }, resources: { wood: 99 }, gems: { level: 7 }, gemsBack: 3, gemsUnpaid: 2, dungeonClears: 11, gathering: { level: 9 }, activePet: 'fox', farmPlots: [1, 2] });
  check('A1. the sum is over the ten only (pets, resources, gems, gemsBack, gathering ... not counted)', L.lifeTotal({ lifeSkills: ls }) === 159, L.lifeTotal({ lifeSkills: ls }));
  check('A2a. a new character (no record) totals 10: each skill reads 1', L.lifeTotal({}) === 10 && L.lifeTotal(null) === 10 && L.lifeTotal({ lifeSkills: {} }) === 10);
  const odd = { fishing: { level: 0 }, mining: { level: -3 }, cooking: { level: 'x' }, farming: null, trapping: 7 };
  check('A2b. a skill at 0, below 0, not a number, null or not a record reads 1, as its tile and the worker read it',
    L.lifeLevel(odd, 'fishing') === 1 && L.lifeLevel(odd, 'mining') === 1 && L.lifeLevel(odd, 'cooking') === 1 && L.lifeLevel(odd, 'farming') === 1 && L.lifeLevel(odd, 'trapping') === 1
    && L.lifeLevel(odd, 'enchanting') === 1 && L.lifeTotal({ lifeSkills: odd }) === 10, L.lifeTotal({ lifeSkills: odd }));
  check('A2c. a level of 7.9 is level 7 (the worker keeps whole levels)', L.lifeLevel({ fishing: { level: 7.9 } }, 'fishing') === 7);
  check('A2d. a key from the prototype is no skill (own keys only)', L.lifeLevel({}, '__proto__') === 1 && L.lifeLevel({}, 'constructor') === 1
    && L.lifeLevel(Object.create({ fishing: { level: 9 } }), 'fishing') === 1);
  const tiles = L.lifeTiles({ lifeSkills: ls }, null, []);
  check('A2e. the headline is the sum of the ten numbers on the tiles', tiles.reduce((a, t) => a + t.level, 0) === L.lifeTotal({ lifeSkills: ls }));
}

/* ── A3: the ten, in display order ── */
{
  const up = rec({ woodcutting: 1, fishing: 90, mining: 2, farming: 80, trapping: 3, cooking: 70, blacksmithing: 4, woodworking: 60, gemCutting: 5, enchanting: 50 });
  const t = L.lifeTiles({ lifeSkills: up }, null, []);
  const keys = t.map((x) => x.key);
  check('A3a. ten tiles, each skill once (LIFE_SKILLS, none missing, none twice)', t.length === 10 && new Set(keys).size === 10 && LIFE_SKILLS.every((k) => keys.includes(k)), keys);
  check('A3b. in the roster\'s display order, the gather row then the craft row, never resorted by level', keys.join(',') === DISPLAY.join(',')
    && keys.join(',') === M.SKILL_DISPLAY_10.map((s) => s.key).join(','), keys);
  check('A3c. each tile its name and picture from the roster', t.every((x) => { const s = M.SKILL_ROSTER.find((r) => r.key === x.key); return s && x.name === s.name && x.art === s.iconSrc; }));
}

/* ── A4: the worker's need ── */
{
  const ok = [1, 2, 50, 99, 100, 101, 110, 120].every((lv) => L.lifeSkillProgress({ lifeSkills: rec({ fishing: lv }) }, 'fishing', null).xpNeed === WORKER_NEED(lv));
  const p101 = L.lifeSkillProgress({ lifeSkills: rec({ enchanting: 101 }) }, 'enchanting', null);
  check('A4a. the XP a level needs is the worker\'s at every level, 101 and 120 included (no cap)', ok && p101.xpNeed === WORKER_NEED(101) && p101.max === false && p101.cap === null, p101);
  check('A4b. (the old copy differs past 100: the reason A4a exists)', skillXpRequired(101) !== WORKER_NEED(101), skillXpRequired(101));
  const p = L.lifeSkillProgress({ lifeSkills: { fishing: { level: 7, xp: 300 } } }, 'fishing', null);
  check('A4c. the XP now and the bar\'s fraction', p.level === 7 && p.xpNow === 300 && p.xpNeed === WORKER_NEED(7) && Math.abs(p.frac - 300 / WORKER_NEED(7)) < 1e-9, p);
  const t = L.lifeTiles({ lifeSkills: { fishing: { level: 7, xp: 300 } } }, null, []);
  check('A4d. a tile\'s bar is the same fraction', Math.abs(t.find((x) => x.key === 'fishing').frac - 300 / WORKER_NEED(7)) < 1e-9);
}

/* ── A5 to A7: the roadmap ── */
{
  const all = ['woodcutting', 'fishing', 'mining', 'cooking', 'blacksmithing', 'woodworking', 'gemCutting'];
  const whole = all.every((k) => { const s = M.SKILL_ROSTER.find((r) => r.key === k); const r = L.lifeRoadmap(k, 1); return r && s.tiers && r.length === s.tiers.length && r.length > 2; });
  check('A5a. the roadmap is every tier of the ladder (more than today\'s next and later)', whole, all.map((k) => k + ':' + (L.lifeRoadmap(k, 1) || []).length).join(' '));
  const f = L.lifeRoadmap('fishing', 7);
  check('A5b. fishing at 7: Minnow and Clownfish got, Trout next, Salmon and Pike later; each its level and name',
    !!f && f.map((r) => r.lvl + ':' + r.name + ':' + r.state).join(',') === '1:Minnow:got,5:Clownfish:got,10:Trout:next,15:Salmon:later,20:Pike:later', f);
  const g = L.lifeRoadmap('fishing', 20);
  check('A5c. at the ladder\'s top: every rung got, none next', !!g && g.every((r) => r.state === 'got'));
  const c = L.lifeRoadmap('cooking', 4);
  check('A5d. every rung at the next level is next (cooking at 4: both of Lv 5)', !!c && c.filter((r) => r.state === 'next').map((r) => r.lvl).join(',') === '5,5' && c.filter((r) => r.state === 'got').every((r) => r.lvl <= 4));
  const s = L.lifeRoadmap('gemCutting', 1);
  check('A5e. a rung\'s words are the roster\'s own (gem cutting\'s crack chance)', !!s && /% a shard$/.test(s[0].name), s && s[0]);
  const lv0 = L.lifeRoadmap('fishing', 0), lvx = L.lifeRoadmap('fishing', undefined), lvf = L.lifeRoadmap('fishing', 9.7);
  check('A5f. a level of 0 or none reads 1 (Minnow got); 9.7 reads 9 (Trout next)', !!lv0 && lv0[0].state === 'got' && lv0[1].state === 'next' && !!lvx && lvx[0].state === 'got'
    && !!lvf && lvf[2].state === 'next' && lvf[1].state === 'got');
  const ordered = ['farming', 'cooking', 'mining', 'woodcutting'].every((k) => { const r = L.lifeRoadmap(k, 1); return r.every((x, i) => i === 0 || r[i - 1].lvl <= x.lvl); });
  const ten = L.lifeRoadmap('farming', 1).filter((r) => r.lvl === 10).map((r) => r.name).join(',');
  check('A5h. rungs of one level read by name (farming\'s five at 10)', ten === 'Cabbage,Cloudpetal,Corn,Dewmelon,Pumpkin', ten);
  check('A5g. every roadmap reads in level order (farming\'s crops are kept in planting order, not by level)', ordered);
  check('A6. trapping and enchanting unlock nothing by level: no rung invented', L.lifeRoadmap('trapping', 50) === null && L.lifeRoadmap('enchanting', 50) === null);
  check('A6b. an unknown skill has no roadmap', L.lifeRoadmap('__proto__', 1) === null && L.lifeRoadmap('combat', 1) === null);
  const fm = L.lifeRoadmap('farming', 5);
  const crops = Object.values(FARM.CROPS);
  check('A7. farming\'s rungs are its crops, every one, each at the level it asks to plant',
    !!fm && fm.length === crops.length && crops.every((c) => fm.some((r) => r.name === c.name && r.lvl === c.lvl)) && fm.every((r) => (r.lvl <= 5 ? r.state === 'got' : true))
    && fm.filter((r) => r.state === 'next').every((r) => r.lvl === 10), fm && fm.map((r) => r.lvl + r.name + r.state).join(' '));
}

/* ── A8: another player's ── */
{
  const who = { name: 'Peer', lifeSkills: rec({ fishing: 30, mining: 4 }) };
  const t = L.lifeTiles({ lifeSkills: rec({ fishing: 2 }) }, who, ['fishing', 'mining']);
  check('A8a. another player\'s tiles read THEIR levels', t.find((x) => x.key === 'fishing').level === 30 && L.lifeTotal({ lifeSkills: rec({ fishing: 2 }) }, who) === 30 + 4 + 8);
  check('A8b. another player\'s: no XP fraction and no dot, whatever `fresh` says', t.every((x) => x.frac === null && x.dot === false));
  const p = L.lifeSkillProgress({ lifeSkills: rec({ fishing: 2 }) }, 'fishing', who);
  check('A8c. another player\'s skill: its level, no XP numbers', p.level === 30 && p.xpNow === null && p.xpNeed === null && p.frac === null, p);
  check('A8d. another player with no levels sent reads 1 each (never yours)', L.lifeTotal({ lifeSkills: rec({ fishing: 50 }) }, { name: 'x' }) === 10);
  const mine = L.lifeTiles({ lifeSkills: rec({ fishing: 2 }) }, null, ['fishing']);
  check('A8e. yours: the dot on the fresh skill only', mine.filter((x) => x.dot).map((x) => x.key).join(',') === 'fishing');
}

/* ── A9: the facts ── */
{
  const f = L.lifeSkillFacts('farming', 7);
  check('A9a. the next unlock and the latest one, and how many more share each level (farming at 7: five crops at 10; four at 5)',
    f.ladder && f.n === Object.keys(FARM.CROPS).length && f.next.lvl === 10 && f.nextAlso === 4 && f.latest.lvl === 5 && f.latestAlso === 3, f);
  const t = L.lifeSkillFacts('trapping', 9);
  check('A9b. no ladder: no next, no latest, none counted', !t.ladder && t.n === 0 && t.next === null && t.latest === null);
  const top = L.lifeSkillFacts('fishing', 25);
  check('A9c. every unlock reached: no next', top.ladder && top.next === null && top.latest.name === 'Pike');
  const g = L.lifeGuildLine('fishing', 25);
  check('A9d. the guild\'s line: the skill\'s guild and the rank its level gives', !!g && g.guild === "Angler's Circle" && g.rank === 'Journeyman', g);
  check('A9e. every one of the ten has its guild', LIFE_SKILLS.every((k) => !!L.lifeGuildLine(k, 1)));
  check('A9f. no guild, no roster row, for what is not one of the ten', L.lifeGuildLine('combat', 5) === null && L.lifeGuildLine('__proto__', 5) === null && L.lifeSkillOf('combat') === null && L.lifeSkillOf('__proto__') === null);
}

/* ── A10: the ten pages ── */
{
  const ids = LIFE_SKILLS.map((k) => L.LIFE_PAGE_OF[k]);
  check('A10a. ten page ids, one a skill, each read back to its skill', new Set(ids).size === 10 && LIFE_SKILLS.every((k) => L.lifeKeyOfPage(L.LIFE_PAGE_OF[k]) === k) && L.lifeKeyOfPage('skills') === null);
  const want = [...ids, L.LIFE_UNLOCKS_PAGE, L.LIFE_HOW_PAGE];
  check('A10b. each is a frame page (dashDests.js FRAME_PAGES) and one of Bro\'s (broHub.js BRO_HUB_PAGES), drawn by the life doors',
    want.every((id) => FRAME_PAGES[id] && BRO_HUB_PAGES[id] && L.isLifeDoor(BRO_HUB_PAGES[id])) && ids.every((id) => BRO_HUB_PAGES[id] === 'life'), want.filter((id) => !FRAME_PAGES[id] || !BRO_HUB_PAGES[id]));
  check('A10c. a skill page\'s header word is the skill\'s own name (the roster\'s)', LIFE_SKILLS.every((k) => FRAME_SAY[FRAME_PAGES[L.LIFE_PAGE_OF[k]]] === M.SKILL_ROSTER.find((r) => r.key === k).name),
    LIFE_SKILLS.map((k) => k + '=' + FRAME_SAY[FRAME_PAGES[L.LIFE_PAGE_OF[k]]]).join(' '));
}

/* ── B: the pages' syntax tree and their style sheet ── */
const B = loadBabel(ROOT);
check('B0. @babel/parser and @babel/traverse load (npm install in the root or server/)', !!B);
const LAND = 'src/ui/mobile/sheet/LifeSkillsPage.jsx';
const PAGES = [LAND, 'src/ui/mobile/sheet/LifeSkillPage.jsx', 'src/ui/mobile/sheet/LifeUnlocks.jsx'];
const CSS = 'src/ui/mobile/sheet/lifePage.css';
const read = (rel, over) => (over && over[rel] != null ? over[rel] : fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
const attr = (el, n) => el.attributes.find((a) => a.type === 'JSXAttribute' && a.name && a.name.name === n) || null;
const strOf = (a) => {
  if (!a || !a.value) return '';
  if (a.value.type === 'StringLiteral') return a.value.value;
  const e = a.value.expression;
  if (!e) return '';
  const parts = [];
  (function walk(n) { if (!n || typeof n !== 'object') return; if (n.type === 'StringLiteral') parts.push(n.value); if (n.type === 'TemplateElement') parts.push(n.value.raw); for (const k of Object.keys(n)) if (k !== 'loc' && k !== 'start' && k !== 'end') { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object' && v.type) walk(v); } })(e);
  return parts.join(' ');
};
const nameOf = (el) => (el.name && el.name.type === 'JSXIdentifier' ? el.name.name : el.name && el.name.type === 'JSXMemberExpression' ? el.name.property.name : '');

/* B1: the dot's order, read from the landing's tree */
function dotOrder(over) {
  const ast = parse(read(LAND, over));
  let readInState = false, markInEffect = false, markAtRender = false, readAtRender = false;
  B.traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      const n = c.type === 'Identifier' ? c.name : '';
      if (n !== 'unseenSkillKeys' && n !== 'markSkillsSeen') return;
      const hook = p.findParent((q) => q.isCallExpression() && q.node.callee.type === 'Identifier' && /^use(State|Effect|LayoutEffect|Memo)$/.test(q.node.callee.name));
      const h = hook ? hook.node.callee.name : null;
      if (n === 'unseenSkillKeys') { if (h === 'useState') readInState = true; else readAtRender = true; }
      if (n === 'markSkillsSeen') { if (h === 'useEffect') markInEffect = true; else markAtRender = true; }
    },
  });
  return readInState && markInEffect && !markAtRender && !readAtRender;
}
/* B3, B5, B6 and the tile's handler: the landing's JSX */
function tileForm(over) {
  const bad = [];
  for (const rel of PAGES) {
    const ast = parse(read(rel, over));
    B.traverse(ast, {
      JSXOpeningElement(p) {
        const el = p.node;
        const n = nameOf(el);
        const cls = strOf(attr(el, 'className'));
        if (n === 'Ui2Badge' || /\bu2-badge\b/.test(cls)) bad.push(rel + ': a badge (' + (n || cls) + ')');
        const st = attr(el, 'style');
        if (st && /fontSize|font-size/.test(read(rel, over).slice(st.start, st.end))) bad.push(rel + ': an inline font size');
        if (rel !== LAND) return;
        if (/\bu2-life-lv\b/.test(cls)) {
          const btn = p.findParent((q) => q.isJSXElement() && /\bu2-life-tile\b/.test(strOf(attr(q.node.openingElement, 'className'))) && nameOf(q.node.openingElement) === 'button');
          if (!btn) bad.push('the level ("Lv N") drawn outside the tile\'s button');
        }
        if (/\bu2-life-tile\b/.test(cls)) {
          if (n !== 'button' || !/\bu2-raised\b/.test(cls) || !attr(el, 'onClick')) bad.push('a tile that is not a raised button with a handler');
          const parent = p.parentPath;
          if (!read(rel, over).slice(parent.node.start, parent.node.end).includes('u2-life-lv')) bad.push('a tile with no "Lv N" inside it');
          if (!read(rel, over).slice(parent.node.start, parent.node.end).includes('u2-tile-label')) bad.push('a tile\'s name not in the kit\'s navigation word (u2-tile-label)');
        }
        if (attr(el, 'data-life-total')) {
          if (n !== 'Ui2Stat') bad.push('"Total level" not the kit\'s stat (' + n + ')');
          if (attr(el, 'onClick')) bad.push('"Total level" given a handler (it opens nothing)');
          if (/\bu2-raised\b/.test(cls)) bad.push('"Total level" drawn raised');
        }
      },
    });
  }
  return bad;
}
/* B3, B4, B5: the style sheet */
function sheetRules(css) {
  const out = [];
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(body))) out.push({ sel: m[1].trim(), decl: m[2] });
  return out;
}
function sheetForm(over) {
  const bad = [];
  const rules = sheetRules(read(CSS, over));
  for (const r of rules) {
    for (const d of r.decl.split(';')) {
      const [k0, ...v0] = d.split(':');
      const k = (k0 || '').trim().toLowerCase();
      const v = v0.join(':').trim();
      if (!k) continue;
      if (k === 'font-size' && !/^var\(--ui2-fs-[a-z-]+\)$/.test(v)) bad.push('a font size of the page\'s own: ' + r.sel + ' { font-size: ' + v + ' }');
      if (k === 'font' ) bad.push('a font shorthand: ' + r.sel);
      const inTile = /\.u2-life-(lv|dot|name|words|pic|art|track)\b/.test(r.sel);
      if (inTile && /^(top|right|bottom|left|inset)$/.test(k) && /-\s*\d|-var\(|calc\([^)]*-/.test(v)) bad.push('a tile\'s part placed outside it: ' + r.sel + ' { ' + k + ': ' + v + ' }');
      if (/\.u2-life-lv\b/.test(r.sel) && k === 'position' && /absolute|fixed/.test(v)) bad.push('the level positioned on the tile (a badge): ' + r.sel);
      if (/\.u2-life-tile\b/.test(r.sel) && /^(height|max-height|flex-basis)$/.test(k) && /\d+px/.test(v)) bad.push('a tile at a fixed height: ' + r.sel + ' { ' + k + ': ' + v + ' }');
    }
  }
  const land = rules.find((r) => r.sel === '.ui2.u2-life');
  const rows = land ? (land.decl.match(/grid-template-rows\s*:\s*([^;]+)/) || [])[1] || '' : '';
  if (!/^auto\s+minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)$/.test(rows.trim())) bad.push('the landing\'s rows do not fill: grid-template-rows ' + (rows || '(none)'));
  if (!land || !/height\s*:\s*100%/.test(land.decl)) bad.push('the landing does not take the page\'s height');
  return bad;
}
/* B2: the words */
const LABEL = /specialist|generalist|gatherer|crafter|jack of all|all-rounder|radar|highest skill|best skill|your type/i;
const labelWords = (table) => Object.entries(table).filter(([, v]) => LABEL.test(typeof v === 'string' ? v : JSON.stringify(v))).map(([k]) => k);

if (B) {
  check('B1. the dot is read before the page marks them seen (unseenSkillKeys in useState\'s reader, markSkillsSeen in an effect)', dotOrder(null));
  const tf = tileForm(null);
  check('B3/B6. "Lv N" inside each tile\'s raised button, no badge, the name the kit\'s navigation word, "Total level" the recessed stat', tf.length === 0, tf.join('; '));
  const sf = sheetForm(null);
  check('B4/B5. the sheet: the rows fill the page, no fixed tile height, no font size of its own, no part placed outside a tile', sf.length === 0, sf.join('; '));
}
check('B2. no label of what kind of player you are, no radar, in the pages\' words', labelWords(LIFE_SAY).length === 0, labelWords(LIFE_SAY));

/* ── P: the dodges planted, each must turn its check red ── */
if (B) {
  const swap = (rel, from, to) => { const s = read(rel); return s.split(from).length === 2 ? { [rel]: s.replace(from, to) } : null; };
  const PL = [
    ['P1', 'the marks cleared before the tiles read them (markSkillsSeen at render)', dotOrder,
      swap(LAND, "  const S = live();\n  const R = (S && S.rpg) || null;", "  const S = live();\n  markSkillsSeen((S && S.rpg) || {});\n  const R = (S && S.rpg) || null;")],
    ['P2', 'the fresh skills read at render, after the effect has marked them', dotOrder,
      swap(LAND, "const [fresh] = useState(() => { if (who != null) return []; const S1 = live(); return unseenSkillKeys((S1 && S1.rpg) || {}); });", "const fresh = who != null ? [] : unseenSkillKeys(((live()) && live().rpg) || {});")],
    ['P3', 'the level drawn in a Ui2Badge on the tile', (o) => tileForm(o).length === 0,
      swap(LAND, "{t.dot ? <span className=\"u2-dot u2-life-dot\"", "<Ui2Badge count={t.level} />{t.dot ? <span className=\"u2-dot u2-life-dot\"")],
    ['P4', 'the level moved out of the tile, beside it', (o) => tileForm(o).length === 0,
      swap(LAND, "        <span className=\"u2-life-lv\">{say(SAY, 'lifePage.lv', { n: t.level })}</span>\n", "")],
    ['P5', 'the level positioned on the tile\'s corner (a badge by style)', (o) => sheetForm(o).length === 0,
      swap(CSS, '.ui2 .u2-life-lv { font-size', '.ui2 .u2-life-lv { position: absolute; top: -5px; right: -6px; font-size')],
    ['P6', 'the dot hung outside the tile\'s edge', (o) => sheetForm(o).length === 0,
      swap(CSS, '.ui2 .u2-life-dot { top: var(--ui2-space-s); right: var(--ui2-space-s); }', '.ui2 .u2-life-dot { top: -3px; right: -3px; }')],
    ['P7', 'the tiles at a fixed height with room under them', (o) => sheetForm(o).length === 0,
      swap(CSS, '  position: relative; min-width: 0; min-height: var(--ui2-size-touch); box-sizing: border-box; overflow: hidden;', '  position: relative; min-width: 0; height: 52px; box-sizing: border-box; overflow: hidden;')],
    ['P8', 'the rows packed at the top (auto rows)', (o) => sheetForm(o).length === 0,
      swap(CSS, 'grid-template-rows: auto minmax(0, 1fr) minmax(0, 1fr);', 'grid-template-rows: auto auto auto;')],
    ['P9', 'a font size of the page\'s own in the sheet', (o) => sheetForm(o).length === 0,
      swap(CSS, '.ui2 .u2-life-lv { font-size: var(--ui2-fs-small);', '.ui2 .u2-life-lv { font-size: 10.5px;')],
    ['P10', 'a font size of the page\'s own inline', (o) => tileForm(o).length === 0,
      swap(LAND, '<span className="u2-tile-label u2-life-name">', '<span className="u2-tile-label u2-life-name" style={{ fontSize: 11 }}>')],
    ['P11', 'the name off the kit\'s navigation word', (o) => tileForm(o).length === 0,
      swap(LAND, '<span className="u2-tile-label u2-life-name">', '<span className="u2-life-name">')],
    ['P12', '"Total level" in the raised form', (o) => tileForm(o).length === 0,
      swap(LAND, '<Ui2Stat className="u2-life-total"', '<Ui2Stat className="u2-raised u2-life-total"')],
    ['P13', '"Total level" given a handler', (o) => tileForm(o).length === 0,
      swap(LAND, '<Ui2Stat className="u2-life-total" v={total}', '<Ui2Stat className="u2-life-total" onClick={() => open(tiles[0])} v={total}')],
    ['P14', 'a tile drawn flat (no raised face)', (o) => tileForm(o).length === 0,
      swap(LAND, 'className="u2-raised u2-life-tile"', 'className="u2-life-tile"')],
  ];
  for (const [id, what, ok, over] of PL) {
    if (!over) { check(`${id} (${what}): its line is found once`, false, 'the plant\'s line moved: update the plant'); continue; }
    check(`${id} (${what}) turns its check red`, !ok(over), 'the plant stayed green');
  }
  check('P15 (a label word in the pages\' table) turns B2 red', labelWords({ ...LIFE_SAY, 'lifePage.kind': 'Gathering specialist' }).length === 1);
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
