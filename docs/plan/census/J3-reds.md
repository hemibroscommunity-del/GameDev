# Red on `main`, round 3: the census (card J3, step 8.1; tag 5840)

Taken 2026-11-17/18 in one cloud session (4 vCPUs, the pre-installed
Chromium, `npm run build` fresh): round 1 on `main` at fcd1ae9, round 2 at
3750ba4 after a container restart (none of the scenarios below changed
between the two). Each ran ALONE (`node tools/qa/mp/run.mjs <name>`), the
box reaped after each (`pkill -f '[w]orkerd'; pkill -f '[c]hromium'`). The
list is card L's Found and J2's 5b. Judged by TRAPS §177: a red on `main`
is a question about the TEST first. Where a cause was not plain from the
output, a copy of the scenario with extra readings was run (never
committed) and its numbers are quoted.

## The verdicts

| Scenario | Round 1 | Round 2 | Verdict | Fix |
|---|---|---|---|---|
| `deathzones` | 101/101 | 101/101 | green twice | none |
| `fishvariants` | 19/19 | 19/19 | green twice | none |
| `moresounds` | 22/22 | 22/22 | green twice | none |
| `deskharvest` | 17/17 | 17/17 | green twice | none |
| `hitsound` | 6 red | 6 red | the TEST's (stale table) | 5842 |
| `comeback` | 1 red | 1, 5 red | the TEST's (wall clock; a race) | 5841 |
| `race` | 1 red | 1 red | the TEST's (stale cells) | 5843 |
| `ownersounds` | 3 red | 3, 9b red | the TEST's (regen; the chat gap; one tap) | 5844 |
| `bowprops` | H red | H red | the TEST's (the view is wider) | 5845 |
| `desklunge` | 4 red | green | the TEST's (the sea; wall clock) | 5846 |
| `itemdrop` | 5b red | (J2's runs) | a GAME question (J2's) | Needs |

## The causes

### `hitsound` (a node script, not a scenario: `node tools/qa/mp/mp-hitsound.mjs`)

`run.mjs hitsound` refuses it ("exports no `run`"); run with node, twice,
the same six red: stone and snow "the whole voice", `swordHit` (the old
name), and the level of stone B (0.70x), snow A (0.68x), snow B (0.63x).
v2.3.3523 changed both voices on purpose, at the owner's word ("Hit made
a fleshy sound on the snowman ... Same fleshy sound for the rock monster on
every hit"; `docs/specs/sounds-2026-10-19.md` §6): the rock is the pick
with its click over a scrape of GRAVEL (no `step-stone` thump), the
snowman a crunch of SNOW with an icy crack (no snowball thud), "~0.7 of a
hit". The test's `WHOLE` table and its 0.7 floor are v2.3.3001's.
Fix: the table reads today's voices; stone and snow A/B keep a 0.6 floor
(every other voice 0.7, the ceiling 1.45 unchanged).

### `comeback` 1 and 5

- 1: "walking: 15 px in 0.6 s", both rounds, the stick full on (`sx` 1),
  and everything the check is for true (the stick let go, 0 px after,
  `stick` released). It measured the walk by 0.6 s of the wall clock and
  wanted 20 px: the bro moves by frames, a few a second on this box
  (TRAPS §200). Fix: walk until 20 px, up to 8 s.
- 5 (round 2): `thaw.kick === before5.kick`. The wait for the thaw took
  `kick > 0`, true at once: check 4's return had armed the kick for
  `KICK_ARMED_MS` (20 s, `gameDisplay.js`), so it was read before
  GameApp's 1 s beat saw the frozen gap and armed it again. Fix: wait for
  a kick newer than `before5`'s.

### `race`: "on his jog's own cells"

Both rounds saw cells 0-7 and a cell past 8. The check is v2.3.3580's:
Lil Bro's PHOTOGRAPH strip, the jog in eight cells then his stand (8).
Since v2.3.4058 the townsfolk are drawn LIVE by default (`lookFolk.js`),
as the player's own figure on the player's own jog, whose sheets have
24-35 cells a facing (`playerSprites.js deriveFrameCount`). The probe
says which (`__btNpcSprites` `live`, `pose`). Fix: drawn live, his jog's
cells (at least four, whole numbers); his photograph, the old rule.

