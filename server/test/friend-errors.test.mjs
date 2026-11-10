/* A refused friend request says why -- v2.3.4392 (the state-machine sweep,
 * 2026-11-03: V12 M3-6; reviews R1, R2 W1.2 and R3 2b).
 *
 *   The worker answers a refused request (or a message to someone who is no
 *   longer a friend) with `friend_error` {reason, target}, and the phone
 *   stored it where nothing read it: the tap did nothing.  Now gameEvents.js
 *   shows src/game/friendErrors.js's words as a toast.
 *
 *   1. every reason friends.js sends has its own words (a new reason with no
 *      words fails here), naming the player where the worker names one;
 *   2. the phone's friend_error case pushes those words to the toast bus,
 *      through deskWords, and friend_error stays PRIVILEGED;
 *   3. a burst of the same reason (the old-list move sends many requests at
 *      once) is one toast, and a different reason still shows;
 *   4. the real GameRoom: 25 unanswered requests, then a 26th, answers
 *      `too-many-requests` -- the reason the words in 1 are for.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

const { FRIEND_ERROR_WORDS, friendErrorText, friendErrorFresh, FRIEND_ERROR_QUIET_MS } = await import('../../src/game/friendErrors.js');

/* ── 1. every reason the worker sends has words ── */
{
  const friendsJs = src('server/src/friends.js');
  const reasons = [...new Set([...friendsJs.matchAll(/'friend_error',\s*\{\s*reason:\s*'([a-z-]+)'/g)].map((m) => m[1]))];
  check('1a friends.js sends the five reasons the sweep listed',
    ['already-friends', 'too-many-requests', 'target-full', 'not-friends', 'not-found'].every((r) => reasons.includes(r)), reasons);
  const missing = reasons.filter((r) => !Object.prototype.hasOwnProperty.call(FRIEND_ERROR_WORDS, r));
  check('1b each reason friends.js sends has its own words', missing.length === 0, missing);
  const nameOf = (id) => (id === 'bp_ann' ? 'Ann' : undefined);
  const full = friendErrorText({ reason: 'target-full', target: 'bp_ann' }, nameOf);
  check('1c a reason with a target names the player', full.includes('Ann') && /full/.test(full), full);
  const already = friendErrorText({ reason: 'already-friends', target: 'bp_gone' }, nameOf);
  check('1d a player not in the room reads "That player"', already.startsWith('You and That player'), already);
  const many = friendErrorText({ reason: 'too-many-requests' });
  check('1e too-many-requests says the requests are waiting for an answer', /waiting for an answer/.test(many), many);
  check('1f an unknown reason still says something', /did not go through/.test(friendErrorText({ reason: 'zzz' })) && /did not go through/.test(friendErrorText(null)));
  check('1g "__proto__" as a reason is the fallback, not a crash', /did not go through/.test(friendErrorText({ reason: '__proto__' })));
  const long = friendErrorText({ reason: 'target-full', target: 'x' }, () => 'N'.repeat(80));
  check('1h a name is clamped', !long.includes('N'.repeat(25)), long.length);
  const all = Object.keys(FRIEND_ERROR_WORDS).map((r) => friendErrorText({ reason: r, target: 'bp_ann' }, nameOf)).join(' ');
  check('1i the words are ASCII and never say "tap" (deskWords would have to swap it)', /^[\x20-\x7e]*$/.test(all) && !/\btap/i.test(all), all);
}

/* ── 2. the phone shows them ── */
{
  const ge = src('src/networking/gameEvents.js');
  const m = ge.match(/case 'friend_error':([\s\S]*?)break;\s*\}/);
  const body = m ? m[1] : '';
  check('2a the friend_error case still stores the error', /friendsSrv\.setError\(/.test(body), body.slice(0, 200));
  check('2b ...and pushes the words to the toast bus through deskWords',
    /storeToastBus\.push\(\s*deskWords\(\s*friendErrorText\(/.test(body) && /friendErrorFresh\(/.test(body), body.slice(0, 400));
  check('2c the words module is imported', /from '@\/game\/friendErrors\.js'/.test(ge) && /import \{ deskWords \} from '@\/game\/deskWords\.js'/.test(ge));
  const { PRIVILEGED_EVENTS } = await import('../src/index.js');
  check('2d friend_error is PRIVILEGED (a phone cannot forge one)', PRIVILEGED_EVENTS.has('friend_error'));
}

/* ── 3. a burst is one toast ── */
{
  const t0 = 1e12;
  check('3a the first refusal shows', friendErrorFresh({ reason: 'not-found' }, t0));
  check('3b the same reason again at once does not', !friendErrorFresh({ reason: 'not-found' }, t0 + 100));
  check('3c a different reason still shows', friendErrorFresh({ reason: 'already-friends' }, t0 + 200));
  check('3d the same reason after the quiet window shows again', friendErrorFresh({ reason: 'not-found' }, t0 + FRIEND_ERROR_QUIET_MS + 1));
}

/* ── 4. the real GameRoom answers the 26th request with too-many-requests ── */
{
  const { GameRoom } = await import('../src/index.js');
  const { FRIENDS } = await import('../src/friends.js');
  const store = new Map();
  const state = {
    storage: {
      async get(k) { if (Array.isArray(k)) { const m = new Map(); for (const x of k) if (store.has(x)) m.set(x, store.get(x)); return m; } return store.get(k); },
      async put(k, v) { if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) store.set(a, b); } else store.set(k, v); },
      async delete(k) { return store.delete(k); },
      async list() { return new Map(); },
      async getAlarm() { return null; }, async setAlarm() {}, async deleteAlarm() {},
      async transaction(fn) { return fn(this); },
    },
    blockConcurrencyWhile: async (fn) => fn(),
    getWebSockets: () => [],
    acceptWebSocket() {},
    id: { toString: () => 'test' },
  };
  const room = new GameRoom(state, {});
  const sent = [];
  room._wsBySessionId = (pid) => (pid === 'bp_me' ? { send: (s) => sent.push(JSON.parse(s)) } : null);
  room.playerState = Object.create(null);
  room.sessions = new Map();
  for (let i = 0; i < FRIENDS.REQ_OUT_MAX + 1; i++) store.set('rpg:bp_t' + i, { lv: 1 });
  for (let i = 0; i < FRIENDS.REQ_OUT_MAX; i++) await room._handleFriendRequest({ id: 'bp_me' }, { target: 'bp_t' + i, name: 'T' });
  const before = sent.filter((m) => m.type === 'friend_error').length;
  await room._handleFriendRequest({ id: 'bp_me' }, { target: 'bp_t' + FRIENDS.REQ_OUT_MAX, name: 'T' });
  const errs = sent.filter((m) => m.type === 'friend_error');
  check('4a 25 unanswered requests go through without a refusal', before === 0, before);
  check('4b the 26th answers too-many-requests, which now has words',
    errs.length === 1 && errs[0].payload.reason === 'too-many-requests' && /waiting for an answer/.test(friendErrorText(errs[0].payload)), errs);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
