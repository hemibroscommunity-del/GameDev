/* ═══ THE BOW SPECIAL AS A VOLLEY, ON A REAL WORKER (v2.3.2808) ═══
 *
 * Owner: "the bow special should be 3 white hot arrows that follow each other
 * closely.  One shot for all 3 arrows" -- "a third each" -- "Burn, but no
 * blast".  (src/game/bowVolley.js, server/src/combat.js `part`.)
 *
 * mp-hotarrow proves the picture and the client's own bookkeeping in town,
 * where no monster belongs to the worker.  This is the half where the damage
 * is SETTLED: a worker zone, a bow the WORKER knows is equipped, and the
 * special fired at one of its monsters.  The witnesses are the two wires:
 *   OUT  three special monster_damage, each saying part:3 (the worker divides
 *        its own roll by it), and noKb on every arrow after the first into the
 *        same monster -- the volley shoves once;
 *   IN   the worker settles all three as monster_hit -- its special lane (3 per
 *        1200 ms per monster) admits the whole volley;
 *   and the burn: ordinary noKb ticks every 500 ms from ONE arrow, not three,
 *   and nothing at all asks for the retired blast.
 * The division itself is pinned exactly in server/test/combat-lifecycle
 * (section 12); a live roll varies, so this does not re-measure it.
 */
import * as H from './harness.mjs';

const TILE = 32;
const PHONE = { width: 390, height: 844 };

/* Record what the worker SENDS BACK: every monster_hit, however it arrives
   (on its own or inside a tick's event batch), with the time it came. */
const WIRE_IN = `(() => {
  const Orig = window.WebSocket;
  if (!Orig || Orig.__btWrapped) return;
  const scan = (m) => {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'monster_hit' && m.payload) (window.__btHitsIn = window.__btHitsIn || []).push(Object.assign({ at: Date.now() }, m.payload));
    if (Array.isArray(m.events)) for (const e of m.events) scan(e);
  };
  function W(url, protocols) {
    const ws = protocols === undefined ? new Orig(url) : new Orig(url, protocols);
    ws.addEventListener('message', (ev) => { try { scan(JSON.parse(ev.data)); } catch (e) { /* not ours */ } });
    return ws;
  }
  W.prototype = Orig.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) W[k] = Orig[k];
  W.__btWrapped = true;
  window.WebSocket = W;
})();`;

const stand = (P, tx, ty) => P.page.evaluate(({ x, y, t }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = x * t + t / 2; S.player.y = y * t + t / 2;
  return true;
}, { x: tx, y: ty, t: TILE });

