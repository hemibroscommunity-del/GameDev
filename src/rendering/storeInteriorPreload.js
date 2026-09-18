/* ═══ v2.3.2624: THE GENERAL STORE'S INTERIOR, ON THE GATE ═══
 *
 * CLAUDE.md's preloading LAW applied to the shop panel's room art and the
 * storekeeper's idle strip.  Both are DOM assets -- an <img> and a CSS
 * background -- which is the class of thing that gets forgotten precisely
 * because it is not a Pixi texture; levelUpBurstPreload.js and
 * statDemoPreload.js exist for the same reason and this file follows them.
 *
 * WHY THESE TWO CANNOT RIDE ANYTHING ELSE.  Nothing in the client references
 * either file:
 *
 *   /sprites/props/general-store-interior.png  is new.
 *   /sprites/npc/storekeeper-bro-idle.png      is new, and its neighbours
 *     (storekeeper-bro.webp and its head crop) have sat on disk unreferenced
 *     since v2.3.2072 retired that NPC record -- so npcSprites' loader does
 *     not answer for this one either.
 *
 * Without this module the first walk into the general store would fetch
 * ~2.5MB while the panel was already on screen: the room would pop in and
 * the keyframe idle would start mid-blink against an empty box.  That is the
 * first-use hitch the law names.
 *
 * THEY ARE NOT SMALL, AND THAT IS A DELIBERATE TRADE.  Together the two PNGs
 * are ~2.5MB on the startup peak, against ~4MB for a single zone map.  They
 * are NOT per-zone (the zone exception in CLAUDE.md covers art you only need
 * in the zone you are standing in): town is a resident hub, the shop is in
 * it, and the panel can be opened seconds after the intro lifts.  If the
 * startup peak ever needs the bytes back, the honest fix is to put
 * public/sprites/props and /npc into tools/optimize-sprites.mjs's ROOTS so CI
 * mints lossless WebP twins -- not to move these off the gate.
 *
 * decode() rather than onload, and the Images are HELD, for the reasons
 * levelUpBurstPreload.js gives: onload means the bytes arrived, decode()
 * means there is a bitmap to paint, and an unreferenced decoded image is
 * collectable under memory pressure -- which would put the fetch back on
 * first use, silently.
 */
export const STORE_INTERIOR_URLS = [
  '/sprites/props/general-store-interior.png',
  '/sprites/npc/storekeeper-bro-idle.png',
];

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
    /* A failed warm must never fail the gate: the intro lifting is worth more
       than a shop backdrop, and the panel falls back to an ordinary fetch
       (and, if the room 404s, to hiding the scene -- VendorPanel's onError). */
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function preloadStoreInterior() {
  return Promise.all(STORE_INTERIOR_URLS.map(warm));
}

/* For rigs: how many warms are actually being held. */
export function storeInteriorWarmCount() { return _held.length; }
