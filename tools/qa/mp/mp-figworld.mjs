/* THROWAWAY probe: how tall is the bro in WORLD px?  (delete after use) */
import * as H from './harness.mjs';
const TILE = 32;

const measure = (P, tag) => P.page.evaluate((t) => {
  const S = window._gameState.current;
  const R = window._pixiRenderer || {};
  const cv = document.querySelector('canvas');
  const dpr = window.devicePixelRatio || 1;
  const drawn = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
  const probe = R.bodyFigureProbe ? R.bodyFigureProbe() : null;
  const pd = R.playerDisplayRaw ? R.playerDisplayRaw() : null;
  const s = S._worldScaleX || 1;
  let contBounds = null, bodyBounds = null, uiBounds = null, kids = [];
  if (pd) {
    const b = pd.getBounds();
    contBounds = { h: +b.height.toFixed(2), w: +b.width.toFixed(2), y: +b.y.toFixed(2) };
    const ui = pd._uiLayer;
    if (ui) { const u = ui.getBounds(); uiBounds = { h: +u.height.toFixed(2), y: +u.y.toFixed(2) }; }
    const sb = pd._spriteBody;
    if (sb) { const bb = sb.getBounds(); bodyBounds = { h: +bb.height.toFixed(2), y: +bb.y.toFixed(2) }; }
    /* PAINTED silhouette union: read each visible sprite's own texture pixels
       and convert crown/feet through the live transform (bodyFigureProbe's
       method, applied to every layer). */
    const paintedOf = (sp) => {
      try {
        const tex = sp.texture; const src = tex && tex.source && tex.source.resource;
        if (!src) return null;
        const fr = tex.frame || { x: 0, y: 0, width: tex.width, height: tex.height };
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(fr.width)); cv.height = Math.max(1, Math.round(fr.height));
        const c2 = cv.getContext('2d', { willReadFrequently: true });
        c2.drawImage(src, fr.x, fr.y, fr.width, fr.height, 0, 0, cv.width, cv.height);
        const px = c2.getImageData(0, 0, cv.width, cv.height).data;
        let top = -1, bot = -1;
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
          if (px[(y * cv.width + x) * 4 + 3] < 24) continue;
          if (top < 0) top = y; bot = y; break;
        }
        if (top < 0) return null;
        /* the sprite is anchored, so local y of texture row r is (r - anchorY*h) */
        const ay = (sp.anchor && sp.anchor.y) || 0;
        const g0 = sp.toGlobal({ x: 0, y: top - ay * cv.height });
        const g1 = sp.toGlobal({ x: 0, y: bot + 1 - ay * cv.height });
        return { topCss: g0.y, botCss: g1.y };
      } catch (e) { return null; }
    };
    let uTop = Infinity, uBot = -Infinity; const layers = [];
    for (const c of (pd.children || [])) {
      if (!c.visible || c === pd._uiLayer || !c.texture) continue;
      const pp = paintedOf(c);
      if (!pp) continue;
      layers.push({ n: c.label || c.constructor.name, top: +pp.topCss.toFixed(1), bot: +pp.botCss.toFixed(1), h: +(pp.botCss - pp.topCss).toFixed(1) });
      if (pp.topCss < uTop) uTop = pp.topCss;
      if (pp.botCss > uBot) uBot = pp.botCss;
    }
    kids.push({ n: '__SILHOUETTE__', h: +(uBot - uTop).toFixed(2), top: +uTop.toFixed(1), bot: +uBot.toFixed(1), worldH: +((uBot - uTop) / s).toFixed(2), layers });
    for (const c of (pd.children || [])) {
      if (!c.visible) continue;
      let bb = null; try { bb = c.getBounds(); } catch (e) {}
      if (bb && bb.height > 0) kids.push({ n: c.label || c.name || c.constructor.name, h: +bb.height.toFixed(1), top: +bb.y.toFixed(1), bot: +(bb.y + bb.height).toFixed(1) });
    }
  }
  return {
    tag: t, zone: S.currentZone, dpr,
    css: { w: cv.width / dpr, h: cv.height / dpr },
    worldScale: +s.toFixed(5),
    viewW: Math.round(S._viewW || 0), viewH: Math.round(S._viewH || 0),
    dispScaleY: drawn && drawn.scale != null ? +drawn.scale.toFixed(5) : null,
    cellContainerH: drawn ? +drawn.height.toFixed(2) : null,     /* 256-frame cell, container units */
    cellWorldH: drawn ? +(drawn.height * (drawn.scale || 1)).toFixed(2) : null,
    cellCssH: drawn ? +(drawn.height * (drawn.scale || 1) * s).toFixed(2) : null,
    probe: probe && !probe.err ? {
      facing: probe.facing, pose: probe.pose,
      painted: probe.painted, spriteScaleY: probe.spriteScaleY,
      figureCssPx: probe.figurePx, widthCssPx: probe.widthPx,
      figureWorldPx: +(probe.figurePx / s).toFixed(2),
      hatCssPx: probe.hatPx, hatWorldPx: +(probe.hatPx / s).toFixed(2),
    } : probe,
    contBoundsCss: contBounds, uiBoundsCss: uiBounds, bodyBoundsCss: bodyBounds,
    contWorldH: contBounds ? +(contBounds.h / s).toFixed(2) : null,
    kidsCss: kids,
  };
}, tag);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'FigWorld', wsPort, webPort, touch: true,
    viewport: { width: 430, height: 873 }, dpr: 3,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* dress the bro so the silhouette has a hat + hair on top of the body */
  const dressed = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    const hat = (f.HEADWEAR_CATALOG || []).find((h) => h && h.id && h.id !== 'none');
    const hair = (f.HAIR_CATALOG || []).find((h) => h && h.id && h.id !== 'none');
    try { if (hat && f.setHeadwear) f.setHeadwear(hat.id); } catch (e) {}
    try { if (hair && f.setHair) f.setHair(hair.id); } catch (e) {}
    return { hat: hat && hat.id, hair: hair && hair.id };
  });
  await P.page.waitForTimeout(1800);
  console.log('    dressed ' + JSON.stringify(dressed));
  const town = await measure(P, 'town');
  console.log('    TOWN ' + JSON.stringify(town));

  /* out to worldview, then into ember */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3']) S.channel.send({ type: 'quest_accept', payload: { questId: q } });
  });
  await P.page.waitForTimeout(2000);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'ember') || null,
      meadow: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'meadow') || null,
    };
  });
  console.log('    marks ' + JSON.stringify(marks));
  if (marks.townOut) {
    await P.page.evaluate((m) => { const S = window._gameState.current; S.player.x = m.tx * 32 + 16; S.player.y = m.ty * 32 + 16; }, marks.townOut);
    await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview', { timeout: 30000, label: 'worldview' }).catch(() => {});
    await P.page.waitForTimeout(1200);
    console.log('    WORLDVIEW ' + JSON.stringify(await measure(P, 'worldview')));
  }
  for (const [nm, mk] of [['ember', marks.spoke], ['meadow', marks.meadow]]) {
    if (!mk) continue;
    await P.page.evaluate((m) => { const S = window._gameState.current; S.player.x = m.tx * 32 + 16; S.player.y = m.ty * 32 + 16; }, mk);
    await H.waitFor(P, (S) => S.currentZone, (z) => z === nm, { timeout: 40000, label: nm }).catch(() => {});
    await P.page.waitForTimeout(2500);
    const zz = await measure(P, nm);
    console.log('    ' + nm.toUpperCase() + ' ' + JSON.stringify(zz));
    if (zz.zone === nm) rec.ok(nm + ' measured', true, { scale: zz.worldScale, figW: zz.probe && zz.probe.figureWorldPx });
    /* back to the hub for the next hop */
    if (zz.zone === nm) {
      await P.page.evaluate(() => { const S = window._gameState.current; const Z = (window.__btZones || {})[S.currentZone]; S.player.x = Z.w * 32 / 2; S.player.y = Z.h * 32 - 8; });
      await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview', { timeout: 40000, label: 'back' }).catch(() => {});
      await P.page.waitForTimeout(1200);
    }
  }
  if (false) {
    await P.page.evaluate((m) => { const S = window._gameState.current; S.player.x = m.tx * 32 + 16; S.player.y = m.ty * 32 + 16; }, marks.spoke);
    await H.waitFor(P, (S) => S.currentZone, (z) => z === 'ember', { timeout: 40000, label: 'ember' }).catch(() => {});
    await P.page.waitForTimeout(2500);
    const em = await measure(P, 'ember');
    console.log('    EMBER ' + JSON.stringify(em));
    rec.ok('ember measured', em.zone === 'ember', em);
  }
  rec.ok('town measured', !!town.probe, { h: town.probe && town.probe.figureWorldPx });
  await P.ctx.close().catch(() => {});
}
