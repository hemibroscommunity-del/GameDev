/* v2.3.1735: photograph the two owner FX sheets in the running game.
 *
 * The stun ring and the whirl vortex are both DURATION effects driven by
 * state the renderer reads each frame (m._stunUntil, S._whirlFx), so this
 * drives that state directly rather than casting — a real cast needs
 * character level 4/8, which QA cannot reach (mp-ability's header).  What is
 * being checked is the ART: does it load, is it the right size, is it in the
 * right place, does it animate.
 *
 * Run: node tools/qa/mp/shot-fx.mjs
 */
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';

const OUT = 'tools/qa/out/fx';
const CLIP = { x: 380, y: 150, width: 240, height: 240 };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const wsPort = await H.freePort(), webPort = await H.freePort();
  const worker = await H.startWorker(wsPort);
  const srv = await H.serveDist(webPort);
  const browser = await H.launch();
  const done = async () => {
    await browser.close().catch(() => {});
    try { srv.close(); } catch { /* best effort */ }
    await H.stopWorker(worker).catch(() => {});
  };
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 780 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
  await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
  const P = { ctx, page, logs: [], name: 'Dazed' };
  await H.enterWorld(P);
  await page.waitForTimeout(1500);

  /* Did the strips resolve at all?  A 404 leaves frames empty and every draw
     site silently no-ops — which looks identical to "the effect is broken". */
  const loaded = await page.evaluate(async () => {
    const probe = (u) => new Promise((res) => {
      const i = new Image(); i.onload = () => res({ ok: true, w: i.width, h: i.height });
      i.onerror = () => res({ ok: false }); i.src = u;
    });
    return {
      stars: await probe('/sprites/fx/stun-stars-v1.png?v=2.3.1735'),
      vortex: await probe('/sprites/fx/whirl-vortex-v1.png?v=2.3.1735'),
    };
  });
  console.log('strips:', JSON.stringify(loaded));

  /* ── STUN: park a monster next to the player and stun it ── */
  await page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return;
    S._serverMonsters = false;
    S.monsters = [{
      id: 'qa_stun_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: S.player.x + 46, y: S.player.y, renderX: S.player.x + 46, renderY: S.player.y,
      spawnX: S.player.x + 46, spawnY: S.player.y,
      hp: 500, curHp: 500, maxHp: 500, dmg: 0, level: 1, gold: 0,
      alive: true, statuses: {}, _stuckArrows: [], respawnAt: 0, moveTimer: 0,
      _atkCd: 0, _size: 24,
    }];
    clearInterval(window.__stunPin);
    window.__stunPin = setInterval(() => {
      const m = S.monsters[0]; if (m) m._stunUntil = Date.now() + 3000;
    }, 100);
  });
  /* Four shots across one full spin so the frames are visibly different. */
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(170);
    await page.screenshot({ path: `${OUT}/stun-${i}.png`, clip: CLIP });
  }
  console.log('shot: stun-0..3');
  /* CONTROL: same monster, stun cleared.  Anything still on screen after
     this belongs to the monster's own rendering, not to the star ring. */
  await page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    clearInterval(window.__stunPin);
    const m = S.monsters[0]; if (m) m._stunUntil = 0;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/stun-control-none.png`, clip: CLIP });
  console.log('shot: stun-control-none.png');
  await page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    window.__stunPin = setInterval(() => {
      const m = S.monsters[0]; if (m) m._stunUntil = Date.now() + 3000;
    }, 100);
  });
  await page.waitForTimeout(300);
  console.log('probe:', JSON.stringify(await page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const m = (S.monsters || [])[0] || {};
    return {
      player: { x: Math.round(S.player.x), y: Math.round(S.player.y) },
      monster: { renderX: m.renderX, renderY: m.renderY, x: m.x, y: m.y, _size: m._size, arch: m.archetype },
    };
  })));

  /* ── WHIRL: the vortex under the caster ── */
  await page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    clearInterval(window.__stunPin);
    S.monsters = [];
    clearInterval(window.__whirlPin);
    /* Re-stamp so the one-shot keeps replaying while we photograph it. */
    let n = 0;
    window.__whirlPin = setInterval(() => {
      S._whirlFx = { t0: Date.now() - (n % 5) * 100, x: S.player.x, y: S.player.y - 10, radius: 60 };
      n++;
    }, 120);
  });
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/whirl-${i}.png`, clip: CLIP });
  }
  console.log('shot: whirl-0..3');

  await page.evaluate(() => { clearInterval(window.__whirlPin); });
  await ctx.close().catch(() => {});
  await done();
}

main().catch((e) => { console.error(e); process.exit(1); });
