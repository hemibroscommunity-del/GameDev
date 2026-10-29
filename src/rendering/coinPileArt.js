/* ═══ v2.3.3734: THE OWNER'S COIN PILES, LOADED BEHIND THE LOADING SCREEN ═══
 *
 * The owner's fourteen piles (game/coinArt.js: an amount shows the pile whose
 * label is the largest at or under it) are drawn in the world -- the coins
 * lying on the ground (effectsRenderer _renderLoot / _renderCoinOverlay) and
 * the "+5 G" pickup number's mark -- and in the DOM from the first second
 * (the purse on the top bar, the bag, a quest's reward).  So all fourteen are
 * PRELOADED (CLAUDE.md §7, the law), on the global gate: a kill can drop any
 * amount anywhere.  The same <img>s warm the DOM's copies: the purse is on
 * the top bar from the first second, and a reward or a trade shows any pile.
 *
 * MEMORY (docs/MEMORY-MAP.md, the UI icon slot and "icon drawn in the
 * world"): each is a palette PNG of at most 112 x 112 px (29-46 KB decoded,
 * ~520 KB the fourteen), uploaded as it is; the <img> each texture is made
 * from is the same file the DOM's <img>s show, so the browser decodes it once
 * for both.  They are on 256 colours, but WITH a soft glow (partly
 * see-through px), which paletteTex.js's colour numbers do not keep -- so
 * they are ordinary textures, as gold.webp (168 x 170, 112 KB) was. */
import { Texture } from 'pixi.js';
import { COIN_PILES, coinPileFor } from '@/game/coinArt.js';

/* url -> Texture */
const TEX = new Map();

function load(url) {
  if (typeof Image === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => { try { TEX.set(url, Texture.from(img)); } catch (e) { /* the pile draws its stand-in */ } resolve(); };
      if (typeof img.decode === 'function') img.decode().then(done, done); else done();
    };
    /* a failed pile must never fail the loading gate: the ground pile keeps
       its drawn stand-in, the pickup number its words */
    img.onerror = () => resolve();
    img.src = url;
  });
}

let _p = null;
/** Registered in preloadWorldAnimations (the global gate). */
export function preloadCoinPiles() {
  if (!_p) _p = Promise.all(COIN_PILES.map((p) => load(p.url)));
  return _p;
}

/** The texture for an amount of coins (null until loaded). */
export function coinPileTexture(amount) {
  return TEX.get(coinPileFor(amount).url) || null;
}

if (typeof window !== 'undefined') {
  /* QA probe: which piles are loaded, and their size */
  window.__btCoinPiles = () => COIN_PILES.map((p) => {
    const t = TEX.get(p.url);
    return { min: p.min, url: p.url, loaded: !!t, w: t ? t.width : 0, h: t ? t.height : 0 };
  });
}
