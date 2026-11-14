card: P
branch: claude/plan-p-7-tree-tiers (one branch a PR, each begun from the one before)
prs: #1713 (5241, merged); #1715, #1716, #1718, #1719, #1736 (5242-5246) ready; PR 7 (5247) working
state: working

## Done

- #1713 (5241, merged): `families.mjs` (200 families), `shipped.mjs`,
  `shipped.json` (3,225 rows; unsorted 0), spec part 1, SHAPES.
- #1715 (5242): `QA_MB_ROWS=1` rows at the fights, `fightmb.mjs`, the
  census `docs/plan/census/assets.md` (three runs, 11/11 each; a plain run
  within every line). 36 families hold 1 MB or more at the fight.
- #1716 (5243): `tools/assets/finish.mjs`; strip256, reduce256 and npc256
  call it (each compared: the same bytes as before).
- #1718 (5244): `tools/guards/asset-door.test.mjs`, eight holds, each break
  proof tried; `lookSheetSpec` in `lookUnpack.js` (446 specs the same).
- #1719 (5245): the 19 `.m4a` under `public/sfx/` removed (0.19 MB; nothing
  named them; the MP3 beside each plays); `shipped.json` 3,206 rows.

- #1736 (5246), backlog `npc-heads`: the portraits let go of once loaded;
  `artCache` 48.7 -> 45.8 (line 112 -> 109.1), `buffers` unchanged.

## Next

- PR 7 (5247), backlog `tree-tiers` as colour numbers (`?treenumbers=0`).

## Found

- 545 files in reach load by nothing (census; removal is the owner's yes);
  22.2 MB at the fight have no label (the renderers' bakes, not card P's).
- `families.mjs` keeps the `sfx-m4a` row (now no file): the next PR
  touching the table drops it.
- `mp-npclooks` 2 and 2b (the figures' heights, `paintTop` null) are red
  with PR 6's change on and off alike: a question about the test.

## Needs

- Answered: a numbers PR may raise `buffers` by what it moves there; the
  owner: slimes as you walk (after H: `zoneTextures.js`), effects' twins on.
- The backlog's `pack-page` waits for card H's `done`.
