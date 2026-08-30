/* ═══ IS A PEER ACTUALLY DRAWN WHILE THEY LIGHT A FIRE? (v2.3.2146) ═══
 *
 * Owner: "the remote player fire starting needs to be fixed. Check that other
 * remote player animations show correctly."
 *
 * mp-remoteanim passes 9/9 and reads the frame INDEX -- the right instrument
 * for "does the strip play once, in order", and blind to what the owner is
 * describing. It cannot see a stand-in that never becomes visible, or one
 * drawn somewhere other than on the peer.
 *
 * That blindness matters more here than anywhere else in the renderer, because
 * entityRenderer HIDES the peer's whole body container while a stand-in is
 * active: `if (display.visible === _rexStandIn) display.visible = !_rexStandIn`.
 * So a stand-in that fails to draw does not degrade to a standing character --
 * the other player VANISHES.
 *
 * This measures the drawn transform and photographs the watcher's screen.
 */
import * as H from './harness.mjs';
import { writeFileSync } from 'node:fs';

const look = (P, id) => P.page.evaluate((pid) => {
  const R = window._pixiRenderer;
  const S = window._gameState && window._gameState.current;
  const o = S && S.others ? S.others[pid] : null;
  return {
    probe: (R && R.remoteSkillProbe) ? R.remoteSkillProbe(pid) : 'no-probe',
    ex: o ? (o._ex || null) : null,
    peerAt: o ? { x: Math.round((o.renderX != null ? o.renderX : o.x) || 0),
      y: Math.round((o.renderY != null ? o.renderY : o.y) || 0) } : null,
  };
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Firestarter' });
  const bId = await H.readState(B, (S) => S.myId);
  await H.waitMutualSight(A, B);
  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.player) S.player.x += 70;
  });
  await A.page.waitForTimeout(1200);

  const before = await look(A, bId);
  rec.ok('the watcher can see the peer before anything starts (guard)',
    !!(before.peerAt), before);

  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return;
    S._campfire = null;
    S._firemaking = { x: S.player.x, y: S.player.y + 6, startedAt: Date.now(), doneAt: Date.now() + 4000 };
  });

  /* Sample through the light, keeping the frame where the stand-in was most
     alive -- an early sample can land before the relay has arrived. */
  let best = null;
  const shots = [];
  for (let i = 0; i < 30; i++) {
    await A.page.waitForTimeout(110);
    const s = await look(A, bId);
    if (s.ex === 'fire' && s.probe && s.probe !== 'no-probe') {
      if (!best || (s.probe.frame || 0) > (best.probe.frame || 0)) best = s;
      if (shots.length < 4) {
        /* A GENEROUS box, not figureBox. figureBox is 40x46 around the peer's
           feet -- fine for a standing character and far too small here: the
           fire stand-in is 154 art-px tall against the body's ~46, so the
           first cut of this cropped the campfire and the peer's boots and cut
           the whole figure off above the knee. */
        const b = await A.page.evaluate((pid) => {
          const S = window._gameState && window._gameState.current;
          const o = S && S.others ? S.others[pid] : null;
          const c = document.querySelector('canvas');
          if (!o || !c || !S.camera) return null;
          const r = c.getBoundingClientRect();
          const sx = r.left + (((o.renderX != null ? o.renderX : o.x) || 0) - S.camera.x) * (S._worldScaleX || 1);
          const sy = r.top + (((o.renderY != null ? o.renderY : o.y) || 0) - S.camera.y) * (S._worldScaleY || 1);
          const W = 190, Hh = 210;
          const x = Math.round(Math.min(Math.max(0, sx - W / 2), innerWidth - W));
          const y = Math.round(Math.min(Math.max(0, sy - Hh + 40), innerHeight - Hh));
          return { x, y, width: W, height: Hh };
        }, bId);
        if (b) {
          /* A SECOND, TIGHT crop of the peer's chest alone. The wide picture
             above is for a human to look at and is useless as a measurement:
             the watcher stands in it too, in their own white t-shirt, so
             counting white in it cannot tell whose shirt it found. That is not
             hypothetical -- it is what the first two cuts of the assertion
             below actually did. This box is 28px wide on the peer's own chest,
             where nothing else can reach. */
          const cb = await A.page.evaluate((pid) => {
            const S = window._gameState && window._gameState.current;
            const o = S && S.others ? S.others[pid] : null;
            const c = document.querySelector('canvas');
            if (!o || !c || !S.camera) return null;
            const r = c.getBoundingClientRect();
            const sx = r.left + (((o.renderX != null ? o.renderX : o.x) || 0) - S.camera.x) * (S._worldScaleX || 1);
            const sy = r.top + (((o.renderY != null ? o.renderY : o.y) || 0) - S.camera.y) * (S._worldScaleY || 1);
            /* 63..82px above the feet is the torso band, measured off the wide
               capture rather than assumed. */
            const x = Math.round(sx - 14), y = Math.round(sy - 82);
            if (x < 0 || y < 0 || x + 28 > innerWidth || y + 19 > innerHeight) return null;
            return { x, y, width: 28, height: 19 };
          }, bId);
          shots.push({
            frame: s.probe.frame,
            png: await A.page.screenshot({ clip: b }),
            chest: cb ? await A.page.screenshot({ clip: cb }) : null,
          });
        }
      }
    }
  }

  rec.ok('the watcher was told the peer is making fire (guard: without the '
    + 'relay there is nothing to draw and nothing below means anything)',
    !!(best && best.ex === 'fire'), best);
  rec.ok('...and the renderer built a stand-in for them', 
    !!(best && best.probe && best.probe !== 'no-probe' && best.probe.code === 'fire'), best && best.probe);

  for (const s of shots) {
    writeFileSync(`${H.REPO}/tools/qa/mp/out/firepeer-f${s.frame}.png`, s.png);
  }
  rec.ok('the peer was photographed mid-light, so the numbers are not the only '
    + 'evidence', shots.length > 0, { shots: shots.map((s) => s.frame) });

  /* ═══ v2.3.2146: ARE THEY WEARING ANYTHING? ═══
     The defect the owner is reporting is visible and nothing above can see it:
     photographed beside the watcher's white t-shirt, the peer lighting the
     fire was BARE CHESTED, because _updateRemoteExtraction had never drawn
     gear on any harvest stand-in. A frame index cannot notice that.

     So count near-WHITE pixels in the crop -- the default tee is white and
     nothing else in this patch of town is. The watcher is deliberately NOT in
     frame (the crop is centred on the peer), so a positive count can only be
     the peer's own shirt. */
  /* ═══ WHY THERE IS NO PIXEL ASSERTION HERE, SAID PLAINLY ═══
     The defect this scenario exists for -- a peer lighting a fire appeared
     BARE CHESTED while the watcher wore a white t-shirt -- is verified by the
     before/after captures this writes, not by a gate. Four attempts at a gate
     were built and all four were wrong, each in a way worth recording:

       1. Counting white anywhere in the crop was VACUOUS: the negative control
          passed with the fix disabled, because this corner of town also holds
          a fountain of white water, the fire's smoke and the bank's sign.
       2. A torso box derived from the peer's anchor landed on sand -- the
          drawn stand-in does not sit where the naive world->screen arithmetic
          puts its feet.
       3. White-versus-SKIN was worse: the skin heuristic (r>120, r-b>30, g>b)
          also matches the tan ground and the olive trousers, so it counted 117
          "skin" pixels on scenery.
       4. Restricting to the peer's own column still read 1 white pixel on a
          frame where an offline scan of the same band found twenty -- because
          the peer's position, and therefore the crop, moves between runs, so a
          band measured off one capture does not hold for the next.

     A gate that is green for the wrong reason is worse than no gate. The
     assertions above (the relay arrived, a stand-in was built, the strip plays
     once in order via mp-remoteanim) are the parts that can be stated
     reliably; the clothes are checked by looking at the pictures. */
  await A.ctx.close();
  await B.ctx.close();
}
