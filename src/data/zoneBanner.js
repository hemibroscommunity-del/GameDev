/* ═══ v2.3.2596: ZONE-ENTRY BANNER — the measured geometry of the owner's art ═══
 *
 * Owner: "I also want to add new zone animations for where you enter a new
 * zone.  Maybe play this briefly across the upper center of the screen then
 * dock where it tells you what location you're in (where top bar it tells you
 * name of map)."
 *
 * ═══ WHAT THE ART IS, AND WHY THE GAME DRAWS HALF OF IT ═══
 *
 * The owner sent two drops.  The first was CONTACT SHEETS: a hero banner plus
 * nine beats, with the zone name and the beat captions ("1 - EMPTY BAR",
 * circled number badges) painted into the pixels.  The second was the same
 * nine beats as ORNAMENTS ONLY — the flanking decoration, no plaque, no name.
 *
 * The ornaments are what ship.  That is not a small preference:
 *
 *  - With the name no longer in the art, an ornament set belongs to a THEME
 *    rather than to one zone, so the lookup below is zone -> theme -> strip and
 *    a second desert zone would cost one line here instead of a new sheet.
 *  - The plaque is drawn in CSS from the Lantern Slate tokens, so it is the
 *    same surface as the rest of the game's chrome, it stretches to whatever
 *    the zone name needs, and it cannot go stale the way baked text does (the
 *    contact sheets say "(Lv1-2)" forever; the drawn plaque asks zoneTitle()).
 *  - The bar cannot jitter between beats, because it is not in the beats.  The
 *    original worry — "align every frame on the BAR or the banner will swell" —
 *    is answered by construction rather than by a registration pass.
 *
 * The contact sheets stay in docs/triage-2026-09-17/assets/ as the reference
 * for what the assembled thing is supposed to look like.
 *
 * ═══ THE NUMBERS BELOW ARE MEASURED, NOT TYPED ═══
 *
 * tools/process_zone_banner_sheets.py cuts the ornament sheets and prints
 * these.  It recovers the source grid from the pieces' own anchors (every left
 * piece is flush to its cell's left edge, every right piece flush to the
 * right, cell pitch exactly 482px) and the row pitch by cross-correlation,
 * because the art grows both upward and downward across the beats so no
 * bounding box is fixed — TRAPS §59, "slicing a contact sheet on an even grid
 * it only looks like".  Re-run the tool if the art changes; do not hand-edit.
 *
 * Each strip is 2 rows x 9 columns of a uniform cell:
 *   row 0 = the LEFT ornament, beats 1..9, flush left in its cell
 *   row 1 = the RIGHT ornament, beats 1..9, flush right in its cell
 * The two rows are anchored to the two ENDS of the plaque, which is why the
 * plaque can be any width.
 */

/* Object.create(null), per CLAUDE.md: this is keyed by a zone id that arrives
   from game state, and a plain {} answers '__proto__' with a function. */
export const ZONE_BANNER_THEME = Object.create(null);
/* ═══ ONLY FOUR ZONES HAVE A BANNER, AND THAT IS THE DECISION ═══
 *
 * The game defines fourteen zones and the owner drew four, each unmistakably
 * ONE place: Wind Dunes' sandstone spires, Flame Fields' lava, Frost Ridge's
 * ice crystals, Verdant Wilds' waterfall and mushrooms.
 *
 * Nothing is reused.  Stone Hollows is not a desert, Poison Forest is not this
 * forest, Water Caves are not this ice — dressing them in borrowed art is a
 * bug report, where no banner at all is simply the top bar behaving exactly as
 * it does today.  A missing flourish is invisible; a mismatched one is not.
 *
 * ── AND THE COVERAGE IS BETTER THAN "FOUR OF FOURTEEN" SOUNDS ──
 *
 * Checked rather than assumed, because it changes the shape of the problem:
 * WORLDVIEW_EXITS (src/data/effects.js) has FIVE live rows — town, ember, sky,
 * verdant, frost — and the other four spokes (hollows, thunder, tidal, mist)
 * are commented out and appear on the map as COMING_SOON_MARKS instead.  So the
 * zones a player can walk into today are the two hubs and four combat spokes,
 * and the owner drew art for ALL FOUR SPOKES.
 *
 * What is left on the no-banner path is therefore the hubs (town and World
 * View, entered constantly), the farm, the two endgame zones, a dungeon, and
 * every zone that opens later — which is exactly why that path is the one the
 * rig exercises hardest (tools/qa/mp/mp-zonebanner.mjs).
 *
 * The theme indirection stays for those later zones: when the owner draws a
 * fifth sheet, or decides a desert is a desert, it is one line here and no code
 * anywhere else. */
