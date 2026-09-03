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
/* v2.3.2078: `r >= b` is not decoration — it is the guard mp-facingside added
   in v2.3.2043 and this file never picked up.  Without it a lit blue clears
   both `b > g + 24` and `r > 110`: when v2.3.2069 moved the fountain into the
   plaza its water put 205 "pink" pixels in the control frame of a character
   with no tattoos on him at all, and the control plus five downstream
   assertions failed for a reason that had nothing to do with ink.  Pink
   (215,107,168) has r above b; the fountain's (150,160,200) does not.  One
   comparison separates them, and it takes that 205 to 0. */
const isPink = (r, g, b) => b > g + 24 && r > 110 && r >= b;
/* Green reads as green-over-both. The margins are wide because the pattern is
   stamped on lit fabric and picks up the garment's own shading. */
const isGreen = (r, g, b) => g > r + 20 && g > b + 20 && g > 70;

/* Where a figure is on the glass. For yourself that is the player; for a peer
   it is that peer's entry in `others`, which is the whole point -- a peer box
   read from your own position would measure your own character twice. */
async function boxFor(P, peerId) {
  /* v2.3.2078: was a local 88x104 box about twice the character.  The
     v2.3.2069 fountain landed inside it and the control frame started
     reading 4455 blue pixels off water on a character with no art on him.
     H.figureBox is the one copy of the tight box now; off-screen still
     returns null, because that means "not measurable", not "no ink".

     v2.3.2083: A PEER IS ANCHORED ON ITS OWN DRAWN POSITION.  It used to be
     anchored on renderX/renderY -- the smoothed interpolation, read some
     milliseconds after the screenshot -- and a RUNNING peer has left a 40x46
     box by then.  `pinkMin` is a MINIMUM over every sample of the scenario,
     so one badly aimed crop out of dozens took it to 0 and reported "the
     other player cannot see his tattoos" about a character covered in them.
     v2.3.2082 tried to pad the box instead, and that is the wrong fix and
     worth recording: at this spawn a 22px margin reaches the grass, and the
     NO-ART CONTROL immediately started counting 44 green pixels off the town
     (TRAPS §34 -- the tight box exists precisely for this).  A crop needs a
     better ANCHOR, not a bigger box, so entityRenderer publishes
     __btPeersDrawn and H.figureBox uses it. */
  return H.figureBox(P, { peerId: peerId || null });
}

/* Where the renderer last painted this figure, local or peer. */
const drawnAt = (P, peerId) => P.page.evaluate((pid) => {
  const d = pid ? (window.__btPeersDrawn && window.__btPeersDrawn(pid))
    : (window.__btPlayerDrawn && window.__btPlayerDrawn());
  return d ? { x: d.x, y: d.footY } : null;
}, peerId || null);

