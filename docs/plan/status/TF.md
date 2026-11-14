card: TF
branch: claude/plan-tf-2-work-poses (PR 2, begun from PR 1's)
prs: #1770 (5460, merged); PR 2 (5462: 5461 is burnt, below) on the branch above (opening)
state: working

## Done

- #1770 (5460), merged: the audit (`docs/specs/townsfolk-work.md`); the
  pickaxe put away; `townsfolk-walk.test` §2j, §2k; `mp-folkwalk` §4.
- PR 2 (5462): the `skills` look set (seven sheets, ~2.7 MB r8 on a phone;
  the cook at a bar of 23, its reason written: @parent's A) drawn by
  `folkSkill.js` from `_drawFolk`; `?folkskills=0` back to PR 1's poses.
  Runs: membudget +3.2 MB chip, no line raised; heldsweep (stand, town)
  0 over in 3 runs after the garbage cut (strip-made 9.1/7.6/7.6 ms);
  questline 187/187; mp-folkwork 30/30 + the ghost check upright 11/11;
  the ghost audit's fire 61 frames (same as `main`).

## Next

- PR 2: open it as a draft, its pictures in the body; then wait.

## Found

- For card P (memory): a peer cooking, chopping or farming in other
  colours is a 1-5 MB canvas bake (effectsRenderer `PEER_FIG_EST`); the
  `skills` set could let peers draw from its numbers too.
- `docs/plan/census/review-z9.md:273` writes `v2.3.5461` in full on `main`, so
  the tag check counts it taken: PR 2 is 5462 (the card's spare).
- `role-bake.mjs --hashes`: eight sets read "code changed" on `main` (a
  look-roles WARN for any PR touching the look sets).
- PR 2 adds a switch row (`?folkskills`): it meets other row-adding PRs on
  `docs/SWITCHES.md`'s count line (rule 3).
- `mp-ghostaudit` `BT_GHOST_ONLY=fire,cook BT_GHOST_OUTFITS=bare` on `main`
  (96ffa005): the cook never starts (0 frames, 2 FAIL); the fire passes.
- `mp-heldsweep` `stand,town` on `main` (96ffa005), 1 run in 5: `R > J`
  (a React redraw) 14.4 ms > 12, twice, unlisted.

## Needs

- Nothing: @parent answered (the cook's bar A, `?folkskills=0`, the runs).
