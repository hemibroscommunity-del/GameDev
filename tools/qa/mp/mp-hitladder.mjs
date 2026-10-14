/* ═══ THE HIT LADDER, ON A PHONE (v2.3.3229) ═══
 *
 * The owner, 2026-10-14: "I want a different life skill progression system
 * where after the first level you get a 10% chance of hitting 1 number
 * higher.  The next level you get a 10% chance of hitting 1 number higher
 * than that.  So lvl 2 has a 10% chance of hitting 2 otherwise 1.  Lvl 3 has a
 * 10% chance of hitting 3 otherwise 1.  Etc. the number 1 will eventually get
 * replaced by the 2 as more 10% chances get added with each level."
 *
 * The worker rolls every hit (server/src/gathering.js gatherHitRoll): its
 * dice are the gather-hits suite's section 11, and the odds the game prints
 * are held to them face by face by mirror-audit.  What only a browser shows:
 *   1. the worker advertises caps.hitladder, and the test lever
 *      (/dev/lifeskill) reaches the game's own copy of the levels;
 *   2. Skills -> Mining at level 3 says "Each hit  1 (80%) · 2–3 (10% each)"
 *      and "At Lv 4  1 (70%) · 2–4 (10% each)" -- whole, not cut short, and
 *      inside the screen -- at level 8 (the longest words) and level 11 ("2–11
 *      (10% each)": the 1 gone), on a 390 and a 360 px phone; Cooking says it
 *      too, Farming (no hits) does not;
 *   3. a real harvest of a copper vein at Mining 11: the plan the game plays
 *      is the worker's (the operator view's hitPlan), none of its hits a 1,
 *      every number popped over the vein is one of them, and the vein's bar
 *      runs down to 0;
 *   4. against a worker without the ladder (no caps.hitladder: an older one,
 *      or the kill switch) the page prints the even 1..level it rolls; with no
 *      hits at all (no caps.gatherhits) it prints the old timer's Benefit;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/hitladder-<width>-lv<L>.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const STAND_ORE = [0, -70];   /* where a miner stands to a vein (mp-wheelnodes STAND) */

const pointerUp = (P, sel) => P.page.evaluate((s) => {
  const b = document.querySelector(s);
  if (!b) return false;
  b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  return true;
}, sel);

