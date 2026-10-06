/* ═══ THE INSIDE OF EACH BUILDING, ON A PHONE (v2.3.3109) ═══
 *
 * Owner, 2026-10-06: sent seventeen pictures of the inside of BroTown's
 * buildings and said "Ok wire these up".  One real player against a real
 * worker, in the Wheel's Brotown, on a phone (390 x 844, touch):
 *   1. standing at a door decodes THAT room's picture (and no other), and
 *      the first door starts the rest coming (src/game/buildingRooms.js);
 *   2. each of the fifteen windows -- the twelve buildings and the three
 *      halls -- opens with its own room at the top of the card: the picture
 *      loaded at 1152 x 768, flush with the card's edges, 3:2 (the forge's a
 *      slim 4:1 band), the panel starting exactly where it ends with square
 *      top corners, the close button on top of it;
 *   3. the Auction House's clerk is drawn into his room, inside it, centred on
 *      the lectern;
 *   4. the Land Office's window (it was a separate dialog under an empty card
 *      until v2.3.3109) is a panel in the card like the others, under its
 *      room, and "Travel to Farm" can be reached by a finger;
 *   5. the Market (a screen of its own, reached from a window) has no room;
 *   6. a shorter phone holds the picture to 30vh, a sideways one drops it, and
 *      a picture that cannot be loaded leaves the window as it was;
 *   7. walking away lets the held picture go; all fifteen were asked for; no
 *      page errors.
 * Pictures: tools/qa/mp/out/buildingrooms-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const R = await import(H.REPO + '/src/data/buildingRooms.js');
  const { TOWN_BUILDINGS } = await import(H.REPO + '/src/data/buildings.js');
  const actionOf = Object.fromEntries(TOWN_BUILDINGS.map((b, i) => [i, b.action || b.id]));

  const P = await H.newPlayer(browser, { name: 'Roomer', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `buildingrooms-${name}.png`) }).catch(() => {});
  /* which pictures the page asked the NETWORK for (the resource-timing buffer holds 250 entries and the game fills it) */
  const asked = [];
  P.page.on('request', (req) => { const m = /\/world\/interiors\/([a-z]+)\.webp\?v=([0-9.]+)/.exec(req.url()); if (m) asked.push({ id: m[1], v: m[2] }); });
  await H.enterWorld(P);
  const zoneNow = () => H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
  const waitZone = async (pred, ms = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const z = await zoneNow();
      if (z && pred(z)) return z;
      await P.page.waitForTimeout(400);
    }
    return await zoneNow();
  };
  const z0 = await waitZone((z) => z === 'wheel');
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id);
  await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
  await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();

  const standAt = async (x, bootsY) => {
    for (let k = 0; k < 4; k++) {
      const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
      await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
      await P.page.waitForTimeout(800);
      const g = await P.page.evaluate(() => window.__btPlayerGround());
      if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
    }
    return false;
  };
  const enterBtn = () => P.page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || ''));
    return { at: window.__btWheelTownDoors.at(), btn: b ? (b.textContent || '').trim() : null };
  });
  const settle = async (want, ms = 4000) => {
    let r = null;
    for (let t0 = Date.now(); Date.now() - t0 < ms;) {
      r = await enterBtn();
      if (want(r)) return r;
      await P.page.waitForTimeout(250);
    }
    return r;
  };
  const panelKey = () => P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-card'); return c ? c.getAttribute('data-building-panel') : null; });
  const closePanel = async () => {
    await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
    await P.page.waitForTimeout(350);
  };
  const tapEnter = () => P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });

  /* what the window shows of its room, in numbers */
  const measure = () => P.page.evaluate(() => {
    const card = document.querySelector('.bt-inspect-card');
    const room = card && card.querySelector(':scope > .bt-room');
    if (!room) return { room: null, card: !!card };
    const box = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height });
    const cr = card.getBoundingClientRect(), rr = room.getBoundingClientRect();
    const img = room.querySelector('img');
    const panel = room.nextElementSibling;
    const close = card.querySelector('.bt-inspect-close');
    const xr = close.getBoundingClientRect();
    const hit = document.elementFromPoint(xr.left + xr.width / 2, xr.top + xr.height / 2);
    const describe = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const up = [];
      for (let e = el; e && e !== document.body && up.length < 4; e = e.parentElement) up.push((e.tagName + (e.id ? '#' + e.id : '') + '.' + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).split(' ').slice(0, 2).join('.')).slice(0, 60));
      return { path: up.join(' < '), z: cs.zIndex, pos: cs.position, bg: cs.backgroundColor, op: cs.opacity };
    };
    const keeper = room.querySelector('.bt-room-keeper');
    const kr = keeper ? keeper.getBoundingClientRect() : null;
    return {
      id: room.getAttribute('data-room'), state: room.getAttribute('data-room-state'), shape: room.getAttribute('data-shape'),
      nat: [img.naturalWidth, img.naturalHeight], complete: img.complete, cardKey: card.getAttribute('data-building-panel'), cardRoom: card.getAttribute('data-room'),
      card: box(cr), room: box(rr), vh: innerHeight, vw: innerWidth,
      panelTop: panel ? panel.getBoundingClientRect().top : null, panelRadius: panel ? getComputedStyle(panel).borderTopLeftRadius : null,
      closeOnTop: !!hit && (hit === close || close.contains(hit)), coverer: !!hit && (hit === close || close.contains(hit)) ? null : describe(hit), closeBox: box(xr), closeInRoom: xr.left >= rr.left && xr.right <= rr.right && xr.top >= rr.top && xr.bottom <= rr.bottom,
      keeper: kr ? { box: box(kr), anim: getComputedStyle(keeper).animationName, key: keeper.getAttribute('data-keeper'), bg: getComputedStyle(keeper).backgroundImage.slice(0, 80) } : null,
      display: getComputedStyle(room).display,
    };
  });
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  /* is the picture flush with the card, the right shape, and the panel starting where it ends */
  const sits = (m) => {
    if (!m || !m.room) return false;
    const w = m.room.w;
    const wantH = m.shape === 'band' ? w / 4 : Math.min(w * 2 / 3, 0.30 * m.vh);
    return near(m.room.l - m.card.l, 1, 1.5) && near(m.card.r - m.room.r, 1, 1.5) && near(m.room.t - m.card.t, 1, 1.5)
      && near(m.room.h, wantH, 1.5) && near(m.panelTop, m.room.b, 1) && m.panelRadius === '0px';
  };

  /* ── the doors ── */
  let doors = [];
  for (let i = 0; i < 40 && doors.length < 17; i++) {
    doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
    if (doors.length < 17) await P.page.waitForTimeout(500);
  }
  const byId = Object.fromEntries(doors.map((d) => [d.id, d]));
  const windows = doors.filter((d) => d.index >= 0 || d.hall);
  const warmBefore = await P.page.evaluate(() => ({ held: window.__btRoomWarm.held(), pre: window.__btRoomWarm.prefetched() }));
  rec.ok(`on a phone in the Wheel's Brotown: ${windows.length} doors open a window, and before the first door nothing is decoded or prefetched`,
    z0 === 'wheel' && doors.length === 17 && windows.length === 15 && warmBefore.held === null && warmBefore.pre === false, { z0, n: doors.length, windows: windows.length, warmBefore });

  /* ── 1 + 2. each window ── */
  const bad = [], warmBad = [], seen = [];
  let roomOfAuction = null, landOffice = null;
  const only = (process.env.QA_ROOMS_ONLY || '').split(',').filter(Boolean);   /* e.g. QA_ROOMS_ONLY=gambling,bank for a fast look */
  const order = only.length ? windows.filter((d) => only.includes(d.id)) : windows;
  for (const d of order) {
    const okStand = await standAt(d.x, d.y + 30);
    const r = await settle((q) => q.at === d.id && q.btn);
    const want = d.hall ? d.hall : actionOf[d.index];
    const warm = await P.page.evaluate(() => ({ held: window.__btRoomWarm.held(), pre: window.__btRoomWarm.prefetched() }));
    if (warm.held !== R.roomIdFor(want)) warmBad.push([d.id, warm]);
    await tapEnter();
    let key = null;
    for (let i = 0; i < 12 && !key; i++) { await P.page.waitForTimeout(250); key = await panelKey(); }
    let m = null;
    for (let i = 0; i < 24; i++) {
      m = await measure();
      if (m && m.room && m.state === 'ready') break;
      await P.page.waitForTimeout(250);
    }
    await P.page.waitForTimeout(300);   /* the fade */
    await shot('open-' + d.id);
    const wantShape = R.isBandRoom(want) ? 'band' : 'room';
    const good = okStand && r && r.btn && key === want && m && m.id === R.roomIdFor(want) && m.cardKey === want && m.cardRoom === m.id && m.state === 'ready'
      && m.complete && m.nat[0] === R.ROOM_W && m.nat[1] === R.ROOM_H && m.shape === wantShape && sits(m) && m.closeOnTop && m.closeInRoom;
    seen.push({ id: d.id, key, h: m && m.room ? Math.round(m.room.h) : null, w: m && m.room ? Math.round(m.room.w) : null, shape: m && m.shape });
    if (d.id === 'auction') roomOfAuction = m;
    if (d.id === 'landoffice') {
      landOffice = await P.page.evaluate(() => {
        const card = document.querySelector('.bt-inspect-card');
        const travel = card && Array.from(card.querySelectorAll('button')).find((q) => /Travel to Farm/.test(q.textContent || ''));
        const r = travel ? travel.getBoundingClientRect() : null;
        const hit = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
        return { rooms: document.querySelectorAll('.bt-room').length, cards: document.querySelectorAll('.bt-inspect-card').length, panel: !!(card && card.querySelector('[data-land-office]')),
          loose: Array.from(document.querySelectorAll('button')).filter((q) => /Travel to Farm/.test(q.textContent || '') && !(card && card.contains(q))).length,
          travel: r ? { b: r.bottom, w: r.width } : null, reachable: !!hit && (hit === travel || travel.contains(hit)), vh: innerHeight };
      });
    }
    if (!good) bad.push({ id: d.id, okStand, r, key, want, m });
    await closePanel();
    const gone = await P.page.evaluate(() => !document.querySelector('.bt-inspect-card'));
    if (!gone) bad.push({ id: d.id, closed: false });
  }
  rec.ok(`standing at a door decodes its own room's picture and no other (${order.length} doors${warmBad.length ? ', WRONG: ' + JSON.stringify(warmBad) : ''}), and the first door starts the rest coming`,
    order.length === (only.length || 15) && warmBad.length === 0 && (await P.page.evaluate(() => window.__btRoomWarm.prefetched())) === true, { warmBad });
  rec.ok(`each window opens with its own room at the top of the card: ${seen.map((s) => s.id + ' ' + s.w + 'x' + s.h + (s.shape === 'band' ? ' band' : '')).join(', ')} -- 1152 x 768 loaded, flush with the card, 3:2 (the forge's 4:1 band), the panel starting where it ends with square top corners, the close button on top of it`,
    bad.length === 0 && seen.length === (only.length || 15), bad);

  /* ── 3. the clerk ── */
  const kk = roomOfAuction && roomOfAuction.keeper;
  const kb = kk && kk.box, rb = roomOfAuction && roomOfAuction.room;
  if (roomOfAuction) rec.ok(`the Auction House's clerk is drawn into his room, inside it, his cell centred on the lectern (${kb && rb ? Math.round(((kb.l + kb.r) / 2 - rb.l) / rb.w * 100) : '?'}% across), his strip's frames side by side and the blink-and-smile loop running`,
    !!kk && kk.key === 'auction' && kk.anim === 'bt-room-keeper-idle' && /storekeeper-bro-idle/.test(kk.bg)
      && kb.l >= rb.l - 0.5 && kb.r <= rb.r + 0.5 && kb.t >= rb.t - 0.5 && kb.b <= rb.b + 0.5 && near(((kb.l + kb.r) / 2 - rb.l) / rb.w, 0.5, 0.015), roomOfAuction);

  /* ── 4. the Land Office ── */
  if (landOffice) rec.ok(`the Land Office's window is a panel in the card like the others: one room picture, one card, its own panel under the room and no separate dialog, and a finger on "Travel to Farm" (${landOffice && landOffice.travel ? Math.round(landOffice.travel.b) + ' px down, ' + Math.round(landOffice.travel.w) + ' wide' : 'NOT FOUND'}) reaches it`,
    !!landOffice && landOffice.rooms === 1 && landOffice.cards === 1 && landOffice.panel && landOffice.loose === 0 && !!landOffice.travel && landOffice.travel.b <= landOffice.vh && landOffice.reachable, landOffice);

  /* ── 5. the Market is a screen of its own ── */
  const auc = byId.auction;
  await standAt(auc.x, auc.y + 30);
  await settle((q) => q.at === 'auction' && q.btn, 4000);
  await tapEnter();
  await P.page.waitForTimeout(900);
  const market = await P.page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.bt-inspect-card button')).find((q) => /Market/.test(q.textContent || ''));
    if (b) b.click();
    return !!b;
  });
  await P.page.waitForTimeout(900);
  const afterMarket = await P.page.evaluate(() => ({ key: (document.querySelector('.bt-inspect-card') || { getAttribute: () => null }).getAttribute('data-building-panel'), rooms: document.querySelectorAll('.bt-room').length }));
  await shot('market');
  if (market) rec.ok('the Market, reached by a button inside a window, is a screen of its own: no room picture over it', afterMarket.key === 'store' && afterMarket.rooms === 0, afterMarket);
  else rec.ok('(the Market button is not on this world -- nothing to check)', true, {});
  await closePanel();

  /* ── 6. a shorter phone, a sideways one, and a picture that cannot load ── */
  const bank = byId.bank;
  await standAt(bank.x, bank.y + 30);
  await settle((q) => q.at === 'bank' && q.btn, 4000);
  await tapEnter();
  for (let i = 0; i < 24; i++) { const m = await measure(); if (m && m.room && m.state === 'ready') break; await P.page.waitForTimeout(250); }
  await P.page.setViewportSize({ width: 390, height: 667 });
  await P.page.waitForTimeout(700);
  const short = await measure();
  await shot('short-bank');
  rec.ok(`on a shorter phone (667 tall) the room is held to 30vh (${short.room ? Math.round(short.room.h) : '?'} px of ${Math.round(0.3 * 667)}), the floor cut and not the sign, and the panel still starts where it ends`,
    !!short.room && near(short.room.h, 0.3 * 667, 1.5) && near(short.panelTop, short.room.b, 1) && short.panelRadius === '0px' && short.room.l <= short.card.l + 2, short);
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(700);
  const side = await P.page.evaluate(() => {
    const card = document.querySelector('.bt-inspect-card');
    const room = card && card.querySelector(':scope > .bt-room');
    const first = room ? room.nextElementSibling : card && card.children[1];
    const cr = card ? card.getBoundingClientRect() : null;
    return { open: !!card, display: room ? getComputedStyle(room).display : null, h: room ? room.getBoundingClientRect().height : null,
      panelTop: first ? first.getBoundingClientRect().top : null, cardTop: cr ? cr.top : null };
  });
  await shot('sideways-bank');
  rec.ok('on a sideways phone (844 x 390) the room steps aside entirely, and the window reads as it did before the pictures', side.open && side.display === 'none' && side.h === 0 && near(side.panelTop, side.cardTop + 1, 2), side);
  await P.page.setViewportSize(PHONE);
  await P.page.waitForTimeout(700);
  const back = await measure();
  /* a picture that cannot be loaded: the box goes away, the panel is where it always was */
  await P.page.evaluate(() => { const img = document.querySelector('.bt-room img'); if (img) img.dispatchEvent(new Event('error')); });
  await P.page.waitForTimeout(400);
  const failed = await P.page.evaluate(() => {
    const card = document.querySelector('.bt-inspect-card');
    const first = card && Array.from(card.children).find((q) => !q.classList.contains('bt-inspect-close'));
    return { rooms: document.querySelectorAll('.bt-room').length, panelTop: first ? first.getBoundingClientRect().top : null, cardTop: card ? card.getBoundingClientRect().top : null,
      radius: first ? getComputedStyle(first).borderTopLeftRadius : null };
  });
  rec.ok('...back upright it is whole again, and a picture that fails to load takes its box with it: no slab, the panel where it always was, its own rounded corners back',
    sits(back) && failed.rooms === 0 && near(failed.panelTop, failed.cardTop + 1, 2) && failed.radius === '14px', { back: back && back.room && back.room.h, failed });
  await closePanel();

  /* ── 7. walking away, every room asked for, no errors ── */
  await standAt(byId.townhall.x - 60, byId.townhall.y + 40);
  await P.page.waitForTimeout(1200);
  const away = await P.page.evaluate(() => window.__btRoomWarm.held());
  const wantAsked = [...new Set(Object.values(R.BUILDING_ROOMS))];
  const askedIds = [...new Set(asked.map((q) => q.id))];
  const missing = wantAsked.filter((r) => !askedIds.includes(r));
  const extra = askedIds.filter((r) => !wantAsked.includes(r));
  const wrongV = asked.filter((q) => q.v !== R.ROOMS_V);
  if (!only.length) rec.ok(`away from every door nothing is held (${away === null ? 'let go' : away}), all ${wantAsked.length} rooms were asked for (${missing.length ? 'MISSING ' + missing.join() : 'none missing'}) and the two without a window (hotel, townhall) never${extra.length ? ' -- ASKED FOR ' + extra.join() : ''}, each at ?v=${R.ROOMS_V}`,
    away === null && missing.length === 0 && extra.length === 0 && wrongV.length === 0, { away, asked: askedIds, missing, extra, wrongV });
  stopAlive = true;
  const errs = (P.logs || []).filter((l) => /pageerror|app\.render threw/.test(l));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
}
