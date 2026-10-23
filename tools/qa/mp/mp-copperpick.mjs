/* ═══ v2.3.3571: THE OWNER'S COPPER ORE AND PICKAXE, AND THE BAG'S PINE BOW ═══
 *
 * The owner, 2026-10-22, with a picture of a copper ore lump and a pickaxe:
 * "Ok change the art style of the copper ore and the pickaxe to this.  Also
 * revert the inventory art of the bow back to the original one (pine) because
 * I think you mistook the bow icon to replace inventory art when I only wanted
 * it to replace the menu art for the bow."
 *
 * On a phone (390 x 844) in the world, a bag the worker filled:
 *   1. the bag's copper ore and pickaxe are the owner's new pictures -- the
 *      files tools/ui/cut-owner-items.py wrote, byte for byte as the page is
 *      served them (tools/ui/owner-items.json's SHA-256), decoded;
 *   2. the bag's bow (a spare, its weapon tile) is the PINE bow again, the
 *      file as it was before v2.3.3526;
 *   3. the menu's bow -- the Character window's Equipment slot and the weapon
 *      button under the stick, the bow in hand -- is the owner's card 11 bow,
 *      its own file (icons/ui/equip-bow.webp), and nothing there draws the
 *      bag's bow;
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/copperpick-{bag,hero,button}.png.
 *
 *   node tools/qa/mp/run.mjs copperpick
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
/* the pine bow as it was before v2.3.3526 (owner-icons.test §8f) and the
   owner's card 11 bow (owner-picks-card11.sha256) */
