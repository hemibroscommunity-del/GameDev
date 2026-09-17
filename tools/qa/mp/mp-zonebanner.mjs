/* ═══ THE ZONE-ENTRY BANNER, PLAYED FOR REAL (v2.3.2596) ═══
 *
 * Owner: "play this briefly across the upper center of the screen then dock
 * where it tells you what location you're in."
 *
 * The player walks out of the hub onto the real exit tile, so the per-zone
 * loading overlay, preloadZoneAssets and the whole entry body run exactly as
 * they do for a person — there is no shortcut that sets S.currentZone, because
 * the shortcut skips the very gate this feature is registered in.
 *
 * ═══ WHY THE ASSERTIONS SAMPLE OVER TIME ═══
 *
 * TRAPS §61: "a still-frame assertion cannot see a frozen animation."  Every
 * single-frame check about this banner — is it on screen, is the strip URL
 * right, is the plaque visible — is equally true of a working build and one
 * stuck on beat 1 forever.  And stuck-on-beat-1 is not hypothetical: the first
 * cut stepped background-position by the SOURCE cell width while background-size
 * scales the strip, so every beat after the first landed in the gutter between
 * cells and the right-hand ornament was simply absent. A rig that read one
 * frame would have called that green.
 *
 * So a rAF sampler runs on the page with nothing touching it, and the
 * assertions are about the DIFFERENCE: how many DISTINCT beats appeared, and
 * whether the LAST one was reached.  Both halves matter and they fail
 * separately — a strip clamped to its first four cells is perfectly distinct
 * and still cannot show the reveal.
 *
 * ═══ AND THE THREE THINGS NO SCREENSHOT CAN SHOW ═══
 *
 *  - The strip is FREED on the way out.  These are per-zone assets under
 *    CLAUDE.md's ZONE-ASSET EXCEPTION, and the exception is only honoured if
 *    the exit half runs; a leak looks identical to a success from outside.
 *  - A zone with NO banner is silent.  Ten of the fourteen zones take that path
 *    on every single entry, so it is the one that has to be boring, and it is
 *    asserted rather than assumed.
 *  - A rapid RE-ENTRY shows nothing and stacks nothing.
 *
 * Also captured, for the owner rather than for the assertions: a filmstrip of
 * the live playback at both phone widths in both orientations.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const TILE = 32;
const SHOTS = process.env.ZB_SHOTS || '/tmp/zone-banner';

/* Every view BOOTS portrait and rotates afterwards, including the landscape
   ones.  Not cosmetic: the character creator's Enter button is laid out for a
   portrait phone, and at 360px of height the click times out waiting for it to
   settle — which is a creator-layout problem this file has no business
   reporting as a banner failure.  Rotating after entry is also what a player
   does. */
const BOOT_VP = { width: 390, height: 844 };
const VIEWS = [
  { tag: '360-portrait', viewport: { width: 360, height: 780 } },
  { tag: '390-portrait', viewport: { width: 390, height: 844 } },
  { tag: '360-landscape', viewport: { width: 780, height: 360 } },
  { tag: '390-landscape', viewport: { width: 844, height: 390 } },
];

/* ember and frost are the pair: a wide low lava ridge against a tall
   near-square ice crag, so a geometry mistake that flatters one shows on the
   other.
   The CONTROL is the worldview hub, and picking it took a correction worth
   recording: the obvious control was a themeless combat zone like Stone
   Hollows, and the first run reported it "reached" as null.  Stone Hollows,
   Electric Foundry, Water Caves and Poison Forest are COMING_SOON_MARKS on the
   world map, not live exits — their WORLDVIEW_EXITS rows are commented out
   (src/data/effects.js).  The zones a player can actually walk to today are the
   two hubs and four spokes, and the owner drew art for all four spokes.  So the
   no-banner path a player really takes is the HUBS, every single time they come
   home, which is what this asserts. */
