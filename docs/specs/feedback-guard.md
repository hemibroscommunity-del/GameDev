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
| `feedback.js` `_paced` | Posts, votes and crash reports paced in MEMORY by the caller's address (`flood.js requestIp`, set by Cloudflare's edge; none locally, not counted), by the id it claims, and for the whole game, an hour each (`FEEDBACK_PACE`: 5 / 5 / 200 posts, 12 / 12 / 200 crash reports, 60 / 60 / 2,000 votes). No `rate:` or `crashrate:` row is written. A deploy resets them (rule 11: right for a flood's limit). |
| `feedback.js` `_stats` | At most `FEEDBACK_PACE.STATS_KEYS` (100) topics kept. |
| `feedback.js` `DELETE /sweep` | The owner's key: every ticket row over 4 KB and the old pace rows taken away, `_stats` rebuilt from the tickets left. |
| `feedback.js` `_boardOpen` | **KILL SWITCH `feedback: false`** in the live flags: no posts, votes or crash reports; reading stays. The Feedback object keeps no flags: it reads the room's (`GET /api/admin/flags` with the owner's key, over the binding) at most once a minute, and only when someone writes. No key or no answer: open. Its row in the switch table. |
| `server/src/wire/http.js` | `/api/feedback/crashes` is an `admin` row now; a new row, `http:/api/feedback/ticket DELETE`; the submit row says what is refused and cut. |
| `src/ui/lazyPanel.js` `PanelGuard` | Every window made by `lazyPanel` (the rare windows, the dashboard's pages) draws inside an error boundary. A window that throws shows the "Couldn't open this" card in its own words ("This window hit a problem", `data-lazy-cantopen="threw"`), with Reload and Close; the game plays on; the error goes to the crash feed (`recordCrash('panel', ...)`); `window.__btLazyCode.cards.caught` counts them. Opened again, the window is drawn afresh. |
| `src/ui/mobile/dash/FeedbackPanel.jsx`, `src/ui/panels/FeedbackPanel.jsx` | Every field of a ticket printed as a string (`Bro` for a name that is not one), whatever a worker serves. |
| `tools/qa/mp/mp-killedpage.mjs`, `tools/qa/qa-telemetry.mjs` | Read the crash feed with the harness's key. |

## Decided for the owner while away

- **The switch `feedback` closes the board; it never reopens the holes.**
  Thrown, the board takes no writes at all (the owner's lever in a flood).
  The name rules, the owner's key on the crash feed and the paces have no
  switch: turning one off would only bring a hole back. The window guard
  changes nothing while no window throws.
- **The paces' numbers** (5 posts an hour an address, 200 for the game): the
  old per-id 5 kept, and a game-wide line far above a real day's reports
  (the board has a few hundred in all) and far below a flood's rows.
- **No button yet for taking a post down.** The Test panel is the place
  (`src/ui/panels/DevPanel.jsx`), and six running cards hold that file; the
  page's requests also leave only through the action door
  (`src/game/actions.js`, card K), whose `act()` carries the session's token,
  not the owner's key. Until a card adds it: `docs/OPERATIONS.md`, "The
  feedback board".

## Not done here (the red team's list routes them)

- A post still names itself: anyone can post as "BroTown Team" (S2, what a
  name may be, and P1's "a post takes its name from the session").
- A vote is still counted by the id it claims (paced now, by address too).

## Tests

- `server/test/feedback.test.mjs` §3-6: RT-3's proofs as checks; §7-10:
  RT-1's (the paces by address and for the game, no pace rows, the topics'
  cap, the sweep, the switch read once a minute).
- `tools/qa/mp/mp-panelguard.mjs`: a window whose script throws (the card,
  the game playing on, Close, drawn afresh), and a board served with objects
  in it by an older worker (the rows, no card, no page error).
