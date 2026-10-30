/* ═══ A KILL'S XP, THE MOMENT IT DIES, JUMPING INTO THE BAR (v2.3.3893) ═══
 *
 * The owner, 2026-10-29: "xp needs a 'jump to xp bar' effect and I think the
 * +xp message should occur the moment the monster reaches 0hp so it beats the
 * messages about what loot it drops".
 *
 * An upright phone (real taps on the attack half) and a computer playing wide
 * (real clicks on the snowman), in the world, at Frost Ridge's first
 * snowmen, the dev kit's greatsword, god mode:
 *   1. a kill brings its "+N XP" label (data-xpfly-kill) within a second of
 *      the phone handling the kill, and its drop lines ("Coins x6" over
 *      "Snowman Remains x1", which come in the same tick) start at least
 *      300 ms after it; and before the pickup's lines ("+6 G", a shard, a
 *      bag line);
 *   2. its words are the bar's own gain, the worker's number ("+1.8 XP");
 *   3. it lands on the top bar's XP bar (within 24 px of the skill's picture)
 *      and the bar pulses (data-xp-land);
 *   4. with ?xpfly=0 a kill flies nothing (the off-ramp);
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/killxp-<view>-{after,before}.png (the label in
 * the air, the flight stretched x8; a kill with ?xpfly=0, the lines at once). */
import * as H from './harness.mjs';

const VIEWS = [
  { id: 'phone', opts: { viewport: { width: 390, height: 844 }, touch: true } },
  { id: 'computer', opts: { viewport: { width: 1280, height: 800 }, wide: true }, desk: true },
];
/* the flight stretched for the pictures (a screenshot takes seconds here) */
const SLOW = 8;

const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, p = S.player;
  return (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0) && m.home === 'frost')
    .map((m) => ({ id: String(m.id), x: m.x, y: m.y, d: Math.hypot(m.x - p.x, m.y - p.y) })).sort((a, b) => a.d - b.d);
});
/* the attack: a finger on the right half ([data-joyzone="R"]), or a click on
   the snowman (mp-xpbar's) */
const tapR = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-joyzone="R"]');
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * 0.5, y = b.top + b.height * 0.4;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: 52, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: 52, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart')); el.dispatchEvent(mk('touchend'));
  return true;
});
const clickOn = async (P, m) => {
  const pt = await P.page.evaluate(([x, y]) => {
    const S = window._gameState.current;
    const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
    return { x: Math.round(cv.left + (x - S.camera.x) * S._worldScaleX), y: Math.round(cv.top + (y - S.camera.y) * S._worldScaleY) };
  }, [m.x, m.y - 20]);
  await P.page.mouse.click(pt.x, pt.y, { delay: 90 });
};

/* in the page, every 20 ms: the kills (a frost monster gone from alive), the
   kill's label (its words, where it is, the bar's picture), the loot's lines
   (the purse's "+N G", the shard / bag / gem lines over you), the landing */
