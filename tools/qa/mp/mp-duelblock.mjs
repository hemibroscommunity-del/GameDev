/* ═══ CAN YOU BLOCK IN A DUEL, WITH THE CONTROLS YOU ACTUALLY HAVE? (v2.3.2145) ═══
 *
 * Owner: "during duel I think I was unable to block. Make sure blocking
 * behavior is normal during duels."
 *
 * mp-duelfeel already proves a block WORKS in a duel -- but it proves it by
 * pinning S._shieldUp from script, which is the one thing a player cannot do.
 * That is the blind spot: it measures the shield, never the way you raise it.
 *
 * The on-screen block control lives in LockOnActions, gated on
 * `S.lockedTarget`. Nothing about starting a duel ever set a lock, so through
 * a whole duel there was no block button on screen and the only route to a
 * shield was an undiscoverable double-tap-hold on the right joystick.
 *
 * So this asserts the CONTROL, not the mechanic: after a duel starts, both
 * sides are locked onto each other, and the block button is really in the
 * document on both.
 */
import * as H from './harness.mjs';

const duelState = (P) => H.readState(P, (S) => ({
  inDuel: !!(S._inDuel || S._activeDuel),
  opponent: (S._inDuel && S._inDuel.opponent) || (S._activeDuel && S._activeDuel.partnerId) || null,
  lock: S.lockedTarget ? { type: S.lockedTarget.type, id: S.lockedTarget.id } : null,
}));

/* `[data-shield]`, not a <button>.  v2.3.2229: the block control is the
   ShieldButton under the Attack button (it shows whenever a lock is held,
   which a duel sets), a touch DIV like the lock-on ring's controls were --
   the first cut of this scenario reported "no block button" with the lock
   correctly set on both sides because the finder was wrong, not the fix.
   Visibility is checked too: a zero-box element is present in the DOM and
   useless to a thumb. */
const blockButton = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-shield]');
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  return {
    found: true,
    box: { w: Math.round(r.width), h: Math.round(r.height) },
    onScreen: r.width > 20 && r.height > 20
      && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
    hitsSelf: (() => {
      const el2 = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
      return !!(el2 && (el2 === el || el.contains(el2)));
    })(),
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  /* A PHONE, not joinPair's desktop box. The lock-on ring is touch chrome:
     game.css hides it under the desktop pointer:fine rules, where the keyboard
     is the real input. The first cut of this ran desktop and reported the block
     control at 0x0 -- which is correct there and says nothing about the bug.
     The owner's platform is iPhone Safari (CLAUDE.md), so that is what this
     has to be. */
  const PHONE = { width: 390, height: 844 };
  const A = await H.newPlayer(browser, { name: 'Duellist', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Rival', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(B);
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  await H.waitMutualSight(A, B);

  /* Both need a shield, or "no block button" would be correct behaviour
     rather than the bug. */
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.rpg) return;
      if (!S.rpg.shield && (S.rpg.shieldStash || []).length) S.rpg.shield = S.rpg.shieldStash.shift();
      if (!S.rpg.shield) S.rpg.shield = { name: 'Pine Shield', mat: 'pine', block: 10 };
    });
  }

  /* A challenges, B accepts, through the real cards. */
  await H.openInspect(A, bId);
  const canDuel = (await H.buttonTexts(A)).some((t) => /duel/i.test(t));
  rec.ok('the inspect card offers a Duel (guard)', canDuel, await H.buttonTexts(A));
  if (!canDuel) { await A.ctx.close(); await B.ctx.close(); return; }
  await H.clickText(A, 'Duel');

  const gotReq = await H.waitUi(B, () => [...document.querySelectorAll('button')]
    .some((b) => /accept/i.test(b.textContent || '')), { label: 'duel request', timeout: 20000 })
    .then(() => true).catch(() => false);
  rec.ok('B is asked to accept the duel (guard)', gotReq);
  if (!gotReq) { await A.ctx.close(); await B.ctx.close(); return; }
  await H.clickText(B, 'Accept');
  await A.page.waitForTimeout(2000);

  const dA = await duelState(A);
  const dB = await duelState(B);
  rec.ok('both players are in the duel (guard: nothing below means anything '
    + 'without it)', dA.inDuel && dB.inDuel, { dA, dB });

  rec.ok('the CHALLENGER is locked onto their opponent', 
    !!(dA.lock && String(dA.lock.id) === String(bId) && dA.lock.type === 'player'), dA);
  rec.ok('...and so is the ACCEPTER -- both sides, or only one of them gets a '
    + 'block button (the same half-a-fix shape as the v2.3.1306 _inDuel gate)',
    !!(dB.lock && String(dB.lock.id) === String(aId) && dB.lock.type === 'player'), dB);

  const bbA = await blockButton(A);
  const bbB = await blockButton(B);
  rec.ok('the BLOCK BUTTON is on screen for the challenger, at a real size, '
    + 'with nothing over it -- the control the owner could not find: "I think '
    + 'I was unable to block"',
    !!(bbA.found && bbA.onScreen && bbA.hitsSelf), bbA);
  rec.ok('...and for the accepter', !!(bbB.found && bbB.onScreen && bbB.hitsSelf), bbB);

  await A.ctx.close();
  await B.ctx.close();
}
