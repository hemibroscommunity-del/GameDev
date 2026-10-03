/* ═══ mp-weaponswap (v2.3.3005): THE WEAPON BUTTON UNDER THE MOVEMENT STICK ═══
 *
 * Owner: "Add a little icon of current equipped weapon in bottom left above
 * dashboard but beneath left joystick.  If you tap on it it switches to the
 * next equipped weapon."  (WeaponSwapButton.jsx)
 *
 * Everything here is driven with REAL touches (CDP Input.dispatchTouchEvent),
 * which the browser hit-tests -- a dispatched DOM event cannot tell a reachable
 * button from one under the iOS edge guard or the chat shell (TRAPS 67).
 *
 *   1. WHERE: bottom-left, above the dashboard band, beneath the movement disc,
 *      clear of the edge guard, and the bell one place right of it -- not on it.
 *   2. WHAT: the picture of the weapon in your hand (the Weapon cell's own),
 *      a dot per weapon with the held one lit.
 *   3. A TAP SWAPS: sword -> bow -> staff -> sword, the picture following, the
 *      worker told, and the tap neither walks you nor locks anything.
 *   4. A DRAG starting on it does not swap.
 *   5. One weapon: a tap shakes and changes nothing.  Empty hands: the faint
 *      empty-slot picture.
 *   6. It rides above an open sheet; sideways it sits in the world, clear of the
 *      fold chip, the bell still beside it.
 *   7. The open chat feed opens beside it, never over it.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out`;

const SWORD = { type: 'greatsword', tier: 'common', tierMult: 1.12, gearBase: 'copper', name: 'Copper Great Sword', quality: 'normal', dmg: 5 };
const BOW = { type: 'bow', tier: 'common', tierMult: 1.12, gearBase: 'ww_pine', name: 'Pine Bow', quality: 'normal' };
const STAFF = { type: 'staff', tier: 'common', tierMult: 1.12, gearBase: 'ww_pine', name: 'Pine Staff', quality: 'normal', element1: 'flame' };

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
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      r: Math.round(r.right), b: Math.round(r.bottom) };
  };
  const btn = document.querySelector('[data-weapon-chip]');
  const face = btn && btn.querySelector('.bt-wpn-face');
  const img = btn && btn.querySelector('img');
  const dots = btn && btn.querySelector('[data-weapon-dots]');
  const bell = document.querySelector('[data-world-chat-toggle]');
  const disc = document.querySelector('[data-disc="L"]');
  const S = window._gameState && window._gameState.current;
  const nav = document.querySelector('.bt-navrail') || document.querySelector('[data-dash]');
  let hit = null;
  if (btn) {
    const r = btn.getBoundingClientRect();
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    hit = !!(at && at.closest && at.closest('[data-weapon-chip]'));
  }
  const cs = getComputedStyle(document.documentElement);
  return {
    vw: innerWidth, vh: innerHeight,
    btn: box(btn), face: box(face), bell: box(bell), disc: box(disc),
    navTop: nav ? Math.round(nav.getBoundingClientRect().top) : null,
    dashH: parseFloat(cs.getPropertyValue('--sheet-h')) || parseFloat(cs.getPropertyValue('--dash-h')) || 0,
    slotAttr: btn ? btn.getAttribute('data-weapon-chip') : null,
    owned: btn ? Number(btn.getAttribute('data-weapon-owned')) : null,
    src: img ? img.getAttribute('src') : null,
    imgOpacity: img ? Number(getComputedStyle(img).opacity) : null,
    dotsAt: dots ? Number(dots.getAttribute('data-weapon-dots')) : null,
    dotCount: dots ? dots.children.length : 0,
    nope: !!(face && face.classList.contains('bt-wpn-face--nope')),
    hit,
    probe: window.__btWeaponChip ? window.__btWeaponChip() : null,
    slot: S && S.rpg ? (S.rpg.activeSlot || 'melee') : null,
    cycled: !!(S && S._userCycledSlot),
    px: S && S.player ? Math.round(S.player.x) : null,
    py: S && S.player ? Math.round(S.player.y) : null,
    lock: !!(S && S.lockedTarget),
  };
});

const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const overlaps = (a, b) => !!(a && b) && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, {
    name: 'Swapper', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2, world: 'wheel',
  });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* ── 5b. EMPTY HANDS FIRST: a new bro holds nothing until the Mayor arms him ── */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    R.weapon = null; R.rangedWeapon = null; R.staffWeapon = null; R.activeSlot = 'melee';
  });
  await P.page.waitForTimeout(500);
  const bare = await look(P);
  rec.ok('the button is on screen with nothing in your hands (guard)', !!bare.btn, bare);
  rec.ok('empty hands show the Weapon cell\'s own empty-slot picture, faint',
    !!bare.src && /slot-weapon/.test(bare.src) && bare.imgOpacity < 0.6, { src: bare.src, op: bare.imgOpacity });
  rec.ok('...and no dots: there is nothing to cycle through', bare.dotCount === 0, bare);

  /* ── 1. WHERE ── */
  await P.page.evaluate(({ SWORD, BOW, STAFF }) => {
    const R = window._gameState.current.rpg;
    R.weapon = SWORD; R.rangedWeapon = BOW; R.staffWeapon = STAFF; R.activeSlot = 'melee';
  }, { SWORD, BOW, STAFF });
  await P.page.waitForTimeout(600);
  const a = await look(P);
  const bandTop = a.vh - a.dashH;
  rec.ok(`the button is little and a thumb's size (${a.btn && a.btn.w}x${a.btn && a.btn.h} touch, ${a.face && a.face.w}px face)`,
    !!a.btn && a.btn.w >= 44 && a.btn.h >= 44 && a.btn.w <= 48 && !!a.face && a.face.w <= 42, { btn: a.btn, face: a.face });
  rec.ok('it sits in the bottom-LEFT, above the dashboard band',
    !!a.btn && a.btn.r < a.vw / 2 && a.btn.b <= bandTop + 1 && a.btn.y > a.vh * 0.6, { btn: a.btn, bandTop, vh: a.vh });
  rec.ok('...BENEATH the movement disc: below its bottom edge, inside its width',
    !!a.btn && !!a.disc && a.btn.y >= a.disc.b && centre(a.btn).x > a.disc.x && centre(a.btn).x < a.disc.r,
    { btn: a.btn, disc: a.disc });
  rec.ok('...clear of the iOS edge guard (the leftmost 18px eat every touch)', !!a.btn && a.btn.x >= 18, a.btn);
  rec.ok('a finger at its centre lands on IT (nothing on top of it)', a.hit === true, a);
  rec.ok('the bell is still bottom-left, one place to the right of the button',
    !!a.bell && !!a.btn && a.bell.x >= a.btn.r && a.bell.r < a.vw / 2 && !overlaps(a.bell, a.btn),
    { bell: a.bell, btn: a.btn });
  rec.ok(`...with air between their faces (${a.bell && a.face ? a.bell.x - a.face.r : '?'}px)`,
    !!a.bell && !!a.face && a.bell.x - a.face.r >= 4 && a.bell.x - a.face.r <= 12, { bell: a.bell, face: a.face });
  rec.ok('...on one line: the face and the bell share a centre (within 2px)',
    !!a.bell && !!a.face && Math.abs(centre(a.bell).y - centre(a.face).y) <= 2, { bell: a.bell, face: a.face });
  rec.ok('...and the bell is fully clear of the edge guard now too', !!a.bell && a.bell.x >= 18, a.bell);

  /* ── 2. WHAT ── */
  const cellSrc = await P.page.evaluate(() => {
    const img = document.querySelector('[data-weapon-chip] img');
    return img ? img.src : null;
  });
  rec.ok('it shows the sword in your hand (the copper greatsword picture)',
    a.slotAttr === 'melee' && /great-sword-copper/.test(a.src || ''), { slot: a.slotAttr, src: a.src, cellSrc });
  rec.ok('three weapons, three dots, the first one lit', a.dotCount === 3 && a.dotsAt === 0, a);
  await P.page.screenshot({ path: `${OUT}/weaponswap-corner.png`, clip: { x: 0, y: a.vh - 260, width: a.vw / 2 + 30, height: 260 } });

  /* ── 3. A TAP SWAPS, ROUND THE CYCLE ── */
  const expect = [['ranged', /bow\.webp/], ['staff', /staff\.webp/], ['melee', /great-sword-copper/]];
  let prev = a;
  for (const [slot, art] of expect) {
    const c = centre(prev.btn);
    await touch(P, c.x, c.y);
    await P.page.waitForTimeout(450);
    const now = await look(P);
    rec.ok(`a tap moves to the next weapon: ${prev.slot} -> ${now.slot} (wanted ${slot})`, now.slot === slot, { slot: now.slot });
    rec.ok(`...and the button shows it (${(now.src || '').split('/').pop()})`, art.test(now.src || '') && now.slotAttr === slot, now.src);
    rec.ok(`...its dot lit (${now.dotsAt})`, now.dotsAt === ['melee', 'ranged', 'staff'].indexOf(slot), now.dotsAt);
    rec.ok('...the tap neither walked you nor locked a target',
      Math.abs(now.px - prev.px) <= 2 && Math.abs(now.py - prev.py) <= 2 && now.lock === prev.lock,
      { from: [prev.px, prev.py], to: [now.px, now.py], lock: now.lock });
    if (slot === 'ranged') await P.page.screenshot({ path: `${OUT}/weaponswap-bow.png`, clip: { x: 0, y: now.vh - 260, width: now.vw / 2 + 30, height: 260 } });
    prev = now;
  }
  rec.ok('the swap went through the real swap path (the worker is told, the session marked)', prev.cycled === true, prev);

  /* ── 4. A DRAG THAT STARTS ON IT DOES NOT SWAP ── */
  const before = await look(P);
  const c0 = centre(before.btn);
  await touch(P, c0.x, c0.y, { dx: 40, dy: -40, holdMs: 200 });
  await P.page.waitForTimeout(400);
  const dragged = await look(P);
  rec.ok('a drag that starts on the button does not change weapon', dragged.slot === before.slot, { before: before.slot, after: dragged.slot });

  /* ── 5. ONE WEAPON: A TAP SHAKES, NOTHING CHANGES ── */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    R.rangedWeapon = null; R.staffWeapon = null; R.activeSlot = 'melee';
  });
  await P.page.waitForTimeout(500);
  const one = await look(P);
  rec.ok('one weapon: no dots, and the edge is not lit brass', one.dotCount === 0 && one.probe && one.probe.canSwap === false, one);
  await touch(P, centre(one.btn).x, centre(one.btn).y);
  await P.page.waitForTimeout(120);
  const shook = await look(P);
  rec.ok('...a tap shakes the button', shook.nope === true, shook);
  rec.ok('...and changes nothing', shook.slot === 'melee', shook.slot);

  /* ── 7. THE OPEN CHAT FEED OPENS BESIDE IT ── */
  await P.page.evaluate(({ BOW, STAFF }) => {
    const R = window._gameState.current.rpg;
    R.rangedWeapon = BOW; R.staffWeapon = STAFF;
    const S = window._gameState.current;
    S.chatLog = S.chatLog || [];
    for (let i = 0; i < 8; i++) S.chatLog.push({ name: 'Crowd' + (i % 3), text: 'a line of world chat that runs long enough to wrap ' + i, ts: Date.now() + i });
    try { window.__broChatLogBus && window.__broChatLogBus.bump(); } catch (e) {}
  }, { BOW, STAFF });
  await P.page.waitForTimeout(600);
  const opened = await H.openWorldChat(P);
  await P.page.waitForTimeout(500);
  const chat = await P.page.evaluate(() => {
    const s = document.querySelector('[data-world-chat]');
    const r = s && s.getBoundingClientRect();
    return r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) } : null;
  });
  const withChat = await look(P);
  rec.ok('the chat feed could be opened (guard)', opened === true, { opened });
  rec.ok('the open feed lies beside the button, not over it', !!chat && !overlaps(chat, withChat.btn), { chat, btn: withChat.btn });
  rec.ok('...and a finger on the button still lands on it', withChat.hit === true, withChat);
  await P.page.screenshot({ path: `${OUT}/weaponswap-chat-open.png`, clip: { x: 0, y: withChat.vh - 320, width: withChat.vw, height: 320 } });
  await P.page.click('[data-world-chat-toggle]').catch(() => {});
  await P.page.waitForTimeout(400);

  /* ── 6a. IT RIDES ABOVE AN OPEN SHEET ── */
  try { await P.page.evaluate(() => { window.__broDashPanelBus.open('hero'); }); } catch (e) { /* bus missing: the guard below says so */ }
  await P.page.waitForTimeout(900);
  const sheet = await look(P);
  rec.ok(`with a sheet open it rides above it, still beneath the disc (band ${Math.round(sheet.dashH)}px)`,
    !!sheet.btn && sheet.dashH > 100 && sheet.btn.b <= sheet.vh - sheet.dashH + 1 && !!sheet.disc && sheet.btn.y >= sheet.disc.b,
    { btn: sheet.btn, dashH: sheet.dashH, disc: sheet.disc });
  try { await P.page.evaluate(() => { window.__broDashPanelBus.clear(); }); } catch (e) {}
  await P.page.waitForTimeout(600);

  /* ── 6b. SIDEWAYS ── */
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(1500);
  const land = await look(P);
  const fold = await P.page.evaluate(() => {
    const f = document.querySelector('[data-land-fold]');
    const r = f && f.getBoundingClientRect();
    return r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) } : null;
  });
  rec.ok('sideways: on screen, beneath the movement disc', !!land.btn && !!land.disc && land.btn.y >= land.disc.b
    && centre(land.btn).x > land.disc.x - 30 && centre(land.btn).x < land.disc.r + 30, { btn: land.btn, disc: land.disc });
  rec.ok('...a finger lands on it', land.hit === true, land);
  rec.ok('...clear of the resting fold chip', !fold || !overlaps(fold, land.btn), { fold, btn: land.btn });
  rec.ok('...and the bell is still beside it, not on it', !!land.bell && land.bell.x >= land.btn.r && !overlaps(land.bell, land.btn), { bell: land.bell, btn: land.btn });
  const lc = centre(land.btn);
  await touch(P, lc.x, lc.y);
  await P.page.waitForTimeout(450);
  const landTap = await look(P);
  rec.ok(`...and a tap swaps there too (${land.slot} -> ${landTap.slot})`, landTap.slot !== land.slot, { from: land.slot, to: landTap.slot });
  await P.page.screenshot({ path: `${OUT}/weaponswap-landscape.png` });

  rec.ok('no page errors', errs.length === 0, errs.slice(0, 4));
}
