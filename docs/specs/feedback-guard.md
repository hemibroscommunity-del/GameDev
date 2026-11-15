# The feedback board's words, its owner's key, and a window that throws (v2.3.5593)

The red team, 2026-11-14 (RT-3, `docs/security/rt3-findings.md` on its
branch, S3 and P1), proved on the node room:

- **Anyone on the internet could write to the Feedback board, under any
  name, and nobody could take a post down.** `/api/feedback` goes from the
  worker's router straight to the Feedback object: before the origin lock,
  outside the room's wire door, no session. A name of 5,000 characters was
  kept; so was a name that was an OBJECT, and `/list` served it back.
- **One such post blanked the game.** The Feedback panel prints the name as
  React text; React throws on an object; the page had no error boundary, and
  React unmounts the whole root on an error nothing catches. Every player who
  opened Feedback lost every screen until they reloaded.
- **The crash feed was public.** `GET /api/feedback/crashes` handed every
  crash report (a phone's browser name, log lines naming a character) to
  anyone.

And the red team's RT-1 (`docs/security/rt1-findings.md` on its branch, N2
and N3), folded in at the planning session's word:

- **Anyone could spend the account's day of writes in under 3 minutes.**
  Every post, vote and crash report was paced only by an id the caller makes
  up, and each pace was a row never deleted: 200 of 200 posts with fresh ids
  were taken in a second, 3 rows each. The free plan's 100,000 rows are the
  whole account's; past them every save in the game fails until midnight.
- **A 1.9 MB name was a row**, and `_stats` (one key for every topic ever
  posted) reached SQLite's 2 MB, after which every new topic's post failed.

## What changed

