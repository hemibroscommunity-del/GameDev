# The owner's recordings of 2026-10-27 (v2.3.3664)

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

## v2.3.3680: the roll is their "goblin fall"

The owner, 2026-10-27: "I'll just uploaded a sound effect to use for that
included in the label is 'kneeling goblin'" (for the roll). The file is
`assets/sfx-source/2026-10-27/502553__kneeling__goblin-fall.mp3`, kept as
supplied.

- **Cut** by `tools/audio/cut_owner_sounds.py` like the others: the
  `roll-tumble` row, 0.86 s, with half its weight of its own overtones laid
  over the thump (`harm: 0.5`, the heartbeat's way), so a phone's small
  speaker hears it. That gives `public/sfx/player/roll-tumble.mp3` (7 KB) and
  its row in the GENERATED `src/data/ownerSoundClips.js`, levelled to 0.55 of
  a hit. It decodes on the loading screen with the other short sounds
  (SFX_MANIFEST, at 24 kHz).
- **Where it plays** (the cue `rollTumble`, `src/data/eventSounds.js`):
  - your dodge roll;
  - a retreat shot's roll, which was silent for you (`src/game/dodge.js`);
  - another player's roll or retreat shot, at their share
    (`src/networking/gameEvents.js`).
- **What keeps the rush of air** (`dodgeRoll`): the sword's dash and the lunge
  (a dash is not a fall). A blow you dodged keeps `dodged`.
- **Measured** by `mp-cuelevels`, as the game plays it: 0.55 plain, 0.48 by
  ear (promised 0.55); its peak clear. Check 5's "rush of air" list is
  unchanged: the roll is a body now, not air.
- The Sound Studio lists it with the fight's sounds, with its recording's
  chip (`src/data/soundStudio.js`). CREDITS.md has its row, its license still to
  **CONFIRM** like the rest of this batch.
- `sound-cues` §15 (four checks) pins the clip, the cue, the three places it
  plays and the dash's rush.

**Not done: headwear on the roll.** The roll is a somersault of 9 frames a
facing. Hair, hats and glasses are hidden through it (the dodge pose,
`entityRenderer._placeTrait`). Showing them means measuring where the head is,
and how far it is turned, on each of the 18 frames. Each piece would then be
drawn turned to match: a day or so, not a quick change. It is the owner's call.

## v2.3.3708: the jump is their "hup"

The owner, 2026-10-28: "File with 'hup' is the jump, goblin fall is just the
label of the file I want to use for when the character's jump lands, and the
jump flip noise is the sound I want to play when and if you activate the
double jump." The landing and the flip came first (#1170, #1167); the hup was
not in that upload. It came later the same day:
`assets/sfx-source/2026-10-27/613568__mrdeadh__hup.mp3`, kept as supplied.

- **Cut** by `tools/audio/cut_owner_sounds.py` like the others: the `jump-hup`
  row, 0.19 s from 0.025 s (the file decodes to 0.22 s: the voice's onset at
  0.03, its loudest 0.05-0.07 s, under -43 dB by 0.13). A voice: 55% of it
  under 400 Hz but none under 100, so nothing is laid over it, and nothing
  above 12 kHz, so 24 kHz. That gives `public/sfx/player/jump-hup.mp3` (2 KB)
  and its row in the GENERATED `src/data/ownerSoundClips.js`, levelled to 0.45
  of a hit. Every other file the tool writes came out byte for byte.
- **Where it plays** (the cue `jumpUp`, `src/data/eventSounds.js`): your jump's
  push-off, over the footstep it already plays (`src/game/jumpActions.js`), and
  another player's jump at their share (`src/networking/gameEvents.js`,
  `player_jump`). It was a rush of air, the arrow's flight a touch lower and
  slower than the bow's shot (v2.3.3523).
- **Measured** by `mp-cuelevels`, as the game plays it (its PROMISED 0.45). The
  jump moved from check 5's "rush of air" list to check 6's voices: a voice is
  low but not a thump.
- The Sound Studio's line says "Your jump: your "hup"", with its recording's
  chip. CREDITS.md has its row, its license still to **CONFIRM**.
- `sound-cues` §17 (three checks) pins the clip, the cue and its two places,
  and the labels.

