/* v2.3.6870: People · Chat and People · Ranks in the new panel, their own
   words (card MN step 11; docs/design/menus3/SPEC.md "Other Players";
   docs/specs/player-words.md).  The friends' thread reads the Friends
   page's lines (data/say/socialDash.js); the boards their own
   (data/say/leaderboard.js, dash/rankWords.js). */
export const SAY = Object.freeze({
  'menus3Chat.all': 'All',
  'menus3Chat.area': 'Area',
  'menus3Chat.party': 'Party',
  'menus3Chat.whispers': 'Whispers',
  'menus3Chat.news': 'News',
  'menus3Chat.tabsAria': 'Chat channels',
  'menus3Chat.toAll': 'Message everyone…',
  'menus3Chat.toArea': 'Message this area…',
  'menus3Chat.toParty': 'Message your party…',
  'menus3Chat.toWhisper': 'Whisper to {name}…',
  'menus3Chat.toWhisperNone': 'Pick who to whisper to first',
  'menus3Chat.whisperTo': 'Whisper to (one name)',
  'menus3Chat.whisperToAria': 'Who the whisper goes to',
  'menus3Chat.send': 'Send',
  'menus3Chat.emotes': 'Emotes',
  'menus3Chat.mic': 'Speak instead of typing',
  'menus3Chat.micOn': 'Listening… tap to stop',
  'menus3Chat.empty': 'No messages yet.',
  'menus3Chat.newsEmpty': 'Nothing yet. News from the game shows up here.',
  'menus3Chat.newsRead': 'News is read only.',
  'menus3Chat.onScreen': 'Show on screen',
  'menus3Chat.offScreen': 'Hide from screen',
  'menus3Chat.newsHow': 'To silence them all, tap Settings, then Notifications.',
  'menus3Chat.friends': 'Friends’ messages',
  'menus3Chat.friendsNone': 'Messages with a friend show here once you are friends both ways.',
  'menus3Chat.whisperLines': 'Whispers',
  'menus3Chat.unread': '{n} new',
  'menus3Chat.thread': 'Messages',
  'menus3Chat.offline': 'Not connected: nothing is sent.',
  'menus3Chat.ranksGroupsAria': 'Kinds of leaderboard',
  'menus3Chat.ranksBoardsAria': 'Leaderboards',
  'menus3Chat.ranksNone': 'No leaderboards yet.',
});
