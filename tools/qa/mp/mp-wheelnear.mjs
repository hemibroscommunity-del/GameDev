/* ═══ INTO THE WHEEL WITH ONLY THE MONSTERS AROUND YOU (v2.3.3318) ═══
 * (server/src/wheelnear.js; docs/specs/wheel-arrival.md)
 *
 * The way into the Wheel sent every one of its 1,920 monsters, whole -- about
 * 480 KB of a 580 KB message, on every trip in.  A phone that says it can take
 * it (`wn: 1`, every phone from this version) is sent only the monsters around
 * it, and each other one whole when it first comes into reach.  On a phone
 * viewport, against a real worker, the game as a player gets it:
 *   1. the way in: the zone_state that brings you into the Wheel is marked
 *      `mnear` and carries only the monsters around you -- none in BroTown's
 *      square -- a fraction of the whole list a second phone gets with
 *      `?wheelwhole` (as every phone did before); and the game still runs the
 *      worker's monsters (S._serverMonsters), not ones of its own;
 *   2. walking out to Frost Ridge's first stretch, its monsters come into the
 *      list as they come into reach, each whole (`mw`): home, skin, level,
 *      health -- and drawn from the land's live art;
 *   3. the Flame Fields' fire goblins come whole the same way;
 *   4. a fire goblin met that way fights and dies to you, and the kill pays;
 *   5. back to Frost Ridge: never one twice, in the list or sent whole, and
 *      only what you came near (a fraction of the whole list);
 *   6. no page errors and no render errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* every frame the page receives, by kind: the way in's sizes, and the
   monsters that came whole in a tick (`mw`) */
const INIT = () => {
  const Native = window.WebSocket;
  const log = window.__qaWsIn = { zone: [], sync: [], mwTicks: 0, mwMonsters: 0, mwIds: [] };
  const Wrapped = function (url, protocols) {
    const ws = protocols === undefined ? new Native(url) : new Native(url, protocols);
    ws.addEventListener('message', (ev) => {
      const d = ev.data;
      if (typeof d !== 'string') return;
      const head = d.slice(0, 40);
      try {
        if (head.indexOf('"zone_state"') >= 0) {
          const m = JSON.parse(d);
          log.zone.push({ zone: m.zone, bytes: d.length, monsters: (m.monsters || []).length, mnear: m.mnear === 1, at: Date.now() });
        } else if (head.indexOf('"state_sync"') >= 0) {
          const m = JSON.parse(d);
          log.sync.push({ bytes: d.length, monsters: (m.monsters || []).length, near: m.monstersNear === 1, caps: !!(m.caps && m.caps.wheelnear), zone: m.monsterZone || null, at: Date.now() });
        } else if (head.indexOf('"tick"') >= 0 && d.indexOf('"mw":') > 0) {
          const m = JSON.parse(d);
          log.mwTicks++;
          for (const k of Object.keys(m.mw || {})) for (const q of m.mw[k]) { log.mwMonsters++; if (log.mwIds.length < 4000) log.mwIds.push(q.id); }
        }
      } catch (e) { /* a probe never breaks the game */ }
    });
    return ws;
  };
  Wrapped.prototype = Native.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Wrapped[k] = Native[k];
  window.WebSocket = Wrapped;
};

const SKIN = { frost: ['snowman'], ember: ['fireGoblin'] };
const isFirst = (m) => !/-t\d+-\d+$/.test(m.id);

/* the monsters the client holds, with what the renderer drew for each */
const monsters = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return (S.monsters || []).map((m) => {
    const sp = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null;
    return { id: m.id, home: m.home || null, arch: m.arch || m.archetype, x: Math.round(m.x), y: Math.round(m.y),
      alive: m.alive, hp: m.hp, curHp: m.curHp, level: m.level, sprite: sp ? { visible: sp.visible, texAlive: sp.texAlive } : null };
  });
});
const waitWheel = async (P, n = 240) => {
  for (let i = 0; i < n; i++) {
    const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (z === 'wheel') return z;
    await P.page.waitForTimeout(500);
  }
  return null;
};
const wsIn = (P) => P.page.evaluate(() => JSON.parse(JSON.stringify(window.__qaWsIn || null)));
/* the last way into the Wheel: a zone change's zone_state, or a join that
   landed in it (a reconnect: its state_sync, marked monstersNear) */
const arrivalOf = (log) => {
  const z = log ? log.zone.filter((q) => q.zone === 'wheel') : [];
  const s = log ? log.sync.filter((q) => q.zone === 'wheel') : [];
  const lz = z[z.length - 1], ls = s[s.length - 1];
  if (lz && (!ls || lz.at >= (ls.at || 0))) return { via: 'zone_state', bytes: lz.bytes, monsters: lz.monsters, mnear: lz.mnear };
  return ls ? { via: 'state_sync', bytes: ls.bytes, monsters: ls.monsters, mnear: ls.near } : null;
};

