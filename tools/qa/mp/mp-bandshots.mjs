/* ═══ mp-bandshots (v2.3.4172): THE BAND OPEN ON GEAR AND ON BRO, EVERY SCREEN ═══
 *
 * The one band is the default on every screen (#1410, src/ui/oneBand.js):
 * the band at the bottom, its content centred in [data-band-box] on a
 * computer or tablet (v2.3.4182: min(840 px, the band's width): sheetGeometry
 * BAND_ASSEMBLY_MAX_W; it was min(1200 px, the world's width)), a phone on its side
 * resting folded.  The Gear tab (#1388) is the band at rest; the Bro card
 * (sheet/BroCard.jsx) lays itself out from the box it gets.  This takes the
 * PR's pictures and checks, on each screen:
 *   - opened, the band shows Gear's tab (its bag pane), never the old bag
 *     page;
 *   - Bro shows the card inside the band's box (not wider than it, not
 *     double-padded: its edges within a few px of the box's), CLOSE first in
 *     the row, nothing cut;
 * on a computer at 1280 x 720 and 1920 x 1080 (wide: true), a phone on its
 * side 844 x 390 (opened from the folded band), and upright 390 x 844.
 *
 * v2.3.4172, the owner on #1386: "Make the edge of the dashboard stop at the
 * black bars width" and "Make the weapon icons above the combat stats larger
 * and just reuse the icons used on the 3 primary combat skills".  So also:
 *   - on a computer the band's left and right edges are the world canvas's
 *     (within 1 px), the bar below the band is the page's colour, as the bar
 *     above it is (no band under the bars), and nothing over the world moved
 *     for it: the weapon pill, the keys, the chat bar, the player frame and
 *     the minimap measured with the band at the world's width and again with
 *     the old full-width band forced back, the same boxes;
 *   - upright the band is the screen's full width (no bars); on its side it
 *     keeps the screen's width (game.css: its open band is wider than its
 *     world on purpose);
 *   - (v2.3.4172, the owner: "Move the 3 primary combat skills out of the
 *     gear menu and put them into the bro menu") Bro's middle panel has the
 *     Melee / Bow / Magic tiles (the Gear tab's pictures, /icons/ui/hero/, at
 *     least 36 px) with "Lv N" ABOVE each picture, each at least 44 x 44,
 *     touch-action: manipulation, inside its panel, one picked; a tap (a
 *     mouse click on a computer) on Bow picks the bow's stats and shows its
 *     "N / M XP", and ~4 s later the picture is back, Bow still picked.
 * v2.3.4182, the owner at a computer: "the gray dashboard still exceeds the
 * black bars" and the buttons "should be part of the dashboard assembly the
 * same way it appears on mobile".  So also, at 1280 x 720, 1440 x 900 (no
 * bars: the world fits) and 1920 x 1080: the screen's pixels just outside the
 * world, from the band's top down, are the bars' black; and with Gear, Bro,
 * Quests and More open the nav row's edges are the tab's box's, the box
 * min(--band-max-w, the band) and centred, CLOSE at its left edge and the
 * fifth button at its right.  On a phone the row is as it was (no
 * data-nav-fill).
 * Pictures: tools/qa/mp/out/band-{gear,bro}-{desk,desk1080,side,up}.png
 * (docs/shots/ has them on 256 colours).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/* v2.3.4172: the band's edges against the world's, the bars' colour, and the
   world's own furniture (to show none of it moved) */