const dev = (wsPort, op, body) => fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/${op}`, {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).catch(() => {});

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort, viewport: PHONE, touch: true, init: WIRE_IN });
  await H.enterWorld(A);
  await A.page.waitForTimeout(2000);
  const aId = await H.readState(A, (S) => S.myId);
  const caps = await H.readState(A, (S) => !!((S._serverCaps || {}).bowvolley));
  rec.ok('the worker advertises the volley (caps.bowvolley; guard)', caps, caps);

  /* Out to a zone the WORKER owns monsters in (mp-arrowblast's route). */
  await dev(wsPort, 'unlock', { playerId: aId });
  await A.page.waitForTimeout(1200);
  const marks = await A.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.TOWN_EXITS || !f.WORLDVIEW_EXITS) return null;
    return {
      townExit: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview') || null,
      spoke: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'frost') || f.WORLDVIEW_EXITS.find((e) => e.zoneId !== 'town') || null,
    };
  });
  if (!marks || !marks.townExit || !marks.spoke) {
    rec.skip('the volley settles on the worker', 'no exit tables on the _gameFns bridge');
    await A.ctx.close(); return;
  }
  const travel = async (tx, ty, zoneId) => {
    for (let i = 0; i < 6; i++) {
      await stand(A, tx, ty);
      const got = await H.waitFor(A, (S) => S.currentZone, (z) => z === zoneId, { timeout: 6000 }).catch(() => null);
      if (got === zoneId) return true;
    }
    return (await H.readState(A, (S) => S.currentZone)) === zoneId;
  };
  await travel(marks.townExit.tx, marks.townExit.ty, 'worldview');
  await travel(marks.spoke.tx, marks.spoke.ty, marks.spoke.zoneId);
  await H.waitFor(A, (S) => (S.monsters || []).filter((m) => m.alive).length, (n) => n >= 1, { timeout: 20000 }).catch(() => {});
  await H.waitFor(A, (S) => !S._zoneLoading, (v) => v, { timeout: 20000 }).catch(() => {});

  /* A real bow on the WORKER (the kit, then the game's own equip), mana, and
     the Test panel's god mode so the archer outlives the four-second burn
     (death clears S.arrows, and the burn with it). */
  await dev(wsPort, 'kit', { playerId: aId, what: 'weapons' });
  await A.page.waitForTimeout(1800);
  const eq = await H.equipWeapon(A, 'bow', 'rangedWeapon', 'ranged');
  await A.page.waitForTimeout(1500);
  await dev(wsPort, 'vitals', { playerId: aId, heal: true, god: true });
  await A.page.evaluate(() => { const R = window._gameState.current.rpg; if (R) R.mana = R.maxMana; });
  await A.page.waitForTimeout(600);
  const world = await H.readState(A, (S) => ({
    zone: S.currentZone, srv: !!S._serverMonsters, slot: S.rpg && S.rpg.activeSlot,
    bow: !!(S.rpg && S.rpg.rangedWeapon && S.rpg.rangedWeapon.type === 'bow'),
    mons: (S.monsters || []).filter((m) => m.alive).length,
  }));
  rec.ok('the archer is in a worker-owned monster zone, bow out (guard)',
    world.srv && world.slot === 'ranged' && world.bow && world.mons >= 1, { world, eq });
  if (!world.srv || !world.mons) { await A.ctx.close(); return; }

  /* Close to the nearest monster and aimed at it (hop in: the worker drops a
     long jump), then lock it, the way a tap does. */
  const target = await A.page.evaluate(() => {
    const S = window._gameState.current;
    let best = null, bd = Infinity;
    for (const m of S.monsters || []) {
      if (!m || !m.alive) continue;
      const d = Math.hypot(m.x - S.player.x, m.y - S.player.y);
      if (d < bd) { bd = d; best = m; }
    }
    return best ? { id: best.id, x: best.x, y: best.y } : null;
  });
  await H.hopTo(A, target.x - 150, target.y);
  await A.page.evaluate((id) => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((q) => q && q.id === id);
    if (!m) return;
    S.lockedTarget = { ref: m, type: 'monster', src: 'tap', ts: Date.now() };
    S._aimAngle = Math.atan2(m.y - S.player.y, m.x - S.player.x); S._lastAimAngle = S._aimAngle;
  }, target.id);

  /* Watch the wire out: every send, with its payload. */
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    if (window.__btOut) return;
    window.__btOut = [];
    const orig = S.channel.send.bind(S.channel);
    S.channel.send = (m) => {
      try { window.__btOut.push({ at: Date.now(), type: m && (m.event || m.type), payload: m && m.payload ? JSON.parse(JSON.stringify(m.payload)) : null }); } catch (e) { /* never break the game */ }
      return orig(m);
    };
  });
  const t0 = await A.page.evaluate(() => { window.__btHitsIn = []; window.__btOut.length = 0; return Date.now(); });
  await A.page.evaluate(() => { try { window._gameFns.specialAttack(); } catch (e) { /* reported below */ } });
  const fired = await H.readState(A, (S) => (S.arrows || []).filter((a) => a.isSpecial && !a.isStaff)
    .map((a) => ({ part: a.part, dmg: a.dmg, delay: Math.round(a.launchDelayMs || 0) })));
  rec.ok(`one press looses three arrows, each a third (${JSON.stringify(fired)})`,
    fired.length === 3 && fired.every((a) => a.part === 3), fired);

  /* Let the volley land, burn its four seconds and burn out. */
  await A.page.waitForTimeout(5600);
  const out = await A.page.evaluate(() => window.__btOut.slice());
  const hitsIn = await A.page.evaluate(() => (window.__btHitsIn || []).slice());
  const md = out.filter((o) => o.type === 'monster_damage');
  const specials = md.filter((o) => o.payload && o.payload.special);
  const ticks = md.filter((o) => o.payload && !o.payload.special);
  console.log('    specials out: ' + JSON.stringify(specials.map((o) => ({ dt: o.at - t0, id: o.payload.monsterId, part: o.payload.part, noKb: !!o.payload.noKb }))));
  console.log('    ticks out:    ' + JSON.stringify(ticks.map((o) => o.at - t0)));
  rec.ok(`three special hits go out, each part:3 (${specials.length} sent)`,
    specials.length === 3 && specials.every((o) => o.payload.part === 3 && o.payload.slot === 'ranged'), specials.map((o) => o.payload));
  const seen = new Set();
  const kbRight = specials.every((o) => {
    const first = !seen.has(o.payload.monsterId);
    seen.add(o.payload.monsterId);
    return first ? !o.payload.noKb : o.payload.noKb === true;
  });
  rec.ok('the volley shoves once: noKb on every arrow after the first into the same monster', kbRight,
    specials.map((o) => ({ id: o.payload.monsterId, noKb: !!o.payload.noKb })));

  const specIds = new Set(specials.map((o) => o.payload.monsterId));
  const firstSpecAt = specials.length ? specials[0].at : t0;
  const volleyHits = hitsIn.filter((h) => h.attackerId === aId && specIds.has(h.monsterId) && !h.collision && !h.splash
    && h.at >= firstSpecAt && h.at - firstSpecAt < 450);
  console.log('    worker hits (first 450 ms): ' + JSON.stringify(volleyHits.map((h) => ({ dt: h.at - firstSpecAt, dmg: h.dmg, slot: h.slot }))));
  rec.ok(`the worker settles all three (${volleyHits.length} monster_hit, ${volleyHits.map((h) => h.dmg).join(' + ')})`,
    volleyHits.length === 3 && volleyHits.every((h) => h.dmg >= 1 && h.slot === 'ranged'), volleyHits);

  /* The burn: ordinary hits, 500 ms apart, from one arrow.  Three burning
     would send three per half second; the worker's normal lane would then
     drop two of them, and the sends would say so. */
  const gaps = ticks.slice(1).map((o, i) => o.at - ticks[i].at);
  rec.ok(`ONE burn: ${ticks.length} noKb ticks, ~500 ms apart (gaps ${gaps.join(', ')})`,
    ticks.length >= 5 && ticks.length <= 8 && ticks.every((o) => o.payload.noKb === true) && gaps.every((g) => g >= 400),
    { n: ticks.length, gaps });

  const blasts = out.filter((o) => o.type === 'arrow_blast');
  const why = (await H.adminPlayer(wsPort, aId).catch(() => ({}))).live || {};
  rec.ok('nothing asks for a blast, and the worker refused none', blasts.length === 0 && !why.arrowBlast,
    { blasts: blasts.length, refusals: why.arrowBlast || null });
  const left = await H.readState(A, (S) => (S.arrows || []).filter((a) => a.isSpecial && !a.isStaff).length);
  rec.ok('...and the arrows have burnt out and gone', left === 0, left);

  await A.ctx.close().catch(() => {});
}
