/* ═══ THE PARTY STRIP FOLDS TO A CHIP (v2.3.3768) ═══
 *
 * The owner, 2026-10-28: "Also is partying unobtrusive right now? Just wanting
 * to make sure the screen isn't cluttered with party stuff".  The roster strip
 * stood open over the world the whole time you were in a party; now it is a
 * chip (PartyHUD.jsx, game/partyChip.js).  Three real browsers in the world,
 * one party: the leader on an upright phone (390 x 844), a friend on a
 * computer (1280 x 800, the wide layout players get), a friend on a phone.
 *   1. folded by default: the chip, "3/3"-style count, a pip a friend, no rows;
 *      small (32 px tall), under the top-left readouts, clear of the thumb
 *      controls;
 *   2. a tap opens the list (the rows, the ✖), a tap on its head folds it,
 *      and the device remembers the choice;
 *   3. a friend drops under a quarter of their health: the list opens by
 *      itself, then folds again;
 *   4. the leader's kick is two taps: the first says "Kick?" and kicks nobody;
 *   5. sideways (844 x 390): the chip small and clear; the computer: the chip
 *      in the world's corner, a click opens it;
 *   6. no page errors.
 * Pictures for the owner: tools/qa/mp/out/partychip-*.png.  With
 * BT_PARTYCHIP_SHOTS=before only the pictures are taken (of a build from
 * before this change), named partychip-before-*.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const SIDE = { width: 844, height: 390 };
const WIDE = { width: 1280, height: 800 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const BEFORE = process.env.BT_PARTYCHIP_SHOTS === 'before';
const TAG = BEFORE ? 'before' : 'after';
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `partychip-${TAG}-${name}.png`) }); } catch (e) { /* a picture only */ } };

/* the HUD as drawn */
const hud = (P) => P.page.evaluate(() => {
  const chip = document.querySelector('[data-party-chip]');
  const r = chip ? chip.getBoundingClientRect() : null;
  const S = window._gameState && window._gameState.current;
  /* the thumb controls and the readouts above the chip, where they are drawn */
  const boxes = (sel) => [...document.querySelectorAll(sel)].map((n) => n.getBoundingClientRect()).filter((b) => b.width > 0 && b.height > 0)
    .map((b) => ({ l: b.left, r: b.right, t: b.top, b: b.bottom }));
  return {
    state: chip ? chip.getAttribute('data-party-chip') : null,
    why: chip ? chip.getAttribute('data-party-open') : null,
    box: r ? { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) } : null,
    text: chip ? chip.textContent.replace(/\s+/g, ' ').trim() : null,
    rows: document.querySelectorAll('[data-party-row]').length,
    pips: [...document.querySelectorAll('[data-party-pip]')].map((p) => p.getAttribute('data-party-pip')),
    kick: [...document.querySelectorAll('[data-party-kick]')].map((k) => ({ armed: k.getAttribute('data-party-kick'), text: k.textContent.trim() })),
    leave: !!document.querySelector('[data-party-leave]'),
    stored: (() => { try { return localStorage.getItem('bt_party_list'); } catch (e) { return 'err'; } })(),
    n: S && S._party && S._party.members ? S._party.members.length : 0,
    thumbs: boxes('[data-joyzone] .bt-rjoy-base, .bt-ljoy-base, .bt-rjoy-base, [data-ability], .bt-touch-btn, .bt-jump-btn'),
    tops: boxes('.bt-quest-tracker, .bt-status-effects, [data-status-effects]'),
  };
});
const overlaps = (a, list) => !!a && list.some((z) => a.l < z.r && a.r > z.l && a.t < z.b && a.b > z.t);
const tapAt = async (P, sel) => {
  const c = await P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  if (!c) return false;
  if (P.touch) await P.page.touchscreen.tap(c.x, c.y); else await P.page.mouse.click(c.x, c.y);
  await P.page.waitForTimeout(450);
  return true;
};

