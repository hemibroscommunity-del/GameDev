/* ═══════════════════════════════════════════════════════════════════
   AIM CARET COLOUR — one blue for "this is the way you are pointing"
   ═══════════════════════════════════════════════════════════════════
   Owner (v2.3.1799): "Make the carat more noticeable like a light blue and
   make that color the same for sword attack carat to make it consistent."

   There are two of these marks and they were drawn by two different files in
   two different colours: the melee direction chip (effectsRenderer, the small
   triangle at the rim of the swing arc) was white, and the block caret
   (entityRenderer, v2.3.1798) was brass.  Same job — "the direction you are
   committing to" — so they get one colour, and it lives here rather than
   being typed twice, because a shared constant is the only version of
   "consistent" that survives the next edit to one of them.

   WHY BLUE AND NOT BRASS.  Brass is Lantern Slate's focus/selection accent and
   is already spent on the UI chrome; on sand and cobble — which is most of
   what these marks land on — it is close to the ground colour, which is what
   the owner is reporting when they say the caret is not noticeable enough.
   Blue is the game's existing defensive/guard colour (0x5dade2, the shield's
   own fallback arc), and nothing in the world palette competes with it.
   Lifted a few steps for punch: 0x5dade2 -> 0x74D0FF.

   THE DARK EDGE IS PART OF THE COLOUR.  These are drawn over the WORLD, not
   over UI, so they meet sand, cobble, grass AND snow.  Light blue on snow is
   invisible on its own.  Both callers stroke the darker edge first and the
   blue on top — no filters (a filter compositing over the WebGL canvas is the
   documented cause of the iOS "static", CLAUDE.md). */

/** The mark itself. */
export const AIM_CARET = 0x74D0FF;
/** The near-black it is outlined with, so it reads on any ground. */
export const AIM_CARET_EDGE = 0x0A1014;
/** Whitens on a landed block, so the pulse still reads as an event. */
export const AIM_CARET_HOT = 0xFFFFFF;

/* Dev probe: both call sites read the SAME constant, and this is how a test
   proves it rather than trusting that they do.  Two hex literals typed in two
   files would satisfy any assertion written against one of them. */
if (typeof window !== 'undefined') {
  window.__btAimCaret = { block: AIM_CARET, melee: AIM_CARET, edge: AIM_CARET_EDGE };
}
