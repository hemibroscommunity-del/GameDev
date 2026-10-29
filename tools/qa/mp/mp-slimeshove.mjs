/* A SLIME'S BLAST BLOWS YOU BACK -- v2.3.3747 (server telegraph.js
 * SLIME_BURST.SHOVE, _blastShove; client elemHits.js applyHitShove).
 *
 * The owner, 2026-10-28: "if you take damage from a slime explosion I want
 * the character to be blown back a bit (moved back)".
 *
 * On a phone in the world: a real blue slime of the Verdant Wilds, the
 * player beside it, killed through the worker's own dev lever (a hit the
 * real way, so it swells and goes off as any kill makes it), and then:
 *   1. the blast's hit says `kb`, about 90 px, pointing AWAY from the slime;
 *   2. the player's place moved that way, about that far;
 *   3. the worker agrees where the player landed (its move check let it);
 *   4. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `slimeshove-${name}.png`) });
  /* every Wheel monster on the way in (`wheelwhole`), as mp-elemhits: the
     blue slimes are on the phone's list before going there */
  const P = await H.newPlayer(browser, { name: 'Blownback', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'wheelwhole' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);
  rec.ok(`setup: in the world (${zone})`, zone === 'wheel');
  /* real input on a loop: the page logs itself out after two minutes without
     it (wsClient idleLogout) */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  /* past the Mayor's gate, so the lands are open */
  await H.devOp(wsPort, 'quests', myId);
  await P.page.waitForTimeout(1200);

  let done = false;
  for (let attempt = 0; attempt < 4 && !done; attempt++) {
    await H.devOp(wsPort, 'vitals', myId, { heal: true });
    const target = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = (S.monsters || []).filter((x) => x && x.home === 'verdant' && x.alive !== false && x.hp > 0
        && (!x.variant || x.variant === 'blueSlime') && /fodder|slime/i.test(String(x.arch || x.type || '')))
        .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
      return m ? { id: m.id, x: m.x, y: m.y, variant: m.variant || null, arch: m.arch || null } : null;
    });
    if (!target) { rec.ok('a blue slime of the Earth Forest to meet', false); break; }
    await H.hopTo(P, target.x, target.y + 50, { step: 100, gap: 260, tries: 90 });
    /* beside it again (it chases), then kill it the real way */
    const m1 = await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const x = (S.monsters || []).find((q) => q.id === id);
      return x ? { x: x.x, y: x.y } : null;
    }, target.id);
    if (m1) await H.hopTo(P, m1.x + 30, m1.y + 45, { step: 60, gap: 200, tries: 6 });
    await H.devOp(wsPort, 'vitals', myId, { heal: true });
    const t0 = await P.page.evaluate(() => Date.now());
    const hurt = await H.devOp(wsPort, 'hurt', myId, { id: target.id, dmg: 1000000 });
    if (!hurt || !hurt.ok) { rec.ok(`attempt ${attempt}: the slime killed (${JSON.stringify(hurt)})`, false); continue; }
    /* where we stood as it swelled (it cannot move while it does) */
    await P.page.waitForTimeout(400);
    const before = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const svBefore = await H.serverPlayer(wsPort, myId).catch(() => null);
    /* the blast */
    let got = null, mid = false;
    for (let i = 0; i < 40 && !got; i++) {
      await P.page.waitForTimeout(150);
      got = await P.page.evaluate(({ t0, id }) => (window.__btElemLog || []).find((e) => e.at >= t0 && e.ability === 'burst' && e.monsterId === id) || null, { t0, id: target.id });
      if (got && !mid) { mid = true; await shot(P, 'mid'); }
    }
    if (!got || !(got.dmgTaken > 0)) {
      console.log(`    attempt ${attempt}: the blast missed us (${JSON.stringify(got)}); again`);
      continue;
    }
    done = true;
    const kb = got.kb;
    const kbLen = Array.isArray(kb) ? Math.hypot(kb[0], kb[1]) : 0;
    const out = { x: before.x - (m1 ? m1.x : target.x), y: before.y - (m1 ? m1.y : target.y) };
    rec.ok(`the blast blows you back: kb ${JSON.stringify(kb)} (${Math.round(kbLen)} px), away from the slime`,
      Math.abs(kbLen - 90) <= 3 && (kb[0] * out.x + kb[1] * out.y) > 0, { got, before, slime: m1 || target });
    /* walked out, then where we are on both sides */
    let cl = null, sv = null, off = null;
    for (let i = 0; i < 16; i++) {
      await P.page.waitForTimeout(250);
      cl = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, mid: !!S._gust }));
      sv = await H.serverPlayer(wsPort, myId).catch(() => null);
      off = sv && typeof sv.x === 'number' ? Math.hypot(sv.x - cl.x, sv.y - cl.y) : null;
      if (!cl.mid && off != null && off < 24) break;
    }
    await shot(P, 'after');
    const mv = { x: cl.x - before.x, y: cl.y - before.y };
    const along = Array.isArray(kb) && kbLen > 0 ? (mv.x * kb[0] + mv.y * kb[1]) / kbLen : 0;
    rec.ok(`your place moved that way: ${Math.round(along)} px along the shove (moved ${Math.round(mv.x)}, ${Math.round(mv.y)})`,
      along >= 60 && along <= 110, { before, cl, kb });
    rec.ok(`the worker agrees where you landed (${off == null ? '?' : Math.round(off)} px apart; it had you ${svBefore ? Math.round(Math.hypot(svBefore.x - before.x, svBefore.y - before.y)) : '?'} px from the phone before)`,
      off != null && off < 24, { cl, sv: sv && { x: sv.x, y: sv.y, z: sv.zone } });
  }
  if (!done) rec.ok('a blast that landed on us, in four tries', false);
  rec.ok('no page errors', errors.length === 0, errors);
  stopAlive = true;
  await P.ctx.close().catch(() => {});
}
