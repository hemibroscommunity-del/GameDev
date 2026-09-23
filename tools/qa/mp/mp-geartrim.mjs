/* Cropped gear frames (v2.3.2746).
 *
 * Owner: "would it be an improvement to the memory constraints that currently
 * exist equipping armor while running on mobile?" -- then "yes, build the
 * cropping PR".
 *
 * gearSheets now crops the empty space off every walking-layer gear frame and
 * hands the renderer Textures whose `orig` is the whole frame and whose `trim`
 * says where the crop sits in it.  The claim has two halves and this checks
 * both, on the live renderer rather than on the sheets:
 *
 *   SMALLER -- the cropped sheets hold under a third of the bytes the uncropped
 *   strips did (__btGearTrim, counted as they are built), and the whole-game
 *   texture total (__btTex) is printed so a before/after against the previous
 *   build is one number each side.
 *
 *   IN THE SAME PLACE -- every visible armour sprite, on the wearer's own
 *   screen AND on a peer's, reports a bounding box that is exactly the body
 *   sprite's box.  Sprite bounds are computed from `orig`, so this is the check
 *   that `_placeGear`'s scale moved from frame to orig: had it not, a cropped
 *   64px frame would be scaled 2x and its box would be twice the body's.
 *   It is asserted in every facing while jogging and standing, local and peer.
 *
 * Pictures of the armoured figure (both screens, four facings) land in
 * GEARTRIM_SHOTS (default /tmp/qa-geartrim) for a by-eye comparison against
 * the previous build.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const DIR = process.env.GEARTRIM_SHOTS || '/tmp/qa-geartrim';

const setGear = (P, slot, id) => P.page.evaluate(({ s, i }) => {
  if (!window.__btSetGear) return 'missing';
  window.__btSetGear(s, i);
  return 'ok';
}, { s: slot, i: id });

/* Every player display in the scene graph (the peer displays live in a closure
   map the facade does not expose, so they are found by walking the stage for
   the gear-sprite fields every player display carries). */
const displays = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer;
  const stage = R && R.app && R.app.stage;
  if (!stage) return null;
  const own = R.playerDisplayRaw ? R.playerDisplayRaw() : null;
  const found = [];
  const walk = (c, d) => {
    if (!c || d > 10) return;
    if (c._spriteBody && ('_gearChest' in c || '_gearLegs' in c)) { found.push(c); return; }
    for (const ch of (c.children || [])) walk(ch, d + 1);
  };
  walk(stage, 0);
  const box = (s) => { const b = s.getBounds(); return [b.minX, b.minY, b.maxX, b.maxY]; };
  return found.filter((d) => d.visible !== false).map((d) => {
    const body = d._spriteBody;
    const bodyBox = body && body.visible && body.texture ? box(body) : null;
    const layer = (k) => {
      const s = d[k];
      if (!s || !s.visible || !s.texture) return null;
      const t = s.texture;
      const b = box(s);
      return {
        cropped: !!t.trim,
        origW: t.orig ? t.orig.width : null,
        frameW: t.frame ? t.frame.width : null,
        /* how far each edge of the layer's box sits from the body's */
        off: bodyBox ? b.map((v, i) => +(v - bodyBox[i]).toFixed(2)) : null,
      };
    };
    return {
      own: d === own,
      pose: d._animPose || null, dir: d._animDir || null,
      body: !!bodyBox,
      chest: layer('_gearChest'), legs: layer('_gearLegs'), shirt: layer('_gearShirt'),
    };
  });
});

const tex = (P) => P.page.evaluate(() => (window.__btTex ? window.__btTex() : null));
const trimStats = (P) => P.page.evaluate(() => (window.__btGearTrim ? window.__btGearTrim() : null));

/* A drawn layer's box must be the body's box, to the pixel.  Only layers drawn
   on the plain walking path are held to it -- a pose with its own per-slot
   nudge (pickup) is not reached here. */
