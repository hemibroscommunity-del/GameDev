/* THE XP LEAVES THE CHARACTER AND LANDS ON ITS SKILL (v2.3.1874).
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
  const els = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
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

/* Push a gain through the real entry point, so this exercises the shipped
   pushHudPopup (cat resolution, world anchor and all) rather than a fixture. */
async function gain(P, amount, cat) {
  await P.page.evaluate((o) => {
    const S = window._gameState.current;
    window.__btPushXp(S, { target: 'xpBar', text: '+' + o.amount + ' XP', color: '#60a5fa', cat: o.cat });
  }, { amount, cat });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Gainer', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3500);
  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) {} });
  await P.page.waitForTimeout(600);

  const base = await probe(P);
  rec.ok('the three combat cards are on screen (guard)', base.cards.length === 3, base.cards);
  rec.ok('the flight helper is exposed for the test (guard)',
    await P.page.evaluate(() => typeof window.__btPushXp === 'function'), {});
  if (base.cards.length !== 3) { await P.ctx.close().catch(() => {}); return; }

  /* ── 1. it starts over the character ── */
  await gain(P, 37, 'sword');
  await P.page.waitForTimeout(90);
  const early = await probe(P);
  rec.ok('a label was pushed with the skill it belongs to',
    early.pops.length > 0 && early.pops[0].cat === 'sword', early.pops);
  rec.ok('...anchored to the character, not a screen corner',
    !!(early.pops[0] && early.pops[0].from), early.pops[0] || null);
  const born = early.flying[0];
  rec.ok('the label is on screen (guard)', !!born, early.flying);
  if (born && early.player) {
    const d = Math.hypot(born.x - early.player.x, born.y - early.player.y);
    rec.ok('...and it is drawn OVER the character (within 70px of them)', d < 70,
      { d: +d.toFixed(1), label: born, player: early.player });
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
    const pairText = () => {
      const el = document.querySelector('[data-xppair="sword"]');
      return (el && el.textContent || '').trim();
    };
    const before = pairText();
    const t0 = Date.now();
    window.__btPushXp(S, { target: 'xpBar', text: '+37 XP', color: '#60a5fa', cat: 'sword' });
    const samples = [];
    for (let i = 0; i < 40; i++) {
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
  await P.page.waitForTimeout(1100);
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
    for (let i = 0; i < 40; i++) {
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
  await P.page.waitForTimeout(900);
  const seq = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const sk = S.rpg.prog3 && S.rpg.prog3.sk && S.rpg.prog3.sk.staff;
    if (!sk) return { skipped: 'no prog3 staff skill' };
    /* The pair element itself.  Reading the whole CARD splices "LV 1" onto
       "0/280" and yields 10 — which is exactly what the first cut of this
       test did, and why it thought a fresh character had 10 XP. */
    const read0 = () => {
      const el = document.querySelector('[data-xppair="staff"]');
      const m = (el && el.textContent || '').match(/^(\d+)\s*\/\s*(\d+)/);
      return m ? +m[1] : null;
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
      const el = document.querySelector('[data-xppair="staff"]');
      const m = (el && el.textContent || '').match(/^(\d+)\s*\/\s*(\d+)/);
      return m ? +m[2] : 280;
    })();
    const bump = Math.max(20, Math.floor(thresh * 0.6));
    window.__btPushXp(S, { target: 'xpBar', text: '+' + bump + ' XP', color: '#60a5fa', cat: 'staff' });
    sk.xp = Math.floor(sk.xp || 0) + bump;
    const read = read0;
    const samples = [];
    for (let i = 0; i < 26; i++) {
      samples.push({ t: i * 60, v: read() });
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
  console.log('  count-up', JSON.stringify(seq).slice(0, 600));
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

  const threw = P.logs.filter((l) => /pageerror|Uncaught/.test(l));
  rec.ok('nothing threw', threw.length === 0, threw.slice(0, 4));
  await P.page.screenshot({ path: 'tools/qa/mp/out/xpfly.png' });
  await P.ctx.close().catch(() => {});
}
