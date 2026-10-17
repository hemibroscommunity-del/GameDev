# The account check: a new character proves a person is there (v2.3.3275)

> The owner, 2026-10-16, after the anti-bot review: *"Yes start on the urgent
> five and the account check."*

## Why

The review (docs/specs/antibot-review.md, 6) found that an account costs
nothing: any unused name is a new character, with no limit per device or
address and no check of any kind. A bot operator's whole plan rests on that,
a fleet of free accounts each collecting what a new character is given,
funnelled to one.

This puts one cheap check at the door: **Cloudflare Turnstile**, the game's
own host's check. It is free, and for most people it is a tick with no
puzzle. A real player meets it once, when their character is made. A fleet
meets it once per account, which is the point.

## What happens

1. A phone joins with an id the room has no record of (a new character, or a
   guest tab).
2. The room answers `join_rejected {reason: 'verify', sitekey}` and closes
   the socket with code `4014`. Nothing is written.
3. The page shows a small card, "One quick check", with Cloudflare's widget
   in it. Most people see a tick appear by itself.
4. The widget's token rides the next `join` as `verify`. The room asks
   Cloudflare whether it is a person's token, and if so makes the character
   as before.
5. A character on file is never asked again, however it connects.

If the token is refused (expired, forged, or the verifier unreachable), the
card comes back and says "That didn't go through. One more try." A player
who cannot load the widget at all sees a "Try again" button.

## Who is asked

Only a character that does not exist yet: an id with no `auth:` record. That
is a `bp_` id's first join, and every guest id (`?guest=1`), which never has
a record. The check runs inside the "no auth record" branch of
`_verifyJoinAuth` (join.js), **before** the record is stamped, so a refused
join writes no row.

## Off until the owner turns it on

The check is configured only when both of these are set:
- `TURNSTILE_SITEKEY` in `server/wrangler.toml` (public by nature);
- `TURNSTILE_SECRET` as a dashboard secret (never in this repo).

With either missing, every new character is let in as before and the
verifier is never called. The live flag `disable_verify` turns it off again
without a deploy.

**Order matters.** A page from before this version answers a `verify`
refusal as "not retrying" (the fatal branch for unknown reasons). So the
secret goes in only after the new client is live, which is the moment the
PR merges (Pages deploys on merge). docs/OPERATIONS.md, "The account check",
has the steps.

## Fail closed

A verifier that cannot be reached, or answers anything but `success: true`,
refuses the new character; the player sees the check again. An attacker
cannot cause that outage, and the owner has the live flag for a real one.

## What it does not do

- It does not stop a determined operator who pays for solved captchas, or
  solves them by hand once per account. It raises the cost of an account
  from zero to real work, which is what the review asked for.
- It checks nothing after the character is made. The earning caps and the
  transfer rules the review recommends are the next layer.
- It is not a login. The login key is unchanged.

## Wire

| Message | Direction | Field | Since |
|---|---|---|---|
| `join` | client → server | `verify`: the Turnstile token, present only when the gate collected one; spent on send | v2.3.3275 |
| `join_rejected` | server → client | `reason: 'verify'`, `sitekey` | v2.3.3275 |
| close | server → client | `4014 'verify'`: the client opens the gate and does not take its ordinary backoff | v2.3.3275 |

Deploy order: a new client against an old worker sends a `verify` field the
worker ignores. An old client against a new worker with the check on is the
one case to avoid, and the setup order above avoids it.

## Config

| Name | Where | Meaning |
|---|---|---|
| `TURNSTILE_SITEKEY` | `server/wrangler.toml` `[vars]` | the widget's site key; empty = off |
| `TURNSTILE_SECRET` | dashboard secret | the widget's secret key; absent = off |
| `TURNSTILE_VERIFY_URL` | test seam only | where the room asks; `mp-verify` points it at a stand-in |
| `disable_verify` | live flag | true = off without a deploy |

## Tests

- `server/test/verify.test.mjs` (24 checks): off without keys or with the
  flag; a new character refused with nothing written; a good token in, the
  verifier asked once with the secret, token and address; a character on
  file never asked; guests asked every join; refusals (a bad token, a
  throwing verifier, an over-long token, an answer without success); the
  test seam; the close code.
- `tools/qa/mp/mp-verify.mjs`: on a phone, against a worker of its own with
  the check on and a stand-in verifier and widget: asked once and let in;
  never asked again; a refused token brings the gate back and a good one
  gets in; no horizontal scroll.

## Files

- `server/src/verify.js` (new), `server/src/join.js`, `server/src/index.js`,
  `server/wrangler.toml`.
- `src/networking/wsClient.js`: the `verify` field, the `verify` refusal,
  the gate.
- `tools/qa/mp/harness.mjs` (`BT_WRANGLER_VARS`), `tools/qa/mp/mp-verify.mjs`,
  `tools/qa/mp/run.mjs`.
- `docs/OPERATIONS.md`, `docs/WIRE-PROTOCOL.md`, `CLAUDE.md`,
  `docs/specs/antibot-review.md`.
