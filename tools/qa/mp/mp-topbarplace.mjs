/* ═══ THE TOP BAR'S PLACE CHIP AND YOUR PLAYER FRAME (v2.3.3974) ═══
 *
 * The owner, 2026-11-02: "The top bar is underwhelming (says 'brotown')" and
 * the desktop playtest's "player status not showing"; he chose an always-on
 * frame (level, HP, energy; no picture since v2.3.4093; gone since v2.3.4163) top-left, and a Safe / PvP / Outlaw chip.
 * One real player against a real worker, IN THE WORLD (`world: 'wheel'`), in
 * three layouts -- a phone upright (390 x 844), sideways (844 x 390), and a
 * computer playing wide (1440 x 900):
 *   1. (v2.3.4113) nothing of the place or its safety in the top bar --
 *      "BroTown" kept in the page, drawn clear -- and the minimap's plate
 *      says "safe"; no day/night icon;
 *   2. (v2.3.4163) no player frame on the game screen (the owner took it
 *      away), and --bt-hud-top, where the quest card starts, just under the
 *      top bar;
 *   3. (v2.3.4113) the other states on the plate (staged, __btPlaceHold):
 *      "No man's land 2" and "Outlaw · 18 min" in red; a tap on the plate
 *      opens the window with the gold and the bag count in plain words;
 *   4. (gone with the frame, v2.3.4163: the Bro button opens the Bro page)
 *   5. (upright) a real 1.5 s hold on the place name opens the Test panel,
 *      and a short tap does not;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/topbarplace-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEWS = [
  { id: 'upright', viewport: { width: 390, height: 844 }, touch: true },
  { id: 'sideways', viewport: { width: 844, height: 390 }, touch: true },
  { id: 'computer', viewport: { width: 1440, height: 900 }, touch: false, wide: true },
];

const look = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
  const S = window._gameState && window._gameState.current;
  /* v2.3.4113: the chip left the bar for the minimap's plate; `chip` is now
     what the plate says and its tap (NmlBadge.jsx PlateTap) */
  const tap = document.querySelector('[data-plate-tap]');
  const pl = window.__btMinimap && window.__btMinimap.plate;
  const tt = document.querySelector('[data-zone-title]');
  const pf = window.__btPlayerFrame ? window.__btPlayerFrame() : null;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:var(--bt-hud-top);left:0;width:1px;height:1px;pointer-events:none';
  document.body.appendChild(probe);
  const hudTop = Math.round(probe.getBoundingClientRect().top);
  probe.remove();
  return {
    zone: S && S.currentZone,
    title: (document.querySelector('[data-zone-title]') || {}).textContent || null,
    titleBox: r(document.querySelector('[data-zone-title]')),
    tod: !!document.querySelector('.bt-zone-header__tod'),
    chip: pl ? { kind: tap ? tap.getAttribute('data-plate-tap') : 'safe', words: pl.sub, red: !!pl.red, box: r(tap), nml: tap ? tap.getAttribute('data-nml-badge') : null } : null,
    inBar: document.querySelectorAll('.bt-zone-header [data-nml-badge], .bt-zone-header [data-place-chip], .bt-zone-header .bt-nml-pill').length,
    titleClear: !!tt && /rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(tt).color),
    header: r(document.querySelector('.bt-zone-header')),
    frame: r(document.querySelector('[data-player-frame]')),
    /* v2.3.4093: no picture in the frame; the level badge left of the bars, level with them */
    framePics: document.querySelectorAll('[data-player-frame] img, [data-player-frame] canvas').length,
    lvBox: r(document.querySelector('[data-player-frame] [data-pf-lv]')),
    barsBox: r(document.querySelector('[data-player-frame] .bt-pf__bars')),
    view: pf && pf.view,
    rpg: S && S.rpg ? { lv: S.rpg.level, hp: Math.round(S.rpg.hp), maxHp: Math.round(S.rpg.maxHp), en: Math.round(S.rpg.stamina), maxEn: Math.round(S.rpg.maxStamina), coins: S.rpg.coins } : null,
    mini: window.__btWheelMini ? { l: Math.round(window.__btWheelMini.left), t: Math.round(window.__btWheelMini.top) } : null,
    hudTop, vw: innerWidth, vh: innerHeight,
  };
});
const dash = (P) => P.page.evaluate(() => { const b = window.__broDashPanelBus; return b ? { mode: b.state.mode, root: b.state.stack[0] || null } : null; });
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  for (const V of VIEWS) {
    const T = `[${V.id}] `;
    const P = await H.newPlayer(browser, { name: 'Placer' + V.id.slice(0, 2), wsPort, webPort, viewport: V.viewport, touch: V.touch, wide: !!V.wide, world: 'wheel' });
    P.page.on('pageerror', (e) => errors.push(V.id + ': ' + String(e && e.message || e).slice(0, 200)));
    const shot = (name) => P.page.screenshot({ path: join(OUT, `topbarplace-${V.id}-${name}.png`) }).catch(() => {});
    await H.enterWorld(P);
    await P.page.waitForTimeout(1500);
    await H.pastWelcome(P);

    /* ── 1. the place and its safety ── */
    let a = null;
    for (let i = 0; i < 30; i++) { a = await look(P); if (a.chip) break; await P.page.waitForTimeout(300); }
    await shot('safe');
    rec.ok(T + `1: in the world ("${a && a.title}" kept in the page, drawn clear), nothing of the place or its safety in the top bar; the minimap's plate says "${a && a.chip && a.chip.words}"`,
      !!a && a.zone === 'wheel' && a.title === 'BroTown' && a.titleClear && a.inBar === 0 && !!a.chip && a.chip.kind === 'safe'
        && /^safe/.test(a.chip.words || '') && !a.chip.red && !a.tod, a);

    /* ── 2. (v2.3.4163) no player frame; the quest card's line under the bar ── */
    rec.ok(T + `2: no player frame on the game screen (v2.3.4163: the owner, "No remove them from the game screen"), and the quest card's line (--bt-hud-top ${a && a.hudTop}) just under the top bar (${a && a.header && a.header.b})`,
      !!a && !a.frame && !a.view && !!a.header && a.hudTop >= a.header.b && a.hudTop - a.header.b <= 16, a);

    /* ── 3. the other states, staged ── */
    await P.page.evaluate(() => { window.__btPlaceHold = { nml: 2, red: 0 }; });
    let b = null;
    for (let i = 0; i < 12; i++) { await P.page.waitForTimeout(250); b = await look(P); if (b.chip && b.chip.kind === 'pvp') break; }
    const lv = (b && b.rpg && b.rpg.lv) || 1;
    const lo = Math.max(1, lv - 2), hi = lv + 2;
    await shot('pvp');
    rec.ok(T + `3: in No man's land 2 the plate says "${b && b.chip && b.chip.words}" in red and takes the tap; still nothing in the bar`,
      !!b && !!b.chip && b.chip.kind === 'pvp' && b.chip.nml === '2' && b.chip.words === "No man's land 2" && b.chip.red && !!b.chip.box && b.inBar === 0, b);
    await P.page.evaluate(() => { const c = document.querySelector('[data-plate-tap]'); if (c) c.click(); });
    let w = null;
    for (let i = 0; i < 12; i++) {
      await P.page.waitForTimeout(250);
      w = await P.page.evaluate(() => {
        const l = document.querySelector('[data-place-lead]'), k = document.querySelector('[data-place-risk]');
        return l ? { lead: l.textContent, risk: k ? k.textContent : null, esc: !!document.querySelector('[data-esc]') } : null;
      });
      if (w) break;
    }
    await shot('window');
    const coins = (b && b.rpg && b.rpg.coins) || 0;
    rec.ok(T + `3: a tap opens the window in plain words: "${w && w.lead}" / "${w && w.risk}"`,
      !!w && w.esc && new RegExp(`Players Lv ${lo}–${hi} can attack you here`).test(w.lead)
        && /keep what you.re wearing/.test(w.risk || '') && /Bank in BroTown/.test(w.risk || '')
        && (coins > 0 ? (w.risk || '').indexOf(Number(coins).toLocaleString('en-US') + ' gold') >= 0 : true), w);
    await P.page.evaluate(() => { if (window.__btInfoPopup) window.__btInfoPopup.close(); window.__btPlaceHold = { nml: 2, red: 18 }; });
    let c = null;
    for (let i = 0; i < 12; i++) { await P.page.waitForTimeout(250); c = await look(P); if (c.chip && c.chip.kind === 'outlaw') break; }
    await shot('outlaw');
    rec.ok(T + `3: with the red skull the plate says "${c && c.chip && c.chip.words}"`, !!c && !!c.chip && c.chip.kind === 'outlaw' && c.chip.words === 'Outlaw \u00b7 18 min' && c.chip.red && c.inBar === 0, c);
    await P.page.evaluate(() => { window.__btPlaceHold = null; });
    await P.page.waitForTimeout(500);

    /* ── 5. the place name still opens the Test panel on a hold ── */
    if (V.id === 'upright') {
      await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* */ } });
      await P.page.waitForTimeout(600);
      const t = (await look(P)).titleBox;
      const at = { x: Math.round((t.l + t.r) / 2), y: Math.round((t.t + t.b) / 2) };
      /* what a finger there reaches (v2.3.4113: the name is drawn clear, and
         must still take the hold) */
      const under = await P.page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? (e.className || e.tagName) + (e.hasAttribute && e.hasAttribute('data-zone-title') ? ' [title]' : '') : null; }, at);
      /* a real finger (hit-tested: TRAPS section 67), as on the owner's iPhone */
      const cdp = await P.ctx.newCDPSession(P.page);
      const press = async (ms) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y, id: 7 }] });
        await P.page.waitForTimeout(ms);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      };
      await press(200);
      await P.page.waitForTimeout(1600);
      const shortTap = await panelUp(P);
      await press(1500);
      let up = false;
      for (let i = 0; i < 40 && !up; i++) { up = await panelUp(P); if (!up) await P.page.waitForTimeout(250); }
      await shot('test-panel');
      rec.ok(T + '5: a short tap on the place name does nothing; a 1.5 s hold opens the Test panel', !shortTap && up, { shortTap, up, at, t, under });
    }
    await P.ctx.close().catch(() => {});
  }
  rec.ok(`6: no page errors (${errors.length})`, errors.length === 0, errors);
}
