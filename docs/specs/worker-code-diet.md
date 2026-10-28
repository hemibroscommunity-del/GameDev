# The ground worker and the page's code, held smaller (v2.3.3717)

The owner, 2026-10-28: *"The game needs to be extremely memory efficient."*
iPhone Safari closes the tab at about 250 MB, and a big fight held about
335 MB on the memory check's measure. This lane trims three things the memory
check (`mp-membudget`) reads: the ground worker (`workers`), the page's script
text (`buffers`) and its JavaScript objects (`heap`).

**All three are ON for everyone since v2.3.3736.** The owner, 2026-10-28:
*"I think including the new memory change work by default would be better. I
can always revert the change if I don't like it or it doesn't work well."*
(v2.3.3717 shipped them off, behind switches.) Each can still be turned OFF
for one phone with `=0` in the page's address: `?groundlean=0`,
`?codelazy=0`, `?heaplean=0` (`off` and `false` work too; any other value, or
none, is on). A test run passes them to every page with
`BT_QA_QUERY=groundlean=0&codelazy=0&heaplean=0` to see the game as before.
The whole change is undone by the Revert button on its pull request (#1202
built them; the one that turned them on is v2.3.3736's).

## 1. The lean ground worker (`?groundlean`)

`public/tools/world/core/ground-worker.js`, THE LEAN GROUND.

**What a walk asks of it.** The worker now counts, and sends with every piece
(`diet`, read as `window.__btWorldTrial.stats.diet`): pictures unpacked
(`decodes`), unpacked again after being let go (`redecodes`), the most one
piece needed (`keepMax`), files downloaded again (`refetches`), and with the
switch on, pictures squeezed and thawed. On the memory check's trip (BroTown
-> the Flame Fields' fight -> home, three times):

- only **12** swatch pictures are ever unpacked, none twice;
- a town piece needs up to **10** of them, a fight piece **2**;
- unpacking one costs **~800 ms** of the worker's time on the test box.

So the cap of 16 never bit: the worker held every picture the trip had seen,
12 MB, and simply lowering the cap would have unpacked them again on every
trip, 800 ms each, and the ground would come late.

**What the switch does:**

- keeps **8** pictures unpacked (and always every one the piece being laid
  needs);
- one let go is **squeezed**: its colour numbers deflated by the browser's own
  `CompressionStream`, 1 MB to ~0.25-0.4 MB, kept cold (24 at most), and
  **thawed** in ~5 ms when wanted again, never unpacked again from its file.
  The squeezing waits until the worker is idle (squeezed in a piece's time,
  the pieces came ~7 ms slower each);
- the downloaded files kept: 8 (32 before; the phone's own cache keeps them);
  the blocks built: 16 (48 before; the walk used 15);
- the plan's **lattice memos** (layout.js `latticeAt`, one a field) had no cap
  and grew with the walk, ~3.3 MB in BroTown: started again past 8,192 values
  each (`latticeKeep`). Their values are worked out again exactly;
- calm water pictures are not kept apart: a calm one let go is squeezed calm.

A browser without `CompressionStream` lets a picture go as before.

**The proof** (`node tools/qa/mp/run.mjs groundlean`): a phone walks the trip
out and back twice, once as today and once lean, both with `?groundsum` (each
piece sent with a checksum of its colour numbers, colours and footsteps):

| | today | lean |
|---|---|---|
| pieces compared | 195 | **0 differ** |
| mean piece time (worker) | 58.6 ms | 58.4 ms |
| pop-ins | 326 | 331 |
| pictures unpacked twice | 0 | 0 |
| thaws | - | 16, 83 ms in all |
| the ground worker (heap + buffers) | 26.5 MB | **21.4 MB** |

Tuning on the way (same test): 6 kept unpacked made town's pieces thaw 58
times and come 5 ms slower; 8 is as fast as today.

## 2. The rare windows' code, loaded when first opened (`?codelazy`)

`src/ui/lazyPanel.js` (how), `src/ui/lazyPanels.js` (which).

The page keeps all of its script's text, whether or not the code ever runs.
The windows a player opens now and then are each their own small script now:
the leaderboard (both), feedback (both), the clan (both), achievements, the
codex (both, with the monster codex and its stage), settings, the pet house,
furniture, the dungeon creator, the stat screen, the trade window, a player's
card and profile, the exchange, the gambling den (and the daily spin), the
arena's window, every building's window (Blacksmith, Woodworker, Gem Works,
cook, farm, auction house and its chat, shop, bank, Land Office), and the
debug overlay (`?dev=1`).

- **On (the default)**: a window's script is fetched the first time it opens
  (a few ms from the phone's cache), and kept. Until it comes the window draws
  nothing for that moment.
- **`?codelazy=0`**: every one is fetched as the page starts, behind the
  loading screen. The page holds the same code as before v2.3.3717, and each
  window draws on its first open exactly as before.

**A window whose script cannot come** (v2.3.3736). A tab left open across a
deploy asks for its OLD build's scripts, which Cloudflare Pages no longer has
(it answers with the page itself, which fails as a script); a deploy can land
while the judges play. So:
- a failed fetch is tried once more, 1.5 s later, at the script's own address
  with a fresh query (a browser keeps a failed module's failure: Chromium
  answers the same `import()` again at once without asking the network);
- failing again, the window shows **"Couldn't open this. Reload the game to
  get the newest version."** with Reload and Close, over the game, which plays
  on. Close is the window's own close (`lazyPanels.js`), so the game is not
  left "busy" behind it. Opened again, it tries again;
- `mp-lazyfail` proves it (the Achievements page's script answered with the
  page, the Settings page's refused once), and the UI review shows the card
  (`lazy-cantopen`, docs/UI-DESIGN-NOTES.md "A window that could not open").

The main script: **3,820 -> 3,408 KB** (-412 KB, -11%).

**Never split** (they are used in a fight, or mounted always): the bag, the
skills, the hero sheet and its stat demo, the touch controls, the HUD, the
quest windows, the world map. **The character creator** (NameModal and its
paint tools, ~65 KB) stays too: BroTown's preview effect draws into its canvas
when the creator opens, and would miss a canvas that came a moment later.

`window.__btLazyCode` (`on`, `loaded()`, `named()`, `failed()`, `cards`) says
which have come, which could not, and the cards shown and closed.

## 3. The page's heap (`?heaplean`)

A heap snapshot of the page in BroTown (dominator tree, retained sizes) found
the page's biggest objects all in use: the Wheel's object placements (1.7 MB),
the colour-number textures, the Wheel's shaders, the script's text. No large
cache without a cap. One leftover: the worker's `ready` message is kept whole
(`wheelTrial.js _info`), and with it the **world map's overview pixels**
(~1 MB of buffers), which nothing reads after the two minimap canvases are
made from them (both copy them). With `?heaplean` they are let go once the
canvases are made; the land ids stay.

## The memory check, line by line

`mp-membudget`, MB: the highest reading on the trip, and on arrival in
BroTown (the steadiest reading: the fight's heap swings by +-0.5 MB with the
fight itself, how many swings it takes, on every run, main's included).

| line | main | switches off | all three on | saved |
|---|---|---|---|---|
| workers (highest) | 28.6 | 28.6 | **23.4** | **-5.2** |
| workers (arrival) | 23.5 | 23.5 | 20.8 | -2.7 |
| buffers (highest) | 20.6 | 20.8 | **19.3** | **-1.3** |
| buffers (arrival) | 18.4 | 18.5 | 17.1 | -1.3 |
| heap (highest) | 33.2 | 33.8 | 33.2 | (noise) |
| heap (arrival) | 27.6 | 27.6 | 27.4 | -0.2 |
| artCache, gpu, canvases, sound | | the same | the same | |

`buffers` with `?codelazy` alone read 18.2 on arrival (-0.2: the windows'
script text) and with `?heaplean` 17.1 (the overview's pixels, -1.1).

## Decided

- On for everyone (v2.3.3736, the owner's words above). The memory-budget
  lines are not lowered yet: they are locked in after the showing, so a tight
  line cannot flake red when a merge must go through fast.
