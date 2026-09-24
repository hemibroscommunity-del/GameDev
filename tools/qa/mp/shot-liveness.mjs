/* v2.3.2784: film the world's small motions, and the bag's, in the running game.
 *
 * mp-liveness asserts what moves; this is for WATCHING it.  A headless page
 * draws a few irregular frames a second, so a film shot on the wall clock
 * jerks.  So the world's motion clock is STEPPED: window.__btLifeFrames lets
 * worldLife advance exactly one step (__btLifeStep) per rendered frame and hold
 * still otherwise, and each film frame is one step.  The bag's CSS motions are
 * slowed through the DevTools animation clock instead.  Nothing in the game
 * sets any of these.
 *
 * Frames go to tools/qa/out/liveness/<name>-NN.png, the interface hidden:
 *   frost-pines   the pine pair and the snowy shrubs in the wind
 *   frost-chop    a gather tree swaying, then taking a chop
 *   forge         the chimney smoking and sparking, the smith's sign swinging
 *   auction       the big sign, the banner, the scales and the flag
 *   bank          the coin crate, the flags and the gold catching the light
 *   mayor         the flags and the waterfalls
 *   bag           a new item popping in, then items coming alive one by one
 *
 * Run: node tools/qa/mp/shot-liveness.mjs [bag] [frost] [town]   (default: all)
 */
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';

const OUT = 'tools/qa/out/liveness';

const hideUi = (P, on) => P.page.evaluate((on) => {
  const cv = document.querySelector('canvas');
  for (const el of document.body.querySelectorAll('*')) {
    if (el === cv || el.contains(cv)) continue;
    if (on) { if (el.dataset.qaHid == null) { el.dataset.qaHid = el.style.visibility || ''; el.style.visibility = 'hidden'; } }
    else if (el.dataset.qaHid != null) { el.style.visibility = el.dataset.qaHid; delete el.dataset.qaHid; }
  }
}, on);

/* a world-space box -> the screen clip */
const clipW = (P, b) => P.page.evaluate((b) => {
  const S = window._gameState.current;
  const cv = document.querySelector('canvas').getBoundingClientRect();
  const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
  const x = cv.left + (b.x0 - S.camera.x) * kx, y = cv.top + (b.y0 - S.camera.y) * ky;
  const x1 = cv.left + (b.x1 - S.camera.x) * kx, y1 = cv.top + (b.y1 - S.camera.y) * ky;
  const X = Math.max(0, x), Y = Math.max(0, y);
  return { x: X, y: Y, width: Math.max(8, Math.min(cv.right, x1) - X), height: Math.max(8, Math.min(cv.bottom, y1) - Y) };
}, b);

/* one step of the world's motion clock, then hold */
const step = (P) => P.page.evaluate(() => new Promise((res) => {
  window.__btLifeFrames = 1;
  const t0 = performance.now();
  const wait = () => (window.__btLifeFrames === 0 || performance.now() - t0 > 2000 ? res() : requestAnimationFrame(wait));
  requestAnimationFrame(wait);
}));

async function film(P, name, box, { frames = 48, dt = 1 / 15, before = null } = {}) {
  await P.page.evaluate((dt) => { window.__btLifeStep = dt; window.__btLifeFrames = 0; }, dt);
  const clip = await clipW(P, box);
  for (let i = 0; i < frames; i++) {
    if (before) await before(i);
    await step(P);
    await P.page.screenshot({ path: `${OUT}/${name}-${String(i).padStart(2, '0')}.png`, clip }).catch(() => {});
  }
  await P.page.evaluate(() => { delete window.__btLifeFrames; delete window.__btLifeStep; });
}

/* Walking past Mayor Bro opens his dialogue over the whole screen, and it
   re-opens on its own while you are near him -- so close it, and keep closing
   it, until the band can be unfolded and the bag is actually on screen. */
async function bagOnScreen(P) {
  for (let i = 0; i < 4; i++) {
    await H.closeNpcDialogue(P).catch(() => {});
    await H.unfoldBand(P).catch(() => {});
    await P.page.waitForTimeout(700);
    if (await P.page.evaluate(() => !!document.querySelector('[data-bag-key]'))) return true;
  }
  return false;
}

/* a texture-px box on a building -> a world box */
const onProp = (p, tw, th, r) => {
  const k = p.width / tw;
  return { x0: p.x + (r[0] - tw / 2) * k, y0: p.y - (th - r[1]) * k, x1: p.x + (r[2] - tw / 2) * k, y1: p.y - (th - r[3]) * k };
};

const WANT = process.argv.slice(2);
const want = (k) => !WANT.length || WANT.includes(k);

