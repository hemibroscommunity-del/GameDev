/* ═══ v2.3.2030: THE PRIZE DRAW PAGE, PROVEN — not on the CI path ═══
 *
 * public/tools/draw.html picks who gets the merch. It is a page with real
 * value riding on it and no server behind it, so the properties worth
 * proving are the ones a human clicking through cannot see:
 *
 *   1. ENTRANT SELECTION reads only SERVER-AUTHORITATIVE fields. The
 *      leaderboard row carries BOTH `series.kills` (svKills, server-held)
 *      and a top-level `kills` that rides the client-reported rpgData blob
 *      (leaderboard.js: "still a client-reported claim"). The fixture below
 *      makes them disagree wildly on purpose, so a page that reads the wrong
 *      one fails here instead of handing a prize to whoever edited their
 *      client.
 *   2. THE ORDER IS CONTENT-DERIVED, not server order. Two people running
 *      the draw against the same data must number the list identically or
 *      the same hash picks different winners. The fixture is returned in an
 *      order that is NOT the expected one.
 *   3. THE PAGE WILL NOT DRAW AGAINST A BLOCK THAT ALREADY EXISTS. This is
 *      the whole security property: if you can pick the block after seeing
 *      the hash, you can fish for a winner. Asserted by locking and checking
 *      the committed target is strictly above the tip at lock time.
 *   4. THE ARITHMETIC IS THE ARITHMETIC. A known hash must produce a known
 *      winner, computed by hand here rather than by calling the page's own
 *      function back at it.
 *
 * Both networks are stubbed — the game's leaderboard and the block
 * explorers — so this runs with no internet and no live worker.
 *
 *   node tools/qa/draw-page.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');

let pass = 0, fail = 0;
const ok = (n, c, d = '') => {
  if (c) { pass++; console.log('  PASS ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  ' + JSON.stringify(d) : '')); }
};

const PAGE = path.join(REPO, 'public/tools/draw.html');
const HTML = fs.readFileSync(PAGE, 'utf8');

/* ── fixtures ───────────────────────────────────────────────────────────
   Window is a fixed hour so the test never depends on the clock. */
const T0 = Date.UTC(2026, 7, 27, 12, 0, 0);   // 12:00
const T1 = Date.UTC(2026, 7, 27, 18, 0, 0);   // 18:00

const ROWS = [
  /* Returned FIRST but sorts THIRD by id -- catches server-order leakage. */
  { id: 'bp_zulu',  name: 'Zulu',  level: 12, lastSeen: T0 + 3600e3,
    kills: 999999, playtime: 999999, goldEarned: 999999,   /* forged claims */
    series: { kills: 7 } },
  { id: 'bp_alpha', name: 'Alpha', level: 40, lastSeen: T0 + 60e3,
    kills: 0, series: { kills: 512 } },
  { id: 'bp_mike',  name: 'Mike',  level: 3,  lastSeen: T1 - 60e3,
    kills: 4, series: { kills: 1 } },
  /* Outside the window in both directions -- must not be entrants. */
  { id: 'bp_early', name: 'TooEarly', level: 9, lastSeen: T0 - 1,  series: { kills: 3 } },
  { id: 'bp_late',  name: 'TooLate', level: 9, lastSeen: T1 + 1,  series: { kills: 3 } },
  /* Junk rows the real board can carry. */
  { id: 'bp_nots',  name: 'NoSeries', level: 5, lastSeen: T0 + 10e3 },
  { name: 'NoId', level: 5, lastSeen: T0 + 10e3, series: { kills: 2 } },
];

/* Expected entrants: inside the window, sorted by id.
   bp_alpha, bp_mike, bp_nots, bp_zulu, and the id-less row (id '' sorts first). */
const EXPECT_ORDER = ['NoId', 'Alpha', 'Mike', 'NoSeries', 'Zulu'];

