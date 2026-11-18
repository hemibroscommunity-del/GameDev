/* v2.3.6328: the Blacksmith's words (src/ui/panels/buildings/SmithyPanel.jsx; docs/specs/player-words.md, wave W1) */
export const SAY = Object.freeze({
  /* the weapon kinds a name is made of */
  'smithy.typeGreatsword': 'Greatsword',
  'smithy.typeSword': 'Sword',

  /* the tabs (the Forge tab's 'Forge' stays in the screen: owner-icons 7d
     reads that line by text) */
  'smithy.tabSmelt': 'Smelt',
  'smithy.tabArmor': 'Armor',
  'smithy.tabUpgrade': 'Upgrade',
  'smithy.tabAmulet': 'Amulet',
  'smithy.tabSalvage': 'Salvage',

  /* the header */
  'smithy.title': 'Blacksmith',
  'smithy.level': 'Lv {lvl}',

  /* shared by the rows: the buttons, the lock */
  'smithy.locked': 'Locked',
  'smithy.smeltButton': 'Smelt',
  'smithy.forgeButton': 'Forge',
  'smithy.needSmithing': 'Smithing {lvl}',

  /* Smelt */
  'smithy.smeltFail': 'Could not smelt',
  'smithy.smeltAll': 'All ({count})',

  /* Forge */
  'smithy.holding': 'Holding {name}',
  'smithy.weaponBagFull': 'Weapon bag full',
  'smithy.forgedDone': 'Forged {name}!',
  'smithy.forgeFail': 'Could not forge',

  /* Armor */
  'smithy.wearLevel': 'Level {def} to wear',
  'smithy.wearDefense': 'Defense {def} to wear',

  /* Upgrade: hardening and taking a gem out */
  'smithy.hardenBadge': 'H{h}',
  'smithy.hardenMaxTitle': '{name} · max',
  'smithy.hardenStepTitle': 'H{h} → H{next}',
  'smithy.hardenButton': 'Harden',
  'smithy.hardenFailKeeps': 'Fail keeps H{h}',
  'smithy.hardenFailDrops': 'Fail → H0',
  'smithy.extractTitle': 'Take gem out of {name}',
  'smithy.extractDone': 'Gem removed',
  'smithy.extractFail': 'Could not remove the gem',
  'smithy.extractButton': 'Take out',
  'smithy.upgradeEmpty': 'Hold a weapon to upgrade it.',

  /* Amulet */
  'smithy.goldBar': 'Gold Bar',
  'smithy.goldBarDone': '+1 Gold Bar',
  'smithy.amuletTitle': '{tier} Amulet{worn}',
  'smithy.amuletWornTail': ' · worn',
  'smithy.amuletDone': 'Crafted {tier} Amulet!',
  'smithy.amuletFail': 'Could not craft',
  'smithy.craftButton': 'Craft',

  /* Salvage: the names of carried pieces with none of their own */
  'smithy.greavesName': '{metal} Greaves',
  'smithy.torsoName': '{metal} Torso',
  'smithy.weaponName': '{metal} {type}{hard}',
  'smithy.weaponHardTail': ' H{h}',

  /* Salvage: the answer, said at the top */
  'smithy.salvagedSaid': 'Salvaged{name}: +{bars} {what}{essence}',
  'smithy.salvagedMetalBars': '{metal} Bars',
  'smithy.salvagedBars': 'bars',
  'smithy.salvagedEssenceTail': ', +1 {essence}',
  'smithy.gradeRaisedSaid': 'Now {grade}!',

  /* Salvage: the tab */
  'smithy.confirmButton': 'Sure?',
  'smithy.salvageRule': '{back} Rare, Elite and Godly also leave their {essence}.',
  'smithy.salvageRuleBack': '{bars} of {cost} bars back.',
  'smithy.salvageRuleEssence': 'essence',
  'smithy.salvageEmpty': 'Carry a copper, iron or black steel piece to salvage it.',
  'smithy.salvageButton': 'Salvage',
  'smithy.salvageTooOld': 'Too old to salvage',
  'smithy.essencesHeading': 'Essences',
  'smithy.essenceNoTarget': 'No {metal} piece below {grade} in your bag.',
  'smithy.useButton': 'Use',
});
