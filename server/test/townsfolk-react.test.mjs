/* The townsfolk join in -- v2.3.3365 (src/game/townsfolkReact.js,
 * docs/specs/emote-moves.md "Your pet and the townsfolk join in").
 *
 * The phone's own rules, read in node: each townsperson answers the moves
 * this phone sees near him.
 *
 *   1. Lil Bro copies the nearest player's held pose a beat late, stands up
 *      when they do, copies each new moment once, and ignores a player too
 *      far off;
 *   2. Blacksmith Bro flexes back at a flex, once a flex, his line at most
 *      once in LINE_GAP_MS;
 *   3. Diego has a word for a dancer near him, not a sitter, once in the gap;
 *   4. Ace calls a dance-off at two dancers, not one;
 *   5. Mayor Bro cheers a party at three, not two, once in the gap;
 *   6. only players in your zone, alive and drawn count; a townsperson with
 *      no rule, or no place, is left alone.
 */
import { updateTownsfolkReactions, emoteMovers, REACT, REACT_LINES } from '../../src/game/townsfolkReact.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const T0 = 1700000000000;
function world() {
  return {
    myId: 'me', myName: 'Mover', currentZone: 'wheel', player: { x: 0, y: 0 }, others: {},
    npcs: [
      { id: 'lil', name: 'Lil Bro', alive: true, x: 100, y: 0 },
      { id: 'smith', name: 'Blacksmith Bro', alive: true, x: 0, y: 150 },
      { id: 'diego', name: 'Diego', alive: true, x: -120, y: 0 },
      { id: 'ace', name: 'Ace', alive: true, x: 0, y: -200 },
      { id: 'mayor', name: 'Mayor Bro', alive: true, x: 60, y: -60 },
    ],
  };
}
const npc = (S, id) => S.npcs.find((n) => n.id === id);
const peer = (S, id, x, y, extra) => { S.others[id] = Object.assign({ id, name: id, zone: 'wheel', x, y }, extra || {}); };

/* ── 1. Lil Bro copies ─────────────────────────────────────────────────── */
{
  const S = world();
  const lil = npc(S, 'lil');
  S._pose = { id: 'sit', at: T0 };
  updateTownsfolkReactions(S, T0);
  check('1a he copies your sit a beat late', lil._po === 'sit' && lil._poAt === T0 + REACT.COPY_LAG_MS, { po: lil._po, at: lil._poAt });
  check('1b ...and says so', !!lil.chatBubble && lil.chatBubble.text === REACT_LINES.lil[0] && lil.chatBubble.ts === T0, lil.chatBubble);
  const at = lil._poAt;
  updateTownsfolkReactions(S, T0 + 500);
  check('1c he keeps sitting while you sit (his settle not restarted)', lil._po === 'sit' && lil._poAt === at);
  S._pose = { id: 'bounce', at: T0 + 1000 };
  updateTownsfolkReactions(S, T0 + 1000);
  check('1d you dance, he dances', lil._po === 'bounce');
  S._pose = null;
  updateTownsfolkReactions(S, T0 + 1500);
  check('1e you stand up, he stands up', lil._po === null);
  S._emoteMove = { id: 'wave', at: T0 + 2000 };
  updateTownsfolkReactions(S, T0 + 2000);
  check('1f he copies your wave a beat late', !!lil._emoteMove && lil._emoteMove.id === 'wave' && lil._emoteMove.at === T0 + 2000 + REACT.COPY_LAG_MS, lil._emoteMove);
  lil._emoteMove = null;
  updateTownsfolkReactions(S, T0 + 2100);
  check('1g ...once: the same wave is not copied again', lil._emoteMove === null);
  S._emoteMove = null;
  /* the nearest player is the one he copies */
  S.player.x = 300;
  peer(S, 'near', 130, 0, { _po: 'robot', _poAt: T0 });
  updateTownsfolkReactions(S, T0 + 3000);
  check('1h he copies the nearest player', lil._po === 'robot', lil._po);
  delete S.others.near;
  S.player.x = 100 + REACT.NEAR + 50;
  S._pose = { id: 'sleep', at: T0 + 4000 };
  updateTownsfolkReactions(S, T0 + 4000);
  check('1i too far off: he does nothing', lil._po === null);
}

/* ── 2. Blacksmith Bro flexes back ─────────────────────────────────────── */
{
  const S = world();
  const sm = npc(S, 'smith');
  S._emoteMove = { id: 'wave', at: T0 };
  updateTownsfolkReactions(S, T0);
  check('2a a wave: nothing from him', !sm._emoteMove && !sm.chatBubble);
  S._emoteMove = { id: 'flex', at: T0 + 100 };
  updateTownsfolkReactions(S, T0 + 100);
  check('2b a flex: he flexes back', !!sm._emoteMove && sm._emoteMove.id === 'flex' && sm._emoteMove.at === T0 + 100 + REACT.ANSWER_LAG_MS, sm._emoteMove);
  check('2c ...with a word', !!sm.chatBubble && sm.chatBubble.text === REACT_LINES.smith[0], sm.chatBubble);
  sm._emoteMove = null;
  updateTownsfolkReactions(S, T0 + 200);
  check('2d the same flex is answered once', sm._emoteMove === null);
  S._emoteMove = { id: 'flex', at: T0 + 5000 };
  updateTownsfolkReactions(S, T0 + 5000);
  check('2e a new flex 5 s later: he flexes again, without a second line', !!sm._emoteMove && sm.chatBubble.ts === T0 + 100);
  S._emoteMove = { id: 'flex', at: T0 + 100 + REACT.LINE_GAP_MS };
  updateTownsfolkReactions(S, T0 + 100 + REACT.LINE_GAP_MS);
  check('2f after the gap, a new line', sm.chatBubble.ts === T0 + 100 + REACT.LINE_GAP_MS && sm.chatBubble.text === REACT_LINES.smith[1], sm.chatBubble);
}

