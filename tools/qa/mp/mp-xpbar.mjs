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
 *
 * v2.3.3739, the owner: "put the plus xp to the left of the weapon icon so
 * you can still see the bar.  Also use a white bar to show how the xp will
 * grow and fill it up to that point.  It should also show the number of xp
 * needed for the next level somewhere on the bar."  So, in every layout
 * (upright 390, upright 320, sideways, a computer playing wide), from real
 * hits: "+N XP" left of the picture and clear of the bar; the white at the
 * worker's share at once with the gold behind it, then the gold caught up;
 * "45 / 120" on the bar, the worker's numbers, inside the track; nothing
 * over the AP or the gold.  And a level-up (the test lever): the white runs
 * to the end, then the new level starts from what carried over.
 * Pictures: tools/qa/mp/out/xpbar-*.png (each layout a "-gain" and a
 * "-filled"; "-levelup-*" the level-up's steps). */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { XP_BAR_SHOW_MS, XP_FILL_DELAY_MS, XP_FILL_MS, xpToNextWords } from '../../../src/game/xpBar.js';
/* v2.3.3796: "45 / 120" as numbers */
const parseNum = (t) => { const m = /^([\d.,]+) \/ ([\d.,]+)$/.exec(String(t || '').trim()); return m ? { v: Number(m[1].replace(/,/g, '')), of: Number(m[2].replace(/,/g, '')) } : null; };
import { XP_BAR_ICONS } from '../../../src/ui/mobile/xpBarArt.js';

const PHONE = { width: 390, height: 844 };

/* the top bar as it stands: the bar, the title, and the boxes round it */
const readBar = (P) => P.page.evaluate(() => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const sx = (el) => { if (!el) return null; const m = /matrix\(([^,]+)/.exec(getComputedStyle(el).transform || ''); return m ? Math.round(parseFloat(m[1]) * 1000) / 1000 : (getComputedStyle(el).transform === 'none' ? 1 : null); };
  const bar = document.querySelector('[data-xp-bar]');
  const title = document.querySelector('[data-zone-title]');
  const icon = bar && bar.querySelector('.bt-xp-bar__icon');
  const gain = bar && bar.querySelector('[data-xp-gain]');
  const fill = bar && bar.querySelector('.bt-xp-bar__fill');
  const white = bar && bar.querySelector('.bt-xp-bar__white');
  const track = bar && bar.querySelector('.bt-xp-bar__track');
  const num = bar && bar.querySelector('[data-xp-num]');
  const numText = num ? num.textContent : null;
  /* the words' own width (a range over the text, not the full-track box) */
  let numW = null;
  if (num && num.firstChild) { const rg = document.createRange(); rg.selectNodeContents(num); numW = rg.getBoundingClientRect().width; }
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
    goldNow: sx(fill), whiteNow: sx(white),
    whiteAt: track ? Number(track.getAttribute('data-xp-white')) : null,
    goldAt: track ? Number(track.getAttribute('data-xp-gold')) : null,
    numText, numW,
    title: title ? title.textContent : null, titleOpacity: title ? parseFloat(getComputedStyle(title).opacity) : null,
    todOpacity: (() => { const t = document.querySelector('.bt-zone-header__tod'); return t ? parseFloat(getComputedStyle(t).opacity) : null; })(),
    barBox: box(bar), trackBox: box(track), iconBox: box(icon), gainBox: box(gain),
    mid: box(document.querySelector('.bt-zone-header__mid')),
    header: box(document.querySelector('.bt-zone-header')),
    ap: box(document.querySelector('[data-ap-chip]')), gold: box(document.querySelector('.bt-zone-header__balance')),
    door: box(document.querySelector('.bt-zone-header__logout')),
    sk: sk ? JSON.parse(JSON.stringify(sk)) : null,
    worker: S && S._xpBar ? { cat: S._xpBar.cat, level: S._xpBar.level, xp: S._xpBar.xp, need: S._xpBar.need, gain: S._xpBar.gain, at: S._xpBar.at } : null,
  };
});
/* the top bar only (on a computer playing wide, its own width) */
const shot = async (P, path) => {
  const hb = await P.page.evaluate(() => { const r = document.querySelector('.bt-zone-header').getBoundingClientRect(); return { x: Math.max(0, r.left), w: r.width }; }).catch(() => null);
  const vw = P.page.viewportSize().width;
  const x = hb ? Math.floor(hb.x) : 0, w = hb ? Math.min(vw - x, Math.ceil(hb.w)) : vw;
  await P.page.screenshot({ path, clip: { x, y: 0, width: w, height: 58 } }).catch(() => {});
};
/* a screenshot here takes longer than the fill: the bar's own transitions
   and the pop are held for the picture (Web Animations pause, the state the
   page had at that instant), then let run on */
