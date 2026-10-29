/* ═══ ON A COMPUTER, SPACE JUMPS AND X ROLLS (v2.3.3844) ═══
 *
 * The owner, 2026-10-29: "Also spacebar I think should be jump."  Space was
 * the dodge roll and X the jump (v2.3.3017); they swap
 * (src/game/desktopControls.js).  On a real page, a computer (1280 x 800, the
 * wide layout), in BroTown, by Playwright's real keyboard:
 *   1. Space jumps -- one press, one jump -- and starts no roll;
 *   2. X rolls, and starts no jump;
 *   3. held, Space jumps once (its repeats nothing more: the double jump's
 *      flip is a second PRESS);
 *   4. with a button a click left focused, Space still jumps, and neither
 *      presses that button nor scrolls the page;
 *   5. the controls list says "Space Jump" and "X Dodge";
 *   6. no page errors.
 */
import * as H from './harness.mjs';

const WIDE = { width: 1280, height: 800 };

/* press a key from Playwright and count, inside the page, the rolls and
   jumps it starts: a roll is counted as the game sets its field (a roll is
   250-500 ms, and on this box polling can miss it whole), a jump by the
   game's own count */
const pressAndWatch = async (P, key, ms = 1200) => {
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__sjSeen = { roll: 0, jump: 0, c0: S._jumpCount || 0 };
    let v = S._dodgeRoll;
    delete S._dodgeRoll;
    Object.defineProperty(S, '_dodgeRoll', { configurable: true, enumerable: true,
      get: () => v, set: (x) => { if (x && x !== v) window.__sjSeen.roll += 1; v = x; } });
  });
  await P.page.keyboard.press(key);
  await P.page.waitForTimeout(ms);
  return P.page.evaluate(() => {
    const S = window._gameState.current, v = S._dodgeRoll;
    delete S._dodgeRoll; S._dodgeRoll = v;   /* the game's own field back */
    return { roll: window.__sjSeen.roll, jump: (S._jumpCount || 0) - window.__sjSeen.c0 };
  });
};
const settle = async (P) => {
  await H.waitFor(P, () => ({ air: window.__btJumpBtn().air, roll: !!window._gameState.current._dodgeRoll }),
    (v) => !v.air && !v.roll, { timeout: 5000, label: 'on the ground' }).catch(() => null);
  await P.page.waitForTimeout(700);   /* the landing's rest (JUMP_REST_MS) and the roll's cool-down */
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Spacejump', wsPort, webPort, viewport: WIDE, world: 'wheel', wide: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, desk: !!S._isDesktop }),
      (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'into the world' }).catch(() => null);
    rec.ok('a computer in the world, the wide layout (guard)', !!inW && inW.desk, inW);
    if (!inW || !inW.desk) return;
    await H.closeNpcDialogue(P).catch(() => {});
    await P.page.addStyleTag({ content: '*:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await P.page.evaluate(() => { window.__btProbe = true; const a = document.activeElement; if (a && a.blur) a.blur(); });
    await P.page.waitForTimeout(1500);

    /* ── 1. Space jumps ── */
    const s1 = await pressAndWatch(P, 'Space');
    rec.ok(`1. Space jumps (jumps ${s1.jump}) and starts no roll (rolls ${s1.roll})`, s1.jump === 1 && s1.roll === 0, s1);
    await settle(P);

    /* ── 2. X rolls ── */
    const s2 = await pressAndWatch(P, 'x');
    rec.ok(`2. X rolls (rolls ${s2.roll}) and starts no jump (jumps ${s2.jump})`, s2.roll === 1 && s2.jump === 0, s2);
    await settle(P);

    /* ── 3. Space held: one jump ── */
    const c3 = await P.page.evaluate(() => window._gameState.current._jumpCount || 0);
    await P.page.keyboard.down('Space');
    for (let i = 0; i < 12; i++) {   /* a held key's repeats, as the browser sends them */
      await P.page.keyboard.down('Space');
      await P.page.waitForTimeout(40);
    }
    await P.page.keyboard.up('Space');
    const s3 = await P.page.evaluate((c) => ({ jumps: (window._gameState.current._jumpCount || 0) - c, flip: !!(window._gameState.current._jump && window._gameState.current._jump.flip) }), c3);
    rec.ok(`3. Space held jumps once (jumps ${s3.jumps}, no flip from its repeats)`, s3.jumps === 1 && !s3.flip, s3);
    await settle(P);

    /* ── 4. a focused button: Space presses it not, scrolls nothing ── */
    const f = await P.page.evaluate(() => {
      const b = document.createElement('button');
      b.textContent = 'qa';
      b.setAttribute('data-sj-btn', '');
      b.style.cssText = 'position:fixed;left:2px;top:2px;width:10px;height:10px;opacity:0.01;';
      window.__sjClicks = 0;
      b.addEventListener('click', () => { window.__sjClicks += 1; });
      document.body.appendChild(b);
      b.focus();
      const sc = [document.scrollingElement || document.documentElement].concat([...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)));
      window.__sjScroll = () => sc.map((e) => e.scrollTop).join();
      return { focused: document.activeElement === b, scroll: window.__sjScroll(), win: window.scrollY };
    });
    const s4 = await pressAndWatch(P, 'Space');
    const f2 = await P.page.evaluate(() => ({ clicks: window.__sjClicks, scroll: window.__sjScroll(), win: window.scrollY }));
    rec.ok(`4. a button focused (guard: ${f.focused}): Space still jumps (${s4.jump}), presses it not (clicks ${f2.clicks}), scrolls nothing`,
      f.focused && s4.jump === 1 && f2.clicks === 0 && f2.scroll === f.scroll && f2.win === f.win, { f, f2, s4 });
    await P.page.evaluate(() => { const b = document.querySelector('[data-sj-btn]'); if (b) b.remove(); });

    /* ── 5. the controls list ── */
    const rows = await P.page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.bt-desk-keys .bt-desk-key')]
      .map((r) => [((r.querySelector('kbd') || {}).textContent || '').trim(), ((r.querySelector('span') || {}).textContent || '').trim()])));
    rec.ok(`5. the controls list says Space ${rows.Space}, X ${rows.X}`, rows.Space === 'Jump' && rows.X === 'Dodge', rows);
    rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
