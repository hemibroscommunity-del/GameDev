/* ═══ v2.3.3279: THE OWNER'S SMALL ICONS, IN THE GAME (data/smallIcons.js) ═══
 *
 * The owner, 2026-10-16: "Here's the art assets for the 'small icons'" -- four
 * sheets cut by tools/ui/cut-small-icons.py.  The ability buttons and the right
 * stick's pictures are read by mp-btnskin and mp-tapact; this reads the rest,
 * on a real page in the Wheel's BroTown with a bare socket for a friend, in a
 * room of its own (`smallicons`):
 *   1. the townsfolk: each wears the talk bubble over his head, or his quest
 *      badge, never both, the bubble a real picture (it was an 8 px ★);
 *   2. a party: the friend's plate wears the party badge (a picture, the name
 *      no longer starting with 🎉), and the party window its header and
 *      leader marks as pictures (they were 🎟️ and 👑);
 *   3. a threat skull over the friend: the owner's skull, not the 💀 emoji;
 *   4. the chat: the friend's party line, area line and whisper each show
 *      their lane's picture in the feed, the name after it without 🛡/📍/✉;
 *   5. the friend leaves for another zone: the party window's elsewhere mark
 *      is a picture (it was 📍);
 *   6. every buff badge on the HUD is the owner's picture, decoded (they were
 *      🔮 🩸 ⚔️ 💠 💚 🛡️ 🥧 💨);
 *   7. "Defense Lv N" wears the owner's shield (it wore 🛡️);
 *   8. no page errors.
 * Pictures of each in tools/qa/mp/out/smallicons-*.png.
 *
 *   node tools/qa/mp/run.mjs smallicons
 */
import { join } from 'node:path';
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const ROOM = 'smallicons';

