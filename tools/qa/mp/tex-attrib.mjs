/* Resident GPU texture attribution: town at rest vs ember at rest.
 * Standalone (worker + dist + chromium), modelled on mp-coldload.mjs bring-up
 * and mp-deathtex.mjs's walk (town -> worldview -> ember via the real doors).
 * Writes tex-attrib.json = { town: {...}, ember: {...} } beside this file. */
import * as H from './harness.mjs';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'tex-attrib.json');
const TILE = 32;
const REST_MS = 4000;

const log = (...a) => console.log('[tex-attrib]', ...a);

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

/* Full probe plus the context needed to trust it: which zone we are in, whether
   the per-zone overlay is still up, and whether a zone load is still pending. */
const snapshot = (P, label) => P.page.evaluate((lbl) => {
  const S = window._gameState && window._gameState.current;
  const t = window.__btTex ? window.__btTex(true) : null;
  return {
    label: lbl,
    zone: S ? S.currentZone : null,
    zoneLoading: !!(S && S._zoneLoading),
    overlayPresent: !!document.querySelector('.bt-zone-loading'),
    inDungeon: !!(S && S._inDungeon),
    mb: t ? t.mb : null,
    sources: t ? t.sources : null,
    keys: t ? t.keys : null,
    list: t ? t.list : [],
    /* GPU-side companion: every TextureSource the GL texture system has
       actually uploaded (uploads are lazy, on first draw), with dims and the
       resource kind -- the only way to put dims on a canvas-keyed cache row. */
    gpu: (() => {
      try {
        const app = window._pixiRenderer && window._pixiRenderer.app;
        const ts = app && app.renderer && app.renderer.texture;
        const arr = (ts && ts.managedTextures) || [];
        const rows = [];
        let bytes = 0, mipBytes = 0;
        for (const src of arr) {
          if (!src || src.destroyed) continue;
          const w = src.pixelWidth || src.width || 0, h = src.pixelHeight || src.height || 0;
          const b = w * h * 4;
          bytes += b;
          if (src.autoGenerateMipmaps) mipBytes += b / 3;
          const r = src.resource;
          const kind = r ? (r.constructor && r.constructor.name) || typeof r : 'none';
          const url = r && (r.src || r.currentSrc) ? String(r.src || r.currentSrc) : null;
          rows.push({ uid: src.uid, w, h, mb: +(b / 1048576).toFixed(2), kind, label: src.label || null,
            url: url ? url.replace(/^https?:\/\/[^/]+/, '') : null, mips: !!src.autoGenerateMipmaps });
        }
        rows.sort((a, b) => b.mb - a.mb);
        return { n: rows.length, mb: +(bytes / 1048576).toFixed(1), mipMb: +(mipBytes / 1048576).toFixed(1), rows };
      } catch (e) { return { err: String(e) }; }
    })(),
  };
}, label);

/* Wait for the overlay to lift (bounded), then rest REST_MS, then snapshot. */
async function restAndSnapshot(P, label) {
  await P.page.waitForFunction(() => {
    const S = window._gameState && window._gameState.current;
    return !document.querySelector('.bt-zone-loading') && !(S && S._zoneLoading);
  }, null, { timeout: 60000, polling: 250 }).catch(() => {});
  await P.page.waitForTimeout(REST_MS);
  return snapshot(P, label);
}

async function goto(P, list, zoneId) {
  const mark = await P.page.evaluate(({ which, z }) => {
    const f = window._gameFns || {};
    const arr = (which === 'town' ? f.TOWN_EXITS : f.WORLDVIEW_EXITS) || [];
    const e = arr.find((x) => x.zoneId === z);
    return e ? { tx: e.tx, ty: e.ty } : null;
  }, { which: list, z: zoneId });
  if (!mark) return null;
  await stand(P, mark.tx * TILE + 16, mark.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId, { timeout: 40000 }).catch(() => {});
  await P.page.waitForTimeout(4000);   /* past the per-zone overlay */
  return H.readState(P, (S) => S.currentZone);
}

const WS = await H.freePort(), WEB = await H.freePort();
const srv = await H.serveDist(WEB);
const worker = await H.startWorker(WS);
const browser = await H.launch();
const caveats = [];

