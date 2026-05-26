#!/usr/bin/env bash
# v2 jog pipeline: outline-aware edge-flood instead of dehalo's blanket
# kill-bg-grayscale.
#
# Same five inputs and outputs as regen_jog_sprites.sh.  The only
# substantive difference: ffmpeg extracts RAW frames (no colorkey),
# then tools/silhouette_extract.py removes background via flood-fill
# from frame edges through low-saturation pixels, preserving the
# figure interior even if the outline has AA gaps.
#
# Both pipelines produce essentially identical output on the current
# AI sources (verified pixel-diff: ~0.4% of pixels differ, all in
# isolated bg-colored spots).  v2 ships per v2.3.153 user choice.
#
# Usage:  bash tools/regen_jog_sprites_v2.sh

set -euo pipefail

for d in north south northeast southwest east; do
  echo "=== $d ==="
  rm -rf "/tmp/jog-frames-v2-$d"
  mkdir -p "/tmp/jog-frames-v2-$d"

  # Native frame extraction, RAW (no colorkey).  silhouette_extract
  # will key based on outline + saturation in the next step.
  ffmpeg -y -i "assets/character animations/jog-$d.mov" \
    -vf "scale=64:64:flags=neighbor,format=rgba" \
    -fps_mode passthrough -an "/tmp/jog-frames-v2-$d/%03d.png" 2>/dev/null

  N=$(ls "/tmp/jog-frames-v2-$d/" | wc -l)
  echo "  $N native frames"

  # Tile into horizontal strip.
  ffmpeg -y -i "/tmp/jog-frames-v2-$d/%03d.png" -vf "tile=${N}x1" \
    -frames:v 1 -an "/tmp/jog-v2-$d-strip.png" 2>/dev/null

  # Stage 1 + Stage 2: detect bg-passable pixels, flood from frame
  # edges, outline-saturated interior preserved.
  python tools/silhouette_extract.py \
    "/tmp/jog-v2-$d-strip.png" "public/sprites/player/jog-$d.png" \
    --frame-w 64 --bg-lum 200 --bg-sat 30

  # Same head stabilization + skin tone match as v1.
  yoff=0
  if [ "$d" = "southwest" ]; then
    yoff=1
  fi
  python tools/stabilize_head.py \
    "public/sprites/player/jog-$d.png" "public/sprites/player/jog-$d.png" \
    --head-h 16 --y-offset $yoff

  skin_target="208 135 76"
  if [ "$d" = "east" ]; then
    skin_target="198 128 72"
  fi
  python tools/match_skin.py \
    "public/sprites/player/jog-$d.png" "public/sprites/player/jog-$d.png" \
    --target $skin_target
done
