/* THE CREATOR'S NAME FIELD AND ITS TWO ACTION BUTTONS (v2.3.2151).
 *
 * Owner, in one message: "Make the randomize look, reset buttons different
 * colors with larger font. Make the name your character area more obvious.
 * Maybe center and large and in all caps put the BRO NAME label."
 *
 * Every one of those is a claim about RENDERED PIXELS, and each has a way of
 * being "done" in the stylesheet and wrong on the phone:
 *   - "larger font" is one !important away from being true in the CSS and
 *     false on screen: .bt-cc-actions>button already set a size, and the rule
 *     that raises it has to actually win the cascade.
 *   - "larger" on a 172px column is also how "Randomize Look" wrapped to two
 *     lines the last time this pair was touched (v2.3.2036), so the size and
 *     the line count have to be asserted together or the fix breaks the label
 *     it was meant to help.
 *   - "different colors" means different from EACH OTHER, which a test that
 *     only checks one button cannot see.
 * The viewport is 390x844 -- the phone, per CLAUDE.md, not a desktop.
 */
import * as H from './harness.mjs';

const info = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    font: parseFloat(cs.fontSize),
    align: cs.textAlign,
    color: cs.color,
    bg: cs.backgroundImage || cs.backgroundColor,
    w: r.width, h: r.height, x: r.x, cx: r.x + r.width / 2,
    lineH: parseFloat(cs.lineHeight) || 0,
  };
}, sel);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Styler', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(1200);

  /* ── 1. the BRO NAME label ── */
  const lab = await info(P, 'label[for="bt-cc-name-input"]');
  rec.ok('the BRO NAME label is on screen (guard)', !!lab, lab);
  rec.ok('...and it is large, not a 10px caption', !!lab && lab.font >= 14, lab);
  rec.ok('...and centred over the field', !!lab && lab.align === 'center', lab);
  const labText = await P.page.evaluate(() => {
    const el = document.querySelector('label[for="bt-cc-name-input"]');
    if (!el) return null;
    /* The CAPS are a text-transform, so the DOM text is title case -- read what
       is painted, which is what the owner asked about. */
    return { raw: el.textContent, tr: getComputedStyle(el).textTransform };
  });
  rec.ok('...and painted in caps', !!labText && labText.tr === 'uppercase', labText);

  /* Centred over the WELL, not merely text-align:center inside some box that
     is itself off to one side. */
  const well = await info(P, 'input.bt-cc-name');
  rec.ok('the label sits over the name well', !!well && Math.abs(lab.cx - well.cx) <= 2,
    { lab: lab && lab.cx, well: well && well.cx });

  /* ── 2. the two action buttons ── */
  const rnd = await info(P, '[data-tut="cc-randomize"]');
  const rst = await info(P, '[data-tut="cc-reset"]');
  rec.ok('both action buttons are on screen (guard)', !!rnd && !!rst, { rnd, rst });
  rec.ok(`Randomize's label is larger than the 11px it was (${rnd && rnd.font}px)`,
    !!rnd && rnd.font >= 13, rnd);
  rec.ok(`Reset's label is larger than the 12px it was (${rst && rst.font}px)`,
    !!rst && rst.font >= 13, rst);

  /* DIFFERENT from each other -- the whole of "different colors". Compared as
     computed backgrounds, because both are gradients and neither has a plain
     background-color to read. */
  /* Against a PLAIN .bt-cc-btn -- the name-reroll die, which carries the base
     class and nothing else. A recolour that loses the cascade renders as the
     base slate and would pass a rnd-vs-rst comparison on Reset's rule alone,
     which is exactly how the first cut of this shipped looking unchanged. */
  const plain = await info(P, '.bt-cc-namewrap .bt-cc-btn');
  rec.ok('Randomize is not the default slate button', !!plain && rnd.bg !== plain.bg,
    { rnd: rnd.bg, plain: plain && plain.bg });
  rec.ok('Reset is not the default slate button either', !!plain && rst.bg !== plain.bg,
    { rst: rst.bg });
  rec.ok('the two buttons are not the same colour',
    !!rnd && !!rst && rnd.bg !== rst.bg, { rnd: rnd && rnd.bg, rst: rst && rst.bg });
  /* ...and neither has become a second gold plate: ENTER BRO TOWN is the one
     primary on this screen. */
  const play = await info(P, 'button.bt-cc-play');
  rec.ok('...and neither of them borrowed the gold plate',
    !!play && rnd.bg !== play.bg && rst.bg !== play.bg, null);

  /* The two action rows keep the column's width. A grid item's min-width is
     min-content, so a nowrap label can quietly push its button wider than the
     1fr track -- which it did, by ~8px, until min-width:0 went in. Checked
     against the gold plate because that is the edge the eye lines them up
     with. */
  rec.ok('the action rows are no wider than the ENTER plate',
    !!play && rnd.w <= play.w + 1 && rst.w <= play.w + 1,
    { rnd: rnd.w, rst: rst.w, play: play.w });

  /* The placeholder is not ellipsised: "Name your Bro…" rendered as
     "Name your ..." in a 172px column, which reads as a broken string. */
  const ph = await P.page.evaluate(() => {
    const el = document.querySelector('input.bt-cc-name');
    if (!el) return null;
    const probe = document.createElement('span');
    const cs = getComputedStyle(el);
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
    probe.textContent = el.placeholder;
    document.body.appendChild(probe);
    const need = probe.getBoundingClientRect().width;
    probe.remove();
    const r = el.getBoundingClientRect();
    return { need, text: el.placeholder,
      room: r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) };
  });
  rec.ok('the placeholder fits the well without being cut to an ellipsis',
    !!ph && ph.need <= ph.room, ph);

  /* ── 3. the bigger label still fits on ONE line ──
     v2.3.2036 shipped a version of this pair where "Randomize Look" wrapped,
     and wrapping is what "bigger" costs if nobody measures it. */
  const lines = await P.page.evaluate(() => {
    const b = document.querySelector('[data-tut="cc-randomize"]');
    const span = b && b.querySelector('span');
    if (!span) return null;
    const cs = getComputedStyle(span);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    const probe = span.cloneNode(true);
    probe.style.whiteSpace = 'nowrap';
    probe.style.position = 'absolute'; probe.style.visibility = 'hidden';
    document.body.appendChild(probe);
    const need = probe.getBoundingClientRect().width;
    probe.remove();
    const icon = b.querySelector('img');
    return { h: span.getBoundingClientRect().height, lh, text: span.textContent,
      need, btnW: b.getBoundingClientRect().width,
      iconW: icon ? icon.getBoundingClientRect().width : 0,
      pad: getComputedStyle(b).padding, gap: getComputedStyle(b).gap };
  });
  rec.ok('"Randomize Look" still fits on one line at the bigger size',
    !!lines && lines.h < lines.lh * 1.7, lines);
}
