/* ═══ A MYSTERY PIECE WAITS IN YOUR BAG, ON A PHONE (v2.3.4012) ═══
 *
 * The owner: "Mystery item launched automatically. Should go to inventory
 * then have reveal option."  (docs/specs/reveal-in-bag.md)
 *
 * A real player in the world (the Wheel's BroTown), a real worker.  The "?"
 * arrives through the test lever /dev/revealbag {grade, give}: the worker
 * mints the piece through the pickup's own mark (_revealBagMark) and sends it
 * in the pickup's own loot_credit shape, so the phone's road from the credit
 * on is the real one.  The pile itself is server/test/reveal-bag.test.mjs's
 * (the real _handleLootPickup, no grade in any frame).
 *
 * WHY NOT A REAL KILL HERE (v2.3.4012, found writing this): on this box a
 * real Iron Torso pile in the Wheel (/dev/killroll on its numbers, the way
 * mp-killroll lands a roll) blacks the screen out about a second after it
 * lands ("the Wheel's ground gone, screen 6% lit"), the watchdog rebuilds the
 * renderer and effectsRenderer._renderRareItems then throws on a destroyed
 * sprite -- REPRODUCED ON MAIN at 0be55a6f with no change of this one, so it
 * is not this feature's, and it is reported rather than fixed here.  Until it
 * is fixed a pickup cannot be driven on this box.
 *
 * The steps:
 *   1. the credit plays NO reveal, and the torso is in the bag without its
 *      grade, marked unrevealed;
 *   2. its tile is a "?" on the rare-blue edge, the picture a silhouette;
 *   3. its card says "Rare or better" and has Reveal;
 *   4. Reveal closes the card and plays the overlay; while it spins the tile
 *      is still a "?"; it lands on elite;
 *   5. then the tile is the graded piece (elite's orange edge, no "?"), and
 *      the bag's copy carries the grade;
 *   6. EQUIP REVEALS FIRST: a "?" Iron Great Sword's Equip plays the overlay,
 *      and the blade is wielded (graded) once it lands, not before;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/revealbag-*.png. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const ORANGE = 'rgb(232, 137, 58)';
const BLUE = 'rgb(91, 153, 222)';

/* the bag on the band at rest, unfolded (ui-review states.mjs openBag) */
async function openBag(P) {
  await P.page.evaluate(() => { if (window.__broDashPanelBus) window.__broDashPanelBus.toBar(); });
  await P.page.waitForTimeout(600);
  const st = await P.page.evaluate(() => {
    const b = document.querySelector('[data-dash-fold]');
    return b ? b.getAttribute('data-dash-fold') : null;
  });
  if (st === 'min') { await P.page.locator('[data-dash-fold]').first().tap().catch(() => {}); await P.page.waitForTimeout(900); }
}
const tile = (P, sel) => P.page.evaluate((s) => {
  const el = [...document.querySelectorAll(s)].find((e) => e.offsetParent);
  if (!el) return null;
  const img = el.querySelector('img');
  return { key: el.getAttribute('data-bag-key'), unrevealed: el.hasAttribute('data-unrevealed'),
    mark: !!el.querySelector('[data-unrevealed-mark]'), border: getComputedStyle(el).borderTopColor,
    filter: img ? getComputedStyle(img).filter : null };
}, sel);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Revealbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);
    const cap = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.revealbag));
    rec.ok('the worker says it reveals in the bag (caps.revealbag)', cap === true, cap);

    await H.devOp(wsPort, 'vitals', me, { god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    await H.devOp(wsPort, 'combat', me, { skill: 'all', level: 40 }).catch(() => {});   /* no equip gate in the way of the blade */
    await H.waitFor(P, (S) => !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1), (v) => v, { timeout: 8000, label: 'the quests done' }).catch(() => null);
    /* ── 1 ── the torso arrives: no reveal plays */
    await P.page.evaluate(() => { window.__qaOverlaySeen = false; const t0 = performance.now();
      const tick = () => { if (document.querySelector('[data-tut="reveal-overlay"]')) window.__qaOverlaySeen = true; if (performance.now() - t0 < 12000) requestAnimationFrame(tick); };
      requestAnimationFrame(tick); });
    const g1 = await H.devOp(wsPort, 'revealbag', me, { grade: 'elite', give: 'armor' }).catch((e) => ({ err: String(e) }));
    rec.ok('the lever put a "?" torso in the bag through the pickup\'s credit (guard)', !!g1 && g1.ok === true && g1.unrevealed === true, g1);
    const got = await H.waitFor(P, (S) => {
      const a = (S.rpg.armorStash || []).find((x) => x && x.unrevealed);
      return a ? { name: a.name, quality: a.quality === undefined ? null : a.quality, gid: a.gid || null } : null;
    }, (v) => !!v, { timeout: 10000, label: 'the "?" in the bag' }).catch(() => null);
    rec.ok(`1. the torso is in the bag still a "?", without its grade (${got && got.name})`, !!got && got.quality === null && !!got.gid, got);
    await P.page.waitForTimeout(2500);
    const sawOverlay = await P.page.evaluate(() => window.__qaOverlaySeen);
    rec.ok('1. ...and its arrival played no reveal', sawOverlay === false, sawOverlay);

    /* ── 2 ── its tile */
    await openBag(P);
    const t1 = await tile(P, '[data-unrevealed][data-bag-key^="stashArmor-"]');
    rec.ok(`2. its tile is a "?" on the rare-blue edge, the picture a silhouette (${t1 && t1.border}, ${t1 && t1.filter})`,
      !!t1 && t1.mark && t1.border === BLUE && /brightness\(0\)/.test(t1.filter || ''), t1);
    await P.page.screenshot({ path: join(OUT, 'revealbag-1-tile.png') }).catch(() => {});

    /* ── 3 ── its card */
    await P.page.locator('[data-unrevealed][data-bag-key^="stashArmor-"]').first().tap();
    await P.page.waitForTimeout(700);
    const card = await P.page.evaluate(() => {
      /* v2.3.4081: in the Gear tab a bag tap shows the piece in its middle
         panel (GearTab.jsx), the same card and the same action list */
      const c = document.querySelector('[data-item-card]') || document.querySelector('[data-gear-pane="bro"]');
      if (!c) return null;
      return { text: c.innerText, reveal: !!c.querySelector('[data-reveal]'), mark: !!c.querySelector('[data-unrevealed-mark]'),
        buttons: [...c.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean) };
    });
    rec.ok('3. its card says "Rare or better" and offers Reveal and Equip (no Sell, no Drop)',
      !!card && /Rare or better/.test(card.text) && card.reveal && card.mark && card.buttons.includes('Equip') && !card.buttons.includes('Sell') && !card.buttons.includes('Drop'), card);
    await P.page.screenshot({ path: join(OUT, 'revealbag-2-card.png') }).catch(() => {});

    /* ── 4 ── Reveal: the overlay, the tile still a "?" while it spins.  Read
       by the page itself every frame from before the tap (this box draws a
       few frames a second and a screenshot takes as long as a stage: TRAPS
       §200), never by a poll that can miss the 1.7 s the grade is held */
    await P.page.evaluate(() => {
      const w = { spin: false, markWhileSpinning: true, bannerWhileSpinning: null, banner: null, landed: null, cardGone: null, t0: performance.now() };
      window.__qaReveal = w;
      const tick = () => {
        if (window.__qaReveal !== w) return;
        const o = document.querySelector('[data-tut="reveal-overlay"]');
        if (o) {
          const g = o.getAttribute('data-reveal-grade');
          if (!g) {
            w.spin = true;
            if (w.cardGone === null) w.cardGone = !document.querySelector('[data-item-card]');
            const t = [...document.querySelectorAll('[data-bag-key^="stashArmor-"]')].find((e) => e.offsetParent);
            if (t && !t.querySelector('[data-unrevealed-mark]')) w.markWhileSpinning = false;
            const b = document.querySelector('[data-achv-banner]');
            if (b) w.bannerWhileSpinning = b.getAttribute('data-achv-banner');
          } else if (!w.landed) w.landed = g;
        }
        const b2 = document.querySelector('[data-achv-banner]');
        if (b2 && !w.banner) w.banner = b2.getAttribute('data-achv-banner');
        if (performance.now() - w.t0 < 15000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await P.page.locator('[data-item-card] [data-reveal], [data-gear-pane="bro"] [data-reveal]').first().tap();
    const rv = await H.waitFor(P, () => (window.__qaReveal && window.__qaReveal.landed) || null, (v) => !!v, { timeout: 12000, label: 'the reveal lands' }).catch(() => null);
    const w4 = await P.page.evaluate(() => window.__qaReveal);
    rec.ok('4. Reveal closes the card and plays the reveal', !!w4 && w4.spin && w4.cardGone === true, w4);
    rec.ok('4. ...while it spins the tile is still a "?" (the grade never shows under the spin)', !!w4 && w4.spin && w4.markWhileSpinning, w4);
    rec.ok(`4. ...and lands on elite (${rv})`, rv === 'elite', w4);
    rec.ok('4. no achievement banner while it spins (it would say the grade first)', !!w4 && w4.bannerWhileSpinning === null, w4);
    await H.waitFor(P, () => (window.__qaReveal && window.__qaReveal.banner) || null, (v) => !!v, { timeout: 9000, label: 'the banner' }).catch(() => null);
    const w4b = await P.page.evaluate(() => window.__qaReveal);
    rec.ok(`4. ...its "Elite piece" banner comes once it has landed (${w4b && w4b.banner})`, !!w4b && w4b.banner === 'elite_piece', w4b);
    if (rv) await P.page.screenshot({ path: join(OUT, 'revealbag-3-elite.png') }).catch(() => {});

    /* ── 5 ── the graded tile */
    await H.waitFor(P, () => document.querySelector('[data-tut="reveal-overlay"]') ? null : true, (v) => v, { timeout: 6000, label: 'the overlay gone' }).catch(() => null);
    await P.page.waitForTimeout(800);
    const after = await P.page.evaluate((gid) => {
      const R = window._gameState.current.rpg;
      const a = (R.armorStash || []).find((x) => x && x.gid === gid);
      return a ? { quality: a.quality || null, unrevealed: !!a.unrevealed } : null;
    }, got && got.gid);
    const t2 = await tile(P, '[data-bag-key^="stashArmor-"]');
    rec.ok(`5. then the tile is the elite piece (${t2 && t2.border}, no "?") and the bag's copy carries the grade`,
      !!t2 && !t2.mark && t2.border === ORANGE && !!after && after.quality === 'elite' && !after.unrevealed, { t2, after });
    await P.page.screenshot({ path: join(OUT, 'revealbag-5-graded.png') }).catch(() => {});

    /* ── 6 ── Equip reveals first: a "?" Iron Great Sword */
    const g2 = await H.devOp(wsPort, 'revealbag', me, { grade: 'rare', give: 'weapon' }).catch((e) => ({ err: String(e) }));
    const wIdx = await H.waitFor(P, (S) => {
      const i = (S.rpg.weaponStash || []).findIndex((w) => w && w.unrevealed);
      return i >= 0 ? i : null;
    }, (v) => v !== null, { timeout: 10000, label: 'the "?" blade' }).catch(() => null);
    rec.ok('6. a "?" Iron Great Sword is in the weapon bag (the echo carries no grade)', !!g2 && g2.ok === true && wIdx !== null
      && (await H.readState(P, (S) => { const w = S.rpg.weaponStash.find((x) => x && x.unrevealed); return w && w.quality === undefined; })), { g2, wIdx });
    if (wIdx !== null) {
      await openBag(P);
      await P.page.locator(`[data-bag-key="stashWeapon-${wIdx}"]`).first().tap();
      await P.page.waitForTimeout(700);
      const before = await H.readState(P, (S) => (S.rpg.weapon && S.rpg.weapon.gearBase) || null);
      const eq = P.page.locator('[data-item-card] button, [data-gear-pane="bro"] button', { hasText: 'Equip' }).first();
      await eq.tap().catch(() => {});
      const spin2 = await H.waitFor(P, () => document.querySelector('[data-tut="reveal-overlay"]') ? true : null, (v) => v, { timeout: 6000, label: 'the overlay (equip)' }).catch(() => null);
      const wornDuring = await H.readState(P, (S) => (S.rpg.weapon && S.rpg.weapon.gearBase) || null);
      rec.ok('6. Equip on a "?" plays the reveal first, the blade not yet on', !!spin2 && wornDuring === before, { spin2, before, wornDuring });
      const on = await H.waitFor(P, (S) => {
        const w = S.rpg.weapon;
        return w && w.gearBase === 'iron' && !document.querySelector('[data-tut="reveal-overlay"]') ? { q: w.quality || null, u: !!w.unrevealed } : null;
      }, (v) => !!v, { timeout: 15000, label: 'the blade on' }).catch(() => null);
      rec.ok('6. ...then, once it has landed, the blade is wielded, graded', !!on && on.q === 'rare' && !on.u, on);
    }
    rec.ok('7. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
