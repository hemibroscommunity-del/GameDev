# Wind Dunes depth: smaller and slower going north (v2.3.2745)

The owner asked: "can the player, monsters, etc follow a similar perspective pattern the more north on the map they get, and also slow the movement speed the further north they get to emulate travel distance. I'm thinking of desert winds zone."

The Wind Dunes art (`sky_v5`) is already painted with a horizon: the rocks at the north edge are drawn at about two fifths the size of the ones at your feet. This makes everything standing on the map follow the same curve.

## Step 1 of 3 — shipped here, client only, behind a preview switch

- **Where it's set:** the `depth` key on the `sky` zone in `src/data/zones.js`.

  ```js
  depth: { axis: 'y', near: 1, far: 0.42, curve: 1, preview: 'depth' }
  ```

  - Scale is 1 at the south edge and falls in a straight line to 0.42 at the north edge.
  - `zoneDepthScale(zoneId, y)` returns the scale. It returns `null` on any zone without a `depth` key, and while the preview is off.
- **What follows the curve:** `zonePlayerScale` returns the depth value, so everything already built on the World View's curve follows it for free:
  - your body and other players' bodies;
  - effect stand-ins, arrows and dodge ghosts;
  - dust prints and lanterns.
- **Monsters:** drawn at `MONSTER_SIZE_MULT × depth` at their own y, including their spawn grow-in and wind-up throb. Done in `_updateMonsters` in entityRenderer.
- **Walking:** speed is multiplied by the same scale (`vistaSpeedMult` in BroTown). At the horizon you cover about 0.42× the ground per second, so it takes real walking to get there. The anti-cheat caps speed from above only, so walking slower is always accepted.
- **Name plates:** they shrink with distance but never below 0.8 of their designed size (`PLATE_DEPTH_FLOOR`), so a far mummy's name is still readable.
  - Health bars stay the size of the body they belong to.
  - The World View is unchanged: its plates still shrink all the way.
- **Preview switch:** off by default, so merging this changes nothing for players.
  - Turn it on with `?depth=1` in the page URL.
  - Or run `window.__btDepth = true` in the console (`false` forces it off).

## What step 1 does not do (steps 2 and 3, not built)

- **The server still thinks in flat world pixels.** A far, small monster still chases, notices you and hits from full-size distances. The red wind-up circles on the ground are also left full size on purpose, because they show where the server will actually hit. This mismatch is why step 1 sits behind a preview.
  - Step 2 would scale monster speed, aggro range and attack reach by the same curve on the server, behind a `caps` flag. The preview could then become the default.
- **Step 3:** an exit at the north edge into zone 2.

## QA

`node tools/qa/mp/run.mjs dunedepth` (11 checks) covers:

- with the preview off, nothing changes;
- your drawn scale at the south and north edges;
- every monster's scale against the curve;
- a far plate staying at least about 12 CSS px;
- walking east–west in the north against the south;
- the World View still being the only zone with `playerScale`.

The screenshots are `tools/qa/mp/out/dunedepth-{south-on,north-on,north-off}.png`.