const watch = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (window.__kxWatch) clearInterval(window.__kxWatch.id);
  const W = window.__kxWatch = { kills: [], deaths: [], flies: [], drops: [], loot: [], lands: [], samples: [], t0: Date.now() };
  const alive = new Map(), seen = new Set();
  const LOOT = /^\+ |^BAG: |RARE GEM| G$/;
  let killAt = S._killXpKillAt || 0;
  /* times are the game's own stamps (Date.now when each was made), never
     this poll's: on a slow box a poll is starved for a second at a time */
  W.id = setInterval(() => {
    if ((S._killXpKillAt || 0) !== killAt) { killAt = S._killXpKillAt; W.kills.push({ t: killAt }); }
    /* (a frost monster gone from alive: a death, with or without the fly) */
    for (const m of S.monsters || []) {
      if (!m || m.home !== 'frost') continue;
      const a = m.alive !== false && !(m.curHp != null && m.curHp <= 0);
      if (alive.get(m.id) === true && !a) W.deaths.push({ t: Date.now(), id: String(m.id) });
      alive.set(m.id, a);
    }
    /* the kill's drop lines ("Coins x6" over "Snowman Remains x1", rising
       off the monster: game/dropLines.js), each group by when it starts */
    for (const g of S._dropLines || []) if (!seen.has(g)) { seen.add(g); W.drops.push({ t: g.ts, text: (g.lines || []).map((l) => l.text).join(' / ') }); }
    for (const p of S.dmgNumbers || []) if (!seen.has(p)) { seen.add(p); if (LOOT.test(String(p.text))) W.loot.push({ t: p.ts, text: String(p.text) }); }
    for (const p of S._hudPopups || []) if (!seen.has(p)) {
      seen.add(p);
      if (p.target === 'goldIcon') W.loot.push({ t: p.ts, text: p.text });
      if (p.toBar && p.ts >= W.t0) W.flies.push({ t: p.ts, text: p.text, bar: (S._xpBar && S._xpBar.gain) || 0 });
    }
    const el = document.querySelector('[data-xpfly-kill]');
    if (el) {
      const r = el.getBoundingClientRect();
      const ic = document.querySelector('[data-xp-bar][data-xp-shown="1"] .bt-xp-bar__icon');
      const ib = ic ? ic.getBoundingClientRect() : null;
      const to = (el.getAttribute('data-xpfly-to') || '').split(',').map(Number);
      W.samples.push({ t: Date.now(), x: r.left + r.width / 2, y: r.top + r.height / 2, op: getComputedStyle(el).opacity,
        to: to.length === 2 && to.every(Number.isFinite) ? { x: to[0], y: to[1] } : null,
        ix: ib ? ib.left + ib.width / 2 : null, iy: ib ? ib.top + ib.height / 2 : null });
      if (W.samples.length > 400) W.samples.shift();
    }
    const land = document.documentElement.getAttribute('data-xp-land');
    if (land && land !== W._land) W.lands.push({ t: Date.now(), v: land });
    W._land = land;
  }, 20);
});
const readWatch = (P) => P.page.evaluate(() => { const W = window.__kxWatch; return W ? JSON.parse(JSON.stringify({ ...W, id: 0 })) : null; });

