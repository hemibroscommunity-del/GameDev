/* ═══ v2.3.3407: EVERY SCREEN, IN EVERY VIEW, LABELLED AND BUNDLED ═══
 *
 * The owner, 2026-10-18: "I'll also want screenshots labelled and bundled for
 * all UI elements in each view (portrait, landscape, desktop, etc) so I can
 * have chatGPT analyze them for improvements."  (v2.3.1642's qa-ui-shots.mjs
 * did one pass of the menus before the Wheel, the dashboard and the doors
 * existed; this is the game as it is today, in its three ways of being held.)
 *
 * One real player per view against a real worker (the mp harness: a private
 * wrangler worker, the built game, Chromium), walked through the screens in
 * states.mjs -- the door, the creator and its tabs, arriving, the HUD, the
 * dashboard's pages, every building's window, the maps, other players' cards,
 * a harvest and a fight.  For each screen, in each view:
 *
 *   <view>/NN-<id>.jpg            the screen as the player sees it
 *   <view>/NN-<id>.labels.jpg     the same, every control numbered in a box
 *                                 (green fine, amber small, red cut off or
 *                                 covered -- audit.mjs)
 *   and in README.md / index.html / manifest.json: the title, what the screen
 *   is for, and the numbered list of its controls with any problem found.
 *   FINDINGS.md lists every problem in one place.
 *   DESIGN-NOTES.md (v2.3.3456) is docs/UI-DESIGN-NOTES.md: why each screen
 *   is the way it is -- the owner's decisions and their reasons, what was
 *   tried and changed, what not to suggest -- and under each screen the
 *   README names its notes (notes.mjs), so a reviewer judges a screen with
 *   its history in hand.
 *
 * Views: portrait (an upright phone, 390 x 844), landscape (the same phone
 * sideways, 844 x 390) -- both TOUCH, so the game shows its phone controls --
 * and desktop (a 1440 x 900 window with a mouse: the game plays in its
 * centred column, with the keyboard keys).  Pictures at 2x.
 *
 * Usage (after `npm run build`; the server's npm install done):
 *   node tools/qa/ui-review/capture.mjs                     everything
 *   node tools/qa/ui-review/capture.mjs --views=desktop     one view
 *   node tools/qa/ui-review/capture.mjs --only=hud,world-map
 *   node tools/qa/ui-review/capture.mjs --out=/some/dir --png --no-zip --no-sheets
 *   node tools/qa/ui-review/capture.mjs --report-only       the words, sheets
 *                                         and zips again, from the pictures
 *   node tools/qa/ui-review/capture.mjs --check-notes       which screens have
 *                                         no design notes (no game, no build)
 *   --no-kit                              no chatgpt/ folder (makeKit)
 * Writes tools/qa/out/ui-review/ (git-ignored) and, unless --no-zip,
 * ui-review-<view>.zip per view, ui-review-all.zip and (v2.3.3456)
 * ui-review-for-chatgpt.zip beside it: chatgpt/, a folder a chat -- each
 * screen's views in one picture and a brief with its design notes
 * (packets.mjs, makeKit).
 * The Actions tab's "UI review screenshots" workflow runs exactly this and
 * hands back the zips (.github/workflows/ui-review.yml).
 */
import * as H from '../mp/harness.mjs';
import { STATES, foldBand } from './states.mjs';
import { auditControls, drawOverlay, clearOverlay } from './audit.mjs';
import { readNotes, topicsFor, generalTopics, notesCoverage, NOTES_PATH } from './notes.mjs';
import { packetsFor, briefFor, startHere, VIEW_NAMES, PACKETS, MAX_PICTURES } from './packets.mjs';
import { mkdirSync, writeFileSync, rmSync, renameSync, existsSync, statSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const ARGS = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));

export const VIEWS = {
  portrait: {
    id: 'portrait', short: 'an upright phone (portrait)', title: 'Phone, upright (portrait)',
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2,
    about: 'An iPhone-sized touch screen held upright (390 x 844 CSS px), the game\'s main platform.',
  },
  landscape: {
    id: 'landscape', short: 'the phone sideways (landscape)', title: 'Phone, sideways (landscape)',
    viewport: { width: 844, height: 390 }, touch: true, dpr: 2,
    about: 'The same phone held sideways (844 x 390 CSS px): the dashboard becomes a side sheet and the controls move to the corners.',
  },
  /* not in the default run (the owner named three): --views=tablet */
  tablet: {
    id: 'tablet', short: 'a tablet (tablet)', title: 'Tablet, upright (iPad-sized touch screen)',
    viewport: { width: 820, height: 1180 }, touch: true, dpr: 2,
    about: 'A tablet-sized touch screen held upright (820 x 1180 CSS px): the phone layout on a bigger screen.',
  },
  desktop: {
    id: 'desktop', short: 'a computer window (desktop)', title: 'Computer (mouse and keyboard)',
    viewport: { width: 1440, height: 900 }, touch: false, dpr: 2, clip: '#root',
    about: 'A computer\'s browser window (1440 x 900) with a mouse: the game plays in a centred phone-shaped column with black bars beside it (the pictures are cropped to that column), the touch controls are hidden and the keyboard does their jobs (WASD, E, Q, Space, X, Shift, F/right-click...).',
  },
  /* v2.3.3407: not in the default run either: --views=laptop.  The commonest
     laptop window, and where the computer's creator hid ENTER BRO TOWN below
     the screen (game.css "THE CREATOR SIZES ITSELF FROM THE COLUMN") */
  laptop: {
    id: 'laptop', short: 'a short laptop window (laptop)', title: 'Laptop (a short computer window)',
    viewport: { width: 1366, height: 768 }, touch: false, dpr: 2, clip: '#root',
    about: 'A laptop\'s browser window (1366 x 768) with a mouse: the computer\'s centred column, shorter -- 768 px tall, so anything laid out for a taller window shows here first.',
  },
};

const OUT = ARGS.out ? String(ARGS.out) : join(H.REPO, 'tools/qa/out/ui-review');
const FORMAT = ARGS.png ? 'png' : 'jpeg';
const EXT = FORMAT === 'png' ? 'png' : 'jpg';
const DEFAULT_VIEWS = ['portrait', 'landscape', 'desktop'];
const WANT_VIEWS = (ARGS.views ? String(ARGS.views).split(',') : DEFAULT_VIEWS).filter((v) => VIEWS[v]);
const ONLY = ARGS.only ? new Set(String(ARGS.only).split(',')) : null;
const log = (...a) => console.log('[ui-review]', ...a);

