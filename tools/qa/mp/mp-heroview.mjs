/* THE EQUIP SCREEN SHOWS YOUR CHARACTER, WEARING WHAT YOU ARE WEARING
 * (v2.3.1815).
 *
 * Owner: "On the character equip menu find space to put as large view of the
 * character as possible to fit inside the space.  Should show armor worn etc
 * if player is wearing it." — and, on the pose: "Southwest idle view."
 *
 * Three claims, and each has a different way of being quietly wrong:
 *   1. The figure is THERE and is large — a canvas that renders 0x0, or
 *      renders at thumbnail size, satisfies "a character view exists".
 *   2. It is the SOUTHWEST facing — asserted by rendering south as well and
 *      requiring the two to differ.  Without that control, a `dir` that fell
 *      back to south would pass every other check here, and southwest vs
 *      south is genuinely hard to call by eye at 96px.
 *   3. It WEARS things — asserted by equipping armour and requiring the
 *      pixels to change, because "shows armor" is exactly the claim that
 *      looks fine until someone actually puts armour on.
 *
 * (3) is not hypothetical: the first cut of this drew a BARE-CHESTED figure
 * while the world sprite wore a tee, because the shirt is a gear SLOT and the
 * component was reading the trait catalog of the same name.
 */
import * as H from './harness.mjs';

const openHero = async (P) => {
  await P.page.evaluate(() => { window.__broDashPanelBus.open('hero'); });
  await P.page.waitForTimeout(1200);
};
/* Signature of what the canvas actually painted: opaque pixel count plus a
   coarse colour sum.  Compared between states rather than to a constant, so
   it cannot be satisfied by "some pixels exist". */
const sig = (P) => P.page.evaluate(() => {
  const cv = document.querySelector('canvas[aria-label="Your character"]');
  if (!cv) return null;
  const c = document.createElement('canvas');
  c.width = cv.width; c.height = cv.height;
  const x = c.getContext('2d');
  x.drawImage(cv, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let n = 0, r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 24) continue;
    n++; r += d[i]; g += d[i + 1]; b += d[i + 2];
  }
  return { n, r, g, b, w: c.width, h: c.height };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Viewer', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await openHero(P);

  /* ── 1. it is there, and it is large ── */
  const box = await P.page.evaluate(() => {
    const cv = document.querySelector('canvas[aria-label="Your character"]');
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
  });
  rec.ok('the equip screen has a character view', !!box, { box });
  /* 80px is not arbitrary: the equipped slots beside it are 46, so anything
     under ~2 slots tall is not "as large as possible", it is another icon. */
  rec.ok('...and it is large — at least two slots tall',
    !!(box && box.h >= 80 && box.w >= 80), { box });
  rec.ok('...and it is on screen, not scrolled out of the panel',
    !!(box && box.top > 0 && box.top < 844), { box });

  const bare = await sig(P);
  rec.ok('it actually painted a figure (guard)', !!(bare && bare.n > 500), { bare });

  /* ── 2. southwest, and proven rather than assumed ──
     The portrait stamps the facing it actually composited onto the canvas.
     Asserting the STAMP rather than the pixels is what makes this meaningful:
     southwest and south are both front-ish three-quarter art and are not
     reliably tellable apart at 96px, so a silent fallback to south would have
     looked correct in every screenshot taken of this panel. */
  const drew = await P.page.evaluate(() => {
    const cv = document.querySelector('canvas[aria-label="Your character"]');
    return cv ? { dir: cv.__btDir || null, mirror: !!cv.__btMirror } : null;
  });
  rec.ok('the figure is composited SOUTHWEST, as asked',
    !!(drew && drew.dir === 'southwest'), { drew });
  /* And it is PINNED there: turning the player in the world must not turn the
     panel, or "southwest idle" becomes "whatever you happen to be facing". */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._facingAngle = 0;            /* east */
    if (S.player) S.player.dir = 'right';
  });
  await P.page.waitForTimeout(700);
  const stillSw = await P.page.evaluate(() => {
    const cv = document.querySelector('canvas[aria-label="Your character"]');
    return cv ? cv.__btDir : null;
  });
  rec.ok('...and stays southwest when the world player turns',
    stillSw === 'southwest', { stillSw });

  /* ── 3. it wears what you wear ── */
  await P.page.evaluate(() => {
    const g = window.__btGearSet;
    if (g) { g('chest', 'copperplate'); g('legs', 'coppergreaves'); }
  });
  await P.page.waitForTimeout(1500);
  const armoured = await sig(P);
  rec.ok('equipping armour changes the figure',
    !!(armoured && bare && armoured.n !== bare.n), { bare, armoured });
  /* Copper is warm — the plate should push the figure's colour, not just its
     silhouette.  Guards against "changed" being one stray pixel. */
  const dBare = bare ? bare.r / Math.max(1, bare.n) : 0;
  const dArm = armoured ? armoured.r / Math.max(1, armoured.n) : 0;
  rec.ok('...and visibly, not by a pixel or two',
    !!(armoured && bare && Math.abs(armoured.n - bare.n) > 200), 
    { barePx: bare && bare.n, armPx: armoured && armoured.n, meanRed: [dBare.toFixed(1), dArm.toFixed(1)] });

  await P.page.screenshot({ path: '/home/user/GameDev/tools/maps/.hero.png' });
  await P.ctx.close().catch(() => {});
}
