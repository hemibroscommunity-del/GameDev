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

const _held = [];

function warm(url) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => { _held.push(img); resolve(img); };
      if (typeof img.decode === 'function') img.decode().then(done, done);
      else done();
    };
    /* a failed warm must never fail the gate: the <img> falls back to an
       ordinary fetch when the window opens */
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function questArtPreloadUrls() {
  const urls = QUEST_ART_URLS.concat([QUEST_COIN, QUEST_XP], PROG3_SKILL_META.map((s) => s.iconSrc));
  return [...new Set(urls)];
}

export function preloadQuestArt() {
  return Promise.all(questArtPreloadUrls().map(warm));
}
