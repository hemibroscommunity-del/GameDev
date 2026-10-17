# Your party on the maps (v2.3.3277)

The owner, 2026-10-16, on the list of what could be built next: "Yes do
suggested" -- the second item, the party's long-standing follow-up
(docs/ARCHITECTURE-HANDOFF.md item D, "same-zone member arrows / map
markers").

## What was wrong

Both maps drew every other player as the same green dot. A party member was
one dot among the crowd in BroTown, and once they walked off the minimap's box
there was no telling which way they had gone. The world map drew nobody at all
until zoom 1.5.

## What it does now

`src/game/partyMarks.js` (no imports) has the rule; the three maps draw it.

- **The Wheel's minimap** (`src/rendering/systems/wheelMinimap.js`): each
  member in the party's blue -- the UI's Info blue, `#5D93D2`
  (docs/LANTERN-SLATE-SPEC.md) -- 15 px where a bro is 13, ringed light
  (`#F7F2E7`) and then dark, so it reads on every land's colour, frost's pale
  blue included. Drawn over the bros and the monsters, never also as a green
  dot. A member OFF the box rides the box's inner edge on the line from you to
  them, 11 px -- the quest star's own clamp (`clampToBox`), so walking toward
  the mark walks toward them. The rims are a Graphics redrawn only when a mark
  moved, came or went (each redraw rebuilds the scene's draw list).
- **The world map** (`src/ui/WorldMapOverlay.jsx`): each member in the same
  blue at EVERY zoom (the other bros only from 1.5), named under the mark in
  pale blue, right after your own "You"; the key says "party" while one shows.
- **The dungeons' and the farm's small box** (`minimapRenderer.js`, 52 px):
  blue with the same rim, over the monsters. There the townsfolk are a blue of
  their own (`C_NPC`), which the rim tells apart. This box is too small for
  marks on its edge, so a member off it is off it.

A member in another zone (a dungeon you are not in, their farm) is on no map;
the party window says where they are.

## Why nothing new is sent

Presence v2 (v2.3.3250, server/src/tick.js `rosterPlanFor`) already sends a
phone its party WHOLE on every roster, about once a second, wherever they are
-- near ones are on every tick anyway. A far member's mark glides between
rosters along their last speed (`peerDotAt`, src/game/peerDot.js), as the
world map's far dots do. Against an older roster (no `pres: 2`, or the kill
switch `presence2: false`) a far member still comes in the slim roster with
their place and zone, so the marks work there too. No worker change, no caps
flag: an older worker's party_state has the same shape.

## Tests

- `server/test/party-marks.test.mjs` (19): who counts as your party (never
  yourself, only an open party), the edge clamp on every side and corner and
  never past the edge (2,000 marks), and that each map uses them.
- `node tools/qa/mp/run.mjs partymap` (7): a real phone in BroTown and a bare
  socket in a party -- beside you the mark in the box at 15 px; 3,000 px east on
  the box's east edge, level with them, at 11 px; the world map at zoom 1
  drawing and naming them with "party" in its key; leaving the party takes the
  mark away; a second phone in today's town sees a green dot turn blue and back.
  Its screenshots are `tools/qa/mp/out/partymap-*.png`.

## Not done

An arrow at the edge of the SCREEN pointing at a member off it (the backlog's
"member arrows"): the minimap's edge mark does that job for now.
