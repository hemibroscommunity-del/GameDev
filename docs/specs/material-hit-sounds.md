# Hits sound like what they hit (v2.3.3001)

> Owner, 2026-10-03: "modify hit sound effects based on material type so
> hitting wood vs plants etc for props and also against monsters (arrow,
> melee, magic hit sound for snowmen vs slime etc should all sound like their
> material type). Same with when monster projectiles break on you".

## What changed, in one breath

- **Monsters.** Every hit on a monster used to be one of three samples: a
  low thud for anything soft (a slime, a fire goblin, a fishman, a bog lurker
  all sounded the same), a dry crack for bone, and a sword clang for stone.
  Now each material has a **voice**: a body and a texture laid together. A
  sword, an arrow and a bolt all use the same voice, each at its own level.
- **Props.** Plants are no longer wood or slime: the cactus and the giant
  flower rustle with a small pulpy squish, the toadstool squelches, the bush
  is a rustle alone. A hit on a tree's trunk now also shakes its crown, and
  you hear it: leaves, snow, ash or slime, just after the knock.
- **Monster balls.** A snowball, a fireball or a slime's glob used to vanish
  in silence. Now each breaks with its own sound: on you, on your shield, on
  the ground or on a rock, quieter the further away it lands. And the blow the
  server sends for a ball that hit you no longer plays the sword-on-armour
  clang at full, so a snowball does not sound like a sword.
- **Hits nobody here played.** A teammate's blows and your own Shield Bash,
  Whirlwind, staff splash and bursts were silent. Now they play the monster's
  voice at about a third of your own melee's level, softer with distance.

Only recordings already in the game are used. Nothing is synthesised (the
owner: procedural sound is "worse than nothing"). No new files were added.

## The monster voices

`BT_AUDIO.HIT_VOICES` in `src/data/gameDisplay.js`. Which voice a monster gets
is `hitSoundOf()` in `src/data/monsterVariants.js`: its `HIT_MATERIALS` entry's
`sound` if it has one, else its `kind`. `kind` still decides what the hit
LOOKS like (the pieces that fly), and it is unchanged.

| voice | monsters | body | texture |
|---|---|---|---|
| **snow** | snowman | his own snowball thud (`snowman-hit`) | a crunch of snow (the Wheel's snow footstep) |
| **goo** | every slime (green, blue, moss), the mire wisp | the wet thud (`monster-hit`) | a squelch of mud (the Wheel's mud footstep, pitched up) |
| **ember** | fire goblin | the wet thud | a short sizzle (the cooking sting, `cook-success`, faded out) |
| **stone** | rock monster | the owner's pickaxe on stone (`mine-strike`), as stone props have it | a dull knock of stone (the Wheel's stone footstep) |
| **wet** | fishman | the wet thud | a short splash (the fish thrashing on the hook, `fish-on-hook`) |
| **mud** | bog lurker | a heavy squelch of mud, pitched down | the wet thud, a little lower |
| **bone** | mummy, skeleton, hexer | `sword-hit3`, **unchanged** | none |
| **flesh** | players and NPCs | the wet thud, unchanged | none |

The mummy stays bony on purpose: the owner chose "Bony is mummy" in
v2.3.2452, and v2.3.2843 kept it when the mummy's pieces became ash.

Two alternates per voice where the recordings give two (two pickaxe strikes,
two crunches, two squelches), and the same small left-right detune (±1.5%)
the old single sample had, so a run of hits does not sound like a machine.

**Levels.** The game's sword-hit3 is the reference every hit has been tuned
against since v2.3.2452. Each layer was measured (the loudest 50 ms, plain
and A-weighted, the same method as the v2.3.2995 prop sounds) and each whole
voice rendered with its layers at their offsets. At the arrow's level, the
loudest call, every voice measures 0.92 to 1.10 of sword-hit3 at the same
level, and peaks between 0.39 and 0.66 of full scale. There is no limiter on
the sound bus, so this matters: the texture layers sit at about half their
matched loudness, heard but not on top.

| weapon | level (unchanged) |
|---|---|
| sword | 0.55 |
| lunge | 0.5 |
| arrow | 0.6 |
| bolt | 0.22, under the magic hit's own 0.3 |
| a hit nobody here played | 0.55 × 0.35, softer with distance |

**A bug went with it.** An arrow or a bolt into a snowman played his
snowball thud AND the slime's thud (the old table had no snow entry, so it
fell back to flesh): every ranged hit on a snowman sounded like two hits.
Now it is his voice, once.

## The props

`BT_AUDIO.PROP_SOUNDS` and `CROWN_SOUNDS` in `gameDisplay.js`; what each
object is made of is `src/data/wheelMaterials.js`.

| material | objects | hit | break |
|---|---|---|---|
| **plant** (new) | cactus, giant flower | a grass rustle with a small pulpy squish under it | two rustles and two squishes |
| **mushroom** (new) | toadstool | a squelch of mud with a soft dirt thud | squelches and a thud |
| **leaf** | bush | a rustle alone, two of them (the wooden knock is gone) | unchanged |
| everything else | | unchanged | unchanged |

