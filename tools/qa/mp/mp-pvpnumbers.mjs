/* ═══ A HIT ON A PLAYER READS AS A HIT ON A MONSTER, ON THREE PHONES (v2.3.3263) ═══
 *
 * Owner, 2026-10-15: "change it so that the numbers for damage between PVP and
 * PVE can be exactly the same for each combat skill type (melee, bow, staff)
 * ... Same with damage dealt it stays consistent.  Everything is 1 version".
 *
 * The worker rolls one hit for a monster and a player (combat.js _rollHit;
 * server/test/pvp-balance.test.mjs §11 lands the same swing on both and reads
 * the same number).  This scenario checks the phones DRAW it one way too
 * (src/networking/gameEvents.js, the pvp_hit case):
 *   1. the attacker's number over the target is a hit-you-DEAL number, as over
 *      a monster: amber (or the crit colour), the weapon's mark (the worker's
 *      new `slot`), the monster_hit branch's own figure (the change in the
 *      bar, toDisplayHitDamage) -- it was red with a '!', the colours of a hit
 *      TAKEN;
 *   2. the target's own number is a monster's hit on them: taken red, the
 *      heart;
 *   3. an onlooker standing by sees it over the target as a monster's hit on
 *      them (taken red) -- it saw nothing at all;
 *   1-3. and the SAME figure on all three screens, the change in the target's
 *      bar (gameEvents.js takenFigure) -- the first run caught one blow
 *      reading "-2" to the striker and "-3" to the other two;
 *   4. a blocked blow reads as a blocked monster's: "Blocked!" and the stamina
 *      it cost (the worker's new `staminaDrain`) -- it was a grey "-0" and
 *      "BLOCKED";
 *   5. a fight in another zone draws nothing on the watcher's screen (pvp_hit
 *      goes to every zone; the onlooker's branch draws only its own zone's);
 *   6. no page errors.
 * Three phones, a real duel in town (the consent that lets the hits land; the
 * rule is the same as No man's land's), the attacker's blows the page's own
 * shape on the wire.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const AMBER = '#ffd08a';
const TAKEN = '#ff5e6c';

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

/* the attacker's blow, as its page puts a sword hit on the wire */
const swingAt = (A, bId, sw) => A.page.evaluate(({ bId, sw }) => {
  const S = window._gameState.current;
  const o = S.others && S.others[bId];
  if (!o || !S.channel) return false;
  const ang = Math.atan2((o.y != null ? o.y : o.renderY) - S.player.y, (o.x != null ? o.x : o.renderX) - S.player.x);
  S.channel.send({ type: 'broadcast', event: 'player_attack', payload: { id: S.myId, x: S.player.x, y: S.player.y,
    angle: ang, dmgBase: 10, critChance: 0, range: 140, arc: 2.6, ts: Date.now(), inDuel: !!S._inDuel, sw, kind: 'melee', target: bId } });
  return true;
}, { bId, sw });

/* the popups a page drew since `t0` (S.dmgNumbers, combatHelpers pushDmgPopup).
   v2.3.3397: from a record kept as each appears (mp-spar's and mp-pvpextras'
   recorder), not the live list: a popup lives 1.5 s, and on this box the read
   after a blow and its waits could come when the block's "Blocked!" and its
   stamina had already gone -- the list was empty, the block real (TRAPS §200).
   Each page's recorder is started before the first blow (recordPops). */
