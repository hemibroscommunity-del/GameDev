/* v2.3.6844: a weapon's page and Shared lead with the upgrades (card UI4 PR 5,
   the owner's V17: src/game/combatV17.js; the pages sheet/WeaponPage.jsx,
   SharedPage.jsx, CombatHub.jsx; docs/specs/player-words.md).  The game's own
   words stay (Attributes, Sword, Bow, Staff, Lv, Shared Attributes, DPS, Max
   HP, Defense, All stats: the Combat hub's table, src/data/say/combatHub.js);
   these are only the new ones: where shared points come from, told as the
   GAME does it (the best weapon's level while `onelevel` is on, every
   weapon's level under the old sum; never V17's "three a weapon level": flag
   Q1), and the Shared door's words for a screen reader. */
export const SAY = Object.freeze({
  'combatV17.ruleBest': '+{n} each level of your best weapon',
  'combatV17.ruleEvery': '+{n} each weapon level',
  'combatV17.ruleK': 'Shared points',
  'combatV17.sharedDoorAria': 'Shared Attributes: Max HP, Defense and five more{pts}: open them',
});
