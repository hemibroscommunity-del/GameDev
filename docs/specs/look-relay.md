# A player's look is relayed when it changes, not every 2 s (v2.3.3220)

> Owner, 2026-10-13: *"Go recommended but I want you to stress test to see
> what can be optimized."*

## What the stress test found

Every phone sends `track` every 2 s, whether anything changed or not
(`src/ui/BroTown.jsx`). It carries:

- the whole look: hair, clothes, gear, drawings;
- level and HP;
- the weapon;
- the inspect card's stats.

That is 39 fields, about 940 bytes for a new character
(`tools/qa/load/track-sample.json`, caught off a real phone by
`mp-trackcapture`), and up to 256 characters more for each drawing.

The room relayed **every one to every other player in the room, as a message
of its own** (`player_update`, `server/src/index.js` case `'track'`), each
compressed for each socket:

- that is N(N−1)/2 sends a second: 7,140 at 120 players;
- that is more messages than all the ticks;
- each phone was sent 60 relays a second, 57 KB/s unzipped, at 120 players.

**The load test's bots never sent `track`.** So every capacity number before
this version left it out, including "smooth to about 145" (#891) and the reason
the cap went to 120 (#893). With the bots sending a real phone's look every 2 s
(`load.mjs --track`):

| Players | 60 | 100 | 120 | 150 | 200 |
|---|---|---|---|---|---|
| without `track` (as measured before) | 41.6 | 41.3 | ~39 | 32.2 | 15.5 |
| with `track` (what phones really send) | 41.5 | 36.3 | **25.8** | **4.6** | **no ticks at all** |

That is the world's speed, in ticks a second (45 at most; 33 and up is
smooth). With the relay counted, the room was smooth only to **about 105
players**, and the cap of 120 was past it.

## What changed

The phones already MERGE a relay. `wsClient.js` case `'player_update'` writes
only the keys a relay carries and keeps the rest (`Object.assign`, then
peerCosmetics' delta semantics, v2.3.1961). So most relays told every phone
what it already had.

Now `server/src/lookrelay.js` relays only what changed since this player's
last relay, and only when something did:

- **`x`, `y` and `dir` never send a relay on their own.** The ticks carry where
  everyone stands and which way they face, and the 1 Hz roster carries
  everyone. They still ride along in a relay that goes, as before.
- **Nor does HP** (`rpgHp`, `rpgMaxHp`, the LAZY keys).
  - It changes on every hit: in a fight, every 2 s.
  - The health bar over another player is armed and fed by the worker's own
    PvP hits (`gameEvents.js`, `_hpSeenAt`), not by this relay.
  - So here it only feeds the inspect card. It rides along with the next relay
    that goes for another reason, and with every whole copy: at most a minute
    old.
- **Nor do the inspect card's counters** (LAZY_IN: `rpgData`'s `kills`,
  `svKills`, `goldEarned` and `playtime`), which change on every kill and every
  minute and which only the card shows. They ride along the same way.
- **The rest of `rpgData` is news, relayed whole at once.** The phone draws a
  peer's slung shield and block pose from `rpgData.shield` (entityRenderer),
  and the equipment sheet and clan lists read its gear and clan names.
  - The first cut of this change held ALL of `rpgData` back. A shield put on
    or taken off could then take up to a minute to show on everyone else's
    screen. Found reading every use of `rpgData` before merging; the property
    test now changes the shield and the weapon too, and fails on that cut.
- **`hg` and `fr` (height and frame) go in every relay that has them.** The
  phone sets a peer's build from each relay unconditionally, so leaving them out
  would put everyone of another build back to average. Going back to average
  (the key gone) is itself news.
- **A key that disappears sends nothing**, as before. A whole relay that left a
  drawing out never rubbed it out on anyone's phone either.
- **Every minute (`FULL_EVERY_MS`) the whole look goes again.** A phone that
  missed one (a tab suspended through a join, v2.3.1112) still catches up, in
  a minute instead of 2 s.

Each join or rejoin starts a new session, whose first relay is whole, and
every joiner gets everyone's whole look in its `state_sync`. So a delta always
lands on a whole look.

**Server only, so it can be deployed before or after the phones:** an old
phone merges a delta exactly as a new one does. **Kill switch:**
`lookdelta: false` in the live flags relays every track whole again, from the
next one. `/dev/overview` shows `lookRelay`: the tracks that came in, and how
many went out whole, as a delta, or not at all.

## What the others see

`server/test/look-relay.test.mjs` (29 checks):

- the rule on its own;
- a room: the same look twice relays once, a change relays only the change, HP
  alone relays nothing and rides along with the next, a whole copy every
  minute, the kill switch, a rejoin starts whole;
- a key that went and came back (a clan left and rejoined) is relayed;
- a shield put on or taken off, or a new weapon's name, relays `rpgData` at
  once; its counters alone relay nothing and ride along with the next;
- a property test: **24,000 tracks of random looks** go through a copy of the
  phone's merge both ways, one phone sent every track whole and one sent what
  the rule lets through.
  - What changes between tracks: walking, HP, kills, minutes played, gold, the
    shield, the weapon, stat points, gear, the under-shirt, a build, drawings
    coming and going, the zone, the away flag, a clan joined or left (with the
    leave's own clear).
  - After every track the two phones hold the same player, key for key, apart
    from where they stand, and apart from HP and the card's counters until the
    next relay goes. What may lag is written in the test itself, not read from
    the code under test.
  - 26% of those tracks still relayed: this test changes a lot on purpose.
  - Breaking the rule eight ways each fails it: no build keys in a delta, no
    news when a build goes, the zone riding along, HP never riding along, all
    of `rpgData` held back, none of it held back, its counters never riding
    along, only the shield counted as news.

## What it does for a crowd

The real runtime with `--track --diet`, 30% fighting. The fighters' HP and
kill count move on every track, as a real fight's do:

| Players | 60 | 100 | 120 | 150 | 200 |
|---|---|---|---|---|---|
| before (every track relayed whole): ticks a second | 41.5 | 36.3 | 25.8 | 4.6 | none |
| before: the thread busy | 60% | 90% | 96% | 97% | 97% |
| before: relays to each player a second (unzipped) | 30 (28 KB/s) | 49 (47 KB/s) | 60 (57 KB/s) | 75 (72 KB/s) | 73 (70 KB/s) |
| **after: ticks a second** | **41.7** | **40.8** | **38.3** | **31.7** | **17.4** |
| after: the thread busy | 48% | 76% | 87% | 96% | 98% |
| after: others' moves seen, half the time | 15 ms | 22 ms | 33 ms | 50 ms | 61 ms |
| after: a new player's first snapshot | 34 ms | 48 ms | 88 ms | 200 ms | 322 ms |

- **Smooth (33 ticks a second or more) to about 145 players again, with the
  looks counted.** Without the change, the same traffic stops being smooth at
  about 105.
- **The room does what it did when the bots sent no looks at all** (#891's ramp:
  41.3 at 100 players, 32.2 at 150).
- A first version (deltas only, HP still sending a relay of its own) reached
  32.1 ticks at 120 and 19.3 at 150: the fighters' HP, relayed every 2 s to the
  whole room, was most of what was left.
- The whole copies (one a minute from each player) fell between these short
  measurements. A longer run, 90 s a step, counts them:
  - 120 players: 38.0 ticks a second, the thread 85% busy, each player sent
    1.3 relays a second (1.3 KB/s);
  - 150 players: 31.1 ticks a second, 96% busy, 1.7 relays a second.

## Found by the test: leaving a clan reset your build on everyone's screen

`clans.js` tells everyone a leaver's tag is gone with its own relay,
`{clanTag: null, clanColor1: null}`. But the phone sets a peer's height and frame
from every `player_update`, so that relay put a tall or broad leaver back to
average on every screen. The 2 s relay hid it two seconds later; with relays
only on change it could have stayed for a minute.

The property test found it. The clear now carries the leaver's `hg`/`fr`, and
their next look relay goes whole (`_lookForget`). `clans.test.mjs` 9.3c/9.3d
check both, and 9.3c fails on the old clear.

A key that disappears is also forgotten by the relay. So rejoining the same
clan, the same tag, is news again, though the leave cleared it on every phone
(`look-relay.test.mjs` 1l).

## Still to do

- **The phones still SEND `track` every 2 s**: about 0.5 incoming messages a
  second each, around 5% of what a player sends. Sending it only when something
  changed is a phone change.
- **A relay still goes to the whole room**, not only to the players who can see
  this one. That is Phase 0's events by place
  (`docs/SERVER-SPLIT-PLAN.md`).
