/* ═══ v2.3.6692: RANKS UNDER THE NEW DASHBOARD (card UI2-ranks, the build's step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 7 ("a simple aligned
 * standings list: Rank | Player (portrait/name) | metric for this leaderboard.
 * No unrelated combat level when ranking a different skill"; "Conditional
 * pinned personal standing only when the player's actual row is outside the
 * visible list; no duplicate row when visible"; "Tapping a player opens
 * universal character inspection. Back returns to the same ranking category
 * and scroll position"), 1.2.1 ("Explicitly identify another player's
 * character"), and 2026-11-26 (UI_FEEDBACK part 4: "Reduce the metallic
 * gradients across the first three rows while retaining the gold, silver and
 * bronze medals. Highlight the player's own row regardless of rank").
 *
 * Part 1, THE RULES (src/game/ranksPage.js, run): ranksGroups, ranksBoardHeads,
 * youPinned, passportFromRow, ranksOpens, rankSel, ranksEntry.
 * Part 2, THE DRAWING (dash/rankViews.jsx, run in node by lib/jsxText.mjs):
 * the standings, the tiles, another player's page.
 * Part 3, THE PAGES' WIRING (the syntax tree of CharacterPage.jsx,
 * RankStandings.jsx, RanksLanding.jsx), and the sheet (ranksUi2.css).
 *
 * THE DODGES, each planted on the real files (one change each, the way a
 * tired programmer writes it) and seen red, every run (part 4):
 *   D1  a board dropped from every group (Points placed written out by hand,
 *       forgetting pts_dmg)          D2  an Equipment group with no board
 *   D3  the Lv chip on Woodcutting   D4  a value with no unit word
 *   D5  your row pinned while in view (`pinned = rank > 0`)   D6  pinned twice
 *   D7  "nobody" shown while loading
 *   D8  another player's page fed by readPassport(S) (your name, your levels)
 *   D9  "No title equipped" for a player whose title the game was not told
 *   D10 a weapon door on another player's page    D11 a gone row opening a page
 *   D12 Back losing the board (a module variable instead of the entry's sel)
 *   D13 Melee, Magic read instead of Sword, Staff
 *   D14 rows 1 to 3 given a gradient or a tint     D15 a medal dropped from 1-3
 *   D16 your row marked only in the top three      D17 ... or only when pinned
 *   D18 your row marked by colour alone ("You" gone)
 *   D19 two copies of your row in view (the pinned copy drawn with the real one in view)
 *   D20 the CharacterPage branch for another player taken away (it falls to yours)
 *
 * The mutants of the rules' added lines (a scratch run, each comparison,
 * boolean and guard turned round): the count and the survivors with their why
 * are at the end of part 1.
 *
 * Run: node tools/guards/ranks-ui2.test.mjs  (needs esbuild and @babel/parser:
 * npm install in the root or server/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleViews, html, textOf, loadEsbuild } from './lib/jsxText.mjs';
import { loadBabel } from './lib/jsxMount.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RULES = 'src/game/ranksPage.js';
const VIEWS = 'src/ui/mobile/dash/rankViews.jsx';
const CHAR = 'src/ui/mobile/sheet/CharacterPage.jsx';
const STAND = 'src/ui/mobile/dash/RankStandings.jsx';
const LAND = 'src/ui/mobile/dash/RanksLanding.jsx';
const SHEET = 'src/ui/mobile/dash/ranksUi2.css';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* the boards a worker with everything keeps (LeaderboardPanel.jsx boardList: caps.power, 8 stat boards,
   achievements, the spin, the flip, the fish), in its order */
const ALL = ['power', 'melee', 'bow', 'magic', 'combat', 'pts_def', 'pts_hp', 'pts_dodge', 'pts_stam', 'pts_eres', 'pts_mana', 'pts_move', 'pts_dmg',
  'kills', 'ap', 'spin', 'flip', 'fish', 'woodcutting', 'fishing', 'mining', 'farming', 'cooking', 'blacksmithing', 'woodworking', 'gemCutting', 'enchanting', 'trapping'];
const UNITS = new Set(['leaderboard.levelHead', 'leaderboard.powerHead', 'leaderboard.pointsHead', 'leaderboard.killsHead', 'leaderboard.apHead', 'leaderboard.goldHead', 'leaderboard.weightHead']);

