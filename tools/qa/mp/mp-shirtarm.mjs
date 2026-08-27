/* THE T-SHIRT WHILE JOGGING EAST (v2.3.1984).
 *
 * Owner, twice now: "The bare arm showing while jogging east wearing t shirt
 * is still an issue."
 *
 * ── WHY THIS IS A SCREENSHOT SCENARIO ──
 * Reading the sprite sheets does not settle it. The shirt sheet's coverage
 * legitimately shrinks on the frames where the near arm swings across the
 * chest (the artist cuts the crossing arm out of the tee so the arm draws in
 * front — tools/gear/seal-shirt-edges.mjs says so), and a pixel count cannot
 * tell that intended cut-out from a missing sleeve. What the owner is
 * reporting is what the composite LOOKS like in motion, so the honest probe
 * is to run east in a real client and photograph the character.
 *
 * Captures a strip of the character across a full stride, cropped to the
 * figure and zoomed, so the frames can be compared side by side.
 *
 * ── WHAT IT TURNED OUT TO BE, AND WHAT THE STRIP SHOULD SHOW NOW ──
 * v2.3.1986 answered it. The tee's coverage is PROPORTIONALLY constant across
 * the cycle (0.63-0.71 of the torso band, both halves), so the shirt was never
 * shrinking and the near arm crossing the chest for half the stride is correct
 * animation. What was missing was the SLEEVE: on frames 8-11 the arm tucks in
 * front of the torso and the artist's deliberate cut-out took the sleeve with
 * it, leaving the arm bare from the shoulder JOINT down — the character read
 * as wearing a tank top for those four frames.
 * tools/gear/sleeve_crossing_arm.py puts a short sleeve back on exactly those
 * frames. So in this strip EVERY figure should show white at the shoulder of
 * the near arm; a figure whose arm is skin-coloured all the way up to the neck
 * is the bug returning.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Jogger', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  /* A plain white tee and nothing over it — the loadout the report is about. */
  const armed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (!S) return null;
    S._equip = S._equip || {};
    try {
      const g = window.__btGear || null;
      if (g && g.setEquip) { g.setEquip('shirt', 'tshirt'); g.setEquip('chest', 'none'); }
    } catch (e) { /* fall through to the state read below */ }
    return { shirt: S.myShirt || null, equip: S._equip };
  });
  rec.ok('the client is up and reports its loadout (guard)', armed !== null, armed);

  /* Run east for a full stride and photograph it. The canvas is camera-centred
     on the player, so the crop is the middle of the play area. */
  const shots = [];
  await P.page.keyboard.down('d');
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(110);
    const b = await P.page.evaluate(() => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2 - 32), y: Math.round(r.y + r.height / 2 - 62), width: 64, height: 78 };
    });
    shots.push(await P.page.screenshot({ clip: b }));
  }
  await P.page.keyboard.up('d');

  const facing = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { facing: S._facing, moving: !!(S.player && (S.player.vx || S.player.vy)) };
  });
  rec.ok('the character really was facing east while photographed',
    facing.facing === 'right' || facing.facing === 'east', facing);

  /* Stitched into one strip so a human can compare the stride at a glance. */
  const strip = await P.page.evaluate(async (pngs) => {
    const imgs = await Promise.all(pngs.map((b64) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null);
      im.src = 'data:image/png;base64,' + b64;
    })));
    const ok = imgs.filter(Boolean);
    if (!ok.length) return null;
    const S = 7;
    const cv = document.createElement('canvas');
    cv.width = ok.length * ok[0].width * S; cv.height = ok[0].height * S;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#14202a'; g.fillRect(0, 0, cv.width, cv.height);
    ok.forEach((im, i) => g.drawImage(im, i * im.width * S, 0, im.width * S, im.height * S));
    return cv.toDataURL('image/png');
  }, shots.map((b) => b.toString('base64')));

  if (strip) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(H.REPO + '/tools/qa/mp/.last-shirtarm.png',
      Buffer.from(strip.split(',')[1], 'base64'));
  }
  rec.ok('a stride strip was captured to look at', !!strip, { shots: shots.length });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