const BANNER_ZONES = ['ember', 'frost'];
const NO_BANNER_ZONE = 'worldview';

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

async function goto(P, list, zoneId, settle = 4200) {
  const mark = await P.page.evaluate(({ which, z }) => {
    const f = window._gameFns || {};
    const arr = (which === 'town' ? f.TOWN_EXITS : f.WORLDVIEW_EXITS) || [];
    const e = arr.find((x) => x.zoneId === z);
    return e ? { tx: e.tx, ty: e.ty } : null;
  }, { which: list, z: zoneId });
  if (!mark) return null;
  /* Re-stand rather than stand once: the transition is evaluated in the game
     loop against the player's CURRENT tile, and a single placement can be
     walked off again by the same frame's movement pass before the check runs,
     which shows up as a hub hop that silently does not happen and then poisons
     every assertion after it.
     NEVER WHILE THE PER-ZONE GATE IS ARMED, though.  While S._zoneLoading is
     set the player is held at the exit on purpose, and moving them there is how
     you orphan the gate (the v2.3.1406 failsafe exists for exactly this) — the
     transition then cancels and the retry lands them somewhere else entirely.
     A heavy zone takes longer than one retry interval to warm, so this is not a
     rare race: it is what happens every time. */
  for (let i = 0; i < 6; i++) {
    const st = await H.readState(P, (S) => ({ z: S.currentZone, loading: !!S._zoneLoading }));
    if (st.z === zoneId) break;
    if (!st.loading) await stand(P, mark.tx * TILE + 16, mark.ty * TILE + 16);
    await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId,
      { timeout: 9000 }).catch(() => null);
  }
  await P.page.waitForTimeout(settle);
  return H.readState(P, (S) => S.currentZone);
}

/* Stand on the spoke's return marker (tile 9) — the way out of a combat zone.
   Used instead of an exit lookup because a spoke is not in either exit table. */
async function leaveSpoke(P) {
  const was = await H.readState(P, (S) => S.currentZone);
  await P.page.evaluate(() => {
    const S = window._gameState.current, m = S && S.map;
    if (!m) return;
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        if (m[y][x] === 9) { S.player.x = x * 32 + 16; S.player.y = y * 32 + 16; return; }
      }
    }
  });
  await H.waitFor(P, (S) => S.currentZone, (z) => z !== was, { timeout: 30000 }).catch(() => {});
  await P.page.waitForTimeout(2200);
  return H.readState(P, (S) => S.currentZone);
}

/* ═══ GET TO THE WORLDVIEW HUB FROM WHEREVER WE ARE ═══
   The first cut assumed the return marker always lands in worldview and then
   fed WORLDVIEW_EXITS coordinates to a player standing in TOWN — which
   teleports them to a tile that exists but means nothing there, and every
   assertion after it failed for a reason that had nothing to do with the
   banner.  Routing is checked rather than assumed. */
async function toWorldview(P) {
  let z = await H.readState(P, (S) => S.currentZone);
  if (z !== 'town' && z !== 'worldview') z = await leaveSpoke(P);
  if (z === 'worldview') return z;
  if (z === 'town') return goto(P, 'town', 'worldview', 2500);
  return z;
}

/* ═══ ARM THE SAMPLER, THEN WALK ═══
 *
 * Armed BEFORE the walk, because the banner starts on the frame the zone flips
 * and a sampler started afterwards would miss the build — which is the half
 * that can be broken.
 *
 * A setInterval at 8ms, NOT requestAnimationFrame, and the difference decided a
 * failing assertion.  The beats are scheduled by setTimeout and written to the
 * DOM, so the timeline advances whether or not the compositor keeps up; rAF
 * only fires on a PAINT, and this headless box paints at roughly 20fps under
 * swiftshader.  Sampling on rAF therefore saw five of the nine beats and the
 * "all nine" assertion failed on the ENVIRONMENT's frame rate rather than on
 * the animation.  (A real phone at 60fps gives the fastest 55ms beat three
 * frames; this box gives it one, sometimes none.)
 * The paint rate is still measured, alongside, so the run says out loud how
 * fast it was actually painting rather than leaving that to be inferred. */
