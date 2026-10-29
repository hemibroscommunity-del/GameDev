# The XP bar: the skill you are earning in, on the top bar (v2.3.3695)

The owner, 2026-10-28:

> The game needs an XP Popup and an Xp bar to appear with the icon of whatever
> primary combat skill you're earning Xp in someplace at the bottom (or maybe
> top) depending on what works best. Then disappears again.

## The polish (v2.3.3739)

The owner, 2026-10-28, testing the night before the judges:

> I like the xp bar at the top for the weapon but put the plus xp to the left
> of the weapon icon so you can still see the bar. Also use a white bar to
> show how the xp will grow and fill it up to that point. It should also show
> the number of xp needed for the next level somewhere on the bar.

So, three changes:

- **"+3 XP" pops left of the picture**, in a slot of its own, never over the
  bar. The slot is there for as long as the bar, so the row never shifts as a
  pop comes and goes (a big number widens it).
- **A white bar for what you just earned.** The moment XP lands, the bar is
  white from the old fill to where the worker now has you; the gold waits
  120 ms (so the white is seen), then grows up to it over 500 ms, eased, and
  covers it. More XP while it grows moves the white on, and the gold grows on
  from where it is, never from zero. A level-up: the white runs to the end,
  the gold follows; 750 ms after the gain the bar starts the new level empty,
  the white at what carried over and the gold growing to it. About 1.4 s in
  all, well inside the bar's 3 s, so the show time is unchanged.
- **"45 / 120" on the bar**: your XP into this level over what the next level
  needs, the worker's numbers (`sk.xp`, `prog3XpRequired(sk.level)`), cream
  with a dark outline so it reads over the dark track, the gold and the white.
  A thousands separator from 1,000; one decimal where the XP is fractional
  below 10 ("1.4 / 280", as the worker's XP is 0.2 of the damage); rounded
  down, so it never reads "280 / 280" a hair before the level. The track grew
  from 9 to 14 px to carry it, and is never narrower than 66 px.

On a 320 px phone the gap, the pop's words, the picture and "Lv" shrink a
little; the bar does not.

How: `src/ui/mobile/XpTrack.jsx` draws the track; `xpFillSteps`
(`src/game/xpBar.js`) says whether a gain grows on, starts fresh (a new
skill, a bar that had gone) or wraps a level. The fills move by CSS
transitions on `transform: scaleX` (origin left), the timing inline from
`XP_FILL_DELAY_MS` / `XP_FILL_MS`: no layout and no JavaScript per frame, at
most three style changes a gain. Reduced motion: the gold jumps, no slide.
`noteProg3Xp` now also keeps where the skill stood before the gain
(`fromLevel`, `fromFrac`), the white bar's start on a fresh bar.

Two QA-only switches, read nowhere else (mp-xpbar): `window.__btXpHold`
keeps the bar up while a slow box takes a picture (as `__btLevelUpFreeze`
pins the level-up burst), and `window.__btXpWrapMs` stretches a level-up's
first step.

## Slower, and the number counts (v2.3.3796)

The owner, 2026-10-28:

> when you gain xp show the white bar longer (the added xp that the bar climbs
> to) and make the fill up to that white portion slower. Also instead of
> changing the whole xp number make it count up (or down depending on if the
> number is just xp remaining to the next level up)

- **The white stands alone longer**: 600 ms (was 120) before the gold moves.
- **The gold climbs slower**: 1200 ms (was 500), eased out (quick at first,
  settling into the white; `XP_FILL_EASE`, an ease-out cubic).
- **The number counts** from where it stands to the worker's XP, on the
  gold's own clock and curve (`xpCountAt`): held while the white stands
  alone, then counting as the gold climbs. A level-up counts to the old
  level's end ("280 / 280"), then the new level's from 0 to what carried
  over, with the bar's wrap (now 2000 ms after the gain). A gain arriving
  mid-count counts on from the number on screen, never back. One decimal
  below 10 as before; whole numbers, rounded down, from 10.
- No number here is "XP remaining", so nothing counts down.
- **The bar stays longer** to fit it: 3.5 s after a gain (was 3 s), 5.2 s
  after a level-up (`XP_BAR_UP_SHOW_MS`), so the whole show ends with about
  a second and a half to read it.
- **The phone's budget**: the count is written straight into its one text
  node by a `requestAnimationFrame` loop that stops when it is done. React
  never re-renders for it, and nothing is laid out but that line of text. The
  gold is still one CSS transition on `transform`. Reduced motion: the number
  says the worker's XP at once, as the gold jumps.
- A third QA-only switch, `window.__btXpSlow` (a factor), stretches the fill
  and the count so a second real hit on the slow test box lands mid-count.

## What a player sees

The moment a hit earns combat XP, the middle of the top bar becomes the XP bar:

    +3 XP  [sword]  Lv 7  [=====WWW 45 / 120 -----]

(v2.3.3695 had the "+3 XP" over the bar; see the polish above.)

- **The skill's picture**: the owner's Points icons (the thicker sword, bow
  and staff drawn for small sizes), the skill that earned the XP.
- **Its level**: "Lv 7", in the AP's gold.
- **A bar to the next level**: dark with a thin gold line round it, filled in
  gold to the share of the next level the worker has you at, the XP just
  earned white ahead of the gold until the gold grows over it, and "45 / 120"
  on it (v2.3.3739, above).
- **The gain**: "+3 XP" pops left of the picture (v2.3.3739; it was over the
  bar), rises a little and goes. A flurry
  of hits within 1.2 s is one number ("+9 XP"), not three pops on top of each
  other. Below 10 it has one decimal ("+1.4 XP"), as the worker's XP is 0.2
  of the damage dealt.
- 3 seconds after the last XP the bar fades and "BroTown" is back.
- If two skills earn at once, the bar shows the one that earned more.

## Why the top bar

- It is the one place every layout shares. Upright, the dashboard is the
  bottom; sideways and on a computer playing wide, it is a column at the side.
- No thumb is ever over it, and it is never over the world.
- The top bar is where your AP already pops its "+N" (v2.3.3553), so a number
  that rises there is something players already read.
- The name "BroTown" is not lost: it stays in the page under the bar, faded
  with the hour's icon beside it, and comes back. The zone banner still docks into it, and the long press to
  the owner's test panel still reaches it.

## Where it comes from

- The worker's numbers only. A combat skill's XP is the worker's (server
  `prog3.js` `_prog3AwardXp`): `sk.xp` toward `prog3XpRequired(sk.level)`,
  sent whole in player_state's `prog3`.
