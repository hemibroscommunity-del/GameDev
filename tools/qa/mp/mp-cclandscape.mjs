/* ═══ THE CREATOR HELD SIDEWAYS (v2.3.3216) ═══
 *
 * Owner: "yes make the other fix too".  Found while testing the Codex button
 * sideways (#900): on a phone held sideways the new-character screen put
 * ENTER BRO TOWN below the bottom of the screen, and on a touch screen that
 * screen cannot scroll (`overflow:clip`, v2.3.2394) -- a new player holding
 * the phone sideways could not make a character at all.  Measured on main:
 * ENTER's top at y 783 of a 390px screen (844x390), 704 of 375 (667x375),
 * 742 of 360 (740x360), and 847 of 768 on an iPad (1024x768); the trait
 * picker's tile grid 4-65px tall, not one whole tile.
 *
 * Sideways the creator is now three columns (game.css, v2.3.3216): the
 * character with ENTER and Back under him, the name plate, the picker with
 * its tabs down its left side.  This file holds every claim of that to the
 * screen:
 *   1. at six sideways sizes, every control is on the screen and a tap at its
 *      centre lands on it (elementFromPoint, nothing drawn over it); the name
 *      plate is whole; "Tap to name", "Randomize Bro" and "ENTER BRO TOWN"
 *      are whole; the character is not covered;
 *   2. on all nine trait tabs, at least one whole row of options, nothing in
 *      the picker past its edge, every tab's label whole, and the drawing
 *      card's tools inside the card;
 *   3. with a keyboard up (stubbed: Playwright has none) the name field
 *      clears it;
 *   4. a REAL tap on ENTER BRO TOWN, sideways, takes a new player into the
 *      world -- the thing that could not be done;
 *   5. upright and on a desktop the creator is laid out as before (the
 *      sideways rule does not reach them).
 */
import * as H from './harness.mjs';

const SIDEWAYS = [
  { w: 844, h: 390, tag: '844x390 (iPhone 13/14)' },
  { w: 667, h: 375, tag: '667x375 (iPhone SE)' },
  { w: 740, h: 360, tag: '740x360 (Android)' },
  { w: 932, h: 430, tag: '932x430 (iPhone Pro Max)' },
  { w: 844, h: 340, tag: '844x340 (a shorter screen)' },
  { w: 1024, h: 768, tag: '1024x768 (iPad)' },
];

async function openCreator(P) {
  await P.page.waitForFunction(() => !!(document.querySelector('input.bt-cc-name')
    || document.querySelector('[data-tut="login-create"]')), null, { timeout: 30000 });
  await H.uncoverDoor(P.page);
  if (await P.page.$('[data-tut="login-create"]')) {
    await P.page.click('[data-tut="login-create"]');
    await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  }
  await P.page.waitForTimeout(1200);
}

