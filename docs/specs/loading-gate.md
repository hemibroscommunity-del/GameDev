# Nothing for the world while a loading screen is up (v2.3.4126)

> The owner, 2026-11-03: *"Before the loading screen is finished I'm seeing pop
> up messages meant for the main screen area (like the star on minimap etc).
> Needs to wait until it's done."*

Client only. `src/ui/loadingGate.js`.

## Why it happened

The loading screen (the ocean clip, `IntroVideo.jsx`, `.bt-intro`) sits at
`z-index` 100. Anything drawn higher showed through it: the minimap's big
star (`starCue.js`, 9100) and the weapon-swap hint (9050). Anything lower
played its seconds out unseen under it: a banner or a toast that came while
loading was over before the world appeared. A zone's veil
(`zoneTransitions.js`, `.bt-zone-loading`: a building, a dungeon, a land) hid
whatever came under it in the same way.

## The gate

`worldReady()` is true when all three hold:

- the world has come in (`markGateWorldIn`, called by `onboardingPace.js`
  `markWorldIn`: when the clip has fully faded, since `IntroVideo` calls
  `onComplete` after its fade, or at once on the road with no clip);
- no `.bt-intro`, no `.bt-zone-loading` and no `body.bt-intro-up` in the page;
- `SETTLE_MS` (0.7 s) has passed since the last one went.

It reads the screens themselves, never a timer, and the loading screens are
not touched. `whenWorldReady(fn)` runs `fn` now, or once the world is on
screen, in the order asked.

## Who asks

| Surface | How it waits |
|---|---|
| The coach's cards (`QuestCoach.jsx`), the first steps among them | no card while loading; one up when a veil comes goes, and returns in its order |
| The big arrow (`guideArrow.js`), and whatever rides it (the weapon-swap hint) | hidden while loading |
| The minimap's big star (`starCue.js`) | its target is kept until it can be shown |
| Quest banners and the WELCOME plate (`window._setQuestMsg`), level-up banners (`window._setLevelUpMsg`) | held, then shown with a fresh clock |
| Toasts (`storeToastBus.push`) | held, then shown for their full time |
| Achievements (`achievements.js` `achvWorldShown`) | the gate added to its own check |
| The NEW MONSTER card | its clock held while loading |
| The weapon-swap hint (`SwapHint.jsx`) | waits, as it does for a dialogue |

## Tests

`tools/qa/mp/mp-loadinggate.mjs`: a new character on a slow phone
(`BT_QA_CPU_THROTTLE` 4). No pop-up is in the page while a loading screen is.
The WELCOME plate and the big star come after the clip has gone, and the
first steps still run in order. On the farm's veil, a toast and a quest banner
that came under it show once it has gone.
