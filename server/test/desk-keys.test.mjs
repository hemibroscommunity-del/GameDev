/* ═══ v2.3.3687: THE COMPUTER'S CONTROLS, AS THEY ARE RIGHT NOW ═══
 *
 * The owner, 2026-10-28: "Keyboard instructions need to be dynamic since
 * "whirl" doesn't work if you don't have your sword equipped", and "find a good
 * place to keep a list of all the controls".  src/game/deskKeyList.js is the
 * list the controls' column draws (KeyboardHintsPanel.jsx, at the screen's far
 * edge on a computer playing wide): a key with a requirement only while it is
 * met, in four groups.  This suite holds the table to the game:
 *   1. every row is in a known group, the groups in their order, and every
 *      requirement is one the column works out (KeyboardHintsPanel deskKeyHave);
 *   2. a row with a requirement is listed only while it is met, the rest always;
 *   3. the groups leave an empty one out and keep their order;
 *   4. the stamp the column re-renders on changes exactly when a requirement
 *      flips;
 *   5. the menus' letters are deskKeys.js's NAV_KEYS and MAP_KEY, so a letter
 *      the buttons wear and the list cannot disagree;
 *   6. every key the list names is one the game binds (desktopControls.js, and
 *      BroTown's walk and sprint), so the list never teaches a dead key.
 */
import { readFileSync } from 'node:fs';
import { DESK_KEY_ROWS, DESK_KEY_GROUPS, deskKeyRows, deskKeyGroups, deskKeyStamp } from '../../src/game/deskKeyList.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');

const NEEDS = ['sprint', 'shield', 'bash', 'whirl', 'burst', 'trap', 'food'];
const GROUP_IDS = DESK_KEY_GROUPS.map((g) => g[0]);

/* ── 1. the table ── */
check('1a four groups, in order: move, fight, other, menus', GROUP_IDS.join() === 'move,fight,other,menus', GROUP_IDS);
check('1b every row names a known group', DESK_KEY_ROWS.every((r) => GROUP_IDS.includes(r[3])), DESK_KEY_ROWS.filter((r) => !GROUP_IDS.includes(r[3])));
check('1c ...and the rows run group by group, in the groups\' order',
  DESK_KEY_ROWS.map((r) => GROUP_IDS.indexOf(r[3])).every((g, i, a) => i === 0 || g >= a[i - 1]));
check('1d every requirement is one the column works out', DESK_KEY_ROWS.every((r) => r[2] === null || NEEDS.includes(r[2])),
  DESK_KEY_ROWS.filter((r) => r[2] !== null && !NEEDS.includes(r[2])));
const hint = src('src/ui/panels/KeyboardHintsPanel.jsx');
check('1e ...each of them read by deskKeyHave', NEEDS.every((k) => new RegExp('\\b' + k + ':\\s').test(hint)), NEEDS.filter((k) => !new RegExp('\\b' + k + ':\\s').test(hint)));
check('1f no key twice', new Set(DESK_KEY_ROWS.map((r) => r[0])).size === DESK_KEY_ROWS.length);

/* ── 2. only while it works ── */
const none = deskKeyRows({});
const all = deskKeyRows(Object.fromEntries(NEEDS.map((k) => [k, true])));
check('2a with nothing met, no row with a requirement', none.every((r) => r[2] === null) && none.length === DESK_KEY_ROWS.filter((r) => r[2] === null).length);
check('2b with everything met, every row', all.length === DESK_KEY_ROWS.length);
check('2c the owner\'s case: R (Whirl) only with whirl met', !none.some((r) => r[0] === 'R') && deskKeyRows({ whirl: true }).some((r) => r[0] === 'R' && r[1] === 'Whirl'));
check('2d Q (Shield) only with a shield, Q+E (Bash) only with the bash', !deskKeyRows({ bash: true }).some((r) => r[0] === 'Q')
  && deskKeyRows({ shield: true }).some((r) => r[0] === 'Q') && !deskKeyRows({ shield: true }).some((r) => r[0] === 'Q+E')
  && deskKeyRows({ bash: true }).some((r) => r[0] === 'Q+E'));
check('2e a requirement must be true, not just there', !deskKeyRows({ whirl: 1, shield: 'yes' }).some((r) => r[0] === 'R' || r[0] === 'Q'));

/* ── 3. groups ── */
const g0 = deskKeyGroups({});
check('3a the groups as listed, each its heading and rows', g0.map((g) => g.id).join() === 'move,fight,other,menus'
  && g0.every((g) => g.label && g.rows.length > 0), g0.map((g) => [g.id, g.label, g.rows.length]));
check('3b their rows the listed rows, in order', g0.flatMap((g) => g.rows).map((r) => r[0]).join() === none.map((r) => r[0]).join());

/* ── 4. the stamp ── */
const stamps = new Set();
for (let m = 0; m < (1 << NEEDS.length); m++) {
  const have = Object.fromEntries(NEEDS.map((k, i) => [k, !!(m & (1 << i))]));
  stamps.add(deskKeyStamp(have));
}
check('4a every combination of requirements stamps differently', stamps.size === 1 << NEEDS.length, stamps.size);
check('4b the same requirements stamp the same, whatever else is there', deskKeyStamp({ whirl: true, x: 1 }) === deskKeyStamp({ whirl: true }));

/* ── 5. the menus' letters ── */
const deskKeys = src('src/game/deskKeys.js');
const nav = /NAV_KEYS = Object\.freeze\(\{([^}]*)\}\)/.exec(deskKeys);
const navLetters = nav ? [...nav[1].matchAll(/:\s*'([A-Z])'/g)].map((m) => m[1]) : [];
const mapKey = (/MAP_KEY = '([A-Z])'/.exec(deskKeys) || [])[1];
const menus = DESK_KEY_ROWS.filter((r) => r[3] === 'menus').map((r) => r[0]);
check('5a the menus group is the dashboard\'s six letters and the map\'s, in deskKeys.js\'s order',
  navLetters.length === 6 && !!mapKey && menus.join() === navLetters.concat([mapKey]).join(), { menus, navLetters, mapKey });

/* ── 6. every key the list names is bound ── */
const ctl = src('src/game/desktopControls.js');
const bro = src('src/ui/BroTown.jsx');
const bound = (k) => {
  if (k === 'WASD') return /K\['w'\]/.test(bro) && /S\.keys\['w'\]/.test(ctl);
  if (k === 'Shift') return /K\['Shift'\]/.test(bro);
  if (k === 'Space') return /e\.code === 'Space'/.test(ctl);
  if (k === 'Tab') return /e\.code === 'Tab'/.test(ctl);
  if (k === 'Esc') return /e\.code === 'Escape'/.test(ctl);
  if (k === '1-3') return ['1', '2', '3'].every((d) => new RegExp(`e\\.code === 'Digit${d}'`).test(ctl));
  if (k === 'Q+E') return /e\.code === 'KeyQ'/.test(ctl) && /e\.code === 'KeyE'/.test(ctl);
  if (k === 'Click' || k === 'R-Click') return /onMouseDown|onContextMenu|contextmenu/.test(bro);
  if (/^[A-Z]$/.test(k)) return new RegExp(`e\\.code === 'Key${k}'`).test(ctl) || navLetters.includes(k) || (k === mapKey && /'Key' \+ MAP_KEY/.test(ctl));
  return false;
};
const dead = DESK_KEY_ROWS.map((r) => r[0]).filter((k) => !bound(k));
check('6a every key the list names is one the game binds', dead.length === 0, dead);

console.log(`\ndesk-keys: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
