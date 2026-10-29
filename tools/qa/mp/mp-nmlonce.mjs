/* ═══ v2.3.3825: NO MAN'S LAND EXPLAINED BEFORE YOU STEP IN, ONCE ═══
 * (game/nmlExplainOnce.js, ui/mobile/NmlBadge.jsx)
 *
 * A judge died reading No man's land's explainer among the first quest's
 * slimes.  v2.3.3853: and then the owner, before the showing: "just get rid
 * of the no man's land gigantic warning message. I'd rather not have
 * anything" -- so the explainer no longer comes up by itself at all.  On an
 * upright phone:
 *   1. walking out of BroTown toward the first quest's slimes and on over the
 *      line, NOTHING comes up: no explainer, no "No man's land" banner;
 *   4. opened in a fight (the skull pill in the top bar, among the Flame
 *      Fields goblins), the first hit you take closes it;
 * with a picture of 4 for eyes (tools/qa/mp/out/nmlonce-4-in-a-fight.png).
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
  const P = await H.newPlayer(browser, { name: 'Reader', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, nmlOnce: true });   /* the harness holds it back elsewhere */
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

    /* ── 1. v2.3.3853: walking out and over the line, nothing comes up ── */
    const banners = () => P.page.evaluate(() => { const zb = window.__btZoneBanner; let n = 0; for (let k = 1; zb && zb.shownAt && k <= 200; k++) if (zb.shownAt('nml-' + k) > 0) n++; return n; });
    /* past the Mayor gate (a new character stays in town until it has spoken to him) */
    await P.page.evaluate(() => { const R2 = window._gameState.current.rpg; R2._quests = R2._quests || {}; R2._quests.tut_1 = true; });
    const [mx, my] = at(R - 600);
    await H.hopTo(P, mx, my, { tries: 200 });
    let came = null, crossed = 0;
    for (let r = R - 600; r <= R + 300; r += 60) {
      const [x, y] = at(r);
      await H.hopTo(P, x, y, { tries: 10, step: 60 });
      await P.page.waitForTimeout(700);
      const s1 = await popup();
      if (s1.open && !came) came = s1;
      if (!crossed) crossed = await nmlHereNow();
    }
    await P.page.waitForTimeout(2500);   /* past the badge's dwell, when the banner played */
    const nb = await banners();
    rec.ok(`1. walking out of BroTown and over the line (No man's land ${crossed} reached), nothing comes up: no explainer (${came ? came.title : 'none'}), no banner (${nb})`,
      crossed > 0 && !came && nb === 0, { came, crossed, nb, R });

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
