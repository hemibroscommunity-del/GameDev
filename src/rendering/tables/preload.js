/* ═══ v2.3.5345: THE PRELOAD SYSTEM'S HAND-TUNED TABLES (grand plan step 5.5, card M) ═══
 *
 * The renderers' tables and tuned constants of the `preload` system
 * (docs/plan/census/M-tables.md), moved here verbatim with the comment above
 * each: no imports, no logic, imported back by the same names.  A value here
 * is a pixel on screen: change it as you would have in the renderer.
 */

/* ── from entityRenderer.js (v2.3.5345) ── */

/* v2.3.1477: the poses whose masked-body bakes are paid for behind the intro.
   'hit' joined stand/jog when the recoil finally got its own chest/legs sheets
   -- 6 frames x 5 dirs = 30 more 256x256 bakes (~8MB, ~3% of what v2.3.1407
   cut).  Worth it: the bake would otherwise land on the exact frame a monster
   connects with you.  v2.3.1478: + 'mine' (south only, 14 frames) once the
   pickaxe swing got its own sheets -- the mine BODY sheet was deliberately
   left lazy back in v2.3.1118 as "pure VRAM waste", which was true while the
   pose had no armour to bake against.  If iPhone context loss ever returns,
   this list is the first thing to trim back to ['stand', 'jog']. */
/* v2.3.1534: + 'dodge'.  The recolored body sheets are baked HERE, during the
   loading screen; a pose left off this list falls back to the un-recolored
   base frame on its first use while the bake runs, which for dodge would be a
   flash of default skin/pants the first time the player rolls.  That is the
   first-use hitch class CLAUDE.md's animation-preloading law exists to stop.
   Cost is 2 dirs x 9 frames = 18, against jog's ~140. */
/* v2.3.2500 (owner: "the first item you pick up you are shirtless for about
   half a second", and the animation-preload LAW, CLAUDE.md / TRAPS #12):
   + 'pickup' and + 'fish'.  The gear SHEETS for these two poses are warmed by
   preloadGear (gearSheets.js, same change); this list is the other half of the
   gate -- it walks the same (pose, dir, frame) grid the renderer will ask for
   so the BODY bake and the armour composite are warm too. */
const PREWARM_POSES = ['stand', 'jog', 'hit', 'mine', 'dodge', 'pickup', 'fish'];

export { PREWARM_POSES };
