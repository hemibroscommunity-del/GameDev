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
import { mkdirSync, writeFileSync } from 'node:fs';
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
    gains: '+1.5 damage · +3 Bow points',
  },
  life: { kind: 'life', skill: 'woodcutting', label: 'Woodcutting', level: 7, gained: 2 },
  /* v2.3.2615: the character level.  No skill — the medallion is the player's
     own portrait, which is the owner's ask. */
  char: { kind: 'char', level: 14, gains: '+2 max HP · +3 shared points' },
};

/* ═══ v2.3.2615: THE REAL SOCKET FRAME ═══
 * Shaped as server/src/prog3.js emits it.  Driven through window.__btWsEvent
 * (wsClient.js) so the SPLIT is what is under test: one server message has to
 * raise two notifications, and a rig that pushed two messages itself would
 * pass on a build where the handler still raises one — the build the owner
 * reported.  charLevel 14 = 6 + 7 + 1, a sum the client can also compute. */
const PROG3_FRAME = {
  type: 'prog3_level',
  payload: { skill: 'bow', level: 7, charLevel: 14, shared: 3, bonusPoints: 0 },
};

const VIEWS = [
  { name: '360-portrait',  width: 360, height: 640 },
  { name: '360-landscape', width: 640, height: 360 },
  { name: '390-portrait',  width: 390, height: 844 },
  { name: '390-landscape', width: 844, height: 390 },
];

/* v2.3.2615: the tray is 33dvh in portrait and absent in landscape — the same
   line LevelUpBurst solves its caption fit against.  Nothing the burst draws
   may cross it in portrait, and nothing may leave the viewport in either. */
const worldBottomOf = (v) => (v.height >= v.width ? v.height * 0.67 : v.height);

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

/* ═══ v2.3.2615: EVERY burst on screen, not just the first ═══
 * `probe` above answers about document.querySelector — the FIRST match — which
 * was the whole truth while only one burst could exist and is now exactly the
 * blind spot this change is about.  A second notification that failed to mount
 * is invisible to a one-element probe, and so is a pair that overlaps. */
const probeAll = (page) => page.evaluate(() => {
  const out = [];
  for (const root of document.querySelectorAll('[data-levelup-kind]')) {
    const img = root.querySelector('[data-levelup-icon]');
    const art = root.querySelector('[data-levelup-art]');
    const cap = root.querySelector('[data-levelup-caption] > div');
    if (!img || !art) continue;
    const ir = img.getBoundingClientRect();
    const ar = art.getBoundingClientRect();
    const cr = cap ? cap.getBoundingClientRect() : null;
    out.push({
      kind: root.getAttribute('data-levelup-kind'),
      col: Number(root.getAttribute('data-levelup-col')),
      iconSrc: img.getAttribute('src'),
      /* A data: URL is the portrait; the file name is enough for anything else
         and printing 300KB of base64 into a log helps nobody. */
      iconLabel: (img.getAttribute('src') || '').startsWith('data:')
        ? 'portrait(data-url)' : (img.getAttribute('src') || '').split('/').pop(),
      iconComplete: img.complete && img.naturalWidth > 0,
      iconCx: ir.left + ir.width / 2, iconCy: ir.top + ir.height / 2, iconW: ir.width,
      /* The painted extents that matter for crowding: the art's box and the
         caption plate's box.  Both, because they are different widths and
         either one can be the pair that touches. */
      art: { l: ar.left, r: ar.right, t: ar.top, b: ar.bottom },
      cap: cr ? { l: cr.left, r: cr.right, t: cr.top, b: cr.bottom } : null,
      caption: cap ? cap.textContent : '',
    });
  }
  return out;
});

/* TRAPS §81: floor the MINIMUM over every painted pair, and print the worst
   one's number even when it passes — whether the gap is enough is a judgement
   only the owner can make, and a bare `passed` denies them the chance.  Here
   the pairs are (burst i, burst j) across BOTH of the boxes each burst paints,
   which is four comparisons per pair rather than the one an art-only test
   would have made. */
