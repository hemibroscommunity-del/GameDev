/* v2.3.1323 (ChatGPT Friends round): head-and-shoulders portraits for
   friend rows — "actual character portrait; use the initial only as a
   fallback".  Peers in S.others carry their full cosmetic set (the
   entity renderer draws them from it), so the same portraitDataUrl
   pipeline that renders YOUR Hero bust renders theirs.

   In-memory cache keyed by friend id; regenerated only when the
   cosmetic signature changes (a friend swapping hats mid-session
   updates on the next render pass).  Session-scoped by design — data
   URLs are too heavy for localStorage, so OFFLINE friends (no peer
   entry) fall back to the initial disc, which the spec allows. */
import { portraitDataUrl } from '../../../rendering/characterPortrait.js';

const cache = Object.create(null); /* fid -> { key, url, pending } */

export function friendPortrait(fid, peer, onReady) {
  const c = cache[fid];
  if (!peer) return (c && c.url) || null;
  const key = [
    peer.skin, peer.hair, peer.hairColor, peer.headwear, peer.hatColor,
    peer.facialhair, peer.facialHairColor, peer.shirt, peer.shirtColor,
    peer.pants, peer.shoes, peer.bodySize, peer.eyeColor,   /* v2.3.1930 */
    peer.shirtArtFront,   /* v2.3.1939 */
    peer.pantsArt, peer.tattooArt,   /* v2.3.1940 */
    peer.shirtPattern, peer.pantsPattern, peer.shoesPattern,   /* v2.3.1941; v2.3.1944 */
  ].join('|');
  if (c && (c.key === key || c.pending === key)) return c.url || null;
  cache[fid] = { ...(c || {}), pending: key };
  portraitDataUrl({
    skin: peer.skin, pants: peer.pants, shoes: peer.shoes,
    hair: peer.hair, hairColor: peer.hairColor,
    facialHair: peer.facialhair, facialHairColor: peer.facialHairColor,
    headwear: peer.headwear, hatColor: peer.hatColor,
    shirt: peer.shirt, shirtColor: peer.shirtColor,
    eyeColor: peer.eyeColor,   /* v2.3.1930 */
    shirtArt: peer.shirtArtFront || null,   /* v2.3.1939 */
    /* v2.3.1940: explicit, so a friend's tile never borrows this device's own
       drawings -- and in the cache key above, so a friend who changes theirs
       gets a fresh portrait instead of the stale one. */
    pantsArt: peer.pantsArt || null, tattooArt: peer.tattooArt || null,
    shirtPattern: peer.shirtPattern || '', pantsPattern: peer.pantsPattern || '',   /* v2.3.1941 */
    shoesPattern: peer.shoesPattern || '',   /* v2.3.1944 */
  }, true).then(url => {
    if (url) { cache[fid] = { key, url }; if (onReady) onReady(); }
    else if (cache[fid]) cache[fid].pending = null;
  }).catch(() => { if (cache[fid]) cache[fid].pending = null; });
  return (c && c.url) || null;
}
