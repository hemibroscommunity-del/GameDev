card: E
branch: claude/plan-e-4-econ (one branch a PR, each begun from the one before, as W's and H's are: merge them in order)
prs: #1686, #1691, #1694 (ready), PR 4 `_econ` on the branch above (ready; MERGED BY ITSELF: it changes the stored record's shape)
state: ready

## Done

- PR 1 (5080, #1686), the day's book's frame: one door `bookAdd`, one put
  a 5-minute pace, 60 days, `daybook: false`; cost-guard §15 (13 rows an
  hour; a 1-minute pace fails it). Deploys the worker. Card A may build on it.
- PR 2 (5081, #1691), the roads' classes: 44 gold and 69 bag roads; the
  mail by its credit's opId word (`MAIL_CLASSES`); `BAG_WHOLE`; SHAPES
  part 3's four edges ruled (the title says it changes SHAPES). Deploys.
- PR 3 (5082, #1694), the registry's marks: `storagemarks.js` (value,
  whose; 14 hold value), held to the handoff's table by a guard. Deploys.
- PR 4 (5083), `_econ`: rule 1's second exception, schema 21 (`econ-field`);
  `migrations.test` §econ fails a third field. Two checks in
  `sword-convert.test` pinned schema 20: they read the constant now.

## Next

- PR 5 (tag 5084), the world's sum: waits on the owner (Needs).

## Found

- `inbox.js` / `index.js`: goods mailed to a player in the five dying
  seconds land in the bag the respawn's wipe empties (read, not reproduced).
- `admin.js` `/grant` takes any `opId`: a grant is classed by its word.
- `deathpilesave: false` keeps piles in memory only: the sum sees a death's
  bag leave and come back by no record (rule 4's two configurations).

## Needs

- Owner: the book loses up to 5 minutes of counts when the empty room's
  worker sleeps before the next add. A one-line save at "the last one out"
  (`leave.js`) closes it; not card E's file. Add it, or is that fine?
- Owner: PR 5 needs three lines outside card E: `join.js` restores
  `_econ` at the join; `nomansland.js` splits `nml_loss` (a monster's kill
  of a red skull burns, a player's kill moves); `gladiator.js` writes the
  prize's `payload.house` (SHAPES 3, edge 3). May PR 5 touch them?
