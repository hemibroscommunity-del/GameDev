/* ═══ v2.3.3404: THE SECOND ROUND OF SOUNDS, HEARD ON A PHONE ═══
 *
 * The owner, 2026-10-18, after the first round (mp-soundcues): "Look for more
 * too".  These moments still called collect() or beep(), both silent since
 * v2.3.1103, or nothing; each now plays a cue made from recordings already in
 * the game (data/eventSounds.js; the table and every call site are held by
 * server/test/sound-cues.test.mjs §9).  This plays them through the game's
 * own handlers -- window.__btDispatch for the room's events, window.__btWsEvent
 * for whole socket messages -- on a page in the Wheel's BroTown:
 *
 *   0. the sound is up and the new cues' samples were decoded on the loading
 *      screen;
 *   1. the Gambling Den: the dice won and lost, coins into the weekly pot, the
 *      pot drawn for you -- and nothing when it is someone else's;
 *   2. the arena: a stake put down, paid, lost;
 *   3. a guild's quest turned in: the turn-in chime;
 *   4. a duel challenge and a trade invite (a second challenge at once held
 *      back by its gap);
 *   5. an alliance war won and lost (a draw in words only);
 *   6. pets: a Gobling taken out (the pop, then the goblin's own voice, small),
 *      put away, a Pebbling taken out (the pop, no voice of its own yet),
 *      released;
 *   7. the farm: a crop pulled from its bed;
 *   8. the forge: near the Blacksmith's door its anvil strikes, by distance;
 *      across the town it does not;
 * and the third look (the owner: "Good look for more"), with a finger on a
 * phone and a friend beside you (a bare socket speaking the game's protocol):
 *   9. your moves, tapped on the picker: a facepalm's pop and slap, a sit's
 *      bump -- and the menu click standing down for them (a tile is a button);
 *  10. Lil Bro copying your wave: your pop, then his, softer;
 *  11. the friend's cheer (a moment: its pops) and sit (a held pose, read off
 *      the tick: its bump), each at about half your own level;
 *  12. menus opened by a tap on the world click as every menu does: Ace's coin
 *      flip, and your own bro's chat box;
 *  13. no page errors.
 *
 *   node tools/qa/mp/run.mjs moresounds
 */
import * as H from './harness.mjs';