/* swing at the nearest snowman until one dies (the watch saw it) */
async function killOne(P, desk) {
  const k0 = ((await readWatch(P)) || { deaths: [] }).deaths.length;
  for (let i = 0; i < 60; i++) {
    const m = (await near(P))[0];
    if (!m) return false;
    if (m.d > 70) await H.hopTo(P, m.x, m.y + 50, { tries: 20 });
    if (desk) await clickOn(P, (await near(P))[0] || m); else await tapR(P);
    await P.page.waitForTimeout(600);
    const w = await readWatch(P);
    if (w && w.deaths.length > k0) return true;
  }
  return false;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = H.REPO + '/tools/qa/mp/out';
  for (const V of VIEWS) {
    const P = await H.newPlayer(browser, { name: 'Kill' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', ...V.opts });
    const errors = [];
    const wsl = [];
    if (process.env.KX_DEBUG) P.page.on('websocket', (ws) => ws.on('framereceived', (f) => {
      try { const j = JSON.parse(String(f.payload)); const arr = Array.isArray(j.events) ? j.events : [j];
        for (const e of arr) if (e && /monster_kill|loot_|player_state|combat_credit|monster_hit/.test(e.type)) wsl.push({ wall: Date.now(), ws: e.type, p: JSON.stringify(e.payload || {}).slice(0, 90) }); } catch (_e) { /* binary */ }
    }));
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world' });
      const me = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
      await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
      await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => {});
      await P.page.waitForTimeout(1500);
      await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
      await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
      const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
      const at = WHEEL_SPAWNS.frost.points[0];
      await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
      await P.page.waitForTimeout(1500);
      rec.ok(`${V.id} at Frost Ridge's first snowmen (guard)`, (await near(P)).length > 0, null);

      /* 1-3. a kill, the flight stretched for its picture */
      /* (and the bar kept up for it: the stretched flight outlasts its show) */
      await P.page.evaluate((k) => { window.__btXpFlySlow = k; window.__btXpHold = true; }, SLOW);
      await watch(P);
      const killed = await killOne(P, V.desk);
      let w = null;
      for (let i = 0; i < 40; i++) {
        w = await readWatch(P);
        if (w.flies.length) break;
        await P.page.waitForTimeout(100);
      }
      if (w.flies.length) await P.page.screenshot({ path: `${OUT}/killxp-${V.id}-after.png` }).catch(() => {});
      /* the landing (the flight x SLOW), then the pickup's lines */
      await P.page.waitForTimeout(1040 * SLOW + 2500);
      w = await readWatch(P);
      const kill = w.kills[0], fly = w.flies[0];
      const drop = w.drops.find((d) => kill && d.t >= kill.t - 50);
      const loot = w.loot.filter((l) => kill && l.t >= kill.t - 50);
      console.log(`    [${V.id}] kill ${JSON.stringify(kill)} fly ${JSON.stringify(fly)} loot ${JSON.stringify(loot.slice(0, 4))} lands ${JSON.stringify(w.lands)}`);
      if (process.env.KX_DEBUG) for (const e of wsl.filter((e) => kill && Math.abs(e.wall - kill.t) < 2500)) console.log('      ws', e.wall - kill.t, e.ws, e.p);
      rec.ok(`${V.id} 1. a kill (guard)`, killed && !!kill, w.kills);
      /* (the lines' wait is stretched with the flight here, x SLOW; at play
         speed it is KILL_XP_LINES_AFTER_MS, server/test/kill-xp.test.mjs §4) */
      rec.ok(`${V.id} 1. its drop lines ("${drop && drop.text}") rise ${drop && kill ? drop.t - kill.t : '?'} ms after the kill (stretched x${SLOW}), the XP ${drop && fly ? drop.t - fly.t : '?'} ms ahead of them`,
        !!drop && !!fly && drop.t - fly.t >= 300, { drop, fly });
      rec.ok(`${V.id} 1. its "+N XP" flies ${fly && kill ? fly.t - kill.t : '?'} ms after the phone handled the kill, before its loot's first line (${loot[0] ? `"${loot[0].text}" at ${loot[0].t - kill.t} ms` : 'none yet'})`,
        !!fly && !!kill && fly.t - kill.t <= 1000 && (!loot.length || fly.t <= loot[0].t), { kill, fly, loot });
      rec.ok(`${V.id} 2. its words are the bar's gain, the worker's number ("${fly && fly.text}", the bar's +${fly && Math.round(fly.bar * 10) / 10})`,
        !!fly && /^\+[\d.,]+ XP$/.test(fly.text) && Math.abs(parseFloat(fly.text.slice(1)) - (fly.bar < 10 ? Math.round(fly.bar * 10) / 10 : Math.round(fly.bar))) < 1e-9, fly);
      /* where it flies to (the label's own target, read each frame) against
         the bar's picture, and the last place it was drawn heading there */
      const land = w.lands[0];
      const smp = w.samples.filter((s) => s.to && s.ix != null);
      const end = smp[smp.length - 1];
      const off = end ? Math.round(Math.hypot(end.to.x - end.ix, end.to.y - end.iy)) : null;
      const d0 = smp[0] ? Math.hypot(smp[0].x - smp[0].to.x, smp[0].y - smp[0].to.y) : null;
      const d1 = end ? Math.hypot(end.x - end.to.x, end.y - end.to.y) : null;
      rec.ok(`${V.id} 3. it flies to the top bar's XP bar (its target ${off} px from the skill's picture; drawn ${d0 != null ? Math.round(d0) : '?'} -> ${d1 != null ? Math.round(d1) : '?'} px from it) and the bar pulses as it lands (${land ? land.t - kill.t + ' ms after the kill' : 'no pulse'})`,
        !!land && off != null && off <= 3 && d1 < d0 * 0.5, { first: smp[0], end, land });

      await P.page.evaluate(() => { window.__btXpFlySlow = 0; window.__btXpHold = false; });

      /* 4. the off-ramp, for this page (killXpOn reads the address each kill) */
      await P.page.evaluate(() => { history.replaceState(null, '', location.pathname + (location.search ? location.search + '&' : '?') + 'xpfly=0' + location.hash); });
      await watch(P);
      const killed2 = await killOne(P, V.desk);
      await P.page.waitForTimeout(300);
      await P.page.screenshot({ path: `${OUT}/killxp-${V.id}-before.png` }).catch(() => {});
      await P.page.waitForTimeout(1500);
      const w2 = await readWatch(P);
      rec.ok(`${V.id} 4. with ?xpfly=0 a kill flies nothing (deaths ${w2.deaths.length}, flights ${w2.flies.length})`, killed2 && w2.deaths.length > 0 && w2.flies.length === 0, w2.flies);
      rec.ok(`${V.id} 5. no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
