/* THE CHARACTER TAB ON A PHONE (v2.3.1878; rewritten v2.3.3053).
 *
 * v2.3.1878 -- owner: "Do a layout design change to make room for the stats
 * you have to scroll to see on the char menu."  The seven stats moved up
 * beside the gear and the tab stopped scrolling; this file asserted exactly
 * that ("nothing scrolls").
 *
 * v2.3.3053 -- owner: "Add pill design for hero equipment menu stats.  See
 * screenshot."  The mockup puts FOURTEEN stats in pills, each with its
 * picture, plus the three vitals as pills.  At a phone's size that cannot fit
 * the sheet (HeroExpanded's v2.3.3053 note has the arithmetic), so the tab
 * scrolls again -- and the contract this file now holds is the one that keeps
 * v2.3.1878's lesson ("nothing cued that they were there"):
 *
 *   1. EVERYTHING IS THERE: the three vital pills, DPS and the seven OFFENSE
 *      pills, the six PLAYER pills (guard).
 *   2. THE FIRST SCREEN, no scroll: the character, all six gear cells, the
 *      three vitals -- and upright, OFFENSE's heading, DPS and Damage -- each
 *      wholly inside the sheet's window.
 *   3. THE CUE: while there is more below, the panel's bottom fade is on.
 *   4. EVERY PILL IS REACHABLE: scrolled to the end, the last pill of each
 *      group is wholly in the window.
 *   5. NOTHING IS CUT: no pill's name or value is ellipsised, and nothing
 *      spills sideways out of the sheet.
 *
 * At 390x844 (the QA phone), 375x667 (the narrowest iPhone) and sideways at
 * 844x390, where the groups stack under the figure (v2.3.2171).
 */
import * as H from './harness.mjs';

const OFFENSE = ['damage', 'range', 'aspd', 'crit', 'critDmg', 'special', 'elem'];
const PLAYER = ['def', 'armor', 'stam', 'dodge', 'move', 'eres'];
const FIRST_SCREEN = ['dps', 'damage'];

/* the sheet's own scroller: the first ancestor of a pill that scrolls */
const SCROLLER = `(() => {
  const any = document.querySelector('[data-pill="damage"]');
  let sc = any && any.parentElement;
  while (sc && sc !== document.body) {
    const oy = getComputedStyle(sc).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && sc.clientHeight > 40) return sc;
    sc = sc.parentElement;
  }
  return null;
})()`;

async function measure(P) {
  return P.page.evaluate(({ off, ply, SC }) => {
    const pill = (k) => document.querySelector(`[data-pill="${k}"]`);
    if (!pill('damage')) return { err: 'no [data-pill] on screen' };
    const sc = (0, eval)(SC);
    if (!sc) return { err: 'no scroller round the pills' };
    const scR = sc.getBoundingClientRect();
    const inWin = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.top >= scR.top - 1 && r.bottom <= scR.bottom + 1
        && r.top >= -1 && r.bottom <= window.innerHeight + 1;
    };
    const clipped = [];
    document.querySelectorAll('[data-pill] span, [data-vital] span').forEach((sp) => {
      if (sp.children.length) return;
      if (sp.scrollWidth > sp.clientWidth + 1) clipped.push({ t: sp.textContent, sw: sp.scrollWidth, cw: sp.clientWidth });
    });
    const spill = [...sc.querySelectorAll('[data-pill], [data-vital], [data-pillgroup]')]
      .filter((el) => el.getBoundingClientRect().right > scR.right + 1)
      .map((el) => el.getAttribute('data-pill') || el.getAttribute('data-vital') || el.getAttribute('data-pillgroup'));
    const cs = getComputedStyle(sc);
    return {
      sc: { top: Math.round(scR.top), h: sc.clientHeight, scrollH: sc.scrollHeight, scrollTop: Math.round(sc.scrollTop) },
      present: { vitals: document.querySelectorAll('[data-vital]').length, dps: !!pill('dps'),
        offense: off.filter((k) => !!pill(k)).length, player: ply.filter((k) => !!pill(k)).length },
      values: Object.fromEntries([...document.querySelectorAll('[data-pill]')].map((el) =>
        [el.getAttribute('data-pill'), (el.lastElementChild && el.lastElementChild.textContent) || ''])),
      inWin: Object.fromEntries([...document.querySelectorAll('[data-pill]')].map((el) => [el.getAttribute('data-pill'), inWin(el)])),
      vitalsIn: [...document.querySelectorAll('[data-vital]')].map(inWin),
      figureIn: inWin(document.querySelector('[data-charview]')),
      gearIn: [...document.querySelectorAll('[data-eqslot]')].map(inWin),
      offenseHeadIn: inWin(document.querySelector('[data-pillgroup="offense"] > div:first-child')),
      clipped, spill, mask: cs.webkitMaskImage || cs.maskImage || '',
    };
  }, { off: OFFENSE, ply: PLAYER, SC: SCROLLER });
}

