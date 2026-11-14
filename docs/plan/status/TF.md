card: TF
branch: claude/plan-tf-1-townsfolk-tools
prs: #1770 (5460, ready)
state: ready

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

- Sitting 9's two holds on #1770 met: `main` merged in, every block kept
  (SK, TF, PW, LB; next 5520); the spec writes PR 2's tag bare. For
  sitting 10.
- PR 2 (5461): `entityRenderer.js` is free (#1762, card H's 5050, merged
  at sitting 9). Begins from this branch.

## Found

- `docs/specs/living-town.md`'s quest givers paragraph still says the
  woodworker chops and Farmer Bro hoes (the mining swing); left as asked
  (only the table), the note under the table says what is true now.
- `src/rendering/folkPose.js` header: the same list; PR 2's file, fixed there.

## Needs

- Nothing for PR 1 (@parent answered both, 2026-11-14).
