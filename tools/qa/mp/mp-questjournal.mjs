/* ═══ THE QUEST JOURNAL SAYS WHAT TO DO NEXT (v2.3.3944) ═══
 *
 * The owner, 2026-11-02: "Make the 'quest' button in the menu actually useful
 * ... clear which quest they are on, what's required, where to go, who was
 * talked to and what to do next, etc. show rewards preview, what was handed
 * during the quest too.  Also keep track of achievement points gained from
 * each quest."  And the first session's trouble: "After finishing mayor bro
 * quest that awards sword and shield it wasn't apparent what to do next."
 *
 * A real phone (upright, touch) against a real worker, in the world's BroTown:
 *   1. the first quest, Into the Blue (tut_1), taken (quest_accept, as the
 *      Mayor's offer sends it);
 *   2. the Quests page (v2.3.4356: a menu) opens ON it: your quests a list
 *      of pills down the left, the open one beside it, the page itself not
 *      scrolling; on screen at once, the title, MAP and TRACK, NOW "0/4 Slime
 *      Remains" with its bar and WHERE the Earth Forest; a scroll below, WHO
 *      "Talked to Mayor Bro ✓", GIVEN TO YOU the sword and the shield, REWARD
 *      with "+5 Achievement Points", NEXT "Then: talk to ..."; plain words
 *      (no "Wheel", no "remnants"), nothing under 13 px;
 *   3. TRACK in the head tracks it (its pill wears the star); MAP opens the
 *      world map with the gold road on it; with a second quest in hand, one
 *      tap on its pill opens it beside the list, no page pushed;
 *   4. its 4 Slime Remains granted, the page says 4/4 and to hand it in, its
 *      pill marked ready;
 *   5. handed in (quest_turn_in): the page goes back to the quest you are
 *      on; Done (its count on its pill) lists it with its +5 AP under the
 *      points at 5; its page says Done with NEXT naming who is next;
 *      sideways the pills are one row over the quest;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/questjournal-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Journal', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  const stopAlive = H.keepAlive(P);
  try {
    await body({ P, wsPort, rec, OUT });
  } finally {
    stopAlive();
    rec.ok(`6. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 3));
    await P.ctx.close().catch(() => {});
  }
}

/* the words of one part of the journal, under `root` */
const part = (P, root, name) => P.page.evaluate(([r, n]) => {
  const box = document.querySelector(r);
  const el = box && box.querySelector(`[data-journal="${n}"]`);
  return el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : null;
}, [root, name]);
const textOf = (P, sel) => P.page.evaluate((s) => { const e = document.querySelector(s); return e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null; }, sel);
const quests = (P) => H.readState(P, (S) => Object.assign({}, (S.rpg && S.rpg._quests) || {}));

/* the Quests page as a player opens it (the rail, or More's tile); the bus if
   the dashboard has moved it (it is the same page either way) */
async function openQuests(P) {
  await H.unfoldBand(P).catch(() => {});
  const ok = await H.openDest(P, 'Quests').then(() => true).catch(() => false);
  if (!ok || !(await P.page.waitForSelector('[data-quests-page]', { timeout: 5000 }).then(() => true).catch(() => false))) {
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b) b.open('quests'); });
    await P.page.waitForSelector('[data-quests-page]', { timeout: 6000 }).catch(() => {});
  }
}

