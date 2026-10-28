#!/usr/bin/env python3
"""v2.3.3462: CUT THE OWNER'S RECORDINGS FOR THE SOUNDS STILL NEEDED.

(v2.3.3664: and the eleven of 2026-10-27 -- the farm's hoe, clay, watering
can and harvest, the forge's hammer, the knife carving wood, a door, Lil
Bro's "hmm", a fire lit, coins and the bag -- their table below the
splash's, "THE OWNER'S RECORDINGS OF 2026-10-27".)

The owner, 2026-10-18, after the list of sounds that still needed new
recordings (docs/SOUND-GAPS.md): "I have the rest of the sounds" -- 21
recordings, uploaded as they came from Pixabay (CREDITS.md says where).  The
sources are kept in assets/sfx-source/{player,ui,emote,world,npc,voice}/ as
supplied; 20 of them are cut here, and the two the owner sent after them (a
splash and a level-up chime, below).  Each is longer than the game wants, so
this cuts them:

ONE-SHOTS (public/sfx/<group>/<name>.mp3): one window of each recording,
mono, faded in over a few ms and out over its last part, peak normalised to
0.9 (headroom for the encoder).  The windows were chosen by MEASURING, not by
ear (this tool's author cannot listen): a 10-25 ms loudness envelope, the
onset found where the level jumps out of the room noise, the end where it is
back under it (-36 dB or so).  The quiet ones that are voice or noise are
written at 24 kHz (`low`): BT_AUDIO decodes those at 24 kHz too
(LOW_RATE_SFX, data/gameDisplay.js), half the memory of the 48 kHz the
context would make of them, and a voice, a gulp or a horn loses nothing a
phone can play above 12 kHz.  The UI's pop, chime and "denied" tick keep
their sparkle at 48 kHz.

  name       recording                 window          what
  hurt-1     male_hurt7 48124          0.07 s + 0.49   a short "uh!" (its onset at 0.10)
  hurt-2     grunt-1 85280 (voice/)    0.56 s + 0.50   a falling "uh-uh!" (v2.3.3523: was the
             angry grunt 103204, a low strained "hnh" -- the EFFORT, which is
             the sprint's now, tools/audio/cut_sprint_voice.py; the owner:
             "Wrong sound for starting sprint and ending sprint (hurt sound)
             instead of effort grunt".  Grunt 1 falls ~330 -> 150 Hz as the
             hurt "uh!" above does: it sounds hit)
  heartbeat  thudding-heartbeat 372487 0.03 s + 0.59   ONE lub-dub (lub 0.045, dub 0.24, gone by 0.6)
  munch      eating-chocolate 67566    6.90 s + 0.52   two quick crunches (6.94, 7.12)
  gulp       gulping 37758             9.62 s + 0.70   the long swallow (its onset at 9.64)
  chat-pop   new-message-pop 464675    0.01 s + 0.18   the pop (80 ms)
  chime      new-notification 352755   0.06 s + 0.80   the chime and its ring
  denied     error-notification 199276 0.02 s + 0.72   the two-note "no"
  laugh      laugh-like-crazy 257881   0.66 s + 1.80   a "HA" and four "ha"s (the strongest laugh)
  snore      funny-snore 250959        0.18 s + 1.62   one snore (0.24-1.36) and the breath after
  war-horn   war-horn-and-drums 512545 6.08 s + 2.40   where the horn comes in over the drums
  boss-roar  epic-dragon-roar 364481   0.04 s + 2.40   the roar's body (its last second fades)
  explosion  loud-explosion 425457     0.00 s + 1.80   the blast and its roll-off
  npc-voices hmm-ahh 6426              five "hmm"s     each its own pitch and shape, in ONE file
                                                       (the cue table slices it: NPC_VOICES)
  points-spent cute-level-up-1 189852  0.00 s + 1.60   the rising chime and its ring (gone under
                                                       -60 dB by 1.55; nothing above 8 kHz)
  swim-splash  water-splash 229315     two parts       ONE file: going IN, the whole splash
                                                       (0.11 s + 1.20: the hit at 0.14, the
                                                       slosh, the tail), and coming OUT, the
                                                       slosh alone (0.24 s + 0.86, faded in:
                                                       water running off, no hit) -- SPLASH

The last two came after the rest, the same day: "Also here's a missing sound
effect for the player gets in and out of the water" and "Also add this sound
effect for after applying skill stat points".  Neither has anything a phone
plays above 12 kHz (0.08% of the splash's energy, none of the chime's), so
both are written and decoded at 24 kHz.

LOOPS (public/audio/ambient/<name>.mp3): mono 24 kHz, made seamless by
folding the window's last X seconds over its first (an equal-power
crossfade -- these are noise-like beds, two takes of them do not cancel) so
the end runs into the start with no seam.  Never in SFX_MANIFEST: each is
loaded where it plays and let go of when you leave (game/ambientBeds.js, and
ZONE_AMBIENT for a land's air).

  name          recording            window        loop    used
  sea-surf      gentle-ocean-waves   0.0 s + 10.0  8.5 s   the open sea and its shallows, from the shore
  forest        forest-3             2.0 s + 18.0  16 s    the Verdant Wilds' air (ZONE_AMBIENT)
  lava          lava-loop-1          2.0 s + 14.0  12 s    the Flame Fields' air (ZONE_AMBIENT)
  town-crowd    crowd-murmuring      0.8 s + 12.0  10 s    BroTown's streets (its last 8 s fade out: unused)
  fire-crackle  fire-crackling       0.2 s + 7.7   6.5 s   a building on fire, a lit campfire

THE DANCE (public/audio/music/dance-beat.mp3): the club beat is 120 beats a
minute, the dances' own tempo (game/emoteMoves.js DANCE_BEAT_MS 500), and
its first kick lands 25 ms in.  Four bars (8.000 s) from 20 ms, twice over,
mono (its two sides correlate at 0.999), 44.1 kHz: the music deck streams it
(BT_AUDIO.setDanceMusic), never decoded, so a 16 s file only halves how often
the element's own loop seam comes round.

LEVELS.  A one-shot's level is the game's business, written to
src/data/ownerSoundClips.js (GENERATED): the volume at which its loudness --
the loudest 50 ms, plain RMS, the way data/eventSounds.js's table is tuned
and tools/qa/mp/mp-cuelevels.mjs measures it -- is its LEVEL times
sword-hit3's at the melee hit's 0.55 x HIT_GAIN 1.7 ("1.0" in that table),
its peak held under 0.66 (there is no limiter on the bus).  A loop's whole-
file RMS is written there too (dBFS), so the code sets its volume against the
river's (game/waterAmbience.js) or the Wind Dunes' wind (ZONE_AMBIENT_VOL),
each read as a speaker plays it (side_rms_db: both stereo, the loops mono):
the land's air is brought to the wind's own RMS here, through a soft limit on
its few peaks, so one ZONE_AMBIENT_VOL fits all three; the dance's beat is
set against the town's music the same way.

  python3 tools/audio/cut_owner_sounds.py [--scan]
"""
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'sfx-source')
DATA = os.path.join(ROOT, 'src', 'data', 'ownerSoundClips.js')
SR = 48000          # the reference rate everything is measured at
LOW = 24000         # LOW_RATE_SFX and the loops

