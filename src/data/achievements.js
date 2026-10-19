/* ═══ v2.3.3485: ACHIEVEMENTS -- WHAT THE PAGE SAYS ABOUT EACH ONE ═══
 *
 * The owner, 2026-10-19: "Achievement points are something I'd like in the
 * game. You get it by completing the game. Some of them are through super
 * rare achievements. Although not as rare, an arena winner should be included
 * in that."  Then, to the plan's six questions, "Go recommended on
 * everything": common 10 AP, rare 100, the arena's 500, super-rare 1,000; the
 * arena's 500 once a character (later crowns count on its row); the
 * super-rares shown before they are earned; a banner and a sound for rare and
 * super-rare, a chat line for common; a duel win and a No man's land kill,
 * once each, common; the More page's Journey tile becomes Achievements.
 *
 * THE WORKER DECIDES EVERYTHING (server/src/achievements.js): which ones you
 * have, when, how many times, and the points.  This file is only the words
 * and the pictures for each row, and mirror-audit holds its ids, tiers and
 * counts to the worker's `ACHV.LIST` -- ids are APPEND-ONLY and never reused
 * (a stored record names them), as GUILD_QUESTS and FARM_CROP_IDS are.
 *
 * No imports: node-tested (server/test/achievements.test.mjs, mirror-audit).
 * Spec: docs/specs/achievements.md. */

/* The points each tier pays, and how it is named and coloured on the page --
   the grade colours the armour already wears (v2.3.3142: rare blue, elite
   orange, godly a rainbow): the arena's 500 is orange, between rare and
   super-rare, as the owner put it ("although not as rare"). */
export const ACHV_TIERS = Object.freeze({
  common: Object.freeze({ ap: 10, label: 'Common', color: '#A9B4BA' }),
  rare: Object.freeze({ ap: 100, label: 'Rare', color: '#5D93D2' }),
  arena: Object.freeze({ ap: 500, label: 'Arena', color: '#E8893A' }),
  superrare: Object.freeze({ ap: 1000, label: 'Super-rare', color: 'prismatic' }),
});

/* The order the page lists them in: by tier, then as written.
   `count`: the row says how many times (a second Gladiator crown pays gold,
   not points, and counts here); the worker counts only these.
   `icon`: a picture the game already has (the owner's own for these is a
   wishlist item, docs/ART-WISHLIST.md "Achievements"); `glyph` if it fails. */
