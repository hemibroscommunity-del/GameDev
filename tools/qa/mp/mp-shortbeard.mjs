/* v2.3.3588: THE SHORT BEARD -- on a phone.
 *
 * The owner: "Or maybe make the characters in game just look more like the
 * portraits."  Four townsfolk's Hemi Bros portraits wear the collection's
 * jaw beard, which ends at the chin, so the creator has a second beard: the
 * long one trimmed there (tools/ui/make_short_beard.py: its own art, frame
 * and placement, the rows under the mouth squeezed to 0.3).  Checked as a
 * player meets it:
 *
 *   1. its files are served: the three facings, their 256 px originals, the
 *      two picker icons and the meta;
 *   2. THE CREATOR offers it on the Beard tab beside the long one, and worn
 *      in the stage's three-quarter view it is the long beard's top -- the
 *      same left, right and top edges -- ending well above the long one's
 *      bottom;
 *   3. THE WORLD draws it the same way in all three facings it has (south,
 *      southwest, east; the face is turned away in the others), read off the
 *      player's own figure as the world draws it (window.__btCaptureLook);
 *   4. the beard colour row recolours it: grey is grey;
 *   5. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const FILES = ['south.png', 'southwest.png', 'east.png', 'hi/south.png', 'hi/southwest.png', 'hi/east.png',
  'thumb.png', 'thumb-sw.png', 'meta.json'];

const grab = (P) => P.page.evaluate(() => {
  const c = document.querySelector('.bt-cc-stage canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  return { w: c.width, h: c.height, data: Array.from(d) };
});
const pickTab = (P, label) => P.page.evaluate((l) => {
  const b = [...document.querySelectorAll('.bt-cc-tab')].find((x) => (x.textContent || '').trim() === l);
  if (b) { b.click(); return true; }
  return false;
}, label);
const pickTile = (P, title) => P.page.evaluate((t) => {
  const all = [...document.querySelectorAll('.bt-cc-strip > *')];
  const el = all.find((x) => (x.getAttribute('title') || '').toLowerCase() === t.toLowerCase());
  if (!el) return { ok: false, saw: all.map((x) => x.getAttribute('title')) };
  el.click();
  return { ok: true };
}, title);

/* the piece = worn minus bare: its box, its pixel count and its mean colour.
   The two pictures are laid on each other by `o`, where the figure's own
   origin is in each (the world's photographs: a photograph is the box round
   everything drawn, and a beard's frame reaches past the body's in the side
   views, so a bearded one is bigger than a bare one); the box is given from
   that origin, so two pieces compare whatever their pictures' sizes.  The
   creator's stage has none: one canvas, one size. */
const piece = (bare, worn) => {
  const W = worn.w, Hh = worn.h;
  const wo = worn.o || [0, 0], bo = bare.o || [0, 0];
  const dx = Math.round(bo[0] - wo[0]), dy = Math.round(bo[1] - wo[1]);
  let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity, n = 0, sr = 0, sg = 0, sb = 0;
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const bx = x + dx, by = y + dy;
      const j = bx >= 0 && by >= 0 && bx < bare.w && by < bare.h ? (by * bare.w + bx) * 4 : -1;
      let d = 0;
      for (let k = 0; k < 4; k++) d += Math.abs((j < 0 ? 0 : bare.data[j + k]) - worn.data[i + k]);
      if (d < 40) continue;
      n++; sr += worn.data[i]; sg += worn.data[i + 1]; sb += worn.data[i + 2];
      const ox = x - Math.round(wo[0]), oy = y - Math.round(wo[1]);
      if (ox < l) l = ox; if (ox > r) r = ox;
      if (oy < t) t = oy; if (oy > b) b = oy;
    }
  }
  return { l, r, t, b, h: b - t + 1, w: r - l + 1, n, rgb: n ? [sr / n, sg / n, sb / n].map(Math.round) : null };
};
/* the short beard is the long one's top: the same edges, its bottom well up */
const trimmed = (lng, sht) => sht.n > 40 && lng.n > sht.n
  && Math.abs(sht.t - lng.t) <= Math.max(3, lng.h * 0.06)
  && Math.abs(sht.l - lng.l) <= Math.max(3, lng.w * 0.08) && Math.abs(sht.r - lng.r) <= Math.max(3, lng.w * 0.08)
  && sht.h < lng.h * 0.7 && lng.b - sht.b > lng.h * 0.3;

/* one PNG data URL -> {w, h, data} as grab() gives, and the figure's origin in it */
const fromUrl = (url, o) => {
  const px = H.decodePng(Buffer.from(url.split(',')[1], 'base64'));
  const out = new Array(px.width * px.height * 4);
  for (let y = 0; y < px.height; y++) {
    for (let x = 0; x < px.width; x++) {
      const i = (y * px.width + x) * px.channels, o = (y * px.width + x) * 4;
      out[o] = px.data[i]; out[o + 1] = px.data[i + 1]; out[o + 2] = px.data[i + 2];
      out[o + 3] = px.channels === 4 ? px.data[i + 3] : 255;
    }
  }
  return { w: px.width, h: px.height, data: out, o };
};

