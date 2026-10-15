/* ═══ WHAT A HIT DOES TO A MONSTER, IT DOES TO A PLAYER, ON THREE PHONES (v2.3.3264) ═══
 *
 * Owner, 2026-10-15, asked whether the effects that still landed on monsters
 * only should reach players too: "Yes the monster only extras should work on
 * players too".  The worker does it (server/src/pvpextras.js; its rules and
 * numbers are server/test/pvp-extras.test.mjs).  This scenario checks the
 * join between the two halves on real pages -- the striker's page puts its
 * gem on the hit it reports, the worker strikes, and every screen carries it
 * out and draws it:
 *   1. a WIND gem in the striker's sword (set the way the Enchant window sets
 *      it, on the page) rides the page's own swing claim, and the target is
 *      SLOWED: the worker's pvp_hit says so, the target walks at 0.4, wears
 *      the "Slowed" chip, and the slow is drawn on them on all three screens;
 *   2. a FLAME gem BURNS: its ticks reach the target as ticks -- the flame on
 *      the number, the "Burning" chip -- the striker's numbers over them in
 *      the flame's colour, and the target's page sends no pvp_confirmed for a
 *      tick (a burn ticks eight times; the bookkeeping is the blow's);
 *   3. a SHIELD BASH at the player you are fighting (the duel's lock) DAZES
 *      them and SHOVES them away; a WHIRLWIND pulls them in;
 *   4. a PARRY: a shield raised just before a player's blow (a bash: see the
 *      step) STAGGERS the one who struck -- "Staggered!", and their next swing
 *      is refused on their own page (nothing sent) -- as a parried monster
 *      loses its swing;
 *   5. no page errors.
 * Three phones, a real duel in town (the consent that lets the hits land; the
 * rule is the same as No man's land's).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const FLAME = '#ff9a3c';

async function closeIn(A, wsPort, aId, bId, want = 40) {
  /* v2.3.3264: by the harness's hop (H.hopTo: the striker's own position
     moved in steps the worker's move check accepts), not by held keys -- a box
     drawing three phones runs each at 2-4 frames a second, where a held key
     walks ~15 px and twenty tries stopped 164 px short */
  for (let i = 0; i < 8; i++) {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    if (!pa || !pb) return { ok: false };
    const dx = pa.x - pb.x, dy = pa.y - pb.y;
    const d = Math.hypot(dx, dy);
    const tol = Math.max(8, want * 0.25);
    if (Math.abs(d - want) <= tol) return { ok: true, d: Math.round(d) };
    /* `want` px from them, on the side the striker stands (east if on top) */
    const ux = d > 1 ? dx / d : 1, uy = d > 1 ? dy / d : 0;
    await H.hopTo(A, pb.x + ux * want, pb.y + uy * want, { step: 60, gap: 300, tries: 30 });
    await A.page.waitForTimeout(500);
  }
  const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
  return { ok: false, d: pa && pb ? Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y)) : null };
}

/* The side of B with open ground for a shove: the first of east, west,
   south, north where nothing solid, no prop and no wall stands within
   `reach` px of B's feet (BroTown's own tests, __btIsSolid /
   __btPropFeetBlocked).  The striker stands on the OTHER side, so a shove
   away from them has somewhere to go -- in town a shove into a wall stops at
   it, as it should, and says nothing about the shove. */
const openSide = (B, reach = 130) => B.page.evaluate((reach) => {
  const S = window._gameState.current;
  const bx = S.player.x, by = S.player.y;
  for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let clear = true;
    for (let d = 10; d <= reach && clear; d += 10) {
      const x = bx + ux * d, y = by + uy * d;
      if ((window.__btIsSolid && window.__btIsSolid(x, y))
        || (window.__btPropFeetBlocked && window.__btPropFeetBlocked(bx + ux * (d - 10), by + uy * (d - 10), x, y))) clear = false;
    }
    if (clear) return { ux, uy, bx, by };
  }
  return null;
}, reach);

