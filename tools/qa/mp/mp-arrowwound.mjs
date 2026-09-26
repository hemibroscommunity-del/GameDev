/* v2.3.2929b: ARROW HIT SITES -- THE MONSTER'S OWN ART, A TORN HOLE, A FINE KEYLINE.
 *
 * Owner: "Run the same treatment over arrow hit sites.  Small pixel outline
 * kinda how you fixed the zig zag."  (arrowWound.js drawArrowWound / Lip.)
 *
 * A few real arrows into a pinned monster of each material (slime, rock,
 * skeleton, snowman, fire goblin), then a close picture of the stuck shafts
 * and their wounds at phone density (tools/qa/mp/out/arrowwound/) for eyes.
 * Checks the arrows really stuck (the stuck-arrow baker has something live)
 * and that nothing threw.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out/arrowwound`;
const MATS = [
  { key: 'slime',    arch: 'fodder', variant: null,          zone: null },
  { key: 'rock',     arch: 'brute',  variant: 'rockmonster', zone: 'hollows' },
  { key: 'skeleton', arch: 'fodder', variant: 'skeleton',    zone: 'sky' },
  { key: 'snowman',  arch: 'snowman', variant: null,         zone: 'frost' },
  { key: 'goblin',   arch: 'fodder', variant: 'fireGoblin',  zone: 'ember' },
];

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 3 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  for (const z of [...new Set(MATS.map((m) => m.zone).filter(Boolean))]) {
    await P.page.evaluate((z) => window._gameFns.preloadZoneArt(z), z).catch(() => {});
  }
  await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
  await P.page.waitForTimeout(600);
  let anyLive = false;
  const pinLog = [];
  for (const mat of MATS) {
    await P.page.evaluate((mat) => {
      const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
      const pine = (F.WOODWORKING_TIERS || {}).pine;
      R.rangedWeapon = { type: 'bow', tierMult: pine ? pine.tierMult : 1, gearBase: 'pine', name: 'QA Bow', tier: 'common' };
      R.activeSlot = 'ranged'; R.hp = R.maxHp = 9000;
      S.arrows = []; S._debrisBursts = [];
      const m = F.createMonster('aw-' + mat.key + '-' + Date.now(), mat.arch, 2, S.player.x + 120, S.player.y + 2, null);
      if (mat.variant) { m.archetype = mat.variant; m.type = mat.variant; }
      m._qaSpd = m.spd; m._qaSpeed = m.speed;
      m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12; m._transformStart = 1;
      S.monsters = [m];
      S.lockedTarget = { ref: m, type: 'monster', src: 'tap', ts: Date.now() };
      S._facingAngle = 0; S._aimAngle = 0; S._lastAimAngle = 0; S._facing = 'right';
      S.autoAttack = true;
    }, mat);
    await P.page.waitForTimeout(3200);
    await P.page.evaluate(() => { window._gameState.current.autoAttack = false; });
    await P.page.waitForTimeout(700);
    const probe = await P.page.evaluate(() => (window.__btArrowBake ? window.__btArrowBake() : null)).catch(() => null);
    if (probe && probe.live > 0) anyLive = true;
    /* v2.3.2930: every stuck arrow is pinned onto the ART of the frame on
       screen, and the pins ride the animation (sampled over a second) */
    const samples = [];
    for (let t = 0; t < 8; t++) {
      samples.push(await P.page.evaluate(() => window.__btArrowPins(window._gameState.current)));
      await P.page.waitForTimeout(140);
    }
    const last = samples[samples.length - 1] || [];
    const pinned = last.filter((p) => p.pinned !== false);
    const offArt = samples.flat().filter((p) => p.pinned !== false && !p.onArt);
    const frames = new Set(samples.flat().map((p) => p.tex)).size;
    const moved = new Set(samples.flat().map((p) => p.u + ',' + p.v)).size > (last.length || 1);
    console.log(`    ${mat.key}: ${last.length} arrows, ${pinned.length} pinned, ${offArt.length} samples off the art, ${frames} frames seen, pins moved: ${moved}`);
    rec.ok(`${mat.key}: every stuck arrow is pinned to the sprite`, last.length > 0 && pinned.length === last.length, { n: last.length, pinned: pinned.length });
    rec.ok(`${mat.key}: ...on opaque art in the frame on screen (never an invisible spot)`, offArt.length === 0, { off: offArt.slice(0, 3) });
    /* ...and while it WALKS (a still monster may not animate at all): let it
       come at you for a moment, sampling the pins and taking pictures */
    await P.page.evaluate(() => {
      const S = window._gameState.current, m = S.monsters && S.monsters[0];
      if (m) { m.spd = m._qaSpd || 1.2; m.speed = m._qaSpeed || m.spd; S.player.x -= 90; }
    });
    const walk = [];
    for (let t = 0; t < 10; t++) {
      await P.page.waitForTimeout(120);
      walk.push(await P.page.evaluate(() => window.__btArrowPins(window._gameState.current)));
      if (mat.key === 'skeleton' && t % 2 === 0) {
        const b2 = await P.page.evaluate(() => {
          const S = window._gameState.current, m = S.monsters && S.monsters[0];
          if (!m || !S.camera) return null;
          const c = document.querySelector('canvas').getBoundingClientRect();
          const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
          const x = (typeof m.renderX === 'number' ? m.renderX : m.x), y = (typeof m.renderY === 'number' ? m.renderY : m.y);
          const cx = c.left + (x - S.camera.x) * kx, cy = c.top + (y - 30 - S.camera.y) * ky;
          return { x: Math.max(0, Math.round(cx - 55)), y: Math.max(0, Math.round(cy - 85)), width: 110, height: 120 };
        });
        if (b2) await P.page.screenshot({ path: `${OUT}/skeleton-walk-${t / 2}.png`, clip: b2 }).catch((e) => console.log('    shot failed', String(e).slice(0, 120)));
      }
    }
    const wOff = walk.flat().filter((p) => p.pinned !== false && !p.onArt);
    const wFrames = new Set(walk.flat().map((p) => p.tex)).size;
    const wMoved = new Set(walk.flat().map((p) => p.u + ',' + p.v)).size > ((walk[0] || []).length || 1);
    console.log(`    ${mat.key} walking: ${wFrames} frames seen, ${wOff.length} samples off the art, pins moved: ${wMoved}`);
    rec.ok(`${mat.key}: walking, the pins stay on the art`, wOff.length === 0, { off: wOff.slice(0, 3) });
    pinLog.push({ key: mat.key, frames: Math.max(frames, wFrames), moved: moved || wMoved });
    const box = await P.page.evaluate(() => {
      const S = window._gameState.current, m = S.monsters && S.monsters[0];
      if (!m || !S.camera) return null;
      const c = document.querySelector('canvas').getBoundingClientRect();
      const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
      const cx = c.left + (m.x - S.camera.x) * kx, cy = c.top + (m.y - 30 - S.camera.y) * ky;
      return { x: Math.max(0, Math.round(cx - 55)), y: Math.max(0, Math.round(cy - 50)), width: 110, height: 90 };
    });
    if (box) await P.page.screenshot({ path: `${OUT}/${mat.key}.png`, clip: box }).catch(() => {});
    console.log(`    ${mat.key}: baker ${JSON.stringify(probe)}`);
    await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; S.lockedTarget = null; });
    await P.page.waitForTimeout(300);
  }
  rec.ok('on a monster that animates, the pins move with the art (they ride the frames)',
    pinLog.some((p) => p.frames > 1 && p.moved), pinLog);
  rec.ok('arrows stuck and were baked at the monster\'s texel size (guard: the pictures show wounds)', anyLive);
  const thrown = P.logs.filter((l) => /pageerror|threw/.test(l));
  rec.ok('nothing threw', thrown.length === 0, { thrown: thrown.slice(0, 3) });
  await P.ctx.close().catch(() => {});
}
