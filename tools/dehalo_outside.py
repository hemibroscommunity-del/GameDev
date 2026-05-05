"""
Per-frame flood-fill dehalo: for each FRAME_W x FRAME_H cell of a
horizontal strip, flood-fill near-white from the four edges only.
Whites inside the silhouette (stripes, eye highlights) survive because
the fill never reaches them. Whites outside the silhouette (cropping
artifacts, anti-aliased halo from colorkey) become transparent.

CLI:
  python dehalo_outside.py SRC.png DST.png                 # default 64x72
  python dehalo_outside.py SRC.png DST.png --frame-h 64    # 64x64 frames
"""
import argparse
from collections import deque
from pathlib import Path
from PIL import Image

FRAME_W = 64
FRAME_H = 72              # default, overridable via --frame-h
WHITE_THRESH = 235   # >= this on r AND g AND b counts as white-ish background


def is_bg(r, g, b):
    return r >= WHITE_THRESH and g >= WHITE_THRESH and b >= WHITE_THRESH


def flood_clear_frame(img, x0, y0, w, h):
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


def zero_rgb_on_transparent(img: Image.Image) -> int:
    """Set RGB to (0,0,0) on any alpha=0 pixel. Without this, the
    leftover bright RGB on transparent pixels bleeds into the visible
    silhouette when the canvas filters/scales the sprite, producing
    a white halo even though those pixels were "transparent". Also
    helps with any non-zero alpha pixel <= a small alpha threshold
    where the white bleed is most visible."""
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


def force_binary_alpha(img: Image.Image, threshold: int = 128) -> int:
    """Snap every alpha value to 0 or 255 (cutoff at threshold).
    Kills the frame-to-frame "wobble" caused by anti-aliased edges
    sampling slightly different in each source frame — a 92-alpha
    pixel in frame N becomes a 184-alpha pixel in frame N+1, and the
    eye reads the boundary as shifting.  Forcing binary alpha matches
    the visual style of the older hand-edited east sheet."""
    px = img.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or a == 255:
                continue
            if a >= threshold:
                px[x, y] = (r, g, b, 255)
            else:
                px[x, y] = (0, 0, 0, 0)
            n += 1
    return n


def kill_all_light(img: Image.Image, lum_thresh: int = 160) -> int:
    """Zero alpha on EVERY opaque pixel whose color is light (RGB mean
    > lum_thresh).  Use this when the character has no real highlights
    (flat colors) — any lighter-than-base-color pixel is off-white
    bleed from the colorkey, regardless of whether it's at the
    silhouette edge or 'interior'.  Skin tone for these jog sprites is
    ~lum 150; pants/outline are <lum 60; so 160 is a safe cutoff.

    LEGACY: kept for reference / debugging.  Not used by the canonical
    recipe anymore — see kill_bg_grayscale() below.  This rule killed
    AA outline pixels (gray at lum 161-200) → pixelated outline gaps."""
    px = img.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 255 and (r + g + b) / 3 > lum_thresh:
                px[x, y] = (0, 0, 0, 0)
                n += 1
    return n


def kill_bg_grayscale(img: Image.Image, lum_thresh: int = 200, sat_thresh: float = 0.10) -> int:
    """Zero alpha on opaque pixels that are BOTH light AND near-grayscale.
    Replaces --kill-all-light, which over-killed AA outline pixels at
    lum 161-200 (the gray transition band where black outline blends
    into white bg) and produced pixelated gaps in the outline.

    Now: kill only when lum > 200 AND saturation < 0.10.  This preserves:
      * Dark / mid-luminance outline pixels (lum < 200) — kept regardless.
      * Anti-aliased outline pixels (gray, lum 100-200) — kept by lum.
      * Skin highlights (saturated tan, sat > 0.10) — kept by sat.
    And kills:
      * Near-white grayscale background residue from the colorkey
        (the actual bleed, lum 215-245, sat ~0).

    Saturation is computed as (max(rgb) - min(rgb)) / max(rgb)."""
    px = img.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a != 255:
                continue
            lum = (r + g + b) / 3
            if lum <= lum_thresh:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            sat = 0 if mx == 0 else (mx - mn) / mx
            if sat < sat_thresh:
                px[x, y] = (0, 0, 0, 0)
                n += 1
    return n


