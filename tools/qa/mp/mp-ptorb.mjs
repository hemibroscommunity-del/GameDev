/* ═══ A POINT LANDING IN BUILD IS VISIBLE (v2.3.2329) ═══
 *
 * Owner: "When you spend combat points it's kind of ambiguous whether it took
 * effect or not.  Add something to the menu that makes a little effect
 * whenever you add points.  Maybe it's a persistent orb or something next to
 * that row's skill point or something."
 *
 * WHY IT WAS AMBIGUOUS: a tap on a stat row only SENDS prog3_allocate.  Nothing
 * changes locally; the count moves when the worker echoes the new blob, a round
 * trip later, by one digit of 10.5px text.  There was no marker for the moment
 * the spend actually took.
 *
 * WHAT THIS PINS: a persistent orb sits beside every row's count, and it flares
 * (plus a +1 float) when THAT row's count goes up -- which only the worker's
 * echo can cause.  So the assertions are about the ECHO, not the tap:
 *   - nothing flares when the sheet opens (first sight seeds, never lights);
 *   - the tapped row flares once its count increments, and ONLY that row;
 *   - the flare is transient and per-row: a later spend on another row lights
 *     that one while the first has gone dark.
 *
 * THE POINTS ARE REAL.  /dev/kit {what:'levels'} runs the worker's own
 * _prog3AwardXp through its own level-up, so the pool this spends from is the
 * worker's, and the increment the orb reacts to is the worker's echo.  A
 * client-seeded pool (mp-buildcols does that, for pictures) would send a spend
 * the worker refuses, and this would go red -- which is the right answer.
 *
 * THE TAP IS A REAL TOUCH through CDP with a little drift, not a synthetic
 * dispatch (mp-prog3's lesson, v2.3.2326).  Drift is kept UNDER the browser's
 * scroll-cancel threshold on purpose: the row is inside a scroller, and this
 * scenario is about the orb, not about re-proving scrollTap's cancel path.
 */
import * as H from './harness.mjs';

const ROW = '[role="button"][aria-label*=" of "]';

/* The rows on screen right now, with what each one says. */
const rowsNow = (P) => P.page.evaluate((ROW) => {
  return [...document.querySelectorAll(ROW)].map((el) => {
    const label = el.getAttribute('aria-label') || '';
    const m = label.match(/^([^,]+), (\d+) of (\d+)\./);
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    const orb = el.querySelector('[data-pt-orb]');
    return {
      stat: m ? m[1] : label, pts: m ? +m[2] : null, cap: m ? +m[3] : null,
      key: orb ? orb.getAttribute('data-pt-orb') : null,
      orbPresent: !!orb,
      landed: !!(orb && orb.getAttribute('data-landed') === '1'),
      landClass: !!(orb && orb.classList.contains('bt-pt-orb-land')),
      /* Read in the same snapshot as the class: the flare is a 900ms window,
         and a read after a screenshot on a slow box lands after it closed. */
      anim: orb ? getComputedStyle(orb).animationName : null,
      full: !!(orb && orb.classList.contains('bt-pt-orb-full')),
      plus: el.querySelector('.bt-pt-plus') ? el.querySelector('.bt-pt-plus').textContent : null,
      spendable: el.getAttribute('aria-disabled') !== 'true',
      onScreen: !!(hit && hit.closest && hit.closest(ROW) === el),
      x, y,
    };
  });
}, ROW);

/* A real finger on the row: CDP touch with a small drift. */
async function fingerTap(P, x, y, drift = 8) {
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 4; i++) {
    await new Promise((r) => setTimeout(r, 22));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (drift * i) / 4 }] });
  }
  await new Promise((r) => setTimeout(r, 22));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/* Spend on a row and wait for the WORKER's echo to move its count. Returns the
   rows as they stood the moment the count changed. */
