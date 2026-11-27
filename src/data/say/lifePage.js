/* v2.3.6694: Life Skills under the new frame (card UI2-life, the build's step 6:
   src/ui/mobile/sheet/LifeSkillsPage.jsx, LifeSkillPage.jsx, LifeUnlocks.jsx; the rules
   src/game/lifeProfile.js; docs/specs/player-words.md).  ONE headline, "Total level",
   the sum of the ten levels on screen.  No label of what kind of player you are and
   no radar (the specification's 4.1: theirs to define with the owner); a rung's words
   are the game's own names ("Lv 5: Clownfish"); nothing here promises an unlock the
   game does not have. */
export const SAY = Object.freeze({
  'lifePage.total': 'Total level',
  'lifePage.totalAria': 'Total level {n}: the ten life skills added up',
  'lifePage.lv': 'Lv {n}',
  'lifePage.tileAria': '{name}, level {n}',
  'lifePage.tileAriaNew': '{name}, level {n}, a new level to see',
  'lifePage.xp': '{now} / {need} XP',
  'lifePage.xpLeft': '{left} XP to Lv {next}',
  'lifePage.next': 'Next unlock',
  'lifePage.latest': 'Latest unlock',
  'lifePage.unlockAt': 'Lv {lvl}: {name}',
  'lifePage.unlockAtMore': 'Lv {lvl}: {name} +{more}',
  'lifePage.allReached': 'Every unlock reached',
  'lifePage.noneYet': 'None yet',
  'lifePage.noLadder': 'No unlocks by level',
  'lifePage.allUnlocks': 'All unlocks ({n})',
  'lifePage.how': 'How it works',
  'lifePage.guildAria': '{guild}: {rank}. Open Guilds',
  'lifePage.rungLv': 'Lv {n}',
  'lifePage.got': 'Got',
  'lifePage.nextState': 'Next',
  'lifePage.later': 'Later',
});