def kill_edge_bleed(img: Image.Image, frame_w: int, frame_h: int, lum_thresh: int = 175, passes: int = 3) -> int:
    """Zero alpha on opaque pixels adjacent to transparent pixels if
    their color is light (RGB mean > lum_thresh).  These are
    anti-aliased background pixels that survived the colorkey because
    they were a bit too far from the target color.  Runs `passes`
    iterations so a 2-pixel-deep halo gets chased inward.

    Per-frame so the bleed kill doesn't bridge across cell seams.
    Interior light pixels (no transparent neighbor) are PRESERVED so
    real character highlights stay intact."""
    w, h = img.size
    frames = w // frame_w
    total = 0
    for _ in range(passes):
        snapshot = img.copy().load()
        px = img.load()
        for fi in range(frames):
            x0 = fi * frame_w
            for y in range(frame_h):
                for x in range(frame_w):
                    r, g, b, a = snapshot[x0 + x, y]
                    if a != 255:
                        continue
                    if (r + g + b) / 3 <= lum_thresh:
                        continue
                    has_transparent = False
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < frame_w and 0 <= ny < frame_h:
                            if snapshot[x0 + nx, ny][3] == 0:
                                has_transparent = True
                                break
                    if has_transparent:
                        px[x0 + x, y] = (0, 0, 0, 0)
                        total += 1
    return total


def smooth_silhouette(img: Image.Image, frame_w: int, frame_h: int) -> int:
    """Apply a small gaussian blur to the alpha channel per-frame, then
    re-clip very-low alphas to 0.  Introduces a soft anti-aliased band
    at the silhouette edge so the boundary doesn't read as a hard jaggy
    1-pixel wall — mimicking the natural anti-aliasing on jog-east.png.
    Operates per-frame so the blur doesn't bridge across cell seams."""
    from PIL import ImageFilter
    w, h = img.size
    frames = w // frame_w
    n = 0
    for fi in range(frames):
        x0 = fi * frame_w
        cell = img.crop((x0, 0, x0 + frame_w, frame_h))
        r_ch, g_ch, b_ch, a_ch = cell.split()
        blurred = a_ch.filter(ImageFilter.GaussianBlur(radius=0.6))
        # Re-binarize the bottom: anything below ~16 -> 0 (kills speckle).
        bpx = blurred.load()
        for y in range(frame_h):
            for x in range(frame_w):
                v = bpx[x, y]
                if v < 16:
                    bpx[x, y] = 0
                elif v != a_ch.getpixel((x, y)):
                    n += 1
        cell = Image.merge("RGBA", (r_ch, g_ch, b_ch, blurred))
        img.paste(cell, (x0, 0))
    return n


def add_outline(img: Image.Image, frame_w: int, frame_h: int, color=(12, 8, 6), alpha: int = 255) -> int:
    """Draw a 1-pixel dark border around every silhouette.  AI-generated
    jog sources don't paint a black outline like the hand-keyed
    jog-east.png does, so the silhouette edge is just skin-color against
    the background — every tiny frame-to-frame shift of that edge reads
    as wobble.  A synthetic outline anchors the boundary so the eye
    locks onto the outline instead of the moving skin-color edge.
    Operates per-frame so the outline doesn't bridge across cell seams."""
    src = img.copy()
    src_px = src.load()
    dst_px = img.load()
    w, h = img.size
    frames = w // frame_w
    n = 0
    for fi in range(frames):
        x0 = fi * frame_w
        for fy in range(frame_h):
            for fx in range(frame_w):
                r, g, b, a = src_px[x0 + fx, fy]
                if a != 0:
                    continue
                # Check 4-neighbors WITHIN this frame for an opaque pixel.
                opaque_neighbor = False
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = fx + dx, fy + dy
                    if 0 <= nx < frame_w and 0 <= ny < frame_h:
                        if src_px[x0 + nx, ny][3] >= 128:
                            opaque_neighbor = True
                            break
                if opaque_neighbor:
                    dst_px[x0 + fx, fy] = (color[0], color[1], color[2], alpha)
                    n += 1
    return n


def kill_light_halo(img: Image.Image, lum_thresh: int = 180) -> int:
    """Drop any partial-alpha pixel whose color is light (RGB mean
    > lum_thresh) to alpha=0.  This is the visible "white pixels
    coming through" — leftover anti-aliased background from the
    colorkey blend.  Dark partial-alpha pixels are PRESERVED because
    they're the character's own outline (which we want to keep, like
    on the hand-keyed jog-east.png)."""
    px = img.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or a == 255:
                continue
            if (r + g + b) / 3 > lum_thresh:
                px[x, y] = (0, 0, 0, 0)
                n += 1
    return n


