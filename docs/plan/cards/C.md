# Card C: the wire, read (step 4.1's census, as a document)

**Starts:** day one, beside W and S. It reads; it changes no code.
**Read:** `CLAUDE.md`; the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md`; step 4.1 and pillar 11; `docs/ARCHITECTURE-HANDOFF.md`;
`docs/WIRE-PROTOCOL.md` (skim).
**Tags:** 5029.
**Browser:** none. Fan out readers by handler family: they only read.

## PRs, in order

1. **(tag 5029) `docs/plan/census/wire.md`**, with your status file. A
   docs PR: it deploys nothing.
   - **One row for each of these, counted from the code** (the counts are
     a guide; yours are the truth):
     - every `case` of the server's router (`server/src/index.js`, after
       `_onMessage`; about 139);
     - every type in `PRIVILEGED_EVENTS` (about 96) and `RELAY.TYPES`
       (about 26);
     - every HTTP route, `/api/*` and `/dev/*` (about 47);
     - every case of the phone's direct switch
       (`src/networking/wsClient.js`; about 88).
   - **The columns** (use these until `docs/SHAPES.md` is merged; if it
     then names another, add it in a second pass):
     - the name, the direction, and the file and line of its handler;
     - where it comes in (the socket, an HTTP route, an admin route);
     - its envelope: how it arrives (alone, inside a bundle, as a relay);
     - the sender's phase: what state the handler demands of the sender
       today (joined, alive, in a fight, in a zone), or "none checked";
     - who may start it: a person, a helper with a grant, the system, the
       owner, or never a helper. Never a helper's: combat, movement,
       gathering, chat, trades, wagers, the account itself;
     - what it does: reads, changes your own state, moves value out,
       cannot be undone, speaks, plays;
     - its request id, if a repeat must not act twice (or "none: a repeat
       acts twice");
     - each field's trust: a request the server judges, a look, a claim it
       believes, a bounded claim (name its judge), or words a player wrote;
     - what "absent" means, and what a bad value gets (clamped, dropped,
       refused, or nothing).
   - Done when every key counted from the code has a row, and the page
     ends with the counts and how each was counted.

## Readings chosen for you

- **No code, no guard, no `server/src/wire/`.** That is card N, later, and
  it starts from your page.
- **Step 11.1** ("who may start a thing") is a column here, not a PR.
- **Found, not fixed.** A claim the plan's 4.2 does not list, a route with
  no check, a field nothing reads: one line each under Found, with the file.
- Card A will add a `report` message later; it is not yours to add.
- When this PR is `ready`, stop. A new session takes card N.

## Not yours

Everything but your two files.
