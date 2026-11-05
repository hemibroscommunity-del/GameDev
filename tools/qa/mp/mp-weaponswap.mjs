/* ═══ mp-weaponswap (v2.3.4130): THE WEAPON PILL AT THE FOOT OF THE WORLD ═══
 *
 * The owner, 2026-11-03: "different pill shape weapon swap type bar.  Put it
 * centered bottom of screen area" (WeaponPill.jsx; it was v2.3.3921's
 * triangle beside the movement stick and v2.3.3005's corner chip).
 *
 * Phone touches are REAL (CDP Input.dispatchTouchEvent), which the browser
 * hit-tests -- a dispatched DOM event cannot tell a reachable button from one
 * under another control (TRAPS 67).
 *
 *   1. EMPTY HANDS: the sword's well lit (fists), the bow's and staff's wells
 *      empty; a tap on the bow's says "No bow yet" and changes nothing.
 *   2. WHERE (upright): one pill, three 40 px wells sword | bow | staff,
 *      centred on the screen, its foot just over the dashboard band, 8 px or
 *      more from every control's place (drawn or not: Jump, Block, TRAP, the
 *      sticks...) and every other control on screen; a finger at each well's
 *      centre lands on it.  The well in hand ringed gold with the coloured
 *      picture, the others grey.
 *   3. A TAP ON EACH GREY WELL takes it in hand, and the WORKER holds it too
 *      -- read back from its player_state.
 *   4. A DRAG that starts on a well does not swap.
 *   5. SIDEWAYS: the same checks, and a tap swaps there too.
 *   6. A COMPUTER (wide): the pill at the foot of the world column, centred,
 *      its wells wearing 1 2 3; a click swaps (and walks nowhere), and the 3
 *      key swaps with the pill following.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out`;

/* A real finger: press, optional drift, release. */
async function touch(P, x, y, { dx = 0, dy = 0, holdMs = 60 } = {}) {
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await new Promise((r) => setTimeout(r, holdMs / 2));
  if (dx || dy) {
    for (let i = 1; i <= 4; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 4, y: y + dy * i / 4 }] });
      await new Promise((r) => setTimeout(r, 30));
    }
  }
  await new Promise((r) => setTimeout(r, holdMs / 2));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

const look = (P) => P.page.evaluate(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
  };
  const pill = document.querySelector('[data-weapon-pill]');
  const wells = {};
  for (const b of document.querySelectorAll('[data-wpill-slot]')) {
    const r = box(b);
    const at = document.elementFromPoint(r.x + r.w / 2, r.y + r.h / 2);
    const img = b.querySelector('img');
    const cs = getComputedStyle(b);
    wells[b.getAttribute('data-wpill-slot')] = {
      box: r, on: b.getAttribute('data-wpill-on') === '1', owned: b.getAttribute('data-wpill-owned') === '1',
      chip: b.hasAttribute('data-weapon-chip'), key: b.getAttribute('data-key'),
      src: img ? img.getAttribute('src') : null, ring: /245, 197, 78|F5C54E/i.test(cs.boxShadow),
      shaking: b.classList.contains('bt-wpill-nope'),
      hit: !!(at && at.closest && at.closest('[data-wpill-slot]') === b),
    };
  }
  const S = window._gameState && window._gameState.current;
  const cs = getComputedStyle(document.documentElement);
  const dashH = parseFloat(cs.getPropertyValue('--sheet-h')) || parseFloat(cs.getPropertyValue('--dash-h')) || 0;
  const wrap = document.querySelector('.brotown-wrap');
  /* every other control on screen: fixed, drawn, taking touches, not the
     joystick zones and not a full-screen layer; plus the quest card */
  const others = [];
  if (pill) {
    for (const el of document.querySelectorAll('body *')) {
      if (pill.contains(el) || el.contains(pill)) continue;
      if (el.closest('[data-joyzone]') || el.closest('.bt-joystick-zone') || el.closest('[data-disc]')) continue;
      const c = getComputedStyle(el);
      const q = el.hasAttribute('data-quest-hud');
      if (c.position !== 'fixed' && !q) continue;
      if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05 || (c.pointerEvents === 'none' && !q)) continue;
      const b = el.getBoundingClientRect();
      if (b.width < 20 || b.height < 20 || b.width * b.height > innerWidth * innerHeight * 0.3) continue;
      others.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 40), data: [...el.attributes].map((a) => a.name).filter((n) => n.startsWith('data-')).slice(0, 2).join(','),
        aria: el.getAttribute('aria-label'), x: b.left, y: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height });
    }
  }
  const land = innerWidth > innerHeight;
  const q = window.__btWeaponPill;
  return {
    vw: innerWidth, vh: innerHeight, dashH, land,
    wrap: box(wrap),
    pill: box(pill), pillSlot: pill ? pill.getAttribute('data-weapon-pill') : null, wells, others,
    slots: q && q.slots ? q.slots(land, innerWidth) : null,
    notes: q ? q.notes.slice() : [],
    probe: window.__btWeaponChip ? window.__btWeaponChip() : null,
    slot: S && S.rpg ? (S.rpg.activeSlot || 'melee') : null,
    cycled: !!(S && S._userCycledSlot),
    px: S && S.player ? Math.round(S.player.x) : null,
    py: S && S.player ? Math.round(S.player.y) : null,
    lock: !!(S && S.lockedTarget),
    rootFlag: document.documentElement.getAttribute('data-wpill-shown'),
  };
});

