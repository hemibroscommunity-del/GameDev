/* The chat font, measured on the glass (v2.3.1912)
 *
 * Owner: "Chat font (like tap on player to chat) should be chunkier and
 * larger."
 *
 * The style number is not the answer here.  The bubble is drawn in the
 * WORLD layer, so what the player reads is fontSize x the world scale,
 * and that scale changed under it: WORLD_ZOOM went 1.25 -> 1.5 in
 * v2.3.1780, which shrank every chat bubble by 17% without touching a
 * line of chat code.  So this measures the INK — how tall the glyphs
 * actually are in screen pixels, and how much of each row they fill,
 * which is what "chunkier" means.
 *
 * Finding the bubble: it is the only large, near-white, near-opaque slab
 * in the upper half of a world made of cobble and grass.  Rows with a
 * long run of near-white are the bubble; dark pixels inside those rows
 * are the letters.
 */
import * as H from './harness.mjs';

const SAY = 'hey bro';

/* Finding the bubble by a CONTIGUOUS RUN of near-white, not by a count of
   near-white pixels.  The first cut counted, and found nothing: a short
   message's bubble is only ~45 screen px wide once the 0.667 world scale
   is applied, so any count threshold high enough to reject the HUD's
   cream-coloured name text (#F7F2E7, which is "near-white" by any
   per-pixel test) was also higher than the whole bubble.  A solid RUN
   separates them cleanly — a slab has one, letterforms never do.
   Neutrality is checked too: the bubble is white over the world at .92
   alpha so it stays grey-neutral, while the HUD cream is visibly warm. */
/* NEUTRALITY is what separates the bubble from the world, not brightness.
   Town is saturated yellow cobble; the bubble is white over it and its
   text is black, so both stay grey.  Brightness alone fails twice: the
   cobble's highlights reach 201 red, and the bubble's own fill only runs
   ~199-238 rather than the 255 the fill colour suggests (it is drawn at
   .92 alpha over the ground).  And at the OLD 9.3 px size no glyph pixel
   ever reached true black -- darkest measured was 102 -- which is itself
   the evidence that the strokes were pure anti-aliasing. */
const NEUTRAL = (r, g, b) => (Math.max(r, g, b) - Math.min(r, g, b)) <= 16;
const LIGHT = (r, g, b) => NEUTRAL(r, g, b) && Math.min(r, g, b) >= 185;
const INK = (r, g, b) => NEUTRAL(r, g, b) && Math.max(r, g, b) <= 165;
const MIN_LIGHT = 18;

/* Pixels come out of the harness decoder through at(x,y): the screenshots
   here decode as 3-channel truecolour, and indexing the buffer as RGBA
   returns convincing noise rather than an error — the first cut of this
   file did exactly that and reported "no bubble" against a screenshot the
   bubble was plainly visible in. */
