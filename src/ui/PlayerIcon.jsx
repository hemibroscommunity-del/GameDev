import React, { useEffect, useState } from 'react';
import { portraitDataUrl, portraitOptsFromPeer } from '@/rendering/characterPortrait.js';
import { peerCosmeticsFromWire } from '@/networking/peerCosmetics.js';

/* ═══ v2.3.2622: THE PLAYER'S ACTUAL FACE, NOT A LETTER ═══
 *
 * Owner: "Make the player's actual profile picture be there instead of the M."
 *
 * The M was the game's own fallback for a player with no Hemi Bro picture,
 * and most players have none -- so most listings showed a letter. The bro
 * they BUILT is drawable for anybody: `portraitOptsFromPeer` +
 * `portraitDataUrl` (characterPortrait.js), the same pair the inspect card,
 * the trade window and the character picker already use. This makes it a
 * fourth caller rather than a fourth copy.
 *
 * WHY THE CACHE IS NOT OPTIONAL. Those three callers draw ONE portrait.
 * A shelf page draws up to PAGE_MAX 40 rows, and each portrait composites a
 * dozen sprite layers onto a 256px canvas. Regenerating per render -- and
 * React re-renders this panel on every tab, filter and incoming message --
 * would be a hitch a phone feels. So: one module-level cache keyed by the
 * cosmetics themselves, bounded, shared by every caller.
 *
 * Keyed by the LOOK, not by the player id, deliberately. Two rows from the
 * same seller hit the same entry (MAX_PER_PLAYER is 10, so a 40-row page has
 * at most 40 and often far fewer distinct faces), and a player who changes
 * hat gets a new entry instead of a stale portrait -- which is the bug the
 * id-keyed version would have.
 *
 * THE DISC IS STILL HERE and is still doing a job: it is what shows while the
 * portrait composites (this is async), and what shows for a seller whose look
 * we do not have. It is no longer the ordinary case, which is the change.
 */

/* Bounded, and evicted oldest-first. 48 is generous for one shelf page and
   small enough that a long session cannot grow it without limit -- each entry
   is a data URL of a 256px canvas. */
const PORTRAIT_CACHE = new Map();
const PORTRAIT_MAX = 48;
/* In-flight requests, so forty rows sharing one seller start ONE composite
   rather than forty identical ones. */
const PORTRAIT_INFLIGHT = new Map();

function lookKey(look) {
  if (!look || typeof look !== 'object') return null;
  const keys = Object.keys(look).sort();
  if (!keys.length) return null;
  let out = '';
  for (const k of keys) out += k + ':' + look[k] + '|';
  return out;
}

/** The portrait for a peer's stored bust set, or null while it composites.
 *  Never throws: a look the catalogs do not recognise resolves to null and
 *  the caller keeps the disc. */
function portraitFor(look, onReady) {
  const key = lookKey(look);
  if (!key) return null;
  const hit = PORTRAIT_CACHE.get(key);
  if (hit !== undefined) return hit;
  if (!PORTRAIT_INFLIGHT.has(key)) {
    const p = Promise.resolve()
      .then(() => portraitDataUrl(portraitOptsFromPeer(peerCosmeticsFromWire(look)), true))
      .then((url) => url || null)
      .catch(() => null)
      .then((url) => {
        if (PORTRAIT_CACHE.size >= PORTRAIT_MAX) {
          const oldest = PORTRAIT_CACHE.keys().next().value;
          PORTRAIT_CACHE.delete(oldest);
        }
        PORTRAIT_CACHE.set(key, url);
        PORTRAIT_INFLIGHT.delete(key);
        return url;
      });
    PORTRAIT_INFLIGHT.set(key, p);
  }
  PORTRAIT_INFLIGHT.get(key).then(() => { if (onReady) onReady(); });
  return null;
}

/* ═══ v2.3.2620: THE PLAYER ICON, IN ONE PLACE ═══
 *
 * "Similar to how they are displayed elsewhere" was the original requirement,
 * so this began as an EXTRACTION of the rule PlayerListPanel and
 * InspectPlayerPanel each had inline:
 *
 *     the player's `avatar` when they have one,
 *     a disc in their colour bearing the first letter of their name when
 *     they do not.
 *
 * v2.3.2622 puts the real portrait in front of both, so the order is now:
 * a Hemi Bro `avatar` if they have one, else their own character's bust, else
 * the disc.
 *
 * PlayerListPanel calls this rather than keeping its own copy, so there is
 * exactly one answer to "what does a player look like in a list" and the
 * marketplace cannot drift away from the player list.
 *
 * SIZED, not fixed: the list draws it at 28 and the marketplace at 18. The
 * proportions inside -- the ring, the letter -- scale with it, because a
 * 1.5px ring on an 18px disc reads as a smudge.
 */
export function PlayerIcon({ name, color, avatar, look, size = 24, title }) {
  const px = Math.max(12, Math.round(Number(size) || 24));
  /* A counter, not the url: the url lives in the module cache, and bumping a
     number is what tells React to read it again once the composite lands. */
  const [, redraw] = useState(0);
  const [mounted, setMounted] = useState(true);
  useEffect(() => () => setMounted(false), []);
  /* The Hemi Bro picture still wins when there is one -- it is a deliberate
     thing a player went and proved they own. Otherwise their own bro. */
  const portrait = avatar ? null : portraitFor(look, () => { if (mounted) redraw((n) => n + 1); });
  const src = avatar || portrait;
  const letter = (typeof name === 'string' && name.trim())
    ? name.trim().charAt(0).toUpperCase()
    : '?';
  const common = {
    width: px, height: px, borderRadius: '50%', flexShrink: 0,
  };
  if (src) {
    return (
      <img
        src={src}
        alt=""
        title={title || name || undefined}
        draggable={false}
        style={{
          ...common,
          objectFit: 'cover',
          border: Math.max(1, Math.round(px / 19)) + 'px solid rgba(255,255,255,.2)',
        }}
        /* A broken or slow NFT proxy must not leave a torn image icon in a
           listing row; drop to nothing and let the row read as text.
           v2.3.2622: a composed portrait is a data URL and cannot 404, so
           this still only ever fires for the avatar case. */
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div
      title={title || name || undefined}
      aria-hidden="true"
      style={{
        ...common,
        background: color || '#8D9B98',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.max(8, Math.round(px * 0.46)),
        fontWeight: 800,
        color: '#12181B',
        lineHeight: 1,
      }}
    >{letter}</div>
  );
}