async function spendAndWait(P, row, { timeout = 15000, freeze = false } = {}) {
  await fingerTap(P, row.x, row.y);
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const rows = await rowsNow(P);
    const r = rows.find((q) => q.key === row.key);
    if (r && r.pts === row.pts + 1) {
      /* For the photograph only: hold the flare at its peak. The animation
         clock is paused at 400ms of 720 so a capture that takes longer than
         the flare still shows it. Assertions never read this. */
      if (freeze) await P.page.evaluate((k) => {
        for (const a of document.getAnimations()) {
          const el = a.effect && a.effect.target;
          if (el && (el.getAttribute('data-pt-orb') === k || el.classList.contains('bt-pt-plus'))) {
            a.pause(); a.currentTime = 420;
          }
        }
      }, row.key).catch(() => {});
      return { rows, row: r };
    }
    await P.page.waitForTimeout(120);
  }
  return null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Orb', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const myId = await H.readState(P, (S) => S.myId);

  /* Real points, minted by the worker's own level-up path. */
  const kit = await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/kit`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId, what: 'levels' }),
  }).then((r) => r.json()).catch((e) => ({ err: String(e) }));
  await P.page.waitForTimeout(1500);
  const pool = await H.readState(P, (S) => (S.rpg && S.rpg.prog3 && S.rpg.prog3.pool) || 0);
  rec.ok('the worker minted a real point pool to spend from (guard)', pool >= 3, { pool, kit });
  if (pool < 3) { await P.ctx.close().catch(() => {}); return; }

  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(700);
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]').first()
    .click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(900);

  const open = await rowsNow(P);
  const shown = open.filter((r) => r.onScreen);
  /* The lane body scrolls, so only the first rows of the open lane are on
     screen at 390x844 (mp-prog3 owns the fold question). One is enough here. */
  rec.ok('at least one Build row is on screen (guard)', shown.length >= 1, { rows: open.length, shown: shown.length });
  rec.ok('EVERY row carries its orb before anything is spent -- it is persistent, not a one-off',
    open.length > 0 && open.every((r) => r.orbPresent), open.map((r) => [r.stat, r.orbPresent]));
  rec.ok('...and NOTHING flares on opening the sheet (first sight seeds, never lights)',
    open.every((r) => !r.landed && !r.landClass && !r.plus), open.filter((r) => r.landed || r.plus).map((r) => r.stat));

  const target = shown.find((r) => r.spendable && r.pts != null && r.pts < r.cap);
  rec.ok('a spendable row is on screen to tap (guard)', !!target, shown.map((r) => [r.stat, r.spendable, r.pts, r.cap]));
  if (!target) { await P.ctx.close().catch(() => {}); return; }
  console.log(`    tapping ${target.stat} (${target.pts} of ${target.cap})`);

  const first = await spendAndWait(P, target, { freeze: true });
  rec.ok(`the worker echoed the spend: ${target.stat} went ${target.pts} -> ${target.pts + 1} (guard)`, !!first, { target });
  if (!first) { await P.ctx.close().catch(() => {}); return; }
  /* A CLIPPED shot of the rows, taken the instant the echo lands: a full
     dpr-2 page capture on this box takes longer than the flare itself, so the
     first cut of this photographed the orb already settled. The clip is
     small enough to land mid-animation, which is the picture the owner asked
     for. tools/qa/shots/ptorb-flare.png */
  const shoot = async (label, document_k) => {
    const clip = await P.page.evaluate((ROW) => {
      const els = [...document.querySelectorAll(ROW)].map((e) => e.getBoundingClientRect())
        .filter((r) => r.bottom > 0 && r.top < window.innerHeight);
      if (!els.length) return null;
      const top = Math.max(0, Math.min(...els.map((r) => r.top)) - 6);
      const bottom = Math.min(window.innerHeight, Math.max(...els.map((r) => r.bottom)) + 6);
      return { x: 0, y: top, width: window.innerWidth, height: bottom - top };
    }, ROW);
    /* RAW CDP, not page.screenshot(): Playwright's capture pipeline discards a
       paused Web Animation and photographs the settled state (measured -- the
       style engine reported transform x2.05 and a paused animation at 400ms
       while the Playwright shot showed the dim dot).  Page.captureScreenshot
       shows what the compositor has. */
    const cdp = await P.page.context().newCDPSession(P.page);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 2 } });
    await cdp.detach();
    /* Was the flare still on the row when the compositor drew that? The
       style engine is asked AFTER the capture, so a frame that lost the
       flare between the check and the shot is reported, not filed. */
    const held = await P.page.evaluate((k) => {
      const o = document.querySelector(`[data-pt-orb="${k}"]`);
      const cs = o && getComputedStyle(o);
      return !!(o && o.classList.contains('bt-pt-orb-land') && cs && /matrix\((1\.[5-9]|2)/.test(cs.transform));
    }, document_k);
    if (held || /^STAGED/.test(label)) {
      (await import('node:fs')).writeFileSync('tools/qa/shots/ptorb-flare.png', Buffer.from(shot.data, 'base64'));
      console.log('    photo: ' + label);
    } else {
      console.log('    photo: the flare had cleared by the capture -- ' + label + ' NOT filed');
    }
    return held;
  };
  try {
    /* Was the frozen real flare still on the row when we got here? A regen
       tick re-renders the sheet every ~660ms and the flare class lives 900ms,
       so on a slow box the capture can arrive after it cleared. */
    const still = await P.page.evaluate((k) => {
      const o = document.querySelector(`[data-pt-orb="${k}"]`);
      return !!(o && o.classList.contains('bt-pt-orb-land') && o.getAnimations().some((a) => a.playState === 'paused'));
    }, target.key);
    let filed = false;
    if (still) filed = await shoot('the real flare, frozen at 420ms of 720', target.key);
    P._flareFiled = filed;   /* the end of the run stages one if this frame was lost */
  } catch (e) { /* a missing picture is not a failed spend */ }

  const lit = first.rows.filter((r) => r.landed);
  rec.ok('THE HEADLINE: the moment the count moved, that row\'s orb flared',
    first.row.landed && first.row.landClass, first.row);
  rec.ok('...with a +1 floating beside it', first.row.plus === '+1', first.row);
  rec.ok('...and NO other row lit -- the flare belongs to the row that took the point',
    lit.length === 1 && lit[0].key === target.key, lit.map((r) => r.stat));
  rec.ok('the flare is the real keyframe animation, not a class with no CSS behind it',
    first.row.anim === 'bt-pt-land', { anim: first.row.anim });

  /* A second spend on a DIFFERENT row, after the first flare has had its
     900ms: the new row lights, the old one is dark again. */
  await P.page.waitForTimeout(1400);
  const again = await rowsNow(P);
  const other = again.filter((r) => r.onScreen).find((r) => r.spendable && r.key !== target.key && r.pts != null && r.pts < r.cap);
  if (!other) {
    rec.skip('a second row lights while the first goes dark', 'no second spendable row on screen');
  } else {
    const second = await spendAndWait(P, other);
    rec.ok(`the worker echoed a second spend on ${other.stat} (guard)`, !!second, { other });
    if (second) {
      const lit2 = second.rows.filter((r) => r.landed);
      const firstNow = second.rows.find((r) => r.key === target.key);
      rec.ok('the second row flares, and only it',
        lit2.length === 1 && lit2[0].key === other.key, lit2.map((r) => r.stat));
      rec.ok('...while the first row has gone dark -- the flare is a moment, not a state',
        !!firstNow && !firstNow.landed && !firstNow.plus, firstNow);
    }
  }

  /* THE STAGED PHOTOGRAPH, last of all.  If the real frame was lost between
     its check and the capture (a re-render inside the 1300ms window on a slow
     box), the class and the +1 are put on the row BY HAND here and the
     animation paused at the same 420ms, purely so the picture shows the effect
     the assertions above already proved.  Last, because React never removes a
     class it did not set: the first cut staged this right after the first
     spend, and the "first row has gone dark" assertion then read the props
     that had been planted for the camera. */
  if (!P._flareFiled) {
    try {
      await P.page.evaluate((k) => {
        const o = document.querySelector(`[data-pt-orb="${k}"]`);
        if (!o) return;
        o.classList.add('bt-pt-orb-land');
        const p = document.createElement('span'); p.className = 'bt-pt-plus'; p.textContent = '+1';
        o.parentElement.appendChild(p);
        for (const a of document.getAnimations()) {
          const el = a.effect && a.effect.target;
          if (el === o || el === p) { a.pause(); a.currentTime = 420; }
        }
      }, target.key);
      await shoot('STAGED (the real frame was lost before its capture) -- frozen at 420ms', target.key);
    } catch (e) { /* a missing picture is not a failed spend */ }
  }

  /* A capped stat, if any is on screen, reads solid. */
  const capped = again.find((r) => r.pts != null && r.cap != null && r.pts >= r.cap);
  if (!capped) rec.skip('a capped stat\'s orb reads solid', 'no capped stat on screen for this character');
  else rec.ok('a capped stat\'s orb reads solid (nothing more to put here)', capped.full, capped);

  await P.ctx.close().catch(() => {});
}
