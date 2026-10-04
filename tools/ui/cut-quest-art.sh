#!/bin/bash
# ═══ v2.3.3030: THE OWNER'S QUEST-WINDOW ART, CUT FROM THEIR THREE SHEETS ═══
#
# Owner (2026-10-04, with three sheets of frames, buttons and ornaments and a
# mockup of the new flow): "Add these for the new quest windows."
#
# The sheets are kept beside this script as lossless webp (transparent
# backgrounds, as the owner sent them):
#   sheet1-frames.webp     the framed navy panel, the green banners, plain panels
#   sheet2-buttons.webp    the gold bar (normal / glowing / grey), the round X and
#                          check, the weapon chips (and the sword one selected),
#                          the item slot (normal / glowing), the gold and XP pills
#   sheet3-ornaments.webp  the flat green banners, corners, dividers, the laurel
#                          check badge, the gold and green sparkles, the glow burst
#   mockup-flow.webp       the flow it is for (reference only, not cut)
# Every crop below was found with ImageMagick's connected components on the
# sheet's alpha (8% threshold), then given a margin for the soft glows.
#
# Pieces that swap for one another in the game (a button's states, a chip and
# its selected ring, a slot and its glow) are RE-FITTED onto one canvas with
# their frames in the same place, so the game swaps a picture and nothing
# moves: the owner drew each state at a slightly different size.
#
# Writes public/ui/quest/*.webp.  ImageMagick 6 (convert).  Run from the repo:
#   bash tools/ui/cut-quest-art.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
SRC=tools/ui/quest-art
OUT=public/ui/quest
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

S1=$SRC/sheet1-frames.webp
S2=$SRC/sheet2-buttons.webp
S3=$SRC/sheet3-ornaments.webp
WEBP=(-define webp:alpha-quality=100 -define webp:method=6 -quality 90)

crop() { convert "$1" -crop "$2" +repage "$TMP/$3.png"; }
save() { convert "$TMP/$1.png" "${@:3}" "${WEBP[@]}" "$OUT/$2.webp"; }

# Re-fit a piece so that its frame (fx,fy,fw,fh in its own crop) lands on the
# target frame (tx,ty,tw,th) of a CW x CH canvas.  A non-uniform scale of a few
# per cent at most: the states differ by that much.
fit() { # name out CW CH fx fy fw fh tx ty tw th
  local n=$1 o=$2 CW=$3 CH=$4 fx=$5 fy=$6 fw=$7 fh=$8 tx=$9 ty=${10} tw=${11} th=${12}
  local W H iw ih ox oy
  read -r iw ih <<< "$(identify -format '%w %h' "$TMP/$n.png")"
  W=$(awk -v a="$iw" -v t="$tw" -v f="$fw" 'BEGIN{printf "%d", a*t/f+0.5}')
  H=$(awk -v a="$ih" -v t="$th" -v f="$fh" 'BEGIN{printf "%d", a*t/f+0.5}')
  ox=$(awk -v t="$tx" -v f="$fx" -v s="$tw" -v w="$fw" 'BEGIN{printf "%d", t-f*s/w+0.5}')
  oy=$(awk -v t="$ty" -v f="$fy" -v s="$th" -v h="$fh" 'BEGIN{printf "%d", t-f*s/h+0.5}')
  convert -size "${CW}x${CH}" xc:none \( "$TMP/$n.png" -resize "${W}x${H}!" \) \
    -geometry "+${ox}+${oy}" -compose over -composite "$TMP/$o.png"
}

# new alpha = old alpha x mask (white keeps, black clears)
mask_alpha() { # name maskpng out
  convert "$TMP/$1.png" \( +clone -alpha extract "$2" -compose multiply -composite \) \
    -alpha off -compose copy_opacity -composite "$TMP/$3.png"
}

# ── the framed panel (the windows): ten pieces, a 9-slice that keeps the
# crest whole ──
# Rows: the crest and the top band end by 100 (the corner ornaments by 150);
# the bottom band begins at 755 (the corner ornaments at 700).  The fill is
# one piece from row 100 to 755, so the shading the owner painted into it --
# lighter under the crest -- is never repeated in a band piece beside a corner.
# Columns: the corner ornaments are in the outer 100 px each side; the crest,
# its wood band and the two brackets sit in 205-485; between them the top
# band is plain (sampled at 120-180), as is the bottom band; the side edges
# (outline, navy band, gold line) are the outer 40 px.  So the game can draw
# the frame at any width and height with the corners and the crest at their
# own size: only plain band and plain fill ever stretch.
crop "$S1" 690x830+28+16 frame
fcut() { convert "$TMP/frame.png" -crop "$1" +repage "${@:3}" "$TMP/$2.png"; }
fcut 100x150+0+0     frame-tl
fcut 60x100+120+0    frame-tf
fcut 280x100+205+0   frame-tc
fcut 100x150+590+0   frame-tr
fcut 40x550+0+150    frame-ml -resize '40x128!'
fcut 610x655+40+100  frame-mc -resize '610x160!'
fcut 40x550+650+150  frame-mr -resize '40x128!'
fcut 100x130+0+700   frame-bl
fcut 60x75+120+755   frame-bf
fcut 100x130+590+700 frame-br
for n in frame-tl frame-tf frame-tc frame-tr frame-ml frame-mc frame-mr frame-bl frame-bf frame-br; do save $n $n; done

