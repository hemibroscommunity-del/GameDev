card: FX
branch: claude/plan-fx-1-effects-leaves
prs: 6220 (working)
state: working

## Done

- (none merged yet)

## Next

- 6220: effectsRenderer.js's 42 level-0 leaves (the census at 5ea5c7d5)
  moved verbatim to src/rendering/leaves/effects-<system>.js (7 files:
  look, skills, combat, render, ui, social, economy), with the 13 lone
  constants only a leaf can read there; 55 statements, each byte for byte
  (scratch check). four-lines green (9790 -> 9467 code lines), the two
  censuses re-written, build green.

## Found

- (none yet)

## Needs

- Asked the planning session (once): the suites outside the card that
  read a moved leaf in effectsRenderer.js's text, and the constants that
  moved with their leaves. See the message of 2026-11-18.