const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
/* clear air between two boxes (negative: they overlap) */
const air = (a, b) => Math.max(b.x - a.r, a.x - b.r, b.y - a.b, a.y - b.b);

/* until the pill has drawn what the game holds (it reads on a 200 ms timer;
   a frame here takes 300-600 ms).  `slot`: waited for in the game first. */
const caughtUp = async (P, slot = null, ms = 10000) => {
  if (slot) {
    await P.page.waitForFunction((want) => {
      const S = window._gameState && window._gameState.current;
      return !!(S && S.rpg) && (S.rpg.activeSlot || 'melee') === want;
    }, slot, { timeout: 5000, polling: 100 }).catch(() => {});
  }
  await P.page.waitForFunction(() => {
    const t = document.querySelector('[data-weapon-pill]');
    const p = window.__btWeaponChip ? window.__btWeaponChip() : null;
    if (!t || !p) return false;
    const on = document.querySelector('[data-wpill-on="1"]');
    return t.getAttribute('data-weapon-pill') === p.slot && !!on && on.getAttribute('data-wpill-slot') === p.slot
      && [...document.querySelectorAll('[data-wpill-owned="1"]')].length === (p.owned || []).length;
  }, null, { timeout: ms, polling: 200 }).catch(() => {});
  await P.page.waitForTimeout(400);
};

/* the worker's own word on the slot in hand: the activeSlot of the newest
   player_state that carried one (the dev panel's vitals top-up sends one) */
const workerSlot = async (P, wsPort, id, frames, want) => {
  const from = frames.length;
  await H.devOp(wsPort, 'vitals', id, {}).catch(() => null);
  const newest = (lo) => {
    for (let j = frames.length - 1; j >= lo; j--) {
      const f = frames[j];
      if (f.indexOf('"player_state"') < 0 || f.indexOf('activeSlot') < 0) continue;
      try { const m = JSON.parse(f); const a = m && m.payload && m.payload.activeSlot; if (a) return a; } catch (e) { /* not ours */ }
    }
    return null;
  };
  let got = null;
  for (let i = 0; i < 40; i++) {
    got = newest(from);
    if (got === want) return got;
    await P.page.waitForTimeout(250);
  }
  /* a v2 delta carries activeSlot only when it changed since the last send:
     with no carrier, the worker's last word before this is the answer */
  return got || newest(0);
};

