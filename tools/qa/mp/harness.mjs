/* Headless MULTIPLAYER harness — two real browsers against a real worker.
 *
 * v2.3.1609 (owner: "headlessly test all UI interactions in multiplayer
 * (trading, duel, party, etc)").
 *
 * WHY THIS IS POSSIBLE AT ALL, given the repo says otherwise.  CLAUDE.md states
 * the sandbox blocks npm install; that is stale — `npm install` succeeds for
 * both the client (147 pkgs) and server (wrangler + workerd), and
 * `wrangler dev --local` serves the REAL GameRoom Durable Object over a real
 * WebSocket on 127.0.0.1.  So these tests are not mocks: they drive the actual
 * React UI in Chromium, against the actual worker, over the actual wire
 * protocol.  Two independent browser CONTEXTS give two independent identities
 * (separate localStorage => separate bp_ passphrase), which is what the manual
 * `?guest=1` trick exists for.
 *
 * The client's own supported override points it at the local worker:
 *   window.BROTOWN_WS_URL = 'ws://127.0.0.1:PORT'
 * set via addInitScript, so no source change is needed to test.
 *
 * ISOLATION.  Each run gets its own --persist-to directory, so a test can never
 * inherit another run's Durable Object state (player inventories, clan rosters,
 * market orders).  Without that, "trade succeeded" could pass because a
 * previous run left the gold behind.
 *
 * Assertions read window._gameState, the client's own exposed handle, so a
 * check can look at real game state rather than guessing from pixels — but the
 * ACTIONS go through the DOM, because the point is testing the UI.
 */
import { chromium } from 'playwright';
import zlib from 'node:zlib';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

/* v2.3.1729: derived from this file's own location, not hardcoded to the
   dev sandbox's /home/user/GameDev.  The absolute path made the whole mp
   harness unrunnable anywhere else — including CI, which is why the one
   scenario that catches "a new player cannot play the game" had never run
   there.  harness.mjs lives at tools/qa/mp/, so the repo root is three up. */
export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.map': 'application/json', '.m4a': 'audio/mp4',
  '.wav': 'audio/wav', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

/* ── static server for dist/ ───────────────────────────────────────────── */
export async function serveDist(port) {
  /* v2.3.2078: overridable, so a verification run can be pointed at a
     SECOND build while a long sweep is still serving dist/.  Files are read
     per request here, so rebuilding dist/ under a running batch hands its
     in-flight scenarios truncated bundles and fails them for a reason that
     has nothing to do with the code under test.
       QA_DIST=dist-verify node tools/qa/mp/run.mjs petdraw
     Unset, this is exactly what it always was. */
  const DIST = process.env.QA_DIST
    ? (process.env.QA_DIST.startsWith('/') ? process.env.QA_DIST : join(REPO, process.env.QA_DIST))
    : join(REPO, 'dist');
  /* v2.3.1646 FIX: read FIRST, write once.  The old shape wrote the 200
     header and then read inside the same try, so any failure after the
     header — a client that had already gone away mid-response, most
     often — fell into the catch and called writeHead a second time.  That
     throws ERR_HTTP_HEADERS_SENT out of an async request handler, which
     is unhandled and takes the whole node process with it: a suite run
     died at the arena scenario this way with 106 assertions passed and no
     summary, which reads exactly like a product failure and is not one.
     Reading before writing means the fallback decision is made while no
     bytes have been committed, and headersSent guards the last resort. */
  const srv = createServer(async (q, s) => {
    let p = decodeURIComponent(q.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    let body = null;
    let type = MIME[extname(p)] || 'application/octet-stream';
    /* v2.3.1829: /src-art/* serves tools/gear/src-art — the PRISTINE art a
       generator was run against.  It does not ship, and it is not in dist,
       so a scenario that wants to prove "the tool changed only what it
       claimed to change" has no other way to see the before.  Read-only and
       path-guarded: a scenario is trusted, a traversal out of the folder is
       not. */
    if (p.startsWith('/src-art/')) {
      const rel = p.slice('/src-art/'.length);
      const base = join(REPO, 'tools/gear/src-art');
      const full = join(base, rel);
      if (full.startsWith(base)) {
        try { body = await readFile(full); } catch { body = null; }
      }
      try {
        if (s.headersSent) return;
        if (!body) { s.writeHead(404); return s.end('no'); }
        s.writeHead(200, { 'content-type': type });
        return s.end(body);
      } catch { return; }
    }
    try {
      body = await readFile(join(DIST, p));
    } catch {
      /* SPA fallback */
      try {
        body = await readFile(join(DIST, 'index.html'));
        type = 'text/html';
      } catch { body = null; }
    }
    try {
      if (s.headersSent) return;
      if (body === null) { s.writeHead(404); s.end(); return; }
      s.writeHead(200, { 'content-type': type });
      s.end(body);
    } catch { /* client vanished mid-write; nothing left to say */ }
  });
  await new Promise((r) => srv.listen(port, r));
  return srv;
}

/* ── the worker ────────────────────────────────────────────────────────── */
/* SEEDING USES THE SHIPPED OPERATOR SURFACE, not a test backdoor.  A freshly
 * created player owns nothing, so "the trade settled" is unprovable without
 * putting gold on one side first.  server/src/admin.js already exposes
 * POST /api/admin/grant behind ADMIN_KEY, routed into this very GameRoom, and
 * it credits through _creditPlayer — the same idempotent path the market, mail
 * and duel payouts use.  Passing the key as a dev var means the tests seed
 * players the way the owner would, through reviewed production code. */
export const ADMIN_KEY = 'brotown-headless-qa';

/** Ask the OS for a port nobody is using.
 *  Fixed ports made a failed run poison the next one: a leaked wrangler still
 *  holding 8791 crashed the following run before a single assertion ran, and
 *  the error ("Address already in use") pointed at the machine rather than at
 *  the test. */
export async function freePort() {
  const { createServer: net } = await import('node:net');
  return new Promise((res, rej) => {
    const s = net();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => res(p));
    });
  });
}

export async function startWorker(port) {
  const state = await mkdtemp(join(tmpdir(), 'bt-wrangler-'));
  /* detached: npx spawns `sh -c wrangler` which spawns node which spawns
     workerd.  Killing the pid we hold leaves the whole tail running — three
     stray processes and a held port per run, which after a few runs is a
     machine that can no longer start a worker.  Its own process GROUP is the
     only handle that reaches all of them. */
  const proc = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--local',
    '--ip', '127.0.0.1', '--persist-to', state, '--var', `ADMIN_KEY:${ADMIN_KEY}`], {
    cwd: join(REPO, 'server'), stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  let log = '';
  proc.stdout.on('data', (d) => { log += d; });
  proc.stderr.on('data', (d) => { log += d; });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(3000) });
      if (res.status) return { proc, state, port, log: () => log };
    } catch { /* not up yet */ }
  }
  killTree(proc);
  throw new Error('worker did not start in 90s:\n' + log.slice(-1500));
}

function killTree(proc) {
  try { process.kill(-proc.pid, 'SIGKILL'); } catch { /* group already gone */ }
  try { proc.kill('SIGKILL'); } catch { /* already gone */ }
}

export async function stopWorker(w) {
  if (!w) return;
  killTree(w.proc);
  try { await rm(w.state, { recursive: true, force: true }); } catch { /* best effort */ }
}

/* ── a player ──────────────────────────────────────────────────────────── */
/* v2.3.1768: `viewport` is optional and defaults to what every scenario got
   before it existed, so nothing that omits it changes.  Added for the
   desktop-vs-phone comparison, where the WINDOW SIZE is the variable under
   test — the alternative was hand-rolling a context in the scenario, which
   duplicates the init script, the console capture and the name plumbing
   enterWorld needs (and that duplicate is how mp-desktopbox first failed:
   page.fill got an undefined name). */
