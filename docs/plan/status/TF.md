card: TF
branch: claude/plan-tf-2-work-poses (PR 2, begun from PR 1's)
prs: #1770 (5460, ready); PR 2 (5461) on the branch above (working)
state: working

## Done

- #1770 (5460): the audit (`docs/specs/townsfolk-work.md`, 21 rows); the
  pickaxe put away: Chef Blaze, Woodworker Bro and Gavel Greg take the
  pickup, Farmer Bro stands (the pickup would bake his look: his eye
  style); `townsfolk-walk.test` §2j (whose tool) and §2k (no new bake of a
  refused look), both red with the pickaxe put back (in its header).
  Touches `server/test/`: its merge deploys the worker.
- With @parent's yes: `mp-folkwalk` §4 waits for the chef's pickup (12 of
  12 on a phone); `living-town.md`'s table and two `UI-DESIGN-NOTES.md`
  lines corrected, each pointing at the new spec.

## Next

- #1770: sitting 9's holds met (`main` merged, blocks SK/TF/PW/LB, next
  5520; PR 2's tag bare). For sitting 10.
- PR 2 (5461), on the branch: the `skills` look set (seven sheets, ~2.7 MB
  r8 on a phone, none on a computer) drawn by `folkSkill.js` from
  `_drawFolk`; Chef Blaze cooks, Woodworker Bro chops, Farmer Bro kneels,
  hoes, waters. `mp-folkwork` 27 of 27 (upright, sideways, computer,
  `?folkwork=0`). Now: the ghost sample, membudget off/on, heldsweep
  (town), questline; then the PR.

## Found

- `docs/specs/living-town.md`'s quest givers paragraph still says the
  woodworker chops and Farmer Bro hoes (the mining swing); left as asked
  (only the table), the note under the table says what is true now.
- `src/rendering/folkPose.js` header: the same list; PR 2's file, fixed there.

## Needs

- @parent: the cook's bar (A: his sheet at 23, a few lines in role-bake;
  B: Chef Blaze keeps the pickup). Asked 2026-11-14 ~11:30.
