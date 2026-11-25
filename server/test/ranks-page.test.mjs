/* ═══ v2.3.5503: THE RANKS PAGE'S RULES (src/game/ranksPage.js; card LB part 2) ═══
 *
 * The owner, 2026-11-25, with one mockup: "Also I prefer changing the
 * leaderboard style to something like this".  The page is ONE board at a
 * glance: four tabs, one picker, the medals, your row pinned at the foot.
 * This holds the rules the page (src/ui/mobile/dash/RanksPage.jsx) calls:
 *
 *   1. tabOf / ranksTabs: every board of today's list under one of the four
 *      tabs in the mockup's order (Power: Overall, Melee, Bow, Magic, Level;
 *      Stats: the `pts_` boards; Records: Kills, AP, the spin, the flip, the
 *      fish; Skills: the ten life skills), none dropped -- a board no tab
 *      names goes under Records, last; a tab with no board is left out; a
 *      repeated or empty id is not two boards;
 *   2. ranksStart: on the board asked for where the worker keeps it, else
 *      the first tab's first; the list shut;
 *   3. ranksStep, the one transition: a tab opens its last board (or its
 *      first) and shuts the list; a board opens under its own tab; the
 *      picker opens and shuts the list; `close` shuts it; `fit` settles on
 *      what the worker still keeps; an unknown tab, board or event changes
 *      nothing; the state is never a tab that disagrees with its board;
 *   4. medalOf: gold, silver, bronze for 1-3, none below or for nonsense;
 *   5. youRow / rankMark: your place and row on the rows the page shows
 *      ("#25"), off the board rank 0 and "#—"; the records' `pid` key;
 *   6. the page and the panel call them (read from the source);
 *   7. ranksFit: the band keeps its height, and the rows share what the
 *      tabs, the picker, the heads and your row leave so the first three
 *      always show upright; on its side (82 px) the tabs, the picker and
 *      your row share one line and two rows show.
 *
 * MUTANTS (by hand, 2026-11-25: each operator, literal and branch of
 * ranksPage.js flipped one at a time, 93 of them, the suite run against
 * each): every one killed but these three, kept on purpose -- the
 * `Object.freeze` round POWER_IDS, RECORD_IDS and SKILL_IDS dropped: the
 * lists are the module's own, never handed out, so nothing a caller can
 * reach writes them.
 */
let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const R = await import('../../src/game/ranksPage.js');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* today's list (LeaderboardPanel.jsx boardList with caps.power, 8 stat boards, achievements, the spin, the flip, the fish) */
const STATS = ['pts_def', 'pts_hp', 'pts_dodge', 'pts_stam', 'pts_eres', 'pts_mana', 'pts_move', 'pts_dmg'];
const SKILLS = ['woodcutting', 'fishing', 'mining', 'farming', 'cooking', 'blacksmithing', 'woodworking', 'gemCutting', 'enchanting', 'trapping'];
const FULL = ['power', 'melee', 'bow', 'magic', 'combat', ...STATS, 'kills', 'ap', 'spin', 'flip', 'fish', ...SKILLS];
/* an older worker: no caps.power, no stat boards, no AP, no records but Kills */
const OLD = ['melee', 'bow', 'magic', 'combat', 'kills', ...SKILLS];

