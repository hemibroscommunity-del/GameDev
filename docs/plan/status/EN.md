card: EN
branch: claude/plan-en-deathshadow (6209)
prs: 6209 (a dying monster's shadow under its feet) opening as a draft
state: working

## Done

- Earlier PRs of card EN (6200 to 6208): merged or with the gatekeeper.
- 6209 (card EN-deathshadow, the owner's bug of 11-27): the skeleton's
  death shadow hung ~110 px under it. CAUSE: the shadow is cast from the
  frame's cell bottom (less the look's at-rest `feetRow`); a death strip is
  cut at its own scale and place, the skeleton's first frame ending on row
  126 of 256. MEND: a dying body's frame says its own ground, its lowest
  painted row, read by the strip packer's existing scan (`trimRules.js`
  `by`, `stripPack.js` `feet`, `zoneTextures.js` `__btFoot`), shown through
  `src/game/frameFoot.js` `showDeathFrame` and asked by
  `lightfx/casters.js`. `mp-deathshadow` red on main (worst 103 px), green
  on this; the sample of seven look families green; suite `frame-foot`.
  Spec `docs/specs/death-shadow.md`.

## Next

- (card EN's lines done once 6209 lands).

## Found

- The skeleton's death picture rises about 70 px before its bones fall (the
  art, `public/sprites/monsters/skeleton/death.png`): not moved.
- The storm eye's death frames rise as it breaks up (row 229 to 166): its
  shadow follows them up now.
- (from 6200-6207, still true) the belt's gear sheet first built on the page,
  gearSheets.js `getGearFrame > buildSheet > _buildShirtOnWorker`.

## Needs

- (none). The orchestrator: part 35 (session_01LccHahcg6Af8HVwCqF2XRV).
