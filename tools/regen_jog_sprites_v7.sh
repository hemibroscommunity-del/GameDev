#!/usr/bin/env bash
# v7 jog pipeline: plain Lanczos at 256-px output, no outline overlay.
#
# Why no outline overlay (v6 had one):
#   v6 added an outline-mask overlay because 64-px output meant an 8x+
#   reduction and the thin outline got sparse-sampled.  At 256-px
#   output the reduction is only ~2x (540 native -> 256), so Lanczos
#   preserves the outline naturally without any explicit force.  The
#   overlay step was over-emphasizing the outline at higher output
#   resolutions (user-reported "outline looks over processed").
#
# Pipeline:
#   1. ffmpeg extract native-res frames.
#   2. ffmpeg tile into native-res strip.
#   3. tools/lanczos_downscale.py with --height 256.
#       Detects bg (whitish/gray), sets bg alpha to 0, premultiplies
#       alpha, LANCZOS resize, unpremultiplies.  No outline pass.
#
# Output: 256x256 per frame; engine downscales for display via
# PIXI's LINEAR sampler + mipmaps (see playerSprites.js v2.3.163).
#
# Usage:  bash tools/regen_jog_sprites_v7.sh

set -euo pipefail

# Skin target: matches the east source's median tan.  v2.3.167 unified
# every direction to this value (was per-direction varying).
SKIN_TARGET="198 128 72"

for d in north south northeast southwest east; do
  echo "=== $d ==="
  rm -rf "/tmp/jog-frames-v7-$d"
  mkdir -p "/tmp/jog-frames-v7-$d"

  ffmpeg -y -i "assets/character animations/jog-$d.mov" \
    -vf "format=rgba" \
    -fps_mode passthrough -an "/tmp/jog-frames-v7-$d/%03d.png" 2>/dev/null

  N=$(ls "/tmp/jog-frames-v7-$d/" | wc -l)
  echo "  $N native frames"

  ffmpeg -y -i "/tmp/jog-frames-v7-$d/%03d.png" -vf "tile=${N}x1" \
    -frames:v 1 -an "/tmp/jog-v7-$d-strip-native.png" 2>/dev/null

  # NE source has an AI-drawn floor-shadow under the feet that the
  # bg-detection threshold misses.  --scrub-floor zeros medium-gray
  # low-sat pixels in the bottom 40% of the strip before Lanczos.
  scrub_flag=""
  if [ "$d" = "northeast" ]; then
    scrub_flag="--scrub-floor"
  fi

  python tools/lanczos_downscale.py \
    "/tmp/jog-v7-$d-strip-native.png" \
    "public/sprites/player/jog-$d.png" --height 256 $scrub_flag

  # Unify skin tone across directions to the east-reference target.
  python tools/match_skin.py \
    "public/sprites/player/jog-$d.png" \
    "public/sprites/player/jog-$d.png" --target $SKIN_TARGET
done
