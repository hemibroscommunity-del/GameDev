/* ═══ EACH DROP A LINE OF WORDS, RISING OVER THE MONSTER, ON A PHONE (v2.3.3627) ═══
 *
 * The owner, 2026-10-27: "instead of the two column icon, quantity, rarity,
 * when item drops, I think I just want the name of the item to float upwards
 * with quantity in parenthesis and the color of the font indicating rarity.
 * So normal would just be white. So coins (5) rising and disappearing in
 * white, slime remains (1) rising beneath that message then disappearing in
 * white (as a example)"
 *
 * v2.3.3692: "Coins x5" and each line's picture before it (the owner: "maybe
 * the icon first then the name then the quantity in the message popup").
 *
 * A real player in the world, a real worker, real kills at Frost Ridge's first
 * snowmen (the test lever /dev/killroll: `next` the kill's roll, `kill`
 * through the path every kill takes -- mp-killroll's way):
 *   1. a kill that drops gold and remains: "Coins (n)" over "Snowman Remains
 *      (1)", both white, n the gold the worker put on the pile for you; the
 *      second line under the first and coming in a little after it; at a
 *      message's size (effectsRenderer MSG_FONT_PX at the popups' zoom); and
 *      the dice roll is not drawn over it (it is on the codex);
 *   2. a kill on the Frost Shard's numbers: three lines, "Frost Shard (1)" in
 *      green;
 *   3. on the nugget's number: "Gold Nugget (1)" in orange (the nugget is on
 *      no pile: the killing blow's own);
 *   4. the lines rise and go: higher after a moment, gone after their life;
 *   5. a kill off your screen shows its lines over you;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/droplines-*.png. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WHITE = '#FFFFFF';

/* the page's clock held still for a picture (mp-killroll's snap) */
const snap = async (P, path) => {
  await P.page.evaluate(() => { if (!window.__qaRealNow) { const t = Date.now(); window.__qaRealNow = Date.now; Date.now = () => t; } });
  try { await P.page.screenshot({ path }); }
  finally { await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } }); }
};
const drawn = (P) => P.page.evaluate(() => (window.__btDropLines ? window.__btDropLines() : null));
/* the group for a monster, once it has `n` lines and the last of them is in */
async function waitGroup(P, monsterId, n, ms = 8000) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    const d = await drawn(P);
    const g = d && d.find((x) => x.monsterId === monsterId && x.lines.length >= n && x.lines[x.lines.length - 1].alpha > 0.5);
    if (g) return g;
    await P.page.waitForTimeout(60);
  }
  const d = await drawn(P);
  return (d && d.find((x) => x.monsterId === monsterId)) || null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Dropbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);

    await H.devOp(wsPort, 'vitals', me, { god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    await H.waitFor(P, (S) => !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1), (v) => v, { timeout: 8000, label: 'the quests done' }).catch(() => null);
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
    await P.page.waitForTimeout(1500);
    const near = () => P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      return (S.monsters || []).filter((m) => m && m.alive !== false && m.home === 'frost' && !m.tier)
        .map((m) => ({ id: m.id, x: Math.round(m.x), y: Math.round(m.y), top: m._popupTopOff != null ? m._popupTopOff : null, d: Math.round(Math.hypot(m.x - p.x, m.y - p.y)) }))
        .sort((a, b) => a.d - b.d);
    });
    const close = await near();
    rec.ok(`at Frost Ridge's first snowmen (${close.length} in sight)`, close.length >= 3, close.slice(0, 4));
    if (close.length < 3) return;
    const used = new Set();
    const nextNear = async () => {
      const m = (await near()).filter((q) => !used.has(q.id))[0];
      if (!m) return null;
      used.add(m.id);
      await H.hopTo(P, m.x, m.y + 200, { tries: 30 });
      await P.page.waitForTimeout(400);
      return m;
    };

    /* ── 1 ── gold and remains */
    const m1 = await nextNear();
    const mFirst = await P.page.evaluate((id) => {
      const m = (window._gameState.current.monsters || []).find((q) => q && q.id === id);
      return m ? { y: m.y, top: m._popupTopOff != null ? m._popupTopOff : null } : null;
    }, m1.id);
    /* v2.3.3692: the moment every line of this kill shows its picture, kept
       by the page itself every frame from before the kill -- the lines live
       ~2.4 s, and a screenshot on this box takes about as long */
    await P.page.evaluate((mid) => {
      const w = { lines: null, at: null, t0: performance.now() };
      window.__dlPics = w;
      const tick = () => {
        if (window.__dlPics !== w || w.lines) return;
        const d = window.__btDropLines ? window.__btDropLines() : null;
        const g = d && d.find((x) => x.monsterId === mid);
        if (g && g.lines.length >= 2 && g.lines.every((l) => l.iconShown)) { w.lines = g.lines; w.at = Math.round(performance.now() - w.t0); return; }
        if (performance.now() - w.t0 < 10000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, m1.id);
    await H.devOp(wsPort, 'killroll', me, { next: 7431, kill: m1.id });
    const early = await (async () => {   /* the first look: the second line not in yet */
      for (const t0 = Date.now(); Date.now() - t0 < 6000;) {
        const d = await drawn(P);
        const g = d && d.find((x) => x.monsterId === m1.id && x.lines.length >= 2);
        if (g) return g;
        await P.page.waitForTimeout(15);
      }
      return null;
    })();
    const g1 = await waitGroup(P, m1.id, 2);
    await snap(P, join(OUT, 'droplines-1-coins-remains.png'));
    const pile1 = await H.readState(P, (S) => {
      const l = (S.groundLoot || []).filter((x) => x && typeof x.lootId === 'string' && x.lootId.indexOf('mk-') === 0).pop();
      return l ? { coins: l.coins, skull: l.skull } : null;
    });
    const L1 = g1 ? g1.lines : [];
    rec.ok(`1. "${L1[0] && L1[0].text}" over "${L1[1] && L1[1].text}", both white (the pile's gold for you: ${pile1 && pile1.coins})`,
      L1.length === 2 && !!pile1 && L1[0].text === 'Coins x' + pile1.coins && Number(pile1.coins) > 0
        && L1[1].text === 'Snowman Remains x1' && L1.every((l) => l.color === WHITE), { g1, pile1 });
    /* v2.3.3692: "maybe the icon first then the name then the quantity" --
       each line's picture shown before its words (decoded within the line's
       life; its room kept until then), as tall as the words */
    const pics = await (async () => {
      for (const t0 = Date.now(); Date.now() - t0 < 4000;) {
        const w = await P.page.evaluate(() => (window.__dlPics ? { lines: window.__dlPics.lines, at: window.__dlPics.at } : null));
        if (w && w.lines) return w.lines;
        await P.page.waitForTimeout(100);
      }
      return null;
    })();
    rec.ok(`1. ...each with its picture first: the coin, then the snowman's remains (${pics ? pics.map((l) => (l.icon || '').split('/').pop().split('?')[0]).join(', ') : 'none'})`,
      !!pics && pics.length === 2 && pics.every((l) => l.iconShown && l.iconRight <= l.textLeft + 0.5 && l.iconPx >= l.fontPx * 0.9)
        && /cur-gold\.webp/.test(pics[0].icon || '') && /remnants-snowman\.webp/.test(pics[1].icon || ''), pics);
    rec.ok('1. ...the second line under the first, coming in a little after it',
      L1.length === 2 && L1[1].y > L1[0].y + 10 && !!early && early.lines[1].alpha <= early.lines[0].alpha, { lines: L1, early: early && early.lines });
    const font = await P.page.evaluate(() => {
      const S = window._gameState.current, M = window.__btMsgFont;
      const w = S._worldScaleX;
      const Z = M && M.world ? 1 : Math.min(3, Math.max(0.25, (M ? M.zoom : 0.606) / w));
      return M ? { msgPx: M.px, Z: Math.round(Z * 1000) / 1000, want: Math.round(M.px * Z * 10) / 10 } : null;
    });
    rec.ok(`1. ...at a message's size (${L1[0] && L1[0].fontPx} world px; a message is ${font && font.want})`,
      !!font && L1.length === 2 && L1.every((l) => Math.abs(l.fontPx - font.want) < 0.6), { font, lines: L1 });
    const startY = mFirst ? mFirst.y + (mFirst.top != null ? mFirst.top : -120) * 0.5 : null;
    rec.ok(`1. ...starting on the snowman's body, under where the killing blow's number starts (${early && early.lines[0].y} at ${startY})`,
      !!early && startY != null && Math.abs(early.lines[0].y - startY) < 40, { early, startY, mFirst });
    const rolled = await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const r = (window.__btKillRolls || []).find((x) => x.monsterId === id);
      return { logged: !!r, shown: r ? r.shown : null, popup: (S.dmgNumbers || []).some((d) => d && d.roll) };
    }, m1.id);
    rec.ok('1. ...and the dice roll is not drawn over it (the roll still counted, for the codex)',
      rolled.logged && rolled.shown === false && rolled.popup === false, rolled);

    /* ── 2 ── the shard */
    const m2 = await nextNear();
    await H.devOp(wsPort, 'killroll', me, { next: 640, kill: m2.id });
    const g2 = await waitGroup(P, m2.id, 3);
    /* ── 4 ── they rise (measured BEFORE the picture: a picture holds the
       page's clock still for ~3 s on this box, and lets it go all at once) */
    const y0 = g2 ? g2.y : null;
    await P.page.waitForTimeout(600);
    const later = (await drawn(P) || []).find((x) => x.monsterId === m2.id);
    await snap(P, join(OUT, 'droplines-2-shard.png'));
    const sh = g2 && g2.lines.find((l) => l.id === 'shard');
    rec.ok(`2. on the Frost Shard's numbers: ${g2 && g2.lines.length} lines, "${sh && sh.text}" in ${sh && sh.color}`,
      !!g2 && g2.lines.map((l) => l.id).join() === 'gold,remnant,shard' && !!sh && sh.text === 'Frost Shard x1' && sh.color === '#7EE0A8' && /shard_frost\.webp/.test(sh.icon || ''), g2);
    rec.ok(`4. the lines rise (${y0} -> ${later && later.y})`, !!later && later.y < y0, { y0, later });
    await P.page.waitForTimeout(2800);
    const gone = (await drawn(P) || []).find((x) => x.monsterId === m2.id);
    rec.ok('4. ...and are gone after their life', !gone, gone);

    /* ── 3 ── the nugget, the killing blow's own */
    const m3 = await nextNear();
    if (m3) {
      await H.devOp(wsPort, 'killroll', me, { next: 1, kill: m3.id });
      const g3 = await waitGroup(P, m3.id, 3);
      const nug = g3 && g3.lines.find((l) => l.id === 'nugget');
      rec.ok(`3. on the nugget's number: "${nug && nug.text}" in ${nug && nug.color}`, !!nug && nug.text === 'Gold Nugget x1' && nug.color === '#FFB25A' && /cur-nugget\.webp/.test(nug.icon || ''), g3);
      await snap(P, join(OUT, 'droplines-3-nugget.png'));
    } else rec.ok('3. a third snowman for the nugget (guard)', false);

    /* ── 5 ── a kill off your screen: over you */
    const far = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x && x.home === 'tidal' && x.alive !== false);
      return m ? m.id : 'wm-tidal-0';
    });
    const k5 = await H.devOp(wsPort, 'killroll', me, { next: 7431, kill: far }).catch(() => null);
    let over = null;
    for (const t0 = Date.now(); Date.now() - t0 < 6000;) {
      over = await P.page.evaluate((id) => (window.__btDropLineLog || []).find((x) => x.monsterId === id) || null, far);
      if (over) break;
      await P.page.waitForTimeout(100);
    }
    rec.ok(`5. a kill off your screen (${far}) shows its lines over you (${over && over.over})`, !!k5 && !!over && over.over === 'you', { k5, over });

    rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
