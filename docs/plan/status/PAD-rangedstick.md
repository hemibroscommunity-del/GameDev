card: PAD-rangedstick
branch: claude/plan-pad-13-rangedstick
prs: #2425 (ready)
state: ready

Done
- tag 6648: in the two buttons a bow or a staff makes the Attack disc a stick (mode 4's held aim on the disc, a tap one shot the way the bro faces, nothing picked or locked; the owner's 16:35 change: a held bow keeps loosing along the thumb whether or not anything is on its line, freeAttack.js freeArrowGo asking rangedStick.js stickLoose); a sword keeps the latch whole; `?rangedstick=0` gives the latch back. src/game/frameSteps.js (the step input's call: discFrame), src/game/rangedStick.js (one field S._discKind, one writer discKindTo), BroTown.jsx calls only, aimMarks.js (no frame for a stick), bowSpecialNow.js (no pick for a stick), the switch row, the phase row, the ledgers; tools/guards/ranged-stick.test.mjs (the ten dodges a to j planted and seen red); tools/qa/mp/mp-rangedstick.mjs; docs/shots/rangedstick-*.png; UI-DESIGN-NOTES (the controller).

Next
- the gatekeeper's list. On 9b2d92de: test, playable, memory-budget, lint-build green; helpers: mp-manualcombat 44/44, mp-bowfeel 21/21, mp-stafffeel 16/16, mp-padskin 76/76. mp-rangedstick's sideways reds there were its recorder's (an arrow read a frame late, after its angle changed in flight): it now records each shot as it is pushed.

Found
- src/data/say/questCoach.js lines 6 and 8 (questCoach.attackTwo, attackHold) and the tour's controlsTutorial.attackBodyHold / attackBodyTwo (src/ui/mobile/ControlsTutorial.jsx line 61): the two buttons' Attack words speak of facing a monster, a tap's lock and the ring's hold; with a bow or a staff now the disc is a stick. Reported, not rewritten (the owner's words).
- Block's "threat" moment for a bow or a staff (game/thumbSide.js thumbStep) no longer counts a monster in sight (nothing is sighted with a stick); it still comes at the weapon's reach and for a hit lately.

Needs
- nothing.