/* ═══ v2.3.2615: FILMING TWO BURSTS THAT HAVE TO PLAY TOGETHER ═══
 *
 * page.screenshot() cannot film this and the first cut of this pass proved it:
 * a full-viewport shot at dpr 2 costs ~1.2s on this box, so ten of them sample
 * a 2.6s celebration about twice.  "Both played" is a claim about TIME — that
 * two animations ran at once, not that two elements existed at one instant —
 * and a sampler slower than the thing it samples cannot make it (TRAPS §61).
 *
 * So the frames come off Chromium's screencast, the same stream devtools
 * records: a JPEG on every repaint, costing the page nothing, and each one is a
 * frame the renderer actually painted at the moment it painted it.  Lifted from
 * tools/qa/mp/mp-zonebanner.mjs, which made the same argument for the same
 * reason one version earlier. */
async function startFilm(page) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  const t0 = Date.now();
  cdp.on('Page.screencastFrame', (f) => {
    frames.push({ t: Date.now() - t0, data: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
  return { cdp, frames };
}

async function stopFilm(film) {
  await film.cdp.send('Page.stopScreencast').catch(() => {});
  await film.cdp.detach().catch(() => {});
  return film.frames;
}

/* Tile the kept frames into one labelled sheet.  Composed in a Chromium page
   rather than with an image library because the repo has no image library and
   the browser is already running — the same move tools/sheet_montage.mjs
   makes. */
async function composeSheet(browser, frames, { cols, cellW, title }) {
  const rows = Math.ceil(frames.length / cols);
  const ctx = await browser.newContext({ viewport: { width: 32, height: 32 } });
  const page = await ctx.newPage();
  await page.setContent('<body style="margin:0"><canvas id="c"></canvas></body>');
  const dataUrl = await page.evaluate(async ({ items, cols: C, cellW: W, rows: R, title: T }) => {
    const imgs = await Promise.all(items.map((it) => new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = 'data:image/jpeg;base64,' + it.data;
    })));
    const first = imgs.find(Boolean);
    if (!first) return null;
    const k = W / first.naturalWidth;
    const H = Math.round(first.naturalHeight * k);
    const LAB = 22, PAD = 6, HEAD = 34;
    const c = document.getElementById('c');
    c.width = C * (W + PAD) + PAD;
    c.height = HEAD + R * (H + LAB + PAD) + PAD;
    const g = c.getContext('2d');
    g.fillStyle = '#12191d'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#F7F2E7';
    g.font = '600 18px sans-serif';
    g.fillText(T, PAD + 2, 23);
    g.font = '600 13px monospace';
    imgs.forEach((im, i) => {
      const cx = PAD + (i % C) * (W + PAD);
      const cy = HEAD + Math.floor(i / C) * (H + LAB + PAD);
      if (im) g.drawImage(im, cx, cy, W, H);
      g.fillStyle = '#B9C1BF';
      g.fillText(items[i].t + 'ms', cx + 2, cy + H + 15);
    });
    return c.toDataURL('image/jpeg', 0.84);
  }, { items: frames, cols, cellW, rows, title });
  await ctx.close().catch(() => {});
  if (!dataUrl) return null;
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

function worstGap(bursts) {
  let worst = null;
  for (let i = 0; i < bursts.length; i++) {
    for (let j = i + 1; j < bursts.length; j++) {
      for (const [an, a] of [['art', bursts[i].art], ['caption', bursts[i].cap]]) {
        for (const [bn, b] of [['art', bursts[j].art], ['caption', bursts[j].cap]]) {
          if (!a || !b) continue;
          /* Horizontal clearance between two side-by-side boxes.  Negative
             means they overlap, and by how much. */
          const gap = Math.max(a.l, b.l) - Math.min(a.r, b.r);
          /* Boxes that do not share any vertical span cannot crowd each other
             however close their x ranges are. */
          const vOverlap = Math.min(a.b, b.b) - Math.max(a.t, b.t);
          if (vOverlap <= 0) continue;
          if (worst == null || gap < worst.gap) {
            worst = { gap, pair: `${bursts[i].kind}.${an} | ${bursts[j].kind}.${bn}` };
          }
        }
      }
    }
  }
  return worst;
}

async function main() {
  mkdirSync(`${OUT}/hero`, { recursive: true });
  mkdirSync(`${OUT}/filmstrip`, { recursive: true });
  mkdirSync(`${OUT}/pair`, { recursive: true });
  mkdirSync(`${OUT}/pairstrip`, { recursive: true });
  mkdirSync(`${OUT}/statnotice`, { recursive: true });
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

    /* ── pass 2b: ONE NOTIFICATION, AT THE OWNER'S SIZES ── */
    /* ═══ v2.3.2659: THE PAIR PASS BECOMES THE SINGLE PASS ═══
       Owner: "for leveling up don't show both the character and the skill
       level up anymore, just show the skill level up."

       v2.3.2615 built this pass to prove ONE prog3_level raised TWO
       notifications.  The owner has now asked for the opposite, so the pass
       is INVERTED rather than deleted: same socket frame, same four framings,
       same probe — and the count, the kinds and the medallion all read the
       other way.  Deleting it would have left the new behaviour with no
       evidence at all, and "we removed a notification" is precisely the claim
       a screenshot cannot make on its own (TRAPS §61: absence needs a check
       that would read differently on the build before the change).

       Driven by ONE real socket frame through the real onmessage, so what is
       photographed is the handler's own decision — not the rig's.  On the
       PREVIOUS build this pass photographs two bursts and fails on the count. */
    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
      });
      const page = await ctx.newPage();
      await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
      await seedCoachDone(page);
      await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
      const P = { ctx, page, logs: [], name: 'Pair' };
      await H.enterWorld(P);
      await page.waitForTimeout(2500);
      await clearOnboarding(page);
      await foldDash(page);
      await page.waitForTimeout(600);

      /* The character has to be ON a prog3 track for the handler's char-level
         branch to have a previous level to compare against.  Seeded through
         the blob the worker actually stores rather than by poking rpg.level,
         which prog3 derives and would overwrite (TRAPS §81's corollary: a
         fixture that sets the wrong field makes the row vacuous). */
      await page.evaluate(() => {
        const S = window._gameState && window._gameState.current;
        if (!S || !S.rpg) return false;
        if (!S.rpg.prog3) S.rpg.prog3 = {};
        S.rpg.prog3.sk = { sword: { level: 6 }, bow: { level: 6 }, staff: { level: 1 } };
        S.rpg._lastCharLvlShown = 13;
        return true;
      });

      for (const view of VIEWS) {
        await page.setViewportSize({ width: view.width, height: view.height });
        await page.waitForTimeout(900);
        await foldDash(page);
        await clearOnboarding(page);
        /* Re-baseline between views: the same frame is fired four times and
           the char branch only fires on a level it has not shown. */
        await page.evaluate(() => {
          const S = window._gameState && window._gameState.current;
          if (S && S.rpg) S.rpg._lastCharLvlShown = 13;
        });
        /* The camera rolls BEFORE the socket frame, so it catches the first
           beat rather than joining part-way. */
        const film = await startFilm(page);
        const sent = await page.evaluate((f) => (window.__btWsEvent ? window.__btWsEvent(f) : false), PROG3_FRAME);
        await page.waitForTimeout(900);  /* settled frame, caption up */
        const bursts = await probeAll(page);
        /* ═══ THE HIGH-WATER THE SECOND ANNOUNCEMENT IS SUPPRESSED BY ═══
           R.level catches up to the new character level a beat later, when the
           player_state carrying the new blob lands, and celebrateLevelUps then
           has every reason to announce it again on the next kill.  It does not,
           because it reads this stamp (levelCelebration.js).  The kill paths
           that call it are local combat loops with no rig seam, so what is
           asserted here is the INPUT to that guard: if this stops being
           stamped, the suppression stops working, silently. */
        const shownHW = await page.evaluate(() => {
          const S = window._gameState && window._gameState.current;
          return S && S.rpg ? (S.rpg._lastCharLvlShown || 0) : 0;
        });
        /* JPEG, unlike the hero shots: these are for the owner to LOOK at (they
           go in the PR's companion page) and four 2x PNGs of a sunlit town is
           6MB of repository for no extra truth.  The measurements that decide
           pass/fail come off the DOM below, not off these pixels. */
        await page.screenshot({ path: `${OUT}/pair/${view.name}.jpg`, type: 'jpeg', quality: 86 });

        const wb = worldBottomOf(view);
        const offscreen = bursts.filter((b) => b.art.l < 0 || b.art.r > view.width
          || (b.cap && (b.cap.l < 0 || b.cap.r > view.width)));
        const belowTray = bursts.filter((b) => b.cap && b.cap.b > wb);
        const gap = worstGap(bursts);
        findings.push({
          shot: `pair-${view.name}`, sent, n: bursts.length,
          kinds: bursts.map((b) => b.kind).join('+'),
          gap: gap ? gap.gap : null, gapPair: gap ? gap.pair : '',
          offscreen: offscreen.length, belowTray: belowTray.length,
          allDecoded: bursts.every((b) => b.iconComplete),
          portrait: bursts.some((b) => b.kind === 'char' && (b.iconSrc || '').startsWith('data:')),
          shownHW,
        });
        console.log(`  ${bursts.length === 1 && bursts.every((b) => b.kind !== 'char') ? 'OK  ' : 'FAIL'} pair/${view.name}.jpg  ` +
          `${bursts.length} burst(s) [${bursts.map((b) => `${b.kind}:${b.iconLabel}${b.iconComplete ? '' : ' NOT-DECODED'}`).join(', ')}]`);
        /* Printed whether or not it passes — see TRAPS §81. */
        console.log(`       worst painted-pair gap ${gap ? gap.gap.toFixed(1) + 'px  (' + gap.pair + ')' : 'n/a — fewer than two bursts'}` +
          `   offscreen=${offscreen.length} captionBelowTray=${belowTray.length} charShownHighWater=${shownHW}`);
        for (const b of bursts) console.log(`       col${b.col} ${b.kind}: ${JSON.stringify(b.caption)}`);

        /* Let the whole celebration play under the camera, then cut the film
           down to a readable sheet.  Thinned by INDEX rather than by time so
           the cadence of the sheet matches the cadence of the repaints. */
        await page.waitForTimeout(2200);
        const all = await stopFilm(film);
        const step = Math.max(1, Math.ceil(all.length / 12));
        const kept = all.filter((_, i) => i % step === 0).slice(0, 12);
        const sheet = await composeSheet(browser, kept, {
          cols: 4, cellW: view.width >= view.height ? 300 : 210,
          title: `One notification, one prog3_level — ${view.name} `
            + `(${all.length} painted frames, every ${step}${step === 1 ? '' : 'th'} shown)`,
        });
        if (sheet) writeFileSync(`${OUT}/pairstrip/${view.name}.jpg`, sheet);
        console.log(`       filmed ${all.length} painted frame(s) -> pairstrip/${view.name}.jpg`);
        findings.push({ shot: `film-${view.name}`, painted: all.length });
        await page.waitForTimeout(500);
      }

      /* ═══ AND IT HAS TO MOVE (TRAPS §61) ═══
         Every reading above is one frame, and a burst frozen on frame 0 would
         satisfy all of them.  So: one more fire, sampled over its own run with
         nothing touching the page, asserting on the DIFFERENCE — how many
         distinct medallion widths the burst takes.  A burst whose art never
         advances is exactly the failure a still-frame suite cannot see.
         v2.3.2659: the `char` counter is KEPT and must stay at zero.  Counting
         a thing that should not exist is how absence is measured — dropping
         the counter would turn this row into one that cannot fail. */
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(700);
      await foldDash(page);
      await page.evaluate(() => {
        const S = window._gameState && window._gameState.current;
        if (S && S.rpg) S.rpg._lastCharLvlShown = 13;
      });
      await page.evaluate((f) => window.__btWsEvent(f), PROG3_FRAME);
      const widths = { combat: new Set(), char: new Set() };
      for (let i = 0; i < 10; i++) {
        const bs = await probeAll(page);
        for (const b of bs) if (widths[b.kind]) widths[b.kind].add(Math.round(b.iconW * 10) / 10);
        await page.waitForTimeout(90);
      }
      const distinct = { combat: widths.combat.size, char: widths.char.size };
      findings.push({ shot: 'pair-motion', ...distinct });
      console.log(`\n  MOTION (sampled over one run, nothing touching the page)`);
      console.log(`    distinct medallion widths — skill burst: ${distinct.combat} (1 means frozen), `
        + `character burst: ${distinct.char} (MUST be 0 — it is not shown any more)`);
      await ctx.close().catch(() => {});
    }

    /* ── pass 2c: THE "IMPOSSIBLE" LEVEL ── */
    /* Owner: "I raised a combat level without leveling up any of my combat
       skills which should be impossible (it also played the legacy level up)."
       It was not a level.  distributeKillXpToBuild still runs on every monster
       kill with no prog3 gate, the legacy T1 stats still tick over their
       thresholds, and a crossing fired the old gold banner reading "LEVEL UP!"
       over "Level 24" — with BUILD_LABELS calling those stats Melee / Bow /
       Magic, the same three words as the prog3 combat skills.
       Driven THROUGH THE KILL, not by poking the message: window.__btDispatch
       hands the real monster_kill payload to the real handler, which is the
       only way to show that the crossing happens and that nothing is said
       about it.  Two characters, one page: the same kill lands on a prog3 blob
       and on a legacy one, and the difference between the two rows is the
       whole fix. */
    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
      });
      const page = await ctx.newPage();
      await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
      await seedCoachDone(page);
      await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
      const P = { ctx, page, logs: [], name: 'StatNotice' };
      await H.enterWorld(P);
      await page.waitForTimeout(2500);
      await clearOnboarding(page);
      await foldDash(page);
      await page.waitForTimeout(600);

      /* Put the T1 stat one tick under its own threshold and give it all of
         the usage share, so ONE kill has to cross it.  xpRequired is the
         client's own curve — read from the page rather than retyped, because a
         rig with its own copy of a threshold stops testing the game the first
         time the curve is tuned (the v2.3.2591 note about the pin fraction,
         one file over). */
      const armCrossing = (prog3) => page.evaluate((withProg3) => {
        const S = window._gameState && window._gameState.current;
        const R = S && S.rpg;
        if (!R) return null;
        if (withProg3) {
          if (!R.prog3) R.prog3 = {};
          R.prog3.sk = { sword: { level: 6 }, bow: { level: 6 }, staff: { level: 1 } };
        } else {
          delete R.prog3;
        }
        R.power = 23;
        R._statLocks = null;
        R._buildProg = { power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0 };
        /* All of the usage on power, and melee equipped, so the split sends the
           whole award to one stat and the bow/staff vitality side-train does
           not fire a second crossing in a second stat. */
        R._buildUse = { power: 1, vitality: 0, endurance: 0, agility: 0, mind: 0 };
        R.activeSlot = 'melee';
        /* ═══ AND ZERO THE LEGACY LEVEL GATE ═══
           A T1 crossing also ticks _buildPointsThisLvl, and five of those are a
           legacy CHARACTER level (gameEvents.js, the `!S._serverMonsters`
           branch) which raises its own notification.  Leaving it wherever the
           session had got to would let that fire on top and make the row
           unreadable: the question here is what ONE T1 crossing says, and the
           answer has to not be contaminated by a different system's level. */
        R._buildPointsThisLvl = 0;
        /* Baseline the level from the blob we just wrote, so `before` is the
           state the kill starts from and not the state the FIXTURE changed. */
        if (window.__btRecalc) window.__btRecalc(R);
        return { power: R.power, prog3: !!R.prog3, level: R.level };
      }, prog3);

      /* One kill, carrying enough XP to cross any threshold on the curve.  The
         recipient list has to name US or the handler's award block is skipped
         entirely — an assertion against a kill that awarded nothing is a green
         row proving nothing (TRAPS §66). */
      const myId = await page.evaluate(() => (window._gameState.current || {}).myId);
      const kill = () => page.evaluate((me) => {
        window.__btDispatch({
          type: 'monster_kill',
          /* Just over xpRequired(23) — ceil(500 * 1.1^22) = 4071 — so the stat
             crosses EXACTLY ONCE.  A huge award would cross it twenty times,
             and twenty notifications in one kill is a different question from
             the one the owner asked. */
          payload: { monsterId: 'qa-stat-1', recipients: [me], shares: { [me]: 1 }, xp: 4200, gold: 0 },
        });
      }, myId);

      const readNotice = () => page.evaluate(() => {
        const S = window._gameState && window._gameState.current;
        const banner = document.querySelector('[data-levelup-banner]');
        const burst = document.querySelector('[data-levelup-kind]');
        const t = banner ? banner.textContent : '';
        return {
          power: S && S.rpg ? S.rpg.power : null,
          level: S && S.rpg ? S.rpg.level : null,
          bannerKind: banner ? banner.getAttribute('data-levelup-banner') : null,
          bannerText: t.replace(/\s+/g, ' ').trim(),
          burstKind: burst ? burst.getAttribute('data-levelup-kind') : null,
        };
      });

      for (const [tag, withProg3] of [['prog3', true], ['legacy', false]]) {
        await armCrossing(withProg3);
        const before = await readNotice();
        await kill();
        await page.waitForTimeout(500);
        const after = await readNotice();
        await page.screenshot({ path: `${OUT}/statnotice/${tag}.jpg`, type: 'jpeg', quality: 86 });
        const crossed = after.power === before.power + 1;
        findings.push({ shot: `statnotice-${tag}`, withProg3, crossed,
          levelMoved: after.level !== before.level, ...after });
        console.log(`  statnotice/${tag}.jpg  T1 power ${before.power} -> ${after.power} ` +
          `(${crossed ? 'CROSSED' : 'did not cross — fixture is vacuous'}), ` +
          `character level ${before.level} -> ${after.level}`);
        console.log(`       notification: ${after.bannerKind ? `banner[${after.bannerKind}] ${JSON.stringify(after.bannerText)}`
          : (after.burstKind ? `burst[${after.burstKind}]` : 'NONE')}`);
        await page.waitForTimeout(4200); /* let the banner age out before the next */
      }
      await ctx.close().catch(() => {});
    }

    /* ── pass 2d: THE CELEBRATION THAT FIRES FOR A LEVEL NOBODY GAINED ── */
    /* Owner: "I experienced a 'level up' (legacy notification) — I had
       increased combat level without ANY corresponding increase in one of the 3
       combat skills."
       The SECOND way that happens, and the one where the number on screen
       really is the character level.  celebrateLevelUps fires on
       `R.level > R._lastShownLevel`, and that high-water is seeded once, at
       load, out of localStorage — while the authoritative level arrives from
       the worker seconds later.  Any time the stored copy is behind (new
       device, cleared data, private mode, or a Cloudflare PREVIEW URL, which
       is a different origin and therefore a different localStorage on every
       deploy) the next kill "gains" the whole difference in one go.

       Both halves are asserted, and they fail separately, because a fix that
       only silenced the spurious one would also silence every real level-up
       and nothing here would notice (TRAPS §61's shape: a check that reads the
       same on the working and the broken build).
         (a) fresh context, nothing earned yet  -> no celebration pending
         (b) a real skill level lands afterwards -> celebration pending again */
    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true,
      });
      const page = await ctx.newPage();
      await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
      await seedCoachDone(page);
      await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
      const P = { ctx, page, logs: [], name: 'Baseline' };
      await H.enterWorld(P);
      await page.waitForTimeout(3000);

      const readHW = () => page.evaluate(() => {
        const R = window._gameState.current.rpg;
        const sum = ['sword', 'bow', 'staff'].reduce(
          (a, k) => a + Math.max(1, (R.prog3 && R.prog3.sk && R.prog3.sk[k] && R.prog3.sk[k].level) || 1), 0);
        return {
          level: R.level, lastShown: R._lastShownLevel || 1, skillSum: sum,
          /* the exact test celebrateLevelUps runs */
          wouldFire: (R.level || 1) > (R._lastShownLevel || 1),
        };
      });

      const atJoin = await readHW();
      console.log(`\n  THE HIGH-WATER`);
      console.log(`    fresh context, nothing earned: level=${atJoin.level} (skills sum to ${atJoin.skillSum}) ` +
        `high-water=${atJoin.lastShown}  ->  celebration pending: ${atJoin.wouldFire}`);

      /* Now a REAL level-up: the worker echoes a prog3 blob with Bow one level
         higher, through the real player_state handler.  This is the case the
         guard must NOT swallow — if the baseline re-ran on every echo, the
         player would never be celebrated again. */
      const bumped = await page.evaluate(() => {
        const R = window._gameState.current.rpg;
        const sk = JSON.parse(JSON.stringify((R.prog3 && R.prog3.sk) || {}));
        for (const k of ['sword', 'bow', 'staff']) if (!sk[k]) sk[k] = { level: 1, xp: 0 };
        sk.bow.level = (sk.bow.level || 1) + 1;
        const p3 = Object.assign({}, R.prog3, { sk });
        window.__btWsEvent({ type: 'player_state', payload: { prog3: p3 } });
        return true;
      });
      await page.waitForTimeout(300);
      const afterLevel = await readHW();
      console.log(`    after a real Bow level:        level=${afterLevel.level} (skills sum to ${afterLevel.skillSum}) ` +
        `high-water=${afterLevel.lastShown}  ->  celebration pending: ${afterLevel.wouldFire}`);
      findings.push({ shot: 'highwater', sent: bumped, atJoin, afterLevel });
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
        const W = window.__btLevelUpWarm || null;
        const pUrl = W ? W.portrait() : '';
        return {
          report: (window.__btPreloadReport && window.__btPreloadReport.levelUpBurst) || null,
          spriteReport: window.__btPreloadReport ? Object.keys(window.__btPreloadReport).length : 0,
          audioDecoded: !!(A && A._samples && A._samples['level-up']),
          audioInManifest: !!(A && A.SFX_MANIFEST && A.SFX_MANIFEST['level-up']),
          muted: A ? A.muted : null,
          /* v2.3.2615: the character medallion.  Asked BY VALUE — "is this url
             one of the bitmaps being held" — because a warm count going up
             cannot tell a warmed portrait from a warmed skill icon, and the
             frame where it was not ready looks identical to the frame where it
             was, one repaint later. */
          portraitPresent: !!pUrl,
          portraitWarm: !!(W && pUrl && W.has(pUrl)),
          heldCount: W ? W.count() : 0,
        };
      });
      console.log('\n  PRELOAD');
      console.log(`    preloadWorldAnimations().levelUpBurst = ${warm.report}  (of ${warm.spriteReport} groups)`);
      console.log(`    'level-up' in SFX_MANIFEST = ${warm.audioInManifest}`);
      console.log(`    sting DECODED before any level-up = ${warm.audioDecoded}`);
      console.log(`    character portrait published        = ${warm.portraitPresent}`);
      console.log(`    portrait DECODED before any level-up = ${warm.portraitWarm}  (${warm.heldCount} manifest bitmaps held)`);

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
    /* ═══ v2.3.2659: THE ONE-NOTIFICATION ASSERTIONS ═══
       Owner: "just show the skill level up."  Every row below used to read the
       other way; see the pass header for why it is inverted rather than
       deleted. */
    const pairs = findings.filter((f) => f.shot.startsWith('pair-') && f.n != null);
    const motion = findings.find((f) => f.shot === 'pair-motion') || {};
    console.log(`\n  ONE NOTIFICATION PER LEVEL`);
    console.log(`  ${pairs.filter((f) => f.n === 1).length}/${pairs.length} framings showed EXACTLY ONE notification from one prog3_level`);
    console.log(`  any framing that still showed a character burst: ${pairs.filter((f) => /char/.test(f.kinds || '')).length}`);
    console.log(`  the one shown is the SKILL burst: ${pairs.every((f) => f.kinds === 'combat')}`);
    const films = findings.filter((f) => f.shot.startsWith('film-'));
    console.log(`  filmed, painted frames per framing: ${films.map((f) => f.painted).join(', ')}`);
    /* ═══ THE STAMP IS STILL ASSERTED, AND THAT IS THE POINT ═══
       `shownHW === 14` is not left over from the removed burst.  Dropping the
       character NOTIFICATION while also dropping `_lastCharLvlShown` would
       bring the character notification straight back by another door:
       celebrateLevelUps reads that stamp as its `announced` guard, and without
       it the next kill announces "Character · Level 14" a few seconds later.
       So the stamp outlives the burst it used to accompany, and this row is
       what says so. */
    const pairOk = pairs.length === VIEWS.length
      && pairs.every((f) => f.n === 1 && f.kinds === 'combat' && !f.portrait
        && f.offscreen === 0 && f.belowTray === 0 && f.allDecoded
        && f.shownHW === 14)
      && motion.combat > 1 && motion.char === 0
      /* A sheet built from three repaints is not a film. */
      && films.length === VIEWS.length && films.every((f) => f.painted >= 20);

    /* ═══ v2.3.2615: THE "IMPOSSIBLE" LEVEL, STATED AS TWO ROWS ═══ */
    const sn3 = findings.find((f) => f.shot === 'statnotice-prog3') || {};
    const snL = findings.find((f) => f.shot === 'statnotice-legacy') || {};
    console.log(`\n  THE T1 STAT TICK`);
    const shownAs = (f) => (f.bannerKind ? `banner[${f.bannerKind}] ${JSON.stringify(f.bannerText)}`
      : (f.burstKind ? `burst[${f.burstKind}]` : 'nothing'));
    console.log(`    prog3 character:  one T1 crossing=${sn3.crossed}  character level moved=${sn3.levelMoved}  shown=${shownAs(sn3)}`);
    console.log(`    legacy character: one T1 crossing=${snL.crossed}  character level moved=${snL.levelMoved}  shown=${shownAs(snL)}`);
    /* Both halves fail separately and both matter: a fixture that never crosses
       the threshold proves nothing about the prog3 row, and a legacy row that
       says nothing would be a regression for the characters the tick is real
       for. */
    const statOk = sn3.crossed === true && sn3.levelMoved === false
      && sn3.bannerKind == null && sn3.burstKind == null
      && snL.crossed === true && snL.levelMoved === false && snL.bannerKind === 'power'
      && /SKILL UP!/.test(snL.bannerText) && /Melee Level/.test(snL.bannerText);

    const hw = findings.find((f) => f.shot === 'highwater') || {};
    const hwOk = !!(hw.atJoin && hw.afterLevel
      && hw.atJoin.wouldFire === false          /* nothing earned -> nothing celebrated */
      && hw.atJoin.level === hw.atJoin.skillSum /* and the level really is the sum */
      && hw.afterLevel.level === hw.atJoin.level + 1
      && hw.afterLevel.wouldFire === true);     /* a real level -> still celebrated */

    const pre = findings.find((f) => f.shot === 'preload') || {};
    const ok = pairOk && statOk && hwOk && strip.length === 8 && dx < 1 && dy < 1
      && findings.filter((f) => f.shot.startsWith('360') || f.shot.startsWith('390')).every((f) => f.mounted && f.iconComplete)
      && pre.report === 'fulfilled' && pre.audioDecoded === true
      && pre.portraitPresent === true && pre.portraitWarm === true
      && !!(pre.mute && pre.mute.whileMuted && pre.mute.whileOn);
    console.log(ok ? '\nPASS — icon locked to the circle, every hero shot mounted, ONE notification per prog3_level at every '
                     + 'framing (the skill one; no character burst anywhere) with nothing off-screen, it animates, the '
                     + 'character high-water is still stamped so the suppressed announcement cannot return by another '
                     + 'door, the T1 tick is silent under prog3 and named under legacy, no celebration is pending for a '
                     + 'level nobody earned (and one still is for a real one), assets warm before first use, mute respected'
                   : '\nFAIL — see the rows above');
    console.log(`\nwrote ${OUT}`);
    if (!ok) process.exitCode = 1;
  } finally {
    await done();
  }
}
main();
