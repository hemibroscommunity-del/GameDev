/* v2.3.1637: HEADLESS UI MENU CAPTURE
 *
 * Screenshots every menu in the game so they can be reviewed side by side
 * (owner ask: "screenshots of every UI menu ... so I can upload it to
 * ChatGPT to have it make suggested improvements for each menu").
 *
 * How it opens menus: panel visibility lives in React useState, so a
 * click-driven pass would have to walk the player to each building AND
 * could never reach panels gated on state a fresh account does not have
 * (an incoming trade, a duel challenge, a clan).  BroTown.jsx exposes
 * window._uiPanels -- the same autotest posture as the long-standing
 * window._gameState / window._gameFns hooks -- and this drives that.
 *
 * No worker required.  The client renders the whole UI with the socket
 * down (verified: HUD, canvas and every panel below draw fine), so this
 * runs anywhere without a server, which is also why the shots show a
 * fresh level-1 character.
 *
 * Two passes per menu:
 *   full/   1280x1000 @2x -- the whole menu, nothing cut off (for review)
 *   phone/   844x390  @2x -- real iPhone-landscape framing, the primary
 *                            platform, so cramped panels are visible AS
 *                            cramped rather than silently reflowed away
 *
 * Usage: npm run build && npx vite preview --port 4173   (then)
 *        node tools/qa/qa-ui-shots.mjs [outDir]
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2] || '/tmp/ui-shots';
const URL = process.env.QA_URL || 'http://127.0.0.1:4173/';
const EXE = [process.env.QA_CHROME,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/tmp/chrome-headless-shell-linux64/chrome-headless-shell',
].filter(Boolean).find((p) => existsSync(p));

/* Fixtures for the panels driven by an object rather than a boolean.
   Shapes read off each component's own prop reads. */
const FIX = {
  quest: { npc: 'Elder Bram', status: 'offer', quest: { id: 'q1', name: 'Slime Trouble', desc: 'Clear 5 slimes from the meadow.', reward: { gold: 120, xp: 300 } } },
  inspect: { id: 'bp_demo', name: 'Rival Bro', color: '#5b52ff', avatar: null, clanTag: 'RED', clanColor: '#f87171', bro: null, rpgData: { level: 12, kills: 340, ap: 25 } },
  incomingTrade: { from: 'bp_demo', fromName: 'Rival Bro', offer: { _gold: 250, oak_log: 12, iron_ore: 4 } },
  duelRequest: { fromId: 'bp_demo', fromName: 'Rival Bro', wager: 500 },
  threat: { fromId: 'bp_demo', fromName: 'Rival Bro', fromLevel: 14, countdown: 12, responded: false, ts: Date.now() },
  trade2: { a: 'bp_me', aName: 'You', b: 'bp_demo', bName: 'Rival Bro', from: 'bp_me', confirmed: {}, offer: {} },
  party: { leader: 'bp_me', members: [{ id: 'bp_me', name: 'You', hp: 100, maxHp: 100, level: 5 }, { id: 'bp_demo', name: 'Rival Bro', hp: 62, maxHp: 120, level: 12 }] },
  clanData: { id: 'c1', name: 'Red Team', tag: 'RED', color1: '#f87171', color2: '#5b52ff', leaderId: 'bp_me', members: ['bp_me', 'bp_demo'] },
};

const BUILDINGS = ['shop', 'bank', 'enchant', 'cook', 'farm', 'gamble', 'party', 'exchange', 'forge', 'woodwork', 'gemcut'];
const BUILDING_LABEL = {
  shop: 'general-store', bank: 'bank', enchant: 'enchanter', cook: 'kitchen',
  farm: 'farm', gamble: 'gambling-den', party: 'arena', exchange: 'marketplace',
  forge: 'forge', woodwork: 'woodworker', gemcut: 'gem-cutter',
};

/* Dropped from this list on purpose (v2.3.1637): 'chat', 'clanWar' and
   'arena' are dead useState pairs nothing reads, and 'welcome' just
   aliases the name modal already captured as 00-login.  The real chat and
   war-banner surfaces are captured via COMPOSITE below. */
const BOOLS = [
  'inventory', 'skills', 'stats', 'shop', 'social', 'leaderboard', 'encyclopedia',
  'info', 'emotes', 'clan', 'guild', 'feedback', 'petHouse',
  'furniture', 'playerList', 'mayorGreeting', 'tourPrompt',
];

