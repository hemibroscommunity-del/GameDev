/* ═══ THE QUESTS TAB IN PAGES (v2.3.6620, card QP) ═══
 *
 * The owner, 2026-11-25 (of the Bro tab, then this one, with three mockups):
 * "it shows "pages" where all the information needs to be displayed together
 * (instead of scrolling little by little) so all related information is
 * shown at once ... Same idea here I want the quest menu redesigned to this".
 *
 * A real phone (upright, touch) against a real worker, in the world's BroTown:
 *   1. Into the Blue (tut_1) taken; the Quests tab opens on it, PAGE 1, whole
 *      with no scrolling at 390 x 844: Active (1) | Completed, the three page
 *      marks (Quest lit); the head (Mayor Bro's face, the name, "In progress"
 *      and Mayor Bro, Track); what to do with the Remains' picture, "0/4" and
 *      its bar; the Earth Forest with Map; Rewards: 25 gold, +5 AP, Pine Bow,
 *      Pine Staff; nothing under 13 px; never "Wheel" or "remnants";
 *   2. a tap on what to do opens the JOURNEY, whole: talked to Mayor Bro
 *      (green, with the sword and shield), the Remains in hand (gold, 0/4),
 *      hand it in (grey);
 *   3. the Rewards mark opens PAGE 3, whole: the four tiles and the next
 *      quest; the Quest mark brings page 1 back, whose rewards row opens 3;
 *   4. Track tracks it and says so; Map opens the world map on it;
 *   5. at 375 x 667 each of the three is whole too;
 *   6. a second quest in hand (Box Traps): Active (2), the head opens the
 *      picker (Active, then Available), and a tap opens Box Traps' page 1;
 *   7. the pinned card's road ("Open quest", __btQuestDetail.open) lands on
 *      Into the Blue's page 1;
 *   8. sideways (844 x 390) the three pages stand side by side, no marks;
 *   9. on a computer page 1 is whole and says "click"; `?questpages=0` gives
 *      back the old page (the list beside the quest);
 *  10. no page errors.
 * Pictures: tools/qa/mp/out/questpages-*.png (docs/shots/questpages-*.webp).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const lane = 'full';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Pages', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  const stopAlive = H.keepAlive(P);
  try {
    await body({ P, wsPort, webPort, browser, rec, OUT });
  } finally {
    stopAlive();
    rec.ok(`10. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 3));
    await P.ctx.close().catch(() => {});
  }
}

async function openQuests(P) {
  await H.unfoldBand(P).catch(() => {});
  const ok = await H.openDest(P, 'Quests').then(() => true).catch(() => false);
  if (!ok || !(await P.page.waitForSelector('[data-quests-page]', { timeout: 5000 }).then(() => true).catch(() => false))) {
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b) b.open('quests'); });
    await P.page.waitForSelector('[data-quests-page]', { timeout: 6000 }).catch(() => {});
  }
}

/* the page as it stands: its view, each page's box (whole?), what is seen inside the band */
const look = (P) => P.page.evaluate(() => {
  const root = document.querySelector('[data-quests-page]');
  if (!root) return null;
  const rb = root.getBoundingClientRect();
  const inside = (sel) => { const e = root.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.height > 0 && r.top >= rb.top - 1 && r.bottom <= rb.bottom + 1 && r.left >= rb.left - 1 && r.right <= rb.right + 1; };
  const small = [];
  for (const el of root.querySelectorAll('*')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < 13) small.push({ t: el.textContent.trim().slice(0, 30), px });
  }
  const txt = (sel) => { const e = root.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
  return {
    mode: root.dataset.questsPage, view: root.dataset.questView, open: root.dataset.questOpen,
    root: { t: Math.round(rb.top), b: Math.round(rb.bottom), l: Math.round(rb.left), r: Math.round(rb.right), ch: root.clientHeight, sh: root.scrollHeight },
    vw: innerWidth, vh: innerHeight,
    pages: [...root.querySelectorAll('[data-quest-page]')].map((e) => { const r = e.getBoundingClientRect(); return { n: e.dataset.questPage, ch: e.clientHeight, sh: e.scrollHeight, l: Math.round(r.left), r: Math.round(r.right) }; }),
    tabs: [...root.querySelectorAll('[data-quest-tab]')].map((e) => ({ id: e.dataset.questTab, word: e.textContent.trim(), lit: e.getAttribute('aria-selected') })),
    marks: [...root.querySelectorAll('[data-quest-mark]')].map((e) => ({ page: e.dataset.questMark, lit: e.dataset.lit })),
    small, txt: root.innerText || '',
    seen: Object.fromEntries(['[data-journal-face]', '[data-journal-title]', '[data-journal-status-word]', '[data-quest-track]', '[data-journal-now]', '[data-journal-count]', '[data-quest-now-pic]', '[data-journal-where]', '[data-journal-map]', '[data-journal="reward"]', '[data-journal="reward-all"]', '[data-journal="next"]', '[data-quest-steps]'].map((s) => [s, inside(s)])),
    title: txt('[data-journal-title]'), status: txt('[data-journal-status-word]'), now: txt('[data-journal-now]'), count: txt('[data-journal-count]'), where: txt('[data-journal-where]'),
    pic: (root.querySelector('[data-quest-now-pic]') || { getAttribute: () => null }).getAttribute('src'),
    face: (root.querySelector('[data-journal-face]') || { getAttribute: () => null }).getAttribute('src'),
    tiles: [...root.querySelectorAll('[data-journal="reward"] [data-quest-tile], [data-journal="reward-all"] [data-quest-tile]')].map((e) => e.textContent.trim()),
    steps: [...root.querySelectorAll('[data-quest-steps] [data-step-state]')].map((e) => ({ kind: e.dataset.stepKind, state: e.dataset.stepState, text: e.textContent.replace(/\s+/g, ' ').trim(), pics: e.querySelectorAll('img').length })),
    next: txt('[data-journal="next"]'),
  };
});
const whole = (L, name) => !!L && L.root.sh <= L.root.ch + 1 && L.pages.length >= 1 && L.pages.filter((p) => !name || p.n === name).every((p) => p.sh <= p.ch + 1) && L.root.b <= L.vh + 1;