const recordPops = (P) => P.page.evaluate(() => {
  if (window.__btPopRec) return;
  const seen = new WeakSet();
  window.__btPopLog = [];
  window.__btPopRec = setInterval(() => {
    const S = window._gameState && window._gameState.current;
    for (const d of (S && S.dmgNumbers) || []) {
      if (!d || seen.has(d)) continue;
      seen.add(d);
      window.__btPopLog.push({ at: d.recvTs || d.ts || Date.now(), text: String(d.text), color: d.color, icon: d.iconKey || null,
        crit: !!d.crit, taken: !!d.taken, x: Math.round(d.x), y: Math.round(d.y) });
      if (window.__btPopLog.length > 500) window.__btPopLog.splice(0, 100);
    }
  }, 60);
});
const popsSince = (P, t0) => P.page.evaluate((t0) => (window.__btPopLog || []).filter((d) => d.at >= t0 - 50)
  .map(({ at, ...d }) => d), t0);

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

  /* a sword for the striker, a shield for the target (tut_1 pays both on accept) */
  for (const P of [A, B]) {
    await P.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
  }
  await A.page.waitForTimeout(1800);
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState.current; const R = S.rpg;
      if (!R.shield && (R.shieldStash || []).length) R.shield = R.shieldStash[0];
      if (R._quests) R._quests.tut_4 = 'turnedIn';   /* the onboarding coach covers the band (mp-duelblock) */
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
  const near = await closeIn(A, wsPort, aId, bId, 40);
  rec.ok(`the striker stands in a sword's reach (guard: ${near.d} px)`, near.ok, near);
  const cSees = await C.page.evaluate((id) => { const S = window._gameState.current; return !!(S.others && S.others[id]); }, bId);
  rec.ok('the watcher can see the target (guard)', cSees);

  /* ── 1-3. one landed blow, three screens ── */
  await Promise.all([recordPops(A), recordPops(B), recordPops(C)]);
  let sw = 9100;
  let got = null;
  for (let tries = 0; tries < 6 && !got; tries++) {
    await B.page.evaluate(() => { const S = window._gameState.current; S._shieldUp = false; });
    const t0 = Date.now();
    const hp0 = (await H.serverPlayer(wsPort, bId) || {}).hp;
    await swingAt(A, bId, ++sw);
    await A.page.waitForTimeout(900);
    const hp1 = (await H.serverPlayer(wsPort, bId) || {}).hp;
    const [pa, pb, pc] = await Promise.all([popsSince(A, t0), popsSince(B, t0), popsSince(C, t0)]);
    const hitA = pa.find((p) => /^-\d+$/.test(p.text));
    if (hitA && typeof hp0 === 'number' && typeof hp1 === 'number' && hp1 < hp0) got = { t0, hp0, hp1, pa, pb, pc, hitA };
    await A.page.waitForTimeout(500);
  }
  rec.ok('a blow landed (guard)', !!got, got);
  if (got) {
    const { hp0, hp1, pa, pb, pc, hitA } = got;
    const want = Math.max(1, Math.ceil(hp0 / 5) - Math.ceil(hp1 / 5));   /* toDisplayHitDamage: the change in the bar */
    rec.ok(`1. the striker's number over the target is a hit-you-deal number, as over a monster: ${hitA.text} in ${hitA.color} with the ${hitA.icon} mark`,
      (hitA.color === AMBER || hitA.crit) && hitA.icon === 'sword' && !hitA.taken && !/!/.test(hitA.text), hitA);
    rec.ok(`1. ...and it is the monster branch's figure, the change in the bar (HP ${hp0} -> ${hp1}: ${want})`, hitA.text === '-' + want, { hitA, want });
    const hitB = pb.find((p) => /^-\d+$/.test(p.text) && p.taken);
    rec.ok(`2. the target's own number is a monster's hit on them: taken red with the heart (${hitB && hitB.text})`,
      !!hitB && hitB.color === TAKEN && hitB.icon === 'heart', pb);
    const hitC = pc.find((p) => /^-\d+$/.test(p.text));
    rec.ok(`3. the watcher sees it over the target as a monster's hit on them (${hitC && hitC.text}, taken red)`,
      !!hitC && hitC.color === TAKEN && hitC.taken, pc);
    /* the first run of this scenario caught one blow reading "-2" on the
       striker's screen and "-3" on the other two: two rounding rules.  One
       figure now (gameEvents.js takenFigure): the change in the bar. */
    rec.ok(`1-3. ONE figure on all three screens: striker ${hitA.text}, target ${hitB && hitB.text}, watcher ${hitC && hitC.text} (the change in the bar, ${want})`,
      !!hitB && !!hitC && hitA.text === hitB.text && hitB.text === hitC.text && hitA.text === '-' + want, { hitA, hitB, hitC, want });
  }

  /* ── 4. a blocked blow reads as a blocked monster's ── */
  await B.page.evaluate((aid) => {
    const S = window._gameState.current;
    const o = S.others[aid];
    S._shieldUp = true; S.shieldActive = Date.now();
    S._shieldAngle = Math.atan2((o.y != null ? o.y : o.renderY) - S.player.y, (o.x != null ? o.x : o.renderX) - S.player.x);
    /* v2.3.3264: ...and on the worker NOW.  Since a player's blow can be
       parried (server pvpextras.js), a block within 250 ms of the raise is a
       PARRY -- free, no stamina -- and this box's page timers can hold the
       move that carries the raise (the move batch) for most of a second, so
       the swing below could land inside the window.  The move, then an
       ability of no kind the worker has, which puts the held move first
       (wsClient.js flushPendingMoveNow) and is dropped unread. */
    S.channel.send({ type: 'broadcast', event: 'move', payload: { i: S.myId, x: S.player.x, y: S.player.y, d: S.player.dir,
      f: S._renderFacing || null, z: S.currentZone || 'town', vx: 0, vy: 0 } });
    S.channel.send({ type: 'ability', payload: { kind: 'qa-flush' } });
  }, aId);
  await B.page.keyboard.press('Control');   /* the guard and its facing reach the worker on the next move */
  await B.page.waitForTimeout(700);
  let blk = null;
  for (let tries = 0; tries < 5 && !blk; tries++) {
    const t0 = Date.now();
    await swingAt(A, bId, ++sw);
    await A.page.waitForTimeout(900);
    const pb = await popsSince(B, t0);
    const q = await H.readState(B, () => { const f = window.__btFightFood; return f && f.hits.length ? f.hits[f.hits.length - 1] : null; });
    /* a parry is not the plain block this step reads (no stamina cost): one
       that slipped in staggers the striker 1.5 s, so the next tries wait it out */
    if (q && q.blocked && q.at >= t0 - 200 && !pb.some((p) => p.text === 'PARRY!')) blk = { pb, q };
    await A.page.waitForTimeout(400);
  }
  rec.ok('a blow was blocked by the worker (guard)', !!blk, blk);
  if (blk) {
    const said = blk.pb.find((p) => p.text === 'Blocked!');
    const st = blk.pb.find((p) => /⚡$/.test(p.text));
    const old = blk.pb.find((p) => p.text === 'BLOCKED' || p.text === '-0');
    rec.ok(`4. a blocked player's blow says "Blocked!" and the stamina it cost (${st && st.text}), as a monster's does`, !!said && !!st && !old, blk.pb);
  }

  /* ── 5. a fight in ANOTHER zone draws nothing on the watcher's screen ──
     pvp_hit goes to the whole room, every zone; the onlooker's number is drawn
     only for a target in the watcher's OWN zone (gameEvents.js _peerInZone).
     The watcher goes to Frost Ridge and still holds the target's copy (in
     town) within PVP_ONLOOK_R of where it stands by the numbers, so only the
     zone can stop it -- without it, the fight in town bled and took numbers
     over the watcher's snow. */
  await B.page.evaluate(() => { const S = window._gameState.current; S._shieldUp = false; S.shieldActive = 0; });
  await B.page.keyboard.press('Control');   /* the lowered guard reaches the worker */
  await H.warpToZone(C, { wsPort, label: 'Frost Ridge', zoneId: 'frost' }).catch(() => null);
  const cView = await C.page.evaluate((id) => {
    const S = window._gameState.current;
    const o = S.others && S.others[id];
    if (!o) return { zone: S.currentZone, has: false };
    const ox = o.x != null ? o.x : o.renderX, oy = o.y != null ? o.y : o.renderY;
    return { zone: S.currentZone, has: true, theirs: o.zone || o.z || 'town', d: Math.round(Math.hypot(ox - S.player.x, oy - S.player.y)) };
  }, bId);
  rec.ok(`the watcher is in another zone, still holds the target, in reach by the numbers (guard: ${JSON.stringify(cView)})`,
    cView.zone === 'frost' && cView.has && cView.theirs !== 'frost' && cView.d <= 2800, cView);
  let far = null;
  for (let tries = 0; tries < 6 && !far; tries++) {
    await B.page.evaluate(() => { const S = window._gameState.current; S._shieldUp = false; });
    const t0 = Date.now();
    const hp0 = (await H.serverPlayer(wsPort, bId) || {}).hp;
    await swingAt(A, bId, ++sw);
    await A.page.waitForTimeout(900);
    const hp1 = (await H.serverPlayer(wsPort, bId) || {}).hp;
    if (typeof hp0 === 'number' && typeof hp1 === 'number' && hp1 < hp0) {
      const flash = await C.page.evaluate((id) => { const S = window._gameState.current; const o = S.others && S.others[id]; return o ? (o._hitFlash || 0) : 0; }, bId);
      far = { t0, hp0, hp1, flash, pc: await popsSince(C, t0) };
    }
    await A.page.waitForTimeout(500);
  }
  rec.ok('a blow landed in town (guard)', !!far, far);
  if (far) {
    const drawn = far.pc.filter((p) => /^-\d+$/.test(p.text));
    rec.ok(`5. the watcher in another zone draws nothing for the fight in town (${drawn.length} numbers, flash ${far.flash >= far.t0 ? 'yes' : 'no'})`,
      drawn.length === 0 && !(far.flash >= far.t0), far);
  }

  rec.ok('6. no page errors', errors.length === 0, errors);
  await done();
}
