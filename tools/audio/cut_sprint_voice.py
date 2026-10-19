#!/usr/bin/env python3
"""v2.3.3455: CUT THE OWNER'S SPRINT GRUNT.  v2.3.3475: AND THEIR TIRED BREATH.

v2.3.3498: THE GRUNT IS THE ANGRY GRUNT NOW.  The owner, after more play:
"Wrong sound for starting sprint and ending sprint (hurt sound) instead of
effort grunt", and "I think sounds were wired in the wrong places.  The
labels should tell you where they go."  Measured, the two grunts the owner
sent were the wrong way round for how they SOUND: "Grunt 1" (85280) starts
at ~330 Hz and falls to ~150 Hz, about 900 Hz bright -- the shape and
colour of the hurt "uh!" (male_hurt7 48124, 320 -> 143 Hz, ~910 Hz) -- while
"angry grunt" (103204), wired as a hurt sound, is a low strained "hnh" at
80-90 Hz, ~400 Hz bright: the effort.  So the sprint is cut from the angry
grunt (SRC below, assets/sfx-source/player/), and Grunt 1 is the second hurt
sound (cut_owner_sounds.py hurt-2).  The level rule is unchanged.

The owner, 2026-10-18: "the noise for sprint needs to be changed.  It's a
loud incoherent sound for sprint button.  Make it a grunt or something",
with "Grunt 1" (freesound_community, id 85280; CREDITS.md); then, of the
sound as a sprint runs out of stamina, "Maybe alternate between grunt and
tired breath", and the next day "Out of Breath Male" (voicebosch, id 176715):
"Here's the out of breath".  Both kept as supplied in assets/sfx-source/voice/.
(This tool was cut_sprint_grunt.py until the breath came.)

THE GRUNT.  The recording is 1.44 s: 0.57 s of silence, then the grunt, about
half a second, and its tail.  The grunt is found, not typed in (this tool's
author cannot listen): a 10 ms loudness envelope, from the first frame at
ONSET of its loudest, less 10 ms, to the last frame at ONSET, plus 30 ms.

THE BREATH.  The recording is 48 s of six takes.  The first (0.4-5.1 s) is
plain tired breathing: a breath out every ~1.2 s, a quieter breath in between,
no voice in either (no harmonics under a spectrogram, 1-7% of the energy under
400 Hz).  The rest are loud voiced gasps and groans, a grunt's cousins, which
the breath is meant to stand apart from.  BREATH_CUT is the first take's
second and third breaths out with the breath in between, 1.51-3.23 s, picked
off its spectrogram and 20 ms envelope, each end in the silence between two
breaths; the tool checks it still is (quiet ends, two breaths out).

Each is cut mono, faded in and out, peak normalised to 0.9 (headroom for the
encoder) and written as a 48 kHz mono mp3 (public/sfx/voice/, libmp3lame
128 kbps).  Their LEVELS are the game's business, written to
src/data/sprintGrunt.js and src/data/sprintBreath.js (GENERATED):

  the grunt   the volume at which its loudness -- the RMS of its loudest
              300 ms above 150 Hz (the monster noises' measure,
              cut_monster_noises.py) -- is GRUNT_K of sword-hit3's at the melee
              hit's 0.55, its peak held under 0.66 (there is no limiter on the
              bus).  The push it replaces (the arrow's flight at 3.8,
              v2.3.3336) is measured on the same scale and printed beside it.
  the breath  BREATH_K of the grunt's loudness BY EAR (A-weighted, the loudest
              300 ms): a breath's energy sits high, where the ear is keenest,
              so on the plain scale it would sound louder than the grunt it
              takes turns with.

Every file is heard as ONE SPEAKER plays it: a stereo file folded (L + R) / 2,
as Web Audio folds it and as each speaker carries a centred sound -- never
ffmpeg's own `-ac`, which folds stereo at 0.707 a channel, 3 dB up, so a
stereo yardstick (sword-hit3, the arrow's flight) read 1.41x its real level
beside a mono cut (found again by the owner's-recordings tool,
cut_owner_sounds.py, the same day; TRAPS §230).  The first cut measured that
way: its GRUNT_K 0.5 was 0.71 heard, and that is the level the game was tested
at, kept here.  In the game's own terms (mp-cuelevels: the loudest 50 ms
against sword-hit3 at 0.55 x HIT_GAIN) the grunt is ~0.25 of a hit, the push
~0.8.

  python3 tools/audio/cut_sprint_voice.py
"""
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VOICE = os.path.join(ROOT, 'assets', 'sfx-source', 'voice')
SRC = os.path.join(ROOT, 'assets', 'sfx-source', 'player', 'freesound_community-angry-grunt-103204.mp3')   # v2.3.3498: the effort grunt (was voice/grunt-1, which sounds hurt)
OUT = os.path.join(ROOT, 'public', 'sfx', 'voice', 'sprint-grunt.mp3')
DATA = os.path.join(ROOT, 'src', 'data', 'sprintGrunt.js')
SRC_BREATH = os.path.join(VOICE, 'voicebosch-out-of-breath-male-176715.mp3')
OUT_BREATH = os.path.join(ROOT, 'public', 'sfx', 'voice', 'sprint-breath.mp3')
DATA_BREATH = os.path.join(ROOT, 'src', 'data', 'sprintBreath.js')
SR = 48000
ONSET = 0.03
FADE_IN, FADE_OUT = 0.005, 0.080
PEAK_FILE, PEAK_PLAY = 0.9, 0.66
# your own breath as a sprint starts: under the hits of a fight, and under
# the monsters' calls -- 0.7 of the yardstick as a speaker plays it (the
# first cut's 0.5 on ffmpeg's louder fold, the level the game was tested at)
GRUNT_K = 0.7
# v2.3.3498: the first grunt (Grunt 1 at GRUNT_K) by ear, 0.667 of a melee
# hit's A-weighted loudness -- the level the owner heard and kept
GRUNT_EAR_K = 0.667
REF = ('sword-hit3', os.path.join(ROOT, 'public', 'sfx', 'sword', 'sword-hit3.mp3'), 0.55)
OLD = ('arrow-fly', os.path.join(ROOT, 'public', 'sfx', 'bow', 'arrow-fly.mp3'), 0.03, 0.24, 3.8)
# two breaths out and the breath in between, from the first take (see above)
BREATH_CUT = (1.51, 3.23)
BREATH_FADE_IN, BREATH_FADE_OUT = 0.010, 0.060
# a touch under the grunt it takes turns with, by ear
BREATH_K = 0.9


