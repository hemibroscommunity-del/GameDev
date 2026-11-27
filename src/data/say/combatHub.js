/* v2.3.6685: Combat's hub and a weapon's page (card UI2-combat, PR 1:
   src/ui/mobile/sheet/CombatHub.jsx, WeaponPage.jsx; the rules
   src/game/combatHub.js, src/game/progression.js; docs/specs/player-words.md).
   ONE vocabulary: Sword, Bow, Staff.  A pool's words are pointsWords' (one
   rule): "n points", 0 included; nothing here says how points are earned
   beyond the one line a weapon's level gives (its own points, the game's
   PROG3.POINTS_PER_LEVEL). */
export const SAY = Object.freeze({
  'combatHub.sword': 'Sword',
  'combatHub.bow': 'Bow',
  'combatHub.staff': 'Staff',
  'combatHub.shared': 'Shared Attributes',
  'combatHub.point': '{n} point',
  'combatHub.points': '{n} points',
  'combatHub.lv': 'Lv {n}',
  'combatHub.max': 'Max level',
  'combatHub.xp': '{now} / {need} XP',
  'combatHub.doorAria': '{w}, level {n}, {pts}: open its page',
  'combatHub.sharedAria': 'Shared Attributes, {pts}: open them',
  'combatHub.levelGives': 'Each {w} level gives {n} {w} points',
  'combatHub.dps': 'DPS',
  'combatHub.damage': 'Damage',
  'combatHub.aspd': 'Attack speed',
  'combatHub.crit': 'Crit chance',
  'combatHub.range': 'Range',
  'combatHub.attributes': 'Attributes',
  'combatHub.lanePoint': '{n} {w} point to spend',
  'combatHub.lanePoints': '{n} {w} points to spend',
  'combatHub.allStats': 'All stats',
  'combatHub.attrAria': '{stat}: {pts} of {cap} placed. Open its preview',
  'combatHub.attrAriaFree': '{stat}: {pts} placed. Open its preview',
  'combatHub.attrPts': '{n} placed',
  /* v2.3.6686 (PR 2): the Shared page; DPS's tap opens its tree */
  'combatHub.maxHp': 'Max HP',
  'combatHub.maxHpAria': 'Max HP {v}: what it is',
  'combatHub.defense': 'Defense',
  'combatHub.moveSpeed': 'Move speed',
  'combatHub.sharedPoint': '{n} shared point to spend',
  'combatHub.sharedPoints': '{n} shared points to spend',
  'combatHub.dpsTreeAria': 'DPS {v}: open what makes it',
  /* v2.3.6783 (card UI3-combat): a tile's words for a screen reader while its gold "+" shows */
  'combatHub.plusAria': '{text}, points to spend',
});
