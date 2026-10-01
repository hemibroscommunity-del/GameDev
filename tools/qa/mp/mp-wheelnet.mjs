/* ═══ THE WHEEL ON A SLOW, UNRELIABLE CONNECTION (v2.3.2959) ═══
 *
 * Owner, 2026-10-01, walking the Wheel on a phone with their own 96 tiles in
 * the game: "I don't know if it's because my internet got slow or what but
 * the ground wasn't loading fast enough to keep up with me walking across it
 * to the next area sometimes".  Their readout: 177 ms a piece, the worst
 * 6.5 s, pop-ins 52 then 118 -- and then no ground at all, 3 pieces waiting
 * and one swatch "unreadable": one download had hung, and every piece
 * waited behind it, for good.
 *
 * Walked here over a connection made worse than theirs, with the game's own
 * tiles (public/world/ground) and nothing in the Ground Studio's storage:
 *   - every ground picture arrives late (DELAY_MS);
 *   - the street's, the commonest in town, hangs the first time it is asked
 *     for (HANG): no answer, ever, to that request;
 *   - one fails at once the first time (FLAKY).
 * Both come when asked again.  The ground must never stop: the way in lifts,
 * pieces keep coming on the walk, those that needed a missing picture are
 * laid without it and then filled in once it comes, both downloads are tried
 * again -- and every picture is asked for at an address the phone may keep
 * for good (?v=).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const DELAY_MS = 450;
const HANG = 'street-A.png';
const FLAKY = 'plaza-B.png';
const ARRIVAL = { x: 21504, y: 21792 };

const holdTitle = (P, ms) => P.page.evaluate(async (hold) => {
  const el = document.querySelector('.bt-zone-header__title');
  if (!el) return 'no title element';
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  await new Promise((res) => setTimeout(res, hold));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  return 'ok';
}, ms);
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);

export async function run({ browser, wsPort, webPort, rec }) {
  const stats = (P) => P.page.evaluate(() => Object.assign({}, window.__btWorldTrial.stats));
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');

  const P = await H.newPlayer(browser, { name: 'Slowpoke', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel' });
  /* the connection: every ground picture late, one never, one failing once.
     The worker's fetches go through the page's context like the page's own. */
  const asked = Object.create(null), urls = [];
  let hung = null;
  await P.page.context().route(/\/world\/ground\/[^/?]+\.png/, async (route) => {
    const url = route.request().url(), name = url.split('/').pop().split('?')[0];
    asked[name] = (asked[name] || 0) + 1;
    urls.push(url);
    if (name === HANG && asked[name] === 1) { hung = new Promise(() => {}); return hung; }
    if (name === FLAKY && asked[name] === 1) return route.abort('failed');
    await new Promise((res) => setTimeout(res, DELAY_MS));
    try { await route.continue(); } catch (e) { /* the page went away */ }
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* setup: the Mayor gate stands between town and the World View */
  if (!(await panelUp(P))) { await holdTitle(P, 1500); await P.page.waitForTimeout(900); }
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  await tap(P, 'Finish all quests');
  await P.page.waitForTimeout(2000);
  await tap(P, 'Close');
  await P.page.waitForTimeout(600);

  /* ── 1. the way in, over the bad connection ── */
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  const t0 = Date.now();
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  let zone = null;
  for (let i = 0; i < 90; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    const overlay = await P.page.evaluate(() => !!document.querySelector('.bt-zone-loading'));
    if (zone === 'worldview' && !overlay) break;
    await P.page.waitForTimeout(1000);
  }
  const inAt = Date.now() - t0;
  const entry = await stats(P);
  console.log('    WAY IN -> ' + JSON.stringify({ zone, ms: inAt, stats: entry }));
  rec.ok(`the way in finishes over a slow connection with one picture stuck (${(inAt / 1000).toFixed(0)} s)`,
    zone === 'worldview' && entry.resident >= 12, { zone, inAt, entry });
  rec.ok('...the pictures asked for at an address the phone may keep for good (?v=<the manifest\'s date>)',
    urls.length > 0 && urls.every((u) => /\.png\?v=\d{4}-\d\d-\d\dT/.test(u)), urls.slice(0, 3));

  /* ── 2. walk: the ground keeps coming ── */
  const legs = [[ARRIVAL.x + 1800, ARRIVAL.y + 700], [ARRIVAL.x, ARRIVAL.y - 2200], [ARRIVAL.x + 200, ARRIVAL.y + 96]];
  let worstStuck = 0;
  for (const [x, y] of legs) {
    const leg0 = Date.now();
    await H.hopTo(P, x, y, { tries: 60 });
    const s = await stats(P);
    console.log(`    leg -> ${((Date.now() - leg0) / 1000).toFixed(0)} s: ${JSON.stringify(s)}`);
    await P.page.waitForTimeout(1500);
  }
  /* standing still: within a few seconds nothing is left waiting -- a hung
     download no longer holds the pieces behind it */
  let still = null;
  for (let i = 0; i < 12; i++) {
    still = await stats(P);
    if (still.loading === 0) break;
    worstStuck = Math.max(worstStuck, still.loading);
    await P.page.waitForTimeout(1000);
  }
  /* until every piece is whole: the hung download has run out of time
     (15 s) and been tried again, and the pieces short of it filled in */
  let end = null;
  for (let i = 0; i < 40; i++) {
    end = await stats(P);
    if (end.short === 0 && end.mended >= 1) break;
    await P.page.waitForTimeout(1000);
  }
  const hud = await P.page.evaluate(() => window.__btWorldTrial.hud());
  console.log('    END -> ' + JSON.stringify({ end, asked: { [HANG]: asked[HANG], [FLAKY]: asked[FLAKY] }, hud }));
  rec.ok('walking keeps laying ground: the hung download stops nothing behind it',
    end.loads > 30 && end.resident >= 12 && still && still.loading === 0, { loads: end.loads, resident: end.resident, still: still && still.loading });
  rec.ok('...pieces that needed a missing picture are laid without it (plan colour there), not waited for',
    end.partial >= 1, { partial: end.partial });
  rec.ok('...the download that failed is tried again, and so is the one that hung, once it ran out of time',
    asked[FLAKY] >= 2 && asked[HANG] >= 2 && end.dlFails >= 2, { flaky: asked[FLAKY], hang: asked[HANG], dlFails: end.dlFails });
  rec.ok('...and every piece laid short is filled in once its pictures come -- none left waiting',
    end.mended >= 1 && end.short === 0, { relaid: end.relaid, mended: end.mended, short: end.short, partial: end.partial });
  rec.ok('...laid again only when a picture came, never on a timer: far fewer times than pieces were laid short',
    end.relaid <= end.partial + 10, { relaid: end.relaid, partial: end.partial });
  rec.ok('the readout says nothing is left filling in', !/filling in/.test(hud), { hud });
  rec.ok('...no piece failed outright, and no picture was unreadable', end.failures === 0 && end.unreadable === 0, end);
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));
  await P.page.context().unroute(/\/world\/ground\/[^/?]+\.png/).catch(() => {});
}