The old `soft` material (the slime's thud on a plant) is gone. The plants
keep exactly the same flying pieces as before; only the sound changed.

**Tree crowns.** A tree's `canopy` (wheelMaterials.js) is now heard too, about
half as loud as the trunk and 40 ms after it, so the knock leads and the crown
answers:

| crown | trees | sound |
|---|---|---|
| leaf | oak, orchard, palm, mangrove, jungle tree, wild fruit | a rustle of leaves |
| snow | pine, birch | a crunch of snow falling off |
| char | dead tree | a puff of ash |
| slime | slime tree | a squelch |

## The monster balls

`BT_AUDIO.SHOT_SOUNDS` in `gameDisplay.js`; where and how loud is
`shotEndSfx` in `src/game/hitSounds.js`, called from the one place every ball
ends (`queueSnowballBurst`, `src/game/projectiles.js`).

| ball | thrown by | breaks as |
|---|---|---|
| snowball | snowman | a sharp crunch of snow with a lighter one after |
| fire | fire goblin | the cooking sizzle, faded out |
| goo | slimes, mire wisp | a squelch of mud on contact, then the slime orb's sloppy splort |

| where it breaks | level |
|---|---|
| on you | full |
| on your raised shield, facing the thrower | half |
| on the ground or a rock | 0.45, and less the further away (silent past ~1,150 px) |

On you, each measures 0.67 to 0.74 of sword-hit3, about the same as the
element sounds that follow (the chill, the burn and the hold measure 0.74,
0.53 and 0.85).

**The blow for the ball.** The server sends its own `monster_attack` for a
ball that hit you, and the game used to answer it with the melee sound: the
armour clang (the loudest thing in combat, 3.5 times sword-hit3) or the bare
thud. When a ball of that monster broke on you within the last 400 ms, or is
still in the air (the server's tick can arrive a beat before the drawn ball),
the blow is the ball's: the clang plays at 0.3 of its level if you wear
armour (measured: about 1.07 of sword-hit3, armour under a snowball rather
than a sword on it) and not at all if you do not. The element's own sound
(chill, burn, hold, v2.3.2996) is untouched.

## Hits nobody here played

`echoHitSfx` in `src/game/hitSounds.js`, called by `monster_hit` in
`src/networking/gameEvents.js` for the hits that have no local hit site: a
teammate's, and your own abilities, staff splash and bursts. It plays the
monster's voice at 0.35 of the melee's level, softer with distance, and:

- never for your own swing, arrow, bolt or lunge (you heard those where they
  landed),
- never for a burn or poison tick, thorns, or the second half of an element
  collision,
- never on a monster you heard hit in the last 400 ms (no doubling),
- never past ~1,150 px,
- at most three in any 150 ms (a whirlwind into a pack is three voices, not
  twelve).

## Never silent: the fallbacks

The textures of goo, stone, snow and mud, the plants, the crowns and the
snowball and goo balls are the Wheel's footstep recordings. Those load only
in the Wheel, behind its loading overlay (`loadGroundSteps`), like the
footsteps themselves. Everything else is in the sound manifest, which every
player loads.

So every voice has a fallback (`fb`): **the exact sound that material made
before v2.3.3001.** If any sample a hit needs is not decoded yet (outside the
Wheel, or a hit before a clip has arrived), the fallback plays instead:

| voice | outside the Wheel / not loaded yet |
|---|---|
| snow | his snowball thud alone, at its old level |
| goo, mud | the wet thud |
| stone | the old sword clang |
| ember, wet | the wet thud (their textures are in the manifest, so only on a cold start) |
| plant, mushroom | the old soft thud |
| snowball ball | a soft snowball thud |
| goo ball | the slime orb's splort |
| crowns | nothing extra: the trunk alone, as before |

The fallback is asked for even when it is still loading itself, so the
browser fetches it from the manifest; a Wheel clip outside the Wheel would
never come.

## Where it lives

| file | what |
|---|---|
| `src/data/gameDisplay.js` | `HIT_VOICES`, `materialHit` (and `swordHit`, the old name, which now plays the same voice), `PROP_SOUNDS` (plant, mushroom, leaf), `CROWN_SOUNDS`, `SHOT_SOUNDS`, `shotHit`, the test notes `_noteHit` / `_noteShot` / `_noteHero` / `_lastProp.crown` |
| `src/data/monsterVariants.js` | `HIT_MATERIALS[...].sound` (fishman `wet`, bog lurker `mud`), `hitSoundOf()` |
| `src/data/wheelMaterials.js` | `plant`, `mushroom`; the cactus, giant flower and toadstool moved to them |
| `src/game/hitSounds.js` | when and how loud: `monsterHitSfx`, `echoHitSfx`, `shotEndSfx`, `shotHitMe`, `heroHitSfx`, `earVol`; the probe `window.__btHitSounds` |
| `src/game/monsterCombat.js`, `dodge.js`, `projectiles.js` | the sword, the lunge, the arrow and the bolt call `monsterHitSfx`; the balls' ends call `shotEndSfx` |
| `src/networking/gameEvents.js` | `monster_hit` calls `echoHitSfx`; `monster_attack` calls `heroHitSfx` |
| `src/game/wheelBreak.js` | passes a tree's crown to the prop sound |

## Tests

- `node tools/world/test-world-core.mjs`, "hits sound like what they hit":
  the plants are plants, every crown is heard, every Wheel monster's voice,
  the mummy bony, every voice with a texture has today's sound as its
  fallback, every sample is one the game loads, and every slice of a footstep
  clip lies inside one of its steps (re-cutting the clips fails it).
- `node tools/qa/mp/mp-hitsound.mjs` (needs `dist/`): the routing of every
  voice, whole, outside the Wheel and cold; every voice and ball rendered for
  real through Web Audio for clipping and level.
- `tools/qa/mp/run.mjs hitvoices`: every Wheel monster against sword, arrow
  and bolt through the real hit paths; the snowman one hit; the echoes; the
  balls on you, your shield and the ground; the blow for a ball.
- `tools/qa/mp/run.mjs wheelbreak`: a tree's crown heard, a bush a rustle.
