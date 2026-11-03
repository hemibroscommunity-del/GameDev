/* ═══ mp-gearviews (v2.3.4161): THE GEAR TAB'S THREE OVERVIEW ARRANGEMENTS ═══
 *
 * The owner (2026-11-03): "I want the character preview in the middle panel
 * by default (actually showing what he's equipped) ... Design a few different
 * arrangements and I'll decide which one I like best".  GearTab.jsx draws
 * three, chosen by ?gearview=1|2|3 (a temporary switch).  For each, in the
 * Wheel's BroTown with the test kit on (a sword in hand, a shield, armour):
 *   - upright 390 x 844 (touch): pictured to docs/shots/gear-view-N.webp, and
 *     measured: the card never scrolls, no text under 11 px, the figure drawn;
 *   - the same at 360 x 780 and sideways 844 x 390, measured;
 *   - a computer (1280 x 720, wide, the band open): pictured to
 *     docs/shots/gear-view-N-desk.webp, measured.
 * 256 colours, lossless webp (gear_shots.py).
 *
 *   npm run build && node tools/qa/mp/run.mjs gearviews
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = `${H.REPO}/tools/qa/mp/out/gearviews`;
const DOCS = `${H.REPO}/docs/shots`;

async function seed(P, wsPort, touch) {
  const id = await H.readState(P, (S) => S.myId);
  await H.armWorker(P, wsPort, id, ['bow', 'staff']);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  const hasSword = await H.readState(P, (S) => !!(S.rpg && S.rpg.weapon));
  if (!hasSword) { await H.equipWeapon(P, 'greatsword', 'weapon', 'melee'); await P.page.waitForTimeout(1500); }
  await P.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'set_active_slot', payload: { slot: 'melee' } }); S.rpg.activeSlot = 'melee'; S._userCycledSlot = true; });
  /* levels first: armour asks for a level before it goes on (equipActions
     _armorBlocked) */
  for (const what of ['levels', 'shield', 'armor']) { await H.devOp(wsPort, 'kit', id, { what }).catch(() => null); await P.page.waitForTimeout(800); }
  for (const [invKey, count] of [['ore_iron_ore', 27], ['wood_pine_log', 24], ['fish_minnow', 7], ['manaShard', 3]]) {
    await H.grant(wsPort, id, 'item', { invKey, count }).catch(() => null);
  }
  await P.page.waitForTimeout(2000);
  /* the kit's shield and armour on, from the bag: a real press on each
     piece (the tiles answer pointerup), then its Equip */
  for (const k of ['stashShield', 'stashArmor', 'stashLegs']) {
    const at = await P.page.evaluate((kk) => {
      const t = document.querySelector(`[data-gear-bag] [data-bag-key^="${kk}-"]`);
      if (!t) return null;
      t.scrollIntoView({ block: 'nearest' });
      const r = t.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, k);
    if (!at) continue;
    if (touch) await P.page.touchscreen.tap(at.x, at.y); else await P.page.mouse.click(at.x, at.y);
    await P.page.waitForTimeout(1200);
    await P.page.evaluate(() => { const b = document.querySelector('[data-gear-foot] [data-gear-act="equip"]'); if (b) b.click(); });
    await P.page.waitForTimeout(1800);
  }
  await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.afterChange(); });
  await P.page.waitForTimeout(1500);
}

const fit = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-gear-pane="bro"]');
  if (!c) return null;
  const sc = c.querySelector('[data-gear-scroll]');
  const cr = c.getBoundingClientRect();
  const small = [];
  c.querySelectorAll('*').forEach((el) => {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && parseFloat(getComputedStyle(el).fontSize) < 11) small.push(el.textContent.trim().slice(0, 16));
  });
  const fig = c.querySelector('[data-gear-figure] canvas');
  const out = [...c.querySelectorAll('[data-gear-figure], [data-gear-bars], [data-gear-level]')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > cr.right + 0.5 || r.bottom > cr.bottom + 0.5; }).length;
  const st = c.querySelector('[data-gear-stats]');
  return { over: c.scrollHeight - c.clientHeight, scOver: sc ? sc.scrollHeight - sc.clientHeight : 0, small, outside: out,
    figure: !!fig, size: Number((c.querySelector('[data-gear-figure]') || { getAttribute: () => 0 }).getAttribute('data-size')),
    arrangement: st ? st.getAttribute('data-gear-arrangement') : null, w: Math.round(cr.width), h: Math.round(cr.height) };
});

