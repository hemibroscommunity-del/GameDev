# /roll and /flip, rolled by the worker (v2.3.3393)

Phase 1 of the fun & social plan (docs/FUN-SOCIAL-PLAN.md), the owner's "Go
recommended".

## What you can do

Type in the chat box:

| Command | What happens |
|---|---|
| `/roll` | a number from 1 to 100 |
| `/roll 20` | a number from 1 to 20 (any size from 2 to 1000) |
| `/dice 6` | the same as `/roll 6` |
| `/flip` or `/coin` | heads or tails |

The players near you see a line in the chat in your name ("🎲 rolled 57
(1-100)", "🪙 flipped heads") and the number over your head as your speech
bubble ("🎲 57", "🪙 Heads!") for its 5 seconds, and hear the toss by distance
(Ace's own coin clip). The command itself is not posted.

One roll or flip every 5 seconds. A second one sooner is held on your phone
with "Roll again in 3 s" in your chat.

## Why the worker rolls

A phone's own roll can always say 100. A roll that decides who gets the loot
is worth exactly as much as the trust in it, so the phone only asks
(`dice {kind, max}`) and the worker rolls:

- from the platform's crypto source (`crypto.getRandomValues`), never
  `Math.random`;
- with no modulo bias: 2^32 is not a multiple of 100, so the few draws at the
  top that would make the low faces likelier are drawn again (`fairInt`);
- with nothing the phone sends deciding the number: a `value` in the ask is
  ignored.

## The wire

| | |
|---|---|
| Phone to worker | `dice {kind: 'roll', max}` or `dice {kind: 'flip'}` (wsClient's shim passes it, TRAPS #18) |
| Worker to phones | `dice_roll {id, name, kind, value, max, zone}`, `from` the roller, in the tick's events |
| Who hears it | the players near the roller (a placed event: eventplace.js `ROOM_PLACED`, within 2,800 px in the Wheel, the zone elsewhere), the roller anywhere |
| Muted | a player who muted the roller is not sent it (chatmod.js `MUTABLE_RELAY_TYPES`); a blocked one is not shown it (the phone's block list) |
| Forged | `dice_roll` is PRIVILEGED (index.js) and on no relay list: a phone that sends one shows nothing anywhere |

The roller is the worker's stamp (`from`): the phone reads it before the
payload's own `id` (wsClient.js, v2.3.3304), so nobody can roll in someone
else's name.

Nothing is stored, paid or staked. In memory: `ps._diceAt`, the last roll's
time.

Old phones ignore `dice_roll`. A worker without dice never says `caps.dice`,
and the phone then sends "/roll" as the plain chat line it always was.

## Switches

- `dice: false` in the live flags: nothing is rolled, and `caps.dice` is false
  at a phone's next join.

## Files

- `server/src/dice.js`: `DICE`, `fairInt`, `diceAsk`, `_handleDice`,
  `_diceOff`.
- `server/src/index.js`: `case 'dice'`, `PRIVILEGED_EVENTS`.
- `server/src/eventplace.js`: `dice_roll` placed at the roller.
- `server/src/chatmod.js`: `dice_roll` is muted with chat.
- `server/src/join.js`: `caps.dice`.
- `src/game/dice.js`: `slashDice`, `diceResult`, `diceLineText`,
  `diceBubbleText`, `diceWaitMs`, `DICE_GAP_MS` (no imports).
- `src/game/chat.js`: the commands in `sendChatMessage`; `handleDiceEvent`.
- `src/networking/gameEvents.js`: `case 'dice_roll'`.
- `src/networking/wsClient.js`: `dice` through the shim.
- `src/data/eventSounds.js`: `diceRoll`, `coinToss`.

## Tests

- `server/test/dice.test.mjs` (69): the asks; 60,000 rolls of six faces under
  the 0.1% chi-square line, both ends of a hundred reached, a rigged source's
  biased draw drawn again; the gap, the dead, the switch, the cap; through the
  tick in the Wheel (the roller and a near phone hear the same number in the
  roller's name, a far phone, a phone in town and a muter do not); a phone's
  own `dice_roll` goes nowhere; the phone's copy. Five deliberate breakages,
  all caught.
- `server/test/mirror-audit.test.mjs`: the phone's gap and faces are the
  worker's.
- `tools/qa/mp/mp-dice.mjs` (two phones): "/roll" typed in the chat box, the
  same line on both phones and the number over the roller's head; the 5 s hold;
  "/flip" and "/roll 20"; a forged roll shows nowhere; no `caps.dice`, the
  plain line.