export const ACHIEVEMENTS = Object.freeze([
  { id: 'first_blood', tier: 'common', name: 'First Blood', how: 'Defeat your first monster.', icon: '/icons/ui/hero/rec-kills.webp', glyph: '🗡️' },
  { id: 'combat_10', tier: 'common', name: 'Blooded', how: 'Raise Melee, Bow or Magic to level 10.', icon: '/icons/ui/hero/melee.webp', glyph: '⚔️' },
  { id: 'first_dungeon', tier: 'common', name: 'Into the Dark', how: 'Clear a dungeon in the Wheel.', icon: '/icons/ui/evt-dungeon.webp', glyph: '🕳️', count: true },
  { id: 'first_pet', tier: 'common', name: 'Gotcha', how: 'Catch your first pet in a trap.', icon: '/icons/ui/evt-pets.webp', glyph: '🐾' },
  { id: 'first_order', tier: 'common', name: 'Farmhand', how: 'Deliver an order at the Feed & Seed.', icon: '/icons/ui/bldg-farm.webp', glyph: '🌾', count: true },
  { id: 'first_duel', tier: 'common', name: 'Duelist', how: 'Win a duel.', icon: '/icons/ui/hero/rec-duels.webp', glyph: '🤺', count: true },
  { id: 'nml_kill', tier: 'common', name: 'Outlaw', how: "Defeat a player in No man's land.", icon: '/icons/ui/threat-skull.webp', glyph: '💀', count: true },
  { id: 'story_done', tier: 'rare', name: 'Storyteller', how: 'Finish every story quest.', icon: '/icons/ui/panel-quests.webp', glyph: '📜' },
  { id: 'codex_all', tier: 'rare', name: 'Know Thy Enemy', how: 'Defeat all nine kinds of monster.', icon: '/icons/ui/panel-encyclopedia.webp', glyph: '📚' },
  { id: 'elder_all', tier: 'rare', name: 'Elder Hunter', how: 'Defeat all nine kinds past level 20.', icon: '/icons/ui/panel-encyclopedia.webp', glyph: '🐉' },
  { id: 'dungeons_all', tier: 'rare', name: 'Delver', how: 'Clear the Great Cave, the Foundry Dome and the Buried City.', icon: '/icons/ui/evt-dungeon.webp', glyph: '🗝️' },
  { id: 'combat_50', tier: 'rare', name: 'Veteran', how: 'Raise Melee, Bow or Magic to level 50.', icon: '/icons/ui/hero/melee.webp', glyph: '⚔️' },
  { id: 'natural_one', tier: 'rare', name: 'Natural One', how: 'Land a killing blow whose kill roll is 1 (1 in 10,000).', icon: '/icons/popups/dice.webp', glyph: '🎲', count: true },
  { id: 'iron_blade', tier: 'rare', name: 'Iron Great Sword', how: 'Find an Iron Great Sword on a kill (1 in 500).', icon: '/icons/items/great-sword-iron.webp', glyph: '🗡️', count: true },
  { id: 'golden_pet', tier: 'rare', name: 'Golden Catch', how: 'Catch a golden pet.', icon: '/icons/ui/evt-pets.webp', glyph: '✨', count: true },
  { id: 'elite_piece', tier: 'rare', name: 'Elite', how: 'Find or forge an Elite piece of gear.', icon: '/icons/items/essence-elite-iron.webp', glyph: '🔶', count: true },
  { id: 'gladiator', tier: 'arena', name: 'Gladiator', how: 'Win the Gladiator Arena.', icon: '/icons/ui/arena-helmet.webp', glyph: '🏆', count: true },
  { id: 'tempered', tier: 'superrare', name: 'Perfectly Tempered', how: 'Harden a weapon all the way to H5.', icon: '/icons/ui/bldg-forge.webp', glyph: '🔨', count: true },
  { id: 'golden_giant', tier: 'superrare', name: 'Golden Giant', how: 'Catch a golden pet that is a big one too.', icon: '/icons/ui/evt-pets.webp', glyph: '🌟', count: true },
  { id: 'elite_iron', tier: 'superrare', name: 'Elite Iron', how: 'Find an Elite Iron Great Sword on a kill.', icon: '/icons/items/great-sword-iron.webp', glyph: '⚔️', count: true },
  { id: 'house_limit', tier: 'superrare', name: 'Breaking the House', how: "Double the free spin's pot all the way to the house limit.", icon: '/icons/ui/prize-wheel.webp', glyph: '🎡', count: true },
  { id: 'combat_100', tier: 'superrare', name: 'Centurion', how: 'Raise Melee, Bow or Magic to level 100.', icon: '/icons/ui/hero/melee.webp', glyph: '👑' },
  { id: 'godly', tier: 'superrare', name: 'Godly', how: 'Find or forge a Godly piece of gear.', icon: '/icons/items/essence-godly-iron.webp', glyph: '🌈', count: true },
].map((a) => Object.freeze({ count: false, ...a })));

const BY_ID = Object.create(null);
for (const a of ACHIEVEMENTS) BY_ID[a.id] = a;

/** The row for an id the worker sent, or null (an id this phone's copy does
 *  not know yet: a newer worker added it -- the page skips it). */
export function achvById(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(BY_ID, id) ? BY_ID[id] : null;
}

/** The points an achievement pays (its tier's). */
export function achvAp(id) {
  const a = achvById(id);
  return a ? ACHV_TIERS[a.tier].ap : 0;
}

/** "Rare" and "Super-rare" and the arena's get the banner and its sound;
 *  "Common" a line in the chat (the owner's "Go recommended", decision 4). */
export function achvBig(id) {
  const a = achvById(id);
  return !!a && a.tier !== 'common';
}

/** Every achievement's points added up: the most a character can earn. */
export const ACHV_TOTAL_AP = ACHIEVEMENTS.reduce((n, a) => n + ACHV_TIERS[a.tier].ap, 0);
