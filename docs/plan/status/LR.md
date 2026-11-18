card: LR
branch: claude/plan-lr-1-guard
prs: (6360) working
state: working

## Done

- (none merged yet)

## Next

- PR 1 (6360): tools/guards/layout-reads.test.mjs, lib/layoutReads.mjs
  (the scan), lib/layoutReadsKnown.mjs (the frozen list): 365 reads listed
  in 72 files (391 found: 22 in the 4 measure helpers, 4 in a
  ResizeObserver's callback). About a second.

## Found

- The card's "about 190 reads in 65 files" counted fewer kinds: the guard
  also counts scroll sizes (scrollTop/Height/Width/Left, 39) and every
  querySelectorAll (24); comments and strings are never counted.
- `fixedBox` (src/ui/fixedBox.js) is not a measure cache: it measures the
  layer (getBoundingClientRect) on every call. Its reads are list rows, not
  an approved way. The kept ways are playViewport.js `_dims`/`_win`
  (playVw, winVw), mayorScreen.js `canvasBox`, doorPrompt.js
  `placeOverHeadNow` (after the paint), and a ResizeObserver's callback.
- No general "measure after the paint" helper exists in src/ (doorPrompt's
  is the door prompt's own): a `measureAfterPaint(el, fn)` would be HB2's.
- Precheck needs no line: a tools/guards file runs by itself (run.mjs).

## Needs

- Nothing.
