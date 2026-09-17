# Zone-entry banner — what it does, and the evidence

v2.3.2596. Companion page to the PR, because GitHub's PR-body API mangles
markdown image syntax and these are pictures.

---

## What you will see

Walk out of the World View into **Flame Fields**, **Frost Ridge**, **Verdant
Wilds** or **Wind Dunes** and, as the little loading screen lifts, a themed
banner builds across the upper middle of the screen: that zone's rocks, lava,
ice or leaves grow in from both ends through the nine beats you drew, the zone's
name fades in on the dark plaque between them, and then the plaque flies up into
the top bar and becomes the label that was already going to be there.

The whole thing takes **1.4 seconds** and you can walk, tap and fight straight
through it — it cannot take a touch.

---

## The in-game playback

Real frames off the renderer — Chromium's screencast, so these are frames the
game actually painted, at the moments it painted them, not screenshots taken on
a timer. Two zones, both phone widths, both orientations. Each tile is labelled
with the millisecond it was captured at, and the frames run about 100ms apart
through the banner.

Read one of these first — it is the whole thing end to end: the *Entering Frost
Ridge* loading veil, the veil lifting, the empty bar appearing, the ice building
in from both ends, the name arriving, the plaque flying up, and the top bar
holding it afterwards.

`docs/triage-2026-09-17/assets/playback/playback-frost-390-portrait.jpg`

`docs/triage-2026-09-17/assets/playback/playback-ember-390-portrait.jpg`

`docs/triage-2026-09-17/assets/playback/playback-frost-360-portrait.jpg`

`docs/triage-2026-09-17/assets/playback/playback-ember-360-portrait.jpg`

`docs/triage-2026-09-17/assets/playback/playback-frost-390-landscape.jpg`

`docs/triage-2026-09-17/assets/playback/playback-ember-390-landscape.jpg`

`docs/triage-2026-09-17/assets/playback/playback-frost-360-landscape.jpg`

`docs/triage-2026-09-17/assets/playback/playback-ember-360-landscape.jpg`

And a zone with no banner, which is the majority case — the top bar simply says
where you are, exactly as it does today:

`docs/triage-2026-09-17/assets/playback/no-banner-worldview-390-portrait.jpg`

Measured off the Frost Ridge portrait run: the loading veil lifts at ~1.38s into
the capture, the banner's bar appears at ~1.46s, the name is up by ~1.96s, the
plaque is in flight at ~2.56s and everything is gone by ~2.84s. About 1.4s of
banner, which is what it says on the tin.

---

## What had to be done to the art

You sent it twice. The **second** drop — the ornament-only sheets — is what
ships, and that turned out to matter a lot.

**The first drop (contact sheets)** had the zone name and the beat captions
("1 - EMPTY BAR", the little numbered circles) painted into the pixels. Those
can never reach the game, and cropping them out still leaves art that only ever
works for one zone, because the name is in it.

**The second drop (ornaments)** is just the decoration — no plaque, no name. So
the game draws the plaque itself in CSS and prints the name, which means:

- the bar **cannot** wobble or swell between beats, because it is not in the art
  at all. That was the biggest worry going in and it is now answered by
  construction rather than by a careful crop;
- the bar **stretches** to whatever the zone name needs;
- an ornament set belongs to a **theme**, not a zone, so a second desert zone
  later is one line of config instead of a new sheet.

The hero banner at the top of each contact sheet is still doing work: it is the
reference for how the assembled thing should look, and the three proportions the
layout uses are measured off it rather than chosen —

| | Flame | Frost | Verdant | Wind |
|---|---|---|---|---|
| ornament width, as a fraction of the whole banner | 0.175 | 0.216 | 0.234 | 0.240 |
| bar height, as a fraction of the whole banner | 0.28 | 0.31 | 0.26 | 0.36 |
| how far down the ornament the bar's centre sits | 0.693 | 0.680 | 0.637 | 0.672 |

### Each cell held two pieces, not one

Measured, not assumed. Every cell on the ornament sheets contains a **left**
ornament and a **right** ornament as separate islands with a gap between them —
they flank a bar that is not in the picture. 18 pieces per sheet, not 9.

The grid was recovered from the pieces' own anchors, because their bounding
boxes move as the art grows: every left piece is flush to its cell's left edge,
every right piece flush to the right, and the three columns sit on an exact
482px pitch on all four sheets. The **row** pitch is different on every sheet
(301.3 / 325.7 / 331.7 / 302.3) and had to be measured by correlation, because
the art grows both upward and downward — icicles and hanging vines — so neither
the tops nor the bottoms are fixed. Dividing 1086 by 3 would have been wrong on
all four.

