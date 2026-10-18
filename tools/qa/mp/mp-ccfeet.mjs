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
 * this goes red, which is the point.
 *
 * v2.3.3430: AND IT DID GO RED, which is the point working.  On main he was
 * drawn 121.1px at 390x664: the plate had grown 22px under him (the name well
 * 44 -> 56 at v2.3.2416, the gap under Randomize 8 -> 19.4 at v2.3.2453), each
 * change measured at 390x844 where the column has room.  The owner chose to
 * give it back from the plate on a short upright screen (game.css, after the
 * 690px block), and the floor stays where it was:
 *
 *   390x664   air +19.6 (was 22.0)   drawn 146.2 (was 121.1)   logo +19.8 (was 21.7)
 *   320x568   air +19.3 (was 19.3)   drawn 118.3 (was 118.3)   logo +15.5 (was 15.5)
 *
 * 320x568 does not move: its stage was already at the 690px block's 96px
 * floor, the column overflowing; the plate's 11.8px came back as the Back
 * button, which had ended 12.9px below the screen and now ends 1.1px below. */
const SIZES = [
  /* v2.3.2642: minSwordGap -> minLogoGap.  The sword sprite that used to hang
     below the title is drawn into the owner's new lockup, so the ceiling is
     the title element's own bottom edge; the floor stays 15px because it is
     the owner's accepted clearance, not a property of the old sprite. */
  { w: 390, h: 664, air: 2, minDrawnH: 145, minLogoGap: 15 },
  { w: 320, h: 568, air: 2, minDrawnH: 115, minLogoGap: 15 },
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
    const logo = await rect(P, '.bt-cc-logo');
    rec.ok(`${tag}: the character, the plate and the title are all on screen (guard)`,
      !!ink && !ink.empty && !ink.err && !!plate && plate.h > 40 && !!logo,
      { ink, plate, logo });
    if (!ink || ink.empty || ink.err || !plate || !logo) { await P.ctx.close().catch(() => {}); continue; }

    const cover = ink.feet - plate.top;   /* positive = the plate is over his boots */
    rec.ok(`${tag}: the lion backplate starts BELOW his boots `
         + `(${cover > 0 ? cover.toFixed(1) + 'px of him is behind it' : (-cover).toFixed(1) + 'px of air'})`,
      plate.top >= ink.feet + S.air, { cover, feet: ink.feet, plateTop: plate.top, air: S.air });

    rec.ok(`${tag}: ...and he did not get smaller to pay for it `
         + `(drawn ${ink.drawnH.toFixed(1)}px, floor ${S.minDrawnH})`,
      ink.drawnH >= S.minDrawnH, { drawnH: ink.drawnH, floor: S.minDrawnH });

    const gap = ink.head - logo.bottom;
    rec.ok(`${tag}: ...and he was not pushed up into the logo to pay for it `
         + `(${gap.toFixed(1)}px, floor ${S.minLogoGap})`,
      gap >= S.minLogoGap, { gap, head: ink.head, logoBottom: logo.bottom });

    /* ═══ v2.3.3430: WHAT THE SHORT SCREEN TOOK FROM THE PLATE, AND WHAT IT
           MUST NOT HAVE TAKEN ═══
       The size floor above went red on main: drawn 120.6px at 390x664, where
       v2.3.2378 shipped 147.4.  Nothing was wrong with the character -- the
       plate had grown 22px under him since (the name well 44 -> 56 at
       v2.3.2416, the gap under Randomize 8 -> 19.4 at v2.3.2453), and the stage
       is the column's only child that gives.  The owner's call (option B): on
       a short upright screen the plate gives that height back -- one 13px gap
       for its stack and a 48px name well (game.css, after the 690px block).

       Those are the two things a tighter plate could break, so they are
       asserted HERE, at the sizes where the tightening applies (mp-ccsize runs
       at 390x844, where it does not):
         - the name-reroll button inside the shorter well -- the button is 50px
           at full size and the well 48 here, so it has to shrink with it, and
           centred on the WELL (mp-ccsize's relationship, not a number), and
           still a 44px touch target;
         - the name line's slot: the message is absolute at the bottom of the
           name wrap with the stack gap for its height, so the slot and the gap
           above Randomize must stay the same number, and a real message must
           fit in it.  Measured as the text's own box (a Range over it): that is
           the font's whole ascent and descent, taller than any glyph in it, so
           "fits" here is the strict reading. */
    const stack = await P.page.evaluate(() => {
      const R = (s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: +r.top.toFixed(1), bot: +r.bottom.toFixed(1), h: +r.height.toFixed(1),
                 w: +r.width.toFixed(1), cy: +(r.top + r.height / 2).toFixed(1) };
      };
      return { stage: R('.bt-cc-stage'), plate: R('.bt-cc-cluster'), head: R('.bt-cc-namehead'),
               well: R('input.bt-cc-name'), reroll: R('.bt-cc-namewrap > .bt-cc-btn'),
               randomize: R('.bt-cc-randomize'), reset: R('.bt-cc-reset'),
               play: R('.bt-cc-play'), back: R('.bt-cc-back') };
    });
    console.log(`   ${tag} stack: ${JSON.stringify(stack)}`);
    const { well, reroll, randomize } = stack;
    rec.ok(`${tag}: the name well, its reroll button and Randomize are all on screen (guard)`,
      !!well && !!reroll && !!randomize, stack);
    if (well && reroll && randomize) {
      rec.ok(`${tag}: the name-reroll button is centred on the name well `
           + `(off by ${(reroll.cy - well.cy).toFixed(1)}px) and inside it `
           + `(button ${reroll.h}px in a ${well.h}px well)`,
        Math.abs(reroll.cy - well.cy) <= 1
          && reroll.top >= well.top - 0.5 && reroll.bot <= well.bot + 0.5,
        { reroll, well });
      rec.ok(`${tag}: ...and it is still a 44px touch target (${reroll.w}x${reroll.h})`,
        reroll.w >= 44 - 0.5 && reroll.h >= 44 - 0.5, { reroll });

      /* EVERY MESSAGE THE LINE SHOWS, each in its own moment: the three
         reasons ENTER BRO TOWN gives when pressed (data/joinGate.js), the
         all-clear, and the hint typing gives on its own.  The reasons were the
         ones that did not fit -- two lines of 30px in the slot at every size
         since v2.3.2416, found by this check -- because a test that only typed
         never pressed.  The press is the button's own click(): the question
         here is where the answer is drawn, not whether a finger reaches the
         button (mp-ccjoin presses with real touch). */
      const readMsg = () => P.page.evaluate(() => {
        const m = document.querySelector('.bt-cc-namemsg');
        const w = document.querySelector('input.bt-cc-name');
        const a = document.querySelector('.bt-cc-randomize');
        if (!m || !w || !a || !m.textContent) return null;
        const rg = document.createRange();
        rg.selectNodeContents(m);
        const t = rg.getBoundingClientRect();
        const b = m.getBoundingClientRect();
        return { text: m.textContent, lines: rg.getClientRects().length,
                 top: +t.top.toFixed(1), bot: +t.bottom.toFixed(1), h: +t.height.toFixed(1),
                 boxTop: +b.top.toFixed(1), boxH: +b.height.toFixed(1),
                 wellBot: +w.getBoundingClientRect().bottom.toFixed(1),
                 randTop: +a.getBoundingClientRect().top.toFixed(1) };
      });
      const press = () => P.page.evaluate(() => {
        const b = document.querySelector('button.bt-cc-play');
        if (b) b.click();
      });
      const type = async (s) => { await P.page.fill('input.bt-cc-name', s); await P.page.waitForTimeout(250); };
      const msgs = [];
      await press(); await P.page.waitForTimeout(250);
      msgs.push(['pressed with no name', await readMsg()]);
      await type('a');
      msgs.push(['pressed, then one letter', await readMsg()]);
      await type('Bob');
      msgs.push(['a good name', await readMsg()]);
      await type('a');
      msgs.push(['one letter, not pressed', await readMsg()]);
      /* The third reason needs a pinch-zoomed page (joinGate's
         visualViewport.scale > 1.05).  Chromium honours the page's
         user-scalable=no, so no pinch can zoom it here -- iOS Safari ignores
         that, which is why the reason exists -- and the scale the gate reads is
         stood in for instead.  Only that number: the layout, and every box
         measured, is the page's own. */
      const zoom = await P.page.evaluate(() => {
        const vv = window.visualViewport;
        if (!vv) return 1;
        Object.defineProperty(vv, 'scale', { get: () => 2, configurable: true });
        return vv.scale;
      });
      await type('Bob');   /* re-renders the creator, which reads the zoom */
      if (zoom > 1.05) {
        await press(); await P.page.waitForTimeout(250);
        msgs.push(['pressed while pinch-zoomed', await readMsg()]);
      } else {
        rec.skip(`${tag}: the pinch-zoom reason`, 'this browser has no visualViewport');
      }
      await P.page.evaluate(() => { try { delete window.visualViewport.scale; } catch (e) {} });
      await type('');

      const first = msgs[0][1];
      rec.ok(`${tag}: pressing ENTER with no name shows a reason (guard)`, !!first, msgs);
      if (first) {
        const slot = +(first.randTop - first.wellBot).toFixed(1);
        rec.ok(`${tag}: the name line's slot IS the gap above Randomize `
             + `(slot ${first.boxH}px at the well's foot, gap ${slot}px)`,
          Math.abs(first.boxTop - first.wellBot) <= 0.5 && Math.abs(first.boxH - slot) <= 0.5,
          first);
      }
      for (const [when, m] of msgs) {
        rec.ok(`${tag}: ${when}: "${m && m.text}" is one line inside its slot, over `
             + `neither the name well nor Randomize (${m && m.lines} line, ${m && m.h}px `
             + `in ${m && +(m.randTop - m.wellBot).toFixed(1)}px)`,
          !!m && m.lines === 1 && m.top >= m.wellBot - 0.5 && m.bot <= m.randTop + 0.5, m);
      }
    }

    await P.ctx.close().catch(() => {});
  }
}
