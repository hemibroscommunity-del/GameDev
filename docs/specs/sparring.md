# Sparring clones: fight yourself from the test panel (v2.3.3265)

The owner: *"I wish I could test PvP somehow. Can you make a special
environment where I can go to attack clones of myself using different
weapons and you just have them attack me using AI? Purely for testing
purposes. Maybe this is better to add to the admin window"*.

The test panel (hold the place name at the top for 1.2 s, then your admin
key) has a new **Sparring (PvP practice)** section. It brings up to three
clones of you beside you in the world: a sword, a bow and a staff, in any
mix. They fight you, and you fight them, with the real player-vs-player
rules.

## Using it

1. Stand anywhere in the world (BroTown or any land). Not in a dungeon or on
   the farm.
2. Open the test panel. Under **Sparring**, pick how they fight, then tap
   **Sword clone**, **Bow clone**, **Staff clone** or **All three**. The
   panel closes and the clones appear around you. The chat says they are
   here.
3. **Attack.** Since v2.3.3267 your weapons treat a clone as a monster: the
   sword picks the nearest one by itself, and every swing, arrow and bolt
   lands on any clone it reaches, picked or not. A tap still picks one to aim
   at (with the bow or staff, a tap is how you pick, as for a monster). Your
   swings, arrows, bolts, specials, bash, whirlwind and lunge all work on
   them.
4. **Clear clones** sends them home. Leaving the world (a dungeon, the farm,
   a death to a monster) or closing the game does too.

**How they fight** (the four buttons):

| Button | What it is |
| --- | --- |
| Dummy | Stands still, never attacks. To read your own damage numbers. |
| Easy | A beginner: slow to attack, no specials, no lunge, no rolls, no shield (v2.3.3267). |
| Normal | An average player: keeps its distance, sometimes rolls or raises its shield, lunges with the sword. |
| Hard | A skilled player: kites, strafes, answers your specials with its shield or a roll, lunges from across the screen. |

Normal and Hard are the fight simulator's average and skilled players
(`tools/pvp-sim/sim.mjs`, the study in `docs/specs/pvp-fights.md`); Easy was
its careless player until v2.3.3267 and is a beginner now (below). You can
change it while the clones are out.

## What a clone is

A clone is a **player to the server**: it has a place in the world, and
every phone near it draws it. It copies **you**:

- your look (skin, hair, clothes, drawings, armour on show);
- your level and every point you have spent;
- your armour, shield and amulet;
- the weapon you carry for its slot (a copy, gems included). If you have none
  for that slot, it gets the tutorial's (copper great sword, pine bow, pine
  staff).

It does **not** copy your bag, gold, quests, buffs or pet.

