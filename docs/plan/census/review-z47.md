# The gatekeeper's review, sitting 47 (card Z; tag 6261)

Taken 2026-11-18 on `main` e898c0c7 (sitting 46's list fully merged, its
docs PR #2196 included). The PRs and heads came from the planning session
(session_01LccHam7XmUNAHQrA1CjiNH) at about 09:45 UTC; the cards sent
their new heads as they mended. Tags bare.

Reviews in full (`server/` or `src/`), by the angles of `/repo-review`,
each finding put to its own disproof against the code: HB #2199, #2201,
#2202; FX #2194 (a verbatim proof), #2200, #2203 (a verbatim proof of its
two moves, then its seven keeps). Documents and tools (step 3): TL's
#2197 (folded into this PR and closed).

## Findings

### HB #2199 (6241), #2201 (6242), #2202 (6243): none blocking

- #2199: the window's size kept (`playViewport.js` `winVw`/`winVh`) and
  cleared only by a resize, a turn or a visual-viewport change the
  BROWSER sent (`isTrusted`); the band's own resize marked `btBand`
  (`bandResize`), which neither the play column's sizes nor
  BottomDashboard's sheet heights clear on. `?playvwlive=1` (the existing
  switch) measures every read, as before: no new switch row. Nothing a
  player sees changes: every reader got the same number, read later.
  Low: on a band resize the play column's shell sizes now come from the
  ResizeObserver (told after layout) instead of a measure in the tap; a
  listener of the band's resize that reads `playVw()` before the observer
  reports would read the old shell size IF the band moved `#root`. It does
  not today (the band moves neither the window nor `#root`; the
  computer's wide class sends its own unmarked resize, which clears).
- #2201: `__btGpuMb`, the chip's total alone, the same sum by the same
  rule (`gpuSourceBytes`, shared with `__btGpuTex`); the field report
  reads it, `__btGpuTex` where it is missing. An error reads as 0, as
  before.
- #2202: the pacer's `memCount` reads the same total (every 5 s while the
  governor judges); `frame-pacer.test` 23c widened to accept it (the
  planning session's one-off yes, named in the PR), the fine-pointer gate
  still held. DEPLOYS (a file in `server/test`).
- HB's merge of #2199's last head into #2201 and #2202 (09:56) changed no
  file but HB's status: the trees are the ones CI tested.

### FX #2194 (6221): none blocking

- Verbatim: every line removed from `effectsRenderer.js` is in the
  leaves byte for byte but the `export` and the imports (86 removed, 88
  added: the 16 that differ are headers and import lines). No name left
  dangling in the renderer (`msgLines`, `getLookPartFrames`,
  `lookPaletteWanted`, `peerGarb`, `PILE_R` now read only in the leaves).
  `held-sweep.test` 9 re-keyed to the leaf: DEPLOYS.
- At 9f827898 FX merged `main` (with #2190) in and re-generated
  M-tables.md; base retargeted to `main`.

### FX #2200 (6222): none blocking

- The ore rocks read as colour numbers the trees' way (`paletteLoad.js`,
  `?treenumbers=0` the pictures) and now waited on behind the loading
  screen (`_fxPreload`), where before they loaded unawaited; the three
  projectile sheets read from 256-colour twins (`p256.js` PROJ_SHEETS,
  `?p256=0`). No new switch row (the planning session's answer).
- No CPU read of the rocks' or the sheets' `source.resource`: the
  shatter cuts through `drawSourceRect`; `mp-tierore` reads the file by
  the source's label. The stat scene's bolt is a page `<img>`, not a Pixi
  texture: untouched.
- `buffers` 24.2 -> 24.8 RAISED, `artCache` 13.4 -> 11.2 measured (net
  1.7 MB less), the MB in the PR body and the header; `artCache`'s line
  stays 79.3 (the frame pacer's copy waits for the owner). Decided for
  the owner while away (the planning session's yes).
- At 5cd685bf: `main` and #2194 merged in, base `main`; its code delta
  over #2194 is byte for byte the one reviewed at f956bb89. Nothing in
  `server/` beyond #2194's: does not deploy on its own line.

### FX #2203 (6223): none blocking

- `makeBeamTexture`, `makeMoteTexture` and `MOTE_TEX` moved verbatim to
  `effects-economy.js`, then each of the seven minted pictures kept as an
  image (`keepAsImage`). The beam and the mote stay in `_gpuWaiting`:
  if the image lands first, `emptyOnceDrawn` drops the source (an
  `<img>` has no `getContext`: `keepOnGpuOnly` refuses it); if the canvas
  is emptied first, `keepAsImage` sees the size changed and keeps nothing
  (as before). `canvas-pictures` 49 -> 41 (the row by `--write`).
- Opened with its base on #2200's branch: retargeted to `main` before it
  is merged (FX asked, 10:40).

## The rehearsal (main e898c0c7)

Each line merged into `main` with every line above it (a merge commit, as
GitHub's); the merge bases counted at each step (`git merge-base --all`);
the tree after that merge.

| line | PR | head | tree after | bases |
|---|---|---|---|---|
| 1 | #2199 | `3853e35b64` | `45118863a1` | 1 |
| 2 | #2201 | `3ccd2d5905f8535cd8ca602965874cb9bc823bd7` | `855b113a02` | 1 |
| 3 | #2202 | `f93c531f6ccc534c0f136370e3a033a883b9047e` | `fb3312ade9` | 1 |
| 4 | #2194 | `9f82789856863add0df3f38095c9c64194cbb798` | `2fbada07ad` | 1 |
| 5 | #2200 | `5cd685bf88228535dda090dae0fc1bbb84b7ce7d` | `995aca004b` | 1 |
| 6 | #2203 | `39612de311c0a98217a573a7887c6312d05134cf` | `d6a51bf492` | 1 |

## The checks on the whole

- Lines 1-3 (`node tools/dev/gatekeeper.mjs`, tree `fb3312ade9`): build
  green; `questline` 187 of 187 (478 s); precheck past the tool's own
  15-minute cap (the server suite alone takes about 12 here), so:
- precheck on lines 1-5 (tree `995aca004b`), uncapped: OK TO PUSH, 0
  FAIL (server-tests: every suite green; eslint clean; cap-registry,
  look-parity, plan-status green).
- Line 6 on top (tree `d6a51bf492`): `canvas-pictures`, `four-lines`,
  `frame-steps`, `render-tables` green; M-tables part 5 current but for
  its commit stamp.
