# What the other players are told about you (v2.3.3214)

> Owner, 2026-10-13: *"Go recommended but I want you to stress test to see
> what can be optimized."*

## What the stress test found

The reconnect storm (`load.mjs --storm`, below): a worker deploy or a blip in
the network drops every phone at once, and each comes back a second or so
later. At 120 players everyone was back in the world within 6 s, and each
join's snapshot of the room (`state_sync`) was **142 KB half the time, 295 KB
at most**, for bots with nothing in their bags.

What was in it: each other player as `{...playerState, name, ...session.data}`
(index.js `getAllPlayerData`), their WHOLE server state:

- coins, gold bars and nuggets;
- the bag, and every stash: weapons, armour, gear, shields, amulets, greaves;
- quests, life skills, buffs, points, stats, prog3;
- the anti-cheat's own histories (`_cookHistory`, `_perfectHistory`);
- and the join's `rpg*` claims: the phone's coins, bag, life skills and
  weapons as it saw them. `player_join`, sent to every phone when anyone joins,
  carried those claims too.

No phone reads any of it. A peer is drawn from its position, name and look
(wsClient.js `state_sync` and `player_join`, `src/networking/peerCosmetics.js`).
And it was a leak with a game in it: in No man's land the victim's bag goes to
the killer (nomansland.js), so anyone reading their own socket could see who
was worth hunting.

## What changed

The two messages now carry each player's **public** keys only
(`PEER_PUBLIC_KEYS` and `_peerPublic` in `server/src/index.js`):

- what the look relay already sends everyone (`TRACK_COSMETIC_KEYS`): name,
  look, drawings, the gear on show, the level and HP the phone shows, the
  inspect card, cape, mask, pet, clan tag;
- the join's look (`JOIN_COSMETIC_KEYS`);
- what every tick says about everyone (tick.js `playerWire`): position,
  facing, zone, speed, what they are harvesting, the Hemi Bro badge.

It is an allowlist. A field added to `playerState` later stays private until
it is put on the list on purpose (docs/TRAPS.md §174). Which copy wins is
unchanged: the phone's look over the state, the session's name over the
state's.

Nothing changes on the phones: they read a subset of these keys, from any
worker, so no caps flag is needed.

## Measured

**One player as the others are told** (in-process, `peer-view.test.mjs` and
a probe with a real phone's look from `track-sample.json`):

| | before | now |
|---|---|---|
| a brand-new character, no look | 2,329 bytes | 94 bytes |
| a played character (a bag of 25, 12 stashed pieces, 12 quests) with a real phone's look | 4,595 bytes | 948 bytes |
| 24 played characters in one snapshot (the test) | 65 KB | 9 KB |

At 120 real players a join's snapshot drops from about 550 KB to about
115 KB, unzipped.

**The reconnect storm at 120 players** (`load.mjs --steps 120 --diet --track
--storm`, with #895, #897 and #898; the bots carry no look at the moment they
rejoin, so the snapshot here is mostly what was private):

| | before | now |
|---|---|---|
| each join's snapshot, half / at most | 142 / 295 KB | 8 / 17 KB |
| a join (socket open to its snapshot), 95% / at most | 611 / 649 ms | 240 / 302 ms |
| into the world, 95% / at most | 219 / 257 ms | 98 / 109 ms |
| everyone back in the world | 6 s | 5 s |
| the room's thread, busiest second (one run each, noisy) | 88% | 94% |

The room is as busy as before during the storm: the joins' work is the
runtime's (one message each way per join) and the bots' moves, not the
snapshot's size. The snapshot is what the phone waits for, and that is what
got shorter.

## The reconnect storm, as a tool

`node tools/qa/load/load.mjs --steps 120 --storm [--storm-max 90]`: after the
last step, every bot drops its socket at once and comes back after 1-3 s, as a
phone does. It prints how long until half, 90% and all of them are back in
the Wheel, how long a join takes, how big each join's snapshot is, and the
room's thread each second. The bots' ids have no stored record, so this is the
network blip, with the room warm. A deploy's cold room, which reads every
player's record from storage again, is not measured.

## Tests

`server/test/peer-view.test.mjs`, 14 checks:

- a played character, as another phone's join is told: every key public; none
  of the purse, bag, stashes, quests, skills, the anti-cheat's notes or the
  join's claims; all of what they are drawn with; the inspect card whole;
- every one of the 54 keys a phone reads on the snapshot road (wsClient.js's
  peer literal, `PEER_COSMETIC_FIELDS`, `PEER_PASSTHROUGH_FIELDS`) still goes
  out when set;
- `player_join` for a character on file: the look and the level it shows, none
  of the claims (the test first checks the room really holds them, so the
  broadcast is what is tested);
- the phone's look still wins over the state, as before;
- the snapshot of 24 played characters is 86% smaller.

Three bugs put in on purpose (the old snapshot, the old `player_join`, the
state winning over the look) each fail it. `gearprov.test.mjs` §8 now says the
worn objects and stashes are not on the snapshot at all, where it used to say
the gear-id crop had kept them.
