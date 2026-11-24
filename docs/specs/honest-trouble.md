# What an honest player's trouble looks like (GRAND-PLAN 10.6; tag 6120)

Card LG, PR 1. Tools and docs only: nothing here changes the game.

Every signal a detector reads today, with its source line, and what changes
it **with no cheating at all**. Then, a signal at a time, what a detector
must do so that trouble does not read as a bot. Line numbers are `main` at
`8dc5bf6` (2026-11-18); the detectors are card K4's, and this page only reads
them.

## The five kinds of honest trouble

| Trouble | What really happens on the phone and the line |
|---|---|
| **Frame rate** | 60 fps on a good phone; **30** on every iPhone in Low Power mode (Safari caps the frame at 30, so every such phone shares ONE rhythm: events land on 33.3 ms steps); 20 on a busy older phone; **4** on a phone that is struggling. Below 20 fps the page's step is clamped (`BroTown.jsx:4963`, `_dtScale`), so the player walks slower, not further a frame. Anything the page does on a frame (a swing, a shot, a gesture's end) lands on that frame's step. |
| **The line's delay and jitter** | A round trip of 30-300 ms, and on a phone line it wavers: a message can wait 200 ms and the next go through in 40, so two sent 600 ms apart can arrive 400 ms or 800 ms apart, or together. The worker's round trip, `session.rtt`, is a smoothed average (`index.js:5050`, a 0.3 blend), starts at 80 ms (`index.js:4710`) and is capped at 300 ms (`index.js:905`). |
| **A deploy** | The room restarts. Every player's socket closes in the same second and every phone joins again within a few seconds of the others. Everything the room kept in memory is gone (rings, windows, allowances, the round trip back to 80); what was written stays. A harvest or a swing in flight arrives with no record of its start. |
| **A hidden tab** | The player switches app or locks the phone. A desktop browser slows its timers to about once a second; iPhone Safari stops the page (and often the socket) entirely. When the tab comes back, what the page held goes in a **burst**: a queued move, a held claim, a strike. A phone that lost its socket joins again (the same as a deploy, for that one player). |
| **A slow phone** | The whole page runs slower (`BT_QA_CPU_THROTTLE=4` in the phone tests plays a phone four times slower: `tools/qa/mp/harness.mjs:508`). Frames drop to 4-20 fps, timers fire late and bunch up, and a message can leave in a clump with the next. |

**Two of these read as a fleet** unless the detector knows them (the plan's
own words, 10.6): every Low Power iPhone has the same 33.3 ms rhythm, and
every deploy starts every session in the same second.

## The rules every detector keeps (from the tables below)

1. **Never cluster players by when they joined.** A deploy reconnects all of
   them in one second; a hidden tab's return and a line's drop do the same for
   one. A join time, a reconnect time or a "first message after the join"
   time is never evidence, alone or across players.
2. **Never cluster players by a frame rhythm.** A 33.3 ms (or 16.7 ms) step
   in the gaps between a player's events is the screen, not a script. Across
   players it is every Low Power iPhone at once.
3. **Measure a gap from the worker's own events, and let trouble only make it
   longer.** The line, the frame, the hidden tab and the slow phone all ADD
   time to an honest gap. A detector that takes time OFF (an average round
   trip) can make a slow person read fast: take off the smallest recent round
   trip, never the average.
4. **A burst after a quiet spell is a backlog.** A hidden tab, a stall or a
   bunched line delivers several things at once. A rate is judged with an
   allowance (a bucket), never by the gap between two arrivals.
5. **What a deploy forgets, it forgets for everyone.** A count kept in memory
   starts again; a count written down must not grow because of a deploy (one
   recovery a deploy is the deploy's, not the player's).
6. **A count that never fades is a count of bad luck.** Evidence that only
   adds up (no half-life, no window) will reach any line on a long enough
   honest life. Every count fades or lives in a window.
7. **Fewer points is not straighter.** A slow phone, a hidden tab or the move
   diet sends fewer places; a check on a shape needs enough points to say
   anything, or it says nothing.

---

## A. The server's own signals (`server/src/botsig.js`; flag only)

The score adds each reason's weight; a player is flagged at 6
(`botsig.js:207-224`, `judgeSig`). A test-mode character is never measured.

### A1. `aimed`: the walk into a harvest

