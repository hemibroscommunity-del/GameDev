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
the crit or a weapon mark. (v2.3.3192: those are all the plain hit's size now --
see "Messages as big as the numbers" below. The test still decides which is
which, because a crit and a message are not drawn the same.)

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

## Messages as big as the numbers (v2.3.3192)

> *"Make the messages in the game like "no mana" and other things like "quest
> complete!" the same font size as the combat damage numbers (which don't seem
> to scale with whether you're zoomed out with the dashboard showing or zoomed
> in)."* -- the owner, 2026-10-12.

**What it looked like.** Measured on the QA phone (390 x 844) in BroTown, off the
live Pixi objects: a plain hit 24.9 CSS px tall with the dashboard folded and
19.0 with it up; "No mana!", "Quest Complete!" and "+30 XP" 14.3 and 10.9 --
about 57% of the number, at both zooms.

**The zoom.** The numbers DID change with the dashboard: they were drawn in the
world, and folding the dashboard draws the world 1.31x bigger (scale 0.4625 ->
0.6061), so a plain hit went 19.0 -> 24.9 CSS px, as everything in the world
does -- which is why it read as not changing. The messages did exactly the
same, just smaller. The first cut of this change only made the messages the
numbers' size in the world; told so, the owner asked for the other way: "Yes do
fixed size instead".

**One size on the screen.** Every popup -- number and message -- is now drawn
at the size it has at `POPUP_ZOOM` 0.606, the world's scale on the QA phone with
the dashboard folded (the bro 64 px tall, where every popup size here was
tuned): a plain hit's type 22.3 CSS px, a crit's 40.3, whatever the dashboard
does. Each frame the world's own scale is divided back out, `Z` =
`POPUP_ZOOM` / `S._worldScaleX` (`popupZoomK`), as the name plates (v2.3.2513)
and the chat bubble (v2.3.2247) do theirs. With the dashboard up (0.4625) a
popup is drawn 1.31x the world px it had, so it is the same on the screen; on a
bigger phone, sideways, or in the desktop shell it is that CSS size too. Z
scales a popup's size AND everything measured from the spot it was pushed at:
its lift, its place in a stack (the neighbour scan compares spots plus Z x
offsets, and keeps the offset in popup px), its climb, its mark and the gap
before it, the wrap width and the edge margin. Only the spot itself (over a
monster's bar, over your head) stays the world's. `?popupworld` draws them in
the world as before, to compare; `_z` on a popup record says what it was drawn
at (QA).

The wrap width is capped by the screen too (`msgWrapW`): popups being one CSS
size, a line may take at most `MSG_WRAP_SCREEN` 0.82 of the canvas's CSS width
(on the QA phone the cap is 528 popup px, so MSG_WRAP_W's 520 holds; a 320 px
phone gets about 21 characters a line).

**The rule.** Every popup that is not a damage number (`isDamagePopup` false) is a
message, drawn at `MSG_FONT_PX` = `DMG_FONT_PX` x `DMG_SCALE` (36.75 world px),
the plain hit's size, and it follows `?dmgscale=` with them. That is every word
("No mana!", "Quest Complete!", "Return to Mayor Bro", "Blocked!", "Dodged",
"Swimming!", "Requires Fishing Lv 5"), every reward line ("+12 Woodcutting XP",
"+ Frost Shard", "+30 XP", "+25 G"), heals ("+12", "+12 HP"), and "-45 Steam
Burst". A crit is still the one bigger thing (66.5). A note with the bare `crit`
flag (`pushNpcMsg`, the E key's "Mayor Bro has nothing for you right now", 38 px
before) is a message: the plain hit's size, still wiggling. A message's outline,
lift, stacking and climb follow its size exactly as a number's do (`_k` is
`DMG_SCALE` for both): outline 5.25 on classic Text, climb 70 px a second unless
the push names its own `rise` (the quest's pair: 12).

**Long ones wrap, never shrink.** At 36.75 px "Element Burst needs an enchanted
weapon" is ~750 world px and an upright phone sees ~640 across in the Wheel. A
message wider than `MSG_WRAP_W` (520 world px, about 26 characters; 315 CSS px
folded on the QA phone) is broken at its spaces into the fewest lines that fit,
as even as they can be (`msgLines`: the shortest possible longest line), centred,
at most 4. A wrapped message is lifted by its extra lines' height, so its LAST
line sits where the one line would have (it grows upward), and the stacking
counts its lines and its width.

**Kept on the screen.** A message is held `MSG_EDGE_PX` (12 world px) inside the
view's sides by its resting width (and its mark's; a crit-flagged note by its
widest wiggle): against a dungeon's wall the camera stops following you, and a
message centred over you there ran off the screen. Damage numbers are never
moved.

**Where they spawn is unchanged.** Each push site keeps its own place (most a
little over your chest or head); the lift keeps a message's bottom edge where the
smaller one's was, so it grows upward.

| | Before | After |
|---|---|---|
| a plain hit, folded / dashboard up (QA phone) | 24.9 / 19.0 CSS px | 24.9 / 24.9 (one size) |
| a message, folded / dashboard up (QA phone) | 14.3 / 10.9 CSS px | 24.9 / 24.9, the plain hit's |
| "Element Burst needs an enchanted weapon" | one line, 21 px | two lines, 36.75 px |
| the E key's crit-flagged note | 38 px, wiggling | 36.75 px, wiggling |
| a message at the view's edge | half off the screen | 12 px inside it |

## Not changed

- (v2.3.3192: the words, XP, gold and heals are the numbers' size now -- the
  section above.) The pop (1.6x for 120 ms), the life (1.5 s), the colours and
  the marks themselves.
- The server: this is all drawing.
- Elemental collision bursts with a name ("-45 Steam Burst") are text with a
  label, not a plain number, so they keep 21 px. Say if they should grow too.
  (v2.3.3192: they are messages, so they grew.)

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
  v2.3.3192: those words, the kill's XP and gold, "No mana!", "Quest Complete!"
  and "Return to Mayor Bro" (as the game pushes them) at the plain hit's size and
  as tall on the screen as it; the quest's two lines a line apart; a crit-flagged
  note at the plain size; a classic-Text message ("Wave 1/3") with its outline
  grown; "Element Burst needs an enchanted weapon" in two even lines and a cut
  announcement wrapped, inside the wrap width, at the same size; a message at
  each edge of the view held 12 px inside it while a number is left where it is;
  and with the dashboard up and folded (two zooms) a hit the SAME height on the
  screen, "No mana!" exactly as tall as it, and two stacked hits the same
  distance apart (one size on the screen). Measurements are taken at rest (a
  read on the test box can catch the spawn pop), the popup's screen factor
  `_z` kept in.
  Run against another build with `QA_DIST` it takes the "before".
- `mp-elemhits` (the marks on a hit taken, now against the scaled cap the probe
  reports) and `mp-critpreview`.
- docs/shots/dmgsize.md: before and after, a phone, in the Wheel.
- docs/shots/msgsize.md (v2.3.3192): the messages before and after, with the
  dashboard folded and up, and the long ones wrapped.
