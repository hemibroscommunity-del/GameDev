# A weapon named by its id, never by its place (v2.3.5196)

Grand plan step 11.3, step 3; card K PR 11. Until now a phone named a weapon
in its stash by its place (`stashIdx`, `idx`, `stashIndex`). A place moves:
a weapon sold, picked up, or taken in another tab shifts the rest, and a
request sent while it moved acted on the NEXT weapon. Card R's weapon id
(`gid`, v2.3.5282) names a weapon for good.

## What reads it

`server/src/gidnames.js` `_gidPlace(ps, place, gid)`, the one reading, in the
nine handlers that take a weapon from the stash: `sell_weapon` and
`equip_request` (`gear.js`), the market's sell order (`market.js`), the
store's weapon listing (`store.js`), `amulet_forge_request` from the stash
(`amulet.js`), `trade2_stage_weapon` (`trade2.js`), `smith_salvage` and
`essence_apply` (`salvage.js`), `reveal_item` (`revealbag.js`).

- **With an id:** the weapon with that id, wherever it is now.
- **With an id and a place that disagree, or an id no weapon has:** refused,
  by each handler's own "no weapon there" answer (one past the end of the
  stash). Nothing acts on a weapon the player did not tap.
- **With no id** (an older phone): its place, as before.

## The page

The action door (`src/game/actions.js` `GID_PLACE`) adds the id of the weapon
at the place each of the nine sends, read from the same stash the tap was
drawn from, against a worker that says it reads it (`caps.gidnames`). No
panel changed.

## The switch

`gidnames: false`: the place alone, as before, and the cap goes.

## What holds it

`server/test/gid-names.test.mjs` (its break proof in its header).
