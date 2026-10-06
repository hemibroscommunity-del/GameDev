# Pet trapping research notes (v2.3.3105)

These are the notes behind `docs/PET-TRAPPING-PLAN.md`, the pet trapping plan.
They answer the owner's request to research pet trapping and make a master plan,
and the follow-up that changed it: *"I don't know if what's already in the game
is the best mechanic I made that as an early demo. It also becomes infeasible if
you're powerful enough to 1 hit monsters so I need something else."*

## What the game's code has today

Every claim in these three files is cited as path:line, as read on 2026-10-06 at
`f337dfa` (v2.3.3101).

- `codebase_existing_pet_system.md`:
  - the 20% capture (`server/src/pets.js`) and why nobody can reach it;
  - the loot vacuum, and what pets really do;
  - the Pet House, the browser-only evolve and enchant, the dormant Beastmaster
    quests;
  - the history from v2.3.1130 on, the tests, and 24 gaps and exploit risks.
- `codebase_world_monsters_hooks.md`:
  - the Wheel's monsters, land by land and stretch by stretch;
  - what a monster's art costs in memory, and why a pet can't wear it;
  - the kill path and the drop lanes, safe ground, No man's land, dungeons;
  - the one-hit problem, measured (§6);
  - the hooks a capture that ignores health could use (§7);
  - where a trapper and a pet house could live in town.
- `codebase_skills_items_economy_conventions.md`:
  - the life skills, how a harvest works end to end, and Trapping's place in
    them;
  - items, shops, the crafting tables to copy, the farm, trading and mail;
  - the server's rules for any new system, as a checklist with receipts (§5);
  - memory and art rules, and where a Pets page and a TRAP button could go;
  - timers that run while you're away, bait candidates, and what a pet record
    costs (§8).
- `one-hit/`: the scripts behind the one-hit tables and their output. They
  import the server's own constants, so after a balance change you can re-run
  them from the repo root and see if the tables still hold:
  - `node docs/research/pet-trapping/one-hit/onehit2.mjs`: the skill level at
    which each weapon one-shots each monster level;
  - `onehit3.mjs`: the mean hit as a share of a monster's health;
  - `diag.mjs`: at-level and out-levelled fights.

  The results are random samples, so a re-run moves by a point or two.

## How other games do it

- `other_games_report.md` is the report built from the four sets of notes below.
  Start here.
- `capture_moment.md`: how a capture is decided, and what makes it exciting:
  - Pokémon's formula and shake checks, and Pokémon GO's throws;
  - Palworld, Monster Hunter, Path of Exile, Ark, Black Desert, WoW;
  - which methods still work when you can one-hit the creature.
- `traps_and_hunting_skills.md`: trapping as a skill:
  - RuneScape's Hunter, its trap limits, bait and bird houses;
  - Ultima Online's taming;
  - Valheim, Minecraft, Don't Starve, Stardew's crab pots;
  - Black Desert's horses, Albion's animals.
- `after_the_catch.md`: what pets do afterwards, and other ways to get them:
  - roles, from cosmetic to fighting, and what each costs to build;
  - care, growing, collection, rare variants, ranching and breeding;
  - eggs, cards and nests.
- `multiplayer_economy_fairness.md`: pets in a shared world:
  - who may catch what another player damaged;
  - placed traps and theft;
  - trading, dupes and bots, losing pets in PvP;
  - the 2025–2026 rules on selling random items;
  - event spawns.

## Two cautions

- **The researchers could not open most of the web pages they cite.** The
  network blocks almost every game wiki, forum and regulator site, and the web
  search budget ran out during the work.
  - Most outside numbers come from search-result summaries.
  - Each note tags every finding with where it came from:
    - **`[source-read]`** or **`[code]`**: read directly. That means this repo,
      a few GitHub pages (decompiled Pokémon code, RuneLite's plugins) and
      Apple's guidelines.
    - **`[search-summary]`** or **`[summary]`**: taken from a search engine's
      summary of the page.
    - **`[memory — unverified]`**: a researcher's recollection, kept only under
      Gaps as a lead.
  - Check a number on its page before it becomes a price or a rate in the game.
- **These are notes.** Where they disagree with the code, the code wins.

Nothing here changes the game.
