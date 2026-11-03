/* ═══ mp-weaponswap (v2.3.3921): THE WEAPON TRIANGLE OVER THE MOVEMENT STICK ═══
 *
 * The owner: "I need a button on screen for switching between weapons.  Maybe
 * a triangle or wheel where the active weapon is highlighted on top and the
 * others are greyed out" (WeaponTriangle.jsx; it was v2.3.3005's chip under
 * the movement stick, which this scenario tested until now).
 *
 * Everything here is driven with REAL touches (CDP Input.dispatchTouchEvent),
 * which the browser hit-tests -- a dispatched DOM event cannot tell a reachable
 * button from one under another control (TRAPS 67).
 *
 *   1. EMPTY HANDS: the top is your fists (the faint empty-slot picture), the
 *      bow and the staff dashed empty circles; a tap on the bow says "No bow
 *      yet" and changes nothing.
 *   2. WHERE (upright): in the left half, the left thumb's side (the owner's
 *      choice: "the right joystick is already crowded"), the top button 46 px,
 *      the two below it 40 px, Element Burst's, Quick eat's and the movement
 *      stick's places (drawn or not) and every other control on screen (the
 *      bell, the quest card, the dashboard...) 8 px or more away; a finger at
 *      each centre lands on it.
 *   3. A TAP ON EACH DIM WEAPON takes it in hand: it turns to the top, and the
 *      WORKER holds it too -- read back from its player_state.
 *   4. A DRAG that starts on a dim weapon does not swap.
 *   5. SIDEWAYS: the same checks, and a tap swaps there too.
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
  const tri = document.querySelector('[data-weapon-tri]');
  const btns = {};
  for (const b of document.querySelectorAll('[data-wtri-slot]')) {
    const r = box(b);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const at = document.elementFromPoint(cx, cy);
    const img = b.querySelector('img');
    btns[b.getAttribute('data-wtri-slot')] = {
      box: r, role: b.getAttribute('data-wtri-role'), owned: b.getAttribute('data-wtri-owned') === '1',
      chip: b.hasAttribute('data-weapon-chip'), src: img ? img.getAttribute('src') : null,
      imgOp: img ? Number(getComputedStyle(img).opacity) : null,
      dashed: !!b.querySelector('span[style*="dashed"]'),
      shaking: !!b.querySelector('.bt-wtri-nope'),
      hit: !!(at && at.closest && at.closest('[data-wtri-slot]') === b),
    };
  }
  const S = window._gameState && window._gameState.current;
  const cs = getComputedStyle(document.documentElement);
  const dashH = parseFloat(cs.getPropertyValue('--sheet-h')) || parseFloat(cs.getPropertyValue('--dash-h')) || 0;
  /* every other control on screen: fixed, drawn, taking touches, not the
     joystick zones and not a full-screen layer; plus the quest card, which
     takes no touches but must not be covered */
  const others = [];
  if (tri) {
    for (const el of document.querySelectorAll('body *')) {
      if (tri.contains(el) || el.contains(tri)) continue;
      if (el.closest('[data-joyzone]') || el.closest('.bt-joystick-zone')) continue;
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
  const q = window.__btWeaponTri;
  return {
    vw: innerWidth, vh: innerHeight, dashH, land,
    tri: box(tri), triSlot: tri ? tri.getAttribute('data-weapon-tri') : null, btns, others,
    slots: q && q.boxes ? q.boxes(land) : null,
    notes: q ? q.notes.slice() : [],
    probe: window.__btWeaponChip ? window.__btWeaponChip() : null,
    slot: S && S.rpg ? (S.rpg.activeSlot || 'melee') : null,
    cycled: !!(S && S._userCycledSlot),
    px: S && S.player ? Math.round(S.player.x) : null,
    py: S && S.player ? Math.round(S.player.y) : null,
    lock: !!(S && S.lockedTarget),
  };
});

const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
/* clear air between two boxes (negative: they overlap) */
const air = (a, b) => Math.max(b.x - a.r, a.x - b.r, b.y - a.b, a.y - b.b);
/* clear air between two round buttons' rings */
const ringAir = (a, b) => {
  const p = centre(a), q = centre(b);
  return Math.hypot(p.x - q.x, p.y - q.y) - a.w / 2 - b.w / 2;
};

/* until the triangle has drawn what the game holds (it reads on a 200 ms
   timer; a frame here takes 300-600 ms).  `slot`: waited for in the game first. */
