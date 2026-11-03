/* ═══ v2.3.4048: THE TOWNSFOLK GO BY NICKNAMES ═══
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
export const FOLK_NICKNAMES = Object.freeze({
  'Gavel Greg': 'Going-Going',       /* the auctioneer who never stops */
  'Old Man Reel': 'Fish Tales',      /* his fish grow every telling */
  'Tourist Terry': 'Selfie',         /* the lost tourist */
  'Sheriff Buck': 'Badge',           /* the mall cop with a bought badge */
  'Guildmaster Gary': 'Tryhard',     /* the raid leader who takes it too seriously */
  'Deed Dave': 'Swampy',             /* the swamp-selling realtor */
  'Postmaster Pete': 'Snail Mail',   /* the slowest clerk alive */
  'Chef Blaze': 'Sizzle',            /* the shouting TV chef */
});

/** The name a player reads for the townsperson keyed `name` (NPC_DATA's
 *  `name`): his nickname, else the name itself.  Anything that is not a
 *  non-empty string comes back as it was, so a caller's fallback still
 *  works (`folkDisplayName(quest.npc) || 'its giver'`). */
export function folkDisplayName(name) {
  if (typeof name !== 'string' || !name) return name;
  return Object.prototype.hasOwnProperty.call(FOLK_NICKNAMES, name) ? FOLK_NICKNAMES[name] : name;
}
