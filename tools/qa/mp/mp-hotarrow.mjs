/**
 * mp-hotarrow -- v2.3.2807: the bow special is the pine arrow, white-hot.
 *
 * Owner: "I want to see what the arrow special would look like with you
 * drawing the special instead of using my special arrow sprite.  I'd like
 * something glowing and a bit animated over the normal arrow like a white bit
 * glowing hot arrow."  (src/rendering/hotArrowFx.js)
 *
 * What a screenshot cannot say, the system reports (window.__btHotArrow):
 *   - which art is drawn (the heated pine arrow, not the painted sheet -- and
 *     the sheet is never even downloaded);
 *   - that it is drawn at the special's 62.8 px and its glow stays inside the
 *     hit capsule it has always had (PROJ_BODY.arrowSpecial: half 12.8);
 *   - that the glow is additive light and nothing is a filter (iOS grain);
 *   - that it is ANIMATED in flight -- the heat frame steps, the breath swells;
 *   - that it sheds sparks that cool white -> orange -> red;
 *   - the stuck arrow's heat over its four seconds: white on landing, down to
 *     an ember, a flare on each 500 ms tick -- and (v2.3.2808) a burn-out at
 *     the end, not the white build-up the retired send-off blast had;
 *   - that the head still shows in flight and is buried once it lands (the
 *     v2.3.2381 tallies mp-arrowhead reads);
 *   - that a plain arrow is untouched, a miss smoulders in the ground, and a
 *     peer's special is white-hot too.
 * The special is fired through the game's own specialAttack at a pinned
 * skeleton in town (mp-shotland's fixture), on the page clock (TRAPS §111:
 * the dark-screen watchdog is told the screen is lit first).
 *
 * v2.3.2808 -- THE SPECIAL IS THREE ARROWS.  Owner: "3 white hot arrows that
 * follow each other closely.  One shot for all 3 arrows", "a third each",
 * "Burn, but no blast" (src/game/bowVolley.js).  So this also checks: one
 * press looses three, for one price; they fly as a train ~80 px apart on one
 * line, and one still on the string is not drawn; each lands a third of the
 * damage; the volley burns ONCE (one tick at a time, not three); the three
 * smoulder on one clock and burn out together; nothing asks for a blast; a
 * missed volley stands in the ground as three arrows with one ground burn;
 * and a peer sees three arrows, one behind the other.  Town's worker
 * advertises caps.bowvolley, which is what turns the volley on.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const DIST = 200;
const HALF = 12.8;       /* PROJ_BODY.arrowSpecial.half (projectiles.js) */
const LEN = 62.8;        /* the painted special's drawn length, kept (hotArrowFx HOT_LEN) */

const arm = (P, withMonster) => P.page.evaluate(({ dist, withMonster }) => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const pine = (F.WOODWORKING_TIERS || {}).pine;
  R.rangedWeapon = { type: 'bow', tierMult: pine ? pine.tierMult : 1, gearBase: 'pine', name: 'QA Bow', tier: 'common' };
  R.activeSlot = 'ranged';
  R.mana = R.maxMana = 900; R.hp = R.maxHp = 9000;
  S.arrows = []; S._debrisBursts = []; S.hitParticles = [];
  S.monsters = [];
  S.lockedTarget = null;
  let id = null;
  if (withMonster) {
    const m = F.createMonster('hot-' + Date.now(), 'fodder', 2, S.player.x + dist, S.player.y + 2, null);
    if (!m) return { err: 'no monster' };
    m.archetype = 'skeleton'; m.type = 'skeleton';
    m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12;
    m._transformStart = 1;
    m._stuckArrows = [];
    S.monsters = [m];
    S.lockedTarget = { ref: m, type: 'monster', src: 'tap', ts: Date.now() };
    id = m.id;
  }
  S.autoAttack = false; S.isSwinging = false; S.swingTimer = 0;
  S._facingAngle = 0; S._aimAngle = 0; S._lastAimAngle = 0; S._facing = 'right';
  return { id };
}, { dist: DIST, withMonster });