/* ── close whatever a state left open, so screens never stack ── */
async function closeAll(P) {
  await P.page.evaluate(() => {
    try { if (window.__broDashPanelBus) window.__broDashPanelBus.toBar(); } catch (e) { /* */ }
    try { if (window.__btBuildingWindow) window.__btBuildingWindow.open(null); } catch (e) { /* */ }
    try { if (window.__btWorldMapOpen) window.__btWorldMapOpen(false); } catch (e) { /* */ }
    try { if (window.__broShopBus) window.__broShopBus.setOpen(false); } catch (e) { /* */ }
    try { if (window.__btAceFlipBus) window.__btAceFlipBus.setOpen(false); } catch (e) { /* */ }
    try { if (window.__btDailyRewards) window.__btDailyRewards.close(); } catch (e) { /* */ }
    try { if (window.__broChatBubbleBus) window.__broChatBubbleBus.setOpen(false); } catch (e) { /* */ }
    const U = window._uiPanels || {};
    const OBJ = new Set(['building', 'quest', 'inspect', 'incomingTrade', 'trade2', 'duelRequest', 'threat',
      'collectMsg', 'achievementMsg', 'dungeonCreator', 'tradeTarget']);
    /* real state, not a window -- and the boot's own screens: `welcome` is the
       login door and the creator (v2.3.1642: it aliases the name modal) */
    const SKIP = new Set(['clanData', 'party', 'welcome', 'intro']);
    for (const [k, fn] of Object.entries(U)) {
      if (SKIP.has(k)) continue;
      try { fn(OBJ.has(k) ? null : false); } catch (e) { /* */ }
    }
  }).catch(() => {});
  /* and whatever else listens for it (the item card, the codex's own pages) */
  await P.page.keyboard.press('Escape').catch(() => {});
  await P.page.waitForTimeout(450);
  /* and the band folded, as a new player has it: the bag's page opens it, and
     left open it sat under every screen after (a state that wants it opens it) */
  await foldBand(P).catch(() => {});
}

/* the box a picture is cropped to (the game's column on a computer) -- unless
   something drawn OUTSIDE the column is showing: a window portalled to the page
   body (the NPC dialogue, the quest offer, the world map) is centred on the
   whole window and may run past the column into the black bars, so then the
   picture is the whole window, as the player sees it */
async function clipBox(P, view) {
  if (!view.clip) return null;
  return P.page.evaluate(([sel, overlayId]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const shown = (n) => {
      for (let k = n; k && k.nodeType === 1; k = k.parentElement) {
        const cs = getComputedStyle(k);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
      }
      return true;
    };
    /* ...and draws something there (an invisible catcher is not a picture) */
    const paints = (n) => {
      if (/^(IMG|CANVAS|VIDEO|svg)$/i.test(n.tagName)) return true;
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
      const m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor || '');
      if (m) { const p = m[1].split(',').map(Number); if (p.length < 4 || p[3] > 0.02) return true; }
      return Array.from(n.childNodes).some((c) => c.nodeType === 3 && c.textContent.trim());
    };
    for (const n of document.body.querySelectorAll('*')) {
      if (el.contains(n) || n.closest('#' + overlayId) || /^(SCRIPT|STYLE|LINK|META)$/.test(n.tagName)) continue;
      const b = n.getBoundingClientRect();
      if (b.width < 8 || b.height < 8) continue;
      if (b.left >= r.left - 2 && b.right <= r.right + 2 && b.top >= r.top - 2 && b.bottom <= r.bottom + 2) continue;
      if (shown(n) && paints(n)) return null;
    }
    return { x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)), width: Math.ceil(r.width), height: Math.ceil(r.height) };
  }, [view.clip, 'bt-ui-review-overlay']).catch(() => null);
}

async function shoot(P, file, clip) {
  const opts = { path: file, type: FORMAT };
  if (FORMAT === 'jpeg') opts.quality = 82;
  if (clip) opts.clip = clip;
  await P.page.screenshot(opts);
}

async function captureState(ctx, st, n) {
  const { P, view } = ctx;
  const nn = String(n).padStart(2, '0');
  const base = `${nn}-${st.id}`;
  const row = { id: st.id, n, group: st.group, title: st.title, about: st.about, view: view.id, file: null, labels: null, controls: [], skipped: null };
  let res = null;
  try {
    res = await st.run(ctx);
  } catch (e) {
    res = 'error: ' + String((e && e.message) || e).split('\n')[0].slice(0, 200);
  }
  if (typeof res === 'string') {
    row.skipped = res;
    log(`  SKIP ${view.id}/${base}: ${res}`);
  } else {
    await P.page.waitForTimeout(st.settle != null ? st.settle : 900);
    const clip = await clipBox(P, view);
    const file = join(OUT, view.id, `${base}.${EXT}`);
    try {
      await shoot(P, file, clip);
      row.file = `${view.id}/${base}.${EXT}`;
      const clipRect = clip ? { left: clip.x, top: clip.y, right: clip.x + clip.width, bottom: clip.y + clip.height } : null;
      const audit = await P.page.evaluate(auditControls, { touch: !!view.touch, clip: clipRect, inner: view.clip || null });
      row.controls = audit.controls;
      await P.page.evaluate(drawOverlay, audit.controls);
      const lfile = join(OUT, view.id, `${base}.labels.${EXT}`);
      await shoot(P, lfile, clip);
      row.labels = `${view.id}/${base}.labels.${EXT}`;
      await P.page.evaluate(clearOverlay);
      const bad = audit.controls.filter((c) => c.issues.length).length;
      log(`  ok   ${row.file}  (${audit.controls.length} controls${bad ? ', ' + bad + ' with notes' : ''})`);
    } catch (e) {
      row.skipped = 'picture failed: ' + String((e && e.message) || e).split('\n')[0].slice(0, 160);
      log(`  FAIL ${view.id}/${base}: ${row.skipped}`);
      await P.page.evaluate(clearOverlay).catch(() => {});
    }
  }
  if (res && typeof res === 'object' && typeof res.release === 'function') await res.release().catch(() => {});
  if (typeof st.after === 'function') await st.after(ctx).catch(() => {});
  /* before the world there is nothing to close, and the door's own screens
     are not windows: closing "everything" there shut the creator */
  if (!st.keep && ctx.inWorld) await closeAll(P);
  return row;
}

