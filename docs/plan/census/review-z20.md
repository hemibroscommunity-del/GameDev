# The gatekeeper's review, sitting 20 (card Z; tag 5377)

Taken 2026-11-15. Reviewed on `main` 29b1a0d (sitting 18's list merged)
while sitting 19 ran beside it on the same `main`; rehearsed on MAINLINE
once sitting 19 had landed (the whole, below). Tags in this file are
written bare. Each PR that changes `server/` or `src/` had a finder read
the code around its own diff (its stack's PR below it taken away), with
the angles of `/repo-review` that apply, re-try its break proofs and try
to disprove what it found; the gatekeeper read the mends. Documents,
tools and tests got step 3.

VERIFIED: the story runs, on the code path named (a finder's node probe
in a throwaway copy, or a reading end to end). PLAUSIBLE: the code does
it, what sets it off is unproven. The probes are not in the repository.

## How this sitting ran

The review was done on each card's heads of 2026-11-15 (stacked within
each card, each based on `main`), while sitting 19 ran beside it on the
same `main` 29b1a0d. Findings went to the planning session, which
routed them; R, O and P mended in the same push as their merge of the
new `main`, read again by the gatekeeper (marked **Mended** below). The
allowance ran out on 2026-11-15 and came back on 2026-11-16 21:00; the
planning session is now session_01LccHai4oUbpVPTsJKxanZP. Sitting 19
landed at `main` 481bac2; each card merged it into its bottom PR only
(each PR above merges the one below) and sent its heads; each new head
was compared with the one reviewed (what changed besides the merge was
read again). Card K's #1900 is not on this list (below). A finder stopped
at the weekly limit before #1925, which the gatekeeper read.

## Decided for the owner while away

Each with its switch, for the planning session to read to the owner:

- **R's #1887**: which of a player's 35 kinds of record a restore puts
  back (the character, the bank vault, the pets) and which it leaves,
  each with why (`RESTORE_WAYS`: the login key, freezes, test mode, the
  backups, the anti-bot records, the mail, every once-only prize); what
  of theirs sits between players is listed in the answer, never rolled
  back (read only when the owner presses restore: no switch); a
  restore's gold and goods counted as made or burned by their
  difference (no switch: the old hand-written restore was the hole).
- **R's #1895**: what a duel's ledger record says (the loser's wager,
  from the loser to the winner; "settled by" the winner's blow, nobody
  for a forfeit, the clock or another death). Switch `xferescrow` (OFF:
  a cost, below).
- **R's #1898**: a pet's experience is the pet's (its own record), out
  of the door; the places left outside, each with why; the function
  named `xpGive`. No switch (nothing changes).
- **R's #1877**: no kill switch (nothing changes); the join's plain
  copies of the quest lists left for later. No switch.
- **O's #1915**, three: (1) a failed crisp read takes the shine with it
  (every shine in its own pass, the shine's test skipped), which holds
  on computers only (the finder's medium, below); (2) the shine allowed
  4 levels a channel, not 2 (a phone's half precision); (3) each way
  back its own flag, never the Speed test's switch. Switch `?selftest=0`
  (no self-test), `?selftest=fail:<name>` (QA).
- **O's #1896**: CLAUDE.md §7's one-program line made true to the code
  (the one program the phone default since 5016, the owner's word of
  2026-11-13; the planning session approved the line). `?selftest=0`.
- Not under the heading, the nearest: L's four page doors say nothing a
  player sees changes (`?racedoor=0`, `?harvestdoor=0`, `?posedoor=0`,
  `?guarddoor=0` each lifts its rules); K's #1900 decided nothing (a
  helper's parameter renamed); P's #1906, #1918 and #1925 are memory
  savers ON by default (the memory law, the owner's 256-colour rule):
  `?hairmasks=0`, `?petsheet=0`, `?capehood=0` (the pet sheet's colours
  move a little: 351 of 99k pixels by more than 48 on a channel; the
  hood's halves stay pictures, P's answer (a)); J2's are tests.
- **For the owner, costs (never decided this way), each built OFF:**
  - `fullsnap` (#1887): the daily backup also holds the vault and the
    pets, so a restore puts them back: 2 more reads a player a day, a
    backup about 190 bytes bigger (cost-guard §18: 2 reads, 2 writes off;
    4 and 2 on).
  - `resetbook` (#1887): a character restart books what it held into a
    new room record `econ_gone`: a row, one more write and two more reads
    a restart (cost-guard §19: 6 reads, 15 writes off; 8 and 16 on). **The
    gatekeeper's word: leave it OFF.** Nothing in the live game reads
    `econ_gone` (only the test's sum); the owner's economy card already
    counts a restart back in (econcard.js `econResetBook`, since 5093);
    and card K's census line does not fall with it (that suite runs the
    default flags). It would cost a write for nothing seen.
  - `xferescrow` (#1895): a wagered duel's pot writes its ledger record:
    one more write a wagered duel (5 to 6) and its delete 90 days later.
    With it on, every lost wager shows on the economy card as gold moved
    one way for nothing (the row has no price): what the card is for (an
    alt throwing duels), but the owner should know before turning it on.
  - The restore press itself (owner-only) now reads up to about 1,600
    rows (a 200-row page of each between-player kind) against 2.

## Card R: #1877 (PR 5, tag 5284): reviewed, listed

**Quest state's door (`queststate.js`, `QUEST_ROADS` 19 rows): lows and
nits only.** Every replaced write gives the same value at the same point
against `_saveRpg`, `_sendPlayerState` and the flush; a refused accept
leaving no empty map is unseen (the save and the echo both read
`ps._quests || {}`, persistence.js ~395, ~757); the hand-in's armour
list read and emptied with no await between.

- Low, VERIFIED: the one-writer scan (quest-door.test ~81, ~109) misses
  eleven shapes a finder planted: `||=`, `??=`, `&&=`,
  `Object.assign(ps._quests, {...})`, `Object.assign(ps, {_quests})`,
  destructuring, `delete ps['_quests'][q]`, `?.push`, an alias with no
  `;`. The spec (quest-door.md ~72) says an `Object.assign` is among the
  ten plants; none is. Card K's hand-in claim, which waits on this door,
  could add a second writer unseen. Cure: the patterns, planted, or the
  spec's line put right.
- Low, VERIFIED: taking the two kept lists off traps-server-word's
  scratch list is required (the door writes them by a computed name; put
  back, the guard fails "gone"), but its header (~18) still says such
  writes are "the gear slots and stashes, all saved", and its "never
  both saved and memory only" no longer sees `_questGrantOverflow` (were
  it added to `_saveRpg`'s put, armour with gids would ride the rpg blob,
  handoff rule 1, and nothing fail). Cure: the guard reads `QUEST_KEPT`
  from queststate.js, or the header put right.
- Nit, VERIFIED: `_devTour` (devtools.js ~322) forgets then re-adds a
  step, so a key already there moves to the end of `_quests` (the page
  lists in key order: the owner's tour lever only).
- Nit: queststate.js's header says the map has no prototype; a live
  player's is the join's plain copy (join.js ~1112, ~1304), harmless
  (every id is the reward table's own key, every value a string or a
  number); `questForget` does not check its id (the spec: "no quest id
  throws").
- `__proto__` traced on every road: every id own-keyed against the
  reward table (never truthiness); 19 quests' `next: null` skipped. Break
  proofs: the old accept line fails §2 (and §3); the cap removed fails
  §1. Suites: quest-door 18, quests, quest-echo, quest-handin,
  quest-kept, tour, tutorial, devtools, gearprov, test-mode, market,
  achievements, fresh-start, wire-hostile, refusal-door, cost-guard,
  quiet-phone; the guards traps-server-word, systems, state-ledger.

## Card R: #1887 (PR 6, tag 5285): reviewed, mended, listed (costs OFF)

Read at adde554; its mend b1a403e read by the gatekeeper (the medium's
words, the `dry` low and the undo low, below; nothing else in `server/`
changed down R's line: #1895 d8e01ae and #1898 511aa8d carry it). On
`main` + 511aa8d: restore, xfer, xp-door, quest-door, cost-guard,
gold-door 205, bag-door 269, duel and the switches guard green.

**A player's restore from the registry, and a restart booked
(`fullsnap`, `resetbook`, both OFF).** With both off the daily copy and
the restart are `main`'s (`snapshotCopy` returns the blob; `_resetGone`
returns before any read). The restore with `fullsnap` off writes
`main`'s rows (`rpg:`, `prerestore-`, `admin_log`), now in one run; it
differs from `main`'s verbatim copy only on malformed data (a coins
string a number, bad bag counts dropped, a non-list stash empty), the
difference booked: the world's sum 0. A player online is refused with
`main`'s two 409s; a newer record is refused; a dry run writes nothing;
a wrong key 401. `RESTORE_WAYS` is built from the marks' list of a
player's records (held to the registry by the storage-marks guard), not
by hand.

- Medium (the owner's cost, words), VERIFIED: `resetbook` writes
  `econ_gone` (persistence.js ~535) that only the test's sum reads
  (`NET_READERS`, worldsum.js ~111); the daily walk (liveops.js
  `_metricsMaybe`) never reads it (marked `none`); the economy card
  already counts restarts back (econcard.js `econResetBook`, 5093 to
  5094); "card K's census line falls with it" is untrue (wire-hostile
  runs the default flags). A later PR putting `econ_gone` in the daily
  walk would count each restart twice. Cure: say "read only by the
  test's sum" in Needs, SWITCHES.md and OPERATIONS.md, or wire it into
  the walk and drop the card's count-back in one PR. Under Needs above:
  leave it OFF. **Mended** (the words): worldsum.js's header, Needs,
  SWITCHES.md and OPERATIONS.md say nothing live reads it yet.
- Low, VERIFIED: `dry` fails open (playerrestore.js ~337, `b.dry ===
  true`): `"dry": "true"` or `1` runs the real restore (its `prerestore-`
  copy undoes it). Cure: answer 400 for a `dry` that is not a boolean.
  **Mended**: a `dry` present and not a boolean is a 400 (restore §2:
  `"true"` and `1` refused, nothing written; its break proof listed).
- Low, VERIFIED (`fullsnap` ON only): undoing a restore keeps a record
  the restore made (~393: `over` keeps only records there now): no vault
  now, a copy holding one; the undo leaves the vault (booked, the sum 0),
  so "you can always restore the restore" (OPERATIONS.md) breaks there;
  a `_norpg` copy never deletes a character the restore made. Cure: put
  `null` under `_with` for each touched record absent now; `_norpg`
  deletes `rpg:`. **Mended** for the records under `_with` (null for one
  the restore creates; restore §2: the vault made and its way back
  deleting it, the sum 0); a `_norpg` way back still leaves the
  character the restore put (said in the spec: the restart's own copy is
  the way back to none).
- Nit, VERIFIED: a copy naming a record kind this worker does not know
  is restored in part and answered 200 (refuse it as `newer`). Nits:
  `goneAdd` nets "held less made" into `b` (the handoff row says the
  character's own are kept); the `resetbook` row says "a read" (two,
  cost-guard §19); `_resetGone` ignores `econ: false`; the restore's mint
  in the day's book rides another part's put (an empty room may never
  write it).
- **Shape: none for a player's own records** (the restored `rpg:` in
  today's shape; `bank:`, `pets:` as stored). `rpgsnap:` copies carry
  `_with` or `_norpg` only once `fullsnap` has been on; on a worker
  rolled back to 29b1a0d a `_with` copy restores the character (not the
  vault or pets), a `_norpg` copy an empty character (undone by that
  worker's own copy), and `econ_gone` is inert. Not a line by itself.
- Break proofs: the copy written apart fails 2; `goneAdd`'s gold line
  deleted fails 4; the `econ_gone` put moved after the await fails 4.
  Suites: restore 38, cost-guard 48, gold-door 205, bag-door 269, admin,
  room-export 47, stash-door 23, wire-audit, wire-door, world-sum 37,
  econ-card 42, persistence, bank, state-resets 86, wire-hostile, storm
  53, migrations.

## Card R: #1895 (PR 11, tag 5290): reviewed, listed (cost OFF)

**The duel pot's ledger record (`xferescrow`, OFF).** OFF, the pot's
`_creditPlayer` line is `main`'s byte for byte (`duelpot:<id>`). ON, the
same stamp: a restart lands the pay and its record together or neither,
winner online (xfer.test §8) and offline (a finder's probe: the mail,
the stamp and the record all or none); a crash ON and a restart OFF,
then the sweep: before the pot both refunded, no record; after it the
sweep sees the stamp, deletes the escrow only, no second pay. A refund
writes no record (a voided duel is no transfer). `xfer: false` writes
none. The key `xfer:<day>:duel-<uuid>`: nothing from a client.

- Low, VERIFIED: the credit guards (`opid-audit.test`, gold-door §8)
  scan `_creditPlayer(` only; the ON branch's `_creditWith` (duel.js
  ~324) is unseen (a random opId planted there passes both). A later edit
  of that opId would pass precheck, and the sweep, finding no
  `duelpot:<id>` stamp, refunds on top of the pay. Cure: both scans
  `_credit(Player|With)\s*\(` (storeoffer.js ~265 joins them, already a
  literal `store:` opId).
- Nit, VERIFIED: duel.test §13 has an old race (§12's pot, paid without
  a wait, lands after §13 resets the coins: OFF it passes by running
  first); forced ON it fails "no gold taken". Matters on the day the
  default turns ON: let §12's pot settle first.
- Nits: the economy card's one-way line (Needs, above); duel.js's header
  (~13-15) still says `_creditPlayer`.
- Break proof: the record written after the credit's wait fails 8.
  Suites: xfer 28, cost-guard 50, player-roads 20, gold-door 205,
  opid-audit, liveops, valuepause, the six duel suites; forced ON:
  world-sum, econ-card, chaos-restart, arena-settle, inbox.

## Card R: #1898 (PR 10, tag 5289): reviewed, listed

**Experience and levels' door (`xp.js`, `XP_ROADS` 22 rows): nits
only.** VERIFIED side by side: `main`'s server/src and the PR's run on
the same inputs (joins with text, NaN, missing, fractional, negative
levels and XP; odd life-skill entries; `_addLifeSkillXp` on 11 skills x
7 odd amounts; `_addCombatXp`; `_prog3AwardXp` on the three skills, flat
and not; `_tryLevelUpFromBuildPoints`, `_recomputeMaxes`): 640 states,
0 differences (text XP still concatenates as before). The loops read
what the old lines wrote: no level skipped, no loop longer.

- Nits, VERIFIED: spar.js ~374's clone copy (`ps[k] = ...`) writes
  `level` and `prog3` unseen by the one-writer scan (a clone, never
  saved: the spec's "anything else fails it" claims too much);
  migrations.js ~193 `healLifeSkillLevels` listed as a stored record's
  shaper runs on the live player at the join (join.js ~1054, ~1199);
  the scan's exemptions excuse a whole line; SHAPES part 8 has none of
  `xp.js`'s names; the replay test replays re-typed copies (`EXPECT`),
  faithful today.
- Break proofs: the old gathering line fails §2 and §3; `life_level`
  read plain fails §1. Suites: xp-door 17, skillpoints-door,
  hardenedwood, trapping, prog3, lifeskills-economy, kill-xp, devtools,
  xp-decay, one-level, mirror-audit, armorforge, farm.

## Card R: #1922 (PR 12, tag 5291): step 3 and a reading, listed

**Tests and documents answering this sitting's lows for R** (stacked on
#1898). opid-audit and gold-door §8 read `_creditWith(` too (both
definitions in inbox.js skipped); quest-door's scan reads `||=`, `??=`,
`&&=`, `+=` and `Object.assign` by any receiver or alias, eight new
plants; traps-server-word's header says the doors' own computed writes
(the two kept lists, memory only on purpose) are in neither of its
lists. That is the review's second cure for the guard ("or the header
put right"); the gap it names stays (a kept list added to `_saveRpg`'s
put would still pass that guard), now said where the next reader looks.
The gatekeeper's break proof on `main` + 34f61d6: duel.js ~324's opId
made `'duelpotx' + Math.random()` fails opid-audit (2) and gold-door
(1); put back, green. Suites: gold-door 205, opid-audit, quest-door;
the guard. It deploys (`server/test/`).

## Card L: #1876, #1894, #1903, #1910 (PR 5's page doors, tags 5218, 5219, 5520, 5521): reviewed, mended, listed

**The race's, the harvest's, the pose's and the guard's page doors
(`raceTo`, `harvestTo`, `poseTo`, `guardTo`).** Read at the morning's
heads (ad36b1c, 84ede79, 5b6b374, 7c89802); the new heads (6a12789 >
87aea54 > c12b9e3 > a8eef07, `main` 29b1a0d in) read by the gatekeeper.

- **Sitting 18's reader, mended:** the morning's heads predated card T's
  #1863, and each door read `location.search` itself: on `main` the
  switch reader's check 3 went 222 to 225 against its line 221, switches
  8 and 13 (the forms) red, and `docs/SWITCHES.md` conflicted from #1894
  on (the `harvestdoor` row's date). The new heads ask `sw('<name>')`
  from `./switches.js` (itself of no imports, so node still reads the
  doors), the forms written (`'0'`): on `main` + a8eef07 no conflict,
  the reader 221 of 221, the switches 498 rows green, the four suites
  35, 43, 29, 23.
- "Nothing a player sees changes", VERIFIED by differential probes:
  `main`'s race.js against the PR's, 150,000 random operations (asks,
  failed sends, `race_state`, checkpoints, every `race_end`, dismisses,
  ticks, rejoins, Lil Bro's drive), the switch on and off: 0 differences
  in `_race`, `_raceLil`, the answers, `raceLive`, `raceHeld` (214 with
  a refusal planted). The harvest: `main`'s lifeSkillRewards.js and tick
  text against the PR's, 60,000 operations (starts, locked tries, cooks,
  the worker's plans, ticks, strikes, walks, a node gone, a zone): 0
  differences (28 planted). Pose and guard by tracing: every refusal is
  the caller's own early return (`endOwnPose`, `dropShield`), the raise
  on the same clock (`Date.now()`, as BroTown sets `_shieldCdUntil`): a
  `performance.now()` planted fails §3.
- Low, VERIFIED (#1876): the census's `resetsFound` counts a reset's
  call of a door whatever its way: `forgetRace` made `raceTo(S, null,
  'dismiss')` (refused unless the card is up) keeps the ledger's guard
  green (state-resets §5 and race-page-door §2 catch it). Cure: count
  only a way to none with no rule (`forget`, `fail`).
- Low, VERIFIED (#1894): the ledger guard's check 6 counts any door call
  in an edge's clear: `clearZoneLocalFx` made `harvestTo(S, null,
  'strike')` keeps the ledger guard and zone-leftovers green (only
  harvest-page-door §2, §3 catch it). Cure: read the way at the call.
- Nits: `?racedoor` filed under `quests`, raceDoor.js in `social`;
  interactions.js ~93: a refused `hold` would have spent the emoji, the
  sound and the stat (unreachable); playerActions.js ~698 `raiseShield`
  (nothing imports it) now refuses a raise while up, where `main` sent
  `player_shield up` again; each row's `on` is its merge day (card T's
  rule).
- Break proofs: the old write put back in `dismissRace`,
  `succeedExtraction`, `rejoinClear`, `dropShield` fails each suite's §2
  and the phase guard. Card K's #1900 meets #1876 in race.js (its
  section).

## Card K: #1900 (PR 7.2, tag 5188): reviewed, NOT listed (waits for its restack)

**The page's sends through the action door, family 2 (41 sends in 24
files): lows and a nit.** VERIFIED by a node probe: each of the 41 sent
through the real `act()` against its old message and the wire door's
judge: the type, the fields and the way (a direct `{type, payload}`; the
fields at the top for `dice`, `map_watch`, `item_drop`; a broadcast for
the priority and batch rows; both `move`s the broadcast as before). The
door's transport is `channelShim.send` itself (wsClient.js ~6108), set
and cleared with `S.channel` (~6130): it drops a send only when
`S.channel` is null, and each of the 41 asks `S.channel` first, so no
send is lost and none throws anew. The answers callers read
(`chatMute`, `questKept`, `weaponSell`) are the shim's own. The census
146 to 105 is true.

- Low, VERIFIED: `docs/plan/status/K.md` conflicted with `main` 29b1a0d
  (#1848's lines), and its side said `working` and "then its PR".
- Low, VERIFIED: race.js conflicts with L's #1876 (the import and
  `requestRace`). The resolution, built on `main` + L's whole line: both
  imports; the ask through L's door (`if (!raceTo(S, {phase: 'asked',
  at: Date.now()}, 'ask')) return false;`) then `try { act('race_start',
  {}); } catch (e) { raceTo(S, null, 'fail'); return false; }`: race 35,
  harvest 43, pose 29, guard 23, zone-leftovers 36, state-resets 86,
  census 105 (L's old direct send kept: 106, red). It carries #1876's
  head with that resolution, by the planning session's word. **Not
  done**: K's session stopped with the allowance; its head is still
  bfc0495 (on abff2ef: K.md conflicts with `main`, race.js with #1876).
  A fresh K session restacks it after this sitting (the planning
  session's word): it goes after L's line, with the resolution above.
- Nit, VERIFIED: "sends exactly what it sent before": 14 of the 41 are
  the door's request-id rows and carry `payload.reqId` now (alliance_war,
  chat_report, daily_spin, fish_inspect, item_drop at the top,
  cook_request, nml_lock_allow, pet_release, pet_house_buy,
  quest_turn_in, reveal_item, shard_crack, gem_combine, sell_weapon):
  the wire door passes each, no handler copies it; about 25 bytes.
- Break proofs: the old `sell_weapon` send fails the action door's §7
  (106); `via(S)` taken out of the rest suite fails it twice. Suites: the
  nine changed (achievements-client 79, mute-kept 19, points-reset,
  presence2 55, quest-kept 13, rest, weapon-sell 11, zone-entry,
  loot-clock) and eighteen readers of these modules.

## Card P: #1881 (tag 5561): reviewed, mended, listed

P's mends read by the gatekeeper at 6e98d35 > fcd36b1 > 9ca4968 >
2a81f66 (`main` 481bac2 in): inflate-raw 51, strip-door 36, palette 15,
picture-door 33; the guards switches, switch-reader, asset-door,
asset-sources, pixel-readers, budgets, draw-lanes, state-ledger green.

**A pack begun before a lost chip's rebuild let go; `keepPageCopy` on
the slime's still (sitting 16's and 17's lows).** Neither packed nor
whole cannot happen (every `gone()` check precedes the lines that empty
the strip, run with no await after the last); the pieces are copies;
`packStrip` is an export with no caller in the game; the re-pack is the
same sliced `_pack`. The still: a 128 x 128 bitmap kept for the sitting
already (off picsOnce's `ONLY_DRAWN`): memory +0; the sweep stops
reloading the 3072 x 128 strip each round.

- Low, VERIFIED (a node probe): a strip still waiting in `_line` when the
  restorer runs takes the new count as its `r0` (framePack.js ~208) and
  packs before the new renderer has drawn it (`_gpuData` unset): the
  sitting-16 low again for a queued strip. Narrowed by the restorer
  running at the loss (picsOnce.js ~377) and at the rebuild (pixiApp.js
  ~739); open on a rebuild with no loss event (the resume probe, the
  watchdog, 90 thrown frames): a one-off hitch. Cure, in
  `unpackAllFrames`: `for (const s of _line.splice(0)) _want.add(s);`.
  **Mended** at 6e98d35: that line (framePack.js ~398) and a QA hook
  `queueStrips`; inflate-raw 51 (P's break proof).
- Nit: no test pins the still's `keepPageCopy`.
- Break proof: `|| _rebuiltSince(src, r0)` taken out fails inflate-raw's
  new check. Suites: inflate-raw 49, picture-door 33; state-ledger.

## Card P: #1906 (tag 5562): reviewed, listed

**The hats' hair masks as colour numbers (`traits-hairmasks`; `artCache`
88.6 -> 86.7; `?hairmasks=0`).** VERIFIED: the 155 twins (31 hats x 5
facings, beside their originals, listed in p256Files.js) are each
exactly {see-through, white}, pixel-identical to the originals; one
shared row is enough and is never given back by a mask's destroy; the
cut is the old `a * r` on the same premultiplied colours; the mask a
stencil Container (TRAPS §221), not the one program; `?hairmasks=0` is
`main`'s path, the new program made lazily; only `artCache` moved in
memory-budget.mjs. The graphics chip holds about 0.5 MB more (the masks
sent up and kept: 78.5 to 80.5 against 78.0 to 80.0, line 115).

- Low, PLAUSIBLE: `bt-palette-hairclip` is the one palette program not
  built behind the loading screen (paletteTex.js ~403; warmSilhouettes,
  pixiRenderer.js ~388, builds the others): the first numbers mask drawn
  (a stranger's or a townsperson's hat) compiles it, maybe in play. Cure:
  a 1 x 1 numbers sprite with `_btClipMask` in warmSilhouettes. Settled
  by `mp-heldsweep` with a hatted stranger arriving. **Mended** at
  fcd36b1: warmSilhouettes draws the same 1 x 1 numbers texture once more
  as a hair mask (monsterSilhouette.js ~308, ~333).
- Low, PLAUSIBLE (QA): `mp-hairstencil` turns the stencil off live; a
  numbers mask under Pixi's alpha mask reads r = index / 255, the hair
  about 0.4% seen: its check likely red. Cure: run it with
  `?hairmasks=0`. **Mended**: it runs with `?hairmasks=0&capehood=0`; P
  reports it red on `main` too (7 of 13 at 29b1a0d: its probe finds no
  hair), the same here: a Found for J2.
- Low, VERIFIED: a mask loading in play is numbered on the page
  (p256.js `p256LoadParser.load` ~214): 0.09 ms a mask, the law's last
  resort; CLAUDE.md §8's "art that loads as you walk" row names
  `loadTrackedStrip`. Cure: a line in the PR on why, or `stripRead`.
- Nits: `?p256=1` with `?alphaclip` makes the masks numbers under the
  alpha mask (`ALL_TWINS` skips the test); no node suite pins the route,
  the cut or the shared bundle.
- Break proofs (the guards): the program's name out of drawLanes.js
  fails draw-lanes 7 and 10; the `hairmasks` form out fails switches 13.
  Suites: strip-door 36, palette 15; the guards asset-door,
  asset-sources, draw-lanes, switches, switch-reader, budgets,
  state-ledger, pixel-readers.

## Card P: #1918 (tag 5563): reviewed, listed

**The pets' sheet as colour numbers (`pets`; `artCache` 86.7 -> 85.2;
`?petsheet=0`).** VERIFIED: the twin (`pet-sheet.p256.png`, 80 KB
against 365 KB, 768 x 512) beside its original, listed (error 0.021);
of 99k pixels seen none turns see-through or back; 132 move alpha by
more than 32 and 351 a colour channel by more than 48 (within the
owner's 256-colour rule, under the whirlwind's 0.028). No CPU reader of
a pet (TRAPS §165, §166: `petSprites` only cuts; no filter, no fill, no
shadow caster; the palette route has the last word in `addToBatch`).
The sheet loads only behind the loading screen (7.5 ms cold to number
here); `?petsheet=0` is `main`'s path; only `artCache` moved. The chip
holds 0.38 MB more for the sitting (sent up front, kept, a pet out or
not).

- **Mended** at 9ca4968 (below). Low, VERIFIED: the pet's portrait (src/ui/petPortrait.jsx ~9-24) makes
  its own `<img>` of the original, a cache hit before and now not: the
  first portrait shown in play (a catch's card, the Pets page, a trade,
  the store) fetches 365 KB, blank until it lands, then draws the full
  colours while the world draws the twin (its header's "the picture the
  loading screen already fetched" is false now). Cure: the portrait
  loads `p256Twin(URL) || URL`.
- Low, PLAUSIBLE: nothing ties the twin to a sheet made again
  (tools/make_pet_sheet.py, mend_slime_shine.py run no `reduce256`, and
  no guard holds a twin to its original): the next pet would have empty
  cells in the world's twin. Cure: the maker runs `reduce256`, or a
  check of the twins' cells against their originals.
- Break proof: the `petsheet` row out fails switches 1 and 13. Guards:
  asset-door, asset-sources, switches, switch-reader, pixel-readers,
  budgets, state-ledger, draw-lanes; strip-door 36, palette 15.

## Card P: #1925 (tag 5564): read by the gatekeeper, changed, listed

**The cape hood's hair masks as colour numbers (`cape-hood`; `artCache`
85.2 -> 84.5; `?capehood=0`).** Its finder stopped at the weekly limit,
so the gatekeeper read it, at 894f13c and again at its new head 2a81f66.
The first head made the hood's three HALVES twins too (cut to 256 from
1,288 to 1,908 colours); the new one drops them (P's answer (a): a cape
is pixel art drawn crisp, its source `nearest` and read by sharpPixels.js
as a piece of the figure, while colour numbers are drawn by a read that
blends four texels: the halves stay pictures, nothing a player sees
changes). What is left: the three hair masks, exact (two colours, error
0), on the hats' masks' row (`bundleOf`), loaded behind the loading
screen with the capes (capeSprites.js) and kept. Read on the CPU by
nothing: the portrait (characterPortrait.js ~674) loads its own `<img>`
of the originals; a mask is no shadow caster (`includeInBuild` false).
`?capehood=0` (and `?alphaclip`) keeps the pictures, `main`'s path. Only
`artCache` moved (22.1 -> 21.4 at the fight, three runs; the census
1.50 -> 0.93).

- Low, PLAUSIBLE (as #1918's): tools/cape/split-cape-hood.py makes the
  masks and runs no `reduce256`; a hood cut again would leave stale
  twins. Cure: as #1918's.

## Card O: #1896 (14a, tag 5234) and #1915 (14b, tag 5236): reviewed, mended, listed

Mends read by the gatekeeper at 551d2bb > d7fab15 (`main` 481bac2 in):
self-test 37, glint-peer-slots 22; the switch reader, switches and the
state ledger's guards green.

**The self-test at the door: two programs (14a), five more (14b).**
Read at 8e3d9c6 and d68bc2d; the new heads (33180d9 > aec746a, `main`
29b1a0d in) read by the gatekeeper: `selfTest.js` asks
`swValue('selftest')` (the morning's own `location.search` read put the
switch reader at 222 of 221, and switches 13 red): on `main` + aec746a
the reader 221, switches 495 rows, self-test 34, green. No wait on the
graphics chip (the fence asked with a zero timeout, the copy read after
it signals, at the top of a frame); nothing measures the page; WebGL 1
`skipped`, no fence or a lost context `unread` (kept); the test's
pictures and targets destroyed. False failures: none found (the sharp
read at 2x on texel middles; the shine about 1 level off at half
precision against 4; the look within 2). TRAPS §340 kept
(`lookSheenState` null while the look waits; the armour waits). The
CLAUDE.md line is true (the one program the phone default since 5016).

- Medium, PLAUSIBLE (the path VERIFIED by reading; no worse than
  `main`), 14a: `paletteDecided()` is `_ok !== null` (paletteTex.js
  ~1216), true at the link (~949), before the verdict; the trees
  (paletteLoad.js `load()`: `paletteOn()` asked before `await readPng8`,
  not after) and the effects' twins loaded in that window stay numbers,
  drawn for the session by the program that failed (computers: the three
  programs). Cure: `paletteDecided` waits for the palette verdict.
  Settled by `mp-selftest`'s `fail:palette` page with `onebatch=0`,
  reading `__btPaletteLoad().pictures`. **Mended** at 551d2bb:
  `paletteDecided()` is `_ok !== null && !selfPending('palette')` (the
  queue follows the link in the same run: no window); self-test §4 holds
  it (the gatekeeper's break proof: the old line fails §4); O's page
  check `mp-selftest` 3b2: 0 colour-number pictures alive after
  `fail:palette`, against 112 before.
- Medium, VERIFIED by reading (no worse than `main`), 14b: one snippet
  (`SHARP_SAMPLE_GLSL`) is the sharp read in the one program, the sharp
  batcher and the sheen batcher; on a phone a failed `one` (its test now
  holding the sharp picture) only turns the one program off (~1072);
  `sharpSelfTest` runs only at setup, so the three programs draw the
  figures and the shine with the same read. Decision (1) holds on
  computers only. Cure: the `one` fallback queues `sharpSelfTest(r)`.
  **Mended** at d7fab15: it does (paletteTex.js ~1076); a test queued
  from inside a verdict no longer queues the poll twice (selfTest.js
  `_poll`); §7 and `mp-selftest` 2b2 hold it.
- Low, VERIFIED, 14b: the shadows' system is made whatever `?lightfx`
  says (lightFx.js ~97, pixiRenderer.js ~391): the shade program built
  and tested with the light off (32 to 38 ms behind the loading screen),
  a `shadow` failure reported where none is drawn. Cure: gate it on
  `lightFxOn()`. **Mended** at d7fab15: `LightFx` asks `shadeSelfTest`
  only where `lightFxOn()` (the one `ShadowSystem` is LightFx's); a light
  turned on later in the sitting is drawn untested, as today.
- Lows, PLAUSIBLE, 14a: on the black screen's recovery reload
  (BroTown.jsx ~12567) `selfTestReady()` is asked before anything is
  queued (the group resolves at once); each test draws one sprite at
  slot 0, so "the self-test lets the page see" TRAPS §225's fault
  overclaims. Nit: `?selftest=fail:sharp` does nothing on the one route.
- Break proofs: the `TIMEOUT_EXPIRED` line out fails 3; the `unread`
  branch out fails 2 and 3; `lookSheenState` without `selfPending` fails
  7; `stillNow` without `_ok === false` fails 7.

## Card J2: #1879, #1888, #1892, #1902, #1904, #1912, #1916, #1919, #1921, #1924 (tags 5431, 5427, 5433, 5434, 5435, 5436, 5437, 5438, 5439, 5640): step 3, listed

Tests only, each one scenario of `tools/qa/mp/` and J2's status, its
tag the card's (5420 to 5439), each judged the TEST's by TRAPS §177:
`mp-partychip` (an accept after its invite arrives; the chip's opening
watched, not sampled; a dead tap and a disarmed kick made once more),
`mp-boardwheels` 2 (waits for the drawn figure to hold still),
`mp-fishvariants` (Inspect behind the card's "⋯" since 4191; the
commons' safe heal off for the Eat, as `mp-quickeat`), `mp-jump` (the
upright button 5 to 65 degrees below west, where 4130 put it; the lean
jumped again when a stall leaves too few frames), `mp-shieldgem` (the
tab pressed until the lazy window turns), `mp-deathzones` 12 (the mire
wisp is the rotcap since 4357), `mp-sprint` (Sprint against the attack
disc's box, not its shrunk picture), `mp-moresounds` (a sample held as
bytes counts since the sound cache, 3735; 8b asks no anvil, not no cue;
your own moves' sounds are the ones at full; Ace tapped again when he
walked off), `mp-lazyfail` (Achievements through the Bro card's row,
where 4172 put it, as `mp-achievements`), `mp-deskharvest` 5 (a phone's
first harvests show the PHONE's line on purpose since 4196, read from
gesturePose.js's own words; never the computer's). No game file; no
deploy. Two shared files, each in a place of its own: #1921 adds TRAPS
§342 ("the test can't find the button: the game lost it", the five
doors J2 found moved on purpose; main ends at §341, no open branch
writes a §342); #1924 writes J2's second block in tag-blocks.json
(5640 to 5659, `nextBlock` 5660: no open branch of the last twelve
hours writes a block past 5640) and takes its first number.

## Not listed

- K's #1900: above (a fresh K session after this sitting).
- R's #1873 (a weapon's own id, a stored shape): held by the planning
  session's word, as at sitting 19 (after OPS's switch row).
- The red team's RT-3 #1878 and card MOD's #1890, #1897, #1907 (and
  #1909, #1914): not on this sitting's list; not read here. **Sitting
  19's holds stated again** until a sitting reads their mends (#1878's
  three MEDIUMs; #1897's `freezedevice`; #1907's join name, HIGH).
- MOD's #1883 (the card) was on sitting 19's list and is still open, not
  merged: the next sitting's, with MOD's line.
- OPS's drafts (#1874, #1880, #1886, #1891, #1893, #1905, #1908, #1913,
  #1917, #1920) and the red team's finding drafts: not ready.

## Stalled

- Card K: its session stopped with the allowance (#1900 above); a fresh
  one is to start, by the planning session's word.

## Found (no card's, or another card's)

- J2 (red on `main`, as each card reports it): `mp-hairstencil` 7 of 13
  on 29b1a0d (its probe finds no hair; P's), `mp-palette` 4 of 15 (shadow
  bases, water; O's), and L's list: ownersounds 3, hitsound, race (Lil
  Bro's jog cells), desklunge, bowprops 3, blockface 2, and
  `mp-petsmatter`'s chill number (P's).
- L, next PR: the census and the ledger's guard count a door call
  whatever its way (#1876, #1894 lows); `?racedoor` filed under `quests`.
- P, next PR: no twin is tied to a picture made again (the pet sheet's
  and the hood's makers run no `reduce256`); #1906's masks numbered on
  the page in play (a line on why, or `stripRead`).
- O, 14c: 14a's two plausible lows (the recovery reload's group; one
  sprite at slot 0).
- R: `grids.js` `_tryLevelUpFromBuildPoints` has no caller; spar.js
  ~374's clone copy writes `level`, `prog3` (and `po`, sitting 18's
  Found) unseen by the doors' scans.
- Card T: the new page rows on this list (`?racedoor`, `?harvestdoor`,
  `?posedoor`, `?guarddoor`, `?hairmasks`, `?petsheet`, `?capehood`)
  carry `on` 2026-11-15 and merge on 2026-11-16 or later: the next switch
  table PR sets each to its merge day (R's three live flags are `off`,
  rightly; `?selftest` is a lever).

## The lines

On `main` 481bac2 the four lines' guard and the phase table's print no
room sitting 19's merges earned (the `todo` count 22 at its line 22;
each file at or under its line): no line is lowered. L's four page doors
on this list bring the `todo` count to 16 (21, 18, 17, 16): the next
sitting lowers `TODO_LINE` once they are merged. The memory line moves
only by P's own, each measured in its PR: `artCache` 88.6 -> 86.7
(#1906) -> 85.2 (#1918) -> 84.5 (#1925).

## The list

J2: 1 #1879 · 2 #1888 · 3 #1892 · 4 #1902 · 5 #1904 · 6 #1912 · 7 #1916 ·
8 #1919 · 9 #1921 · 10 #1924 · R: 11 #1877 · 12 #1887 · 13 #1895 ·
14 #1898 · 15 #1922 · L: 16 #1876 · 17 #1894 · 18 #1903 · 19 #1910 ·
O: 20 #1896 · 21 #1915 · P: 22 #1881 · 23 #1906 · 24 #1918 · 25 #1925 ·
26 this PR; each "Create a merge commit", in one sitting, in this order.
Twelve deploy the worker (11 to 22: R's five by `server/src`, L's four,
O's two and P's #1881 by `server/test`): back to back. J2's ten and P's
last three touch no `server/` file. Three add a live flag, each OFF (the
owner's costs: `fullsnap`, `resetbook` on #1887, `xferescrow` on #1895,
one after another in R's stack); eight add a page switch (each row in its
place by name; the whole merges clean step by step). No stored record of
a player changes its shape (#1887's safety copy and its new room record
`econ_gone`, read on a rolled-back worker: above). Each card stacks its
own: every PR above a card's first merges the one below it; `main`
481bac2 is in each card's first.

## The whole

Rehearsed with `tools/dev/gatekeeper.mjs` from `main` 481bac2, the
twenty-five heads in the list's order (tree 1d7b826b): precheck 0 FAIL
(2 WARN), build, questline 187 of 187 (467 s). Each listed PR's base is
`main` (its `base.ref`), none a draft; ONE merge base each, step by step
(counted with `git merge-base --all` against `main` with every PR above
it merged, the same tree). With this branch last: one merge base, a clean
merge (tree eb3ff29d), its precheck 0 FAIL, 2 WARN: the version-tag
notice that L's next branch (`plan-l-22-arena-door`, stacked on L's line)
carries L's four tags, and the 48 hours' branch count.

Card J2's ten, R's five, L's four, O's two and P's four heads, each the
one its card sent on 2026-11-16 (`main` 481bac2 in), compared with the
head reviewed: J2's and L's change nothing but the merge; R's the
admin.js imports (both kept); O's and P's their mends (read above).

