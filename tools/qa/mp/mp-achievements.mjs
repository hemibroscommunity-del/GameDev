/* ═══ v2.3.3485: ACHIEVEMENTS, ON A PHONE ═══
 *
 * The owner, 2026-10-19: "Achievement points are something I'd like in the
 * game. You get it by completing the game. Some of them are through super
 * rare achievements. Although not as rare, an arena winner should be included
 * in that."  Then, to the plan's six questions, "Go recommended on
 * everything".  The worker grants them (server/src/achievements.js); this
 * walks the phone's half with a real worker, two real pages in the Wheel:
 *
 *   A, an upright phone:
 *     1. the worker says it grants them (caps.achievements) and sends the
 *        record at the join; More's Journey tile is Achievements, "0 of 23
 *        earned", its label whole;
 *     2. the tile opens the page: 23 rows, "0/23", the worker's AP -- the
 *        two on the header row beside "◂ ACHIEVEMENTS", and two whole rows in
 *        view as it opens (the review: it showed one) -- the six super-rares
 *        SHOWN though not earned (decision 3), locked, and no "Use as title"
 *        on a row not earned; the chips filter (the arena's row under Rare);
 *     3. the owner's lever lights the Gladiator (its single-id path sends
 *        `new`): its row earned and dated, NO points paid, and a BIG one's
 *        moment -- the banner "Gladiator · +500 AP", its fanfare asked,
 *        drawn outside the world's wrap and inside the screen, gone after
 *        about three seconds;
 *     4. a REAL first kill (the test kit's kill: the worker's own
 *        _resolveMonsterKill, the path every kill takes) grants First Blood:
 *        +10 AP on the page and in S._achv, the same as the player_state
 *        echo, a chat line "Achievement: First Blood (+10 AP)", and no banner
 *        (a common one);
 *     5. a title: no title buttons until an earned row is OPENED (the owner's
 *        ChatGPT review); First Blood opened, "Use as title" -- the worker's
 *        next achv_state carries `t`, the row says "Your title" with "Remove
 *        title", the header names it; Gladiator opened offers it, First
 *        Blood's row closing (one open at a time) with its tick;
 *     6. your own Inspect card wears it (.bt-pin-title[data-achv]) and its
 *        rarest box is the worker's pick (.bt-pin-drop[data-rarest]); the
 *        title chip opens the page UNDER More, its header and summary on;
 *   B, a computer, beside A:
 *     7. B sees A's card blob with A's worker AP and title;
 *     8. A's page FORGES its AP (S.rpg.achievementPoints = 99999) and its
 *        track carries the forgery; A takes its title off (a real change, so
 *        the card goes out): B sees the title gone and the AP still the
 *        worker's -- the stamp (achievements.js _achvStamp);
 *     9. B's page on a computer: inside the game's column, no sideways
 *        scroll, rows readable; B's banner inside the column (#root);
 *   A again:
 *    10. sideways (844 x 390): More's tile whole, the page in the ~238 px
 *        side column, chips two by two, no sideways scroll, nothing cut;
 *    11. no page errors.
 * Pictures in tools/qa/mp/out/achievements-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const DESK = { width: 1280, height: 800 };
const SIDE = { width: 844, height: 390 };
const LANDS = ['frost', 'ember', 'sky', 'verdant', 'hollows', 'thunder', 'tidal', 'mist'];

/* every achv_state the page receives, as it came (a watch on the socket, the
   platform's API: nothing in the game is replaced) */
const WATCH = () => {
  const Native = window.WebSocket;
  const seen = window.__achvSeen = [];
  const Wrapped = function (url, protocols) {
    const ws = protocols === undefined ? new Native(url) : new Native(url, protocols);
    ws.addEventListener('message', (ev) => {
      const d = ev.data;
      if (typeof d !== 'string' || d.indexOf('"achv_state"') < 0) return;
      try {
        const m = JSON.parse(d);
        for (const x of Array.isArray(m) ? m : [m]) if (x && x.type === 'achv_state' && seen.length < 200) seen.push({ at: Date.now(), p: x.payload });
      } catch (e) { /* a frame we cannot read is not ours to judge */ }
    });
    return ws;
  };
  Wrapped.prototype = Native.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Wrapped[k] = Native[k];
  window.WebSocket = Wrapped;
};