/* Every control: on the screen, and the element under its centre is it. */
const controls = (P) => P.page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const list = {
    name: q('input.bt-cc-name'), reroll: q('.bt-cc-namewrap .bt-cc-btn'),
    randomize: q('.bt-cc-randomize'), reset: q('.bt-cc-reset'),
    enter: q('button.bt-cc-play'), back: q('.bt-cc-back'),
  };
  const out = { vw: innerWidth, vh: innerHeight, bad: [] };
  for (const [k, el] of Object.entries(list)) {
    if (!el) { out.bad.push(k + ': missing'); continue; }
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    out[k] = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) { out.bad.push(`${k}: off the screen ${JSON.stringify(out[k])}`); continue; }
    const t = document.elementFromPoint(cx, cy);
    if (!(t === el || el.contains(t))) out.bad.push(`${k}: covered by ${t ? (String(t.className) || t.tagName) : 'nothing'}`);
  }
  const plate = q('.bt-cc-cluster').getBoundingClientRect();
  out.plate = { x: Math.round(plate.left), y: Math.round(plate.top), w: Math.round(plate.width), h: Math.round(plate.height),
    inside: plate.top >= -0.5 && plate.bottom <= innerHeight + 0.5 && plate.left >= -0.5 && plate.right <= innerWidth + 0.5 };
  /* "Tap to name" whole: an input's scrollWidth ignores its placeholder, so
     the placeholder is put in as its value for the measurement (the trap
     game.css records at v2.3.2464) and taken straight out again. */
  const inp = list.name;
  const was = inp.value; inp.value = inp.placeholder;
  out.nameWhole = inp.scrollWidth <= inp.clientWidth;
  out.nameFit = { scroll: inp.scrollWidth, client: inp.clientWidth };
  inp.value = was;
  const fits = (el) => !!el && el.scrollWidth <= el.clientWidth + 1;
  out.randomizeWhole = fits(list.randomize);
  out.enterWhole = fits(list.enter);
  const lab = q('.bt-cc-play-label');
  out.enterOneLine = !!lab && lab.getBoundingClientRect().height <= parseFloat(getComputedStyle(lab).fontSize) * 1.6;
  /* The character: the middle of his picture is his body, and it must be the
     stage there, not the plate or ENTER drawn over him. */
  const cv = q('.bt-cc-stage canvas');
  const cr = cv.getBoundingClientRect();
  const bx = cr.left + cr.width / 2, by = cr.top + cr.height * 0.45;
  const under = document.elementFromPoint(bx, by);
  out.broShown = !!under && !!under.closest('.bt-cc-stage') && bx > 0 && bx < innerWidth && by > 0 && by < innerHeight;
  out.broUnder = under ? (String(under.className) || under.tagName) : null;
  out.layout = getComputedStyle(q('.bt-cc-col-left')).display;
  return out;
});

