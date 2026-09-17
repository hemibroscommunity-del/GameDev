#!/usr/bin/env python3
"""Cut the owner's four zone-entry banner sheets into game-ready ornament strips.

v2.3.2596 (owner: "I also want to add new zone animations for where you enter a
new zone.  Maybe play this briefly across the upper center of the screen then
dock where it tells you what location you're in").

═══ WHAT THE SOURCE ACTUALLY IS ═══

The owner sent the art TWICE, and the second drop is the usable one:

  zonebanner-<zone>-sheet.png      contact sheets: a hero banner plus a 3x3
                                   grid of nine beats, with the zone NAME and
                                   the beat CAPTIONS ("1 - EMPTY BAR", circled
                                   number badges) baked into the pixels.
  zonebanner-<zone>-ornament.png   the same nine beats as DECORATION ONLY --
                                   no plaque, no name, no captions.

This tool reads the ORNAMENT sheets.  The contact sheets stay in
docs/triage-2026-09-17/assets/ as the reference for what the assembled banner
is supposed to look like, and are not cut: their text is unusable (baked name,
baked captions) and their plaque is something the game can draw better itself,
at any width, in the live UI palette.

That choice is what makes the feature affordable.  With the name no longer
painted into the art, an ornament set belongs to a THEME (desert, fire, frost,
forest), the game prints the zone name in the plaque, and the plaque stretches
to whatever the name needs.

═══ EACH CELL HOLDS TWO PIECES, NOT ONE ═══

Measured, not assumed (TRAPS §59 -- "slicing a contact sheet on an even grid it
only looks like").  Every cell contains a LEFT ornament and a RIGHT ornament as
separate islands with a gutter between them, because they flank a bar that is
not in the picture.  So there are 18 pieces per sheet, not 9.

The grid was recovered from the pieces' own ANCHORS rather than by dividing the
sheet, because the pieces grow across the nine beats and their bounding boxes
therefore move:

  * every LEFT piece is flush to its cell's left edge  (x = cell + 8, all 12
    samples per sheet)
  * every RIGHT piece is flush to its cell's right edge (x = cell + 482 - 7)
  * the three cell origins are 0 / 482 / 964, i.e. an EXACT 482px pitch, on
    all four sheets

The ROW pitch is NOT recoverable that way -- the art grows upward AND downward
(icicles, hanging vines), so neither tops nor bottoms are fixed.  It is
measured by vertical normalised cross-correlation of row 2 against row 3, which
is the pair whose content is most alike (scores 0.67-0.91), and it differs per
sheet: flame 301.3, frost 325.7, verdant 331.7, wind 302.3.  A single typed
"1086/3 = 362" would have been wrong on all four.

ASSERTIONS, per TRAPS §59's "if you must hardcode, assert": the tool refuses to
run unless it finds exactly 18 pieces per sheet, the three column anchors are
482 +/- 4 apart, and no piece touches its crop edge anywhere the sheet itself
does not already clip it.  Every cell's measured box is printed.

═══ THE ALPHA WAS DIRTY, AND HOW DIRTY IS A MEASURED NUMBER ═══

All four ornament sheets carry chroma-key residue -- a wash of the zone's own
colour across the background (frost cyan (113,153,220), wind tan (214,150,84),
verdant olive (104,124,31), flame red (189,59,8); recovered by the repo's own
tools/survey_white_fringe.py matte solve).

It is much LESS visible than it looks in an alpha-channel dump, and the reason
matters: 77-88% of the residue sits at alpha == 1, which is 0.4% opacity.  It
is invisible per-pixel but it covers a quarter to a half of the sheet, so it
composites as a faint tinted RECTANGLE around the banner -- the "visible box"
failure, arriving by a route that a per-pixel look does not show.

Pixels that are BOTH more than 24px from any solid (alpha >= 128) core AND
visible (alpha >= 16), i.e. the junk a threshold cannot hide:

    flame      198 px      frost    5,848 px
    verdant    759 px      wind       401 px      (of 1,572,528 per sheet)

So it is salvageable, and it is salvaged HERE, in the export, rather than
handed back to the owner to re-export -- 0.37% of the worst sheet is not worth
a round trip.  Three passes, in order:

  1. FLOOR        alpha < 6 -> 0.  Removes the alpha-1 wash outright (171k px
                  on frost) without touching anything a person can see.
  2. FAR CULL     more than 24px from a solid core AND alpha < 24 -> 0.  This
                  is the graded part: a real glow close to its source keeps
                  every value it has; only far, faint haze is cut.
  3. ORPHAN CULL  islands with peak alpha < 96 AND area < 400px -> 0.  This is
                  the loose speckle.  It is deliberately NOT "drop anything
                  detached": the snowflakes, embers, fireflies and sand flecks
                  are detached BY DESIGN and peak at 255, so they survive.

Then the RGB fringe is repaired by tools/defringe_gray.py, called as a
subprocess and unchanged -- the same delegation tools/defringe_matte_sweep.py
already does, so the repo keeps ONE definition of "de-fringe" (every
semi-transparent pixel keeps its alpha and takes the RGB of the nearest opaque
pixel).  Do not inline a second copy of it here.

A note on why the repo's usual matte-spread discriminator is not the gate:
survey_white_fringe.py reports spreads of 12.8-24.5 on these sheets, which its
own header would read as "no single background, honest anti-aliasing".  That
test was built for flat sprite art.  This art is glow-heavy, and a glow's
semi-transparent pixels legitimately differ from the nearest opaque pixel, so
the spread is inflated by the art rather than by the matte.  The distance-and-
alpha measurement above is the one that answers the question actually being
asked, and it is the one reported.

═══ OUTPUT ═══

One webp per theme in public/sprites/fx/ (the same home as the other DOM-drawn
strip, levelup-burst-v1.webp):

    zonebanner-<theme>-v1.webp     2 rows x 9 columns of a uniform cell
                                   row 0 = left ornament, beats 1..9
                                   row 1 = right ornament, beats 1..9

A uniform output grid is correct HERE even though the input grid was not,
because every cell is cut at the same offset from its anchor -- the registration
is done on the way out, so the strip the game reads has no jitter left in it to
correct.  Left pieces sit flush left in their cell, right pieces flush right,
which is how the renderer anchors them to the two ends of the plaque.

The measured numbers land in src/data/zoneBanner.js.  Re-run this tool if the
art changes; do not hand-edit them.

Run:
  python3 tools/process_zone_banner_sheets.py            # write the strips
  python3 tools/process_zone_banner_sheets.py --dry-run  # measure and report
  python3 tools/process_zone_banner_sheets.py --proof    # + alignment proofs
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image
from scipy import ndimage

SRC_DIR = 'docs/triage-2026-09-17/assets'
OUT_DIR = 'public/sprites/fx'
PROOF_DIR = 'docs/triage-2026-09-17/assets'

# theme -> source sheet basename.  The zone ids these serve live in
# src/data/zoneBanner.js, not here: this tool knows about ART, not about zones.
THEMES = {
    'desert': 'wind-dunes',
    'fire': 'flame-fields',
    'frost': 'frost-ridge',
    'forest': 'verdant-wilds',
}

# Cell grid, recovered from the piece anchors (see header).  Same on all four.
CELL_X = [0, 482, 964]
CELL_W = 482
LEFT_INSET = 8          # every left piece starts here inside its cell
RIGHT_INSET = 7         # every right piece ends this far from the cell's right

# Row pitch per sheet, from vertical NCC of row 2 vs row 3 (see header).
ROW_PITCH = {
    'wind-dunes': 302.3,
    'flame-fields': 301.3,
    'frost-ridge': 325.7,
    'verdant-wilds': 331.7,
}
# y of the first row's anchor (the row-1 content top; rows are pitched from it).
ROW0_Y = {
    'wind-dunes': 194,
    'flame-fields': 204,
    'frost-ridge': 152,
    'verdant-wilds': 133,
}

FLOOR_A = 6             # pass 1: below this is the alpha-1 wash
FAR_PX = 24             # pass 2: distance from a solid core that counts as far
FAR_A = 24              # pass 2: alpha a far pixel must reach to survive
ORPHAN_PEAK = 96        # pass 3: an island under this peak is not real art...
ORPHAN_AREA = 400       # ...if it is also smaller than this
CORE_A = 128            # what counts as "solid" when measuring distance

PAD = 6                 # slack around the measured union box, in sheet px
WEBP_QUALITY = 82


def clean_alpha(rgba):
    """The three-pass alpha cleanup described in the header.  Returns the
    cleaned array plus the per-pass counts, because the counts are the report."""
    a = rgba.copy()
    al = a[:, :, 3].astype(np.int32)
    before = int((al > 0).sum())

    core = al >= CORE_A
    dist = ndimage.distance_transform_edt(~core)

    al1 = np.where(al < FLOOR_A, 0, al)
    n_floor = before - int((al1 > 0).sum())

    al2 = np.where((dist > FAR_PX) & (al1 < FAR_A), 0, al1)
    n_far = int((al1 > 0).sum()) - int((al2 > 0).sum())

    mask = al2 > 0
    lab, k = ndimage.label(mask)
    n_orphan = 0
    if k:
        peaks = ndimage.maximum(al2, lab, range(1, k + 1))
        sizes = ndimage.sum(mask, lab, range(1, k + 1))
        kill = np.zeros(k + 1, dtype=bool)
        kill[1:] = (peaks < ORPHAN_PEAK) & (sizes < ORPHAN_AREA)
        n_orphan = int(sizes[kill[1:]].sum())
        al2 = np.where(kill[lab], 0, al2)

    a[:, :, 3] = al2
    # RGB of a now-transparent pixel is dead weight in the encoder.
    a[:, :, :3] = np.where((al2 == 0)[:, :, None], 0, a[:, :, :3])
    return a, {'nonzero_before': before, 'floored': n_floor,
               'far_cut': n_far, 'orphans_cut': n_orphan,
               'nonzero_after': int((al2 > 0).sum())}


def visible_junk(rgba):
    """The number the owner's question deserves: how much NON-TRANSPARENT junk
    sits outside the intended silhouette, counting only what can be seen."""
    al = rgba[:, :, 3].astype(np.int32)
    core = al >= CORE_A
    if not core.any():
        return int((al > 0).sum())
    dist = ndimage.distance_transform_edt(~core)
    return int(((al >= 16) & (dist > FAR_PX)).sum())


def split_column(al, sheet):
    """Where the left piece stops and the right piece starts, per cell.

    Summed over all nine cells so one busy frame cannot move it, and searched
    only in 210..280 where the gutter has to be: the two pieces TOUCH in the
    late beats on three of the four sheets, so a fixed midpoint would cut art."""
    pitch = ROW_PITCH[sheet]
    prof = np.zeros(CELL_W)
    h = al.shape[0]
    for r in range(3):
        ya = ROW0_Y[sheet] + r * pitch
        y0 = int(max(0, ya - 0.42 * pitch))
        y1 = int(min(h, ya + 0.60 * pitch))
        for cx in CELL_X:
            prof += al[y0:y1, cx:cx + CELL_W].sum(axis=0)
    window = prof[210:280]
    return 210 + int(np.argmin(window))


def measure(al, sheet, split):
    """Bounding box of all 18 pieces, in coordinates relative to their anchor."""
    pitch = ROW_PITCH[sheet]
    h, w = al.shape
    boxes = {}
    for r in range(3):
        ya = ROW0_Y[sheet] + r * pitch
        y0 = int(max(0, ya - 0.42 * pitch))
        y1 = int(min(h, ya + 0.60 * pitch))
        for c in range(3):
            for side in ('L', 'R'):
                if side == 'L':
                    x0, x1 = CELL_X[c], CELL_X[c] + split
                else:
                    x0, x1 = CELL_X[c] + split, min(w, CELL_X[c] + CELL_W)
                sub = al[y0:y1, x0:x1]
                yy, xx = np.where(sub > 0)
                if len(yy) == 0:
                    boxes[(r, c, side)] = None
                    continue
                boxes[(r, c, side)] = (x0 + int(xx.min()), x0 + int(xx.max()),
                                       y0 + int(yy.min()), y0 + int(yy.max()))
    return boxes


def process(theme, sheet, args):
    src = os.path.join(SRC_DIR, 'zonebanner-%s-ornament.png' % sheet)
    rgba = np.asarray(Image.open(src).convert('RGBA')).astype(np.int32)
    h, w = rgba.shape[:2]
    junk_before = visible_junk(rgba)
    cleaned, counts = clean_alpha(rgba)
    junk_after = visible_junk(cleaned)
    al = cleaned[:, :, 3]

    split = split_column(al, sheet)
    boxes = measure(al, sheet, split)

    present = [b for b in boxes.values() if b is not None]
    if len(present) != 18:
        sys.exit('%s: found %d pieces, expected 18 (9 beats x left/right)'
                 % (sheet, len(present)))

    # --- assertions on the recovered grid (TRAPS §59) -------------------
    for c in range(3):
        lefts = [boxes[(r, c, 'L')][0] - CELL_X[c] for r in range(3)]
        rights = [CELL_X[c] + CELL_W - boxes[(r, c, 'R')][1] for r in range(3)]
        if min(lefts) < LEFT_INSET - 12 or min(rights) < RIGHT_INSET - 12:
            sys.exit('%s col%d: a piece overruns its cell (lefts=%s rights=%s)'
                     % (sheet, c, lefts, rights))

    pitch = ROW_PITCH[sheet]
    rel_lx, rel_rx, rel_y = [], [], []
    for (r, c, side), b in boxes.items():
        bx0, bx1, by0, by1 = b
        ya = ROW0_Y[sheet] + r * pitch
        rel_y += [by0 - ya, by1 - ya]
        if side == 'L':
            rel_lx += [bx0 - CELL_X[c], bx1 - CELL_X[c]]
        else:
            rel_rx += [bx0 - CELL_X[c], bx1 - CELL_X[c]]

    lx0 = max(0, int(min(rel_lx)) - PAD)
    lx1 = min(split, int(max(rel_lx)) + 1 + PAD)
    rx0 = max(split, int(min(rel_rx)) - PAD)
    rx1 = min(CELL_W, int(max(rel_rx)) + 1 + PAD)
    ry0 = int(np.floor(min(rel_y))) - PAD
    ry1 = int(np.ceil(max(rel_y))) + 1 + PAD

    lw, rw = lx1 - lx0, rx1 - rx0
    cell_w, cell_h = max(lw, rw), ry1 - ry0

    print('== %-7s (%s)  %dx%d  split@%d  cell %dx%d  L w=%d R w=%d'
          % (theme, sheet, w, h, split, cell_w, cell_h, lw, rw))
    print('   alpha: %d nonzero -> %d  (floored %d, far-cut %d, orphans %d)'
          % (counts['nonzero_before'], counts['nonzero_after'],
             counts['floored'], counts['far_cut'], counts['orphans_cut']))
    print('   visible junk outside the silhouette: %d px -> %d px'
          % (junk_before, junk_after))
    for r in range(3):
        for c in range(3):
            bl, br = boxes[(r, c, 'L')], boxes[(r, c, 'R')]
            print('   beat %d  L x%4d-%4d y%4d-%4d | R x%4d-%4d y%4d-%4d'
                  % (r * 3 + c + 1, bl[0], bl[1], bl[2], bl[3],
                     br[0], br[1], br[2], br[3]))

    strip = Image.new('RGBA', (cell_w * 9, cell_h * 2), (0, 0, 0, 0))
    src_img = Image.fromarray(cleaned.astype(np.uint8), 'RGBA')
    for i in range(9):
        r, c = divmod(i, 3)
        ya = int(round(ROW0_Y[sheet] + r * pitch))
        # Left: flush left in its cell -> flush left in the output cell.
        box = (CELL_X[c] + lx0, ya + ry0, CELL_X[c] + lx1, ya + ry1)
        strip.paste(src_img.crop(box), (i * cell_w, 0))
        # Right: flush right in its cell -> flush right in the output cell.
        box = (CELL_X[c] + rx0, ya + ry0, CELL_X[c] + rx1, ya + ry1)
        strip.paste(src_img.crop(box), (i * cell_w + (cell_w - rw), cell_h))

    meta = {
        'theme': theme, 'sheet': sheet, 'frames': 9,
        'cellW': cell_w, 'cellH': cell_h,
        'leftW': lw, 'rightW': rw,
        'stripW': cell_w * 9, 'stripH': cell_h * 2,
        'junkBefore': junk_before, 'junkAfter': junk_after,
    }
    if args.dry_run:
        return meta, strip

    os.makedirs(OUT_DIR, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        png = os.path.join(tmp, 'strip.png')
        strip.save(png)
        # ONE definition of de-fringe in this repo: delegate, do not reimplement.
        subprocess.run([sys.executable, 'tools/defringe_gray.py', png],
                       check=True, stdout=subprocess.DEVNULL)
        strip = Image.open(png).convert('RGBA')
        out = os.path.join(OUT_DIR, 'zonebanner-%s-v1.webp' % theme)
        strip.save(out, 'WEBP', quality=WEBP_QUALITY, method=6)
    meta['bytes'] = os.path.getsize(out)
    meta['file'] = out
    print('   -> %s  %d x %d  %.0f KB'
          % (out, meta['stripW'], meta['stripH'], meta['bytes'] / 1024.0))
    return meta, strip


def write_proof(theme, strip, meta):
    """The registration proof, for a design where the BAR is not in the art.

    The original worry about these sheets was "align every frame on the bar or
    the banner will jitter and swell".  That worry is answered by construction
    here rather than by a registration pass: the bar is a DOM element the game
    draws at a fixed position, so it cannot move between beats.

    What CAN still move is where the art meets it.  Every left piece is cut at
    the same offset from its cell's left edge and every right piece from the
    right, so the two ANCHOR EDGES should be common to all nine beats.  Two
    artefacts say whether they are:

      -filmstrip   all nine beats of both sides, as cut.
      -anchors     the nine beats of each side superimposed at full alpha, with
                   a 1px rule on the anchor edge.  A stable cut shows the art
                   growing INWARD from a shared edge; a drifting one shows the
                   rule cutting through some beats and missing others.
    """
    cw, ch = meta['cellW'], meta['cellH']
    film = Image.new('RGBA', (cw * 9, ch * 2), (16, 22, 28, 255))
    film.alpha_composite(strip)
    film.convert('RGB').save(
        os.path.join(PROOF_DIR, 'zonebanner-%s-filmstrip.png' % theme))

    a = np.asarray(strip).astype(np.int32)
    proof = Image.new('RGBA', (cw * 2 + 24, ch), (16, 22, 28, 255))
    table = []
    for row, side in ((0, 'left'), (1, 'right')):
        stack = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        edges = []
        for i in range(9):
            cell = strip.crop((i * cw, row * ch, (i + 1) * cw, (row + 1) * ch))
            stack.alpha_composite(cell)
            al = a[row * ch:(row + 1) * ch, i * cw:(i + 1) * cw, 3]
            xs = np.where((al > 24).any(axis=0))[0]
            edges.append(int(xs.min()) if side == 'left' else int(xs.max()))
        px = stack.load()
        rule = min(edges) if side == 'left' else max(edges)
        for y in range(ch):
            px[rule, y] = (216, 170, 88, 255)
        proof.alpha_composite(stack, (0 if side == 'left' else cw + 24, 0))
        table.append((side, edges, max(edges) - min(edges)))
    proof.convert('RGB').save(
        os.path.join(PROOF_DIR, 'zonebanner-%s-anchors.png' % theme))
    for side, edges, spread in table:
        print('   anchor %-5s per beat: %s   spread %dpx of %dpx cell (%.1f%%)'
              % (side, edges, spread, cw, 100.0 * spread / cw))
    return {s_: {'edges': e, 'spread': sp} for s_, e, sp in table}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--proof', action='store_true')
    args = ap.parse_args()
    out = {}
    for theme, sheet in THEMES.items():
        meta, strip = process(theme, sheet, args)
        if args.proof:
            meta['anchors'] = write_proof(theme, strip, meta)
        out[theme] = meta
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
