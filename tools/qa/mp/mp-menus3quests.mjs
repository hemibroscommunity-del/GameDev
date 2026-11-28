/* ═══ v2.3.6863: WORLD · QUESTS IN THE NEW PANEL, PLAYED (card MN step 7) ═══
 *
 * The owner's Quests (docs/design/menus3/; the card's step "World ·
 * Quests"): the World button opens the new panel on Quests, always; the
 * Today strip with only what the game has; the rail Active | On offer | Done
 * from the game's REAL quests (no Daily); a quest's page with Back, Track,
 * Show on map (over the panel) and Rewards; a monster's link opens the new
 * Codex's page (v2.3.6867) and its Back comes back to the quest; the quest line opens
 * that quest's page.
 *
 *   1. UPRIGHT (390 x 844, touch), a character seeded on the worker (test
 *      mode; every quest but Mayor Bro's line handed in -- the Done list;
 *      Into the Blue taken and its four Slime Remains given -- ready; Cold
 *      Reception taken -- active): World opens the panel on Quests; its tabs
 *      Quests, Codex, Feats; the rail Active, On offer, Done and no Daily;
 *      Active the tracked quest first, Ready marked; the Today strip (the
 *      streak once the worker answers), a place's words open under it; every
 *      tappable thing in the panel 44 x 44 or more; Done's rows, a done
 *      quest's page, Back to Done as it was; a ready quest's page (Ready,
 *      its links: the Codex's slime, the item, the place), Track, Rewards
 *      and Back; the monster's link -> the new Codex's page in the panel
 *      (v2.3.6867) -> Back -> the quest; Show on map -> the map OVER the panel ->
 *      its close -> the quest; the quest line (its road, QuestCard's) ->
 *      that quest's page -> Back -> the rail; a tap on the world closes it;
 *   2. SIDEWAYS (844 x 390): the drawer 40% on the right; a quest's page
 *      inside it; every tappable thing 44+;
 *   3. A COMPUTER (1280 x 800, `wide: true`): the drawer; J opens it on
 *      Quests (the band's key); Esc closes it.
 *
 * Measured from OUTSIDE the game (this test's evaluate).  Pictures
 * (deviceScaleFactor 1): tools/qa/out/menus3quests-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const attrs = (P, sel, a) => P.page.evaluate(([s, n]) => Array.from(document.querySelectorAll(s)).map((el) => el.getAttribute(n)), [sel, a]);
const pstate = (P) => P.page.evaluate(() => { const s = window.__btMenus3.panelState(); const t = window.__btMenus3.top(); return { open: s.open, menu: s.menu, section: s.section, depth: s.nav ? s.nav.length : 0, page: t ? t.page : null, rail: t ? t.rail : null, arg: t ? t.arg : null }; });
const probe = (P) => P.page.evaluate(() => window.__btMenus3Quests || null);
const qprobe = (P) => P.page.evaluate(() => window.__btMenus3Quest || null);
const bandTop = (P) => P.page.evaluate(() => { try { const n = window.__broDashPanelBus.nav(); const st = n[n.ws] || []; return { shown: !!n.shown, top: st.length ? st[st.length - 1].id : null }; } catch (e) { return null; } });
/* every tappable thing in the panel, under 44 in either way */
/* v2.3.6866 (the gatekeeper's sitting 75): what takes a tap at the centre of the minimap's
   click box and of the gear, which sit under the drawer: the drawer's own box, never them */
