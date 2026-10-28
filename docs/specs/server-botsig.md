# Bot signals measured by the server (v2.3.3731)

The plan is `docs/HIDDEN-SERVER-PLAN.md`, "The anti-bot plan" 1, 4 and 5. The
anti-bot review (`antibot-review.md` §2) found that botfp.js judges numbers the
phone writes, so a script writes whatever passes. These signals are measured
by the **server**, from messages every script must send anyway. There are no
new message types, and nothing on the wire changes.

**Flag, never act** (the owner, 2026-07-03). The one optional act is OFF by
default (below).

## The signals

| Reason | What the server measures | Why a person does not trip it | Placeholder line |
|---|---|---|---|
| `aimed` | at each harvest's start, the last 40 px of the walk: straight to 0.75 px, its line within 1.5 px of the node's centre | a stick's heading wanders and its aim is rough. A resting thumb is straight but aimed anywhere. The keyboard's 8 headings are **never judged**: a keyboard walk along a row of nodes is dead on every centre | 50% of 40+ walks |
| `reflex` | a monster's wind-up (`telegraph.js`, both kinds) to the player stepping away, dodging or raising the shield, minus the measured round trip | people need a few hundred ms and spread out. A player already walking away, or already behind a shield, is not measured | 60% of 20+ answers under 120 ms |
| `rooted` | hits in a row from the same 2 px of ground | people move between targets | 600 hits on 3+ monsters |
| `cook` | the gap between cooks (log histogram, 9% bins) | the minigame takes as long as it takes | 10th-90th percentile within 1 bin, 60+ cooks |
| `gesture` | a harvest's start to its strike, minus the hits the server planned | a gesture takes 1.2-2.5 s, never the same twice | 10th-90th percentile within 1 bin, 60+ harvests |
| `keys` (v2.3.3725) | a harvest worked by holding E: the gaps between its presses and the holds of all but the last (`node_strike.k`, gesture-points.md) | a person's taps and holds wander | 10th-90th percentile within 1 bin, 60+ presses; weight 3, never a flag alone |
| `marathon` | activity with no 5-minute break | | 4 hours |
| `loop` | ...and the same route of four nodes, in order, again and again | wandering among the same trees repeats steps between two trees, not whole routes of four | 60% of 100+ routes |
| `cloud` | the socket's network, `request.cf.asn` (with `asOrganization`) at the opening, against a list of cloud providers' AS numbers | home and phone networks are not on it. Cloudflare's, Akamai's and Fastly's edges (Apple Private Relay) are left off on purpose | on the list |

**Weights** (placeholders): aimed 6, reflex 6, rooted 6, cook 6, gesture 3,
loop 4, marathon 2, cloud 2. **A player is flagged at 6**: one strong reason
alone, or two weaker ones together. Cloud, marathon, gesture or loop never
flag alone. **Every line, weight and the cloud list is a hidden setting**
(hidden-settings.md, group `botsig`; the cloud list is the first list-type
setting).

## What it deliberately does not use

The honest client's facts (2026-10-28), which make these useless or unfair:

- **The cadence of `move`.** Today it is a 33/66 ms timer. Lane D's message
  diet (cap `movepath`, off by default) sends a steady walk about every
  200 ms and changes at once. Neither is a person's rhythm.
- **The cadence of swings.** Holding attack auto-swings on the cooldown.
- **Instant turns alone.** A keyboard turns instantly.
- **The walk to a monster.** The sword's lunge re-aims at its target every
  frame, so an honest player makes a perfectly aimed straight line.

## Robust statistics

`server/src/botstats.js`: counter pairs and small log-scale histograms, read
by quantile (the 10th to 90th percentile's spread; the share in a peak). A
stalled frame or a network spike moves nothing. Every count halves past 400,
so old evidence fades and the stored record stays small. No raw event is kept.

## Storage and cost

- The evidence is the `sig` field of the existing `botstat:<playerId>` record
  (ARCHITECTURE-HANDOFF rule 2), hydrated at the join and written at botfp's
  own pace.
- A harvest's and a cook's measure ride the write those already make.
- A walk's, a fight's and a reaction's measures ride the close (`_botfpFlush`,
  which also makes a last judgement) or the next paced write.
- **No write per message.** `botsig.test` §10 sends a thousand moves, hits
  and reactions and counts zero puts. `cost-guard.test` holds its lines.
- A walk keeps the last 12 places in memory only.
- A flag writes at once (one an hour at most, `_botfpFlag`), as before.

## Switches

- **No signal can break the game.** `disable_botsig` returns at the first line
  of every hook, before anything else runs. Every hook is also wrapped
  (`_sigErrors`): a throw inside a signal is counted and swallowed, and the
  move, hit, strike or monster tick that called it carries on unchanged
  (`botsig.test` §13).
- `disable_botsig` (live flag): nothing is measured.
- `botsig_reverify` (live flag, **OFF**): a player flagged `server-signals`
  must pass Turnstile again at their next join (`verify.js`). This only
  applies while the account check is configured (`TURNSTILE_SECRET` and
  `TURNSTILE_SITEKEY`). The check is asked once a flag. Passing writes
  `sig.reverify: false`. A person ticks a box; a script struggles.
- A test-mode character is never measured (`testmode.js`'s lists).

## Where it is seen

The Test panel's **Bot flags**: kind `server-signals`, "Plays like a script
(measured by the server)", then the reasons in words (DevPanel.jsx
`SIG_REASON_WORDS`).

## Proof, both ways

- `server/test/botsig.test.mjs`: each signal trips on a script's trace and
  not on a person's: a stick's 300 walks (1 aimed); a keyboard along a row of
  nodes (never judged); 260-640 ms reactions; an archer stepping between
  targets; a person's gestures and cooking; random wandering for four hours
  (marathon only, no flag). It also checks cost, persistence, the wiring, the
  switches and the re-check.
- `tools/qa/load/bot-lab.mjs`: every script in the lab, with its server
  signals. The lab's honest walkers now steer like a thumb (`human: true`).
  `straight-pine` keeps the old dead-straight walk, and is flagged.
- `tools/qa/mp/run.mjs`: after every phone scenario, a line saying whether
  anyone the scenario played was flagged (a report, never a failure: the
  harness moves players by script).

## Owner's choices

The placeholder lines and weights, whether to turn on the re-check, and
whether to add networks to the cloud list (VPN providers are left off: many
real players use one).
