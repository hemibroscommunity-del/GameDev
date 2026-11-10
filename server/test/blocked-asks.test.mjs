/* The block list on the phone -- v2.3.4365 (the state-machine sweep,
 * 2026-11-03: V12 P2-19 and M4-9, V6 N2-18; reviews R1 and R2, W1.2).
 *
 *   1. ONE WRITER.  The player card wrote back BroTown's load-time copy of
 *      `bt_blocked`, so a block made on the Friends page was erased by the
 *      next Block or Unblock of anybody on a card.  Every writer now goes
 *      through chatMute.js setBlockedId (friendsModel's helpers), which reads
 *      the stored list fresh.
 *   2. ONE CHECK.  The phone asked the block list handler by handler and
 *      missed the game's own Duel button (`duel_wager_request`) and the
 *      friend request's chime.  processGameEvent now asks one table
 *      (src/game/blockedAsks.js) before its switch, and section 3 fails when
 *      a social case is in neither of its tables.
 *   3. The friend Requests rows and badge leave a blocked player's request
 *      out (friendsSync.requestsIn).
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
const stored = () => JSON.parse(store.get('bt_blocked') || '[]');

const { isBlockedId, setBlockedId, subscribeBlocks, readBlockedIds } = await import('../../src/game/chatMute.js');
const { BLOCKED_SOCIAL, NOT_BLOCKED, dropAsBlocked, blockedSenderOf, withoutBlockedRows } = await import('../../src/game/blockedAsks.js');
const FM = await import('../../src/ui/mobile/sheet/friendsModel.js');
const { friendsSrv } = await import('../../src/ui/mobile/sheet/friendsSync.js');

/* ── 1. one writer: a block made anywhere survives a write elsewhere ── */
{
  store.clear();
  /* the sweep's replay: Friends page blocks P, then a card blocks Q */
  FM.blockPlayer(null, 'bp_P', 'Pest');
  const heard = [];
  const off = subscribeBlocks((l) => heard.push(l.length));
  FM.setBlock(null, 'bp_Q', true, 'Quarrel');            /* the card's Block */
  check('1a a card Block after a Friends-page Block keeps both (the card used to erase P)',
    isBlockedId('bp_P') && isBlockedId('bp_Q'), stored());
  FM.unblockPlayer(null, 'bp_Q');                         /* the card's Unblock */
  check('1b a card Unblock of someone else keeps the Friends-page block',
    isBlockedId('bp_P') && !isBlockedId('bp_Q'), stored());
  check('1c each change tells the subscribers (BroTown\'s copy follows the stored list)', heard.join() === '2,1', heard);
  FM.setBlock(null, 'bp_P', true, 'Pest');
  check('1d blocking twice adds nothing and tells nobody', stored().length === 1 && heard.length === 2, { s: stored(), heard });
  off();
  store.set('bt_blocked', JSON.stringify(['bp_plain', { id: 'bp_obj', name: 'Obj' }]));
  setBlockedId('bp_new', true, 'New');
  const s = stored();
  check('1e entries saved in either shape are kept as they were saved; a new one is {id, name}',
    s[0] === 'bp_plain' && s[1].id === 'bp_obj' && s[2].id === 'bp_new' && s[2].name === 'New', s);
  setBlockedId('bp_plain', false);
  check('1f an Unblock removes a plain id too', JSON.stringify(readBlockedIds()) === JSON.stringify(['bp_obj', 'bp_new']), readBlockedIds());
  store.set('bt_blocked', '{not json');
  setBlockedId('bp_x', true, 'X');
  check('1g a broken stored list is replaced, never throws', JSON.stringify(readBlockedIds()) === '["bp_x"]', store.get('bt_blocked'));
  check('1h no id, no write', setBlockedId('', true).length === 1 && setBlockedId(null, true).length === 1);

  /* only chatMute.js writes the list in src/ (the card and the old Social
     panel wrote their copies by hand) */
  const writers = ['src/ui/panels/InspectPlayerPanel.jsx', 'src/ui/panels/SocialPanel.jsx', 'src/ui/mobile/sheet/friendsModel.js', 'src/ui/BroTown.jsx']
    .filter((p) => /setItem\(\s*['"]bt_blocked['"]/.test(src(p)));
  check('1i the player card, the old Social panel, friendsModel and BroTown write bt_blocked only through setBlockedId', writers.length === 0, writers);
  const card = src('src/ui/panels/InspectPlayerPanel.jsx');
  check('1j the card blocks and unblocks through friendsModel\'s helpers, and reads the stored list',
    /from '..\/mobile\/sheet\/friendsModel\.js'/.test(card) && /setBlock\(stateRef\.current, inspectPlayer\.id, true/.test(card)
      && /unblockPlayer\(stateRef\.current, inspectPlayer\.id\)/.test(card) && /isBlocked = isBlockedId\(inspectPlayer\.id\)/.test(card));
  check('1k BroTown\'s blockedList follows the writer', /subscribeBlocks\(function \(list\) \{ setBlockedList\(list\); \}\)/.test(src('src/ui/BroTown.jsx')));
}

/* ── 2. the table ── */
{
  store.set('bt_blocked', JSON.stringify([{ id: 'bp_pest', name: 'Pest' }]));
  check('2a the game\'s own Duel button (duel_wager_request) from a blocked player is dropped (V6 N2-18)',
    dropAsBlocked('duel_wager_request', { target: 'bp_me', from: 'bp_pest', wager: 0 }, isBlockedId) === true);
  check('2b ...and from anyone else it is not',
    dropAsBlocked('duel_wager_request', { target: 'bp_me', from: 'bp_friend', wager: 0 }, isBlockedId) === false);
  check('2c the friend request\'s chime from a blocked player is dropped',
    dropAsBlocked('friend_request_in', { from: 'bp_pest', fromName: 'Pest' }, isBlockedId) === true);
  check('2d the requests that were already stopped still are (duel_request, trade2_invite, party_invited)',
    ['duel_request', 'trade2_invite', 'party_invited'].every((t) => dropAsBlocked(t, { from: 'bp_pest' }, isBlockedId)));
  check('2e chat reads its sender from `id` (the worker\'s stamp), a whisper from `from`',
    dropAsBlocked('chat', { id: 'bp_pest', text: 'hi' }, isBlockedId) && dropAsBlocked('whisper', { from: 'bp_pest' }, isBlockedId)
      && !dropAsBlocked('chat', { from: 'bp_pest', id: 'bp_friend' }, isBlockedId));
  check('2f a direct message from a blocked player is dropped (the owner, 2026-11-10: "Block also stops direct messages")',
    dropAsBlocked('friend_dm', { from: 'bp_pest', text: 'hi' }, isBlockedId) === true
      && dropAsBlocked('friend_dm', { from: 'bp_friend', text: 'hi' }, isBlockedId) === false && !NOT_BLOCKED.friend_dm);
  check('2g a type outside the table, junk payloads and junk types drop nothing (never throw)',
    !dropAsBlocked('player_move', { id: 'bp_pest' }, isBlockedId) && !dropAsBlocked('duel_request', null, isBlockedId)
      && !dropAsBlocked('duel_request', { from: 7 }, isBlockedId) && !dropAsBlocked('__proto__', { from: 'bp_pest' }, isBlockedId)
      && !dropAsBlocked('constructor', { from: 'bp_pest' }, isBlockedId) && blockedSenderOf(undefined, {}) === '');
  check('2h the tables are null-prototype and frozen', Object.getPrototypeOf(BLOCKED_SOCIAL) === null
    && Object.getPrototypeOf(NOT_BLOCKED) === null && Object.isFrozen(BLOCKED_SOCIAL));
  const both = Object.keys(BLOCKED_SOCIAL).filter((t) => NOT_BLOCKED[t]);
  check('2i no type is in both tables', both.length === 0, both);
}

/* ── 3. every social case in processGameEvent is in a table ── */
{
  const ge = src('src/networking/gameEvents.js');
  const start = ge.indexOf('export function processGameEvent(');
  const sw = ge.indexOf('switch (type) {', start);
  const head = ge.slice(start, sw);
  check('3a processGameEvent asks dropAsBlocked once, before its switch', /if \(dropAsBlocked\(type, payload, isBlockedId\)\) return;/.test(head));
  const body = ge.slice(sw);
  /* v2.3.4442: trade2_invite's own line (a second filter kept while lane
     A2's change beside it landed, #1459) is gone: no case asks */
  const own = (body.match(/isBlockedId\(/g) || []).length;
  check('3b no case asks the block list by itself (the drift that missed duel_wager_request)', own === 0, { own });
  check('3b\' a blocked player\'s trade invite is still dropped, by the shared table, before the switch',
    dropAsBlocked('trade2_invite', { from: 'bp_pest', fromName: 'Pest' }, isBlockedId) === true
      && dropAsBlocked('trade2_invite', { from: 'bp_friend', fromName: 'Friend' }, isBlockedId) === false);
  /* the switch's own cases sit at ten spaces; a run of cases with nothing
     but space between them shares one body */
  const re = /^ {10}case '([^']+)':/gm;
  const marks = [];
  let m;
  while ((m = re.exec(body))) marks.push({ type: m[1], at: m.index, end: re.lastIndex });
  const groups = [];
  for (let i = 0; i < marks.length; i++) {
    const g = groups[groups.length - 1];
    if (g && /^\s*$/.test(body.slice(marks[i - 1].end, marks[i].at))) g.types.push(marks[i].type);
    else groups.push({ types: [marks[i].type] });
    groups[groups.length - 1].body = body.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].at : body.length);
  }
  check('3c the scan finds the switch\'s cases (guard)', marks.length > 80 && marks.some((x) => x.type === 'duel_wager_request'), marks.length);
  /* what makes a case social: it raises a request card, a chat line or a DM,
     or its name says it is a request or an invite */
  const SOCIAL_BODY = /setDuelRequest\(|setIncomingTrade\(|setThreatIncoming\(|invite:\s*true|_pendingClanInvite\s*=|handle(Chat|Emote|PartyChat|AreaChat|Whisper|Dice)Event\(|friendsSrv\.appendDm\(/;
  const SOCIAL_NAME = /_(request|invite|invited|offer)(_in)?$/;
  const social = [];
  for (const g of groups) {
    const isSocial = SOCIAL_BODY.test(g.body) || g.types.some((t) => SOCIAL_NAME.test(t));
    if (isSocial) social.push(...g.types);
  }
  const missing = social.filter((t) => !BLOCKED_SOCIAL[t] && !NOT_BLOCKED[t]);
  check('3d every social case is in BLOCKED_SOCIAL or NOT_BLOCKED (add a row: one line)', missing.length === 0, { missing, social });
  check('3e the scan sees the ones that matter (guard)', ['duel_wager_request', 'duel_request', 'trade2_invite', 'party_invited', 'clan_invite', 'friend_request_in', 'chat', 'emote', 'friend_dm'].every((t) => social.includes(t)), social);
  const stale = Object.keys(BLOCKED_SOCIAL).concat(Object.keys(NOT_BLOCKED)).filter((t) => !marks.some((x) => x.type === t));
  check('3f every row names a case the switch has', stale.length === 0, stale);
}

/* ── 4. the Requests rows ── */
{
  store.set('bt_blocked', JSON.stringify(['bp_pest']));
  friendsSrv.setDoc({ list: {}, reqIn: { bp_pest: { name: 'Pest' }, bp_ok: { name: 'Ok' } }, reqOut: {} });
  check('4a a blocked player\'s friend request is not shown or counted', JSON.stringify(friendsSrv.requestsIn()) === '["bp_ok"]', friendsSrv.requestsIn());
  store.set('bt_blocked', '[]');
  check('4b unblocked, it shows again (it stayed on the worker)', friendsSrv.requestsIn().length === 2);
  check('4c the Requests tab reads the filtered list', /const reqIn = doc \? friendsSrv\.requestsIn\(\) : \[\];/.test(src('src/ui/mobile/dash/SocialPanel.jsx')));
}

/* ── 5. direct messages (the owner, 2026-11-10: "Block also stops direct messages") ── */
{
  store.clear();
  store.set('bt_blocked', JSON.stringify(['bp_pest']));
  const box = { messages: [{ from: 'bp_pest', text: 'a' }, { from: 'bp_ok', text: 'b' }, { from: 'bp_pest', text: 'c' }, null, { text: 'no from' }] };
  const kept = typeof withoutBlockedRows === 'function' ? withoutBlockedRows('friend_dm_backlog', box, isBlockedId) : box;
  check('5a the offline backlog keeps every row but a blocked player\'s',
    Array.isArray(kept.messages) && kept.messages.length === 3 && !kept.messages.some((m) => m && m.from === 'bp_pest'), kept);
  check('5b ...and leaves the payload it was given as it was (a copy)', box.messages.length === 5);
  check('5c the backlog event itself is not dropped (many senders)', !dropAsBlocked('friend_dm_backlog', box, isBlockedId)
    && typeof withoutBlockedRows === 'function' && withoutBlockedRows('chat', box, isBlockedId) === box
    && withoutBlockedRows('friend_dm_backlog', { messages: 'junk' }, isBlockedId).messages === 'junk');
  /* a thread and an unread count already saved before the block */
  store.set('bt_dm:bp_pest', JSON.stringify([{ from: 'bp_pest', text: 'old', ts: 1 }]));
  store.set('bt_dm:bp_ok', JSON.stringify([{ from: 'bp_ok', text: 'hey', ts: 1 }]));
  store.set('bt_dm_unread', JSON.stringify({ bp_pest: 4, bp_ok: 1 }));
  check('5d a blocked player\'s saved thread is not shown', friendsSrv.thread('bp_pest').length === 0 && friendsSrv.thread('bp_ok').length === 1);
  check('5e ...nor counted in the unread badge', friendsSrv.unreadOf('bp_pest') === 0 && friendsSrv.unreadTotal() === 1,
    { one: friendsSrv.unreadOf('bp_pest'), total: friendsSrv.unreadTotal() });
  friendsSrv.appendDm('bp_pest', { from: 'me', text: 'sent before the block landed' }, true);
  check('5f an append never writes the filtered view back over the archive', JSON.parse(store.get('bt_dm:bp_pest')).length === 2);
  store.set('bt_blocked', '[]');
  check('5g unblocked, the thread and its unread show again (kept on this phone)',
    friendsSrv.thread('bp_pest').length === 2 && friendsSrv.unreadTotal() === 5);
}

delete globalThis.localStorage;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