/* v2.3.1796: `touch` emulates a PHONE, and it is not cosmetic.  game.css
   hides every touch control behind `@media (pointer:fine) { display:none }`,
   and a Playwright context is pointer:fine by default — so a scenario that
   measures a joystick on the default context measures a 0x0 box and quietly
   proves nothing.  (That is exactly how the first run of mp-questcoach
   "passed" three assertions about marks that were never drawn.)  isMobile
   flips the emulated pointer to coarse and turns on the meta viewport, which
   together are the closest this harness gets to the primary platform. */
export async function newPlayer(browser, { name, wsPort, webPort, guest = false, viewport, touch = false, phrase = null, dpr = null, init = null }) {
  const ctx = await browser.newContext(Object.assign(
    { viewport: viewport || { width: 1000, height: 780 } },
    touch ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : null,
    /* v2.3.1906: opt-in higher backing-store resolution, for scenarios that
       have to LOOK at the figure. The player is ~40 CSS px tall on a phone
       viewport; at dpr 2 a shoulder — or a hand (v2.3.1914, which arrived at
       the identical option independently) — is a handful of pixels. Layout is
       unchanged, only the capture resolution moves. */
    dpr ? { deviceScaleFactor: dpr } : null,
  ));
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') { logs.push(`console ${m.text().slice(0, 200)}`); _noteRenderThrow(name, m.text()); } });
  page.on('pageerror', (e) => logs.push(`pageerror ${String(e).slice(0, 200)}`));
  await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
  /* v2.3.2272: ARM THE PER-FRAME PROBES, for every scenario, here.
     __btMonScales / __btMonHit / __btPeerShield / __btPeerSword used to be
     written by the shipped render loop unconditionally -- an allocation per
     entity per frame into id-keyed maps that were never pruned, plus several
     getChildIndex scans per peer -- which was one of the accumulations behind
     the owner's "slows down after playing for a while".  The writes are now
     gated on this flag so a real player never pays for them.
     It is armed in the HARNESS rather than in the five scenarios that read
     them (mp-feel, mp-windup, mp-slimeburst, mp-peershield, mp-peersword)
     because a scenario that forgets would not fail loudly -- it would read an
     empty store and report the FEATURE as broken.  One arm, no scenario
     changes, and nothing here stubs game code: the probes report what the
     renderer actually wrote either way. */
  await page.addInitScript(() => { window.__btProbe = true; });
  /* v2.3.1814: `phrase` seeds this context's Login Key BEFORE first paint, so
     a scenario can arrive as an EXISTING character.  It has to be an init
     script rather than a post-load write: the boot check that decides which
     pre-game screen to show runs on mount, and a key written after that has
     already missed its own question. */
  if (phrase) {
    await page.addInitScript((ph) => {
      try { localStorage.setItem('bt_passphrase', ph); } catch (e) {}
    }, phrase);
  }
  /* v2.3.2039: `init` is arbitrary JS run before the bundle does. It exists
     for scenarios that must stand in for a BROWSER API the sandbox cannot
     provide -- mp-chatcompose replaces webkitSpeechRecognition, which needs a
     microphone and a recognition backend that headless Chromium has neither
     of. It has to run pre-load, not post-load: modules that read a global at
     module scope (ChatBubble resolves SpeechRec once, at import) have already
     looked by the time the page is interactive.

     Use it ONLY for platform APIs. Stubbing our own code here would let a
     scenario pass by replacing the thing it claims to test. */
  if (init) await page.addInitScript(init);
  await page.goto(`http://localhost:${webPort}/${guest ? '?guest=1' : ''}`, { waitUntil: 'domcontentloaded' });
  return { ctx, page, logs, name };
}

/** Drive character creation and wait until the world is live. */
/* ═══ v2.3.2111: THE DOOR NOW OPENS THE CHARACTER LIST BY ITSELF ═══
 * Owner: "Can you actually provide a list of characters ... when people try to
 * join the game".  So whenever this device has characters, LoginScreen mounts
 * with the picker already up — and the picker is a scrim over BOTH door
 * buttons.  A scenario that clicks Create or Continue by handle now clicks
 * into the overlay: the handle exists, the element is on the page, and the
 * click either lands on nothing or times out on a name field that will never
 * appear.  Every road through the door goes through one of these two, so the
 * behaviour is described once instead of in nine scenarios.
 *
 * A fresh context has no roster and the picker is not up, which is why both
 * are written as no-ops rather than steps: the same call is correct before and
 * after this version. */
export async function uncoverDoor(page) {
  if (!(await page.$('[data-tut="char-picker"]'))) return false;
  const back = await page.$('[data-tut="char-picker"] >> text=Back');
  if (back) { await back.click(); await page.waitForTimeout(400); }
  return true;
}

/* The other direction: get to the list, however the door happens to be. */
export async function openPicker(page) {
  if (await page.$('[data-tut="char-picker"]')) return true;
  const b = await page.$('[data-tut="login-key"]');
  if (!b) return false;
  await b.click();
  await page.waitForTimeout(700);
  return !!(await page.$('[data-tut="char-picker"]'));
}

export async function enterWorld(P, timeout = 90000) {
  const { page, name } = P;
  /* ═══ v2.3.1814: THE LOGIN DOOR COMES FIRST NOW ═══
     The creator used to be the landing screen; it now sits behind a login
     screen with two buttons (owner: "Login (put in key) or create new
     character").  Every scenario that calls enterWorld is playing a NEW
     character, so it takes the same door a new player takes.

     Written as "wait for whichever screen appears" rather than "click
     create, then fill the name": a device whose key already HAS a character
     skips both screens and walks straight into the world, and a scenario
     seeded with `phrase` does exactly that.  Waiting for a specific screen
     would hang forever in that case, and the failure would read as a broken
     login rather than as a working one. */
  await page.waitForFunction(() => {
    if (window.__btBootRoute === 'resume') return true;
    return !!(document.querySelector('input.bt-cc-name')
      || document.querySelector('[data-tut="login-create"]'));
  }, null, { timeout: 30000, polling: 250 });
  const resumed = await page.evaluate(() => window.__btBootRoute === 'resume');
  if (!resumed) {
    await uncoverDoor(page);   /* v2.3.2111 — see uncoverDoor */
    if (await page.$('[data-tut="login-create"]')) {
      await page.click('[data-tut="login-create"]');
      await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
    }
    await page.fill('input.bt-cc-name', name);
    await page.click('button.bt-cc-play');
  }
  /* The loading screen preloads every global animation before the intro lifts
     (the animation-preloading law), so this legitimately takes a while. */
  await page.waitForFunction(() => {
    /* window._gameState is the REF (BroTown.jsx:658 "Expose state for
       autotest"); the live object is .current.  Reading the ref directly
       yields undefined for every field and looks like "never joined". */
    const S = window._gameState && window._gameState.current;
    return !!(S && S.myId && S.currentZone);
  }, null, { timeout, polling: 500 });
  /* v2.3.1668: dismiss Mayor Bro's welcome video (MayorGreeting.jsx —
     once per browser context, over the nav rail).  It is self-limiting
     for a real player (a SKIP button plus a 9s safety dismiss), but a
     headless tap that lands within those 9 seconds hits the <video>
     instead of the control underneath and the scenario dies with
     "not tappable: covered by <video>".  Which scenario loses that race
     depends on boot timing, so it was an intermittent failure in ANY
     scenario whose first action is a tap — dismiss it here, once, for
     everyone, exactly as a player would. */
  /* v2.3.1668: WAIT FOR THE INTRO VIDEO TO LIFT.
     `S.myId && S.currentZone` means the world is live, but the intro clip
     (/intro/loading-ashore.mp4) is still painted full-screen over it for
     a couple of seconds — so the first tap of a scenario landed on the
     <video> and Playwright failed it as "not tappable: covered by
     <video>".  Whichever scenario tapped first lost, which is why it read
     as an unrelated intermittent failure.
     Measured: the element is gone by ~4s.  Waited for, not slept through,
     with a generous ceiling and a catch — a scenario that genuinely has
     no intro must not hang here. */
  await page.waitForFunction(() => document.querySelectorAll('video').length === 0,
    null, { timeout: 15000, polling: 200 }).catch(() => {});
  return page.evaluate(() => {
    const S = window._gameState.current;
    return { myId: S.myId, zone: S.currentZone };
  });
}