PEAK_FILE, PEAK_PLAY = 0.9, 0.66
REF = os.path.join(ROOT, 'public', 'sfx', 'sword', 'sword-hit3.mp3')
REF_GAIN = 0.55 * 1.7
WIND = os.path.join(ROOT, 'public', 'audio', 'ambient', 'wind-dunes.mp3')
RIVER = os.path.join(ROOT, 'public', 'sfx', 'fishing', 'river-water.mp3')
MUSIC = os.path.join(ROOT, 'public', 'audio', 'music', 'village.mp3')

# name, source (under assets/sfx-source), start s, length s, fade in s, fade out s, rate, level, group
ONE_SHOTS = [
    ('hurt-1', 'player/freesound_community-male_hurt7-48124.mp3', 0.07, 0.49, 0.006, 0.12, 'low', 0.7, 'player'),
    ('hurt-2', 'voice/freesound_community-grunt-1-85280.mp3', 0.56, 0.50, 0.006, 0.12, 'low', 0.7, 'player'),   # v2.3.3523: Grunt 1 (was the angry grunt, now the sprint's)
    ('heartbeat', 'player/dragon-studio-thudding-heartbeat-372487.mp3', 0.03, 0.59, 0.004, 0.18, 'low', 1.2, 'player'),
    ('munch', 'player/freesound_community-eating-chocolate-67566.mp3', 6.90, 0.52, 0.006, 0.06, 'low', 0.5, 'player'),
    ('gulp', 'player/freesound_community-gulping-noises-drinking-noises-37758.mp3', 9.62, 0.70, 0.006, 0.15, 'low', 0.5, 'player'),
    ('chat-pop', 'ui/virtual_vibes-new-message-pop-464675.mp3', 0.01, 0.18, 0.002, 0.05, 'full', 0.3, 'ui'),
    ('chime', 'ui/universfield-new-notification-010-352755.mp3', 0.06, 0.80, 0.003, 0.25, 'full', 0.8, 'ui'),
    ('denied', 'ui/universfield-error-notification-05-199276.mp3', 0.02, 0.72, 0.003, 0.20, 'full', 0.45, 'ui'),
    ('laugh', 'emote/chieuk-laugh-like-crazy-257881.mp3', 0.66, 1.80, 0.006, 0.25, 'low', 0.6, 'emote'),
    ('snore', 'emote/universfield-funny-snore-250959.mp3', 0.18, 1.62, 0.010, 0.35, 'low', 0.45, 'emote'),
    ('war-horn', 'world/soundmarker33-war-horn-and-drums-512545.mp3', 6.08, 2.40, 0.010, 0.60, 'low', 1.2, 'world'),
    ('boss-roar', 'world/dragon-studio-epic-dragon-roar-364481.mp3', 0.04, 2.40, 0.010, 0.50, 'low', 1.5, 'monster'),
    ('explosion', 'world/dragon-studio-loud-explosion-425457.mp3', 0.00, 1.80, 0.003, 0.45, 'low', 1.4, 'monster'),
    # under a level-up's own fanfare (level-up-v1 at LevelUpBurst's 0.55 is 1.3)
    ('points-spent', 'ui/floraphonic-cute-level-up-1-189852.mp3', 0.00, 1.60, 0.002, 0.50, 'low', 0.8, 'ui'),
]
# Two recordings are almost all below what a phone's speaker plays (measured:
# 99% of their energy under 100 Hz, where the speaker gives little; the "ear"
# column of mp-cuelevels, A-weighted, read 0.03 and 0.02 of a hit at their
# levels):
#   munch      the chocolate's crunch is above 400 Hz and the rest is the
#              microphone's rumble -- high-passed at 400 Hz (a 4th-order
#              Butterworth, causal), the crunch is all that is left;
#   heartbeat  the thump IS the low end, so it is kept whole, and a little of
#              its own overtones is laid over it (the thump driven through a
#              tanh, its part above 180 Hz, at `harm` of the thump): the knock
#              a phone can play, ~0.13 of a hit by ear at its level 1.2.
PROCESS = {
    'munch': {'hp': 400},
    'heartbeat': {'harm': 0.6},
}