async function runView(browser, ports, view) {
  log(`== ${view.title} ==`);
  mkdirSync(join(OUT, view.id), { recursive: true });
  const rows = [];
  const P = await H.newPlayer(browser, {
    name: 'Reviewer', wsPort: ports.ws, webPort: ports.web, viewport: view.viewport,
    touch: !!view.touch, dpr: view.dpr, world: 'wheel',
  });
  P.view = view;   /* states.mjs tapAt: a finger on a phone, the mouse on a computer */
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  const ctx = { P, view, wsPort: ports.ws, myId: null, used: [], inWorld: false };
  let n = 0;
  try {
    const pre = STATES.filter((s) => s.pre);
    const post = STATES.filter((s) => !s.pre);
    for (const st of pre) {
      n += 1;
      if (st.views && !st.views.includes(view.id)) continue;
      if (ONLY && !ONLY.has(st.id)) {
        /* the creator is the way into the world: run, not photographed */
        if (st.id === 'creator') await st.run(ctx).catch(() => {});
        continue;
      }
      rows.push(await captureState(ctx, st, n));
    }
    /* into the world, as a new player goes (the harness fills the name and plays) */
    await H.enterWorld(P);
    ctx.inWorld = true;
    ctx.myId = await H.readState(P, (S) => S.myId);
    await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 150000, label: 'into the Wheel' });
    /* what makes the menus look lived-in: the tools, a kit, some gold and goods */
    for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(ports.ws, ctx.myId, 'item', { invKey: k, count: 1 }).catch(() => {});
    for (const [k, c] of [['wood_pine_log', 12], ['ore_copper_ore', 9], ['fish_minnow', 6], ['bar_copper', 4], ['meal_garden_stew', 2]]) {
      await H.grant(ports.ws, ctx.myId, 'item', { invKey: k, count: c }).catch(() => {});
    }
    await H.grant(ports.ws, ctx.myId, 'gold', { amount: 2500 }).catch(() => {});
    await H.devOp(ports.ws, 'kit', ctx.myId, { what: 'armor' }).catch(() => {});
    await H.devOp(ports.ws, 'vitals', ctx.myId, { heal: true, god: true, godMinutes: 60 }).catch(() => {});
    for (const st of post) {
      n += 1;
      if (ONLY && !ONLY.has(st.id)) {
        /* v2.3.3456: the welcome is the way past the tutorial and the
           arrival's banners, as the creator is the way in: run, not
           photographed -- a retake's first screens wore the welcome plate */
        if (st.id === 'welcome') {
          await st.run(ctx).catch(() => {});
          if (typeof st.after === 'function') await st.after(ctx).catch(() => {});
        }
        continue;
      }
      if (st.views && !st.views.includes(view.id)) continue;
      rows.push(await captureState(ctx, st, n));
    }
    /* one picture of the whole window on a computer: the column and its bars */
    if (view.id === 'desktop' && (!ONLY || ONLY.has('desktop-window'))) {
      await closeAll(P);
      const f = join(OUT, view.id, `00-desktop-window.${EXT}`);
      await shoot(P, f, null).catch(() => {});
      rows.unshift({ id: 'desktop-window', n: 0, group: 'The world (HUD)', title: 'The whole window', view: view.id,
        about: 'The whole browser window on a computer: the game in its centred column, black bars either side.',
        file: `${view.id}/00-desktop-window.${EXT}`, labels: null, controls: [], skipped: null });
    }
  } catch (e) {
    log(`  view ${view.id} stopped: ${String((e && e.stack) || e).slice(0, 400)}`);
    rows.push({ id: 'view-error', n: 999, group: 'Errors', title: 'The run stopped here', about: String((e && e.message) || e).slice(0, 300), view: view.id, skipped: 'run stopped' });
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
  return { rows, errors };
}

/* ── the bundle's words ── */
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function controlLine(c) {
  const notes = c.issues.length ? ' -- ' + c.issues.map((i) => i.text).join('; ') : '';
  return `${c.n}. ${c.name} (${c.w}x${c.h})${notes}`;
}

/* v2.3.3456: a screen's design notes, as README/index.html name them */
const noteLinks = (ts) => ts.map((t) => `[${t.title}](DESIGN-NOTES.md#${t.slug})`).join(', ');

/* the views in words, for the prompt: "an upright phone (portrait), ... and a
   computer window (desktop)" */
function viewsInWords(views) {
  const w = views.map((v) => VIEWS[v].short || v);
  return w.length > 1 ? w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1] : w.join('');
}