/** Read a projection of game state. fn runs in the page with S bound. */
export function readState(P, fn) {
  return P.page.evaluate(
    `(() => { const S = window._gameState && window._gameState.current; return (${fn.toString()})(S); })()`);
}

/** Call a client fn exposed on window._gameFns (the same autotest hook). */
export function callFn(P, name, ...args) {
  return P.page.evaluate(
    ({ n, a }) => (window._gameFns && window._gameFns[n] ? window._gameFns[n](...a) : { __missing: n }),
    { n: name, a: args });
}

/** Send a raw client->server event through the live channel. */
export function sendEvent(P, event, payload) {
  return P.page.evaluate(({ e, p }) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.channel) return { __noChannel: true };
    S.channel.send({ type: 'broadcast', event: e, payload: { id: S.myId, ...p } });
    return { sent: e };
  }, { e: event, p: payload || {} });
}

/** Wait until a projection satisfies pred, else throw with the last value. */
export async function waitFor(P, fn, pred, { timeout = 20000, label = 'condition' } = {}) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    last = await readState(P, fn).catch((e) => ({ __err: String(e) }));
    if (pred(last)) return last;
    await P.page.waitForTimeout(250);
  }
  throw new Error(`timeout waiting for ${label}; last = ${JSON.stringify(last)}`);
}

/** Bring up two players who can see each other.  USE THIS rather than opening
 *  both contexts first: joining SEQUENTIALLY (B's context created only after A
 *  is fully in-world) is reliable, while opening both pages and then entering
 *  the world in each left S.others empty on every attempt.  Both orderings give
 *  distinct identities and a connected socket, so the difference is in the join
 *  handshake, not in identity — but the working order is cheap and this harness
 *  does not need to characterise the losing one to be useful. */
export async function joinPair(browser, { wsPort, webPort, nameA = 'Alpha', nameB = 'Bravo' }) {
  const A = await newPlayer(browser, { name: nameA, wsPort, webPort });
  await enterWorld(A);
  /* NOT ?guest=1.  The guest escape hatch exists because two TABS share one
     localStorage and therefore one passphrase; two browser CONTEXTS do not, so
     both players here get real persistent bp_ identities.  That matters —
     a guest id is re-minted at random on every page load (BroTown.jsx:561),
     which would quietly make any test of reconnecting, friendship or offline
     mail meaningless. */
  const B = await newPlayer(browser, { name: nameB, wsPort, webPort });
  await enterWorld(B);
  await waitMutualSight(A, B);
  /* Focus each canvas so keyboard input reaches the game loop. */
  for (const P of [A, B]) await P.page.mouse.click(500, 400).catch(() => {});
  return { A, B };
}

/** Walk a player briefly so the server marks them dirty. */
export async function nudge(P, key = 'w', ms = 400) {
  await P.page.keyboard.down(key);
  await P.page.waitForTimeout(ms);
  await P.page.keyboard.up(key);
  await P.page.waitForTimeout(300);
}

/** Both players in the same zone, each seeing the other.
 *
 * NUDGING IS REQUIRED, not politeness.  S.others is seeded from the join
 * state_sync and then maintained by per-player DELTAS — tick.js only broadcasts
 * players it has marked dirty (v2.3.1575 zone-scoped ticks).  A player who
 * joins and stands perfectly still never becomes dirty, so an earlier-joined
 * peer never hears about them and this waits forever.  A real player always
 * moves; a scripted one has to be told to. */
export async function waitMutualSight(A, B, timeout = 30000) {
  const seen = (S) => (S && S.others ? Object.keys(S.others) : []);
  for (let i = 0; i < 3; i++) {
    await nudge(A, 'w', 300);
    await nudge(B, 's', 300);
    const a = await readState(A, seen);
    const b = await readState(B, seen);
    if (a.length && b.length) return { a, b };
    await A.page.waitForTimeout(1000);
  }
  await waitFor(A, seen, (o) => o.length >= 1, { timeout, label: 'A sees B' });
  await waitFor(B, seen, (o) => o.length >= 1, { timeout, label: 'B sees A' });
  return { a: await readState(A, seen), b: await readState(B, seen) };
}

/* ── seeding via the operator surface ──────────────────────────────────── */
/** Grant gold or an item to a LIVE player.  Returns the admin JSON. */
export async function grant(wsPort, playerId, kind, payload) {
  const res = await fetch(`http://127.0.0.1:${wsPort}/api/admin/grant`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ADMIN_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, kind, payload, note: 'headless qa seed' }),
  });
  return res.json();
}

/** What the SERVER thinks a player's live state is (zone, position, hp).
 *  The client's copy of a peer is a delta-fed mirror and can be stale, while
 *  every combat decision is made against these numbers — so anything that
 *  depends on geometry has to check here, not in the browser. */
export async function serverPlayer(wsPort, playerId) {
  return (await adminPlayer(wsPort, playerId)).live || null;
}

/** The whole operator view: `live` (the in-memory playerState summary) plus
 *  `rpg` (the persisted blob, which is where inventory lives). */
export async function adminPlayer(wsPort, playerId) {
  const res = await fetch(`http://127.0.0.1:${wsPort}/api/admin/player?id=${encodeURIComponent(playerId)}`,
    { headers: { 'Authorization': `Bearer ${ADMIN_KEY}` } });
  return (await res.json()) || {};
}

/** v2.3.1624: can this player reach a town building panel (marketplace,
 *  vendor, arena…)?
 *
 *  Today the answer is NO for all twelve, and has been since v2.3.823: BroTown.jsx force-sets
 *  S.nearBuilding = null every frame ("town building entrances removed — the
 *  town buildings have no in-game art yet"), and the only caller of
 *  enterBuilding() is the prompt gated on nearBuilding !== null.  Verified by
 *  standing dead-centre on each building rect: no prompt, no panel, and no
 *  bridge exposes them either.  Scenarios call this so they SKIP loudly with a
 *  reason instead of failing on a screen that cannot be opened — and so they
 *  start working by themselves the day the proximity scan comes back. */
export async function buildingReachable(P, buildingIndex) {
  return P.page.evaluate((i) => {
    const F = window._gameFns || {};
    const B = F.BUILDINGS || F.TOWN_BUILDINGS;
    const S = window._gameState && window._gameState.current;
    if (!B || !B[i] || !S) return false;
    const b = B[i];
    S.player.x = (b.bx + b.bw / 2) * 32;
    S.player.y = (b.by + b.bh / 2) * 32;
    return false;   // caller re-reads after a frame
  }, buildingIndex).then(async () => {
    await P.page.waitForTimeout(500);
    return P.page.evaluate(() => {
      const S = window._gameState.current;
      return S.nearBuilding !== null && S.nearBuilding !== undefined;
    });
  });
}

