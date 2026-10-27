# The mummy's roar (v2.3.3621)

The owner's list of 2026-10-26 (docs/OWNER-LIST-2026-10-26.md, item 17):

> Mummies: today a 48 px shove when they hit. Then: a roar, wound up so you can
> see it coming, that blows you back from a few steps away.

## What a player sees

Every mummy of the Wind Dunes (and of the Buried City) now has a second move
besides its swing. When you are within 150 px of it and it is ready:

1. It plants itself and winds up for one second: "ROAR!" over it, a sand-coloured
   ring on the ground showing how far the roar reaches, the gust swirling round
   it (the element wind-up, v2.3.3619), its body throbbing, and its roar (the
   owner's dragon roar, a fifth higher and cut short).
2. Then it roars: everyone still inside the ring takes half a hit and is blown
   130 px straight away from it (its swing's shove is 48), with the wind's icon
   on the number and the wind streaks round them.
3. Eight seconds before it roars again; it swings as before in between.

How to beat it: step out of the ring while it winds up (a miss), roll through it,
or raise a shield facing it (blocked: no damage, no shove).

## How it works

- A KIT BY ELEMENT (server/src/telegraph.js `TELEGRAPH.ELEM_KITS.wind`): the
  mummies are three archetypes (stalker, hexer, volatile, re-skinned), and a
  hexer in the Workshop's dungeon is no mummy, so the roar belongs to the wind,
  not to an archetype. `_kitFor(m)`: an archetype's own kit first (the brute's
  slam, the fodder's lunge), else its element's.
- The telegraph machinery the slam and the lunge use: `monster_ability` with
  `ability: 'roar'`, `phase: 'telegraph'` (radius 150, 1000 ms), then
  `execute`. No damage while it winds up; the monster stands still.
- At the roar, EVERY player within the ring, measured where each one is then
  (the slam and the lunge hit only the one they chose), goes through the kit's
  row of the one hit door (hits.js): a shield facing it blocks it, a roll or a
  rock is a miss, the safe ground and the harvest shield as ever, the
  no-one-shot rail.
- The shove is the mummy's gust (monsterstatus.js), longer for the roar: the
  monster carries `_gustPx` 130 and `_gustMs` 420 for that one blow; the worker
  grants the room for it (`_gustLeft`, up to the shove and a quarter), so the
  move check never snaps you back.
- The phone carries the shove out as any gust (`kb`, `stMs`), within its 200 px
  ceiling.

## Kill switch

`mummyroar: false` in the live flags: no roar; the mummies swing as before. A roar
already winding up when it is thrown ends quietly.

## Tests

- `mummy-roar` suite (22): who roars (every Wind Dunes monster; a brute keeps its
  slam; none with the switch off); the wind-up (its ring and length, nothing
  dealt, planted); the roar (everyone in the ring blown 130 px straight away
  over 420 ms for half a hit, one outside nothing, the room granted, the
  cooldown); a shield blocks it, stepping out misses it; the swing still shoves
  48; the switch mid-roar.
- `mirror-audit`: the phone has a label, a colour and a shake for the roar.
- `sound-cues`: the roar's cue has its label in the Sound Studio.
- `mp-elemhits` (a phone, a real mummy): it roars and blows you back 130 px, and
  the worker agrees where you landed.

## v2.3.3634: what the review found

Found by the review of v2.3.3621 (the worker's own code, run):

- **The ring was round the wrong spot.** The phones draw a wind-up's ring at
  its `ax`/`ay`, which every kit sent as its target's feet, while the roar
  reached everyone round the mummy. A player 100 px behind the mummy, outside
  the drawn ring, took the roar. Now an area kit (`aoe`) aims where it stands:
  its `ax`/`ay` are the mummy's place as it winds up, and the roar reaches
  exactly that ring, even if a blow nudged the mummy mid-cast. Every phone
  already deployed draws it right, with no client change.
- **A mummy killed mid-roar roared at its spawn.** The respawn cleared the basic
  swing's wind-up but not a kit's, so a monster killed during a wind-up came back
  with its phase still `telegraph` and the next tick fired the cast with no
  warning: half a hit and a 130 px shove for whoever stood by its spawn, 6 to
  19 s later. The gap existed for the brute's slam since v2.3.1730 (a stray
  "MISS"). The roar plants the mummy next to the players hitting it, so it was
  often killed mid-cast. The respawn now clears a kit's wind-up too
  (index.js, beside `_bwUntil`).
- **A blocked roar read "MISS".** The roar counted a player only when it took
  HP, so a roar every shield in range blocked sent `hit: false`. It now counts
  everyone it reached and did not miss, as a single-target cast's `hit` does.

`mummy-roar` §6 (six checks, each failing on the build before).