export async function run({ browser, wsPort, webPort, rec }) {
  for (const [tag, vp] of [['390x844', { width: 390, height: 844 }], ['375x667', { width: 375, height: 667 }], ['844x390', { width: 844, height: 390 }]]) {
    /* every case enters upright (the creator's door is drawn for it) and turns */
    const P = await H.newPlayer(browser, { name: 'Fitter', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 } });
    try {
      await H.enterWorld(P);
      if (vp.width !== 390 || vp.height !== 844) { await P.page.setViewportSize(vp); await P.page.waitForTimeout(1500); }
      await P.page.waitForTimeout(1500);
      await P.page.evaluate(() => { window.__broDashPanelBus.open('hero'); });
      await P.page.waitForTimeout(1500);
      const side = vp.width > vp.height;

      const m = await measure(P);
      rec.ok(`[${tag}] the Equipment tab has its 3 vital pills, DPS, 7 OFFENSE and 6 PLAYER pills (guard)`,
        !m.err && m.present.vitals === 3 && m.present.dps && m.present.offense === 7 && m.present.player === 6, m.err ? m : m.present);
      if (m.err) continue;
      const first = side ? [] : FIRST_SCREEN.filter((k) => !m.inWin[k]);
      rec.ok(`[${tag}] first screen, no scroll: the character, the six gear cells, the three vitals${side ? '' : ", OFFENSE's heading, DPS and Damage"}`,
        m.figureIn && m.gearIn.length === 6 && m.gearIn.every(Boolean) && m.vitalsIn.length === 3 && m.vitalsIn.every(Boolean)
        && (side || (m.offenseHeadIn && first.length === 0)),
        { figureIn: m.figureIn, gearIn: m.gearIn, vitalsIn: m.vitalsIn, offenseHeadIn: m.offenseHeadIn, notIn: first, sc: m.sc });
      const more = m.sc.scrollH > m.sc.h + 2;
      rec.ok(`[${tag}] the cue: ${more ? 'there is more below, and the bottom fade is on' : 'nothing below, nothing to cue'}`,
        !more || (!!m.mask && m.mask !== 'none'), { more, mask: m.mask, sc: m.sc });
      rec.ok(`[${tag}] no pill's name or value is cut short (${Object.keys(m.values).length} pills)`, m.clipped.length === 0, m.clipped);
      rec.ok(`[${tag}] nothing spills sideways out of the sheet`, m.spill.length === 0, m.spill);
      rec.ok(`[${tag}] the values are real readouts: Armor a percent, Crit Chance 1.0% at the start, Damage a number`,
        /^\d+(\.\d)?%$/.test(m.values.armor || '') && m.values.crit === '1.0%' && /^\d/.test(m.values.damage || ''), m.values);
      await P.page.screenshot({ path: H.REPO + `/tools/qa/mp/out/charfit-${tag}.png` }).catch(() => {});

      await P.page.evaluate((SC) => { const sc = (0, eval)(SC); if (sc) sc.scrollTop = sc.scrollHeight; }, SCROLLER);
      await P.page.waitForTimeout(400);
      const e = await measure(P);
      const lastIn = [OFFENSE[OFFENSE.length - 1], PLAYER[PLAYER.length - 1]].filter((k) => e.inWin && e.inWin[k]);
      rec.ok(`[${tag}] scrolled to the end, the last pill of each group is wholly in view (Elem Power, Resist)`,
        lastIn.length === 2, { inWin: e.inWin, sc: e.sc });
      await P.page.screenshot({ path: H.REPO + `/tools/qa/mp/out/charfit-${tag}-end.png` }).catch(() => {});

      /* a slot tapped: its item card takes the vitals' place (v2.3.1843) at the
         figure row's height, and OFFENSE still runs on below it */
      if (!side) {
        const card = await P.page.evaluate((SC) => {
          const sc = (0, eval)(SC); if (sc) sc.scrollTop = 0;
          const cell = document.querySelector('[data-eqslot="chest"]');
          if (!cell) return { err: 'no chest slot' };
          const r0 = cell.getBoundingClientRect();
          cell.dispatchEvent(new PointerEvent('pointerup', { clientX: r0.left + 5, clientY: r0.top + 5, bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch' }));
          return { ok: true };
        }, SCROLLER);
        await P.page.waitForTimeout(600);
        const c = await P.page.evaluate(() => {
          const wrap = document.querySelector('[data-cardwrap]');
          const fig = document.querySelector('[data-charview]');
          const dmg = document.querySelector('[data-pill="damage"]');
          if (!wrap) return { err: 'no card' };
          const w = wrap.getBoundingClientRect(), f = fig.getBoundingClientRect(), d = dmg && dmg.getBoundingClientRect();
          return { cardH: Math.round(w.height), figH: Math.round(f.height), vitals: document.querySelectorAll('[data-vital]').length,
            dmgBelow: !!d && d.top >= w.bottom - 1 };
        });
        rec.ok(`[${tag}] a slot tapped: its card takes the vitals' place at the figure row's height, OFFENSE still below it`,
          !card.err && !c.err && Math.abs(c.cardH - c.figH) <= 2 && c.vitals === 0 && c.dmgBelow, { card, c });
        await P.page.screenshot({ path: H.REPO + `/tools/qa/mp/out/charfit-${tag}-card.png` }).catch(() => {});
      }
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
