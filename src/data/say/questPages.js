/* v2.3.6620: the Quests tab's pages' words (src/ui/mobile/dash/QuestPages.jsx; card QP; docs/specs/player-words.md).
   A quest's own words (what to do, where, the steps, the rewards, what is next) are the journal's
   (game/questJournal.js journalPage); these are the pages' labels around them. */
export const SAY = Object.freeze({
  /* the top row: the tabs and the page marks */
  'questPages.tabActive': 'Active ({n})',
  'questPages.tabDaily': 'Daily',
  'questPages.tabDone': 'Completed',
  'questPages.tabsAria': 'Your quests',
  'questPages.markQuest': 'Quest',
  'questPages.markJourney': 'Journey',
  'questPages.markRewards': 'Rewards',
  'questPages.marksAria': 'Pages of this quest',
  /* page 1 */
  'questPages.rewards': 'Rewards',
  'questPages.nowAria': 'What to do now: {now}. Tap to see the quest journey',
  'questPages.rewardsAria': 'Rewards. Tap to see them and what comes next',
  /* page 2 */
  'questPages.journey': 'Quest journey',
  'questPages.handIn': 'Hand it in to {npc}',
  /* page 3 */
  'questPages.completion': 'Completion rewards',
  'questPages.next': 'Next quest',
  'questPages.nextAfter': 'Available after {title}',
  /* the tiles */
  'questPages.ap': '+{ap} AP',
  /* the picker */
  'questPages.pickAria': 'Pick another quest',
  'questPages.pickActive': 'Active',
  'questPages.pickAvailable': 'Available',
  'questPages.back': 'Back',
  /* v2.3.6691 (card UI2-quests): the frame's Quests pages (dash/QuestsLanding.jsx, dash/QuestPage.jsx) */
  'questPages.landAria': 'Your quests in hand',
  'questPages.rowAria': '{title}. Open this quest',
  'questPages.ready': 'Ready',
  'questPages.doorDaily': 'Daily',
  'questPages.doorDone': 'Completed ({n})',
  'questPages.doorOffers': 'On offer ({n})',
  'questPages.now': 'Now',
  'questPages.continues': 'The adventure continues',
  'questPages.done': 'Done',
  'questPages.track': 'Track',
  'questPages.tracked': 'Tracked',
  'questPages.showOnMap': 'Show on map',
  'questPages.showOnMapShort': 'Map',   /* sideways, beside NOW */
  'questPages.rewardsDoor': 'Rewards',
  'questPages.noRewards': 'This quest names no reward.',
  'questPages.gone': 'This quest is not in your journal any more.',
  'questPages.offersNone': 'Nobody has a quest for you right now.',
});
