# Onboarding pacing and the returning-player fix (v2.3.2738–2739)

> Owner: "Sometimes when you rejoin a game from a saved character it brings up
> the tutorial again as if starting a new character." / "The tutorial
> onboarding is too heavy on window pop ups right after you join the game. I
> don't know how to pace that better."

## Returning players are not treated as new (v2.3.2738)

* The coach (`QuestCoach.jsx`), the welcome plate (`welcomeBanner.js`) and the
  gold road to the Mayor (`questRoute.js`) now wait for the worker's first
  `player_state` (`S._rpgFromServer`). Before it, `S.rpg` can be a blank
  level-1 default on the roads a returning player takes (TRAPS §108).
* The welcome plate only greets a character that is actually new (no tutorial
  quest on record, level 3 or under), and says nothing to anyone else.
* "Welcome seen" and finished coach lessons are also written to a cookie on the
  shared domain (`rosterCookie.js`), so a fresh preview-build link, which is a
  new origin with empty localStorage, remembers them.

## One onboarding voice at a time (v2.3.2739)

`src/ui/onboardingPace.js` is a small referee that three surfaces ask before
appearing:

| Surface | Rule |
| --- | --- |
| Welcome / quest plate | Goes first. Reports how long it will stay (`window.__btQuestMsgUntil`). |
| Coach card | Never appears over a plate, and waits 0.9 s after one ends. After a card finishes, the screen is quiet for 2.6 s before the next one. A card already on screen is never pulled. |
| iPhone "Play full screen" card | Only after 75 s in the world, and only on a screen that has been quiet for 6 s. It used to start an 8 s timer at page load, so it often landed at the same moment as the first coach card. |

The lesson order and wording are unchanged. Only the timing between them changed.

QA: `window.__btPace()` shows the referee's state. `mp-a2hs` checks that the
install card waits while a coach card is up (`window.__btInstallAfterMs`
shortens the 75 s for the test). `mp-coachearly` and `mp-questcoach` still pass.
