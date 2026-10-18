/* Chat guardrails -- v2.3.3367 (server/src/chatguard.js, docs/specs/chat-guard.md).
 *
 * The fun & social plan's Phase 1 guardrails, the owner's "Go recommended":
 *
 *   1. the cleaning alone (cleanChatText): stacked accents, every invisible
 *      and direction-changing character, the joiner and the selector an emoji
 *      is made of kept (and taken away where they join or dress nothing), at
 *      most six emoji, a run of one key cut to six (never in a number), spaces,
 *      nothing visible -> nothing; and over thousands of random lines: it only
 *      takes away, cleaning twice is cleaning once, no rule undoes another;
 *   2. every lane is cleaned through its real handler: room chat (and what a
 *      phone in the room is sent in the tick), area chat, a whisper, party
 *      chat, a friend DM and the auction house's thread;
 *   3. the social allowance: a burst of chat stops at five, an emote spends
 *      it too, a swing still goes while it is spent, chat leaves the relay
 *      bucket alone, it refills one every 2 s, and it is per connection;
 *   4. the repeat filter: the same room or area line inside 30 s is said
 *      once -- in another case, with more spaces, with an invisible character
 *      or one more "o" -- and again after 30 s; per lane, per player; a whisper,
 *      party chat, a DM and an emote are never filtered; the memory is small;
 *   5. `chatguard: false`: the room exactly as it was -- chat on the relay
 *      bucket, repeats and garbled text relayed as before -- and back on.
 *
 * Every invisible character here is built from its code (U below), never
 * typed: a reviewer cannot see one.
 */
import { GameRoom } from '../src/index.js';
import { SOCIAL, CHAT_GUARD, cleanChatText, chatRepeatKey } from '../src/chatguard.js';
import { RELAY } from '../src/relay.js';
import { CHAT_RELAY } from '../src/index.js';
import { flagNameOk } from '../src/liveops.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

/* the room's clock: the allowance refills by it and the repeat window is
   measured by it, so the suite moves it by hand */
let NOW = 1_900_000_000_000;
Date.now = () => NOW;

const U = (...cps) => String.fromCodePoint(...cps);
const cpsOf = (s) => [...s].map((c) => c.codePointAt(0).toString(16));
const WAVE = U(0x1F44B);   /* a listed emote (the waving hand), on main and after the emote list */

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => (Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k)),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); return; } store.set(k, v); },
      list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v); return out; },
      delete: async (k) => store.delete(k),
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
const ofType = (ws, t) => ws.sent.filter((m) => m.type === t);
const flush = () => new Promise((r) => setTimeout(r, 0));

/* a room, optionally with its tick in hand (the emotes suite's way: the
   interval it asks for is taken, not started) */
function makeRoom(withTick) {
  const state = makeState();
  const room = new GameRoom(state, mockEnv);
  let tickFn = null;
  if (withTick) {
    const realSetInterval = globalThis.setInterval;
    globalThis.setInterval = (fn, ms) => {
      if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
      return realSetInterval(fn, ms);
    };
    room.startTickLoop();
    globalThis.setInterval = realSetInterval;
  }
  return { room, state, tick: () => tickFn && tickFn() };
}
async function join(room, id, name, z = 'town') {
  const ws = fakeWs(name);
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name, phrase: 'p-' + id, protocolVersion: 2, data: { x: 1000, y: 1000, z } }));
  ws.sent.length = 0;
  return { ws, id, session: () => room.sessions.get(ws) };
}
const send = (room, p, type, payload) => room.webSocketMessage(p.ws, JSON.stringify({ type, payload: payload || {} }));
/* what one message put into the room's relay (the fan-out's source) */
async function relayOf(room, p, type, payload) {
  room.eventBuffer.length = 0;
  await send(room, p, type, payload);
  return room.eventBuffer.filter((e) => e.type === type);
}
const roomChat = async (room, p, text) => (await relayOf(room, p, 'chat', { text })).map((e) => e.payload.text);
/* a full social allowance, the repeat memory kept */
const refill = (room, p) => { room._chatGuardOf(p.session(), Date.now()).tokens = SOCIAL.BURST; };
const freshGuard = (p) => { p.session().chatGuard = null; };

/* ══ 0. the owner's numbers ══ */
check('0. the social allowance: five at once, one every 2 s', SOCIAL.BURST === 5 && SOCIAL.REFILL_MS === 2000);
check('0. ...and it pays for chat and emotes, which are relays', SOCIAL.TYPES.size === 2 && SOCIAL.TYPES.has('chat') && SOCIAL.TYPES.has('emote')
  && [...SOCIAL.TYPES].every((t) => RELAY.TYPES.has(t)));
check('0. repeats: 30 s; marks 2, emoji 6, a run 6 (the plan said 3; 6 keeps "Broooooo")',
  CHAT_GUARD.REPEAT_MS === 30000 && CHAT_GUARD.MARKS_MAX === 2 && CHAT_GUARD.EMOJI_MAX === 6 && CHAT_GUARD.RUN_MAX === 6);
check('0. the kill switch is a name the admin route takes (lower case, TRAPS 117)', flagNameOk('chatguard'));

