/* ═══ "TOO FAR AWAY" OVER A RESOURCE TAPPED FROM AFAR (v2.3.3990) ═══
 *
 * The owner, 2026-11-02: "There needs to be a message that you're too far
 * away if you can't mine and are tapping on the ore.  Too far away message
 * should also be with any resource."
 *
 * In the Wheel's commons, a copper vein:
 *   1. a phone (upright, touch): a real tap on the vein from a few strides off
 *      floats "Too far away" over it and starts nothing; a second tap at once
 *      floats no second word (once a second a resource);
 *   2. walked up to it, the same tap starts mining (the reach is unchanged);
 *   3. a computer (wide, a mouse): a click on a vein out of reach reads
 *      "Too far away: walk closer".
 */
import * as H from './harness.mjs';

const STAND = [0, -70];   /* mp-deskharvest's spot by a vein */
const FAR = [0, 300];     /* a few strides south of it: on screen, out of reach */

async function nearestVein(P) {
  return P.page.evaluate(() => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== 'oreVein' || !n.alive || (n.gatherLvl || 1) !== 1) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
    }
    return best;
  });
}

/* the middle of the vein's picture, in the page's px */
const veinAt = (P, id) => P.page.evaluate((nid) => {
  const S = window._gameState.current;
  const n = (S.gatherNodes || []).find((g) => g.id === nid);
  const cv = document.querySelector('canvas.brotown-canvas');
  if (!n || !cv) return null;
  const rc = cv.getBoundingClientRect();
  const sp = n._pixiSprite;
  let wx = n.x, wy = n.y - 30;
  if (sp && !sp.destroyed && sp.height > 2) { wx = sp.x; wy = sp.y - sp.height * (sp.anchor ? sp.anchor.y : 1) + sp.height / 2; }
  return { x: rc.left + (wx - S.camera.x) * (S._worldScaleX || 1), y: rc.top + (wy - S.camera.y) * (S._worldScaleY || 1) };
}, id);

const words = (P) => H.readState(P, (S) => (S.dmgNumbers || []).filter((d) => /^Too far away/.test(String(d.text)) && d.ts > 0).map((d) => d.text));

async function arrive(P, wsPort) {
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
    (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 150000, label: 'into the Wheel, its nodes in' }).catch(() => null);
  await H.grant(wsPort, myId, 'item', { invKey: 'mining_pickaxe', count: 1 }).catch(() => {});
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
  await H.waitFor(P, (S) => ((S.rpg || {}).inventory || {}).mining_pickaxe > 0, (v) => v, { timeout: 20000, label: 'the pickaxe' }).catch(() => false);
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  /* a monster under the finger wins the tap: the review is of the rock */
  await P.page.evaluate(() => { const S = window._gameState.current; S._monstersStash = S.monsters; S.monsters = []; });
  return { myId, inW };
}

async function goTo(P, x, y) {
  await H.hopTo(P, x, y);
  await P.page.waitForTimeout(1500);
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; });
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ═══ 1-2. A PHONE ═══ */
  const P = await H.newPlayer(browser, { name: 'Farhand', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = H.keepAlive(P, 15000);
  try {
    const { inW } = await arrive(P, wsPort);
    rec.ok('a phone is in the Wheel with a pickaxe (guard)', !!inW, inW);
    const node = await nearestVein(P);
    await goTo(P, node.x + FAR[0], node.y + FAR[1]);
    const at = await veinAt(P, node.id);
    await P.page.evaluate(() => { window.__btTooFar = null; });
    await P.page.touchscreen.tap(at.x, at.y);
    await P.page.waitForTimeout(500);
    const r1 = await H.readState(P, (S) => ({ ex: S._extraction ? S._extraction.skill : null, far: window.__btTooFar }));
    const w1 = await words(P);
    rec.ok(`1. a tap on a vein from ${FAR[1]} px off floats "Too far away" over it and starts nothing`,
      !!r1.far && r1.far.kind === 'oreVein' && r1.far.id === node.id && r1.ex == null && w1.includes('Too far away'), { r1, w1, at });
    await P.page.touchscreen.tap(at.x, at.y);
    await P.page.waitForTimeout(150);
    const w2 = await words(P);
    rec.ok('1. a second tap at once floats no second word (once a second a resource)', w2.length === w1.length, { w1, w2 });

    await goTo(P, node.x + STAND[0], node.y + STAND[1]);
    const near = await veinAt(P, node.id);
    await P.page.touchscreen.tap(near.x, near.y);
    const ex = await H.waitFor(P, (S) => (S._extraction ? S._extraction.skill : null), (v) => v === 'mining', { timeout: 8000, label: 'mining starts' }).catch(() => null);
    rec.ok('2. walked up to it, the same tap starts mining', ex === 'mining', { ex, near });
    await P.page.evaluate(() => { const S = window._gameState.current; S._extraction = null; });
    rec.ok('the phone: no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    stop();
    await P.ctx.close().catch(() => {});
  }

  /* ═══ 3. A COMPUTER ═══ */
  const D = await H.newPlayer(browser, { name: 'Fardesk', wsPort, webPort, viewport: { width: 1280, height: 800 }, world: 'wheel', wide: true });
  const derr = [];
  D.page.on('pageerror', (e) => derr.push(String((e && e.message) || e).slice(0, 200)));
  const stopD = H.keepAlive(D, 15000);
  try {
    await arrive(D, wsPort);
    const node = await nearestVein(D);
    await goTo(D, node.x + FAR[0], node.y + FAR[1]);
    const at = await veinAt(D, node.id);
    await D.page.evaluate(() => { window.__btTooFar = null; });
    await D.page.mouse.click(at.x, at.y);
    await D.page.waitForTimeout(500);
    const r = await D.page.evaluate(() => window.__btTooFar);
    const w = await words(D);
    rec.ok('3. a computer\'s click on a vein out of reach reads "Too far away: walk closer"', !!r && r.kind === 'oreVein' && w.includes('Too far away: walk closer'), { r, w, at });
    rec.ok('the computer: no page errors', derr.length === 0, derr.slice(0, 4));
  } finally {
    stopD();
    await D.ctx.close().catch(() => {});
  }
}
