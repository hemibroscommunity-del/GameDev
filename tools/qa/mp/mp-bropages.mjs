/* ═══ mp-bropages (v2.3.6600, card BRO part 1): THE BRO TAB IN PAGES ═══
 *
 * The owner, 2026-11-25, with four mockups: "I want it so that it shows "pages" where all the
 * information needs to be displayed together (instead of scrolling little by little) so all related
 * information is shown at once. The biggest improvement is that the Bro tab becomes a showcase of
 * the player's character rather than a long directory of features."  So the Bro tab is three pages
 * (sheet/BroPages.jsx; the rules src/game/broPages.js), each whole with no scroller.
 *
 * In the world (world: 'wheel'):
 *   1. upright (390 x 664: an iPhone's page under Safari's bars), a finger: Bro opens the
 *      OVERVIEW, whole (scrollHeight <= clientHeight), its mark lit of three: your portrait, name,
 *      "LV N", NO XP bar, "No title equipped"; Combat overview's four numbers (DPS, Damage, Defense
 *      of the weapon in hand, "n/6" gear); the three mastery tiles, "Equipped" on the one in hand,
 *      each the XP flight's landing (data-xpbar, on screen); the one progress row; no word cut,
 *      nothing past its edge, every button touch-action: manipulation;
 *   2. "Details" opens COMBAT on the weapon in hand, whole: the picker, Offense 8, Survivability 4,
 *      Mobility 1 (today's thirteen, none lost), the overview's numbers the same as its cells; Bow
 *      in the picker shows the bow's; the back chip comes to the Overview; the Staff tile opens
 *      Combat on the staff;
 *   3. the progress row opens PROGRESS, whole: the counters, the bar, the doors two across;
 *   4. a real level-up: the Overview's gold chip reads the points waiting, glows, carries
 *      data-section="Build" (the coach's "Tap Points"), and opens the Points window; the Points door
 *      glows too;
 *   5. every door opens what it opened (Life Skills, Pet, Clan, Achievements, Titles: the page under
 *      Bro, its back coming to the Progress page; Homestead: where the farm is; Points: the window,
 *      its close back to Progress; Equipment: the Gear tab, and Bro again opens the Overview); the
 *      title line and the counters open Achievements;
 *   6. the small phone (375 x 553): each page whole;
 *   7. a phone on its side (844 x 390): the three side by side, no marks, each whole, none cut;
 *   8. a computer playing wide: P opens the Overview, each page whole, a click on a mark moves;
 *   9. `?bropages=0`: today's card again (data-bro-card="v2", its three panels), no pages.
 * Pictures (deviceScaleFactor 2): tools/qa/mp/out/bro-pages-{overview,combat,progress,points,side,desk}.png
 * (docs/shots/ has them on 256 colours).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `${name}.png`) }); } catch (e) { /* a picture only */ } };

/* a finger: a real touch at the element's middle */
async function touch(P, sel) {
  const r = await P.page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, reach: !!t && (t === e || e.contains(t)) };
  }, sel);
  if (!r) return false;
  if (!r.reach) console.log(`    (the finger's spot for ${sel} is covered)`);
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
  await new Promise((res) => setTimeout(res, 60));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  return true;
}

const bus = (P) => P.page.evaluate(() => {
  const b = window.__broDashPanelBus;
  return b ? { mode: b.state.mode, stack: b.state.stack.slice() } : null;
});

