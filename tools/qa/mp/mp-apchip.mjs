/* ═══ v2.3.4183: THE POINTS LEAVE THE TOP BAR; A RISE IS A WORD UNDER IT ═══
 * The owner, 2026-11-02: "I don't like the placement of where the gold count
 * is (top right) and the placement of the achievement points (top left)".
 * This now holds, in the world (390 x 844, touch): no medal and no purse on
 * the bar (the door stays); a first kill's worker-granted 10 AP shows as a
 * "+10 AP" word under the bar's right end (ui/XpFlyOverlay.jsx HudPopup) and
 * the Bro card reads 10 (sheet/BroCard.jsx); no page errors.  (What it held
 * before, v2.3.3553, below.)
 *
 * ═══ YOUR ACHIEVEMENT POINTS ON THE TOP BAR (v2.3.3553, docs/specs/ap-on-the-bar.md) ═══
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

  /* ── 1. (v2.3.4183) no medal and no purse on the bar; the door stays ── */
  let b0 = null;
  for (let i = 0; i < 30; i++) { b0 = await bar(P); if (b0.door) break; await P.page.waitForTimeout(300); }
  await shot('bar');
  rec.ok(`1: in the world (zone "${zone}"), the bar has the door and NO medal or purse (v2.3.4183)`,
    zone === 'wheel' && caps && !!b0.door && !b0.chip && !b0.purse, b0);
  /* every "+N AP" / "+N gold" word the bar's corner says, recorded as it is said */
  await P.page.evaluate(() => {
    window.__apWords = [];
    const seenIds = new Set();
    setInterval(() => {
      const S = window._gameState && window._gameState.current;
      for (const p of (S && S._hudPopups) || []) {
        if (p && p.target === 'goldIcon' && !seenIds.has(p.id)) { seenIds.add(p.id); window.__apWords.push({ text: p.text, at: Date.now() }); }
      }
    }, 40);
  });

  /* ── 2. a first kill: First Blood, +10 AP ── */
  let killed = null;
  for (const home of ['verdant', 'frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist']) {
    for (let k = 0; k < 6 && !killed; k++) {
      const r = await H.devOp(wsPort, 'killroll', me, { kill: 'wm-' + home + '-' + k }).catch(() => null);
      if (r && r.ok && r.killed) killed = r.killed;
    }
    if (killed) break;
  }
  let words = [], apNow = null;
  for (let i = 0; i < 60; i++) {
    await P.page.waitForTimeout(250);
    words = await P.page.evaluate(() => window.__apWords || []);
    apNow = await H.readState(P, (S) => { try { return (S._achv && S._achv.ap) != null ? S._achv.ap : null; } catch (e) { return null; } });
    if (words.some((w) => w.text === '+10 AP')) break;
  }
  await shot('gain');
  const line = await P.page.evaluate(() => ((window._gameState.current.chatLog || []).map((l) => l.text).find((t) => /First Blood/.test(t || '')) || null));
  rec.ok(`2: a first kill (${killed}): the worker's 10 AP said as a "+10 AP" word under the bar (${JSON.stringify(words.map((w) => w.text))}), and the chat line "${line}"`,
    !!killed && words.some((w) => w.text === '+10 AP') && !!line, { killed, words, apNow, line });

  /* ── 3. the Bro card reads the points ── */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.open('hero'); } catch (e) { /* */ } });
  let card = null;
  for (let i = 0; i < 30; i++) {
    card = await P.page.evaluate(() => { const e = document.querySelector('[data-bro-ap]'); return e ? Number(e.getAttribute('data-bro-ap')) : null; });
    if (card === 10) break;
    await P.page.waitForTimeout(200);
  }
  await shot('bro-card');
  rec.ok(`3: the Bro card reads the same ${card} AP`, card === 10, { card });

  rec.ok(`5: no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
