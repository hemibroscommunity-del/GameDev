# STATE-MACHINES: the working list (v2.3.4355)

One line an item. A session takes the first OPEN line, proves it is real on
today's main, fixes it with a test that failed first, and ticks it here in the
same PR. A claim that turns out wrong is marked REFUTED with the evidence:
that is a finished item too.

**Where this came from.** A read-through on 2026-11-03 found 964 places where
something moves through phases ("implicit state machines") and checked the 149
that looked risky. Its raw notes are NOT in this repo's `docs/`: they are on
the branch `claude/state-machine-sweep` (draft PR #1415, never to be merged),
under `docs/state-machine-sweep-2026-11-03/`. Read one file at a time with
`git show origin/claude/state-machine-sweep:docs/state-machine-sweep-2026-11-03/PLAN.md`
(the detail of each cluster is `verified/V*.md`). By the run's own count 18%
of the claims it checked were wrong, so **every line below is a lead until its
turn comes**. Do not re-sweep the repo: it cost a third of a week's usage.

**What "explicit" means here** (owner, 2026-11-09): a phase lives in one
field, one function changes it, and a test fails any other writer, the way
`hit-door.test` does. Not a rewrite of all 964: most are harmless.

**What the owner wants from it**: the game smooth on every device; a modified
client cannot cheat (the server decides, the phone only asks); an honest
player never loses items, gold or a fight to a phase that stuck.

## A. The computer faults from the expo (2026-11-05)

- [x] **A. Patches like a checker pattern round the edge of the view, and
  "not smooth", on the judges' computers.** DONE, v2.3.4355.
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

- [ ] **A2. How a computer DRAWS the game.** OPEN: next, ahead of B, by the
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
  - **None of it can be measured on the test box**, which draws in software.
    So first a capture from a real computer: the Test panel's Speed test and
    a screenshot of its card, with the computer (Windows or Mac), the browser
    and the screen. The Speed test has no lower-resolution step for a screen
    at 2x or under (`speedTest.js` LOW_RES): add one, so the card can say
    whether the pixels are the cost. Then fix what the card shows; a pixel
    budget for big screens is the likely first fix and needs no capture to be
    safe for phones (they are under it).

- [ ] **A3. The skateboard on an iPhone.** OPEN. The owner, 2026-11-09, on an
  iPhone 14 Pro Max in Safari: "gritty framerate while on skateboard riding
  through town. Can that be improved to a buttery smooth FPS?"
  - **Measured** on a phone-sized page
    (`BT_PF_SCENES=townwalk,townride node tools/qa/mp/run.mjs phoneframe`,
    its new `townride` scene): the game's own work a frame is nearly the same
    riding as walking (the middle frame 6.9 ms against 6.6 on the test box,
    19 frames in 20 within 12 ms against 9.1). The one large difference: a
    ride lays about 13 new pieces of ground a second, each a new picture
    handed to the graphics chip (about 2 MB a second, and as many let go
    behind you), where a short walk lays none.
  - **So the suspect is the graphics chip's side**: making, filling and
    dropping about 13 pictures a second. The test box cannot time a phone's
    chip.
  - **Capture first, on the phone** (a minute): the game's address with
    `?perf=1` on the end shows a strip at the top (frames a second, the
    game's own work, the time outside it). Ride through town and screenshot
    it; then the same with `&res=2`, and with `&noobjects`.
  - **Likely fix if the capture agrees**: reuse the pictures of the pieces
    let go for the pieces being laid, instead of making and destroying one
    each time (a small pool with a cap: the memory law), in
    `src/rendering/wheelGround.js`.

## B. Cheap closes against a modified client

From PLAN.md, "the cheap closes for modified phones".

- [ ] **B1. The `dead` gate.** Target gates ask `ps.dying`; a phone that
  never says it is dead cannot be hit ("god mode"). OPEN: first of B.
- [ ] **B2. Minted `dungeon:` ids** grow the room's memory (about 100 MB an
  hour against a 128 MB room). OPEN.
- [ ] **B3. A points-reset loop** can write about 131,000 rows a day, past
  the free plan's 100,000. OPEN.
- [ ] **B4. The feedback board trusts any typed id.** OPEN.

## C. Wave 1: honest players' harms, in PLAN.md's order

- [ ] **C1. The phantom duel (V6)**: a red skull, and worn gear lost to a
  player kill. OPEN. Needs owner decision 2 for the zone-change rule.
- [ ] **C2. Undone blocks (V12).** OPEN. Needs owner decision 3.
- [ ] **C3. Bag losses**: the dying window (V2) and death piles (V22). OPEN.
  Needs owner decision 6.
- [ ] **C4. The guard break shown on the phone (V10).** OPEN.
- [x] **C5. The pond memory leak (V17b, R1-8).** On main as v2.3.4157 ("a
  fishing overlay pushed out of its cache is freed for good"), by the commit
  log; not re-checked.
- [ ] **C6. The bag lost behind the dungeon's loading screen (V11).** OPEN.
  Do not add a movement freeze: holding a player still and blind while
  monsters hit them makes it worse.
- [ ] **C7. The frozen trade window (V8b).** OPEN.
- [ ] **C8. The Rare armour lost on the phone after a reconnect (V9b)**:
  match by gid. OPEN.

## D. Wave 2: the five causes, then "keep it fixed"

- [ ] **D1. The server decides the player's phases itself**: dead, guard,
  zone flips, world size, cooking. The phone's fields become requests, as
  v2.3.3292 did for dodging. OPEN. **Owner decision 4: YES** (2026-11-09).
- [ ] **D2. One fight-lock table in the router**: every message that moves
  gold or items names its gate; a test sends each during a player fight and
  checks nothing moved. OPEN. Needs owner decision 7.
- [ ] **D3. Phone copies of server sessions** (the duel, the trade window,
  the held pose, the arena) cleared at every rejoin and sent again by the
  worker, as the party already is. OPEN.
- [ ] **D4. One server clock on the phone**, from the ping, for every server
  timestamp (loot piles, the trade countdown, buffs). OPEN.
- [ ] **D5. Two habits**: a dropped send is never stamped as sent; a cache
  never evicts what this frame draws. OPEN.
- [ ] **D6. Money**: each payment, its stamp and the record's "paid" phase
  in one synchronous run, a phase per escrow record that the wake finishes.
  OPEN.
- [ ] **K1. A "one door" test per machine**, as `hit-door.test`. OPEN.
- [ ] **K2. Chaos tests**, node first: a second tab mid-fight, a deploy
  mid-trade, a restart between two saves, an app switch, a black-screen
  rebuild, a wrong phone clock. OPEN.
- [ ] **K3. A precheck rule** against any load with no time limit or retry.
  OPEN.
- [ ] **K4. Two CLAUDE.md lines**: "a phase lives in one field with one
  transition function"; "the server never takes a phase from the phone's
  move". OPEN (the owner approves CLAUDE.md's rules).

**Order notes from PLAN.md**: the cold-flags fix (V13) before the HTTP-route
changes; the shared loader helper before the "load once, never retry" fixes;
move mp-remnant off the retired map before relying on it; the second-tab
takeover (V3) and two-tab identity (V5) ship under one answer; the duel's
rejoin clear only ships with the worker's re-send.

## Already on main from the sweep (by the commit log)

- v2.3.4154: the 1/2/3 keys take up only a weapon you hold (VB, G2-17).
- v2.3.4155: "Your map" is never refused for its size (V15, M1-1).
- v2.3.4156: a full crash ring still uploads a new crash (VA, N2-1).
- v2.3.4157: the pond memory leak (C5 above).

## Small leads not yet in a wave (PLAN.md, "optional")

- [ ] Monsters drawn as a generic body after a short walk (V17b, R6-5).
- [ ] The Wheel's ground helper retrying after a Wi-Fi blip (V11, G3-4,
  T1-12). Partly touched by item A (a download is no longer cut for being
  slow); the helper's own start is not checked.
- [ ] A computer-only raise of the dressed-shirt cap (V18, R7-3). Unmeasured:
  measure with `lookpalette=0` first.

## The owner's decisions (PLAN.md's numbers)

| # | Question | Answer |
|---|---|---|
| 1 | The expo's per-address limits | Past (v2.3.4158's Test panel switch) |
| 2 | A zone change mid-duel: forfeit after 15 s, or doors refuse duellers? Should a challenge time out on the phone? (V6) | OPEN |
| 3 | Blocks kept by the server, also stopping DMs and requests, and unfriending? (V12) | OPEN |
| 4 | Should the server stop believing the phone about dead, guard, cooking, zone and world size? (V1) | **YES** (2026-11-09) |
| 5 | Two characters in two tabs, and a second tab mid-fight: allowed? (V5, V3) | OPEN |
| 6 | A death pile across a deploy, and the dying window across a closed app (V22, V2) | OPEN |
| 7 | The fight lock: do forging, hardening, gems and equipping count? (V21) | OPEN |
| 8 | The farm's two phone-only workshops: remove or rebuild? (V9c) | OPEN |
| 9 | Smaller: a monster pile 30 s or 60 s; a failed monster look invisible or a stand-in; the guard break shown, and whether the guard comes back by itself | OPEN |
