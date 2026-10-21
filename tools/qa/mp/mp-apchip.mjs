/* ═══ YOUR ACHIEVEMENT POINTS ON THE TOP BAR (v2.3.3553, docs/specs/ap-on-the-bar.md) ═══
 *
 * The owner, 2026-10-21: "Achievement points should be a prominent part of
 * the experience in brotown."  One real player against a real worker, on a
 * phone (390 x 844, touch, a real finger), IN THE WORLD (`world: 'wheel'`):
 *   1. a fresh character: the bar shows the owner's medal and "0", left of
 *      the zone name and clear of it and of the gold, a thumb's height;
 *   2. a first kill (the test lever kills a monster for you): First Blood,
 *      +10 AP from the WORKER -- the bar reads 10 and a "+10" flies up into
 *      it, and the chat says the achievement;
 *   3. a tap on it opens the Achievements page, whose header reads the same
 *      10 AP;
 *   4. it fits at 320 px upright and sideways (nothing overlapping);
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/apchip-{bar,gain,page,narrow,side}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

const bar = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height }; };
  const chip = document.querySelector('[data-ap-chip]');
  const img = chip && chip.querySelector('img');
  const gain = chip && chip.querySelector('[data-ap-gain]');
  return {
    chip: r(chip), ap: chip ? Number(chip.getAttribute('data-ap')) : null,
    text: chip ? (chip.querySelector('span') || {}).textContent : null,
    medal: !!(img && img.complete && img.naturalWidth > 0),
    gain: gain ? { n: Number(gain.getAttribute('data-ap-gain')), text: gain.textContent.trim() } : null,
    title: r(document.querySelector('[data-zone-title]')),
    titleText: (document.querySelector('[data-zone-title]') || {}).textContent || null,
    purse: r(document.querySelector('[data-purse]')),
    door: r(document.querySelector('.bt-zone-header__logout')),
    vw: window.innerWidth,
  };
});
const apart = (a, b) => !!a && !!b && (a.right <= b.left + 0.5 || b.right <= a.left + 0.5);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  /* the harness calms every page's motion (__btAmbienceOff), and the "+N",
     like the purse's coin, keeps still under calm motion: this page moves */
  const P = await H.newPlayer(browser, { name: 'Medalist', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel',
    init: 'window.__btAmbienceOff = false;' });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `apchip-${name}.png`) }).catch(() => {});
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  await H.pastWelcome(P);
  const me = await H.readState(P, (S) => S.myId);
  const zone = await H.readState(P, (S) => S.currentZone);
  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.achievements));

  /* ── 1. the medal and 0, beside the zone name ── */
  let b0 = null;
  for (let i = 0; i < 30; i++) { b0 = await bar(P); if (b0.chip && b0.medal) break; await P.page.waitForTimeout(300); }
  await shot('bar');
  rec.ok(`1: in the world (zone "${zone}", "${b0 && b0.titleText}"), the bar shows the medal and "${b0 && b0.text}" AP`,
    zone === 'wheel' && caps && !!b0.chip && b0.medal && b0.ap === 0 && b0.text === '0', b0);
  rec.ok('1: ...left of the zone name, right of the door, clear of the gold, a thumb\'s height',
    apart(b0.door, b0.chip) && b0.door.right <= b0.chip.left + 0.5 && apart(b0.chip, b0.title) && b0.chip.right <= b0.title.left + 0.5
      && apart(b0.chip, b0.purse) && b0.chip.h >= 34 && b0.chip.w >= 44, b0);

  /* ── 2. a first kill: First Blood, +10 AP ── */
  let killed = null;
  for (const home of ['verdant', 'frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist']) {
    for (let k = 0; k < 6 && !killed; k++) {
      const r = await H.devOp(wsPort, 'killroll', me, { kill: 'wm-' + home + '-' + k }).catch(() => null);
      if (r && r.ok && r.killed) killed = r.killed;
    }
    if (killed) break;
  }
  let b1 = null, gained = null, seen = null;
  const look = () => P.page.evaluate(() => {
    const g = document.querySelector('[data-ap-gain]');
    if (!g) return null;
    const cs = getComputedStyle(g), r = g.getBoundingClientRect();
    /* inside the bar's own box (the world draws over anything below it) */
    const hb = document.querySelector('.bt-zone-header').getBoundingClientRect();
    return { opacity: Number(cs.opacity), anim: cs.animationName, top: Math.round(r.top), bottom: Math.round(r.bottom), barBottom: Math.round(hb.bottom),
      calm: document.documentElement.classList.contains('bt-calm') };
  });
  for (let i = 0; i < 40; i++) {
    b1 = await bar(P);
    if (b1.gain && !gained) {
      gained = b1.gain;
      /* how it is drawn while it flies (it is gone in 1.4 s): the most
         visible moment, and its picture then */
      for (let k = 0; k < 12; k++) {
        const v = await look();
        if (v && (!seen || v.opacity > seen.opacity)) seen = v;
        if (v && v.opacity > 0.6) {
          /* this box draws a few frames a second, so by the time a picture
             is taken the 1.4 s flight is over: play it again, held at its
             middle, for the picture of how it is drawn */
          await P.page.evaluate(() => {
            const g = document.querySelector('[data-ap-gain]');
            if (!g) return;
            g.style.animation = 'none';
            void g.offsetWidth;
            g.style.animation = 'bt-ap-gain 1400ms cubic-bezier(.2,.8,.2,1) -0.5s 1 forwards paused';
          });
          await P.page.waitForTimeout(400);
          await shot('gain');
          await P.page.evaluate(() => { const g = document.querySelector('[data-ap-gain]'); if (g) g.style.animation = ''; });
          break;
        }
        await P.page.waitForTimeout(60);
      }
    }
    if (b1.ap === 10 && gained) break;
    await P.page.waitForTimeout(100);
  }
  if (!seen || seen.opacity <= 0.6) await shot('gain');
  const line = await P.page.evaluate(() => ((window._gameState.current.chatLog || []).map((l) => l.text).find((t) => /First Blood/.test(t || '')) || null));
  rec.ok(`2: a first kill (${killed}): the worker's 10 AP on the bar ("${b1 && b1.text}"), a "${gained && gained.text}" flying into it, and the chat line "${line}"`,
    !!killed && !!b1 && b1.ap === 10 && b1.text === '10' && !!gained && gained.n === 10 && gained.text === '+10' && !!line,
    { killed, b1, gained, line });
  rec.ok(`2: ...and the "+10" is drawn inside the bar as it flies (opacity ${seen && seen.opacity.toFixed(2)}, ${seen && seen.top}-${seen && seen.bottom} px, the bar to ${seen && seen.barBottom})`,
    !!seen && seen.opacity > 0.6 && seen.top >= 0 && seen.bottom <= seen.barBottom && !seen.calm, seen);

  /* ── 3. a tap opens the Achievements page ── */
  const c = b1.chip;
  await P.page.touchscreen.tap(Math.round(c.left + c.w / 2), Math.round(c.top + c.h / 2));
  let page = null;
  for (let i = 0; i < 30; i++) {
    page = await P.page.evaluate(() => {
      const t = document.querySelector('[data-achv-ap-total]');
      const row = document.querySelector('[data-achv-row="first_blood"]');
      return t ? { total: Number(t.getAttribute('data-achv-ap-total')), firstBlood: row ? row.getAttribute('data-achv-got') : null } : null;
    });
    if (page) break;
    await P.page.waitForTimeout(200);
  }
  await P.page.waitForTimeout(400);
  await shot('page');
  rec.ok(`3: a tap opens the Achievements page, reading the same ${page && page.total} AP, First Blood earned`,
    !!page && page.total === 10 && page.firstBlood === '1', page);

  /* ── 4. narrow and sideways ── */
  await P.page.keyboard.press('Escape').catch(() => {});
  await P.page.setViewportSize({ width: 320, height: 640 });
  await P.page.waitForTimeout(1500);
  const b2 = await bar(P);
  await shot('narrow');
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(2000);
  const b3 = await bar(P);
  await shot('side');
  const fits = (b) => !!b && !!b.chip && apart(b.door, b.chip) && apart(b.chip, b.title) && apart(b.chip, b.purse) && apart(b.title, b.purse)
    && b.chip.left >= 0 && b.purse.right <= b.vw + 0.5;
  rec.ok(`4: it fits at 320 px upright ("${b2 && b2.titleText}" kept whole: ${b2 && b2.title && Math.round(b2.title.w)} px) and sideways`,
    fits(b2) && fits(b3), { b2, b3 });

  rec.ok(`5: no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
