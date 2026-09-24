/**
 * mp-hotarrow -- v2.3.2787: the bow special is the pine arrow, white-hot.
 *
 * Owner: "I want to see what the arrow special would look like with you
 * drawing the special instead of using my special arrow sprite.  I'd like
 * something glowing and a bit animated over the normal arrow like a white bit
 * glowing hot arrow."  (src/rendering/hotArrowFx.js)
 *
 * What a screenshot cannot say, the system reports (window.__btHotArrow):
 *   - which art is drawn (the heated pine arrow, not the painted sheet -- and
 *     the sheet is never even downloaded);
 *   - that it is drawn at the special's 62.8 px and its glow stays inside the
 *     hit capsule it has always had (PROJ_BODY.arrowSpecial: half 12.8);
 *   - that the glow is additive light and nothing is a filter (iOS grain);
 *   - that it is ANIMATED in flight -- the heat frame steps, the breath swells;
 *   - that it sheds sparks that cool white -> orange -> red;
 *   - the stuck arrow's heat over its four seconds: white on landing, down to
 *     an ember, a flare on each 500 ms tick, white again before the send-off;
 *   - that the head still shows in flight and is buried once it lands (the
 *     v2.3.2381 tallies mp-arrowhead reads);
 *   - that a plain arrow is untouched, a miss smoulders in the ground, and a
 *     peer's special is white-hot too.
 * The special is fired through the game's own specialAttack at a pinned
 * skeleton in town (mp-shotland's fixture), on the page clock (TRAPS §111:
 * the dark-screen watchdog is told the screen is lit first).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const DIST = 200;
const HALF = 12.8;       /* PROJ_BODY.arrowSpecial.half (projectiles.js) */
const LEN = 62.8;        /* the painted special's drawn length, kept (hotArrowFx HOT_LEN) */

const arm = (P, withMonster) => P.page.evaluate(({ dist, withMonster }) => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const pine = (F.WOODWORKING_TIERS || {}).pine;
  R.rangedWeapon = { type: 'bow', tierMult: pine ? pine.tierMult : 1, gearBase: 'pine', name: 'QA Bow', tier: 'common' };
  R.activeSlot = 'ranged';
  R.mana = R.maxMana = 900; R.hp = R.maxHp = 9000;
  S.arrows = []; S._debrisBursts = []; S.hitParticles = [];
  S.monsters = [];
  S.lockedTarget = null;
  let id = null;
  if (withMonster) {
    const m = F.createMonster('hot-' + Date.now(), 'fodder', 2, S.player.x + dist, S.player.y + 2, null);
    if (!m) return { err: 'no monster' };
    m.archetype = 'skeleton'; m.type = 'skeleton';
    m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12;
    m._transformStart = 1;
    m._stuckArrows = [];
    S.monsters = [m];
    S.lockedTarget = { ref: m, type: 'monster', src: 'tap', ts: Date.now() };
    id = m.id;
  }
  S.autoAttack = false; S.isSwinging = false; S.swingTimer = 0;
  S._facingAngle = 0; S._aimAngle = 0; S._lastAimAngle = 0; S._facing = 'right';
  return { id };
}, { dist: DIST, withMonster });

const sample = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const hp = window.__btHotArrow ? window.__btHotArrow() : null;
  const ap = window._pixiRenderer && window._pixiRenderer.arrowProbe ? window._pixiRenderer.arrowProbe() : null;
  const a = (S.arrows || []).find((x) => x && x.isSpecial && !x.isStaff);
  const r = hp && hp.arrows && hp.arrows[0];
  return {
    t: Date.now(),
    live: !!a, stuck: !!(a && a.stuckIn), planted: !!(a && a.planted), landing: !!(a && a._landFx),
    hot: r ? { state: r.state, tex: r.tex, headless: r.headless, heat: r.heat, frame: r.frame, len: r.len, drawnLen: r.drawnLen,
      flashAlpha: r.flashAlpha, auraAlpha: r.auraAlpha, auraNAlpha: r.auraNAlpha } : null,
    sparks: hp ? hp.sparks : 0, tints: hp ? hp.sparkTints : [], stats: hp ? hp.stats : null,
    blends: hp ? hp.blends : null, filters: hp ? hp.filters : null, nearest: hp ? hp.nearest : null, auraHalf: hp ? hp.auraHalf : null,
    specials: ap ? ap.specials : null, specialHeads: ap ? ap.specialHeads : null, arrows: ap ? ap.arrows : null, heads: ap ? ap.heads : null,
  };
});

