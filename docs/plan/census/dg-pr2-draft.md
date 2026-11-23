# Card DG, PR 2 draft (not a PR; a handover, 2026-11-23)

`tools/guards/lib/writesOf.mjs` is the drafted shared scanner (@babel, from
server/node_modules: `cd server && npm install` first). `writesOf(code,
{ fields, containers })` and `refsOf(code, names)`.

Tried on every plant line of plants1-5 wrapped in a function: every door
plant's write was found (GOLD-1..3, XP-1..3, HP-1..4, BAG-1..6, QUEST-1..3,
POINTS-1..2, STASH-1..2, SUM-1..2, XP-5); `refsOf` finds SEND-1's
`ws.send.bind` and PAY2-1's `this._goldGive.bind`. Not yet: GOLD-4
(`_applyCreditToPs` as a second caller), HIT-1/1b/4, HP-5 (another
receiver name for a legal door: refsOf reports them as `call` with
`recv: 'room'`; the door tests must count every caller by any receiver),
LEAVE-1..3, SEND-2/3.

Left to do for PR 2: its own suite (tools/guards/writes-of.test.mjs, each
spelling planted), then each door test (gold, bag, stash, life, points,
quest, xp, hit, session, send, tools/guards/action-door) moved onto it,
their allow-lists keyed by file + function + field instead of a line's
text; the `'*'` rows of bag-door and xp-door given their files. Delete this
file in PR 2.