const OLD_BAND_CSS = 'html.bt-one-band:not(.bt-band-side) body .bt-dashboard{left:var(--world-pad-l,0px)!important;right:var(--world-pad-r,0px)!important}';
const edges = (P) => P.page.evaluate(() => {
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null; return { l: Math.round(r.left * 10) / 10, r: Math.round(r.right * 10) / 10, t: Math.round(r.top * 10) / 10, b: Math.round(r.bottom * 10) / 10 }; };
  const dash = document.querySelector('.bt-dashboard');
  const canvas = document.querySelector('.brotown-wrap canvas');
  const d = box(dash), c = box(canvas);
  /* the colour a point shows: the first thing under it with a background
     (the page's own colour if nothing else paints there) */
  const paint = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      if ((bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg)) || (cs.backgroundImage && cs.backgroundImage !== 'none') || el.tagName === 'CANVAS') {
        return { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 40), bg, inBand: !!el.closest('.bt-dashboard') };
      }
    }
    return { tag: 'none', bg: null, inBand: false };
  };
  const barL = c ? c.l : 0;
  const m = window.__btWheelMini;
  const hud = {
    pill: box(document.querySelector('[data-weapon-pill]')),
    pf: box(document.querySelector('.bt-pf')),
    kb: box(document.querySelector('.bt-kb-chip')),
    keys: box(document.querySelector('.bt-kb-hints')),
    chat: box(document.querySelector('[data-chat-input]')),
    mini: m ? { l: Math.round(m.left), t: Math.round(m.top), w: Math.round(m.w), h: Math.round(m.h) } : null,
    canvas: c,
  };
  return {
    vw: innerWidth, vh: innerHeight, dash: d, canvas: c, barL,
    worldX: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--world-x')) || 0,
    below: barL >= 4 && d ? paint(barL / 2, Math.min(innerHeight - 4, d.t + 40)) : null,
    /* halfway down the world: the top bar's strip (and a banner over it) is not the bars */
    above: barL >= 4 && c && d ? paint(barL / 2, Math.round((Math.max(0, c.t) + d.t) / 2)) : null,
    hud,
  };
});

/* v2.3.4172: Bro's three combat-skill tiles (SkillTiles.jsx): each one's
   picture, its "Lv N" (above the picture?), its box, picked, its XP words */
const skillTiles = (P) => P.page.evaluate(() => [...document.querySelectorAll('[data-bro-skill]')].map((b) => {
  const r = b.getBoundingClientRect(); const img = b.querySelector('img'); const ir = img ? img.getBoundingClientRect() : null;
  const lv = [...b.querySelectorAll('span')].find((x) => /^Lv \d+$/.test((x.textContent || '').trim()));
  const lr = lv ? lv.getBoundingClientRect() : null;
  const num = b.querySelector('[data-skill-xpnum]');
  return { k: b.getAttribute('data-bro-skill'), w: Math.round(r.width), h: Math.round(r.height), src: img ? img.getAttribute('src') : null,
    iw: ir ? Math.round(ir.width) : 0, ih: ir ? Math.round(ir.height) : 0, lvAbove: !!lr && !!ir && lr.bottom <= ir.top + 1,
    on: b.getAttribute('aria-pressed') === 'true', ta: getComputedStyle(b).touchAction,
    xp: b.hasAttribute('data-bro-xpopen'), xpText: num ? (num.textContent || '').replace(/\s+/g, ' ').trim() : null,
    inPanel: (() => { const p = b.closest('[data-bro-panel]'); if (!p) return false; const pr = p.getBoundingClientRect(); return r.left >= pr.left - 1 && r.right <= pr.right + 1; })() };
}));

const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `${name}.png`) }); } catch (e) { /* a picture only */ } };

/* ═══ v2.3.4182: NO GRAY PAST THE BARS, AND ONE ASSEMBLY ═══
   The owner, at a computer: "I noticed the gray dashboard still exceeds the
   black bars that I wanted fixed.  Also look at where the dashboard buttons
   are relative to the content area.  They're all shifted to the left.  They
   should be part of the dashboard assembly the same way it appears on
   mobile".  Two reads:
     - the screen's own PIXELS just outside the world's left and right edges,
       from the band's top to the screen's bottom: every one the bars' black
       (#070D11, within a few levels), so no part of the band -- a child, a
       shadow, a corner, a pseudo-element -- is drawn past the world;
     - the nav row's edges against the open tab's box ([data-band-box]: the
       resting columns for Gear, the page for Bro, Quests and More): the same
       two edges, the box min(--band-max-w, the band's width) and centred in
       the band, CLOSE at its left edge and the fifth button at its right. */
const barPixels = async (P) => {
  const g = await P.page.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    const c = document.querySelector('.brotown-wrap canvas'); const d = document.querySelector('.bt-dashboard');
    return c && d ? { c: r(c), d: r(d), vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio } : null;
  });
  if (!g || g.c.l < 4) return { bars: false, g };
  const png = await P.page.screenshot();
  const res = await P.page.evaluate(async ({ b64, g }) => {
    const im = new Image();
    await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
    const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
    const k = im.width / g.vw;
    const bar = Math.min(g.c.l, g.vw - g.c.r);
    const xs = [g.c.l - 1.5, g.c.l - Math.min(8, bar / 2), 1, g.c.r + 1, g.c.r + Math.min(8, bar / 2), g.vw - 1.5];
    let n = 0; const bad = [];
    for (const x of xs) for (let y = Math.max(0, g.d.t - 16); y < g.vh - 1; y += 3) {
      const px = cx.getImageData(Math.floor(x * k), Math.floor(y * k), 1, 1).data;
      n += 1;
      /* the bars' #070D11 (7, 13, 17), a few levels either way */
      if (Math.abs(px[0] - 7) > 8 || Math.abs(px[1] - 13) > 8 || Math.abs(px[2] - 17) > 8) bad.push([Math.round(x), Math.round(y), px[0], px[1], px[2]]);
    }
    return { n, bad: bad.slice(0, 6), nBad: bad.length };
  }, { b64: png.toString('base64'), g });
  return { bars: true, g, ...res };
};

