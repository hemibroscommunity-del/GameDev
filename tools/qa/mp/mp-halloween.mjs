/* HALLOWEEN WEEK (v2.3.3395, docs/specs/halloween.md)
 *
 * The fun & social plan's Halloween items that need no new picture: the
 * Zombie Shuffle dance and the pumpkin speech bubbles, on 18 October (the
 * 24th until v2.3.3463) to 1 November by each phone's calendar
 * (game/season.js; `?halloween=1|0` forces it).  Two phones, one in Halloween
 * week and one not:
 *
 *   1. in Halloween week the Moves tab has a thirteenth tile, the Zombie
 *      Shuffle, its name whole on the tile ("Zombie", v2.3.3463: it was cut to
 *      "Zombie Sh"); out of it, twelve;
 *   2. a finger on it: the bro lurches, held, and the worker keeps the pose;
 *   3. the other phone -- out of Halloween week -- still sees him shuffle
 *      (the worker keeps it any day: a look, never a rule) and its pumpkin;
 *   4. his speech bubble is pumpkin-coloured on his phone and plain on the
 *      other: each phone's own calendar.
 *      v2.3.3494 (the owner: "Make Npc dialog boxes white. Keep players the
 *      darker color to differentiate"): "plain" is the DARK player bubble now
 *      (game/bubbleSkins.js `player`), and a townsperson's line is white with
 *      black words on both phones, in Halloween week or not.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

async function fingerTap(P, sel) {
  const at = await P.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { err: 'no ' + sel };
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === el || el.contains(hit))) return { err: sel + ' is covered by ' + (hit ? hit.outerHTML.slice(0, 80) : 'nothing') };
    return { x, y };
  }, sel);
  if (at.err) return at;
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y }] });
  await new Promise((r) => setTimeout(r, 60));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  return at;
}
async function openMoves(P) {
  await P.page.evaluate(() => window.__broLegacyUI.emotesOpen());
  await P.page.waitForSelector('[data-emote-picker]', { timeout: 5000 });
  if (!(await P.page.evaluate(() => !!document.querySelector('[data-emote-moves]')))) {
    await P.page.locator('[data-emote-tab="moves"]').first().click().catch(() => {});
    await P.page.waitForSelector('[data-emote-moves]', { timeout: 3000 }).catch(() => {});
  }
}
const tiles = (P) => P.page.evaluate(() => [...document.querySelectorAll('[data-emote-move]')].map((b) => b.getAttribute('data-emote-move')));
async function until(P, fn, arg, pred, timeout = 6000) {
  const t0 = Date.now();
  let v;
  while (Date.now() - t0 < timeout) {
    v = await P.page.evaluate(fn, arg);
    if (pred(v)) return { ok: true, v };
    await P.page.waitForTimeout(120);
  }
  return { ok: false, v };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Zed', wsPort, webPort, viewport: PHONE, touch: true, query: 'halloween=1' });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Plain', wsPort, webPort, viewport: PHONE, touch: true, query: 'halloween=0' });
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  const aId = await H.readState(A, (S) => S.myId);
  await A.page.waitForTimeout(1200);

  /* ── 1. THE THIRTEENTH TILE ── */
  await openMoves(A);
  const ta = await tiles(A);
  rec.ok('in Halloween week the Moves tab has thirteen tiles, the Zombie Shuffle last', ta.length === 13 && ta[12] === 'zombie', ta);
  /* v2.3.3463: its name whole on the tile -- "Zombie Shuffle" was cut to
     "Zombie Sh" at the tile's 42 px.  Asserted for the shuffle alone: the
     others' fit depends on the font this box draws (docs/DEV-TOOLS.md, the
     fallback is ~30% wider), so they ride in the detail. */
  const labels = await A.page.evaluate(() => [...document.querySelectorAll('[data-emote-move]')].map((b) => {
    const s = b.querySelectorAll('span')[1];
    return { id: b.getAttribute('data-emote-move'), text: s ? s.textContent : null, cut: s ? s.scrollWidth > s.clientWidth : true };
  }));
  const zl = labels.find((l) => l.id === 'zombie');
  rec.ok('...its name whole on the tile: "Zombie"', !!zl && zl.text === 'Zombie' && !zl.cut,
    { zombie: zl, cutElsewhere: labels.filter((l) => l.cut && l.id !== 'zombie').map((l) => l.text) });
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/halloween-picker.png` }).catch(() => {});
  await openMoves(B);
  const tb = await tiles(B);
  rec.ok('...out of it, twelve and no zombie', tb.length === 12 && !tb.includes('zombie'), tb);
  await B.page.evaluate(() => { const x = document.querySelector('[data-emote-close]'); if (x) x.click(); });

  /* ── 2. THE SHUFFLE ── */
  const t2 = await fingerTap(A, '[data-emote-move="zombie"]');
  rec.ok('a real finger reaches the Zombie Shuffle', !t2.err, t2);
  const own = await until(A, () => { const f = window.__btEmoteFigure && window.__btEmoteFigure('self'); const S = window._gameState.current; return { pose: S._pose && S._pose.id, rot: f && f.rot, emoting: f && f.emoting }; }, null,
    (v) => v.pose === 'zombie' && v.emoting && v.rot > 0.05, 5000);
  rec.ok('he lurches, leaning in, held', own.ok, own.v);
  let srvPo;
  for (let i = 0; i < 20 && srvPo !== 'zombie'; i++) {
    const live = await H.serverPlayer(wsPort, aId);
    srvPo = live ? live.po : undefined;
    if (srvPo !== 'zombie') await new Promise((r) => setTimeout(r, 150));
  }
  rec.ok('the worker keeps the pose', srvPo === 'zombie', srvPo);

  /* ── 3. THE OTHER PHONE, OUT OF SEASON, STILL SEES IT ── */
  const seen = await until(B, (id) => { const o = window._gameState.current.others[id]; const f = window.__btEmoteFigure && window.__btEmoteFigure(id); return { po: o && o._po, emoting: f && f.emoting }; }, aId,
    (v) => v.po === 'zombie' && v.emoting, 8000);
  rec.ok('the phone out of Halloween week still sees him shuffle', seen.ok, seen.v);
  const pumpkin = await until(B, (id) => { const p = window.__btEmotePops && window.__btEmotePops.get(id); return p ? p.emoji : null; }, aId, (v) => v === '🎃', 6000);
  rec.ok('...and his pumpkin pop', pumpkin.ok, pumpkin.v);

  /* ── 4. EACH PHONE'S OWN BUBBLES ── */
  await H.nudge(A, 'd', 300);
  await A.page.waitForTimeout(400);
  await A.page.evaluate(() => window.__btSendChat('trick or treat'));
  const mine = await until(A, (id) => { const b = window.__btChatBubbles && window.__btChatBubbles.get(id); return b ? { skin: b.skin, ink: b.ink } : null; }, aId, (v) => !!v, 6000);
  rec.ok('his own bubble is pumpkin-coloured in Halloween week (cream words)', mine.ok && mine.v.skin === 'halloween' && /ffe7c2/i.test(mine.v.ink), mine.v);
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/halloween-bubble.png` }).catch(() => {});
  const theirs = await until(B, (id) => { const b = window.__btChatBubbles && window.__btChatBubbles.get(id); return b ? { skin: b.skin, ink: b.ink } : null; }, aId, (v) => !!v, 6000);
  /* ═══ v2.3.3494: WHOSE BUBBLE IS WHOSE (game/bubbleSkins.js) ═══
     The owner: "Make Npc dialog boxes white. Keep players the darker color to
     differentiate."  A player's bubble out of Halloween week is the dark
     Lantern Slate one (warm-white words), never the white -- so the phone
     out of season still draws him dark, just not purple. */
  rec.ok('...and the everyday DARK player bubble on the phone out of it (each phone\'s calendar), light words',
    theirs.ok && theirs.v.skin === 'player' && /f7f2e7/i.test(theirs.v.ink), theirs.v);
  /* ...and a townsperson's line is WHITE, black words, on both phones --
     Halloween week or not. */
  for (const [P, nm] of [[A, 'in Halloween week'], [B, 'out of it']]) {
    const npcId = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const n = (S.npcs || []).find((x) => x && x.id === 'mayor_bro') || (S.npcs || [])[0];
      if (!n) return null;
      n.chatBubble = { text: 'Happy Halloween, bro!', ts: Date.now() };
      n.chatTimer = 60000;
      return n.id;
    });
    rec.ok(`a townsperson is there to speak ${nm} (guard)`, !!npcId, { npcId });
    if (!npcId) continue;
    const nb = await until(P, (id) => { const b = window.__btChatBubbles && window.__btChatBubbles.get('npc:' + id); return b ? { skin: b.skin, ink: b.ink } : null; }, npcId, (v) => !!v, 6000);
    rec.ok(`...and his bubble is WHITE with black words ${nm}`, nb.ok && nb.v.skin === 'plain' && /^#?0{6}$/i.test(String(nb.v.ink).replace(/^0x/i, '')), nb.v);
    if (P === A) await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/halloween-npc-bubble.png` }).catch(() => {});
  }
}
