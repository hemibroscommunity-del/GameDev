#!/bin/bash
# v2.3.3034: the harvest bar's GREEN fill, made from the owner's red HP fill.
#
# Owner, 2026-10-05: "I want resource harvesting bar to be green".  The node's
# bar wears the HP bar's art (entityRenderer drawNodeHpBar, v2.3.2956), so the
# green is the same picture with its red turned green: only the red fill's
# pixels (saturated, hue within 36 degrees of red) move to hue 130, a little
# darker and less saturated than a straight turn would make them (a hue turn
# keeps the red's lightness, and green at that lightness reads as neon); the
# navy rim, the gloss and the shading are untouched.  ImageMagick only.
#
#   bash tools/ui/green-node-bar.sh
set -e
cd "$(dirname "$0")/../.."
SRC=public/ui/bars/hp-full.png
OUT=public/ui/bars/node-full-green.png
convert "$SRC" -colorspace HSL \
  -channel B -fx "(u.g>0.30 && (u.r<0.10 || u.r>0.90)) ? u.b*0.86 : u.b" \
  -channel G -fx "(u.g>0.30 && (u.r<0.10 || u.r>0.90)) ? u.g*0.80 : u.g" \
  -channel R -fx "(u.g>0.24 && (u.r<0.10 || u.r>0.90)) ? 0.36 : u.r" \
  +channel -colorspace sRGB -define png:compression-level=9 "$OUT"
identify "$OUT"
