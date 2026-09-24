/* ═══ THE BOW SPECIAL AS A VOLLEY, ON A REAL WORKER (v2.3.2848) ═══
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
 *
 * v2.3.2849 (docs/specs/specials-rebalance.md): each arrow is two-thirds of a
 * special now (BOW_VOLLEY_WORTH), and a volley burns for 2.5 s -- FOUR ticks,
 * where the lone arrow's 4 s gave seven.  So the burn here is 3-5 ticks, and
 * the last one lands inside the 2.5 s.
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
      /* v2.3.2849: Desert Winds first -- its mummies and skeletons outlast
         the rebalanced volley (~57 up front), where every Frost Ridge monster
         has 69 HP and dies before the burn has ticked twice */
      spoke: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'sky') || f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'frost')
        || f.WORLDVIEW_EXITS.find((e) => e.zoneId !== 'town') || null,
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

  /* Close to the TOUGHEST monster and aimed at it (hop in: the worker drops a
     long jump), then lock it, the way a tap does.  v2.3.2849: the toughest,
     not the nearest -- the rebalanced volley lands ~57 up front, and a 69 HP
     frost monster died to the arrows and the first tick, which ended the burn
     the checks below count (seen in a merged run). */
  const target = await A.page.evaluate(() => {
    const S = window._gameState.current;
    let best = null, bh = -1;
    for (const m of S.monsters || []) {
      if (!m || !m.alive) continue;
      const hp = Number(m.maxHp || m.hp || 0);
      if (hp > bh) { bh = hp; best = m; }
    }
    return best ? { id: best.id, x: best.x, y: best.y, maxHp: bh } : null;
  });
  console.log('    target: ' + JSON.stringify(target));
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
  rec.ok(`one press looses three arrows, each carrying part:3 (${JSON.stringify(fired)})`,
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
  /* The FIRST THREE answers, in arrival order: the worker handles one
     socket's messages in order, and the three specials were sent before the
     first burn tick (~500 ms), so their monster_hits come back first.  Timed
     against 1500 ms, not 450: a loaded box's worker has been seen answering
     400 ms after a send (merged batch run).  That the special lane ADMITS all
     three is pinned exactly in combat-lifecycle section 12. */
  const volleyHits = hitsIn.filter((h) => h.attackerId === aId && specIds.has(h.monsterId) && !h.collision && !h.splash
    && h.at >= firstSpecAt).slice(0, 3).filter((h) => h.at - firstSpecAt < 1500);
  console.log('    worker hits (the first three answers): ' + JSON.stringify(volleyHits.map((h) => ({ dt: h.at - firstSpecAt, dmg: h.dmg, slot: h.slot }))));
  rec.ok(`the worker settles all three (${volleyHits.length} monster_hit, ${volleyHits.map((h) => h.dmg).join(' + ')})`,
    volleyHits.length === 3 && volleyHits.every((h) => h.dmg >= 1 && h.slot === 'ranged'), volleyHits);

  /* The burn: ordinary hits, 500 ms apart, from one arrow.  Three burning
     would send three per half second; the worker's normal lane would then
     drop two of them, and the sends would say so.  v2.3.2849: four of them,
     over the volley's 2.5 s (the lone arrow's 4 s sent seven). */
  const gaps = ticks.slice(1).map((o, i) => o.at - ticks[i].at);
  /* A burn only runs while its monster lives.  Every monster on the spokes
     this reaches has ~60-70 HP, and the rebalanced volley lands ~57 before the
     first tick, so the target usually dies on the burn's first or second tick
     -- then what is checked is that the burn STOPS with it (a burn ticking on
     a corpse would be the bug).  The four-tick count itself is pinned on a
     1e6 HP skeleton in mp-hotarrow. */
  const deathAt = (hitsIn.find((h) => h.monsterId === target.id && h.hpPct === 0) || {}).at || null;
  if (deathAt && ticks.length < 3) {
    const afterDeath = ticks.filter((o) => o.at > deathAt + 150);
    rec.ok(`the burn stops with its monster: ${ticks.length} tick(s) before the ${target.maxHp} HP target died, none after`,
      afterDeath.length === 0 && ticks.every((o) => o.payload.noKb === true), { ticks: ticks.map((o) => o.at - deathAt), deathAt });
  } else {
    rec.ok(`ONE burn: ${ticks.length} noKb ticks, ~500 ms apart (gaps ${gaps.join(', ')})`,
      ticks.length >= 3 && ticks.length <= 5 && ticks.every((o) => o.payload.noKb === true) && gaps.every((g) => g >= 400),
      { n: ticks.length, gaps });
  }
  const lastTick = ticks.length ? ticks[ticks.length - 1].at - firstSpecAt : null;
  rec.ok(`...and it is the volley's 2.5 s burn, not the old 4 s (last tick ${lastTick} ms after the first arrow)`,
    lastTick != null && lastTick < 2700, { lastTick });

  const blasts = out.filter((o) => o.type === 'arrow_blast');
  const why = (await H.adminPlayer(wsPort, aId).catch(() => ({}))).live || {};
  rec.ok('nothing asks for a blast, and the worker refused none', blasts.length === 0 && !why.arrowBlast,
    { blasts: blasts.length, refusals: why.arrowBlast || null });
  const left = await H.readState(A, (S) => (S.arrows || []).filter((a) => a.isSpecial && !a.isStaff).length);
  rec.ok('...and the arrows have burnt out and gone', left === 0, left);

  await A.ctx.close().catch(() => {});
}
