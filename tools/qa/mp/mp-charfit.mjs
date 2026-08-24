/* THE CHARACTER TAB FITS ON THE PHONE (v2.3.1878).
 *
 * Owner: "Do a layout design change to make room for the stats you have to
 * scroll to see on the char menu."
 *
 * Measured on a 390x844 iPhone before the change: the sheet body is 191px
 * tall, the Equipment tab wanted 299, and all seven aggregate stats sat in the
 * 108px that did not fit.  Nothing cued that they were down there — this
 * panel's scroll-edge fade is deliberately off (v2.3.1697) — so the tab read
 * as though the game had no stat readout at all.
 *
 * Three things are asserted, because "it fits" can be satisfied by three
 * different kinds of wrong:
 *
 *   1. NOTHING SCROLLS.  Any box in the sheet whose scrollHeight exceeds its
 *      clientHeight is a fold, and a fold with no fade is invisible.
 *   2. EVERY STAT IS ON SCREEN.  A layout can stop scrolling by clipping —
 *      overflow:hidden makes the check above pass while the content is just as
 *      gone.  So each of the seven is located and required to be inside the
 *      viewport.
 *   3. NO LABEL IS ELLIPSISED.  The cells are ~46px wide in the column the
 *      stats moved into, and the first cut of this layout truncated four of
 *      the seven (DEFENSE wanted 46px of the 26px it had).  A clipped label is
 *      not a fit either, and neither of the checks above can see it.
 *
 * The stats live in the vitals column now, so the panel is opened with NO slot
 * selected — a selected slot deliberately hands that column to the item card
 * (v2.3.1843) and would hide them for a legitimate reason.
 */
import * as H from './harness.mjs';

/* Each stat, with every spelling it has shipped under.  The abbreviations
   arrived with this layout (the cells are ~46px and the long words did not
   fit), and matching only those would make the control run against the OLD
   layout fail on the rename instead of on the fold — which proves nothing
   about the fold.  Both spellings, so the same file can be pointed at either
   build and the failure it reports is the real one. */
const STATS = [
  ['Damage'], ['DPS'], ['Crit'],
  ['C.Dmg', 'Crit Dmg'], ['Def', 'Defense'], ['Dodge'], ['Armor', 'Armour'],
];
const FLAT = STATS.flat();

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Fitter', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  await P.page.evaluate(() => { window.__broDashPanelBus.open('hero'); });
  await P.page.waitForTimeout(1500);

  const m = await P.page.evaluate((stats) => {
    const out = { overflow: [], texts: [], clipped: [], vh: window.innerHeight };
    document.querySelectorAll('*').forEach((el) => {
      if (el.scrollHeight <= el.clientHeight + 2 || el.clientHeight <= 40) return;
      const r = el.getBoundingClientRect();
      if (r.width < 60 || r.height < 40) return;
      out.overflow.push({ clientH: el.clientHeight, scrollH: el.scrollHeight,
        hidden: el.scrollHeight - el.clientHeight, y: Math.round(r.y) });
    });
    document.querySelectorAll('span,div').forEach((el) => {
      const t = (el.textContent || '').trim();
      if (!stats.includes(t) || el.children.length) return;
      const r = el.getBoundingClientRect();
      out.texts.push({ t, y: Math.round(r.y), vis: r.y >= 0 && r.bottom <= window.innerHeight });
      if (el.scrollWidth > el.clientWidth + 1) {
        out.clipped.push({ t, scrollW: el.scrollWidth, clientW: el.clientWidth });
      }
    });
    return out;
  }, FLAT);

  /* GUARD FIRST: if the panel never rendered, the two checks below are both
     vacuously true — an empty screen scrolls nowhere and clips nothing. */
  const missing = STATS.filter((names) => !names.some((n) => m.texts.some((t) => t.t === n)));
  rec.ok('the Equipment tab rendered all seven stats (guard)',
    missing.length === 0, { missing: missing.map((n) => n[0]), saw: m.texts.map((t) => t.t) });
  if (missing.length) { await P.ctx.close().catch(() => {}); return; }

  rec.ok('nothing in the character sheet scrolls', m.overflow.length === 0, m.overflow);
  const offscreen = m.texts.filter((t) => !t.vis);
  rec.ok('...and every stat is inside the viewport, not clipped away',
    offscreen.length === 0, { vh: m.vh, offscreen });
  rec.ok('...with no stat label ellipsised in its cell',
    m.clipped.length === 0, m.clipped);

  await P.ctx.close().catch(() => {});
}