/* A real-looking hash whose last 8 chars we control. 0x0000000b = 11.
   11 % 5 = 1 -> index 1 -> the SECOND entrant, 'Alpha'. Worked out here by
   hand rather than by asking the page. */
const HASH = '00000000000000000002b3f5a1c9d7e4f60a8b2c1d3e5f70819a2b3c0000000b';
const EXPECT_WINNER = 'Alpha';

/* ── a tiny static server: file:// blocks fetch() ── */
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:' + server.address().port;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

/* Chain height is a mutable knob: the block the page commits to must not
   exist when it locks, and must appear later. */
let TIP = 900000;
let MINED = false;
const offSite = [];

/* Every context runs in Europe/London ON PURPOSE. The event window is stored
   as absolute UTC and rendered into the viewer's zone; if this test happened
   to run in America/Los_Angeles, a page that wrongly hardcoded "09:00 local"
   would pass every assertion below. In London (UTC+1 in August) 16:00 UTC
   renders as 17:00, so the round-trip check bites wherever CI runs. */
const TZ = 'Europe/London';

async function newPage() {
  const ctx = await browser.newContext({ timezoneId: TZ });
  const page = await ctx.newPage();

  await page.route('**/api/leaderboard/top*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, category: 'level', results: ROWS }) }));

  await page.route('**/blocks/tip/height', (route) =>
    route.fulfill({ status: 200, contentType: 'text/plain', body: String(TIP) }));

  await page.route('**/block-height/*', (route) => {
    const asked = parseInt(route.request().url().split('/').pop(), 10);
    if (MINED && asked <= TIP) {
      return route.fulfill({ status: 200, contentType: 'text/plain', body: HASH });
    }
    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Block not found' });
  });

  /* Anything else leaving the page is a finding: this file is supposed to be
     self-contained apart from the two APIs above. */
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith(ORIGIN) || u.startsWith('data:') || u.startsWith('blob:')) return;
    if (/\/api\/leaderboard\/top|\/blocks\/tip\/height|\/block-height\//.test(u)) return;
    offSite.push(u);
  });

  await page.goto(ORIGIN, { waitUntil: 'load' });
  return { ctx, page };
}

/* Fill the two datetime-local inputs so they parse back to the given UTC
   instants IN THE BROWSER.  See the note at its first call site. */
async function setWindow(page, fromMs, toMs) {
  await page.evaluate(([a, b]) => {
    const f = (ms) => {
      const d = new Date(ms), p = (x) => String(x).padStart(2, '0');
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
             'T' + p(d.getHours()) + ':' + p(d.getMinutes());
    };
    document.getElementById('from').value = f(a);
    document.getElementById('to').value = f(b);
  }, [fromMs, toMs]);
}

console.log('draw-page:');

