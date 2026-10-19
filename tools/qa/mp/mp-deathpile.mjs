/* A DEAD PLAYER'S PILE LIVES ITS TWO MINUTES (v2.3.3476,
 * docs/specs/item-drop.md "A dead player's pile")
 *
 * The worker keeps a death pile DEATH_PILE_TOTAL_MS 120 s -- the dead
 * player's alone for 60, then anyone's -- and its own "Ns" counted them, but
 * the renderer took every pile off every screen at 30 s (effectsRenderer
 * _updateGroundLoot), so nobody ever saw the minute it is anyone's.  Found
 * while building the item drop (v2.3.3473), which had the same cut taken off.
 *
 * Two phones in the Wheel and a real death: the Fallen walks out to the Flame
 * Fields' level 1s with 1 HP and a monster the worker runs takes it (nothing
 * forged: mp-deathgold's way, in the Wheel); the Finder, in god mode, stands
 * a few steps off and watches.  All in real time -- the pile's clock is the
 * worker's.
 *
 *   1. a monster takes the Fallen's last HP; the Finder's screen draws the
 *      pile, its 4 logs, a countdown near 120 s, the Fallen's for a minute;
 *   2. at 36 s it is still drawn there, its countdown in the 80s, and steady
 *      (the last-call pulse is its last ten seconds, not the 30 a monster's
 *      pile gets); the Fallen, back in BroTown, still holds it; the worker
 *      still has it and the Fallen's phone asked for nothing while dead (it
 *      was given its own pile a second after dying, and the respawn's wipe
 *      destroyed it);
 *   3. the Fallen walks back onto it inside its minute and takes all of it
 *      back, gone from both phones;
 *   4. a second death's pile (2 trout): the Finder on it inside its minute
 *      takes nothing, past it takes it, gone from both phones;
 *   5. a third death's pile (3 minnows), left alone: steady at 100 s, pulsing
 *      in its last ten seconds, gone from both phones at its end, in nobody's
 *      bag;
 *   6. no page errors.
 *
 * On the game before v2.3.3476 the pile is gone from every screen and the
 * worker about a second after the death, so everything from 2 on fails.
 *
 * BT_DP_TRACE=1: a timeline of the pile for 40 s after the death, and every
 * pile message each phone received and sent (how the corpse's ask was found).
 *
 *   node tools/qa/mp/run.mjs deathpile
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const LOGS = 4;

/* every death pile this phone holds, and how it is drawn */
const deathPiles = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  return ((S && S.groundLoot) || []).filter((l) => l && l.isDeathDrop).map((l) => {
    const ic = l._pixiIcon && !l._pixiIcon.destroyed ? l._pixiIcon : null;
    const tm = l._pixiTimer && !l._pixiTimer.destroyed ? l._pixiTimer : null;
    return {
      lootId: l.lootId || null,
      x: Math.round(l.x), y: Math.round(l.y),
      ts: l.ts || 0,
      openInMs: l.ownerOnlyUntil ? l.ownerOnlyUntil - Date.now() : null,
      leftMs: l.expiry ? l.expiry - Date.now() : null,
      items: (l.deathItems || []).map((it) => it.key + ':' + it.qty).join(','),
      recipients: l.recipients || null,
      drawn: !!(ic && ic.parent && ic.visible !== false),
      alpha: ic ? +ic.alpha.toFixed(2) : null,
      timer: tm ? tm.text : null,
    };
  });
}).catch(() => null);
const pileOf = (list, id) => (list || []).find((p) => p.lootId === id) || null;
/* the worker's own death piles (GET /api/admin/loot), for a failure's detail */
const serverPiles = (wsPort) => fetch(`http://127.0.0.1:${wsPort}/api/admin/loot`, { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } })
  .then((r) => r.json()).then((j) => (j.piles || []).filter((p) => p.isDeathDrop)).catch((e) => String(e));