# the townsfolk's voices: five "hmm"s of the one recording (measured: each a
# clear pitch, centroid 220-330 Hz -- a closed-mouth hum, not the two open
# "ahh"s at 3.7 s and 11.8 s), each with a breath of room either side
VOICE_SRC = 'npc/freesound_community-hmm-ahh-6426.mp3'
VOICES = [   # start, length -- f0 measured over the loudest 100 ms
    (0.95, 0.73),    # 224 Hz, rising
    (16.89, 0.40),   # 169 Hz, short
    (27.02, 0.52),   # 147 Hz
    (32.79, 0.49),   # 207 Hz
    (35.44, 0.35),   # 273 Hz, short and high
]
VOICE_GAP = 0.06
VOICE_LEVEL = 0.5

# the swim's splash: one file, two parts, each at its own level (its vol in
# the part), read by BT_AUDIO.SWIM_SPLASH.  The old splash -- slices of the
# fishing recordings -- played at 0.10 of a hit going in and 0.05 coming out,
# which the owner took for no sound at all; IN is half a hit, OUT half that.
SPLASH_SRC = 'player/universfield-water-splash-229315.mp3'
SPLASH = [   # part, start, length, fade in, fade out, level
    ('in', 0.11, 1.20, 0.004, 0.35, 0.5),
    ('out', 0.24, 0.86, 0.015, 0.35, 0.25),
]
SPLASH_GAP = 0.06

