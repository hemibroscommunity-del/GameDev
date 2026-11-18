/* v2.3.6326: the codex's Monsters tab's words (src/ui/mobile/dash/MonsterCodex.jsx; docs/specs/player-words.md, wave W1).
   The monsters' own names, lore, lands and drops stay in their data tables
   (src/data/monsterCodex.js, codexDrops.js): these are the screen's own words. */
export const SAY = Object.freeze({
  /* levels and the road from BroTown (Locations) */
  'monsterCodex.levelsOne': 'Lv {lo}',
  'monsterCodex.levelsRange': 'Lv {lo}–{hi}',
  'monsterCodex.wayStraight': 'Leave BroTown by its {gate} gate and follow {road} straight on.',
  'monsterCodex.wayFork': 'Leave BroTown by its {gate} gate on {road}, then take {fork} where it forks off.',

  /* a monster's card in the list */
  'monsterCodex.cardNew': 'NEW',
  'monsterCodex.unknownName': '???',
  'monsterCodex.cardKills': '{n} defeated',
  'monsterCodex.cardNotMet': 'Not met yet',

  /* a page's header */
  'monsterCodex.pageKills': '{n} defeated',
  'monsterCodex.pageKillsElder': ' · {n} past Lv 20',

  /* the pinned tab bar */
  'monsterCodex.tabDrops': 'Drops',
  'monsterCodex.tabInfo': 'Info',
  'monsterCodex.tabLocations': 'Locations',
  'monsterCodex.tabDropsShort': 'Drops',
  'monsterCodex.tabInfoShort': 'Info',
  'monsterCodex.tabLocationsShort': 'Where',
  'monsterCodex.backLabel': 'All monsters',
  'monsterCodex.backShort': 'All',

  /* Drops: the table and its dice key */
  'monsterCodex.dropsItemHead': 'Item',
  'monsterCodex.dropsTypeHead': 'Type',
  'monsterCodex.dropsRollHead': 'Roll',
  'monsterCodex.dropsAlways': 'Always',
  'monsterCodex.diceShared': 'Each kill rolls once, 1–{sides}. The item whose numbers it lands on drops{free}.',
  'monsterCodex.diceFree': '; {range} drops nothing more',
  'monsterCodex.diceOwn': 'Each kill rolls 1–{sides} for every item. A roll in its range drops it.',
  'monsterCodex.dropsHint': 'Tap an item to see what it is and the grades it can roll.',

  /* an item's card */
  'monsterCodex.itemClose': 'Close',
  'monsterCodex.itemFoundFrom': 'Found from',
  'monsterCodex.itemBaseChance': 'Base drop chance',
  'monsterCodex.itemChanceNote': '(chance for this item to drop)',
  'monsterCodex.itemRoll': 'drops on a roll of {range} out of {sides}',
  'monsterCodex.itemRarity': 'Possible rarity',
  'monsterCodex.itemRarityNote': '(rolls after drop)',

  /* Info */
  'monsterCodex.factWhat': 'What it does',
  'monsterCodex.factElement': 'Element · {name}',
  'monsterCodex.factPet': 'A pet from {land}, out with you, softens it.',
  'monsterCodex.factSpecial': 'Special attack · {name}',
  'monsterCodex.factTip': 'Tip:',
  'monsterCodex.factStory': 'Its story',
  'monsterCodex.factElder': 'Elder form · {name}',

  /* Locations */
  'monsterCodex.locLand': 'Its land',
  'monsterCodex.locLandText': "{land}, {levels}: the weakest at the land's near end by BroTown, stronger the further out you go.",
  'monsterCodex.locFirst': 'Before the first pass',
  'monsterCodex.locFirstText': '{name}, {levels}.',
  'monsterCodex.locElder': 'Past the first pass',
  'monsterCodex.locElderText': '{name}, its elder form, {levels}.',
  'monsterCodex.locRoad': 'The way there',
  'monsterCodex.locDungeon': 'Dungeon',
  'monsterCodex.locDungeonText': "{dungeon}, in {land}: {levels}, in waves, its land's monsters with a boss at the end.",

  /* a page not yet open */
  'monsterCodex.backButton': '‹ All monsters',
  'monsterCodex.lockedHint': 'Defeat one to open its page.',
  'monsterCodex.lockedHome': 'It lives in {land}.',

  /* the list of monsters */
  'monsterCodex.listTitle': 'Monsters of the world',
  'monsterCodex.listMet': '{met} of {total} met',
  'monsterCodex.noteOld': 'The codex starts counting your kills after the next game update.',
  'monsterCodex.noteUnavailable': "Your codex can't be read right now. It will be back.",
  'monsterCodex.listHint': 'Defeat one of a kind to open its whole page: everything it drops, what it does, its story and where it lives. Kills in a party count for everyone in it.',
});