### `ownersounds` 3, 9b and 9a

- 3 (both rounds: no cue at all on the Quick Eat tap). Read at the tap:
  `{"hp":250,"max":250,"view":null}`, the element under the finger no
  longer the button. The test set HP 60 short of full and waited up to 9 s
  for the button; the worker's regen gave the 60 back (240 of 250 when it
  was found), so the tap came after the button was gone and ate nothing.
  Fix: a third of his health (a minnow heals 100: still short of full).
- 9b (round 2): "0 lines popped up". Since v2.3.4040 one idle line is
  said town-wide every 20 s (`townChatter.js idleChatMay`, `S._idleChatAt`);
  the test zeroed every townsperson's `chatTimer` only, so a line said in
  the last 20 s (Ace's, just before in 9a) held all back, by run. Fix: the
  gap opened too (`S._idleChatAt = null`).
- 9a (red 1 of 2 runs of the fixed file, a helper session's): "a tap on
  Ace (no tap)". The test hopped beside him and made one tap by hand; a
  frame drawn between a touch's start and end makes a tap a hold on this
  box, which the harness's `talkToNpc` meets with three tries. Fix: Ace
  reached the harness's way, `H.approachNpc` (CLAUDE.md §6).

### `bowprops` H (the guard)

Read in the loop: `half` 421.7 (`S._viewW` 843 on the test's phone), the
Town Hall first on the line at two of the three heights (a lamp at the
other). The guard wants 460 > half + 60: the comment's "~320 px half
width" is from a narrower view, so the 460 px stand is on screen and the
guard refused every run. Fix: stand at max(460, half + 80) px (502 today),
inside the bow's 675.

### `desklunge` (red 1 of 2; then 6 of 11 runs of a copy with readings)

Two causes, both the TEST's:

- 1, 2, 3 all red together (round 1; 5 of the 11): every click did
  nothing: no swing, no dash, the cooldown 0, though the lunge was ready
  (`visible, equipped, afford, cdLeft 0`) and the press read `attack`.
  Read at the click (the run that read it): the popup "Swimming!" and
  the cue `denied`. The test
  stood him 170 px south of the nearest snowman, and that spot was
  sometimes the sea: swimming, the game refuses every swing and lunge
  (`combatHelpers.js swimRefused`), by design. Fix: the first of eight
  stands round the snowman where, once he is there, the game does not have
  him swimming (`S._wheelSwim`, what `swimRefused` reads), and a guard.
- 3 alone red (1 of the 11): "inside the lunge's cooldown" lunged
  again (a dash, a fresh 2.3 s cooldown). The click came after the wait
  for the worker's HP (up to 4 s of the wall clock), longer than the 2.5 s
  cooldown on this box (TRAPS §200). Fix: the click at once after the
  lunge (0.65-1.7 s of it left, measured), its cooldown read just before.
  A swing is asked of it only when the sword's own gap had passed at the
  click: the lunge's strike stamps that gap when it ARRIVES, and on this
  box the dash's travel took up to 1.4 s of frames, so the gap could end
  after the cooldown; clicks aimed between the two, with 320-345 ms of it
  left, landed after it and lunged (3 of 4 runs). The check names which
  it was ("no swing due"); every run here was that one.

### `itemdrop` 5b: a GAME question (J2's Found), not run as a fix here

Round 1: `{"A":[1],"B":[]}`: the dropper's screen saw the pile only lit,
the watcher's never listed it with an alpha, in 8 s of frames after
`/dev/dropage` aged it 121 s. 5c (it goes) passes. J2's own PR 34 (5652)
holds the file and its last reading; the question stays theirs and the
owner's: is the flash driven by a push of the aged state that never
reaches the watcher (the worker tells the room only once `_tickLoot`
reveals a private pile; `itemdrop.js _dropDevAge`), or by its own clock
(`itemDrop.js dropAlpha` reads `flashAt` on the phone's clock)?
