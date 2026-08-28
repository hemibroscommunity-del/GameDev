/* ═══ v2.3.1982: THE PLAYER WHO ARRIVES AT A FULL WORLD ═══
 *
 * The capacity campaign measured it and nobody fixed it: at MAX_PLAYERS
 * the next joiner's socket was refused with a bare 503 on a handshake
 * that never upgraded, so the client could not tell a full world from a
 * dropped connection.  It retried every 10 seconds forever behind a
 * loading screen that never said why — a game that is simply broken, as
 * far as that player can tell, with a public demo imminent.
 *
 * TESTING IT WITHOUT 61 BROWSERS.  The cap is read through
 * `_roomCap()` (join.js), which honours the `max_players` LIVE-OPS FLAG
 * — clamped [1, MAX_PLAYERS] so it can only ever lower the ceiling.
 * That flag is set here through the shipped operator surface
 * (POST /api/admin/flags behind ADMIN_KEY, the same road harness.mjs
 * seeds gold with), not through a test backdoor: one player in the room
 * and a cap of 1 IS the 61st-player condition, byte for byte, on the
 * same code path a real 61st player takes.
 *
 * What it proves, in order:
 *   1. the refused player is TOLD — a screen that says the world is full
 *      and names the numbers, not a silent loading screen;
 *   2. it reads as WAITING — the countdown ticks down and the attempt
 *      counter climbs, so the retry loop is visible rather than implied;
 *   3. it keeps retrying by itself, forever;
 *   4. the moment a slot frees the player walks in AUTOMATICALLY, with
 *      no tap and no reload, and the screen goes away;
 *   5. it fits an iPhone at 390x844 without a horizontal scroll.
 *
 * The other half of the deploy-order property — an OLD client (no
 * `?rf=1`) still getting the byte-identical 503 — is pinned in
 * server/test/roomfull.test.mjs, which can hold the socket still enough
 * to read the status code.
 */
import * as H from './harness.mjs';

const flag = async (wsPort, name, value) => {
  const res = await fetch(`http://127.0.0.1:${wsPort}/api/admin/flags`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, value }),
  });
  return res.json();
};

/* The creator road, stopped at PLAY.  enterWorld() cannot be used here:
   it waits for the world to come up, and the whole point of this
   scenario is a player for whom it never does. */
async function pressPlay(P, name) {
  const { page } = P;
  await page.waitForFunction(() => !!(document.querySelector('input.bt-cc-name')
    || document.querySelector('[data-tut="login-create"]')),
  null, { timeout: 30000, polling: 250 });
  if (await page.$('[data-tut="login-create"]')) {
    await page.click('[data-tut="login-create"]');
    await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  }
  await page.fill('input.bt-cc-name', name);
  await page.click('button.bt-cc-play');
}

/* IS THIS PLAYER ACTUALLY IN THE WORLD?  Not `S.currentZone` — that is
   seeded 'town' client-side before a socket is ever opened (the first
   draft of this scenario asserted on it and reported a refused player as
   being in the world).  `S._serverCaps` is written by ONE line in the
   whole client: the `state_sync` case, which only an admitted session
   receives.  It is the only honest proof of admission on this side. */
