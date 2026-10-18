/* ═══ v2.3.3393: /roll AND /flip, ROLLED BY THE WORKER (docs/specs/dice.md) ═══
 *
 * The fun & social plan's Phase 1 (docs/FUN-SOCIAL-PLAN.md), the owner's "Go
 * recommended": "/roll" (1-100, or "/roll 20" for 1-20) and "/flip" in the
 * chat, for settling who gets the loot, who goes first, or nothing at all.
 *
 * ROLLED HERE, never on the phone: a phone's own roll can always say 100, and
 * a roll that settles something between two players is worth exactly as much
 * as the trust in it.  The phone asks (`dice {kind, max}`); the worker rolls
 * with the platform's crypto source, without the modulo's bias (fairInt), and
 * tells the players near the roller (`dice_roll`, a placed event: eventplace.js
 * ROOM_PLACED, the roller wherever they are) in the roller's name -- `from`,
 * so a muter does not hear it (chatmod.js MUTABLE_RELAY_TYPES) and the phone
 * reads the roller from the stamp (wsClient.js), never from the payload.
 * PRIVILEGED (index.js): no phone can send one.
 *
 * One roll or flip every DICE.GAP_MS a player (in memory, `ps._diceAt`); one
 * sooner is dropped without a word (the phone holds its own back with words,
 * src/game/dice.js).  Nothing is stored, nothing is paid, and nothing is
 * staked: a roll is words in the chat with a number the worker chose.
 *
 * Kill switch: `dice: false` in the live flags -- no roll, and
 * `caps.dice` false at a phone's next join (it then sends "/roll" as the plain
 * line it always was).
 */

export const DICE = Object.freeze({
  /* one roll or flip this often a player (src/game/dice.js DICE_GAP_MS,
     mirror-audit) */
  GAP_MS: 5000,
  /* "/roll" alone, and the most "/roll N" may ask */
  SIDES: 100,
  MAX_SIDES: 1000,
});

/* 1..n, every face as likely as every other: a 32-bit draw from the crypto
   source, the top sliver that would favour the low faces drawn again */
export function fairInt(n, rand32) {
  const draw = typeof rand32 === 'function' ? rand32 : () => {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    return b[0];
  };
  const SPAN = 0x100000000;
  const limit = SPAN - (SPAN % n);
  for (let i = 0; i < 64; i++) {
    const v = draw() >>> 0;
    if (v < limit) return 1 + (v % n);
  }
  return 1 + Math.floor(Math.random() * n);
}

/* the ask, checked: {kind, sides} or null */
export function diceAsk(msg) {
  if (!msg || typeof msg !== 'object') return null;
  if (msg.kind === 'flip') return { kind: 'flip', sides: 2 };
  if (msg.kind !== 'roll') return null;
  const n = msg.max === undefined || msg.max === null ? DICE.SIDES : msg.max;
  if (!Number.isInteger(n) || n < 2 || n > DICE.MAX_SIDES) return null;
  return { kind: 'roll', sides: n };
}

export const diceMethods = {
  _diceOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'dice') && !f.dice);
  },

  /* `dice {kind: 'roll' | 'flip', max?}`.  Answers nothing of its own: the
     roll is the `dice_roll` event, to the roller's own phone as well */
  _handleDice(session, msg) {
    if (this._diceOff()) return;
    const sid = session && session.id;
    if (!sid) return;
    const ps = this.playerState[sid];
    if (!ps || ps.dead || ps.dying) return;
    const ask = diceAsk(msg);
    if (!ask) return;
    const now = Date.now();
    if (ps._diceAt && now - ps._diceAt < DICE.GAP_MS) return;
    ps._diceAt = now;
    const value = fairInt(ask.sides, this._diceRand);
    this.eventBuffer.push({
      type: 'dice_roll',
      from: sid,
      payload: { id: sid, name: this._relayName(session), kind: ask.kind, value, max: ask.sides, zone: ps.z || 'town' },
    });
  },
};
