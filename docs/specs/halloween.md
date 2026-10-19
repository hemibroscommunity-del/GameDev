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

Until v2.3.3463 it began on the 24th. The owner looked for it on 18 October
2026, saw nothing (it had not begun), and chose "Start today for everyone",
this year and every year after.

`?halloween=1` in the address turns it on for a tab out of season (to try it,
and for tests); `?halloween=0` turns it off.

## What you see

- **The Zombie Shuffle.** A thirteenth tile on the emote picker's Moves tab
  (🧟, printed "Zombie": the whole name did not fit, v2.3.3463, the move's
  `short`), or `/zombie` in the chat: a slow lurch, leaning in, a foot dragged every
  two beats, held until you move like the other dances, with a 🎃 popping over
  you now and then. Everyone near you sees it, in season or not.
- **Pumpkin speech bubbles.** A PLAYER'S speech bubble is night-purple,
  ringed in pumpkin orange, with cream words. Drawn in code: nothing to load.
  Since v2.3.3494 a townsperson's line is the white bubble with black words
  even this week, and a player's is dark all year (Lantern Slate's slate with
  warm-white words outside Halloween week) -- the owner, playtesting on 19
  October: "Make Npc dialog boxes white. Keep players the darker color to
  differentiate." Until then every bubble on the screen, the townsfolk's
  included, was purple this week and white the rest of the year
  (`src/game/bubbleSkins.js`, docs/specs/menus-2026-10-19.md).
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
  (v2.3.3494: `bubbleGradient(skin)` from `src/game/bubbleSkins.js`
  `BUBBLE_SKINS` -- `plain` a townsperson's, `halloween` a player's this
  week, `player` a player's the rest of the year, chosen by `bubbleSkinFor`);
  the bubble probe says `skin`, `ink` and (v2.3.3494) `fill`.
- `src/game/townsfolkReact.js`: Diego's zombie lines.

## Tests

- `server/test/season.test.mjs` (30): the window's edges, any year, the
  address override, seasons, the season's move being a held dance the
  worker keeps, and (v2.3.3494, §5) whose bubble is whose: a townsperson's
  white in and out of the week, a player's purple in it and slate out of it.
- `server/test/emotes.test.mjs`: thirteen moves, the shuffle's frames all
  numbers, its tilt never squashing, the same frame on two phones.
- `server/test/townsfolk-react.test.mjs` 3e: Diego and the zombie.
- `tools/qa/mp/mp-halloween.mjs` (two phones, one in season and one not):
  thirteen tiles and twelve, every tile's name whole (the shuffle's
  "Zombie"); a finger on the shuffle, the bro lurches and the
  worker keeps it; the phone out of season still sees it and its pumpkin; the
  bubble pumpkin-coloured on one phone and (v2.3.3494) the dark everyday
  player bubble on the other, and a townsperson's line white with black words
  on both. Pictures: `tools/qa/mp/out/halloween-*.png`.

## Pictures

docs/shots/halloween.md (v2.3.3463): each change on a phone in Halloween week
beside one out of it, in BroTown, and the Zombie Shuffle as a looping clip.