/* ══ 1. the cleaning, alone ══ */
{
  const c = cleanChatText;
  check('1a an ordinary line is untouched', c('hey, want to party up at the bank?') === 'hey, want to party up at the bank?');
  check('1a ...and so are accents, other scripts and plain emoji',
    c('caf' + U(0xE9) + ' na' + U(0xEF) + 've ' + U(0x0E17, 0x0E35, 0x0E48) + ' ' + U(0x4F60, 0x597D) + ' ' + U(0x1F600))
      === 'caf' + U(0xE9) + ' na' + U(0xEF) + 've ' + U(0x0E17, 0x0E35, 0x0E48) + ' ' + U(0x4F60, 0x597D) + ' ' + U(0x1F600));
  check('1a not a string, or empty: empty', c(undefined) === '' && c(null) === '' && c(42) === '' && c('') === '' && c({}) === '');

  /* stacked accents */
  const Z = (n) => U(...Array.from({ length: n }, (_, i) => 0x0300 + (i % 0x60)));
  check('1b stacked accents: two kept after a letter, the rest gone', c('z' + Z(9) + 'algo') === 'z' + Z(2) + 'algo', cpsOf(c('z' + Z(9) + 'algo')));
  check('1b ...each letter its own two', c('a' + Z(5) + 'b' + Z(5) + 'c') === 'a' + Z(2) + 'b' + Z(2) + 'c');
  check('1b ...two are left alone (a decomposed Vietnamese letter: e, dot below, circumflex)', c('e' + U(0x0323, 0x0302)) === 'e' + U(0x0323, 0x0302));
  check('1b ...a Thai syllable with its vowel and tone mark is left alone', c(U(0x0E17, 0x0E35, 0x0E48)) === U(0x0E17, 0x0E35, 0x0E48));
  check('1b ...a line of nothing but accents is nothing', c(Z(3)) === '' && c(Z(40)) === '');

  /* invisible and direction-changing characters */
  const OWNERS = [0x200B, 0x200C, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E,
    0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x2066, 0x2067, 0x2068, 0x2069, 0xFEFF, 0x00AD, 0x061C, 0x180E];
  const MORE = [0x206A, 0x206B, 0x206C, 0x206D, 0x206E, 0x206F, 0x115F, 0x1160, 0x3164, 0xFFA0, 0x0080, 0x0085, 0x009F];
  for (const cp of OWNERS) {
    check('1c U+' + cp.toString(16).toUpperCase() + ' is taken out', c('a' + U(cp) + 'b' + U(cp, cp) + 'c') === 'abc', cpsOf(c('a' + U(cp) + 'b')));
  }
  check('1c ...and the default-ignorable fillers, the old format controls and the C1 controls',
    MORE.every((cp) => c('a' + U(cp) + 'b') === 'ab'), MORE.filter((cp) => c('a' + U(cp) + 'b') !== 'ab').map((n) => n.toString(16)));
  check('1c a line printed backwards (U+202E) reads the right way round', c('abc' + U(0x202E) + 'def') === 'abcdef');
  check('1c a line of nothing but invisible characters is nothing (no blank bubble)',
    c(U(0x200B, 0x200B, 0x3164, 0xFEFF, 0x2066)) === '' && c(U(0x3164)) === '' && c(U(0x200D, 0x200D)) === '' && c(U(0xFE0F)) === '');
  check('1c half an emoji (a clamp can cut one) is taken out', c('x' + String.fromCharCode(0xD83D)) === 'x' && c(String.fromCharCode(0xDE00) + 'y') === 'y');

  /* the joiner and the selector an emoji is made of */
  const FAMILY = U(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467);
  const HEART = U(0x2764, 0xFE0F);
  const RAINBOW = U(0x1F3F3, 0xFE0F, 0x200D, 0x1F308);
  const WAVE_TONE = U(0x1F44B, 0x1F3FD);
  const KEY6 = U(0x36, 0xFE0F, 0x20E3);
  const FLAG = U(0x1F1FA, 0x1F1F8);
  const SCOT = U(0x1F3F4, 0xE0067, 0xE0062, 0xE0073, 0xE0063, 0xE0074, 0xE007F);
  for (const [name, e] of [['a family (joiners)', FAMILY], ['a red heart (selector)', HEART], ['a rainbow flag (selector + joiner)', RAINBOW],
    ['a skin tone', WAVE_TONE], ['a keycap', KEY6], ['a flag', FLAG], ['a region\'s flag (tag letters)', SCOT]]) {
    check('1d ' + name + ' is kept whole', c('gg ' + e + ' all') === 'gg ' + e + ' all', cpsOf(c('gg ' + e + ' all')));
  }
  check('1d a joiner with nothing to join goes: at an end, beside a space, beside another joiner',
    c(U(0x200D) + 'hi') === 'hi' && c('hi' + U(0x200D)) === 'hi' && c('hi ' + U(0x200D) + ' there') === 'hi there' && c('a' + U(0x200D, 0x200D) + 'b') === 'ab');

  /* at most six emoji */
  const n = (s) => [...s].filter((ch) => /\p{Extended_Pictographic}/u.test(ch)).length;
  check('1e six emoji are kept', c(U(0x1F600, 0x1F389, 0x1F600, 0x1F389, 0x1F600, 0x1F389)) === U(0x1F600, 0x1F389, 0x1F600, 0x1F389, 0x1F600, 0x1F389));
  check('1e ...the seventh and on are dropped', c(U(0x1F600, 0x1F389, 0x1F600, 0x1F389, 0x1F600, 0x1F389, 0x1F600, 0x1F389, 0x1F525)) === U(0x1F600, 0x1F389, 0x1F600, 0x1F389, 0x1F600, 0x1F389));
  const words = 'a' + U(0x1F600) + 'b' + U(0x1F389) + 'c' + U(0x1F600) + 'd' + U(0x1F389) + 'e' + U(0x1F600) + 'f' + U(0x1F389) + 'g' + U(0x1F600) + 'h';
  check('1e ...the words around them are all kept', c(words) === 'a' + U(0x1F600) + 'b' + U(0x1F389) + 'c' + U(0x1F600) + 'd' + U(0x1F389) + 'e' + U(0x1F600) + 'f' + U(0x1F389) + 'gh', cpsOf(c(words)));
  const six = U(0x1F600, 0x1F389, 0x1F525, 0x1F44D, 0x1F64C, 0x1F680);
  check('1e a seventh that is a family goes whole, joiners and all', c(six + FAMILY) === six, cpsOf(c(six + FAMILY)));
  const five = U(0x1F600, 0x1F389, 0x1F525, 0x1F44D, 0x1F64C);
  check('1e a family that crosses the line is cut after the person who fits, no joiner left hanging',
    c(five + FAMILY + ' ok') === five + U(0x1F468) + ' ok', cpsOf(c(five + FAMILY + ' ok')));
  check('1e ...nor one joining the person who fits to the next word',
    c(five + FAMILY + 'ok') === five + U(0x1F468) + 'ok', cpsOf(c(five + FAMILY + 'ok')));
  check('1e a seventh red heart goes with its selector', c(six + HEART + 'x') === six + 'x', cpsOf(c(six + HEART + 'x')));
  check('1e a seventh waving hand goes with its skin tone', c(six + WAVE_TONE + 'x') === six + 'x', cpsOf(c(six + WAVE_TONE + 'x')));
  check('1e a region\'s flag past six goes with its tag letters', c(six + SCOT + 'x') === six + 'x');
  check('1e flags: two regional letters are one emoji, six flags kept, both halves of each',
    c(FLAG.repeat(8)) === FLAG.repeat(6), cpsOf(c(FLAG.repeat(8))));
  check('1e keycaps: six kept, past them the digit stays plain', c(U(0x31, 0xFE0F, 0x20E3, 0x32, 0xFE0F, 0x20E3, 0x33, 0xFE0F, 0x20E3, 0x34, 0xFE0F, 0x20E3, 0x35, 0xFE0F, 0x20E3, 0x36, 0xFE0F, 0x20E3, 0x37, 0xFE0F, 0x20E3))
    === U(0x31, 0xFE0F, 0x20E3, 0x32, 0xFE0F, 0x20E3, 0x33, 0xFE0F, 0x20E3, 0x34, 0xFE0F, 0x20E3, 0x35, 0xFE0F, 0x20E3, 0x36, 0xFE0F, 0x20E3, 0x37));
  check('1e skin tones on their own (colour swatches) count as emoji',
    c(U(0x1F3FB, 0x1F3FC, 0x1F3FD, 0x1F3FE, 0x1F3FF, 0x1F3FB, 0x1F3FC, 0x1F3FD)) === U(0x1F3FB, 0x1F3FC, 0x1F3FD, 0x1F3FE, 0x1F3FF, 0x1F3FB));
  check('1e three families are three emoji each: two fit', c(FAMILY + FAMILY + FAMILY) === FAMILY + FAMILY && n(c(FAMILY + FAMILY + FAMILY)) === 6);

  /* a run of one key */
  check('1f "Broooooooooo" is a very long "Broooooo"', c('Broooooooooo') === 'Broooooo');
  check('1f six in a row are left alone, seven are six', c('Broooooo') === 'Broooooo' && c('Brooooooo') === 'Broooooo');
  check('1f a wall of one key is six of it', c('!'.repeat(150)) === '!!!!!!' && c('A'.repeat(200)) === 'AAAAAA');
  check('1f a run of one emoji is six of it', c(U(0x1F602).repeat(9)) === U(0x1F602).repeat(6));
  check('1f never in a number: ten million is still ten million', c('selling for 10000000 gold') === 'selling for 10000000 gold' && c('1111111111') === '1111111111');
  check('1f a run joined up by a removal is measured after it (an invisible character between two runs)',
    c('aaaa' + U(0x200B) + 'aaaa') === 'aaaaaa', c('aaaa' + U(0x200B) + 'aaaa'));
  check('1f ...or a seventh emoji between two runs', c(six + 'aaa' + U(0x1F600) + 'aaaa') === six + 'aaaaaa', cpsOf(c(six + 'aaa' + U(0x1F600) + 'aaaa')));

  /* spaces */
  check('1g runs of spaces are one, the ends trimmed', c('  well     met   ') === 'well met');
  check('1g ...every kind of space, and the line separators that broke a bubble into lines',
    c('a' + U(0x3000, 0x3000) + 'b' + U(0x2028) + 'c' + U(0x00A0) + 'd') === 'a b c d', cpsOf(c('a' + U(0x3000, 0x3000) + 'b' + U(0x2028) + 'c')));
  check('1g a space left by a dropped emoji is not doubled', c(six + ' ' + U(0x1F600) + ' end') === six + ' end');

  /* the properties, over thousands of random lines */
  let seed = 0x5eed3346;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ALPHA = ['a', 'b', 'o', 'O', ' ', '  ', '1', '0', '!', 'e', U(0xE9), U(0x0301), U(0x0302), U(0x0303), U(0x0E17), U(0x0E48),
    U(0x200B), U(0x200C), U(0x200D), U(0x200E), U(0x202E), U(0x2066), U(0xFEFF), U(0x00AD), U(0x3164), U(0x0085), U(0xFE0F), U(0x20E3),
    U(0x1F600), U(0x1F389), U(0x1F468), U(0x1F469), U(0x2764), U(0x1F3FD), U(0x1F1FA), U(0x1F1F8), U(0x1F3F4), U(0xE0067), U(0xE007F),
    String.fromCharCode(0xD83D), String.fromCharCode(0xDE00), U(0x2028), U(0x3000), U(0x034F), U(0x00A9)];
  const INVIS = new Set([...OWNERS, ...MORE]);
  /* is `small` what is left of `big` after taking characters out?  Compared
     code point by code point (a half emoji in `big` must not match half of a
     whole one in `small`) */
  const isSub = (small, big) => {
    const a = [...small], b = [...big];
    let i = 0;
    for (const ch of b) if (i < a.length && a[i] === ch) i++;
    return i === a.length;
  };
  const bad = { longer: 0, twice: 0, invisible: 0, lone: 0, emoji: 0, run: 0, marks: 0, spaces: 0, joiner: 0, invented: 0, blank: 0 };
  let sample = null;
  const N = 6000;
  for (let k = 0; k < N; k++) {
    let x = '';
    const len = Math.floor(rnd() * 70);
    for (let i = 0; i < len; i++) x += ALPHA[Math.floor(rnd() * ALPHA.length)];
    const out = c(x);
    const note = (key) => { bad[key]++; if (!sample) sample = { key, x: cpsOf(x), out: cpsOf(out) }; };
    if (out.length > x.length) note('longer');
    if (c(out) !== out) note('twice');
    if ([...out].some((ch) => INVIS.has(ch.codePointAt(0)))) note('invisible');
    if (/\p{Cs}/u.test(out)) note('lone');
    if (n(out) > CHAT_GUARD.EMOJI_MAX) note('emoji');
    if (/(\P{Nd})\1{6,}/u.test(out)) note('run');
    if (/\p{M}{3}/u.test(out)) note('marks');
    if (/\s\s/.test(out) || out !== out.trim() || /[^\S ]/.test(out)) note('spaces');
    if (/(?<![^\s\u200D])\u200D|\u200D(?![^\s\u200D])/u.test(out)) note('joiner');
    if (!isSub(out, x.replace(/\s/g, ' '))) note('invented');
    if (out && !/[^\s\p{M}\p{Cf}]/u.test(out)) note('blank');
  }
  check('1h over ' + N + ' random lines: never longer, cleaning twice is once, no invisible or half character, at most six emoji, no run of seven, no three marks, single spaces, no loose joiner, nothing invented, nothing blank',
    Object.values(bad).every((v) => v === 0), { bad, sample });
}