/* ── 1. the tabs ── */
{
  check('1a the four tabs in the mockup\'s order', same(R.RANK_TABS, ['power', 'stats', 'records', 'skills']) && Object.isFrozen(R.RANK_TABS));
  check('1b each board under its tab', ['power', 'melee', 'bow', 'magic', 'combat'].every((id) => R.tabOf(id) === 'power')
    && STATS.every((id) => R.tabOf(id) === 'stats') && ['kills', 'ap', 'spin', 'flip', 'fish'].every((id) => R.tabOf(id) === 'records')
    && SKILLS.every((id) => R.tabOf(id) === 'skills'));
  check('1c no tab names an unknown id, the bare prefix, a non-string, or an inherited key',
    R.tabOf('nope') === null && R.tabOf('pts_') === null && R.tabOf('pts') === null && R.tabOf(undefined) === null && R.tabOf(7) === null
    && R.tabOf('__proto__') === null && R.tabOf('toString') === null && R.tabOf('Power') === null);
  const t = R.ranksTabs(FULL);
  check('1d the full list: four tabs, every board once, in the list\'s order',
    same(t, [{ id: 'power', boards: ['power', 'melee', 'bow', 'magic', 'combat'] }, { id: 'stats', boards: STATS },
      { id: 'records', boards: ['kills', 'ap', 'spin', 'flip', 'fish'] }, { id: 'skills', boards: SKILLS }]), t);
  const n = t.reduce((a, x) => a + x.boards.length, 0);
  check('1e none dropped: the tabs hold exactly the list', n === FULL.length && FULL.every((id) => t.some((x) => x.boards.includes(id))));
  const o = R.ranksTabs(OLD);
  check('1f an older worker: no Overall, no Stats tab (none of its boards), Kills alone under Records',
    same(o.map((x) => x.id), ['power', 'records', 'skills']) && same(o[0].boards, ['melee', 'bow', 'magic', 'combat']) && same(o[1].boards, ['kills']), o);
  const u = R.ranksTabs(['melee', 'newboard', 'kills', 'other']);
  check('1g a board no tab names goes under Records, after the rest', same(u, [{ id: 'power', boards: ['melee'] }, { id: 'records', boards: ['kills', 'newboard', 'other'] }]), u);
  const d = R.ranksTabs(['melee', 'melee', '', null, 5, 'bow']);
  check('1h a repeated, empty or non-string id is not a board', same(d, [{ id: 'power', boards: ['melee', 'bow'] }]), d);
  check('1i nothing, or not a list: no tabs', same(R.ranksTabs([]), []) && same(R.ranksTabs(null), []) && same(R.ranksTabs('melee'), []));
  const p = R.ranksTabs(['__proto__', 'constructor']);
  check('1j hostile ids are only boards under Records', same(p, [{ id: 'records', boards: ['__proto__', 'constructor'] }]), p);
}

/* ── 2. the first state ── */
{
  const s = R.ranksStart(FULL, null);
  check('2a no board asked: the first tab\'s first board, the list shut', s.tab === 'power' && s.board === 'power' && s.menu === false && Object.isFrozen(s), s);
  const f = R.ranksStart(FULL, 'fish');
  check('2b the fish asked (the weigh-in card): Records, the fish', f.tab === 'records' && f.board === 'fish' && f.menu === false, f);
  const g = R.ranksStart(OLD, 'power');
  check('2c a board the worker does not keep: the first tab\'s first', g.tab === 'power' && g.board === 'melee', g);
  const e = R.ranksStart([], 'melee');
  check('2d no boards at all: no tab, no board', e.tab === null && e.board === null && e.menu === false && Object.isFrozen(e), e);
  const nb = R.ranksStart(['melee', 'newboard'], 'newboard');
  check('2f a board no tab names, asked: under Records', nb.tab === 'records' && nb.board === 'newboard', nb);
  const w = R.ranksStart(FULL, 'woodworking');
  check('2e a skill asked: Skills, that skill, remembered there', w.tab === 'skills' && w.board === 'woodworking' && w.last.skills === 'woodworking', w);
}

