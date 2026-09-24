/* ═══ v2.3.2858: YOUR TATTOOS STAY ON WHILE YOU LIGHT A FIRE ═══
 *
 * Owner: "Yea do woodcutting and missing ones" -- the last of them.  Lighting a
 * fire swaps the body for the painted fire-lighter (firemaking-strip.webp, 8
 * frames of 384x512) baked with your skin and nothing else, and that bake is
 * what EVERY OTHER player's fire-lighter is drawn from on your screen -- the
 * cook's arrangement, so the drawings ride a layer of their own over it
 * (_fetchAndBakeFire, recolorStandInSkinSplit).  This checks, from the frames
 * the renderers actually draw:
 *
 *   - YOUR SCREEN: the face, arm and chest drawings are on every frame, the
 *     face on the half it was drawn on, and the layer lines up with the figure
 *     (every drawn pixel of it sits on the figure's skin, on the same frame);
 *   - THE FLAME: nothing is drawn on it.  Its orange rim passes the skin test,
 *     so this is not free;
 *   - THE FIST: on the two frames the hands are cupped at the flame, no skin
 *     pixel of the fist is left in the artist's paint.  Its knuckles were
 *     islands under the flame's size floor (FIRE_KEEP_BOXES);
 *   - A WATCHER'S SCREEN: the peer's fire-lighter carries their drawings once
 *     their layer lands, and keeps them;
 *   - NO LEAK: a player with NO drawings lights a fire bare on the inked
 *     player's screen -- the shared figure is the inked player's own bake;
 *   - A DRAWING CHANGE rebuilds the layer and leaves the figure alone;
 *   - what the layer costs, and that the watcher lets it go after they stop.
 *
 * The light plays its eight frames once in about half a second and holds the
 * last, so your own figure is swept through them by restarting the light every
 * animation frame, and a watcher sees more than the first frame and the last
 * because the peer relights it now and then.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { FIRE_INK_REGIONS, FIRE_KEEP_BOXES } from '../../../src/rendering/standInInk.js';

const SHOTS = H.REPO + '/tools/qa/mp/out';
const FIRE_URL = '/sprites/skills/firemaking-strip.webp?v=2.3.1715';   /* the URL the game loads */
const ALL_PINK = 'b'.repeat(256);
const LEFT_BLUE = Array.from({ length: 256 }, (_, i) => ((i % 16) < 8 ? '8' : '0')).join('');
const RIGHT_BLUE = Array.from({ length: 256 }, (_, i) => ((i % 16) >= 8 ? '8' : '0')).join('');

