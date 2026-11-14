# The gatekeeper's review, sitting 15 (card Z; tag 5372)

Taken 2026-11-14 on `main` at d6b8acd (tree 9bff337a, sitting 14's list
merged, exactly its rehearsed tree). Tags in this file are written bare.
Each new PR that changes `server/` or `src/` had a finder read the code
around its diff (the angles of `/repo-review` that apply), re-try its break
proofs and try to disprove what it found; the gatekeeper re-read every mend
pushed since sitting 14 itself. Documents and tools got step 3.

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or a reading). PLAUSIBLE: the code does it, what sets it
off is unproven (it says what would settle it). The probes are not in the
repository.

(A DRAFT: the reviews and the rehearsal are running.)

## Card L: #1824 (PR 5's second, tag 5211): re-read

Reviewed clean at sitting 14 (80a7237). Since then: `main` d6b8acd merged
in (both `DOOR_SUITES` rows kept, card O's ladder and the duel), and
sitting 14's low mended: the gladiator.js exception is now ` t.status = `
(a space first) in both duel-door.test and the phase guard, so
`mt.status = ` no longer passes. The two writes it names are
gladiator.js 373 and 852. Nothing else in L's files changed (diffed file
by file against 80a7237's own diff).

## Card K: #1829 (PR 5, tag 5185): re-read

Reviewed clean at sitting 14 (c096522). Since then (c0042a9): `main`
0da805c merged in, and sitting 14's two lows mended:

- `item_drop` and `report` are `body: 'top'` rows; the guard's new 2b
  fails a direct send written with its fields at the top whose row is not
  `body: 'top'` (its break proof 5: `item_drop`'s taken off).
- The teardown calls `setActionTransport(null)`; `act()` with no
  transport returns false (nothing leaves).
- Nit, PLAUSIBLE, not live: the teardown clears the transport whoever set
  it; if a second set-up ever ran before the first's teardown, the new
  one's would go. Nothing calls `act()` until K's PR 7, where comparing
  before clearing settles it.

## Card K: #1831 (PR 2, tag 5182): reviewed

**The worker's other lists made from the wire table (it DEPLOYS; no cap,
no flag), read at cfe57ce: clean (nits).** A finder loaded each list from
`main` 0da805c's modules and from the head's in node and compared them
exactly: `FIGHT_LOCK` 38 rows (each `sw`, `at`, `when`, `refuse`
identical), `FIGHT_GATED` 20, `FIGHT_OPEN` 134 (0 reasons differ),
`ROOM_PLACED` 10, `RELAY_PLACED` 8, `EVENT_PLACED_TYPES` 18,
`SOCIAL.TYPES` 2, `MUTABLE_RELAY_TYPES` 3, botsig's wrapped hooks 8;
`PRIVILEGED_EVENTS` 163, `RELAY.TYPES` 26, the echo list 9: identical
(VERIFIED). fightlock.js's `_fightLockSwitchOff`, `_fightLockHolds` and
`_fightLockGate` are the same code, so `LOCK_SWITCHES` reads the same
names with the same default. Every table row is unchanged but its six new
columns. Key order differs in four lists; every consumer reads by a Set
or an own-property check (DISPROVED as a risk). `__proto__`,
`constructor`, `toString`, `hasOwnProperty`, `prototype` through
`placeOf`, `FIGHT_GATED`, `_fightLockGate`, `SOCIAL.TYPES`,
`MUTABLE_RELAY_TYPES`: null or false (§4). Every list is built once at
load; the router still pays one Set lookup. Worker +137,549 bytes
(+19,742 gzipped; an esbuild bundle of both trees), as the PR says.

- Nit, VERIFIED: `server/src/wire/README.md` ~307 names a switch
  `fightlockgear` that does not exist (the six are `fightlock`, `fightlocktable`,
  `fightlockequip`, `fightlockarmor`, `fightlockdoor`, `fightlockreset`).
- Nit, PLAUSIBLE: the guard's §7 holds a hand copy of today's lists (the
  card takes it out in K's next list PR). Of eleven one-column breaks the
  guard fails all eleven with §7; without it, the guard catches 2 and the
  server suites 7 more, and nothing catches `dice_roll`'s `placed` losing
  `who` or an open reason renamed. A check per placed field (§8 or §9)
  before §7 goes would settle it.
- Suites: 33 that name these files, green (fight-lock 135, event-place
  37, botsig 66, chat-guard 151, chatmod 63, dice 70, emotes 124, relay
  53, wire-audit, wire-hostile, refusal-door, test-mode, hardening;
  guards wire-table 38, switches, switches-thrown). CI `test` green at
  cfe57ce.

## Card L: #1835 (PR 5's third, tag 5212): reviewed, listed right after #1824

**The party door (it DEPLOYS; a live flag), read at b54ff10 (its own diff
over #1824's head, which it carries): clean (lows).** A finder matched
all seven old writes of `_partyByPlayer` on `main` (party.js 239, 280,
497, 501, 543, 551; clanparty.js 161) to their `_partyIn` calls: each in
the same place against the members list, `_partyIndexPut` /
`_partyIndexDrop`, `_partyStore` and the broadcasts. At every write that
puts a player in, the player is already on `p.members` (the live case
checks `includes` first, the load walks `p.members`, a new party starts
`[inviter]`, the accepter is pushed before the write, the clan party is
`members: free`), so the door's check refuses nothing today (VERIFIED);
a refusal returns false, no throw. A character reset, a kick of an
offline member and the idle sweep all go through `_partyRemoveMember`
(`leave`). No await (rule 9); the field is a `Map`; `PARTY_WAYS` is
frozen and read by own property (`__proto__`, `constructor`,
`hasOwnProperty`, `valueOf`, `toString` refused; those as ids are Map
keys) (§4). `partydoor` reads as `dueldoor` and `tradedoor` do: on when
missing, an inherited flag ignored, and read only on the refusal path;
with it false, main's behaviour for every input that can arrive. The
guard's new Map branch adds no miss and no false alarm (9 doors green).

- Low, VERIFIED: the births are matched by text, `this._partyByPlayer =
  new Map()`, so an unconditional new map anywhere in party.js or
  clanparty.js (say in `_partyOnReset`) passes the guard (~261) and the
  suite's `BIRTHS` (§2), and would drop every online player's place
  while their parties still list them. The finder pinned the text to
  `if (!this._partyByPlayer) this._partyByPlayer = new Map()` in a
  throwaway copy: the head stays green and that break fails both. The
  same kind as sitting 14's gladiator low; for L's next door.
- Nit, VERIFIED: `this._partyByPlayer?.delete(id)` and a write through an
  alias (`const m = this._partyByPlayer; m.set(...)`) pass both checks
  (server/src has no `?.` on a Map today).
- Nit: the spec and `PARTY_WAYS`' comment give `leave` as a leave, a kick
  or a restart; the idle sweep's `offline` removal uses it too; "two
  births" where the code guards three.
- Same as `main`, not new: `_partyLoad`'s "a member already in another
  live party keeps it" can leave the map and a list apart, as before.
- Suites: party-door 28, duel-door 25, party 73, party-keep 63,
  party-chip 25, party-marks 19, party-same 9, clan-party 54, clans 82,
  alliance 96, grotto-party 31, liveops 110 (each the same count as
  `main`'s where it has one); guards phase-table (28 `todo`, the line
  30), switches (477 rows), switches-thrown, keep-switches green. Break
  proofs: the PR's two (the accept's `set` back; a `delete` in a new
  alliance.js function) FAIL both; a guarded new map in alliance.js, the
  clan line in its old form and `this['_partyByPlayer'].set` each FAIL
  one or both. CI `test` green at b54ff10.
- Its phone runs, in its words: `partykeep` 11 of 11, `clanparty` 21 of
  21, `questline` 187; `partychip` 14 of 15 (main 14 of 15, another
  check) and `alliance` 16, 14, 9 of 16 on `main` too (L's Found).