Every blow between you and a clone, either way, goes through the same server
code as a fight between two real players: the server's own damage roll, the
shield and its parry, the roll's dodge, armour, the gem effects, the sword's
lunge and its daze, the shield bash, the whirlwind, the specials (paid for
with the clone's own mana). So what you see is real PvP, not an imitation of
it.

## The rules that keep it a test

- **Nobody else is in it.** A clone fights its owner and nobody else, either
  way. Other players see the clones but can neither hit them nor be hit by
  them. No monster ever chases or hits a clone.
- **Never No man's land.** No skull, no bag taken, either way.
- **A knockout is not a death.** When a clone brings you to 0, you are healed
  where you stand: no death screen, no trip to town, nothing dropped, nothing
  lost. The clones heal too and step back for 2.5 s, then the next round
  starts. "Knocked out! Healed" shows over you.
- **A knocked-out clone** is down for 3 s, then stands up beside you, healed.
- **The score** (your knockouts and theirs) is in the panel and in the chat.
- **Nothing is saved.** A clone has no record, no bag and no money.

## What is not the same as a real player

- **Walls.** The server knows no walls, so a clone walks through buildings
  and water (as monsters do), and its arrows and bolts fly through them on
  the server. On your screen an arrow may stick in a building while the
  server still lands it on you.
- **Speed.** A clone swings, shoots and walks at the game's base speeds. Your
  Speed, Move Speed and Range points do not make it faster or longer-reaching.
  Every number the server rolls (Power, Crit, Defense, Dodge, armour) does
  count.
- **Food.** A clone never eats.
- **Arrows and bolts on your screen.** A clone's shots go out as the very
  relays a player's page sends (v2.3.3266), so your screen draws them through
  the same code as anyone's: an arrow at the bow's 24 px a frame, a volley at
  its own speed 200 px apart, and, since a clone's shots name you (`tg`), an
  arrow stops where it reaches you and a bolt chases you and stops there, as
  the server lands them.

## After the first playtest (v2.3.3267)

The owner, after sparring on the live game: *"attacks need to hit the clone
even when you aren't locked on target. Also the block shield button needs to
appear while in combat for any of the 3 combat types. It was not there. Also
the enemy Hp bar was too small (the numbers were tiny in their hp bar) should
be the same size as mine though. The bot was tough to be beat even on
easy."*

All four came from one rule: the page asked about a player only when one
was locked (a duel locks you onto the other; No man's land's Attack is a
lock). A clone was a player like any other there. So with nothing locked:

- **the bow never fired at a clone.** Its aim check (`firstSightHit`)
  looked for monsters and the locked player only;
- **arrows and bolts flew through a clone,** and **a swing in its face sent
  nothing**: the hit tests tried the lock alone;
- **the shield button was missing.** It shows with a lock, a blow in the
  last five seconds or a monster in reach. A dummy never hits, and a bow or
  staff clone fights from 280-400 px, outside a monster's reach, so it came
  and went with each blow;
- and **another player's HP bar** was the monster's: 44 x 13 with a 9 px
  number, against your own 76 x 22 and 18 px.

**What changed.** To your weapons a clone is now what a monster is
(`src/game/sparTargets.js`):

- **The sword** picks the nearest clone by itself, inside the same 220 px
  reach where it picks the nearest monster (`targeting.js`). The nearest of
  the two wins, and it lets go when the clone is knocked out or walks off. The
  lock is a player lock (`spar`, `src: 'auto'`), so the lunge, the bash and
  the whirlwind take it too.
- **The bow and the staff** still pick only by a tap, as with a monster
  (the owner's rule, v2.3.2258). But the bow now fires when a clone is on its
  line, and every arrow and bolt lands on any clone it reaches
  (`projectiles.js`).
- **Every swing** lands on each clone in its arc and reach. That's one claim
  per clone, up to three a swing, each naming that clone (`target`), so
  nobody else is ever hit by it (`monsterCombat.js`, `pvpSwing.js`'s count
  per clone).
- **The shield button** is up while any of your clones is within about a
  screen (900 px), for every weapon (`shieldToggle.js`). The Special button
  follows the same rule. With no lock, a raised guard faces the nearest
  clone.
- **Another player's HP bar** is your bar now: 76 x 22, your number's 18 px
  bold, grown upward from where the old bar sat so it keeps its air over the
  head. That holds for every player you fight: a clone, a duel, No man's land
  (`entityRenderer.js`).

Only your own clones. They fight you and nobody else (`_sparPair` on the
server), every blow names its clone, and No man's land's rule that attacking
a real player is a choice (v2.3.3253) is untouched.

### Easy, made easy

Easy was the simulator's careless player. On the simulator
(`tools/pvp-sim/easy.mjs`) that was a coin flip for a careless player. A
careless player who throws **no specials** (likely you, still learning
each weapon's special) lost **every** fight to it: 0% in all nine weapon
pairings at Lv 12. A careless player's specials and the sword's lunge
are most of their damage.

Easy now throws no special, never lunges, attacks half the half-seconds it
could and waits 600 ms longer between two attacks. On the simulator, the same
careless player with no specials (Lv 12, copper armour; each pairing 150
fights):

| Easy | Your win rate (sword / bow / staff) | Worst pairing | Median fight |
| --- | --- | --- | --- |
| The old Easy (careless player) | 0% / 0% / 0% | 0% | 11.7 s |
| No specials or lunge | 68% / 22% / 70% | 7% (your bow v its staff) | 27.5 s |
| ...and half the focus | 98% / 88% / 99% | 70% | 29.3 s |
| **...and 600 ms more between attacks (shipped)** | **100% / 100% / 100%** | **100%** | **29.5 s** |

The same at Lv 7 and Lv 22. A careless player who does throw specials beats
it 100% too, in about 11 s. Its blows are still the real thing: every number
the server rolls is yours. Normal and Hard are unchanged. Against a player
who throws no specials they still win almost every fight, so specials are
the thing to practise on them.

### Tests

- `server/test/spar.test.mjs` §14: Easy's table; in 40 s it fights (blows
  from all three) but pays no special, throws no special shot or swing and
  never lunges, with every swing 1,200 ms or more apart, an arrow 1,095, a bolt
  1,500 (and, for contrast, a Normal sword swings sooner). §15: the page's
  half (`sparTargets.js`: a live clone, the clones near you, a shot's list, a
  swing's arc and reach, "a fight is on") and `pvpSwing.js`'s count per
  clone.
- `tools/qa/mp/mp-sparfight.mjs`, on a phone with nothing tapped: no shield
  button with nothing near; beside a dummy it is up before any blow; the
  sword finds the clone by itself and lands, each claim naming it; the
  clone's HP bar is your bar's size and number; the bow and the staff, still
  with nothing locked, fire at it and land, the shield button up with each;
  Easy clones fight you with no special and no lunge; cleared, the button
  goes. Run against the game before this build, every check of the fight
  itself fails (1a-4b: no button, no lock, nothing lands, the bow never
  fires), which is what the owner saw.

## Found while building it (fixed in v2.3.3266)

- **A real archer's arrows looked three times slower on the target's screen.**
  The archer's own arrow flies 24 px a frame, but everyone else drew it at
  8 px a frame (`visualSystems.js`), so the damage landed well before the
  drawn arrow arrived.
- **A real mage's bolt flew straight on the target's screen** but chases its
  target on the mage's own screen (where the hit is decided). And another
  player's arrow or bolt never stopped at you on your screen: it flew on
  through you to the end of its range.

The owner: "Yes do the follow up fixes". Both are fixed for every player in
v2.3.3266: `docs/specs/peer-shots.md`.

## How it works (for the code)

- `server/src/spar.js`: the clones (`_sparSpawn`), the AI (`_tickSpar`, run
  from the tick before the player-state flush), the knockouts
  (`_sparDeath`), the admin lever (`_sparDev`, `/dev/spar` in devtools.js).
  Each clone's relays are the ones a player's page sends (`player_swing`,
  `player_projectile`, `player_dodge`, `player_shield`,
  `player_died_to_monster`, `player_respawned`), listed in
  wire-audit.test.mjs's allowlist with why.
- Guards elsewhere, each a line: `_pvpAllowed` and `_pvpEngaged` (the pair),
  `_nmlAllowed`, `_handlePlayerDeath` (asks `_sparDeath` first),
  `_tickPlayerRespawn` (skips clones), `_tickMonsters` (clones not chased),
  `_telegraphHitPlayer`, `_fireTrailHitPlayer`, `_shockArcs`, the slime
  burst, `_saveRpg` (never a clone), `_lingerOnClose` (no linger for a spar),
  `webSocketClose` (your clones leave with you), `getAllPlayerData` (a
  joining phone gets them).
- `spar_state` (PRIVILEGED, to the owner only) says which players are your
  clones, the skill, the score and what just happened. The page handles it
  in wsClient's direct switch (`src/game/spar.js`): a tap on a clone aims at
  it (`sparAim`), the knockout messages.
- `caps.spar` shows the panel's section; `spar: false` in liveflags hides it
  and takes every clone away on the next tick.
- Tests: `server/test/spar.test.mjs` (115 checks, including a live monster
  that chases a real player and ignores a clone, and break-the-guard checks);
  `tools/qa/mp/mp-spar.mjs` on a phone through the real panel.
