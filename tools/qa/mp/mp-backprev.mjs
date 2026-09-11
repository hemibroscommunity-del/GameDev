/* ═══ THE PREVIEW TURNS ROUND, AND SO DO THE DRAWINGS (v2.3.2464) ═══
 *
 * Owner: "designs on the back don't carry to the preview character bro on the
 * pedestal."
 *
 * WHAT WAS WRONG, and why no existing scenario saw it.  playerSkins'
 * `artForFacing` swaps the torso, head and trouser canvases for their back
 * twins when a facing looks away -- and drawCharacterPortrait never calls it.
 * It takes a facing and an art object and stamps what it is given, and its
 * store path read `tattoo`, `tattooFace` and `pants` flat.  So every preview
 * drawn through the portrait showed the FRONT drawing on the back of the
 * character, and no back canvas at all, on any facing.
 * v2.3.2422 patched exactly one caller -- PlayerPaint's editor pane -- and
 * said so: "it is made here because the portrait path never calls that
 * function".  Which is a correct sentence and a fix at the wrong altitude: the
 * pedestal, the character sheet and every future caller kept the bug, and the
 * scenarios that cover the editor kept passing because the editor is the one
 * place it had been fixed.
 *
 * SO THIS MEASURES THE PEDESTAL, THE SURFACE THE OWNER LOOKED AT, and does it
 * by COLOUR rather than by asking the code what it decided: blue on the three
 * front canvases, green on the three back ones -- two families no skin tone or
 * shipped garment leads in (the same trick mp-standinart uses) -- then spins
 * the figure through all eight facings and counts the pixels that actually
 * arrived on the canvas.  A pixel says which canvas it came from, so "the back
 * shows the back" and "the front does not leak round" are one measurement.
 */
import * as H from './harness.mjs';

const solid = (ch) => {
  let s = '';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) s += (y >= 5 && y <= 10 && x >= 5 && x <= 10) ? ch : '0';
  return s;
};
const BLUE = '8', GREEN = '6';

const count = (P) => P.page.evaluate(() => {
  const cv = document.querySelector('canvas[title^="Live preview"]');
  if (!cv) return null;
  const c = document.createElement('canvas');
  c.width = cv.width; c.height = cv.height;
  const x = c.getContext('2d');
  x.drawImage(cv, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let blue = 0, green = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 40) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (b > r + 30 && b > g + 20) blue++;
    else if (g > r + 25 && g > b + 25) green++;
  }
  return { blue, green, dir: window.__btPreviewDir || '?' };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Backer', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await P.page.evaluate(({ blue, green }) => {
    try {
      localStorage.setItem('bt-tattooart', blue);
      localStorage.setItem('bt-tattooart-back', green);
      localStorage.setItem('bt-pantsart', blue);
      localStorage.setItem('bt-pantsart-back', green);
      localStorage.setItem('bt-shirtart', blue);
      localStorage.setItem('bt-shirtart-back', green);
    } catch (e) { /* ignore */ }
  }, { blue: solid(BLUE), green: solid(GREEN) });
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(1500);
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(2600);

  /* spin: each drag of >=26px steps one facing */
  const spin = async (n) => {
    for (let i = 0; i < n; i++) {
      await P.page.evaluate(() => {
        const cv = document.querySelector('canvas[title^="Live preview"]');
        const r = cv.getBoundingClientRect();
        const y = r.top + r.height / 2, x0 = r.left + r.width / 2;
        const ev = (t, x) => cv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true,
          composed: true, pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y,
          buttons: t === 'pointerup' ? 0 : 1 }));
        ev('pointerdown', x0); ev('pointermove', x0 + 30); ev('pointerup', x0 + 30);
      });
      await P.page.waitForTimeout(700);
    }
  };

  const seen = [];
  for (let i = 0; i < 8; i++) {
    seen.push(await count(P));
    await spin(1);
  }
  const tag = 'backprev';
  rec.ok(`${tag}: the preview reports which way it is facing, and the spin `
    + `reaches all eight (${seen.map((s) => s.dir).join(',')}) (guard)`,
    new Set(seen.map((s) => s.dir)).size === 8, { dirs: seen.map((s) => s.dir) });

  /* north, northeast and northwest are the back views -- playerArt's
     sideForDir, which is the same split every other surface uses. */
  const backs = seen.filter((s) => /^north/.test(s.dir));
  const fronts = seen.filter((s) => !/^north/.test(s.dir));
  rec.ok(`${tag}: the guard has something to measure -- the FRONT drawings do `
    + `show, facing forward (${fronts.map((s) => s.blue).join(',')} blue)`,
    fronts.every((s) => s.blue > 200), { fronts });

  rec.ok(`${tag}: turned round, the pedestal shows the BACK drawings `
    + `(${backs.map((s) => s.green).join(',')} green on `
    + `${backs.map((s) => s.dir).join(',')}) -- it showed none at all before, `
    + `on any facing`,
    backs.length === 3 && backs.every((s) => s.green > 200), { backs });
  rec.ok(`${tag}: ...and the FRONT drawings do not wrap round onto his back `
    + `(${backs.map((s) => s.blue).join(',')} blue) -- which is what was there `
    + `instead`, backs.every((s) => s.blue === 0), { backs });
  rec.ok(`${tag}: ...nor the back ones onto his front `
    + `(${fronts.map((s) => s.green).join(',')} green)`,
    fronts.every((s) => s.green === 0), { fronts });

  const real = (P.logs || []).filter((l) => !/net::|Failed to load resource/i.test(l));
  rec.ok(`${tag}: the creator threw no errors while it spun`, real.length === 0,
    { logs: real.slice(0, 4) });
  await P.ctx.close();
}