/* ══ 2. every lane is cleaned, through its real handler ══ */
{
  /* a line with one of everything, within every lane's 200 */
  const DIRTY = 'Z' + U(0x0300, 0x0301, 0x0302, 0x0303, 0x0304, 0x0305) + 'algo ' + U(0x202E) + 'olleh' + U(0x2066) + ' heyyyyyyyyyyyy'
    + U(0x200B) + '   look ' + U(0x1F600, 0x1F389, 0x1F525, 0x1F44D, 0x1F64C, 0x1F680, 0x1F308, 0x1F354);
  const CLEAN = cleanChatText(DIRTY);
  check('2 setup: the dirty line cleans to something, shorter',
    CLEAN === 'Z' + U(0x0300, 0x0301) + 'algo olleh heyyyyyy look ' + U(0x1F600, 0x1F389, 0x1F525, 0x1F44D, 0x1F64C, 0x1F680), cpsOf(CLEAN));
  const BLANK = U(0x200B, 0x3164, 0x202E, 0xFEFF);

  const { room, tick } = makeRoom(true);
  const A = await join(room, 'bp_cg2_a', 'Ash');
  const B = await join(room, 'bp_cg2_b', 'Bree');
  const C = await join(room, 'bp_cg2_c', 'Cole');

  /* room chat: the relay, and what another phone is sent in the tick */
  const rel = await relayOf(room, A, 'chat', { text: DIRTY });
  check('2a room chat is relayed cleaned', rel.length === 1 && rel[0].payload.text === CLEAN, rel.map((e) => cpsOf(e.payload.text)));
  tick();
  const ticked = [];
  for (const m of B.ws.sent) if (m.type === 'tick' && Array.isArray(m.events)) for (const e of m.events) if (e && e.type === 'chat') ticked.push(e);
  check('2a ...and that is the line a phone in the room is sent', ticked.length === 1 && ticked[0].payload.text === CLEAN && ticked[0].from === A.id, ticked);
  {
    const seen = room._chatModRecentLines(A.id);
    check('2a ...and a report would quote the cleaned line, what was really said (chatmod.js)',
      seen.length === 1 && seen[0].text === CLEAN && seen[0].lane === 'room', seen);
  }
  check('2a a room line with nothing visible is not relayed', (await relayOf(room, A, 'chat', { text: BLANK })).length === 0);
  check('2a ...nor remembered for a report', room._chatModRecentLines(A.id).length === 1);

  /* area chat */
  B.ws.sent.length = 0;
  await send(room, A, 'area_chat', { text: DIRTY });
  const area = ofType(B.ws, 'area_chat');
  check('2b area chat is delivered cleaned', area.length === 1 && area[0].payload.text === CLEAN, area.map((m) => cpsOf(m.payload.text)));
  B.ws.sent.length = 0;
  await send(room, A, 'area_chat', { text: BLANK });
  check('2b an area line with nothing visible is not delivered', ofType(B.ws, 'area_chat').length === 0);

  /* a whisper */
  B.ws.sent.length = 0;
  await send(room, A, 'whisper', { to: 'Bree', text: DIRTY });
  const wh = ofType(B.ws, 'whisper');
  check('2c a whisper is delivered cleaned', wh.length === 1 && wh[0].payload.text === CLEAN, wh.map((m) => cpsOf(m.payload.text)));
  B.ws.sent.length = 0;
  await send(room, A, 'whisper', { to: 'Bree', text: BLANK });
  check('2c a whisper with nothing visible is not delivered', ofType(B.ws, 'whisper').length === 0);

  /* party chat */
  await send(room, A, 'party_invite', { target: B.id });
  await send(room, B, 'party_accept', { target: A.id });
  check('2d setup: a party of two', !!room._partyOf(A.id) && room._partyOf(A.id) === room._partyOf(B.id));
  B.ws.sent.length = 0;
  await send(room, A, 'party_chat', { text: DIRTY });
  const pc = ofType(B.ws, 'party_chat');
  check('2d party chat is delivered cleaned', pc.length === 1 && pc[0].payload.text === CLEAN, pc.map((m) => cpsOf(m.payload.text)));
  B.ws.sent.length = 0;
  await send(room, A, 'party_chat', { text: BLANK });
  check('2d a party line with nothing visible is not delivered', ofType(B.ws, 'party_chat').length === 0);

  /* a friend DM */
  await send(room, A, 'friend_request', { target: C.id });
  await send(room, C, 'friend_accept', { from: A.id });
  C.ws.sent.length = 0;
  await send(room, A, 'friend_dm', { to: C.id, text: DIRTY });
  const dm = ofType(C.ws, 'friend_dm');
  check('2e a friend DM is delivered cleaned', dm.length === 1 && dm[0].payload.text === CLEAN, dm.map((m) => cpsOf(m.payload.text)));
  C.ws.sent.length = 0;
  await send(room, A, 'friend_dm', { to: C.id, text: BLANK });
  check('2e a DM with nothing visible is not delivered', ofType(C.ws, 'friend_dm').length === 0);

  /* the auction house's thread -- kept for days, so cleaned before it is stored */
  room.playerState[C.id].inventory = { slime_gel: 30 };
  await room._stEnsureIndex();
  const made = await room._stCreateListing({ playerId: C.id, kind: 'item', invKey: 'slime_gel', qty: 1, price: 500 });
  check('2f setup: a listing to talk about', !!(made && made.ok), made);
  const LID = made && made.listing && made.listing.id;
  C.ws.sent.length = 0;
  await send(room, A, 'store_dm', { listingId: LID, text: DIRTY });
  await flush(); await flush();
  const doc = await room.state.storage.get('store_thread:' + LID);
  const kept = doc && doc.t && doc.t[A.id];
  const toSeller = ofType(C.ws, 'store_dm').map((m) => m.payload && m.payload.msg && m.payload.msg.text);
  check('2f the auction house\'s thread stores the line cleaned', !!kept && kept.length === 1 && kept[0].x === CLEAN, kept && kept.map((m) => cpsOf(m.x)));
  check('2f ...and the seller is sent it cleaned', toSeller.length === 1 && toSeller[0] === CLEAN, toSeller);
  await send(room, A, 'store_dm', { listingId: LID, text: BLANK });
  await flush(); await flush();
  const doc2 = await room.state.storage.get('store_thread:' + LID);
  check('2f a thread line with nothing visible is not stored', doc2.t[A.id].length === 1, doc2.t[A.id].length);
}

