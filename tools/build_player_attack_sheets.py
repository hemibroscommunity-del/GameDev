"""Build the 5 player attack sprite sheets from the user's pair of
fist-windup + fist-strike PNGs per direction.  Source images live at
the repo root with UUID filenames (uploaded via GitHub web UI); this
script white-keys the background, trims to the character, scales to a
consistent character height, and stitches windup + strike into a
horizontal 2-frame strip named attack-<dir>.png that playerSprites.js
picks up via its 'attack' pose entry.

Mapping (per visual inspection):
  east      windup 0D068A9C  strike 1E265426
  north     windup 9C78C86C  strike CB2B66CA
  south     windup 982972E3  strike 4F61C7E9
  northeast windup B9D7D86E  strike 2F74AC8E
  southwest windup A0DC47BC  strike 7475A0C4

Output: public/sprites/player/attack-<dir>.png  (5 files, 512x256 each)
"""
import os
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, 'public', 'sprites', 'player')
FRAME = 256
TARGET_H = 230            # how tall the character should be inside a 256 frame
BOTTOM_PAD = 8            # gap between character feet and bottom of frame
WHITE_THRESH = 235        # rgb >= this → treat as background, drop alpha to 0

PAIRS = {
    'east':      ('0D068A9C-DFC7-4AFC-8A7F-A89C381B7946',
                  '1E265426-853D-4AB2-B50D-C9A8E2F25963'),
    'north':     ('9C78C86C-4C3C-48BD-8AC1-F2F0B059A6AB',
                  'CB2B66CA-05D0-4AA4-8556-B7FD7657F460'),
    'south':     ('982972E3-BD88-40FD-B212-8013B1B3F0FD',
                  '4F61C7E9-F143-466E-868F-828D177DD4FE'),
    # NE = back-3/4 view (figure facing away+right); SW = front-3/4
    # view (figure facing toward+right).  Windup-strike pairs are
    # selected so both frames share the same body angle.
    'northeast': ('A0DC47BC-B078-4629-84A2-0701E3175B26',
                  '2F74AC8E-8F87-424E-92B1-EC2B7A0760F7'),
    'southwest': ('B9D7D86E-AEB8-4E35-B0E3-385AAE463EEC',
                  '7475A0C4-4C37-402B-A469-8F29CD3A1BDA'),
}


def key_and_trim(uuid):
    img = Image.open(os.path.join(REPO, uuid + '.png')).convert('RGBA')
    arr = np.array(img)
    mask = (
        (arr[..., 0] >= WHITE_THRESH)
        & (arr[..., 1] >= WHITE_THRESH)
        & (arr[..., 2] >= WHITE_THRESH)
    )
    arr[mask, 3] = 0
    img = Image.fromarray(arr, 'RGBA')
    bbox = img.getbbox()
    if not bbox:
        return None, None
    return img.crop(bbox), bbox


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for direction, (windup_id, strike_id) in PAIRS.items():
        windup, w_box = key_and_trim(windup_id)
        strike, s_box = key_and_trim(strike_id)
        if windup is None or strike is None:
            print(f'SKIP {direction}: missing source after key')
            continue

        # Scale both frames by the same factor so the windup and strike
        # poses read at a consistent character size.  Use the taller of
        # the two bboxes as the reference so the bigger pose fits 230 px.
        union_h = max(w_box[3] - w_box[1], s_box[3] - s_box[1])
        scale = TARGET_H / union_h

        sheet = Image.new('RGBA', (FRAME * 2, FRAME), (0, 0, 0, 0))
        for i, frame in enumerate((windup, strike)):
            new_w = max(1, round(frame.width * scale))
            new_h = max(1, round(frame.height * scale))
            scaled = frame.resize((new_w, new_h), Image.LANCZOS)
            ox = i * FRAME + (FRAME - new_w) // 2
            oy = FRAME - new_h - BOTTOM_PAD
            sheet.paste(scaled, (ox, oy), scaled)

        out = os.path.join(OUT_DIR, f'attack-{direction}.png')
        sheet.save(out, optimize=True)
        print(f'WROTE {out}  (scale={scale:.3f}, union_h={union_h})')


if __name__ == '__main__':
    main()
