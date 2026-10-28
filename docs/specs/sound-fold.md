# A stereo sound whose two sides are one is kept as one (v2.3.3706)

The owner, 2026-10-28: *"Memory seems to be the persistent bottleneck in terms
of performance in this game. Getting that to run as low as possible without
sacrificing performance is the goal."*

## What a sound holds

A sound effect is downloaded as an MP3 and decoded once, behind the loading
screen, into raw samples the speaker can play at once: 32-bit numbers, one
list per channel, at the sound card's rate (48,000 a second on an iPhone). A
second of stereo is 375 KB. About 27 MB of sound is held that way while you
play (the memory check's `sound` line).

39 of the sound files are stereo. Six of them carry the same signal on both
sides, made from mono recordings, so half of what they hold is a second copy:

| sound | its two sides | held as stereo |
|---|---|---|
| pan-sizzle (the cookhouse's pan) | equal | 2.20 MB |
| fish-reel | 66 dB apart | 1.83 MB |
| quest-complete | equal | 1.31 MB |
| coin-pickup | equal | 0.70 MB |
| flip-lose (Ace's coin) | equal | 0.54 MB |
| footstep-v2 | equal | 0.29 MB |

The next widest, shield-bash, is 41 dB apart, and the other 32 are wider still
(most 5-20 dB): real stereo, which they keep.

## What it does now

- After each decode (gameDisplay.js `BT_AUDIO.loadSample`), a stereo buffer
  whose two sides differ by at least 60 dB less than their sum is kept as one
  channel, the mean of the two (src/data/soundFold.js `foldToMono`).
- The sides are read through two small reused arrays, 16,384 samples at a
  time (`copyFromChannel`), and the one channel written the same way
  (`copyToChannel`): never `getChannelData`, which hands the page a sound's
  own samples, so that its whole data then counts as one of the page's own
  buffers. The first cut read them that way: the memory check's `buffers`
  line went from 24 to 42 MB, for 39 stereo sounds' data the page had never
  been handed before.
- Web Audio plays a one-channel buffer out of both speakers (its "speakers"
  up-mixing: the same signal left and right), so the sound is the same: the
  same samples for the five whose sides are equal, within 60 dB for
  fish-reel. The game pans no sound, and nothing reads a sound's channels.
- Nothing is resampled and no file changes. `?stereosfx` keeps every stereo
  sound stereo, as before; `window.__btSoundFold()` names the ones kept as one.

Looked at and NOT done: decoding the nine sound files recorded at 24 kHz at
their own rate (another 1.9 MB). The browser would then raise them to 48 kHz
as they play, a cheaper conversion that dulls the top of a crisp sound (a
sword's swing, a coin) by up to ~3 dB; the owner's own voice recordings and
the long loops already work that way (LOW_RATE_SFX, v2.3.3462), the sound
effects do not.

## Measured

- `mp-soundfold` (two phones in BroTown, one `?stereosfx`): exactly the six
  kept as one channel, 3.16 MB; the sound held decoded 26.8 MB against 29.9;
  the page's raw buffers 22.0 MB against the stereo phone's 21.8 (none of a
  sound's samples handed over); each of the six played through two channels
  against its file decoded again as stereo, -66 to -89 dB apart (the decodes
  and resampling of two contexts, as far under the sound as a decode's own
  rounding); each played by the game's own player.
- `mp-membudget` (the check on every PR): decoded sound at most 27.0 MB on the
  trip, where main reads 30.1; every other line where main's is. Its `sound`
  line is lowered 32 -> 29 to keep the saving.
- `mp-cuelevels`: every cue as loud as before (it renders the game's own
  buffers).
- The ruler: `memprobe.mjs` counted only the buffers the page decodes, so the
  six one-channel copies (made by `createBuffer`) went missing and the line
  first read 23.8 MB. It now counts the buffers the page makes as well.

## Tests

- **`sound-fold` suite** (node, 21 checks): which signals are one (equal,
  66 dB apart, not 41, silence); the fold (one channel of the mean, the same
  samples to the bit; a wide one, a mono one and a failed make kept as they
  were); no sound's own samples asked for (getChannelData), a long one folded
  through its windows, its short last window read; the wiring.
- **`mp-soundfold`**: two phones, one `?stereosfx`: exactly the six held as one
  channel and that much less sound held decoded; the page's raw buffers no
  bigger than the stereo phone's; each of the six played through two channels
  the same as its stereo file decoded again; each through the game's own
  player; no page errors.
