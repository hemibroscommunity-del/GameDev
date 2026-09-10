# The creator answers the finger — keyboard and spin cue (v2.3.2391)

Two owner asks about the character creator, in one message:

> "Can you make it so the name input doesn't shift the screen down to the
> keyboard when you put the cursor there (this is an IOS issue).
>
> Can you put a little white arc with two dots at the end as a visual cue that
> the character can spin around if you drag your finger on him?"

---

## 1. The keyboard stops shoving the screen

### Why it shoved

Measured on the built client, not inferred. The name field's bottom edge sits
**64.6% down** a 390×844 phone (501–545px). An iOS portrait keyboard with its
QuickType bar is ~336pt, so the visible band ends at ~508. The field is *below
the keyboard* — by 37px there, 53px at 390×745, 57px on an SE. Safari's only
way to reveal a focused field it has just covered is to pan the page, and it
pans all of it, logo included.

Nothing on the page can absorb that or undo it: `html,body` are
`position:fixed;overflow:hidden` (`game.css:605`), `.bt-name-modal` is
`overflow:hidden`, and there is no scrollable ancestor between the input and
the root. The shift is a **visual-viewport pan**, so `document.scrollingElement
.scrollTop` stays 0 throughout — every `window.scrollTo(0,0)` remedy on the
internet is inert on this page.

`interactive-widget=overlays-content` is already in the viewport meta
(`src/index.html:5`). It is a Chrome/Firefox key; WebKit bug 259770 is still
open, so Safari ignores it, and `overlays-content` asks for Safari's existing
behaviour anyway.

### The three faults in the handler that was already there

`NameModal.jsx` has had a `visualViewport` keyboard reservation since
v2.3.1307. It was never removed and never worked:

1. **It fought itself.** `kb = innerHeight − vv.height − (vv.offsetTop || 0)`.
   `offsetTop` is how far Safari has *already* panned, so the more the screen
   shifted the less padding it asked for.
2. **It listened to `resize` only.** The pan arrives as a visualViewport
   `scroll` event, so once Safari panned, the correction never re-ran.
   `BroTown.jsx`'s own resizer (v2.3.1533) takes both; this is that omission
   fixed.
3. **The padding could not reach the field.** `.bt-cc-stage` is `flex:1` with a
   110px floor and `.bt-cc-namewrap` has `margin-top:auto`, so the column
   bottomed out: however much padding it was given, the field stuck at 428px —
   still under a 409 line on a 390×745 tab. That 18px of travel was the whole
   of the old fix.

### What v2.3.2391 does

The formula is corrected, the `scroll` event is subscribed, and — the part that
actually matters — **something above the field now yields**, flagged by
`data-kb` on the column so it exists only while the keyboard does:

* the stage is pinned to a flat **96px** (it carries `scale(2)`, so ~192px of
  painted bro: smaller, not gone);
* the **BRO TOWN title stands down**, which is another 99px of decoration that
  nobody typing their name is looking at.

| viewport | keyboard | line | field before | after |
|---|---|---|---|---|
| 390×745 Safari tab | 336 | 409 | 446 ✗ | **282** ✓ |
| 390×844 full height | 336 | 508 | 545 ✗ | **282** ✓ |
| 375×553 SE, toolbars | 260 | 293 | 350 ✗ | **276** ✓ |

The screen does not slide; it re-packs, with the top staying where it is.

### What was deliberately NOT done

**Setting the modal's height to `visualViewport.height`.** It is the obvious
fix, it re-flows the column beautifully, and it introduces a worse bug than the
one it cures — see **`docs/TRAPS.md` §64**. `.bt-name-modal` is
`overflow:hidden`, and an `overflow:hidden` box whose content stops fitting is
a real scroll container: shrunk to 400px it becomes scrollable by 228px, and a
plain `.focus()` on a below-the-fold control then scrolls the entire creator
off the top with no way back. That path is now closed for good with
`overflow:hidden;overflow:clip` plus a `scrollTop`-reset listener for iOS 14–15,
where `clip` is unsupported.

---

## 2. The spin cue

`v2.3.2006` removed the two rotate circles — correctly, they were 50px targets
sitting on the character — and its own note concedes the cost: *"the circles
were the discoverability crutch for it"*. Since then nothing has said the drag
exists. This is that crutch put back as a **picture** rather than a control.

The owner's art (two blue arcs around a pointing-finger tap glyph) was supplied
on a black field. It was keyed by taking the bright core, dilating it to
recover the dark keyline that hugs it, and dropping the diffuse glow — the glow
is a dark blue haze that reads as a smudge over the light pedestal stone, and
the keyline is what makes the piece legible there. Not palette-quantised:
16–32 colours takes it from 95KB to a fifth of that and eats the keyline.
Shipped at 512×244 as `public/ui/welcome/cc/cc-spin-cue.png`.

It is the **last child of `.bt-cc-stage`**, so it paints in front of the boots
the way the owner sketched it, at 35% of stage width and `bottom:12%` — the
boot contact line sits at 26.4% / 24.2% of stage height in the two frames the
creator uses, 2.2% apart, so one anchor serves both.

`pointer-events:none` is **load-bearing, not hygiene**: the drag is captured on
the canvas underneath, and an affordance that swallows the gesture it teaches
is worse than no affordance. `mp-ccspin` drags through the cue's own centre and
checks the bro really turned.

It stands down once he has been turned. Sizing was iterated against real
renders — 47% buried the boots, 35% reads as the "little arc" that was asked
for.

**A gate that had to be measured, not read.** The first cut copied the contact
shadow's `_frame.h === 54.5` condition, on the strength of a v2.3.1307 comment
saying that is the rest frame. It is not: 54.5 is the **category-crop** frame,
76 is what the player arrives on, and the borrowed gate hid the cue in exactly
the state it exists for. The comment is stale; the browser was asked instead.

---

## Tests

| | |
|---|---|
| `mp-cckb` | 21 assertions across three phone viewports |
| `mp-ccspin` | 11, including the drag landing *through* the cue |
| creator suite | ccspin, cckb, ccjoin, ccshades, ccsize, ccbuttons, ccstand, ccfeet, ccload — **147/147** |

`mp-cckb` states plainly what it cannot do: headless Chromium has no software
keyboard, so the iOS pan itself is not reproducible here. What it measures is
the arithmetic the pan depends on (does the field clear the keyboard line) and
the focus-shove of §64, which *is* directly reproducible.
