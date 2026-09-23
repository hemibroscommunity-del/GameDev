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
import { portraitDataUrl, portraitOptsFromPeer } from '../../../rendering/characterPortrait.js';   /* v2.3.2690: + the shared recipe */

const cache = Object.create(null); /* fid -> { key, url, pending } */

export function friendPortrait(fid, peer, onReady) {
  const c = cache[fid];
  if (!peer) return (c && c.url) || null;
  /* ═══ v2.3.2690: THE SHARED RECIPE, AND THE KEY IS WHAT IT DRAWS ═══
     This tile kept its own hand-written copy of "somebody else's portrait"
     after InspectPlayerPanel's was extracted (portraitOptsFromPeer,
     v2.3.2193), and the copy is the shape that recipe's note warns about: it
     never learned the face or arm tattoo (or the cape), and an absent drawing
     is filled from THIS device's own -- so every friend wore your face
     tattoo.  One recipe now, and the cache key is the recipe's own output,
     so a field added there is in the key the same day. */
  const opts = portraitOptsFromPeer(peer);
  const key = JSON.stringify(opts);
  if (c && (c.key === key || c.pending === key)) return c.url || null;
  cache[fid] = { ...(c || {}), pending: key };
  portraitDataUrl(opts, true).then(url => {
    if (url) { cache[fid] = { key, url }; if (onReady) onReady(); }
    else if (cache[fid]) cache[fid].pending = null;
  }).catch(() => { if (cache[fid]) cache[fid].pending = null; });
  return (c && c.url) || null;
}
