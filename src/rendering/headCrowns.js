/* ═══ v2.3.3867: THE HEAD'S CROWN WHERE THE TOPMOST PIXEL IS NOT THE HEAD ═══
 *
 * The owner, on a computer: "shark head north on desktop disappeared".  Every
 * head piece (the hat, the hair, the beard, the glasses, the eye style, the
 * hat's hair mask) is pinned to the body's crown, body-tops.json: the TOPMOST
 * opaque pixel of each frame.  On the flinch (the `hit` pose) facing north and
 * north-east the flinch raises a fist above the head, so on frames 3-5 that
 * pixel is the fist, up to 77 px off the head (TRAPS §100): the hat and the
 * hair flew to the fist and the head showed bald -- every hat, every look,
 * phones and computers alike.
 *
 * These are the head's own crowns on those frames, measured for the monkey's
 * ears and muzzle (tools/species-fixes/monkey.json, tools/species_frames.py:
 * the top of the head's skin blob), so every head piece now sits where the
 * species pieces already did.  A frame not listed keeps body-tops.  No imports:
 * node can test it (server/test/head-crowns.test.mjs).
 */
export const HEAD_CROWNS = Object.freeze({
  'hit-north-3': [95, 52],
  'hit-north-4': [98, 46],
  'hit-north-5': [108, 42],
  'hit-northeast-3': [160, 52],
  'hit-northeast-4': [157, 46],
  'hit-northeast-5': [150, 43],
});

/** The crown a head piece sits on for (pose, dir, frame): the head's own where
 *  the topmost pixel is not the head, else body-tops' (or its standing frame). */
export function headCrown(bodyTops, pose, dir, frame) {
  const k = `${pose}-${dir}-${frame}`;
  if (HEAD_CROWNS[k]) return HEAD_CROWNS[k];
  if (!bodyTops) return null;
  return bodyTops[k] || bodyTops[`stand-${dir}-0`] || null;
}
