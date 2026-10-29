/* ═══ v2.3.3890: TWO LOSSES OF THE GRAPHICS, SECONDS APART ═══
 *
 * A black screen (the graphics chip's context lost, on an iPhone from memory
 * pressure) is answered by a rebuilt renderer 2.5 s on (crashTrap
 * watchContextLoss -> window._rebuildRenderer), which ignored any call within
 * 5 s of the last rebuild.  So a SECOND loss soon after the first was restored
 * in place and never rebuilt -- and the pictures gpuOnly.js keeps on the chip
 * only (the combat poses' gear strips, the weapon bodies, the damage numbers'
 * font pages: their canvases emptied once uploaded) were sent to that restored
 * context again from nothing, and drew blank.  Now a call inside the window is
 * owed one rebuild for the moment the window ends.
 *
 * On a phone (390 x 844, the look palette on) and on a computer (wide, the
 * palette off: ?lookpalette=0), each in the Wheel:
 *   1. one loss (lost, given back 0.8 s on): ONE rebuild, none owed, and the
 *      combat strips, the font's pages and a damage number draw after it;
 *   2. two losses: the second about 1.5 s after the first rebuild began (as
 *      on a phone, which brings a rebuilt renderer up in a second or two;
 *      this box takes 10-15 s and its timers run late, so the first rebuild's
 *      start is set back and crashTrap's own call for the second loss is run
 *      at once): TWO
 *      rebuilds (the second owed), and after them every combat strip draws
 *      what it drew before (byte for byte, off the GPU), every font page holds
 *      what its canvas held, and a damage number draws;
 *   3. the chip's textures after the two losses back to their count after
 *      the one (nothing piles up);
 *   4. the control, a phone with ?owedrebuild=0 (the game as it was): the same
 *      two losses leave ONE rebuild and the pictures blank -- the fault this
 *      catches (DL_CONTROL=0 skips it);
 *   5. no page errors.
 *
 *   node tools/qa/mp/run.mjs doubleloss
 *   DL_VIEW=phone|desk   one of the two (both)
 */
import * as H from './harness.mjs';

const VIEWS = {
  phone: { viewport: { width: 390, height: 844 }, touch: true, dpr: 3 },
  desk: { viewport: { width: 1366, height: 768 }, touch: false, dpr: 1, wide: true, query: 'lookpalette=0' },
};

/* gpuOnly.js's own record of what each canvas held when it was let go of */
const INIT = () => { window.__btGpuOnlyHeld = []; };

/* every combat strip's frames drawn back off the GPU, hashed (mp-gpuonly's) */
const stripPrints = (P) => P.page.evaluate(() => {
  const strips = window._pixiRenderer.combatStrips();
  const out = {};
  for (const key of Object.keys(strips)) {
    const frames = strips[key];
    if (!frames || !frames.length) continue;
    let h = 2166136261 >>> 0, lit = 0;
    for (const f of frames) {
      if (!f || f.destroyed) continue;
      const { pixels } = window._pixiRenderer.drawnPixels(f);
      for (let i = 0; i < pixels.length; i++) {
        h ^= pixels[i]; h = Math.imul(h, 16777619) >>> 0;
        if ((i & 3) === 3 && pixels[i] > 0) lit++;
      }
    }
    out[key] = { h, lit };
  }
  return out;
});
/* the font's pages: each one's alpha off the GPU beside what its canvas held */
const fontPages = (P) => P.page.evaluate(() => {
  const held = window.__btGpuOnlyHeld || [];
  return window.__btDmgFont().pages.map((tex) => {
    const rec = held.filter((r) => r.source === tex.source).pop();
    const { pixels } = window._pixiRenderer.drawnPixels(tex);
    let h = 2166136261 >>> 0, lit = 0;
    for (let i = 3; i < pixels.length; i += 4) { h ^= pixels[i]; h = Math.imul(h, 16777619) >>> 0; if (pixels[i]) lit++; }
    return { lit, same: !!rec && rec.alpha === h };
  });
});
/* a damage number, as pushDmgPopup builds one, read back at full strength */
const numberDraws = (P) => P.page.evaluate(async () => {
  const S = window._gameState.current;
  const R = window._pixiRenderer.app.renderer;
  const d = { x: S.player.x, y: S.player.y - 140, text: '1234', color: '#fff', ts: Date.now(), ttl: 12, rise: 0 };
  S.dmgNumbers.push(d);
  for (let i = 0; i < 40 && !(d._pixiText && !d._pixiText.destroyed); i++) await new Promise((r) => setTimeout(r, 100));
  const t = d._pixiText;
  if (!t) return { white: 0, err: 'not drawn' };
  const a0 = t.alpha, sx = t.scale.x, sy = t.scale.y, r0 = t.rotation;
  t.alpha = 1; t.scale.set(1, 1); t.rotation = 0;
  const { pixels } = R.extract.pixels(t);
  t.alpha = a0; t.scale.set(sx, sy); t.rotation = r0;
  let white = 0;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] >= 128 && pixels[i] > 200 && pixels[i + 1] > 200 && pixels[i + 2] > 200) white++;
  d.ts = 0; d.ttl = 0.001;
  return { white };
});
const state = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer, r = R && R.app && R.app.renderer;
  return { uid: r ? r.uid : null, rebuilds: window.__btGlRebuilds || 0, owed: window.__btGlRebuildsOwed || 0,
    textures: r && r.texture && r.texture.managedTextures ? r.texture.managedTextures.length : null };
});
/* the context lost, and given back 0.8 s on, as a phone's memory pressure does */
const lose = (P) => P.page.evaluate(() => {
  const c = document.querySelector('canvas');
  const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
  const ext = gl && gl.getExtension('WEBGL_lose_context');
  if (!ext) return false;
  ext.loseContext();
  setTimeout(() => { try { ext.restoreContext(); } catch (e) { /* gone */ } }, 800);
  return true;
});
const newRenderer = (P, uid) => H.waitFor(P, () => { const R = window._pixiRenderer; return R && R.app && R.app.renderer ? R.app.renderer.uid : null; },
  (u) => u != null && u !== uid, { timeout: 20000, label: 'a rebuilt renderer' }).catch(() => null);
