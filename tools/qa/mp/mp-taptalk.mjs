/* ═══ A TAP ON A TOWNSPERSON REACHES FURTHER (v2.3.3598) ═══
 *
 * The owner: "The tap to talk to npc characters requires you to be too close
 * to them."  A tap on him answered "Too far away!" past 90 world px (a step
 * and a half); it talks from up to NPC_TAP_REACH 300 now.
 *
 * In BroTown, on a phone, a fresh character and Mayor Bro (who has the first
 * quest for him):
 *   1. from 330-450 px away, a tap on him is still "far"
 *   2. from 150-260 px away -- "too close" was 90 -- a tap on him opens his
 *      quest
 *   3. no page errors
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const mayor = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
  const n = (S.npcs || []).find((q) => q.id === 'mayor_bro');
  if (!n || !S.camera) return null;
  return { d: Math.hypot(n.x - S.player.x, n.y - S.player.y),
    x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) - 26 };
});
/* walk with a key until his distance is inside [lo, hi] */
async function walkTo(P, key, lo, hi) {
  let m = await mayor(P);
  if (m && m.d >= lo && m.d <= hi) return m;
  await P.page.keyboard.down(key);
  for (let i = 0; i < 80; i++) {
    await P.page.waitForTimeout(60);
    m = await mayor(P);
    if (m && m.d >= lo && m.d <= hi) break;
  }
  await P.page.keyboard.up(key);
  await P.page.waitForTimeout(500);
  return mayor(P);
}
/* a tap on him, tried until the world's scan has run (mp-beastmaster's way) */
async function tapHim(P) {
  const t0 = Date.now();
  for (let k = 0; k < 3; k++) {
    const m = await mayor(P);
    if (!m) break;
    await P.page.touchscreen.tap(m.x, m.y);
    await P.page.waitForTimeout(300);
    const r = await P.page.evaluate((t) => { const x = window.__btNpcTap; return x && x.ts >= t - 50 ? x : null; }, t0);
    if (r) return r;
  }
  return null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Taptalk', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* ── 1 ── too far: south of him, so he stays on the screen */
  let m = await walkTo(P, 's', 330, 450);
  rec.ok(`1. you stand ${m && Math.round(m.d)} px from Mayor Bro (330-450)`, !!m && m.d >= 330 && m.d <= 450, m);
  let tap = await tapHim(P);
  rec.ok(`1b. ...a tap on him is still "far" (${tap && tap.result})`, !!tap && tap.npc === 'Mayor Bro' && tap.result === 'far', tap);

  /* ── 2 ── close enough now, though past the old 90 */
  m = await walkTo(P, 'w', 150, 260);
  rec.ok(`2. you stand ${m && Math.round(m.d)} px from him (150-260; the old reach was 90)`, !!m && m.d >= 150 && m.d <= 260, m);
  tap = await tapHim(P);
  rec.ok(`2b. ...a tap on him opens his quest (${tap && tap.result})`, !!tap && tap.npc === 'Mayor Bro' && tap.result === 'quest', tap);

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('3. no page errors', errs.length === 0, errs.slice(0, 3));
}
