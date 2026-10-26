/* ═══ v2.3.3606: YOUR HAIR AND HAT STAY ON ═══
 *
 * The owner, 2026-10-26, two screenshots a minute apart: their new bro
 * standing south in his wavy hair, Red Bandana and Golden Glasses, then
 * jogging southwest bald, the glasses still on -- "Some traits will
 * disappear. It seems after combat or interacting in the world a while."
 *
 * Every head piece (hair, hat, beard, glasses, eyes, species) is a picture
 * the game MADE: cut out of its file onto a canvas since v2.3.2776, or
 * recoloured onto one.  A canvas is sent to the graphics chip the first time
 * it is drawn, and drawn again from the canvas whenever the graphics are
 * rebuilt.  iPhone Safari can empty a canvas and say nothing (mp-tabwipe,
 * TRAPS §250), and the v2.3.778 note in pixiRenderer.js records what its
 * memory purge does to anything but a picture loaded from a file: it comes
 * back invisible.  And a piece whose file failed to load three times was
 * given up for the whole session (v2.3.1305), its facing bald till a reload.
 *
 * On a phone in the world, the owner's look chosen in the creator:
 *   1. (guard) the worker's record of the character holds that look, and
 *      every head piece is drawn standing south;
 *   2. every head piece is kept as an IMAGE of its picture (keepAsImage.js),
 *      nothing waiting;
 *   3. (guard) every canvas behind a texture emptied, as Safari empties them,
 *      while the bro has only ever faced south;
 *   4. then in all eight facings, jogging and standing, the hair, the hat and
 *      the glasses are drawn whole (read back off the graphics chip);
 *   5. the graphics rebuilt (the black-screen recovery, every picture sent to
 *      the chip again): still whole in all eight;
 *   6. a hat whose southwest picture failed to load (three tries, the loader's
 *      own) comes back once the file can be had, while it is worn;
 *   7. no page errors.
 * QA_HK_EXPECT=blank runs the build before (?keepimage=0&traitretry=0):
 * blank after the wipe, after the rebuild, and the hat never back.
 *
 *   node tools/qa/mp/run.mjs headkeep
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const FACINGS = {
  east: ['d'], northeast: ['w', 'd'], north: ['w'], northwest: ['w', 'a'],
  west: ['a'], southwest: ['s', 'a'], south: ['s'], southeast: ['s', 'd'],
};
/* the Golden Glasses have no north picture: hidden there by design */
const DESIGNED_OFF = { eye: { north: true } };
const LOOK = { hair: 'wavy', hat: 'bandana-2', eye: 'golden-glasses' };
const BLOCKED_HAT = 'top-hat';

/* the owner's look in the creator's stores before the first join (so the
   worker's record of the character holds it, as the creator's does), and the
   one picture this test makes unloadable: the top hat's southwest file, every
   try, while __qaBlockHat is set */
const INIT = (look, hat) => {
  try {
    localStorage.setItem('bt-hair', look.hair);
    localStorage.setItem('bt-headwear', look.hat);
    localStorage.setItem('bt-eyewear', look.eye);
  } catch (e) { /* none */ }
  window.__qaBlockHat = true;
  window.__qaBlocked = 0;
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  const re = new RegExp('/sprites/traits/headwear/' + hat + '/southwest\\.png');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true, enumerable: d.enumerable,
    get() { return d.get.call(this); },
    set(v) {
      if (window.__qaBlockHat && re.test(String(v))) { window.__qaBlocked++; return d.set.call(this, '/__qa_no_such_picture__.png'); }
      return d.set.call(this, v);
    },
  });
};

/* the three head pieces now: shown, and their picture read back off the
   graphics chip (a sprite of it drawn on nothing) */
const pieces = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer;
  const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
  if (!d) return null;
  const r = R.app.renderer;
  const one = (s) => {
    if (!s) return null;
    const t = s.texture, src = t && t.source;
    const o = { vis: !!s.visible, uid: src ? src.uid : null, img: !!(src && src.resource && src.resource.tagName === 'IMG'),
      dead: !!(t && t.destroyed) || !!(src && src.destroyed) };
    if (o.vis && t && src && !o.dead && t !== t.constructor.EMPTY) {
      try {
        const probe = new s.constructor(t);
        const px = r.extract.pixels({ target: probe, clearColor: [0, 0, 0, 0] });
        probe.destroy();
        const a = px.pixels || px;
        let op = 0;
        for (let i = 3; i < a.length; i += 4) if (a[i] > 40) op++;
        o.px = op;
      } catch (e) { o.err = String(e && e.message || e).slice(0, 80); }
    }
    return o;
  };
  return { dir: d._animDir, pose: d._animPose, hair: one(d._hairSprite), hat: one(d._headwearSprite), eye: one(d._eyewearSprite) };
});

