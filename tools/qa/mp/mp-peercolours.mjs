/* ═══ ANOTHER PLAYER GATHERS IN THEIR OWN COLOURS (v2.3.3309) ═══
 *
 * Owner: "Other players cooking showed wrong skin color and maybe other stuff
 * too. Needs fixed."
 *
 * A peer's cook and fire-lighter were drawn from the WATCHER'S figure -- the
 * watcher's skin and, since v2.3.3146, the watcher's trousers and boots, under
 * the peer's own shirt, armour and head -- and a peer's lumberjack (unless
 * they had drawings) from the unpainted art.  Two players here wear nothing
 * alike: the Watcher ebony skin, red trousers, blue boots; the Gatherer pale
 * skin, teal trousers, white boots.  The Gatherer cooks, lights a fire and
 * chops, and this reads, off the textures the Watcher's renderer actually
 * draws, frame by frame:
 *
 *   - every pixel the bake recoloured against the same frame of the shipped
 *     strip, as the recipe recolours it (playerSkins _retint: the target times
 *     the art's own luminance over the region's reference, 149 skin, 112
 *     trousers, 75 boots): it must be the GATHERER's skin, trousers and boots,
 *     and none of it the Watcher's;
 *   - the Gatherer's own screen, the same reading (the yardstick);
 *   - the figure is the one baked for the Gatherer's colours, not the
 *     Watcher's own (remoteSkillProbe `shared`), and the Watcher never made
 *     its own cook for somebody in other colours (it did, and kept it);
 *   - while that figure bakes, the Watcher draws the Gatherer's walking body:
 *     on no frame is there neither, or both;
 *   - in greaves the cook is the legless strip, in the Gatherer's skin;
 *   - dressed in the Gatherer's colours, the Watcher's own figure is the one
 *     the Gatherer is drawn from (`shared`), with no second one baked;
 *   - every figure is let go of 15 s after the Gatherer stops;
 *   - all of them together stay within one 16 MB allowance, which a figure
 *     drawn in the last second is never pushed out of.
 *
 * WHY THE TEXTURE AND NOT A SCREENSHOT: the ground and the fire are under a
 * screenshot, and the town's warm stones pass a skin test.  The canvas a frame
 * was cut from is the thing that was wrong.  (`__btTrimVerify` keeps those
 * canvases, as ?gpucopies would.)
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const SHOTS = H.REPO + '/tools/qa/mp/out';

/* The catalog's targets (playerSkins.js SKIN_CATALOG / PANTS_CATALOG /
   SHOES_CATALOG) for the two outfits. */
const WATCHER = { skin: 'ebony', pants: 'red', shoes: 'blue',
  t: { skin: [82, 56, 39], pants: [185, 58, 46], shoes: [72, 98, 192] } };
const GATHERER = { skin: 'pale', pants: 'teal', shoes: 'white',
  t: { skin: [240, 205, 170], pants: [52, 172, 162], shoes: [222, 222, 228] } };

const COACH_OFF = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}
/* the figures' canvases are let go of once on the GPU (effectsRenderer
   _gpuOnly); this keeps them so their pixels can be read back, as ?gpucopies
   does -- set here, as the guest's page reloads into ?guest=1 on the way in */
