# The monsters' own noises (v2.3.3337)

> The owner, 2026-10-18, with four recordings: *"You can use part of this
> 'growl and rawr' sound effect for the fire goblins."* *"Use this 'rattling
> bones' sound effect for the skeleton form of the mummy as that monster
> noise."* *"Use this sound for the slime monster noise."* *"Use this sound
> for the snowman noise."*

## What you hear

Until now a monster was heard only when it was hit or died. Four kinds now
have a noise of their own:

| Monster | Noise | From |
|---|---|---|
| Fire goblin | a short rawr | "Growl and Roar": the roar's first second |
| Skeleton (the mummy's form below half health) | rattling bones | "Rattling Bones": its busiest second |
| Every slime (the plain one, blue and moss) | a jelly bounce | "Bouncy Jelly Creature Movement": a cluster of bounces |
| Snowman | a snarl | "Beast Snarling": its first second |

A monster makes its noise:

- **when it notices you** -- the moment it starts chasing you, the same moment
  the "!" appears over its head (the worker's `tg` edge, wsClient);
- **now and then while it chases you** -- every 7 to 14 seconds, at random, so
  a pack does not call in time;
- and the skeleton's bones **as a mummy sheds into one** (monster_transform).

It is never more often than once in 6 seconds for one monster, never two
calls closer than 0.9 s between any two monsters (a pack that notices you at
once is one or two calls, not five), and it is heard by distance like every
other monster sound: in full within 220 px, fading to nothing at 1,150
(hitSounds `earVol`, v2.3.3248). The mummy's first form and the kinds with no
recording yet are silent; `NOISE_OF` in `src/game/monsterNoises.js` is the one
table to add one.

Every name in that table is spelled out, and a variant never falls back to its
base archetype: the mummy, its skeleton, the fire goblin and the mire wisp are
all the slime (`fodder`) underneath (monsterVariants.js `baseArchetype`), so a
fallback gave the mummy and the wisp the slime's bounce. `mp-monsternoise`
checks both stay silent.

## The clips

`tools/audio/cut_monster_noises.py` cuts about one second of each recording
(the window is measured, not chosen by ear: a 10 ms loudness envelope, every
window scored by its loudness minus how loud the moment before its start is;
`--scan` prints the top three), mono, faded in and out, and writes
`public/sfx/monster/noise-<name>.mp3` (12-18 KB each). Each one's volume is
set so it is 0.75 of a melee hit's loudness beside you (sword-hit3 at 0.55,
the yardstick the hit sounds were levelled against), written to the generated
`src/data/monsterNoiseClips.js`. They load with the game's other short sounds
(`SFX_MANIFEST`): ~0.75 MB decoded. The recordings as supplied are in
`assets/sfx-source/monsters/`; CREDITS.md has where they came from (to
confirm, like the other supplied sounds).

Nothing is sent: what a monster is doing is already on the wire.

## Tests

`mp-monsternoise`: the table, the manifest, nothing heard far away, the shed's
rattle, and real snowmen and slimes in the Wheel calling as they notice you and
again while they chase, within the limits.
