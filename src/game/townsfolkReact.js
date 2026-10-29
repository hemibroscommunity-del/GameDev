/* ═══ v2.3.3394: THE TOWNSFOLK JOIN IN (docs/specs/emote-moves.md) ═══
 *
 * The fun & social plan's Phase 1 (docs/FUN-SOCIAL-PLAN.md), the owner's "Go
 * recommended": "the six townsfolk react in character, with the same motion
 * code".  Once a frame (BroTown's loop, beside updatePeerEmotes) each
 * townsperson looks at the moves this phone can see near him -- yours and the
 * other players' (game/emoteMoves.js: S._emoteMove / S._pose, other.
 * _emoteMove / other._po) -- and answers in character:
 *
 *   Lil Bro         copies the nearest player's move a beat late: their sit,
 *                   their dance for as long as they dance, their wave;
 *   Blacksmith Bro  flexes back at a flex, and says so;
 *   Diego           "No dancing in my store!" at a dancer near his door;
 *   Ace             calls the odds when two or more dance near him;
 *   Mayor Bro       cheers a party: three or more dancing near him.
 *
 * A townsperson's move is `npc._emoteMove` / `npc._po` (+ `npc._poAt`), drawn
 * by rendering/emoteFx.js on his figure as a player's is; his line is his
 * speech bubble (`npc.chatBubble`, effectsRenderer), at most one every
 * LINE_GAP_MS.  This phone's own: the worker knows nothing of it, and each
 * phone answers what it sees.  Only imports emoteMoves.js, so it can be read
 * in node (server/test/townsfolk-react.test.mjs). */
import { EMOTE_MOVES, moveKind } from './emoteMoves.js';

export const REACT = Object.freeze({
  /* a move this close to a townsperson (world px) is one he sees */
  NEAR: 320,
  /* dancers this close to Ace or Mayor Bro count toward a dance-off or party */
  PARTY_R: 520,
  DUEL_AT: 2,
  PARTY_AT: 3,
  /* Lil Bro copies a beat late, and Blacksmith Bro answers a flex after it */
  COPY_LAG_MS: 350,
  ANSWER_LAG_MS: 450,
  /* one line from each townsperson at most this often */
  LINE_GAP_MS: 20000,
});

/* v2.3.3575: the owner's satire pass (docs/specs/npc-dialogue-v2.md) */
export const REACT_LINES = Object.freeze({
  lil: Object.freeze(["Look, I'm doing it too!", 'Clip that! Somebody clip that!', 'Wait, like this?!']),
  smith: Object.freeze(['Nice. Keep eating.', 'Ha! Now go curl an anvil!', "All natural, bro. Ask anyone. Don't ask my doctor."]),
  diego: Object.freeze(['Hey! This is a business!', 'Dance outside, amigo. Outside is free.', "Unless you're buying, stop blocking my door!"]),
  /* v2.3.3395: Halloween week's Zombie Shuffle by his door */
  diegoZombie: Object.freeze(['No zombies in the shop!', "Out! Unless you're selling. Then come in."]),
  ace: Object.freeze(['3 to 1', '2 to 1', '5 to 2', 'even money']),
  mayor: Object.freeze(["Now THAT's a crowd! Somebody get a photo of me in front of it!", "Street party! Nobody told me, but I'll allow it!", 'Look at this town. Happy. Dancing. I take full credit.']),
});

const isDance = (id) => !!(id && Object.prototype.hasOwnProperty.call(EMOTE_MOVES, id) && EMOTE_MOVES[id].dance);
const near = (m, n, r) => {
  const dx = m.x - n.x, dy = m.y - n.y;
  return dx * dx + dy * dy <= r * r;
};

/* the players this phone sees, and what each is doing: you, and the others
   in your zone who are alive */
