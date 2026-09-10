# The tattoo editor's two sides (v2.3.2421)

Owner, after testing the ink card: *"On the tattoos the back button does not
make the large canvas rotate to the back. Also the front copies its drawings
onto the back (these should be separate). Center and bold the 'TATTOOS'
label."*

Two of those three are one object seen twice, and the object is not the switch.

## What the switch was, and what it was missing

`tattooBack` (v2.3.2148) and `tattooHeadBack` (v2.3.2043) are real, separate
canvases with their own storage keys, and the walking character has always
rendered them correctly: `artForFacing` (playerSkins) swaps the torso and head
drawings for their back counterparts whenever the facing is a back one, and
leaves the ARM alone because an arm is the same arm from behind.

v2.3.2150 added the Front/Back switch that made those canvases reachable at
all. It did one thing: **remap which canvas a touch writes to**. Its own comment
explains why it stopped there —

> The surface still frames a front-facing figure — there is no back-view art to
> paint on — so the touch REGIONS are unchanged and only the canvas each one
> writes to moves.

That premise is false. `north` is a real back-view sheet (playerSprites
`SOURCE_DIRS`), not a mirror of `south`; the little worn preview beside the
editor had been turning round to it since that same version. So the editor was
in the one state that reads as broken from either end:

- you draw on a chest and the ink goes somewhere you cannot see, and
- what you CAN see, while drawing the back, is the front's drawing.

The second half is what the owner reported as copying. Nothing was ever copied.

## Why the front's drawing was on the back

`drawCharacterPortrait` does **not** call `artForFacing`. It assembles
`_bodyArt` inline and hands it to `recolorBodyToCanvas`, so a portrait facing
north stamps whatever the caller put in `tattooArt` — and its caller contract
(characterPortrait.js:575) is:

```js
opts.tattooArt !== undefined ? sanitize(opts.tattooArt) : inkedArt('tattoo')
```

**An unset slot means "read this device's own store", not "nothing."** That is
the property every live preview in the creator is built on, and it is what
turned a missing table row into a wrong picture: `WornPreview`'s branch table
named `tattoo`, `tattooFace` and `tattooArm` and had no entry for either back
canvas, so on the back it left `tattooArt` unset, and the portrait filled it
with the front chest drawing. The big surface had the same shape of bug from the
other direction: it passed `tattooArt: A.tattoo` unconditionally.

Written up as `docs/TRAPS.md` §70.

## What changed

**`BodyInk.jsx` — the surface faces the side being inked.** The composite takes
a `dir` (`north` when the panel is on Back) and stamps the back canvases into
the torso and head slots, mirroring `artForFacing`'s own mapping. The ARM is
untouched, for the reason that function gives.

The hit-testing needed **no** change, which is worth knowing before touching
it: the grid report is keyed by body REGION (`tattoo`, `face`, `arms`,
`pants`) and says nothing about facing, so the north sheet reports `tattoo` for
the back of the torso, and `regionAt` already remapped a region hit onto the
back canvas through `BACK_TARGET`. The region masks are measured on the sheet
being baked, so they now describe the back of the torso and the back of the
head — which is where those drawings are stamped. The finger is on the pixel it
inks, which is the premise of this surface (v2.3.1965) applied to the far side.

**`PlayerPaint.jsx` — the worn preview names its drawing.** Branches for
`tattooBack` and `tattooHeadBack` (each also taking off what covers it — a
shirt, a hat — exactly as the chest and face branches do), plus a facing rule
underneath the table:

```js
if (side === 'back') {
  if (opts.tattooArt === undefined) opts.tattooArt = getArt('tattooBack');
  if (opts.faceTattooArt === undefined) opts.faceTattooArt = getArt('tattooHeadBack');
}
```

The rule is not redundant with the branches, and this is the part a later reader
is most likely to delete. The branches cover the canvas being EDITED. The rule
covers every other slot on the figure — and on the Body screen your finger moves
the canvas (v2.3.1994), so with Back selected and an ARM chosen, neither branch
fires and the torso slot falls back to the store again. Mutation-tested: pulling
the rule alone puts the chest drawing back on the back.

**`game.css` — the title.** Centred over the head cell. "Bold" could not be done
with a weight: Source Sans 3 is loaded at 400/600/700 only (`src/index.html`),
so the 800 already declared resolves to the 700 face and 900 resolves to the
same one — `font-weight:900` would have changed nothing and looked like a fix.
Size and contrast carry it instead: **13 → 15px**, and `--ui-text` in place of
`--ui-text-secondary`. Still one line in an existing cell, so it costs its own
text height and no row.

## Testing

`mp-bodyink` goes from 27 assertions to 43.

The scenario now **dresses the character** before opening the editor. That is
not decoration: each tattoo screen takes off what covers the canvas it is
pointed at, and on a bare character "take the shirt off" and "do nothing" are
the same picture — the rule was untestable, and a mutation that deleted it
survived a full run. It is also the normal case; most players are wearing
something by the time they open this.

It inks in **three colours**, so a pixel says whose drawing it is:

| colour | canvas | shows on |
|---|---|---|
| blue | chest, face | the front |
| green | `tattooBack`, `tattooHeadBack` | the back |
| pink | `tattooArm` | both — an arm is the same arm from behind |

That is what makes "the front came round" and "the back is showing" separate
readings of one frame instead of a single count that has to be interpreted. The
arm needed its own colour the moment the scenario drew on it: as green, a green
pixel on a front view meant either a bug or the arm working exactly as designed.

What it now asserts: the figure is a **different picture** after the switch (98%
of its opaque pixels; the bar is 60%, and with the composite left facing south
the same run reports 22–25% rather than 0, because the drawings still swap under
it); no front ink on a back view or its worn preview; back ink that does show on
both; the arm case; and the **back of the head** — a canvas that has existed
since v2.3.2043 and had never been read by any scenario, which is how it stayed
possible for it to be the last surface still showing you your face.

`mp-ccink` measures the title's painted inline box (a `Range` around the text
node, because the `h2` fills the cell whatever its alignment) against the
panel's centre, and its size and colour.

**Mutations: eight applied, seven caught.** The eighth is `backSide` dropping
out of the composite's dependency list, which is genuinely unobservable —
`dir` changes with it, so the effect re-runs either way. It stays as a stated
dependency because the value is read inside the effect and the coincidence is
the caller's, not a guarantee; it is listed here rather than claimed as
covered.

Two mutations were only caught after the tests were fixed, and both are in
`TRAPS` §71: a yellow stroke is shaded down into skin tones and cannot be
counted, and an aim taken before a click is stale in X (clicking the Back switch
scrolls `.bt-paint` 67px sideways).

## Not changed

- No `src/rendering/**` edits. The renderer already reported everything this
  needed; `artForFacing` and the grid report are untouched.
- No server, wire or storage change. The two back canvases and their keys are
  as they were — this is about which drawing a preview asks for.
- The Face screen's Back side still frames the head using the skin region of
  the north sheet. Hair is a trait sprite drawn over the body sheet, not baked
  into it, so the region exists whatever hairstyle is worn — the same way the
  forehead works from the front.
