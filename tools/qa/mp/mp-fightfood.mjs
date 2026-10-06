/* FOOD THAT COUNTS IN A FIGHT -- v2.3.3117 (docs/specs/fight-food.md).
 *
 * Owner: "Farming needs a purpose. I think the best purpose it can serve are
 * temporary buffs (boss fights, PvP, dueling, etc)".
 *
 * Two players, a real duel in town, the real UI:
 *
 *   1. THE BREW IS THE WORKER'S.  Before a Fury Tonic, A's swings claim
 *      their damage with `nb: 1` and the worker's pvp_hit carries that claim
 *      unchanged; after A drinks one, the claims stay brew-free and every
 *      pvp_hit carries twice the claim -- the worker's own brew, put on once.
 *   2. A SPECIAL SWING STAYS AN ORDINARY CLAIM (review): no `special` flag,
 *      so the worker's ordinary lane still gives it at most two hits -- the
 *      flag put it in the special lane, three hits at the special's ceiling.
 *   3. ONE BITE AT A TIME.  B, hurt, eats a Garden Stew from the bag: it
 *      heals.  The second, right after, is held back on B's own screen --
 *      "Eat again in Ns" -- and the worker never hears of it.  And a page that
 *      does not hold it back (its pvpheal cap knocked off by hand, as an old
 *      page would be) has its bite refused by the worker and the stew put back
 *      -- and the worker says why ("Eat again in Ns", eat_refused).
 *
 * The duel steps (arming, challenge, closing in, aiming) are mp-duel's.
 */
import * as H from './harness.mjs';

/* ── from mp-duel.mjs: walk A until the SERVER agrees they are in reach ── */
async function closeIn(A, wsPort, aId, bId, want = 34) {
  for (let i = 0; i < 14; i++) {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    if (!pa || !pb) return { ok: false, why: 'no server state' };
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const d = Math.hypot(dx, dy);
    if (d <= want) return { ok: true, d: Math.round(d) };
    const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w');
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(Math.min(500, Math.max(90, (d - want) * 2.2)));
    await A.page.keyboard.up(key);
    await A.page.waitForTimeout(320);
  }
  const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
  return { ok: false, d: pa && pb ? Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y)) : null };
}

/* ── from mp-duel.mjs: aim A's swing at B on the live canvas and press ── */
async function swingAt(A, times) {
  for (let i = 0; i < times; i++) {
    const pt = await A.page.evaluate(() => {
      const S = window._gameState.current;
      const o = S.others && S.others[Object.keys(S.others)[0]];
      if (!o || !S.camera) return null;
      const ox = o.x != null ? o.x : o.renderX, oy = o.y != null ? o.y : o.renderY;
      const th = Math.atan2(oy - S.player.y, ox - S.player.x);
      const cv = document.querySelector('canvas.brotown-canvas');
      const r = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
      const scX = S._worldScaleX || 1, scY = S._worldScaleY || 1;
      const px = (S.player.x - S.camera.x) * scX, py = (S.player.y - S.camera.y) * scY;
      const c = Math.cos(th) * scX, s = Math.sin(th) * scY;
      const dashH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 135;
      const bottom = Math.min(r.height, innerHeight - dashH - r.top);
      const lim = (comp, toLow, toHigh) => Math.abs(comp) < 1e-3 ? Infinity : (comp > 0 ? toHigh : toLow) / Math.abs(comp);
      const R = Math.max(40, Math.min(180, lim(c, px - 24, r.width - 24 - px), lim(s, py - 24, bottom - 16 - py)));
      return { sx: r.left + px + c * R, sy: r.top + py + s * R };
    });
    if (!pt) return false;
    await A.page.mouse.move(pt.sx, pt.sy);
    await A.page.waitForTimeout(80);
    await A.page.mouse.down();
    await A.page.waitForTimeout(280);
    await A.page.mouse.up();
    await A.page.waitForTimeout(420);
  }
  return true;
}

/* Each pvp_hit A threw, matched to the claim that made it.  A held press can
   send two swings, and the next can leave before the last one's hit comes
   back, so "the send just before" is not always its own -- match by VALUE
   instead: a claim within the last 2 s that the hit is exactly k times.  The
   claims are floats off a random roll, so an exact match is no coincidence. */
