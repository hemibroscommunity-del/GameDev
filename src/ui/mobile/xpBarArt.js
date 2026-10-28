/* ═══ v2.3.3695: THE XP BAR'S PICTURES ═══
   The skill's picture on the top bar's XP bar (ZoneHeader.jsx, game/xpBar.js):
   the owner's Points-tab icons (tools/ui/cut-points-heads.py), the thicker
   sword, staff and bow drawn for small sizes -- the owner: "these will look
   better at that tiny scale".  The same files the Points tab shows, so a
   player sees one picture for a weapon's skill everywhere.  Warmed on the
   loading screen (rendering/xpBarPreload.js). */
import { POINTS_ART_DIR, POINTS_ART_V } from '../../data/pointsHeadArt.js';

export const XP_BAR_ICONS = Object.freeze({
  sword: `${POINTS_ART_DIR}sword.png?v=${POINTS_ART_V}`,
  bow: `${POINTS_ART_DIR}bow.png?v=${POINTS_ART_V}`,
  staff: `${POINTS_ART_DIR}staff.png?v=${POINTS_ART_V}`,
});
/* the words a reader hears for each (the skill's own name, PROG3_SKILL_META) */
export const XP_BAR_LABELS = Object.freeze({ sword: 'Melee', bow: 'Bow', staff: 'Magic' });
