/* FRAME TIME, MEASURED (v2.3.1808).
 *
 * Owner: "The game is experience a slowdown like a framerate issue."
 *
 * A slowdown report is the one kind of bug where guessing is worst: every
 * recent change looks like a plausible culprit and none of them can be ruled
 * out by reading.  So this samples real frame intervals in the real client and
 * reports the distribution, and it can be pointed at one suspect at a time.
 *
 * Reports p50/p95/worst and the count of frames over 32ms (a dropped frame at
 * 60Hz), because a mean hides exactly the stutter a player notices.
 */
import * as H from './harness.mjs';

/* MEASURE CPU TIME, NOT FRAME INTERVALS.  The first cut of this file timed
   requestAnimationFrame deltas and reported a flat 100.0ms / 10fps for EVERY
   sample including idle — which is headless Chromium throttling rAF, not the
   game.  A number that is identical in the control and the suspect is
   measuring the harness.
   The client already records what actually matters: renderFrame.js feeds
   perfTracker a per-frame breakdown (workMs, simMs, renderMs, and the four
   pixi stages).  workMs is OUR callback's own cost and is unaffected by how
   often the browser chooses to call us, so it is the honest signal here. */
const sample = async (P, ms, label) => {
  await P.page.evaluate(() => { window.perfTracker && window.perfTracker.reset(); });
  await P.page.waitForTimeout(ms);
  const r = await P.page.evaluate(() => {
    const pt = window.perfTracker;
    if (!pt || !pt.getSamples) return null;
    const a = pt.getSamples();
    if (!a.length) return null;
    const col = (k) => { const v = a.map((s) => s[k] || 0).sort((x, y) => x - y); return v; };
    const q = (v, p) => +(v[Math.min(v.length - 1, Math.floor(v.length * p))] || 0).toFixed(2);
    const w = col('workMs');
    return {
      frames: a.length,
      workP50: q(w, .5), workP95: q(w, .95), workMax: +w[w.length - 1].toFixed(2),
      simP50: q(col('simMs'), .5),
      entityP50: q(col('entityMs'), .5), entityP95: q(col('entityMs'), .95),
      effectsP50: q(col('effectsMs'), .5), effectsP95: q(col('effectsMs'), .95),
      tileP50: q(col('tileMs'), .5), appP50: q(col('appMs'), .5),
    };
  });
  return { label, ...(r || {}) };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Meter', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(4000);

  const out = [];
  out.push(await sample(P, 3000, 'idle in town'));

  /* Blocking runs the stand-in path, which is what the last few versions
     changed — the child-index lift, the held-shield clone, the jog legs. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.shield = { name: 'Pine Shield', type: 'shield' };
    S.rpg.weapon = S.rpg.weapon || { type: 'greatsword', name: 'Copper Great Sword', dmg: 5 };
    window.__hold = true;
    const tick = () => {
      const S2 = window._gameState.current;
      if (S2 && window.__hold) { S2._shieldUp = true; S2._shieldKb = false; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await P.page.waitForTimeout(600);
  out.push(await sample(P, 3000, 'holding the shield (block stand-in)'));

  /* Facing north puts the stand-in in FRONT mode, which is the branch that
     reorders a child every time it decides the shield is on the near side. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__pinN = true;
    const tick = () => {
      const S2 = window._gameState.current;
      if (S2 && window.__pinN) {
        const a = 6 * Math.PI / 4;
        S2._facingAngle = a; S2._aimAngle = a; S2._mouseAimAngle = a; S2._shieldAngle = a;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await P.page.waitForTimeout(600);
  out.push(await sample(P, 3000, 'blocking, facing north (front-mode reorder)'));

  await P.page.evaluate(() => { window.__hold = false; window.__pinN = false;
    window._gameState.current._shieldUp = false; });
  await P.page.waitForTimeout(600);
  out.push(await sample(P, 3000, 'idle again (control)'));

  for (const r of out) {
    console.log(`    ${String(r.label).padEnd(42)} work p50 ${String(r.workP50).padStart(6)} p95 ${String(r.workP95).padStart(6)} max ${String(r.workMax).padStart(7)}  ` +
      `| sim ${String(r.simP50).padStart(5)} entity ${String(r.entityP50).padStart(5)}/${String(r.entityP95).padStart(5)} ` +
      `fx ${String(r.effectsP50).padStart(5)}/${String(r.effectsP95).padStart(5)} tile ${String(r.tileP50).padStart(5)} app ${String(r.appP50).padStart(5)}  (${r.frames}f)`);
  }
  for (const r of out) {
    rec.ok(`${r.label}: the frame's own work stays under 16ms`,
      r.workP50 > 0 && r.workP50 < 16, r);
  }
  /* THE COMPARISON IS THE POINT.  An absolute budget depends on the machine;
     "does blocking cost more than standing" does not, and that is the question
     the owner's report actually poses. */
  const idle = out[0], north = out[2];
  rec.ok('blocking while facing north costs no more than standing still',
    north.workP50 < idle.workP50 * 1.5 + 2, { idle: idle.workP50, north: north.workP50 });
  rec.ok('...and its entity stage in particular',
    north.entityP50 < idle.entityP50 * 1.5 + 2, { idle: idle.entityP50, north: north.entityP50 });

  await P.ctx.close().catch(() => {});
}
