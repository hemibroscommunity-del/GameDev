/* ═══ v2.3.3430: TEST MODE, ON A PHONE ═══
 *
 * The owner's option 2 (docs/specs/test-mode.md, server/src/testmode.js): a
 * switch in the Test panel that turns the worker's honesty checks off for one
 * of the owner's own characters, with a TEST MODE tag on the top bar while it
 * is on.  server/test/test-mode.test.mjs proves every check it skips; this
 * proves the owner can reach it and sees it, on a phone, against the real
 * worker:
 *   1. the panel is opened by a real, hit-tested press on the zone title, the
 *      key entered, and its Test mode button turns it on -- the worker says so
 *      (/dev/state) and the top bar wears the tag within a beat; and it is
 *      stored: a reload comes back in test mode from the join alone (1b);
 *   2. the tag sits in the top bar beside the title -- never inside the title
 *      box (the zone banner reads that text exactly), never over the gold or
 *      the log-out button, inside the screen at 390 and at 320 px wide;
 *   3. the worker really stops judging this phone: a jump of 2,600 px is
 *      FOLLOWED at the move budget's 500 px/s with test mode off (the control,
 *      first), and taken at once with it on;
 *   4. off again from the same button: the tag goes, and the jump is followed
 *      again;
 *   5. a picture of the top bar with the tag (out/testmode.png).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const JUMP = 2600;

const holdTitle = async (P, ms) => {
  const at = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-zone-header__title');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!at) return 'no title element';
  await P.page.mouse.move(at.x, at.y);
  await P.page.mouse.down();
  await P.page.waitForTimeout(ms);
  await P.page.mouse.up();
  return 'ok';
};
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tapText = (P, re) => P.page.evaluate((src) => {
  const rx = new RegExp(src);
  const b = Array.from(document.querySelectorAll('button')).find((n) => rx.test((n.textContent || '').trim()));
  if (!b) return false;
  b.scrollIntoView({ block: 'center' });
  b.click();
  return true;
}, re.source);
const closePanel = (P) => P.page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => /^(Close|✕|×)$/.test((n.textContent || '').trim()) || n.getAttribute('aria-label') === 'Close');
  if (b) b.click();
  return !!b;
});
/* the tag and the boxes it must stay clear of */
const tagBox = (P) => P.page.evaluate(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: +r.left.toFixed(1), r: +r.right.toFixed(1), t: +r.top.toFixed(1), b: +r.bottom.toFixed(1), w: +r.width.toFixed(1) }; };
  const tag = document.querySelector('[data-test-mode-tag]');
  return {
    tag: R(tag), text: tag ? (tag.textContent || '').trim() : null,
    inTitle: !!(tag && tag.closest('[data-zone-title]')),
    inBar: !!(tag && tag.closest('.bt-zone-header')),
    title: R(document.querySelector('.bt-zone-header__title')),
    gold: R(document.querySelector('.bt-zone-header__balance')),
    logout: R(document.querySelector('.bt-zone-header__logout')),
    bar: R(document.querySelector('.bt-zone-header')),
    vw: window.innerWidth,
  };
});
const apart = (a, b) => !a || !b || a.r <= b.l + 0.5 || b.r <= a.l + 0.5 || a.b <= b.t + 0.5 || b.b <= a.t + 0.5;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tester', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(P);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await P.page.waitForTimeout(500);
  }
  rec.ok('the phone is in the Wheel (guard)', inWheel);
  const stop = H.keepAlive(P);
  await P.page.waitForTimeout(2500);
  const id = await H.readState(P, (S) => S.myId);

  /* the worker's copy of the player against the phone's, after a jump east
     (dir 1) or back west (dir -1): east, west, east again keeps every landing
     on ground the player already stood on -- two jumps east ran into the sea,
     where the phone's own walk rules put the player back on the shore */
  const jump = async (dir) => {
    const at = await P.page.evaluate((d) => {
      const S = window._gameState && window._gameState.current;
      S.player.x += d;
      return { x: S.player.x, y: S.player.y };
    }, JUMP * dir);
    await P.page.waitForTimeout(900);
    const phone = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const live = (await H.adminPlayer(wsPort, id)).live || {};
    return { want: at.x, phoneX: phone.x, workerX: live.x, kept: Math.abs(phone.x - at.x) < 2,
      short: +(dir * (phone.x - live.x)).toFixed(1) };
  };
  const caughtUp = async () => {
    for (let i = 0; i < 24; i++) {
      const phone = await H.readState(P, (S) => S.player.x);
      const live = (await H.adminPlayer(wsPort, id)).live || {};
      if (Math.abs(phone - live.x) < 3) return true;
      await P.page.waitForTimeout(500);
    }
    return false;
  };

  /* ── 3a. the control: the move budget follows a jump ── */
  const before = await jump(1);
  console.log('    without test mode: ' + JSON.stringify(before));
  rec.ok('3. the phone kept its jump (guard)', before.kept, before);
  rec.ok(`3. the control: without test mode a ${JUMP} px jump is followed, the worker ${before.short} px short of the phone after 0.9 s`,
    before.short > 300, before);
  rec.ok('3. ...and catches up at its own pace', await caughtUp());

  /* ── 1. the panel turns it on ── */
  await holdTitle(P, 2000);
  let opened = false;
  for (let i = 0; i < 30 && !opened; i++) { opened = await panelUp(P); if (!opened) await P.page.waitForTimeout(250); }
  rec.ok('1. a real hit-tested press on the zone title opens the Test panel', opened);
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tapText(P, /^Save key on this device$/);
  await P.page.waitForTimeout(1500);
  const note = await P.page.evaluate(() => { const el = document.querySelector('[data-dev-testmode-note]'); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; });
  rec.ok('1. the panel has a Test mode section that says what it turns off and what stays on',
    !!note && /speed limits on moving/.test(note) && /protects other players/.test(note), note);
  rec.ok('1. its button reads "Test mode (anti-cheat off for this character)"', await tapText(P, /^Test mode \(anti-cheat off for this character\)$/));
  let tag = null;
  for (let i = 0; i < 16; i++) {
    tag = await tagBox(P);
    if (tag.tag) break;
    await P.page.waitForTimeout(250);
  }
  const st = await (await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/state?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } })).json();
  rec.ok('1. the worker has it on for this character (/dev/state testMode)', st.ok === true && st.testMode === true && st.testModeAllowed === true, st);
  let btnOn = null;
  for (let i = 0; i < 16; i++) {
    btnOn = await P.page.evaluate(() => { const b = document.querySelector('[data-dev-testmode]'); return b ? (b.textContent || '').trim() : null; });
    if (btnOn === 'Test mode ON (tap to turn off)') break;
    await P.page.waitForTimeout(250);
  }
  rec.ok('1. the button now says it is on', btnOn === 'Test mode ON (tap to turn off)', btnOn);
  rec.ok('1. the top bar wears the TEST MODE tag', !!tag.tag && tag.text === 'TEST MODE', tag);
  await closePanel(P);
  await P.page.waitForTimeout(600);

  /* ── 2. where the tag sits ── */
  tag = await tagBox(P);
  rec.ok('2. it is in the top bar, beside the title -- not inside the title box (the banner reads its text)', tag.inBar && !tag.inTitle, tag);
  rec.ok('2. ...over neither the title, the gold nor the log-out button, inside the screen (390 px)',
    !!tag.tag && apart(tag.tag, tag.title) && apart(tag.tag, tag.gold) && apart(tag.tag, tag.logout) && tag.tag.l >= 0 && tag.tag.r <= tag.vw, tag);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/testmode.png`, clip: { x: 0, y: 0, width: PHONE.width, height: 120 } }).catch(() => {});
  rec.ok('5. a picture of the top bar: tools/qa/mp/out/testmode.png', true);
  await P.page.setViewportSize({ width: 320, height: 568 });
  await P.page.waitForTimeout(1200);
  const narrow = await tagBox(P);
  rec.ok(`2. ...and at 320 px wide: shown whole, over nothing (title ${narrow.title && narrow.title.w} px)`,
    !!narrow.tag && apart(narrow.tag, narrow.title) && apart(narrow.tag, narrow.gold) && apart(narrow.tag, narrow.logout)
      && narrow.tag.l >= 0 && narrow.tag.r <= narrow.vw && narrow.title && narrow.title.w >= 40, narrow);
  await P.page.setViewportSize(PHONE);
  await P.page.waitForTimeout(1200);

  /* ── 3b. the worker takes the jump ── */
  const during = await jump(-1);
  console.log('    with test mode: ' + JSON.stringify(during));
  rec.ok('3. the phone kept this jump too (guard)', during.kept, during);
  rec.ok(`3. with test mode on the same jump is taken at once (${during.short} px apart after 0.9 s)`, Math.abs(during.short) < 3, during);

  /* ── 1b. it is stored: a reload comes back in test mode from the join alone
     (state_sync's testMode), nobody pressing anything ── */
  await P.page.reload();
  await H.enterWorld(P);
  let back = false;
  for (let i = 0; i < 120 && !back; i++) {
    back = (await H.readState(P, (S) => (S && !S._zoneLoading ? S.currentZone : null))) === 'wheel';
    if (!back) await P.page.waitForTimeout(500);
  }
  rec.ok('1b. a reload brings the phone back into the Wheel (guard)', back);
  await P.page.waitForTimeout(1500);
  let again = null;
  for (let i = 0; i < 20; i++) { again = await tagBox(P); if (again.tag) break; await P.page.waitForTimeout(250); }
  rec.ok('1b. it is stored on the character: after a reload the join alone puts the tag back', !!again.tag && again.text === 'TEST MODE', again);

  /* ── 4. off again ── */
  await holdTitle(P, 2000);
  opened = false;
  for (let i = 0; i < 30 && !opened; i++) { opened = await panelUp(P); if (!opened) await P.page.waitForTimeout(250); }
  rec.ok('4. the panel opens again (guard)', opened);
  await P.page.waitForTimeout(1200);
  rec.ok('4. the button turns it off', await tapText(P, /^Test mode ON \(tap to turn off\)$/));
  let gone = false;
  for (let i = 0; i < 16 && !gone; i++) { gone = !(await tagBox(P)).tag; if (!gone) await P.page.waitForTimeout(250); }
  rec.ok('4. the tag goes', gone);
  const st2 = await (await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/state?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } })).json();
  rec.ok('4. the worker has it off', st2.ok === true && st2.testMode === false, st2);
  await closePanel(P);
  await P.page.waitForTimeout(600);
  const after = await jump(1);
  console.log('    test mode off again: ' + JSON.stringify(after));
  rec.ok('4. the phone kept the last jump (guard)', after.kept, after);
  rec.ok(`4. ...and the jump is followed again (${after.short} px short after 0.9 s)`, after.short > 300, after);

  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  stop();
  await P.ctx.close().catch(() => {});
}
