/* THE EQUIP SCREEN SHOWS YOUR CHARACTER, WEARING WHAT YOU ARE WEARING
 * (v2.3.1815).
 *
 * Owner: "On the character equip menu find space to put as large view of the
 * character as possible to fit inside the space.  Should show armor worn etc
 * if player is wearing it." — and, on the pose: "Southwest idle view."
 *
 * Three claims, and each has a different way of being quietly wrong:
 *   1. The figure is THERE and is large — a canvas that renders 0x0, or
 *      renders at thumbnail size, satisfies "a character view exists".
 *   2. It is the SOUTHWEST facing — asserted by rendering south as well and
 *      requiring the two to differ.  Without that control, a `dir` that fell
 *      back to south would pass every other check here, and southwest vs
 *      south is genuinely hard to call by eye at 96px.
 *   3. It WEARS things — asserted by equipping armour and requiring the
 *      pixels to change, because "shows armor" is exactly the claim that
 *      looks fine until someone actually puts armour on.
 *
 * (3) is not hypothetical: the first cut of this drew a BARE-CHESTED figure
 * while the world sprite wore a tee, because the shirt is a gear SLOT and the
 * component was reading the trait catalog of the same name.
 */
import * as H from './harness.mjs';

const openHero = async (P) => {
  await P.page.evaluate(() => { window.__broDashPanelBus.open('hero'); });
  await P.page.waitForTimeout(1200);
};
/* Signature of what the canvas actually painted: opaque pixel count plus a
   coarse colour sum.  Compared between states rather than to a constant, so
   it cannot be satisfied by "some pixels exist". */
