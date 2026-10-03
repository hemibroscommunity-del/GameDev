/* ═══ THE WHEEL IS THE WORLD, AND YOU START IN ITS BROTOWN (v2.3.2990) ═══
 *
 * Owner, 2026-10-02: "I'm ready to have this replace the old game map. Just
 * have players spawn in town. Then push to main" -- and, asked: "The Wheel's
 * new Brotown", "Close them for now" (src/game/wheelHome.js).
 *
 * On a phone viewport, against a real worker, the game as a player gets it
 * (no switches in the address):
 *   1. a new character arrives in the Wheel's Brotown, by its town square,
 *      without walking a step; the top bar says "Brotown / safe" (v2.3.3009:
 *      it said "The Wheel"), and no test readout
 *      is on screen;
 *   2. until they have spoken to Mayor Bro they stay on the safe commons:
 *      walking out stops at its edge, with the banner;
 *   3. the Wheel's own Mayor Bro gives the first quest -- and with it they
 *      walk out onto a land;
 *   4. dying out there brings them back in the Wheel's Brotown, not today's
 *      town;
 *   5. the marker beside where they land still leads to today's town, and
 *      they stay there;
 *   6. `?trial=off` is today's town and the old World View, as before;
 *   7. no page errors;
 *   8. the quest's way works there (src/game/questRoute.js): the minimap's
 *      star and, since v2.3.2992, its gold road lead a new character to the
 *      Wheel's own Mayor Bro, then, with his first quest, to Frost Ridge's
 *      monsters, stopping among them -- and nothing is drawn on the ground
 *      (the owner: "just rely on the gold road on the minimap"); and a death
 *      there no longer leaves today's town with the Wheel's npc list
 *      (src/game/respawn.js).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';

/* where the player is, and how far from the Wheel's middle */
const at = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  /* in today's town: is any npc standing off its map (the Wheel's list, carried over)? */
  const townW = S.currentZone === 'town' && S.map && S.map[0] ? S.map[0].length * 32 : 0;
  const npcs = Array.isArray(S.npcs) ? S.npcs : [];
  return { zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y), loading: !!S._zoneLoading,
    dying: !!S._dying, gateHits: S._wheelGateHits || 0, tut1: !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1),
    npcN: npcs.length, npcFar: townW > 0 && npcs.some((n) => n && n.x > townW) };
});

/* the quest's way, as the road on the ground and the minimap's star read it
   this frame (tileRenderer _drawQuestTrail, wheelMinimap) */
const way = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const road = window.__btQuestRoad || null, mini = window.__btMinimap || null;
  const m = (Array.isArray(S.npcs) ? S.npcs : []).find((n) => n && n.name === 'Mayor Bro');
  return { road: road ? { to: road.to, motes: road.motes, style: road.style } : null,
    star: mini && mini.wheel ? mini.quest : undefined, mayor: m ? { x: Math.round(m.x), y: Math.round(m.y) } : null,
    me: { x: Math.round(S.player.x), y: Math.round(S.player.y) } };
});
/* v2.3.2992: does the minimap's gold road run from you toward `to`?  (its
   ends in box px, against the world's own direction) */
const roadToward = (w, to) => {
  const r = w && w.star && w.star.road;
  if (!r || !(r.len > 0)) return false;
  const ax = r.x1 - r.x0, ay = r.y1 - r.y0, bx = to.x - w.me.x, by = to.y - w.me.y;
  return (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1) > 0.99;
};
const near = (a, b, d = 2) => !!a && !!b && Math.abs(a.x - b.x) <= d && Math.abs(a.y - b.y) <= d;

