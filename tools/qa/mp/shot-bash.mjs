/* v2.3.1735: eyeball the Shield Bash pose in all four directions.
 *
 * Not an assertion scenario — a camera.  The owner's report was visual
 * ("it displays the sword special attack", "the effect is east"), and the
 * cast itself needs character level 4, which QA cannot reach (mp-ability's
 * header).  So this drives the POSE directly, which is exactly the state
 * castAbility stamps, and photographs the result.
 *
 * Run: node tools/qa/mp/shot-bash.mjs
 */
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';

const OUT = 'tools/qa/out/bash';
/* The avatar sits at the centre of the play viewport; these numbers are read
   off a full-viewport shot from this same harness (1000x780 window). */
const CLIP = { x: 424, y: 190, width: 152, height: 152 };

const DIRS = [
  ['east', 0],
  ['south', Math.PI / 2],
  ['west', Math.PI],
  ['north', -Math.PI / 2],
];

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
  process.on('uncaughtException', (e) => { console.error(e); done().then(() => process.exit(1)); });
  /* Our OWN context rather than H.newPlayer's: this needs a 3x device scale
     so the clipped avatar crop is legible, and the shared harness must stay
     at 1x (every assertion scenario's geometry is written against it). */
  const ctx = await browser.newContext({
    viewport: { width: 1000, height: 780 }, deviceScaleFactor: 3,
  });
  const page = await ctx.newPage();
  await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
  await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
  const P = { ctx, page, logs: [], name: 'Basher' };
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* The mayor's first quest hands out the shield (v2.3.1676) — the same
     route mp-block uses, because the pose is gated on R.shield actually
     being equipped (entityRenderer: you cannot raise a shield you lack). */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await H.waitFor(P, (S) => (S.rpg?.shieldStash || []).length, (n) => n > 0,
    { timeout: 20000, label: 'the quest shield arrives' }).catch(() => {});
  const gotShield = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg) return false;
    if (!S.rpg.shield && (S.rpg.shieldStash || []).length) S.rpg.shield = S.rpg.shieldStash.shift();
    return !!S.rpg.shield;
  });
  console.log(gotShield ? 'shield equipped' : 'NO SHIELD — the pose will not draw');

  for (const [name, ang] of DIRS) {
    /* Re-stamp every frame: the pose expires on its own (BASH_POSE_MS), and
       the point here is the steady state, not the decay. */
    await P.page.evaluate((a) => {
      const S = window._gameState && window._gameState.current;
      clearInterval(window.__bashPin);
      window.__bashPin = setInterval(() => {
        S._bashPose = { ang: a, t0: Date.now(), until: Date.now() + 500 };
      }, 16);
    }, ang);
    await P.page.waitForTimeout(900);
    await P.page.screenshot({ path: `${OUT}/bash-${name}.png` });
    /* Tight crop on the avatar — the shield is a 56px sprite held 16px off
       the body, which is unreadable in a full-viewport shot. */
    await P.page.screenshot({ path: `${OUT}/zoom-${name}.png`, clip: CLIP });
    console.log(`shot: bash-${name}.png + zoom-${name}.png`);
  }

  /* CONTROL: a REAL block at the same angles.  If the shield is invisible
     here too, the gap belongs to the existing shield renderer and not to the
     bash pose — the pose feeds the very same draw call. */
  for (const [name, ang] of DIRS) {
    await P.page.evaluate((a) => {
      const S = window._gameState && window._gameState.current;
      clearInterval(window.__bashPin);
      S._bashPose = null;
      window.__bashPin = setInterval(() => {
        S._shieldUp = true; S.shieldEnd = Date.now() + 500; S._shieldAngle = a;
      }, 16);
    }, ang);
    await P.page.waitForTimeout(700);
    await P.page.screenshot({ path: `${OUT}/zoom-block-${name}.png`, clip: CLIP });
    console.log(`shot: zoom-block-${name}.png (real block control)`);
  }
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    clearInterval(window.__bashPin);
    if (S) { S._shieldUp = false; S.shieldEnd = 0; S._shieldAngle = null; }
  });

  /* And the control: the ordinary melee SPECIAL, which is what bash used to
     borrow.  Side by side these two should look like different moves. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    clearInterval(window.__bashPin);
    S._bashPose = null;
    S.swingTimer = Date.now();
    S.isSwinging = true;
    S._specialAttack = true;
    S._swingAng = 0;
  });
  await P.page.waitForTimeout(160);
  await P.page.screenshot({ path: `${OUT}/control-sword-special.png` });
  await P.page.screenshot({ path: `${OUT}/zoom-control-sword-special.png`, clip: CLIP });
  console.log('shot: control-sword-special.png (+zoom)');

  await P.ctx.close().catch(() => {});
  await done();
}

main().catch((e) => { console.error(e); process.exit(1); });