/* the strips cut again by a new renderer, and what they and the font draw */
async function drawn(P, keys) {
  await H.waitFor(P, () => Object.keys(window._pixiRenderer.combatStrips()).length, (n) => n >= keys,
    { timeout: 45000, label: 'the strips cut again' }).catch(() => null);
  await P.page.waitForTimeout(2500);
  return { strips: await stripPrints(P), font: await fontPages(P), number: await numberDraws(P) };
}
const litStrips = (s) => Object.values(s).filter((v) => v.lit > 0).length;
const sameStrips = (a, b) => Object.keys(b).filter((k) => !a[k] || a[k].h !== b[k].h);

export async function run({ browser, wsPort, webPort, rec }) {
  const pages = (process.env.DL_VIEW ? [process.env.DL_VIEW] : ['phone', 'desk']).map((v) => ({ name: v, V: VIEWS[v], control: false }));
  if (process.env.DL_CONTROL !== '0') pages.push({ name: 'phone-control', V: { ...VIEWS.phone, query: 'owedrebuild=0' }, control: true });
  for (const { name, V, control } of pages) {
    const P = await H.newPlayer(browser, { name: 'Dloss' + name.replace(/-/g, ''), wsPort, webPort, world: 'wheel', init: INIT, ...V });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
        { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
      rec.ok(`${name}: in the Wheel (guard)`, !!ok, ok);
      if (!ok) continue;
      await P.page.waitForTimeout(4000);
      const base = { strips: await stripPrints(P), font: await fontPages(P), number: await numberDraws(P) };
      const keys = Object.keys(base.strips).length;
      rec.ok(`${name}: before any loss, the combat strips, the font's pages and a damage number draw (guard: ${litStrips(base.strips)} of ${keys} strips lit, number ${base.number.white} px)`,
        keys >= 20 && litStrips(base.strips) >= keys - 1 && base.font.every((p) => p.lit > 0) && base.number.white > 500, { keys, number: base.number });

      /* 1: one loss */
      const s0 = await state(P);
      if (!control) {
        rec.ok(`${name}: the context can be lost (guard)`, await lose(P), null);
        await newRenderer(P, s0.uid);
        await P.page.waitForTimeout(9000);
        const s1 = await state(P);
        const d1 = await drawn(P, keys);
        rec.ok(`${name}: one loss: one rebuild, none owed (${s1.rebuilds - s0.rebuilds} rebuilt, ${s1.owed - s0.owed} owed), and after it every strip draws as before (${sameStrips(d1.strips, base.strips).length} differ), the font's pages hold what their canvases held, a number draws (${d1.number.white} px)`,
          s1.rebuilds - s0.rebuilds === 1 && s1.owed === s0.owed && s1.uid !== s0.uid && sameStrips(d1.strips, base.strips).length === 0
          && d1.font.every((p) => p.same && p.lit > 0) && d1.number.white > 500, { s0, s1, differ: sameStrips(d1.strips, base.strips).slice(0, 4), font: d1.font });
      }

      /* 2: two losses, the second about 1.5 s after the first rebuild began */
      const s2a = await state(P);
      await lose(P);
      const mid = await newRenderer(P, s2a.uid);
      /* inside the window: the second loss's own rebuild call (crashTrap's,
         2.5 s on) must fall within 5 s of the first rebuild.  On this box a
         rebuilt renderer takes 10-15 s to come up (a phone: a second or two),
         and its timers then run seconds late, so the call always landed
         outside the window and rebuilt the old way.  As on a phone: the first
         rebuild's start set back to 1.5 s ago, and crashTrap's own 2.5 s
         callback for the second loss held as the loss is made and run at
         once -- the same call, on a phone's clock */
      const age = await P.page.evaluate(() => {
        const a = Date.now() - (window.__btLastGlRebuild || 0);
        window.__btLastGlRebuild = Date.now() - 1500;
        const st = window.setTimeout;
        window.__qaHeld = [];
        window.setTimeout = function (fn, ms) { if (ms === 2500 && typeof fn === 'function') { window.__qaHeld.push(fn); return 0; } return st.apply(this, arguments); };
        window.__qaUnhold = () => { window.setTimeout = st; };
        return a;
      });
      const lost2 = await lose(P);
      await P.page.waitForTimeout(300);
      const held = await P.page.evaluate(() => { window.__qaUnhold(); const n = window.__qaHeld.length; for (const fn of window.__qaHeld) { try { fn(); } catch (e) { /* its own */ } } return n; });
      rec.ok(`${name}: the second loss's rebuild call is crashTrap's own, held and run inside the window (guard: ${held} held)`, held >= 1, held);
      await P.page.waitForTimeout(10000);
      const s2 = await state(P);
      console.log(`    [${name}] the rebuild calls: ${JSON.stringify(await P.page.evaluate(() => window.__btGlRebuildLog || []))}`);
      const d2 = await drawn(P, keys);
      const differ = sameStrips(d2.strips, base.strips);
      const fontOk = d2.font.every((p) => p.same && p.lit > 0);
      console.log(`    [${name}] two losses (the new renderer up ${age} ms after the first rebuild began; the second loss as if 1.5 s): ${JSON.stringify({ s2a, mid, s2 })}; strips lit ${litStrips(d2.strips)} of ${keys}, ${differ.length} differ; font pages same ${d2.font.filter((p) => p.same).length} of ${d2.font.length}; number ${d2.number.white} px`);
      if (!control) {
        rec.ok(`${name}: two losses seconds apart: two rebuilds, the second owed (${s2.rebuilds - s2a.rebuilds} rebuilt, ${s2.owed - s2a.owed} owed)`,
          !!lost2 && mid != null && s2.rebuilds - s2a.rebuilds === 2 && s2.owed - s2a.owed === 1, { s2a, mid, s2 });
        rec.ok(`${name}: ...and after them every combat strip draws as before, byte for byte (${differ.length} of ${keys} differ), every font page holds what its canvas held, a damage number draws (${d2.number.white} px)`,
          differ.length === 0 && fontOk && d2.number.white > 500, { differ: differ.slice(0, 6), font: d2.font, number: d2.number });
        /* 3 */
        const t1 = s2a.textures, t2 = s2.textures;
        rec.ok(`${name}: the chip's textures after the two losses back to their count after the one (${t1} -> ${t2}, at most 5% more)`,
          t1 != null && t2 != null && t2 - t1 <= Math.max(5, Math.ceil(t1 * 0.05)), { t1, t2 });
      } else {
        /* 4: the game as it was */
        const blank = differ.length > 0 || !fontOk || d2.number.white <= 500;
        rec.ok(`${name}: the control (?owedrebuild=0): the second loss is not rebuilt (${s2.rebuilds - s2a.rebuilds} rebuilt) and the pictures kept on the chip draw blank (${differ.length} strips differ, font ${fontOk ? 'fine' : 'blank'}, number ${d2.number.white} px) -- the fault this catches`,
          s2.rebuilds - s2a.rebuilds === 1 && blank, { s2a, s2 });
      }
      rec.ok(`${name}: no page errors`, errors.length === 0, errors.slice(0, 6));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
