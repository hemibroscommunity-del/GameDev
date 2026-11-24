# Card BK: the books reach every road (steps 4.2, 4.4, 4.5, 10.5)

**Purpose:** the whole world's sum, the restart test and the 1.5 bar each
prove what their tick says, for every system that moves value. Today the
instruments are real where they reach, and they reach six systems.

**Acceptance (`docs/plan/census/shape-books.md`):** each plant below stayed
green on 2026-11-23 and is red after its PR.

**Tags:** 6460 to 6479, one a PR, in order.
**Model and effort:** the strong model, high.
**Read:** `CLAUDE.md` section 5; `docs/plan/finish.md` parts 5 and 6 (they
bind you); `docs/ARCHITECTURE-HANDOFF.md`; `shape-books.md`;
`shape-review.md` part 3, items 3, 4, 5, 7; the headers of
`server/test/world-sum.test.mjs`, `storm.test.mjs`,
`chaos-restart.test.mjs`, `claims-gain.test.mjs`.
**You hold:** those four suites, `server/test/claimbots.mjs`,
`server/src/playerroads.js` (marks only), `tools/dev/gatekeeper.mjs` only
for PR 3's one line (after card CK's first PR has merged).
**Not yours:** `gold-door.test`, `bag-door.test`, `testroom.mjs` (card
DG's); the scoreboard (card WL's: tell the orchestrator what its restart
row should say).
**Browser:** none.

## PRs, in order

1. **(6460) The sum plays what it sums.** `world-sum` fails when a road
   marked move or escrow never ran in its scenario: a list that only falls.
   Today unplayed: the market, the Auction House, offers, the jackpot, pets,
   the farm, harvest, cook, forge, a weapon's sale, a quest's hand-in, loot
   gold; the duel's stake and the arena's entries are made by hand in the
   test, not by `duel.js` and `gladiator.js`. Then the scenario plays them
   through the real handlers, a system a PR where one is long.
   Done when the Auction House's listing taking one less (`store.js`,
   plant 2) and the market's order taking one less (`market.js`, plant 3)
   are red in `world-sum` itself.
2. **(6461) The restart sweep made from the value table.** `VALUE_PAUSE`
   (`server/src/valuepause.js`) names the fourteen actions that begin with
   a take: each is driven in the shared room, crashed before every write,
   and judged by the sum's `unexplained()`.
   Done when the jackpot deposit with its save removed (`cadence.js`, plant
   R2: the gold doubles after a restart) is red.
3. **(6462) The 1.5 bar, honestly.** The gate judges the worst of the six
   seeds, at the gatekeeper's rehearsal; a PR runs one seed, gains only
   (`--gains`), so the suite's share of a push falls from 235 s to under
   40. The dead break proof (`CLAIMS_PLANT=reach`) points at the reach the
   worker reads today (`SWORD_SWING.REACH_PX`). The bench gains a liar
   whose join says `fs: 1`, and a staff's row. A gain over the bar is a row
   of a `KNOWN` list with its number, a list that only falls: the sword's
   reach reads about 1.55 today.
   Done when the reach doubled (`swordswing.js`, plant C1) is red by the
   gate itself, and the suite says "reach 1.55, over the bar, known" rather
   than PASS.
4. **(6463) The roads' levers say what they are.** `fee`, `hold` and `pace`
   in `playerroads.js` are read by nothing: mark the three "not wired" in
   the table and its guard. A reader with a test that sets a fee and sees
   it charged is a later card, on the owner's word.
5. **(6465) Two roads the merged suites did not reach** (added by the
   orchestrator, part 4, from sitting 57's review,
   `docs/plan/census/review-z57.md`, #2281 and #2289). (a) `chaos-restart`
   §7 sweeps the Auction House WEAPON listing beside the stack's (a row may
   carry more than one way in; `VALUE_PAUSE`'s row names only the bag's
   roads). (b) `world-sum` §1's `piecesHeld` and `chaos-restart`'s `held()`
   compare the ids, not their count. Tests only.
   Done when the weapon's save awaited before the `store_listing:` put
   (`store.js`) and the equip swap's weapon put back with its id dropped
   (`Object.assign({}, activeItem, { gid: undefined })`, `gear.js`), each
   green before, are red.

## Readings chosen for you

- Tightening the sword's reach changes how the sword feels: it is the
  owner's call (`finish.md` part 9, call 5). You only make the suite say
  the number.
- A fault you find in the game (a road that books wrong, a loss on a
  restart) is Found, with its suite and its plant; it is fixed only when it
  is one line in a file you hold. Money is never "mended" on a guess.
- Every PR here is a test file under `server/test/`: each merge deploys the
  worker with no behaviour changed. The gatekeeper lists them together.
- Never raise a `cost-guard` line.