function measureInk(img, { yTo }) {
  const { width, height } = img;
  const rows = [];
  for (let y = 0; y < Math.min(height, yTo); y++) {
    let light = 0, x0 = -1, x1 = -1;
    /* v2.3.2078: the longest CONTIGUOUS light run as well as the outer
       extent.  The bubble is a solid near-white box; the town around it is
       not contiguous white.  See the note by xL/xR below for what this
       fixes. */
    let run = 0, runBest = 0, runAt = -1, runStart = -1;
    for (let x = 0; x < width; x++) {
      const p = img.at(x, y);
      if (LIGHT(p[0], p[1], p[2])) {
        light++; if (x0 < 0) x0 = x; x1 = x;
        if (run === 0) runStart = x;
        run++;
        if (run > runBest) { runBest = run; runAt = runStart; }
      } else run = 0;
    }
    rows.push({ y, light, x0, x1, runBest, runAt });
  }
  /* The bubble body: the tallest stack of rows carrying a neutral slab.
     Counted, not run-length: a text row's white is BROKEN by the letters,
     so the longest contiguous run collapses on exactly the rows that
     matter — which is how the first cut lost the bubble it was measuring. */
  let best = null, cur = null;
  for (const r of rows) {
    if (r.light >= MIN_LIGHT) { cur = cur || { from: r.y, rows: [] }; cur.rows.push(r); }
    else if (cur) { if (!best || cur.rows.length > best.rows.length) best = cur; cur = null; }
  }
  if (cur && (!best || cur.rows.length > best.rows.length)) best = cur;
  if (!best) return null;
  /* ═══ v2.3.2078: THE BOX, NOT THE BOX PLUS WHATEVER IS BESIDE IT ═══
     This used to take min(x0)..max(x1) ACROSS the slab's rows — the outer
     extent of every light pixel on every row of the band the bubble sits
     in.  The bubble is not alone up there: a lamp post's pale shaft, the
     plaza's gold cobbles, an NPC's name plate and the bubble's own drop
     shadow all put light pixels on some of those rows, and each one drags
     the range outward.  Measured against a real frame the box came out
     247px wide where the bubble is 222 (x 84..305) — 25px of town.

     That is not a rounding error, it is the assertions: `bubbleW` is
     compared against the wrap box, and 247 clears the 213px wrap width by
     enough to read as "the text did not wrap" on a message that plainly
     had (four lines of it, in the screenshot the run writes out).

     The bubble is a SOLID near-white rectangle, so its width is the longest
     CONTIGUOUS light run — scenery is not contiguous with it.  Taken as the
     max over the slab's rows because the text rows have their runs broken
     by the letters, while the padding rows above and below the type carry
     the full width.  (That breakage is why the SLAB is still found by
     counting light pixels rather than by run length — the v2.3.1912 note
     above records losing the bubble to exactly that.) */
  let xL = 0, xR = -1;
  for (const r of best.rows) {
    if (r.runBest > xR - xL + 1) { xL = r.runAt; xR = r.runAt + r.runBest - 1; }
  }
  if (xR < xL) { xL = Math.min.apply(null, best.rows.map((r) => r.x0));
                 xR = Math.max.apply(null, best.rows.map((r) => r.x1)); }
  const inked = [];
  for (const r of best.rows) {
    let ink = 0, i0 = -1, i1 = -1;
    for (let x = xL; x <= xR; x++) {
      const p = img.at(x, r.y);
      if (INK(p[0], p[1], p[2])) { ink++; if (i0 < 0) i0 = x; i1 = x; }
    }
    if (ink >= 3) inked.push({ ink, i0, i1 });
  }
  const base = { bubbleRows: best.rows.length, bubbleTop: best.from, bubbleW: xR - xL + 1 };
  if (!inked.length) return Object.assign(base, { inkRows: 0, inkPx: 0, inkSpan: 0, density: 0 });
  const inkPx = inked.reduce((a, r) => a + r.ink, 0);
  return Object.assign(base, {
    inkRows: inked.length,          /* glyph height in screen px */
    inkPx,                          /* total ink */
    inkSpan: Math.max.apply(null, inked.map((r) => r.i1)) - Math.min.apply(null, inked.map((r) => r.i0)) + 1,
    density: +(inkPx / inked.length).toFixed(2), /* ink per row = stroke weight */
  });
}

/* Say it the way a player does — the composer, then Send — and then make
   sure the composer is SHUT before looking at the pixels.  It is a fixed
   overlay across the upper third, a taller bubble grows upward INTO it,
   and measuring a bubble through the panel covering it measures the
   panel.  In real play Send closes the composer by itself; the harness
   re-opens it for the next message, so it has to be closed explicitly. */