/* ── 1. the pure logic, driven directly ── */
{
  const { ctx, page } = await newPage();

  const ents = await page.evaluate(([rows, a, b]) =>
    window.__draw.entrantsFrom(rows, a, b), [ROWS, T0, T1]);

  ok('only players seen inside the window are entrants',
    ents.length === EXPECT_ORDER.length, { got: ents.length, want: EXPECT_ORDER.length });
  ok('...and the ones outside it are excluded by name',
    !ents.some((e) => e.name === 'TooEarly' || e.name === 'TooLate'),
    ents.map((e) => e.name));
  ok('the order is derived from the row id, not the order the server returned',
    JSON.stringify(ents.map((e) => e.name)) === JSON.stringify(EXPECT_ORDER),
    ents.map((e) => e.name));

  const zulu = ents.find((e) => e.name === 'Zulu');
  ok('kills come from series.kills (server-held), not the forgeable top-level kills',
    zulu && zulu.kills === 7, zulu);
  ok('...and a row with no series at all reads 0 rather than undefined',
    (ents.find((e) => e.name === 'NoSeries') || {}).kills === 0,
    ents.find((e) => e.name === 'NoSeries'));
  ok('level is carried through',
    (ents.find((e) => e.name === 'Alpha') || {}).level === 40,
    ents.find((e) => e.name === 'Alpha'));

  /* The arithmetic, against numbers computed here. */
  const d = await page.evaluate(([h, n, k]) => window.__draw.drawFrom(h, n, k), [HASH, 5, 1]);
  ok('the tail is the last 8 hex characters', d.tail === '0000000b', d);
  ok('the tail parses to the right integer', d.num === 11, d);
  ok('11 mod 5 is 1', d.start === 1, d);
  ok('index 1 is the second entrant', d.picks[0] === 1, d);
  ok('the winner that falls out is the one worked out by hand',
    EXPECT_ORDER[d.picks[0]] === EXPECT_WINNER, EXPECT_ORDER[d.picks[0]]);

  /* Multiple winners must not repeat anyone, and must wrap. */
  const d3 = await page.evaluate(([h, n, k]) => window.__draw.drawFrom(h, n, k), [HASH, 3, 3]);
  ok('drawing k winners from n=k returns each entrant exactly once',
    d3.picks.length === 3 && new Set(d3.picks).size === 3, d3.picks);
  ok('...and it wraps around the end of the list rather than running off it',
    d3.picks.every((i) => i >= 0 && i < 3), d3.picks);

  await ctx.close();
}

/* ── 1b. the announced contest window is pinned to the right INSTANT ──
 * The owner gave the time twice and the two readings were two hours apart
 * (9am PDT is 16:00 UTC, not 14:00). The window is now stored as absolute
 * UTC and rendered into the viewer's zone, so this asserts the instant --
 * not the rendered string, which correctly differs per timezone. A page
 * hardcoding "09:00 local" would pass a naive string check and silently
 * select the wrong two hours for anyone outside California. */
{
  const { ctx, page } = await newPage();
  const w = await page.evaluate(() => window.__eventWindow);
  ok('the window starts at 16:00 UTC on 2026-08-28 (9am PDT)',
    w.startMs === Date.UTC(2026, 7, 28, 16, 0, 0), new Date(w.startMs).toISOString());
  ok('...and ends at 18:00 UTC (11am PDT)',
    w.endMs === Date.UTC(2026, 7, 28, 18, 0, 0), new Date(w.endMs).toISOString());
  ok('the window is two hours long', w.endMs - w.startMs === 2 * 3600e3);

  /* The inputs must round-trip back to those instants through the browser's
     own local-time parsing -- that is the step where a timezone bug lands. */
  const back = await page.evaluate(() => [
    new Date(document.getElementById('from').value).getTime(),
    new Date(document.getElementById('to').value).getTime(),
  ]);
  ok('the date inputs round-trip to the same instants in this browser zone',
    back[0] === w.startMs && back[1] === w.endMs, { back, w });

  const shown = await page.locator('#window').textContent();
  ok('the panel states the window in UTC so the reading cannot be mistaken',
    /16:00.*18:00 UTC/.test(shown), shown);
  ok('...and also in the viewer\'s own zone, which here is NOT Pacific',
    shown.includes(TZ) && /17:00|5:00/.test(shown), shown);
  await ctx.close();
}

