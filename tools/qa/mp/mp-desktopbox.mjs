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
import { WORLD_ZOOM } from '../../../src/data/constants.js';

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
      /* v2.3.2247: the zone's own size in world px.  The viewport is now
         floored by it (worldViewport.js), so a check on viewW that cannot see
         the zone cannot tell "capped by the map" from "regressed". */
      zoneW: (() => {
        const z = S && window.__btZones && window.__btZones[S.currentZone];
        return z ? z.w * 32 : null;
      })(),
      zoneH: (() => {
        const z = S && window.__btZones && window.__btZones[S.currentZone];
        return z ? z.h * 32 : null;
      })(),
      zone: S ? S.currentZone : null,
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
  /* v2.3.1780: read WORLD_ZOOM instead of the literal 1.25 this was written
     against.  The zoom is a tuning knob the owner moves on preview builds (it
     went to 1.5 in v2.3.1780), and a hard-coded copy turns every such tune
     into a spurious failure in the one scenario whose job is to prove the
     PHONE did not move.  The property is "phone viewport == window x the
     configured zoom", not "== 1.25". */
  /* ═══ v2.3.2247: AN EQUALITY HERE IS NO LONGER TRUE, AND SHOULD NOT BE ═══
     This asserted viewW == winW x WORLD_ZOOM.  That held while the zoom was a
     single global number; it is false now that a zone FLOORS the scale so the
     viewport can never exceed the map (worldViewport.js).  In town the phone
     reads 1116 against a 1170 target, and the old form went red on a change
     that is working exactly as designed.

     Restating the new formula here would just be TRAPS §37 -- recomputing the
     renderer's own arithmetic proves nothing about the picture.  So assert the
     PROPERTY the file is actually about: the zone may take the phone's
     viewport DOWN (it has less world to show), and nothing may push it UP.
     The "desktop shows no more than a phone" checks above are untouched and
     remain this scenario's real job. */
  rec.ok(`the phone is untouched — never MORE than window x ${WORLD_ZOOM}`,
    phone.viewW <= phone.winW * WORLD_ZOOM + 1.5,
    { viewW: phone.viewW, target: phone.winW * WORLD_ZOOM, worldZoom: WORLD_ZOOM });
  rec.ok('...and the only thing that reduced it is the zone it stands in',
    phone.viewW >= Math.min(phone.winW * WORLD_ZOOM, phone.zoneW || Infinity) - 1.5,
    { viewW: phone.viewW, zoneW: phone.zoneW, target: phone.winW * WORLD_ZOOM });
  rec.ok('...and its shell is still the whole window',
    phone.canvasW === phone.winW, { canvasW: phone.canvasW, winW: phone.winW });
}
