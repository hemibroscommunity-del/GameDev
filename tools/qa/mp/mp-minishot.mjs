/* THE MINIMAP'S GLYPHS ARE ALL DIFFERENT SHAPES (v2.3.1810).
 *
 * minimapRenderer states the rule three times — "each thing gets its own
 * silhouette", "two marks that mean different things must not share a
 * silhouette" — and has broken it twice: `player` was head-and-shoulders
 * exactly like `npc`, and the first draft of the v2.3.1810 door came out as
 * the `house` roof while `node` was the same pentagon again.  Every one of
 * those was found by a person squinting at a screenshot, which is why they
 * kept happening.
 *
 * So the rule is a test now.  Each glyph is rendered at the size it actually
 * ships at, reduced to its alpha mask, and compared against every other one;
 * a pair that agrees on nearly every pixel is two marks a player cannot tell
 * apart.  It also writes the whole set out as a strip for review, because
 * "different from each other" is necessary and not sufficient — a shape can
 * be unique and still mean nothing, and only a person can judge that.
 */
import * as H from './harness.mjs';

/* The marker footprint on screen is ICON_PX (11) / BIG_ICON_PX (13).  Compare
   at 12: the point is whether they differ where it counts, not in the detail
   that only exists in the 32px authoring box. */
const CMP = 12;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Cart', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3500);

  rec.ok('the minimap exposes its glyphs (guard)',
    await P.page.evaluate(() => !!window.__btIconDump), {});

  /* Review strip, at a size a person can actually see. */
  const built = await P.page.evaluate(async () => {
    const imgs = await window.__btIconDump();
    const wrap = document.createElement('div');
    wrap.id = 'glyphstrip';
    wrap.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#22333a;padding:8px;'
      + 'display:flex;gap:8px;flex-wrap:wrap;width:390px';
    for (const k of Object.keys(imgs)) {
      if (!imgs[k]) continue;
      const box = document.createElement('div');
      box.style.cssText = 'display:flex;flex-direction:column;align-items:center;color:#eee;font:8px sans-serif;gap:2px';
      const im = document.createElement('img');
      im.src = imgs[k]; im.style.cssText = 'width:44px;height:44px;image-rendering:pixelated';
      box.appendChild(im);
      const lb = document.createElement('span'); lb.textContent = k; box.appendChild(lb);
      wrap.appendChild(box);
    }
    document.body.appendChild(wrap);
    return Object.keys(imgs).length;
  });
  rec.ok('every glyph rendered for review', built > 8, { built });
  await P.page.screenshot({ path: 'tools/qa/mp/out/glyphs.png', clip: { x: 0, y: 0, width: 390, height: 260 } });
  await P.page.evaluate(() => { const e = document.getElementById('glyphstrip'); if (e) e.remove(); });

  /* ── the actual assertion ── */
  const masks = await P.page.evaluate(async (N) => {
    const imgs = await window.__btIconDump();
    const out = {};
    for (const k of Object.keys(imgs)) {
      if (!imgs[k]) continue;
      const im = new Image(); im.src = imgs[k];
      await new Promise((r) => { im.onload = r; im.onerror = r; });
      const cv = document.createElement('canvas');
      cv.width = cv.height = N;
      const cx = cv.getContext('2d');
      cx.drawImage(im, 0, 0, N, N);
      const d = cx.getImageData(0, 0, N, N).data;
      /* THREE STATES, not two.  The first cut reduced each glyph to its alpha
         mask and reported `quest` vs `questDone` as IDENTICAL — both are a
         filled disc, and everything that distinguishes them is the near-black
         character drawn INSIDE it, which is just as opaque as the white.  The
         same blindness hid the skull's sockets, the door's opening and the
         arrow inside the player ring, i.e. exactly the detail v2.3.1810 added.
         Colour still carries no information (markers are tinted), but
         LIGHTNESS does: 0 nothing, 1 near-black, 2 white. */
      const m = [];
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] <= 96) { m.push(0); continue; }
        const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
        m.push(lum < 110 ? 1 : 2);
      }
      out[k] = m;
    }
    return out;
  }, CMP);

  const keys = Object.keys(masks);
  rec.ok('glyph masks came back (guard)', keys.length > 8, { n: keys.length });

  /* The two quest pins are ONE pin in two states — same disc, different
     character inside, and the marker colour differs as well (C_QUEST vs
     C_QUEST_DONE).  They are meant to look like siblings, so they are held to
     "not identical" rather than to the separation every unrelated pair needs. */
  const SIBLINGS = new Set(['quest vs questDone']);
  const worst = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = masks[keys[i]], b = masks[keys[j]];
      let diff = 0, on = 0;
      for (let k = 0; k < a.length; k++) { if (a[k] !== b[k]) diff++; if (a[k] || b[k]) on++; }
      /* Share of the INKED area they disagree on.  Measured against the union
         rather than the whole box so two small marks are not called similar
         just for both being mostly empty. */
      worst.push({ pair: keys[i] + ' vs ' + keys[j], d: on ? +(diff / on).toFixed(3) : 0 });
    }
  }
  worst.sort((p, q) => p.d - q.d);
  console.log('    closest pairs:', worst.slice(0, 5).map((w) => `${w.pair} ${w.d}`).join('   '));
  /* 0.18 is not arbitrary: `player` vs `npc` measured 0.10 before v2.3.1810
     separated them, and every deliberately-distinct pair in the set now sits
     above 0.25.  The gap between those is where the bar belongs. */
  const sib = worst.filter((w) => SIBLINGS.has(w.pair));
  const rest = worst.filter((w) => !SIBLINGS.has(w.pair));
  const tooClose = rest.filter((w) => w.d < 0.18);
  rec.ok('no two unrelated glyphs are the same shape', tooClose.length === 0, tooClose);
  rec.ok('...and the two quest pins still differ from each other',
    sib.every((w) => w.d > 0.02), sib);

  await P.ctx.close().catch(() => {});
}
