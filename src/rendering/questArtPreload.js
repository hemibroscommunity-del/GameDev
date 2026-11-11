/* ═══ v2.3.3030: THE QUEST WINDOWS' PAINTED ART, ON THE GATE ═══
 *
 * CLAUDE.md's preloading LAW applied to the quest windows' new look (the
 * owner's three sheets, cut into public/ui/quest/ by tools/ui/cut-quest-art.sh
 * and drawn by src/ui/panels/questArt.jsx).  DOM images, not Pixi textures --
 * the case controlsPreload.js and gestureCuePreload.js already make, written
 * down again here because a later reader assumes a DOM picture was forgotten.
 *
 * Why they would not be warm: nothing else draws them.  The first quest you
 * accept would open on a frame with no crest and no corners, and the first
 * claim's confirmation would draw its slots' glow and its "Rewards claimed!"
 * bar while the coins were already flying -- the moment the player is looking
 * at, which is the regression the law names.  The coin and XP pictures the
 * windows borrow from the HUD are warmed here too: the HUD may not have drawn
 * the XP one yet.
 *
 * The whole set is ~0.35 MB of webp and ~3 MB decoded.  decode() and the
 * Images HELD, as in controlsPreload.js (an unreferenced decoded image is
 * collectable under memory pressure).
 */
import { QUEST_ART_URLS, QUEST_COIN, QUEST_XP } from '../ui/panels/questArt.jsx';
import { PROG3_SKILL_META } from '../data/prog3.js';
import { warmOnce } from './warmOnce.js';   /* v2.3.4652 */

const _held = [];

/* v2.3.4652: once a page, not once a join (warmOnce.js says why); a failed
   warm never fails the gate: the picture fetches at use */
const warm = warmOnce(_held);

export function questArtPreloadUrls() {
  const urls = QUEST_ART_URLS.concat([QUEST_COIN, QUEST_XP], PROG3_SKILL_META.map((s) => s.iconSrc));
  return [...new Set(urls)];
}

export function preloadQuestArt() {
  return Promise.all(questArtPreloadUrls().map(warm));
}
