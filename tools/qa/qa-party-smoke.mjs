/* ═══ QA: two-session party HUD smoke (v2.3.1196) ═══
 *
 * Regression check for the v2.3.1185 party system's client surface
 * (docs/specs/party.md): A invites B over the wire, B accepts by
 * CLICKING the PartyHUD invite card's Join button (the real UI path),
 * and both sessions must render the roster strip from their private
 * party_state echoes — same server truth, two views.  Then A leaves and
 * the 2-member party disbands on both.
 *
 * Checks:
 *   1. worker advertises caps.party (state_sync deploy-order gate);
 *   2. B's invite card appears in the DOM (party_invited → setParty);
 *   3. after B taps Join, BOTH sessions hold S._party with 2 members,
 *      leader = A, both names present, live vitals (hp/maxHp > 0);
 *   4. BOTH DOMs render the roster strip ("PARTY 2/4");
 *   5. A taps Leave → party dissolves on both (S._party null, strip gone).
 *
 * Fast by design: both bots stay at the town spawn (party_invite targets
 * by player id — no proximity or same-zone requirement).
 *
 * Prereqs (same as qa-facing.mjs): built client at :4173, worker at
 * :8787 (QA_WS_URL=ws://127.0.0.1:8787).  Exits non-zero on any failed
 * check (run-all.mjs fail-fast compatible).
 *
 * CI status: wired into client-ci.yml as REPORT-ONLY (continue-on-error)
 * — authored in a sandbox where npm is policy-blocked (no vite build /
 * wrangler), so it has had no stabilization run against the real client.
 * Promotion criteria: flip it blocking once it holds green (incl. the
 * one workflow retry) for ~10 consecutive CI runs.
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const SHELL = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const PWCHROME = '/opt/pw-browsers/chromium';
const EXE = process.env.QA_CHROME || (existsSync(SHELL) ? SHELL : (existsSync(PWCHROME) ? PWCHROME : undefined));
const URL = process.env.QA_URL || 'http://localhost:4173/';

let failures = 0;
const check = (name, cond, detail) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (cond ? '' : '  ' + JSON.stringify(detail)));
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio', '--ignore-certificate-errors'],
});

async function startSession(label) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(label, 'PAGEERROR', e.message.slice(0, 140)));
  if (process.env.QA_WS_URL) {
    await page.addInitScript(`window.BROTOWN_WS_URL = ${JSON.stringify(process.env.QA_WS_URL)};`);
  }
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const input = page.locator('input').first();
  await input.fill(label, { timeout: 60000 });
  await input.press('Enter');
  for (let i = 0; i < 60; i++) {
    const joined = await page.evaluate(() => window._gameState?.current?.player?.x != null).catch(() => false);
    if (joined) return page;
    await sleep(1000);
  }
  console.log(label, 'FAILED TO JOIN');
  process.exit(1);
}

/* poll until fn() is truthy or timeout; returns last value (qa-facing) */
async function pollUntil(fn, timeoutMs, intervalMs = 250) {
  const t0 = Date.now();
  let v;
  while (Date.now() - t0 < timeoutMs) {
    v = await fn();
    if (v) return v;
    await sleep(intervalMs);
  }
  return v;
}

const A = await startSession('PartyBotA');
const B = await startSession('PartyBotB');
const aId = await A.evaluate(() => window._gameState.current.myId);
const bId = await B.evaluate(() => window._gameState.current.myId);
console.log('A =', aId, ' B =', bId);

/* ── 1. deploy-order gate: the worker must advertise the party cap ── */
const caps = await A.evaluate(() => window._gameState.current._serverCaps || null);
check('server advertises caps.party', !!(caps && caps.party), caps);
if (!(caps && caps.party)) { await browser.close(); process.exit(1); }

/* ── 2. A invites B (same wire shape as InspectPlayerPanel's button) ── */
await A.evaluate((target) => {
  const S = window._gameState.current;
  S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target } });
}, bId);

const inviteCard = await pollUntil(
  () => B.locator('text=Party Invite').first().isVisible().catch(() => false), 12000);
check('B renders the invite card', !!inviteCard);
if (!inviteCard) { await browser.close(); process.exit(1); }

/* ── 3. B accepts via the card's Join button (the real HUD path) ── */
await B.locator('button', { hasText: 'Join' }).first().click({ timeout: 5000 });

const partyOn = (page) => page.evaluate(() => {
  const p = window._gameState.current._party;
  return p && p.members ? {
    leader: p.leader,
    names: p.members.map((m) => m.name),
    vitalsOk: p.members.every((m) => m.hp > 0 && m.maxHp > 0),
    size: p.members.length,
  } : null;
});
const rosterInDom = (page) => page.evaluate(() => /PARTY\s*2\/4/.test(document.body.innerText));

for (const [label, page] of [['A', A], ['B', B]]) {
  const roster = await pollUntil(async () => {
    const p = await partyOn(page);
    return p && p.size === 2 ? p : null;
  }, 15000);
  check(label + ' holds party_state with 2 members', !!roster, await partyOn(page));
  if (roster) {
    check(label + ' sees A as leader', roster.leader === aId, roster);
    check(label + ' roster carries both names + live vitals',
      roster.names.includes('PartyBotA') && roster.names.includes('PartyBotB') && roster.vitalsOk, roster);
  }
  const dom = await pollUntil(() => rosterInDom(page), 8000);
  check(label + ' renders the PARTY 2/4 HUD strip', !!dom);
}

/* ── 4. A leaves via the strip's Leave button → disband on both
       (a party left with one member is just a player) ── */
await A.locator('button[title="Leave party"]').first().click({ timeout: 5000 });
for (const [label, page] of [['A', A], ['B', B]]) {
  const gone = await pollUntil(async () => {
    const p = await partyOn(page);
    const dom = await rosterInDom(page);
    return !p && !dom;
  }, 10000);
  check(label + ' party dissolved (state + HUD gone)', !!gone,
    { party: await partyOn(page), domStrip: await rosterInDom(page) });
}

await browser.close();
console.log(failures === 0 ? '\nALL PARTY-SMOKE CHECKS PASSED' : `\n${failures} PARTY-SMOKE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