async function say(P, text) {
  await P.page.evaluate(() => window.__broChatBubbleBus && window.__broChatBubbleBus.setOpen(true));
  await P.page.waitForFunction(() =>
    [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.textContent.trim() === 'Send'),
  null, { timeout: 8000 });
  /* v2.3.2078: was `button:has-text("Send")` + preceding-sibling::input[1].
     That stopped matching anything on two counts at v2.3.2039: the composer
     became a <textarea> (so `input` is the wrong element name) and it moved
     onto its own row above the controls (so it is no longer the sibling
     before Send).  `locator.fill` then timed out at 30s and took the whole
     scenario down.  `[data-chat-input]` is the handle the markup offers and
     the one mp-worldchat already uses — TRAPS §29, a scenario that selects
     UI by its shape has an expiry date. */
  const input = P.page.locator('[data-chat-input]').first();
  await input.fill(text);
  await H.clickText(P, 'Send');
  await P.page.evaluate(() => window.__broChatBubbleBus && window.__broChatBubbleBus.setOpen(false));
  await P.page.waitForTimeout(900);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Talker', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  await say(P, SAY);

  const probe = await P.page.evaluate(() => window.__btChatBubble || null);
  rec.ok('a bubble was drawn (guard)', !!probe, probe);
  if (!probe) return;
  console.log('   probe:', JSON.stringify(probe));

  if (process.env.BT_SHOT) await P.page.screenshot({ path: process.env.BT_SHOT });
  const img = await H.screenshotPixels(P);
  const ink = measureInk(img, { yTo: Math.round(img.height * 0.55) });
  console.log('   ink:', JSON.stringify(ink));
  rec.ok('the bubble was found in the pixels (guard)', !!ink && ink.inkRows > 0, ink);
  if (!ink) return;

  /* ── the numbers this version is about ── */
  rec.ok('the chat font reads at a real body size on screen (>= 13 px)',
    probe.effectivePx >= 13, { effectivePx: probe.effectivePx, style: probe.fontSize, scale: probe.worldScale });
  /* Baselines below are from this exact scene at 14/400, measured before
     the change: bubbleW 42, inkRows 10, inkPx 96, density 9.6.  They are
     what would survive someone "tidying" the style back down.
     inkRows is deliberately NOT one of them: it went 10 -> 11 across a
     1.5x size increase, because thin anti-aliased strokes bleed grey into
     rows the glyph does not really occupy, so it flatters the small font
     and barely moves.  Total ink and bubble width do discriminate. */
  rec.ok('...and there is materially more letter on the screen (inkPx >= 170, was 96)',
    ink.inkPx >= 170, ink);
  rec.ok('...and the bubble grew with the type (>= 54 px wide, was 42)',
    ink.bubbleW >= 54, ink);
  /* CHUNKY: a 700 face lays down materially more ink per row than a 400
     one at the same size.  Measured on the real render, not asserted from
     the style object — a webfont that failed to load falls back to a
     lighter system face and the style would still say 700. */
  rec.ok('...and they are chunky, not hairline (>= 14 ink px per row, was 9.6)',
    ink.density >= 14, ink);
  rec.ok('the style asks for a heavy weight', probe.fontWeight === '700', probe);

  /* ── and it still has to fit a phone ── */
  const long = 'the quick brown fox jumps over the lazy dog and keeps on running all the way to the frozen shore';
  await say(P, long);

  if (process.env.BT_SHOT2) await P.page.screenshot({ path: process.env.BT_SHOT2 });
  const img2 = await H.screenshotPixels(P);
  const ink2 = measureInk(img2, { yTo: Math.round(img2.height * 0.55) });
  console.log('   long:', JSON.stringify(ink2));
  rec.ok('a long message still fits the phone with a margin',
    !!ink2 && ink2.inkSpan > 0 && ink2.inkSpan <= img2.width - 24, { inkSpan: ink2 && ink2.inkSpan, screen: img2.width });

  /* THAT IT WRAPPED, proved by WIDTH rather than by height.  The first cut
     compared the two bubbles' pixel heights and was a coin flip: bubble
     height is measured off a stack of light rows, and whether a passing
     NPC's own bubble or a lighter patch of ground joins that stack moves
     it by several rows between runs on identical code.  It passed, then
     failed, then passed again on the same build.
     Width is deterministic.  Laid out on one line this message would be
     several times the screen; the wrap box is wordWrapWidth WORLD px, so
     if the text stopped at that box it wrapped, and if it is also far
     wider than the short message then it used the extra width first —
     which is the property v2.3.1719 added and this version had to keep
     while the font grew. */
  const wrapPx = probe.wrapWidth * probe.worldScale;
  rec.ok('...and it wrapped at the wrap box rather than running off the world',
    !!ink2 && ink2.inkSpan <= wrapPx + 20, { inkSpan: ink2 && ink2.inkSpan, wrapPx: Math.round(wrapPx) });
  rec.ok('...having first got WIDER than a short message (>= 2x its span)',
    !!ink2 && ink2.inkSpan >= ink.inkSpan * 2, { long: ink2 && ink2.inkSpan, short: ink.inkSpan });
}
