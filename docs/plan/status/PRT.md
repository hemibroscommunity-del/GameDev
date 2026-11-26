card: PRT
branch: claude/determined-cray-dz4dpu
prs: one draft PR from this branch (6720), opened by the session that wrote the card
state: ready

## Done

- PR 1 (6720): the idle census (`tools/qa/mp/idle-census.mjs`,
  `mp-idlecensus.mjs`), `mp-phoneframe` + `BT_PF_ALLOC`, `BT_PF_REACT`,
  `fightreal`; the last four cells' answers (`game/hereCells.js`,
  `?herecells=0`); the Element Burst button drawn only on a change
  (`game/drawOnChange.js`, `?burstidle=0`).
- The findings: `docs/plan/census/PRT-findings.md`.

## Measured (the test box, 2026-11-26)

- Standing at the arrival point: questions to the ground worker 11.4 a
  second -> 0; the burst button 1.0 render a frame -> 0; commits 21.9 -> 15.1.
- Script outside the frame at 30 frames a second: 16.3 -> 14.3 ms a second
  (three rounds). At 11: no difference in the scatter. Not on a phone.

## Next

- PR 1 is ready for a sitting. Job 2 (the band and the combat buttons)
  waits for the new dashboard and the controller on main: their files.
- Jobs 3 to 7: the card. None started, none urgent.

## The owner's

- How often the room may send (findings row 7): a fight's feel.
- What a returning player's browser may keep (row 9). The live site keeps
  every sprite 4 hours today, by Cloudflare's own default: a changed
  picture with no version in its address can be 4 hours late on a phone
  that has the old one.

## Found

- This branch adds PRT's block to `tools/dev/tag-blocks.json` and rows to
  the switch table and the system map; sitting 68's stacks touch the same
  three files: the later of the two merges main first.
