# The big arrow, the first time (v2.3.3925)

> The owner, 2026-11-02: *"The first time you get handed a weapon put an arrow
> pointing to either the bag dashboard button or the weapon if the dashboard is
> already open. The flashing light isn't obvious enough. Also the first time
> you level up and have enough points to allocate between your weapon and the
> character should have that same big arrow to guide you where to go."* And:
> *"Then I noticed the flashing inventory button and gold star but it took a
> few beats."*

Client only. `src/ui/guideArrow.js`, mounted by `QuestCoach.jsx`.

## What it does

- **The first weapon.** Mayor Bro's first quest (tut_1) hands over the
  greatsword and the shield as you take it. While either waits in the bag, a
  big gold arrow points where the glow is (`gearFlash.js`
  `gearFlashSelectors`): the fold handle while the band is folded, the Gear
  (dashboard) button while the bag is off the screen, else the weapon's tile.
  It follows as that changes (looked up again every 250 ms), until both are
  worn or 60 s of showing (`WEAPON_MS`). Its words: "Tap to open", "Tap
  Gear", "Tap to equip".
- **The first points.** When `pointsTipWanted` says so (points waiting, none
  ever placed, a quiet moment): the Character button ("Tap Bro: points to
  spend"), then the Points tab once the page is open ("Tap Points"), until a
  point is placed or 3 minutes of showing (`POINTS_MS`: a player keeping their
  points is not followed for ever).
- **Once per character**: `localStorage` `bt_guideArrow:<id>` (inside
  try/catch). A character that started again is owed a lesson again
  (`guideOwedAgain`: the first quest never taken; no point ever earned).
- **Phone and computer**: "Click" on a computer (`deskWords`).
- `?guidearrow=0` turns it off for one tab.

## How it is drawn

As `starCue.js`: one element on the body, outside `.brotown-wrap` (TRAPS §20),
`pointer-events: none`, no CSS filter (the dark edge is the SVG's stroke),
never touching its target (no transform on it). 56 px, pointing down from
above the target, or up from below when there is no room above; it bobs by
Web Animations (still under prefers-reduced-motion) and glides 0.2 s between
targets (never in from the corner: no glide on its first spot). Its words are
kept 4 px inside the screen. Never two at once (`sweepStrays`).

Only the stable hooks are aimed at: `data-dash-fold`, `data-land-fold`,
`data-nav="dashboard"`, `data-gear`, `data-nav="hero"`,
`data-section="Build"`.

## Tests

- `server/test/guide-arrow.test.mjs`: the lessons, targets, words, the once
  a character, the drawing rules.
- `tools/qa/mp/mp-guidearrow.mjs`: an upright phone and a computer in the
  world: no arrow before; after tut_1 it points at the glow's target, follows
  a finger (a click) to the weapon's tile, goes once worn, and not again after
  a reload.
- `tools/qa/mp/mp-pointstips.mjs` steps 2, 3, 5: Character, the Points tab,
  gone once a point is spent.
- UI review: `guide-arrow`.