function writeReport(results, meta) {
  const views = Object.keys(results);
  /* v2.3.3456: the notes, copied in whole, and each screen's topics */
  const notes = readNotes(H.REPO);
  const hasNotes = !!notes.text;
  if (hasNotes) writeFileSync(join(OUT, 'DESIGN-NOTES.md'), notes.text);
  else rmSync(join(OUT, 'DESIGN-NOTES.md'), { force: true });
  const general = generalTopics(notes.topics);
  const notesOf = (r) => (r.id === 'view-error' ? [] : topicsFor(notes.topics, r.id === 'desktop-window' ? 'hud' : r.id));
  const manifest = { made: meta.made, game: meta.game, views: views.map((v) => ({ id: v, title: VIEWS[v].title, about: VIEWS[v].about })), shots: [] };
  if (hasNotes) manifest.designNotes = { file: 'DESIGN-NOTES.md', everyScreen: general.map((t) => t.title) };
  for (const v of views) for (const r of results[v].rows) manifest.shots.push(hasNotes ? { ...r, notes: notesOf(r).map((t) => t.title) } : r);
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  /* FINDINGS.md: every control with a problem, by view and screen */
  const F = [];
  F.push('# BroTown UI review: problems found automatically', '');
  F.push(`Made ${meta.made} from game version ${meta.game}.`, '');
  F.push('Each line is a control (button, tab, link, field) on one screen, with what the audit found:', '');
  F.push('- **cut off**: part of it lies past the edge of the screen (or the game\'s column on a computer)');
  F.push('- **covered**: the middle of it is under something else, so a tap or click there reaches that instead');
  F.push('- **small**: under 32 CSS px on a touch screen (44 px is Apple\'s guideline; "under the 44 px touch guide" is noted separately)');
  F.push('- **words cut off**: its label runs past its own edge');
  F.push('- **drawn over**: another control is drawn on top of it -- it lets the press through, but it hides part of this one', '');
  if (hasNotes) F.push('Some of these are known and on purpose: DESIGN-NOTES.md says why each screen is the way it is.', '');
  for (const v of views) {
    F.push(`## ${VIEWS[v].title}`, '');
    let any = false;
    for (const r of results[v].rows) {
      const bad = (r.controls || []).filter((c) => c.issues.some((i) => i.kind !== 'tight'));
      if (!bad.length) continue;
      any = true;
      F.push(`### ${r.title} (\`${r.file}\`)`, '');
      for (const c of bad) F.push('- ' + controlLine({ ...c, issues: c.issues.filter((i) => i.kind !== 'tight') }));
      F.push('');
    }
    const skipped = results[v].rows.filter((r) => r.skipped);
    if (skipped.length) {
      F.push('Screens not captured in this view:', '');
      for (const r of skipped) F.push(`- ${r.title}: ${r.skipped}`);
      F.push('');
    }
    if (!any) F.push('No problems found.', '');
  }
  writeFileSync(join(OUT, 'FINDINGS.md'), F.join('\n'));

  /* README.md: how to read it, and a prompt for ChatGPT */
  const R = [];
  R.push('# BroTown: every screen, for a UI review', '');
  R.push(`Captured ${meta.made} from game version ${meta.game}, by \`tools/qa/ui-review/capture.mjs\`.`, '');
  /* v2.3.3456: as many views as the run took (a laptop's made it four) */
  const inWords = ['no', 'one', 'two', 'three', 'four', 'five'][views.length] || String(views.length);
  R.push(`BroTown is a multiplayer action RPG played in the browser, mainly on iPhones. These are pictures of its screens in ${inWords} view${views.length === 1 ? '' : 's'}:`, '');
  for (const v of views) R.push(`- **${VIEWS[v].title}** (\`${v}/\`): ${VIEWS[v].about}`);
  R.push('', 'Every screen comes twice:', '');
  R.push(`- \`NN-name.${EXT}\`: the screen as the player sees it`);
  R.push(`- \`NN-name.labels.${EXT}\`: the same screen with every control (button, tab, link, field) boxed and numbered -- green = fine, amber = small or drawn over by something, red = cut off or covered; a dashed box is a control partly scrolled out of its list (only the part that shows is boxed). The numbers match the list under each screen below.`, '');
  R.push('Things the game draws itself (the world, the minimap, name plates, health bars, damage numbers) are in the pictures but not in the numbered lists.', '');
  R.push('`FINDINGS.md` lists every problem the automatic check found; `manifest.json` has all of this as data.', '');
  if (hasNotes) {
    R.push('## Why each screen is the way it is: DESIGN-NOTES.md', '');
    R.push('The game\'s owner has changed these screens many times, for reasons the pictures cannot show. `DESIGN-NOTES.md` has them, a section for each part of the game: what it is for, what was decided and why, what was tried before and changed, and what has already been turned down. Under each screen below, "Design notes" names its sections.', '');
    if (general.length) R.push(`Every screen also follows: ${noteLinks(general)}.`, '');
  }
  if (meta.sheets && meta.sheets.length) {
    R.push('`sheets/` has the same screens several to a picture, by section, each titled "NN. Title" (NN is the number in the screen\'s file name) -- handy for giving ChatGPT a whole section in one upload:', '');
    for (const f of meta.sheets) R.push(`- \`${f}\``);
    R.push('');
  }
  if (meta.kit && meta.kit.length) {
    R.push('## For ChatGPT: `chatgpt/` (start with its START-HERE.md)', '');
    R.push(`The quickest way to have ChatGPT review every screen with its reasons: ${meta.kit.length} folders, one chat each. `
      + 'Each holds brief.md (what its screens are for, what the check found on them, their design notes in full, the task and the shape of the answer) '
      + 'and one picture a screen with its views side by side. `ui-review-for-chatgpt.zip` is that folder alone.', '');
  }
  R.push('## A prompt to paste into ChatGPT with the pictures', '');
  R.push('```');
  R.push(`These are screenshots of my mobile-first browser game BroTown (a multiplayer action RPG), on ${viewsInWords(views)}. `
    + 'Each screen has a plain picture and a ".labels" picture where every control is numbered (green = fine, amber = small or drawn over, red = cut off or covered), '
    + 'or comes on a contact sheet with other screens, titled with its number. README.md says what each screen is for and lists its controls. '
    + (hasNotes ? 'DESIGN-NOTES.md says why each screen is the way it is: what I decided and why, what I tried before and changed, and what not to suggest; '
      + 'each screen in README.md names its notes. Read a screen\'s notes before judging it and don\'t suggest what they already rule out; '
      + 'if you still think one of my decisions is wrong, name the note and say why. ' : '')
    + 'For each screen, tell me: (1) anything hard to read, find or tap, '
    + '(2) controls that are too small, crowded, cut off or overlapping, (3) layout and visual hierarchy improvements, (4) anything inconsistent '
    + 'between the views. Be specific: name the screen file and the control number, and suggest the fix.');
  R.push('```', '');
  for (const v of views) {
    R.push(`## ${VIEWS[v].title}`, '');
    let group = null;
    for (const r of results[v].rows) {
      if (r.group !== group) { group = r.group; R.push(`### ${group}`, ''); }
      R.push(`#### ${r.title}${r.file ? ` -- \`${r.file}\`` : ''}`, '');
      if (r.about) R.push(r.about, '');
      if (hasNotes && notesOf(r).length) R.push(`Design notes: ${noteLinks(notesOf(r))}`, '');
      if (r.skipped) { R.push(`_Not captured in this view: ${r.skipped}_`, ''); continue; }
      if (r.controls && r.controls.length) {
        R.push('Controls (numbers as in the .labels picture):', '');
        for (const c of r.controls) R.push('- ' + controlLine(c));
        R.push('');
      } else if (r.labels) {
        R.push('No pressable page controls on this screen (everything here is drawn in the game world).', '');
      }
    }
  }
  /* v2.3.3456: a screen added to states.mjs with no notes is said, here and
     in the run's log (`--check-notes` lists them without a run) */
  const bare = hasNotes ? notesCoverage(notes.topics, [...new Set(manifest.shots.map((r) => r.id))]
    .filter((id) => id !== 'view-error' && id !== 'desktop-window')).bare : [];
  if (bare.length) {
    R.push('## Screens with no design notes yet', '');
    R.push('These have nothing written about them in DESIGN-NOTES.md, so judge them on the pictures alone:', '');
    for (const id of bare) R.push(`- \`${id}\``);
    R.push('');
    log(`no design notes for: ${bare.join(', ')} (${NOTES_PATH})`);
  }
  if (!hasNotes) log(`${NOTES_PATH} is missing: the bundle goes without design notes`);
  writeFileSync(join(OUT, 'README.md'), R.join('\n'));

  /* index.html: a contact sheet to look through */
  const W = [];
  W.push('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">');
  W.push('<title>BroTown UI review</title>');
  W.push('<style>body{margin:0;padding:16px;background:#10161a;color:#e8e2d4;font:15px/1.45 system-ui,sans-serif}'
    + 'h1{font-size:22px}h2{margin-top:32px;border-bottom:1px solid #3a4a52;padding-bottom:6px}h3{color:#d8a85f;margin:24px 0 8px}'
    + '.shot{display:inline-block;vertical-align:top;margin:0 14px 18px 0;max-width:420px}.shot img{max-width:100%;max-height:520px;border:1px solid #3a4a52;border-radius:6px;background:#000}'
    + '.shot .t{font-weight:700;margin:4px 0}.shot .a{color:#b7b0a2;font-size:13px}.shot ol{font-size:12px;color:#cfc8b8;padding-left:20px;max-height:180px;overflow:auto}'
    + '.bad{color:#ff7a70}.warn{color:#ffc35c}.skip{color:#9aa;font-style:italic}a{color:#8fc1ff}.shot .n{font-size:12px;color:#b7b0a2;margin:4px 0}</style>');
  W.push(`<h1>BroTown UI review</h1><p>Captured ${esc(meta.made)}, game version ${esc(meta.game)}. Click a picture for its numbered version. <a href="README.md">README</a> · <a href="FINDINGS.md">FINDINGS</a>`
    + (hasNotes ? ' · <a href="DESIGN-NOTES.md">DESIGN NOTES</a> (why each screen is the way it is)' : '') + '</p>');
  if (meta.sheets && meta.sheets.length) W.push('<p>Contact sheets: ' + meta.sheets.map((f) => `<a href="${esc(f)}">${esc(f.replace('sheets/', ''))}</a>`).join(' · ') + '</p>');
  for (const v of views) {
    W.push(`<h2>${esc(VIEWS[v].title)}</h2><p>${esc(VIEWS[v].about)}</p>`);
    let group = null;
    for (const r of results[v].rows) {
      if (r.group !== group) { group = r.group; W.push(`<h3>${esc(group)}</h3>`); }
      W.push('<div class="shot">');
      W.push(`<div class="t">${esc(r.title)}</div>`);
      if (r.file) W.push(`<a href="${esc(r.labels || r.file)}"><img loading="lazy" src="${esc(r.file)}" alt="${esc(r.title)}"></a>`);
      W.push(`<div class="a">${esc(r.about || '')}</div>`);
      if (hasNotes && notesOf(r).length) {
        W.push('<div class="n">Design notes: ' + notesOf(r).map((t) => `<a href="DESIGN-NOTES.md#${esc(t.slug)}">${esc(t.title)}</a>`).join(', ') + '</div>');
      }
      if (r.skipped) W.push(`<div class="skip">Not captured: ${esc(r.skipped)}</div>`);
      if (r.controls && r.controls.length) {
        W.push('<ol>');
        for (const c of r.controls) {
          const cls = c.issues.some((i) => i.kind === 'cut-off' || i.kind === 'covered') ? 'bad' : c.issues.some((i) => i.kind === 'small' || i.kind === 'clipped' || i.kind === 'overlap') ? 'warn' : '';
          W.push(`<li value="${c.n}" class="${cls}">${esc(c.name)} <small>(${c.w}x${c.h})</small>${c.issues.length ? ' -- ' + esc(c.issues.map((i) => i.text).join('; ')) : ''}</li>`);
        }
        W.push('</ol>');
      }
      W.push('</div>');
    }
  }
  writeFileSync(join(OUT, 'index.html'), W.join('\n'));
}

