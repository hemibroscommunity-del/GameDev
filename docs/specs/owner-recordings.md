# The owner's recordings for the sounds still needed (v2.3.3445)

The owner, 2026-10-18, after the list of sounds that needed new recordings
(docs/SOUND-GAPS.md): *"I have the rest of the sounds"* -- 21 recordings from
Pixabay, uploaded to the top of the project. They are kept as supplied in
`assets/sfx-source/{player,ui,emote,world,npc,voice}/` (CREDITS.md says where
each came from). "Grunt 1" is the sprint's push-off, the owner's own ask in
another change (`tools/audio/cut_sprint_grunt.py`); the other 20 are cut here.

## How they are cut

`tools/audio/cut_owner_sounds.py` (numpy and ffmpeg; it writes
`src/data/ownerSoundClips.js`, GENERATED):

- **One-shots** (`public/sfx/<group>/<name>.mp3`): one window of each
  recording, chosen by measuring its loudness envelope (the onset where the
  level jumps out of the room noise, the end where it is back under it), mono,
  faded at both ends, peak 0.9. Each is levelled the way the cue table is
  tuned and `tools/qa/mp/mp-cuelevels.mjs` measures (the loudest 50 ms, plain
  RMS, against sword-hit3 at the melee hit's 0.55 x HIT_GAIN), to the level in
  its comment in `src/data/eventSounds.js`.
  - Read in mono as Web Audio downmixes (the two sides averaged). ffmpeg's
    `-ac 1` sums them at 0.707 each, which read the stereo sword-hit3 1.41x
    louder than the game plays it -- the first cut's levels were all 1.43x
    their promise (mp-cuelevels caught it; docs/TRAPS.md §230).
    `cut_monster_noises.py` still reads its reference that way: its noises are
    about 1.4x the NOISE_K it says.
  - Two recordings were nearly all below what a phone's speaker plays (99% of
    their energy under 100 Hz): the munch is high-passed at 400 Hz (the crunch;
    the rest was the microphone's rumble), and the heartbeat keeps its thump
    with a little of its own overtones laid over it (the thump through a tanh,
    its part above 180 Hz) -- about 0.13 of a hit by ear (A-weighted), where it
    was 0.03.
- **Loops** (`public/audio/ambient/<name>.mp3`): mono 24 kHz, made seamless by
  folding the window's last seconds over its first (an equal-power
  crossfade), brought to the river's or the Wind Dunes' wind's loudness as a
  speaker plays them (the RMS of each side), through a soft limit on the few
  peaks.
- **The dance** (`public/audio/music/dance-beat.mp3`): four bars of the club
  beat (120 a minute, the dances' own tempo), from just before its first kick,
  twice over, mono (its two sides correlate at 0.999).

## Memory (CLAUDE.md, "Memory is budgeted")

- The one-shots are in `SFX_MANIFEST`, decoded on the loading screen: the
  voice and noise ones at **24 kHz** (`BT_AUDIO.LOW_RATE_SFX`, decoded by an
  `OfflineAudioContext` at `LOW_RATE`; the real context plays the buffer and
  resamples it) -- ~1.4 MB -- and the UI's pop, chime and "denied" at the
  context's own rate, ~0.3 MB. Their files are written at 24 kHz, so nothing is
  resampled twice; a browser without an OfflineAudioContext decodes them the
  old way.
- `loadSample` decodes a FILE once, whatever keys name it: `fish-on-hook` /
  `fishing-fish-on-hook` and `lure-drop` / `fishing-lure-drop` were two copies
  each (~1 MB); `decodedMB()` counts a shared buffer once.
- The loops are never in `SFX_MANIFEST`. The land's air (`ZONE_AMBIENT`, the
  `zoneamb-` keys) and the beds (`amb-`) decode at 24 kHz too, while you are
  where they play: the forest 1.5 MB, the lava 1.1, the sea 0.8, the crowd 0.9,
  a fire 0.6. The Wind Dunes' wind, decoded at 48 kHz stereo before (11 MB),
  is ~5.5 MB at 24 kHz.
- The dance's beat streams through the music deck and is never decoded; where
  the deck cannot run (the decoded fallback, `?musicdecode`) a dance plays no
  music.

