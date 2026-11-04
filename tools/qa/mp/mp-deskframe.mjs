/* ═══ mp-deskframe (v2.3.4220): THE DESKTOP FRAME, BOTH WAYS ═══
 * The owner's bezel (public/ui/deskframe.png) on a computer: `around` shrinks the
 * game into it, `over` lies on the viewport's edge (pointer-events none), `off`
 * is today's look.  At 1280 x 720 and 1920 x 1080 with the band open on Gear:
 * takes docs/shots/desk-frame-{around,over}-{1280,1920}.webp and
 * desk-frame-before-1920.webp, and checks that no button of the game sits under
 * the bezel's ring and that the ring lets clicks through. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const OUT = join(H.REPO, 'docs/shots');

async function setMode(P, mode) {
  await P.page.evaluate((m) => {
    const c = document.documentElement.classList;
    c.toggle('bt-deskframe-around', m === 'around'); c.toggle('bt-deskframe-over', m === 'over');
  }, mode);
}
const ring = (P) => P.page.evaluate(() => {
  const html = document.documentElement;
  const on = html.classList.contains('bt-deskframe-around') || html.classList.contains('bt-deskframe-over');
  const fe = document.querySelector('[data-deskframe]');
  const around = html.classList.contains('bt-deskframe-around') && fe && getComputedStyle(fe).display !== 'none';
  const fr = around ? fe.getBoundingClientRect() : null;
  const bw = around ? getComputedStyle(fe) : null;
  const inner = fr ? { l: fr.left + parseFloat(bw.borderLeftWidth), r: fr.right - parseFloat(bw.borderRightWidth), t: fr.top + parseFloat(bw.borderTopWidth), b: fr.bottom - parseFloat(bw.borderBottomWidth) } : null;
  const t = on && !around ? parseFloat(getComputedStyle(html).getPropertyValue('--bt-frame-t')) || 0 : 0;
  const t2 = on ? Math.round(parseFloat(getComputedStyle(document.body).paddingLeft) || 0) : 0;
  const W = innerWidth, Hh = innerHeight; const under = [];
  for (const e of document.querySelectorAll('#root button, #root [data-nav]')) {
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (inner && (r.left < inner.l - 1 || r.top < inner.t - 1 || r.right > inner.r + 1 || r.bottom > inner.b + 1) && r.right > fr.left && r.left < fr.right) under.push((e.getAttribute('data-nav') || e.className || e.tagName).toString().slice(0, 30));
    else if (!around && on && (r.left < t - 1 || r.top < t - 1 || r.right > W - t + 1 || r.bottom > Hh - t + 1)) under.push((e.getAttribute('data-nav') || e.className || e.tagName).toString().slice(0, 30));
  }
  const cs = getComputedStyle(html, '::after');
  return { on, around, inner, t, pad: t2, under, pe: cs.pointerEvents, content: cs.content };
});

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const D = await H.newPlayer(browser, { name: 'Framebro', wsPort, webPort, viewport: { width: 1280, height: 720 }, world: 'wheel', wide: true, query: 'deskframe=0' });
  let stop = () => {};
  try {
    await D.page.evaluate(() => window.__btDeskFrameStart && window.__btDeskFrameStart());
    await H.enterWorld(D);
    stop = H.keepAlive(D);
    await D.page.waitForTimeout(2500);
    await H.closeNpcDialogue(D).catch(() => {});
    for (const [w, h, tag] of [[1280, 720, '1280'], [1920, 1080, '1920']]) {
      await D.page.setViewportSize({ width: w, height: h });
      for (const mode of (tag === '1920' ? ['off', 'around', 'over'] : ['around', 'over'])) {
        await setMode(D, mode === 'off' ? null : mode);
        await D.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* none */ } });
        await D.page.waitForTimeout(400);
        await H.unfoldBand(D).catch(() => {});
        await D.page.setViewportSize({ width: w, height: h + 1 }); await D.page.setViewportSize({ width: w, height: h });   /* the canvas re-measures */
        await D.page.waitForTimeout(1800);
        const r = await ring(D);
        if (mode !== 'off') {
          rec.ok(`${tag} ${mode}: the frame is on, no button under its ring (${r.under.join(',') || 'none'})`, r.on && (mode !== 'around' || r.around) && r.under.length === 0, r);
          rec.ok(`${tag} ${mode}: the frame lets clicks through (${mode === 'around' ? 'its box has pointer-events none' : 'pointer-events ' + r.pe})`, mode === 'around' ? await D.page.evaluate(() => getComputedStyle(document.querySelector('[data-deskframe]')).pointerEvents === 'none') : r.pe === 'none', r);
        }
        const name = mode === 'off' ? 'desk-frame-before-1920' : `desk-frame-${mode}-${tag}`;
        const png = join(OUT, name + '.png');
        await D.page.screenshot({ path: png });
        try { execFileSync('python3', ['-c', `from PIL import Image;im=Image.open(${JSON.stringify(png)}).convert('RGB');im.save(${JSON.stringify(png.replace(/png$/, 'webp'))},quality=80)`]); execFileSync('rm', [png]); } catch (e) { /* keep png */ }
      }
    }
  } finally { stop(); try { await D.ctx.close(); } catch (e) { /* closed */ } }
}