/* what a page sends, payloads and all (H.instrumentWire counts only) */
const tapWire = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.channel || S.channel.__xTap) return;
  const orig = S.channel.send.bind(S.channel);
  window.__btOut = [];
  S.channel.send = (m) => {
    try {
      window.__btOut.push({ at: Date.now(), type: m && m.type, event: m && m.event, payload: m && m.payload });
      if (window.__btOut.length > 600) window.__btOut.splice(0, 200);
    } catch (e) { /* never break the game */ }
    return orig(m);
  };
  S.channel.__xTap = true;
});
const sentSince = (P, t0, ev) => P.page.evaluate(({ t0, ev }) =>
  (window.__btOut || []).filter((m) => m.at >= t0 && (m.event === ev || m.type === ev)).map((m) => ({ at: m.at, payload: m.payload })), { t0, ev });

/* the worker's extras the page logged (gameEvents.js pvp_hit / parry, probe) */
const xLog = (P, t0) => P.page.evaluate((t0) => (window.__btPvpExtras || []).filter((e) => e.at >= t0 - 50), t0);
/* frames each status look was drawn (effectsRenderer, probe) */
const fxDrawn = (P) => P.page.evaluate(() => Object.assign({}, window.__btElemFxDrawn || {}));
/* every popup a page draws, kept as it appears (S.dmgNumbers lets each go
   after a second or two, and a burn's ticks run 4 s) */
const recordPops = (P) => P.page.evaluate(() => {
  if (window.__btPopRec) return;
  const seen = new WeakSet();
  window.__btPopLog = [];
  window.__btPopRec = setInterval(() => {
    const S = window._gameState && window._gameState.current;
    for (const d of (S && S.dmgNumbers) || []) {
      if (!d || seen.has(d)) continue;
      seen.add(d);
      window.__btPopLog.push({ at: Date.now(), text: String(d.text), color: d.color, icon: d.iconKey || null, taken: !!d.taken });
      if (window.__btPopLog.length > 500) window.__btPopLog.splice(0, 100);
    }
  }, 60);
});
const popsSince = (P, t0) => P.page.evaluate((t0) => (window.__btPopLog || []).filter((d) => d.at >= t0 - 50), t0);
const hasChip = (P, label) => P.page.evaluate((l) => !!document.querySelector('[data-chip="' + l + '"]'), label);
/* the chips poll the game every 150 ms and React draws them on the page's
   own (slow, here) frames: give one a moment */
const waitChip = async (P, label, ms = 3000) => {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    if (await hasChip(P, label)) return true;
    await P.page.waitForTimeout(120);
  }
  return false;
};

