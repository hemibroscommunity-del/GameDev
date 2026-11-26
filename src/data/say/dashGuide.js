/* v2.3.6682: the words that point the way under the new frame (card UI2-frame PR 2; docs/specs/player-words.md).
   The frame moved the buttons they name: Bro is a tile on the Menu's root, Gear and the Menu the two buttons
   of the closed row, Account a tile under Settings.  Each is said only where its control is on screen (the
   selector finds it); under ?ui2=0 the old words stand.  "Tap" reads "click" on a computer (deskWords). */
export const SAY = Object.freeze({
  /* the guide arrow (src/ui/guideArrow.js): its points lesson */
  'dashGuide.arrowBro': 'Tap Bro: points to spend',
  'dashGuide.arrowMenuBro': 'Tap Menu, then Bro: points to spend',
  /* the quest coach's points lesson (src/ui/mobile/QuestCoach.jsx; the count is pointsTips.js pointsWaiting's) */
  'dashGuide.pointsBro': { one: 'You have 1 point to spend. Tap Bro.', other: 'You have {n} points to spend. Tap Bro.' },
  'dashGuide.pointsMenu': { one: 'You have 1 point to spend. Tap Menu, then Bro.', other: 'You have {n} points to spend. Tap Menu, then Bro.' },
  /* the coach's "your reward" after the first hand-in (src/ui/mobile/QuestCoach.jsx) */
  'dashGuide.rewardGear': 'Mayor Bro paid you in gear. Tap Gear to find it.',
  /* the coach's "save your Login Key" (QuestCoach.jsx): Account is under Settings in the Menu */
  'dashGuide.keyAccount': 'Your Login Key is the ONLY way back to this character. Open it and save it somewhere.',
  'dashGuide.keySettings': 'Settings > Account. Your Login Key is the only way back to this character. Save it somewhere.',
  'dashGuide.keyMenu': 'Menu > Settings > Account. Your Login Key is the only way back to this character. Save it somewhere.',
});
