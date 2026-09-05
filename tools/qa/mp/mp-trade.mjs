/* Two-sided trade (trade2) through the real UI, end to end.
 *
 * This is the flow with actual money on it, so the assertions are about
 * SETTLEMENT, not about panels appearing: gold and items have to end up in the
 * other player's bag, and the anti-switch confirm reset has to actually fire
 * when an offer changes after a confirm.  Both sides are seeded through the
 * shipped operator grant endpoint, so the before/after numbers are exact.
 *
 * Offers are read out of the OTHER player's rendered lane rather than from
 * client state, because that lane is the whole safety story: what B is about
 * to agree to is whatever B can see.  A test that read A's own staging mirror
 * would pass even if the snapshot never crossed the wire.
 */
import * as H from './harness.mjs';

/* Text of the "<name> offers" well, i.e. what THIS player sees the OTHER one
 * putting up.  Anchors on the lane header and reads the well right after it,
 * so it can never accidentally match a number elsewhere on the page. */
/* v2.3.2290: anchored on the LANE, not on a sibling.
   The header used to sit outside the well and this read `nextElementSibling`.
   With the owner's painted frame the header moved INSIDE the lane, so that
   sibling is now the row list -- which still has text in it, so the old reader
   would have kept passing while measuring a different element. The lane is
   found by walking up to .bt-t2-lane, and the header's own text is subtracted
   from the body so "Buyer offers" cannot satisfy an assertion about the pile.
   The header row is now the first child, so the icon <img> is skipped by
   matching the SPAN rather than children[0]. */
/* v2.3.2292: .bt-t2-lane-name, not "the first span in the header".
   The lane headers carry a player FACE now, and that chip renders a span of its
   own before the words -- so `querySelector('span')` started returning the
   portrait (empty, or a fallback initial) and every lane read came back null.
   The label has its own class for exactly this reason: a reader anchored on
   position breaks the next time anything is added to the left of the text. */
const LANE_FN = `() => {
  const hdr = [...document.querySelectorAll('.bt-t2-lane-hdr')].find((d) => {
    const sp = d.querySelector('.bt-t2-lane-name');
    return sp && /\\boffers$/i.test((sp.textContent || '').trim());
  });
  if (!hdr) return null;
  const lane = hdr.closest('.bt-t2-lane');
  if (!lane) return null;
  const full = (lane.innerText || '').replace(/\\s+/g, ' ').trim();
  const head = (hdr.innerText || '').replace(/\\s+/g, ' ').trim();
  return { header: head, body: full.startsWith(head) ? full.slice(head.length).trim() : full };
}`;

function otherLane(P) {
  return P.page.evaluate(`(${LANE_FN})()`);
}

const coins = (P) => H.readState(P, (S) => (S.rpg || {}).coins || 0);
/* v2.3.1755 changed this from 'wood' to 'wood_oak' on the claim that the
   worker's gathering path writes wood_oak.  That was WRONG — the gathering
   path builds its key from the tier's harvest NAME (gathering.js
   _harvestNameForTier), which was 'Kindling', so the real key was
   wood_kindling and wood_oak was every bit as invented as 'wood'.  The
   thumbnail assertions still held because thumbFor matches the wood_ PREFIX,
   not the species.
   v2.3.1763: the first tree drops a PINE LOG, so the honest key is
   wood_pine_log — a key the game actually produces, which is the whole point
   of granting it here. */
const WOOD_KEY = 'wood_pine_log';
/* The literal is repeated rather than closed over on purpose: readState
   stringifies this arrow and runs it in the PAGE, where a Node-scope
   binding is a ReferenceError. */
