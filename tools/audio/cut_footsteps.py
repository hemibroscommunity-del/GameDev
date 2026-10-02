#!/usr/bin/env python3
"""v2.3.2967: THE OWNER'S FOOTSTEP RECORDINGS -> one short clip a ground.

Owner, 2026-10-01: "I also want to give each ground type its own footstep
sound.  Grass sounds like walking through grass, walking through rocks sounds
like walking through rocks etc." -- then, with eleven recordings from
Freesound: "Here are the footstep sounds you can use in order of how you have
them to me (you can use current footstep sound for dirt)."

The recordings are nothing alike: five are ONE step each (grass, gravel,
sand since v2.3.2969, wood, the ash "soft impact"), five are 4 to 32 seconds
of someone walking (stone, snow, ice, mud, metal), at 44.1 or 48 kHz, 16- or
24-bit, integer or float, one or two channels -- and their levels run from a
step peaking at full scale (wood) to a mud walk 13 dB too quiet.  The game wants none of that: it plays ONE step per
foot plant, about every 0.4 s, at the level of the step it has today.  So,
for each ground:

  1. FIND THE STEPS.  Mono, rumble off (50 Hz), a 10 ms loudness curve of
     the sound with its low end off (`hp`: the wind, the handling, the surf
     live down there and the crunch of a step does not), and a step is a
     stretch of it standing `on` dB over the walk's quiet.  A one-step file
     is all one step.
  2. CUT EACH ONE CLEAN: from where it rises out of the quiet to where it
     falls back into it, never into the next step and never longer than
     MAX_LEN (a one-step file: to SINGLE_DECAY dB under its peak, at most
     SINGLE_LEN), with a 3 ms fade in and a 40 ms fade out, so no clip
     starts or ends with a click.
  3. KEEP THE BEST FEW: steps that stand out from the background most, die
     away on their own (not cut off by the next), and are neither the
     loudest nor the faintest of the walk -- spread over the recording, so
     the few kept are different steps, not one step's echoes.  (v2.3.2969:
     or the steps chosen by their starts, `pick`, where the owner heard the
     best few fall short: mud's single squelches.)
  4. MATCH THE LOUDNESS OF TODAY'S STEP: footstep-v3 (dirt, which keeps its
     own sound) measured the way ears hear it -- K-weighted (ITU-R BS.1770,
     the pyloudnorm filters), the loudest 100 ms of the step -- and every new
     step brought to that, so footstep() plays each ground at the volume it
     already uses.  A step that would then clip is held at -1 dBFS instead.
  5. ONE MP3 A GROUND, its steps in a row with silence between (mono,
     44.1 kHz, 96 kbps), and the place of every step in it written to
     src/data/footstepClips.js (and, v2.3.2968, the same table to
     public/sfx/footstep/clips.json for the Ground Studio's play buttons)
     -- MEASURED in the encoded file, not assumed,
     because an mp3 decoder may put the start of the sound a few hundred
     samples later than it went in.  Each step is played with LEAD s before
     it and TAIL s after, so that difference never cuts a step.

Usage (the owner's files are not kept in the repository -- they were
uploaded to a session; the clips made from them are):

    pip install numpy scipy soundfile lameenc pyloudnorm
    python3 tools/audio/cut_footsteps.py <folder with the WAVs> [--plot out.png]

Files are found by their Freesound id, which every Freesound download
carries in its name (`<id>__<user>__<title>.wav`).
"""
import glob
import json
import math
import os
import sys
from math import gcd

import lameenc
import numpy as np
import pyloudnorm
import soundfile as sf
from scipy.signal import butter, resample_poly, sosfiltfilt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_DIR = os.path.join(ROOT, 'public', 'sfx', 'footstep')
OUT_JS = os.path.join(ROOT, 'src', 'data', 'footstepClips.js')
OUT_CLIPS = os.path.join(OUT_DIR, 'clips.json')   # v2.3.2968: for the Ground Studio
REFERENCE = os.path.join(OUT_DIR, 'footstep-v3.mp3')
# footstep-v3's two steps, as footstep() plays them (gameDisplay.js)
REFERENCE_STEPS = [(0.08, 0.34), (0.92, 0.34)]