# ═══ v2.3.3664: THE OWNER'S RECORDINGS OF 2026-10-27 ═══
# Eleven Freesound downloads, kept as supplied in assets/sfx-source/2026-10-27/
# (its README names each), the owner: "You can add more sound effects for
# farming ... One additional sound I'd like to use for blacksmithing label
# includes "flat-hoe" the other hoe sound is for when you till the dirt.
# There's a clay sound for molding the ground (apply fertilizer) ... a sound
# for wood carving (making bows, staffs, etc) and doors opening ("entering"
# town buildings) ... the sound for lil bro "hmm" ... Light fire (when lighting
# a fire), coins (during pickup), and the last sound is when any object gets
# picked up and placed in your bag".  Their windows MEASURED as the ones above
# (a 10-20 ms loudness envelope; each recording's bands below, % of its energy):
#
#   coins        coins-05            0.02 s + 0.40   the whole jingle, 98% of it ABOVE
#                                                    6.4 kHz (47% above 12.8): kept at
#                                                    48 kHz, 24 would lose half of it
#   bag-close    closebag            0.00 s + 0.42   the bag drawn shut; 46% of it under
#                                                    100 Hz is handling rumble a phone
#                                                    cannot play: high-passed at 150 Hz
#   lil-bro-hmm  hmm                 0.66 s + 0.84   the one "hmm" (95% at 200-400 Hz)
#   fire-light   light-fire-sound    0.20 s + 1.10   the flare and its tail: 85% under
#                                                    100 Hz, so kept whole with its own
#                                                    overtones laid over it, as the
#                                                    heartbeat's are (a phone hears those)
#   door-open    door open sfx       0.00 s + 0.88   the creak and the latch (200-400 Hz)
#   wood-carve   wood-carve-5        0.00 s + 0.24   one stroke of the knife
#   farm-harvest harvest cozy sfx    0.00 s + 1.06   a bright pop and its ring (92% at
#                                                    0.8-1.6 kHz)
#   farm-water   grab & can watering 0.12 s + 0.36   the pour alone, after the can's
#                                                    clunk (0.08 s), high-passed at 150
#
# and three files of parts, as the townsfolk's voices are, played in turn:
#
#   farm-hoe     hoe-work            three strikes of the hoe in the dirt (the loudest
#                                    of the fourteen, 0.78 s apart: 3.73, 6.81, 10.71 s),
#                                    a bright chink (centroid ~7 kHz, 12% above 12.8 kHz:
#                                    48 kHz)
#   farm-mould   molding             two squeezes of the clay; 94% of the file is the
#                                    microphone's rumble under 100 Hz, so high-passed at
#                                    300 Hz, the squish is what is left
#   forge-strike flat-hoe            three blows of the hammer on the flat hoe, its ring
#                                    (onsets 0.08, 1.35, 3.05 s; 1.6-6.4 kHz)
#
# LEVELS, against a melee hit (1.0), from what played there before (measured the
# same way): the coin pickup was 0.87, the bag's tick 0.31, the door's knock 0.68,
# the fire catching 0.48, the farm's beats 0.07-0.21 (the watering 0.07, all but
# silent), the anvil's strike 0.61, the Woodworker's plane 0.91.
NEW_SRC = '2026-10-27/'
ONE_SHOTS += [
    ('coins', NEW_SRC + '336571__anthousai__coins-05.wav', 0.02, 0.40, 0.002, 0.08, 'full', 0.75, 'loot'),
    ('bag-close', NEW_SRC + '467605__triqystudio__closebag.wav', 0.00, 0.42, 0.003, 0.08, 'low', 0.4, 'ui'),
    ('lil-bro-hmm', NEW_SRC + '482422__roses1401__hmm.mp3', 0.66, 0.84, 0.010, 0.20, 'low', 0.5, 'npc'),
    ('fire-light', NEW_SRC + '507724__wdomino__light-fire-sound.wav', 0.20, 1.10, 0.004, 0.40, 'low', 0.8, 'world'),
    ('door-open', NEW_SRC + '740271__mavom22__wavesaudiodooropensfx.wav', 0.00, 0.88, 0.003, 0.15, 'low', 0.7, 'world'),
    ('wood-carve', NEW_SRC + '796658__frostnox__wood-carve-5.ogg', 0.00, 0.24, 0.002, 0.05, 'low', 0.5, 'craft'),
    ('farm-harvest', NEW_SRC + '872487__heyheytheree__harvest-cozy-game-sfx-free.wav', 0.00, 1.06, 0.002, 0.30, 'low', 0.7, 'farm'),
    ('farm-water', NEW_SRC + '516257__wyronroberth__grab-_-can-watering.mp3', 0.12, 0.36, 0.020, 0.08, 'low', 0.3, 'farm'),
    # v2.3.3680: the roll -- the owner, of the dodge roll: "I'll just uploaded a
    # sound effect to use for that included in the label is 'kneeling goblin'"
    # (502553__kneeling__goblin-fall): a body going down and over, -22 dB at
    # 0.12 s, its loudest 0.2-0.5 s, down 30 dB by 0.9 s; 65% of it under 100 Hz,
    # so its own overtones laid over it, as the fire's are (a phone hears those)
    # v2.3.3686: it is the JUMP'S LANDING, not the roll -- the owner: "goblin fall
    # is just the label of the file I want to use for when the character's jump
    # lands".  The same window, renamed roll-tumble -> jump-land.
    ('jump-land', NEW_SRC + '502553__kneeling__goblin-fall.mp3', 0.10, 0.80, 0.004, 0.25, 'low', 0.55, 'player'),
    # v2.3.3682: the double jump's flip -- "I just uploaded the second jump
    # (flip) sound effect" (563530__catthulu__sfx-jump-flip): a whoosh, -26 dB
    # at its loudest 0.15 s in, a quiet airy tail to its end (0.56 s); 2% of it
    # under 100 Hz, so nothing laid over it
    ('jump-flip', NEW_SRC + '563530__catthulu__sfx-jump-flip.wav', 0.10, 0.45, 0.004, 0.15, 'low', 0.5, 'player'),
    # v2.3.3708: the jump -- the owner: "File with 'hup' is the jump" (uploaded
    # 2026-10-28, 613568__mrdeadh__hup): one short "hup!", its onset at 0.03 s,
    # loudest 0.05-0.07 s (-20 dB), under -43 dB by 0.13 and room noise by
    # 0.21 (the file decodes to 0.22 s); a voice, 55% of it under 400 Hz but
    # none under 100, nothing above 12 kHz, so 24 kHz and nothing laid over it
    ('jump-hup', NEW_SRC + '613568__mrdeadh__hup.mp3', 0.025, 0.19, 0.004, 0.08, 'low', 0.45, 'player'),
]
PROCESS.update({
    'bag-close': {'hp': 150},
    'fire-light': {'harm': 0.6},
    'farm-water': {'hp': 150},
    'jump-land': {'harm': 0.5},
})
# name, source, [(start, length)], fade in, fade out, rate, level, group, process
PART_SETS = [
    ('farm-hoe', NEW_SRC + '497987__16hpanskadvorakova_aneta__hoe-work.wav',
     [(3.71, 0.30), (6.79, 0.30), (10.69, 0.28)], 0.003, 0.10, 'full', 0.4, 'farm', {}),
    ('farm-mould', NEW_SRC + '490099__manuelaurreaf__molding.wav',
     [(0.30, 0.36), (0.86, 0.36)], 0.020, 0.12, 'low', 0.3, 'farm', {'hp': 300}),
    ('forge-strike', NEW_SRC + '636098__theboulder3400__flat-hoe.mp3',
     [(0.06, 0.55), (1.33, 0.55), (3.03, 0.50)], 0.002, 0.20, 'low', 0.6, 'craft', {}),
]
PART_GAP = 0.06

