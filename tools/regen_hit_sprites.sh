#!/usr/bin/env bash
# Hit-react sprite-sheet pipeline at 256-px output.
#
# Source: assets/character animations/hit-<dir>.mov for
#   south, southwest, east, north.  Each video is the FULL hit-react
#   arc (3-5 s, 24 fps, 560x560).  In-engine the 6-frame loop plays
#   over 250 ms, so we sample 6 evenly-spaced frames spanning 10%-100%
#   of the source (skip the first 10% which on AI-generated clips is
#   usually a static "wind-up" hold).
#
# NE sheet is produced by mirroring the N strip frame-by-frame (so
#   frame order stays 1..6 rather than reversing).  NW is rendered
#   by the in-engine horizontal mirror of NE -> the N artwork.
#
# Usage: bash tools/regen_hit_sprites.sh

set -euo pipefail

DIRS=(south southwest east north)

for d in "${DIRS[@]}"; do
  src="assets/character animations/hit-$d.mov"
  echo "=== $d ==="

  tmpdir="/tmp/hit-frames-$d"
  rm -rf "$tmpdir"
  mkdir -p "$tmpdir"

  # Probe source frame count.
  N=$(ffprobe -v error -count_frames -show_entries stream=nb_read_frames \
        -of default=nw=1:nk=1 -select_streams v:0 "$src")
  echo "  source frames: $N"

  # Compute 6 evenly-spaced frame indexes (10% -> 100%).
  python -c "
N = $N
start_pct, end_pct, count = 0.10, 1.00, 6
idxs = [int(start_pct * (N-1) + (end_pct - start_pct) * (N-1) * (i / (count - 1))) for i in range(count)]
print(' '.join(str(i) for i in idxs))
" > /tmp/_hit_idx.txt
  IDX=$(cat /tmp/_hit_idx.txt)
  echo "  picked: $IDX"

  # Extract each picked frame to a numbered PNG.
  i=1
  for f in $IDX; do
    ffmpeg -y -loglevel error -i "$src" \
      -vf "select=eq(n\,$f)" -vframes 1 \
      "$tmpdir/$(printf '%03d' $i).png"
    i=$((i+1))
  done

  # Tile the 6 frames horizontally.
  ffmpeg -y -loglevel error -i "$tmpdir/%03d.png" \
    -vf "tile=6x1" -frames:v 1 \
    "/tmp/hit-strip-$d.png"

  # Lanczos downscale to height 256 (3360x560 native -> 1536x256 output).
  python tools/lanczos_downscale.py \
    "/tmp/hit-strip-$d.png" \
    "public/sprites/player/hit-$d.png" \
    --height 256 \
    --bg-flood-from-edge
done

# NE = N mirrored per-frame.  Loading the strip, flipping each cell
# individually, recomposing -- keeps frame order 1..6 instead of
# reversing the way a whole-strip hflip would.
python -c "
from PIL import Image
src = Image.open('public/sprites/player/hit-north.png').convert('RGBA')
W, H = src.size
fw = W // 6
out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for i in range(6):
    cell = src.crop((i * fw, 0, (i + 1) * fw, H))
    out.paste(cell.transpose(Image.FLIP_LEFT_RIGHT), (i * fw, 0))
out.save('public/sprites/player/hit-northeast.png', 'PNG', optimize=True)
print('hit-northeast.png written from hit-north.png mirror')
"