def process(src: Path, dst: Path, frame_h: int, binary_alpha: bool, no_flood: bool, kill_halo: bool, outline: bool, edge_bleed: bool, all_light: bool, bg_grayscale: bool) -> None:
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    if h != frame_h or w % FRAME_W != 0:
        raise RuntimeError(f"unexpected size {w}x{h}; expected width%{FRAME_W}==0 and height=={frame_h}")
    frames = w // FRAME_W
    if not no_flood:
        for i in range(frames):
            flood_clear_frame(img, i * FRAME_W, 0, FRAME_W, frame_h)
    halo_n = kill_light_halo(img) if kill_halo else 0
    bleed_n = kill_edge_bleed(img, FRAME_W, frame_h) if edge_bleed else 0
    all_n = kill_all_light(img) if all_light else 0
    bg_gray_n = kill_bg_grayscale(img) if bg_grayscale else 0
    outline_n = add_outline(img, FRAME_W, frame_h) if outline else 0
    smooth_n = smooth_silhouette(img, FRAME_W, frame_h) if outline else 0
    zeroed = zero_rgb_on_transparent(img)
    binary_n = force_binary_alpha(img) if binary_alpha else 0
    img.save(dst, "PNG", optimize=True)
    flood_note = "no-flood" if no_flood else f"{frames} frames keyed"
    msg = f"{src.name} -> {dst.name}: {flood_note}, {zeroed} alpha=0 zeroed"
    if kill_halo:
        msg += f", {halo_n} light-halo killed"
    if edge_bleed:
        msg += f", {bleed_n} edge-bleed killed"
    if all_light:
        msg += f", {all_n} all-light killed"
    if bg_grayscale:
        msg += f", {bg_gray_n} bg-grayscale killed"
    if outline:
        msg += f", {smooth_n} alpha smoothed, {outline_n} outline pixels added"
    if binary_alpha:
        msg += f", {binary_n} alpha snapped to 0/255"
    print(msg)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Flood-fill dehalo a horizontal sprite strip.")
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--frame-h", type=int, default=FRAME_H,
                   help=f"frame height in pixels (default {FRAME_H})")
    p.add_argument("--binary-alpha", action="store_true",
                   help="force every pixel to alpha 0 or 255 (NOT recommended for "
                        "player jog sprites — strips the anti-aliased outline and "
                        "produces frame-to-frame edge wobble)")
    p.add_argument("--no-flood", action="store_true",
                   help="skip the edge-flood-fill pass (only zero RGB on alpha=0). "
                        "Use this for AI-generated jog sources where the soft "
                        "colorkey already gave a clean silhouette and you want "
                        "to PRESERVE the anti-aliased outline like jog-east.png")
    p.add_argument("--kill-halo", action="store_true",
                   help="zero alpha on partial-alpha pixels whose color is light. "
                        "Removes the leftover white-halo bleed from a soft colorkey "
                        "while preserving DARK partial-alpha pixels (the character's "
                        "anti-aliased outline). Pairs well with --no-flood.")
    p.add_argument("--outline", action="store_true",
                   help="draw a 1-pixel dark border around every silhouette. AI "
                        "jog sources lack the dark outline that anchors east's "
                        "boundary; without it, the skin-color edge against the "
                        "background reads as wobble on every tiny frame shift.")
    p.add_argument("--kill-edge-bleed", action="store_true",
                   help="zero alpha on opaque LIGHT pixels (lum > 180) that "
                        "border a transparent pixel. Targeted edge cleanup for "
                        "anti-aliased background that survived the colorkey. "
                        "Preserves interior light pixels (real character "
                        "highlights). Two passes by default to chase 2-pixel "
                        "halo inward.")
    p.add_argument("--kill-all-light", action="store_true",
                   help="LEGACY (kept for reference, not in canonical recipe): "
                        "zero alpha on EVERY opaque pixel with lum > 160. "
                        "Killed AA outline pixels (gray, lum 161-200) and "
                        "produced pixelated outline gaps.  Use --kill-bg-grayscale "
                        "instead.")
    p.add_argument("--kill-bg-grayscale", action="store_true",
                   help="zero alpha on opaque pixels that are BOTH light "
                        "(lum > 200) AND near-grayscale (sat < 0.10).  Kills "
                        "near-white bg residue from the colorkey while "
                        "preserving AA outline pixels (gray, lum 100-200) and "
                        "skin highlights (saturated tan).  Canonical replacement "
                        "for --kill-all-light.")
    args = p.parse_args()
    process(Path(args.src), Path(args.dst), args.frame_h, args.binary_alpha, args.no_flood, args.kill_halo, args.outline, args.kill_edge_bleed, args.kill_all_light, args.kill_bg_grayscale)