# name, source, start, length, crossfade, target ('wind' | 'river'), kbps
LOOPS = [
    ('sea-surf', 'world/mightuser-gentle-ocean-waves-4-300840.mp3', 0.0, 10.0, 1.5, 'river', 48),
    ('forest', 'world/freesound_community-forest-3-26722.mp3', 2.0, 18.0, 2.0, 'wind', 48),
    ('lava', 'world/freesound_community-lava-loop-1-67307.mp3', 2.0, 14.0, 2.0, 'wind', 48),
    ('town-crowd', 'world/freesound_community-crowd-murmuring-60721.mp3', 0.8, 12.0, 2.0, 'river', 48),
    ('fire-crackle', 'world/dragon-studio-fire-crackling-356123.mp3', 0.2, 7.7, 1.2, 'river', 48),
]

DANCE_SRC = 'emote/prdbyd-club-beat-120-bmin-294045.mp3'
DANCE_START, DANCE_LEN, DANCE_TIMES = 0.020, 8.000, 2


def load(path, sr=SR):
    """Decoded as the game hears it in mono: a stereo file's two sides
    AVERAGED, Web Audio's own downmix (mp-cuelevels renders into one
    channel).  ffmpeg's `-ac 1` adds them at 0.707 each instead -- read that
    way, the stereo sword-hit3 this levels against came out 1.41x louder than
    the game plays it, and every level here with it (docs/TRAPS.md §230)."""
    ch = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels',
                             '-of', 'csv=p=0', path], capture_output=True, check=True, text=True).stdout.strip() or 1)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    if ch > 1:
        x = x[:len(x) // ch * ch].reshape(-1, ch).mean(axis=1)
    return x


def encode(w, sr, path, kbps):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', '-ar', str(sr), '-ac', '1', path],
                   input=w.astype(np.float32).tobytes(), check=True)


def loudest50(x):
    """The loudest 50 ms, plain RMS (mp-cuelevels' `loudest`)."""
    n = int(SR * 0.05)
    c = np.concatenate([[0.0], np.cumsum(x * x)])
    if len(x) <= n:
        return float(np.sqrt(c[-1] / max(1, len(x))))
    return float(np.sqrt((c[n:] - c[:-n]).max() / n))


def rms_db(x):
    return 20 * np.log10(max(1e-12, float(np.sqrt((x * x).mean()))))


