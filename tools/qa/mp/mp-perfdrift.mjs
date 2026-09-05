/* ═══ DOES IT ACTUALLY GET SLOWER, AND WHAT GROWS WITH IT? (v2.3.2271) ═══
 *
 * Owner: "the game slows down after playing for a while (like an accumulated
 * frame rate drop)."
 *
 * "After a while" and "accumulated" name a shape, not a cost: something that
 * GROWS.  A constant expense, however large, does not get worse.  So this does
 * not try to find the leak by reading -- it samples, over a few minutes of real
 * play in a real spoke zone, the two things that would prove one exists:
 *
 *   1. FRAME TIME, as a moving average of rAF deltas.  If the first minute and
 *      the last minute are the same, there is no drift and the report is about
 *      something else (a specific zone, a device thermal, a network stall).
 *   2. EVERY COLLECTION THAT COULD BE GROWING UNDER IT, sampled at the same
 *      moments, so a rising frame time can be laid against what rose with it.
 *      A leak that shows in neither is still a leak, but it is not one of
 *      these, and that is worth knowing too.
 *
 * It is a MEASUREMENT, not an assertion about a number: the pass/fail is only
 * "did the frame time drift", with the table printed either way.  Sampling a
 * phone's real behaviour from a desktop Chromium would be a lie, so the
 * absolute values mean nothing -- the RATIO between the first and last window
 * is the whole signal, and that is device-independent.
 *
 * ── READ THE FRAME-TIME AXIS WITH SUSPICION HERE, AND THE NODE COUNTS WITHOUT ──
 * Honesty about this harness, learned by running it: the headless box does
 * roughly 6fps under a swrast GL, so a frame time of ~160ms is already three
 * orders of the budget away from a phone's 16.7ms and is dominated by software
 * rasterisation rather than by anything this game does.  A drift ratio measured
 * on top of that is noise wearing a number's clothes -- it will swing either
 * way between runs and neither swing is evidence.  Run this on a machine with
 * real GL before believing the FRAME TIME DRIFT line.
 *   The COLLECTION and NODE columns do not have that problem: they are counts
 * of objects, identical on any device, and a count that climbs across windows
 * is a leak whether the box draws at 60fps or 6.  That is the row to read here,
 * and it is why the sampler grew a __btScene call rather than only a timer.
 */
import * as H from './harness.mjs';

const TILE = 32;
const WINDOW_MS = Number(process.env.BT_PERF_MS || 40000);   /* per window */
const WINDOWS = Number(process.env.BT_PERF_N || 4);

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