/* ── 3. the one transition ── */
{
  let s = R.ranksStart(FULL, null);
  s = R.ranksStep(s, { type: 'tab', tab: 'skills' }, FULL);
  check('3a a tab: its first board, the list shut', s.tab === 'skills' && s.board === 'woodcutting' && !s.menu, s);
  s = R.ranksStep(s, { type: 'menu' }, FULL);
  check('3b the picker opens the list', s.menu === true && s.tab === 'skills' && s.board === 'woodcutting', s);
  s = R.ranksStep(s, { type: 'board', board: 'mining' }, FULL);
  check('3c a pick: that board, the list shut', s.board === 'mining' && s.tab === 'skills' && !s.menu, s);
  s = R.ranksStep(s, { type: 'tab', tab: 'power' }, FULL);
  s = R.ranksStep(s, { type: 'board', board: 'bow' }, FULL);
  s = R.ranksStep(s, { type: 'tab', tab: 'skills' }, FULL);
  check('3d back on a tab: the board last looked at there', s.tab === 'skills' && s.board === 'mining', s);
  s = R.ranksStep(s, { type: 'tab', tab: 'power' }, FULL);
  check('3e ...and on the other', s.tab === 'power' && s.board === 'bow', s);
  const m = R.ranksStep(R.ranksStep(s, { type: 'menu' }, FULL), { type: 'tab', tab: 'stats' }, FULL);
  check('3f a tab tapped with the list open shuts it', m.tab === 'stats' && m.board === 'pts_def' && !m.menu, m);
  const x = R.ranksStep(R.ranksStep(s, { type: 'menu' }, FULL), { type: 'board', board: 'fish' }, FULL);
  check('3g a board of another tab opens under its own tab', x.tab === 'records' && x.board === 'fish' && !x.menu, x);
  const c = R.ranksStep(R.ranksStep(s, { type: 'menu' }, FULL), { type: 'close' }, FULL);
  check('3h close shuts the list and keeps the board', !c.menu && c.board === 'bow' && c.tab === 'power' && Object.isFrozen(c), c);
  const nk = R.ranksStep(R.ranksStart(['melee', 'newboard'], null), { type: 'board', board: 'newboard' }, ['melee', 'newboard']);
  check('3h2 a board no tab names, picked: under Records', nk.tab === 'records' && nk.board === 'newboard', nk);
  check('3i close with the list shut is the same state', R.ranksStep(s, { type: 'close' }, FULL) === s);
  const tw = R.ranksStep(R.ranksStep(s, { type: 'menu' }, FULL), { type: 'menu' }, FULL);
  check('3j the picker again shuts the list', tw.menu === false && tw.board === 'bow', tw);
  check('3k an unknown tab, board or event changes nothing',
    R.ranksStep(s, { type: 'tab', tab: 'nope' }, FULL) === s && R.ranksStep(s, { type: 'board', board: 'nope' }, FULL) === s
    && R.ranksStep(s, { type: 'tab', tab: '__proto__' }, FULL) === s && R.ranksStep(s, { type: 'board', board: '__proto__' }, FULL) === s
    && R.ranksStep(s, { type: 'jump' }, FULL) === s && R.ranksStep(s, null, FULL) === s && R.ranksStep(s, {}, FULL) === s);
  check('3l a board the worker does not keep is not opened', R.ranksStep(R.ranksStart(OLD, null), { type: 'board', board: 'power' }, OLD).board === 'melee');
  check('3m a tab with no board is not opened', R.ranksStep(R.ranksStart(OLD, null), { type: 'tab', tab: 'stats' }, OLD).tab === 'power');
  /* fit: the worker's boards change under the page */
  const fp = R.ranksStart(FULL, 'power');
  const fo = R.ranksStep(fp, { type: 'fit' }, OLD);
  check('3n fit: Overall gone, the Power tab\'s next board', fo.tab === 'power' && fo.board === 'melee', fo);
  const fs = R.ranksStep(R.ranksStart(FULL, 'pts_hp'), { type: 'fit' }, OLD);
  check('3o fit: the Stats tab gone, the first tab\'s first board', fs.tab === 'power' && fs.board === 'melee' && !fs.menu, fs);
  const fk = R.ranksStep(R.ranksStep(R.ranksStart(FULL, 'kills'), { type: 'menu' }, FULL), { type: 'fit' }, OLD);
  check('3p fit: a board still kept stays, its list open as it was', fk.board === 'kills' && fk.tab === 'records' && fk.menu === true, fk);
  const fr = R.ranksStep(R.ranksStep(R.ranksStart(FULL, 'kills'), { type: 'board', board: 'fish' }, FULL), { type: 'fit' }, OLD);
  check('3q fit: a board gone from a tab still there: that tab\'s last kept board, the list shut', fr.tab === 'records' && fr.board === 'kills' && !fr.menu, fr);
  const n0 = R.ranksStep(null, { type: 'tab', tab: 'skills' }, FULL);
  check('3r no state yet: the first, then the step', n0.tab === 'skills' && n0.board === 'woodcutting', n0);
  const em = R.ranksStep(R.ranksStart([], null), { type: 'menu' }, []);
  check('3s no boards: the picker opens nothing', em.menu === false && em.board === null, em);
  /* the state never disagrees: the tab is the board's */
  let z = R.ranksStart(FULL, null);
  let agree = true;
  const evs = [{ type: 'tab', tab: 'records' }, { type: 'menu' }, { type: 'board', board: 'pts_mana' }, { type: 'fit' }, { type: 'tab', tab: 'skills' }, { type: 'board', board: 'ap' }, { type: 'close' }];
  for (const ev of evs) { z = R.ranksStep(z, ev, FULL); if (R.tabOf(z.board) !== z.tab || z.last[z.tab] !== z.board || !Object.isFrozen(z) || !Object.isFrozen(z.last)) agree = false; }
  check('3t through any steps the tab is the board\'s, and remembered there', agree, z);
  check('3u the remembered boards are a null-prototype map', Object.getPrototypeOf(z.last) === null);
  const lastAll = R.ranksStep(R.ranksStep(R.ranksStep(R.ranksStart(FULL, 'bow'), { type: 'board', board: 'mining' }, FULL), { type: 'board', board: 'ap' }, FULL), { type: 'board', board: 'pts_hp' }, FULL);
  check('3v each tab remembers its own board', ['power', 'stats', 'records', 'skills'].every((t) => lastAll.last[t] === { power: 'bow', stats: 'pts_hp', records: 'ap', skills: 'mining' }[t]) && Object.keys(lastAll.last).length === 4, { ...lastAll.last });
}