- `src/networking/wsClient.js` hands each new blob, and the one it replaces,
  to `noteProg3Xp` (`src/game/xpBar.js`, no imports) before adopting it. It
  works out what each skill gained, across any levels between, and keeps the
  bar (`S._xpBar`).
- `src/ui/mobile/ZoneHeader.jsx` draws it, told at once by `onXpBar`.
  `src/styles/game.css`: `.bt-xp-bar`, `.bt-xp-gain`. Flat fills, transform
  and opacity only, as the bar is over the WebGL canvas.
- The pictures: `src/ui/mobile/xpBarArt.js`, warmed on the loading screen by
  `src/rendering/xpBarPreload.js` (the preloading law; three small files).
- Calm motion and reduced motion: the "+N" stands still, shown for as long as
  the bar.
- Nothing new on the wire and no server change.

## Checked

- `xp-bar` suite (36 since v2.3.3739), in node:
  - "45 / 120": the decimals, the separator, rounding down, never "/ 0";
  - `xpFillSteps`: grow on, fresh (none drawn, gone, another skill, a fall),
    wrap (a level crossed, on a fresh bar too), and the whole level-up run
    inside 3 s;
  - the gain within a level and across one or two levels, none for a fall;
  - the words;
  - the skill that gained most;
  - one "+N" for a flurry, a new pop after 1.2 s or for another skill;
  - a level-up's `up`;
  - the listeners;
  - when it goes.
- `mp-xpbar`, a phone in the world:
  - the three pictures warm from the loading screen;
  - no bar before any XP;
  - a real tap on the right half of the screen (the attack) lands on a Frost
    Ridge snowman and brings the sword's bar: its picture loaded, its level,
    the worker's share of the next level, and "+N XP" equal to the XP the
    worker added;
  - the title and the hour's icon faded under it (read once their 220 ms fade
    has run), the title still "BroTown";
  - inside the middle column, clear of the AP and the gold;
  - gone 3 s after the last XP, the title back;
  - the bow's bar for the bow's XP;
  - it fits a 320 px phone;
  - no page errors;
  - since v2.3.3739, from real hits upright at 390 and 320, sideways and on a
    computer playing wide: "+N XP" left of the picture and clear of the bar;
    the white at once at the worker's share with the gold behind it, then
    the gold caught up; "45 / 120" the worker's numbers, inside the track;
    nothing over the door, the AP or the gold; and a level-up whose white
    ran to the end, the gold after it, then the new level from empty.
  - since v2.3.3796: the gold's transition as the page has it (the white
    alone 0.6 s, the climb 1.2 s); two real hits, the second mid-count (the
    count stretched 4x): the number never goes back, passes values between
    and ends on the worker's XP; a level-up counts to the old level's end,
    then "0 / 325".
  - Pictures: `tools/qa/mp/out/xpbar-*.png` (`docs/shots/xpbar-*.webp`;
    before/after frame strips `docs/shots/xpbar-tween-*.webp`).