| Where | What |
|---|---|
| `server/src/feedback.js` `submit` | A name and a topic must be strings; each is cleaned as a chat line is (`chatguard.js cleanChatText`: hidden and direction characters out, spaces collapsed, a run of one letter at most 6) and cut to `FEEDBACK_NAME_MAX` (24) and `FEEDBACK_TOPIC_MAX` (32). Not a string, or nothing left: refused (`Missing fields`). |
| `feedback.js` `sanitize` | What the board serves is cleaned the same way, so a ticket kept before this version (an object for a name) reads as words: its name `Bro`. |
| `feedback.js` `DELETE /ticket?id=` | The owner takes a post down, and its topic's count with it. Behind `ADMIN_KEY` (`Authorization: Bearer`, compared by hash as `admin.js _adminAuth`); a plain 404 without it. |
| `feedback.js` `GET /crashes` | Behind the same key; a plain 404 without it. |
| `feedback.js` `_paced` | Posts, votes and crash reports paced in MEMORY by the caller's address (`flood.js requestIp`, set by Cloudflare's edge; none locally, not counted; an IPv6 line by its /64, `feedbackAddr`, the same rule as RT-1's `flood.js ipKey`, 5581, a local copy until that lands), by the id it claims, and for the whole game, an hour each (`FEEDBACK_PACE`: 5 / 5 / 60 posts, 12 / 12 / 120 crash reports, 60 / 60 / 150 votes), under a budget of 300 ROWS an hour for the whole object (a post 2, the rest 1): at most 7,200 rows a day, 7% of the free plan's 100,000; the game's busiest day so far wrote 747. A refusal writes nothing; no `rate:` or `crashrate:` row is written. One claimed id an address a ticket for a vote. A deploy resets them (rule 11: right for a flood's limit). |
| `feedback.js` `_stats` | At most `FEEDBACK_PACE.STATS_KEYS` (100) topics kept. |
| `feedback.js` `DELETE /sweep` | The owner's key: every ticket row over 4 KB and the old pace rows taken away, `_stats` rebuilt from the tickets left. |
| `feedback.js` `_boardOpen` | **KILL SWITCH `feedback: false`** in the live flags: no posts, votes or crash reports; reading stays. The Feedback object keeps no flags: it reads the room's (`GET /api/admin/flags` with the owner's key, over the binding) at most once a minute, and only for a write the paces took: a refused write never asks the room, and a burst shares one read. No key or no answer: open. Its row in the switch table. |
| `server/src/wire/http.js` | `/api/feedback/crashes` is an `admin` row now; a new row, `http:/api/feedback/ticket DELETE`; the submit row says what is refused and cut. |
| `src/ui/lazyPanel.js` `PanelGuard` | Every window made by `lazyPanel` (the rare windows, the dashboard's pages) draws inside an error boundary. A window that throws shows the "Couldn't open this" card in its own words ("This window hit a problem", `data-lazy-cantopen="threw"`), with Reload and Close; the game plays on; the error goes to the crash feed (`recordCrash('panel', ...)`); `window.__btLazyCode.cards.caught` counts them. Opened again, the window is drawn afresh. |
| `src/ui/mobile/dash/FeedbackPanel.jsx`, `src/ui/panels/FeedbackPanel.jsx` | Every field of a ticket printed as a string (`Bro` for a name that is not one), whatever a worker serves. |
| `tools/qa/mp/mp-killedpage.mjs`, `tools/qa/qa-telemetry.mjs` | Read the crash feed with the harness's key. |

## v2.3.5594: a name that reads as the game or its staff

`server/src/reservednames.js` (`nameReadsAsStaff`, no imports, so card MOD's
name rules use the same function for a character's name): a post's name that
reads as the game, its team or its staff is REFUSED ("That name reads as the
game or its team. Post under your own."), never rewritten. The words (the
planning session's list, each with its plural and long form): BroTown,
BroTown Team, Team, Admin, Administrator, Mod, Moderator, Staff, Owner, Dev,
Developer, Official, System, Support, GM. A name is folded first (NFKC, lower
case; 0 o, 1 i or l, 3 e, 4 a, 5 s, 7 t, 8 b, @ a, $ s, ! i, | l; the
Cyrillic and Greek letters that look Latin) and read two ways: its words
("Team Rocket", "M0d"), and the whole with nothing between the letters ("A d m
i n"; `brotown` anywhere: "xX_Bro_Town_Xx"). A word that only contains a short
one ("Modest", "Devin", "Teammate") passes. Tickets kept before are served as
they are. `feedback.test` 12, and four break proofs (the check off, no
look-alikes, no joined reading, and a substring match, which refuses "Modest").

## Decided for the owner while away

- **The switch `feedback` closes the board; it never reopens the holes.**
  Thrown, the board takes no writes at all (the owner's lever in a flood).
  The name rules, the owner's key on the crash feed and the paces have no
  switch: turning one off would only bring a hole back. The window guard
  changes nothing while no window throws.
- **The paces' numbers** (5 posts an hour an address, 60 for the game, 300
  rows an hour for the object): the old per-id 5 kept, and game-wide lines
  far above a real day's reports (the board holds a few hundred posts in all
  its life) and far below a flood's rows. If one ever refuses a real player,
  the owner's lever is the numbers in `FEEDBACK_PACE` (a one-line PR); the
  switch `feedback` closes the board, it does not lift the limits.
- **No button yet for taking a post down, the sweep or the crash feed.**
  The Test panel is the place (`src/ui/panels/DevPanel.jsx`, which six
  running cards hold); the planning session gave them to card OPS. Until
  then a session with the key has the commands (`docs/OPERATIONS.md`, "The
  feedback board").
- **`guards/switches-thrown` skips `cold-flags.test.mjs`** (a stopgap the
  planning session approved, outside this card's files): that suite tests
  the cold flag cache, which the guard's preload warms by design, so it
  failed under the preload with any switch thrown; `feedback` was the first
  new liveops switch to draw it in. Card T owns the lasting mend.

## Not done here (the red team's list routes them)

- A post still names itself: anyone can post as "BroTown Team" (S2, what a
  name may be, and P1's "a post takes its name from the session").
- A vote is still counted by the id it claims (paced now, by address too).

## Tests

- `server/test/feedback.test.mjs` §3-6: RT-3's proofs as checks; §7-11:
  RT-1's (the paces by address and for the game, no pace rows, the topics'
  cap, the sweep, the switch read once a minute, the /64, the rows' budget,
  one vote an address a ticket, a refused write asks nothing). Each rule's
  break proof, tried by hand 2026-11-15: the address not counted, the budget
  taken out, the /64 taken out, the vote rule off, the switch asked before
  the paces, the name not cleaned, the crash feed public, `_stats` uncapped:
  each turns its checks red.
- `tools/qa/mp/mp-panelguard.mjs`: a window whose script throws (the card,
  the game playing on, Close, drawn afresh), and a board served with objects
  in it by an older worker (the rows, no card, no page error).
