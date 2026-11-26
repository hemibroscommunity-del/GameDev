/* ═══ QUESTS UNDER THE NEW DASHBOARD (v2.3.6691, card UI2-quests, the build's step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 6, and its acceptance
 * task: "Identify the next objective in an active quest, see previous steps,
 * track it or locate it where available, without seeing future steps."
 *
 * A real phone (upright, touch) against a real worker, in the world's BroTown:
 *   1. Into the Blue (tut_1) taken; Quests (the Menu's door) is the landing at
 *      390 x 844: its row (Mayor Bro's face, the name, 0/4), the doors under
 *      it (Completed, On offer when someone has one); no tabs, no page
 *      marks, no picker; the band's height as on the Menu's root;
 *   2. THE ACCEPTANCE TASK: the row opens Into the Blue's own page (header
 *      "Quest"): the talk done with its tick, NOW the Slime Remains with 0/4
 *      and its bar and the Earth Forest, "The adventure continues"; no
 *      hand-in, no "Then:", no count of steps or percent; Track tracks it;
 *   3. Rewards opens (header "Rewards": 25 gold, +5 AP, the Pine Bow and
 *      Staff); Back returns to the quest, Back again to the landing at its
 *      scroll; Show on map opens the world map;
 *   4. On offer and an offer's page (NOW the talk, no Track: on the
 *      computer's character, before it takes a quest, with the empty
 *      landing and its doors); Box Traps (beast_1) taken: two rows, the
 *      tracked one first; every other quest
 *      handed in (the dev lever): Completed (n) and a done quest's whole
 *      history (handed in, its "Next:" line, Rewards, no Track or map);
 *   5. the pinned card's road (__btQuestDetail.open, QuestCard's
 *      openQuestPage): the quest's page, Back says World and closes;
 *   6. 375 x 667, 844 x 390, 667 x 375, and a computer (`wide`, says no
 *      "tap"): the landing and the quest's page with nothing clipped, no
 *      press under 44 px, no word under 11 px;
 *   7. `?ui2=0` gives today's pages (QuestPages.jsx), `?ui2=0&questpages=0`
 *      the older list;
 *   8. no page errors.
 * Pictures: docs/shots/ui2-quests-*.png (the band, at deviceScaleFactor 2).
 */
import fs from 'node:fs';
import path from 'node:path';
import * as H from './harness.mjs';

export const lane = 'full';

const SHOTS = path.join(H.REPO, 'docs', 'shots');
const PHONE = { width: 390, height: 844 };

async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: Math.min(innerHeight, b.bottom) - b.top }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return file;
  } catch (e) { return null; }
}
const tap = async (P, sel, ms = 700) => { await P.page.locator(sel).first().click({ timeout: 15000 }); await P.page.waitForTimeout(ms); };

