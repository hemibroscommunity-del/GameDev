card: LR
branch: claude/plan-lr-3-refreeze
prs: #2226 (6360), #2245 (6361): merged; (6362) the re-freeze
state: ready

## Done

- #2226 (6360): the guard, tools/guards/layout-reads.test.mjs; its scan
  and its frozen list (lib/): 365 reads listed in 72 files. About 1 s.
- #2245 (6361): docs/specs/layout-reads.md, CLAUDE.md §7 line, §8 row.

## Next

- (6362) the list lowered after HB2's #2224 (365 -> 337, --write), as
  sitting 51 asked; then the card is done.

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
- Sitting 51: with HB2's #2224 merged the guard went red (reads moved to
  the frame's top). Now a `beforeDraw` callback (framePacer.js, CLAUDE.md
  §7's place) and the functions it calls by name are a way: merged 337/365.

## Needs

- Nothing.
