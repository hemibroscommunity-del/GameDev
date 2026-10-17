/* ═══ v2.3.3310: LOADING A SAVED CHARACTER LANDS IN THE GAME, NOT ON A BIG MAP ═══
 *
 * The owner: "often loading from a saved character will show the game as an
 * enlarged minimap. You're forced to log back out and back in to fix it."
 *
 * What it was: the Wheel's minimap is cut to its box by a stencil mask
 * (wheelMinimap.js), and a WebGL context made with WebGL's own defaults has
 * no stencil buffer -- every mask then draws unclipped, and the minimap's
 * whole map (the lands' flat colours, the roads, a skull for every monster)
 * covers the screen.  Pixi asks for a stencil buffer, but a canvas's context
 * is made by whoever asks FIRST, and two things in the game asked the game's
 * canvas with no options at all: the crash report (crashTrap.js, its GPU
 * line), which goes 1.5 s after any boot with something in the crash log or
 * after any error, and the black-screen watchdog (BroTown.jsx).  The game's
 * canvas is up a moment before Pixi takes it (its first renderer loads its
 * library file first): a report in that moment took the canvas.  TRAPS §194.
 *
 * A real phone makes a character and comes back as a returning player does:
 * the page reloaded, Continue, the character's row -- the game then starts on
 * that same page (only a different character reloads).  The phone has
 * something in its crash log, as any phone that ever logged a tab switch
 * does, so the page sends it 1.5 s in.  Three ways:
 *   1. as it comes (BT_SAVEDLOAD_N loads, default 3);
 *   2. THE RACE MADE CERTAIN: Pixi's library file (its first renderer
 *      imports it, so it comes once the game's canvas is up) is held back,
 *      and an error in the page sends a crash report while the canvas waits
 *      for Pixi -- the owner's race, every time;
 *   3. THE SAFETY NET: the test itself takes the game canvas's context first,
 *      bare, once (anything that ever does again) -- the game must notice,
 *      say so in the crash log, and come up on a fresh canvas.
 * Each arrival is checked for what the owner saw: who made each game canvas's
 * WebGL context, whether the renderer's has its stencil buffer, and whether
 * the minimap draws anything outside its box (a frame with it and one without
 * it, compared away from the box).
 *
 *   node tools/qa/mp/run.mjs savedload
 */
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const N = Math.max(1, Number(process.env.BT_SAVEDLOAD_N) || 3);
const QA_ERR = 'qa-savedload: an error while the game loads';

/* Watching platform APIs, never replacing them: each game canvas's first WebGL
   request and what it asked for (Pixi always asks with its options, a stencil
   buffer among them -- a bare request is someone else's), and each crash
   report sent.  And for the safety net's test (way 3), the run's setting,
   read once on the next page: the game canvas's context taken first, bare,
   once. */
const init = () => {
  const own = HTMLCanvasElement.prototype.getContext;
  window.__btCtxLog = [];
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if ((type === 'webgl2' || type === 'webgl') && /brotown-canvas/.test(this.className || '') && !this.__btSeen) {
      this.__btSeen = true;
      this.__btIdx = window.__btCtxLog.length;
      let by = '';
      try { by = String(new Error().stack || '').split('\n').slice(2, 5).map((s) => s.trim()).join(' | '); } catch (e) { by = ''; }
      window.__btCtxLog.push({ type, attrs: attrs ? { stencil: attrs.stencil, depth: attrs.depth } : null, at: Math.round(performance.now()), by });
    }
    return own.apply(this, arguments);
  };
  window.__btCrashSends = [];
  try {
    const sb = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
    if (sb) navigator.sendBeacon = function (url, data) { if (/feedback\/crash/.test(String(url))) window.__btCrashSends.push(Math.round(performance.now())); return sb(url, data); };
  } catch (e) { /* none */ }
  let cfg = null;
  try { cfg = JSON.parse(sessionStorage.getItem('qa_savedload') || 'null'); sessionStorage.removeItem('qa_savedload'); } catch (e) { cfg = null; }
  if (!cfg || !cfg.steal) return;
  let done = false;
  const steal = (cv) => {
    if (done || !cv || !/brotown-canvas/.test(cv.className || '')) return;
    done = true;
    try { window.__qaStolen = !!cv.getContext('webgl2'); } catch (e) { window.__qaStolen = String(e); }
  };
  new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) {
      if (n && n.tagName === 'CANVAS') steal(n);
      else if (n && n.querySelectorAll) n.querySelectorAll('canvas').forEach(steal);
    }
  }).observe(document, { childList: true, subtree: true });
};

