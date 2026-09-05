/* ═══ TAPPING YOUR OWN FIRE TO COOK (v2.3.2274) ═══
 *
 * Owner: "Make sure tapping on a fire to cook fish works.  I received
 * feedback that it does not."
 *
 * ── WHY THE EXISTING COVERAGE SAID IT DID ──
 * mp-harvest starts its cook with `cv.dispatchEvent(new TouchEvent(...))`
 * straight on the canvas element.  That goes to that element's own listeners
 * and ignores hit-testing entirely -- docs/TRAPS.md §41 names this exact
 * failure class -- so it proved the cook RUNS while saying nothing about
 * whether a finger can reach it.  It could not:
 *
 *   1. the two touch zones (TouchControls `[data-joyzone]`) are position:fixed,
 *      50% wide each, full height above the dashboard, at zIndex 6.  They
 *      cover the canvas and stopPropagation on touchstart, so the canvas's own
 *      onTouchEnd -- where v2.3.2270 wrote tap-to-harvest -- never fires on a
 *      phone.  What a phone produces is the zones' synthetic `click` forward,
 *      landing in canvas onClick, which had no resource branch at all.
 *   2. a campfire is lit AT THE PLAYER'S OWN FEET, so it sits inside
 *      isSelfTouch's 52px circle -- and both zone releases called
 *      openSelfChat() and returned before any forward.  Tapping your own fire
 *      opened the chat box.
 *
 * ── SO THIS TAPS FOR REAL ──
 * page.touchscreen.tap() goes through the browser's own hit-testing, so
 * whatever is actually on top gets the event -- which is the only way to ask
 * the question the owner is asking.  A synthetic dispatch would pass against
 * the broken build, which is precisely how this shipped.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const st = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return {
    ex: S._extraction ? S._extraction.skill : null,
    fishKey: S._extraction ? (S._extraction.fishKey || null) : null,
    fire: !!S._campfire,
    firePos: S._campfire ? { x: Math.round(S._campfire.x), y: Math.round(S._campfire.y) } : null,
    chatOpen: !!(window.__broDashPanelBus && window.__broDashPanelBus.state
      && window.__broDashPanelBus.state.mode !== 'bar'),
    composer: !!document.querySelector('.bt-chat-compose, [data-chat="compose"]'),
    raw: (S.rpg && S.rpg.inventory && S.rpg.inventory.fish_minnow) || 0,
  };
});

/* The fire's centre in CSS px -- the same world->screen the tap path uses. */
const fireScreen = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const n = S._campfire;
  if (!n) return null;
  const cv = document.querySelector('canvas');
  const r = cv.getBoundingClientRect();
  return {
    x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1),
    y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1),
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Chef', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  const myId = await H.readState(P, (S) => S.myId);

  /* A log to light and fish to cook, granted through the WORKER so the bag is
     the server's and the item cards are real. */
  await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 2 }).catch(() => {});
  await H.grant(wsPort, myId, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => {});
  await H.waitFor(P, (S) => (S.rpg?.inventory || {}).fish_minnow || 0, (n) => n >= 1,
    { timeout: 20000, label: 'the log and the fish reach the bag' }).catch(() => {});

  /* Light it the way a player does: the log's item card, "Light fire". */
  await P.page.evaluate(() => {
    const bus = window._itemDetailBus;
    const S = window._gameState && window._gameState.current;
    if (bus && S && S.rpg) {
      bus.open({ kind: 'inventory', key: 'wood_pine_log', count: (S.rpg.inventory || {}).wood_pine_log || 0 });
    }
  });
  await P.page.waitForTimeout(600);
  await H.clickText(P, 'Light fire').catch(() => {});
  const lit = await H.waitFor(P, (S) => !!S._campfire, (v) => v === true,
    { timeout: 20000, label: 'the campfire appears' }).catch(() => null);
  const before = await st(P);
  console.log('    lit: ' + JSON.stringify(before));
  rec.ok('a campfire is burning at the player\'s feet (guard)', before.fire === true, before);
  if (!before.fire) { await P.ctx.close().catch(() => {}); return; }
  rec.ok('...and there is raw fish to cook (guard)', before.raw >= 1, before);

  /* Which element is actually on top of the fire?  Named, because the answer
     IS the bug: the touch zone, not the canvas. */
  const onTop = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = S._campfire;
    const cv = document.querySelector('canvas');
    const r = cv.getBoundingClientRect();
    const x = r.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
    const y = r.top + (n.y - S.camera.y) * (S._worldScaleY || 1);
    const el = document.elementFromPoint(x, y);
    return { tag: el ? el.tagName : null, zone: el ? el.getAttribute('data-joyzone') : null,
      isCanvas: !!(el && el.tagName === 'CANVAS') };
  });
  console.log('    on top of the fire: ' + JSON.stringify(onTop));

  const at = await fireScreen(P);
  rec.ok('the fire is on screen where a thumb could reach it (guard)',
    !!(at && at.x > 0 && at.y > 0 && at.x < PHONE.width && at.y < PHONE.height), at);
  if (!at) { await P.ctx.close().catch(() => {}); return; }

  /* ═══ THE TAP.  A REAL ONE. ═══
     page.touchscreen.tap dispatches through the browser's hit-testing, so the
     element that is genuinely on top receives it.  That is the whole point:
     an el.dispatchEvent here would reach the canvas regardless and report a
     pass on a build where no finger can. */
  await P.page.touchscreen.tap(at.x, at.y);
  await P.page.waitForTimeout(900);
  const after = await st(P);
  console.log('    after the tap: ' + JSON.stringify(after));

  rec.ok('tapping the fire starts a COOK', after.ex === 'cooking', { before, after, onTop });
  rec.ok('...on the raw fish in the bag', !!after.fishKey, after);
  /* The other half of the same bug: a fire sits inside the self-tap circle, so
     before v2.3.2274 this tap opened the chat composer instead. */
  rec.ok('...and it does NOT open the chat box instead (the self-tap circle)',
    after.composer === false, after);

  await P.ctx.close().catch(() => {});
}