/* ── 3. Diego ──────────────────────────────────────────────────────────── */
{
  const S = world();
  const dg = npc(S, 'diego');
  S._pose = { id: 'sit', at: T0 };
  updateTownsfolkReactions(S, T0);
  check('3a a sitter by his door: no word', !dg.chatBubble);
  S._pose = { id: 'sprinkler', at: T0 + 100 };
  updateTownsfolkReactions(S, T0 + 100);
  check('3b a dancer: "No dancing in my store!"', !!dg.chatBubble && dg.chatBubble.text === 'No dancing in my store!', dg.chatBubble);
  updateTownsfolkReactions(S, T0 + 5000);
  check('3c ...not again inside the gap', dg.chatBubble.ts === T0 + 100);
  updateTownsfolkReactions(S, T0 + 100 + REACT.LINE_GAP_MS);
  check('3d ...and again after it', dg.chatBubble.ts === T0 + 100 + REACT.LINE_GAP_MS && dg.chatBubble.text === REACT_LINES.diego[1]);
}

/* ── 3e. Halloween week: a zombie by Diego's door (v2.3.3368) ──────────── */
{
  const S = world();
  const dg = npc(S, 'diego');
  S._pose = { id: 'zombie', at: T0 };
  updateTownsfolkReactions(S, T0);
  check('3e a Zombie Shuffle by his door: "No zombies in my store!"', !!dg.chatBubble && dg.chatBubble.text === 'No zombies in my store!', dg.chatBubble);
}

/* ── 4. Ace ────────────────────────────────────────────────────────────── */
{
  const S = world();
  const ace = npc(S, 'ace');
  S._pose = { id: 'bounce', at: T0 };
  updateTownsfolkReactions(S, T0);
  check('4a one dancer: no dance-off', !ace.chatBubble);
  peer(S, 'Rival', 40, -150, { _po: 'robot', _poAt: T0 });
  updateTownsfolkReactions(S, T0 + 100);
  check('4b two dancers: he calls the odds on one of them', !!ace.chatBubble && /^Dance-off! (Mover|Rival) at (3 to 1|2 to 1|5 to 2|even money)\.$/.test(ace.chatBubble.text), ace.chatBubble);
  const t = ace.chatBubble.ts;
  updateTownsfolkReactions(S, T0 + 2000);
  check('4c ...once in the gap', ace.chatBubble.ts === t);
}

/* ── 5. Mayor Bro ──────────────────────────────────────────────────────── */
{
  const S = world();
  const my = npc(S, 'mayor');
  S._pose = { id: 'bounce', at: T0 };
  peer(S, 'b', 100, -100, { _po: 'robot', _poAt: T0 });
  updateTownsfolkReactions(S, T0);
  check('5a two dancers: no party', !my.chatBubble && !my._emoteMove);
  peer(S, 'c', 120, -40, { _po: 'sprinkler', _poAt: T0 });
  updateTownsfolkReactions(S, T0 + 100);
  check('5b three: he cheers the party', !!my._emoteMove && my._emoteMove.id === 'cheer' && !!my.chatBubble && my.chatBubble.text === REACT_LINES.mayor[0], { m: my._emoteMove, b: my.chatBubble });
  my._emoteMove = null;
  updateTownsfolkReactions(S, T0 + 3000);
  check('5c ...once in the gap', my._emoteMove === null && my.chatBubble.ts === T0 + 100);
}

/* ── 6. who counts ─────────────────────────────────────────────────────── */
{
  const S = world();
  peer(S, 'dead', 10, 0, { _po: 'bounce', _isDead: true });
  peer(S, 'away', 10, 0, { _po: 'bounce', _away: true });
  peer(S, 'town', 10, 0, { _po: 'bounce', zone: 'town' });
  peer(S, 'lost', NaN, 0, { _po: 'bounce' });
  peer(S, 'drawn', 10, 0, { _po: 'bounce', renderX: 15, renderY: 2 });
  const ms = emoteMovers(S);
  check('6a the dead, the parked, another zone\'s and a placeless player do not count',
    JSON.stringify(ms.map((m) => m.id).sort()) === JSON.stringify(['drawn', 'me']), ms.map((m) => m.id));
  check('6b a player counts where he is drawn', ms.find((m) => m.id === 'drawn').x === 15);
  S.rpg = { hp: 0 };
  check('6c you, dead, do not', !emoteMovers(S).some((m) => m.id === 'me'));
  const S2 = world();
  S2.npcs.push({ id: 'x', name: '__proto__', alive: true, x: 0, y: 0 }, { id: 'y', name: 'Lil Bro', alive: true, x: undefined, y: 0 },
    { id: 'z', name: 'Lil Bro', alive: false, x: 0, y: 0 });
  S2._pose = { id: 'sit', at: T0 };
  let threw = null;
  try { updateTownsfolkReactions(S2, T0); } catch (e) { threw = e.message; }
  check('6d a townsperson with no rule, no place or not alive is left alone', !threw && !S2.npcs[5]._po && !S2.npcs[6]._po && !S2.npcs[7]._po, threw);
  check('6e no townsfolk, no trouble', (() => { try { updateTownsfolkReactions({ npcs: [] }, T0); updateTownsfolkReactions(null, T0); return true; } catch (e) { return false; } })());
}

console.log(`\ntownsfolk-react: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
