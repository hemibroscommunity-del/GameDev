/* ═══ v2.3.6870: PEOPLE · CHAT AND RANKS, PLAYED BY TWO (card MN step 11) ═══
 *
 * The owner's one chat box and the Ranks in the new panel
 * (docs/design/menus3/; the card's step "People · Chat and Ranks").
 *
 *   1. UPRIGHT (390 x 844, touch), two players (H.joinPair, both on the new
 *      menus): the chat lines' road (and the Chat tab) open the panel on
 *      Chat; its channels are the game's (All and News always, Area and
 *      Whispers where the worker carries them, no Party alone); a line sent
 *      from All reaches the other (the game's one sender); the other's log
 *      shows it, its name a door to the sender's Player page; that page's
 *      Message opens Chat on Whispers aimed at them, a whisper sent there
 *      reaches the first, and Back is the Player page; an Area line reaches
 *      the other; News is read only and opening it marks the game's lines
 *      seen; the smiley opens today's picker and the panel comes back on
 *      Chat when it shuts; a friendship (Add friend, Accept) brings the
 *      friend's thread under Whispers, a message there reaches the other's
 *      thread and lights their People button (its reason Chat); every
 *      tappable thing 44 x 44 or more; Ranks: the kinds' rail and a board's
 *      standings, a row opens a Player page;
 *   2. SIDEWAYS (844 x 390): Chat in the drawer, the composer in it, 44+;
 *   3. A COMPUTER (1280 x 800, `wide: true`): Chat in the drawer; a line
 *      typed and sent with Enter; Esc closes it.
 *
 * Measured from OUTSIDE the game (this test's evaluate).  Pictures
 * (deviceScaleFactor 1): tools/qa/out/menus3chat-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const attrs = (P, sel, a) => P.page.evaluate(([s, n]) => Array.from(document.querySelectorAll(s)).map((el) => el.getAttribute(n)), [sel, a]);
const small = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-menus3-panel] button, [data-menus3-panel] input')).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.w > 0 && (b.w < 44 || b.h < 44)));
const pstate = (P) => P.page.evaluate(() => { const s = window.__btMenus3.panelState(); const t = window.__btMenus3.top(); return { open: s.open, menu: s.menu, section: s.section, page: t ? t.page : null, rail: t ? t.rail : null, arg: t ? t.arg : null }; });
const chat = (P) => P.page.evaluate(() => window.__btMenus3Chat || null);
const myId = (P) => H.readState(P, (S) => S.myId);
const logHas = (P, text) => P.page.waitForFunction((t) => { const S = window._gameState && window._gameState.current; return !!(S && (S.chatLog || []).some((m) => m && m.text === t)); }, text, { timeout: 15000 }).then(() => true).catch(() => false);

async function tap(P, sel, touch) {
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(600);
  return true;
}
async function type(P, sel, text) {
  await P.page.fill(sel, text).catch(() => {});
  await P.page.waitForTimeout(200);
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3chat-' + name + '.png') }); } catch (e) { /* a picture only */ }
}
async function ready(P) {
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__btMenus3.on()), null, { timeout: 30000 }).catch(() => {});
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
  await P.page.waitForTimeout(1500);
}
async function openChat(P) {
  await P.page.evaluate(() => window.__btMenus3.go('hud.chatLines'));
  await P.page.waitForFunction(() => !!document.querySelector('[data-m3-chat]'), null, { timeout: 20000 }).catch(() => {});
  await P.page.waitForTimeout(400);
  return pstate(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright, two players ── */
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Chata', nameB: 'Chatb', world: 'wheel', touch: true, viewport: { width: 390, height: 844 }, query: 'menus3=1' });
  let aId = null;
  try {
    await ready(A); await ready(B);
    aId = await myId(A);
    const bId = await myId(B);
    let ps = await openChat(A);
    rec.ok('upright: the chat lines open the new panel on Chat', ps.open && ps.menu === 'people' && ps.section === 'chat' && ps.page === 'root', ps);
    let C = await chat(A);
    const caps = await H.readState(A, (S) => ({ area: !!(S._serverCaps && S._serverCaps.areaChat), whisper: !!(S._serverCaps && S._serverCaps.whisper), friends: !!(S._serverCaps && S._serverCaps.friends) }));
    const tabs = await attrs(A, '[data-m3-ctab]', 'data-m3-ctab');
    const want = ['all'].concat(caps.area ? ['area'] : [], caps.whisper || caps.friends ? ['whispers'] : [], ['news']);
    rec.ok('upright: its channels are the game\'s (' + want.join(', ') + '; no Party alone)', tabs.join() === want.join(), { tabs, caps });
    rec.ok('upright: the composer: the smiley, the box, Send', !!(await box(A, '[data-m3-emotes]')) && !!(await box(A, '[data-m3-cinput]')) && !!(await box(A, '[data-m3-csend]')), null);
    let sm = await small(A);
    rec.ok('upright: every tappable thing 44 x 44 or more', sm.length === 0, sm);
    /* a line from All, through the game's one sender */
    await type(A, '[data-m3-cinput]', 'hello from chata');
    await tap(A, '[data-m3-csend]', true);
    rec.ok('upright: a line sent from All reaches the other', await logHas(B, 'hello from chata'), null);
    rec.ok('upright: ...and is in the sender\'s own log', (await A.page.evaluate(() => Array.from(document.querySelectorAll('[data-m3-cline]')).some((el) => /hello from chata/.test(el.textContent)))), null);
    await shot(A, 'upright-all');
    /* the other's log: the name opens the Player page */
    await openChat(B);
    const door = await box(B, `[data-m3-cname="${aId}"]`);
    rec.ok('upright: the other\'s log draws the line, its name a door', !!door, null);
    if (door) {
      await tap(B, `[data-m3-cname="${aId}"]`, true);
      ps = await pstate(B);
      rec.ok('upright: the name opens the sender\'s Player page', ps.page === 'player' && ps.arg === aId, ps);
      if (caps.whisper && (await box(B, '[data-m3-pact="message"]'))) {
        await tap(B, '[data-m3-pact="message"]', true);
        await B.page.waitForFunction(() => !!document.querySelector('[data-m3-chat="whispers"]'), null, { timeout: 15000 }).catch(() => {});
        ps = await pstate(B);
        C = await chat(B);
        rec.ok('upright: Message opens Chat on Whispers aimed at them', ps.page === 'whisper' && !!C && C.tab === 'whispers' && C.to === 'Chata', { ps, C });
        await type(B, '[data-m3-cinput]', 'psst chata');
        await tap(B, '[data-m3-csend]', true);
        rec.ok('upright: the whisper reaches them', await logHas(A, 'psst chata'), null);
        await tap(B, '[data-menus3-back]', true);
        ps = await pstate(B);
        rec.ok('upright: Back is the Player page', ps.page === 'player' && ps.arg === aId, ps);
      } else rec.ok('LISTED upright: no whisper lane or no Message', true, caps);
    }
    /* Area */
    if (caps.area) {
      await tap(A, '[data-m3-ctab="area"]', true);
      await type(A, '[data-m3-cinput]', 'near you chatb');
      await tap(A, '[data-m3-csend]', true);
      rec.ok('upright: an Area line reaches the other', await logHas(B, 'near you chatb'), null);
    }
    /* News: read only, marks the game's lines seen */
    await A.page.evaluate(() => { const S = window._gameState.current; S.chatLog = (S.chatLog || []).concat([{ text: 'The test news line', color: '#EAC675', ts: Date.now() }]); });
    await tap(A, '[data-m3-ctab="news"]', true);
    C = await chat(A);
    rec.ok('upright: News is read only (no composer) and shows the game\'s lines', !!C && C.tab === 'news' && !(await box(A, '[data-m3-cinput]')) && (await A.page.evaluate(() => Array.from(document.querySelectorAll('[data-m3-cline="news"]')).some((el) => /The test news line/.test(el.textContent)))), C);
    rec.ok('upright: opening News marks it seen (no news unread)', !!C && C.news === 0, C);
    await shot(A, 'upright-news');
    /* the smiley: today's picker, the panel back when it shuts */
    await tap(A, '[data-m3-ctab="all"]', true);
    if (await box(A, '[data-m3-emotes]')) {
      await tap(A, '[data-m3-emotes]', true);
      const picker = !!(await box(A, '[data-emote-picker]'));
      ps = await pstate(A);
      rec.ok('upright: the smiley opens today\'s emote picker, the panel aside', picker && !ps.open, { picker, ps });
      await A.page.evaluate(() => { const d = document.querySelector('[data-emote-dismiss]'); if (d) d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
      await A.page.waitForTimeout(800);
      ps = await pstate(A);
      rec.ok('upright: the picker shut, the panel is back on Chat', ps.open && ps.section === 'chat', ps);
    } else rec.ok('LISTED upright: no emotes in this world', true, null);
    /* a friendship, its thread under Whispers */
    if (caps.friends && caps.whisper) {
      await A.page.evaluate((id) => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event: 'friend_request', payload: { target: id, name: 'Chatb' } }); }, bId).catch(() => {});
      await B.page.waitForTimeout(1500);
      await B.page.evaluate((id) => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event: 'friend_accept', payload: { from: id } }); }, aId).catch(() => {});
      await A.page.waitForTimeout(2500);
      await openChat(A);
      await tap(A, '[data-m3-ctab="whispers"]', true);
      await A.page.waitForFunction((id) => !!document.querySelector(`[data-m3-dm="${id}"]`), bId, { timeout: 15000 }).catch(() => {});
      const thread = await box(A, `[data-m3-dm="${bId}"]`);
      rec.ok('upright: the friend\'s thread is under Whispers', !!thread, null);
      if (thread) {
        await tap(A, `[data-m3-dm="${bId}"]`, true);
        ps = await pstate(A);
        rec.ok('upright: the thread is its own page', ps.page === 'dm' && ps.arg === bId, ps);
        await type(A, '[data-m3-dminput]', 'a friend message');
        await tap(A, '[data-m3-dmsend]', true);
        const got = await B.page.waitForFunction((id) => { const f = window.__broFriendsSrv; return !!(f && f.thread(id).some((m) => m.text === 'a friend message')); }, aId, { timeout: 15000 }).then(() => true).catch(() => false);
        rec.ok('upright: it reaches the friend\'s thread', got, null);
        await B.page.evaluate(() => { const x = document.querySelector('[data-menus3-x]'); if (x) x.click(); });
        await B.page.waitForTimeout(2500);
        const dot = await B.page.evaluate(() => { const d = document.querySelector('[data-menus3-dock="people"]'); return d ? d.getAttribute('data-menus3-dock-dot') : null; });
        rec.ok('upright: the friend\'s People button lights, its reason Chat', dot === 'chat', dot);
        await shot(B, 'upright-dot');
        await tap(A, '[data-menus3-back]', true);
        ps = await pstate(A);
        rec.ok('upright: the thread\'s Back is Whispers', ps.page === 'root' && ps.rail === 'whispers', ps);
      }
    } else rec.ok('LISTED upright: no friends lane', true, caps);
    /* Ranks */
    await tap(A, '[data-menus3-tab="ranks"]', true);
    await A.page.waitForFunction(() => !!document.querySelector('[data-m3-ranks]'), null, { timeout: 20000 }).catch(() => {});
    await A.page.waitForTimeout(2500);
    const groups = await attrs(A, '[data-m3-rgroup]', 'data-m3-rgroup');
    rec.ok('upright: Ranks: the kinds the game keeps', groups.length >= 1 && groups[0] === 'combat', groups);
    sm = await small(A);
    rec.ok('upright: Ranks\' tappable things 44 x 44 or more', sm.length === 0, sm);
    await shot(A, 'upright-ranks');
    const rowSel = '[data-menus3-panel] [data-rank-row]:not([data-rank-mine])';
    await A.page.waitForFunction((s) => !!document.querySelector(s), rowSel, { timeout: 15000 }).catch(() => {});
    if (await box(A, rowSel)) {
      await tap(A, rowSel, true);
      ps = await pstate(A);
      rec.ok('upright: a row opens that player\'s Player page', ps.page === 'player' && !!ps.arg, ps);
      await tap(A, '[data-menus3-back]', true);
      ps = await pstate(A);
      rec.ok('upright: Back is Ranks', ps.section === 'ranks' && ps.page === 'root', ps);
    } else rec.ok('LISTED upright: no other player on the first board yet', true, null);
  } catch (e) { rec.ok('upright: ran', false, String(e).slice(0, 200)); }

  /* ── 2. sideways ── */
  const S2 = await H.newPlayer(browser, { name: 'Chatside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    await H.enterWorld(S2);
    await ready(S2);
    const ps = await openChat(S2);
    const pb = await box(S2, '[data-menus3-panel]');
    rec.ok('sideways: Chat in the drawer, 40% wide on the right', ps.open && ps.section === 'chat' && !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, { ps, pb });
    const cb = await box(S2, '[data-m3-composer]');
    rec.ok('sideways: the composer inside the drawer', !!cb && !!pb && cb.y + cb.h <= pb.y + pb.h + 1 && cb.x >= pb.x - 1, { cb, pb });
    const sm = await small(S2);
    rec.ok('sideways: every tappable thing 44 x 44 or more', sm.length === 0, sm);
    await shot(S2, 'sideways-chat');
  } finally { await S2.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Chatdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    await H.enterWorld(D);
    await ready(D);
    let ps = await openChat(D);
    rec.ok('computer: Chat in the drawer', ps.open && ps.section === 'chat' && (await D.page.evaluate(() => window.__btMenus3.shape())) === 'drawer', ps);
    await D.page.click('[data-m3-cinput]').catch(() => {});
    await D.page.keyboard.type('typed on a computer');
    await D.page.keyboard.press('Enter');
    rec.ok('computer: Enter sends the line (it reaches another player)', await logHas(A, 'typed on a computer'), null);
    await shot(D, 'computer-chat');
    await D.page.evaluate(() => { const i = document.querySelector('[data-m3-cinput]'); if (i) i.blur(); });
    await D.page.keyboard.press('Escape');
    await D.page.waitForTimeout(600);
    ps = await pstate(D);
    rec.ok('computer: Esc closes it', !ps.open, ps);
  } finally { await D.page.context().close().catch(() => {}); }
  await B.page.context().close().catch(() => {});
  await A.page.context().close().catch(() => {});
}