/* the world's figure, standing, one way; photographed until two in a row
   agree (a beard's recolour bakes in the background: npc-looks.mjs's rule) */
const CLOCK = Math.floor(Date.now() / 60000) * 60000;
async function figure(P, dir) {
  let prev = null;
  for (let t = 0; t < 10; t++) {
    const cap = await P.page.evaluate(({ dir, clock }) => {
      const was = window.__btShadeOff;
      window.__btShadeOff = true;
      try { return window.__btCaptureLook && window.__btCaptureLook('stand', { dir, unitPx: 2, res: 1, weapon: null, clock }); }
      finally { window.__btShadeOff = was; }
    }, { dir, clock: CLOCK });
    if (cap && cap.frames && cap.frames.length && cap.dir === dir) {
      if (prev && prev === cap.frames[0]) return fromUrl(cap.frames[0], cap.origin);
      prev = cap.frames[0];
    }
    await P.page.waitForTimeout(t < 2 ? 1200 : 2000);
  }
  return null;
}
const wear = (P, beard, color = 'default') => P.page.evaluate(({ beard, color }) => {
  window.__btSetFacialHairColor(color);
  window.__btSetFacialHair(beard);
}, { beard, color });

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];

  /* ── 1. the files ── */
  const C = await H.newPlayer(browser, { name: 'Trim', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  C.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  await C.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  const served = await C.page.evaluate(async (files) => {
    const out = {};
    for (const f of files) {
      try { out[f] = (await fetch('/sprites/traits/facialhair/short-beard/' + f)).status; } catch (e) { out[f] = String(e); }
    }
    return out;
  }, FILES);
  rec.ok(`1. its files are served (${FILES.length})`, Object.values(served).every((s) => s === 200), served);

  /* ── 2. the creator ── */
  await C.page.click('[data-tut="login-create"]');
  await C.page.waitForSelector('.bt-cc-stage canvas', { timeout: 30000 });
  await C.page.waitForTimeout(2500);
  rec.ok('the Beard tab opened (guard)', await pickTab(C, 'Beard'), null);
  await C.page.waitForTimeout(600);
  rec.ok('beards could be cleared (guard)', (await pickTile(C, 'None')).ok === true, null);
  await C.page.waitForTimeout(1200);
  const bare = await grab(C);
  const gotLong = await pickTile(C, 'Beard');
  await C.page.waitForTimeout(1800);
  const lng = piece(bare, await grab(C));
  const gotShort = await pickTile(C, 'Short Beard');
  rec.ok('2. the creator offers a Short Beard beside the Beard', gotLong.ok === true && gotShort.ok === true, { gotLong, gotShort });
  await C.page.waitForTimeout(1800);
  const sht = piece(bare, await grab(C));
  console.log('    creator: long ' + JSON.stringify(lng) + ' short ' + JSON.stringify(sht));
  rec.ok(`...and worn it is the long beard trimmed at the chin: its top, left and right where the long one's are, `
       + `${sht.h} px tall to ${lng.h}, its bottom ${lng.b - sht.b} px higher`, trimmed(lng, sht), { lng, sht });
  await C.ctx.close().catch(() => {});

  /* ── 3. the world, every facing it has ── */
  const P = await H.newPlayer(browser, { name: 'Trimbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    await P.page.evaluate(() => { window.__btSetHeadwear('none'); window.__btSetHair('none'); window.__btSetEyewear('none'); });
    const rows = [];
    for (const dir of ['south', 'southwest', 'east']) {
      await wear(P, 'none');
      const b0 = await figure(P, dir);
      await wear(P, 'beard');
      const b1 = await figure(P, dir);
      await wear(P, 'short-beard');
      const b2 = await figure(P, dir);
      if (!b0 || !b1 || !b2) { rows.push({ dir, ok: false, why: 'no picture' }); continue; }
      const l = piece(b0, b1), s = piece(b0, b2);
      rows.push({ dir, ok: trimmed(l, s), long: { t: l.t, b: l.b, l: l.l, r: l.r, n: l.n }, short: { t: s.t, b: s.b, l: s.l, r: s.r, n: s.n } });
    }
    console.log('    world: ' + JSON.stringify(rows));
    rec.ok(`3. the world draws it trimmed in every facing it has: ${rows.map((r) => `${r.dir} ${r.short ? r.short.b - r.short.t + 1 + ' px to ' + (r.long.b - r.long.t + 1) : r.why}`).join(', ')}`,
      rows.length === 3 && rows.every((r) => r.ok), rows);

    /* ── 4. the colour row ── */
    await wear(P, 'none');
    const g0 = await figure(P, 'south');
    await wear(P, 'short-beard', 'gray');
    const g1 = await figure(P, 'south');
    const gp = g0 && g1 ? piece(g0, g1) : null;
    const grey = !!(gp && gp.rgb && Math.max(...gp.rgb) - Math.min(...gp.rgb) < 30 && gp.rgb[0] > 70);
    rec.ok(`4. the beard colour row recolours it: grey is grey (${gp && gp.rgb})`, grey, gp);
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
  rec.ok('5. no page errors', errors.length === 0, errors);
}
