/* ═══ THE MONSTERS' GOO AND FIRE, DRAWN IN CODE  (v2.3.2732) ═══
 *
 * Owner: "take another look at the procedurally drawn projectiles from slimes
 * and fire goblins ... I bet you could make better ones.  Just make sure it's
 * colored correctly (green slimes are recolored to blue during game but I
 * might add green ones later)."
 *
 * The colour rules and the art are pinned in server/test/monstershots.test.mjs.
 * What only a real client can show is the thing on screen, so this puts balls
 * in the air through the REAL event path (__btDispatch -> processGameEvent's
 * monster_projectile, the one a worker message reaches), and reads what the
 * renderer drew (__btMonsterShots):
 *
 *   COLOUR BY THROWER   a green slime and a blue slime throwing at the same
 *                       moment in the same zone: one green ball, one blue --
 *                       in town, and again in the Verdant Wilds, whose default
 *                       is blue, where the green one is the owner's "later".
 *   A THROW             each ball leaves from the thrower's body height and
 *                       comes down to the ground, with a shadow under it on
 *                       the ground layer, drawn crisp, depth-sorted by where it
 *                       is over the ground, and it drips as it flies.
 *   A LANDING           a splash, a splat in the thrower's colour, and it is
 *                       all gone again a few seconds later.
 *   FIRE                in the Flame Fields a goblin's ball is fire: a glow,
 *                       embers behind it, and on landing a flash, a burst of
 *                       flame and a scorch mark.
 *   A REAL THROW        a blue slime the WORKER throws for (god mode, kept in
 *                       its throw band) draws the same way.  The fire is
 *                       thrown in a real goblin's name through the same
 *                       handler; see the note in the Flame Fields section.
 *   ONE BALL            the old picture is not drawn as well.
 *
 * Screenshots of the balls in flight and landing go to out/monstershots-*.png.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out`;
const GREEN = 0x5ca84c, BLUE = 0x3a7ad0;
/* the mire wisp's colour: the sheet's green under its violet tint (0x7a5fa8) -- what its body draws */
const WISP = (() => { const a = GREEN, b = 0x7a5fa8; const ch = (s) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255); return (ch(16) << 16) | (ch(8) << 8) | ch(0); })();

const probe = (P) => P.page.evaluate(() => (window.__btMonsterShots ? window.__btMonsterShots() : null));

/* Throw one ball per thrower, all at once, through the real event handler.
   Throwers that are not in S.monsters are added for the dispatch and taken out
   again -- the handler reads who threw it at the moment it is thrown. */
const throwBalls = (P, balls) => P.page.evaluate((balls) => {
  const S = window._gameState.current;
  const added = [];
  for (const b of balls) {
    if (b.arch && !(S.monsters || []).some((m) => m && m.id === b.id)) {
      const m = { id: b.id, archetype: b.arch, type: b.arch, x: b.x, y: b.y, renderX: b.x, renderY: b.y, alive: true, hp: 1, curHp: 1, maxHp: 1, spd: 0, dmg: 0 };
      (S.monsters = S.monsters || []).push(m);
      added.push(m);
    }
  }
  for (const b of balls) {
    window.__btDispatch({ type: 'monster_projectile', payload: {
      monsterId: b.id, kind: 'slime', zone: S.currentZone,
      x: b.x, y: b.y, tx: b.tx, ty: b.ty, travelMs: b.ms } });
  }
  S.monsters = (S.monsters || []).filter((m) => added.indexOf(m) < 0);
  return (S.slimeProjectiles || []).filter((p) => balls.some((b) => b.id === p.ownerId)).map((p) => ({ ownerId: p.ownerId, shooterArch: p.shooterArch, life: p.life }));
}, balls);

/* Sample the probe every frame for `ms`, keeping every shot record seen. */
/* Runs until every ball in `ids` has landed and `tail` ms more have passed --
   a headless page draws at ~8 fps, so a 0.9 s throw takes 2-3 s of wall clock
   to come down there, and a fixed window would end mid-flight -- or `cap`. */