const PINE_BOW_SHA = '8c47885d06397402d31c91d01f6fd5375d817918bdfd8f61b36fbea71c5c388c';
const MENU_BOW_SHA = '91ff0bd0d1746b4075e58e9d59421ef47f0153892792bd5480cf8defa057d877';

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `copperpick-${name}.png`) }).catch(() => {});
  const items = JSON.parse(readFileSync(join(H.REPO, 'tools/ui/owner-items.json'), 'utf8'));
  const A = await H.newPlayer(browser, { name: 'Coppa', wsPort, webPort, world: 'wheel', viewport: PHONE });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  await H.enterWorld(A);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(A, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await A.page.waitForTimeout(500);
  }
  let stopAlive = false;
  (async () => { while (!stopAlive) { await A.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {}); } })();
  /* what the page is SERVED at a picture's address: its bytes' SHA-256 */
  const served = (url) => A.page.evaluate(async (u) => {
    const b = await (await fetch(u, { cache: 'no-store' })).arrayBuffer();
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b))).map((x) => x.toString(16).padStart(2, '0')).join('');
  }, url);
  const file = (u) => String(u || '').split('?')[0];
  try {
    await A.page.waitForTimeout(1500);
    const me = await H.readState(A, (S) => S.myId);

    /* the bow in hand (the worker's own, H.armWorker), then a spare in the bag */
    const armed = await H.armWorker(A, wsPort, me, ['bow']);
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => null);
    await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: 5 });
    await H.grant(wsPort, me, 'item', { invKey: 'mining_pickaxe', count: 1 });
    const ready = await H.waitFor(A, () => {
      const S = window._gameState && window._gameState.current;
      const R = (S && S.rpg) || {};
      const inv = R.inventory || {};
      return { held: !!(R.rangedWeapon && R.rangedWeapon.type === 'bow'), spare: (R.weaponStash || []).filter((w) => w && w.type === 'bow').length,
        ore: inv.ore_copper_ore || 0, pick: inv.mining_pickaxe || 0, active: R.activeSlot };
    }, (v) => v.held && v.spare >= 1 && v.ore >= 5 && v.pick >= 1, { timeout: 20000, label: 'the bow, a spare, the ore and the pickaxe' }).catch(() => null);
    rec.ok(`the worker put a bow in hand (${armed.join(', ') || 'none'}), a spare bow, 5 copper ore and the pickaxe in the bag`, !!ready, ready);

    /* ── 1-2. the bag ── */
    await A.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) { /* no bus */ } });
    const bag = await H.waitFor(A, async () => {
      const one = async (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        el.scrollIntoView({ block: 'nearest' });
        const img = el.querySelector('img');
        if (img && !(img.complete && img.naturalWidth > 0)) { try { await img.decode(); } catch (e) { /* counted */ } }
        return img ? { src: img.getAttribute('src'), ok: img.complete && img.naturalWidth > 0 } : { src: null, ok: false };
      };
      return { ore: await one('[data-inv-key="ore_copper_ore"]'), pick: await one('[data-inv-key="mining_pickaxe"]'), bow: await one('[data-gear="bow"]') };
    }, (v) => v.ore && v.ore.ok && v.pick && v.pick.ok && v.bow && v.bow.ok, { timeout: 12000, label: 'the bag\'s three tiles' }).catch(() => null);
    const oreSha = bag && bag.ore ? await served(bag.ore.src) : null;
    const pickSha = bag && bag.pick ? await served(bag.pick.src) : null;
    rec.ok('1. the bag\'s copper ore and pickaxe are the owner\'s new pictures, served byte for byte as tools/ui/cut-owner-items.py cut them, decoded',
      !!bag && file(bag.ore.src) === '/icons/items/ore-copper.webp' && file(bag.pick.src) === '/icons/items/mining-pickaxe.webp'
      && oreSha === items['public/icons/items/ore-copper.webp'].sha256 && pickSha === items['public/icons/items/mining-pickaxe.webp'].sha256,
      { bag, oreSha, pickSha });
    const bowSha = bag && bag.bow ? await served(bag.bow.src) : null;
    rec.ok('2. the bag\'s spare bow is the pine bow again (the file before v2.3.3526)',
      !!bag && file(bag.bow.src) === '/icons/items/bow.webp' && bowSha === PINE_BOW_SHA, { bow: bag && bag.bow, bowSha });
    await A.page.evaluate(() => { const el = document.querySelector('[data-inv-key="ore_copper_ore"]'); if (el) el.scrollIntoView({ block: 'center' }); });
    await A.page.waitForTimeout(400);
    await shot(A, 'bag');
    await A.page.evaluate(() => { try { window.__broDashPanelBus.clear(); } catch (e) { /* no bus */ } });
    await A.page.waitForTimeout(400);

    /* ── 3. the menu's bow: the Equipment slot and the weapon button ── */
    await A.page.evaluate(() => { try { window.__broDashPanelBus.open('hero'); } catch (e) { /* no bus */ } });
    const hero = await H.waitFor(A, async () => {
      const imgs = Array.from(document.querySelectorAll('img')).filter((i) => /\/icons\/(ui\/equip-bow|items\/bow)\.webp/.test(i.getAttribute('src') || '')
        && i.getBoundingClientRect().width > 0);
      for (const i of imgs) if (!(i.complete && i.naturalWidth > 0)) { try { await i.decode(); } catch (e) { /* counted */ } }
      return imgs.map((i) => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 }));
    }, (v) => v.length >= 1 && v.every((i) => i.ok), { timeout: 12000, label: 'a bow in the Character window' }).catch(() => null);
    const menuSha = hero && hero[0] ? await served(hero[0].src) : null;
    rec.ok(`3a. the Character window's Equipment slot wears the owner's card 11 bow, its own file (${hero ? hero.map((i) => file(i.src)).join(', ') : 'no bow drawn'})`,
      !!hero && hero.every((i) => file(i.src) === '/icons/ui/equip-bow.webp') && menuSha === MENU_BOW_SHA, { hero, menuSha });
    await shot(A, 'hero');
    await A.page.evaluate(() => { try { window.__broDashPanelBus.clear(); } catch (e) { /* no bus */ } });
    await A.page.waitForTimeout(500);
    const chip = await H.waitFor(A, () => {
      const i = document.querySelector('[data-weapon-chip] img');
      return i ? { slot: i.closest('[data-weapon-chip]').getAttribute('data-weapon-chip'), src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 } : null;
    }, (v) => !!v && v.ok, { timeout: 8000, label: 'the weapon button' }).catch(() => null);
    rec.ok(`3b. the weapon button under the stick, the bow in hand, wears the same bow as the Equipment slot (${chip ? chip.slot + ' ' + file(chip.src) : 'no button'})`,
      !!chip && file(chip.src) === '/icons/ui/equip-bow.webp', chip);
    await shot(A, 'button');

    rec.ok('4. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
  }
}