/* ═══ CONTACT SHEETS: A SECTION OF SCREENS ON ONE PICTURE ═══
   A chat with ChatGPT takes a handful of pictures at a time, so each view's
   screens are also laid out several to a sheet, by section, each under its
   title (sheets/<view>-NN-<section>.jpg, at most 2000 px a side).  Drawn by
   the browser the capture already has open: a page of the pictures, read off
   the disk, photographed. */
async function makeSheets(browser, results) {
  const made = [];
  const dir = join(OUT, 'sheets');
  /* v2.3.3456: every view's sheets are made again, so last run's go first --
     a section a screen shorter left its old last sheet in the zips */
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const per = { portrait: 8, landscape: 6, desktop: 8, laptop: 8, tablet: 8 };
  const cols = { portrait: 4, landscape: 2, desktop: 4, laptop: 4, tablet: 4 };
  const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  try {
    for (const v of Object.keys(results)) {
      const rows = results[v].rows.filter((r) => r.file && r.id !== 'desktop-window');
      const groups = [];
      for (const r of rows) {
        const g = groups.find((x) => x.name === r.group);
        if (g) g.rows.push(r); else groups.push({ name: r.group, rows: [r] });
      }
      let k = 0;
      for (const g of groups) {
        for (let i = 0; i < g.rows.length; i += per[v] || 6) {
          const part = g.rows.slice(i, i + (per[v] || 6));
          k += 1;
          const name = `${v}-${String(k).padStart(2, '0')}-${slug(g.name)}`;
          const html = '<!doctype html><meta charset="utf-8"><style>'
            + 'body{margin:0;padding:18px;background:#10161a;color:#efe8d8;font:16px/1.3 Arial,sans-serif;width:1564px}'
            + 'h1{font-size:22px;margin:0 0 12px}h1 small{color:#9aa4a8;font-weight:400}'
            + '.g{display:grid;grid-template-columns:repeat(' + (cols[v] || 3) + ',1fr);gap:14px}'
            + '.t{background:#1b252b;border:1px solid #33444c;border-radius:8px;padding:8px}'
            + '.t b{display:block;font-size:15px;margin-bottom:6px;color:#f1c770}'
            + '.t img{width:100%;display:block;border-radius:4px}</style>'
            + `<h1>BroTown -- ${esc(VIEWS[v].title)} -- ${esc(g.name)} <small>(${esc(name)})</small></h1><div class="g">`
            + part.map((r) => `<div class="t"><b>${esc(String(r.n).padStart(2, '0') + '. ' + r.title)}</b><img src="../${esc(r.file)}"></div>`).join('')
            + '</div>';
          const tmp = join(dir, '_sheet.html');
          writeFileSync(tmp, html);
          await page.goto('file://' + tmp);
          await page.evaluate(() => Promise.all(Array.from(document.images).map((im) => (im.complete ? 1 : new Promise((res) => { im.onload = im.onerror = res; })))));
          const f = join(dir, name + '.jpg');
          await page.screenshot({ path: f, type: 'jpeg', quality: 80, fullPage: true });
          made.push(`sheets/${name}.jpg`);
        }
      }
    }
  } finally {
    try { rmSync(join(dir, '_sheet.html'), { force: true }); } catch (e) { /* */ }
    await page.close().catch(() => {});
  }
  return made;
}

