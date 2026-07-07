---
description: Adversarial multi-angle review of a diff, tuned to BroTown's incident history (v2.3.1204)
argument-hint: [PR number | branch | ref-range] (default: working diff vs origin/main)
---

# /repo-review — adversarial multi-angle review (v2.3.1204)

You are reviewing a change to a 100% server-based multiplayer ARPG with
real player value at stake. Plausible-looking code here has repeatedly
destroyed coins, stranded escrow, or opened forgery surfaces. This
protocol exists because single-pass review keeps missing the failure
modes this repo actually has.

**Before starting, read:** `docs/ARCHITECTURE-HANDOFF.md` Part 1 (the
hard rules — findings cite rule numbers), `docs/TRAPS.md` (known
plausible-but-wrong moves), and `CLAUDE.md`. Then determine the diff
under review: `$ARGUMENTS` names a PR number, branch, or ref-range;
with no argument, review the working tree + commits against
`origin/main` (merge-base).

## Phase 1 — parallel finders (one subagent per angle)

Spawn the seven finder subagents below **in parallel** via the Agent
tool (general-purpose). Give each: the diff (or the ref-range and file
list to read themselves), its angle's probe questions verbatim, and the
instruction to read `docs/ARCHITECTURE-HANDOFF.md` Part 1 first. Each
finder returns a list of candidate findings, each shaped:

```
{ file, line, summary, failure_scenario }
```

`failure_scenario` must be a concrete story — which player, on which
worker/client version, loses or mints what — not "this could be
unsafe". A candidate with no articulable failure scenario is not a
finding. Finders report candidates only; they change nothing.

### Angle A — trust boundary

1. For every NEW server-emitted event type in this diff: is it listed
   in `PRIVILEGED_EVENTS` (`server/src/index.js`), and does
   `server/test/wire-audit.test.mjs` know its emission site? The
   default branch rebroadcasts unknown types — an unlisted server
   event type is a surface clients can forge to each other.
2. For every accept/confirm/claim handler: is it honored ONLY against
   a live offer/challenge recorded from the OTHER side's own
   connection, with the offer's numbers authoritative (an edited
   accept must not inflate the opponent's stake — handoff rule 14)?
   And is an accept with no matching live offer DROPPED (`return
   null`), never relayed — relaying triggers legacy client-side
   minting on the receiving side (rule 15)?
3. Does any handler feed a client-supplied value blob (item object,
   weapon stats, wager/amount field) into an economic decision? The
   marketplace ignores the request's `item` entirely and takes from
   the server's own stash by index (rule 16) — anything short of that
   shape is a candidate finding.

### Angle B — deploy-order safety

1. Is every new client self-credit path (and every legacy fallback the
   diff touches) gated on a `caps` flag / `settled: true` — and does
   that flag mean what the gate assumes on OLD workers? The
   `caps.gems` lesson: a v2.3.1192 worker already advertises
   `amuletForge` yet denies the gem-cut op, so gating gem cuts on
   `amuletForge` would have silently eaten gems on that worker — gems
   got their OWN flag (see the caps comment in `server/src/join.js`).
   For each gate, name the oldest worker that advertises the flag and
   confirm it actually honors the gated operation.
2. Do v1 AND v2 protocol sessions both still work after this diff?
   v1 gets full `player_state` snapshots and the legacy
   `zone_monsters`/`zone_nodes`/`zone_loot` trio; phraseless joins on
   unregistered ids stay allowed (rule 21). Check both emit paths for
   any state the diff adds.
3. Run both mixed-version matrices: old client + new worker (does the
   authoritative `player_state` echo still overwrite any client
   double-apply? — rule 20), and new client + old worker (does the
   legacy path still fire, or did the diff delete a fallback some
   production worker still needs?).

### Angle C — echo-stomp revival

