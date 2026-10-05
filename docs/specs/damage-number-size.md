# Damage numbers, 1.75x bigger (v2.3.3033)

> *"Damage numbers for players and monsters needs to be about anywhere from
> 1.5-2x bigger"* -- the owner, 2026-10-04.

## Why they were small

Every popup is a Pixi text in the damage layer, which is part of the WORLD, so
its size is in world pixels: a plain hit was 21, a crit 38
(`effectsRenderer.js` `DMG_FONT_PX`, `DMG_CRIT_FONT_PX`). The Wheel draws the
world at about 0.6 of a CSS pixel a world pixel (the bro 64 px tall), so a plain
hit read 13 CSS px beside a character five times its height, and the weapon mark
beside it was the same 13.

## What changed

**One constant, `DMG_SCALE` (1.75).** It is the middle of "1.5-2x", and a tab can
try the ends: `?dmgscale=1.5` or `?dmgscale=2` (anything from 1 to 3), the way
`?zoom=` works. It is published as `window.__btDmgScale`.

**Which numbers.** `isDamagePopup(dmg, text)` decides, once, when the number is
first drawn. A damage number has a digit, does not start with "+", and is one of:
a hit taken (`taken`), a number carrying a weapon, crit, heart or element mark,
or a plain number (the renderer's own v2.3.103 pattern, optionally with a symbol
after it as in "-12 🌵"). That covers a hit you deal, a crit, a hit on you or on
a teammate, a tick of burn or poison, a pet's hit and a gathering hit.
It leaves alone: every word ("Blocked!", "Dodged", "Swimming!"), pay-outs and
heals ("+30 XP", "+25 G", "+12"), and a note that merely asks to be big and
wiggly with the `crit` flag (BroTown's `pushNpcMsg`) -- real crits always carry
the crit or a weapon mark.

**What follows the size**, so the relations earlier work set still hold:

| | Before | After (1.75) |
|---|---|---|
| plain hit / crit | 21 / 38 | 36.75 / 66.5 |
| crit over plain | 1.81x | 1.81x |
| a plain number's mark | at most 22 | at most 38.5 |
| a crit's mark | 1.15 x its number | 1.15 x its number |
| gap after the digits | 10 / 13.3 | 17.5 / 23.3 |
| stroke, special's halo (classic Text) | 3, blur 8 | x1.75 |
| centre-to-centre in a stack | 26 | 26/21 of the two fonts' average: 46 at two plain hits |
| spawn height | band top - 34 | the same, lifted 0.9 of the extra size |
| climb | 40 px a second | 70 (x the scale) |

**The lift.** A number spawns its CENTRE 34 px over the band's top, worked out in
v2.3.1638 for a 21 px number whose spawn pop (1.6x) reaches 16.8 px below its
centre. A bigger glyph reaches further, so `DMG_LIFT` 0.9 of the extra size
(14 px for a plain hit, 26 for a crit) is added: the popped glyph's bottom edge
sits as far over the bar as before. Measured at the spawn (the glyph box's bottom
edge over the band's top): 21.9 px before, 27.0 after for a plain hit.

**The climb.** A number rises 40 px a second, so two hits 0.7 s apart were 28 px
apart -- two 14 px digits with a gap between. At 1.75x the digits are 26 px, and
the same 28 px would have them touching. The climb is x the scale too (70 px a
second; a record's own `rise` still wins), so consecutive hits keep the gap they
had, relative to their size. A number now travels 105 world px (about 64 CSS px)
over its 1.5 s.

**The stack.** Two numbers keep apart by 26/21 of their average font (26 at two
plain old numbers, exactly as before), and the window that finds a neighbour (50 px
high, 60 wide) grows by the same ratio, so a stack is still three deep in one
frame. A fourth in one frame lay on the third before this change too.

**The glyph atlas.** Plain numbers are BitmapText from an atlas baked in white
with a black outline and tinted. It was baked at 100 px; the biggest crit is now up
to 133 device px (66.5 world px x 0.6 x 3 for the phone x the crit's +-10%
wiggle), which a 100 px bake enlarged 1.33x. It is baked at 128 now
(`DMG_BMP_BAKE_PX`, outline 14/100 of it): 1.04x. Measured: the atlas goes from
6.0 to 6.7 MB, since pixi shrinks the page canvases as the bake grows (TRAPS §137);
a dedicated digits-only font would hold 1.2-2 MB on top, 160 would hold 11.3 MB.

## Not changed

- The words, XP, gold and heals (21 px, rising 40 px a second), the pop (1.6x for
  120 ms), the life (1.5 s), the colours and the marks themselves.
- The server: this is all drawing.
- Elemental collision bursts with a name ("-45 Steam Burst") are text with a
  label, not a plain number, so they keep 21 px. Say if they should grow too.

## Checked by

- `mp-dmgsize`, on a 390 x 844 phone at 3x in the Wheel, off the live Pixi
  objects: the scale between 1.5 and 2; a plain hit and a crit at it times 21 and
  38; the crit still 1.81x; the sword mark at its capped height, the crit mark at
  1.15x; the gap after the digits; a hit on you through the game's own dispatcher,
  as clear of your band as before; a stack of three plain hits and a crit between
  two, none lying on another; two hits 0.75 s apart, the older climbed clear of
  the newer; a kill's number with its XP and gold above it, the XP and gold at 21;
  a special's number (outline and halo in step) and thorns' emoji number; a real
  fire goblin hit through the worker, its number clear of its bar; and "Blocked!",
  "Dodged", "+12", "Swimming!" at 21.
  Run against another build with `QA_DIST` it takes the "before".
- `mp-elemhits` (the marks on a hit taken, now against the scaled cap the probe
  reports) and `mp-critpreview`.
- docs/shots/dmgsize.md: before and after, a phone, in the Wheel.
