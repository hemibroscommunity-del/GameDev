/* ═══ mp-loadtimes (v2.3.5019): THE TEST PANEL'S LOADING TIMES ═══
 *
 * The box cannot say what a phone's loading screen waits on (mp-coldload,
 * 2026-11-13: 27 to 44 s here, ~5 s of it the page's own work), so the page
 * notes when each step of its load ended (game/loadTimes.js) and the Test
 * panel shows them, for a screenshot from the owner's phone.  On a phone-sized
 * page entering the Wheel this checks:
 *   1. every step was noted, in the order a load runs: the game started, the
 *      loading screen came up, the pictures were ready, the world began
 *      loading and was loaded, the loading screen was gone;
 *   2. the picture groups behind the loading screen each have their time,
 *      none longer than the loading screen itself;
 *   3. the Test panel shows the steps as text, and a step's number there is
 *      the page's own;
 *   4. nothing went wrong on the page.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));

/* the Test panel opens on a held zone title (mp-speedtest's way: held until
   the panel is up, since a slow frame here can let the release clear the
   title's 1.2 s timer, v2.3.3425) */
async function holdTitle(P, ms) {
  const at = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-zone-header__title');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!at) return false;
  await P.page.mouse.move(at.x, at.y);
  await P.page.mouse.down();
  const t0 = Date.now();
  await P.page.waitForTimeout(1400);
  while (Date.now() - t0 < ms && !(await panelUp(P))) await P.page.waitForTimeout(250);
  await P.page.mouse.up();
  return true;
}

async function openPanel(P) {
  for (let i = 0; i < 3; i++) {
    if (await panelUp(P)) return true;
    await holdTitle(P, 8000);
    for (const t0 = Date.now(); Date.now() - t0 < 8000;) {
      if (await panelUp(P)) return true;
      await P.page.waitForTimeout(250);
    }
  }
  return panelUp(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Loady', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inWheel = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inWheel);
    /* the world step is noted when the loading screen goes (markWorldIn) */
    const lt = await H.waitFor(P, () => (window.__btLoadTimes ? window.__btLoadTimes() : null),
      (v) => !!v && v.steps.every((s) => s.at != null), { timeout: 60000, label: 'every step noted' }).catch(() => null)
      || await P.page.evaluate(() => (window.__btLoadTimes ? window.__btLoadTimes() : null));
    console.log('    TIMES ' + JSON.stringify(lt));

    /* ── 1 ── */
    const at = Object.create(null);
    for (const s of (lt && lt.steps) || []) at[s.key] = s.at;
    const order = ['app', 'loading', 'pictures', 'arrival', 'arrived', 'world'];
    const all = order.every((k) => typeof at[k] === 'number');
    /* the world's own loading may begin before the pictures are ready (the
       zone gate runs beside the preload), so the order is held where a step
       must wait for the one before it */
    const inOrder = all && at.app <= at.loading && at.loading <= at.pictures && at.arrival <= at.arrived
      && at.pictures <= at.world && at.arrived <= at.world;
    rec.ok(`1. every step of the load was noted, in a load's order (${order.map((k) => k + ' ' + at[k]).join(', ')} s)`, all && inOrder, at);

    /* ── 2 ── */
    const groups = (lt && lt.groups) || [];
    const screen = lt && lt.screen;
    const longest = groups.length ? groups[0].s : null;
    rec.ok(`2. the picture groups each have their time (${groups.length}; slowest ${groups[0] && groups[0].name} ${longest} s), none longer than the loading screen (${screen} s)`,
      groups.length >= 3 && groups.every((g) => typeof g.s === 'number' && g.s >= 0) && typeof screen === 'number' && longest <= screen + 0.1,
      { groups: groups.slice(0, 6), screen });

    /* ── 3 ── */
    const opened = await openPanel(P);
    const shown = opened ? await P.page.evaluate(() => {
      const pre = document.querySelector('[data-dev-load-times]');
      if (!pre) return null;
      pre.scrollIntoView({ block: 'center' });
      return { text: pre.textContent, copy: !!document.querySelector('[data-dev-load-copy]') };
    }) : null;
    console.log('    PANEL ' + JSON.stringify(shown));
    const worldLine = shown && shown.text.split('\n').find((l) => /loading screen was gone/.test(l));
    rec.ok(`3. the Test panel shows the steps as text (${shown ? shown.text.split('\n').length : 0} lines), the last step's number the page's own (${worldLine && worldLine.trim()})`,
      opened && !!shown && shown.copy && /The game started/.test(shown.text) && /The pictures were ready/.test(shown.text)
        && !!worldLine && typeof at.world === 'number' && worldLine.includes(at.world.toFixed(1)) && /Slowest pictures/.test(shown.text),
      { opened, shown });

    /* ── 4 ── */
    const bad = P.logs.filter((l) => l.startsWith('pageerror'));
    rec.ok(`4. nothing went wrong on the page (${bad.length} page errors)`, bad.length === 0, bad.slice(0, 5));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
