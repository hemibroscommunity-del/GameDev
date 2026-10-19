/* IS YOUR PET ACTUALLY ON THE SCREEN? (v2.3.2078)
 *
 * ── THE BUG THIS EXISTS FOR ──
 * entityRenderer's `_updatePet` opened with `const pet = S._activePet`, and
 * nothing in the whole client has ever written `S._activePet` — not
 * BroTown.jsx, not gameEvents, not wsClient, not any panel, at any point in
 * the history. So the early return fired on every frame and the pet display
 * was never made visible to anybody, ever.
 *
 * It survived because the pet is NOT a dormant feature and everything else
 * about it works:
 *   - the follow simulation runs each frame (BroTown.jsx §18.1), keeping
 *     S._petX / S._petY;
 *   - the auto-loot really collects coins inside PET_LOOT_RADIUS;
 *   - wsClient floats a "PET +N G" popup at S._petX, over empty ground;
 *   - the pet house, the roster and the inspect card all show the emoji.
 * A player who bought a pet and switched it on got the loot, got a popup out
 * of thin air, and never saw the animal. Every surface agreed it was there
 * except the world.
 *
 * ── WHY THIS IS ASSERTED ON THE DISPLAY AND NOT ON PIXELS ──
 * The pet is an emoji in a Text object, drawn at the system emoji font. What
 * that rasterises to is a property of the container's font stack, not of the
 * game, so counting coloured pixels would be measuring Chromium. What the
 * game owns is: is there a pet display, is it visible, is it at the position
 * the follow simulation computed, and is it showing THIS pet's emoji and
 * name. That is the whole of the bug and all of it is readable.
 *
 * The position check is the part that would have caught the popup mismatch
 * too: renderer and popup now read the same S._petX/_petY.
 *
 * v2.3.3399: a REAL pet now.  Since v2.3.3120 a pet lives in the worker's
 * pets record (server/src/petbook.js, pets_state -> S._petBook), drawn from
 * the pet sheet as the monster it was caught from (no emoji any more), and
 * the renderer draws the one the record has out (game/petBook.js activePet).
 * The old R.lifeSkills pair this wrote is read only against an older worker,
 * so the pet it put in the house was never drawn (the sweep of 2026-10-18).
 * The Test panel's lever makes a catch (/dev/trapping {pet}), which comes out
 * with you, and the game's own pet_name and pet_active name it and put it
 * away, as the Pets page does.
 */
import * as H from './harness.mjs';

