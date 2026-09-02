/* THE FIRE GOBLIN'S FIRE TRAIL, ON A REAL CLIENT (v2.3.2238).
 *
 * Owner: "build the fire trail for the fire goblin."
 *
 * The trail's RULES -- spacing, arming, the radius, one tick per player, the
 * lifetime, the caps -- are pinned deterministically against the worker in
 * server/test/firetrail.test.mjs, where they can be driven without a clock.
 * What that suite cannot see is whether a real browser does anything at all
 * with what the worker sends.  Two halves, and each has already been a
 * shipped-and-invisible bug in this repo at least once:
 *
 *   1. THE FIRE IS DRAWN.  gameEvents' ability whitelists have swallowed a
 *      working server feature four times (the telegraph kits, the basic
 *      wind-up, the burrow phases, the slime burst).  A hazard nobody can
 *      see is worse than no hazard.
 *   2. THE BURN'S NUMBER REACHES THE HEALTH BAR.  This is the owner's own
 *      complaint from v2.3.2235, one system later: the monster_attack
 *      handler has FOUR upstream filters that can eat a damage number, and
 *      a fire patch trips three of them by construction -- it is not a
 *      monster in the snapshot, and (the new one) a raised shield covers it,
 *      because fire under your feet has no direction to face away from.
 *
 * THE VEHICLE.  Ember, where fire goblins live, is quest-gated server-side
 * (_zoneUnlocked, server/src/movement.js) and out of the harness's reach, so
 * this drives a real client in MEADOW using the exact payloads
 * server/src/firetrail.js builds, field for field, rather than a real
 * goblin.  Same compromise mp-burstdmg.mjs makes and for the same reason;
 * the controls below are what keep it honest, and the server suite covers
 * everything the payload shape cannot.
 */
import * as H from './harness.mjs';

/* The fire_trail payload firetrail.js emits, field for field. */
const dropPatch = (P, opts) => P.page.evaluate((o) => {
  const S = window._gameState.current;
  window.__btDispatch({
    type: 'fire_trail',
    payload: {
      zone: o.zone || S.currentZone, monsterId: 'qa-goblin',
      x: Math.round(S.player.x + (o.dx || 0)), y: Math.round(S.player.y + (o.dy || 0)),
      r: 26, ms: o.ms || 4000, arm: o.arm === undefined ? 300 : o.arm,
    },
  });
  return (S._fireTrail || []).length;
}, opts || {});

const patches = (P) => P.page.evaluate(() => (window._gameState.current._fireTrail || [])
  .map((f) => ({ x: f.x, y: f.y, r: f.r, zone: f.zone, dur: f.duration, arm: f.arm })));

/* The monster_attack payload _fireTrailHitPlayer emits, field for field.
   BURN is the dmgTaken this file injects and nothing else in the world deals
   it -- ambient meadow combat threw real numbers into an earlier version of
   this measurement, which is exactly the false green mp-burstdmg was
   rewritten to avoid. */
const BURN = 37;
const burnTick = (P, opts) => P.page.evaluate((o) => {
  const S = window._gameState.current;
  /* HEAL FIRST, every time.  Meadow monsters are live and swinging for the
     whole run, and the handler's very first gate is `if (!R2 || R2.hp <= 0)
     break` -- so a player the ambient fight had worn down would make this
     file report the fire trail as broken when nothing about it was.  An
     earlier version healed once at the top and flaked exactly that way. */
  if (S.rpg) { S.rpg.hp = S.rpg.maxHp; }
  S.dmgNumbers = [];
  S._shieldUp = !!o.shield;
  if (o.shield) { S.player.facing = 'east'; S.player.dir = 'east'; }
  const payload = {
    monsterId: 'qa-goblin', targetId: S.myId, dmg: 6, dmgTaken: o.dmg,
    dodged: false, zone: S.currentZone,
    /* THE PATCH is the attacker, under our feet -- not the goblin. */
    attackerX: S.player.x + 8, attackerY: S.player.y + 4,
  };
  if (o.ability) payload.ability = o.ability;
  window.__btDispatch({ type: 'monster_attack', payload });
  return { hp: S.rpg ? S.rpg.hp : null, srv: !!S._serverMonsters, zone: S.currentZone,
           myId: S.myId, target: payload.targetId, dodge: !!S._dodgeRoll,
           loading: !!S._zoneLoading };
}, Object.assign({ dmg: BURN, ability: 'firetrail', shield: false }, opts || {}));

