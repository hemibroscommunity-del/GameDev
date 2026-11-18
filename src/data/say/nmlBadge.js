/* v2.3.6346: No man's land's words, its rules window and the minimap plate's tap (src/ui/mobile/NmlBadge.jsx; docs/specs/player-words.md, wave W1) */
export const SAY = Object.freeze({
  /* a ring's monster levels */
  'nmlBadge.levels': 'Lv {lo}–{hi}',
  /* the rules window */
  'nmlBadge.titleSteps': 'No man\'s land {ring} · Lv {lv} monsters',
  'nmlBadge.title': 'No man\'s land {ring} · {levels}',
  'nmlBadge.rules': 'The rules',
  'nmlBadge.within': { one: '{n} level', other: '{n} levels' },
  'nmlBadge.whoLabel': 'Who:',
  'nmlBadge.who': '{label} players within {within} of yours, while they stand in No man\'s land too. The lower of your two numbers counts, and it grows the further you go from town. Your party never.',
  'nmlBadge.howLabel': 'How:',
  'nmlBadge.how': '{label} tap a player, or swing or shoot at them, and choose {attack}. Until you do, your blows never hurt them.',
  'nmlBadge.attack': 'Attack',
  'nmlBadge.firstLabel': 'Attack first:',
  'nmlBadge.first': '{label} you become an {outlaw} (a red skull) for 20 minutes of play, starting over with every hit. Beaten by a player then, you lose {everything}, worn gear too; killed by a monster, everything but what you wear.',
  'nmlBadge.outlawWord': 'outlaw',
  'nmlBadge.everything': 'everything',
  'nmlBadge.attackedLabel': 'Get attacked:',
  'nmlBadge.attacked': '{label} a {skull}. To hit back, swing, shoot or tap them and choose {attack} once: hitting back never makes you an outlaw.',
  'nmlBadge.whiteSkull': 'white skull',
  'nmlBadge.safeLabel': 'Keep things safe:',
  'nmlBadge.safe': '{label} the Bank in BroTown holds gold and things, out of reach of any death. Diego sells a lost tool back.',
  'nmlBadge.leave': 'Walk back toward BroTown to leave.',
  'nmlBadge.redSkull': 'You carry a red skull: {min} min of play left.',
  'nmlBadge.whiteSkullLeft': 'You carry a white skull: {min} min of play left.',
  /* the window off No man's land */
  'nmlBadge.outlaw': 'Outlaw',
  'nmlBadge.safeTitle': '{place} · Safe',
  'nmlBadge.pastSafe': 'Out past the safe ground is No man\'s land, where other players can attack you. The minimap\'s name plate says so there, in red; tap it for who can attack you.',
  /* the plate's tap */
  'nmlBadge.plateOutlaw': 'Outlaw: you attacked a player first, {min} minutes left. Tap for what it means.',
  'nmlBadge.plateNml': 'No man\'s land {ring}: players can attack you here. Tap for what it means.',
});
