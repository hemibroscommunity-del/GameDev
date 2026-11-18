/* v2.3.6325: the Bro sheet's words (src/ui/mobile/sheet/HeroExpanded.jsx: its
   Equipment and Points windows; docs/specs/player-words.md, wave W1).  One leaf
   file a screen, no imports: every key starts with its screen's name, and
   tools/guards/say.test fails a key two files define. */
export const SAY = Object.freeze({
  /* a stat's points, with or without its cap (ptsOf) */
  'heroExpanded.statPoints': { one: '{n} point', other: '{n} points' },
  'heroExpanded.statPointsOfCap': '{pts} of {cap} points',
  'heroExpanded.statPtsOfCap': '{pts} of {cap}',

  /* the windows' names, and the Shared column */
  'heroExpanded.tabCard': 'Bro',
  'heroExpanded.tabOverview': 'Equipment',
  'heroExpanded.tabBuild': 'Points',
  'heroExpanded.sharedLane': 'Shared',

  /* the stat pills and vitals (read aloud) */
  'heroExpanded.pillAsk': '{stat} {value} — what is this?',
  'heroExpanded.vitalAsk': '{vital} {cur} of {max}: what it is made of',

  /* the window's head */
  'heroExpanded.tabToSpend': '{n} to spend',
  'heroExpanded.closeAria': 'Close {window}',
  'heroExpanded.close': 'Close',

  /* the Equipment window's selected slot */
  'heroExpanded.changeButton': 'CHANGE',
  'heroExpanded.removeButton': 'REMOVE',
  'heroExpanded.slotEmpty': 'Nothing equipped here.',
  'heroExpanded.slotNoStats': 'No stat bonuses.',

  /* a stat's window: why a spend is refused */
  'heroExpanded.spendElsewhere': 'This character is playing in another window.',
  'heroExpanded.spendReconnecting': 'Reconnecting to the server. Try again in a moment.',
  'heroExpanded.spendNoPoints': 'No {pool} points to spend.',
  'heroExpanded.spendPoolLane': 'lane',
  'heroExpanded.spendPoolUnspent': 'unspent',
  'heroExpanded.spendAtCap': '{stat} is already at its cap.',

  /* a stat's window: its numbers */
  'heroExpanded.perPointBody': '{perText} per point.',
  'heroExpanded.rowCritChance': 'Crit chance',
  'heroExpanded.rowCritDamage': 'Crit damage',
  'heroExpanded.rowDps': 'DPS',
  'heroExpanded.dpsNoChange': 'does not change damage',
  'heroExpanded.dpsNoWeapon': 'equip a weapon to see',
  'heroExpanded.titleSharedTail': ' · Shared',
  'heroExpanded.eachPoint': 'Each point: {perText}',
  'heroExpanded.chipFades': 'Weaker vs. higher levels',
  'heroExpanded.chipDetails': 'Details',
  'heroExpanded.spendButton': 'Spend point',
  'heroExpanded.spentNote': { one: '✓ {n} point spent', other: '✓ {n} points spent' },
  'heroExpanded.lanePickShared': 'Unspent Points',

  /* a column head's explainer */
  'heroExpanded.sharedInfoTitle': 'Shared — Level {level}',
  'heroExpanded.sharedInfoBodyCaps': 'Every level-up in any combat skill also earns shared points. They buy the stats that belong to your character rather than to one weapon: HP, Defense, Mana, Stamina, Dodge, Speed and Resist.',
  'heroExpanded.sharedInfoBody': 'The stats that belong to your character rather than to one weapon: HP, Defense, Mana, Stamina, Dodge and Resist. Any combat point can be spent here.',
  'heroExpanded.sharedInfoNote': { one: 'You have {n} shared point to spend.', other: 'You have {n} shared points to spend.' },
  'heroExpanded.sharedInfoNoteNone': 'Level up any combat skill to earn more.',
  'heroExpanded.laneInfoTitle': '{skill} — Level {level}',
  'heroExpanded.laneInfoBody': "Its points buy only this weapon's six stats: Range, Power, Speed, Luck, Special and Elemental.",
  'heroExpanded.laneInfoNote': { one: 'You have {n} {lane} point to spend.', other: 'You have {n} {lane} points to spend.' },
  'heroExpanded.laneInfoNoteNone': 'Fight with a {lane} weapon to earn more.',

  /* a lane's tile and its open card's head */
  'heroExpanded.laneAria': '{lane}, level {level}',
  'heroExpanded.laneTitle': {
    one: '{lane} — level {level} — {n} point to spend — {spent} already applied',
    other: '{lane} — level {level} — {n} points to spend — {spent} already applied',
  },
  'heroExpanded.laneToSpendAria': '{n} points to spend on {lane}',
  'heroExpanded.laneCount': { one: '{n} PT', other: '{n} PTS' },
  'heroExpanded.laneSpentAria': '{n} points applied to {lane}',
  'heroExpanded.laneSpent': '{n} SPENT',

  /* a stat's cell (read aloud, and its long-press) */
  'heroExpanded.statAria': '{stat}{lane}, {pts}. {perText}{perPoint}.',
  'heroExpanded.statLane': ' for {lane}',
  'heroExpanded.perPointTail': ' per point',
  'heroExpanded.statTitle': '{stat} — {pts} — now {now} — {perText}{perPoint}',
  'heroExpanded.statApplied': '{stat}{lane}: {pts} applied',

  /* the Points grid's heads */
  'heroExpanded.headLaneAria': '{lane}, level {level}. {pools}',
  'heroExpanded.headPool': '{lane} {n} to spend',
  'heroExpanded.headSharedAria': 'Shared, level {level}. {n} to spend',
  'heroExpanded.headLaneTip': 'Tap a weapon to see its points',
  'heroExpanded.headSharedTip': 'Shared stats',
  'heroExpanded.showLanePoints': "Show {lane}'s points",

  /* a computer's Points list */
  'heroExpanded.deskAttackSpeed': 'Attack Speed',
  'heroExpanded.deskNow': 'Now {now}',
  'heroExpanded.deskCharacterHead': 'Character · every weapon',

  /* a lane's open card */
  'heroExpanded.backAria': 'Back to categories',
  'heroExpanded.backWord': ' Back',
  'heroExpanded.laneCountTail': ' AVAILABLE',
  'heroExpanded.laneAbout': 'About {lane}',
  'heroExpanded.laneInfoGlyph': 'i',

  /* the free reset */
  'heroExpanded.resetArmed': 'Tap again: every point comes back',
  'heroExpanded.resetButton': '↺ Reset points (free)',

  /* the old Build screen (no prog3) */
  'heroExpanded.oldBuildHead': 'BUILD POINTS',
  'heroExpanded.oldBuildAvailable': '{n} AVAILABLE',
  'heroExpanded.oldTileLevel': 'Lv {level}',
});
