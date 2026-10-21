/* ═══ THE POINTS TAB'S TWO HEADS IN THE OWNER'S ART (v2.3.3553, docs/specs/points-heads.md) ═══
 *
 * The owner, 2026-10-21, with a sheet of art and a mockup: "On the character
 * points screen swap out the old style icons with these.  It should look
 * similar to the second screenshot mockup but it won't have the shaped
 * backgrounds behind the icons.  Also the character icon should have the up
 * arrow instead of the 4 point star."
 *
 * mp-catgrid holds the grid's contract (every count is the worker's, inside
 * its head, in the sheet's numerals; the frames and icons the sheet's; one
 * width).  This scenario holds the STATES it never reaches, each pictured:
 *   1. a phone (390 x 844, 3x): every pool full, every count gold and
 *      breathing;
 *   2. the spend window: a weapon stat's three lane tabs wear the sheet's
 *      sword, staff and bow, a shared stat's one tab its bust;
 *   3. Bow 4 alone (the test lever deals its points): the sword's and staff's
 *      counts GREY 0 and still, the bow's and the character's GOLD 9 and
 *      breathing -- the sheet's colour rule, per pool;
 *   4. every weapon level 1: every count a grey 0, nothing breathing;
 *   5. every weapon level 50: three numerals, "147", drawn whole (never
 *      "99+") and inside its head, upright at 390 and 320 and sideways;
 *   6. sideways the weapons' icons are 12 px or more (the first cut's were 9:
 *      the head is 1.45 of a cell there) and no stat name is cut;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/pointheads-<view>-<state>.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(H.REPO, 'tools/qa/mp/out');

async function openPoints(P, land) {
  if (land) {
    await P.page.evaluate(() => window.__broDashPanelBus && window.__broDashPanelBus.open('hero'));
    await P.page.waitForTimeout(900);
  } else {
    await H.openDest(P, 'Character');
    await P.page.waitForTimeout(600);
  }
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
    .first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(900);
}

/* The heads as drawn: each count's numerals read back off their files
   (gold-6.png gold-3.png -> "63", gold), whether it breathes, and whether it
   lies inside its head; the worker's pools beside them. */
const readHeads = (P) => P.page.evaluate(() => {
  const R = window._gameState && window._gameState.current && window._gameState.current.rpg;
  const p = (R && R.prog3) || {};
  const pb = p.poolBy || {};
  const total = typeof p.pool === 'number' ? Math.floor(p.pool) : 0;
  const free = Math.max(0, total - ['sword', 'bow', 'staff'].reduce((n, k) => n + (pb[k] || 0), 0));
  const want = { shared: (p.shared || 0) + free };
  for (const k of ['sword', 'bow', 'staff']) want[k] = (pb[k] || 0) + free;
  const out = {};
  for (const b of document.querySelectorAll('[data-prog3-grid] [data-prog3-head-badge]')) {
    const imgs = [...b.querySelectorAll('img')];
    const m = imgs.map((i) => /\/(gold|grey)-(\d)\.png/.exec(i.getAttribute('src') || ''));
    const head = b.closest('[data-prog3-lane]');
    const r = b.getBoundingClientRect();
    const hr = head ? head.getBoundingClientRect() : null;
    out[b.getAttribute('data-prog3-head-badge')] = {
      text: m.map((x) => (x ? x[2] : '?')).join(''),
      tone: [...new Set(m.map((x) => (x ? x[1] : '?')))].join(','),
      breathes: b.classList.contains('bt-pts-count'),
      decoded: imgs.length > 0 && imgs.every((i) => i.naturalWidth > 0),
      h: +r.height.toFixed(1),
      inHead: !!hr && r.left >= hr.left - 0.5 && r.right <= hr.right + 0.5 && r.top >= hr.top - 0.5 && r.bottom <= hr.bottom + 0.5,
    };
  }
  const icons = [...document.querySelectorAll('[data-points-row] > img')].map((i) => +i.getBoundingClientRect().width.toFixed(1));
  const cut = [...document.querySelectorAll('[data-stat-caption]')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent);
  return { out, want, icons, cut };
});

/* Wait for what the test lever changed to reach the heads, and for anything
   drawn over the grid (a level-up's celebration) to go, then picture it. */