/* ── UI drivers ────────────────────────────────────────────────────────── */
/** Open the real inspect card for a live peer.
 *
 * __broInspectPlayer is PRODUCTION code (BroTown.jsx, v2.3.1323) — the bridge
 * the dash Friends views already use to open the same card the world-tap flow
 * opens.  Driving it keeps the test on the shipped path while avoiding
 * pixel-accurate canvas taps, which would be testing the camera, not the UI. */
export async function openInspect(P, peerId, { timeout = 15000 } = {}) {
  const t0 = Date.now();
  let lastOk = null;
  while (Date.now() - t0 < timeout) {
    lastOk = await P.page.evaluate((id) => {
      if (!window.__broInspectPlayer) return 'no-bridge';
      return window.__broInspectPlayer(id) ? 'ok' : 'not-in-others';
    }, peerId);
    if (lastOk === 'ok') {
      /* The card can take a beat to mount, and another panel may be sitting on
         top; retry the whole thing rather than failing on the first miss. */
      const shown = await P.page.waitForSelector('.bt-inspect-card', { timeout: 3000 })
        .then(() => true).catch(() => false);
      if (shown) return true;
    }
    await P.page.waitForTimeout(500);
  }
  throw new Error(`openInspect(${peerId}) failed (${lastOk}); visible buttons = `
    + JSON.stringify(await buttonTexts(P)));
}

/** All rendered text on the page — for "is this on screen at all" checks where
 *  the exact element structure is not the point. */
export function bodyText(P) {
  return P.page.evaluate(() => (document.body.textContent || '').replace(/\s+/g, ' '));
}

/** v2.3.1765: Click the first visible element matching a CSS selector.
 *
 *  Use this over clickText for any control whose CAPTION is owner-facing copy.
 *  The quest turn-in button was clicked by the words "Turn In" in three
 *  scenarios; v2.3.1764 reworded it to "Redeem Reward" (owner: "it needs to be
 *  more obvious that you're redeeming a reward") and all three started missing
 *  it silently — every one of them wrapped the click in .catch(), so the run
 *  failed later, elsewhere, blaming the worker.  A class is a contract; a label
 *  is a sentence the owner is entitled to change.
 *
 *  Deliberately NOT swallowing a miss: waitFor throws if the selector never
 *  shows, which is the whole point of moving off the caption. */
export async function clickSel(P, sel, { timeout = 6000 } = {}) {
  const el = P.page.locator(`${sel}:visible`).first();
  await el.waitFor({ state: 'visible', timeout });
  await el.click();
  return true;
}

/** Click the first visible button whose text contains `text`. */
/* ═══ v2.3.2083: WHEN A CLICK TIMES OUT, SAY WHAT IS ON TOP OF IT ═══
 * Playwright's message for a covered control is the least useful failure in
 * this harness.  It reports the actionability checks PASSING --
 *
 *     locator resolved to <button class="bt-inspect-tp">Trade</button>
 *     attempting click action
 *       2 x waiting for element to be visible, enabled and stable
 *         - element is visible, enabled and stable
 *
 * -- and then simply times out, because the button really is visible, enabled
 * and stable; it is just not the thing the pointer would land on.  Read as
 * written it says "the button is fine and the click did nothing", which sends
 * you looking at the handler.  The answer is always a DIFFERENT element, and
 * the browser will name it for the asking: elementFromPoint at the control's
 * own centre.  (mp-trade has failed this way for weeks; the drawer rule of
 * v2.3.2078 fixed one such cover and this is how the next one gets found in
 * one run instead of ten.) */
export async function coveringElement(P, locator) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return null;
  const target = await locator.elementHandle().catch(() => null);
  return P.page.evaluate(({ x, y, want }) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return 'nothing (the point is off-screen)';
    /* An element that CONTAINS the button is not covering it -- the click would
       land and bubble.  Saying which of the two it is saves the next reader the
       wrong half of the search. */
    const contains = !!(want && el.contains(want));
    const desc = (n) => {
      const cls = (typeof n.className === 'string' ? n.className : '').trim();
      const r = n.getBoundingClientRect();
      const cs = getComputedStyle(n);
      return n.tagName.toLowerCase() + (n.id ? '#' + n.id : '')
        + (cls ? '.' + cls.replace(/\s+/g, '.').slice(0, 50) : '')
        + ` {${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.x)},${Math.round(r.y)}`
        + ` z:${cs.zIndex} pos:${cs.position} pe:${cs.pointerEvents}`
        + (n.getAttribute && n.getAttribute('style') ? ` style="${n.getAttribute('style').slice(0, 70)}"` : '')
        + '}';
    };
    const chain = [];
    for (let n = el, i = 0; n && i < 5; n = n.parentElement, i++) chain.push(desc(n));
    return (contains ? 'AN ANCESTOR of the button (so not a cover): ' : 'a DIFFERENT element: ')
      + chain.join('\n        < ');
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2, want: target });
}

/* ═══ v2.3.2155: THE CORNER RESTS AS A BELL NOW ═══
 * WorldChatFeed defaults to SHUT (the owner asked for the notifications to
 * collapse into a bell), so the message list simply does not exist until
 * somebody presses it. Every scenario that reads [data-world-chat-lines]
 * needs this first.
 *
 * Written as "press it until it says it is open" rather than one click: the
 * toggle only renders once the feed has something to show, and on a fresh
 * join that is a race with the welcome line. Returns false rather than
 * throwing, so a scenario that legitimately has no chat can carry on and fail
 * on its own assertion instead of on this.
 */
export async function openWorldChat(P, { timeout = 8000 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const state = await P.page.evaluate(() => {
      const b = document.querySelector('[data-world-chat-toggle]');
      return b ? b.getAttribute('aria-expanded') : null;
    });
    if (state === 'true') return true;
    if (state === 'false') {
      await P.page.click('[data-world-chat-toggle]').catch(() => {});
      await P.page.waitForTimeout(350);
      continue;
    }
    await P.page.waitForTimeout(250);
  }
  return false;
}

export async function clickText(P, text, { timeout = 6000 } = {}) {
  const btn = P.page.locator(`button:visible`, { hasText: text }).first();
  await btn.waitFor({ state: 'visible', timeout });
  /* v2.3.2084: SAMPLED BEFORE THE CLICK, not after it.  The first cut asked
     elementFromPoint in the catch block and got nothing at all: a click that
     times out has spent THIRTY SECONDS failing, and by then the panel has
     moved on, so boundingBox answers null and the diagnostic reports nothing
     about the moment that mattered.  The reading is cheap, so it is taken up
     front and only PRINTED if the click then fails. */
  const over = await coveringElement(P, btn).catch(() => null);
  try {
    await btn.click();
  } catch (e) {
    /* FIRST, not last.  The runner truncates a failure message at a couple of
       hundred characters and Playwright's own call log is longer than that, so
       anything appended is cut off before it is ever read -- which is how the
       first two attempts at this diagnostic reported nothing while working
       perfectly. */
    const err = new Error(`COVERED BY: ${over || '(unreadable)'} — `
      + String((e && e.message) || e));
    err.stack = (e && e.stack) || err.stack;
    throw err;
  }
  return true;
}