async function body({ P, wsPort, rec, OUT }) {
  const shot = (name) => P.page.screenshot({ path: join(OUT, `questjournal-${name}.png`) }).catch(() => {});
  await H.enterWorld(P);
  const inWorld = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 120000, label: 'into the world' }).catch(() => null);
  rec.ok('in the world\'s BroTown (guard)', !!inWorld, inWorld);
  if (!inWorld) return;
  if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
  const me = await H.readState(P, (S) => S.myId);
  const top = await textOf(P, '.bt-zone-header, [data-zone-header]');
  rec.ok(`(guard) the world, not the retired map (top bar "${(top || '').slice(0, 30)}")`, !top || /BroTown/.test(top), top);

  /* ── 1. the first quest taken ── */
  await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
  let q = await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).tut_1 || null, (v) => v === 'active', { timeout: 15000, label: 'tut_1 active' }).catch(() => null);
  if (q !== 'active') {
    /* a worker that wants the Mayor's order kept: the test mode's any order */
    await H.devOp(wsPort, 'testmode', me, { on: true }).catch(() => {});
    await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    q = await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).tut_1 || null, (v) => v === 'active', { timeout: 15000, label: 'tut_1 active' }).catch(() => null);
  }
  rec.ok(`1. Into the Blue taken (tut_1 ${q}) (guard)`, q === 'active', await quests(P));
  if (q !== 'active') return;
  await P.page.evaluate(() => window.__btTrackedQuest && window.__btTrackedQuest.set(null));

  /* ── 2. the page opens on it: a list beside the quest (v2.3.4356) ── */
  await openQuests(P);
  const F = '[data-journal-focus="tut_1"]';
  const focused = await P.page.waitForSelector(F, { timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('2. the Quests page opens on the quest you are on (Into the Blue)', focused, await textOf(P, '[data-journal-focus]'));
  const lay = await P.page.evaluate(() => {
    const pg = document.querySelector('[data-quests-page]'), rail = document.querySelector('[data-quest-rail]'), det = document.querySelector('[data-quest-detail]');
    const b = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
    const pill = document.querySelector('[data-quest-row="tut_1"]');
    const inner = pill && pill.querySelector('[data-quest-pill]');
    const seen = (sel) => { const e = det && det.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(), d = det.getBoundingClientRect(); return r.height > 0 && r.top >= d.top - 1 && r.bottom <= d.bottom + 1; };
    return {
      mode: pg ? pg.dataset.questsPage : null, open: pg ? pg.dataset.questOpen : null, pg: b(pg), rail: b(rail), det: b(det), vw: innerWidth, vh: innerHeight,
      pageScrolls: !!pg && pg.scrollHeight > pg.clientHeight + 2,
      secs: [...document.querySelectorAll('[data-quest-rail] [data-quest-sec]')].map((e) => e.dataset.questSec),
      pill: pill ? { h: Math.round(pill.getBoundingClientRect().height), lit: pill.getAttribute('aria-selected'), radius: inner ? parseFloat(getComputedStyle(inner).borderTopLeftRadius) : 0,
        icon: (pill.querySelector('[data-quest-pill-icon]') || { dataset: {} }).dataset.questPillIcon, word: inner ? inner.textContent.trim() : '' } : null,
      seen: { title: seen('[data-journal-title]'), map: seen('[data-journal-map]'), track: seen('[data-quest-track]'), now: seen('[data-journal-now]'), count: seen('[data-journal-count]'), where: seen('[data-journal-where]') },
      btn: ['[data-journal-map]', '[data-quest-track]'].map((s) => { const e = det && det.querySelector(s); const r = e ? e.getBoundingClientRect() : null; return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null; }),
    };
  });
  rec.ok('2. a menu: your quests are a list down the left (Active, More), the quest that is open beside it, inside the screen; the page itself does not scroll',
    lay.mode === 'list' && lay.open === 'tut_1' && !!lay.rail && !!lay.det && lay.rail.l >= 0 && lay.rail.r <= lay.det.l + 1 && lay.det.r <= lay.vw && lay.pg.b <= lay.vh
    && !lay.pageScrolls && lay.secs.includes('Active'), lay);
  rec.ok(`2. the quest is a pill in the list ("${lay.pill && lay.pill.word}"): a 44 px target, fully rounded, lit, wearing the giver's waiting pin`,
    !!lay.pill && lay.pill.h >= 44 && lay.pill.radius >= 18 && lay.pill.lit === 'true' && lay.pill.icon === 'waiting' && /Into the Blue/.test(lay.pill.word), lay.pill);
  rec.ok('2. everything you need to carry on is on screen at once, no scrolling: the title, MAP and TRACK (44 px each), what to do NOW with its count, and WHERE',
    !!lay.seen && Object.values(lay.seen).every((v) => v === true) && lay.btn.every((b) => !!b && b.w >= 44 && b.h >= 44), { seen: lay.seen, btn: lay.btn });
  const now = await part(P, F, 'now');
  rec.ok(`2. NOW: "${now}" -- 0/4 Slime Remains, with its bar`, !!now && /0\/4 Slime Remains/.test(now)
    && !!(await P.page.$(`${F} [data-journal-count="0/4"]`)), now);
  const where = await part(P, F, 'where');
  rec.ok(`2. WHERE: "${where}" -- the Earth Forest, which way from BroTown, and Show on map`,
    !!where && /Earth Forest, \w+ of BroTown/.test(where) && !!(await P.page.$(`${F} [data-journal-map="tut_1"][aria-label="Show on map"]`)), where);
  const who = await part(P, F, 'who');
  rec.ok(`2. WHO (a scroll below): "${who}" -- Mayor Bro, "Talked to Mayor Bro ✓", his face`,
    !!who && /Talked to Mayor Bro ✓/.test(who) && !!(await P.page.$(`${F} [data-journal="who"] img[src*="mayor-bro-head"]`)), who);
  const given = await part(P, F, 'given');
  rec.ok(`2. GIVEN TO YOU: "${given}" -- the sword and the shield, still shown once taken`,
    !!given && /Copper Great Sword/.test(given) && /Pine Shield/.test(given), given);
  const reward = await part(P, F, 'reward');
  rec.ok(`2. REWARD: "${reward}" -- 25 gold, the bow and the staff, +5 Achievement Points`,
    !!reward && /\+5 Achievement Points/.test(reward) && /25 gold/.test(reward) && /Pine Bow/.test(reward) && /Pine Staff/.test(reward), reward);
  const next = await part(P, F, 'next');
  rec.ok(`2. NEXT: "${next}" -- who comes after it, and where`, !!next && /Then: talk to \S.* (at|on|by|in) /.test(next), next);
  const all = await textOf(P, '.bt-dashboard') || await P.page.evaluate(() => document.body.innerText || '');
  rec.ok('2. plain words on the page: never "Wheel", never "remnants"', !/Wheel|remnant/i.test(all || ''), (all || '').slice(0, 300));
  const small = await P.page.evaluate(() => {
    const box = document.querySelector('[data-quests-page]');
    const out = [];
    if (box) for (const el of box.querySelectorAll('*')) {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 13) out.push({ t: el.textContent.trim().slice(0, 30), px });
    }
    return out;
  });
  rec.ok(`2. readable on a phone: no words under 13 px anywhere on the page, the list included (${small.length})`, small.length === 0, small.slice(0, 5));
  await shot('01-taken');

  /* ── 3. Track and Map from the head; a second quest, and moving between them ── */
  await P.page.locator(`${F} [data-quest-track]`).first().click();
  const tr = await P.page.waitForFunction(() => { const b = document.querySelector('[data-quest-track]'); return !!b && b.getAttribute('data-quest-track') === 'on'; }, null, { timeout: 5000 }).then(() => true).catch(() => false);
  const trk = await P.page.evaluate(() => ({
    pill: (document.querySelector('[data-quest-row="tut_1"]') || { getAttribute: () => null }).getAttribute('data-quest-row-track'),
    icon: (document.querySelector('[data-quest-row="tut_1"] [data-quest-pill-icon]') || { dataset: {} }).dataset.questPillIcon,
    note: (document.querySelector('[data-quest-track-note]') || {}).textContent || null,
    tracked: window.__btTrackedQuest ? window.__btTrackedQuest.get() : null,
  }));
  rec.ok(`3. TRACK in the head tracks it: its pill wears the star, and the page says what that does ("${trk.note}")`,
    tr && trk.pill === 'on' && trk.icon === 'tracked' && trk.tracked === 'tut_1' && /gold star follows this quest/.test(trk.note || ''), trk);
  await shot('02-tracked');
  await P.page.locator(`${F} [data-journal-map]`).first().click().catch(() => {});
  let wm = null;
  for (let i = 0; i < 20; i++) {
    wm = await P.page.evaluate(() => (window.__btWorldMap ? JSON.parse(JSON.stringify(window.__btWorldMap)) : null));
    if (wm && wm.open && wm.more && wm.more.quest) break;
    await P.page.waitForTimeout(300);
  }
  rec.ok(`3. MAP opens the world map with the gold road on this quest (${wm && wm.more && wm.more.quest ? wm.more.quest.qid : '-'})`,
    !!wm && wm.open === true && !!wm.more && !!wm.more.quest && wm.more.quest.qid === 'tut_1', wm && wm.more);
  await shot('03-map');
  await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-close]'); if (b) b.click(); });
  await P.page.waitForTimeout(600);
  /* a second quest in hand (the worker's test mode lets it be taken out of the givers' order) */
  await H.devOp(wsPort, 'testmode', me, { on: true }).catch(() => {});
  await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'beast_1' } }); });
  const two = await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).beast_1 || null, (v) => v === 'active', { timeout: 15000, label: 'beast_1 active' }).catch(() => null);
  await openQuests(P);
  await P.page.waitForSelector('[data-quest-row="beast_1"]', { timeout: 8000 }).catch(() => {});
  const before = await P.page.evaluate(() => ({ open: (document.querySelector('[data-quests-page]') || { dataset: {} }).dataset.questOpen, rows: [...document.querySelectorAll('[data-quest-row]')].map((e) => e.dataset.questRow) }));
  await P.page.locator('[data-quest-row="beast_1"]').first().click();
  await P.page.waitForSelector('[data-journal-focus="beast_1"]', { timeout: 6000 }).catch(() => {});
  const other = await P.page.evaluate(() => ({
    open: (document.querySelector('[data-quests-page]') || { dataset: {} }).dataset.questOpen,
    title: (document.querySelector('[data-quest-detail] [data-journal-title]') || {}).textContent || null,
    now: (document.querySelector('[data-quest-detail] [data-journal-now]') || {}).textContent || null,
    rail: !!document.querySelector('[data-quest-rail] [data-quest-row="tut_1"]'),
    stack: window.__broDashPanelBus ? window.__broDashPanelBus.state.stack.slice() : null,
  }));
  rec.ok(`3. two quests in hand (${two}): one tap on the other's pill opens it beside the list ("${other.title}": "${other.now}"), no page pushed, the list still there`,
    two === 'active' && before.rows.length === 2 && before.open === 'tut_1' && other.open === 'beast_1' && !!other.title && !!other.now && other.rail
    && !!other.stack && other.stack.length === 1 && other.stack[0] === 'quests', { before, other });
  await shot('04-second-quest');
  await P.page.locator('[data-quest-row="tut_1"]').first().click();
  await P.page.waitForSelector(F, { timeout: 6000 }).catch(() => {});

  /* ── 4. everything in hand ── */
  await H.grant(wsPort, me, 'item', { invKey: 'slime-remnants', count: 4 });
  await H.waitFor(P, (S) => ((S.rpg && S.rpg.inventory) || {})['slime-remnants'] || 0, (n) => n >= 4, { timeout: 15000, label: 'the remains' }).catch(() => null);
  await P.page.waitForTimeout(1500);
  const now4 = await part(P, F, 'now');
  const ready = await P.page.evaluate(() => { const p = document.querySelector('[data-quest-row="tut_1"]'); return p ? { ready: p.getAttribute('data-quest-row-ready'), status: (document.querySelector('[data-journal-page="tut_1"]') || { dataset: {} }).dataset.journalStatus } : null; });
  rec.ok(`4. with the 4 Remains: "${now4}" -- 4/4 and hand it in; its pill marked ready`, !!now4 && /4\/4 Slime Remains/.test(now4) && /hand it in to Mayor Bro/i.test(now4)
    && !!ready && ready.ready === '1' && ready.status === 'ready', { now4, ready });
  await shot('05-ready');

  /* ── 5. handed in ── */
  await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_turn_in', payload: { questId: 'tut_1', xpCat: 'melee' } }); });
  const t = await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).tut_1 || null, (v) => v === 'turnedIn', { timeout: 15000, label: 'tut_1 handed in' }).catch(() => null);
  rec.ok(`5. handed in (tut_1 ${t}) (guard)`, t === 'turnedIn', await quests(P));
  if (t !== 'turnedIn') return;
  await P.page.waitForTimeout(1500);
  await openQuests(P);
  await P.page.waitForTimeout(800);
  const after = await P.page.evaluate(() => ({
    open: (document.querySelector('[data-quests-page]') || { dataset: {} }).dataset.questOpen,
    focus: (document.querySelector('[data-journal-focus]') || { getAttribute: () => null }).getAttribute('data-journal-focus'),
    done: ((document.querySelector('[data-quest-nav="done"]') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
    gone: !document.querySelector('[data-quest-row="tut_1"]'),
  }));
  rec.ok(`5. the page goes back to the quest you are on (${after.focus}); Into the Blue left the Active list; the list has "${after.done}"`,
    !!after.focus && after.focus !== 'tut_1' && after.open === after.focus && after.gone && /Done ?1$/.test(after.done), after);
  await P.page.locator('[data-quest-nav="done"]').first().click();
  await P.page.waitForSelector('[data-quest-pane="done"]', { timeout: 6000 }).catch(() => {});
  const doneAp = await P.page.evaluate(() => { const r = document.querySelector('[data-quest-done-row="tut_1"]'); const a = r && r.parentElement && r.parentElement.querySelector('[data-quest-done-ap]'); return a ? a.textContent.trim() : null; });
  rec.ok(`5. Done lists Into the Blue with its "${doneAp}"`, doneAp === '+5 AP', doneAp);
  const ap5 = await textOf(P, '[data-journal-ap]');
  rec.ok(`5. ...under the points your quests have paid: "${ap5}"`, /Achievement Points from quests: 5\b/.test(ap5 || ''), ap5);
  await shot('06-done');
  await P.page.locator('[data-quest-done-row="tut_1"]').first().click();
  const D = '[data-journal-page="tut_1"]';
  await P.page.waitForSelector(D, { timeout: 6000 }).catch(() => {});
  const statusD = await P.page.evaluate((d) => { const e = document.querySelector(d); return e ? e.getAttribute('data-journal-status') : null; }, D);
  const nextD = await part(P, D, 'next');
  rec.ok(`5. a tap opens its page: Done, and NEXT: "${nextD}"`, statusD === 'done' && !!nextD && /Next: (talk to|carry on with) \S/.test(nextD), { statusD, nextD });
  await P.page.locator('[data-quest-back="done"]').first().click().catch(() => {});
  const back = await P.page.waitForSelector('[data-quest-pane="done"]', { timeout: 5000 }).then(() => true).catch(() => false);
  rec.ok('5. ..."Done quests" comes back to the list of them', back);

  /* ── 5b. sideways: the band is too short for a list, so the pills are one row over the quest ── */
  await P.page.locator('[data-quest-row="beast_1"]').first().click().catch(() => {});
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b) b.open('quests'); });
  await P.page.waitForSelector('[data-quests-page]', { timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(700);
  const sidew = await P.page.evaluate(() => {
    const pg = document.querySelector('[data-quests-page]');
    if (!pg) return null;
    const r = pg.getBoundingClientRect();
    const lit = pg.querySelector('[data-quest-chips] [data-quest-lit="1"]'), box = pg.querySelector('[data-quest-chips]');
    const a = box ? box.getBoundingClientRect() : null, b = lit ? lit.getBoundingClientRect() : null;
    return { mode: pg.dataset.questsPage, l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight,
      pills: pg.querySelectorAll('[data-quest-chips] [data-quest-pill]').length, litShown: !!a && !!b && b.left >= a.left - 1 && b.right <= a.right + 1,
      quest: !!pg.querySelector('[data-journal-page]') };
  });
  await shot('07-sideways');
  rec.ok('5b. sideways: the pills in one row over the open quest, the lit one in sight, all inside the screen',
    !!sidew && sidew.mode === 'chips' && sidew.pills >= 2 && sidew.litShown && sidew.quest && sidew.l >= 0 && sidew.r <= sidew.vw && sidew.b <= sidew.vh, sidew);
  await P.page.setViewportSize(PHONE);
  await P.page.waitForTimeout(800);
}
