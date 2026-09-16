/* ═══ v2.3.2591: PHOTOGRAPH THE NEW LEVEL-UP NOTIFICATION IN THE RUNNING GAME ═══
 *
 * Evidence for the owner, and the only honest way to answer the question that
 * decides whether this feature works: does the skill's icon actually sit in
 * the medallion's circle, on every frame, at the sizes the owner plays at?
 *
 * It drives `window._setLevelUpMsg` — the same React setter every real
 * level-up path in the game calls, exposed for autotest at BroTown.jsx:1849 —
 * with payloads shaped exactly as the real senders shape them.  Reaching a
 * real level-up would mean grinding a character up in a headless browser; the
 * thing under test is the PRESENTATION, and this is the same message the
 * presentation receives in play.
 *
 * Built on the mp harness (a real worker + a real join) rather than on
 * tools/qa/qa-ui-shots.mjs, whose "fill the first input and press Enter" boot
 * no longer reaches the world: the login door grew a Continue / Create
 * Character screen in front of it (v2.3.1814), so that rig now photographs
 * the title card.  TRAPS §29 — selecting UI by its shape has an expiry date.
 *
 * Two passes:
 *
 *   hero/       the settled notification at four iPhone framings — 360 and
 *               390 wide, portrait and landscape — for one combat skill and
 *               one life skill.  This is what the player sees.
 *
 *   filmstrip/  all eight frames, each cropped to the SAME box around the
 *               pinned circle centre.  If the anchoring works the medallion
 *               and the icon are in the same place in all eight crops and only
 *               the burst around them changes.  Stepped with Playwright's fake
 *               clock, not by sleeping: the frames are 70-130ms and a
 *               real-time screenshot cannot land inside one reliably, so a
 *               filmstrip captured by racing the animation would be evidence
 *               of nothing.
 *
 * Run: npm run build && node tools/qa/mp/shot-levelup.mjs
 */
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';
/* The frame timings and the pin fraction are IMPORTED, never retyped.  A rig
   that keeps its own copy of the geometry stops testing the game the first
   time the geometry is tuned — which happened here: a hand-copied 0.38
   cropped 17px off the pin and made a locked icon look like a drifting one
   (TRAPS §35, the same defect in its usual costume). */
import { LEVELUP_FRAMES, LEVELUP_PIN_Y_FRAC } from '../../../src/data/levelUpBurst.js';

const OUT = process.argv[2] || 'tools/qa/out/levelup';

/* Shaped exactly as the real senders shape them: the combat one as wsClient's
   prog3_level handler builds it (skill id + label + skillLevel + the
   v2.3.1727 gains line), the life one as celebrateLifeSkillLevel does. */
const CASES = {
  combat: {
    kind: 'combat', level: 14, skill: 'bow', skillLabel: 'Bow', skillLevel: 9,
    gains: '+1.5 damage · +8 max HP · +3 points to spend',
  },
  life: { kind: 'life', skill: 'woodcutting', label: 'Woodcutting', level: 7, gained: 2 },
};

const VIEWS = [
  { name: '360-portrait',  width: 360, height: 640 },
  { name: '360-landscape', width: 640, height: 360 },
  { name: '390-portrait',  width: 390, height: 844 },
  { name: '390-landscape', width: 844, height: 390 },
];

const FRAME_MS = LEVELUP_FRAMES.map((f) => f.ms);

const fire = (page, msg) => page.evaluate((m) => {
  if (typeof window._setLevelUpMsg !== 'function') return false;
  window._setLevelUpMsg({ ...m, ts: Date.now() });
  return true;
}, msg);

/* The coach reads its record at MOUNT, so a post-load write is a write that
   has already missed its own question (the harness makes the same point about
   seeding a Login Key).  It goes in before the bundle does. */
const seedCoachDone = (page) => page.addInitScript(() => {
  try {
    /* Every lesson id in QuestCoach.jsx, so no mark is live.  The list is
       named rather than wildcarded because a NEW lesson should show up here
       as a card in the shot and get added deliberately, not be silently
       suppressed by a rig that says "all of them". */
    const lessons = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll',
      'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const done = {};
    for (const k of lessons) done[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(done));
  } catch (e) { /* private mode */ }
});