/* One tab's picker: whole tiles, nothing past the panel, the card's tools. */
const tabState = (P) => P.page.evaluate(() => {
  const panel = document.querySelector('.bt-cc-panel');
  const pr = panel.getBoundingClientRect();
  const past = [...panel.children].filter((c) => {
    const cs = getComputedStyle(c);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = c.getBoundingClientRect();
    return r.height > 0 && (r.bottom > pr.bottom + 0.5 || r.right > pr.right + 0.5 || r.top < pr.top - 0.5 || r.left < pr.left - 0.5);
  }).map((c) => String(c.className).split(' ')[0] || c.tagName);
  const strip = document.querySelector('.bt-cc-strip');
  const sr = strip.getBoundingClientRect();
  const tiles = [...strip.children];
  const whole = tiles.filter((t) => { const r = t.getBoundingClientRect(); return r.top >= sr.top - 1 && r.bottom <= sr.bottom + 1 && r.left >= sr.left - 1 && r.right <= sr.right + 1; }).length;
  const top0 = tiles.length ? tiles[0].getBoundingClientRect().top : 0;
  const perRow = tiles.filter((t) => Math.abs(t.getBoundingClientRect().top - top0) < 2).length;
  const card = document.querySelector('.bt-cc-ink');
  let cardOk = true, cardInfo = null;
  if (card) {
    const kr = card.getBoundingClientRect();
    const btns = [...card.querySelectorAll('button')].filter((b) => !b.classList.contains('bt-cc-ink-pane'));
    /* The palette SCROLLS past its two rows (game.css .bt-cc-ink-pal, "past
       the cap it scrolls"), so a colour below them is reached by a flick: for
       a tool inside a scroller it is the scroller's box that must be in the
       card; any other tool must be in the card itself. */
    const scroller = (b) => { for (let e = b.parentElement; e && e !== card; e = e.parentElement) { const o = getComputedStyle(e).overflowY; if (o === 'auto' || o === 'scroll') return e; } return null; };
    const out = (r) => r.right > kr.right + 0.5 || r.bottom > kr.bottom + 0.5 || r.left < kr.left - 0.5 || r.top < kr.top - 0.5;
    const clipped = btns.filter((b) => { const sc = scroller(b); return out((sc || b).getBoundingClientRect()); });
    const pane = card.querySelector('.bt-cc-ink-pane').getBoundingClientRect();
    cardOk = clipped.length === 0 && pane.width >= 40 && pane.height >= 40;
    cardInfo = { w: Math.round(kr.width), h: Math.round(kr.height), tools: btns.length, clipped: clipped.length, pane: [Math.round(pane.width), Math.round(pane.height)] };
  }
  return { past, tiles: tiles.length, whole, perRow, cardOk, cardInfo };
});

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1 and 2: every sideways size, every tab ── */
  const table = [];
  for (const S of SIDEWAYS) {
    const P = await H.newPlayer(browser, { name: 'Sideways', wsPort, webPort,
      viewport: { width: S.w, height: S.h }, touch: true, dpr: 2 });
    await openCreator(P);
    const C = await controls(P);
    table.push({ size: S.tag, enter: C.enter, plate: C.plate });
    rec.ok(`${S.tag}: laid out sideways (guard: the character's column is a grid, "${C.layout}")`, C.layout === 'grid', C);
    rec.ok(`${S.tag}: every control is on the screen and a tap lands on it${C.bad.length ? ' -- ' + C.bad.join('; ') : ''}`,
      C.bad.length === 0, C);
    rec.ok(`${S.tag}: the name plate is whole on the screen (${C.plate.w}x${C.plate.h} at y ${C.plate.y})`, C.plate.inside, C.plate);
    rec.ok(`${S.tag}: "Tap to name" whole (${C.nameFit.scroll} in ${C.nameFit.client})`, C.nameWhole, C.nameFit);
    rec.ok(`${S.tag}: "Randomize Bro" whole, with its icon`, C.randomizeWhole, C.randomize);
    rec.ok(`${S.tag}: "ENTER BRO TOWN" whole, on one line`, C.enterWhole && C.enterOneLine, C.enter);
    rec.ok(`${S.tag}: the character is not covered (under his middle: ${C.broUnder})`, C.broShown, { under: C.broUnder });

    const labels = await P.page.evaluate(() => [...document.querySelectorAll('.bt-cc-tab')].map((b) => (b.textContent || '').trim()));
    const labelsCut = await P.page.evaluate(() => [...document.querySelectorAll('.bt-cc-tab-label')]
      .filter((l) => l.scrollWidth > l.clientWidth + 1).map((l) => l.textContent));
    rec.ok(`${S.tag}: all nine tabs' names whole${labelsCut.length ? ' -- cut: ' + labelsCut.join(', ') : ''}`,
      labels.length === 9 && labelsCut.length === 0, { labels, labelsCut });
    const tabsBad = [];
    for (const lab of labels) {
      await P.page.evaluate((l) => { [...document.querySelectorAll('.bt-cc-tab')].find((x) => (x.textContent || '').trim() === l).click(); }, lab);
      await P.page.waitForTimeout(220);
      /* the second option, so a colour pad and a drawing card have something
         to show (a shirt on, a hair style picked) */
      await P.page.evaluate(() => { const t = document.querySelectorAll('.bt-cc-strip>*'); if (t[1]) t[1].click(); });
      await P.page.waitForTimeout(300);
      const T = await tabState(P);
      const rowWhole = T.whole >= Math.min(T.tiles, T.perRow);
      if (!rowWhole || T.past.length || !T.cardOk) {
        tabsBad.push(`${lab}: ${T.whole}/${T.tiles} whole (${T.perRow} a row)${T.past.length ? ', past the edge: ' + T.past.join(',') : ''}${T.cardOk ? '' : ', card ' + JSON.stringify(T.cardInfo)}`);
      }
    }
    rec.ok(`${S.tag}: on every tab a whole row of options, nothing past the picker's edge, the drawing card's tools inside it${tabsBad.length ? ' -- ' + tabsBad.join('; ') : ''}`,
      tabsBad.length === 0, tabsBad);
    await P.ctx.close();
  }
  console.log('    ' + table.map((t) => `${t.size}: ENTER at y ${t.enter && t.enter.y}, plate ${t.plate.w}x${t.plate.h}`).join('\n    '));

  /* ── 3: the keyboard ── */
  {
    const KB = 200;   /* an iPhone's keyboard sideways, QuickType bar included */
    const stub = `
      (() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const typing = () => { const a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')); };
        try { Object.defineProperty(vv, 'height', { get: () => window.innerHeight - (typing() ? ${KB} : 0), configurable: true }); } catch (e) { return; }
        const kick = () => { try { vv.dispatchEvent(new Event('resize')); } catch (e) {} };
        document.addEventListener('focusin', () => setTimeout(kick, 16), true);
        document.addEventListener('focusout', () => setTimeout(kick, 16), true);
      })();`;
    const P = await H.newPlayer(browser, { name: 'SideKb', wsPort, webPort,
      viewport: { width: 844, height: 390 }, touch: true, dpr: 2, init: stub });
    await openCreator(P);
    await P.page.tap('input.bt-cc-name');
    await P.page.waitForTimeout(700);
    const k = await P.page.evaluate(() => ({
      bottom: Math.round(document.querySelector('input.bt-cc-name').getBoundingClientRect().bottom),
      top: Math.round(document.querySelector('input.bt-cc-name').getBoundingClientRect().top),
      kb: document.querySelector('.bt-cc-col-left').getAttribute('data-kb'),
      gap: Math.round(window.innerHeight - window.visualViewport.height),
    }));
    rec.ok(`keyboard sideways: it came up and the creator reserved room for it (guard: gap ${k.gap}, data-kb ${k.kb})`, k.gap === KB && k.kb === '1', k);
    rec.ok(`keyboard sideways: the name field clears it (${k.top}-${k.bottom} above the line at ${390 - KB})`,
      k.top >= 0 && k.bottom <= 390 - KB, k);
    await P.ctx.close();
  }

  /* ── 4: a new player, sideways, really gets in ── */
  for (const S of [SIDEWAYS[0], SIDEWAYS[1]]) {
    const P = await H.newPlayer(browser, { name: 'SideIn' + S.w, wsPort, webPort,
      viewport: { width: S.w, height: S.h }, touch: true, dpr: 2 });
    await openCreator(P);
    await P.page.fill('input.bt-cc-name', 'Sideways' + S.w);
    await P.page.evaluate(() => { try { document.activeElement && document.activeElement.blur(); } catch (e) {} });
    await P.page.waitForTimeout(300);
    /* A real tap where the button is drawn -- not a click by selector, which
       would forgive a button the screen cannot show. */
    const at = await P.page.evaluate(() => {
      const r = document.querySelector('button.bt-cc-play').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await P.page.touchscreen.tap(at.x, at.y);
    const inWorld = await P.page.waitForFunction(() => {
      const G = window._gameState && window._gameState.current;
      return !!(G && G.myId && G.currentZone);
    }, null, { timeout: 120000, polling: 500 }).then(() => true).catch(() => false);
    rec.ok(`${S.tag}: a tap on ENTER BRO TOWN takes a new player into the world`, inWorld, at);
    await P.ctx.close();
  }

  /* ── 5: upright and desktop are as they were ── */
  for (const U of [{ w: 390, h: 844, touch: true, tag: 'upright 390x844' }, { w: 768, h: 1024, touch: true, tag: 'iPad upright 768x1024' },
    { w: 1000, h: 780, touch: false, tag: 'desktop 1000x780' }]) {
    const P = await H.newPlayer(browser, { name: 'Upright', wsPort, webPort,
      viewport: { width: U.w, height: U.h }, touch: U.touch, dpr: U.touch ? 2 : null });
    await openCreator(P);
    const u = await P.page.evaluate(() => {
      const col = document.querySelector('.bt-cc-col-left');
      const cl = document.querySelector('.bt-cc-cluster');
      return { display: getComputedStyle(col).display, bleed: parseFloat(getComputedStyle(cl).marginLeft),
        tabs: getComputedStyle(document.querySelector('.bt-cc-tabs')).gridTemplateColumns.split(' ').length,
        panel: getComputedStyle(document.querySelector('.bt-cc-panel')).display };
    });
    rec.ok(`${U.tag}: the upright layout (one column, the plate's bleed, three tabs a row)`,
      u.display === 'flex' && u.bleed < 0 && u.tabs === 3 && u.panel === 'flex', u);
    await P.ctx.close();
  }
}
