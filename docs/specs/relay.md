# The relay is an allowlist, in the sender's name (v2.3.3304)

Found by the architecture review (2026-10-17). Server and phone; deploy in
either order.

## What the relay is

Some of what a phone does is drawn on everyone else's screen without the
worker settling anything: a chat line, an emote, a swing, an arrow, a roll, a
jump, a guard going up, a knockout. The phone sends it as a broadcast
(`S.channel.send({type: 'broadcast', event, payload})`), the router in
`server/src/index.js` has no case for it, and its default branch sends it on
to the room. The trade, duel and threat handshakes and the clan invite go the
same way, settled or recorded by the worker on their way through.

## What was wrong

1. **Any type was relayed** unless it was in `PRIVILEGED_EVENTS`, a
   deny-list.
   - Every type the worker sends itself is on that list (`wire-audit` holds
     that).
   - But a type the phone handles that nobody sends (an old handler, a
     dormant one) could be sent by anyone.
   - Junk of any type was fanned out to every socket in the room, within the
     relay budget.
2. **The relay said who sent it in the wrong place.**
   - The worker stamps the sender at the top of the message (`from`).
   - The phone read the payload's `id` first (`payload.id || from`,
     wsClient.js).
   - Several of its handlers read the payload's own `from` and `fromName`: a
     clan invite ("X invites you to clan Y"), a duel challenge (the duel then
     locks onto that player), a threat, a trade's note.
   - So a script could relay "Bob died", "Bob rolled" or "Bob invites you to
     his clan" in Bob's name. Chat was the one relay that was rebuilt
     (v2.3.1970, `_sanitizeChatRelay`).

## What changed

- **The default branch relays only `RELAY.TYPES`** (`server/src/relay.js`),
  the 26 types an honest phone relays: `arena_bet`, `campfire_lit`, `chat`,
  `clan_invite`, the four duel types, `emote`, `gather_node`,
  `monster_dmg_at`, `player_died_to_monster`, `player_dodge`,
  `player_hurt_by_monster`, `player_jump`, `player_projectile`,
  `player_respawned`, `player_shield`, `player_swing`, `pvp_confirmed`,
  `pvp_threat`, `stunned`, `threat_response` and the three trade types.
  - Any other type is dropped, silently, as a privileged one always was.
  - A dropped type costs no relay budget.
- **Every relay is rebuilt** before it goes out (`_relayBuild`):
  - The message is `{type, from, payload}` and nothing else.
  - The payload is a copy, with the sender fields set by the worker:
    - `id` is always the sender's id;
    - `from` and `playerId` become the sender's id where the phone put them;
    - `fromName`, `playerName` and `name` become the worker's name for the
      sender (chat's rule: the stored character name, else the name the join
      sanitised).
  - No payload, or an array, becomes an empty payload in the sender's name.
  - The intercepts (trade, duel, threat, clan invite) see the rebuilt copy, so
    a trade's note names the sender as the worker knows them.
- **The phone reads `from` before the payload's `id`**, in the tick's events
  and in a direct message (wsClient.js). An event the worker makes itself
  carries no `from`, or one that agrees with its payload (a sparring clone's
  relays, a duel's or a trade's own decline).

An honest phone already puts its own id and name in every one of these, so
nothing it sends reads differently.

## Deploy order

- New worker, old phone: every relay arrives in its sender's name, which the
  old phone reads as before.
- New phone, old worker: the phone reads `from`, which every worker has
  stamped.

## Kill switch

`relaylist: false` in the live flags relays every unprivileged type again, as
before. The rebuild stays, as it changes nothing an honest phone sends.

## Tests

`server/test/relay.test.mjs` (52):

- every relay type an honest phone sends goes through, once, from the
  sender, in the sender's name;
- an unknown type, a privileged type and `__proto__` go nowhere;
- "Bob died" sent by Amy is Amy's knockout, and a swing, a confirm and an
  arena bet are in the sender's name, with every other field unchanged;
- nothing else on the message goes out, and no payload, an array or a
  `__proto__` key are harmless;
- a trade offer, a duel challenge and its decline, and a clan invite still
  work, in the sender's name;
- the kill switch, and the relay budget;
- **the list is the phone's**:
  - every broadcast in src/ is a router case, a relay, or one of two
    privileged types the phone still sends and the worker drops on purpose
    (`clan_war_end`, `clan_war_kill`);
  - every relay is sent by a phone (`duel_request`: an older phone's plain
    duel) and handled by the others' pages;
- the phone reads `from` first.

Removing the allowlist check fails 3 checks, removing the rebuild 6, the id
stamp 6, and dropping one type from the list 1. All 133 server suites pass,
and the phone scenarios socialgrief, chat, peershots, duel, trade and clan show
no failure that `main` does not also show (duel 1, trade 6 and clan 1 fail on
both).

A new relay goes in `RELAY.TYPES` or it reaches no one (TRAPS §190).
