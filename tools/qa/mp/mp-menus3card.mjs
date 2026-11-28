/* ═══ v2.3.6871: THE ONE CARD, PLAYED BY TWO (card MN step 3) ═══
 *
 * The owner's "one compact card with at most 2 buttons" (SPEC.md section 5;
 * src/game/menus3Card.js, src/ui/menus3/Menus3Card.jsx): under `?menus3`
 * the plain invites are the one Card, each answer today's own send.
 *
 *   1. UPRIGHT (two phones, 390 x 844, touch; new characters): A invites B
 *      from the Roster's row; B gets the Card (kind party.invite, today's
 *      words "Party Invite", "<A> invites you"), in the middle of the screen,
 *      at most 330 wide, its two answers on one row (Decline left, Join
 *      right), each 44 x 44 or more; the dim is inert (a tap on it answers
 *      nothing); Join makes a party of two and the Card goes.  A challenges
 *      B to a duel (no wager): the Card (duel.invite, "Duel Challenge", the
 *      no-wager rules); Decline: the Card goes, no duel;
 *   2. SIDEWAYS (B turned to 844 x 390): a second challenge's Card fits the
 *      screen, its answers 44+; Decline;
 *   3. A COMPUTER (1280 x 800, `wide: true`): A's challenge -- Esc presses
 *      Decline; A's party invite -- Enter presses Join (a party of three).
 *
 * Pictures (deviceScaleFactor 1): tools/qa/out/menus3card-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
/* the Card as drawn: its kind, words, answers in order with their boxes, and the screen */
const card = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-menus3-card]');
  if (!el) return null;
  const c = el.querySelector('.m3-card');
  const r = c.getBoundingClientRect();
  const t = el.querySelector('[data-menus3-card-title]');
  const ans = Array.from(el.querySelectorAll('[data-menus3-card-answer]')).map((b) => { const q = b.getBoundingClientRect(); return { id: b.getAttribute('data-menus3-card-answer'), t: b.textContent.trim(), x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) }; });
  return { kind: el.getAttribute('data-menus3-card'), title: t ? t.textContent : '', text: c.textContent, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight, ans };
});
const centred = (c) => !!c && Math.abs((c.x + c.w / 2) - c.vw / 2) <= 3 && Math.abs((c.y + c.h / 2) - c.vh / 2) <= 3 && c.x >= 0 && c.y >= 0 && c.x + c.w <= c.vw && c.y + c.h <= c.vh;
const twoInRow = (c) => !!c && c.ans.length === 2 && c.ans[0].id === 'no' && c.ans[1].id === 'yes' && c.ans[0].y === c.ans[1].y && c.ans[0].x < c.ans[1].x && c.ans.every((a) => a.w >= 44 && a.h >= 44);

