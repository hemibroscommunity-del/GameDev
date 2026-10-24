/* v2.3.3579: THE MAYOR POINTS AT THE GOO GROTTO, A PARTY'S JOB, ON A PHONE
 * (src/data/gameSystems.js grottoPartyAside, tut_1's hand-in).
 *
 * The owner: "Yes add mayors line pointing to grotto as a party challenge but
 * keep the wittiness of the new dialog."  In the world, a new character takes
 * the slimes from Mayor Bro, brings him 4 Slime Remains (granted, as
 * mp-questline seeds them) and hands them in, tap by tap on his window:
 *
 *   1. the worker plays the Grotto for a party (caps.partydungeon)
 *   2. the hand-in is one tap (v2.3.3591, the owner's "just one message";
 *      seven until then), and its last sentence names the Goo Grotto:
 *      level 16, 2 or 3 friends, after who to see first
 *   3. "Claim reward" still pays it: the worker hands tut_1 in
 *   4. `partydungeon: false`: a second character's hand-in is one tap, no
 *      Grotto
 *   5. no page errors
 */
import * as H from './harness.mjs';

const OUT = `${H.REPO}/tools/qa/mp/out`;

/* every tap of the giver's window up to "Claim reward", each line as shown */
async function walkHandIn(P, shot) {
  const lines = [];
  for (let i = 0; i < 14; i++) {
    const at = await P.page.evaluate(() => {
      const t = document.querySelector('.bt-npcdlg-text');
      const b = document.querySelector('.bt-npcdlg-next');
      return { line: t ? (t.innerText || '').replace(/\s+/g, ' ').trim() : null, button: b ? (b.innerText || '').trim() : null };
    });
    if (at.line == null) break;
    if (!lines.length || lines[lines.length - 1] !== at.line) lines.push(at.line);
    if (shot && /Goo Grotto/.test(at.line)) await P.page.screenshot({ path: `${OUT}/mayorgrotto-aside.png` }).catch(() => {});
    if (/^claim reward$/i.test(at.button || '')) return { lines, claim: true };
    const clicked = await P.page.evaluate(() => {
      const b = document.querySelector('.bt-npcdlg-next');
      if (!b) return false;
      b.click();
      return true;
    });
    if (!clicked) break;
    await P.page.waitForTimeout(450);
  }
  return { lines, claim: false };
}

async function slimesToHandIn(P, wsPort, rec, tag) {
  const myId = await H.readState(P, (S) => S.myId);
  rec.ok(`${tag}: walking up to Mayor Bro opens his dialogue`, await H.approachNpc(P, 'mayor_bro'));
  const landed = await H.advanceNpcDialogue(P);
  rec.ok(`${tag}: ...his lines lead to the slimes' offer`, landed === 'offer', landed);
  rec.ok(`${tag}: ...accepted`, await H.confirmQuestOffer(P));
  await P.page.waitForTimeout(1600);
  await H.closeNpcDialogue(P);
  await H.grant(wsPort, myId, 'item', { invKey: 'slime-remnants', count: 4 });
  await P.page.waitForTimeout(1600);
  rec.ok(`${tag}: walking back up with 4 Slime Remains opens his hand-in`, await H.approachNpc(P, 'mayor_bro'));
  return myId;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const errs = [];

  /* ── the party Grotto ── */
  const P = await H.newPlayer(browser, { name: 'Grottoer', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(P);
  await P.page.waitForTimeout(2400);
  const caps = await H.readState(P, (S) => S._serverCaps && S._serverCaps.partydungeon);
  rec.ok('1. the worker plays the Goo Grotto for a party (caps.partydungeon)', caps === true, caps);

  const myId = await slimesToHandIn(P, wsPort, rec, '2');
  const walk = await walkHandIn(P, true);
  const at = walk.lines.findIndex((l) => /Goo Grotto/.test(l));
  const aside = at >= 0 ? walk.lines[at] : '';
  rec.ok(`2a. the hand-in is one tap (${walk.lines.length})`, walk.lines.length === 1, walk.lines);
  rec.ok('2b. ...it names the Goo Grotto', at === 0, { at, aside });
  rec.ok('2c. ...its level and party: level 16, 2 or 3 friends', /level 16\b/.test(aside) && /take 2 or 3 friends\./.test(aside), aside);
  rec.ok('2d. ...last, after the bow and staff and who to see first',
    /bow and a staff/.test(aside) && /Diego\. The Goo Grotto/.test(aside), aside);
  rec.ok('2e. ...in his voice ("I\'m out of eulogies")', /I'm out of eulogies\.$/.test(aside), aside);

  rec.ok('3. "Claim reward" is reached on his last line', walk.claim, walk.lines.slice(-1));
  if (walk.claim) {
    await P.page.locator('.bt-npcdlg-next:visible').first().click({ timeout: 6000 }).catch(() => {});
    let q = null;
    for (let i = 0; i < 30; i++) {
      await P.page.waitForTimeout(200);
      const a = await H.adminPlayer(wsPort, myId).catch(() => null);
      q = a && a.rpg && a.rpg._quests ? a.rpg._quests.tut_1 : null;
      if (q === 'turnedIn') break;
    }
    rec.ok('3b. ...and pays it: the worker hands tut_1 in', q === 'turnedIn', q);
  }
  await P.ctx.close().catch(() => {});

  /* ── `partydungeon: false`: as it was ── */
  await H.liveFlag(wsPort, 'partydungeon', false);
  const Q = await H.newPlayer(browser, { name: 'Grottoold', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  Q.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(Q);
  await Q.page.waitForTimeout(2400);
  const caps2 = await H.readState(Q, (S) => S._serverCaps && S._serverCaps.partydungeon);
  rec.ok('4. `partydungeon: false`: the worker no longer says so', caps2 !== true, caps2);
  await slimesToHandIn(Q, wsPort, rec, '4');
  const walk2 = await walkHandIn(Q, false);
  rec.ok(`4b. ...and the hand-in is one tap, no Grotto (${walk2.lines.length})`,
    walk2.lines.length === 1 && !walk2.lines.some((l) => /Grotto/.test(l)), walk2.lines);
  await H.liveFlag(wsPort, 'partydungeon', null);
  await Q.ctx.close().catch(() => {});

  rec.ok('5. no page errors', errs.length === 0, errs.slice(0, 3));
}
