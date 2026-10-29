/* ═══ v2.3.3872: A NEW QUEST STAR, SHOWN ═══
 *
 * The owner, playtesting: "they miss the star on the minimap pointing them
 * where to go. Maybe you can make a giant star appear above the minimap and
 * shrink down ... each time there's a new star?" (ui/starCue.js, called by
 * the Wheel's minimap).  On a phone held upright, then sideways, and on a
 * computer (wide):
 *   1. a new character's first star (Mayor Bro) plays the cue once;
 *   2. the first quest taken, its new target plays it once more, and the
 *      flight ends on the minimap's star (within 3 px); then nothing is left
 *      on the page, and the same target never plays it again;
 *   3. sideways, the cue (replayed by its QA handle) ends on the star there.
 * Pictures: tools/qa/mp/out/starcue-{phone,sideways,desk}-{start,end}.png.
 */
import * as H from './harness.mjs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const cue = (P) => P.page.evaluate(() => {
  const q = window.__btStarCue || {};
  const r = window.__btWheelMini, m = window.__btMinimap;
  const star = r && m && m.star ? { x: r.left + m.star.x, y: r.top + m.star.y } : null;
  return { n: q.n || 0, last: q.last || null, onPage: document.querySelectorAll('[data-star-cue]').length, star };
});
async function waitN(P, n, ms) {
  let c = await cue(P);
  for (let t0 = Date.now(); c.n < n && Date.now() - t0 < ms;) { await P.page.waitForTimeout(100); c = await cue(P); }
  return c;
}
/* the flight held still for a picture at its start and near its end (this
   box takes longer to photograph than the cue lasts), then let go */
async function shots(P, label) {
  for (const [t, name] of [[200, 'start'], [880, 'end']]) {
    const held = await P.page.evaluate((t) => {
      const el = document.querySelector('[data-star-cue]');
      const a = el && el.getAnimations ? el.getAnimations()[0] : null;
      if (!a) return false;
      a.pause(); a.currentTime = t;
      return true;
    }, t);
    if (held) await P.page.screenshot({ path: join(OUT, `starcue-${label}-${name}.png`) }).catch(() => {});
  }
  await P.page.evaluate(() => { const el = document.querySelector('[data-star-cue]'); const a = el && el.getAnimations ? el.getAnimations()[0] : null; if (a) a.play(); });
  await P.page.waitForTimeout(1600);
}
async function one(P, label, rec) {
  await H.enterWorld(P);
  const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${label}: in the world (guard)`, !!inW, inW);
  if (!inW) return;
  const c1 = await waitN(P, 1, 20000);
  rec.ok(`${label} 1. the first star (Mayor Bro) plays the cue once (${c1.n})`, c1.n === 1, c1);
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
  const c2 = await waitN(P, 2, 15000);
  await shots(P, label);
  const c3 = await cue(P);
  const off = c2.last && c3.star ? Math.hypot(c2.last.to.x - c3.star.x, c2.last.to.y - c3.star.y) : 99;
  await P.page.waitForTimeout(3000);
  const c4 = await cue(P);
  rec.ok(`${label} 2. the first quest's new target plays it once more (${c2.n}), ending on the minimap's star (${Math.round(off)} px off), nothing left after (${c3.onPage}), never again for the same target (${c4.n})`,
    c2.n === 2 && off <= 3 && c3.onPage === 0 && c4.n === 2, { c2, c3, c4 });
}
export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Starry', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    await one(A, 'phone', rec);
    /* 3. sideways */
    await A.page.setViewportSize({ width: 844, height: 390 });
    await A.page.waitForTimeout(2000);
    const n0 = (await cue(A)).n;
    await A.page.evaluate(() => window.__btStarCue.forget());
    const s1 = await waitN(A, n0 + 1, 8000);
    await shots(A, 'sideways');
    const s2 = await cue(A);
    const off = s1.last && s2.star ? Math.hypot(s1.last.to.x - s2.star.x, s1.last.to.y - s2.star.y) : 99;
    rec.ok(`phone sideways 3. the cue ends on the minimap's star there (${Math.round(off)} px off), nothing left after (${s2.onPage})`, s1.n === n0 + 1 && off <= 3 && s2.onPage === 0, { s1, s2 });
  } finally { await A.ctx.close().catch(() => {}); }
  const B = await H.newPlayer(browser, { name: 'DeskStar', wsPort, webPort, world: 'wheel', viewport: { width: 1440, height: 900 }, wide: true });
  try { await one(B, 'desk', rec); } finally { await B.ctx.close().catch(() => {}); }
}