const assemblyBoxes = (P) => P.page.evaluate(() => {
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); if (b.width < 1 || b.height < 1) return null; return { l: Math.round(b.left * 10) / 10, r: Math.round(b.right * 10) / 10, w: Math.round(b.width * 10) / 10 }; };
  const dash = r(document.querySelector('.bt-dashboard'));
  const nav = r(document.querySelector('[data-band-box="nav"]'));
  const page = r(document.querySelector('[data-band-box="page"]'));
  const cols = r(document.querySelector('[data-band-box="cols"]'));
  const close = r(document.querySelector('[data-dash-close]'));
  const btns = [...document.querySelectorAll('[data-band-box="nav"] [data-nav]')].map(r).filter(Boolean);
  const maxW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--band-max-w')) || 0;
  const b = window.__broDashPanelBus;
  return { dash, nav, page, cols, close, first: btns[0] || null, last: btns[btns.length - 1] || null, n: btns.length, maxW,
    words: (document.querySelector('[data-band-box="nav"] .bt-navrail') || { getAttribute: () => null }).getAttribute('data-nav-words'),
    mode: b && b.state.mode, cur: b && b.current && b.current() };
});

/* one tab open: the nav row and that tab's box are one centred block */
async function assembly(P, tag, tab, rec) {
  if (tab === 'gear') {
    await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* no band */ } });
    await P.page.waitForTimeout(500);
    await H.unfoldBand(P).catch(() => {});
  } else {
    await P.page.evaluate((t) => { if (t === 'hero') { try { window.__btHeroSection.request('Card'); } catch (e) { /* older card */ } } window.__broDashPanelBus.open(t); }, tab);
  }
  await P.page.waitForTimeout(1200);
  const a = await assemblyBoxes(P);
  const box = tab === 'gear' ? a.cols : a.page;
  const want = a.dash ? Math.min(a.maxW, a.dash.w) : 0;
  const ok = !!a.nav && !!box && !!a.dash && !!a.close && !!a.last && a.n === 5 && a.maxW > 0
    && Math.abs(a.nav.l - box.l) <= 1 && Math.abs(a.nav.r - box.r) <= 1
    && Math.abs(box.w - want) <= 1
    && Math.abs((box.l - a.dash.l) - (a.dash.r - box.r)) <= 1
    && a.close.l - box.l <= 6 && box.r - a.last.r <= 10;
  rec.ok(`${tag}: ${tab} open -- the nav row and the tab are one centred block (nav ${a.nav && a.nav.l}..${a.nav && a.nav.r}, ${tab === 'gear' ? 'columns' : 'page'} ${box && box.l}..${box && box.r}, ${box && box.w} px = min(${a.maxW}, band ${a.dash && a.dash.w}); CLOSE at ${a.close && a.close.l}, the fifth button ends ${a.last && a.last.r})`, ok, a);
  return a;
}

const look = (P) => P.page.evaluate(() => {
  const vis = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), t: Math.round(r.top), h: Math.round(r.height) }; };
  const page = document.querySelector('[data-band-box="page"]');
  const card = document.querySelector('[data-bro-card="v2"]');
  const close = document.querySelector('[data-dash-close]');
  const rail = [...document.querySelectorAll('.bt-navrail')].find(vis);
  const first = rail && rail.querySelector('[data-nav]');
  const cut = [];
  if (card) for (const el of card.querySelectorAll('*')) {
    if (el.children.length || !(el.textContent || '').trim() || el.clientWidth <= 0) continue;
    if (el.scrollWidth > el.clientWidth + 1) cut.push((el.textContent || '').trim().slice(0, 20));
  }
  const b = window.__broDashPanelBus;
  return {
    vw: innerWidth, vh: innerHeight,
    oneBand: document.documentElement.classList.contains('bt-one-band'),
    mode: b && b.state.mode, stack: b && b.state.stack.slice(),
    gear: vis(document.querySelector('[data-gear-pane="inv"]')),
    /* the old bag page is the 'bag' / 'inventory' destination opened */
    oldBag: !!b && b.state.mode === 'expanded' && ['bag', 'inventory'].includes(b.current()),
    page: box(page), card: box(card), cols: card ? Number(card.getAttribute('data-bro-cols')) : null,
    close: close && vis(close) ? { ...box(close), text: (close.textContent || '').trim() } : null,
    first: first ? { id: first.getAttribute('data-nav'), ...box(first) } : null,
    words: rail ? rail.getAttribute('data-nav-words') : null,
    cut,
  };
});