/* A past session's crash log: a routine entry, as a tab switch leaves */
const seedCrashLog = (P) => P.page.evaluate(() => {
  try { localStorage.setItem('bt-crashlog', JSON.stringify([{ t: new Date().toISOString(), kind: 'resume', msg: 'tab visible again' }])); } catch (e) { /* none */ }
});

/* Does the minimap draw outside its box?  The frame read in one animation
   frame, then drawn again with the minimap hidden and read again: with its
   mask working only the box can change.  `outside` counts the sampled points
   outside the box (and its shadow) that changed. */
const minimapSpill = (P) => P.page.evaluate(() => new Promise((done) => {
  const R = window._pixiRenderer;
  const app = R && R.app;
  const find = (c) => { if (!c) return null; if (c.label === 'wheel-minimap') return c; for (const k of c.children || []) { const f = find(k); if (f) return f; } return null; };
  const mini = app && find(app.stage);
  const cv = app && app.canvas;
  if (!mini || !cv || !mini.visible) { done({ error: 'no minimap shown' }); return; }
  const grab = () => {
    const c = document.createElement('canvas');
    c.width = 39; c.height = 84;
    const g = c.getContext('2d');
    g.drawImage(cv, 0, 0, 39, 84);
    return g.getImageData(0, 0, 39, 84).data;
  };
  const box = window.__btWheelMini;
  const rect = cv.getBoundingClientRect();
  const inBox = (sx, sy) => {
    if (!box) return false;
    const x = rect.left + (sx + 0.5) * rect.width / 39, y = rect.top + (sy + 0.5) * rect.height / 84;
    return x >= box.left - 8 && x <= box.left + box.w + 8 && y >= box.top - 8 && y <= box.top + box.h + 8;
  };
  requestAnimationFrame(() => {
    const a = grab();
    mini.visible = false;
    app.renderer.render({ container: app.stage });
    const b = grab();
    mini.visible = true;
    let outside = 0, inside = 0;
    for (let sy = 0; sy < 84; sy++) for (let sx = 0; sx < 39; sx++) {
      const o = (sy * 39 + sx) * 4;
      const d = Math.abs(a[o] - b[o]) + Math.abs(a[o + 1] - b[o + 1]) + Math.abs(a[o + 2] - b[o + 2]);
      if (d > 24) { if (inBox(sx, sy)) inside++; else outside++; }
    }
    done({ outside, inside });
  });
}));

const probe = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const r = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  const gl = r && r.gl;
  let attrs = null;
  try { attrs = gl && gl.getContextAttributes ? gl.getContextAttributes() : null; } catch (e) { attrs = null; }
  let ring = [];
  try { ring = JSON.parse(localStorage.getItem('bt-crashlog') || '[]').map((e) => e.kind); } catch (e) { ring = []; }
  const cv = r && r.gl && r.gl.canvas;
  return {
    zone: S ? S.currentZone : null,
    loading: !!(S && S._zoneLoading),
    trip: !!(S && S._spawnToWheel),
    stencil: attrs ? attrs.stencil : null,
    canvases: (window.__btCtxLog || []).slice(),
    rendererCanvas: cv && cv.__btIdx != null ? cv.__btIdx : null,
    reports: (window.__btCrashSends || []).slice(),
    noStencil: window.__btNoStencil || 0,
    stolen: window.__qaStolen === undefined ? null : window.__qaStolen,
    ring,
    worldMap: !!document.querySelector('[data-world-map]'),
  };
});

