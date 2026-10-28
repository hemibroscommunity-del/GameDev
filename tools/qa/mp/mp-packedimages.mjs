/* ═══ v2.3.3702: THE ARMOUR, BODY AND EFFECT SHEETS KEPT AS IMAGES OF THEMSELVES ═══
 *
 * The owner, 2026-10-28: "Memory seems to be the persistent bottleneck in
 * terms of performance in this game.  Getting that to run as low as possible
 * without sacrificing performance is the goal", and that night: "Keep running
 * tests through the night on memory fixes/improvements and testing for
 * disappearing traits."
 *
 * Every strip gearSheets.js packs -- the walking armour, belt and shirt
 * sheets, the body sheets and the effect, townsfolk and head-piece strips --
 * is now kept as a PNG of its own pixels in an <img>, its canvas let go of
 * (docs/specs/packed-as-images.md).  A phone in the world, a pattern on the
 * trousers, hair, a hat and glasses, a copper torso and copper greaves worn
 * the real way:
 *   1. every walking gear sheet the page holds is an image, none a canvas, and
 *      nothing is still being kept;
 *   2. THE SAME PIXELS: each worn layer's picture read back off the graphics
 *      chip as it was sent there (from its canvas), then sent again from its
 *      image (source.update()) and read back again -- not a pixel different;
 *   3. every layer of the bro drawn jogging every way, the body baked under
 *      the armour from the images (masked, never plain);
 *   4. a black screen's rebuild (the context lost, the game's own way back):
 *      the new renderer gets every picture from the images, every layer drawn
 *      every way again;
 *   5. no page errors.
 *
 *   node tools/qa/mp/run.mjs packedimages
 *   BT_PI_QUERY=keepimage=0   the game as it was (1 and 2 then fail)
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const FACINGS = {
  south: ['s'], southeast: ['s', 'd'], east: ['d'], northeast: ['w', 'd'],
  north: ['w'], northwest: ['w', 'a'], west: ['a'], southwest: ['s', 'a'],
};
const LAYERS = { body: '_spriteBody', shirt: '_gearShirt', chest: '_gearChest', legs: '_gearLegs',
  hair: '_hairSprite', hat: '_headwearSprite', eye: '_eyewearSprite', head: '_bodyHead' };
/* drawn off by design (mp-rebuildjog): the glasses have no north picture; the
   head overlay only where a head sheet ships; the shirt under the plate */
const MAY_BE_OFF = new Set(['eye/north', 'shirt/*', 'head/*']);
const mayBeOff = (k, dir) => MAY_BE_OFF.has(k + '/' + dir) || MAY_BE_OFF.has(k + '/*');
const LOOK = { hair: 'wavy', hat: 'bandana-2', eye: 'golden-glasses' };

const INIT = (look) => {
  try {
    if (!localStorage.getItem('qa-pi-seeded')) {
      localStorage.setItem('bt-hair', look.hair);
      localStorage.setItem('bt-headwear', look.hat);
      localStorage.setItem('bt-eyewear', look.eye);
      localStorage.setItem('bt-pantspat', 'check:3');
      localStorage.setItem('qa-pi-seeded', '1');
    }
  } catch (e) { /* reported below */ }
};

