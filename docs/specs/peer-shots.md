# Another player's shot, as it flies on their screen (v2.3.3266)

The owner, on what #920 (the sparring clones) found:

> Real archers' arrows look 3x slower to everyone else ... Other players'
> shots fly straight through you on your screen, and a real mage's bolt flies
> straight on your screen, even though it chases you on the mage's screen,
> where the hit is decided.

"Yes do the follow up fixes".

## What was wrong

Every shot you fire is flown on your own screen (`src/game/projectiles.js`)
and sent to everyone near you as a `player_projectile` relay. Their screens
fly a copy of it (`src/game/visualSystems.js`, the remote projectile
simulation). The copy and the real shot had come apart three ways:

1. **Speed.** An arrow has flown 24 px a frame since v2.3.2473 (times the
   bow's Longshot and the depth, its `_rangeMult`). The copy still flew the
   old 8: a third of the speed, so the damage number came up when the drawn
   arrow was a third of the way there. And it ran its life out at 720 px,
   past where the real one comes down.
2. **The line.** A loosed arrow keeps the line it was shot on (v2.3.2258).
   The copy was drawn from where the shooter *is* each frame, so it slid
   sideways when they walked on.
3. **The target.** Nothing told the other screens who a shot was aimed at.
   An arrow at you flew on through you to the end of its range, and a mage's
   bolt (which homes on its target on the mage's own screen) flew straight.

## What it does now

`src/game/peerShots.js` holds the rules, read by `gameEvents.js` (when a relay
arrives) and `visualSystems.js` (every frame).

### Speed and reach, for every shooter

The relay already said how far the shot reaches: its `life` is 90 frames times
that same `_rangeMult` (monsterCombat, dodge, playerActions, since v2.3.2592).
So the watcher reads the multiplier back off it and:

- flies the copy at the shooter's speed, `ARROW_SPEED_PX` (24) times it;
- ends it at the shooter's reach, `BOW_RANGE_PX` (675) times it, where the
  real arrow comes down. It is drawn solid all the way there, as the real one
  is: the renderer's fade is `min(1, life / 20)` on both screens, and a life of
  90 frames never runs that low in the 28 frames an arrow flies (mp-projlook
  holds the copy to the shooter's rule). The real arrow then plants in the
  ground; the copy just ends;
- flies the bow volley at its own 0.7 (`BOW_VOLLEY.SPEED_K`, the relay's
  `volley` flag), and counts its arrows' waits (sized by the shooter for the
  old 8 px a frame, `BOW_VOLLEY.PEER_PX_PER_FRAME`) in that speed's frames,
  so the three are still 200 px apart.

Nothing new on the wire for it, so it works for a shooter on an older page
too. A staff bolt, and any shot that names its own speed (`speedPx`: the staff
specials), is exactly as before.

### The line

An arrow's copy stamps its origin and angle as it leaves, as the real one does.
A volley's second and third arrows take the first one's line (gameEvents.js
finds it: same shooter, same `ts`). A bolt still sweeps round its caster, as it
does on the caster's screen (v2.3.2261).

### The target: `tg`

A shot at a player you have locked, where your PvP hit test will try them,
names them: `tg` (`shotTargetId`: your duel opponent, or anyone you locked
outside a safe zone; No man's land's aim and a sparring clone are locks). Every
road a shot leaves by sends it: the bow's and staff's own shot
(monsterCombat.js), the retreat shot (dodge.js), the bow volley, the big bolt
and the three orbs (playerActions.js).

On every other screen:

- an arrow leaves aimed at them **as that screen draws them**. Your arrow left
  aimed at the lock, so this replays the same thing: if they are still in its
  way when it gets there, it reaches them; if they stepped out of it, it flies
  past, on their screen as on yours;
- it ends where it reaches them, in the room your own PvP test gives an arrow
  (22 px of body plus its 6.6);
- a bolt turns to them every frame and ends at them, as it homes on the lock on
  the caster's screen;
- a shot that **pierces** flies on through them, as it does on the shooter's
  screen: every bow special (`pierce: true` in playerActions), and a plain
  arrow with the Piercing stat (`pc: 1` on its relay).

A shot with no lock names nobody and flies as before. The worker never reads
`tg` or `pc`: they only decide where a drawn shot stops on a screen. Both are
peer-written and checked as such (a string under 80 characters; a flag).

### The sparring clones

Their shots (server/src/spar.js) are now the very relays a page sends: an
arrow's life of 90 and no `speedPx`, a volley's waits sized for 8 px a frame
with one `ts` for the three, `tg` naming you. So your screen draws a clone's
shots through the same code as everyone else's. (v2.3.3265 drew a clone's
arrows at 20 px a frame, the most a `speedPx` may say.)

## Deploy order

- **New page, old page shooting:** the old relay has its `life`, so its arrows
  fly at the right speed and reach. It sends no `tg` or `pc`, so its shots at
  you fly on as before.
- **Old page, new page shooting:** the old page ignores `tg` and `pc` and draws
  as it always did (8 px a frame).
- No worker change for real players. The worker only changed what the clones
  send.

## Tests

- `server/test/peer-shots.test.mjs`: the numbers are the game's (read off the
  source), an arrow's copy flies the shooter's speed to the shooter's reach at
  every Longshot and depth, the volley stays 200 px apart, bolts and named
  speeds are unchanged, what pierces, which player a shot names, the reach test
  and the fade, and that every road a shot leaves by names the player.
- `server/test/spar.test.mjs` 5k-5k1, 6b1-6b2: a clone's arrow and volley go
  out as a page's, and the page's own rule draws them at the speed and spacing
  the worker flies them.
- `tools/qa/mp/mp-peershots.mjs`: two phones in the Wheel. A shoots at B with
  a real bow and staff, and B records every frame of every copy it draws:
  1. a locked arrow names B, flies the bow's 24 px a frame on one line, and
     ends because it reached B (28 px from their middle), short of its reach;
  2. B's copy of A jumps 120 px sideways mid-flight, as a shooter walking on
     is drawn, and the arrow keeps its line;
  3. B walks across a locked bolt's path the whole way, and the bolt turns
     after them and ends at them;
  4. the volley: three copies at 16.8 px a frame, about 200 px apart, flying
     on through B to their reach;
  5. an arrow at nobody, as an older page sends it, flies 24 px a frame out to
     its 675 px reach, solid all the way, as the shooter's own is;
  6. no page errors.

  It waits for each copy to finish, not a set time: on this box, with two
  phones up, a page draws a frame or two a second, and the game's clock is held
  to three frames' worth a draw, so a flight of half a second takes several.

## Probe

`window.__btPeerShotEnds`: the last 30 copies to leave your screen, and why
(`life`, `reach`, `target`, `prop`), with where they were.
