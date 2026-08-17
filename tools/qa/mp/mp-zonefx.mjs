/* WHAT FOLLOWS YOU THROUGH A ZONE EXIT, AND WHAT LEAKS IN FROM OUTSIDE.
 * v2.3.1748.
 *
 * Owner: "also making fires appears in every zone.  We made a fire in the
 * frost zone level and it appeared in worldview too even when we didn't make
 * one there."
 *
 * A campfire is a CLIENT-LOCAL prop — it is never sent to anyone (the worker
 * has no campfire state at all), so the other player's fire cannot have been
 * what they saw.  It was their own fire walking through the exit with them:
 * nothing recorded a zone on it, the renderer never asked, and no zone-change
 * path cleared it, so it redrew at the same absolute world coordinates on the
 * next map — and stayed cookable there.
 *
 * The same audit found the mirror-image family: effects that arrive FROM other
 * zones and get drawn anyway.  The event relay is room-wide by design
 * (server/src/index.js says so outright), which makes every zone decision for
 * these the client's, and several were simply missing.  Two of them are
 * checked here for real, with one player in each zone.
 *
 * Travel needs a weapon (the town gate refuses an unarmed character,
 * v2.3.1676), so the run accepts the first quest to be armed — that is the
 * game's own route to a sword, not a seeded shortcut.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Firebug', nameB: 'Homebody' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  /* ── arm A the way the game arms you ── */
  const place = (P, dx, dy) => P.page.evaluate(({ ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return true;
  }, { ox: dx, oy: dy });
  await place(A, 420, 0);
  await A.page.waitForTimeout(500);
  await A.page.evaluate(() => {
    const b = document.querySelector('.bt-inspect-close'); if (b) b.click();
  });
  await place(A, 0, 34);
  await A.page.waitForTimeout(1200);
  await H.clickText(A, 'Accept').catch(() => {});
  await A.page.waitForTimeout(1600);
  await A.page.evaluate(() => {
    const b = document.querySelector('.bt-inspect-close'); if (b) b.click();
  });
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !S.channel) return;
    const idx = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
    if (idx >= 0) S.channel.send({ type: 'equip_request', payload: { stashIdx: idx, slot: 'weapon' } });
  });
  await A.page.waitForTimeout(1500);
  rec.ok('the tester is armed, so the town gate will let them out',
    await H.readState(A, (S) => !!(S.rpg && S.rpg.weapon)),
    await H.readState(A, (S) => S.rpg && S.rpg.weapon));

  /* ── light a fire, through the game's own completion path ──
     Not by writing S._campfire directly: the whole bug was that the object
     the real path builds carried no zone, so a hand-built one would test the
     test.  Setting _firemaking with an elapsed doneAt makes the frame loop
     run the actual light-the-fire block in BroTown.jsx. */
  const lit = await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return null;
    S._campfire = null;
    S._firemaking = { x: S.player.x, y: S.player.y, startedAt: Date.now() - 2000, doneAt: Date.now() - 1 };
    return true;
  });
  rec.ok('the firemaking completion path can be driven', !!lit);
  await A.page.waitForTimeout(900);
  const fire = await H.readState(A, (S) => (S._campfire
    ? { zone: S._campfire.zone, x: Math.round(S._campfire.x), alive: !!S._campfire.alive } : null));
  rec.ok('lighting a fire actually produces a campfire', !!fire, fire);
  rec.ok('...and the campfire records the zone it was lit in',
    !!fire && fire.zone === 'town', fire);

  /* ── walk out ── */
  const marks = await A.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.TOWN_EXITS) return null;
    return { out: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview') };
  });
  rec.ok('the town exit table is readable', !!(marks && marks.out), marks);
  const travel = async (tx, ty, zoneId) => {
    for (let i = 0; i < 8; i++) {
      await A.page.evaluate(({ x, y }) => {
        const S = window._gameState && window._gameState.current;
        if (S && S.player) { S.player.x = x * 32 + 16; S.player.y = y * 32 + 16; }
      }, { x: tx, y: ty });
      const got = await H.waitFor(A, (S) => S.currentZone, (z) => z === zoneId,
        { timeout: 6000, label: 'reach ' + zoneId }).catch(() => null);
      if (got === zoneId) return true;
    }
    return (await H.readState(A, (S) => S.currentZone)) === zoneId;
  };
  const left = marks && marks.out ? await travel(marks.out.tx, marks.out.ty, 'worldview') : false;
  rec.ok('the tester actually changed zone (guard: a failed walk proves nothing)',
    left, await H.readState(A, (S) => S.currentZone));

  /* ── THE BUG ── */
  const after = await H.readState(A, (S) => ({
    zone: S.currentZone,
    campfire: S._campfire ? { zone: S._campfire.zone } : null,
    firemaking: S._firemaking ? true : false,
    extraction: S._extraction ? true : false,
  }));
  rec.ok('the campfire does NOT follow you into the next zone',
    after.campfire === null, after);
  rec.ok('...and neither does an in-progress light or gather',
    after.firemaking === false && after.extraction === false, after);

  /* ── and the reverse direction: effects from a zone you are not in ──
     B never leaves town.  A is in the World View.  Nothing B does should
     reach A's screen. */
  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'broadcast', event: 'emote', payload: { id: S.myId, emoji: '👋' } });
  });
  await A.page.waitForTimeout(1200);
  const emote2 = await A.page.evaluate((id) => {
    const S = window._gameState && window._gameState.current;
    const o = S && S.others && S.others[id];
    return o ? !!o.emote : 'peer-missing';
  }, bId);
  /* `peer-missing` is a pass in spirit but not a proof — say which it was. */
  rec.ok('an emote from another zone does not appear over your map',
    emote2 === false || emote2 === 'peer-missing', { emote2 });

  /* Chat bubbles are gated in the RENDERER, so the state will hold the
     message either way — walk the scene graph for the words instead. */
  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'broadcast', event: 'chat', payload: { id: S.myId, name: 'Homebody', text: 'ZONELEAKPROBE' } });
  });
  await A.page.waitForTimeout(1500);
  const bubble = await A.page.evaluate(() => {
    const out = { texts: 0, hit: false };
    try {
      const R = window._pixiRenderer;
      const walk = (c, d) => {
        if (!c || d > 6) return;
        if (typeof c.text === 'string') { out.texts++; if (c.text.indexOf('ZONELEAKPROBE') >= 0) out.hit = true; }
        if (c.children) c.children.forEach((ch) => walk(ch, d + 1));
      };
      walk(R && R.app && R.app.stage, 0);
    } catch (e) { /* texts:0 fails the guard below */ }
    return out;
  });
  rec.ok('the scene graph is walkable (guard: an empty walk proves nothing)',
    bubble.texts > 0, bubble);
  rec.ok("a chat bubble from another zone is not drawn over your ground",
    !bubble.hit, bubble);

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
