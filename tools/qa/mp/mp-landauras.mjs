/* ═══ v2.3.3346: EACH LAND'S TREES AND ROCKS WEAR ITS ELEMENT, ON A PHONE ═══
 *
 * src/rendering/landAuras.js: a resource in one of the Wheel's eight lands
 * makes specks of its element round its picture (snow, embers, sand, dust and
 * glints, sparks, drips, spores, petals and fireflies); the commons' wear
 * nothing.  On a phone (390 x 844, 3x) in the Wheel, the player put beside
 * the nearest tree and the nearest rock of each land in turn (the page's own
 * position: the specks are the page's alone, and nothing here asks the
 * worker), and beside the commons' pine:
 *   1. the commons' pine makes none;
 *   2. each land's tree and rock make specks of THAT land (`byLand`), riding
 *      on the resource's picture (`_ridesOn`, the depth pass's rider, so they
 *      are drawn just in front of it and behind anyone south of it), every
 *      one inside the resource's box grown by 120 px;
 *   3. never more than AURA_MAX alive;
 * and back at the commons' pine, every land's let go.
 * Pictures: tools/qa/mp/out/landauras-<land>.png -- what the owner looks at.
 *
 *   node tools/qa/mp/run.mjs landauras
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const LANDS = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];

const put = (P, x, y) => P.page.evaluate(({ x, y }) => {
  const S = window._gameState.current;
  S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0;
}, { x, y });

const probe = (P, id) => P.page.evaluate((nid) => {
  const R = window._pixiRenderer;
  return R && R.landAuraProbe ? R.landAuraProbe(nid) : null;
}, id);

async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {});
      continue;
    }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Aurabro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel, with its resources (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    for (const k of ['woodcutting_axe', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 40 });
    const tools = await H.waitFor(P, (S) => ['woodcutting_axe', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
      (n) => n === 2, { timeout: 20000, label: 'the tools' }).catch(() => 0);
    rec.ok('the axe and the pickaxe in the bag, so the resources are drawn (guard)', tools === 2, tools);
    /* out past the Mayor's gate: until tut_1 a new bro is held on the safe commons */
    await P.page.evaluate(() => { window._gameState.current.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    await H.waitFor(P, (S) => ((S.rpg || {})._quests || {}).tut_1 || null, (v) => v === 'active', { timeout: 10000, label: 'tut_1' }).catch(() => null);
    await closeTalk(P);

    /* each land's nearest tree and rock to BroTown, and the commons' pine */
    const spots = await P.page.evaluate((lands) => {
      const S = window._gameState.current;
      const landOf = (n) => (/^wn-([a-z]+)-/.exec(String(n.id)) || [])[1] || null;
      const live = (S.gatherNodes || []).filter((n) => n && n.alive !== false && (n.nodeType === 'tree' || n.nodeType === 'oreVein'));
      const near = (land, type) => live.filter((n) => landOf(n) === land && n.nodeType === type)
        .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0] || null;
      const out = [];
      const c = near('commons', 'tree');
      if (c) out.push({ land: 'commons', type: 'tree', id: c.id, x: c.x, y: c.y });
      for (const land of lands) for (const type of ['tree', 'oreVein']) {
        const n = near(land, type);
        if (n) out.push({ land, type, id: n.id, x: n.x, y: n.y });
      }
      return out;
    }, LANDS);
    rec.ok('a tree and a rock in each of the eight lands, and the commons\' pine (guard)',
      spots.filter((s) => s.land !== 'commons').length === 16 && !!spots[0] && spots[0].land === 'commons', spots.map((s) => s.land + ':' + s.type));

    let maxLive = 0;
    for (const s of spots) {
      /* beside it, a little south-east, so the picture shows the resource and its specks */
      await put(P, s.x + 90, s.y + 70);
      const what = s.type === 'tree' ? 'tree' : 'rock';
      if (s.land === 'commons') {
        await P.page.waitForTimeout(3000);
        const pr = await probe(P, s.id);
        rec.ok('the commons\' pine wears nothing', !!pr && !pr.node && !(pr.byLand && pr.byLand.commons), pr);
        continue;
      }
      /* the specks are made on the game's own clock, capped at 100 ms a frame,
         and this box draws a few frames a second: waited for, not timed */
      let got = null;
      for (let i = 0; i < 40; i++) {
        await P.page.waitForTimeout(400);
        got = await probe(P, s.id);
        maxLive = Math.max(maxLive, (got && got.live) || 0);
        if (got && got.node && got.node.parts >= 2) break;
      }
      const n = got && got.node;
      rec.ok(`${s.land} ${what}: makes specks of its land, riding on its picture, every one inside its box`,
        !!n && n.land === s.land && n.parts >= 2 && n.rides === true && n.outside === 0, { n, live: got && got.live });
      if (s.type === 'tree') {
        await P.page.waitForTimeout(1200);
        const clip = await P.page.evaluate(({ x, y }) => {
          const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
          const sx = rc.left + (x - S.camera.x) * (S._worldScaleX || 1), sy = rc.top + (y - S.camera.y) * (S._worldScaleY || 1);
          return { x: Math.max(0, sx - 170), y: Math.max(0, sy - 320), width: 340, height: 380 };
        }, s);
        await P.page.screenshot({ path: join(OUT, `landauras-${s.land}.png`), clip }).catch(() => {});
      }
    }
    const cap = await P.page.evaluate(() => (window._pixiRenderer.landAuraCap ? window._pixiRenderer.landAuraCap() : null));
    rec.ok(`never more than the cap alive (${maxLive} at most, the cap ${cap})`, cap != null && maxLive <= cap, { maxLive, cap });

    /* back at the commons' pine: every land's specks let go */
    const home = spots[0];
    await put(P, home.x + 90, home.y + 70);
    let back = null;
    for (let i = 0; i < 20; i++) {
      await P.page.waitForTimeout(400);
      back = await probe(P, null);
      if (back && back.resources === 0 && back.live === 0) break;
    }
    rec.ok('back on the commons, every land\'s specks let go', !!back && back.resources === 0 && back.live === 0, back);
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