/* a real tap: the element at its own centre must be it (tapTop's rule) */
async function tap(P, sel, timeout = 8000) {
  const loc = P.page.locator(sel).first();
  await loc.waitFor({ state: 'visible', timeout });
  const verdict = await loc.evaluate((el) => {
    el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    if (!top) return 'nothing at its centre';
    return el === top || el.contains(top) ? 'ok' : 'covered by <' + top.tagName.toLowerCase() + ' class="' + (top.className || '') + '">';
  });
  if (verdict !== 'ok') throw new Error(sel + ' is not tappable: ' + verdict);
  await loc.click({ force: true });
}

const achv = (P) => H.readState(P, (S) => {
  const a = S._achv || null;
  return {
    caps: !!(S._serverCaps && S._serverCaps.achievements), known: !!(a && a.known), unavailable: !!(a && a.unavailable),
    got: a ? Object.keys(a.got) : [], n: a ? Object.assign({}, a.n) : {}, ap: a ? a.ap : null,
    t: a ? a.t : null, rarest: a ? a.rarest : null, rpgAp: S.rpg ? S.rpg.achievementPoints : null,
  };
});

/* the page as drawn */
const pageLook = (P, scope) => P.page.evaluate((scope) => {
  const root = scope ? document.querySelector(scope) : document;
  const panel = root && root.querySelector('[data-achv-panel]');
  if (!panel) return null;
  const rows = [...panel.querySelectorAll('[data-achv-row]')];
  const r = panel.getBoundingClientRect();
  const fs = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
  return {
    state: panel.dataset.achvPanel,
    rows: rows.length,
    ids: rows.map((x) => x.dataset.achvRow),
    got: rows.filter((x) => x.dataset.achvGot === '1').map((x) => x.dataset.achvRow),
    /* the summary rides the drilled header row (data-dash-head), outside the
       page; the split is the page's last line */
    apTotal: (() => { const e = root.querySelector('[data-achv-ap-total]'); return e ? Number(e.dataset.achvApTotal) : NaN; })(),
    count: (root.querySelector('[data-achv-count]') || {}).textContent || '',
    split: (panel.querySelector('[data-achv-split]') || {}).textContent || '',
    titleNow: (root.querySelector('[data-achv-title-current]') || { dataset: {} }).dataset.achvTitleCurrent || null,
    summaryAt: (() => { const e = root.querySelector('[data-achv-summary]'); return e ? e.dataset.achvSummary + (e.closest('[data-dash-head]') ? '@head' : '') : null; })(),
    /* the rows wholly in view in the page's own scroll box, as it opened */
    inView: (() => { const pr = panel.getBoundingClientRect(); return rows.filter((x) => { const b = x.getBoundingClientRect(); return b.top >= pr.top - 1 && b.bottom <= pr.bottom + 1; }).length; })(),
    superrare: rows.filter((x) => x.dataset.achvTier === 'superrare').map((x) => ({
      got: x.dataset.achvGot, name: ((x.querySelector('[data-achv-name]') || {}).textContent || '').trim(), lock: !!x.querySelector('[data-achv-lock]') })),
    useOnUnearned: rows.filter((x) => x.dataset.achvGot !== '1' && x.querySelector('[data-achv-title-use], [data-achv-title-off]')).map((x) => x.dataset.achvRow),
    box: { x: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), y: Math.round(r.top) },
    sideScroll: panel.scrollWidth - panel.clientWidth,
    /* a name or a chip cut short (wider than its own box); a row's one-line
       clue is cut with an ellipsis on purpose (the whole of it when opened) */
    cut: [...panel.querySelectorAll('[data-achv-name], [data-achv-chip] span')].filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent.slice(0, 30)),
    minFont: Math.min(...rows.slice(0, 8).flatMap((x) => [fs(x.querySelector('[data-achv-name]')), fs(x.querySelector('[data-achv-clue], [data-achv-how]'))])),
    minRowH: Math.min(...rows.map((x) => Math.round(x.getBoundingClientRect().height))),
    chipCols: (() => { const c = panel.querySelector('[data-achv-chip]'); const g = c && c.parentElement; return g ? getComputedStyle(g).gridTemplateColumns : null; })(),
    chips: [...panel.querySelectorAll('[data-achv-chip]')].map((x) => x.dataset.achvChip + (x.getAttribute('aria-pressed') === 'true' ? '*' : '')),
  };
}, scope || null);

