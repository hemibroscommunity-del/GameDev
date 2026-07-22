#!/usr/bin/env python3
"""v2.3.1422: lossless MP3 trimmer (no ffmpeg in the sandbox).

MP3 audio is a sequence of self-contained frames (~26ms each at 44.1kHz),
so a clip can be cut on frame boundaries by copying the frames inside a
[start, end] second window — no decode, no re-encode, no quality loss.
Used to shrink the owner's 1MB+ SFX uploads (60s source clips) down to
the few seconds the game actually plays (owner: "extract just a few
seconds or compress the audio").

Usage: trim_mp3.py <in.mp3> <out.mp3> <start_s> <end_s>
Skips ID3v2 tags; parses each MPEG frame header for bitrate/samplerate
(handles VBR); drops everything outside the window.
"""
import sys

BITRATES_V1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
BITRATES_V2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
SAMPLERATES = {3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000]}


def trim(src, dst, start_s, end_s):
    data = open(src, 'rb').read()
    i = 0
    # skip ID3v2
    if data[:3] == b'ID3':
        size = ((data[6] & 0x7f) << 21) | ((data[7] & 0x7f) << 14) | ((data[8] & 0x7f) << 7) | (data[9] & 0x7f)
        i = 10 + size
    out = bytearray()
    t = 0.0
    kept = 0
    while i + 4 <= len(data):
        if data[i] != 0xFF or (data[i + 1] & 0xE0) != 0xE0:
            i += 1
            continue
        ver = (data[i + 1] >> 3) & 0x03          # 3=MPEG1, 2=MPEG2, 0=MPEG2.5
        layer = (data[i + 1] >> 1) & 0x03        # 1=Layer III
        if ver == 1 or layer != 1:
            i += 1
            continue
        br_idx = (data[i + 2] >> 4) & 0x0F
        sr_idx = (data[i + 2] >> 2) & 0x03
        pad = (data[i + 2] >> 1) & 0x01
        if br_idx in (0, 15) or sr_idx == 3:
            i += 1
            continue
        sr = SAMPLERATES[ver][sr_idx]
        if ver == 3:
            br = BITRATES_V1L3[br_idx] * 1000
            flen = (144 * br) // sr + pad
            fdur = 1152.0 / sr
        else:
            br = BITRATES_V2L3[br_idx] * 1000
            flen = (72 * br) // sr + pad
            fdur = 576.0 / sr
        if flen <= 0 or i + flen > len(data):
            break
        if start_s <= t < end_s:
            out += data[i:i + flen]
            kept += 1
        t += fdur
        i += flen
        if t >= end_s:
            break
    open(dst, 'wb').write(bytes(out))
    print(f'{dst}: kept {kept} frames, {len(out)/1024:.0f}KB, ~{kept * fdur:.2f}s (source ~{t:.1f}s scanned)')


if __name__ == '__main__':
    trim(sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]))
