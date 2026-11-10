# "Dead" is the server's word, never the phone's (v2.3.4373)

The owner (2026-11-10): *"The server stops believing a phone that says 'I'm
dead', behind a kill switch."* Found by the state-machine sweep (2026-11-03,
V1 S1-2 / S3-3). Server only; no phone change.

## What was wrong

- Every move a phone sends carries `dead: true` or `dead: false` (the phone's
  own `hp <= 0`). The move handler wrote it straight into the player's record
  (`server/src/movement.js`: `if (msg.dead !== undefined) ps.dead = !!msg.dead`).
- The gates that decide who may be hit ask `ps.dead`: the monsters' list
  (`index.js` `_tickMonsters`, which feeds every monster's pick), the
  player-hit loop (`combat.js` `_resolvePvPAttack`), No man's land
  (`nomansland.js`), the telegraphs, the moves, the burns, the fire trail.
- So a modified page that said `dead: true` while the worker had it alive was
  hit by nothing, from monsters or players, while its own blows still landed
  (the attacker's gates ask `dying` too, and the page flipped the claim off
  for its own swing inside one bundle). God mode; in No man's land it took
  other players' bags.
- The other way round (TRAPS §233): the move a phone sends as it handles its
  death still says alive, so the worker's corpse went back on the monsters'
  list until the phone's own HP read 0.

## What changed

- The move no longer writes `ps.dead`. `dead` is the worker's word: set with
  `dying` at a death, cleared with it at the respawn.
- Every worker write of `ps.dead` already pairs it with `ps.dying` (checked
  on v2.3.4373): the death (`index.js` `_handlePlayerDeath`), the respawn
  (`_tickPlayerRespawn`), a sparring clone's knockout and revive (`spar.js`),
  the Test panel's heal (`devtools.js`), and the join's fresh record (`join.js`,
  `dead: false`; the join's allowlist `JOIN_PRESENCE_KEYS` is only x, y, d, z,
  so a join cannot write it either). With the move's write gone, `ps.dead` is
  true exactly while the worker runs a death.
- The phone may go on sending `dead`; the worker ignores it.
- Not test mode's to skip: it protects other players (CLAUDE.md §5).

## The readers (why none needs the phone's word)

- About 136 reads of `.dead` in 59 server files. Almost all ask
  `dead || dying` already, so they read the worker's death either way.
- The ones that ask `dead` WITHOUT `dying` are "skip a corpse" gates, and
  each wants the worker's death:
  - on a target or a sharer: the monsters' list (`index.js`), the player-hit
    loop and the kill share (`combat.js`);
  - on an actor ("may this corpse act?"): a trap's result (`trapping.js`), a
    node strike (`gathering.js`), No man's land's lock ask (`nomansland.js`
    `_handleNmlLockAsk`). These now also refuse §233's corpse whose move says alive,
    which they let through before;
  - records: the lag-comp history's copy (`tick.js`, recorded, read by
    nothing) and the admin view (`admin.js`).
- No zone runs a death on the phone alone: HP is the worker's (CLAUDE.md §5),
  and the stuck-at-zero sweep (`index.js`, v2.3.1562) starts the worker's
  death for any connected player at 0 HP. So the phone's `dead` was only ever
  its copy of the HP the worker sent it; when the two disagreed, the phone was
  the one behind.
- `poses.js` `_poseEndsOn` reads the MOVE's `msg.dead` (not `ps.dead`) to end a
  held pose. Kept as it is: it can only stand the phone's own player up, which
  `pose {id: null}` does anyway, so it protects nobody.
- Comments in `index.js` (the loot pickup), `combat.js` (the monster hit) and
  `abilities.js` still say `ps.dead` is the phone's. True again only with the
  switch off; their gates ask `dying` as well, which stays right either way.

## The kill switch

- `serverdead: false` in the live flags brings back the move's write exactly
  (`movement.js` `_serverDeadOff`, in `rollwindow`'s style; liveops.test §8s).
  Nothing set, or `serverdead: true`, is the worker's word.
- No cap: the phone changes nothing and needs to know nothing.

## Tests

- `server/test/server-dead.test.mjs`, against the real GameRoom and the real
  move handler: a phone saying `dead: true` while alive is still chased by a
  Wheel monster, hit by a monster's cast and by a player's swing; TRAPS §233's
  corpse stays dead whatever its move says and no monster lists it; TRAPS
  §150's corpse gates hold (its own pile refused, its swing lands nothing);
  an honest death and respawn on protocol v2 and v1; the switch brings back
  the old write. Before the change, seven checks fail (and the switch is
  missing); after, all pass.
- `move-path.test` 5e ("a dead player is never glided") now kills the player
  the worker's way: the phone's `dead: true` alone no longer makes one.

## Left for later

- Sweeping the gates across the combat files to ask `dying` (review R2: not
  needed now the phone cannot write `dead`; review R1: a blind sweep reopens
  the loot class, since "may this corpse act?" must keep `dead || dying`).
- The shield and parry, the cooking shield, zone flips, the world size, the
  skill-track restore (other lanes).
- Any phone code.
