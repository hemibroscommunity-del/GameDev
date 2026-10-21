# Your achievement points on the top bar (v2.3.3553)

## What the owner asked

> "Achievement points should be a prominent part of the experience in brotown."

Achievements (v2.3.3527, #1045) showed your AP only on the Achievements page,
under More, and on a player's card. A player could play for an hour without
ever seeing the number.

## What a player sees

- **The top bar carries it.** The owner's medal and your AP sit beside the
  log-out door, opposite your gold: `[door] [medal 120]   ☀ BroTown   [coin 50]`.
  The zone name stays centred, since the left and right now balance.
- **Every rise is seen.** When your AP goes up (any achievement, a quest's +5,
  a guild rung), a small "+10" pops up beside the number and slides into it as
  it fades, and the number bumps, as your gold spins its coin. Common
  achievements still get their chat line, and big ones still get their banner.
- **A tap opens the Achievements page** (under More, with its back arrow), as
  Life Skills' AP and a player card's title already do.

## The rules

- The number is the **server's** (`achvApTotal`: the worker's `achv_state`,
  kept fresh by every echo of `achievementPoints`), never the phone's guess.
- Shown only against a server that grants achievements (`caps.achievements`).
  Without it the bar is laid out exactly as before.
- A rise counts only once the server's record has arrived, so your total
  arriving at login is never shown as a "+1,240". It never counts in the
  bar's first 2.5 seconds, and never under calm motion (the reduced-motion
  setting, or the QA harness).
- The "+N" stays inside the bar's own box: it reads as the counter's and never
  lies over the world. Transform and opacity only, a flat fill (no CSS filter
  over the game's canvas: TRAPS §42).

## Where it lives

- `src/game/apChip.js`: the words and the rise rule (no imports; node runs it).
- `src/ui/mobile/ZoneHeader.jsx`: the chip, its rise, its tap.
- `src/styles/game.css`: `.bt-zone-header__left`, `.bt-zone-header__ap`,
  `.bt-ap-gain` (the bar's first column is `auto` now, at least the door's old
  38 px).

## Tests

- `server/test/ap-chip.test.mjs` (18): the words, the rise rule, and the bar's
  promises (the server's number, the gate, the record-arrived rule, the tap, a
  flat fill).
- `tools/qa/mp/mp-apchip.mjs` (7, a phone **in the world**):
  - a fresh character's bar shows the medal and 0, beside the door and clear
    of the name and the gold;
  - a first kill (the test lever) brings First Blood: the bar reads 10 and a
    "+10" is drawn inside the bar;
  - a tap opens the Achievements page, reading the same 10;
  - it fits at 320 px upright and sideways.

  This box draws a few frames a second, so the test replays the "+10" held at
  its middle for the picture. Under the harness's calm motion the "+N" keeps
  still, so the test turns calm motion off.

## Ideas not built (the owner's call)

- Your chosen **title under your name** over your head, for everyone to see.
- A **"next achievement"** hint (the one nearest done) on the Achievements tile.