/* Panels gated on more than one piece of state: set every half. */
const COMPOSITE = {
  chat: `window._uiPanels.chatOpen(true)`,
  'dungeon-creator': `window._uiPanels.dungeonCreator({ waves: 5, monsterLevel: 10, bossMultiplier: 3, element: 'flame' }); window._uiPanels.dungeonCreatorShow(true)`,
  'trade-request': `window._uiPanels.tradeTarget({ id: 'bp_demo', name: 'Rival Bro' }); window._uiPanels.tradeShow(true)`,
  /* The banners read stateRef.current at RENDER time, and writing a ref
     never schedules a render -- so set the war, then toggle a harmless
     piece of React state to force one. */
  'clan-war-banner': `(() => {
     /* The banner returns null without BOTH the war and the viewer's own
        clan (WarBanner.jsx:27) -- it needs to know which side is 'us'. */
     window._gameState.current._clanData = { id: 'c1', tag: 'RED', name: 'Red Team', color1: '#f87171' };
     window._gameState.current._activeClanWar = { id: 'w1', status: 'active', endTime: Date.now() + 900000, challenger: { tag: 'RED', score: 3, color1: '#f87171' }, defender: { tag: 'BLU', score: 1, color1: '#60a5fa' }, zone: 'town' };
     window._uiPanels.playerList(true); window._uiPanels.playerList(false);
   })()`,
};

const VIEWS = [
  { dir: 'full', width: 1280, height: 1000 },
  { dir: 'phone', width: 844, height: 390 },
];

const report = [];

async function capture(view) {
  const browser = await chromium.launch({
    executablePath: EXE, headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio', '--ignore-certificate-errors'],
  });
  const page = await browser.newPage({
    viewport: { width: view.width, height: view.height }, deviceScaleFactor: 2,
  });
  page.on('pageerror', () => {});
  mkdirSync(`${OUT}/${view.dir}`, { recursive: true });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: `${OUT}/${view.dir}/00-login.png` });

  // Join: the name field submits on Enter (same flow as qa-smoke.mjs).
  try {
    const input = page.locator('input').first();
    await input.fill('UI Review');
    await input.press('Enter');
  } catch (e) { /* already past it */ }
  await page.waitForTimeout(10000);
  await page.screenshot({ path: `${OUT}/${view.dir}/01-hud-town.png` });

  /* Baseline DOM size, so we can tell "panel opened" from "setter ran and
     nothing rendered" -- a menu gated on state we did not fake would
     otherwise produce a silent duplicate of the HUD. */
  const sig = () => page.evaluate(() => document.querySelectorAll('*').length * 1000 + document.body.innerHTML.length % 1000);
  const baseline = await sig();

  const shoot = async (key, name, openFn) => {
    // Close everything first so panels never stack.
    await page.evaluate(() => {
      for (const [k, fn] of Object.entries(window._uiPanels || {})) {
        try { fn(k === 'building' ? null : false); } catch (e) {}
      }
    });
    await page.waitForTimeout(400);
    const ok = await page.evaluate(openFn);
    await page.waitForTimeout(1100);
    const len = await sig();
    const rendered = ok === true && len !== baseline;
    const file = `${name}.png`;
    await page.screenshot({ path: `${OUT}/${view.dir}/${file}` });
    if (view.dir === 'full') report.push({ menu: name, key, rendered, delta: len - baseline });
    process.stdout.write(`  ${rendered ? 'OK  ' : 'FLAT'} ${view.dir}/${file}\n`);
  };

  let n = 2;
  const idx = () => String(n++).padStart(2, '0');

  for (const b of BOOLS) {
    await shoot(b, `${idx()}-${b}`, `(() => { try { window._uiPanels[${JSON.stringify(b)}](true); return true; } catch (e) { return String(e); } })()`);
  }
  for (const [name, expr] of Object.entries(COMPOSITE)) {
    await shoot(name, `${idx()}-${name}`, `(() => { try { ${expr}; return true; } catch (e) { return String(e); } })()`);
  }
  for (const [k, v] of Object.entries(FIX)) {
    await shoot(k, `${idx()}-${k}`, `(() => { try { window._uiPanels[${JSON.stringify(k)}](${JSON.stringify(v)}); return true; } catch (e) { return String(e); } })()`);
  }
  for (const b of BUILDINGS) {
    await shoot(`building:${b}`, `${idx()}-building-${BUILDING_LABEL[b] || b}`,
      `(() => { try { window._uiPanels.building(${JSON.stringify(b)}); return true; } catch (e) { return String(e); } })()`);
  }

  await browser.close();
}

for (const v of VIEWS) {
  console.log(`\n=== ${v.dir} (${v.width}x${v.height} @2x) ===`);
  await capture(v);
}

const flat = report.filter((r) => !r.rendered);
writeFileSync(`${OUT}/CAPTURE-REPORT.json`, JSON.stringify({ total: report.length, rendered: report.length - flat.length, flat }, null, 2));
console.log(`\n${report.length - flat.length}/${report.length} menus rendered.`);
if (flat.length) console.log('no visible change:', flat.map((f) => f.menu).join(', '));
