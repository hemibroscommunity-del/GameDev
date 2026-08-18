/* DESKTOP IS A SCALED PHONE, NOT A DIFFERENT GAME (v2.3.1768).
 *
 * Owner: "the desktop version was COMPLETELY different than the mobile version
 * ... the aspect ratio was messed up, the view showed way more of the world all
 * at once ... I'm wondering if the Mobile view can just be blown up
 * proportionally to fit the desktop view."
 *
 * The property is a COMPARISON, so this drives two real clients at two real
 * window sizes and compares what each can see.  Asserting a number against the
 * desktop alone would pass against a build that had quietly changed the phone
 * too — and the phone is the primary platform, so "desktop matches" and "the
 * phone did not move" are both load-bearing here.
 *
 * Read from S._viewW/_viewH, the logical world viewport: that is what the
 * camera centres and clamps against, and it is what "how much world can I see"
 * literally means.  A screenshot would answer a different question (how many
 * CSS pixels the canvas got) and would be blind to the zoom.
 *
 * BASELINE, measured before the fix, 1680x1050 against a 390x715 phone:
 *     phone    487 x 612 world px   shell 390x715   aspect 0.80
 *     desktop  525 x 1014 world px  shell 420x1050  aspect 0.52
 * The width was already close; the height was 65% over and the shape was wrong.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 715 };
const DESKTOP = { width: 1680, height: 1050 };

async function viewFor(browser, wsPort, webPort, viewport, name) {
  const P = await H.newPlayer(browser, { name, wsPort, webPort, guest: true, viewport });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  const out = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const root = document.getElementById('root');
    const cv = document.querySelector('canvas');
    return {
      viewW: S ? S._viewW : null, viewH: S ? S._viewH : null,
      shellW: root ? root.clientWidth : null, shellH: root ? root.clientHeight : null,
      canvasW: cv ? Math.round(cv.getBoundingClientRect().width) : null,
      winW: window.innerWidth, winH: window.innerHeight,
    };
  });
  await P.ctx.close().catch(() => {});
  return out;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const phone = await viewFor(browser, wsPort, webPort, PHONE, 'Phone');
  const desk = await viewFor(browser, wsPort, webPort, DESKTOP, 'Desk');
  console.log('    phone  ', JSON.stringify(phone));
  console.log('    desktop', JSON.stringify(desk));

  rec.ok('both clients reached the world and reported a viewport',
    !!(phone.viewW && phone.viewH && desk.viewW && desk.viewH), { phone, desk });
  if (!phone.viewW || !desk.viewW) return;

  /* GUARD: the two windows really were different sizes.  Without it the
     comparisons below are satisfied by a harness that opened the same viewport
     twice — the easiest way for this whole file to prove nothing. */
  rec.ok('the two clients really were phone-sized and desktop-sized (guard)',
    desk.winW >= phone.winW * 3, { phoneWin: phone.winW, deskWin: desk.winW });

  /* THE COMPLAINT, MEASURED. */
  rec.ok('desktop does not show more world than a phone across',
    desk.viewW <= phone.viewW * 1.12, { desk: desk.viewW, phone: phone.viewW });
  rec.ok('...nor down the screen (this was 65% over)',
    desk.viewH <= phone.viewH * 1.12, { desk: desk.viewH, phone: phone.viewH });

  /* THE SHAPE.  0.52 was the measured desktop aspect; the phone is 0.80. */
  const aspect = (v) => v.viewW / v.viewH;
  rec.ok('the desktop play area keeps the phone\'s shape',
    Math.abs(aspect(desk) - aspect(phone)) < 0.08,
    { desktopAspect: +aspect(desk).toFixed(3), phoneAspect: +aspect(phone).toFixed(3) });

  /* THE PRIMARY PLATFORM DID NOT MOVE.  A phone has no shell (the media query
     cannot match it), so its viewport must still be exactly window x 1.25. */
  rec.ok('the phone is untouched — still window x 1.25',
    Math.abs(phone.viewW - phone.winW * 1.25) < 1.5,
    { viewW: phone.viewW, expected: phone.winW * 1.25 });
  rec.ok('...and its shell is still the whole window',
    phone.canvasW === phone.winW, { canvasW: phone.canvasW, winW: phone.winW });
}