export async function run({ browser, wsPort, webPort, rec }) {
  const { WHEEL_SPAWNS, WHEEL_CENTRE, WHEEL_SAFE_R } = await import(H.REPO + '/server/src/wheelspawns.js');
  const [cx, cy] = WHEEL_CENTRE;
  const r = (p) => Math.round(Math.hypot(p.x - cx, p.y - cy));
  const P = await H.newPlayer(browser, { name: 'Settler', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const zones = [];
  await H.enterWorld(P);

  /* ── 1. the way in ── */
  const t0 = Date.now();
  let a = null;
  for (let i = 0; i < 240; i++) {
    a = await at(P);
    if (!zones.length || zones[zones.length - 1] !== a.zone) zones.push(a.zone);
    if (WHEELISH(a.zone) && !a.loading) break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2000);
  a = await at(P);
  const shown = await P.page.evaluate(() => {
    const h = document.getElementById('bt-world-trial');
    const t = document.querySelector('.bt-zone-header__title');
    /* v2.3.3009: the place and its gold line, the bar's two lines in the Wheel */
    const pl = document.querySelector('[data-zone-place]'), sb = document.querySelector('[data-zone-sub]');
    return { readout: !!(h && h.style.display !== 'none'), title: t ? t.textContent : null,
      place: pl ? pl.textContent : null, sub: sb ? sb.textContent : null };
  });
  rec.ok(`a new character starts in the Wheel's Brotown, by its town square, without walking a step (${zones.join(' -> ')}, ${((Date.now() - t0) / 1000).toFixed(1)} s, ${r(a)} px from the middle)`,
    a.zone === 'wheel' && zones[0] === 'town' && r(a) < 600, { zones, a });
  /* v2.3.3009: the owner: "Put the 'brotown safe' and other location
     indicators in place of the 'the wheel lvl 1-2' on the top bar" */
  rec.ok(`...the top bar says where he is, "${shown.place}" over "${shown.sub}" (not "The Wheel (Lv1-2)"), and no test readout is on screen`,
    shown.place === 'Brotown' && shown.sub === 'safe' && !/The Wheel|Lv1-2|trial/i.test(shown.title || '') && !shown.readout, shown);

  /* ── 8a. the way to the Mayor, before a word with him ── */
  const w0 = await way(P);
  rec.ok("a new character's way leads to the Wheel's own Mayor Bro, not the marker to today's town -- and nothing is drawn on the ground",
    !!w0.road && !!w0.road.to && w0.road.to.npc === 'Mayor Bro' && near(w0.road.to, w0.mayor) && w0.road.style === 'off' && w0.road.motes === 0, w0);
  rec.ok("...the Wheel's minimap stars him", !!w0.star && w0.star.npc === 'Mayor Bro' && near(w0.star, w0.mayor) && !w0.star.edge, w0.star);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/wheelhome-road-mayor.png` }).catch(() => {});   /* v2.3.2992: to look at */

  /* ── 2. the commons hold an unarmed player ── */
  const [fx, fy] = WHEEL_SPAWNS.frost.anchor;
  const ux = (fx - cx) / Math.hypot(fx - cx, fy - cy), uy = (fy - cy) / Math.hypot(fx - cx, fy - cy);
  const far = { x: cx + ux * (WHEEL_SAFE_R + 500), y: cy + uy * (WHEEL_SAFE_R + 500) };
  await H.hopTo(P, far.x, far.y, { tries: 60 });
  await P.page.waitForTimeout(800);
  const held = await at(P);
  rec.ok(`until they speak to Mayor Bro, walking out stops at the safe commons' edge (${r(held)} px from the middle, the edge at ${WHEEL_SAFE_R}), with the banner`,
    !held.tut1 && r(held) <= WHEEL_SAFE_R && held.gateHits >= 1, held);
  /* v2.3.2992: from out there he is far off the box -- the gold road runs to
     its edge, the star waiting there, pointing back at him */
  const wHeld = await way(P);
  rec.ok(`...and from there the minimap's gold road leads back to him, to the box's edge (${wHeld.star && wHeld.star.road ? wHeld.star.road.len : '?'} px drawn)`,
    !!wHeld.star && wHeld.star.npc === 'Mayor Bro' && wHeld.star.edge === true && wHeld.star.road && wHeld.star.road.len > 30
    && !!wHeld.mayor && roadToward(wHeld, wHeld.mayor) && wHeld.road && wHeld.road.motes === 0, wHeld);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/wheelhome-road-back.png` }).catch(() => {});

  /* ── 3. the Wheel's own Mayor Bro gives the first quest, and the land opens ── */
  const home = { x: a.x, y: a.y };
  await H.hopTo(P, home.x, home.y, { tries: 60 });
  const talked = await H.approachNpc(P, 'mayor_bro');
  const landed = talked ? await H.advanceNpcDialogue(P) : null;
  const accepted = landed === 'offer' ? await H.confirmQuestOffer(P) : false;
  await P.page.waitForTimeout(1800);
  await H.leaveNpc(P, 'mayor_bro');
  const armed = await at(P);
  rec.ok("the Wheel's own Mayor Bro gives the first quest (his sword and shield)", !!talked && accepted && armed.tut1, { talked, landed, accepted, armed });
  /* ── 8b. the way to Frost Ridge's monsters ── */
  const frostAt = { x: WHEEL_SPAWNS.frost.anchor[0], y: WHEEL_SPAWNS.frost.anchor[1] };
  await P.page.waitForTimeout(600);
  const w1 = await way(P);
  rec.ok('with his quest the way leads to the middle of Frost Ridge\'s monsters, and the minimap\'s star waits at its edge that way',
    !!w1.road && !!w1.road.to && w1.road.to.zoneId === 'frost' && near(w1.road.to, frostAt)
    && !!w1.star && w1.star.zoneId === 'frost' && w1.star.edge === true, { w1, frostAt });
  rec.ok('...its gold road running from you toward them', !!w1.star && !!w1.star.road && w1.star.road.len > 30 && roadToward(w1, frostAt), { star: w1.star, me: w1.me, frostAt });
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/wheelhome-road-frost.png` }).catch(() => {});
  const out = { x: cx + ux * (WHEEL_SAFE_R + 150), y: cy + uy * (WHEEL_SAFE_R + 150) };
  await H.hopTo(P, out.x, out.y, { tries: 80 });
  await P.page.waitForTimeout(800);
  const free = await at(P);
  rec.ok(`...and with it they walk out onto Frost Ridge's land (${r(free)} px from the middle)`, r(free) > WHEEL_SAFE_R && free.zone === 'wheel', free);
  /* ...walk on among them: there the road stops -- you hunt, you don't travel */
  await H.hopTo(P, frostAt.x + 120, frostAt.y + 120, { tries: 80 });
  await P.page.waitForTimeout(600);
  const w2 = await way(P);
  rec.ok('...and among them the road stops (you hunt there, you don\'t travel), the star with it', !!w2.road && w2.road.to === null && w2.star === null, w2);

  /* ── 4. dying out there ── */
  const gob = WHEEL_SPAWNS.ember.points[0];
  await H.hopTo(P, gob[0], gob[1] + 40, { tries: 120 });
  let died = false;
  const tDie = Date.now();
  while (Date.now() - tDie < 120000) {
    const s = await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (S._dying) return { dying: true };
      const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
      let best = null, bd = Infinity;
      for (const m of live) { const d = Math.hypot(m.x - S.player.x, m.y - S.player.y); if (d < bd) { bd = d; best = m; } }
      return { dying: false, best: best ? { x: best.x, y: best.y, d: bd } : null };
    });
    if (s.dying) { died = true; break; }
    if (s.best) await H.hopTo(P, s.best.x + 10, s.best.y, { tries: s.best.d > 150 ? 20 : 2, step: 80 });
    else await P.page.waitForTimeout(400);
  }
  const back = [], townSeen = [];
  let after = null;
  if (died) {
    for (let i = 0; i < 240; i++) {
      after = await at(P);
      if (!back.length || back[back.length - 1] !== after.zone) back.push(after.zone);
      if (after.zone === 'town') townSeen.push({ npcN: after.npcN, npcFar: after.npcFar });
      if (WHEELISH(after.zone) && !after.loading && !after.dying && back.includes('town')) break;
      await P.page.waitForTimeout(500);
    }
    await P.page.waitForTimeout(1500);
    after = await at(P);
  }
  rec.ok(`dying out there brings them back in the Wheel's Brotown, not today's town (${back.join(' -> ')}, ${after ? r(after) : '?'} px from the middle)`,
    died && !!after && after.zone === 'wheel' && r(after) < 600, { died, back, after });
  rec.ok(`...and on the way through, today's town has its own townsfolk, not the Wheel's Mayor at the Wheel's coordinates (${townSeen.length} looks)`,
    townSeen.length > 0 && !townSeen.some((t) => t.npcFar), townSeen);

  /* ── 5. the marker to today's town ── */
  const exit = await P.page.evaluate(() => {
    const S = window._gameState.current;
    for (let y = 0; y < S.map.length; y++) { const row = S.map[y]; const x = row.indexOf(8); if (x >= 0) return { tx: x, ty: y }; }
    return null;
  });
  let inTown = null;
  if (exit) {
    await H.hopTo(P, exit.tx * 32 + 16 + 200, exit.ty * 32 + 16, { step: 200, tries: 60 });
    await H.hopTo(P, exit.tx * 32 + 16 + 40, exit.ty * 32 + 16, { tries: 20 });
    for (let i = 0; i < 60; i++) { inTown = await at(P); if (inTown.zone === 'town' && !inTown.loading) break; await P.page.waitForTimeout(500); }
    await P.page.waitForTimeout(5000);
    inTown = await at(P);
  }
  rec.ok("the marker beside where they land still leads to today's town -- and they stay there",
    !!exit && !!inTown && inTown.zone === 'town', { exit, inTown });
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));

  /* ── 6. ?trial=off ── */
  const Q = await H.newPlayer(browser, { name: 'Oldtimer', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'trial=off' });
  await H.enterWorld(Q);
  await Q.page.waitForTimeout(6000);
  const q = await Q.page.evaluate(() => ({ zone: window._gameState.current.currentZone, trial: !!window.__btWorldTrial }));
  rec.ok('with ?trial=off: today\'s town, and the old World View, as before', q.zone === 'town' && !q.trial, q);
}