function checkLayout(rec, L, label) {
  const order = ['melee', 'ranged', 'staff'];
  const all = order.map((s) => L.wells[s]).filter(Boolean);
  rec.ok(`${label}: one pill, three wells sword | bow | staff left to right (${Object.keys(L.wells).join(' | ')})`,
    !!L.pill && all.length === 3 && all[0].box.x < all[1].box.x && all[1].box.x < all[2].box.x, Object.keys(L.wells));
  if (all.length !== 3 || !L.pill) return;
  rec.ok(`${label}: each well 40 px or more (${all.map((w) => Math.round(w.box.w)).join(', ')}), a finger at each centre lands on it`,
    all.every((w) => w.box.w >= 39.5 && w.box.h >= 39.5 && w.hit), all.map((w) => ({ w: w.box.w, hit: w.hit })));
  const world = L.wrap && L.wrap.w > 0 ? L.wrap : { x: 0, r: L.vw };
  const cx = centre(L.pill).x, wx = (world.x + world.r) / 2;
  const band = L.vh - L.dashH;
  rec.ok(`${label}: centred in the world view (${Math.round(cx)} against ${Math.round(wx)}), its foot just over the band (foot ${Math.round(L.pill.b)}, band top ${Math.round(band)})`,
    Math.abs(cx - wx) <= 1.5 && L.pill.b <= band + 0.5 && L.pill.b >= band - 14, { pill: L.pill, world, band });
  const slotHits = [];
  for (const [name, s] of Object.entries(L.slots || {})) {
    const b = { x: s.x, r: s.r, y: band - s.b - s.h, b: band - s.b };
    slotHits.push({ name, air: Math.round(air(L.pill, b) * 10) / 10 });
  }
  const close = slotHits.filter((h) => h.air < 8);
  console.log(`    ${label}: pill ${JSON.stringify({ x: Math.round(L.pill.x), y: Math.round(L.pill.y), r: Math.round(L.pill.r), b: Math.round(L.pill.b) })} slots ${JSON.stringify(slotHits)}`);
  rec.ok(`${label}: 8 px or more from every touch control's place, drawn or not (nearest ${slotHits.length ? Math.min(...slotHits.map((h) => h.air)) : '?'} px: ${slotHits.slice().sort((a, b) => a.air - b.air).slice(0, 2).map((h) => h.name).join(', ')})`,
    slotHits.length >= 10 && close.length === 0, { close, slotHits });
  const drawn = L.others.map((o) => ({ ...o, air: Math.round(air(L.pill, o) * 10) / 10 })).filter((o) => o.air < 8);
  rec.ok(`${label}: 8 px or more from every other control on screen (${L.others.length} checked)`, drawn.length === 0, drawn);
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, {
    name: 'Swapper', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2, world: 'wheel',
    /* v2.3.3283: a tap is under 0.6 s, and on this box the browser saw every
       60 ms tap as 0.75-1.2 s; the QA knob stretches the window */
    query: 'tapms=4000',
  });
  const frames = [];
  P.page.on('websocket', (ws) => ws.on('framereceived', (f) => { if (typeof f.payload === 'string') { frames.push(f.payload); if (frames.length > 4000) frames.splice(0, 1000); } }));
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(P);
  const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok('in the world (guard)', !!inW);
  const id = await H.readState(P, (S) => S.myId);
  await P.page.waitForTimeout(2000);

  /* ── 1. EMPTY HANDS ── */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    R.weapon = null; R.rangedWeapon = null; R.staffWeapon = null; R.activeSlot = 'melee';
  });
  await caughtUp(P);
  const bare = await look(P);
  rec.ok(`the pill is on screen with nothing in your hands, html marked for the Enter prompt (${bare.rootFlag})`, !!bare.pill && bare.pillSlot === 'melee' && bare.rootFlag === '1', bare.pillSlot);
  rec.ok('...the sword\'s well is lit (fists), ringed gold, its picture in colour, and carries data-weapon-chip',
    !!bare.wells.melee && bare.wells.melee.on && bare.wells.melee.chip && bare.wells.melee.ring && /wpn-melee\.webp/.test(bare.wells.melee.src || ''), bare.wells.melee);
  rec.ok('...the bow\'s and the staff\'s wells are empty',
    !!bare.wells.ranged && !!bare.wells.staff && !bare.wells.ranged.owned && !bare.wells.staff.owned && !bare.wells.ranged.src && !bare.wells.staff.src,
    { ranged: bare.wells.ranged, staff: bare.wells.staff });
  if (bare.wells.ranged) {
    const c = centre(bare.wells.ranged.box);
    await touch(P, c.x, c.y);
    await P.page.waitForTimeout(300);
    const no = await look(P);
    rec.ok(`a tap on the empty bow well says "No bow equipped" (${JSON.stringify(no.notes)}) and shakes it`, no.notes.includes('No bow equipped') && no.wells.ranged.shaking, { notes: no.notes, shaking: no.wells.ranged.shaking });
    rec.ok('...and changes nothing', no.slot === 'melee' && no.pillSlot === 'melee', { slot: no.slot });
  }

  /* ── 2. WHERE, UPRIGHT (three weapons, the worker's own: armWorker) ── */
  const armed = await H.armWorker(P, wsPort, id, ['bow', 'staff']);
  rec.ok(`the worker holds a bow and a staff (${armed.join(', ')}) (guard)`, armed.length === 2, armed);
  let sw = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
  if (!sw || !sw.ok) sw = await H.equipWeapon(P, 'sword', 'weapon', 'melee').catch(() => null);
  await P.page.waitForFunction(() => { const R = window._gameState.current.rpg; return !!(R && R.weapon); }, null, { timeout: 15000, polling: 250 }).catch(() => {});
  await caughtUp(P, 'melee');
  const a = await look(P);
  checkLayout(rec, a, 'upright');
  rec.ok('the sword in hand: its well ringed gold, its picture in colour; the bow and the staff grey',
    a.wells.melee.on && a.wells.melee.ring && /wpn-melee\.webp/.test(a.wells.melee.src || '')
      && /wpn-ranged-grey/.test(a.wells.ranged.src || '') && /wpn-staff-grey/.test(a.wells.staff.src || '') && !a.wells.ranged.ring,
    { melee: a.wells.melee, ranged: a.wells.ranged, staff: a.wells.staff });
  await P.page.screenshot({ path: `${OUT}/weaponpill-upright.png` });

  /* ── 3. A TAP ON EACH GREY WELL ── */
  let prev = a;
  for (const want of ['ranged', 'staff', 'melee', 'staff', 'ranged', 'melee']) {
    const c = centre(prev.wells[want].box);
    await touch(P, c.x, c.y);
    await caughtUp(P, want);
    const now = await look(P);
    const ws = await workerSlot(P, wsPort, id, frames, want);
    rec.ok(`a tap on the grey ${want} well takes it in hand: ${prev.slot} -> ${now.slot}, the worker's player_state says ${ws}`,
      now.slot === want && ws === want, { slot: now.slot, worker: ws });
    rec.ok(`...its well lit gold with the coloured picture, the one before grey again`,
      now.wells[want].on && now.wells[want].ring && now.wells[want].chip && !/grey/.test(now.wells[want].src || '')
        && (prev.slot === want || /grey/.test(now.wells[prev.slot].src || '')), { now: now.wells[want], before: now.wells[prev.slot] });
    rec.ok('...the tap neither walked you nor locked a target',
      Math.abs(now.px - prev.px) <= 2 && Math.abs(now.py - prev.py) <= 2 && now.lock === prev.lock, { from: [prev.px, prev.py], to: [now.px, now.py] });
    if (want === 'ranged' && prev.slot === 'melee') await P.page.screenshot({ path: `${OUT}/weaponpill-bow.png`, clip: { x: 0, y: now.pill.y - 120, width: now.vw, height: now.vh - now.pill.y + 120 } });
    prev = now;
  }
  rec.ok('the swaps went through the real swap path (the session marked)', prev.cycled === true, prev.cycled);

  /* ── 4. A DRAG ON A WELL DOES NOT SWAP ── */
  const before = await look(P);
  const c0 = centre(before.wells.staff.box);
  await touch(P, c0.x, c0.y, { dx: -40, dy: -40, holdMs: 200 });
  await P.page.waitForTimeout(500);
  const dragged = await look(P);
  rec.ok('a drag that starts on a well does not change weapon', dragged.slot === before.slot, { before: before.slot, after: dragged.slot });

  /* ── 5. SIDEWAYS ── */
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(1500);
  await caughtUp(P);
  const land = await look(P);
  checkLayout(rec, land, 'sideways');
  const lw = land.slot === 'staff' ? 'ranged' : 'staff';
  if (land.wells[lw]) {
    const lc = centre(land.wells[lw].box);
    await touch(P, lc.x, lc.y);
    await caughtUp(P, lw);
    const landTap = await look(P);
    rec.ok(`sideways a tap swaps too (${land.slot} -> ${landTap.slot}, wanted ${lw})`, landTap.slot === lw, { from: land.slot, to: landTap.slot });
  }
  await P.page.screenshot({ path: `${OUT}/weaponpill-landscape.png` });
  rec.ok('no page errors (phone)', errs.length === 0, errs.slice(0, 4));
  await P.ctx.close().catch(() => {});

  /* ── 6. A COMPUTER ── */
  const D = await H.newPlayer(browser, { name: 'DeskSwap', wsPort, webPort, world: 'wheel', viewport: { width: 1440, height: 900 }, wide: true });
  const derrs = [];
  D.page.on('pageerror', (e) => derrs.push(String(e && e.message || e)));
  try {
    await H.enterWorld(D);
    await H.waitFor(D, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
    const did = await H.readState(D, (S) => S.myId);
    await H.armWorker(D, wsPort, did, ['bow', 'staff']);
    await H.equipWeapon(D, 'staff', 'staffWeapon', 'melee').catch(() => null);
    await caughtUp(D, 'melee');
    const d0 = await look(D);
    const world = d0.wrap;
    rec.ok(`computer: the pill at the foot of the world column, centred (${d0.pill && Math.round(centre(d0.pill).x)} against ${world && Math.round((world.x + world.r) / 2)}), foot ${d0.pill && Math.round(d0.pill.b)} of ${d0.vh}`,
      !!d0.pill && !!world && Math.abs(centre(d0.pill).x - (world.x + world.r) / 2) <= 1.5 && d0.pill.b <= d0.vh && d0.pill.b >= d0.vh - d0.dashH - 20, { pill: d0.pill, world });
    rec.ok(`computer: the wells wear their keys (${['melee', 'ranged', 'staff'].map((s) => d0.wells[s] && d0.wells[s].key).join(' ')})`,
      ['1', '2', '3'].every((k, i) => d0.wells[['melee', 'ranged', 'staff'][i]] && d0.wells[['melee', 'ranged', 'staff'][i]].key === k), d0.wells);
    const drawnD = d0.others.map((o) => ({ ...o, air: Math.round(air(d0.pill, o) * 10) / 10 })).filter((o) => o.air < 8);
    rec.ok(`computer: 8 px or more from every other control on screen (${d0.others.length} checked)`, drawnD.length === 0, drawnD);
    const cb = centre(d0.wells.ranged.box);
    await D.page.mouse.click(cb.x, cb.y);
    await caughtUp(D, 'ranged');
    const d1 = await look(D);
    rec.ok(`computer: a click on the bow well takes the bow (${d1.slot}) and walks nowhere`,
      d1.slot === 'ranged' && d1.wells.ranged.on && Math.abs(d1.px - d0.px) <= 2 && Math.abs(d1.py - d0.py) <= 2, { slot: d1.slot, from: [d0.px, d0.py], to: [d1.px, d1.py] });
    await D.page.keyboard.press('3');
    await caughtUp(D, 'staff');
    const d2 = await look(D);
    rec.ok(`computer: the 3 key takes the staff and the pill follows (${d2.slot}, lit ${d2.pillSlot})`, d2.slot === 'staff' && d2.pillSlot === 'staff' && d2.wells.staff.on, { slot: d2.slot });
    await D.page.screenshot({ path: `${OUT}/weaponpill-computer.png` });
    rec.ok('no page errors (computer)', derrs.length === 0, derrs.slice(0, 4));
  } finally { await D.ctx.close().catch(() => {}); }
}
