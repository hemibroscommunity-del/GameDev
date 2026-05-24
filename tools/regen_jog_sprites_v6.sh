#!/usr/bin/env bash
# v6 jog pipeline: high-quality LANCZOS downscale with premultiplied
# alpha.  Replaces all the nearest-neighbor + outline-rescue logic
# with a single proper anti-aliased resize.
#
# Steps:
#   1. ffmpeg extracts native-resolution frames.
#   2. ffmpeg tiles them into a native-res horizontal strip.
#   3. tools/lanczos_downscale.py:
#       - detects bg (whitish/gray) at native res, sets bg alpha to 0
#       - premultiplies alpha so bg color doesn't bleed into edges
#       - LANCZOS resize to 64-tall (proportional width)
#       - unpremultiplies alpha
#   4. Done.
#
# Result: smooth anti-aliased edges (no outline gaps, no halo).
# Trade-off: edges are softer than nearest-neighbor pixel-art crisp,
# but the source is high-res photoreal AI art -- LANCZOS is the
# right tool for an 8x or greater reduction from high-res to 64x64.
#
# Usage:  bash tools/regen_jog_sprites_v6.sh

set -euo pipefail

for d in north south northeast southwest east; do
  echo "=== $d ==="
  rm -rf "/tmp/jog-frames-v6-$d"
  mkdir -p "/tmp/jog-frames-v6-$d"

  ffmpeg -y -i "assets/character animations/jog-$d.mov" \
    -vf "format=rgba" \
    -fps_mode passthrough -an "/tmp/jog-frames-v6-$d/%03d.png" 2>/dev/null

  N=$(ls "/tmp/jog-frames-v6-$d/" | wc -l)
  echo "  $N native frames"

  ffmpeg -y -i "/tmp/jog-frames-v6-$d/%03d.png" -vf "tile=${N}x1" \
    -frames:v 1 -an "/tmp/jog-v6-$d-strip-native.png" 2>/dev/null

  python tools/lanczos_with_outline.py \
    "/tmp/jog-v6-$d-strip-native.png" \
    "public/sprites/player/jog-$d.png" --height 64
done
