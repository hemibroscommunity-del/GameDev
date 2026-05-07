"""
Generate the town walkability grid from the yellow-annotated source.
Run once whenever town.jpg or the yellow overlay change.

Inputs (paths are relative to the repo root):
  IMG_8005.jpeg           - clean town image (1024x1024)
  IMG_8006.heic           - same town with yellow rectangles painted
                            over each building footprint

Outputs:
  public/maps/town.jpg                 - copy of IMG_8005 (overwritten)
  public/maps/town.walkability.json    - 32x32 boolean grid; false=blocked
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from pillow_heif import register_heif_opener

register_heif_opener()

REPO = Path(__file__).resolve().parent.parent
SRC_CLEAN = REPO / "IMG_8005.jpeg"
SRC_YELLOW = REPO / "IMG_8006.heic"
OUT_TOWN_JPG = REPO / "public" / "maps" / "town.jpg"
OUT_WALK = REPO / "public" / "maps" / "town.walkability.json"

GRID = 32        # 32x32 logical tile grid for walkability
TILE = 1024 // GRID
# Cell becomes "blocked" once this fraction of its 32x32 pixels is yellow.
BLOCK_THRESHOLD = 0.20


def is_yellow(rgb: np.ndarray) -> np.ndarray:
    """Boolean mask of the painted-yellow overlay color (saturated, neon)."""
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    return (
        (r >= 220) & (g >= 200) & (b <= 150)
        & ((r - b) >= 80) & ((g - b) >= 60)
        & (np.abs(r - g) <= 60)
    )


def main() -> int:
    if not SRC_CLEAN.exists() or not SRC_YELLOW.exists():
        print(f"missing source: need both {SRC_CLEAN.name} and {SRC_YELLOW.name}")
        return 1

    clean = Image.open(SRC_CLEAN).convert("RGB")
    yellow = Image.open(SRC_YELLOW).convert("RGB")
    if clean.size != (1024, 1024) or yellow.size != (1024, 1024):
        print(f"unexpected size: clean={clean.size} yellow={yellow.size}")
        return 1

    yellow_arr = np.array(yellow)
    mask = is_yellow(yellow_arr)
    print(f"yellow pixels: {mask.sum()} / {mask.size}")

    walkable = np.ones((GRID, GRID), dtype=bool)
    for ry in range(GRID):
        for rx in range(GRID):
            block = mask[ry * TILE:(ry + 1) * TILE, rx * TILE:(rx + 1) * TILE]
            if block.mean() >= BLOCK_THRESHOLD:
                walkable[ry, rx] = False

    blocked_cells = int((~walkable).sum())
    print(f"blocked cells: {blocked_cells} / {GRID * GRID}")

    walk_payload = {
        "width": GRID,
        "height": GRID,
        # 2-D row-major array; true = walkable, false = blocked.
        "grid": [[bool(walkable[ry, rx]) for rx in range(GRID)] for ry in range(GRID)],
    }
    OUT_WALK.write_text(json.dumps(walk_payload), encoding="utf-8")
    print(f"wrote {OUT_WALK.relative_to(REPO)}")

    clean.save(OUT_TOWN_JPG, "JPEG", quality=92, optimize=True)
    print(f"wrote {OUT_TOWN_JPG.relative_to(REPO)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