/* Install a frame-time recorder that survives across samples. */
const installMeter = (P) => P.page.evaluate(() => {
  if (window.__perfMeter) return;
  const m = { frames: 0, sum: 0, last: performance.now(), worst: 0 };
  window.__perfMeter = m;
  const tick = (t) => {
    const d = t - m.last;
    m.last = t;
    /* Ignore the first frame and anything absurd (a tab throttle, a breakpoint):
       a 2s gap is not a frame, it is the page having been parked, and averaging
       it in would invent a drift that is not there. */
    if (d > 0 && d < 500) { m.frames++; m.sum += d; if (d > m.worst) m.worst = d; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__perfSample = () => {
    const S = window._gameState && window._gameState.current;
      const scene = (window.__btScene ? window.__btScene() : null);
    const nodes = scene ? scene.total : null;
    const out = {
      frames: m.frames,
      avgMs: m.frames ? +(m.sum / m.frames).toFixed(2) : null,
      worstMs: +m.worst.toFixed(1),
      dmgNumbers: S && S.dmgNumbers ? S.dmgNumbers.length : null,
      arrows: S && S.arrows ? S.arrows.length : null,
      monsters: S && S.monsters ? S.monsters.length : null,
      others: S && S.others ? Object.keys(S.others).length : null,
      chatLog: S && S.chatLog ? S.chatLog.length : null,
      loot: S && S.zoneLoot ? S.zoneLoot.length : (S && S.loot ? S.loot.length : null),
      nodes,
      heapMB: (performance.memory && performance.memory.usedJSHeapSize)
        ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      listeners: null,
      zone: S ? S.currentZone : null,
      hp: S && S.rpg ? S.rpg.hp : null,
      serverMon: S ? !!S._serverMonsters : null,
      autoAttack: S ? !!S.autoAttack : null,
      layers: scene ? scene.byLayer : null,
    };
    /* Reset the frame window so each sample is its OWN average rather than a
       cumulative one -- a cumulative mean hides a rise by construction. */
    m.frames = 0; m.sum = 0; m.worst = 0;
    return out;
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Drift', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* Out to a spoke zone: town has no monsters, and the report is about play. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1800);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'verdant')
        || (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId !== 'town') || null,
    };
  });
  if (marks.townOut && marks.spoke) {
    await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
    await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview', { timeout: 30000 }).catch(() => {});
    await P.page.waitForTimeout(800);
    await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
    await H.waitFor(P, (S) => S.currentZone, (z) => z !== 'worldview' && z !== 'town',
      { timeout: 30000 }).catch(() => {});
    await P.page.waitForTimeout(2500);
  }
  const where = await H.readState(P, (S) => ({ zone: S.currentZone, monsters: (S.monsters || []).length }));
  console.log('    measuring in: ' + JSON.stringify(where));
  rec.ok('the run is happening in a monster zone (guard)',
    where.zone !== 'town' && where.zone !== 'worldview', where);

  await installMeter(P);
  /* Warm-up discarded: the first seconds carry zone-entry work that is real but
     is not what "after a while" means. */
  await P.page.waitForTimeout(4000);
  await P.page.evaluate(() => window.__perfSample());

  /* PLAY, rather than idle.  An idle client exercises none of the paths that
     would leak -- the whole hypothesis is that something accumulates per EVENT.
     The attack button is held down, so swings, projectiles, damage popups,
     monster hits and deaths all cycle for the whole run. */
  await P.page.evaluate(() => {
    window.__touch = (el, type, x, y, id) => {
      const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
      const end = type === 'touchend' || type === 'touchcancel';
      el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
        touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
    };
    const e = document.querySelector('.bt-rjoy-base');
    if (e) {
      const r = e.getBoundingClientRect();
      window.__touch(e, 'touchstart', r.x + r.width / 2, r.y + r.height / 2, 90);
    }
  });

  const rows = [];
  for (let i = 0; i < WINDOWS; i++) {
    /* KEEP HIM ALIVE, and say why in the file rather than in a commit message:
       the first run of this died at window 2 (hp 52 -> 0), which emptied the
       zone and made every later sample a measurement of an empty screen that
       "passed".  A death also releases the held attack, so the run stops
       generating the events the whole hypothesis is about.  Topping the pool up
       is the least invasive way to buy minutes of continuous combat; it touches
       no path this is measuring. */
    const alive = setInterval(() => {}, 1 << 30);   /* no-op handle, cleared below */
    clearInterval(alive);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (S && S.rpg) { S.rpg.hp = S.rpg.maxHp; S.rpg.stamina = S.rpg.maxStamina; S.rpg.mana = S.rpg.maxMana; }
      /* Re-arm the attack if a death (or anything else) let go of it. */
      if (S && !S.autoAttack) {
        const e = document.querySelector('.bt-rjoy-base');
        if (e && window.__touch) {
          const r = e.getBoundingClientRect();
          window.__touch(e, 'touchstart', r.x + r.width / 2, r.y + r.height / 2, 90);
        }
      }
    });
    await P.page.waitForTimeout(WINDOW_MS);
    const s = await P.page.evaluate(() => window.__perfSample());
    s.window = i + 1;
    rows.push(s);
    console.log('    w' + (i + 1) + ': ' + JSON.stringify(s));
  }

  const first = rows[0], last = rows[rows.length - 1];
  rec.ok('the meter actually sampled frames (guard)',
    !!(first && last && first.frames > 30 && last.frames > 30), { first, last });
  if (first && last && first.avgMs && last.avgMs) {
    const drift = last.avgMs / first.avgMs;
    console.log('    FRAME TIME DRIFT: ' + first.avgMs + 'ms -> ' + last.avgMs
      + 'ms  (x' + drift.toFixed(3) + ') over ' + ((WINDOW_MS * WINDOWS) / 1000) + 's of held attack');
    /* The finding, either way.  1.15 is chosen as "a player would start to
       feel it": 16.7 -> 19.2ms is 60fps sliding toward 52. */
    rec.ok(`frame time did NOT drift over the run (${first.avgMs}ms -> ${last.avgMs}ms, x${drift.toFixed(3)})`,
      drift < 1.15, { first, last, drift: +drift.toFixed(3), rows });
    /* And what moved with it, so a drift is localisable rather than merely
       reported. */
    const grew = [];
    ['dmgNumbers', 'arrows', 'monsters', 'others', 'chatLog', 'loot', 'nodes', 'heapMB'].forEach((k) => {
      if (first[k] == null || last[k] == null) return;
      if (last[k] > first[k] * 1.5 && last[k] - first[k] > 3) grew.push(k + ' ' + first[k] + '->' + last[k]);
    });
    console.log('    grew over the run: ' + (grew.length ? grew.join(', ') : 'nothing tracked'));
    rec.ok('no tracked collection grew by half again over the run',
      grew.length === 0, { grew, rows });
  }
  await P.ctx.close().catch(() => {});
}
