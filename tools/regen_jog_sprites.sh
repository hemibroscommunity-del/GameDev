#!/usr/bin/env bash
# Canonical pipeline for player jog sprite sheets.
#
# RULE: do nothing fancy.  The source MOVs in assets/character animations/
# already have a clean dark outline drawn around the character.  The only
# job here is to remove the white background.  Everything else (flood-fill,
# alpha-smoothing, synthetic outline, kill-halo, binary-alpha) destroys
# detail the source already has correct.  Don't add it back.
#
# Pipeline:
#   1. ffmpeg with TIGHT binary colorkey (similarity 0.01, blend 0.0).
#      Pure white -> alpha 0; dark outline + character body untouched.
#   2. Tile the native frames into a horizontal strip.
#   3. dehalo_outside.py --no-flood (zero RGB on alpha=0 only, so no
#      white halo bleeds during scaling/filtering).
#
# DO NOT pass --binary-alpha, --kill-halo, or --outline.
# DO NOT remove --no-flood (the flood-fill would eat the outline).
#
# Usage:  bash tools/regen_jog_sprites.sh
# Sources expected at: assets/character animations/jog-{dir}.mov

set -euo pipefail

for d in north south northeast southwest; do
  echo "=== $d ==="
  rm -rf "/tmp/jog-frames-$d"
  mkdir -p "/tmp/jog-frames-$d"

  # Native frame extraction with binary colorkey.
  # Target 0xf2f2f2 (the actual background color is ~(240-245, ...),
  # not pure white).  similarity 0.15 catches the anti-aliased
  # off-white bleed at the silhouette edge (lum 180-240) without
  # touching skin tones (~200,140,100) or any clothing color.
  # blend 0.0 = binary alpha (no partial-alpha band, no wobble).
  ffmpeg -y -i "assets/character animations/jog-$d.mov" \
    -vf "scale=64:64:flags=neighbor,colorkey=0xf2f2f2:0.25:0.0,format=rgba" \
    -fps_mode passthrough -an "/tmp/jog-frames-$d/%03d.png" 2>/dev/null

  N=$(ls "/tmp/jog-frames-$d/" | wc -l)
  echo "  $N native frames"

  # Tile into a horizontal strip.
  ffmpeg -y -i "/tmp/jog-frames-$d/%03d.png" -vf "tile=${N}x1" \
    -frames:v 1 -an "/tmp/jog-$d-strip.png" 2>/dev/null

  # Zero RGB on alpha=0 (--no-flood) + kill any off-white edge bleed
  # that escaped the colorkey. --kill-edge-bleed only touches pixels
  # adjacent to the silhouette boundary, so interior highlights and
  # the existing dark outline are untouched.
  python tools/dehalo_outside.py \
    "/tmp/jog-$d-strip.png" "public/sprites/player/jog-$d.png" \
    --frame-h 64 --no-flood --kill-edge-bleed
done