SR = 44100
KBPS = 96
MAX_LEN = 0.45       # s, the longest step kept from a walk (steps come every ~0.4 s)
SINGLE_LEN = 0.45    # s, the longest kept of a one-step file
SINGLE_DECAY = 45.0  # dB under its peak that a one-step file has died away
LEAD = 0.02          # s played before each step
TAIL = 0.05          # s played after it
GAP = 0.14           # s of silence between steps in the file
HEADROOM = 10 ** (-1 / 20)   # -1 dBFS

# The grounds, in the order of the owner's list (dirt keeps footstep-v3).
# `id` is the Freesound id; `single` a file that is one step; `keep` how many
# steps to keep of a walk; `hp` the low end taken off where the steps are
# FOUND (wind, handling -- the clip itself keeps it); `on` how far (dB) a
# step stands over the walk's quiet; `most` its own longest step; `pick` the
# steps kept, by their starts.  The forest floor has no recording yet -- the
# owner sent the wood step twice -- so footstep() plays grass there for now.
SOURCES = [
    dict(sound='grass',  id=384869, by='Ali_6868',      title='Right Grassgrassy Footstep 4', single=True),
    dict(sound='gravel', id=384880, by='Ali_6868',      title='Right Gravel Footstep 5',      single=True),
    dict(sound='stone',  id=816017, by='qubodup',       title='Dry Footsteps Loop',           keep=5, hp=200),
    # sand, v2.3.2970: the owner's second recording, "These might be
    # better" -- one clean, strong step on fine sand, its crunch over by
    # 0.14 s and a soft hiss after it to 0.6 s, so its first `most` s.  The
    # first, a beach walk (amholma, 376797), was recorded beside the surf:
    # its steps stood 2-4.5 dB over the waves, and no cleaning made them
    # more than a burst of hiss (v2.3.2967-2969).
    dict(sound='sand',   id=778568, by='BlondPanda',    title='Steps Fine Snow Or Sand Strong 29', single=True, most=0.32),
    dict(sound='snow',   id=420559, by='Percy Duke',    title='Walking Through Snow',         keep=5, hp=1000),
    dict(sound='ice',    id=416967, by='InspectorJ',    title='Running, Ice, A',              keep=5, hp=1000, on=14),
    # mud, v2.3.2969: the walk's steps are a squelch and a suck, often two
    # or three hits in one (the five v2.3.2967 kept had two each, a "squish-
    # squash" a step) -- so the five kept are steps that are ONE squelch
    # (`pick`: their starts, s, among the steps found), each to its own end
    dict(sound='mud',    id=446257, by='lukiacostello', title='Walking In Mud',               hp=1000, pick=[1.77, 10.05, 10.93, 11.51, 11.91]),
    # NOT USED -- the owner's second mud, arnaud coutancier's "walking in the
    # mud" (582400): louder and cleaner, but its maker licenses their sounds
    # Attribution NonCommercial (CC BY-NC 3.0), and a game with a paid
    # supporter pass (WORLD-ARCHITECTURE §11) is commercial.  Should the
    # license allow it one day, this is the cut, five single squelches:
    # dict(sound='mud', id=582400, by='arnaud coutancier', title='walking in the mud', hp=1000, on=14,
    #      pick=[2.38, 16.51, 18.65, 21.19, 26.20]),
    # ash, v2.3.2969: a "powder soft impact" ran 0.46 s, a long "pfff" more
    # than a step -- now its first `most` s, a short puff.  No ground plays it
    # since the owner's pictures came in (footsteps.js): it stays a choice
    dict(sound='ash',    id=768596, by='jazzkdh',       title='Powder Soft Impact 006',       single=True, most=0.22),
    dict(sound='wood',   id=434759, by='notarget',      title='Wood Step Sample 4',           single=True),
    dict(sound='metal',  id=208101, by='Phil25',        title='Metal Steps',                  keep=5, hp=200),
]


