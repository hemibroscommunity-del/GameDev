# The state-machine sweep (2026-11-03) and its fixes (v2.3.4381, v2.3.4433, v2.3.4461, v2.3.4580, v2.3.4650)

## What it was

A "state machine" here is anything in the game that goes through steps: a
duel (asked, accepted, fighting, over), a trade window, a death (dying, dead,
standing up), a socket (connecting, joined, dropped). Many of these were
never written as one list of steps. They were spread over several true/false
fields set in different places, so two places could disagree about which step
you were in. That is where bugs hide: a duel the phone thinks is on and the
server does not, a trade window nobody can close.

On 2026-11-03 a sweep went through the code looking for these, checked each
finding, and had three reviewers read the result. It wrote a fix plan.

## Where its files are

Not on `main`. They live on the storage branch `claude/state-machine-sweep`
(pull request #1415, never to be merged), in the folder
`docs/state-machine-sweep-2026-11-03/`:

- `README.md`: what the sweep is and how its files fit together;
- `PLAN.md`: the fix plan, one item a system;
- `verified/<V>.md`: each system's checked findings (V1, V2, ... VA, VB, VC);
- `reviews/R1.md`, `R2.md`, `R3.md`: the three reviews.

The owner's readable copy is the doc "Implicit State Machines in BroTown"
(https://claude.ai/artifact/PrspeJRdJWG6ciAYtRspen).

## How to use them

Before you fix an item, read its `verified/<V>.md` and the item's bullets in
all three reviews. Then **confirm each claim in today's code first**: about 1
claim in 5 was wrong when the lanes checked, and the code has moved since.
A fix starts with a test that fails on today's code.

## What shipped (2026-11-10, pull requests #1457 to #1476)

| PR | Tag | What | Kill switch |
|----|-----|------|-------------|
| #1458 | v2.3.4361 | phantom duel: an accept waits for the server's word; a duel swing names its foe | |
| #1459 | v2.3.4362 | trade window: Leave never waits forever; a reconnect keeps a live window | |
| #1457 | v2.3.4363 | the phone never plays a death on its own; one stand-up | |
| #1460 | v2.3.4364 | loot piles on the server's clock (`workerClock.js`); one mayAsk for hand and pet | |
| #1462 | v2.3.4365 | block list: one writer, one table (`blockedAsks.js`); Block stops direct messages | |
| #1461 | v2.3.4366 | dungeon opening ignores a second Enter; one farm trip (`farmTrip.js`) | |
| #1463 | v2.3.4367 | one socket at a time (`socketLine.js`); the "Reconnecting" cover re-checks under the loading screen | |
| #1465 | v2.3.4368 | looks: one head-key builder; chained body retry; eyewear and eye-style "ready" | |
| #1464 | v2.3.4369 | General Store sell tap: one at a time, no old pick (a stop-gap) | |
| #1466 | v2.3.4370 | the ground helper: a failed start retries (`startFetch.js`) | |
| #1468 | v2.3.4371 | a dueller who leaves the zone forfeits after 15 s | `duelzone` |
| #1476 | v2.3.4372 | the points reset's minute survives a rejoin | `pointsresetroom` |
| #1470 | v2.3.4373 | "dead" is the server's word | `serverdead` |
| #1469 | v2.3.4374 | a join at 0 health stands up in BroTown | `joinstandup` |
| #1467 | v2.3.4375 | the old gift trade is closed while the trade window is on | `giftclosed` |
| #1471 | v2.3.4376 | the kill switches load before any web request | (none, on purpose) |
| #1472 | v2.3.4377 | a takeover saves what a close would save | `takeoversave` |
| #1474 | v2.3.4378 | a never-seen party leader's idle clock | `leaderidleat` |
| #1475 | v2.3.4379 | the anti-bot record of a live player is never evicted | `botrecordkeep` |
| #1473 | v2.3.4380 | old skill tracks frozen under prog3: no heal on a forged rise | `skillfreeze` |

A kill switch is a live flag: setting it to `false` brings back the old
behaviour without a deploy. The lessons are in `docs/TRAPS.md` §262-278.

## What shipped, second wave (2026-11-10, pull requests #1478 to #1500)

Each row: what a player gets, its live flag, and the server suite that fails
if it breaks. A blank flag means none on purpose (a phone-only fix, or a
leftover cleared inside a rule that already existed). Lessons: `docs/TRAPS.md`
§284-308 and the note under §278.

| PR | Tag | System | What | Kill switch | Suite |
|----|-----|--------|------|-------------|-------|
| #1479 | v2.3.4382 | rejoin | after a reconnect the server re-sends a live duel (`duel_resume`) and trade (window, or the newest invite); the phone clears its copies only when `caps.rejoinResend` says so (a count: 1 duel, 2 trade); leaving a trade the server no longer has is answered at once | `rejoinresend` | `rejoin-resend` |
| #1478 | v2.3.4383 | death pile | its windows go as time left (`openLeft`, `left`); a pet's refused pickup says it was the pet's (`viaPet`) | `pileleft` | `pile-left` |
| #1483 | v2.3.4384 | death pile | the pile survives a server update: one row `death_pile:<lootId>`, written with the death's save, deleted with the taker's | `deathpilesave` | `death-pile-saved`, `cost-guard` §13 |
| #1484 | v2.3.4385 | harvest | a bow volley's stuck arrows no longer end a harvest | `volleychip` | `volley-chip` |
| #1482 | v2.3.4386 | gear | a Rare armour piece survives a reconnect (matched by `gid`); the weapon picker checks a full bag and the level; a refused weapon is re-sent | `gearresend` | `gear-resend` |
| #1480 | v2.3.4387 | combat (phone) | a tapped swing is shown to others; no held attacks while staggered; a one-gem bow or staff shows its element; no "+N MP" the server never paid | | `swing-shown` |
| #1481 | v2.3.4388 | pet (phone) | the pet's fetch has a clock (`_petNow`): its timers fire, playful and curious pets are drawn | | `pet-clock` |
| #1486 | v2.3.4401 | quests | the six silent quest refusals re-send the true quest list, coins, points and XP | `disable_quest_echo` (set it to turn the fix off) | `quest-echo`, `cost-guard` §14 |
| #1485 | v2.3.4402 | mute (phone) | a mute tapped while the line is down is kept and sent on the rejoin; the channel's `send` returns `false` when it drops | | `mute-kept` |
| #1489 | v2.3.4403 | monsters | a world monster's next life starts clean (ball, knock-back, lunge from a corpse, lifesteal, the phone's swell) | | `monster-life`, `slime-boss` §8 |
| #1487 | v2.3.4404 | friends (phone) | a refused friend request says why | | `friend-errors` |
| #1491 | v2.3.4405 | shield | the phone never re-judges a blow the server landed; others' shields drawn right in any zone; a monster's blow at 0 stamina breaks the guard for 3 s | `monsterguardbreak` | `shield-guard` |
| #1493 | v2.3.4411 | small slips (phone) | the board button stays while riding; others' freeze and wobble are drawn; the microphone stops when the chat box closes | | `phone-slips` |
| #1496 | v2.3.4412 | Auction House | an ignored offer's gold comes back at 48 h on a busy shelf; a lost "list" answer says "not sure" and keeps the card locked | `disable_offer_sweep_all` (set it to turn the fix off) | `store-offer-sweep`, `store-answer` |
| #1492 | v2.3.4413 | session exits | a failed join closes with 4013, not the fight's 4010; an admin restore waits for a body left in a fight; arena fighters cannot eat after a reload | `arenaeatgate` (the eating fix only) | `session-exits` |
| #1497 | v2.3.4414 | changing place (phone) | `changeZone` clears what you left (respawn, dungeon entry, Workshop clear, farm trip); the dungeon's loading screen comes down only by its owner; a stale world load is not "loaded" | | `zone-leftovers` |
| #1495 | v2.3.4415 | renderer (phone) | a black-screen rebuild remakes the buildings' little effects; the loading report shows a failure; the health-bar pictures retry; a reconnect stands you up | phone: `?barretry=0` (or `?retrylooks=0`) | `renderer-life` |
| #1494 | v2.3.4416 | art caches (phone) | a shared monster sheet is kept while any look holds it; a failed building page is asked again after 5 s; a departed player's gear sprites are freed | | `art-holds` |
| #1500 | v2.3.4421 | refusals | the harvest cap re-sends the skills; the cook popup says 200 XP; the amulet's set gem cannot be spent again; a refused arena bet leaves the screen | | `silent-refusals` |
| #1498 | v2.3.4422 | sound (phone) | after an iPhone app switch the ground footsteps and the slime hum come back | | `audio-rebuild` |
| #1499 | v2.3.4423 | dungeons | a move into a dungeon nobody opened is refused (no free half second of safety, no leak) | `dungeonlive` | `dungeon-live` |

Most live flags here are `false` to go back; the two named `disable_*` are
`true` to go back. `?barretry=0` is for one phone, in its address.

## What shipped, third wave (2026-11-10, pull requests #1502 to #1509)

Same columns as above. Lessons: `docs/TRAPS.md` §309-316.

| PR | Tag | System | What | Kill switch | Suite |
|----|-----|--------|------|-------------|-------|
| #1502 | v2.3.4432 | session exits | a second login (a second tab, a quick relaunch) while your body is in a fight with another player counts as leaving: the body stays 20 s, hittable, and the new login waits on the "still in that fight" screen (or resumes from within 300 px) | `takeoverlinger` (`linger: false` also turns it off) | `takeover-linger` |
| #1509 | v2.3.4455 | session exits | ...and a game that can be placed goes straight back into that body, where it stands, with its health, bag and fight: the server keeps the live body and sends `body_place` (cap `bodyTake`); until the phone stands at the body its moves are dropped; after 60 s it falls back to the wait | `bodytake` | `body-take`, `body-place`, phone `mp-bodytake` |
| #1508 | v2.3.4454 | changing place | the half second of no damage on entering a place is not given mid-fight (a hit between players in the last 10 s) nor twice within 10 s, so hopping between places is no shield; a phone's own "I'm dead" still cannot stop the body staying (already closed by v2.3.4373, now tested) | `entrygrace` | `fight-dodges` |
| #1503 | v2.3.4441 | quests | the Mayor's "Clear any dungeon" (`mayor_3`, 300 gold) is paid only for a clear on the server's own record (`lifeSkills.dungeonClears`); players already paid keep it | `disable_mayor3_check` (set it to turn the check off) | `mayor-dungeon`, `quests` |
| #1504 | v2.3.4442 | duels; Auction House (phone); blocks (phone) | a refused duel accept is answered at once (both players when one is already in a duel; only the accepter when there is no live challenge); the same stack can no longer be listed twice by closing and reopening the sell card (the lock is on the item); a leftover block check removed | | `duel-drops`, `store-answer` §7, `blocked-asks` |
| #1505 | v2.3.4452 | art loaders (phone) | a picture whose download failed or never answered is asked for again (capes, weapons, shields, the badges and pins over heads, armour mid-swing, the hat's hair clip, the head-piece tables, the memory saver's restore); four leftovers are freed (the stat scene's slime on a rejoin, a farm picture that lands after you left, a recolour freed mid-load, the dungeon entrance after a black-screen recovery) | phone: `?caperetry=0`, `?weaponretry=0`, `?shieldretry=0`, `?iconretry=0`, `?gearretry=0`, `?picsretry=0`, `?traitretry=0`; `?retrylooks=0` for all | `loader-retries` |

The new message is `body_place` (in `PRIVILEGED_EVENTS`, handled in the
phone's direct switch) and the new cap `bodyTake` (in `CAP_GATES`). The four
server switches are `false` to go back except `disable_mayor3_check`, which
is `true` to go back. The `?...=0` switches are for one phone, in its address.

## What shipped, fourth wave (2026-11-10, pull requests #1521 to #1525)

Same columns as above. Lessons: `docs/TRAPS.md` §320-326.

| PR | Tag | System | What | Kill switch | Suite |
|----|-----|--------|------|-------------|-------|
| #1521 | v2.3.4500 | Auction House | each money step saves the gold (or goods) and the listing in ONE write, so a restart lands before it or after it, never in the middle: an offer handed back, a raised offer (no more gold made from nothing on a Yes), a stack put up for sale, a buy-now (marked paid as it pays); a Yes on an offer whose gold already went back pays nothing | `ahonewrite` | `store-onewrite` |
| #1522 | v2.3.4505 | General Store | when two orders meet, the server writes who is owed what (a `settle` note on the waiting order) in the same write as the taker's gold or weapon; each payment is made once and the order deleted only when all are done; a restart finishes the note (at the shop's rebuild or at wake), and the clean-up of old "paid" stamps waits until it has (no more weapon sold twice after 48 h) | `mktsettle` | `market-settle` |
| #1523 | v2.3.4510 | fight lock | one table, `server/src/fightlock.js`: every road that spends, converts, wagers or gives away gold or bag goods is refused during a fight with a player in No man's land (the forge, hardening, gems, the amulet's craft, the jackpot, the gambles, the cape ticket, the pet house, Auction House offers, the arena's sponsor and join, a weapon put into a trade, a duel of any stake); a dungeon mouth (and a leader's party pull); putting on a spare weapon. Ten seconds after the last hit it all opens again. Safe ground, a town duel and the Arena are unchanged | `fightlocktable`, `fightlockdoor`, `fightlockequip` (`fightlock` still opens everything) | `fight-lock` |
| #1525 | v2.3.4520 | the owner's trial: the free swing | ONLY a device that asks (`?manual=3`): the sword swings on every swipe, each swing worth its share of a full one, so the damage a second is the same however fast you swipe; a light swing has no shove, gem effect or spark; `&swingbonus=1` adds +12% for a swing after a full pause, on monsters only. Everyone else's game is unchanged | `freeswing`, `freeswingbonus` | `free-swing`, `manual-combat` §13, phone `mp-freeswing` |

No new storage key, no new record shape except the market's `settle` note
(its own `v: 1`, in ARCHITECTURE-HANDOFF's registry). The new cap
`freeSwing` (on its own line, TRAPS §316) and the new message `free_swing`
are #1525's. All the server switches are `false` to go back.

Tools and documents only, the same day: #1516 (v2.3.4492, two phone tests
caught up with the game), #1517 (v2.3.4498, `mp-deskclick` aims where Ace
stands; not a game regression, TRAPS §320), #1518 (v2.3.4499, the crowd tour
`mp-crowdsweep`, findings a to i in `docs/specs/held-sweep.md`).

## What shipped, fifth wave (2026-11-11, pull requests #1526 to #1534)

Same columns as above. Lessons: `docs/TRAPS.md` §327-336. The lanes were
renumbered as `main`'s high-water passed them; these are the final tags (the
fourth wave's notes named them v2.3.4550 to v2.3.4575 while they were open).

| PR | Tag | System | What | Kill switch | Suite |
|----|-----|--------|------|-------------|-------|
| #1526 | v2.3.4575 | which Wheel a player is on | a page that joins the live room without the room's Wheel size (`ws` with no 5) is a spectator there: never attacked (as before) and now unable to hurt monsters, or players outside a duel. The owner's preview pages (`?bigtown`, `?plaintown`, `?placing=2`) are the one honest page that joins this way; they walk and draw as before. Out of the Wheel's zone nothing changes | `wheelstep` | `world-size` |
| #1530 | v2.3.4605 | what a move's claims buy | a parry needs the shield down 400 ms first (a quicker raise still blocks); a sword's swing lowers the guard on the server (a bow, a staff, Shield Bash and the burst do not); a shield with no facing covers the front, not all round; the cooking and fire shield needs a fire the server saw lit, within 320 px and 60 s, and holds again only 3 s after an attack. All in `server/src/moveclaims.js` | `parryrearm`, `swingguard`, `blockarc`, `cookshield` | `move-claims` |
| #1528 | v2.3.4606 | two tabs, one browser | a tab keeps the character it started with; if another tab switched the browser to another character, this tab shows the takeover's banner and Play here instead of joining as the other one or minting a level-1 copy; a join never makes a character (only Create does); the saved copies say whose they are. Phone only | `?tabid=0` (one phone) | `tab-identity`, phone `mp-tabidentity` |
| #1529 | v2.3.4615 | the owner's trial, second step | ONLY `?manual=3`: the perfect strike, a sword swing or bow shot from 60 ms before the full cycle to 300 ms after it, judged by the server: +12% damage and an eighth of a special's mana, on monsters only; quick hits climb in pitch (up to five steps), a perfect strike adds a quiet "ting". The bar's rules for its art (`docs/specs/manual-combat.md`); the bar itself is #1532 | `freeswingbonus`, `perfectbow` (`freeswing` the whole trial) | `perfect-strike`, `free-swing`, `manual-combat` §14 |
| #1534 | v2.3.4640 | the server judges a change of place | the worker takes a change of zone only with a reason: into a dungeon on the pass `dungeon_started` gives (used once, 20 s, the fight not asked again at the step in), out of the world only from BroTown's safe ground (where the farm's doors are); the stairs, the farm's gate, a dungeon's door and the old map as before. `/api/admin/overview` counts refusals by road (`zoneJudge`) | `zonejudge` | `zone-judge` |

No new storage key or record shape. New cap: `perfectStrike` (#1529, on its
own line above `accuracy`, TRAPS §333). No new message here (#1531 adds
`character_reset_refused`). All the server switches are `false` to go back.

From another session, the same day, closing items on this list: #1531
(v2.3.4626-4627: no character restart and no armour swap during a fight with
a player in No man's land; `fightlockreset`, `fightlockarmor`;
`fight-lock.test` §8-9), #1532 (v2.3.4625: the timing bar drawn with the
owner's own sword and arrow, standing up over the left joystick, built on
#1529; `?timingbar=0`; phone `mp-timingbar`), #1533 (v2.3.4628: the duel
challenge card closes itself when the challenge runs out on the server, 2
minutes; `duel-pending.test` §7), #1535 (v2.3.4641: a quest tap made while
the connection is down is kept and sent on the rejoin, and `stats_update`
keeps its signature only when the message went (TRAPS §287); each quest's
phone check is held to the server's goal by `quest-check-drift.test`, which
found and fixed one drift, the Mayor's "Clear any dungeon"; `quest-kept.test`),
#1537 (v2.3.4642: the rest of the silent refusals, V9a and V9b: a refused
harvest strike sends the node and the skills again, at most once a node every
2 s a player, `strikesnap`; a refused armour swap sends the worn armour back,
`gearresend`; a refused cook already re-sent; `silent-refusals.test` §5-6).