/* ══ 3. the social allowance ══ */
{
  const { room } = makeRoom(false);
  const A = await join(room, 'bp_cg3_a', 'Ash');
  const B = await join(room, 'bp_cg3_b', 'Bree');

  room.eventBuffer.length = 0;
  A.ws.sent.length = 0;   /* Bree's arrival, told to Ash */
  for (let i = 0; i < 8; i++) await send(room, A, 'chat', { text: 'line number ' + i });
  const burst = room.eventBuffer.filter((e) => e.type === 'chat').map((e) => e.payload.text);
  check('3a a burst of eight lines: the first five go, the sixth on are dropped',
    burst.length === SOCIAL.BURST && burst[4] === 'line number 4', burst);
  check('3a ...counted as dropped on the connection', A.session().chatGuard.dropped === 3, A.session().chatGuard);
  check('3a ...silently: nothing is sent back', A.ws.sent.length === 0, A.ws.sent.map((m) => m.type));
  check('3b chat left the relay bucket alone (never even started it)', A.session().relayTokens === undefined, A.session().relayTokens);
  const swings = [];
  for (let i = 0; i < room.RELAY_BURST + 2; i++) swings.push(...(await relayOf(room, A, 'player_swing', { ts: i, wpn: 'sword' })));
  check('3b while chat is spent, a swing still goes -- all RELAY_BURST of them, the full bucket',
    swings.length === room.RELAY_BURST, swings.length);
  check('3b ...and an emote is spent with chat (one allowance for both)',
    (await relayOf(room, A, 'emote', { emoji: WAVE })).length === 0);
  {
    /* the other way round: B empties the relay bucket with swings, then talks */
    for (let i = 0; i < room.RELAY_BURST + 3; i++) await send(room, B, 'player_swing', { ts: i });
    const s = B.session();
    check('3c setup: B\'s relay bucket is empty', s.relayTokens < 1, s.relayTokens);
    check('3c with the relay bucket empty, chat still goes', (await roomChat(room, B, 'still here')).length === 1);
    check('3c ...and an emote', (await relayOf(room, B, 'emote', { emoji: WAVE })).length === 1);
  }
  {
    const s = A.session();
    s.relayTokens = 3; s.relayAt = NOW;
    refill(room, A);
    for (let i = 0; i < 4; i++) await send(room, A, 'chat', { text: 'talk ' + i });
    check('3d chat spends nothing of the relay bucket (three tokens before four lines, three after)', s.relayTokens === 3, s.relayTokens);
  }
  {
    /* the refill: one every 2 s, never more than five */
    freshGuard(A);
    for (let i = 0; i < 5; i++) await send(room, A, 'chat', { text: 'spend ' + i });
    check('3e setup: spent', (await roomChat(room, A, 'one more')).length === 0);
    NOW += 1999;
    check('3e 1.999 s later, still nothing', (await roomChat(room, A, 'early')).length === 0);
    NOW += 1;
    check('3e at 2 s, one line', (await roomChat(room, A, 'on time')).length === 1);
    check('3e ...and only one', (await roomChat(room, A, 'greedy')).length === 0);
    NOW += 60000;
    let got = 0;
    for (let i = 0; i < 8; i++) got += (await roomChat(room, A, 'after a minute ' + i)).length;
    check('3e a minute of quiet buys five, not thirty', got === SOCIAL.BURST, got);
    check('3e ...five lines in ten seconds, steady: one every 2 s', await (async () => {
      let ok = 0;
      for (let i = 0; i < 5; i++) { NOW += 2000; ok += (await roomChat(room, A, 'steady ' + i)).length; ok += (await roomChat(room, A, 'extra ' + i)).length; }
      return ok === 5;
    })());
  }
  {
    const C = await join(room, 'bp_cg3_c', 'Cole');
    check('3f the allowance is each connection\'s own: another player talks while Ash is spent',
      (await roomChat(room, A, 'spent?')).length === 0 && (await roomChat(room, C, 'hello')).length === 1);
  }
  {
    /* a bundle is up to 24 messages in one event: it buys nothing more */
    freshGuard(A);
    room.eventBuffer.length = 0;
    const parts = Array.from({ length: 12 }, (_, i) => ({ type: 'chat', payload: { text: 'bundled ' + i } }));
    await room.webSocketMessage(A.ws, JSON.stringify(parts));
    check('3g twelve lines in one bundle: five go', room.eventBuffer.filter((e) => e.type === 'chat').length === SOCIAL.BURST,
      room.eventBuffer.filter((e) => e.type === 'chat').length);
  }
}

