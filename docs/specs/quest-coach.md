# Quest coach — the controls are taught by the questline (v2.3.1796)

Owner, 2026-08-20:

> the controls need to be taught in the quest line by highlighting
> (flashing) the sequence you should be learning for equipping items,
> double tap the left joystick for swapping weapons, double tap and hold
> (maybe text above the right joystick and hold for a certain number of
> seconds while you rotate in a 360 degree circle)

...and, the same day (v2.3.1797):

> I think mayor bro ought to require you to perform your special attack
> too during the tutorial

...and (v2.3.1801):

> When player turns in quest and receives bow and staff there should be a
> tutorial requiring you equip them all and double tap the left joystick
> to swap through the weapons and just a little message to use what you
> like best

## v2.3.4106: the first steps -- five, and nothing more

> The owner, 2026-11-03: *"First sequence of events when first creating
> character should be welcome to Brotown, talk to mayor bro, equip weapons,
> see minimap with star marker and quest progress in top left pill. Don't
> include the non-essential stuff anymore like tap to talk etc"*

A brand-new character's first minutes are exactly these, in order, each once:

| # | Step | Where | Ends |
|---|---|---|---|
| 1 | WELCOME / BroTown / "Your adventure starts here." (Skip tutorial) | `game/welcomeBanner.js` | after its hold (9 s), or Skip |
| 2 | `mayor`: "Talk to Mayor Bro: He has your first quest.", ringing him, and the big arrow at him (`ui/guideArrow.js` `mayor`) | `ui/mayorScreen.js` (his rect, shared) | his dialogue opens (or the first quest has a record) |
| 3 | `equip`: "Gear up: Tap each glowing item, then Equip." with the glow (`gearFlash.js`) and the arrow (`weapon`) | the bag's tiles | a weapon and the shield worn |
| 4 | `minimap`: "Your map: The gold star is where your quest leads." | `window.__btWheelMini` | 7 s on screen (`FIRST_INFO_MS`), or a tap |
| 5 | `questPill`: "Your quest: Your quest, and how far along you are." | `[data-quest-hud]` | 7 s, or a tap |

- `FIRST_STEPS` holds a step until the steps before it are done; the five
  follow each other `FIRST_STEP_GAP_MS` (1.5 s) apart, not the 20 s
  (`onboardingPace.js` `coachMayShow(now, gapMs)`).
- `RETIRED`: openDash (and the first-join fold), move, dashAfterTurnIn,
  equipAll, cycle, blockRanged, attack, special, chatTap -- kept in the file
  with their history, never walked. `points` (the first level-up) is a later
  moment and stays; `passkey` (the Login Key) waits until the five are done
  and the first quest is handed in (`anytime`, so it may come after the
  Mayor's tutorial).
- The iPhone install card waits while a first step is to come
  (`noteFirstSteps`, `installMayShow`).
- v2.3.4155: `minimap` alone is exempt from the size rule (v2.3.2495,
  `src/game/coachMarkSize.js`; its flag `noSizeRule`): its rect is the
  renderer's own box, and 264 px (a computer's side column) or 132 (a sideways
  phone) is over 0.35 of a window 754 or 377 px tall or less, so "Your map",
  and the quest card and Login Key behind it, never came there. The fractions
  are unchanged; every other lesson, the Mayor's too, keeps them. A retiring
  coach also calls `noteCoach(false)`, or a card up then held the install card.
- Not cards, and unchanged: the gear's glow, the minimap's star cue, the
  townsfolk's bubbles, the "Speak to Mayor Bro first" refusal at the edge of
  town; after the first steps, the weapon-swap hint (first hand-in) and the
  NEW MONSTER card (a first kill).
