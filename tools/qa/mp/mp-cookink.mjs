/* ═══ v2.3.2856: YOUR TATTOOS STAY ON WHILE YOU COOK ═══
 *
 * Owner: "Yea do woodcutting and missing ones."  Cooking swaps the body for a
 * pre-drawn cook (cook-strip.webp, 24 frames) baked with your skin and nothing
 * else, so every drawing vanished at the campfire.  That bake is also what
 * EVERY OTHER player's cook is drawn from on your screen (the SPEC table's
 * v2.3.1713 note), so the drawings ride a layer of their own over it
 * (_bakeCookStrips, recolorStandInSkinSplit).  This checks, from the frames the
 * renderers actually draw:
 *
 *   - YOUR SCREEN: the face, arm and chest drawings are on every frame, the
 *     face on the half it was drawn on, and the layer lines up with the figure
 *     (every drawn pixel of it sits on the figure's skin, on the same frame);
 *   - THE PAN: nothing is drawn on the pan or the fish, and the fish keeps the
 *     painted colour (it is the same orange as the skin);
 *   - THE FINGERS: no skin pixel of the cook is left in the artist's paint.
 *     The fingers on the handle were islands under the fish's size floor and
 *     stayed orange whatever skin you picked (COOK_KEEP_X);
 *   - A WATCHER'S SCREEN: the peer's cook carries their drawings once their
 *     layer lands (their look is not known at load -- the preload law's named
 *     exception), and keeps them;
 *   - NO LEAK: a player with NO drawings cooks bare on the inked player's
 *     screen.  The shared figure is the inked player's own bake, so this is the
 *     check that the drawings did not go into it;
 *   - GREAVES: with leg armour the cook is the legless strip, which has its own
 *     layer -- measured against that strip;
 *   - A DRAWING CHANGE rebuilds the layer and leaves the figure's textures
 *     alone;
 *   - the watcher releases a peer's layers after they stop.
 *
 * WHY THE FRAME: a screenshot would also photograph the fire and the ground.
 * The drawn frames are compared pixel for pixel with the same frame of the
 * shipped strip, so blue or pink in the drawn picture that is not in the art
 * is ink.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { COOK_INK_REGIONS, COOK_KEEP_X } from '../../../src/rendering/standInInk.js';

const SHOTS = H.REPO + '/tools/qa/mp/out';
const ALL_PINK = 'b'.repeat(256);
/* The face drawing on its LEFT eight columns, blue -- and then its RIGHT eight,
   for the drawing change: which half the ink sits on says which drawing it is. */
const LEFT_BLUE = Array.from({ length: 256 }, (_, i) => ((i % 16) < 8 ? '8' : '0')).join('');
const RIGHT_BLUE = Array.from({ length: 256 }, (_, i) => ((i % 16) >= 8 ? '8' : '0')).join('');

