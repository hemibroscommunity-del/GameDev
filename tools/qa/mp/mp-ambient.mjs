/* ═══ THE MAPS' AMBIENT LIFE, ON EVERY PLAYABLE MAP (v2.3.2735) ═══
 *
 * Owner: "make subtle effects that appear as animations on the worldview?
 * Lava smoke on the fire mountain maybe shimmering a bit on the lava, winds on
 * the desert wind area, water softly waving, etc. also doing a pass on each of
 * the 4 currently playable zones".
 *
 * For the worldview's five features and each of the four spokes this stands
 * the player where the effect belongs (the camera follows), waits for the
 * effects to spawn, and reads window.__btAmbient -- what is alive, by kind,
 * and how many ground glows are on screen -- because a 2px ember or a
 * low-alpha ripple is exactly what a screenshot cannot count.  A picture of
 * each stop is left in tools/qa/mp/out/ambient-*.png for a human.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const TILE = 32;
const PHONE = { width: 390, height: 844 };

const stand = (P, tx, ty) => P.page.evaluate(({ x, y, t }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = x * t + t / 2;
  S.player.y = y * t + t / 2;
  return true;
}, { x: tx, y: ty, t: TILE });

/* Put the player (and so the camera) at (u, v) of the current map. */
const goTo = (P, u, v) => P.page.evaluate(([uu, vv]) => {
  const S = window._gameState.current;
  /* zone.w/h * TILE: 48 tiles for the worldview, 32 for every spoke */
  const w = (S.currentZone === 'worldview' ? 48 : 32) * 32;
  S.player.x = uu * w; S.player.y = vv * w; S.player.vx = 0; S.player.vy = 0;
  S.monsters = [];
  return { x: S.player.x, y: S.player.y };
}, [u, v]);

const probe = (P) => P.page.evaluate(() => window.__btAmbient || null);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Wanderer', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  await H.closeDest(P).catch(() => {});
  /* the town gate opens once the first quest is taken (mp-chopyield's route) */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(800);
  /* screenshot hygiene: the coach tips and quest cards sit over the scene */
  await P.page.addStyleTag({ content: '*:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

  const shotAt = async (name, u, v, want) => {
    await goTo(P, u, v);
    await P.page.waitForTimeout(2600);   /* camera settle + a few seconds of spawns */
    const a = await probe(P);
    console.log(`    ${name}: ` + JSON.stringify(a));
    for (const [kind, min] of Object.entries(want)) {
      const n = kind === 'glows' ? (a && a.glows) || 0 : ((a && a.alive && a.alive[kind]) || 0);
      rec.ok(`${name}: ${kind} on screen (${n})`, n >= min, a);
    }
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/ambient-${name}.png` }).catch(() => {});
    /* MOTION, not a still: these effects are the difference between frames,
       and one frame of a low-alpha ripple is indistinguishable from no ripple
       (TRAPS §102 -- page.screenshot is ~2s a frame here, so the compositor's
       own screencast is used).  Opt-in, it is for a human to watch:
       AMBIENT_CLIPS=1 writes out/ambient-clip-<name>/NNN.jpg. */
    if (process.env.AMBIENT_CLIPS) {
      const dir = `${H.REPO}/tools/qa/mp/out/ambient-clip-${name}`;
      mkdirSync(dir, { recursive: true });
      const cdp = await P.ctx.newCDPSession(P.page);
      let n = 0;
      cdp.on('Page.screencastFrame', async (f) => {
        writeFileSync(`${dir}/${String(n++).padStart(3, '0')}.jpg`, Buffer.from(f.data, 'base64'));
        try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) { /* stopped */ }
      });
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
      await P.page.waitForTimeout(5000);
      await cdp.send('Page.stopScreencast').catch(() => {});
      await cdp.detach().catch(() => {});
      console.log(`    ${name}: ${n} clip frames`);
    }
  };

  /* ── the worldview, reached on foot from town ── */
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns;
    return f && f.TOWN_EXITS ? { townExit: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview') || null } : null;
  });
  let onHub = false;
  for (let i = 0; i < 6 && marks && marks.townExit && !onHub; i++) {
    await stand(P, marks.townExit.tx, marks.townExit.ty);
    onHub = (await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview', { timeout: 6000 }).catch(() => null)) === 'worldview';
  }
  rec.ok('reached the worldview (guard)', onHub, {});
  if (onHub) {
    await P.page.waitForTimeout(1500);
    await shotAt('worldview-volcano', 0.57, 0.17, { glows: 6, smoke: 1 });
    await shotAt('worldview-desert', 0.8, 0.3, { wind: 1, sand: 2 });
    await shotAt('worldview-sea', 0.52, 0.86, { glows: 4, glint: 1 });
    await shotAt('worldview-snow', 0.2, 0.18, { snow: 2 });
    await shotAt('worldview-blossom', 0.12, 0.38, { petal: 1 });
    /* v2.3.2736: the far-south sea, camera pinned to the map's bottom, where
       ripples and glints ran right along the dashboard's top edge and read as
       the tray's own contour flickering (owner).  The tray must be found (its
       top above the view's bottom) and nothing may shine within the fade. */
    await shotAt('worldview-south', 0.45, 0.99, { glows: 2 });
    const south = await probe(P);
    const viewBottom = south && south.view ? south.view.y + south.view.h : 0;
    rec.ok('worldview-south: the dashboard edge is found in the view', !!south && south.seamY < viewBottom, south);
    rec.ok('worldview-south: nothing shines against the dashboard', !!south && south.atSeam === 0, south);
  }

  /* ── the four spokes, by the dev warp ── */
  const spokes = [
    /* the spokes' pollen / embers / sand / snow are worldFx's (v2.3.2712), so
       these ask only for what ambientFx adds there */
    { label: 'Flame Fields', zoneId: 'ember', u: 0.62, v: 0.38, want: { glows: 8, smoke: 1 } },
    { label: 'Wind Dunes', zoneId: 'sky', u: 0.5, v: 0.3, want: { wind: 1 } },
    { label: 'Verdant Wilds', zoneId: 'verdant', u: 0.7, v: 0.45, want: { glows: 3 } },
    { label: 'Frost Ridge', zoneId: 'frost', u: 0.3, v: 0.55, want: { glows: 1 } },
  ];
  for (const sp of spokes) {
    await H.warpToZone(P, { wsPort, label: sp.label, zoneId: sp.zoneId }).catch(() => null);
    const z = await H.readState(P, (S) => S.currentZone);
    rec.ok(`warped to ${sp.zoneId} (guard)`, z === sp.zoneId, { z });
    if (z !== sp.zoneId) continue;
    await H.closeDest(P).catch(() => {});
    await shotAt(sp.zoneId, sp.u, sp.v, sp.want);
  }
  await P.ctx.close().catch(() => {});
}
