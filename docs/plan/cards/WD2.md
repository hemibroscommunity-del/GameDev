# Card WD2: every word a player reads in one table, waves W0 and W1 (step 8.8)

**Tags:** 6320 to 6339 (block registered by the next gatekeeper's PR; do NOT edit tools/dev/tag-blocks.json). One a PR, in order.
**Start from:** card WD (done): `docs/plan/cards/WD.md`, `docs/plan/status/WD.md`, the census `docs/plan/census/words.md`, the guard `player-words.test` (lines 4995 in place / 385 on the worker, only fall) and the spec `docs/specs/player-words.md` (the table's shape; the waves W0 to W6; "Every screen, by wave"). Follow the spec; where it chooses, it wins.
**You hold:** `src/game/say.js` and its node test (W0), the words table file(s) the spec names, the W1 screens under `src/ui/**/*.jsx` EXCEPT the ones below, the screens' own tests that read their words by text, and the guard's line numbers (lowering only). **Never edit:** `src/ui/BroTown.jsx`, `QuestCoach.jsx`, NavRail/OneBandColumns files, GearTab (card HB2), `src/rendering/**` (card EN), `src/networking/wsClient.js` and `tools/qa/mp/*` (card RR), `package.json`, `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md`, `docs/TRAPS.md`, `server/*`, `.github/`. Before each screen, check no open `claude/*` branch changes its file (`git diff --name-only origin/main...<branch>`); if one does, skip it and list it.
**Browser:** light: `playable` once per few PRs; the UI review capture (`tools/qa/ui-review/capture.mjs`) for a sample of each PR's screens. One browser job at a time; reap after.

## PRs, in order
1. **(6320) W0, the pilot**, as the spec says: `src/game/say.js`, its node test, and the first screen through it.
2. **(6321 onward) W1, the windows**, several small screens a PR (the spec's W1 list; a PR touches at most ~6 screens and one system), biggest word-counts first. Each PR: the words a player reads are IDENTICAL (same text, same place, same timing; words a computer player reads still go through `deskWords()`); the guard's in-place line lowered by the count moved; the screens' tests green; precheck green.
Stop after 12 PRs or when W1 is done (BroTown.jsx and HB2's screens aside), and report what is left per wave.

## Readings chosen for you
- Nothing a player sees changes. A word that is wrong or reads "Wheel"/"remnants" is listed for me, never fixed in passing.
- WD's Found: 96 "tap" words that skip `deskWords()`: list each you meet in your status; fix only when it sits in a screen you are moving and the spec's table form makes the computer word come from `deskWords()` with no visible change on a phone.
