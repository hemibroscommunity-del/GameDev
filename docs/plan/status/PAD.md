card: PAD
branch: claude/plan-pad-3-housing (stacked on claude/plan-pad-1-controller)
prs: #2354 (draft, tag 6640, part 1: lands only with part 3); part 3 (draft, tag 6641)
state: handed over (memory line): the reds below are the next session's

## Done
- tag 6640 part 1: the touch controls as a controller (`?padskin=0` today's
  look): two grips, the art cut from four sheets, the rules
  (src/game/padSkin.js), mp-padskin, UI notes.  The owner tried it on their
  iPhone: "too large", not joined to the dashboard, the shape wrong.
- tag 6640 part 2: mp-padskin 5b and mp-twobuttons mended (a wait, not a bug).
- tag 6641 part 3 (card `docs/plan/cards/PAD-part3.md`): ONE shell seated on
  the band (three cuts of the owner's housing.png, CSS border-image), every
  control in a fixed well at the owner's layout.json sizes (131 px tall at
  430, never scaled up), the weapon wells in place of the pill (the pill's
  own buttons and rules), Jump becomes Block in a fight (the big well; Jump
  the middle well, small), the owner's 18 pieces (174 kB, 128 colours;
  part 1's 18 and its four sheets removed).  pad-skin.test 55 checks; its
  mutants: 172 of 191 killed, the 19 left listed in the PR (equivalent or
  past every tested screen).

## Found
- The shield was ALREADY a tap (v2.3.2242, game/shieldToggle.js: a tap
  raises it, a tap lowers it, the guard door its one writer; Attack lowers
  it, playerActions.js).  No held Block exists in the game to replace, so no
  new phase module and no `?tapshield=0`: the card's plants are the existing
  door's (guard-page-door.test, guard-break-page.test) and mp-padskin 6b-6d.
- The fight's end does not lower a raised guard today (shieldButtonLive keeps
  Block shown while up, so it can be lowered): the big button stays the
  shield until a tap lowers it, then it is Jump.  Nothing new lowers it.
- A phone narrower than about 390 px cannot hold three 44 px boxes in the
  right lobe's top row at the owner's art size: that row's art shrinks
  (0.8 at the least), its boxes stay 44.
- No left-handed setting exists (part 1): part 3 drops the mirror.

- Phone runs (helper, head 1b03ed55): mp-padskin 40/43, mp-contextbuttons
  27/27, mp-membudget 12/12 (no line raised), mp-twobuttons 105/118.

## Needs
- mp-padskin 5: a tap on the bow's well reaches it (elementFromPoint w2)
  but WeaponPill's act() never runs (qa.taps 0): find what eats the touch.
  6d sideways once read the guard lowered by 'tap', not Attack.
- mp-twobuttons 3f/3e: PAD_SOCKETS reads box centres against art centres
  (a top-row box rises off the big ones); sideways at 844 the controls sit
  ~46 px left of the shell's mapping (the play column vs the window: check
  playVw and the shell's left there).  6c: the stick's ring sizes changed.
  2b, 2c, 6a, 3h: main's (part 1's list).