/* ═══ v2.3.2011: ACCEPTING FROM THE IN-WORLD GIVER IS TWO SCREENS ═══
 *
 * v2.3.1827 ("the quest reward was unclaimable") split the in-world quest
 * flow: the giver speaks through NpcDialogue, whose last button says "See the
 * quest", and only THAT opens QuestOfferPanel where "Accept Quest" lives.
 *
 * Scenarios written before that still did `clickText(P, 'Accept')`, which on
 * screen one matches nothing.  Two of them wrapped it in `.catch(() => {})`,
 * so the miss was silent and the run continued with an unarmed character --
 * mp-zonefx then failed FOUR assertions that read like real cross-zone
 * rendering bugs ("an emote from another zone appears over your map") when the
 * truth was that its tester never left town, so both players were in the same
 * zone and the emote was correct.
 *
 * It lives in the harness rather than in each scenario because this is the
 * THIRD time this flow's labels have moved (v2.3.1764 renamed the turn-in and
 * broke three scenarios at once; v2.3.1827 moved the accept).  One place to
 * fix beats four places to forget -- and QuestOfferPanel.jsx says the same
 * thing about its own confirm class.
 *
 * SELECTED BY CLASS, and it THROWS.  A helper that swallows its own failure is
 * how four assertions came to describe a fiction.
 *
 * THE GIVER, NOT THE DASH.  There are two doors to an offer and only this one
 * grew a second screen: the QUESTS dash panel still shows an Accept directly,
 * with no NpcDialogue to page through.  mp-townlock uses that door and passes
 * 27/27 with a plain clickText -- switching it to this helper took it to
 * 22/27, which is how the name earned its suffix.  If you are here because an
 * accept is failing, check WHICH door the scenario knocks on first.
 */
export async function acceptQuestFromGiver(P, { timeout = 12000 } = {}) {
  /* screen one: page through whatever the giver says.  The CTA reads "Next"
     until the last chunk, then becomes the one that opens the offer. */
  for (let i = 0; i < 10; i++) {
    const done = await P.page.evaluate(() => {
      const b = document.querySelector('.bt-npcdlg-next');
      if (!b) return true;                       /* no dialogue (or past it) */
      const last = !/next/i.test(b.textContent || '');
      b.click();
      return last;
    });
    await P.page.waitForTimeout(320);
    if (done) break;
  }
  /* screen two: the offer panel's own confirm. */
  const go = P.page.locator('.bt-qoffer .bt-qoffer-go').first();
  await go.waitFor({ state: 'visible', timeout });
  await go.click();
  await P.page.waitForTimeout(600);
  return true;
}

/** Open a dashboard destination by tapping its NAV RAIL button.
 *
 *  v2.3.1637: the toolbar ribbon carried a text label under every icon, so
 *  scenarios opened panels with clickText(P, 'Friends').  The rail that
 *  replaced it is icon-only — that call matched nothing and every
 *  friends-panel assertion would have failed as a UI regression that
 *  wasn't one.  The rail buttons carry their name as aria-label, which is
 *  the accessible name of the control a real player taps, so this stays a
 *  genuine UI path rather than a bus call that would pass even if the rail
 *  were broken or absent.  Labels: Dashboard / Bag / Skills / Friends /
 *  Quests / More (Hero is the identity row's portrait, not a rail button).
 */
/** Tap an element, having FIRST proved it is the topmost thing at its own
 *  centre.
 *
 *  v2.3.1641: the rail's buttons respond to pointerup (they are divs with
 *  role=button, like every tile in this UI), and Playwright's click()
 *  actionability check reports "<div></div> intercepts pointer events" for
 *  them even when document.elementFromPoint returns the button itself —
 *  measured directly, three deep: [the button, .bt-navrail, .bt-dashboard].
 *  Rather than paper over that with a blind force-click, this does the
 *  covering check EXPLICITLY in the page and only then forces the tap.  A
 *  real overlay still fails the test, and names itself in the error, which
 *  is the property that mattered when the rail replaced the ribbon. */
async function tapTop(page, selector, timeout) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout });
  /* Hit-test the RESOLVED element, not the selector string: `:has-text()`
     is a Playwright pseudo-class and document.querySelector throws on it. */
  const verdict = await loc.evaluate((el) => {
    if (!el) return 'missing';
    el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    if (!top) return 'nothing at its centre (off-screen?)';
    if (el === top || el.contains(top)) return 'ok';
    return `covered by <${top.tagName.toLowerCase()} class="${top.className || ''}">`;
  });
  if (verdict !== 'ok') throw new Error(`${selector} is not tappable: ${verdict}`);
  await loc.click({ force: true });
}

/** Open a dashboard destination the way a player reaches it.
 *
 *  v2.3.1637: the toolbar ribbon carried a text label under every icon, so
 *  scenarios opened panels with clickText(P, 'Friends').  The rail that
 *  replaced it is icon-only — that call matched nothing.  Rail buttons
 *  carry their name as aria-label, the accessible name of the control.
 *  v2.3.1641: and not every destination is ON the rail any more.  It shrank
 *  to Dashboard / Bag / More, with Quests, Friends and Life Skills moved
 *  into the More panel, so this falls through to More and taps the tile —
 *  the same two taps a player makes.  Still a UI path end to end: nothing
 *  here calls the bus, so a broken rail or a missing tile fails the test.
 */
export async function openDest(P, label, { timeout = 6000 } = {}) {
  const railSel = `.bt-navrail [aria-label="${label}"]`;
  if (await P.page.locator(railSel).first().isVisible().catch(() => false)) {
    await tapTop(P.page, railSel, timeout);
    return true;
  }
  await tapTop(P.page, '.bt-navrail [aria-label="More"]', timeout);
  await P.page.waitForTimeout(700);
  /* More's tiles are real <button>s (className bt-more-card), not
     role=button divs like the rail — hence two selectors, not one. */
  await tapTop(P.page, `.bt-dashboard button:has-text("${label}")`, timeout);
  return true;
}

/** Close the bottom sheet back to the bar — the resting state.
 *
 *  v2.3.2195: openDest has had no counterpart, and the day that mattered was
 *  the day the quest panel's Accept was removed: mp-tutorial reads the quest
 *  detail in the sheet and then has to walk up to the giver, and the NPC
 *  proximity opener is gated on `dashboardPanelBus.state.mode === 'bar'`
 *  (BroTown.jsx ~5397 — "the nav rail's destinations render over the world
 *  just like the modals do").  With the sheet still open, walking up to Mayor
 *  Bro does nothing at all, which reads in a test as a broken NPC rather than
 *  as a scenario that never put its menu away.
 *
 *  Taps the fold chip, which is what a player taps: in expanded mode its
 *  handler is `toBar()`.  Returns the bus's own verdict, so a chip that stops
 *  closing the sheet fails here instead of somewhere downstream.
 */
export async function closeDest(P, { timeout = 6000 } = {}) {
  const sel = '[data-dash-fold]';
  if (await P.page.locator(sel).first().isVisible().catch(() => false)) {
    await tapTop(P.page, sel, timeout).catch(() => {});
  }
  await P.page.waitForTimeout(500);
  return P.page.evaluate(() => {
    const b = window.__broDashPanelBus;
    return !b || b.state.mode === 'bar';
  });
}

/* ── PIXELS ────────────────────────────────────────────────────────────────
 * Some things can only be proven by looking at the screen.  The obvious way —
 * getImageData on the game canvas — returns BLANK: the WebGL context has no
 * preserveDrawingBuffer, so the buffer is gone by the time script runs.  A
 * Playwright screenshot does capture it, but it arrives as a PNG and there is
 * no image decoder in this repo (sharp/jimp are not installed, and the QA
 * harness earning a native dependency for one assertion is a bad trade).
 *
 * So: decode it here.  Playwright emits a non-interlaced 8-bit truecolour PNG,
 * which is a short parse over zlib — which Node already ships.  This is
 * deliberately minimal and asserts the shape it expects rather than trying to
 * be a general decoder.
 */
