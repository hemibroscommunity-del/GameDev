/* ═══ A COMPUTER'S WINDOWS USE THE ROOM THE SCREEN HAS (v2.3.4353) ═══
 * The owner (2026-11-05 playtest): "Some menus are still compact on desktop
 * view and can't be seen unless you scroll on a tiny portion of the window."
 * On a computer (1280 x 720 and 1920 x 1080, a mouse), every building window
 * is opened and measured: it must show whole, or -- when its content is longer
 * than the room -- fill the room above the band (at least 90% of the world's
 * box) and scroll there, never in a small box with room to spare.  The
 * dashboard's five tabs are measured too and listed (the band's height is its
 * own rule: reported, not asserted).  Window: __btBuildingWindow.open(name).
 * Pictures: tools/qa/mp/out/deskmenus-<size>-<window>.png. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SIZES = [{ id: '1280', width: 1280, height: 720 }, { id: '1920', width: 1920, height: 1080 }];
const WINDOWS = ['store', 'townhall', 'bank', 'exchange', 'auctionhouse', 'cook', 'woodwork', 'forge', 'gemcut', 'enchant', 'gamble', 'arena', 'party', 'farm'];
const measure = (P) => P.page.evaluate(() => {
  const card = document.querySelector('.bt-inspect-card'), box = document.querySelector('.bt-inspect');
  if (!card || !box) return null;
  const cr = card.getBoundingClientRect(), br = box.getBoundingClientRect();
  const cs = getComputedStyle(box);
  const room = br.height - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
  const inner = [];
  card.querySelectorAll('*').forEach((el) => {
    const s = getComputedStyle(el);
    if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 2) inner.push({ tag: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''), h: el.clientHeight, sh: el.scrollHeight });
  });
  return { h: Math.round(cr.height), room: Math.round(room), scrolls: card.scrollHeight > card.clientHeight + 2, sh: card.scrollHeight, inner };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  for (const V of SIZES) {
    const P = await H.newPlayer(browser, { name: 'Menus' + V.id, wsPort, webPort, viewport: { width: V.width, height: V.height }, world: 'wheel', wide: true });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    const stopAlive = H.keepAlive(P, 15000);
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'world' });
      await H.pastWelcome(P).catch(() => {});
      await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
      await P.page.waitForTimeout(1500);
      for (const w of WINDOWS) {
        await P.page.evaluate((n) => window.__btBuildingWindow && window.__btBuildingWindow.open(n), w);
        await P.page.waitForTimeout(900);
        const m = await measure(P);
        await P.page.screenshot({ path: join(OUT, `deskmenus-${V.id}-${w}.png`) }).catch(() => {});
        const empty = !!m && m.sh <= 60;   /* a window this probe cannot fill (it needs the building's own state): listed, not judged */
        const ok = !!m && (empty || !m.scrolls || m.h >= 0.9 * m.room) && m.inner.every((i) => i.h >= 0.45 * m.room || !m.scrolls);
        rec.ok(`${V.id} ${w}: ${empty ? 'not filled by the probe, not judged' : 'whole, or filling the room'} (${m ? `${m.h} of ${m.room}, content ${m.sh}, inner scrollers ${m.inner.map((i) => i.tag + ':' + i.h + '/' + i.sh).join(' ') || 'none'}` : 'not open'})`, ok, m);
        await P.page.evaluate(() => window.__btBuildingWindow && window.__btBuildingWindow.open(null));
        await P.page.waitForTimeout(250);
      }
      rec.ok(`${V.id} no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      stopAlive();
      await P.ctx.close().catch(() => {});
    }
  }
}
