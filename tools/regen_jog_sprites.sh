#!/usr/bin/env bash
# Canonical pipeline for player jog sprite sheets.
#
# Why this exists: regenerations kept regressing to harsher binary-alpha
# methods that produced edge wobble + white-halo bleed.  This script is
# the recipe that matches the look of the original hand-keyed
# jog-east.png:
#
#   1. ffmpeg with a SOFT colorkey (similarity 0.05, blend 0.30).  The
#      blend preserves an anti-aliased band at the silhouette edge.
#   2. tile frames into a horizontal strip at the user-approved count
#      per direction (last frames of the source clip are near-duplicates
#      of the loop start, so trimming kills the loop-seam jerk).
#   3. dehalo_outside.py --no-flood --kill-halo:
#        - --no-flood: do NOT run the edge flood-fill (it would strip
#          the soft anti-aliased outline that makes east look clean).
#        - --kill-halo: zero alpha on any partial-alpha LIGHT pixel,
#          which is the "white pixels coming through" the user keeps
#          flagging.  Dark partial-alpha pixels are PRESERVED — those
#          are the character's outline.
#        - zero_rgb_on_transparent (built-in): kills bright RGB on
#          alpha=0 pixels so no halo bleeds during scaling.
#
# DO NOT pass --binary-alpha to dehalo_outside.py for jog sprites.
# Snapping alpha to 0/255 destroys the outline and creates wobble.
#
# Frame counts (KEEP) below are the values the user has approved
# through iteration.  Adjust them only when the user specifically
# asks.  northeast uses fps=16 because its source is a longer clip
# and that fps gives a frame count consistent with the others.
#
# Usage:  bash tools/regen_jog_sprites.sh
# Sources expected at: assets/character animations/jog-{dir}.mov

set -euo pipefail

declare -A KEEP=([north]=23 [south]=26 [northeast]=24 [southwest]=30)
declare -A FPS_FILTER=([north]="" [south]="" [northeast]="fps=16," [southwest]="")
declare -A PASSTHROUGH=([north]=1 [south]=1 [northeast]=0 [southwest]=1)

for d in north south northeast southwest; do
  echo "=== $d ==="
  rm -rf "/tmp/jog-frames-$d"
  mkdir -p "/tmp/jog-frames-$d"

  VF="${FPS_FILTER[$d]}scale=64:64:flags=neighbor,colorkey=0xffffff:0.05:0.30,format=rgba"

  if [[ "${PASSTHROUGH[$d]}" = "1" ]]; then
    ffmpeg -y -i "assets/character animations/jog-$d.mov" \
      -vf "$VF" -fps_mode passthrough -an "/tmp/jog-frames-$d/%03d.png" 2>/dev/null
  else
    ffmpeg -y -i "assets/character animations/jog-$d.mov" \
      -vf "$VF" -an "/tmp/jog-frames-$d/%03d.png" 2>/dev/null
  fi

  K="${KEEP[$d]}"
  ls "/tmp/jog-frames-$d/" | sort | tail -n +"$((K + 1))" | xargs -I{} rm "/tmp/jog-frames-$d/{}"

  ffmpeg -y -i "/tmp/jog-frames-$d/%03d.png" -vf "tile=${K}x1" \
    -frames:v 1 -an "/tmp/jog-$d-strip.png" 2>/dev/null

  python tools/dehalo_outside.py \
    "/tmp/jog-$d-strip.png" "public/sprites/player/jog-$d.png" \
    --frame-h 64 --no-flood --kill-halo --outline
done