**Read:** each move's place, kept in a ring of 12 in memory
(`botsig.js:274`, `_sigOnMove`); at a harvest's start (or a startless strike)
the last 40 px of it, judged straight to 0.75 px and through the node's
centre to 1.5 px (`botsig.js:182`, `judgeApproach`; `botsig.js:350`,
`_sigApproach`). The keyboard's 8 headings are not judged.

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | Below 20 fps the walk slows, so MORE places on 40 px (more chance of a wobble): safe. At 30 fps the places are a frame apart: no effect. | yes |
| Delay, jitter | The ring holds the WORKER's places (after its budget), in order: jitter changes when, not where. | yes |
| Deploy | The ring is memory: it starts empty, so the first harvest after is not judged. | yes |
| Hidden tab | The page sends no moves while hidden; the next walk starts a new ring. A burst of held moves is one or two places: see the next row. | mostly |
| Slow phone; the move diet | Fewer places a walk (the `movepath` diet sends a steady walk every ~200 ms: ~30 px a move). With two places on the 40 px chord there is **no point in between to test**, so `straight` is true by default (`botsig.js:193-197`); only the centre test and the keyboard's headings are left. | **margin** |

**The detector must:** judge a run only with at least 4 places inside its
40 px (else not judged, like a keyboard heading); and never read the move's
cadence (it already does not).

### A2. `reflex`: a monster's wind-up to the answer

**Read:** a wind-up's time (`telegraph.js:516`, `:643` call
`botsig.js:312`, `_sigOnWindup`), then the first move away, dodge or shield
raise (`botsig.js:274`, `:303`); the gap less the smoothed round trip
(`botsig.js:333`: `now - w.at - session.rtt`). Quick is under 120 ms; 60% of
20+ answers flags (weight 6, alone).

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | The answer waits for the next frame: up to 33 ms at 30 fps, 250 ms at 4. Only adds. | yes |
| Delay, jitter | The wind-up goes down the line and the answer comes up: one round trip, which the check takes off. But it takes off the **average** (`index.js:5050`), so a quick trip after slow ones (jitter) makes an honest 230 ms answer read as 80 ms. On a line that wavers ±150 ms about half of the answers are understated. | **margin** |
| Deploy | The round trip goes back to 80 ms (`index.js:4710`) for every player at once; the wind-ups in memory are lost (no answer measured). On a slow line, the first minute after a deploy takes off too LITTLE: safe. | yes |
| Hidden tab | No answer while hidden; one held move on return is long past the 1.5 s window (not measured). | yes |
| Slow phone | Frames and timers late: only adds. | yes |