/* ── part 1: the rules, run (a module from text, so a plant can run too) ── */
const asModule = (text) => import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
function rulesChecks(R) {
  const out = [];
  const ok = (name, pass, detail) => out.push({ name, pass: !!pass, detail });
  const g = R.ranksGroups(ALL.concat(['zzNew']));
  const placed = [];
  for (const x of g) placed.push(...x.boards, ...x.points);
  ok('R1a every board is in one group or behind Points placed, none dropped, none twice',
    ALL.concat(['zzNew']).every((id) => placed.filter((p) => p === id).length === 1) && placed.length === ALL.length + 1, placed);
  ok('R1b three groups, Combat, Life Skills, Feats in that order; no Equipment', JSON.stringify(g.map((x) => x.id)) === '["combat","life","feats"]', g.map((x) => x.id));
  ok('R1c Combat: Overall, Sword, Bow, Staff, Combat level, and the eight stat boards behind its door',
    JSON.stringify(g[0].boards) === '["power","melee","bow","magic","combat"]' && g[0].points.length === 8 && g[0].points.includes('pts_dmg'), g[0]);
  ok('R1d a board no group names goes under Feats, last', g[2].boards[g[2].boards.length - 1] === 'zzNew', g[2]);
  ok('R1e a group the worker keeps nothing of is left out', JSON.stringify(R.ranksGroups(['kills', 'woodcutting']).map((x) => x.id)) === '["life","feats"]');
  ok('R1f only stat boards: Combat stays, its door alone', (() => { const x = R.ranksGroups(['pts_hp']); return x.length === 1 && x[0].id === 'combat' && x[0].boards.length === 0 && x[0].points[0] === 'pts_hp'; })());
  ok('R1g nothing kept, nothing drawn; junk ignored', R.ranksGroups([]).length === 0 && R.ranksGroups(null).length === 0 && R.ranksGroups([null, 3, '']).length === 0);
  ok('R1h a repeated id once', R.ranksGroups(['kills', 'kills'])[0].boards.length === 1);
  const heads = ALL.map((id) => [id, R.ranksBoardHeads(id)]);
  ok('R2a every board says its unit (Level, Power, Points, Kills, AP, Gold, Weight)', heads.every(([, h]) => UNITS.has(h.metric)), heads.filter(([, h]) => !UNITS.has(h.metric)));
  ok('R2b the level shows only where it IS the value (Combat level)', heads.every(([id, h]) => h.lv === (id === 'combat')), heads.filter(([, h]) => h.lv).map(([id]) => id));
  ok('R2c Sword, Bow, Staff: the game\'s one vocabulary, never Melee or Magic',
    R.ranksBoardHeads('melee').word === 'leaderboard.swordBoard' && R.ranksBoardHeads('magic').word === 'leaderboard.staffBoard' && R.ranksBoardHeads('bow').word === 'leaderboard.bowBoard');
  ok('R2d each skill and weapon ranks a Level; Overall its Power; a stat board Points; the records Gold and Weight',
    R.ranksBoardHeads('woodcutting').metric === 'leaderboard.levelHead' && R.ranksBoardHeads('melee').metric === 'leaderboard.levelHead'
    && R.ranksBoardHeads('power').metric === 'leaderboard.powerHead' && R.ranksBoardHeads('pts_dmg').metric === 'leaderboard.pointsHead'
    && R.ranksBoardHeads('spin').metric === 'leaderboard.goldHead' && R.ranksBoardHeads('fish').metric === 'leaderboard.weightHead'
    && R.ranksBoardHeads('kills').metric === 'leaderboard.killsHead' && R.ranksBoardHeads('ap').metric === 'leaderboard.apHead');
  ok('R2e a stat board is named by its stat (word null); an unknown board says Score', R.ranksBoardHeads('pts_hp').word === null && R.ranksBoardHeads('zz').metric === 'leaderboard.scoreHead');
  /* the pinned copy lies over the list's last pitch: only while the real row is out of view */
  const P = 46, H = 138;   /* three rows in view */
  ok('R3a rank 2 at the top: in view, not pinned', R.youPinned(2, 0, P, H) === false);
  ok('R3b rank 3, its foot exactly at the list\'s foot: in view, not pinned', R.youPinned(3, 0, P, H) === false);
  ok('R3c rank 4 below the foot: pinned', R.youPinned(4, 0, P, H) === true);
  ok('R3d rank 10 scrolled to (scroll 330): in view, not pinned', R.youPinned(10, 330, P, H) === false && R.youPinned(10, 300, P, H) === true);
  ok('R3e rank 1 scrolled wholly past the top (scroll 46): pinned', R.youPinned(1, 46, P, H) === true);
  ok('R3f rank 1 partly off the top (scroll 20): still in view, one copy', R.youPinned(1, 20, P, H) === false);
  ok('R3g not on the board, or not yet measured: never pinned', R.youPinned(0, 0, P, H) === false && R.youPinned(5, 0, P, 0) === false && R.youPinned(5, 0, 0, H) === false);
  ok('R3h rank 300 out of view: pinned (the mark wherever it stands)', R.youPinned(300, 0, P, H) === true && R.youPinned(300, 299 * P - H + P, P, H) === false);
  const row = { id: 'p2', name: ' Bee ', look: { sk: 1 }, series: { melee: 7, bow: 12, magic: 3, woodcutting: 40 }, ap: 55, kills: 9, clanTag: 'OAK', level: 99, lv: 12 };
  const pp = R.passportFromRow(row, { label: 'Woodcutting', value: '40' });
  const f = (id) => pp.facts.find((x) => x.id === id);
  ok('R4a another player\'s page reads their row: name, face, Sword, Bow, Staff from the series, AP, kills, clan',
    pp.id === 'p2' && pp.name === 'Bee' && pp.look && pp.look.sk === 1 && f('sword').v === 7 && f('bow').v === 12 && f('staff').v === 3 && f('ap').v === 55 && f('kills').v === 9 && f('clan').v === '[OAK]', pp);
  ok('R4b its combat level the best weapon\'s (the worker\'s lv), never the stored `level`', pp.combat === 12, pp.combat);
  ok('R4c the board\'s own number first, under the board\'s name', pp.facts[0].id === 'board' && pp.facts[0].label === 'Woodcutting' && pp.facts[0].v === '40');
  ok('R4d the title and the quests: "Not shared", never "No title equipped"', f('title').none && f('title').v === null && f('quests').none && pp.notShared === 'charPage.notShared'
    && !JSON.stringify(pp).includes('noTitle'));
  const rec = R.passportFromRow({ pid: 'p3', name: 'Cod' });
  ok('R4e a records row with only a name: the name, every line "Not shared", no level', rec.id === 'p3' && rec.name === 'Cod' && rec.combat === null
    && rec.facts.every((x) => x.none) && rec.facts.length === 8, rec);
  ok('R4f nothing to press: no fact opens anything', pp.facts.every((x) => !('opens' in x)) && !('doors' in pp));
  ok('R4g junk is safe', R.passportFromRow(null).id === '' && R.passportFromRow({ series: 'x', ap: -1 }).facts.find((x) => x.id === 'ap').v === null);
  const me = 'me1';
  ok('R5a a group, Points placed, a board (with its choice): their pages, the choice on the sel',
    JSON.stringify(R.ranksOpens({ kind: 'group', group: 'life' })) === '{"id":"ranksGroup","sel":"life","who":null}'
    && R.ranksOpens({ kind: 'points' }).id === 'ranksPoints' && R.ranksOpens({ kind: 'board', board: 'spin', choice: 'losses' }).sel === 'spin:losses'
    && R.ranksOpens({ kind: 'board', board: 'woodcutting' }).sel === 'woodcutting' && R.ranksOpens({ kind: 'group', group: 'equipment' }) === null);
  const other = R.ranksOpens({ kind: 'row', row, meId: me, key: 'id', board: { label: 'Woodcutting', value: '40' } });
  ok('R5b another player\'s row: their Character, who = { id, name, look, passport } (the row\'s readings)',
    other && other.id === 'broCharacter' && other.who.id === 'p2' && other.who.name === 'Bee' && other.who.passport.facts[0].v === '40', other);
  ok('R5c your own row: your one Bro page', JSON.stringify(R.ranksOpens({ kind: 'row', row: { id: me, name: 'Me' }, meId: me, key: 'id' })) === '{"id":"hero","sel":null,"who":null}');
  ok('R5d a deleted character\'s row, or one with no id, opens nothing', R.ranksOpens({ kind: 'row', row: { ...row, gone: true }, meId: me }) === null
    && R.ranksOpens({ kind: 'row', row: { name: 'x' }, meId: me }) === null && R.ranksOpens({ kind: 'row', row: null }) === null);
  ok('R5e a records row is keyed by pid', R.ranksOpens({ kind: 'row', row: { pid: 'p9', name: 'Z' }, meId: me, key: 'pid' }).who.id === 'p9'
    && R.ranksOpens({ kind: 'row', row: { pid: me }, meId: me, key: 'pid' }).id === 'hero');
  ok('R6a the board and its choice read back from the sel', JSON.stringify(R.rankSel('fish:trout')) === '{"board":"fish","choice":"trout"}'
    && JSON.stringify(R.rankSel('kills')) === '{"board":"kills","choice":null}' && R.rankSel(null).board === '');
  const nav = { ws: 'menu', menu: [{ id: 'leaderboard', sel: null }, { id: 'ranksGroup', sel: 'life', key: 3 }, { id: 'ranksBoard', sel: 'woodcutting', key: 4 }, { id: 'broCharacter', key: 5 }] };
  ok('R6b the header reads the nearest entry of its page (its Back, under a player\'s page)', R.ranksEntry(nav, 'ranksBoard').sel === 'woodcutting'
    && R.ranksEntry(nav, 'ranksGroup').sel === 'life' && R.ranksEntry(nav, 'ranksPoints') === null && R.ranksEntry(null, 'x') === null);
  /* the mutants the suite first let live (the scratch run), each killed here */
  ok('R7a a 0 is a value (AP 0), a junk id, pid, tag or look is none',
    R.passportFromRow({ id: 'x', ap: 0 }).facts.find((x) => x.id === 'ap').v === 0 && R.passportFromRow({ id: '', pid: 'p3' }).id === 'p3'
    && R.passportFromRow({ pid: 7 }).id === '' && R.passportFromRow({ id: 'x', clanTag: 5 }).facts.find((x) => x.id === 'clan').v === null
    && R.passportFromRow({ id: 'x', look: 'abc' }).look === null);
  ok('R7b a board with no id opens nothing; a sel that starts with its colon', R.ranksOpens({ kind: 'board', board: '' }) === null
    && JSON.stringify(R.rankSel(':x')) === '{"board":"","choice":"x"}');
  ok('R7c the page\'s entry found at the stack\'s foot', R.ranksEntry({ ws: 'menu', menu: [{ id: 'ranksGroup', sel: 'feats' }] }, 'ranksGroup').sel === 'feats');
  return out;
}