/* every layer now: shown, its picture's opaque pixels read back off the chip */
const layersNow = (P) => P.page.evaluate((LAYERS) => {
  const R = window._pixiRenderer;
  const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
  if (!d) return null;
  const r = R.app.renderer;
  const shown = (s) => { for (let c = s; c; c = c.parent) { if (!c.visible || c.renderable === false) return false; if (c.parent == null) return true; } return true; };
  const masked = new Set((window.__btMaskedSources ? window.__btMaskedSources() : []).map((x) => x.uid));
  const out = { pose: d._animPose, dir: d._animDir, flip: !!(d.scale && d.scale.x < 0), fs: !!d._fullsetOn };
  for (const [k, prop] of Object.entries(LAYERS)) {
    const s = d[prop];
    if (!s) { out[k] = null; continue; }
    const t = s.texture, src = t && t.source;
    const o = { vis: !!(s.visible && shown(s) && s.alpha > 0.02), uid: src ? src.uid : null,
      dead: !!(t && t.destroyed) || !!(src && src.destroyed) };
    if (k === 'body') o.masked = !!(src && masked.has(src.uid));
    const res = src && src.resource;
    o.cv = res ? (res.tagName === 'IMG' ? 'img' : (typeof res.getContext === 'function' ? (res.width > 0 ? 'canvas' : 'emptied') : 'other')) : null;
    if (o.vis && t && src && !o.dead && t !== t.constructor.EMPTY && t.width > 2) {
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
    out[k] = o;
  }
  return out;
}, LAYERS);

/* jog each way in turn, every layer read while jogging */
async function sweep(P, label) {
  const bad = [];
  const rows = [];
  for (const [dir, keys] of Object.entries(FACINGS)) {
    for (const k of keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(900);
    const p = await layersNow(P).catch((e) => ({ err: String(e) }));
    await P.page.waitForTimeout(500);
    const p2 = await layersNow(P).catch(() => null);
    for (const k of keys) await P.page.keyboard.up(k);
    await P.page.waitForTimeout(250);
    const fs = !!(p && p.fs);
    const row = { dir, fs };
    for (const k of Object.keys(LAYERS)) {
      const a = p && p[k], b = p2 && p2[k];
      const drawn = (o) => !!(o && o.vis && !o.dead && o.px > 0);
      row[k] = a ? (drawn(a) ? a.px : (a.vis ? 'BLANK' : 'off')) + (k === 'body' ? (fs ? ' figure' : (a.masked ? ' masked' : ' PLAIN')) : '') + ` ${a.cv || ''}` : '-';
      if (mayBeOff(k, dir)) continue;
      if (fs && (k === 'chest' || k === 'legs')) continue;
      if (!drawn(a) || !drawn(b)) bad.push(`${dir} ${k}: first ${JSON.stringify(a)} then ${JSON.stringify(b)}`);
      if (k === 'body' && !fs && a && b && !a.masked && !b.masked) bad.push(`${dir} body drawn PLAIN under the armour (both looks)`);
    }
    rows.push(row);
  }
  console.log(`    [${label}] ${bad.length ? bad.length + ' wrong' : 'every layer drawn every way'}`);
  for (const r of rows) console.log(`      ${r.dir.padEnd(9)}${r.fs ? ' (figure)' : ''} ` + Object.keys(LAYERS).map((k) => `${k} ${r[k]}`).join(' | '));
  for (const b of bad.slice(0, 12)) console.log('      ! ' + b);
  return { bad, rows };
}

/* what the page holds: every walking gear sheet's source, image or canvas */
const sheetsNow = (P) => P.page.evaluate(() => {
  const out = new Set();
  try { for (const s of (window.__btGpuTexSources ? window.__btGpuTexSources() : [])) if (s) out.add(s); } catch (e) { /* none */ }
  const R = window._pixiRenderer;
  const walk = (c) => { if (!c) return; if (c.texture && c.texture.source) out.add(c.texture.source); for (const k of (c.children || [])) walk(k); };
  try { walk(R && R.app && R.app.stage); } catch (e) { /* none */ }
  let img = 0, canvas = 0, imgMb = 0, canvasMb = 0;
  const canvasList = [];
  for (const s of out) {
    if (!s || s.destroyed || !/\/sprites\/gear\//.test(String(s.label || ''))) continue;
    const res = s.resource;
    const mb = (s.pixelWidth || 0) * (s.pixelHeight || 0) * 4 / 1048576;
    if (res && res.tagName === 'IMG') { img++; imgMb += mb; } else if (res && typeof res.getContext === 'function' && res.width > 0) {
      canvas++; canvasMb += mb; if (canvasList.length < 8) canvasList.push(String(s.label).split('/').slice(-3).join('/'));
    }
  }
  const kept = window.__btKeptImages ? window.__btKeptImages() : null;
  return { img, canvas, imgMb: +imgMb.toFixed(2), canvasMb: +canvasMb.toFixed(2), canvasList, kept };
});

/* what the kept images cost the page for certain: their PNGs' bytes (a
   picture kept as an image is drawn from a blob: of its own PNG) -- against
   the canvases they replaced, four bytes a pixel */
const keptBytes = (P) => P.page.evaluate(async () => {
  const out = new Set();
  try { for (const s of (window.__btGpuTexSources ? window.__btGpuTexSources() : [])) if (s) out.add(s); } catch (e) { /* none */ }
  const R = window._pixiRenderer;
  const walk = (c) => { if (!c) return; if (c.texture && c.texture.source) out.add(c.texture.source); for (const k of (c.children || [])) walk(k); };
  try { walk(R && R.app && R.app.stage); } catch (e) { /* none */ }
  let n = 0, png = 0, px = 0;
  const seen = new Set();
  for (const s of out) {
    const res = s && !s.destroyed && s.resource;
    if (!res || res.tagName !== 'IMG' || !/^blob:/.test(res.src || '') || seen.has(res.src)) continue;
    seen.add(res.src);
    try { const b = await (await fetch(res.src)).blob(); png += b.size; n++; px += (res.naturalWidth || 0) * (res.naturalHeight || 0); } catch (e) { /* revoked */ }
  }
  return { images: n, pngMb: +(png / 1048576).toFixed(2), asCanvasesMb: +(px * 4 / 1048576).toFixed(2) };
});

/* each worn layer's picture read back as the chip holds it, then sent again
   from its source as it is now (the image) and read back again */
const samePixels = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer;
  const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
  const r = R && R.app && R.app.renderer;
  if (!d || !r) return null;
  const read = (t, Sprite) => {
    const probe = new Sprite(t);
    const px = r.extract.pixels({ target: probe, clearColor: [0, 0, 0, 0] });
    probe.destroy();
    return px.pixels || px;
  };
  const out = [];
  for (const prop of ['_gearShirt', '_gearChest', '_gearLegs', '_spriteBody']) {
    const s = d[prop];
    const t = s && s.texture, src = t && t.source;
    if (!t || !src || src.destroyed || !(t.width > 2)) continue;
    const res = src.resource;
    const kind = res ? (res.tagName === 'IMG' ? 'img' : 'canvas') : 'none';
    const label = String(src.label || '').split('/').slice(-3).join('/');
    const a = read(t, s.constructor);
    try { src.update(); } catch (e) { /* none */ }
    const b = read(t, s.constructor);
    let diff = 0, maxd = 0, opaque = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const dd = Math.abs(a[i] - b[i]);
      if (dd) { diff++; if (dd > maxd) maxd = dd; }
      if ((i & 3) === 3 && a[i] > 40) opaque++;
    }
    out.push({ layer: prop, kind, label, bytes: n, opaque, diff, maxd, sized: a.length === b.length });
  }
  return out;
});

