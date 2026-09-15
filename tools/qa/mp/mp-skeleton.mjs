/* THE MUMMY UNWRAPS ON THE FIRST HIT, AND THE SKELETON IS BIGGER (v2.3.2229).
 *
 * Owner: "Make the skeleton scale larger for its size.  It looks really
 * thin.  Increase speed in skeleton phase 25% and change it so first hit
 * makes the mummy to skeleton transformation."
 *
 * Three asks, and the third one is the load-bearing test: the transform
 * moved from "hp <= 50%" to "has taken any damage", and a threshold cannot
 * express that -- `at: 1` against the old `<=` test is satisfied at FULL
 * health and fires on spawn.  So the contract has two halves and both are
 * asserted: an untouched mummy stays a mummy, and one point of damage is
 * enough.
 *
 * The scale is asserted as an INVARIANT rather than as a number in
 * isolation: the figure's drawn height and its body-centre offset are
 * separate hand-tuned constants in four different files, and the failure
 * mode of scaling one without the others is not a wrong-looking monster --
 * it is arrows passing through a body they visibly hit (the v2.3.1111
 * report).  A screenshot covers the part a number cannot.
 */
import * as H from './harness.mjs';

const SKY = 'sky';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Digger', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* ── 1. THE NUMBERS AGREE WITH EACH OTHER ──
     Read out of the running client, so this is the table the game uses. */
  const geo = await P.page.evaluate(() => {
    const F = window._gameFns;
    const V = F && F.MONSTER_VARIANTS ? F.MONSTER_VARIANTS : null;
    const G = window._gameFns || {};
    return {
      skeletonPx: V && V.skeleton ? V.skeleton.liveScalePx : null,
      mummyPx: V && V.mummy ? V.mummy.liveScalePx : null,
      skeletonSpd: V && V.skeleton ? V.skeleton.spd : null,
      skeletonWalkDpf: V && V.skeleton ? V.skeleton.walkDistPerFrame : null,
      goblinSpd: V && V.fireGoblin ? V.fireGoblin.spd : null,
      goblinWalkDpf: V && V.fireGoblin ? V.fireGoblin.walkDistPerFrame : null,
      mummyFirstHit: !!(V && V.mummy && V.mummy.onFirstDamage),
      bodyOffSkeleton: G.monsterBodyOffsetY ? G.monsterBodyOffsetY('skeleton') : null,
      bodyOffMummy: G.monsterBodyOffsetY ? G.monsterBodyOffsetY('mummy') : null,
    };
  });
  console.log('    variant geometry: ' + JSON.stringify(geo));
  rec.ok('the skeleton is drawn larger than the mummy it comes out of',
    geo.skeletonPx > geo.mummyPx, geo);
  if (geo.bodyOffSkeleton != null) {
    /* THE INVARIANT: the aim point is half the drawn figure.  If the sprite
       grows and this does not, every shot aims below the chest. */
    rec.ok("...and the aim point is half the figure it draws, so shots still land",
      geo.bodyOffSkeleton === Math.round(geo.skeletonPx / 2), geo);
    rec.ok('...while the mummy keeps its own, unchanged',
      geo.bodyOffMummy === Math.round(geo.mummyPx / 2), geo);
  } else {
    rec.skip('the aim point tracks the drawn figure', 'monsterBodyOffsetY not on _gameFns');
  }
  rec.ok('the skeleton phase runs 25% faster (1.4 -> 1.75)',
    geo.skeletonSpd === 1.75, geo.skeletonSpd);
  /* ═══ v2.3.2472: AND ITS LEGS KEEP UP WITH IT, RATHER THAN OUTRUNNING IT ═══
     Owner (F1): the skeleton looks like it is sprinting in place.

     THE ASSERTION IS THE CADENCE, NOT THE CONSTANT, because the constant on
     its own means nothing -- the walk loop is DISTANCE-driven
     (entityRenderer: frameIdx = floor(_walkDist / walkDistPerFrame) % 8), so
     how frantic the legs look is speed / (frames x distPerFrame) and BOTH
     terms move.  That is exactly how this broke: v2.3.116 set 3.0 against a
     speed of 1.4, v2.3.2229 raised the speed to 1.75 for the same figure, and
     the pacing constant did not follow -- so pinning 9.0 as a number would
     leave the identical trap for the next speed change.  The server tick is
     22ms, so 1.75 px/tick is ~79.5 px/s.

     The band is 0.8..1.6 walk loops a second: below 0.8 an 8-frame strip
     reads as a moonwalk (the figure slides faster than its feet), above 1.6
     it reads as the running-in-place this fixes.  3.0 put it at ~3.3. */
  if (geo.skeletonWalkDpf) {
    const loops = (geo.skeletonSpd / 0.022) / (8 * geo.skeletonWalkDpf);
    console.log(`    skeleton walk cadence -> ${loops.toFixed(2)} loops/s at ${Math.round(geo.skeletonSpd / 0.022)} px/s`);
    rec.ok(`the skeleton's legs cycle at a stride, not a sprint-in-place (${loops.toFixed(2)} loops/s)`,
      loops >= 0.8 && loops <= 1.6, { loops, dpf: geo.skeletonWalkDpf, spd: geo.skeletonSpd });
    /* The house reference, in the same file and on the same 8-frame contract:
       a fire goblin scurries a little faster than a skeleton strides.  This is
       the check that would catch a "fix" that simply froze the legs. */
    if (geo.goblinWalkDpf && geo.goblinSpd) {
      const gLoops = (geo.goblinSpd / 0.022) / (8 * geo.goblinWalkDpf);
      rec.ok(`...a shade calmer than the fire goblin's scurry (${loops.toFixed(2)} vs ${gLoops.toFixed(2)} loops/s)`,
        loops < gLoops, { loops, gLoops });
    }
  } else {
    rec.skip('the skeleton walk cadence', 'walkDistPerFrame not on the variant table');
  }
  rec.ok('the mummy is flagged to turn on the first hit, not at a health fraction',
    geo.mummyFirstHit === true, geo);

  /* ── 2. THE CLIENT'S HALF OF THE TRANSFORM ──
     The TRIGGER is the worker's (server/test/tick.test.mjs asserts that one
     point of damage fires it, and that an untouched mummy does not -- the
     two halves that a threshold could not express).  What is left to check
     here is what the client DOES with the event, and that is driven down
     the same receive door the worker's events arrive by.

     Not by walking to the sky zone, which is where mummies actually live:
     sky is quest-gated server-side (_zoneUnlocked) and the admin grant
     endpoint takes gold and items only, so reaching it from a fresh
     headless character means playing the tutorial chain to tut_3.  The
     event is the contract between the two sides; this asserts it. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const mk = (id, hp) => ({
      id, x: S.player.x + 60, y: S.player.y, hp: 60, maxHp: 60, curHp: hp,
      alive: true, arch: 'mummy', archetype: 'mummy', type: 'mummy',
      level: 3, statuses: {}, vx: 0, vy: 0, atkCd: 0, spd: 0.4,
      spawnX: S.player.x + 60, spawnY: S.player.y,
    });
    /* Both at FULL health: with onFirstDamage, one hit point missing is
       already enough, and the first draft of this test seeded 59/60 and
       watched its own control transform before the dispatch. */
    S.monsters = (S.monsters || []).concat([mk('qa-mummy-local', 60), mk('qa-mummy-wire', 60)]);
  });
  await P.page.waitForTimeout(500);
  const read = (id) => P.page.evaluate((mid) => {
    const m = window._gameState.current.monsters.find((x) => x.id === mid);
    return m ? { arch: m.archetype, type: m.type, arch2: m.arch, spd: m.spd,
      curHp: m.curHp, maxHp: m.maxHp, shredding: !!m._transformStart,
      hold: m._transformHoldMs, from: m._transformFromArch } : null;
  }, id);

  const pre = await read('qa-mummy-wire');
  rec.ok('a mummy at full health is a mummy, at the mummy pace (control)',
    !!(pre && pre.arch === 'mummy' && pre.spd === 0.4 && !pre.shredding), pre);

  /* ── 2a. THE CLIENT-LOCAL PATH (dungeon / client-rolled zones) ──
     maybeTransformMonster is the mirror of the worker's rule, and town is
     client-rolled (TRAPS #32) so it is live here.  One hit point off. */
  await P.page.evaluate(() => {
    const m = window._gameState.current.monsters.find((x) => x.id === 'qa-mummy-local');
    if (m) m.curHp = m.maxHp - 1;
  });
  await P.page.waitForTimeout(600);
  const local = await read('qa-mummy-local');
  console.log('    client-local, one hit point off: ' + JSON.stringify(local));
  rec.ok('ONE hit point turns a mummy into a skeleton (client-local mirror)',
    !!(local && local.arch === 'skeleton'), local);
  rec.ok('...at 98% health -- it is not chewed down to half first',
    !!(local && local.curHp > local.maxHp * 0.9), local);

  /* ── 2b. THE WIRE PATH (every live zone) ── */
  await P.page.evaluate(() => {
    window.__btDispatch({
      type: 'monster_transform',
      payload: { id: 'qa-mummy-wire', zone: window._gameState.current.currentZone,
        fromVariant: 'mummy', toVariant: 'skeleton' },
    });
  });
  await P.page.waitForTimeout(300);
  const post = await read('qa-mummy-wire');
  console.log('    after monster_transform: ' + JSON.stringify(post));
  rec.ok("the client swaps it to a skeleton on the worker's word",
    !!(post && post.arch === 'skeleton' && post.type === 'skeleton' && post.arch2 === 'skeleton'), post);
  rec.ok('...at the faster skeleton pace (1.75, up 25%)',
    !!(post && post.spd === 1.75), post);
  rec.ok('...playing the bandage-shred, from the MUMMY sheet it is shedding',
    !!(post && post.shredding && post.from === 'mummy' && post.hold === 480), post);

  await P.page.waitForTimeout(1200);
  await P.page.screenshot({ path: 'tools/qa/mp/out/skeleton-scale.png' }).catch(() => {});

  await P.ctx.close().catch(() => {});
}
