# Card SEC2: the site's outside audit, the fixes that live in the repository

**Why (the owner, 2026-11-17):** an outside, black-box audit of brotown.net
(curl from the public internet, no exploitation) and *"Here's a partial
security audit. Are you able to add these fixes in?"*; on where a stranger
reports a security problem: *"GitHub private reporting"*.

**Starts:** now. **Tags:** 5820 to 5839 (the block `"SEC2": [[5820, 5839]]`,
written by PR 1). **Browser:** one phone scenario (`mp-csp`).
**Effort:** standard (no money, saves, logins or big files).
**Laws that apply:** none of the game's (no art, no wire, no doors). The
repo's: one system a PR, precheck before every push, a break proof.

**Read first:** `public/_headers` (its header comments: card SEC PR 18 moved
the protective headers there, because `src/public/` never ships),
`tools/guards/site-headers.test.mjs`, `vite.config.js`'s plugins.

## The audit, finding by finding

| # | Finding (audit's rating) | Here |
|---|---|---|
| 1 | No HSTS (medium) | PR 1 |
| 2 | CSP is frame-ancestors only (medium) | PR 1 report-only; PR 2 enforces |
| 3 | HTML comments in the shipped page (low) | PR 1 |
| 4 | No Permissions-Policy (low) | PR 1 |
| 5 | No security.txt (info) | PR 1 |
| 6 | `access-control-allow-origin: *` (info) | left, see "Not built" |
| A | `*.pages.dev` previews public (unverified) | the owner's, see "Not built" |
| B | SPF / DMARC unknown (unverified) | the owner's |
| C | `www` record unknown (unverified) | the owner's |

The audit's file paths say `src/public/_headers`: that file never ships
(`vite.config.js` `publicDir: '../public'`); everything here goes in
`public/`.

## PRs, in order

1. **(tag 5820) The headers, the comments, security.txt.**
   - `public/_headers`, under `/*`: `Strict-Transport-Security: max-age=
     31536000; includeSubDomains` (NOT `preload`: the owner's, below);
     `Permissions-Policy` switching off camera, microphone, location,
     payment, USB and the motion sensors (the game uses none; it does use
     fullscreen, the orientation lock, clipboard, share, vibrate, autoplay,
     all left alone); a full `Content-Security-Policy-Report-Only`, built
     from a census of what the page loads (each source and why in the file).
   - The readings chosen: report-only first, as the audit itself advises
     (a wrong line enforced is a black screen); `'unsafe-eval'` in
     script-src because PixiJS 8 refuses to start without it (the audit's
     own `script-src 'self'` would have been that black screen: `mp-csp`'s
     break proof shows the renderer dead); the font preload's inline onload
     allowed by its hash.
   - `vite.config.js` + `tools/dev/strip-html-comments.mjs`: the build
     drops `src/index.html`'s comments (build only; the source keeps them).
   - `public/.well-known/security.txt`: Contact is GitHub's private
     vulnerability reporting (the owner's choice); Expires 2027-11-01.
   - `tools/guards/site-headers.test.mjs` §4-7 hold all of it;
     `tools/qa/mp/mp-csp.mjs` plays the game under the policy ENFORCED.
   - **Done when:** the guard is green with its five new break proofs; a
     build's `dist/index.html` has no `<!--` and `dist/.well-known/
     security.txt` exists; `mp-csp` green with its three break proofs; the
     preview URL answers `/.well-known/security.txt` with the text file.

2. **(tag 5821) The feedback board sends a security hole to GitHub.**
   The owner, 2026-11-17, asked whether the game's bug reports should go
   to security.txt's address; the reading chosen (the orchestrator's
   recommendation, the owner's "Yes"): ordinary bugs stay on the in-game
   board (one step, no account, the crash feed beside it), and the board
   points a cheat or a security hole to GitHub's private form, because
   the board is public (`/list` answers anyone; players vote).
   - `src/ui/mobile/dash/FeedbackPanel.jsx` (More, Feedback; the legacy
     panel behind the hidden MenuBar is not reachable and stays): a
     footnote under Send, the box still first in view.
   - `docs/UI-DESIGN-NOTES.md`, the Feedback line; the site-headers guard
     §6 holds the link equal to security.txt's Contact.
   - **Done when:** the guard green with its break proof; on an upright
     phone and a computer the line is in view at the panel's end, on top,
     and pressing it opens the form in a new tab with the panel still open
     (a one-off run, 2026-11-17, pictures in the PR).

3. **(tag 5822) The policy enforced.** Not before PR 1 has run on the
   owner's phone for a while.
   - Rename the header to `Content-Security-Policy` and fold
     `frame-ancestors 'none'` into it (one CSP line, not two).
   - The tool pages (`public/tools/**.html`, `deploy-scores.html`,
     `sprite-preview.html`) carry inline scripts: give them a rule that
     detaches it (`! Content-Security-Policy` under their paths) or a
     policy of their own; the game's own `/tools/world/core/*.js` scripts
     (the ground worker) keep it.
   - Safari is the primary platform: the owner opens the PR's preview URL
     on the iPhone and plays (the door, the fonts, the world, a fight, a
     window). `'unsafe-hashes'` is the line to watch there.
   - `mp-csp` green (it reads whichever header carries default-src).
   - Later, separately: `import 'pixi.js/unsafe-eval'` would let
     `'unsafe-eval'` go (a renderer change: the memory and frame checks).

## Not built: the owner's, in the Cloudflare and GitHub dashboards

- **GitHub private vulnerability reporting** (security.txt's Contact):
  the repository's Settings, then "Advanced Security" in the sidebar's
  Security section, then Enable beside "Private vulnerability reporting".
  It is OFF today (2026-11-17), so the link offers no form until it is on.
  GitHub offers it on PUBLIC repositories only: if the repository goes
  private, security.txt needs another Contact (an email).
- **HSTS preload**: once the header has run a while, hstspreload.org; it is
  built into browsers for months, so it is a decision, not a fix.
- **`*.pages.dev`**: every PR's preview is a public address. Cloudflare
  Pages, Settings, "Access policy" can put the PREVIEWS behind a login
  (Cloudflare Access); the owner then signs in once on the phone to test a
  preview. The worker's origin lock (`origin.js`) already accepts them;
  nothing in the repository changes.
- **SPF / DMARC**: this box cannot read DNS. If brotown.net sends no mail,
  two TXT records in Cloudflare DNS: `v=spf1 -all` on brotown.net and
  `v=DMARC1; p=reject;` on `_dmarc`.
- **`www.brotown.net`**: if Cloudflare DNS lists it, point it at the Pages
  project with a redirect to brotown.net (also card SEC's Found: the
  roster cookie splits www from brotown.net); if not, nothing.
- **`access-control-allow-origin: *`** (audit 6): left. The files are the
  public game's, there are no cookies on the site, and a page that cannot
  fetch them can still copy them; narrowing it risks the fonts and the
  previews for nothing a stranger cannot do with curl.
- **The repository is public**: GitHub answered `"visibility": "public"`
  on 2026-11-17, where CLAUDE.md §4 says it went private on 2026-10-28.
  The audit's comment finding matters less while the code itself is open.
  Whether it should be private is the owner's.

## Rules for every PR here

- Headers have no live switch: a change is a new build, and a PR's preview
  URL serves it first. Say so in the PR.
- What a player sees: nothing in PR 1 changes it (report-only). PR 2 can:
  the owner's phone on the preview first.