const underDrawer = (P, asMain) => P.page.evaluate((m) => ['[data-world-map-open]', '[data-menus3-gear]'].map((sel) => {
  const el = document.querySelector(sel);
  const pn = document.querySelector('[data-menus3-panel]');
  if (!el || !pn) return { sel, none: true };
  /* asMain: the mend's rule overruled on the element (main 46740533 had none), to play the bug itself */
  if (m) { el.style.setProperty('visibility', 'visible', 'important'); el.style.setProperty('pointer-events', 'auto', 'important'); }
  try {
    const r = el.getBoundingClientRect(), q = pn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (!(r.width > 0) || x < q.left || x > q.right || y < q.top || y > q.bottom) return { sel, outside: true };
    const hit = document.elementFromPoint(x, y);
    return { sel, inPanel: !!(hit && hit.closest && hit.closest('[data-menus3-panel]')), hit: hit ? hit.tagName + (hit === el ? ' (it)' : '') : null };
  } finally { if (m) { el.style.removeProperty('visibility'); el.style.removeProperty('pointer-events'); } }
}), !!asMain);
const drawerOk = (u) => u.every((x) => x.none || x.outside || x.inPanel);
const small = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-menus3-panel] button')).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.w > 0 && (b.w < 44 || b.h < 44)));