async function sweep(P, label) {
  const bad = [];
  for (const [name, keys] of Object.entries(FACINGS)) {
    for (const phase of ['jog', 'stand']) {
      for (const k of keys) await P.page.keyboard.down(k);
      await P.page.waitForTimeout(phase === 'jog' ? 700 : 260);
      if (phase === 'stand') for (const k of keys) await P.page.keyboard.up(k);
      if (phase === 'stand') await P.page.waitForTimeout(500);
      const p = await pieces(P).catch((e) => ({ err: String(e) }));
      if (phase === 'jog') for (const k of keys) await P.page.keyboard.up(k);
      for (const k of ['hair', 'hat', 'eye']) {
        if (DESIGNED_OFF[k] && DESIGNED_OFF[k][name]) continue;
        const o = p && p[k];
        if (!o || !o.vis || o.dead || !(o.px > 0)) bad.push(`${name} ${phase} ${k}: ${JSON.stringify(o)} (${p && p.pose} ${p && p.dir})`);
      }
    }
  }
  console.log(`    [${label}] ${bad.length ? bad.length + ' not drawn:\n      ' + bad.slice(0, 10).join('\n      ') : 'every piece drawn in every facing'}`);
  return bad;
}

/* every canvas behind a texture emptied, as Safari empties them (mp-tabwipe's
   own walk); their copies on the graphics chip untouched */
