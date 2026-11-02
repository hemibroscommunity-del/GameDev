/* ═══ v2.3.3900: "TOO FAR AWAY" OVER A RESOURCE YOU TAP FROM AFAR ═══
   The owner, 2026-11-02: "There needs to be a message that you're too far
   away if you can't mine and are tapping on the ore.  Too far away message
   should also be with any resource."

   v2.3.3145 took the old "Too far away!" out because it ATE the tap: the
   right stick's tap over a rock across the screen was a jump, and the word
   took it instead.  This one eats nothing.  The tap that finds a resource out
   of reach under the finger still goes on to whatever it did before (the
   swing, letting go of a lock); the word only floats over the resource, and
   the reach is not touched (the worker's checks are the truth).

   At most once a second a resource (a thumb's tap reaches the scan from two
   doors, the zones' click forward and the canvas's own release, and a player
   tapping a rock again and again should not stack words on it).  On a
   computer it says what to do: "Too far away: walk closer".

   No imports: node tests it (test/too-far.test.mjs); the popup helper and the
   computer test are handed in. */

export var TOO_FAR_WORD = 'Too far away';
export var TOO_FAR_WORD_DESK = 'Too far away: walk closer';
export var TOO_FAR_COLOR = '#D8A94D';   /* the townsfolk's "Too far away!" gold */
export var TOO_FAR_GAP_MS = 1000;
var MAX_KEYS = 64;   /* a cap: the stamps are per resource, the world is big */

/* The word for a tap on `key` (a resource's id, a bed's number) at world
   (x, y).  `deps.push(S, x, y, text, color, extra)` is pushDmgPopup;
   `deps.computer` says a mouse.  True when it showed. */
export function tooFarWord(S, key, x, y, now, deps) {
  if (!S || key == null || !deps || typeof deps.push !== 'function') return false;
  if (!(S._tooFarAt instanceof Map)) S._tooFarAt = new Map();
  var stamps = S._tooFarAt;
  var k = String(key);
  var last = stamps.get(k);
  if (last != null && now - last < TOO_FAR_GAP_MS) return false;
  if (stamps.size >= MAX_KEYS) stamps.clear();
  stamps.set(k, now);
  deps.push(S, x, y, deps.computer ? TOO_FAR_WORD_DESK : TOO_FAR_WORD, TOO_FAR_COLOR);
  return true;
}

/* Where the word sits: just over the top of the resource's picture (`box`,
   nodeWorldBox's {l, r, t, b}), or over its anchor when it has none. */
export function tooFarPlace(box, n) {
  if (box) return { x: (box.l + box.r) / 2, y: box.t - 8 };
  return { x: (n && n.x) || 0, y: ((n && n.y) || 0) - 40 };
}
