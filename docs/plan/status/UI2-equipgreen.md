card: UI2-equipgreen
branch: claude/plan-ui2-17-equipgreen
prs: (draft, opened with this push)
state: ready

## Done
- tag 6698 (6697 was taken on main by UI2-grip, the card's fallback): Gear's Equipped panel on a pale green ground (gearPanels.css `--u2-gp-equip-ground` #C6DCCD, its label in the kit's dark ink, 11.8 to 1), a worn picture 94% of its slot (Gear and Bro's Equipment showcase, `WornCell`'s `is-fill`); ON by default, `?equiplook=0` the old (src/game/equipLook.js; its switch row). Guard `tools/guards/equip-look.test.mjs` (E1-E5, 14 plants red); phone test `mp-equipgreen` (13 of 13 on the test box). Notes in UI-DESIGN-NOTES "Gear's two panels"; pictures `docs/shots/equipgreen-*.png`.

## Next
- Waiting for the four checks on the head; then the one ready message to the orchestrator.

## Found
- At 667 x 375 sideways (an iPhone SE turned), Gear's Equipped row runs past the page's right edge: the Gem cell is cut, with or without this change (`docs/shots/equipgreen-before-sideways.png`; gearGeometry.js / GearPanels.jsx short row). Not mended (outside the card).
- The dev kit's `what: 'shield'` put the Pine Shield in the bag, not on, for a fresh character (devtools.js; the comment says "only into an empty ps.shield").

## Needs
- The owner: should Bro's Equipment showcase be green too? And the green's hex (#C6DCCD) is theirs to change.
