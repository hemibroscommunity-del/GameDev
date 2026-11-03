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
 *   2. the Quests page opens ON it: NOW "0/4 Slime Remains" with its bar,
 *      WHERE the Earth Forest with Show on map, WHO "Talked to Mayor Bro ✓",
 *      GIVEN TO YOU the sword and the shield (once hidden after taking it),
 *      REWARD with "+5 Achievement Points", NEXT "Then: talk to ...", and
 *      "Achievement Points from quests: 0" at the top; plain words (no
 *      "Wheel", no "remnants");
 *   3. its row opens its own page (the same parts, and Track); Show on map
 *      opens the world map with the gold road on it;
 *   4. its 4 Slime Remains granted, the page says 4/4 and to hand it in;
 *   5. handed in (quest_turn_in): Done with its +5 AP, the points at 5, its
 *      page's NEXT line naming who is next, and the page opening on that
 *      next quest;
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
  if (!ok || !(await P.page.waitForSelector('[data-journal-ap]', { timeout: 5000 }).then(() => true).catch(() => false))) {
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b) b.open('quests'); });
    await P.page.waitForSelector('[data-journal-ap]', { timeout: 6000 }).catch(() => {});
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

  /* ── 2. the page opens on it ── */
  await openQuests(P);
  const F = '[data-journal-focus="tut_1"]';
  const focused = await P.page.waitForSelector(F, { timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('2. the Quests page opens on the quest you are on (Into the Blue)', focused, await textOf(P, '[data-journal-focus]'));
  const now = await part(P, F, 'now');
  rec.ok(`2. NOW: "${now}" -- 0/4 Slime Remains, with its bar`, !!now && /0\/4 Slime Remains/.test(now)
    && !!(await P.page.$(`${F} [data-journal-count="0/4"]`)), now);
  const where = await part(P, F, 'where');
  rec.ok(`2. WHERE: "${where}" -- the Earth Forest, which way from BroTown, and Show on map`,
    !!where && /Earth Forest, \w+ of BroTown/.test(where) && !!(await P.page.$(`${F} [data-journal-map="tut_1"]`)), where);
  const who = await part(P, F, 'who');
  rec.ok(`2. WHO: "${who}" -- Mayor Bro, "Talked to Mayor Bro ✓", his face`,
    !!who && /Talked to Mayor Bro ✓/.test(who) && !!(await P.page.$(`${F} [data-journal="who"] img[src*="mayor-bro-head"]`)), who);
  const given = await part(P, F, 'given');
  rec.ok(`2. GIVEN TO YOU: "${given}" -- the sword and the shield, still shown once taken`,
    !!given && /Copper Great Sword/.test(given) && /Pine Shield/.test(given), given);
  const reward = await part(P, F, 'reward');
  rec.ok(`2. REWARD: "${reward}" -- 25 gold, the bow and the staff, +5 Achievement Points`,
    !!reward && /\+5 Achievement Points/.test(reward) && /25 gold/.test(reward) && /Pine Bow/.test(reward) && /Pine Staff/.test(reward), reward);
  const next = await part(P, F, 'next');
  rec.ok(`2. NEXT: "${next}" -- who comes after it, and where`, !!next && /Then: talk to \S.* (at|on|by|in) /.test(next), next);
  const ap0 = await textOf(P, '[data-journal-ap]');
  rec.ok(`2. at the top: "${ap0}"`, /Achievement Points from quests: 0/.test(ap0 || ''), ap0);
  const all = await textOf(P, '.bt-dashboard') || await P.page.evaluate(() => document.body.innerText || '');
  rec.ok('2. plain words on the page: never "Wheel", never "remnants"', !/Wheel|remnant/i.test(all || ''), (all || '').slice(0, 300));
  const small = await P.page.evaluate((f) => {
    const box = document.querySelector(f);
    const out = [];
    if (box) for (const el of box.querySelectorAll('*')) {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 13) out.push({ t: el.textContent.trim().slice(0, 30), px });
    }
    return out;
  }, F);
  rec.ok(`2. readable on a phone: no words under 13 px on the page (${small.length})`, small.length === 0, small.slice(0, 5));
  const rowTrack = await P.page.$('[data-quest-row="tut_1"]') && await P.page.$('[data-quest-row-track]');
  rec.ok('2. the Active list has its row, with a Track star', !!rowTrack);
  await shot('01-taken');

  /* ── 3. its own page, and Show on map ── */
  await P.page.locator('[data-quest-row="tut_1"]').first().click();
  const D = '[data-journal-page="tut_1"]';
  const detail = await P.page.waitForFunction(() => !document.querySelector('[data-journal-focus]') && !!document.querySelector('[data-journal-page="tut_1"]') && !!document.querySelector('[data-quest-track]'),
    null, { timeout: 6000 }).then(() => true).catch(() => false);
  rec.ok('3. its row opens its own page, with the same parts and Track', detail
    && !!(await part(P, D, 'now')) && !!(await part(P, D, 'given')) && !!(await part(P, D, 'reward')) && !!(await part(P, D, 'next')));
  await shot('02-page');
  await P.page.locator(`${D} [data-journal-map]`).first().click().catch(() => {});
  let wm = null;
  for (let i = 0; i < 20; i++) {
    wm = await P.page.evaluate(() => (window.__btWorldMap ? JSON.parse(JSON.stringify(window.__btWorldMap)) : null));
    if (wm && wm.open && wm.more && wm.more.quest) break;
    await P.page.waitForTimeout(300);
  }
  const trackedNow = await P.page.evaluate(() => (window.__btTrackedQuest ? window.__btTrackedQuest.get() : null));
  rec.ok(`3. Show on map opens the world map with the gold road on this quest (${wm && wm.more && wm.more.quest ? wm.more.quest.qid : '-'}; tracked ${trackedNow})`,
    !!wm && wm.open === true && !!wm.more && !!wm.more.quest && wm.more.quest.qid === 'tut_1' && trackedNow === 'tut_1', wm && wm.more);
  await shot('03-map');
  await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-close]'); if (b) b.click(); });
  await P.page.waitForTimeout(600);

  /* ── 4. everything in hand ── */
  await H.grant(wsPort, me, 'item', { invKey: 'slime-remnants', count: 4 });
  await H.waitFor(P, (S) => ((S.rpg && S.rpg.inventory) || {})['slime-remnants'] || 0, (n) => n >= 4, { timeout: 15000, label: 'the remains' }).catch(() => null);
  await P.page.waitForTimeout(1500);
  const now4 = await part(P, D, 'now');
  rec.ok(`4. with the 4 Remains: "${now4}" -- 4/4 and hand it in`, !!now4 && /4\/4 Slime Remains/.test(now4) && /hand it in to Mayor Bro/i.test(now4), now4);

  /* ── 5. handed in ── */
  await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_turn_in', payload: { questId: 'tut_1', xpCat: 'melee' } }); });
  const t = await H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).tut_1 || null, (v) => v === 'turnedIn', { timeout: 15000, label: 'tut_1 handed in' }).catch(() => null);
  rec.ok(`5. handed in (tut_1 ${t}) (guard)`, t === 'turnedIn', await quests(P));
  if (t !== 'turnedIn') return;
  await P.page.waitForTimeout(1500);
  const statusD = await P.page.evaluate((d) => { const e = document.querySelector(d); return e ? e.getAttribute('data-journal-status') : null; }, D);
  const nextD = await part(P, D, 'next');
  rec.ok(`5. its page says Done, and NEXT: "${nextD}"`, statusD === 'done' && !!nextD && /Next: talk to \S/.test(nextD), { statusD, nextD });
  await shot('04-done-page');
  await openQuests(P);
  await P.page.waitForTimeout(800);
  const doneAp = await P.page.evaluate(() => { const r = document.querySelector('[data-quest-done-row="tut_1"]'); const a = r && r.parentElement && r.parentElement.querySelector('[data-quest-done-ap]'); return a ? a.textContent.trim() : null; });
  rec.ok(`5. Done lists Into the Blue with its "${doneAp}"`, doneAp === '+5 AP', doneAp);
  const ap5 = await textOf(P, '[data-journal-ap]');
  rec.ok(`5. the points at the top: "${ap5}"`, /Achievement Points from quests: 5\b/.test(ap5 || ''), ap5);
  const focusNext = await P.page.evaluate(() => { const f = document.querySelector('[data-journal-focus]'); return f ? { id: f.getAttribute('data-journal-focus'), text: (f.innerText || '').replace(/\s+/g, ' ').slice(0, 160) } : null; });
  rec.ok(`5. the page now opens on what is next (${focusNext && focusNext.id}): "${focusNext && focusNext.text}"`,
    !!focusNext && focusNext.id !== 'tut_1' && /Your next quest/i.test(focusNext.text) && /Talk to /.test(focusNext.text), focusNext);
  await shot('05-next');
}