const sample = (P, mid) => P.page.evaluate((mid) => {
  const S = window._gameState.current;
  const hp = window.__btHotArrow ? window.__btHotArrow() : null;
  const ap = window._pixiRenderer && window._pixiRenderer.arrowProbe ? window._pixiRenderer.arrowProbe() : null;
  const sp = (S.arrows || []).filter((x) => x && x.isSpecial && !x.isStaff);
  const a = sp[0];
  const r = hp && hp.arrows && hp.arrows[0];
  const m = mid ? (S.monsters || []).find((x) => x && x.id === mid) : null;
  return {
    t: Date.now(),
    live: !!a, stuck: !!(a && a.stuckIn), planted: !!(a && a.planted), landing: !!(a && a._landFx),
    /* v2.3.2808: the whole volley, arrow by arrow, and what the probe drew */
    n: sp.length, nStuck: sp.filter((x) => x.stuckIn).length, nPlanted: sp.filter((x) => x.planted).length,
    vol: sp.map((x) => ({ ix: x.volleyIx, x: x._renderX, y: x._renderY, ang: x.ang, held: !!x._held, stuck: !!x.stuckIn, planted: !!x.planted, falling: !!x.planting,
      px: x._plantX, py: x._plantY, part: x.part, dmg: x.dmg, base: x.baseDmg })),
    hots: hp && hp.arrows ? hp.arrows.map((q) => ({ state: q.state, heat: q.heat, alpha: q.alpha, x: q.x, y: q.y })) : [],
    hpLost: m ? Math.round(m.maxHp - m.curHp) : null,
    hot: r ? { state: r.state, tex: r.tex, headless: r.headless, heat: r.heat, frame: r.frame, len: r.len, drawnLen: r.drawnLen,
      flashAlpha: r.flashAlpha, auraAlpha: r.auraAlpha, auraNAlpha: r.auraNAlpha } : null,
    sparks: hp ? hp.sparks : 0, tints: hp ? hp.sparkTints : [], stats: hp ? hp.stats : null,
    blends: hp ? hp.blends : null, filters: hp ? hp.filters : null, nearest: hp ? hp.nearest : null, auraHalf: hp ? hp.auraHalf : null,
    specials: ap ? ap.specials : null, specialHeads: ap ? ap.specialHeads : null, arrows: ap ? ap.arrows : null, heads: ap ? ap.heads : null,
  };
}, mid || null);

/* Step the page clock `n` times by `ms`, sampling after each step. */
async function steps(P, n, ms, out, mid) {
  for (let i = 0; i < n; i++) {
    await P.page.clock.runFor(ms);
    out.push(await sample(P, mid));
  }
  return out;
}

/* v2.3.2808: the gaps between consecutive arrows of the volley that are
   flying (loosed, not yet in anything), measured ALONG the lead's heading,
   and how far each strays off that line. */