ZONE_BANNER_THEME.sky = 'desert';       /* Wind Dunes    */
ZONE_BANNER_THEME.ember = 'fire';       /* Flame Fields  */
ZONE_BANNER_THEME.frost = 'frost';      /* Frost Ridge   */
ZONE_BANNER_THEME.verdant = 'forest';   /* Verdant Wilds */

const V = '?v=2.3.2596';

export const ZONE_BANNER_STRIPS = Object.create(null);
ZONE_BANNER_STRIPS.desert = {
  src: '/sprites/fx/zonebanner-desert-v1.webp' + V,
  cellW: 245, cellH: 205, leftW: 245, rightW: 237, stripW: 2205, stripH: 410,
};
ZONE_BANNER_STRIPS.fire = {
  src: '/sprites/fx/zonebanner-fire-v1.webp' + V,
  cellW: 227, cellH: 191, leftW: 223, rightW: 227, stripW: 2043, stripH: 382,
};
ZONE_BANNER_STRIPS.frost = {
  src: '/sprites/fx/zonebanner-frost-v1.webp' + V,
  cellW: 250, cellH: 259, leftW: 250, rightW: 232, stripW: 2250, stripH: 518,
};
ZONE_BANNER_STRIPS.forest = {
  src: '/sprites/fx/zonebanner-forest-v1.webp' + V,
  cellW: 252, cellH: 237, leftW: 252, rightW: 230, stripW: 2268, stripH: 474,
};

export const ZONE_BANNER_FRAMES = 9;

/** The strip a zone uses, or null when the zone has no banner (the majority). */
export function bannerStripFor(zoneId) {
  const theme = zoneId && ZONE_BANNER_THEME[zoneId];
  return (theme && ZONE_BANNER_STRIPS[theme]) || null;
}

/* ═══ TIMING (a judgement call, recorded so it can be argued with) ═══
 *
 * "Briefly" is the owner's word, and this plays on EVERY zone entry, so the
 * budget is spent like it is the player's and not the animation's.  Nothing
 * here blocks input: the overlay is pointer-events:none from the root down and
 * the game loop is never paused, so a player who walks in already knowing where
 * they are just keeps walking and the banner finishes over their shoulder.
 *
 * The nine beats are the owner's own storyboard, and they are not equal: the
 * first five are a build (sand appears, sand builds, rocks form, wind swirls)
 * and want to be quick, beat 8 is the FULL REVEAL and wants to land, beat 9 is
 * the settle and is the only frame anyone actually reads a name off — so it is
 * the one that is held.
 *
 *   beats 1-5   290ms   the build.  Too slow here and it reads as a loading bar.
 *   beats 6-7   150ms   the name fades in across these two, matching the
 *                       owner's captions ("text fades in", "text fades in 2").
 *   beat 8      160ms   the peak.  Long enough to register as a beat of its own.
 *   beat 9      400ms   the settle, and the read.
 *                ----
 *               1000ms  then 400ms of dock = 1.4s door to door.
 *
 * The per-zone loading overlay has already been up for a moment by the time
 * this starts, so 1.4s is what is ADDED to a zone change that was never
 * instant.  It was 2.2s in the first cut and that was too long — the settle
 * outstayed its welcome on the second visit, which is every visit after the
 * first. */
export const ZONE_BANNER_BEAT_MS = [60, 55, 55, 55, 65, 75, 75, 160, 400];
export const ZONE_BANNER_PLAY_MS = ZONE_BANNER_BEAT_MS.reduce((a, b) => a + b, 0);
export const ZONE_BANNER_IN_MS = 140;    /* plaque rise-and-fade at beat 1 */
export const ZONE_BANNER_NAME_AT = 290;  /* ms: start of beat 6 */
export const ZONE_BANNER_NAME_MS = 150;  /* the name's fade, beats 6-7 */
export const ZONE_BANNER_DOCK_MS = 400;

/* ═══ RE-ENTRY: SKIP, AND WHY NOT QUEUE OR INTERRUPT-AND-REPLAY ═══
 *
 * A player bouncing across a portal can re-enter a zone twice in a few seconds.
 * Queueing would make the banner outlive the trip that caused it, and replaying
 * from beat 1 every time turns a flourish into a toll.
 *
 * So: the overlay is a SINGLETON, which is what makes stacking impossible
 * rather than merely unlikely — a second entry reuses the same element and the
 * first timeline is cancelled, whatever state it was in.  And a zone that
 * showed its banner within this window shows nothing at all when re-entered,
 * so the bounce is silent while a genuine return later still gets the flourish.
 *
 * 45s rather than 10s because the failure mode is asymmetric: a banner the
 * player did not need is an interruption, and a banner they missed is nothing
 * at all. */
export const ZONE_BANNER_REPEAT_MS = 45000;