def load(path):
    """The file as one speaker plays it: its own channels, folded (L + R) / 2
    when it has two.  Never ffmpeg's `-ac`: it folds stereo at 0.707 a
    channel and spreads mono at 0.707 a side, 3 dB off either way."""
    ch = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels',
                         '-of', 'csv=p=0', path], capture_output=True, check=True, text=True).stdout.strip()
    ch = max(1, int(ch or 1))
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    return x[:len(x) // ch * ch].reshape(-1, ch).mean(axis=1) if ch > 1 else x


def loudest(y, secs=0.3):
    """RMS of the loudest `secs` of y."""
    n = int(SR * secs)
    if len(y) <= n:
        return float(np.sqrt((y ** 2).mean()))
    step = n // 6
    return max(float(np.sqrt((y[i:i + n] ** 2).mean())) for i in range(0, len(y) - n, step))


def loudness(x):
    """RMS of the loudest 300 ms above 150 Hz."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[f < 150] = 0
    return loudest(np.fft.irfft(X, len(x)))


def loudness_by_ear(x):
    """RMS of the loudest 300 ms, A-weighted (IEC 61672: 1 at 1 kHz)."""
    X = np.fft.rfft(x)
    f2 = np.fft.rfftfreq(len(x), 1 / SR) ** 2
    ra = (12194.0 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * np.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2))
                                     * (f2 + 12194.0 ** 2))
    return loudest(np.fft.irfft(X * ra * 10 ** (2.0 / 20), len(x)))


def encode(w, out):
    """w (mono, faded) peak-normalised to PEAK_FILE, as a 48 kHz mono mp3;
    returns it as the game will decode it."""
    w = w * (PEAK_FILE / max(1e-9, np.abs(w).max()))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', str(SR), '-ac', '1', out],
                   input=w.astype(np.float32).tobytes(), check=True)
    return load(out)


def write_data(path, tag, name, about, url, vol, back):
    with open(path, 'w') as fh:
        fh.write(f'/* GENERATED by tools/audio/cut_sprint_voice.py ({tag}) -- do not edit by hand.\n'
                 f'   {about}, and its length in seconds. */\n')
        fh.write(f'export const {name} = ' + json.dumps(
            {'url': url, 'vol': round(vol, 3), 'dur': round(len(back) / SR, 3)}, indent=2) + ';\n')


def highpass(w, fc, order=4):
    """v2.3.3498: a causal Butterworth high-pass (RBJ biquads in series:
    order/2 of them at the Butterworth Q's) -- cut_owner_sounds.py's own."""
    import math
    y = w.copy()
    for k in range(order // 2):
        q = 1 / (2 * math.sin(math.pi * (2 * k + 1) / (2 * order)))
        om = 2 * math.pi * fc / SR
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


# v2.3.3498: the angry grunt's fundamental sits at 80-90 Hz, and that rumble
# is the "fleshy" thump the owner heard in the old push-off (v2.3.3336;
# mp-cuelevels' rush-of-air rule): taken off below GRUNT_HP Hz, its strain --
# the harmonics a phone's speaker actually plays -- kept whole
GRUNT_HP = 220


def cut_grunt():
    x = highpass(load(SRC), GRUNT_HP)
    n = SR // 100
    env = np.array([np.sqrt((x[i:i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    on = np.nonzero(env >= ONSET * env.max())[0]
    if not len(on):
        raise SystemExit('ABORT: no grunt found in the recording')
    start = max(0.0, on[0] / 100 - 0.010)
    end = min(len(x) / SR, (on[-1] + 1) / 100 + 0.030)
    if not (0.15 <= end - start <= 1.0):   # v2.3.3498: 0.2 -> 0.15, the angry grunt is a short one (~0.2 s)
        raise SystemExit(f'ABORT: the grunt found is {end - start:.2f} s long -- not the recording this was written for')
    w = x[int(start * SR):int(end * SR)].copy()
    fi, fo = int(FADE_IN * SR), int(FADE_OUT * SR)
    w[:fi] *= np.linspace(0, 1, fi)
    w[-fo:] *= np.linspace(1, 0, fo) ** 2
    back = encode(w, OUT)
    # v2.3.3498: levelled BY EAR (A-weighted), to the first grunt's own level
    # by ear (GRUNT_EAR_K) -- the angry grunt's strain sits at 200-500 Hz,
    # where the ear is less keen, so on GRUNT_K's plain scale it came out
    # 3.6 dB quieter to the ear than the grunt it replaces
    target = GRUNT_EAR_K * loudness_by_ear(load(REF[1]) * REF[2])
    vol = target / max(1e-9, loudness_by_ear(back))
    vol = min(vol, PEAK_PLAY / max(1e-9, np.abs(back).max()))
    old = load(OLD[1])
    old_seg = old[int(OLD[2] * SR):int((OLD[2] + OLD[3]) * SR)]
    old_loud, new_loud = loudness(old_seg) * OLD[4], loudness(back) * vol
    write_data(DATA, 'v2.3.3498', 'SPRINT_GRUNT',
               "The owner's sprint grunt (their \"angry grunt\", the effort): its address, the volume at which it is\n"
               f"   {GRUNT_EAR_K} of a melee hit's loudness by ear (sword-hit3 at {REF[2]})",
               '/sfx/voice/sprint-grunt.mp3', vol, back)
    print(f'  grunt {start:.2f}-{end:.2f} s -> {os.path.getsize(OUT) / 1024:.1f} KB, {len(back) / SR:.2f} s decoded, '
          f'vol {vol:.3f} (peak at it {np.abs(back).max() * vol:.2f})')
    print(f'  loudness: the grunt {new_loud:.4f}, the old push {old_loud:.4f} '
          f'({old_loud / max(1e-9, new_loud):.1f}x the grunt), a melee hit {loudness(load(REF[1])) * REF[2]:.4f}')
    return back, vol


def cut_breath(grunt, grunt_vol):
    x = load(SRC_BREATH)
    a, b = int(BREATH_CUT[0] * SR), int(BREATH_CUT[1] * SR)
    w = x[a:b].copy()
    n = SR // 50
    env = np.array([np.sqrt((w[i:i + n] ** 2).mean()) for i in range(0, len(w) - n + 1, n)])
    top = env.max()
    if not (env[0] < 0.05 * top and env[-1] < 0.05 * top):
        raise SystemExit(f'ABORT: the breath cut does not start and end between breaths '
                         f'({env[0] / top:.2f}, {env[-1] / top:.2f} of its loudest) -- not the recording this was written for')
    # breaths out: stretches at 40% of the loudest, parted by a dip under 15%
    outs, low = 0, True
    for e in env:
        if e >= 0.4 * top and low:
            outs, low = outs + 1, False
        elif e < 0.15 * top:
            low = True
    if outs != 2:
        raise SystemExit(f'ABORT: the breath cut holds {outs} breath(s) out, not 2 -- not the recording this was written for')
    fi, fo = int(BREATH_FADE_IN * SR), int(BREATH_FADE_OUT * SR)
    w[:fi] *= np.linspace(0, 1, fi)
    w[-fo:] *= np.linspace(1, 0, fo) ** 2
    back = encode(w, OUT_BREATH)
    target = BREATH_K * loudness_by_ear(grunt * grunt_vol)
    vol = target / max(1e-9, loudness_by_ear(back))
    vol = min(vol, PEAK_PLAY / max(1e-9, np.abs(back).max()))
    write_data(DATA_BREATH, 'v2.3.3475', 'SPRINT_BREATH',
               "The owner's tired breath (two breaths out of \"Out of Breath Male\"): its\n"
               f"   address, the volume at which it is {BREATH_K} of the sprint grunt's\n"
               "   loudness by ear",
               '/sfx/voice/sprint-breath.mp3', vol, back)
    print(f'  breath {BREATH_CUT[0]:.2f}-{BREATH_CUT[1]:.2f} s -> {os.path.getsize(OUT_BREATH) / 1024:.1f} KB, '
          f'{len(back) / SR:.2f} s decoded, vol {vol:.3f} (peak at it {np.abs(back).max() * vol:.2f})')
    print(f'  by ear: the breath {loudness_by_ear(back) * vol:.4f}, the grunt {loudness_by_ear(grunt) * grunt_vol:.4f}; '
          f'plain: the breath {loudness(back) * vol:.4f}, the grunt {loudness(grunt) * grunt_vol:.4f}')


def main():
    grunt, grunt_vol = cut_grunt()
    cut_breath(grunt, grunt_vol)
    print('  wrote', ', '.join(os.path.relpath(p, ROOT) for p in (OUT, DATA, OUT_BREATH, DATA_BREATH)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
