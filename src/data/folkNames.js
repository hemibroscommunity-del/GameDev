/* ═══ v2.3.4048: THE TOWNSFOLK GO BY NICKNAMES (v2.3.4088: no longer: the
 * owner asked for the old names back -- the map below is empty) ═══
 *
 * The owner: "Instead of names like 'gavel Greg' it would be more humorous to
 * just have them go by nicknames. I didn't mean to remake all the NPCs to be
 * like gavel Greg. The way their appearance looks now is fine."
 *
 * So the eight with a "job + first name" name go by a nickname ON SCREEN, the
 * way Ace, Slim, Glint, Bean and Sterling always have -- and nothing else
 * about them changes: their looks, their spots and their lines are as they
 * were.
 *
 * THE KEY IS THE OLD NAME, AND IT STAYS.  NPC_DATA `name`, WHEEL_KEEPERS,
 * WHEEL_TOWNSFOLK, NPC_LOOKS / npcLookByName, the voices, the reactions, the
 * quests and the tests all key on it; renaming the key would touch every one
 * of them.  This map is only what a player READS: every place a townsperson's
 * name reaches the screen (his name plate, a dialogue's title, a map pin's
 * label, a quest's "Talk to ...") asks folkDisplayName(name).
 *
 * TO CHANGE A NICKNAME: change its one line below (the right-hand side).
 * Nothing else needs to change.  Someone not listed shows his own name.
 *
 * No imports, so node (server/test/folk-names.test.mjs) and the rules in
 * src/game/ can read it.
 */
/* v2.3.4088: EMPTY.  The owner, 2026-11-03: "Revert the nicknames and go back
   to the other names, I liked them better other way."  Every townsperson
   shows his own name again (Gavel Greg, Old Man Reel, Tourist Terry, Sheriff
   Buck, Guildmaster Gary, Deed Dave, Postmaster Pete, Chef Blaze).  Do not
   bring nicknames back unless the owner asks.  The map and the helper stay so
   the screens keep one door for a shown name (and a future rename is one
   line again): a name not in the map is shown as it is. */
export const FOLK_NICKNAMES = Object.freeze({});

/** The name a player reads for the townsperson keyed `name` (NPC_DATA's
 *  `name`): his nickname, else the name itself.  Anything that is not a
 *  non-empty string comes back as it was, so a caller's fallback still
 *  works (`folkDisplayName(quest.npc) || 'its giver'`). */
export function folkDisplayName(name) {
  if (typeof name !== 'string' || !name) return name;
  return Object.prototype.hasOwnProperty.call(FOLK_NICKNAMES, name) ? FOLK_NICKNAMES[name] : name;
}
