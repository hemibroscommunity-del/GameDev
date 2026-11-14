card: P
branch: claude/plan-p-6-npc-heads (one branch a PR, each begun from the one before)
prs: #1713 (5241, merged); #1715, #1716, #1718, #1719 (5242-5245) ready; PR 6 (5246) working
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

## Next

- PR 6 (5246), backlog `npc-heads` (2.96 MB): the dialogue portraits let go
  of once loaded (`?npcheads=0` off); three runs of mp-membudget.

## Found

- 545 files in reach are loaded by nothing by default (draw `none`): the
  census lists them; removing any is the owner's yes.
- At the fight 22.2 MB of textures have no label (canvases 16.6 on the
  chip): the renderers' bakes, not a family; naming them is not card P's.
- `families.mjs` keeps the `sfx-m4a` row (now no file): the next PR
  touching the table drops it.

## Needs

- Asked the planning session (2026-11-14): (1) may a PR turning pictures
  into colour numbers raise `buffers` (21.2 of 22) by what it moves there?
  (`tree-tiers`: artCache -5.6, buffers +1.4); (2) slimes loaded as you
  walk?; (3) the effects' p256 twins. Those wait; the next free one goes.
- The backlog's `pack-page` waits for card H's `done`.
