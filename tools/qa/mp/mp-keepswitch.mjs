/* ═══ v2.3.3888: THE ADDRESS'S SWITCHES KEPT THROUGH THE DOOR ═══
 *
 * The game's own reloads kept only ?guest=1, so a switch the owner typed was
 * gone once a character was picked from the list (ui/keepSwitches.js).  On
 * an upright phone, opened with a harmless switch (?mappin=0: no map pin):
 *   1. in the world, the switch is in effect;
 *   2. logged out the player's way (the chip, then Log Out), the door's
 *      address still carries it, with the door's own words;
 *   3. the character picked from the list, back in the world: the switch is
 *      still in the address and still in effect, and the door's words are
 *      gone (no login, no noresume).
 */
import * as H from './harness.mjs';

const NAME = 'Switchy';
const where = (P) => P.page.evaluate(() => ({
  search: window.location.search,
  pinsOn: window.__btMapPin ? window.__btMapPin.on() : null,
  zone: window._gameState && window._gameState.current && window._gameState.current.currentZone,
  myId: window._gameState && window._gameState.current && window._gameState.current.myId,
}));
export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: NAME, wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2, query: 'mappin=0' });
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const w1 = await where(P);
    rec.ok(`1. opened with ?mappin=0, the switch is in effect (pins on: ${w1.pinsOn})`, /(^|[?&])mappin=0(&|$)/.test(w1.search) && w1.pinsOn === false, w1);
    /* 2. logged out the player's way */
    await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) {} });
    await P.page.waitForTimeout(600);
    const chip = await P.page.$('[aria-label="Log out to the character screen"]');
    if (chip) { await chip.click(); await P.page.waitForTimeout(700); }
    const confirmBtn = await P.page.$('text=Log Out');
    if (confirmBtn) {
      await Promise.all([P.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}), confirmBtn.click()]);
      await P.page.waitForTimeout(3000);
    }
    const w2 = await where(P);
    rec.ok(`2. logged out, the door's address keeps it (${w2.search})`, !!chip && !!confirmBtn && /(^|[?&])mappin=0(&|$)/.test(w2.search) && /login=1/.test(w2.search) && /noresume=1/.test(w2.search), w2);
    /* 3. the character picked from the list */
    await H.openPicker(P.page);
    await P.page.waitForTimeout(900);
    const row = await P.page.$(`[data-tut="char-row"][data-char-name="${NAME}"]`);
    if (row) {
      await Promise.all([P.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}), row.click()]);
    }
    const back = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'back in the world' }).catch(() => null);
    await P.page.waitForTimeout(1500);
    const w3 = await where(P);
    rec.ok(`3. picked from the list and back in the world (${w3.search}): the switch is still there and in effect (pins on: ${w3.pinsOn}), the door's words gone`,
      !!row && !!back && /(^|[?&])mappin=0(&|$)/.test(w3.search) && w3.pinsOn === false && !/login=|noresume=/.test(w3.search), { w3, row: !!row });
  } finally { await P.ctx.close().catch(() => {}); }
}
