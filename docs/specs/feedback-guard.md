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

## What changed

| Where | What |
|---|---|
| `server/src/feedback.js` `submit` | A name and a topic must be strings; each is cleaned as a chat line is (`chatguard.js cleanChatText`: hidden and direction characters out, spaces collapsed, a run of one letter at most 6) and cut to `FEEDBACK_NAME_MAX` (24) and `FEEDBACK_TOPIC_MAX` (32). Not a string, or nothing left: refused (`Missing fields`). |
| `feedback.js` `sanitize` | What the board serves is cleaned the same way, so a ticket kept before this version (an object for a name) reads as words: its name `Bro`. |
| `feedback.js` `DELETE /ticket?id=` | The owner takes a post down, and its topic's count with it. Behind `ADMIN_KEY` (`Authorization: Bearer`, compared by hash as `admin.js _adminAuth`); a plain 404 without it. |
| `feedback.js` `GET /crashes` | Behind the same key; a plain 404 without it. |
| `server/src/wire/http.js` | `/api/feedback/crashes` is an `admin` row now; a new row, `http:/api/feedback/ticket DELETE`; the submit row says what is refused and cut. |
| `src/ui/lazyPanel.js` `PanelGuard` | Every window made by `lazyPanel` (the rare windows, the dashboard's pages) draws inside an error boundary. A window that throws shows the "Couldn't open this" card in its own words ("This window hit a problem", `data-lazy-cantopen="threw"`), with Reload and Close; the game plays on; the error goes to the crash feed (`recordCrash('panel', ...)`); `window.__btLazyCode.cards.caught` counts them. Opened again, the window is drawn afresh. |
| `src/ui/mobile/dash/FeedbackPanel.jsx`, `src/ui/panels/FeedbackPanel.jsx` | Every field of a ticket printed as a string (`Bro` for a name that is not one), whatever a worker serves. |
| `tools/qa/mp/mp-killedpage.mjs`, `tools/qa/qa-telemetry.mjs` | Read the crash feed with the harness's key. |

## Decided for the owner while away

- **No live flag.** The Feedback object cannot read the room's live flags,
  and each change only refuses a bad value or closes a door to strangers; a
  switch would reopen the hole. The guard changes nothing while no window
  throws.
- **No button yet for taking a post down.** The Test panel is the place
  (`src/ui/panels/DevPanel.jsx`), and six running cards hold that file; the
  page's requests also leave only through the action door
  (`src/game/actions.js`, card K), whose `act()` carries the session's token,
  not the owner's key. Until a card adds it: `docs/OPERATIONS.md`, "The
  feedback board".

## Not done here (the red team's list routes them)

- A post still names itself: anyone can post as "BroTown Team" (S2, what a
  name may be, and P1's "a post takes its name from the session").
- The rate limit is still keyed on the id a post claims.
- Votes are still keyed on a claimed id.

## Tests

- `server/test/feedback.test.mjs` §3-6: the red team's proofs as checks.
- `tools/qa/mp/mp-panelguard.mjs`: a window whose script throws (the card,
  the game playing on, Close, drawn afresh), and a board served with objects
  in it by an older worker (the rows, no card, no page error).
