/* THE POINTS SCREEN AS ONE GRID OF THIRTEEN STATS (v2.3.2642).
 *
 * REWRITTEN, NOT REPAIRED.  This scenario used to drive the two-step screen of
 * v2.3.2597: a 2x2 of MELEE / BOW / MAGIC / SHARED, then a drilled-in card of
 * that category's rows.  The owner replaced it with a single grid -- six lane
 * stats behind a weapons cell, seven body stats behind the portrait, thirteen
 * glyph cells on one screen -- and asked for the points-remaining counts to
 * move into the confirm window.  So nineteen assertions here described a
 * screen that no longer exists.  Deleting them would have dropped the
 * coverage; re-pointing them at the new shape keeps it.
 *
 * WHAT SURVIVED UNCHANGED, because it was never about the layout:
 *   - the worker MINTS the points (a client-side seed makes every spend
 *     assertion vacuous -- the note below is the original and still holds),
 *   - a spend charges the right pool and leaves the other lanes alone,
 *   - the confirm window explains the stat and names the weapon,
 *   - every gesture is a real finger (TRAPS §67).
 *
 * WHAT IS NEW, and is the point of the redesign:
 *   - ALL THIRTEEN stats are on screen at once and each is its own thumb
 *     target.  The old risk was "a row with no [+] strands that stat"; the
 *     new one is the same risk with the cell as the button.
 *   - NO POINTS-REMAINING ANYWHERE IN THE GRID.  That is an owner
 *     instruction, so it is asserted as an absence -- the kind of thing that
 *     creeps back one tile at a time unless a test objects.
 *   - EVERY GLYPH ACTUALLY LOADS.  The thirteen icons are new files on new
 *     paths, and a wrong path renders an empty box that no layout assertion
 *     can see.  naturalWidth is what tells the difference (this repo shipped
 *     exactly that bug with the auction-house interior).
 */
import * as H from './harness.mjs';

const OUT = `${H.REPO}/tools/qa/mp/out`;

/* ═══ REAL POINTS, FROM THE WORKER ═══
   A first cut seeded the pools in the BROWSER (R.prog3.pool = 15). Every layout
   assertion passed on that and every SPEND assertion failed, because the server
   had never heard of those points and was right to refuse the allocate — the
   game is server-authoritative for progression (CLAUDE.md). The blob simply
   never moved, which reads exactly like a dead [+] button and is not one.
   So points are minted the way mp-statgrid mints them: the devkit's `levels`
   award runs the worker's own _prog3AwardXp, which creates the lane points AND
   the shared points on the server. If this ever fails, the spend assertions go
   red rather than silently testing nothing. */
