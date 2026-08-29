/* EAST AND WEST ARE THE SAME SHEET — SO WHY IS ONLY ONE BARE? (v2.3.2134)
 *
 * Owner: "I don't understand why east frame jog shoulder only and not west
 * frame jog shoulder has skin problems. It only occurred after adding
 * something (like shield or maybe another layered item)... it used to not be
 * an issue."
 *
 * Both halves of that are load-bearing and both point away from where five
 * sessions have been looking.
 *
 * THE ARTWORK CANNOT DO THIS. public/sprites/gear/shirt/tshirt/ has ONE
 * jog-east.png and no jog-west.png: west is east drawn with a negative
 * scale.x (playerSkins MIRRORED_SOURCE_DIRS). The same pixels reach both
 * facings. So a defect that appears on one and not the other is not in the
 * sheet, and every measurement this subsystem has taken since v2.3.1984 --
 * mp-shirtarm's included -- reads the SHEETS. That is a blind spot the shape
 * of the bug: the one thing those numbers can never see is the thing the
 * owner is describing.
 *
 * AND IT IS A REGRESSION. "It used to not be an issue" makes this a layer
 * that arrived, not art that was always wrong -- which is also why the sheet
 * measurements keep coming back clean.
 *
 * So this scenario photographs the COMPOSITE the game actually draws, running
 * east and then west, and mirrors one onto the other. Anything that survives
 * that mirror is asymmetric in the RENDERER, and whatever it is, it is drawn
 * over the shoulder on one side only.
 */
import * as H from './harness.mjs';

const SHOTS = 8;

/* The figure's box in CSS px, off the camera the renderer is using. Cropping
   is done here rather than by colour: a colour search for the tee found the
   BANK's brown door in five straight pictures (v2.3.2129). */
const figureAt = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const r = document.querySelector('canvas').getBoundingClientRect();
  const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
  const wx = d ? d.x : S.player.x, wy = d ? d.footY : S.player.y;
  return {
    cx: r.left + (wx - S.camera.x) * (S._worldScaleX || 1),
    cy: r.top + (wy - S.camera.y) * (S._worldScaleY || 1),
    dpr: window.devicePixelRatio || 1,
    dir: S._renderFacing || null,
  };
});

/* The arm clone and its shirt clone, read straight off the display. This is
   the claim the whole file exists for, and it is a STRUCTURAL one rather than
   a pixel one: a bare-skin body clone drawn over a worn shirt is the bug, and
   it is visible here as "the body clone is up and the shirt clone is not". */
const armClone = (P) => P.page.evaluate(() => {
  const pd = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw
    ? window._pixiRenderer.playerDisplayRaw() : null;
  if (!pd) return null;
  const b = pd._handArmSprite, sh = pd._handArmShirt, worn = pd._gearShirt;
  const cp = pd._handArmCape, wornCape = pd._capeSprite;          /* v2.3.2138 */
  const idx = (o) => { try { return pd.getChildIndex(o); } catch (e) { return -1; } };
  return {
    body: !!(b && b.visible), shirt: !!(sh && sh.visible),
    worn: !!(worn && worn.visible),
    cape: !!(cp && cp.visible), wornCape: !!(wornCape && wornCape.visible),
    bodyIdx: b ? idx(b) : -1, shirtIdx: sh ? idx(sh) : -1,
    capeIdx: cp ? idx(cp) : -1,
    wornIdx: worn ? idx(worn) : -1,
    weaponIdx: pd._weaponContainer ? idx(pd._weaponContainer) : -1,
    /* The cape is tilted and shoulder-pivoted on a jog; the clone has to carry
       both or it lays a straight stripe over a slanted cape. */
    capeRot: cp ? +Number(cp.rotation || 0).toFixed(3) : null,
    wornCapeRot: wornCape ? +Number(wornCape.rotation || 0).toFixed(3) : null,
    capeAnchorY: cp ? +Number(cp.anchor.y).toFixed(3) : null,
    wornCapeAnchorY: wornCape ? +Number(wornCape.anchor.y).toFixed(3) : null,
  };
});

const poseNow = (P) => P.page.evaluate(() => {
  const pd = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw
    ? window._pixiRenderer.playerDisplayRaw() : null;
  const b = pd && pd._spriteBody;
  return {
    pose: pd ? pd._animPose : null,
    mirror: b ? b.scale.x < 0 : null,
    /* Every child the renderer is drawing over the body, by the field name it
       hangs off the display under. A layer that is present on one facing and
       not the other is the answer on its own. */
    layers: pd ? Object.keys(pd).filter((k) => {
      const v = pd[k];
      return v && typeof v === 'object' && 'visible' in v && v.visible === true
        && k !== '_spriteBody';
    }) : null,
  };
});