const popped = (P) => P.page.evaluate((want) => (window._gameState.current.dmgNumbers || [])
  .filter((p) => p.text === '-' + want)
  .map((p) => ({ text: p.text, icon: p.iconKey || null })), BURN);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Ashwalker', wsPort, webPort });
  /* v2.3.2239: watch for the owner's sheet on the wire.  The pixel test
     below cannot tell the sprite path from the procedural fallback -- both
     paint warm pixels -- so a 404 or a renamed file would ship "working and
     invisible art" with this file still green.  Two independent checks
     close that: the sheet is fetched, and (further down) the flame reaches
     ABOVE the ground, which a flat fallback disc never does. */
  const sheetHits = [];
  P.page.on('response', (r) => {
    if (!r.url().includes('/sprites/fx/fire-trail')) return;
    /* CONTENT-TYPE, not just the status.  The harness serves dist/ with an
       SPA fallback, so a MISSING sheet still answers 200 -- with index.html.
       Measured: deleting the PNG and re-running, this listener still saw a
       200 and only the flame-height check below caught the fallback.  A
       status-only assertion here would have been decoration. */
    sheetHits.push({ url: r.url(), status: r.status(), type: r.headers()['content-type'] || '' });
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'meadow';
    if (S.channel) S.channel.send({ type: 'move', x: 500, y: 500, z: 'meadow' });
  });
  await P.page.waitForTimeout(3000);

  const guard = await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg) S.rpg.hp = S.rpg.maxHp;
    S._fireTrail = [];
    return { srv: !!S._serverMonsters, zone: S.currentZone };
  });
  rec.ok('a real server-authoritative zone to burn in (guard)',
    guard.srv && guard.zone === 'meadow', guard);
  if (!guard.srv) { await P.ctx.close().catch(() => {}); return; }

  /* ── 0. THE OWNER'S SHEET LOADED ──
     PRELOADING IS LAW (CLAUDE.md): the strip registers in fxStrips.js, whose
     fxStripsReady() the central manifest awaits, so by the time the world is
     up it must already be fetched -- not fetched later, on first sighting of
     a patch. */
  console.log('    SHEET REQUESTS -> ' + JSON.stringify(sheetHits));
  rec.ok('the fire-trail sheet is fetched during the loading screen, as a real image',
    sheetHits.length > 0
      && sheetHits.every((h) => h.status === 200 && /^image\//.test(h.type)), sheetHits);

  /* ── 0b. IT DRAWS UNDER THE THINGS STANDING IN IT ──
     v2.3.2238 drew the patches into particleGfx, which sits ABOVE `entities`
     and `player` -- burning GROUND painted over the character standing on
     it.  Two halves pinned: the world stack still puts the telegraph layer
     below the player (this), and the sprite is added to that layer
     (mirror-audit's text pin, since a scenario cannot see a display list). */
  const order = await P.page.evaluate(() => window.__btLayerOrder || null);
  rec.ok('the ground-hazard layer still sits below the player',
    !!order && order.indexOf('telegraphs') >= 0
      && order.indexOf('telegraphs') < order.indexOf('player')
      && order.indexOf('telegraphs') < order.indexOf('entities'),
    order);

  /* ── 1. THE FIRE LANDS ON THE GROUND ── */
  await dropPatch(P, { dx: 0, dy: 0 });
  await P.page.waitForTimeout(200);
  const one = await patches(P);
  console.log('    ONE PATCH -> ' + JSON.stringify(one));
  rec.ok('a fire_trail event puts a patch on the ground', one.length === 1, one);
  /* The radius the player sees has to be the radius the server tests, or
     they learn the wrong edge and walk into damage they read as unfair. */
  rec.ok('...at the radius the server said it would test',
    one.length === 1 && one[0].r === 26, one);
  rec.ok('...with the life the server gave it, not a fresh one',
    one.length === 1 && one[0].dur === 4000, one);

  /* ── 2. IT IS SOMEBODY ELSE'S ZONE'S FIRE ──
     A patch from a zone we are not in must never reach the ground: ember
     fire drawn on the town map is the same stale-entity bug the empty
     zone_state sends exist to stop. */
  await dropPatch(P, { dx: 30, zone: 'frost' });
  await P.page.waitForTimeout(200);
  const otherZone = await patches(P);
  console.log('    AFTER A frost PATCH -> ' + JSON.stringify(otherZone.length));
  rec.ok('fire from another zone is refused', otherZone.length === 1, otherZone);

  /* ── 3. THE RENDERER REAPS IT ──
     Not a cosmetic detail: the draw loop is the ONLY thing that expires a
     patch client-side (the server sends no "it went out" event, and a delta
     cannot express a removed field).  If the renderer never walks the list,
     the ground stays on fire for the rest of the session.  A patch given a
     250ms life that is gone a second later proves the loop ran. */
  await P.page.evaluate(() => { window._gameState.current._fireTrail = []; });
  await dropPatch(P, { dx: 0, ms: 250, arm: 0 });
  const before = await patches(P);
  await P.page.waitForTimeout(1200);
  const after = await patches(P);
  console.log('    SHORT PATCH: ' + before.length + ' -> ' + after.length);
  rec.ok('the renderer expires a patch when its life runs out',
    before.length === 1 && after.length === 0, { before, after });

  /* ── 3b. THE FIRE IS ACTUALLY ON SCREEN ──
     The reap test above proves the draw LOOP walks the list.  It does not
     prove the loop paints anything, and "the ability shipped working and
     invisible" is this repo's signature failure -- four times over in the
     monster_ability whitelist alone.  So: count warm pixels in a patch of
     ground well clear of the player sprite, with fire on it and with the
     same ground bare.  Meadow is green, so a real flame is a large signal
     and the bare control is the proof that it is the flame being counted
     and not the grass. */
  await P.page.evaluate(() => { window._gameState.current._fireTrail = []; });
  const FIREW = 80;
  const fireBox = async () => P.page.evaluate((w) => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    /* 110px east of the player: outside his ~40px body box, so nothing in
       the crop can be the character's own warm skin or hair. */
    const wx = S.player.x + 110, wy = S.player.y;
    const sx = r.left + (wx - S.camera.x) * (S._worldScaleX || 1);
    const sy = r.top + (wy - S.camera.y) * (S._worldScaleY || 1);
    const x = Math.round(sx - w / 2), y = Math.round(sy - w / 2);
    if (x < 0 || y < 0 || x + w > innerWidth || y + w > innerHeight) return null;
    return { x, y, width: w, height: w };
  }, FIREW);
  /* Warm = the ember palette against grass: red clearly ahead of both green
     and blue.  Green grass and the slate UI both fail it. */
  const warmCount = async (box) => {
    const px = await H.screenshotPixels(P, box);
    let n = 0;
    for (let i = 0; i < px.data.length; i += 4) {
      const r = px.data[i], g = px.data[i + 1], b = px.data[i + 2];
      if (r > g + 40 && r > b + 60 && r > 90) n++;
    }
    return n;
  };
  const box = await fireBox();
  if (!box) {
    rec.ok('the fire is painted on the ground', false, 'the sample box fell off screen');
  } else {
    const bare = await warmCount(box);
    /* A cluster, not one patch: the goblin lays a TRAIL, and a trail is what
       the player sees.  Three overlapping patches is what ~100px of his walk
       actually leaves behind. */
    for (const dx of [90, 110, 130]) await dropPatch(P, { dx, dy: 0, arm: 0, ms: 20000 });
    await P.page.waitForTimeout(500);
    const lit = await warmCount(box);
    console.log('    WARM PIXELS: bare ' + bare + ' -> lit ' + lit);
    /* MEASURED on the first green run: bare 2, lit 190, back to 2 once
       cleared.  The bar is set well under that and as a RATIO as well as a
       margin, so it stays meaningful if the palette or the patch size is
       ever retuned, and cannot be cleared by the handful of warm pixels
       grass and shadow contribute on their own. */
    rec.ok('the fire is painted on the ground',
      lit >= 60 && lit > (bare + 1) * 10, { bare, lit });
    /* ...and it goes out.  Same crop, same frame budget: if the "lit" number
       above were the grass or the HUD, this would not fall back. */
    await P.page.evaluate(() => { window._gameState.current._fireTrail = []; });
    await P.page.waitForTimeout(500);
    const out = await warmCount(box);
    console.log('    WARM PIXELS after clearing: ' + out);
    rec.ok('...and the same ground goes dark when the fire is gone',
      out <= bare + 20 && out < lit / 4, { bare, lit, out });

    /* ── IT IS THE ART, NOT THE FALLBACK ──
       The fallback is a flat disc centred on the patch: it puts NOTHING
       more than its 26px radius above the patch's own y.  The owner's
       flame stands ~55px tall above the same point.  So warm pixels well
       above the ground are the one signal that separates the two, and
       without it this file would report a green on a sheet that never
       loaded.

       THE BAND IS MEASURED, NOT GUESSED.  Profiled on the real client, warm
       pixels run from the patch centre up to about -50 and peak around -20:
         dy    0  -10  -20  -30  -40  -50  -60
         px   26   60   62   61   28   15    1
       so the sample sits at -30..-50, past the fallback's reach and inside
       the flame's.  A first cut sampled -62, which is the tip where there is
       almost nothing, and failed on art that was drawing perfectly. */
    for (const dx of [90, 110, 130]) await dropPatch(P, { dx, dy: 0, arm: 0, ms: 20000 });
    await P.page.waitForTimeout(500);
    const aboveBox = await P.page.evaluate((w) => {
      const S = window._gameState.current;
      const r = document.querySelector('canvas').getBoundingClientRect();
      /* -40 +/- 10.  The fallback disc has radius 26, so its HIGHEST pixel
         is at -26 and this band is empty for it by construction. */
      const wx = S.player.x + 110, wy = S.player.y - 40;
      const sx = r.left + (wx - S.camera.x) * (S._worldScaleX || 1);
      const sy = r.top + (wy - S.camera.y) * (S._worldScaleY || 1);
      const x = Math.round(sx - w / 2), y = Math.round(sy - 10);
      if (x < 0 || y < 0 || x + w > innerWidth || y + 20 > innerHeight) return null;
      return { x, y, width: w, height: 20 };
    }, FIREW);
    if (!aboveBox) {
      rec.ok('the flame stands above the ground (the art, not the fallback)',
        false, 'the sample band fell off screen');
    } else {
      const above = await warmCount(aboveBox);
      console.log('    WARM PIXELS 30-50px ABOVE the patch: ' + above);
      rec.ok('the flame stands above the ground (the art, not the fallback)',
        above >= 25, { above, note: 'the fallback disc has radius 26 — this band is empty for it' });
    }
    await P.page.evaluate(() => { window._gameState.current._fireTrail = []; });
    await P.page.waitForTimeout(300);
  }

  /* ── 4. THE BURN'S NUMBER REACHES THE HEALTH BAR ──
     CONTROL FIRST.  The patch is not in the monster snapshot under any id
     the client knows, so without the ability tag the very first filter in
     the monster_attack handler drops this outright. */
  const diag = await burnTick(P, {});
  console.log('    DIAG -> ' + JSON.stringify(diag));
  /* The tag's whole job is to survive the client's filters, and every one of
     them is gated on S._serverMonsters.  If the fixture has drifted out of a
     server-authoritative zone the assertions below measure nothing, so say
     so rather than reporting a green or a red about the fire trail. */
  rec.ok('still in a server-authoritative zone for the burn ticks (guard)',
    diag.srv === true && diag.zone === 'meadow', diag);
  await P.page.waitForTimeout(300);
  const ctrl = await popped(P);
  console.log('    BURN TICK (tagged) -> ' + JSON.stringify(ctrl));
  rec.ok('CONTROL: a burn tick floats its damage number on us',
    ctrl.some((p) => /^-\d/.test(p.text) && p.icon === 'heart'), ctrl);

  /* ── 5. A RAISED SHIELD DOES NOT SWALLOW IT (v2.3.2238) ──
     The handler's local block fallback zeroed the number whenever the
     shield arc happened to cover the attacker -- and fire under your feet is
     covered by a shield pointed anywhere near it.  The worker charged the
     HP either way, so this is precisely the "damage with no number" the
     owner reported one system ago, in the same handler. */
  await burnTick(P, { shield: true });
  await P.page.waitForTimeout(300);
  const shielded = await popped(P);
  console.log('    BURN TICK WHILE BLOCKING -> ' + JSON.stringify(shielded));
  rec.ok('a burn tick still shows its number while we are blocking',
    shielded.some((p) => /^-\d/.test(p.text) && p.icon === 'heart'), shielded);
  await P.page.evaluate(() => { window._gameState.current._shieldUp = false; });

  /* ── 6. DEPLOY ORDER (rule 19) ──
     An older worker tags nothing, and the client's existing filtering must
     stand exactly as it does today.  Without this the change reads as "the
     client stopped filtering", which is a different and worse one. */
  await burnTick(P, { ability: null });
  await P.page.waitForTimeout(300);
  const oldWorker = await popped(P);
  console.log('    OLD WORKER (no ability tag) -> ' + JSON.stringify(oldWorker));
  rec.ok('against a worker that does not tag the burn, the old filtering stands',
    oldWorker.length === 0, oldWorker);

  /* ── 7. LEAVING THE ZONE PUTS THE FIRE OUT ──
     LAST ON PURPOSE, and this is the fixture lesson the file exists to
     remember.  It fakes a zone change by writing S.currentZone directly,
     which also flips S._serverMonsters off -- town is client-rolled, and
     nothing re-derives that flag until a real zone_state arrives.  Run
     before the burn assertions, it silently turned this whole file into a
     single-player client, `_srvResolved` went false, and the burn numbers
     were dropped by the very filter the tag exists to bypass.  Measured:
     one in three runs, which is worse than a clean failure.  Anything that
     fakes a zone belongs at the END. */
  await P.page.evaluate(() => { window._gameState.current._fireTrail = []; });
  await dropPatch(P, { dx: 0, ms: 30000, arm: 0 });
  const beforeLeave = await patches(P);
  await P.page.evaluate(() => { window._gameState.current.currentZone = 'town'; });
  await P.page.waitForTimeout(600);
  const left = await patches(P);
  console.log('    LEAVING THE ZONE: ' + beforeLeave.length + ' -> ' + left.length);
  rec.ok('walking to another zone clears the fire behind us',
    beforeLeave.length === 1 && left.length === 0, { beforeLeave, left });

  await P.ctx.close().catch(() => {});
}
