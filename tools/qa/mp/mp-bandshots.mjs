/* ═══ mp-bandshots (v2.3.4153): THE BAND OPEN ON GEAR AND ON BRO, EVERY SCREEN ═══
 *
 * The one band is the default on every screen (#1410, src/ui/oneBand.js):
 * the band at the bottom, its content centred in [data-band-box] on a
 * computer or tablet (min(1200 px, the world's width)), a phone on its side
 * resting folded.  The Gear tab (#1388) is the band at rest; the Bro card
 * (sheet/BroCard.jsx) lays itself out from the box it gets.  This takes the
 * PR's pictures and checks, on each screen:
 *   - opened, the band shows Gear's tab (its bag pane), never the old bag
 *     page;
 *   - Bro shows the card inside the band's box (not wider than it, not
 *     double-padded: its edges within a few px of the box's), CLOSE first in
 *     the row, nothing cut;
 * on a computer at 1280 x 720 and 1920 x 1080 (wide: true), a phone on its
 * side 844 x 390 (opened from the folded band), and upright 390 x 844.
 * Pictures: tools/qa/mp/out/band-{gear,bro}-{desk,desk1080,side,up}.png
 * (docs/shots/ has them on 256 colours).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `${name}.png`) }); } catch (e) { /* a picture only */ } };

const look = (P) => P.page.evaluate(() => {
  const vis = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), t: Math.round(r.top), h: Math.round(r.height) }; };
  const page = document.querySelector('[data-band-box="page"]');
  const card = document.querySelector('[data-bro-card="v2"]');
  const close = document.querySelector('[data-dash-close]');
  const rail = [...document.querySelectorAll('.bt-navrail')].find(vis);
  const first = rail && rail.querySelector('[data-nav]');
  const cut = [];
  if (card) for (const el of card.querySelectorAll('*')) {
    if (el.children.length || !(el.textContent || '').trim() || el.clientWidth <= 0) continue;
    if (el.scrollWidth > el.clientWidth + 1) cut.push((el.textContent || '').trim().slice(0, 20));
  }
  const b = window.__broDashPanelBus;
  return {
    vw: innerWidth, vh: innerHeight,
    oneBand: document.documentElement.classList.contains('bt-one-band'),
    mode: b && b.state.mode, stack: b && b.state.stack.slice(),
    gear: vis(document.querySelector('[data-gear-pane="inv"]')),
    /* the old bag page is the 'bag' / 'inventory' destination opened */
    oldBag: !!b && b.state.mode === 'expanded' && ['bag', 'inventory'].includes(b.current()),
    page: box(page), card: box(card), cols: card ? Number(card.getAttribute('data-bro-cols')) : null,
    close: close && vis(close) ? { ...box(close), text: (close.textContent || '').trim() } : null,
    first: first ? { id: first.getAttribute('data-nav'), ...box(first) } : null,
    words: rail ? rail.getAttribute('data-nav-words') : null,
    cut,
  };
});

async function both(P, tag, rec) {
  /* Gear: the band at rest, unfolded (a phone on its side rests folded) */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* no band */ } });
  await P.page.waitForTimeout(600);
  await H.unfoldBand(P).catch(() => {});
  await P.page.waitForTimeout(1200);
  const g = await look(P);
  rec.ok(`${tag}: the band open at rest shows the Gear tab (its bag pane), not the old bag page`, g.gear && !g.oldBag, g);
  await shot(P, `band-gear-${tag}`);
  /* Bro */
  await P.page.evaluate(() => { window.__btHeroSection.request('Card'); window.__broDashPanelBus.open('hero'); });
  await P.page.waitForTimeout(1600);
  const b = await look(P);
  const inBox = !!b.card && !!b.page && b.card.l >= b.page.l - 1 && b.card.r <= b.page.r + 1 && (b.page.w - b.card.w) <= 16;
  rec.ok(`${tag}: Bro's card fills the band's box and no more (card ${b.card && b.card.w} px in a ${b.page && b.page.w} px box at ${b.vw} px; ${b.cols} columns), nothing cut`,
    b.mode === 'expanded' && inBox && b.cut.length === 0, b);
  rec.ok(`${tag}: CLOSE first in the row ("${b.close && b.close.text}"), then the five (words: ${b.words})`,
    !!b.close && b.close.text === 'CLOSE' && !!b.first && b.first.id === 'dashboard' && b.close.r <= b.first.l, { close: b.close, first: b.first });
  await shot(P, `band-bro-${tag}`);
  return b;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const errs = [];
  /* a computer, 1280 x 720 then 1920 x 1080 */
  const D = await H.newPlayer(browser, { name: 'Bandbro', wsPort, webPort, viewport: { width: 1280, height: 720 }, world: 'wheel', wide: true });
  D.page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  try {
    await H.enterWorld(D);
    await D.page.waitForTimeout(2500);
    await H.closeNpcDialogue(D).catch(() => {});
    const id = await H.readState(D, (S) => S.myId);
    await H.devOp(wsPort, 'kit', id, { what: 'all' }).catch(() => null);
    await D.page.waitForTimeout(2500);
    await H.equipWeapon(D, 'greatsword', 'weapon', 'melee').catch(() => null);
    await D.page.waitForTimeout(1500);
    const d = await both(D, 'desk', rec);
    rec.ok(`desk: the one band (the default) and three panels side by side in its centred box`, d.oneBand && d.cols === 3, { oneBand: d.oneBand, cols: d.cols });
    await D.page.setViewportSize({ width: 1920, height: 1080 });
    await D.page.waitForTimeout(2000);
    const d2 = await both(D, 'desk1080', rec);
    rec.ok(`desk1080: the box stays centred and capped (${d2.page && d2.page.w} px of 1920, left ${d2.page && d2.page.l})`,
      !!d2.page && d2.page.w <= 1200 && Math.abs((d2.page.l + d2.page.r) / 2 - 960) < 120, d2.page);
  } finally {
    await D.page.context().close().catch(() => {});
  }

  /* a phone on its side, then upright */
  for (const [tag, vp] of [['side', { width: 844, height: 390 }], ['up', { width: 390, height: 844 }]]) {
    const P = await H.newPlayer(browser, { name: tag === 'side' ? 'Sidebro' : 'Upbro', wsPort, webPort, viewport: vp, touch: true, dpr: 2, world: 'wheel' });
    P.page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
    try {
      await H.enterWorld(P);
      await P.page.waitForTimeout(2500);
      await H.closeNpcDialogue(P).catch(() => {});
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'kit', id, { what: 'all' }).catch(() => null);
      await P.page.waitForTimeout(2500);
      await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
      await P.page.waitForTimeout(1500);
      const b = await both(P, tag, rec);
      if (tag === 'side') rec.ok(`side: the card at ${b.card && b.card.w} px is ${b.cols} columns (from its own width)`, b.cols === 3, { cols: b.cols });
      else rec.ok(`up: the card at ${b.card && b.card.w} px is 2 columns (you | the doors, the stats under them)`, b.cols === 2, { cols: b.cols });
    } finally {
      await P.page.context().close().catch(() => {});
    }
  }
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
}
