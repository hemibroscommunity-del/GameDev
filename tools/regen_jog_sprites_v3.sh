#!/usr/bin/env bash
# v3 jog pipeline: MINIMUM processing.  Fresh-start design per user
# request -- no dehalo, no silhouette extraction, no head stabilization,
# no skin-tone matching.  Just chroma-key the background and downscale.
#
# Rationale: previous pipelines stacked corrective passes that each
# helped a specific old failure mode (wavy heads, peachy skin, color
# drift, AA artifacts) but compound to give a "compressed" feel and
# can damage the outline.  Modern higher-quality AI sources need
# fewer interventions.  Start with the bare minimum and only add
# steps if a specific artifact actually appears.
#
# Pipeline (single ffmpeg invocation per direction):
#   1. Read MOV at native resolution.
#   2. colorkey=0xf2f2f2:0.30:0.0 -- binary alpha kill of near-white
#      background.  Outline (dark) and figure interior (saturated)
#      untouched.  Binary alpha (blend=0) avoids partial-alpha halos.
#   3. scale=64:64:flags=neighbor -- nearest-neighbor downscale to
#      the game's frame size.  Done AFTER colorkey so AA-blended bg
#      pixels don't become "ambiguous gray" after averaging.
#   4. Tile horizontally into a single strip PNG.
#
# That's it.  No post-processing.  If artifacts show up the answer is
# usually a better source, not more downstream correction.
#
# Usage:  bash tools/regen_jog_sprites_v3.sh

set -euo pipefail

for d in north south northeast southwest east; do
  echo "=== $d ==="
  rm -rf "/tmp/jog-frames-v3-$d"
  mkdir -p "/tmp/jog-frames-v3-$d"

  ffmpeg -y -i "assets/character animations/jog-$d.mov" \
    -vf "colorkey=0xf2f2f2:0.30:0.0,scale=64:64:flags=neighbor,format=rgba" \
    -fps_mode passthrough -an "/tmp/jog-frames-v3-$d/%03d.png" 2>/dev/null

  N=$(ls "/tmp/jog-frames-v3-$d/" | wc -l)
  echo "  $N native frames"

  ffmpeg -y -i "/tmp/jog-frames-v3-$d/%03d.png" -vf "tile=${N}x1" \
    -frames:v 1 -an "public/sprites/player/jog-$d.png" 2>/dev/null
done
