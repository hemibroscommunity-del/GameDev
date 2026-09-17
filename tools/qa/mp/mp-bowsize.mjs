/* ═══ v2.3.2608: DOES A PEER SHRINK AND JUMP WHEN THEY SHOOT? ═══
 *
 * Owner: "Other players get smaller and move when they do bow shooting."
 *
 * Two real clients, because this defect is invisible to one.  A bow shot
 * replaces the shooter's body with a stand-in, and the LOCAL and REMOTE draw
 * paths are parallel implementations (entityRenderer says so in as many words:
 * "the fourth time a fix has had to land twice in this file").  Your own
 * stand-in is sized and planted from the walking body's MEASURED geometry;
 * a peer's was sized from a flat constant and planted on their entity origin.
 * So your own bow shot is seamless and everyone else's is not, and the one
 * client that could see it is the one that cannot.
 *
 * MEASURED, NOT EYEBALLED.  The owner's two words are two numbers:
 *
 *   "smaller" -> the drawn height of the stand-in.  Both paths draw the SAME
 *     bow sheet, so |scale.y| * frameHeight is directly comparable between
 *     them -- the shooter's own screen against the watcher's, same shot, same
 *     build, same zone.  They must agree.
 *
 *   "move" -> the foot line.  On the WATCHER'S OWN SCREEN, where the peer's
 *     feet were while walking (__btPeersDrawn) against where the stand-in puts
 *     them during the shot (__btPeerBowFigure).  A figure whose feet move when
 *     the pose changes is the jump being reported, and comparing the two on
 *     one screen means no camera or interpolation difference can explain it.
 *
 * Sampled ACROSS THE ANIMATION rather than once: the draw/release frames are
 * different textures, and "it is right on frame 0 and wrong on frame 5" is a
 * failure a single sample passes.
 *
 * ═══ THIS SCENARIO FAILS ON PURPOSE (v2.3.2608) ═══
 * It is the REPRODUCTION, and the fix is not in this branch.  Against the
 * current renderer it reports:
 *
 *     peer 108.45, own 135.56, -20.00%
 *
 * i.e. every other player's bow figure is drawn a fifth smaller than the
 * shooter's own, steady across all 13 sampled frames (spread 0px), in town at
 * pscale 1.  That is the owner's "get smaller", measured.
 *
 * The foot line does NOT move (walking 1192.3, shooting 1192.3, +0px) and that
 * assertion is kept because it is the control: it says the jump the owner sees
 * is the 20% shrink about a foot anchor -- the head drops by a fifth of the
 * figure's height while the boots stay put -- and not an independent
 * displacement.  A fix that moved the feet would now break it.
 *
 * DO NOT MERGE THIS AHEAD OF THE FIX: a full `run.mjs` with no arguments exits
 * non-zero while this is red.
 *
 * WHY THE FIX IS NOT HERE.  The remote path scales from a flat constant
 * (REMOTE_BOW_SCALE = 0.45) while the local one derives from the walking body's
 * MEASURED, PER-FACING geometry (S._swordBodyH / 188).  A constant cannot be
 * right for every facing, so the honest fix is to derive the peer's the same
 * way -- which needs bodyRows/bodyDirScale/LOCAL_SCALE, all private to
 * entityRenderer, published per peer the way S._swordBodyH already is for the
 * local player.  The same unconfirmed 0.45 sits in _updateRemoteSwordSwings,
 * whose own comment calls both "first-cut tunables to confirm on the preview
 * (the remote draw scale ~ bodyDirScale*0.421875 ~ 0.42)" -- so the sword
 * stand-in has the same defect and wants the same fix in the same pass.
 * Guessing a replacement constant against this one measurement would land east
 * and quietly miss the other seven facings.
 *
 *   node tools/qa/mp/run.mjs bowsize
 */
import * as H from './harness.mjs';

/* The shot, as monsterCombat.js fires it: the local half that drives the
   shooter's own stand-in, and the broadcast that drives everyone else's.
   Split out of the real send rather than invented -- the payload shape is
   `player_projectile` verbatim (monsterCombat.js). */