const caughtUp = async (P, slot = null, ms = 10000) => {
  if (slot) {
    await P.page.waitForFunction((want) => {
      const S = window._gameState && window._gameState.current;
      return !!(S && S.rpg) && (S.rpg.activeSlot || 'melee') === want;
    }, slot, { timeout: 5000, polling: 100 }).catch(() => {});
  }
  await P.page.waitForFunction(() => {
    const t = document.querySelector('[data-weapon-tri]');
    const p = window.__btWeaponChip ? window.__btWeaponChip() : null;
    if (!t || !p) return false;
    const top = document.querySelector('[data-wtri-role="top"]');
    return t.getAttribute('data-weapon-tri') === p.slot && !!top && top.getAttribute('data-wtri-slot') === p.slot
      && [...document.querySelectorAll('[data-wtri-owned="1"]')].length === (p.owned || []).length;
  }, null, { timeout: ms, polling: 200 }).catch(() => {});
  await P.page.waitForTimeout(400);   /* the 150 ms turn, at this box's frame rate */
};

/* the worker's own word on the slot in hand: the activeSlot of the newest
   player_state that carried one (the dev panel's vitals top-up sends one) */
const workerSlot = async (P, wsPort, id, frames, want) => {
  const from = frames.length;
  await H.devOp(wsPort, 'vitals', id, {}).catch(() => null);
  let got = null;
  for (let i = 0; i < 40; i++) {
    for (let j = frames.length - 1; j >= from; j--) {
      const f = frames[j];
      if (f.indexOf('"player_state"') < 0 || f.indexOf('activeSlot') < 0) continue;
      try { const m = JSON.parse(f); const a = m && m.payload && m.payload.activeSlot; if (a) { got = a; break; } } catch (e) { /* not ours */ }
    }
    if (got === want) return got;
    await P.page.waitForTimeout(250);
  }
  /* a v2 delta carries activeSlot only when it changed since the last send:
     with no carrier, the worker's last word before this is the answer */
  if (!got) {
    for (let j = frames.length - 1; j >= 0; j--) {
      const f = frames[j];
      if (f.indexOf('"player_state"') < 0 || f.indexOf('activeSlot') < 0) continue;
      try { const m = JSON.parse(f); const a = m && m.payload && m.payload.activeSlot; if (a) { got = a; break; } } catch (e) { /* not ours */ }
    }
  }
  return got;
};

