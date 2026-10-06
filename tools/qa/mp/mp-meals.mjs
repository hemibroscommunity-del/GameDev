/* MEALS AND BREWS YOU CARRY, ON A PHONE (v2.3.3114).
 *
 * The farming plan's Phase 2 (docs/FARMING-PLAN.md, docs/specs/meals.md): the
 * Cookhouse makes things you carry, one meal and one brew may run at once,
 * and Diego's three tonics are brewed instead of sold.  server/test/meals
 * proves the rules on the worker; this proves a player can reach them:
 *
 *   1. "Enter" at the Cookhouse opens its window under caps.meals: Meals &
 *      Brews, the Herb Bread cookable at Cooking 1, the three tonics listed.
 *   2. Cook puts a Herb Bread in the bag -- the worker's own copy agrees --
 *      and runs nothing yet.
 *   3. In the bag it files under the Consumable chip (its popup's caption
 *      says so), with an Eat button that says what it does; eating it runs
 *      the meal for half an hour, and the HUD counts it in minutes.
 *   4. A Firebloom Tea (as bought on the market) drinks from the bag: the
 *      brew runs BESIDE the meal, and the HUD shows both.
 *   5. Diego's shelf is his two staples -- no tonic -- and he says he won't
 *      buy a tonic back, nor a Herb Bread.
 *   6. With the kill switch thrown, a bread in the bag still eats.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `meals-${name}.png`) }).catch(() => {});

  const A = await H.newPlayer(browser, { name: 'Cookbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await A.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(A);
    const wa = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('the player is in the Wheel (guard)', !!wa, wa);
    if (!wa) return;
    const id = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    await A.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await H.grant(wsPort, id, 'item', { invKey: 'herb_firebloom', count: 2 });
    await A.page.waitForTimeout(1500);

    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.meals));
    rec.ok('the worker advertises caps.meals', caps === true, caps);

    /* ── to the Cookhouse's steps (mp-farm's walk) ── */
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
    let doors = [];
    for (let i = 0; i < 40 && doors.length < 17; i++) {
      doors = await A.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (doors.length < 17) await A.page.waitForTimeout(500);
    }
    const ck = doors.find((d) => d.id === 'cookhouse');
    rec.ok('the Cookhouse has a door (guard)', !!ck, doors.map((d) => d.id));
    if (!ck) return;
    await standAt(ck.x, ck.y + 30);
    let enter = null;
    for (let i = 0; i < 16 && !enter; i++) {
      enter = await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); return b ? (b.textContent || '').trim() : null; });
      if (!enter) await A.page.waitForTimeout(250);
    }
    await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });

    /* ── 1. the window ── */
    let row = null;
    for (let i = 0; i < 40 && !row; i++) {
      row = await A.page.evaluate(() => {
        const b = document.querySelector('[data-cook-recipe="0"]');
        return b ? { label: (b.textContent || '').trim(), disabled: !!b.disabled, makes: b.getAttribute('data-cook-makes') } : null;
      });
      if (!row) await A.page.waitForTimeout(250);
    }
    rec.ok(`"${enter}" opens the Cookhouse, the Herb Bread ready to cook into the bag`,
      !!row && !row.disabled && /Cook/.test(row.label) && row.makes === 'meal_herb_bread', row);
    const win = await A.page.evaluate(() => ({
      head: /meals & brews/i.test(document.body.innerText || ''),   /* the heading is drawn in capitals */
      tonics: ['whetstone', 'manaShard', 'swiftDraught'].map((k) => !!document.querySelector(`[data-cook-makes="${k}"]`)),
      bread: (() => { const b = document.querySelector('[data-cook-recipe="0"]'); const r = b && b.parentElement; return r ? (r.innerText || '').replace(/\s+/g, ' ').slice(0, 160) : null; })(),
    }));
    rec.ok('...under "Meals & Brews", saying what the bread does when eaten', win.head && /twice as fast/i.test(win.bread || ''), win);
    rec.ok('...and the three tonics are there to brew', win.tonics.every(Boolean), win.tonics);
    await shot(A, 'cookhouse');

    /* ── 2. Cook ── */
    await A.page.evaluate(() => { const b = document.querySelector('[data-cook-recipe="0"]'); if (b) b.click(); });
    await A.page.waitForTimeout(1800);
    const after = await H.readState(A, (S) => ({ bread: ((S.rpg && S.rpg.inventory) || {}).meal_herb_bread || 0,
      herbs: ((S.rpg && S.rpg.inventory) || {}).herb_firebloom || 0, regen: !!(S._regenBuff && Date.now() < S._regenBuff) }));
    const srv = ((await H.adminPlayer(wsPort, id)).rpg || {}).inventory || {};
    rec.ok('Cook puts a Herb Bread in the bag and uses one Firebloom', after.bread === 1 && after.herbs === 1, after);
    rec.ok('...settled by the worker: its own copy of the bag holds it', srv.meal_herb_bread === 1 && srv.herb_firebloom === 1, { bread: srv.meal_herb_bread, herbs: srv.herb_firebloom });
    rec.ok('...and nothing runs yet -- the bread waits to be eaten', !after.regen, after);
    await A.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
    await A.page.waitForTimeout(600);

    /* ── 3. the bag: Consumable, Eat ── */
    const cats = await A.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      return (window.__btBagCats && S && S.rpg) ? window.__btBagCats(S.rpg) : null;
    });
    const breadCat = Array.isArray(cats) ? cats.find((e) => e.key === 'meal_herb_bread') : null;
    rec.ok('in the bag the bread files under the Consumable chip, with the potions', !!breadCat && breadCat.cat === 'potion', breadCat);
    const useFromBag = async (key, verb) => {
      await A.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) {} });
      await A.page.waitForTimeout(1000);
      const tile = await A.page.$(`[data-inv-key="${key}"]`);
      if (!tile) return { tile: false };
      await tile.dispatchEvent('pointerup');
      await A.page.waitForTimeout(800);
      const pop = await A.page.evaluate((v) => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === v);
        const cap = document.querySelector('[data-item-caption]');
        return { btn: !!btn, text: (document.body.innerText || '').replace(/\s+/g, ' '),
          caption: cap ? cap.getAttribute('data-item-caption') : null };
      }, verb);
      const info = /twice as fast|20% damage/i.exec(pop.text || '');
      const btn = await A.page.$(`button:text-is("${verb}")`);
      if (btn) { await btn.click(); await A.page.waitForTimeout(1600); }
      await A.page.evaluate(() => {
        try { window._itemDetailBus.close(); } catch (e) {}
        try { window.__broDashPanelBus.clear(); } catch (e) {}
      });
      await A.page.waitForTimeout(500);
      return { tile: true, btn: pop.btn, info: info ? info[0] : null, caption: pop.caption };
    };
    const ate = await useFromBag('meal_herb_bread', 'Eat');
    const fed = await H.readState(A, (S) => ({ bread: ((S.rpg && S.rpg.inventory) || {}).meal_herb_bread || 0,
      regenMs: S._regenBuff ? S._regenBuff - Date.now() : 0 }));
    rec.ok('its popup has an Eat button and says what it does', ate.tile && ate.btn && !!ate.info, ate);
    /* v2.3.3114 review: the caption was the category's id, POTION, on a bread */
    rec.ok('...and its caption is the chip\'s word, Consumable (not Potion)', ate.caption === 'Consumable', ate);
    rec.ok('...and eating it runs the meal for half an hour, the bread used up', fed.bread === 0 && fed.regenMs > 28 * 60000 && fed.regenMs <= 30 * 60000, fed);
    const hud1 = await A.page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
    /* The chip is its icon and its time -- the green heart, then "30m". */
    rec.ok('...and the HUD counts it in minutes, not "1800s"', /\uD83D\uDC9A\s*(29|30)m/.test(hud1) && !/\b1[0-9]{3}s\b/.test(hud1), hud1.slice(0, 80));

    /* ── 4. a brew beside it ── */
    await H.grant(wsPort, id, 'item', { invKey: 'brew_firebloom_tea', count: 1 });
    await A.page.waitForTimeout(1500);
    const drank = await useFromBag('brew_firebloom_tea', 'Drink');
    const both = await H.readState(A, (S) => ({ tea: ((S.rpg && S.rpg.inventory) || {}).brew_firebloom_tea || 0,
      dmgMs: S._dmgBuff ? S._dmgBuff - Date.now() : 0, mul: S._dmgBuffMul || 0,
      regen: !!(S._regenBuff && Date.now() < S._regenBuff) }));
    rec.ok('a Firebloom Tea drinks from the bag (Drink, and the line says what it does)', drank.tile && drank.btn && !!drank.info, drank);
    rec.ok('...+20% damage for half an hour', both.tea === 0 && Math.abs(both.mul - 1.2) < 0.01 && both.dmgMs > 28 * 60000, both);
    rec.ok('...running BESIDE the meal -- one meal and one brew', both.regen, both);
    await shot(A, 'both');

    /* ── 5. Diego ── */
    await A.page.evaluate(() => window.__broShopBus.setOpen(true));
    let shelf = [];
    for (let i = 0; i < 40 && !shelf.includes('staminaSalts'); i++) {
      shelf = await A.page.evaluate(() => Array.from(document.querySelectorAll('[data-shop-bro]')).map((e) => e.getAttribute('data-shop-bro')));
      if (!shelf.includes('staminaSalts')) await A.page.waitForTimeout(200);
    }
    rec.ok('Diego\'s shelf has his staples and no tonic', shelf.includes('cookedMinnow') && shelf.includes('staminaSalts')
      && !shelf.some((k) => ['whetstone', 'manaShard', 'swiftDraught'].includes(k)), shelf);
    await H.grant(wsPort, id, 'item', { invKey: 'whetstone', count: 1 });
    await A.page.waitForTimeout(1500);
    await A.page.evaluate(() => { try { window.__broShopBus.setSel('whetstone', 'bag'); } catch (e) {} });
    let act = null;
    for (let i = 0; i < 20; i++) {
      act = await A.page.evaluate(() => { const b = document.querySelector('[data-shop-act]'); return b ? { label: (b.textContent || '').trim(), disabled: !!b.disabled } : null; });
      if (act && /won.t buy/i.test(act.label)) break;
      await A.page.waitForTimeout(250);
    }
    rec.ok('...and offered a Fury Tonic, he says he won\'t buy it (no Sell button to press)', !!act && act.disabled && /won.t buy/i.test(act.label), act);
    /* v2.3.3114 review: nor a dish -- its own pile paid more than its herbs' */
    await H.grant(wsPort, id, 'item', { invKey: 'meal_herb_bread', count: 1 });
    await A.page.waitForTimeout(1500);
    await A.page.evaluate(() => { try { window.__broShopBus.setSel('meal_herb_bread', 'bag'); } catch (e) {} });
    let actDish = null;
    for (let i = 0; i < 20; i++) {
      actDish = await A.page.evaluate(() => { const b = document.querySelector('[data-shop-act]'); return b ? { label: (b.textContent || '').trim(), disabled: !!b.disabled } : null; });
      if (actDish && /won.t buy/i.test(actDish.label)) break;
      await A.page.waitForTimeout(250);
    }
    rec.ok('...nor a Herb Bread (food is for eating, giving and the auction house)', !!actDish && actDish.disabled && /won.t buy/i.test(actDish.label), actDish);
    await shot(A, 'diego');
    await A.page.evaluate(() => window.__broShopBus.setOpen(false));

    /* ── 6. the kill switch keeps the food in bags edible ──
       `meals: false` reaches a page as caps.meals FALSE at its next join (an
       old worker sends none at all); the bag must keep Eat on a bread then.
       The flag is thrown on the worker for real, and the page given the caps
       that join would bring. */
    const flag = (method, body) => fetch(`http://127.0.0.1:${wsPort}/api/admin/flags` + (method === 'DELETE' ? '?name=meals' : ''), {
      method, headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));
    const thrown = await flag('POST', { name: 'meals', value: false });
    await A.page.evaluate(() => { const S = window._gameState && window._gameState.current; if (S && S._serverCaps) S._serverCaps.meals = false; });
    const offEat = await useFromBag('meal_herb_bread', 'Eat');
    const srvOff = await H.adminPlayer(wsPort, id);
    const rpgOff = (srvOff && srvOff.rpg) || {};
    rec.ok('with the switch thrown (caps.meals false) a bread in the bag still has Eat, and the worker eats it',
      !!(thrown && thrown.ok !== false) && offEat.tile && offEat.btn && !((rpgOff.inventory || {}).meal_herb_bread)
      && Number((rpgOff._buffs || {}).rest) > Date.now() + 28 * 60000, { thrown, offEat, inv: rpgOff.inventory, buffs: rpgOff._buffs });
    await flag('DELETE');

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
  }
}
