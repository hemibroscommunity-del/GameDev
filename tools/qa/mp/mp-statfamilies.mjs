/* v2.3.3605: THE STATS IN FAMILIES (src/ui/mobile/sheet/heroStatPills.js
   heroStatFamilies, HeroExpanded.jsx famPill).  The owner: "each major combat
   resource grouped under families ... even HP to show what's contributing ...
   Accordion style family pills so it can all display without scrolling down".
   In the world, on an upright phone and sideways: the Equipment tab shows four
   family pills; each opens on its members, one at a time; Health's parts add
   up to the bar; and with any one open nothing needs a scroll. */
import * as H from './harness.mjs';

const OUT = '/tmp/statfamilies';

async function state(P) {
  return P.page.evaluate(() => {
    const fams = [...document.querySelectorAll('[data-family]')];
    const sc = (() => { let e = fams[0]; while (e) { const oy = getComputedStyle(e).overflowY; if ((oy === 'auto' || oy === 'scroll') && e.clientHeight > 40) return e; e = e.parentElement; } return null; })();
    return {
      keys: fams.map((f) => f.getAttribute('data-family')),
      open: fams.filter((f) => f.getAttribute('data-open') === '1').map((f) => f.getAttribute('data-family')),
      rows: Object.fromEntries(fams.map((f) => [f.getAttribute('data-family'),
        [...f.querySelectorAll('[data-pill]')].map((p) => [p.getAttribute('data-statrow'), (p.lastElementChild && p.lastElementChild.textContent) || ''])])),
      heads: Object.fromEntries(fams.map((f) => [f.getAttribute('data-family'), (f.querySelector('[data-family-head] span:nth-of-type(2)') || {}).textContent || ''])),
      scroll: sc ? { h: sc.clientHeight, sh: sc.scrollHeight } : null,
      allIn: !!sc && [...document.querySelectorAll('[data-family-head], [data-vital]')].every((e) => {
        const r = e.getBoundingClientRect(), q = sc.getBoundingClientRect();
        return r.height > 0 && r.top >= q.top - 1 && r.bottom <= q.bottom + 1;
      }),
    };
  });
}

export async function run({ browser, wsPort, webPort, rec }) {
  for (const [tag, vp] of [['390x844', { width: 390, height: 844 }], ['844x390', { width: 844, height: 390 }]]) {
    const P = await H.newPlayer(browser, { name: 'Famly', wsPort, webPort, touch: true, world: 'wheel', viewport: { width: 390, height: 844 } });
    try {
      await H.enterWorld(P);
      if (vp.width !== 390) { await P.page.setViewportSize(vp); await P.page.waitForTimeout(1500); }
      await P.page.waitForTimeout(1500);
      await P.page.evaluate(() => { window.__broDashPanelBus.open('hero'); });
      await P.page.waitForTimeout(1500);
      const s0 = await state(P);
      rec.ok(`[${tag}] shut: the Damage and Defense pills, the HP and EN bars the Health and Energy families' (a tap opens them), each fully in view (the figure and gear, unchanged, run 9 px past the 191 px tab upright)`,
        s0.keys.join() === 'damage,defense' && s0.open.length === 0 && s0.allIn
        && await P.page.evaluate(() => !!document.querySelector('[data-vital="hp"][data-family-head="health"]') && !!document.querySelector('[data-vital="stamina"][data-family-head="energy"]')), s0);
      await P.page.screenshot({ path: `${OUT}-${tag}-shut.png` });
      for (const k of ['damage', 'defense', 'health', 'energy']) {
        await P.page.evaluate((key) => { document.querySelector(`[data-family-head="${key}"]`).click(); }, k);
        await P.page.waitForTimeout(500);
        const s = await state(P);
        const fits = !!s.scroll && s.scroll.sh <= s.scroll.h + 2;
        rec.ok(`[${tag}] ${k} opens alone on its members, and nothing needs a scroll`,
          s.open.join() === k && (s.rows[k] || []).length >= 2 && fits, { open: s.open, rows: s.rows[k], scroll: s.scroll });
        if (k === 'health') {
          const nums = (s.rows.health || []).map((r) => Number(String(r[1]).replace(/[^0-9.-]/g, '')) || 0);
          const total = Number(String(s.heads.health).replace(/[^0-9.]/g, ''));
          rec.ok(`[${tag}] Health's parts add up to the bar (${nums.join(' + ')} = ${total})`,
            nums.reduce((a, b) => a + b, 0) === total, s.rows.health);
        }
        await P.page.screenshot({ path: `${OUT}-${tag}-${k}.png` });
        await P.page.evaluate((key) => { document.querySelector(`[data-family-head="${key}"]`).click(); }, k);
        await P.page.waitForTimeout(400);
        const s9 = await state(P);
        rec.ok(`[${tag}] a second tap on ${k} shuts it, the tab back`, s9.open.length === 0 && s9.keys.length === 2, s9);
      }
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
