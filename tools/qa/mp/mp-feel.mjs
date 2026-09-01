/* A HIT LANDS WHEN THE BLADE DOES, AND THE TARGET SHOWS IT (v2.3.2200).
 *
 * Owner: combat feels "floaty".  Three mechanical causes, three assertions:
 *
 * 1. CONTACT SYNC.  The melee sweep used to run on frame 0 of the 300ms
 *    swing — popup/knockback/sound while the blade was still winding up.
 *    Now the hit-test waits MELEE_CONTACT_MS (120).  Asserted as the gap
 *    between the swing start and the target's hit-react stamp, with an
 *    early sample as the control (no hit inside the first ~100ms).
 *
 * 2. UNIVERSAL RECOIL.  _hitAnimStart used to be stamped only by our own
 *    local hit sites, and _hitFlash was written by every monster_hit and
 *    read by NOTHING — a teammate's hits moved nothing on screen.  Both
 *    now render for every archetype (squash fallback + 120ms tint pulse),
 *    read through the __btMonsterHitReact probe because neither survives
 *    a single screenshot.
 *
 * 3. GROUND MARKS.  Hits leave material-tinted decals that expire on the
 *    8s TTL (owner: "stays for about 5-10 seconds").  Spawn chance is
 *    rolled per hit, so the spawn assertion pins Math.random while it
 *    dispatches — the wiring is under test, not the coin.
 */
import * as H from './harness.mjs';

const reactOf = (P, id) => P.page.evaluate((mid) => {
  const r = window.__btMonsterHitReact;
  return r ? r(mid) : null;
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Feeler', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* An adjacent slime (fodder — sprite-backed via the GLOBAL preload, so
     the body-sprite probe works in town; a raw brute would render as an
     emoji there, which live zones never do), and a sword to hit it with
     (fresh QA characters may be bare-handed). */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg && !S.rpg.weapon) S.rpg.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1 };
    S._facing = 'right';
    S.monsters = (S.monsters || []).concat([{
      /* statuses is not optional — see the mp-windup note. */
      id: 'qa-feel', x: S.player.x + 40, y: S.player.y, hp: 400, maxHp: 400,
      curHp: 400, alive: true, arch: 'fodder', type: 'fodder', level: 3,
      statuses: {}, vx: 0, vy: 0, atkCd: 0, spawnX: S.player.x + 40, spawnY: S.player.y,
    }]);
  });
  await P.page.waitForTimeout(700);

  /* ── 1. contact sync ── start a swing exactly the way swingAttack does. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.id === 'qa-feel');
    if (m) { m._hitAnimStart = 0; m._hitAnimEnd = 0; m._hitThisSwing = false; }
    S.swingTimer = Date.now();
    S.isSwinging = true;
  });
  await P.page.waitForTimeout(60);
  const early = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.id === 'qa-feel');
    return m ? { hitAt: m._hitAnimStart || 0 } : null;
  });
  rec.ok('CONTROL: ~60ms into the swing the blade has not connected yet',
    !!(early && early.hitAt === 0), early);

  await H.waitFor(P,
    (S) => { const m = (S.monsters || []).find((x) => x.id === 'qa-feel'); return m ? { hitAt: m._hitAnimStart || 0, sw: S.swingTimer } : null; },
    (r) => !!(r && r.hitAt > 0),
    { timeout: 3000, label: 'melee hit lands' });
  const timing = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.id === 'qa-feel');
    return { delta: (m._hitAnimStart || 0) - S.swingTimer };
  });
  rec.ok('the hit registers ON contact: >=110ms after the swing input (MELEE_CONTACT_MS)',
    timing.delta >= 110 && timing.delta < 450, timing);

  /* ── 2. universal recoil ── sample the body sprite through the window. */
  const samples = [];
  for (let i = 0; i < 8; i++) {
    const s = await reactOf(P, 'qa-feel');
    if (s) samples.push({ sy: +s.sy.toFixed(3), tint: s.tint });
    await P.page.waitForTimeout(45);
  }
  const sys = samples.map((s) => s.sy);
  rec.ok('the slime SQUASHES on the hit (body y-scale dips >=10%)',
    sys.length > 2 && Math.min(...sys) < Math.max(...sys) * 0.9, { sys });
  /* (the 120ms flash is asserted on the peer hit below, where the test
     controls the sampling moment — waitFor's polling latency here can
     outlive the whole window and made the assertion flaky) */

  /* A FOREIGN attacker's hit must recoil it too — the fix for "peer hits
     show nothing".  Same wire event the worker sends. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.id === 'qa-feel');
    if (m) { m._hitAnimStart = 0; m._hitAnimEnd = 0; }
  });
  await P.page.waitForTimeout(500);
  await P.page.evaluate(() => {
    window.__btDispatch({
      type: 'monster_hit',
      payload: { monsterId: 'qa-feel', attackerId: 'qa-someone-else', dmg: 5, hpPct: 0.9, isCrit: false },
    });
  });
  await P.page.waitForTimeout(80);
  const peer = await reactOf(P, 'qa-feel');
  rec.ok('a PEER\'s hit stamps the recoil window (was: own hits only)',
    !!(peer && peer.hitEnd > peer.hitStart && Date.now() >= 0 && peer.hitStart > 0), peer);
  rec.ok('...and the 120ms hit-flash tint fired on it (0xff8080)',
    !!(peer && peer.tint === 0xff8080), peer && { tint: peer.tint, flash: peer.flash });

  /* ── 3. ground marks ── pin the coin so the wiring is what's tested. */
  const decals = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.groundSplatter = [];
    const realRandom = Math.random;
    Math.random = () => 0;   /* chance gates pass, spreads collapse to centre */
    try {
      window.__btDispatch({
        type: 'monster_hit',
        payload: { monsterId: 'qa-feel', attackerId: 'qa-someone-else', dmg: 5, hpPct: 0.8, isCrit: false },
      });
    } finally { Math.random = realRandom; }
    return { count: (S.groundSplatter || []).length, first: (S.groundSplatter || [])[0] || null };
  });
  rec.ok('a hit leaves a ground mark (material decal spawned)',
    decals.count >= 1 && !!decals.first, decals);

  /* TTL: age the mark past 8s and the cleanup pass must reap it. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    (S.groundSplatter || []).forEach((d) => { d.ts -= 9000; });
  });
  await P.page.waitForTimeout(250);
  const afterTtl = await P.page.evaluate(() => (window._gameState.current.groundSplatter || []).length);
  rec.ok('...and it expires on the 8s TTL (owner: 5-10 seconds)',
    afterTtl === 0, { afterTtl });

  await P.ctx.close().catch(() => {});
}