const held = (P, key) => P.page.evaluate((k) => {
  const S = window._gameState.current;
  return ((S && S.rpg && S.rpg.inventory) || {})[k] || 0;
}, key).catch(() => -1);

async function inWheel(P, timeout = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone)).catch(() => null);
    if (z === 'wheel') return true;
    await P.page.waitForTimeout(500);
  }
  return false;
}

/* back in BroTown after a death: alive, in the Wheel, at its arrival (the
   respawn goes by today's town, so "in the Wheel" alone is also true of the
   moment before it) */
async function backHome(P, arrival, timeout = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await H.readState(P, (S) => ({ dying: !!S._dying, loading: !!S._zoneLoading, z: S.currentZone, x: S.player.x, y: S.player.y })).catch(() => null);
    if (s && !s.dying && !s.loading && s.z === 'wheel' && Math.hypot(s.x - arrival.x, s.y - arrival.y) < 900) return true;
    await P.page.waitForTimeout(500);
  }
  return false;
}

/* the nearest living first-stretch Flame Fields monster this phone holds */
const nearestGoblin = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const m = (S.monsters || []).filter((x) => x && x.home === 'ember' && x.alive !== false && x.hp > 0 && !/-t\d+-\d+$/.test(x.id))
    .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
  return m ? { id: m.id, x: Math.round(m.x), y: Math.round(m.y) } : null;
}).catch(() => null);

/* out to `spot` in god mode, then 1 HP and on the nearest monster until the
   worker's player_died lands (in the Wheel S._dying is set by that alone) */
async function dieAt(P, wsPort, id, spot, ms = 90000) {
  await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 4 });
  await H.hopTo(P, spot.x, spot.y, { step: 100 });
  await P.page.waitForTimeout(1200);
  await H.devOp(wsPort, 'vitals', id, { heal: false, hp: 1, god: false });
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await H.readState(P, (S) => !!S._dying).catch(() => false)) return true;
    const g = await nearestGoblin(P);
    if (g) await H.hopTo(P, g.x, g.y + 8, { step: 60, tries: 6 });
    else await P.page.waitForTimeout(500);
  }
  return false;
}

/* the new death pile on this phone that carries `item` (with whatever else
   the bag held: a new character's starter things go too); null and the
   piles it did see when none comes */
async function newPile(P, before, item, timeout = 15000) {
  const t0 = Date.now();
  let seen = null;
  while (Date.now() - t0 < timeout) {
    seen = (await deathPiles(P)) || [];
    const p = seen.find((q) => !before.has(q.lootId) && q.items.split(',').includes(item));
    if (p && p.drawn) return { p, seen };   /* held AND drawn: it is in the list a frame before its icon */
    await P.page.waitForTimeout(250);
  }
  return { p: (seen || []).find((q) => !before.has(q.lootId) && q.items.split(',').includes(item)) || null, seen };
}

/* until `pred` holds of this phone's view of the pile, or the clock runs out */
async function waitPile(P, id, pred, timeout) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeout) {
    last = pileOf(await deathPiles(P), id);
    if (pred(last)) return { ok: true, last };
    await P.page.waitForTimeout(250);
  }
  return { ok: false, last };
}

/* until the pile is `ageMs` old by its own clock (the worker's; this box's
   pages read the same clock) */
async function untilAge(P, pile, ageMs) {
  for (let i = 0; i < 600; i++) {
    const now = await P.page.evaluate(() => Date.now()).catch(() => 0);
    if (now - pile.ts >= ageMs) return;
    await P.page.waitForTimeout(Math.min(1000, Math.max(100, pile.ts + ageMs - now)));
  }
}

/* the alpha of the pile's icon, sampled for `ms` */
async function alphas(P, id, ms) {
  const out = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const p = pileOf(await deathPiles(P), id);
    if (p && p.alpha != null) out.push(p.alpha);
    await P.page.waitForTimeout(110);
  }
  return out;
}