const hold = (P, on) => P.page.evaluate((on) => {
  for (const a of document.getAnimations()) {
    const t = a.effect && a.effect.target;
    if (t && t.matches && t.matches('.bt-xp-bar__fill, .bt-xp-gain')) { if (on) a.pause(); else a.play(); }
  }
}, on).catch(() => {});

/* nothing of the bar over the door, the AP or the gold; inside the middle */
const clear = (b) => !!b && !!b.barBox && !!b.mid && !!b.trackBox
  && b.barBox.l >= b.mid.l - 0.5 && b.barBox.r <= b.mid.r + 0.5
  && (!b.ap || b.ap.r <= (b.gainBox ? Math.min(b.gainBox.l, b.iconBox.l) : b.iconBox.l))
  && (!b.door || b.door.r <= b.iconBox.l)
  && (!b.gold || b.trackBox.r <= b.gold.l);
const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, p = S.player;
  return (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0) && m.home === 'frost')
    .map((m) => ({ id: String(m.id), x: m.x, y: m.y, d: Math.hypot(m.x - p.x, m.y - p.y) })).sort((a, b) => a.d - b.d);
});
/* the attack: a finger on the right half of the screen ([data-joyzone="R"],
   mp-membudget's fight), or on a computer a click on the snowman */
const tapR = (P) => P.page.evaluate(() => {
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
const clickOn = async (P, m) => {
  const pt = await P.page.evaluate(([x, y]) => {
    const S = window._gameState.current;
    const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
    return { x: Math.round(cv.left + (x - S.camera.x) * S._worldScaleX), y: Math.round(cv.top + (y - S.camera.y) * S._worldScaleY) };
  }, [m.x, m.y - 20]);
  await P.page.mouse.click(pt.x, pt.y, { delay: 90 });
  return true;
};

/* swing at the nearest snowman until the worker's XP for the sword lands,
   reading the bar at once (the white is ahead of the gold for
   XP_FILL_DELAY_MS + XP_FILL_MS only) */
async function earn(P, { desk = false } = {}) {
  const at0 = await P.page.evaluate(() => (window._gameState.current._xpBar || {}).at || 0);
  let swings = 0;
  for (let tries = 0; tries < 18; tries++) {
    const m = (await near(P))[0];
    if (!m) break;
    if (m.d > 70) await H.hopTo(P, m.x, m.y + 50, { tries: 20 });
    await P.page.waitForTimeout(300);
    const m2 = (await near(P))[0] || m;
    if (desk ? await clickOn(P, m2) : await tapR(P)) swings++;
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(40);
      const b = await readBar(P);
      if (b.shown && b.cat === 'sword' && b.worker && b.worker.at !== at0) return { b, swings };
    }
  }
  return { b: null, swings };
}

/* one layout: a real gain, the moment after it and the moment after the fill */
async function layout(P, rec, OUT, tag, label, opts) {
  const { b, swings } = await earn(P, opts);
  /* the bar kept up for the pictures (a screenshot here takes seconds) */
  await P.page.evaluate(() => { window.__btXpHold = true; }).catch(() => {});
  await hold(P, true);
  await shot(P, join(OUT, `xpbar-${tag}-gain.png`));
  await hold(P, false);
  /* the title's 220 ms fade has run by now (the picture took longer) */
  const t = await readBar(P);
  console.log(`    ${label}: ${swings} swing(s) before the bar`);
  rec.ok(`${label}: a real hit brings the sword's bar (guard)`, !!b, null);
  if (!b) return null;
  const want = b.sk && b.sk.sword;
  rec.ok(`${label}: "${b.gainText}" pops LEFT of the picture, clear of the bar (gain ${b.gainBox && Math.round(b.gainBox.r)} <= icon ${b.iconBox && Math.round(b.iconBox.l)})`,
    !!b.gainBox && /^\+[\d.,]+ XP$/.test(b.gainText || '') && b.gainBox.r <= b.iconBox.l + 0.5 && b.gainBox.r <= b.trackBox.l, { gain: b.gainBox, icon: b.iconBox, track: b.trackBox });
  rec.ok(`${label}: the white stands at once at the worker's share (${b.whiteAt} = ${b.frac}), the gold behind it (${b.goldNow})`,
    Math.abs(b.whiteAt - b.frac) < 0.002 && Math.abs((b.whiteNow == null ? -1 : b.whiteNow) - b.frac) < 0.01 && b.goldNow != null && b.goldNow < b.whiteNow - 0.0005,
    { whiteAt: b.whiteAt, whiteNow: b.whiteNow, goldNow: b.goldNow, frac: b.frac });
  rec.ok(`${label}: inside the middle, nothing over the door, the AP or the gold`, clear(b),
    { bar: b.barBox, mid: b.mid, gain: b.gainBox, icon: b.iconBox, track: b.trackBox, ap: b.ap, gold: b.gold, door: b.door });
  /* the gold catches up (by the renderer's clock: polled, TRAPS §200) */
  let f = b;
  /* (not `shown` too: the picture above held the fill, and on this slow box
     the bar may be fading by now; the gold grows on under the fade) */
  for (let i = 0; i < 20 && !(Math.abs(f.goldNow - f.whiteNow) < 0.003); i++) {
    await P.page.waitForTimeout(100);
    f = await readBar(P);
  }
  await shot(P, join(OUT, `xpbar-${tag}-filled.png`));
  await P.page.evaluate(() => { window.__btXpHold = false; }).catch(() => {});
  rec.ok(`${label}: then the gold grows up to the white and covers it (${f.goldNow} / ${f.whiteNow})`,
    f.goldNow != null && Math.abs(f.goldNow - f.whiteNow) < 0.003 && Math.abs(f.goldNow - f.frac) < 0.003, { gold: f.goldNow, white: f.whiteNow, frac: f.frac, shown: f.shown });
  const words = want && b.worker ? xpToNextWords(want.xp, b.worker.need) : null;
  rec.ok(`${label}: once the count is done, "${f.numText}" on the bar, the worker's numbers (${words}), inside the track (${f.numW && Math.round(f.numW)} of ${f.trackBox && Math.round(f.trackBox.w)} px)`,
    !!words && f.numText === words && f.numW > 0 && f.numW <= f.trackBox.w - 4, { numText: f.numText, words, numW: f.numW, track: f.trackBox });
  return { b, f, t };
}

async function toFrost(P, wsPort, rec, label) {
  const me = await H.readState(P, (S) => S.myId);
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
  const n = await near(P);
  rec.ok(`${label}: at Frost Ridge's first snowmen (${n.length} near) (guard)`, n.length > 0, n.slice(0, 3));
  return n.length > 0 ? me : null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Xpbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let D = null;
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;

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

    const me = await toFrost(P, wsPort, rec, 'upright 390');
    if (!me) return;

    /* 2. upright 390: real hits */
    const sk0 = await H.readState(P, (S) => JSON.parse(JSON.stringify(S.rpg.prog3.sk.sword)));
    const lay = await layout(P, rec, OUT, '390', '2. upright 390', {});
    if (!lay) return;
    const b1 = lay.b;
    const want = b1.sk ? b1.sk.sword : null;
    const need = b1.worker ? b1.worker.need : null;
    rec.ok(`2. the sword's bar: "${b1.lvText}", ${b1.frac} of the way (the worker: level ${want && want.level}, ${want && Math.round(want.xp * 10) / 10} of ${need})`,
      b1.opacity > 0.3 && !!want && b1.level === want.level && b1.lvText === 'Lv ' + want.level
        && Math.abs(b1.frac - Math.min(1, want.xp / need)) < 0.002 && /scaleX\(/.test(b1.fillScale || ''), b1);
    rec.ok(`2. ...with the sword's picture (${(b1.icon || '').split('/').pop()}), loaded`,
      b1.icon === XP_BAR_ICONS.sword && b1.iconLoaded, b1.icon);
    const gained = want && sk0 ? (want.level === sk0.level ? want.xp - sk0.xp : null) : null;
    rec.ok(`2. ..."${b1.gainText}", the XP the worker added (${gained != null ? Math.round(gained * 10) / 10 : 'across a level'})`,
      b1.gain > 0 && (gained == null || Math.abs(b1.gain - gained) < 0.01), { gain: b1.gain, gained, sk0, want });
    /* read just after the gain's picture (which takes seconds on this box:
       the bar may have just been told to go, its title's fade back not yet
       begun) */
    const bF = lay.t;
    rec.ok(`2. ...the title and the hour's icon faded under it (${bF.titleOpacity}, ${bF.todOpacity}) but still there, "${bF.title}"`,
      bF.titleOpacity < 0.05 && (bF.todOpacity == null || bF.todOpacity < 0.05) && bF.title === 'BroTown', { t: bF.title, o: bF.titleOpacity, tod: bF.todOpacity, shown: bF.shown });

    /* 2b. v2.3.3796, the owner: "show the white bar longer ... make the fill
       up to that white portion slower.  Also instead of changing the whole
       xp number make it count up".  The gold's own transition, as the page
       has it: the white alone at least 0.5 s, the climb at least 1 s. */
    const trn = await P.page.evaluate(() => {
      const f = document.querySelector('[data-xp-bar] .bt-xp-bar__fill');
      const cs = f ? getComputedStyle(f) : null;
      return cs ? { delay: parseFloat(cs.transitionDelay) || 0, dur: parseFloat(cs.transitionDuration) || 0, ease: cs.transitionTimingFunction } : null;
    });
    rec.ok(`2b. the white stands alone ${trn && trn.delay} s, then the gold climbs over ${trn && trn.dur} s (${trn && trn.ease})`,
      !!trn && trn.delay >= 0.5 && trn.dur >= 1, trn);
    /* 2c. two gains in a row, the second mid-count: the number never goes
       back, and ends on the worker's XP (sampled in the page every 30 ms) */
    await P.page.waitForTimeout(XP_BAR_SHOW_MS + 300);
    /* (the fill and count stretched 4x, the QA switch: on this box a second
       real hit takes seconds to land, longer than the real count) */
    const SLOW = 4;
    await P.page.evaluate((k) => {
      window.__btXpSlow = k;
      const log = [];
      window.__xpNumLog = log;
      const t0 = performance.now();
      const id = setInterval(() => {
        const n = document.querySelector('[data-xp-bar="sword"] [data-xp-num]');
        const S = window._gameState.current;
        if (n) log.push({ t: Math.round(performance.now() - t0), text: n.textContent, at: (S._xpBar || {}).at || 0, lv: (S._xpBar || {}).level || 0 });
        if (log.length > 600 || window.__xpNumLog !== log) clearInterval(id);
      }, 30);
    }, SLOW);
    const g1 = await earn(P, {});
    let g2 = null;
    if (g1.b) {
      const at1 = g1.b.worker.at;
      for (let k = 0; k < 6 && !g2; k++) {
        await tapR(P);
        for (let i = 0; i < 12; i++) {
          await P.page.waitForTimeout(60);
          const w = await P.page.evaluate(() => { const B = window._gameState.current._xpBar; return B ? { at: B.at, xp: B.xp } : null; });
          if (w && w.at !== at1) { g2 = { ...w, after: w.at - at1 }; break; }
        }
      }
    }
    await P.page.waitForTimeout((XP_FILL_DELAY_MS + XP_FILL_MS) * SLOW + 600);
    const nl = await P.page.evaluate(() => { const l = window.__xpNumLog || []; window.__xpNumLog = null; window.__btXpSlow = 0; return l; });
    const endText = nl.length ? nl[nl.length - 1].text : null;
    const wantEnd = await P.page.evaluate(() => { const B = window._gameState.current._xpBar; return B ? { xp: B.xp, need: B.need, lv: B.level } : null; });
    const vals = nl.map((x) => ({ ...x, n: parseNum(x.text) })).filter((x) => x.n && x.lv === (wantEnd && wantEnd.lv));
    let back = null;
    for (let i = 1; i < vals.length; i++) if (vals[i].n.v < vals[i - 1].n.v - 1e-9) { back = [vals[i - 1], vals[i]]; break; }
    const firstV = vals.length ? vals[0].n.v : null, lastV = vals.length ? vals[vals.length - 1].n.v : null;
    const between = vals.some((x) => x.n.v > firstV + 1e-9 && x.n.v < lastV - 1e-9);
    rec.ok(`2c. two hits, the second ${g2 ? g2.after + ' ms' : 'not'} after the first: the number counts ${firstV} -> ${lastV} through ${vals.length} reads, never back${back ? ' (BACK: ' + JSON.stringify(back) + ')' : ''}, passing values between (${between})`,
      !!g1.b && !!g2 && g2.after < (XP_FILL_DELAY_MS + XP_FILL_MS) * SLOW && !back && between, { g2, vals: vals.map((x) => x.t + ':' + x.text).slice(0, 40) });
    rec.ok(`2c. ...and ends on the worker's XP ("${endText}" = "${wantEnd && xpToNextWords(wantEnd.xp, wantEnd.need)}")`,
      !!wantEnd && endText === xpToNextWords(wantEnd.xp, wantEnd.need), { endText, wantEnd });

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
      after != null && !!b2 && !b2.shown && b2.opacity < 0.05 && b2.titleOpacity > 0.99 && after >= XP_BAR_SHOW_MS, b2);

    /* 4. a level-up (the worker's level lever moves the bow's skill, its XP
       0 in the new level): the bow's bar; the white runs to the end with the
       gold after it, then the new level starts from what carried over */
    const bowWas = await H.readState(P, (S) => S.rpg.prog3.sk.bow.level);
    /* the steps, recorded in the page every 30 ms (a screenshot on this box
       takes longer than the whole level-up) */
    await P.page.evaluate(() => {
      /* the level-up's first step held long enough for the picture (the
         game's own 750 ms otherwise; the steps' order is the same), the bar
         kept up for them */
      window.__btXpWrapMs = 6000;
      window.__btXpHold = true;
      const t0 = performance.now(), log = [];
      window.__xpbarLog = log;
      const id = setInterval(() => {
        const bar = document.querySelector('[data-xp-bar]'), tr = bar && bar.querySelector('.bt-xp-bar__track');
        if (!bar || bar.getAttribute('data-xp-bar') !== 'bow' || bar.getAttribute('data-xp-shown') !== '1') return;
        const m = /matrix\(([^,]+)/.exec(getComputedStyle(bar.querySelector('.bt-xp-bar__fill')).transform || '');
        const white = Number(tr.getAttribute('data-xp-white'));
        log.push({ t: Math.round(performance.now() - t0), white,
          gold: m ? Math.round(parseFloat(m[1]) * 1000) / 1000 : null, lv: Number(bar.getAttribute('data-xp-level')),
          text: (bar.querySelector('[data-xp-num]') || {}).textContent || null });
        /* the picture of the run to the end: the gold held where it was
           when the white first stood at the end */
        if (white >= 0.999 && !window.__xpbarHeld) {
          window.__xpbarHeld = 1;
          for (const a of document.getAnimations()) { const t = a.effect && a.effect.target; if (t && t.matches && t.matches('.bt-xp-bar__fill, .bt-xp-gain')) a.pause(); }
          window.__xpbarHeld = 2;
        }
        if (log.length > 400) clearInterval(id);
      }, 30);
    });
    await H.devOp(wsPort, 'combat', me, { skill: 'bow', level: bowWas + 1 }).catch(() => null);
    let b3 = null;
    for (let i = 0; i < 60; i++) {
      await P.page.waitForTimeout(100);
      b3 = await readBar(P);
      if (b3.shown && b3.cat === 'bow') break;
    }
    const b3a = b3;
    await P.page.waitForFunction(() => window.__xpbarHeld === 2, null, { timeout: 5000 }).catch(() => {});
    await shot(P, join(OUT, 'xpbar-levelup-1-end.png'));
    await hold(P, false);
    await P.page.waitForFunction(() => { const tr = document.querySelector('[data-xp-bar="bow"] .bt-xp-bar__track'); return tr && Number(tr.getAttribute('data-xp-white')) < 0.999; },
      null, { timeout: 9000 }).catch(() => {});
    await P.page.evaluate(() => { window.__btXpWrapMs = 0; });
    await P.page.waitForTimeout(XP_FILL_DELAY_MS + XP_FILL_MS + 300);
    b3 = await readBar(P);
    await shot(P, join(OUT, 'xpbar-levelup-2-new.png'));
    await P.page.evaluate(() => { window.__btXpHold = false; });
    const seenAll = await P.page.evaluate(() => window.__xpbarLog || []);
    /* the first samples, then each change */
    const seen = seenAll.filter((x, i) => i < 3 || x.white !== seenAll[i - 1].white || Math.abs((x.gold || 0) - (seenAll[i - 1].gold || 0)) > 0.05);
    rec.ok(`4. XP into the bow brings the bow's bar and picture ("${b3a && b3a.lvText}", ${(b3a && b3a.icon || '').split('/').pop()})`,
      !!b3a && b3a.shown && b3a.cat === 'bow' && b3a.icon === XP_BAR_ICONS.bow && b3a.iconLoaded && b3a.level === bowWas + 1, b3a && { lv: b3a.lvText, icon: b3a.icon, shown: b3a.shown });
    const iEnd = seenAll.findIndex((x) => x.white >= 0.999);
    /* the gold ran up behind the white: short of half while the white was at
       the end, then past half before the new level (this box samples a few
       times a second, TRAPS §200) */
    const atEnd = iEnd >= 0 ? seenAll.slice(iEnd).filter((x) => x.white >= 0.999) : [];
    const goldRan = atEnd.some((x) => x.gold != null && x.gold < 0.5)
      && atEnd.some((x, i) => i > 0 && x.gold != null && x.gold >= 0.5);
    const ranToEnd = iEnd >= 0 && goldRan;
    const lastS = seenAll[seenAll.length - 1];
    const startedOver = iEnd >= 0 && !!lastS && seenAll.indexOf(lastS) > iEnd && lastS.white <= 0.001 && lastS.gold != null && lastS.gold <= 0.01;
    rec.ok(`4. a level-up: the white ran to the end with the gold after it (${ranToEnd}), then the new level from what carried over, empty here (${startedOver}); "${b3 && b3.numText}"`,
      ranToEnd && startedOver && !!b3 && b3.numText === xpToNextWords(0, b3.worker && b3.worker.need), seen.slice(0, 30));
    /* v2.3.3796: the number on the run to the end counts to the OLD level's
       end ("n / old"), passing values between, then the new level's count
       ("0 / new": the lever carries nothing over) */
    const nums = seenAll.map((x) => ({ t: x.t, white: x.white, n: parseNum(x.text) })).filter((x) => x.n);
    const newNeed = b3 && b3.worker ? b3.worker.need : null;
    const oldOf = nums.length ? nums[0].n.of : null;
    const oldMid = nums.some((x) => x.n.of === oldOf && x.n.v > 0 && x.n.v < oldOf);
    const oldEnd = nums.some((x) => x.n.of === oldOf && x.n.v === oldOf);
    const iNew = nums.findIndex((x) => x.n.of === newNeed && newNeed !== oldOf);
    const newEnd = iNew >= 0 && nums.slice(iNew).every((x) => x.n.of === newNeed) && nums[nums.length - 1].n.v === 0;
    rec.ok(`4. ...the number counts to the old level's end (of ${oldOf}: between ${oldMid}, at the end ${oldEnd}), then the new level's (of ${newNeed}: "${nums.length ? nums[nums.length - 1].n.v + ' / ' + nums[nums.length - 1].n.of : '-'}")`,
      oldMid && oldEnd && newEnd, nums.slice(0, 40).map((x) => x.t + ':' + x.n.v + '/' + x.n.of));

    /* 5. a 320 px phone: real hits */
    await P.page.setViewportSize({ width: 320, height: 700 });
    await P.page.waitForTimeout(XP_BAR_SHOW_MS + 300);
    await layout(P, rec, OUT, '320', '5. upright 320', {});
    const t320 = await readBar(P);
    rec.ok(`5. at 320 px the bar keeps its width (track ${t320.trackBox ? Math.round(t320.trackBox.w) : '-'} px >= 66)`,
      !!t320.trackBox && t320.trackBox.w >= 65.5, t320.trackBox);

    /* 6. sideways: real hits */
    await P.page.setViewportSize({ width: 844, height: 390 });
    await P.page.waitForTimeout(XP_BAR_SHOW_MS + 600);
    const orient = await P.page.evaluate(() => document.documentElement.getAttribute('data-orient'));
    rec.ok(`6. sideways (guard): ${orient}`, orient === 'landscape', orient);
    await layout(P, rec, OUT, 'sideways', '6. sideways', {});

    rec.ok('7. no page errors (phone)', errors.length === 0, errors.slice(0, 3));
    await P.ctx.close().catch(() => {});

    /* 8. a computer playing wide (src/ui/deskWide.js): real clicks */
    D = await H.newPlayer(browser, { name: 'Xpdesk', wsPort, webPort, viewport: { width: 1280, height: 800 }, dpr: 2, world: 'wheel', wide: true });
    const dErrors = [];
    D.page.on('pageerror', (e) => dErrors.push(String((e && e.message) || e).slice(0, 200)));
    await H.enterWorld(D);
    const inD = await H.waitFor(D, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('8. a computer in the world (guard)', !!inD, inD);
    if (!inD) return;
    if (!await toFrost(D, wsPort, rec, '8. computer wide')) return;
    await layout(D, rec, OUT, 'desk', '8. computer wide', { desk: true });
    rec.ok('8. no page errors (computer)', dErrors.length === 0, dErrors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
    if (D) await D.ctx.close().catch(() => {});
  }
}
