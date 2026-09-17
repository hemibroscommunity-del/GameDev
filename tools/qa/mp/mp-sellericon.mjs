/* ═══ v2.3.2620: THE SELLER'S TINY ICON ═══
 *
 * Owner: "Add the players tiny icon (similar to how the player icons are
 * displayed elsewhere in the game) next to their listing."
 *
 * "Similar to how they are displayed elsewhere" is the requirement, so the
 * icon is an EXTRACTION of the rule PlayerListPanel already had inline
 * (PlayerIcon.jsx) rather than a second renderer. This scenario therefore
 * measures BOTH ends of that extraction: the new icon on a listing, and the
 * player list still drawing the same thing afterwards. A refactor that
 * quietly changed the list is the failure mode worth catching, and only the
 * second half can catch it.
 *
 * market.test.mjs §S5d owns the payload question (a 40-row page costs 268
 * bytes/row of icon, worst case). This owns the pixels.
 */
import * as H from './harness.mjs';

const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll',
      'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

const STORE_DOOR = { x: 1290, y: 855 };
const PHONES = [
  { label: '360', portrait: { width: 360, height: 640 }, landscape: { width: 640, height: 360 } },
  { label: '390', portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } },
];

async function openMarket(P) {
  await H.hopTo(P, STORE_DOOR.x, STORE_DOOR.y);
  await P.page.waitForTimeout(700);
  const box = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-interact-prompt');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
  });
  if (!box) return false;
  await P.page.touchscreen.tap(box.cx, box.cy);
  await P.page.waitForTimeout(1100);
  await H.clickText(P, 'Market').catch(() => {});
  await P.page.waitForTimeout(1400);
  return H.seesText(P, 'What everyone is selling');
}

