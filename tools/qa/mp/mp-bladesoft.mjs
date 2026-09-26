/* v2.3.2927: THE BLADE AT THE BODY'S RESOLUTION.
 *
 * Owner: "The character body is also slightly softer lower res art so I'm
 * wondering if softening all the blade frames would look more natural ...
 * Try softening blade work now."  weaponSprites.js bakes each sword /
 * greatsword sheet down to the body's texel size and back up to its own size.
 *
 * One player with the bake (default) and one with ?bladesoft=0.  Checks, per
 * held facing:
 *   - the carried greatsword draws the soft bake by default, the sharp art
 *     with ?bladesoft=0 (the texture's label);
 *   - the bake keeps the art's pixel size (the grip anchors are in its pixels);
 * and saves idle E / SE / S and a south jog from both, side by side, for eyes
 * (tools/qa/mp/out/bladesoft/).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out/bladesoft`;
const GS = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };

const arm = (P) => P.page.evaluate((gs) => {
  const S = window._gameState.current;
  S.rpg.activeSlot = 'melee'; S.rpg.weapon = gs;
}, GS);

async function face(P, idx) {
  await P.page.evaluate((i) => {
    const S = window._gameState.current;
    S._facingAngle = i * Math.PI / 4; S._aimAngle = i * Math.PI / 4;
    S.lockedTarget = null; S.isSwinging = false; S.swingTimer = 0; S.autoAttack = false;
  }, idx);
  await P.page.waitForTimeout(280);
  await arm(P);
  await P.page.waitForTimeout(160);
  return P.page.evaluate(() => {
    const R = window._pixiRenderer, d = R && R.playerDisplayRaw();
    const w = d && d._weaponSprite, t = w && w.texture;
    return t ? { label: t.label || (t.source && t.source.label) || '', w: t.width, h: t.height, facing: window._gameState.current._renderFacing } : null;
  });
}

const boxOf = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, c = document.querySelector('canvas').getBoundingClientRect();
  const x = c.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y = c.top + (S.player.y - 30 - S.camera.y) * (S._worldScaleY || 1);
  return { x: Math.max(0, Math.round(x - 60)), y: Math.max(0, Math.round(y - 70)), width: 120, height: 110 };
});

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const seen = {};
  for (const [tag, query] of [['soft', ''], ['sharp', 'bladesoft=0'], ...(process.env.BLADESWEEP ? [['d1', 'bladesoft=1'], ['d3', 'bladesoft=3']] : [])]) {
    const P = await H.newPlayer(browser, { name: 'Blade', wsPort, webPort, viewport: { width: 390, height: 844 }, dpr: 3, query });
    await H.enterWorld(P);
    await P.page.waitForTimeout(3000);
    let first = null;
    for (let i = 0; i < 6 && !(first && first.w); i++) first = await face(P, 2);
    seen[tag] = {};
    for (const [i, n] of [[0, 'E'], [1, 'SE'], [2, 'S']]) {
      const m = await face(P, i);
      seen[tag][n] = m;
      await P.page.screenshot({ path: `${OUT}/${tag}-idle-${n}.png`, clip: await boxOf(P) }).catch(() => {});
    }
    /* a south jog, held in place (real keys; the loop owns vx/vy) */
    await P.page.evaluate(() => {
      const S = window._gameState.current, pin = { x: S.player.x, y: S.player.y };
      const _raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => _raf((ts) => { try { const Q = window._gameState.current; Q.player.x = pin.x; Q.player.y = pin.y; } catch (e) { /* frame first */ } cb(ts); });
      S._aimAngle = null;
    });
    await P.page.click('canvas', { position: { x: 5, y: 5 } }).catch(() => {});
    await P.page.keyboard.down('s');
    for (let t = 0; t < 4; t++) { await arm(P); await P.page.waitForTimeout(150); }
    await P.page.screenshot({ path: `${OUT}/${tag}-jog-S.png`, clip: await boxOf(P) }).catch(() => {});
    await P.page.keyboard.up('s');
    const thrown = P.logs.filter((l) => /pageerror|threw/.test(l));
    rec.ok(`${tag}: nothing threw`, thrown.length === 0, { thrown: thrown.slice(0, 3) });
    await P.ctx.close().catch(() => {});
  }
  for (const n of ['E', 'SE', 'S']) {
    const a = seen.soft[n], b = seen.sharp[n];
    rec.ok(`${n}: the carried greatsword draws the soft bake by default`, !!a && a.label === 'blade-soft', a);
    rec.ok(`${n}: ?bladesoft=0 draws the sharp art`, !!b && b.label !== 'blade-soft', b);
    rec.ok(`${n}: the bake keeps the art's pixel size (grip anchors live in it)`, !!a && !!b && a.w === b.w && a.h === b.h, { soft: a, sharp: b });
  }
}