const bannerLook = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-achv-banner]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const root = document.getElementById('root');
  const rr = root ? root.getBoundingClientRect() : null;
  const layer = el.closest('[data-achv-banner-layer]');
  return {
    id: el.dataset.achvBanner, tier: el.dataset.achvTier,
    words: ((el.querySelector('[data-achv-banner-words]') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
    x: Math.round(r.left), r: Math.round(r.right), y: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width),
    vw: innerWidth, vh: innerHeight,
    col: rr ? { x: Math.round(rr.left), r: Math.round(rr.right), y: Math.round(rr.top), b: Math.round(rr.bottom) } : null,
    inWrap: !!el.closest('.brotown-wrap'), inRoot: !!(root && root.contains(el)),
    layerPE: layer ? getComputedStyle(layer).pointerEvents : null,
    q: window.__btAchvBanner ? { shown: window.__btAchvBanner.shown, ids: window.__btAchvBanner.ids.slice() } : null,
    champion: window.__btCues && window.__btCues.stats ? (window.__btCues.stats.played.champion || 0) : null,
    img: (el.querySelector('img') || {}).src || null,
  };
});

/* another player's card blob as this page holds it (S.others[id].rpgData) */
const peerCard = (P, id) => P.page.evaluate((pid) => {
  const S = window._gameState && window._gameState.current;
  const o = S && S.others && S.others[pid];
  const r = o && o.rpgData;
  return r ? { ap: r.ap, title: r.title || null, rarest: r.rarest || null } : null;
}, id);

/* a sideways page's own tap, as mp-codexfit taps there: the handler's own
   event (these controls answer pointerup) */
const pointerUp = (P, sel) => P.page.evaluate((s) => {
  const b = document.querySelector(s);
  if (!b) return false;
  b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  return true;
}, sel);

async function inWheel(P) {
  return H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
}

/* More -> the tile -> the page, by real taps (upright and on a computer; this
   box draws a few frames a second, so each step waits for what it opened) */
async function openPage(P) {
  /* a first join arrives with the band folded (v2.3.2495); the rail's More
     is not there until it is unfolded */
  await H.unfoldBand(P).catch(() => {});
  await H.openDest(P, 'More');
  await P.page.waitForSelector('[data-more-tile="achievements"]', { timeout: 8000 });
  await tap(P, '[data-more-tile="achievements"]');
  return P.page.waitForSelector('[data-achv-panel="1"]', { timeout: 8000 }).then(() => true).catch(() => false);
}

