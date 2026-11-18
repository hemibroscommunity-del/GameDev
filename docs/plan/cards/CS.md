# Card CS: the cost switches ON, and a usage meter

The OWNER's decision, in their own words (2026-11-17): "I think turn all of
them on then we monitor usage cost". Quote it in the PR body and each
switch's comment.

Tags: block 6000-6019, one a PR (the gatekeeper registers it in
tools/dev/tag-blocks.json: never edit that file). Effort high. Browser light
(questline; seat-hold's scenario if one exists).

- PR 1 (6000): the six default to ON, each still turned off by its live flag
  set to false: `reqstamp` (reqonce.js `_reqStampOn`), `fullsnap`
  (playerrestore.js/admin.js), `xferescrow` (xfer.js `xferEscrowOn`),
  `resetbook` (persistence.js/playerrestore.js/worldsum.js), `seathold`
  (seathold.js `seatHoldOn`), `freezedevice` (silence.js). Change ONLY each
  reader's default (e.g. `f.reqstamp === true` -> `f.reqstamp !== false`), not
  the behaviour behind it. Update each row in switches.mjs (its `on`, the off
  text: "unset, the default, ON since v2.3.6000 (the owner)"), the tests that
  assume the old default (req-once FAIL 10, restore, xfer, seat-hold, silence,
  opid-audit), and cost-guard.test's lines with the rows each adds, written in
  the PR body (rows a request/day/restart; CLAUDE.md: never raise a line
  silently). A storage key now written by default needs its registry row and
  marks if it lacks one (precheck storage-keys). Done when server suite,
  precheck and questline pass; the PR body lists, per switch, what it writes
  and how to turn it off from the phone (Test panel, Live flags, Set a switch,
  <name>, off).
- PR 2 (6001): a usage meter for the owner: the worker counts, in memory only
  (NO storage write for the meter itself), the rows it writes and reads and
  the messages it sends since the room started and today (UTC), by kind (the
  six switches' rows named apart), and the Test panel shows it in plain words
  with an estimate against Cloudflare's included usage (free plan: about
  100,000 rows written a day; paid: 50 million a month). Through the existing
  admin/dev levers (devtools.js) and the Test panel's code in src/debug/ only.
  A new message the server sends needs its `out` row in server/src/wire/: card
  K2 holds wire/, so prefer an HTTP /dev/ read over a socket message; if a wire
  row is truly needed, stop and ask. Add a short "Watching the cost" section
  to docs/OPERATIONS.md: the meter, and the Cloudflare dashboard (Workers &
  Pages, brotown-server, Metrics; Billing) as the truth. Done when a server
  test holds the counts, the panel shows them, and precheck passes.

Not yours: join.js, relay.js, server/src/wire/ (K2),
market/gold/inbox/store/storeoffer (RV), src/ui/BroTown.jsx (M),
src/rendering/ (M2). If a switch's reader is inside one of those files, change
only that one reader line and say so in your status, so the gatekeeper lists
you after that card. Cards K4, V3, V5 add new lines to liveops.js and
switches.mjs at the same time: edit only your six rows' lines; merge main
before your last push.
