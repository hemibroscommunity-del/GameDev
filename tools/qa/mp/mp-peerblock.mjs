/* ═══ v2.3.2903: ANOTHER PLAYER'S BLOCK AND SHIELD BASH, AS THEY SEE THEM ═══
 *
 * Owner: "check all other broadcasted player animations to make sure they
 * match what your character does client side so there's no discrepancies."
 *
 * Raising a shield reaches every other screen (player_shield), and so does a
 * Shield Bash (player_swing bash:true).  Neither drew what the player's own
 * screen draws: a watcher saw a blocking player keep walking with the shield
 * still slung on their back, and saw their bash as a SWORD swing.
 *
 * Two real clients.  B carries a shield and a copper sword, raises the shield
 * with the game's own Q key and turns the guard through all eight directions;
 * A watches.  For each direction the watcher's drawing is compared with the
 * guard's OWN screen, from the probes the renderers already write for the
 * local block (__btBlockPose, __btBlockShieldBehind, __btBlockOffHand,
 * __btSouthBlockWeapon) and the watcher's twins (__btPeerHeldShield,
 * __btPeerBlockPose, __btPeerShield):
 *   - the same pose (the block pose on every facing but south, as yours);
 *   - the shield in the same hand, the same size, or behind the body facing
 *     away, at the same point on the figure;
 *   - the weapon in the other hand, the same art at the same point and angle;
 *   - and nothing slung on the back while it is held.
 * Then a Shield Bash: no sword swing on either screen.
 *
 *   node tools/qa/mp/run.mjs peerblock
 */
import * as H from './harness.mjs';

const FACINGS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
const TOL = 0.6;   /* px: the two screens run the same arithmetic on the same numbers */