const WIPE = () => {
  const out = new Set();
  try { for (const s of (window.__btGpuTexSources ? window.__btGpuTexSources() : [])) if (s) out.add(s); } catch (e) { /* none */ }
  const R = window._pixiRenderer;
  const walk = (c) => { if (!c) return; if (c.texture && c.texture.source) out.add(c.texture.source); for (const k of (c.children || [])) walk(k); };
  try { walk(R && R.app && R.app.stage); } catch (e) { /* none */ }
  const r = R && R.app && R.app.renderer;
  let canvases = 0, onChip = 0;
  const seen = new Set();
  for (const s of out) {
    const cv = s && s.resource;
    if (!cv || seen.has(cv) || typeof cv.getContext !== 'function' || !(cv.width > 0) || !(cv.height > 0)) continue;
    if (cv === (r && r.canvas)) continue;
    let g = null;
    try { g = cv.getContext('2d'); } catch (e) { g = null; }
    if (!g) continue;
    seen.add(cv);
    canvases++;
    if (s._gpuData && r && s._gpuData[r.uid]) onChip++;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.restore();
  }
  return { canvases, onChip };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const before = process.env.QA_HK_EXPECT === 'blank';
  const P = await H.newPlayer(browser, {
    name: 'Wavybro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel',
    query: before ? 'keepimage=0&traitretry=0' : '',
    init: `(${INIT.toString()})(${JSON.stringify(LOOK)}, ${JSON.stringify(BLOCKED_HAT)})`,
  });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  let stop = null;
  try {
    await H.enterWorld(P);
    const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the world' }).catch(() => null);
    if (!inWheel) { rec.ok('in the world (guard)', false, inWheel); return; }
    stop = H.keepAlive(P);
    await P.page.waitForTimeout(2500);

    /* 1. the look, recorded and drawn standing south */
    const recLook = await P.page.evaluate(() => { const r = window.__btCharRecord && window.__btCharRecord(); return r && r.look ? { hr: r.look.hr, hw: r.look.hw, ew: r.look.ew } : null; });
    const south = await pieces(P);
    const drawn = (o) => !!(o && o.vis && o.px > 0);
    rec.ok('the record holds the creator\'s look, and every head piece is drawn standing (guard)',
      !!recLook && recLook.hr === LOOK.hair && recLook.hw === LOOK.hat && recLook.ew === LOOK.eye
        && drawn(south && south.hair) && drawn(south && south.hat) && drawn(south && south.eye),
      { recLook, south });

    /* 2. kept as images */
    let kept = null;
    for (let i = 0; i < 40; i++) {
      kept = await P.page.evaluate(() => (window.__btKeptImages ? window.__btKeptImages() : null));
      if (!kept || kept.off || kept.pending === 0) break;
      await P.page.waitForTimeout(250);
    }
    const isImg = (o) => !!(o && o.img);
    if (before) {
      rec.ok('(the build before) the head pieces are canvases', !isImg(south.hair) && !isImg(south.hat), { south, kept });
    } else {
      rec.ok(`every head piece is kept as an image of its picture, nothing waiting (${kept && kept.kept} kept, ${kept && kept.failed} failed)`,
        !!kept && !kept.off && kept.pending === 0 && kept.kept > 0 && isImg(south.hair) && isImg(south.hat) && isImg(south.eye),
        { kept, south });
    }

    /* 3. the canvases emptied, the bro having faced south only */
    const w = await P.page.evaluate(WIPE);
    rec.ok(`(guard) every canvas behind a texture emptied as Safari empties them (${w.canvases}, ${w.onChip} of them on the chip)`, w.canvases > 50, w);

    /* 4. every facing */
    const afterWipe = await sweep(P, 'after the wipe');
    if (before) rec.ok('(the build before) a facing first drawn after the wipe has lost a head piece', afterWipe.length > 0, afterWipe.slice(0, 6));
    else rec.ok('after the wipe the hair, the hat and the glasses are drawn in all eight facings, jogging and standing', afterWipe.length === 0, afterWipe.slice(0, 6));

    /* 5. the graphics rebuilt: every picture sent to the chip again */
    const oldR = await P.page.evaluate(() => { const R = window._pixiRenderer; window.__qaOldR = R; return !!R; });
    await P.page.evaluate(() => { window.__btLastGlRebuild = 0; window._rebuildRenderer && window._rebuildRenderer('qa: mp-headkeep'); });
    const back = await H.waitFor(P, () => ({ fresh: !!(window._pixiRenderer && window._pixiRenderer !== window.__qaOldR && window._pixiRenderer.playerDisplayRaw && window._pixiRenderer.playerDisplayRaw()) }),
      (v) => v.fresh, { timeout: 30000, label: 'a rebuilt renderer' }).catch(() => null);
    await P.page.waitForTimeout(2500);
    rec.ok('(guard) the graphics were rebuilt', !!oldR && !!back, back);
    const afterRebuild = back ? await sweep(P, 'after the rebuild') : ['no rebuild'];
    if (before) rec.ok('(the build before) after the rebuild the head pieces are blank', afterRebuild.length > 0, afterRebuild.slice(0, 6));
    else rec.ok('after the rebuild the hair, the hat and the glasses are drawn in all eight facings', afterRebuild.length === 0, afterRebuild.slice(0, 6));

    /* 6. a hat whose southwest picture could not be loaded */
    const blocked = await P.page.evaluate((hat) => { window.__btSetHeadwear(hat); return window.__qaBlocked; }, BLOCKED_HAT);
    const faceSw = async (ms) => {
      await P.page.keyboard.down('s'); await P.page.keyboard.down('a');
      await P.page.waitForTimeout(ms);
      const p = await pieces(P).catch(() => null);
      await P.page.keyboard.up('a'); await P.page.keyboard.up('s');
      return p;
    };
    const missing = await faceSw(700);
    rec.ok(`(guard) the top hat's southwest picture failed every try (${blocked} refused) and is not drawn`, blocked >= 3 && !(missing && missing.hat && missing.hat.vis), { blocked, hat: missing && missing.hat, dir: missing && missing.dir });
    await P.page.evaluate(() => { window.__qaBlockHat = false; });
    let got = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 40000) {
      got = await faceSw(900);
      if (got && got.dir === 'southwest' && drawn(got.hat)) break;
      await P.page.waitForTimeout(1500);
    }
    const ok = !!(got && got.dir === 'southwest' && drawn(got.hat));
    if (before) rec.ok('(the build before) the top hat never comes back on the southwest', !ok, { hat: got && got.hat });
    else rec.ok(`the top hat comes back on the southwest once its picture can be had (${Math.round((Date.now() - t0) / 1000)} s)`, ok, { hat: got && got.hat, dir: got && got.dir });

    rec.ok('no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    if (stop) stop();
    await P.ctx.close().catch(() => {});
  }
}