/* Skills, open on one skill's own page: from the list, or back to it first. */
async function openSkill(P, key) {
  await P.page.evaluate(() => window.__broDashPanelBus.open('skills'));
  await P.page.waitForTimeout(500);
  for (let i = 0; i < 4; i++) {
    if (await pointerUp(P, `[data-skill="${key}"]`)) break;
    await P.page.evaluate(() => {
      const back = [...document.querySelectorAll('button')].find((b) => /All skills/.test(b.textContent || ''));
      if (back) back.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    await P.page.waitForTimeout(400);
  }
  await P.page.waitForTimeout(700);   /* the panel re-reads the game's state every 600 ms */
}

/* Every label/value row on the open skill page, and the hit rows' fit. */
const readRows = (P) => P.page.evaluate(() => {
  const vw = window.innerWidth;
  const rowOf = (el) => {
    const spans = el.querySelectorAll(':scope > span');
    if (spans.length !== 2) return null;
    const v = spans[1], r = el.getBoundingClientRect();
    return { label: spans[0].textContent, value: v.textContent, cut: v.scrollWidth > v.clientWidth + 1,
      left: Math.round(r.left), right: Math.round(r.right), vw };
  };
  const box = document.querySelector('[data-hit-odds]');
  const hit = box ? [...box.children].map(rowOf).filter(Boolean) : [];
  const head = [...document.querySelectorAll('div')].find((d) => /^Level \d+$/.test((d.textContent || '').trim()));
  const all = [];
  for (const sp of document.querySelectorAll('span')) {
    if (sp.parentElement && sp.parentElement.children.length === 2 && sp === sp.parentElement.children[0]) {
      const row = rowOf(sp.parentElement);
      if (row) all.push(row);
    }
  }
  return { at: box ? box.getAttribute('data-hit-odds') : null, hit, level: head ? head.textContent.trim() : null,
    benefit: (all.find((r) => r.label === 'Benefit') || {}).value || null };
});

const setLevel = (wsPort, id, level) => H.devOp(wsPort, 'lifeskill', id, { skill: 'hits', level });
/* the four hit skills' levels in the game's own copy (H.waitFor's reader runs
   in the page, so it can name no variable from here) */
const waitLevel = (P, skill, level) => H.waitFor(P, (S) => {
  const ls = (S.rpg && S.rpg.lifeSkills) || {};
  const lv = (k) => (ls[k] && ls[k].level) || 0;
  return { mining: lv('mining'), woodcutting: lv('woodcutting'), fishing: lv('fishing'), cooking: lv('cooking') };
}, (v) => !!v && v[skill] === level, { timeout: 15000, label: skill + ' level ' + level }).then((v) => v[skill]).catch(() => null);

async function pageChecks(P, rec, OUT, w, myId, wsPort) {
  const tag = w + 'w: ';
  const cases = [
    { L: 3, each: '1 (80%) · 2–3 (10% each)', next: '1 (70%) · 2–4 (10% each)' },
    { L: 8, each: '1 (30%) · 2–8 (10% each)', next: '1 (20%) · 2–9 (10% each)' },
    { L: 11, each: '2–11 (10% each)', next: '3–12 (10% each)' },
  ];
  for (const c of cases) {
    const lv = await setLevel(wsPort, myId, c.L).catch((e) => ({ ok: false, e: String(e) }));
    const got = await waitLevel(P, 'mining', c.L);
    rec.ok(tag + 'the lever sets Mining ' + c.L + ' and the game hears it (guard)', !!lv && lv.ok === true && got === c.L, { lv, got });
    await openSkill(P, 'mining');
    const r = await readRows(P);
    const each = r.hit[0] || {}, next = r.hit[1] || {};
    rec.ok(tag + 'Mining ' + c.L + ': "Each hit  ' + c.each + '"', each.label === 'Each hit' && each.value === c.each, r);
    rec.ok(tag + 'Mining ' + c.L + ': "At Lv ' + (c.L + 1) + '  ' + c.next + '"', next.label === 'At Lv ' + (c.L + 1) && next.value === c.next, r);
    rec.ok(tag + 'Mining ' + c.L + ': both lines whole (no "…") and inside the screen',
      r.hit.length === 2 && r.hit.every((x) => !x.cut && x.left >= 0 && x.right <= x.vw), r.hit);
    rec.ok(tag + 'Mining ' + c.L + ': the old timer\'s Benefit line is gone (the worker rolls hits)', r.benefit === null, r.benefit);
    await P.page.screenshot({ path: join(OUT, `hitladder-${w}-lv${c.L}.png`) }).catch(() => {});
  }
  /* Cooking's cook is hits too; Farming has none. */
  await openSkill(P, 'cooking');
  const ck = await readRows(P);
  rec.ok(tag + 'Cooking 11 prints its hits too', (ck.hit[0] || {}).value === '2–11 (10% each)', ck);
  await openSkill(P, 'farming');
  const fm = await readRows(P);
  rec.ok(tag + 'Farming (no hits) prints none', fm.hit.length === 0 && fm.at === null, fm);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });

  /* ── the page, on two phones ── */
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 780 }]) {
    const P = await H.newPlayer(browser, { name: 'Ladder' + vp.width, wsPort, webPort, viewport: vp, touch: true, world: 'wheel' });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
        { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
      rec.ok(vp.width + 'w: in the Wheel (guard)', !!inW, inW);
      if (!inW) continue;
      const caps = await H.readState(P, (S) => ({ ladder: S._serverCaps && S._serverCaps.hitladder, hits: S._serverCaps && S._serverCaps.gatherhits }));
      rec.ok(vp.width + 'w: the worker advertises caps.hitladder and caps.gatherhits', caps.ladder === true && caps.hits === true, caps);
      const myId = await H.readState(P, (S) => S.myId);
      await H.unfoldBand(P).catch(() => {});
      await P.page.waitForTimeout(500);
      await pageChecks(P, rec, OUT, vp.width, myId, wsPort);

      if (vp.width === 390) {
        /* ── against a worker that rolls something else ── */
        await setLevel(wsPort, myId, 3);
        await waitLevel(P, 'mining', 3);
        await P.page.evaluate(() => { window._gameState.current._serverCaps.hitladder = false; });
        await openSkill(P, 'mining');
        const old = await readRows(P);
        rec.ok('no caps.hitladder (an older worker, or the kill switch): Mining 3 prints the even 1..3 it rolls',
          (old.hit[0] || {}).value === '1–3 (33.3% each)' && (old.hit[1] || {}).value === '1–4 (25% each)', old);
        await P.page.evaluate(() => { const c = window._gameState.current._serverCaps; c.hitladder = true; c.gatherhits = false; });
        await P.page.waitForTimeout(800);
        const timer = await readRows(P);
        rec.ok('no caps.gatherhits (the old timer): no hit lines, and the timer\'s Benefit line again',
          timer.hit.length === 0 && /0\.25s sooner per level/.test(timer.benefit || ''), timer);
        await P.page.evaluate(() => { window._gameState.current._serverCaps.gatherhits = true; });
        await P.page.evaluate(() => window.__broDashPanelBus.toBar());
        await P.page.waitForTimeout(400);

        /* ── a real harvest at Mining 11: no 1 in it ── */
        await harvestAt11(P, rec, wsPort, myId);
      }
      rec.ok(vp.width + 'w: no page errors', errors.length === 0, errors);
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}

async function harvestAt11(P, rec, wsPort, myId) {
  await H.grant(wsPort, myId, 'item', { invKey: 'mining_pickaxe', count: 1 }).catch(() => {});
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
  await setLevel(wsPort, myId, 11);
  await waitLevel(P, 'mining', 11);
  const tool = await H.waitFor(P, (S) => (((S.rpg || {}).inventory || {}).mining_pickaxe || 0) > 0, (v) => v === true,
    { timeout: 15000, label: 'the pickaxe' }).catch(() => false);
  rec.ok('harvest: the pickaxe is in the bag (guard)', tool === true, tool);
  await closeTalk(P);
  /* the nearest copper vein (tier 1, the commons round BroTown) */
  const vein = await P.page.evaluate(() => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== 'oreVein' || !n.alive || (n.gatherLvl || 1) !== 1) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, d: Math.round(dd) }; }
    }
    return best;
  });
  rec.ok('harvest: a copper vein near town (guard)', !!vein, vein);
  if (!vein) return;
  const there = await H.hopTo(P, vein.x + STAND_ORE[0], vein.y + STAND_ORE[1], { step: 90, gap: 260, tries: 80 });
  rec.ok('harvest: walked to the vein (guard)', there === true, { vein });
  await P.page.waitForTimeout(600);
  /* every number popped while the harvest runs, white, over the vein */
  await P.page.evaluate(() => {
    const seen = window.__qaHitPops = [];
    const S = window._gameState.current;
    const mark = new WeakSet();
    window.__qaHitPopTimer = setInterval(() => {
      for (const p of S.dmgNumbers || []) {
        if (mark.has(p)) continue;
        mark.add(p);
        if (p.color === '#ffffff' && /^\d+$/.test(String(p.text))) seen.push(Number(p.text));
      }
    }, 30);
  });
  const started = await tapNode(P, vein.id, (S) => !!S._extraction);
  rec.ok('harvest: tapping the vein starts a Mining harvest (guard)', started === true
    && (await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null))) === 'mining');
  if (!started) return;
  const plan = await H.waitFor(P, (S) => (S._extraction && S._extraction.hits && S._extraction.hits.plan) ? S._extraction.hits.plan.slice() : null,
    (v) => Array.isArray(v), { timeout: 8000, label: 'the plan' }).catch(() => null);
  const srv = await H.adminPlayer(wsPort, myId).then((a) => ((a && a.live) || {}).hitPlan || null).catch(() => null);
  rec.ok('harvest: the game plays the worker\'s own plan (the operator view\'s hitPlan)',
    !!plan && !!srv && JSON.stringify(plan) === JSON.stringify(srv.hits) && srv.level === 11 && srv.hp === 10, { plan, srv });
  rec.ok('harvest: at Mining 11 no hit is a 1 -- each 2 to 11, and they break the vein\'s 10 HP',
    !!plan && plan.every((d) => d >= 2 && d <= 11) && plan.reduce((a, b) => a + b, 0) >= 10
      && plan.slice(0, -1).reduce((a, b) => a + b, 0) < 10, plan);
  const done = await H.waitFor(P, (S) => {
    const ex = S._extraction;
    return ex && ex.hits ? { status: ex.status, hp: ex.hits.hp, shown: ex.hits.shown, n: (ex.hits.plan || []).length } : null;
  }, (v) => !!v && v.status === 'ready', { timeout: 15000, label: 'the hits land' }).catch(() => null);
  rec.ok('harvest: every hit lands and the vein\'s bar reads 0', !!done && done.hp === 0 && done.shown === done.n, done);
  await P.page.waitForTimeout(300);
  const pops = await P.page.evaluate(() => { clearInterval(window.__qaHitPopTimer); return window.__qaHitPops || []; });
  rec.ok('harvest: the numbers popped over the vein are the plan\'s hits',
    !!plan && pops.length >= plan.length && plan.every((d) => pops.includes(d)) && pops.every((d) => d >= 2), { pops, plan });
  await P.page.evaluate(() => { window._gameState.current._extraction = null; });
}

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