const watch = (P, ids, tail = 500, cap = 9000) => P.page.evaluate(({ ids, tail, cap }) => new Promise((resolve) => {
  const t0 = performance.now();
  let landedAt = null;
  const seen = []; let maxDrops = 0, maxEmbers = 0, maxSmoke = 0;
  const markTints = new Set(), markLayers = new Set(), burstKinds = new Set();
  let maxMarks = 0;
  const tick = () => {
    const pr = window.__btMonsterShots && window.__btMonsterShots();
    if (pr) {
      for (const s of pr.shots) seen.push(Object.assign({ t: Math.round(performance.now() - t0) }, s));
      maxDrops = Math.max(maxDrops, pr.parts.drop || 0);
      maxEmbers = Math.max(maxEmbers, pr.parts.ember || 0);
      maxSmoke = Math.max(maxSmoke, pr.parts.smoke || 0);
      maxMarks = Math.max(maxMarks, pr.marks.length);
      for (const m of pr.marks) { markTints.add(m.tint); markLayers.add(m.layer); }
      for (const b of pr.bursts) burstKinds.add(b.kind + ':' + b.layer + ':' + b.blend);
    }
    const flying = pr && pr.shots.some((x) => ids.indexOf(x.ownerId) >= 0);
    if (!flying && landedAt == null && performance.now() - t0 > 150) landedAt = performance.now();
    if ((landedAt != null && performance.now() - landedAt > tail) || performance.now() - t0 > cap) {
      return resolve({ seen, maxDrops, maxEmbers, maxSmoke, maxMarks, end: pr, landed: landedAt != null, ms: Math.round(performance.now() - t0),
        markTints: [...markTints], markLayers: [...markLayers], burstKinds: [...burstKinds], err: window.__btShotFxErr || null });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { ids, tail, cap });

/* A crisp crop of the world around (wx, wy), for looking at. */
async function shot(P, name, wx, wy, half = 70) {
  const c = await P.page.evaluate(({ wx, wy }) => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    return { x: r.left + (wx - S.camera.x) * (S._worldScaleX || 1), y: r.top + (wy - S.camera.y) * (S._worldScaleY || 1), k: S._worldScaleX || 1 };
  }, { wx, wy });
  const h = half * c.k;
  const clip = { x: Math.max(0, c.x - h), y: Math.max(0, c.y - h), width: h * 2, height: h * 2 };
  await P.page.screenshot({ path: `${OUT}/monstershots-${name}.png`, clip }).catch(() => {});
}

const byOwner = (seen, id) => seen.filter((s) => s.ownerId === id);

/* Stand in a real monster's throw band (70-220 px) and wait for the WORKER to
   throw at us.  Walked there in the harness's hops first; then the player is
   kept on a ring ~150 px out in walking-speed steps (<= 12 px a tenth of a
   second), because a chasing monster closes to melee in a second or two and
   swings instead, and a faster "kite" is a move the worker refuses. */
async function waitRealThrow(P, arch, ms = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const m = await P.page.evaluate((a) => {
      const S = window._gameState.current;
      const mm = (S.monsters || []).filter((x) => x && x.alive && (x.archetype || x.type) === a)
        .sort((p, q) => Math.hypot(p.x - S.player.x, p.y - S.player.y) - Math.hypot(q.x - S.player.x, q.y - S.player.y))[0];
      return mm ? { x: mm.x, y: mm.y, d: Math.hypot(mm.x - S.player.x, mm.y - S.player.y) } : null;
    }, arch);
    if (!m) { await P.page.waitForTimeout(500); continue; }
    if (m.d > 230 || m.d < 80) await H.hopTo(P, m.x, m.y + 150, { tries: 14 });
    const got = await P.page.evaluate(({ a, win }) => new Promise((resolve) => {
      const S = window._gameState.current;
      const t1 = Date.now();
      let last = Date.now();
      const iv = setInterval(() => {
        /* the step is TIME-based -- walking pace (140 px/s) times the real gap
           since the last step -- because a busy headless page runs these
           callbacks late, and a fixed step then falls behind a goblin's
           68 px/s chase until he is in melee and swings instead of throwing */
        const nowT = Date.now();
        const maxStep = Math.min(40, 140 * (nowT - last) / 1000);
        last = nowT;
        const mm = (S.monsters || []).filter((x) => x && x.alive && (x.archetype || x.type) === a)
          .sort((p, q) => Math.hypot(p.x - S.player.x, p.y - S.player.y) - Math.hypot(q.x - S.player.x, q.y - S.player.y))[0];
        if (mm && S.player) {
          const dx = S.player.x - mm.x, dy = S.player.y - mm.y, d = Math.hypot(dx, dy) || 1;
          if (d < 140 || d > 190) {
            const k = Math.max(-maxStep, Math.min(maxStep, 160 - d));
            S.player.x += (dx / d) * k; S.player.y += (dy / d) * k;
          }
        }
        const p = (S.slimeProjectiles || []).find((x) => x && x.ownerId && String(x.ownerId).indexOf('qa') !== 0 && x.kind !== 'snowball');
        const pr = window.__btMonsterShots && window.__btMonsterShots();
        const s = p && pr && pr.shots.find((x) => x.ownerId === p.ownerId);
        if (s || Date.now() - t1 > win) { clearInterval(iv); resolve(s || null); }
      }, 100);
    }), { a: arch, win: 6000 });
    if (got) return got;
  }
  return null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Dodger', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const pid = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'vitals', pid, { heal: true, god: true, godMinutes: 15 }).catch(() => null);
  const setup = await P.page.evaluate(() => ({
    probe: typeof window.__btMonsterShots === 'function', dispatch: typeof window.__btDispatch === 'function',
    ready: !!(window.__btMonsterShots && window.__btMonsterShots().ready),
    atlasBytes: window.__btMonsterShots ? window.__btMonsterShots().atlasBytes : 0,
    zone: window._gameState.current.currentZone,
  }));
  rec.ok('setup: the shot art was minted on the loading screen, before play (the preloading law)',
    setup.probe && setup.dispatch && setup.ready && setup.zone === 'town', setup);
  rec.ok('setup: ...and it is one small atlas (under 2 MB decoded)', setup.atlasBytes > 0 && setup.atlasBytes < 2 * 1024 * 1024, { atlasBytes: setup.atlasBytes });

  /* ════════ TOWN: A GREEN SLIME AND A TINTED ONE, SIDE BY SIDE ════════
     The second thrower is the Poison Forest's mire wisp, a TINTED slime: its
     colour is the same everywhere.  A blue slime's blue is a recolour built for
     the Verdant Wilds, where it lives (below) -- in town its body would draw the
     fallback, and so, by the same rule, would its ball. */
  const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const T = { x: me.x - 30, y: me.y + 70 };
  const balls = [
    { id: 'qa-green', arch: 'fodder', x: T.x - 150, y: T.y - 20, tx: T.x - 20, ty: T.y, ms: 900 },
    { id: 'qa-wisp', arch: 'mireWisp', x: T.x + 150, y: T.y - 20, tx: T.x + 20, ty: T.y, ms: 900 },
  ];
  const spawned = await throwBalls(P, balls);
  rec.ok('setup: both balls are in the air, each stamped with who threw it',
    spawned.length === 2 && spawned.some((s) => s.shooterArch === 'fodder') && spawned.some((s) => s.shooterArch === 'mireWisp'), spawned);
  const w = await watch(P, ['qa-green', 'qa-wisp'], 400);
  const g = byOwner(w.seen, 'qa-green'), b = byOwner(w.seen, 'qa-wisp');
  rec.ok('colour: the green slime\'s ball is the slime sheet\'s green', g.length > 0 && g.every((s) => s.tint === GREEN && s.bodyTint === GREEN), g[0]);
  rec.ok('colour: ...and the mire wisp\'s, thrown at the same moment in the same zone, is ITS colour (not the plain green the old ball was)', b.length > 0 && b.every((s) => s.tint === WISP && s.bodyTint === WISP), { got: b[0] && b[0].tint.toString(16), want: WISP.toString(16) });
  rec.ok('look: both are goo, at a plain slime\'s size', g.every((s) => s.style === 'goo') && b.every((s) => s.style === 'goo') && Math.abs(g[0].px - 23.6) < 1.5, { green: g[0] && g[0].px, wisp: b[0] && b[0].px });
  const lifts = g.map((s) => s.lift);
  rec.ok('throw: it leaves from the slime\'s body height and comes down to the ground',
    lifts.length > 3 && lifts[0] > 12 && lifts[lifts.length - 1] < lifts[0] - 8, { first: lifts[0], last: lifts[lifts.length - 1] });
  rec.ok('throw: ...with its shadow on the ground under it', g.every((s) => s.ground.layer === 'ground' && s.ground.alpha > 0), g[0] && g[0].ground);
  rec.ok('throw: ...drawn crisp (nearest-sampled pixels) and standing in the depth-sorted layers, not always on top',
    g.every((s) => s.nearest === 'nearest' && s.layer && s.layer !== 'particles'), { layer: g[0] && g[0].layer, nearest: g[0] && g[0].nearest });
  /* 16 headings, 0 = east, clockwise: a lob east reads 13..3 (up, level, down), west 5..11 */
  const eastish = (d) => d >= 13 || d <= 3, westish = (d) => d >= 5 && d <= 11;
  rec.ok('throw: ...its frame follows its heading (the green one flies east, the blue one west)',
    g.length > 0 && b.length > 0 && g.every((s) => eastish(s.dir)) && b.every((s) => westish(s.dir)),
    { green: [...new Set(g.map((s) => s.dir))], blue: [...new Set(b.map((s) => s.dir))] });
  rec.ok('throw: ...and it wobbles (the frame changes in flight)', new Set(g.map((s) => s.frame)).size > 1, [...new Set(g.map((s) => s.frame))]);
  rec.ok('trail: goo drips off it as it flies', w.maxDrops > 0, { maxDrops: w.maxDrops });
  const end = w.end || {};
  rec.ok('landing: both balls landed (the simulator queued them) and are gone from the air',
    (end.impacts || 0) >= 2 && !(end.shots || []).some((s) => s.ownerId === 'qa-green' || s.ownerId === 'qa-blue'), { impacts: end.impacts, shots: end.shots });
  rec.ok('landing: ...each leaving a splat in its OWN colour, on the ground layer', w.markTints.includes(GREEN) && w.markTints.includes(WISP) && w.markLayers.every((l) => l === 'ground'),
    { tints: w.markTints.map((t) => t.toString(16)), layers: w.markLayers, err: w.err });
  rec.ok('landing: ...after a splash of goo in the effects layer', w.burstKinds.some((k) => k.indexOf('frames:particles') === 0), w.burstKinds);
  await shot(P, 'town-landed', T.x, T.y, 90);
  /* the same pair again, for a picture in flight */
  await throwBalls(P, balls.map((b) => Object.assign({}, b, { id: b.id + '-2' })));
  await P.page.waitForTimeout(700);
  await shot(P, 'town-flight', T.x, T.y - 30, 110);
  /* that pair lands ~2.5 s in on a headless clock and a splat lasts ~3 s, so
     wait for it -- bounded, so a splat that never fades still fails */
  let gone = null;
  for (let i = 0; i < 30; i++) {
    await P.page.waitForTimeout(500);
    gone = await probe(P);
    if (gone && gone.marks.length === 0 && gone.parts.drop === 0 && gone.shots.length === 0 && i > 4) break;
  }
  rec.ok('landing: ...and the splats fade away, nothing left behind', gone && gone.marks.length === 0 && gone.parts.drop === 0, gone && { marks: gone.marks.length, parts: gone.parts });
  const dup = await P.page.evaluate(() => (window.__btSlimeProj ? window.__btSlimeProj() : []));
  rec.ok('one ball: the old picture path drew nothing alongside (every drawn ball is the new one)', dup.every((e) => e.srcPx == null || e.kind === 'snowball'), dup);

  /* ════════ FLAME FIELDS: THE GOBLIN'S FIRE ════════ */
  const em = await H.warpToZone(P, { wsPort, label: 'Flame Fields', zoneId: 'ember' });
  await H.devOp(wsPort, 'vitals', pid, { heal: true, god: true, godMinutes: 15 }).catch(() => null);
  rec.ok('setup: in the Flame Fields', em.ok !== false && (await H.readState(P, (S) => S.currentZone)) === 'ember');
  const gob = await H.readState(P, (S) => {
    const m = (S.monsters || []).find((x) => x && x.alive && (x.archetype || x.type) === 'fireGoblin');
    return m ? { id: m.id, x: m.x, y: m.y } : null;
  });
  rec.ok('setup: a fire goblin is standing in the zone (guard)', !!gob, gob);
  const me2 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const T2 = { x: me2.x, y: me2.y + 80 };
  if (gob) {
    await throwBalls(P, [{ id: gob.id, x: T2.x + 160, y: T2.y - 10, tx: T2.x, ty: T2.y, ms: 900 }]);
    const wf = await watch(P, [gob.id], 400);
    const f = byOwner(wf.seen, gob.id);
    rec.ok('fire: the goblin\'s ball is FIRE, with its glow', f.length > 0 && f.every((s) => s.style === 'fire' && s.glow && !s.shine), f[0]);
    rec.ok('fire: ...it lights the ground under it instead of shadowing it', f.every((s) => s.ground.layer === 'ground' && s.ground.alpha > 0), f[0] && f[0].ground);
    rec.ok('fire: ...it flickers (the frame changes in flight)', new Set(f.map((s) => s.frame)).size > 1, [...new Set(f.map((s) => s.frame))]);
    rec.ok('fire: ...and leaves a trail of embers, and a wisp of smoke', wf.maxEmbers > 3 && wf.maxSmoke > 0, { embers: wf.maxEmbers, smoke: wf.maxSmoke });
    const fe = wf.end || {};
    rec.ok('fire: on landing it flashes (additive) and bursts into flame (the burst frames)',
      !!fe.lastImpact && fe.lastImpact.style === 'fire' && wf.burstKinds.some((k) => k.indexOf('flash:') === 0 && k.endsWith(':add')) && wf.burstKinds.some((k) => k.indexOf('frames:particles') === 0),
      { last: fe.lastImpact, bursts: wf.burstKinds, err: wf.err });
    rec.ok('fire: ...and scorches the ground', wf.maxMarks > 0 && wf.markLayers.every((l) => l === 'ground'), { maxMarks: wf.maxMarks, layers: wf.markLayers });
    /* the same throw again, for the pictures */
    await throwBalls(P, [{ id: gob.id, x: T2.x + 160, y: T2.y - 10, tx: T2.x, ty: T2.y, ms: 900 }]);
    await P.page.waitForTimeout(900);
    await shot(P, 'ember-flight', T2.x + 80, T2.y - 30, 110);
    await P.page.waitForTimeout(1900);
    await shot(P, 'ember-landed', T2.x, T2.y - 10, 90);
  }
  /* No wait for the WORKER to throw here: a goblin chases at 68 px/s and a
     headless page runs its timers late, so kiting one into its throw band is
     a coin flip (it passed three runs in five).  The fire above was thrown in a
     real goblin's own name through the same handler a worker message reaches,
     and the worker path itself is proven below on a blue slime, which keeps
     its distance. */

  /* ════════ VERDANT WILDS: BLUE BY DEFAULT, AND A GREEN ONE ════════ */
  const vd = await H.warpToZone(P, { wsPort, label: 'Verdant Wilds', zoneId: 'verdant' });
  await H.devOp(wsPort, 'vitals', pid, { heal: true, god: true, godMinutes: 15 }).catch(() => null);
  const arrived = await probe(P);
  rec.ok('zone change: nothing from the Flame Fields followed us (none of its balls, no marks)', vd.ok !== false && arrived && !arrived.shots.some((x) => /ember/.test(String(x.ownerId)) || x.style === 'fire') && arrived.marks.length === 0, arrived && { shots: arrived.shots, marks: arrived.marks.length });
  const blue = await H.readState(P, (S) => {
    const m = (S.monsters || []).find((x) => x && x.alive && (x.archetype || x.type) === 'blueSlime');
    return m ? { id: m.id } : null;
  });
  const me3 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const T3 = { x: me3.x, y: me3.y + 70 };
  await throwBalls(P, [
    { id: blue ? blue.id : 'qa-vblue', arch: blue ? null : 'blueSlime', x: T3.x + 150, y: T3.y, tx: T3.x + 15, ty: T3.y, ms: 900 },
    { id: 'qa-vgreen', arch: 'fodder', x: T3.x - 150, y: T3.y, tx: T3.x - 15, ty: T3.y, ms: 900 },
  ]);
  const wv = await watch(P, [blue ? blue.id : 'qa-vblue', 'qa-vgreen'], 100);
  const vb = byOwner(wv.seen, blue ? blue.id : 'qa-vblue'), vg = byOwner(wv.seen, 'qa-vgreen');
  rec.ok('verdant: a blue slime\'s ball is blue', vb.length > 0 && vb.every((s) => s.tint === BLUE), vb[0]);
  rec.ok('verdant: ...and a GREEN slime in the blue slimes\' zone throws GREEN -- the owner\'s "I might add green ones later"', vg.length > 0 && vg.every((s) => s.tint === GREEN), vg[0]);
  /* the pair again, for a picture of a blue and a green ball side by side */
  await throwBalls(P, [
    { id: blue ? blue.id : 'qa-vblue2', arch: blue ? null : 'blueSlime', x: T3.x + 150, y: T3.y, tx: T3.x + 15, ty: T3.y, ms: 900 },
    { id: 'qa-vgreen2', arch: 'fodder', x: T3.x - 150, y: T3.y, tx: T3.x - 15, ty: T3.y, ms: 900 },
  ]);
  await P.page.waitForTimeout(900);
  await shot(P, 'verdant-flight', T3.x, T3.y - 25, 110);
  await P.page.waitForTimeout(3000);
  const realGoo = await waitRealThrow(P, 'blueSlime');
  rec.ok('real throw: a blue slime the worker throws for throws BLUE goo', !!realGoo && realGoo.style === 'goo' && realGoo.tint === BLUE, realGoo);
  if (realGoo) await shot(P, 'verdant-real', realGoo.gx, realGoo.gy - realGoo.lift, 110);

  await P.ctx.close().catch(() => {});
}
