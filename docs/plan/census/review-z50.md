# The gatekeeper's review, sitting 50 (card Z; tag 6264)

Taken 2026-11-18 on `main` aaeb5ccc (sitting 49's docs PR #2212 merged).
The cards running came from the planning session
(session_01LccHaivkofvyigGL4fgBWZ); the heads from WD2's own messages,
checked against GitHub at about 15:55 UTC. Tags bare.

## What was open

| card | PR(s) | state on GitHub | status file |
|---|---|---|---|
| WD2 | #2211 (6320), #2213 to #2222 (6321 to 6330), #2223 (6331) | all base `main`, not drafts, every check green (#2223: see the list) | `ready` on the top of the stack (#2223, the card's last); the lower branches still say `working`, overwritten by the top's as the stack lands |
| HB2 | none (`claude/plan-hb2-1-coach` 3f72925e pushed) | | `working` |
| RR | none | census sample in batch 3 of 8 (its message: not this sitting) | |
| EN | none (6203) | copperwaist red 2 of 4, fish-top-evict to mend (its message: not this sitting) | |

## Step 3: WD2 against its card

- **Files**: each PR's own files are its screens under `src/ui/**`, its
  `src/data/say/<screen>.js`, and `player-words.test`'s line; PR 1 adds
  `src/game/say.js`, `tools/guards/say.test.mjs`, the card and the status
  file. Outside the card, each with the planning session's answer named in
  its PR: `tools/guards/lib/systems.mjs` + `docs/SYSTEMS.md` (Q1, `say` in
  the desktop system); `server/test/desk-keys` 7k (#2213), `owner-icons`
  3b (#2215), `desk-words` 5 (#2222), each regex unchanged and pointed at
  the table too (Q3). Nothing in `server/src`. No file another open
  branch holds (HB2's are `afterPaint.js`, `doorPrompt.js`,
  `mayorScreen.js`, `QuestCoach.jsx`).
- **Tags**: one a PR, 6320 to 6331 in order, every commit tagged.
- **Done when**: the guard's in-place line falls at every PR, 4995 ->
  4990 -> 4862 -> 4763 -> 4677 -> 4599 -> 4523 -> 4463 -> 4396 -> 4334 ->
  4278 -> 4222 -> 4120 (worker 385 unchanged); the card's 12 PRs done and
  what is left per wave reported in the status file (W1 2041 in 136
  screens; W2 375; W3 1212; W4 328; W5 164; W6 385).
- **Sitting 49's mend** (the comments naming `server/test/say.test`): done
  on every branch (d1ff2935 and its merges up the stack).

## Step 4: the review (`/repo-review`)

The stack changes no `server/src`, no wire, no storage, no economy: angles
A (trust), B (deploy order), C (echo-stomp), D (settlement), E (keys: say.js
reads its tables with own-property checks) and G (Durable Object
concurrency) are clean by inspection. Angle F (removed behaviour: are the
words the same?) is the one that matters here, and four finders took the
14 screens, every removed string traced to its row:

- **Clean on a phone, every screen**: byte-identical text (the non-ASCII
  characters compared by code point), JSX spacing kept, the plural rows
  choosing as the old `n === 1` did, numbers formatted before they go in,
  every key a screen reads in its table and no row unused, every `{name}`
  given its part, no React element through `say()`, React keys on every
  `sayPieces` part. The door screens (#2223): no handler, condition,
  refusal code (`unavailable`, `rate`, `locked`, `device`, `fight`,
  `market`) or `data-*` attribute changed; the imports resolve (an esbuild
  bundle of LoginScreen and NameModal).
- **On a computer, "tap" now reads "click"** where a row was not run
  through `deskWords()` before, as the card's reading allows: PlayerPaint
  8, HeroExpanded 1 (a tooltip), TradeWindowPanel 3, ClanPanel 3,
  LoginScreen 1. WD2's status file lists them.
- **Mends, sent to WD2 for a later PR (no hold: every screen here was
  checked by hand)**:
  1. `tools/guards/say.test.mjs` §7 checks only keys written in single
     quotes with the file's own prefix: a double-quoted or backtick key,
     a key built with `+`, `import { SAY as T }` or a second table import
     go unchecked (read from its regex). `say.js`'s header claims more.
  2. §6's "a key in two files" cannot fail (the prefix rule forbids it);
     a key twice in one table is caught only by eslint `no-dupe-keys`.
  3. Nothing checks a row's `{name}`s against the parts passed (a
     misnamed part shows '').
  4. `LoginScreen.jsx` ~445: "U+2022 dots as escapes" is stale (the dots
     are literal in the table now; the build still writes ASCII).
  5. `desk-words` 5 now finds only the `sayPieces` call: it no longer
     proves the Pets hint is deskWorded if that row becomes
     `{ phone, desk }`.
- Guards run on the stack's top: `say.test` (14 tables, 880 rows),
  `player-words.test`, `npm test -- desk-keys owner-icons desk-words`:
  green.

## Step 5b: what GitHub will merge

Every PR's base is `main`. No branch of the stack ever merged `main` in, so
in a scratch copy from `main` aaeb5ccc, merging each with a merge commit in
order, every branch had ONE merge base with the `main` above it, and none
conflicted (the tree 6dd9d60b).

## Step 5: the rehearsal

REHEARSAL