const arrive = async (P) => {
  let s = null;
  for (let k = 0; k < 120; k++) {
    s = await probe(P).catch(() => null);
    if (s && s.zone === 'wheel' && !s.loading && !s.trip) break;
    await P.page.waitForTimeout(500);
  }
  return s;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out/savedload');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Loader', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, init });
  const errs = [];
  P.page.on('pageerror', (e) => { const m = String(e && e.message || e); if (m.indexOf(QA_ERR) < 0) errs.push(m); });
  await H.enterWorld(P);
  const first = await arrive(P);
  rec.ok('the new character arrives in the Wheel (guard)', !!first && first.zone === 'wheel', first);

  /* ── Pixi's library file, held back while the canvas waits (way 2) ── */
  let hold = null;
  await P.page.route(/\/assets\/browserAll-[^/]+\.js(\?.*)?$/, async (route) => {
    const h = hold;
    if (!h) { await route.continue(); return; }
    hold = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 15000) {
      h.canvasUp = await P.page.evaluate(() => !!document.querySelector('canvas.brotown-canvas')).catch(() => false);
      if (h.canvasUp) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    h.before = await P.page.evaluate(() => (window.__btCrashSends || []).length).catch(() => 0);
    /* a page error while the game loads: crashTrap reports it 1.5 s on */
    await P.page.evaluate((msg) => { setTimeout(() => { throw new Error(msg); }, 0); }, QA_ERR).catch(() => {});
    const t1 = Date.now();
    while (Date.now() - t1 < 8000) {
      const n = await P.page.evaluate(() => (window.__btCrashSends || []).length).catch(() => 0);
      if (n > h.before) { h.reported = true; break; }
      await new Promise((r) => setTimeout(r, 100));
    }
    h.heldMs = Date.now() - t0;
    await route.continue();
  });

  const loadOnce = async (label, cfg) => {
    await seedCrashLog(P);
    await P.page.evaluate((c) => { try { sessionStorage.setItem('qa_savedload', JSON.stringify(c)); } catch (e) { /* none */ } }, cfg).catch(() => {});
    await P.page.reload();
    await H.enterWorld(P);
    const s = await arrive(P);
    await P.page.waitForTimeout(1500);
    const spill = await minimapSpill(P).catch((e) => ({ error: String(e) }));
    const end = await probe(P).catch(() => s);
    await P.page.screenshot({ path: join(OUT, `${label}.png`) }).catch(() => {});
    const made = (end && end.canvases || []).map((c, i) => `#${i} ${c.attrs ? 'Pixi ' + JSON.stringify(c.attrs) : 'BARE'} @${c.at}ms`).join(', ');
    console.log(`    ${label}: ${end && end.zone} stencil ${end && end.stencil} on canvas #${end && end.rendererCanvas}; canvases ${made}; reports @${(end && end.reports || []).join(',')}ms; noStencil ${end && end.noStencil}; spill ${JSON.stringify(spill)}`);
    for (const c of (end && end.canvases) || []) if (!c.attrs) console.log(`      bare request by: ${c.by}`);
    return { label, s: end, spill };
  };
  const good = (r) => !!r.s && r.s.zone === 'wheel' && r.s.stencil === true && !r.s.worldMap
    && !!r.spill && !r.spill.error && r.spill.outside === 0;

  /* 1. as it comes */
  const plain = [];
  for (let i = 0; i < N; i++) plain.push(await loadOnce(`plain${i}`, {}));
  const plainBad = plain.filter((r) => !good(r));
  rec.ok(`1. a saved character played from the list comes up with its stencil buffer and the minimap in its box (${plain.length - plainBad.length}/${plain.length})`,
    plainBad.length === 0, plainBad.map((r) => ({ label: r.label, s: r.s, spill: r.spill })));
  const plainBare = plain.filter((r) => r.s && (r.s.canvases || []).some((c) => !c.attrs));
  rec.ok(`1b. nothing but the renderer makes a game canvas's context (${plain.length - plainBare.length}/${plain.length})`,
    plainBare.length === 0, plainBare.map((r) => ({ label: r.label, canvases: r.s.canvases })));

  /* 2. the race made certain */
  hold = { canvasUp: false, reported: false };
  const h2 = hold;
  const race = await loadOnce('race', {});
  rec.ok('2a. the race was run: the game\'s canvas up and a crash report sent while Pixi waited for its file (setup)',
    h2.canvasUp && h2.reported, h2);
  rec.ok('2b. ...and the canvas\'s context is still the renderer\'s own: stencil buffer, minimap in its box',
    good(race) && (race.s.canvases || []).every((c) => !!c.attrs), { s: race.s, spill: race.spill });

  /* 3. the safety net */
  const net = await loadOnce('net', { steal: true });
  const ns = net.s || {};
  rec.ok('3a. the test took the canvas\'s context first, bare (setup)',
    ns.stolen === true && (ns.canvases || []).length >= 1 && !ns.canvases[0].attrs, { stolen: ns.stolen, canvases: ns.canvases });
  rec.ok('3b. the game noticed and said so in the crash log ("gl-no-stencil"), once',
    ns.noStencil === 1 && (ns.ring || []).indexOf('gl-no-stencil') >= 0, { noStencil: ns.noStencil, ring: ns.ring });
  rec.ok('3c. ...and came up on a fresh canvas whose context the renderer made: stencil buffer, minimap in its box',
    good(net) && ns.rendererCanvas != null && ns.rendererCanvas > 0 && !!(ns.canvases[ns.rendererCanvas] || {}).attrs,
    { s: ns, spill: net.spill });

  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.page.unroute(/\/assets\/browserAll-[^/]+\.js(\?.*)?$/).catch(() => {});
  await P.ctx.close().catch(() => {});
}
