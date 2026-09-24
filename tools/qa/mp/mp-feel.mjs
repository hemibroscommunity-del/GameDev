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
 * 3. GROUND MARKS.  Hits leave marks that stay about 5-10 seconds (owner).
 *    v2.3.2823: the marks are the material's own landed pieces
 *    (hitMaterialFx) -- the soft decal that used to sit beside them is
 *    retired.
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

  /* ── 3. ground marks ──
     v2.3.2823: the mark is the material's own pieces now.  A hit used to add a
     soft tinted decal (S.groundSplatter) beside its debris; the material
     reaction (rendering/hitMaterialFx.js) retired it, because the pieces that
     come down and LIE there are the mark -- crisp slime puddles, snow lumps,
     blood spots, bone shards -- for the burst's ~5 s (owner: "stays for about
     5-10 seconds").  So this asserts the mark the player actually sees: a
     peer's hit leaves pieces on the ground, and they are still there well
     after they land.  The wait first: section 2's hit landed on this same
     slime a moment ago, and the renderer (rightly) folds two bursts on one
     monster inside 150 ms into one -- this hit must be its own. */
  await P.page.waitForTimeout(400);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._debrisBursts) S._debrisBursts.length = 0;
    S.groundSplatter = [];
    window.__btDispatch({
      type: 'monster_hit',
      payload: { monsterId: 'qa-feel', attackerId: 'qa-someone-else', dmg: 5, hpPct: 0.8, isCrit: false, slot: 'melee' },
    });
  });
  await P.page.waitForTimeout(1400);
  const marks = await P.page.evaluate(() => ({
    db: window.__btDebris ? window.__btDebris() : null,
    decals: (window._gameState.current.groundSplatter || []).length,
  }));
  const mark = marks.db && marks.db[marks.db.length - 1];
  rec.ok('a hit leaves marks on the ground: its pieces land and lie there (v2.3.2823)',
    !!(mark && mark.landed > 0 && mark.age > 1000), marks);
  rec.ok('...lasting within the owner\'s 5-10 s', !!(mark && mark.ms >= 5000 && mark.ms <= 10000), mark);
  rec.ok('...a peer\'s blade reads as a blade (the worker\'s slot names the weapon)', !!(mark && mark.weapon === 'sword'), mark);
  rec.ok('...and no soft decal is laid beside them any more', marks.decals === 0, marks);
  await P.page.waitForTimeout(4500);   /* let it expire before section 4 */

  /* ═══ 4. THE DEBRIS BURST IS A THING YOU CAN SEE (v2.3.2504) ═══
     Owner (§5.8): "Debris → use the fallback art for now.  Lane F1 makes the
     fallback burst and decals last about 5 s and read clearly; no sheets
     needed."

     THE HIT PATH WAS NEVER THE PROBLEM.  Section 3 above already proves a hit
     spawns debris, and it has since v2.3.2200.  What was wrong is that none of
     the five DEBRIS_BURSTS sheets exist under public/sprites/effects/, so every
     hit in the shipped game takes the PLACEHOLDER branch -- and the placeholder
     was six dots that vanished in 450ms.  The owner was not looking at a broken
     effect, he was looking at scaffolding.

     So this asserts the placeholder's own contract, which is now the shipping
     one: it runs for about five seconds, and the chunks LAND rather than
     continuing into orbit.  The landing is the half that makes five seconds
     legible instead of absurd -- at the old parametric flight a chunk would be
     some 5400px below the monster by the end of a 5s burst -- and it is
     invisible to every other measure, including a screenshot. */
  const burst = await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._debrisBursts) S._debrisBursts.length = 0;
    window.__btDispatch({
      type: 'monster_hit',
      payload: { monsterId: 'qa-feel', attackerId: 'qa-someone-else', dmg: 5, hpPct: 0.7, isCrit: false },
    });
    return true;
  });
  await P.page.waitForTimeout(300);
  const dbEarly = await P.page.evaluate(() => (window.__btDebris ? window.__btDebris() : null));
  rec.ok('a hit spawns a debris burst the renderer is actually holding',
    !!(dbEarly && dbEarly.length >= 1 && dbEarly[0].parts > 0), { burst, dbEarly });
  if (dbEarly && dbEarly.length) {
    /* ABOUT FIVE SECONDS, asserted as the burst's own declared lifetime rather
       than by waiting five seconds and looking -- the sheet path keeps its
       450ms (it is the pacing of an 8-frame strip, not a taste call) and the
       two clocks must stay separable.  `sheet: false` is the guard that says
       this run really is measuring the placeholder. */
    rec.ok(`...on the placeholder path, running ~5s not ~0.45s (ms: ${dbEarly[0].ms})`,
      dbEarly[0].sheet === false && dbEarly[0].ms >= 4000 && dbEarly[0].ms <= 6000, dbEarly[0]);
    /* Still at full strength a beat in: the old placeholder faded from frame
       one, so a "5 second" effect that starts dying immediately would read as
       the same flicker with a longer tail. */
    rec.ok(`...and still at full strength 300ms in (alpha ${dbEarly[0].alpha})`,
      dbEarly[0].alpha != null && dbEarly[0].alpha > 0.9, dbEarly[0]);
  }
  /* The chunks come down.  ~1s is well past the longest computed arc, so all
     of them should be resting on the ground by now. */
  await P.page.waitForTimeout(1100);
  const mid = await P.page.evaluate(() => (window.__btDebris ? window.__btDebris() : null));
  rec.ok('...the chunks LAND and lie there instead of flying off into orbit',
    !!(mid && mid.length && mid[0].landed === mid[0].parts && mid[0].parts > 0), mid && mid[0]);
  rec.ok('...and the burst is still on screen well past the old 450ms',
    !!(mid && mid.length && mid[0].age > 1200), mid && mid[0]);
  /* A PICTURE, because "reads clearly" is the half of the ask no number can
     answer -- the assertions above can prove a burst is alive and landed and
     still say nothing about whether a player can SEE it (TRAPS §21: a mark the
     same colour as the ground satisfies every count). Cropped tight on the
     slime from its own reported position, the mp-arrowshot posture. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._debrisBursts = S._debrisBursts || [];
  });
  const debrisBox = await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (!S || !S.player || !S.camera) return null;
    const r = document.querySelector('canvas').getBoundingClientRect();
    const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
    /* Anchored on the PLAYER, not on the monster: the slime is 40px east of
       him and the burst lands between them, and the player's position is the
       one field that is never absent from the state this scenario leaves
       behind. */
    const cx = r.left + (S.player.x + 20 - S.camera.x) * kx;
    const cy = r.top + (S.player.y - S.camera.y) * ky;
    const half = 120;
    const x = Math.max(0, Math.round(cx - half)), y = Math.max(0, Math.round(cy - half));
    return { x, y, width: Math.min(innerWidth - x, half * 2), height: Math.min(innerHeight - y, half * 2) };
  });
  if (debrisBox && debrisBox.width > 40) {
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/feel-debris.png`, clip: debrisBox })
      .catch(() => {});
    console.log('    debris crop -> tools/qa/mp/out/feel-debris.png');
  }
  /* AND IT ENDS.  A burst that never expires is a leak, and this renderer
     pools sprites -- v2.3.2272 is the version that had to go find a bounded
     residue that nothing was releasing. */
  await P.page.waitForTimeout(5200);
  const gone = await P.page.evaluate(() => (window.__btDebris ? window.__btDebris() : null));
  rec.ok('...then it is reaped, rather than leaking sprites for the life of the page',
    !!gone && gone.length === 0, gone);

  await P.ctx.close().catch(() => {});
}
