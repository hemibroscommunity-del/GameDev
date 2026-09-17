/* TARGETED REPRO: two loot piles, one lootId.
 *
 * server/src/index.js:3539   const lootId = 'mk-' + monster.id;
 * Monster ids are stable per SPAWN SLOT.  RESPAWN_TIME is 18.75 s and
 * LOOT_EXPIRY_MS is 60 s, so the same slot can be killed three times inside
 * one pile's lifetime.  Leave the first pile unclaimed and kill the slot
 * again: this.loot[zone] now holds TWO piles with the same lootId, and both
 * _handleLootPickup (list.find) and _despawnLoot (list.findIndex) take the
 * FIRST — the stale one.
 *
 * The player is then standing on the NEW pile while the worker range-checks
 * them against the OLD pile's position, and refuses `out-of-range` — the one
 * refusal the client deliberately keeps retrying instead of dropping the pile.
 *
 * Steps: kill slot, walk AWAY leaving the pile, wait for respawn, lure the
 * monster somewhere else, kill it again, then walk onto the new pile.
 *
 *   node tools/qa/mp/_lootdup.mjs
 */
import * as H from './harness.mjs';

const INIT = `
(() => {
  const Orig = window.WebSocket;
  window.__lootLog = [];
  const KEEP = new Set(['loot_pickup_rejected','loot_credit','loot_despawn','loot_claimed','loot_drop']);
  const note = (o) => { try { window.__lootLog.push(o); } catch (e) {} };
  function Patched(...a) {
    const ws = new Orig(...a);
    ws.addEventListener('message', (e) => {
      try {
        const m = JSON.parse(e.data);
        const t = m && (m.type || m.event);
        if (KEEP.has(t)) note({ dir:'in', t: Date.now(), type: t, payload: m.payload });
        const evs = (m && m.payload && m.payload.events) || m.events;
        if (Array.isArray(evs)) for (const ev of evs) {
          const et = ev && (ev.type || ev.event);
          if (KEEP.has(et)) note({ dir:'in', t: Date.now(), type: et, payload: ev.payload });
        }
      } catch (err) {}
    });
    const origSend = ws.send.bind(ws);
    ws.send = (d) => {
      try {
        const m = typeof d === 'string' ? JSON.parse(d) : null;
        if (m && (m.type || m.event) === 'loot_pickup') {
          const S = window._gameState && window._gameState.current;
          const p = S && (S.groundLoot||[]).find((l) => l && l.lootId === m.payload.lootId);
          note({ dir:'out', t: Date.now(), type:'loot_pickup', payload: m.payload,
                 px: S?Math.round(S.player.x):null, py: S?Math.round(S.player.y):null,
                 pileX: p?Math.round(p.x):null, pileY: p?Math.round(p.y):null,
                 pileSx: p&&p._sx!==undefined?Math.round(p._sx):null,
                 pileSy: p&&p._sy!==undefined?Math.round(p._sy):null });
        }
      } catch (err) {}
      return origSend(d);
    };
    return ws;
  }
  Patched.prototype = Orig.prototype;
  for (const k of ['CONNECTING','OPEN','CLOSING','CLOSED']) Patched[k] = Orig[k];
  window.WebSocket = Patched;
})();
`;

const KILL = async (P, monsterId) => P.page.evaluate(async (wantId) => {
  const S = window._gameState.current;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
  if (wantId) live = live.filter((m) => m.id === wantId);
  if (!live.length) return { none: true };
  live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
  const m = live[0];
  const id = m.id;
  S.rpg.activeSlot = 'melee';
  S._shieldUp = false;
  const known = new Set((S.groundLoot || []).map((l) => l && l.lootId + '@' + Math.round(l._sx) + ',' + Math.round(l._sy)));
  let seen = null;
  const watcher = setInterval(() => {
    if (seen) return;
    const pile = (S.groundLoot || []).find((l) => l && l._serverLoot && l.lootId
      && !known.has(l.lootId + '@' + Math.round(l._sx) + ',' + Math.round(l._sy)));
    if (!pile) return;
    seen = { lootId: pile.lootId, coins: pile.coins || 0,
      ax: Math.round(pile._sx === undefined ? pile.x : pile._sx),
      ay: Math.round(pile._sy === undefined ? pile.y : pile._sy) };
  }, 16);
  const hit = () => { if (S.channel) S.channel.send({ type: 'monster_damage', payload: {
    monsterId: id, zone: S.currentZone, element: null, slot: 'melee', special: false } }); };
  const alive = () => { const c = (S.monsters || []).find((x) => x.id === id);
    return c && c.alive !== false && (c.curHp == null || c.curHp > 0) ? c : null; };
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && alive()) { hit(); await sleep(260); }
  const t3 = Date.now();
  while (Date.now() - t3 < 6000 && !seen) await sleep(50);
  clearInterval(watcher);
  return { id, dead: !alive(), seen };
}, monsterId);

const WS = await H.freePort(), WEB = await H.freePort();
console.log('booting…');
const worker = await H.startWorker(WS);
const srv = await H.serveDist(WEB);
const browser = await H.launch();
const cleanup = () => { try { H.stopWorker(worker); } catch {} };
process.on('uncaughtException', (e) => { console.error(e); cleanup(); process.exit(1); });

const admin = (p) => fetch(`http://127.0.0.1:${WS}${p}`, { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } }).then((r) => r.json());