/** The icon on the seller line: what it is, how big, and where. */
async function readIcon(P) {
  return P.page.evaluate(() => {
    /* Find the text node "Seller: ..." and look at its row's first child --
       the icon is drawn by the component, so this locates it the way a
       reader's eye does rather than by a class the component does not set. */
    const spans = [...document.querySelectorAll('span')]
      .filter((s) => /^Seller:\s*\S/.test((s.textContent || '').trim()));
    if (!spans.length) return { noSellerLine: true };
    const line = spans[0].parentElement;
    const icon = line && line.firstElementChild;
    if (!icon || icon === spans[0]) return { noIcon: true, lineHtml: line ? line.innerHTML.slice(0, 120) : null };
    const r = icon.getBoundingClientRect();
    const cs = getComputedStyle(icon);
    const lr = line.getBoundingClientRect();
    return {
      tag: icon.tagName.toLowerCase(),
      /* v2.3.2622: a composed portrait is a data: URL on an <img>; the disc
         is a <div> with a letter. Which one is on screen is the question. */
      isPortrait: icon.tagName.toLowerCase() === 'img' && /^data:image\//.test(icon.getAttribute('src') || ''),
      srcHead: (icon.getAttribute('src') || '').slice(0, 24),
      w: Math.round(r.width), h: Math.round(r.height),
      round: cs.borderRadius,
      text: (icon.textContent || '').trim(),
      bg: cs.backgroundColor,
      /* The two things that make it "tiny" rather than "in the way": it is
         on the seller's line, and the line is still one line. */
      onLine: Math.abs((r.top + r.height / 2) - (lr.top + lr.height / 2)) < 6,
      lineH: Math.round(lr.height),
      /* Nothing may spill out of the panel at the narrow width. */
      overflows: (() => {
        const card = document.querySelector('.bt-inspect-card');
        if (!card) return null;
        const cr = card.getBoundingClientRect();
        return r.left < cr.left - 1 || r.right > cr.right + 1;
      })(),
    };
  });
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* A seller with a KNOWN name and colour, so the disc is checkable. */
  const S = await H.newPlayer(browser, { name: 'Marvin', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 }, init: COACH_OFF });
  await H.enterWorld(S);
  await S.page.waitForTimeout(2200);
  const sellerId = await H.readState(S, (st) => st.myId);
  const sellerColour = await H.readState(S, (st) => st.myColor || (st.rpg && st.rpg.color) || null);
  await H.grant(wsPort, sellerId, 'item', { invKey: 'wood_oak', count: 3 });
  await S.page.waitForTimeout(1400);
  await H.openDest(S, 'Bag').catch(() => {});
  await S.page.waitForTimeout(700);
  await S.page.evaluate(() => window._itemDetailBus
    && window._itemDetailBus.open({ kind: 'inventory', key: 'wood_oak', count: 3 }));
  await S.page.waitForTimeout(600);
  await H.clickText(S, 'Sell').catch(() => {});
  await S.page.waitForTimeout(500);
  await S.page.locator('input[type="number"]').last().fill('500');
  await S.page.waitForTimeout(200);
  await H.clickText(S, 'Put it up').catch(() => {});
  await S.page.waitForTimeout(2200);

  const wire = await S.page.evaluate(async () => {
    const base = (window.BT_API_BASE || '');
    const room = (new URLSearchParams(location.search).get('room')) || 'brotown-1';
    const res = await fetch(`${base}/api/store/browse?room=${room}`);
    return res.json();
  });
  const row = ((wire || {}).listings || [])[0];
  rec.ok('the listing is on the shelf', !!row, wire);
  rec.ok('...and the worker sends the seller\'s colour with it',
    !!row && typeof row.sellerColor === 'string' && /^#/.test(row.sellerColor), row && row.sellerColor);
  rec.ok('...and names the seller', !!row && row.sellerName === 'Marvin', row && row.sellerName);
  /* Nothing beyond what the room already broadcasts about that player. */
  const extra = row ? Object.keys(row).filter((k) => /^seller/.test(k)) : [];
  rec.ok('...and nothing about the seller beyond id, name, colour, avatar and look',
    extra.sort().join(',') === 'sellerAvatar,sellerColor,sellerId,sellerLook,sellerName', extra);
  /* v2.3.2622: the bust set, and specifically NOT the nine 256-char drawing
     fields -- invisible at 18px and 92KB on a full page. */
  const lk = row && row.sellerLook;
  rec.ok('...and the look it sends is the seller\'s own cosmetics', !!lk && typeof lk.sk === 'string', lk);
  const drawn = lk ? ['sa', 'sb', 'pa', 'pb', 'ta', 'tf', 'tm', 'tb', 'tr'].filter((k) => lk[k] !== undefined) : [];
  rec.ok('...carrying none of the nine drawing fields', drawn.length === 0, drawn);

  /* Marvin STAYS in the room: the player-list half below needs a peer to
     draw, and closing him would have left it with nothing to check. */

  for (const phone of PHONES) {
    const P = await H.newPlayer(browser, { name: 'Looker', wsPort, webPort, touch: true, viewport: phone.portrait, init: COACH_OFF });
    try {
      await H.enterWorld(P);
      await P.page.waitForTimeout(2200);

      for (const orient of ['portrait', 'landscape']) {
        if (orient === 'landscape') {
          await P.page.setViewportSize(phone.landscape);
          await P.page.waitForTimeout(1500);
        }
        const who = `${phone.label} ${orient}`;
        rec.ok(`${who}: the market opens`, await openMarket(P));
        /* v2.3.2624 (owner): "change everything to auction house". Was
           "Auction Marketplace" at v2.3.2622 and "General store" before that. */
        rec.ok(`${who}: ...titled Auction House`, await H.seesText(P, 'Auction House'));
        rec.ok(`${who}: ...with no older name left on it`,
          !(await P.page.evaluate(() => {
            const t = (document.querySelector('.bt-inspect-card') || {}).innerText || '';
            return /general store/i.test(t) || /auction marketplace/i.test(t);
          })));

        /* The portrait composites asynchronously (a dozen sprite layers onto
           a 256px canvas), so the disc is legitimately on screen for a beat
           first. Poll for the face rather than sleeping a fixed time -- the
           §67 lesson's sibling: a fixed sleep passes on a warm cache and
           fails on a cold one. */
        let ic = await readIcon(P);
        for (let i = 0; i < 40 && ic && !ic.isPortrait && !ic.noIcon; i++) {
          await P.page.waitForTimeout(250);
          ic = await readIcon(P);
        }
        rec.ok(`${who}: the listing has a seller line`, !ic.noSellerLine, ic);
        rec.ok(`${who}: ...with an icon before the name`, !ic.noIcon, ic);
        if (ic.noIcon || ic.noSellerLine) continue;
        /* v2.3.2622 (owner: "the player's actual profile picture ... instead
           of the M"): the seller's own bro, composed from their cosmetics --
           not a letter, and not a broken image either. */
        rec.ok(`${who}: ...showing the seller's ACTUAL character, not a letter`,
          ic.isPortrait === true, ic);
        rec.ok(`${who}: ...and no initial is left on screen`, ic.text === '', ic);
        rec.ok(`${who}: ...still round`, /50%/.test(ic.round), ic);
        rec.ok(`${who}: ...still tiny (18px)`, ic.w === 18 && ic.h === 18, ic);
        rec.ok(`${who}: ...sitting on the seller's own line`, ic.onLine, ic);
        rec.ok(`${who}: ...without spilling out of the panel`, ic.overflows === false, ic);
        /* The seller line is as tall as its TALLEST control, which since
           v2.3.2621 is the 26px chat button, not this 18px face. Written as
           24 when this test shipped at v2.3.2620 and left stale by the DM
           work a version later -- the line grew and nobody re-ran the test
           that measured it. 28 is the real ceiling: the button plus its
           border, and anything above that means something new has landed on
           the line and pushed the row. */
        rec.ok(`${who}: ...without pushing the row taller than its own controls`,
          ic.lineH <= 28, ic);
        await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/sellericon-${phone.label}-${orient}-shelf.png` });

        await P.page.evaluate(() => {
          const x = document.querySelector('.bt-inspect-close');
          if (x) x.click();
        });
        await P.page.waitForTimeout(700);
      }

      /* ── THE OTHER END OF THE EXTRACTION ──
         PlayerListPanel stopped keeping its own copy of this rule. If the
         move changed what the list draws, that is a regression in a screen
         this PR is not about, and only this half would notice. */
      await P.page.setViewportSize(phone.portrait);
      await P.page.waitForTimeout(1200);
      /* Opened through the panel bus, not by a gesture. That is deliberate
         and it is NOT the §67 mistake: the question here is what the list
         RENDERS after the extraction, not whether its door opens -- this PR
         does not touch the door, and mp-roster owns that. */
      await P.page.evaluate(() => window._uiPanels && window._uiPanels.playerList(true));
      await P.page.waitForTimeout(1200);
      const list = await P.page.evaluate(() => {
        const el = document.querySelector('.bt-plist-item');
        if (!el) return { absent: true, body: (document.body.innerText || '').slice(0, 120) };
        const icon = el.firstElementChild;
        const r = icon ? icon.getBoundingClientRect() : null;
        return r ? {
          w: Math.round(r.width), h: Math.round(r.height),
          round: getComputedStyle(icon).borderRadius,
          text: (icon.textContent || '').trim(),
          name: (el.textContent || '').trim().slice(0, 20),
        } : { noIcon: true };
      });
      rec.ok(`${phone.label}: the player list has Marvin in it`, !list.absent, list);
      if (!list.absent) {
        rec.ok(`${phone.label}: ...still drawing a round 28px icon after the extraction`,
          list.w === 28 && list.h === 28 && /50%/.test(list.round || ''), list);
        rec.ok(`${phone.label}: ...still the seller's initial, same rule as the listing`,
          list.text === 'M', list);
      }
      await P.page.evaluate(() => window._uiPanels && window._uiPanels.playerList(false));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }

  await S.ctx.close().catch(() => {});
}