## What is left

This is a list, not a promise. The plan is `PLAN.md` on the storage branch.
Updated v2.3.4650, after the fifth wave. The judges have played (owner,
2026-11-10: "Judges have already played you can do any big repairs now"),
so nothing waits on them any more.

**Waiting on the owner:**
- the shield questions 1-4 (`docs/OWNER-LIST-2026-10-26.md` §10): showing
  the 3 s guard break on the phone, the guard coming back by itself, a daze
  or freeze stopping a raise on the server, the cooldown number. #1530 left
  them alone;
- the staff's timing: the trial's bar and perfect strike are for the sword
  and the bow; magic is skipped for now (owner: "For magic I think it should
  be skipped for now"). The owner's art sheet has the staff, unused.

**Not started, no decision needed:**
- ~~nine places still change zone by hand, five on the retired old map
  (TRAPS §304)~~: all nine go through `changeZone` (v2.3.4651), the only
  writer of the place now (`zone-leftovers.test` §6);
- the bigger "one reset for a whole life" of a monster (`m.life`);
- a tab already in the world that reconnects mid-fight gets no `body_place`:
  its next step decides (beside the body it carries on, far away it waits)
  (#1509);
- outside a fight, a takeover still skips the close's other duties (the
  duel's away clock, the trade's cancel, party "away", PvP consent, the
  chat-mute list, the daily-quest flush, `player_leave`); mostly on purpose,
  so a reconnect does not cancel a trade (TRAPS §162, #1502);
- ~~the other six `*Preload.js` warm-ups push the same image URLs again on a
  rejoin (likely shared by the browser; only the slime was a proven cost)
  (#1505)~~: five did (the chest already warmed once); they share
  `warmOnce.js` now, one held picture a URL for the page, a failed one tried
  again (v2.3.4652, `warm-once.test`; `?warmonce=0` the old way);
- the small-bugs bundles' other items (VA, VB). Done from VA: the tick's
  four unguarded systems (S3-1: parties, regen, the player-state flush, the
  ping and AFK sweep), each in its own guard now, a throw before them caught
  at the tick's top (v2.3.4653, `tick-guard.test`). Left in VA for the
  owner: the feedback board's typed id (a real ranking needs a real identity;
  a suggestion box needs only a limit a connection), and the chain RPC's
  missing time limit (S5-16: the same call sends the paid score
  transactions, and one cut off after it was sent could be paid again);
- VC-3, the owner-only Ground and Object Studios (`public/tools/`, low
  priority): ~~one unreadable saved picture stops the page before Download
  and Restore work~~ (v2.3.4654: the Ground Studio skips it and names it in
  its count, the Object Studio makes the object again from its picture;
  `tools/qa/ground-studio.mjs` 6b, `object-studio.mjs` 7b); a restore resets the "made from" stamps and replaces sound
  and name choices; the Object Studio's stage draws about 1.36 times too big
  (#1505);
- the stat scene's memo bit (M3-18, about 1.8 MB, kept on purpose) needs a
  row in `docs/MEMORY-MAP.md` or a decision (#1505);
- a piece of armour that reached the phone's bag this session and never the
  worker's stash escapes a No man's land loss until the next join, because
  the worker learns the armour stash only at join (#1531 locked the swap and
  the take-off mid-fight). The full fix is keeping the armour stash live on
  the worker;
- a red skull killed by a monster has no fight lock (V21 Q3, #1523);
- the Auction House's settlement legs, releases and bids still heal from
  their 48-hour stamps only: a restart followed by 48 hours with nobody
  opening the shop still goes wrong there. "Paid facts in the record" (V8a)
  would cost more writes a sale (#1521);
- the species churn (#1518, finding e): 7 or more monkeys or aliens of
  different colours (8 or more species-and-skin pairs) near you build
  pictures up to 250-400 MB on the graphics chip, a black-screen risk on an
  iPhone. Listed for the performance work, with the crowd tour's other
  findings (a to d, g) in `docs/specs/held-sweep.md`. The armour pictures'
  store (`_gearStrips`) is BOUNDED, about 22 MB, not a leak;
- found by #1530, not built: the node harvest has the cook's old bundle shape
  (a swing, then `extraction_start` in one frame, shielded at once); a 3 s
  hold like the cook's would also leave an honest player who mines right
  after a kill unshielded up to 3 s, so it is the owner's call;
- found by #1530: a phone holding the shield through a 3 s guard break gets
  a parry window when the break ends, with no press; the fix is "parry only
  on the phone's own raise", beyond that lane's decisions;
- found by #1530: a modified page can label a sword's claim as a bow's (with
  a bow worn) to keep its guard up (TRAPS §329);
- found by #1529: right after a swing that hit nothing, the bar's glint can
  promise a perfect strike the worker does not count (a miss never reaches
  the worker);
- `farmorders.test` can fail once as the clock crosses midnight UTC; its
  clock is not pinned yet (TRAPS §335).

**Big repairs (no longer waiting on the judges):**
- the plan's larger "one door per system" work (#1508). Its first piece, the
  server judging a change of place, is done (#1534, v2.3.4640). What remains
  of Wave 2 item 1 (the server deciding guard and cooking itself, beyond the
  limits #1530 put on the phone's claims) and Wave 3 stay on the plan.
- **Gold has its door (v2.3.4670, `docs/specs/gold-door.md`)**: every change
  to a player's gold goes through `server/src/gold.js`, each call naming its
  row in `GOLD_ROADS`, with nothing a player sees changed (step 1). Its next
  steps (one sum for every road, then a gold log and the fight lock at the
  door) are listed there. Not started: the bag, health and death, and the
  session.

**Not fixed on purpose:**
- the player's trail reads the same unset `now` the pet did (TRAPS §294):
  fixing it may turn on something nobody has seen (CLAUDE.md §3, TRAPS §305);
- the retired Mayor quest `mayor_1` (50 gold) is still paid on the phone's
  word, once, on old saves that have it in progress;
- a look-palette set that failed is not asked for again (that visit draws
  the older way, about 5.8 MB more a look), and a missing picture shows
  nothing rather than a stand-in.

**Decided (2026-11-10):**
- a death pile survives a server update: built (v2.3.4384);
- the colour fade between places stays OFF (TRAPS §305);
- a second login during a player fight takes over the body where it stands:
  built (v2.3.4455); v2.3.4432's wait screen is the fallback for a game that
  cannot be placed;
- the half second of no damage on entering a place stays for an honest
  entry, but is not given mid-fight nor twice within 10 s (v2.3.4454);
- one character per browser: a second tab takes the session over (in a
  fight, it takes the body);
- a quest reward is shown at once and taken back if the server says no;
- the Mayor's "Clear any dungeon" is checked on the server: built
  (v2.3.4441).
- the fight lock counts every road that spends, converts, wagers or gives
  away gold or bag goods; a spare weapon is locked mid-fight; a duel is
  declined during a No man's land fight with a player: built (v2.3.4510);
  an armour swap and a character restart mid-fight too (v2.3.4626-4627);
- the General Store writes what it owes before paying, the Auction House's
  way: built (v2.3.4505);
- shield question 5: YES, the shield must be down 400 ms before a parry is
  ready again: built (v2.3.4605);
- the preview pages are spectators in the live room: built (v2.3.4575); a
  dungeon's entry pass lasts 20 s and is not re-checked at the step in:
  built (v2.3.4640);
- one character per browser: each tab keeps the character it started with,
  and a tab another tab moved shows Play here: built (v2.3.4606).

Who decided what, and the questions still open, are in
`docs/OWNER-LIST-2026-10-26.md` §10 (the shield, the dungeon's loading
screen, friends, monsters, pictures, sound, the Arena and others).

**Not measured:** the loaders' retries (v2.3.4452) were merged on their node
tests and the memory budget check. The hour-long memory walk (`mp-memledger`
with a rejoin, a farm leave and a dungeon recovery added) was not run: it is
offered.

**Already red on `main`, not the lanes' doing (2026-11-10):**
- `node tools/world/test-world-core.mjs --check` fails 4 (the Town Hall
  window, the forge room's stage, two quest checks; it was 2 of 540 in the
  first wave);
- `mp-farmmusic` step 4 (the frost land's music after the farm gate): back
  through the farm's gate the phone lands in the frost lands; #1534 saw it
  red on 6cb46cfe and 8d6f9e44, green on d48b5391 (TRAPS §177);
- `soundcues` check 2c (no buckle sound when the right mouse button
  raises and lowers the shield): red before #1516 too, left for its own look;
- `mp-block` 10 of 11 and `mp-pvpshield` (both on the retired old map; the
  shield lane saw the same on `main`);
- `mp-linger` step 4 (the countdown shows): a fresh browser takes 66 s to
  start on the test box, longer than the body's 20 s (TRAPS §177); it fails
  the same way on `main` before v2.3.4455, and now runs with `bodytake` off;
- `node tools/art/head-bake.mjs --check` listed 49 stale head sheets on the
  orchestrator's machine, the same on `main` before any lane. Unconfirmed: it
  may be that machine's picture encoder.

## How the lanes were run (for the next orchestrator)

1. **One system a lane, one pull request.** The brief points at
   `verified/<V>.md` and the item's review bullets instead of pasting them,
   and the lane confirms each claim before fixing it.
2. **A test that fails before and passes after.** Node tests in
   `server/test/`, not phone scenarios, wherever node can reach the code.
3. **Lanes never collide.** They never append to `docs/TRAPS.md` or
   `server/test/liveops.test.mjs` (each put its lesson under "For TRAPS" in
   its pull request body), never put a new import in the middle of a block,
   and are told which lines sibling lanes touch. Before anything merges, the
   orchestrator merges every open lane branch together, in both orders, in a
   scratch `git worktree`, and runs precheck and the server suite on the
   result. A new cap goes on its own new line in `join.js`'s `caps` and
   in `CAP_GATES` (TRAPS §316: two lanes that both put theirs first
   conflicted twice in one day).
4. **Lanes do not message the orchestrator.** It checks each wave once.
5. **The reviewer reads every diff.** It caught a brief of the orchestrator's
   own that would have hidden live trades on a reconnect (TRAPS §278).
6. **A lane's tag moves.** The fifth wave's lanes were renumbered up to three
   times as `main`'s high-water passed them (precheck's version gate needs a
   tag above `main`). Docs written while a lane is open name it by its
   branch; the closing docs pass writes the final tags.

And: every merge with a file under `server/` deploys the worker, a test
included (TRAPS §277). Merge a batch together, in a quiet hour.

## Smooth on every device: items A, A2, A3 (v2.3.4400)

The owner's first goal for this work (2026-11-09): "the game runs smoothly on
whatever device or browser, computers included". These three are not from the
sweep's plan: they are the judges' computers at the expo (2026-11-05) and the
owner's own iPhone, each found from a capture of the frame meter (`?perf=1`).
One line an item, ticked when done; a session takes the first open one.

Also from that day, the owner's answer to the plan's question 4 (should the
server stop believing the phone about dead, guard, cooking, zone and world
size?): **YES**. "Dead" is the server's word since v2.3.4373 (above).

- [x] **A. Patches like a checker pattern round the edge of the view, and
  "not smooth", on the judges' computers.** DONE, v2.3.4400.
  - **The cause was not the computer's size or its graphics chip.** It was a
    computer that had never opened the game, on a slow line, with its
    processor busy. Three faults, each reproduced on the test box first:
    1. a ground picture still downloading was drawn as the Ground Studio's
       "not made yet" chequer (`ground-worker.js`, A SLOW LINE);
    2. a download was cut at 15 s and begun again from nothing;
    3. the zone gate let go at a flat 15 s while the first screen's ground
       was still being laid, the missing squares on the outer ring
       (`src/game/zoneGate.js`).
  - **The spec**: `docs/specs/slow-line-ground.md`. **The measuring**:
    `node tools/qa/mp/run.mjs desksmooth` (three computer sizes, slowed, and
    on a thin line; its lines are numbers a later PR can break).
  - **Not provable on the test box**: a fault only a real graphics chip
    shows, and a real frame rate (the box draws in software). The evidence
    did not point there. To capture it on a computer: the Test panel's
    **Speed test**, and a screenshot of its card.
  - **The owner's call, 2026-11-09 ("Go recommended")**: on a slow first
    visit the loading screen waits for the town's pictures while they are
    still coming (up to 30 s; the gate up to 45), so the town arrives drawn.
    Only a line under about 80 KB a second, or one gone silent, still starts
    in plain colours.

- [ ] **A2. How a computer DRAWS the game.** OPEN: next, by the
  owner's word of 2026-11-09: "It's just unoptimized for desktop. Can you fix
  how the game gets processed when used on desktop? It's all been focused on
  mobile performance."
  - **What is already known** (item A's measuring): the game's own work a
    frame on a computer's view is small and the same at every window size
    (4 to 6 ms on the test box), because every screen sees the same area of
    world (`docs/specs/view-cap.md`). So the code is not what a computer
    waits for. What is left is the drawing, and that was only ever tuned on
    phones:
    1. **no pixel budget.** The canvas is drawn at the screen's own pixels
       (`src/game/renderRes.js`): 1.9 million at 1920 x 1080, but about 6
       million on a 4K screen at 150% and 11 million on a 5K one, against the
       2.9 million of the iPhone the frame-rate work was measured on. The art
       has 2 px a game px, which a canvas past about 4.5 million px is finer
       than: pixels the chip pays for in every pass and nobody can see;
    2. **the passes** (shadows, metal shine, moving water) were each kept or
       cut by what they cost a phone's chip, never a laptop's built-in one
       that is also encoding a stream;
    3. Windows and a Mac draw every look the old way
       (`src/game/lookPaletteChoice.js`).
  - **Prepared without a computer** (v2.3.4400), all of which reach a
    computer too:
    - the steady step (A3): the same uneven movement was on every screen;
    - the townsfolk's bakes and the object pages' reads moved off the ride;
    - a look's bake keeps its canvas on the page's side
      (`playerSkins.js bakeReadCtx`, `?bakeread=0` the old way): on a real
      chip the bake read every pixel back FROM the chip. Windows and a Mac
      bake every look they meet, so this is their cost most of all. Not
      measurable on the test box (it draws every canvas in software);
    - the strip (`?perf=1`) names the machine (the chip, the canvas's
      pixels, looks `palette` or `baked` and why), counts late frames,
      splits the worst and names the job between frames, so ONE screenshot
      from any computer and browser says where its frames go;
    - the pacer (A3, `docs/specs/frame-pacer.md`): a laptop with a 120 or
      144 screen whose chip cannot keep up draws a steady 60 or 72, not an
      uneven mix. The strip's `screen` and `frames` lines say what it has,
      and its `outside` is split into the page busy and the page waiting
      (waiting is the chip: fewer pixels or fewer frames, not a code hunt).
  - **The biggest thing still open for a computer**: Windows and a Mac do
    not build the look palette (`lookPaletteChoice.js`), so every other
    player's look is baked on the page, per pose and direction, the first
    time it is met: the freeze A3 removed for the townsfolk, in any crowd
    (the expo). Two ways out, each needing one check on a real computer:
    a Mac probably can build the palette (an iPhone's Safari uses the same
    Metal path and builds it in under a second: try `?lookpalette=1&perf=1`
    there); on Windows the program must shrink (TRAPS §259) or the bake move
    to a worker.
    **A lead that needs no computer** (measured on the test box, v2.3.4400,
    `mp-townride`'s "as before" page): a bake's time is its sheet's frames. A
    stand is one frame of 256 px and bakes in 3 to 5 ms; a jog sheet is 23
    to 28 frames (`jog-east.png`: 28) and bakes in 45 to 147 ms, about 3 ms
    a frame, in ONE go on the page (`playerSkins.js buildBodySheet`). So the
    freeze is not the bake but that it is not split: baked a few frames a
    turn (a jog's drawings are steadied across the whole strip, so that pass
    stays whole: `recolorBodyToCanvas` `steadyArt`), no job would hold the
    page past a few ms on any machine, for any look, with no memory added.
    `window.__btMade` already times it, so `mp-townride`'s `?folkbake=0`
    page is the failing test.
  - **None of it can be measured on the test box**, which draws in software.
    So first a capture from a real computer: the Test panel's Speed test and
    a screenshot of its card, with the computer (Windows or Mac), the browser
    and the screen. The Speed test has no lower-resolution step for a screen
    at 2x or under (`speedTest.js` LOW_RES): add one, so the card can say
    whether the pixels are the cost. Then fix what the card shows; a pixel
    budget for big screens is the likely first fix and needs no capture to be
    safe for phones (they are under it).

- [ ] **A3. The skateboard on an iPhone: "gritty framerate ... riding through
  town".** PART DONE, v2.3.4400; still OPEN. The owner, on the fix below:
  "I think it looks a little smoother but it's still gritty looking."
  - **What is left to tell apart** (the phone's strip, `?perf=1`, now says
    each): (1) real late frames: the strip read "p95 17.0 max 38.0", one
    frame in each two seconds two refreshes late, and nothing on the test box
    shows where it goes (the game's own worst frame on a ride is 10 ms); the
    strip's new lines give the count in ten seconds and the worst one's
    split; (2) the ceiling: an iPhone 14 Pro Max's screen is 120 Hz and
    Safari gives a web page 60 (its feature flag "Prefer Page Rendering
    Updates near 60fps"), so 60 may itself be what reads as gritty beside the
    rest of the phone; (3) the stick is analog: a thumb short of the rim
    moves you at a speed that wavers with it (the strip's `stick` line).
  - **Proved steady with steady input** (`mp-steadystep`): your step, the
    camera's slide and your place on the screen, frame to frame.
  - **The late frames, found** (the owner's next capture: "late frames 10
    in 10s", "worst 170.0 = game 40.0 + outside 130.0", the stick at 1.00):
    art made on the page the first time it came on screen. Four townsfolk
    whose looks the shared colour numbers refuse were baked for each pose and
    direction when first met (80 to 250 ms a sheet), and every frame of an
    object page was read in one go as it came. Now baked behind the world's
    loading screen, and read a few ms at a time: `mp-townride` (5 bakes on
    the ride, the longest 258 ms, to none, the longest job 18 ms);
    `docs/specs/living-town.md`.
  - **"Way better with just a few occasional hiccups"** (the owner on that,
    the strip naming one: "between frames: body jog-east 101.0 ms"). The
    first cut baked the facings of each townsperson's own route. He leaves
    it: he turns to you, and after any wait he walks straight back across
    its corners, facing any way (the Blacksmith's route is all diagonals, so
    east and west were never baked). Now all eight facings, standing and
    walking: 34 sheets in 2.5 s behind the loading screen on the test box
    (23 in 1.8 s), and `mp-townride` sets each of the four down off his
    route in each direction: 7 bakes on the page with the first cut (the
    Blacksmith's walk east 91 ms), none now.
  - **"Still performance issues"** (the owner, 2026-11-10, twenty-four
    minutes into a session with Safari's 60 flag off: "fps ~51  frame avg
    19.6 p95 26.0 max 32.0", "work 6.8 ... outside 12.8", where the cool
    phone read "fps ~106"). Not a freeze this time: a 120 screen the phone
    could no longer keep up with, its frames on the glass for two, three and
    four refreshes mixed, so the steady step showed as an unsteady speed.
    Now a pacer (`src/game/framePacer.js`, `docs/specs/frame-pacer.md`;
    `?pace=0` the old way): on a screen over about 70 a second the game
    draws on a whole number of refreshes it can keep to (that phone: every
    third, a steady 40), tries faster after 20 s clean, and never touches a
    60 screen. `mp-steadypace` plays the hot phone to the real game: the
    speed on the glass 33% out for one frame in ten before, 3.3% now.
    Its first cut made the black-screen watchdog read an empty canvas on the
    refreshes it passed (a strike each; two rebuild the renderer): caught by
    that scenario before it reached a phone, and fixed (`whenDrawn`).
    Waits on the owner's eye (warm phone, with and without `?pace=0`).
  - **Not found**: that capture's one freeze ("worst 378.0 = game 16.0 +
    outside 362.0", no job named past 13 ms, another player newly on
    screen). `mp-peerarrive` (Chrome's profiler on a phone as a dressed
    player rides up, circles and swings) finds nothing a new player makes
    the watcher's page do outside its frame, apart from the black-screen
    watchdog's read of the canvas (it waits for the graphics side: 77 to 164
    ms on the test box with a second page open, now named "screen check" on
    the strip). The strip now splits "outside" into the page BUSY and the
    page WAITING (`src/debug/busyBeat.js`), which is what the next capture
    of a freeze like it will say.
  - **Why the phone slowed is not proved**: its own work went from 2.7 to
    6.8 ms a frame with fewer monsters loaded, which reads as heat.
  - **"It noticeably slowed when I rode by the blacksmith hammering"** (the
    owner, on the pacer's build). Not the hammer: the Blacksmith stands on
    the Flame Fields' side of the town, where the fire goblin's look starts
    to load as you come, and each of its 14 strips was unpacked on the page
    in one go as its file arrived (13 to 39 ms a strip on the test box, 180
    to 300 ms inside a second). In play a strip is now unpacked a few ms a
    frame, one at a time (`docs/specs/strip-gentle.md`; `?stripgentle=0`
    the old way); behind a loading screen, flat out as ever. `mp-stripgentle`
    rides up to him: 14 jobs of up to 31 ms before, none now (slices of at
    most 11 ms at a phone's 4 ms a frame), the look the same to the byte.
    This is also the likeliest answer to the unexplained 378 ms freeze above
    (a look loading: each strip's job is now named on the strip, "between
    frames: strip ..."). Waits on the owner's eye.
  - **"I thought fire goblin strips were converted into 256 color art like
    everything should be"** (the owner, told the above; then "make sure
    that's a system going forward"). They were, and held as numbers: the
    waste was the way in. v2.3.4470 reads a strip's own numbers from its
    file off the page's thread (`stripRead.js`, `stripPack.js`): the page's
    work for the fire goblin's look 198 ms before, 20 ms now, the picture the
    same. Eight snowman strips that were NOT 256-colour files are converted.
    `server/test/strip-door.test.mjs` holds it: every monster picture a
    256-colour file, one door, a closed list of callers of the page's
    packers (CLAUDE.md's memory law; TRAPS §317).
  - **Still to do, for A2**: another PLAYER with an eye style or a drawing
    is baked on the page when first met, the same freeze, in any crowd.
  - **The cause**: not the frame rate. The owner's captures (`?perf=1`,
    2026-11-09) read 60 frames a second with the game's work 3.4 to 4.1 ms
    of each, and the ride was as gritty at a lower resolution and with no
    buildings. The game moved you by each frame's own measured length, which
    wobbles a few ms round the screen's steady 16.7: a third too far on one
    frame, a third too little on the next.
  - **The fix**: the step is the mean of the last ten frames' lengths
    (`src/game/frameClock.js`; `?dtsmooth=0` is the old way).
    `docs/specs/steady-step.md`; `node tools/qa/mp/run.mjs steadystep` plays
    the phone's wobble to the real game: 36% out a frame before, 3.6% now.
  - **REFUTED on the way**: this page's first guess, that the graphics chip
    was the wait (13 new pieces of ground a second). A third of the pixels
    made no difference and the meter shows the chip keeping up.
  - The same uneven step is on computers too, so this is part of A2's "not
    smooth". A2 stays open for what a computer's graphics chip costs.

## Smooth on every device: item A4, the whole-game sweep (v2.3.4470)

The owner, 2026-11-10: "You do a sweep of everything because I keep catching
performance issues piecemeal and I want to make sure the optimizations are
everywhere in the game."

- [x] **A4. Everything that holds the page, found at once and budgeted.**
  `mp-heldsweep` plays a tour of the whole game with a profiler on the phone
  and ranks every job that holds the page's one thread; its lines are in
  `tools/qa/mp/held-budget.mjs` (12 ms a job outside the frame, 16 ms of the
  game's own code in one). The full list, the fixes and the debt are in
  `docs/specs/held-sweep.md`; the rule in TRAPS §318 and CLAUDE.md's laws.
  - **Fixed in this version**: the black-screen check's wait for the whole
    frame (206 ms, 18 times a tour); an object page's ground lines read on
    the page (29 ms, 64 times); the World map redrawn every frame you moved;
    a body under greaves baked for every look (597 ms on your own greaves,
    57 to 140 ms a sheet when an armoured player first swings); a colour
    variant of a monster recoloured pixel by pixel (23 ms a sheet); the band
    redrawn whole five times a second in one piece; the loading gate's
    search of the whole page ten times a second; the Mayor's arrow measuring
    the page after every frame.
  - **Still to do** (the debt list in `held-budget.mjs`, in rank order): the
    masked bake that runs on the page when a frame is wanted before the
    worker has it; gear sheets cropped and packed on the page; windows that
    draw a portrait as they open; the play column's size measured live;
    A2's "another player with an eye style or a drawing"; and Windows and
    Mac, where looks are still baked per look.