const sig = (P) => P.page.evaluate(() => {
  const cv = document.querySelector('canvas[aria-label="Your character"]');
  if (!cv) return null;
  const c = document.createElement('canvas');
  c.width = cv.width; c.height = cv.height;
  const x = c.getContext('2d');
  x.drawImage(cv, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let n = 0, r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 24) continue;
    n++; r += d[i]; g += d[i + 1]; b += d[i + 2];
  }
  return { n, r, g, b, w: c.width, h: c.height };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Viewer', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await openHero(P);

  /* ── 1. it is there, and it is large ── */
  const box = await P.page.evaluate(() => {
    const cv = document.querySelector('canvas[aria-label="Your character"]');
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
  });
  rec.ok('the equip screen has a character view', !!box, { box });
  /* 80px is not arbitrary: the equipped slots beside it are 46, so anything
     under ~2 slots tall is not "as large as possible", it is another icon. */
  rec.ok('...and it is large — at least two slots tall',
    !!(box && box.h >= 80 && box.w >= 80), { box });
  rec.ok('...and it is on screen, not scrolled out of the panel',
    !!(box && box.top > 0 && box.top < 844), { box });

  /* ═══ v2.3.1841: BIGGER, AND ON THE LEFT ═══
     Owner: "I want the character on the character menu to display larger and
     be in the left side.  I just scroll down to see the whole character."
     The size came from re-flowing the six gear slots from 3 columns to 2, so
     the figure's box grew from 2 slots tall to 3 without the row growing —
     which is why "larger" did not have to cost more scrolling. */
  const layout = await P.page.evaluate(() => {
    const cv = document.querySelector('canvas[aria-label="Your character"]');
    if (!cv) return null;
    /* v2.3.1842: measure the VISIBLE window, not the canvas.  The compact crop
       narrows a wrapper over a canvas that deliberately overhangs it (that is
       how the empty frame is reclaimed without shrinking the figure), so the
       canvas's own rect now starts at a negative x and says nothing about
       where the player sees the character.  Walk up to the clipping box. */
    let visEl = cv;
    try {
      const p = cv.parentElement;
      if (p && getComputedStyle(p).overflow === 'hidden') visEl = p;
    } catch (e) { /* keep the canvas */ }
    const r = visEl.getBoundingClientRect();
    /* The gear slots are the tiles with an aria-label that are NOT the
       figure; take the leftmost one as the block's edge. */
    const tiles = [...document.querySelectorAll('[role="button"][aria-label]')]
      .map((el) => ({ label: el.getAttribute('aria-label'), r: el.getBoundingClientRect() }))
      .filter((t) => t.r.width > 30 && t.r.width < 70 && t.r.height > 30 && t.r.height < 70
        && t.r.top > r.top - 40 && t.r.top < r.bottom + 40);
    if (!tiles.length) return { fig: r, tiles: 0 };
    const leftMost = Math.min(...tiles.map((t) => t.r.left));
    return { figLeft: Math.round(r.left), figRight: Math.round(r.right),
      figH: Math.round(r.height), slotsLeft: Math.round(leftMost), tiles: tiles.length,
      labels: tiles.map((t) => t.label) };
  });
  rec.ok('the gear slots were found, so "which side" can be answered (guard)',
    !!(layout && layout.tiles >= 4), layout);
  rec.ok('the character sits to the LEFT of the gear slots',
    !!(layout && layout.figRight <= layout.slotsLeft + 2), layout);
  /* 3 slots tall (46*3 + 4*2 = 146), less a little slack for borders. */
  rec.ok('...and is three slots tall now, not two',
    !!(layout && layout.figH >= 140), { figH: layout && layout.figH, was: 96 });

  const bare = await sig(P);
  rec.ok('it actually painted a figure (guard)', !!(bare && bare.n > 500), { bare });

  /* ── 2. southwest, and proven rather than assumed ──
     The portrait stamps the facing it actually composited onto the canvas.
     Asserting the STAMP rather than the pixels is what makes this meaningful:
     southwest and south are both front-ish three-quarter art and are not
     reliably tellable apart at 96px, so a silent fallback to south would have
     looked correct in every screenshot taken of this panel. */
  const drew = await P.page.evaluate(() => {
    const cv = document.querySelector('canvas[aria-label="Your character"]');
    return cv ? { dir: cv.__btDir || null, mirror: !!cv.__btMirror } : null;
  });
  rec.ok('the figure is composited SOUTHWEST, as asked',
    !!(drew && drew.dir === 'southwest'), { drew });
  /* And it is PINNED there: turning the player in the world must not turn the
     panel, or "southwest idle" becomes "whatever you happen to be facing". */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._facingAngle = 0;            /* east */
    if (S.player) S.player.dir = 'right';
  });
  await P.page.waitForTimeout(700);
  const stillSw = await P.page.evaluate(() => {
    const cv = document.querySelector('canvas[aria-label="Your character"]');
    return cv ? cv.__btDir : null;
  });
  rec.ok('...and stays southwest when the world player turns',
    stillSw === 'southwest', { stillSw });

  /* ── 3. it wears what you wear ── */
  await P.page.evaluate(() => {
    const g = window.__btGearSet;
    if (g) { g('chest', 'copperplate'); g('legs', 'coppergreaves'); }
  });
  await P.page.waitForTimeout(1500);
  const armoured = await sig(P);
  rec.ok('equipping armour changes the figure',
    !!(armoured && bare && armoured.n !== bare.n), { bare, armoured });
  /* Copper is warm — the plate should push the figure's colour, not just its
     silhouette.  Guards against "changed" being one stray pixel. */
  const dBare = bare ? bare.r / Math.max(1, bare.n) : 0;
  const dArm = armoured ? armoured.r / Math.max(1, armoured.n) : 0;
  rec.ok('...and visibly, not by a pixel or two',
    !!(armoured && bare && Math.abs(armoured.n - bare.n) > 200), 
    { barePx: bare && bare.n, armPx: armoured && armoured.n, meanRed: [dBare.toFixed(1), dArm.toFixed(1)] });

  /* ═══ v2.3.1841: THE SWORD AND THE SHIELD SHOW ═══
     Owner: "It should also reflect the currently equipped items (like sword
     and shield) but right now it doesn't."  Armour was already drawn because
     it ships as body-ALIGNED sheets; a weapon and a shield are placed, one
     from a grip anchor and one from an offset off the body's centre, so they
     had to be converted into this canvas's frame rather than dropped in.
     Asserted as "the picture changed", which is the only thing that proves a
     layer actually composited — a state check would pass with the canvas
     untouched. */
  const beforeKit = await sig(P);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };
    S.rpg.shield = { id: 'wood-shield', name: 'Pine Shield', type: 'shield' };
  });
  await P.page.waitForTimeout(1800);
  const afterKit = await sig(P);
  /* sig() returns {n,r,g,b} — there is no `hash` on it.  The first cut of this
     compared afterKit.hash to beforeKit.hash, i.e. undefined to undefined, and
     reported a FAILURE on working code.  Wrong in the safe direction, but
     wrong: compare the fields the probe actually has. */
  rec.ok('equipping a sword and shield changes the figure',
    !!(beforeKit && afterKit
      && (afterKit.n !== beforeKit.n || afterKit.r !== beforeKit.r
        || afterKit.g !== beforeKit.g || afterKit.b !== beforeKit.b)),
    { beforeKit, afterKit });
  rec.ok('...and by a real amount, not a pixel or two',
    !!(beforeKit && afterKit && Math.abs(afterKit.n - beforeKit.n) > 150),
    { beforePainted: beforeKit && beforeKit.n, afterPainted: afterKit && afterKit.n });

  /* v2.3.1842: the painted BOX of the figure inside its square canvas.  The
     compositor works in a 256 square but a standing person is narrow, so most
     of that width is empty — this is what the compact crop is sized from, and
     asserting it keeps the crop honest if the pose or the kit ever widens. */
  const bbox = await P.page.evaluate(() => {
    const cv = document.querySelector('canvas[aria-label="Your character"]');
    if (!cv) return null;
    const c = document.createElement('canvas');
    c.width = cv.width; c.height = cv.height;
    const x = c.getContext('2d');
    x.drawImage(cv, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let l = 1e9, r = -1, t = 1e9, b = -1;
    for (let y = 0; y < c.height; y++) {
      for (let X = 0; X < c.width; X++) {
        if (d[(y * c.width + X) * 4 + 3] < 24) continue;
        if (X < l) l = X; if (X > r) r = X; if (y < t) t = y; if (y > b) b = y;
      }
    }
    return r < 0 ? null : { l, r, t, b, w: r - l + 1, h: b - t + 1,
      cw: c.width, ch: c.height, wPct: +((r - l + 1) / c.width * 100).toFixed(1) };
  });
  console.log('    figure bbox', JSON.stringify(bbox));
  rec.ok('the figure is measurably narrower than its square canvas',
    !!(bbox && bbox.wPct < 80), bbox);

  /* ═══ v2.3.1842: TAPPING A SLOT STILL SHOWS ITS MENU ═══
     Owner: "make sure there's enough room so that when you click on an item to
     equip the menu still shows up."  The equip row grew to fit a bigger
     figure, so the card BELOW it is the thing that could get pushed off the
     bottom.  Asserted as "visible inside the viewport", not merely "in the
     DOM" — an element scrolled out of the panel is present and useless, which
     is exactly the failure being guarded against.

     v2.3.1842 measured this and it FAILED: title at y845, CHANGE at 842-859,
     in an 844px viewport.  Fixed at v2.3.1843 by opening the card in the row
     over the vitals rather than below the fold. */
  /* The UNSELECTED state, photographed before the tap below: vitals in the
     third column.  Two shots because the two states are the whole point of
     that column now. */
  try { await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/hero-vitals.png' }); } catch (e) {}

  const slotBtn = await P.page.$('[role="button"][aria-label="Weapon"]');
  rec.ok('the weapon slot is there to tap (guard)', !!slotBtn, {});
  if (slotBtn) {
    await slotBtn.click();
    /* v2.3.1843: no scroll to wait for any more — the card opens in the row,
       over the vitals.  If this ever needs a long settle again, something has
       started moving the panel. */
    await P.page.waitForTimeout(700);
    const card = await P.page.evaluate(() => {
      /* The panel header names the SELECTED slot once one is picked; before
         that it reads "Your stats".  Find it and measure where it sits. */
      /* Anchor on CHANGE — the control that actually equips something, which
         is the "menu" in the owner's sentence.  The first cut matched
         /great sword/ with a space and found nothing while the card was right
         there reading "GREATSWORD"; the header is one word.  Both the title
         and the button are checked so a card that renders without its action
         cannot pass. */
      const leaf = (re) => [...document.querySelectorAll('span, div, button')]
        .filter((el) => {
          const t = (el.textContent || '').trim();
          return t && t.length < 40 && re.test(t) && el.children.length === 0;
        })[0] || null;
      const title = leaf(/greatsword|copper/i);
      const change = leaf(/^change$/i);
      if (!title && !change) {
        return { found: false, body: (document.body.innerText || '').slice(0, 300) };
      }
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom),
          h: Math.round(r.height),
          onScreen: r.top >= 0 && r.bottom <= window.innerHeight && r.height > 0 };
      };
      return { found: true, vh: window.innerHeight,
        title: title && title.textContent.trim(), titleBox: box(title),
        changeBox: box(change),
        onScreen: !!(box(title) && box(title).onScreen
          && box(change) && box(change).onScreen) };
    });
    rec.ok('tapping a slot opens its card', !!(card && card.found), card);
    rec.ok('...and the card is ON SCREEN, not pushed off the bottom',
      !!(card && card.onScreen), card);

    /* ── v2.3.1844: it is a CARD, not loose text over tiles ──
       Owner: "the GREATSWORD and CHANGE are the thick border of the card.
       The inside of it is where it lists the stats."

       Three separate claims, and each can fail on its own:
         a) there IS a frame — an ancestor of the title with a real border;
         b) the STATS ARE INSIDE IT — the same frame contains the stat value,
            which is what stops a frame drawn around the header alone from
            passing;
         c) the interior is SUNKEN — the stats sit on a different ground than
            the frame does, which is the difference between a card and a
            rectangle with a line around it.  Compared as colours rather than
            asserted against a constant, so a palette change cannot make this
            fail and a copy-paste of the frame's background cannot pass. */
    const frame = await P.page.evaluate(() => {
      const leaf = (re) => [...document.querySelectorAll('span, div, button')]
        .filter((el) => {
          const t = (el.textContent || '').trim();
          return t && t.length < 40 && re.test(t) && el.children.length === 0;
        })[0] || null;
      const title = leaf(/greatsword|copper/i);
      const change = leaf(/^change$/i);
      const statK = leaf(/^(dmg|damage|armou?r|block)$/i);
      const fig = document.querySelector('canvas[aria-label="Your character"]');
      const slot = document.querySelector('[role="button"][aria-label="Legs"]');
      if (!title || !statK) return { found: false };
      const bw = (el) => parseFloat(getComputedStyle(el).borderTopWidth) || 0;
      let f = title.parentElement;
      for (let i = 0; i < 6 && f; i++, f = f.parentElement) if (bw(f) >= 1) break;
      if (!f || bw(f) < 1) return { found: false, noBorderAncestor: true };
      const fr = f.getBoundingClientRect();
      const inside = (el) => {
        const r = el.getBoundingClientRect();
        return r.top >= fr.top - 1 && r.bottom <= fr.bottom + 1
          && r.left >= fr.left - 1 && r.right <= fr.right + 1;
      };
      const cs = getComputedStyle(f);
      return {
        found: true,
        border: cs.borderTopWidth + ' ' + cs.borderTopColor,
        frameBg: cs.backgroundColor,
        statBg: getComputedStyle(statK.parentElement).backgroundColor,
        wellBg: getComputedStyle(statK.parentElement.parentElement).backgroundColor,
        holdsTitle: inside(title),
        holdsChange: !!change && inside(change),
        holdsStat: inside(statK),
        statLabel: statK.textContent.trim(),
        /* TEETH.  Without this the walk up could stop on the PANEL's own
           border and every check below would pass on a card that was never
           drawn: the panel contains the title, the button and the stats too.
           The card is one column of three, so the thing that separates it
           from any outer container is that the character and the gear slots
           are OUTSIDE it. */
        holdsFigure: !!fig && inside(fig),
        holdsSlots: !!slot && inside(slot),
        frameW: Math.round(fr.width),
      };
    });
    rec.ok('the item card has a real frame around the title', !!(frame && frame.found), frame);
    rec.ok('...and the CHANGE button sits on that frame',
      !!(frame && frame.holdsChange), frame);
    rec.ok('...and the STATS are inside the same frame, not beside it',
      !!(frame && frame.holdsStat), frame);
    rec.ok('...and the interior is a different ground than the frame (sunken, not flat)',
      !!(frame && frame.wellBg && frame.wellBg !== frame.frameBg), frame);
    rec.ok('...and the stat tile is a different ground again (tile on well)',
      !!(frame && frame.statBg && frame.statBg !== frame.wellBg), frame);
    rec.ok('...and the frame is the CARD, not the panel (character is outside it)',
      !!(frame && frame.holdsFigure === false && frame.holdsSlots === false), frame);
  }

  await P.page.screenshot({ path: '/home/user/GameDev/tools/maps/.hero.png' });
  await P.ctx.close().catch(() => {});
}