function sock(wsPort, name) {
  const w = { x: 0, y: 0, z: 'town', ws: null, synced: false, got: [] };
  w.id = 'si' + name.toLowerCase() + Math.random().toString(36).slice(2, 10);
  w.open = () => new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?room=${ROOM}&rf=1`);
    w.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id: w.id, name, protocolVersion: 2, pres: 2, httpAuth: true,
      data: { x: 1000, y: 1000, d: 'down', z: 'town', name, hr: 'long', bt: '#22aaff' } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (ev.data.indexOf('"party_') >= 0) { try { w.got.push(JSON.parse(ev.data)); } catch {} }
      if (!w.synced && ev.data.startsWith('{"type":"state_sync"')) { w.synced = true; resolve(); }
    };
    ws.onerror = () => reject(new Error(name + ' socket error'));
  });
  w.send = (m) => w.ws.send(JSON.stringify(m));
  w.move = (x, y, z = 'wheel') => {
    w.x = x; w.y = y; w.z = z;
    w.send({ type: 'move', x, y, d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z, vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false });
  };
  w.place = async (x, y) => { w.move(w.x, w.y, 'town'); await new Promise((r) => setTimeout(r, 300)); w.move(x, y, 'wheel'); };
  w.close = () => { try { w.ws.close(); } catch {} };
  return w;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  const shot = (P, name, clip) => P.page.screenshot({ path: join(OUT, `smallicons-${name}.png`), clip }).catch(() => {});
  /* the world-chat feed opens folded to its bell (WorldChatFeed's SHUT_KEY) --
     open, so its lines are drawn */
  const A = await H.newPlayer(browser, { name: 'Smally', wsPort, webPort, world: 'wheel', viewport: VIEW, query: 'room=' + ROOM,
    init: "try{localStorage.setItem('bt_worldchat_shut','0')}catch(e){}" });
  await H.enterWorld(A);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(A, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await A.page.waitForTimeout(500);
  }
  let stopAlive = false;
  (async () => { while (!stopAlive) { await A.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {}); } })();
  await A.page.waitForTimeout(2500);
  const until = async (fn, ms, gap = 150) => {
    const t0 = Date.now();
    for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await A.page.waitForTimeout(gap); }
  };
  const me = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y, id: S.myId, name: S.myName }));

  /* ── 1. the townsfolk ── */
  const npcs = await until(() => A.page.evaluate(() => {
    const m = window.__btNpcMarks; const v = m ? Object.values(m) : [];
    return v.length >= 3 && v.some((n) => n.talk) ? v : null;
  }), 10000);
  const both = (npcs || []).filter((n) => n.talk && n.quest);
  const bare = (npcs || []).filter((n) => !n.talk && !n.quest);
  const talkers = (npcs || []).filter((n) => n.talk);
  rec.ok(`the townsfolk: ${talkers.length} of ${(npcs || []).length} wear the talk bubble (a picture, ${talkers[0] ? talkers[0].talkW : '?'} px), the rest a quest badge, never both`,
    !!npcs && talkers.length > 0 && talkers.every((n) => n.talkArt && n.talkW >= 24) && both.length === 0 && bare.length === 0, npcs);
  await shot(A, 'npcs');

  /* ── 2. a party ── */
  const F = sock(wsPort, 'Pal');
  await F.open();
  await F.place(me.x + 140, me.y + 10);
  let alive = true;
  (async () => { while (alive) { await new Promise((r) => setTimeout(r, 4000)); if (!alive) break; try { F.move(F.x, F.y, F.z); } catch {} } })();
  await A.page.evaluate((id) => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: id } }); }, F.id);
  await until(async () => F.got.some((m) => m.type === 'party_invited' || (m.payload && m.payload.from)), 5000);
  F.send({ type: 'party_accept', target: me.id });
  const plate = await until(() => A.page.evaluate((id) => { const b = (window.__btPeerBadge || {})[id]; return b && b.party ? b : null; }, F.id), 8000);
  rec.ok(`the friend's plate wears the party badge (a picture, ${plate ? plate.partyW : '?'} px), the name "${plate ? plate.name : '?'}" without a 🎉`,
    !!plate && plate.partyArt && plate.partyW >= 8 && typeof plate.name === 'string' && plate.name.indexOf('\u{1F389}') < 0, plate);
  const hud = await until(() => A.page.evaluate(() => {
    const pick = (k) => { const i = document.querySelector(`img[data-party-mark="${k}"]`); return i ? { ok: i.complete && i.naturalWidth > 0, src: i.getAttribute('src') } : null; };
    const r = { party: pick('party'), leader: pick('leader'), emoji: /🎟|👑/.test(document.body.innerText) };
    return r.party && r.leader ? r : null;
  }), 6000);
  rec.ok('the party window: its header and the leader\'s mark are pictures (no 🎟️ or 👑 left)',
    !!hud && hud.party.ok && hud.leader.ok && !hud.emoji, hud);
  await shot(A, 'party');

  /* ── 3. a threat skull ── */
  await A.page.evaluate((id) => { const S = window._gameState.current; S._threatMarks = S._threatMarks || {}; S._threatMarks[id] = { type: 'red', until: Date.now() + 60000 }; }, F.id);
  const skull = await until(() => A.page.evaluate((id) => { const b = (window.__btPeerBadge || {})[id]; return b && b.skull ? b : null; }, F.id), 5000);
  rec.ok('a threat skull over the friend is the owner\'s skull, a picture (it was the 💀 emoji)', !!skull && skull.skullArt, skull);
  await shot(A, 'skull');
  await A.page.evaluate((id) => { const S = window._gameState.current; delete S._threatMarks[id]; }, F.id);

  /* ── 4. the chat's lanes ── */
  F.send({ type: 'party_chat', text: 'party hello' });
  F.send({ type: 'area_chat', text: 'area hello' });
  F.send({ type: 'whisper', to: me.name, text: 'psst' });
  const lanes = await until(() => A.page.evaluate(() => {
    const out = {};
    for (const k of ['party', 'area', 'whisper']) {
      const i = document.querySelector(`img[data-chat-lane="${k}"]`);
      if (!i) return null;
      out[k] = { ok: i.complete && i.naturalWidth > 0, line: (i.parentElement && i.parentElement.parentElement && i.parentElement.parentElement.innerText) || '' };
    }
    return Object.values(out).every((l) => l.ok) ? out : null;
  }), 8000);
  const chatLog = lanes ? null : await A.page.evaluate(() => (window._gameState.current.chatLog || []).slice(-8).map((m) => ({ name: m.name, text: m.text })));
  const noMarks = !!lanes && Object.values(lanes).every((l) => !/[\u{1F6E1}\u{1F4CD}✉]/u.test(l.line));
  rec.ok('the chat: the friend\'s party line, area line and whisper each show their lane\'s picture, and no 🛡 📍 ✉ in the names',
    !!lanes && lanes.party.ok && lanes.area.ok && lanes.whisper.ok && noMarks, lanes || { chatLog });
  await shot(A, 'chat');

  /* ── 5. the friend elsewhere ── */
  F.move(F.x, F.y, 'town');
  const away = await until(() => A.page.evaluate(() => { const i = document.querySelector('img[data-party-mark="elsewhere"]'); return i && i.complete && i.naturalWidth > 0 ? { ok: true, text: i.parentElement ? i.parentElement.innerText : '', emoji: /📍/.test(document.body.innerText) } : null; }), 8000);
  rec.ok(`the friend in another zone: the party window's elsewhere mark is a picture ("${away ? away.text.trim() : '?'}", no 📍)`, !!away && away.ok && !away.emoji, away);

  /* ── 6. the buff badges ── */
  await A.page.evaluate(() => {
    const S = window._gameState.current, t = Date.now() + 120000;
    Object.assign(S, { _cursedUntil: t, _bleedUntil: t, _dmgBuff: t, _dmgBuffMul: 1.2, _manaBuff: t, _regenBuff: t, _resistBuff: t,
      _xpBuff: t, _xpBuffMul: 1.1, _spdBuff: t, _spdBuffMul: 1.15 });
  });
  const buffs = await until(() => A.page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img[data-buff-chip]')];
    const r = imgs.map((i) => ({ k: i.getAttribute('data-buff-chip'), ok: i.complete && i.naturalWidth > 0 }));
    return r.length >= 8 && r.every((b) => b.ok) ? r : null;
  }), 6000);
  rec.ok(`the HUD's buff badges: ${buffs ? buffs.length : 0} pictures, all decoded (they were emoji)`,
    !!buffs && buffs.length === 8 && buffs.every((b) => b.ok), buffs);
  await shot(A, 'buffs');
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    for (const k of ['_cursedUntil', '_bleedUntil', '_dmgBuff', '_manaBuff', '_regenBuff', '_resistBuff', '_xpBuff', '_spdBuff']) S[k] = 0;
  });

  /* ── 7. "Defense Lv N" ── */
  await A.page.evaluate(() => {
    const S = window._gameState.current, P = S.player;
    S.dmgNumbers.push({ x: P.x, y: P.y - 34, text: 'Defense Lv 7', color: '#60a5fa', ts: Date.now() + 2, iconKey: 'defense', iconLead: true });
  });
  const def = await until(() => A.page.evaluate(() => ((window.__btPopupIconsDrawn || {}).defense || 0) > 0), 4000);
  rec.ok('"Defense Lv N" is drawn with the owner\'s shield in front (it wore 🛡️)', !!def, def);
  await A.page.waitForTimeout(250);
  await shot(A, 'defense');

  alive = false; F.close();
  stopAlive = true;
  const errs = A.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await A.ctx.close().catch(() => {});
}