def load(path):
    """Any WAV (int or float, extensible too) -> mono float at SR, rumble off."""
    d, sr = sf.read(path, always_2d=True, dtype='float64')
    m = d.mean(axis=1)
    if sr != SR:
        g = gcd(SR, sr)
        m = resample_poly(m, SR // g, sr // g)
    m = sosfiltfilt(butter(2, 50, 'hp', fs=SR, output='sos'), m)
    return m


HOP = int(0.0025 * SR)
WIN = int(0.010 * SR)


def curve(m):
    """The loudness curve: RMS of 10 ms windows every 2.5 ms, in dB."""
    c = np.concatenate([[0.0], np.cumsum(m * m)])
    idx = np.arange(0, max(1, len(m) - WIN), HOP)
    e = np.sqrt(np.maximum(c[np.minimum(idx + WIN, len(m))] - c[idx], 0) / WIN)
    return 20 * np.log10(e + 1e-9)


def single(db, most=SINGLE_LEN):
    """A one-step file: from where it first rises out of the quiet to where
    it has died away (SINGLE_DECAY dB under its peak), at most `most` s."""
    top = db.max()
    s = int(np.argmax(db > top - 35))
    cap = min(len(db) - 1, s + int(most * SR / HOP))
    e = min(int(np.argmax(db)), cap)
    while e < cap and db[e] > top - SINGLE_DECAY:
        e += 1
    return s, e, e < cap


def events(db, on, merge=0.06, least=0.04, floor=None):
    """A walk's steps: the stretches of the curve more than `on` dB over its
    quiet (its 15th percentile), joined where they part for less than
    `merge` s, each widened to where it rose out of / fell back into the
    quiet (4 dB over it)."""
    if floor is None:
        floor = float(np.percentile(db, 15))
    hot = db > floor + on
    runs, i, n = [], 0, len(db)
    while i < n:
        if not hot[i]:
            i += 1
            continue
        j = i
        while j < n and hot[j]:
            j += 1
        if runs and (i - runs[-1][1]) * HOP / SR < merge:
            runs[-1][1] = j
        else:
            runs.append([i, j])
        i = j
    out = []
    for i, j in runs:
        if (j - i) * HOP / SR < least:
            continue
        s, e = i, j
        lo, hi = max(0, i - int(0.08 * SR / HOP)), min(n - 1, j + int(0.15 * SR / HOP))
        while s > lo and db[s - 1] > floor + 4:
            s -= 1
        while e < hi and db[e] > floor + 4:
            e += 1
        out.append(dict(s=s, e=e, peak=float(db[i:j].max()), floor=floor))
    # never into the next one
    for a, b in zip(out, out[1:]):
        if a['e'] > b['s']:
            a['e'] = b['s']
    return out


def shape(x, natural=True):
    """3 ms fade in, 40 ms fade out (cosine), so no clip clicks -- 120 ms
    where the sound was still going when it was cut (a grass swish, the ash
    puff), so it fades away instead of stopping."""
    x = x.copy()
    fi, fo = int(0.003 * SR), min(int((0.04 if natural else 0.12) * SR), len(x) // 3)
    x[:fi] *= 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, fi))
    x[-fo:] *= 0.5 + 0.5 * np.cos(np.linspace(0, math.pi, fo))
    return x


def detection(src, m):
    """What the steps are found in: the sound with its low end off (wind,
    handling)."""
    x = m
    if src.get('hp'):
        x = sosfiltfilt(butter(4, src['hp'], 'hp', fs=SR, output='sos'), x)
    return x


def steps_of(src, m):
    """-> the steps to keep, each {a, b} in samples of `m`, and the curve."""
    db = curve(detection(src, m))
    if src.get('single'):
        s, e, natural = single(db, src.get('most', SINGLE_LEN))
        a = max(0, s * HOP - int(0.004 * SR))
        b = min(len(m), e * HOP + WIN)
        return [dict(a=a, b=b, natural=natural, peak=float(db.max()))], db
    found = events(db, src.get('on', 12))
    if not found:
        raise SystemExit(f"{src['sound']}: no steps found")
    med = float(np.median([f['peak'] for f in found]))
    for f in found:
        f['a'] = max(0, f['s'] * HOP - int(0.005 * SR))
        f['b'] = min(len(m), f['e'] * HOP + WIN + int(0.01 * SR))
        n = (f['b'] - f['a']) / SR
        most = src.get('most', MAX_LEN)
        f['natural'] = n <= most
        if not f['natural']:
            f['b'] = f['a'] + int(most * SR)
        # a step that never dies away before MAX_LEN is two run together, or
        # not a step (a wave): kept only if nothing better is there
        f['score'] = (f['peak'] - f['floor']) - 1.5 * abs(f['peak'] - med) - (30 if not f['natural'] else 0) \
            - (20 if n < 0.08 else 0)
    if src.get('pick'):
        # v2.3.2969: the steps found that start nearest these times (s)
        keep = [min(found, key=lambda f: abs(f['s'] * HOP / SR - t)) for t in src['pick']]
        far = [t for t, f in zip(src['pick'], keep) if abs(f['s'] * HOP / SR - t) > 0.03]
        if far or len({id(f) for f in keep}) < len(keep):
            raise SystemExit(f"{src['sound']}: no step found starting at {far or src['pick']}")
        return sorted(keep, key=lambda f: f['a']), db
    keep, spread = [], 0.6 * SR
    for f in sorted(found, key=lambda f: -f['score']):
        if len(keep) >= src['keep']:
            break
        if all(abs(f['a'] - g['a']) > spread for g in keep):
            keep.append(f)
    keep.sort(key=lambda f: f['a'])
    return keep, db


