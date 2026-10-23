/* ═══ v2.3.3574: YOUR BRO IS WHOLE AFTER THE PHONE PARKS THE TAB ═══
 *
 * The owner, 2026-10-22: "I returned to the game after I went into a
 * different tab on my phone and my character was missing features at certain
 * angles.  In screenshot you can see my head and legs missing" -- a copper
 * torso and greaves, the hair, the slung shield and the staff drawn, and no
 * skin, face or boots: the body the game BAKES under the armour (the masked
 * body, one picture a frame of each pose and facing) was blank.
 *
 * iPhone Safari may throw away what a page drew on its canvases while the tab
 * is parked, and says nothing (no event for a 2D canvas: WebKit bug 195325).
 * What is already on the graphics chip stays; what the game has not drawn
 * yet -- the frames of a facing you had not turned to -- is uploaded later
 * from the emptied canvas, blank, and stays blank.  Pictures loaded from
 * files (hair, armour sheets, shield, staff) come back from their files.
 *
 * This makes that happen on a phone page: armour worn the real way, a walk
 * east (those frames drawn), then
 *   1. (guard) the copper torso and iron greaves are worn, and the bakes made;
 *   2. a return with the pictures intact remakes nothing (the check reads its
 *      witnesses back whole, in a few ms, and does nothing);
 *   3. (guard) parked again: hidden, EVERY canvas behind a texture emptied as
 *      Safari empties them (`wipe`: their copies on the graphics chip
 *      untouched), shown again;
 *   4. the game finds its pictures emptied and reloads straight back into the
 *      world (BroTown's recovery reload, behind the bro's veil);
 *   5. ...on the same spot of the Wheel;
 *   6. then in every facing (8) the body drawn under the armour is whole,
 *      read back off the graphics chip;
 *   7. no page errors.
 * QA_TW_EXPECT=blank runs the build before: no reload, and a facing blank.
 * QA_TW_SHOTS=1 saves each facing (tools/qa/mp/out/tabwipe-*.png) and counts
 * the canvases; QA_TW_CENSUS=1 (with QA_DIST=dist-prof) names their makers.
 *
 *   node tools/qa/mp/run.mjs tabwipe
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const FACINGS = {
  east: ['d'], northeast: ['w', 'd'], north: ['w'], northwest: ['w', 'a'],
  west: ['a'], southwest: ['s', 'a'], south: ['s'], southeast: ['s', 'd'],
};

/* every canvas behind a texture the page holds: the graphics chip's list and
   the asset cache (mp-gpuaudit's own walk, window.__btGpuTexSources), and the
   local figure's sprites */
const SOURCES = () => {
  const out = new Set();
  try { for (const s of (window.__btGpuTexSources ? window.__btGpuTexSources() : [])) if (s) out.add(s); } catch (e) { /* none */ }
  const R = window._pixiRenderer;
  const walk = (c) => {
    if (!c) return;
    if (c.texture && c.texture.source) out.add(c.texture.source);
    for (const k of (c.children || [])) walk(k);
  };
  try { walk(R && R.app && R.app.stage); } catch (e) { /* none */ }
  return [...out];
};

/* the canvases emptied, as Safari empties a parked tab's: their copies on the
   graphics chip untouched */
async function wipe(P) {
  return P.page.evaluate((SRC) => {
    const sources = (new Function('return (' + SRC + ')'))()();
    const r = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
    let canvases = 0, onChip = 0, offChip = 0, px = 0;
    const chipUids = [];
    const masked = window.__btMaskedSources ? window.__btMaskedSources() : [];
    const maskedUids = masked.map((x) => x.uid);
    const maskedOnChip = masked.filter((x) => x._gpuData && r && x._gpuData[r.uid]).length;
    const seen = new Set();
    for (const s of sources) {
      const cv = s && s.resource;
      if (!cv || seen.has(cv) || typeof cv.getContext !== 'function' || !(cv.width > 0) || !(cv.height > 0)) continue;
      if (typeof HTMLCanvasElement !== 'undefined' && cv instanceof HTMLCanvasElement && cv === (r && r.canvas)) continue;
      let g = null;
      try { g = cv.getContext('2d'); } catch (e) { g = null; }
      if (!g) continue;
      seen.add(cv);
      canvases++;
      px += cv.width * cv.height;
      if (s._gpuData && r && s._gpuData[r.uid]) { onChip++; chipUids.push(s.uid); } else offChip++;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.restore();
    }
    return { canvases, onChip, offChip, mpx: Math.round(px / 1e5) / 10, masked: masked.length, maskedOnChip, chipUids, maskedUids };
  }, SOURCES.toString());
}

