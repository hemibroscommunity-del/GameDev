/* THE ADD-TO-HOME-SCREEN INSTRUCTION FINDS THE RIGHT PLAYER (v2.3.2159)
 *
 * Owner: "there needs to be some kind of instruction on the game itself on
 * how to do this" — and in the next message, "Where is the share button?",
 * which is the proof the card must DRAW the glyph and name both places the
 * button lives.
 *
 * The audience test is the whole feature: iPhone Safari in the BROWSER sees
 * it once; everyone else never does.  Headless Chromium is "everyone else"
 * by default, so the iPhone player is made by spoofing the UA in an init
 * script — the same navigator the component reads. */
import * as H from './harness.mjs';

const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const SPOOF = `try{Object.defineProperty(navigator,'userAgent',{get:()=>${JSON.stringify(IOS_UA)}})}catch(e){}`;

const card = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-install-hint]');
  if (!c) return null;
  const x = c.querySelector('[data-install-hint-dismiss]');
  const xr = x ? x.getBoundingClientRect() : null;
  return {
    text: (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140),
    svg: !!c.querySelector('svg'),
    x: xr ? { w: Math.round(xr.width), h: Math.round(xr.height) } : null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── the control: a non-iOS player never sees it ── */
  const N = await H.newPlayer(browser, {
    name: 'NotAnIphone', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(N);
  await N.page.waitForTimeout(10000);
  rec.ok('a non-iOS player never sees the card (the audience test is the feature)',
    (await card(N)) === null);
  await N.ctx.close().catch(() => {});

  /* ── the iPhone player ── */
  const P = await H.newPlayer(browser, {
    name: 'RealIphone', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
    init: SPOOF,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(9500);   /* the 8s delay, plus settle */
  const c1 = await card(P);
  console.log('    card: ' + JSON.stringify(c1));
  rec.ok('an iPhone-Safari player gets the card after the welcome has had its say', !!c1, c1);
  rec.ok('...it DRAWS the share glyph (the owner could not find it from words alone)',
    !!c1 && c1.svg, c1);
  /* v2.3.2160 (owner: "include the icon of what the share button looks like
     too" -- about a card that already had a 16px one): the icon must be a
     BUTTON-SIZED picture, not punctuation.  Measured, not trusted. */
  rec.ok('...at button size, in its own chip — a picture of the thing to hunt for',
    await P.page.evaluate(() => {
      const svg = document.querySelector('[data-install-hint] svg');
      if (!svg) return false;
      const r = svg.getBoundingClientRect();
      const chip = svg.parentElement ? svg.parentElement.getBoundingClientRect() : null;
      return r.width >= 20 && !!chip && chip.width >= 40 && chip.height >= 40;
    }));
  rec.ok('...names the destination and both places the button lives',
    !!c1 && /Add to Home Screen/i.test(c1.text) && /bottom bar/i.test(c1.text) && /top-right/i.test(c1.text), c1);
  rec.ok('...and its dismiss is a 44pt target (the dismissables law)',
    !!c1 && !!c1.x && c1.x.w >= 44 && c1.x.h >= 44, c1 && c1.x);

  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/a2hs.png',
    clip: { x: 0, y: 400, width: 390, height: 220 } });

  /* dismissal is remembered */
  await P.page.evaluate(() => {
    const x = document.querySelector('[data-install-hint-dismiss]');
    if (x) x.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(400);
  rec.ok('dismissing removes the card', (await card(P)) === null);
  rec.ok('...and writes the memory', await P.page.evaluate(() => {
    try { return localStorage.getItem('bt_a2hs_hint_done') === '1'; } catch (e) { return false; }
  }));

  /* the way back: Settings -> Play full screen */
  await P.page.evaluate(() => window.__broDashPanelBus.open('more'));
  await P.page.waitForTimeout(300);
  await P.page.evaluate(() => {
    const t = document.querySelector('[data-more-tile="settings"]');
    if (t) t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(600);
  const rowTapped = await P.page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('button'));
    const r = rows.find((b) => /Play full screen/i.test(b.textContent || ''));
    if (!r) return false;
    r.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return true;
  });
  await P.page.waitForTimeout(600);
  rec.ok('Settings carries the way back for a dismissed hint', rowTapped);
  rec.ok('...which reopens the card past the dismissal memory', !!(await card(P)));

  await P.ctx.close().catch(() => {});
}
