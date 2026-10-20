# Gladiator Arena on the Duel Backbone (v2.3.1126) — spec + attach points

Wave 2 PR10. The arena becomes a server-refereed tournament built on the
duel machine; the old Arena DO is retired from routing (its class stays
exported for the wrangler binding, the marketplace.js precedent).

## The holes this closes

- **Results were client-claimed**: the old `POST /api/arena/result`
  trusted `{winnerId}` with zero verification — two colluding clients
  could trade fake wins for the Gladiator title.
- **No money ever moved server-side**: the 100g entry fee was debited
  locally, round/champion rewards and bet payouts were client-minted.

## How it works now (server/src/gladiator.js, GameRoom mixin)

- **Matches ARE duels.** The bracket manager activates a wager-0 duel
  per match, tagged `duel.arenaMatch = {tid, matchId}`; `_resolveDuel`
  notifies `_arenaOnMatchResolved` — kills, disconnect-grace forfeits,
  and shot-clock timeouts all funnel through server-observed duel
  resolution. `POST /result` is answered but **ignored**.
- **Shot-clock** (`duel.expiresAt`, resolved in `_tickDuels` — a generic
  duel-machine addition that also fixes the latent social-duel deadlock
  where a no-death duel blocked both players forever): 3 minutes per
  match; tiebreak = higher hp/maxHp fraction, coin flip on exact tie.
- **Bracket**: gathers up to 8 for 60s from the first join (starts early
  at 8); at the deadline starts with the largest power of two ≥2 and
  refunds the overflow; undersubscribed gathers cancel + refund. Matches
  within a round run concurrently (consent gates are per-pair). Offline
  player at activation = walkover; a player busy in another duel defers
  activation while their match clock runs (a stall can't deadlock the
  bracket).
- **Money**: entry 100g via `_escrowDebitGold` into
  `arena_entry:<tid>:<pid>` records; the champion's prize via
  `_creditPlayer` opId `arenapot:<tid>` (offline-safe). A deploy voids the
  tournament by design — the join-path sweep refunds orphaned entries,
  checking the pot's oplog stamp first (never refund over a payout).
  **Economics**: since v2.3.3178 the prize follows the bracket and the
  house's part of it is capped per hour — see "The champion's prize" below.
- **Healing disabled during matches** (`ps._arenaMatch`, set/cleared by
  activation/resolution): town HP regen (critical — 10% maxHp/670ms
  would make town fights unendable; HP only, stamina/mana still
  regen so blocking works), `eat_request`, shop `healFish`, and the cook
  heal buff are gated in index.js. Lifesteal needs no gate in v1 (town
  spawns no monsters).
- **Venue v1**: town + consent pairs — no new zone, no teleport (the
  server has no push-teleport and the anti-teleport gate rejects
  same-zone jumps). A dedicated non-lawless arena zone with zone-change
  teleport is the v2 path (handoff backlog).

## The champion's prize (v2.3.3178)

The prize was 2,000 for any bracket, so a 2-player tournament paid 2,000
for 200 of entries, and two accounts could run one every 2-3 minutes
(about 43,000 gold an hour). Accounts are free, so no rule about who may
enter can stop that; only a limit on the whole game can.