/* ── 4. the medals ── */
check('4 medalOf: gold, silver, bronze, then none',
  R.medalOf(1) === 'gold' && R.medalOf(2) === 'silver' && R.medalOf(3) === 'bronze' && R.medalOf(4) === null && R.medalOf(0) === null
  && R.medalOf(-1) === null && R.medalOf('1') === null && R.medalOf(undefined) === null && R.medalOf(1.5) === null);

/* ── 5. your row ── */
{
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'me', name: 'Me', lv: 9 }, null, { id: 'c' }];
  const y = R.youRow(rows, 'me');
  check('5a your place and your row', y.rank === 3 && y.row === rows[2], y);
  check('5b off the board: rank 0, no row', same(R.youRow(rows, 'zz'), { rank: 0, row: null }));
  check('5c no id, no rows, not a list: off the board', same(R.youRow(rows, ''), { rank: 0, row: null }) && same(R.youRow(rows, null), { rank: 0, row: null })
    && same(R.youRow(null, 'me'), { rank: 0, row: null }) && same(R.youRow('me', 'me'), { rank: 0, row: null }) && same(R.youRow([], 'me'), { rank: 0, row: null }));
  const p = R.youRow([{ pid: 'x' }, { pid: 'me' }], 'me', 'pid');
  check('5d the records\' rows by `pid`', p.rank === 2 && p.row.pid === 'me' && R.youRow([{ pid: 'me' }], 'me').rank === 0, p);
  check('5e2 an id that is not a string is no one', R.youRow([{ id: 5 }], 5).rank === 0);
  check('5e first match wins', R.youRow([{ id: 'me', n: 1 }, { id: 'me', n: 2 }], 'me').row.n === 1);
  check('5f rankMark: "#25", and "#—" off the board', R.rankMark(25) === '#25' && R.rankMark(1) === '#1' && R.rankMark(0) === '#—'
    && R.rankMark(-3) === '#—' && R.rankMark(undefined) === '#—' && R.rankMark(2.7) === '#2');
}

