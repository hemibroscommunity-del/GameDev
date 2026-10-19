/* ═══ v2.3.3018: THE TOUCH CONTROLS' PICTURES, ON THE GATE ═══
 *
 * CLAUDE.md's preloading LAW applied to the controls' new look (the owner's
 * mockup: a picture on every button, controlSkin.jsx).  They are DOM images,
 * not Pixi textures -- the same case gestureCuePreload.js makes for the
 * harvest cue's mini tools, and the same reason this file exists: a later
 * reader assumes a DOM picture was forgotten.
 *
 * Why they would NOT already be warm:
 *   - the attack disc keeps all of its pictures in the DOM and shows one by
 *     an attribute (controlSkin's RDISC_ICONS), and a picture is decoded the
 *     first time it is PAINTED -- so the first fight with a bow, the first
 *     tree, the first campfire would each decode on the frame the disc
 *     switched to it, mid-play;
 *   - the hero icons (sword, bow, staff, boot) are otherwise drawn only by the
 *     Character sheet, which a player may never have opened, and the skill
 *     icons only by the Skills panel;
 *   - the wood shield is a Pixi texture to the world renderer, which is not
 *     the browser's image cache an <img> reads from.
 * The controls appear at the moment the player is looking at them (a monster
 * walked into range), so a blank first frame there is the regression the law
 * names.
 *
 * decode() rather than onload, and the Images are HELD, for the reasons
 * levelUpBurstPreload.js gives: decode() means there is a bitmap to paint, and
 * an unreferenced decoded image is collectable under memory pressure.
 * (The whirlwind, starburst, bash burst and burst nova were SVG drawn in code,
 * nothing to fetch; since v2.3.3279 they are the owner's pictures, warmed
 * here with their grey copies.)
 */
import { ICON_URL, RDISC_ICONS, ABILITY_ART_URLS } from '../ui/panels/controlSkin.jsx';
import { smallIconDomUrls } from '../data/smallIcons.js';   /* v2.3.3279: the owner's small icons */
import { quickEatIconUrls } from '../data/foodIcons.js';   /* v2.3.3260: the quick-eat button's food */
import { OWNER_ICON } from '../data/ownerIcons.js';   /* v2.3.3481: the trade request's handshake */
/* v2.3.3120: the TRAP pop-up's picture (TrapButton.jsx uses the same string)
   v2.3.3281: the owner's box trap (tools/ui/cut-bag-icons.py), no longer the
   Trapping skill's icon -- the same picture in the bag, on the Woodworker's
   Traps tab and on the TRAP pop-up (docs/ART-WISHLIST.md "Box trap") */
export const TRAP_ICON_URL = '/icons/items/trap-box.webp?v=2.3.3281';

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
    /* A failed warm must never fail the gate: the <img> falls back to an
       ordinary fetch when the control shows. */
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function controlsPreloadUrls() {
  const urls = RDISC_ICONS.map((ic) => ic[1]);
  /* v2.3.3489: the wood shield sprite is no longer the Block button's picture
     (the owner's painted shield is, warmed in ABILITY_ART_URLS below) */
  urls.push(ICON_URL.boot);
  /* v2.3.3120: the TRAP pop-up's box trap (ui/panels/TrapButton.jsx) -- it
     pops up the moment a monster is targeted, the same moment as the rest */
  urls.push(TRAP_ICON_URL);
  /* v2.3.3260: the QUICK EAT button's pictures (ui/panels/QuickEatButton.jsx)
     -- the bag pictures of every heal eaten at once; it appears the moment a
     hit takes HP off you, the middle of a fight */
  urls.push(...quickEatIconUrls());
  /* v2.3.3279: the owner's ability pictures, lit and grey (controlSkin
     abilityArt), and the small icons the HUD, the party window and the chat
     show (data/smallIcons.js) -- a buff lands, a party forms, a whisper comes
     in the middle of play, never while a loading screen is up */
  urls.push(...ABILITY_ART_URLS, ...smallIconDomUrls());
  /* v2.3.3481: the owner's handshake on the trade request card
     (TradeWindowPanel.jsx), which pops up when another player asks, in the
     middle of play (17 KB decoded).  The owner's other picks sit in windows
     you open, which load their pictures as they open, as every window does */
  urls.push(OWNER_ICON.tradeHandshake.src);
  return [...new Set(urls)];
}

export function preloadControls() {
  return Promise.all(controlsPreloadUrls().map(warm));
}