const COACH_OFF = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}`;
/* Into storage BEFORE the character exists, so the creator's join carries them
   into the saved record (v2.3.2746). */
const SEED = COACH_OFF + `
try {
  localStorage.setItem('bt-facetattoo', ${JSON.stringify(LEFT_BLUE)});
  localStorage.setItem('bt-armtattoo', ${JSON.stringify(ALL_PINK)});
  localStorage.setItem('bt-tattooart', ${JSON.stringify(ALL_PINK)});
} catch (e) {}`;

/* Read a cook as the renderer holds it -- the figure and the drawings' layer
   over it -- next to the same frame of the shipped strip, on every animation
   frame for `ms`.  `pid` null = your own cook.  Each distinct pair of textures
   is measured once. */
const sampleCook = (P, pid, ms, legless) => P.page.evaluate(async ({ pid, dur, legless, face, keepX }) => {
  const R = window._pixiRenderer;
  const url = legless ? '/sprites/skills/cook-strip-legless.webp' : '/sprites/skills/cook-strip.webp';
  window.__qaCookSheets = window.__qaCookSheets || {};
  if (!window.__qaCookSheets[url]) {
    window.__qaCookSheets[url] = await new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im); im.onerror = () => res(null);
      im.src = url;   /* the URL the game loads */
    });
  }
  const sheet = window.__qaCookSheets[url];
  const FW = 213, FH = 220;
  const isBlue = (d, o) => d[o + 3] > 60 && d[o + 2] > d[o] + 40 && d[o + 2] > d[o + 1] + 20;
  const isPink = (d, o) => d[o + 3] > 60 && d[o + 2] > d[o + 1] + 24 && d[o] > 110 && d[o] >= d[o + 2];
  const isSkin = (d, o) => { const r = d[o], g = d[o + 1], b = d[o + 2];
    return d[o + 3] > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25; };
  const blit = (res, sx, sy, sw, sh, dx, dy) => {
    const c = document.createElement('canvas'); c.width = FW; c.height = FH;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(res, sx, sy, sw, sh, dx, dy, sw, sh);
    return g.getImageData(0, 0, FW, FH).data;
  };
  /* The frames are cropped to their art (v2.3.2775, _sliceStandIn): `frame` is
     the crop in the packed sheet and `trim` where it sits in the whole frame. */
  const whole = (tex) => {
    const f = tex.frame, orig = tex.orig || f, trim = tex.trim || null;
    if (Math.round(orig.width) !== FW || Math.round(orig.height) !== FH) throw new Error(`frame ${orig.width}x${orig.height}`);
    return blit(tex.source.resource, f.x, f.y, f.width, f.height, trim ? trim.x : 0, trim ? trim.y : 0);
  };
  const readable = (sp) => !!(sp && sp.visible && sp.texture && sp.texture.source && sp.texture.source.resource);
  const fcx = (face[0] + face[1]) / 2, fhw = (face[1] - face[0]) / 2;
  const measure = (pair) => {
    const body = pair && pair.body;
    if (!body || !body.visible) return { err: 'not drawn' };
    if (!readable(body)) return { err: 'no texture' };
    if (!sheet) return { err: 'the shipped strip did not load' };
    const k = body._cookK;
    if (typeof k !== 'number' || k < 0 || k > 23) return { err: 'no frame index' };
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
    /* the two drawn the way the renderer draws them: the layer over the figure */
    const comp = new Uint8ClampedArray(got);
    if (lay) {
      for (let o = 0; o < lay.length; o += 4) {
        const a = lay[o + 3] / 255;
        if (!a) continue;
        for (let c = 0; c < 3; c++) comp[o + c] = Math.round(lay[o + c] * a + comp[o + c] * (1 - a));
        comp[o + 3] = Math.max(comp[o + 3], lay[o + 3]);
      }
    }
    let blue = 0, pink = 0, faceBlue = 0, sx = 0, layerPx = 0, stray = 0, panInk = 0;
    let sameSkin = 0, fishPx = 0, fishChanged = 0, extraOpaque = 0;
    for (let o = 0, p = 0; o < got.length; o += 4, p++) {
      const x = p % FW, y = (p / FW) | 0;
      if (lay && lay[o + 3]) {
        layerPx++;
        /* the layer holds only what the drawings changed, and they only ever
           land on the figure's skin -- on the SAME frame -- so a layer pixel
           over anything else means the two are out of step */
        if (got[o + 3] === 0 || !isSkin(raw, o)) stray++;
        if (x >= 140) panInk++;   /* the pan and the fish in it; no arm reaches past x 137 */
      }
      if (isBlue(comp, o) && !isBlue(raw, o)) {
        blue++;
        if (x >= face[0] && x <= face[1] && y >= face[2] && y <= face[3]) { faceBlue++; sx += x; }
      }
      if (isPink(comp, o) && !isPink(raw, o)) pink++;
      if (isSkin(raw, o)) {
        const same = got[o] === raw[o] && got[o + 1] === raw[o + 1] && got[o + 2] === raw[o + 2];
        if (x < keepX) { if (same) sameSkin++; }
        else if (x >= 140) { fishPx++; if (!same) fishChanged++; }
      }
      /* the figure's silhouette is this strip's: nothing drawn where it has nothing */
      if (got[o + 3] > 0 && raw[o + 3] === 0) extraOpaque++;
    }
    const side = faceBlue ? +(((sx / faceBlue) - fcx) / fhw).toFixed(2) : null;
    return { k, inkOn, aligned, blue, pink, side, layerPx, stray, panInk, sameSkin, fishPx, fishChanged, extraOpaque,
      src: body.texture.source.uid };
  };
  const out = [];
  const seen = new Set();
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const pair = R && R.cookSpriteRaw ? R.cookSpriteRaw(pid) : null;
      const body = pair && pair.body;
      const key = (body && body.visible && body.texture)
        ? body.texture.uid + ':' + (readable(pair.ink) ? pair.ink.texture.uid : 'x') : 'none';
      if (!seen.has(key)) {
        seen.add(key);
        const m = measure(pair);
        m.t = Math.round(performance.now() - t0);
        if (pid && R.remoteSkillProbe) { const pr = R.remoteSkillProbe(pid); m.cookInk = pr ? pr.cookInk : null; }
        out.push(m);
      }
      if (performance.now() - t0 < dur) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  return out;
}, { pid: pid || null, dur: ms, legless: !!legless, face: COOK_INK_REGIONS.face[0], keepX: COOK_KEEP_X });

/* Both strips into the page BEFORE any sampling starts, so a sampler's clock
   starts with the art in hand -- otherwise its first frames are spent decoding,
   and a watcher's bare moment (before a peer's layer lands) can pass unseen. */
const preloadSheets = (P) => P.page.evaluate(async () => {
  window.__qaCookSheets = window.__qaCookSheets || {};
  for (const url of ['/sprites/skills/cook-strip.webp', '/sprites/skills/cook-strip-legless.webp']) {
    if (window.__qaCookSheets[url]) continue;
    window.__qaCookSheets[url] = await new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im); im.onerror = () => res(null);
      im.src = url;
    });
    try { await window.__qaCookSheets[url].decode(); } catch (e) { /* drawn anyway */ }
  }
});

/* Park a live campfire on the player and hold the cooking extraction open --
   mp-cookpeer's fixture, for its reasons (the tick drops an extraction whose
   node is not live; 'waiting' with a far window keeps the cook on screen). */
const installCook = (P) => P.page.evaluate(() => {
  window.__qaCook = (on) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return false;
    if (!Array.isArray(S.gatherNodes)) S.gatherNodes = [];
    S.gatherNodes = S.gatherNodes.filter((n) => n && n.id !== 'qa_node_cookink');
    if (!on) { S._extraction = null; S._campfire = null; return true; }
    const node = { id: 'qa_node_cookink', nodeType: 'fire', x: S.player.x, y: S.player.y,
      alive: true, hp: 999, maxHp: 999, r: 40 };
    S.gatherNodes.push(node);
    S._campfire = node;
    S._extraction = { skill: 'cooking', status: 'waiting', nodeRef: node, nodeId: node.id,
      startedAt: Date.now(), windowOpensAt: Date.now() + 600000 };
    return true;
  };
});
const cook = (P, on) => P.page.evaluate((v) => window.__qaCook(v), on);

const settle = async (P, wsPort) => {
  await H.clickText(P, 'CLOSE').catch(() => {});
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id).catch(() => {});
  await P.page.waitForTimeout(1000);
  await H.closeNpcDialogue(P).catch(() => {});
};
const shot = async (P, pid, name) => {
  const box = await P.page.evaluate((id) => {
    const R = window._pixiRenderer;
    const pair = R && R.cookSpriteRaw && R.cookSpriteRaw(id);
    const sp = pair && pair.body;
    if (!sp || !sp.visible || !sp.getBounds) return null;
    const b = sp.getBounds();
    const c = document.querySelector('canvas');
    const r = c ? c.getBoundingClientRect() : { x: 0, y: 0 };
    const k = c ? r.width / c.width * (window.devicePixelRatio || 1) : 1;
    return { x: r.x + b.x * k - 8, y: r.y + b.y * k - 8, width: b.width * k + 16, height: b.height * k + 16 };
  }, pid || null).catch(() => null);
  if (box && box.width > 4 && box.height > 4) {
    await P.page.screenshot({ path: `${SHOTS}/cookink-${name}.png`, clip: box }).catch(() => {});
  }
};
const cleanRows = (rows) => rows.filter((s) => !s.err);
const fmt = (rows) => rows.map((s) => `${s.t}:${s.k}:${s.blue}/${s.pink}/${s.side}/${s.stray}${s.cookInk != null ? '/' + (s.cookInk ? 1 : 0) : ''}`).join(' ');

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
  await installCook(A);
  await installCook(B);
  await preloadSheets(A);
  await preloadSheets(B);

  const relayed = await B.page.evaluate(([id, face, pink]) => {
    const o = ((window._gameState.current || {}).others || {})[id];
    return o ? { face: o.faceTattooArt === face, arm: o.armTattooArt === pink, chest: o.tattooArt === pink } : null;
  }, [aId, LEFT_BLUE, ALL_PINK]);
  rec.ok('the plain player has the inked one\'s face, arm and chest drawings off the wire (guard)',
    !!relayed && relayed.face && relayed.arm && relayed.chest, relayed);

  /* ── THE INKED PLAYER COOKS ── */
  const [peerA, selfA] = await Promise.all([
    sampleCook(B, aId, 11000, false),
    (async () => { await cook(A, true); return sampleCook(A, null, 8000, false); })(),
  ]);
  await shot(A, null, 'own');
  await shot(B, aId, 'watcher');
  const own = cleanRows(selfA);
  const ks = new Set(own.map((s) => s.k));
  console.log(`    own screen, per frame t:k:blue/pink/side/stray: ${fmt(own)}`);
  rec.ok('he is drawn as the cook on his own screen, across the loop (guard)',
    own.length >= 8 && ks.size >= 8, { frames: [...ks].sort((a, b) => a - b), errs: selfA.filter((s) => s.err).slice(0, 3) });
  rec.ok('ON HIS OWN SCREEN the drawings\' layer is drawn over the cook on every frame, with the cook\'s exact transform',
    own.length > 0 && own.every((s) => s.inkOn && s.aligned), own.map((s) => [s.k, s.inkOn, s.aligned]));
  rec.ok('...and his face drawing is on every frame, on the half of the face it was drawn on (the left)',
    own.length > 0 && own.every((s) => s.blue >= 20 && s.side != null && s.side < -0.15), own.map((s) => [s.k, s.blue, s.side]));
  rec.ok('...and his arm and chest drawings (pink) on every frame',
    own.length > 0 && own.every((s) => s.pink >= 40), own.map((s) => [s.k, s.pink]));
  rec.ok('the layer lines up with the cook: every pixel of it sits on the cook\'s skin, on the same frame',
    own.length > 0 && own.every((s) => s.layerPx > 0 && s.stray === 0), own.map((s) => [s.k, s.layerPx, s.stray]));
  rec.ok('nothing is drawn on the pan or the fish, and the fish keeps its painted colour',
    own.length > 0 && own.every((s) => s.panInk === 0 && s.fishPx > 0 && s.fishChanged === 0),
    own.map((s) => [s.k, s.panInk, s.fishPx, s.fishChanged]));
  /* The fingers: the islands of skin on the pan's handle used to keep the
     painted orange.  The retint moves every skin pixel it touches, so a pixel
     still EXACTLY the art's is one it skipped. */
  rec.ok('the whole cook wears his skin: no skin pixel left in the artist\'s paint, the fingers on the handle included',
    own.length > 0 && own.every((s) => s.sameSkin <= 3), own.map((s) => [s.k, s.sameSkin]));

  const peer = cleanRows(peerA);
  const firstInked = peer.findIndex((s) => s.blue >= 20 && s.pink >= 40);
  const bareMs = firstInked >= 0 ? peer[firstInked].t - peer[0].t : null;
  console.log(`    watcher's first samples (errors included): ${peerA.slice(0, 5).map((s) => (s.err ? `${s.t}:${s.err}` : `${s.t}:${s.k}:${s.blue}`)).join(' | ')}`);
  console.log(`    watcher, per frame t:k:blue/pink/side/stray/cookInk: ${fmt(peer)}`);
  rec.ok('the plain player sees him cooking (guard)', peer.length >= 4, peerA.slice(0, 6));
  /* A peer's look cannot be baked at load; the layer is made the first time he
     is seen cooking, from a re-fetch of the strip.  The bound is generous for
     this box, which renders several times slower than a phone. */
  rec.ok(`ON THE WATCHER'S SCREEN his drawings are on too, from his first moments at the fire (bare for ${bareMs} ms here while the layer bakes)`,
    firstInked >= 0 && bareMs <= 3000, { firstInked, frames: peer.slice(0, 12).map((s) => [s.t, s.blue, s.pink]) });
  rec.ok('...and stay on for every frame after that, face on the left, drawn from his layer',
    firstInked >= 0 && peer.slice(firstInked).every((s) => s.blue >= 20 && s.pink >= 40 && s.side < -0.15 && s.cookInk === true),
    peer.slice(Math.max(0, firstInked)).map((s) => [s.k, s.blue, s.pink, s.side, s.cookInk]));
  rec.ok('...lined up with the cook there too, and nothing on the pan',
    firstInked >= 0 && peer.slice(firstInked).every((s) => s.aligned && s.stray === 0 && s.panInk === 0),
    peer.slice(Math.max(0, firstInked)).map((s) => [s.k, s.aligned, s.stray, s.panInk]));

  /* ── THE PLAIN PLAYER COOKS TOO: NO LEAK ── */
  const [viewB, selfB] = await Promise.all([
    sampleCook(A, bId, 8000, false),
    (async () => { await cook(B, true); return sampleCook(B, null, 5000, false); })(),
  ]);
  const vb = cleanRows(viewB);
  console.log(`    the inked player watching the plain one, t:k:blue/pink/side/stray/cookInk: ${fmt(vb)}`);
  rec.ok('the inked player sees the plain one cooking (guard)', vb.length >= 4, viewB.slice(0, 6));
  /* The cook every other player is drawn with IS the inked player's own bake.
     Had his drawings gone into it, they would be on this cook. */
  rec.ok('ON THE INKED PLAYER\'S SCREEN the plain player cooks with NO drawings -- his own do not leak onto other cooks',
    vb.length > 0 && vb.every((s) => !s.inkOn && s.blue === 0 && s.pink === 0 && s.cookInk === false),
    vb.map((s) => [s.k, s.inkOn, s.blue, s.pink, s.cookInk]));
  const ownB = cleanRows(selfB);
  const bLayers = await B.page.evaluate(() => window._pixiRenderer.cookInkLayers());
  rec.ok('...and the plain player\'s own cook has no layer at all (nothing drawn, nothing held)',
    ownB.length > 0 && ownB.every((s) => !s.inkOn && s.blue === 0 && s.pink === 0) && bLayers.body === 0 && bLayers.legless === 0,
    { layers: bLayers, frames: ownB.map((s) => [s.k, s.inkOn, s.blue, s.pink]) });
  await cook(B, false);

  /* ── GREAVES: THE LEGLESS COOK, WITH ITS OWN LAYER ── */
  await A.page.evaluate(() => { if (window.__btSetGear) window.__btSetGear('legs', 'steelgreaves'); });
  await A.page.waitForTimeout(2000);
  const [peerL, selfL] = await Promise.all([
    sampleCook(B, aId, 10000, true),
    sampleCook(A, null, 6000, true),
  ]);
  const ownL = cleanRows(selfL);
  console.log(`    own screen in greaves, t:k:blue/pink/side/stray: ${fmt(ownL)}`);
  rec.ok('in greaves he cooks as the LEGLESS figure (its silhouette, frame for frame) (guard)',
    ownL.length >= 4 && ownL.every((s) => s.extraOpaque === 0), ownL.map((s) => [s.k, s.extraOpaque]));
  rec.ok('...and his drawings are on every frame of it, lined up with THAT strip\'s skin',
    ownL.length > 0 && ownL.every((s) => s.inkOn && s.aligned && s.blue >= 20 && s.pink >= 40 && s.stray === 0 && s.side < -0.15),
    ownL.map((s) => [s.k, s.inkOn, s.blue, s.pink, s.stray, s.side]));
  const peerLf = cleanRows(peerL);
  const firstL = peerLf.findIndex((s) => s.blue >= 20 && s.pink >= 40 && s.stray === 0);
  console.log(`    watcher, greaves, t:k:blue/pink/side/stray/cookInk: ${fmt(peerLf)}`);
  rec.ok('the watcher sees the legless cook inked too, once its layer lands, and lined up with it',
    firstL >= 0 && peerLf.slice(firstL).every((s) => s.blue >= 20 && s.pink >= 40 && s.stray === 0 && s.extraOpaque === 0),
    { firstL, frames: peerLf.slice(0, 14).map((s) => [s.t, s.k, s.blue, s.pink, s.stray, s.extraOpaque]) });
  const held = await B.page.evaluate(() => window._pixiRenderer.cookInkLayers().peers);
  rec.ok(`the watcher holds at most two drawn cooks' layers (${held} now: one per strip)`, held >= 1 && held <= 2, held);

  /* ── A DRAWING CHANGE: THE LAYER IS REBUILT, THE FIGURE IS NOT ── */
  const srcBefore = ownL.length ? ownL[ownL.length - 1].src : null;
  await A.page.evaluate((s) => window.__btSetArt('tattooFace', s), RIGHT_BLUE);
  await A.page.waitForTimeout(5000);
  const selfR = cleanRows(await sampleCook(A, null, 5000, true));
  console.log(`    own screen after drawing on the right, t:k:blue/pink/side/stray: ${fmt(selfR)}`);
  rec.ok('after he redraws his face on the RIGHT half, every frame shows the new drawing (the layer was rebuilt)',
    selfR.length > 0 && selfR.every((s) => s.inkOn && s.blue >= 20 && s.side != null && s.side > 0.15 && s.stray === 0),
    selfR.map((s) => [s.k, s.blue, s.side, s.stray]));
  rec.ok('...and the cook under it is the same texture as before -- a drawing change does not rebake the figure',
    selfR.length > 0 && srcBefore != null && selfR.every((s) => s.src === srcBefore), { before: srcBefore, after: [...new Set(selfR.map((s) => s.src))] });

  /* ── WHAT IT COSTS ──
     The cook figure fills its frames, so it is never packed (packTrimmed's 90%
     rule) and each strip costs its full 213x220x24 -- `fullBytes` on the
     layer's row.  The test's drawings are the worst case: every cell of the
     face, both arms and the chest. */
  const trim = await A.page.evaluate(() => (window.__btStandInTrim ? window.__btStandInTrim() : []));
  const row = (k) => trim.find((r) => r.key === k) || null;
  const lay = row('_cookFramesInk'), layL = row('_cookLeglessFramesInk');
  const mb = (n) => +(n / 1e6).toFixed(2);
  rec.ok(`the drawings' layers cost ${lay ? mb(lay.packedBytes) : '?'} + ${layL ? mb(layL.packedBytes) : '?'} MB for the most ink a player can draw, `
    + `about half of the ${lay ? mb(lay.fullBytes) : '?'} MB each figure costs (and nothing for a player with no drawings)`,
    !!(lay && layL) && lay.packedBytes <= 0.55 * lay.fullBytes && layL.packedBytes <= 0.55 * layL.fullBytes,
    { lay, layL });

  /* ── RELEASED WHEN HE STOPS ── */
  await cook(A, false);
  await B.page.waitForTimeout(17000);
  const left = await B.page.evaluate(() => window._pixiRenderer.cookInkLayers().peers);
  rec.ok('...and the watcher releases them once he has stopped cooking (15 s)', left === 0, left);

  for (const P of [A, B]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }
}