async function main() {
  mkdirSync(OUT, { recursive: true });
  const wsPort = await H.freePort(), webPort = await H.freePort();
  const worker = await H.startWorker(wsPort);
  const srv = await H.serveDist(webPort);
  const browser = await H.launch();
  try {
    const P = await H.newPlayer(browser, { name: 'Lens', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
    await H.enterWorld(P);
    await P.page.waitForTimeout(1500);
    const pid = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', pid, { heal: true, god: true, godMinutes: 30 }).catch(() => null);
    await P.page.evaluate(() => { window.__btAmbienceOff = false; });
    const props = await P.page.evaluate(() => window.__btWorldProps());
    const B = {}; for (const p of props) B[p.id] = p;
    const stand = async (id, dy) => { await H.hopTo(P, B[id].x, B[id].y + dy); await H.closeNpcDialogue(P).catch(() => {}); await P.page.waitForTimeout(2500); };

    /* ── the bag first, at the spawn: Mayor Bro's tutorial dialogue opens
       whenever you pass near him and covers the whole band, so this is shot
       before any walking.  The CSS clock is slowed 5x through DevTools. ── */
    if (want('bag')) {
    if (!await bagOnScreen(P)) console.log('bag: could not get the bag on screen');
    for (const k of ['fish_minnow', 'rare_gem', 'swiftDraught', 'wood_oak', 'cooked_fish_minnow']) {
      await H.grant(wsPort, pid, 'item', { invKey: k, count: 2 }).catch(() => {});
    }
    await P.page.waitForTimeout(2500);
    const cdp = await P.ctx.newCDPSession(P.page);
    await cdp.send('Animation.enable');
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.2 });
    const grid = await P.page.evaluate(() => {
      const t = document.querySelector('[data-bag-key]');
      const g = t && t.parentElement && t.parentElement.getBoundingClientRect();
      return g ? { x: g.left - 4, y: g.top - 4, width: g.width + 8, height: Math.min(g.height, 150) + 8 } : null;
    });
    if (grid) {
      const keys = ['i-fish_minnow', 'i-rare_gem', 'i-swiftDraught', 'i-cooked_fish_minnow'];
      for (let i = 0; i < 70; i++) {
        if (i === 2) await H.grant(wsPort, pid, 'item', { invKey: 'ore_copper', count: 1 }).catch(() => {});
        if (i >= 22 && (i - 22) % 12 === 0) await P.page.evaluate((k) => window.__btBagLife.poke(k), keys[((i - 22) / 12) % keys.length]);
        await P.page.screenshot({ path: `${OUT}/bag-${String(i).padStart(2, '0')}.png`, clip: grid }).catch(() => {});
      }
    }
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
    }

    /* ── frost ── */
    if (want('frost')) {
    for (const tool of ['woodcutting_axe']) await H.grant(wsPort, pid, 'item', { invKey: tool, count: 1 }).catch(() => {});
    await H.warpToZone(P, { wsPort, label: 'Frost Ridge', zoneId: 'frost' });
    await H.devOp(wsPort, 'vitals', pid, { heal: true, god: true, godMinutes: 30 }).catch(() => null);
    await P.page.evaluate(() => { window.__btAmbienceOff = false; });
    await H.hopTo(P, 470, 790); await P.page.waitForTimeout(2500);
    await hideUi(P, true);
    await film(P, 'frost-pines', { x0: 260, y0: 520, x1: 780, y1: 850 }, { frames: 60 });
    await hideUi(P, false);
    const tree = await H.readState(P, (S) => { const n = (S.gatherNodes || []).find((q) => q.alive && q.nodeType === 'tree'); return n ? { id: n.id, x: n.x, y: n.y } : null; });
    if (tree) {
      await H.hopTo(P, tree.x + 120, tree.y + 30); await P.page.waitForTimeout(2500);
      await hideUi(P, true);
      await film(P, 'frost-chop', { x0: tree.x - 100, y0: tree.y - 200, x1: tree.x + 100, y1: tree.y + 20 }, {
        frames: 45, dt: 1 / 30,
        before: (i) => (i === 12 ? P.page.evaluate((id) => {
          const n = window._gameState.current.gatherNodes.find((q) => q.id === id);
          if (n) { n._lifeChopAt = Date.now(); n._lifeChopDir = 1; }
        }, tree.id) : null),
      });
      await hideUi(P, false);
    }
    }

    /* ── back to town for the buildings (the interface is hidden while each
       one films, so a dialogue opening behind it does not matter) ── */
    if (want('town')) {
    if (want('frost')) await H.warpToZone(P, { wsPort, label: 'Town', zoneId: 'town' });
    await P.page.evaluate(() => { window.__btAmbienceOff = false; });
    await stand('forge', -260); await hideUi(P, true);
    await film(P, 'forge', onProp(B.forge, 512, 465, [40, -150, 512, 300]), { frames: 60 });
    await hideUi(P, false);
    await stand('auction-house', -280); await hideUi(P, true);
    await film(P, 'auction', onProp(B['auction-house'], 514, 512, [0, 0, 514, 360]), { frames: 60 });
    await hideUi(P, false);
    await stand('bank', -230); await hideUi(P, true);
    await film(P, 'bank', onProp(B.bank, 510, 512, [100, 0, 510, 300]), { frames: 60 });
    await hideUi(P, false);
    await stand('mayor-house', -260); await hideUi(P, true);
    await film(P, 'mayor', onProp(B['mayor-house'], 512, 512, [50, 0, 512, 410]), { frames: 60 });
    await hideUi(P, false);
    }
    await P.ctx.close().catch(() => {});
  } finally {
    await browser.close().catch(() => {});
    try { srv.close(); } catch { /* best effort */ }
    await H.stopWorker(worker).catch(() => {});
  }
  console.log('frames in ' + OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
