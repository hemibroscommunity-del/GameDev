"""
Process a Grok-Imagine 1024x1024 tileset image into Tiled-ready .png + .tsx
files for BroTown's Tiled map loader (src/rendering/tiledMaps.js).

What it does, per cell of the 32x32 grid (each cell is 32x32 px):
  1. Flood-fill near-white background from the four cell edges into
     transparency. Interior whites (stripes, highlights) survive because
     the fill never reaches them. Same logic as tools/dehalo_outside.py.
  2. Zero RGB on every alpha=0 pixel so the canvas can't bleed leftover
     white into visible edges when scaling/filtering.

Optional --split lets you carve rows out into separate tilesets named with
keywords the loader treats as solid ("plant", "buildings", "props"):

  --split 13-16=plant      -> rows 13..16 -> tileset-<name>-plant.{png,tsx}
  --split 17-24=buildings  -> rows 17..24 -> tileset-<name>-buildings.{png,tsx}

Rows are 1-indexed inclusive. Anything not covered by a --split stays in
the main tileset (which the loader treats as walkable).

Usage:
  python tools/process_grok_tileset.py <src.png> <biome_name>
  python tools/process_grok_tileset.py <src.png> <biome_name> \
      --split 13-16=plant --split 17-24=buildings

Outputs land in public/sprites/tiles/. The .tsx files reference the .png
by relative filename so Tiled and the runtime loader pick them up.
"""
import argparse
import sys
from collections import deque
from pathlib import Path
from PIL import Image

TILE = 32
GRID = 32
WIDTH = TILE * GRID  # 1024
HEIGHT = TILE * GRID  # 1024
WHITE_THRESH = 235

OUT_DIR = Path("public/sprites/tiles")


def is_bg(r, g, b):
    return r >= WHITE_THRESH and g >= WHITE_THRESH and b >= WHITE_THRESH


def flood_clear_cell(img, x0, y0, w, h):
    """Flood-fill near-white from the cell edges into alpha 0. Same algo
    as tools/dehalo_outside.py:flood_clear_frame, just per 32x32 cell."""
    px = img.load()
    visited = [[False] * h for _ in range(w)]
    q = deque()
    for fx in range(w):
        for fy in (0, h - 1):
            r, g, b, a = px[x0 + fx, y0 + fy]
            if a > 0 and is_bg(r, g, b):
                q.append((fx, fy))
                visited[fx][fy] = True
    for fy in range(h):
        for fx in (0, w - 1):
            r, g, b, a = px[x0 + fx, y0 + fy]
            if a > 0 and is_bg(r, g, b):
                q.append((fx, fy))
                visited[fx][fy] = True
    while q:
        fx, fy = q.popleft()
        px[x0 + fx, y0 + fy] = (0, 0, 0, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = fx + dx, fy + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                visited[nx][ny] = True
                r, g, b, a = px[x0 + nx, y0 + ny]
                if a > 0 and is_bg(r, g, b):
                    q.append((nx, ny))


def zero_rgb_on_transparent(img):
    px = img.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 and (r != 0 or g != 0 or b != 0):
                px[x, y] = (0, 0, 0, 0)
                n += 1
    return n


def write_tsx(out_dir: Path, name: str, png_filename: str, cols: int, rows: int) -> Path:
    """Mirror the existing tileset-frost.tsx format. trans="ffffff" is kept
    for editor-tool compatibility even though our PNGs already have a real
    alpha channel."""
    tilecount = cols * rows
    px_w, px_h = cols * TILE, rows * TILE
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<tileset version="1.10" tiledversion="1.10.0" name="{name}" '
        f'tilewidth="{TILE}" tileheight="{TILE}" '
        f'tilecount="{tilecount}" columns="{cols}">\n'
        f' <image source="{png_filename}" trans="ffffff" width="{px_w}" height="{px_h}"/>\n'
        '</tileset>\n'
    )
    tsx_path = out_dir / f"tileset-{name}.tsx"
    tsx_path.write_text(xml, encoding="utf-8")
    return tsx_path


