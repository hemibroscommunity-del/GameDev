# Halloween week (v2.3.3395)

The fun & social plan's Halloween items (docs/FUN-SOCIAL-PLAN.md), the owner's
"Go recommended": the two that need no new picture. The third, the Pumpkin
Head hat, waits for the owner's ChatGPT picture (its prompt is at the end of
the plan).

## When

18 October to 1 November, by each phone's own calendar
(`src/game/season.js` `halloweenOn`). It is a LOOK, never a rule: the worker
accepts the dance on any day, so a phone with a wrong clock only shows
another phone's shuffle and breaks nothing.

Until v2.3.3444 it began on the 24th. The owner looked for it on 18 October
2026, saw nothing (it had not begun), and chose "Start today for everyone",
this year and every year after.

`?halloween=1` in the address turns it on for a tab out of season (to try it,
and for tests); `?halloween=0` turns it off.

## What you see

- **The Zombie Shuffle.** A thirteenth tile on the emote picker's Moves tab
  (🧟, printed "Zombie": the whole name did not fit, v2.3.3444, the move's
  `short`), or `/zombie` in the chat: a slow lurch, leaning in, a foot dragged every
  two beats, held until you move like the other dances, with a 🎃 popping over
  you now and then. Everyone near you sees it, in season or not.
- **Pumpkin speech bubbles.** Every speech bubble on your screen is
  night-purple, ringed in pumpkin orange, with cream words, instead of white.
  Drawn in code: nothing to load.
- **Diego minds the zombies.** A Zombie Shuffle by his store: "No zombies in
  my store!"

## How

- `src/game/season.js`: `halloweenOn(date)`, `seasonOn(season, date)`,
  `HALLOWEEN` (the window). No imports.
- `src/game/emoteMoves.js`: `zombie` (a held dance, `season: 'halloween'`,
  `short: 'Zombie'` for its tile), its curve in `holdFrame`, `/zombie`.
- `server/src/poses.js`: `zombie` on `POSE.IDS` (mirror-audit holds the lists
  equal), kept any day.
- `src/ui/panels/EmotePanel.jsx`: a season's tile only in its season.
- `src/game/interactions.js` `sendMove`: a season's move only in its season.
- `src/rendering/systems/effectsRenderer.js` `_renderChatBubble`: the skin
  (`spookyBubbleGradient`, `SPOOKY_BUBBLE`); the bubble probe says `skin` and
  `ink`.
- `src/game/townsfolkReact.js`: Diego's zombie lines.

## Tests

- `server/test/season.test.mjs` (24): the window's edges, any year, the
  address override, seasons, and the season's move being a held dance the
  worker keeps.
- `server/test/emotes.test.mjs`: thirteen moves, the shuffle's frames all
  numbers, its tilt never squashing, the same frame on two phones.
- `server/test/townsfolk-react.test.mjs` 3e: Diego and the zombie.
- `tools/qa/mp/mp-halloween.mjs` (two phones, one in season and one not):
  thirteen tiles and twelve, every tile's name whole (the shuffle's
  "Zombie"); a finger on the shuffle, the bro lurches and the
  worker keeps it; the phone out of season still sees it and its pumpkin; the
  bubble pumpkin-coloured on one phone and plain on the other. Pictures:
  `tools/qa/mp/out/halloween-*.png`.

## Pictures

docs/shots/halloween.md (v2.3.3444): each change on a phone in Halloween week
beside one out of it, in BroTown, and the Zombie Shuffle as a looping clip.
