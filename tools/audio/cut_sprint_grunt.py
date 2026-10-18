#!/usr/bin/env python3
"""v2.3.3455: CUT THE OWNER'S SPRINT GRUNT.

The owner, 2026-10-18: "the noise for sprint needs to be changed.  It's a
loud incoherent sound for sprint button.  Make it a grunt or something",
with "Grunt 1" (freesound_community, id 85280; CREDITS.md), kept as supplied
in assets/sfx-source/voice/.

The recording is 1.44 s: 0.57 s of silence, then the grunt, about half a
second, and its tail.  The grunt is found, not typed in (this tool's author
cannot listen): a 10 ms loudness envelope, from the first frame at ONSET of
its loudest, less 10 ms, to the last frame at ONSET, plus 30 ms.

It is cut mono, faded in over 5 ms and out over its last 80 ms, peak
normalised to 0.9 (headroom for the encoder) and written as a 48 kHz mono mp3
(public/sfx/voice/sprint-grunt.mp3, libmp3lame 128 kbps).  Its LEVEL is the
game's business, written to src/data/sprintGrunt.js (GENERATED): the volume
at which its loudness -- the RMS of its loudest 300 ms above 150 Hz, what the
ear weighs (the monster noises' measure, cut_monster_noises.py) -- is GRUNT_K
of sword-hit3's at the melee hit's 0.55, its peak held under 0.66 (there is
no limiter on the bus).  The push it replaces (the arrow's flight at 3.8,
v2.3.3336) is measured on the same scale and printed beside it.

Every file is heard as ONE SPEAKER plays it: a stereo file folded (L + R) / 2,
as Web Audio folds it and as each speaker carries a centred sound -- never
ffmpeg's own `-ac`, which folds stereo at 0.707 a channel, 3 dB up, so a
stereo yardstick (sword-hit3, the arrow's flight) read 1.41x its real level
beside a mono cut (found again by the owner's-recordings tool,
cut_owner_sounds.py, the same day).  The first cut measured that way: its GRUNT_K 0.5
was 0.71 heard, and that is the level the game was tested at, kept here.
In the game's own terms (mp-cuelevels: the loudest 50 ms against
sword-hit3 at 0.55 x HIT_GAIN) the grunt is ~0.25 of a hit, the push ~0.8.

  python3 tools/audio/cut_sprint_grunt.py
"""
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'sfx-source', 'voice', 'freesound_community-grunt-1-85280.mp3')
OUT = os.path.join(ROOT, 'public', 'sfx', 'voice', 'sprint-grunt.mp3')
DATA = os.path.join(ROOT, 'src', 'data', 'sprintGrunt.js')
SR = 48000
ONSET = 0.03
FADE_IN, FADE_OUT = 0.005, 0.080
PEAK_FILE, PEAK_PLAY = 0.9, 0.66
# your own breath as a sprint starts: under the hits of a fight, and under
# the monsters' calls -- 0.7 of the yardstick as a speaker plays it (the
# first cut's 0.5 on ffmpeg's louder fold, the level the game was tested at)
GRUNT_K = 0.7
REF = ('sword-hit3', os.path.join(ROOT, 'public', 'sfx', 'sword', 'sword-hit3.mp3'), 0.55)
OLD = ('arrow-fly', os.path.join(ROOT, 'public', 'sfx', 'bow', 'arrow-fly.mp3'), 0.03, 0.24, 3.8)


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


def loudness(x):
    """RMS of the loudest 300 ms above 150 Hz."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[f < 150] = 0
    y = np.fft.irfft(X, len(x))
    n = int(SR * 0.3)
    if len(y) <= n:
        return float(np.sqrt((y ** 2).mean()))
    step = n // 6
    return max(float(np.sqrt((y[i:i + n] ** 2).mean())) for i in range(0, len(y) - n, step))


def main():
    x = load(SRC)
    n = SR // 100
    env = np.array([np.sqrt((x[i:i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    on = np.nonzero(env >= ONSET * env.max())[0]
    if not len(on):
        raise SystemExit('ABORT: no grunt found in the recording')
    start = max(0.0, on[0] / 100 - 0.010)
    end = min(len(x) / SR, (on[-1] + 1) / 100 + 0.030)
    if not (0.2 <= end - start <= 1.0):
        raise SystemExit(f'ABORT: the grunt found is {end - start:.2f} s long -- not the recording this was written for')
    w = x[int(start * SR):int(end * SR)].copy()
    fi, fo = int(FADE_IN * SR), int(FADE_OUT * SR)
    w[:fi] *= np.linspace(0, 1, fi)
    w[-fo:] *= np.linspace(1, 0, fo) ** 2
    w *= PEAK_FILE / max(1e-9, np.abs(w).max())
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', str(SR), '-ac', '1', OUT],
                   input=w.astype(np.float32).tobytes(), check=True)
    back = load(OUT)    # what the game will decode
    target = GRUNT_K * loudness(load(REF[1])) * REF[2]
    vol = target / max(1e-9, loudness(back))
    vol = min(vol, PEAK_PLAY / max(1e-9, np.abs(back).max()))
    old = load(OLD[1])
    old_seg = old[int(OLD[2] * SR):int((OLD[2] + OLD[3]) * SR)]
    old_loud, new_loud = loudness(old_seg) * OLD[4], loudness(back) * vol
    with open(DATA, 'w') as fh:
        fh.write('/* GENERATED by tools/audio/cut_sprint_grunt.py (v2.3.3455) -- do not edit by hand.\n'
                 '   The owner\'s sprint grunt: its address, the volume at which it is\n'
                 f'   {GRUNT_K} of a melee hit\'s loudness (sword-hit3 at {REF[2]}), and its length in seconds. */\n')
        fh.write('export const SPRINT_GRUNT = ' + json.dumps(
            {'url': '/sfx/voice/sprint-grunt.mp3', 'vol': round(vol, 3), 'dur': round(len(back) / SR, 3)}, indent=2) + ';\n')
    print(f'  grunt {start:.2f}-{end:.2f} s -> {os.path.getsize(OUT) / 1024:.1f} KB, {len(back) / SR:.2f} s decoded, '
          f'vol {vol:.3f} (peak at it {np.abs(back).max() * vol:.2f})')
    print(f'  loudness: the grunt {new_loud:.4f}, the old push {old_loud:.4f} '
          f'({old_loud / max(1e-9, new_loud):.1f}x the grunt), a melee hit {loudness(load(REF[1])) * REF[2]:.4f}')
    print('  wrote', os.path.relpath(OUT, ROOT), 'and', os.path.relpath(DATA, ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
