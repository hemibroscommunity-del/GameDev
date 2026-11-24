# Review: the books balance, a liar gains little, the game knows who acted
(worktree agent-aacdedff0cb6baa87, main 0aec6482, 2026-11-23; every plant reverted, tree clean)

## Q1 the sums
- Baseline: world-sum 37/37, storm 53/53, chaos-restart 21/21, xfer 55/55.
- The sum = server/src/worldsum.js count()/unexplained(): held == start + minted - burned.
  minted/burned come from the doors' own booking (gold.js:452-453 econGold books d = purse after -
  before, by the road's class). So an over-paying MINT road is "explained" by construction.
  The sum sees only (a) a move/escrow with no other side, (b) a door that books != what it moves.
- Messages the summing suites play through real handlers (grep of world-sum + storm): bank_*,
  gamble_request, shop_sell, shop_buy, trade2_*, join, move; plus _creditPlayer grants and a death pile.
  world-sum §1's duel stake and arena entries are HAND-SIMULATED (test calls
  room._escrowDebitGoldTogether; room._goldTake + state._store.set('arena_entry:..')).
  Not in any summing scenario: market, Auction House, offers, jackpot, bounty, pets, farm, harvest,
  cook, forge, weapon sell, quest turn-in, monster loot gold.
- PLANT 1 (gold.js:453, road 'loot_gold' books d-1 = gives 1 more than it records): NOT CAUGHT.
  16 suites green: world-sum storm gold-door daybook econ-card drops cost-guard wire-hostile pile-left
  reveal-bag death-pile-saved combat-lifecycle anticheat server-dead bag-door storm-eye.
- PLANT 1b (same line, road 'gamble_win'): CAUGHT: world-sum "unexplained gold 1", storm 6 FAIL;
  gold-door still 205/205 (no per-road check that the door books what it moves).
- PLANT 2 (store.js:791 bagTake(..., qty - 1, 'ah_listing')): world-sum, storm GREEN; caught by the
  feature's own suites: store-onewrite 3 FAIL ("10 gel" got 11), store-heal-now 2 FAIL.
- PLANT 3 (market.js:466 _goldTake(ps, p - 1, 'market_order')): world-sum, storm, worldsum-buyleg
  GREEN; caught by market 2 FAIL, market-settle 27 FAIL, market-own-place 2 FAIL.
- Documented break proofs work: WORLD_SUM_PLANT=1 -> "unexplained gold 50"; STORM_PLANT=1 -> 1 FAIL.
  Both are test-side plants (the test calls a door by hand).

## Q2 the restart
- chaos-restart.test.mjs: 6 cases (duel won; deploy mid-duel; trade window commit gold+goods+weapon;
  deploy with a window open; arena sponsor stake placed; arena stakes settled). books() counts gold,
  one bag key, one weapon name. KNOWN is an empty Map; line 82 asserts KNOWN.size === 0.
  tools/dev/scoreboard.mjs:52-57 restartLossesKnown() = a regex count of rows in that Map: the
  scoreboard's "0" is "the waiver list is empty", not a measure of the game.
- Other crash-at-write sweeps (grep crashAt|restartBefore): arena, arena-settle, bankretry,
  chest-onewrite, dailyrewards, death-pile-saved, duel, duel-pace, eventcapes, guilds, inbox,
  leftover-heal, market-own-place, market-settle, nml-onewrite, paid-mark, resetone, restore,
  sponsorship, store-onewrite, storm (bank/gamble/shop/trade2/mail, a deploy at each of 33 messages),
  trade-onewrite, xfer. No sweep names: the jackpot deposit, item_drop, pets, farm, forge/harden.
