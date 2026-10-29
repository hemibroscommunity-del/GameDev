/* ═══ v2.3.3825: NO MAN'S LAND EXPLAINED BEFORE YOU STEP IN, ONCE ═══
 * (game/nmlExplainOnce.js, ui/mobile/NmlBadge.jsx)
 *
 * A judge died reading No man's land's explainer among the first quest's
 * slimes.  On an upright phone:
 *   1. walking out of BroTown toward the first quest's slimes, the explainer
 *      comes up BY ITSELF on the safe ground, before the line (No man's land
 *      0 where you stand), with its lead line;
 *   2. closed, it does not come again: back and forth by the line, nothing;
 *   3. the character is remembered as told (the browser's store, by its id);
 *   4. opened in a fight (the skull pill in the top bar, among the Flame
 *      Fields goblins), the first hit you take closes it;
 * with pictures of 1 and 4 for eyes (tools/qa/mp/out/nmlonce-*.png).
 */
import * as H from './harness.mjs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const long = (await H.wheelGeom()).long;
  const { WHEEL_SPAWNS } = await import(H.REPO + (long === 1 ? '/server/src/wheelspawns1.js' : '/server/src/wheelspawns.js'));
  const { NML_CENTRES } = await import(H.REPO + '/src/data/noMansLandRings.js');
  const { nmlLineR } = await import(H.REPO + '/src/game/nmlExplainOnce.js');
  const P = await H.newPlayer(browser, { name: 'Reader', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  let stopAlive = () => {};
  try {
    await H.enterWorld(P);
    stopAlive = H.keepAlive(P, 15000);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 150000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    const first = await H.readState(P, (S) => ((S._serverCaps && S._serverCaps.nmlnear === true) ? 1 : 2));
    await P.page.evaluate(() => { if (window.__btNmlOnce) window.__btNmlOnce.forget(); });
    /* the line toward the first quest's slimes (the Earth Forest's anchor), on the plan's rings */
    const C = NML_CENTRES[long] || NML_CENTRES[1], A = WHEEL_SPAWNS.verdant.anchor || WHEEL_SPAWNS.verdant.points[0];
    const dx = A[0] - C[0], dy = A[1] - C[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    const R = nmlLineR(long, first);
    const at = (r) => [C[0] + ux * r, C[1] + uy * r];
    const popup = () => P.page.evaluate(() => {
      const c = window.__btInfoPopup && window.__btInfoPopup.current();
      const lead = document.querySelector('[data-nml-lead]');
      const S = window._gameState.current;
      return { open: !!c, nml: !!(c && c.nml), title: c && c.title, lead: lead ? lead.textContent : null,
        hp: S.rpg && S.rpg.hp, x: Math.round(S.player.x), y: Math.round(S.player.y) };
    });
    const nmlHereNow = () => P.page.evaluate(() => { const b = window.__btNmlBadge && window.__btNmlBadge(); return b ? b.lvl : 0; });

    /* ── 1. walking out, it comes up before the line ── */
    const [mx, my] = at(R - 600);
    await H.hopTo(P, mx, my, { tries: 200 });
    const before = await popup();
    let seen = null;
    for (let r = R - 600; r <= R - 120 && !(seen && seen.open); r += 60) {
      const [x, y] = at(r);
      await H.hopTo(P, x, y, { tries: 10, step: 60 });
      await P.page.waitForTimeout(700);
      seen = await popup();
      if (seen.open) seen.lvl = await nmlHereNow();
    }
    if (seen && seen.open) await P.page.screenshot({ path: join(OUT, 'nmlonce-1-at-the-line.png') }).catch(() => {});
    rec.ok(`1. walking out of BroTown, the explainer comes up by itself on the safe ground before the line ("${seen && seen.lead}")`,
      !before.open && !!seen && seen.open && seen.nml && /No man's land/.test(seen.lead || '') && !seen.lvl, { before, seen, R });

    /* ── 2. closed, it does not come again ── */
    await P.page.evaluate(() => window.__btInfoPopup && window.__btInfoPopup.close());
    let again = false;
    for (const r of [R - 300, R - 60, R - 250, R - 40, R - 200]) {
      const [x, y] = at(r);
      await H.hopTo(P, x, y, { tries: 10, step: 60 });
      await P.page.waitForTimeout(800);
      if ((await popup()).open) again = true;
    }
    rec.ok('2. closed, it does not come again: back and forth by the line, nothing', !again);

    /* ── 3. remembered for this character ── */
    const told = await P.page.evaluate((id) => { try { return localStorage.getItem('bt_nml_told_' + id); } catch (e) { return 'no store'; } }, myId);
    rec.ok(`3. the character is remembered as told (${told})`, told === '1', told);

    /* ── 4. opened in a fight, a hit closes it ── */
    await P.page.evaluate(() => { const R2 = window._gameState.current.rpg; R2._quests = R2._quests || {}; R2._quests.tut_1 = true; });
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: false }).catch(() => {});
    const gob = WHEEL_SPAWNS.ember.points[0];
    await H.hopTo(P, gob[0], gob[1] + 40, { tries: 300 });
    let opened = null, closed = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 90000 && !closed) {
      const s = await popup();
      if (!s.open) {
        if (opened) { closed = { after: Date.now() - opened.t, hp: s.hp, hpAtOpen: opened.hp }; break; }
        await P.page.evaluate(() => { const b = document.querySelector('[data-nml-badge]'); if (b) b.click(); });
        await P.page.waitForTimeout(300);
        const o = await popup();
        if (o.open && o.nml) {
          opened = { t: Date.now(), hp: o.hp };
          await P.page.screenshot({ path: join(OUT, 'nmlonce-4-in-a-fight.png') }).catch(() => {});
        } else {
          /* closer to the nearest goblin */
          const m = await P.page.evaluate(() => {
            const S = window._gameState.current;
            const ms = (S.monsters || []).filter((q) => q && q.alive !== false && (q.curHp == null || q.curHp > 0)).sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
            return ms[0] ? { x: ms[0].x, y: ms[0].y } : null;
          });
          if (m) await H.hopTo(P, m.x + 10, m.y, { tries: 10, step: 80 });
        }
      } else {
        if (!opened) opened = { t: Date.now(), hp: s.hp };
        await P.page.waitForTimeout(250);
      }
    }
    rec.ok(`4. opened in a fight, the first hit closes it (HP ${closed && closed.hpAtOpen} -> ${closed && closed.hp}, ${closed && closed.after} ms)`,
      !!opened && !!closed && typeof closed.hp === 'number' && closed.hp < closed.hpAtOpen, { opened, closed });
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
