/* A CAMPFIRE THAT BURNS (v2.3.2846).
 *
 * Owner: "I saw you can create good looking pixel flames.  Instead of the
 * current generated fire (after lighting logs for firewood) ... I want you
 * recreate it better."
 *
 * The fire you light from a log is pixel art now (rendering/campfireArt.js +
 * campfireFx.js).  Read back through the renderer's own probe
 * (window.__btCampfire), because pooled sprites in a screenshot say nothing
 * about what stage a fire is at or which side of you it sorted to.  Claims:
 *   - the fire-lighting figure stands on the ground: its boots land on the
 *     walking body's boots (it used to be planted at your HIPS and float ~77 px
 *     up for the whole strike);
 *   - the fire is lit at your boots, a stride to the side -- not at your hips,
 *     where your own body hid it until you walked away;
 *   - it takes over at full height within a beat (no second ignition), throws
 *     sparks and smoke, samples NEAREST at the hit pieces' pixel size;
 *   - its logs char over the burn;
 *   - it has depth: stand behind it and it draws over you, in front and you
 *     draw over it;
 *   - tapping the NEW art still starts a cook (the tap box follows the fire);
 *   - it dies down: lower flames near the end, flames out with the embers
 *     still glowing, and gone a few seconds after the fire's record is;
 *   - a fire from another zone is never drawn, and a peer's fire draws through
 *     the same code.
 * Plus pictures (out/campfire-*.png) -- "looks better" is the half no number
 * can answer.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out/campfire`;

const probe = (P) => P.page.evaluate(() => (window.__btCampfire ? window.__btCampfire() : null));
const self = (pr) => (pr && pr.fires || []).find((f) => f.key === 'self') || null;

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Firestarter', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
  /* the tutorial coach card sits over the lower half of a phone screen */
  await P.page.addStyleTag({ content: '[data-coach],[data-coach-card],[data-coach-ring]{display:none!important}' });
  const hook = await P.page.evaluate(() => typeof window.__btCampfire === 'function');
  rec.ok('the campfire probe is on the page (guard)', hook);
  /* A 45 s fire, watched in seconds: Playwright's clock keeps time FLOWING
     after install (it is never paused here -- a paused clock starves the
     dark-screen watchdog's canvas sample and it rebuilds the renderer), and
     fastForward jumps it.
     v2.3.2846: flowing is not enough.  Under the installed clock the
     watchdog's sample runs on Playwright's timer-driven animation frame,
     not the page's real one, so it can read the canvas after the frame was
     presented and cleared -- "0% lit" -- and each fastForward below makes a
     sample due at once.  Two dark reads rebuild the renderer, which mints a
     new, empty campfire drawer (the probe then sees no fire), and 20 s of
     them reload the page.  Seen after the #726 merge: 2 of 4 runs failed an
     end-of-fire check this way, with "[bt-crash] gl-rebuild watchdog:
     screen dark 10s" in the page log.  The screen is lit (every picture this
     test takes shows it), so the watchdog is told so and its next sample is
     pushed out of reach, the same as mp-shotland's page-clock block. */
  await P.page.evaluate(() => { const S = window._gameState.current; S.__wdEverLit = true; S.__wdNext = 1e15; S.__wdDark = 0; });
  await P.page.clock.install();
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; S.lockedTarget = null; S.autoAttack = false; S._facing = 'down'; });
  await P.page.waitForTimeout(300);

  /* ── strike: the record the Bag's "Light fire" writes (BroTown.jsx) ── */
  const lit = await P.page.evaluate(() => {
    const S = window._gameState.current, now = Date.now();
    S._firemaking = { startedAt: now, doneAt: now + 700, x: S.player.x, y: S.player.y + 6 };
    return { px: S.player.x, py: S.player.y };
  });
  await P.page.waitForTimeout(260);
  const fig = await P.page.evaluate(() => ({ f: window.__btFireFigure ? window.__btFireFigure() : null, foot: window._gameState.current._bodyFootY }));
  rec.ok(`the fire-lighter stands on the ground: its boots land on yours (${fig.f && fig.f.bootsY} vs ${fig.foot && fig.foot.toFixed(1)})`,
    !!(fig.f && fig.f.visible && typeof fig.foot === 'number' && Math.abs(fig.f.bootsY - fig.foot) < 3), fig);
  rec.ok(`...its boots ${fig.f ? Math.round(fig.f.bootsY - lit.py) : '?'} px below your hips (the old plant put them ~25 px ABOVE)`,
    !!(fig.f && fig.f.bootsY > lit.py + 30), { bootsY: fig.f && fig.f.bootsY, py: lit.py });

  await P.page.waitForTimeout(700);
  const cf = await P.page.evaluate(() => { const c = window._gameState.current._campfire; return c ? { x: c.x, y: c.y, litAt: c.litAt, expiresAt: c.expiresAt } : null; });
  rec.ok('the strike lights a campfire (guard)', !!cf, cf);
  if (!cf) { await P.ctx.close().catch(() => {}); return; }
  const foot0 = fig.foot;
  rec.ok(`it is lit at your boots (ground ${cf.y.toFixed(1)} vs boots ${foot0.toFixed(1)}), not at your hips (${lit.py})`,
    Math.abs(cf.y - foot0) < 6, { cf, foot0, py: lit.py });
  rec.ok(`...a stride to your side, so you are not standing in it (${(cf.x - lit.px).toFixed(1)} px)`, cf.x < lit.px - 20, { cfx: cf.x, px: lit.px });

  const early = self(await probe(P));
  await P.page.waitForTimeout(420);
  const full = self(await probe(P));
  rec.ok(`it takes over the strike's flame at full height within a beat (size ${early && early.size} -> ${full && full.size})`,
    !!(early && early.size >= 2 && full && full.size === 3 && full.flameOn), { early, full });
  const pr = await probe(P);
  rec.ok('the art samples NEAREST: every art pixel stays a hard square', !!(pr && pr.nearest), pr);
  rec.ok(`...on the hit pieces' pixel grid (${pr && pr.pix} world px per art pixel)`, !!(pr && pr.pix > 2.4 && pr.pix < 2.7), pr);
  await P.page.waitForTimeout(900);
  const mid = self(await probe(P));
  rec.ok(`it throws sparks and smoke (${mid && mid.embers} sparks, ${mid && mid.smoke} puffs)`, !!(mid && mid.embers > 0 && mid.smoke > 0), mid);
  rec.ok(`...and lights the ground under it (glow alpha ${mid && mid.glowAlpha})`, !!(mid && mid.glowAlpha > 0.05), mid);
  rec.ok(`fresh logs to begin with (char stage ${full && full.stage})`, !!(full && full.stage === 0), full);

  /* ── depth: behind it, then in front ── */
  const place = (dy) => P.page.evaluate(({ cf, dy }) => {
    const S = window._gameState.current;
    /* dy is where your BOOTS go relative to the fire's ground line */
    const drop = (S._bodyFootY != null ? S._bodyFootY - S.player.y : 52);
    S.player.x = cf.x + 6; S.player.y = cf.y + dy - drop;
  }, { cf, dy });
  const shot = async (name) => {
    const box = await P.page.evaluate(({ cf }) => {
      const S = window._gameState.current;
      const c = document.querySelector('canvas').getBoundingClientRect();
      const k = S._worldScaleX || 1;
      const cx = c.left + (cf.x + 16 - S.camera.x) * k, cy = c.top + (cf.y - 40 - S.camera.y) * k;
      return { x: Math.max(0, Math.round(cx - 100)), y: Math.max(0, Math.round(cy - 90)), width: 200, height: 150 };
    }, { cf });
    await P.page.screenshot({ path: `${OUT}/campfire-${name}.png`, clip: box }).catch(() => {});
  };
  await place(-22);
  await P.page.waitForTimeout(250);
  const behind = self(await probe(P));
  await shot('behind');
  rec.ok(`stand BEHIND the fire and it draws over you (${behind && behind.layer})`, !!(behind && behind.layer === 'gatherNodesFront'), behind);
  await place(26);
  await P.page.waitForTimeout(250);
  const front = self(await probe(P));
  await shot('front');
  rec.ok(`stand IN FRONT of it and you draw over it (${front && front.layer})`, !!(front && front.layer === 'entities'), front);

  /* ── cook on it, through the real tap path ── */
  await place(-2);
  await P.page.evaluate(() => { const S = window._gameState.current; S.player.x += 34; S.rpg.inventory = S.rpg.inventory || {}; S.rpg.inventory.fish_minnow = 2; });
  await P.page.waitForTimeout(200);
  const tap = await P.page.evaluate(({ cf }) => {
    const S = window._gameState.current;
    const c = document.querySelector('canvas').getBoundingClientRect();
    const k = S._worldScaleX || 1;
    /* on the FLAME, well above where the old vector fire's box ended */
    return { x: c.left + (cf.x - S.camera.x) * k, y: c.top + (cf.y - 44 - S.camera.y) * k };
  }, { cf });
  await P.page.touchscreen.tap(tap.x, tap.y);
  await P.page.waitForTimeout(400);
  const cook = await P.page.evaluate(() => { const ex = window._gameState.current._extraction; return ex ? { skill: ex.skill } : null; });
  await shot('cook');
  rec.ok('tapping the new fire\'s flame starts a cook (the tap box follows the art)', !!(cook && cook.skill === 'cooking'), cook);
  await P.page.evaluate(() => { window._gameState.current._extraction = null; });
  await shot('burning');

  /* ── char, then the end ── */
  const nowT = await P.page.evaluate(() => Date.now());
  await P.page.clock.fastForward(Math.max(0, cf.litAt + 30000 - nowT));
  await P.page.waitForTimeout(300);
  const charred = self(await probe(P));
  rec.ok(`30 s in, the logs are charring (stage ${charred && charred.stage} of 5)`, !!(charred && charred.stage >= 3), charred);
  const exp = await P.page.evaluate(() => { const c = window._gameState.current._campfire; return c ? c.expiresAt : null; });
  const t1 = await P.page.evaluate(() => Date.now());
  await P.page.clock.fastForward(Math.max(0, exp - 4000 - t1));
  await P.page.waitForTimeout(300);
  const low = self(await probe(P));
  await shot('dying-down');
  rec.ok(`near the end the flames sink (size ${low && low.size} with ~4 s left)`, !!(low && low.size < 3), low);
  const t2 = await P.page.evaluate(() => Date.now());
  await P.page.clock.fastForward(Math.max(0, exp - 900 - t2));
  await P.page.waitForTimeout(250);
  const embers = self(await probe(P));
  await shot('embers');
  rec.ok(`...then go out, the embers still glowing (flame ${embers && embers.flameOn ? 'on' : 'out'}, light ${embers && embers.light})`,
    !!(embers && !embers.flameOn && embers.light > 0), embers);
  await P.page.clock.fastForward(1400);
  await P.page.waitForTimeout(300);
  const after = await P.page.evaluate(() => ({ rec: !!window._gameState.current._campfire, p: window.__btCampfire ? window.__btCampfire() : null }));
  const dying = (after.p && after.p.fires || [])[0] || null;
  rec.ok('when the fire\'s record ends, what is left dies down in place instead of vanishing', !after.rec && !!(dying && dying.dying), after);
  await P.page.clock.fastForward(6000);
  await P.page.waitForTimeout(300);
  const gone = await probe(P);
  rec.ok(`...and a few seconds later it is gone (${gone && gone.fires.length} drawn)`, !!(gone && gone.fires.length === 0), gone);

  /* ── other zones, other players ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current, now = Date.now();
    S._campfire = { x: S.player.x - 40, y: S.player.y + 50, nodeType: 'campfire', alive: true, zone: 'frost', litAt: now, expiresAt: now + 45000, name: 'Campfire' };
  });
  await P.page.waitForTimeout(250);
  const foreign = await probe(P);
  rec.ok('a fire lit in another zone is never drawn here', !!(foreign && foreign.fires.length === 0), foreign);
  await P.page.evaluate(() => {
    const S = window._gameState.current; S._campfire = null;
    window.__btDispatch({ type: 'campfire_lit', payload: { id: 'qa-peer', x: S.player.x + 60, y: S.player.y + 50, zone: S.currentZone, expiresAt: Date.now() + 45000 } });
  });
  /* v2.3.2846: polled, not read once at 500 ms -- in a long batch on the QA
     box a frame can take longer than that, and one read caught the page with
     no probe to answer (null), which is the harness, not the fire */
  let peer = null, pf = null;
  for (let i = 0; i < 20 && !(pf && pf.flameOn); i++) {
    await P.page.waitForTimeout(100);
    peer = await probe(P);
    pf = (peer && peer.fires || []).find((f) => f.key === 'p:qa-peer') || null;
  }
  rec.ok('a teammate\'s fire burns through the same code', !!(pf && pf.flameOn), peer);
  const errs = P.logs.filter((l) => /pageerror|TypeError|ReferenceError/.test(l));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close().catch(() => {});
}
