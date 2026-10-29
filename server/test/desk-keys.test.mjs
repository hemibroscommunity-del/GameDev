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
 * v2.3.3711 (the owner's layout: "Do your recommended keyboard layout"):
 *   7. the layout itself -- Q the special, F the burst (G still), the right
 *      button held the shield, a click with it up the bash, the wheel the swap,
 *      and Q, F and the right button no longer what they were;
 *   8. the combos' rules (game/deskCombos.js), run in node: a direction key
 *      tapped twice within 250 ms rolls that way, and the wheel's deltas add
 *      up to one weapon a notch;
 *   9. the weapon cycle backwards (weaponSlots.js prevWeaponSlot).
 */
import { readFileSync } from 'node:fs';
import { DESK_KEY_ROWS, DESK_KEY_GROUPS, deskKeyRows, deskKeyGroups, deskKeyStamp } from '../../src/game/deskKeyList.js';
import { DBL_TAP_MS, tapDir, dblTapRoll, wheelStep, WHEEL_STEP_PX, WHEEL_GAP_MS, WHEEL_IDLE_MS } from '../../src/game/deskCombos.js';
import { nextWeaponSlot, prevWeaponSlot } from '../../src/game/weaponSlots.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');

const NEEDS = ['sprint', 'shield', 'bash', 'whirl', 'burst', 'trap', 'food', 'ride'];   /* v2.3.3776: + Z, the skateboard */
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
/* v2.3.3711: the shield is the right button held, the bash a click with it up */
check('2d R-Click (Shield) only with a shield, +Click (Bash) only with the bash', !deskKeyRows({ bash: true }).some((r) => r[0] === 'R-Click')
  && deskKeyRows({ shield: true }).some((r) => r[0] === 'R-Click' && r[1] === 'Shield \u2195') && !deskKeyRows({ shield: true }).some((r) => r[0] === '+Click')
  && deskKeyRows({ bash: true }).some((r) => r[0] === '+Click' && r[1] === 'Bash'));
