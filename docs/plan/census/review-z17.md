# The gatekeeper's review, sitting 17 (card Z; tag 5374)

Taken 2026-11-14 on `main` at 59469b2 (tree d7c5418a: sitting 16's list
and the short sitting 16b, #1837, #1836 and #1857, merged). Tags in this
file are written bare. Each PR that changes `server/` or `src/` had a
finder read the code around its diff (the angles of `/repo-review` that
apply), re-try its break proofs and try to disprove what it found; the
mends made during the sitting were read again (O's by the gatekeeper,
P's #1846 by a finder). Documents, tools and tests got step 3.

VERIFIED: the story runs, on the code path named (a finder's node probe
in a throwaway copy, or a reading end to end). PLAUSIBLE: the code does
it, what sets it off is unproven. The probes are not in the repository.

## How this sitting ran

Every card with two or more PRs had them colliding with each other (each
merged clean on `main` alone, the second not after the first: a status
file each, P's census and memory lines, O's lanes page). At the
gatekeeper's word through the planning session, each card stacked its
own, in order, each later PR merging the one before's final head (all
carrying 59469b2): one merge base each, step by step (card Z's 5b).
Within one card only; no chain crosses cards. Four mends landed during
the sitting at the planning session's word: O's #1850 (aff24ee), R's
#1862 (60c0cab, words), R's #1847 (f72a19a, held all the same), P's
#1846 (842b395, sitting 16's two).

## Decided for the owner while away

Each with its switch, for the planning session to read to the owner:

- **#1850** (card O) the passes as rungs of the ladder, ON: on a phone the
  graphics chip holds back and still late at 30, the shine, then the
  shadows, then still water go, a step at a time, and come back
  last-taken first. **(A) revised**: a saved rung keeps the rate only, so
  a cool phone is back at 60 in one try. A phone late from its own work
  never takes them (sitting 17's mend, below). Switch `?ladderpass=0`.
- **#1862** (card R, the planning session's decision) the save and the
  equip no longer cut a weapon bag over its cap; a give past it is
  refused (every caller already handled that); the join still cuts it,
  as always, so no new loss. A trade window's held weapon (`trade2wpn:`)
  counted among the places that hold value. No switch: one could only
  bring back a cut that destroys weapons (said in its words).
- **#1854** (card O) the strip slice is the lanes' `queue` knob (4 ms,
  `thirty` 8), never a quarter of the frame: a phone paced to 30 packs
  strips at 4 ms a frame, not 8.3 (a monster's look about 67 ms later on
  the worker's road, 1 to 2 s on the page's). No switch of its own
  (`?stripslice` keeps its lever).
- Not under the heading, the nearest: L's #1851 and #1855 say nothing a
  player sees changes (`harvestdoor`, `dungeondoor`, ON; `false` turns
  each off); K's #1861 changes no behaviour (no switch); P's #1846 is a
  memory saver ON by default (the memory law), `?slimewalk=0`; P's #1859
  removes five icons nothing draws, by the owner's own word tonight
  ("Just go recommended", relayed); J2's three are tests and a listed
  hold.
- Held, not landing: O's nothing; R's #1847 (`roomexport`, ON by the
  owner's yes, mended at f72a19a, to be read at sitting 18); K's #1848
  (`sprintmark`, OFF by the owner's choice; its ON path's two mends not
  done); T's #1863 (no switch: the order, below); P's #1853
  (`?elemicons`).
- For the owner, costs (never decided this way): none on this list adds
  a write, a message or a pace. #1862 changes no write (a bag over its
  cap is saved whole: one record, paced as before).

## Card R: #1862 (PR 2, tag 5281): reviewed, mended, listed

**The stashes' door (`stash.js`, `STASH_ROADS`, 35 rows), read at ad99f51,
the words mended at 60c0cab (comments and documents only: the code of
the six server files it touched is the same, stripped of comments).**

- **Medium, VERIFIED (mended in words):** "a bag over its cap keeps every
  weapon" held only until the next join: join.js ~1096
  `_sanitizeWeaponList` still cuts the stored bag (a node probe:
  `disable_bigbags`, cap 8, 12 weapons: the save stores 12, the phone is
  sent 8, after a rejoin 8), and the gear lists are still cut at the save
  (persistence.js ~383 `capStash`) and the join (gearstash.js ~560). No
  new loss against `main`. Mended as the planning session chose: the
  words (stash.js, handoff rules 3 and 29b, CLAUDE.md §5, the spec, the
  body) say where the cuts remain. Removing them is a later behaviour
  choice on the planning session's list.
- Every replaced write is the same write: the same array, the same object
  (no copies), the same index and order, no new await (the trade window,
  market, auction house, salvage, sell, equip, forge, quests, reveal,
  loot, mail, No man's land, gearprov, grids, shield, join and migration).
  Every give the door may now refuse had the same full-bag test on `main`
  with the same answer (a quest reward kept aside, "weapon bag full", the
  mail kept, the market's back to the mail, an unequip refused and the
  bag resent, the forge checked before its cost, a loot blade sold); the
  one new refusal (a shield off into a full list) ends as `main`'s save
  cut did, the ledger keeping the shield.
- Lows: the guard misses `Object.assign(ps, {weaponStash: []})`,
  destructuring, `delete`, `?.push`, `Reflect.set`, a list a helper
  returns (none in `server/src` today); `stashSet(..., undefined)`
  replaces the whole list (both callers check the index first); the
  world's sum counts no weapons yet (PR 3's, the PR says so). Nits:
  gear.js's forge swap ignores `stashGive`'s answer after its own cap
  test; player-roads §8 reads the source with its comments.
- Break proofs (3) fail as claimed. Suites: stash-door 23, player-roads
  20, world-sum 37, persistence, armour-stash-live; the full `npm test`
  425 of 426 once (`power` red under the box's load, 64/0 alone, not in
  the diff).

## Card L: #1851 (PR 5's fifth, tag 5214) and #1855 (the sixth, tag 5215): reviewed, listed

**The harvest door (`_harvestTo`, `harvestdoor`) and the dungeon door
(`runPhase`, `_dungeonTo`, `dungeondoor`): lows and nits only.** Read at
#1855's head with 59469b2 merged (the code, tests and guard byte for byte
the heads listed).

