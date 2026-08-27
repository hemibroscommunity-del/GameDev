/* CAN A PLAYER GET THEIR LOGIN KEY BACK, FROM INSIDE THE GAME? (v2.3.2038)
 *
 * Owner: "is the character key retrievable once inside the game? I think this
 * detail might've gotten lost."
 *
 * WHY THIS IS A REAL TEST AND NOT A GREP.  The key is the ONLY way back to a
 * character after a cleared browser or a new phone -- there is no email
 * recovery.  "Is it reachable?" is therefore a question about the live UI, and
 * reading the source answers a different question: `AccountModal.jsx` exists
 * and nothing renders it, MenuBar still has a key button and its whole toolbar
 * is `display:none` since v14.  Both are true and neither settles it, because
 * a THIRD path -- More -> Settings -> Account -> AccountKeyCard -- is wired
 * through the panel registry and only a running client can show whether it
 * arrives.  So this walks it with taps, the way a player would.
 *
 * WHAT IT ASSERTS BEYOND "A BOX APPEARED": the string on screen is the actual
 * `bt_passphrase` this browser would log in with.  A key card that renders a
 * freshly-minted or truncated phrase is worse than no key card at all -- the
 * player copies it, trusts it, and finds out it is wrong on the day their
 * phone dies.
 *
 * BOTH DOORS, because v2.3.2038 added one and did not remove the other.  The
 * new top-level More tile is the discoverable path; the Settings row is where
 * the path has lived since v2.3.1291.  A change that promotes a destination
 * and silently orphans its old route is the same bug in a new place, so the
 * second walk exists to prove it still arrives.
 */
import * as H from './harness.mjs';

const tap = async (P, sel) => {
  await P.page.waitForSelector(sel, { timeout: 10000 });
  await P.page.click(sel);
  await P.page.waitForTimeout(450);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, {
    name: 'Keyholder', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(A);
  await A.page.waitForTimeout(1200);

  /* The truth to compare against: what the client would actually send. */
  const real = await A.page.evaluate(() => {
    try { return localStorage.getItem('bt_passphrase'); } catch (_e) { return null; }
  });
  rec.ok('this browser has a login key at all (not a guest tab)',
    !!real && real.length > 4, { len: real ? real.length : 0 });

  /* ── THE WALK: nav rail -> More -> Login Key ── */
  await tap(A, '[data-nav="more"]');
  const more = await A.page.evaluate(() => {
    const tiles = [...document.querySelectorAll('[data-more-tile]')];
    const k = tiles.find(t => t.getAttribute('data-more-tile') === 'account');
    const r = k && k.getBoundingClientRect();
    return {
      n: tiles.length,
      hasKey: !!k,
      label: k ? k.textContent.trim() : null,
      tip: k ? k.getAttribute('title') : null,
      onScreen: !!r && r.width > 0 && r.height > 0 && r.bottom <= innerHeight + 1,
      /* The empty tenth cell it was supposed to fill: five across means no row
         above it may have moved. */
      order: tiles.map(t => t.getAttribute('data-more-tile')),
    };
  });
  rec.ok('the More destination opens from the nav rail', more.n > 0, more);
  rec.ok('...and carries a top-level Login Key tile', more.hasKey, more);
  rec.ok('...labelled the thing a player would look for, not "Account"',
    more.label === 'Login Key', more);
  rec.ok('...fully on screen without scrolling (it is the last cell)',
    more.onScreen, more);
  rec.ok('...and it did not displace the nine tiles that were already there',
    more.order.slice(0, 9).join(',')
      === 'quests,skills,social,clan,guild,journey,encyclopedia,leaderboard,settings',
    more.order);

  await A.page.evaluate(() => {
    document.querySelector('[data-more-tile="account"]')
      .dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await A.page.waitForTimeout(700);

  /* ── WHAT ARRIVED ── */
  const card = await A.page.evaluate(() => {
    const el = document.querySelector('[data-bt="account-keycard"]');
    if (!el) return null;
    const input = el.querySelector('input');
    const r = el.getBoundingClientRect();
    return {
      value: input ? input.value : null,
      readOnly: input ? input.readOnly : null,
      w: Math.round(r.width), h: Math.round(r.height),
      onScreen: r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0,
      text: el.textContent,
    };
  });
  rec.ok('the Login Key card is on screen', !!card && card.onScreen, card);
  rec.ok('...and it shows THIS browser\'s real login key, not a fresh one',
    !!card && card.value === real, { shown: card && card.value, real });
  rec.ok('...and the field is read-only, so it cannot be edited by accident',
    !!card && card.readOnly === true, card);
  rec.ok('...and it warns that there is no other way back',
    !!card && /only/i.test(card.text) && /no email recovery/i.test(card.text),
    { text: card && card.text });

  const copyBtn = await A.page.evaluate(() => {
    const el = document.querySelector('[data-bt="account-keycard"]');
    const b = el && [...el.querySelectorAll('button')].find(x => /copy/i.test(x.textContent || ''));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width) };
  });
  rec.ok('...and offers a Copy button at a tappable size',
    !!copyBtn && copyBtn.h >= 44, copyBtn);

  /* The panel you land on should be named the thing you tapped.
     Identified by its STYLE, not by counting matches: the band's panel
     header is the one uppercase-transformed leaf, and the More grid that
     carried the other "Login Key" string has unmounted by now (opening a
     panel replaces the stack root), so a count would have been checking
     that exactly one thing existed rather than that the right one did.
     The width check is not padding: the header is maxWidth 132 with
     nowrap + ellipsis, so a title that renames itself longer fails by
     silently becoming "LOGIN K..." rather than by throwing. */
  const header = await A.page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(e =>
      e.children.length === 0
      && (e.textContent || '').trim() === 'Login Key'
      && getComputedStyle(e).textTransform === 'uppercase');
    if (!el) return null;
    return { w: Math.round(el.clientWidth), sw: Math.round(el.scrollWidth) };
  });
  rec.ok('the panel that opens is titled "Login Key" too, not "Account"',
    !!header, header);
  rec.ok('...and the title fits the header without being cut to an ellipsis',
    !!header && header.sw <= header.w, header);

  await A.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-loginkey.png' }).catch(() => {});

  /* ── THE OLD DOOR STILL WORKS ──
     Promoting a destination must not orphan the route people already know. */
  await A.page.evaluate(() => window.__broDashPanelBus.clear());
  await A.page.waitForTimeout(300);
  await tap(A, '[data-nav="more"]');
  await A.page.evaluate(() => {
    document.querySelector('[data-more-tile="settings"]')
      .dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await A.page.waitForTimeout(500);
  const row = await A.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x =>
      /Login Key —/.test(x.textContent || ''));
    if (!b) return null;
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return b.textContent.trim();
  });
  rec.ok('Settings still carries the Login Key row it has had since v2.3.1291',
    !!row, { row });
  await A.page.waitForTimeout(600);
  const viaSettings = await A.page.evaluate(() => {
    const el = document.querySelector('[data-bt="account-keycard"]');
    const i = el && el.querySelector('input');
    return i ? i.value : null;
  });
  rec.ok('...and it lands on the same key card, with the same key',
    !!viaSettings && viaSettings === real, { viaSettings, real });

  const errs = A.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors on the way to the key', errs.length === 0, errs.slice(0, 3));
  await A.ctx.close();
}
