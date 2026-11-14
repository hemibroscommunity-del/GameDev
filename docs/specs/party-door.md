# The party door (v2.3.5212)

`server/src/party.js` (`_partyIn`, `PARTY_WAYS`); held by
`server/test/party-door.test.mjs` and the phase table's guard
(`tools/guards/phase-table.test.mjs` §2, its `DOOR_SUITES` line, read off the
syntax tree; since this door, a Map's own `set`, `delete` and `clear` count
as writes). Card L PR 5's third worker door, after the trade door
(`docs/specs/trade-door.md`) and the duel door.

## What it is

- **One field.** A player's place in a party is their entry in
  `this._partyByPlayer`: the party they are in, or none.
- **One writer.** `this._partyIn(pid, p, way)`. Each way in `PARTY_WAYS`
  goes to its own place:
  - `load`: read back from storage at a join (`_partyLoad`);
  - `join`: an accept, which puts in both the inviter of a new party and the
    accepter (`_handlePartyAccept`);
  - `clan`: a clan becoming a party (`clanparty.js _clanToParty`);
  - `leave`: a leave, a kick or a character restart (`_partyRemoveMember`);
  - `disband`: the last member of a party that ends (`_partyRemoveMember`).

  The first three take the party; the last two take `null`.
- **A member always stands in the party's own list.** The door refuses a
  party whose `members` does not name the player. The map and the records
  cannot drift apart through the door.
- **Not folded here:**
  - an **invite**: a key of `_partyInvites`, with its own TTL;
  - the **leader**: the party record's own pointer, `p.leader`, handed on
    by the removal and the idle sweep;
  - **away**: a member whose body is offline, read off `playerState`
    (partykeep).

## Step 1: nothing a player sees changes

Every old line either wrote a member who was already on the party's list
(the load reads its members from the list; the accept pushes the accepter
first; a new party starts with its inviter; the clan's party is its free
members), or took out one who was already off it. So the door's check never
refuses anything today. The party, clan and alliance suites pass unchanged.

## The switch

`partydoor: false` in the live flags lets `_partyIn` put in a member the
party does not list, as the old lines could have. It never lets a way go to
the other place. The worker's row is in card T's switch table.

## What the test fails

- a `set`, `delete` or `clear` of `_partyByPlayer`, or a new map for it,
  anywhere in `server/src` but `_partyIn` and its two births (an empty map
  before a load, an accept or a clan fills it);
- a stale birth;
- a way with no caller, or a caller of a way the table has not got.

It also plays every way through the real room, a deploy's reload included,
and after each checks that the map and the parties' own lists agree.
