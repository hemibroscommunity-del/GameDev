/* ═══ v2.3.3462: THE OWNER'S RECORDINGS, HEARD ON A PHONE ═══
 *
 * The owner, 2026-10-18, after the list of sounds that still needed new
 * recordings (docs/SOUND-GAPS.md): "I have the rest of the sounds" -- 21
 * recordings, cut by tools/audio/cut_owner_sounds.py (the table and every
 * call site are held by server/test/sound-cues.test.mjs §11).  On a phone in
 * the Wheel's BroTown, against a real worker, through the game's own handlers:
 *
 *   0. the sound is up; every new one-shot decoded on the loading screen, the
 *      voice and noise ones at 24 kHz (LOW_RATE_SFX); a file two keys name
 *      decoded once (fish-on-hook, lure-drop);
 *   1. a blow that lands on you: a grunt, one of two, never the same twice
 *      running; none for a blow on its heels, a blocked one or a burn's tick;
 *   2. under a quarter of your health your heart beats, about once a second,
 *      quicker under a tenth, and not at all when you are well;
 *   3. eating (the Quick Eat button): a munch; a bite the worker held back:
 *      the "denied" tick;
 *   4. a chat line coming in pops, yours going out softer;
 *   5. the chime: a party invite, an announcement, a friend's message, mail
 *      -- not the daily reward's payout;
 *   6. a refusal (equipping while the guards hold your gear): "denied";
 *   7. the Laugh laughs; Sleep snores, and snores again while you lie there;
 *   8. a dance takes the music deck for its beat, and gives it back when you
 *      step off;
 *   9. Ace answers a tap in his own voice; a townsperson's line pops up with
 *      his hum, softer;
 *  10. BroTown's crowd in the square, gone out on the commons; a campfire's
 *      crackle beside it; the sea's surf on its shore; a bed you left let go;
 *  11. the Flame Fields' air is the lava, decoded at 24 kHz;
 *  12. points spent in a batch, as the Points window sends them: the owner's
 *      level-up chime, once, on the worker's word (the splash the owner sent
 *      with it is mp-wheelswim's, where a player really swims);
 *  13. no page errors.
 *
 *   node tools/qa/mp/run.mjs ownersounds
 */
import * as H from './harness.mjs';
import { WHEEL_SPAWNS } from '../../../server/src/wheelspawns.js';

const VIEW = { width: 390, height: 844 };
const G = await H.wheelGeom();

/* the shore nearest BroTown between two lands: the first water the plan has
   on a line out from the middle, and the land a little short of it */