/* v2.3.3404: a phone with a finger -- the third look taps the world */
const VIEW = { width: 390, height: 844 };
const SPEED = 165;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* the friend: a bare socket speaking the game's protocol (mp-soundcues') */
function friend(wsPort) {
  const w = { x: 0, y: 0, ws: null, synced: false };
  w.id = 'msfriend' + Math.random().toString(36).slice(2, 10);
  w.open = () => new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?rf=1`);
    w.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id: w.id, name: 'Friend', protocolVersion: 2, httpAuth: true, ws: [1, 5],
      data: { x: 1000, y: 1000, d: 'down', z: 'town', name: 'Friend' } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (!w.synced && ev.data.startsWith('{"type":"state_sync"')) { w.synced = true; resolve(); }
    };
    ws.onerror = () => reject(new Error('friend socket error'));
  });
  w.move = (x, y, z = 'wheel') => {
    w.x = x; w.y = y;
    w.ws.send(JSON.stringify({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: 'down', f: 'south',
      eqc: 'none', eql: 'none', eqs: 'none', ex: null, z, vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false }));
  };
  w.place = async (x, y) => { w.move(w.x, w.y, 'town'); await sleep(300); w.move(x, y, 'wheel'); };
  w.send = (o) => w.ws.send(JSON.stringify(o));
  w.close = () => { try { w.ws.close(); } catch {} };
  void SPEED;
  return w;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Earful', wsPort, webPort, viewport: VIEW, touch: true, world: 'wheel' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const done = async () => { stopAlive = true; await P.ctx.close().catch(() => {}); };
  const myId = await H.readState(P, (S) => S.myId);
  /* past the Mayor gate, and out of harm's way */
  await H.devOp(wsPort, 'quests', myId);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
  await P.page.waitForTimeout(1500);

  /* ── 0. the sound is up, the new cues' samples decoded ── */
  const NEW = ['farmHarvest', 'betIn', 'betWon', 'betLost', 'jackpotWin', 'guildQuest', 'warWon', 'warLost', 'arenaJoin',
    'petOut', 'petAway', 'petFree', 'rested', 'duelAsk', 'tradeAsk', 'anvil'];
  const audio = await P.page.evaluate(async (NEW) => {
    const A = window.BT_AUDIO, C = window.__btCues;
    if (!A || !C) return { probe: !!C, audio: !!A };
    if (!A.ctx) { try { A.unlock(); } catch (e) { /* reported below */ } }
    if (A.ctx && A.ctx.state !== 'running') { try { await A.ctx.resume(); } catch (e) { /* reported below */ } }
    const keys = C.keys();
    const t0 = Date.now();
    while (Date.now() - t0 < 25000 && !keys.every((k) => A._samples && A._samples[k])) await new Promise((r) => setTimeout(r, 250));
    const names = C.names();
    C.reset();
    const silent = NEW.filter((n) => names.indexOf(n) < 0 || !C.play(n, 0.05));
    return { probe: true, ctx: !!A.ctx, state: A.ctx && A.ctx.state, muted: !!A.muted, missing: keys.filter((k) => !(A._samples && A._samples[k])),
      silent, forge: !!window.__btForge, trap: typeof window.__btTrap === 'function', ws: typeof window.__btWsEvent === 'function', dispatch: typeof window.__btDispatch === 'function' };
  }, NEW);
  rec.ok(`setup: in the Wheel (${zone}), the sound up (${audio.state}), and every one of the ${NEW.length} new cues starts (its samples decoded on the loading screen)`,
    zone === 'wheel' && audio.probe && audio.ctx && !audio.muted && (audio.missing || []).length === 0 && (audio.silent || []).length === 0
    && audio.forge && audio.trap && audio.ws && audio.dispatch, audio);
  if (!audio.ctx || audio.muted) { await done(); return; }

  /* things done on the page, and the cues they played */
  const cues = (fn, arg) => P.page.evaluate(async ({ src, arg }) => {
    const C = window.__btCues;
    C.reset();
    const f = new Function('arg', 'return (' + src + ')(arg)');
    const out = await f(arg);
    return { out, cues: C.stats.log.map((c) => ({ name: c.name, k: Math.round(c.k * 1000) / 1000, played: c.played })) };
  }, { src: fn.toString(), arg });
  const names = (r) => r.cues.map((c) => c.name).join('+') || 'nothing';
  /* a card over the screen (a duel challenge, a trade invite, Ace's flip):
     its Decline or close button, else its scrim -- a click on the element,
     not a finger, so no menu click of its own */
  const closeCards = async () => {
    for (let i = 0; i < 8; i++) {
      const did = await P.page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.bt-inspect'));
        if (!cards.length) return false;
        for (const c of cards) {
          const b = Array.from(c.querySelectorAll('button')).find((q) => /^(decline|close|no|ignore|not now)$/i.test((q.textContent || '').trim())
            || /^close/i.test(q.getAttribute('aria-label') || '') || q.classList.contains('bt-inspect-close'));
          if (b) { b.click(); return true; }
        }
        cards[0].click();
        return true;
      });
      if (!did) return true;
      await P.page.waitForTimeout(300);
    }
    return false;
  };
  const only = (r, ...want) => r.cues.length === want.length && want.every((n, i) => r.cues[i].name === n && r.cues[i].played);
  const ev = (type, payload) => cues((a) => { window.__btDispatch({ type: a.type, payload: a.payload }); return true; }, { type, payload });
  const ws = (type, payload) => cues((a) => window.__btWsEvent({ type: a.type, payload: a.payload }), { type, payload });

  /* ── 1. the Gambling Den ── */
  const diceWon = await ev('gamble_result', { won: true, wager: 100, payout: 200 });
  const diceLost = await ev('gamble_result', { won: false, wager: 100 });
  rec.ok(`1a. the dice: won (${names(diceWon)}), lost (${names(diceLost)})`, only(diceWon, 'betWon') && only(diceLost, 'betLost'), { diceWon, diceLost });
  const potIn = await ev('jackpot_state', { pool: 900, yourTickets: 2, deposited: 100 });
  const potMine = await ev('jackpot_result', { period: 'qa', amount: 900, winnerId: myId, winnerName: 'Earful' });
  const potTheirs = await ev('jackpot_result', { period: 'qa', amount: 900, winnerId: 'bp_someoneelse', winnerName: 'Someone' });
  rec.ok(`1b. the weekly pot: coins in (${names(potIn)}), drawn for you (${names(potMine)}), drawn for someone else (${names(potTheirs)})`,
    only(potIn, 'betIn') && only(potMine, 'jackpotWin') && potTheirs.cues.length === 0, { potIn, potMine, potTheirs });

  /* ── 2. the arena's stakes ── */
  const stIn = await ev('arena_stake_placed', { amount: 50, targetName: 'Bob' });
  const stWon = await ev('arena_stake_result', { won: true, payout: 150, amount: 50 });
  const stLost = await ev('arena_stake_result', { won: false, amount: 50 });
  rec.ok(`2. a stake on a gladiator: put down (${names(stIn)}), paid (${names(stWon)}), lost (${names(stLost)})`,
    only(stIn, 'betIn') && only(stWon, 'betWon') && only(stLost, 'betLost'), { stIn, stWon, stLost });

  /* ── 3. a guild's quest ── */
  const gq = await ev('guild_quest_result', { skill: 'mining', index: 0, gold: 100, ap: 5 });
  rec.ok(`3. a guild's quest turned in: the turn-in chime (${names(gq)})`, only(gq, 'guildQuest'), gq);

  /* ── 4. invites ── */
  const duel = await cues((a) => {
    window.__btDispatch({ type: 'duel_request', payload: { target: a.me, from: 'bp_qaduel', fromName: 'Duelist' } });
    window.__btDispatch({ type: 'duel_request', payload: { target: a.me, from: 'bp_qaduel', fromName: 'Duelist' } });
    return window.__btCues.stats.gapped;
  }, { me: myId });
  const notMe = await ev('duel_request', { target: 'bp_someoneelse', from: 'bp_qaduel', fromName: 'Duelist' });
  const trade = await ev('trade2_invite', { from: 'bp_qatrade', fromName: 'Trader' });
  await closeCards();   /* the challenge's and the invite's cards, answered */
  rec.ok(`4. a duel challenge (${names(duel)}, a second at once held back: ${duel.out > 0}), one meant for someone else (${names(notMe)}), a trade invite (${names(trade)})`,
    only(duel, 'duelAsk') && duel.out > 0 && notMe.cues.length === 0 && only(trade, 'tradeAsk'), { duel, notMe, trade });

  /* ── 5. an alliance war's end ── */
  const warW = await ws('alliance_war_end', { won: true, us: 3, them: 1, vs: 'QAZ', paid: 500 });
  const warL = await ws('alliance_war_end', { won: false, us: 1, them: 3, vs: 'QAZ', paid: 0 });
  const warD = await ws('alliance_war_end', { won: null, us: 0, them: 0, vs: 'QAZ', paid: 0 });
  rec.ok(`5. an alliance war: won (${names(warW)}), lost (${names(warL)}), drawn (${names(warD)}: words only)`,
    only(warW, 'warWon') && only(warL, 'warLost') && warD.cues.length === 0, { warW, warL, warD });

  /* ── 6. pets ── */
  const book0 = await H.readState(P, (S) => (S._petBook ? JSON.parse(JSON.stringify(S._petBook)) : null));
  const pets = [{ id: 'qa-gob', kind: 'gobling', name: 'Gob', lv: 1, xp: 0 }, { id: 'qa-peb', kind: 'pebbling', name: 'Peb', lv: 1, xp: 0 }];
  const book = (active, op, list) => ({ v: 1, cap: 10, active, list: list || pets, journal: {}, op });
  const gobOut = await ws('pets_state', book('qa-gob', 'active'));
  const gobVoice = await P.page.evaluate(() => window.__btTrap().petVoice);
  await P.page.waitForTimeout(350);   /* past petOut's gap */
  const away = await ws('pets_state', book(null, 'active'));
  await P.page.waitForTimeout(350);
  const pebOut = await ws('pets_state', book('qa-peb', 'active'));
  const pebVoice = await P.page.evaluate(() => window.__btTrap().petVoice);
  const freed = await ws('pets_state', book(null, 'release', [pets[0]]));
  rec.ok(`6a. a Gobling taken out: the pop (${names(gobOut)}), then the goblin's own voice, small (${gobVoice})`, only(gobOut, 'petOut') && gobVoice === 'goblin-rawr', { gobOut, gobVoice });
  rec.ok(`6b. put away (${names(away)}); a Pebbling out (${names(pebOut)}, its own voice: ${pebVoice}); one released (${names(freed)})`,
    only(away, 'petAway') && only(pebOut, 'petOut') && pebVoice === 'none' && only(freed, 'petFree'), { away, pebOut, pebVoice, freed });
  /* the page's own pets back as they were */
  if (book0 && !book0.unavailable) await P.page.evaluate((b) => window.__btWsEvent({ type: 'pets_state', payload: Object.assign({}, b, { op: undefined }) }), book0);

  /* ── 7. the farm ── */
  const crop = await ws('farm_state', { plots: [], now: Date.now(), did: { op: 'harvest', n: 1, items: { crop_carrot: 1 } } });
  rec.ok(`7. a crop pulled from its bed: the soil and a pop (${names(crop)})`, only(crop, 'farmHarvest'), crop);

  /* ── 8. the forge ── */
  let doors = [];
  for (let i = 0; i < 40 && !doors.some((d) => d.id === 'blacksmith'); i++) {
    doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
    if (!doors.some((d) => d.id === 'blacksmith')) await P.page.waitForTimeout(500);
  }
  const forge = doors.find((d) => d.id === 'blacksmith');
  rec.ok(`8. setup: the forge's door is known (${forge ? Math.round(forge.x) + ',' + Math.round(forge.y) : 'none'})`, !!forge, doors.map((d) => d.id));
  if (forge) {
    const R = await P.page.evaluate(() => window.__btForge.consts.ANVIL_R);
    /* in front of its steps */
    await H.hopTo(P, forge.x, forge.y + 70);
    const near = await cues(async () => {
      const F = window.__btForge;
      const n0 = F.st.played;
      F.soon();
      const t0 = Date.now();
      while (Date.now() - t0 < 4000 && F.st.played === n0) await new Promise((r) => setTimeout(r, 100));
      return { last: F.st.last, played: F.st.played - n0 };
    });
    const anvil = near.cues.filter((c) => c.name === 'anvil');
    rec.ok(`8a. at the forge's door its anvil strikes (${anvil.length ? 'share ' + anvil[0].k : 'nothing'}, ${near.out.last && near.out.last.d} px from it)`,
      anvil.length === 1 && anvil[0].played && anvil[0].k > 0.3 && anvil[0].k <= 0.6, near);
    /* across the town: past its reach */
    await H.hopTo(P, forge.x, forge.y + R + 400);
    const far = await cues(async () => {
      const F = window.__btForge;
      const n0 = F.st.played;
      F.soon();
      await new Promise((r) => setTimeout(r, 2500));
      return { played: F.st.played - n0 };
    });
    rec.ok(`8b. ${R + 400} px away it is not heard (${names(far)})`, far.out.played === 0 && far.cues.length === 0, far);
  }

  /* ═══ the third look ═══ */
  const NEW3 = ['emotePop', 'slap', 'sitDown', 'flop', 'flexShine', 'cheerPop', 'bagIn'];
  const started3 = await P.page.evaluate((N) => { const C = window.__btCues; C.reset(); return N.filter((n) => !C.play(n, 0.05)); }, NEW3);
  rec.ok(`9. setup: the third look's ${NEW3.length} cues start (${started3.join(', ') || 'all'})`, started3.length === 0, started3);
  /* a townsperson's place, and a world point on the screen */
  const npcAt = (name) => P.page.evaluate((nm) => { const n = (window._gameState.current.npcs || []).find((q) => q.name === nm); return n ? { x: n.x, y: n.y } : null; }, name);
  const screenOf = (wx, wy) => P.page.evaluate(({ wx, wy }) => {
    const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
    return { x: r.left + (wx - S.camera.x) * (S._worldScaleX || 1), y: r.top + (wy - S.camera.y) * (S._worldScaleY || 1) };
  }, { wx, wy });
  const clickAt = () => P.page.evaluate(() => (window.BT_AUDIO._uiTickAt && window.BT_AUDIO._uiTickAt['ui-click']) || 0);
  /* the coach's tips and the quest cards lie over the screen and take a tap
     (mp-farm's, mp-ambient's way: hidden, so nothing hit-tests them) */
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  /* a real finger on a picker tile, only if nothing covers it there */
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
  /* a move tapped on the picker, and what was heard in the next `ms` */
  const tapMove = async (id, ms = 900) => {
    await openMoves();
    await P.page.waitForTimeout(400);   /* the Moves tab's own click (a button) has had its turn */
    const c0 = await clickAt();
    await P.page.evaluate(() => window.__btCues.reset());
    const at = await fingerTap(`[data-emote-move="${id}"]`);
    await P.page.waitForTimeout(ms);
    const r = await P.page.evaluate(() => window.__btCues.stats.log.map((c) => ({ name: c.name, k: Math.round(c.k * 1000) / 1000, played: c.played })));
    const c1 = await clickAt();
    return { at, cues: r, clicked: c1 > c0 };
  };
  const heard = (r, name) => r.cues.filter((c) => c.name === name && c.played);

  const cleared = await closeCards();
  rec.ok(`9. setup: nothing lies over the screen (${cleared ? 'clear' : 'a card would not close'})`, cleared, null);
  /* stand on the square, clear of the townsfolk, still (a step ends a pose) */
  const lil = await npcAt('Lil Bro');
  const ace = await npcAt('Ace');
  if (lil) await H.hopTo(P, lil.x + 700, lil.y + 60);
  await P.page.waitForTimeout(800);

  /* ── 9. your moves on the picker ── */
  const palm = await tapMove('facepalm');
  rec.ok(`9a. a facepalm, tapped: its pop and its slap (${palm.cues.map((c) => c.name).join('+') || 'nothing'}), and the tile's menu click stood down (${palm.clicked ? 'it clicked too' : 'it did'})`,
    !!palm.at && !palm.at.err && heard(palm, 'emotePop').length === 1 && heard(palm, 'slap').length === 1 && !palm.clicked, palm);
  await P.page.waitForTimeout(1300);   /* the emotes' one-a-second */
  const sat = await tapMove('sit');
  rec.ok(`9b. sitting down: its bump (${sat.cues.map((c) => c.name).join('+') || 'nothing'})`, heard(sat, 'sitDown').length === 1 && !sat.clicked, sat);
  /* stand up again (a step), and put the picker away */
  await P.page.evaluate(() => { const b = document.querySelector('[data-emote-close], .bt-inspect-close'); if (b) b.click(); });
  await H.hopTo(P, (lil ? lil.x + 700 : 0) + 30, (lil ? lil.y + 60 : 0));
  await P.page.waitForTimeout(1300);

  /* ── 10. Lil Bro copies your wave ── */
  if (lil) {
    await H.hopTo(P, lil.x + 110, lil.y + 40);
    await P.page.waitForTimeout(1000);
    const wave = await tapMove('wave', 1500);
    const pops = heard(wave, 'emotePop');
    rec.ok(`10. Lil Bro copies your wave: your pop (${pops[0] ? pops[0].k : 'none'}), then his, softer (${pops[1] ? pops[1].k : 'none'})`,
      pops.length === 2 && pops[0].k === 1 && pops[1].k > 0 && pops[1].k <= 0.6, wave);
    await P.page.evaluate(() => { const b = document.querySelector('[data-emote-close], .bt-inspect-close'); if (b) b.click(); });
  } else rec.ok('10. Lil Bro is in the town (guard)', false, null);

  /* ── 11. the friend ── */
  const W = friend(wsPort);
  let fr = null;
  try {
    /* away from Lil Bro, who would copy whoever is nearest him */
    if (lil) { await H.hopTo(P, lil.x + 600, lil.y + 60); await P.page.waitForTimeout(800); }
    await W.open();
    const me = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
    await W.place(me.x + 70, me.y);
    for (let i = 0; i < 30; i++) {
      fr = await P.page.evaluate((id) => { const o = window._gameState.current.others[id]; return o ? { x: Math.round(o.x), y: Math.round(o.y), zone: o.zone || o.z } : null; }, W.id);
      if (fr && Math.abs(fr.x - (me.x + 70)) < 30) break;
      await P.page.waitForTimeout(300);
    }
    await P.page.waitForTimeout(1500);   /* known for a moment: a pose begun after it is heard */
    await P.page.evaluate(() => window.__btCues.reset());
    W.send({ type: 'emote', payload: { move: 'cheer' } });
    await P.page.waitForTimeout(1500);
    const cheer = await P.page.evaluate(() => window.__btCues.stats.log.map((c) => ({ name: c.name, k: Math.round(c.k * 1000) / 1000, played: c.played })));
    await P.page.waitForTimeout(1200);
    await P.page.evaluate(() => window.__btCues.reset());
    W.send({ type: 'pose', id: 'sit' });
    let sitPeer = [];
    for (let i = 0; i < 20 && !sitPeer.some((c) => c.name === 'sitDown'); i++) {
      await P.page.waitForTimeout(250);
      sitPeer = await P.page.evaluate(() => window.__btCues.stats.log.map((c) => ({ name: c.name, k: Math.round(c.k * 1000) / 1000, played: c.played })));
    }
    const pk = await P.page.evaluate(() => window.__btCues.consts.PEER_K);
    const ch = cheer.filter((c) => c.name === 'cheerPop'), st = sitPeer.filter((c) => c.name === 'sitDown');
    rec.ok(`11. the friend beside you (${fr ? fr.x + ',' + fr.y : 'not seen'}): their cheer's pops (${ch[0] ? ch[0].k : 'none'}) and their sit's bump (${st[0] ? st[0].k : 'none'}), each at about half your level (PEER_K ${pk})`,
      !!fr && ch.length === 1 && ch[0].k > 0 && ch[0].k <= pk + 0.001 && st.length === 1 && st[0].k > 0 && st[0].k <= pk + 0.001, { fr, cheer, sitPeer });
    W.send({ type: 'pose', id: null });
  } catch (e) {
    rec.ok('11. the friend joined (guard)', false, String(e).slice(0, 200));
  }

  /* ── 12. menus opened by a tap on the world ── */
  if (ace) {
    await H.hopTo(P, ace.x + 36, ace.y + 30);
    await P.page.waitForTimeout(900);
    let a = null;
    for (let i = 0; i < 20; i++) {
      const n = await npcAt('Ace');
      const cur = n ? await screenOf(n.x, n.y - 26) : null;
      if (cur && a && Math.abs(cur.x - a.x) < 1.5 && Math.abs(cur.y - a.y) < 1.5) break;
      a = cur;
      await P.page.waitForTimeout(80);
    }
    const c0 = await clickAt();
    const t0 = await P.page.evaluate(() => Date.now());
    if (a) await P.page.touchscreen.tap(a.x, a.y);
    await P.page.waitForTimeout(900);
    const tap = await P.page.evaluate((t0) => { const r = window.__btNpcTap; return r && r.ts >= t0 - 50 ? r : null; }, t0);
    const c1 = await clickAt();
    rec.ok(`12a. a tap on Ace opens his coin flip with the menu click (${tap ? tap.result : 'no tap'}, ${c1 > c0 ? 'clicked' : 'silent'})`, !!tap && tap.result === 'flip' && c1 > c0, { a, tap });
    await closeCards();
    await P.page.evaluate(() => { const b = document.querySelector('[aria-label^="Close"]'); if (b) b.click(); });
    await P.page.waitForTimeout(600);
  } else rec.ok('12a. Ace is in the town (guard)', false, null);
  /* clear of Ace, whose own circle beats yours for a tap */
  if (ace) { await H.hopTo(P, ace.x + 420, ace.y + 60); await P.page.waitForTimeout(900); }
  const self = await P.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y - 24 }; });
  const sc = await screenOf(self.x, self.y);
  const s0 = await clickAt();
  await P.page.touchscreen.tap(sc.x, sc.y);
  await P.page.waitForTimeout(700);
  const s1 = await clickAt();
  const chatOpen = await H.readState(P, (S) => S._chatBySelfTap || 0);
  rec.ok(`12b. a tap on your own bro opens the chat box with the menu click (${chatOpen ? 'opened' : 'not opened'}, ${s1 > s0 ? 'clicked' : 'silent'})`, chatOpen > 0 && s1 > s0, { sc, chatOpen });

  rec.ok('13. no page errors', errs.length === 0, errs.slice(0, 4));
  W.close();
  await done();
}