const PET = { name: 'Biscuit', home: 'frost' };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'PetOwner', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);

  const probe = () => P.page.evaluate(() => {
    const r = window._pixiRenderer;
    return (r && r.petDrawn) ? r.petDrawn() : 'no-probe';
  });

  /* ── NO PET: nothing on the ground ── */
  const none = await probe();
  rec.ok('the renderer offers a pet probe at all (guard)', none !== 'no-probe', none);
  rec.ok('with no pet active, nothing pet-shaped is visible',
    none === null || none.visible === false, none);

  /* ── ONE PET, ACTIVE ──
     v2.3.3399: caught for the worker's record and named there (header). */
  const myId = await H.readState(P, (S) => S.myId);
  const made = await H.devOp(wsPort, 'trapping', myId, { level: 5, pet: { home: PET.home, level: 1 } }).catch(() => null);
  const outWith = !!(made && made.pet) && await P.page.waitForFunction((id) => {
    const b = window._gameState.current._petBook;
    return !!(b && b.active === id);
  }, made.pet, { timeout: 8000 }).then(() => true).catch(() => false);
  if (outWith) {
    await P.page.evaluate(([id, name]) => {
      const S = window._gameState.current;
      S.channel.send({ type: 'pet_name', payload: { id, name } });
    }, [made.pet, PET.name]);
    await P.page.waitForFunction(([id, name]) => {
      const b = window._gameState.current._petBook;
      const p = b && b.list.find((q) => q && q.id === id);
      return !!(p && p.name === name);
    }, [made.pet, PET.name], { timeout: 8000 }).catch(() => {});
    await P.page.evaluate(() => { window._gameState.current._petX = null; });   /* let the follow simulation seed it */
  }
  const armed = await H.readState(P, (S) => {
    const b = S._petBook;
    const p = b && b.list.find((q) => q && q.id === b.active);
    return p ? { id: p.id, kind: p.kind, name: p.name } : null;
  });
  rec.ok('a pet could be caught, named and taken out with you (guard)',
    outWith && !!armed && armed.id === made.pet && armed.name === PET.name, { made, armed });

  const drew = await H.waitFor(P, () => {
    const r = window._pixiRenderer;
    const d = (r && r.petDrawn) ? r.petDrawn() : null;
    return d && d.visible ? d : null;
  }, (d) => !!d, { timeout: 8000, label: 'the pet appears' }).catch(() => null);

  rec.ok('THE REGRESSION: an active pet is actually drawn in the world',
    !!drew && drew.visible === true, drew || (await probe()));
  /* v2.3.3399: its own kind off the pet sheet, where it showed its emoji */
  rec.ok("...drawn from the pet sheet as its own kind, the one the Pets page shows",
    !!drew && !!armed && drew.kind === armed.kind && drew.tex === true, { drew, armed });
  rec.ok('...and its name', !!drew && drew.name === PET.name, drew);

  /* ── IT IS WHERE THE SIMULATION PUT IT ──
     Not "somewhere on screen": at S._petX/_petY, which is also where wsClient
     floats the coin popup. The two disagreeing is how a popup ends up over
     bare ground. */
  const agree = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const d = window._pixiRenderer.petDrawn();
    return { px: S._petX, py: S._petY, dx: d && d.x, dy: d && d.y,
      plx: S.player.x, ply: S.player.y };
  });
  rec.ok('the drawn pet sits exactly where the follow simulation put it '
       + '(so the coin popup lands on it)',
    typeof agree.px === 'number' && Math.abs(agree.dx - agree.px) < 0.5
    && Math.abs(agree.dy - agree.py) < 0.5, agree);
  rec.ok('...and that is near the player, not at the world origin',
    Math.hypot(agree.dx - agree.plx, agree.dy - agree.ply) < 200, agree);

  /* ── IT FOLLOWS ──
     A pet pinned at its spawn point would pass everything above. */
  const before = { x: agree.dx, y: agree.dy };
  /* v2.3.3480: every frame of the walk, where the follow left the pet and how
     long the game took that frame to be (S._dtScale, 1 at 60 Hz).  Read after
     the game loop's own callback: it asks for its next frame first thing, so
     a callback asked for later in a frame runs after it in the next. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const out = [];
    let on = true;
    window.__petPace = out;
    window.__petPaceStop = () => { on = false; };
    const look = () => {
      if (!on) return;
      if (typeof S._petX === 'number' && typeof S._petY === 'number' && S.player) {
        out.push({ px: S._petX, py: S._petY, x: S.player.x, y: S.player.y, dt: S._dtScale || 1 });
      }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(2200);
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(1200);
  const after = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const d = window._pixiRenderer.petDrawn();
    return { dx: d && d.x, dy: d && d.y, plx: S.player.x, ply: S.player.y };
  });
  rec.ok('the pet followed the player across the plaza',
    Math.hypot(after.dx - before.x, after.dy - before.y) > 60, { before, after });
  rec.ok('...and is still beside them at the end of the walk',
    Math.hypot(after.dx - after.plx, after.dy - after.ply) < 200, after);
  /* ── AT THE SAME PACE ON EVERY SCREEN (v2.3.3480) ──
     The follow (BroTown.jsx §18.1) is 2 px a 60 Hz frame, so a frame the game
     counts as k of them (S._dtScale) must move it 2k: a frame-rate-blind 2 px
     left it at half pace on a 30 fps phone and 209 px behind here (the sweep
     of 2026-10-19), where frames come ~12 a second.  Only frames that start
     clearly outside the follow's 50 px ring are counted (measured from where
     the pet began the frame to where you ended it, as the follow measures);
     a personality's idle wiggle adds at most a quarter of a step either way,
     so the middle of the steps must be within 30% of the frame's share.  On
     a 60 Hz machine the old step passes too: there it was right. */
  const pace = await P.page.evaluate(() => {
    if (window.__petPaceStop) window.__petPaceStop();
    const s = window.__petPace || [];
    const k = [], dts = [];
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i];
      const gap = Math.hypot(a.px - b.x, a.py - b.y);
      const step = Math.hypot(b.px - a.px, b.py - a.py);
      if (gap > 56 && step > 0 && step < 100) { k.push(step / (2 * b.dt)); dts.push(b.dt); }
    }
    const mid = (v) => { const w = v.slice().sort((p, q) => p - q); return w.length ? Math.round(w[w.length >> 1] * 100) / 100 : null; };
    return { frames: s.length, follow: k.length, share: mid(k), dt: mid(dts) };
  });
  console.log('    pet pace over the walk: ' + JSON.stringify(pace));
  rec.ok("...at the walk's pace whatever the frame rate: each step is its frame's share of 2 px a 60 Hz frame",
    pace.follow >= 4 && pace.share > 0.7 && pace.share < 1.3, pace);

  /* ── SWITCHED OFF, IT GOES AWAY ──
     The other half of the gate: a renderer that ignores the field on the way
     in can just as easily ignore it on the way out. */
  /* v2.3.3399: put away through the record (pet_active {id: null}), as the
     Pets page does */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.channel.send({ type: 'pet_active', payload: { id: null } });
  });
  await P.page.waitForFunction(() => {
    const b = window._gameState.current._petBook;
    return !!b && !b.active;
  }, null, { timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(900);
  const off = await probe();
  rec.ok('putting the pet away takes it off the screen',
    !!off && off.visible === false, off);

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while the pet came and went', errs.length === 0, errs.slice(0, 3));

  await P.ctx.close().catch(() => {});
}
