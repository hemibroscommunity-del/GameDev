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
3. **Tap a clone to target it**, as you would a duel opponent. Your swings,
   arrows, bolts, specials, bash, whirlwind and lunge all work on it.
4. **Clear clones** sends them home. Leaving the world (a dungeon, the farm,
   a death to a monster) or closing the game does too.

**How they fight** (the four buttons):

| Button | What it is |
| --- | --- |
| Dummy | Stands still, never attacks. To read your own damage numbers. |
| Easy | A careless player: slow to react, no rolls, no shield. |
| Normal | An average player: keeps its distance, sometimes rolls or raises its shield, lunges with the sword. |
| Hard | A skilled player: kites, strafes, answers your specials with its shield or a roll, lunges from across the screen. |

These are the three players of the fight simulator (`tools/pvp-sim/sim.mjs`,
the study in `docs/specs/pvp-fights.md`), plus the dummy. You can change it
while the clones are out.

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
- **Arrows and bolts on your screen.** A clone's arrows are drawn at 20 px a
  frame, the fastest another player's arrow can be drawn, and fly at the
  bow's real 24 px a frame on the server. A clone's shots name you (`tg`), so
  on your screen an arrow stops where it reaches you and a bolt chases you
  and stops there, as the server lands them.

## Found while building it (not changed)

- **A real archer's arrows look three times slower on the target's screen.**
  The archer's own arrow flies 24 px a frame, but everyone else draws it at
  8 px a frame (`visualSystems.js`). So the damage lands well before the
  drawn arrow arrives. A clone sends its speed with the shot, so its arrows
  look right. Real players' pages could do the same.
- **A real mage's bolt flies straight on the target's screen** but chases its
  target on the mage's own screen (where the hit is decided). And another
  player's arrow or bolt never stops at you on your screen: it flies on
  through you to the end of its range. A clone's shots name their target
  (`tg`), so they are drawn chasing you (a bolt) and stopping at you (both).
  Real players' pages could send the same.

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
- Tests: `server/test/spar.test.mjs` (110 checks, including a live monster
  that chases a real player and ignores a clone, and break-the-guard checks);
  `tools/qa/mp/mp-spar.mjs` on a phone through the real panel.