/* ── 2. the real flow in the page, and the guard that matters ── */
{
  TIP = 900000; MINED = false;
  const { ctx, page } = await newPage();

  /* Point the window inputs at the fixture hour.  The formatting MUST happen
     inside the browser: a datetime-local input is parsed in the BROWSER's
     zone, and node here is not in the browser's zone.  Formatting in node
     shifted the window by an hour and silently swapped a real entrant for one
     that should have been excluded -- caught only because the contexts above
     are pinned to Europe/London.  A test whose fixtures move with the
     machine's timezone is a test that lies somewhere. */
  await setWindow(page, T0, T1);
  await page.click('#load');
  await page.waitForSelector('#out1 table');

  const rowCount = await page.locator('#out1 tbody tr').count();
  ok('the page lists the five entrants', rowCount === 5, { rowCount });
  ok('the list is numbered from 1',
    (await page.locator('#out1 tbody tr:first-child td.n').first().textContent()).trim() === '1');
  ok('step 2 unlocks once there are entrants',
    !(await page.locator('#c2').getAttribute('class')).includes('off'));

  await page.click('#lock');
  await page.waitForSelector('#ann');

  const lock = await page.evaluate(() => JSON.parse(localStorage.getItem('brotown_draw_lock_v1')));
  ok('the committed block is ABOVE the chain tip at lock time — the hash cannot exist yet',
    lock.target > lock.tipWhenLocked, lock);
  ok('...and the tip it was locked against is recorded, so the commitment is checkable later',
    lock.tipWhenLocked === TIP, lock);
  ok('the locked entrant list is frozen into the commitment',
    lock.entrants.length === 5, lock.entrants.length);

  const ann = await page.locator('#ann').textContent();
  ok('the announcement names every entrant',
    EXPECT_ORDER.every((n) => ann.includes(n)), ann);
  ok('the announcement states the rule before the hash exists',
    /last 8 hex characters/.test(ann) && ann.includes('#' + lock.target), ann);
  ok('the announcement says the block has not been mined yet',
    /has not/.test(ann), ann);

  /* While the block is missing, the page must WAIT, not draw. */
  await page.waitForSelector('#out3 .note');
  const waiting = await page.locator('#out3').textContent();
  ok('with the block unmined the page waits instead of drawing',
    /Waiting for block/.test(waiting) && !/Winner/.test(waiting), waiting.slice(0, 120));

  /* Mine it. The page polls every 30s; nudge it rather than idling. */
  TIP = lock.target; MINED = true;
  await page.evaluate(() => location.reload());
  await page.waitForSelector('#out3 .big', { timeout: 15000 });

  const drawn = await page.locator('#out3').textContent();
  ok('once the block exists the winner is drawn',
    drawn.includes('Winner: ' + EXPECT_WINNER), drawn.slice(0, 200));
  ok('the block hash is shown in full so it can be looked up',
    drawn.includes(HASH), 'hash missing');
  ok('the arithmetic is shown, not just the answer',
    drawn.includes('0000000b') && drawn.includes('11') && drawn.includes('remainder'),
    drawn.slice(0, 400));
  ok('a lock survives a page reload — a 30-minute wait must not lose the commitment',
    (await page.evaluate(() => !!JSON.parse(localStorage.getItem('brotown_draw_lock_v1')))));

  await ctx.close();
}

/* ── 3. the 100-row cap has to be loud ── */
{
  TIP = 900000; MINED = false;
  const ctx = await browser.newContext({ timezoneId: TZ });
  const page = await ctx.newPage();
  const many = [];
  for (let i = 0; i < 100; i++) {
    many.push({ id: 'bp_' + String(i).padStart(3, '0'), name: 'P' + i,
      level: 100 - i, lastSeen: T0 + 1000, series: { kills: 1 } });
  }
  await page.route('**/api/leaderboard/top*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, results: many }) }));
  await page.goto(ORIGIN, { waitUntil: 'load' });
  await setWindow(page, T0, T1);
  await page.click('#load');
  await page.waitForSelector('#out1 table');
  const warn = await page.locator('#out1 .warn').count();
  const text = await page.locator('#out1').textContent();
  ok('a full 100 rows raises the silent-truncation warning', warn === 1, { warn });
  ok('...and the warning says not to draw from that list',
    /Do not run the draw/.test(text), text.slice(-260));
  await ctx.close();
}

/* ── 4. self-contained ── */
ok('the page requested nothing beyond the leaderboard and the block explorers',
  offSite.length === 0, offSite);
ok('the page embeds no external script or stylesheet',
  !/<script[^>]+src=/i.test(HTML) && !/<link[^>]+stylesheet/i.test(HTML));

await browser.close();
server.close();

console.log(`\ndraw-page: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
