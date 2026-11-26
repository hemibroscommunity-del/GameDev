card: KEEP
branch: claude/plan-keep-1-census
prs: PR 1 (6740, the census; draft)
state: ready

## Done

- PR 1 (6740), the census, no change to the game:
  `tools/assets/versions.mjs` (an address to its 10 characters of
  `shipped.json`'s SHA-256; the sprite bot's twins hashed from their own
  bytes) and its guard `tools/guards/asset-versions.test.mjs` (break
  proofs tried); `tools/qa/mp/mp-keepcensus.mjs` (one load and a short
  tour, every request read as table, hand or bare) wrote
  `docs/plan/census/KEEP-requests.md`; the tag block
  `"KEEP": [[6740, 6759]]`, nextBlock 6760.
- The census (test box, 2026-11-26): 1,588 requests for 1,477 files;
  table 0, hand 1,273, bare 315. Kept folders: `/sprites` 968 hand + 22
  bare, `/ui` 104 + 45, `/sfx` 2 + 94, `/icons` 160 + 55,
  `/world/objects` 1 + 88.

## Next

- PR 2 (6741): the build plugin for written-out addresses, a new part
  stacked on this branch (a fresh session).

## Found

- 20 requests a load for trait frames that do not ship (`north.png`,
  `northeast.png` of beards, eyewear, eye styles), answered by the page's
  fallback: `src/rendering/traits/*ColorCatalog.js` (census, "Asked for,
  and not shipped").

## Needs

- Nothing.