/** Ink counts in one figure's box, plus the pose being drawn right now. */
async function sample(P, peerId, tag) {
  /* ═══ v2.3.2083: A SAMPLE TAKEN WHILE THE FIGURE MOVED IS NOT A SAMPLE ═══
     Every crop here is derived from a position read in one round-trip and
     then photographed in the next, and page.screenshot is slow enough that a
     RUNNING figure has left the 40x46 box in between.  The mis-aimed crop
     does not read as an error, it reads as ZERO INK -- and pinkMin is a
     minimum over dozens of samples, so one bad crop reported "the other
     player cannot see his tattoos" about a character covered in them.
     Two fixes were tried and are worth recording as dead ends.  PADDING the
     box (v2.3.2082) reaches the grass at this spawn and the no-art control
     immediately counted 44 green pixels off the town -- TRAPS §34, and the
     exact reason the tight box exists.  Anchoring on the renderer's own drawn
     position instead of renderX/renderY (also v2.3.2083, and kept, because it
     is right) narrows the gap but does not close it: "where it was drawn last
     frame" is still not "where it is in the photograph".
     So the exposure is BRACKETED.  If the figure moved between the read
     before and the read after, the crop was aimed somewhere the figure no
     longer is, and this returns null -- a sample that is not counted rather
     than a zero that is.  That does not weaken the claim: it removes
     measurements already known to be invalid, and a pose that yields no valid
     samples reports n:0, which is visible rather than silent. */
  const before = await drawnAt(P, peerId);
  const box = await boxFor(P, peerId);
  if (!box) return null;
  let px;
  try { px = await H.screenshotPixels(P, box); } catch (e) { return null; }
  const after = await drawnAt(P, peerId);
  if (!before || !after
      || Math.hypot(after.x - before.x, after.y - before.y) > 10) return null;
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
  /* v2.3.2083: BY POSE, like the local half.  The peer used to be one bucket,
     so "worst green 0 over 8 samples" named no pose at all and the next step
     was guesswork -- the same failure mode as TRAPS §38's diagnostic.  The
     'peer' total stays for the headline; the per-pose rows say WHICH pose
     lost its pattern. */
  const peerPose = Object.create(null);
  const filePeer = (s) => {
    if (!s) return;
    const k = 'peer';
    if (!peerSeen[k]) peerSeen[k] = { n: 0, pinkMin: Infinity, greenMin: Infinity };
    const e = peerSeen[k];
    e.n++;
    e.pinkMin = Math.min(e.pinkMin, s.pink);
    e.greenMin = Math.min(e.greenMin, s.green);
    const pk = s.pose || 'stand';
    if (!peerPose[pk]) peerPose[pk] = { n: 0, pinkMin: Infinity, greenMin: Infinity, greenMax: 0 };
    const q = peerPose[pk];
    q.n++;
    q.pinkMin = Math.min(q.pinkMin, s.pink);
    q.greenMin = Math.min(q.greenMin, s.green);
    q.greenMax = Math.max(q.greenMax, s.green);
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

  /* RESOURCE EXTRACTION -- the mine and fish poses.
     v2.3.2078: this block used to read `S.nodes || S.zoneNodes` and steer with
     `S.moveTarget` / `window.__broTapWorld`.  NONE of those four names exist
     anywhere in src/ -- the real node list is `S.gatherNodes` and the real
     tap handle is `S._tapNode` -- so the node was always null, the "the zone
     has resource nodes to work" assertion failed on every run, and the walk
     that was supposed to reach one moved nobody.  Worse, it could never have
     worked where it runs: this scenario never leaves TOWN, and BroTown.jsx
     clears `S.gatherNodes = []` on town entry on purpose ("Town is safe -- no
     harvestable resources").

     So the node is INJECTED, the way mp-lifeskill does, rather than travelled
     to.  That is honest here in a way it would not be in mp-harvest: what is
     under test is whether the tattoo and pattern bake survives the MINE and
     FISH body sheets, which is a local rendering question.  Node sync and
     harvest settlement are mp-harvest's job and are asserted there against
     the worker.  The tools go in the bag first because hasGatherTool gates
     whether the node is tappable at all. */
  const workNode = async (nodeType, tool, shot) => {
    /* v2.3.2078: returns WHY, not just whether. An ore vein works from this
       recipe and a fishing spot does not, and a bare false says nothing about
       which step refused. */
    /* ═══ v2.3.2083: END THE LAST HARVEST FIRST ═══
       This used to inject straight over the top of the previous sub-test, and
       that is the whole of the "an injected fishSpot never becomes workable"
       mystery.  BroTown's node-proximity block ends with

           if (S._extraction) S._nearNode = null;

       (v2.3.1432, owner: "the contextual menu for cooking didn't go away") --
       while a harvest attempt is live the interact prompt is deliberately
       suppressed.  The ore-vein sub-test above soaks for six seconds with an
       extraction running, and the fishing spot was injected immediately after
       it, so `_nearNode` was nulled by the MINING attempt that had not
       finished.  Nothing about fishing refused anything: ore passed because it
       ran first and fish failed because it ran second, and swapping the two
       would have swapped the result.
       So the attempt is cancelled and the cancel is CONFIRMED before the next
       node goes in -- and the diagnostic below now names this state, so a
       recurrence says so instead of blaming a gathering skill. */
    await A.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (!S) return;
      S._extraction = null;
      S._tapNode = null;
      S._nearNode = null;
    });
    await A.page.waitForTimeout(400);
    const busy = await H.readState(A, (S) => !!S._extraction);
    if (busy) return { ok: false, why: 'the previous harvest attempt would not cancel' };

    const ok = await A.page.evaluate(({ nodeType, tool }) => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.player) return false;
      S.rpg = S.rpg || {};
      S.rpg.inventory = S.rpg.inventory || {};
      S.rpg.inventory[tool] = (S.rpg.inventory[tool] || 0) + 1;
      const node = { id: 'qa-cosm-' + nodeType, nodeType, tierLvl: 1, alive: true,
        respawnAt: 0, x: S.player.x + 8, y: S.player.y + 8 };
      S.gatherNodes = [node];
      S._tapNode = node;            /* as if a finger had touched it */
      return true;
    }, { nodeType, tool });
    if (!ok) return { ok: false, why: 'the node could not be injected' };
    await A.page.waitForTimeout(700);
    /* page.evaluate with an ARGUMENT, not a closure: readState serialises the
       function into the page, where `nodeType` does not exist -- the first cut
       threw "ReferenceError: nodeType is not defined" and took the whole
       scenario down with it. */
    const st = await A.page.evaluate((wantId) => {
      const S = window._gameState && window._gameState.current;
      if (!S) return { near: null, extracting: null, inList: false, tapped: null };
      return {
        near: S._nearNode ? S._nearNode.id : null,
        extracting: S._extraction ? (S._extraction.skill || true) : null,
        inList: (S.gatherNodes || []).some((n) => n.id === wantId),
        tapped: S._tapNode ? S._tapNode.id : null,
      };
    }, 'qa-cosm-' + nodeType);
    if (st.near !== 'qa-cosm-' + nodeType) {
      return { ok: false, why: 'the node never became interactable — '
        + (st.extracting ? 'a harvest attempt (' + st.extracting + ') is still live, '
            + 'which suppresses the prompt by design'
          : !st.inList ? 'the node fell out of S.gatherNodes (a server node push?)'
          : !st.tapped ? 'S._tapNode was dropped — hasGatherTool or nodeReachDist refused it'
          : 'S._nearNode is ' + JSON.stringify(st.near)),
        state: st };
    }
    /* Dispatched in page, not through Playwright: the prompt is anchored over
       the node and the bottom dashboard intercepts it at this viewport
       (mp-harvest v2.3.1706 hit the same wall).  Its onClick is still the code
       path being exercised. */
    /* v2.3.2232: the harvest starts from the right button (reads HARVEST
       with the node in reach), not from a mid-screen prompt. */
    const pressed = await A.page.evaluate(() => {
      const el = document.querySelector('.bt-rjoy-base');
      if (!el || !/harvest/i.test(el.textContent || '')) return false;
      const r = el.getBoundingClientRect();
      const mk = (type) => new TouchEvent(type, { bubbles: true, cancelable: true,
        touches: type === 'touchend' ? [] : [new Touch({ identifier: 73, target: el, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })],
        changedTouches: [new Touch({ identifier: 73, target: el, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })] });
      el.dispatchEvent(mk('touchstart')); el.dispatchEvent(mk('touchend'));
      return true;
    });
    if (!pressed) return { ok: false, why: 'the right button did not offer HARVEST to press' };
    await A.page.waitForTimeout(900);
    const ex = await H.readState(A, (S) => (S._extraction ? S._extraction.skill : null));
    if (!ex) return { ok: false, why: 'the prompt was pressed and no extraction started' };
    await soak(6000, shot);
    return { ok: true, skill: ex };
  };
  const mined = await workNode('oreVein', 'mining_pickaxe', '07-mine');
  rec.ok('the player can be put to work on an ore vein (the mine pose)', mined.ok, mined);
  /* v2.3.2083: this was a SKIP, on the belief that "something else about
     fishing refuses it".  Nothing about fishing refused it: workNode injected
     over the ore vein's still-running extraction, and a live extraction
     suppresses the interact prompt on purpose.  With the attempt cancelled
     first the recipe is genuinely identical, so this is an assertion again. */
  const fished = await workNode('fishSpot', 'fishing_pole', '08-fish');
  rec.ok('the player can be put to work on a fishing spot (the fish pose)', fished.ok, fished);

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
        + `${p === 'mine' || p === 'fish' ? 'the injected node never became workable'
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
    !!pe && pe.greenMin >= 12, { ...pe, byPose: peerPose });
  /* Which pose, when it fails.  Printed always: a pose whose pattern is thin
     rather than absent is worth seeing before it becomes a failure. */
  /* v2.3.2083b: WHICH SHEET THE ONLOOKER BAKED FOR HIM.  A peer's body bake
     carries their drawings and their trouser/shoe PATTERN through
     _remoteBodyArt -> bodySheetKey, and bodyArtSeg puts both in the key behind
     a '#art' marker.  So a peer bake with no '#art' in its key means the
     pattern never reached the canvas, and one with '#art' means it did and the
     fault is further in.  Printed from B, the onlooker, because the question
     is about what B drew. */
  const _bk = await B.page.evaluate(() => (window.__btBodySheetKeys
    ? window.__btBodySheetKeys() : null));
  if (_bk) {
    console.log(`      the onlooker's baked body sheets (${_bk.length}): `
      + _bk.slice(0, 6).map((k) => k.split('|')[0] + '|' + (k.split('|')[1] || '')).join('  '));
    console.log(`      ...carrying a drawing/pattern segment: `
      + _bk.filter((k) => k.indexOf('#art') !== -1).length + ' of ' + _bk.length);
  }
  /* v2.3.2083b: IS HE EVEN WEARING THE SHIRT, ON THE ONLOOKER'S SCREEN?
     The saved crops answer the green question before any arithmetic does: on
     A's own screen he wears a green-and-white checked tee, and on B's screen
     he is BARE-CHESTED.  The pattern is not failing to render -- the GARMENT
     is not there to carry it.  So both sides of the shirt decision are
     printed: what A draws for himself, and what B resolved for him. */
  const _shirtA = await A.page.evaluate(() => {
    const g = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    return { store: g('bt-shirt'), gear: g('bt-gear-v3-shirt'), pat: g('bt-shirtpat') };
  });
  const _shirtB = await B.page.evaluate((id) => {
    const S = window._gameState && window._gameState.current;
    const o = (S && S.others && S.others[id]) || null;
    if (!o) return null;
    return { equipShirt: o.equip ? o.equip.shirt : undefined, legacyShirt: o.shirt || null,
      shirtPattern: o.shirtPattern || null };
  }, aId);
  console.log(`      the shirt, both sides — A's own: ${JSON.stringify(_shirtA)}`
    + `   B's view of A: ${JSON.stringify(_shirtB)}`);
  const _pp = Object.keys(peerPose).sort()
    .map((k) => `${k} n${peerPose[k].n} pink>=${peerPose[k].pinkMin} green ${peerPose[k].greenMin}-${peerPose[k].greenMax}`);
  if (_pp.length) console.log(`      the peer's view, pose by pose: ${_pp.join('  ')}`);

  for (const P of [A, B]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }
  await A.ctx.close();
  await B.ctx.close();
}