**The detector must:** take off the smallest round trip of the last few
samples (the line's floor), never the average, so jitter only ever adds to
the reaction; and never compare players' reactions to each other (a Low
Power phone's answers all fall on 33 ms steps).

### A3. `rooted`: hits from one spot

**Read:** each hit claim's place, from the worker's own copy, in 2 px cells
(`botsig.js:433`, `_sigOnHit`); 600 hits in a row on 3+ monsters flags
(weight 6).

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | Changes nothing about where the player stands. | yes |
| Delay, jitter | A claim reads the worker's place when it ARRIVES: a player who moved in the meantime is in a new cell. Only breaks a run. | yes |
| Deploy | The run in memory (`r.run`) is reset with the room... except it is not memory: it is `sig.root`, and only `max` and `maxMons` are written. A run starts again: safe. | yes |
| Hidden tab | No hits while hidden. | yes |
| Slow phone | A player on a slow phone moves less between targets (the walk is slower), so runs from one spot are longer. An archer who stands still and shoots a pack is honest: 600 hits at 2 a second is five minutes. | **margin** |

**The detector must:** count a run in time as well as hits (a person plants
their feet for a fight, not for an hour), and never read a slow phone's
shorter walks as standing still.

### A4. `cook`: the beat between cooks

**Read:** the gap between cooks (`botsig.js:418`, `_sigOnCook`), in a log
histogram with 9% bins; the 10th to 90th percentile within 1 bin over 60+
cooks flags (weight 6). Gaps over 60 s are walks, not the beat.

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | The minigame's end lands on a frame: a 33 ms or 250 ms step. A cook is several seconds and a bin is 9% of it (~300 ms at 3.5 s): at 4 fps the gaps fall on whole quarter-seconds, which can pile into fewer bins. | **margin at 4 fps** |
| Delay, jitter | Adds spread, never removes it. | yes |
| Deploy | `cookAt` is written with the record: the first gap after a deploy is the deploy's, often over 60 s (dropped). | yes |
| Hidden tab | The gap is over 60 s: dropped. | yes |
| Slow phone | Slower gaps, still spread by the person. | yes |

**The detector must:** never use a bin narrower than the frame step it can
see (a 4 fps phone: 250 ms), and never compare the rhythm of two players.

### A5. `gesture`: a harvest's start to its strike

**Read:** the worker's start (`ex.startedAt`) to the strike, less the hits it
planned (`botsig.js:395`, `_sigOnStrike`; `botsig.js:408`); only a drawn
gesture (a strike with a fingerprint). 10th to 90th percentile within 1 bin
over 60+ flags (weight 3: never alone).

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | The gesture ends on a frame; 1.2-2.5 s of a person's own drawing is wider than any frame step. A computer's E held (exactly 1.5 s) sends no fingerprint and is never timed. | yes |
| Delay, jitter | Both legs add: the plan leaves the worker when the start arrives, the strike leaves after the gesture. Only adds spread. | yes |
| Deploy | The start record is memory: a strike after a deploy has none and is not timed. | yes |
| Hidden tab | The gesture stops; its time is long (adds). | yes |
| Slow phone | Adds. | yes |

**The detector must:** keep timing only the drawn gesture (the keyboard's
fixed hold is the client's, not a script's).

### A6. `marathon`: activity with no break

**Read:** each measured action keeps a streak; five quiet minutes start a new
one (`botsig.js:247`, `_sigActive`); four hours without a break is a reason
(`botsig.js:214`; weight 2, never alone).

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate, delay | Nothing. | yes |
| Deploy | The streak is written with the record, so a deploy is not a break. Right: a deploy is not the player resting. | yes |
| Hidden tab | A hidden tab of five minutes is a break: safe. | yes |
| Slow phone | Nothing. | yes |

**The detector must:** never treat the deploy's reconnect as the start of a
sitting (10.2's sitting card closes a sitting cut by a deploy at the next
join, as the plan says).

### A7. `loop`: the same route of four nodes

**Read:** the last four nodes harvested, hashed, against the last 64 routes
(`botsig.js:350`, `:379`); 60% of 100+ repeated, inside a marathon (weight 4).

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate, delay, slow phone | Nothing: it reads which node, not when. | yes |
| Deploy | The route in hand is the session's (memory): it starts again. | yes |
| Hidden tab | Nothing. | yes |

**The detector must:** keep reading the route, never its timing.

### A8. `cloud`: the network the socket comes from

**Read:** `request.cf.asn` at the socket's opening (`botsig.js:260`,
`_sigOnJoin`), against a list of cloud networks (`botsig.js:219`; weight 2,
never alone).

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate, delay, slow phone, hidden tab | Nothing. | yes |
| Deploy | Every player's network is read again in the same second. The same answer: safe. | yes |
| A VPN, Private Relay | Real players leave from Cloudflare's, Akamai's or Fastly's edges; those are left off the list on purpose. | yes |