export function emoteMovers(S) {
  const out = [];
  if (!S) return out;
  const P = S.player;
  if (P && Number.isFinite(P.x) && Number.isFinite(P.y) && !(S.rpg && S.rpg.hp <= 0)) {
    out.push({ id: S.myId || 'self', name: S.myName || 'You', x: P.x, y: P.y,
      once: S._emoteMove || null, hold: S._pose ? S._pose.id : null });
  }
  const others = S.others || {};
  for (const id in others) {
    const o = others[id];
    if (!o || o._isDead || o._away) continue;
    if ((o.zone || o.z || 'town') !== S.currentZone) continue;
    const x = o.renderX != null ? o.renderX : o.x, y = o.renderY != null ? o.renderY : o.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push({ id, name: o.name || 'Bro', x, y, once: o._emoteMove || null, hold: o._po || null });
  }
  return out;
}

/* whether a townsperson may speak again (one line every LINE_GAP_MS) */
const mayTalk = (npc, now) => !(npc._reactLineAt && now - npc._reactLineAt < REACT.LINE_GAP_MS);
/* he says `text`, or the next of his lines in `list` (taken in turn, a line
   only spent when it is said), unless he spoke in the last LINE_GAP_MS */
function say(npc, list, now) {
  if (!mayTalk(npc, now)) return false;
  let text = list;
  if (Array.isArray(list)) {
    const i = npc._reactN || 0;
    npc._reactN = i + 1;
    text = list[i % list.length];
  }
  npc._reactLineAt = now;
  npc._reactSaid = text;   /* his last answer, kept (the bubble goes in 5 s) */
  npc.chatBubble = { text, ts: now };
  return true;
}

function lilBro(npc, ms, now) {
  let best = null, bd = Infinity;
  for (const m of ms) {
    const dx = m.x - npc.x, dy = m.y - npc.y, d = dx * dx + dy * dy;
    if (d <= REACT.NEAR * REACT.NEAR && d < bd) { best = m; bd = d; }
  }
  const hold = best && moveKind(best.hold) === 'hold' ? best.hold : null;
  if (hold) {
    if (npc._po !== hold) {
      npc._po = hold;
      npc._poAt = now + REACT.COPY_LAG_MS;
      say(npc, REACT_LINES.lil, now);
    }
  } else if (npc._po) {
    npc._po = null;
  }
  const once = best && best.once;
  if (once && moveKind(once.id) === 'once' && once.at > (npc._copiedAt || 0)) {
    npc._copiedAt = once.at;
    npc._emoteMove = { id: once.id, at: now + REACT.COPY_LAG_MS };
  }
}

function smith(npc, ms, now) {
  for (const m of ms) {
    const once = m.once;
    if (!once || once.id !== 'flex' || !near(m, npc, REACT.NEAR)) continue;
    if (once.at <= (npc._flexSeenAt || 0)) continue;
    npc._flexSeenAt = once.at;
    npc._emoteMove = { id: 'flex', at: now + REACT.ANSWER_LAG_MS };
    say(npc, REACT_LINES.smith, now);
    return;
  }
}

function diego(npc, ms, now) {
  for (const m of ms) {
    if (isDance(m.hold) && near(m, npc, REACT.NEAR)) { say(npc, m.hold === 'zombie' ? REACT_LINES.diegoZombie : REACT_LINES.diego, now); return; }
  }
}

function dancersNear(npc, ms) {
  return ms.filter((m) => isDance(m.hold) && near(m, npc, REACT.PARTY_R));
}

function ace(npc, ms, now) {
  const ds = dancersNear(npc, ms);
  if (ds.length < REACT.DUEL_AT) return;
  if (!mayTalk(npc, now)) return;
  const i = npc._reactN || 0;
  npc._reactN = i + 1;
  const who = ds[i % ds.length];
  const odds = REACT_LINES.ace[i % REACT_LINES.ace.length];
  say(npc, "Dance-off! I've got " + who.name + ' at ' + odds + '! Who wants in?', now);
}

function mayor(npc, ms, now) {
  if (dancersNear(npc, ms).length < REACT.PARTY_AT) return;
  if (say(npc, REACT_LINES.mayor, now)) npc._emoteMove = { id: 'cheer', at: now };
}

const RULES = Object.freeze({
  'Lil Bro': lilBro,
  'Blacksmith Bro': smith,
  Diego: diego,
  Ace: ace,
  'Mayor Bro': mayor,
});

