card: MOD
branch: claude/plan-mod-card (this card's words; each PR its own branch from main)
prs: the card (5620, working); RT-3's #1869 (findings, draft) and #1878 (5593, the feedback board) before it
state: working

## Done

- RT-3's red team: findings #1869 (draft, the planning session folds it); the feedback board #1878.

## Next

- This card's PR (5620), then PR 1 (5621): the silence lever and a freeze that holds the device.

## Found

- `mp-lazyfail` is red on main: it cannot find the More page's "achievements" tile on a local worker (checked on main without any change): a question about the test (tools/qa/mp/mp-lazyfail.mjs).
- `guards/switches-thrown` (card T): its preload warms the flags as a room is made, so `cold-flags.test.mjs` fails under it with ANY switch thrown (`__bt_none__` too); the PR run skips the baseline, so the first liveops-system switch born after 5301 trips it (#1878's `feedback`).

## Needs

- The owner (through the planning session): the slur list's words; new-player protection in No man's land; whispers from friends only for a new character; a hold on a new character's trades. None is built until their word.
- Card K: where the silence check goes (the wire door for every `speaks` row, or each lane); PR 3 is in K's `chatmod.js`.
- Which card may add the Test panel's Silence buttons (`DevPanel.jsx`: A, E, K, L, T, V).
