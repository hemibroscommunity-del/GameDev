/* ═══ v2.3.4641: A QUEST TAP MADE WHILE THE CONNECTION IS DOWN IS KEPT ═══
 *
 * TRAPS §287: "The send returned, so the message went" -- the channel drops a
 * message without a word while the socket is not open, and since v2.3.4402 it
 * says so (wsClient.js channelShim: `false`; `undefined` or `true` when it went
 * or is batched).  The quest taps ignored the answer: an Accept or a Hand in
 * made in a Wi-Fi blip showed QUEST ACCEPTED (or the reward) on the phone, the
 * worker never heard, and the rejoin's player_state took it back -- the quest
 * not taken, the reward gone, the bow and staff of a tutorial hand-in never
 * minted, with no word why.
 *
 * KEPT, as a mute is (chatMute.js `_kept`): a dropped quest message is kept
 * here, one a quest and kind (the last tap wins), and sent once on the rejoin
 * (wsClient.js state_sync, before the worker's echoes of it arrive).  The
 * worker is the judge as always: an accept of a quest already taken, or a hand
 * in already paid, is refused there and changes nothing.  Memory only: a
 * reload in the gap starts from the worker's record, as before.
 *
 * No imports, so node can test it (server/test/quest-kept.test.mjs). */

const _kept = new Map();   /* 'quest_accept:<id>' / 'quest_turn_in:<id>' -> the message */

const keyOf = (msg) => String(msg && msg.type) + ':' + String(msg && msg.payload && msg.payload.questId);

/* did the channel take it?  Only `false` means dropped (its quest path answers
   nothing when it sends), and a throw is a send that did not happen */
function _send(S, msg) {
  try { return !!(S && S.channel) && S.channel.send(msg) !== false; } catch (e) { return false; }
}

/** Send a quest_accept or quest_turn_in; kept for the rejoin when the channel
    drops it.  True when it went. */
export function sendQuestMsg(S, msg) {
  if (!msg || (msg.type !== 'quest_accept' && msg.type !== 'quest_turn_in')) return false;
  const k = keyOf(msg);
  if (_send(S, msg)) { _kept.delete(k); return true; }
  _kept.set(k, msg);
  return false;
}

/** The rejoin (state_sync): each kept message sent once, in the order they
    were tapped (an accept before its hand-in).  Returns how many went. */
export function resendKeptQuests(S) {
  let n = 0;
  for (const [k, msg] of [..._kept]) {
    if (!_send(S, msg)) break;   /* down again: the rest wait for the next rejoin, in order */
    _kept.delete(k);
    n++;
  }
  return n;
}

/** For tests and the probe: how many are kept. */
export function keptQuestCount() { return _kept.size; }
export function clearKeptQuests() { _kept.clear(); }
