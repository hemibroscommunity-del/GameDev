/* EVERY CROP IS FOOD, ON A PHONE (v2.3.3537, docs/specs/crop-food.md).
 *
 * server/test/crop-food proves the rule on the worker; this proves a player
 * can use it:
 *   1. A carrot's card in the bag says "+10 HP when eaten" and has Eat; eating
 *      it heals 50 on the worker, takes one carrot, and says "Ate Carrot".
 *   2. A heartroot's card promises its bigger heal ("+48 HP when eaten").
 *   3. The one-tap quick eat offers the cooked fish, never a crop -- and with
 *      only crops in the bag it is not there at all.
 *   4. With `cropeat: false` (caps.cropeat false at the next join) a crop's
 *      card has no Eat.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

const serverHp = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id);
  return { hp: a && a.live ? a.live.hp : null, inv: (a && a.rpg && a.rpg.inventory) || {} };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `cropfood-${name}.png`) }).catch(() => {});

  const A = await H.newPlayer(browser, { name: 'Cropbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
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
    await A.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.cropeat));
    rec.ok('the worker advertises caps.cropeat', caps === true, caps);

    await H.grant(wsPort, id, 'item', { invKey: 'crop_carrot', count: 3 });
    await H.grant(wsPort, id, 'item', { invKey: 'herb_heartroot', count: 1 });
    await H.devOp(wsPort, 'vitals', id, { god: false });
    await H.devOp(wsPort, 'vitals', id, { hp: 30 });
    await A.page.waitForTimeout(1500);

    /* open the bag, tap a tile, read the card; press `verb` if asked */
    const card = async (key, verb) => {
      await A.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) {} });
      await A.page.waitForTimeout(1000);
      const tile = await A.page.$(`[data-inv-key="${key}"]`);
      if (!tile) return { tile: false };
      await tile.dispatchEvent('pointerup');
      await A.page.waitForTimeout(800);
      const pop = await A.page.evaluate(() => {
        const eat = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Eat');
        return { eat: !!eat, text: (document.body.innerText || '').replace(/\s+/g, ' ') };
      });
      const heal = /\+(\d+) HP when eaten/.exec(pop.text || '');
      let said = null;
      if (verb && pop.eat) {
        await shot(A, 'card-' + key);
        const btn = await A.page.$('button:text-is("Eat")');
        if (btn) {
          await btn.click();
          /* what the game said over the bro, read as it says it */
          for (let i = 0; i < 12 && !(said && said.ate); i++) {
            await A.page.waitForTimeout(150);
            said = await A.page.evaluate(() => {
              const S = window._gameState && window._gameState.current;
              const texts = ((S && S.dmgNumbers) || []).map((d) => String(d.text || ''));
              return { ate: texts.find((x) => /^Ate /.test(x)) || null, hp: texts.find((x) => /^\+\d+ HP$/.test(x)) || null };
            });
          }
          await A.page.waitForTimeout(1200);
        }
      }
      await A.page.evaluate(() => {
        try { window._itemDetailBus.close(); } catch (e) {}
        try { window.__broDashPanelBus.clear(); } catch (e) {}
      });
      await A.page.waitForTimeout(500);
      return { tile: true, eat: pop.eat, heal: heal ? +heal[1] : null, said };
    };

    /* ── 1. a carrot ── */
    const s0 = await serverHp(wsPort, id);
    const c1 = await card('crop_carrot', 'Eat');
    const s1 = await serverHp(wsPort, id);
    rec.ok('a carrot\'s card says "+10 HP when eaten" and has Eat', c1.tile && c1.eat && c1.heal === 10, c1);
    /* at least 50: the Wheel's BroTown is safe ground, where the bar also
       refills by itself (index.js _tickPlayerRegen) while the card is open;
       the exact 50 is server/test/crop-food's */
    rec.ok(`...eaten, the worker heals it (${s0.hp} -> ${s1.hp}, 50 of it the carrot's) and takes one carrot`,
      typeof s0.hp === 'number' && s1.hp - s0.hp >= 50 && (s1.inv.crop_carrot || 0) === 2, { s0: s0.hp, s1: s1.hp, carrots: s1.inv.crop_carrot });
    rec.ok('...and the game says "+10 HP" and "Ate Carrot"', !!c1.said && c1.said.hp === '+10 HP' && c1.said.ate === 'Ate Carrot', c1.said);

    /* ── 2. a heartroot's bigger heal ── */
    const c2 = await card('herb_heartroot', null);
    rec.ok('a heartroot\'s card promises "+48 HP when eaten" (238 HP, half a pike)', c2.tile && c2.eat && c2.heal === 48, c2);

    /* ── 3. quick eat: the fish, never a crop ── */
    const qe0 = await A.page.evaluate(() => (window.__btQuickEat ? window.__btQuickEat() : 'no probe'));
    const btn0 = await A.page.$('.bt-quickeat-btn');
    rec.ok('with only crops in the bag (and HP to fill) there is no quick-eat button', qe0 === null && !btn0, { qe0, btn: !!btn0 });
    await H.grant(wsPort, id, 'item', { invKey: 'cooked_fish_minnow', count: 1 });
    await A.page.waitForTimeout(1500);
    const qe1 = await A.page.evaluate(() => (window.__btQuickEat ? window.__btQuickEat() : 'no probe'));
    rec.ok('given a cooked minnow, quick eat offers the fish, not a crop', !!qe1 && qe1.key === 'cooked_fish_minnow' && qe1.kinds === 1, qe1);

    /* ── 4. the switch ── */
    const thrown = await H.liveFlag(wsPort, 'cropeat', false);
    await A.page.evaluate(() => { const S = window._gameState && window._gameState.current; if (S && S._serverCaps) S._serverCaps.cropeat = false; });
    const c3 = await card('crop_carrot', null);
    rec.ok('with cropeat false a carrot\'s card has no Eat and promises no heal', !!(thrown && thrown.ok !== false) && c3.tile && !c3.eat && c3.heal === null, { thrown, c3 });
    await H.liveFlag(wsPort, 'cropeat', null);

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    alive = false;
    await keep.catch(() => {});
    await A.ctx.close().catch(() => {});
  }
}
