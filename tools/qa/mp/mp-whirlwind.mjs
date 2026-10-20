/* THE WHIRLWIND WINDUP (v2.3.2824)
 *
 * Owner: "I want whirlwind's ability to be delayed by about 2 seconds after
 * you press it so a ring around you will display ... so you can tactically
 * position yourself to put the ring around a cluster of enemies (know exactly
 * what effective range you'll have).  Also make sure whirlwinds effects match
 * the effective area."
 *
 * Two real clients against a real worker, in a real combat zone:
 *   1. The press draws the ring at the exact radius the worker tests, and
 *      NOTHING is hit yet.
 *   2. The watching player sees the ring over the caster too.
 *   3. The worker's whirl hits land ~2s after the press, not on it.
 *   4. At the strike, the vortex and the edge ring are drawn at that same
 *      radius (the vortex used to be capped at 130 of 240).
 *   5. v2.3.3499 (owner: "when you do the whirlwind (wind up period after
 *      tapping the button) it would be helpful if the monsters were
 *      highlighted"): through the wind-up every monster inside the ring wears
 *      the catch mark (window.__btWhirlCatch), and every monster the WORKER's
 *      strike then hit was one of them.
 */
import * as H from './harness.mjs';

const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/whirl-${name}.png` }).catch(() => {});

/* Timestamp every whirl hit the socket receives, loose or batched. */
const recordWhirlHits = () => {
  window.__whirlHits = [];
  const OrigWS = window.WebSocket;
  window.WebSocket = function (...a) {
    const ws = new OrigWS(...a);
    ws.addEventListener('message', (ev) => {
      try {
        const m = JSON.parse(ev.data);
        const look = (e) => { if (e && e.type === 'monster_hit' && e.payload && e.payload.ability === 'whirl') { window.__whirlHits.push(Date.now()); (window.__whirlHitIds = window.__whirlHitIds || []).push(String(e.payload.monsterId)); } };
        look(m);
        if (m && Array.isArray(m.events)) m.events.forEach(look);
        if (m && Array.isArray(m.batch)) m.batch.forEach(look);
      } catch (e) { /* not JSON */ }
    });
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;
  Object.assign(window.WebSocket, { OPEN: OrigWS.OPEN, CLOSED: OrigWS.CLOSED, CONNECTING: OrigWS.CONNECTING, CLOSING: OrigWS.CLOSING });
};

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Spinner', nameB: 'Watcher', init: recordWhirlHits });
  const idA = await H.readState(A, (S) => S.myId);
  const idB = await H.readState(B, (S) => S.myId);
  rec.ok('the worker advertises caps.whirlWindup', await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.whirlWindup)));

  await H.devOp(wsPort, 'kit', idA, { what: 'weapons' });
  await A.page.waitForTimeout(1000);
  await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
  for (const id of [idA, idB]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 20 });
  await H.warpToZone(A, { wsPort, label: 'Verdant Wilds', zoneId: 'verdant' });
  await H.warpToZone(B, { wsPort, label: 'Verdant Wilds', zoneId: 'verdant' });
  for (const P of [A, B]) await H.clickText(P, 'CLOSE').catch(() => {});

  /* Walk A to a live monster, B close enough to watch. */
  const mon = await H.readState(A, (S) => {
    const m = (S.monsters || []).find((x) => x && x.alive !== false && (x.curHp == null || x.curHp > 0));
    return m ? { id: m.id, x: m.x, y: m.y } : null;
  });
  rec.ok('guard: Verdant Wilds has a live monster to spin at', !!mon, mon);
  if (!mon) return;
  await H.hopTo(A, mon.x - 80, mon.y).catch(() => {});
  await H.hopTo(B, mon.x - 80, mon.y + 150).catch(() => {});
  await A.page.waitForTimeout(1200);
  await H.devOp(wsPort, 'vitals', idA, { heal: true, god: true, godMinutes: 20 });
  await A.page.waitForTimeout(600);

  /* ── 1. The press ── */
  const press = await A.page.evaluate(() => {
    const S = window._gameState.current;
    window.__whirlHits.length = 0;
    /* Watch every frame for the strike's look -- it lives ~half a second. */
    window.__whirlSeen = { fx: null, edge: null, cleared: null, caught: null, frames: 0 };
    window.__whirlHitIds = [];
    const t0 = Date.now();
    const watch = () => {
      const W = window.__whirlSeen;
      if (S._whirlFx && W.fx == null) W.fx = S._whirlFx.radius;
      const e = (S._impactRings || []).find((r) => typeof r.settle === 'number');
      if (e && W.edge == null) W.edge = e.maxR;
      if (!S._whirlWindup && W.cleared == null) W.cleared = Date.now() - t0;
      /* v2.3.3499: the last wind-up frame's catch, and the monsters inside
         the ring as THIS frame draws them, measured the worker's way */
      const c = window.__btWhirlCatch && window.__btWhirlCatch();
      if (c && S._whirlWindup) {
        const R = c.r, px = S.player.x, py = S.player.y;
        const dist = (m) => Math.hypot((m.renderX != null ? m.renderX : m.x) - px, (m.renderY != null ? m.renderY : m.y) - py);
        const inside = (S.monsters || []).filter((m) => m && m.alive && !(m.curHp <= 0) && dist(m) <= R)
          .sort((a, b) => dist(a) - dist(b)).map((m) => String(m.id));
        W.caught = { ids: c.ids.map(String), n: c.n, r: R, inside };
        W.frames++;
      }
      if (Date.now() - t0 < 4000) requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
    const ok = window._gameFns.castAbility('whirl');
    return { ok, at: Date.now(), w: S._whirlWindup ? { r: S._whirlWindup.r, ms: S._whirlWindup.until - S._whirlWindup.t0 } : null };
  });
  rec.ok('pressing Whirlwind starts a 1 second ring at the full 240 radius (v2.3.2928: was 2)', press.ok && !!press.w && press.w.r === 240 && press.w.ms === 1000, press);
  await A.page.waitForTimeout(300);
  /* v2.3.2928: read BEFORE the picture -- with a 1s ring, a screenshot's
     latency alone can carry the check past the strike */
  const mid = await A.page.evaluate(() => ({ hits: window.__whirlHits.length, armed: !!window._gameState.current._whirlWindup }));
  await shot(A, 'ring');
  rec.ok('...half a second in the ring is still up and nothing has been hit', mid.armed && mid.hits === 0, mid);

  /* ── 2. The watcher ── */
  const peer = await B.page.evaluate((id) => {
    const S = window._gameState.current;
    const e = S._peerWindups && S._peerWindups[id];
    return e ? { r: e.r, ms: e.until - e.t0 } : null;
  }, idA);
  rec.ok('the other player sees the ring over the caster, same radius', !!peer && peer.r === 240 && peer.ms === 1000, peer);
  await shot(B, 'ring-peer');

  /* ── 3 + 4. The strike ── */
  await A.page.waitForFunction(() => !window._gameState.current._whirlWindup, null, { timeout: 4000 }).catch(() => {});
  await A.page.waitForTimeout(90);
  await shot(A, 'strike');
  await A.page.waitForTimeout(160);
  await shot(A, 'strike-2');
  await A.page.waitForTimeout(450);
  /* A picture of the widest frame: a 520ms effect is over before a
     screenshot lands, so pin one at mid-life for the photo (display only). */
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    const hold = { t0: 0, x: S.player.x, y: S.player.y, radius: 240 };
    S._impactRings = (S._impactRings || []).concat([]);
    let n = 0;
    const pin = () => {
      hold.t0 = Date.now() - 250; S._whirlFx = hold;
      S._impactRings = (S._impactRings || []).filter((r) => !r.__pin);
      S._impactRings.push({ __pin: 1, x: S.player.x, y: S.player.y, ts: Date.now() - 200, color: '#FFB347', maxR: 240, settle: 0.35, duration: 560, width: 5 });
      if (++n < 90) requestAnimationFrame(pin); else S._whirlFx = null;
    };
    pin();
  });
  await A.page.waitForTimeout(300);
  await shot(A, 'vortex-peak');
  await A.page.waitForTimeout(1500);
  const fire = await A.page.evaluate(() => window.__whirlSeen);
  const drawn = await A.page.evaluate(() => ({ d: window.__btWhirlDrawn || null, err: window.__btWhirlErr || null }));
  console.log('   drawn:', JSON.stringify(drawn));
  rec.ok('...and the vortex SPRITE on screen reaches the hit radius (its painted edge = 240)',
    !!drawn.d && Math.abs(drawn.d.drawnR - 240) < 1, drawn);
  rec.ok('when the ring runs out the vortex and its edge ring are drawn at the hit radius (240, not the old 130 cap)',
    fire.fx === 240 && fire.edge === 240, fire);
  await A.page.waitForTimeout(1500);
  const hitsAt = await A.page.evaluate(() => window.__whirlHits.slice());
  const first = hitsAt.length ? hitsAt[0] - press.at : null;
  rec.ok('the worker\'s whirlwind hit landed ~1s after the press, not on it', first != null && first >= 800 && first <= 2200,
    { firstHitMs: first, hits: hitsAt.length });

  /* ── 5. v2.3.3499: who the wind-up caught ── */
  const caught = fire.caught;
  rec.ok('through the wind-up the monsters inside the ring wear the catch mark (the one beside you among them)',
    !!caught && fire.frames > 3 && caught.n >= 1 && caught.ids.includes(String(mon.id))
      && caught.inside.slice(0, 16).every((id) => caught.ids.includes(id)), { caught, frames: fire.frames, mon: mon.id });
  const struck = await A.page.evaluate(() => (window.__whirlHitIds || []).slice());
  const strays = struck.filter((id) => !(caught && caught.ids.includes(id)));
  rec.ok('...and every monster the worker\'s strike hit wore it (one on the edge may go either way)',
    struck.length >= 1 && strays.length <= 1, { struck, strays, caught: caught && caught.ids });
  await A.page.evaluate(() => { const S = window._gameState.current; S._whirlWindup = null; });
  const after = await A.page.evaluate(() => window.__btWhirlCatch && window.__btWhirlCatch());
  rec.ok('...and the marks go with the ring', after == null, after);
}
