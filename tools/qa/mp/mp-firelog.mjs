/* ═══ v2.3.3660: THE FIRE-LIGHTER'S LOG IS WOOD ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants of
 * either a body beneath or areas for cleanup".  mp-ghostaudit's fire-lighter
 * lit his fire on a hot pink log: firemaking-strip.webp holds the pipeline's
 * magenta KEY for the log, and it was never given its material
 * (effectsRenderer _fireLogToBark).  This lights fires on three pages in the
 * world and reads every frame of the fire-lighter as the renderer holds it,
 * against the same frame of the shipped strip:
 *
 *   - PINK, in pink trousers and blue boots: no key colour on any of the eight
 *     frames, the log there in bark, and every pixel the FILE does not key the
 *     same as on BEFORE -- so the trousers keep their pink (pink sits in the
 *     key's hue window: the bake works from the file's key, not the canvas's);
 *   - BEFORE, the same colours with `?firelog=0`: the log is magenta, so the
 *     test can see the fault;
 *   - WATCHER, in the default colours, near Pink: Pink's fire-lighter, baked on
 *     the watcher's screen in Pink's colours (_peerFigFrames), has no key colour
 *     either.
 */
import * as H from './harness.mjs';

import { FIRE_STRIP_V } from '../../../src/data/fireStrip.js';
const FIRE_URL = `/sprites/skills/firemaking-strip.webp?v=${FIRE_STRIP_V}`;   /* the URL the game loads (v2.3.3666: the strip's own version) */
const FW = 384, FH = 512, FRAMES = 8;

const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-pants', 'pink');
  localStorage.setItem('bt-shoes', 'blue');
} catch (e) {}
/* the fire-lighter's frames are read back off their canvases, which are let
   go of once on the GPU (effectsRenderer _gpuOnly); this keeps them */
window.__btTrimVerify = true;`;
const PLAIN = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}
window.__btTrimVerify = true;`;

/* Your own light, swept through its frames (mp-fireink's): restarted every
   animation frame a little further along, the end out of reach so no campfire
   is lit. */
const SWEEP = `const now = performance.now();
  const dt = window.__qaFireLast ? Math.min(1000, now - window.__qaFireLast) : 16;
  window.__qaFireLast = now;
  const u = (now / 2) % 530;
  S._campfire = null;
  S._firemaking = { x: S.player.x, y: S.player.y + 6, startedAt: Date.now() - u + dt, doneAt: Date.now() + 600000 };`;

/* Every distinct frame of a fire-lighter (`pid` null = your own) as the
   renderer holds it, for up to `ms` or until all eight were read: its key
   pixels, the log's pixels in bark, and a hash of every pixel the shipped
   strip does not key. */