const hide = (P) => P.page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pagehide'));
  window.dispatchEvent(new Event('blur'));
});
const show = (P) => P.page.evaluate(() => {
  delete document.visibilityState; delete document.hidden;
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pageshow'));
  window.dispatchEvent(new Event('focus'));
});

/* the body picture drawn under the armour right now, read back off the
   graphics chip: its opaque pixels */
const bodyNow = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer;
  const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
  const s = d && d._spriteBody;
  const t = s && s.texture;
  if (!t || !t.source || t.source.destroyed) return null;
  const r = R.app.renderer;
  let opaque = 0, n = 0;
  /* drawn as the game draws it (a sprite of that texture, on nothing): an
     emptied canvas uploaded later draws nothing */
  try {
    const probe = new s.constructor(t);   /* a Sprite, the body's own class */
    const px = r.extract.pixels({ target: probe, clearColor: [0, 0, 0, 0] });
    probe.destroy();
    const a = px.pixels || px;
    for (let i = 3; i < a.length; i += 4) { n++; if (a[i] > 40) opaque++; }
  } catch (e) { return { err: String(e && e.message || e).slice(0, 120) }; }
  return { opaque, n, uid: t.source.uid, w: t.frame.width, h: t.frame.height, pose: d._animPose, dir: d._animDir, mirror: d.scale && d.scale.x < 0 };
});

/* the Mayor's welcome and any other talk put away (mp-gatherquiet's) */
async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {});
      continue;
    }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}

