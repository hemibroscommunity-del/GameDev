/* ═══ A SHIELD BONKS THE BURROWING SNOWMAN UP  (v2.3.2700) ═══
 *
 * Owner: "if shield is up during snowman burrow ... it makes the snowman pop up
 * early with a little powder and a second of confusion for the enemy like it
 * just slammed into your shield."
 *
 * The worker half -- WHEN the bonk happens, what it costs, how long he is held
 * -- is pinned in server/test/burrow.test.mjs through the real tick.  That
 * suite also pins the exact emerge event the worker sends for a bonk.  This
 * scenario takes THAT event and asks the other half: given it, does a real
 * client, on a real frost snowman spawned by a real worker, DRAW what the
 * owner asked for?
 *
 *   the pop-up     -> his burrow phase is set to emerge (the existing animation)
 *   little powder  -> a snow burst is DRAWN between him and the player, at 0.6x
 *                     the size of a thrown ball's -- measured on the sprite,
 *                     against a real thrown ball's burst on the same screen
 *   confusion      -> the painted stun star ring is DRAWN over him, for the
 *                     daze, and is gone again after it
 *
 * The event goes in through window.__btDispatch, processGameEvent's own
 * monster_ability case, so this is the handler a worker message reaches.  What
 * it does NOT cover is a real burrow reaching a real shield on the worker's own
 * clock: that needs a snowman worn to half health and walking into a player
 * who is blocking, which no dev op can stage, and it is the part the server
 * suite drives instead.
 *
 * A CONTROL runs the same emerge WITHOUT the bonk fields, because an ordinary
 * surfacing must stay exactly what it was: no powder, no stars.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const DAZE_MS = 1600;   /* EMERGE_MS 600 + BONK_DAZE_MS 1000, as the worker sends it */

/* Wrap S.snowballBursts.push once so a queued burst can be seen before the
   renderer drains it (it empties the same array every frame). */
const watchBursts = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S.snowballBursts) S.snowballBursts = [];
  const q = S.snowballBursts;
  window.__qaBursts = [];
  if (!q.__qaWrapped) {
    const orig = q.push;
    q.push = function (e) { try { window.__qaBursts.push({ x: e.x, y: e.y, scale: e.scale }); } catch (_) {} return orig.apply(this, arguments); };
    q.__qaWrapped = true;
  }
  return true;
});

