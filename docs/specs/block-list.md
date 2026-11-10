# The block list on the phone (v2.3.4365)

Block is this device's: `bt_blocked` in localStorage, never the server (a
server-kept block is later work, docs/FUN-SOCIAL-PLAN.md). Mute is the one the
worker keeps (docs/specs/chat-moderation.md).

## One writer

Every Block and Unblock goes through `src/game/chatMute.js` `setBlockedId(id,
on, name)`: it reads the stored list fresh, adds or removes the one id, keeps
every other entry as it was saved (a plain id or `{ id, name }`), saves, and
tells the subscribers (`subscribeBlocks`; BroTown's `blockedList` follows it).

- the Friends page: `friendsModel.js` `blockPlayer` (also drops the old device
  friend);
- the player card (`InspectPlayerPanel.jsx`): `friendsModel.js` `setBlock` and
  `unblockPlayer`; it reads its Block state from the stored list
  (`isBlockedId`);
- the old Social panel's Unblock: `unblockPlayer`.

Before v2.3.4365 the card (and the old Social panel) wrote back BroTown's copy
of the list, read once at page load, plus or minus one id: a block made on the
Friends page since the load was erased by the next Block or Unblock of anybody
on a card (the state-machine sweep of 2026-11-03, V12 P2-19).

## One check

`processGameEvent` (`src/networking/gameEvents.js`) asks
`src/game/blockedAsks.js` `dropAsBlocked(type, payload, isBlockedId)` once,
before its switch. `BLOCKED_SOCIAL` lists every social type and the payload
field naming its sender (`id` for the relayed chat, emotes and rolls; `from`
for the rest): the four chat lanes, emotes, rolls, a duel challenge (both
`duel_wager_request`, the game's own Duel button, and the older
`duel_request`), the trade requests (`trade2_invite`, `trade_offer`), party
and clan invites, and a friend request's chime (`friend_request_in`).
Adding a type is one line. A dropped message shows no card, line, popup or
sound; the request runs out on the sender's side as an unanswered one does.

`NOT_BLOCKED` lists the social types left out on purpose, each with why:

- `friend_dm`, `friend_dm_backlog`: whether Block stops direct messages is the
  owner's decision, pending;
- `friend_accepted`: an answer to your own request;
- `pvp_threat`: a warning that an attack is coming; hiding it would not stop
  the attack.

`trade2_invite`'s case still asks `isBlockedId` itself too, until lane A2's change beside it is merged. `chat.js`'s handlers still ask `isBlockedId` themselves (a second filter, kept
for their own tests). Before v2.3.4365 the requests were checked handler by
handler and `duel_wager_request` was missed (V6 N2-18).

The friend Requests tab and its badges read `friendsSync.js`
`friendsSrv.requestsIn()`, which leaves a blocked player's request out; it
stays on the worker and shows again when they are unblocked.

## The trap

Never add an `isBlockedId` check to one handler for a new social message: add
a row to `BLOCKED_SOCIAL` (or to `NOT_BLOCKED`, with why). Never write
`bt_blocked` from a panel's copy: go through `setBlockedId`. A copy written
back erases every block made elsewhere since it was read.

## Tests

- `server/test/blocked-asks.test.mjs`: the two writers, the table, a scan of
  processGameEvent that fails when a case raising a request card, a chat line,
  a DM or a request-named type is in neither table, and the Requests rows;
- `mp-blockasks`: on a phone in the Wheel, the three request cards from a
  blocked player (both duel types), and a block saved elsewhere surviving
  Block and Unblock of another player on their card.
