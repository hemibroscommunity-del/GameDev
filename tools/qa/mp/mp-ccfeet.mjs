/* THE LION BACKPLATE DOES NOT COVER HIS FEET (v2.3.2378).
 *
 * Owner: "Can you just remove this little spacer and move the whole lion
 * backdrop down so it doesn't cover his feet?"
 *
 * ── WHY THIS NEEDS ITS OWN SCENARIO, AND WHY AT 664 ──
 * mp-ccstand already measures the character's ink against the pedestal art and
 * against the logo's sword, at 390x844. Neither of those catches this: the
 * plate is a SIBLING that paints over the stage, so every assertion about where
 * he stands inside his own stage stays green while a gold frame is drawn across
 * his boots.
 *
 * And 844 is not the screen the owner is holding. 390x844 is that phone with
 * Safari's toolbars HIDDEN; with them showing the viewport is ~664, the column
 * loses 180px, and the same overlap goes from 5px to 29px. Measured, on the
 * built client, before the fix:
 *
 *     viewport    boots covered   platform covered   bald head vs sword
 *     390x664         28.7px          49.6px              +19.2
 *     390x700         29.0px          54.7px              +19.5
 *     390x844          5.0px          40.8px              +26.8
 *     375x812         12.7px          46.5px              +18.2
 *     320x568         25.1px          38.3px              +18.2
 *     430x932        -19.6px (clear)  21.8px              +54.3
 *
 * So this runs the two worst ones. A guard written at 844 would have called
 * 5px "nearly fine" and shipped the 29px.
 *
 * ── THE THREE ASSERTIONS ARE ONE TRADE, WHICH IS WHY THEY ARE TOGETHER ──
 * There are only four places the clearance can come from, and three of them are
 * things the owner has already ruled on:
 *
 *   1. dead height elsewhere in the column   <- the only free one
 *   2. the character gets smaller            <- "the character is the star",
 *                                               an owner call made twice
 *                                               (v2.3.798, v2.3.1524)
 *   3. the character moves up                <- straight into the logo's sword,
 *                                               which mp-ccstand guards
 *   4. nothing, and the plate keeps covering him
 *
 * A fix that buys (1) is right; a fix that quietly buys (2) or (3) also turns
 * the feet assertion green, which is exactly why it cannot be the only one
 * here. The size floor and the sword clearance are the receipts that the
 * clearance was paid for out of the right pocket.
 */
import * as H from './harness.mjs';

/* Where the drawn character actually is, in PAGE pixels. Same method as
 * mp-ccstand: the preview canvas is transparent-backed, so alpha alone
 * isolates him, and the bitmap is square inside a square object-fit:contain
 * box, so bitmap -> page is one uniform scale with no letterboxing.
 * A screenshot cannot do this -- the stage has an opaque backdrop and every
 * pixel of it would count as him. */
const inkSpan = (P) => P.page.evaluate(() => {
  const c = document.querySelector('.bt-cc-stage canvas');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  let px;
  try {
    px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  } catch (e) { return { err: String(e) }; }
  let minY = c.height, maxY = -1, n = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (px[(y * c.width + x) * 4 + 3] < 40) continue;
      n++;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!n) return { empty: true };
  const s = r.height / c.height;
  return { head: r.top + minY * s, feet: r.top + (maxY + 1) * s,
           drawnH: (maxY + 1 - minY) * s, n };
});

const rect = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, h: r.height, w: r.width };
}, sel);

/* The bars, and where each number comes from.
 *
 * AIR: the plate's top edge must clear his lowest drawn pixel by this much.
 * 2px rather than 0 because "not covered" and "touching" look the same on a
 * phone, and because the per-facing translateY nudge in NameModal moves him a
 * few pixels between angles -- a bar at exactly 0 would pass on south and fail
 * on southwest.
 *
 * MIN_DRAWN_H / MIN_SWORD_GAP: the two pockets the clearance must NOT be taken
 * from. Both are set just under what the fix ships with, not at a round
 * number -- tight enough that spending either one to buy feet clearance goes
 * red, loose enough that a device a few pixels off these two doesn't trip it.
 * What each ships with, and what it was before:
 *
 *   390x664   air +3.9   drawn 147.4 (was 150.0)   sword +19.4 (was +19.2)
 *   320x568   air +3.9   drawn 118.3 (was 118.3)   sword +18.2 (was +18.2)
 *
 * The one real cost is 2.6px of drawn character at 390x664 -- 1.7%, and only
 * there. It is the last of the plate's new top margin that the reclaimed
 * height did not quite cover, so .bt-cc-stage (the column's only
 * flex-shrinkable child) pays it. The floor at 145 leaves that 2.4px of room
 * and no more: pay for a second round of clearance out of the character and
 * this goes red, which is the point. */
const SIZES = [
  { w: 390, h: 664, air: 2, minDrawnH: 145, minSwordGap: 15 },
  { w: 320, h: 568, air: 2, minDrawnH: 115, minSwordGap: 15 },
];

export async function run({ browser, wsPort, webPort, rec }) {
  for (const S of SIZES) {
    const tag = `${S.w}x${S.h}`;
    const P = await H.newPlayer(browser, { name: 'Boots', wsPort, webPort,
      viewport: { width: S.w, height: S.h }, touch: true, dpr: 3 });
    await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
    await P.page.click('[data-tut="login-create"]');
    await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
    /* the canvas is redrawn on a rAF after the traits load; 1.6s is what
       mp-ccstand waits for the same thing. */
    await P.page.waitForTimeout(1800);

    const ink = await inkSpan(P);
    const plate = await rect(P, '.bt-cc-cluster');
    const sword = await rect(P, '.bt-cc-logo-sword');
    rec.ok(`${tag}: the character, the plate and the sword are all on screen (guard)`,
      !!ink && !ink.empty && !ink.err && !!plate && plate.h > 40 && !!sword,
      { ink, plate, sword });
    if (!ink || ink.empty || ink.err || !plate || !sword) { await P.ctx.close().catch(() => {}); continue; }

    const cover = ink.feet - plate.top;   /* positive = the plate is over his boots */
    rec.ok(`${tag}: the lion backplate starts BELOW his boots `
         + `(${cover > 0 ? cover.toFixed(1) + 'px of him is behind it' : (-cover).toFixed(1) + 'px of air'})`,
      plate.top >= ink.feet + S.air, { cover, feet: ink.feet, plateTop: plate.top, air: S.air });

    rec.ok(`${tag}: ...and he did not get smaller to pay for it `
         + `(drawn ${ink.drawnH.toFixed(1)}px, floor ${S.minDrawnH})`,
      ink.drawnH >= S.minDrawnH, { drawnH: ink.drawnH, floor: S.minDrawnH });

    const gap = ink.head - sword.bottom;
    rec.ok(`${tag}: ...and he was not pushed up into the logo's sword to pay for it `
         + `(${gap.toFixed(1)}px, floor ${S.minSwordGap})`,
      gap >= S.minSwordGap, { gap, head: ink.head, swordBottom: sword.bottom });

    await P.ctx.close().catch(() => {});
  }
}
