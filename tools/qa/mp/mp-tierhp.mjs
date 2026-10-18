/* ═══ EACH TIER TWICE AS LONG AS THE ONE BEFORE, ON A PHONE (v2.3.3251) ═══
 *
 * The owner, 2026-10-14: "I want each tiers unlocks (lvl 5 required, lvl 10
 * required, etc) to take about 2x longer on average than the previous tier's
 * lowest level extraction time.  You can figure out what "hp" to give the
 * resources during extraction."
 *
 * The worker's HP table (server/src/gathering.js GATHER_NODE_HP) is solved and
 * held to the rule by the gather-hits suite's section 12, and the game's copy
 * to the worker's by mirror-audit.  What only a browser shows:
 *   1. the worker advertises caps.nodehp;
 *   2. an IRON vein (tier 6, open at Mining 1 beside copper) mined at Mining 1:
 *      the plan the game plays is the worker's, 20 HP in twenty hits of 1 --
 *      twice copper's ten -- and the vein's bar reads "20/20" down to "0/20";
 *   3. while those hits run the 2-minute idle logout does not count them as
 *      idleness (an input 115 s back is stamped fresh, nobody logged out);
 *   4. a SOFTWOOD tree (tier 6, Woodcutting 5) tried at Woodcutting 1: the
 *      locked try's bar, the game's own copy of the table, reads "40/40";
 *   5. no page errors.
 * Picture: tools/qa/mp/out/tierhp-iron.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const STAND = { oreVein: [0, -70], tree: [0, -130] };   /* where a worker stands (mp-wheelnodes) */

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Tierbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  /* a key now and then so the 2-minute idle logout leaves the walk alone --
     held off while section 3 reads the idle clock */
  let stopAlive = false, holdAlive = false;
  (async () => {
    while (!stopAlive) {
      if (!holdAlive) await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 30 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(P);
    await P.page.evaluate(() => { window.__btProbe = true; });
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel, with its resources (guard)', !!inW, inW);
    if (!inW) return;
    const caps = await H.readState(P, (S) => ({ nodehp: S._serverCaps && S._serverCaps.nodehp, hits: S._serverCaps && S._serverCaps.gatherhits }));
    rec.ok('the worker advertises caps.nodehp (and caps.gatherhits)', caps.nodehp === true && caps.hits === true, caps);
    const myId = await H.readState(P, (S) => S.myId);
    for (const k of ['mining_pickaxe', 'woodcutting_axe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.devOp(wsPort, 'quests', myId);   /* past the Mayor's gate: the tier-6 ring is outside the safe commons */
    const lv = await H.devOp(wsPort, 'lifeskill', myId, { skill: 'hits', level: 1 });
    rec.ok('the lever sets the four hit skills to level 1 (guard)', !!lv && lv.ok === true, lv);
    const tools = await H.waitFor(P, (S) => ['mining_pickaxe', 'woodcutting_axe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
      (n) => n === 2, { timeout: 20000, label: 'the tools' }).catch(() => 0);
    rec.ok('the pickaxe and the axe are in the bag (guard)', tools === 2, tools);
    await closeTalk(P);

    /* ── 2-3. an iron vein at Mining 1 ── */
    const iron = await nearest(P, 'oreVein', 6);
    rec.ok('an iron vein (tier 6) on the map (guard)', !!iron, iron);
    if (iron) {
      const there = await H.hopTo(P, iron.x + STAND.oreVein[0], iron.y + STAND.oreVein[1], { step: 90, gap: 260, tries: 160 });
      rec.ok('walked to the iron vein (guard)', there === true, { iron });
      await P.page.waitForTimeout(600);
      await closeTalk(P);
      const started = await tapNode(P, iron.id, (S) => !!S._extraction && S._extraction.skill === 'mining');
      rec.ok('tapping it starts a Mining harvest (guard)', started === true);
      const plan = started ? await H.waitFor(P, (S) => (S._extraction && S._extraction.hits && S._extraction.hits.plan)
        ? { plan: S._extraction.hits.plan.slice(), maxHp: S._extraction.hits.maxHp } : null,
      (v) => !!v, { timeout: 8000, label: 'the plan' }).catch(() => null) : null;
      const srv = await H.adminPlayer(wsPort, myId).then((a) => ((a && a.live) || {}).hitPlan || null).catch(() => null);
      rec.ok('iron at Mining 1 is 20 HP: twenty hits of 1, twice copper\'s ten, the worker\'s own plan',
        !!plan && plan.maxHp === 20 && plan.plan.length === 20 && plan.plan.every((d) => d === 1)
          && !!srv && srv.hp === 20 && JSON.stringify(srv.hits) === JSON.stringify(plan.plan), { plan, srv });
      await P.page.waitForTimeout(400);
      const bar = await P.page.evaluate(() => Object.assign({}, window.__btNodeHpBar || {}));
      rec.ok('the vein\'s bar reads n/20 as the hits land', bar.show === true && /^\d+\/20$/.test(String(bar.text || '')), bar);

      /* 3. the idle clock: an input 115 s back, then nothing touched */
      holdAlive = true;
      /* v2.3.3403: what the 2.5 s must hold is hits LANDING in it, counted --
         not the harvest still waiting at its end: on this box the waits and
         the picture before it had taken long enough that the twentieth hit
         came inside it (waiting false, the stamp and the 1.9 s "away" right,
         the run of 2026-10-18).  The picture is taken after it now. */
      const idle = await P.page.evaluate(async () => {
        const S = window._gameState.current;
        const shownOf = () => (S._extraction && S._extraction.hits ? S._extraction.hits.shown : null);
        const shown0 = shownOf();
        S._lastInputAt = Date.now() - 115000;
        const t0 = Date.now();
        await new Promise((r) => setTimeout(r, 2500));
        const shown1 = shownOf();
        return { stamped: S._lastInputAt >= t0, waiting: !!S._extraction && S._extraction.status === 'waiting',
          hitsIn: shown0 != null && shown1 != null ? shown1 - shown0 : null, away: Date.now() - S._lastInputAt };
      });
      rec.ok(`while the hits run the idle logout does not count them as idleness (an input 115 s old is stamped fresh; ${idle.hitsIn} hits landed in the 2.5 s)`,
        idle.stamped === true && idle.hitsIn > 0 && idle.away < 3000, idle);
      await P.page.screenshot({ path: join(OUT, 'tierhp-iron.png') }).catch(() => {});
      holdAlive = false;
      const done = await H.waitFor(P, (S) => {
        const ex = S._extraction;
        return ex && ex.hits ? { status: ex.status, hp: ex.hits.hp, shown: ex.hits.shown, n: (ex.hits.plan || []).length } : null;
      }, (v) => !!v && v.status === 'ready', { timeout: 25000, label: 'the hits land' }).catch(() => null);
      const bar0 = await P.page.evaluate(() => Object.assign({}, window.__btNodeHpBar || {}));
      rec.ok('all twenty land and the bar reads 0/20', !!done && done.hp === 0 && done.shown === 20 && bar0.text === '0/20', { done, text: bar0.text });
      const status = await H.readState(P, (S) => S._realtimeStatus || null);
      rec.ok('...and nobody was logged out (idleLogout sets _realtimeStatus \'idle\')', status !== 'idle', status);
      await P.page.evaluate(() => { window._gameState.current._extraction = null; });
    }

    /* ── 4. a softwood tree tried at Woodcutting 1: the locked try's bar ── */
    await closeTalk(P);
    const soft = await nearest(P, 'tree', 6);
    rec.ok('a softwood tree (tier 6) on the map (guard)', !!soft, soft);
    if (soft) {
      const there = await H.hopTo(P, soft.x + STAND.tree[0], soft.y + STAND.tree[1], { step: 90, gap: 260, tries: 160 });
      rec.ok('walked to the softwood tree (guard)', there === true, { soft });
      await P.page.waitForTimeout(600);
      await closeTalk(P);
      const tried = await tapNode(P, soft.id, (S) => !!S._extraction && !!S._extraction.locked);
      const t = await H.readState(P, (S) => (S._extraction && S._extraction.hits) ? { maxHp: S._extraction.hits.maxHp, locked: S._extraction.locked } : null);
      await P.page.waitForTimeout(300);
      const bar = await P.page.evaluate(() => Object.assign({}, window.__btNodeHpBar || {}));
      rec.ok('a softwood tree tried at Woodcutting 1 is a locked try whose bar is the game\'s copy of the table: 40/40',
        tried === true && !!t && t.maxHp === 40 && !!t.locked && t.locked.need === 5 && /\/40$/.test(String(bar.text || '')), { t, text: bar.text });
      await P.page.evaluate(() => { window._gameState.current._extraction = null; });
    }
    rec.ok('no page errors', errors.length === 0, errors);
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}

/* the nearest live node of a type and tier */
const nearest = (P, type, tier) => P.page.evaluate(([t, g]) => {
  const S = window._gameState.current, p = S.player;
  let best = null, d = Infinity;
  for (const n of S.gatherNodes || []) {
    if (n.nodeType !== t || !n.alive || (n.gatherLvl || 1) !== g) continue;
    const dd = Math.hypot(n.x - p.x, n.y - p.y);
    if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, d: Math.round(dd) }; }
  }
  return best;
}, [type, tier]);

/* mp-wheelnodes' tap on a node, through the canvas as a finger would. */
async function tapNode(P, id, done, tries = 6) {
  for (let i = 0; i < tries; i++) {
    await P.page.evaluate((nid) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === nid);
      if (!n) return;
      const cv = document.querySelector('canvas');
      const rc = cv.getBoundingClientRect();
      const x = rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
      const y = rc.top + (n.y - 24 - S.camera.y) * (S._worldScaleY || 1);
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })] });
      cv.dispatchEvent(mk('touchstart'));
      cv.dispatchEvent(mk('touchend'));
    }, id);
    await P.page.waitForTimeout(300);
    if (await H.readState(P, done)) return true;
  }
  return false;
}

/* mp-wheelnodes' way past the Mayor's welcome. */
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
