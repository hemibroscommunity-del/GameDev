/* ═══ THE GOO THAT HOLDS YOU IS THE SLIME'S BLUE (v2.3.3675) ═══
 *
 * The owner: "make the slime effect that keeps you stuck in position blue
 * since the slimes are blue (green slimes blend in too much with the green
 * scenery)".
 *
 * On a phone (390 x 844, 2x) in the world's BroTown, against a real worker:
 *   1. a slime's hold through the game's own handler (a monster_attack with
 *      `st: 'stuck'`, mp-elemhits' way): the bro is held;
 *   2. round his boots, the picture before the hold and during it: the goo's
 *      blues come in (the blue slime's #3a7ad0 and its shades), and none of
 *      the old goo's saturated greens do;
 *   3. the "Stuck" chip's words are the goo's light blue;
 *   4. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* the boots on screen, in CSS px */
const bootsAt = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const g = window.__btPlayerGround ? window.__btPlayerGround() : { x: S.player.x, y: S.player.y + 52 };
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { x: r.left + (g.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (g.y - S.camera.y) * (S._worldScaleY || 1), k: S._worldScaleX || 1 };
});

/* blue goo and green goo pixels in a box round the boots */
function count(buf) {
  const png = H.decodePng(buf);
  const ch = png.channels || Math.round(png.data.length / (png.width * png.height));
  let blue = 0, green = 0;
  for (let i = 0; i < png.data.length; i += ch) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    if (b > 140 && b > r + 50 && b > g + 15) blue++;
    if (g > 120 && g > r + 40 && g > b + 50) green++;
  }
  return { blue, green, px: png.width * png.height };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Gooey', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', init: 'window.__btProbe = true;' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    /* the quest card and the coach stay out of the picture */
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.waitForTimeout(1500);

    const b = await bootsAt(P);
    const clip = { x: Math.round(b.x - 50), y: Math.round(b.y - 30), width: 100, height: 46 };
    const before = await P.page.screenshot({ clip });
    /* 1. the hold, through the game's own handler */
    const held = await P.page.evaluate(() => {
      const S = window._gameState.current;
      window.__btDispatch({ type: 'monster_attack', payload: { monsterId: 'qa-goo', targetId: S.myId, dmg: 4, dmgTaken: 4, zone: S.currentZone,
        attackerX: S.player.x + 24, attackerY: S.player.y, ability: 'qa', elem: 'flora', st: 'stuck', stMs: 6000 } });
      return { left: (S._stuckUntil || 0) - Date.now() };
    });
    rec.ok(`1. a slime's hold through the game's own handler (${Math.round(held.left)} ms of it)`, held.left > 1000, held);
    await P.page.waitForTimeout(700);
    const during = await P.page.screenshot({ clip });
    await P.page.screenshot({ path: join(OUT, 'goohold-during.png'), clip: { x: Math.round(b.x - 90), y: Math.round(b.y - 120), width: 180, height: 150 } });
    const c0 = count(before), c1 = count(during);
    /* 2. the colours round the boots */
    rec.ok(`2. round the boots the goo's blue came in (${c0.blue} -> ${c1.blue} blue device px), and no green goo (${c0.green} -> ${c1.green} green)`,
      c1.blue - c0.blue >= 300 && c1.green - c0.green <= 20, { before: c0, during: c1, clip });
    /* 3. the chip */
    const chip = await H.waitFor(P, () => {
      const el = document.querySelector('[data-chip="Stuck"]');   /* ElemStatusChips.jsx: its icon and its seconds */
      return el ? getComputedStyle(el).color : null;
    }, (v) => !!v, { timeout: 5000, label: 'the Stuck chip' }).catch(() => null);
    rec.ok(`3. the "Stuck" chip's words are the goo's light blue (${chip})`, chip === 'rgb(140, 196, 255)', chip);
    rec.ok('4. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
