/* ═══ THE BURROWING SNOWMAN, ON THE SECOND VISIT TO FROST (v2.3.2309) ═══
 *
 * Owner: "Sometimes the burrow snowman sprite disappears. Then once that stage
 * is complete he reappears."
 *
 * "SOMETIMES" WAS THE WHOLE CLUE.  The first visit to the Frost Ridge is
 * always perfect.  Leaving the zone frees the snowman's art
 * (unloadSnowmanSprites -> unloadBundle destroys the sources), and the reset
 * list covered every piece of module state EXCEPT the three burrow strips --
 * which loadStrip APPENDS to.  So the second visit stacked eight fresh frames
 * on top of eight whose pixels were gone, phaseFrameCount answered 16, and the
 * renderer indexed across the lot: the dig and the emerge drew nothing for
 * their first half, the pile blinked, and the moment the phase ended the idle
 * sheets (which WERE reset) put him back.  Exactly the report.
 *
 * WHY A TEST HAS TO LOOK AT THE TEXTURE, NOT AT `visible`.  A Sprite holding a
 * destroyed texture is still visible:true, still scaled, still parented, and
 * draws NOTHING without a warning.  Every probe in the tree said the snowman
 * was fine.  So this file asserts on the SOURCE behind the frame, and it
 * separates the three failures that look identical to a player:
 *   nothing drawn      -> sprite visible, texture dead   (this bug)
 *   wrong art drawn    -> sprite dark, procedural body lit
 *   no monster at all  -> not in S.monsters
 */
import * as H from './harness.mjs';

const PHONES = { width: 390, height: 844 };

const sheets = (P) => P.page.evaluate(() =>
  (window.__btSnowmanSheets ? window.__btSnowmanSheets() : null));

const zoneOf = (P) => H.readState(P, (S) => S.currentZone);

/* Ride the test panel's own warp driver -- the field the panel sets, nothing
   more -- so every leg is a REAL zone entry: the per-zone preload behind the
   overlay on the way in, and freeZoneAssets on the way out. A synthetic
   `move` would skip both, which are the two halves of this bug. */