/* ═══ v2.3.3456: THE CHATGPT KIT, A PACKET A CHAT (packets.mjs) ═══
   chatgpt/START-HERE.md and a folder a packet: brief.md (the screens' words,
   the check's findings per view, the design notes in full, the task) and
   one picture a screen with every view side by side, at full size -- a
   contact sheet's tiles are too small to read once ChatGPT scales a picture
   down, and a picture inside a zip is not one it sees.  Drawn by the browser
   the run has open, from the pictures already taken, so --report-only makes
   it for any bundle. */
const KIT_W = 1840;            /* three tall views at KIT_TALL_H side by side */
const KIT_TALL_H = 1100;
const KIT_ORDER = ['portrait', 'desktop', 'laptop', 'tablet', 'landscape'];
async function makeKit(browser, results, meta) {
  const notes = readNotes(H.REPO);
  if (!notes.text) { log(`${NOTES_PATH} is missing: no ChatGPT kit`); return null; }
  const dir = join(OUT, 'chatgpt');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const views = Object.keys(results);
  const general = generalTopics(notes.topics).map((t) => t.title);
  const rowsById = {};
  const order = [];
  for (const v of views) {
    for (const r of results[v].rows) {
      if (r.id === 'view-error') continue;
      if (!rowsById[r.id]) { rowsById[r.id] = {}; order.push({ id: r.id, n: r.n }); }
      rowsById[r.id][v] = { ...r, notes: topicsFor(notes.topics, r.id === 'desktop-window' ? 'hud' : r.id, { general: true }).map((t) => t.title) };
    }
  }
  const packets = packetsFor(order.sort((a, b) => a.n - b.n).map((o) => o.id));
  const viewAbout = Object.fromEntries(views.map((v) => [v, VIEWS[v].about]));
  const page = await browser.newPage({ viewport: { width: KIT_W, height: 1000 }, deviceScaleFactor: 1 });
  /* the pictures served from one made-up site, so the page may read their
     pixels (a file:// picture taints a canvas) */
  await page.route('http://kit.local/**', (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
    const f = join(OUT, rel);
    if (!f.startsWith(OUT) || !existsSync(f)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, body: readFileSync(f), contentType: f.endsWith('.html') ? 'text/html; charset=utf-8' : 'image/jpeg' });
  });
  try {
    for (const p of packets) {
      const pdir = join(dir, p.dir);
      mkdirSync(pdir, { recursive: true });
      const pics = {};
      for (const id of p.screens) {
        const rows = rowsById[id];
        const panels = KIT_ORDER.filter((v) => rows[v] && rows[v].file && existsSync(join(OUT, rows[v].file)));
        if (!panels.length) continue;
        const r0 = rows[panels[0]];
        const name = `${String(r0.n).padStart(2, '0')}-${id}.jpg`;
        const missing = views.filter((v) => !panels.includes(v)).map((v) => VIEW_NAMES[v] || v);
        const html = '<!doctype html><meta charset="utf-8"><style>'
          + `body{margin:0;padding:18px;background:#10161a;color:#efe8d8;font:18px/1.3 Arial,sans-serif;width:${KIT_W - 36}px}`
          + 'h1{font-size:26px;margin:0 0 14px}h1 small{color:#9aa4a8;font-weight:400;font-size:19px}'
          + '.row{display:flex;gap:16px;justify-content:center;align-items:flex-start;margin-bottom:16px}'
          + '.p{background:#1b252b;border:1px solid #33444c;border-radius:8px;padding:8px}'
          + '.p b{display:block;font-size:18px;margin-bottom:6px;color:#f1c770}.p img{display:block;border-radius:4px}'
          + '.miss{color:#9aa4a8;font-size:16px}</style>'
          + `<h1>${esc(String(r0.n).padStart(2, '0') + '. ' + r0.title)} <small>(${esc(id)}) -- BroTown, ${esc(meta.game)}</small></h1>`
          + '<div id="rows"></div>'
          + panels.map((v) => `<div class="p" data-v="${v}" data-trim="${(v === 'desktop' || v === 'laptop') && id !== 'desktop-window' ? 1 : 0}">`
            + `<b>${esc(VIEW_NAMES[v] || v)}</b><img src="/${esc(rows[v].file)}"></div>`).join('')
          + (missing.length ? `<div class="miss">Not in this picture: ${esc(missing.join(', '))} (${esc(missing.map((m) => {
            const v = views.find((x) => (VIEW_NAMES[x] || x) === m);
            const sk = v && rows[v] && rows[v].skipped;
            return sk ? 'not taken: ' + sk : 'not on this view';
          }).join('; '))})</div>` : '')
          /* tall views side by side at one height, each wide one (sideways,
             the world map's whole window) on its own row, never enlarged */
          + `<script>(${((W, H) => {
            const go = () => {
              const rowsEl = document.getElementById('rows');
              const ps = Array.from(document.querySelectorAll('.p'));
              for (const p of ps) {
                const i = p.querySelector('img');
                p._w = i.naturalWidth; p._h = i.naturalHeight; p._el = i;
                /* a computer's whole-window shot (a window drawn past the
                   column) with its black bars cut away, measured off the
                   picture: a dialogue a little wider than the column then
                   stands with the other tall views, at a size to read */
                if (p.dataset.trim !== '1' || i.naturalWidth <= i.naturalHeight) continue;
                const s = 4, cw = Math.ceil(i.naturalWidth / s), ch = Math.ceil(i.naturalHeight / s);
                const c = document.createElement('canvas'); c.width = cw; c.height = ch;
                const g = c.getContext('2d'); g.drawImage(i, 0, 0, cw, ch);
                const d = g.getImageData(0, 0, cw, ch).data;
                const lit = (x) => {
                  for (let y = 0; y < ch; y += 2) { const o = (y * cw + x) * 4; if (0.3 * d[o] + 0.59 * d[o + 1] + 0.11 * d[o + 2] > 40) return true; }
                  return false;
                };
                let l = 0; while (l < cw && !lit(l)) l++;
                let r = cw - 1; while (r > l && !lit(r)) r--;
                const L = Math.max(0, l * s - 24), R = Math.min(i.naturalWidth, (r + 1) * s + 24);
                if (R - L >= i.naturalWidth - 8) continue;
                const out = document.createElement('canvas'); out.width = R - L; out.height = i.naturalHeight;
                out.getContext('2d').drawImage(i, L, 0, R - L, i.naturalHeight, 0, 0, R - L, i.naturalHeight);
                out.style.display = 'block'; out.style.borderRadius = '4px';
                i.replaceWith(out); p._w = R - L; p._el = out;
              }
              const tall = ps.filter((p) => p._h > p._w);
              const wide = ps.filter((p) => !tall.includes(p));
              const sum = tall.reduce((t, p) => t + p._w * H / p._h + 18, 0) + Math.max(0, tall.length - 1) * 16;
              const k = Math.min(1, W / Math.max(1, sum));
              if (tall.length) {
                const row = document.createElement('div'); row.className = 'row'; rowsEl.appendChild(row);
                for (const p of tall) { p._el.style.height = Math.round(H * k) + 'px'; row.appendChild(p); }
              }
              for (const p of wide) {
                p._el.style.width = Math.round(Math.min(p._w, W - 18)) + 'px';
                const row = document.createElement('div'); row.className = 'row'; rowsEl.appendChild(row); row.appendChild(p);
              }
              document.body.dataset.ready = '1';
            };
            if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
          }).toString()})(${KIT_W - 36}, ${KIT_TALL_H});</script>`;
        const tmp = join(dir, '_pic.html');
        writeFileSync(tmp, html);
        await page.goto('http://kit.local/chatgpt/_pic.html');
        await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 30000 });
        await page.screenshot({ path: join(pdir, name), type: 'jpeg', quality: 80, fullPage: true });
        pics[id] = name;
      }
      writeFileSync(join(pdir, 'brief.md'), briefFor(p, { rowsById, views, notes, general, meta: { ...meta, viewAbout }, pics }));
    }
    writeFileSync(join(dir, 'START-HERE.md'), startHere(packets, meta));
  } finally {
    try { rmSync(join(dir, '_pic.html'), { force: true }); } catch (e) { /* */ }
    await page.close().catch(() => {});
  }
  log(`ChatGPT kit: ${packets.length} packets, ${packets.reduce((k, p) => k + p.screens.length, 0)} screens -- ${dir}`);
  return packets;
}

