/* ═══ DOES TEXTURE MEMORY COME BACK WHEN YOU LEAVE A ZONE? (v2.3.2272) ═══
 *
 * Owner: "the game slows down after playing for a while (like an accumulated
 * frame rate drop)."
 *
 * mp-perfdrift went looking for the slowdown in the SCENE and did not find it:
 * over a minute of held-attack combat the node count sat flat at ~310.  This
 * asks the other question, the one a node count cannot answer -- what does the
 * client still HOLD after you have walked away from it?
 *
 * The hypothesis comes from reading v2.3.1405's own note.  Per-zone loading
 * frees exactly ONE thing on zone exit, the ~4MB map (freeZoneMap), and the
 * other two categories it made per-zone -- the monster variant sheets and
 * frost's snowman -- have no unload path at all.  Every variant module holds
 * its strips in module-scope closures behind a memoised loadPromise, so once a
 * zone has been visited its art is resident for the life of the page.
 *
 * Decoded, that art is not small.  Measured off the PNG headers:
 *     fire-goblin  60.5 MB      mummy   22.0 MB      snowman  17.5 MB
 *     skeleton     14.2 MB      rest     7.1 MB      = 122 MB of RGBA
 * against 7.8MB of PNG on disk, which is why file sizes have never made this
 * look like a problem and why __btTex counts w*h*4 instead.
 *
 * So: tour the live spokes, sampling resident texture after each leg.  If the
 * total climbs and never falls, the client's steady state is "everywhere you
 * have been", and on iOS that is a GPU-pressure curve rather than a crash --
 * Safari evicts and re-uploads instead of failing, and the frame rate goes
 * down and stays down.  That is the reported symptom exactly.
 *
 * A COUNT OF BYTES IS DEVICE-INDEPENDENT, which is the whole reason this test
 * can live on a 6fps headless box while mp-perfdrift's frame-time axis cannot.
 */
import * as H from './harness.mjs';

const TILE = 32;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

const tex = (P) => P.page.evaluate(() => {
  const t = window.__btTex ? window.__btTex() : null;
  if (t && window.__btBundles) t.art = window.__btBundles();  /* WHICH art, not just how much */
  return t;
});

/* Leave a spoke the way a player does: the return trail-head is a tile whose
   map value is 9 (zoneTransitions' _czNearReturn scan), not an entry in any
   exits table, so it has to be found in the live map rather than looked up. */
async function leaveSpoke(P) {
  const found = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.map) return null;
    for (let ty = 0; ty < S.map.length; ty++) {
      const row = S.map[ty];
      if (!row) continue;
      for (let tx = 0; tx < row.length; tx++) if (row[tx] === 9) return { tx, ty };
    }
    return null;
  });
  if (!found) return null;
  await stand(P, found.tx * TILE + 16, found.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview' || z === 'town',
    { timeout: 40000 }).catch(() => {});
  /* The exit free is deliberately one beat late (zoneTransitions
     _freeLeftZoneAssets, 400ms) so it cannot pull sheets out from under
     displays the renderer has not torn down yet -- wait past it, or this
     samples the moment before the release rather than the steady state. */
  await P.page.waitForTimeout(3000);
  return H.readState(P, (S) => S.currentZone);
}

/* Walk to a marked exit and wait for the zone to actually change.  Returns the
   zone we landed in, or null if the walk did not take. */