/* ══ 3h. party chat pays from the same allowance (a follow-up: it had no limit
   of its own but the socket's message budget, ~120 lines a second to a party
   of up to 50) ══ */
{
  const { room } = makeRoom(false);
  const A = await join(room, 'bp_cg3h_a', 'Ash');
  const B = await join(room, 'bp_cg3h_b', 'Bree');
  await send(room, A, 'party_invite', { target: B.id });
  await send(room, B, 'party_accept', { target: A.id });
  check('3h setup: a party of two', !!room._partyOf(A.id) && room._partyOf(A.id) === room._partyOf(B.id));
  freshGuard(A);
  B.ws.sent.length = 0;
  for (let i = 0; i < 8; i++) await send(room, A, 'party_chat', { text: 'party line ' + i });
  const got = ofType(B.ws, 'party_chat').map((m) => m.payload.text);
  check('3h eight party lines at once: five go', got.length === SOCIAL.BURST && got[4] === 'party line 4', got);
  NOW += SOCIAL.REFILL_MS;
  B.ws.sent.length = 0;
  await send(room, A, 'party_chat', { text: 'two seconds later' });
  check('3h ...then one more every 2 s', ofType(B.ws, 'party_chat').length === 1);
  /* one allowance for the three: room chat, emotes and party chat together */
  freshGuard(A);
  room.eventBuffer.length = 0;
  B.ws.sent.length = 0;
  for (let i = 0; i < 3; i++) await send(room, A, 'chat', { text: 'room ' + i });
  for (let i = 0; i < 3; i++) await send(room, A, 'party_chat', { text: 'party ' + i });
  const n = room.eventBuffer.filter((e) => e.type === 'chat').length + ofType(B.ws, 'party_chat').length;
  check('3h room chat and party chat share one allowance: three and three, five go', n === SOCIAL.BURST, n);
  /* a blank line costs nothing */
  freshGuard(A);
  for (let i = 0; i < 10; i++) await send(room, A, 'party_chat', { text: '   ' });
  B.ws.sent.length = 0;
  await send(room, A, 'party_chat', { text: 'still five left' });
  check('3h a blank party line spends nothing', ofType(B.ws, 'party_chat').length === 1 && A.session().chatGuard.tokens >= SOCIAL.BURST - 1 - 1e-9, A.session().chatGuard);
  /* the kill switch: party chat as it was, no allowance */
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { chatguard: false });
  freshGuard(A);
  B.ws.sent.length = 0;
  for (let i = 0; i < 8; i++) await send(room, A, 'party_chat', { text: 'free ' + i });
  check('3h `chatguard: false`: party chat has no allowance, as before', ofType(B.ws, 'party_chat').length === 8, ofType(B.ws, 'party_chat').length);
}

