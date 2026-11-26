/* ═══ v2.3.6682: THE GROWING MOTION'S SWITCH (card UI2-frame PR 2, reading 8) ═══
   "`?dashgrow=0` and reduced motion give none."  On by default (CLAUDE.md §7:
   a trial lands on, with its switch); `?dashgrow=0` (its row in
   tools/guards/lib/switches.mjs) and the phone's own reduced-motion setting
   (sheet/motion.js prefersReducedMotion) each give a page that is simply
   there, no class worn.  Read at each step, so the phone's setting changed in
   play is followed at the next page. */
import { sw } from '../../../game/switches.js';     /* relative: node's suites import the bus */
import { prefersReducedMotion } from '../sheet/motion.js';

export function dashGrowOn() {
  try { if (sw('dashgrow')) return false; } catch (e) { /* no switches: on */ }
  try { if (prefersReducedMotion()) return false; } catch (e) { /* no matchMedia: on */ }
  return true;
}
