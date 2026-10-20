/* ═══ v2.3.3481: THE OWNER'S CHOSEN ICONS ═══
 *
 * The owner, 2026-10-19, uploaded thirteen ChatGPT sheets of UI art
 * (assets/icons-source/owner-2026-10-19/).  A review page set the nine places
 * where one of them fills an empty spot or replaces a wrong picture beside
 * what the game shows today, and the owner answered: "Icon picks: 1b, 2a, 3,
 * 4, 5, 6, 8, 9".  They are cut by tools/ui/cut-owner-icons.py, and this is
 * where the game finds them (docs/specs/owner-icons.md):
 *   1b  LAND_SCENE: each of the Wheel's eight lands, its scene over the land
 *       banner's name plate as you cross into it (ui/zoneBannerOverlay.js
 *       noteWheelLand); loaded behind the Wheel's loading screen and let go on
 *       leaving it (rendering/zoneBannerPreload.js);
 *   2a  the Gladiator Arena window's helmet (was the Saloon's beer mug);
 *   3   the trade request card's handshake (warmed with the controls: the card
 *       pops up in the middle of play);
 *   4   QUEST_PIN: the pins over a townsperson, canvas textures loaded on the
 *       loading screen (rendering/preloadAnimations.js questPins);
 *   5   the sack beside the Gambling Den's weekly jackpot;
 *   6   the pet house at the start of the Pets page's "Pet House" row;
 *   8   the prize wheel on the Daily Rewards window's free spin row;
 *   9   the treasure map on the empty Journey page.
 * v2.3.3514: and the hammer off the gold "Craft" button of the crafting sheet,
 * for the Blacksmith's Upgrade tab -- the owner's playtest note: "Make the
 * upgrade tab icon different for smithing.  Like a hammer" (it wore the
 * currency strip's gold gem).
 * OWNER_ICON's w and h are the CSS px each is drawn at -- its picture's own
 * shape, written at about three times that (a 3x phone).
 *
 * No imports: node-tested (server/test/owner-icons.test.mjs).
 */
const V = '?v=2.3.3481';

/* Keyed by the plan's region ids, which reach here from the game's state:
   a null prototype, so '__proto__' or 'toString' is no land (CLAUDE.md) */
const SCENES = Object.create(null);
for (const land of ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant']) {
  SCENES[land] = '/ui/banners/land-' + land + '.webp' + V;
}
export const LAND_SCENE = Object.freeze(SCENES);

/** The scene picture of Wheel land `id`, or null (the town, the commons, the
 *  sea, anything else). */
export function landSceneUrl(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(LAND_SCENE, id) ? LAND_SCENE[id] : null;
}

const icon = (name, w, h, v) => Object.freeze({ src: '/icons/ui/' + name + '.webp' + (v || V), w, h });
export const OWNER_ICON = Object.freeze({
  arenaHelmet: icon('arena-helmet', 24, 28),
  tradeHandshake: icon('trade-handshake', 40, 26),
  jackpotSack: icon('jackpot-sack', 64, 69),
  petHouse: icon('pet-house', 40, 33),
  prizeWheel: icon('prize-wheel', 34, 37),
  journeyMap: icon('journey-map', 120, 69),
  smithHammer: icon('smith-hammer', 22, 21, '?v=2.3.3493'),   /* v2.3.3514: the Blacksmith's Upgrade tab */
});

/* The quest pins over a townsperson, by the state entityRenderer reads off
   npc._questMarker: '❗' offer, '❔' waiting, '❓' ready.  Waiting is the GREY
   copy (the owner: a waiting quest wears a grey "?" so it never looks ready);
   the gold one beside it on disk is not loaded.  Each file is one 72 x 86
   frame, drawn QUEST_PIN_WORLD world px. */
export const QUEST_PIN = Object.freeze({
  offer: '/ui/quest/pin-offer.webp' + V,
  waiting: '/ui/quest/pin-waiting-grey.webp' + V,
  ready: '/ui/quest/pin-ready.webp' + V,
});
export const QUEST_PIN_WORLD = Object.freeze({ w: 32, h: 38 });