/* ══ 4. the repeat filter ══ */
{
  const { room } = makeRoom(false);
  const A = await join(room, 'bp_cg4_a', 'Ash');
  const B = await join(room, 'bp_cg4_b', 'Bree');

  refill(room, A);
  A.ws.sent.length = 0;   /* Bree's arrival, told to Ash */
  check('4a a room line goes', (await roomChat(room, A, 'anyone selling iron?')).length === 1);
  check('4a ...the same line again at once does not', (await roomChat(room, A, 'anyone selling iron?')).length === 0);
  check('4a ...counted on the connection', A.session().chatGuard.repeats === 1, A.session().chatGuard.repeats);
  check('4a ...silently', ofType(A.ws, 'chat').length === 0 && A.ws.sent.length === 0, A.ws.sent.map((m) => m.type));
  refill(room, A);
  check('4b in capitals and with more spaces it is the same line', (await roomChat(room, A, '  ANYONE   selling IRON?  ')).length === 0);
  check('4b with an invisible character in it, the same line', (await roomChat(room, A, 'anyone ' + U(0x200B) + 'selling iron?')).length === 0);
  check('4b with a joiner between two letters (kept, unseen), the same line', (await roomChat(room, A, 'any' + U(0x200D) + 'one selling iron?')).length === 0);
  check('4b with a selector after a letter (kept, unseen), the same line', (await roomChat(room, A, 'anyone' + U(0xFE0F) + ' selling iron?')).length === 0);
  refill(room, A);
  check('4b a different line is a different line', (await roomChat(room, A, 'anyone selling iron?!')).length === 1);
  check('4b ...and "Broooooooooo" twice is "Broooooo" twice', (await roomChat(room, A, 'Broooooooooo')).length === 1 && (await roomChat(room, A, 'Brooooooooooooooo')).length === 0);
  check('4b the key: lower case, spaces collapsed, unseen characters out',
    chatRepeatKey('  Hi' + U(0x200D) + '  THERE ' + U(0xFE0F)) === 'hi there' && chatRepeatKey(7) === '');

  /* the window */
  NOW += 29999;
  refill(room, A);
  check('4c 29.999 s later it is still a repeat', (await roomChat(room, A, 'anyone selling iron?')).length === 0);
  NOW += 1;
  check('4c at 30 s it goes again', (await roomChat(room, A, 'anyone selling iron?')).length === 1);
  {
    /* a dropped repeat does not restart the window */
    refill(room, A);
    await roomChat(room, A, 'wts copper bars');
    NOW += 20000; refill(room, A);
    check('4d setup: a repeat 20 s on is dropped', (await roomChat(room, A, 'wts copper bars')).length === 0);
    NOW += 10000; refill(room, A);
    check('4d 30 s after it was SAID (10 s after the dropped one) it goes', (await roomChat(room, A, 'wts copper bars')).length === 1);
  }

  /* per player, per lane */
  refill(room, A); refill(room, B);
  check('4e two players may say the same thing', (await roomChat(room, A, 'gg all')).length === 1 && (await roomChat(room, B, 'gg all')).length === 1);
  B.ws.sent.length = 0;
  room._laneBuckets = null;
  await send(room, A, 'area_chat', { text: 'gg all' });
  check('4e the same words in room chat and then area chat: both go (another lane, another audience)', ofType(B.ws, 'area_chat').length === 1);

  /* area chat */
  B.ws.sent.length = 0;
  await send(room, A, 'area_chat', { text: 'meet at the fountain' });
  await send(room, A, 'area_chat', { text: 'meet at the fountain' });
  await send(room, A, 'area_chat', { text: 'MEET  at the fountain' });
  check('4f area chat: the same line three times is delivered once', ofType(B.ws, 'area_chat').length === 1, ofType(B.ws, 'area_chat').length);
  NOW += CHAT_GUARD.REPEAT_MS;
  room._laneBuckets = null;
  B.ws.sent.length = 0;
  await send(room, A, 'area_chat', { text: 'meet at the fountain' });
  check('4f ...and again after 30 s', ofType(B.ws, 'area_chat').length === 1);

  /* never filtered: the private lanes and emotes */
  room._laneBuckets = null;
  B.ws.sent.length = 0;
  await send(room, A, 'whisper', { to: 'Bree', text: 'you there?' });
  await send(room, A, 'whisper', { to: 'Bree', text: 'you there?' });
  check('4g a whisper is private: the same one twice is delivered twice', ofType(B.ws, 'whisper').length === 2, ofType(B.ws, 'whisper').length);
  await send(room, A, 'party_invite', { target: B.id });
  await send(room, B, 'party_accept', { target: A.id });
  B.ws.sent.length = 0;
  await send(room, A, 'party_chat', { text: 'pull now' });
  await send(room, A, 'party_chat', { text: 'pull now' });
  check('4g party chat is private: twice is twice', ofType(B.ws, 'party_chat').length === 2, ofType(B.ws, 'party_chat').length);
  await send(room, A, 'friend_request', { target: B.id });
  await send(room, B, 'friend_accept', { from: A.id });
  room._laneBuckets = null;
  B.ws.sent.length = 0;
  await send(room, A, 'friend_dm', { to: B.id, text: 'brb' });
  await send(room, A, 'friend_dm', { to: B.id, text: 'brb' });
  check('4g a friend DM is private: twice is twice', ofType(B.ws, 'friend_dm').length === 2, ofType(B.ws, 'friend_dm').length);
  refill(room, A);
  const e1 = await relayOf(room, A, 'emote', { emoji: WAVE });
  const e2 = await relayOf(room, A, 'emote', { emoji: WAVE });
  check('4g an emote is a listed one, meant to be sent again: twice is twice', e1.length === 1 && e2.length === 1);

  /* the memory stays small */
  {
    const s = A.session();
    for (let i = 0; i < 60; i++) { refill(room, A); await roomChat(room, A, 'distinct line ' + i); }
    check('4h sixty lines in the window: no more than REPEAT_KEEP remembered', s.chatGuard.said.length <= CHAT_GUARD.REPEAT_KEEP, s.chatGuard.said.length);
    NOW += CHAT_GUARD.REPEAT_MS + 1;
    refill(room, A);
    await roomChat(room, A, 'the only one');
    check('4h ...and what is older than the window is forgotten', s.chatGuard.said.length === 1, s.chatGuard.said.length);
    refill(room, A);
    check('4h a line from 24 lines ago, inside the window, is still a repeat', await (async () => {
      for (let i = 0; i < CHAT_GUARD.REPEAT_KEEP - 1; i++) { refill(room, A); await roomChat(room, A, 'filler ' + i); }
      refill(room, A);
      return (await roomChat(room, A, 'the only one')).length === 0;
    })());
  }
}