/* ═══ v2.3.2078: MOVE THERE, DO NOT TELEPORT THERE ═══
 * Lifted verbatim in behaviour from mp-harvest (v2.3.1706), which learned it
 * the hard way: movement.js caps a move at `500 * dt + 80` px and, on reject,
 * "drops EVERYTHING so a cheater can't flip blocking/dodging/dead while
 * teleporting" — and a reject does NOT write ps.x, so every later move is
 * still the same illegal distance from the server's stale position.  Once
 * rejected, rejected forever, with the client looking perfectly healthy.
 * 100px hops with a beat between them sit well inside the cap.
 *
 * A COLOUR-CLEAN PATCH OF TOWN, for the scenarios that count pixels on the
 * character: measured off town_v17.webp and its walk grid — walkable, more
 * than 110px clear of all twelve props, and zero pixels matching any of the
 * four probe colours (pink/green/blue/red) in the box a figure crop covers.
 * The plaza spawn is NOT such a patch since v2.3.2069 put the fountain there.
 */
export const TOWN_CLEAN_SPOT = { x: 1000, y: 1460 };

export async function hopTo(P, tx, ty, { step = 100, gap = 260, tries = 40 } = {}) {
  for (let i = 0; i < tries; i++) {
    const done = await P.page.evaluate(({ x, y, s }) => {
      const S = window._gameState.current;
      const dx = x - S.player.x, dy = y - S.player.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) { S.player.vx = 0; S.player.vy = 0; return true; }
      const k = Math.min(s, d);
      S.player.x += (dx / d) * k;
      S.player.y += (dy / d) * k;
      return false;
    }, { x: tx, y: ty, s: step });
    await P.page.waitForTimeout(gap);   /* > the 198ms solo move gap */
    if (done) return true;
  }
  return false;
}

/* ═══ v2.3.2078: THE BOX A COLOUR PROBE MAY COUNT PIXELS IN ═══
 * mp-facingside, mp-cosmpose and mp-skinworld each carried their own copy of
 * `x = c.x - 44, y = c.y - 86, 88 x 104` — a box about twice the figure, with
 * the character sitting in its bottom-middle and the town filling the rest.
 * That was survivable while the spawn looked at bare cobbles.  When v2.3.2069
 * moved the fountain into the plaza the spawn ended up in front of it, and
 * the CONTROL frame — a character with no drawings on him at all — started
 * reading 4455 blue pixels off the water.  Four assertions in mp-facingside
 * and six in mp-cosmpose failed, none of them about the art they name.
 *
 * The box below was measured off that control render (tools/qa/mp/out/
 * facingside-00-control.png, 88x104 at dpr 2): the head's top row sits 37 CSS
 * px above the feet and the figure is ~28 px across at the shoulders.  40x46
 * clears both with margin and stops well below the basin.  Grey fountain
 * stone can still clip the top corners and that is fine — none of the four
 * colour tests (isPink/isGreen/isBlue/isRed) fires on a neutral.
 *
 * Anchored on `__btPlayerDrawn()` when the client offers it (entityRenderer,
 * same version) so the mining -8px lift and the build-scale shift are
 * included, and on S.player otherwise, which is what the old copies did.
 *
 * Returns null when the box would run off the viewport, exactly as before —
 * a caller treats that as "could not be located", not as zero pixels.
 */
export async function figureBox(P, { pad = 0, peerId = null } = {}) {
  const c = await P.page.evaluate((pid) => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    /* A peer has no drawn-box probe of its own, so its anchor is the position
       the renderer draws it at — and that is renderX/renderY, the smoothed
       interpolation, NOT the raw x/y off the last packet (entityRenderer:
       `display.x = other.renderX || other.x || 0`).
       v2.3.2078: the difference did not matter to the old 88x104 box and
       matters a great deal to a 40x46 one — a peer mid-interpolation sits far
       enough from its packet position to fall outside the tighter crop, which
       reads as "the other player cannot see his tattoos" on a frame where he
       plainly can. */
    const src = pid ? (S.others || {})[pid] : S.player;
    if (!src || typeof src.x !== 'number') return null;
    /* v2.3.2083: a PEER now has a drawn-position probe of its own
       (__btPeersDrawn, entityRenderer), so its crop is anchored on the frame
       the renderer actually painted rather than on renderX/renderY read a
       moment later.  That gap is invisible on a standing peer and is most of
       a running one's body: mp-cosmpose's `pinkMin` is a MINIMUM over dozens
       of samples, so a single crop that missed reported "the other player
       cannot see his tattoos" about a character covered in them.
       The pad-the-box fix was tried first and is wrong — the margin reaches
       the grass and the no-art control starts counting the town (TRAPS §34). */
    const d = pid
      ? (window.__btPeersDrawn ? window.__btPeersDrawn(pid) : null)
      : (window.__btPlayerDrawn ? window.__btPlayerDrawn() : null);
    const wx = d ? d.x : (pid && src.renderX != null ? src.renderX : src.x);
    const wy = d ? d.footY : (pid && src.renderY != null ? src.renderY : src.y);
    return { x: r.left + (wx - S.camera.x) * (S._worldScaleX || 1),
             y: r.top + (wy - S.camera.y) * (S._worldScaleY || 1),
             vw: innerWidth, vh: innerHeight,
             drawn: !!d, facing: S._facing || null,
             /* v2.3.2249: the crop has to follow the zoom -- see below. */
             worldScale: S._worldScaleX || 1 };
  }, peerId);
  if (!c) return null;
  /* ═══ v2.3.2249: THE CROP FOLLOWS THE ZOOM ═══
     40x46 anchored 20 left and 44 up of the foot was measured against a world
     scale of 2/3, which was the only scale the game had when v2.3.2078 tightened
     this box.  v2.3.2247 made the scale PER ZONE, so a fixed CSS-px crop stopped
     framing the character and started framing the character plus a margin of
     whatever he is standing on: at scale 0.45 the figure is 67% of its old
     linear size, so more than half the box is ground.

     That is not a cosmetic drift -- it broke the CONTROLS, which is the part
     that makes these scenarios evidence at all.  Measured: mp-facingside's
     "with no drawings at all, none of the four colours appears on him" started
     finding 14 blue and 6 red pixels of town cobble inside the box, i.e. the
     no-art control was reading scenery as art (TRAPS §34, one zoom level down).

     So the box scales with the live world scale and frames the same body at any
     zoom.  REF_WORLD_SCALE is the scale it was calibrated at, not a tuning knob.

     `k` rides along non-enumerably: a scenario whose threshold is an ABSOLUTE
     pixel count calibrated at the old size divides by k*k to compare like with
     like, instead of re-deriving a number every time the zoom moves. */
  const REF_WORLD_SCALE = 2 / 3;
  const k = Math.max(0.05, (c.worldScale || REF_WORLD_SCALE) / REF_WORLD_SCALE);
  const w = Math.round(40 * k) + pad * 2, h = Math.round(46 * k) + pad * 2;
  const x = Math.round(c.x - 20 * k - pad), y = Math.round(c.y - 44 * k - pad);
  if (x < 0 || y < 0 || x + w > c.vw || y + h > c.vh) return null;
  /* Geometry ONLY on the enumerable side: this object is handed straight to
     page.screenshot({ clip }), which is not the place to find out whether a
     stray key is tolerated.  The diagnostics ride non-enumerably. */
  const box = { x, y, width: w, height: h };
  Object.defineProperty(box, 'facing', { value: c.facing, enumerable: false });
  Object.defineProperty(box, 'drawn', { value: c.drawn, enumerable: false });
  Object.defineProperty(box, 'k', { value: k, enumerable: false });
  return box;
}

