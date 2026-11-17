# Invite pace (v2.3.5624, card MOD PR 4)

The red team (2026-11-14, RT-3 S5, `t6-invites.mjs`): a pest pressing Trade at
a victim ten times a second for ten seconds (each open cancelled, so the next
was fresh) put 100 invite cards on the victim's screen, each a popup and a
sound (`gameEvents.js` trade2_invite). Party invites were already paced
(`party.js` `INVITE_REPEAT_MS`, v2.3.1970: 2 got through). A friend request,
its decline and the request again had no pace either.

## The rule (party.js's, copied)

- **Trade** (`trade2.js` `_handleTrade2Open`): one invite CARD an inviter to
  the same target per `TRADE2.INVITE_REPEAT_MS` (5 s). The invite itself is
  recorded as ever (a mutual open, the rejoin's re-send of a live card: the
  first build that dropped the whole repeat failed `trade2`, `trade-door` and
  `rejoin-resend`), only the repeat card to the target is not sent. A trade
  that opens starts the pair's pace over, so a real second trade is never
  held. Kept in its own map (`_t2InviteCardAt`), not `_t2Invites`: a cancel
  deletes the invite, and open-cancel-open was the 100 cards.
- **Friends** (`friends.js` `_handleFriendRequest`): one new request card a
  player to the same target per `FRIENDS.REQUEST_REPEAT_MS` (5 s), dropped
  before it is written or sent; the answers before it (already friends, a
  duplicate request, too many requests) are unchanged.
- Both maps are capped (`PACE_KEYS`, 2,000; the oldest go first), so they
  need no clearing on leave.
- **KILL SWITCH `invitepace: false`** in the live flags: every card goes, as
  before.

## Tests

`server/test/invite-pace.test.mjs`: 100 trade opens in 10 s put at most 3
cards up (t6-invites.mjs: 100); another target is not held back; a real trade
still opens; a friend request-decline loop puts at most 3 cards up; a
re-request of a friend still answers at once; the switch. Break proofs (by
hand, 2026-11-15): either pace removed, the trade pace read from
`_t2Invites` (which a cancel clears), the switch ignored: each turns its
checks red.