window.__btTrimVerify = true;`;
/* Into storage BEFORE the character exists, so the creator and the join carry
   them (the stores read localStorage when the page loads). */
const dress = (who) => COACH_OFF + `
try {
  localStorage.setItem('bt-skin', ${JSON.stringify(who.skin)});
  localStorage.setItem('bt-pants', ${JSON.stringify(who.pants)});
  localStorage.setItem('bt-shoes', ${JSON.stringify(who.shoes)});
} catch (e) {}`;

/* Your own fire-lighter plays its light once and holds the last frame; this
   sweeps it through all eight, as mp-fireink does (its SWEEP). */
const SWEEP = `const now = performance.now();
  const dt = window.__qaFireLast ? Math.min(1000, now - window.__qaFireLast) : 16;
  window.__qaFireLast = now;
  const u = (now / 2) % 530;
  S._campfire = null;
  S._firemaking = { x: S.player.x, y: S.player.y + 6, startedAt: Date.now() - u + dt, doneAt: Date.now() + 600000 };`;

const SHEETS = {
  cook: { url: '/sprites/skills/cook-strip.webp', urlL: '/sprites/skills/cook-strip-legless.webp', fw: 213, fh: 220, base: 0 },
  fire: { url: '/sprites/skills/firemaking-strip.webp?v=2.3.1715', fw: 384, fh: 512, base: 0 },
  chop: { url: '/sprites/skills/chop-strip.webp?v=2.3.1469', urlL: '/sprites/skills/chop-strip-legless.webp?v=2.3.1469', fw: 240, fh: 220, base: 12 },
};

/* The shipped strips into the page before any sampling starts. */
const preloadSheets = (P) => P.page.evaluate(async (sheets) => {
  window.__qaSheets = window.__qaSheets || {};
  for (const k of Object.keys(sheets)) {
    for (const url of [sheets[k].url, sheets[k].urlL]) {
      if (!url || window.__qaSheets[url]) continue;
      window.__qaSheets[url] = await new Promise((res) => {
        const im = new Image();
        im.onload = () => res(im); im.onerror = () => res(null);
        im.src = url;
      });
      try { await window.__qaSheets[url].decode(); } catch (e) { /* drawn anyway */ }
    }
  }
}, SHEETS);

/* Read a gathering figure as the renderer draws it, every animation frame for
   `ms`: each distinct texture once, measured against the same frame of the
   shipped strip.  `pid` null = your own.  Also, per frame, whether the peer's
   walking body and their figure are drawn (never neither, never both). */
const sampleFig = (P, kind, pid, ms, colours, poke) => P.page.evaluate(async ({ kind, pid, dur, sheets, colours, poke }) => {
  const R = window._pixiRenderer;
  const sh = sheets[kind];
  const pokeFn = poke ? new Function('S', poke) : null;
  const lum = (d, o) => 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
  const retint = (T, k) => [Math.min(255, Math.round(T[0] * k)), Math.min(255, Math.round(T[1] * k)), Math.min(255, Math.round(T[2] * k))];
  /* within 2 a channel: the fire-lighter's art is never quite opaque (alpha
     250-254, a lossy file), and a canvas keeps such a pixel premultiplied, so
     reading the bake back can move it by one */
  const near = (d, o, c) => Math.abs(d[o] - c[0]) <= 2 && Math.abs(d[o + 1] - c[1]) <= 2 && Math.abs(d[o + 2] - c[2]) <= 2;
  /* the tool's magenta key (toolRecolor.js isToolKey): the lumberjack's axe,
     recoloured copper and pine by its own rule */
  const isKey = (r, g, b, a) => {
    if (a < 77) return false;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 46) return false;
    const dd = mx - mn;
    if (dd < mx * 0.4) return false;
    let h;
    if (mx === r) h = 60 * (((g - b) / dd) % 6);
    else if (mx === g) h = 60 * ((b - r) / dd + 2);
    else h = 60 * ((r - g) / dd + 4);
    if (h < 0) h += 360;
    return h >= 315 && h <= 350;
  };
  const far = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) > 6;
  const REF = { skin: 149, pants: 112, shoes: 75 };
  const blit = (res, sx, sy, sw, sh2, dx, dy) => {
    const c = document.createElement('canvas'); c.width = sh.fw; c.height = sh.fh;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(res, sx, sy, sw, sh2, dx, dy, sw, sh2);
    return g.getImageData(0, 0, sh.fw, sh.fh).data;
  };
  /* cropped frames (v2.3.2775): `frame` is the crop, `trim` where it sits */
  const whole = (tex) => {
    const f = tex.frame, orig = tex.orig || f, trim = tex.trim || null;
    if (Math.round(orig.width) !== sh.fw || Math.round(orig.height) !== sh.fh) throw new Error(`frame ${orig.width}x${orig.height}`);
    return blit(tex.source.resource, f.x, f.y, f.width, f.height, trim ? trim.x : 0, trim ? trim.y : 0);
  };
  const figOf = () => {
    if (kind === 'cook') { const p = R.cookSpriteRaw(pid); return p && p.body; }
    if (kind === 'fire') { const p = R.fireSpriteRaw(pid); return p && p.body; }
    return R.chopSpriteRaw(pid);
  };
  const frameOf = (sp) => (kind === 'cook' ? sp._cookK : kind === 'fire' ? sp._fireK : sp._chopK);
  const measure = (sp) => {
    const res = sp.texture && sp.texture.source && sp.texture.source.resource;
    if (!res || !(res.width > 0)) return { err: 'no canvas' };
    const k = frameOf(sp);
    if (typeof k !== 'number') return { err: 'no frame index' };
    const pr = pid ? R.remoteSkillProbe(pid) : null;
    const legless = !!(pr && pr.legless);
    const sheet = window.__qaSheets[legless ? sh.urlL : sh.url];
    if (!sheet) return { err: 'strip not loaded' };
    let got;
    try { got = whole(sp.texture); } catch (e) { return { err: 'unreadable: ' + e.message }; }
    const raw = blit(sheet, (sh.base + k) * sh.fw, 0, sh.fw, sh.fh, 0, 0);
    const n = { skin: 0, pants: 0, shoes: 0 }, w = { skin: 0, pants: 0, shoes: 0 };
    let recol = 0, decisive = 0, mine = 0, theirs = 0, other = 0, extraOpaque = 0;
    for (let o = 0; o < got.length; o += 4) {
      if (got[o + 3] > 0 && raw[o + 3] === 0) extraOpaque++;
      if (got[o + 3] < 250 || raw[o + 3] < 250) continue;
      if (isKey(raw[o], raw[o + 1], raw[o + 2], raw[o + 3])) continue;
      if (Math.abs(got[o] - raw[o]) <= 2 && Math.abs(got[o + 1] - raw[o + 1]) <= 2 && Math.abs(got[o + 2] - raw[o + 2]) <= 2) continue;
      recol++;
      const L = lum(raw, o);
      let peerHit = null, watcherHit = null, apart = true;
      for (const r of ['skin', 'pants', 'shoes']) {
        const pc = retint(colours.peer[r], L / REF[r]), wc = retint(colours.watcher[r], L / REF[r]);
        if (!far(pc, wc)) apart = false;
        if (!peerHit && near(got, o, pc)) peerHit = r;
        if (!watcherHit && near(got, o, wc)) watcherHit = r;
      }
      if (!apart) continue;   /* too dark to tell the two outfits apart */
      decisive++;
      if (peerHit) { n[peerHit]++; theirs++; } else if (watcherHit) { w[watcherHit]++; mine++; } else other++;
    }
    return { k, legless, recol, decisive, theirs, mine, other, n, w, extraOpaque,
      shared: pr ? pr.shared : null, src: sp.texture.source.uid };
  };
  const out = [], seen = new Set(), vis = [];
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      try { if (pokeFn) pokeFn(window._gameState.current); } catch (e) { /* the pose holds or it does not */ }
      const sp = figOf();
      const on = !!(sp && sp.visible && sp.texture && sp.texture.source);
      if (pid) {
        const body = R.peerDisplayRaw ? R.peerDisplayRaw(pid) : null;
        vis.push({ t: Math.round(performance.now() - t0), body: !!(body && body.visible), fig: on });
      }
      if (on) {
        const key = sp.texture.uid;
        if (!seen.has(key)) {
          seen.add(key);
          const m = measure(sp);
          m.t = Math.round(performance.now() - t0);
          out.push(m);
        }
      }
      if (performance.now() - t0 < dur) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  return { frames: out, vis };
}, { kind, pid: pid || null, dur: ms, sheets: SHEETS, colours, poke: poke || null });

/* The gathering states, held open as mp-cookink / mp-fireink / mp-chopink
   hold them: the tick drops an extraction whose node is not live, so a live
   node is parked on the player and the window put far off. */
const installFixtures = (P) => P.page.evaluate(() => {
  const S0 = () => window._gameState && window._gameState.current;
  window.__qaGather = (what, on) => {
    const S = S0();
    if (!S || !S.player) return false;
    if (!Array.isArray(S.gatherNodes)) S.gatherNodes = [];
    S.gatherNodes = S.gatherNodes.filter((n) => n && !String(n.id || '').startsWith('qa_node_peercol'));
    S._extraction = null; S._campfire = null; S._firemaking = null;
    if (!on) return true;
    if (what === 'fire') {
      S._firemaking = { x: S.player.x, y: S.player.y + 6, startedAt: Date.now(), doneAt: Date.now() + 600000 };
      return true;
    }
    const node = { id: 'qa_node_peercol_' + what, nodeType: what === 'chop' ? 'tree' : 'fire',
      x: S.player.x + (what === 'chop' ? 40 : 0), y: S.player.y, alive: true, hp: 999, maxHp: 999, r: 40 };
    S.gatherNodes.push(node);
    if (what === 'cook') S._campfire = node;
    S._extraction = { skill: what === 'chop' ? 'woodcutting' : 'cooking', status: 'waiting', nodeRef: node,
      nodeId: node.id, startedAt: Date.now(), windowOpensAt: Date.now() + 600000 };
    return true;
  };
});
const gather = (P, what, on) => P.page.evaluate(([w, v]) => window.__qaGather(w, v), [what, on]);

const settle = async (P, wsPort) => {
  await H.clickText(P, 'CLOSE').catch(() => {});
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id).catch(() => {});
  await P.page.waitForTimeout(1000);
  await H.closeNpcDialogue(P).catch(() => {});
};
const shot = async (P, kind, pid, name) => {
  const box = await P.page.evaluate(({ kind, id }) => {
    const R = window._pixiRenderer;
    const sp = kind === 'cook' ? (R.cookSpriteRaw(id) || {}).body : kind === 'fire' ? (R.fireSpriteRaw(id) || {}).body : R.chopSpriteRaw(id);
    if (!sp || !sp.visible || !sp.getBounds) return null;
    const b = sp.getBounds();
    const c = document.querySelector('canvas');
    const r = c ? c.getBoundingClientRect() : { x: 0, y: 0 };
    const k = c ? r.width / c.width * (window.devicePixelRatio || 1) : 1;
    return { x: r.x + b.x * k - 8, y: r.y + b.y * k - 8, width: b.width * k + 16, height: b.height * k + 16 };
  }, { kind, id: pid || null }).catch(() => null);
  if (box && box.width > 4 && box.height > 4) {
    await P.page.screenshot({ path: `${SHOTS}/peercolours-${name}.png`, clip: box }).catch(() => {});
  }
};

const FIG_WITHIN_MS = 6000;
const ok = (rows) => rows.filter((s) => !s.err);
const sum = (rows, f) => rows.reduce((a, s) => a + f(s), 0);
const fmt = (rows) => rows.map((s) => (s.err ? `ERR:${s.err}` : `${s.k}:${s.theirs}/${s.mine}/${s.other}/${s.decisive}`)).join(' ');
/* One figure's frames, judged: every frame the Gatherer's colours (97% of the
   pixels the two outfits can be told apart on, none of them the Watcher's),
   and over the frames each part of the outfit seen. */
function judge(rec, label, res, parts, min = 3) {
  const rows = ok(res.frames);
  console.log(`    ${label}, per frame k:theirs/mine/other/decisive: ${fmt(res.frames)}`);
  rec.ok(`${label}: drawn (guard, ${rows.length} frames)`, rows.length >= min, res.frames.slice(0, 4));
  rec.ok(`${label}: EVERY frame wears the Gatherer's colours and none of the Watcher's`,
    rows.length > 0 && rows.every((s) => s.decisive >= 300 && s.mine === 0 && s.theirs >= 0.97 * s.decisive),
    rows.map((s) => [s.k, s.theirs, s.mine, s.decisive]));
  const tot = { skin: sum(rows, (s) => s.n.skin), pants: sum(rows, (s) => s.n.pants), shoes: sum(rows, (s) => s.n.shoes) };
  rec.ok(`${label}: ...his skin${parts.includes('pants') ? ', trousers' : ''}${parts.includes('shoes') ? ' and boots' : ''} each seen (${tot.skin} / ${tot.pants} / ${tot.shoes} px)`,
    parts.every((p) => tot[p] >= (p === 'skin' ? 2000 : 200)), tot);
  rec.ok(`${label}: the figure's outline is the strip's own (nothing drawn where it has nothing)`,
    rows.length > 0 && rows.every((s) => s.extraOpaque === 0), rows.map((s) => [s.k, s.extraOpaque]));
  return rows;
}
/* While the figure bakes the walking body stands in: never neither, never both. */
function judgeVis(rec, label, vis) {
  const neither = vis.filter((v) => !v.body && !v.fig).length;
  const both = vis.filter((v) => v.body && v.fig).length;
  const firstFig = vis.findIndex((v) => v.fig);
  rec.ok(`${label}: on every frame either his walking body or his figure is drawn, never neither (${neither}) or both (${both}); the figure from ${firstFig >= 0 ? vis[firstFig].t : '?'} ms`,
    vis.length > 10 && neither === 0 && both === 0 && firstFig >= 0, { neither, both, frames: vis.length, firstFig: firstFig >= 0 ? vis[firstFig] : null });
  /* ...and not long after he starts: the bake is one per colours, off the
     frame.  Measured on this box (which draws several times slower than a
     phone) 0.7-3.0 s from the moment he starts, the relay included -- the old
     shared figure's first cook 3.2 s -- so a bake that starves (a stuck flag, a
     cap that never frees) fails here instead of passing as "drawn, later". */
  rec.ok(`${label}: ...and his figure is up within ${FIG_WITHIN_MS / 1000} s of him starting (${firstFig >= 0 ? vis[firstFig].t : '?'} ms)`,
    firstFig >= 0 && vis[firstFig].t <= FIG_WITHIN_MS, firstFig >= 0 ? vis[firstFig] : null);
}

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  mkdirSync(SHOTS, { recursive: true });
  const B = await H.newPlayer(browser, { name: 'Gatherer', wsPort, webPort, guest: true, dpr: 2, init: dress(GATHERER) });
  opened.push(B);
  const A = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, dpr: 2, init: dress(WATCHER) });
  opened.push(A);
  await H.enterWorld(B);
  await H.enterWorld(A);
  await A.page.waitForTimeout(3000);
  await settle(A, wsPort);
  const bId = await H.readState(B, (S) => S.myId);
  await H.waitMutualSight(A, B).catch(() => {});
  const aAt = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  await H.hopTo(B, aAt.x - 150, aAt.y + 20);
  await B.page.waitForTimeout(2500);
  await installFixtures(A);
  await installFixtures(B);
  await preloadSheets(A);
  await preloadSheets(B);
  const colours = { peer: GATHERER.t, watcher: WATCHER.t };
  const self = { peer: GATHERER.t, watcher: WATCHER.t };

  const relayed = await A.page.evaluate((id) => {
    const o = ((window._gameState.current || {}).others || {})[id];
    return o ? { skin: o.skin, pants: o.pants, shoes: o.shoes } : null;
  }, bId);
  rec.ok('the Watcher has the Gatherer\'s skin, trousers and boots off the wire (guard)',
    !!relayed && relayed.skin === GATHERER.skin && relayed.pants === GATHERER.pants && relayed.shoes === GATHERER.shoes, relayed);
  const mineSet = await A.page.evaluate(() => ({ skin: localStorage.getItem('bt-skin'), pants: localStorage.getItem('bt-pants'), shoes: localStorage.getItem('bt-shoes') }));
  rec.ok('the Watcher wears its own outfit (guard)', mineSet.skin === WATCHER.skin && mineSet.pants === WATCHER.pants && mineSet.shoes === WATCHER.shoes, mineSet);

  /* ── 1. THE GATHERER COOKS ── */
  const [peerCook, ownCook] = await Promise.all([
    sampleFig(A, 'cook', bId, 9000, colours),
    (async () => { await gather(B, 'cook', true); return sampleFig(B, 'cook', null, 6000, self); })(),
  ]);
  await shot(A, 'cook', bId, 'cook-watcher');
  await shot(B, 'cook', null, 'cook-own');
  judge(rec, 'cook, his own screen (the yardstick)', ownCook, ['skin', 'pants', 'shoes']);
  const pc = judge(rec, 'cook, ON THE WATCHER\'S SCREEN', peerCook, ['skin', 'pants', 'shoes']);
  rec.ok('...drawn from the figure baked for his colours, not the Watcher\'s own',
    pc.length > 0 && pc.every((s) => s.shared === false), pc.map((s) => [s.k, s.shared]));
  judgeVis(rec, 'cook', peerCook.vis);
  const cookMade = await A.page.evaluate(() => (window.__btStandIns ? window.__btStandIns().cook : null));
  rec.ok(`the Watcher did not make its own cook for his (it did, and kept it: ${cookMade && cookMade.state})`,
    !!cookMade && cookMade.state === 'idle', cookMade);
  const held1 = await A.page.evaluate(() => (window._pixiRenderer.peerFigBakes ? window._pixiRenderer.peerFigBakes() : { cook: -1, fire: -1, chop: -1 }));
  rec.ok(`the Watcher holds one cook in his colours (${held1.cook})`, held1.cook === 1, held1);

  /* ── 2. IN GREAVES: THE LEGLESS COOK, HIS SKIN ── */
  await gather(B, 'cook', false);
  await B.page.evaluate(() => { if (window.__btSetGear) window.__btSetGear('legs', 'steelgreaves'); });
  await B.page.waitForTimeout(2500);
  const [peerL] = await Promise.all([
    sampleFig(A, 'cook', bId, 8000, colours),
    gather(B, 'cook', true),
  ]);
  const pl = ok(peerL.frames);
  const plL = pl.filter((s) => s.legless);
  console.log(`    cook in greaves on the watcher's screen, per frame k:legless:theirs/mine/decisive: ${pl.map((s) => `${s.k}:${s.legless ? 1 : 0}:${s.theirs}/${s.mine}/${s.decisive}`).join(' ')}`);
  rec.ok('in greaves the Watcher draws him as the LEGLESS cook once it is baked (guard)', plL.length >= 3, pl.map((s) => [s.k, s.legless]));
  rec.ok('...every frame of it in his skin and none of the Watcher\'s, its outline the legless strip\'s',
    plL.length > 0 && plL.every((s) => s.decisive >= 300 && s.mine === 0 && s.theirs >= 0.97 * s.decisive && s.extraOpaque === 0),
    plL.map((s) => [s.k, s.theirs, s.mine, s.decisive, s.extraOpaque]));
  rec.ok('...and no frame before it in anything but his colours', pl.every((s) => s.mine === 0), pl.map((s) => [s.k, s.mine]));
  judgeVis(rec, 'cook in greaves', peerL.vis);
  await gather(B, 'cook', false);
  await B.page.evaluate(() => { if (window.__btSetGear) window.__btSetGear('legs', 'none'); });
  await B.page.waitForTimeout(1500);

  /* ── 3. THE GATHERER LIGHTS A FIRE ── */
  const [peerFire, ownFire] = await Promise.all([
    sampleFig(A, 'fire', bId, 7000, colours),
    (async () => { await gather(B, 'fire', true); return sampleFig(B, 'fire', null, 4000, self, SWEEP); })(),
  ]);
  await shot(A, 'fire', bId, 'fire-watcher');
  judge(rec, 'fire-lighter, his own screen (the yardstick)', ownFire, ['skin', 'pants', 'shoes']);
  /* two frames, not three: the light plays ONCE, eight frames in 536 ms from
     when his figure is first drawn, and nothing can sweep a peer's strip as
     SWEEP does your own -- with two pages open this box draws a few frames a
     second, so it caught 3 of the 8 on one run and 2 on the next.  Every frame
     it catches is still read whole (25,000-28,000 pixels each). */
  const pf = judge(rec, 'fire-lighter, ON THE WATCHER\'S SCREEN', peerFire, ['skin', 'pants', 'shoes'], 2);
  rec.ok('...drawn from the figure baked for his colours',
    pf.length > 0 && pf.every((s) => s.shared === false), pf.map((s) => [s.k, s.shared]));
  judgeVis(rec, 'fire-lighter', peerFire.vis);
  await gather(B, 'fire', false);

  /* ── 4. THE GATHERER CHOPS ── */
  const tree = await B.page.evaluate(() => {
    const S = window._gameState.current;
    return { x: S.player.x + 40, y: S.player.y };
  });
  await A.page.evaluate((t) => {   /* the Watcher knows the tree too: the peer faces the nearest one it holds */
    const S = window._gameState.current;
    S.gatherNodes = (S.gatherNodes || []).filter((g) => g && g.id !== 'qa_node_peercol_chop')
      .concat([{ id: 'qa_node_peercol_chop', nodeType: 'tree', x: t.x, y: t.y, alive: true, hp: 999, maxHp: 999, r: 40 }]);
  }, tree);
  const [peerChop, ownChop] = await Promise.all([
    sampleFig(A, 'chop', bId, 9000, colours),
    (async () => { await gather(B, 'chop', true); return sampleFig(B, 'chop', null, 6000, self); })(),
  ]);
  await shot(A, 'chop', bId, 'chop-watcher');
  judge(rec, 'lumberjack, his own screen (the yardstick)', ownChop, ['skin', 'pants', 'shoes']);
  const pj = judge(rec, 'lumberjack, ON THE WATCHER\'S SCREEN (it was the unpainted art)', peerChop, ['skin', 'pants', 'shoes']);
  rec.ok('...drawn from the figure baked for his colours',
    pj.length > 0 && pj.every((s) => s.shared === false), pj.map((s) => [s.k, s.shared]));
  judgeVis(rec, 'lumberjack', peerChop.vis);
  await gather(B, 'chop', false);

  /* ── 5. THE WATCHER IN HIS COLOURS, ITS OWN COOK MADE: THAT FIGURE IS HIS ── */
  await A.page.evaluate((g) => {
    if (window.__btSetSkin) { window.__btSetSkin(g.skin); window.__btSetPants(g.pants); window.__btSetShoes(g.shoes); }
  }, GATHERER);
  /* its own cook made now, as a campfire of its own would make it */
  await A.page.evaluate(() => (window.__btStandInMake ? window.__btStandInMake('cook') : null));
  const cookNow = await H.waitFor(A, () => window.__btStandIns && window.__btStandIns().cook,
    (v) => v && v.state === 'ready', { timeout: 30000, label: 'own cook' }).catch(() => null);
  rec.ok(`the Watcher's own cook is made, in his colours (guard: ${cookNow && cookNow.state})`, !!cookNow && cookNow.state === 'ready', cookNow);
  const before = await A.page.evaluate(() => (window._pixiRenderer.peerFigBakes ? window._pixiRenderer.peerFigBakes() : { cook: -1, fire: -1, chop: -1 }));
  const [peerSame] = await Promise.all([
    sampleFig(A, 'cook', bId, 9000, colours),
    gather(B, 'cook', true),
  ]);
  const ps = ok(peerSame.frames);
  console.log(`    same colours, per frame k:shared:theirs/mine/decisive: ${ps.map((s) => `${s.k}:${s.shared ? 1 : 0}:${s.theirs}/${s.mine}/${s.decisive}`).join(' ')}`);
  rec.ok('...and draws him from it (shared), in his colours, on EVERY frame',
    ps.length >= 3 && ps.every((s) => s.shared === true && s.mine === 0 && s.theirs >= 0.97 * s.decisive),
    ps.map((s) => [s.k, s.shared, s.theirs, s.decisive]));
  const after = await A.page.evaluate(() => (window._pixiRenderer.peerFigBakes ? window._pixiRenderer.peerFigBakes() : { cook: -1, fire: -1, chop: -1 }));
  rec.ok(`...with no second cook baked for him (${before.cook} -> ${after.cook})`, after.cook >= 0 && after.cook <= before.cook, { before, after });
  judgeVis(rec, 'cook in the Watcher\'s own figure', peerSame.vis);

  /* ── 6. LET GO WHEN HE STOPS ── */
  await gather(B, 'cook', false);
  await A.page.waitForTimeout(17000);
  const left = await A.page.evaluate(() => (window._pixiRenderer.peerFigBakes ? window._pixiRenderer.peerFigBakes() : { cook: -1, fire: -1, chop: -1 }));
  rec.ok(`every figure baked in his colours is let go of 15 s after he stops (${JSON.stringify(left)})`,
    left.cook === 0 && left.fire === 0 && left.chop === 0, left);

  /* ── 7. ONE ALLOWANCE FOR THEM ALL, 16 MB ──
     Filled straight (peerFigTry: a made-up skin a figure), as a crowd at the
     campfires would fill it.  Two fire-lighters (6.3 MB each) fit; a third
     does not while both were drawn this second, and takes the place of one
     once neither was; a cook is held to the same allowance, and takes a
     fire-lighter's place the same way.  Never past 16 MB. */
  const hasTry = await A.page.evaluate(() => typeof window._pixiRenderer.peerFigTry === 'function');
  rec.ok('the allowance can be driven (guard)', hasTry);
  if (hasTry) {
    const BUDGET = 16e6;
    const tryFig = (kind, n, age) => A.page.evaluate(([k, m, a]) => window._pixiRenderer.peerFigTry(k, m, a), [kind, n, age]);
    const figs = () => A.page.evaluate(() => ({ ...window._pixiRenderer.peerFigBakes(), baking: window._pixiRenderer.peerFigBaking() }));
    const settle = (label) => H.waitFor(A, () => window._pixiRenderer.peerFigBaking(), (v) => v === false, { timeout: 30000, label });
    const mb = (f) => (f.bytes / 1e6).toFixed(1);
    await tryFig('fire', 11, null); await settle('fire-lighter 1');
    await tryFig('fire', 12, 2000); await settle('fire-lighter 2');
    const two = await figs();
    rec.ok(`two fire-lighters fit (${two.fire}, ${mb(two)} MB)`, two.fire === 2 && two.bytes <= BUDGET, two);
    const third = await tryFig('fire', 13, 0);
    const wait3 = await figs();
    rec.ok(`a third, with both drawn this second, waits: nothing baked, nothing let go (${wait3.fire}, ${mb(wait3)} MB)`,
      third === false && !wait3.baking && wait3.fire === 2, wait3);
    await tryFig('fire', 13, 5000); await settle('fire-lighter 3');
    const swap = await figs();
    rec.ok(`...and once neither was drawn for a second, it takes the place of one (${swap.fire}, ${mb(swap)} MB)`,
      swap.fire === 2 && swap.bytes <= BUDGET, swap);
    const cook = await tryFig('cook', 14, 0);
    const waitC = await figs();
    rec.ok(`a cook is held to the same allowance: with both fire-lighters drawn this second it waits (${waitC.cook} cook, ${mb(waitC)} MB)`,
      cook === false && !waitC.baking && waitC.cook === 0 && waitC.fire === 2, waitC);
    await tryFig('cook', 14, 5000); await settle('cook');
    const mixed = await figs();
    rec.ok(`...and takes a fire-lighter's place once they were not (${mixed.cook} cook, ${mixed.fire} fire-lighter, ${mb(mixed)} MB)`,
      mixed.cook === 1 && mixed.fire === 1 && mixed.bytes <= BUDGET, mixed);
    await tryFig(null, 0, 20000);
    const gone = await H.waitFor(A, () => window._pixiRenderer.peerFigBakes(), (v) => v.cook === 0 && v.fire === 0,
      { timeout: 5000, label: 'the allowance let go of' }).catch((e) => ({ err: String(e) }));
    rec.ok('...and they are let go of like the rest once nobody draws them', gone.cook === 0 && gone.fire === 0 && gone.bytes === 0, gone);
  }

  for (const P of [A, B]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }
}
