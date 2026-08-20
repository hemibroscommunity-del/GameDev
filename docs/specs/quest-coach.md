# Quest coach — the controls are taught by the questline (v2.3.1796)

Owner, 2026-08-20:

> the controls need to be taught in the quest line by highlighting
> (flashing) the sequence you should be learning for equipping items,
> double tap the left joystick for swapping weapons, double tap and hold
> (maybe text above the right joystick and hold for a certain number of
> seconds while you rotate in a 360 degree circle)

`src/ui/mobile/QuestCoach.jsx`, mounted in `BroTown.jsx` as a sibling of
`.brotown-wrap`. Tested by `tools/qa/mp/mp-questcoach.mjs` (31
assertions).

## Why it is not ControlsTutorial

`src/ui/mobile/ControlsTutorial.jsx` already exists and stays: a
five-step guided tour, opened on demand, that dims the world and walks
the HUD with Back/Next. That is a MANUAL — read once, before you own
anything it describes. The sword and shield arrive from `tut_1`, minutes
after that tour ended.

The coach is the opposite shape. No dim, no buttons, nothing to dismiss,
one lesson at a time, appearing when the questline has just handed you
the thing the lesson is about. It never blocks (`pointerEvents:'none'`
throughout) and never covers the control it points at.

## The three lessons

Ordered; one shown at a time; a lesson whose target is not on screen is
SKIPPED rather than blocking the ones behind it (which is how the
joystick lessons stay silent on a desktop pointer, where the controls are
`display:none`).

| id | shown when | anchor | finished when |
|----|-----------|--------|---------------|
| `equip` | anything sits in `weaponStash` / `shieldStash` | the gear tile (`[data-tut="coach-gear"]`), else the Bag rail button | a weapon AND a shield are equipped |
| `swap`  | you own a second weapon (tut_1's turn-in bow) | left joystick | `rpg.activeSlot` changes |
| `block` | a shield is equipped | right joystick | shield held ≥2000 ms AND `_shieldAngle` has visited all 8 sectors |

All three are gated on Mayor Bro's chain being underway, and the whole
overlay retires when `tut_4` is turned in.

## Two decisions worth keeping

**Completion is WATCHED, not reported.** Every lesson has a game-state
fact that is true only after the gesture worked, and the coach polls for
it on its own rAF. The double-tap classifier in `BroTown.jsx` is ~80
lines of tap-vs-drag timing that three features already read from;
threading a "and also tell the coach" callback through it would put the
tutorial inside the load-bearing path of the control. The side effect is
a feature: a player who swaps weapons with the desktop key or the quick
bar gets credit and is not told again.

**It stands down by HIT-TESTING, not by knowing modal classes.** The
overlay must live outside `.brotown-wrap` to be visible over the
dashboard at all (see TRAPS §20 — the wrap is a stacking context and
flattens everything inside it), which also puts it above the in-wrap
modals. So instead of listing every panel class, `reachable()`
`elementFromPoint`s the middle of the control and only draws if the
control itself answers. Every overlay in this UI lays a scrim over the
screen, so every one of them takes the mark down — including ones not
written yet. The joysticks pass a `reach` selector because their discs
are `pointerEvents:'none'` by design and the touch is caught by the
`[data-joyzone]` layer underneath.

## Storage

`localStorage['bt_coach_v1']`, `{lessonId: true}`. Per browser rather
than per character on purpose: what is being learned is a thumb gesture.
Read through `Object.create(null)` (CLAUDE.md rule 4 — the file is
player-writable).

## Not covered

The block lesson has no `south` case for the arm art (`blockArm.js`), but
that is unrelated: the coach points at the joystick, not the character.

`ControlsTutorial`'s own bag step still lists `[data-tut="dash-bag"]` and
`.bt-dashboard-nav-button`, and NEITHER is in the DOM any more — nothing
passes the `tut` prop and the nav moved to `.bt-navrail`. That step has
been silently dropping itself. Out of scope here; noted so the selectors
are not copied.
