/* ═══ v2.3.2617: THE ENTER PROMPT MUST NOT SURVIVE ITS OWN TAP ═══
 *
 * Owner: "get rid of the vendor pop up button after you tap it because it's
 * staying on even when you're in the vendor marketplace menus."
 *
 * The prompt (.bt-interact-prompt, BroTown.jsx) was gated on PROXIMITY
 * ALONE.  Entering a building does not move you -- enterBuilding()
 * (src/game/interactions.js) sets the panel and never touches
 * S.nearBuilding -- so the door you are standing at stays "near" for as
 * long as the panel is open, and the prompt outlived the tap that opened
 * it.  Worse, it is z35 fixed while the building panel is .bt-inspect z32
 * (zLayers.js), so it outlived it ON TOP: a pulsing "Enter VENDOR" button
 * painted over the marketplace the tap had just opened.
 *
 * WHY THIS FILE EXISTS RATHER THAN AN ASSERTION BOLTED ONTO mp-store.
 * mp-store opens the same door like this:
 *
 *     await P.page.locator('.bt-interact-prompt').first().dispatchEvent('mousedown');
 *
 * which is TRAPS §67 exactly -- dispatchEvent does not hit-test, so it
 * proves the handler is wired and cannot prove a finger could ever reach
 * the button.  This bug is ABOUT what a finger meets at a point on the
 * glass, so every tap here is a real `touchscreen.tap()` at real
 * coordinates, and the "is it gone" question is asked of
 * `document.elementFromPoint` at the prompt's own centre rather than of a
 * visibility flag.  An element can be visible and unreachable, and it can
 * also be reachable while a `:visible` check is happy -- neither one is
 * the owner's complaint.  What is on the glass is.
 *
 * Four viewports because the prompt is bottom-anchored against
 * `calc(var(--dash-h) + 24px)` and --dash-h is a vh fraction: the geometry
 * that hides or exposes it is not the same in portrait and landscape.
 */
import * as H from './harness.mjs';

/* The auction-house prop's anchor (src/data/worldProps.js); standing spot in
   front of its door -- buildingPropNear() wants 95px.  Same constant as
   mp-store, deliberately: if the door moves, both scenarios move together. */
/* v2.3.2626: the door is read from worldProps.js now (H.doorOf), not
   hand-copied here.  Six scenarios each carried their own copy of
   {x:1290,y:855}; moving the auction house onto the plaza turned all six
   red at once, every failure being the test standing on empty cobble.
   H.doorOf also picks a cell you can actually STAND on -- the naive spot
   below this building's anchor is inside lamp-plaza-e's footprint. */

/* Two phones, each measured PORTRAIT and then ROTATED -- which is both the
 * repo's landscape idiom (mp-landscape-rotate) and the way a player actually
 * gets there.  Booting straight into a landscape viewport is a different
 * test and it does not currently reach the world at all: at 640x360 and
 * 844x390 the character-creation "Enter Bro Town" button sits OFF-SCREEN
 * (coveringElement reports "the point is off-screen", not a cover), so a
 * cold landscape start cannot create a character.  That is a real finding
 * about the creator, it reproduces on main untouched by this change, and it
 * is somebody else's PR -- noted here rather than silently routed around. */
const PHONES = [
  { label: '360', portrait: { width: 360, height: 640 }, landscape: { width: 640, height: 360 } },
  { label: '390', portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } },
];

/** Where is the prompt, and is it the thing a finger would actually hit?
 *  Returns null when it is not on the glass at all -- which, after the tap,
 *  is the pass condition. */
async function promptAtPoint(P) {
  return P.page.evaluate(() => {
    const el = document.querySelector('.bt-interact-prompt');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(cx, cy);
    return {
      cx, cy,
      text: (el.textContent || '').trim(),
      /* The reachability question TRAPS §67 is about: at the prompt's own
         centre, is the prompt what the browser hands a finger? */
      reachable: !!top && (top === el || el.contains(top) || top.contains(el)),
      topTag: top ? top.tagName.toLowerCase() + '.' + (typeof top.className === 'string' ? top.className : '') : 'nothing',
    };
  });
}

async function panelOpen(P) {
  return P.page.evaluate(() => !!document.querySelector('.bt-inspect'));
}

async function closePanel(P) {
  await P.page.evaluate(() => {
    const x = document.querySelector('.bt-inspect-close');
    if (x) x.click();
  });
  await P.page.waitForTimeout(800);
}