async function settle(P, want, shotName) {
  let h = null;
  for (let i = 0; i < 40; i++) {
    h = await readHeads(P);
    const covered = await P.page.evaluate(() => {
      const g = document.querySelector('[data-prog3-grid] [data-prog3-lane]');
      if (!g) return true;
      const r = g.getBoundingClientRect();
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !(at && g.contains(at)) && at !== g;
    });
    if (!covered && want(h)) break;
    await P.page.waitForTimeout(250);
  }
  await P.page.waitForTimeout(300);
  const box = await P.page.evaluate(() => {
    const g = document.querySelector('[data-prog3-grid]');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8), width: r.width + 16, height: r.height + 16 };
  });
  if (box) await P.page.screenshot({ path: join(OUT, `pointheads-${shotName}.png`), clip: box }).catch(() => {});
  return h;
}

const counts = (h) => Object.fromEntries(Object.entries(h.out).map(([k, v]) => [k, `${v.text} ${v.tone}${v.breathes ? ' ~' : ''}`]));

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  for (const [view, vp, land, who] of [
    ['390', { width: 390, height: 844 }, false, 'Headsa'],
    ['320', { width: 320, height: 568 }, false, 'Headsb'],
    ['land', { width: 844, height: 390 }, true, 'Headsc'],
  ]) {
    /* every player joins upright, the sideways one rotates after (the
       creator cannot be finished sideways: mp-catgrid) */
    const P = await H.newPlayer(browser, { name: who, wsPort, webPort,
      viewport: land ? { width: 390, height: 844 } : vp, touch: true, dpr: 3 });
    await H.enterWorld(P);
    await P.page.waitForTimeout(1500);
    if (land) { await P.page.setViewportSize(vp); await P.page.waitForTimeout(1100); }
    const id = await H.readState(P, (S) => S.myId);
    /* the pictures are of a count at rest; whether it breathes is its class */
    await P.page.addStyleTag({ content: '.bt-pts-count,.bt-pts-count::before{animation:none !important}' }).catch(() => {});

    if (view === '390') {
      /* ── 1. every pool full ── */
      await H.devOp(wsPort, 'kit', id, { what: 'levels' });
      await openPoints(P, land);
      const full = await settle(P, (h) => ['sword', 'staff', 'bow', 'shared'].every((k) => h.out[k] && Number(h.out[k].text) === h.want[k] && h.want[k] > 0), `${view}-full`);
      rec.ok(`${view}: every pool's count is the worker's, GOLD and breathing (${JSON.stringify(counts(full))})`,
        ['sword', 'staff', 'bow', 'shared'].every((k) => full.out[k] && Number(full.out[k].text) === full.want[k] && full.want[k] > 0
          && full.out[k].tone === 'gold' && full.out[k].breathes && full.out[k].decoded),
        { counts: counts(full), want: full.want });

      /* ── 2. the spend window's lane tabs ── */
      const tabs = async (sel) => {
        const at = await P.page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          el.scrollIntoView({ block: 'center' });
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        }, sel);
        if (!at) return null;
        await P.page.touchscreen.tap(at.x, at.y);
        let t = null;
        for (let i = 0; i < 20; i++) {
          t = await P.page.evaluate(async () => {
            const els = [...document.querySelectorAll('[data-infopopup-lanes] [data-infopopup-lane]')];
            if (!els.length) return null;
            const res = [];
            for (const e of els) {
              const img = e.querySelector('img');
              if (img && !img.complete) { try { await img.decode(); } catch (er) { /* counted below */ } }
              res.push({ lane: e.getAttribute('data-infopopup-lane'),
                icon: img ? (img.getAttribute('src') || '').split('?')[0] : null, w: img ? img.naturalWidth : 0 });
            }
            return res;
          });
          if (t) break;
          await P.page.waitForTimeout(200);
        }
        return t;
      };
      const laneTabs = await tabs('[data-prog3-row^="sword:"]');
      await P.page.screenshot({ path: join(OUT, `pointheads-${view}-window.png`) }).catch(() => {});
      rec.ok(`${view}: a weapon stat's window wears the sheet's sword, staff and bow on its three lane tabs`,
        !!laneTabs && laneTabs.map((t) => `${t.lane}:${(t.icon || '').split('/').pop()}`).join(' ') === 'sword:sword.png staff:staff.png bow:bow.png'
          && laneTabs.every((t) => t.w > 0 && /^\/icons\/ui\/points\//.test(t.icon)), laneTabs);
      await P.page.evaluate(() => { const x = document.querySelector('[data-infopopup-x]'); if (x) x.click(); });
      await P.page.waitForTimeout(500);
      const sharedTabs = await tabs('[data-prog3-row^="shared:"]');
      rec.ok(`${view}: ...and a shared stat's one tab wears the bust with the up arrow`,
        !!sharedTabs && sharedTabs.length === 1 && /\/icons\/ui\/points\/character\.png$/.test(sharedTabs[0].icon || '') && sharedTabs[0].w > 0, sharedTabs);
      await P.page.evaluate(() => { const x = document.querySelector('[data-infopopup-x]'); if (x) x.click(); });
      await P.page.waitForTimeout(500);

      /* ── 3. Bow 4 alone: gold beside grey ── */
      await H.devOp(wsPort, 'combat', id, { skill: 'all', level: 1, deal: true });
      await H.devOp(wsPort, 'combat', id, { skill: 'bow', level: 4, deal: true });
      const mixed = await settle(P, (h) => h.want.bow > 0 && h.want.sword === 0 && h.out.bow && Number(h.out.bow.text) === h.want.bow, `${view}-mixed`);
      const o = mixed.out;
      rec.ok(`${view}: with Bow 4 alone, the sword's and staff's counts are GREY 0s and still, the bow's and the character's GOLD and breathing (${JSON.stringify(counts(mixed))})`,
        !!o.sword && o.sword.text === '0' && o.sword.tone === 'grey' && !o.sword.breathes
          && !!o.staff && o.staff.text === '0' && o.staff.tone === 'grey' && !o.staff.breathes
          && !!o.bow && Number(o.bow.text) === mixed.want.bow && mixed.want.bow > 0 && o.bow.tone === 'gold' && o.bow.breathes
          && !!o.shared && Number(o.shared.text) === mixed.want.shared && mixed.want.shared > 0 && o.shared.tone === 'gold' && o.shared.breathes,
        { counts: counts(mixed), want: mixed.want });

      /* ── 4. nothing to spend ── */
      await H.devOp(wsPort, 'combat', id, { skill: 'all', level: 1, deal: true });
      const zero = await settle(P, (h) => ['sword', 'staff', 'bow', 'shared'].every((k) => h.want[k] === 0 && h.out[k] && h.out[k].text === '0'), `${view}-zero`);
      rec.ok(`${view}: with nothing to spend, every count is a grey 0 and none breathes`,
        ['sword', 'staff', 'bow', 'shared'].every((k) => zero.out[k] && zero.out[k].text === '0' && zero.out[k].tone === 'grey' && !zero.out[k].breathes && zero.out[k].decoded),
        counts(zero));
    } else {
      await openPoints(P, land);
    }

    /* ── 5. three numerals ── */
    await H.devOp(wsPort, 'combat', id, { skill: 'all', level: 50, deal: true });
    const big = await settle(P, (h) => h.want.sword >= 100 && h.out.sword && Number(h.out.sword.text) === h.want.sword, `${view}-big`);
    rec.ok(`${view}: three numerals drawn whole, the worker's count and never "99+" (${JSON.stringify(counts(big))})`,
      ['sword', 'staff', 'bow', 'shared'].every((k) => big.out[k] && big.want[k] >= 100 && Number(big.out[k].text) === big.want[k]
        && big.out[k].tone === 'gold' && big.out[k].decoded), { counts: counts(big), want: big.want });
    rec.ok(`${view}: ...each inside its head`,
      Object.values(big.out).length === 4 && Object.values(big.out).every((v) => v.inHead), big.out);
    rec.ok(`${view}: ...and no stat name cut beside them`, big.cut.length === 0, big.cut);

    /* ── 6. sideways ── */
    if (land) {
      rec.ok(`${view}: sideways the weapons' icons are 12 px or more (the head is 1.45 of a cell there)`,
        big.icons.length === 3 && big.icons.every((w) => w >= 12), big.icons);
    }

    /* ── 7. ── */
    const errs = P.logs.filter((l) => /^pageerror/.test(l));
    rec.ok(`${view}: no page errors`, errs.length === 0, errs.slice(0, 3));
    await P.ctx.close().catch(() => {});
  }
}