## When each plays

| Sound | Where | Code |
|---|---|---|
| Your hurt grunt (two) | a blow that lands on you: a monster's, the felling one, a player's; never a block, a dodge, a burn's tick, or a scratch under 2% of your health; at most one in 700 ms, never the same twice running | `game/ownSounds.js` `hurtGrunt`, from `gameEvents.js` |
| Heartbeat | under a quarter of your health, every 1,000 ms (640 under a tenth), the next beat timed from when the last was due (a slow phone keeps the tempo) | `ownSounds.js` `tickHeartbeat`, BroTown's loop (monsterCombat's frame-counted timer of two silent beeps is gone) |
| Munch, gulp | the eatBus (Quick Eat and the bag's Eat), the Cookhouse's Eat, the old bag's; the bag's Drink | BroTown.jsx, CookPanel, InventoryPanel, ItemDetailPopup |
| Chat pop | a line in on any lane (room, area, whisper, party); yours out softer | `game/chat.js` (chatReceive / chatSend were silent beeps) |
| Notification chime | mail (not the daily rewards' payouts), a party or clan invite, a friend's request, yes or message, an announcement, someone else's jackpot; one a second | `gameEvents.js` |
| "Denied" | see docs/SOUND-GAPS.md "Added in v2.3.3445"; one each 250 ms | the refusals' own code |
| Laugh, snore | the Laugh; Sleep as you lie down and every 3.6 s while asleep -- yours, a player's near you (the peer share), a townsperson's copy | `MOVE_SOUNDS`, `game/moveSounds.js` |
| The dance's beat | while YOU hold a dance: the music deck's target (`BT_AUDIO.setDanceMusic`, `_danceWant` before the zone and session tracks), its epoch a whole number of its 16 s so the beat sits on the wall clock's half-seconds where the dances bob | `moveSounds.js` `tickDanceMusic` |
| War horn | each dungeon wave, the arena's start, a war declared on you (clan or alliance) | the cue table (`dungeonWave`, `arenaStart`, `allianceWar`) |
| Boss roar | a dungeon boss arriving; quicker and cut short as it enrages | `bossArrive`, `bossEnrage` |
| Explosion | the Blue Slime's burst, over its splash | `blueBurst` |
| Townsfolk's voices | opening a talk (the quest panel, a tap, E, walking up to Diego) in his own hum (`VOICE_OF`: a hum and a pitch each); his line popping up, at 0.4 by distance, one townsperson every 2.5 s, none past 900 px | `game/npcVoices.js` |
| Land air | the Verdant Wilds' birdsong, the Flame Fields' lava | `ZONE_AMBIENT.verdant` / `.ember`, chosen by the land music |
| Sea surf | the nearest water drawn round you that is not a river or pond (16 looks on rings out to 880 px), full within 180 px | `game/ambientBeds.js` |
| Town crowd | BroTown's middle, full within 650 px, gone at 1,500 | `ambientBeds.js` |
| Fire crackle | the nearest burning building (by its heat, `buildingFire.js burningNow`) or lit campfire (yours or another player's), full within 140 px | `ambientBeds.js` |

A bed's loop starts when its share rises, stops 3 s after it falls silent, and
its buffer is let go 15 s after that, or at once when you leave the Wheel.
`?nobeds` is the Wheel without them. A land's air and the beds loop over their
file's silent edges (`BT_AUDIO._loopOverEdges`).

## Tests

- `server/test/sound-cues.test.mjs` §11: every one-shot in the manifest at the
  rate it is decoded at, no loop in it; one decode a file; the land's air; the
  beds' rules; the heartbeat's clock; every grunt, munch, gulp, pop, chime and
  "denied" call site; the moves; the townsfolk; the dance never decoded; the
  sources kept.
- `tools/qa/mp/mp-ownersounds.mjs` (a phone in the Wheel, a real worker): all
  of the above heard through the game's own handlers, the beds in the square,
  by a campfire and on a real shore, a bed let go, the lava at 24 kHz.
- `tools/qa/mp/mp-cuelevels.mjs`: every new cue's level rendered and held to
  its comment.
