/* ═══ mp-pointsglow (v2.3.3004): POINTS WAITING MAKE TWO TABS GLOW ═══
 *
 * Owner: "when you level up make the character tab do a light flashing effect
 * and the points section light flashing effect until all points are spent".
 *
 *   1. A brand new bro has nothing to spend: no glow anywhere.
 *   2. A REAL level-up -- the dev kit's levels, which award XP through the
 *      worker's own _prog3AwardXp, the path a kill takes -- lights the
 *      Character tab, and its light actually flashes (the opacity moves).
 *   3. The Character tab still opens the sheet with a real finger on it; the
 *      Points tab glows there, the Equipment and Journey tabs do not.
 *   4. Sideways, the dashboard's Character tab glows too.
 *   5. Reduced motion: the lit state, held still.
 *   6. Spending every point -- real prog3_allocate spends, the UI's own wire
 *      message, judged by the worker -- puts both lights out.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { PROG3 } from '../../../src/data/prog3.js';

const OUT = `${H.REPO}/tools/qa/mp/out`;

async function touch(P, x, y) {
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await new Promise((r) => setTimeout(r, 50));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

const look = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const p3 = S && S.rpg && S.rpg.prog3;
  const glow = (sel) => {
    const g = document.querySelector(sel);
    if (!g) return null;
    const cs = getComputedStyle(g);
    const r = g.getBoundingClientRect();
    return { op: Number(cs.opacity), anim: cs.animationName, pe: cs.pointerEvents,
      w: Math.round(r.width), h: Math.round(r.height) };
  };
  const nav = document.querySelector('[data-nav="hero"]');
  const navR = nav && nav.getBoundingClientRect();
  const navBadge = nav ? [...nav.querySelectorAll('span')].find((s) => /^\d+\+?$/.test((s.textContent || '').trim())) : null;
  const tabs = [...document.querySelectorAll('[data-section]')].map((t) => ({
    id: t.getAttribute('data-section'), glow: !!t.querySelector('[data-pts-glow="tab"]') }));
  return {
    pool: p3 ? (p3.pool || 0) : null, shared: p3 ? (p3.shared || 0) : null,
    nav: navR ? { x: navR.left + navR.width / 2, y: navR.top + navR.height / 2, w: navR.width } : null,
    navGlow: glow('[data-nav="hero"] [data-pts-glow="nav"]'),
    navBadge: navBadge ? navBadge.textContent.trim() : null,
    tabGlow: glow('[data-section="Build"] [data-pts-glow="tab"]'),
    tabs,
    mode: window.__broDashPanelBus && window.__broDashPanelBus.state.mode,
    stack: window.__broDashPanelBus && window.__broDashPanelBus.state.stack,
  };
});

const crop = async (P, sel, name, pad = 10) => {
  const r = await P.page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  }, sel);
  if (!r) return;
  await P.page.screenshot({ path: `${OUT}/${name}.png`, clip: {
    x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.width + pad * 2, height: r.height + pad * 2 } }).catch(() => {});
};

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Leveller', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* ── 1. NOTHING TO SPEND, NOTHING GLOWS ── */
  const fresh = await look(P);
  rec.ok('the Character tab is on the dashboard (guard)', !!fresh.nav, fresh);
  rec.ok(`a brand new bro has nothing to spend (pool ${fresh.pool}, shared ${fresh.shared}) and no glow`,
    fresh.pool === 0 && !fresh.shared && fresh.navGlow === null, fresh);

  /* ── 2. A REAL LEVEL-UP LIGHTS IT ── */
  const myId = await H.readState(P, (S) => S.myId);
  const kit = await H.devOp(wsPort, 'kit', myId, { what: 'levels' });
  rec.ok('the worker levelled the bro up through its own XP path (guard)',
    !!(kit && kit.ok !== false && kit.levels && Object.keys(kit.levels).length), kit);
  let up = null;
  for (let i = 0; i < 30; i++) {
    await P.page.waitForTimeout(300);
    up = await look(P);
    if ((up.pool || 0) + (up.shared || 0) > 0 && up.navGlow) break;
  }
  const total = (up.pool || 0) + (up.shared || 0);
  rec.ok(`the level-up handed over points to spend (${up.pool} + ${up.shared} shared)`, total > 0, up);
  rec.ok('...and the Character tab glows', !!up.navGlow, up);
  rec.ok('...beside its gold count, which still reads the same total',
    up.navBadge === (total > 9 ? '9+' : String(total)), { badge: up.navBadge, total });
  rec.ok('...the glow is the flashing kind, and it never takes a touch',
    !!up.navGlow && up.navGlow.anim === 'bt-pts-glow' && up.navGlow.pe === 'none', up.navGlow);
  /* "a light FLASHING effect": the light must actually move.  Two reads half
     a period apart (1.6s cycle) cannot both sit at the same opacity. */
  const ops = [];
  for (let i = 0; i < 5; i++) {
    const g = await P.page.evaluate(() => {
      const e = document.querySelector('[data-nav="hero"] [data-pts-glow="nav"]');
      return e ? Number(getComputedStyle(e).opacity) : null;
    });
    ops.push(g);
    await P.page.waitForTimeout(330);
  }
  const lo = Math.min(...ops.filter((v) => v !== null)), hi = Math.max(...ops.filter((v) => v !== null));
  rec.ok(`...and it flashes: its light moves between ${lo.toFixed(2)} and ${hi.toFixed(2)}`,
    hi - lo > 0.3 && lo > 0, { ops });
  await crop(P, '[data-nav="hero"]', 'pointsglow-nav', 12);

  /* ── 3. THE TAB STILL OPENS, AND THE POINTS TAB GLOWS ── */
  await touch(P, up.nav.x, up.nav.y);
  await P.page.waitForTimeout(900);
  const open = await look(P);
  rec.ok('a real tap on the glowing Character tab still opens the Character sheet',
    open.mode === 'expanded' && Array.isArray(open.stack) && open.stack[open.stack.length - 1] === 'hero', open);
  rec.ok('the Points tab glows', !!open.tabGlow && open.tabGlow.anim === 'bt-pts-glow', open);
  rec.ok('...and only the Points tab', open.tabs.filter((t) => t.glow).map((t) => t.id).join(',') === 'Build', open.tabs);
  rec.ok('...the Character tab keeps glowing while its sheet is open', !!open.navGlow, open);
  await crop(P, '[data-section="Build"]', 'pointsglow-tab', 14);
  await P.page.screenshot({ path: `${OUT}/pointsglow-sheet.png` }).catch(() => {});
  /* Into the Points section: still lit, because points are still waiting. */
  await P.page.evaluate(() => {
    const t = document.querySelector('[data-section="Build"]');
    if (t) for (const type of ['pointerdown', 'pointerup']) t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch' }));
  });
  await P.page.waitForTimeout(600);
  const inPts = await look(P);
  rec.ok('...and it stays lit with the Points section open, while points wait',
    !!inPts.tabGlow, inPts);

  /* ── 5. REDUCED MOTION: LIT, STILL ── */
  await P.page.emulateMedia({ reducedMotion: 'reduce' });
  await P.page.waitForTimeout(300);
  const still = await look(P);
  rec.ok('with reduced motion the tabs stay lit but stop flashing',
    !!still.navGlow && still.navGlow.anim === 'none' && still.navGlow.op > 0.5
    && !!still.tabGlow && still.tabGlow.anim === 'none', { nav: still.navGlow, tab: still.tabGlow });
  await P.page.emulateMedia({ reducedMotion: 'no-preference' });

  /* ── 4. SIDEWAYS ── */
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => { try { window.__broDashPanelBus.open('hero'); } catch (e) {} });
  await P.page.waitForTimeout(900);
  const land = await look(P);
  rec.ok('sideways, the dashboard\'s Character tab glows too', !!land.navGlow, land);
  rec.ok('...and so does the Points tab', !!land.tabGlow, land);
  await P.page.screenshot({ path: `${OUT}/pointsglow-landscape.png` }).catch(() => {});
  await P.page.setViewportSize({ width: 390, height: 844 });
  await P.page.waitForTimeout(1200);
  /* A rotation closes the sheet (BottomDashboard's land watcher), so open it
     again on the Points section: the lights are checked going out where the
     player would be watching them. */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.open('hero'); } catch (e) {} });
  await P.page.waitForTimeout(900);
  await P.page.evaluate(() => {
    const t = document.querySelector('[data-section="Build"]');
    if (t) for (const type of ['pointerdown', 'pointerup']) t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 8, pointerType: 'touch' }));
  });
  await P.page.waitForTimeout(600);
  const back = await look(P);
  rec.ok('back upright, the Points section is open with its tab lit (guard)',
    back.mode === 'expanded' && !!back.tabGlow, back);

  /* ── 6. SPEND THEM ALL: THE LIGHTS GO OUT ──
     prog3_allocate is what the Points screen's confirm sends (HeroExpanded
     spendFor).  Round-robin over every stat each round: the worker refuses a
     capped stat or an empty pool, so the extra sends are harmless and nothing
     here has to re-derive its caps. */
  const ATK = Object.keys(PROG3.ATK), BODY = Object.keys(PROG3.BODY), LANES = PROG3.SKILLS;
  let left = total, rounds = 0, midway = null;
  while (left > 0 && rounds < 40) {
    rounds++;
    await P.page.evaluate(({ ATK, BODY, LANES }) => {
      const S = window._gameState.current;
      const p3 = S.rpg.prog3 || {};
      const by = p3.poolBy || {};
      for (const cat of LANES) {
        if (!(by[cat] > 0) && !(p3.pool > 0)) continue;
        for (const stat of ATK) S.channel.send({ type: 'prog3_allocate', payload: { stat, cat } });
      }
      if (p3.shared > 0 || p3.pool > 0) {
        for (const stat of BODY) S.channel.send({ type: 'prog3_allocate', payload: { stat, cat: LANES[0] } });
      }
    }, { ATK, BODY, LANES });
    await P.page.waitForTimeout(700);
    const s = await look(P);
    left = (s.pool || 0) + (s.shared || 0);
    if (left > 0 && !midway) midway = s;
  }
  if (midway) {
    rec.ok(`part-way through spending (${(midway.pool || 0) + (midway.shared || 0)} left) both still glow`,
      !!midway.navGlow && !!midway.tabGlow, midway);
  }
  await P.page.waitForTimeout(600);
  const spent = await look(P);
  rec.ok(`every point got spent (${rounds} rounds; ${spent.pool} + ${spent.shared} left)`,
    spent.pool === 0 && !spent.shared, spent);
  rec.ok('...and the Character tab stops glowing', spent.navGlow === null, spent);
  rec.ok('...and so does the Points tab, still on screen',
    spent.tabGlow === null && spent.tabs.some((t) => t.id === 'Build'), spent);
  rec.ok('...and the gold count is gone with it', spent.navBadge === null, spent);
  await crop(P, '[data-nav="hero"]', 'pointsglow-nav-spent', 12);

  rec.ok('no page errors', errs.length === 0, errs.slice(0, 4));
}
