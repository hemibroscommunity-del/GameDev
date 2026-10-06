# Farming research notes (v2.3.3078)

These are the notes behind `docs/FARMING-PLAN.md`, the farming report. They
answer the owner's question of how farming could work in BroTown:

- crops you wait for, each with its own grow time, like FarmVille
- digging, planting, watering and fertilizing
- a private farm for each player that friends can visit
- a free plot from the Land Office, with bigger farms bought there
- what farming should give players

## What the game's code has today

Every claim in these files is cited as path:line, as read on 2026-10-06.

- `codebase_existing_farm.md`: the farm, the Land Office and Feed & Seed doors,
  the planting window that runs only in the browser, unused farm parts, and the
  farm's art and sound.
- `codebase_items_economy_progression.md`: Diego's shop, buffs, cooking, the
  Farming life skill, items, quests and the gold economy.
- `codebase_server_instancing_invites.md`: the server's rules for any new
  system, saved data, timers, private zones, invites, anti-cheat, play time and
  cost.

## How other games farm

- `farmville_hayday.md`: FarmVille 1, 2 and 3, and Hay Day.
- `mmo_farming_osrs_albion_wow_bdo.md`: RuneScape, Albion Online, WoW's
  Sunsong Ranch and Black Desert.
- `cozy_social_farming.md`: Stardew Valley, Palia, ArcheAge and Animal
  Crossing.
- `farming_rewards_economy_design.md`: food buffs, shop-sold versus player-made
  potions, how gold comes in and goes out, timers and bots, and play-time
  limits.

## Two cautions

- The researchers could not open the web pages they cite. Their numbers come
  from search-result summaries, so check a number on its page before it becomes
  a price.
- These are notes. Where they disagree with the code, the code wins.

Nothing here changes the game.