const readScreen = (P) => P.page.evaluate(() => {
  const el = document.getElementById('bt-room-full');
  const probe = window.__btRoomFull || null;
  const S = window._gameState && window._gameState.current;
  const admitted = !!(S && S._serverCaps && Object.keys(S._serverCaps).length);
  if (!el) return { up: false, probe, admitted, zone: (S && S.currentZone) || null, status: S && S._realtimeStatus };
  const box = el.getBoundingClientRect();
  const btn = el.querySelector('button');
  const bb = btn && btn.getBoundingClientRect();
  return {
    up: true,
    probe,
    text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
    count: (el.querySelector('.bt-rf-count') || {}).textContent || '',
    next: (el.querySelector('.bt-rf-next') || {}).textContent || '',
    tries: (el.querySelector('.bt-rf-tries') || {}).textContent || '',
    ring: !!el.querySelector('.bt-rf-ring'),
    box: { w: Math.round(box.width), h: Math.round(box.height) },
    btn: bb ? { w: Math.round(bb.width), h: Math.round(bb.height) } : null,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    admitted,
    zone: (S && S.currentZone) || null,
    status: S && S._realtimeStatus,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── one player holds the only seat ── */
  const A = await H.newPlayer(browser, { name: 'Holder', wsPort, webPort });
  await H.enterWorld(A);

  const set = await flag(wsPort, 'max_players', 1);
  rec.ok('the room is throttled to one seat through the operator surface',
    !!(set && set.ok && set.flags && set.flags.max_players === 1), set);

  /* ── the 61st player arrives ── */
  const B = await H.newPlayer(browser, {
    name: 'Sixtyone', wsPort, webPort, guest: true,
    viewport: { width: 390, height: 844 }, touch: true,
  });
  await pressPlay(B, 'Sixtyone');

  const seen = await B.page.waitForFunction(
    () => !!(window.__btRoomFull && window.__btRoomFull.open),
    null, { timeout: 60000, polling: 250 },
  ).then(() => true).catch(() => false);
  rec.ok('1. the refused player is TOLD the world is full (not left on a silent loading screen)', seen);

  const first = await readScreen(B);
  rec.ok('1. the screen is up and says so in words',
    first.up && /full/i.test(first.text || ''), { text: (first.text || '').slice(0, 160) });
  rec.ok('1. …and names how many are in the world',
    /\b1\s*\/\s*1\b/.test(first.count || ''), first.count);
  rec.ok('1. …and the player is NOT in the world', !first.admitted && first.status === 'full',
    { admitted: first.admitted, zone: first.zone, status: first.status });
  rec.ok('1. …and a turning ring says the game is doing something', first.ring);

  /* ── 3. it keeps trying, by itself ── */
  const climbed = await B.page.waitForFunction(
    () => !!(window.__btRoomFull && window.__btRoomFull.attempts >= 3),
    null, { timeout: 45000, polling: 500 },
  ).then(() => true).catch(() => false);
  const during = await readScreen(B);
  rec.ok('3. it retries on its own, over and over, without a tap',
    climbed, during.probe);
  rec.ok('3. …and shows the player that it is doing so',
    /checked/i.test(during.tries || ''), during.tries);

  /* ── 2. it has to READ as waiting ──
     Sampled HERE rather than the moment the screen appears, and that is a
     finding rather than a convenience: the screen goes up while the boot
     is still baking every global animation (the preloading law), and a
     main thread inside that work cannot run a 1s interval — the first
     paints can sit on "Looking for a spot…" for seconds at a time.  That
     is exactly why the ring is a CSS transform animation (compositor,
     keeps turning through main-thread stalls) and not a JS-drawn one.
     By the third attempt the preload has settled, and the clock has to
     actually be a clock. */
  const samples = [];
  for (let i = 0; i < 8; i++) {
    samples.push((await readScreen(B)).next || '');
    await B.page.waitForTimeout(700);
  }
  const num = (t) => { const m = /(\d+)\s*s/.exec(t || ''); return m ? +m[1] : -1; };
  const distinct = new Set(samples).size;
  let fell = false;
  for (let i = 1; i < samples.length; i++) {
    const a = num(samples[i - 1]), b = num(samples[i]);
    if (a > 0 && b > 0 && b < a) fell = true;
  }
  rec.ok('2. the countdown is a real clock and it counts down', distinct >= 2 && fell, samples);

  /* ── 5. the phone ── */
  rec.ok('5. the screen fills the phone with no sideways scroll',
    during.up && during.box.w <= 390 && during.overflow <= 0,
    { box: during.box, overflow: during.overflow });
  rec.ok('5. …and the "Try now" button is a real tap target',
    !!(during.btn && during.btn.h >= 40 && during.btn.w >= 200), during.btn);

  /* ── 4. a slot frees ── */
  await flag(wsPort, 'max_players', 60);
  const gotIn = await B.page.waitForFunction(() => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S._serverCaps && Object.keys(S._serverCaps).length)
      && !document.getElementById('bt-room-full');
  }, null, { timeout: 60000, polling: 500 }).then(() => true).catch(() => false);
  const after = await readScreen(B);
  rec.ok('4. the moment a seat opens the player walks in — no tap, no reload',
    gotIn && after.admitted && after.status === 'connected',
    { admitted: after.admitted, zone: after.zone, status: after.status, probe: after.probe });
  rec.ok('4. …and the full-world screen is gone', !after.up, { up: after.up });

  /* ── the OTHER deploy order: a worker that never answers at all ──
     A NEW client against an OLD worker gets what it always got — a
     handshake that fails with no message and no close code — and it must
     fall back to today's silent retry rather than claiming the world is
     full.  Reproduced by pointing a client at a port nobody is listening
     on, which is the same "no answer on the wire" from the client's side.
     This guards a specific future mistake: painting the room-full screen
     on ANY failed connection, which would tell every player with a bad
     signal that the game is full. */
  const dead = await H.freePort();
  const C = await H.newPlayer(browser, {
    name: 'Nowhere', wsPort: dead, webPort, guest: true,
    viewport: { width: 390, height: 844 }, touch: true,
  });
  await pressPlay(C, 'Nowhere');
  await C.page.waitForTimeout(15000);
  const cs = await readScreen(C);
  rec.ok('an unreachable worker does NOT claim the world is full (old-worker fallback)',
    !cs.up && !(cs.probe && cs.probe.open), { up: cs.up, probe: cs.probe, status: cs.status });
  await C.ctx.close();

  /* Nothing threw on the way through — a calm screen that logs a page
     error is not calm. */
  const noisy = B.logs.filter((l) => /pageerror|InvalidStateError/i.test(l));
  rec.ok('the waiting player produced no page errors', noisy.length === 0, noisy.slice(0, 3));

  /* Leave the room exactly as it was found.  This scenario is registered
     FIRST in run.mjs, and every later scenario shares this one GameRoom —
     a `max_players` left behind would refuse them all, and the failure
     would read as their bug, not this one's. */
  await fetch(`http://127.0.0.1:${wsPort}/api/admin/flags?name=max_players`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } }).catch(() => {});

  await B.ctx.close();
  await A.ctx.close();
}
