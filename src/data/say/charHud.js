/* v2.3.6781: the character HUD's words, top left (src/ui/hud/CharacterHud.jsx,
   src/game/charHud.js; card UI3 PR 2; docs/specs/player-words.md).  The
   weapon's own word is Combat's (say/combatHub.js: Sword, Bow, Staff), so the
   HUD and the Combat page can never name a weapon two ways. */
export const SAY = Object.freeze({
  /* "Lv 23": the combat level, beside the name */
  'charHud.level': 'Lv {n}',
  /* the bar at the cap: every weapon at the last level */
  'charHud.max': 'Max',
  /* the whole HUD is one button: it opens Bro (say() makes "Tap" "Click" on a computer) */
  'charHud.open': 'Tap to open Bro',
  'charHud.aria': '{name}, level {n}: open Bro',
  /* the one-line quest tracker under the HUD, between two quests: how many
     others have work for you (the card's long "+5 more: look for..." in short) */
  'charHud.more': '+{more} more',
});
