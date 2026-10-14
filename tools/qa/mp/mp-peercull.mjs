/* ═══ v2.3.3241: A PLAYER FAR OFF SCREEN IS NOT DRAWN; A PLAYER SOUTH OF YOU STAYS PUT ═══
 *
 * entityRenderer _updateOtherPlayers, after the owner's "stress test to see
 * what can be optimized":
 *
 *   1. THE FAR CULL.  In the Wheel another player past the view's half-diagonal
 *      plus PEER_FAR_MARGIN (400) from its middle is not drawn: their display
 *      hidden and nothing else done for them that frame (the monsters' rule
 *      since v2.3.2978).  Checked here with two phones: near, the other is
 *      drawn; walked 1,800 px off, they are hidden (S._peersFarHidden, the
 *      drawn-peer probe null, their figure still kept); walked back, they are
 *      drawn again, with a body, where they stand.
 *   2. NO MORE PING-PONG.  The depth pass moves a player standing south of you
 *      into the front layer every frame, and the peer loop used to move them
 *      straight back into the entity layer the next: two re-parentings a frame
 *      each, and Pixi rebuilding its draw list every frame for them.  Counted
 *      here by watching both sorted layers' addChild for the other player's
 *      figure while they stand still south of you: none in 60 frames (the old
 *      code: about two a frame).
 *
 *   node tools/qa/mp/run.mjs peercull
 *   BT_PEERCULL_QUERY=nopeercull node tools/qa/mp/run.mjs peercull   # the old way: fails 2 and 3
 */
import * as H from './harness.mjs';

const VIEW = { width: 390, height: 844 };
const QUERY = process.env.BT_PEERCULL_QUERY || '';

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Near', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true, query: QUERY });
  const B = await H.newPlayer(browser, { name: 'Wander', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true, guest: true, query: QUERY });
  await H.enterWorld(A);
  await H.enterWorld(B);
  const inWheel = async (P) => {
    for (let i = 0; i < 120; i++) {
      const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (z === 'wheel') return true;
      await P.page.waitForTimeout(500);
    }
    return false;
  };
  const okA = await inWheel(A), okB = await inWheel(B);
  rec.ok('setup: both phones in the Wheel', okA && okB, { okA, okB });
  if (!(okA && okB)) return;

  /* real input on a loop (the idle logout), Control as the QA keep-alive */
  let stopAlive = false;
  for (const P of [A, B]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }

  try {
    await H.waitMutualSight(A, B);
    const idB = await H.readState(B, (S) => S.myId);
    const posA = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
    /* B a little east of A, on screen */
    await H.hopTo(B, posA.x + 120, posA.y);
    await A.page.waitForTimeout(1500);
    const near = await A.page.evaluate((id) => {
      const S = window._gameState.current;
      return { far: S._peersFarHidden || 0, drawn: window.__btPeersDrawn ? window.__btPeersDrawn(id) : 'no probe' };
    }, idB);
    rec.ok('near: the other player is drawn (visible, with a body) and nobody is culled',
      near.far === 0 && near.drawn && near.drawn.visible === true && near.drawn.width > 0, near);

    /* ── 2. south of you, standing still: no re-parenting ─────────────── */
    await H.hopTo(B, posA.x, posA.y + 220);
    await A.page.waitForTimeout(2000);
    const pingpong = await A.page.evaluate(async (id) => {
      const label = 'other_' + id;
      const R = window._pixiRenderer;
      const find = (root, name) => {
        const st = [root];
        while (st.length) {
          const c = st.pop();
          if (c && c.label === name) return c;
          if (c && c.children) for (const k of c.children) st.push(k);
        }
        return null;
      };
      const stage = R && R.app && R.app.stage;
      const ent = stage && find(stage, 'entities');
      const front = stage && find(stage, 'gatherNodesFront');
      if (!ent || !front) return { error: 'layers not found', ent: !!ent, front: !!front };
      let moves = 0;
      const wrap = (layer) => {
        const orig = layer.addChild;
        layer.addChild = function (...kids) {
          for (const k of kids) if (k && k.label === label) moves++;
          return orig.apply(this, kids);
        };
        return () => { layer.addChild = orig; };
      };
      const un1 = wrap(ent), un2 = wrap(front);
      const layers = [];
      for (let f = 0; f < 60; f++) {
        await new Promise((r) => requestAnimationFrame(() => r()));
        const d = window.__btDepthLayers ? window.__btDepthLayers()[label] : null;
        layers.push(d);
      }
      un1(); un2();
      return { moves, frames: 60, layer: [...new Set(layers)] };
    }, idB);
    rec.ok('south of you and standing still: drawn over you (the front layer) and never re-parented in 60 frames (was ~2 a frame)',
      !pingpong.error && pingpong.moves === 0 && pingpong.layer.length === 1 && pingpong.layer[0] === 'gatherNodesFront', pingpong);

    /* ── 1. far off: not drawn ─────────────────────────────────────────── */
    /* north, onto the commons' grass (east of town is the Sweetwater) */
    await H.hopTo(B, posA.x, posA.y - 1800, { tries: 60 });
    let far = null;
    for (let i = 0; i < 20; i++) {
      far = await A.page.evaluate((id) => {
        const S = window._gameState.current;
        const o = S.others && S.others[id];
        const dl = window.__btDepthLayers ? window.__btDepthLayers() : {};
        return { culled: S._peersFarHidden || 0, drawn: window.__btPeersDrawn(id), kept: !!dl['other_' + id],
          dist: o ? Math.round(Math.hypot((o.renderX || o.x) - S.player.x, (o.renderY || o.y) - S.player.y)) : null };
      }, idB);
      if (far.culled >= 1 && far.dist > 1500) break;
      await A.page.waitForTimeout(500);
    }
    rec.ok('1,800 px off: not drawn (culled, the drawn-peer probe null) but their figure kept for coming back',
      far.culled === 1 && far.drawn === null && far.kept === true && far.dist > 1500, far);

    /* ── back again: drawn, where they stand ───────────────────────────── */
    await H.hopTo(B, posA.x + 150, posA.y + 40, { tries: 60 });
    let back = null;
    for (let i = 0; i < 20; i++) {
      back = await A.page.evaluate((id) => {
        const S = window._gameState.current;
        const o = S.others && S.others[id];
        const d = window.__btPeersDrawn(id);
        return { culled: S._peersFarHidden || 0, drawn: d, dx: d && o ? Math.round(d.x - (o.renderX || o.x)) : null };
      }, idB);
      if (back.culled === 0 && back.drawn && back.drawn.visible) break;
      await A.page.waitForTimeout(500);
    }
    rec.ok('walked back: drawn again, with a body, where they stand',
      back.culled === 0 && back.drawn && back.drawn.visible === true && back.drawn.width > 0 && Math.abs(back.dx) < 4, back);
  } finally {
    stopAlive = true;
  }
  rec.ok('no page errors', !A.logs.some((l) => /pageerror/.test(l)) && !B.logs.some((l) => /pageerror/.test(l)),
    A.logs.concat(B.logs).filter((l) => /pageerror/.test(l)).slice(-5));
}
