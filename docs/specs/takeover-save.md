# A second join of the same character saves what a close would save (v2.3.4377)

## The harm

When the same character joins again while the worker still holds its old
socket (a second tab, or a phone reconnecting over a line the worker has not
noticed is dead), `server/src/join.js` replaces the old socket without running
`webSocketClose` ("superseded by reconnect") and then reads the `rpg:` record
back from storage over the live state.

A close first flushes the record's unsaved part (`_regenDirty`,
`index.js` webSocketClose). The takeover did not, so it dropped:

- damage taken above 25% health in the last `REGEN_SAVE_MS` (10 s): hits are
  coalesced out of the near-death band (`persistence.js` `_saveRpgVitals`);
- a paced tap past the burst, such as an equip (`flood.js` `_saveRpgPaced`);
- up to 10 s of regen (harmless, but the same hole).

So a script could reconnect to heal, and an honest player who reopened a tab
lost the weapon they had just put on. Found by the state-machine sweep
(2026-11-03, V3 S2-13 / S1-4 / S2-1 "persistence").

## The rule

The takeover does the close's SAVE duties before the state is rebuilt:

| close duty | on a takeover |
|---|---|
| `_regenDirty` flush (`_saveRpg`) | **done now** (v2.3.4377), awaited, only when dirty |
| `_botfpFlush` | done since v2.3.3174 |
| daily quests (`_drOnClose`) | nothing to do: the live copy is kept across a join |
| pets, codex, catches (`*DirtyCopy`) | nothing to do: the cache is kept and reused by the join |
| paced lanes (`_paceFlush`) | nothing to do: keyed by player, not socket; a held write still fires |
| achievements | hold nothing unwritten |

Nothing is written when nothing is dirty, so a clean takeover costs no extra
row (handoff rule 10; `cost-guard.test`).

## Not done on a takeover (waits on the owner)

What should happen when a second tab joins in the middle of a fight is the
owner's call, so a takeover still does NOT run: the linger, the duel's away
clock, the trade's cancel (a trade must survive an ordinary phone reconnect),
or the No man's land body rule. Also left: a new close code for "join failed",
the admin restore's refusal while a body lingers, `_achvForget` in
`_lingerEnd`, and the arena eat gate.

## Kill switch

`takeoversave: false` in the live flags skips the save (the behaviour before
v2.3.4377). Nothing set, or `true`, keeps it on. No cap: the phone sees no
new message.

## Tests

`server/test/takeover-save.test.mjs` (real GameRoom): the damage is kept, a
paced equip is kept, a clean takeover writes no extra row, and the switch off
and on. Before the fix 4 of its 11 checks failed.

## The lesson

TRAPS §162 ("every way a session ends does the close's duties"): the takeover
is one of those ways. This is the second duty patched into it by hand (the
first, v2.3.3174, the bot summary); a new close duty that SAVES something must
be added here too, or the takeover gives it back.
