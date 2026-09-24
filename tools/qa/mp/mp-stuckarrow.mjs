/* ONE ARROW STICKS, AND IT STICKS IN THE BODY (v2.3.2511)
 *
 * Two owner reports from the 2026-09-14 triage (§2.5), both about the same
 * dozen lines and neither visible to any existing suite:
 *
 *   "two stuck arrows on a special"  -- projectiles.js pushed a plain
 *   `_stuckArrows` stub for EVERY non-staff arrow with no isSpecial check,
 *   while the special ALSO set `a.stuckIn = m` a hundred lines below, so a
 *   charged shot left the golden flame art AND a plain brown shaft in the
 *   same monster.
 *
 *   "arrows stick below the feet of the mummy and the skeleton"  -- the
 *   stuck-arrow anchor table had entries for the fire goblin and the slime
 *   and nothing else, so every other sprite-backed monster fell into an ELSE
 *   branch whose yAnchor is 0.  Since v2.3.1824 a monster's position IS the
 *   base of its drawn art, so 0 is the feet -- of a 96px mummy and a 120px
 *   skeleton whose chests the shot was aimed at.
 *
 * ═══ WHY THE ARROWS ARE INJECTED ═══
 * What is under test is the IMPACT bookkeeping, not the bow: the fire gate,
 * the cadence and the aim ladder each have their own file (mp-aimpath,
 * mp-arrowdt, mp-jetstream), and driving a real volley here would make this
 * scenario fail for any of their reasons instead of its own.  Same call the
 * tick makes on a real shot -- one entry in S.arrows with the fields the fire
 * site writes -- so the code path is the shipped one.
 *
 * The monsters are client-owned (`_serverMonsters = false`) because the stuck
 * arrow is a CLIENT drawing: the worker never hears about it.  spd 0 and dmg 0
 * so nothing wanders out of the shot or hits back mid-measurement.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
/* Far enough that the arrow is well clear of the player, close enough that it
   cannot reach the screen edge and start planting before it arrives. */
const GAP = 160;

/* One monster of a named archetype, due EAST, with an arrow already in flight
   at its body centre.  `dist` starts short of the gap so the tick integrates a
   real step into it and the segment sweep is the thing that registers -- an
   arrow spawned already inside the circle would test the point test instead. */
const shootAt = (P, arch, special, hp) => P.page.evaluate((a) => {
  const S = window._gameState.current, F = window._gameFns || {};
  S._serverMonsters = false;
  /* Built as a base ARCHETYPE and then re-keyed, which is what the game itself
     does: applyZoneVariant overwrites BOTH m.type and m.archetype with the
     variant key (projectiles.js's own v2.3.1534 note records that, and records
     it as the reason a Verdant Wilds slime used to miss the anchor table).
     createMonster only knows archetypes -- 'mummy' and 'skeleton' are variants
     -- so building one directly would have made a monster the renderer and the
     tables disagree about. */
  const m = F.createMonster('stuck-1', 'fodder', 2, S.player.x + a.gap, S.player.y, null);
  m.archetype = a.arch; m.type = a.arch;
  m.alive = true; m.curHp = m.maxHp = 900000; m.spd = 0; m.vx = 0; m.vy = 0;
  if (a.hp) m.curHp = a.hp;   /* v2.3.2881: a slime the arrow kills */
  m.dmg = 0;
  m.renderX = m.x; m.renderY = m.y;
  m._stuckArrows = [];
  S.monsters = [m];
  S.lockedTarget = null;
  /* FIRED AT THE BODY CENTRE, which is the line a real shot takes: the fire
     site aims through lockAimPoint / rangedAimAngle, both of which subtract
     monsterBodyOffsetY.  An arrow flown along the player's own y would pass
     UNDER a mummy (centre 48px up, hit circle 40 + the arrow's 6.6) and miss
     outright -- and a fixture that misses proves nothing about where the shaft
     lands when it hits. */
  const off = (F.monsterBodyOffsetY ? F.monsterBodyOffsetY(m.archetype) : 0) || 0;
  const x0 = S.player.x, y0 = m.renderY - off;
  S.arrows = [{
    x: x0, y: y0, _renderX: x0, _renderY: y0, _pathX: x0, _pathY: y0,
    ang: 0, dist: 0, life: 100000, _released: true, _bornTs: Date.now(),
    _ox: 0, _oy: 0, _rangeMult: 1, fromGrip: false,
    isStaff: false, _isStaffProj: false, ice: false,
    isSpecial: !!a.special, pierce: !!a.special,
    dmg: 1, baseDmg: 1, hitIds: new Set(),
  }];
  return { mx: Math.round(m.x), my: Math.round(m.y), px: Math.round(x0), py: Math.round(y0),
    bodyOffset: off, arch: m.archetype || m.type };
}, { arch, gap: GAP, special: !!special, hp: hp || 0 });

/* Poll until the arrow has resolved, then report both halves of the drawing:
   the plain stubs hanging off the monster and the special's own ride. */