function trainGaps(s) {
  const fl = s.vol.filter((v) => !v.held && !v.stuck && !v.planted && !v.falling && Number.isFinite(v.x)).sort((p, q) => p.ix - q.ix);
  const ang = fl.length ? fl[0].ang : 0;   /* the lead's own heading, as flown */
  const c = Math.cos(ang), sn = Math.sin(ang);
  const gaps = [], off = [];
  for (let i = 1; i < fl.length; i++) {
    const dx = fl[i - 1].x - fl[i].x, dy = fl[i - 1].y - fl[i].y;
    gaps.push(dx * c + dy * sn);
    off.push(Math.abs(-dx * sn + dy * c));
  }
  return { n: fl.length, gaps, off };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
  await P.page.addStyleTag({ content: '[data-coach],[data-coach-card],[data-coach-ring]{display:none!important}' });
  /* the skeleton's art is a Wind Dunes asset (per-zone loading, v2.3.1405) */
  await P.page.evaluate(() => (window._gameFns.preloadZoneArt ? window._gameFns.preloadZoneArt('sky') : null)).catch(() => {});
  await P.page.waitForTimeout(800);
  const hook = await P.page.evaluate(() => {
    const hp = window.__btHotArrow ? window.__btHotArrow() : null;
    const ap = window._pixiRenderer && window._pixiRenderer.arrowProbe;
    return { hot: !!hp, ready: !!(hp && hp.ready), arrowProbe: !!ap, special: typeof (window._gameFns || {}).specialAttack === 'function' };
  });
  rec.ok('the white-hot arrow is built and its probe is on the page (guard)', hook.hot && hook.ready && hook.special && hook.arrowProbe, hook);

  /* the painted sheet: never requested (HOT_SPECIAL_ARROW skips its load) */
  const sheetReq = await P.page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /arrow-special/.test(n)));
  rec.ok('the painted special sheet is never downloaded', sheetReq.length === 0, sheetReq);

  /* ════════ 1. A SPECIAL AT A SKELETON: FLIGHT, LANDING, SMOULDER ════════ */
  const armed = await arm(P, true);
  rec.ok('a skeleton is pinned 200 px east and locked (guard)', !!armed.id, armed);
  /* TRAPS §111: the page clock starves the watchdog's canvas sample */
  await P.page.evaluate(() => { const S = window._gameState.current; S.__wdEverLit = true; S.__wdNext = 1e15; S.__wdDark = 0; });
  await P.page.clock.install();
  await P.page.clock.pauseAt((await P.page.evaluate(() => Date.now())) + 1000);
  await P.page.clock.runFor(300);
  await H.instrumentWire(P);
  const wire0 = await H.wireCounts(P);
  const caps = await P.page.evaluate(() => !!((window._gameState.current._serverCaps || {}).bowvolley));
  rec.ok('the worker advertises the volley (caps.bowvolley; guard)', caps, caps);
  const fired = await P.page.evaluate(() => {
    const S = window._gameState.current;
    (window._gameFns || {}).specialAttack();
    const sp = (S.arrows || []).filter((x) => x && x.isSpecial && !x.isStaff);
    return { n: sp.length, oneVolley: sp.length > 0 && sp.every((x) => x.volley && x.volley === sp[0].volley),
      parts: sp.map((x) => x.part), dmg: sp.map((x) => x.dmg), delays: sp.map((x) => Math.round(x.launchDelayMs || 0)) };
  });
  const wireFire = await H.wireCounts(P);
  const swipes = (wireFire.ability_use || 0) - (wire0.ability_use || 0);
  rec.ok(`one press looses THREE arrows, one volley, each a third (part ${fired.parts.join('/')}, dmg ${fired.dmg.join('/')}, waits ${fired.delays.join('/')} ms)`,
    fired.n === 3 && fired.oneVolley && fired.parts.every((q) => q === 3) && new Set(fired.dmg).size === 1
      && fired.delays[0] === 0 && fired.delays[1] > 30 && fired.delays[2] > fired.delays[1], fired);
  rec.ok(`...for one price: one special on the wire (${swipes} ability_use)`, swipes === 1, { wire0, wireFire });
  const S1 = [];
  await steps(P, 24, 1000 / 60, S1, armed.id);          /* the flight, frame by frame */
  let guard = 0;
  while (guard++ < 120) {                    /* then 50 ms steps until the arrows are gone */
    await steps(P, 1, 50, S1, armed.id);
    if (!S1[S1.length - 1].live && S1.some((s) => s.stuck)) break;
  }
  const fly = S1.filter((s) => s.hot && s.hot.state === 'flight');
  const stuck = S1.filter((s) => s.hot && s.hot.headless);
  rec.ok(`the special flies and sticks in the skeleton (guard: ${fly.length} flight, ${stuck.length} stuck samples)`,
    fly.length >= 2 && stuck.length >= 10 && S1.some((s) => s.stuck), { fly: fly.length, stuck: stuck.length });

  const lens = fly.map((s) => s.hot.drawnLen);
  rec.ok(`in flight it is the pine arrow, heated, at the special's ${LEN} px (drawn ${lens.slice(0, 3).join(', ')})`,
    fly.length > 0 && fly.every((s) => s.hot.tex === 'heat' && Math.abs(s.hot.drawnLen - LEN) < 0.6), fly.slice(0, 2).map((s) => s.hot));
  const b0 = S1.find((s) => s.blends);
  rec.ok('it glows: additive light round it, and the same glow drawn plain beneath for a bright ground',
    fly.length > 0 && fly.every((s) => s.hot.auraAlpha > 0 && s.hot.auraNAlpha > 0) && b0 && b0.blends.aura === 'add' && b0.blends.hot === 'add',
    { blends: b0 && b0.blends, first: fly[0] && fly[0].hot });
  const frames = new Set(fly.map((s) => s.hot.frame));
  const fa = fly.map((s) => s.hot.flashAlpha);
  rec.ok(`it is animated in flight (${frames.size} heat frames, breath ${Math.min(...fa).toFixed(2)}..${Math.max(...fa).toFixed(2)})`,
    frames.size >= 2 && Math.max(...fa) - Math.min(...fa) > 0.05, { frames: [...frames], fa });
  const sparkN = Math.max(0, ...fly.map((s) => s.sparks));
  const tints = new Set(S1.flatMap((s) => s.tints || []));
  const HOTT = [0xffffff, 0xffe070], COOLT = [0xff9a30, 0xe0501c, 0x9a2a12];
  rec.ok(`it sheds sparks as it flies, and they cool (${sparkN} at once; white ${HOTT.some((c) => tints.has(c))}, orange/red ${COOLT.some((c) => tints.has(c))})`,
    sparkN >= 3 && HOTT.some((c) => tints.has(c)) && COOLT.some((c) => tints.has(c)), { sparkN, tints: [...tints].map((c) => c.toString(16)) });
  rec.ok(`its glow stays inside the special's hit capsule (${b0 && b0.auraHalf} <= ${HALF} px)`, !!b0 && b0.auraHalf > 0 && b0.auraHalf <= HALF, b0 && b0.auraHalf);
  rec.ok('nothing is a filter, and the art is sampled nearest (crisp pixels)', S1.every((s) => s.filters === 0 || s.filters == null) && !!(b0 && b0.nearest),
    { filters: [...new Set(S1.map((s) => s.filters))], nearest: b0 && b0.nearest });
  rec.ok('the head shows in flight (mp-arrowhead\'s tallies)', fly.some((s) => s.specials > 0 && s.specialHeads > 0), fly.map((s) => [s.specials, s.specialHeads]));
  /* v2.3.2808: read once the whole volley is in -- until then a follower is
     still flying with its head showing, which is correct */
  const allIn = stuck.filter((s) => s.hots.length === 3 && s.hots.every((q) => q.state !== 'flight'));
  rec.ok('...and is buried once it has landed', allIn.length >= 10 && allIn.every((s) => s.specials > 0 && s.specialHeads === 0 && /^ember/.test(s.hot.tex)),
    allIn.slice(0, 2).map((s) => ({ sp: s.specials, heads: s.specialHeads, tex: s.hot.tex })));

  const h = stuck.map((s) => s.hot.heat);
  const t0 = stuck.length ? stuck[0].t : 0;
  const coolIdx = h.findIndex((v) => v <= 0.55);
  const cooledBy = coolIdx >= 0 ? stuck[coolIdx].t - t0 : null;
  rec.ok(`it lands white-hot and cools to an ember (${h[0]} at landing, <= 0.55 after ${cooledBy} ms)`,
    h.length > 0 && h[0] >= 0.9 && cooledBy != null && cooledBy <= 1300, { h: h.slice(0, 30) });
  const reflare = coolIdx >= 0 && h.slice(coolIdx).some((v) => v >= 0.7);
  const throbs = (S1[S1.length - 1].stats || {}).throbs || 0;
  rec.ok(`it flares again on the stuck arrow's ticks (${throbs} throbs)`, reflare && throbs >= 3, { throbs, after: h.slice(coolIdx, coolIdx + 30) });
  /* ── v2.3.2808: THE VOLLEY (its train is measured on the long miss in 3:
     at 200 px the lead is already in the skeleton when the second is loosed) ── */
  const early = S1.filter((s) => s.vol.some((v) => v.held));
  rec.ok(`an arrow still on the string is not drawn (${early.length} frames with one waiting)`,
    early.length >= 1 && early.every((s) => s.hots.length <= s.vol.filter((v) => !v.held).length),
    early.slice(0, 4).map((s) => ({ held: s.vol.filter((v) => v.held).length, drawn: s.hots.length })));
  const all3 = S1.findIndex((s) => s.nStuck === 3);
  rec.ok('all three stick in the skeleton', all3 >= 0, S1.map((s) => s.nStuck).slice(0, 40));
  const third = fired.dmg[0];
  const base = (S1.find((s) => s.vol.length) || { vol: [{}] }).vol[0].base || 0;
  const firstStuckT = (S1.find((s) => s.nStuck >= 1) || {}).t || 0;
  const hitLost = all3 >= 0 ? S1[all3].hpLost : null;
  rec.ok(`each lands a third: three hits take ${hitLost} (= 3 x ${third}) before the first burn tick`,
    all3 >= 0 && S1[all3].t - firstStuckT < 450 && hitLost === 3 * third, { hitLost, third, dt: all3 >= 0 ? S1[all3].t - firstStuckT : null });
  const afterHits = S1.slice(all3 >= 0 ? all3 : S1.length);
  const drops = [];
  for (let i = 1; i < afterHits.length; i++) {
    const d = (afterHits[i].hpLost || 0) - (afterHits[i - 1].hpLost || 0);
    if (d) drops.push(d);
  }
  rec.ok(`the volley burns ONCE: ${drops.length} ticks of ${base}, one at a time (three burning arrows would be ~21, in 2s and 3s)`,
    base > 0 && drops.length >= 6 && drops.length <= 8 && drops.every((d) => d === base), { drops, base });
  const late = S1.filter((s) => s.nStuck === 3 && s.t - S1[all3].t >= 1100 && s.hots.length === 3);
  const spread = late.map((s) => Math.max(...s.hots.map((q) => q.heat)) - Math.min(...s.hots.map((q) => q.heat)));
  rec.ok(`the three smoulder on ONE clock: they throb together (heat spread <= ${spread.length ? Math.max(...spread).toFixed(3) : '-'})`,
    late.length >= 10 && spread.every((d) => d <= 0.02), { n: late.length, spread: spread.slice(0, 20) });
  const lastStuck = stuck[stuck.length - 1];
  const endWin = S1.filter((s) => s.nStuck === 3 && lastStuck.t - s.t <= 350 && s.hots.length);
  const endHeat = endWin.map((s) => s.hots[0].heat);
  const endAlpha = endWin.length ? Math.max(...endWin[endWin.length - 1].hots.map((q) => q.alpha)) : 1;
  const falling = endHeat.every((v, i) => i === 0 || v <= endHeat[i - 1] + 1e-6);
  rec.ok(`they BURN OUT at the end, no white build-up for a blast (last 350 ms: heat ${endHeat.map((v) => v.toFixed(2)).join(' > ')}, alpha to ${endAlpha})`,
    endHeat.length >= 4 && falling && Math.max(...endHeat) < 0.8 && endHeat[endHeat.length - 1] <= 0.15 && endAlpha <= 0.1, { endHeat, endAlpha });
  const lastN3 = S1.map((s) => s.n).lastIndexOf(3);
  rec.ok('...and go out together, in the same step', lastN3 >= 0 && S1[lastN3 + 1] && S1[lastN3 + 1].n === 0, S1.slice(Math.max(0, lastN3 - 1), lastN3 + 3).map((s) => s.n));
  const wireEnd = await H.wireCounts(P);
  rec.ok('nothing asks the worker for a blast (no arrow_blast on the wire)',
    ((wireEnd.arrow_blast || 0) - (wire0.arrow_blast || 0)) === 0, wireEnd);

  /* ════════ 2. A PLAIN ARROW IS UNTOUCHED ════════ */
  await arm(P, true);
  await P.page.evaluate(() => { const S = window._gameState.current; S.swingTimer = 0; S.autoAttack = true; });
  const S2 = [];
  for (let i = 0; i < 40; i++) {
    await steps(P, 1, 1000 / 60, S2);
    const s = S2[S2.length - 1];
    if (s.arrows > 0) { await P.page.evaluate(() => { window._gameState.current.autoAttack = false; }); break; }
  }
  const plain = S2.filter((s) => s.arrows > 0);
  rec.ok('a plain arrow is untouched: drawn as the pine arrow, nothing white-hot', plain.length > 0 && plain.every((s) => !s.hot),
    S2.slice(-3).map((s) => ({ arrows: s.arrows, hot: s.hot })));
  await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S.arrows = []; });
  await steps(P, 1, 2000, []);

  /* ════════ 3. A MISS SMOULDERS IN THE GROUND ════════
     A special with no target waits for the bow's sight (v2.3.2473's queue),
     so the miss is the records the special pushes, injected flying east --
     v2.3.2808: all three, sharing one volley, as playerActions builds them --
     flying SOUTH, the phone's long axis, so the whole train is in the air
     together for a dozen frames before the screen edge plants it. */
  await arm(P, false);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    /* no live aim, or the release re-aims them east (projectiles.js freeAim) */
    S._aiming = false;
    const v = { n: 3, path: null, burn: null, burnAt: 0, _lingerNext: null, kb: new Set() };
    for (let i = 0; i < 3; i++) {
      S.arrows.push({ ang: Math.PI / 2, dist: 14, dmg: 1, baseDmg: 7, life: 150, maxLife: 150, hitIds: new Set(),
        launchDelayMs: i * 80 * (1000 / 60) / 24, part: 3, volley: v, volleyIx: i,
        isSpecial: true, isStaff: false, pierce: true, _rangeMult: 1, element: null });
    }
  });
  const S3 = [];
  guard = 0;
  let decoy = null;
  while (guard++ < 150) {
    await steps(P, 1, guard <= 30 ? 1000 / 60 : 50, S3, decoy);   /* the flight frame by frame, then 50 ms steps */
    const last = S3[S3.length - 1];
    /* Once all three are down, stand a monster in the ground burn: it takes
       the burn's ticks, which is how many burns there are. */
    if (!decoy && last.nPlanted === 3) {
      decoy = await P.page.evaluate(() => {
        const S = window._gameState.current, F = window._gameFns || {};
        const a = (S.arrows || []).find((x) => x && x.isSpecial && x.planted);
        const m = F.createMonster('hot-g-' + Date.now(), 'fodder', 2, a._plantX + 30, a._plantY + 30, null);
        if (!m) return null;
        m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12;
        S.monsters = [m];
        return m.id;
      });
    }
    if (!last.live && S3.some((s) => s.planted)) break;
  }
  const trains = S3.map((s) => trainGaps(s)).filter((g) => g.n >= 2);
  const allGaps = trains.flatMap((g) => g.gaps), allOff = trains.flatMap((g) => g.off);
  rec.ok(`the volley flies as a train on ONE line, ~80 px apart (gaps ${[...new Set(allGaps.map((g) => g.toFixed(0)))].join(', ')}; off the line <= ${allOff.length ? Math.max(...allOff).toFixed(1) : '-'} px)`,
    allGaps.length >= 2 && trains.some((g) => g.n === 3) && allGaps.every((g) => g >= 72 && g <= 88) && allOff.every((o) => o <= 1.5), { trains: trains.slice(0, 8) });
  const three = S3.find((s) => s.nPlanted === 3);
  const spots = three ? three.vol.map((v) => [v.px, v.py]) : [];
  const apart = [];
  for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) apart.push(Math.hypot(spots[i][0] - spots[j][0], spots[i][1] - spots[j][1]));
  rec.ok(`a volley that misses stands in the ground as THREE arrows, a little apart (${apart.map((d) => d.toFixed(0)).join(', ')} px)`,
    apart.length === 3 && apart.every((d) => d >= 5 && d <= 40), { spots });
  const gDrops = [];
  for (let i = 1; i < S3.length; i++) {
    const d = (S3[i].hpLost || 0) - (S3[i - 1].hpLost || 0);
    if (S3[i - 1].hpLost != null && d) gDrops.push(d);
  }
  rec.ok(`...with ONE ground burn: ${gDrops.length} ticks of 7, one at a time`,
    gDrops.length >= 3 && gDrops.length <= 8 && gDrops.every((d) => d === 7), { gDrops, decoy });
  const planted = S3.filter((s) => s.planted && s.hot);
  const ph = planted.map((s) => s.hot.heat);
  rec.ok(`a miss plants in the ground and smoulders there, flaring on its ground ticks (${planted.length} samples, heat ${Math.min(...ph).toFixed(2)}..${Math.max(...ph).toFixed(2)})`,
    /* v2.3.2808: re-flare after it FIRST cools -- its coolest is now the burn-out at the very end */
    planted.length >= 10 && planted.every((s) => s.hot.headless && /^ember/.test(s.hot.tex)) && Math.min(...ph) <= 0.55
      && ph.findIndex((v) => v <= 0.55) >= 0 && ph.slice(ph.findIndex((v) => v <= 0.55)).some((v) => v >= 0.7),
    { n: planted.length, ph: ph.slice(0, 40) });
  await P.ctx.close().catch(() => {});

  /* ════════ 4. A PEER SEES IT WHITE-HOT ════════ */
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Archer', nameB: 'Watcher' });
  for (const X of [A, B]) {
    await X.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
  }
  await A.page.evaluate(() => (window._gameFns.preloadZoneArt ? window._gameFns.preloadZoneArt('sky') : null)).catch(() => {});
  await A.page.waitForTimeout(800);
  await arm(A, true);
  await A.page.waitForTimeout(400);
  const watch = B.page.evaluate((ms) => new Promise((resolve) => {
    const out = { remoteSpecial: 0, drawnFlight: 0, frames: 0, tex: null, maxRemote: 0, maxDrawn: 0, gaps: [], overDrawn: 0 };
    const t0 = Date.now();
    const tick = () => {
      const S = window._gameState.current;
      out.frames++;
      const rs = (S._remoteProjectiles || []).filter((rp) => rp && rp.isSpecial && !rp.isStaff);
      if (rs.length) out.remoteSpecial++;
      out.maxRemote = Math.max(out.maxRemote, rs.length);
      const hp = window.__btHotArrow ? window.__btHotArrow() : null;
      const fl = hp && hp.arrows ? hp.arrows.filter((r) => r.state === 'flight') : [];
      const f = fl[0];
      if (f) { out.drawnFlight++; out.tex = f.tex; }
      /* v2.3.2808: three, one behind the other -- and none drawn while it waits */
      out.maxDrawn = Math.max(out.maxDrawn, fl.length);
      if (fl.length > rs.filter((rp) => !rp._held).length) out.overDrawn++;
      if (fl.length >= 2) {
        const xs = fl.map((r) => r.x).sort((p, q) => q - p);
        for (let i = 1; i < xs.length; i++) out.gaps.push(Math.round(xs[i - 1] - xs[i]));
      }
      if (Date.now() - t0 < ms) { requestAnimationFrame(tick); return; }
      resolve(out);
    };
    requestAnimationFrame(tick);
  }), 3500);
  await A.page.waitForTimeout(300);
  await A.page.evaluate(() => { (window._gameFns || {}).specialAttack(); });
  const peer = await watch;
  rec.ok(`the watcher is sent the archer's special (guard: seen on ${peer.remoteSpecial} frames)`, peer.remoteSpecial > 0, peer);
  rec.ok('...and draws it white-hot, through the same code', peer.drawnFlight > 0 && peer.tex === 'heat', peer);
  rec.ok(`...as THREE arrows, one behind the other (${peer.maxRemote} sent, up to ${peer.maxDrawn} in the air, gaps ${[...new Set(peer.gaps)].slice(0, 6).join(', ')} px)`,
    peer.maxRemote === 3 && peer.maxDrawn >= 2 && peer.gaps.length > 0 && peer.gaps.every((g) => g >= 56 && g <= 104) && peer.overDrawn === 0,
    { maxRemote: peer.maxRemote, maxDrawn: peer.maxDrawn, gaps: peer.gaps.slice(0, 20), overDrawn: peer.overDrawn });
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
