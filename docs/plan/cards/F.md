# Card F: the repository's weight, and the uploads' papers (steps 9.0, 9.4)

**Starts:** day one, beside W and S. It moves and changes no file of art.
**Read:** `CLAUDE.md`; the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md`; pillar 9; `CREDITS.md`; `docs/specs/provenance.md`.
**Tags:** 5027, 5028.
**Browser:** none.

## PRs, in order

1. **(tag 5027) The weight.**
   - Files: new `tools/assets/weights.mjs`, new `tools/assets/sources.json`.
   - `weights.mjs` prints the bytes git tracks under each top folder. It
     REPORTS; it fails nothing (a gate is a guard, and `tools/guards/` is
     card B's: ask for one under Needs).
   - `sources.json`: one row for each file under `assets/`: its path, its
     bytes, the SHA-256 of its bytes. Nothing is renamed or moved.
   - Done when both run clean and the PR's words give today's numbers.
2. **(tag 5028) The uploads' papers.**
   - Files: new `tools/assets/uploads.mjs`, new `tools/assets/uploads.json`.
   - One row for each loose file at the top of the repository that the
     owner uploaded: today 13 (7 PNG, 3 JPEG, a video, 2 JSON files of
     anchors). Each row: its name; its bytes; the SHA-256 of its bytes;
     the date of its first commit on GitHub; whether it carries a signed
     record of the tool that made it, and that tool's name; and the
     owner's columns, left EMPTY until answered: what it is for, what made
     it, AI-made or not, the prompt or style key, the licence, still
     wanted or not.
   - The files stay exactly where they are, byte for byte.
   - Done when every loose upload has a row, and the questions below are
     put to the owner once.

## Readings chosen for you

- **Call them uploads.** "Inbox" is the game's mail (`server/src/inbox.js`).
- **No limits are invented.** Record each file's pixels, seconds and
  bytes; the limits are the owner's to set later.
- **`CREDITS.md` stays the home of licences for what ships.** A row here
  points at its line there when it has one; do not copy it.
- **"Sessions check out without `assets/`" is dropped**: nine server
  suites read `assets/`, so a checkout without it fails precheck. Write
  that under Found.
- The second PR's branch sits on top of the first's.

## Ask the owner, once

- For each of the 13 files: what is it for, what made it, and is it still
  wanted?
- May the credits say "AI-made" (call 19)?

## Not yours

Every picture and sound; the family table and the gate (card P, later).
