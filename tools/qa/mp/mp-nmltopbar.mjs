/* ═══ NO MAN'S LAND'S PILL, IN THE TOP BAR RIGHT OF "BroTown" (v2.3.3765) ═══
 *
 * The owner: "I think the no man's land pill would work better just to the
 * right of the Brotown name at the top (you can cut it away same as when
 * earning xp in a weapon)" (src/ui/mobile/NmlBadge.jsx NmlPill,
 * ZoneHeader.jsx).
 *
 * One player in the world, walked onto No man's land 1's ring:
 *   1. the pill is in the top bar, just right of the title, on top (a tap at
 *      its middle reaches it), the title whole (no ellipsis) and its text
 *      exactly "BroTown" (the zone banner's dock target), the purse whole --
 *      upright at 320, 360, 375, 390 and 430, sideways at 667 x 375,
 *      844 x 390 and the short 568 x 320, then the same with TEST MODE on
 *      (its tag beside the title); the pill nothing of the bar's other
 *      controls (the door, the AP);
 *   2. 390 x 844: while the XP bar is up the pill is cut away with the title
 *      (gone, and no tap reaches it), and back when the bar goes; pictures:
 *      tools/qa/mp/out/nmltopbar-{nml,xp,after}.png;
 *   3. a tap opens the explainer, and the red line along the band is up;
 *   4. a computer's wide layout (a second player, `wide: true`): the pill
 *      right of the title there too;
 *   5. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* the bar's pieces, in CSS px, and what a tap at the pill's middle reaches */
const bar = (P) => P.page.evaluate(() => {
  const box = (sel) => {
    const n = document.querySelector(sel);
    if (!n) return null;
    const q = n.getBoundingClientRect();
    if (!(q.width > 0 && q.height > 0)) return null;
    return { l: Math.round(q.left), r: Math.round(q.right), t: Math.round(q.top), b: Math.round(q.bottom) };
  };
  const pillEl = document.querySelector('[data-nml-badge]');
  const pill = box('[data-nml-badge] .bt-nml-pill__body');
  const title = document.querySelector('[data-zone-title]');
  let top = null;
  if (pill) {
    const el = document.elementFromPoint((pill.l + pill.r) / 2, (pill.t + pill.b) / 2);
    top = !!el && !!pillEl && (el === pillEl || pillEl.contains(el));
  }
  return {
    vw: innerWidth, vh: innerHeight, orient: document.documentElement.getAttribute('data-orient'),
    pill, top, at: pillEl ? pillEl.getAttribute('data-nml-at') : null,
    opacity: pillEl ? +getComputedStyle(pillEl).opacity : null,
    header: box('.bt-zone-header'), title: box('[data-zone-title]'),
    titleText: title ? title.textContent : null,
    titleCut: title ? title.scrollWidth > title.clientWidth + 1 : null,
    purse: box('[data-purse]'), ap: box('[data-ap-chip]'), door: box('.bt-zone-header__logout'),
    test: box('[data-test-mode-tag]'), xp: !!document.querySelector('.bt-zone-header__mid--xp'),
  };
});
const overlaps = (a, b) => !!a && !!b && !(a.r <= b.l || a.l >= b.r || a.b <= b.t || a.t >= b.b);
/* right of the title, close by (the TEST MODE tag stands after it), in the
   bar, on top, nothing of the bar under it, the title and the purse whole */