/* the test kit's kill of the first live monster it finds at a land's town end */
async function realKill(wsPort, me) {
  for (const land of LANDS) {
    for (let k = 0; k < 3; k++) {
      const j = await H.devOp(wsPort, 'trapping', me, { kill: 'wm-' + land + '-' + k }).catch((e) => ({ ok: false, error: String(e) }));
      if (j && j.ok && j.killed) return j;
    }
  }
  return null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errs = [];
  const A = await H.newPlayer(browser, { name: 'Achiever', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: '(' + WATCH.toString() + ')();' });
  A.page.on('pageerror', (e) => errs.push('A: ' + String(e && e.message || e).slice(0, 200)));
  let B = null, stopA = () => {}, stopB = () => {};
  try {
    await H.enterWorld(A);
    const okA = await inWheel(A);
    rec.ok('A: in the Wheel (guard)', okA);
    if (!okA) return;
    stopA = H.keepAlive(A);
    const aId = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', aId, { heal: true, god: true, godMinutes: 30 }).catch(() => {});

    /* ── 1 ── */
    const s0 = await H.waitFor(A, (S) => !!(S._achv && S._achv.known && S._serverCaps), (v) => v, { timeout: 30000, label: 'the record at join' })
      .then(() => achv(A)).catch(() => achv(A));
    rec.ok('1a the worker grants achievements (caps.achievements) and sent the record at the join: nothing earned yet',
      s0.caps && s0.known && !s0.unavailable && s0.got.length === 0 && typeof s0.ap === 'number', s0);
    await H.unfoldBand(A).catch(() => {});
    await H.openDest(A, 'More');
    const tile = await A.page.waitForSelector('[data-more-tile="achievements"]', { timeout: 8000 }).then(() => A.page.evaluate(() => {
      const t = document.querySelector('[data-more-tile="achievements"]');
      const sp = t.querySelector('span');
      return { label: (sp ? sp.textContent : '').replace(/\u00AD/g, ''), title: t.getAttribute('title'), journey: !!document.querySelector('[data-more-tile="journey"]'),
        whole: !!sp && sp.scrollWidth <= sp.clientWidth + 1 && sp.scrollHeight <= sp.clientHeight + 1,
        icon: !!(t.querySelector('img') && /\/icons\/achievements\/achievements\.webp/.test(t.querySelector('img').src)) };
    })).catch(() => null);
    rec.ok(`1b More: Journey's tile is Achievements, whole ("${tile && tile.label}"), the owner's medal its picture, "0 of 23 earned"`,
      !!tile && tile.label === 'Achievements' && !tile.journey && tile.whole && tile.icon && /0 of 23 earned/.test(tile.title || ''), tile);

    /* ── 2 ── */
    await tap(A, '[data-more-tile="achievements"]');
    const up = await A.page.waitForSelector('[data-achv-panel="1"]', { timeout: 8000 }).then(() => true).catch(() => false);
    const p0 = up ? await pageLook(A) : null;
    rec.ok(`2a the tile opens the page: ${p0 && p0.rows} rows, "${p0 && p0.count}", the worker's AP (${p0 && p0.apTotal})`,
      !!p0 && p0.rows === 23 && /^0\/23$/.test(p0.count.trim()) && p0.apTotal === s0.ap && p0.got.length === 0, p0);
    /* the owner's ChatGPT review: the page showed ONE row as it opened */
    rec.ok(`2a2 the AP and the count ride the header row ("${p0 && p0.summaryAt}"), and ${p0 && p0.inView} whole rows are in view as it opens (two at least)`,
      !!p0 && p0.summaryAt === 'head@head' && p0.inView >= 2, p0 && { summaryAt: p0.summaryAt, inView: p0.inView, box: p0.box });
    rec.ok('2b the six super-rares are SHOWN before they are earned (decision 3): named, locked, never "???"',
      !!p0 && p0.superrare.length === 6 && p0.superrare.every((x) => x.got === '0' && x.lock && x.name && !/\?\?/.test(x.name)), p0 && p0.superrare);
    rec.ok('2c no row you have not earned offers "Use as title"', !!p0 && p0.useOnUnearned.length === 0, p0 && p0.useOnUnearned);
    const counts = {};
    for (const f of ['superrare', 'rare', 'common', 'all']) {
      await tap(A, `[data-achv-chip="${f}"]`).catch(() => {});
      await A.page.waitForSelector(`[data-achv-list="${f}"]`, { timeout: 4000 }).catch(() => {});
      const l = await pageLook(A);
      counts[f] = l ? { n: l.rows, arena: l.ids.includes('gladiator') } : null;
    }
    rec.ok('2d the chips: Super-rare 6, Rare 10 with the arena\'s row, Common 7, All 23',
      counts.superrare && counts.superrare.n === 6 && counts.rare && counts.rare.n === 10 && counts.rare.arena
        && counts.common && counts.common.n === 7 && !counts.common.arena && counts.all && counts.all.n === 23, counts);
    /* the owner's painted badges: every row its own, loaded at its 150 px */
    const badges = await A.page.waitForFunction(() => {
      const rows = [...document.querySelectorAll('[data-achv-row]')];
      const look = rows.map((r) => { const i = r.querySelector('img'); return { id: r.dataset.achvRow, src: i ? i.getAttribute('src') : '', w: i ? i.naturalWidth : 0 }; });
      return rows.length === 23 && look.every((x) => x.w === 150) ? look : false;
    }, null, { timeout: 10000, polling: 250 }).then((h) => h.jsonValue()).catch(() => A.page.evaluate(() => [...document.querySelectorAll('[data-achv-row]')]
      .map((r) => { const i = r.querySelector('img'); return { id: r.dataset.achvRow, src: i ? i.getAttribute('src') : '', w: i ? i.naturalWidth : 0 }; })));
    rec.ok('2e every row wears its own badge, the owner\'s, loaded (150 px)',
      badges.length === 23 && badges.every((x) => x.src.startsWith('/icons/achievements/' + x.id + '.webp?v=') && x.w === 150),
      badges.filter((x) => !x.src.startsWith('/icons/achievements/' + x.id + '.webp?v=') || x.w !== 150));
    await A.page.screenshot({ path: join(OUT, 'achievements-1-page.png') });

    /* ── 3 ── */
    const champ0 = await A.page.evaluate(() => (window.__btCues && window.__btCues.stats ? window.__btCues.stats.played.champion || 0 : 0));
    const lever = await H.devOp(wsPort, 'achv', aId, { id: 'gladiator' }).catch((e) => ({ ok: false, error: String(e) }));
    const b1 = await A.page.waitForSelector('[data-achv-banner="gladiator"]', { timeout: 15000 }).then(() => bannerLook(A)).catch(() => null);
    if (b1) await A.page.screenshot({ path: join(OUT, 'achievements-2-banner.png') });
    rec.ok(`3a the lever's one achievement is a BIG one's moment: the banner "${b1 && b1.words}", arena orange, its own badge`,
      !!lever && lever.ok && !!b1 && b1.words === 'Gladiator · +500 AP' && b1.tier === 'arena' && /\/icons\/achievements\/gladiator\.webp/.test(b1.img || ''), { lever, b1 });
    rec.ok('3b ...with the champion\'s fanfare asked for it', !!b1 && b1.champion > champ0, { champ0, b1: b1 && b1.champion });
    rec.ok('3c ...drawn outside the world\'s wrap, inside the screen, never a tap target',
      !!b1 && !b1.inWrap && b1.inRoot && b1.x >= 0 && b1.r <= b1.vw && b1.y >= 0 && b1.b <= b1.vh && b1.layerPE === 'none', b1);
    const gone = await A.page.waitForFunction(() => !document.querySelector('[data-achv-banner]'), null, { timeout: 15000, polling: 200 }).then(() => true).catch(() => false);
    rec.ok('3d ...and gone after about three seconds', gone);
    const s1 = await H.waitFor(A, (S) => !!(S._achv && S._achv.got.gladiator), (v) => v, { timeout: 8000, label: 'gladiator' }).then(() => achv(A)).catch(() => achv(A));
    const p1 = await pageLook(A);
    rec.ok('3e its row is earned and dated; the lever paid no points',
      s1.got.includes('gladiator') && s1.ap === s0.ap && !!p1 && p1.got.includes('gladiator')
        && await A.page.evaluate(() => !!(document.querySelector('[data-achv-row="gladiator"] [data-achv-date]') || {}).textContent), { s1, got: p1 && p1.got });

    /* ── 4 ── */
    const kill = await realKill(wsPort, aId);
    const s2 = await H.waitFor(A, (S) => !!(S._achv && S._achv.got.first_blood && S._achv.ap != null && S.rpg && S.rpg.achievementPoints === S._achv.ap), (v) => v,
      { timeout: 15000, label: 'First Blood' }).then(() => achv(A)).catch(() => achv(A));
    rec.ok(`4a a real first kill (${kill && kill.killed}) grants First Blood: +10 AP (${s0.ap} -> ${s2.ap}), the player_state echo the same`,
      !!kill && s2.got.includes('first_blood') && s2.ap === s0.ap + 10 && s2.rpgAp === s2.ap, { kill, s2 });
    const line = await H.readState(A, (S) => (S.chatLog || []).map((l) => l && l.text).filter((t) => /Achievement: First Blood/.test(t || '')));
    rec.ok(`4b ...said in the chat: "${line[0] || ''}"`, line.length === 1 && /Achievement: First Blood \(\+10 AP\)/.test(line[0]), line);
    await A.page.waitForTimeout(1500);
    const q = await A.page.evaluate(() => (window.__btAchvBanner ? window.__btAchvBanner.ids.slice() : []));
    rec.ok('4c ...and no banner for a common one', !q.includes('first_blood'), q);
    await A.page.waitForFunction(() => /^2\/23$/.test(((document.querySelector('[data-achv-count]') || {}).textContent || '').trim()), null, { timeout: 8000, polling: 250 }).catch(() => {});
    const p2 = await pageLook(A);
    rec.ok(`4d the page agrees: "${p2 && p2.count}", ${p2 && p2.apTotal} AP, "${p2 && p2.split.trim()}"`,
      !!p2 && /^2\/23$/.test(p2.count.trim()) && p2.apTotal === s2.ap && p2.got.includes('first_blood')
        && /510 from achievements/.test(p2.split), p2);

    /* ── 5 ── */
    const seenBefore = await A.page.evaluate(() => window.__achvSeen.length);
    /* an earned row's title buttons are on the OPENED row (the review: they
       no longer add a line to every earned row): no button before the tap */
    const shut = await A.page.evaluate(() => !document.querySelector('[data-achv-title-use]'));
    await tap(A, '[data-achv-row="first_blood"]');
    const opened = await A.page.waitForSelector('[data-achv-row="first_blood"][data-achv-open="1"] [data-achv-title-use="first_blood"]', { timeout: 6000 }).then(() => true).catch(() => false);
    rec.ok('5 no title buttons until an earned row is opened; a tap on First Blood opens it with "Use as title"', shut && opened, { shut, opened });
    await tap(A, '[data-achv-title-use="first_blood"]');
    const told = await A.page.waitForFunction((n) => {
      const s = window.__achvSeen.slice(n).find((x) => x.p && x.p.t);
      return s ? s.p : null;
    }, seenBefore, { timeout: 10000, polling: 200 }).then((h) => h.jsonValue()).catch(() => null);
    rec.ok('5a "Use as title": the worker\'s next achv_state carries `t`', !!told && told.t === 'first_blood', told);
    await A.page.waitForSelector('[data-achv-row="first_blood"] [data-achv-title-on]', { timeout: 6000 }).catch(() => {});
    const s3 = await achv(A);
    const t1 = await A.page.evaluate(() => ({
      on: !!document.querySelector('[data-achv-row="first_blood"] [data-achv-title-on]'),
      off: !!document.querySelector('[data-achv-title-off="first_blood"]'),
      now: (document.querySelector('[data-achv-title-current]') || { dataset: {} }).dataset.achvTitleCurrent,
    }));
    await A.page.screenshot({ path: join(OUT, 'achievements-3-title.png') });
    /* the other earned row, opened, offers it -- and First Blood's closes */
    await tap(A, '[data-achv-row="gladiator"]').catch(() => {});
    await A.page.waitForSelector('[data-achv-row="gladiator"][data-achv-open="1"]', { timeout: 6000 }).catch(() => {});
    const t2 = await A.page.evaluate(() => ({
      useOnGladiator: !!document.querySelector('[data-achv-title-use="gladiator"]'),
      fbShut: !!document.querySelector('[data-achv-row="first_blood"][data-achv-open="0"]') && !document.querySelector('[data-achv-title-off="first_blood"]'),
      fbTick: !!document.querySelector('[data-achv-row="first_blood"] [data-achv-wearing]'),
    }));
    rec.ok('5b the row says "Your title" with "Remove title" and the header names it; the other earned row, opened, offers it (one open at a time, First Blood keeps its tick)',
      s3.t === 'first_blood' && t1.on && t1.off && t1.now === 'first_blood' && t2.useOnGladiator && t2.fbShut && t2.fbTick, { s3, t1, t2 });

    /* ── 6 ── */
    await H.closeDest(A).catch(() => {});
    await A.page.evaluate(() => { if (window.__broInspectSelf) window.__broInspectSelf(); });
    const card = await A.page.waitForSelector('.bt-pin-title[data-achv]', { timeout: 8000 }).then(() => A.page.evaluate(() => {
      const t = document.querySelector('.bt-pin-title[data-achv]');
      const d = document.querySelector('.bt-pin-drop[data-rarest]');
      return { title: t ? t.dataset.achv : null, text: t ? t.textContent.trim() : '', rarest: d ? d.dataset.rarest : null, tier: d ? d.dataset.tier : null };
    })).catch(() => null);
    const s4 = await achv(A);
    if (card) await A.page.screenshot({ path: join(OUT, 'achievements-4-card.png') });
    rec.ok(`6a your own card wears the title ("${card && card.text}") and its rarest box is the worker's pick (${card && card.rarest})`,
      !!card && card.title === 'first_blood' && /First Blood/.test(card.text) && card.rarest === s4.rarest && s4.rarest === 'gladiator' && card.tier === 'arena', { card, rarest: s4.rarest });
    /* the chip is a button to the page: it opens UNDER More, with its
       "◂ ACHIEVEMENTS" header and the summary on it (a root page had none) */
    await tap(A, '.bt-pin-title[data-achv]').catch(() => {});
    const fromCard = await A.page.waitForSelector('[data-achv-panel="1"]', { timeout: 8000 }).then(() => A.page.evaluate(() => ({
      card: !!document.querySelector('.bt-pin-title'),
      back: ((document.querySelector('[data-dash-back]') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      head: !!document.querySelector('[data-dash-head] [data-achv-summary="head"]'),
      stack: window.__broDashPanelBus ? window.__broDashPanelBus.state.stack.slice() : null,
    }))).catch(() => null);
    rec.ok(`6b the card's title chip opens the page under More ("${fromCard && fromCard.back}"), the summary on its header`,
      !!fromCard && !fromCard.card && /ACHIEVEMENTS/i.test(fromCard.back) && fromCard.head && !!fromCard.stack && fromCard.stack.join() === 'more,achievements', fromCard);
    await H.closeDest(A).catch(() => {});

    /* ── 7 ── */
    B = await H.newPlayer(browser, { name: 'Onlooker', wsPort, webPort, viewport: DESK, world: 'wheel' });
    B.page.on('pageerror', (e) => errs.push('B: ' + String(e && e.message || e).slice(0, 200)));
    await H.enterWorld(B);
    const okB = await inWheel(B);
    rec.ok('B: a computer, in the Wheel beside A (guard)', okB);
    if (!okB) return;
    stopB = H.keepAlive(B);
    const bId = await H.readState(B, (S) => S.myId);
    let seen = null;
    for (const t0 = Date.now(); Date.now() - t0 < 40000;) {
      seen = await peerCard(B, aId).catch(() => null);
      if (seen && seen.ap === s2.ap && seen.title === 'first_blood') break;
      await B.page.waitForTimeout(400);
    }
    rec.ok(`7a B sees A's card: the worker's AP (${seen && seen.ap}), A's title and rarest`,
      !!seen && seen.ap === s2.ap && seen.title === 'first_blood' && seen.rarest === 'gladiator', seen);

    /* ── 8 ── */
    await A.page.evaluate(() => {
      const S = window._gameState.current;
      window.__trackAps = [];
      const own = S.channel.track;
      S.channel.track = function (d) { try { window.__trackAps.push(d && d.rpgData ? d.rpgData.ap : null); } catch (e) { /* watch only */ } return own.call(this, d); };
      S.rpg.achievementPoints = 99999;   /* a modified page's claim */
    });
    const forged = await A.page.waitForFunction(() => (window.__trackAps || []).includes(99999), null, { timeout: 15000, polling: 250 }).then(() => true).catch(() => false);
    await openPage(A).catch(() => false);
    await tap(A, '[data-achv-row="first_blood"]').catch(() => {});
    await A.page.waitForSelector('[data-achv-title-off="first_blood"]', { timeout: 8000 }).catch(() => {});
    const seenOff = await A.page.evaluate(() => window.__achvSeen.length);
    await tap(A, '[data-achv-title-off="first_blood"]').catch(() => {});
    const offTold = await A.page.waitForFunction((n) => {
      const s = window.__achvSeen.slice(n).find((x) => x.p && !x.p.unavailable);
      return s ? s.p : null;
    }, seenOff, { timeout: 10000, polling: 200 }).then((h) => h.jsonValue()).catch(() => null);
    let after = null;
    for (const t0 = Date.now(); Date.now() - t0 < 30000;) {
      after = await peerCard(B, aId).catch(() => null);
      if (after && !after.title) break;
      await B.page.waitForTimeout(400);
    }
    rec.ok(`8a A's page forged ${forged ? '99999' : '(no track seen)'} AP into its track and took its title off (the worker's answer: no \`t\`)`,
      forged && !!offTold && !offTold.t, { forged, offTold: offTold && { t: offTold.t || null } });
    rec.ok(`8b B saw the change, and A's AP on it is still the worker's (${after && after.ap}), never the page's 99999`,
      !!after && !after.title && after.ap === s2.ap, after);

    /* ── 9 ── */
    const bUp = await openPage(B).catch(() => false);
    const pb = bUp ? await pageLook(B) : null;
    const col = await B.page.evaluate(() => { const r = document.getElementById('root').getBoundingClientRect(); return { x: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; });
    rec.ok(`9a on a computer the page is in the game's column (${col.x}-${col.r}), no sideways scroll, 23 rows of 48 px and up, type 12 px and up, two rows in view`,
      !!pb && pb.rows === 23 && pb.box.x >= col.x - 1 && pb.box.r <= col.r + 1 && pb.sideScroll <= 0 && pb.minRowH >= 47 && pb.minFont >= 12 && pb.cut.length === 0
        && pb.summaryAt === 'head@head' && pb.inView >= 2, { pb, col });
    await B.page.screenshot({ path: join(OUT, 'achievements-5-computer.png') });
    await H.devOp(wsPort, 'achv', bId, { id: 'golden_giant' }).catch(() => {});
    const bb = await B.page.waitForSelector('[data-achv-banner="golden_giant"]', { timeout: 15000 }).then(() => bannerLook(B)).catch(() => null);
    if (bb) await B.page.screenshot({ path: join(OUT, 'achievements-6-computer-banner.png') });
    rec.ok(`9b on a computer a super-rare's banner ("${bb && bb.words}") is inside the game's column, not the window's middle`,
      !!bb && bb.tier === 'superrare' && bb.words === 'Golden Giant · +1,000 AP' && !!bb.col && bb.x >= bb.col.x && bb.r <= bb.col.r && bb.col.r - bb.col.x < bb.vw - 100, bb);

    /* ── 10 ── */
    await H.closeDest(A).catch(() => {});
    await A.page.setViewportSize(SIDE);
    await A.page.waitForFunction(() => document.documentElement.getAttribute('data-orient') === 'landscape', null, { timeout: 10000, polling: 250 }).catch(() => {});
    await A.page.waitForTimeout(2500);
    /* the side column opens on its fold chip, then More on the dock (the
       sideways page's own pointerup, mp-codexfit's way) */
    if (await A.page.evaluate(() => { const f = document.querySelector('[data-land-fold]'); return !!f && f.getAttribute('data-land-fold') === 'min'; })) {
      await pointerUp(A, '[data-land-fold]');
      await A.page.waitForSelector('[data-land-fold="open"]', { timeout: 6000 }).catch(() => {});
    }
    await A.page.waitForSelector('.bt-navrail [data-nav="more"]', { timeout: 6000 }).catch(() => {});
    await pointerUp(A, '.bt-navrail [data-nav="more"]');
    const sideTile = await A.page.waitForSelector('.bt-land-sheet [data-more-tile="achievements"]', { timeout: 8000 }).then(() => A.page.evaluate(() => {
      const sp = document.querySelector('.bt-land-sheet [data-more-tile="achievements"] span');
      return sp ? { text: sp.textContent.replace(/\u00AD/g, ''), whole: sp.scrollWidth <= sp.clientWidth + 1 && sp.scrollHeight <= sp.clientHeight + 1 } : null;
    })).catch(() => null);
    rec.ok('10a sideways: More\'s tile reads Achievements, whole', !!sideTile && sideTile.text === 'Achievements' && sideTile.whole, sideTile);
    await pointerUp(A, '.bt-land-sheet [data-more-tile="achievements"]');
    const sUp = await A.page.waitForSelector('.bt-land-sheet [data-achv-panel="1"]', { timeout: 8000 }).then(() => true).catch(() => false);
    const ps = sUp ? await pageLook(A, '.bt-land-sheet') : null;
    rec.ok(`10b sideways the page is in the side column (${ps && ps.box.w} px), the chips two by two, no sideways scroll, nothing cut, rows readable, the summary under the header`,
      !!ps && ps.rows === 23 && ps.box.w <= 270 && ps.sideScroll <= 0 && ps.cut.length === 0 && ps.minFont >= 11.5 && ps.minRowH >= 47
        && !!ps.chipCols && ps.chipCols.split(' ').length === 2 && ps.summaryAt === 'head@head', ps);
    await A.page.screenshot({ path: join(OUT, 'achievements-7-sideways.png') });

    /* ── 11 ── */
    rec.ok('11 no page errors', errs.length === 0, errs);
  } finally {
    stopA(); stopB();
    if (B) await B.ctx.close().catch(() => {});
    await A.ctx.close().catch(() => {});
  }
}
