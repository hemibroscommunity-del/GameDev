# The armour's bakes, kept on the phone (v2.3.6761, card LOAD PR 2)

## Why

The owner, 2026-11-26: *"How do I speed up the game in terms of having let's
say something like a cache that has already been preloaded? Or is memory still
the key constraint?"*, and their Loading times from their iPhone: the loading
screen up **21.3 s**, which is `IntroVideo.jsx`'s 20 s limit and its 1 s fade,
while the pictures were ready 11.9 s in and the world 13.1 s in. The screen was
waiting for the end of `preloadPlayerAssets()` (`pixiRenderer.js`): after the
loads, the bakes of the worn armour's masked body frames
(`prewarmMaskedBodyFrames`, the step `masks`), which the bake worker made
again at **every** login. On the test box, a character in the copper torso
and greaves had 10 of its 177 frames at the lift and 93 of 177 ninety seconds
later; `masks` was never reached behind the screen.

The bake is a pure pixel function of its inputs (`maskedBake.js`'s header). So
it is made once and **kept on the phone's disk**. That holds nothing more in
the page's memory: the owner's question about memory is about what is held
while playing, and a frame read back is held exactly as a baked one is.

## What it does

- **The worker keeps what it makes** (`src/rendering/maskedBakeWorker.js`,
  `keptJob`), in IndexedDB opened from the worker: nothing of it runs on the
  page's thread. The page asks for a bake exactly as before and never knows
  whether the answer was kept or baked.
- **The key** (`src/game/bakeKeep.js` `keyParts`, `keyOf`: SHA-256) is made
  from the job as the worker receives it: every input (the body, the belt,
  each worn piece) by the pixels the bake would draw and their placing; a body
  drawn from the look's numbers by the frame those numbers make in the look's
  colours; each piece's name, the dilate, the pose and frame, the display step,
  the crop; the rod on a fish frame; and the bake's version (`KEEP_V`, the
  worker's script, whose file name carries a hash of its code in a build, and
  the browser). A field of a job that no list in `bakeKeep.js` names makes no
  key, and the job is baked: a field added later cannot be forgotten.
- **A kept job** is answered from the store, in the reply the bake makes (a
  frame's pixels put back on a canvas of their size; a look's bits, counts and
  residue). **One not kept** is baked, answered, then kept. A frame baked
  before the chain belt came is not kept (the page never keeps it either:
  TRAPS §251).
- **The cap**: `KEEP_CAP_MB` (20 MB of the phone's disk, about four armour
  sets: see the numbers below), the least lately used let go past it.
  **The version** (`KEEP_V`, the script, the browser) empties the store when it
  changes.
- **No store** (private mode, a full disk, an old browser, no
  `crypto.subtle`), or a store that throws: the keep is off for the session and
  every job bakes as before, silently. A kept value that does not read back
  whole (`keptOk`) is baked again and replaced. When in doubt, bake: never a
  wrong picture.
- **`?bakekeep=0`**: today's behaviour, for one phone. The worker keeps
  nothing until the page has told it the switch (`keepTell`, from
  `prewarmMaskedBodyFrames`, before its first job).
- iPhone Safari may empty a site's storage after a week unused: the next login
  then bakes again, as before. Not a fault.

Nothing moves off the loading screen (PRELOADING IS LAW): its wait is made
TRUE. The first login in a set never seen is as before (the screen lifts on its
limit with the frames still being made); the limit is unchanged.

## How it is held

- `tools/guards/bake-keep.test.mjs`: change any input, the key changes; what is
  not keyed does not move it; a field nobody listed makes no key; every field
  the page posts in a job and puts on an input is in the lists (read from
  `entityRenderer.js`, `bakeByAddress.js`, `gearNumbers.js`); the store's rules;
  the worker's road.
- `mp-bakekeep` (`node tools/qa/mp/run.mjs bakekeep`): the owner's copper set,
  a first login, then a second in the same set: every frame ready at the lift,
  `masks` within 3 s of `loads`, the screen lifted on "ready"; every kept answer
  baked again beside it and compared byte for byte
  (`window.__btBakeKeepVerify`); and a login with `?bakekeep=0` that reads and
  writes nothing. QA's probe: `window.__btBakeKeep()` (the worker's counts).

## The numbers (the test box, 2026-11-26)

`mp-bakekeep`, the copper torso and greaves, the trousers drawn (177 frames),
an iron plate in the bag (a set one equip away):

| | before (main) | after |
|---|---|---|
| first login in the set: frames ready at the lift | 7 of 177 | 1 to 7 of 177 (as before: nothing kept yet) |
| second login: frames ready at the lift | 5 of 177 | 3 of 177 (the lift comes before the loads end here: below) |
| second login: the worn set's frames when `masks` came | `masks` never reached in 400 s | 177 of 177 |
| second login: jobs | every one baked again, about 3 s a frame here | 276 from the store, 24 baked (the iron plate's frames, and 3 stand frames whose body sheet differed from the first login's) |
| third login: jobs | | 177 from the store, 0 baked |
| the worker's time for a kept answer | | about 2 ms (630 ms for 276) |
| `masks` after `loads`, second and third login | | 92 s and 89 s |
| a kept frame against the bake, byte for byte | | 177 of 177 the same, 0 different |
| `?bakekeep=0` | | nothing read, nothing written |
| the store after a set | | about 3.9 MB a set (22 KB a frame); 6.4 MB with the spare set |

**What is left on this box: the page's part of each job.** With every frame
answered from the store (the third login), `masks` still came 90 s after the
loads: the worker's part is about 2 ms a job, but the prewarm asks for one job
at a time, and the page's own steps of each (the job made, posted, the answer
stored as a texture: `entityRenderer.js` `_pumpBakes`, `_runBake`,
`_storeBake`) wait behind this box's frames, a few a second while the loading
screen is up (about 0.5 s a job). A phone draws sixty. Whether the owner's
phone now has `masks` within a few seconds of the loads is for their next paste
of the Loading times (part 1's readout) to say; batching the page's part (more
than one job at once to the worker) is in the bake queue, outside this card.

**The lift on this box.** Here the loads alone take 35 to 54 s (`loads`), past
the screen's 20 s limit, so the screen lifts before the armour's step can
begin, kept or not: "every frame ready at the lift" cannot be shown on this
box, only every frame ready when `masks` comes. On the owner's iPhone the
pictures were ready at 18.0 s, inside the limit.

**What the key reads, and why so.** The first key read every input's picture
back. In a bare page that is 1 to 4 ms a job; in the game, on this box, it was
about 2 s a job, because each read waits behind the frame the graphics chip is
drawing. So a sheet by address is keyed by its FILE (the digest of the bytes
fetched, and kept only when the sheet the worker drew is that same file) and a
frame of the gear's numbers by its sheet of numbers: the key reads no picture
back, and a kept job decodes no sheet.

**The sets one equip away wait for the worn one.** The spare sets' pass
(`prewarmAltWornSets`, kicked by `_noteOwnedGear` while the loads still run)
shares the worker's one queue: its frames not kept yet were whole bakes between
the worn set's answers (`masks` 92.5 s after the loads with 22 of them). They
now wait for the page's worn pass, begun or not (`_wornPass`).
