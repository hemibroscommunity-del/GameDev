# The gatekeeper's review, sitting 26 (card Z; tag 5664)

Taken 2026-11-17 on `main` 3ac8691f (sitting 25 merged: R #1969, MOD
#1971, K #1972, OPS #1975, P #1976, R #1873, Z #1979). The owner asked for
speed: the PRs in hand reviewed and listed now, one reviewer a PR group
(the seven angles of `/repo-review` in one pass, each candidate tried
before it is reported). Later arrivals go to sitting 27. Tags written bare.

## Heads and merge bases

O #1970 ff5fff64 and O #1974 9f7da1b4 (which merges #1970's head:
stacked) are based on `main`, each with one merge base step by step
(4751cb7a for #1970 on 3ac8691f; ff5fff64 for #1974 once #1970 lands).
O #1977 conflicted with the pair on `docs/plan/status/O.md`; O stacked
it on #1974 (head 1f6801c0 merges 9f7da1b4): one merge base, 9f7da1b4;
T #1978 (5a2d3ff4, main 3ac8691f merged in) conflicts with #1970 on
`tools/guards/switch-reader.test.mjs`'s `OUTSIDE_LINE` (189 against 184:
each counts its own moves). Each merges clean on `main` alone.

Rehearsed (`tools/dev/gatekeeper.mjs`, #1970 then #1974 on 3ac8691f; the
merged tree 317b3c19): build PASS, questline 187/187 (549 s). precheck
FAIL on its `server-tests` 5-minute limit only, the box loaded by two
reviewers' suites (sitting 25's Found); the suite run alone on the same
tree: 470 suites, all green, 277 s. #1977 on top (tree 882e4666, words, a
ledger row and the blocks file): self-test 49/49, draw-lanes and
state-ledger guards green. The tree after each merge, from
`git merge-tree` step by step: 1 07e93181 · 2 317b3c19 · 3 882e4666.

## O #1970 (5232): the off-ramps through the reader

READY with lows. Sitting 25's hold is mended: every reader `drawLanes.js`
marks `moved: true` reads the address only through `switches.js`
(`?sheen` glint.js, `?lightfx` lightFx.js, `?waves`/`?nowaves`
wheelWater.js, `?stripslice`/`?stripgentle` zoneTextures.js). What still
reads `location.search` in those files is no knob's off-ramp
(`?nopalette`, `?webskip`, `?caustics`, `?seacover`, the look probes).
Old and new reads compared address by address: the same, but `%31`
(the reader decodes). `governOn` now reads `swValue('lane') === null`, so
`?lane=` holds the ladder as on main (sitting 25's low mended).
switch-reader, draw-lanes, off-ramps 9/9, strip-slices 24/24,
frame-pacer 127/127. Lows:
- glint.js:519, lightFx.js:41: `?sheen=0.5` (a value with a tail)
  matched the old `\b` regex and turned the shine off; now ignored;
- bare `?lane` now holds the ladder (framePacer.js:327; said in the PR).

## O #1974 (5233): the thirty lane's step

READY with lows. Sitting 25's hold is mended: projectiles.js steps every
own and monster projectile through `_combatDt` (`COMBAT_DT_MAX` 3), so
`_segGap`'s 200 px sweep and the 260 px trail guard hold; the dash keeps
`DASH_MAX_STEP_PX`; monsterCombat, groundLoot and visualSystems use
`_dtScale` only for distance gates and eases; the worker's move check is
a rate (500 px/s), which a longer step does not beat. `?dtsmooth=0` is
the old clamp again (50 ms). frame-clock 28/28. Lows:
- visualSystems.js:306: a PEER's arrow copy still steps by the unclamped
  `_dtScale`; on a 100 ms hitch a Longshot copy (~48 px) steps 288 px,
  past effectsRenderer's 260 trail guard (:7514 -> :8008): its streak
  blinks for a frame. Cosmetic (the worker settles a peer's hits);
- frame-clock §9g reads source text only: `_combatDt` with its clamp
  removed still passes;
- `50 / 16.667` is 2.99994, not main's literal 3 (0.002% of a step).

## O #1977 (5680): #1952's lows, said

Card check: a ledger row (`hairClip.js` `_selfOff` in `src/state/look.js`),
words (self-test spec, mp-selftest header, PROGRAMS' clip `back`, LANES.md)
and O's second block in `tag-blocks.json` (`[5680, 5699]`, `nextBlock`
5700). No behaviour change. Stacked on #1974 (1f6801c0); listed third.

## T #1978 (5311): `pageAddress()`

READY with lows (reviewed at 59975b74; 5a2d3ff4 merges main 3ac8691f).
`pageAddress()` reads `location.search` fresh each call, caches nothing,
`''` with no page; every site caches where it did before; no worker entry
reaches switches.js (inside a worker `location.search` would be the
script's own address); switches.js imports nothing. Guard check 5 fails
on four of five breaks tried (lower-cased, decoded, `'?'` with no page,
cached). Lows:
- "fifteen sites" in T.md and switch-table.md: the diff moves 17 reads in
  16 files (tapJump.js two; 201 - 184 = 17);
- wheelTrial.js:342: `let search = '';` then `search = pageAddress();`.
Held for sitting 27 by the conflict with #1970 only.