const P = await H.newPlayer(browser, { name: 'Dup', wsPort: WS, webPort: WEB, init: INIT });
await H.enterWorld(P);
await P.page.waitForTimeout(2500);
await P.page.evaluate(() => {
  const S = window._gameState.current;
  S.currentZone = 'meadow';
  if (S.channel) S.channel.send({ type: 'move', x: 500, y: 500, z: 'meadow' });
});
await P.page.waitForTimeout(3500);
const myId = await H.readState(P, (S) => S.myId);
await H.grant(WS, myId, 'gold', { amount: 500 }).catch(() => {});
await H.grant(WS, myId, 'item', { invKey: 'wood_pine_log', count: 9 }).catch(() => {});
await P.page.waitForTimeout(1200);
await P.page.evaluate(() => { const S = window._gameState.current;
  if (S && S.channel) S.channel.send({ type: 'forge_weapon', payload: { weaponType: 'greatsword', tierKey: 'wood', isWoodwork: false } }); });
await P.page.waitForTimeout(2500);

/* ── 1. kill a slot and LEAVE the pile ────────────────────────────────── */
const k1 = await KILL(P, null);
console.log('kill 1: ' + JSON.stringify(k1));
if (!k1.dead || !k1.seen) { console.log('SETUP FAILED (no kill/pile)'); await browser.close(); srv.close(); cleanup(); process.exit(2); }

/* Walk well clear so the magnet never engages and the pile stays unclaimed. */
await H.hopTo(P, k1.seen.ax + 420, k1.seen.ay + 300);
await P.page.waitForTimeout(1500);
let L = await admin('/api/admin/loot');
console.log('after kill 1, worker piles: ' + JSON.stringify(L.piles.map((p) => ({ id: p.lootId, x: p.x, y: p.y, claimed: p.claimedBy }))));

/* ── 2. wait out the 18.75 s respawn, kill the SAME slot again ─────────── */
console.log('waiting for respawn of ' + k1.id + ' …');
await P.page.waitForTimeout(22000);
const k2 = await KILL(P, k1.id);
console.log('kill 2: ' + JSON.stringify(k2));

L = await admin('/api/admin/loot');
const dupes = L.piles.filter((p) => p.lootId === k1.seen.lootId);
console.log('\n=== WORKER LOOT TABLE ===');
for (const p of L.piles) console.log('   ' + JSON.stringify({ id: p.lootId, x: p.x, y: p.y, ageMs: p.ageMs, coins: p.coins, claimedBy: p.claimedBy, recipients: p.recipients }));
console.log(`>>> piles sharing lootId ${k1.seen.lootId}: ${dupes.length}`);
if (dupes.length >= 2) {
  console.log('>>> gap between the two piles: ' + Math.round(Math.hypot(dupes[0].x - dupes[1].x, dupes[0].y - dupes[1].y)) + ' px  (pickup range ' + L.pickupRange + ')');
}

if (!k2.dead || !k2.seen) { console.log('kill 2 produced no pile; stopping'); }
else {
  /* ── 3. walk onto the NEW pile and let the shipped client ask ───────── */
  console.log('\nwalking onto the NEW pile at ' + k2.seen.ax + ',' + k2.seen.ay);
  await P.page.evaluate(() => { window.__lootLog.length = 0; });
  await H.hopTo(P, k2.seen.ax, k2.seen.ay + 15);
  await P.page.waitForTimeout(9000);

  const res = await P.page.evaluate((id) => {
    const S = window._gameState.current;
    const p = (S.groundLoot || []).find((l) => l && l.lootId === id);
    return { stillOnScreen: !!p, collected: p ? !!p._collected : null, expired: p ? !!p._expired : null,
      lDist: p ? Math.round(Math.hypot(S.player.x - p.x, (S.player.y - 15) - p.y)) : null,
      tries: p ? (p._pickupTries || 0) : null,
      px: Math.round(S.player.x), py: Math.round(S.player.y),
      log: window.__lootLog.slice(-24) };
  }, k2.seen.lootId);

  console.log('\n=== CONVERSATION WHILE STANDING ON THE NEW PILE ===');
  const t0 = res.log.length ? res.log[0].t : 0;
  for (const e of res.log) {
    if (e.dir === 'out') console.log(`  +${String(e.t - t0).padStart(5)}ms OUT loot_pickup ${e.payload.lootId} player=${e.px},${e.py} drawnPile=${e.pileX},${e.pileY} anchor=${e.pileSx},${e.pileSy}`);
    else console.log(`  +${String(e.t - t0).padStart(5)}ms IN  ${e.type} ${JSON.stringify(e.payload).slice(0, 260)}`);
  }
  console.log('\n=== OUTCOME ===');
  console.log(JSON.stringify({ stillOnScreen: res.stillOnScreen, collected: res.collected, expired: res.expired,
    lDist: res.lDist, tries: res.tries, player: res.px + ',' + res.py }));
  const srvP = await admin(`/api/admin/player?id=${encodeURIComponent(myId)}`);
  console.log('worker player: ' + JSON.stringify(srvP.live));
  const L2 = await admin('/api/admin/loot');
  console.log('worker piles now: ' + JSON.stringify(L2.piles.map((p) => ({ id: p.lootId, x: p.x, y: p.y, claimedBy: p.claimedBy }))));
}

await browser.close();
srv.close();
await H.stopWorker(worker);
