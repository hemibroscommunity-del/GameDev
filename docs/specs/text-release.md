# A destroyed Text lets go of its style (v2.3.3633)

The owner, 2026-10-27: "simulate about 5 players doing the main quest lines,
mining, fishing, combat, trading, partying, no mans land combat,
buying/selling, dungeon, waking around different zones, farming, to check for
memory leaks in long form play sessions ... Also note anything that might be
worth bringing to my attention".

## What was found

`mp-heapdiff` repeats the memory check's trip (BroTown, a Flame Fields fight,
home) six times. After a GC it compares the page's heap between trips. On
main the heap after a GC kept climbing after the first trips, about 0.4 to
0.6 MB a trip. Most of that was V8's own compiled code (it levels off), but
among what grew were **Pixi Texts the game had already destroyed**, each kept
alive by its TextStyle. Between trips 2 and 5 that was 183 Texts, 183
TextStyles and 202 text measurements.

There were three causes together:

1. **A Text listens to its style** (`AbstractText`'s style setter adds an
   `update` listener). Pixi 8.17's `AbstractText.destroy()` never takes the
   listener off. So a style that lives on keeps every Text that ever used it.
2. **Styles do live on.** Pixi's text-measuring cache keeps its last 1,000
   measurements (`CanvasTextMetrics._measurementCache`), and each one holds
   its style.
3. **The game's way of deriving a style shares one registry.**
   `{ ...NAME_STYLE, fontSize: 9 }` copies the base TextStyle's own fields,
   and its event registry (`_events`), listener count and id are among them.
   So every Text derived from NAME_STYLE listened on NAME_STYLE's one
   registry. That covers every monster's name, every pet's, every
   townsperson's, and the combo and stun counters. DMG_STYLE (a damage number
   drawn as text: a special's, one with an emoji; the plain ones are glyphs
   from a baked font and never were) and LABEL_STYLE (the loot labels) are
   shared the same way. Those base styles live as long as the page, so:
   - every such Text ever made was kept, with no cap;
   - every style change anywhere in a family called all of them, living and
     destroyed. A damage number drawn as text sets its fill and size after it
     is made, so in a long fight every new one walked a longer list.

## The fix

`src/rendering/textRelease.js`, installed with Pixi's other patches in
`pixiApp.js`:

- `destroy()` takes the Text's listener off its style, then runs Pixi's own
  destroy.
- A style given to a Text as a plain object that carries another style's
  `_events`, `_eventsCount` and `uid` (the spread) is passed on without those
  three. The new TextStyle then makes a registry of its own, as Pixi means it
  to.

**Nothing on screen changes.** Everything else in the spread goes through as
before. That includes the base's private fields, which overwrite the spread's
own overrides. So `{ ...NAME_STYLE, fontSize: 9 }` is still drawn at
NAME_STYLE's size, as it always has been, and the owner has tuned the plates
by eye on that. See "Not changed" below.

`?textkeep` in the address is Pixi as it ships, to compare.
`window.__btTextRelease()` reports how many listeners were taken off and how
many spreads were given their own registry.

## Tests

`mp-textrelease` runs two phones: the fixed one and one with `?textkeep`.

1. **A family built by hand, then destroyed.**
   - The game's way (the spread): the fixed phone does not share the base's
     registry (0 of 100, against 100 of 100) and draws at the same size (11,
     on both phones). Destroyed, nothing is left listening (0, against 100).
   - One shared style handed to 100 Texts: 0 left listening, against 100.
2. **The game's own Texts, on a real trip.** Each phone makes the memory
   check's trip twice: BroTown, a Flame Fields fight, home. Then a GC, and
   every Text in the heap is counted (DevTools' `queryObjects`).
   - `?textkeep`: 42 destroyed Texts held after arriving, 154 after the two
     trips, about 56 more every trip for as long as you play.
   - The fix: 5, and still 5 after five trips (the last few the game itself
     keeps a hand on). About 125 Texts are made and let go each trip.
3. No page errors.

## Not changed (the owner's call, if ever)

A spread's own overrides are silently lost. Pixi copies the base's private
fields over them, so every `{ ...BASE, ... }` style is drawn with the base's
**size, weight and colour**:

- `{ ...NAME_STYLE, fontSize: 9 }` is drawn at NAME_STYLE's size;
- the stun timer's amber `fill` comes out in NAME_STYLE's colour;
- the pet's name, meant to be 22 px, is NAME_STYLE's size;
- the loot labels' 7 px gold (`{ ...LABEL_STYLE, fontSize: 7, fill: '#f5c542' }`)
  are LABEL_STYLE's size and colour.

The exception is code that sets the field again after making the Text, as the
damage numbers do ("Pixi v8 TextStyle stores fields privately; the spread above
may drop overrides"). Making the overrides count would change how all of those
labels look, and the owner has tuned them by eye as they are.
