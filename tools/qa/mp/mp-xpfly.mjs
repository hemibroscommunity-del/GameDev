/* THE XP LEAVES THE CHARACTER AND LANDS ON ITS SKILL (v2.3.1874).
 *
 * v2.3.4191: the skill tiles left the Gear tab for the Bro page, so the
 * flight is tested in its two homes: with the Bro tab open it lands on that
 * skill's Bro tile (1-4 below, unchanged), and with it closed (the band at
 * rest on the Gear tab) it lands in the top bar's XP number (5) -- never
 * floating and fading in place.
 *
 * Owner: "When you kill a monster or complete a quest show the combat skill
 * xp over the character then have the xp jump down into whatever combat skill
 * earned the xp and increase the number in a quick count up."
 *
 * Four separable claims, and a test that only checked "a label appeared"
 * would pass on three of them being broken:
 *
 *   1. it STARTS OVER THE CHARACTER — not in a corner, which is the exact
 *      defect v2.3.1638 was written to fix and then re-introduced by
 *      anchoring to a bar instead;
 *   2. it TRAVELS — start and end are different places, and it ends near the
 *      card rather than wherever it began;
 *   3. it lands on the RIGHT card — the skill that earned the XP, which for a
 *      quest is the one picked at turn-in and NOT the equipped weapon;
 *   4. the number COUNTS UP rather than jumping — which means it must be
 *      observed at an intermediate value, not merely correct at the end.
 *
 * (4) is the one that needs care.  prog3 XP is server-authoritative, so the
 * live number can change before the label lands; the whole hold-then-ease
 * mechanism exists for that, and the assertion below is specifically that the
 * displayed number is still the OLD one while the label is in the air.
 */
import * as H from './harness.mjs';

const probe = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const pops = (S._hudPopups || []).filter((p) => (p.target || 'xpBar') === 'xpBar');
  /* v2.3.4151: + a real <button> -- the Gear tab's Melee / Bow / Magic tiles
     (GearTab.jsx), which took the combat cards' place and their XP landing */
  const els = [...document.querySelectorAll('[role="button"][aria-label*="level"], button[aria-label*="level"]')]
    .filter((el) => /^(Melee|Bow|Magic) level/i.test(el.getAttribute('aria-label') || ''));
  const cards = els.map((el) => {
    const r = el.getBoundingClientRect();
    return { label: el.getAttribute('aria-label'), cx: r.left + r.width / 2, cy: r.top + r.height / 2,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim() };
  });
  /* the flying labels themselves, by their text */
  /* By its own attribute, not by matching text across every div: the first
     cut did the latter and picked different elements on different samples,
     which read as "the label barely moved". */
  const flying = [...document.querySelectorAll('[data-xpfly]')]
    .map((d) => { const r = d.getBoundingClientRect(); return { text: (d.textContent || '').trim(), cat: d.getAttribute('data-xpfly'), x: r.left + r.width / 2, y: r.top + r.height / 2, opacity: +getComputedStyle(d).opacity }; });
  let player = null;
  try {
    const cv = document.querySelector('canvas'); const r = cv.getBoundingClientRect();
    player = { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1),
               y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
  } catch (e) {}
  return { pops: pops.map((p) => ({ text: p.text, cat: p.cat, from: p.from })), cards, flying, player };
});

