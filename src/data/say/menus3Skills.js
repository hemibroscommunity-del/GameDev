/* v2.3.6865: Bro · Skills in the new panel, its own words (card MN step 6;
   docs/design/menus3/SPEC.md "You"; docs/specs/player-words.md).  A skill's
   level, XP and unlocks are Life Skills' own words (data/say/lifePage.js),
   read from there; the guild's are today's guild window's
   (ui/panels/GuildPanel.jsx), moved here as they read. */
export const SAY = Object.freeze({
  'menus3Skills.guildLine': 'Progress through guild ranks to earn titles and AP',
  'menus3Skills.master': 'Guildmaster: {name}',
  'menus3Skills.nextRank': 'Next: {title} (Lv {lvl})',
  'menus3Skills.maxRank': 'Max rank',
  'menus3Skills.ranks': 'Guild ranks',
  'menus3Skills.rankRow': '{title} (Lv {lvl})',
  'menus3Skills.rankAp': '+{ap} AP',
  'menus3Skills.got': 'Reached',
  'menus3Skills.locked': 'Not yet',
  'menus3Skills.quest': 'Guild quest',
  'menus3Skills.questProgress': 'Progress: Lv {now}/{need}',
  'menus3Skills.questReward': 'Reward: {gold} gold, +{ap} AP',
  'menus3Skills.questReady': 'Ready to claim',
  'menus3Skills.claim': 'Claim reward',
  'menus3Skills.claiming': 'Claiming\u2026',
  'menus3Skills.notOpen': 'Not open yet',
  'menus3Skills.offline': 'Not connected: try again in a moment',
  'menus3Skills.allDone': 'All guild quests completed! You are a {rank} of the {guild}.',
  'menus3Skills.titles': 'Earned titles',
  'menus3Skills.q10': 'Welcome to the guild. Work hard and you\u2019ll rise.',
  'menus3Skills.q25': 'You\u2019re making progress. Keep at it.',
  'menus3Skills.q50': 'Impressive dedication. The guild honors your commitment.',
  'menus3Skills.q75': 'Few reach this level. You are a true craftsman.',
  'menus3Skills.q100': 'A master walks among us. The guild bows to your skill.',
  'menus3Skills.qMax': 'You have transcended mortal limits. Legendary.',
  'menus3Skills.readyRow': '{guild} \u00B7 Reward ready',
});