/* v2.3.3407: the version the pictures are of, and its commit.  package.json's
   version follows the client's only loosely (CLAUDE.md) -- it read 2.3.2324
   on a v2.3.3407 game -- so the newest v2.3.N in the recent commit subjects
   (the session brief's high-water) wins, package.json only without git. */
function gameVersion() {
  let game = '?';
  try { game = JSON.parse(readFileSync(join(H.REPO, 'package.json'), 'utf8')).version; } catch (e) { /* */ }
  try {
    let hi = 0;
    const subjects = execFileSync('git', ['log', '-60', '--format=%s'], { cwd: H.REPO }).toString();
    for (const m of subjects.matchAll(/\bv2\.3\.(\d+)\b/g)) hi = Math.max(hi, +m[1]);
    if (hi) game = '2.3.' + hi;
    game += ' (' + execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: H.REPO }).toString().trim() + ')';
  } catch (e) { /* not a checkout */ }
  return game;
}

/* ═══ v2.3.3456: THE BUNDLE FOLLOWS states.mjs AS IT IS NOW ═══
   A picture's number is its screen's place in states.mjs (pre screens first,
   as runView counts), so after a screen is added or taken away there, an
   --only retake or a --report-only remake would leave twins and gaps: the
   kept pictures are renamed to their new number, and a screen states.mjs no
   longer visits (daily-season, gone with the season) leaves the report, its
   pictures the bundle.  `retaken`: rows of a --only run's screens from the
   run before, whose pictures go unless the new ones have their names. */
function tidyShots(byView, retaken = []) {
  const order = [...STATES.filter((st) => st.pre), ...STATES.filter((st) => !st.pre)];
  const nOf = new Map(order.map((st, i) => [st.id, i + 1]));
  /* and the words are states.mjs's as it is now, so a title or a description
     can be mended without taking the pictures again */
  const byId = new Map(STATES.map((st) => [st.id, st]));
  for (const v of Object.keys(byView)) {
    for (const r of byView[v].rows) {
      const st = byId.get(r.id);
      if (st) { r.title = st.title; r.about = st.about; r.group = st.group; }
    }
  }
  const gone = [];
  for (const v of Object.keys(byView)) {
    const rows = [];
    for (const r of byView[v].rows) {
      if (r.id === 'desktop-window' || r.id === 'view-error') { rows.push(r); continue; }
      const n = nOf.get(r.id);
      if (!n) { gone.push(r); continue; }
      if (n !== r.n) {
        const nn = String(n).padStart(2, '0');
        for (const k of ['file', 'labels']) {
          if (!r[k]) continue;
          const to = r[k].replace(/\/\d+-/, `/${nn}-`);
          if (existsSync(join(OUT, r[k]))) renameSync(join(OUT, r[k]), join(OUT, to));
          r[k] = to;
        }
        r.n = n;
      }
      rows.push(r);
    }
    byView[v].rows = rows.sort((a, b) => a.n - b.n);
  }
  const kept = new Set();
  for (const v of Object.keys(byView)) for (const r of byView[v].rows) for (const f of [r.file, r.labels]) if (f) kept.add(f);
  for (const r of [...gone, ...retaken]) {
    for (const f of [r.file, r.labels]) if (f && !kept.has(f)) rmSync(join(OUT, f), { force: true });
  }
  if (gone.length) log(`left out the pictures of screens no longer in states.mjs: ${[...new Set(gone.map((r) => r.id))].join(', ')}`);
}

function zipBundles(views) {
  const made = [];
  const zip = (name, items) => {
    const f = join(OUT, '..', name);
    try { rmSync(f, { force: true }); } catch (e) { /* */ }
    execFileSync('zip', ['-q', '-r', f, ...items], { cwd: OUT });
    made.push({ file: f, mb: +(statSync(f).size / 1048576).toFixed(1) });
  };
  const words = ['README.md', 'FINDINGS.md', ...(existsSync(join(OUT, 'DESIGN-NOTES.md')) ? ['DESIGN-NOTES.md'] : [])];
  const common = [...words, 'index.html', 'manifest.json'];
  const sheetsOf = (v) => (existsSync(join(OUT, 'sheets'))
    ? readdirSync(join(OUT, 'sheets')).filter((f) => f.startsWith(v + '-')).map((f) => 'sheets/' + f) : []);
  for (const v of views) zip(`ui-review-${v}.zip`, [...common, v, ...sheetsOf(v)]);
  zip('ui-review-all.zip', [...common, ...views, ...(existsSync(join(OUT, 'sheets')) ? ['sheets'] : [])]);
  /* v2.3.3456: what ChatGPT is given -- the kit (makeKit: START-HERE.md and
     a folder a chat), else the words and the contact sheets alone */
  const sheets = views.flatMap(sheetsOf);
  if (existsSync(join(OUT, 'chatgpt', 'START-HERE.md'))) zip('ui-review-for-chatgpt.zip', ['chatgpt']);
  else if (sheets.length) zip('ui-review-for-chatgpt.zip', [...words, ...sheets]);
  return made;
}