1. Does this diff un-shadow, re-enable, or route new data into a
   legacy client handler whose CONSUMERS predate remote/server
   delivery? The `arena_bet` trap is the template: reviving the
   shadowed display handler looked like a one-line fix, but Active
   Bets crashed on mixed payload shapes, "Your Bets" had no ownership
   filter, the sender's own echo double-counted, and on `!caps.sponsor`
   workers the legacy pot-split mint would have counted forged remote
   amounts into `S.rpg.coins` (#220; TRAPS.md).
2. For any client-local ledger the server's echo currently stomps
   (lifeSkills gems, legacy credits): does the diff widen what feeds
   that ledger, or change WHEN the echo lands? List every consumer
   that reads the local value in the window between self-credit and
   echo — each is a candidate for double-display or double-spend.

### Angle D — settlement and idempotency

1. Does every new payout ride `_creditPlayer` with a deterministic
   opId stamped in `oplog:` (`settle:<id>:leg` / `duelpot:<id>`
   patterns — rules 4-5)? A hand-rolled inbox write or a direct coins
   mutation in a settlement path is a finding even if it "works".
2. Escrow-at-placement vs validate-at-commit: was the choice made by
   deploy-survival (rule 7)? Money at rest (listings, wagers, entries)
   must be escrowed in storage with a sweep; instantaneous swaps must
   validate-at-commit inside ONE input-gated event. A debit…credit
   sequence across events is a crash window — market settlement had to
   be reordered credit-first with opId stamps for exactly this
   (v2.3.1181-1184, #223).
3. Does any sweep refund an escrow record without first checking the
   payout's oplog stamp (rule 6, `_duelEscrowSweep` is the reference)?
   A crash between pot-credit and record-delete must converge, not
   double-pay.

### Angle E — key and input hygiene

1. Any new plain `{}` keyed by client-supplied strings (player ids,
   tier keys, names)? Must be `Object.create(null)` or `Map` — a key
   of `'__proto__'` silently no-ops on a plain object (three incidents
   on 2026-07-07 alone: duel.away v2.3.1175, party meta v2.3.1185,
   amulet tiers v2.3.1192; `tools/dev/precheck.mjs` check 6 warns on
   the pattern). Lookups into config tables need
   `Object.prototype.hasOwnProperty.call`, not truthiness (see
   `server/src/amulet.js` tierKey).
2. Is every client-supplied number clamped/floored/range-checked
   before it touches state or arithmetic (`Math.max(0,
   Math.floor(...))` posture in `server/src/persistence.js`)? A NaN or
   negative that survives one assignment poisons coins forever.
3. Any new storage key: is its prefix registered in the
   ARCHITECTURE-HANDOFF rule-2 table, lowercase_snake, enumerable via
   `storage.list({prefix})`? Any new rpg-blob field: is it in
   `_saveRpg`'s fixed field list AND the delta-emit list (rule 1 —
   otherwise it is silently dropped on the next save)?

### Angle F — removed behavior

1. For EVERY deleted or replaced line: what invariant did it enforce,
   and where is that invariant re-established? The duel grace-clock
   lesson: the single-slot `graceUntil`/`awayId` pair looked like a
   cosmetic cleanup target, but it was the only thing arming forfeit
   clocks — replacing it without per-player clocks left duels stuck
   'active' forever, blocking both players (v2.3.1175, #220).
2. Was removed code actually dead? Show the grep for all consumers,
   including indirect ones (state echoes, join snapshots, the
   `!caps.*` legacy branches). "Nothing reads this" without the grep
   is not evidence.
3. If the removal is a legacy caps fallback: fallbacks exist to be
   deleted (rule zero), but only once every worker in production
   advertises the capability — does one?

### Angle G — Durable Object concurrency

1. Any non-storage `await` (cross-DO fetch, external fetch, timer)
   between a validation and the commit that depends on it? Storage
   awaits keep the input gate CLOSED; any other await opens it and the
   validated state can change under you (rule 9 — the reason the order
   book lives inside the GameRoom).
2. Any new in-memory state that holds escrowed or real value? A worker
   deploy wipes ALL DO memory (rule 11); memory is only for state
   whose loss costs nothing (offers, challenges, brackets). Name what
   a deploy at the worst moment destroys.
3. Any new time-based behavior assuming a timer fires? There are NO
   alarms and the tick loop stops when the room empties (rule 12) —
   every expiry/ending/draw must resolve lazily on tick AND on next
   activity. Trace the empty-room path.

## Phase 2 — dedup, then adversarial verification

1. **Dedup:** merge candidates that point at the same root cause
   (angles overlap by design — the same bug often surfaces in B and C).
   Keep the strongest failure_scenario.
2. **Verify:** for each surviving candidate, spawn a **skeptic
   subagent** whose explicit job is to DISPROVE it. The skeptic reads
   the actual code (not the diff hunk — the surrounding file), the
   nearest test suite in `server/test/`, and the relevant
   `docs/specs/*.md`, and answers: does the failure_scenario actually
   execute? What line breaks the story (an existing gate, a clamp, an
   oplog stamp, a test that pins the behavior)? Batch related
   candidates into one skeptic when they share a file.
3. Classify each candidate from the skeptic's report:
   - **VERIFIED** — the failure scenario survives scrutiny, with the
     exact code path named.
   - **PLAUSIBLE-BUT-UNVERIFIED** — the skeptic could neither confirm
     nor break it (needs a live worker, a second client, or owner
     knowledge).
   - **DISPROVED** — drop it, but note the disproof if the code is
     confusing enough that the next reviewer will re-find it.

## Output rules

- Findings must be verified before acting. Only VERIFIED findings may
  be fixed in-place (and only when a fix was asked for);
  PLAUSIBLE-BUT-UNVERIFIED findings are REPORTED with what would
  settle them — never auto-fixed. This repo's history is full of
  confident fixes that were the bug (see TRAPS.md).
- When a finding matches a known trap, cite the `docs/TRAPS.md` entry
  by name — it carries the incident reference the PR discussion will
  need.
- Report findings grouped by classification, each with file:line, the
  failure scenario, the handoff rule number it violates, and the
  skeptic's confirmation. End with the angles that came back clean, so
  the reader knows they were probed.
