# A crowd of one sound starts as a few (v2.3.3727, `?voicecap`)

The owner asked about many copies of the **same** sound starting at nearly the
same moment in a crowd, and wants them grouped into one or a few.

## What was there

Other players' sounds were already limited (`game/eventSounds.js` peerShare,
4 a 200 ms; their steps 3 a 200 ms; `hitSounds.js` echo hits 3 a 150 ms), and
the menu's ticks (`uiTick`, one a gesture). Your own fight and the monsters'
had no limit on purpose (the v2.3.2639 note in `gameDisplay.js`: a flurry is
meant to layer). So a whirlwind into a pack of ten started ten copies of the
monster-hit recording, and then the deaths, in one instant: one loud, smeared
burst that can clip.

## What the switch does

**On by default since v2.3.3760.** The owner: *"I think including the new memory change work by default would be better. I can always revert the change if I don't like it or it doesn't work well."*

`?voicecap=0` turns it off for one phone (the game as it was);
`?voicecap=4:60` tries other values.

- At most **3** copies of one recording (one sample key) may **start** within
  **50 ms** of each other, by when each is scheduled to sound (a layer's delay
  counts). A copy over that is not started.
- The first copy always plays (the v2.3.2452 first-blow rule).
- Different recordings never hold each other back: the swing rotation's three
  recordings still layer, and a hit's material layers still sound together.
- The menu's sounds (`ui-*`, which have uiTick's own rule), the loops and the
  music are outside it.
- The kept copies are not made louder to stand for the crowd. A level change
  waits for someone to listen to it.

It is one gate in `BT_AUDIO.play` (`_voiceGate`), which every one-shot and
every cue layer passes. The rule is in `src/data/voiceCap.js`.

## Measured

`mp-battlemem` (a phone at the Flame Fields' fight, sword, bow and staff and
their specials, six rounds), counted by `window.__btVoiceCap()`:

| | switch off | switch on |
|---|---|---|
| sounds started | 923 | 889 |
| most starting in any 50 ms | 17 | 12 |
| most copies of one recording in 50 ms | 7 (monster-hit) | 3 |
| most sounding at once | 17 | 12 |
| copies held back | 0 | 19 (monster-hit 17, axe-chop 2) |
| decoded sound | 27 MB | 27 MB |

`mp-voicecap`'s whirlwind into a pack of ten (ten hits, then twenty deaths):
40 sounds start, 20 copies of monster-hit at once, as the game is; with the
switch 9 start, at most 3 of any recording.

`mp-longplay` (five players, 8 minutes): as the game is, the most copies of
one recording in 50 ms was 5 (the Goo Grotto's slime deaths, the fire's
sizzle), the most sounding at once 9. With the switch, only the first player
kept it: the four guest players' pages drop the address's switches when they
reload, so their readings are the game as it is.

**Memory does not change**: every copy of a recording plays one decoded
buffer. The win is how a crowded fight sounds, not MB.

## Tests

- `server/test/sound-cues.test.mjs` §19: the rule (ten in one instant start
  three, the first always, different keys and a quarter-second flurry
  untouched, the menu outside, the switch off by default, play() asks the
  gate and the loops do not).
- `mp-voicecap`: the whirlwind into a pack, the first blow, a flurry and the
  swing rotation unchanged, no memory change, on two phones.