_meter_filters = pyloudnorm.Meter(SR)._filters


def loudness(x):
    """The loudest 100 ms, K-weighted (BS.1770), in LUFS-like dB."""
    y = x
    for f in _meter_filters.values():
        y = f.apply_filter(y)
    w = min(len(y), int(0.1 * SR))
    c = np.concatenate([[0.0], np.cumsum(y * y)])
    ms = (c[w:] - c[:-w]) / w
    return 10 * math.log10(ms.max() + 1e-12) - 0.691


def reference_level():
    d, sr = sf.read(REFERENCE, always_2d=True, dtype='float64')
    m = d.mean(axis=1)
    if sr != SR:
        g = gcd(SR, sr)
        m = resample_poly(m, SR // g, sr // g)
    return float(np.mean([loudness(m[int(o * SR):int((o + d_) * SR)]) for o, d_ in REFERENCE_STEPS]))


def encode(x):
    enc = lameenc.Encoder()
    enc.set_bit_rate(KBPS)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    return bytes(enc.encode(pcm) + enc.flush())


def shift_of(packed, mp3_path):
    """How much later the encoded file's sound starts than the packed one's
    (samples), by cross-correlating the first half second of sound."""
    d, sr = sf.read(mp3_path, always_2d=True, dtype='float64')
    dec = d.mean(axis=1)
    n = min(len(packed), len(dec), SR)
    a, b = packed[:n], dec[:n]
    best, at = -1e18, 0
    for s in range(0, 3000):
        if s >= n:
            break
        v = float(np.dot(a[: n - s], b[s:n]))
        if v > best:
            best, at = v, s
    return at, len(dec)


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    folder = argv[0]
    plot = argv[argv.index('--plot') + 1] if '--plot' in argv else None
    target = reference_level()
    print(f'footstep-v3: {target:.1f} dB (K-weighted, loudest 100 ms) -- every step is brought to this')
    table, report, plots = {}, [], []
    for src in SOURCES:
        hits = glob.glob(os.path.join(folder, f"*{src['id']}__*.wav"))
        if not hits:
            raise SystemExit(f"{src['sound']}: no file with Freesound id {src['id']} in {folder}")
        raw = load(sorted(hits)[0])
        m = raw
        steps, db = steps_of(src, m)
        packed = [np.zeros(int(GAP * SR))]
        at = len(packed[0])
        places = []
        for f in steps:
            x = shape(m[f['a']:f['b']], f['natural'])
            gain_db = target - loudness(x)
            x = x * 10 ** (gain_db / 20)
            pk = float(np.abs(x).max())
            if pk > HEADROOM:
                x *= HEADROOM / pk
                gain_db -= 20 * math.log10(pk / HEADROOM)
            places.append((at, len(x)))
            packed += [x, np.zeros(int(GAP * SR))]
            at += len(x) + int(GAP * SR)
            f['gain'] = gain_db
            f['len'] = len(x) / SR
        packed = np.concatenate(packed)
        path = os.path.join(OUT_DIR, f"step-{src['sound']}.mp3")
        with open(path, 'wb') as fh:
            fh.write(encode(packed))
        shift, dec_len = shift_of(packed, path)
        clips = []
        for (a, n) in places:
            off = (a + shift) / SR - LEAD
            clips.append([round(max(0.0, off), 3), round(n / SR + LEAD + TAIL, 3)])
        table[src['sound']] = dict(url=f"/sfx/footstep/step-{src['sound']}.mp3", steps=clips)
        size = os.path.getsize(path)
        report.append(f"{src['sound']:6s} {len(steps)} step(s), "
                      f"{', '.join('%.2fs %+.1fdB%s' % (f['len'], f['gain'], '' if f['natural'] else ' (cut short)') for f in steps)}"
                      f"  -> {size / 1024:.1f} KB, decoder shift {shift} samples")
        plots.append((src, m, db, steps))
    for line in report:
        print(line)
    write_js(table)
    if plot:
        draw(plot, plots)
    return 0


# A sound with no recording yet plays another's clip: the owner sent the
# wood step twice and no forest floor, and a forest floor is soft and leafy
# -- nearer a swish of grass than a knock on a board.
STAND_INS = {'forest': 'grass'}


def write_js(table):
    order = [s['sound'] for s in SOURCES]
    lines = [
        "/* v2.3.2967: GENERATED by tools/audio/cut_footsteps.py -- do not edit by",
        "   hand; run that again instead.  One clip a ground: where each step lies in",
        "   its file, [offset, duration] in seconds, for BT_AUDIO.footstep()",
        "   (gameDisplay.js), which plays one of them per foot plant.  Each window",
        f"   starts {LEAD} s before its step and ends {TAIL} s after it, measured in the encoded",
        "   file.  Every step is at the loudness of footstep-v3 (dirt), so footstep()",
        "   plays them all at the volume it already uses.  `key` is the sample's",
        "   name in BT_AUDIO; dirt is footstep-v3 itself and is not here. */",
        "export const FOOTSTEP_CLIPS = {",
    ]
    for k in order:
        t = table[k]
        steps = ', '.join(json.dumps(s) for s in t['steps'])
        lines.append(f"  {k}: {{ key: 'step-{k}', url: '{t['url']}', steps: [{steps}] }},")
    lines.append("};")
    lines.append("/* Sounds with no recording yet, and the clip each plays meanwhile. */")
    for k, v in STAND_INS.items():
        lines.append(f"FOOTSTEP_CLIPS.{k} = FOOTSTEP_CLIPS.{v};")
    with open(OUT_JS, 'w') as fh:
        fh.write('\n'.join(lines) + '\n')
    # v2.3.2968: the same table for the Ground Studio, which plays each
    # ground's sound on its card (public/tools/ground/app.js) -- a page served
    # as it is, which cannot read src/ -- with dirt (footstep-v3, as
    # footstep() plays it) and each stand-in's clip under its own name
    clips = {k: dict(url=table[k]['url'], steps=table[k]['steps']) for k in order}
    clips['dirt'] = dict(url='/sfx/footstep/' + os.path.basename(REFERENCE),
                         steps=[[o, d] for o, d in REFERENCE_STEPS])
    for k, v in STAND_INS.items():
        clips[k] = dict(clips[v], standIn=v)
    note = 'GENERATED by tools/audio/cut_footsteps.py -- the same clips as src/data/footstepClips.js, for the Ground Studio'
    body = ',\n'.join(f'  {json.dumps(k)}: {json.dumps(v)}' for k, v in clips.items())
    with open(OUT_CLIPS, 'w') as fh:
        fh.write('{\n "note": ' + json.dumps(note) + ',\n "clips": {\n' + body + '\n }\n}\n')


def draw(path, plots):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(len(plots), 1, figsize=(14, 2.1 * len(plots)))
    for ax, (src, m, db, steps) in zip(axes, plots):
        t = np.arange(len(db)) * HOP / SR
        ax.plot(t, db, lw=0.6, color='#345')
        for f in steps:
            ax.axvspan(f['a'] / SR, f['b'] / SR, color='#e94' if f['natural'] else '#c33', alpha=0.35)
        ax.set_ylim(-90, 0)
        ax.set_xlim(0, len(m) / SR)
        ax.set_title(f"{src['sound']} -- {src['title']} ({src['by']}, Freesound {src['id']})", fontsize=9, loc='left')
    fig.tight_layout()
    fig.savefig(path, dpi=80)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