/* Dispatch one emerge for a real snowman and sample what is drawn for `ms`. */
const emerge = (P, o) => P.page.evaluate((o) => new Promise((resolve) => {
  const S = window._gameState.current;
  const m = (S.monsters || []).find((x) => x && x.id === o.id);
  if (!m) return resolve({ error: 'snowman gone' });
  window.__qaBursts = [];
  const shakeBefore = S.screenShake || 0;
  const payload = Object.assign({ monsterId: o.id, zone: S.currentZone, ability: 'burrow',
    phase: 'emerge', ms: 600 }, o.extra || null);
  const t0 = Date.now();
  window.__btDispatch({ type: 'monster_ability', payload });
  const after = { phase: m._burPhase, stunIn: m._stunUntil ? m._stunUntil - t0 : 0,
    shake: (S.screenShake || 0) - shakeBefore };
  const samples = [];
  const iv = setInterval(() => {
    const el = Date.now() - t0;
    const sp = window.__btMonsterSprite ? window.__btMonsterSprite(o.id) : null;
    samples.push({ at: el, stars: !!(sp && sp.stunStars),
      bursts: (window.__btSnowballBursts && window.__btSnowballBursts()) || [] });
    if (el >= o.ms) {
      clearInterval(iv);
      resolve({ after, samples, queued: window.__qaBursts.slice(), px: payload.px, py: payload.py });
    }
  }, 50);
}), o);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Bonk', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);

  const seeded = await H.warpToZone(P, { wsPort, label: 'Frost Ridge', zoneId: 'frost' });
  rec.ok('setup: every zone is open on the worker',
    seeded.ok && seeded.zones && Object.values(seeded.zones).every(Boolean), seeded.zones);

  /* STAND OUT OF THE FIGHT.  Real frost snowmen are hostile, and the first
     runs of this scenario stood beside one: the test player's auto-attack
     killed him 400ms into the daze, another snowman's thrown ball burst inside
     the "no powder" control, and one run ended in YOU DIED.  None of that is
     about the bonk.  What the test needs is narrower than "nobody fights":
     the TARGET must not be fought while it is being watched, and only the
     player's own melee can do that, so stand off him.  Stray snowballs landing
     elsewhere are filtered by position in the control, and a guard fails the
     run if the target's HP moves at all.  (A first cut demanded a spot 320px
     from every snowman -- out of all aggro -- and frost with six of them has
     none, so it failed setup on a map it could not change.) */
  const pick = await H.readState(P, (S) => {
    const snows = (S.monsters || []).filter((x) => x && x.alive && x.arch === 'snowman');
    const Z = { w: 1024, h: 1024 };
    /* Score every spot on a 32px grid: it must see a target snowman (within
       200px across -- the view is ~472 world px wide, the full height tall),
       sit well out of that target's melee reach (>=160), and be as far from
       the NEAREST snowman as the map allows.  Best spot wins; a guard below
       still fails the run if the target is touched. */
    let best = null;
    for (let x = 64; x <= Z.w - 64; x += 32) {
      for (let y = 64; y <= Z.h - 64; y += 32) {
        let nearest = Infinity;
        for (const o of snows) nearest = Math.min(nearest, Math.hypot(o.x - x, o.y - y));
        for (const m of snows) {
          const d = Math.hypot(m.x - x, m.y - y);
          if (Math.abs(m.x - x) > 200 || d < 160) continue;
          if (!best || nearest > best.nearest) best = { snow: { id: m.id, x: m.x, y: m.y }, stand: { x, y }, nearest: Math.round(nearest) };
        }
      }
    }
    return best ? Object.assign(best, { n: snows.length }) : { snow: null, n: snows.length };
  });
  const snow = pick.snow;
  rec.ok('setup: a real server snowman on screen, from the calmest spot on the map (guard)', !!snow, pick);
  if (!snow) return;
  await H.hopTo(P, pick.stand.x, pick.stand.y);
  await P.page.waitForTimeout(600);
  const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const hpOf = (id) => P.page.evaluate((mid) => {
    const m = (window._gameState.current.monsters || []).find((x) => x.id === mid);
    return m ? m.hp : null;
  }, id);
  const hp0 = await hpOf(snow.id);
  const probes = await P.page.evaluate(() => ({
    dispatch: typeof window.__btDispatch === 'function',
    sprite: typeof window.__btMonsterSprite === 'function',
    bursts: typeof window.__btSnowballBursts === 'function',
  }));
  rec.ok('setup: the probes this scenario reads exist', probes.dispatch && probes.sprite && probes.bursts, probes);
  await watchBursts(P);

  /* ── A THROWN BALL'S BURST, as the size reference for "little" ── */
  const refY = snow.y - 60;
  await P.page.evaluate((o) => {
    const S = window._gameState.current;
    window.__btDispatch({ type: 'monster_projectile', payload: { monsterId: 'qa-ref', kind: 'snowball',
      zone: S.currentZone, x: o.x, y: o.y - 80, tx: o.x, ty: o.y, travelMs: 300 } });
  }, { x: snow.x + 70, y: refY });
  let refH = null;
  for (let i = 0; i < 40 && refH === null; i++) {
    await P.page.waitForTimeout(50);
    const drawn = await P.page.evaluate(() => (window.__btSnowballBursts && window.__btSnowballBursts()) || []);
    const hit = drawn.find((b) => Math.abs(b.y - refY) < 20);
    if (hit) refH = hit.h;
  }
  rec.ok('reference: a thrown ball\'s burst is drawn, at its usual 44px', refH !== null && Math.abs(refH - 44) < 1.5, { refH });
  await P.page.waitForTimeout(700);   /* let it finish, so it cannot be mistaken for the powder */

  /* ── THE BONK ── */
  /* The worker puts the powder halfway between him and the shield; stood this
     far off, halfway would be 170px from him, so the point is placed where a
     real bonk puts it -- about 18px from him, toward the player. */
  const dd = Math.hypot(me.x - snow.x, me.y - snow.y) || 1;
  const px = Math.round(snow.x + ((me.x - snow.x) / dd) * 18), py = Math.round(snow.y + ((me.y - snow.y) / dd) * 18);
  const LIFT = 34, SCALE = 0.75;   /* gameEvents.js: drawn at shield height, smaller than a thrown ball's */
  const bk = await emerge(P, { id: snow.id, ms: 2200, extra: {
    bonk: true, targetId: myId, dazeMs: DAZE_MS, px, py } });
  rec.ok('bonk: the event reached a real snowman', !bk.error, bk);
  if (!bk.error) {
    const q = bk.queued.find((b) => b.x === px && b.y === py - LIFT);
    const drawnPowder = [].concat(...bk.samples.map((s) => s.bursts)).filter((b) => Math.abs(b.x - px) < 1 && Math.abs(b.y - (py - LIFT)) < 1);
    const powderH = drawnPowder.length ? drawnPowder[0].h : null;
    /* "Comes up WITH him" = during the 600ms emerge.  Not a tighter window:
       under this box's slow headless clock the page's own timers slip, and the
       second run of this scenario took its first sample after 300ms, so a
       "within 300ms" check had nothing to look at and failed on no evidence.
       That the daze STARTS at once is pinned exactly by the stunIn check above;
       this one is about the ring being drawn, which needs a rendered frame. */
    const early = bk.samples.filter((s) => s.at <= 600);
    const during = bk.samples.filter((s) => s.at >= 300 && s.at <= DAZE_MS - 200);
    const afterDaze = bk.samples.filter((s) => s.at >= DAZE_MS + 250);
    rec.ok('bonk: he pops up -- the ordinary emerge animation plays', bk.after.phase === 'emerge', bk.after);
    rec.ok('bonk: powder is queued BETWEEN him and the shield, at shield height, marked small',
      !!q && q.scale === SCALE, { q, px, py, lift: LIFT });
    rec.ok('bonk: ...and DRAWN there', drawnPowder.length > 0, { px, py, seen: drawnPowder.slice(0, 2) });
    rec.ok('bonk: ...at a LITTLE powder: 0.75x a thrown ball\'s burst, measured on screen',
      powderH !== null && refH !== null && Math.abs(powderH / refH - SCALE) < 0.03, { powderH, refH });
    rec.ok('bonk: his daze starts at once, for the length the worker sent',
      Math.abs(bk.after.stunIn - DAZE_MS) < 120, { stunIn: bk.after.stunIn, want: DAZE_MS });
    rec.ok('bonk: the star ring is DRAWN over him as he pops up (within the emerge)', early.some((s) => s.stars),
      early.map((s) => [s.at, s.stars]));
    rec.ok('bonk: ...and stays up through the daze', during.length > 0 && during.every((s) => s.stars),
      during.filter((s) => !s.stars).map((s) => s.at));
    rec.ok('bonk: ...and is gone once it ends -- a second of confusion, not a permanent one',
      afterDaze.length > 0 && afterDaze.every((s) => !s.stars), afterDaze.map((s) => [s.at, s.stars]));
    rec.ok('bonk: the screen kicks for the player whose shield it hit', bk.after.shake > 0, bk.after);
    const hp1 = await hpOf(snow.id);
    rec.ok('guard: nothing fought him during the test, so what was drawn is the bonk\'s alone',
      hp0 !== null && hp1 === hp0, { hp0, hp1 });
  }

  /* ── CONTROL: an ordinary surfacing is untouched ── */
  await P.page.waitForTimeout(400);
  const plain = await emerge(P, { id: snow.id, ms: 700, extra: null });
  if (!plain.error) {
    const near = (b) => Math.hypot(b.x - px, b.y - (py - LIFT)) < 40;
    const anyBurst = plain.queued.some(near) || plain.samples.some((s) => s.bursts.some(near));
    rec.ok('control: an ordinary emerge still plays', plain.after.phase === 'emerge', plain.after);
    rec.ok('control: ...with no powder', !anyBurst, { queued: plain.queued });
    rec.ok('control: ...and no daze, no stars', plain.after.stunIn <= 0 && plain.samples.every((s) => !s.stars),
      { stunIn: plain.after.stunIn });
  }
  /* ── PICTURES, for a person to look at ──
     Assertions measure what they were written to measure; v2.3.2655's seam and
     v2.3.2654's quarter-turn footprints both passed every check and were caught
     by a screenshot -- and so was THIS feature's first cut: the star ring
     wedged under the snowman's HP bar and the powder white-on-snow, with every
     assertion above green.

     ONE SHOT PER BONK, and its real time recorded.  page.screenshot takes ~2s a
     frame on this box, so a burst of "60/150/260/900ms" shots was really a
     60ms shot followed by three taken after the 1.6s daze had ended -- which
     looked exactly like the stars vanishing, and was chased for an hour as a
     rendering bug before the in-page samples showed the ring drawn throughout.
     So each picture gets a FRESH bonk, and the mid-daze one stretches the daze
     (dazeMs is honoured up to 5s, gameEvents.js) so the camera can catch it. */
  await P.page.waitForTimeout(500);
  const clip = await P.page.evaluate((o) => {
    const S = window._gameState.current;
    const cv = document.querySelector('canvas');
    const r = cv.getBoundingClientRect();
    const sx = S._worldScaleX || 1, sy = S._worldScaleY || sx;
    const cx = r.left + (o.sx - S.camera.x) * sx, cy = r.top + (o.sy - S.camera.y) * sy;
    const x = Math.max(0, Math.round(cx - 110)), y = Math.max(0, Math.round(cy - 150));
    return { x, y, width: Math.min(220, window.innerWidth - x), height: Math.min(200, window.innerHeight - y) };
  }, { sx: snow.x, sy: snow.y });
  const shoot = async (name, dazeMs, waitMs) => {
    await P.page.evaluate((o) => {
      const S = window._gameState.current;
      window.__qaShotT0 = Date.now();
      window.__btDispatch({ type: 'monster_ability', payload: { monsterId: o.id, zone: S.currentZone,
        ability: 'burrow', phase: 'emerge', ms: 600, bonk: true, targetId: o.me, dazeMs: o.dazeMs, px: o.px, py: o.py } });
    }, { id: snow.id, me: myId, px, py, dazeMs });
    if (waitMs) await P.page.waitForTimeout(waitMs);
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/shieldbonk-${name}.png`, clip }).catch(() => {});
    const done = await P.page.evaluate(() => Date.now() - window.__qaShotT0);
    console.log(`    picture ${name}: finished ${done}ms after the bonk`);
    await P.page.waitForTimeout(Math.max(0, dazeMs - done) + 400);   /* let this daze end before the next */
  };
  await shoot('pop', DAZE_MS, 0);        /* the stars as he comes up (the 420ms powder is usually gone by the time this lands) */
  await shoot('daze', 5000, 700);        /* the stars mid-daze, daze stretched for the camera */

  /* THE REAL LAYOUT, for the picture only.  Everything above stands the
     player 300px off so no fight can touch the assertions -- which also puts
     the powder on the snowman himself, lost in his own emerge spray.  In a real
     bonk he is TOUCHING the shield, so the powder is between them.  Stand
     beside him with the shield up facing him (the fields mp-block uses) for
     this last capture; nothing is asserted from here on, so a fight cannot
     break the run. */
  const live = await P.page.evaluate((mid) => {
    const m = (window._gameState.current.monsters || []).find((x) => x.id === mid);
    return m && m.alive ? { x: m.x, y: m.y } : null;
  }, snow.id);
  let cpx = px, cpy = py;
  if (live) {
    await H.hopTo(P, live.x + 30, live.y + 2, { step: 100, gap: 260, tries: 40 });
    const me2 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    cpx = Math.round((live.x + me2.x) / 2); cpy = Math.round((live.y + me2.y) / 2);   /* the worker's own point */
    await P.page.evaluate((o) => {
      const S = window._gameState.current;
      S._shieldUp = true; S.shieldEnd = Date.now() + 5000;
      S._shieldAngle = Math.atan2(o.y - S.player.y, o.x - S.player.x);   /* facing him */
    }, live);
  }
  /* THE POWDER needs a faster camera than page.screenshot: it lives 420ms.
     Chromium's screencast hands over frames as the compositor makes them,
     stamped with when, so the burst can be caught mid-air. */
  try {
    const cdp = await P.page.context().newCDPSession(P.page);
    const frames = [];
    cdp.on('Page.screencastFrame', async (f) => {
      frames.push({ t: Date.now(), data: f.data });
      try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {}
    });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
    await P.page.waitForTimeout(300);
    const t0 = Date.now();
    await P.page.evaluate((o) => {
      const S = window._gameState.current;
      window.__btDispatch({ type: 'monster_ability', payload: { monsterId: o.id, zone: S.currentZone,
        ability: 'burrow', phase: 'emerge', ms: 600, bonk: true, targetId: o.me, dazeMs: 1600, px: o.px, py: o.py } });
    }, { id: snow.id, me: myId, px: cpx, py: cpy });
    await P.page.waitForTimeout(900);
    await cdp.send('Page.stopScreencast');
    const fs = await import('node:fs');
    let n = 0;
    for (const f of frames) {
      const dt = f.t - t0;
      if (dt < 0 || dt > 700 || n >= 6) continue;
      fs.writeFileSync(`${H.REPO}/tools/qa/mp/out/shieldbonk-cast-${String(dt).padStart(4, '0')}.png`, Buffer.from(f.data, 'base64'));
      n++;
    }
    console.log(`    screencast: ${frames.length} frames, ${n} saved from the first 700ms`);
  } catch (e) { console.log('    screencast unavailable: ' + (e && e.message)); }
}