export async function screenshotPixels(P, clip) {
  const buf = await P.page.screenshot(clip ? { clip } : {});
  return decodePng(buf);
}

export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG unsupported');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`unsupported PNG: depth ${bitDepth} colour ${colorType}`);
  }
  const ch = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const out = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride); pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0;
      const b = prev ? prev[i] : 0;
      const c = (prev && i >= ch) ? prev[i - ch] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else if (filter !== 0) throw new Error('bad PNG filter ' + filter);
      cur[i] = v & 0xff;
    }
  }
  return {
    width, height, channels: ch, data: out,
    at(x, y) { const i = y * stride + x * ch; return [out[i], out[i + 1], out[i + 2]]; },
    /* How many pixels satisfy a colour predicate.  The point of all this. */
    count(pred) {
      let n = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * stride + x * ch;
          if (pred(out[i], out[i + 1], out[i + 2], x, y)) n++;
        }
      }
      return n;
    },
  };
}

/** Every visible button's text — the authoritative selector list at runtime. */
export function buttonTexts(P) {
  return P.page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((b) => b.offsetParent !== null)
    .map((b) => (b.textContent || '').trim().slice(0, 40)));
}

/** Is this text on screen?
 *
 *  Deliberately NOT leaf-only.  A friend's name sits in a div that also holds
 *  the unread badge, so a leaf-only walk reports "not shown" for a name that is
 *  plainly rendered — a false failure that costs a whole debugging round. */
export function seesText(P, text) {
  return P.page.evaluate((t) => {
    for (const el of document.body.querySelectorAll('*')) {
      if (el.offsetParent === null) continue;
      /* the nearest element that owns the text, not every ancestor */
      if (!(el.textContent || '').includes(t)) continue;
      if (![...el.children].some((c) => (c.textContent || '').includes(t))) return true;
    }
    return false;
  }, text);
}

/** Wait until a page-side predicate holds; throws with the button list on
 *  timeout so a failure says what the UI was actually showing.
 *
 *  `pred` is a function, or a STRING that page.evaluate treats as an
 *  EXPRESSION — so a string must be self-invoking (`(() => {...})()`).  A bare
 *  `() => {...}` string evaluates to a function object and silently never
 *  runs, which reads as "the UI never got there". */
export async function waitUi(P, pred, { timeout = 15000, label = 'ui' } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await P.page.evaluate(pred).catch(() => false)) return true;
    await P.page.waitForTimeout(200);
  }
  throw new Error(`timeout waiting for ${label}; visible buttons = ${JSON.stringify(await buttonTexts(P))}`);
}

/* ── wire instrumentation ──────────────────────────────────────────────── */
/** Count outbound events by name.  Lets a test distinguish "the client never
 *  sent it" from "the server never answered" — two failures that look
 *  identical from game state alone, and which point at opposite halves of the
 *  codebase. */
export async function instrumentWire(P) {
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (!S || !S.channel || window.__wire) return;
    window.__wire = Object.create(null);
    const orig = S.channel.send.bind(S.channel);
    S.channel.send = (m) => {
      try { const k = (m && (m.event || m.type)) || '?'; window.__wire[k] = (window.__wire[k] || 0) + 1; } catch (e) { /* never break the game */ }
      return orig(m);
    };
  });
}

export function wireCounts(P) {
  return P.page.evaluate(() => Object.assign({}, window.__wire || {}));
}

/* ── tiny assertion recorder ───────────────────────────────────────────── */
/* ═══ v2.3.1827: WALK MAYOR BRO'S DIALOGUE ═══
 *
 * v2.3.1820 split the quest card in two, at the owner's ask: the NPC now
 * speaks in his own window (`.bt-npcdlg`, his lines in sequential chunks
 * behind a Next button) and the offer is a SECOND panel (`.bt-qoffer`) that
 * shows the items being handed over.  Every scenario that used to find one
 * `.bt-inspect-card` and tap Accept now has two surfaces to get through.
 *
 * One helper, because four scenarios drive this flow and four hand-rolled
 * chunk loops is how they drift apart — which is exactly what the split
 * already cost once: mp-questline went red on the retired selector while the
 * flow underneath it was working perfectly.
 *
 * Returns the surface it ended on, so a caller can assert on it rather than
 * guess: 'offer' when the offer panel is up, 'dialogue' if it ran out of
 * clicks still talking, or null if nothing opened at all.
 */
export async function advanceNpcDialogue(P, { max = 12, onChunk = null } = {}) {
  for (let i = 0; i < max; i++) {
    const where = await P.page.evaluate(() => {
      if (document.querySelector('.bt-qoffer')) return 'offer';
      if (document.querySelector('.bt-npcdlg')) return 'dialogue';
      return null;
    });
    if (where !== 'dialogue') return where;
    /* Hand each chunk to the caller before clicking past it — his script is
       split across chunks, so a scenario asserting on what he SAYS can only
       see one line at a time otherwise. */
    if (onChunk) {
      onChunk(await P.page.evaluate(() => {
        const t = document.querySelector('.bt-npcdlg-text');
        return t ? (t.innerText || '') : '';
      }));
    }
    /* Click the Next BUTTON rather than the window: the window advances on
       any click, so tapping it works — but only the button proves the
       control a player actually aims at is wired. */
    const clicked = await P.page.evaluate(() => {
      const b = document.querySelector('.bt-npcdlg-next');
      if (!b) return false;
      b.click();
      return true;
    });
    if (!clicked) return 'dialogue';
    await P.page.waitForTimeout(220);
  }
  return P.page.evaluate(() => (document.querySelector('.bt-qoffer') ? 'offer'
    : document.querySelector('.bt-npcdlg') ? 'dialogue' : null));
}

/** Tap the offer panel's one primary — Accept Quest, or Claim Reward.
 *
 *  A REAL Playwright click, not an in-page `.click()`, and that is the whole
 *  point: an in-page click dispatches straight at the node and skips hit
 *  testing, so it happily "presses" a button that is underneath something
 *  else.  v2.3.1827 shipped exactly that — the offer panel rendered inside
 *  `.brotown-wrap`, the dashboard band covered the lower two thirds of it,
 *  and the centre of Claim Reward was unreachable to a finger while every
 *  in-page click in the suite kept passing.  A real click times out there,
 *  which is what a player experiences and therefore what the test must do.
 */
export async function confirmQuestOffer(P, { timeout = 6000 } = {}) {
  const blocked = await questOfferBlocked(P);
  if (blocked) return false;
  try {
    await P.page.locator('[data-tut="qoffer-confirm"]:visible').first()
      .click({ timeout });
  } catch (e) {
    return false;
  }
  await P.page.waitForTimeout(500);
  return true;
}

/** Pick the skill an XP-paying turn-in has to name, INSIDE the offer panel.
 *
 *  v2.3.1827.  The worker refuses an XP-paying turn-in that does not name a
 *  skill (v2.3.1669), so the claim button renders aria-disabled until one is
 *  chosen — which is why a missed skill click shows up later as "the turn-in
 *  button could be clicked: false" and reads like a broken button.
 *
 *  Scoped to `.bt-qoffer` and matched on exact text, because a page-wide
 *  text search for "Melee" also finds the dashboard behind the scrim; the
 *  old call site swallowed that ambiguity with `.catch(() => {})` and left
 *  the confirm disabled with nothing to say why.  Returns false rather than
 *  throwing, so the caller can assert on it AT the point it happened.
 */