def side_rms_db(path):
    """A recording's loudness as a speaker plays it: the RMS of each side,
    averaged -- for the beds and the music, which play in stereo (a mono loop
    goes to both sides whole), where the average of the two sides (load)
    would read a wide stereo river or wind up to 3 dB quieter than it plays."""
    ch = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels',
                             '-of', 'csv=p=0', path], capture_output=True, check=True, text=True).stdout.strip() or 1)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    x = x[:len(x) // ch * ch].reshape(-1, ch)
    return 10 * np.log10(max(1e-24, float((x * x).mean())))


def fade(w, fi, fo, sr):
    w = w.copy()
    a, b = int(fi * sr), int(fo * sr)
    if a > 0:
        w[:a] *= np.linspace(0, 1, a)
    if b > 0:
        w[-b:] *= np.linspace(1, 0, b) ** 2
    return w


def highpass(w, fc, sr, order=4):
    """A causal Butterworth high-pass (RBJ biquads in series: order/2 of
    them at the Butterworth Q's)."""
    import math
    y = w.copy()
    n = order // 2
    for k in range(n):
        q = 1 / (2 * math.sin(math.pi * (2 * k + 1) / (2 * order)))
        om = 2 * math.pi * fc / sr
        al = math.sin(om) / (2 * q)
        c = math.cos(om)
        b0, b1, b2 = (1 + c) / 2, -(1 + c), (1 + c) / 2
        a0, a1, a2 = 1 + al, -2 * c, 1 - al
        b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
        out = np.zeros_like(y)
        x1 = x2 = y1 = y2 = 0.0
        for i in range(len(y)):
            x0 = y[i]
            o = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            out[i] = o
            x2, x1, y2, y1 = x1, x0, y1, o
        y = out
    return y


def overtones(w, g, sr):
    """The signal plus g x its own overtones: driven through a tanh, the part
    above 180 Hz."""
    h = highpass(np.tanh(8 * w / max(1e-9, np.abs(w).max())), 180, sr)
    return w + g * h * np.abs(w).max()


def soft_limit(w, t=0.7):
    """Leave everything under t alone; round off what is over it, toward 1."""
    s = np.sign(w)
    a = np.abs(w)
    over = a > t
    a[over] = t + (1 - t) * np.tanh((a[over] - t) / (1 - t))
    return s * a


def window(src, start, length, sr):
    x = load(os.path.join(SRC, src), sr)
    a, b = int(round(start * sr)), int(round((start + length) * sr))
    if b > len(x):
        raise SystemExit(f'ABORT {src}: the window ends past the recording ({len(x) / sr:.2f} s)')
    return x[a:b].copy()


def seamless(w, xf, sr):
    """Fold the last `xf` seconds over the first: out[:X] = in[:X] faded in
    + in[L:L+X] faded out (equal power), out[X:L] = in[X:L].  The loop is L
    long and its end runs straight into its start."""
    X = int(xf * sr)
    L = len(w) - X
    t = np.linspace(0, np.pi / 2, X)
    out = w[:L].copy()
    out[:X] = w[:X] * np.sin(t) + w[L:L + X] * np.cos(t)
    return out


def main():
    scan = '--scan' in sys.argv
    ref = loudest50(load(REF)) * REF_GAIN
    table, loops = {}, {}
    print(f'  reference: sword-hit3 at 0.55 x 1.7, loudest 50 ms {ref:.4f}')
    for name, src, start, length, fi, fo, rate, level, group in ONE_SHOTS:
        sr = LOW if rate == 'low' else SR
        w = window(src, start, length, sr)
        pr = PROCESS.get(name, {})
        if pr.get('hp'):
            w = highpass(w, pr['hp'], sr)
        if pr.get('harm'):
            w = overtones(w, pr['harm'], sr)
        w = fade(w, fi, fo, sr)
        w *= PEAK_FILE / max(1e-9, np.abs(w).max())
        path = os.path.join(ROOT, 'public', 'sfx', group, f'{name}.mp3')
        if not scan:
            encode(w, sr, path, 64 if rate == 'low' else 128)
        back = load(path) if not scan else load_resampled(w, sr)
        vol = level * ref / max(1e-9, loudest50(back))
        vol = min(vol, PEAK_PLAY / max(1e-9, np.abs(back).max()))
        table[name] = {'url': f'/sfx/{group}/{name}.mp3', 'vol': round(vol, 3), 'level': level,
                       'dur': round(len(back) / SR, 3), 'low': rate == 'low'}
        got = vol * loudest50(back) / ref
        kb = os.path.getsize(path) / 1024 if os.path.exists(path) else 0
        print(f'  {name:12s} {start:5.2f} s + {length:.2f} -> {kb:5.1f} KB @{sr // 1000} kHz, vol {vol:.3f}'
              f' (level {got:.2f} of {level}; peak at it {np.abs(back).max() * vol:.2f})')
    # the voices: one file, each "hmm" faded at both ends, a gap between
    parts, at, offs = [], 0.0, []
    for start, length in VOICES:
        w = fade(window(VOICE_SRC, start, length, LOW), 0.01, 0.08, LOW)
        w *= PEAK_FILE / max(1e-9, np.abs(w).max())
        parts.append(w)
        parts.append(np.zeros(int(VOICE_GAP * LOW)))
        offs.append([round(at, 3), round(length, 3)])
        at += length + VOICE_GAP
    vw = np.concatenate(parts)
    vpath = os.path.join(ROOT, 'public', 'sfx', 'npc', 'voices.mp3')
    if not scan:
        encode(vw, LOW, vpath, 64)
    vback = load(vpath) if not scan else load_resampled(vw, LOW)
    vvol = []
    for off, length in offs:
        seg = vback[int(off * SR):int((off + length) * SR)]
        v = VOICE_LEVEL * ref / max(1e-9, loudest50(seg))
        vvol.append(round(min(v, PEAK_PLAY / max(1e-9, np.abs(seg).max())), 3))
    table['npc-voices'] = {'url': '/sfx/npc/voices.mp3', 'level': VOICE_LEVEL, 'low': True,
                           'dur': round(len(vback) / SR, 3),
                           'parts': [[o, l, v] for (o, l), v in zip(offs, vvol)]}
    print(f'  npc-voices   {len(VOICES)} hums -> {os.path.getsize(vpath) / 1024 if os.path.exists(vpath) else 0:5.1f} KB, '
          f'parts {offs}, vols {vvol}')
    # the swim's splash: the same, its two parts at their own levels
    sparts, at, soffs = [], 0.0, []
    for _part, start, length, fi, fo, _level in SPLASH:
        w = fade(window(SPLASH_SRC, start, length, LOW), fi, fo, LOW)
        sparts.append(w)
        sparts.append(np.zeros(int(SPLASH_GAP * LOW)))
        soffs.append([round(at, 3), round(length, 3)])
        at += length + SPLASH_GAP
    sw = np.concatenate(sparts)
    sw *= PEAK_FILE / max(1e-9, np.abs(sw).max())   # one gain: the parts keep their sizes
    spath = os.path.join(ROOT, 'public', 'sfx', 'player', 'swim-splash.mp3')
    if not scan:
        encode(sw, LOW, spath, 64)
    sback = load(spath) if not scan else load_resampled(sw, LOW)
    svol = []
    for (off, length), (_p, _s, _l, _fi, _fo, level) in zip(soffs, SPLASH):
        seg = sback[int(off * SR):int((off + length) * SR)]
        v = level * ref / max(1e-9, loudest50(seg))
        svol.append(round(min(v, PEAK_PLAY / max(1e-9, np.abs(seg).max())), 3))
    table['swim-splash'] = {'url': '/sfx/player/swim-splash.mp3', 'low': True,
                            'dur': round(len(sback) / SR, 3),
                            'names': [p[0] for p in SPLASH], 'levels': [p[5] for p in SPLASH],
                            'parts': [[o, l, v] for (o, l), v in zip(soffs, svol)]}
    print(f'  swim-splash  {len(SPLASH)} parts -> {os.path.getsize(spath) / 1024 if os.path.exists(spath) else 0:5.1f} KB, '
          f'parts {soffs}, vols {svol}')
    # v2.3.3664: the files of parts (the hoe's strikes, the clay's squeezes,
    # the hammer's blows): each part faded, peak-normalised and at its own
    # volume at the set's level, as the voices' are
    for name, src, windows, fi, fo, rate, level, group, pr in PART_SETS:
        sr = LOW if rate == 'low' else SR
        parts, at, offs = [], 0.0, []
        for start, length in windows:
            w = window(src, start, length, sr)
            if pr.get('hp'):
                w = highpass(w, pr['hp'], sr)
            w = fade(w, fi, fo, sr)
            w *= PEAK_FILE / max(1e-9, np.abs(w).max())
            parts.append(w)
            parts.append(np.zeros(int(PART_GAP * sr)))
            offs.append([round(at, 3), round(length, 3)])
            at += length + PART_GAP
        pw = np.concatenate(parts)
        ppath = os.path.join(ROOT, 'public', 'sfx', group, f'{name}.mp3')
        if not scan:
            encode(pw, sr, ppath, 64 if rate == 'low' else 128)
        pback = load(ppath) if not scan else load_resampled(pw, sr)
        pvol = []
        for off, length in offs:
            seg = pback[int(off * SR):int((off + length) * SR)]
            v = level * ref / max(1e-9, loudest50(seg))
            pvol.append(round(min(v, PEAK_PLAY / max(1e-9, np.abs(seg).max())), 3))
        table[name] = {'url': f'/sfx/{group}/{name}.mp3', 'level': level, 'low': rate == 'low',
                       'dur': round(len(pback) / SR, 3),
                       'parts': [[o, l, v] for (o, l), v in zip(offs, pvol)]}
        print(f'  {name:12s} {len(windows)} parts -> {os.path.getsize(ppath) / 1024 if os.path.exists(ppath) else 0:5.1f} KB'
              f' @{sr // 1000} kHz, parts {offs}, vols {pvol}')
    # the loops
    wind_db, river_db = side_rms_db(WIND), side_rms_db(RIVER)
    for name, src, start, length, xf, target, kbps in LOOPS:
        w = seamless(window(src, start, length, LOW), xf, LOW)
        want = wind_db if target == 'wind' else river_db
        w *= 10 ** ((want - rms_db(w)) / 20)
        if np.abs(w).max() > 0.7:
            w = soft_limit(w)
        w *= min(1.0, 0.95 / max(1e-9, np.abs(w).max()))
        path = os.path.join(ROOT, 'public', 'audio', 'ambient', f'{name}.mp3')
        if not scan:
            encode(w, LOW, path, kbps)
        back = load(path, LOW) if not scan else w
        loops[name] = {'url': f'/audio/ambient/{name}.mp3', 'rms': round(rms_db(back), 1),
                       'dur': round(len(back) / LOW, 3), 'target': target}
        kb = os.path.getsize(path) / 1024 if os.path.exists(path) else 0
        print(f'  {name:12s} loop {len(w) / LOW:5.2f} s -> {kb:5.1f} KB, rms {rms_db(back):5.1f} dBFS'
              f' (the {target}\'s {want:5.1f}), peak {np.abs(back).max():.2f}, decoded {len(back) * 4 / 1048576:.2f} MB')
    # the dance
    d = window(DANCE_SRC, DANCE_START, DANCE_LEN, 44100)
    # the window starts 5 ms before the first kick, where it is all but
    # silent: 2 ms in, so no click, and the last beat's tail out over 10 ms
    # into that silence -- the seam lands between two bars, as in the song
    a, b = int(0.002 * 44100), int(0.01 * 44100)
    d[:a] *= np.linspace(0, 1, a)
    d[-b:] *= np.linspace(1, 0, b)
    d *= PEAK_FILE / max(1e-9, np.abs(d).max())
    dd = np.tile(d, DANCE_TIMES)
    dpath = os.path.join(ROOT, 'public', 'audio', 'music', 'dance-beat.mp3')
    if not scan:
        encode(dd, 44100, dpath, 96)
    music_db = side_rms_db(MUSIC)
    dance_db = rms_db(dd)
    loops['dance'] = {'url': '/audio/music/dance-beat.mp3', 'rms': round(dance_db, 1), 'dur': DANCE_LEN * DANCE_TIMES,
                      'music': round(music_db, 1), 'beatMs': 500}
    print(f'  dance        {DANCE_LEN * DANCE_TIMES:.1f} s -> {os.path.getsize(dpath) / 1024 if os.path.exists(dpath) else 0:5.1f} KB,'
          f' rms {dance_db:5.1f} dBFS (the town\'s music {music_db:5.1f})')
    if scan:
        return 0
    with open(DATA, 'w') as fh:
        fh.write('/* GENERATED by tools/audio/cut_owner_sounds.py (v2.3.3462) -- do not edit by hand.\n'
                 '   The owner\'s recordings of 2026-10-18 (docs/SOUND-GAPS.md) and of 2026-10-27\n'
                 '   (v2.3.3664: assets/sfx-source/2026-10-27/): each one-shot\'s\n'
                 '   address, the volume at which it plays at its LEVEL (times sword-hit3 at the\n'
                 '   melee hit\'s 0.55 x HIT_GAIN, the loudest 50 ms, plain RMS -- the cue table\'s\n'
                 '   "1.0"), its length in seconds, and whether it is decoded at 24 kHz (LOW_RATE_SFX).\n'
                 '   The townsfolk\'s voices and the swim\'s splash are one file each: each part\n'
                 '   [offset, length, vol] (the splash\'s by `names`: in, out); so are the hoe\'s\n'
                 '   strikes, the clay\'s squeezes and the hammer\'s blows (v2.3.3664).\n'
                 '   The loops: address, whole-file RMS in dBFS, length; never in SFX_MANIFEST. */\n')
        fh.write('export const OWNER_SOUNDS = ' + json.dumps(table, indent=2) + ';\n\n')
        fh.write('export const OWNER_LOOPS = ' + json.dumps(loops, indent=2) + ';\n\n')
        fh.write(f'/* the references the loops were levelled against (dBFS, whole-file RMS) */\n'
                 f'export const LOOP_REFS = {json.dumps({"wind": round(wind_db, 1), "river": round(river_db, 1)})};\n')
    print('  wrote', os.path.relpath(DATA, ROOT))
    return 0


def load_resampled(w, sr):
    """--scan: what the game would decode, without writing a file."""
    if sr == SR:
        return w
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-',
                          '-ar', str(SR), '-f', 'f32le', '-'], input=w.astype(np.float32).tobytes(),
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


if __name__ == '__main__':
    sys.exit(main())