const COACH_OFF = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}`;
const SEED = COACH_OFF + `
try {
  localStorage.setItem('bt-facetattoo', ${JSON.stringify(LEFT_BLUE)});
  localStorage.setItem('bt-armtattoo', ${JSON.stringify(ALL_PINK)});
  localStorage.setItem('bt-tattooart', ${JSON.stringify(ALL_PINK)});
} catch (e) {}`;

/* Your own light, swept through its frames: restarted every animation frame,
   started the last frame's length early (the game ends it the tick after its
   window, and a loaded box draws a frame every few hundred ms), with the end
   pushed out of reach so no campfire is lit.  `null` puts the light out. */
const SWEEP = `const now = performance.now();
  const dt = window.__qaFireLast ? Math.min(1000, now - window.__qaFireLast) : 16;
  window.__qaFireLast = now;
  const u = (now / 2) % 530;
  S._campfire = null;
  S._firemaking = { x: S.player.x, y: S.player.y + 6, startedAt: Date.now() - u + dt, doneAt: Date.now() + 600000 };`;

/* Read a fire-lighter as the renderer holds it -- the figure and the drawings'
   layer over it -- next to the same frame of the shipped strip, on every
   animation frame for `ms`.  `pid` null = your own.  Each distinct pair of
   textures is measured once. */
const sampleFire = (P, pid, ms, poke) => P.page.evaluate(async ({ pid, dur, poke, faces, boxes, url }) => {
  const R = window._pixiRenderer;
  const pokeFn = poke ? new Function('S', poke) : null;
  window.__qaFireSheet = window.__qaFireSheet || await new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im); im.onerror = () => res(null);
    im.src = url;
  });
  const sheet = window.__qaFireSheet;
  const FW = 384, FH = 512;
  const isBlue = (d, o) => d[o + 3] > 60 && d[o + 2] > d[o] + 40 && d[o + 2] > d[o + 1] + 20;
  const isPink = (d, o) => d[o + 3] > 60 && d[o + 2] > d[o + 1] + 24 && d[o] > 110 && d[o] >= d[o + 2];
  const isSkin = (d, o) => { const r = d[o], g = d[o + 1], b = d[o + 2];
    return d[o + 3] > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25; };
  /* FIRE_SKIN_OPTS' window on top: the pixels the bake calls skin at all */
  const inWindow = (d, o) => { const r = d[o], g = d[o + 1], b = d[o + 2];
    return isSkin(d, o) && b / r <= 0.5 && g / r >= 0.45 && g / r <= 0.8; };
  const blit = (res, sx, sy, sw, sh, dx, dy) => {
    const c = document.createElement('canvas'); c.width = FW; c.height = FH;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(res, sx, sy, sw, sh, dx, dy, sw, sh);
    return g.getImageData(0, 0, FW, FH).data;
  };
  const whole = (tex) => {
    const f = tex.frame, orig = tex.orig || f, trim = tex.trim || null;
    if (Math.round(orig.width) !== FW || Math.round(orig.height) !== FH) throw new Error(`frame ${orig.width}x${orig.height}`);
    return blit(tex.source.resource, f.x, f.y, f.width, f.height, trim ? trim.x : 0, trim ? trim.y : 0);
  };
  const readable = (sp) => !!(sp && sp.visible && sp.texture && sp.texture.source && sp.texture.source.resource);
  /* The figure's own skin on frame k, as the bake decides it from the shipped
     art: skin in FIRE_SKIN_OPTS' window, in islands of 1800 px or more, or
     lying wholly inside the frame's keep box (FIRE_KEEP_BOXES).  Everything else
     that passes the skin test -- the flame's rim, sparks, the trousers the fire
     lights orange -- is not him.  `kept` marks the fist's islands. */
  const masks = {};
  const bodyOf = (k, raw) => {
    if (masks[k]) return masks[k];
    const n = FW * FH;
    const sk = new Uint8Array(n);
    for (let p = 0; p < n; p++) if (inWindow(raw, p * 4)) sk[p] = 1;
    const lab = new Int32Array(n), stack = new Int32Array(n);
    const size = [0], bl = [0], br = [0], bt = [0], bb = [0];
    for (let st = 0; st < n; st++) {
      if (!sk[st] || lab[st]) continue;
      const id = size.length;
      let sp = 0, c = 0, l = FW, r = -1, t = FH, b = -1;
      stack[sp++] = st; lab[st] = id;
      while (sp) {
        const q = stack[--sp]; c++;
        const x = q % FW, y = (q - x) / FW;
        if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y;
        if (x > 0 && sk[q - 1] && !lab[q - 1]) { lab[q - 1] = id; stack[sp++] = q - 1; }
        if (x < FW - 1 && sk[q + 1] && !lab[q + 1]) { lab[q + 1] = id; stack[sp++] = q + 1; }
        if (q >= FW && sk[q - FW] && !lab[q - FW]) { lab[q - FW] = id; stack[sp++] = q - FW; }
        if (q + FW < n && sk[q + FW] && !lab[q + FW]) { lab[q + FW] = id; stack[sp++] = q + FW; }
      }
      size.push(c); bl.push(l); br.push(r); bt.push(t); bb.push(b);
    }
    const box = boxes[k];
    const body = new Uint8Array(n), kept = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      const id = lab[p];
      if (!id) continue;
      if (size[id] >= 1800) body[p] = 1;
      else if (box && bl[id] >= box[0] && br[id] <= box[1] && bt[id] >= box[2] && bb[id] <= box[3]) { body[p] = 1; kept[p] = 1; }
    }
    return (masks[k] = { body, kept });
  };
  const measure = (pair) => {
    const body = pair && pair.body;
    if (!body || !body.visible) return { err: 'not drawn' };
    if (!readable(body)) return { err: 'no texture' };
    if (!sheet) return { err: 'the shipped strip did not load' };
    const k = body._fireK;
    if (typeof k !== 'number' || k < 0 || k > 7) return { err: 'no frame index' };
    const inkSp = pair.ink;
    const inkOn = readable(inkSp);
    let got, lay = null;
    try {
      got = whole(body.texture);
      if (inkOn) lay = whole(inkSp.texture);
    } catch (e) { return { err: 'unreadable: ' + e.message }; }
    const aligned = inkOn ? (inkSp.x === body.x && inkSp.y === body.y
      && inkSp.scale.x === body.scale.x && inkSp.scale.y === body.scale.y) : null;
    const raw = blit(sheet, k * FW, 0, FW, FH, 0, 0);
    const comp = new Uint8ClampedArray(got);
    if (lay) {
      for (let o = 0; o < lay.length; o += 4) {
        const a = lay[o + 3] / 255;
        if (!a) continue;
        for (let c = 0; c < 3; c++) comp[o + c] = Math.round(lay[o + c] * a + comp[o + c] * (1 - a));
        comp[o + 3] = Math.max(comp[o + 3], lay[o + 3]);
      }
    }
    const face = faces[k];
    const fcx = (face[0] + face[1]) / 2, fhw = (face[1] - face[0]) / 2;
    const { body: him, kept } = bodyOf(k, raw);
    let blue = 0, pink = 0, faceBlue = 0, sx = 0, layerPx = 0, stray = 0, flameInk = 0, fistPx = 0, fistSame = 0;
    for (let o = 0, p = 0; o < got.length; o += 4, p++) {
      const x = p % FW, y = (p / FW) | 0;
      if (lay && lay[o + 3]) {
        layerPx++;
        if (got[o + 3] === 0 || !inWindow(raw, o)) stray++;
        /* skin-coloured, but not him: the flame's rim, a spark, lit cloth */
        else if (!him[p]) flameInk++;
      }
      if (isBlue(comp, o) && !isBlue(raw, o)) {
        blue++;
        if (x >= face[0] && x <= face[1] && y >= face[2] && y <= face[3]) { faceBlue++; sx += x; }
      }
      if (isPink(comp, o) && !isPink(raw, o)) pink++;
      /* the fist's islands: every one of their pixels should have been
         recoloured, so one still exactly the art's is one the bake skipped */
      if (kept[p]) {
        fistPx++;
        if (got[o] === raw[o] && got[o + 1] === raw[o + 1] && got[o + 2] === raw[o + 2]) fistSame++;
      }
    }
    const side = faceBlue ? +(((sx / faceBlue) - fcx) / fhw).toFixed(2) : null;
    return { k, inkOn, aligned, blue, pink, side, layerPx, stray, flameInk, fistPx, fistSame,
      src: body.texture.source.uid };
  };
  const out = [];
  const seen = new Set();
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      try { if (pokeFn && S && S.player) pokeFn(S); } catch (e) { /* the light holds or it does not */ }
      const pair = R && R.fireSpriteRaw ? R.fireSpriteRaw(pid) : null;
      const body = pair && pair.body;
      const key = (body && body.visible && body.texture)
        ? body.texture.uid + ':' + (readable(pair.ink) ? pair.ink.texture.uid : 'x') : 'none';
      if (!seen.has(key)) {
        seen.add(key);
        const m = measure(pair);
        m.t = Math.round(performance.now() - t0);
        if (pid && R.remoteSkillProbe) { const pr = R.remoteSkillProbe(pid); m.fireInk = pr ? pr.fireInk : null; }
        out.push(m);
      }
      if (performance.now() - t0 < dur) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  return out;
}, { pid: pid || null, dur: ms, poke: poke || null, faces: FIRE_INK_REGIONS.face, boxes: FIRE_KEEP_BOXES, url: FIRE_URL });

const preloadSheet = (P) => P.page.evaluate(async (url) => {
  if (window.__qaFireSheet) return;
  window.__qaFireSheet = await new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im); im.onerror = () => res(null);
    im.src = url;
  });
  try { await window.__qaFireSheet.decode(); } catch (e) { /* drawn anyway */ }
}, FIRE_URL);

/* A peer's light, as their watcher sees it: held for a while, put out, lit
   again -- each relight starts the watcher's copy from frame 0.  Runs in the
   lighter's page until `until` (ms from now). */
const relightLoop = (P, until) => P.page.evaluate((ms) => {
  const end = Date.now() + ms;
  const gen = (window.__qaRelightGen = (window.__qaRelightGen || 0) + 1);
  const S0 = () => window._gameState && window._gameState.current;
  const step = (on) => {
    if (window.__qaRelightGen !== gen) return;   /* put out (putOut), or a newer loop */
    const S = S0();
    if (!S || !S.player) return;
    if (Date.now() > end) { S._firemaking = null; return; }
    S._campfire = null;
    S._firemaking = on ? { x: S.player.x, y: S.player.y + 6, startedAt: Date.now(), doneAt: Date.now() + 600000 } : null;
    setTimeout(() => step(!on), on ? 1600 : 700);
  };
  step(true);
}, until);
/* One light, held until it is put out: a watcher's copy plays its eight frames
   and holds the last. */
const holdLight = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return;
  S._campfire = null;
  S._firemaking = { x: S.player.x, y: S.player.y + 6, startedAt: Date.now(), doneAt: Date.now() + 600000 };
});
const putOut = (P) => P.page.evaluate(() => {
  window.__qaRelightGen = (window.__qaRelightGen || 0) + 1;   /* and stops a relight loop */
  const S = window._gameState && window._gameState.current;
  if (S) { S._firemaking = null; S._campfire = null; }
});

const settle = async (P, wsPort) => {
  await H.clickText(P, 'CLOSE').catch(() => {});
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id).catch(() => {});
  await P.page.waitForTimeout(1000);
  await H.closeNpcDialogue(P).catch(() => {});
};
/* A picture of the fire-lighter for the spec -- taken once he is drawn (with
   his layer on, `wantInk`), because a loaded box can take longer to screenshot
   than a light lasts. */
const shot = async (P, pid, name, poke, wantInk) => {
  if (poke) {
    await P.page.evaluate((code) => {
      window.__qaShotPoke = new Function('S', code);
      const tick = () => {
        if (!window.__qaShotPoke) return;
        try { window.__qaShotPoke(window._gameState.current); } catch (e) { /* ignore */ }
        requestAnimationFrame(tick);
      };
      tick();
    }, poke);
    await P.page.waitForTimeout(700);
  }
  const box = await P.page.evaluate(async ({ id, wantInk }) => {
    const R = window._pixiRenderer;
    const drawn = () => {
      const pair = R && R.fireSpriteRaw && R.fireSpriteRaw(id);
      const sp = pair && pair.body;
      if (!sp || !sp.visible || !sp.getBounds) return null;
      return (wantInk && !(pair.ink && pair.ink.visible)) ? null : sp;
    };
    const t0 = performance.now();
    let sp = drawn();
    while (!sp && performance.now() - t0 < 8000) {
      await new Promise((r) => requestAnimationFrame(r));
      sp = drawn();
    }
    if (!sp) return null;
    const b = sp.getBounds();
    const c = document.querySelector('canvas');
    const r = c ? c.getBoundingClientRect() : { x: 0, y: 0 };
    const k = c ? r.width / c.width * (window.devicePixelRatio || 1) : 1;
    return { x: r.x + b.x * k - 8, y: r.y + b.y * k - 8, width: b.width * k + 16, height: b.height * k + 16 };
  }, { id: pid || null, wantInk: !!wantInk }).catch(() => null);
  if (box && box.width > 4 && box.height > 4) {
    await P.page.screenshot({ path: `${SHOTS}/fireink-${name}.png`, clip: box }).catch(() => {});
  }
  if (poke) await P.page.evaluate(() => { window.__qaShotPoke = null; });
};
const cleanRows = (rows) => rows.filter((s) => !s.err);
const fmt = (rows) => rows.map((s) => `${s.t}:${s.k}:${s.blue}/${s.pink}/${s.side}/${s.stray}${s.fireInk != null ? '/' + (s.fireInk ? 1 : 0) : ''}`).join(' ');

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  mkdirSync(SHOTS, { recursive: true });
  const B = await H.newPlayer(browser, { name: 'Plain', wsPort, webPort, guest: true, dpr: 2, init: COACH_OFF });
  opened.push(B);
  const A = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort, dpr: 2, init: SEED });
  opened.push(A);
  await H.enterWorld(B);
  await H.enterWorld(A);
  await A.page.waitForTimeout(3000);
  await settle(A, wsPort);
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  await H.waitMutualSight(A, B).catch(() => {});
  const aAt = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  await H.hopTo(B, aAt.x - 150, aAt.y + 20);
  await B.page.waitForTimeout(2500);
  await preloadSheet(A);
  await preloadSheet(B);

  const relayed = await B.page.evaluate(([id, face, pink]) => {
    const o = ((window._gameState.current || {}).others || {})[id];
    return o ? { face: o.faceTattooArt === face, arm: o.armTattooArt === pink, chest: o.tattooArt === pink } : null;
  }, [aId, LEFT_BLUE, ALL_PINK]);
  rec.ok('the plain player has the inked one\'s face, arm and chest drawings off the wire (guard)',
    !!relayed && relayed.face && relayed.arm && relayed.chest, relayed);

  /* ── YOUR OWN SCREEN, EVERY FRAME ── */
  const selfA = await sampleFire(A, null, 8000, SWEEP);
  await shot(A, null, 'own', SWEEP.replace('const u = (now / 2) % 530;', 'const u = 300;'));
  await putOut(A);
  const own = cleanRows(selfA);
  const ks = new Set(own.map((s) => s.k));
  console.log(`    own screen, per frame t:k:blue/pink/side/stray: ${fmt(own)}`);
  rec.ok('he is drawn as the fire-lighter on his own screen, through the light (guard)',
    own.length >= 6 && ks.size >= 6, { frames: [...ks].sort((a, b) => a - b), errs: selfA.filter((s) => s.err).slice(0, 3) });
  rec.ok('ON HIS OWN SCREEN the drawings\' layer is drawn over the fire-lighter on every frame, with its exact transform',
    own.length > 0 && own.every((s) => s.inkOn && s.aligned), own.map((s) => [s.k, s.inkOn, s.aligned]));
  rec.ok('...and his face drawing is on every frame, on the half of the face it was drawn on (the left)',
    own.length > 0 && own.every((s) => s.blue >= 20 && s.side != null && s.side < -0.15), own.map((s) => [s.k, s.blue, s.side]));
  rec.ok('...and his arm and chest drawings (pink) on every frame',
    own.length > 0 && own.every((s) => s.pink >= 40), own.map((s) => [s.k, s.pink]));
  rec.ok('the layer lines up with the figure: every pixel of it sits on the fire-lighter\'s skin, on the same frame',
    own.length > 0 && own.every((s) => s.layerPx > 0 && s.stray === 0), own.map((s) => [s.k, s.layerPx, s.stray]));
  rec.ok('nothing is drawn off him: not on the flame, its sparks or the cloth it lights (all of which pass the skin test)',
    own.length > 0 && own.every((s) => s.flameInk === 0), own.map((s) => [s.k, s.flameInk]));

  /* ── A WATCHER'S SCREEN ── */
  await relightLoop(A, 12000);
  const peerA = await sampleFire(B, aId, 11000, null);
  await putOut(A);
  /* the picture: one light, held until the watcher draws it with his layer on
     (the loop's lights come and go faster than this box takes a screenshot) */
  await holdLight(A);
  await shot(B, aId, 'watcher', null, true);
  await putOut(A);
  const peer = cleanRows(peerA);
  const firstInked = peer.findIndex((s) => s.blue >= 20 && s.pink >= 40);
  const bareMs = firstInked >= 0 ? peer[firstInked].t - peer[0].t : null;
  console.log(`    watcher's first samples (errors included): ${peerA.slice(0, 5).map((s) => (s.err ? `${s.t}:${s.err}` : `${s.t}:${s.k}:${s.blue}`)).join(' | ')}`);
  console.log(`    watcher, per frame t:k:blue/pink/side/stray/fireInk: ${fmt(peer)}`);
  rec.ok('the plain player sees him lighting fires (guard)', peer.length >= 3, peerA.slice(0, 6));
  rec.ok(`ON THE WATCHER'S SCREEN his drawings are on too, from his first light (bare for ${bareMs} ms here while the layer bakes)`,
    firstInked >= 0 && bareMs <= 3000, { firstInked, frames: peer.slice(0, 12).map((s) => [s.t, s.k, s.blue, s.pink]) });
  rec.ok('...and stay on for every frame after that, face on the left, drawn from his layer',
    firstInked >= 0 && peer.slice(firstInked).every((s) => s.blue >= 20 && s.pink >= 40 && s.side < -0.15 && s.fireInk === true),
    peer.slice(Math.max(0, firstInked)).map((s) => [s.k, s.blue, s.pink, s.side, s.fireInk]));
  rec.ok('...lined up with the figure there too, and nothing on the flame',
    firstInked >= 0 && peer.slice(firstInked).every((s) => s.aligned && s.stray === 0 && s.flameInk === 0),
    peer.slice(Math.max(0, firstInked)).map((s) => [s.k, s.aligned, s.stray, s.flameInk]));
  const heldFire = await B.page.evaluate(() => window._pixiRenderer.fireInkLayers().peers);
  rec.ok(`the watcher holds one layer for him (${heldFire})`, heldFire === 1, heldFire);

  /* ── THE PLAIN PLAYER LIGHTS ONE TOO: NO LEAK ── */
  await relightLoop(B, 9000);
  const viewB = await sampleFire(A, bId, 8000, null);
  await putOut(B);
  const vb = cleanRows(viewB);
  console.log(`    the inked player watching the plain one, t:k:blue/pink/side/stray/fireInk: ${fmt(vb)}`);
  rec.ok('the inked player sees the plain one lighting a fire (guard)', vb.length >= 2, viewB.slice(0, 6));
  rec.ok('ON THE INKED PLAYER\'S SCREEN the plain player lights it with NO drawings -- his own do not leak onto other fire-lighters',
    vb.length > 0 && vb.every((s) => !s.inkOn && s.blue === 0 && s.pink === 0 && s.fireInk === false),
    vb.map((s) => [s.k, s.inkOn, s.blue, s.pink, s.fireInk]));
  const selfB = cleanRows(await sampleFire(B, null, 3000, SWEEP));
  await putOut(B);
  const bLayers = await B.page.evaluate(() => window._pixiRenderer.fireInkLayers());
  rec.ok('...and the plain player\'s own fire-lighter has no layer at all',
    selfB.length > 0 && selfB.every((s) => !s.inkOn && s.blue === 0 && s.pink === 0) && bLayers.body === 0,
    { layers: bLayers, frames: selfB.map((s) => [s.k, s.inkOn, s.blue, s.pink]) });

  /* ── A DRAWING CHANGE: THE LAYER IS REBUILT, THE FIGURE IS NOT ── */
  const srcBefore = own.length ? own[own.length - 1].src : null;
  await A.page.evaluate((s) => window.__btSetArt('tattooFace', s), RIGHT_BLUE);
  await A.page.waitForTimeout(5000);
  const selfR = cleanRows(await sampleFire(A, null, 5000, SWEEP));
  await putOut(A);
  console.log(`    own screen after drawing on the right, t:k:blue/pink/side/stray: ${fmt(selfR)}`);
  rec.ok('after he redraws his face on the RIGHT half, every frame shows the new drawing (the layer was rebuilt)',
    selfR.length > 0 && selfR.every((s) => s.inkOn && s.blue >= 20 && s.side != null && s.side > 0.15 && s.stray === 0),
    selfR.map((s) => [s.k, s.blue, s.side, s.stray]));
  rec.ok('...and the figure under it is the same texture as before -- a drawing change does not rebake the figure',
    selfR.length > 0 && srcBefore != null && selfR.every((s) => s.src === srcBefore), { before: srcBefore, after: [...new Set(selfR.map((s) => s.src))] });

  /* ── THE FIST ── on the two frames the hands are cupped at the flame, read
     from every fire-lighter sampled above: his own, through the light and after
     the redraw, and the watcher's (the same bake, in the watcher's skin).  One
     sweep on a loaded box can miss a frame; all three together read both. */
  const fistRows = [...own, ...peer, ...selfR].filter((s) => s.k === 4 || s.k === 5);
  const fistKs = new Set(fistRows.map((s) => s.k));
  console.log(`    the fist, frame:skin px/left in the paint: ${fistRows.map((s) => `${s.k}:${s.fistPx}/${s.fistSame}`).join(' ')}`);
  rec.ok('the fist cupped at the flame (frames 4 and 5) wears his skin: none of it left in the artist\'s paint',
    fistKs.has(4) && fistKs.has(5) && fistRows.every((s) => s.fistPx > 300 && s.fistSame === 0), fistRows.map((s) => [s.k, s.fistPx, s.fistSame]));

  /* ── WHAT IT COSTS ── the test's drawings are the worst case: every cell of
     the face, both arms and the chest. */
  const trim = await A.page.evaluate(() => (window.__btStandInTrim ? window.__btStandInTrim() : []));
  const row = (k) => trim.find((r) => r.key === k) || null;
  const lay = row('_fireFramesInk'), fig = row('_fireFrames');
  const mb = (n) => +(n / 1e6).toFixed(2);
  /* a strip packTrimmed declines (the crop would save under 10%) keeps its whole
     canvas and logs no row: then it costs all eight 384x512 frames */
  const layB = lay ? lay.packedBytes : 0, figB = fig ? fig.packedBytes : 384 * 512 * 8 * 4;
  console.log(`    layer ${lay ? mb(layB) : '?'} MB against the figure's ${mb(figB)} MB (${JSON.stringify({ lay, fig })})`);
  rec.ok(`the drawings' layer costs ${lay ? mb(layB) : '?'} MB for the most ink a player can draw, under the figure's own ${mb(figB)} MB`,
    !!lay && layB > 0 && layB < figB, { lay, fig });

  /* ── RELEASED WHEN HE STOPS ── */
  await B.page.waitForTimeout(17000);
  const left = await B.page.evaluate(() => window._pixiRenderer.fireInkLayers().peers);
  rec.ok('...and the watcher releases it once he has stopped (15 s)', left === 0, left);

  for (const P of [A, B]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }
}