const settle = (P) => P.page.evaluate(() => new Promise((resolve) => {
  const S = window._gameState.current;
  const t0 = Date.now();
  const iv = setInterval(() => {
    const m = (S.monsters || [])[0];
    const a = (S.arrows || [])[0];
    const stubs = (m && m._stuckArrows) || [];
    const done = stubs.length > 0 || (a && a.stuckIn) || (!a && Date.now() - t0 > 400);
    if (done || Date.now() - t0 > 3000) {
      clearInterval(iv);
      resolve({
        stubs: stubs.length,
        stubOy: stubs.length ? +stubs[0].oy.toFixed(2) : null,
        stubOx: stubs.length ? +stubs[0].ox.toFixed(2) : null,
        stuckIn: !!(a && a.stuckIn),
        arrows: (S.arrows || []).length,
        hp: m ? m.curHp : null,
        waited: Date.now() - t0,
      });
    }
  }, 16);
}));

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sticker', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg && !S.rpg.rangedWeapon) S.rpg.rangedWeapon = { type: 'bow', name: 'QA Bow', tierMult: 1 };
    S.rpg.activeSlot = 'ranged';
  });

  /* ── 1. an ORDINARY arrow leaves exactly one stub ── */
  const seedA = await shootAt(P, 'fodder', false);
  rec.ok('a slime is standing in the shot (guard)', seedA.mx > seedA.px, seedA);
  const plain = await settle(P);
  console.log(`    plain -> ${JSON.stringify(plain)}`);
  rec.ok('an ordinary arrow leaves ONE stuck shaft in the monster', plain.stubs === 1, plain);
  rec.ok('...and does not also ride it as a special', plain.stuckIn === false, plain);

  /* ── 2. a SPECIAL leaves the golden arrow and NOTHING ELSE ──
     The defect exactly: both drawings at once.  `stuckIn` is the special's own
     ride and must still be there -- a fix that removed the wrong one would
     pass a stub count of zero just as happily. */
  const seedB = await shootAt(P, 'fodder', true);
  rec.ok('a slime is standing in the charged shot (guard)', seedB.mx > seedB.px, seedB);
  const spec = await settle(P);
  console.log(`    special -> ${JSON.stringify(spec)}`);
  rec.ok('a bow SPECIAL rides the monster as the charged arrow', spec.stuckIn === true, spec);
  rec.ok('...and leaves NO plain shaft beside it -- one arrow, not two (v2.3.2511)',
    spec.stubs === 0, spec);

  /* ── 3. the shaft plants in the BODY, not at the feet ──
     `oy` is the stub's offset from the monster's own position, which since
     v2.3.1824 is the base of the drawn art.  The body centres are the ones
     monsterBodyOffsetY publishes -- mummy 48, skeleton 60 -- so a stub within
     a body's width of those is in the torso, and one near 0 is in the ground
     at its feet, which is the report.
     ASSERTED AS A RANGE, not an equality: the anchor adds a +/-1.5px jitter so
     two arrows in one monster do not overlap exactly, and pinning the exact
     number would make this file fail on that jitter alone. */
  for (const [arch, want, label] of [['mummy', 42, 'mummy'], ['skeleton', 52, 'skeleton']]) {
    const seed = await shootAt(P, arch, false);
    rec.ok(`a ${label} is standing in the shot (guard)`, seed.mx > seed.px, seed);
    const got = await settle(P);
    console.log(`    ${label} -> ${JSON.stringify(got)}`);
    rec.ok(`${label}: the arrow leaves a stuck shaft (guard)`, got.stubs === 1, got);
    if (got.stubs === 1) {
      rec.ok(`${label}: ...planted in the BODY, not at the feet `
        + `(oy ${got.stubOy}, wanted about -${want}, feet would be 0)`,
        got.stubOy < -(want - 8) && got.stubOy > -(want + 22), got);
    }
  }

  /* ── 4. v2.3.2881: the shafts go with the monster ──
     Owner: "Arrows stuck in monsters persist even after death."  A dead
     monster stays in S.monsters (alive=false) until it respawns, and its
     shafts used to hang there over the empty spot the whole time. */
  const seedD = await shootAt(P, 'fodder', false);
  rec.ok('a slime is standing in the shot (guard)', seedD.mx > seedD.px, seedD);
  const live = await settle(P);
  rec.ok('the shot leaves a shaft in the living slime (guard)', live.stubs === 1, live);
  const dead = await P.page.evaluate(() => new Promise((resolve) => {
    const S = window._gameState.current;
    const m = (S.monsters || [])[0];
    m.alive = false; m.curHp = 0; m.respawnAt = Date.now() + 1e9;   /* a corpse waiting on its respawn */
    const t0 = Date.now(), iv = setInterval(() => {
      const n = (m._stuckArrows || []).length;
      if (n === 0 || Date.now() - t0 > 250) {
        clearInterval(iv);
        resolve({ stubs: n, inList: (S.monsters || []).includes(m), ms: Date.now() - t0 });
      }
    }, 16);
  }));
  rec.ok(`...and none are left once it dies (${dead.stubs} left, corpse still listed: ${dead.inList})`, dead.stubs === 0, dead);
  /* and the arrow that KILLS leaves none either (its impact lands on the
     frame the slime goes down) */
  await shootAt(P, 'fodder', false, 1);
  const corpse = await P.page.evaluate(() => new Promise((resolve) => {
    const S = window._gameState.current;
    const m = (S.monsters || [])[0];
    setTimeout(() => resolve({ stubs: (m._stuckArrows || []).length, alive: m.alive, hp: m.curHp }), 600);
  }));
  rec.ok(`the killing arrow leaves no shaft in the body (${corpse.stubs}; alive ${corpse.alive}, hp ${corpse.hp})`, corpse.alive === false && corpse.stubs === 0, corpse);

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.monsters = []; S.arrows = []; S.lockedTarget = null;
  });
  await P.ctx.close().catch(() => {});
}