/** The whole gesture, at whatever viewport the page is currently in. */
async function measureOrientation(P, rec, who) {
  const near = await H.readState(P, (S) => S.nearBuilding);
  rec.ok(`${who}: standing at the auction house raises the enter prompt`,
    near !== null && near !== undefined, { near });

  /* ── 1. BEFORE THE TAP: it is there, and a finger can reach it ── */
  const before = await promptAtPoint(P);
  rec.ok(`${who}: the prompt is on the glass before the tap`, !!before, before);
  if (!before) return;
  rec.ok(`${who}: ...and a finger would actually land on it (TRAPS §67)`,
    before.reachable, before);
  rec.ok(`${who}: ...and it is the vendor door`, /enter/i.test(before.text), before.text);

  /* ── 2. A REAL FINGER TAP, at the point measured above ──
     Traced once at 390x844 while this was red (v2.3.2617): the events a
     single tap produces are
         pointerdown@bt-interact-prompt  touchstart@bt-interact-prompt
         mousedown@bt-inspect            click@bt-inspect
     -- the last two being the COMPATIBILITY mouse events React 18 cannot
     suppress from a passive touchstart handler, landing on the backdrop of
     the panel the first two had just opened, which closed it again.  That is
     why the prompt opens the door on `onClick` now. */
  await P.page.touchscreen.tap(before.cx, before.cy);
  await P.page.waitForTimeout(1200);

  rec.ok(`${who}: the tap opens the vendor panel`, await panelOpen(P));

  /* ── 3. THE OWNER'S BUG: is it still on the glass? ── */
  const after = await promptAtPoint(P);
  rec.ok(`${who}: the prompt is GONE once the panel is open`, after === null, after);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/vendorprompt-${who.replace(/[^a-z0-9]+/gi, '-')}-panel.png` });

  /* ── 4. ...and still gone one menu deeper, which is where the owner
         actually met it ("even when you're in the vendor marketplace
         menus"). ── */
  /* ═══ v2.3.2622: THE WAY THROUGH HAS BEEN CALLED TWO THINGS ═══
     This read `clickText(P, 'Player store')`, which was the label when the
     scenario shipped at v2.3.2617. v2.3.2618 made Market the only button in
     the vendor panel and renamed it, and this test -- written one version
     earlier and not re-run against the later branch -- went red without
     anything being wrong with the game.
     Accepting EITHER label rather than just the new one, deliberately: these
     branches are a stack, and a scenario that only knows the newer name is
     red on every commit before the rename. Whichever is on screen, the
     assertion is the same -- the vendor panel offers a way through. */
  const through = await H.clickText(P, 'Market').then(() => true)
    .catch(() => H.clickText(P, 'Player store').then(() => true).catch(() => false));
  rec.ok(`${who}: the panel offers a way through to the player market`, through);
  if (through) {
    await P.page.waitForTimeout(1300);
    rec.ok(`${who}: the player market opens`, await H.seesText(P, 'What everyone is selling'));
    const deep = await promptAtPoint(P);
    rec.ok(`${who}: the prompt is still gone inside the marketplace menus`, deep === null, deep);
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/vendorprompt-${who.replace(/[^a-z0-9]+/gi, '-')}-market.png` });
  }

  /* ── 5. Closing the panel RE-ARMS it: the fix must not cost the door.
         nearBuilding is untouched, so walking up again still works. ── */
  await closePanel(P);
  const rearmed = await promptAtPoint(P);
  rec.ok(`${who}: closing the panel brings the prompt back`, !!rearmed, rearmed);
}

export async function run({ browser, wsPort, webPort, rec }) {
  for (const phone of PHONES) {
    const P = await H.newPlayer(browser, {
      name: 'Doorman', wsPort, webPort, touch: true, viewport: phone.portrait,
    });
    try {
      await H.enterWorld(P);
      await P.page.waitForTimeout(2200);
      const _door = await H.doorOf('auction-house');
      await H.hopTo(P, _door.x, _door.y);
      await P.page.waitForTimeout(800);

      await measureOrientation(P, rec, `${phone.label} portrait`);

      /* Rotate with the player still standing at the door. */
      await P.page.setViewportSize(phone.landscape);
      await P.page.waitForTimeout(1600);
      const orient = await P.page.evaluate(() => (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'));
      rec.ok(`${phone.label} landscape: the shell really is landscape`, orient === 'landscape', orient);
      await measureOrientation(P, rec, `${phone.label} landscape`);
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