const wood = (P) => H.readState(P, (S) => ((S.rpg || {}).inventory || {})['wood_pine_log'] || 0);

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Trader', nameB: 'Buyer' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  /* v2.3.2280: the owner cannot test player-to-player trading alone, and
     asked to be SHOWN it.  Captured from inside this scenario rather than a
     separate staged reproduction, so every frame is a state the assertions
     around it have just proved is real. */
  /* ═══ v2.3.2282: WHICH SHADE, NOT MERELY "TWO SHADES" ═══
     The first cut of these assertions compared the two lanes to EACH OTHER
     (`top.bg !== bottom.bg`). That is unfalsifiable in the direction that
     matters: inverting every owner->well binding in the panel -- their pile
     lighter, yours sunk, the exact regression the panel's own comment calls
     load-bearing -- still leaves the two backgrounds unequal, and the suite
     passed 41/41 on the mutated build. So each lane is now pinned to the
     TOKEN it is supposed to carry, and the edge is checked on your lane only.
     rgb() strings because that is what getComputedStyle returns. */
  /* v2.3.2290: SUNK retired -- the sunk/raised shadow pair described the flat
     lanes, and the painted frame does not produce it. The fills SURVIVE the
     reskin and still carry the distinction, which is why .bt-t2-lane is drawn
     WITHOUT border-image `fill`: with it, the art would paint over the
     background and both lanes would report rgba(0,0,0,0), turning this check
     into two identical blanks compared for difference. This file's own history
     records that exact vacuous pass (41/41 on a build with every owner->well
     binding inverted), so the fills are load-bearing for the test as well as
     for the player. */
  /* One shared judgement so the three screens cannot drift apart -- a
     per-screen copy is how the receipt came to claim "shaded the same way
     round as the other two screens" while only ever looking at itself.
     Declared HERE, above the live drawer's own check: the first cut put it
     beside laneGeom further down and the live-drawer assertion hit it in its
     temporal dead zone. */
  /* ═══ v2.3.2290: THE DISCRIMINATOR MOVED WITH THE SKIN ═══
     Both lanes now wear the owner's painted frame, so neither has a background
     COLOUR any more -- getComputedStyle returns rgba(0,0,0,0) for both, and the
     old `bg === THEIR_WELL && bg === MY_WELL` pair would have gone quietly
     vacuous: two equal values, both matched against constants that can no
     longer appear, on a test whose whole job is to prove the two lanes are not
     the same. Exactly the failure this block's own history warns about (the
     first cut of these checks passed 41/41 on a build with every owner->well
     binding INVERTED).
     What carries the distinction now is the light wash on the buyer's lane --
     the owner's "notably different shade", kept through the reskin as an inset
     over the painted interior. So the check is: theirs is washed, mine is not,
     and theirs is on top. Swap the bindings and it still fails. */
  /* v2.3.2291: the flat kit's fills, sampled from the owner's own mockup. */
  const MY_WELL = 'rgb(18, 33, 43)';        /* #12212B */
  const THEIR_WELL = 'rgb(223, 220, 208)';  /* #DFDCD0 */
  const laneOk = (g) => !!(g && g.top && g.bottom)
    && g.top.top < g.bottom.top
    && g.top.bg === THEIR_WELL && g.bottom.bg === MY_WELL;
  /* ═══ v2.3.2294: AND THE SAME QUESTION ONE LEVEL DOWN ═══
     Everything above reads `.bt-t2-lane`, and the constants are even NAMED
     MY_WELL/THEIR_WELL while holding LANE fills. That was harmless while the
     lane was the only shaded thing in the window. It is not any more: the
     owner asked for the offered-items well to be tinted too -- brown on yours,
     gray on theirs -- and with only the lane checks in place you could swap
     those two tints over and this suite would stay entirely green. That is the
     exact vacuity the block above documents twice ("41/41 on a build with
     every owner->well binding INVERTED"), reintroduced one nesting level down,
     so it gets the same treatment: pinned to the token each well is supposed
     to carry, on all three screens.
     The COMPUTED backgroundColor, deliberately, not getPropertyValue('--w-bg')
     -- a custom property is what the CSS intends, and the fill is what the
     player sees. Decouple `background` from `--w-bg` and only this reader
     notices. */
  /* v2.3.2296: the owner picked "B, Sand & Mist" off the five-palette sweep
     below, so these move with it. Pinned to the token each well is supposed to
     carry, exactly as the lane constants above are, and for the same reason:
     the alternative ("the two are different") went vacuously green on a build
     with every binding inverted. */
  const MY_TINT = 'rgb(227, 212, 180)';     /* #E3D4B4 sand */
  const THEIR_TINT = 'rgb(207, 213, 215)';  /* #CFD5D7 mist */
  const wellOk = (g) => !!(g && g.top && g.bottom)
    && g.top.well === THEIR_TINT && g.bottom.well === MY_TINT;

  const shot = (P, name) => P.page.screenshot({
    path: H.REPO + '/tools/qa/mp/out/trade-' + name + '.png',
  }).catch(() => {});

  /* ── seed both sides ── */
  await H.grant(wsPort, aId, 'gold', { amount: 500 });
  await H.grant(wsPort, aId, 'item', { invKey: WOOD_KEY, count: 6 });
  await H.grant(wsPort, bId, 'gold', { amount: 300 });
  await A.page.waitForTimeout(1500);
  const aCoins0 = await coins(A), bCoins0 = await coins(B), aWood0 = await wood(A);
  rec.ok('operator grant reaches live players', aCoins0 >= 500 && bCoins0 >= 300 && aWood0 === 6,
    { aCoins0, bCoins0, aWood0 });

  /* ── A opens the trade from the inspect card ── */
  await H.openInspect(A, bId);
  rec.ok('inspect card offers Trade', (await H.buttonTexts(A)).includes('Trade'));
  await H.clickText(A, 'Trade');

  /* ── B gets the invite and opens it ── */
  const gotInvite = await H.waitUi(B, () => [...document.querySelectorAll('button')]
    .some((b) => b.textContent.includes('Open trade')), { label: 'B trade invite', timeout: 20000 })
    .then(() => true).catch(() => false);
  rec.ok('B receives the trade invite', gotInvite);
  if (!gotInvite) { await A.ctx.close(); await B.ctx.close(); return; }
  await H.clickText(B, 'Open trade');

  /* ── both sides land in the live window ── */
  const live = (P) => H.waitUi(P, () => [...document.querySelectorAll('button')]
    .some((b) => /Confirm trade|Add an item or gold/.test(b.textContent)),
  { label: 'live trade window', timeout: 20000 });
  await live(A); await live(B);
  rec.ok('both sides reach the live trade window', true);

  /* Empty on both sides => Confirm is really disabled, not merely styled so. */
  const emptyConfirm = await A.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /Add an item or gold/.test(x.textContent));
    return b ? { text: b.textContent.trim(), disabled: b.disabled } : null;
  });
  rec.ok('an empty trade cannot be confirmed', !!emptyConfirm && emptyConfirm.disabled === true, emptyConfirm);

  /* ── A stages 100 gold through the real input ── */
  const goldInput = A.page.locator('input[type="number"]').first();
  await goldInput.fill('100');
  await A.page.waitForTimeout(1200);

  /* ═══ A TAPS A TILE IN THEIR REAL BAG ═══
     v2.3.2149 (owner: "change the player to player trade menu to be like the
     shopkeeper trade menu where it just attaches to the player bag"): the
     window no longer carries its own copy of your bag. It is a DRAWER sitting
     on the band, and the band's own bag tiles stage into the offer -- the same
     handshake Shopkeeper Bro has used since v2.3.2059.

     So this taps `[data-inv-key]`, the real tile, rather than the retired
     in-window tray's `aria-label="Add one …"` button. That is not a
     workaround: tapping the real bag IS the feature under test now, and if the
     drawer ever covers the bag again this is the assertion that goes red. */
  const staged = await A.page.evaluate((k) => {
    const tile = [...document.querySelectorAll(`[data-inv-key="${k}"]`)]
      .find((el) => el.offsetParent);
    if (!tile) return null;
    const r = tile.getBoundingClientRect();
    /* Hit-tested, not just clicked: a tile the drawer is sitting on top of
       would still "click" and do nothing, which is the failure this whole
       change could introduce. */
    const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    const reachable = !!(top && (top === tile || tile.contains(top) || (top.closest && top.closest('[data-inv-key]') === tile)));
    tile.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return { key: k, reachable };
  }, WOOD_KEY);
  await A.page.waitForTimeout(1200);
  rec.ok('the real bag tile is reachable with the trade drawer open -- the '
    + 'drawer sits ON the band, it does not cover it', !!(staged && staged.reachable), staged);

  /* ── v2.3.1752: MORE THAN ONE ──
     Owner: "allow additional quantities of stuff to be traded (it only
     allowed me to put up one of the fire goblin remains)."  Staging used to be
     one control doing three jobs — a bag tap added floor(have/4) and wrapped
     to zero past the top — so a small stack stepped by 1 and there was no way
     to go down or to name a number.  A's grant is 6 wood, so this drives the
     new + stepper up to 3 and back down to 2 through the real buttons and
     reads the staged quantity off A's own lane. */
  /* The trade window is a pure renderer of server truth held in REACT state,
     not on window._gameState — so the staged number is read where the player
     reads it: off the stepper itself, which renders "qty/have". */
  const stagedQty = async () => A.page.evaluate(() => {
    const inc = [...document.querySelectorAll('button')]
      .find((x) => x.offsetParent && (x.getAttribute('aria-label') || '').startsWith('One more'));
    if (!inc) return null;
    const box = inc.previousElementSibling;
    const t = box ? (box.textContent || '').trim() : '';
    const m = t.match(/^(\d+)\s*\/\s*(\d+)$/);
    return m ? { qty: Number(m[1]), have: Number(m[2]) } : { raw: t };
  });
  const tapStep = (label) => A.page.evaluate((aria) => {
    const b = [...document.querySelectorAll('button')]
      .find((x) => x.offsetParent && (x.getAttribute('aria-label') || '').startsWith(aria));
    if (!b || b.disabled) return false;
    b.click();
    return true;
  }, label);
  await tapStep('One more');
  await A.page.waitForTimeout(700);
  await tapStep('One more');
  await A.page.waitForTimeout(900);
  const upTo3 = await stagedQty();
  rec.ok('the + stepper stages more than one of the same item',
    !!upTo3 && upTo3.qty >= 3, upTo3);
  await tapStep('One fewer');
  await A.page.waitForTimeout(900);
  const downTo2 = await stagedQty();
  rec.ok('...and the − stepper takes one back off',
    !!downTo2 && !!upTo3 && downTo2.qty === upTo3.qty - 1, { upTo3, downTo2 });
  /* Back to a single unit so the settlement assertions below are unchanged. */
  for (let i = 0; i < 4; i++) {
    const q = await stagedQty();
    if (!q || q.qty <= 1) break;
    await tapStep('One fewer');
    await A.page.waitForTimeout(500);
  }
  const backTo1 = await stagedQty();
  rec.ok('the stepper can walk a stack all the way back down to one',
    !!backTo1 && backTo1.qty === 1, backTo1);

  /* ── v2.3.1755: the offer is ART, not emoji ──
     Owner: "include the item thumbnails next to the quantities and gold icon
     next to the gold amount for trading."  naturalWidth is the load-bearing
     part: an <img> whose file 404s still exists in the DOM with the right src,
     and a trade window full of broken-image boxes would pass a src-only
     check.  Only a decoded bitmap proves the player is actually looking at
     the item. */
  const art = await A.page.evaluate(() => {
    /* v2.3.2149: the trade window is a DRAWER on the band now, not a
       .bt-inspect-card modal, so it is found by its own marker. Kept as a
       fallback rather than replaced outright -- the invite stub and the
       receipt screen are still cards. */
    const card = document.querySelector('[data-trade-drawer]') || document.querySelector('.bt-inspect-card');
    if (!card) return null;
    const imgs = [...card.querySelectorAll('img')]
      .map((i) => ({ src: i.getAttribute('src') || '', w: i.naturalWidth }));
    return {
      item: imgs.filter((i) => /\/icons\/items\//.test(i.src)),
      gold: imgs.filter((i) => /gold\.webp/.test(i.src)),
    };
  });
  rec.ok('a staged item shows its real thumbnail, loaded',
    !!art && art.item.length > 0 && art.item.every((i) => i.w > 0), art);
  rec.ok('the gold amount shows the gold icon, loaded',
    !!art && art.gold.length > 0 && art.gold.every((i) => i.w > 0), art);
  /* ═══ v2.3.2286: THE GOLD LADDER, THROUGH THE REAL BUTTONS ═══
     Owner: "For gold amounts to offer have preset amounts starting at 1 then 5
     then 25, 50, then 100, 500, 1000 then a blank spot to enter."
     Driven by real clicks and read back off the FIELD, so this measures what
     the player sees rather than the staging object -- and the field is the
     "blank spot", so the two halves of the ask are checked against each other. */
  const goldNow = () => A.page.evaluate(() => {
    const el = document.querySelector('[data-trade-drawer] input[type="number"]');
    return el ? Number(el.value) : null;
  });
  const chip = (label) => A.page.evaluate((t) => {
    const b = [...document.querySelectorAll('[data-trade-drawer] button')]
      .find((x) => (x.textContent || '').trim() === t);
    if (!b) return 'missing';
    if (b.disabled) return 'disabled';
    b.click(); return 'ok';
  }, label);

  const ladder = await A.page.evaluate(() => [...document.querySelectorAll('[data-trade-drawer] button')]
    .map((b) => (b.textContent || '').trim()).filter((t) => /^\+\d+$/.test(t)));
  rec.ok('the gold ladder is there, in the owner\'s order',
    ladder.join(',') === '+1,+5,+25,+50,+100,+500,+1000', ladder);

  /* Reset to nothing first: the stepper walk above left gold staged. */
  await A.page.evaluate(() => {
    const el = document.querySelector('[data-trade-drawer] input[type="number"]');
    if (el) { const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(el, '0'); el.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await A.page.waitForTimeout(500);
  const from = await goldNow();
  await chip('+25'); await A.page.waitForTimeout(350);
  const after25 = await goldNow();
  await chip('+5'); await A.page.waitForTimeout(350);
  const after30 = await goldNow();
  rec.ok('a preset ADDS to the offer rather than replacing it, so amounts can '
    + 'be built out of taps', from === 0 && after25 === 25 && after30 === 30,
    { from, after25, after30 });

  /* The field is the "blank spot to enter" and it still owns the exact number. */
  await A.page.locator('[data-trade-drawer] input[type="number"]').fill('7');
  await A.page.waitForTimeout(400);
  const typed = await goldNow();
  await chip('+1'); await A.page.waitForTimeout(350);
  rec.ok('...and typing an exact amount still works, with the presets adding on top',
    typed === 7 && (await goldNow()) === 8, { typed, then: await goldNow() });

  /* Clear only exists once there is something to clear. */
  rec.ok('a Clear appears once gold is staged', (await chip('Clear')) === 'ok');
  await A.page.waitForTimeout(400);
  rec.ok('...and it empties the offer', (await goldNow()) === 0);
  rec.ok('...and then takes itself away, rather than sitting there saying nothing',
    (await chip('Clear')) === 'missing');

  /* ═══ v2.3.2292: A FACE ON EACH SIDE ═══
     Owner: "put your characters thumbnail before the 'you offer' and the other
     trader's thumbnail of their character before theirs ... carry that through
     the trade menus."
     Asserted as "each header has a face that is a REAL PORTRAIT", not merely
     "a face element exists": both sources can fail softly to the letter tile --
     mine if portraitStore is empty, theirs if the peer lookup or the shared
     recipe breaks -- and a letter tile is exactly what a silently broken
     portrait looks like. Deliberately NOT asserted by comparing the two data
     URLs: two fresh QA players can legitimately roll identical cosmetics, so
     "they differ" would be flaky rather than strict. */
  const faces = () => A.page.evaluate(() => {
    const out = {};
    for (const h of document.querySelectorAll('[data-trade-drawer] .bt-t2-lane-hdr')) {
      const name = h.querySelector('.bt-t2-lane-name');
      const face = h.querySelector('.bt-t2-face');
      const img = face && face.querySelector('img');
      if (!name) continue;
      /* v2.3.2294: `sig` -- a fingerprint of the portrait's data URL, so the
         receipt can be checked against what the live window drew rather than
         merely against "an image is present", which any image satisfies. Kept
         short on purpose: the whole URL in a failure payload is tens of KB. */
      const src = img && img.getAttribute('src');
      out[(name.textContent || '').trim()] = {
        face: !!face,
        real: !!src,
        letter: !!(face && face.querySelector('.bt-t2-face-ltr')),
        sig: src ? (src.length + ':' + src.slice(-24)) : null,
      };
    }
    return out;
  });
  const f1 = await faces();
  const theirKey = Object.keys(f1).find((k) => /offers$/i.test(k));
  const mineKey = Object.keys(f1).find((k) => /^You offer$/i.test(k));
  rec.ok('both lanes are headed by a face', !!theirKey && !!mineKey
    && f1[theirKey].face && f1[mineKey].face, f1);
  rec.ok('...and each is a real drawn portrait, not the letter fallback that a '
    + 'broken lookup degrades to',
    !!theirKey && !!mineKey && f1[theirKey].real && f1[mineKey].real
      && !f1[theirKey].letter && !f1[mineKey].letter, f1);

  /* ═══ v2.3.2288: THE LADDER'S SIGN ═══
     Owner: "Put a subtract button near the clear button (that changes back to
     add once tapped again) that inverts all the gold from the buttons."
     Driven through the real toggle and read off the real chips, so what is
     measured is the thing on screen and not a flag on the staging object. */
  const ladderNow = () => A.page.evaluate(() => [...document.querySelectorAll('[data-trade-drawer] button')]
    .map((b) => (b.textContent || '').trim()).filter((t) => /^[+\u2212]\d+$/.test(t)));
  /* Selected on the stable data-gold-mode hook, never on the words: a helper
     that finds its element by display copy turns every assertion below into
     "not found" the day the label is reworded, and a null is not a measurement
     of anything (TRAPS SS29). The TEXT is still asserted -- just not used to
     locate the button. */
  const signBtn = () => A.page.evaluate(() => {
    const b = document.querySelector('[data-trade-drawer] button[data-gold-mode]');
    return b ? { text: b.textContent.trim(), mode: b.getAttribute('data-gold-mode'),
      pressed: b.getAttribute('aria-pressed') } : null;
  });

  /* Tapping it goes through the hook too, for the same reason: a reworded label
     should redden the ONE assertion about the label, not silently stop eight
     behavioural assertions from ever engaging subtract mode. */
  const tapSign = () => A.page.evaluate(() => {
    const b = document.querySelector('[data-trade-drawer] button[data-gold-mode]');
    if (!b) return 'missing';
    b.click(); return 'ok';
  });

  /* Gold is 0 here -- the Clear block above just emptied it. */
  rec.ok('with nothing staged the sign toggle keeps Clear\'s company and stays '
    + 'away: subtract mode on an empty offer is a ladder where every chip is '
    + 'disabled', (await signBtn()) === null);

  await A.page.locator('[data-trade-drawer] input[type="number"]').fill('100');
  await A.page.waitForTimeout(400);
  const signAdd = await signBtn();
  /* v2.3.2292: ONE GLYPH, naming the ACTION not the mode. Owner: "instead of
     the 'Add' button just have a symbol for minus ... to invert the coin
     options". So it shows MINUS while the chips read +N, and PLUS once they
     read -N. That inverts the v2.3.2288 reasoning on purpose and it holds
     because the seven chips carry the sign themselves -- the mode is on
     screen either way, so the button is free to say what it DOES.
     Asserted on data-gold-mode for the state and on the glyph for the label,
     which keeps the two facts separable: a reworded button reddens one line. */
  rec.ok('once gold is staged the inverter appears, offering the sign the chips '
    + 'are NOT in', !!signAdd && signAdd.text === '\u2212' && signAdd.mode === 'add' && signAdd.pressed === 'false', signAdd);

  await tapSign(); await A.page.waitForTimeout(350);
  const subLadder = await ladderNow();
  const signSub = await signBtn();
  rec.ok('THE ASK: tapping it inverts every chip on the ladder at once',
    subLadder.join(',') === '\u22121,\u22125,\u221225,\u221250,\u2212100,\u2212500,\u22121000', subLadder);
  rec.ok('...and once tapped it offers the way back, so the pair can never both '
    + 'read the same sign', !!signSub && signSub.text === '\uFF0B' && signSub.mode === 'sub' && signSub.pressed === 'true', signSub);

  /* The toggle and Clear must not cost the drawer a second row -- see the fold
     note below; this is the same budget, spent horizontally instead. */
  const goldRow = await A.page.evaluate(() => {
    const d = document.querySelector('[data-trade-drawer]');
    const inp = d.querySelector('input[type="number"]');
    const btns = [...d.querySelectorAll('button')];
    const sign = d.querySelector('button[data-gold-mode]');
    const clr = btns.find((x) => (x.textContent || '').trim() === 'Clear');
    if (!inp || !sign || !clr) return null;
    const i = inp.getBoundingClientRect(), sg = sign.getBoundingClientRect(), c = clr.getBoundingClientRect();
    return { signDrop: Math.round(sg.top - i.top), clearDrop: Math.round(c.top - i.top), vw: window.innerWidth };
  });
  rec.ok('the toggle and Clear share the gold field\'s row instead of wrapping '
    + 'onto a new one, which is the budget that put the primary action under '
    + 'the fold last time',
    !!goldRow && Math.abs(goldRow.signDrop) < 20 && Math.abs(goldRow.clearDrop) < 20, goldRow);

  /* ── AND ON A PHONE, WHICH IS THE PLATFORM THAT MATTERS ──
     This scenario runs at 1000x780 (harness.mjs default), so the check above
     measures a desktop row and would stay green while the pill wrapped on every
     real device. The primary platform is iPhone Safari, so the row is measured
     again at 375px -- iPhone SE / 13 mini, the narrowest phone still on a
     supported iOS -- and the viewport is put straight back so the remaining
     assertions run on the width they were written for. */
  await A.page.setViewportSize({ width: 375, height: 812 });
  await A.page.waitForTimeout(500);
  const goldRowNarrow = await A.page.evaluate(() => {
    const d = document.querySelector('[data-trade-drawer]');
    const inp = d && d.querySelector('input[type="number"]');
    const btns = d ? [...d.querySelectorAll('button')] : [];
    const sign = d.querySelector('button[data-gold-mode]');
    const clr = btns.find((x) => (x.textContent || '').trim() === 'Clear');
    if (!inp || !sign || !clr) return null;
    const i = inp.getBoundingClientRect(), sg = sign.getBoundingClientRect(), c = clr.getBoundingClientRect();
    const dr = d.getBoundingClientRect();
    return {
      signDrop: Math.round(sg.top - i.top), clearDrop: Math.round(c.top - i.top),
      clearRight: Math.round(c.right), drawerRight: Math.round(dr.right),
      spillPx: Math.round(c.right - dr.right), vw: window.innerWidth,
    };
  });
  rec.ok('...and it still shares that row on a 375px iPhone, where the word '
    + 'pill actually has to fit',
    !!goldRowNarrow && Math.abs(goldRowNarrow.signDrop) < 20
      && Math.abs(goldRowNarrow.clearDrop) < 20, goldRowNarrow);
  rec.ok('...without Clear being pushed off the edge of the drawer to do it',
    !!goldRowNarrow && goldRowNarrow.spillPx <= 0, goldRowNarrow);
  await A.page.setViewportSize({ width: 1000, height: 780 });
  await A.page.waitForTimeout(500);

  await chip('\u221225'); await A.page.waitForTimeout(350);
  rec.ok('a chip in subtract mode takes the gold back off the offer',
    (await goldNow()) === 75, { gold: await goldNow() });
  rec.ok('...and one that would take you past zero is disabled, the mirror of '
    + 'the rule that disables what you cannot afford',
    (await chip('\u22121000')) === 'disabled');

  await tapSign(); await A.page.waitForTimeout(350);
  rec.ok('tapping it again changes back to add, exactly as asked',
    (await ladderNow()).join(',') === '+1,+5,+25,+50,+100,+500,+1000'
      && (await signBtn()).mode === 'add');

  /* ── SUBTRACTING TO EXACTLY ZERO ──
     The dead end this has to avoid: at zero every subtract chip is disabled, so
     a stuck subtract mode would leave the ladder inert with the way out looking
     like just another greyed control. Reaching zero clears the offer AND the
     mode, and re-staging proves the mode really reset rather than merely being
     hidden with the toggle. */
  await A.page.locator('[data-trade-drawer] input[type="number"]').fill('25');
  await A.page.waitForTimeout(400);
  await tapSign(); await A.page.waitForTimeout(350);
  await chip('\u221225'); await A.page.waitForTimeout(400);
  rec.ok('subtracting the last of it empties the offer rather than staging a '
    + 'gold row worth zero', (await goldNow()) === 0, { gold: await goldNow() });
  rec.ok('...and both the toggle and Clear take themselves away with it',
    (await signBtn()) === null && (await chip('Clear')) === 'missing');
  await A.page.locator('[data-trade-drawer] input[type="number"]').fill('50');
  await A.page.waitForTimeout(400);
  rec.ok('...and the next gold you stage starts in ADD, so the mode cannot '
    + 'survive invisibly into a trade you did not set it for',
    (await ladderNow())[0] === '+1' && (await signBtn()).mode === 'add',
    { ladder: await ladderNow(), sign: await signBtn() });

  /* ═══ v2.3.2288: NO TINY UP/DOWN ARROWS ON THE GOLD FIELD ═══
     Owner: "get rid of the tiny up and down arrows next to the gold amount."
     ASSERTED AS COMPUTED STYLE, NOT AS PIXELS OR A CLICK, and deliberately:
     headless Chromium renders no spin buttons AT ALL -- a corner click on a
     plain type=number does not increment here -- so a behavioural test would
     pass on an unfixed build for the wrong reason. What IS observable is the
     property the fix sets, `appearance`, which reads `auto` unstyled and
     `textfield` once the rule bites; deleting the class or the rule turns this
     red. The type check is the other half of the fix: the field stays a number
     input so the iOS keypad is untouched and the five `input[type="number"]`
     selectors in this file keep finding it. */
  const spin = await A.page.evaluate(() => {
    const el = document.querySelector('[data-trade-drawer] input[type="number"]');
    if (!el) return null;
    return { type: el.type, cls: el.className, appearance: getComputedStyle(el).appearance };
  });
  rec.ok('the gold field has the browser\'s own up/down spin buttons styled off',
    !!spin && /bt-nospin/.test(spin.cls) && spin.appearance === 'textfield', spin);
  rec.ok('...and is STILL a number input, so the iOS keypad and every selector '
    + 'in this file survive the fix', !!spin && spin.type === 'number', spin);

  /* A chip you cannot afford is disabled, not silently clamped -- the number
     under your thumb must not disagree with the number on the chip. */
  const purse = await coins(A);
  rec.ok('a preset larger than the purse is disabled, not silently clamped',
    purse < 1000 ? (await chip('+1000')) === 'disabled' : true, { purse });

  await A.page.locator('[data-trade-drawer] input[type="number"]').fill('100');
  await A.page.waitForTimeout(400);

  /* ═══ v2.3.2286: THE PRIMARY ACTION STAYS ABOVE THE FOLD ═══
     The drawer is capped at min(52vh, 420px) and scrolls, so anything added to
     it spends a height budget that nothing was measuring. The ladder's first
     cut put Clear on a second row and pushed "Ready to trade" under the
     dashboard band -- reachable only by scrolling a panel most players would
     not think to scroll. Caught by eye in the screenshot; asserted here so the
     next thing added to this drawer cannot spend the same budget silently. */
  const fold = await A.page.evaluate(() => {
    const d = document.querySelector('[data-trade-drawer]');
    const b = [...d.querySelectorAll('button')]
      .find((x) => /Ready to trade|Confirm trade|Add an item/.test(x.textContent || ''));
    if (!b) return null;
    const dr = d.getBoundingClientRect(), br = b.getBoundingClientRect();
    return {
      label: b.textContent.trim(),
      overflowPx: Math.round(br.bottom - dr.bottom),
      scrolls: d.scrollHeight > d.clientHeight + 1,
    };
  });
  rec.ok('the primary action is reachable without scrolling the drawer',
    !!fold && fold.overflowPx <= 0, fold);

  /* v2.3.2293: the POSITIVE CONTROL for the review screen's absence check
     below. An assertion that something is missing passes just as happily when
     the selector is wrong as when the thing is genuinely gone -- so the same
     selector is first shown to FIND the controls here, on the live window,
     where they certainly exist. Without this the guard could rot into a
     permanent green the next time a class is renamed. */
  const editableOnLive = await A.page.evaluate(() => !!document.querySelector(
    '[data-trade-drawer] button[data-gold-mode], [data-trade-drawer] .bt-t2-chip, '
    + '[data-trade-drawer] .bt-t2-sq, [data-trade-drawer] input'));
  rec.ok('the live window DOES carry offer-changing controls (the control for '
    + 'the review-screen check below)', editableOnLive === true, { editableOnLive });

  await shot(A, '1-offer');

  /* v2.3.2282: the live drawer is the screen the other two were made to match,
     so it is asserted on the same terms rather than assumed correct.  Its lane
     headers are flex ROWS containing spans, not leaf divs, so it needs the
     header+nextSibling shape LANE_FN uses rather than the leaf reader below. */
  /* v2.3.2290: the lane is the element measured, found by walking UP from its
     header rather than sideways to a sibling -- see the note on LANE_FN. With
     the painted frame the shading lives on .bt-t2-lane itself, so a reader that
     kept taking the next sibling would have measured the row list: no
     background, no shadow, and a green 'they are different' verdict for the
     wrong reason. */
  const liveGeom = await A.page.evaluate(() => {
    const hdrs = [...document.querySelectorAll('[data-trade-drawer] .bt-t2-lane-hdr')];
    const pick = (rx) => {
      const hdr = hdrs.find((d) => {
        const sp = d.querySelector('.bt-t2-lane-name');
        return sp && rx.test((sp.textContent || '').trim());
      });
      const well = hdr && hdr.closest('.bt-t2-lane');
      if (!well) return null;
      const r = well.getBoundingClientRect();
      const cs = getComputedStyle(well);
      const items = well.querySelector('.bt-t2-items');
      return { top: Math.round(r.top), bg: cs.backgroundColor, shadow: cs.boxShadow,
        well: items ? getComputedStyle(items).backgroundColor : null };
    };
    return { top: pick(/offers$/i), bottom: pick(/^You offer$/i) };
  });
  rec.ok('live drawer: their offer is above yours (the screen the other two '
    + 'were made to match)', !!(liveGeom.top && liveGeom.bottom)
    && liveGeom.top.top < liveGeom.bottom.top, liveGeom);
  rec.ok('...and YOUR lane carries the your-side shading here too',
    laneOk(liveGeom), liveGeom);
  rec.ok('...and the offered-items wells inside them carry the two tints the '
    + 'owner asked for -- brown on yours, gray on theirs',
    wellOk(liveGeom), liveGeom);

  /* ═══ v2.3.2283: THE INK INVERTED WITH THE FILL ═══
     The failure mode this change can actually ship is a HALF migration: the
     buyer's lane goes light and some ink inside it stays on the dark ramp,
     which is not a wrong colour but INVISIBLE TEXT (#F4F0E7 is 1.36:1 on the
     card, #8D9B98 is 1.87:1). Nothing in this suite read an ink colour before
     v2.3.2282's tone check, and nothing read one INSIDE a lane at all.

     Computed in-page from the real rendered colours rather than pinned to
     hexes, so it survives a token retune -- the owner may well walk the shade
     up or down -- and still catches every ink that failed to follow. Every
     text node in the lane is checked, not the first one: the gold figure and
     the muted count line are the two most likely to be missed, and they are
     not first. */
  const inkProbe = (P, headerRe) => P.page.evaluate((rx) => {
    const re = new RegExp(rx, 'i');
    /* v2.3.2290: the LANE, by class. The live drawer's header moved inside the
       painted frame, so "next sibling" now lands on the row list -- which has
       no background of its own, so every ratio would be computed against a
       transparent bg and the probe reported `checked: 0`, i.e. a contrast
       assertion that inspects nothing. Both shapes are tried: the header inside
       its lane (live + review), or a leaf title sitting above one (receipt). */
    /* Lane headers FIRST and on their own. Searching them together with every
       div matched an ANCESTOR of the header instead -- its first <span> is the
       header's span, so the regex hit, but closest('.bt-t2-lane') from up there
       is null and the probe fell out with found:false and nothing checked. */
    const hdr = [...document.querySelectorAll('[data-trade-drawer] .bt-t2-lane-hdr')]
      .find((d) => {
        const sp = d.querySelector('.bt-t2-lane-name');
        return sp && re.test((sp.textContent || '').trim());
      })
      || [...document.querySelectorAll('[data-trade-drawer] div')]
        .find((d) => d.children.length === 0 && re.test((d.textContent || '').trim()));
    const sib = hdr && hdr.nextElementSibling;
    const well = (hdr && hdr.closest && hdr.closest('.bt-t2-lane'))
      || (sib && sib.classList && sib.classList.contains('bt-t2-lane') ? sib : null);
    if (!well) return { found: false };
    const L = (s) => {
      const m = (s || '').match(/[\d.]+/g);
      if (!m || m.length < 3) return null;
      const c = m.slice(0, 3).map(Number).map((v) => v / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    /* ═══ v2.3.2294: EACH WORD IS MEASURED AGAINST THE GROUND IT IS ON ═══
       This used to take ONE background -- the lane's -- and compare every ink
       in the subtree to it. That held while a lane was one flat colour. It is
       false now: the offered rows sit on a tinted well INSIDE the lane, so on
       your lane the true grounds are #12212B for the header and #DCCBA8 six
       pixels below it, and a single figure is wrong for one of them by about
       10:1. Read against the lane, dark row text on the brown well would have
       been reported as 1.1:1 and failed a change that is in fact correct --
       and, far worse, on the buyer's lane the reverse: measuring pale ink
       against the cream LANE while it actually sits on the darker well
       flatters every ratio, which is a probe that passes what it should catch.
       So the ground is resolved per element by walking up to the nearest
       ancestor that actually paints one.

       ALPHA < .9 IS NOT A GROUND. A translucent wash (the stepper buttons are
       rgba(11,22,27,.05)) composites over whatever is behind it; taking it as
       the ground would measure the ✕ against a colour nothing renders. The
       walk passes through those, which costs at most ~2% on the ratio and
       never invents a surface. */
    const groundOf = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        const m = (c || '').match(/[\d.]+/g);
        if (!m) continue;
        const a = m.length > 3 ? Number(m[3]) : 1;
        if (a >= 0.9) return L(c);
        if (n === document.body) break;
      }
      return null;
    };
    const out = [];
    let skipped = 0, ungrounded = 0;
    for (const el of well.querySelectorAll('*')) {
      const t = (el.textContent || '').trim();
      /* leaf text nodes only -- a wrapper's textContent is its children's */
      if (!t || el.children.length) continue;
      /* v2.3.2294: DISABLED CONTROLS ARE EXEMPT, and this is the one place the
         bar is lowered, so it is worth being exact about why. Widening the
         probe to your lane swept in the gold chip ladder, which sits in the
         lane but OUTSIDE the well, and the two presets you cannot afford came
         back at 3.13:1. That is not a regression and not something to fix:
         WCAG 2.1 SC 1.4.3 exempts inactive components by name, and a disabled
         chip that met AA would look affordable. The house rule (UI-BIBLE, and
         the stepBtn note in the panel) is "disabled reads as muted, never
         invisible", which 3.13:1 satisfies. The count is reported either way so
         the exemption cannot quietly grow to cover a live control. */
      if (el.disabled || (el.closest && el.closest('button:disabled,[disabled],[aria-disabled="true"]'))) { skipped++; continue; }
      const ink = L(getComputedStyle(el).color);
      const bg = groundOf(el);
      /* An element whose walk reaches <body> without hitting an opaque surface
         has no ground to be measured against, so it can only be dropped -- but
         dropped SILENTLY it would shrink `checked` while the assertion, which
         only asks for checked > 0, stayed green. Counted and reported instead;
         it should always be zero, and a number here means the probe stopped
         seeing part of the window. */
      if (ink == null || bg == null) { ungrounded++; continue; }
      out.push({ t: t.slice(0, 14),
        ratio: +(((Math.max(bg, ink) + 0.05) / (Math.min(bg, ink) + 0.05)).toFixed(2)),
        /* the DIRECTION has to match the ground, not a fixed expectation: dark
           ink belongs on a light surface and light ink on a dark one, and a
           lane now holds one of each. .18 is sRGB middle grey -- the standard
           is-this-surface-light-or-dark line, not a number read off this
           window's palette, so a retint cannot walk out from under it. The two
           grounds in play sit far either side of it (#12212B is .014, #DCCBA8
           is .59). */
        sided: (bg > 0.18) === (ink < bg) });
    }
    return { found: true, bg: L(getComputedStyle(well).backgroundColor), inks: out, skipped, ungrounded };
  }, headerRe);
  const inkBad = (r) => (r.inks || []).filter((i) => i.ratio < 4.5 || !i.sided);
  /* One judgement for all four probes, so a new screen cannot be added on a
     weaker one. `ungrounded` in the condition and not merely in the payload:
     an element the walk could not place is an element this probe stopped
     measuring, and a probe that quietly measures less is how the last three
     vacuous checks in this file happened. */
  const inkOk = (r, min) => !!r && r.found === true
    && (r.inks || []).length >= (min || 1) && inkBad(r).length === 0 && r.ungrounded === 0;
  const inkDbg = (r) => ({ found: r.found, bad: inkBad(r),
    checked: (r.inks || []).length, disabledSkipped: r.skipped, ungrounded: r.ungrounded });

  const inkEmpty = await inkProbe(A, 'offers$');
  rec.ok("the buyer lane's ink inverted with its fill -- every word on the "
    + 'light card is dark and clears AA', inkOk(inkEmpty), inkDbg(inkEmpty));

  /* v2.3.2294: and YOUR lane, which was never probed because it was the plain
     dark one -- there was nothing to get wrong. Tinting your well made it the
     riskier of the two: it is the only place in the window where a LIGHT
     surface sits inside a DARK frame, so it is where an ink that failed to
     follow its fill reads as an empty row rather than as a wrong colour. It is
     also the only lane with controls in its well (the stepper and the remove
     ✕), i.e. the five hardcoded colours the panel's own v2.3.2283 note said
     would "go live on a light fill all at once". */
  const inkMine = await inkProbe(A, '^You offer$');
  rec.ok('YOUR lane too: the tinted well took the dark ramp with it, controls '
    + 'included, while the header above it kept the light one',
    inkOk(inkMine), inkDbg(inkMine));

  /* ═══ v2.3.1754: THE TWO-STAGE HANDSHAKE, THROUGH THE REAL BUTTONS ═══
     Owner: "once both ready up, show a second, stripped-down screen ... Both
     must accept again."  Driven end to end here because every safety property
     in it is a claim about what a player can DO: that an accept cannot be
     reached without readying, that the review screen has no way to change the
     offer, that an edit drags both players back, and that the accept is
     refused for a beat afterwards. */
  const capReview = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.trade2Review));
  rec.ok('the worker advertises the two-stage trade', capReview);
  const btn = (P, re) => P.page.evaluate((rx) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && new RegExp(rx).test(x.textContent || ''));
    return b ? { text: b.textContent.trim(), disabled: !!b.disabled } : null;
  }, re);
  const tap = (P, re) => P.page.evaluate((rx) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && new RegExp(rx).test(x.textContent || ''));
    if (!b || b.disabled) return false; b.click(); return true;
  }, re);
  /* v2.3.2280: every trade state is a drawer on the band now -- the review
     screen was the last centred `.bt-inspect-card` and it moved. The card
     selector stays as a fallback so this scenario still reads a worker/client
     pair from before the move rather than reporting an empty string, which
     would fail as "no YOU GIVE" and point at the wrong thing. */
  const cardText = (P) => P.page.evaluate(() => {
    const c = document.querySelector('[data-trade-drawer]') || document.querySelector('.bt-inspect-card');
    return c ? (c.innerText || '').replace(/\s+/g, ' ').trim() : '';
  });

  rec.ok('stage one offers Ready, not Confirm', !!(await btn(A, 'Ready to trade')), await btn(A, 'Ready'));
  await tap(A, 'Ready to trade');
  await A.page.waitForTimeout(800);
  rec.ok('one side ready does NOT open the review screen',
    !/YOU GIVE/.test(await cardText(A)), (await cardText(A)).slice(0, 80));
  await tap(B, 'Ready to trade');
  await A.page.waitForTimeout(1200);

  const reviewA = await cardText(A);
  rec.ok('both ready opens the stripped-down review screen',
    /YOU GIVE/.test(reviewA) && /YOU RECEIVE/.test(reviewA), reviewA.slice(0, 140));
  /* Stripped-down is the safety property: if the bag tray or the gold field
     survived onto this screen, "what you read is what you accept" would be
     false. */
  /* v2.3.2293: anchored on CONTROLS, not on copy. Both halves of the old
     condition were about to be permanently true -- "tap to add" was removed
     with the explainers, and there has never been a `Send` button in this
     panel at all -- so this safety guard would have gone green forever while
     testing nothing. It now asks the question directly: does the review screen
     render anything you could change the offer with? */
  /* v2.3.2294: .bt-t2-sq joins the set -- the stepper and the remove ✕ are
     offer-changing controls every bit as much as a gold chip, and they were the
     one family this guard could not see. */
  const editableOnReview = await A.page.evaluate(() => !!document.querySelector(
    '[data-trade-drawer] button[data-gold-mode], [data-trade-drawer] .bt-t2-chip, '
    + '[data-trade-drawer] .bt-t2-sq, [data-trade-drawer] input'));
  rec.ok('...with nothing on it that can change the trade',
    editableOnReview === false, { editableOnReview, head: reviewA.slice(0, 140) });

  /* ═══ v2.3.2280: THE FORMAT NEVER JUMPS ═══
     Owner: "Yes bring the trade into the drawer too."  The review screen was
     the last state that flew to the middle of the screen behind a scrim, so
     one trade changed shape twice.  Asserted as BOTH halves -- the review
     content is inside the drawer marker AND no centred card exists anywhere
     -- because rendering the drawer while ALSO leaving the old card up would
     satisfy either half alone. */
  const reviewFrame = await A.page.evaluate(() => {
    const d = document.querySelector('[data-trade-drawer]');
    return {
      inDrawer: !!(d && /YOU GIVE/.test(d.innerText || '')),
      cards: document.querySelectorAll('.bt-inspect-card').length,
      bottom: d ? Math.round(d.getBoundingClientRect().bottom) : -1,
      /* the CSS fallback in the frame is 243px, so an unstamped var must
         resolve to the same number here or this measures the wrong seam */
      dashTop: Math.round(window.innerHeight - (parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 243)),
    };
  });
  rec.ok('the review screen renders in the band drawer, not a centred card',
    reviewFrame.inDrawer && reviewFrame.cards === 0, reviewFrame);
  /* It JOINS the band rather than floating over it -- the seam is the whole
     point of the drawer frame (left/right 6, bottom pinned to --dash-h). */
  rec.ok('...seated on the dashboard, not floating above it',
    Math.abs(reviewFrame.bottom - reviewFrame.dashTop) <= 2, reviewFrame);

  /* v2.3.2293: the footer that used to make this promise in words is gone, but
     the PROPERTY it described is the real one and stays pinned: the review
     screen is what you accept, so nothing under it may still stage. The bag's
     own tiles were wired to addOne and sit directly beneath the drawer where a
     thumb rests; the server would have caught the edit, but the screen would
     have been lying. */
  const bagOnReview = await A.page.evaluate(() =>
    !!(window.__broTradeBagBus && window.__broTradeBagBus.open));
  rec.ok('...and the bag lets go, so the footer\'s promise is true',
    bagOnReview === false, { bagOpen: bagOnReview });

  /* ═══ v2.3.2280: THE ✕ WAS A DEAD CONTROL HERE ═══
     requestLeave sets `leaveAsk`, and the review screen never rendered the
     leave-confirm strip -- so the scrim tap it was wired to did nothing at
     all, and Back was the only way off this screen.  Driven through the real
     button: ✕ asks, Keep Trading returns you to the SAME review screen (it
     must not have dropped a ready on the way). */
  const tapClose = (P) => P.page.evaluate(() => {
    /* v2.3.2290: .bt-t2-close -- the drawer's ✕ is the owner's painted button
       now. Accepts either class so the selector says what it means (the
       drawer's close control) rather than which skin was current. */
    const b = document.querySelector('[data-trade-drawer] .bt-t2-close, [data-trade-drawer] .bt-inspect-close');
    if (!b) return false; b.click(); return true;
  });
  rec.ok('the review screen has a ✕', await tapClose(A));
  await A.page.waitForTimeout(400);
  rec.ok('...and it asks before leaving instead of doing nothing',
    /Leave this trade\?/.test(await cardText(A)), (await cardText(A)).slice(0, 160));
  await tap(A, 'Keep Trading');
  await A.page.waitForTimeout(500);
  rec.ok('...Keep Trading puts you back on the review screen, still ready',
    /YOU GIVE/.test(await cardText(A)) && !/Leave this trade\?/.test(await cardText(A)),
    (await cardText(A)).slice(0, 120));
  /* An edit drags BOTH players out of review — the property that stops a
     last-second swap being accepted by someone reading a stale summary. */
  await tap(B, 'Back');
  await B.page.waitForTimeout(600);
  /* ═══ v2.3.1971: THIS SEND WAS GOING NOWHERE ═══
     `channel.send({type:'trade2_set', …})` matches NO branch of the
     channelShim (wsClient.js): the shim forwards a trade2 command only via
     its last branch, `msg.type === 'broadcast' && msg.event`, with the type
     riding in `event` — which is how the shipped Trade button sends it
     (InspectPlayerPanel.jsx).  A `{type:'trade2_set'}` object fell off the
     bottom of the shim and was dropped IN THE BROWSER; the worker never saw
     an edit, and the assertion below passed only because B's `Back` on the
     line above had already left the review screen for its own reasons.
     TRAPS #18 in its third form: the shim is the leg that goes missing.
     Corrected to the shape the game actually uses, so the edit lands and
     the anti-switch rule is what is being measured. */
  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'broadcast', event: 'trade2_set', payload: { offer: { _gold: 3 } } });
  });
  await A.page.waitForTimeout(1200);
  rec.ok('an edit drags BOTH players back off the review screen',
    !/YOU GIVE/.test(await cardText(A)), (await cardText(A)).slice(0, 80));

  /* ═══ v2.3.2294: THE PALETTE SWEEP ═══
     Owner: "make the sub container that holds the line items a light brown
     color. Make the other trader have a light gray color ... Maybe a different
     color than light brown and a light gray would work better but I want to
     see a preview."

     So the candidates are rendered HERE rather than mocked up somewhere else:
     this is the real drawer, in a real trade, with real staged items and gold
     under a real worker. A mockup cannot show you that the ✕ went pale on
     parchment or that the gold figure lost its ring -- the thing being chosen
     is legibility on the actual content, and the actual content only exists at
     this point in this scenario.

     IT RUNS HERE, after the edit above, and not beside the '1-offer'
     screenshot where it was first written. Up there the buyer's lane is still
     empty, so four of the five candidates would have shown the gray well as a
     bare strip reading "Nothing staged yet" -- a preview of the one state that
     cannot tell you whether the gray works under rows of items. B's 3 gold
     lands with that edit, so from this line on both wells have content in
     them.

     Only the WELL's own custom properties are overridden, which is the whole
     claim v2.3.2294 makes: a palette is one CSS rule and the ink comes with
     it, so a sweep like this needs no rebuild and no JS. The two deep-ramp
     entries exist because the richer browns drop the standard muted ink under
     AA (#45565C on #CBB894 is 3.95:1) -- they carry a darker ramp instead, and
     the sweep is the proof that swapping a ramp is also just this rule.

     These are screenshots, not assertions. The assertion is the last line: the
     sweep has to leave the shipped palette exactly as it found it, or every
     colour check below this point would be measuring whatever the last variant
     painted. */
  const DEEP = '--w-text:#0D171B;--w-text-2:#223238;--w-text-3:#38474C;'
    + '--w-gold:#593E0A;--w-btn-fg:#223238;--w-rarity-common:#38474C;'
    + '--w-rarity-elemental:#17408A;--w-rarity-fusion:#59178C;--w-rarity-shift:#593E0A;';
  const SKINS = [
    ['A-parchment-ash', '#DCCBA8', '#C6CBCC', ''],
    ['B-sand-mist',     '#E3D4B4', '#CFD5D7', ''],     /* shipped (owner's pick) */
    ['C-clay-stone',    '#D3BE9C', '#C2C7C6', DEEP],
    ['D-greige-steel',  '#D9C9B0', '#CBD0D0', ''],
    ['E-leather-ash',   '#CBB894', '#C6CBCC', DEEP],
  ];
  for (const [name, mine, theirs, deep] of SKINS) {
    await A.page.evaluate(([m, t, d]) => {
      let el = document.getElementById('qa-skin');
      if (!el) { el = document.createElement('style'); el.id = 'qa-skin'; document.head.appendChild(el); }
      /* [data-trade-drawer] prefixes lift specificity above game.css's own
         `.bt-t2-items` / `.bt-t2-lane--theirs .bt-t2-items` without !important,
         so what renders is a real cascade win rather than a special case. */
      el.textContent = '[data-trade-drawer] .bt-t2-items{--w-bg:' + m + ';' + d + '}'
        + '[data-trade-drawer] .bt-t2-lane--theirs .bt-t2-items{--w-bg:' + t + ';}';
    }, [mine, theirs, deep]);
    await A.page.waitForTimeout(90);
    const box = await A.page.evaluate(() => {
      const d = document.querySelector('[data-trade-drawer]');
      if (!d) return null;
      const r = d.getBoundingClientRect();
      return { x: Math.max(0, Math.floor(r.left) - 6), y: Math.max(0, Math.floor(r.top) - 6),
        width: Math.ceil(r.width) + 12, height: Math.ceil(r.height) + 12 };
    });
    await A.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/trade-skin-' + name + '.png',
      clip: box || undefined }).catch(() => {});
  }
  await A.page.evaluate(() => { const el = document.getElementById('qa-skin'); if (el) el.remove(); });
  await A.page.waitForTimeout(90);

  const skinBack = await A.page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).getPropertyValue('--w-bg').trim() : null;
    };
    return {
      mine: pick('[data-trade-drawer] .bt-t2-lane:not(.bt-t2-lane--theirs) .bt-t2-items'),
      theirs: pick('[data-trade-drawer] .bt-t2-lane--theirs .bt-t2-items'),
    };
  });
  rec.ok('the palette sweep put the shipped tints back -- brown on your well, '
    + 'gray on theirs', skinBack.mine === '#E3D4B4' && skinBack.theirs === '#CFD5D7', skinBack);

  /* ── the 2-3s delay, measured where it actually applies ──
     The cooldown runs from the last EDIT, so it has to be checked right after
     one.  The first cut asserted it immediately after both sides readied — by
     which point the last edit was many seconds back and the button was
     correctly already live, so the assertion was testing the clock rather than
     the rule.  Ready both again straight after the edit above and it is the
     real thing: this is the window a last-second swap would land in. */
  await tap(A, 'Ready to trade');
  await tap(B, 'Ready to trade');
  await A.page.waitForTimeout(900);
  /* THE COOLDOWN IS ASSERTED ON THE SERVER, NOT HERE.  Two attempts to catch
     the disabled button from the browser both raced it: the delay runs from
     the last EDIT, and simply getting both clients to ready costs a round
     trip each, so by the time the review screen renders the window has
     usually passed.  A test that sometimes observes the thing it is named
     after is worse than one that does not claim to — and the rule is
     enforced on the worker anyway, where trade2.test.mjs pins it directly
     ("an accept inside the cooldown is refused (last-second swap)").
     v2.3.2293: the follow-on assertion here pinned that the screen SAID so in
     words. That footer is gone with the rest of the explainers, and there is
     nothing left to assert about it -- the rule lives on the worker, where
     trade2.test.mjs already pins it. Removed rather than weakened. */
  const acceptBtn = await btn(A, '^(Accept|Wait)');
  rec.ok('...and the accept is either counting down or live, never missing',
    !!acceptBtn, acceptBtn);
  /* BOTH sides back to the offer stage, or the review screen (which has no
     gold field) is still up when the anti-switch step tries to edit. */
  /* ═══ v2.3.1971: BACK OUT ONE AT A TIME ═══
     These two taps used to fire with no wait between them, and that made the
     rest of the scenario a coin toss: A's Back un-readies A, the worker
     re-broadcasts, and B's review screen collapses to the offer stage — at
     which point B's `Back` button no longer exists and the tap is a no-op,
     leaving B READY.  The very next step readies A again, both flags are set,
     the pair snap straight back to review, and `Ready ✓` is never drawn —
     which is exactly how this failed ("readying locks the button to Ready ✓",
     then a 30 s timeout on the gold field, which the review screen does not
     have).  Awaiting each Back separately, and checking B actually left,
     makes the state deterministic instead of racing the echo. */
  /* ═══ v2.3.1971: THE SECOND PLAYER UN-READIES ON A DIFFERENT BUTTON ═══
     These two taps used to fire back to back on the same button name, and
     that is what made the rest of this scenario a coin toss.  `stage` is
     derived from BOTH ready flags (trade2.js `_t2Wire`), so the moment A
     backs out the review screen collapses for BOTH players — and with it B's
     `Back` button.  B's tap then matched nothing, B stayed READY on the
     worker, and the very next `tap(A, 'Ready to trade')` put the pair
     straight back on the review screen: no `Ready ✓`, then a 30 s timeout on
     the gold field that the review screen does not have.  Observed exactly
     that, twice, with A's card reading "Confirm with Buyer … Accept Back".
     The UI is not at fault and needs no change — at the offer stage the
     button becomes the toggle "Ready ✓ — waiting" (TradeWindowPanel.jsx:820,
     `ready: !iReady`), which is B's real way back.  Take whichever control is
     actually on screen, then assert BOTH flags really cleared by reading the
     buttons rather than the stage, since the stage hides B's flag. */
  const unready = async (P) => {
    if (await tap(P, '^Back$')) return 'back';
    if (await tap(P, 'Ready ✓')) return 'toggle';
    return 'none';
  };
  const aOut = await unready(A);
  await A.page.waitForTimeout(700);
  const bOut = await unready(B);
  await B.page.waitForTimeout(700);
  const readyMarks = await Promise.all([A, B].map((P) => P.page.evaluate(() =>
    [...document.querySelectorAll('button')].filter((b) => b.offsetParent)
      .some((b) => /Ready ✓/.test(b.textContent || '')))));
  rec.ok('both sides can leave the review stage and drop their ready',
    !/YOU GIVE/.test(await cardText(A)) && !readyMarks[0] && !readyMarks[1],
    { aOut, bOut, readyMarks, a: (await cardText(A)).slice(0, 60) });

  /* ── the staged offer must be visible ON B's SCREEN ── */
  /* An expression, not a function literal: page.evaluate given a STRING
     evaluates it as an expression, so `() => {...}` would just produce a
     function object and never run the check. */
  const crossed = await H.waitUi(B,
    `(() => { const l = (${LANE_FN})(); return !!(l && /100/.test(l.body || '')); })()`,
    { label: "B sees A's staged gold", timeout: 15000 }).then(() => true).catch(() => false);
  const lane = await otherLane(B);
  rec.ok("B's screen shows what A staged", crossed && /Gold/.test(lane?.body || ''), lane);

  /* ── A readies ── (v2.3.1754: Ready replaced Confirm as stage one) */
  await tap(A, 'Ready to trade');
  const locked = await H.waitUi(A, () => [...document.querySelectorAll('button')]
    .some((b) => /Ready ✓/.test(b.textContent)), { label: 'A ready locks', timeout: 12000 })
    .then(() => true).catch(() => false);
  /* v2.3.1971: say WHAT was on screen when this fails.  It reported a bare
     `undefined`, which tells the next reader nothing about whether the button
     was missing, disabled, or differently worded. */
  rec.ok('readying locks the button to "Ready ✓"', locked,
    locked ? undefined : await A.page.evaluate(() => ({
      buttons: [...document.querySelectorAll('button')].filter((b) => b.offsetParent)
        .map((b) => (b.textContent || '').trim() + (b.disabled ? ' [disabled]' : '')),
      card: ((document.querySelector('[data-trade-drawer]') || document.querySelector('.bt-inspect-card') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 200),
    })));

  /* ── ANTI-SWITCH: change the offer after readying; both readies reset ── */
  await goldInput.fill('120');
  await A.page.waitForTimeout(2000);
  const stillReady = await A.page.evaluate(() =>
    [...document.querySelectorAll('button')].some((b) => /Ready ✓/.test(b.textContent)));
  rec.ok('changing an offer resets the ready (anti-switch)', !stillReady, { stillReady });

  /* ── both ready, wait out the cooldown, then both accept on the review
        screen — the full two-stage path a player walks ── */
  await tap(A, 'Ready to trade');
  await tap(B, 'Ready to trade');
  await A.page.waitForTimeout(3200);
  /* The showcase frame: taken HERE rather than at the first review because
     this is the one where both lanes have something in them -- a give-only
     summary would show the owner half a trade. */
  await shot(A, '2-review');

  /* ═══ v2.3.2282: YOUR OWN PILE IS THE BOTTOM ONE, ON EVERY SCREEN ═══
     Owner: "swap places so that your 'you give' is on bottom and 'you receive'
     is on top ... This way it's consistent across all 3 trade windows that the
     player offer is on the bottom.  Also shade color the trade windows
     differently if it's yours versus the other players."

     Measured by SCREEN POSITION, not DOM index: "on the bottom" is a claim
     about where the player's thumb finds it, and a flex/order rule could
     satisfy one and not the other.

     The lanes are found by their heading text and the well is the heading's
     next sibling -- the same shape the live-drawer reader below uses, and the
     structure the panel comments now warn against breaking. */
  const laneGeom = (P, topRe, bottomRe) => P.page.evaluate(([tRe, bRe]) => {
    const find = (rx) => {
      const re = new RegExp(rx, 'i');
      /* v2.3.2292: the label is a .bt-t2-lane-name SPAN on the review and
         receipt screens now (it shares its header with a face), so the old
         leaf-DIV finder matched nothing and every lane read came back null.
         Both shapes are tried -- the class first, then the leaf div for any
         screen still using a bare title. */
      const el = [...document.querySelectorAll('[data-trade-drawer] .bt-t2-lane-name')]
        .find((d) => re.test((d.textContent || '').trim()))
        || [...document.querySelectorAll('[data-trade-drawer] div')]
          .find((d) => d.children.length === 0 && re.test((d.textContent || '').trim()));
      if (!el) return null;
      /* v2.3.2290: find the LANE by class, not by "which of these has a
         background". With the owner's painted frame NONE of them does -- the
         fill is border-image art -- so the old walk fell straight through to
         nextElementSibling and would have measured the row list on both
         screens, reporting two identical blanks as a passing difference.
         The review screen's title sits INSIDE its lane and the receipt's sits
         above it, so both shapes are tried explicitly. */
      const sib = el.nextElementSibling;
      const cand = el.closest('.bt-t2-lane')
        || (sib && sib.classList && sib.classList.contains('bt-t2-lane') ? sib : null);
      if (!cand) return null;
      const r = cand.getBoundingClientRect();
      const cs = getComputedStyle(cand);
      const items = cand.querySelector('.bt-t2-items');
      return { top: Math.round(r.top), bg: cs.backgroundColor, shadow: cs.boxShadow,
        well: items ? getComputedStyle(items).backgroundColor : null };
    };
    return { top: find(tRe), bottom: find(bRe) };
  }, [topRe, bottomRe]);


  const revGeom = await laneGeom(A, 'YOU RECEIVE', 'YOU GIVE');
  rec.ok('Confirm screen: YOU RECEIVE is above YOU GIVE, so your own pile is '
    + 'the bottom one', !!(revGeom.top && revGeom.bottom)
    && revGeom.top.top < revGeom.bottom.top, revGeom);
  rec.ok('...and YOUR lane carries the your-side shading, not just a different one',
    laneOk(revGeom), revGeom);

  /* ═══ THE ANTI-SCAM COLOUR CODING, WHICH THIS CHANGE PUT AT RISK ═══
     `side()` takes tone and well as POSITIONAL arguments, and this change
     reordered its two call sites. Swapping the lines without moving the
     arguments would paint YOU GIVE green and YOU RECEIVE red -- inverting
     v2.3.1754's whole point while looking, in a diff, exactly like a
     reorder. Nothing in this file read a foreground colour before, so that
     inversion was invisible to the suite. */
  const revTone = await A.page.evaluate(() => {
    const pick = (rx) => {
      const el = [...document.querySelectorAll('[data-trade-drawer] .bt-t2-lane-name')]
        .find((d) => rx.test((d.textContent || '').trim()))
        || [...document.querySelectorAll('[data-trade-drawer] div')]
          .find((d) => d.children.length === 0 && rx.test((d.textContent || '').trim()));
      return el ? getComputedStyle(el).color : null;
    };
    return { receive: pick(/^YOU RECEIVE$/), give: pick(/^YOU GIVE$/) };
  });
  /* v2.3.2283: green became the DARK green of the inverted ramp
     (--ui-positive-on-invert #1C5A40) -- #55B98A is 1.56:1 on the light card.
     YOU GIVE is unchanged: its lane is still dark. */
  rec.ok('YOU RECEIVE is still green and YOU GIVE still red after the reorder',
    revTone.receive === 'rgb(28, 90, 64)' && revTone.give === 'rgb(216, 99, 93)', revTone);
  rec.ok('...and the Confirm screen tints its two wells the same way round as '
    + 'the live one', wellOk(revGeom), revGeom);

  /* ═══ v2.3.2294: THE CONFIRM SCREEN'S INK, WHICH NOTHING EVER READ ═══
     inkEmpty and inkMine probe the live drawer and inkFull the receipt; the
     screen in between -- the one whose entire job is to be READ carefully
     before you consent -- has never had a single colour of its own measured.
     It is not a copy of the other two either: `side()` renders its own
     .bt-t2-items with its own line-item and gold-figure markup, so it is the
     one surface where a well ink can be wrong on its own. Both lanes, because
     this screen is where they sit closest together. */
  const inkRevMine = await inkProbe(A, '^YOU GIVE$');
  const inkRevTheirs = await inkProbe(A, '^YOU RECEIVE$');
  rec.ok('the Confirm screen reads: every figure on both wells clears AA '
    + 'against the tint it is standing on',
    inkOk(inkRevMine) && inkOk(inkRevTheirs),
    { give: inkDbg(inkRevMine), receive: inkDbg(inkRevTheirs) });

  /* ═══ v2.3.2280: THE BELL STANDS DOWN WITH THE REST OF THE CHAT ═══
     Owner: "Chat should always be the bottom layer if any menus open up
     beside it."  The shut chat corner is a 36px bell pinned to
     bottom:--dash-h+8 -- the same lower-left corner a band drawer's footer
     occupies -- and it lives OUTSIDE .brotown-wrap, so it paints over an
     in-wrap panel whatever the z-ladder says. Seen doing exactly that in the
     first drawer screenshot, across the Confirm screen's "Nothing on this
     screen can change the trade" line.
     Both halves asserted: invisible AND not taking the tap, because an
     invisible control that still swallows a tap is the worse of the two. */
  const bell = await A.page.evaluate(() => {
    const shell = document.querySelector('[data-world-chat]');
    if (!shell) return { shell: false };
    const btn = shell.querySelector('button');
    const r = btn && btn.getBoundingClientRect();
    return {
      shell: true,
      opacity: parseFloat(getComputedStyle(shell).opacity),
      taps: btn ? getComputedStyle(btn).pointerEvents : 'no-button',
      /* what the browser actually hands a finger at the bell's centre */
      hit: r && r.width ? (document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) || {}).tagName : null,
      overFooter: !!(r && r.width && document.querySelector('[data-trade-drawer]')
        && r.top < document.querySelector('[data-trade-drawer]').getBoundingClientRect().bottom),
    };
  });
  rec.ok('the chat bell stands down while the trade drawer owns the screen',
    bell.shell && bell.opacity === 0 && bell.taps === 'none', bell);

  await tap(A, '^Accept');
  await A.page.waitForTimeout(800);
  await tap(B, '^Accept');

  /* ── settlement ── */
  const done = await H.waitUi(A, () => /Trade complete/.test(document.body.innerText),
    { label: 'A sees Trade complete', timeout: 25000 }).then(() => true).catch(() => false);
  /* v2.3.2149: diagnostics on FAILURE only. Worth keeping: when this went red
     during the drawer rework the useful fact was not "no Trade complete" but
     that there were no visible buttons AT ALL and a React #300 in the log --
     a hooks-order crash taking the whole UI down. Without this the failure
     looked like a missing string. */
  const settleDbg = done ? null : await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return {
      state: S && S.trade2 ? S.trade2.state : (S ? 'no-trade2' : 'no-state'),
      hasReceipt: !!(S && S.trade2 && S.trade2.receipt),
      drawer: !!document.querySelector('[data-trade-drawer]'),
      card: !!document.querySelector('.bt-inspect-card'),
      buttons: [...document.querySelectorAll('button')].filter((b) => b.offsetParent)
        .map((b) => (b.textContent || '').trim()).slice(0, 14),
    };
  });
  rec.ok('the trade completes', done,
    settleDbg ? { ...settleDbg, pageErrors: (A.logs || []).slice(-4) } : null);
  /* Immediately: the receipt closes itself ~2800ms after it appears. */
  await shot(A, '3-receipt');
  const recGeom = await laneGeom(A, '^You received$', '^You sent$');
  rec.ok('receipt: You received is above You sent, so your own pile is the '
    + 'bottom one here too', !!(recGeom.top && recGeom.bottom)
    && recGeom.top.top < recGeom.bottom.top, recGeom);
  /* This one names the other two screens, so it has to actually compare
     against them rather than against itself. */
  /* The live-drawer read above happens while the buyer's lane is still EMPTY,
     so it only ever sees one word. The receipt's buyer lane carries a real
     row -- a glyph plate, a label and a gold figure -- and the gold figure is
     the ink most likely to be missed, because #D8A94D and #D8AA58 are
     near-duplicates and a find-and-replace catches only one of them. */
  const inkFull = await inkProbe(A, '^You received$');
  rec.ok("...and with real rows in it, not just the empty-lane word",
    inkOk(inkFull, 2), inkDbg(inkFull));

  /* v2.3.2294: the wells joined the lanes in this comparison. "Shaded the same
     way round as the other two screens" is a claim about what the player sees,
     and half of what they see is now the tint inside the lane -- a receipt that
     agreed on lanes while disagreeing on wells would satisfy the old form of
     this check completely. */
  rec.ok('...and shaded the same way round as the other two screens, wells '
    + 'included',
    laneOk(recGeom) && laneOk(revGeom) && laneOk(liveGeom)
    && wellOk(recGeom) && wellOk(revGeom) && wellOk(liveGeom)
    && recGeom.bottom.bg === revGeom.bottom.bg && recGeom.bottom.bg === liveGeom.bottom.bg
    && recGeom.top.bg === revGeom.top.bg && recGeom.top.bg === liveGeom.top.bg
    && recGeom.bottom.well === liveGeom.bottom.well && recGeom.top.well === liveGeom.top.well,
    { receipt: recGeom, review: revGeom, live: liveGeom });

  /* ═══ v2.3.2294: WHO YOU TRADED WITH, ON THE LAST SCREEN TOO ═══
     The owner asked for the two traders' faces to be carried "through the
     trade menus" (v2.3.2292), and the receipt was quietly the one screen that
     did not. Every trade2 state carries a/b except 'done', which gameEvents.js
     builds fresh around the receipt object -- so the panel's
     `trade2.a === myId ? trade2.b : trade2.a` came back undefined there and
     Face fell through to its unknown-person '?'. Invisible to this suite for
     two versions, because a face is not text and nothing here had ever read
     one; visible in the receipt screenshot the moment anyone looked at it.
     BOTH lanes are checked, not just the one that was broken: your own side
     reads from portraitStore and would fail exactly the same way if that ever
     came back empty. */
  const f3 = await faces();
  const recTheirs = Object.keys(f3).find((k) => /^You received$/i.test(k));
  const recMine = Object.keys(f3).find((k) => /^You sent$/i.test(k));
  rec.ok('the receipt is headed by two real portraits too, not the '
    + 'unknown-person letter tile',
    !!recTheirs && !!recMine && f3[recTheirs].real && f3[recMine].real
      && !f3[recTheirs].letter && !f3[recMine].letter, f3);
  /* The half that actually pins the fix. Restoring only the NAME to the receipt
     clears the check above's sibling on the live screen and clears the '?', yet
     leaves the portrait missing -- a receipt that still looks unlike the two
     screens before it. So the claim is equality with what the live window drew,
     fingerprint and all: the same person, drawn the same way, on all three
     screens. f1 is the live drawer's reading of the same two chips. */
  rec.ok('...and they are the same two faces the live window drew, not a '
    + 'thinner fallback the receipt settled for',
    !!recTheirs && !!recMine && !!theirKey && !!mineKey
    && f3[recTheirs].sig === f1[theirKey].sig
    && f3[recMine].sig === f1[mineKey].sig,
    { receipt: { theirs: f3[recTheirs], mine: f3[recMine] },
      live: { theirs: f1[theirKey], mine: f1[mineKey] } });

  await A.page.waitForTimeout(3000);
  const aCoins1 = await coins(A), bCoins1 = await coins(B);
  const aWood1 = await wood(A), bWood1 = await wood(B);
  /* ═══ v2.3.1971: BOTH LANES OF THE SWAP, AND THE SUM ═══
     A gives 120; B gives the 3 gold B staged during the anti-switch step
     above — which only started actually reaching the worker once that send
     was fixed to the shape the channelShim forwards.  So the net is 117,
     not 120, and the old one-sided expectation was reading a trade that had
     never had a second side.  Asserting the NET both ways, plus the sum,
     because a duplication bug shows up in the sum and nowhere else: a
     one-sided check passes just as happily when the coins are minted as
     when they are moved. */
  const B_STAKE = 3, A_STAKE = 120;
  rec.ok('gold moved BOTH ways — A gives 120, B gives 3',
    aCoins1 === aCoins0 - A_STAKE + B_STAKE && bCoins1 === bCoins0 + A_STAKE - B_STAKE,
    { aCoins0, aCoins1, bCoins0, bCoins1, expectA: aCoins0 - A_STAKE + B_STAKE, expectB: bCoins0 + A_STAKE - B_STAKE });
  rec.ok('...and no coin was minted or eaten: the two purses still sum the same',
    aCoins1 + bCoins1 === aCoins0 + bCoins0,
    { before: aCoins0 + bCoins0, after: aCoins1 + bCoins1 });
  rec.ok('the item actually moved A -> B', aWood1 === aWood0 - 1 && bWood1 === 1,
    { aWood0, aWood1, bWood1 });
  rec.ok('...and the logs sum the same too', aWood1 + bWood1 === aWood0,
    { before: aWood0, after: aWood1 + bWood1 });

  await A.ctx.close(); await B.ctx.close();
}
