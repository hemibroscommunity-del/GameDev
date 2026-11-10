/* v2.3.4421: THE AMULET'S GEM PILL HAS A GATE.
 *
 * Setting a gem in the amulet (EnchantPanel.jsx) drew the gem at once and
 * asked the worker, with no wait and no check: a second tap on the same pill
 * -- a double tap with two of that gem, or a tap on the gem the amulet
 * already holds -- spent another gem for nothing (the worker has no "same
 * gem" refusal; the state-machine sweep, V9b P1-6).  A gem is settable only
 * when it is not the one already set; the first tap sets it on the phone at
 * once, so the second tap of a double tap is refused here.  Changing to a
 * DIFFERENT gem is untouched (the old one is lost: GEM-PLAN decision 10).
 * No imports: node tests it (server/test/silent-refusals.test.mjs). */
export function amuletGemSettable(amulet, elem) {
  if (!amulet || typeof elem !== 'string' || !elem) return false;
  return amulet.gem !== elem;
}
