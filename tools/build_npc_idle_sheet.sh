#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# build_npc_idle_sheet.sh (v2.3.1218)
#
# Bake a town-NPC idle clip (Grok/AI mp4, clean solid background) into the
# transparent horizontal PNG STRIP the renderer slices — the same
# video -> keyed -> stitched pipeline used for the monster sheets under
# public/sprites/monsters/<name>/ (see docs/skill-animation-pipeline.md).
#
# Output layout the engine expects: N frames laid left-to-right, each a fixed
# SQUARE (default 256x256), character bottom-aligned (feet at the frame
# bottom, because the sprite anchor is 0.5/1.0). mayorSprites.js auto-detects
# the frame count from  sheet.width / 256, so any N works.
#
# This sandbox's egress policy blocks apt + PyPI, so ffmpeg can't be installed
# here — run this where ffmpeg exists (your usual media-tooling machine). Only
# ffmpeg is required (no Python/PIL): colorkey does the transparency, tile does
# the stitch.
#
# Usage:
#   tools/build_npc_idle_sheet.sh <src.mp4> <out.png> [KEY] [FPS] [SIM] [BLEND] [SIZE]
#
#   KEY   background color to key out, hex 0xRRGGBB   (default 0xFFFFFF, near-white)
#   FPS   frames to sample per second of the clip     (default 2  -> ~12 frames / 6s)
#   SIM   colorkey similarity 0..1 (higher = more)    (default 0.30)
#   BLEND colorkey edge blend 0..1                     (default 0.10)
#   SIZE  square frame size in px                      (default 256)
#
# Example (Mayor Bro, the reason this script exists):
#   tools/build_npc_idle_sheet.sh \
#     "assets/npc animations/mayor/mayor-idle-s.mp4" \
#     public/sprites/npcs/mayor/mayor-s.png
#
# TUNE per clip: sample the clip's corner color for KEY (a generated "clean
# white" bg is usually ~0xFFFFFF; raise SIM if halos remain, lower it if the
# character erodes). Eyeball the result next to the other sprites before
# committing — the "belongs beside the other sprites" test.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SRC="${1:?source mp4 required}"
OUT="${2:?output png path required}"
KEY="${3:-0xFFFFFF}"
FPS="${4:-2}"
SIM="${5:-0.30}"
BLEND="${6:-0.10}"
SIZE="${7:-256}"

command -v ffmpeg >/dev/null || { echo "ERROR: ffmpeg not found (install it where you run this)."; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1) Extract frames, key the background to alpha, fit each into a SIZE square,
#    bottom-anchored, with transparent padding.  format=rgba keeps alpha through
#    the pad.  scale keeps aspect (decrease) so nothing is distorted.
ffmpeg -y -loglevel error -i "$SRC" -vf "\
fps=${FPS},\
colorkey=${KEY}:${SIM}:${BLEND},\
scale=${SIZE}:${SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,\
pad=${SIZE}:${SIZE}:(ow-iw)/2:(oh-ih):color=0x00000000,\
format=rgba" \
  "$TMP/f_%03d.png"

N="$(find "$TMP" -name 'f_*.png' | wc -l | tr -d ' ')"
[ "$N" -gt 0 ] || { echo "ERROR: no frames extracted — check the clip / KEY color."; exit 1; }

# 2) Stitch the N frames into one horizontal strip (N x 1 grid).
mkdir -p "$(dirname "$OUT")"
ffmpeg -y -loglevel error -framerate 1 -i "$TMP/f_%03d.png" \
  -vf "tile=${N}x1" -frames:v 1 "$OUT"

echo "OK  ${OUT}  (${N} frames of ${SIZE}px -> $((N*SIZE))x${SIZE})"
echo "    next: eyeball it, confirm feet sit at the frame bottom, then commit."
