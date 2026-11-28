/* ═══ v2.3.6867: THE MAP AND WORLD · CODEX IN THE NEW MENUS, PLAYED (card MN step 8) ═══
 *
 * The owner's Map and Codex (docs/design/menus3/; the card's step "the Map
 * and World · Codex"): the minimap opens the full-screen World map, the
 * new panel shut first, the tracked quest's star lit as it opens; World's
 * Codex tab opens today's Codex in the panel -- the six kinds, the
 * monsters' tiles -- a tile the monster's page with its doors, a drop its
 * item's page, "Found from", each with the one Back; a quest's links open
 * those pages on the quest's history, Back the quest.
 *
 *   1. UPRIGHT (390 x 844, touch), a character seeded on the worker (test
 *      mode; every monster met, 25 kills each; Into the Blue taken -- its
 *      links): World, the Codex tab -> the panel on the Codex (World's tabs,
 *      the rail of six, the met count, a tile a monster); every tappable
 *      thing 44 x 44 or more; Pets its honest line and its door; a tile ->
 *      the monster's page -> Loot -> a drop -> its item page -> Found from,
 *      Back four times to the Codex, Loot's row kept; a quest's monster and
 *      item links -> the Codex's pages over the quest -> Back the quest;
 *      the minimap with the panel open -> the panel shut, the map open, the
 *      tracked star lit, its light over in seconds; the map's X;
 *   2. SIDEWAYS (844 x 390): the Codex in the drawer, a monster's page in
 *      it; 44+; the minimap's box stands aside while the drawer is open;
 *   3. A COMPUTER (1280 x 800, `wide: true`): the drawer; K the Codex in
 *      the panel, K again closes; M the map (the panel shut first), M again
 *      closes it; Esc closes the panel.
 *
 * Measured from OUTSIDE the game (this test's evaluate).  Pictures
 * (deviceScaleFactor 1): tools/qa/out/menus3map-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const pstate = (P) => P.page.evaluate(() => { const s = window.__btMenus3.panelState(); const t = window.__btMenus3.top(); return { open: s.open, menu: s.menu, section: s.section, depth: s.nav ? s.nav.length : 0, page: t ? t.page : null, rail: t ? t.rail : null, arg: t ? t.arg : null }; });
const cx = (P) => P.page.evaluate(() => window.__btMenus3Codex || null);
const wmap = (P) => P.page.evaluate(() => { const w = window.__btWorldMap; return w ? { open: !!w.open, litShown: !!w.litShown, quest: (w.more && w.more.quest) || null, lit: (w.more && w.more.questLit) || null } : null; });
const small = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-menus3-panel] button')).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.w > 0 && (b.w < 44 || b.h < 44)));

async function tap(P, sel, touch) {
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(600);
  return true;
}
/* a button inside the panel's scrolling body: scrolled into view first */
async function tapIn(P, sel, touch) {
  await P.page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: 'center' }); }, sel).catch(() => {});
  await P.page.waitForTimeout(250);
  return tap(P, sel, touch);
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3map-' + name + '.png') }); } catch (e) { /* a picture only */ }
}
async function inWorld(P, rec, who) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${who}: in the world (BroTown)`, !!w, w);
  if (!w) return false;
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__btMenus3.on()), null, { timeout: 30000 }).catch(() => {});
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring], [data-new-monster] { visibility: hidden !important; }' }).catch(() => {});
  await P.page.waitForTimeout(2000);
  return true;
}
/* the worker seeds the character: test mode, every monster met (the Codex's dev lever, as mp-codex),
   Into the Blue taken (its links: the slime in the Codex, its Remains) */
async function seed(P, wsPort, rec, who) {
  const me = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'testmode', me, { on: true }).catch(() => null);
  await H.devOp(wsPort, 'codex', me, { all: true, n: 25, n2: 1 }).catch(() => null);
  await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
  const q = await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).tut_1 || null, (v) => v === 'active', { timeout: 15000, label: 'tut_1 active' }).catch(() => null);
  const met = await H.waitFor(P, (S) => (S._codex && S._codex.rev) || 0, (v) => v > 0, { timeout: 15000, label: 'the codex' }).catch(() => null);
  await P.page.waitForTimeout(1500);
  rec.ok(`${who}: seeded (tut_1 ${q}, the Codex's count in)`, q === 'active' && !!met, { q, met });
  return me;
}
async function openCodex(P, touch) {
  await tap(P, '[data-menus3-dock="world"]', touch);
  await P.page.waitForTimeout(500);
  await tap(P, '[data-menus3-tab="codex"]', touch);
  await P.page.waitForTimeout(700);
  return pstate(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright ── */
  const P = await H.newPlayer(browser, { name: 'Mapphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      await seed(P, wsPort, rec, 'upright');
      let ps = await openCodex(P, true);
      rec.ok('upright: World\'s Codex tab opens the Codex in the new panel', ps.open && ps.menu === 'world' && ps.section === 'codex' && ps.page === 'root', ps);
      let c = await cx(P);
      rec.ok('upright: Monsters first, its tiles the game\'s monsters, every one met', !!c && c.shelf === 'monsters' && c.cards.length > 3 && c.known.length === c.cards.length && c.met === c.total, c);
      const shelves = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-m3-cxshelf]')).map((el) => el.getAttribute('data-m3-cxshelf')));
      rec.ok('upright: the rail is today\'s six kinds', shelves.join() === 'monsters,items,resources,townsfolk,lands,pets', shelves);
      const sm = await small(P);
      rec.ok('upright: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      await shot(P, 'upright-codex');
      await tapIn(P, '[data-m3-cxshelf="pets"]', true);
      c = await cx(P);
      rec.ok('upright: Pets: its honest line and its door to the pet journal', !!c && c.shelf === 'pets' && c.empty && !!(await box(P, '[data-m3-cx-door="petsAll"]')), c);
      await tapIn(P, '[data-m3-cxshelf="monsters"]', true);
      const back = await cx(P);
      const first = back && back.cards.length ? back.cards[0] : null;
      /* a tile -> the monster's page -> Loot -> a drop -> its item -> Found from, and Back all the way */
      await tapIn(P, `[data-m3-cx="${first}"]`, true);
      await P.page.waitForTimeout(1200);
      ps = await pstate(P);
      rec.ok('upright: a tile opens the monster\'s page in the panel, Back in the header', ps.page === 'cxMonster' && ps.arg === first && !!(await box(P, '[data-menus3-back]')) && !!(await box(P, `[data-menus3-panel] [data-codex-show="${first}"]`)), ps);
      await shot(P, 'upright-monster');
      await tapIn(P, '[data-menus3-panel] [data-cx-door="loot"]', true);
      ps = await pstate(P);
      rec.ok('upright: its Loot door: the drops in the panel', ps.page === 'cxLoot' && !!(await box(P, '[data-menus3-panel] [data-cx-drop]')), ps);
      const drop = await P.page.evaluate(() => { const el = document.querySelector('[data-menus3-panel] [data-cx-drop]'); return el ? el.getAttribute('data-cx-drop') : null; });
      await tapIn(P, '[data-menus3-panel] [data-cx-drop]', true);
      ps = await pstate(P);
      const it = await P.page.evaluate(() => window.__btMenus3CodexItem || null);
      rec.ok('upright: a drop opens its item\'s page (Drops from, Found from)', ps.page === 'cxItem' && !!it && it.doors.indexOf('codexFound') >= 0, { ps, it });
      await tapIn(P, '[data-m3-cx-itemdoor="codexFound"]', true);
      ps = await pstate(P);
      rec.ok('upright: Found from: every monster that drops it', ps.page === 'cxFound' && !!(await box(P, '[data-menus3-panel] [data-cx-source]')), ps);
      const backs = [];
      for (let i = 0; i < 4; i++) { await tap(P, '[data-menus3-back]', true); backs.push((await pstate(P)).page); }
      ps = await pstate(P);
      rec.ok('upright: Back, Back, Back, Back: the item, Loot, the monster, the Codex', backs.join() === 'cxItem,cxLoot,cxMonster,root' && ps.section === 'codex', backs);
      /* (Loot's kept row: menus3-codex.test 2e) */
      rec.ok('upright: ...Loot kept the row it opened', !!drop, drop);
      /* a quest's links: the Codex's pages over the quest, Back the quest */
      await tap(P, '[data-menus3-tab="quests"]', true);
      await tapIn(P, '[data-m3-quest="tut_1"]', true);
      ps = await pstate(P);
      if (ps.page === 'quest') {
        await tapIn(P, '[data-m3-qlink="monster"]', true);
        ps = await pstate(P);
        rec.ok('upright: a quest\'s monster link: its Codex page in the panel, on the quest', ps.section === 'quests' && ps.page === 'cxMonster', ps);
        await tap(P, '[data-menus3-back]', true);
        await tapIn(P, '[data-m3-qlink="item"]', true);
        ps = await pstate(P);
        const it2 = await P.page.evaluate(() => window.__btMenus3CodexItem || null);
        rec.ok('upright: its item link: the item\'s page, from the monster that drops it', ps.section === 'quests' && ps.page === 'cxItem' && !!it2 && it2.key === 'slime-remnants', { ps, it2 });
        await tap(P, '[data-menus3-back]', true);
        ps = await pstate(P);
        rec.ok('upright: ...Back: the quest', ps.page === 'quest' && ps.arg === 'tut_1', ps);
      } else rec.ok('upright: Into the Blue\'s page', false, ps);
      /* the minimap with the panel open: the panel shut, the World map, the tracked star lit */
      const mm = await box(P, '[data-world-map-open]');
      if (mm) {
        await P.page.touchscreen.tap(mm.x + mm.w / 2, mm.y + mm.h / 2);
        await P.page.waitForTimeout(900);
        ps = await pstate(P);
        const w0 = await wmap(P);
        const route = await P.page.evaluate(() => window.__btMenus3.route());
        rec.ok('upright: the minimap: the panel shut, the full-screen World map open (the router\'s Map)', !ps.open && !!w0 && w0.open && !!(await box(P, '[data-world-map]')) && route && route.entry === 'hud.minimap', { ps, open: w0 && w0.open, route });
        rec.ok('upright: the tracked quest\'s star is lit as it opens', !!w0 && w0.litShown === true && !!w0.quest && !!w0.lit, w0);
        await shot(P, 'upright-map');
        await P.page.waitForTimeout(4500);
        const w1 = await wmap(P);
        rec.ok('upright: ...and the light is over in seconds (the map as today)', !!w1 && w1.open && !!w1.quest && !w1.lit, w1);
        await tap(P, '[data-world-map-close]', true);
        rec.ok('upright: the map\'s X closes it', !(await box(P, '[data-world-map]')), null);
      } else rec.ok('upright: the minimap\'s click box', false, null);
    }
  } finally { await P.page.context().close().catch(() => {}); }

  /* ── 2. sideways ── */
  const S2 = await H.newPlayer(browser, { name: 'Mapside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(S2, rec, 'sideways')) {
      await seed(S2, wsPort, rec, 'sideways');
      const ps = await openCodex(S2, true);
      const pb = await box(S2, '[data-menus3-panel]');
      rec.ok('sideways: the Codex in the drawer, 40% wide on the right', ps.open && ps.section === 'codex' && !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, { ps, pb });
      const sm = await small(S2);
      rec.ok('sideways: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      const hid = await S2.page.evaluate(() => { const el = document.querySelector('[data-world-map-open]'); return el ? getComputedStyle(el).visibility : 'none'; });
      rec.ok('sideways: the minimap\'s click box stands aside while the drawer is open (the mends)', hid === 'hidden' || hid === 'none', hid);
      await shot(S2, 'sideways-codex');
      const c = await cx(S2);
      if (c && c.cards.length) {
        await tapIn(S2, `[data-m3-cx="${c.cards[0]}"]`, true);
        await S2.page.waitForTimeout(1200);
        const p2 = await pstate(S2);
        rec.ok('sideways: a monster\'s page inside the drawer', p2.page === 'cxMonster' && !!(await box(S2, '[data-menus3-panel] [data-codex-show]')), p2);
        const sm2 = await small(S2);
        rec.ok('sideways: its tappable things 44 x 44 or more', sm2.length === 0, sm2);
        await shot(S2, 'sideways-monster');
      } else rec.ok('sideways: the tiles', false, c);
    }
  } finally { await S2.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Mapdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(D, rec, 'computer')) {
      await seed(D, wsPort, rec, 'computer');
      let ps = await openCodex(D, false);
      const pb = await box(D, '[data-menus3-panel]');
      rec.ok('computer: the Codex in the drawer', ps.open && ps.section === 'codex' && !!pb && pb.x > 640, { ps, pb });
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(600);
      rec.ok('computer: Esc closes it', (await pstate(D)).open === false, null);
      await D.page.keyboard.press('KeyK');
      await D.page.waitForTimeout(700);
      ps = await pstate(D);
      rec.ok('computer: K opens the Codex in the new panel', ps.open && ps.menu === 'world' && ps.section === 'codex', ps);
      await D.page.keyboard.press('KeyK');
      await D.page.waitForTimeout(600);
      rec.ok('computer: K again closes it', (await pstate(D)).open === false, null);
      await D.page.keyboard.press('KeyK');
      await D.page.waitForTimeout(600);
      await D.page.keyboard.press('KeyM');
      await D.page.waitForTimeout(900);
      ps = await pstate(D);
      rec.ok('computer: M opens the World map, the panel shut first', !ps.open && !!(await box(D, '[data-world-map]')), ps);
      await shot(D, 'computer-map');
      await D.page.keyboard.press('KeyM');
      await D.page.waitForTimeout(700);
      rec.ok('computer: M again closes the map', !(await box(D, '[data-world-map]')), null);
    }
  } finally { await D.page.context().close().catch(() => {}); }
}