async function body({ P, wsPort, webPort, browser, rec, OUT }) {
  const shot = (name) => P.page.screenshot({ path: join(OUT, `questpages-${name}.png`) }).catch(() => {});
  const tapEl = async (sel) => { await P.page.locator(sel).first().click(); await P.page.waitForTimeout(400); };
  await H.enterWorld(P);
  const inWorld = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 120000, label: 'into the world' }).catch(() => null);
  rec.ok('in the world\'s BroTown (guard)', !!inWorld, inWorld);
  if (!inWorld) return;
  if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
  const me = await H.readState(P, (S) => S.myId);
  const top = await P.page.evaluate(() => { const e = document.querySelector('.bt-zone-header, [data-zone-header]'); return e ? e.textContent : null; });
  rec.ok(`(guard) the world, not the retired map (top bar "${(top || '').slice(0, 30)}")`, !top || /BroTown/.test(top), top);

  /* ── 1. page 1 ── */
  const accept = (q) => P.page.evaluate((qid) => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: qid } }); }, q);
  await accept('tut_1');
  let q = await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).tut_1 || null, (v) => v === 'active', { timeout: 15000, label: 'tut_1 active' }).catch(() => null);
  if (q !== 'active') {
    await H.devOp(wsPort, 'testmode', me, { on: true }).catch(() => {});
    await accept('tut_1');
    q = await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).tut_1 || null, (v) => v === 'active', { timeout: 15000, label: 'tut_1 active' }).catch(() => null);
  }
  rec.ok(`1. Into the Blue taken (tut_1 ${q}) (guard)`, q === 'active');
  if (q !== 'active') return;
  await P.page.evaluate(() => window.__btTrackedQuest && window.__btTrackedQuest.set(null));
  await openQuests(P);
  await P.page.waitForSelector('[data-quest-view="quest"][data-quest-open="tut_1"]', { timeout: 8000 }).catch(() => {});
  let L = await look(P);
  rec.ok('1. the Quests tab opens on Into the Blue, page 1, in pages', !!L && L.mode === 'pages' && L.view === 'quest' && L.open === 'tut_1', L && { mode: L.mode, view: L.view, open: L.open });
  rec.ok(`1. page 1 is whole, no scrolling, inside the screen (page ${L && L.pages.map((p) => p.sh + '/' + p.ch).join()}, band ${L && L.root.sh + '/' + L.root.ch})`, whole(L, 'quest'), L && { pages: L.pages, root: L.root, vh: L.vh });
  rec.ok(`1. the top row: ${L && L.tabs.map((t) => t.word + (t.lit === 'true' ? '*' : '')).join(' | ')}, and the three marks with Quest lit`,
    !!L && L.tabs.length >= 2 && L.tabs[0].word === 'Active (1)' && L.tabs[0].lit === 'true' && /Completed$/.test(L.tabs[L.tabs.length - 1].word)
    && L.marks.map((m) => m.page + m.lit).join() === 'quest1,journey0,rewards0', L && { tabs: L.tabs, marks: L.marks });
  rec.ok(`1. all of it seen at once: the face, "${L && L.title}", "${L && L.status}", Track, "${L && L.now}" with its picture and "${L && L.count}", "${L && L.where}" with Map, and the rewards`,
    !!L && ['[data-journal-face]', '[data-journal-title]', '[data-journal-status-word]', '[data-quest-track]', '[data-journal-now]', '[data-journal-count]', '[data-quest-now-pic]', '[data-journal-where]', '[data-journal-map]', '[data-journal="reward"]'].every((s) => L.seen[s] === true)
    && L.title === 'Into the Blue' && /In progress/i.test(L.status || '') && /Mayor Bro/.test(L.txt) && /Slime Remains/.test(L.now || '') && L.count === '0/4'
    && /remnants-slime/.test(L.pic || '') && /mayor-bro-head/.test(L.face || '') && /Earth Forest, \w+ of BroTown/.test(L.where || ''), L && L.seen);
  rec.ok(`1. the rewards in one row: ${L && L.tiles.join(' | ')}`, !!L && L.tiles.length === 4 && /25 gold/i.test(L.tiles[0]) && /\+5 AP/.test(L.tiles[1]) && /Pine Bow/.test(L.tiles[2]) && /Pine Staff/.test(L.tiles[3]), L && L.tiles);
  rec.ok(`1. readable: nothing under 13 px (${L && L.small.length}); plain words, never "Wheel" or "remnants"`, !!L && L.small.length === 0 && !/Wheel|remnant/i.test(L.txt), L && { small: L.small.slice(0, 4) });
  await shot('01-quest');

  /* ── 2. the journey ── */
  await tapEl('[data-quest-to="journey"]');
  L = await look(P);
  rec.ok(`2. a tap on what to do opens the journey, whole (${L && L.pages.map((p) => p.sh + '/' + p.ch).join()})`, !!L && L.view === 'journey' && whole(L, 'journey') && L.seen['[data-quest-steps]'] === true
    && L.marks.map((m) => m.lit).join() === '0,1,0', L && { view: L.view, pages: L.pages });
  rec.ok(`2. the steps: ${L && L.steps.map((s) => s.state + ': ' + s.text).join(' / ')}`,
    !!L && L.steps.length === 3 && L.steps[0].state === 'done' && /Talked to Mayor Bro/.test(L.steps[0].text) && L.steps[0].pics === 2
    && L.steps[1].state === 'current' && /Slime Remains/.test(L.steps[1].text) && /0\/4/.test(L.steps[1].text) && /Earth Forest/.test(L.steps[1].text)
    && L.steps[2].state === 'todo' && /Hand it in to Mayor Bro/.test(L.steps[2].text), L && L.steps);
  await shot('02-journey');

  /* ── 3. rewards and what is next; the marks; the rewards row ── */
  await tapEl('[data-quest-mark="rewards"]');
  L = await look(P);
  rec.ok(`3. the Rewards mark opens page 3, whole (${L && L.pages.map((p) => p.sh + '/' + p.ch).join()}): ${L && L.tiles.join(' | ')}; next: "${L && L.next}"`,
    !!L && L.view === 'rewards' && whole(L, 'rewards') && L.seen['[data-journal="reward-all"]'] === true && L.seen['[data-journal="next"]'] === true
    && L.tiles.length === 4 && /0\/4/.test(L.txt) && !!L.next && L.next.length > 4, L && { view: L.view, pages: L.pages, next: L.next });
  await shot('03-rewards');
  await tapEl('[data-quest-mark="quest"]');
  const back1 = await look(P);
  await tapEl('[data-quest-to="rewards"]');
  const to3 = await look(P);
  rec.ok('3. the Quest mark brings page 1 back; its rewards row opens page 3', !!back1 && back1.view === 'quest' && !!to3 && to3.view === 'rewards', { back: back1 && back1.view, to3: to3 && to3.view });
  await tapEl('[data-quest-mark="quest"]');

  /* ── 4. Track and Map ── */
  await tapEl('[data-quest-track]');
  const tr = await P.page.evaluate(() => ({ on: (document.querySelector('[data-quest-track]') || { getAttribute: () => null }).getAttribute('data-quest-track'),
    tracked: window.__btTrackedQuest && window.__btTrackedQuest.get ? window.__btTrackedQuest.get() : null,
    note: (document.querySelector('[data-quest-track-note]') || {}).textContent || null }));
  rec.ok(`4. Track tracks it (${tr.on}, ${tr.tracked}) and says what that does ("${tr.note}")`, tr.on === 'on' && /gold star/.test(tr.note || '') && (tr.tracked == null || tr.tracked === 'tut_1'), tr);
  await shot('04-tracked');
  await P.page.locator('[data-journal-map]').first().click().catch(() => {});
  let wm = null;
  for (let i = 0; i < 20; i++) {
    wm = await P.page.evaluate(() => (window.__btWorldMap ? JSON.parse(JSON.stringify(window.__btWorldMap)) : null));
    if (wm && wm.open && wm.more && wm.more.quest) break;
    await P.page.waitForTimeout(300);
  }
  rec.ok(`4. Map opens the world map with the gold road on this quest (${wm && wm.more && wm.more.quest ? wm.more.quest.qid : '-'})`,
    !!wm && wm.open === true && !!wm.more && !!wm.more.quest && wm.more.quest.qid === 'tut_1', wm && wm.more);
  await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-close]'); if (b) b.click(); });
  await P.page.waitForTimeout(600);

  /* ── 5. a smaller iPhone ── */
  await P.page.setViewportSize({ width: 375, height: 667 });
  await P.page.waitForTimeout(1500);
  await openQuests(P);
  const small = [];
  for (const pg of ['quest', 'journey', 'rewards']) {
    await tapEl(`[data-quest-mark="${pg}"]`);
    const S5 = await look(P);
    small.push({ pg, ok: !!S5 && S5.view === pg && whole(S5, pg), pages: S5 && S5.pages.map((p) => p.sh + '/' + p.ch).join(), root: S5 && S5.root.sh + '/' + S5.root.ch });
    await shot(`05-small-${pg}`);
  }
  rec.ok(`5. at 375 x 667 each page is whole too (${small.map((s) => s.pg + ' ' + s.pages).join('; ')})`, small.every((s) => s.ok), small);
  await tapEl('[data-quest-mark="quest"]');
  await P.page.setViewportSize(PHONE);
  await P.page.waitForTimeout(1200);

  /* ── 6. a second quest, and the picker ── */
  await H.devOp(wsPort, 'testmode', me, { on: true }).catch(() => {});
  await accept('beast_1');
  const two = await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).beast_1 || null, (v) => v === 'active', { timeout: 15000, label: 'beast_1 active' }).catch(() => null);
  await openQuests(P);
  await P.page.waitForSelector('[data-quest-tab="active"]', { timeout: 6000 }).catch(() => {});
  await P.page.waitForTimeout(1200);
  const L6 = await look(P);
  await tapEl('[data-quest-picker="open"]');
  const pick = await P.page.evaluate(() => ({ view: (document.querySelector('[data-quests-page]') || { dataset: {} }).dataset.questView,
    rows: [...document.querySelectorAll('[data-quest-row]')].map((e) => e.dataset.questRow), offers: document.querySelectorAll('[data-quest-offer-row]').length }));
  await shot('06-picker');
  await tapEl('[data-quest-row="beast_1"]');
  const L6b = await look(P);
  rec.ok(`6. with Box Traps in hand too (${two}): "${L6 && L6.tabs[0] && L6.tabs[0].word}", the head opens the picker (${pick.rows.join(', ')}; ${pick.offers} on offer), and a tap opens Box Traps' page 1 ("${L6b && L6b.title}")`,
    two === 'active' && !!L6 && L6.tabs[0].word === 'Active (2)' && pick.view === 'pick' && pick.rows.includes('tut_1') && pick.rows.includes('beast_1')
    && !!L6b && L6b.view === 'quest' && L6b.open === 'beast_1' && whole(L6b, 'quest'), { pick, open: L6b && L6b.open });
  await shot('06-second');

  /* ── 7. the pinned card's road ── */
  await P.page.evaluate(() => window.__btQuestDetail && window.__btQuestDetail.open('tut_1'));
  await P.page.waitForSelector('[data-quests-page][data-quest-open="tut_1"]', { timeout: 6000 }).catch(() => {});
  await P.page.waitForTimeout(500);
  const L7 = await look(P);
  rec.ok(`7. the pinned card's "Open quest" lands on Into the Blue's page 1 (${L7 && L7.open}, ${L7 && L7.view})`, !!L7 && L7.open === 'tut_1' && L7.view === 'quest' && whole(L7, 'quest'), L7 && { open: L7.open, view: L7.view });

  /* ── 8. sideways ── */
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(2000);
  await openQuests(P);
  await P.page.waitForSelector('[data-quests-page="pages-wide"]', { timeout: 6000 }).catch(() => {});
  await P.page.waitForTimeout(600);
  const L8 = await look(P);
  const cols = L8 ? L8.pages.map((p) => p.n).join() : '';
  rec.ok(`8. sideways the three pages stand side by side (${cols}), no marks, inside the screen`,
    !!L8 && L8.mode === 'pages-wide' && cols === 'quest,journey,rewards' && L8.pages[0].r <= L8.pages[1].l + 1 && L8.pages[1].r <= L8.pages[2].l + 1
    && L8.marks.length === 0 && L8.root.l >= 0 && L8.root.r <= L8.vw && L8.root.b <= L8.vh + 1, L8 && { mode: L8.mode, pages: L8.pages, root: L8.root });
  await shot('08-sideways');
  await P.page.setViewportSize(PHONE);
  await P.page.waitForTimeout(800);

  /* ── 9a. a computer (the judges play on computers): the band is the same pages, the words say "click" ── */
  const D = await H.newPlayer(browser, { name: 'DeskPages', wsPort, webPort, viewport: { width: 1280, height: 800 }, dpr: 2, world: 'wheel', wide: true });
  try {
    await H.enterWorld(D);
    await H.waitFor(D, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'computer: in the world' }).catch(() => null);
    if (await D.page.$('[data-chest-window]')) { await D.page.click('text=Later').catch(() => {}); }
    await D.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
    await D.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    await H.waitFor(D, (S) => ((S.rpg && S.rpg._quests) || {}).tut_1 || null, (v) => v === 'active', { timeout: 15000, label: 'computer: tut_1' }).catch(() => null);
    await openQuests(D);
    await D.page.waitForSelector('[data-quest-open="tut_1"]', { timeout: 8000 }).catch(() => {});
    await D.page.waitForTimeout(600);
    const DL = await look(D);
    const aria = await D.page.evaluate(() => (document.querySelector('[data-quest-to="journey"]') || { getAttribute: () => '' }).getAttribute('aria-label'));
    await D.page.screenshot({ path: join(OUT, 'questpages-09-computer.png') }).catch(() => {});
    rec.ok(`9a. on a computer (${DL && DL.mode}, ${DL && DL.root.r - DL.root.l} px wide) page 1 is whole, and its words say "click" ("${aria}")`,
      !!DL && DL.open === 'tut_1' && (DL.mode === 'pages' ? whole(DL, 'quest') : DL.mode === 'pages-wide') && /click/i.test(aria || '') && !/\btap\b/i.test(aria || ''), DL && { mode: DL.mode, pages: DL.pages, root: DL.root });
  } finally { await D.ctx.close().catch(() => {}); }

  /* ── 9. the switch ── */
  const O = await H.newPlayer(browser, { name: 'OldPage', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', query: 'questpages=0' });
  try {
    await H.enterWorld(O);
    await H.waitFor(O, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'old page: in the world' }).catch(() => null);
    if (await O.page.$('[data-chest-window]')) { await O.page.click('text=Later').catch(() => {}); }
    await openQuests(O);
    const old = await O.page.evaluate(() => { const e = document.querySelector('[data-quests-page]'); return e ? e.dataset.questsPage : null; });
    rec.ok(`9. ?questpages=0 gives back the old page (${old})`, old === 'list' || old === 'chips', old);
  } finally { await O.ctx.close().catch(() => {}); }
}
