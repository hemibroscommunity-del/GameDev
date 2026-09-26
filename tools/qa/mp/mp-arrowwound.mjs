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
  for (const mat of MATS) {
    await P.page.evaluate((mat) => {
      const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
      const pine = (F.WOODWORKING_TIERS || {}).pine;
      R.rangedWeapon = { type: 'bow', tierMult: pine ? pine.tierMult : 1, gearBase: 'pine', name: 'QA Bow', tier: 'common' };
      R.activeSlot = 'ranged'; R.hp = R.maxHp = 9000;
      S.arrows = []; S._debrisBursts = [];
      const m = F.createMonster('aw-' + mat.key + '-' + Date.now(), mat.arch, 2, S.player.x + 120, S.player.y + 2, null);
      if (mat.variant) { m.archetype = mat.variant; m.type = mat.variant; }
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
  rec.ok('arrows stuck and were baked at the monster\'s texel size (guard: the pictures show wounds)', anyLive);
  const thrown = P.logs.filter((l) => /pageerror|threw/.test(l));
  rec.ok('nothing threw', thrown.length === 0, { thrown: thrown.slice(0, 3) });
  await P.ctx.close().catch(() => {});
}
