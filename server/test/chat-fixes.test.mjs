/* The chat's three fixes -- v2.3.3345 (docs/FUN-SOCIAL-PLAN.md, Phase 0;
 * docs/specs/emotes.md "The chat's three fixes").
 *
 * Found by the fun & social plan's check of the code:
 *   1. THE BLOCK LIST is written in two shapes (plain ids; {id, name} from the
 *      dashboard's friends list) and was read in one: a block made from the
 *      friends list hid nothing.  src/game/chatMute.js reads both now.
 *   2. A NAME could wear a lane's mark ("✉ Mayor"), and the chat feed reads
 *      the lane off the front of the name: every room line of theirs looked
 *      like a whisper.  The worker (index.js stripChatLaneMarks) and the phone
 *      (src/data/smallIcons.js stripLaneMarks) both take the marks off -- the
 *      same answer for the same name, held here.
 *   3. THE COLOUR was any string ("transparent": an invisible name).  The
 *      worker relays a hex or nothing (anticheat.test.mjs holds the relay);
 *      the phone draws a hex that reads (src/game/chatColor.js), every preset
 *      unchanged.
 */
import { stripChatLaneMarks } from '../src/index.js';
import { stripLaneMarks, chatLaneOf } from '../../src/data/smallIcons.js';
import { chatNameColor, feedContrast, NAME_CONTRAST_MIN, CHAT_NAME_DEFAULT } from '../../src/game/chatColor.js';
import { PLAYER_COLORS } from '../../src/data/constants.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

/* ── 1. both shapes of the block list ── */
{
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
  const { blockedIdOf, readBlockedIds, isBlockedId } = await import('../../src/game/chatMute.js');
  store.set('bt_blocked', JSON.stringify(['bp_plain', { id: 'bp_obj', name: 'Obj' }, null, 7, { name: 'no id' }, '']));
  check('1a a plain id and a friends-list entry are both read', JSON.stringify(readBlockedIds()) === JSON.stringify(['bp_plain', 'bp_obj']), readBlockedIds());
  check('1b isBlockedId: the friends list\'s {id, name} counts (it hid nothing before)', isBlockedId('bp_obj') === true && isBlockedId('bp_plain') === true);
  check('1c ...and nobody else is blocked', isBlockedId('bp_other') === false && isBlockedId('') === false && isBlockedId(undefined) === false);
  check('1d blockedIdOf: each shape to its id, junk to nothing',
    blockedIdOf('a') === 'a' && blockedIdOf({ id: 'b', name: 'B' }) === 'b' && blockedIdOf({}) === '' && blockedIdOf(null) === '' && blockedIdOf(3) === '');
  store.set('bt_blocked', '{not json');
  check('1e a broken list reads as nobody blocked (never throws)', readBlockedIds().length === 0 && isBlockedId('bp_plain') === false);
  store.set('bt_blocked', JSON.stringify({ id: 'bp_x' }));
  check('1f a list that is not a list reads as nobody blocked', readBlockedIds().length === 0);
  delete globalThis.localStorage;
}

/* ── 2. a name cannot wear a lane's mark ── */
{
  const names = ['✉ Mayor', '✉️ Mayor', '📍 Bob', '🛡️🛡 Jo', '📍📍📍', '✉', 'Normal', '  spaced', 'Bob ✉', '🙂 Smile', '', '✉️', 'M📍'];
  const diff = names.filter((n) => stripChatLaneMarks(n) !== stripLaneMarks(n));
  check('2a the worker and the phone take the same marks off the same names', diff.length === 0, diff.map((n) => [n, stripChatLaneMarks(n), stripLaneMarks(n)]));
  check('2b "✉ Mayor" is "Mayor", and no lane is read off it', stripLaneMarks('✉ Mayor') === 'Mayor' && chatLaneOf(stripLaneMarks('✉ Mayor')) === null);
  check('2c every mark at the front goes, with its variation selector', stripLaneMarks('🛡️🛡 Jo') === 'Jo' && stripLaneMarks('✉️ Mayor') === 'Mayor');
  check('2d a mark later in a name, or another emoji at the front, stays', stripLaneMarks('Bob ✉') === 'Bob ✉' && stripLaneMarks('🙂 Smile') === '🙂 Smile' && stripLaneMarks('M📍') === 'M📍');
  check('2e a lane\'s own line still reads as its lane (the phone adds the mark after)', chatLaneOf('🛡 ' + stripLaneMarks('📍 Bob')).lane === 'party');
  check('2f not a string: empty', stripLaneMarks(null) === '' && stripChatLaneMarks(42) === '');
}

/* ── 3. a name's colour you can read ── */
{
  const changed = PLAYER_COLORS.filter((c) => chatNameColor(c) !== c.toLowerCase());
  check('3a every one of the 16 presets is drawn unchanged', changed.length === 0, changed);
  for (const bad of ['transparent', 'rgba(0,0,0,0)', 'red', '#12', '#1234567', 'url(x)', null, undefined, 7, '']) {
    check('3b not a hex (' + JSON.stringify(bad) + '): the feed\'s own colour', chatNameColor(bad) === CHAT_NAME_DEFAULT, chatNameColor(bad));
  }
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (const dark of ['#000000', '#111', '#2a2a6b', '#0d161b', '#202020']) {
    const out = chatNameColor(dark);
    check('3c too dark (' + dark + '): lifted to ' + out + ', which reads (3:1)', /^#[0-9a-f]{6}$/.test(out) && feedContrast(...rgb(out)) >= NAME_CONTRAST_MIN, out);
  }
  check('3d #rgb is read as #rrggbb', chatNameColor('#FFF') === '#ffffff');
}

console.log(`\nchat-fixes: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