const fire = (P, ang) => P.page.evaluate((a) => {
  const S = window._gameState.current;
  if (!S || !S.channel) return false;
  S._bowShotAt = Date.now();
  S._bowShotAng = a;
  S.channel.send({ type: 'broadcast', event: 'player_projectile', payload: {
    id: S.myId, x: Math.round(S.player.x), y: Math.round(S.player.y),
    ang: a, isStaff: false, ts: Date.now(), life: 90,
  } });
  return true;
}, ang);

const peerWalk = (P, id) => P.page.evaluate((pid) =>
  (window.__btPeersDrawn ? window.__btPeersDrawn(pid) : null), id);
const peerBow = (P, id) => P.page.evaluate((pid) =>
  (window.__btPeerBowFigure ? window.__btPeerBowFigure(pid) : null), id);
const ownBow = (P) => P.page.evaluate(() =>
  (window.__btBowFigure ? window.__btBowFigure() : null));

const med = (a) => {
  const v = a.filter((n) => typeof n === 'number' && isFinite(n)).sort((x, y) => x - y);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Archer' });
  await H.waitMutualSight(A, B);
  await A.page.waitForTimeout(1200);
  const bId = await H.readState(B, (S) => S.myId);

  /* ── where the peer's feet are while he is just standing there ── */
  let walk = null;
  for (let i = 0; i < 25 && !walk; i++) {
    await A.page.waitForTimeout(140);
    const w = await peerWalk(A, bId);
    if (w && w.visible && w.height > 0) walk = w;
  }
  rec.ok('the watcher can see the archer standing (guard)', !!walk, walk || {});
  if (!walk) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }

  /* ── the shot, sampled across its frames on BOTH screens ── */
  const ANG = 0;   /* due east: a side-on pose, so a height change is unmissable */
  await fire(B, ANG);
  const peerH = [], peerY = [], ownH = [], ownY = [];
  for (let i = 0; i < 14; i++) {
    await A.page.waitForTimeout(55);
    const [pb, ob] = await Promise.all([peerBow(A, bId), ownBow(B)]);
    if (pb && pb.visible) { peerH.push(pb.drawnH); peerY.push(pb.footY); }
    if (ob && ob.visible) { ownH.push(ob.drawnH); ownY.push(ob.drawnH != null ? ob.footY : null); }
  }
  rec.ok('the watcher drew a bow stand-in for the archer (guard)', peerH.length > 0,
    { samples: peerH.length });
  rec.ok('the archer drew one on his own screen too (guard)', ownH.length > 0,
    { samples: ownH.length });
  if (!peerH.length || !ownH.length) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }

  const pH = med(peerH), oH = med(ownH), pY = med(peerY);
  const shrinkPct = +(((pH - oH) / oH) * 100).toFixed(2);
  const shiftPx = +(pY - walk.footY).toFixed(2);

  /* ── 1. "SMALLER" ── */
  rec.ok(`the peer's bow figure is the same size as the archer's own `
    + `(peer ${pH}, own ${oH}, ${shrinkPct >= 0 ? '+' : ''}${shrinkPct}%)`,
    Math.abs(pH - oH) <= 1.0,
    { peerDrawnH: pH, ownDrawnH: oH, shrinkPct, peerSamples: peerH, ownSamples: ownH });

  /* ── 2. "MOVE" ── */
  rec.ok(`the peer's feet do not move when he shoots `
    + `(walking ${walk.footY}, shooting ${pY}, ${shiftPx >= 0 ? '+' : ''}${shiftPx}px)`,
    Math.abs(shiftPx) <= 1.0,
    { walkFootY: walk.footY, bowFootY: pY, shiftPx, peerSamples: peerY });

  /* ── 3. and it holds for the WHOLE animation, not just the frame we caught ── */
  const spreadH = +(Math.max(...peerH) - Math.min(...peerH)).toFixed(2);
  rec.ok(`...and the peer's size is steady across the draw (spread ${spreadH}px)`,
    spreadH <= 1.0, { peerSamples: peerH, spreadH });
  const spreadY = +(Math.max(...peerY) - Math.min(...peerY)).toFixed(2);
  rec.ok(`...and so is where he stands (spread ${spreadY}px)`,
    spreadY <= 1.0, { peerSamples: peerY, spreadY });

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
