/* ═══ v2.3.3993: A WEAPON LEVEL-UP SENDS BUBBLES TO YOUR POINTS ═══
 * The owner, 2026-11-02: "When a level up on one of the 3 primary combat all
 * weapons happens do a 'jump to bag' effect that just shows bubbles in
 * representing xp or something jump to the character button or the character
 * button's points section if that menu already open."
 *
 * A melee, bow or staff level-up raises one LEVEL UP medallion
 * (LevelUpBurst.jsx, from wsClient's prog3_level); as it starts to fade, 5-7
 * small glowing bubbles leave it in staggered arcs (game/questFly.js
 * flyPicture, the quest rewards' flight, its `bubble` mode: CSS circles, no
 * art, so nothing to preload) for the 'points' target: the Points section
 * ([data-section="Build"]) when the Character page is open, else the
 * Character button ([data-nav="hero"]), else the dashboard's fold handle
 * ([data-dash-fold]).  Each lands with the small pop the quest rewards' target
 * gives (.bt-qw-landed).  Feedback only: the points are the worker's.
 *
 * Off with ?pointsfly=0 (one tab). */
import { flyPicture } from '@/game/questFly.js';
import { POINTS_FLY_SKILLS, pointsFlyOn, pointsBubbleCount } from '@/game/pointsBubbles.js';

/** The bubbles' flight from `from` (the medallion: an element, or its rect
 *  read earlier).  `skill` the prog3 key; nothing for a life skill or the
 *  character.  Returns how many took off. */
export function flyPointsBubbles(from, skill, level) {
  try {
    if (POINTS_FLY_SKILLS.indexOf(skill) < 0 || !from) return 0;
    if (typeof window !== 'undefined' && !pointsFlyOn(window.location && window.location.search)) return 0;
    var r = from.getBoundingClientRect ? from.getBoundingClientRect() : from;
    if (!r || r.width < 2) return 0;
    var n = pointsBubbleCount(level), sent = 0;
    for (var i = 0; i < n; i++) {
      var off = i - (n - 1) / 2;
      /* each from a point round the medallion's middle, so they leave as a
         little cloud rather than one dot */
      var at = { left: r.left + r.width / 2 + off * 9 - 2, top: r.top + r.height / 2 + (i % 2 ? 8 : -8) - 2, width: 4, height: 4 };
      if (flyPicture(null, at, 'points', { bubble: true, size: 10 + (i % 3) * 2, delay: i * 70, dur: 820 + (i % 3) * 60,
        drift: off * 18, lift: 60 + (i % 3) * 18 })) sent++;
    }
    if (typeof window !== 'undefined') window.__btPointsFly = { sent: sent, skill: skill, at: Date.now() };
    return sent;
  } catch (e) {
    return 0;
  }
}