const readFrames = (P, pid, ms, poke) => P.page.evaluate(async ({ pid, dur, poke, url, FW, FH, FRAMES }) => {
  const R = window._pixiRenderer;
  const pokeFn = poke ? new Function('S', poke) : null;
  const sheet = window.__qaFireSheet || (window.__qaFireSheet = await new Promise((res) => {
    const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url;
  }));
  if (!sheet) return { err: 'the shipped strip did not load' };
  /* toolRecolor.js isToolKey, word for word */
  const isKey = (d, o) => {
    if (d[o + 3] < 77) return false;
    const r = d[o], g = d[o + 1], b = d[o + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 46) return false;
    const dd = mx - mn;
    if (dd < mx * 0.4) return false;
    let h;
    if (mx === r) h = 60 * (((g - b) / dd) % 6); else if (mx === g) h = 60 * ((b - r) / dd + 2); else h = 60 * ((r - g) / dd + 4);
    if (h < 0) h += 360;
    return h >= 315 && h <= 350;
  };
  /* v2.3.3684: toolRecolor.js isLitToolKey -- the log's end in the fire's
     glow (frames 4-7), made wood with the log when within 4 px of its key
     (effectsRenderer _litLogKey) */
  const isLit = (d, o) => {
    if (d[o + 3] < 77) return false;
    const r = d[o], g = d[o + 1], b = d[o + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 140 || mx !== r) return false;
    const dd = mx - mn;
    if (dd < mx * 0.5) return false;
    let h = 60 * (((g - b) / dd) % 6);
    if (h < 0) h += 360;
    return h > 350 || h <= 8;
  };
  const litLog = (raw) => {
    const m = new Uint8Array(FW * FH);
    for (let p = 0; p < FW * FH; p++) {
      if (isKey(raw, p * 4) || !isLit(raw, p * 4)) continue;
      const x = p % FW, y = (p - x) / FW;
      let near = false;
      for (let yy = Math.max(0, y - 4); yy <= Math.min(FH - 1, y + 4) && !near; yy++) {
        for (let xx = Math.max(0, x - 4); xx <= Math.min(FW - 1, x + 4); xx++) if (isKey(raw, (yy * FW + xx) * 4)) { near = true; break; }
      }
      if (near) m[p] = 1;
    }
    return m;
  };
  const lits = {};
  /* the bark ramp's family: warm browns, red over green over blue */
  const isBark = (d, o) => d[o + 3] > 60 && d[o] >= d[o + 1] && d[o + 1] >= d[o + 2] && d[o] - d[o + 2] >= 15 && d[o] <= 200;
  const blit = (res, sx, sy, sw, sh, dx, dy) => {
    const c = document.createElement('canvas'); c.width = FW; c.height = FH;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(res, sx, sy, sw, sh, dx, dy, sw, sh);
    const out = g.getImageData(0, 0, FW, FH).data;
    c.width = 0; c.height = 0;
    return out;
  };
  const raws = {};
  const rawOf = (k) => raws[k] || (raws[k] = blit(sheet, k * FW, 0, FW, FH, 0, 0));
  const measure = (sp) => {
    const tex = sp.texture, src = tex && tex.source && tex.source.resource;
    if (!src || !src.width) return { err: 'no readable texture' };
    const k = sp._fireK;
    if (typeof k !== 'number' || k < 0 || k >= FRAMES) return { err: 'no frame index' };
    const f = tex.frame, orig = tex.orig || f, trim = tex.trim || null;
    if (Math.round(orig.width) !== FW || Math.round(orig.height) !== FH) return { err: `frame ${orig.width}x${orig.height}` };
    const got = blit(src, f.x, f.y, f.width, f.height, trim ? trim.x : 0, trim ? trim.y : 0);
    const raw = rawOf(k);
    /* `key`: the log's own pixels still in the key -- only where the FILE has
       it, as a pink trouser is in the key's hue window too (the first run
       counted Pink's trousers) */
    let key = 0, fileKey = 0, bark = 0, h = 2166136261 >>> 0;
    const lit = lits[k] || (lits[k] = litLog(raw));
    for (let o = 0; o < got.length; o += 4) {
      if (lit[o >> 2]) continue;   /* v2.3.3684: the log's lit end, wood on one page only */
      if (isKey(raw, o)) {
        fileKey++;
        if (isKey(got, o)) key++;
        if (isBark(got, o)) bark++;
        continue;
      }
      for (let c = 0; c < 4; c++) { h ^= got[o + c]; h = Math.imul(h, 16777619) >>> 0; }
    }
    return { k, key, fileKey, bark, hash: h.toString(16) };
  };
  const byK = {};
  const seen = new Set();
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      try { if (pokeFn && S && S.player) pokeFn(S); } catch (e) { /* the light holds or it does not */ }
      const pair = R && R.fireSpriteRaw ? R.fireSpriteRaw(pid) : null;
      const sp = pair && pair.body;
      if (sp && sp.visible && sp.texture && !seen.has(sp.texture.uid)) {
        seen.add(sp.texture.uid);
        const m = measure(sp);
        if (!m.err && !byK[m.k]) byK[m.k] = m;
      }
      if (Object.keys(byK).length >= FRAMES || performance.now() - t0 >= dur) done(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  if (pokeFn) { const S = window._gameState.current; S._firemaking = null; S._campfire = null; }
  return { byK, log: window.__btFireLog ? window.__btFireLog() : null };
}, { pid: pid || null, dur: ms, poke: poke || null, url: FIRE_URL, FW, FH, FRAMES });

/* A light held and relit now and then, so a watcher's copy plays its frames
   (mp-fireink's relightLoop) */
const relightLoop = (P, until) => P.page.evaluate((ms) => {
  const end = Date.now() + ms;
  const gen = (window.__qaRelightGen = (window.__qaRelightGen || 0) + 1);
  const step = (on) => {
    if (window.__qaRelightGen !== gen) return;
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return;
    if (Date.now() > end) { S._firemaking = null; return; }
    S._campfire = null;
    S._firemaking = on ? { x: S.player.x, y: S.player.y + 6, startedAt: Date.now(), doneAt: Date.now() + 600000 } : null;
    setTimeout(() => step(!on), on ? 1600 : 700);
  };
  step(true);
}, until);

const settle = async (P, wsPort) => {
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id).catch(() => {});
  await P.page.waitForTimeout(800);
  await H.closeNpcDialogue(P).catch(() => {});
  return id;
};
const ready = (P) => H.waitFor(P, () => window.__btStandIns && window.__btStandIns().fire, (v) => v && v.state === 'ready',
  { timeout: 40000, label: 'the fire-lighter made' }).catch(() => null);