/* Every gain below goes through the real entry point (window.__btPushXp), so
   this exercises the shipped pushHudPopup (cat resolution, world anchor and
   all) rather than a fixture.  v2.3.3399: from inside the page, where the
   look that follows it is taken (section 1). */

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Gainer', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3500);
  /* v2.3.4191: every flight and its count-up stretched x5 (XpFlyOverlay
     flySlow, xpLanding qaSlow): this box draws a few frames a second, and
     sampling a 0.9 s flight at 35 ms caught three frames of it -- the same
     two checks failed on main (TRAPS §200: time by the page's own clock) */
  await P.page.evaluate(() => { window.__btXpFlySlow = 5; });
  /* v2.3.3399: the dashboard opened.  A first join arrives with it folded
     (v2.3.2495), and a folded band draws no columns, so the three combat
     cards the XP flies to were not on screen at all (the sweep of
     2026-10-18), as in mp-infopop. */
  await H.unfoldBand(P);
  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) {} });
  await P.page.waitForTimeout(600);
  /* v2.3.4191: the Bro tab, where the three combat skills' tiles are */
  await P.page.evaluate(() => { try { window.__btHeroSection.request('Card'); } catch (e) {} window.__broDashPanelBus.open('hero'); });
  await P.page.waitForTimeout(1200);

  const base = await probe(P);
  rec.ok('the three combat cards are on screen (guard)', base.cards.length === 3, base.cards);
  rec.ok('the flight helper is exposed for the test (guard)',
    await P.page.evaluate(() => typeof window.__btPushXp === 'function'), {});
  if (base.cards.length !== 3) { await P.ctx.close().catch(() => {}); return; }

  /* ── 1. it starts over the character ──
     v2.3.3399: pushed and first looked at in ONE evaluate, on the first frame
     that draws it, as the flight below is (its note says why).  Across the
     wire the look came 200+ ms late on this box, the label well up its lift,
     and 73.5 px over the player read as "not over them" (the sweep of
     2026-10-18).  And "over" is the column above them, as high as the label
     can be in its lift: it starts 46 px above the player's point and rises
     46 more in its first 520 ms (XpFlyOverlay.jsx playerScreenPoint,
     LIFT_PX) -- a corner or a bar, the defect this guards against, is
     hundreds of px off either way. */
  const early = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    window.__btPushXp(S, { target: 'xpBar', text: '+37 XP', color: '#60a5fa', cat: 'sword' });
    const t0 = Date.now();
    let el = null;
    for (let i = 0; i < 90 && !el; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      el = document.querySelector('[data-xpfly="sword"]');
    }
    const pops = (S._hudPopups || []).filter((p) => (p.target || 'xpBar') === 'xpBar')
      .map((p) => ({ text: p.text, cat: p.cat, from: p.from }));
    const flying = el ? [(() => { const r = el.getBoundingClientRect(); return { text: (el.textContent || '').trim(), cat: el.getAttribute('data-xpfly'), x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()] : [];
    let player = null;
    try {
      const cv = document.querySelector('canvas'); const r = cv.getBoundingClientRect();
      player = { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1),
                 y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
    } catch (e) {}
    return { pops, flying, player, age: Date.now() - t0 };
  });
  rec.ok('a label was pushed with the skill it belongs to',
    early.pops.length > 0 && early.pops[0].cat === 'sword', early.pops);
  rec.ok('...anchored to the character, not a screen corner',
    !!(early.pops[0] && early.pops[0].from), early.pops[0] || null);
  const born = early.flying[0];
  rec.ok('the label is on screen (guard)', !!born, early.flying);
  if (born && early.player) {
    const dx = born.x - early.player.x, up = early.player.y - born.y;
    rec.ok('...and it is drawn OVER the character (the column above them, no higher than its lift)',
      Math.abs(dx) < 30 && up > 0 && up < 46 + 46 + 8,
      { dx: +dx.toFixed(1), up: +up.toFixed(1), age: early.age, label: born, player: early.player });
  }

  /* ── 2 + 3. THE WHOLE FLIGHT, SAMPLED IN-PAGE ──
     Every position question below is answered from ONE evaluate that samples
     at ~35ms, rather than from separate probes across the wire.  That is not
     tidiness: a probe round-trip costs an unknown 50-150ms, and the lift is
     only 380ms long, so two round-trip samples can both land inside it — or
     both after it — and report a stalled label either way.  The first cut of
     this file did exactly that and called a working flight broken twice. */
  const flight = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const cardOf = (re) => {
      const el = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
        .find((e) => re.test(e.getAttribute('aria-label') || ''));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    };
    /* ═══ v2.3.2131: READ THE BAR, NOT THE DIGITS ═══
       The card used to print the eased number as text (data-xppair) and this
       read it off the card face.  The owner asked for those digits to move to
       a popup, so the bar is what carries the count-up now -- it reads
       displayXp where it used to read the raw value, and publishes it as
       data-xpprog on the same element whose width is computed from it.
       Still the DISPLAYED value, which is what this file has always been
       about; only the thing displaying it changed. */
    const pairText = () => {
      const el = document.querySelector('[data-xpbar="sword"]');
      return el ? String(el.getAttribute('data-xpprog') || '') : '';
    };
    const before = pairText();
    const t0 = Date.now();
    window.__btPushXp(S, { target: 'xpBar', text: '+37 XP', color: '#60a5fa', cat: 'sword' });
    const samples = [];
    for (let i = 0; i < 300 && Date.now() - t0 < 5600; i++) {
      const d = document.querySelector('[data-xpfly="sword"]');
      if (d) {
        const r = d.getBoundingClientRect();
        samples.push({ age: Date.now() - t0, x: r.left + r.width / 2, y: r.top + r.height / 2, pair: pairText() });
      }
      await new Promise((r2) => setTimeout(r2, 35));
    }
    return { before, samples, melee: cardOf(/Melee level/i), bow: cardOf(/Bow level/i) };
  });
  const fs = flight.samples;
  rec.ok('the flight was sampled (guard)', fs.length > 6, { n: fs.length });
  if (fs.length > 6) {
    const first = fs[0], last = fs[fs.length - 1];
    const minY = Math.min(...fs.map((s2) => s2.y));
    /* IT RISES FIRST — the beat over the character before the drop. */
    rec.ok('the label rises over the character before it falls',
      (first.y - minY) > 4, { startY: +first.y.toFixed(1), minY: +minY.toFixed(1),
        firstAges: fs.slice(0, 6).map((s2) => ({ age: s2.age, y: +s2.y.toFixed(1) })) });
    /* ...THEN IT TRAVELS to the card. */
    if (flight.melee) {
      const d0 = Math.hypot(first.x - flight.melee.cx, first.y - flight.melee.cy);
      const d1 = Math.hypot(last.x - flight.melee.cx, last.y - flight.melee.cy);
      rec.ok('...and then falls INTO the melee card (ends much nearer it than it began)',
        d1 < d0 * 0.4, { startDist: +d0.toFixed(1), endDist: +d1.toFixed(1) });
    }
    /* ...AND THE NUMBER WAS HELD THE WHOLE WAY.  Sampled alongside the
       position, so this is the card's state during the actual flight rather
       than at some later moment. */
    const held = fs.slice(0, Math.floor(fs.length * 0.5)).every((s2) => s2.pair === flight.before);
    rec.ok('the card\'s number is held while the label is in the air',
      held, { before: flight.before, during: [...new Set(fs.map((s2) => s2.pair))].slice(0, 5) });
  }

  /* ── 3b. THE RIGHT card: a bow gain must not fly to melee ──
     The discriminating case: without it, every assertion above is satisfied
     by a flight that always goes to the same place. */
  await P.page.waitForTimeout(2500);
  const bowFlight = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const cardOf = (re) => {
      const el = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
        .find((e) => re.test(e.getAttribute('aria-label') || ''));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    };
    window.__btPushXp(S, { target: 'xpBar', text: '+41 XP', color: '#60a5fa', cat: 'bow' });
    let last = null;
    const tb = Date.now();
    for (let i = 0; i < 300 && Date.now() - tb < 5600; i++) {
      const d = document.querySelector('[data-xpfly="bow"]');
      if (d) { const r = d.getBoundingClientRect(); last = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      await new Promise((r2) => setTimeout(r2, 35));
    }
    return { last, melee: cardOf(/Melee level/i), bow: cardOf(/Bow level/i) };
  });
  rec.ok('the bow label flew (guard)', !!bowFlight.last, bowFlight);
  if (bowFlight.last && bowFlight.bow && bowFlight.melee) {
    const dBow = Math.hypot(bowFlight.last.x - bowFlight.bow.cx, bowFlight.last.y - bowFlight.bow.cy);
    const dMel = Math.hypot(bowFlight.last.x - bowFlight.melee.cx, bowFlight.last.y - bowFlight.melee.cy);
    rec.ok('a BOW gain ends on the bow card, not the melee one', dBow < dMel,
      { dBow: +dBow.toFixed(1), dMel: +dMel.toFixed(1) });
  }

  /* ── 4b. the count-up is observable mid-way ──
     Drive the live number up by a large amount so the ease has something to
     travel, then sample: the displayed value must pass through a value
     between the old and the new rather than jumping. */
  await P.page.waitForTimeout(2500);
  /* v2.3.4191: the count-up stretched further (x12: a 5 s ease) -- on the
     Bro page this box reads the tile about once a second */
  await P.page.evaluate(() => { window.__btXpFlySlow = 12; });
  const seq = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const sk = S.rpg.prog3 && S.rpg.prog3.sk && S.rpg.prog3.sk.staff;
    if (!sk) return { skipped: 'no prog3 staff skill' };
    /* The pair element itself.  Reading the whole CARD splices "LV 1" onto
       "0/280" and yields 10 — which is exactly what the first cut of this
       test did, and why it thought a fresh character had 10 XP. */
    const read0 = () => {
      const el = document.querySelector('[data-xpbar="staff"]');
      const v = el && el.getAttribute('data-xpprog');
      return v == null || v === '' ? null : +v;
    };
    /* The DISPLAYED value before the gain — not sk.xp.  The first cut compared
       against a number it poked into the client's own object, which the next
       server player_state overwrote, so the "final value" assertion was
       measured against a target that no longer existed (it expected 500 and
       the real live number was 1280).  What is actually under test is the
       DISPLAY: does it ease, and does it settle on whatever the live number
       turns out to be. */
    const before = read0();
    /* Sized to stay UNDER the level threshold: prog is clamped to it, so a
       gain that overshoots lands on "280/280" and the count-up has nowhere to
       travel — which reads as "it jumped" no matter how well it eases. */
    const thresh = (() => {
      const el = document.querySelector('[data-xpbar="staff"]');
      const v = el && el.getAttribute('data-xpthresh');
      return v == null || v === '' ? 280 : +v;
    })();
    const bump = Math.max(20, Math.floor(thresh * 0.6));
    window.__btPushXp(S, { target: 'xpBar', text: '+' + bump + ' XP', color: '#60a5fa', cat: 'staff' });
    sk.xp = Math.floor(sk.xp || 0) + bump;
    const read = read0;
    const samples = [];
    const tc = Date.now();
    for (let i = 0; i < 600 && Date.now() - tc < 22000; i++) {
      samples.push({ t: Date.now() - tc, v: read() });
      await new Promise((r) => setTimeout(r, 60));
    }
    /* The live number as it stands at the END — the value the display must
       have settled on, whatever the server did along the way. */
    const liveEnd = (() => {
      const s2 = window._gameState.current.rpg.prog3.sk.staff;
      return Math.min(thresh, Math.floor((s2 && s2.xp) || 0));
    })();
    return { before, liveEnd, samples };
  });
  await P.page.evaluate(() => { window.__btXpFlySlow = 5; });
  console.log('  count-up', JSON.stringify(seq).slice(0, 900));
  if (!seq.skipped) {
    const vals = seq.samples.map((s) => s.v).filter((v) => v != null);
    rec.ok('the Magic card reported a number throughout (guard)', vals.length > 10, { n: vals.length });
    const lo = Math.min(seq.before, seq.liveEnd), hi = Math.max(seq.before, seq.liveEnd);
    const mids = vals.filter((v) => v > lo && v < hi);
    rec.ok('the number COUNTS UP — seen at values between the old and the new',
      mids.length >= 2, { before: seq.before, liveEnd: seq.liveEnd, distinctMids: [...new Set(mids)].slice(0, 8) });
    /* Settles on the LIVE number, which is the honest invariant: the display
       is allowed to lag it, never to disagree with it once it stops. */
    rec.ok('...and it settles on the live value', vals[vals.length - 1] === seq.liveEnd,
      { last: vals[vals.length - 1], live: seq.liveEnd });
  }

  /* ── 5. v2.3.4191: OFF THE BRO TAB IT LANDS IN THE TOP BAR'S XP NUMBER ──
     The band back at rest (the Gear tab: no skill tiles), the top bar's XP
     bar up (in play a gain's own player_state puts it up -- noteProg3Xp;
     here its record is set as that would, and __btXpHold keeps it up for the
     reading), then a gain: the label must end on the bar's number, not fade
     where it was born. */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) {} });
  await P.page.waitForTimeout(900);
  const toBar = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const tiles = document.querySelectorAll('[data-bro-skill]').length;
    const now = Date.now();
    S._xpBar = { cat: 'sword', level: 1, xp: 10, need: 100, frac: 0.1, gain: 0, gainAt: now - 60000, seq: 1, at: now, up: false, fromLevel: 1, fromFrac: 0.1, fromXp: 10, fromNeed: 100 };
    window.__btXpHold = true;
    let num = null;
    for (let i = 0; i < 40 && !num; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const e = document.querySelector('[data-xp-bar][data-xp-shown="1"] [data-xp-num]');
      if (e) { const r = e.getBoundingClientRect(); if (r.width > 0) num = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }
    }
    if (!num) return { tiles, num: null };
    const t0 = Date.now();
    window.__btPushXp(S, { target: 'xpBar', text: '+29 XP', color: '#60a5fa', cat: 'sword' });
    const samples = [];
    for (let i = 0; i < 300 && Date.now() - t0 < 5600; i++) {
      const d = document.querySelector('[data-xpfly="sword"]');
      if (d) { const r = d.getBoundingClientRect(); samples.push({ age: Date.now() - t0, x: r.left + r.width / 2, y: r.top + r.height / 2, o: +getComputedStyle(d).opacity, to: d.getAttribute('data-xpfly-to') }); }
      await new Promise((r2) => setTimeout(r2, 35));
    }
    window.__btXpHold = false;
    return { tiles, num, samples };
  });
  rec.ok('the band at rest has no skill tiles (guard: the Gear tab)', toBar.tiles === 0, toBar.tiles);
  rec.ok('the top bar\'s XP number is up (guard)', !!toBar.num, toBar.num);
  if (toBar.num && toBar.samples && toBar.samples.length > 3) {
    const f0 = toBar.samples[0];
    const d0 = Math.hypot(f0.x - toBar.num.cx, f0.y - toBar.num.cy);
    const near = toBar.samples.reduce((m, s2) => Math.min(m, Math.hypot(s2.x - toBar.num.cx, s2.y - toBar.num.cy)), Infinity);
    /* visible in transit: on its way, well past halfway, and still clearly
       drawn (it dissolves into the number as it lands, as into a tile) */
    const seenNear = toBar.samples.find((s2) => Math.hypot(s2.x - toBar.num.cx, s2.y - toBar.num.cy) < d0 * 0.6 && s2.o > 0.2);
    const aim = toBar.samples.map((s2) => s2.to).find(Boolean);
    const [ax, ay] = aim ? aim.split(',').map(Number) : [NaN, NaN];
    rec.ok('off the Bro tab a gain flies INTO the top bar\'s XP number (aimed at it -- data-xpfly-to -- and seen well on its way there, past halfway and still drawn; this box samples it about twice a second) -- never fades in place',
      Math.abs(ax - toBar.num.cx) <= 4 && Math.abs(ay - toBar.num.cy) <= 4 && near < d0 * 0.5 && !!seenNear && seenNear.o > 0.2,
      { aim, startDist: +d0.toFixed(1), nearest: +near.toFixed(1), seenNear, n: toBar.samples.length });
  } else rec.ok('the flight to the top bar was sampled (guard)', false, toBar);

  const threw = P.logs.filter((l) => /pageerror|Uncaught/.test(l));
  rec.ok('nothing threw', threw.length === 0, threw.slice(0, 4));
  await P.page.screenshot({ path: 'tools/qa/mp/out/xpfly.png' });
  await P.ctx.close().catch(() => {});
}