let firstThrow = null;
export async function run({ browser, wsPort, webPort, rec }) {
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const init = '(' + INIT.toString() + ')();';
  const P = await H.newPlayer(browser, { name: 'Nearbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init });
  const Q = await H.newPlayer(browser, { name: 'Wholebro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init, query: 'wheelwhole' });
  P.page.on('console', (m) => { if (!firstThrow && /app\.render threw/.test(m.text())) firstThrow = m.text(); });
  const pageErrors = [];
  P.page.on('pageerror', (e) => pageErrors.push(String(e && e.message || e)));

  /* real input on a loop: a page logs itself out after two minutes without
     any (Control does nothing in the game) -- the walks below are longer */
  let stopAlive = false;
  for (const X of [P, Q]) {
    (async () => {
      while (!stopAlive) {
        await X.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await X.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }

  /* ── 1. the way in ── */
  await H.enterWorld(P);
  await H.enterWorld(Q);
  const zP = await waitWheel(P), zQ = await waitWheel(Q);
  await P.page.waitForTimeout(2500);
  /* the whole list is ~580 KB: the local worker's socket takes a few seconds
     to carry it to the page after the zone has flipped (mp-wheelmonsters
     measured ~2.7 s) -- wait for each way in, up to 15 s more */
  let inP = await wsIn(P), inQ = await wsIn(Q);
  for (let i = 0; i < 60 && !(arrivalOf(inP) && arrivalOf(inQ)); i++) {
    await P.page.waitForTimeout(250);
    inP = await wsIn(P); inQ = await wsIn(Q);
  }
  const wayP = arrivalOf(inP), wayQ = arrivalOf(inQ);
  rec.ok(`setup: both phones in the Wheel (${zP}, ${zQ}), the worker says caps.wheelnear`,
    zP === 'wheel' && zQ === 'wheel' && !!inP && inP.sync.some((s) => s.caps), { zP, zQ, sync: inP && inP.sync });
  const heldP = await monsters(P);
  const srv = await H.readState(P, (S) => !!S._serverMonsters);
  rec.ok(`1. the way in (${wayP && wayP.via}) is marked near and carries only the monsters around you: ${wayP && wayP.monsters} in BroTown's square, the game still running the worker's (${srv}) and holding ${heldP.length}`,
    !!wayP && wayP.mnear && wayP.monsters <= 3 && srv && heldP.length === wayP.monsters, wayP);
  rec.ok(`1. ...${wayP ? Math.round(wayP.bytes / 1024) : '?'} KB, where the whole list (?wheelwhole, as before) is ${wayQ ? Math.round(wayQ.bytes / 1024) : '?'} KB with all ${wayQ && wayQ.monsters}`,
    !!wayP && !!wayQ && !wayQ.mnear && wayQ.monsters > 1000 && wayP.bytes < wayQ.bytes / 3, { wayP, wayQ });
  await Q.page.close().catch(() => {});

  /* ── 2. walking out: they come whole as they come into reach ── */
  const myId = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', myId).catch(() => {});                       /* past the Mayor's gate */
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 8 }).catch(() => {});
  await P.page.waitForTimeout(800);
  /* out to a land's first stretch: the middle of its baked places (the
     worker's own table), then the middle of the ones held */
  const walkTo = async (home) => {
    const pts = WHEEL_SPAWNS[home].points;
    const at = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
    const arrived = await H.hopTo(P, at[0], at[1] + 60, { tries: 260 });
    await P.page.waitForTimeout(1500);
    const mid = await P.page.evaluate((h) => {
      const ms = (window._gameState.current.monsters || []).filter((m) => m.home === h && m.alive !== false && !/-t\d+-\d+$/.test(m.id));
      if (!ms.length) return null;
      return { x: ms.reduce((a, m) => a + m.x, 0) / ms.length, y: ms.reduce((a, m) => a + m.y, 0) / ms.length };
    }, home);
    if (mid) await H.hopTo(P, mid.x, mid.y + 40, { tries: 60 });
    await P.page.waitForTimeout(1500);
    const me = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
    const sv = await H.serverPlayer(wsPort, myId).catch(() => null);
    const held = await monsters(P);
    const byHome = {};
    for (const m of held) byHome[m.home] = (byHome[m.home] || 0) + 1;
    console.log(`    walk to ${home}: arrived ${arrived}, the stretch's middle ${at.map(Math.round)}, you ${me.x},${me.y}, the worker has you at ${sv ? Math.round(sv.x) + ',' + Math.round(sv.y) : '?'}; held by land ${JSON.stringify(byHome)}`);
    return held.filter((m) => m.home === home && isFirst(m));
  };
  const snow = await walkTo('frost');
  const in2 = await wsIn(P);
  const wrong = snow.filter((m) => !SKIN.frost.includes(m.arch) || typeof m.level !== 'number' || !(m.hp > 0) || typeof m.curHp !== 'number');
  rec.ok(`2. out on Frost Ridge's first stretch its monsters came into the list as you came near (${snow.length} snowmen held; ${in2 && in2.mwMonsters} monsters came whole in ${in2 && in2.mwTicks} ticks)`,
    snow.length >= 6 && !!in2 && in2.mwMonsters >= snow.length && snow.every((m) => in2.mwIds.includes(m.id)), { n: snow.length, mw: in2 && in2.mwMonsters });
  rec.ok('2. ...each whole: its home, its skin (a snowman), its level and its health', wrong.length === 0, wrong.slice(0, 4));
  const snowDrawn = snow.filter((m) => m.sprite && m.sprite.visible && m.sprite.texAlive);
  rec.ok(`2. ...and drawn from the land's live art (${snowDrawn.length} of ${snow.length} bodies)`,
    snowDrawn.length >= 1 && snow.filter((m) => m.sprite).every((m) => m.sprite.texAlive), snow.map((m) => m.sprite).slice(0, 6));

  /* ── 3. the Flame Fields' come whole too ── */
  const gob = await walkTo('ember');
  rec.ok(`3. out at the Flame Fields their fire goblins came whole too (${gob.length} held)`,
    gob.length >= 6 && gob.every((m) => SKIN.ember.includes(m.arch) && typeof m.level === 'number'), gob.slice(0, 3));

  /* ── 4. a fight: a fire goblin (a snowman burrows into a pile that no hit
     lands on, mp-wheelmonsters fights a goblin too) ── */
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: false });
  const xpOf = () => H.readState(P, (S) => (S.rpg && S.rpg.xp) || 0);
  const xp0 = await xpOf();
  let killed = null;
  const rounds = [];
  for (let round = 0; round < 12 && !killed; round++) {
    const target = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = (S.monsters || []).filter((x) => x && x.home === 'ember' && x.alive !== false && x.hp > 0 && !/-t\d+-\d+$/.test(x.id))
        .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
      return m ? { id: m.id, zone: S.currentZone, x: m.x, y: m.y, curHp: m.curHp } : null;
    });
    if (!target) { await P.page.waitForTimeout(500); continue; }
    await H.hopTo(P, target.x, target.y + 10, { step: 60, tries: 20 });
    for (let swing = 0; swing < 12; swing++) {
      await H.sendEvent(P, 'monster_damage', { monsterId: target.id, zone: target.zone, slot: 'melee' });
      await P.page.waitForTimeout(120);
    }
    const after = await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x && x.id === id);
      return m ? { alive: m.alive, curHp: m.curHp } : null;
    }, target.id);
    if (rounds.length < 4) rounds.push({ id: target.id, before: target.curHp, after });
    if (after && after.alive === false) killed = { id: target.id };
  }
  console.log('    fight: ' + JSON.stringify(rounds));
  await P.page.waitForTimeout(1200);
  const xp1 = await xpOf();
  rec.ok(`4. a fire goblin met that way fights and dies to you, and the kill pays (xp ${xp0} -> ${xp1})`, !!killed && xp1 > xp0, { killed, xp0, xp1, rounds });

  /* ── 5. back to Frost Ridge: never one twice ── */
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 5 });
  const back = await walkTo('frost');
  const all = await monsters(P);
  const ids = all.map((m) => m.id);
  const in5 = await wsIn(P);
  const twice = in5 ? in5.mwIds.filter((id, i) => in5.mwIds.indexOf(id) !== i) : ['?'];
  rec.ok(`5. back to Frost Ridge: ${ids.length} held, none twice in the list, none sent whole twice`,
    back.length >= 6 && new Set(ids).size === ids.length && twice.length === 0,
    { held: ids.length, unique: new Set(ids).size, twice: twice.slice(0, 5) });
  rec.ok(`5. ...and only what you came near: ${ids.length} of the ${wayQ ? wayQ.monsters : '?'} the whole list holds`,
    !!wayQ && ids.length < wayQ.monsters / 3, { held: ids.length, whole: wayQ && wayQ.monsters });

  /* ── 6. ── */
  rec.ok('6. no page errors, and no render errors', pageErrors.length === 0 && !firstThrow, { errors: pageErrors.slice(0, 5), firstThrow });
  stopAlive = true;
  await P.page.close().catch(() => {});
}
