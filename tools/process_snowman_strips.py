"""Build the snowman idle-loop sprite strips from the source MP4s.

Why this script: ffmpeg's `colorkey` and a flood-fill from the border
both fail when the snowman has dark elements (hat, wood arms) on a
black background — the hat *is* pure black, identical to the bg, so
no color-similarity check can tell them apart.  We delegate
foreground detection to rembg (U²-Net), which uses a trained neural
network to identify the snowman silhouette regardless of color.

Pipeline per direction:
  1. ffmpeg samples each MP4 at 4 fps for 6 s -> 24 PNG frames at the
     source resolution (preserves detail for the segmenter)
  2. rembg returns RGBA frames with the background as alpha=0
  3. Pillow downscales to 128x128 (preserving aspect, padded square)
     and tiles all 24 into a 3072x128 horizontal strip
  4. Strip lands at public/sprites/monsters/snowman/snowman-{dir}.png

Run from project root:  python tools/process_snowman_strips.py
"""

import os
import subprocess
import tempfile
import numpy as np
from PIL import Image
from scipy import ndimage
from rembg import remove, new_session

DIRS = ['s', 'sw', 'e', 'n', 'ne']

SRC_DIR = 'assets/monster animations/snowman'
DEST_DIR = 'public/sprites/monsters/snowman'
FPS = 4
DURATION = 6
FRAME_SIZE = 128
NUM_FRAMES = FPS * DURATION  # 24

# u2net is the default; isnet-general-use is sharper on solid silhouettes.
SESSION = new_session('isnet-general-use')


def remove_bg(img):
    """Run the segmenter, then fill interior holes in the alpha mask.

    rembg sometimes punches holes inside large uniform regions of the
    snowman body where its confidence drops.  scipy.ndimage's
    binary_fill_holes treats any transparent pixel NOT reachable from
    the image border as an interior hole and fills it back in.  We
    apply the resulting mask to the original (pre-segmentation) RGB so
    those filled-in pixels recover their original snowman color
    instead of being flat black."""
    cut = remove(img, session=SESSION).convert('RGBA')
    arr = np.array(cut)
    rgb = np.array(img.convert('RGB'))
    alpha = arr[:, :, 3]
    solid = alpha > 128
    filled = ndimage.binary_fill_holes(solid)
    new_alpha = np.where(filled, np.maximum(alpha, 255), alpha).astype(np.uint8)
    out_rgb = np.where(filled[..., None] & (alpha[..., None] < 128), rgb, arr[:, :, :3])
    out = np.dstack([out_rgb, new_alpha])
    return Image.fromarray(out, mode='RGBA')


def fit_square(img, size):
    """Resize preserving aspect, then center-pad to a transparent square."""
    img.thumbnail((size, size), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(img, ((size - img.width) // 2, (size - img.height) // 2), img)
    return out


def process_direction(dir_short):
    src = os.path.join(SRC_DIR, f'snowman-idle-{dir_short}.mp4')
    dst = os.path.join(DEST_DIR, f'snowman-{dir_short}.png')

    with tempfile.TemporaryDirectory() as tmp:
        cmd = [
            'ffmpeg', '-y', '-t', str(DURATION), '-i', src,
            '-vf', f'fps={FPS}',
            '-loglevel', 'error',
            os.path.join(tmp, 'frame_%04d.png'),
        ]
        subprocess.run(cmd, check=True)

        strip = Image.new('RGBA', (FRAME_SIZE * NUM_FRAMES, FRAME_SIZE), (0, 0, 0, 0))
        for i in range(NUM_FRAMES):
            frame_path = os.path.join(tmp, f'frame_{i + 1:04d}.png')
            if not os.path.exists(frame_path):
                continue
            img = Image.open(frame_path).convert('RGB')
            cut = remove_bg(img)
            small = fit_square(cut, FRAME_SIZE)
            strip.paste(small, (FRAME_SIZE * i, 0))
            print(f'  {dir_short} frame {i + 1}/{NUM_FRAMES}', end='\r')

        os.makedirs(DEST_DIR, exist_ok=True)
        strip.save(dst)
        print(f'\nwrote {dst}  ({strip.size[0]}x{strip.size[1]} rgba)')


def main():
    for d in DIRS:
        process_direction(d)


if __name__ == '__main__':
    main()