async function face(P, keys, ms, shot) {
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  const b = await bodyNow(P);
  if (shot && process.env.QA_TW_SHOTS) {
    const at = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const cv = document.querySelector('canvas');
      const rc = cv.getBoundingClientRect();
      return { x: rc.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: rc.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
    });
    await P.page.screenshot({ path: `tools/qa/mp/out/tabwipe-${shot}.png`, clip: { x: Math.max(0, at.x - 70), y: Math.max(0, at.y - 90), width: 140, height: 140 } }).catch(() => {});
  }
  for (const k of keys) await P.page.keyboard.up(k);
  return b;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const expectBlank = process.env.QA_TW_EXPECT === 'blank';
  /* QA_TW_CENSUS=1: which code made each canvas (a stack at its making) */
  const CENSUS_INIT = () => {
    const made = new WeakMap();
    window.__btCanvasMaker = made;
    const ce = Document.prototype.createElement;
    Document.prototype.createElement = function (tag, o) {
      const el = ce.call(this, tag, o);
      if (String(tag).toLowerCase() === 'canvas') {
        const st = String(new Error().stack || '').split('\n').slice(2, 7).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '').replace(/\?[^:)]*/, '')).join(' < ');
        made.set(el, st);
      }
      return el;
    };
  };
  const P = await H.newPlayer(browser, { name: 'Tabbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: process.env.QA_TW_CENSUS ? CENSUS_INIT : null });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  let stopAlive = false;
  try {
    await H.enterWorld(P);
    let inWheel = false;
    for (let i = 0; i < 120 && !inWheel; i++) {
      inWheel = (await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
      if (!inWheel) await P.page.waitForTimeout(500);
    }
    (async () => { while (!stopAlive) { await P.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {}); } })();
    await P.page.waitForTimeout(1500);
    const myId = await H.readState(P, (S) => S.myId);

    /* ── 1. armour worn the real way (mp-joinflicker's) ── */
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
    let pieces = null;
    for (let i = 0; i < 40 && !pieces; i++) {
      pieces = await P.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const t = (R.armorStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        const l = (R.legsStash || []).find((x) => x && x.mat === 'iron' && x.gid);
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
    }), (v) => v && v.chest === 'copperplate' && v.legs === 'irongreaves', { timeout: 15000, label: 'the armour worn' }).catch(() => null);
    /* the bakes made (the worker idle and the cache steady) */
    let baked = null;
    for (let i = 0, last = -1, same = 0; i < 120; i++) {
      const s = await P.page.evaluate(() => {
        const st = window.__btMaskedStats ? window.__btMaskedStats() : null;
        const bw = window.__btBakeWorker ? window.__btBakeWorker() : null;
        return { n: st ? st.frames : 0, mb: st ? st.mb : 0, queued: bw ? bw.queued : 0 };
      });
      baked = s;
      same = (s.n === last && !s.queued) ? same + 1 : 0;
      last = s.n;
      if (same >= 4 && s.n > 0) break;
      await P.page.waitForTimeout(500);
    }
    rec.ok(`1. (guard) the copper torso and iron greaves are worn, and the bakes made (${baked && baked.n})`,
      !!worn && !!baked && baked.n > 20, { worn, baked });

    await closeTalk(P);
    /* off the square, clear of the Mayor */
    await face(P, FACINGS.south, 1500);
    await closeTalk(P);
    /* a walk east: those frames drawn, so on the graphics chip */
    const before = await face(P, FACINGS.east, 1500, 'before-east');
    console.log('    before the wipe, east:', JSON.stringify(before));

    if (process.env.QA_TW_SHOTS) {
      const census = await P.page.evaluate((SRC) => {
        const sources = (new Function('return (' + SRC + ')'))()();
        const r = window._pixiRenderer.app.renderer;
        const rows = [];
        const seen = new Set();
        for (const s of sources) {
          const cv = s && s.resource;
          if (!cv || seen.has(cv) || typeof cv.getContext !== 'function' || !(cv.width > 0)) continue;
          if (cv === r.canvas) continue;
          seen.add(cv);
          rows.push({ w: cv.width, h: cv.height, chip: !!(s._gpuData && s._gpuData[r.uid]), label: String(s.label || ''), agc: !!s.autoGarbageCollect,
            maker: window.__btCanvasMaker ? (window.__btCanvasMaker.get(cv) || '(not a DOM canvas made after load)') : '' });
        }
        const makers = Object.create(null);
        for (const x of rows) {
          if (x.chip) continue;
          const k = x.maker.split(' < ').slice(0, 3).join(' < ');
          makers[k] = makers[k] || { n: 0, mb: 0 };
          makers[k].n++; makers[k].mb += x.w * x.h * 4 / 1048576;
        }
        const mk = Object.entries(makers).sort((a, b) => b[1].mb - a[1].mb).slice(0, 30).map(([k, v]) => `${v.n} x ${Math.round(v.mb * 10) / 10} MB  ${k}`);
        const by = Object.create(null);
        for (const x of rows) { const k = (x.chip ? 'chip ' : 'page ') + (x.w * x.h >= 65792 ? 'big' : 'small'); by[k] = by[k] || { n: 0, mb: 0 }; by[k].n++; by[k].mb += x.w * x.h * 4 / 1048576; }
        for (const k in by) by[k].mb = Math.round(by[k].mb * 10) / 10;
        rows.sort((a, b) => b.w * b.h - a.w * a.h);
        return { by, mk, top: rows.slice(0, 25).map((x) => `${x.w}x${x.h}${x.chip ? ' chip' : ''}${x.label ? ' ' + x.label : ''}`) };
      }, SOURCES.toString());
      console.log('    canvases:', JSON.stringify(census.by));
      console.log('    biggest:', census.top.join(', '));
      if (process.env.QA_TW_CENSUS) console.log('    off the chip, by maker:\n      ' + census.mk.join('\n      '));
    }
    /* ── 2. a return with the pictures intact: nothing done ── */
    await P.page.evaluate(() => { window.__twPage = 1; });
    await hide(P);
    await P.page.waitForTimeout(1500);
    await show(P);
    await P.page.waitForTimeout(2000);
    const quiet = await P.page.evaluate(() => ({ same: window.__twPage === 1, last: window.__btCanvasWitness ? window.__btCanvasWitness().last : null }));
    if (!expectBlank) {
      rec.ok(`2. a return with the pictures intact remakes nothing (${quiet.last ? `${quiet.last.checked} of ${quiet.last.witnesses} read back, ${quiet.last.emptied} empty, ${quiet.last.ms} ms` : 'no check ran'})`,
        quiet.same && !!quiet.last && quiet.last.checked >= 20 && quiet.last.emptied === 0 && !quiet.last.acted, quiet);
    }

    /* ── 3. parked: hidden, the canvases emptied as Safari empties them, shown again ── */
    const spot = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y), zone: S.currentZone }));
    await hide(P);
    await P.page.waitForTimeout(1500);
    const w = await wipe(P);
    await P.page.waitForTimeout(1500);
    const navigated = P.page.waitForEvent('framenavigated', { timeout: 20000 }).then(() => true).catch(() => false);
    await show(P);
    console.log('    wipe:', JSON.stringify({ ...w, chipUids: undefined, maskedUids: undefined }));
    rec.ok(`3. (guard) the wipe empties the canvases (${w.canvases}; ${w.offChip} not on the graphics chip yet, ${w.maskedOnChip} of ${w.masked} masked frames)`, w.canvases > 20 && w.offChip > 0, { ...w, chipUids: undefined, maskedUids: undefined });
    const chipSet = new Set(w.chipUids), maskedSet = new Set(w.maskedUids);

    if (!expectBlank) {
      /* ── 4. the game notices and comes straight back in, on the same spot ── */
      const reloaded = await navigated;
      let back = null;
      if (reloaded) {
        back = await H.waitFor(P, (S) => {
          const R = window._pixiRenderer;
          const hold = window.__btAvatarHold;
          if (!S || S._zoneLoading || S.currentZone !== 'wheel' || !S.player || !(R && R.playerDisplayRaw && R.playerDisplayRaw())) return null;
          if (document.querySelector('.bt-zone-loading')) return null;
          return { x: Math.round(S.player.x), y: Math.round(S.player.y), resumeSpot: S._resumeSpot || null, held: hold ? { ms: hold.liftedAt ? hold.liftedAt - hold.t : null, why: hold.why } : null };
        }, (v) => !!v, { timeout: 240000, label: 'back in the world after the reload' }).catch(() => null);
      }
      const log = await P.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt-crashlog') || '[]'); } catch (e) { return []; } });
      const purge = log.filter((e) => e.kind === 'canvas-purge').map((e) => e.msg);
      const reload = log.filter((e) => e.kind === 'auto-reload').map((e) => e.msg);
      console.log('    crash log:', JSON.stringify({ purge, reload }));
      rec.ok(`4. coming back, the game finds its pictures emptied (${purge[purge.length - 1] || 'nothing logged'}) and reloads straight back into the world`,
        reloaded && !!back && purge.length >= 1 && reload.some((m) => /pictures emptied/.test(m)), { reloaded, back, purge, reload });
      const d = back ? Math.round(Math.hypot(back.x - spot.x, back.y - spot.y)) : null;
      rec.ok(`5. ...on the same spot of the Wheel (${d == null ? '?' : d} px from where it was parked)`,
        spot.zone === 'wheel' && d != null && d <= 48 && !!(back && back.resumeSpot), { spot, back });
      await closeTalk(P);
      /* the bro's pictures made again (the worker's bakes, as at a join) */
      for (let i = 0, last = -1, same = 0; i < 160; i++) {
        const n = await P.page.evaluate(() => { const st = window.__btMaskedStats ? window.__btMaskedStats() : null; return st ? st.frames : 0; });
        same = (n === last) ? same + 1 : 0;
        last = n;
        if (same >= 4 && n > 0) break;
        await P.page.waitForTimeout(500);
      }
    } else {
      await P.page.waitForTimeout(2500);
    }

    /* ── 6. every facing ── */
    const seen = [];
    for (const [dir, keys] of Object.entries(FACINGS)) {
      const b = await face(P, keys, 1200, 'after-' + dir);
      seen.push({ dir, ...(b || {}) });
    }
    /* (which picture each facing drew -- a masked frame, on the chip before
       the wipe -- means something only on the page that was wiped) */
    console.log('    after:', seen.map((s) => `${s.dir} ${s.opaque}/${s.n}${expectBlank ? ` uid ${s.uid}${maskedSet.has(s.uid) ? ' masked' : ''}${chipSet.has(s.uid) ? ' was-on-chip' : ''}` : ''}${s.err ? ' ' + s.err : ''}`).join(', '));
    const blank = seen.filter((s) => !(s.opaque > 200));
    if (expectBlank) {
      rec.ok(`6'. (the build before) the body comes back blank at a facing (${blank.map((s) => s.dir).join(', ') || 'none'})`, blank.length > 0, seen);
    } else {
      rec.ok(`6. the body under the armour is whole in every facing (${seen.map((s) => s.dir + ' ' + s.opaque).join(', ')})`,
        seen.length === 8 && blank.length === 0, seen);
    }
    rec.ok('7. no page errors', errs.length === 0, errs.slice(0, 3));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
