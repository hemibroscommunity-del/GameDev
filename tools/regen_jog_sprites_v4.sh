#!/usr/bin/env bash
# v4 jog pipeline: native-resolution background removal via magenta
# bridge.  All work happens at the MOV's native frame size; downscale
# is the very last step so we don't compress the figure into 64x64
# before extracting the outline.
#
# Pipeline:
#   1. ffmpeg extract native-res frames (no scale, no key).
#   2. Tile frames into a single native-res strip.
#   3. python tools/recolor_bg_magenta.py -- paint every "whitish/gray"
#      pixel (lum>=200 AND sat<=30) to (255, 0, 255).  Outline (dark),
#      skin (saturated tan), pants (saturated olive), everything else
#      saturated is untouched.
#   4. ffmpeg colorkey=0xff00ff:0.01:0.0 + scale=-1:64:flags=neighbor.
#      The colorkey is binary and tight (sim=0.01) -- it kills only
#      the exact magenta we painted, no figure pixels at risk.  Scale
#      runs AFTER the key so anti-aliased edge pixels don't get mixed
#      into ambiguous grays before bg removal.
#
# Background of design:
#   - User reported v3 (chroma-key on 0xf2f2f2 + nearest downscale)
#     still looked "compressed" with bg leak and outline gaps.
#   - Two root causes: (a) downscale-first lossed detail before the
#     key had a chance to look at it; (b) colorkey on near-white had
#     fuzzy threshold matches at the figure edge.
#   - Fix: do bg work at full res, convert near-bg to a single
#     unambiguous color, then key on that exact color.
#
# Usage:  bash tools/regen_jog_sprites_v4.sh

set -euo pipefail

for d in north south northeast southwest east; do
  echo "=== $d ==="
  rm -rf "/tmp/jog-frames-v4-$d"
  mkdir -p "/tmp/jog-frames-v4-$d"

  # 1. Extract native-resolution frames.
  ffmpeg -y -i "assets/character animations/jog-$d.mov" \
    -vf "format=rgba" \
    -fps_mode passthrough -an "/tmp/jog-frames-v4-$d/%03d.png" 2>/dev/null

  N=$(ls "/tmp/jog-frames-v4-$d/" | wc -l)
  echo "  $N native frames"

  # 2. Tile at native resolution.
  ffmpeg -y -i "/tmp/jog-frames-v4-$d/%03d.png" -vf "tile=${N}x1" \
    -frames:v 1 -an "/tmp/jog-v4-$d-strip-native.png" 2>/dev/null

  # 3. Recolor bg -> magenta.
  python tools/recolor_bg_magenta.py \
    "/tmp/jog-v4-$d-strip-native.png" \
    "/tmp/jog-v4-$d-strip-magenta.png" \
    --lum 200 --sat 30

  # 4. PIL nearest-neighbor downscale + exact-magenta kill, all in
  #    Python.  Replaces ffmpeg's colorkey/scale chain, which was
  #    introducing sub-pixel color shifts between filters and leaving
  #    purplish AA fringe along the figure edge that an exact-match
  #    chroma-key couldn't catch.  Python pipeline guarantees every
  #    output pixel is one input pixel and magenta is matched exactly.
  python tools/downscale_and_key.py \
    "/tmp/jog-v4-$d-strip-magenta.png" \
    "public/sprites/player/jog-$d.png" --height 64
done