/* ═══ v2.3.3604: THE TOWNSFOLK DO THINGS BY THEMSELVES ═══
   The owner: "it would be cool if the NPCs could just walk around and do
   stuff by themselves (animations should already work) but stay pretty close
   to their starting positions".  Walking was tried first and left out: in the
   world each walker's picture is his standing cell alone (the memory work,
   npcSprites.js), and his only walk cycle faces south, so a walk north or
   sideways would moonwalk.  So each townsperson does the emote moves the
   players do (emoteFx.js draws them on his figure about his feet) on his own
   now and then, in character -- IDLE_MOVES -- every IDLE_MIN_MS to
   IDLE_MAX_MS, never over a move he is already making (a reaction wins). */
export const IDLE = Object.freeze({ MIN_MS: 9000, MAX_MS: 22000, FIRST_MS: 6000 });
export const IDLE_MOVES = Object.freeze({
  'Mayor Bro': Object.freeze(['wave', 'cheer']),
  'Blacksmith Bro': Object.freeze(['flex', 'flex', 'shrug']),
  Diego: Object.freeze(['wave', 'shrug']),
  Ace: Object.freeze(['laugh', 'shrug']),
  'Lil Bro': Object.freeze(['wave', 'cheer', 'laugh']),
  'Beastmaster Bro': Object.freeze(['shrug', 'wave']),
  'Woodworker Bro': Object.freeze(['facepalm', 'shrug']),
  'Farmer Bro': Object.freeze(['wave', 'shrug']),
  /* v2.3.3820: the new cast (docs/specs/npc-cast.md), in character */
  Sterling: Object.freeze(['flex', 'shrug']),             /* gains */
  Slim: Object.freeze(['shrug', 'wave']),
  'Chef Blaze': Object.freeze(['facepalm', 'cheer', 'facepalm']),   /* WHO SEASONED THIS */
  Glint: Object.freeze(['wave', 'cheer']),
  'Postmaster Pete': Object.freeze(['shrug', 'shrug', 'facepalm']),  /* the back is closed */
  'Deed Dave': Object.freeze(['wave', 'cheer']),           /* sign here */
  Benny: Object.freeze(['wave', 'shrug']),
  'Guildmaster Gary': Object.freeze(['cheer', 'facepalm']),  /* KEVIN */
  'Sheriff Buck': Object.freeze(['flex', 'shrug']),
  'Gavel Greg': Object.freeze(['cheer', 'laugh']),         /* sold! */
  'Old Man Reel': Object.freeze(['shrug', 'laugh']),
  Bean: Object.freeze(['wave', 'cheer', 'laugh']),         /* say hi to chat */
  'Tourist Terry': Object.freeze(['facepalm', 'shrug', 'wave']),   /* which way to BroTown */
});
const IDLE_DEFAULT = Object.freeze(['wave', 'shrug']);

function idleMove(npc, now, rnd) {
  if (npc._emoteMove || npc._po) return;
  if (!npc._idleNext) { npc._idleNext = now + rnd() * IDLE.FIRST_MS; return; }
  if (now < npc._idleNext) return;
  const list = Object.prototype.hasOwnProperty.call(IDLE_MOVES, npc.name) ? IDLE_MOVES[npc.name] : IDLE_DEFAULT;
  const id = list[Math.floor(rnd() * list.length) % list.length];
  if (moveKind(id) === 'once') npc._emoteMove = { id, at: now };
  npc._idleNext = now + IDLE.MIN_MS + rnd() * (IDLE.MAX_MS - IDLE.MIN_MS);
}

/* once a frame: every townsperson answers the moves near him, and the rest
   of the time does a little something of his own (v2.3.3604) */
export function updateTownsfolkReactions(S, now, rnd = Math.random) {
  const npcs = S && S.npcs;
  if (!Array.isArray(npcs) || !npcs.length) return;
  const ms = emoteMovers(S);
  for (const npc of npcs) {
    if (!npc || npc.alive === false) continue;
    if (!Number.isFinite(npc.x) || !Number.isFinite(npc.y)) continue;
    if (Object.prototype.hasOwnProperty.call(RULES, npc.name)) RULES[npc.name](npc, ms, now);
    if (!(S && S.__btNoIdleMoves)) idleMove(npc, now, rnd);
  }
}
