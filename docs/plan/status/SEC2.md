card: SEC2
branch: claude/plan-sec2-report-line
prs: #2088 (5820) merged (the owner's word, 2026-11-17); PR 2 (5821) open
state: ready

## Done

- PR 1 (5820): HSTS, Permissions-Policy, a report-only CSP (public/_headers);
  the build drops index.html's comments; security.txt; the guard §4-7;
  mp-csp (the game played under the policy enforced: green, 0 refusals).
  Merged on the owner's own "you can merge", 2026-11-17, not a sitting.
- PR 2 (5821): the feedback board's footnote sends a security hole to
  GitHub's private form (the same address as security.txt).

## Next

- PR 3 (5822): the policy enforced, after PR 1 has run on the owner's phone.

## Found

- PixiJS 8 refuses to start without 'unsafe-eval' (AbstractRenderer
  _unsafeEvalCheck): any enforced policy needs it, or pixi.js/unsafe-eval.
- Playwright-fulfilled documents trip Chrome's local-network check against
  the local worker (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS): a scenario
  that changes a page's headers goes through a real proxy (mp-csp does).
- GitHub reports the repository public (2026-11-17); CLAUDE.md §4 says
  private since 2026-10-28.
- GitHub private vulnerability reporting: switched on by the owner,
  2026-11-17 (the API answers enabled: true).

## Needs

- The owner: the dashboard items in the card's "Not built".