function fitOk(rec, tag, f, want) {
  rec.ok(`${tag}: arrangement ${want} -- the bro drawn (${f && f.size} px), nothing cut off, no scrolling, nothing under 11 px`,
    !!f && String(f.arrangement) === String(want) && f.figure && f.over <= 1 && f.scOver <= 1 && f.outside === 0 && f.small.length === 0, f);
}

async function bandClip(P, vw, vh, above) {
  const top = await P.page.evaluate(() => { const el = document.querySelector('[data-gear-tab]'); return el ? Math.round(el.getBoundingClientRect().top) : null; });
  const y = Math.max(0, (top == null ? vh - 320 : top - 52) - above);
  return { x: 0, y, width: vw, height: vh - y };
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(DOCS, { recursive: true });
  const shots = [];
  for (const n of [1, 2, 3]) {
    /* ══ the upright phone, then 360 and sideways ══ */
    {
      const P = await H.newPlayer(browser, { name: 'View' + n, wsPort, webPort, touch: true, world: 'wheel', viewport: { width: 390, height: 844 }, query: 'gearview=' + n });
      try {
        await H.enterWorld(P);
        await H.unfoldBand(P);
        await seed(P, wsPort, true);
        await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* at rest */ } const g = window.__btGearTab; if (g) { g.bus.afterChange(); g.bus.clearFilter(); g.bus.setMenu(false); } });
        await P.page.waitForTimeout(2000);
        const f = `${OUT}/gear-view-${n}.png`;
        await P.page.screenshot({ path: f, clip: await bandClip(P, 390, 844, 40) });
        shots.push(f);
        fitOk(rec, `[390x844] view ${n}`, await fit(P), n);
        await P.page.setViewportSize({ width: 360, height: 780 });
        await P.page.waitForTimeout(1800);
        await P.page.screenshot({ path: `${OUT}/gear-view-${n}-360.png` });
        fitOk(rec, `[360x780] view ${n}`, await fit(P), n);
        await P.page.setViewportSize({ width: 844, height: 390 });
        await P.page.waitForTimeout(1800);
        await H.unfoldBand(P).catch(() => {});
        await P.page.evaluate(() => { try { if (window.__broDashPanelBus.state.mode === 'bar') window.__broDashPanelBus.open('dashboard'); } catch (e) { /* no sheet */ } });
        await P.page.waitForTimeout(1800);
        await P.page.screenshot({ path: `${OUT}/gear-view-${n}-side.png` });
        const sf = await fit(P);
        fitOk(rec, `[844x390] view ${n}`, sf, sf && sf.arrangement === 'short' ? 'short' : n);
      } finally {
        await P.ctx.close().catch(() => {});
      }
    }
    /* ══ a computer, the band open ══ */
    {
      const P = await H.newPlayer(browser, { name: 'Viewd' + n, wsPort, webPort, world: 'wheel', wide: true, viewport: { width: 1280, height: 720 }, query: 'gearview=' + n });
      try {
        await H.enterWorld(P);
        await H.unfoldBand(P).catch(() => {});
        await seed(P, wsPort, false);
        await P.page.evaluate(() => { const g = window.__btGearTab; if (g) { g.bus.afterChange(); g.bus.clearFilter(); g.bus.setMenu(false); } });
        await P.page.waitForTimeout(2000);
        const f = `${OUT}/gear-view-${n}-desk.png`;
        await P.page.screenshot({ path: f });
        shots.push(f);
        fitOk(rec, `[computer] view ${n}`, await fit(P), n);
      } finally {
        await P.ctx.close().catch(() => {});
      }
    }
  }
  try {
    const out = execFileSync('python3', [`${H.REPO}/tools/qa/mp/gear_shots.py`, DOCS, ...shots], { encoding: 'utf8' });
    console.log(out.trim());
    rec.ok('the six pictures saved to docs/shots at 256 colours', /saved 6/.test(out), out.trim());
  } catch (e) {
    rec.ok('the six pictures saved to docs/shots at 256 colours', false, String(e).slice(0, 300));
  }
}
