/* ═══ v2.3.2033: THE DROP ITSELF, AGAINST A REAL WORKER — not on the CI path ═══
 *
 * THE GAP THIS FILLS, said plainly. mp-cape.mjs covers the half of the
 * contest AFTER a ticket exists: the Open, the worker consuming it, the cape
 * rendering, the jog offsets, the swing. It gets its ticket from
 * POST /api/admin/grant. So the drop -- kill a monster, roll, ticket lands in
 * the bag -- had only ever run against MOCKED DO storage in
 * server/test/eventcapes.test.mjs with an injected roll function.
 *
 * That matters more than it usually would, for a specific reason: EVENT_LIVE
 * ships false, so on the morning of the contest the flip to true would be the
 * FIRST TIME that path ever executed in a real worker. A contest whose drop
 * has never actually dropped is not a tested contest.
 *
 * WHAT THIS DRIVES FOR REAL: a real worker (wrangler dev --local), a real
 * browser, a real zone with server-spawned monsters, and the game's own
 * auto-attack loop -- the same machinery mp-questkill uses. The verdict is
 * read from the WORKER's persisted inventory via the operator endpoint, never
 * from the client's copy: the client credits itself nothing here, and asking
 * it would be asking the wrong end anyway.
 *
 * THE ONE LIBERTY, and it is the same one mp-questkill takes: the character
 * is stood next to the monster rather than walked there. Pathing is another
 * file's subject and a walk would make this a joystick test.
 *
 * EVENT_LIVE IS PATCHED TO TRUE FOR THE RUN and restored in a finally. It is
 * a deploy-time constant, so there is no other way to exercise the live
 * branch against a real worker -- and the live branch is the entire point.
 * The restore is asserted at the end rather than assumed, because a harness
 * that leaves the contest switched on in the working tree would be a very
 * expensive convenience.
 *
 * IT ALSO CHECKS THE DRAW PAGE AGAINST REALITY. tools/qa/draw-page.mjs proves
 * the page's logic against a fixture I wrote, which cannot catch the fixture
 * being wrong. Here the leaderboard row comes from the real worker, and the
 * page's own entrantsFrom runs over it.
 *
 *   node tools/qa/cape-drop.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as H from './mp/harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); }
};

const SRC = path.join(REPO, 'server/src/eventcapes.js');
const ORIGINAL = fs.readFileSync(SRC, 'utf8');
const LIVE_OFF = 'export const EVENT_LIVE = false;';
const LIVE_ON = 'export const EVENT_LIVE = true;';

let worker = null, web = null, browser = null, drawSrv = null;

console.log('cape-drop:');

try {
  /* ── switch the contest on, for this run only ── */
  if (!ORIGINAL.includes(LIVE_OFF)) {
    throw new Error('EVENT_LIVE is not `false` in the tree — refusing to patch blind');
  }
  fs.writeFileSync(SRC, ORIGINAL.replace(LIVE_OFF, LIVE_ON));
  ok('the contest was switched on for the run (guard)',
    fs.readFileSync(SRC, 'utf8').includes(LIVE_ON));

  const wsPort = await H.freePort();
  const webPort = await H.freePort();
  web = await H.serveDist(webPort);
  worker = await H.startWorker(wsPort);

  /* Rate 1 = every kill drops, so the run is bounded. The CAP of three and
     the one-per-account refusal are the unit suite's job; what cannot be
     faked there is that the roll is reached at all on a real kill. */
  const flagRes = await fetch(`http://127.0.0.1:${wsPort}/api/admin/flags`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'event_cape_rate', value: 1 }),
  }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));
  ok('the drop rate could be forced to 1 through the operator API (guard)',
    flagRes && flagRes.ok !== false, flagRes);

  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const P = await H.newPlayer(browser, { name: 'Dropper', wsPort, webPort, guest: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  const pid = await H.readState(P, (S) => S.myId);
  ok('the player has a server identity (guard)', !!pid, { pid });

  const bag = async () => {
    const a = await H.adminPlayer(wsPort, pid);
    return (a && a.rpg && a.rpg.inventory) || {};
  };
  const before = await bag();
  ok('control: the bag holds no ticket before any kill',
    !before.goldticket_crimson, before.goldticket_crimson);

  /* ── ARM UP AT THE MAYOR FIRST ──
     The first run of this file skipped him and never left town, which was
     the harness being wrong and the GAME being right: v2.3.1676 deliberately
     gates the town exit on speaking to Mayor Bro, who hands over the sword
     and shield ("not allowed to leave town without speaking to mayor bro
     first"). Without that, there is no exit and no weapon -- so a drop test
     that skips it measures nothing twice over.
     Worth stating for the contest itself: this is the real first minute of a
     new player's session, and it happens before a single monster can be hit. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (S && npc && S.player) { S.player.x = npc.x + 420; S.player.y = npc.y; }
  });
  await P.page.waitForTimeout(600);
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (S && npc && S.player) { S.player.x = npc.x; S.player.y = npc.y + 34; }
  });
  await P.page.waitForTimeout(1400);
  await H.advanceNpcDialogue(P).catch(() => {});
  await H.confirmQuestOffer(P).catch(() => {});
  await P.page.waitForTimeout(3000);

  const armedBag = await H.adminPlayer(wsPort, pid).then((a) => (a && a.rpg) || {});
  ok('the Mayor armed the character (guard: an unarmed player kills nothing)',
    (armedBag.weaponStash || []).some((w) => w && w.type) || !!armedBag.weapon,
    { weaponStash: armedBag.weaponStash, weapon: armedBag.weapon });

  /* Equip it, or the swing is a punch.  `equip_request` with {stashIdx, slot}
     is the real shape (gear.js _handleEquipRequest); the first draft invented
     `equip_weapon`/{index}, which the switch has no case for -- the worker
     would have silently relayed nothing and the hunt would have failed for a
     reason that looked like the drop being broken. */
  const stashIdx = (armedBag.weaponStash || []).findIndex((w) => w && w.type);
  await P.page.evaluate((idx) => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) {
      S.channel.send({ type: 'equip_request', payload: { stashIdx: idx, slot: 'weapon' } });
    }
  }, stashIdx < 0 ? 0 : stashIdx);
  await P.page.waitForTimeout(2000);
  const armedNow = await H.adminPlayer(wsPort, pid).then((a) => (a && a.rpg) || {});
  ok('the weapon is equipped (guard: an unarmed swing would fail this test for '
     + 'the wrong reason)', !!armedNow.weapon, { weapon: armedNow.weapon });

  /* ── travel to a zone that spawns things, on the game's own trail-heads ── */
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.TOWN_EXITS || !f.WORLDVIEW_EXITS) return null;
    return {
      out: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview'),
      hunt: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'meadow')
         || f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'frost'),
    };
  });
  ok('the trail-heads are on the autotest bridge (guard)', !!(marks && marks.hunt), marks);

  const stand = (tx, ty) => P.page.evaluate(({ x, y }) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return false;
    S.player.x = x * 32 + 16; S.player.y = y * 32 + 16;
    return true;
  }, { x: tx, y: ty });
  const travel = async (tx, ty, zoneId) => {
    for (let i = 0; i < 8; i++) {
      await stand(tx, ty);
      const got = await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId,
        { timeout: 6000, label: 'reach ' + zoneId }).catch(() => null);
      if (got === zoneId) return true;
    }
    return (await H.readState(P, (S) => S.currentZone)) === zoneId;
  };
  const huntZone = marks && marks.hunt && marks.hunt.zoneId;
  await travel(marks.out.tx, marks.out.ty, 'worldview');
  ok('the character walked into a hunting zone',
    await travel(marks.hunt.tx, marks.hunt.ty, huntZone),
    await H.readState(P, (S) => S.currentZone));
  await P.page.waitForTimeout(2500);

  const spawned = await H.waitFor(P,
    (S) => (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp === undefined || m.curHp > 0)).length,
    (n) => n > 0, { timeout: 20000, label: 'zone has monsters' }).catch(() => 0);
  ok('the zone actually spawned something to kill (guard: otherwise "no drop" ' +
     'and "no monster" are the same result)', spawned > 0, { alive: spawned });

  /* ── the hunt ── the game's own auto-attack, re-targeting every pass ── */
  let ticket = 0;
  const passes = [];
  for (let i = 0; i < 60 && ticket === 0; i++) {
    const step = await P.page.evaluate((zone) => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.player) return { err: 'no-state' };
      if (S.rpg && S.rpg.hp !== undefined && S.rpg.hp <= 0) return { err: 'dead' };
      if (S.currentZone !== zone) return { err: 'left-zone', zone: S.currentZone };
      const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp === undefined || m.curHp > 0));
      if (!live.length) return { act: 'wait-respawn' };
      const P0 = S.player;
      let tgt = live[0], td = Infinity;
      for (const m of live) {
        const d = Math.hypot(m.x - P0.x, m.y - P0.y);
        if (d < td) { td = d; tgt = m; }
      }
      /* Below it and facing up: the swing is a cone off P.dir. */
      P0.x = tgt.x; P0.y = tgt.y + 26; P0.dir = 'up';
      S.autoAttack = true;
      return { act: 'fight', hp: Math.round(tgt.curHp || 0) };
    }, huntZone);
    if (step && step.err === 'dead') { passes.push(step); break; }
    await P.page.waitForTimeout(900);
    const inv = await bag();
    ticket = inv.goldticket_crimson || 0;
    if (i % 10 === 0) passes.push({ pass: i, act: step && (step.act || step.err) });
  }

  /* ── THE ASSERTION THIS FILE EXISTS FOR ── */
  ok('a REAL kill dropped a golden ticket into the worker-held bag ' +
     '(no grant involved)', ticket > 0, { ticket, passes });

  const kills = await H.adminPlayer(wsPort, pid)
    .then((a) => (a && a.live && a.live.svKills) || (a && a.rpg && a.rpg.svKills) || 0)
    .catch(() => 0);
  ok('...and the server counted real kills to get there (guard: a ticket with ' +
     'zero kills would mean it came from somewhere else)', kills > 0, { kills });

  /* ── and it redeems, through the same message the Open button sends ── */
  if (ticket > 0) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) {
        S.channel.send({ type: 'cape_redeem',
          payload: { invKey: 'goldticket_crimson', opId: 'cape-drop-' + Date.now() } });
      }
    });
    await P.page.waitForTimeout(2500);
    const after = await bag();
    ok('the worker consumed the dropped ticket on redeem',
      !after.goldticket_crimson, after.goldticket_crimson);
    /* Read the RENDERED sprite, not S.rpg.cape.  The first draft read
       S.rpg.cape and S.player.cape and got null on a run where the redeem had
       plainly worked -- the client keeps the cape in the capeCatalog module
       (`_active`, set from the player_state echo) and reflects it on the
       sprite; it is never written onto the rpg blob. Reading the sprite is
       also the stronger claim: it says the cape reached the screen, not just
       that a variable was set. */
    await P.page.waitForTimeout(1200);
    const worn = await P.page.evaluate(() => {
      const r = window._pixiRenderer;
      const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
      const c = pd && pd._capeSprite, b = pd && pd._spriteBody;
      return { cape: c ? { visible: !!c.visible, tex: !!(c.texture && c.texture.frame) } : null,
               body: b ? { visible: !!b.visible } : null };
    });
    ok('...and the cape the drop paid for is DRAWN on the character',
      !!(worn && worn.cape && worn.cape.visible && worn.cape.tex), worn);
    ok('...with the body drawn under it (guard: otherwise "visible" means nothing)',
      !!(worn && worn.body && worn.body.visible), worn);
  }

  /* ── the draw page, against a REAL leaderboard row ──
     draw-page.mjs proves the logic against a fixture I wrote, which cannot
     catch the fixture being wrong about the shape. This can. */
  const board = await fetch(`http://127.0.0.1:${wsPort}/api/leaderboard/top?category=level&limit=100`)
    .then((r) => r.json()).catch((e) => ({ error: String(e) }));
  const rows = (board && board.results) || [];
  ok('the real leaderboard answers with a results array', Array.isArray(rows) && rows.length > 0,
    { keys: Object.keys(board || {}), n: rows.length });

  const mine = rows.find((r) => r && r.id === pid) || rows[0];
  ok('a real row carries the fields the draw page reads (id, name, level, lastSeen)',
    !!(mine && mine.id && mine.name && typeof mine.level === 'number' && typeof mine.lastSeen === 'number'),
    mine);
  /* series.kills is OMITTED WHEN ZERO -- chainscore.js:201 is literally
     `if (kills > 0) out.kills = kills`.  The first draft demanded the key and
     failed on a row the server had written correctly: the row this test reads
     is the JOIN-time one, and reportToLeaderboard is throttled at 5 minutes
     minimum, so the kills this run made had not been written back yet.
     That is not a bug, it is exactly the throttle the draw page already warns
     the operator about ("wait 10 minutes after the last player stops"), now
     observed rather than assumed.  So assert the real contract: the key is
     either absent or a number, and the page must survive both. */
  const sk = mine && mine.series && mine.series.kills;
  ok('series.kills is absent-or-numeric, the contract the page codes against',
    sk === undefined || typeof sk === 'number', mine && mine.series);
  ok('...and the page reads a row with no series.kills as 0 rather than undefined',
    true === await (async () => {
      const probe = [{ id: 'x', name: 'NoKills', level: 9, lastSeen: Date.now(), series: {} }];
      const dp = await (await browser.newContext()).newPage();
      const html = fs.readFileSync(path.join(REPO, 'public/tools/draw.html'), 'utf8');
      const srv2 = http.createServer((q, r2) => { r2.writeHead(200, { 'Content-Type': 'text/html' }); r2.end(html); });
      await new Promise((r3) => srv2.listen(0, '127.0.0.1', r3));
      await dp.goto('http://127.0.0.1:' + srv2.address().port, { waitUntil: 'load' });
      const out = await dp.evaluate((rs) => window.__draw.entrantsFrom(rs, 0, Date.now() + 6e4, 0), probe);
      srv2.close();
      return out.length === 1 && out[0].kills === 0;
    })());

  /* Run the shipped page's own function over the real rows. */
  const drawHtml = fs.readFileSync(path.join(REPO, 'public/tools/draw.html'), 'utf8');
  drawSrv = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(drawHtml);
  });
  await new Promise((r) => drawSrv.listen(0, '127.0.0.1', r));
  const dPage = await (await browser.newContext()).newPage();
  await dPage.goto('http://127.0.0.1:' + drawSrv.address().port, { waitUntil: 'load' });
  const picked = await dPage.evaluate(([rs, lo, hi]) =>
    window.__draw.entrantsFrom(rs, lo, hi, 0), [rows, 0, Date.now() + 60000]);
  ok('the draw page accepts REAL leaderboard rows and finds the player',
    picked.length > 0 && picked.some((e) => e.name), picked);
  const gated = await dPage.evaluate(([rs, lo, hi]) =>
    window.__draw.entrantsFrom(rs, lo, hi, 5), [rows, 0, Date.now() + 60000]);
  ok('...and the level-5 gate runs over real rows without throwing',
    Array.isArray(gated), gated);
  console.log('      (real row: ' + JSON.stringify({
    level: mine && mine.level, kills: mine && mine.series && mine.series.kills,
  }) + ', ' + picked.length + ' entrant(s) at floor 0, ' + gated.length + ' at floor 5)');
} catch (e) {
  fail++;
  console.log('  FAIL harness threw: ' + (e && e.stack ? e.stack.split('\n')[0] : e));
} finally {
  /* THE RESTORE IS NOT OPTIONAL. Leaving EVENT_LIVE true in the tree would
     start the contest on the next merge, silently. */
  try { fs.writeFileSync(SRC, ORIGINAL); } catch (e) { /* reported below */ }
  const restored = (() => {
    try { return fs.readFileSync(SRC, 'utf8') === ORIGINAL; } catch { return false; }
  })();
  ok('EVENT_LIVE was restored to exactly what it was before the run', restored);

  try { if (drawSrv) drawSrv.close(); } catch { /* best effort */ }
  try { if (browser) await browser.close(); } catch { /* best effort */ }
  try { if (web) await web.close(); } catch { /* best effort */ }
  try { await H.stopWorker(worker); } catch { /* best effort */ }
}

console.log(`\ncape-drop: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
