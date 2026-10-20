/* ═══ v2.3.3504: ACHIEVEMENTS -- WHAT THE PAGE SAYS ABOUT EACH ONE ═══
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

/* v2.3.3504: THE OWNER'S BADGES -- "I think this is everything", then their
   two painted sheets (2026-10-19), cut by tools/ui/cut-achievement-badges.py
   into public/icons/achievements/<id>.webp, 150 px square: three times the 50
   CSS px of the card's rarest box, the biggest place one is drawn (a page row
   30, the banner 40, the card's title chip 24).  `achievements.webp` is the
   page's own medal (More's tile, the empty page).  Was a picture borrowed from
   elsewhere in the game for each.  A re-cut changes ACHV_BADGE_V, so no phone
   keeps the old one. */
export const ACHV_BADGE_V = '2.3.3504';
export function achvBadgeSrc(id) {
  return '/icons/achievements/' + id + '.webp?v=' + ACHV_BADGE_V;
}
export const ACHV_MEDAL_SRC = achvBadgeSrc('achievements');

/* The order the page lists them in: by tier, then as written.
   `count`: the row says how many times (a second Gladiator crown pays gold,
   not points, and counts here); the worker counts only these.
   `clue`: the row's one line, short enough for a phone (the owner's ChatGPT
   review, 2026-10-19: "Clear the Great Cave, the Foundry Dome and the Buried
   City" wrapped a row to three lines); `how`: the whole of it, shown when the
   row is opened.
   `icon`: its own badge, from the owner's two painted sheets (below);
   `glyph` if it fails. */
export const ACHIEVEMENTS = Object.freeze([
  { id: 'first_blood', tier: 'common', name: 'First Blood', clue: 'Defeat your first monster', how: 'Defeat your first monster.', icon: achvBadgeSrc('first_blood'), glyph: '🗡️' },
  { id: 'combat_10', tier: 'common', name: 'Blooded', clue: 'Melee, Bow or Magic to Lv 10', how: 'Raise Melee, Bow or Magic to level 10.', icon: achvBadgeSrc('combat_10'), glyph: '⚔️' },
  { id: 'first_dungeon', tier: 'common', name: 'Into the Dark', clue: 'Clear a Wheel dungeon', how: 'Clear a dungeon in the Wheel.', icon: achvBadgeSrc('first_dungeon'), glyph: '🕳️', count: true },
  { id: 'first_pet', tier: 'common', name: 'Gotcha', clue: 'Catch a pet in a trap', how: 'Catch your first pet in a trap.', icon: achvBadgeSrc('first_pet'), glyph: '🐾' },
  { id: 'first_order', tier: 'common', name: 'Farmhand', clue: 'Deliver a Feed & Seed order', how: 'Deliver an order at the Feed & Seed.', icon: achvBadgeSrc('first_order'), glyph: '🌾', count: true },
  { id: 'first_duel', tier: 'common', name: 'Duelist', clue: 'Win a duel', how: 'Win a duel.', icon: achvBadgeSrc('first_duel'), glyph: '🤺', count: true },
  { id: 'nml_kill', tier: 'common', name: 'Outlaw', clue: 'Defeat a player in No man\'s land', how: "Defeat a player in No man's land.", icon: achvBadgeSrc('nml_kill'), glyph: '💀', count: true },
  { id: 'story_done', tier: 'rare', name: 'Storyteller', clue: 'Finish every story quest', how: 'Finish every story quest.', icon: achvBadgeSrc('story_done'), glyph: '📜' },
  { id: 'codex_all', tier: 'rare', name: 'Know Thy Enemy', clue: 'Defeat all 9 kinds of monster', how: 'Defeat all nine kinds of monster.', icon: achvBadgeSrc('codex_all'), glyph: '📚' },
  { id: 'elder_all', tier: 'rare', name: 'Elder Hunter', clue: 'All 9 kinds past Lv 20', how: 'Defeat all nine kinds past level 20.', icon: achvBadgeSrc('elder_all'), glyph: '🐉' },
  { id: 'dungeons_all', tier: 'rare', name: 'Delver', clue: 'Clear all 3 Wheel dungeons', how: 'Clear the Great Cave, the Foundry Dome and the Buried City.', icon: achvBadgeSrc('dungeons_all'), glyph: '🗝️' },
  { id: 'combat_50', tier: 'rare', name: 'Veteran', clue: 'Melee, Bow or Magic to Lv 50', how: 'Raise Melee, Bow or Magic to level 50.', icon: achvBadgeSrc('combat_50'), glyph: '⚔️' },
  { id: 'natural_one', tier: 'rare', name: 'Natural One', clue: 'A kill roll of exactly 1', how: 'Land a killing blow whose kill roll is 1 (1 in 10,000).', icon: achvBadgeSrc('natural_one'), glyph: '🎲', count: true },
  { id: 'iron_blade', tier: 'rare', name: 'Iron Great Sword', clue: 'An Iron Great Sword off a kill', how: 'Find an Iron Great Sword on a kill (1 in 500).', icon: achvBadgeSrc('iron_blade'), glyph: '🗡️', count: true },
  { id: 'golden_pet', tier: 'rare', name: 'Golden Catch', clue: 'Catch a golden pet', how: 'Catch a golden pet.', icon: achvBadgeSrc('golden_pet'), glyph: '✨', count: true },
  { id: 'elite_piece', tier: 'rare', name: 'Elite', clue: 'Find or forge Elite gear', how: 'Find or forge an Elite piece of gear.', icon: achvBadgeSrc('elite_piece'), glyph: '🔶', count: true },
  { id: 'gladiator', tier: 'arena', name: 'Gladiator', clue: 'Win the Gladiator Arena', how: 'Win the Gladiator Arena.', icon: achvBadgeSrc('gladiator'), glyph: '🏆', count: true },
  { id: 'tempered', tier: 'superrare', name: 'Perfectly Tempered', clue: 'Harden a weapon to H5', how: 'Harden a weapon all the way to H5.', icon: achvBadgeSrc('tempered'), glyph: '🔨', count: true },
  { id: 'golden_giant', tier: 'superrare', name: 'Golden Giant', clue: 'A golden pet that\'s big too', how: 'Catch a golden pet that is a big one too.', icon: achvBadgeSrc('golden_giant'), glyph: '🌟', count: true },
  { id: 'elite_iron', tier: 'superrare', name: 'Elite Iron', clue: 'An Elite Iron Great Sword off a kill', how: 'Find an Elite Iron Great Sword on a kill.', icon: achvBadgeSrc('elite_iron'), glyph: '⚔️', count: true },
  { id: 'house_limit', tier: 'superrare', name: 'Breaking the House', clue: 'Double the free spin to the limit', how: "Double the free spin's pot all the way to the house limit.", icon: achvBadgeSrc('house_limit'), glyph: '🎡', count: true },
  { id: 'combat_100', tier: 'superrare', name: 'Centurion', clue: 'Melee, Bow or Magic to Lv 100', how: 'Raise Melee, Bow or Magic to level 100.', icon: achvBadgeSrc('combat_100'), glyph: '👑' },
  { id: 'godly', tier: 'superrare', name: 'Godly', clue: 'Find or forge Godly gear', how: 'Find or forge a Godly piece of gear.', icon: achvBadgeSrc('godly'), glyph: '🌈', count: true },
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