let P = null;
try {
  /* Platform-API shim so __btTex(true)'s String(k) names object-keyed cache
     entries (Texture.from(canvas|img)) instead of '[object HTMLCanvasElement]':
     canvases remember what was drawn into them (drawImage tap), images print
     their src.  Game code is untouched; it only changes what a key prints as. */
  const init = () => {
    const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
    const srcOf = (o) => {
      if (!o) return null;
      if (o instanceof HTMLImageElement) return strip(o.src || o.currentSrc);
      if (o instanceof HTMLCanvasElement) return o.__btFrom || null;
      if (typeof ImageBitmap !== 'undefined' && o instanceof ImageBitmap) return o.__btFrom || 'bitmap';
      return null;
    };
    const di = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (img) {
      try {
        const cv = this.canvas; const from = srcOf(img);
        if (cv && from && !cv.__btFrom) cv.__btFrom = from;
      } catch (e) {}
      return di.apply(this, arguments);
    };
    const cib = window.createImageBitmap;
    if (cib) window.createImageBitmap = function (img) {
      const from = srcOf(img);
      return cib.apply(this, arguments).then((b) => { try { if (from) b.__btFrom = from; } catch (e) {} return b; });
    };
    HTMLCanvasElement.prototype.toString = function () {
      return '[canvas ' + this.width + 'x' + this.height + ' from ' + (this.__btFrom || '?') + ']';
    };
    HTMLImageElement.prototype.toString = function () {
      return '[img ' + (this.naturalWidth || this.width) + 'x' + (this.naturalHeight || this.height) + ' ' + strip(this.src || this.currentSrc) + ']';
    };
  };
  P = await H.newPlayer(browser, {
    name: 'Meter', wsPort: WS, webPort: WEB,
    viewport: { width: 390, height: 844 }, touch: true, init,
  });
  const info = await H.enterWorld(P, 180000);
  log('entered world', JSON.stringify(info));

  const town = await restAndSnapshot(P, 'town');
  log('town gpu-uploaded:', JSON.stringify({ n: town.gpu.n, mb: town.gpu.mb, mipMb: town.gpu.mipMb, err: town.gpu.err }));
  log('town at rest:', town.mb + 'MB', town.sources, 'sources', town.keys, 'keys',
    'overlay=' + town.overlayPresent, 'zoneLoading=' + town.zoneLoading);
  if (!town || typeof town.mb !== 'number') throw new Error('__btTex did not answer in town');
  if (town.zone !== 'town') caveats.push('town snapshot taken in zone ' + town.zone);

  /* The tutorial quests open the gate out of town (as mp-deathtex does). */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1500);

  let route = 'walk';
  let hub = await goto(P, 'town', 'worldview');
  log('after town door ->', hub);
  let inZone = null;
  if (hub === 'worldview') {
    inZone = await goto(P, 'worldview', 'ember');
    log('after worldview door ->', inZone);
  }
  if (inZone !== 'ember') {
    /* Fallback: the test panel's warp driver (S._devWarp), the same thing
       mp-devwarp.mjs exercises; it still walks the real doors behind the
       per-zone overlay. */
    route = 'devWarp';
    caveats.push('walk via TOWN_EXITS/WORLDVIEW_EXITS did not reach ember (hub=' + hub
      + ', zone=' + inZone + '); fell back to S._devWarp');
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S._devWarp = { to: 'ember', legs: 0, t: Date.now(), nextAt: 0 };
    });
    for (let i = 0; i < 70; i++) {
      await P.page.waitForTimeout(1000);
      inZone = await H.readState(P, (S) => S.currentZone);
      if (inZone === 'ember') break;
      const pending = await H.readState(P, (S) => (S._devWarp ? S._devWarp.to : null));
      if (!pending && i > 3) break;
    }
    log('after devWarp ->', inZone);
  }
  if (inZone !== 'ember') {
    caveats.push('never reached ember; the "ember" snapshot is from zone ' + inZone);
  }

  const ember = await restAndSnapshot(P, 'ember');
  log('ember gpu-uploaded:', JSON.stringify({ n: ember.gpu.n, mb: ember.gpu.mb, mipMb: ember.gpu.mipMb, err: ember.gpu.err }));
  log('ember at rest:', ember.mb + 'MB', ember.sources, 'sources', ember.keys, 'keys',
    'zone=' + ember.zone, 'overlay=' + ember.overlayPresent, 'zoneLoading=' + ember.zoneLoading);
  if (ember.overlayPresent || ember.zoneLoading) caveats.push('ember snapshot taken while the per-zone overlay / zone load was still up');
  if (ember.zone !== 'ember') caveats.push('ember snapshot zone was ' + ember.zone);

  const out = { meta: { route, caveats, viewport: '390x844 touch dpr2', restMs: REST_MS,
    pageErrors: P.logs.slice(0, 20) }, town, ember };
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  log('wrote', OUT);
} catch (e) {
  console.error('[tex-attrib] FAILED', e && e.stack || e);
  if (P) console.error(P.logs.slice(0, 30).join('\n'));
  process.exitCode = 1;
} finally {
  if (P) await P.ctx.close().catch(() => {});
  await browser.close().catch(() => {});
  await H.stopWorker(worker);
  srv.close();
  process.exit(process.exitCode || 0);
}