const guardView = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const d = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw();
  const lo = d && d._shieldBackLo, hi = d && d._shieldBackHi;
  return {
    up: !!S._shieldUp, facing: S._renderFacing || null,
    pose: window.__btBlockPose || null,
    far: window.__btBlockShieldBehind || null,
    off: window.__btBlockOffHand || null,
    south: window.__btSouthBlockWeapon || null,
    slung: !!((lo && lo.visible) || (hi && hi.visible)),
  };
});
const watcherView = (P, id) => P.page.evaluate((id) => {
  const S = window._gameState.current, o = S.others[id];
  const held = window.__btPeerHeldShield ? window.__btPeerHeldShield[id] || null : null;
  const pose = window.__btPeerBlockPose ? window.__btPeerBlockPose[id] || null : null;
  const back = window.__btPeerShield ? window.__btPeerShield[id] || null : null;
  return {
    up: !!(o && o._shieldUp), facing: o ? (o._renderFacing || null) : null,
    held, pose: pose && held && held.pose ? pose : null, slung: !!(back && back.on),
  };
}, id);
const rel = (p, x, y) => ({ x: +(x - p.bodyX).toFixed(2), y: +(y - p.bodyFootY).toFixed(2) });
const near = (a, b) => !!a && !!b && Math.abs(a.x - b.x) <= TOL && Math.abs(a.y - b.y) <= TOL;

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Guard' });
  await H.waitMutualSight(A, B);
  const bId = await H.readState(B, (S) => S.myId);
  await B.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg;
    R.shield = { name: 'Pine Shield', type: 'shield', gearBase: 'pine' };
    R.weapon = { type: 'sword', gearBase: 'copper', name: 'Copper Sword', tier: 'common', tierMult: 1 };
    R.activeSlot = 'melee';
    R.stamina = Math.max(R.stamina || 0, R.maxStamina || 0, 100);
    S.lockedTarget = null; S.autoAttack = false;
  });
  /* The shield and the weapon ride the ~2 s presence relay: two cycles. */
  await A.page.waitForTimeout(4500);
  const known = await A.page.evaluate((id) => {
    const o = window._gameState.current.others[id];
    return o ? { shield: !!(o.rpgData && o.rpgData.shield), wpn: o.wpnType || null, mat: o.wpnMat || null } : null;
  }, bId);
  rec.ok('the watcher knows the guard carries a shield and a copper sword (guard)',
    !!known && known.shield && known.wpn === 'sword' && known.mat === 'copper', known);

  /* Up, with the game's own key: desktopControls raises it on Q down, through
     shieldToggle.raiseShieldToggle (which is what broadcasts it), and drops it
     on Q UP -- a desktop block is held, so the key stays down until the end. */
  await B.page.mouse.click(500, 400).catch(() => {});
  await B.page.evaluate(() => { const S = window._gameState.current; S._mouseAimAngle = 0; });
  await B.page.keyboard.down('KeyQ');
  await B.page.waitForTimeout(700);
  const upB = await guardView(B), upA = await watcherView(A, bId);
  rec.ok('the guard raised the shield with Q, and the watcher was told (guard)', upB.up && upA.up, { guard: upB.up, watcher: upA.up });

  const rows = [];
  for (let i = 0; i < FACINGS.length; i++) {
    await B.page.evaluate((a) => {
      const S = window._gameState.current;
      S._mouseAimAngle = a; S._shieldAngle = a;
      /* The probes below are written only when something is drawn: clear the
         last facing's so a facing that draws nothing cannot read as a match. */
      window.__btBlockOffHand = null; window.__btSouthBlockWeapon = null; window.__btBlockPose = null;
    }, i * Math.PI / 4);
    await B.page.waitForTimeout(900);
    const g = await guardView(B), w = await watcherView(A, bId);
    rows.push({ want: FACINGS[i], g, w });
  }
  const brief = rows.map((r) => `${r.want}: guard ${r.g.pose && r.g.pose.standIn ? 'pose' : 'body'}/${r.g.pose && r.g.pose.shieldSpriteVisible ? 'hand' : (r.g.far ? 'far' : '-')}`
    + ` watcher ${r.w.held && r.w.held.pose ? 'pose' : 'body'}/${r.w.held && r.w.held.on ? 'hand' : (r.w.pose && r.w.pose.shieldBehind ? 'far' : '-')}`).join('; ');
  console.log('    ' + brief);

  const bad = (pred) => rows.filter((r) => !pred(r)).map((r) => r.want);
  rec.ok('both screens turned the guard to each of the eight facings (guard)',
    rows.every((r) => r.g.facing === r.want && r.w.facing === r.want),
    rows.map((r) => ({ want: r.want, guard: r.g.facing, watcher: r.w.facing })));
  const poseOff = bad((r) => !!(r.g.pose && r.g.pose.standIn) === !!(r.w.held && r.w.held.pose)
    && (!(r.g.pose && r.g.pose.standIn) || (r.w.pose && r.w.pose.dir === r.g.pose.standInDir && r.w.pose.fi === 1 && !r.w.pose.weaponShown)));
  rec.ok(`the watcher plays the block pose where the guard's own screen does, held on its steady frame with no bow (${8 - poseOff.length} of 8 facings)`,
    poseOff.length === 0, { off: poseOff, rows: rows.map((r) => ({ f: r.want, guardPose: r.g.pose && r.g.pose.standIn, watcherPose: r.w.pose })) });
  const slungOff = bad((r) => !r.w.slung && !r.g.slung);
  rec.ok(`...with nothing slung on the back while the shield is held, on either screen (${8 - slungOff.length} of 8)`,
    slungOff.length === 0, { off: slungOff });
  const handOff = bad((r) => {
    const gv = !!(r.g.pose && r.g.pose.shieldSpriteVisible), wv = !!(r.w.held && r.w.held.on);
    if (gv !== wv) return false;
    if (!gv) return true;
    return near({ x: r.g.pose.shieldX, y: r.g.pose.shieldY }, { x: r.w.held.x, y: r.w.held.y })
      && Math.round(r.g.pose.shieldW) === Math.round(r.w.held.w);
  });
  rec.ok(`the shield in the hand: the same point on the figure and the same size, on each facing it is drawn there (${8 - handOff.length} of 8)`,
    handOff.length === 0, { off: handOff, rows: rows.filter((r) => handOff.includes(r.want)).map((r) => ({ f: r.want, guard: r.g.pose && { x: r.g.pose.shieldX, y: r.g.pose.shieldY, w: r.g.pose.shieldW, on: r.g.pose.shieldSpriteVisible }, watcher: r.w.held })) });
  /* Your near-side shield is on your display, in the `player` layer, which is
     above every pose figure -- it covers your pose.  A peer's display is in
     `entities`, BELOW the pose layer, so in the pose their shield has to be
     drawn in the pose's own layer, over the figure, or the pose would hide it.
     Checked where it is drawn in front, in the pose. */
  const frontRows = rows.filter((r) => r.g.pose && r.g.pose.standIn && r.g.pose.shieldSpriteVisible);
  const frontOff = frontRows.filter((r) => !(r.w.pose && r.w.pose.shieldFront && r.w.pose.shieldFront.aboveBody)).map((r) => r.want);
  rec.ok(`...and in the pose it is drawn OVER the figure, as yours is (${frontRows.length - frontOff.length} of ${frontRows.length})`,
    frontRows.length > 0 && frontOff.length === 0, { off: frontOff, rows: frontRows.map((r) => ({ f: r.want, front: r.w.pose && r.w.pose.shieldFront })) });
  const farOff = bad((r) => {
    const gf = !!r.g.far, wf = !!(r.w.pose && r.w.pose.shieldBehind);
    if (gf !== wf) return false;
    if (!gf) return true;
    return near(rel(r.g.far, r.g.far.x, r.g.far.y), rel(r.w.pose, r.w.pose.shieldBehind.x, r.w.pose.shieldBehind.y));
  });
  rec.ok(`guarding away from the camera, the shield is behind the body at the same point (${8 - farOff.length} of 8)`,
    farOff.length === 0, { off: farOff, rows: rows.filter((r) => farOff.includes(r.want)).map((r) => ({ f: r.want, guard: r.g.far, watcher: r.w.pose })) });
  const offOff = bad((r) => {
    const standIn = !!(r.g.pose && r.g.pose.standIn);
    if (standIn) {
      const go = r.g.off, wo = r.w.pose && r.w.pose.offHand;
      if (!go || !wo) return !go && !wo;
      return go.type === wo.type && go.artDir === wo.artDir && go.clone === wo.clone
        && near(rel(go, go.x, go.y), rel(wo, wo.x, wo.y)) && Math.abs((go.rotation || 0) - (wo.rotation || 0)) < 0.01;
    }
    return !!(r.g.south && r.g.south.on) === !!(r.w.held && r.w.held.weaponOffHand);
  });
  rec.ok(`the weapon goes in the other hand: the same art, point, side and angle (${8 - offOff.length} of 8)`,
    offOff.length === 0, { off: offOff, rows: rows.filter((r) => offOff.includes(r.want)).map((r) => ({ f: r.want, guard: r.g.off || r.g.south, watcher: (r.w.pose && r.w.pose.offHand) || (r.w.held && r.w.held.weaponOffHand) })) });

  /* ── The Shield Bash (it needs the shield held -- it is, facing east) ── */
  await B.page.evaluate(() => { const S = window._gameState.current; S._mouseAimAngle = 0; S._shieldAngle = 0; });
  await B.page.waitForTimeout(700);
  const cast = await B.page.evaluate(() => {
    const S = window._gameState.current, F = window._gameFns || {};
    S.rpg.stamina = Math.max(S.rpg.stamina || 0, S.rpg.maxStamina || 0, 100);
    const ok = F.castAbility ? F.castAbility('bash') : false;
    return { ok, pose: !!S._bashPose };
  });
  const seen = { guardSword: false, watcherSword: false, watcherBashHeld: 0, samples: 0 };
  for (let i = 0; i < 10; i++) {
    const [gs, ws] = await Promise.all([
      B.page.evaluate(() => { const sp = window._pixiRenderer && window._pixiRenderer.localAttackSpriteRaw('sword'); return !!(sp && sp.visible); }),
      A.page.evaluate((id) => {
        const sp = window._pixiRenderer && window._pixiRenderer.remoteAttackSpriteRaw(id, 'sword');
        const h = window.__btPeerHeldShield ? window.__btPeerHeldShield[id] : null;
        return { sword: !!(sp && sp.visible), bash: !!(h && h.bashing && h.held), on: !!(h && (h.on || h.pose)) };
      }, bId),
    ]);
    seen.samples++;
    if (gs) seen.guardSword = true;
    if (ws.sword) seen.watcherSword = true;
    if (ws.bash && ws.on) seen.watcherBashHeld++;
    await A.page.waitForTimeout(50);
  }
  console.log(`    bash: ${JSON.stringify(cast)}; ${JSON.stringify(seen)}`);
  rec.ok('Shield Bash: the guard bashed, through the game\'s own ability (guard)', cast.ok && cast.pose, cast);
  rec.ok('...and the guard\'s own screen drew no sword swing for it (guard: v2.3.1735)', !seen.guardSword, seen);
  rec.ok('...and neither did the watcher\'s', !seen.watcherSword, seen);
  rec.ok('...where the watcher holds the guard\'s shield out through the bash', seen.watcherBashHeld > 0, seen);

  /* Down again: the shield goes back on the back, on the watcher's screen too. */
  await B.page.keyboard.up('KeyQ');
  await B.page.waitForTimeout(3000);
  const downB = await guardView(B), downA = await watcherView(A, bId);
  rec.ok('lowered with Q: the watcher sees it lowered (guard)', !downB.up && !downA.up, { guard: downB.up, watcher: downA.up });
  rec.ok('...and slung on the back again, as on the guard\'s own screen',
    downB.slung && downA.slung && !(downA.held && downA.held.on), { guard: downB.slung, watcher: downA.slung, held: downA.held });
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