const aligned = (L) => !L || (L.off && L.off.every((v) => Math.abs(v) < 0.5));

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(DIR, { recursive: true });
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Plated', nameB: 'Watcher' });

  const stats = await trimStats(A);
  rec.ok('the gear sheets are built cropped (probe present, sheets counted)',
    !!stats && stats.sheets > 0, stats);
  if (stats && stats.fullBytes) {
    const ratio = stats.packedBytes / stats.fullBytes;
    console.log(`INFO  geartrim :: cropped gear sheets ${(stats.packedBytes / 1048576).toFixed(1)} MB vs ${(stats.fullBytes / 1048576).toFixed(1)} MB uncropped (${(ratio * 100).toFixed(0)}%) over ${stats.sheets} sheets`);
    rec.ok('the cropped sheets hold under a third of the uncropped bytes', ratio < 1 / 3, stats);
  }

  /* Steel chest over COPPER greaves: two metals cannot be one fullset figure
     (entityRenderer _fullsetFrame, v2.3.1761), so every facing takes the
     layered path and there is a chest AND a legs sprite to measure.  The full
     steel set would swap in the (uncropped) knight figure on four jog facings
     and leave nothing to check there. */
  rec.ok('the test can drive the equip store', (await setGear(A, 'chest', 'steelplate')) === 'ok');
  await setGear(A, 'legs', 'coppergreaves');
  await A.page.waitForTimeout(2500);
  await H.waitMutualSight(A, B).catch(() => {});

  const t0 = await tex(A);
  if (t0) console.log(`INFO  geartrim :: resident texture total ${t0.mb} MB (${t0.sources} sources), armoured, town`);

  const pics = [];
  for (const [key, name] of [['s', 'south'], ['d', 'east'], ['w', 'north'], ['a', 'west']]) {
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(450);
    const mine = (await displays(A)) || [];
    const theirs = (await displays(B)) || [];
    const box = await H.figureBox(A, { pad: 14 }).catch(() => null);
    if (box) await A.page.screenshot({ path: `${DIR}/jog-${name}-own.png`, clip: box }).catch(() => {});
    const pbox = await H.figureBox(B, { pad: 14, peerId: await A.page.evaluate(() => window._gameState.current.myId) }).catch(() => null);
    if (pbox) await B.page.screenshot({ path: `${DIR}/jog-${name}-peer.png`, clip: pbox }).catch(() => {});
    await A.page.keyboard.up(key);

    const me = mine.find((d) => d.own);
    const armour = me ? [me.chest, me.legs].filter(Boolean) : [];
    rec.ok(`jog ${name}: the wearer's armour is drawn, from cropped frames`,
      armour.length > 0 && armour.every((L) => L.cropped && L.frameW < L.origW), me);
    rec.ok(`jog ${name}: every armour layer's box is exactly the body's box (own screen)`,
      !!me && me.body && [me.chest, me.legs, me.shirt].every(aligned), me);

    /* the peer: any display on B's screen that is not B's own, wearing plate */
    const peer = theirs.find((d) => !d.own && (d.chest || d.legs));
    rec.ok(`jog ${name}: the peer sees the armour, from cropped frames`,
      !!peer && [peer.chest, peer.legs].filter(Boolean).every((L) => L.cropped), { peer, count: theirs.length });
    rec.ok(`jog ${name}: every armour layer's box is exactly the body's box (peer screen)`,
      !!peer && peer.body && [peer.chest, peer.legs, peer.shirt].every(aligned), peer);
    pics.push(name);
  }

  /* standing still, after the last jog */
  await A.page.waitForTimeout(700);
  const still = ((await displays(A)) || []).find((d) => d.own);
  rec.ok('standing: every armour layer\'s box is exactly the body\'s box',
    !!still && still.body && [still.chest, still.legs, still.shirt].every(aligned), still);

  const errs = H.takeRenderThrows ? H.takeRenderThrows() : [];
  rec.ok('no render throws across equip + four jogs', errs.length === 0, errs.slice(0, 5));
  console.log(`INFO  geartrim :: pictures in ${DIR} (${pics.join(', ')})`);

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
