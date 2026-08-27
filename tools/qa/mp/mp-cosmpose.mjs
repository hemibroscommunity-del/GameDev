/* DO THE TATTOOS AND THE CLOTHING PATTERN SURVIVE EVERY ACTIVITY -- AND DO
 * THEY REACH THE OTHER PLAYER WHILE THEY DO? (v2.3.2041)
 *
 * Owner: "test how well the player tattoos and clothing patterns get passed on
 * while doing every activity (jogging, resource extraction, cooking, etc)."
 *
 * ── WHY POSE IS THE AXIS THAT MATTERS ──
 * Custom art is not drawn over the character at render time; it is BAKED into
 * a recoloured copy of the body sheet, and there is a separate sheet per pose
 * (playerSprites POSES: stand, jog, hit, pickup, attack, mine, fish, dodge)
 * per facing. getBodyFrame's cache key includes the pose. So "the tattoo is
 * on him" is a claim about the STANDING sheet and says nothing about the
 * mining one -- a bake that missed a pose would look perfect until the player
 * swung a pickaxe. Every activity the owner listed is a different pose, which
 * is why this scenario is organised by pose rather than by feature.
 *
 * ── WHAT IS MEASURED, AND WHY IT IS PIXELS ──
 * Two things, on the glass, on BOTH clients:
 *   - PINK, on the face and arms: the tattoos.
 *   - GREEN, on the shirt and trousers: the clothing patterns.
 * Colours rather than "some art field is set", because the field being set is
 * what was true in every version of this bug: the drawing was on the wire and
 * on the state object and simply not in the pixels for that pose. And two
 * DIFFERENT colours because "custom ink is present" would pass with the
 * tattoos showing and the pattern gone, which is half the owner's question.
 *
 * The character wears a shirt on purpose. A torso tattoo under a tee is
 * correctly invisible, so this uses the FACE and ARM tattoos -- bare in every
 * outfit -- and lets the shirt carry the pattern. That is one configuration
 * that can answer both halves at once, and it is what a dressed player
 * actually looks like.
 *
 * ── THE CONTROL COMES FIRST ──
 * Before any art is seeded, both colours are counted on a plain character. If
 * that is not ~0 the measure is meaningless and every "the ink is there"
 * below would be measuring the scenery. mp-skinworld established this rule;
 * it is not optional.
 *
 * ── POSES THAT CANNOT BE REACHED ARE SKIPPED, NOT PASSED ──
 * Some activities need a resource node or a monster within reach of the spawn,
 * and whether one is there is the world's business, not this test's. Every
 * pose actually observed is asserted; every pose never reached is reported as
 * a SKIP naming what was missing. Quietly asserting nothing about `mine`
 * because no rock happened to be nearby -- and printing a green run -- is how
 * a suite ends up claiming coverage it does not have.
 */
import * as H from './harness.mjs';

const SHOTS = H.REPO + '/tools/qa/mp/out';

/* Palette index 11 (#d76ba8) on every cell -- the maximum-coverage drawing, so
   a partial bake still registers. Same value and same reasoning as
   mp-skinworld's ALL_PINK. */
const ALL_PINK = 'b'.repeat(256);
/* Index 6 (#5aa84f). A pattern is "<tile>:<paletteIndex>" (patternCatalog
   formatPattern). Checks on the shirt, stripes on the trousers: two different
   tiles so a single hard-coded tile path could not carry both. */
const SHIRT_PAT = 'check:6';
const PANTS_PAT = 'stripe-v:6';

/* Ink lands blended UNDER the skin (INK_TUNE), so the test is for a hue SHIFT,
   not for the literal hex. Pink reads as blue-over-green on a warm body. */
const isPink = (r, g, b) => b > g + 24 && r > 110;
/* Green reads as green-over-both. The margins are wide because the pattern is
   stamped on lit fabric and picks up the garment's own shading. */
const isGreen = (r, g, b) => g > r + 20 && g > b + 20 && g > 70;

/* Where a figure is on the glass. For yourself that is the player; for a peer
   it is that peer's entry in `others`, which is the whole point -- a peer box
   read from your own position would measure your own character twice. */
async function boxFor(P, peerId) {
  const c = await P.page.evaluate((pid) => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    const src = pid ? (S.others || {})[pid] : S.player;
    if (!src || typeof src.x !== 'number') return null;
    return {
      x: r.left + (src.x - S.camera.x) * (S._worldScaleX || 1),
      y: r.top + (src.y - S.camera.y) * (S._worldScaleY || 1),
      vw: innerWidth, vh: innerHeight,
    };
  }, peerId || null);
  if (!c) return null;
  const x = Math.round(c.x - 44), y = Math.round(c.y - 86);
  /* Off-screen means "not measurable", not "no ink" -- returning a box that
     is partly outside the viewport would silently count clamped pixels. */
  if (x < 0 || y < 0 || x + 88 > c.vw || y + 104 > c.vh) return null;
  return { x, y, width: 88, height: 104 };
}