/* v2.3.4172: on a computer, the band at rest: its edges are the world's, the
   bars run black to the bottom, and nothing over the world moved for it */
async function deskEdges(D, tag, rec, bars = true) {
  await D.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* no band */ } });
  await D.page.waitForTimeout(600);
  await H.unfoldBand(D).catch(() => {});
  await D.page.waitForTimeout(1200);
  const e = await edges(D);
  rec.ok(`${tag}: the band stops where the bars begin (band ${e.dash && e.dash.l}..${e.dash && e.dash.r}, world ${e.canvas && e.canvas.l}..${e.canvas && e.canvas.r}, ${e.vw} px wide)`,
    !!e.dash && !!e.canvas && (bars ? e.canvas.l >= 4 : true) && Math.abs(e.dash.l - e.canvas.l) <= 1 && Math.abs(e.dash.r - e.canvas.r) <= 1, e);
  /* v2.3.4182: a screen whose world fits (1440 x 900: 657 px of world is
     wider than 2.2 : 1 allows only past 1445) has no bars to look under */
  if (bars) rec.ok(`${tag}: under the band the bar is the page's colour, as above it (below ${e.below && e.below.tag} ${e.below && e.below.bg}, above ${e.above && e.above.tag} ${e.above && e.above.bg})`,
    !!e.below && !!e.above && !e.below.inBand && e.below.tag !== 'canvas' && e.below.bg === e.above.bg, { below: e.below, above: e.above });
  /* v2.3.4182: the screen's own pixels past the world's edges, the band's
     height to the bottom: the bars' black, never the band's gray */
  const px = await barPixels(D);
  rec.ok(`${tag}: no gray past the world's edges (${px.bars ? `${px.n} pixels sampled outside ${px.g.c.l}..${px.g.c.r} from y ${Math.round(px.g.d.t) - 16}, ${px.nBad} not the bars' black` : `no bars at ${px.g && px.g.vw} x ${px.g && px.g.vh}: the world is the screen's width`})`,
    !px.bars ? (!!px.g && Math.abs(px.g.c.l) <= 1 && Math.abs(px.g.d.l) <= 1 && Math.abs(px.g.d.r - px.g.vw) <= 1) : px.nBad === 0, px);
  /* the old full-width band forced back for a moment: the world's furniture
     must be where it is now */
  await D.page.evaluate((css) => { const st = document.createElement('style'); st.id = 'qa-old-band'; st.textContent = css; document.head.appendChild(st); }, OLD_BAND_CSS);
  await D.page.waitForTimeout(1200);
  const o = await edges(D);
  /* v2.3.4182: ...and the pixel read sees that old band's gray past the
     world (so its "none" above is a reading, not a blind spot) */
  if (bars) {
    const pxOld = await barPixels(D);
    rec.ok(`${tag}: the pixel read does see a band drawn past the bars (the old full-width band: ${pxOld.nBad} of ${pxOld.n} not black)`, pxOld.bars && pxOld.nBad > 20, { bad: pxOld.bad });
  }
  await D.page.evaluate(() => { const st = document.getElementById('qa-old-band'); if (st) st.remove(); });
  await D.page.waitForTimeout(1200);
  const moved = Object.keys(e.hud).filter((k) => JSON.stringify(e.hud[k]) !== JSON.stringify(o.hud[k]));
  const seen = Object.keys(e.hud).filter((k) => e.hud[k]);
  rec.ok(`${tag}: nothing over the world moved for it (the old full-width band was ${o.dash && o.dash.l}..${o.dash && o.dash.r}; measured: ${seen.join(', ')}; moved: ${moved.join(', ') || 'none'})`,
    /* v2.3.4182: not the player frame -- main's #1422 (v2.3.4163) took it off the game screen */
    !!o.dash && Math.abs(o.dash.l) <= 1 && moved.length === 0 && seen.includes('pill') && seen.includes('mini'), { now: e.hud, old: o.hud });
  await shot(D, `band-edge-${tag}`);
}