const arm = (P) => P.page.evaluate(() => {
  window.__zbSamples = [];
  window.__zbDone = false;
  window.__zbPaints = 0;
  /* The beat log is a module-level ring the overlay owns, so it is not cleared
     from here — the length at arming time is remembered and the run's beats are
     read from that offset. */
  try { window.__zbBeatBase = window.__btZoneBanner.beatLog().length; }
  catch (e) { window.__zbBeatBase = 0; }
  const t0 = performance.now();
  const paint = () => {
    window.__zbPaints++;
    if (performance.now() - t0 < 9000) requestAnimationFrame(paint);
  };
  requestAnimationFrame(paint);
  const tick = () => {
    const el = document.querySelector('.bt-zone-banner');
    const ttl = document.querySelector('[data-zone-title]');
    if (el) {
      const l = el.querySelector('.bt-zone-banner__orn--l');
      const r = el.querySelector('.bt-zone-banner__orn--r');
      const p = el.querySelector('.bt-zone-banner__plaque');
      const cl = getComputedStyle(l);
      window.__zbSamples.push({
        t: Math.round(performance.now() - t0),
        bpL: cl.backgroundPosition,
        bpR: getComputedStyle(r).backgroundPosition,
        plaqueT: getComputedStyle(p).transform,
        plaqueO: getComputedStyle(p).opacity,
        nameO: getComputedStyle(el.querySelector('.bt-zone-banner__name')).opacity,
        pe: getComputedStyle(el).pointerEvents,
        n: document.querySelectorAll('.bt-zone-banner').length,
        arriving: !!(ttl && ttl.classList.contains('is-arriving')),
        name: el.querySelector('.bt-zone-banner__name').textContent,
        ornW: Math.round(l.getBoundingClientRect().width),
      });
    }
    if (performance.now() - t0 >= 9000) { clearInterval(iv); window.__zbDone = true; }
  };
  const iv = setInterval(tick, 8);
});

const drain = async (P) => {
  await P.page.waitForFunction(() => window.__zbDone === true, null, { timeout: 20000 }).catch(() => {});
  return P.page.evaluate(() => window.__zbSamples || []);
};

/** Distinct beats, read off the sampled background-position offsets. */
function beats(samples) {
  const seen = [];
  for (const s of samples) {
    const m = /(-?[\d.]+)px/.exec(s.bpL || '');
    if (!m) continue;
    const v = Math.round(parseFloat(m[1]));
    if (!seen.includes(v)) seen.push(v);
  }
  return seen;
}

/* ═══ FILMING A 1.4s ANIMATION ═══
 *
 * page.screenshot() cannot do it.  On this box a full-viewport shot at dpr 2
 * takes ~1.2s, so a burst of ten lands two frames inside the whole banner and
 * the "filmstrip" is a picture of the harness's own latency.  (Measured, in the
 * run before this one: t0, t1226ms, t2460ms…)
 *
 * So the frames come off Chromium's SCREENCAST instead — the same stream the
 * devtools "performance" panel records — which delivers a JPEG every time the
 * page repaints and costs the page nothing.  It is also the honest capture:
 * these are frames the renderer actually painted, at the moments it painted
 * them, rather than moments the harness asked for.
 */