### The dirty alpha — measured, then cleaned

All four sheets carry chroma-key residue in the zone's own colour (frost cyan,
wind tan, verdant olive, flame red). It looks alarming in an alpha dump and the
reason is worth knowing: **77–88% of it sits at alpha 1**, which is 0.4%
opacity. Invisible per pixel — but it covers a quarter to a half of the sheet,
so it composites as a faint tinted **rectangle** around the banner. That is the
"visible box around the art" failure, arriving by a route that looking closely
at a pixel does not show.

Junk that is both far from the real art (>24px from anything solid) and actually
visible (alpha ≥ 16), before and after the cleanup:

| sheet | before | after |
|---|---|---|
| Flame Fields | 36 px | 18 px |
| Wind Dunes | 288 px | 77 px |
| Verdant Wilds | 463 px | 241 px |
| Frost Ridge | 2,717 px | 1,157 px |

(out of 1,572,528 pixels per sheet)

**Verdict: salvageable, and salvaged here.** No sheet needs re-exporting. The
worst of the four was 0.17% of its own pixels, which is not worth a round trip
to you. What remains after the cleanup is real art — the detached snowflakes,
embers, fireflies and sand flecks that are *meant* to float free.

The cleanup is three passes (floor the alpha-1 wash, cut faint haze far from any
solid art, drop small dim islands), then the repo's existing de-fringe tool
handles the coloured halo — reused rather than rewritten, so there is one
definition of "de-fringe" in the codebase. It all lives in
`tools/process_zone_banner_sheets.py` and re-runs from the raw sheets.

Checked against the worst possible backdrop for each — cyan residue over a
snowfield, red speckle over desert sand — and there is no halo and no box.

### The registration proof

The bar cannot move (it is a DOM element). What could still move is where the
art meets it, so each side's nine beats are superimposed with a rule on the
anchor edge: a stable cut shows the art growing *inward* from one shared edge.

`docs/triage-2026-09-17/assets/zonebanner-frost-anchors.png`

`docs/triage-2026-09-17/assets/zonebanner-desert-anchors.png`

`docs/triage-2026-09-17/assets/zonebanner-fire-anchors.png`

`docs/triage-2026-09-17/assets/zonebanner-forest-anchors.png`

Measured drift of that anchor edge across the nine beats: **3.5%–6.8% of the
cell** (8–17px of a ~245px cell), which on a phone is 3–6px on the outer edge —
and it is the silhouette genuinely changing as the art grows, not the cut
sliding. The nine beats as cut:

`docs/triage-2026-09-17/assets/zonebanner-frost-filmstrip.png`

`docs/triage-2026-09-17/assets/zonebanner-desert-filmstrip.png`

`docs/triage-2026-09-17/assets/zonebanner-fire-filmstrip.png`

`docs/triage-2026-09-17/assets/zonebanner-forest-filmstrip.png`

---

## Cost per zone

| zone | theme | file | on disk |
|---|---|---|---|
| Wind Dunes | desert | `zonebanner-desert-v1.webp` | 171 KB |
| Flame Fields | fire | `zonebanner-fire-v1.webp` | 177 KB |
| Frost Ridge | frost | `zonebanner-frost-v1.webp` | 261 KB |
| Verdant Wilds | forest | `zonebanner-forest-v1.webp` | 319 KB |

One file per zone, holding all 18 pieces. **Only the zone you are standing in is
loaded**, and the one you left is freed on the way out — this is the per-zone
loading rule you asked for in July, after the game went "wonky with RAM" on
iPhone. Putting all four on the startup screen would have added about 1 MB of
download and ~6 MB of memory for three zones you are not in.

The load happens behind the little per-zone loading screen that already exists,
so the banner is ready *before* that screen lifts — it never stops to fetch
anything mid-animation. And if for any reason it is not ready, there is simply
no banner; nothing stutters.

---

## Zones with no banner

You drew four. The zones a player can actually walk to today are the two hubs
(Town, World View) and **four** combat zones — Flame Fields, Wind Dunes, Verdant
Wilds, Frost Ridge — so the art covers every zone that is currently open. Stone
Hollows, Electric Foundry, Water Caves and Poison Forest are still "coming soon"
markers on the world map, not doors.