- The prize is `ARENA.PRIZE_PER_ENTRANT` (250) a gladiator in the bracket:
  8 → 2,000 (GDD §43's number, unchanged), 4 → 1,000, 2 → 500.
- The entries are its first `ENTRY_FEE` (100) each; the **house** adds the
  rest (150 a gladiator), out of at most `ARENA.HOUSE_GOLD_PER_HOUR`
  (3,600, three full brackets' worth) in any UTC clock hour, across the
  whole game. Past that the champion takes the entries plus whatever the
  hour has left, so a tournament never pays less than its entries.
- `_arenaPrize(entrants, now)` works it out synchronously at the crown, so
  `arena_tournament_complete` and the poll's `champion` carry the real
  `prize` (the game's champion box shows it; a worker from before sends
  none and the box shows 2,000).
- The hour's total is the storage key `arena_house` `{hour, used}`, read
  once at the first join after a start (`_arenaHouseLoad`) and saved
  BEFORE the pot is paid: a restart between them costs the hour some of
  its budget, never adds any. If the read fails the house adds nothing
  (the champion takes the entries) and the next join tries again.
- The most the arena can now make, all accounts together, is 3,600 gold an
  hour, and only with full 8-player brackets; two accounts make at most
  300 a tournament until the hour's 3,600 is gone, then nothing.

Tests: `arena.test.mjs` §4 (a 2-bracket pays 500) and §4b (the table, the
hour's budget and its reset, the save-before-pay order, the wire, a
restart, an unreadable total).

## Wire surface

HTTP (worker routes `/api/arena/*` to the GameRoom; old response shapes
preserved so PartyPanel's polling renders unchanged; mutating responses
carry `settled: true`):

| Endpoint | Behavior |
|---|---|
| `POST /join {playerId, playerName}` | escrows 100g; `settled: true` |
| `POST /leave {playerId}` | refunds (gathering only) |
| `GET /status` / `GET /tournament` | queue + bracket in the old sanitizeTournament shape |
| `POST /result` | **ignored** (`ok:false, settled:true`) |

New server→client events (PRIVILEGED): `arena_match_start {matchId, tid,
round, opponentId, opponentName, deadline}` (private to the two
fighters), `arena_match_result {tid, matchId, round, winner, loser,
how}`, `arena_tournament_complete {tid, champion}` (broadcast).
`state_sync.caps` gains `arena: true` — gates the client's legacy entry
debit/refund and round/champion self-credit. The Gladiator title stays
client-granted for now (titles aren't server-owned — handoff backlog).

**Sponsorship/betting is PR-B2** (stretch/backlog): `arena_stake:` escrow
keys settled on server-observed results -- since v2.3.3177 a pool, the
winning backers sharing the losing stakes (sponsorship.md).
The legacy `arena_bet` relay remains cosmetic display only.

Deploy-order note: old client + new worker still self-credits phantom
rewards locally (stomped by the echo) and its `POST /result` is ignored —
but the bracket advances server-side regardless, so mixed-version
tournaments complete correctly.

## v2.3.3171: three bracket fixes

Found by the overnight economy review (2026-10-12), each reproduced on main
in `arena.test.mjs` §12-§14:

- **No entries after the crown.** A finished tournament is kept 60 s for
  the game's completion poll, and `_arenaJoin` refused only a *running*
  one. A join in that minute took the 100 g and queued the player on a
  bracket nothing would start; the tournament was then dropped with no
  refund, and the sweep deleted the record because the pot was paid. Now
  only a *gathering* tournament takes an entry ("Tournament just ended").
- **One id per entry.** A leave refunded under `arenarefund:<tid>:<pid>`
  but the debit's stamp `arena:<tid>:entry:<pid>` stayed, so re-joining the
  same tournament was answered "already paid" and was free. The n-th entry
  of a tournament now debits and refunds with `:n` on both ids (the first
  keeps the old ids), and its `arena_entry:` record carries `n` so the
  sweep refunds the right one.
- **A whole round before any of it starts.** The next round was activated
  match by match as it was built, so a walkover in its first match resolved
  while it was the whole round so far, and crowned (and paid) its winner
  before the other semifinal existed. The round is now built first and then
  activated, as round 1 always was.
- **The fee and its record are one write** (v2.3.3185). The fee was taken in
  one write and the `arena_entry:` record -- what the restart sweep refunds
  from -- written in the next, so a restart between them (every server merge
  restarts the room) kept 100 g no record named. The fee, its oplog stamp,
  the record and the place in the queue now go out in one synchronous run
  (`arena.test.mjs` §15 crashes an entry at every write). Nothing is awaited
  between the purse check and the queue, so two quick presses can no longer
  both pass "Already queued".

## The champion's points, once (v2.3.3488)

Since v2.3.3481 the champion is paid `ARENA.CHAMPION_AP` 500 achievement
points with the gold. Paid on every win, two accounts in a 2-player bracket
could crown each other in turn for 500 a tournament. Asked whether to pay
every win or a character's first, the owner: "I don't want anyone exploiting
the achievement points from it."

- **The mark.** `ps.apOnce.arena = 1` the first time a character is paid the
  champion's points. It is its own record, `aponce:<pid>` (handoff rule 1: a
  new thing to keep never goes into the character's `rpg:` save). It is
  written by `_saveRpg` in the same synchronous run as the save holding the
  points (persistence.js, `ps._apOnceDirty`), so a crash keeps both or neither.
  It is read at the join BEFORE the mail is delivered (inbox.js
  `_apOnceLoadOnJoin`), through `cleanApOnce`, which keeps only the names in
  `AP_ONCE`. A read that fails pays no once-points that session
  (`_apOnceFailed`, the crown too) and never writes the record.
- **The crown.** `_arenaCrown` gives a champion who already holds the mark the
  gold alone: no `ap` on the crown, its event or the credit.
- **The payment.** The credit carries `apOnce: 'arena'`. inbox.js
  `_applyCreditToPs` pays the points only to a character not yet marked, and
  marks it in the gold's own apply. So a prize that waited in the mail decides
  when it is delivered, and two waiting prizes pay the points once. The gold
  is always paid.
- **The window** says "500 AP for your first win" against a worker advertising
  `caps.arenaapfirst`.
- A character who won before v2.3.3488 holds no mark, so their next win pays
  the points once more.
- A character restart starts with no points and no mark (`_resetCharacterData`
  deletes `aponce:`), so nothing is gained by it.
- An owner's restore of a daily snapshot (`rpgsnap:`, the save alone) puts back
  the points of that day but keeps the mark: a restored winner is not paid
  again.
- Kill switch `arenaap: false` still pays no points at all.

## The points become the Gladiator achievement's (v2.3.3527)

With achievements (docs/specs/achievements.md) the champion's 500 are the
Gladiator achievement's, once a character:

- The crown pays its gold with no `ap`, and sends the achievement as its own
  credit (`kind: 'achv'`).
- The mark above stays the one word on whether a character was paid the
  arena's points (achievements.js `AP_ONCE_OF`). The achievement pays only
  while it is unset, and sets it when it pays, saved with the points.
- A champion this section's road paid gets Gladiator at their next join,
  quietly and with no second 500.
- A crown of either older kind still waiting in a mailbox goes through the
  achievement.
- With `achievements: false` no crown pays AP, and `caps.arenaap` and
  `caps.arenaapfirst` say so.
- The window names the Gladiator achievement against `caps.achievements`, and
  "for your first win" against a v2.3.3488 worker.

## Tests

`server/test/arena.test.mjs` (23+ assertions, in `npm test`): entry
economics + double-join/broke rejects + idempotent leave refund,
undersubscribed cancel, overflow refund, duel-tagged activation with
consent pair + flags + private start events, server-kill resolution →
champion pot → entry cleanup → events → flag clears, concurrent 4-bracket
with timeout tiebreak and offline walkover, sweep orphan refund +
paid-pot protection, (post-wiring) the healing gates, and since v2.3.3171 the
late-join refusal, the paid re-join and the 8-bracket walkover (§12-§14).
