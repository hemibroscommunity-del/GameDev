card: SEC2
branch: claude/plan-sec2-site-hardening
prs: PR 1 (5820) open
state: ready

## Done

- PR 1 (5820): HSTS, Permissions-Policy, a report-only CSP (public/_headers);
  the build drops index.html's comments; security.txt; the guard §4-7;
  mp-csp (the game played under the policy enforced: green, 0 refusals).

## Next

- PR 2 (5821): the policy enforced, after PR 1 has run on the owner's phone.

## Found

- PixiJS 8 refuses to start without 'unsafe-eval' (AbstractRenderer
  _unsafeEvalCheck): any enforced policy needs it, or pixi.js/unsafe-eval.
- Playwright-fulfilled documents trip Chrome's local-network check against
  the local worker (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS): a scenario
  that changes a page's headers goes through a real proxy (mp-csp does).
- GitHub reports the repository public (2026-11-17); CLAUDE.md §4 says
  private since 2026-10-28.
- GitHub private vulnerability reporting is off: security.txt's Contact
  works once the owner switches it on.

## Needs

- The owner: the dashboard items in the card's "Not built".