async function into(browser, wsPort, webPort, name, opts) {
  const P = await H.newPlayer(browser, Object.assign({ name, wsPort, webPort, world: 'wheel' }, opts));
  P.touch = !!opts.touch;
  P.errors = [];
  P.page.on('pageerror', (e) => P.errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 150000, label: name + ' into the world' }).catch(() => null);
  await H.closeNpcDialogue(P).catch(() => {});
  /* the first-time coach cards stand over the top left in a new character's
     first minutes (before and after alike): put away for the pictures */
  await P.page.addStyleTag({ content: '*:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  return P;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await into(browser, wsPort, webPort, 'Chipleader', { viewport: PHONE, touch: true });
  const B = await into(browser, wsPort, webPort, 'Chipdesk', { viewport: WIDE, wide: true });
  const C = await into(browser, wsPort, webPort, 'Chipfriend', { viewport: { width: 360, height: 740 }, touch: true });
  const stopA = H.keepAlive(A), stopB = H.keepAlive(B), stopC = H.keepAlive(C);
  try {
    const ids = {};
    for (const [k, P] of [['A', A], ['B', B], ['C', C]]) ids[k] = await H.readState(P, (S) => S.myId);
    /* the party, by the game's own messages (mp-party drives the invite card) */
    for (const k of ['B', 'C']) {
      await A.page.evaluate((t) => window._gameState.current.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: t } }), ids[k]);
      await (k === 'B' ? B : C).page.waitForTimeout(1500);
      await (k === 'B' ? B : C).page.evaluate((t) => window._gameState.current.channel.send({ type: 'broadcast', event: 'party_accept', payload: { target: t } }), ids.A);
      await A.page.waitForTimeout(1500);
    }
    const formed = await H.waitFor(A, (S) => (S._party && S._party.members ? S._party.members.length : 0), (n) => n === 3,
      { timeout: 20000, label: 'a party of three' }).catch(() => null);
    rec.ok(`a party of three: the leader on a phone, a friend on a computer, a friend on a phone (guard): ${formed}`, formed === 3, formed);
    if (formed !== 3) return;
    await A.page.evaluate(() => { window.__btProbe = true; });
    /* the joins opened the list by itself: let it fold */
    await A.page.waitForTimeout(5500);
    await B.page.waitForTimeout(500);
    await shot(A, 'upright');
    await A.page.setViewportSize(SIDE);
    await A.page.waitForTimeout(1200);
    await shot(A, 'sideways');
    await A.page.setViewportSize(PHONE);
    await A.page.waitForTimeout(1000);
    await shot(B, 'wide');
    if (BEFORE) { rec.ok('the pictures of the build before (no checks)', true); return; }

    /* ── 1. folded by default ── */
    const h1 = await hud(A);
    rec.ok(`1. folded by default: the chip "${h1.text}", ${h1.box && h1.box.h} px tall, a pip a friend (${h1.pips.join(', ')}), no rows`,
      h1.state === 'folded' && h1.rows === 0 && !h1.leave && h1.pips.length === 2 && /3\/\d+/.test(h1.text || '') && !!h1.box && h1.box.h <= 36 && h1.box.w <= 140, h1);
    rec.ok('1. ...under the top-left readouts and clear of every thumb control', !!h1.box && h1.box.t >= 80 && !overlaps(h1.box, h1.thumbs) && !overlaps(h1.box, h1.tops),
      { box: h1.box, thumbs: h1.thumbs.length, tops: h1.tops });
    const hB = await hud(B);
    rec.ok(`1. ...on the computer too: "${hB.text}"`, hB.state === 'folded' && hB.rows === 0 && hB.pips.length === 2, hB);

    /* ── 2. a tap opens it, a tap on its head folds it ── */
    await tapAt(A, '[data-party-chip="folded"]');
    const h2 = await hud(A);
    await shot(A, 'upright-open');
    rec.ok(`2. a tap opens the list: ${h2.rows} rows and the ✖, kept on the device (${h2.stored})`, h2.state === 'open' && h2.why === 'you' && h2.rows === 3 && h2.leave && h2.stored === 'open', h2);
    await A.page.waitForTimeout(5000);
    const h2b = await hud(A);
    rec.ok('2. ...and opened by you it stays open', h2b.state === 'open', h2b.state);
    await tapAt(A, '[data-party-fold]');
    const h2c = await hud(A);
    rec.ok('2. a tap on its head folds it, and the device forgets "open"', h2c.state === 'folded' && h2c.rows === 0 && h2c.stored === null, h2c);

    /* ── 3. a friend drops low: it opens by itself, then folds ── */
    /* held low, a second at a time, until the roster the worker echoes (every
       ~2 s) carries it: in the safe town health comes back between echoes */
    const read3 = () => A.page.evaluate((cid) => {
      const c = document.querySelector('[data-party-chip]');
      const S = window._gameState.current, m = S._party && S._party.members ? S._party.members.find((q) => q.id === cid) : null;
      return { state: c ? c.getAttribute('data-party-chip') : null, why: c ? c.getAttribute('data-party-open') : null, attn: window.__btPartyAttn || null,
        hp: m ? [m.hp, m.maxHp] : null };
    }, ids.C);
    let h3 = null;
    const seen3 = [];
    for (let i = 0; i < 14 && !h3; i++) {
      await H.devOp(wsPort, 'vitals', ids.C, { hp: 1 }).catch(() => {});
      await A.page.waitForTimeout(900);
      const v = await read3();
      seen3.push(v.hp);
      if (v.state === 'open') h3 = v;
    }
    await shot(A, 'upright-attention');
    rec.ok(`3. a friend under a quarter of their health: the list opens by itself (${JSON.stringify(h3)})`, !!h3 && h3.why === 'attention' && !!h3.attn && h3.attn.why === 'low', { h3, seen3 });
    const h3b = await H.waitFor(A, () => { const c = document.querySelector('[data-party-chip]'); return c ? c.getAttribute('data-party-chip') : null; },
      (v) => v === 'folded', { timeout: 9000, label: 'and folds again' }).catch(() => null);
    rec.ok('3. ...and folds again by itself', h3b === 'folded', h3b);
    await H.devOp(wsPort, 'vitals', ids.C, { heal: true }).catch(() => {});

    /* ── 4. the kick is two taps ── */
    await tapAt(A, '[data-party-chip="folded"]');
    const kickSel = `[data-party-row][data-party-id="${ids.C}"] button[title="Kick"]`;   /* the phone friend: the computer's checks come after */
    const nKick = (await hud(A)).kick.length;
    await tapAt(A, kickSel);
    const h4a = await hud(A);
    rec.ok(`4. the leader's first tap on a kick says "${(h4a.kick.find((k) => k.armed === 'armed') || {}).text}" and kicks nobody (${h4a.n} in the party)`,
      nKick === 2 && h4a.kick.some((k) => k.armed === 'armed' && k.text === 'Kick?') && h4a.n === 3, { nKick, h4a });
    await tapAt(A, '[data-party-kick="armed"]');
    const n4 = await H.waitFor(A, (S) => (S._party && S._party.members ? S._party.members.length : 0), (n) => n === 2,
      { timeout: 8000, label: 'the kick' }).catch(() => null);
    rec.ok('4. ...the second tap kicks', n4 === 2, n4);
    await tapAt(A, '[data-party-fold]');

    /* ── 5. sideways, and the computer ── */
    await A.page.setViewportSize(SIDE);
    await A.page.waitForTimeout(1200);
    const h5 = await hud(A);
    await shot(A, 'sideways-folded');
    rec.ok(`5. sideways (844 x 390): the chip ${h5.box && h5.box.w} x ${h5.box && h5.box.h}, clear of every thumb control`,
      h5.state === 'folded' && !!h5.box && h5.box.h <= 36 && h5.box.b <= SIDE.height * 0.4 && !overlaps(h5.box, h5.thumbs), h5);
    await tapAt(A, '[data-party-chip="folded"]');
    await shot(A, 'sideways-open');
    await tapAt(A, '[data-party-fold]');
    await A.page.setViewportSize(PHONE);
    const col = await B.page.evaluate(() => { const c = document.querySelector('canvas'); const r = c ? c.getBoundingClientRect() : null; return r ? { l: r.left, t: r.top, r: r.right } : null; });
    const hB5 = await hud(B);
    rec.ok(`5. the computer: the chip inside the world's corner (${JSON.stringify(hB5.box)})`, hB5.state === 'folded' && !!hB5.box && !!col && hB5.box.l >= col.l - 1 && hB5.box.r <= col.r, { box: hB5.box, col });
    await tapAt(B, '[data-party-chip="folded"]');
    const hB6 = await hud(B);
    await shot(B, 'wide-open');
    rec.ok('5. ...a click opens it', hB6.state === 'open' && hB6.rows >= 2, hB6);
    await tapAt(B, '[data-party-fold]');

    const errs = [].concat(A.errors, B.errors, C.errors);
    rec.ok('6. no page errors', errs.length === 0, errs.slice(0, 3));
  } finally {
    stopA(); stopB(); stopC();
    for (const P of [A, B, C]) await P.ctx.close().catch(() => {});
  }
}
