/* ═══ mp-questwin (v2.3.3030): THE QUEST WINDOWS IN THE OWNER'S PAINTED ART ═══
 *
 * Owner, with three sheets of frames, buttons and ornaments and a mockup of
 * the flow: "Add these for the new quest windows."
 * (src/ui/panels/questArt.jsx, QuestOfferPanel.jsx, QuestBannerLayer.jsx,
 * game/questFly.js; the art cut by tools/ui/cut-quest-art.sh.)
 *
 * On a phone, through the real first quest, with real finger taps:
 *   1. the NEW QUEST window is the owner's framed panel -- all ten frame
 *      pieces drawn and decoded, no CSS filter anywhere (TRAPS §42), the
 *      hand-over and finishing items each in a painted slot;
 *   2. accepting raises QUEST ACCEPTED! on the thin glowing banner, OUT of
 *      .brotown-wrap (a sibling of the window's scrim, so its z-index means
 *      what it says);
 *   3. the CLAIM window (only because there is a choice: where the XP goes):
 *      QUEST COMPLETE, +25 Gold / +30 XP with the HUD's pictures, the bow and
 *      the staff in their slots, the three skill chips, the claim GREY until a
 *      chip is chosen and gold after, the chosen chip in the gold ring;
 *   4. a tap on the claim turns the window into the CONFIRMATION -- "Rewards
 *      claimed!", the slots glowing, "+30 XP to Bow" -- with QUEST COMPLETE!
 *      at the top of the screen and not over the window, the coins flying to
 *      the purse and the items to the bag, and after it his next quest;
 *   5. the worker paid it (the bow XP named, the gold);
 *   6. the auto reward's banner (nothing to choose) wears the laurel check;
 *   7. sideways, the window fits a 390px-tall screen with its button on it.
 * Pictures of each step in tools/qa/mp/out/questwin-after-*.png (and, run
 * against an older build with QA_DIST, questwin-before-*.png).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out`;
/* run against another build (QA_DIST) it takes the same pictures as "before" */
const TAG = process.env.QUESTWIN_TAG || (process.env.QA_DIST ? 'before' : 'after');

/* A real finger (CDP): the browser hit-tests it, as a phone does. */
async function tap(P, sel) {
  const c = await P.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!c) return false;
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 5 }] });
  await P.page.waitForTimeout(70);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  return true;
}