/* what is up: the frame's header and the Quests page drawn under it */
function look() {
  const t = document.querySelector('[data-dash-title]');
  const box = document.querySelector('[data-band-box="page"]') || document.querySelector('.bt-dashboard');
  const B = box ? box.getBoundingClientRect() : null;
  const band = document.querySelector('.bt-dashboard');
  const land = document.querySelector('[data-quests-ui2="landing"]');
  const qp = document.querySelector('[data-quest-ui2-page]');
  const root = land || qp || document.querySelector('[data-quest-ui2-rewards]') || document.querySelector('[data-quests-ui2-done]') || document.querySelector('[data-quests-ui2-offers]');
  const txt = (el) => (el ? (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const presses = root ? Array.from(root.querySelectorAll('button')).map((e) => { const r = e.getBoundingClientRect(); return { k: e.getAttribute('data-quest-row') || e.getAttribute('data-quest-door') || e.getAttribute('data-u2-action') || e.textContent.trim().slice(0, 16), w: Math.round(r.width), h: Math.round(r.height), out: !!B && (r.left < B.left - 0.5 || r.right > B.right + 0.5 || r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5), seen: r.width > 0 && r.height > 0 }; }).filter((p) => p.seen) : [];
  let minFont = 99;
  const clipped = [];
  if (root) {
    for (const e of root.querySelectorAll('*')) {
      if (!Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = e.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) continue;
      minFont = Math.min(minFont, parseFloat(getComputedStyle(e).fontSize) || 99);
      if (B && (r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5)) {
        /* a word outside the page: a scroller's own rows may be, the rest never */
        let sc = e.parentElement, inScroller = false;
        while (sc && sc !== root) { const cs = getComputedStyle(sc); if (/(auto|scroll)/.test(cs.overflowY)) { inScroller = true; break; } sc = sc.parentElement; }
        if (!inScroller) clipped.push(e.textContent.trim().slice(0, 30));
      }
    }
  }
  const nowEl = qp && qp.querySelector('[data-journal="now"]');
  const nr = nowEl ? nowEl.getBoundingClientRect() : null;
  const bus = window.__broDashPanelBus;
  const nv = bus && bus.nav ? bus.nav() : null;
  const top = nv && nv.shown ? nv[nv.ws][nv[nv.ws].length - 1] : null;
  return {
    page: t ? t.getAttribute('data-dash-title') : null,
    title: txt(document.querySelector('[data-dash-frame] [data-u2="title"]')),
    back: txt(document.querySelector('[data-dash-frame] [data-dash-ctl="back"]')),
    shown: !!(nv && nv.shown), sel: top ? top.sel : null, kind: (document.querySelector('[data-dash-frame]') || { getAttribute: () => null }).getAttribute('data-dash-frame'),
    band: band ? Math.round(band.getBoundingClientRect().height) : null,
    land: land ? { kind: land.getAttribute('data-quests-kind'), rows: Array.from(land.querySelectorAll('[data-quest-row]')).map((e) => ({ id: e.getAttribute('data-quest-row'), star: e.getAttribute('data-quest-row-track'), count: (e.querySelector('[data-quest-row-count]') || { getAttribute: () => null }).getAttribute('data-quest-row-count'), face: !!e.querySelector('img[data-journal-face]') })),
      doors: Array.from(land.querySelectorAll('[data-quest-door]')).map((e) => e.getAttribute('data-quest-door') + ':' + e.textContent.replace(/[›\s]+$/, '').trim()), scrollTop: (land.querySelector('.u2-ql-list') || { scrollTop: 0 }).scrollTop } : null,
    quest: qp ? {
      id: qp.getAttribute('data-quest-ui2-page'), status: qp.getAttribute('data-quest-ui2-status'),
      steps: Array.from(qp.querySelectorAll('[data-step-state]')).map((e) => e.getAttribute('data-step-state') + ':' + txt(e)),
      now: txt(qp.querySelector('[data-journal-now]')), count: (qp.querySelector('[data-journal-count]') || { getAttribute: () => null }).getAttribute('data-journal-count'),
      bar: !!qp.querySelector('[data-journal="now"] .u2-fill'), where: txt(qp.querySelector('[data-journal-where]')), pic: !!qp.querySelector('[data-quest-now-pic]'),
      continues: !!qp.querySelector('[data-quest-continues]'), next: txt(qp.querySelector('[data-quest-next-line]')),
      track: (qp.querySelector('[data-quest-track]') || { getAttribute: () => null }).getAttribute('data-quest-track'), map: !!qp.querySelector('[data-journal-map]'),
      rewards: !!qp.querySelector('[data-quest-door="rewards"]'), nowInside: !!(nr && B && nr.top >= B.top - 0.5 && nr.bottom <= B.bottom + 0.5),
    } : null,
    text: txt(root), presses, small: presses.filter((p) => p.w < 44 || p.h < 44), outside: presses.filter((p) => p.out), minFont, clipped,
    tabs: root ? root.querySelectorAll('[role="tab"], [data-quest-tab], [data-quest-mark], [data-quest-picker]').length : 0,
    map: !!(window.__btWorldMap && window.__btWorldMap.open),
  };
}
const read = (P) => P.page.evaluate(look);
const FUTURE_WORDS = /Hand it in|Then:|\b\d+\s+of\s+\d+\b|\d\s*%|percent|Story/;
const fits = (L) => !!L && L.small.length === 0 && L.outside.length === 0 && L.clipped.length === 0 && L.minFont >= 11;
const fitBrief = (L) => (L ? { small: L.small, outside: L.outside, clipped: L.clipped.slice(0, 4), minFont: L.minFont } : null);

async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world's BroTown (guard)`, !!w, w);
  if (w) {
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
    await P.page.waitForTimeout(1200);
  }
  return !!w;
}
async function take(P, wsPort, rec, qid, tag) {
  const accept = (q) => P.page.evaluate((id) => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: id } }); }, q);
  const me = await H.readState(P, (S) => S.myId);
  await accept(qid);
  /* the function runs in the page (no `qid` there): it reads the whole map, the test reads the quest's state */
  const state = () => H.waitFor(P, (S) => (S.rpg && S.rpg._quests) || {}, (v) => !!v && v[qid] === 'active', { timeout: 15000, label: qid + ' active' }).then((v) => v[qid]).catch(() => null);
  let q = await state();
  if (q !== 'active') {
    await H.devOp(wsPort, 'testmode', me, { on: true }).catch(() => {});
    await accept(qid);
    q = await state();
  }
  rec.ok(`${tag}: ${qid} taken (${q}) (guard)`, q === 'active');
  return q === 'active';
}

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const errors = [];
  const P = await H.newPlayer(browser, { name: 'Questbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  const stopAlive = H.keepAlive(P);
  try {
    await phone({ P, wsPort, rec });
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
  /* 6, a computer */
  const C = await H.newPlayer(browser, { name: 'Deskquest', wsPort, webPort, viewport: { width: 1280, height: 800 }, world: 'wheel', wide: true });
  C.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  try {
    /* 4b, nothing in hand yet: the empty landing keeps its doors, and Mayor Bro's offer is On offer */
    if (await inWorld(C, rec, '6 computer')) {
      await H.dashOpen(C, 'quests');
      await C.page.waitForSelector('[data-quests-ui2="landing"][data-quests-kind="empty"]', { timeout: 8000 }).catch(() => {});
      const E = await read(C);
      rec.ok(`4b. nothing in hand: the landing's empty state ("${E.text.slice(0, 60)}") and its doors ${E.land && E.land.doors.join(' | ')}`,
        !!E.land && E.land.kind === 'empty' && /No quest right now/.test(E.text) && E.land.doors.some((d) => d.startsWith('offers:')) && E.land.doors.some((d) => d.startsWith('done:')), E.land);
      await bandShot(C, 'ui2-quests-empty-computer.png');
      if (E.land && E.land.doors.some((d) => d.startsWith('offers:'))) {
        await tap(C, '[data-quest-door="offers"]');
        const O = await read(C);
        await tap(C, '[data-quest-offer-row="tut_1"]');
        const OQ = await read(C);
        rec.ok(`4b. On offer (header "${O.title}") lists Into the Blue; its page: NOW "${OQ.quest && OQ.quest.now}", no Track, nothing past the talk`,
          O.page === 'questsOffers' && O.title === 'On offer' && !!OQ.quest && OQ.quest.id === 'tut_1' && OQ.quest.status === 'available' && /^Talk to Mayor Bro/.test(OQ.quest.now)
          && OQ.quest.track === null && !OQ.quest.continues && !FUTURE_WORDS.test(OQ.text) && !/Slime Remains/.test(OQ.text), { page: O.page, title: O.title, quest: OQ.quest, text: OQ.text });
        await bandShot(C, 'ui2-quests-offer-computer.png');
      }
      await tap(C, '[data-dash-frame] [data-dash-ctl="close"]').catch(() => {});
    }
    if (await take(C, wsPort, rec, 'tut_1', '6 computer')) {
      await H.dashOpen(C, 'quests');
      await C.page.waitForSelector('[data-quests-ui2="landing"] [data-quest-row]', { timeout: 8000 }).catch(() => {});
      const L = await read(C);
      await bandShot(C, 'ui2-quests-computer.png');
      await tap(C, '[data-quest-row="tut_1"]');
      const Q = await read(C);
      rec.ok('6. a computer: the landing and the quest\'s page fit (nothing clipped, no press under 44 px, no word under 11 px), and no word says "tap"',
        !!L.land && fits(L) && !!Q.quest && fits(Q) && Q.quest.nowInside && !/\btap\b/i.test(L.text + ' ' + Q.text), { land: fitBrief(L), quest: fitBrief(Q), text: Q.text });
      await bandShot(C, 'ui2-quests-computer-quest.png');
    }
  } finally { await C.ctx.close().catch(() => {}); }
  /* 7, today's pages under ?ui2=0 */
  for (const [query, mark, what] of [['ui2=0', 'pages', 'today\'s pages (QuestPages.jsx)'], ['ui2=0&questpages=0', null, 'the older list']]) {
    const O = await H.newPlayer(browser, { name: 'Oldquest', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query });
    O.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
    try {
      if (await inWorld(O, rec, '7 ' + query) && await take(O, wsPort, rec, 'tut_1', '7 ' + query)) {
        await H.dashOpen(O, 'quests');
        await O.page.waitForSelector('[data-quests-page]', { timeout: 8000 }).catch(() => {});
        const got = await O.page.evaluate(() => { const e = document.querySelector('[data-quests-page]'); return { old: e ? e.getAttribute('data-quests-page') : null, neu: !!document.querySelector('[data-quests-ui2], [data-quest-ui2-page]') }; });
        rec.ok(`7. ?${query}: ${what} (data-quests-page="${got.old}"), never the new landing`, !got.neu && (mark ? got.old === mark : !!got.old && got.old !== 'pages' && got.old !== 'pages-wide'), got);
      }
    } finally { await O.ctx.close().catch(() => {}); }
  }
  rec.ok(`8. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 3));
}

async function phone({ P, wsPort, rec }) {
  if (!(await inWorld(P, rec, 'phone'))) return;
  const top = await P.page.evaluate(() => { const e = document.querySelector('.bt-zone-header, [data-zone-header]'); return e ? e.textContent : null; });
  rec.ok(`(guard) the world, not the retired map (top bar "${(top || '').slice(0, 30)}")`, !top || /BroTown/.test(top), top);
  if (!(await take(P, wsPort, rec, 'tut_1', '1'))) return;
  await P.page.evaluate(() => window.__btTrackedQuest && window.__btTrackedQuest.set(null));
  /* ── 1. the landing ── */
  await H.dashMenuRoot(P);
  await P.page.waitForTimeout(500);
  const bandMenu = (await read(P)).band;
  await H.dashOpen(P, 'quests');
  await P.page.waitForSelector('[data-quests-ui2="landing"] [data-quest-row="tut_1"]', { timeout: 10000 }).catch(() => {});
  let L = await read(P);
  const row = L.land && L.land.rows.find((r) => r.id === 'tut_1');
  rec.ok(`1. the landing: "${L.title}", Into the Blue's row (its face, ${row && row.count}), the doors ${L.land && L.land.doors.join(' | ')}; no tabs, marks or picker`,
    L.page === 'quests' && L.title === 'Quests' && !!L.land && L.land.kind === 'rows' && !!row && row.face && row.count === '0/4' && L.tabs === 0
    && L.land.doors.some((d) => /^done:Completed \(\d+\)$/.test(d)) && !/Hand it in|Then:/.test(L.text), { land: L.land, tabs: L.tabs });
  rec.ok(`1. the band's height unchanged (${L.band} on Quests, ${bandMenu} on the Menu's root); it fits`, L.band === bandMenu && fits(L), { band: L.band, bandMenu, fit: fitBrief(L) });
  await bandShot(P, 'ui2-quests-landing.png');
  /* ── 2. the acceptance task ── */
  await tap(P, '[data-quest-row="tut_1"]');
  let Q = await read(P);
  rec.ok(`2. the row opens Into the Blue's own page (header "${Q.title}", back "${Q.back}"), its id on the entry`, Q.page === 'questDetail' && Q.title === 'Quest' && !!Q.quest && Q.quest.id === 'tut_1' && Q.sel === 'tut_1', { page: Q.page, title: Q.title, sel: Q.sel });
  rec.ok(`2. the steps behind: ${Q.quest && Q.quest.steps.join(' | ')}; NOW "${Q.quest && Q.quest.now}" ${Q.quest && Q.quest.count} with its bar and "${Q.quest && Q.quest.where}"`,
    !!Q.quest && Q.quest.steps.length >= 1 && Q.quest.steps.every((s) => s.startsWith('done:')) && /Talked to Mayor Bro/.test(Q.quest.steps[0]) && /Slime Remains/.test(Q.quest.now)
    && Q.quest.count === '0/4' && Q.quest.bar && Q.quest.pic && /Earth Forest/.test(Q.quest.where) && Q.quest.nowInside, Q.quest);
  rec.ok('2. "The adventure continues"; no hand-in, no "Then:", no count of steps, no percent, no Story', !!Q.quest && Q.quest.continues && !FUTURE_WORDS.test(Q.text), Q.text);
  rec.ok('2. it fits: nothing clipped, no press under 44 px, no word under 11 px; NOW and the actions in sight', fits(Q) && Q.quest && Q.quest.nowInside, fitBrief(Q));
  await tap(P, '[data-quest-track]');
  Q = await read(P);
  const tracked = await P.page.evaluate(() => (window.__btTrackedQuest && window.__btTrackedQuest.get ? window.__btTrackedQuest.get() : null));
  rec.ok(`2. Track tracks it at once (${Q.quest && Q.quest.track}, the phone's tracked quest ${tracked})`, !!Q.quest && Q.quest.track === 'on' && tracked === 'tut_1', { track: Q.quest && Q.quest.track, tracked });
  await bandShot(P, 'ui2-quests-quest.png');
  /* ── 3. Rewards, Back, Back; Show on map ── */
  await tap(P, '[data-quest-door="rewards"]');
  const R = await read(P);
  rec.ok(`3. Rewards: header "${R.title}", ${R.text}`, R.page === 'questRewards' && R.title === 'Rewards' && R.sel === 'tut_1' && /25 gold/i.test(R.text) && /\+5 AP/.test(R.text) && /Pine Bow/.test(R.text) && fits(R), { page: R.page, title: R.title, text: R.text, fit: fitBrief(R) });
  await bandShot(P, 'ui2-quests-rewards.png');
  await tap(P, '[data-dash-frame] [data-dash-ctl="back"]');
  Q = await read(P);
  const backQuest = Q.page === 'questDetail' && !!Q.quest && Q.quest.id === 'tut_1';
  await tap(P, '[data-dash-frame] [data-dash-ctl="back"]');
  L = await read(P);
  rec.ok('3. Back from Rewards returns to the quest; Back again to the landing', backQuest && L.page === 'quests' && !!L.land, { quest: backQuest, page: L.page });
  await tap(P, '[data-quest-row="tut_1"]');
  await tap(P, '[data-journal-map]', 1500);
  const M = await read(P);
  rec.ok('3. Show on map opens the world map', M.map, { map: M.map });
  await P.page.keyboard.press('Escape').catch(() => {});
  await P.page.evaluate(() => { const x = document.querySelector('[data-esc], [data-worldmap-close]'); if (window.__btWorldMap && window.__btWorldMap.open && x) x.click(); });
  await P.page.waitForTimeout(800);
  /* ── 4. On offer; a second quest; Completed and a done quest ── */
  await H.dashOpen(P, 'quests');
  await P.page.waitForSelector('[data-quests-ui2="landing"]', { timeout: 8000 }).catch(() => {});
  L = await read(P);
  if (L.land && L.land.doors.some((d) => d.startsWith('offers:'))) {
    await tap(P, '[data-quest-door="offers"]');
    const O = await read(P);
    const offerId = await P.page.evaluate(() => { const e = document.querySelector('[data-quest-offer-row]'); return e ? e.getAttribute('data-quest-offer-row') : null; });
    let OQ = null;
    if (offerId) { await tap(P, `[data-quest-offer-row="${offerId}"]`); OQ = await read(P); }
    rec.ok(`4. On offer (${O.title}) lists who has one; an offer's page: NOW the talk to its giver, no Track, nothing past the talk`,
      O.page === 'questsOffers' && !!offerId && !!OQ && !!OQ.quest && OQ.quest.status === 'available' && /^Talk to /.test(OQ.quest.now) && OQ.quest.track === null && !OQ.quest.continues && !FUTURE_WORDS.test(OQ.text), { page: O.page, offerId, quest: OQ && OQ.quest });
    await bandShot(P, 'ui2-quests-offer.png');
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]');
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]');
  } else rec.ok('4. On offer: nobody has a quest for this character now, so no door (noted)', true, L.land && L.land.doors);
  if (await take(P, wsPort, rec, 'beast_1', '4')) {
    await P.page.waitForTimeout(1500);
    L = await read(P);
    rec.ok(`4. two quests in hand: ${L.land && L.land.rows.map((r) => r.id + (r.star === 'on' ? '★' : '')).join(', ')}; the tracked one first`,
      !!L.land && L.land.rows.length === 2 && L.land.rows[0].id === 'tut_1' && L.land.rows[0].star === 'on', L.land);
  }
  const me = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', me, { except: 'beast_' }).catch(() => null);
  await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).tut_1 || null, (v) => v === 'turnedIn', { timeout: 15000, label: 'tut_1 handed in' }).catch(() => null);
  await P.page.waitForTimeout(1500);
  L = await read(P);
  const doneDoor = L.land && L.land.doors.find((d) => d.startsWith('done:'));
  await tap(P, '[data-quest-door="done"]');
  const D = await read(P);
  await tap(P, '[data-quest-done-row="tut_1"]');
  const DQ = await read(P);
  rec.ok(`4. ${doneDoor}: Into the Blue's page is its whole history (${DQ.quest && DQ.quest.steps.join(' | ')}), "${DQ.quest && DQ.quest.next}", Rewards; no Track, no map, nothing continues`,
    D.page === 'questsDone' && !!DQ.quest && DQ.quest.status === 'done' && DQ.quest.steps.length >= 3 && DQ.quest.steps.every((s) => s.startsWith('done:')) && /Handed in/.test(DQ.quest.steps.join(' '))
    && /^Next:/.test(DQ.quest.next) && DQ.quest.rewards && DQ.quest.track === null && !DQ.quest.map && !DQ.quest.continues && fits(DQ), { page: D.page, quest: DQ.quest, fit: fitBrief(DQ) });
  await bandShot(P, 'ui2-quests-done.png');
  /* ── 5. the pinned card's road ── */
  await tap(P, '[data-dash-frame] [data-dash-ctl="close"]');
  await P.page.evaluate(() => window.__btQuestDetail && window.__btQuestDetail.open('beast_1'));
  await P.page.waitForTimeout(1200);
  const W = await read(P);
  await tap(P, '[data-dash-frame] [data-dash-ctl="back"]');
  const W2 = await read(P);
  rec.ok(`5. the pinned card's road lands on Box Traps' page (back "${W.back}"); Back closes the dashboard`, W.page === 'questDetail' && !!W.quest && W.quest.id === 'beast_1' && /World/.test(W.back) && !W2.shown, { page: W.page, quest: W.quest && W.quest.id, back: W.back, after: W2.kind });
  /* ── 6. the other sizes ── */
  for (const [w, h] of [[375, 667], [844, 390], [667, 375]]) {
    await P.page.setViewportSize({ width: w, height: h });
    await P.page.waitForTimeout(1200);
    await H.dashOpen(P, 'quests');
    await P.page.waitForSelector('[data-quests-ui2="landing"]', { timeout: 8000 }).catch(() => {});
    await P.page.waitForTimeout(600);
    const A = await read(P);
    if (w === 844) await bandShot(P, 'ui2-quests-landing-844x390.png');
    await tap(P, '[data-quest-row="beast_1"]');
    const B = await read(P);
    if (w === 844) await bandShot(P, 'ui2-quests-quest-844x390.png');
    if (w === 375) await bandShot(P, 'ui2-quests-quest-375x667.png');
    rec.ok(`6. ${w} x ${h}: the landing and the quest's page fit, NOW in sight`, !!A.land && fits(A) && !!B.quest && fits(B) && B.quest.nowInside, { land: fitBrief(A), quest: fitBrief(B), now: B.quest && B.quest.nowInside });
    await tap(P, '[data-dash-frame] [data-dash-ctl="close"]').catch(() => {});
  }
}