function shore() {
  const ids = Object.keys(G.W.byId);
  const angs = ids.map((id) => Math.atan2(G.W.byId[id].uy, G.W.byId[id].ux)).sort((a, b) => a - b);
  for (let i = 0; i < angs.length; i++) {
    const b = i + 1 < angs.length ? angs[i + 1] : angs[0] + 2 * Math.PI;
    const a = (angs[i] + b) / 2;
    const at = (r) => ({ x: Math.round(G.cx + Math.cos(a) * r), y: Math.round(G.cy + Math.sin(a) * r), r });
    for (let r = 1200; r < 9000; r += 60) {
      const p = at(r);
      if (G.classAt(p.x, p.y) !== G.C.ocean) continue;
      /* a land point a little short of where the sea begins */
      for (const back of [220, 280, 160, 340]) {
        const q = at(r - back), c = G.classAt(q.x, q.y);
        if (c === G.C.ground || c === G.C.path) return { x: q.x, y: q.y, r: q.r, sea: r };
      }
      break;
    }
  }
  return null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Hearer', wsPort, webPort, viewport: VIEW, touch: true, world: 'wheel' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel',
    { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
  const stopAlive = H.keepAlive(P);
  const done = async () => { stopAlive(); await P.ctx.close().catch(() => {}); };
  const myId = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', myId);   /* past the Mayor's gate */
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
  await P.page.waitForTimeout(1500);

  /* ── 0. the sound up, the recordings decoded ── */
  const audio = await P.page.evaluate(async () => {
    const A = window.BT_AUDIO, C = window.__btCues;
    if (!A || !C) return { probe: !!C, audio: !!A };
    if (!A.ctx) { try { A.unlock(); } catch (e) { /* reported below */ } }
    if (A.ctx && A.ctx.state !== 'running') { try { await A.ctx.resume(); } catch (e) { /* reported below */ } }
    const want = Object.keys(A.LOW_RATE_SFX).concat(['chat-pop', 'chime', 'denied', 'fish-on-hook', 'fishing-fish-on-hook', 'lure-drop', 'fishing-lure-drop']);
    const t0 = Date.now();
    while (Date.now() - t0 < 25000 && !want.every((k) => A._samples && A._samples[k])) await new Promise((r) => setTimeout(r, 250));
    const low = Object.keys(A.LOW_RATE_SFX);
    const rate = (k) => (A._samples[k] ? A._samples[k].sampleRate : 0);
    return {
      probe: true, ctx: !!A.ctx, state: A.ctx && A.ctx.state, ctxRate: A.ctx && A.ctx.sampleRate, muted: !!A.muted,
      missing: want.filter((k) => !(A._samples && A._samples[k])),
      lowRates: low.map((k) => [k, rate(k)]).filter((r) => r[1] !== A.LOW_RATE),
      uiRates: ['chat-pop', 'chime', 'denied'].map((k) => [k, rate(k)]).filter((r) => r[1] !== A.ctx.sampleRate),
      sharedHook: A._samples['fish-on-hook'] === A._samples['fishing-fish-on-hook'],
      sharedLure: A._samples['lure-drop'] === A._samples['fishing-lure-drop'],
      beds: !!window.__btBeds, own: !!window.__btOwnSounds, voices: !!window.__btNpcVoices,
    };
  });
  rec.ok(`0a. in the Wheel (${inWheel}), the sound up (${audio.state}), every new recording decoded`,
    inWheel === 'wheel' && audio.ctx && !audio.muted && (audio.missing || []).length === 0 && audio.beds && audio.own && audio.voices, audio);
  rec.ok(`0b. the voice and noise ones at 24 kHz (${audio.lowRates && audio.lowRates.length ? 'not all' : 'all'}), the UI's at the context's ${audio.ctxRate}`,
    (audio.lowRates || [1]).length === 0 && (audio.uiRates || [1]).length === 0, audio);
  rec.ok('0c. a file two keys name is decoded once (fish-on-hook, lure-drop: ~1 MB)', audio.sharedHook && audio.sharedLure, audio);
  if (!audio.ctx || audio.muted) { await done(); return; }

  /* things done on the page, and the cues they played */
  const cues = (fn, arg) => P.page.evaluate(async ({ src, arg }) => {
    const C = window.__btCues;
    C.reset();
    const f = new Function('arg', 'return (' + src + ')(arg)');
    const out = await f(arg);
    return { out, cues: C.stats.log.map((c) => ({ name: c.name, k: Math.round(c.k * 1000) / 1000, played: c.played, at: c.at })) };
  }, { src: fn.toString(), arg });
  const named = (r, n) => r.cues.filter((c) => c.name === n && c.played);
  const ev = (type, payload) => cues((a) => { window.__btDispatch({ type: a.type, payload: a.payload }); return true; }, { type, payload });

  /* ── 1. your hurt grunt ── */
  const blow = (extra) => P.page.evaluate((extra) => {
    const S = window._gameState.current;
    window.__btDispatch({ type: 'monster_attack', payload: Object.assign({
      monsterId: 'qa-own', targetId: S.myId, dmg: 40, dmgTaken: 40, zone: S.currentZone, hp: Math.round(S.rpg.hp),
      attackerX: S.player.x + 24, attackerY: S.player.y, ability: 'qa' }, extra) });
    const L = window.__btCues.stats.log;
    return L.length ? L[L.length - 1].name : null;
  }, extra);
  await P.page.evaluate(() => { window.__btCues.reset(); window.__btOwnSounds.reset(); });
  const g1 = await blow({}); await P.page.waitForTimeout(800);
  const g2 = await blow({}); await P.page.waitForTimeout(800);
  const g3 = await blow({});
  const g4 = await blow({});   /* on its heels */
  const grunts = await P.page.evaluate(() => window.__btCues.stats.log.filter((c) => /^hurt[ABC]$/.test(c.name)).map((c) => c.name));
  rec.ok(`1a. three blows 0.8 s apart: three grunts (${grunts.join(', ')}; two to choose from), never the same twice running; a fourth on its heels: none`,
    grunts.length === 3 && grunts[0] !== grunts[1] && grunts[1] !== grunts[2], { g1, g2, g3, g4, grunts });
  await P.page.waitForTimeout(800);
  const blocked = await cues(() => {
    const S = window._gameState.current;
    window.__btDispatch({ type: 'monster_attack', payload: { monsterId: 'qa-own', targetId: S.myId, dmg: 40, dmgTaken: 0, blocked: true, zone: S.currentZone,
      attackerX: S.player.x + 24, attackerY: S.player.y } });
    return true;
  });
  await P.page.waitForTimeout(800);
  const burn = await cues(() => {
    const S = window._gameState.current;
    window.__btDispatch({ type: 'monster_attack', payload: { monsterId: 'qa-own', targetId: S.myId, dmg: 40, dmgTaken: 40, ability: 'burn', zone: S.currentZone,
      attackerX: S.player.x + 24, attackerY: S.player.y } });
    return true;
  });
  rec.ok(`1b. a blocked blow (${blocked.cues.map((c) => c.name).join('+') || 'nothing'}) and a burn's tick (${burn.cues.map((c) => c.name).join('+') || 'nothing'}): no grunt`,
    !blocked.cues.some((c) => /^hurt/.test(c.name)) && !burn.cues.some((c) => /^hurt/.test(c.name)), { blocked, burn });

  /* ── 2. the heartbeat ── */
  const heart = (share, ms) => P.page.evaluate(async ({ share, ms }) => {
    const S = window._gameState.current, R = S.rpg;
    const C = window.__btCues;
    C.reset();
    const t0 = Date.now();
    const hold = setInterval(() => { R.hp = Math.max(1, Math.floor(R.maxHp * share)); }, 40);
    R.hp = Math.max(1, Math.floor(R.maxHp * share));
    await new Promise((r) => setTimeout(r, ms));
    clearInterval(hold);
    const beats = C.stats.log.filter((c) => c.name === 'heartbeat').map((c) => c.at - t0);
    return { beats, gaps: beats.slice(1).map((t, i) => t - beats[i]) };
  }, { share, ms });
  const hb20 = await heart(0.2, 3800);
  const hb8 = await heart(0.08, 3000);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
  await P.page.waitForTimeout(1200);
  const hbFull = await heart(1, 2200);
  /* the average gap: this box draws a few frames a second, so each beat lands
     on the frame after it is due (TRAPS §200) -- the tempo is the average */
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  rec.ok(`2. under a quarter: a beat about a second apart (${avg(hb20.gaps)} ms on average, ${hb20.beats.length} beats); under a tenth quicker (${avg(hb8.gaps)} ms); well: none (${hbFull.beats.length})`,
    hb20.beats.length >= 3 && avg(hb20.gaps) >= 850 && avg(hb20.gaps) <= 1200 && hb8.beats.length >= 3 && avg(hb8.gaps) >= 520 && avg(hb8.gaps) <= 820
      && avg(hb8.gaps) < avg(hb20.gaps) && hbFull.beats.length === 0, { hb20, hb8, hbFull });

  /* ── 3. eating ── */
  await H.grant(wsPort, myId, 'item', { invKey: 'cooked_fish_minnow', count: 2 });
  /* the admin view's `live` has no maxHp: the saved blob's is the worker's (mp-quickeat) */
  const a0 = await H.adminPlayer(wsPort, myId).catch(() => null);
  const maxHp = a0 && a0.rpg ? a0.rpg.maxHp : null;
  await H.devOp(wsPort, 'vitals', myId, { heal: false, god: true, godMinutes: 30, hp: Math.max(1, (maxHp || 300) - 60) });
  const btnAt = await H.waitFor(P, () => {
    const el = document.querySelector('.bt-quickeat-btn');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  }, (v) => !!v, { timeout: 9000, label: 'the Quick Eat button' }).catch(() => null);
  let eat = { cues: [] };
  if (btnAt) {
    await P.page.evaluate(() => window.__btCues.reset());
    await P.page.touchscreen.tap(btnAt.x, btnAt.y);
    await P.page.waitForTimeout(500);
    eat = { cues: await P.page.evaluate(() => window.__btCues.stats.log.map((c) => ({ name: c.name, played: c.played }))) };
  }
  const held = await cues(() => window.__btWsEvent({ type: 'eat_refused', payload: { wait: 5 } }));
  rec.ok(`3. the Quick Eat button eaten: a munch (${eat.cues.map((c) => c.name).join('+') || 'nothing'}); a bite the worker held back: "denied" (${held.cues.map((c) => c.name).join('+') || 'nothing'})`,
    !!btnAt && eat.cues.some((c) => c.name === 'munch' && c.played) && named(held, 'denied').length === 1, { btnAt, eat, held });
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });

  /* ── 4. the chat ── */
  const inLine = await ev('chat', { id: 'bp_qa_chatter', name: 'Chatter', text: 'hello there', color: '#fff' });
  await P.page.waitForTimeout(300);
  const outLine = await cues(() => window.__btSendChat('qa hello'));
  rec.ok(`4. a line in pops (${inLine.cues.map((c) => c.name + ' ' + c.k).join('+') || 'nothing'}), yours out softer (${outLine.cues.map((c) => c.name).join('+') || 'nothing'})`,
    named(inLine, 'chatPop').length === 1 && named(outLine, 'chatSent').length === 1, { inLine, outLine });

  /* ── 5. the chime ── */
  const chime = async (type, payload) => { await P.page.waitForTimeout(1100); return ev(type, payload); };
  const inv = await chime('party_invited', { from: 'bp_qa_inviter', fromName: 'Inviter', partySize: 1 });
  const ann = await chime('server_announce', { text: 'QA: the server says hello' });
  const dm = await chime('friend_dm', { from: 'bp_qa_friend', fromName: 'Pal', text: 'yo', ts: Date.now() });
  const mail = await chime('inbox_delivered', { entries: [{ source: 'trade', kind: 'gold', payload: { amount: 5 }, note: 'QA' }] });
  const daily = await chime('inbox_delivered', { entries: [{ source: 'dailyspin', kind: 'gold', payload: { amount: 5 } }] });
  rec.ok(`5. the chime: a party invite (${inv.cues.map((c) => c.name).join('+')}), an announcement (${ann.cues.map((c) => c.name).join('+')}), a friend's message (${dm.cues.map((c) => c.name).join('+')}), mail (${mail.cues.map((c) => c.name).join('+')}); the daily spin's payout: none (${daily.cues.map((c) => c.name).join('+') || 'nothing'})`,
    [inv, ann, dm, mail].every((r) => named(r, 'notify').length === 1) && named(daily, 'notify').length === 0, { inv, ann, dm, mail, daily });
  /* the party invite's card, answered */
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((q) => /^(decline|no|ignore|not now)$/i.test((q.textContent || '').trim())); if (b) b.click(); });

  /* ── 6. a refusal ── */
  await P.page.waitForTimeout(400);
  const locked = await ev('gear_locked', { until: Date.now() + 120000 });
  rec.ok(`6. equipping while the guards hold your gear: "denied" (${locked.cues.map((c) => c.name).join('+') || 'nothing'})`, named(locked, 'denied').length === 1, locked);

  /* ── 7-8. the moves and the dance (the picker, a real finger) ── */
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  const fingerTap = async (sel) => {
    const at = await P.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { err: 'no ' + sel };
      const r = el.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(hit === el || el.contains(hit))) return { err: sel + ' is covered by ' + (hit ? hit.outerHTML.slice(0, 90) : 'nothing') };
      return { x, y };
    }, sel);
    if (at.err) return at;
    await P.page.touchscreen.tap(at.x, at.y);
    return at;
  };
  const openMoves = async () => {
    await P.page.evaluate(() => window.__broLegacyUI && window.__broLegacyUI.emotesOpen && window.__broLegacyUI.emotesOpen());
    await P.page.waitForSelector('[data-emote-picker]', { timeout: 5000 }).catch(() => {});
    if (!(await P.page.evaluate(() => !!document.querySelector('[data-emote-moves]')))) {
      await P.page.locator('[data-emote-tab="moves"]').first().click().catch(() => {});
      await P.page.waitForSelector('[data-emote-moves]', { timeout: 3000 }).catch(() => {});
    }
  };
  const closeMoves = () => P.page.evaluate(() => { const b = document.querySelector('[data-emote-close], .bt-inspect-close'); if (b) b.click(); });
  const tapMove = async (id, ms) => {
    await openMoves();
    await P.page.waitForTimeout(400);
    await P.page.evaluate(() => window.__btCues.reset());
    const at = await fingerTap(`[data-emote-move="${id}"]`);
    await P.page.waitForTimeout(ms);
    const log = await P.page.evaluate(() => window.__btCues.stats.log.map((c) => ({ name: c.name, played: c.played, at: c.at })));
    return { at, cues: log };
  };
  /* on the square, clear of the townsfolk (Lil Bro copies whoever is near) */
  const npcAt = (name) => P.page.evaluate((nm) => { const n = (window._gameState.current.npcs || []).find((q) => q.name === nm); return n ? { x: n.x, y: n.y } : null; }, name);
  const lil = await npcAt('Lil Bro');
  if (lil) await H.hopTo(P, lil.x + 700, lil.y + 60);
  await P.page.waitForTimeout(800);
  const laugh = await tapMove('laugh', 900);
  rec.ok(`7a. the Laugh: its pop and the laugh (${laugh.cues.map((c) => c.name).join('+') || 'nothing'})`,
    !laugh.at.err && laugh.cues.some((c) => c.name === 'laugh' && c.played), laugh);
  await closeMoves();
  await P.page.waitForTimeout(1300);   /* the emotes' one-a-second */
  const snoreEvery = 3600;   /* game/moveSounds.js SNORE_EVERY_MS */
  const sleep = await tapMove('sleep', snoreEvery + 1400);
  const snores = sleep.cues.filter((c) => c.name === 'snore' && c.played);
  rec.ok(`7b. Sleep: a snore as you lie down, and another while you lie there (${snores.length} in ${((snoreEvery + 1400) / 1000).toFixed(1)} s)`,
    !sleep.at.err && snores.length >= 2, sleep);
  await closeMoves();
  await H.hopTo(P, (lil ? lil.x + 700 : 0) + 40, (lil ? lil.y + 60 : 0));   /* a step: up again */
  await P.page.waitForTimeout(1300);
  const deck0 = await P.page.evaluate(() => (window.__btMusicDeck ? window.__btMusicDeck() : null));
  await tapMove('bounce', 300);
  await closeMoves();
  const dancing = await H.waitFor(P, () => {
    const A = window.BT_AUDIO, d = window.__btMusicDeck ? window.__btMusicDeck() : null;
    return { want: !!A._danceWant, cur: d && d.cur ? d.cur.kind : null, url: d && d.cur ? d.cur.url : null, pose: window._gameState.current._pose ? window._gameState.current._pose.id : null };
  }, (v) => v.want && v.cur === 'dance', { timeout: 6000, label: 'the beat' }).catch(() => null);
  rec.ok(`8a. a dance takes the music deck for its beat (${dancing ? dancing.cur + ' ' + dancing.url : 'no'}; before: ${deck0 && deck0.cur ? deck0.cur.kind : 'none'})`,
    !!dancing && /dance-beat\.mp3/.test(dancing.url || ''), { dancing, deck0 });
  await H.hopTo(P, (lil ? lil.x + 700 : 0) + 120, (lil ? lil.y + 60 : 0));   /* step off */
  const after = await H.waitFor(P, () => {
    const A = window.BT_AUDIO, d = window.__btMusicDeck ? window.__btMusicDeck() : null;
    return { want: !!A._danceWant, cur: d && d.cur ? d.cur.kind : null, pending: d ? d.pending || null : null };
  }, (v) => !v.want && v.cur !== 'dance', { timeout: 6000, label: 'the land music back' }).catch(() => null);
  rec.ok(`8b. ...and gives it back when you step off (${after ? after.cur : 'still dancing'})`, !!after, after);

  /* ── 9. the townsfolk's voices ── */
  const ace = await npcAt('Ace');
  let tapped = null, aceVoice = [];
  if (ace) {
    await H.hopTo(P, ace.x + 36, ace.y + 30);
    await P.page.waitForTimeout(900);
    /* where he is on the screen once the camera has settled (mp-moresounds' way) */
    const screenOf = (wx, wy) => P.page.evaluate(({ wx, wy }) => {
      const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
      return { x: r.left + (wx - S.camera.x) * (S._worldScaleX || 1), y: r.top + (wy - S.camera.y) * (S._worldScaleY || 1) };
    }, { wx, wy });
    let scr = null;
    for (let i = 0; i < 25; i++) {
      const n = await npcAt('Ace');
      const cur = n ? await screenOf(n.x, n.y - 26) : null;
      if (cur && scr && Math.abs(cur.x - scr.x) < 1.5 && Math.abs(cur.y - scr.y) < 1.5) break;
      scr = cur;
      await P.page.waitForTimeout(120);
    }
    await P.page.evaluate(() => { window.__btCues.reset(); window.__btNpcVoices.reset(); });
    const t0 = await P.page.evaluate(() => Date.now());
    if (scr) await P.page.touchscreen.tap(scr.x, scr.y);
    await P.page.waitForTimeout(700);
    tapped = await P.page.evaluate((t0) => { const r = window.__btNpcTap; return r && r.ts >= t0 - 50 ? r : null; }, t0);
    aceVoice = await P.page.evaluate(() => window.__btCues.stats.log.filter((c) => /^npcVoice\d$/.test(c.name)).map((c) => ({ name: c.name, k: c.k, played: c.played })));
    await P.page.evaluate(() => { const b = document.querySelector('[aria-label^="Close"], .bt-inspect-close'); if (b) b.click(); });
  }
  const aceOf = await P.page.evaluate(() => window.__btNpcVoices.voiceOf('Ace'));
  rec.ok(`9a. a tap on Ace (${tapped ? tapped.result : 'no tap'}): his own hum (${aceVoice.map((c) => c.name).join('+') || 'nothing'}; his is npcVoice${aceOf[0]})`,
    !!tapped && tapped.result === 'flip' && aceVoice.length === 1 && aceVoice[0].played && aceVoice[0].name === 'npcVoice' + aceOf[0], { tapped, aceVoice, aceOf });
  await P.page.waitForTimeout(800);   /* past a talk's own gap */
  /* v2.3.3664: a line popping up over a townsperson is QUIET now -- the owner:
     the hums "should play when you begin talking to someone or taking a
     quest" (game/npcVoices.js); in town one came every few seconds */
  const chatter = await P.page.evaluate(async () => {
    const S = window._gameState.current, V = window.__btNpcVoices;
    window.__btCues.reset();
    const n0 = V.st.speaks;
    for (const n of S.npcs || []) n.chatTimer = 0;   /* every townsperson says a line now */
    await new Promise((r) => setTimeout(r, 1500));
    const lines = (S.npcs || []).filter((n) => n.chatBubble && Date.now() - n.chatBubble.ts < 2000).length;
    const hums = window.__btCues.stats.log.filter((c) => /^npcVoice\d$|^lilBroHmm$/.test(c.name)).length;
    return { lines, hums, speaks: V.st.speaks - n0 };
  });
  rec.ok(`9b. the townsfolk's lines pop up with no hum (${chatter.lines} lines popped up; ${chatter.hums} hums)`,
    chatter.lines >= 1 && chatter.hums === 0 && chatter.speaks === 0, chatter);

  /* ── 10. the beds ── */
  const beds = () => P.page.evaluate(() => window.__btBeds.state());
  const T = (await G.map()).hub.town;   /* BroTown's middle, as the game's map has it */
  await H.hopTo(P, T.x + 60, T.y + 120);
  const inTown = await H.waitFor(P, () => window.__btBeds.state(), (v) => v.crowd.playing && v.crowd.k > 0.9, { timeout: 8000, label: 'the crowd' }).catch(() => null);
  rec.ok(`10a. in BroTown's square the crowd murmurs (k ${inTown ? inTown.crowd.k : '-'}, ${inTown ? inTown.crowdD : '-'} px from its middle)`, !!inTown, inTown || (await beds()));
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._campfire = { x: S.player.x + 60, y: S.player.y + 10, nodeType: 'campfire', alive: true, zone: S.currentZone, litAt: Date.now(), expiresAt: Date.now() + 20000, name: 'Campfire' };
  });
  const byFire = await H.waitFor(P, () => window.__btBeds.state(), (v) => v.fire.playing && v.fire.k > 0.5, { timeout: 6000, label: 'the crackle' }).catch(() => null);
  rec.ok(`10b. a campfire beside you crackles (k ${byFire ? byFire.fire.k : '-'}, ${byFire ? byFire.fireD : '-'} px)`, !!byFire, byFire || (await beds()));
  await P.page.evaluate(() => { window._gameState.current._campfire = null; });
  const sh = shore();
  let onShore = null;
  if (sh) {
    await H.hopTo(P, sh.x, sh.y, { step: 110 });
    onShore = await H.waitFor(P, () => window.__btBeds.state(), (v) => v.sea.playing && v.sea.k > 0.3, { timeout: 10000, label: 'the surf' }).catch(() => null);
  }
  const outOfTown = await beds();
  rec.ok(`10c. on the shore (${sh ? sh.r + ' px out, the sea at ' + sh.sea : 'none found'}) the surf (k ${onShore ? onShore.sea.k : '-'}, ${onShore ? onShore.seaD : '-'} px to it), and out of town no crowd (k ${outOfTown.crowd.k})`,
    !!sh && !!onShore && outOfTown.crowd.k === 0, { sh, onShore, outOfTown });
  /* the crowd's loop, quiet since the commons: stopped, then let go */
  const freed = await H.waitFor(P, () => window.__btBeds.state(), (v) => !v.crowd.playing && !v.crowd.held && !v.fire.held, { timeout: 26000, label: 'let go' }).catch(() => null);
  rec.ok('10d. a bed you left is stopped, and its loop let go (the crowd\'s, the fire\'s)', !!freed, freed || (await beds()));

  /* ── 11. the Flame Fields' air ── */
  /* mp-landmusic's spot: past the safe ground, short of the monsters */
  const [ax, ay] = WHEEL_SPAWNS.ember.anchor;
  const d = Math.hypot(ax - G.cx, ay - G.cy);
  const fx = Math.round(G.cx + ((ax - G.cx) / d) * 3150), fy = Math.round(G.cy + ((ay - G.cy) / d) * 3150);
  await H.hopTo(P, fx, fy, { step: 110 });
  const lava = await H.waitFor(P, () => {
    const A = window.BT_AUDIO, k = A._zoneAmbientKey, b = k && A._samples[k];
    const l = k && A._sfxLoops && A._sfxLoops[k];
    /* the loop's edges as the game found them (two copied edges), against the
       whole buffer read here (getChannelData: this page's memory is not measured) */
    let ref = null;
    if (b) {
      const dd = b.getChannelData(0), n = dd.length, cap = Math.min(8192, n >> 2);
      let a = 0, e = n;
      while (a < cap && dd[a] === 0) a++;
      while (e > n - cap && dd[e - 1] === 0) e--;
      ref = { a, b: e };
    }
    return { key: k || null, loop: !!l, rate: b ? b.sampleRate : 0, ch: b ? b.numberOfChannels : 0, land: A._currentZoneAmbient || null,
      edges: b && b._btEdges ? { a: b._btEdges.a, b: b._btEdges.b } : null, ref, len: b ? b.length : 0,
      loopStart: l ? l.src.loopStart : null, loopEnd: l ? l.src.loopEnd : null };
  }, (v) => v.key === 'zoneamb-ember' && v.loop && v.rate > 0, { timeout: 15000, label: 'the lava' }).catch(() => null);
  rec.ok(`11. in the Flame Fields its air is the lava (${lava ? lava.key : 'none'}), a loop, decoded at ${lava ? lava.rate : '-'} Hz, mono, over its edges (${lava && lava.edges ? lava.edges.a + '..' + lava.edges.b + ' of ' + lava.len : 'none'}; the whole buffer read: ${lava && lava.ref ? lava.ref.a + '..' + lava.ref.b : '-'})`,
    !!lava && lava.rate === 24000 && lava.ch === 1 && !!lava.edges && !!lava.ref && lava.edges.a === lava.ref.a && lava.edges.b === lava.ref.b, lava);

  /* ── 12. points spent: the owner's level-up chime, once a batch ── */
  await H.devOp(wsPort, 'kit', myId, { what: 'levels' });   /* points to spend */
  const p3Of = () => P.page.evaluate(() => {
    const p3 = window._gameState.current.rpg.prog3 || {};
    return { hp: (p3.alloc && p3.alloc.hp) || 0, pool: p3.pool || 0, shared: p3.shared || 0, poolBy: p3.poolBy || null };
  });
  await H.waitFor(P, () => { const p3 = window._gameState.current.rpg.prog3 || {}; return (p3.pool || 0) + (p3.shared || 0); }, (v) => v >= 3, { timeout: 10000, label: 'points' }).catch(() => null);
  const before = await p3Of();
  const spent = await cues(async () => {
    const S = window._gameState.current;
    /* the Points window's Spend: n spends sent back to back (HeroExpanded run) */
    for (let i = 0; i < 3; i++) S.channel.send({ type: 'prog3_allocate', payload: { stat: 'hp', cat: 'sword' } });
    const hp0 = (S.rpg.prog3.alloc && S.rpg.prog3.alloc.hp) || 0;
    for (let i = 0; i < 40 && (((S.rpg.prog3.alloc && S.rpg.prog3.alloc.hp) || 0) < hp0 + 3); i++) await new Promise((r) => setTimeout(r, 150));
    await new Promise((r) => setTimeout(r, 600));
    return (S.rpg.prog3.alloc && S.rpg.prog3.alloc.hp) || 0;
  });
  const chimes = named(spent, 'pointsSpent');
  rec.ok(`12. three points spent at once (hp ${before.hp} -> ${spent.out}; ${before.pool + before.shared} to spend): the owner's level-up chime once (${chimes.length})`,
    spent.out === before.hp + 3 && chimes.length === 1, { before, spent });
  const noSpend = await cues(async () => { await new Promise((r) => setTimeout(r, 300)); return true; });
  rec.ok('12b. ...and nothing without a spend', named(noSpend, 'pointsSpent').length === 0, noSpend);

  rec.ok('13. no page errors', errs.length === 0, errs.slice(0, 4));
  await done();
}
