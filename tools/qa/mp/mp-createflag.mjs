/* ═══ A CRASH'S RELOAD NEVER LANDS A PLAYER IN THE CREATOR (v2.3.3046) ═══
 *
 * Owner: "Game crashed and brought me to trait picker screen. killing mummies
 * and destroyed prop."  iPhone Safari reloads a page it killed for memory from
 * the address the page had -- and the door's "Create new character" puts
 * `?create=1` there, which nothing took away once the character was made.  The
 * boot check obeys that flag before anything else, so the reload after the
 * crash opened the creator over a character that already existed.
 *
 * On a phone, against a real worker:
 *   1. a new character made through the creator: once in the world, the
 *      address has no `create` (nor `login`, `noresume`);
 *   2. the address put back the way an old tab kept it (`?create=1`) and the
 *      page reloaded -- the crash's reload: the boot takes the ordinary road
 *      (route 'create-stale'), the creator never opens, and the address is
 *      tidied;
 *   3. a genuinely NEW key with `?create=1` still opens the creator (the
 *      door's own road is untouched).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Crashbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const search1 = await P.page.evaluate(() => window.location.search);
    rec.ok(`1. in the world, the address carries no routing flag (search "${search1}")`,
      !/[?&](create|login|noresume)=/.test(search1), { search1 });

    /* 2. the crash's reload, from an address an old tab kept */
    await P.page.evaluate(() => {
      const u = new URL(window.location.href);
      u.searchParams.set('create', '1');
      window.history.replaceState(null, '', u.pathname + u.search + u.hash);
    });
    await P.page.reload({ waitUntil: 'domcontentloaded' });
    await P.page.waitForFunction(() => window.__btBootRoute || null, null, { timeout: 30000 }).catch(() => null);
    await P.page.waitForTimeout(2500);
    const after = await P.page.evaluate(() => ({ search: window.location.search, route: window.__btBootRoute || null,
      stale: !!window.__btCreateStale }));
    rec.ok(`2. reloaded from "?create=1" with a character on this key: the flag read as stale, the ordinary road (route "${after.route}"), never the creator, the address tidied`,
      after.stale === true && after.route !== 'create-forced' && !/[?&]create=1/.test(after.search), after);

    /* 3. a brand-new key with the flag still gets the creator */
    const N = await browser.newContext({ viewport: PHONE, hasTouch: true });
    const np = await N.newPage();
    await np.addInitScript((port) => { window.BROTOWN_WS_URL = 'ws://127.0.0.1:' + port; window.__btProbe = true; }, wsPort);
    await np.goto(`http://localhost:${webPort}/?create=1&nospawn`, { waitUntil: 'domcontentloaded' });
    const fresh = await np.waitForFunction(() => window.__btBootRoute || null, null, { timeout: 30000 })
      .then((h) => h.jsonValue()).catch(() => null);
    rec.ok(`3. a new key with "?create=1" still opens the creator (route "${fresh}")`, fresh === 'create-forced', { fresh });
    await N.close().catch(() => {});
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
