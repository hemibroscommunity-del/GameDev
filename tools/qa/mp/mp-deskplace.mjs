/* ═══ ON A COMPUTER, WHAT IS DRAWN OVER THE GAME IS PLACED WHERE THE GAME IS (v2.3.3470) ═══
 *
 * Found beside the owner's "the jump to bag also flies off screen (to far left
 * where black area is not where bag area is)", 2026-10-18 -- the same mistake
 * (TRAPS §232).  On a computer the game is a column between black bars, and
 * #root's contain:paint makes every `position: fixed` element inside it
 * measure from the COLUMN.  Three overlays placed themselves in the WINDOW's
 * numbers all the same:
 *
 *   - the quest coach and the controls tour (Settings): every ring, card and
 *     spotlight the column's left edge too far right -- a new bro's "Tap OPEN"
 *     ring at x 838 with the button at 426, past the column's right edge where
 *     its paint box cut it off;
 *   - the level-up celebration: sized and pinned from window.innerWidth, its
 *     medallion at x 640 of a 436 px column and its caption 1,280 px wide --
 *     wholly past the column's right edge: on a computer no celebration was
 *     seen at all, only heard;
 *   - the bag's item card: placed from the tile's window x, so it always
 *     flipped and clamped to the column's right edge, never beside the tile.
 *
 * Each now places in its layer's own box (src/ui/fixedBox.js; the burst
 * measures its own).  On a phone that box is the window: the last part pins
 * the celebration and the card where they were.
 */
import * as H from './harness.mjs';

const DESK = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const LESSONS = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];

/* the coach's layer, ring and card, in the window's numbers */
const coach = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-coach]');
  if (!el) return null;
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  return { id: el.getAttribute('data-coach'), ring: box(el.querySelector('[data-coach-ring]')), card: box(el.querySelector('[data-coach-card]')) };
});
const rectOf = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null;
}, sel);
const mid = (b) => ({ x: b.l + b.w / 2, y: b.t + b.h / 2 });
const off = (a, b) => { const p = mid(a), q = mid(b); return Math.round(Math.hypot(p.x - q.x, p.y - q.y) * 10) / 10; };
const within = (b, col, pad = 0) => !!b && b.l >= col.l - pad && b.r <= col.r + pad && b.t >= col.t - pad && b.b <= col.b + pad;
const overlaps = (a, b) => !!(a && b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t);

async function waitCoach(P, want, ms = 30000) {
  const t0 = Date.now();
  for (;;) {
    const c = await coach(P);
    if (want === null ? !c || c.id !== 'openDash' : (c && c.id === want && c.ring && c.ring.w > 0)) return c;
    if (Date.now() - t0 > ms) return c;
    await P.page.waitForTimeout(250);
  }
}

/* a level-up, held at its settled frame: where its medallion and caption are */
async function burstAt(P) {
  await P.page.evaluate(() => { window.__btLevelUpFreeze = 1500; });
  await P.page.evaluate(() => window._setLevelUpMsg && window._setLevelUpMsg({
    kind: 'combat', level: 14, skill: 'bow', skillLabel: 'Bow', skillLevel: 9, gains: '+1.5 damage', ts: Date.now() }));
  const t0 = Date.now();
  let b = null;
  while (Date.now() - t0 < 10000) {
    b = await P.page.evaluate(() => {
      const box = (s) => { const n = document.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect(); return r.width > 0 ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null; };
      /* the caption's plate: the box that holds the words */
      const cap = document.querySelector('[data-levelup-caption]');
      const plate = cap && cap.firstElementChild ? cap.firstElementChild.getBoundingClientRect() : null;
      return { icon: box('[data-levelup-icon]'), art: box('[data-levelup-art]'), cap: box('[data-levelup-caption]'),
        plate: plate && plate.width > 0 ? { l: plate.left, t: plate.top, r: plate.right, b: plate.bottom, w: plate.width, h: plate.height } : null };
    });
    if (b && b.icon && b.art && b.cap) break;
    await P.page.waitForTimeout(250);
  }
  return b;
}
async function burstEnd(P) {
  await P.page.evaluate(() => { delete window.__btLevelUpFreeze; });
  await P.page.waitForFunction(() => !document.querySelector('[data-levelup-kind]'), null, { timeout: 15000, polling: 250 }).catch(() => {});
}