/* BT_DP_TRACE: every pile message a page receives (a tick's events too) */
const TAP = () => {
  const Native = window.WebSocket;
  const log = window.__dpLootIn = [];
  const Wrapped = function (url, protocols) {
    const ws = protocols === undefined ? new Native(url) : new Native(url, protocols);
    ws.addEventListener('message', (ev) => {
      const d = ev.data;
      if (typeof d !== 'string' || d.indexOf('"loot_') < 0) return;
      const re = /"type":"(loot_[a-z_]+)"(,"payload":\{[^{}]*\})?/g;
      let m;
      while ((m = re.exec(d)) && log.length < 400) log.push({ at: Date.now(), type: m[1], p: (m[2] || '').slice(0, 220) });
    });
    return ws;
  };
  Wrapped.prototype = Native.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Wrapped[k] = Native[k];
  window.WebSocket = Wrapped;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const errs = [];
  const init = process.env.BT_DP_TRACE ? TAP : null;
  const A = await H.newPlayer(browser, { name: 'Fallen', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, init });
  const B = await H.newPlayer(browser, { name: 'Finder', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, guest: true, init });
  for (const P of [A, B]) P.page.on('pageerror', (e) => errs.push(P.name + ': ' + String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(A);
  await H.enterWorld(B);
  const okA = await inWheel(A), okB = await inWheel(B);
  const stopA = H.keepAlive(A), stopB = H.keepAlive(B);
  try {
    await A.page.waitForTimeout(2000);
    const aId = await H.readState(A, (S) => S.myId);
    const bId = await H.readState(B, (S) => S.myId);
    rec.ok('setup: both phones in the Wheel', okA && okB, { okA, okB });
    if (!(okA && okB)) return;
    for (const id of [aId, bId]) await H.devOp(wsPort, 'quests', id).catch(() => {});   /* past the Mayor's gate */
    await H.devOp(wsPort, 'vitals', bId, { heal: true, god: true, godMinutes: 9 });

    /* the Flame Fields' town end, among its level 1s (mp-wheelnear's spot) */
    const geom = await H.wheelGeom();
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const inner = WHEEL_SPAWNS.ember.points.slice(0, 6 * geom.long).reduce((a, p) => (!a || p[2] < a[2] ? p : a), null);
    const spot = { x: Math.round(inner[0]), y: Math.round(inner[1] + 20) };
    const watch = { x: spot.x + 120, y: spot.y };
    await H.hopTo(B, watch.x, watch.y, { step: 100 });

    /* ── 1. A REAL DEATH, AND ITS PILE ON THE OTHER PHONE ── */
    await H.grant(wsPort, aId, 'item', { invKey: 'wood_pine_log', count: LOGS });
    await H.waitFor(A, (S) => ((S.rpg && S.rpg.inventory) || {}).wood_pine_log || 0, (n) => n >= LOGS, { label: 'the logs' });
    const before1 = new Set(((await deathPiles(B)) || []).map((p) => p.lootId));
    await H.instrumentWire(A); await H.instrumentWire(B);
    const died1 = await dieAt(A, wsPort, aId, spot);
    rec.ok('1a a monster the worker runs takes the Fallen\'s last HP (its player_died)', died1);
    if (!died1) return;
    /* BT_DP_TRACE=1: a timeline of the pile after the death -- the worker's
       list, both phones' views and where the Fallen is -- every 2 s for 40 s */
    if (process.env.BT_DP_TRACE) {
      const t0 = Date.now();
      while (Date.now() - t0 < 40000) {
        const sv = await serverPiles(wsPort);
        const vb = await deathPiles(B), va = await deathPiles(A);
        const fa = await H.readState(A, (S) => ({ z: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y), dying: !!S._dying, n: (S.groundLoot || []).length })).catch(() => null);
        const fb = await H.readState(B, (S) => ({ z: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y), n: (S.groundLoot || []).length })).catch(() => null);
        const svA = await H.serverPlayer(wsPort, aId).catch(() => null);
        console.log(`    t+${((Date.now() - t0) / 1000).toFixed(1)}s server ${JSON.stringify(Array.isArray(sv) ? sv.map((p) => ({ id: p.lootId.slice(-6), z: p.zone, x: Math.round(p.x), y: Math.round(p.y), age: p.ageMs, cl: p.claimedBy, ic: p.inventoryClaimed })) : sv)}`
          + ` | B ${JSON.stringify(fb)} ${JSON.stringify((vb || []).map((p) => ({ id: p.lootId && p.lootId.slice(-6), drawn: p.drawn, timer: p.timer })))}`
          + ` | A ${JSON.stringify(fa)} srv ${svA ? JSON.stringify({ z: svA.z || svA.zone, x: Math.round(svA.x), y: Math.round(svA.y), dying: svA.dying }) : null} ${JSON.stringify((va || []).map((p) => ({ id: p.lootId && p.lootId.slice(-6), drawn: p.drawn })))}`);
        await B.page.waitForTimeout(2000);
      }
      for (const [k, P] of [['A', A], ['B', B]]) {
        console.log(`    ${k} received: ` + JSON.stringify(await P.page.evaluate(() => (window.__dpLootIn || []).map((e) => ({ t: e.at % 100000, type: e.type, p: e.p })))).slice(0, 2500));
        console.log(`    ${k} sent: ` + JSON.stringify(await H.wireCounts(P)));
      }
    }
    const n1 = await newPile(B, before1, 'wood_pine_log:' + LOGS);
    const p1 = n1.p;
    rec.ok('1b the Finder\'s screen draws the pile: 4 logs, a countdown near 120 s, the Fallen\'s alone for about a minute',
      !!p1 && p1.drawn && p1.leftMs > 100000 && p1.leftMs <= 120000 && p1.openInMs > 40000 && p1.openInMs <= 60000
        && Array.isArray(p1.recipients) && p1.recipients.includes(aId) && /^(1[01]\d|120)s$/.test(p1.timer || ''),
      p1 || { seen: n1.seen, server: await serverPiles(wsPort), fallen: await H.serverPlayer(wsPort, aId).then((v) => v && { z: v.z || v.zone, x: v.x, y: v.y, inv: v.inventory }).catch(() => null),
        finderZone: await H.readState(B, (S) => S.currentZone).catch(() => null) });
    if (!p1) return;

    /* ── 2. PAST HALF A MINUTE, THE FALLEN WALKING BACK ── */
    /* the Fallen respawns in BroTown and walks back toward it while the clock
       runs, stopping 150 px short on the town side (the way there never comes
       nearer: the magnet takes a pile from 50 px) */
    const back = { x: 0, y: 0 };
    {
      const dx = geom.arrival.x - p1.x, dy = geom.arrival.y - p1.y, d = Math.hypot(dx, dy) || 1;
      back.x = Math.round(p1.x + dx / d * 150); back.y = Math.round(p1.y + dy / d * 150);
    }
    const walk = (async () => {
      const home = await backHome(A, geom.arrival, 30000);
      /* the Wheel's pile list comes with the way back in, a moment after the
         arrival itself */
      const t0 = Date.now();
      const own = await waitPile(A, p1.lootId, (p) => !!p && p.leftMs > 0 && /^\d+s$/.test(p.timer || ''), 15000);
      rec.ok(`2c the Fallen, back in BroTown, still holds it, its countdown running (${((Date.now() - t0) / 1000).toFixed(1)} s after arriving)`,
        home && own.ok, { home, own: own.last });
      await H.hopTo(A, back.x, back.y, { step: 100 });
    })();
    await untilAge(B, p1, 36000);
    const at36 = pileOf(await deathPiles(B), p1.lootId);
    const a36 = await alphas(B, p1.lootId, 2500);
    rec.ok('2a at 36 s the pile is still drawn on the Finder\'s screen, its countdown in the 80s',
      !!at36 && at36.drawn && /^8\ds$/.test(at36.timer || ''), at36);
    rec.ok('2b ...and steady: no last-call pulse 84 s before its end', a36.length >= 2 && a36.every((a) => a === 1), a36);
    await walk;
    /* the bug under the 30 s cut: the corpse lying on its pile asked for it,
       was given it (the worker read the phone's own "alive"), and the
       respawn's wipe destroyed it -- the pile was on every screen about a
       second (server/src/index.js _handleLootPickup) */
    const sv36 = await serverPiles(wsPort);
    const asked = (await H.wireCounts(A)).loot_pickup || 0;
    rec.ok('2d nobody was given it: the worker still has it, and the Fallen\'s phone asked for nothing while dead or walking back',
      Array.isArray(sv36) && sv36.some((p) => p.lootId === p1.lootId) && asked === 0, { sv36, asked });

    /* ── 3. THE FALLEN TAKES IT BACK, INSIDE ITS MINUTE ── */
    await H.hopTo(A, p1.x, p1.y + 15, { step: 50 });
    const logs3 = await H.waitFor(A, (S) => ((S.rpg && S.rpg.inventory) || {}).wood_pine_log || 0, (n) => n >= LOGS, { label: 'the Fallen\'s logs back', timeout: 15000 }).catch(() => 0);
    const age3 = (await A.page.evaluate(() => Date.now())) - p1.ts;
    const gone3B = await waitPile(B, p1.lootId, (p) => !p, 8000);
    const gone3A = await waitPile(A, p1.lootId, (p) => !p, 8000);
    rec.ok(`3 the Fallen walks back onto it and takes all 4 logs back inside its minute (${(age3 / 1000).toFixed(0)} s), gone from both phones`,
      logs3 === LOGS && age3 < 60000 && gone3B.ok && gone3A.ok, { logs3, age3, onB: gone3B.last, onA: gone3A.last });

    /* ── 4. A SECOND DEATH: ONLY ITS OWNER INSIDE ITS MINUTE, THEN ANYONE ── */
    await H.grant(wsPort, aId, 'item', { invKey: 'fish_trout', count: 2 });
    await H.waitFor(A, (S) => ((S.rpg && S.rpg.inventory) || {}).fish_trout || 0, (n) => n >= 2, { label: 'the trout' }).catch(() => 0);
    const before2 = new Set(((await deathPiles(B)) || []).map((p) => p.lootId));
    const died2 = await dieAt(A, wsPort, aId, spot);
    const n2 = died2 ? await newPile(B, before2, 'fish_trout:2') : { p: null, seen: null };
    const p2 = n2.p;
    rec.ok('4a a second death leaves its pile (2 trout) on the Finder\'s screen', !!p2 && p2.drawn, { died2, p2, seen: p2 ? undefined : n2.seen });
    if (!p2) return;
    await H.hopTo(B, p2.x, p2.y + 15, { step: 50 });
    await B.page.waitForTimeout(2500);
    const at4 = pileOf(await deathPiles(B), p2.lootId);
    const trout4 = await held(B, 'fish_trout');
    rec.ok('4b the Finder standing on it inside its minute takes nothing: no trout, the pile still there',
      trout4 === 0 && !!at4 && at4.drawn && at4.openInMs > 0, { at4, trout4 });
    await H.hopTo(B, p2.x + 150, p2.y, { step: 50 });
    /* past its minute the Finder takes it -- before the Fallen walks out again:
       a walk past its own pile takes it back, as it should (an early run) */
    await untilAge(B, p2, 61500);
    await H.hopTo(B, p2.x + 60, p2.y + 15, { step: 50 });
    await B.page.waitForTimeout(600);
    await H.hopTo(B, p2.x, p2.y + 15, { step: 30 });
    const trout4c = await H.waitFor(B, (S) => ((S.rpg && S.rpg.inventory) || {}).fish_trout || 0, (n) => n >= 2, { label: 'the Finder\'s trout', timeout: 15000 }).catch(() => 0);
    const gone4B = await waitPile(B, p2.lootId, (p) => !p, 8000);
    const gone4A = await waitPile(A, p2.lootId, (p) => !p, 8000);
    rec.ok('4c past its minute the Finder walks onto it and takes it: +2 trout, gone from both phones',
      trout4c === 2 && gone4B.ok && gone4A.ok, { trout4c, onB: gone4B.last, onA: gone4A.last });

    /* ── 5. A THIRD DEATH, ITS PILE LEFT ALONE TO ITS END ── */
    /* granted once the Fallen is back: the respawn's own wipe would take
       anything granted between the death and it */
    const home3 = await backHome(A, geom.arrival, 30000);
    await H.grant(wsPort, aId, 'item', { invKey: 'fish_minnow', count: 3 });
    await H.waitFor(A, (S) => ((S.rpg && S.rpg.inventory) || {}).fish_minnow || 0, (n) => n >= 3, { label: 'the minnows' }).catch(() => 0);
    const before3 = new Set(((await deathPiles(B)) || []).map((p) => p.lootId));
    const died3 = home3 && await dieAt(A, wsPort, aId, spot);
    const n3 = died3 ? await newPile(B, before3, 'fish_minnow:3') : { p: null, seen: null };
    const p3 = n3.p;
    rec.ok('5a a third death leaves its pile (3 minnows) on the Finder\'s screen', !!p3 && p3.drawn, { home3, died3, p3, seen: p3 ? undefined : n3.seen });

    if (p3) {
      /* the Finder well away from the third, back along the way out: past its
         minute a phone within the magnet's 50 px pulls a pile in and takes it,
         as it should (a death beside the Finder put one there, an early run) */
      const dx = geom.arrival.x - p3.x, dy = geom.arrival.y - p3.y, d = Math.hypot(dx, dy) || 1;
      await H.hopTo(B, Math.round(p3.x + dx / d * 450), Math.round(p3.y + dy / d * 450), { step: 60 });
      const bAt = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));
      rec.ok('5a2 (the Finder 300 px or more from it, watching)', Math.hypot(bAt.x - p3.x, bAt.y - p3.y) >= 300, { bAt, p3: { x: p3.x, y: p3.y } });
      await untilAge(B, p3, 100000);
      const at100 = pileOf(await deathPiles(B), p3.lootId);
      const a100 = await alphas(B, p3.lootId, 2500);
      rec.ok('5b at 100 s it is drawn and steady, its countdown near 20 s',
        !!at100 && at100.drawn && /^(18|19|20)s$/.test(at100.timer || '') && a100.length >= 2 && a100.every((a) => a === 1), { at100, a100 });
      await untilAge(B, p3, 112000);
      const aEnd = await alphas(B, p3.lootId, 5000);
      /* pulsing: its brightness changes frame to frame (a steady pile reads
         exactly 1 in every one, 5b).  Not "down to 0.35 and back": this box
         draws a few frames a second, and they can all miss the pulse's dip */
      rec.ok('5c in its last ten seconds it pulses: its brightness moves from frame to frame',
        aEnd.length >= 4 && Math.min(...aEnd) < 0.9 && Math.max(...aEnd) - Math.min(...aEnd) >= 0.15, aEnd);
      await untilAge(B, p3, 120500);
      const end3B = await waitPile(B, p3.lootId, (p) => !p, 6000);
      const end3A = await waitPile(A, p3.lootId, (p) => !p, 6000);
      const minA = await held(A, 'fish_minnow'), minB = await held(B, 'fish_minnow');
      rec.ok('5d ...and at its end it is gone from both phones, in nobody\'s bag',
        end3B.ok && end3A.ok && minA === 0 && minB === 0, { onB: end3B.last, onA: end3A.last, minA, minB });
    }

    /* ── 6. ── */
    rec.ok('6 no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    stopA(); stopB();
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