/* everything about the window a picture cannot be asked */
const win = (P) => P.page.evaluate(() => {
  const w = document.querySelector('.bt-qoffer') || document.querySelector('[data-qw-stage="done"] .bt-qw');
  if (!w) return null;
  const r = w.getBoundingClientRect();
  const imgs = [...w.querySelectorAll('img')];
  const frame = [...w.querySelectorAll('.bt-qw-f')];
  const filtered = [w, ...w.querySelectorAll('*')].filter((n) => {
    const cs = getComputedStyle(n);
    return (cs.filter && cs.filter !== 'none') || (cs.backdropFilter && cs.backdropFilter !== 'none');
  }).length;
  const claim = w.querySelector('.bt-quest-turnin, [data-tut="qoffer-confirm"]');
  const claimArt = claim && claim.querySelector('.bt-qw-claim-art');
  return {
    top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right),
    vw: innerWidth, vh: innerHeight,
    frame: frame.length, frameOk: frame.every((i) => i.complete && i.naturalWidth > 0),
    imgsOk: imgs.every((i) => i.complete && i.naturalWidth > 0 || i.style.display === 'none'),
    filtered,
    kicker: (w.querySelector('.bt-qw-kicker') || {}).textContent || '',
    title: (w.querySelector('.bt-qw-title') || {}).textContent || '',
    gold: (w.querySelector('[data-qw-gold]') || {}).textContent || '',
    xp: (w.querySelector('[data-qw-xp]') || {}).textContent || '',
    groups: [...w.querySelectorAll('[data-gives]')].map((g) => ({
      when: g.getAttribute('data-gives'),
      items: [...g.querySelectorAll('.bt-qw-slot-icon')].map((i) => (i.getAttribute('src') || '').replace(/^.*\//, '')),
      slots: g.querySelectorAll('.bt-qw-slot').length,
    })),
    chips: [...w.querySelectorAll('[data-xp-skill]')].map((b) => ({
      skill: b.getAttribute('data-xp-skill'), on: b.getAttribute('aria-pressed') === 'true',
      ring: !!b.querySelector('.bt-qw-chip-ring'), text: b.textContent.trim(),
    })),
    claim: claim ? { off: claim.getAttribute('aria-disabled') === 'true', art: claimArt ? (claimArt.getAttribute('src') || '').replace(/^.*\//, '') : null,
      text: claim.textContent.trim() } : null,
    done: !!w.closest('[data-qw-stage="done"]'),
    claimed: (w.querySelector('[data-qw-claimed]') || {}).textContent || '',
    glow: w.querySelectorAll('.bt-qw-slot--glow').length,
    xpline: (w.querySelector('[data-qw-xpline]') || {}).textContent || '',
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, {
    name: 'Painter', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 3,
  });
  /* Closed at the end whatever happens: a 3x page left running starves the
     next scenario (mp-btnskin's lesson). */
  try {
    await body(P, wsPort, rec);
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

async function body(P, wsPort, rec) {
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const myId = await H.readState(P, (S) => S.myId);
  const srv = () => H.adminPlayer(wsPort, myId).then((a) => (a && a.rpg) || null).catch(() => null);
  const shot = (name) => P.page.screenshot({ path: `${OUT}/questwin-${TAG}-${name}.png` }).catch(() => {});

  /* every banner, sampled the moment it is inserted (mp-questbanner's way) */
  await P.page.evaluate(() => {
    window.__qw = [];
    const seen = new WeakSet();
    const scan = () => document.querySelectorAll('.bt-quest-banner').forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      requestAnimationFrame(() => {
        const b = el.querySelector('.bt-qw-banner');
        const art = el.querySelector('.bt-qw-banner-art');
        const r = (b || el).getBoundingClientRect();
        const w = document.querySelector('.bt-qoffer, [data-qw-stage="done"] .bt-qw');
        const wr = w ? w.getBoundingClientRect() : null;
        window.__qw.push({
          kind: el.getAttribute('data-quest-banner'),
          cls: b ? b.className : '',
          art: art ? (art.getAttribute('src') || '').replace(/^.*\//, '') : null,
          text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
          inWrap: !!el.closest('.brotown-wrap'),
          top: Math.round(r.top), bottom: Math.round(r.bottom),
          winTop: wr ? Math.round(wr.top) : null,
        });
      });
    });
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  });

  /* walk up to Mayor Bro (mp-questbanner's approach: out of his latch, back in) */
  const place = (dx, dy) => P.page.evaluate(({ ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return true;
  }, { ox: dx, oy: dy });
  const approach = async () => {
    await place(420, 0);
    await P.page.waitForTimeout(500);
    await H.closeNpcDialogue(P).catch(() => {});
    await place(0, 34);
    await P.page.waitForTimeout(1100);
    return H.npcDialogueOpen(P);
  };

  /* ── 1. the offer ── */
  rec.ok('walking up to Mayor Bro opens his dialogue (guard)', await approach());
  const landed = await H.advanceNpcDialogue(P);
  rec.ok('...and his lines lead to the NEW QUEST window (guard)', landed === 'offer', { landed });
  await P.page.waitForTimeout(500);
  const O = await win(P);
  await shot('offer');
  console.log('    QUESTWIN offer: ' + JSON.stringify(O));
  rec.ok('the window is the owner\'s framed panel: all ten frame pieces, drawn and decoded',
    !!O && O.frame === 11 && O.frameOk, O && { frame: O.frame, ok: O.frameOk });
  rec.ok('...every picture in it decoded', !!O && O.imgsOk, O);
  rec.ok('...and not one CSS filter in it (iOS grain, TRAPS §42)', !!O && O.filtered === 0, O && O.filtered);
  rec.ok('...titled NEW QUEST / Cold Reception', !!O && /new quest/i.test(O.kicker) && /Cold Reception/.test(O.title), O && { k: O.kicker, t: O.title });
  const gAcc = O && O.groups.find((g) => g.when === 'accept');
  const gFin = O && O.groups.find((g) => g.when === 'complete');
  rec.ok('...the hand-over (sword, shield) and the finishing (bow, staff) items, each in a painted slot',
    !!gAcc && !!gFin && gAcc.slots === 2 && gFin.slots === 2
      && gAcc.items.some((s) => /great-sword-copper/.test(s)) && gFin.items.some((s) => /^bow\./.test(s)) && gFin.items.some((s) => /^staff\./.test(s)),
    O && O.groups);
  rec.ok('...and its button is the owner\'s gold bar, saying Accept Quest',
    !!O && !!O.claim && O.claim.art === 'claim.webp' && /Accept Quest/.test(O.claim.text), O && O.claim);

  /* ── 2. accept ── */
  const accepted = await tap(P, '[data-tut="qoffer-confirm"]');
  rec.ok('a finger on Accept Quest (guard)', accepted);
  await P.page.waitForTimeout(700);
  await shot('accepted');
  const bA = (await P.page.evaluate(() => window.__qw.slice())).find((b) => b.kind === 'accepted');
  console.log('    QUESTWIN accepted banner: ' + JSON.stringify(bA));
  rec.ok('accepting raises QUEST ACCEPTED! on the thin glowing banner',
    !!bA && /QUEST ACCEPTED/.test(bA.text) && bA.art === 'banner-compact.webp', bA);
  rec.ok('...drawn OUT of .brotown-wrap, beside the window\'s scrim (its z-index means what it says)',
    !!bA && bA.inWrap === false, bA);
  const srvA = await srv();
  rec.ok('the WORKER has the quest active (guard)', !!srvA && (srvA._quests || {}).tut_1 === 'active', srvA && srvA._quests);
  await H.closeNpcDialogue(P).catch(() => {});

  /* ── 3. the claim window ── */
  const before = await srv();
  await H.grant(wsPort, myId, 'item', { invKey: 'snowman', count: 4 });
  await P.page.waitForTimeout(1600);
  rec.ok('back at Mayor Bro with the remnants (guard)', await approach());
  const landedBack = await H.advanceNpcDialogue(P);
  rec.ok('...his lines lead to the CLAIM window, as there is a choice to make (guard)', landedBack === 'offer', { landedBack });
  await P.page.waitForTimeout(500);
  const C = await win(P);
  await shot('choose');
  console.log('    QUESTWIN choose: ' + JSON.stringify(C));
  rec.ok('the claim window: QUEST COMPLETE / Cold Reception', !!C && /quest complete/i.test(C.kicker) && /Cold Reception/.test(C.title), C && { k: C.kicker, t: C.title });
  rec.ok('...paying +25 Gold and +30 XP, with the HUD\'s coin and XP pictures',
    !!C && /\+25 Gold/.test(C.gold) && /\+30 XP/.test(C.xp), C && { g: C.gold, x: C.xp });
  const cFin = C && C.groups.find((g) => g.when === 'complete');
  rec.ok('...the bow and the staff, each in its slot',
    !!cFin && cFin.slots === 2 && cFin.items.some((s) => /^bow\./.test(s)) && cFin.items.some((s) => /^staff\./.test(s)), C && C.groups);
  rec.ok('...the three skill chips, none chosen',
    !!C && C.chips.length === 3 && C.chips.every((c) => !c.on && !c.ring)
      && C.chips.map((c) => c.text).join() === 'Melee,Bow,Magic', C && C.chips);
  rec.ok('...and the claim GREY (the owner\'s grey bar) until one is',
    !!C && !!C.claim && C.claim.off && C.claim.art === 'claim-off.webp', C && C.claim);
  rec.ok('...the frame complete and unfiltered here too', !!C && C.frame === 11 && C.frameOk && C.filtered === 0, C);

  await tap(P, '[data-xp-skill="bow"]');
  await P.page.waitForTimeout(350);
  const D = await win(P);
  await shot('chosen');
  const bow = D && D.chips.find((c) => c.skill === 'bow');
  rec.ok('a finger on Bow chooses it: the gold ring and check over it, only it',
    !!bow && bow.on && bow.ring && D.chips.filter((c) => c.ring).length === 1, D && D.chips);
  rec.ok('...and the claim turns gold', !!D && !!D.claim && !D.claim.off && D.claim.art === 'claim.webp', D && D.claim);

  /* ── 4. claim: the confirmation ── */
  const claimedTap = await tap(P, 'button.bt-quest-turnin');
  rec.ok('a finger on Claim Rewards (guard)', claimedTap);
  await P.page.waitForTimeout(450);
  const E = await win(P);
  await shot('claimed');
  console.log('    QUESTWIN claimed: ' + JSON.stringify(E));
  rec.ok('the window becomes the confirmation: "Rewards claimed!"',
    !!E && E.done && /rewards claimed/i.test(E.claimed), E && { done: E.done, c: E.claimed });
  rec.ok('...the rewards in glowing slots, and where the XP went',
    !!E && E.glow === 2 && /\+30 XP to Bow/.test(E.xpline), E && { glow: E.glow, xp: E.xpline });
  rec.ok('...with nothing on it to press again (no claim button)', !!E && !E.claim, E && E.claim);
  await P.page.waitForTimeout(250);
  const bC = (await P.page.evaluate(() => window.__qw.slice())).find((b) => b.kind === 'completed');
  console.log('    QUESTWIN completed banner: ' + JSON.stringify(bC));
  rec.ok('QUEST COMPLETE! rises on the glowing banner, the smaller one at the top while the window is up',
    !!bC && /QUEST COMPLETE/.test(bC.text) && bC.art === 'banner.webp' && /bt-qw-banner--compact/.test(bC.cls), bC);
  rec.ok('...above the confirmation, not over it', !!bC && bC.winTop != null && bC.bottom <= bC.winTop + 2, bC);
  rec.ok('...out of .brotown-wrap', !!bC && bC.inWrap === false, bC);

  /* the flights: coins to the purse, items to the bag */
  await P.page.waitForTimeout(1200);
  const F = await P.page.evaluate(() => window.__btQuestFly || null);
  console.log('    QUESTWIN flights: ' + JSON.stringify(F));
  rec.ok('the coins fly to the purse and the bow and staff to the bag (3 + 2 pictures), and all land',
    !!F && F.flown >= 5 && F.landed === F.flown
      && F.last.some((l) => l.kind === 'gold' && l.to === 'purse') && F.last.some((l) => l.kind === 'item'), F);

  /* and then his next quest */
  await P.page.waitForTimeout(1200);
  const after = await P.page.evaluate(() => ({
    done: !!document.querySelector('[data-qw-stage="done"]'),
    dialogue: !!document.querySelector('.bt-npcdlg'),
    offer: !!document.querySelector('.bt-qoffer'),
  }));
  rec.ok('...and a moment later he is offering his next quest', !after.done && (after.dialogue || after.offer), after);

  /* ── 5. the worker paid it ── */
  const paid = await srv();
  rec.ok('the WORKER turned it in and paid the gold',
    !!paid && (paid._quests || {}).tut_1 === 'turnedIn' && (paid.coins || 0) - ((before && before.coins) || 0) === 25,
    paid && { q: paid._quests, coins: paid.coins, was: before && before.coins });

  /* ── 6. the auto reward's banner ── */
  await P.page.evaluate(() => window._setQuestMsg && window._setQuestMsg({ kind: 'completed', title: 'Gather Copper', gold: 40, xp: 0, auto: true, ts: Date.now() }));
  await P.page.waitForTimeout(700);
  const auto = await P.page.evaluate(() => {
    const b = document.querySelector('.bt-quest-banner .bt-qw-banner');
    const badge = b && b.querySelector('.bt-qw-banner-badge');
    return { cls: b ? b.className : null, badge: !!badge && badge.complete && badge.naturalWidth > 0 };
  });
  await shot('auto');
  rec.ok('the auto reward\'s banner (nothing to choose) wears the laurel check on its crest',
    /bt-qw-banner--auto/.test(auto.cls || '') && auto.badge, auto);
  await P.page.evaluate(() => window._setQuestMsg && window._setQuestMsg(null));

  /* ── 7. sideways ── */
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(1200);
  await H.advanceNpcDialogue(P);
  await P.page.waitForTimeout(500);
  const L = await win(P);
  await shot('sideways');
  console.log('    QUESTWIN sideways: ' + JSON.stringify(L));
  rec.ok('sideways the window fits the 390px-tall screen, its button on it',
    !!L && L.top >= 0 && L.bottom <= L.vh && !!L.claim, L);

  rec.ok('no page errors through all of it', errs.length === 0, errs);
}