/* tap or click a bag tile, then read the item card */
async function cardFor(P, tile, touch) {
  const x = (tile.l + tile.r) / 2, y = (tile.t + tile.b) / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  return P.page.waitForFunction(() => {
    const c = document.querySelector('[data-item-card]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return r.left > -1000 && r.width > 0 ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null;
  }, null, { timeout: 8000, polling: 150 }).then((h) => h.jsonValue()).catch(() => null);
}
async function closeCard(P) {
  await P.page.keyboard.press('Escape').catch(() => {});
  await P.page.waitForFunction(() => !document.querySelector('[data-item-card]'), null, { timeout: 5000, polling: 150 }).catch(() => {});
}
const gearTiles = (P) => P.page.evaluate(() => [...document.querySelectorAll('[data-tut="coach-gear"]')].map((n) => {
  const r = n.getBoundingClientRect();
  return { key: n.getAttribute('data-bag-key'), l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
}).filter((t) => t.w > 0));
const coachDone = (P) => P.page.evaluate((ids) => {
  const d = {};
  for (const k of ids) d[k] = true;
  try { localStorage.setItem('bt_coach_v1', JSON.stringify(d)); } catch (e) { /* private mode */ }
}, LESSONS);

export async function run({ browser, wsPort, webPort, rec }) {
  /* ═══ A COMPUTER ═══ */
  const P = await H.newPlayer(browser, { name: 'Deskplace', wsPort, webPort, viewport: DESK });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(2500);
    await H.pastWelcome(P).catch(() => {});
    const col = await rectOf(P, '#root');
    const desk = await P.page.evaluate(() => matchMedia('(pointer:fine)').matches);
    rec.ok('a computer, the game a column between black bars (guard)', desk && !!col && col.l > 100, { desk, col });

    /* ── 1. the "Tap OPEN" ring is on the OPEN button ── */
    const c1 = await waitCoach(P, 'openDash');
    const chip = await rectOf(P, '[data-dash-fold="min"]');
    rec.ok('a new bro is taught to open the dashboard, the band folded (guard)', !!(c1 && c1.id === 'openDash' && chip), { c1, chip });
    if (c1 && c1.ring && chip) {
      const at = await P.page.evaluate(({ x, y }) => {
        const n = document.elementFromPoint(x, y);
        const fold = document.querySelector('[data-dash-fold="min"]');
        return { onChip: !!(n && fold && (fold === n || fold.contains(n))), what: n ? (n.tagName + '.' + (n.className || '')).slice(0, 60) : null };
      }, mid(c1.ring));
      rec.ok('the ring circles the OPEN button, inside the game\'s column, and a click at its middle reaches the button',
        off(c1.ring, chip) < 4 && mid(c1.ring).x > col.l && c1.ring.r <= col.r && at.onChip,
        { ring: c1.ring, chip, off: off(c1.ring, chip), col, at });
      const cardOk = !!c1.card && within(c1.card, col) && c1.card.b <= c1.ring.t + 2
        && mid(chip).x >= c1.card.l && mid(chip).x <= c1.card.r;
      rec.ok('...and its card is in the column, standing over the button', cardOk, { card: c1.card, chip, col });
    }
    await P.page.screenshot({ path: 'tools/qa/mp/out/deskplace-1-open.png' }).catch(() => {});

    /* ── 2. a real click on OPEN answers it ── */
    if (chip) {
      const p = mid(chip);
      await P.page.mouse.click(p.x, p.y);
      const c2 = await waitCoach(P, null, 8000);
      const stillFolded = await rectOf(P, '[data-dash-fold="min"]');
      rec.ok('a mouse click on OPEN opens the band and answers the lesson', !stillFolded && !(c2 && c2.id === 'openDash'), { c2: c2 && c2.id, stillFolded });
    }

    /* ── 3. the gear lesson's ring is on the gear ── */
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
    });
    const c3 = await waitCoach(P, 'equip', 30000);
    const gear = await rectOf(P, '[data-tut="coach-gear"]');
    rec.ok('the gear lesson rings the gear tile in the bag, inside the column',
      !!(c3 && c3.id === 'equip' && c3.ring && gear) && off(c3.ring, gear) < 4 && within(c3.ring, col, 8),
      { c3, gear, off: c3 && c3.ring && gear ? off(c3.ring, gear) : null, col });
    await P.page.screenshot({ path: 'tools/qa/mp/out/deskplace-3-gear.png' }).catch(() => {});

    /* ── 4. the controls tour, from Settings ── */
    await P.page.evaluate(() => window.__btCtlTut && window.__btCtlTut.open());
    await P.page.waitForTimeout(900);
    const seen = [];
    for (let i = 0; i < 8; i++) {
      const s = await P.page.evaluate(() => {
        /* the tour's own layer: the fixed box its "Step N of M" is drawn in */
        const step = [...document.querySelectorAll('div')]
          .find((d) => d.children.length === 0 && /^Step \d+ of \d+$/.test((d.textContent || '').trim()));
        let layer = step;
        while (layer && getComputedStyle(layer).position !== 'fixed') layer = layer.parentElement;
        if (!layer) return null;
        const n = Number((step.textContent.match(/Step (\d+) of (\d+)/) || [])[1]);
        const of = Number((step.textContent.match(/Step (\d+) of (\d+)/) || [])[2]);
        const info = window.__btCtlTutSteps && window.__btCtlTutSteps();
        const key = info && n ? info.live[n - 1] : null;
        const ring = layer.querySelector('svg > [stroke]');
        const rr = ring && ring.getBoundingClientRect();
        const want = info && key ? info.rects[key] : null;
        return { n, of, key, ring: rr && rr.width > 0 ? { l: rr.left, t: rr.top, r: rr.right, b: rr.bottom, w: rr.width, h: rr.height } : null,
          want: want ? { l: want.left, t: want.top, r: want.left + want.width, b: want.top + want.height, w: want.width, h: want.height } : null };
      });
      if (!s || !s.n) break;
      if (s.ring && s.want) seen.push({ key: s.key, off: off(s.ring, s.want), inCol: mid(s.ring).x > col.l && mid(s.ring).x < col.r });
      if (s.ring && s.want && seen.length === 1) await P.page.screenshot({ path: 'tools/qa/mp/out/deskplace-4-tour.png' }).catch(() => {});
      if (s.n >= s.of) break;
      /* tap the card to go on (v2.3.2284) */
      await P.page.evaluate(() => {
        const step = [...document.querySelectorAll('div')]
          .find((d) => d.children.length === 0 && /^Step \d+ of \d+$/.test((d.textContent || '').trim()));
        const card = step && step.closest('div[data-uisfx="click"]');
        if (card) card.click();
      });
      await P.page.waitForTimeout(500);
    }
    rec.ok('the controls tour spotlights at least one control on a computer (guard)', seen.length >= 1, seen.map((x) => x.key));
    rec.ok('...and every spotlight circles its control, in the column',
      seen.length >= 1 && seen.every((x) => x.off < 4 && x.inCol), seen);
    await P.page.evaluate(() => window.__btCtlTut && window.__btCtlTut.close());
    await coachDone(P);   /* nothing of the coach's over what follows */

    /* ── 5. the level-up celebration ── */
    const kbShown = () => P.page.evaluate(() => { const k = document.querySelector('.bt-kb-hints'); return !!k && getComputedStyle(k).display !== 'none'; });
    /* v2.3.3490: drawn in the margin beside the game, the strip covers nothing
       of the column, so it stays up through the celebration */
    const kbInMargin = () => P.page.evaluate(() => {
      const k = document.querySelector('.bt-kb-hints');
      const c = document.getElementById('root').getBoundingClientRect();
      const r = k && getComputedStyle(k).display !== 'none' ? k.getBoundingClientRect() : null;
      return !!(r && k.getAttribute('data-kb-place') === 'side' && r.right <= c.left);
    });
    const kbBefore = await kbShown();
    const b = await burstAt(P);
    const kbDuring = await kbShown();
    const kbMarginDuring = await kbInMargin();
    rec.ok('a level-up shows its medallion and caption (guard)', !!(b && b.icon && b.art && b.cap), b);
    if (b && b.icon && b.art && b.cap) {
      const cx = mid(col).x;
      rec.ok('the celebration\'s medallion is in the middle of the column, its art wholly inside it',
        Math.abs(mid(b.icon).x - cx) < 2 && within(b.art, col, 1), { icon: b.icon, art: b.art, col, dx: Math.round(mid(b.icon).x - cx) });
      rec.ok('...and its caption is inside the column, over the dashboard band',
        within(b.cap, col, 1) && (!b.plate || within(b.plate, col, 1)) && b.cap.b <= col.t + col.h * 0.67 + 1,
        { cap: b.cap, plate: b.plate, col });
    }
    await P.page.screenshot({ path: 'tools/qa/mp/out/deskplace-5-levelup.png' }).catch(() => {});
    await burstEnd(P);
    const kbAfter = await kbShown();
    rec.ok('...the keys strip is never over its caption -- in the margin beside the game, or standing aside while it plays -- and is up after it ends',
      kbBefore && (kbMarginDuring || !kbDuring) && kbAfter, { kbBefore, kbDuring, kbMarginDuring, kbAfter });

    /* ── 6. the bag's item card, beside the tile ── */
    const tiles = await gearTiles(P);
    rec.ok('the bag shows tut_1\'s shield and sword (guard)', tiles.length >= 2, tiles);
    const placed = [];
    for (const tile of tiles.slice(0, 2)) {
      const card = await cardFor(P, tile, false);
      placed.push({ key: tile.key, tile, card, beside: !!card && card.l >= tile.r && card.l - tile.r <= 12 && !overlaps(card, tile), inCol: within(card, col, 1) });
      if (placed.length === 1) await P.page.screenshot({ path: 'tools/qa/mp/out/deskplace-6-card.png' }).catch(() => {});
      await closeCard(P);
    }
    rec.ok('a clicked item\'s card opens beside its tile, inside the column, never over it',
      placed.length >= 2 && placed.every((p) => p.beside && p.inCol), placed);

    /* ── 7. the chat card is the column's width at most ── */
    await P.page.evaluate(() => window.__broChatBubbleBus && window.__broChatBubbleBus.setOpen(true));
    const chat = await P.page.waitForFunction(() => {
      const t = document.querySelector('[data-chat-input]');
      const c = t && t.closest('.bt-chat-noselect');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return r.width > 0 ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null;
    }, null, { timeout: 10000, polling: 200 }).then((h) => h.jsonValue()).catch(() => null);
    rec.ok('the chat card fits inside the column, none of it cut off', !!chat && within(chat, col, 1), { chat, col });
    await P.page.evaluate(() => window.__broChatBubbleBus && window.__broChatBubbleBus.setOpen(false));

    rec.ok('no page errors on the computer', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ═══ A COMPUTER IN THE WHEEL: the minimap's place, and the way back in ═══ */
  const W = await H.newPlayer(browser, { name: 'Deskwheel', wsPort, webPort, viewport: DESK, world: 'wheel' });
  const wErrors = [];
  W.page.on('pageerror', (e) => wErrors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(W);
    await H.waitFor(W, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 150000, label: 'into the Wheel' }).catch(() => null);
    await H.pastWelcome(W).catch(() => {});
    await coachDone(W);
    /* where the minimap is drawn, and where the world map's button over it is */
    const miniNow = () => W.page.evaluate(() => {
      const m = window.__btMinimap, w = window.__btWheelMini;
      const cv = document.querySelector('canvas.brotown-canvas');
      const btn = document.querySelector('[data-world-map-open]');
      const c = cv && cv.getBoundingClientRect();
      const b = btn && btn.getBoundingClientRect();
      return { drawn: m && c ? Math.round(c.left + m.rootX) : null, mini: w ? w.left : null, btn: b && b.width > 0 ? Math.round(b.left) : null };
    });
    const at = (v) => !!v && v.drawn != null && Math.abs(v.mini - v.drawn) <= 2 && v.btn != null && Math.abs(v.btn - v.drawn) <= 2;
    await W.page.waitForFunction(() => !!(window.__btWheelMini && document.querySelector('[data-world-map-open]')), null, { timeout: 30000, polling: 300 }).catch(() => {});
    const m0 = await miniNow();
    rec.ok('in the Wheel the world map\'s button is over the minimap (guard)', at(m0), m0);
    /* a window only narrower: the column moves, the canvas the same size */
    await W.page.setViewportSize({ width: 1100, height: DESK.height });
    await W.page.waitForTimeout(2500);
    const m1 = await miniNow();
    rec.ok('...and after the window is made narrower, still over it (the column moved, its size did not)',
      at(m1) && m0.drawn != null && m1.drawn !== m0.drawn, { before: m0, after: m1 });
    await W.page.setViewportSize(DESK);
    await W.page.waitForTimeout(1500);

    /* the way back in after a reload: its spinner beside the exit arrow */
    await W.page.evaluate(() => { try { sessionStorage.setItem('bt_resume_now', '1'); } catch (e) { /* */ } });
    await W.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    const spin = await W.page.waitForFunction(() => {
      const s = document.querySelector('.bt-rejoin-loading');
      const root = document.getElementById('root');
      if (!s || !root) return null;
      const r = s.getBoundingClientRect(), c = root.getBoundingClientRect();
      return r.width > 0 && c.width > 0 ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, col: { l: c.left, r: c.right, t: c.top, b: c.bottom, w: c.width, h: c.height } } : null;
    }, null, { timeout: 30000, polling: 50 }).then((h) => h.jsonValue()).catch(() => null);
    rec.ok('a reload back into the game shows its spinner beside the exit arrow, in the column (not the black margin)',
      !!spin && Math.abs(spin.l - (spin.col.l + 52)) <= 1 && within(spin, spin.col, 1), spin);
    rec.ok('no page errors in the Wheel', wErrors.length === 0, wErrors.slice(0, 3));
  } finally {
    await W.ctx.close().catch(() => {});
  }

  /* ═══ A PHONE: where they were ═══ */
  const Q = await H.newPlayer(browser, { name: 'Phoneplace', wsPort, webPort, viewport: PHONE, touch: true });
  const qErrors = [];
  Q.page.on('pageerror', (e) => qErrors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(Q);
    await Q.page.waitForTimeout(2500);
    await H.pastWelcome(Q).catch(() => {});
    await coachDone(Q);
    const b = await burstAt(Q);
    rec.ok('on a phone the medallion is in the middle of the screen, the caption across it, as before',
      !!(b && b.icon && b.cap) && Math.abs(mid(b.icon).x - PHONE.width / 2) < 2 && Math.abs(b.cap.l) < 1 && Math.abs(b.cap.w - PHONE.width) < 1,
      b);
    await burstEnd(Q);
    await Q.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
    });
    await Q.page.waitForTimeout(2500);
    if (await rectOf(Q, '[data-dash-fold="min"]')) {
      await Q.page.tap('[data-dash-fold="min"]').catch(() => {});
      await Q.page.waitForTimeout(1200);
    }
    const tiles = await gearTiles(Q);
    const first = tiles.slice().sort((a, c) => a.l - c.l)[0];
    const card = first ? await cardFor(Q, first, true) : null;
    rec.ok('on a phone the first tile\'s card opens right of it, as before',
      !!card && card.l >= first.r && card.l - first.r <= 12 && !overlaps(card, first), { first, card });
    await closeCard(Q);
    rec.ok('no page errors on the phone', qErrors.length === 0, qErrors.slice(0, 3));
  } finally {
    await Q.ctx.close().catch(() => {});
  }
}
