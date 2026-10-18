#!/usr/bin/env python3
"""v2.3.3340: CUT THE OWNER'S MONSTER NOISES.

The owner, 2026-10-18, with four recordings:
  "You can use part of this 'growl and rawr' sound effect for the fire
   goblins."
  "Use this 'rattling bones' sound effect for the skeleton form of the mummy
   as that monster noise."
  "Use this sound for the slime monster noise."   (bouncy jelly creature)
  "Use this sound for the snowman noise."         (beast snarling)

The sources are kept in assets/sfx-source/monsters/ (as supplied; CREDITS.md
has where they came from).  Each is 3-8 s; a monster's noise is about one
second, so ONE window of each is cut:

  name             source                         window          why
  goblin-rawr      growl-and-roar 102417          3.31 s + 1.00   the roar's onset -- the "rawr" (the
                                                                  strongest second; its first growl at
                                                                  0.19 s is half as loud)
  skeleton-rattle  rattling-bones 105394          1.06 s + 1.00   the busiest rattle
  slime-bounce     bouncy jelly creature 387892   1.05 s + 0.70   a cluster of bounces
  snowman-snarl    beast-snarling 82801           0.04 s + 1.10   the snarl's start

The windows were chosen by measuring, not by ear (this tool's author cannot
listen): a 10 ms loudness envelope, every window of the length scored by its
mean loudness, minus how loud the 30 ms before its start is (a cut must not
land mid-sound) and its last 50 ms.  `--scan` prints the top three of each.

Each window is mono, faded in over 8 ms and out over its last 150 ms, peak
normalised to 0.9 (headroom for the encoder) and written as a 48 kHz mono mp3
(public/sfx/monster/noise-<name>.mp3, libmp3lame 128 kbps).  Its LEVEL is the
game's business, written to src/data/monsterNoiseClips.js (GENERATED): the
volume at which its loudness -- the RMS of its loudest 300 ms above 150 Hz,
which is what the ear weighs -- is NOISE_K of sword-hit3's at the melee hit's
0.55 (the yardstick the hit voices were levelled against, v2.3.3001), its peak
held under 0.66 (there is no limiter on the bus).

  python3 tools/audio/cut_monster_noises.py [--scan]
"""
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'sfx-source', 'monsters')
OUT = os.path.join(ROOT, 'public', 'sfx', 'monster')
DATA = os.path.join(ROOT, 'src', 'data', 'monsterNoiseClips.js')
SR = 48000

CLIPS = [
    ('goblin-rawr', 'freesound_community-growl-and-roar-102417.mp3', 3.31, 1.00),
    ('skeleton-rattle', 'freesound_community-rattling-bones-105394.mp3', 1.06, 1.00),
    ('slime-bounce', 'yodguard-bouncy_jelly_creature_movement-387892.mp3', 1.05, 0.70),
    ('snowman-snarl', 'freesound_community-beast-snarling-82801.mp3', 0.04, 1.10),
]
FADE_IN, FADE_OUT = 0.008, 0.150
PEAK_FILE, PEAK_PLAY = 0.9, 0.66
# a monster's call sits under the hits of the fight it starts: 0.75 of a
# melee hit's loudness when it is beside you (hitSounds earVol fades it after)
NOISE_K = 0.75
REF = ('sword-hit3', os.path.join(ROOT, 'public', 'sfx', 'sword', 'sword-hit3.mp3'), 0.55)


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


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


def envelope(x, ms=10):
    n = SR * ms // 1000
    return np.array([np.sqrt((x[i:i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])


def scan():
    for name, f, _s, L in CLIPS:
        e = envelope(load(os.path.join(SRC, f)))
        n, g = int(L * 100), e.max()
        scored = sorted(((e[s:s + n].mean() - 1.5 * e[max(0, s - 3):s].mean() - 0.5 * e[s + n - 5:s + n].mean()) / g, s)
                        for s in range(1, len(e) - n))[::-1]
        picks = []
        for sc, s in scored:
            if all(abs(s - q) > n for _, q in picks):
                picks.append((sc, s))
            if len(picks) == 3:
                break
        print(name, ', '.join(f'{s / 100:.2f}s ({sc:.3f})' for sc, s in picks))


def main():
    if '--scan' in sys.argv:
        scan()
        return 0
    ref = load(REF[1])
    ref_loud = loudness(ref) * REF[2]
    target = NOISE_K * ref_loud
    os.makedirs(OUT, exist_ok=True)
    table = {}
    for name, f, start, length in CLIPS:
        x = load(os.path.join(SRC, f))
        a, b = int(start * SR), int((start + length) * SR)
        if b > len(x):
            raise SystemExit(f'ABORT {name}: the window ends past the recording ({len(x) / SR:.2f} s)')
        w = x[a:b].copy()
        fi, fo = int(FADE_IN * SR), int(FADE_OUT * SR)
        w[:fi] *= np.linspace(0, 1, fi)
        w[-fo:] *= np.linspace(1, 0, fo) ** 2
        w *= PEAK_FILE / max(1e-9, np.abs(w).max())
        path = os.path.join(OUT, f'noise-{name}.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', str(SR), '-ac', '1', path],
                       input=w.astype(np.float32).tobytes(), check=True)
        back = load(path)    # what the game will decode
        vol = target / max(1e-9, loudness(back))
        vol = min(vol, PEAK_PLAY / max(1e-9, np.abs(back).max()))
        table[name] = {'url': f'/sfx/monster/noise-{name}.mp3', 'vol': round(vol, 3),
                       'dur': round(len(back) / SR, 3)}
        print(f'  {name:16s} {start:5.2f} s + {length:.2f}  -> {os.path.getsize(path) / 1024:5.1f} KB, '
              f'vol {vol:.3f} (peak at it {np.abs(back).max() * vol:.2f}), {len(back) / SR:.2f} s decoded')
    with open(DATA, 'w') as fh:
        fh.write('/* GENERATED by tools/audio/cut_monster_noises.py (v2.3.3340) -- do not edit by hand.\n'
                 '   The owner\'s monster noises: each clip\'s address, the volume at which it is\n'
                 f'   {NOISE_K} of a melee hit\'s loudness (sword-hit3 at {REF[2]}), and its length in seconds. */\n')
        fh.write('export const MONSTER_NOISE_CLIPS = ' + json.dumps(table, indent=2) + ';\n')
    print('  wrote', os.path.relpath(DATA, ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
