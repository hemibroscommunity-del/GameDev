# The XP bar: the skill you are earning in, on the top bar (v2.3.3695)

The owner, 2026-10-28:

> The game needs an XP Popup and an Xp bar to appear with the icon of whatever
> primary combat skill you're earning Xp in someplace at the bottom (or maybe
> top) depending on what works best. Then disappears again.

## What a player sees

The moment a hit earns combat XP, the middle of the top bar becomes the XP bar:

    [sword]  Lv 7  [===========-----]
                       +3 XP

- **The skill's picture**: the owner's Points icons (the thicker sword, bow
  and staff drawn for small sizes), the skill that earned the XP.
- **Its level**: "Lv 7", in the AP's gold.
- **A bar to the next level**: dark with a thin gold line round it, filled in
  gold to the share of the next level the worker has you at. It grows as you
  earn, and starts again from the new level's share when you level up.
- **The gain**: "+3 XP" pops over the bar, rises a little and goes. A flurry
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

- `xp-bar` suite (20), in node:
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
  - no page errors.
  - Pictures: `tools/qa/mp/out/xpbar-*.png`.