**The detector must:** never count how many players joined from one network
in one second (a deploy, a school's Wi-Fi).

---

## B. The gesture's fingerprint and the harvest's record (`server/src/botfp.js`; flag only)

A score with a 30-minute half-life; flagged at 10 (`suspicion-threshold`),
or by its own kind below. One flag an hour.

### B1. The synthetic floors: `ent`, `tv`, `vc`

**Read:** the phone's own numbers for each gesture (`swipeFp`); two floors
tripped at once is a synthetic strike, +2 (`botfp.js:425`).

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | Safari hands the page one pointer event a frame and rounds its clock to 1 ms, so a **30 fps Low Power iPhone** sends fewer, more even samples: `tv` (timing variance) can read 0-1, an honest trip of the `tv` floor. One floor alone never counts (two are needed). At 4 fps a gesture has a handful of samples: `vc` (the speed's curve) is coarser. | **margin at 4 fps** |
| Delay, jitter, deploy, hidden tab | Nothing: the numbers are the phone's, made before the line. | yes |
| Slow phone | As a low frame rate. | margin |

**The detector must:** keep needing two floors, and treat `tv` as the
screen's (a Low Power iPhone trips it every time); never set a floor from
what a 60 fps phone sends.

### B2. The replay ring: the same path twice

**Read:** the path's 8 px hash, against the last 64 (`botfp.js:432`; and a
cook's, `botfp.js:580`), +3 each.

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | At 4 fps a short gesture is a few samples on an 8 px grid: two honest gestures can hash the same. | **margin at 4 fps** |
| Delay, deploy, hidden tab | Nothing (the ring's tail is written with the record). | yes |
| Slow phone | As a low frame rate. | margin |

**The detector must:** not count a hash of fewer than a set number of points
(`n` in the fingerprint) as a replay.

### B3. `variance-collapse`

**Read:** the variance of `ent` and `vc` over the last 48+ gestures
(`botfp.js:485`), +5 and a flag.

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | Fewer samples a gesture at 4-20 fps; the three gestures still differ in their mean by more than the floor. | yes |
| Delay, deploy, hidden tab, slow phone | Nothing. | yes |

**The detector must:** keep the floor below what one low-frame-rate person
makes across a session.

### B4. The gap between strikes

**Read:** strike to strike, under 45 s (`botfp.js:380`); its spread (CV)
under 5% over 20 adds +2 (`botfp.js:502`), never a flag alone.

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | A frame step (33 ms) is 1% of a 3 s gap. | yes |
| Delay, jitter | Adds spread. | yes |
| Deploy | The last strike's time is memory: the first gap after is not counted. | yes |
| Hidden tab | A gap over 45 s is dropped; a burst of two held strikes is one short gap. | yes |
| Slow phone | Adds spread. | yes |

**The detector must:** never compare one player's gaps with another's.

### B5. `device-fleet`: many accounts on one device

**Read:** the phone's device nonce at the join; four accounts on one, three
of them striking 30+ an hour (`botfp.js:508`).

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate, delay, slow phone | Nothing. | yes |
| Deploy | The device's list is written; every account on it joins again in one second. The count is accounts, not joins: safe. | yes |
| Hidden tab | Two tabs share one `bp_` id (one account). | yes |
| A shared family tablet | Real: four people on one iPad. Only striking hard in one hour reads. | margin (rare) |

**The detector must:** never count a device's JOINS (a deploy rejoins every
one), only its accounts' actions.

### B6. `strikes-without-start`

**Read:** a harvest's strike refused because the worker has no start for it
(`gathering.js:1533`, `:1548`; counted at `botfp.js:541`); 20 flags.
One recovery strike a player in ten minutes is paid, not counted
(`gathering.js:221`, `HARVEST_PROOF.RECOVER_MS`; the clock is memory, so a deploy gives
everyone one).

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate, delay | Nothing. | yes |
| Deploy | The first strike after is a recovery (the clock is forgotten): paid. Two deploys in ten minutes: the second's strike is still paid (the clock is forgotten again). | yes |
| Hidden tab | iPhone Safari drops the socket; the phone joins again and its strike has no start. The first in ten minutes is paid; a **second** drop inside ten minutes, mid-harvest, is refused and **counted**. | **margin** |
| A bad line | The same as a hidden tab, each drop. | **margin** |

The count is written with the record and **never fades** (`botfp.js:541`:
it only adds). So an honest player on a flaky line who drops twice in ten
minutes while harvesting, now and then over weeks, reaches 20.

**The detector must:** count startless strikes in a window (or with the
score's half-life), never for life; and not count one that follows a join by
a few seconds.

### B7. The hour's caps (a clamp, not a flag)

**Read:** strikes and cooks an hour, a skill (`botfp.js:371`, `:570`); past
the cap a strike is not paid.

| Trouble | What it does | Safe today? |
|---|---|---|
| Any | The cap is 50% over what the world can supply an hour: no honest pace, backlog or burst reaches it. A deploy keeps the hour (written). | yes |

**The detector must:** keep its line over the world's supply, re-run when a
spawn changes (it says so itself).

---

## C. The claims' judges (refuse, never flag; counted)

These do not flag a player; each refuses or downgrades a claim, and counts
it. The league (10.7) scores a bot as caught by one when the judge refuses
it; an honest trace must never meet one.

### C1. The hit's reach (`hitproof.js:198`, `_hitReach`; `combat.js:1330`)

**Read:** the distance from the worker's own copy of the player to the
monster when the claim arrives; a bow's 675 px x its Range, plus 150 px, plus
a second of the fastest run.

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | Nothing (the arrow's flight is on the page's clock; its claim comes after). | yes |
| Delay, jitter | The claim arrives later; the player may have walked on: covered by a second of the run. | yes |
| Deploy | The worker's copy is restored where the phone rejoins. | yes |
| Hidden tab | An arrow in flight lands after the tab is back: its claim is late, the player in place. | yes |
| Slow phone | Slower walking: closer. | yes |

**The detector must:** keep the slack in TIME (seconds of the run), never in
messages.

### C2. The hit's rate (`hitproof.js:242`, `_hitRateTake`; `combat.js:1363`)

**Read:** bow and staff claims a second, from a bucket of 3 s of shots.

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | At 4-20 fps shots are slower. | yes |
| Delay, jitter | Bunched claims: the 3 s bucket holds them. | yes |
| Deploy | The bucket is on the player's state: full again. | yes |
| Hidden tab | No shots while hidden; held claims arrive in a burst under 3 s. | yes |
| Slow phone | As a hidden tab, smaller. | yes |

**The detector must:** keep a burst allowance at least as long as a hidden
tab's held claims (a few seconds).

### C3. The paid special (`hitproof.js:174`, `_pveSpecialTake`; `combat.js:1350`)

**Read:** a special claim inside a 4.5 s window a paid swipe opened.

| Trouble | What it does | Safe today? |
|---|---|---|
| Delay, jitter | The swipe and its claims go up the same line, in order. | yes |
| Deploy | Windows are memory: a special's claim after the deploy rolls as an ordinary hit (never dropped). | yes |
| Hidden tab | A big bolt landing after a long hide is past 4.5 s: ordinary. | yes |
| Frame rate, slow phone | The big bolt can take 3.5 s: inside. | yes |

### C4. The bow's shot (`bowshot.js:60-121`; `combat.js:1369`)

**Read:** each arrow's relay (`player_projectile`), counted at the bow's own
rate from an allowance of 2 (`bowshot.js:74`, `:80`); a `ranged` claim lands
on one of the last 8 arrows counted, or one drawn from the allowance
(`bowshot.js:103`).

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | Slower shots: fewer relays. | yes |
| Delay, jitter | Two relays the line bunched: the allowance's second. Three bunched: the third counts as no arrow, but its claim, which comes ~0.5 s later, draws from an allowance that refilled. | yes |
| Deploy | `_bs` is the player's state (memory): full again; a claim for an arrow loosed before has no relay and draws from the allowance. | yes |
| Hidden tab | The 8 kept arrows have no clock, so a claim the tab held still finds its arrow (`bowshot.js:39-41`). | yes |
| Slow phone | Bunched relays, as jitter. | yes |

### C5. The sword's swing (`swordswing.js:60`, `_swordSwingTake`; `combat.js:1376`)

**Read:** swings at the sword's own rate (one a 600 ms cycle), from an
allowance of 2; a swing's other targets within 150 ms of its first claim; a
claim from at most 150 px.

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | Slower swings. | yes |
| Delay, jitter | Two swings the line bunched: the allowance's second. A ring's hits go in one bundle, so they arrive together. | yes |
| Deploy | Memory: full again. | yes |
| Hidden tab | No swings while hidden; one held swing on return. | yes |
| Slow phone | A ring's claims leave in one bundle (the page sends them together), so a slow frame does not split them past 150 ms. | yes |

**The detector must:** keep its group window on what the page sends in one
bundle, never on frames.

### C6. The harvest's grade (`harvestgrade.js:190`, `:202`; `gathering.js:1521`, `:1632`)

**Read:** a perfect is believed only from the worker's start + the plan's
hits + 220 ms + 1.2 s - 100 ms; and 15 perfects in any 20 strikes.
(`harvestgrade`, OFF as merged.)

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate, delay, slow phone, hidden tab | Every one only adds to the time the worker sees between the start and the strike (it says so: `harvestgrade.js:144-153`). | yes |
| Deploy | No start record: only the share holds; the share is memory (15 more at most a deploy). | yes |

**The detector must:** keep measuring from the worker's own start, never the
phone's clock.

### C7. The move's budget (`movement.js:259`; `_handleMove`, `movement.js:554`)

**Read:** distance a player claims, against a bucket of 3 s of their own top
speed plus 80 px.

| Trouble | What it does | Safe today? |
|---|---|---|
| Frame rate | Below 20 fps the page walks slower (`_dtScale`). | yes |
| Delay, jitter | Bunched moves: the 3 s bucket. | yes |
| Deploy | The worker's place is restored where the phone rejoins; the bucket is full. | yes |
| Hidden tab | The page does not walk while hidden (no frames); the first move back is where it was. | yes |
| Slow phone | Slower. | yes |

---

## D. A person's latched fight: the two buttons (`?manual=5`; tag 6544)

Card CT, PR 5: a trial, on a touch screen only. The left stick turns the body
inside 30% of its travel and walks beyond; Attack is a latch (one press locks
the monster in the sight line and the held attack runs at the weapon's own
rate until a second press, the range's end or the kill, and on a kill the
lock moves to the next monster in sight with no press); Block and the
specials are buttons that come with the sight. **Nothing on the worker
changes and no detector's line moves.** The worker cannot tell this mode
from the default (4, the held combat): no field of `join` or `move` says it
(only the swipes' trial, 3, sends one: `fs`, `wsClient.js:759`). So a person
in mode 5 sends what a person holding the attack in mode 4 sends, with fewer
touches. What that looks like to each signal that reads aim or the rhythm of
presses:

| Signal | A person's latched fight | Safe today? |
|---|---|---|
| A1 `aimed` | A turn (the thumb inside 30%) moves no place, so it never enters the ring (`botsig.js:289`: a move is kept only when the place changed). A walk starts at the turn's border and its speed rises to the rim: a slower start sends more places on the last 40 px, never fewer. | yes |
| A2 `reflex` | A turn is no answer (same place, no velocity: `botsig.js:306`). The answers are today's: a walk away, the dodge swipe, Block. In a latched fight the right thumb is not holding Attack, so Block is one tap, not a lift and a press: the answer is quicker by the lift, still a person's reaction, and the frame and the line only add to it. Margin #2 below is the same. | yes |
| A3 `rooted` | The fight goes on with no thumb down and the lock moves through a pack by itself, so a person who stands still kills more from one spot than in mode 4 (an archer or a staff, at range, most of all). Runs from one spot are longer for an honest person. | **margin (#4, wider)** |
| A5 `gesture`, B1-B4 (the fingerprint, the replay ring, the variance, the gap between strikes) | Attack near a node starts a harvest, as the disc does today; the harvest's drawn gesture is the minigame's own layer (`ExtractionSwipeLayer.jsx`, `swipeFp`), which this mode does not touch. | yes |
| C1 the hit's reach | The sight's ranges are the worker's reach less its slack, never more (`sight.js` `sightRange`): a latched hit claims no further than mode 4's. | yes |
| C2, C4, C5 the hit's rate, the bow's shot, the sword's swing | The latch runs the held attack's own lines (`S.autoAttack`): the weapon's own rate, the held bow's relays, a ring's hits in one bundle. The bow looses at the lock. | yes |
| C3 the paid special | The Special button is today's `ability_use` (`type: 'swipe'`), a tap in place of a flick. | yes |
| The cadence of presses (not read, below) | **Two presses a fight**, or one: the fight's rhythm is the weapon's cooldown, and the lock's moves come with no press at all. A person's latched fight and a script's are the same on the wire, and the same as mode 4's held fight. | yes, while it stays unread |

**The detector must:** never read "few presses a kill" or "a lock that moves
by itself" as a script: that is the mode, and the worker cannot see the
mode. A rule that needs to know it asks for a field on `join` first (a cap
and a kill switch: CLAUDE.md section 5), never a guess from the rhythm.

## What is NOT read (and must stay so)

The cadence of `move` (a timer: 33/66 ms, or ~200 ms with the move diet),
the cadence of swings (holding attack swings on the cooldown), instant turns
(a keyboard turns instantly), the walk to a monster (the sword's lunge aims
every frame), the time of a join, and anything compared across players by
time. Each is the client's or the deploy's rhythm, not a person's
(`botsig.js:29-38`, `docs/specs/server-botsig.md`).

## The margins found, for the detectors' owner (card K4)

Each is a place an honest player's trouble moves a signal toward its line.
None is a fix this card makes (it writes no detector).

| # | Signal | The trouble | What reads wrong | Where |
|---|---|---|---|---|
| 1 | `strikes-without-start` | two drops (an iPhone's hidden tab, a bad line) inside ten minutes, mid-harvest | the count never fades: 20 over a record's life flags | `botfp.js:541`, `gathering.js:1533` |
| 2 | `reflex` | a line that wavers | the AVERAGE round trip is taken off, so a quick trip after slow ones reads an honest answer as quick | `botsig.js:333`, `index.js:5050` |
| 3 | `aimed` | the move diet, a slow phone | with no place between the chord's ends, `straight` is true by default | `botsig.js:193-197` |
| 4 | `rooted` | a slow phone, an archer planted for a fight | a run is counted in hits, not time | `botsig.js:433-446` |
| 5 | `cook`, `tv`, replay | 4 fps | the frame's step is wider than a bin, a floor, or the 8 px grid | `botsig.js:418`, `botfp.js:425`, `:432` |

The league (10.7, `tools/league/`) plays these troubles on its honest
traces: a margin that turns into a false flag fails `league.test`.