/* the graphics chip reset as a black screen resets it: the game's own way back */
async function blackScreen(P, label) {
  await P.page.evaluate(() => { window.__btLastGlRebuild = 0; window.__qaOldR = window._pixiRenderer; });
  const lost = await P.page.evaluate(() => {
    const R = window._pixiRenderer;
    const gl = R && R.app && R.app.renderer && R.app.renderer.gl;
    const ext = gl && gl.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    return true;
  });
  const back = await H.waitFor(P, () => {
    const R = window._pixiRenderer;
    return { fresh: !!(R && R !== window.__qaOldR && R.playerDisplayRaw && R.playerDisplayRaw()) };
  }, (v) => v && v.fresh, { timeout: 60000, label: label + ': the renderer rebuilt' }).catch(() => null);
  return { lost, back: !!back };
}

async function inWheel(P) {
  for (let i = 0; i < 160; i++) {
    if ((await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel') return true;
    await P.page.waitForTimeout(500);
  }
  return false;
}

async function bakesSettled(P, maxMs) {
  let last = -1, same = 0, s = null;
  for (let t = 0; t < maxMs; t += 500) {
    s = await P.page.evaluate(() => {
      const st = window.__btMaskedStats ? window.__btMaskedStats() : null;
      const bw = window.__btBakeWorker ? window.__btBakeWorker() : null;
      const cov = window.__btMaskedCoverage ? window.__btMaskedCoverage() : null;
      return { n: st ? st.frames : 0, queued: bw ? bw.queued : 0, busy: bw ? bw.busy : 0, have: cov && cov.have, want: cov && cov.want };
    });
    same = (s.n === last && !s.queued && !s.busy) ? same + 1 : 0;
    last = s.n;
    if (same >= 4 && s.n > 0 && s.have === s.want) break;
    await P.page.waitForTimeout(500);
  }
  return s;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const QUERY = process.env.BT_PI_QUERY || '';
  const P = await H.newPlayer(browser, {
    name: 'Packedbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel',
    query: QUERY || undefined,
    init: `(${INIT.toString()})(${JSON.stringify(LOOK)})`,
  });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  let stop = null;
  try {
    await H.enterWorld(P);
    rec.ok(`in the world${QUERY ? ` (?${QUERY})` : ''} (guard)`, await inWheel(P));
    stop = H.keepAlive(P);
    await P.page.waitForTimeout(1500);
    const myId = await H.readState(P, (S) => S.myId);

    /* a copper torso and copper greaves, worn the real way (mp-armourflash's) */
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
    let pieces = null;
    for (let i = 0; i < 40 && !pieces; i++) {
      pieces = await P.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const t = (R.armorStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        const l = (R.legsStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        return t && l ? { t: t.gid, l: l.gid } : null;
      });
      if (!pieces) await P.page.waitForTimeout(300);
    }
    if (pieces) {
      await P.page.evaluate((p) => {
        const S = window._gameState.current;
        const R = S.rpg;
        const ti = (R.armorStash || []).findIndex((x) => x && x.gid === p.t);
        const li = (R.legsStash || []).findIndex((x) => x && x.gid === p.l);
        if (ti >= 0) { R.armor = R.armorStash[ti]; R.armorStash.splice(ti, 1); }
        if (li >= 0) { R.legsArmor = R.legsStash[li]; R.legsStash.splice(li, 1); }
        if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
        S.channel.send({ type: 'stats_update', payload: { armorRef: p.t, legsArmorRef: p.l } });
      }, pieces);
    }
    const worn = await H.waitFor(P, () => ({
      chest: window.__btGetGear ? window.__btGetGear('chest') : null, legs: window.__btGetGear ? window.__btGetGear('legs') : null,
    }), (v) => v && v.chest === 'copperplate' && v.legs === 'coppergreaves', { timeout: 15000, label: 'the armour worn' }).catch(() => null);
    const baked = await bakesSettled(P, 240000);
    rec.ok(`dressed: copper torso and greaves worn, every jog frame baked under them (${baked && baked.have} of ${baked && baked.want}) (guard)`,
      !!worn && !!baked && baked.want > 50 && baked.have === baked.want, { worn, baked });

    /* 1. the sheets are images, nothing still being kept */
    let sh = null;
    for (let i = 0; i < 60; i++) {
      sh = await sheetsNow(P);
      if (sh && sh.kept && sh.kept.pending === 0 && sh.canvas === 0) break;
      await P.page.waitForTimeout(500);
    }
    console.log('    the walking gear sheets:', JSON.stringify(sh));
    console.log('    every picture kept as an image, what its PNG costs:', JSON.stringify(await keptBytes(P).catch((e) => String(e))));
    rec.ok(`1. every walking gear sheet the page holds is an image of itself (${sh && sh.img} images, ${sh && sh.imgMb} MB of pictures; ${sh && sh.canvas} canvases), nothing still being kept (${sh && sh.kept && sh.kept.kept} kept in all)`,
      !!sh && sh.img >= 10 && sh.canvas === 0 && !!sh.kept && sh.kept.pending === 0 && !sh.kept.off, sh);

    /* 2. the same pixels from the image as from the canvas */
    await P.page.waitForTimeout(600);
    const same = await samePixels(P);
    for (const s of same || []) console.log(`      ${s.layer} (${s.kind}, ${s.label}): ${s.opaque} opaque px, ${s.diff} of ${s.bytes} bytes different (most ${s.maxd})`);
    const fromImg = (same || []).filter((s) => s.kind === 'img');
    rec.ok(`2. each worn picture sent again from its image reads back off the chip exactly as it was sent from its canvas (${fromImg.length} pictures, ${fromImg.reduce((n, s) => n + s.opaque, 0)} opaque px)`,
      fromImg.length >= 2 && fromImg.every((s) => s.sized && s.diff === 0 && s.opaque > 0), same);

    /* 3. every layer drawn every way, the body baked from the images */
    const s1 = await sweep(P, 'before');
    rec.ok('3. every layer drawn jogging every way, the body under the armour baked from the images (masked, never plain)', s1.bad.length === 0, s1.bad.slice(0, 6));

    /* 4. a black screen's rebuild: every picture from the images */
    const bs = await blackScreen(P, 'black screen');
    console.log('    black screen:', JSON.stringify(bs));
    await P.page.waitForTimeout(3000);
    await bakesSettled(P, 120000);
    const s2 = await sweep(P, 'after a black screen');
    rec.ok('4. after a black screen\'s rebuild every layer drawn every way again, from the images',
      bs.lost && bs.back && s2.bad.length === 0, { bs, bad: s2.bad.slice(0, 6) });
    const sh2 = await sheetsNow(P);
    console.log('    after the rebuild:', JSON.stringify(sh2));

    rec.ok('5. no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    if (stop) stop();
    await P.ctx.close().catch(() => {});
  }
}