/** Ink counts in one figure's box, plus the pose being drawn right now. */
async function sample(P, peerId, tag) {
  const box = await boxFor(P, peerId);
  if (!box) return null;
  let px;
  try { px = await H.screenshotPixels(P, box); } catch (e) { return null; }
  if (tag) await P.page.screenshot({ path: `${SHOTS}/cosmpose-${tag}-${P.name}.png`, clip: box }).catch(() => {});
  const pose = await P.page.evaluate(() => {
    const r = window._pixiRenderer;
    const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
    return (pd && pd._animPose) || 'stand';
  });
  return { pink: px.count(isPink), green: px.count(isGreen), pose };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort, dpr: 2 });
  const B = await H.newPlayer(browser, { name: 'Onlooker', wsPort, webPort, guest: true, dpr: 2 });
  await H.enterWorld(A);
  await H.enterWorld(B);
  await H.waitMutualSight(A, B).catch(() => {});
  await A.page.waitForTimeout(2500);

  const aId = await H.readState(A, (S) => S.myId);

  /* ── THE CONTROL ── */
  const ctlSelf = await sample(A, null, 'control');
  const ctlPeer = await sample(B, aId, 'control-peer');
  rec.ok('a plain character can be located on both screens (guard)',
    !!ctlSelf && !!ctlPeer, { ctlSelf, ctlPeer });
  rec.ok('with no art, neither ink colour appears on your own character — '
       + 'so the measure is reading art, not scenery',
    !!ctlSelf && ctlSelf.pink < 12 && ctlSelf.green < 12, ctlSelf);
  rec.ok('...nor on the other player\'s view of him',
    !!ctlPeer && ctlPeer.pink < 12 && ctlPeer.green < 12, ctlPeer);

  /* ── DRESS HIM ──
     Through the store and a reload, the path a RETURNING player takes: the
     art store is read once at module load, and the creator sends it in the
     join frame. Driving the paint UI instead would make this a test of
     pointer events, which mp-bodyink and mp-skinink already are. */
  await A.page.evaluate(([ink, sp, pp]) => {
    localStorage.setItem('bt-facetattoo', ink);
    localStorage.setItem('bt-armtattoo', ink);
    localStorage.setItem('bt-shirtpat', sp);
    localStorage.setItem('bt-pantspat', pp);
  }, [ALL_PINK, SHIRT_PAT, PANTS_PAT]);
  await A.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(A);
  await A.page.waitForTimeout(3500);
  const aId2 = await H.readState(A, (S) => S.myId);
  rec.ok('the same character came back after the reload (guard)', aId2 === aId, { aId, aId2 });
  await H.waitMutualSight(A, B).catch(() => {});
  await B.page.waitForTimeout(3000);

  const seeded = await A.page.evaluate(() => ({
    face: (localStorage.getItem('bt-facetattoo') || '').length,
    arm: (localStorage.getItem('bt-armtattoo') || '').length,
    shirt: localStorage.getItem('bt-shirtpat'),
    pants: localStorage.getItem('bt-pantspat'),
  }));
  rec.ok('the tattoos and both patterns survived the reload (guard)',
    seeded.face === 256 && seeded.arm === 256
    && seeded.shirt === SHIRT_PAT && seeded.pants === PANTS_PAT, seeded);

  /* Does the OTHER player even know about them? A relay that drops the
     patterns would make every pixel assertion below fail on B with no
     explanation of why. */
  const relayed = await B.page.evaluate((id) => {
    const o = ((window._gameState.current || {}).others || {})[id];
    if (!o) return null;
    return {
      face: typeof o.faceTattooArt === 'string' ? o.faceTattooArt.length : null,
      arm: typeof o.armTattooArt === 'string' ? o.armTattooArt.length : null,
      shirtPat: o.shirtPattern || o.shirtPat || null,
      pantsPat: o.pantsPattern || o.pantsPat || null,
    };
  }, aId);
  rec.ok('the other player receives the tattoos over the wire, at full length',
    !!relayed && relayed.face === 256 && relayed.arm === 256, relayed);
  rec.ok('...and the clothing patterns with them',
    !!relayed && relayed.shirtPat === SHIRT_PAT && relayed.pantsPat === PANTS_PAT, relayed);

  /* ── THE ACTIVITIES ──
     Each entry drives a real activity and samples repeatedly while it runs,
     because a pose is a handful of frames and one snapshot lands wherever it
     lands. Every sample is filed under the pose that was actually being drawn
     at that instant, so nothing is credited to a pose the game never entered. */
  const seen = Object.create(null);   /* CLAUDE.md rule 4 */
  const file = (s) => {
    if (!s) return;
    const k = s.pose || 'stand';
    if (!seen[k]) seen[k] = { n: 0, pinkMin: Infinity, greenMin: Infinity, pinkMax: 0, greenMax: 0 };
    const e = seen[k];
    e.n++;
    e.pinkMin = Math.min(e.pinkMin, s.pink); e.pinkMax = Math.max(e.pinkMax, s.pink);
    e.greenMin = Math.min(e.greenMin, s.green); e.greenMax = Math.max(e.greenMax, s.green);
  };
  const peerSeen = Object.create(null);
  const filePeer = (s) => {
    if (!s) return;
    const k = 'peer';
    if (!peerSeen[k]) peerSeen[k] = { n: 0, pinkMin: Infinity, greenMin: Infinity };
    const e = peerSeen[k];
    e.n++;
    e.pinkMin = Math.min(e.pinkMin, s.pink);
    e.greenMin = Math.min(e.greenMin, s.green);
  };

  const soak = async (ms, tag) => {
    const t0 = Date.now();
    let first = true;
    while (Date.now() - t0 < ms) {
      file(await sample(A, null, first ? tag : null));
      filePeer(await sample(B, aId, first ? tag + '-peer' : null));
      first = false;
    }
  };

  /* STANDING */
  await soak(2500, '01-stand');

  /* JOGGING, in four directions -- east and northeast are drawn by MIRRORING
     another facing, and a decal baked into a sheet flips with it (the reason
     playerDecal has a `mirror` argument at all), so a pattern that reads
     backwards or vanishes does so specifically there. */
  for (const [key, tag] of [['s', '02-jog-south'], ['d', '03-jog-east'],
                            ['w', '04-jog-north'], ['a', '05-jog-west']]) {
    await A.page.keyboard.down(key);
    await soak(2200, tag);
    await A.page.keyboard.up(key);
    await A.page.waitForTimeout(300);
  }

  /* FIGHTING -- the game's own auto-attack, which also produces `hit` when the
     monster answers. */
  await A.page.evaluate(() => { try { window._gameState.current.autoAttack = true; } catch (e) {} });
  await soak(9000, '06-combat');
  await A.page.evaluate(() => { try { window._gameState.current.autoAttack = false; } catch (e) {} });

  /* RESOURCE EXTRACTION -- walk onto the nearest node and let the game do its
     own thing. Whether a node is within reach of the spawn is the world's
     business; if none is, the poses simply never appear and are skipped below
     rather than being quietly credited. */
  const node = await A.page.evaluate(() => {
    const S = window._gameState.current;
    const ns = Object.values(S.nodes || S.zoneNodes || {});
    if (!ns.length) return null;
    let best = null, bd = Infinity;
    for (const n of ns) {
      const d = Math.hypot((n.x || 0) - S.player.x, (n.y || 0) - S.player.y);
      if (d < bd) { bd = d; best = { x: n.x, y: n.y, kind: n.kind || n.type || null, d: Math.round(d) }; }
    }
    return best;
  });
  rec.ok(`the zone has resource nodes to work${node ? ` (nearest ${node.kind || '?'} at ${node.d}px)` : ''}`,
    !!node, node);
  if (node) {
    for (let i = 0; i < 6; i++) {
      await A.page.evaluate((n) => {
        const S = window._gameState.current;
        S.moveTarget = { x: n.x, y: n.y };
        if (window.__broTapWorld) window.__broTapWorld(n.x, n.y);
      }, node);
      await soak(2500, i === 0 ? '07-gather' : null);
    }
  }

  /* ── THE VERDICT, POSE BY POSE ── */
  const poses = Object.keys(seen).sort();
  rec.ok(`the character was drawn in more than one pose during the run (${poses.join(', ')})`,
    poses.length >= 2, seen);

  for (const p of poses) {
    const e = seen[p];
    rec.ok(`the tattoos are on him while the game draws "${p}" `
         + `(${e.n} samples, pink ${e.pinkMin}-${e.pinkMax})`,
      e.pinkMin >= 12, { pose: p, ...e });
    rec.ok(`...and so are the clothing patterns, in "${p}" `
         + `(green ${e.greenMin}-${e.greenMax})`,
      e.greenMin >= 12, { pose: p, ...e });
  }

  /* Poses the game has sheets for but this run never entered. */
  const ALL_POSES = ['stand', 'jog', 'hit', 'pickup', 'attack', 'mine', 'fish', 'dodge'];
  for (const p of ALL_POSES) {
    if (!seen[p]) {
      rec.skip(`tattoos and patterns while the game draws "${p}"`,
        `the character never entered that pose in this run — `
        + `${p === 'mine' || p === 'fish' ? 'no reachable node of that kind near spawn'
           : p === 'dodge' ? 'no dodge was triggered'
           : p === 'pickup' ? 'nothing was looted'
           : 'the activity did not occur'}`);
    }
  }

  /* ── AND THE OTHER PLAYER SAW ALL OF IT ── */
  const pe = peerSeen.peer;
  rec.ok(`the other player's view of him carried the tattoos throughout `
       + `(${pe ? pe.n : 0} samples, worst pink ${pe ? pe.pinkMin : 'n/a'})`,
    !!pe && pe.pinkMin >= 12, pe);
  rec.ok('...and the clothing patterns throughout, not just on the join frame',
    !!pe && pe.greenMin >= 12, pe);

  for (const P of [A, B]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }
  await A.ctx.close();
  await B.ctx.close();
}