- PLANT R2 (cadence.js:198, the jackpot deposit's `this._saveRpg(session.id, ps)` removed: the purse
  loses the ticket's gold in memory only, `jackpot:draw` is put on file; a restart doubles it):
  NOT CAUGHT. 19 suites green: chaos-restart storm world-sum cadence jackpot-recheck valuepause
  cost-guard chaos-clock testroom inbox fight-lock liveops refusal-door three-guards + guards
  traps-money traps-saves state-ledger traps-economy-social traps-server-word.

## Q3 bounded claims
- Measured by server/test/claims-gain.test.mjs (house bots claimbots.mjs on the real GameRoom):
  computed, not asserted. But the gate (line 488) is `gain <= LINES[id] + SPREAD[id]`:
  reach 1.42+0.56 = 1.98, guard 1.37+0.49 = 1.86, harvest 1.46+0.32 = 1.78, bowlabel 1.43.
  Hard `<= BAR` only in per-judge checks 2d (sword at an honest walk), 2e (move), 2h (cook),
  2i (harvest), 2j (bow path); the guard and the whole reach liar have none.
- The suite's own other seeds (CLAIMS_SEED=a..e --gains): reach 1.46 1.55 1.57 1.92 1.46 (3 of 5 over
  1.5; the default seed's 1.42 is the lowest of six), harvest 1.33 1.41 1.36 1.57 1.37, guard
  0.98 1.47 1.15 1.2 1.16, bowlabel 1.17-1.22, move 1.17 flat. Every run prints PASS; the over-bar
  ones print "(over the bar 1.5)" inside a PASS line.
- PLANT C1 (swordswing.js:41 REACH_PX 150 -> 300): check 3 still PASS ("its gain 1.96 is within its
  line 1.42 and its spread 0.56 (over the bar 1.5)"); the suite goes red only through 2d
  ("gain 2.87 off, 1.87 with swordswing: true").
- The suite's recorded break proof is dead: `CLAIMS_PLANT=reach` (room.PVE_MELEE_RANGE = 800) -> 0 FAIL,
  reach still 1.42: with swordswing ON the reach is SWORD_SWING.REACH_PX (combat.js:1321).
- Judges read: move (movement.js: a px budget refilled at the player's own top speed; a move past it
  is followed, not taken) REAL; sword (swordswing.js: 150 px from the worker's copy + a token bucket
  of 2 at one a cycle) REAL; harvest grade (harvestgrade.js: still the phone's word, limited by an
  earliest time and 15 perfects in any 20; the run lives on the bot record, a reconnect keeps it, a
  deploy forgets it) REAL as a limit on the pay; bow/staff (combat.js:1315-1369: weapon worn, reach,
  rate, arrow seen) read only at the call sites.
- Probe (tools/dev/plants/probe-freeswing.mjs): a liar whose join says `fs: 1` skips _swordSwingTake
  (join.js:1037, combat.js:1375). Not a dodge: its gain is 1.26-1.52 over six seeds (the free-swing
  prorating holds it). The bench has no such liar. No staff row in the bench at all.

## Q4 rule 5
- trade window (trade2.js:364-459): debits, credits, pets, weapons and the xfer row in ONE run
  (_creditLiveTogether, inbox.js:321-347, issues every write then returns Promise.all).
  PLANT X1 (the row awaited after the swap's write): CAUGHT: xfer §3 "a restart at any write of the
  confirm: the swap and its row both, or neither [crashAt 1, paid true, rows 0]", trade-onewrite 2 FAIL.
- market cross (market.js:535-541): the note and the row in one Promise.all. PLANT X2 (row = null):
  CAUGHT: xfer §11, cost-guard §23.
- duel pot (duel.js:376-378): credit, stamp, escrow delete and row in one _creditWith run (read only).
- trade2.js:473-489 keeps the old two-run order as an else branch (saves, then each credit awaited)
  for when _creditLiveTogether declines (a credit to a player not in the room, a kind other than
  gold/item/weapon). Not exercised here.

## Q5 who acted
- `actor`, `stint`, `principal`: zero code lines in server/src (grep). docs/SHAPES.md:72 says so itself.
  10.1 and 11.2 are ticked [x] for a doc section. xfer.js:5-7: "the actor ... is not built yet".
- What says who acted today: the xfer row's `by` (a player id or null, xfer.js:204), reqId,
  the botfp record. No record says test mode, QA, system or helper (no _testMode in gold.js, bag.js,
  xfer.js, daybook.js, econcard.js).
- wire table `mayStart`: 286 rows filled (91 person, 77 never-helper, 74 owner, 27 helper, 11 anyone,
  6 system); no reader in server/src outside the table's own columns file.
- playerroads.js `fee`, `hold`, `pace`: all 0 and read by nothing in server/src (only `ledger` is
  read, by xfer.js:82-103). Turning one up changes nothing.
- xfer rows: written (trade window, gift, duel pot, arena stakes, market, auction) and read
  (econcard.js:132, playerrestore.js:159). The day's book: written by the doors, read by the owner's card.
- botscoresave: ON, a rise in the bot score is written with the strike or cook that made it (botfp.js:673-684).

## Not checked
gift trade's code, the Auction House's ledger row, arena stakes, export/restore/rewind (4.7 unticked),
pets/farm/item_drop restart paths, the reqonce memory across a deploy (reqstamp OFF), PvP claims,
the day's book's numbers on the owner's card, any browser path.