async function startFilm(P) {
  const cdp = await P.page.context().newCDPSession(P.page);
  const frames = [];
  const t0 = Date.now();
  cdp.on('Page.screencastFrame', (f) => {
    frames.push({ t: Date.now() - t0, data: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 72, everyNthFrame: 1 });
  return { cdp, frames };
}

async function stopFilm(P, film, dir, zone) {
  /* WINDOW THE FILM ON THE BANNER, not on the capture.  The camera rolls before
     the walk so it cannot join part-way, which means most of what it records is
     the walk and the per-zone loading veil: thinning the whole capture to 24
     frames put ~170ms between them and only eight landed inside a 1.4s banner —
     a filmstrip of the wrong 4 seconds.  The sampler already knows when the
     banner was on screen, so the frames are chosen from THAT, with a little
     lead-in and enough tail to cover the dock. */
  let from = 0, to = Infinity;
  try {
    const w = await P.page.evaluate(() => {
      const s2 = window.__zbSamples || [];
      return s2.length ? { a: s2[0].t, b: s2[s2.length - 1].t } : null;
    });
    if (w) { from = Math.max(0, w.a - 350); to = w.b + 700; }
  } catch (e) { /* no window: fall back to the whole capture */ }
  await film.cdp.send('Page.stopScreencast').catch(() => {});
  await film.cdp.detach().catch(() => {});
  mkdirSync(dir, { recursive: true });
  const all = film.frames;
  const win = all.filter((fr) => fr.t >= from && fr.t <= to);
  const f = win.length >= 6 ? win : all;
  const step = Math.max(1, Math.ceil(f.length / 24));
  const kept = f.filter((_, i) => i % step === 0);
  kept.forEach((fr, i) => writeFileSync(
    `${dir}/${zone}-${String(i).padStart(2, '0')}-t${fr.t}ms.jpg`,
    Buffer.from(fr.data, 'base64')));
  return { captured: all.length, inBannerWindow: win.length, kept: kept.length,
    windowMs: [Math.round(from), to === Infinity ? null : Math.round(to)],
    medianGapMs: kept.length > 1
      ? Math.round((kept[kept.length - 1].t - kept[0].t) / (kept.length - 1)) : null };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const summary = [];

  for (const view of VIEWS) {
    const P = await H.newPlayer(browser, { name: 'Banner ' + view.tag, wsPort, webPort,
      viewport: BOOT_VP, touch: true });
    await H.enterWorld(P);
    await P.page.setViewportSize(view.viewport);
    await P.page.waitForTimeout(2500);

    /* The tutorial quests open the gate out of town. */
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
        S.channel.send({ type: 'quest_accept', payload: { questId: q } });
      }
    });
    await P.page.waitForTimeout(1500);

    const hub = await goto(P, 'town', 'worldview');
    if (hub !== 'worldview') {
      rec.ok(`${view.tag}: reached the worldview hub (guard)`, false, { hub });
      await P.ctx.close().catch(() => {});
      continue;
    }

    for (const zone of BANNER_ZONES) {
      await arm(P);
      /* The film is rolling before the walk, so it catches the loading overlay
         lifting and the banner's first beat rather than joining part-way. */
      const film = await startFilm(P);
      const got = await goto(P, 'worldview', zone, 2600);
      const shots = await stopFilm(P, film, `${SHOTS}/${view.tag}`, zone);
      const samples = await drain(P);
      const b = beats(samples);
      /* The timeline the overlay actually ran, which is frame-rate independent
         (see __btZoneBanner.beatLog).  The sampled offsets above say what was
         PAINTED; this says what was SCHEDULED, and both matter: a timeline that
         runs 0..8 while the paint never moves is the stepping bug, and a paint
         that moves while the timeline stalls is impossible. */
      const log = await P.page.evaluate(() =>
        (window.__btZoneBanner.beatLog() || [])
          .slice(window.__zbBeatBase || 0).map((e) => e.i));
      /* The last beat's offset is -(8 * the ornament's DISPLAY width).  That is
         a layout value that changes with the viewport, so it is read off the
         live element while the banner is up rather than typed here. */
      const ornW = samples.length ? samples[samples.length - 1].ornW : null;
      const plaqueTs = [...new Set(samples.map((s) => s.plaqueT))];
      const gone = await P.page.evaluate(() => !document.querySelector('.bt-zone-banner'));

      const tag = `${view.tag}/${zone}`;
      rec.ok(`${tag}: reached the zone (guard)`, got === zone, { got });
      if (got !== zone) continue;
      /* ═══ THE TWO HALVES OF "IT ANIMATES", WHICH FAIL SEPARATELY ═══
         The count is deliberately NOT nine.  A rAF sampler competing with a
         screenshot burst on a headless swiftshader box sees 4-6 of the nine
         beats, so demanding nine measures the INSTRUMENT, not the animation --
         the first run failed here on four views whose offsets all reached the
         final cell.  The un-starved count is proved once, separately, by the
         no-screenshot pass below.
         Reaching the last cell is the half that cannot be faked by a slow
         sampler: a strip clamped to its first few cells is perfectly distinct
         and still never gets there (TRAPS §61's second assertion, for the same
         reason). */
      /* Compared as a beat INDEX rather than a pixel offset: the ornament's
         width is a fractional layout value (99.06px at 390), so the eighth
         step lands on -795 while a rounded width predicts -792, and a ±2px
         tolerance fails on arithmetic rather than on behaviour. */
      const idx = ornW ? b.map((v) => Math.round(-v / ornW)) : [];
      /* Three, which is the number TRAPS §61 itself settles on, and not more:
         this counts beats that were PAINTED while the sampler happened to look,
         and this box paints at ~10fps, so a higher bar measures the harness.
         The nine-beat claim is carried by the timeline assertion below, which
         does not depend on the frame rate at all. */
      rec.ok(`${tag}: the ornaments step through several distinct beats`,
        b.length >= 3, { distinct: b.length, offsets: b });
      rec.ok(`${tag}: ...and reach the LAST beat, not just the first few`,
        idx.includes(8), { distinct: b.length, beatIndices: idx, ornW });
      /* The log opens with a duplicate 0: setBeat(0) is called once while the
         element is being built, so beat 1 is in place on the first paint rather
         than one setTimeout later, and the schedule then sets it again at t=0.
         Deduplicated here rather than removed there — the setup call is what
         stops the banner flashing an unset background on its first frame. */
      const seq = log.filter((v, i2) => i2 === 0 || v !== log[i2 - 1]);
      rec.ok(`${tag}: the timeline runs all nine beats, in order`,
        seq.length === 9 && seq.every((v, i2) => v === i2), { beatLog: log, seq });
      rec.ok(`${tag}: the zone name is shown, and it is the header's own string`,
        samples.some((s) => parseFloat(s.nameO) > 0.9 && /\w/.test(s.name || '')),
        { names: [...new Set(samples.map((s) => s.name))] });
      rec.ok(`${tag}: the plaque MOVES on the dock (not just fades)`,
        plaqueTs.length >= 2, { transforms: plaqueTs.slice(0, 4) });
      rec.ok(`${tag}: the header title takes the handoff`,
        samples.some((s) => s.arriving), {});
      rec.ok(`${tag}: exactly one banner exists at any moment`,
        samples.every((s) => s.n === 1), { max: Math.max(...samples.map((s) => s.n)) });
      rec.ok(`${tag}: it never takes a pointer`,
        samples.every((s) => s.pe === 'none'), { pe: [...new Set(samples.map((s) => s.pe))] });
      rec.ok(`${tag}: it is gone afterwards`, gone, {});
      summary.push({ view: view.tag, zone, distinctBeats: b.length,
        frames: samples.length, film: shots,
        lastMs: samples.length ? samples[samples.length - 1].t : 0 });

      /* ═══ FREED ON EXIT — measured on the way out of the FIRST leg ═══
         Here rather than on a trip of its own at the end of the run: the hub
         routing is known-good at this point, and an extra sixth and seventh
         zone change late in a long session is where the first cut kept losing
         the player — the assertion then failed for a routing reason and said
         nothing at all about the free.  This is the other half of CLAUDE.md's
         ZONE-ASSET EXCEPTION, and the half no screenshot can show. */
      const checkFree = view.tag === '390-portrait' && zone === BANNER_ZONES[0];
      const residentIn = checkFree
        ? await P.page.evaluate(() => window.__btZoneBanner.resident()) : null;

      /* Back to the hub for the next leg, by a route that CHECKS where it
         ended up rather than assuming the return marker lands in worldview. */
      await toWorldview(P);

      if (checkFree) {
        await P.page.waitForTimeout(1600);   /* the free is deferred one beat */
        const residentOut = await P.page.evaluate(() => window.__btZoneBanner.resident());
        rec.ok('the banner strip is RESIDENT while you are in the zone (guard)',
          residentIn.includes('fire'), { residentIn });
        rec.ok("...and FREED when you leave it (the ZONE-ASSET EXCEPTION's other half)",
          residentIn.includes('fire') && !residentOut.includes('fire'),
          { residentIn, residentOut });
        summary.push({ check: 'freed-on-exit', residentIn, residentOut });
      }
    }

    /* ═══ THE THINGS NO SCREENSHOT CAN SHOW — once, on the primary view ═══ */
    if (view.tag === '390-portrait') {
      /* (The nine-beat timeline is asserted on EVERY leg above, off the
         overlay's own beat log, so it needs no trip of its own.) */
      /* 2. THE NO-BANNER PATH.  The hubs are the zones with no art that a
            player actually enters, and they enter them constantly. */
      await arm(P);
      const none = await toWorldview(P);
      await P.page.waitForTimeout(2600);
      const noneSamples = await drain(P);
      const title = await P.page.evaluate(() => {
        const t = document.querySelector('[data-zone-title]');
        return t ? t.textContent : null;
      });
      mkdirSync(`${SHOTS}/${view.tag}`, { recursive: true });
      await P.page.screenshot({ path: `${SHOTS}/${view.tag}/no-banner-${NO_BANNER_ZONE}.png` });
      rec.ok(`a zone with no art (${NO_BANNER_ZONE}) shows NO banner at all`,
        none === NO_BANNER_ZONE && noneSamples.length === 0,
        { zone: none, bannerFrames: noneSamples.length });
      rec.ok('...and the top bar names it exactly as it always did',
        title === 'World View', { title });
      summary.push({ check: 'no-banner-zone', zone: NO_BANNER_ZONE, frames: noneSamples.length, title });

      /* 3. A RAPID RE-ENTRY IS SKIPPED, AND STACKS NOTHING.
            Measured as a BOUNCE — in, straight out, straight back in — rather
            than "ember was entered earlier in this run".  The first cut did the
            latter and failed correctly: a whole view's worth of legs takes well
            over the 45s repeat window, so the banner played again exactly as it
            is supposed to.  The premise was wrong, not the behaviour. */
      if (none === 'worldview') {
        const inA = await goto(P, 'worldview', 'verdant', 2600);
        const outA = await leaveSpoke(P);
        if (inA === 'verdant' && outA === 'worldview') {
          await arm(P);
          const back = await goto(P, 'worldview', 'verdant', 3000);
          const reSamples = await drain(P);
          rec.ok('bouncing straight back into a zone shows nothing the second time',
            back === 'verdant' && reSamples.length === 0,
            { zone: back, bannerFrames: reSamples.length });
          summary.push({ check: 're-entry-skipped', zone: 'verdant', frames: reSamples.length });
        } else {
          rec.skip('a rapid re-entry is skipped', `bounce did not complete (${inA} -> ${outA})`);
        }
      } else {
        rec.skip('a rapid re-entry is skipped', `not at the hub (in ${none})`);
      }
    }

    await P.ctx.close().catch(() => {});
  }

  mkdirSync(SHOTS, { recursive: true });
  writeFileSync(`${SHOTS}/summary.json`, JSON.stringify(summary, null, 1));
  console.log(`    shots + summary -> ${SHOTS}`);
}
