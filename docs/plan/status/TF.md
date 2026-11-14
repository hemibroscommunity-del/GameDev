card: TF
branch: claude/plan-tf-1-townsfolk-tools
prs: PR 1 (5460) on the branch above (working; opened when the questions below are answered)
state: working

## Done

- PR 1 (5460), on the branch: the audit (`docs/specs/townsfolk-work.md`,
  21 rows); the pickaxe put away: Chef Blaze, Woodworker Bro and Gavel Greg
  take the pickup, Farmer Bro stands (the pickup would bake his look: his
  eye style); `townsfolk-walk.test` §2j (whose tool) and §2k (no new bake
  of a refused look), each red with the old pickaxe back. Touches
  `server/test/`: its merge deploys the worker.

## Next

- PR 1: precheck, then open it once @parent answers the Needs below.

## Found

- `tools/qa/mp/mp-folkwalk.mjs` §4 waits for Chef Blaze in `mine`: red
  after PR 1 (Needs 1).
- `docs/specs/living-town.md` (its work table) and `docs/UI-DESIGN-NOTES.md`
  (the townsfolk's "They walk around and work" line) still say the chef's
  cleaver, the gavel, the woodworker and the farmer swing (Needs 2).
- `src/rendering/folkPose.js` header: the same list; PR 2's file, fixed there.

## Needs

1. @parent: may PR 1 change `mp-folkwalk.mjs` §4 (Chef Blaze `mine` ->
   `pickup`)? Outside the card's files; otherwise it goes red.
2. @parent: may PR 1 correct those two docs' lines (outside the card)?
