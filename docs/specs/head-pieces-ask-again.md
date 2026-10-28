# A head piece that does not come is asked for again (v2.3.3689)

The owner, 2026-10-28, playing on a computer:

> I keep seeing issues with traits disappearing though. I logged in as another
> character and traits were missing when jogging in certain directions

> I think the disappearing traits are just from the game not fully loaded
> yet... I'm testing desktop version.

> Nevermind there's still issues with the disappearing traits I still see it.

> You'll need to do a lot of testing for the disappearing traits and begin
> with cataloguing fixes for other times it happened to inform your search

## The earlier fixes, catalogued

Every head piece (hat, hair, beard, glasses, eye style, species) is a picture
per facing: east, northeast, north, south and southwest. West, northwest and
southeast are those three mirrored. Each was fixed before for a different
reason:

| Version | What went missing | Why | The fix |
|---|---|---|---|
| v2.3.1305 | one facing, wrong colour or gone | a facing's recolour failed, and the colour map replaced the plain one | the plain picture stands in for a missing colour; a failed picture is asked again twice |
| v2.3.1306 | (false alarm) | a beard has no north picture by design | the piece's `meta.json` anchors are the list of facings it ships |
| v2.3.1382, 1398 | every piece, every facing | the body's placement tables (`body-anchors.json`, `body-tops.json`) failed once | three tries, and the loading screen waits for them |
| v2.3.1534 | every piece, in the roll | no head point for an upside-down body | hidden on purpose in the roll |
| v2.3.3520 | the hair's colour for a moment | your colours were made after the world showed | the loading screen and the straight-in road's veil wait for them |
| v2.3.3574 | the skin, face and boots after a tab switch | iPhone Safari emptied canvases while the tab was parked | coming back, an emptied picture reloads the page on the same spot |
| v2.3.3606 | hair and glasses, facing by facing | a canvas emptied, or a picture given up after three tries | each piece kept as an image of itself; a given-up picture tried again later while worn |

## What was still open

1. **A request that stalls is never asked again** (TRAPS §257).
   - Every retry waited for a failure. A request with no answer and no error
     (a flaky Wi-Fi, a phone changing networks) never fails.
   - That piece stayed off in that one facing for the session: there facing
     south, gone facing north.
   - The loading screen, which waits for every head piece, sat at its 20 s cap
     first: "the game not fully loaded yet".
   - The colour picks downloaded each picture a second time with no retry at
     all, and a colour waits for all five facings, so a stall there left the
     piece in its plain colour in EVERY facing (measured below).
   - The fix: a time limit, `TRAIT_LOAD_TIMEOUT_MS` 20 s
     (src/rendering/traits/traitImg.js), counted as a failure, into the same
     retries. It covers the pictures (loadCroppedStrip's `timeoutMs`), the six
     colour catalogs (`loadTraitImg`) and `meta.json` (an AbortController,
     15 s). Each picture is about 1.5 KB (the whole set is about 1.2 MB), so
     20 s is a dead request, never a slow one.
2. **The body's placement tables were given up for the page** after three
   tries. Without them every head piece hides in every facing. Now another
   round starts 20 s later, past any cache (`&g=`).
3. **The gathering figures' head points (`crowns.json`) were asked for once.**
   A failure left every head piece off the swing, the shot, the chop, the cook,
   the fire and the farm moves. Now they are asked again at 2 s, 6 s, then
   every 20 s.
4. **A species facing that never came threw on every frame.** Texture.from(null)
   skipped the rest of the bro's update, so the eyes, glasses and hair kept the
   frame before. Past 90 throws the renderer rebuilt. Now that facing hides,
   as any piece's does while its picture is out.
5. **Switching characters from the list.**
   - The reload's veil prepared the look in this device's stores, which still
     held the character being left. The new character's look came with the
     worker's state_sync, after the veil's preload had run.
   - The picked row's look now goes into the stores before the reload (the row
     keeps it for its portrait).
   - When state_sync still changes what your head wears (a Login Key's first
     join on a new device, or a row with no look yet), the new look's colours
     and clip shapes are prepared, and the veil waits for them
     (`holdForAvatarAlso`).
6. **Your own pieces are asked for first.** The loading screen asks for every
   piece in every catalog, about 280 pictures. Yours are at the head of the
   queue now.
7. **The watch.**
   - A piece you wear that is hidden for 2.5 s, facing a way its picture
     ships, is asked for again.
   - It is written to the crash log once, as `trait-hidden`, with why it was
     hidden and what its loader knew.
   - `window.__btTraitCache()` shows the same on demand: each worn piece's
     facings, what the watch saw, and the body's tables.

## What is hidden on purpose

From behind you cannot see a face, and the body's own back views show no eyes
(checked on the jog sheets). So these pieces ship no picture for those facings,
and are not drawn there:

| Piece | Not drawn facing |
|---|---|
| Eye styles (all five) | northeast, north, northwest |
| Glasses (six pairs) | north |
| Golden Monocle | northeast, north, northwest |
| Beard | northeast, north, northwest |

Every hat (39) and every hair (8) ships all five facings.

## Tests

`mp-traitswitch`, on a computer:

1. (guard) B is made with a red cowboy hat, blue wavy hair, a blonde beard,
   goggles and sleepy eyes; A plain.
2. B entered straight: every piece drawn, in its colour, in every facing it
   ships, sampled through each facing's jog (the control).
3. A plays, then picks B from its list. The world comes up as B, and every
   piece is drawn in its colour in every facing from the first frame, then
   again on a second round.
4. No page errors.
5. A stalled picture: C wears B's look, and every first ask for the hat's north
   picture is left hanging. The hat is drawn, red, facing north from the first
   frame, the game having asked again after `?traittimeoutms=3000`.
   - On the build before (main at v2.3.3681), the one hung request was never
     asked again. The hat was NOT DRAWN facing north, and in the other four
     facings it was its plain brown (rgb 92-101, 62-69, 42-47), not red: the
     colour step waits for all five pictures, so one stalled picture kept the
     colour off in every facing.

## Still the owner's call

Which piece and which facing they saw go. If it was a beard, eyes or glasses
facing away, that is the table above. Any other piece in any facing is one of
the faults this change closes, or one not found yet, and the crash log's
`trait-hidden` line will now say which.