async function goto(P, list, zoneId, rec) {
  const mark = await P.page.evaluate(({ which, z }) => {
    const f = window._gameFns || {};
    const arr = (which === 'town' ? f.TOWN_EXITS : f.WORLDVIEW_EXITS) || [];
    const e = arr.find((x) => x.zoneId === z);
    return e ? { tx: e.tx, ty: e.ty } : null;
  }, { which: list, z: zoneId });
  if (!mark) return null;
  await stand(P, mark.tx * TILE + 16, mark.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId, { timeout: 40000 }).catch(() => {});
  /* The per-zone overlay holds until preloadZoneAssets settles; give it room
     past that so the sample is of a SETTLED zone, not one mid-load. */
  await P.page.waitForTimeout(4000);
  const now = await H.readState(P, (S) => S.currentZone);
  return now;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tex', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const t0 = await tex(P);
  console.log('    town (baseline): ' + JSON.stringify(t0));
  rec.ok('the resident-texture probe answers (guard)',
    !!(t0 && typeof t0.mb === 'number' && t0.mb > 0), t0);
  if (!t0) { await P.ctx.close().catch(() => {}); return; }

  /* The quests open the gate out of town. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1500);

  const hub = await goto(P, 'town', 'worldview', rec);
  rec.ok('reached the worldview hub (guard)', hub === 'worldview', { hub });
  if (hub !== 'worldview') { await P.ctx.close().catch(() => {}); return; }
  const tHub = await tex(P);
  console.log('    worldview: ' + JSON.stringify(tHub));

  /* The spokes worth touring, heaviest first: ember is the fire goblin (60MB
     decoded on its own), sky is mummy + the skeleton it transforms into, frost
     is the snowman.  verdant is deliberately included last and is nearly free
     -- it is the control that says a rise is about ART and not about the act
     of changing zones. */
  const legs = [];
  for (const z of ['ember', 'sky', 'frost', 'verdant']) {
    const got = await goto(P, 'worldview', z, rec);
    const tIn = await tex(P);
    console.log('    in ' + z + ': ' + JSON.stringify(tIn) + (got === z ? '' : '  [DID NOT ARRIVE: ' + got + ']'));
    const back = await leaveSpoke(P);
    const tOut = await tex(P);
    console.log('    back at hub after ' + z + ': ' + JSON.stringify(tOut));
    legs.push({ zone: z, arrived: got === z, inMb: tIn && tIn.mb, hubMb: tOut && tOut.mb, backAt: back });
  }

  const toured = legs.filter((l) => l.arrived && typeof l.hubMb === 'number');
  rec.ok('the tour actually visited at least two spokes (guard)', toured.length >= 2, legs);
  if (toured.length < 2) { await P.ctx.close().catch(() => {}); return; }

  const base = tHub && tHub.mb;
  const end = toured[toured.length - 1].hubMb;
  console.log('    HUB-TO-HUB RESIDENT TEXTURE: ' + base + 'MB -> ' + end + 'MB after '
    + toured.map((l) => l.zone).join(' -> '));

  /* THE ASSERTION.  Measured at the HUB every time -- same zone, same art on
     screen -- so the only thing that can differ between the first reading and
     the last is what the client kept from zones it is no longer standing in.
     A steady state that grows with where you have been is the leak; a flat one
     means the zone art comes back and the slowdown is somewhere else. */
  /* Name whatever survived, rather than leaving a residue as a number.  A
     leak that is reported as "+4.5MB somewhere" is a leak nobody can finish. */
  if (typeof base === 'number' && typeof end === 'number' && end > base + 0.5) {
    const now = await P.page.evaluate(() => window.__btTex(true));
    const keep = (now && now.list ? now.list : []).filter((r) => r.mb > 0.3).slice(0, 14);
    console.log('    still resident, largest first:');
    keep.forEach((r) => console.log('      ' + String(r.mb).padStart(7) + 'MB  ' + r.k));
  }
  /* +2MB rather than a percentage, because after v2.3.2272 this lands on the
     baseline EXACTLY (382.5 -> 382.5 across ember, sky, frost and verdant) and
     a threshold with room in it would stop being a test.  The margin is there
     for a future zone that legitimately warms something global on first entry,
     not as slack for a leak.  The measurement it replaced, on the same probe
     and the same tour before the free existed: 382.5 -> 474.4. */
  rec.ok(`resident texture at the hub does not grow with zones visited (${base}MB -> ${end}MB)`,
    typeof base === 'number' && typeof end === 'number' && end <= base + 2, { base, end, legs });
  await P.ctx.close().catch(() => {});
}