/* ═══ CLEAR THE FIRST-SESSION ONBOARDING BEFORE PHOTOGRAPHING ═══
 * A brand-new headless character always has the WELCOME plate and the
 * dashboard coach mark up, and BOTH draw over this overlay — the quest
 * banner sits at z-index 71 to the level-up's 70, deliberately and since
 * v2.3.1745, so that a quest turn-in which also levels you keeps a fixed
 * order.  That is existing behaviour and not this feature's to change
 * (TRAPS §20: raising a z-index is the wrong fix), but a real player meets
 * these cards once, minutes before their first level-up, so leaving them in
 * the evidence would photograph the onboarding rather than the feature.
 * Cleared the way the game clears them, not by hiding anything. */
const clearOnboarding = (page) => page.evaluate(() => {
  try { if (window._setQuestMsg) window._setQuestMsg(null); } catch (e) { /* no bridge yet */ }
  try {
    /* Every lesson id in QuestCoach.jsx, so no mark is live.  The list is
       named rather than wildcarded because a NEW lesson should show up here
       as a card in the shot and get added deliberately, not be silently
       suppressed by a rig that says "all of them". */
    const lessons = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll',
      'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const done = {};
    for (const k of lessons) done[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(done));
  } catch (e) { /* private mode */ }
  try { if (window._uiPanels && window._uiPanels.tourPrompt) window._uiPanels.tourPrompt(false); } catch (e) { /* not mounted */ }
});

/* Fold the dashboard.  Normal play has it folded to the 33dvh tray, and an
   expanded sheet is a different screen — photographing that one would be
   answering a question nobody asked.  Driven as a real tap rather than an
   in-page .click(): the control is a React pointer handler, and BottomDashboard
   carries the state in the selector itself (`min` while folded, `open` once it
   is not, BottomDashboard.jsx:1493) so there is no guessing which it is. */
async function foldDash(page) {
  for (const sel of ['[data-dash-fold="open"]', '[data-land-fold="open"]']) {
    const el = await page.$(sel);
    if (el) { await el.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(500); }
  }
}

/* Is the burst actually on screen, and where is its icon?  Measured off the
   live DOM rather than trusted: a screenshot of a notification that silently
   failed to mount looks exactly like a screenshot of the world. */
const probe = (page) => page.evaluate(() => {
  const img = document.querySelector('[data-levelup-icon]');
  const art = document.querySelector('[data-levelup-art]');
  if (!img || !art) return { mounted: false };
  const ir = img.getBoundingClientRect();
  return {
    mounted: true,
    iconSrc: img.getAttribute('src'),
    iconComplete: img.complete && img.naturalWidth > 0,
    iconCx: ir.left + ir.width / 2, iconCy: ir.top + ir.height / 2, iconW: ir.width,
    caption: (document.querySelector('[data-levelup-caption]') || {}).textContent || '',
  };
});