async function claimsAndHits(A, aId, since, k) {
  return A.page.evaluate(({ me, t0, k }) => {
    const sends = (window.__ffSends || []).filter((s) => s.at >= t0);
    const hits = ((window.__btFightFood && window.__btFightFood.hits) || []).filter((h) => h.attacker === me && h.at >= t0);
    const pairs = [];
    for (const h of hits) {
      const near = sends.filter((s) => s.at <= h.at && h.at - s.at < 2000);
      const own = near.find((s) => Math.abs(h.dmgBase - s.dmgBase * k) < 1e-6);
      pairs.push({ hit: h.dmgBase, matched: !!own, nb: own ? own.nb : null, claim: own ? own.dmgBase : null });
    }
    return { sends: sends.length, hits: hits.length, pairs };
  }, { me: aId, t0: since, k });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Brewer', nameB: 'Eater' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  const caps = await H.readState(A, (S) => ({ brew: !!(S._serverCaps && S._serverCaps.pvpbrew), heal: !!(S._serverCaps && S._serverCaps.pvpheal) }));
  rec.ok('the worker advertises both rules (caps.pvpbrew, caps.pvpheal)', caps.brew && caps.heal, caps);

  /* Arm both, mp-duel's way: tut_1 pays a greatsword, the worker equips it. */
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
    });
  }
  await A.page.waitForTimeout(1500);
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      const R = S && S.rpg; if (!R || !S.channel) return;
      const i = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
      if (i < 0) return;
      R.weapon = R.weaponStash[i]; R.weaponStash.splice(i, 1); R.activeSlot = 'melee';
      S.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot: 'weapon' } });
    });
  }
  await A.page.waitForTimeout(1500);
  const armed = await Promise.all([H.adminPlayer(wsPort, aId), H.adminPlayer(wsPort, bId)])
    .then((r) => r.every((x) => x && x.rpg && x.rpg.weapon)).catch(() => false);
  rec.ok('both duellists are armed (guard)', armed);

  /* A's claims, as sent. */
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    window.__ffSends = [];
    const orig = S.channel.send.bind(S.channel);
    S.channel.send = (m) => {
      try {
        if (m && m.event === 'player_attack' && m.payload) {
          window.__ffSends.push({ at: Date.now(), dmgBase: m.payload.dmgBase, nb: m.payload.nb, special: m.payload.special });
        }
      } catch (e) { /* never break the game */ }
      return orig(m);
    };
  });

  /* The duel. */
  await H.openInspect(A, bId);
  await H.clickText(A, 'Duel');
  const sawAccept = await H.waitUi(B, () => [...document.querySelectorAll('button')]
    .some((b) => b.textContent.trim() === 'Accept'), { label: 'B sees Accept', timeout: 20000 })
    .then(() => true).catch(() => false);
  rec.ok('the challenge reaches B (guard)', sawAccept);
  if (!sawAccept) { await A.ctx.close(); await B.ctx.close(); return; }
  await H.clickText(B, 'Accept');
  await B.page.waitForTimeout(2000);
  const inDuel = await Promise.all([H.readState(A, (S) => !!S._inDuel), H.readState(B, (S) => !!S._inDuel)]);
  rec.ok('both are in the duel (guard)', inDuel[0] && inDuel[1], inDuel);

  /* B cannot die while A swings: god mode zeroes the damage, and the pvp_hit
     still carries the worker's dmgBase, which is the number this reads. */
  await H.devOp(wsPort, 'vitals', bId, { god: true, godMinutes: 10 });
  const near = await closeIn(A, wsPort, aId, bId);
  rec.ok('A walks into reach (guard)', near.ok, near);

  /* ── 1a. no brew: the claim comes back as it went ── */
  const t0 = await H.readState(A, () => Date.now());
  await swingAt(A, 6);
  await A.page.waitForTimeout(800);
  const plain = await claimsAndHits(A, aId, t0, 1);
  rec.ok('A\'s swings land (guard)', plain.pairs.length >= 2, { sends: plain.sends, hits: plain.hits });
  rec.ok('with no brew the worker resolves each hit at exactly its claim (x1)',
    plain.pairs.length > 0 && plain.pairs.every((p) => p.matched), plain.pairs);
  rec.ok('...and every claim says nb:1 -- "the worker puts my brew on"', plain.pairs.length > 0 && plain.pairs.every((p) => p.nb === 1), plain.pairs);

  /* ── 1b. a Fury Tonic: the worker doubles it, once ── */
  await H.grant(wsPort, aId, 'item', { invKey: 'whetstone', count: 1 });
  await A.page.waitForTimeout(1200);
  await A.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'potion_drink', payload: { invKey: 'whetstone' } }); });
  const brewed = await H.waitFor(A, (S) => ({ mul: S._dmgBuffMul || 0, ms: S._dmgBuff ? S._dmgBuff - Date.now() : 0 }),
    (v) => v.mul === 2 && v.ms > 0, { timeout: 8000, label: 'the tonic is on' }).catch(() => null);
  const srvBuffs = ((await H.adminPlayer(wsPort, aId)) || {}).rpg || {};
  rec.ok('A drinks a Fury Tonic: x2 on the worker and on A\'s screen (guard)', !!brewed && srvBuffs._buffs && srvBuffs._buffs.damageMul === 2,
    { brewed, server: srvBuffs._buffs });
  const t1 = await H.readState(A, () => Date.now());
  await swingAt(A, 6);
  await A.page.waitForTimeout(800);
  const fury = await claimsAndHits(A, aId, t1, 2);
  rec.ok('under the tonic the worker resolves every hit at exactly TWICE a claim -- its own brew',
    fury.pairs.length > 0 && fury.pairs.every((p) => p.matched), fury.pairs);
  rec.ok('...the claims carry nb:1, WITHOUT the brew (it came back out on the page)', fury.pairs.length > 0 && fury.pairs.every((p) => p.nb === 1), fury.pairs);
  const avgPlain = plain.pairs.reduce((a, p) => a + (p.claim || 0), 0) / Math.max(1, plain.pairs.length);
  const avgFury = fury.pairs.reduce((a, p) => a + (p.claim || 0), 0) / Math.max(1, fury.pairs.length);
  rec.ok('...the claims the same size as before the tonic, so the brew is on ONCE (not x4)',
    avgFury > 0 && avgFury < avgPlain * 1.5, { avgPlain, avgFury });

  /* ── 2. a special swing stays an ordinary claim ── */
  await H.devOp(wsPort, 'vitals', aId, {}).catch(() => {});   /* a full bar of mana for the specials */
  /* Locked on B, so the swing's claim is aimed at B (monsterCombat's pvpAngle). */
  await A.page.evaluate((bid) => {
    const S = window._gameState.current;
    if (S.rpg) S.rpg.mana = S.rpg.maxMana || 100;
    S._lastSwipe = 0;
    const o = S.others && S.others[bid];
    if (o) S.lockedTarget = { type: 'player', id: bid, ref: o };
  }, bId);
  const swingsAt = [];
  for (let i = 0; i < 3; i++) {
    swingsAt.push(await H.readState(A, () => Date.now()));
    await H.callFn(A, 'specialAttack').catch(() => {});
    await A.page.waitForTimeout(1700);
  }
  const sp = await A.page.evaluate(({ me, ts }) => {
    const hits = ((window.__btFightFood && window.__btFightFood.hits) || []).filter((h) => h.attacker === me);
    const sends = (window.__ffSends || []).filter((s) => s.at >= ts[0]);
    /* The ordinary lane is one hit per 300 ms: at most two inside 550 ms. */
    return { sends: sends.length, flagged: sends.filter((s) => s.special === true).length,
      perSwing: ts.map((t) => hits.filter((h) => h.at >= t && h.at < t + 550).length) };
  }, { me: aId, ts: swingsAt });
  rec.ok('a special SWING is claimed as an ordinary one -- no special flag (the special lane gave it three hits)',
    sp.sends > 0 && sp.flagged === 0, sp);
  rec.ok(`...and lands at most two hits a swing, as before (${sp.perSwing.join(', ')})`,
    sp.perSwing.some((n) => n > 0) && sp.perSwing.every((n) => n <= 2), sp);

  /* ── 3. one bite at a time ── */
  await H.devOp(wsPort, 'vitals', bId, { god: false });
  await H.devOp(wsPort, 'vitals', bId, { hp: 30 });
  await H.grant(wsPort, bId, 'item', { invKey: 'meal_garden_stew', count: 3 });
  await B.page.waitForTimeout(1500);
  const bagEat = async (P, key) => {
    await P.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) {} });
    await P.page.waitForTimeout(900);
    const tile = await P.page.$(`[data-inv-key="${key}"]`);
    if (!tile) return { tile: false };
    await tile.dispatchEvent('pointerup');
    await P.page.waitForTimeout(700);
    const btn = await P.page.$('button:text-is("Eat")');
    if (btn) await btn.click();
    const seen = [];
    for (let i = 0; i < 8; i++) {
      for (const t of await H.readState(P, (S) => (S.dmgNumbers || []).map((p) => String(p.text)))) seen.push(t);
      await P.page.waitForTimeout(120);
    }
    await P.page.evaluate(() => {
      try { window._itemDetailBus.close(); } catch (e) {}
      try { window.__broDashPanelBus.clear(); } catch (e) {}
    });
    await P.page.waitForTimeout(500);
    return { tile: true, btn: !!btn, popups: [...new Set(seen)] };
  };
  const srvStew = async () => ((((await H.adminPlayer(wsPort, bId)) || {}).rpg || {}).inventory || {}).meal_garden_stew || 0;
  const srvHp = async () => (((await H.adminPlayer(wsPort, bId)) || {}).rpg || {}).hp;

  const hp0 = await srvHp();
  const first = await bagEat(B, 'meal_garden_stew');
  await B.page.waitForTimeout(800);
  const hp1 = await srvHp();
  const left1 = await srvStew();
  rec.ok(`in the duel, B's first stew heals (${hp0} -> ${hp1}) and is used up`, first.btn && hp1 > hp0 && left1 === 2, { first, hp0, hp1, left1 });

  await H.devOp(wsPort, 'vitals', bId, { hp: 30 });
  await B.page.waitForTimeout(800);
  const second = await bagEat(B, 'meal_garden_stew');
  await B.page.waitForTimeout(800);
  const left2 = await srvStew();
  const hp2 = await srvHp();
  rec.ok('the second, right after, is held back on B\'s screen: "Eat again in Ns"',
    second.btn && second.popups.some((t) => /^Eat again in \d+s$/.test(t)), second);
  rec.ok('...and the worker never ate it (the stew still there, no heal)', left2 === 2 && hp2 <= 31, { left2, hp2 });
  const clientLeft = await H.readState(B, (S) => ((S.rpg && S.rpg.inventory) || {}).meal_garden_stew || 0);
  rec.ok('...and B\'s bag still shows it', clientLeft === 2, { clientLeft });

  /* A page that does not hold it back (an old page): the worker refuses, and
     its resend puts the stew back in the bag the page took it from. */
  await B.page.evaluate(() => { const S = window._gameState.current; if (S._serverCaps) S._serverCaps.pvpheal = false; });
  const forced = await bagEat(B, 'meal_garden_stew');
  await B.page.waitForTimeout(1500);
  const left3 = await srvStew();
  const back = await H.waitFor(B, (S) => ((S.rpg && S.rpg.inventory) || {}).meal_garden_stew || 0, (n) => n === 2,
    { timeout: 6000, label: 'the stew comes back' }).then(() => true).catch(() => false);
  rec.ok('a page that eats anyway is refused by the WORKER: the stew is still on its books', forced.btn && left3 === 2, { forced, left3 });
  rec.ok('...and the worker says why: "Eat again in Ns" over B (eat_refused)',
    forced.popups.some((t) => /^Eat again in \d+s$/.test(t)), forced.popups);
  rec.ok('...and the refusal puts it back in that page\'s bag', back);
  await B.page.evaluate(() => { const S = window._gameState.current; if (S._serverCaps) S._serverCaps.pvpheal = true; });

  await A.ctx.close();
  await B.ctx.close();
}
