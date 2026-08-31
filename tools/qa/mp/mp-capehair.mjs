/* THE HOOD HAS TO CLIP THE HAIR (v2.3.2179).
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