/* ══ 5. the kill switch ══ */
{
  const { room } = makeRoom(false);
  const A = await join(room, 'bp_cg5_a', 'Ash');
  const B = await join(room, 'bp_cg5_b', 'Bree');
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { chatguard: false });
  check('5 setup: the guard reads off', room._chatGuardOff() === true);

  room.eventBuffer.length = 0;
  for (let i = 0; i < room.RELAY_BURST + 2; i++) await send(room, A, 'chat', { text: 'old ' + i });
  check('5a chat is back on the relay bucket: RELAY_BURST go, not five', room.eventBuffer.filter((e) => e.type === 'chat').length === room.RELAY_BURST,
    room.eventBuffer.filter((e) => e.type === 'chat').length);
  check('5a ...the relay bucket counts the drops, and no social allowance was made', A.session().relayDropped === 2 && !A.session().chatGuard, A.session().relayDropped);
  {
    const s = B.session();
    s.relayTokens = room.RELAY_BURST; s.relayAt = NOW;
    check('5b a repeat goes out again', (await roomChat(room, B, 'same same')).length === 1 && (await roomChat(room, B, 'same same')).length === 1);
    const ZALGO = 'z' + U(0x0300, 0x0301, 0x0302, 0x0303) + ' ' + U(0x202E) + 'x' + U(0x200B) + '   ooooooooo';
    const old = ZALGO.slice(0, CHAT_RELAY.TEXT_MAX).replace(/[\x00-\x1f\x7f]/g, ' ').trim();
    const got = await roomChat(room, B, ZALGO);
    check('5c garbled text is relayed as it was (the old clamp, strip and trim only)', got.length === 1 && got[0] === old && got[0] !== cleanChatText(ZALGO), got.map(cpsOf));
    B.ws.sent.length = 0;
    await send(room, A, 'area_chat', { text: ZALGO });
    check('5c ...in area chat too', ofType(B.ws, 'area_chat').length === 1 && ofType(B.ws, 'area_chat')[0].payload.text === old);
    check('5c ...and a blank-looking line is relayed, as it was', (await roomChat(room, B, U(0x200B, 0x3164))).length === 1);
  }
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags, { chatguard: true });
  check('5d back on (`chatguard: true`): the guard reads on', room._chatGuardOff() === false);
  freshGuard(B);
  check('5d ...and cleans and filters again', (await roomChat(room, B, 'ooooooooo')).join() === 'oooooo' && (await roomChat(room, B, 'ooooooooo')).length === 0);
  room._liveFlags = Object.create(null);
  check('5e no flag at all: on (the default)', room._chatGuardOff() === false);
  room._liveFlags = Object.assign(Object.create(null), { chatguard: 0 });
  check('5e any false value turns it off', room._chatGuardOff() === true);
  room._liveFlags = Object.assign({}, JSON.parse('{"__proto__": {"chatguard": false}}'));
  check('5e an inherited "chatguard" is not the flag (own property only)', room._chatGuardOff() === false);
}

console.log(`\nchat-guard: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