const warpTo = async (P, zone, tries = 45) => {
  await P.page.evaluate((z) => {
    const S = window._gameState && window._gameState.current;
    if (S) S._devWarp = { to: z, legs: 0, t: Date.now(), nextAt: 0 };
  }, zone);
  for (let i = 0; i < tries; i++) {
    await P.page.waitForTimeout(1000);
    if ((await zoneOf(P)) === zone) return true;
  }
  return false;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Chill', wsPort, webPort, viewport: PHONES, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  const myId = await H.readState(P, (S) => S.myId);

  /* Open every gate on the WORKER, so the client's own courtesy gate and the
     server's real one both pass. Straight to the admin route rather than
     through the panel: the panel is mp-devpanel's subject, not this file's. */
  await fetch('http://127.0.0.1:' + wsPort + '/api/admin/dev/quests', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId }),
  }).catch(() => {});
  await P.page.waitForTimeout(1500);

  /* ── 1. FIRST VISIT: the baseline everybody has always seen ── */
  const got1 = await warpTo(P, 'frost');
  rec.ok('we can reach the Frost Ridge at all (guard)', got1, { zone: await zoneOf(P) });
  await P.page.waitForTimeout(1500);
  const s1 = await sheets(P);
  console.log('    FIRST VISIT  -> ' + JSON.stringify(s1 && s1.phases));
  rec.ok('the burrow art loads on the first visit (guard)',
    !!s1 && !!s1.phases && ['burrow', 'pile', 'emerge'].every((k) => s1.phases[k].frames > 0),
    s1 && s1.phases);
  const baseline = s1 && s1.phases ? s1.phases.pile.frames : 0;

  /* ── 2. LEAVE, AND COME BACK ──
     The whole bug lives in this round trip. */
  const out = await warpTo(P, 'worldview');
  rec.ok('we can leave the zone (guard)', out, { zone: await zoneOf(P) });
  await P.page.waitForTimeout(1200);
  const sOut = await sheets(P);
  console.log('    AFTER LEAVING -> ' + JSON.stringify(sOut && sOut.phases));
  /* Leaving must actually release them, or the round trip proves nothing and
     the ~17.5MB the per-zone split exists to reclaim is still resident. */
  rec.ok('leaving frost releases the burrow strips, not just the idle ones',
    !!sOut && !!sOut.phases && ['burrow', 'pile', 'emerge'].every((k) => sOut.phases[k].frames === 0),
    sOut && sOut.phases);

  const back = await warpTo(P, 'frost');
  rec.ok('we can come back (guard)', back, { zone: await zoneOf(P) });
  await P.page.waitForTimeout(1800);
  const s2 = await sheets(P);
  console.log('    SECOND VISIT -> ' + JSON.stringify(s2 && s2.phases));

  /* THE ROOT CAUSE, MEASURED.  Two separate failures, and they need separate
     assertions: the strips must not have GROWN (the append), and not one frame
     may point at a destroyed source (what makes the growth invisible rather
     than merely wasteful). */
  rec.ok('the strips do not grow on a return visit',
    !!s2 && !!s2.phases && ['burrow', 'pile', 'emerge'].every((k) => s2.phases[k].frames === baseline),
    { baseline, second: s2 && s2.phases });
  rec.ok('...and every burrow frame still has live pixels behind it',
    !!s2 && !!s2.phases && ['burrow', 'pile', 'emerge'].every((k) => s2.phases[k].dead === 0),
    s2 && s2.phases);

  /* ── 3. WHAT IS ACTUALLY ON SCREEN ──
     The arrays are the cause; this is the symptom. Find a real server-spawned
     snowman, put him through the three phases exactly as the wire handler does
     (gameEvents.js sets these three fields and nothing else on
     monster_ability), and read what the RENDERER left behind on every sample. */
  const mons = await H.readState(P, (S) => (S.monsters || [])
    .filter((m) => m && m.alive)
    .map((m) => ({ id: m.id, arch: m.arch, x: m.x, y: m.y })));
  console.log('    MONSTERS IN FROST -> ' + JSON.stringify(mons.slice(0, 6)));
  const snow = mons.find((m) => m.arch === 'snowman');
  rec.ok('frost has a real server snowman to watch (guard)', !!snow, mons.slice(0, 6));

  if (snow) {
    /* Stand next to him so he is on screen and inside any draw range. */
    await P.page.evaluate((s) => {
      const S = window._gameState && window._gameState.current;
      if (S && S.player) { S.player.x = s.x + 40; S.player.y = s.y + 10; }
    }, snow);
    await P.page.waitForTimeout(1400);

    const phases = [
      { phase: 'dig', ms: 600 },
      { phase: 'pile', ms: 3000 },
      { phase: 'emerge', ms: 600 },
    ];
    const samples = [];
    for (const ph of phases) {
      const rows = await P.page.evaluate(({ id, phase, ms }) => new Promise((res) => {
        const S = window._gameState && window._gameState.current;
        const m = (S.monsters || []).find((x) => x && x.id === id);
        if (!m) { res([]); return; }
        /* EXACTLY what gameEvents.js does on monster_ability -- three fields,
           no more. The wire path is not what is under test here; the sheets
           and the renderer are. */
        m._burPhase = phase;
        m._burFrom = Date.now();
        m._burUntil = Date.now() + ms;
        m._invulnerable = phase === 'pile';
        const out = [];
        const t0 = Date.now();
        const iv = setInterval(() => {
          const el = Date.now() - t0;
          const s = window.__btMonsterSprite ? window.__btMonsterSprite(id) : null;
          if (s) out.push({ at: el, v: s.visible, alive: s.texAlive, srcW: s.srcW, body: s.bodyVisible });
          if (el >= ms - 60) {
            clearInterval(iv);
            m._burPhase = null; m._invulnerable = false;
            res(out);
          }
        }, 60);
      }), { id: snow.id, phase: ph.phase, ms: ph.ms });
      samples.push({ phase: ph.phase, rows });
      await P.page.waitForTimeout(400);
    }

    for (const s of samples) {
      const drawn = s.rows.filter((r) => r.v && r.alive).length;
      const holes = s.rows.filter((r) => r.v && !r.alive).length;
      const fellBack = s.rows.filter((r) => !r.v && r.body).length;
      console.log('    ' + s.phase + ': ' + s.rows.length + ' samples, drawn ' + drawn
        + ', HOLES ' + holes + ', procedural fallback ' + fellBack);
    }
    const allRows = samples.flatMap((s) => s.rows);
    /* A guard sized to what a real phone-viewport page actually delivers: the
       dig and the emerge are 600ms each, and a 60ms interval inside an
       evaluate does not get 10 turns in that window -- it gets three. What
       must not happen is a phase contributing NOTHING, which would make the
       two assertions below vacuous for it. */
    rec.ok('every phase actually sampled (guard)',
      allRows.length >= 12 && samples.every((s) => s.rows.length >= 2),
      { total: allRows.length, per: samples.map((s) => ({ phase: s.phase, n: s.rows.length })) });
    /* THE HEADLINE. A hole is a sprite the renderer believes it drew, over a
       texture with no pixels -- the owner's "he disappears". */
    rec.ok('the burrowing snowman is never a hole in the screen',
      allRows.length > 0 && allRows.every((r) => !(r.v && !r.alive)),
      samples.map((s) => ({ phase: s.phase, holes: s.rows.filter((r) => r.v && !r.alive).length })));
    /* And he is positively DRAWN, not merely "not a hole" -- a phase that fell
       through to the procedural body every frame would pass the line above
       while still not showing the mound the owner is asking about. */
    rec.ok('...and he is drawn from the burrow art the whole way through',
      samples.every((s) => s.rows.length > 0 && s.rows.every((r) => r.v && r.alive)),
      samples.map((s) => ({ phase: s.phase, drawn: s.rows.filter((r) => r.v && r.alive).length, of: s.rows.length })));
  }

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/snowburrow.png` }).catch(() => {});
  await P.ctx.close();
}
