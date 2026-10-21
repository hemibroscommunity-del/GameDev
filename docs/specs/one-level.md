# One level: your best weapon's level (v2.3.3538)

The owner, 2026-10-21: *"I value SIMPLICITY and INTELLIGIBILITY"*. This is
item 1 of the after-review list agreed with the outside evaluation: one level
that means one thing.

## What it did

A character's level was its three weapon levels (Melee, Bow, Magic) added up.
- A new character was level 3.
- Trying a second weapon raised the level, though the monsters you should
  fight follow the weapon in your hand.
- The added-up number also set your HP, your body points, the No man's land
  matching, the dungeons' level, and the alliance count.

So someone at 10/10/10 was "level 30" with level-10 weapons. They had 1,600 HP
where a level-10 sword had 700, were matched against level-30 dungeons, and
could never fight a 24/1/1 player in No man's land.

## What it does now

**Your level is your best weapon's level** (`server/src/prog3.js`
`_prog3CharLevel`; the game page's `src/data/prog3.js` `prog3CharLevel`). A
new character is level 1, and a level-10 player is the match for a level-10
monster.

- **Max HP = 200 + 50 a level + 40 a Max HP point** (`oneformula.js`
  `healthAt`, `oneLevel`). The bar reads your level as the old sum read a
  character with one weapon trained.
  - A new character's 250 HP, and every one-weapon character's bar, are exactly
    what they were. So is every monster's hit (`monsterHitK` is unchanged) and
    every number in the fight simulator's tables.
  - Only a character who trained two or three weapons no longer gets the
    others' HP: 10/10/10 has 700, not 1,600.
- **Points.**
  - Each weapon's level-up still pays that weapon 3 points.
  - The 3 shared (body) points now come when your **level** rises, so a weapon
    below your best pays its own points and no shared ones.
  - Under the sum, every weapon level-up was a level, so this is the same rule
    there.
  - The limit on any one body stat is your level, and it now always has room
    for every shared point you earn. Under the sum it did not: 10/10/10 would
    have held 81 points with room for 70.
- **A weapon level-up below your best** still refills HP, stamina and mana and
  shows its burst ("Bow · Level 3"), as every weapon level-up always has. The
  dashboard's XP ring now counts toward your next level from your best weapon
  only (`heroModel.js` `combatLevelProgress`).
- **Every existing character's points were handed back once**
  (`prog3Redeal`, migration v18, and again at login in case the migration
  failed), with the pools the new rule gives:
  - 3 a level past 1 for each weapon;
  - 3 a level past 1 for the shared pool.

  Weapon levels, XP, gear, gold and everything else are kept. The agreed plan
  allowed everyone to start fresh; this keeps every character and re-deals
  only the points, which is all the change needs. It runs once per character
  (the `olr` stamp).
- **Other players see the server's level.** Before, other players saw the
  level each phone reported about itself (`rpgLv`), while the server ran No
  man's land by its own number. Now the server stamps its own level over the
  phone's, at login and on every look update (`_levelStamp`). Every name
  plate, the "Attack <name>?" window, the lists and the other phones' No man's
  land guesses all read the server's number.

## What follows the new level by itself

These read the level, so they changed with it, with no code of their own:

- **No man's land:** two players may fight when their levels are within the
  ring's number. Same best weapon now means same level.
- **Dungeons:** the Wheel dungeons run at your level up to the place's top,
  and the Workshop caps monsters at your level. A 10/10/10 meets a level-10
  Great Cave, not level 30.
- **The alliance's active members** ("level 5 or more"). This now means a
  weapon at 5, about two and a half times the old effort (1,420 XP against
  560-605). The number stays 5, so no wording changed.
- **The Combat rank** is your level (`leaderboard.js`): the best of the three,
  where it was their total.

## Changed to fit the 1–100 range

- **On-chain checkpoints** (dormant until the owner configures them):
  `[2, 5, 10, 20, 30, 40, 50, 75, 100]`, where they were 4 up to 300.
- **The welcome and the quest coach** treat "level 1 or under" as a new
  character, where it was "3 or under".
- **The prize draw** (`public/tools/draw.html`): its level box tops out at 100,
  and a note says that its default of 5 now costs a weapon at 5. Lower it to 3
  for the old effort; that is the owner's call.

## Not changed

- Each weapon's own stats and the XP fade still use that weapon's own level.
- Weapon and amulet gates still use the weapon's level. Armour and shields
  still need Defense points.
- The achievements "Reach combat level 200" (silent, kept on each phone) can no
  longer be reached. They were never shown.

## Switch and deploy order

- The server says `caps.onelevel`, and the game page predicts the new level,
  bar and point limits only against a server that says it
  (`setOneLevelEnabled`).
- Kill switch: `onelevel: false` in the live flags.
  - The three are added up again, with a new character at 3 and shared points
    for every weapon level-up.
  - It takes effect at once: every connected player's bar is re-sized and keeps
    how full it was.
  - Points already re-dealt stay as they are.

## Tests

- `one-level` suite (28 checks):
  - a new character;
  - the bar at every level 1–100 against the sum's;
  - body points by level, and every shared point spendable for six builds
    through the real spend;
  - the re-deal through a real login, never twice;
  - the level other players see;
  - the switch thrown through the admin route.

  Five broken versions of the change each fail it.
- These suites were updated to the new level: `prog3`, `abilities`, `burst`,
  `chainscore`, `hiscores`, `near-join`, `one-formula`, `peer-view`,
  `persistence`, `xp-decay`, `migrations` (a new v18 section) and `anticheat`.
- `mirror-audit` checks that the game page's level and bar match the
  server's, with the formula and one level each on and off.
- Phone checks: `mp-prog3` (16), `mp-ability` (56) and `mp-alliance` (16), all
  updated and passing.
