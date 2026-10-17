# The alliance: a party of 20 active bros (v2.3.3313)

Step 2 of the party → alliance plan (docs/specs/party.md, "A party that
lasts"). The owner: *"I think I'd rather skip clans altogether and just go from
party to alliances. Maybe it just gets called "party" that stays persistent
until you remove yourself from the party and it becomes "alliance" at 20+
people which opens up the new features you're talking about"*, then *"Go
recommended"* to the plan, and, after step 1 merged, *"Push to main, then keep
going on recommended"* to the four decisions step 2 waited on:

1. **Wars** are fought in No man's land under its existing rules, last 30
   minutes, and pay only the members who fought.
2. **Name and tag** are free for an alliance: the leader sets them, can change
   them once a day, and both are unique across alliances and clans.
3. **The tag shows** for an alliance (former clans, step 3, keep theirs below
   20 but change it only at 20).
4. **The leaderboard** ranks alliances by active members, then total level.

Code: `server/src/alliance.js` (the worker), `src/game/alliance.js` (the
phone's copy of the worker's answers), `src/ui/panels/buildings/AlliancePart.jsx`
(the Saloon). Tests: `server/test/alliance.test.mjs`, `tools/qa/mp/mp-alliance.mjs`.

## What an alliance is

A party (stored, up to 50: party.md) whose **active members** reach
`ALLIANCE.AT` 20. It stays an alliance until they fall below `ALLIANCE.DROP`
15, so a party hovering at 20 does not flicker between the two.

An **active** member has played in the last `ALLIANCE.ACTIVE_MS` 7 days (online
now, or their `seen` in the party record) and is level `ALLIANCE.ACTIVE_LEVEL`
5 or more (the character level, `ps.level`: the three combat skills added up,
3 for a new character). So 20 brand-new alts, or 20 names nobody plays, are not
an alliance.

The count is taken when something could change it: a member's join, a member
joining or leaving, a rename, a war's declaration, and the party's vitals echo
(every 2 s while someone in it is on: a member reaching level 5 mid-visit, or
one going stale). Never by an alarm: a party nobody is on changes at its next
join (handoff rule 12). A flip is the only write.

Nothing else about the party changes: it is still a party (the strip, the
chat, dungeons four at a time). The alliance adds:

- **a name and a tag** (`alliance_name {name, tag}`, the leader's, only while
  it is an alliance): 3-16 characters (control, zero-width and
  direction-changing characters stripped, spaces folded) and 1-4 letters or
  numbers, upper-cased. The first is free; a change waits `ALLIANCE.RENAME_MS`
  24 h from the last. Both unique, the name in any case, across every alliance
  -- named, whether an alliance now or not: a name is kept while its party
  lasts -- and every clan; a clan's creation is checked against the alliances
  too (clans.js). The tag shows as `[TAG]` before the name on every member's
  name plate, while the party is an alliance.
- **wars** (below);
- **a board** (`alliance_board`): every alliance by active members, then their
  levels added up, then the oldest; the top 20 and yours.

When it falls below 15 it is a party again: the tags come off, it cannot be
renamed or fight, and its name and tag stay reserved; at 20 active again it is
the same alliance.

## Wars

`alliance_war {tag}`: the leader of a named alliance declares war on another
alliance, by its tag.

- Both must be alliances now (the other one counted from its stored record when
  nobody of it is on), neither at war, and neither may have ended a war in the
  last `ALLIANCE.WAR_COOLDOWN` 1 h -- the rest is read back from the ended wars
  after a deploy.
- It lasts `ALLIANCE.WAR_MS` 30 minutes. The two rosters are frozen at the
  declaration (anyone already on another war's roster stays on that one only);
  who joins after does not fight in it.
- **A war kill** is a kill under No man's land's rule -- the victim's last blow
  came through it, from the killer, within `NML.KILL_BLOW_MS` (nomansland.js,
  the test `_nmlOnDeath` makes) -- by a member of one roster still in that
  party, on a member of the other still in theirs. No man's land's rules are
  unchanged: who may fight whom, the skulls and what a death costs are all as
  before. A duel's kill never comes here (index.js `_handlePlayerDeath`).
- At the end the side with more kills wins. The roster members who **fought**
  (made or took a war kill) and are still in the party are paid: 500 gold to
  the winners, 50 to the losers, 50 to both sides on a draw; 0-0 pays nobody
  (the clans' v2.3.3180 rule). Paid by `_creditPlayer`, opId
  `allywar:<warId>:<pid>`, so a restart mid-payment pays the rest and nobody
  twice; each member online is told (`alliance_war_end`).
- A war ends on the tick, or at the next look after the room was empty
  (`_allyEnsure`, rule 12).

## Storage

| key | value |
|---|---|
| `party:<id>` | the party record (party.md), plus `ally` once it has been an alliance: `{on, since, name, tag, renamedAt}`; such a record is stamped `v: 2` |
| `ally:<partyId>` | the board's row: `{v, id, on, name, tag, since, members, act}`, `act` each member who could count as `[seen + 7 days, level]`, latest first -- so the board counts an alliance nobody is on without reading its record, and one whose members all stopped playing falls off by itself |
| `ally_war:<warId>` | a war, while it runs and for `WAR_RETENTION` 48 h after |

The row is written WITH the party record (party.js `_partyStore`, the same
synchronous run, so one write batch) and deleted with it: a party that ends
frees its name. An online member's level is refreshed into the record when it
is written, so the row's levels are current.

A record with `ally` is `v: 2`; an older worker leaves it whole and its members
unknown (party.md: "a newer `v` is left whole"), never a party that forgot its
name. A record with no `ally` stays `v: 1`, so a rollback reads every party
that never was an alliance.

## Wire

| direction | type | payload |
|---|---|---|
| c→s | `alliance_name` | `{name, tag}` |
| c→s | `alliance_war` | `{tag}` |
| c→s | `alliance_board` | `{}` (one answer every 5 s a player at most) |
| s→c | `party_state` | + `ally: {on, name, tag, since, active, at, drop, renameIn, warIn, war}` while the alliance is on (`war`: `{us, them: {tag, name, score}, endsIn, fought, kills: [{k, v, mine}]}` or null); each member `act: 1` who counts; and the moments `became: 'alliance' / 'party'`, `renamed: 1`, `war: 'start' / 'kill' / 'end'` |
| s→c | `alliance_rows` | `{rows: [{name, tag, active, total, members}], n, mine: {rank, ...} \| null}` |
| s→c | `alliance_error` | `{reason, ...}` -- `off`, `no-party`, `not-leader`, `not-alliance` {active, at}, `bad-name`, `bad-tag`, `rename-wait` {ms}, `not-loaded`, `tag-taken` / `name-taken`, `no-name`, `self`, `no-such`, `not-alliance-them`, `at-war`, `them-at-war`, `rest` / `rest-them` {ms} |
| s→c | `alliance_war_end` | `{won: true \| false \| null, us, them, vs, paid}` |

The three answers are PRIVILEGED and the phone reads them in wsClient's direct
switch (a worker from before the alliance would relay forged ones).

The tag reaches everyone as the player key `allyTag`: set by the worker alone
(`_allySetTag`), on no track or join list so no phone can send one, in the
snapshot (index.js `PEER_PUBLIC_KEYS`) and the far players' list entries
(nearjoin.js `LIST_KEYS`); a change goes out as a `player_update` carrying the
build keys (`hg`, `fr`) the phone resets from every player_update, and a
member's join tells everyone again (every phone has just made a fresh copy of
them).

`caps.alliance`; kill switch `alliance: false` (no status, names, wars or
board -- every request answered `off` -- and the tags come off at the next
vitals echo; a running war stands still until it is back; the records keep
their alliance). It needs the stored party (`partykeep`): with
`partykeep: false` it is off too. A party that ends still deletes its row.

## On the phone

- **The Saloon** (WheelHallPanel.jsx SaloonPanel, at its top): not yet an
  alliance, "n/20" and a bar, and what an alliance gets; an alliance, its
  `[TAG] Name` (or "Unnamed alliance") and active count, the leader's name and
  tag form (Rename once a day), its war -- the score, the minutes left, the
  last kills -- or the leader's Declare war (their tag); a refusal in red; and
  the Alliance board for anyone.
- **The strip** (PartyHUD.jsx) heads `[TAG] 22/50` (ALLIANCE before it has a
  name) where it said PARTY.
- **Name plates** read `[TAG] Name`, yours from your party's `ally`, everyone
  else's from their `allyTag` (entityRenderer `plateNameWithTag`).
- The moments are said over you and in the chat: "Your party is an ALLIANCE
  now!", a party again, the name, a war's start, each war kill's score (over
  you only), and a war's end with what it paid you.

The test lever `/dev/combat {skill | 'all', level}` (devtools.js) sets a combat
level -- the alliance counts level 5 and up, and its phone check raises 39 bots
there.

## Step 3: clans become parties (v2.3.3321)

The owner's plan, approved with the rest ("Go recommended"), built after step 2
merged. `server/src/clanparty.js`; the phone's side in `src/game/alliance.js`
(`clanPartyOn`) and the clan windows.

- **No new clans.** `clan_create`, `clan_join_accept` and `clan_war_declare`
  are answered `clan_error` "Clans are parties now: make a party in the
  Saloon" (before anything is checked or charged), and a `clan_invite` is no
  longer relayed (index.js) -- an old phone's card would invite to a clan that
  can no longer be joined.
- **Every clan becomes a stored party, once** (`_clanPartyConvertAll`, from
  `_clansEnsure`, which every join awaits -- so at the first join after the
  deploy): the clan's members in no party yet (in memory, by their stored
  `party_by_player:` index, or unknown after a failed read) form one; the
  clan's leader leads if they are among them, else its oldest such member. A
  member's name is the room's for someone online, else their `char:` record's,
  else "Bro"; an online member counts toward 20 from now, the rest from their
  next join (`seen` 0, level 1, as the worker cannot know). The party carries
  the clan's name and tag as its `ally` with `clan: 1` (`on: false`). The
  clan's records (`clan:`, `clan_by_player:`) are deleted in the SAME
  synchronous run as the party's writes (`party:`, `party_by_player:`,
  `ally:`), so storage holds one or the other, never both and never neither.
  A member already in a party keeps theirs; a clan left with fewer than two
  free members is no party, its records simply go and its name and tag are
  free. The clan is taken out of the registry before its own name and tag are
  checked against the alliances' (found by the suite: left in, every
  converted party lost its tag to itself). One-way, and what a party has no
  place for goes with the clan's record: its two colours (the tag's colour on
  a player's card, `clanColor1`) and its logo (drawn in the clan window only);
  its leader's 500 gold founding fee is not given back. A clan holds no gold,
  and its wars need the old lands, which are closed.