- Low, VERIFIED: dungeon.js ~623 and ~941 ignore `_dungeonTo`'s answer, so
  its rules hold the field, not the effect: `_dungeonSpawnBoss` twice
  gives two bosses, `_dungeonComplete` twice pays the clear twice (a probe,
  gold 50 -> 58 -> 66). Nothing calls either twice (the tick reads
  `bossSpawned` and `state`), so the switch's words ("`dungeondoor: false`
  lets a second boss come") overstate it: ON or OFF, the same. The duel
  and trade doors' callers are the same shape.
- Low, VERIFIED: the spec's "a run born anywhere but `_handleDungeonStart`
  fails" is false (a `this._dungeons.set(...)` in wheeldungeon.js passes
  both). Low: `inst.bossSpawned ||= true` elsewhere passes both (the
  suite's pattern has no `||=`, `&&=`, `??=`).
- Nits: the `keyed` reading misses an alias (`const m = this.extractions;
  m[id] = ...`), optional chaining, `Reflect`/`defineProperty`,
  destructuring targets and a record field (`.startedAt = undefined`);
  `fn: 'constructor'` accepts a closure made in the constructor. (L's
  next PR, #1864, says it closes the destructuring, template and
  reflective ones.) A run alive across a deploy cannot exist (runs are
  memory, wiped by a deploy).
- Break proofs 19 to 24 and `bossSpawned` put back: all fail as claimed.
  Suites: harvest-door 32, dungeon-door 29, party-door 28; the phase guard
  (13 doors, `todo` 24); the full `npm test` 426 green on the merged tree.

## Card K: #1861 (PR 7.1, tag 5187): reviewed, listed

**57 of 58 combat and moving sends through `act()`; the census 203 -> 146.
Each leaves the page as before (VERIFIED: a probe over the diff matched
57 of 57, the same envelope each).** `act()` drops, queues, limits and
renames nothing; its transport is `channelShim.send`, the same socket
(QA's wrappers on `S.channel.send` still see each). Differences, each
named by the PR: a `reqId` on `player_attack` (3), `shield_gem` and
`amulet_forge_request` (no handler reads it; the wire door passes it);
`build_point_earned` gains `payload: {}`; `pose` sends its keys in
another order; `openRiseChest` shows no chest note with no channel. The
58th (desktopControls.js ~263, the ride) stays.

- Low, VERIFIED: nothing now checks the `pose` row's `body: 'top'`
  (actions.js): action-door §2b saw it only through interactions.js's raw
  send, now `act()`; state-resets §5 hard-codes `['pose']`. With the flag
  dropped, every check is green, and a sit or a dance would go inside
  `payload`, which poses.js reads as standing up. For K's next family
  PR: play the real `act()` with a recording transport, or pin the top
  rows by name.
- Nits: §6 (each row's way and `settled`) removed as the card planned;
  the precheck town gate carries the old blanket exemption (a planted
  send with no row still fails); "11 false warnings" are 12 by main's
  blocks; checks that a send did not happen will not see `act()` in
  family 2 (achievements-client 6a, 6g).
- The seven suite edits adapt, not loosen (each break tried). Suites: the
  full `npm test` 424 green; every guard; eslint on the 15 files.

## Card O: #1850 (PR 9, tag 5229) and #1854 (PR 10, tag 5230): reviewed, mended, listed

**#1850: one MEDIUM, VERIFIED, mended at aff24ee during the sitting (read
again by the gatekeeper, its break proof tried).**

- **Medium (mended):** a WORK-bound phone took the passes. The verdict's
  order `['work', 'chip']` took a phone late from its own work (model:
  work 22 ms, chip 3) on to the chip axis once the rate was taken:
  shine, shadows and still water, which save it no work; back at 60
  about 66 s later (four tries up). The PR's words said it never would,
  and the head bfb97b9 had loosened `main`'s frame-pacer 22c (sitting
  15's) to `>= 1`. **The mend:** the work axis alone for a work-bound
  phone (`['work']`; the rate sits on both axes); 22c back to `=== 1`;
  21c fails a work-bound phone that takes a pass. Break proof: the old
  order put back fails 21c and 22c. frame-pacer 127, ladder-passes 19,
  strip-slices 24, crowd-cap 28 green at 51ad7a8.
- Low (mended with it): the passes had no `seeKnob` (main's 5226): with
  `?lightfx=0` or `?sheen=0` kept, no sea in view or WebGL 1, a pass rung
  drew nothing yet cost two late verdicts and a 20 s try. Now each says
  what the screen sees (lightFx.js, wheelWater.js).
- Low: the Speed test holds the ladder still but does not put it back to
  the row, so on a phone the ladder has taken passes the "Everything on"
  row has them off already (the rate's rung is the same class).
- No change every frame (TRAPS §218); nothing made a rung, nothing freed
  and rebuilt; the kept rung's key grows, so every kept rung is dropped
  once at the deploy, as designed. Break proofs (4) fail as claimed.

**#1854 (stacked on #1850 at 51ad7a8, adding only its own change): a low
and a nit.** Low (its words say it): a phone paced to 30 gets 4 ms a
frame for strips, not 8.3 (above). Nit: `KNOBS.queue`'s steps `[4, 8]`
grow, against the table's "each further step a step down" (harmless:
`queue` is on no axis). Its break proof (the quarter of the frame) fails
4e and 5a.

## Card P: #1846 (tag 5256): re-read, listed; #1859 (tag 5259); #1853 (tag 5258): held

**#1846, the slimes walk (`?slimewalk=0`), re-read at 842b395: sitting
16's two MEDIUMs are mended on every path walked; lows and nits only.**

- The stat window's demo reads `getSlimeFrame('hit', 0) ||
  getSlimeHitStill()` (effectsRenderer.js ~18322, ~18394): a 128 px still
  of the hit (64 KB), loaded behind the first loading screen
  (`loadHitStill` in the `slime` group) and never freed, so the arrow
  sticks and the gunk chips fly with no slime ever near, and after the
  strips were let go. With `?slimewalk=0` the strips stay as before.
- The farm's Workshop: `dungeon_started` goes through
  `enterArenaWithLooks` (new `src/game/dungeonArt.js`): the run's
  archetypes wear the slime, so its strips load behind the zone's screen
  (8 s cap), a party member pulled in the same way; a rejoin mid-run
  keeps them; a check once a second frees them on leaving.
- Low, VERIFIED (a probe through picsOnce.js's real sweep): the still is an
  ImageBitmap labelled with the hit strip's file, so while it is off the
  chip each sweep (about a second) loads the whole 3072 x 128 strip as an
  `<img>` to swap it, never matches its size, and tries again. The cure,
  one line: `keepPageCopy` on it (picsOnce.js ~71). For P's next PR.
- Low, PLAUSIBLE: the only file picture kept as an ImageBitmap, against
  pixiRenderer.js ~85 (an iPhone's purge empties one): after a black-screen
  rebuild the still could stay empty (sitting 16's symptom in the stat
  window). Settled by a purge on the owner's iPhone, or a `keepAsImage`.
- Low, PLAUSIBLE: a second Workshop run started within about a second of
  leaving the first can have its strips freed by the first's check (a
  new `dungeon:<uuid>` zone with no spawns reads as wearing no slime):
  plain circles for that run.
- Nits: a Workshop run left by a death keeps the strips in BroTown until a
  slime comes and goes (cheap: colour numbers); wheelMonsterArt.js ~33's
  comment on the mire wisp.
- The memory line `artCache` 95.1 -> 90.6 stays right with the still kept
  (27.5 measured; 4.44 MB saved). Break proofs (the finder's): the still's
  load out of `loadSetLater` fails picture-door 3 and 3d; the strips
  through `Assets.load` fail strip-door 4h. Suites: picture-door 33,
  strip-door 36, monster-palettes 15, held-numbers, dungeon-art,
  zone-entry, zone-leftovers, renderer-life, loader-retries, slime-shove,
  slime-boss; guards pixel-readers, state-ledger, switches, four-lines.

**#1859, the rank trophies removed (step 3), stacked on #1846 at
051eea7.** The owner's own word tonight ("Just go recommended", relayed),
so not a decision made while away; git keeps the files and the owner's
sheet and cutter stay. Nothing in `src/`, `server/src/`, `public/tools/`
or `CREDITS.md` names them; `BoardRow.jsx` draws the medals of
`public/ui/leaderboard/`. Nit: families.mjs's comment "the files stay
(removing art is the owner's call)" now sits above the next row.
`docs/specs/leaderboards.md` ~151 still names the files (card LB's).

**#1853 (the element marks): held (below).**

## Card J2: #1849 (PR 9, tag 5429), #1858 (PR 12, tag 5432), #1860 (PR 10, tag 5430): listed

Step 3 (a budget's row, a test, a test). Stacked at the gatekeeper's word.

- **#1849**: `other: R > J` back on the held list at 16 ms, `ours`, with
  its why and next (the door prompt measured inside React's commit), its
  row in held-sweep.md; held-sweep 57 green. It makes step 3.1 ("done
  when no row is ours") one row further from done, honestly.
- **#1858**: monsterstatus.test's gust step on one pinned clock; its break
  proof (the clock not pinned, 20 ms between the stamp and the move)
  moves 35 and fails, as it says; three runs green. Deploys
  (`server/test/`).
- **#1860**: `mp-alliance` checks its typed fields survived a resync
  before it taps, and taps once more when a tap sent nothing and nothing
  was refused (16 of 16, three runs, its words). The page's emptying of
  the Saloon's forms at a resync is a real fault, minor, under J2's Found.

## Held (expires at sitting 18)

- **#1847 R** (the paged export): one MEDIUM, VERIFIED: a device id came
  out inside an allowed kind: `inbox:` keeps a login-wheel pot's opId
  `loginspin:d:<device>:<day>` (loginspin.js ~88-136, inbox.js ~579) while
  the spinner is offline, by `?prefix=inbox:` and `?player=`. Mended at
  f72a19a (the export's copy masked, the stored opId untouched;
  room-export §6b), after the list was set: to be read at sitting 18.
  Otherwise the allow list is clean (59 hostile asks, 0 leaks; every
  allowed kind read; a new mark kept out by default). Lows: a new
  value-holding `between` or `room` mark is left off the list silently
  (fails safe); sitting 16's two lows stand (a character's page reads
  about 29 keys whatever its limit; no byte cap).
- **#1863 T** (the page's one switch reader): the order and one MEDIUM.
  From it on, a PR adding a page switch row must regenerate
  switches.js's block (check 13): this list adds three (`?ladderpass`,
  `?slimewalk`, and `?elemicons` held), so it leads sitting 18, at the
  head of `main`. Medium, VERIFIED, nothing a player sees today: its words
  say "a page's address never changes", but BroTown.jsx ~2429, ~12171,
  ~12519 drop `create`, `login`, `noresume` by `history.replaceState`,
  and the reader keeps one copy of the address from its first call,
  where the seven moved reads read it live. None of the seven is
  rewritten; `create`, `login`, `noresume` are in its forms for PR 7, and
  three phone tests and four node suites change the address mid-page.
  Lows: guide-arrow.test ~85 and desk-teach.test ~61 look for text now
  only in a comment; the four pattern reads differ on odd addresses (the
  name twice, `%30`, a `?` in a value); the guard's addresses never throw
  a needed switch. The card's 13 addresses: all seven equal.
- **#1848 K** (`sprintmark`, OFF): the owner's OFF stands; its ON path's
  two MEDIUMs (sitting 16) are not mended. Not reviewed again.
- **#1853 P** (the element marks): clean (lows below), but its head
  80cdace never took `main` 59469b2 (seven files conflict, its switch
  row's `on` among them). Lows: the pixel readers' guard reads only a
  file's own text, so the marks' paths (from elemHits.js) are invisible
  to it (its `NAMES_PACKED` line is a comment the guard does not hold);
  `buffers` at home 23.6 to 23.8 against 24.2, measured alone. Nit:
  `src/state/art.js` gains an unrelated ledger row. Its twins are exact
  (8 of 8, 0 pixels), `reduce256` reproduces them, a failed twin falls
  back to the picture, `?elemicons=0` is the old road. When it lands
  after #1846 the `artCache` line is 88.6 (both savings), never 93.1.

## Not reviewed: opened during the sitting

L's #1864 (5216, the pose door, `posedoor`; it carries #1855 and #1851,
head 7171908): the next sitting.

## Stalled

None: P's status says `working`, on branches pushed within the hour.

## The switch rows' days

Each listed row carries its `on` (card T's 7.2). `harvestdoor`,
`dungeondoor` and `?ladderpass` say 2026-11-15, `?slimewalk` 2026-11-14:
the day this list merges is the true one; a day off is one day of 28 in
`--due`'s count. The next sitting sets each to its merge day if it
differs (a change of a head now would undo this rehearsal).

## Found (no card's, or another card's)

- K's #1861's reviewer: the `pose` row's `body: 'top'` is held by nothing
  now (above); the same gap reaches dice, map_watch, nml_attack,
  item_drop and report in K's later families.
- R's #1862's: `power.test` red once in a full run under load (64/0
  alone): the box's, a sample.
- K reports `jump` x2, `shieldgem`, `deathzones` 12 and `sprint` (the
  button sideways) red on plain `main` 65c3322 too: card J2's (8.1).
- O's: the Speed test does not put the ladder back to its row before it
  measures (the rate and now the passes).

## The lines

On `main` 59469b2 the phase table's `todo` is 27 at its line 28: this PR
lowers `TODO_LINE` 28 -> 27, the count since L's #1839 (break proof: 26
fails check 7). L's #1851 and #1855 bring it to 24 on the list's tip; the
next sitting may lower it again. The four lines' guard on `main` printed
room sitting 16's merges earned: card SK's #1782 (the ride's per-frame
rules moved into src/game/ride.js) took BroTown.jsx to 8370 code lines
(its line 8371), its `BroTown` to 7800 (7801), its anonymous to 2132
(2133) and its `gameLoop` to 1583 (1584); with O's #1836, entityRenderer.js
to 8953 (8955). This PR lowers all five (break proof: `BroTown` 7799 fails
check 2; the guard's header says so). On the whole list's tip the guard is
green with these lines, and prints room in monsterCombat.js (1785, its
line 1792; `updateMonsterCombat` 1724, 1732), K's #1861's: for the next
sitting, once it has landed. No memory line moves but #1846's own
(`artCache` 95.1 -> 90.6, measured, in its PR).

## The list

1 #1862 (R) · 2 #1851 (L) · 3 #1855 (L) · 4 #1861 (K) · 5 #1850 (O) ·
6 #1854 (O) · 7 #1846 (P) · 8 #1859 (P) · 9 #1849 (J2) · 10 #1858 (J2) ·
11 #1860 (J2) · 12 this PR; each "Create a merge commit", in one sitting.
Eight deploy the worker (#1862, #1851, #1855 by `server/src/`; #1861,
#1850, #1854, #1846, #1858 by `server/test/`): back to back. Two add a
live flag (`harvestdoor`, `dungeondoor`, ON), L's, stacked, so they meet
on no line; two add a page switch (`?ladderpass`, `?slimewalk`). No stored
record changes its shape. The server's first, then the page's, then the
tests, then this PR. Stacked within a card (each later PR carries the one
before it): #1855 on #1851, #1854 on #1850, #1859 on #1846, #1858 on
#1849, #1860 on #1858.

## The whole

Rehearsed with `tools/dev/gatekeeper.mjs` from `main` 59469b2:

1. K's #1861, O's #1850 and #1854 (before O's mend), J2's three (tree
   349b1652): precheck 0 FAIL. (A first pass, before every head was in.)
2. **The list in its order**, eleven PRs at the heads above (tree
   d7a02deb): precheck 0 FAIL (2 WARN), build, questline 187 of 187
   (494 s); ONE merge base each, step by step (counted by hand too, the
   same tree).
3. **The list with this branch last** (documents and the guards' lines):
   one merge base, a clean merge; the phase and four lines' guards green
   on the whole. Its precheck and its tree are in the list sent to the
   planning session (the file cannot carry its own tree).

Each listed head's base is `main`; their `test` checks are in the list
sent to the planning session.