check('2e a requirement must be true, not just there', !deskKeyRows({ whirl: 1, shield: 'yes' }).some((r) => r[0] === 'R' || r[0] === 'R-Click'));

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
  if (/^[123]$/.test(k)) return new RegExp(`e\\.code === 'Digit${k}'`).test(ctl);   /* v2.3.3847: a row a number (was '1-3') */
  /* v2.3.3711: the mouse's moves, and the combos */
  if (k === 'Click') return /onMouseDown/.test(bro);
  if (k === 'R-Click') return /e\.button === 2/.test(bro) && /_deskRightPress\(/.test(bro);
  if (k === '+Click') return /S\._shieldUp && _deskBashPress\(S\)/.test(bro);
  if (k === '2\u00d7Click') return /onDoubleClick:/.test(bro);
  if (k === 'Wheel') return /onWheel:/.test(bro) && /wheelStep\(/.test(bro);
  if (k === '2\u00d7WASD') return /dblTapRoll\(/.test(ctl);
  if (/^[A-Z]$/.test(k)) return new RegExp(`e\\.code === 'Key${k}'`).test(ctl) || navLetters.includes(k) || (k === mapKey && /'Key' \+ MAP_KEY/.test(ctl));
  return false;
};
const dead = DESK_KEY_ROWS.map((r) => r[0]).filter((k) => !bound(k));
check('6a every key the list names is one the game binds', dead.length === 0, dead);

/* ── 7. v2.3.3711: the owner's layout ── */
const words = (k) => (DESK_KEY_ROWS.find((r) => r[0] === k) || [])[1];
check('7a Q is the special, F the burst, the right button the shield, +Click the bash, the wheel a swap',
  words('Q') === 'Special' && words('F') === 'Burst' && words('R-Click') === 'Shield \u2195' && words('+Click') === 'Bash' && words('Wheel') === 'Swap',
  ['Q', 'F', 'R-Click', '+Click', 'Wheel'].map((k) => [k, words(k)]));
check('7b ...no row says G or Q+E any more', !DESK_KEY_ROWS.some((r) => r[0] === 'G' || r[0] === 'Q+E'));
check('7c ...the combos listed: a direction tapped twice dodges, a double click locks on',
  words('2\u00d7WASD') === 'Dodge' && words('2\u00d7Click') === 'Lock on');
check('7d +Click sits right under R-Click (the pair reads as the combo)',
  DESK_KEY_ROWS.findIndex((r) => r[0] === '+Click') === DESK_KEY_ROWS.findIndex((r) => r[0] === 'R-Click') + 1);
/* the keys themselves, in desktopControls.js: Q fires the special and raises
   no shield; F and G both fire the burst; Q's release lowers nothing */
const qBlock = (/if \(e\.code === 'KeyQ' && !e\.repeat\) \{([\s\S]*?)\n {6}\}/.exec(ctl) || [])[1] || '';
check('7e Q fires the special, and raises no shield', /_desktopSpecialAttack\(\)/.test(qBlock) && !/_desktopShieldOn|_shieldKb = true/.test(qBlock), qBlock.slice(0, 300));
check('7f F and G both fire the Element Burst', /e\.code === 'KeyF' \|\| e\.code === 'KeyG'\) && !e\.repeat\) \{\s*e\.preventDefault\(\);\s*_desktopElementBurst\(\)/.test(ctl));
check('7g F no longer fires the special', !/e\.code === 'KeyF' && !e\.repeat\) \{[\s\S]{0,120}_desktopSpecialAttack/.test(ctl));
/* v2.3.3847: the right button is a toggle -- its release lowers nothing; a blur still does */
check('7h the right button\'s release lowers nothing (a toggle); a blur lowers the guard',
  !/addEventListener\('mouseup', onMouseUp\)/.test(ctl) && /onBlur[\s\S]{0,600}_shieldMouse = false; _desktopShieldOff\(\)/.test(ctl));
check('7i no browser menu over the game on a computer (text fields and links keep theirs)',
  /addEventListener\('contextmenu', onContextMenu\)/.test(ctl) && /input, textarea/.test(ctl) && /onContextMenu: function onContextMenu\(e\) \{[\s\S]{0,900}?e\.preventDefault\(\);\s*\}/.test(bro));
check('7j with no shield on the arm the right button keeps its old use, the special',
  /if \(S\.rpg\.shield\) \{[\s\S]{0,400}return 'shield';\s*\}[\s\S]{0,200}doSpecialAttack\(\);\s*return 'special';/.test(bro));
check('7k the item card names the right button, not Q', /Hold right-click to block/.test(src('src/ui/mobile/dash/ItemDetailPopup.jsx'))
  && !/Hold Q to block/.test(src('src/ui/mobile/dash/ItemDetailPopup.jsx')));
check('7l the Element Burst button wears F', /data-key="F"/.test(src('src/ui/mobile/ElementBurstButton.jsx')));

/* ── 8. the combos' rules ── */
check('8a W A S D and the arrows walk; any other key does not', ['w', 'A', 's', 'D', 'ArrowUp', 'ArrowLeft'].every((k) => !!tapDir(k))
  && !tapDir('q') && !tapDir('Space') && !tapDir(null) && !tapDir('__proto__') && !tapDir('constructor'));
const roll = (presses, held) => {
  const mem = { key: null, at: 0 };
  let out = null;
  for (const [k, t] of presses) out = dblTapRoll(mem, k, t, held);
  return { out, mem };
};
const near0 = (a, b) => a !== null && Math.abs(a - b) < 1e-9;
check('8b D twice within 250 ms rolls right; A left; W up; S down',
  near0(roll([['d', 1000], ['d', 1200]]).out, 0) && near0(roll([['a', 0], ['a', 100]]).out, Math.PI)
  && near0(roll([['w', 0], ['w', 100]]).out, -Math.PI / 2) && near0(roll([['s', 0], ['s', 100]]).out, Math.PI / 2));
check('8c ...at exactly 250 ms still a roll, at 251 not', DBL_TAP_MS === 250 && roll([['d', 0], ['d', 250]]).out !== null && roll([['d', 0], ['d', 251]]).out === null);
check('8d one press alone, or two different keys, never roll', roll([['d', 0]]).out === null && roll([['d', 0], ['a', 100]]).out === null
  && roll([['d', 0], ['w', 100]]).out === null);
check('8e W held, D tapped twice: up and right, as Space there', near0(roll([['d', 0], ['d', 100]], { up: true, right: true }).out, Math.atan2(-1, 1)));
check('8f both ways held on the other axis: none of it', near0(roll([['d', 0], ['d', 100]], { up: true, down: true }).out, 0));
const r3 = roll([['d', 0], ['d', 100], ['d', 200]]);
check('8g a roll forgets the pair: a third quick tap starts the next pair, no second roll', r3.out === null && r3.mem.key === 'd');
check('8h a key that walks nowhere leaves the memory alone', (() => { const m = { key: 'd', at: 5 }; return dblTapRoll(m, 'q', 10, {}) === null && m.key === 'd' && m.at === 5; })());
check('8i a capital (Shift held) pairs with its small letter', near0(roll([['d', 0], ['D', 100]]).out, 0));
/* the wheel */
const wheel = (events) => { const mem = { acc: 0 }; return events.map(([dy, mode, t]) => wheelStep(mem, dy, mode, t)); };
check('8j a mouse\'s notch (100 px) is one step: down the next, up the one before', wheel([[100, 0, 0]])[0] === 1 && wheel([[-100, 0, 0]])[0] === -1);
check('8k a line-mode notch (3 lines) is one step too', wheel([[3, 1, 0]])[0] === 1);
const flick = wheel(Array.from({ length: 30 }, (_, i) => [6, 0, i * 12]));
check('8l a trackpad\'s flick of thirty 6 px deltas over 360 ms is ONE step', flick.filter((s) => s !== 0).length === 1, flick.join(''));
check('8m two notches 500 ms apart are two steps', wheel([[100, 0, 0], [100, 0, 500]]).join() === '1,1');
check('8n a notch inside the gap after a step is let go', wheel([[100, 0, 0], [100, 0, WHEEL_GAP_MS - 20]]).join() === '1,0');
check('8o small deltas under a step add up; a pause starts the count again',
  WHEEL_STEP_PX === 50 && wheel([[30, 0, 0], [30, 0, 50]]).join() === '0,1' && wheel([[30, 0, 0], [30, 0, WHEEL_IDLE_MS + 50]]).join() === '0,0');
check('8p a zero, a NaN or a missing memory is no step', wheel([[0, 0, 0], [NaN, 0, 10]]).join() === '0,0' && wheelStep(null, 100, 0, 0) === 0);

/* ── 9. the cycle backwards ── */
const kit = { weapon: { type: 'sword' }, rangedWeapon: { type: 'bow' }, staffWeapon: { type: 'staff' } };
check('9a with all three: next melee -> ranged, the one before melee -> staff',
  nextWeaponSlot({ ...kit, activeSlot: 'melee' }) === 'ranged' && prevWeaponSlot({ ...kit, activeSlot: 'melee' }) === 'staff'
  && prevWeaponSlot({ ...kit, activeSlot: 'ranged' }) === 'melee', [prevWeaponSlot({ ...kit, activeSlot: 'melee' })]);
check('9b ...one weapon: nowhere to go, both ways', prevWeaponSlot({ weapon: { type: 'sword' }, activeSlot: 'melee' }) === 'melee');

/* ── 10. v2.3.3844: Space jumps, X rolls (the owner: "spacebar I think should be jump") ── */
const spaceBlock = (/if \(e\.code === 'Space'\) \{([\s\S]*?)\n {6}\}/.exec(ctl) || [])[1] || '';
const xBlock = (/if \(e\.code === 'KeyX'\) \{([\s\S]*?)\n {6}\}/.exec(ctl) || [])[1] || '';
check('10a the list says Space Jump and X Dodge', words('Space') === 'Jump' && words('X') === 'Dodge', [words('Space'), words('X')]);
check('10b Space jumps once a press (a repeat jumps nothing), and rolls nothing; its default refused (no scroll)',
  /e\.preventDefault\(\);\s*if \(!e\.repeat\) triggerJump\(S\);/.test(spaceBlock) && !/triggerContextualDodge/.test(spaceBlock), spaceBlock.slice(0, 200));
check('10c X rolls (the contextual dodge) and jumps nothing', /triggerContextualDodge\(S, _R1, ang\)/.test(xBlock) && !/triggerJump/.test(xBlock), xBlock.slice(0, 200));
check('10d Space\'s release presses no focused button (its keyup refused, outside a field)',
  /onKeyUp = function onKeyUp\(e\) \{[\s\S]{0,700}e\.code === 'Space'[\s\S]{0,300}e\.preventDefault\(\)/.test(ctl));
check('10e Space and X come before the 2\u00d7WASD row; the double tap still rolls', DESK_KEY_ROWS.findIndex((r) => r[0] === 'X') === DESK_KEY_ROWS.findIndex((r) => r[0] === 'Space') + 1
  && /dblTapRoll\(/.test(ctl));
/* ── 11. v2.3.3847: the right button toggles the guard; with nothing near it follows the pointer ── */
const { deskPointerAngle, shieldFollowsPointerAlways } = await import('../../src/game/deskShield.js');
const S10 = { player: { x: 1000, y: 1000 }, camera: { x: 800, y: 900 }, _worldScaleX: 0.8, _worldScaleY: 0.8, _mouseScreen: { x: 320, y: 80 } };
/* the pointer at world (800 + 320/0.8, 900 + 80/0.8) = (1200, 1000): straight right of the bro */
check('11a the pointer\'s angle comes from where it is on the screen and the camera now', near0(deskPointerAngle(S10), 0), deskPointerAngle(S10));
S10.camera = { x: 1000, y: 900 };   /* walked right 200 with the mouse still: the pointer is now at (1400, 1000)... */
S10.player = { x: 1200, y: 1000 };
check('11b ...so walking with the mouse still keeps the guard on the pointer', near0(deskPointerAngle(S10), 0), deskPointerAngle(S10));
S10._mouseScreen = { x: 160, y: 80 };   /* the pointer on the bro */
check('11c ...no angle with the pointer on the bro, or no pointer yet', deskPointerAngle(S10) === null && deskPointerAngle({ player: { x: 0, y: 0 }, camera: { x: 0, y: 0 } }) === null);
check('11d ?shieldaim=mouse: the pointer always; anything else the default',
  shieldFollowsPointerAlways('?shieldaim=mouse') && shieldFollowsPointerAlways('?a=1&shieldaim=mouse') && !shieldFollowsPointerAlways('?shieldaim=mousey')
  && !shieldFollowsPointerAlways('') && !shieldFollowsPointerAlways(null));
check('11e a right press with the guard up lowers it (the toggle); dropShield clears the toggle so the next press raises it',
  /if \(S\.rpg\.shield && S\._shieldUp\) \{\s*S\._shieldMouse = false;\s*_desktopShieldOff\(\);\s*return 'shield-down';/.test(bro)
  && /S\._shieldMouse = false;/.test(src('src/game/shieldToggle.js')));
check('11g the numbers say their weapons: 1 Melee, 2 Bow, 3 Staff, always listed, no 1-3 row',
  words('1') === 'Melee' && words('2') === 'Bow' && words('3') === 'Staff' && !DESK_KEY_ROWS.some((r) => r[0] === '1-3')
  && ['1', '2', '3'].every((k) => deskKeyRows({}).some((r) => r[0] === k)));
check('11f the toggled guard faces what is near (shieldTargetAngle), else the live pointer',
  /var _sta = S\._shieldAimMouse \? null : shieldTargetAngle\(S\);\s*var _spa = deskPointerAngle\(S\);/.test(bro));

console.log(`\ndesk-keys: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
