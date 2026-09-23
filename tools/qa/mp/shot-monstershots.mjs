/* v2.3.2732: photograph the monsters' goo and fire in the running game.
 *
 * mp-monstershots asserts what is drawn; this is for LOOKING at it.  Each
 * throw is filmed frame by frame with the DOM interface hidden (the buttons
 * and panels sit right where a ball flies past you on a phone), cropped round
 * the flight, and written as numbered frames into tools/qa/out/monstershots/,
 * one strip per throw:
 *
 *   town-green    a plain slime's green glob and a mire wisp's murky one
 *   verdant       a blue slime's glob beside a green slime's, where blue lives
 *   ember         a fire goblin's fireball, its burst and its scorch
 *
 * Run: node tools/qa/mp/shot-monstershots.mjs
 */
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';

const OUT = 'tools/qa/out/monstershots';

const hideUi = (P, on) => P.page.evaluate((on) => {
  const cv = document.querySelector('canvas');
  for (const el of document.body.querySelectorAll('*')) {
    if (el === cv || el.contains(cv)) continue;
    if (on) { if (el.dataset.qaHid == null) { el.dataset.qaHid = el.style.visibility || ''; el.style.visibility = 'hidden'; } }
    else if (el.dataset.qaHid != null) { el.style.visibility = el.dataset.qaHid; delete el.dataset.qaHid; }
  }
}, on);

/* throw balls through the real event path, adding stand-in throwers as needed */
const throwBalls = (P, balls) => P.page.evaluate((balls) => {
  const S = window._gameState.current;
  const added = [];
  for (const b of balls) {
    if (b.arch && !(S.monsters || []).some((m) => m && m.id === b.id)) {
      const m = { id: b.id, archetype: b.arch, type: b.arch, x: b.x, y: b.y, renderX: b.x, renderY: b.y, alive: true, hp: 1, curHp: 1, maxHp: 1, spd: 0, dmg: 0 };
      (S.monsters = S.monsters || []).push(m);
      added.push(m);
    }
  }
  for (const b of balls) {
    window.__btDispatch({ type: 'monster_projectile', payload: {
      monsterId: b.id, kind: 'slime', zone: S.currentZone, x: b.x, y: b.y, tx: b.tx, ty: b.ty, travelMs: b.ms || 2400 } });
  }
  S.monsters = (S.monsters || []).filter((m) => added.indexOf(m) < 0);
}, balls);

/* The landing is over in ~0.4 s and a headless page draws ~8 frames a second,
   so the effect is filmed in slow motion: window.__btShotFxRate slows the
   effect's own clock (the ball's flight is slowed by throwing it with a longer
   travelMs instead).  Nothing in the game sets it. */
async function film(P, name, box, frames = 34, gapMs = 40) {
  await P.page.evaluate(() => { window.__btShotFxRate = 0.3; });
  const c = await P.page.evaluate((b) => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    const k = S._worldScaleX || 1;
    return { x: r.left + (b.x0 - S.camera.x) * k, y: r.top + (b.y0 - S.camera.y) * (S._worldScaleY || 1), w: (b.x1 - b.x0) * k, h: (b.y1 - b.y0) * k };
  }, box);
  const clip = { x: Math.max(0, c.x), y: Math.max(0, c.y), width: c.w, height: c.h };
  for (let i = 0; i < frames; i++) {
    await P.page.screenshot({ path: `${OUT}/${name}-${String(i).padStart(2, '0')}.png`, clip }).catch(() => {});
    await P.page.waitForTimeout(gapMs);
  }
  await P.page.evaluate(() => { window.__btShotFxRate = 1; });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const wsPort = await H.freePort(), webPort = await H.freePort();
  const worker = await H.startWorker(wsPort);
  const srv = await H.serveDist(webPort);
  const browser = await H.launch();
  try {
    const P = await H.newPlayer(browser, { name: 'Lens', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
    await H.enterWorld(P);
    await P.page.waitForTimeout(2500);
    const pid = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', pid, { heal: true, god: true, godMinutes: 20 }).catch(() => null);

    /* town: from the player's west, across open cobbles */
    let me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    let T = { x: me.x - 40, y: me.y + 40 };
    await hideUi(P, true);
    await throwBalls(P, [
      { id: 'lens-green', arch: 'fodder', x: T.x - 170, y: T.y - 30, tx: T.x - 30, ty: T.y },
      { id: 'lens-wisp', arch: 'mireWisp', x: T.x - 170, y: T.y + 40, tx: T.x - 30, ty: T.y + 60 },
    ]);
    await film(P, 'town', { x0: T.x - 200, y0: T.y - 80, x1: T.x + 10, y1: T.y + 90 });

    for (const z of [{ label: 'Verdant Wilds', zoneId: 'verdant' }, { label: 'Flame Fields', zoneId: 'ember' }]) {
      await hideUi(P, false);
      await H.warpToZone(P, { wsPort, label: z.label, zoneId: z.zoneId });
      await H.devOp(wsPort, 'vitals', pid, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
      me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      T = { x: me.x - 40, y: me.y + 40 };
      await hideUi(P, true);
      if (z.zoneId === 'verdant') {
        await throwBalls(P, [
          { id: 'lens-blue', arch: 'blueSlime', x: T.x - 170, y: T.y - 30, tx: T.x - 30, ty: T.y },
          { id: 'lens-vgreen', arch: 'fodder', x: T.x - 170, y: T.y + 40, tx: T.x - 30, ty: T.y + 60 },
        ]);
      } else {
        const gob = await H.readState(P, (S) => {
          const m = (S.monsters || []).find((x) => x && x.alive && (x.archetype || x.type) === 'fireGoblin');
          return m ? m.id : null;
        });
        await throwBalls(P, [
          { id: gob || 'lens-gob', arch: gob ? null : 'fireGoblin', x: T.x - 170, y: T.y - 10, tx: T.x - 30, ty: T.y + 10 },
          { id: 'lens-gob2', arch: 'fireGoblin', x: T.x - 170, y: T.y + 60, tx: T.x - 30, ty: T.y + 45 },
        ]);
      }
      await film(P, z.zoneId, { x0: T.x - 200, y0: T.y - 80, x1: T.x + 10, y1: T.y + 90 });
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