# ── the banners ──
crop "$S1" 724x262+715+415 banner          # glowing green, crest: QUEST COMPLETE
crop "$S1" 720x156+719+678 banner-compact  # the thin one
crop "$S3" 1030x286+10+12 banner-flat      # flat green, laurel crest: QUEST ACCEPTED
save banner banner
save banner-compact banner-compact
save banner-flat banner-flat -resize 720x

# ── the green panel (the XP choice, "Rewards claimed!") ──
crop "$S1" 678x185+737+854 green
save green green

# ── the claim button: gold, glowing, grey on one canvas ──
# frames: gold 1085x174 @9,9 ; glowing 1079x168 @23,24 ; grey 1076x157 @9,9
crop "$S2" 1104x192+55+38 bar-gold
crop "$S2" 1127x211+42+239 bar-glow
crop "$S2" 1094x175+57+449 bar-grey
fit bar-gold claim      1133 222  9  9 1085 174  24 24 1085 174
fit bar-glow claim-glow 1133 222 23 24 1079 168  24 24 1085 174
fit bar-grey claim-off  1133 222  9  9 1076 157  24 24 1085 174
for n in claim claim-glow claim-off; do save $n $n -resize 960x; done

# ── the round X and the round check ──
crop "$S2" 215x210+1176+32 close
crop "$S2" 159x164+1224+475 check
save close close -resize 132x
save check check -resize 120x

# ── the weapon chips (Melee / Bow / Magic) and the selected ring ──
# The owner drew the sword chip selected and the others not; the selected
# one's gold frame (475x170 @25,38 of its crop) is lifted off as a RING (its
# middle cleared) and re-fitted over the plain chip's frame (426x144), so any
# of the three can wear it.  Its check badge is put back unsquashed.
crop "$S2" 444x162+55+634 chip-sword
crop "$S2" 444x162+503+634 chip-bow
crop "$S2" 444x162+951+634 chip-staff
crop "$S2" 537x234+46+801 chip-sel
convert -size 537x234 xc:white -fill black \
  -draw "polygon 57,58 467,58 479,70 479,178 467,190 57,190 45,178 45,70" "$TMP/ringmask.png"
mask_alpha chip-sel "$TMP/ringmask.png" ring-open
convert -size 537x234 xc:black -fill white -draw "circle 471,67 471,30" "$TMP/badgemask.png"
mask_alpha chip-sel "$TMP/badgemask.png" badge-only
convert "$TMP/badge-only.png" -crop 80x80+431+27 +repage "$TMP/badge.png"
CW=482; CH=198
fit chip-sword chip-melee $CW $CH  9 9 426 144  22 32 426 144
fit chip-bow   chip-bow2  $CW $CH 10 9 425 144  22 32 426 144
fit chip-staff chip-magic $CW $CH 10 9 424 144  22 32 426 144
fit ring-open  ring       $CW $CH 25 38 475 170 22 32 426 144
# the badge, uniform: centre (471,67) of the selected crop -> (422.4, 56.8)
convert "$TMP/badge.png" -resize 70x70 "$TMP/badge70.png"
convert "$TMP/ring.png" "$TMP/badge70.png" -geometry +387+22 -compose over -composite "$TMP/chip-ring.png"
for n in chip-melee chip-bow2 chip-magic chip-ring; do save $n "${n/chip-bow2/chip-bow}" -resize 362x; done

# ── the item slot and its glow ──
# frames: slot 216x203 @10,9 ; glowing 213x201 @24,25
crop "$S2" 236x221+600+806 slot0
crop "$S2" 262x253+832+790 slot1
fit slot0 slot      268 257 10  9 216 203  26 27 216 203
fit slot1 slot-glow 268 257 24 25 213 201  26 27 216 203
save slot slot
save slot-glow slot-glow

# ── badge, sparkles, glow, divider, flourish ──
crop "$S3" 366x376+22+678 badge-done
crop "$S3" 236x358+398+672 spark-gold
crop "$S3" 200x332+660+690 spark-green
crop "$S3" 339x363+868+672 burst
crop "$S3" 823x75+68+608 divider
crop "$S3" 463x160+961+480 flourish
save badge-done badge-done -resize 220x
save spark-gold spark-gold -resize 160x
save spark-green spark-green -resize 140x
save burst burst -resize 300x
save divider divider -resize 640x
save flourish flourish -resize 300x

ls -la "$OUT" | awk 'NR>1 {print $5, $9}'
