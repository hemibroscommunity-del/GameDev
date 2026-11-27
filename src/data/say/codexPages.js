/* v2.3.6693: the Codex's words under the new dashboard (card UI2-codex: dash/CodexPage.jsx,
   dash/MonsterShowcase.jsx; the rules src/game/codexView.js, entityInspect.js, lootRows.js;
   docs/specs/player-words.md).  The monsters' own names, lore, lands and drops stay in their
   data tables (src/data/monsterCodex.js, codexDrops.js); the words today's Codex already says
   (its Info and Locations, a page not yet open) stay monsterCodex.js's and are read from there. */
export const SAY = Object.freeze({
  /* the collection's kinds (Q73) */
  'codexPages.shelfMonsters': 'Monsters',
  'codexPages.shelfItems': 'Items',
  'codexPages.shelfResources': 'Resources',
  'codexPages.shelfTownsfolk': 'Townsfolk',
  'codexPages.shelfLands': 'Lands',
  'codexPages.shelfPets': 'Pets',
  'codexPages.shelvesAria': 'What the Codex holds',
  /* a kind with no pages yet: an honest line, never hidden */
  'codexPages.emptyTitle': 'Not in the Codex yet',
  'codexPages.emptyWhy': 'Their pages are still being written.',
  'codexPages.emptyPets': 'Your pets have their own journal.',
  'codexPages.petJournal': 'Your pet journal',
  /* the monsters' count */
  'codexPages.met': '{met} of {total} met',
  /* a monster's showcase: its four doors and what each holds */
  'codexPages.doorCombat': 'Combat',
  'codexPages.doorLoot': 'Loot',
  'codexPages.doorHabitat': 'Habitat',
  'codexPages.doorStory': 'Story',
  'codexPages.lootCount': { one: '{n} drop', other: '{n} drops' },
  'codexPages.storyElder': '{elder}',
  'codexPages.storyOnly': 'Its tale',
  /* its essentials */
  'codexPages.factLevels': 'Levels',
  'codexPages.factElement': 'Element',
  'codexPages.factType': 'Type',
  'codexPages.factKills': 'Defeated',
  'codexPages.factStrength': 'Strength',
  'codexPages.byLevel': 'By level',
  /* Loot: one chance a row, and the roll's true words once */
  'codexPages.everyKill': 'Every kill',
  'codexPages.goldAmount': '{amount} gold',
  'codexPages.rollsGrade': 'rolls a grade',
  'codexPages.rollShared': 'One roll a kill: at most one of the drops with a chance.',
  'codexPages.rollEach': 'Each drop rolls on its own.',
  'codexPages.gradesHead': 'A piece of gear rolls its grade as it drops',
  /* the one item page, from the Codex */
  'codexPages.dropsFrom': 'Drops from {name}',
  'codexPages.grade': 'Grade',
  'codexPages.gradeRolls': 'Rolls as it drops',
  'codexPages.foundFrom': 'Found from',
});