/* ── 7. what fits: the band keeps its height ── */
{
  const room = (f, h) => h - (6 + f.tabH + f.pickH + f.headH + f.youH + f.gap * (f.oneRow ? 1 : 4));
  const up = R.ranksFit(191);
  check('7a an upright phone\'s band (191 px): the tight sizes, each part on its own line, three rows in sight',
    up.tight && !up.oneRow && up.tabH === 28 && up.pickH === 24 && up.headH === 18 && up.youH === 28 && up.gap === 2
    && up.rowH === 24 && room(up, 191) >= 3 * (up.rowH + up.gap) && room(up, 191) < 4 * (up.rowH + up.gap) && Object.isFrozen(up), up);
  const u375 = R.ranksFit(187);
  check('7b a 375 x 667 phone\'s (187 px): three rows still', u375.rowH === 23 && room(u375, 187) >= 3 * (u375.rowH + u375.gap), u375);
  const small = R.ranksFit(160);
  check('7c a smaller band: the rows never under 22 px', small.rowH === 22 && small.tight && !small.oneRow, small);
  const side = R.ranksFit(82);
  check('7d a phone on its side (82 px): one line at the top for the tabs, the picker and your row, no heads, two rows in sight',
    side.oneRow && side.tight && side.pickH === 0 && side.headH === 0 && side.youH === 0 && side.tabH === 26
    && side.rowH === 22 && room(side, 82) >= 2 * (side.rowH + side.gap), side);
  check('7e on its side the rows never under 20 px', R.ranksFit(60).rowH === 20 && R.ranksFit(60).oneRow);
  const mid = R.ranksFit(250);
  check('7f a band with room to spare: the rows at their full 32 px, never more', mid.tight && mid.rowH === 32, mid);
  const tall = R.ranksFit(400);
  check('7g a tall band (a computer): the roomy sizes', !tall.tight && !tall.oneRow && tall.tabH === 36 && tall.pickH === 30 && tall.headH === 22 && tall.youH === 40 && tall.gap === 3 && tall.rowH === 32 && Object.isFrozen(tall), tall);
  check('7h not measured yet, or nonsense: the roomy sizes', !R.ranksFit(0).tight && !R.ranksFit(undefined).tight && !R.ranksFit('x').tight && !R.ranksFit(-5).tight && R.ranksFit(0).rowH === 32 && !R.ranksFit(0).oneRow && !R.ranksFit(-5).oneRow);
  check('7i the edges: 299 tight, 300 roomy; 149 one line, 150 two', R.ranksFit(299).tight && !R.ranksFit(300).tight && R.ranksFit(149).oneRow && !R.ranksFit(150).oneRow);
  const f200 = R.ranksFit(200.9);
  check('7j a fractional height counts whole pixels', f200.rowH === R.ranksFit(200).rowH && f200.rowH === Math.min(32, Math.floor(room(f200, 200) / 3) - 2), f200);
  check('7k the sizes carry no working fields', JSON.stringify(Object.keys(up).sort()) === JSON.stringify(['gap', 'headH', 'oneRow', 'pickH', 'rowH', 'tabH', 'tight', 'youH']));
}

/* ── 6. the page calls the rules (read from the source) ── */
{
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../../src/ui/mobile/dash/RanksPage.jsx', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../../src/ui/mobile/dash/LeaderboardPanel.jsx', import.meta.url), 'utf8');
  check('6a the page steps one state with the one transition, and keeps no second tab or board field',
    /useState\(\(\) => ranksStart\(/.test(page) && /ranksStep\(s, ev, ids\)/.test(page) && !/useState\([^)]*tab/i.test(page.replace(/ranksStart\(ids, want\)/, '')));
  check('6b the panel opens the page unless ?rankstyle=0', /if \(!sw\('rankstyle'\)\) return <RanksPage /.test(panel));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