async function seed(P, wsPort) {
  const myId = await H.readState(P, (S) => S.myId);
  await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/kit`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId, what: 'levels' }),
  }).then((r) => r.json()).catch(() => null);
  await P.page.waitForTimeout(1600);
  return P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    const p = (R && R.prog3) || {};
    return { pool: p.pool, shared: p.shared, poolBy: p.poolBy,
      caps: !!(S && S._serverCaps && S._serverCaps.prog3shared) };
  });
}

/* A REAL finger on the centre of a selector, after scrolling it into view.
   Returns false when the element is not there at all, so a miss reads as a
   miss rather than as a silent pass. */
async function finger(P, sel) {
  const box = await P.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, sel);
  if (!box) return false;
  await P.page.touchscreen.tap(box.x, box.y);
  await P.page.waitForTimeout(340);
  return true;
}

const has = (P, sel) => P.page.evaluate((s) => !!document.querySelector(s), sel);
const pools = (P) => P.page.evaluate(() => {
  const R = window._gameState && window._gameState.current && window._gameState.current.rpg;
  const p = (R && R.prog3) || {};
  const j = (o) => JSON.parse(JSON.stringify(o || {}));
  return { pool: p.pool, shared: p.shared, poolBy: j(p.poolBy), atk: j(p.atk), alloc: j(p.alloc) };
});

/* Answer the confirm window with a real finger and WAIT FOR THE WORKER.
   A spend is a round trip — the client only sends prog3_allocate, and the blob
   moves when the server echoes — so this polls rather than sleeping once.
   The same shape mp-statgrid used, which is where this coverage comes from. */
async function answerConfirm(P, which, settle) {
  /* v2.3.2597: the spend lives at the bottom of the INFORMATION window now —
     one window that explains and confirms, the owner's own arrangement — so
     'confirm' is its gold action and 'cancel' is its close. */
  const ok = await finger(P, which === 'confirm' ? '[data-infopopup-action]' : '[data-infopopup-close]');
  if (!ok) return { err: 'no ' + which };
  for (let i = 0; i < 40; i++) {
    await P.page.waitForTimeout(100);
    const now = await pools(P);
    if (settle(now)) return { ok: true, now };
  }
  return { ok: false, now: await pools(P) };
}

async function openPoints(P) {
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(600);
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
    .first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(700);
}

export async function run({ browser, wsPort, webPort, rec }) {
  for (const [label, vp, land, who] of [
    ['390-portrait', { width: 390, height: 844 }, false, 'Catgrida'],
    ['360-portrait', { width: 360, height: 800 }, false, 'Catgridb'],
    ['390-landscape', { width: 844, height: 390 }, true, 'Catgridc'],
    ['360-landscape', { width: 800, height: 360 }, true, 'Catgridd'],
  ]) {
    /* ═══ ENTER IN PORTRAIT, THEN ROTATE ═══
       Restored verbatim from the pre-v2.3.2642 file after the rewrite dropped
       it and spent a run finding out why.  The character creator cannot be
       completed sideways -- entering straight into 844x390 leaves the Enter
       button un-clickable and `H.enterWorld` times out 30s later, before a
       single line of Points code runs.  So every player joins portrait and
       the sideways cases rotate afterwards.
       The four viewports are the pre-existing set too: the rewrite had cut
       them to two, which quietly dropped the 360-wide coverage. */
    const P = await H.newPlayer(browser, { name: who, wsPort, webPort,
      viewport: land ? { width: 390, height: 844 } : vp, touch: true });
    await H.enterWorld(P);
    await P.page.waitForTimeout(2400);
    if (land) { await P.page.setViewportSize(vp); await P.page.waitForTimeout(1100); }
    const seeded = await seed(P, wsPort);
    rec.ok(`${label}: the worker minted real points to spend (guard — a client-side seed would make every spend below vacuous)`,
      !!seeded && seeded.pool > 0, seeded);
    rec.ok(`${label}: the worker advertises the shared-pool grid (guard)`, !!seeded && seeded.caps === true, seeded);
    rec.ok(`${label}: ...and minted a real SHARED pool beside the lane pool (v2.3.2592)`,
      !!seeded && seeded.shared > 0, seeded);

    /* Sideways the nav rail's "More" never becomes visible, so `openPoints`
       (which goes through it) times out waiting for it -- the rewrite hit
       this after the rotate fix and it is the second half of the same
       pre-existing knowledge.  Landscape opens the panel through the bus
       directly, exactly as the pre-v2.3.2642 file did. */
    if (land) {
      await P.page.evaluate(() => window.__broDashPanelBus && window.__broDashPanelBus.open('hero'));
      await P.page.waitForTimeout(900);
      await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
        .first().click({ timeout: 8000 }).catch(() => {});
      await P.page.waitForTimeout(700);
    } else {
      await openPoints(P);
    }

    /* ── THE GRID ── */
    const grid = await P.page.evaluate(() => {
      const g = document.querySelector('[data-prog3-grid]');
      if (!g) return null;
      const cells = [...g.querySelectorAll('[data-prog3-row]')];
      const heads = [...g.querySelectorAll('[data-prog3-lane]')];
      const r = (e) => e.getBoundingClientRect();
      return {
        cells: cells.length,
        heads: heads.map((h) => h.getAttribute('data-prog3-lane')),
        keys: cells.map((c) => c.getAttribute('data-stat-info')),
        /* every cell is the button now: the row handle and the plus handle
           are the same element, which is the real change to what "the row" is */
        allArePlus: cells.every((c) => c.hasAttribute('data-prog3-plus')),
        minW: Math.min(...cells.map((c) => +r(c).width.toFixed(1))),
        minH: Math.min(...cells.map((c) => +r(c).height.toFixed(1))),
        /* glyphs: a wrong path is an empty box no layout check can see */
        imgs: cells.map((c) => {
          const i = c.querySelector('img');
          return i ? { src: (i.getAttribute('src') || '').split('?')[0], w: i.naturalWidth } : null;
        }),
        labels: cells.map((c) => (c.querySelector('span') || {}).textContent || ''),
        gridText: g.textContent || '',
        right: Math.max(...cells.map((c) => +r(c).right.toFixed(1))),
        vw: window.innerWidth,
      };
    });
    rec.ok(`${label}: the Points screen is ONE grid, not a category chooser`, !!grid, grid);

    rec.ok(`${label}: all THIRTEEN stats are on screen at once — six lane, seven body`,
      !!grid && grid.cells === 13, grid && { cells: grid.cells, keys: grid.keys });
    rec.ok(`${label}: ...behind a weapons head and a shared head`,
      !!grid && grid.heads.length === 2 && grid.heads[1] === 'shared', grid && grid.heads);
    rec.ok(`${label}: every cell IS the button — the row handle and the spend handle are one element`,
      !!grid && grid.allArePlus, grid && { allArePlus: grid.allArePlus });
    rec.ok(`${label}: no stat is stranded — each of the thirteen carries its own stat handle`,
      !!grid && grid.keys.filter(Boolean).length === 13 && new Set(grid.keys).size === 13,
      grid && grid.keys);

    /* ── THE OWNER'S GLYPHS ── */
    const badImg = (grid && grid.imgs.filter((i) => !i || !i.w)) || [];
    rec.ok(`${label}: every one of the thirteen glyphs actually DECODED (a wrong path is an invisible box)`,
      !!grid && badImg.length === 0, { bad: badImg, all: grid && grid.imgs });
    rec.ok(`${label}: ...and they are the owner's new colour set, not the old icons`,
      !!grid && grid.imgs.every((i) => i && /\/icons\/ui\/stat\//.test(i.src)),
      grid && grid.imgs.map((i) => i && i.src));

    /* ── THE INSTRUCTION: NO COUNTS IN THE GRID ── */
    rec.ok(`${label}: the grid shows NO points-remaining — by instruction, that lives in the confirm window`,
      !!grid && !/\bPTS?\b|AVAILABLE|SPENT/i.test(grid.gridText), grid && { text: grid.gridText.slice(0, 160) });

    /* ── IT FITS ── */
    rec.ok(`${label}: nothing in the grid hangs off the viewport`,
      !!grid && grid.right <= grid.vw + 0.5, grid && { right: grid.right, vw: grid.vw });
    rec.ok(`${label}: ...and no caption is clipped (every cell prints a label)`,
      !!grid && grid.labels.every((t) => t && t.trim().length > 1), grid && grid.labels);

    /* ── THE WEAPONS HEAD PICKS THE LANE ── */
    const lane0 = grid && grid.heads[0];
    await finger(P, '[data-prog3-lane]:not([data-prog3-lane="shared"])');
    const lane1 = await P.page.evaluate(() => {
      const h = document.querySelector('[data-prog3-grid] [data-prog3-lane]');
      return h ? h.getAttribute('data-prog3-lane') : null;
    });
    rec.ok(`${label}: tapping the weapons head switches which lane the six stats belong to`,
      !!lane0 && !!lane1 && lane1 !== lane0, { from: lane0, to: lane1 });

    /* ── A SPEND STILL GOES TO THE RIGHT POOL ── */
    const before = await pools(P);
    /* the lane the head is showing now is the lane the confirm must name */
    const laneNow = lane1 || lane0;
    const tappedStat = await finger(P, `[data-prog3-row^="${laneNow}:"]`);
    rec.ok(`${label}: a real finger reaches a lane stat cell (hit-tested, not dispatched)`, tappedStat);

    const confirm = await P.page.evaluate(() => {
      const w = document.querySelector('[data-infopopup]') || document.querySelector('[data-infopopup-action]');
      if (!w) return null;
      const root = w.closest('[data-infopopup]') || w.parentElement;
      return { text: (root && root.textContent || '').slice(0, 400) };
    });
    rec.ok(`${label}: ...which opens the spend window`, !!confirm, confirm);
    rec.ok(`${label}: ...and NOTHING was spent by opening it (a mis-tap costs a window, not a point)`,
      JSON.stringify(await pools(P)) === JSON.stringify(before));

    const laneLabel = { sword: 'Melee', bow: 'Bow', staff: 'Magic' }[laneNow] || laneNow;
    rec.ok(`${label}: the window NAMES THE WEAPON — the owner's stated reason the confirm exists`,
      !!confirm && new RegExp(laneLabel, 'i').test(confirm.text), { want: laneLabel, got: confirm && confirm.text.slice(0, 120) });

    const spent = await answerConfirm(P, 'confirm', (n) => n.pool !== before.pool || JSON.stringify(n.poolBy) !== JSON.stringify(before.poolBy));
    rec.ok(`${label}: answering the window actually buys the point`, !!spent.ok, spent.now && { pool: spent.now.pool });
    if (spent.ok) {
      const n = spent.now || {};
      rec.ok(`${label}: ...and the WORKER charged that lane, not the shared pool`,
        n.shared === before.shared, { lane: laneNow, sharedBefore: before.shared, sharedAfter: n.shared });
      const otherMoved = Object.keys(before.poolBy || {}).filter((k) => k !== laneNow
        && (before.poolBy[k] !== (n.poolBy || {})[k]));
      rec.ok(`${label}: ...and the other weapon lanes did not move`,
        otherMoved.length === 0, { otherMoved, before: before.poolBy, after: n.poolBy });
    }

    /* ── A BODY STAT SPENDS THE SHARED POOL ── */
    const b2 = await pools(P);
    await finger(P, '[data-prog3-row^="shared:"]');
    const sSpent = await answerConfirm(P, 'confirm', (n) => n.shared !== b2.shared);
    rec.ok(`${label}: a SHARED stat spends the SHARED pool`,
      !!sSpent.ok && (sSpent.now || {}).shared === b2.shared - 1,
      { before: b2.shared, after: sSpent.now && sSpent.now.shared });
    rec.ok(`${label}: ...and no weapon lane paid for it`,
      !!sSpent.ok && JSON.stringify((sSpent.now || {}).poolBy) === JSON.stringify(b2.poolBy),
      { before: b2.poolBy, after: sSpent.now && sSpent.now.poolBy });

    /* ═══ WHAT "NO PAGE ERRORS" CAN HONESTLY MEAN IN THIS SANDBOX ═══
       Two requests can never succeed here and neither belongs to this change:
       the Google Fonts stylesheet, and the catalogue CSV that BroTown.jsx and
       GameApp.jsx fetch from raw.githubusercontent. Both are made on
       origin/main, both are blocked the same way — the agent proxy terminates
       TLS with a CA Chromium does not trust, so they surface as
       ERR_CERT_AUTHORITY_INVALID. Verified by listening to `requestfailed`
       for the URLs (probe-cert.mjs) rather than guessing from the console text,
       which carries no URL.
       So the assertion tests what it can mean: no page error that is NOT the
       sandbox intercepting an external host. Widening it back to "zero logs"
       would make this scenario permanently red for a reason no change here can
       fix, which is how a real failure gets ignored. */
    const real = P.logs.filter((l) => !/ERR_CERT_AUTHORITY_INVALID|ERR_CERT_COMMON_NAME_INVALID/.test(l));
    rec.ok(`${label}: no page errors (excluding the sandbox's TLS block on fonts + the catalogue CSV, which fail on main too)`,
      real.length === 0, real.slice(0, 3));
    await P.ctx.close();
  }
}