- **Whoever is online is told at once**: the clan's tag comes off every screen
  (clans.js `_clanUntag`, the tail of `_clanRemoveMember`), the party's tag
  goes on (`_allySetTag`, forced), and the members get `party_state` with
  `fromClan: 1` -- "Your clan [TAG] is a party now: 20 active members make it
  an alliance" over them and in the chat.
- **A clan at war waits for its war's end**: `_resolveClanWar` marks the two
  clans (`_clanRestPending`) until its own writes -- their rest, the payments
  -- are done, then converts them (`_clanPartyAfterWar`); converting first
  would let the war's `clan:` put bring a deleted clan back.
- **A former clan wears its tag below 20** (decision 3): `_allyTagOf` gives
  the tag while `ally.clan`, an alliance or not; the strip's head reads
  `[TAG]` (`data-party-head="clan"`); the record keeps `clan` through becoming
  an alliance and back; it can be RENAMED only as an alliance (20 active),
  like any other, and its name and tag stay reserved while the party lasts.
- **The phone** (against `caps.clanparty`, beside `caps.partykeep`): the clan
  window (wherever it is opened), the dashboard's Clan page and the Guild
  Hall's clan row say "Clans are parties now" and their Find a party opens the
  player list (`__broLegacyUI.playersOpen`, where a party starts: a player's
  card, Invite to Party); a player card's Invite to Clan is gone; the Saloon's
  Alliance part names a former clan ("Your clan is this party now"); the
  inspect card, profile and leaderboard show the worker's `allyTag` first,
  a clan tag only after it.
- **The kill switch** `clanparty: false` (also off with `partykeep: false`, as
  a party could not be stored): no conversion, clans as they were (create,
  join, wars), no `caps.clanparty`. A clan already turned into a party stays
  one. The live flags are loaded before the conversion looks at them (found
  by the suite: a join reaches the clan registry before it loads the flags,
  so a room's first join converted under the switch -- on a real worker the
  socket's way in loads them first, so it never happened there).
- `clan-party.test.mjs` (54 checks; 13 broken rules each caught),
  `mp-clanparty` (a real phone: a clan founded under the switch, turned into a
  party when it comes off, every window). `clans.test`,
  `duel.test` §16, `alliance.test` §5/§10, `mp-clan` and `mp-wheelhalls` run
  under `clanparty: false`, proving the switch keeps clans as they were.

## Not in this step

- An alliance chat apart from party chat (the party chat already reaches every
  member), shared storage, territory.
- War kills drawn on the map, a war's own banner art.