/* Step the page clock `n` times by `ms`, sampling after each step. */
async function steps(P, n, ms, out) {
  for (let i = 0; i < n; i++) {
    await P.page.clock.runFor(ms);
    out.push(await sample(P));
  }
  return out;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
  await P.page.addStyleTag({ content: '[data-coach],[data-coach-card],[data-coach-ring]{display:none!important}' });
  /* the skeleton's art is a Wind Dunes asset (per-zone loading, v2.3.1405) */
  await P.page.evaluate(() => (window._gameFns.preloadZoneArt ? window._gameFns.preloadZoneArt('sky') : null)).catch(() => {});
  await P.page.waitForTimeout(800);
  const hook = await P.page.evaluate(() => {
    const hp = window.__btHotArrow ? window.__btHotArrow() : null;
    const ap = window._pixiRenderer && window._pixiRenderer.arrowProbe;
    return { hot: !!hp, ready: !!(hp && hp.ready), arrowProbe: !!ap, special: typeof (window._gameFns || {}).specialAttack === 'function' };
  });
  rec.ok('the white-hot arrow is built and its probe is on the page (guard)', hook.hot && hook.ready && hook.special && hook.arrowProbe, hook);

  /* the painted sheet: never requested (HOT_SPECIAL_ARROW skips its load) */
  const sheetReq = await P.page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /arrow-special/.test(n)));
  rec.ok('the painted special sheet is never downloaded', sheetReq.length === 0, sheetReq);

  /* ════════ 1. A SPECIAL AT A SKELETON: FLIGHT, LANDING, SMOULDER ════════ */
  const armed = await arm(P, true);
  rec.ok('a skeleton is pinned 200 px east and locked (guard)', !!armed.id, armed);
  /* TRAPS §111: the page clock starves the watchdog's canvas sample */
  await P.page.evaluate(() => { const S = window._gameState.current; S.__wdEverLit = true; S.__wdNext = 1e15; S.__wdDark = 0; });
  await P.page.clock.install();
  await P.page.clock.pauseAt((await P.page.evaluate(() => Date.now())) + 1000);
  await P.page.clock.runFor(300);
  await P.page.evaluate(() => { (window._gameFns || {}).specialAttack(); });
  const S1 = [];
  await steps(P, 24, 1000 / 60, S1);          /* the flight, frame by frame */
  let guard = 0;
  while (guard++ < 120) {                    /* then 50 ms steps until the arrow is gone */
    await steps(P, 1, 50, S1);
    if (!S1[S1.length - 1].live && S1.some((s) => s.stuck)) break;
  }
  const fly = S1.filter((s) => s.hot && s.hot.state === 'flight');
  const stuck = S1.filter((s) => s.hot && s.hot.headless);
  rec.ok(`the special flies and sticks in the skeleton (guard: ${fly.length} flight, ${stuck.length} stuck samples)`,
    fly.length >= 2 && stuck.length >= 10 && S1.some((s) => s.stuck), { fly: fly.length, stuck: stuck.length });

  const lens = fly.map((s) => s.hot.drawnLen);
  rec.ok(`in flight it is the pine arrow, heated, at the special's ${LEN} px (drawn ${lens.slice(0, 3).join(', ')})`,
    fly.length > 0 && fly.every((s) => s.hot.tex === 'heat' && Math.abs(s.hot.drawnLen - LEN) < 0.6), fly.slice(0, 2).map((s) => s.hot));
  const b0 = S1.find((s) => s.blends);
  rec.ok('it glows: additive light round it, and the same glow drawn plain beneath for a bright ground',
    fly.length > 0 && fly.every((s) => s.hot.auraAlpha > 0 && s.hot.auraNAlpha > 0) && b0 && b0.blends.aura === 'add' && b0.blends.hot === 'add',
    { blends: b0 && b0.blends, first: fly[0] && fly[0].hot });
  const frames = new Set(fly.map((s) => s.hot.frame));
  const fa = fly.map((s) => s.hot.flashAlpha);
  rec.ok(`it is animated in flight (${frames.size} heat frames, breath ${Math.min(...fa).toFixed(2)}..${Math.max(...fa).toFixed(2)})`,
    frames.size >= 2 && Math.max(...fa) - Math.min(...fa) > 0.05, { frames: [...frames], fa });
  const sparkN = Math.max(0, ...fly.map((s) => s.sparks));
  const tints = new Set(S1.flatMap((s) => s.tints || []));
  const HOTT = [0xffffff, 0xffe070], COOLT = [0xff9a30, 0xe0501c, 0x9a2a12];
  rec.ok(`it sheds sparks as it flies, and they cool (${sparkN} at once; white ${HOTT.some((c) => tints.has(c))}, orange/red ${COOLT.some((c) => tints.has(c))})`,
    sparkN >= 3 && HOTT.some((c) => tints.has(c)) && COOLT.some((c) => tints.has(c)), { sparkN, tints: [...tints].map((c) => c.toString(16)) });
  rec.ok(`its glow stays inside the special's hit capsule (${b0 && b0.auraHalf} <= ${HALF} px)`, !!b0 && b0.auraHalf > 0 && b0.auraHalf <= HALF, b0 && b0.auraHalf);
  rec.ok('nothing is a filter, and the art is sampled nearest (crisp pixels)', S1.every((s) => s.filters === 0 || s.filters == null) && !!(b0 && b0.nearest),
    { filters: [...new Set(S1.map((s) => s.filters))], nearest: b0 && b0.nearest });
  rec.ok('the head shows in flight (mp-arrowhead\'s tallies)', fly.some((s) => s.specials > 0 && s.specialHeads > 0), fly.map((s) => [s.specials, s.specialHeads]));
  rec.ok('...and is buried once it has landed', stuck.length > 0 && stuck.every((s) => s.specials > 0 && s.specialHeads === 0 && /^ember/.test(s.hot.tex)),
    stuck.slice(0, 2).map((s) => ({ sp: s.specials, heads: s.specialHeads, tex: s.hot.tex })));

  const h = stuck.map((s) => s.hot.heat);
  const t0 = stuck.length ? stuck[0].t : 0;
  const coolIdx = h.findIndex((v) => v <= 0.55);
  const cooledBy = coolIdx >= 0 ? stuck[coolIdx].t - t0 : null;
  rec.ok(`it lands white-hot and cools to an ember (${h[0]} at landing, <= 0.55 after ${cooledBy} ms)`,
    h.length > 0 && h[0] >= 0.9 && cooledBy != null && cooledBy <= 1300, { h: h.slice(0, 30) });
  const reflare = coolIdx >= 0 && h.slice(coolIdx).some((v) => v >= 0.7);
  const throbs = (S1[S1.length - 1].stats || {}).throbs || 0;
  rec.ok(`it flares again on the stuck arrow's ticks (${throbs} throbs)`, reflare && throbs >= 3, { throbs, after: h.slice(coolIdx, coolIdx + 30) });
  const lastStuck = stuck[stuck.length - 1];
  const endWin = stuck.filter((s) => lastStuck.t - s.t <= 350);
  rec.ok(`it builds to white-hot before the send-off (${Math.max(...endWin.map((s) => s.hot.heat))} in its last 350 ms)`,
    endWin.length > 0 && Math.max(...endWin.map((s) => s.hot.heat)) >= 0.85, endWin.map((s) => s.hot.heat));

  /* ════════ 2. A PLAIN ARROW IS UNTOUCHED ════════ */
  await arm(P, true);
  await P.page.evaluate(() => { const S = window._gameState.current; S.swingTimer = 0; S.autoAttack = true; });
  const S2 = [];
  for (let i = 0; i < 40; i++) {
    await steps(P, 1, 1000 / 60, S2);
    const s = S2[S2.length - 1];
    if (s.arrows > 0) { await P.page.evaluate(() => { window._gameState.current.autoAttack = false; }); break; }
  }
  const plain = S2.filter((s) => s.arrows > 0);
  rec.ok('a plain arrow is untouched: drawn as the pine arrow, nothing white-hot', plain.length > 0 && plain.every((s) => !s.hot),
    S2.slice(-3).map((s) => ({ arrows: s.arrows, hot: s.hot })));
  await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S.arrows = []; });
  await steps(P, 1, 2000, []);

  /* ════════ 3. A MISS SMOULDERS IN THE GROUND ════════
     A special with no target waits for the bow's sight (v2.3.2473's queue),
     so the miss is the record the special pushes, injected flying east. */
  await arm(P, false);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.arrows.push({ ang: 0, dist: 14, dmg: 1, baseDmg: 1, life: 150, maxLife: 150, hitIds: new Set(),
      isSpecial: true, isStaff: false, pierce: true, _rangeMult: 1, element: null });
  });
  const S3 = [];
  guard = 0;
  while (guard++ < 140) {
    await steps(P, 1, 50, S3);
    if (!S3[S3.length - 1].live && S3.some((s) => s.planted)) break;
  }
  const planted = S3.filter((s) => s.planted && s.hot);
  const ph = planted.map((s) => s.hot.heat);
  rec.ok(`a miss plants in the ground and smoulders there, flaring on its ground ticks (${planted.length} samples, heat ${Math.min(...ph).toFixed(2)}..${Math.max(...ph).toFixed(2)})`,
    planted.length >= 10 && planted.every((s) => s.hot.headless && /^ember/.test(s.hot.tex)) && Math.min(...ph) <= 0.55 && ph.slice(ph.indexOf(Math.min(...ph))).some((v) => v >= 0.7),
    { n: planted.length, ph: ph.slice(0, 40) });
  await P.ctx.close().catch(() => {});

  /* ════════ 4. A PEER SEES IT WHITE-HOT ════════ */
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Archer', nameB: 'Watcher' });
  for (const X of [A, B]) {
    await X.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
  }
  await A.page.evaluate(() => (window._gameFns.preloadZoneArt ? window._gameFns.preloadZoneArt('sky') : null)).catch(() => {});
  await A.page.waitForTimeout(800);
  await arm(A, true);
  await A.page.waitForTimeout(400);
  const watch = B.page.evaluate((ms) => new Promise((resolve) => {
    const out = { remoteSpecial: 0, drawnFlight: 0, frames: 0, tex: null };
    const t0 = Date.now();
    const tick = () => {
      const S = window._gameState.current;
      out.frames++;
      if ((S._remoteProjectiles || []).some((rp) => rp && rp.isSpecial && !rp.isStaff)) out.remoteSpecial++;
      const hp = window.__btHotArrow ? window.__btHotArrow() : null;
      const f = hp && hp.arrows && hp.arrows.find((r) => r.state === 'flight');
      if (f) { out.drawnFlight++; out.tex = f.tex; }
      if (Date.now() - t0 < ms) { requestAnimationFrame(tick); return; }
      resolve(out);
    };
    requestAnimationFrame(tick);
  }), 3500);
  await A.page.waitForTimeout(300);
  await A.page.evaluate(() => { (window._gameFns || {}).specialAttack(); });
  const peer = await watch;
  rec.ok(`the watcher is sent the archer's special (guard: seen on ${peer.remoteSpecial} frames)`, peer.remoteSpecial > 0, peer);
  rec.ok('...and draws it white-hot, through the same code', peer.drawnFlight > 0 && peer.tex === 'heat', peer);
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