async function main() {
  mkdirSync(`${OUT}/hero`, { recursive: true });
  mkdirSync(`${OUT}/filmstrip`, { recursive: true });
  const wsPort = await H.freePort(), webPort = await H.freePort();
  const worker = await H.startWorker(wsPort);
  const srv = await H.serveDist(webPort);
  const browser = await H.launch();
  const done = async () => {
    await browser.close().catch(() => {});
    try { srv.close(); } catch { /* best effort */ }
    await H.stopWorker(worker).catch(() => {});
  };
  const findings = [];

  try {
    /* ── pass 1: the settled notification at the owner's sizes ── */
    /* ONE join, then the viewport is resized for each framing.  Not four
       joins: the character creator does not FIT a 360x640 portrait viewport
       (its Play button lands outside it and the click times out), so a rig
       that joined at each size could never photograph the smallest one — and
       that is the size the owner most wants to see.  The notification reads
       window.innerWidth/innerHeight at render, so a resize plus a re-fire is
       the same measurement a phone rotation gives it. */
    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
        hasTouch: true, isMobile: true,
      });
      const page = await ctx.newPage();
      await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
      await seedCoachDone(page);
      await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
      const P = { ctx, page, logs: [], name: 'LevelUp' };
      await H.enterWorld(P);
      await page.waitForTimeout(2500);
      await clearOnboarding(page);
      await foldDash(page);
      await page.waitForTimeout(600);

      for (const view of VIEWS) {
        await page.setViewportSize({ width: view.width, height: view.height });
        await page.waitForTimeout(900); /* let the HUD reflow before firing */
        await foldDash(page);
        for (const [key, msg] of Object.entries(CASES)) {
          await clearOnboarding(page);
          const sent = await fire(page, msg);
          /* past the 590ms run-in, inside the 1500ms hold: the settled frame
             with the caption up, which is the state the player reads */
          await page.waitForTimeout(900);
          const got = await probe(page);
          await page.screenshot({ path: `${OUT}/hero/${view.name}-${key}.png` });
          findings.push({ shot: `${view.name}-${key}`, sent, ...got });
          console.log(`  ${got.mounted && got.iconComplete ? 'OK  ' : 'FAIL'} hero/${view.name}-${key}.png  ` +
            `icon=${(got.iconSrc || '').split('/').pop()} ${got.iconComplete ? 'decoded' : 'NOT DECODED'} ` +
            `w=${got.iconW ? got.iconW.toFixed(1) : '-'} caption=${JSON.stringify(got.caption)}`);
          await page.waitForTimeout(2300); /* let it fade before the next */
        }
      }
      await ctx.close().catch(() => {});
    }

    /* ── pass 2: the filmstrip, clock-stepped ── */
    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
      });
      const page = await ctx.newPage();
      await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
      await seedCoachDone(page);
      await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
      const P = { ctx, page, logs: [], name: 'Filmstrip' };
      await H.enterWorld(P);
      await page.waitForTimeout(2500);
      await clearOnboarding(page);
      await foldDash(page);
      await page.waitForTimeout(600);

      /* The crop box is computed from the SAME constants the component pins
         to, so it is the component's own claim about where the circle is —
         a drifting medallion drifts OUT of this box rather than being
         followed by it. */
      const box = await page.evaluate((f) => ({
        x: Math.round(window.innerWidth / 2 - 110),
        y: Math.round(window.innerHeight * f - 110),
        width: 220, height: 220,
      }), LEVELUP_PIN_Y_FRAC);
      /* Frozen, not raced.  The frames are 70-130ms and a screenshot takes
         longer than that, so stepping the real clock could not land inside a
         named frame.  (A first cut used Playwright's fake clock; under fake
         timers React's scheduler did not flush the component's state on each
         step and four of the eight frames photographed the settled art — a
         filmstrip that agrees with itself for the wrong reason, which is
         worse than no filmstrip.  window.__btLevelUpFreeze pins the frame
         instead, so what is photographed is what is named.) */
      let t = 0;
      for (let i = 0; i < FRAME_MS.length; i++) {
        const mid = Math.round(t + (FRAME_MS[i] ? FRAME_MS[i] / 2 : 40));
        await page.evaluate((ms) => { window.__btLevelUpFreeze = ms; }, mid);
        await fire(page, CASES.life);
        await page.waitForTimeout(250);
        const got = await probe(page);
        await page.screenshot({ path: `${OUT}/filmstrip/f${i}.png`, clip: box });
        findings.push({ shot: `filmstrip-f${i}`, atMs: mid, ...got });
        console.log(`  frame ${i} @${String(mid).padStart(3)}ms  ` +
          `iconCentre=(${got.iconCx ? got.iconCx.toFixed(1) : '-'}, ${got.iconCy ? got.iconCy.toFixed(1) : '-'}) ` +
          `iconW=${got.iconW ? got.iconW.toFixed(1) : '-'}`);
        t += FRAME_MS[i];
      }
      await page.evaluate(() => { delete window.__btLevelUpFreeze; });
      await ctx.close().catch(() => {});
    }

    /* ── pass 3: the two things that are not visible in a screenshot ── */
    /* ═══ PRELOADING IS LAW, SO IT IS CHECKED, NOT ASSERTED IN A COMMENT ═══
       CLAUDE.md: every animation asset is fully loaded during the loading
       screen, before the intro overlay lifts; a first-use fetch is a BUG.
       Both halves of this feature are checked the moment the world is live
       and BEFORE anything has levelled — if either were lazy, this would be
       the frame that proved it. */
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
      const page = await ctx.newPage();
      await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
      await seedCoachDone(page);
      await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
      const P = { ctx, page, logs: [], name: 'Preload' };
      await H.enterWorld(P);
      await page.waitForTimeout(2500);

      const warm = await page.evaluate(async () => {
        const A = window.BT_AUDIO || null;
        return {
          report: (window.__btPreloadReport && window.__btPreloadReport.levelUpBurst) || null,
          spriteReport: window.__btPreloadReport ? Object.keys(window.__btPreloadReport).length : 0,
          audioDecoded: !!(A && A._samples && A._samples['level-up']),
          audioInManifest: !!(A && A.SFX_MANIFEST && A.SFX_MANIFEST['level-up']),
          muted: A ? A.muted : null,
        };
      });
      console.log('\n  PRELOAD');
      console.log(`    preloadWorldAnimations().levelUpBurst = ${warm.report}  (of ${warm.spriteReport} groups)`);
      console.log(`    'level-up' in SFX_MANIFEST = ${warm.audioInManifest}`);
      console.log(`    sting DECODED before any level-up = ${warm.audioDecoded}`);

      /* ═══ AND THE MUTE ═══
         The owner's sound toggle (SettingsPanel.jsx:103) writes BT_AUDIO.muted,
         and BT_AUDIO.play() returns null on it.  A player who muted the game
         and then gets blasted by a level-up chime reports it as a bug, so this
         asks play() directly rather than trusting the early return by eye. */
      const mute = await page.evaluate(() => {
        const A = window.BT_AUDIO;
        if (!A) return null;
        const before = A.muted;
        A.muted = true;
        const whileMuted = A.play('level-up', { vol: 0.55, pitchVar: 0 });
        A.muted = false;
        const whileOn = A.play('level-up', { vol: 0.0001, pitchVar: 0 });
        A.muted = before;
        return { whileMuted: whileMuted === null, whileOn: whileOn !== null };
      });
      console.log(`\n  MUTE`);
      console.log(`    play('level-up') while muted  -> ${mute && mute.whileMuted ? 'silent (null)' : 'PLAYED — BUG'}`);
      console.log(`    play('level-up') while unmuted -> ${mute && mute.whileOn ? 'plays' : 'silent — BUG'}`);
      findings.push({ shot: 'preload', ...warm, mute });
      await ctx.close().catch(() => {});
    }

    /* ═══ THE ASSERTION, not just the pictures ═══
       Every filmstrip frame must put the icon's CENTRE in the same place, to
       within a pixel.  This is the whole feature stated as a number: the
       owner asked for the icon "anchored in the middle circle", and an icon
       that wanders is the failure they would notice first. */
    const strip = findings.filter((f) => f.shot.startsWith('filmstrip-') && f.mounted);
    const xs = strip.map((f) => f.iconCx), ys = strip.map((f) => f.iconCy);
    const dx = Math.max(...xs) - Math.min(...xs), dy = Math.max(...ys) - Math.min(...ys);
    const ws = strip.map((f) => f.iconW);
    console.log(`\n  ${strip.length}/8 frames mounted`);
    console.log(`  icon centre drift across the run: dx=${dx.toFixed(2)}px dy=${dy.toFixed(2)}px  (must be ~0)`);
    console.log(`  icon width, frame 0 -> 7: ${ws.map((w) => w.toFixed(1)).join(' -> ')}  (scales WITH the medallion)`);
    const pre = findings.find((f) => f.shot === 'preload') || {};
    const ok = strip.length === 8 && dx < 1 && dy < 1
      && findings.filter((f) => f.shot.startsWith('360') || f.shot.startsWith('390')).every((f) => f.mounted && f.iconComplete)
      && pre.report === 'fulfilled' && pre.audioDecoded === true
      && !!(pre.mute && pre.mute.whileMuted && pre.mute.whileOn);
    console.log(ok ? '\nPASS — icon locked to the circle, every hero shot mounted, both assets warm before first use, mute respected'
                   : '\nFAIL — see the rows above');
    console.log(`\nwrote ${OUT}`);
    if (!ok) process.exitCode = 1;
  } finally {
    await done();
  }
}
main();