const placed = (L) => !!L.pill && !!L.title && !!L.header && L.top === true && L.at === 'bar'
  && L.pill.l >= L.title.r && L.pill.l - L.title.r <= 14
  && L.pill.t >= L.header.t && L.pill.b <= L.header.b && L.pill.r <= L.vw
  && !overlaps(L.pill, L.purse) && !overlaps(L.pill, L.ap) && !overlaps(L.pill, L.door) && !overlaps(L.pill, L.test)
  && L.titleCut === false && L.titleText === 'BroTown' && !!L.purse && L.purse.r <= L.vw;

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  const P = await H.newPlayer(browser, { name: 'Ringbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let D = null;
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', myId);   /* past the Mayor's gate: the lands are open */
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    /* onto No man's land 1's ring, in a land's spoke (mp-nmlfoe's way) */
    const LONG = (await H.wheelGeom()).long;
    const { WHEEL_SPAWNS, WHEEL_CENTRE } = await import(H.REPO + '/server/src/wheelspawns.js');
    const { NML } = await import(H.REPO + '/src/data/noMansLandRings.js');
    const T = NML.TIER * LONG;
    const r0 = Math.max(NML.SAFE_R || 0, NML.HUB + (NML.FIRST_TIER - 1) * T), r1 = NML.HUB + NML.FIRST_TIER * T;
    let lvl = 0, spot = null;
    for (const land of Object.keys(WHEEL_SPAWNS).slice(0, 4)) {
      const a = WHEEL_SPAWNS[land].anchor;
      const L = Math.hypot(a[0] - WHEEL_CENTRE[0], a[1] - WHEEL_CENTRE[1]);
      const ux = (a[0] - WHEEL_CENTRE[0]) / L, uy = (a[1] - WHEEL_CENTRE[1]) / L;
      const r = (r0 + r1) / 2;
      spot = { land, x: Math.round(WHEEL_CENTRE[0] + ux * r), y: Math.round(WHEEL_CENTRE[1] + uy * r) };
      await H.hopTo(P, spot.x, spot.y, { tries: 120, step: 150 });
      lvl = await H.waitFor(P, () => (window.__btNmlBadge ? window.__btNmlBadge().lvl : 0), (v) => v > 0, { timeout: 8000, label: 'No man\'s land' }).catch(() => 0);
      if (lvl) break;
    }
    rec.ok(`in No man's land ${lvl} (guard: ${spot && spot.land})`, lvl > 0, spot);
    if (!lvl) return;

    /* ── 1. every width, then with TEST MODE on ── */
    const sizes = [[320, 640], [360, 780], [375, 812], [390, 844], [430, 932], [667, 375], [844, 390], [568, 320]];
    const pass = async (tag) => {
      for (const [w, h] of sizes) {
        await P.page.setViewportSize({ width: w, height: h });
        await P.page.waitForTimeout(1600);
        const L = await bar(P);
        const side = L.orient === 'landscape';
        rec.ok(`1${tag}. ${w} x ${h}${side ? ' (sideways)' : ''}: the pill (${L.pill ? L.pill.l + '-' + L.pill.r + ', ' + L.pill.t + '-' + L.pill.b : 'none'}) in the top bar just right of "${L.titleText}" (${L.title ? L.title.l + '-' + L.title.r : 'none'})${L.top ? '' : ' UNDER SOMETHING'}, the title whole (${L.titleCut ? 'CUT' : 'yes'}), the purse whole, clear of the door, the AP${tag ? ' and TEST MODE (' + (L.test ? L.test.l + '-' + L.test.r : 'none') + ')' : ''}`,
          placed(L) && (!tag || !!L.test), L);
        if (w === 320 || w === 568) await P.page.screenshot({ path: join(OUT, `nmltopbar-${w}${tag ? '-test' : ''}.png`), clip: { x: 0, y: 0, width: w, height: 60 } }).catch(() => {});
      }
    };
    await pass('');
    await H.devOp(wsPort, 'testmode', myId, { on: true });
    const tm = await H.waitFor(P, () => !!document.querySelector('[data-test-mode-tag]'), (v) => v, { timeout: 8000, label: 'TEST MODE' }).catch(() => false);
    rec.ok('TEST MODE on (guard)', !!tm);
    if (tm) await pass('t');
    await H.devOp(wsPort, 'testmode', myId, { on: false });
    await P.page.setViewportSize(PHONE);
    await P.page.waitForTimeout(1800);

    /* ── 2. the XP bar cuts it away, and it comes back ── */
    const clip = { x: 0, y: 0, width: PHONE.width, height: 70 };
    const L0 = await bar(P);
    await P.page.screenshot({ path: join(OUT, 'nmltopbar-nml.png'), clip }).catch(() => {});
    await P.page.screenshot({ path: join(OUT, 'nmltopbar-nml-full.png') }).catch(() => {});
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      window.__btXpHold = true;
      S._xpBar = { cat: 'sword', level: 4, xp: 45, need: 120, frac: 0.375, gain: 3, gainAt: Date.now(), seq: 1, at: Date.now(), up: false, fromLevel: 4, fromFrac: 0.35 };
    });
    const xpUp = await H.waitFor(P, () => !!document.querySelector('.bt-zone-header__mid--xp'), (v) => v, { timeout: 4000, label: 'the XP bar' }).catch(() => false);
    /* the fade (220 ms) as this slow box draws it */
    await H.waitFor(P, () => { const b = document.querySelector('[data-nml-badge]'); return b ? +getComputedStyle(b).opacity : null; }, (v) => v === 0, { timeout: 5000, label: 'faded' }).catch(() => null);
    const L1 = await bar(P);
    await P.page.screenshot({ path: join(OUT, 'nmltopbar-xp.png'), clip }).catch(() => {});
    rec.ok(`2. while the XP bar is up the pill is cut away with the title (opacity ${L1.opacity}, a tap at its middle ${L1.top ? 'REACHES it' : 'does not reach it'})`,
      !!xpUp && L1.xp && L1.opacity === 0 && L1.top === false, L1);
    await P.page.evaluate(() => { window.__btXpHold = false; window._gameState.current._xpBar = null; });
    await H.waitFor(P, () => !document.querySelector('.bt-zone-header__mid--xp'), (v) => v, { timeout: 4000, label: 'the bar gone' }).catch(() => null);
    await H.waitFor(P, () => { const b = document.querySelector('[data-nml-badge]'); return b ? +getComputedStyle(b).opacity : null; }, (v) => v === 1, { timeout: 5000, label: 'back' }).catch(() => null);
    const L2 = await bar(P);
    await P.page.screenshot({ path: join(OUT, 'nmltopbar-after.png'), clip }).catch(() => {});
    rec.ok(`2. ...and back when the bar goes (opacity ${L2.opacity}), where it was`, placed(L2) && L2.opacity === 1 && !!L0.pill && L2.pill.l === L0.pill.l, { L0: L0.pill, L2 });

    /* ── 3. a tap opens the explainer; the red line is up ── */
    const c = L2.pill ? { x: (L2.pill.l + L2.pill.r) / 2, y: (L2.pill.t + L2.pill.b) / 2 } : null;
    if (c) await P.page.touchscreen.tap(c.x, c.y);
    const info = await H.waitFor(P, () => { const n = document.querySelector('[data-nml-info]'); return n ? n.getAttribute('data-nml-info') : null; }, (v) => !!v, { timeout: 4000, label: 'the explainer' }).catch(() => null);
    const line = await P.page.evaluate(() => !!document.querySelector('[data-nml-line]'));
    rec.ok(`3. a real tap on the pill opens the explainer (No man's land ${info}), and the red line along the band is up`, !!info && line, { info, line });

    /* ── 4. a computer's wide layout ── */
    D = await H.newPlayer(browser, { name: 'Deskbro', wsPort, webPort, viewport: { width: 1440, height: 900 }, wide: true, guest: true, world: 'wheel' });
    D.page.on('pageerror', (e) => errors.push('desk: ' + String((e && e.message) || e).slice(0, 200)));
    await H.enterWorld(D);
    const dId = await H.readState(D, (S) => S.myId);
    await H.devOp(wsPort, 'quests', dId);
    await H.devOp(wsPort, 'vitals', dId, { heal: true, god: true, godMinutes: 30 });
    await H.hopTo(D, spot.x + 60, spot.y, { tries: 120, step: 150 });
    const dl = await H.waitFor(D, () => (window.__btNmlBadge ? window.__btNmlBadge().lvl : 0), (v) => v > 0, { timeout: 8000, label: 'No man\'s land (computer)' }).catch(() => 0);
    await D.page.waitForTimeout(800);
    const LD = await bar(D);
    await D.page.screenshot({ path: join(OUT, 'nmltopbar-desk.png'), clip: { x: 0, y: 0, width: 1440, height: 80 } }).catch(() => {});
    rec.ok(`4. on a computer (the wide layout) the pill is right of the title too (${LD.pill ? LD.pill.l + '-' + LD.pill.r : 'none'})`, dl > 0 && placed(LD), LD);

    rec.ok(`5. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
    if (D) await D.ctx.close().catch(() => {});
  }
}