async function both(P, tag, rec) {
  /* Gear: the band at rest, unfolded (a phone on its side rests folded) */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* no band */ } });
  await P.page.waitForTimeout(600);
  await H.unfoldBand(P).catch(() => {});
  await P.page.waitForTimeout(1200);
  const g = await look(P);
  rec.ok(`${tag}: the band open at rest shows the Gear tab (its bag pane), not the old bag page`, g.gear && !g.oldBag, g);
  await shot(P, `band-gear-${tag}`);
  /* Bro */
  await P.page.evaluate(() => { window.__btHeroSection.request('Card'); window.__broDashPanelBus.open('hero'); });
  await P.page.waitForTimeout(1600);
  const b = await look(P);
  const inBox = !!b.card && !!b.page && b.card.l >= b.page.l - 1 && b.card.r <= b.page.r + 1 && (b.page.w - b.card.w) <= 16;
  rec.ok(`${tag}: Bro's card fills the band's box and no more (card ${b.card && b.card.w} px in a ${b.page && b.page.w} px box at ${b.vw} px; ${b.cols} columns), nothing cut`,
    b.mode === 'expanded' && inBox && b.cut.length === 0, b);
  rec.ok(`${tag}: CLOSE first in the row ("${b.close && b.close.text}"), then the five (words: ${b.words})`,
    !!b.close && b.close.text === 'CLOSE' && !!b.first && b.first.id === 'dashboard' && b.close.r <= b.first.l, { close: b.close, first: b.first });
  /* v2.3.4172: the owner on #1386, "Move the 3 primary combat skills out of
     the gear menu and put them into the bro menu": Melee / Bow / Magic over
     the stats, "Lv N" above each big picture, the weapon out's gold */
  const ws = await skillTiles(P);
  rec.ok(`${tag}: the three combat skills over the stats, "Lv N" above each big picture (${ws.map((w) => `${w.k} ${w.iw}px in ${w.w}x${w.h}`).join(', ')}), one picked`,
    ws.map((w) => w.k).join() === 'sword,bow,staff' && ws.every((w) => /\/icons\/ui\/hero\/(melee|bow|magic)\.webp/.test(w.src || '') && w.iw >= 36 && w.ih >= 36
      && w.lvAbove && w.w >= 44 && w.h >= 44 && w.ta === 'manipulation' && w.inPanel && !w.xp) && ws.filter((w) => w.on).length === 1, ws);
  await shot(P, `band-bro-${tag}`);
  /* a tap (a click on a computer) on Bow: its stats, and its XP for ~4 s */
  const desk = !(await P.page.evaluate(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0));
  if (desk) await P.page.click('[data-bro-skill="bow"]').catch(() => {});
  else await P.page.tap('[data-bro-skill="bow"]').catch(() => {});
  await P.page.waitForTimeout(600);
  const t1 = await skillTiles(P);
  const w1 = await P.page.evaluate(() => { const s = document.querySelector('[data-bro-panel="stats"]'); return s ? s.getAttribute('data-bro-weapon') : null; });
  const bw = t1.find((w) => w.k === 'bow') || {};
  rec.ok(`${tag}: a ${desk ? 'click' : 'tap'} on Bow picks the bow's stats and shows its XP ("${bw.xpText}")`,
    w1 === 'bow' && bw.on && bw.xp && /^[\d,.K]+ \/ [\d,.K]+ XP$|^Fully levelled$/.test(bw.xpText || '') && t1.filter((w) => w.on).length === 1 && bw.inPanel, { weapon: w1, tiles: t1 });
  await P.page.waitForTimeout(4000);
  const t2 = await skillTiles(P);
  const bw2 = t2.find((w) => w.k === 'bow') || {};
  rec.ok(`${tag}: ...and ~4 s later its picture again, Bow still picked`, !bw2.xp && bw2.iw >= 36 && bw2.on, bw2);
  return b;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const errs = [];
  /* a computer, 1280 x 720 then 1920 x 1080 */
  let stopD = () => {};
  const D = await H.newPlayer(browser, { name: 'Bandbro', wsPort, webPort, viewport: { width: 1280, height: 720 }, world: 'wheel', wide: true });
  D.page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  try {
    await H.enterWorld(D);
    stopD = H.keepAlive(D);   /* two quiet minutes log the page out */
    await D.page.waitForTimeout(2500);
    await H.closeNpcDialogue(D).catch(() => {});
    const id = await H.readState(D, (S) => S.myId);
    await H.devOp(wsPort, 'kit', id, { what: 'all' }).catch(() => null);
    await D.page.waitForTimeout(2500);
    await H.equipWeapon(D, 'greatsword', 'weapon', 'melee').catch(() => null);
    await D.page.waitForTimeout(1500);
    await deskEdges(D, 'desk', rec);
    for (const t of ['gear', 'hero', 'quests', 'more']) await assembly(D, 'desk', t, rec);
    const d = await both(D, 'desk', rec);
    rec.ok(`desk: the one band (the default) and its panels side by side in its centred box (v2.3.4243: 480 px, a big phone's width, so Bro keeps two columns)`, d.oneBand && d.cols >= 2, { oneBand: d.oneBand, cols: d.cols });
    /* v2.3.4182: a 1440 x 900 window (the world fits: no bars) */
    await D.page.setViewportSize({ width: 1440, height: 900 });
    await D.page.waitForTimeout(2000);
    await deskEdges(D, 'desk900', rec, false);
    for (const t of ['gear', 'hero', 'quests', 'more']) await assembly(D, 'desk900', t, rec);
    await D.page.setViewportSize({ width: 1920, height: 1080 });
    await D.page.waitForTimeout(2000);
    await deskEdges(D, 'desk1080', rec);
    for (const t of ['gear', 'hero', 'quests', 'more']) await assembly(D, 'desk1080', t, rec);
    const d2 = await both(D, 'desk1080', rec);
    /* v2.3.4182: the block is sheetGeometry's BAND_ASSEMBLY_MAX_W (was min(1200, the world)) */
    rec.ok(`desk1080: the box stays centred and capped (${d2.page && d2.page.w} px of 1920, left ${d2.page && d2.page.l})`,
      !!d2.page && d2.page.w <= 840 && Math.abs((d2.page.l + d2.page.r) / 2 - 960) <= 1, d2.page);
  } finally {
    stopD();
    await D.page.context().close().catch(() => {});
  }

  /* a phone on its side, then upright */
  for (const [tag, vp] of [['side', { width: 844, height: 390 }], ['up', { width: 390, height: 844 }]]) {
    const P = await H.newPlayer(browser, { name: tag === 'side' ? 'Sidebro' : 'Upbro', wsPort, webPort, viewport: vp, touch: true, dpr: 2, world: 'wheel' });
    P.page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
    try {
      await H.enterWorld(P);
      const stopP = H.keepAlive(P);
      P.stopKeep = stopP;
      await P.page.waitForTimeout(2500);
      await H.closeNpcDialogue(P).catch(() => {});
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'kit', id, { what: 'all' }).catch(() => null);
      await P.page.waitForTimeout(2500);
      await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
      await P.page.waitForTimeout(1500);
      /* v2.3.4172: upright the band is the screen's width (no bars); on its
         side, open, it keeps the screen's width (game.css: on purpose) */
      await H.unfoldBand(P).catch(() => {});
      await P.page.waitForTimeout(1000);
      const e = await edges(P);
      rec.ok(`${tag}: the band spans the screen (${e.dash && e.dash.l}..${e.dash && e.dash.r} of ${e.vw} px; world ${e.canvas && e.canvas.l}..${e.canvas && e.canvas.r})`,
        !!e.dash && Math.abs(e.dash.l) <= 1 && Math.abs(e.dash.r - e.vw) <= 1, e);
      /* v2.3.4182: a phone's row is the derivation's own, not the filled block */
      const fill = await P.page.evaluate(() => !!document.querySelector('[data-nav-fill]'));
      rec.ok(`${tag}: the nav row is a phone's (not filled to a block)`, !fill, { fill });
      const b = await both(P, tag, rec);
      if (tag === 'side') rec.ok(`side: the card at ${b.card && b.card.w} px is ${b.cols} columns (from its own width)`, b.cols === 3, { cols: b.cols });
      else rec.ok(`up: the card at ${b.card && b.card.w} px is 2 columns (you | the doors, the stats under them)`, b.cols === 2, { cols: b.cols });
    } finally {
      if (P.stopKeep) P.stopKeep();
      await P.page.context().close().catch(() => {});
    }
  }
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
}