async function tap(P, sel, touch) {
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(600);
  return true;
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3quests-' + name + '.png') }); } catch (e) { /* a picture only */ }
}
async function inWorld(P, rec, who) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${who}: in the world (BroTown)`, !!w, w);
  if (!w) return false;
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__btMenus3.on()), null, { timeout: 30000 }).catch(() => {});
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
  await P.page.waitForTimeout(2000);
  return true;
}
const quests = (P) => H.readState(P, (S) => Object.assign({}, (S.rpg && S.rpg._quests) || {}));
/* the worker seeds the character: test mode (any quest in any order), every quest but Mayor Bro's line
   handed in (Done), Into the Blue taken with its four Slime Remains (ready), Cold Reception taken (active) */
async function seed(P, wsPort, rec, who) {
  const me = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'testmode', me, { on: true }).catch(() => null);
  await H.devOp(wsPort, 'quests', me, { except: 'tut_' }).catch(() => null);
  await P.page.waitForTimeout(1500);
  const accept = (q) => P.page.evaluate((id) => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: id } }); }, q);
  await accept('tut_1');
  await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).tut_1 || null, (v) => v === 'active', { timeout: 15000, label: 'tut_1 active' }).catch(() => null);
  await accept('tut_2');
  await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).tut_2 || null, (v) => v === 'active', { timeout: 15000, label: 'tut_2 active' }).catch(() => null);
  await H.grant(wsPort, me, 'item', { invKey: 'slime-remnants', count: 4 }).catch(() => null);
  await P.page.waitForTimeout(2500);
  const q = await quests(P);
  const done = Object.keys(q).filter((k) => q[k] === 'turnedIn').length;
  rec.ok(`${who}: seeded (tut_1 ${q.tut_1}, tut_2 ${q.tut_2}, ${done} handed in)`, q.tut_1 === 'active' && q.tut_2 === 'active' && done > 3, { tut_1: q.tut_1, tut_2: q.tut_2, done });
  return me;
}
async function openWorld(P, touch) {
  await tap(P, '[data-menus3-dock="world"]', touch);
  await P.page.waitForTimeout(700);
  return pstate(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright ── */
  const P = await H.newPlayer(browser, { name: 'Questphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      await seed(P, wsPort, rec, 'upright');
      let ps = await openWorld(P, true);
      rec.ok('upright: World opens the new panel on Quests', ps.open && ps.menu === 'world' && ps.section === 'quests' && ps.page === 'root', ps);
      const tabs = await attrs(P, '[data-menus3-tab]', 'data-menus3-tab');
      rec.ok('upright: its tabs Quests, Codex, Feats and the X', tabs.join() === 'quests,codex,feats' && !!(await box(P, '[data-menus3-x]')), tabs);
      const rail = await attrs(P, '[data-m3-qrail]', 'data-m3-qrail');
      rec.ok('upright: the rail Active, On offer, Done; no Daily', rail.join() === 'active,offers,done', rail);
      await P.page.waitForTimeout(1500);
      let Q = await probe(P);
      rec.ok('upright: Active lists both quests in hand', !!Q && Q.rail === 'active' && Q.active.includes('tut_1') && Q.active.includes('tut_2'), Q);
      rec.ok('upright: Into the Blue marked ready', !!Q && Q.ready.includes('tut_1') && (await attrs(P, '[data-m3-quest="tut_1"]', 'data-m3-quest-ready'))[0] === '1', Q && Q.ready);
      rec.ok('upright: the tracked quest first', !!Q && (!Q.tracked || Q.active[0] === Q.tracked), Q && { active: Q.active, tracked: Q.tracked });
      const strip = await P.page.evaluate(() => { const e = document.querySelector('[data-m3-today]'); return e ? e.getAttribute('data-m3-today') : null; });
      rec.ok(`upright: the Today strip holds only the game's own (${strip}): no daily quests, no season`, strip != null && !/daily/.test(strip) && /streak/.test(strip), strip);
      if (strip && /streak/.test(strip)) {
        await tap(P, '[data-m3-chip="streak"]', true);
        const words = await P.page.evaluate(() => (document.querySelector('[data-m3-today-words="streak"]') || {}).textContent || '');
        rec.ok('upright: the streak\'s words open under the strip (the days, the freezes, how)', /day streak/.test(words) && /freezes/i.test(words), words.slice(0, 120));
        await tap(P, '[data-m3-chip="streak"]', true);
        rec.ok('upright: ...and shut again', !(await box(P, '[data-m3-today-words]')), null);
      }
      if (strip && /spin/.test(strip)) {
        await tap(P, '[data-m3-chip="spin"]', true);
        rec.ok('upright: the free spin\'s words, Spin there while it waits', !!(await box(P, '[data-m3-today-words="spin"]')), await attrs(P, '[data-m3-chip="spin"]', 'data-m3-lit'));
        await tap(P, '[data-m3-chip="spin"]', true);
      }
      const sm = await small(P);
      rec.ok('upright: every tappable thing in the panel 44 x 44 or more', sm.length === 0, sm);
      await shot(P, 'upright-quests');
      /* Done, a done quest's page, Back to Done */
      await tap(P, '[data-m3-qrail="done"]', true);
      Q = await probe(P);
      rec.ok(`upright: Done lists the quests handed in (${Q && Q.done.length})`, !!Q && Q.rail === 'done' && Q.done.length > 3, Q && Q.done.length);
      const firstDone = Q && Q.done[0];
      if (firstDone) {
        await tap(P, `[data-m3-quest="${firstDone}"]`, true);
        ps = await pstate(P);
        const DQ = await qprobe(P);
        rec.ok('upright: a done quest\'s page, its history, no Track', ps.page === 'quest' && !!DQ && DQ.status === 'done' && !DQ.acts.includes('track'), { ps, DQ });
        rec.ok('upright: Back in the header', !!(await box(P, '[data-menus3-back]')), null);
        await tap(P, '[data-menus3-back]', true);
        ps = await pstate(P);
        rec.ok('upright: Back to Done as it was', ps.page === 'root' && ps.rail === 'done', ps);
      }
      await tap(P, '[data-m3-qrail="offers"]', true);
      Q = await probe(P);
      rec.ok(`upright: On offer (${Q && Q.offers.length}) says who and where`, !!Q && Q.rail === 'offers', Q && Q.offers);
      await tap(P, '[data-m3-qrail="active"]', true);
      /* a ready quest's page */
      await tap(P, '[data-m3-quest="tut_1"]', true);
      ps = await pstate(P);
      let QQ = await qprobe(P);
      rec.ok('upright: Into the Blue\'s page in the panel: ready, NOW the hand-in, no step still to come', ps.page === 'quest' && ps.arg === 'tut_1' && !!QQ && QQ.status === 'ready' && QQ.continues === true, { ps, QQ });
      rec.ok('upright: its links: the slime in the Codex, the item, the place', !!QQ && QQ.links.some((l) => /^monster:/.test(l)) && QQ.links.some((l) => /^item:slime-remnants/.test(l)), QQ && QQ.links);
      const sm2 = await small(P);
      rec.ok('upright: every tappable thing on the quest page 44 x 44 or more', sm2.length === 0, sm2);
      await shot(P, 'upright-quest');
      const t0 = await P.page.evaluate(() => (document.querySelector('[data-quest-track]') || {}).getAttribute && document.querySelector('[data-quest-track]').getAttribute('data-quest-track'));
      await tap(P, '[data-quest-track]', true);
      const t1 = await P.page.evaluate(() => (document.querySelector('[data-quest-track]') || {}).getAttribute && document.querySelector('[data-quest-track]').getAttribute('data-quest-track'));
      rec.ok(`upright: Track turns at once (${t0} -> ${t1})`, !!t0 && !!t1 && t0 !== t1, { t0, t1 });
      if (t1 === 'off') await tap(P, '[data-quest-track]', true);
      if (await box(P, '[data-quest-door="rewards"]')) {
        await tap(P, '[data-quest-door="rewards"]', true);
        ps = await pstate(P);
        rec.ok('upright: Rewards over the quest', ps.page === 'rewards' && !!(await box(P, '[data-quest-ui2-rewards]')), ps);
        await tap(P, '[data-menus3-back]', true);
        ps = await pstate(P);
        rec.ok('upright: Back returns to the quest', ps.page === 'quest' && ps.arg === 'tut_1', ps);
      }
      /* the monster's link: v2.3.6867 (card MN step 8) the NEW Codex's page, in the panel on the quest's history; its Back is the quest */
      if (await box(P, '[data-m3-qlink="monster"]')) {
        await tap(P, '[data-m3-qlink="monster"]', true);
        await P.page.waitForTimeout(800);
        const bt = await bandTop(P);
        ps = await pstate(P);
        rec.ok('upright: the monster\'s link opens the new Codex\'s page in the panel', ps.open && ps.section === 'quests' && ps.page === 'cxMonster' && !(bt && bt.shown), { bt, ps });
        await tap(P, '[data-menus3-back]', true);
        await P.page.waitForTimeout(600);
        ps = await pstate(P);
        rec.ok('upright: its Back: the quest', ps.open && ps.section === 'quests' && ps.page === 'quest' && ps.arg === 'tut_1', { ps, bt: await bandTop(P) });
      } else rec.ok('upright: the monster\'s link drawn', false, QQ && QQ.links);
      /* Show on map: the map over the panel; its close is back on the quest */
      if (await box(P, '[data-journal-map]')) {
        await tap(P, '[data-journal-map]', true);
        await P.page.waitForTimeout(1200);
        const map = !!(await box(P, '[data-world-map]'));
        ps = await pstate(P);
        rec.ok('upright: Show on map opens the map over the panel, which stays', map && ps.open && ps.page === 'quest', { map, ps });
        await shot(P, 'upright-map');
        await tap(P, '[data-world-map-close]', true);
        await P.page.waitForTimeout(600);
        ps = await pstate(P);
        rec.ok('upright: the map closed: back on the quest', !(await box(P, '[data-world-map]')) && ps.open && ps.page === 'quest' && ps.arg === 'tut_1', ps);
      } else rec.ok('LISTED upright: Into the Blue has no Show on map here (the game cannot map it)', true, QQ && QQ.acts);
      await tap(P, '[data-menus3-x]', true);
      /* the quest line's road (QuestCard.jsx openQuestPage -> menus3Go('hud.questLine', { quest })) */
      await P.page.evaluate(() => window.__btMenus3.go('hud.questLine', { quest: 'tut_2' }));
      await P.page.waitForTimeout(800);
      ps = await pstate(P);
      rec.ok('upright: the quest line opens THAT quest\'s page in the panel', ps.open && ps.section === 'quests' && ps.page === 'quest' && ps.arg === 'tut_2', ps);
      await tap(P, '[data-menus3-back]', true);
      ps = await pstate(P);
      rec.ok('upright: ...its Back the Quests\' own page', ps.open && ps.page === 'root', ps);
      /* a tap on the world closes */
      const at = await P.page.evaluate(() => { const x = 195, y = 200; const el = document.elementFromPoint(x, y); return { x, y, tag: el ? el.tagName : null }; });
      if (at.tag === 'CANVAS') {
        await P.page.touchscreen.tap(at.x, at.y);
        await P.page.waitForTimeout(600);
        rec.ok('upright: a tap on the world closes it', (await pstate(P)).open === false, null);
      } else rec.ok(`LISTED upright: the world tap not played: ${at.tag}`, true, null);
    }
  } finally { await P.page.context().close().catch(() => {}); }

  /* ── 2. sideways ── */
  const S2 = await H.newPlayer(browser, { name: 'Questside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(S2, rec, 'sideways')) {
      await seed(S2, wsPort, rec, 'sideways');
      const ps = await openWorld(S2, true);
      const pb = await box(S2, '[data-menus3-panel]');
      rec.ok('sideways: World opens the drawer, 40% wide on the right, on Quests', ps.open && ps.section === 'quests' && !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, { ps, pb });
      await S2.page.waitForTimeout(1200);
      const sm = await small(S2);
      rec.ok('sideways: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      await shot(S2, 'sideways-quests');
      const ud = await underDrawer(S2);
      rec.ok('sideways: the drawer takes a tap over the minimap\'s box and the gear (they stand under it)', drawerOk(ud) && ud.some((x) => x.inPanel), ud);
      const was = await underDrawer(S2, true);
      rec.ok(`LISTED sideways: without the mend (main) the drawer ${drawerOk(was) ? 'took them too' : 'lost the tap to ' + was.filter((x) => !x.inPanel && !x.none && !x.outside).map((x) => x.sel).join(' and ')}`, true, was);
      await tap(S2, '[data-m3-quest="tut_1"]', true);
      const q = await qprobe(S2);
      rec.ok('sideways: a quest\'s page inside the drawer', !!q && q.id === 'tut_1' && !!(await box(S2, '[data-menus3-panel] [data-quest-ui2-page]')), q);
      const sm2 = await small(S2);
      rec.ok('sideways: its tappable things 44 x 44 or more', sm2.length === 0, sm2);
      await shot(S2, 'sideways-quest');
    }
  } finally { await S2.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Questdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(D, rec, 'computer')) {
      await seed(D, wsPort, rec, 'computer');
      let ps = await openWorld(D, false);
      rec.ok('computer: World opens the drawer on Quests', ps.open && ps.section === 'quests' && (await D.page.evaluate(() => document.querySelector('[data-menus3-panel]').getAttribute('data-menus3-panel'))) === 'drawer', ps);
      await shot(D, 'computer-quests');
      const ud = await underDrawer(D);
      rec.ok('computer: the drawer takes a click over the minimap\'s box and the gear', drawerOk(ud) && ud.some((x) => x.inPanel), ud);
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(500);
      rec.ok('computer: Esc closes it', (await pstate(D)).open === false, null);
      /* no panel: the minimap's box takes its click as before (nothing moved) */
      const mo = await D.page.evaluate(() => { const el = document.querySelector('[data-world-map-open]'); if (!el) return null; const r = el.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { mine: h === el, vis: getComputedStyle(el).visibility }; });
      rec.ok('computer: no panel open, the minimap\'s box takes its click', !!mo && mo.mine && mo.vis === 'visible', mo);
      await D.page.keyboard.press('j');
      await D.page.waitForTimeout(700);
      ps = await pstate(D);
      rec.ok('computer: J (the band\'s key) opens it on Quests', ps.open && ps.section === 'quests', ps);
      await D.page.keyboard.press('Escape');
    }
  } finally { await D.page.context().close().catch(() => {}); }
}