/* ── main ── */
if (process.argv[1] && basename(process.argv[1]) === 'capture.mjs') {
  /* v2.3.3456: --check-notes: every screen states.mjs visits named by a
     topic of the design notes, and every topic's screens still there --
     no build, no game, no worker */
  if (ARGS['check-notes']) {
    const notes = readNotes(H.REPO);
    if (!notes.text) { console.error(`${NOTES_PATH} is missing`); process.exit(1); }
    const { bare, stale } = notesCoverage(notes.topics, STATES.map((st) => st.id));
    log(`${notes.topics.length} topics in ${NOTES_PATH}, ${STATES.length} screens`);
    for (const id of bare) log(`  no notes: ${id}`);
    for (const p of stale) log(`  names no screen: ${p}`);
    if (!bare.length && !stale.length) log('  every screen has notes, every topic names a screen');
    /* and the ChatGPT kit's packets (packets.mjs): every screen in one, no
       packet naming a screen that is gone, none over MAX_PICTURES */
    const ids = new Set([...STATES.map((st) => st.id), 'desktop-window']);
    const packed = new Set(PACKETS.flatMap((p) => p.screens));
    const unpacked = [...ids].filter((id) => !packed.has(id));
    const gonePk = [...packed].filter((id) => !ids.has(id));
    const big = PACKETS.filter((p) => p.screens.length > MAX_PICTURES).map((p) => p.slug);
    for (const id of unpacked) log(`  in no ChatGPT packet: ${id} (packets.mjs PACKETS)`);
    for (const id of gonePk) log(`  a packet names a screen that is gone: ${id}`);
    for (const sl of big) log(`  packet over ${MAX_PICTURES} pictures: ${sl}`);
    if (!unpacked.length && !gonePk.length && !big.length) log(`  every screen in one of ${PACKETS.length} ChatGPT packets`);
    process.exit(bare.length || stale.length || unpacked.length || gonePk.length || big.length ? 1 : 0);
  }
  if (!existsSync(join(H.REPO, 'dist', 'index.html'))) {
    console.error('dist/index.html is missing -- run `npm run build` first');
    process.exit(2);
  }
  /* --report-only: the pictures already taken (manifest.json), the words,
     the contact sheets and the zips made again -- no game, no worker */
  if (ARGS['report-only']) {
    const man = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
    const results = {};
    for (const sh of man.shots) (results[sh.view] = results[sh.view] || { rows: [], errors: [] }).rows.push(sh);
    /* the words, the numbers and the screens as states.mjs has them now */
    tidyShots(results);
    /* the same commit is the same version: a manifest of this checkout's
       commit is named by gameVersion() as it reads now */
    const now = gameVersion();
    const sameCommit = / \(([0-9a-f]+)\)$/.exec(man.game || '');
    const meta = { made: man.made, game: sameCommit && now.endsWith(' (' + sameCommit[1] + ')') ? now : man.game, sheets: [] };
    const browser = await H.launch();
    try {
      if (!ARGS['no-sheets']) meta.sheets = await makeSheets(browser, results);
      if (!ARGS['no-kit']) meta.kit = await makeKit(browser, results, meta);
    } finally { await browser.close().catch(() => {}); }
    writeReport(results, meta);
    const zips = ARGS['no-zip'] ? [] : zipBundles(Object.keys(results));
    log(`report remade from ${man.shots.length} screens -- ${OUT}`);
    for (const z of zips) log(`  ${z.file} (${z.mb} MB)`);
    process.exit(0);
  }
  if (!ONLY) { try { rmSync(OUT, { recursive: true, force: true }); } catch (e) { /* */ } }
  mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const ws = await H.freePort(), web = await H.freePort();
  log('starting the worker and the game...');
  const worker = await H.startWorker(ws);
  const srv = await H.serveDist(web);
  const browser = await H.launch();
  const cleanup = () => { try { H.stopWorker(worker); } catch (e) { /* */ } };
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  const results = {};
  const meta = { made: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC', game: gameVersion(), sheets: [] };
  try {
    for (const v of WANT_VIEWS) results[v] = await runView(browser, { ws, web }, VIEWS[v]);
    /* --only: the screens taken now replace the same screens of the last
       run (manifest.json), everything else of it kept */
    if (ONLY && existsSync(join(OUT, 'manifest.json'))) {
      const prior = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
      const merged = {};
      for (const sh of prior.shots) (merged[sh.view] = merged[sh.view] || { rows: [], errors: [] }).rows.push(sh);
      const retaken = [];
      for (const v of Object.keys(results)) {
        const fresh = results[v].rows.filter((r) => ONLY.has(r.id));
        const prev = merged[v] ? merged[v].rows : [];
        const keep = prev.filter((r) => !ONLY.has(r.id));
        retaken.push(...prev.filter((r) => ONLY.has(r.id)));
        merged[v] = { rows: keep.concat(fresh).sort((a, b) => a.n - b.n), errors: results[v].errors };
      }
      for (const k of Object.keys(results)) delete results[k];
      Object.assign(results, merged);
      tidyShots(results, retaken);
    }
    if (!ARGS['no-sheets']) {
      try { meta.sheets = await makeSheets(browser, results); } catch (e) { log('contact sheets failed: ' + String(e).slice(0, 200)); }
    }
    if (!ARGS['no-kit']) {
      try { meta.kit = await makeKit(browser, results, meta); } catch (e) { log('ChatGPT kit failed: ' + String(e).slice(0, 200)); }
    }
    writeReport(results, meta);
  } finally {
    await browser.close().catch(() => {});
    srv.close();
    await H.stopWorker(worker);
  }
  let zips = [];
  if (!ARGS['no-zip']) {
    try { zips = zipBundles(Object.keys(results)); } catch (e) { log('zip failed (is `zip` installed?): ' + String(e).slice(0, 200)); }
  }
  const all = Object.values(results).flatMap((r) => r.rows);
  const shots = all.filter((r) => r.file).length, skipped = all.filter((r) => r.skipped).length;
  const notes = all.reduce((k, r) => k + (r.controls || []).filter((c) => c.issues.some((i) => i.kind !== 'tight')).length, 0);
  for (const v of Object.keys(results)) if (results[v].errors.length) log(`${v}: ${results[v].errors.length} page errors, first: ${results[v].errors[0]}`);
  log(`${shots} screens captured, ${skipped} skipped, ${notes} controls with problems -- ${OUT} (${Math.round((Date.now() - t0) / 1000)}s)`);
  for (const z of zips) log(`  ${z.file} (${z.mb} MB)`);
}