async function runSide(P, key, tag, rec) {
  await P.page.keyboard.down(key);
  /* The worker owns the weapon and echoes it back, so it has to be re-asserted
     as the run goes (mp-swordcarry does the same and says so). */
  const keepArmed = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.rpg) S.rpg.weapon = { name: 'Copper Sword', type: 'sword', gearBase: 'copper' };
  }).catch(() => {});
  const shots = [];
  for (let i = 0; i < SHOTS; i++) {
    await keepArmed();
    await P.page.waitForTimeout(130);
    const p = await poseNow(P);
    if (p.pose !== 'jog') continue;
    const at = await figureAt(P);
    const cl = await armClone(P);
    const f = `/home/user/GameDev/tools/qa/mp/out/jogside-${tag}-${shots.length}.png`;
    await P.page.screenshot({ path: f });
    shots.push({ shot: f, at, clone: cl, ...p });
  }
  await P.page.keyboard.up(key);
  await P.page.waitForTimeout(700);
  rec.ok(`the character actually jogged ${tag} (guard)`, shots.length > 0,
    { got: shots.length });
  return shots;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sides', wsPort, webPort,
    viewport: { width: 390, height: 844 }, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2200);

  /* The loadout the report is about: a plain tee, nothing over it, hair on --
     the hair is a separate composited sprite, and running bald is how the
     v2.3.1990 hunt produced a false negative. */
  const armed = await P.page.evaluate(() => {
    try {
      if (window.__btGearSet) { window.__btGearSet('shirt', 'tshirt'); window.__btGearSet('chest', 'none'); }
    } catch (e) {}
    try { if (window.__btSetHair) window.__btSetHair('afro'); } catch (e) {}
    return window.__btWardrobe ? window.__btWardrobe() : null;
  });
  await P.page.waitForTimeout(900);
  rec.ok('the tee is really on the character, through the real gear store',
    !!(armed && armed.gearShirt === 'tshirt'), armed);

  /* ── THE BUG, WATCHED FOR DIRECTLY ──
     The arm capsule only arms IN COMBAT (v2.3.200), so a peaceful jog never
     reaches it -- which is part of why this survived six reports and every
     sheet measurement. Drawing a sword is what turns it on. */
  const armedWpn = await P.page.evaluate(() => {
    /* Straight onto S.rpg.weapon, the way mp-swordcarry does it: the capsule
       lives inside the branch that draws a real weapon SPRITE, and a bad slot
       id falls through to the procedural fallback, which hides both clones --
       which is exactly how the first run of this file reported "never armed"
       while the bug was sitting right there. A SWORD specifically: the sibling
       hand-cap is sword-only and the capsule shares its block. */
    const S = window._gameState.current;
    if (!S || !S.rpg) return null;
    S.rpg.weapon = { name: 'Copper Sword', type: 'sword', gearBase: 'copper' };
    return S.rpg.weapon;
  });
  rec.ok('a real sword is in hand (guard: the capsule only exists on the '
    + 'weapon-sprite path)', !!armedWpn, armedWpn);
  await P.page.waitForTimeout(900);

  /* ── A REAL CAPE, THROUGH THE REAL PATH ──
     v2.3.2138. The worker echoes the cape its LEDGER says you own, null
     included, so a locally-set cape is taken straight back off (mp-cape says
     so). The ticket is seeded through the shipped operator API and redeemed
     with the message the Open button sends. */
  const pid = await P.page.evaluate(() => (window._gameState
    && window._gameState.current && window._gameState.current.myId) || null);
  await H.grant(wsPort, pid, 'item', { invKey: 'goldticket_crimson', count: 1 })
    .catch(() => null);
  await P.page.waitForTimeout(1500);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) {
      S.channel.send({ type: 'cape_redeem',
        payload: { invKey: 'goldticket_crimson', opId: 'mp-jogsides-' + Date.now() } });
    }
  });
  await P.page.waitForTimeout(2200);
  const caped = await armClone(P);
  rec.ok('the character is actually wearing a cape (guard: the cape claims '
    + 'below pass on nothing without one)', !!(caped && caped.wornCape), caped);

  const east = await runSide(P, 'd', 'east', rec);
  /* Back to the middle: holding a key runs the character into a map edge,
     where the camera clamps and the crop loses the side of him that matters
     (v2.3.2129). */
  await P.page.keyboard.down('a');
  await P.page.waitForTimeout(2400);
  await P.page.keyboard.up('a');
  await P.page.waitForTimeout(700);
  const west = await runSide(P, 'a', 'west', rec);

  const dirs = { east: [...new Set(east.map((s) => s.dir))], west: [...new Set(west.map((s) => s.dir))] };
  console.log('    facings: ' + JSON.stringify(dirs));
  console.log('    east layers: ' + JSON.stringify(east[0] && east[0].layers));
  console.log('    west layers: ' + JSON.stringify(west[0] && west[0].layers));
  console.log('    mirror: east ' + (east[0] && east[0].mirror) + ' / west ' + (west[0] && west[0].mirror));

  /* ── THE ASYMMETRY, NAMED ──
     West is east mirrored, so the sheets cannot differ; what differs is which
     LAYERS the renderer puts up. Measured here: the arm clone (_handArmSprite,
     and now _handArmShirt with it) is drawn on EAST and not on west, because
     `useArmCapsule` is gated on `facingIdx === 0`. That is the whole of the
     owner's "east and not west", and it is by design -- the capsule exists so
     the upper arm covers the SHIELD during the east back-swing (v2.3.196/200/
     202). Reported rather than failed: the asymmetry is the feature, the bare
     skin it used to stamp was the bug. */
  const eL = new Set(east.flatMap((s) => s.layers || []));
  const wL = new Set(west.flatMap((s) => s.layers || []));
  const onlyE = [...eL].filter((k) => !wL.has(k));
  const onlyW = [...wL].filter((k) => !eL.has(k));
  console.log('    east-only layers: ' + JSON.stringify(onlyE));
  console.log('    west-only layers: ' + JSON.stringify(onlyW));
  rec.ok('the arm clone is EAST-only — the asymmetry the report describes, '
    + 'located in the renderer rather than in the artwork',
    onlyE.includes('_handArmSprite') && onlyW.length === 0,
    { onlyEast: onlyE, onlyWest: onlyW });

  /* ── THE REGRESSION TEST ──
     The body clone is BARE SKIN. Over a worn shirt it has to be accompanied by
     the shirt clone or it stamps a bare shoulder — v2.3.749 hit the identical
     thing on the sibling hand-cap. Every frame where the clone armed is
     checked, not just one: it comes and goes through the stride. */
  const cloned = east.filter((s) => s.clone && s.clone.body);
  rec.ok('the arm clone actually armed during the east run (guard: without '
    + 'this every claim below passes on nothing)',
    cloned.length > 0, { armedFrames: cloned.length, of: east.length });
  rec.ok('the bare-skin arm clone never draws over a worn shirt alone '
    + '(v2.3.2134: the shirt clone rides along)',
    cloned.length > 0 && cloned.every((s) => !s.clone.worn || s.clone.shirt),
    cloned.map((s) => s.clone));
  rec.ok('...and the shirt clone sits ABOVE the body clone and below the weapon, '
    + 'so v2.3.200\'s shield/blade sandwich is unchanged',
    cloned.length > 0 && cloned.every((s) => !s.clone.shirt
      || (s.clone.shirtIdx > s.clone.bodyIdx
        && (s.clone.weaponIdx < 0 || s.clone.shirtIdx < s.clone.weaponIdx))),
    cloned.map((s) => s.clone));

  /* v2.3.2138: the cape is the OTHER layer the clone draws over -- capeSprite
     is added to the display before the clone, so it was being stamped exactly
     as the tee was. Fixing one and not the other is what this covers. */
  rec.ok('...and it never draws over a worn CAPE alone either '
    + '(v2.3.2138: the cape clone rides along too)',
    cloned.length > 0 && cloned.every((s) => !s.clone.wornCape || s.clone.cape),
    cloned.map((s) => s.clone));
  rec.ok('...with the cape clone on top of the shirt clone, matching the order '
    + 'the real layers draw in',
    cloned.length > 0 && cloned.every((s) => !s.clone.cape
      || (s.clone.capeIdx > s.clone.bodyIdx
        && (!s.clone.shirt || s.clone.capeIdx > s.clone.shirtIdx)
        && (s.clone.weaponIdx < 0 || s.clone.capeIdx < s.clone.weaponIdx))),
    cloned.map((s) => s.clone));
  /* The tilt is the part a position-only copy would lose, and losing it is
     worse than the bug: a straight stripe across a slanted cape. */
  rec.ok('...and the cape clone carries the cape\'s own TILT and shoulder '
    + 'pivot, not just its position',
    cloned.length > 0 && cloned.every((s) => !s.clone.cape
      || (s.clone.capeRot === s.clone.wornCapeRot
        && s.clone.capeAnchorY === s.clone.wornCapeAnchorY)),
    cloned.map((s) => ({ rot: s.clone.capeRot, wornRot: s.clone.wornCapeRot,
      aY: s.clone.capeAnchorY, wornAY: s.clone.wornCapeAnchorY })));

  try {
    const fs = await import('node:fs');
    fs.writeFileSync('/home/user/GameDev/tools/qa/mp/out/jogsides.json',
      JSON.stringify({ east, west }, null, 2));
  } catch (e) { /* the pictures are the deliverable */ }
  rec.ok('both sides were photographed for the mirror comparison',
    east.length > 0 && west.length > 0, { east: east.length, west: west.length });

  await P.ctx.close().catch(() => {});
}
