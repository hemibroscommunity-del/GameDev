/* ═══ v2.3.3765: BIG NUMBERS ON A NARROW TOP BAR ═══
 *
 * The owner: "Make the info on the top ribbon larger (icon for achievement
 * points, numbers, titles, larger). It can fit more".  On an upright phone the
 * bar is 320-430 px across, and with the title, No man's land's pill and the
 * XP bar it cannot hold a rich player's numbers at a larger size: at 320 px a
 * purse of 2,550,000 and 12,400 AP cut "BroTown" to "B..." even at the old
 * size (mp-topbar).  So on a narrow bar a BIG number is said short --
 * 2,550,000 gold as "2.55M", 255,000 as "255K", 12,400 AP as "12.4K" -- and
 * a small one as it always was.  The bar's label still says the whole number
 * (ZoneHeader's aria-label), and so does every other place in the game.
 * No imports, so node reads it (test-world-core).
 */

/** Is the bar narrow (an upright phone)?  `vw` the window's width in CSS px. */
export function barNarrow(vw) {
  return Number(vw) > 0 && Number(vw) < 430;
}

/** `n` as the bar says it: whole with commas, or short past `min` on a narrow
 *  bar ("2.55M", "255K", "12.4K"). */
export function barNumber(n, narrow, min) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (!narrow || v < (min || Infinity)) return v.toLocaleString('en-US');
  const trim = (x, d) => x.toFixed(d).replace(/\.?0+$/, '');
  if (v >= 1e9) return trim(v / 1e9, v >= 1e10 ? 1 : 2) + 'B';
  if (v >= 1e6) return trim(v / 1e6, v >= 1e7 ? 1 : 2) + 'M';
  return trim(v / 1e3, v >= 1e5 ? 0 : 1) + 'K';
}

/* the numbers past which each is said short on a narrow bar */
export const BAR_GOLD_SHORT = 100000;
export const BAR_AP_SHORT = 10000;

/* ═══ v2.3.5047: THE NUMBER FORMATTER WARMED BEHIND THE LOADING SCREEN ═══
   held-budget.mjs `ui:*`: the first number a page says with commas
   (toLocaleString) costs about 10 ms on this box -- the browser readies its
   number formatter for the locale -- and every one after it about 10 us.  In
   play that first one was the gear tab's gold badge (barNumber above, and the
   badge's own coins.toLocaleString()), inside the gear tab's one piece of
   drawing: 6 to 8 ms of the held sweep's `ui:GearTab` holds.  This module is
   read with the game's code (DashColumns.jsx > GearTab.jsx), behind the
   loading screen, so saying one number here, both ways the game asks (the
   phone's own locale, and 'en-US'), pays it there.  The text is never used. */
try { (1234.5).toLocaleString(); (1234.5).toLocaleString('en-US'); } catch (e) { /* a page with no formatter says numbers plainly anyway */ }