/* BT_PVPX_ONLY=24 runs steps 2 and 4 only (a run takes ~10 minutes here) */
const ONLY = String(process.env.BT_PVPX_ONLY || '1234');
const step = (n) => ONLY.indexOf(String(n)) >= 0;

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Striker', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Target', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(B);
  const C = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(C);
  const errors = [];
  for (const P of [A, B, C]) P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  await H.waitMutualSight(A, B);
  await H.waitMutualSight(C, B).catch(() => {});
  let alive = true;
  const keep = (async () => { while (alive) { for (const P of [A, B, C]) await P.page.keyboard.press('Control').catch(() => {}); await B.page.waitForTimeout(15000).catch(() => {}); } })();
  const done = async () => { alive = false; await keep.catch(() => {}); for (const P of [A, B, C]) await P.ctx.close().catch(() => {}); };

  const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.pvpextras));
  rec.ok('the worker strikes players with the extras (caps.pvpextras, guard)', caps);
  if (!caps) { await done(); return; }

  /* a sword and a shield for both (tut_1 pays both on accept) */
  for (const P of [A, B]) {
    await P.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
  }
  await A.page.waitForTimeout(1800);
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState.current; const R = S.rpg;
      if (!R.shield && (R.shieldStash || []).length) R.shield = R.shieldStash[0];
      if (R._quests) R._quests.tut_4 = 'turnedIn';   /* the onboarding coach covers the band (mp-duelblock) */
      /* ...and the worker told which shield is on the arm, as the bag's Equip
         does (shieldWear.js syncShieldWorn): a bash needs the worker's own */
      const sh = R.shield;
      if (sh && S._serverCaps && S._serverCaps.shieldwear) {
        S.channel.send({ type: 'shield_wear', payload: sh.gid ? { gid: sh.gid }
          : { sig: [sh.name || '', sh.gearBase || '', sh.tierMult == null ? '' : sh.tierMult, sh.tier || ''].join('|') } });
      }
    });
  }
  const sword = await A.page.evaluate(() => {
    const S = window._gameState.current; const R = S.rpg;
    if (!(R.weapon && /sword/.test(R.weapon.type || ''))) {
      const i = (R.weaponStash || []).findIndex((w) => w && /sword/.test(w.type || ''));
      if (i >= 0) S.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot: 'weapon' } });
    }
    S.channel.send({ type: 'set_active_slot', payload: { slot: 'melee' } });
    R.activeSlot = 'melee'; S._userCycledSlot = true;
    return true;
  });
  rec.ok('the striker holds a sword (guard)', sword);
  await A.page.waitForTimeout(800);

  /* the duel: A challenges, B accepts, through the real cards */
  await H.openInspect(A, bId);
  const canDuel = (await H.buttonTexts(A)).some((t) => /duel/i.test(t));
  rec.ok('the inspect card offers a Duel (guard)', canDuel);
  if (!canDuel) { await done(); return; }
  await H.clickText(A, 'Duel');
  const gotReq = await H.waitUi(B, () => [...document.querySelectorAll('button')].some((b) => /accept/i.test(b.textContent || '')),
    { label: 'duel request', timeout: 20000 }).then(() => true).catch(() => false);
  if (!gotReq) { rec.ok('B is asked to accept the duel (guard)', false); await done(); return; }
  await H.clickText(B, 'Accept');
  await A.page.waitForTimeout(2000);
  const inDuel = await H.readState(B, (S) => !!(S._inDuel || S._activeDuel));
  rec.ok('a duel is running (guard)', inDuel);
  if (!inDuel) { await done(); return; }
  let near = await closeIn(A, wsPort, aId, bId, 40);
  rec.ok(`the striker stands in a sword's reach (guard: ${near.d} px)`, near.d != null && near.d <= 110, near);
  for (const P of [A, B]) await tapWire(P);
  for (const P of [A, B, C]) await recordPops(P);

  const heal = async () => { await H.devOp(wsPort, 'vitals', aId, {}); await H.devOp(wsPort, 'vitals', bId, {}); };
  /* the striker's page, as the Enchant window leaves it (EnchantPanel.jsx sets
     element1 on the page's own weapon), and its lock on the duel opponent */
  const gem = (el) => A.page.evaluate((el) => { const S = window._gameState.current; if (S.rpg.weapon) S.rpg.weapon.element1 = el; return !!S.rpg.weapon; }, el);
  const lockB = () => A.page.evaluate((bId) => {
    const S = window._gameState.current; const o = S.others && S.others[bId];
    if (!o) return false;
    S.lockedTarget = { type: 'player', id: bId, ref: o, src: 'duel' };
    return true;
  }, bId);
  /* one real swing on the striker's page (the game's own swingAttack) */
  const swing = async () => { await lockB(); await H.callFn(A, 'swingAttack'); };
  /* where things stand, for a failure's report */
  const diag = async (t0) => {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    const a = await A.page.evaluate((bId) => { const S = window._gameState.current; const o = S.others && S.others[bId];
      return { inDuel: !!S._inDuel, lock: S.lockedTarget ? S.lockedTarget.type + ':' + S.lockedTarget.id : null,
        seen: o ? Math.round(Math.hypot((o.x != null ? o.x : o.renderX) - S.player.x, (o.y != null ? o.y : o.renderY) - S.player.y)) : null,
        stamina: S.rpg && Math.round(S.rpg.stamina), shieldUp: !!S._shieldUp, stagger: (S._staggerUntil || 0) - Date.now(),
        dazed: (S._dazeUntil || 0) - Date.now() }; }, bId);
    const b = await B.page.evaluate(() => { const S = window._gameState.current; return { inDuel: !!S._inDuel, hp: S.rpg && S.rpg.hp }; });
    const hits = await B.page.evaluate((t0) => ((window.__btFightFood && window.__btFightFood.hits) || []).filter((h) => h.at >= t0), t0);
    const claims = (await sentSince(A, t0, 'player_attack')).length;
    const abil = (await sentSince(A, t0, 'ability')).map((m) => m.payload);
    return { d: pa && pb ? Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y)) : null, a, b, hits, claims, abil };
  };
  /* swing until the target logs the status `st` (the worker rolls the hit, and
     a dodge carries none) */
  let lastDiag = null;
  async function swingFor(st, tries = 10) {
    for (let i = 0; i < tries; i++) {
      await H.devOp(wsPort, 'vitals', bId, {});   /* never a duel lost to the test's own swings */
      const t0 = Date.now();
      await swing();
      await A.page.waitForTimeout(1000);
      const got = (await xLog(B, t0)).find((e) => e.st === st);
      if (got) return { t0, got };
      lastDiag = await diag(t0);
      if (lastDiag.d != null && lastDiag.d > 70) await closeIn(A, wsPort, aId, bId, 40);
    }
    return null;
  }

  if (step(1)) {
    /* ── 1. a wind gem's slow, from the page's own swing ── */
    await heal();
    rec.ok('the striker\'s sword takes a wind gem on the page (guard)', await gem('wind'));
    const fx0 = { A: await fxDrawn(A), B: await fxDrawn(B), C: await fxDrawn(C) };
    const slowHit = await swingFor('slow');
    rec.ok('a wind-gem swing slowed the target (guard: the worker said st slow)', !!slowHit, slowHit || lastDiag);
    if (slowHit) {
      const claims = await sentSince(A, slowHit.t0 - 2000, 'player_attack');
      rec.ok(`1. the page's own swing claim carries its gem (${claims.length} claims, element ${claims.map((c) => c.payload && c.payload.element).join(',')})`,
        claims.length > 0 && claims.every((c) => c.payload && c.payload.element === 'wind'), claims);
      rec.ok(`1. the worker's word: st slow, x${slowHit.got.mult} for ${slowHit.got.stMs} ms`,
        slowHit.got.mult === 0.4 && slowHit.got.stMs >= 1000, slowHit.got);
      const bState = await B.page.evaluate(() => { const S = window._gameState.current; return { until: S._slowUntil - Date.now(), mult: S._slowMult }; });
      rec.ok(`1. the target's page carries it out: slowed for ${bState.until} ms more, at x${bState.mult}`, bState.until > 0 && bState.mult === 0.4, bState);
      rec.ok('1. ...and wears the "Slowed" chip', await waitChip(B, 'Slowed'));
      /* the target walks at the slow: the same key held as long, slowed and not */
      const walk = async (ms, key) => {
        const p0 = await B.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y, t: performance.now() }; });
        await B.page.keyboard.down(key);
        await B.page.waitForTimeout(ms);
        await B.page.keyboard.up(key);
        const p1 = await B.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y, t: performance.now() }; });
        return Math.hypot(p1.x - p0.x, p1.y - p0.y) / Math.max(1, p1.t - p0.t);
      };
      const left = await B.page.evaluate(() => window._gameState.current._slowUntil - Date.now());
      /* south slowed, then north free: back over the same open ground */
      const vSlow = left > 1500 ? await walk(900, 's') : null;
      await B.page.waitForTimeout(Math.max(0, (await B.page.evaluate(() => window._gameState.current._slowUntil - Date.now())) + 300));
      const vFree = await walk(900, 'w');
      rec.ok(`1. the target walks slowed: ${vSlow == null ? '?' : (vSlow * 1000).toFixed(0)} px/s slowed, ${(vFree * 1000).toFixed(0)} px/s free (x0.4 asked)`,
        vSlow != null && vFree > 0 && vSlow / vFree > 0.2 && vSlow / vFree < 0.65, { vSlow, vFree, ratio: vSlow != null ? vSlow / vFree : null });
      const fx1 = { A: await fxDrawn(A), B: await fxDrawn(B), C: await fxDrawn(C) };
      const drew = (k) => (fx1[k].slow || 0) - (fx0[k].slow || 0);
      rec.ok(`1. the slow is drawn on the target on all three screens (frames: striker ${drew('A')}, target ${drew('B')}, watcher ${drew('C')})`,
        drew('A') > 0 && drew('B') > 0 && drew('C') > 0, { fx0, fx1 });
    }
    near = await closeIn(A, wsPort, aId, bId, 40);
  }

  if (step(2)) {
    /* ── 2. a flame gem's burn, its ticks drawn as ticks ── */
    await heal();
    await gem('flame');
    const burnHit = await swingFor('burn');
    rec.ok('a flame-gem swing set the target burning (guard: the worker said st burn)', !!burnHit, burnHit || lastDiag);
    if (burnHit) {
      const chipSeen = await waitChip(B, 'Burning');
      await B.page.waitForTimeout(4600);
      const log = await xLog(B, burnHit.t0);
      const ticks = log.filter((e) => e.ability === 'burn');
      rec.ok(`2. the burn ticks on the target, as on a monster (${ticks.length} ticks of ${ticks.map((t) => t.dmgTaken).join('/')})`,
        ticks.length >= 6 && ticks.every((t) => t.elem === 'flame'), log);
      const pb = await popsSince(B, burnHit.t0);
      const tickNums = pb.filter((p) => /^-\d+$/.test(p.text) && p.icon === 'elem-flame' && p.taken);
      rec.ok(`2. the target's own numbers wear the flame, not the heart (${tickNums.length} flame numbers)`, tickNums.length >= 4, pb);
      rec.ok('2. ...and the "Burning" chip shows while it burns', chipSeen);
      const pa = await popsSince(A, burnHit.t0);
      const dealt = pa.filter((p) => /^-\d+$/.test(p.text) && p.icon === 'elem-flame' && p.color === FLAME && !p.taken);
      rec.ok(`2. the striker's numbers over them are the burn's, in the flame's colour (${dealt.length})`, dealt.length >= 4, pa);
      const confirms = await sentSince(B, burnHit.t0, 'pvp_confirmed');
      rec.ok(`2. the target's page sends no pvp_confirmed for a tick (${confirms.length} sent for the blow, ${ticks.length} ticks)`,
        confirms.length <= 1, confirms);
    }
    await gem(null);
    near = await closeIn(A, wsPort, aId, bId, 40);
  }

  if (step(3)) {
    /* ── 3. a shield bash dazes and shoves the player you are fighting ── */
    await heal();
    await B.page.waitForTimeout(2600);   /* past a daze's immunity from anything before */
    const bash = await (async () => {
      for (let i = 0; i < 4; i++) {
        /* the striker on the side away from open ground, so the shove has
           somewhere to go (openSide) */
        const side = await openSide(B);
        if (side) {
          await H.hopTo(A, side.bx - side.ux * 40, side.by - side.uy * 40, { step: 60, gap: 300, tries: 30 });
          await A.page.waitForTimeout(600);
        }
        await lockB();
        await A.page.evaluate(() => { const S = window._gameState.current; S._shieldUp = true; S.shieldActive = Date.now(); });
        await A.page.waitForTimeout(300);
        const st = await H.callFn(A, 'abilityStatus', 'bash');
        const t0 = Date.now();
        const b0 = await B.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y }; });
        const a0 = await A.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y }; });
        const cast = await H.callFn(A, 'castAbility', 'bash');
        await A.page.waitForTimeout(1400);
        const got = (await xLog(B, t0)).find((e) => e.ability === 'bash');
        const b1 = await B.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y }; });
        if (got) return { st, cast, t0, got, b0, b1, a0 };
        lastDiag = { st, cast, ...(await diag(t0)), pops: await popsSince(A, t0) };
        await A.page.evaluate(() => { const S = window._gameState.current; S._shieldUp = false; });
        if (lastDiag.d != null && lastDiag.d > 70) await closeIn(A, wsPort, aId, bId, 40);
        await A.page.waitForTimeout(4200);   /* the bash's cooldown */
      }
      return null;
    })();
    await A.page.evaluate(() => { const S = window._gameState.current; S._shieldUp = false; });
    rec.ok('a shield bash named the player and struck them (guard: the worker said ability bash)', !!bash, bash || lastDiag);
    if (bash) {
      const kbLen = bash.got.kb ? Math.hypot(bash.got.kb[0], bash.got.kb[1]) : 0;
      rec.ok(`3. the bash dazes as a rock's blow does (st ${bash.got.st}, ${bash.got.stMs} ms) and shoves (${Math.round(kbLen)} px)`,
        bash.got.st === 'daze' && bash.got.stMs > 0 && kbLen >= 30, bash.got);
      /* the shove points away from the basher, and the target's own page
         took it and moved itself along it (gustStep; how far depends on what
         stands there -- a shove stops at a wall, a prop or a node, as it
         should -- so at least a step of it, along the shove) */
      const away = bash.got.kb ? (bash.got.kb[0] * (bash.b0.x - bash.a0.x) + bash.got.kb[1] * (bash.b0.y - bash.a0.y)) : 0;
      const along = bash.got.kb ? ((bash.b1.x - bash.b0.x) * bash.got.kb[0] + (bash.b1.y - bash.b0.y) * bash.got.kb[1]) / Math.max(1, kbLen) : 0;
      rec.ok(`3. ...away from the basher, and the target's own page took it and moved along it (${Math.round(along)} px of ${Math.round(kbLen)})`,
        away > 0 && bash.got.shoved === true && along >= 10, { away, along, kbLen, shoved: bash.got.shoved, b0: bash.b0, b1: bash.b1 });
      const fxB = await fxDrawn(B), fxC = await fxDrawn(C);
      rec.ok(`3. the daze is drawn on the target (target ${fxB.daze || 0} frames, watcher ${fxC.daze || 0})`, (fxB.daze || 0) > 0 && (fxC.daze || 0) > 0, { fxB, fxC });
    }

    /* the whirlwind: a duel's lock is a fight under way (abilities.js
       pvpExtrasTarget), and it pulls the player you are fighting in */
    await heal();
    await B.page.waitForTimeout(2800);
    near = await closeIn(A, wsPort, aId, bId, 120);   /* inside its 240 px ring, outside the pull's 34 */
    const whirl = await (async () => {
      await lockB();
      const st = await H.callFn(A, 'abilityStatus', 'whirl');
      const t0 = Date.now();
      const cast = await H.callFn(A, 'castAbility', 'whirl');
      /* its 1 s wind-up, then the strike -- polled: the target's page reads
         its messages on its own (slow, here) clock */
      let got = null;
      for (let w = 0; w < 30 && !got; w++) {
        await A.page.waitForTimeout(250);
        got = (await xLog(B, t0)).find((e) => e.ability === 'whirl') || null;
      }
      return { st, cast, got, ...(got ? null : await diag(t0)) };
    })();
    rec.ok(`3. the whirlwind's button counts a duel's lock as a fight (engaged ${whirl.st && whirl.st.engaged}, cast ${whirl.cast})`,
      !!(whirl.st && whirl.st.engaged) && whirl.cast === true, whirl);
    rec.ok(`3. ...and its strike reached the player it caught, pulled in (ability whirl, ${whirl.got && whirl.got.kb ? Math.round(Math.hypot(whirl.got.kb[0], whirl.got.kb[1])) : '?'} px)`,
      !!whirl.got && !!whirl.got.kb, whirl);
    near = await closeIn(A, wsPort, aId, bId, 40);
  }

  if (step(4)) {
    /* ── 4. a parry staggers the one who swung ──
       The blow is a SHIELD BASH, judged on the shield as it is now (the one
       door, pvpextras.js _strikePlayer).  A swing's claim is judged on the
       target as the striker last saw them -- rewound by half the striker's
       ping (combat.js _resolvePvPAttack's lag compensation) -- and a parry
       must land within 250 ms of the raise, so on a box whose pages answer a
       ping in ~0.5 s a swing can never be parried at all (it was "blocked" on
       the rewound target, or not).  The swing's parry is the server suite's
       (blockcost §5); this checks the phone's half: the stagger, its words,
       and the swing refused. */
    await heal();
    let parry = null, refused = null;
    for (let i = 0; i < 6 && !(parry && refused); i++) {
      near = await closeIn(A, wsPort, aId, bId, 40);
      await heal();
      /* the guard goes up facing the striker, and the move that carries it
         to the worker goes NOW (the connection layer adds `blocking` and the
         guard's facing to every move) -- the page's own next frame, which
         sends it otherwise (BroTown's _blockChanged), is up to half a second
         away on this box, and the bash must land within 250 ms of it */
      const t0 = Date.now();
      const raised = await B.page.evaluate((aid) => new Promise((res) => {
        const S = window._gameState.current; const o = S.others[aid];
        S._shieldAngle = Math.atan2((o.y != null ? o.y : o.renderY) - S.player.y, (o.x != null ? o.x : o.renderX) - S.player.x);
        S._shieldUp = true; S.shieldActive = Date.now();
        S.channel.send({ type: 'broadcast', event: 'move', payload: { i: S.myId, x: S.player.x, y: S.player.y, d: S.player.dir,
          f: S._renderFacing || null, z: S.currentZone || 'town', vx: 0, vy: 0 } });
        setTimeout(() => res(true), 90);   /* the move batch: 33-66 ms */
      }), aId);
      /* the bash, at once: the lock, a raised shield of the basher's own */
      const cast = await A.page.evaluate((bId) => {
        const S = window._gameState.current; const o = S.others && S.others[bId];
        if (!o) return 'no-target';
        S.lockedTarget = { type: 'player', id: bId, ref: o, src: 'duel' };
        S._shieldUp = true; S.shieldActive = Date.now();
        return window._gameFns.castAbility('bash');
      }, bId);
      let got = null;
      for (let w = 0; w < 20 && !got; w++) {
        await A.page.waitForTimeout(100);
        got = (await xLog(A, t0)).find((e) => e.parriedBy === bId) || null;
      }
      await A.page.evaluate(() => { const S = window._gameState.current; S._shieldUp = false; S.shieldActive = 0; });
      if (got) {
        if (!refused) {
          /* at once, inside the 1.5 s: the page's own swing must send no
             claim -- and, the control, the same swing once the stagger is
             over does send one (one evaluate: a slow page answers each in
             ~0.3 s) */
          const r = await A.page.evaluate(() => new Promise((res) => {
            const S = window._gameState.current;
            const sent = () => (window.__btOut || []).filter((m) => m.event === 'player_attack').length;
            const left = (S._staggerUntil || 0) - Date.now();
            if (left <= 0) { res({ late: true, left }); return; }
            const n0 = sent();
            try { window._gameFns.swingAttack(); } catch (e) { /* counted below */ }
            setTimeout(() => {
              const during = sent() - n0;
              setTimeout(() => {
                const n1 = sent();
                try { window._gameFns.swingAttack(); } catch (e) { /* counted below */ }
                setTimeout(() => res({ left, during, after: sent() - n1 }), 900);
              }, Math.max(0, (S._staggerUntil || 0) - Date.now()) + 200);
            }, 350);
          }));
          if (!r.late) refused = r;
        }
        /* then what each page drew (the pages' own popup logs keep it) */
        if (!parry) {
          await B.page.waitForTimeout(800);
          parry = { t0, got, raised, pa: await popsSince(A, t0), pb: await popsSince(B, t0) };
        }
      } else {
        lastDiag = { raised, cast, ...(await diag(t0)), pops: await popsSince(A, t0) };
      }
      await B.page.evaluate(() => { const S = window._gameState.current; S._shieldUp = false; S.shieldActive = 0; });
      await B.page.waitForTimeout(4300);   /* the bash's cooldown, and the guard's next raise a fresh one */
    }
    rec.ok('a bash on a guard just raised: a parry (guard)', !!parry, parry || lastDiag);
    if (parry) {
      rec.ok(`4. the striker is staggered for the parry's ${parry.got.ms} ms and told so ("Staggered!")`,
        parry.got.ms > 0 && parry.pa.some((p) => p.text === 'Staggered!'), parry.pa);
      rec.ok('4. the one who parried sees "PARRY!"', parry.pb.some((p) => p.text === 'PARRY!'), parry.pb);
    }
    rec.ok(`4. a swing while staggered is refused on the striker's own page: nothing sent (${refused ? refused.during : '?'} claims), and once it is over the same swing goes out (${refused ? refused.after : '?'})`,
      !!refused && refused.during === 0 && refused.after >= 1, refused);
  }

  rec.ok('5. no page errors', errors.length === 0, errors);
  await done();
}