const fmt = (byK, f) => Array.from({ length: FRAMES }, (_, k) => (byK[k] ? f(byK[k]) : '-')).join(' ');

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  const Pk = await H.newPlayer(browser, { name: 'Pink', wsPort, webPort, dpr: 2, init: LOOK, world: 'wheel' });
  opened.push(Pk);
  /* not guests: a guest's page reloads into '?guest=1' on the way in and
     loses `firelog=0` (the first run's Before made its log wood); every player
     has a browser context of its own, so each is its own character anyway */
  const Bf = await H.newPlayer(browser, { name: 'Before', wsPort, webPort, dpr: 2, init: LOOK, world: 'wheel', query: 'firelog=0' });
  opened.push(Bf);
  const Wt = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, dpr: 2, init: PLAIN, world: 'wheel' });
  opened.push(Wt);
  const errs = [];
  const CAST = [[Pk, 'Pink'], [Bf, 'Before'], [Wt, 'Watcher']];
  for (const [P, who] of CAST) P.page.on('pageerror', (e) => errs.push(who + ': ' + String(e && e.message || e)));
  for (const [P] of CAST) await H.enterWorld(P);
  const inW = [];
  for (const [P, who] of CAST) {
    inW.push(await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 90000, label: who + ' in the world' }).then(() => true).catch(() => false));
  }
  rec.ok('three players in the world (guard)', inW.every(Boolean), inW);
  if (!inW.every(Boolean)) return;
  const pinkId = await settle(Pk, wsPort);
  await settle(Bf, wsPort);
  await settle(Wt, wsPort);

  /* ── Pink's own fire-lighter, and Before's ── */
  for (const P of [Pk, Bf]) {
    P.page.evaluate(() => { const S = window._gameState.current; S._campfire = null; S._firemaking = { x: S.player.x, y: S.player.y + 6, startedAt: Date.now(), doneAt: Date.now() + 600000 }; }).catch(() => {});
  }
  const made = [await ready(Pk), await ready(Bf)];
  rec.ok('the fire-lighter made on both pages (guard)', made.every(Boolean), made);
  if (!made.every(Boolean)) return;
  const pink = await readFrames(Pk, null, 45000, SWEEP);
  const before = await readFrames(Bf, null, 45000, SWEEP);
  const pK = (pink && pink.byK) || {}, bK = (before && before.byK) || {};
  console.log(`    Pink:   key ${fmt(pK, (m) => m.key)} | bark ${fmt(pK, (m) => m.bark + '/' + m.fileKey)} | ${JSON.stringify(pink && pink.log)}`);
  console.log(`    Before: key ${fmt(bK, (m) => m.key)} | ${JSON.stringify(before && before.log)}`);
  const pN = Object.keys(pK).length, bN = Object.keys(bK).length;
  rec.ok(`Pink: all eight frames of the fire-lighter read (${pN}) (guard)`, pN === FRAMES, pink && pink.err);
  rec.ok(`Before: all eight frames read (${bN}) (guard)`, bN === FRAMES, before && before.err);
  if (pN !== FRAMES || bN !== FRAMES) return;
  const pinkKey = Object.values(pK).map((m) => m.key);
  rec.ok(`Pink: no magenta key left on any frame (${pinkKey.join(' ')})`, pinkKey.every((n) => n === 0), pinkKey);
  const barkShare = Object.values(pK).map((m) => (m.fileKey ? m.bark / m.fileKey : 0));
  rec.ok(`Pink: the log is there, in bark, on every frame (${barkShare.map((s) => Math.round(s * 100) + '%').join(' ')})`,
    barkShare.every((s) => s >= 0.9), barkShare);
  const befKey = Object.values(bK).map((m) => m.key);
  rec.ok(`Before (?firelog=0): the log is magenta, so the test can see it (${befKey.join(' ')})`,
    Object.values(bK).every((m) => m.key >= 5000 && m.key >= 0.9 * m.fileKey), befKey);
  const same = Array.from({ length: FRAMES }, (_, k) => pK[k].hash === bK[k].hash);
  rec.ok(`only the log changed: every pixel the file does not key is the same on both pages, the pink trousers too (${same.filter(Boolean).length} of ${FRAMES} frames)`,
    same.every(Boolean), same);
  rec.ok(`__btFireLog: Pink made ${pink.log && pink.log.wood} px wood, Before none`,
    !!(pink.log && pink.log.on && pink.log.wood > 50000 && before.log && before.log.on === false), { pink: pink.log, before: before.log });

  /* ── Pink's light on the watcher's screen, baked there in Pink's colours ──
     the two in sight of each other first (mp-firepeer), Pink a step aside */
  await H.waitMutualSight(Wt, Pk).catch(() => {});
  await Pk.page.evaluate(() => { const S = window._gameState.current; if (S && S.player) S.player.x += 70; });
  await Pk.page.waitForTimeout(1500);
  await relightLoop(Pk, 60000);
  const peer = await readFrames(Wt, pinkId, 50000, null);
  await Pk.page.evaluate(() => { window.__qaRelightGen = (window.__qaRelightGen || 0) + 1; const S = window._gameState.current; S._firemaking = null; S._campfire = null; });
  const wK = (peer && peer.byK) || {};
  const wN = Object.keys(wK).length;
  console.log(`    Watcher, Pink's light: key ${fmt(wK, (m) => m.key)} | bark ${fmt(wK, (m) => m.bark + '/' + m.fileKey)}`);
  const seenBy = wN >= 2 ? null : await Wt.page.evaluate((pid) => {
    const S = window._gameState.current, o = S.others && S.others[pid], R = window._pixiRenderer;
    return { seen: !!o, ex: o ? (o._ex || null) : null, probe: R && R.remoteSkillProbe ? R.remoteSkillProbe(pid) : null,
      fire: window.__btStandIns ? window.__btStandIns().fire : null };
  }, pinkId).catch((e) => String(e));
  rec.ok(`Watcher: Pink's fire-lighter read on ${wN} frame(s) (guard)`, wN >= 2, seenBy || (peer && peer.err));
  const wKey = Object.values(wK).map((m) => m.key);
  rec.ok(`Watcher: no magenta key on Pink's fire-lighter either (${wKey.join(' ')})`, wN >= 2 && wKey.every((n) => n === 0), wKey);
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
}
