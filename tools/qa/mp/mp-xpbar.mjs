/* ═══ THE XP BAR, ON A PHONE, FROM REAL HITS (v2.3.3695) ═══
 *
 * The owner, 2026-10-28: "The game needs an XP Popup and an Xp bar to appear
 * with the icon of whatever primary combat skill you're earning Xp in
 * someplace at the bottom (or maybe top) depending on what works best. Then
 * disappears again."
 *
 * A phone (390 x 844) in the world, a real worker, Frost Ridge's first
 * snowmen, the dev kit's greatsword, god mode:
 *   0. the three skill pictures are held decoded from the loading screen;
 *   1. before any XP the top bar says "BroTown" and no bar shows;
 *   2. a real tap on the right half of the screen (the attack) lands on a
 *      snowman, and the worker's XP brings the bar into the top bar's middle:
 *      the sword's picture (loaded), its level, a fill at the worker's share
 *      of the next level, "+N XP" over it (the XP the worker added), the
 *      title and the hour's icon faded under it, the title still in the page
 *      with its words; inside the middle column, clear of the AP chip and the
 *      gold;
 *   3. a few seconds with no XP and it is gone, the title back;
 *   4. XP into the bow (the test lever /dev/combat) shows the bow's picture;
 *   5. on a 320 px phone the bar still fits between the AP and the gold;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/xpbar-*.png. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { XP_BAR_SHOW_MS } from '../../../src/game/xpBar.js';
import { XP_BAR_ICONS } from '../../../src/ui/mobile/xpBarArt.js';

const PHONE = { width: 390, height: 844 };

/* the top bar as it stands: the bar, the title, and the boxes round it */
const readBar = (P) => P.page.evaluate(() => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const bar = document.querySelector('[data-xp-bar]');
  const title = document.querySelector('[data-zone-title]');
  const icon = bar && bar.querySelector('.bt-xp-bar__icon');
  const gain = bar && bar.querySelector('[data-xp-gain]');
  const fill = bar && bar.querySelector('.bt-xp-bar__fill');
  const S = window._gameState && window._gameState.current;
  const sk = S && S.rpg && S.rpg.prog3 && S.rpg.prog3.sk;
  return {
    cat: bar ? bar.getAttribute('data-xp-bar') : null,
    shown: bar ? bar.getAttribute('data-xp-shown') === '1' : false,
    opacity: bar ? parseFloat(getComputedStyle(bar).opacity) : 0,
    level: bar ? Number(bar.getAttribute('data-xp-level')) : null,
    frac: bar ? Number(bar.getAttribute('data-xp-frac')) : null,
    lvText: bar ? (bar.querySelector('.bt-xp-bar__lv') || {}).textContent : null,
    icon: icon ? icon.getAttribute('src') : null, iconLoaded: !!(icon && icon.complete && icon.naturalWidth > 0),
    gain: gain ? Number(gain.getAttribute('data-xp-gain')) : null, gainText: gain ? gain.textContent : null,
    fillScale: fill ? fill.style.transform : null,
    title: title ? title.textContent : null, titleOpacity: title ? parseFloat(getComputedStyle(title).opacity) : null,
    todOpacity: (() => { const t = document.querySelector('.bt-zone-header__tod'); return t ? parseFloat(getComputedStyle(t).opacity) : null; })(),
    barBox: box(bar), trackBox: box(bar && bar.querySelector('.bt-xp-bar__track')),
    mid: box(document.querySelector('.bt-zone-header__mid')),
    ap: box(document.querySelector('[data-ap-chip]')), gold: box(document.querySelector('.bt-zone-header__balance')),
    sk: sk ? JSON.parse(JSON.stringify(sk)) : null,
    worker: S && S._xpBar ? { cat: S._xpBar.cat, level: S._xpBar.level, xp: S._xpBar.xp, need: S._xpBar.need, gain: S._xpBar.gain } : null,
  };
});
const shot = (P, path) => P.page.screenshot({ path, clip: { x: 0, y: 0, width: P.page.viewportSize().width, height: 60 } }).catch(() => {});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Xpbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);

    /* 0. the pictures, warm before any fight */
    const warm = await P.page.evaluate((urls) => {
      const W = window.__btXpBarWarm;
      return W ? urls.map((u) => W.has(new URL(u, location.href).href)) : null;
    }, Object.values(XP_BAR_ICONS));
    rec.ok(`0. the three skill pictures held decoded from the loading screen (${warm ? warm.filter(Boolean).length : 'no seam'}/3)`,
      !!warm && warm.length === 3 && warm.every(Boolean), warm);

    /* 1. before any XP */
    const b0 = await readBar(P);
    rec.ok(`1. before any XP the top bar says "${b0.title}" and no XP bar shows`,
      b0.title === 'BroTown' && !b0.shown && b0.titleOpacity > 0.99, b0);

    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => {});
    await P.page.waitForTimeout(1500);
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
    await P.page.waitForTimeout(1500);
    const near = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      return (S.monsters || []).filter((m) => m && m.alive !== false && m.home === 'frost')
        .map((m) => ({ id: String(m.id), x: m.x, y: m.y, d: Math.hypot(m.x - p.x, m.y - p.y) })).sort((a, b) => a.d - b.d);
    });
    rec.ok(`at Frost Ridge's first snowmen (${near.length} near) (guard)`, near.length > 0, near.slice(0, 3));
    if (!near.length) return;

    /* 2. real swings, until the worker's XP lands: walk within reach of the
       nearest snowman and tap the right half of the screen (the attack: a
       finger on [data-joyzone="R"], mp-membudget's fight) */
    const tapR = () => P.page.evaluate(() => {
      const el = document.querySelector('[data-joyzone="R"]');
      if (!el) return false;
      const b = el.getBoundingClientRect(), x = b.left + b.width * 0.5, y = b.top + b.height * 0.4;
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: 52, target: el, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 52, target: el, clientX: x, clientY: y })] });
      el.dispatchEvent(mk('touchstart'));
      el.dispatchEvent(mk('touchend'));
      return true;
    });
    const nearNow = () => P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      return (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0) && m.home === 'frost')
        .map((m) => ({ id: String(m.id), x: m.x, y: m.y, d: Math.hypot(m.x - p.x, m.y - p.y) })).sort((a, b) => a.d - b.d);
    });
    const sk0 = await H.readState(P, (S) => JSON.parse(JSON.stringify(S.rpg.prog3.sk.sword)));
    let b1 = null, swings = 0;
    for (let tries = 0; tries < 16 && !(b1 && b1.shown && b1.cat === 'sword'); tries++) {
      const m = (await nearNow())[0];
      if (!m) break;
      if (m.d > 70) await H.hopTo(P, m.x, m.y + 50, { tries: 20 });
      await P.page.waitForTimeout(300);
      if (await tapR()) swings++;
      for (let i = 0; i < 10; i++) {
        await P.page.waitForTimeout(150);
        b1 = await readBar(P);
        if (b1.shown && b1.cat === 'sword') break;
      }
    }
    console.log(`    ${swings} swing(s) before the bar`);
    /* the title and the hour's icon fade over 220 ms: read them once the fade
       has run (this box draws a few frames a second), the bar still up */
    let bF = b1;
    for (let i = 0; i < 14 && bF && bF.shown && !(bF.titleOpacity < 0.05 && (bF.todOpacity == null || bF.todOpacity < 0.05)); i++) {
      await P.page.waitForTimeout(150);
      bF = await readBar(P);
    }
    await shot(P, join(OUT, 'xpbar-1-sword.png'));
    const want = b1 && b1.sk ? b1.sk.sword : null;
    const need = b1 && b1.worker ? b1.worker.need : null;
    rec.ok(`2. a landed hit brings the sword's bar: "${b1 && b1.lvText}", ${b1 && b1.frac} of the way (the worker: level ${want && want.level}, ${want && Math.round(want.xp * 10) / 10} of ${need})`,
      !!b1 && b1.shown && b1.cat === 'sword' && b1.opacity > 0.5 && !!want && b1.level === want.level && b1.lvText === 'Lv ' + want.level
        && Math.abs(b1.frac - Math.min(1, want.xp / need)) < 0.002 && /scaleX\(/.test(b1.fillScale || ''), b1);
    rec.ok(`2. ...with the sword's picture (${(b1 && b1.icon || '').split('/').pop()}), loaded`,
      !!b1 && b1.icon === XP_BAR_ICONS.sword && b1.iconLoaded, b1 && b1.icon);
    const gained = want && sk0 ? (want.level === sk0.level ? want.xp - sk0.xp : null) : null;
    rec.ok(`2. ..."${b1 && b1.gainText}" over it, the XP the worker added (${gained != null ? Math.round(gained * 10) / 10 : 'across a level'})`,
      !!b1 && b1.gain > 0 && /^\+[\d.,]+ XP$/.test(b1.gainText || '') && (gained == null || Math.abs(b1.gain - gained) < 0.01), { gain: b1 && b1.gain, gained, sk0, want });
    rec.ok(`2. ...the title and the hour's icon faded under it (${bF && bF.titleOpacity}, ${bF && bF.todOpacity}) but still there, "${bF && bF.title}"`,
      !!bF && bF.shown && bF.titleOpacity < 0.05 && (bF.todOpacity == null || bF.todOpacity < 0.05) && bF.title === 'BroTown', bF && { t: bF.title, o: bF.titleOpacity, tod: bF.todOpacity, shown: bF.shown });
    rec.ok('2. ...inside the middle column, clear of the AP and the gold',
      !!b1 && !!b1.barBox && !!b1.mid && b1.barBox.l >= b1.mid.l - 0.5 && b1.barBox.r <= b1.mid.r + 0.5
        && (!b1.ap || b1.ap.r <= b1.trackBox.l) && (!b1.gold || b1.trackBox.r <= b1.gold.l), b1 && { bar: b1.barBox, mid: b1.mid, ap: b1.ap, gold: b1.gold, track: b1.trackBox });

    /* 3. no XP for a while: gone, the title back */
    const tLast = await P.page.evaluate(() => (window._gameState.current._xpBar || {}).at || 0);
    let b2 = null;
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(250);
      b2 = await readBar(P);
      if (!b2.shown && b2.titleOpacity > 0.99) break;
    }
    const after = tLast ? await P.page.evaluate((t) => Date.now() - t, tLast) : null;
    rec.ok(`3. with no XP for ${after != null ? Math.round(after / 100) / 10 : '-'} s (it stays ${XP_BAR_SHOW_MS / 1000} s) it is gone and the title is back`,
      !!(b1 && b1.shown) && after != null && !!b2 && !b2.shown && b2.opacity < 0.05 && b2.titleOpacity > 0.99 && after >= XP_BAR_SHOW_MS, b2);

    /* 4. the bow's XP: its bar (the worker's level lever moves the bow's skill) */
    const bowWas = await H.readState(P, (S) => S.rpg.prog3.sk.bow.level);
    await H.devOp(wsPort, 'combat', me, { skill: 'bow', level: bowWas + 1 }).catch(() => null);
    let b3 = null;
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(200);
      b3 = await readBar(P);
      if (b3.shown && b3.cat === 'bow') break;
    }
    await shot(P, join(OUT, 'xpbar-2-bow.png'));
    rec.ok(`4. XP into the bow brings the bow's bar and picture ("${b3 && b3.lvText}", ${(b3 && b3.icon || '').split('/').pop()})`,
      !!b3 && b3.shown && b3.cat === 'bow' && b3.icon === XP_BAR_ICONS.bow && b3.iconLoaded && b3.level === bowWas + 1, b3);

    /* 5. a 320 px phone */
    await P.page.setViewportSize({ width: 320, height: 700 });
    await P.page.waitForTimeout(800);
    const staffWas = await H.readState(P, (S) => S.rpg.prog3.sk.staff.level);
    await H.devOp(wsPort, 'combat', me, { skill: 'staff', level: staffWas + 1 }).catch(() => null);
    let b4 = null;
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(200);
      b4 = await readBar(P);
      if (b4.shown && b4.cat === 'staff') break;
    }
    await shot(P, join(OUT, 'xpbar-3-320.png'));
    rec.ok(`5. on a 320 px phone the staff's bar fits between the AP and the gold (track ${b4 && b4.trackBox ? Math.round(b4.trackBox.w) : '-'} px)`,
      !!b4 && b4.shown && b4.cat === 'staff' && !!b4.trackBox && b4.trackBox.w >= 36 && b4.barBox.l >= b4.mid.l - 0.5 && b4.barBox.r <= b4.mid.r + 0.5
        && (!b4.ap || b4.ap.r <= b4.trackBox.l) && (!b4.gold || b4.trackBox.r <= b4.gold.l), b4 && { bar: b4.barBox, track: b4.trackBox, mid: b4.mid, ap: b4.ap, gold: b4.gold });

    rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
