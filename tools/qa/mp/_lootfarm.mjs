/* LOOT PICKUP FAILURE FARM — investigation harness (not a scenario).
 *
 * Owner: "Still problems with loot sometimes dropping and magnetizing but
 * unable to be picked up."
 *
 * This is NOT a pass/fail scenario.  It is a loop that kills monsters over and
 * over with a real client against a real worker, lets the SHIPPED magnet and
 * pickup code do their own thing (nothing is forced), and captures the whole
 * conversation for any pile that does not make it into the bag.
 *
 * What it captures for a stuck pile:
 *   - every loot_pickup this client SENT, with the client's own position and
 *     the pile's drawn position at the instant of the send
 *   - every loot_pickup_rejected / loot_credit / loot_despawn / loot_claimed
 *     the worker sent back
 *   - the worker's own record of the pile   (GET /api/admin/loot)
 *   - the worker's own copy of the player   (GET /api/admin/player)
 *
 * The WebSocket is teed in a page init script rather than by wrapping
 * S.channel.send, because the init script is installed before the client's own
 * code runs and therefore cannot miss the first frames of a pile's life.
 *
 *   node tools/qa/mp/_lootfarm.mjs [rounds]
 */
import * as H from './harness.mjs';

const ROUNDS = Number(process.argv[2] || 12);