function checkLayout(rec, L, label) {
  const B = L.btns;
  const all = ['melee', 'ranged', 'staff'].map((s) => B[s]).filter(Boolean);
  rec.ok(`${label}: three weapon buttons drawn (${all.length})`, all.length === 3, Object.keys(B));
  if (all.length !== 3) return;
  const top = all.find((b) => b.role === 'top'), left = all.find((b) => b.role === 'left'), right = all.find((b) => b.role === 'right');
  rec.ok(`${label}: the weapon in hand on top (${Math.round(top.box.w)} px), the other two below it to either side (${Math.round(left.box.w)} / ${Math.round(right.box.w)} px)`,
    top.box.w >= 44 && left.box.w >= 39.5 && right.box.w >= 39.5 && centre(top.box).y < centre(left.box).y - 20 && centre(left.box).x < centre(top.box).x && centre(right.box).x > centre(top.box).x,
    { top: top.box, left: left.box, right: right.box });
  rec.ok(`${label}: a finger at each centre lands on that weapon`, all.every((b) => b.hit), all.map((b) => b.hit));
  const tri = L.tri;
  /* v2.3.3921: the left thumb's side, by the owner's choice */
  rec.ok(`${label}: in the left half, the movement stick's side (right edge ${Math.round(tri.r)} of ${L.vw / 2}), clear of the iOS edge guard (left ${Math.round(tri.x)}), over the dashboard (foot ${Math.round(tri.b)}, band top ${Math.round(L.vh - L.dashH)})`,
    tri.r <= L.vw / 2 && tri.x >= 18 && tri.b <= L.vh - L.dashH + 0.5, tri);
  /* every slot of the cluster, drawn or not */
  const band = L.vh - L.dashH;
  const slotHits = [];
  for (const [name, s] of Object.entries(L.slots || {})) {
    if (name === 'tri') continue;
    const b = { x: s.left, r: s.left + s.w, y: band - s.bottom - s.h, b: band - s.bottom, w: s.w, h: s.h };
    const a = Math.min(...all.map((t) => air(t.box, b)));
    slotHits.push({ name, air: Math.round(a * 10) / 10 });
  }
  const close = slotHits.filter((h) => h.air < 8);
  console.log(`    ${label}: tri ${JSON.stringify({ x: Math.round(tri.x), y: Math.round(tri.y), r: Math.round(tri.r), b: Math.round(tri.b) })} slots ${JSON.stringify(slotHits)}`);
  rec.ok(`${label}: 8 px or more from Element Burst's, Quick eat's and the movement stick's places, drawn or not (nearest ${slotHits.length ? Math.min(...slotHits.map((h) => h.air)) : '?'} px)`,
    slotHits.length >= 3 && close.length === 0, { close, slotHits });
  const drawn = L.others.map((o) => ({ ...o, air: Math.round(Math.min(...all.map((t) => air(t.box, o))) * 10) / 10 })).filter((o) => o.air < 8);
  rec.ok(`${label}: 8 px or more from every other control on screen (${L.others.length} checked: the minimap, the quest card, the top bar, the dashboard...)`,
    drawn.length === 0, drawn);
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
  rec.ok('the triangle is on screen with nothing in your hands', !!bare.tri && bare.triSlot === 'melee', bare.triSlot);
  rec.ok('...the top is your fists: the Weapon cell\'s own empty-slot picture, faint, and it carries data-weapon-chip',
    !!bare.btns.melee && bare.btns.melee.role === 'top' && bare.btns.melee.chip && /slot-weapon/.test(bare.btns.melee.src || '') && bare.btns.melee.imgOp < 0.6,
    bare.btns.melee);
  rec.ok('...the bow and the staff are dashed empty circles',
    !!bare.btns.ranged && !!bare.btns.staff && !bare.btns.ranged.owned && !bare.btns.staff.owned && bare.btns.ranged.dashed && bare.btns.staff.dashed && !bare.btns.ranged.src,
    { ranged: bare.btns.ranged, staff: bare.btns.staff });
  if (bare.btns.ranged) {
    const c = centre(bare.btns.ranged.box);
    await touch(P, c.x, c.y);
    await P.page.waitForTimeout(300);
    const no = await look(P);
    rec.ok(`a tap on the empty bow says "No bow yet" (${JSON.stringify(no.notes)}) and shakes it`, no.notes.includes('No bow yet') && no.btns.ranged.shaking, { notes: no.notes, shaking: no.btns.ranged.shaking });
    rec.ok('...and changes nothing', no.slot === 'melee' && no.triSlot === 'melee', { slot: no.slot });
  }

  /* ── 2. WHERE, UPRIGHT (three weapons, the worker's own: armWorker) ── */
  const armed = await H.armWorker(P, wsPort, id, ['bow', 'staff']);
  rec.ok(`the worker holds a bow and a staff (${armed.join(', ')}) (guard)`, armed.length === 2, armed);
  /* and the kit's sword in hand (empty, melee is fists: the faint picture) */
  let sw = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
  if (!sw || !sw.ok) sw = await H.equipWeapon(P, 'sword', 'weapon', 'melee').catch(() => null);
  await P.page.waitForFunction(() => { const R = window._gameState.current.rpg; return !!(R && R.weapon); }, null, { timeout: 15000, polling: 250 }).catch(() => {});
  await caughtUp(P, 'melee');
  const a = await look(P);
  rec.ok(`a sword in hand (${a.btns.melee && a.btns.melee.src}) (guard)`, !!a.btns.melee && !/slot-weapon/.test(a.btns.melee.src || ''), a.btns.melee);
  checkLayout(rec, a, 'upright');
  rec.ok('the weapon in hand on top in full colour, the other two dimmed',
    a.btns.melee.role === 'top' && a.btns.ranged.owned && a.btns.staff.owned && a.btns.ranged.imgOp < 0.6 && a.btns.staff.imgOp < 0.6 && !a.btns.ranged.dashed,
    { melee: a.btns.melee, ranged: a.btns.ranged, staff: a.btns.staff });
  await P.page.screenshot({ path: `${OUT}/weaponswap-upright.png`, clip: { x: 0, y: Math.max(0, a.tri.y - 60), width: a.vw / 2 + 20, height: a.vh - Math.max(0, a.tri.y - 60) } });

  /* ── 2b. THE OPEN CHAT FEED (the bell's) stays clear of it ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.chatLog = S.chatLog || [];
    for (let i = 0; i < 8; i++) S.chatLog.push({ name: 'Crowd' + (i % 3), text: 'a line of world chat that runs long enough to wrap ' + i, ts: Date.now() + i });
    try { window.__broChatLogBus && window.__broChatLogBus.bump(); } catch (e) {}
  });
  /* the feed itself drawn, not the helper's word: on this box a frame can take
     longer than its 350 ms wait, and its second click shuts what the first opened */
  const feedUp = () => P.page.waitForFunction(() => { const f = document.querySelector('[data-world-chat]'); return !!f && f.getBoundingClientRect().width > 0; }, null, { timeout: 6000, polling: 250 }).then(() => true).catch(() => false);
  await H.openWorldChat(P).catch(() => false);
  let opened = await feedUp();
  if (!opened) { await P.page.click('[data-world-chat-toggle]').catch(() => {}); opened = await feedUp(); }
  await P.page.waitForTimeout(600);
  const feed = await P.page.evaluate(() => {
    const s = document.querySelector('[data-world-chat]');
    const r = s && s.getBoundingClientRect();
    return r && r.width > 0 ? { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null;
  });
  const wf = await look(P);
  const feedAir = feed && wf.tri ? air(wf.tri, feed) : null;
  rec.ok(`the open chat feed (${opened ? 'opened' : 'not opened'}) stays 8 px or more off the triangle (${feedAir != null ? Math.round(feedAir) : '?'} px), and a finger on each weapon still lands on it`,
    opened === true && !!feed && feedAir >= 8 && Object.values(wf.btns).every((b) => b.hit), { feed, tri: wf.tri, feedAir });
  await P.page.screenshot({ path: `${OUT}/weaponswap-chat-open.png` });
  await P.page.click('[data-world-chat-toggle]').catch(() => {});
  await P.page.waitForTimeout(500);

  /* ── 3. A TAP ON EACH DIM WEAPON ── */
  let prev = a;
  for (const role of ['right', 'right', 'left', 'left']) {
    const want = Object.entries(prev.btns).find(([, b]) => b.role === role)[0];
    const c = centre(prev.btns[want].box);
    await touch(P, c.x, c.y);
    await caughtUp(P, want);
    const now = await look(P);
    const ws = await workerSlot(P, wsPort, id, frames, want);
    rec.ok(`a tap on the dim ${want} (lower ${role}) takes it in hand: ${prev.slot} -> ${now.slot}, the worker's player_state says ${ws}`,
      now.slot === want && ws === want, { slot: now.slot, worker: ws });
    rec.ok(`...and the triangle turns it to the top (${now.btns[want] && now.btns[want].role}), wearing its picture`,
      !!now.btns[want] && now.btns[want].role === 'top' && now.btns[want].chip && now.triSlot === want && now.btns[want].imgOp === 1, now.btns[want]);
    rec.ok('...the tap neither walked you nor locked a target',
      Math.abs(now.px - prev.px) <= 2 && Math.abs(now.py - prev.py) <= 2 && now.lock === prev.lock, { from: [prev.px, prev.py], to: [now.px, now.py] });
    if (want === 'ranged') await P.page.screenshot({ path: `${OUT}/weaponswap-bow.png`, clip: { x: 0, y: Math.max(0, now.tri.y - 60), width: now.vw / 2 + 20, height: now.vh - Math.max(0, now.tri.y - 60) } });
    prev = now;
  }
  rec.ok('the swaps went through the real swap path (the session marked)', prev.cycled === true, prev.cycled);

  /* ── 4. A DRAG ON A DIM WEAPON DOES NOT SWAP ── */
  const before = await look(P);
  const dim = Object.values(before.btns).find((b) => b.role === 'right');
  const c0 = centre(dim.box);
  await touch(P, c0.x, c0.y, { dx: -40, dy: -40, holdMs: 200 });
  await P.page.waitForTimeout(500);
  const dragged = await look(P);
  rec.ok('a drag that starts on a dim weapon does not change weapon', dragged.slot === before.slot, { before: before.slot, after: dragged.slot });

  /* ── 5. SIDEWAYS ── */
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(1500);
  await caughtUp(P);
  const land = await look(P);
  checkLayout(rec, land, 'sideways');
  const lw = Object.entries(land.btns).find(([, b]) => b.role === 'left');
  if (lw) {
    const lc = centre(lw[1].box);
    await touch(P, lc.x, lc.y);
    await caughtUp(P, lw[0]);
    const landTap = await look(P);
    rec.ok(`sideways a tap swaps too (${land.slot} -> ${landTap.slot}, wanted ${lw[0]})`, landTap.slot === lw[0], { from: land.slot, to: landTap.slot });
  }
  await P.page.screenshot({ path: `${OUT}/weaponswap-landscape.png` });

  rec.ok('no page errors', errs.length === 0, errs.slice(0, 4));
}