/* what the pages show */
const pages = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-bro-card="pages"]');
  const S = window._gameState && window._gameState.current;
  if (!c) return { there: false, old: !!document.querySelector('[data-bro-card="v2"]') };
  const txt = (e) => (e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : null);
  const cr = c.getBoundingClientRect();
  const one = (pg) => {
    const p = c.querySelector(`[data-bro-pg="${pg}"]`);
    if (!p) return null;
    const q = (s) => p.querySelector(s);
    const r = p.getBoundingClientRect();
    const face = q('.bt-bro3-face');
    return {
      sh: p.scrollHeight, ch: p.clientHeight, w: Math.round(r.width), l: Math.round(r.left), t: Math.round(r.top),
      marks: [...p.querySelectorAll('[data-bro-mark]')].map((m) => ({ page: m.getAttribute('data-bro-mark'), on: m.classList.contains('is-on'), back: m.hasAttribute('data-bro-back'), text: txt(m) })),
      face: face ? face.naturalWidth : null,
      name: txt(q('[data-bro-name]')),
      lv: txt(q('[data-bro-level]')),
      xpBar: !!q('.bt-bro3-you progress, .bt-bro3-you [data-xp]') || /\bXP\b/.test(txt(q('.bt-bro3-you')) || ''),
      title: q('[data-bro-title]') ? { id: q('[data-bro-title]').getAttribute('data-bro-title'), text: txt(q('[data-bro-title]')) } : null,
      nums: [...p.querySelectorAll('[data-bro-num]')].map((e) => ({ k: e.getAttribute('data-bro-num'), v: e.getAttribute('data-v') })),
      tiles: [...p.querySelectorAll('[data-bro-skill]')].map((e) => { const b = e.getBoundingClientRect(); return { k: e.getAttribute('data-bro-skill'), held: e.hasAttribute('data-bro-held'), text: txt(e), xpbar: e.getAttribute('data-xpbar'), w: Math.round(b.width), h: Math.round(b.height), onScreen: b.top >= 0 && b.bottom <= innerHeight }; }),
      prow: !!q('[data-bro-progress]'),
      chip: q('[data-bro-pointschip]') ? { n: Number(q('[data-bro-pointschip]').getAttribute('data-bro-pointschip')), sec: q('[data-bro-pointschip]').getAttribute('data-section'),
        glow: q('[data-bro-pointschip] [data-pts-glow]') ? getComputedStyle(q('[data-bro-pointschip] [data-pts-glow]')).animationName : null } : null,
      picks: [...p.querySelectorAll('[data-bro-pick]')].map((e) => ({ k: e.getAttribute('data-bro-pick'), on: e.getAttribute('aria-pressed') === 'true' })),
      weapon: p.getAttribute('data-bro-weapon'),
      groups: [...p.querySelectorAll('[data-bro-group]')].map((g) => ({ id: g.getAttribute('data-bro-group'), keys: [...g.querySelectorAll('[data-bro-stat]')].map((e) => e.getAttribute('data-bro-stat')) })),
      cells: Object.fromEntries([...p.querySelectorAll('[data-bro-stat]')].map((e) => [e.getAttribute('data-bro-stat'), e.getAttribute('data-v')])),
      counters: !!q('[data-bro-counters]'),
      doors: [...p.querySelectorAll('[data-bro-row]')].map((e) => ({ id: e.getAttribute('data-bro-row'), live: e.classList.contains('is-live'), n: e.getAttribute('data-bro-row-n'), sec: e.getAttribute('data-section'), x: Math.round(e.getBoundingClientRect().left) })),
      ta: [...p.querySelectorAll('button')].filter((e) => getComputedStyle(e).touchAction !== 'manipulation').length,
      cut: [...p.querySelectorAll('*')].filter((el) => !el.children.length && (el.textContent || '').trim() && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map((el) => (el.textContent || '').trim().slice(0, 20)),
      past: [...p.querySelectorAll('*')].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 4 && (b.right > r.right + 1 || b.left < r.left - 1); }).length,
      minPx: Math.min(...[...p.querySelectorAll('*')].filter((el) => !el.children.length && (el.textContent || '').trim()).map((el) => parseFloat(getComputedStyle(el).fontSize))),
    };
  };
  const qa = window.__btBroCard || {};
  return {
    there: true, open: c.getAttribute('data-bro-page-open'), wide: c.getAttribute('data-bro-wide') === '1', dense: c.getAttribute('data-bro-dense') === '1',
    w: Math.round(cr.width), h: Math.round(cr.height), qa: { page: qa.page, weapon: qa.weapon, h: qa.h },
    shown: [...c.querySelectorAll('[data-bro-pg]')].map((e) => e.getAttribute('data-bro-pg')),
    overview: one('overview'), combat: one('combat'), progress: one('progress'),
    myName: S && S.myName, active: S && S.rpg ? S.rpg.activeSlot : null, caps: !!(S && S._serverCaps && S._serverCaps.achievements),
  };
});
const whole = (p) => !!p && p.sh <= p.ch;
const CAT_OF = { melee: 'sword', ranged: 'bow', staff: 'staff' };
const STATS = ['damage', 'dps', 'aspd', 'range', 'crit', 'critDmg', 'special', 'elem', 'def', 'armor', 'dodge', 'eres', 'move'];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Pagebro', wsPort, webPort, viewport: { width: 390, height: 664 }, touch: true, dpr: 2, world: 'wheel' });
  const errs = [];
  let stopP = () => {};
  P.page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  try {
    await H.enterWorld(P);
    stopP = H.keepAlive(P);
    await P.page.waitForTimeout(2500);
    await H.closeNpcDialogue(P).catch(() => {});
    const zone = await H.readState(P, (S) => S.currentZone);
    rec.ok(`in the world (zone ${zone}) (guard)`, zone === 'wheel', { zone });
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'kit', myId, { what: 'weapons' }).catch(() => null);
    await P.page.waitForTimeout(1200);

    /* ── 1. the Overview ── */
    await H.dashOpen(P, 'hero');
    await P.page.waitForTimeout(1500);
    const a = await pages(P);
    const ov = a.overview || {};
    rec.ok(`Bro opens the pages on the Overview (${a.w} x ${a.h}; shown: ${a.shown && a.shown.join()})`,
      a.there && a.open === 'overview' && !a.wide && a.shown.join() === 'overview', a);
    rec.ok(`...whole, no scroll (${ov.sh} <= ${ov.ch})`, whole(ov), ov);
    rec.ok(`...three page marks, the Overview's lit (${(ov.marks || []).map((m) => m.text + (m.on ? '*' : '')).join(' | ')})`,
      (ov.marks || []).map((m) => m.page).join() === 'overview,combat,progress' && ov.marks.filter((m) => m.on).map((m) => m.page).join() === 'overview' && !ov.marks.some((m) => m.back), ov.marks);
    rec.ok(`...your portrait, your name ("${ov.name}"), "${ov.lv}", NO XP bar, "${ov.title && ov.title.text}"`,
      ov.face > 0 && ov.name === a.myName && /^LV \d+$/.test(ov.lv || '') && !ov.xpBar && !!ov.title && ov.title.id === 'none' && ov.title.text === 'No title equipped', ov);
    const held = CAT_OF[a.active] || 'sword';
    rec.ok(`...Combat overview: ${(ov.nums || []).map((x) => x.k + ' ' + x.v).join(', ')}`,
      (ov.nums || []).map((x) => x.k).join() === 'dps,damage,def,gear' && /^\d+\/6$/.test((ov.nums.find((x) => x.k === 'gear') || {}).v || ''), ov.nums);
    /* "Equipped" only with a weapon in that slot (the DPS a number, not broStats' dash) */
    const armed = /\d/.test((ov.nums.find((x) => x.k === 'dps') || {}).v || '');
    rec.ok(`...the three mastery tiles, the ${held} in hand lit${armed ? ' and "Equipped"' : ' (none in that hand: no "Equipped")'}, each the XP flight's landing on screen`,
      (ov.tiles || []).map((t) => t.k).join() === 'sword,bow,staff' && ov.tiles.filter((t) => t.held).map((t) => t.k).join() === held
      && ov.tiles.filter((t) => /Equipped/.test(t.text || '')).map((t) => t.k).join() === (armed ? held : '')
      && ov.tiles.every((t) => !!t.xpbar && t.w > 0 && t.onScreen), ov.tiles);
    rec.ok('...the one progress row', ov.prow, ov.prow);
    rec.ok(`...no word cut (${(ov.cut || []).join(', ')}), nothing past its edge (${ov.past}), every button touch-action: manipulation (${ov.ta} not), text ${ov.minPx} px or more`,
      (ov.cut || []).length === 0 && ov.past === 0 && ov.ta === 0 && ov.minPx >= 9, ov);
    await shot(P, 'bro-pages-overview');

    /* ── 2. Combat ── */
    await touch(P, '[data-bro-details]');
    await P.page.waitForTimeout(700);
    const b = await pages(P);
    const cb = b.combat || {};
    rec.ok(`"Details" opens Combat on the weapon in hand (${cb.weapon})`, b.open === 'combat' && cb.weapon === held && cb.picks.filter((x) => x.on).map((x) => x.k).join() === held, { open: b.open, weapon: cb.weapon, picks: cb.picks });
    rec.ok(`...whole, no scroll (${cb.sh} <= ${cb.ch}); its mark lit, the Overview's the back chip`,
      whole(cb) && cb.marks.find((m) => m.on).page === 'combat' && cb.marks.find((m) => m.page === 'overview').back, cb.marks);
    const gk = (id) => ((cb.groups || []).find((g) => g.id === id) || {}).keys || [];
    rec.ok(`...Offense ${gk('offense').length}, Survivability ${gk('survive').length}, Mobility ${gk('move').length}: today's thirteen, none lost`,
      gk('offense').join() === 'damage,dps,aspd,range,crit,critDmg,special,elem' && gk('survive').join() === 'def,armor,dodge,eres' && gk('move').join() === 'move'
      && STATS.every((k) => cb.cells[k] != null), cb.groups);
    rec.ok('...the Overview\'s numbers are its cells\'', ov.nums.filter((x) => x.k !== 'gear').every((x) => cb.cells[x.k] === x.v), { nums: ov.nums, cells: cb.cells });
    rec.ok(`...no word cut (${(cb.cut || []).join(', ')}), nothing past its edge, text ${cb.minPx} px or more`, (cb.cut || []).length === 0 && cb.past === 0 && cb.ta === 0 && cb.minPx >= 9, cb);
    await shot(P, 'bro-pages-combat');
    const pickTo = held === 'bow' ? 'sword' : 'bow';
    await touch(P, `[data-bro-pick="${pickTo}"]`);
    await P.page.waitForTimeout(600);
    const b2 = (await pages(P)).combat || {};
    rec.ok(`...the picker's ${pickTo} shows the ${pickTo}'s stats`, b2.weapon === pickTo && b2.picks.filter((x) => x.on).map((x) => x.k).join() === pickTo, { weapon: b2.weapon, picks: b2.picks });
    await touch(P, '[data-bro-mark="overview"]');
    await P.page.waitForTimeout(600);
    rec.ok('...the back chip comes to the Overview', (await pages(P)).open === 'overview');
    await touch(P, '[data-bro-skill="staff"]');
    await P.page.waitForTimeout(600);
    const b3 = await pages(P);
    rec.ok('the Staff tile opens Combat on the staff', b3.open === 'combat' && b3.combat.weapon === 'staff', { open: b3.open, weapon: b3.combat && b3.combat.weapon });

    /* ── 3. Progress ── */
    await touch(P, '[data-bro-mark="overview"]');
    await P.page.waitForTimeout(500);
    await touch(P, '[data-bro-progress]');
    await P.page.waitForTimeout(700);
    const c = await pages(P);
    const pr = c.progress || {};
    const wantDoors = (c.caps ? ['skills', 'titles', 'homestead', 'pet', 'clan', 'points', 'achievements', 'equipment'] : ['skills', 'homestead', 'pet', 'clan', 'points', 'equipment']);
    rec.ok(`the progress row opens Progress, whole (${pr.sh} <= ${pr.ch})`, c.open === 'progress' && whole(pr), pr);
    rec.ok(`...the counters, and today's doors two across (${(pr.doors || []).map((x) => x.id).join(', ')})`,
      pr.counters && (pr.doors || []).map((x) => x.id).join() === wantDoors.join() && new Set(pr.doors.map((x) => x.x)).size === 2, pr.doors);
    rec.ok(`...no word cut (${(pr.cut || []).join(', ')}), nothing past its edge, text ${pr.minPx} px or more`, (pr.cut || []).length === 0 && pr.past === 0 && pr.ta === 0 && pr.minPx >= 9, pr);
    await shot(P, 'bro-pages-progress');

    /* ── 4. points to spend ── */
    const kit = await H.devOp(wsPort, 'kit', myId, { what: 'levels' });
    rec.ok('the worker levelled the bro up through its own XP path (guard)', !!(kit && kit.ok !== false), kit);
    let d = null;
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(300);
      d = await pages(P);
      const pt = d.progress && d.progress.doors.find((x) => x.id === 'points');
      if (pt && Number(pt.n) > 0) break;
    }
    const pool = await H.readState(P, (S) => { const p = S.rpg && S.rpg.prog3; return p ? (p.pool || 0) + (p.shared || 0) : null; });
    const ptd = (d.progress && d.progress.doors.find((x) => x.id === 'points')) || {};
    rec.ok(`the Points door reads the points waiting (${ptd.n}, ${pool}) and glows`, Number(ptd.n) > 0 && Number(ptd.n) === pool && ptd.live && ptd.sec === 'Build', { ptd, pool });
    await touch(P, '[data-bro-mark="overview"]');
    await P.page.waitForTimeout(700);
    const e = await pages(P);
    const chip = e.overview && e.overview.chip;
    rec.ok(`...and the Overview's gold chip (${chip && chip.n}) glows where the coach's "Tap Points" aims (data-section="Build"), the page still whole`,
      !!chip && chip.n === pool && chip.sec === 'Build' && chip.glow === 'bt-pts-glow' && whole(e.overview), { chip, ov: e.overview && [e.overview.sh, e.overview.ch] });
    await shot(P, 'bro-pages-points');
    await touch(P, '[data-bro-pointschip]');
    await P.page.waitForTimeout(900);
    const pw = await P.page.evaluate(() => !!document.querySelector('[data-bro-popup="Build"]'));
    rec.ok('...the chip opens the Points window', pw);
    await touch(P, '[data-bro-popup-close]');
    await P.page.waitForTimeout(900);
    rec.ok('...its close comes back to the Overview', (await pages(P)).open === 'overview');

    /* ── 5. the doors ── */
    await touch(P, '[data-bro-mark="progress"]');
    await P.page.waitForTimeout(600);
    const under = [['skills', 'hero/skills', 'Life Skills'], ['pet', 'hero/pets', 'Pet'], ['clan', 'hero/clan', 'Clan']];
    if (c.caps) under.unshift(['achievements', 'hero/achievements', 'Achievements'], ['titles', 'hero/achievements', 'Titles']);
    for (const [id, stack, name] of under) {
      await touch(P, `[data-bro-row="${id}"]`);
      await P.page.waitForTimeout(1100);
      const bb = await bus(P);
      rec.ok(`${name} opens its page under Bro (${bb && bb.stack.join('/')})`, !!bb && bb.stack.join('/') === stack, bb);
      await P.page.evaluate(() => { const x = window.__broDashPanelBus; if (x.state.stack.length > 1) x.pop(); });
      await P.page.waitForTimeout(800);
      const back = await pages(P);
      rec.ok('...and back comes to the Progress page', back.there && back.open === 'progress' && (await bus(P)).stack.join('/') === 'hero', back.open);
    }
    await touch(P, '[data-bro-row="homestead"]');
    await P.page.waitForTimeout(700);
    const farm = await P.page.evaluate(() => { const x = window.__btInfoPopup && window.__btInfoPopup.current(); return x ? { title: x.title, body: x.body } : null; });
    rec.ok('Homestead says where the farm is', !!farm && farm.title === 'Homestead' && /Feed & Seed/.test(farm.body), farm);
    await P.page.evaluate(() => window.__btInfoPopup && window.__btInfoPopup.close());
    await P.page.waitForTimeout(400);
    await touch(P, '[data-bro-row="points"]');
    await P.page.waitForTimeout(900);
    rec.ok('Points opens the Points window', await P.page.evaluate(() => !!document.querySelector('[data-bro-popup="Build"]')));
    await touch(P, '[data-bro-popup-close]');
    await P.page.waitForTimeout(900);
    rec.ok('...its close comes back to the Progress page', (await pages(P)).open === 'progress');
    if (c.caps) {
      await touch(P, '[data-bro-counters]');
      await P.page.waitForTimeout(1000);
      rec.ok('the counters open Achievements', (await bus(P)).stack.join('/') === 'hero/achievements');
      await P.page.evaluate(() => { const x = window.__broDashPanelBus; if (x.state.stack.length > 1) x.pop(); });
      await P.page.waitForTimeout(700);
    }
    await touch(P, '[data-bro-row="equipment"]');
    await P.page.waitForTimeout(1000);
    const g = await bus(P);
    rec.ok(`Equipment opens the Gear tab (${g && g.mode})`, !!g && g.mode === 'bar', g);
    await H.dashOpen(P, 'hero');
    await P.page.waitForTimeout(1200);
    const f = await pages(P);
    rec.ok('...and Bro again opens the Overview (a fresh visit)', f.there && f.open === 'overview', f.open);
    if (c.caps) {
      await touch(P, '[data-bro-title]');
      await P.page.waitForTimeout(1000);
      rec.ok('the title line opens Achievements (its title picker)', (await bus(P)).stack.join('/') === 'hero/achievements');
      await P.page.evaluate(() => { const x = window.__broDashPanelBus; if (x.state.stack.length > 1) x.pop(); });
      await P.page.waitForTimeout(700);
    }

    /* ── 6. the small phone ── */
    await P.page.setViewportSize({ width: 375, height: 553 });
    await P.page.waitForTimeout(1500);
    for (const pg of ['overview', 'combat', 'progress']) {
      await P.page.evaluate((x) => window.__btBroCard && window.__btBroCard.to({ to: x }), pg);
      await P.page.waitForTimeout(500);
      const s = await pages(P);
      const p = s[pg] || {};
      rec.ok(`375 x 553: ${pg} whole (${p.sh} <= ${p.ch}), none cut (${(p.cut || []).join(', ')})`, whole(p) && (p.cut || []).length === 0 && p.past === 0, p);
    }

    /* ── 7. on its side ── */
    await P.page.setViewportSize({ width: 844, height: 390 });
    await P.page.waitForTimeout(1500);
    await H.dashOpen(P, 'dashboard');
    await P.page.waitForTimeout(900);
    await H.dashOpen(P, 'hero');
    await P.page.waitForTimeout(1500);
    const sd = await pages(P);
    rec.ok(`a phone on its side: the three side by side (${sd.w} x ${sd.h}, ${sd.dense ? 'the dense cut' : 'roomy'}), no marks`,
      sd.there && sd.wide && sd.shown.join() === 'overview,combat,progress' && sd.overview.l < sd.combat.l && sd.combat.l < sd.progress.l
      && Math.abs(sd.overview.t - sd.progress.t) < 3 && [sd.overview, sd.combat, sd.progress].every((p) => p.marks.length === 0), { w: sd.w, h: sd.h, shown: sd.shown });
    for (const pg of ['overview', 'combat', 'progress']) {
      const p = sd[pg];
      rec.ok(`...${pg} whole (${p.sh} <= ${p.ch}), none cut (${p.cut.join(', ')}), nothing past its edge, text ${p.minPx} px or more`, whole(p) && p.cut.length === 0 && p.past === 0 && p.minPx >= 9, p);
    }
    await shot(P, 'bro-pages-side');
    rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  } finally {
    stopP();
    await P.page.context().close().catch(() => {});
  }

  /* ── 8. a computer playing wide ── */
  let stopD = () => {};
  const D = await H.newPlayer(browser, { name: 'Deskpages', wsPort, webPort, viewport: { width: 1440, height: 900 }, dpr: 2, world: 'wheel', wide: true });
  try {
    await H.enterWorld(D);
    stopD = H.keepAlive(D);
    await D.page.waitForTimeout(2500);
    await H.closeNpcDialogue(D).catch(() => {});
    await D.page.mouse.click(720, 300).catch(() => {});
    await D.page.keyboard.press('p');
    await D.page.waitForTimeout(1500);
    const k = await pages(D);
    rec.ok(`a computer: P opens Bro on the Overview (${k.w} x ${k.h}, ${k.wide ? 'side by side' : 'one page'})`, k.there && k.open === 'overview', { w: k.w, h: k.h, open: k.open });
    await shot(D, 'bro-pages-desk');
    for (const pg of ['overview', 'combat', 'progress']) {
      if (!k.wide) { await D.page.click(`[data-bro-mark="${pg}"]`).catch(() => {}); await D.page.waitForTimeout(600); }
      const s = await pages(D);
      const p = s[pg] || {};
      rec.ok(`...${pg} whole (${p.sh} <= ${p.ch}), none cut (${(p.cut || []).join(', ')})`, s.open === pg || s.wide ? whole(p) && (p.cut || []).length === 0 && p.past === 0 : false, { open: s.open, p });
    }
  } finally {
    stopD();
    await D.page.context().close().catch(() => {});
  }

  /* ── 9. the switch ── */
  const O = await H.newPlayer(browser, { name: 'Oldcard', wsPort, webPort, viewport: { width: 390, height: 664 }, touch: true, world: 'wheel', query: 'bropages=0' });
  try {
    await H.enterWorld(O);
    await O.page.waitForTimeout(2000);
    await H.closeNpcDialogue(O).catch(() => {});
    await H.dashOpen(O, 'hero');
    await O.page.waitForTimeout(1500);
    const o = await O.page.evaluate(() => ({
      old: !!document.querySelector('[data-bro-card="v2"]'), pages: !!document.querySelector('[data-bro-card="pages"]'),
      panels: [...document.querySelectorAll('[data-bro-card="v2"] [data-bro-panel]')].map((e) => e.getAttribute('data-bro-panel')),
    }));
    rec.ok(`?bropages=0 gives back today's card (${o.panels.join(', ')})`, o.old && !o.pages && o.panels.join() === 'id,stats,rows', o);
  } finally {
    await O.page.context().close().catch(() => {});
  }
}