def parse_splits(raw):
    """Parse --split arguments. Each is 'A-B=suffix' (1-indexed inclusive
    rows, mapped to a tileset suffix that the loader treats as solid)."""
    out = []
    for spec in raw or []:
        if "=" not in spec:
            sys.exit(f"--split expects '<rows>=<suffix>', got: {spec}")
        rng, suffix = spec.split("=", 1)
        if "-" in rng:
            a, b = rng.split("-", 1)
            r0 = int(a)
            r1 = int(b)
        else:
            r0 = r1 = int(rng)
        if not (1 <= r0 <= r1 <= GRID):
            sys.exit(f"--split rows {r0}-{r1} out of range 1..{GRID}")
        out.append((r0, r1, suffix.strip()))
    return out


def extract_rows(src: Image.Image, r0: int, r1: int) -> Image.Image:
    """Crop rows r0..r1 (1-indexed, inclusive) from the source. Height of
    the output is (r1 - r0 + 1) * TILE; width stays full WIDTH."""
    y0 = (r0 - 1) * TILE
    y1 = r1 * TILE
    return src.crop((0, y0, WIDTH, y1))


def process(src_path: Path, biome: str, splits) -> None:
    if not src_path.exists():
        sys.exit(f"source not found: {src_path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    if w != WIDTH or h != HEIGHT:
        sys.exit(f"expected {WIDTH}x{HEIGHT} source, got {w}x{h}")

    # Pass 1: dehalo every cell in the source. This applies whether the
    # cell ends up in the main tileset or a split — same cleanup either way.
    for cy in range(GRID):
        for cx in range(GRID):
            flood_clear_cell(img, cx * TILE, cy * TILE, TILE, TILE)

    # Pass 2: build the split tilesets (cropped row ranges, then RGB-zero
    # on transparent pixels). Each split becomes its own .png + .tsx.
    used_rows = set()
    written = []
    for r0, r1, suffix in splits:
        for r in range(r0, r1 + 1):
            used_rows.add(r)
        sub = extract_rows(img, r0, r1)
        zero_rgb_on_transparent(sub)
        out_name = f"{biome}-{suffix}"
        out_png = OUT_DIR / f"tileset-{out_name}.png"
        sub.save(out_png, "PNG", optimize=True)
        out_tsx = write_tsx(OUT_DIR, out_name, out_png.name, GRID, r1 - r0 + 1)
        written.append(("split", out_png, out_tsx, f"rows {r0}..{r1}"))

    # Pass 3: build the main tileset. If splits were used, blank the rows
    # they consumed so tile IDs stay stable across the source/main/split
    # combinations (anyone authoring a map can rely on row*32+col matching
    # the same Grok cell whether they reference the main or a split).
    if used_rows:
        main = img.copy()
        mp = main.load()
        for r in used_rows:
            y0 = (r - 1) * TILE
            for y in range(y0, y0 + TILE):
                for x in range(WIDTH):
                    mp[x, y] = (0, 0, 0, 0)
    else:
        main = img
    zero_rgb_on_transparent(main)
    main_png = OUT_DIR / f"tileset-{biome}.png"
    main.save(main_png, "PNG", optimize=True)
    main_tsx = write_tsx(OUT_DIR, biome, main_png.name, GRID, GRID)
    written.append(("main", main_png, main_tsx, "all rows" if not used_rows else f"rows except {sorted(used_rows)}"))

    print(f"{src_path.name} -> {len(written)} tileset(s):")
    for kind, png, tsx, note in written:
        print(f"  [{kind}] {png}  +  {tsx.name}  ({note})")


def main():
    ap = argparse.ArgumentParser(description="Slice + clean a Grok-Imagine tileset for BroTown.")
    ap.add_argument("src", type=Path, help="source 1024x1024 PNG")
    ap.add_argument("biome", type=str, help="biome name (e.g. 'frost-v2'); output is tileset-<biome>.png/.tsx")
    ap.add_argument("--split", action="append", default=[],
                    help="row range to split into a solid sub-tileset, e.g. 17-24=buildings (1-indexed, inclusive)")
    args = ap.parse_args()
    splits = parse_splits(args.split)
    process(args.src, args.biome, splits)


if __name__ == "__main__":
    main()