export function chooseQuestSkill(P, name) {
  return P.page.evaluate((want) => {
    const panel = document.querySelector('.bt-qoffer');
    if (!panel) return false;
    const b = Array.from(panel.querySelectorAll('button'))
      .find((x) => (x.innerText || '').trim().toLowerCase() === want.toLowerCase());
    if (!b) return false;
    b.click();
    return true;
  }, name).then(async (ok) => { await P.page.waitForTimeout(300); return ok; });
}

/** Does the offer panel's primary still refuse to be pressed? */
export function questOfferBlocked(P) {
  return P.page.evaluate(() => {
    const b = document.querySelector('[data-tut="qoffer-confirm"]');
    return !!b && b.getAttribute('aria-disabled') === 'true';
  });
}

/** Is either half of the NPC conversation on screen? */
/* ═══ v2.3.2195: WALK UP TO AN NPC, WITH A CLEAN SLATE ═══
 * Lifted out of mp-questline, which had said for two versions why it belongs
 * here: "the dialogue-walking itself lives in the harness, because four
 * scenarios drive it and four private copies is how they drift."  v2.3.2195
 * makes that literal -- the quest panel's Accept button is gone (the owner:
 * "this was disabled a while ago and should remain disabled"), so every
 * scenario that used to accept from the list has to walk up to the giver
 * instead, and a third and fourth private copy is exactly what the note
 * warned about.
 *
 * AWAY, CLOSE, BACK IN, and all three steps are load-bearing: the proximity
 * latch only re-arms after leaving the larger radius, and the scan will not
 * re-fire while a card is already open (`!S._uiBusy`) -- so a card left over
 * from an earlier step sits there showing a STALE quest.  That is not
 * hypothetical; it is what made a turn-in read "New Quest!" (v2.3.1706b).
 *
 * Teleports rather than walks, because what is under test is the dialogue and
 * the quest state, never the pathfinding. */
function _placeByNpc(P, id, dx, dy) {
  return P.page.evaluate(({ who, ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = ((S && S.npcs) || []).find((n) => n && n.id === who);
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return true;
  }, { who: id, ox: dx, oy: dy });
}

/** Step away from an NPC and put his window away — the first half of the
 *  approach, on its own, because leaving is a step in its own right.
 *
 *  Order matters and it is the opposite of the intuitive one: WALK OFF first,
 *  THEN close.  Closing while still inside the opener's radius is a card that
 *  comes straight back (the latch is what suppresses it, and the latch is
 *  released by the close), and the way that shows up is a scrim sitting over
 *  the nav rail long after the scenario thought it had dismissed him. */
export async function leaveNpc(P, id = 'mayor_bro') {
  await _placeByNpc(P, id, 420, 0);
  await P.page.waitForTimeout(500);
  await closeNpcDialogue(P);
  await P.page.waitForTimeout(300);
  return !(await npcDialogueOpen(P));
}

export async function approachNpc(P, id = 'mayor_bro') {
  await leaveNpc(P, id);
  await _placeByNpc(P, id, 0, 34);
  await P.page.waitForTimeout(1100);
  return npcDialogueOpen(P);
}

export function npcDialogueOpen(P) {
  return P.page.evaluate(() => !!document.querySelector('.bt-npcdlg, .bt-qoffer'));
}

/** Close whichever half is up, the way a player does — the scrim. */
/* v2.3.2289: the ✕ FIRST, then the scrim.
   This used to click only `.bt-npcdlg-scrim`, which stopped being an exit on
   the claim face when that backdrop was made inert (a stray tap beside Claim
   Reward was throwing the screen away).  A helper that clicks a dead element
   does not fail -- it returns happily and the panel stays open, so the caller
   fails several assertions later for a reason unrelated to what it was
   testing.  Hence the check below: if the click did NOTHING, say so here.

   "Did nothing" is judged by NODE IDENTITY, not by "is a panel open".  Closing
   a claim-ready panel while you are stood on the NPC legitimately re-opens it
   on the next frame (the proximity opener releases on ready, BroTown.jsx), and
   the old helper hid that behind a blind 400ms wait.  A re-opened panel is a
   DIFFERENT DOM node, so `replaced` separates "it closed and the game brought
   it back" from "the control is dead" -- which is the distinction the throw
   needs and the reason this is not simply `!open`. */
export async function closeNpcDialogue(P) {
  const r = await P.page.evaluate(async () => {
    const q = () => document.querySelector('.bt-npcdlg, .bt-qoffer');
    const before = q();
    if (!before) return { how: 'nothing-open' };
    const x = document.querySelector('[data-qa="dlg-close"]');
    const s = document.querySelector('.bt-npcdlg-scrim');
    let how = 'none';
    if (x) { x.click(); how = 'close-button'; }
    else if (s) { s.click(); how = 'scrim'; }
    await new Promise((res) => setTimeout(res, 400));
    const after = q();
    return { how, closed: !after, replaced: !!after && after !== before };
  });
  if (r.how !== 'nothing-open' && r.how !== 'none' && !r.closed && !r.replaced) {
    throw new Error('closeNpcDialogue: clicked the ' + r.how
      + ' and nothing changed -- the control is dead');
  }
  return r.how;
}

/* ── the renderer must never throw ──────────────────────────────────────
 * v2.3.2228: pixiRenderer.js wraps each system's update in a try/catch that
 * logs ONCE and carries on -- deliberately, so one bad frame can't take the
 * game down.  The cost is that a per-frame ReferenceError in the render loop
 * is INVISIBLE: no crash, no pageerror, no failing screenshot, just a subtree
 * of the scene that silently stops updating.  That is how the slime "swells
 * then freezes" bug (a `display` read one line above its own `const`) reached
 * a player, and how the v2.3.756 `_layerShirt` incident did before it.
 *
 * Every scenario drives the renderer, so every scenario can watch for it.
 * Collected globally here and asserted once per scenario by run.mjs -- a
 * renderer throw is never expected and never someone else's problem, so it
 * fails whichever suite was on screen when it happened.
 */
const _renderThrows = [];
function _noteRenderThrow(who, text) {
  if (/\[pixi-render\].*threw/.test(text)) _renderThrows.push(`${who || 'player'}: ${text.slice(0, 240)}`);
}
export function takeRenderThrows() { return _renderThrows.splice(0, _renderThrows.length); }

export function recorder(suite) {
  const rows = [];
  return {
    ok(name, cond, detail) {
      rows.push({ suite, name, pass: !!cond, detail: cond ? undefined : detail });
      console.log(`${cond ? 'PASS' : 'FAIL'}  ${suite} :: ${name}${cond ? '' : '  ' + JSON.stringify(detail)}`);
      return !!cond;
    },
    /* Something the suite WOULD check but cannot reach — loud in the output,
     * not counted as a pass or a failure.  A skip is a statement about the
     * game ("this screen has no way in"), so it must not be silent, and it
     * must not be dressed up as a pass either. */
    skip(name, why) {
      rows.push({ suite, name, skip: true, detail: why });
      console.log(`SKIP  ${suite} :: ${name}  — ${why}`);
    },
    rows: () => rows,
    failed: () => rows.filter((r) => !r.pass && !r.skip).length,
  };
}

export async function launch() {
  /* v2.3.1729: the sandbox's pinned Chromium is used WHEN IT EXISTS, and
     Playwright resolves its own managed browser otherwise.  The hardcoded
     executablePath threw ENOENT on any other machine, so this harness could
     only ever run here — see the REPO note above for why that mattered.
     BT_CHROMIUM overrides for a non-standard install. */
  const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
  const opts = {
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu', '--no-sandbox'],
  };
  if (existsSync(pinned)) opts.executablePath = pinned;
  return chromium.launch(opts);
}
