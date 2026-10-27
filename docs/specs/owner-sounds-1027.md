# The owner's recordings of 2026-10-27 (v2.3.3653)

The owner uploaded eleven Freesound recordings on 2026-10-27, and said where
each one goes:

> You can add more sound effects for farming (closing the loop on my earlier
> comment). I added the sounds to GitHub. One additional sound I'd like to use
> for blacksmithing label includes "flat-hoe" the other hoe sound is for when
> you till the dirt. There's a clay sound for molding the ground (apply
> fertilizer)
>
> Also just added a sound for wood carving (making bows, staffs, etc) and doors
> opening ("entering" town buildings).
>
> Also the "hmmm" sounds you have for NPCs should play when you begin talking
> to someone or taking a quest (other than the lil bro). I'll get a sound
> effect for him
>
> Ok just added the sound for lil bro "hmm" includes label on GitHub
>
> Added more sounds to GitHub. Light fire (when lighting a fire), coins (during
> pickup), and the last sound is when any object gets picked up and placed in
> your bag.

The files are kept as supplied in `assets/sfx-source/2026-10-27/` (v2.3.3643
moved them there from the top of the project, where they broke the server
suite). Their README names each.

## Where each one plays

| The owner's words | Recording | Plays |
|---|---|---|
| "the other hoe sound is for when you till the dirt" | hoe-work (16hpanskadvorakova_aneta) | Digging a bed on your farm: each strike of the hoe, three strikes in turn (`farm-hoe`, game/farmWork.js `farmBeatPlay`) |
| "a clay sound for molding the ground (apply fertilizer)" | molding (manuelaurreaf) | Fertilizing a bed: the clay squeezed in, two squeezes in turn (`farm-mould`) |
| (a watering can) | grab & can watering (wyronroberth) | Watering a bed: the can's pour as the water reaches the soil (`farm-water`) |
| (a harvest) | harvest cozy game sfx (heyheytheree) | A crop harvested: the soil giving and the harvest's pop, on the worker's answer (cue `farmHarvest`) |
| "flat-hoe" for blacksmithing | flat-hoe (theboulder3400) | The forge's hammer: a bar smelted (`smelt`), a blade forged (`forge`, two blows), armour forged (`armourForge`), and the forge at work in town (`anvil`, three blows) |
| "wood carving (making bows, staffs, etc)" | wood-carve-5 (frostnox) | The Woodworker's knife: a bow or staff made (`woodwork`, three strokes), hardened wood (`hardWood`), traps (`trapsMade`) |
| "doors opening ("entering" town buildings)" | door open sfx (mavom22) | Every way into a building: a town building's door, the farm's sheds, the Workshop (cue `door`, BT_AUDIO.enterBuilding). A dungeon's mouth is a cave and keeps the old knock of wood (cue `caveMouth`) |
| "Light fire (when lighting a fire)" | light-fire-sound (wdomino) | The fire catching as your campfire appears (cue `campfire`); the flint's strikes still start the light |
| "coins (during pickup)" | coins-05 (anthousai) | Picking up coins, on the worker's credit (cue `coinsPickup`, wsClient `_applyLootCredit`). A sale, the market and the den's wins keep the spilled coins |
| "when any object gets picked up and placed in your bag" | closebag (triqystudio) | Anything landing in the bag: a harvest's prize after its flight, a crop, and every pickup that is more than gold, a beat after the item's own note (cue `bagIn`) |
| Lil Bro's "hmm" | hmm (roses1401) | Lil Bro's own voice (cue `lilBroHmm`, game/npcVoices.js) |

## The townsfolk's hums

Until now a townsperson hummed in three places: when a talk opened, when a quest
was taken (the quest panel's subject is the quest and its status, so taking it
is a new subject), and every time a line of his popped up over him as you walked
past. In town, with eight of them, that was a hum every few seconds. Those are
the hums the owner was hearing at no moment of theirs.

Now:
- A talk opened and a quest taken hum, as before.
- A keeper opening his building hums too: a tap on him (`'opens'`) and E
  (desktopControls). Neither did before.
- A line popping up over a townsperson is quiet (`npcChatter` is gone).
- Lil Bro speaks in the owner's recording. Before, he had the man's highest hum,
  pitched up 1.32x.

## How they were cut

`tools/audio/cut_owner_sounds.py`, the cutter of the owner's earlier recordings.
Its table "THE OWNER'S RECORDINGS OF 2026-10-27" has the windows, and its notes
say why each was cut that way. Nobody listened: the windows were MEASURED.

- **How the windows were picked.** A 10-20 ms loudness envelope gave each
  sound's onset and its fall back to the room noise. The strikes of the hoe
  and the hammer were found by their onsets: fourteen of the hoe, 0.78 s apart,
  of which the three loudest are kept; seven of the hammer, of which three are
  kept.
- **The bands.** Each recording was split into frequency bands (energy per
  band):
  - The coins are 98% above 6.4 kHz, and 47% above 12.8 kHz. They are kept at
    48 kHz (24 kHz would lose half of them), and so is the hoe's chink.
  - Most of the bag (46%) and of the clay (94%) is rumble under 100 Hz that a
    phone cannot play. Both are high-passed (150 and 300 Hz), so their level is
    set by what is heard.
  - The fire's flare is 85% under 100 Hz. It is kept whole with its own
    overtones laid over it, as the heartbeat's are, so a phone hears it.
- **The levels.** Each was set against a melee hit (1.0), from what played at
  that moment before (measured the same way):

  | Moment | Before | Now |
  |---|---|---|
  | Coin pickup | 0.87 | 0.75 |
  | The bag | 0.31 | 0.4 |
  | The door | 0.68 | 0.7 |
  | The fire catching | 0.48 | 0.8 |
  | A strike of the hammer | 0.61 | 0.6 |
  | The knife | 0.91 (the plane) | 0.5 a stroke |
  | The harvest | 0.6 | 0.7 |
  | The hoe | 0.21 | 0.4 |
  | The can | 0.07 (inaudible) | 0.3 |
  | The clay | 0.16 | 0.3 |

  The farm's work was the quietest thing in the game.
- **Re-running the cutter** gives every older file byte for byte. It was run
  before the new rows were added, to check: no file changed.

0.94 MB of sound decoded in all (measured file by file in a page), decoded on
the loading screen like every SFX_MANIFEST sound.  The memory check's sound
line goes 30 -> 32 MB: the 0.94 MB, and room the line did not have, since
main's own code read 28.9 and 30.0 MB of sound on two runs of the check the
same day (tools/qa/mp/memory-budget.mjs says so in its header).

## Licenses

Freesound could not be reached from the build machine (as for the footsteps),
and no search result named these licenses. Every row in CREDITS.md is
**CONFIRM**: someone needs to open each sound's page, `freesound.org/s/<id>/`.

The About panel credits every uploader by name, so a CC BY among them is already
attributed. **A CC BY-NC one must come out** (no NC, v2.3.2970).

## Checks

- `sound-cues` §14 (12 checks) pins each recording to its moment, its rate, its
  parts and its credit.
- §11za and §11za2 pin the hums: a talk, a quest taken, a keeper; never a line
  popping up; Lil Bro his own.
- `farmwalk` still holds every step to a sound.
- `mp-cuelevels` renders every cue through Web Audio and holds the new levels
  (its PROMISED table).
- `mp-ownersounds` 9b: a townsperson's line pops up with no hum.