async function tap(P, sel, touch) {
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(700);
  return true;
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3card-' + name + '.png') }); } catch (e) { /* a picture only */ }
}
async function ready(P) {
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__btMenus3.on()), null, { timeout: 30000 }).catch(() => {});
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
  await P.page.waitForTimeout(1500);
}
const myId = (P) => H.readState(P, (S) => S.myId);
/* the sender's request, as its own button sends it (the frame as mp-menus3roster sends one) */
const sendAs = (P, event, payload) => P.page.evaluate(([ev, pl]) => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'broadcast', event: ev, payload: pl }); }, [event, payload]);
const waitCard = (P, kind) => P.page.waitForFunction((k) => { const el = document.querySelector('[data-menus3-card]'); return !!el && el.getAttribute('data-menus3-card') === k; }, kind, { timeout: 15000 }).then(() => true).catch(() => false);
const gone = (P) => P.page.waitForFunction(() => !document.querySelector('[data-menus3-card]'), null, { timeout: 8000 }).then(() => true).catch(() => false);
const partyOf = (P) => H.readState(P, (S) => (S._party && S._party.state === 'open' ? S._party.members.length : 0));

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright, two phones ── */
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Carda', nameB: 'Cardb', world: 'wheel', touch: true, viewport: { width: 390, height: 844 }, query: 'menus3=1' });
  try {
    await ready(A); await ready(B);
    const aId = await myId(A);
    const bId = await myId(B);
    /* A's Invite, from the Roster's row */
    await tap(A, '[data-menus3-dock="people"]', true);
    await A.page.waitForFunction((id) => !!document.querySelector(`[data-m3-near="${id}"] [data-m3-row-act="invite"]`), bId, { timeout: 30000 }).catch(() => {});
    await tap(A, `[data-m3-near="${bId}"] [data-m3-row-act="invite"]`, true);
    await tap(A, '[data-menus3-x]', true);
    let got = await waitCard(B, 'party.invite');
    let c = await card(B);
    rec.ok('upright: the invite is the one Card, in today\'s words', got && !!c && c.title === 'Party Invite' && /Carda invites you/.test(c.text), c);
    rec.ok('upright: the Card in the middle of the screen, at most 330 wide', centred(c) && c.w <= 330, c);
    rec.ok('upright: its two answers on one row, Decline then Join, each 44+', twoInRow(c) && c.ans[0].t === 'Decline' && c.ans[1].t === 'Join', c && c.ans);
    rec.ok('upright: today\'s hook still finds it (data-party-invite)', !!(await box(B, '[data-party-invite] .m3-card')), null);
    await shot(B, 'upright-invite');
    /* the dim is inert: a tap near the top of the screen answers nothing */
    await B.page.touchscreen.tap(20, 60);
    await B.page.waitForTimeout(700);
    rec.ok('upright: a tap on the dim answers nothing', !!(await card(B)) && (await partyOf(A)) === 0, null);
    await tap(B, '[data-menus3-card-answer="yes"]', true);
    const pa = await H.waitFor(A, (S) => (S._party && S._party.state === 'open' ? S._party.members.length : 0), (n) => n === 2, { timeout: 15000, label: 'a party of two' }).catch(() => null);
    rec.ok('upright: Join sends today\'s accept: a party of two, the Card gone', pa === 2 && (await gone(B)), { pa });

    /* a duel challenge, no wager: Decline */
    await sendAs(A, 'duel_request', { target: bId, from: aId, fromName: 'Carda' });
    got = await waitCard(B, 'duel.invite');
    c = await card(B);
    rec.ok('upright: a challenge without a wager is the Card: "Duel Challenge", the no-wager rules, Decline / Accept', got && !!c && c.title === 'Duel Challenge' && /Carda challenges you!/.test(c.text) && /No wager/.test(c.text) && twoInRow(c) && c.ans[1].t === 'Accept', c);
    await shot(B, 'upright-duel');
    await tap(B, '[data-menus3-card-answer="no"]', true);
    const dq = await H.readState(B, (S) => !!S._duelPending || !!S._inDuel);
    rec.ok('upright: Decline: the Card goes, no duel', (await gone(B)) && !dq, { dq });

    /* ── 2. sideways ── */
    await B.page.setViewportSize({ width: 844, height: 390 });
    await B.page.waitForTimeout(1500);
    await sendAs(A, 'duel_request', { target: bId, from: aId, fromName: 'Carda' });
    got = await waitCard(B, 'duel.invite');
    c = await card(B);
    rec.ok('sideways: the Card fits the screen, in the middle, its answers 44+ on one row', got && centred(c) && twoInRow(c), c);
    await shot(B, 'sideways-duel');
    await tap(B, '[data-menus3-card-answer="no"]', true);
    rec.ok('sideways: Decline: the Card goes', await gone(B), null);
    await B.page.context().close().catch(() => {});

    /* ── 3. a computer ── */
    const D = await H.newPlayer(browser, { name: 'Carddesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
    try {
      await H.enterWorld(D);
      await ready(D);
      await H.waitMutualSight(A, D).catch(() => null);
      const dId = await myId(D);
      await sendAs(A, 'duel_request', { target: dId, from: aId, fromName: 'Carda' });
      got = await waitCard(D, 'duel.invite');
      c = await card(D);
      rec.ok('computer: the challenge is the Card, in the middle, 44+', got && centred(c) && twoInRow(c), c);
      await shot(D, 'computer-duel');
      await D.page.keyboard.press('Escape');
      rec.ok('computer: Esc presses Decline: the Card goes', await gone(D), null);
      await sendAs(A, 'party_invite', { target: dId });
      got = await waitCard(D, 'party.invite');
      rec.ok('computer: the party invite is the Card', got, null);
      await D.page.keyboard.press('Enter');
      const p3 = await H.waitFor(A, (S) => (S._party && S._party.state === 'open' ? S._party.members.length : 0), (n) => n === 2 || n === 3, { timeout: 15000, label: 'the computer joined' }).catch(() => null);
      const dIn = await H.readState(D, (S) => !!(S._party && S._party.state === 'open'));
      rec.ok('computer: Enter presses Join: the computer is in the party, the Card gone', dIn && (await gone(D)), { p3, dIn });
    } finally { await D.page.context().close().catch(() => {}); }
  } finally {
    await B.page.context().close().catch(() => {});
    await A.page.context().close().catch(() => {});
  }
}
