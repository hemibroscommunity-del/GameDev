# Wind Dunes depth: smaller and slower going north (v2.3.2745, v2.3.2775)

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
- **Preview switch (step 1 only):** off by default, so merging step 1 changed nothing for players.
  - Turn it on with `?depth=1` in the page URL.
  - Or run `window.__btDepth = true` in the console (`false` forces it off).
  - Step 2 changes this: the curve is now on whenever the worker says it measures in it (see "Turning it on" below).

## Step 2 — the server measures in the curve too (v2.3.2775)

The worker's monster AI now multiplies every flat distance by the same curve, read at the monster's own feet. The helper is `_depthK(zoneId, y)` in `server/src/depth.js`, and the curve is a copy of the client's row in `server/src/data.js` (`ZONES.sky.depth`).

| What | Flat zone | Wind Dunes north edge (×0.42) | Where |
|---|---|---|---|
| Notices you (aggro ring) | 120 px (snowman 300) | ~50 px | `_tickMonsters`, `effAggroRange` |
| Stops and swings (attack ring) | 72 px | ~30 px | `_tickMonsters` `_atkRange` + `_basicAtkGeom` (paired) |
| Chase step, knockback repay | `m.spd` per tick | ×0.42 | `_tickMonsters` |
| Wander step / leash | 30–80 / 180 px | ×k at the spawn point | `_tickMonsters` wander |
| Monster spacing | 22 px | ×k | separation pass |
| Throw band (snowman, slime) | 100–300 / 70–220 px | ×k | `_rangedCfg` |
| Telegraph cast range + ring | 150 / kit radius | ×k, ring remembered in `_tgRadius` | `telegraph.js` |
| Slime death burst ring | 110 px | ×k, remembered in `_burstR` | `telegraph.js` |
| Knockback shove (+ debt cap) | 30 / 45 / 60 px | ×k | `combat.js` |

- **Rings on the ground:** the telegraph and burst rings are sent in `monster_ability.radius`, so the client draws them at the scaled size with no client change.
- **Every other zone is unchanged:** each site multiplies by `_depthK`, which is exactly 1 anywhere without a `depth` row (`zonedepth.test` pins this).
- **Left unscaled on purpose:**
  - the sticky "you shot me" aggro (1200 px, anywhere on screen);
  - the snowball's 40 px landing tolerance, which covers network drift, and drift doesn't shrink with distance;
  - damage;
  - anything player-to-player;
  - the server's movement anti-teleport cap, which bounds speed from above, while depth only ever slows.
- **Collision on the client:** a monster's body disc (`_monBody` in BroTown) and your own half-size in that contact test are scaled by the same curve. Otherwise a full-size body at the north edge would hold you outside the monster's shorter reach, which is the v2.3.1409 snowman bug rebuilt by perspective.
- **Turning it on:** the worker advertises `caps.zoneDepth`. The client draws the curve whenever the worker claims it (`setZoneDepthLive`, called from wsClient's `state_sync` handler), so no `?depth=1` is needed.
  - `?depth=0` in the URL forces it off, and `?depth=1` forces it on against an older worker.
  - `window.__btDepth` still overrides both.
- **Deploy order:**
  - A new client with an old worker gets no cap, so the dunes draw flat as before.
  - An old client with a new worker draws full size while the monsters measure small. They reach a little shorter than they look, never further.
- **Kill switch:** put `zoneDepth: false` in the `liveflags` storage key. That turns the server scaling off (`_depthK` returns 1) and removes the cap from the next join, so clients stop drawing the curve. No deploy is needed.

## Your reach shrinks with you (v2.3.2775)

The owner said: "Yes fix my reach." Every one of your own reaches now multiplies by the curve at your feet (`depthK(zoneId, y)` in `src/data/zones.js`, which returns exactly 1 off the dunes). A monster's body offset and radius use the curve at its feet.

| What | Where |
|---|---|
| Sword swing reach and the engage test | `monsterCombat.js` `_mRm`, `_engSwing` |
| Monster body offset and radius in your hit test | `monsterCombat.js` `_hitMk`, `_eMk` |
| Arrow range (`_rangeMult`), the sight line, staff orb life, and the special's orb range | `monsterCombat.js`, `dodge.js`, `playerActions.js` |
| Swinging at NPCs and players, and the PvP range you claim (the worker honours `min(claim, 250)`, so claiming less is always safe) | `monsterCombat.js` |
| Dash stop distance and step size | `BroTown.jsx` (`_bdk`) |
| Reach ring, aim preview and bow sight stream | `effectsRenderer.js` |
| Ability FX rings | `abilities.js` |
| Server: the whirlwind and bash scan circle, the gather ring (`pullTo`), and ability knockback | `server/src/abilities.js` |

- **Left flat on purpose:** the server's closing `reach` for a declared dash or bash target. It caps how far the client's dash may carry you (`DASH_MAX_REACH_PX`), which is a travel limit, not a hit circle.
- **Left flat on purpose:** the server's generous 400 px melee sanity bound.

## Not built yet

- **Step 3:** an exit at the north edge into zone 2. The owner said to hold it.

## QA

- **Server:** `server/test/zonedepth.test.mjs` (28 checks) covers:
  - the curve, and lockstep with the client row;
  - the paired rings;
  - on the north edge: a 45 px gap is a chase, a chase settles at the scaled ring, a swing from inside the scaled ring lands, and 90 px is not noticed;
  - the south edge behaving like a flat zone;
  - the caps advertisement and the kill switch;
  - your whirlwind's circle and gather ring scaling on the north edge but not the south (v2.3.2775).
- **Browser:** `node tools/qa/mp/run.mjs dunedepth` (16 checks) covers:
  - with the curve forced off, nothing changes;
  - the curve drawing with no override because the worker advertises `caps.zoneDepth`;
  - your drawn scale at the south and north edges;
  - every monster's scale against the curve;
  - a far plate staying at least about 12 CSS px;
  - walking speed in the north against the south, read from the speed the movement step computed rather than the distance covered (v2.3.2775). Distance readings were fooled by a walk that crossed the zone exit, and by monsters blocking the row;
  - the World View still being the only zone with `playerScale`;
  - your reach ring beside a far monster being the flat reach times the curve, with ring = reach + the smaller body (v2.3.2775).

The screenshots are `tools/qa/mp/out/dunedepth-{south-on,north-on,north-off}.png`.
