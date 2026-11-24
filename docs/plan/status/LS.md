card: LS
branch: claude/ls-login-spin-button
prs: PR 1 (6560, ready: the draft-free PR from this branch; its number in the orchestrator's message)
state: ready

## Done

- PR 1 (6560): the login wheel opens only from its button.  The rule
  `spinOffersItself` (src/game/loginSpinWheel.js), called by
  LoginSpinWindow.jsx's poll; the ask stays (one a mount).  `?loginspin=1`
  the offer at login, once a mount; `=0` never (the harness's line holds).
  Suite tools/guards/login-spin-offer.test.mjs (no deploy).  mp-loginspin:
  39/39 on the test box, playing the default address (its init takes the
  harness's `loginspin=0` off by history.replaceState) with characters past
  the tutorial.  Plants red: the unconditional open (phone test, default
  pass), the once-guard dropped (suite 2-3; phone test, `=1` road), the ask
  removed and a second ask each second (phone test), `=0` read as an offer
  (suite 1, 3, 4).

## Next

- Waiting for the gatekeeper's sitting 58.

## Found

- (none)

## Needs

- (none)
