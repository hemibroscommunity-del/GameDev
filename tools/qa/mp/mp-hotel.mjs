/* ═══ THE HOTEL OPENS, ON A PHONE (v2.3.3539, docs/specs/hotel-rest.md) ═══
 *
 * The owner: "I value SIMPLICITY and INTELLIGIBILITY".  The farm's bed rested
 * you on the phone alone, so the Hotel stood shut; the worker pays a rest now
 * (server/src/rest.js).  One real player against a real worker, in the
 * Wheel's Brotown, on a phone (390 x 844, touch):
 *   1. the worker rests (caps.rest) and the Hotel's door is a hall: at its
 *      steps "Enter HOTEL", the owner's bed on the button, no "Shut for now";
 *   2. inside, over its room: what a night does ("+10% combat XP for 30
 *      minutes. Free.") over one row, Rest;
 *   3. worn down (30 HP, 5 stamina), Rest: the window closes, the WORKER fills
 *      health and stamina and saves Well Rested for 30 minutes, and the phone
 *      says "Fully Rested!" and "+10% combat XP for 30 min" over the bro and
 *      shows the "Rested" chip;
 *   4. the window again says how long is left, and Rest within the minute is
 *      refused in words ("You just rested"), the bars left alone;
 *   5. the farm's bed is the same rest: on your farm, its Sleep button asks
 *      the worker, which rests you there too (a minute after the Hotel);
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/hotel-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FARM_SPOTS } from '../../../src/data/farmLayout.js';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `hotel-${name}.png`) }).catch(() => {});

  const A = await H.newPlayer(browser, { name: 'Restbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let alive = true;
  const keep = (async () => { while (alive) { await A.page.keyboard.press('Control').catch(() => {}); await A.page.waitForTimeout(20000); } })();
  try {
    await H.enterWorld(A);
    const wa = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('the player is in the Wheel (guard)', !!wa, wa);
    if (!wa) return;
    const id = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    /* a phone has no keyboard (mp-wheeldoors' note): no "E" hint */
    await A.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.rest));
    rec.ok('the worker rests (caps.rest)', caps === true, caps);

    /* ── 1. the Hotel's door ── */
    let doors = [];
    for (let i = 0; i < 40 && !doors.some((d) => d.id === 'hotel'); i++) {
      doors = await A.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (!doors.some((d) => d.id === 'hotel')) await A.page.waitForTimeout(500);
    }
    const hotel = doors.find((d) => d.id === 'hotel');
    rec.ok('the Hotel is a hall, not shut', !!hotel && hotel.hall === 'hotel' && !hotel.closed, hotel);
    if (!hotel) return;
    /* the boots at (x, bootsY): S.player is the body's middle (mp-wheeldoors) */
    const standAt = async (x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await A.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(A, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await A.page.waitForTimeout(800);
        const g = await A.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
      }
      return false;
    };
    const atDoor = () => A.page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || ''));
      const shut = document.querySelector('[data-wheel-shut-door]');
      const img = b ? b.querySelector('img') : null;
      return { btn: b ? (b.textContent || '').replace(/\s+/g, ' ').trim() : null, hall: b ? b.getAttribute('data-enter-hall') : null,
        pic: img ? img.getAttribute('src') : null, shut: shut ? (shut.textContent || '').trim() : null };
    });
    await standAt(hotel.x, hotel.y + 30);
    let door = null;
    for (let i = 0; i < 16; i++) { door = await atDoor(); if (door.btn || door.shut) break; await A.page.waitForTimeout(250); }
    await shot(A, 'door');
    rec.ok(`at its steps: "${door && door.btn}", the owner's bed on it, and no "Shut for now"`,
      !!door && /Enter\s*HOTEL/.test(door.btn || '') && door.hall === 'hotel' && /\/ui\/controls\/sleep\.webp/.test(door.pic || '') && !door.shut, door);

    /* ── 2. the window ── */
    const openHotel = async () => {
      await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
      for (let i = 0; i < 20; i++) {
        const w = await A.page.evaluate(() => {
          const h = document.querySelector('[data-wheel-hall="hotel"]');
          if (!h) return null;
          const room = document.querySelector('.bt-room img, [data-room] img');
          return { rows: Array.from(h.querySelectorAll('[data-hall-row]')).map((b) => b.getAttribute('data-hall-row')),
            text: (h.innerText || '').replace(/\s+/g, ' '), rested: (h.querySelector('[data-hotel-rested]') || {}).getAttribute ? h.querySelector('[data-hotel-rested]').getAttribute('data-hotel-rested') : null,
            room: room ? room.getAttribute('src') : null };
        });
        if (w) return w;
        await A.page.waitForTimeout(250);
      }
      return null;
    };
    const w1 = await openHotel();
    await A.page.waitForTimeout(800);
    await shot(A, 'window');
    rec.ok(`inside, over its own room: what a night does ("${w1 && w1.text.slice(0, 120)}") and one row, Rest`,
      !!w1 && w1.rows.join() === 'rest' && /\+10% combat XP for 30 minutes\. Free\./.test(w1.text) && w1.rested === '0' && /\/world\/interiors\/hotel\.webp/.test(w1.room || ''), w1);

    /* ── 3. worn down, Rest ── */
    await H.devOp(wsPort, 'vitals', id, { god: false });
    await H.devOp(wsPort, 'vitals', id, { hp: 30, stamina: 5 });
    await A.page.waitForTimeout(400);
    const before = await H.adminPlayer(wsPort, id);
    const said = [];
    await A.page.evaluate(() => { const b = document.querySelector('[data-hall-row="rest"]'); if (b) b.click(); });
    for (let i = 0; i < 16; i++) {
      await A.page.waitForTimeout(150);
      const t = await A.page.evaluate(() => { const S = window._gameState && window._gameState.current; return ((S && S.dmgNumbers) || []).map((d) => String(d.text || '')); });
      for (const x of t) if (!said.includes(x)) said.push(x);
      if (said.includes('Fully Rested!')) break;
    }
    await A.page.waitForTimeout(1200);
    const after = await H.adminPlayer(wsPort, id);
    const life = after.live || {}, rpg = after.rpg || {};
    const until = rpg._buffs && rpg._buffs.wellRested;
    const closed = await A.page.evaluate(() => !document.querySelector('[data-wheel-hall="hotel"]'));
    const chip = await A.page.evaluate(() => { const c = document.querySelector('[data-buff-chip="Rested"]'); return c ? (c.parentElement.textContent || '').trim() : null; });
    const page = await H.readState(A, (S) => ({ until: S.rpg && S.rpg._wellRestedUntil, hp: S.rpg && S.rpg.hp, maxHp: S.rpg && S.rpg.maxHp }));
    await shot(A, 'rested');
    rec.ok(`Rest closes the window and the worker rests you: HP ${before.live && before.live.hp} -> ${life.hp}, stamina ${before.live && before.live.stamina} -> ${life.stamina} of ${life.maxStamina}`,
      closed && !!before.live && before.live.hp <= 60 && life.hp >= before.live.hp && life.hp === page.maxHp && life.stamina === life.maxStamina, { before: before.live, after: life, page });
    rec.ok(`...and saves Well Rested for 30 minutes (${until ? Math.round((until - Date.now()) / 60000) + ' min' : 'none'}), the page holding the worker's own`,
      typeof until === 'number' && until - Date.now() > 29 * 60000 && until - Date.now() <= 30 * 60000 && page.until === until, { until, page });
    rec.ok(`...and says so: ${said.filter((x) => /Rested|combat XP/.test(x)).join(' / ')}; the "Rested" chip up (${chip})`,
      said.includes('Fully Rested!') && said.includes('+10% combat XP for 30 min') && !!chip && /30m|29m/.test(chip), { said, chip });

    /* ── 4. again ── */
    const w2 = await openHotel();
    rec.ok(`the window again says how long is left: "${w2 && w2.text.slice(0, 90)}"`,
      !!w2 && w2.rested === '1' && /You are Well Rested: \+10% combat XP for (30|29) min more\./.test(w2.text), w2);
    await H.devOp(wsPort, 'vitals', id, { hp: 40 });
    await A.page.waitForTimeout(400);
    const said2 = [];
    await A.page.evaluate(() => { const b = document.querySelector('[data-hall-row="rest"]'); if (b) b.click(); });
    for (let i = 0; i < 16; i++) {
      await A.page.waitForTimeout(150);
      const t = await A.page.evaluate(() => { const S = window._gameState && window._gameState.current; return ((S && S.dmgNumbers) || []).map((d) => String(d.text || '')); });
      for (const x of t) if (!said2.includes(x)) said2.push(x);
      if (said2.includes('You just rested')) break;
    }
    const again = await H.adminPlayer(wsPort, id);
    rec.ok(`...and Rest within the minute is refused in words ("${said2.find((x) => /rest/i.test(x))}"), the bar left alone (${again.live && again.live.hp}) and Well Rested's half hour not restarted`,
      said2.includes('You just rested') && !!again.live && again.live.hp < page.maxHp && again.rpg && again.rpg._buffs && again.rpg._buffs.wellRested === until,
      { said2, hp: again.live && again.live.hp, until: again.rpg && again.rpg._buffs && again.rpg._buffs.wellRested });
    const restedAt = Date.now();

    /* ── 5. the farm's bed ── */
    await A.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
    let visit = null;
    for (let i = 0; i < 32 && !visit; i++) {
      visit = await A.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      if (!visit) await A.page.waitForTimeout(250);
    }
    if (visit) await A.page.touchscreen.tap(visit.x, visit.y);
    const onFarm = await H.waitFor(A, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') }),
      (v) => v.zone === 'farm_home' && !v.hold && !v.veil, { timeout: 60000, label: 'on the farm' }).catch(() => null);
    rec.ok('the Feed & Seed takes you to your farm (guard)', !!onFarm, onFarm);
    if (onFarm) {
      /* the bed in the hay: stand at its foot, where the Sleep button comes up */
      await standAt(FARM_SPOTS.sleep.x, FARM_SPOTS.sleep.y - 10);
      /* the bed's prompt, as the HUD draws it: within a few seconds of
         standing there, at full health with nothing else changing on screen.
         v2.3.3548: it came up only when something else redrew the HUD (no
         React state behind it), and once waited a minute and a quarter for
         the dev lever's health change to redraw it; 5 s, not 1, for this
         box's slow timers (TRAPS §200) */
      let sleepBtn = null;
      for (let i = 0; i < 20 && !sleepBtn; i++) {
        sleepBtn = await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Sleep/.test(q.textContent || '')); return b ? (b.textContent || '').trim() : null; });
        if (!sleepBtn) await A.page.waitForTimeout(250);
      }
      /* a minute after the Hotel's rest (the worker's REST.GAP_MS) */
      const waitMs = 61000 - (Date.now() - restedAt);
      if (waitMs > 0) await A.page.waitForTimeout(waitMs);
      /* (the farm is a hub: its own top-off refills a bar in a few seconds,
         index.js -- the rest's own mark here is Well Rested started again) */
      await H.devOp(wsPort, 'vitals', id, { hp: 30, stamina: 5 });
      await A.page.waitForTimeout(400);
      const farmMax = await H.readState(A, (S) => S.rpg && S.rpg.maxHp);
      const fb = await H.adminPlayer(wsPort, id);
      const said3 = [];
      await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Sleep/.test(q.textContent || '')); if (b) b.click(); });
      for (let i = 0; i < 16; i++) {
        await A.page.waitForTimeout(150);
        const t = await A.page.evaluate(() => { const S = window._gameState && window._gameState.current; return ((S && S.dmgNumbers) || []).map((d) => String(d.text || '')); });
        for (const x of t) if (!said3.includes(x)) said3.push(x);
        if (said3.includes('Fully Rested!')) break;
      }
      await A.page.waitForTimeout(1200);
      const fa = await H.adminPlayer(wsPort, id);
      const until2 = fa.rpg && fa.rpg._buffs && fa.rpg._buffs.wellRested;
      await shot(A, 'farm-bed');
      rec.ok(`on your farm the bed's Sleep ("${sleepBtn}") asks the worker, which rests you there too: HP ${fb.live && fb.live.hp} -> ${fa.live && fa.live.hp}, Well Rested started again`,
        !!sleepBtn && !!fb.live && fb.live.hp < farmMax && !!fa.live && fa.live.hp === farmMax && fa.live.stamina === fa.live.maxStamina
          && typeof until2 === 'number' && until2 > until && said3.includes('Fully Rested!'),
        { sleepBtn, before: fb.live, after: fa.live, until2, said3 });
    }

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    alive = false;
    await keep.catch(() => {});
    await A.ctx.close().catch(() => {});
  }
}