Everything else — the hubs, your farm, the two endgame zones, dungeons, and any
zone that opens later — gets **no banner at all**, and the top bar behaves
exactly as it does today. Nothing is reused or recoloured: Stone Hollows is not
a desert and Water Caves are not this ice, and a mismatched banner is a bug
report where a missing one is invisible.

---

## The timings

| | |
|---|---|
| beats 1–5 (the build) | 290 ms total |
| beats 6–7 (the name fades in) | 150 ms |
| beat 8 (the full reveal) | 160 ms |
| beat 9 (the settle, where you read the name) | 400 ms |
| **the banner** | **1,000 ms** |
| flying up into the top bar | 400 ms |
| **door to door** | **1.4 s** |

Deliberately short. It plays on *every* entry, so it is the second and tenth
visit that set the budget, not the first. An earlier cut ran 2.2s and the settle
outstayed its welcome immediately.

**Re-entry:** bounce back into a zone within **45 seconds** and you get nothing —
no banner, no stacking, no queue. There is only ever one banner element in the
page, so two cannot pile up even in principle.

**Reduce Motion:** if your phone has the accessibility setting on, the banner
still appears and still tells you where you are (the name is the point), it just
does not build, fly or pulse — it fades in and out.

---

## The dock

The top bar's title is about 150px of 15px text. The banner is ~340px wide with
art hanging off both ends. Shrinking the whole thing down to the label's size
turns the ornaments into specks in the last 80ms and reads like the banner
falling down a hole.

So the two halves part company, because they have different jobs by then:

- **the ornaments** are the flourish, and they are finished once the name is
  readable — they slide slightly outward and fade where they stand;
- **the plaque** carries the name, which is what the top bar is about to be
  holding, so it alone flies up to the title's measured position and fades as it
  arrives, while the title itself does a short arrive-pulse underneath.

The target is measured at the moment of the dock, not hardcoded: the top bar
moves with the notch inset, with how many digits your gold count has, and in
landscape it belongs to the world's width rather than the screen's.

---

## Check this on your phone

1. **Walk from World View into Flame Fields.** The banner should build across the
   upper middle as the loading screen lifts, say **Flame Fields (Lv1-2)**, then
   fly up into the top bar.
2. **Keep your thumb moving the whole time.** Your bro should not pause, and the
   joystick should not miss a beat — the banner must not eat a single touch.
3. **Walk straight back out and straight back in.** The second time you should
   see **nothing** — no banner. That is on purpose.
4. **Wait a minute, then go back in.** The banner should be back.
5. **Do the same in Frost Ridge, Verdant Wilds and Wind Dunes.** Each should be
   its own art. Frost's is the tallest — check the icicles are not cut off at
   the bottom.
6. **Turn the phone sideways** and enter a zone. The banner should sit over the
   game area (not the black bars), and still dock into the top bar.
7. **Go to Town or World View.** There should be no banner at all, and the top
   bar should read exactly as it always has.
8. **Look at the very edges of the banner** against bright ground — the sand in
   Wind Dunes, the snow in Frost Ridge. There should be no faint rectangle and
   no coloured fringe around the art.
9. **If you have Reduce Motion on** in iPhone Settings → Accessibility → Motion,
   enter a zone: you should get the finished banner fading in and out, with no
   build and no flight.
10. **Play for ten minutes across all four zones.** It should not get slower —
    each zone's banner is thrown away when you leave it.

---

## Test results

`tools/qa/mp/mp-zonebanner.mjs` (registered in `tools/qa/mp/run.mjs`, run with
`node tools/qa/mp/run.mjs zonebanner`) drives a real client through real zone
entries against a real worker, at both phone widths in both orientations.

**85 assertions, 85 passed, 0 failed.**

It asserts what a screenshot cannot: the nine beats run in order, the plaque
moves when it docks, the header title takes the handoff, exactly one banner
exists at any moment, it never takes a pointer, it is gone afterwards, the strip
is resident while you are in the zone and released when you leave, a bounce
straight back in shows nothing, and the hubs show nothing at all.

Two defects it caught that looking at a still would not have:

- the frames were stepped by the source cell width against a scaled
  `background-size`, so every beat after the first landed in the gutter between
  cells and the right-hand ornament was absent;
- a later landscape change froze the banner on beat 1. Written up as
  `docs/TRAPS.md` §85 — a `%` inside a CSS custom property is not a share of the
  parent, and every value derived from it resolves somewhere else.

`node tools/dev/precheck.mjs` is green.
