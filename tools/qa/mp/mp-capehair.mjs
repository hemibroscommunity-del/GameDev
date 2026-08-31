/* THE HOOD HAS TO CLIP THE HAIR (v2.3.2186).
 *
 * Owner, with a screenshot: "The cape needs adjustments. Hair sticking out."
 *
 * WHY THIS IS NOT A Z-ORDER TEST.  The hood ALREADY draws over the hair --
 * hairSprite is added to the container before capeSprite (v2.3.357 / v2.3.2023)
 * and always was.  What the owner photographed is hair reaching PAST the hood's
 * outline, where there is no hood for it to be behind.  No layer order fixes
 * that; only a clip does.  So what has to be proven is that a clip is applied,
 * that it is the HOOD'S shape, and that the mask itself never renders.
 *
 * WHY ITS OWN FILE.  mp-cape ends by PINNING the body sprite permanently hidden
 * ("Last assertion in the file, so the sprite does not need to come back"), and
 * _placeCape refuses to draw against a hidden body -- so anything appended
 * there measures a capeless player.  Reloading mid-scenario to seed the hair
 * instead drops the equipped cape and turned one change into nine red lines
 * that had nothing to do with it.  A fresh browser seeded BEFORE first paint
 * avoids both.
 *
 * MEASURED WITH `afro`, the tallest hair in the catalog and so the one that
 * overflows a hood by the widest margin.  A smaller style could pass this while
 * a big one still burst out.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  /* Seeded pre-load, for the same reason `phrase` is (harness newPlayer): both
     capeCatalog and hairCatalog read their localStorage key AT MODULE INIT, so
     a post-load write has already missed the question it is answering.  This is
     user DATA, the same class of thing as the Login Key -- not a stub of our
     own code, which is what the `init` note warns against. */
  const P = await H.newPlayer(browser, {
    name: 'Hooded', wsPort, webPort,
    init: () => {
      try {
        localStorage.setItem('bt-hair', 'afro');
        localStorage.setItem('bt_cape', 'crimson');
      } catch (e) { /* a private-mode context simply tests the default look */ }
    },
  });
  await P.page.waitForTimeout(3500);
  await H.enterWorld(P).catch(() => {});
  await P.page.waitForTimeout(2500);

  /* THE CAPE IS THE SERVER'S TO GIVE.  Seeding `bt_cape` alone leaves the
     character bare -- measured: hair arrived, the cape did not.  wsClient takes
     the worn cape from player_state (the v2.3.2142 delta bug is in mp-cape's
     notes), so the ledger has to grant it.  Same path mp-cape walks: grant the
     ticket through the shipped operator API, redeem it through the same message
     the bag's Open button sends. */
  const pid = await P.page.evaluate(
    () => (window._gameState && window._gameState.current && window._gameState.current.myId) || null);
  rec.ok('the player has an id to grant against (guard)', !!pid, { pid });
  await H.grant(wsPort, pid, 'item', { invKey: 'goldticket_crimson', count: 1 }).catch(() => null);
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) {
      S.channel.send({ type: 'cape_redeem',
        payload: { invKey: 'goldticket_crimson', opId: 'mp-capehair-' + Date.now() } });
    }
  });
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'cape_equip', payload: { worn: true } });
  });
  await P.page.waitForTimeout(2000);

  const hp = await P.page.evaluate(
    () => (window.__btCapeHair ? window.__btCapeHair() : null)).catch(() => null);

  rec.ok('the probe reached a player display at all (guard)', !!hp, hp);
  rec.ok('the character is wearing hair for the hood to clip (guard: without it '
    + 'every claim below passes on nothing)', !!(hp && hp.hairVisible), hp);
  rec.ok('the cape is SPLIT across the body — the back half and the hood are '
    + 'both drawn, which is what puts the torso in front of the panels',
    !!(hp && hp.capeBackOn && hp.capeFrontOn), hp);
  rec.ok('the hood mask registered against this frame', !!(hp && hp.hoodMaskReady), hp);
  rec.ok('and the hair is CLIPPED TO THE HOOD, so it cannot poke out past it',
    !!(hp && hp.maskedToHood), hp);
  /* A mask is sampled, not drawn.  If it ever renders the character wears a
     flat white hood -- worth its own assertion, because that reads as the ART
     breaking rather than the clip. */
  rec.ok('and the mask itself is never drawn (it would paint a white hood)',
    !!(hp && !hp.hoodMaskDrawn), hp);

  await P.page.screenshot({ path: 'tools/qa/mp/out/capehair.png' });
  rec.ok('photographed, because no scene-graph number says whether a hood '
    + 'looks right on a head', true, { shot: 'tools/qa/mp/out/capehair.png' });

  /* ═══ EVERY FACING, PHOTOGRAPHED ═══
     The split is not uniform and that is deliberate: south, southwest and east
     put the panels BEHIND the body, while north and northeast keep the single
     in-front sprite because they are the BACK view, where the cape is between
     the viewer and the person and correctly covers them.  A number can say
     which sprites are visible; only a picture says whether the result reads as
     cloth on a person, and the asymmetry is exactly the thing a reviewer will
     want to see rather than take on trust.
     Facing persists after the key is released, so each one is shot STANDING --
     the pose the placement is fitted to. */
  const FACINGS = [['south', ['s']], ['southwest', ['s', 'a']], ['east', ['d']],
                   ['northeast', ['w', 'd']], ['north', ['w']]];
  const seen = [];
  for (const [name, keys] of FACINGS) {
    for (const k of keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(700);
    for (const k of keys) await P.page.keyboard.up(k);
    await P.page.waitForTimeout(900);            /* settle back to standing */
    /* Read the facing the GAME reports, never the key that was pressed: a
       diagonal that does not register leaves the previous facing in place and
       the claim below would then be made about a direction never reached. */
    const st = await P.page.evaluate(() => {
      const r = window._pixiRenderer;
      const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
      const S = window._gameState && window._gameState.current;
      return pd ? {
        facing: (S && S.player && (S.player.facing || S.player.dir)) || null,
        back: !!(pd._capeBackSprite && pd._capeBackSprite.visible),
        front: !!(pd._capeSprite && pd._capeSprite.visible),
      } : null;
    }).catch(() => null);
    await P.page.screenshot({ path: `tools/qa/mp/out/capehair-${name}.png` });
    seen.push({ dir: name, ...(st || {}) });
  }
  rec.ok('all five facings were photographed with the cape on', seen.length === 5, seen);

  /* ═══ THE DIAGONAL, WHILE RUNNING ═══
     Owner: "Show jog southwest while wearing cape."

     The four-way `facing` above cannot answer this: it reports left/right/up/
     down, while the SPRITE direction is an eight-way resolved from the movement
     vector and kept on the display as _animDir.  So this holds both keys and
     waits for the renderer to actually BE in jog + southwest before it shoots --
     a screenshot taken on a timer would be captioned "southwest" whatever the
     character happened to be doing, which is exactly the mislabelling this
     scenario exists to avoid (see the northeast note above).

     Worth its own shot because southwest is where the two halves of the cape
     are hardest: the jog tilt swings the whole garment from the shoulders
     (_capeTune) and the split has to hold while it does. */
  {
    await P.page.keyboard.down('s'); await P.page.keyboard.down('a');
    let hit = null;
    for (let i = 0; i < 40 && !hit; i++) {
      await P.page.waitForTimeout(120);
      const st = await P.page.evaluate(() => {
        const r = window._pixiRenderer;
        const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
        if (!pd) return null;
        return {
          pose: pd._animPose || null, dir: pd._animDir || null,
          back: !!(pd._capeBackSprite && pd._capeBackSprite.visible),
          front: !!(pd._capeSprite && pd._capeSprite.visible),
          rot: +Number((pd._capeSprite && pd._capeSprite.rotation) || 0).toFixed(3),
        };
      }).catch(() => null);
      if (st && st.pose === 'jog' && st.dir === 'southwest') hit = st;
    }
    if (hit) await P.page.screenshot({ path: 'tools/qa/mp/out/capehair-jog-southwest.png' });
    await P.page.keyboard.up('a'); await P.page.keyboard.up('s');
    rec.ok('the renderer reached jog + southwest, so the shot is of what it says',
      !!hit, hit);
    rec.ok('...with the cape still SPLIT while running the diagonal — the tilt '
      + 'swings both halves together, it does not tear them apart',
      !!hit && hit.back && hit.front, hit);
  }
  /* ═══ v2.3.2189: THE HOOD IS ON THE HEAD, NOT ON THE CLOTH ═══
     Owner, two reports: "East jog cape covers player face" and "Southwest jog
     the cape is aligned too far to the right on his head."

     Both were one bug: the hood wore the PANELS' motion.  The tilt swings the
     garment 0.75 rad about the shoulders on east, which on a hood walks its
     front rim down over the face; the slide pushes it 19-28px backwards along
     the line of travel so the hem trails, which on a hood carries it bodily off
     the skull.  v2.3.2189 gave the two halves their own motion terms.

     WHAT IS MEASURED, and why it is this and not a pixel count.  The obvious
     test -- "count the skin pixels on the face" -- cannot be written here: the
     town ground is sandy gold, which passes the engine's own skin predicate
     (r>g>=b, r-b>30, r-g>25) by a mile, so the count would be dominated by
     cobblestones.  What CAN be measured exactly is the thing the owner's words
     describe: where the hood sits RELATIVE TO THE HEAD.  The hair sprite is
     placed from the head every frame, so hood-centre minus hair-centre IS the
     hood's seat on the skull.

     And it is compared against STANDING rather than against a constant, which
     matters twice over: standing is the pose the cape art was fitted to and the
     only one never reported wrong, and comparing to it needs no number baked in
     from this particular cape's fit, so a new cape with a differently-centred
     hood still passes if it is seated the same way running as standing.

     Negative control, MEASURED against the v2.3.2186 renderer with everything
     else in this commit unchanged: east drifts 14.57px and carries the panels'
     full 0.75 rad, southwest drifts 7.93px at -0.50 rad.  All four claims below
     go red there and green here. */
  {
    const seatOf = () => P.page.evaluate(() => {
      const r = window._pixiRenderer;
      const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
      if (!pd) return null;
      const hood = pd._capeSprite, back = pd._capeBackSprite, hair = pd._hairSprite;
      if (!hood || !hood.visible || !hair || !hair.visible) return null;
      const cx = (o) => o.x + (0.5 - o.anchor.x) * Math.abs(Number(o.scale.x)
        * ((o.texture && o.texture.frame && o.texture.frame.width) || 0));
      return {
        pose: pd._animPose || null, dir: pd._animDir || null,
        /* The seat: how far the hood's centre sits from the head's. */
        seat: +(cx(hood) - cx(hair)).toFixed(2),
        hoodRot: +Number(hood.rotation || 0).toFixed(3),
        panelRot: +Number((back && back.visible ? back.rotation : 0) || 0).toFixed(3),
        panelOff: +Number(back && back.visible ? (back.x - hood.x) : 0).toFixed(2),
        split: !!(back && back.visible),
      };
    }).catch(() => null);

    /* Hold the keys until the renderer REPORTS the pose+dir asked for, never a
       timer: the same rule the southwest shot above follows, and for the same
       reason -- a sample taken on a timer would be labelled with a direction
       the character was never in. */
    const settle = async (keys, wantPose, wantDir) => {
      for (const k of keys) await P.page.keyboard.down(k);
      let hit = null;
      for (let i = 0; i < 45 && !hit; i++) {
        await P.page.waitForTimeout(110);
        const st = await seatOf();
        if (st && st.pose === wantPose && st.dir === wantDir) hit = st;
      }
      /* Shot while the keys are still DOWN, because releasing them ends the
         jog: a picture taken after the release would be of a standing
         character captioned as running. */
      if (hit) await P.page.screenshot({ path: `tools/qa/mp/out/capehair-jog-${wantDir}.png` });
      for (const k of keys) await P.page.keyboard.up(k);
      return hit;
    };

    for (const [name, keys] of [['east', ['d']], ['southwest', ['s', 'a']]]) {
      const jog = await settle(keys, 'jog', name);
      await P.page.waitForTimeout(900);                 /* settle to standing */
      const stand = await seatOf();
      rec.ok(`${name}: the renderer reached jog and settled back to stand, so `
        + 'there are two real samples to compare (guard)',
        !!(jog && stand && stand.pose === 'stand'), { jog, stand });
      if (!jog || !stand) continue;
      rec.ok(`${name}: the panels really are streaming on this sample — tilted, `
        + 'or slid back along the line of travel (guard: a still cape would '
        + 'make the claim below pass on nothing)',
        jog.split && (Math.abs(jog.panelRot) > 0.01 || Math.abs(jog.panelOff) > 1),
        jog);
      const drift = Math.abs(jog.seat - stand.seat);
      rec.ok(`${name}: THE HOOD KEEPS ITS SEAT ON THE HEAD WHILE RUNNING — it `
        + 'sits the same distance from the head jogging as standing, which is '
        + 'the pose the art was fitted to (owner: "aligned too far to the right '
        + 'on his head")',
        drift <= 2, { drift: +drift.toFixed(2), jogSeat: jog.seat, standSeat: stand.seat });
      rec.ok(`${name}: ...and it is not ROTATED off the head either, while the `
        + 'panels behind it still swing (owner: "cape covers player face")',
        Math.abs(jog.hoodRot) <= 0.01, jog);
    }
  }

  /* The asymmetry, asserted rather than described: the three front-ish facings
     draw BOTH halves, the two back facings draw only the front sprite. */
  /* WHAT THE GAME ACTUALLY REPORTS is a FOUR-WAY facing -- up/down/left/right --
     not the eight-way sprite dir.  Measured here: pressing w+d leaves it on
     'right', so the diagonals are not reachable through the movement keys at
     all and any claim about northeast would be a claim about a direction this
     scenario never stood in.  So the assertions below cover the four that ARE
     reached, and the diagonals are covered where they are actually decided --
     the loader, which only has hood frames for south/southwest/east, and the
     renderer, which reads the split off whether that texture exists.

         down  -> south   split
         left  -> west  -> east (mirrored, capeSprites BASE_DIR)   split
         right -> east   split
         up    -> north  NOT split: from behind, the cape covers the character */
  const reached = seen.filter((s) => s.facing);
  rec.ok('every shot recorded the facing the game was actually in (guard: a '
    + 'diagonal that never registered would prove nothing)',
    reached.length === seen.length, seen);
  const front = reached.filter((s) => ['down', 'left', 'right'].includes(s.facing));
  const back = reached.filter((s) => s.facing === 'up');
  rec.ok('facing the camera (down/left/right) the cape is SPLIT — a back half '
    + 'behind the body and a hood in front',
    front.length >= 3 && front.every((s) => s.back && s.front), seen);
  rec.ok('...and facing AWAY (up) it is not, because from behind the cape is '
    + 'supposed to cover the character',
    back.length >= 1 && back.every((s) => !s.back && s.front), seen);
}
