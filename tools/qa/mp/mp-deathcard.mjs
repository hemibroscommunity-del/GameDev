/* ═══ v2.3.3817: A DEATH SAYS WHAT HAPPENED (game/deathCard.js) ═══
 *
 * A judge's pass on a computer: a level-1 bro died in the first quest's slimes
 * and "just reappeared in BroTown"; no capture showed a death.  Now a card
 * over the scene for the five seconds to the worker's respawn -- "You died",
 * what killed you, "Back in BroTown in N" -- and a line in the chat once back.
 *
 * On an upright phone and on a computer (the sideways layout, `wide`), each
 * walks to the Flame Fields' goblins at 1 HP (devtools.js _devVitals, as
 * mp-gpuaudit's death) and dies to one, and:
 *   1. the card comes: "You died" and "Killed by <the goblin's name>";
 *   2. it counts down ("Back in BroTown in N", N falling);
 *   3. it never takes a tap or a click: the point at its middle is the game's,
 *      not the card's;
 *   4. it goes with the respawn, and the chat says what happened, once;
 * with a picture of each for eyes (tools/qa/mp/out/deathcard-*.png).
 */
import * as H from './harness.mjs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { WHEEL_SPAWNS } = await import(H.REPO + ((await H.wheelGeom()).long === 1 ? '/server/src/wheelspawns1.js' : '/server/src/wheelspawns.js'));
  for (const cfg of [{ key: 'phone', viewport: PHONE, touch: true }, { key: 'computer', wide: true }]) {
    const P = await H.newPlayer(browser, { name: cfg.key === 'phone' ? 'Faller' : 'Desker', wsPort, webPort, world: 'wheel',
      viewport: cfg.viewport, touch: !!cfg.touch, wide: !!cfg.wide, guest: cfg.key !== 'phone' });
    let stopAlive = () => {};
    try {
      await H.enterWorld(P);
      stopAlive = H.keepAlive(P, 15000);
      const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
        { timeout: 150000, label: cfg.key + ' into the world' }).catch(() => null);
      rec.ok(`${cfg.key}: in the world (guard)`, !!inW, inW);
      if (!inW) continue;
      const myId = await H.readState(P, (S) => S.myId);
      /* the card and the chat, watched by the page itself every 150 ms: the
         loop below looks only between hops, seconds apart on this box */
      await P.page.evaluate(() => {
        const W = window.__qaCard = { seen: [], gone: null, dyingAt: null, line: null };
        clearInterval(window.__qaCardTimer);
        window.__qaCardTimer = setInterval(() => {
          const S = window._gameState && window._gameState.current;
          if (!S) return;
          if (S._dying && W.dyingAt == null) W.dyingAt = Date.now();
          const v = window.__btDeathCard ? window.__btDeathCard() : null;
          if (v && (!W.seen.length || W.seen[W.seen.length - 1].secs !== v.secs)) W.seen.push({ ...v, t: Date.now() });
          if (W.seen.length && !v && W.gone == null) W.gone = { t: Date.now(), dying: !!S._dying };
          if (W.gone && !W.line) {
            const l = (S.chatLog || []).filter((c) => c && /came back in BroTown/.test(c.text || ''));
            if (l.length) W.line = { text: l[l.length - 1].text, n: l.length };
          }
        }, 150);
      });
      const gob = WHEEL_SPAWNS.ember.points[0];
      await H.hopTo(P, gob[0], gob[1] + 40, { tries: 120 });
      let shot = false, mid = null, lowAt = 0;
      const t0 = Date.now();
      while (Date.now() - t0 < 150000) {
        if (Date.now() - lowAt > 15000) { await H.devOp(wsPort, 'vitals', myId, { heal: false, hp: 1 }).catch(() => {}); lowAt = Date.now(); }
        const s = await P.page.evaluate(() => {
          const S = window._gameState.current, W = window.__qaCard;
          const card = document.querySelector('[data-death-card] > div');
          let mid = null;
          if (card) {
            const r = card.getBoundingClientRect();
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            mid = { box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], hitsCard: !!(top && top.closest && top.closest('[data-death-card]')), pe: getComputedStyle(card.parentElement).pointerEvents };
          }
          const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
          let best = null, bd = Infinity;
          for (const m of live) { const d = Math.hypot(m.x - S.player.x, m.y - S.player.y); if (d < bd) { bd = d; best = m; } }
          return { card: !!card, mid, done: !!(W.gone && W.line), dying: !!S._dying || W.dyingAt != null, best: best ? { x: best.x, y: best.y, d: bd } : null };
        });
        if (s.card && !shot) { await P.page.screenshot({ path: join(OUT, `deathcard-${cfg.key}.png`) }).catch(() => {}); shot = true; mid = s.mid; }
        if (s.done) break;
        if (s.dying) { await P.page.waitForTimeout(300); continue; }
        if (s.best) await H.hopTo(P, s.best.x + 10, s.best.y, { tries: s.best.d > 150 ? 20 : 2, step: 80 });
        else await P.page.waitForTimeout(400);
      }
      await P.page.waitForTimeout(1500);
      const W = await P.page.evaluate(() => { clearInterval(window.__qaCardTimer); return window.__qaCard; });
      console.log(`    ${cfg.key}: ` + JSON.stringify({ seen: W.seen.map((v) => [v.by, v.back]), gone: W.gone, line: W.line, mid }));
      const first = W.seen[0];
      rec.ok(`1. ${cfg.key}: the card comes -- "${first && first.title}", "${first && first.by}"`,
        !!first && first.title === 'You died' && /^Killed by .+/.test(first.by || '') && !/a monster$/.test(first.by || ''), first);
      const secs = W.seen.map((v) => v.secs);
      rec.ok(`2. ${cfg.key}: it counts down to BroTown (${secs.join(', ')})`,
        secs.length >= 2 && secs.every((n, i) => i === 0 || n < secs[i - 1]) && secs[0] >= 3 && /^Back in BroTown in \d$/.test(first && first.back), secs);
      rec.ok(`3. ${cfg.key}: it never takes a tap or a click (pointer-events ${mid && mid.pe}, its middle is the game's)`,
        !!mid && mid.pe === 'none' && !mid.hitsCard, mid);
      rec.ok(`4. ${cfg.key}: it goes with the respawn, and the chat says it once ("${W.line && W.line.text}")`,
        !!W.gone && !W.gone.dying && !!W.line && W.line.n === 1 && /^You were killed by .+, and came back in BroTown\.$/.test(W.line.text), { gone: W.gone, line: W.line });
    } finally {
      stopAlive();
      await P.ctx.close().catch(() => {});
    }
  }
}