- Tests: `server/test/first-steps.test.mjs`; `server/test/coach-mark-size.test.mjs`
  (the size rule and its one exemption, v2.3.4155); `tools/qa/mp/mp-firststeps.mjs`
  (upright phone, sideways phone, computer, and a laptop's short 1366 x 657
  window in the band and in the side column: the cards seen are exactly
  mayor, equip, minimap, questPill). Pictures: `docs/shots/first-steps-*.webp`.

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

## The five lessons

Ordered; one shown at a time; a lesson whose target is not on screen is
SKIPPED rather than blocking the ones behind it (which is how the
joystick lessons stay silent on a desktop pointer, where the controls are
`display:none`).

| id | shown when | anchor | finished when |
|----|-----------|--------|---------------|
| `equip`    | anything sits in `weaponStash` / `shieldStash` | the gear tile (`[data-tut="coach-gear"]`), else the Bag rail button | a weapon AND a shield are equipped |
| `special`  | `getActiveWeapon(rpg)` is non-null | right joystick | `S._hasUsedSwipe` |
| `block`    | a shield is equipped | right joystick | shield held ≥2000 ms AND `_shieldAngle` has visited all 8 sectors |
| `equipAll` | `tut_1` is turned in AND `weaponStash` is non-empty | the gear tile, else the Bag rail button | melee, ranged AND staff are all equipped |
| `cycle`    | you own a second weapon | left joystick | every slot you OWN has been active **since the mark went up** |

All five are gated on Mayor Bro's chain being underway, and the whole
overlay retires when `tut_4` is turned in.

**The cycle counter starts when the mark goes up, not at session start**
(v2.3.1809). Equipping sets the slot — `ItemDetailPopup`'s
`onEquipStashWeapon` does `R.activeSlot = slot` so the bro swings what you
just put on — so putting on the sword, the bow and the staff marked all
three slots active and the lesson finished itself *before its mark could
appear*. The finish rule was never wrong; the counting started too early.
It is now armed when the lesson is first selected, seeded with the slot the
player is standing on, so what counts is cycling **after being asked**.

**`cycle` replaced v2.3.1796's `swap`, and the difference is the point.**
`swap` finished on a single change of slot, which proves the gesture
exists. The owner asked for something else — that the player go round all
three and pick one — so it is not finished until every slot they own has
been active, and the copy says why they would bother ("Use whichever you
like best"). Counted against what they OWN rather than a flat three, so
nobody is asked to select an empty slot.

**The order is chronology, and it matches the dialogue.** `equip`,
`special` and `block` are all usable the moment tut_1 is accepted, and
tut_1's start line names them in that order ("hold to aim and swing", "a
quick swipe … triggers a special attack", "double-tap and HOLD to raise
the shield"). `swap` is last because the bow it swaps to only arrives at
tut_1's **turn-in** — a "double-tap to swap" hint shown to a player with
one weapon teaches a no-op.

**`special` gates on the ACTIVE SLOT, not on ownership.**
`specialAttack()` refuses with "No weapon equipped!" when the active slot
is empty, so `live` calls `getActiveWeapon` — a mark asking for a gesture
the game will refuse is worse than no mark. Its completion flag is set by
`specialAttack()` itself, after every refusal gate (dead, mid-harvest,
cooldown, no weapon, no mana), so a refused swipe earns no credit.

**The special's wording is fixed by incident.** v2.3.1681 corrected the
quest dialogue from "flick it and let go" to "a quick swipe" after the
owner reported it as wrong — the handler measures release *speed*. The
coach card says the same thing in the same words, and `mp-questcoach`
asserts both that "quick swipe" is present and that "flick" is not.

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

`ControlsTutorial`'s own bag step pointed at those same two dead
selectors, and its Toolbar step at a third — so its five-step tour had
been running as three. **Fixed in v2.3.1803**, and pinned by
`tools/qa/mp/mp-ctltut.mjs`, which asserts the step COUNT and names any
step that stops resolving. A dropped step is invisible by construction
(the v2.3.1205 degrade), which is why it went unnoticed and why the test
had to exist.
