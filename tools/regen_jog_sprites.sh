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
#   1. ffmpeg colorkey=0xf2f2f2:0.30:0.0 (binary alpha; sim 0.30 catches
#      more color-drift bg than the old 0.25 without touching skin).
#   2. Tile the native frames into a horizontal strip.
#   3. dehalo_outside.py --no-flood --kill-bg-grayscale.
#      The bg-grayscale kill zeros opaque pixels with lum > 200 AND
#      saturation < 0.10.  This preserves AA outline pixels (gray at
#      lum 100-200, killed under the legacy --kill-all-light rule)
#      and skin highlights (saturated tan).  Only kills near-white
#      grayscale bg residue.
#
# DO NOT pass --binary-alpha, --kill-halo, --outline, or --kill-all-light.
# DO NOT remove --no-flood (the flood-fill would eat the outline).
#
# East note: as of 2026-05-06 east is on the canonical pipeline too (its
# old hand-keyed source was replaced by an AI-generated MOV like the other
# four).  East uses its own skin target (188, 121, 69) to match
# stand-east.png, while the other four use (208, 135, 76).  The legacy
# tools/recolor_east.py is no longer in the pipeline; --target on
# match_skin.py replaces it.
#
# Usage:  bash tools/regen_jog_sprites.sh
# Sources expected at: assets/character animations/jog-{dir}.mov

set -euo pipefail

for d in north south northeast southwest east; do
  echo "=== $d ==="
  rm -rf "/tmp/jog-frames-$d"
  mkdir -p "/tmp/jog-frames-$d"

  # Native frame extraction with binary colorkey.
  # Target 0xf2f2f2 (background is ~(240-245, ...), not pure white).
  # similarity 0.30 catches anti-aliased off-white bleed at the
  # silhouette edge AND bg pixels with subtle color drift (e.g. yellow
  # shadow at RGB ~240,230,200) that the old 0.25 missed.  Skin tone
  # (~200,140,100) is far from 0xf2f2f2 in YUV space, untouched.
  # blend 0.0 = binary alpha (no partial-alpha band, no wobble).
  ffmpeg -y -i "assets/character animations/jog-$d.mov" \
    -vf "scale=64:64:flags=neighbor,colorkey=0xf2f2f2:0.30:0.0,format=rgba" \
    -fps_mode passthrough -an "/tmp/jog-frames-$d/%03d.png" 2>/dev/null

  N=$(ls "/tmp/jog-frames-$d/" | wc -l)
  echo "  $N native frames"

  # Tile into a horizontal strip.
  ffmpeg -y -i "/tmp/jog-frames-$d/%03d.png" -vf "tile=${N}x1" \
    -frames:v 1 -an "/tmp/jog-$d-strip.png" 2>/dev/null

  # Zero RGB on alpha=0 (--no-flood) + kill near-white grayscale bg
  # residue (--kill-bg-grayscale, lum>200 AND sat<0.10).  Replaced
  # --kill-all-light, which over-killed AA outline pixels and produced
  # pixelated outline gaps.
  python tools/dehalo_outside.py \
    "/tmp/jog-$d-strip.png" "public/sprites/player/jog-$d.png" \
    --frame-h 64 --no-flood --kill-bg-grayscale

  # Stabilize the head across frames — the AI sources have visibly
  # different head silhouette shapes per frame ("wavy / bumpy" during
  # playback).  The tool flood-fills the head's connected component
  # from the topmost pixel (capped at head-h rows down so it can't
  # leak into the body), then replaces each frame's head silhouette
  # with the reference frame's, vertically translated to match the
  # frame's own top row.  Body / arms / legs untouched; no stuck
  # pixels and no missing body parts.
  # SW chin sat too high after stabilization — bump the canonical head
  # down 1 row so the chin line reads less compressed against the body.
  yoff=0
  if [ "$d" = "southwest" ]; then
    yoff=1
  fi
  python tools/stabilize_head.py \
    "public/sprites/player/jog-$d.png" "public/sprites/player/jog-$d.png" \
    --head-h 16 --y-offset $yoff

  # Match skin tone to the idle / stand sprites — the AI jog sources
  # come out brighter / peachier than the muted tan of stand-*.png.
  # Target (208, 135, 76) is the average skin median across the four
  # AI-generated stand sheets.  East uses (198, 128, 72) instead, a
  # midpoint between the other four and stand-east's native median
  # (188, 121, 69) — keeps east in the same family but a touch warmer
  # so it doesn't read distinctly cooler than the other directions.
  skin_target="208 135 76"
  if [ "$d" = "east" ]; then
    skin_target="198 128 72"
  fi
  python tools/match_skin.py \
    "public/sprites/player/jog-$d.png" "public/sprites/player/jog-$d.png" \
    --target $skin_target
done
