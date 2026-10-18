/* ═══ THE ROOM BEHIND EACH BUILDING'S MENU, ON A PHONE (v2.3.3258) ═══
 *
 * Owner, 2026-10-06: sent seventeen pictures of the inside of BroTown's
 * buildings and said "Ok wire these up"; then, 2026-10-15: "Yes I like your
 * idea of interacting with the building's NPC instead of having the building
 * interiors.  Have it open up as backgrounds behind the different buildings
 * menus instead of literally going into a building".  One real player against
 * a real worker, in the Wheel's Brotown, on a phone (390 x 844, touch):
 *   1. standing at a door decodes THAT room's picture (and no other), and
 *      the first door starts the rest coming (src/game/buildingRooms.js);
 *   2. each of the fifteen doors that open a window -- the eleven buildings
 *      and the four halls (v2.3.3259: the Assay Office is gone) -- opens
 *      with its own room as its BACKGROUND: the picture loaded
 *      at 1152 x 768 behind everything in the card (the card's whole box,
 *      z-index -1), the room 3:2 at the card's width (the forge's scene pulled
 *      up to a band), the menu starting a stage down it with its own surface
 *      and its title's taken away, its title readable (on top), the close
 *      button on top;
 *   2b. (v2.3.3259) the Gem Works' door opens ONE window with two tabs, Cut
 *      gems and Set gems, on the one room (not loaded again when the tab
 *      changes): the tab strip is the window's first row, written on the room
 *      where the other windows' titles are, and each tab draws the cutter's or
 *      the enchanter's own panel flush with the window, every tab reachable by
 *      a finger -- and on a sideways phone clear of the close button;
 *   3. the Auction House's clerk is drawn into his room, inside it, centred on
 *      the lectern;
 *   4. the Land Office's window (it was a separate dialog under an empty card
 *      until v2.3.3258) is a panel in the card like the others, on its room,
 *      and "Travel to Farm" can be reached by a finger;
 *   5. the Market (a screen of its own, reached from a window) has no room;
 *   6. a shorter phone holds the stage to 22vh, a sideways one drops the room
 *      and the menu is as it was, and a picture that cannot be loaded leaves
 *      the window as it was;
 *   7. THE KEEPERS: a tap on Blacksmith Bro opens the forge on its room, E
 *      beside him too, and a tap on Mayor Bro, his quests done, the Town Hall;
 *      the Saloon's window is the Saloon's own (parties), and the Gladiator
 *      Arena is a window of its own with no room behind it;
 *   8. walking away lets the held picture go; all fifteen were asked for; no
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
    const scene = room.querySelector('.bt-room-scene'), sr = scene.getBoundingClientRect();
    const img = room.querySelector('img');
    const panel = room.nextElementSibling;
    const first = panel && panel.firstElementChild;
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
    /* the title is on top of the room: what a finger finds in the middle of its line is the panel's */
    const fr = first ? first.getBoundingClientRect() : null;
    const tHit = fr ? document.elementFromPoint(fr.left + Math.min(60, fr.width / 2), fr.top + fr.height / 2) : null;
    const keeper = room.querySelector('.bt-room-keeper');
    const kr = keeper ? keeper.getBoundingClientRect() : null;
    return {
      id: room.getAttribute('data-room'), state: room.getAttribute('data-room-state'), shape: room.getAttribute('data-shape'),
      nat: [img.naturalWidth, img.naturalHeight], complete: img.complete, cardKey: card.getAttribute('data-building-panel'), cardRoom: card.getAttribute('data-room'),
      card: box(cr), cardInner: { h: card.clientHeight }, room: box(rr), scene: box(sr), vh: innerHeight, vw: innerWidth, zRoom: getComputedStyle(room).zIndex,
      panelTop: panel ? panel.getBoundingClientRect().top : null, panelBg: panel ? getComputedStyle(panel).backgroundColor : null,
      firstBg: first ? getComputedStyle(first).backgroundColor : null, titleOnTop: !!tHit && !!panel && panel.contains(tHit), titleHit: tHit && panel && panel.contains(tHit) ? null : describe(tHit),
      closeOnTop: !!hit && (hit === close || close.contains(hit)), coverer: !!hit && (hit === close || close.contains(hit)) ? null : describe(hit), closeBox: box(xr), closeInRoom: xr.left >= sr.left && xr.right <= sr.right && xr.top >= rr.top && xr.bottom <= Math.min(sr.bottom, rr.bottom),
      keeper: kr ? { box: box(kr), anim: getComputedStyle(keeper).animationName, key: keeper.getAttribute('data-keeper'), bg: getComputedStyle(keeper).backgroundImage.slice(0, 80) } : null,
      display: getComputedStyle(room).display,
    };
  });
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  /* the stage: 62% of the room's height at the card's width (41.33vw - 9.92 px, at most 148.8 px and 22vh), the forge's band a quarter of it
     (game.css --room-stage) */
  const stageOf = (m) => (m.shape === 'band' ? Math.min(90, 0.25 * m.vw - 6) : Math.min(148.8, 0.4133 * m.vw - 9.92, 0.22 * m.vh));
  /* is the room the card's background, the right shape, and the menu written on it a stage down */
  const sits = (m) => {
    if (!m || !m.room) return false;
    const w = m.room.w;
    const sceneTop = m.shape === 'band' ? m.room.t - 0.0733 * w : m.room.t;
    return near(m.room.l - m.card.l, 1, 1.5) && near(m.card.r - m.room.r, 1, 1.5) && near(m.room.t - m.card.t, 1, 1.5) && near(m.room.h, m.cardInner.h, 1.5)
      && near(m.scene.w, w, 1) && near(m.scene.h, w * 2 / 3, 1.5) && near(m.scene.t, sceneTop, 1.5) && m.zRoom === '-1'
      && near(m.panelTop - (m.card.t + 1), stageOf(m), 1.5) && m.panelBg === 'rgba(0, 0, 0, 0)' && m.firstBg === 'rgba(0, 0, 0, 0)' && m.titleOnTop;
  };

  /* ── the doors ── */
  let doors = [];
  for (let i = 0; i < 40 && doors.length < 16; i++) {
    doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
    if (doors.length < 16) await P.page.waitForTimeout(500);
  }
  const byId = Object.fromEntries(doors.map((d) => [d.id, d]));
  const windows = doors.filter((d) => d.index >= 0 || d.hall);
  const warmBefore = await P.page.evaluate(() => ({ held: window.__btRoomWarm.held(), pre: window.__btRoomWarm.prefetched() }));
  rec.ok(`on a phone in the Wheel's Brotown: ${windows.length} doors open a window, and before the first door nothing is decoded or prefetched`,
    z0 === 'wheel' && doors.length === 16 && windows.length === 15 && warmBefore.held === null && warmBefore.pre === false, { z0, n: doors.length, windows: windows.length, warmBefore });

  /* ── 1 + 2. each window ── */
  const bad = [], warmBad = [], seen = [];
  let roomOfAuction = null, landOffice = null;
  const only = (process.env.QA_ROOMS_ONLY || '').split(',').filter(Boolean);   /* e.g. QA_ROOMS_ONLY=gambling,bank for a fast look */
  /* the Town Hall first: it is where everyone starts, and the first door that is not it is what starts the others coming */
  const order = (only.length ? windows.filter((d) => only.includes(d.id)) : windows).slice().sort((a, b) => (a.id === 'townhall' ? 0 : 1) - (b.id === 'townhall' ? 0 : 1));
  const preAt = {};
  for (const d of order) {
    const okStand = await standAt(d.x, d.y + 30);
    const r = await settle((q) => q.at === d.id && q.btn);
    const want = d.hall ? d.hall : actionOf[d.index];
    const warm = await P.page.evaluate(() => ({ held: window.__btRoomWarm.held(), pre: window.__btRoomWarm.prefetched() }));
    if (warm.held !== R.roomIdFor(want)) warmBad.push([d.id, warm]);
    preAt[d.id] = warm.pre;
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
    seen.push({ id: d.id, key, h: m && m.scene ? Math.round(m.scene.h) : null, w: m && m.scene ? Math.round(m.scene.w) : null, stage: m && m.room ? Math.round(m.panelTop - m.card.t - 1) : null, shape: m && m.shape });
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
  if (!only.length) {
    const second = order.find((d) => d.id !== 'townhall');
    rec.ok(`the Town Hall's door, where every character starts, decodes its own picture but does not start the other rooms coming (${preAt.townhall}); the next door does (${second.id}: ${preAt[second.id]})`,
      preAt.townhall === false && preAt[second.id] === true, preAt);
  }
  rec.ok(`standing at a door decodes its own room's picture and no other (${order.length} doors${warmBad.length ? ', WRONG: ' + JSON.stringify(warmBad) : ''}), and the first shop's or hall's door starts the rest coming`,
    order.length === (only.length || 15) && warmBad.length === 0 && (await P.page.evaluate(() => window.__btRoomWarm.prefetched())) === true, { warmBad });
  rec.ok(`each window opens with its own room as its background: ${seen.map((s) => s.id + ' ' + s.w + 'x' + s.h + ' stage ' + s.stage + (s.shape === 'band' ? ' band' : '')).join(', ')} -- 1152 x 768 loaded behind everything in the card, 3:2 at its width (the forge's pulled up to a band), the menu a stage down it with its own surface and its title's taken away, the title on top, the close button on top`,
    bad.length === 0 && seen.length === (only.length || 15), bad);

  /* ── 2b. the Gem Works: two tabs, one room (v2.3.3259) ── */
  if (!only.length || only.includes('gemcutter')) {
    const gw = byId.gemcutter;
    await standAt(gw.x, gw.y + 30);
    await settle((q) => q.at === 'gemcutter' && q.btn);
    await tapEnter();
    let k0 = null;
    for (let i = 0; i < 12 && !k0; i++) { await P.page.waitForTimeout(250); k0 = await panelKey(); }
    for (let i = 0; i < 24; i++) { const m = await measure(); if (m && m.room && m.state === 'ready') break; await P.page.waitForTimeout(250); }
    await P.page.waitForTimeout(300);
    const gwRead = () => P.page.evaluate(() => {
      const card = document.querySelector('.bt-inspect-card');
      const w = card && card.querySelector('[data-gem-works]');
      const room = card && card.querySelector(':scope > .bt-room');
      const strip = w && w.firstElementChild;
      const tabs = w ? Array.from(w.querySelectorAll('button[data-gem-tab]')) : [];
      const body = w && w.querySelector('.bt-gw-body');
      const inner = body && body.firstElementChild;
      const wr = w && w.getBoundingClientRect(), ir = inner && inner.getBoundingClientRect();
      const tr = tabs.map((t) => {
        const r = t.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { tab: t.getAttribute('data-gem-tab'), on: t.getAttribute('aria-selected') === 'true', text: (t.textContent || '').trim(), h: Math.round(r.height), reach: !!hit && (hit === t || t.contains(hit)), within: r.left >= wr.left - 0.5 && r.right <= wr.right + 0.5 };
      });
      return { key: card && card.getAttribute('data-building-panel'), roomAttr: card && card.getAttribute('data-room'), works: w ? w.getAttribute('data-gem-works') : null,
        tabs: tr, rooms: card ? card.querySelectorAll('.bt-room').length : 0, tag: room ? (room.querySelector('img').__qaTag || null) : null, state: room && room.getAttribute('data-room-state'),
        /* the window is the card's menu, laid on the room, and its first row is the tab strip, its surface taken away like a title's */
        onRoom: !!(room && w) && room.nextElementSibling === w, stripFirst: !!strip && strip.getAttribute('role') === 'tablist', stripBg: strip ? getComputedStyle(strip).backgroundColor : null,
        flush: !!(wr && ir) && Math.abs(ir.left - wr.left) < 1.5 && Math.abs(ir.right - wr.right) < 1.5, bottomFlush: !!(wr && ir) && Math.abs(ir.bottom - wr.bottom) < 1.5,
        innerRadius: inner ? getComputedStyle(inner).borderTopLeftRadius : null,
        text: inner ? (inner.textContent || '').slice(0, 90) : null, noSideways: card ? card.scrollWidth <= card.clientWidth + 1 : null };
    });
    const cut = await gwRead(), mCut = await measure();
    await P.page.evaluate(() => { const img = document.querySelector('.bt-room img'); if (img) img.__qaTag = 'same'; });
    await shot('gemworks-cut');
    await P.page.evaluate(() => { const b = document.querySelector('[data-gem-works] button[data-gem-tab="enchant"]'); if (b) b.click(); });
    await P.page.waitForTimeout(600);
    const set = await gwRead(), mSet = await measure();
    await shot('gemworks-set');
    await P.page.evaluate(() => { const b = document.querySelector('[data-gem-works] button[data-gem-tab="gemcut"]'); if (b) b.click(); });
    await P.page.waitForTimeout(600);
    const cut2 = await gwRead();
    const tabsOk = (g, want) => g.tabs.length === 2 && g.tabs.map((t) => t.tab).join() === 'gemcut,enchant' && g.tabs.every((t) => t.reach && t.within && t.h >= 44) && g.tabs.find((t) => t.on).tab === want
      && g.tabs[0].text.startsWith('Cut gems') && g.tabs[1].text.startsWith('Set gems');
    const laid = (g, m) => g.onRoom && g.stripFirst && g.stripBg === 'rgba(0, 0, 0, 0)' && sits(m) && m.id === 'gemcutter';
    rec.ok(`the Gem Works' door opens ONE window on its room with two tabs, "Cut gems" and "Set gems" (each at least 44 px tall and reachable by a finger), the strip its first row, written on the room a stage down; the cutter's panel first (${(cut.text || '').slice(0, 40).trim()}...)`,
      k0 === 'gemcut' && cut.works === 'gemcut' && cut.key === 'gemcut' && tabsOk(cut, 'gemcut') && /Gem Cutter/.test(cut.text || '') && cut.rooms === 1 && cut.roomAttr === 'gemcutter' && laid(cut, mCut), { k0, cut, mCut });
    rec.ok(`...a tap on "Set gems" is the enchanter's panel in the same window (${(set.text || '').slice(0, 40).trim()}...), on the same room, NOT loaded again (the very same <img>), the close button still on top`,
      set.works === 'enchant' && set.key === 'enchant' && set.roomAttr === 'gemcutter' && tabsOk(set, 'enchant') && /Enchanter/.test(set.text || '') && set.rooms === 1 && set.tag === 'same' && set.state === 'ready'
        && laid(set, mSet) && mSet.closeOnTop === true, { set, mSet });
    rec.ok('...each panel fills its body exactly (its own -20 px margin taken back by the body\'s 20 px), under the strip with square corners, nothing wider than the window; a tap on "Cut gems" brings the cutter back',
      cut.flush && cut.bottomFlush && cut.innerRadius === '0px' && cut.noSideways === true && set.flush && set.bottomFlush && set.innerRadius === '0px' && set.noSideways === true
        && cut2.works === 'gemcut' && cut2.key === 'gemcut' && tabsOk(cut2, 'gemcut') && cut2.tag === 'same', { cut, set, cut2 });
    /* a sideways phone drops the room, and the close button lies over the strip's end: the tabs keep clear of it */
    await P.page.setViewportSize({ width: 844, height: 390 });
    await P.page.waitForTimeout(700);
    const sideGw = await P.page.evaluate(() => {
      const card = document.querySelector('.bt-inspect-card');
      const close = card && card.querySelector('.bt-inspect-close');
      const tabs = card ? Array.from(card.querySelectorAll('[data-gem-works] button[data-gem-tab]')) : [];
      const xr = close ? close.getBoundingClientRect() : null;
      const hit = xr ? document.elementFromPoint(xr.left + xr.width / 2, xr.top + xr.height / 2) : null;
      const overlap = tabs.some((t) => { const r = t.getBoundingClientRect(); return !!xr && r.right > xr.left && r.left < xr.right && r.bottom > xr.top && r.top < xr.bottom; });
      const room = card && card.querySelector(':scope > .bt-room');
      return { open: !!card, room: room ? getComputedStyle(room).display : 'none', tabs: tabs.length, overlap, closeOnTop: !!hit && (hit === close || close.contains(hit)) };
    });
    await shot('gemworks-sideways');
    await P.page.setViewportSize(PHONE);
    await P.page.waitForTimeout(700);
    rec.ok('...and on a sideways phone, where the room steps aside, the tabs stay clear of the close button and it is on top', sideGw.open && sideGw.room === 'none' && sideGw.tabs === 2 && !sideGw.overlap && sideGw.closeOnTop, sideGw);
    await closePanel();
  }

  /* ── 3. the clerk ── */
  const kk = roomOfAuction && roomOfAuction.keeper;
  const kb = kk && kk.box, rb = roomOfAuction && roomOfAuction.scene;
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
  rec.ok(`on a shorter phone (667 tall) the stage is held to 22vh (${short.room ? Math.round(short.panelTop - short.card.t - 1) : '?'} px of ${Math.round(0.22 * 667)}): the room is still the window's background and the menu still written on it`,
    !!short.room && near(short.panelTop - (short.card.t + 1), 0.22 * 667, 1.5) && sits(short), short);
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(700);
  const side = await P.page.evaluate(() => {
    const card = document.querySelector('.bt-inspect-card');
    const room = card && card.querySelector(':scope > .bt-room');
    const first = room ? room.nextElementSibling : card && card.children[1];
    const cr = card ? card.getBoundingClientRect() : null;
    return { open: !!card, display: room ? getComputedStyle(room).display : null, h: room ? room.getBoundingClientRect().height : null,
      panelTop: first ? first.getBoundingClientRect().top : null, cardTop: cr ? cr.top : null,
      panelBg: first ? getComputedStyle(first).backgroundColor : null, titleBg: first && first.firstElementChild ? getComputedStyle(first.firstElementChild).backgroundColor : null };
  });
  await shot('sideways-bank');
  rec.ok('on a sideways phone (844 x 390) the room steps aside entirely, and the window reads as it did before the pictures: the panel at the top of the card on its own slate, its title strip its own colour',
    side.open && side.display === 'none' && side.h === 0 && near(side.panelTop, side.cardTop + 1, 2) && side.panelBg === 'rgb(30, 46, 52)' && side.titleBg === 'rgb(39, 57, 63)', side);
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
      radius: first ? getComputedStyle(first).borderTopLeftRadius : null, bg: first ? getComputedStyle(first).backgroundColor : null };
  });
  rec.ok('...back upright it is whole again, and a picture that fails to load takes its box with it: no slab and no empty stage, the panel where it always was on its own slate',
    sits(back) && failed.rooms === 0 && near(failed.panelTop, failed.cardTop + 1, 2) && failed.radius === '14px' && failed.bg === 'rgb(30, 46, 52)', { back: back && back.room && back.room.h, failed });
  await closePanel();

  /* ── 7. THE KEEPERS (the owner: "interacting with the building's NPC instead of having the building interiors") ── */
  const npcCss = async (name) => {
    let prev = null;
    for (let i = 0; i < 40; i++) {
      const cur = await P.page.evaluate((nm) => {
        const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
        const n = (S.npcs || []).find((q) => q.name === nm);
        return n && S.camera ? { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) - 26, keeperOf: n.keeperOf || null } : null;
      }, name);
      if (cur && prev && Math.abs(cur.x - prev.x) < 1.5 && Math.abs(cur.y - prev.y) < 1.5) return cur;
      prev = cur;
      await P.page.waitForTimeout(80);
    }
    return prev;
  };
  const npcAt = (name) => P.page.evaluate((nm) => { const S = window._gameState.current; const n = (S.npcs || []).find((q) => q.name === nm); return n ? { x: n.x, y: n.y } : null; }, name);
  const tapKeeper = async (name, standDx, label) => {
    const at = await npcAt(name);
    if (!at) return { name, missing: true };
    await standAt(at.x + standDx, at.y + 40);
    await P.page.waitForTimeout(600);
    const css = await npcCss(name);
    const t0 = Date.now();
    /* v2.3.3461: tapped until the world's scan has RUN (window.__btNpcTap
       stamped), three tries at most -- mp-npctap's way.  A touch's start and
       end are two events, and the zones count it a tap only when they come
       within SELF_TAP_MAX_MS 400 of each other (BroTown lE/rE).  On this box a
       frame takes 300-600 ms, and one drawn between the two made the tap a
       hold: nothing ran, no record, no window (the sweep of 2026-10-18 --
       Blacksmith Bro "NOTHING", the Mayor's tap a minute later fine).  A
       phone's frame is 16 ms.  The check below still asks the one tap that
       ran to have opened his building. */
    const ranSince = () => P.page.evaluate((t) => { const r = window.__btNpcTap; return !!(r && r.ts >= t - 50); }, t0);
    for (let k = 0; k < 3 && css; k++) {
      const at2 = k ? (await npcCss(name)) || css : css;
      await P.page.touchscreen.tap(at2.x, at2.y);
      await P.page.waitForTimeout(300);
      if (await ranSince()) break;
    }
    let key = null;
    for (let i = 0; i < 16 && !key; i++) { await P.page.waitForTimeout(250); key = await panelKey(); }
    let m = null;
    for (let i = 0; i < 24; i++) { m = await measure(); if (m && m.room && m.state === 'ready') break; await P.page.waitForTimeout(250); }
    await P.page.waitForTimeout(300);
    await shot('keeper-' + label);
    const tap = await P.page.evaluate((t) => { const r = window.__btNpcTap; return r && r.ts >= t - 50 ? r : null; }, t0);
    await closePanel();
    return { name, keeperOf: css && css.keeperOf, tap, key, room: m && m.id, sits: sits(m) };
  };
  /* stood EAST of each keeper, away from his door (its Enter reach is 140 px from the boots), so E can only mean him */
  const smith = await tapKeeper('Blacksmith Bro', 60, 'blacksmith');
  rec.ok(`a tap on Blacksmith Bro opens the forge on its own room (${smith.key || 'NOTHING'}, room ${smith.room || '-'}): he keeps it now, where he used to have "nothing for you"`,
    smith.keeperOf === 'blacksmith' && !!smith.tap && smith.tap.npc === 'Blacksmith Bro' && smith.tap.result === 'opens' && smith.key === 'forge' && smith.room === 'blacksmith' && smith.sits, smith);
  /* E beside him: the keyboard's road to the same window (desktopControls runTalk) */
  const smithAt = await npcAt('Blacksmith Bro');
  await standAt(smithAt.x + 60, smithAt.y + 40);
  await P.page.waitForTimeout(500);
  const nearE = await P.page.evaluate(() => { const S = window._gameState.current; return { npc: S._nearNpc ? S._nearNpc.name : null, door: S.nearBuilding }; });
  await P.page.keyboard.press('e');
  let eKey = null;
  for (let i = 0; i < 12 && !eKey; i++) { await P.page.waitForTimeout(250); eKey = await panelKey(); }
  await closePanel();
  rec.ok(`...E beside him opens it too, with no door in reach (near ${nearE.npc || 'nobody'}, door ${nearE.door}: ${eKey || 'nothing'})`, nearE.npc === 'Blacksmith Bro' && nearE.door === null && eKey === 'forge', { nearE, eKey });
  const mayor = await tapKeeper('Mayor Bro', 60, 'mayor');
  rec.ok(`a tap on Mayor Bro, his quests done, opens the Town Hall on its room (${mayor.key || 'NOTHING'}): the leaderboard and the world map`,
    mayor.keeperOf === 'townhall' && !!mayor.tap && mayor.tap.npc === 'Mayor Bro' && mayor.tap.result === 'opens' && mayor.key === 'townhall' && mayor.room === 'townhall' && mayor.sits, mayor);

  /* ── 7b. the Saloon is the Saloon, and the arena is its own window (the owner: "the gladiator arena is showing 'saloon' behind it") ── */
  const look = async (panel, label) => {
    await P.page.evaluate((p) => window.__btBuildingWindow.open(p), panel);
    for (let i = 0; i < 24; i++) {
      const st = await P.page.evaluate(() => { const r = document.querySelector('.bt-room'); return r ? r.getAttribute('data-room-state') : 'none'; });
      if (st === 'ready' || st === 'none' || st === 'failed') break;
      await P.page.waitForTimeout(250);
    }
    await P.page.waitForTimeout(300);
    await shot(label);
    const r = await P.page.evaluate(() => {
      const card = document.querySelector('.bt-inspect-card');
      const text = card ? card.textContent || '' : '';
      return { key: card && card.getAttribute('data-building-panel'), room: card && card.getAttribute('data-room'), rooms: document.querySelectorAll('.bt-room').length,
        saloon: !!(card && card.querySelector('[data-saloon]')), arena: /Gladiator Arena/i.test(text), find: !!(card && card.querySelector('[data-hall-row="party"]')) };
    });
    await P.page.evaluate(() => window.__btBuildingWindow.open(null));
    await P.page.waitForTimeout(300);
    return r;
  };
  const saloon = await look('party', 'saloon-own');
  rec.ok('the Saloon\'s door opens the Saloon -- your party and Find a party -- on its room, and no Gladiator Arena in it',
    saloon.key === 'party' && saloon.room === 'saloon' && saloon.saloon && saloon.find && !saloon.arena, saloon);
  const arenaW = await look('arena', 'arena-own');
  rec.ok('the Gladiator Arena (from the Sheriff\'s Office) is a window of its own with no room behind it -- no Saloon sign over the arena',
    arenaW.key === 'arena' && !arenaW.room && arenaW.rooms === 0 && arenaW.arena && !arenaW.saloon, arenaW);

  /* ── 8. walking away, every room asked for, no errors ── */
  await standAt(byId.townhall.x, byId.townhall.y + 330);   /* the square, 330 px south of the Town Hall's door: clear of every door (the Town Hall is one since v2.3.3258) */
  await P.page.waitForTimeout(1200);
  const away = await P.page.evaluate(() => window.__btRoomWarm.held());
  const wantAsked = [...new Set(Object.values(R.BUILDING_ROOMS))];
  const askedIds = [...new Set(asked.map((q) => q.id))];
  const missing = wantAsked.filter((r) => !askedIds.includes(r));
  const extra = askedIds.filter((r) => !wantAsked.includes(r));
  const wrongV = asked.filter((q) => q.v !== R.ROOMS_V);
  if (!only.length) rec.ok(`away from every door nothing is held (${away === null ? 'let go' : away}), all ${wantAsked.length} rooms were asked for (${missing.length ? 'MISSING ' + missing.join() : 'none missing'}) and the one without a window (the hotel) never${extra.length ? ' -- ASKED FOR ' + extra.join() : ''}, each at ?v=${R.ROOMS_V}`,
    away === null && missing.length === 0 && extra.length === 0 && wrongV.length === 0, { away, asked: askedIds, missing, extra, wrongV });
  stopAlive = true;
  const errs = (P.logs || []).filter((l) => /pageerror|app\.render threw/.test(l));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
}