let failed = 0;
function check(name, pass, detail) {
  if (pass) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 800))); }
}
const rulesText = read(RULES);
for (const c of rulesChecks(await asModule(rulesText))) check(c.name, c.pass, c.detail);
/* The mutants (a scratch run, v2.3.6692: each comparison and boolean of the
   rules' added lines turned round, one at a time, 89 of them): all killed but
   two, each the same answer either way (equivalent):
     passportFromRow `r.series && typeof r.series === 'object'` -> `||`: a
       series that is not an object reads no weapon either way (null);
     ranksOpens `t.row && typeof t.row === 'object'` -> `||`: a row that is
       not an object has no id either way, and opens nothing. */

/* ── part 2: the drawing, run in node ── */
const B = loadBabel(ROOT);
check('0. esbuild and @babel/parser load (npm install in the root or server/)', !!loadEsbuild(ROOT) && !!B);
if (!B || !loadEsbuild(ROOT)) process.exit(1);
const ENTRY = `export * from './${VIEWS}';`;
const Medal = ({ rank }) => ({ $el: 1, type: 'i', props: { 'data-medal': rank <= 3 ? rank : 'n' + rank } });
const Face = () => ({ $el: 1, type: 'b', props: { 'data-face': '1' } });
const WORDS = { you: 'You', deleted: 'Deleted character', notRanked: 'Not ranked on this board' };
const mkRow = (rank, extra) => ({ key: 'k' + rank, rank, name: 'P' + rank, face: null, value: String(100 - rank), mine: false, gone: false, door: true, aria: 'r', ...(extra || {}) });
function board(V, o) {
  return html(V.StandingsView({ board: 'woodcutting', heads: { rank: 'Rank', player: 'Player', metric: 'Level' }, rows: [], pinned: null, notRanked: false, loading: false,
    empty: 'Nobody', choice: null, words: WORDS, Medal, Face, onRow: () => {}, onPinned: () => {}, listRef: null, zoneRef: null, pitch: 46, short: false, ...o }));
}
const rowsOf = (m) => m.split('data-rank-row="').slice(1).map((x) => x.split('</button>')[0].split('</div>')[0]);
const clsOf = (m, rank) => { const i = m.indexOf('data-rank-row="' + rank + '"'); const s = m.lastIndexOf('class="', i); return m.slice(s + 7, m.indexOf('"', s + 7)); };
async function viewChecks(over) {
  const out = [];
  const ok = (name, pass, detail) => out.push({ name, pass: !!pass, detail });
  let V;
  try { V = await bundleViews(ROOT, ENTRY, over); } catch (e) { ok('V0 the views bundle', false, String(e && e.message)); return out; }
  const ten = [];
  for (let i = 1; i <= 10; i++) ten.push(mkRow(i, i === 7 ? { mine: true } : null));
  const m = board(V, { rows: ten });
  const t = textOf(m);
  ok('V1 the heads say Rank, Player and the unit', /Rank\s*Player\s*Level/.test(t), t.slice(0, 80));
  ok('V2 no Lv chip on Woodcutting (the level is not its value)', !/\bLv\b/.test(t), t);
  ok('V3 rows 1 to 3 the same surface as every other row (no class, tint or gradient of their own)',
    [1, 2, 3].every((r) => clsOf(m, r) === clsOf(m, 4)) && !/gradient|background/i.test(m), [1, 2, 3, 4].map((r) => clsOf(m, r)));
  ok('V4 the medal on 1, 2 and 3 (the game\'s own, kept), the number below', [1, 2, 3].every((r) => m.includes('data-medal="' + r + '"')) && m.includes('data-medal="n4"'));
  ok('V5 every row that opens a player is a raised door (a button); the value in it a flat fact', (m.match(/<button[^>]*class="u2-raised u2-rk-row/g) || []).length === 10
    && (m.match(/u2-fact-v u2-rk-v/g) || []).length === 10 && !/u2-stat/.test(m));
  ok('V6 your row marked wherever it stands (7th): the kit\'s mark and the word "You"', clsOf(m, 7).includes('is-mine') && rowsOf(m)[6].includes('You')
    && [1, 2, 3, 4, 5, 6, 8].every((r) => !clsOf(m, r).includes('is-mine')));
  const top = board(V, { rows: [mkRow(1, { mine: true }), mkRow(2)] });
  const far = board(V, { rows: ten.map((r) => ({ ...r, mine: false })).concat([mkRow(300, { mine: true })]) });
  ok('V7 ...first, and three hundredth', clsOf(top, 1).includes('is-mine') && clsOf(far, 300).includes('is-mine') && rowsOf(far).pop().includes('You'));
  const pin = board(V, { rows: ten.map((r) => ({ ...r, mine: r.rank === 9 })), pinned: { ...ten[8], mine: true } });
  ok('V8 the pinned copy wears the same mark and word', pin.includes('data-rank-pinned') && /data-rank-pinned=""[^]*is-mine[^]*You/.test(pin));
  ok('V9 no pinned copy is drawn unless the rule says so (one copy of your row)', (m.match(/data-rank-mine="1"/g) || []).length === 1 && !m.includes('data-rank-pinned'));
  const gone = board(V, { rows: [mkRow(1, { gone: true, door: false }), mkRow(2)] });
  ok('V10 a deleted character\'s row is no door (flat, its words)', !/<button[^>]*data-rank-row="1"/.test(gone) && /<div[^>]*data-rank-row="1"/.test(gone) && textOf(gone).includes('Deleted character'));
  const wait = board(V, { loading: true });
  ok('V11 loading: the kit\'s placeholder, never "nobody" before the answer', wait.includes('data-rank-loading') && !textOf(wait).includes('Nobody'));
  ok('V12 not ranked: one quiet line at the foot', board(V, { rows: ten.slice(0, 2), notRanked: true }).includes('data-rank-unranked') && !m.includes('data-rank-unranked'));
  const tiles = html(V.RankTilesView({ kind: 'landing', tiles: [{ id: 'combat', label: 'Combat', art: 'a' }, { id: 'life', label: 'Life Skills', art: 'b' }, { id: 'feats', label: 'Feats', art: 'c' }], cols: 3, onTile: () => {} }));
  ok('V13 the landing: three doors, Combat, Life Skills, Feats', /Combat[^]*Life Skills[^]*Feats/.test(textOf(tiles)) && (tiles.match(/<button/g) || []).length === 3 && tiles.includes('data-ranks-ui2="landing"'));
  const P = { id: 'p2', name: 'Bee', look: null, gone: false, combat: 12, notShared: 'charPage.notShared',
    facts: [{ id: 'board', label: 'Woodcutting', v: '40' }, { id: 'sword', k: 'charPage.sword', v: 7 }, { id: 'title', k: 'charPage.title', v: null, none: true }] };
  const word = (k) => ({ 'charPage.sword': 'Sword', 'charPage.title': 'Title', 'charPage.notShared': 'Not shared' })[k] || '?';
  const oth = html(V.CharacterOtherView({ P, face: null, Face, whose: "Bee's Bro", word, combatWord: 'Combat Lv 12', short: false }));
  ok('V14 another player\'s page: their name, whose it is, the row\'s values, "Not shared"; nothing to press',
    /Bee[^]*Bee's Bro[^]*Combat Lv 12[^]*Woodcutting\s*40[^]*Sword\s*7[^]*Title\s*Not shared/.test(textOf(oth)) && !/<button/.test(oth) && !/u2-raised/.test(oth), textOf(oth));
  return out;
}
for (const c of await viewChecks(null)) check(c.name, c.pass, c.detail);

/* ── part 3: the pages' wiring (the syntax tree) and the sheet ── */
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
function fnNode(ast, name) {
  let f = null;
  B.traverse(ast, { FunctionDeclaration(p) { if (p.node.id && p.node.id.name === name) { f = p; p.stop(); } } });
  return f;
}
const callsIn = (p, callee) => { let n = 0; p.traverse({ CallExpression(q) { const c = q.node.callee; if (c.type === 'Identifier' && c.name === callee) n++; } }); return n; };
function wiringChecks(over) {
  const out = [];
  const ok = (name, pass, detail) => out.push({ name, pass: !!pass, detail });
  const src = (rel) => (over && over[rel] !== undefined ? over[rel] : read(rel));
  const ch = parse(src(CHAR));
  const cp = fnNode(ch, 'CharacterPage');
  const first = cp && cp.node.body.body[0];
  const branch = !!first && first.type === 'IfStatement' && first.test.type === 'BinaryExpression' && first.test.operator === '!=' && first.test.left.name === 'who'
    && first.consequent.type === 'ReturnStatement' && first.consequent.argument && first.consequent.argument.type === 'JSXElement'
    && first.consequent.argument.openingElement.name.name === 'OtherCharacter';
  ok('W1 CharacterPage: another player (who != null) is drawn by OtherCharacter before anything of yours is read', branch && cp && callsIn(cp, 'readPassport') === 0);
  const oc = fnNode(ch, 'OtherCharacter');
  ok('W2 OtherCharacter reads none of your state (no readPassport, broPassport, S) and draws no door',
    !!oc && callsIn(oc, 'readPassport') === 0 && callsIn(oc, 'broPassport') === 0 && callsIn(oc, 'PassDoor') === 0
    && !/\bS\b|PassDoor|onWeapon|frameTap/.test(src(CHAR).slice(oc.node.start, oc.node.end)));
  const st = parse(src(STAND));
  const rs = fnNode(st, 'RankStandings');
  let pinOk = false;
  rs && rs.traverse({ VariableDeclarator(q) {
    if (q.node.id.name !== 'pinned') return;
    const i = q.node.init;
    pinOk = !!i && i.type === 'ConditionalExpression' && i.test.type === 'CallExpression' && i.test.callee.name === 'youPinned'
      && i.test.arguments.length === 4 && i.test.arguments[1].type === 'Identifier' && i.test.arguments[1].name === 'scroll';
  } });
  ok('W3 RankStandings pins your row only by the rule, from the kept scroll (youPinned(rank, scroll, pitch, size))', pinOk);
  const la = parse(src(LAND));
  const ru = fnNode(la, 'RanksUi2');
  let selOk = false;
  ru && ru.traverse({ CallExpression(q) {
    const a = q.node.arguments[0];
    if (q.node.callee.name === 'rankSel' && a && a.type === 'MemberExpression' && a.object.name === 'top' && a.property.name === 'sel') selOk = true;
  } });
  let moduleLet = false;
  for (const s of la.program.body) if (s.type === 'VariableDeclaration' && s.kind === 'let') moduleLet = true;
  ok('W4 the board on Back is the entry\'s sel (rankSel(top.sel)), never a module variable', selOk && !moduleLet);
  const sheet = src(SHEET);
  const rules = sheet.replace(/\/\*[^]*?\*\//g, '').split('}').map((r) => r.trim()).filter(Boolean);
  const byPlace = rules.filter((r) => /data-rank-medal|is-top|is-gold|is-silver|is-bronze|nth-child|nth-of-type|:first-child/.test(r.split('{')[0]));
  const grad = rules.filter((r) => /\.u2-rk-row/.test(r.split('{')[0]) && /gradient|background|box-shadow|filter/.test(r.split('{')[1] || ''));
  ok('W5 the sheet gives no place (1 to 3) a look of its own, and a row no gradient, tint or glow', byPlace.length === 0 && grad.length === 0, byPlace.concat(grad));
  return out;
}
for (const c of wiringChecks(null)) check(c.name, c.pass, c.detail);

/* ── part 4: the dodges, planted and seen red ── */
const swap = (rel, from, to) => { const s = read(rel); if (s.split(from).length !== 2) return null; return { [rel]: s.replace(from, to) }; };
const PLANTS = [
  ['D1', 'Points placed written out by hand, forgetting pts_dmg', 'rules', swap(RULES, "if (id.startsWith(STAT_PREFIX) && id.length > STAT_PREFIX.length) return 'points';\n  if (SKILL_IDS",
    "if (['pts_def', 'pts_hp', 'pts_dodge', 'pts_stam', 'pts_eres', 'pts_mana', 'pts_move'].includes(id)) return 'points';\n  if (SKILL_IDS")],
  ['D2', 'an Equipment group with no board', 'rules', swap(RULES, "export const RANKS_GROUPS = Object.freeze(['combat', 'life', 'feats']);", "export const RANKS_GROUPS = Object.freeze(['combat', 'life', 'feats', 'equipment']);")],
  ['D2b', '...drawn even when empty', 'rules', swap(RULES, '    if (by[g].length === 0 && pts.length === 0) continue;\n', '')],
  ['D3', 'the Lv chip on Woodcutting (hasLv: () => true left from today)', 'rules', swap(RULES, "return Object.freeze({ word, metric, lv: k === 'combat' });", 'return Object.freeze({ word, metric, lv: true });')],
  ['D3b', '...drawn in the row', 'views', swap(VIEWS, '<span className="u2-rk-name">{r.name}</span>', '<span className="u2-rk-name">{r.name}</span><span>Lv {r.rank}</span>')],
  ['D4', 'a value with no unit word', 'rules', swap(RULES, "  else if (k === 'kills') metric = 'leaderboard.killsHead';\n", '')],
  ['D5', 'your row pinned while in view (pinned = rank > 0)', 'rules', swap(RULES, '  return bottom > s + h || bottom <= s;', '  return r > 0;')],
  ['D5b', '...the page not asking the rule', 'wiring', swap(STAND, 'const pinned = youPinned(you.rank, scroll, RANK_PITCH, zone.h) ?', 'const pinned = you.rank > 0 ?')],
  ['D6', 'pinned while partly in view (two copies)', 'rules', swap(RULES, '  return bottom > s + h || bottom <= s;', '  return bottom > s + h - p || bottom - p < s;')],
  ['D7', '"nobody" shown while loading', 'views', swap(VIEWS, '{loading ? (', '{false ? (')],
  ['D8', 'another player\'s page fed by readPassport(S)', 'wiring', swap(CHAR, '  const P = who && typeof who === \'object\' && who.passport', '  const mine = readPassport(S);\n  const P = who && typeof who === \'object\' && who.passport')],
  ['D8b', '<CharacterPage S={S} who={row} /> falling to your own page', 'wiring', swap(CHAR, '  if (who != null) return <OtherCharacter who={who} />;\n', '')],
  ['D9', '"No title equipped" for a player whose title the game was not told', 'rules', swap(RULES, "fact('title', 'charPage.title', null)", "fact('title', 'charPage.title', 'charPage.noTitle')")],
  ['D10', 'a weapon door on another player\'s page', 'views', swap(VIEWS, '<div key={f.id} className="u2-fact" data-char-fact={f.id}>', '<div key={f.id} className="u2-fact" data-char-fact={f.id}>{f.id === \'sword\' ? <button type="button" className="u2-raised" onClick={() => 1}>Sword</button> : null}')],
  ['D11', 'a gone row opening a page', 'rules', swap(RULES, '    if (!r || r.gone) return null;', '    if (!r) return null;')],
  ['D11b', '...drawn as a door', 'views', swap(VIEWS, '  if (!r.door) return', '  if (false) return')],
  ['D12', 'Back losing the board (a module variable instead of the entry\'s sel)', 'wiring', swap(LAND, '    const { board, choice } = rankSel(top.sel);', '    const { board, choice } = rankSel(lastBoard);')],
  ['D12b', '...kept in a module let', 'wiring', swap(LAND, "const BRO_DOOR = { combat:", "let lastBoard = null;\nconst BRO_DOOR = { combat:")],
  ['D13', 'Melee, Magic read instead of Sword, Staff', 'rules', swap(RULES, "melee: 'leaderboard.swordBoard', bow: 'leaderboard.bowBoard', magic: 'leaderboard.staffBoard',", "melee: 'leaderboard.meleeBoard', bow: 'leaderboard.bowBoard', magic: 'leaderboard.magicBoard',")],
  ['D14', 'rows 1 to 3 given a tinted class', 'views', swap(VIEWS, "const cls = 'u2-rk-row' + (r.mine ? ' is-mine' : '');", "const cls = 'u2-rk-row' + (r.rank <= 3 ? ' is-top' : '') + (r.mine ? ' is-mine' : '');")],
  ['D14b', '...a gradient on the first three in the sheet', 'wiring', swap(SHEET, '.ui2 button.u2-rk-row { cursor: pointer; }', ".ui2 button.u2-rk-row { cursor: pointer; }\n.ui2 .u2-rk-row[data-rank-medal='1'] { background: linear-gradient(180deg, #F2C462, #8A6A20); }")],
  ['D15', 'a medal dropped from 1 to 3', 'views', swap(VIEWS, '{Medal ? <Medal rank={r.rank} gone={r.gone} w={32} /> : r.rank}', '{Medal && r.rank > 3 ? <Medal rank={r.rank} gone={r.gone} w={32} /> : r.rank}')],
  ['D16', 'your row marked only in the top three', 'views', swap(VIEWS, "const cls = 'u2-rk-row' + (r.mine ? ' is-mine' : '');", "const cls = 'u2-rk-row' + (r.mine && r.rank <= 3 ? ' is-mine' : '');")],
  ['D17', 'your row marked only when pinned', 'views', swap(VIEWS, '<RankRowView r={pinned} words={words}', '<RankRowView r={{ ...pinned, pinnedCopy: 1 }} words={words}')
    && (() => { const a = swap(VIEWS, '<RankRowView r={pinned} words={words}', '<RankRowView r={{ ...pinned, pin: 1 }} words={words}'); const s = a[VIEWS].replace("const cls = 'u2-rk-row' + (r.mine ? ' is-mine' : '');", "const cls = 'u2-rk-row' + (r.mine && r.pin ? ' is-mine' : '');"); return { [VIEWS]: s }; })()],
  ['D18', 'your row marked by colour alone (no "You")', 'views', swap(VIEWS, '{r.mine ? <span className="u2-rk-you" data-rank-you="">{words.you}</span> : null}', '')],
  ['D19', 'the pinned copy drawn with the real one in view', 'views', swap(VIEWS, '  const pin = pinned ? (', '  pinned = pinned || rows.find((x) => x.mine) || null;\n  const pin = pinned ? (')],
];
for (const [id, what, part, over] of PLANTS) {
  if (!over) { check(`${id} plant applies (${what})`, false, 'its text is gone from the file: move the plant with the code'); continue; }
  let red = false;
  if (part === 'rules') red = rulesChecks(await asModule(over[RULES])).some((c) => !c.pass);
  else if (part === 'views') red = (await viewChecks(over)).some((c) => !c.pass);
  else red = wiringChecks(over).some((c) => !c.pass);
  check(`${id} red: ${what}`, red);
}

console.log(`\nranks-ui2: ${failed ? failed + ' FAILED' : 'all passed'}`);
if (failed) process.exit(1);