/* Tee every loot-relevant frame, both directions, before the client boots. */
const INIT = `
(() => {
  const Orig = window.WebSocket;
  window.__lootLog = [];
  const KEEP_IN = new Set(['loot_pickup_rejected','loot_credit','loot_despawn','loot_claimed','loot_drop','zone_loot']);
  const note = (o) => { try { window.__lootLog.push(o); if (window.__lootLog.length > 4000) window.__lootLog.shift(); } catch (e) {} };
  const snap = () => {
    try {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.player) return null;
      return { px: Math.round(S.player.x), py: Math.round(S.player.y), z: S.currentZone,
               piles: (S.groundLoot || []).filter((l) => l && l.lootId).map((l) => ({
                 id: l.lootId, x: Math.round(l.x), y: Math.round(l.y),
                 sx: l._sx === undefined ? null : Math.round(l._sx),
                 sy: l._sy === undefined ? null : Math.round(l._sy),
                 pend: !!l._pickupPending, tries: l._pickupTries || 0,
                 retryAt: l._pickupRetryAt || 0, coll: !!l._collected, exp: !!l._expired })) };
    } catch (e) { return null; }
  };
  function Patched(...a) {
    const ws = new Orig(...a);
    ws.addEventListener('message', (e) => {
      try {
        const m = JSON.parse(e.data);
        const t = m && (m.type || m.event);
        if (KEEP_IN.has(t)) note({ dir: 'in', t: Date.now(), type: t, payload: m.payload });
        /* Batched tick events ride an \`events\` array. */
        const evs = (m && m.payload && m.payload.events) || m.events;
        if (Array.isArray(evs)) for (const ev of evs) {
          const et = ev && (ev.type || ev.event);
          if (KEEP_IN.has(et)) note({ dir: 'in', t: Date.now(), type: et, payload: ev.payload, batched: true });
        }
      } catch (err) {}
    });
    const origSend = ws.send.bind(ws);
    ws.send = (d) => {
      try {
        const m = typeof d === 'string' ? JSON.parse(d) : null;
        const t = m && (m.type || m.event);
        if (t === 'loot_pickup') note({ dir: 'out', t: Date.now(), type: t, payload: m.payload, state: snap() });
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

/* Kill the nearest live monster the way a player does, and report the pile the
   instant it lands (a fast collect would otherwise be gone before any
   post-hoc read). Copied from mp-lootmagnet's dashKill — same shim, same
   worker gates. */
async function dashKill(P) {
  return P.page.evaluate(async () => {
    const S = window._gameState.current;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
    if (!live.length) return { none: true };
    live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y)
      - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const m = live[0];
    const id = m.id;
    S.rpg.activeSlot = 'melee';
    S._shieldUp = false;

    let seen = null;
    const known = new Set((S.groundLoot || []).map((l) => l && l.lootId));
    const watcher = setInterval(() => {
      if (seen) return;
      const pile = (S.groundLoot || []).find((l) => l && l._serverLoot && l.lootId && !known.has(l.lootId));
      if (!pile) return;
      seen = { lootId: pile.lootId, coins: pile.coins || 0,
        ax: pile._sx === undefined ? pile.x : pile._sx,
        ay: pile._sy === undefined ? pile.y : pile._sy,
        recipients: pile.recipients || null, isDeathDrop: !!pile.isDeathDrop,
        playerToAnchor: Math.round(Math.hypot(S.player.x - pile.x, (S.player.y - 15) - pile.y)) };
    }, 16);

    const hit = (special) => {
      if (S.channel) S.channel.send({ type: 'monster_damage', payload: {
        monsterId: id, zone: S.currentZone, element: null, slot: 'melee', special: !!special } });
    };
    const alive = () => {
      const cur = (S.monsters || []).find((x) => x.id === id);
      return cur && cur.alive !== false && (cur.curHp == null || cur.curHp > 0) ? cur : null;
    };

    const maxHp = m.maxHp || m.curHp || 1;
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const cur = alive();
      if (!cur || (cur.curHp != null && cur.curHp <= maxHp * 0.25)) break;
      hit(false);
      await sleep(260);
    }
    let lunges = 0;
    const t1 = Date.now();
    while (Date.now() - t1 < 20000 && alive()) {
      const cur = alive();
      S.lockedTarget = { type: 'monster', id: cur.id, ref: cur, src: 'tap' };
      S.rpg.stamina = S.rpg.maxStamina || 100;
      S._abilCd = null;
      if (window.__btMaybeSwordDash && window.__btMaybeSwordDash()) lunges++;
      const t2 = Date.now();
      while (Date.now() - t2 < 2700 && alive()) await sleep(100);
    }
    const t3 = Date.now();
    while (Date.now() - t3 < 6000 && !seen) await sleep(50);
    clearInterval(watcher);
    return { lunges, dead: !alive(), seen, gold: S.rpg.coins };
  });
}

/* Wait for the pile to be collected or to give up, WITHOUT touching it. */
async function settle(P, lootId, ms) {
  return P.page.evaluate(async ({ id, budget }) => {
    const S = window._gameState.current;
    const sleep = (t) => new Promise((r) => setTimeout(r, t));
    const t0 = Date.now();
    let maxDrift = 0;
    while (Date.now() - t0 < budget) {
      const p = (S.groundLoot || []).find((l) => l && l.lootId === id);
      if (p && p._sx !== undefined) maxDrift = Math.max(maxDrift, Math.hypot(p.x - p._sx, p.y - p._sy));
      if (!p || p._collected) return { collected: true, ms: Date.now() - t0, gone: !p, maxDrift: Math.round(maxDrift) };
      await sleep(50);
    }
    const p = (S.groundLoot || []).find((l) => l && l.lootId === id);
    return { collected: false, ms: Date.now() - t0, maxDrift: Math.round(maxDrift),
      pile: p ? { x: Math.round(p.x), y: Math.round(p.y), sx: Math.round(p._sx), sy: Math.round(p._sy),
        lDist: Math.round(Math.hypot(S.player.x - p.x, (S.player.y - 15) - p.y)),
        anchorDist: Math.round(Math.hypot(S.player.x - p._sx, (S.player.y - 15) - p._sy)),
        drift: Math.round(Math.hypot(p.x - p._sx, p.y - p._sy)),
        pend: !!p._pickupPending, tries: p._pickupTries || 0, coll: !!p._collected,
        expired: !!p._expired, serverLoot: !!p._serverLoot, recipients: p.recipients || null } : null,
      player: { x: Math.round(S.player.x), y: Math.round(S.player.y), z: S.currentZone, myId: S.myId } };
  }, { id: lootId, budget: ms });
}

const WS = await H.freePort(), WEB = await H.freePort();
console.log('booting…');
const worker = await H.startWorker(WS);
const srv = await H.serveDist(WEB);
const browser = await H.launch();
let cleaned = false;
const cleanup = () => { if (!cleaned) { cleaned = true; try { H.stopWorker(worker); } catch {} } };
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('uncaughtException', (e) => { console.error(e); cleanup(); process.exit(1); });

const P = await H.newPlayer(browser, { name: 'Farmer', wsPort: WS, webPort: WEB, init: INIT });
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
await P.page.evaluate(() => {
  const S = window._gameState.current;
  if (S && S.channel) S.channel.send({ type: 'forge_weapon',
    payload: { weaponType: 'greatsword', tierKey: 'wood', isWoodwork: false } });
});
await P.page.waitForTimeout(2500);

const setup = await H.readState(P, (S) => ({ zone: S.currentZone, serverDriven: !!S._serverMonsters,
  weapon: S.rpg && S.rpg.weapon ? (S.rpg.weapon.name || S.rpg.weapon.type) : null,
  monsters: (S.monsters || []).filter((m) => m && m.alive !== false).length }));
console.log('setup: ' + JSON.stringify(setup) + ' myId=' + myId);
if (!setup.serverDriven || !setup.weapon) { console.log('SETUP FAILED'); await browser.close(); srv.close(); await H.stopWorker(worker); process.exit(2); }

let kills = 0, collected = 0, stuck = 0, noPile = 0;
for (let round = 1; round <= ROUNDS; round++) {
  const k = await dashKill(P);
  if (k.none) { console.log(`#${round} no live monster; waiting for respawn`); await P.page.waitForTimeout(8000); continue; }
  if (!k.dead) { console.log(`#${round} monster survived the budget`); continue; }
  kills++;
  if (!k.seen) { noPile++; console.log(`#${round} kill dropped no server pile`); continue; }

  /* A dash kill leaves the pile 76-107 px out; a player walks onto it. */
  await H.hopTo(P, k.seen.ax, k.seen.ay + 15);
  const s = await settle(P, k.seen.lootId, 9000);
  if (s.collected) {
    collected++;
    console.log(`#${round} OK  ${k.seen.lootId} in ${s.ms}ms (drift ${s.maxDrift})`);
    continue;
  }
  stuck++;
  console.log(`\n#${round} ===== STUCK PILE ${k.seen.lootId} =====`);
  console.log('  kill    : ' + JSON.stringify(k.seen));
  console.log('  settle  : ' + JSON.stringify(s));
  const log = await P.page.evaluate((id) => (window.__lootLog || [])
    .filter((e) => !e.payload || e.payload.lootId === id || (e.payload.pile && e.payload.pile.lootId === id) || e.type === 'zone_loot')
    .slice(-40), k.seen.lootId);
  const t0 = log.length ? log[0].t : 0;
  for (const e of log) {
    const rel = e.t - t0;
    if (e.dir === 'out') {
      const me = e.state && e.state.piles ? e.state.piles.find((x) => x.id === k.seen.lootId) : null;
      console.log(`  +${String(rel).padStart(6)}ms OUT loot_pickup ${JSON.stringify(e.payload)} player=${e.state ? e.state.px + ',' + e.state.py + '@' + e.state.z : '?'} pile=${me ? JSON.stringify(me) : 'n/a'}`);
    } else {
      console.log(`  +${String(rel).padStart(6)}ms IN  ${e.type} ${JSON.stringify(e.payload).slice(0, 400)}`);
    }
  }
  const [srvLoot, srvPlayer] = await Promise.all([
    fetch(`http://127.0.0.1:${WS}/api/admin/loot`, { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } }).then((r) => r.json()).catch((e) => ({ err: String(e) })),
    fetch(`http://127.0.0.1:${WS}/api/admin/player?id=${encodeURIComponent(myId)}`, { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } }).then((r) => r.json()).catch((e) => ({ err: String(e) })),
  ]);
  const mine = (srvLoot.piles || []).find((p) => p.lootId === k.seen.lootId);
  console.log('  WORKER pile  : ' + JSON.stringify(mine || null));
  console.log('  WORKER player: ' + JSON.stringify(srvPlayer.live || srvPlayer));
  console.log('  WORKER allPiles: ' + JSON.stringify((srvLoot.piles || []).map((p) => `${p.zone}/${p.lootId}`)));
  console.log('===================================\n');
}

console.log(`\nDONE  kills=${kills} collected=${collected} stuck=${stuck} noPile=${noPile}`);
await browser.close();
srv.close();
await H.stopWorker(worker);
process.exit(stuck ? 1 : 0);
