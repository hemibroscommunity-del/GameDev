/* ═══ v2.3.3817: A DEATH SAYS WHAT HAPPENED ═══
 *
 * A judge's pass on a computer: a level-1 bro died in the first quest's slimes
 * and "just reappeared in BroTown"; no capture showed a death.  A death showed
 * nothing that stays: the body's fall, a shake, a half-second dark flash, the
 * sound and a floating "YOU DIED" over the head (wsClient player_died), then
 * the worker's respawn five seconds later -- and nothing, then or after, said
 * what killed you or where you were going.
 *
 * So a small card over the scene for those five seconds -- "You died", what
 * killed you, "Back in BroTown in N" counting down (ui/mobile/DeathCard.jsx;
 * it never takes a tap: pointer-events none) -- and one line in the chat once
 * you are back.  In No man's land it names the player and, when the worker
 * has said so (applyNmlLoss), what they took.
 *
 * What killed you is read when you die: the respawn empties the monster list
 * (game/respawn.js), and the card outlives it.  The worker's causes
 * (server/src/index.js _handlePlayerDeath): `monster:<id>` (hits.js's one
 * door; `monster:heap` a burning heap), `pvp:<id>`, `stuck-at-zero`.
 *
 * No imports, so node can test it (server/test/death-card.test.mjs); the
 * names come in through `opts`.
 */

export const DEATH_CARD = {
  HOLD_MS: 5000,      /* the worker's respawn (respawnInMs), when it says none */
  LINGER_MS: 600,     /* a respawn that lands a little late keeps the card at "in 0" this long */
};

/** What killed you, in words: a monster's name, a player's, or null. */
export function killerOf(S, cause, opts) {
  const o = opts || {};
  const c = typeof cause === 'string' ? cause : '';
  if (c === 'monster:heap') return { name: 'a burning heap', pvp: false };
  if (c.indexOf('monster:') === 0) {
    const id = c.slice(8);
    const m = S && Array.isArray(S.monsters) ? S.monsters.find((q) => q && String(q.id) === id) : null;
    if (!m) return { name: 'a monster', pvp: false };
    const base = typeof o.monsterName === 'function' ? o.monsterName(m) : (m.archetype || m.type || 'monster');
    return { name: (m.boss ? 'Boss ' : '') + base, pvp: false };
  }
  if (c.indexOf('pvp:') === 0) {
    const id = c.slice(4);
    const p = S && S.others ? S.others[id] : null;
    const nm = p && typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 24) : 'a player';
    return { name: nm, pvp: true };
  }
  return null;
}

/** On the worker's player_died: the card's record.  `opts.inNml`: you died in
 *  No man's land (the caller reads it while you still lie where you fell) --
 *  the worker's `pvp:<id>` is a duel's, a spar's and a war's death too, so a
 *  player is named "in No man's land" only when it was there (the review of
 *  v2.3.3817). */
export function noteDeath(S, payload, now, opts) {
  if (!S) return null;
  const p = payload || {};
  const k = killerOf(S, p.cause, opts);
  const ms = Number(p.respawnInMs) > 0 ? Math.min(30000, Number(p.respawnInMs)) : DEATH_CARD.HOLD_MS;
  S._deathCard = {
    at: typeof now === 'number' ? now : Date.now(),
    ms,
    killer: k ? k.name : null,
    pvp: !!(k && k.pvp),
    nml: !!(k && k.pvp && opts && opts.inNml),
    keptBag: !!p.keptBag,
    lost: null,
  };
  return S._deathCard;
}

/** No man's land's loss (applyNmlLoss), when it lands during the card. */
export function noteDeathLoss(S, red) {
  const d = S && S._deathCard;
  if (!d) return;
  d.lost = red ? 'You lost what you carried and wore' : 'They took what you carried';
}

/** What the card shows now, or null when there is none. */
export function deathCardView(S, now) {
  const d = S && S._deathCard;
  if (!d) return null;
  const t = typeof now === 'number' ? now : Date.now();
  const left = d.at + d.ms - t;
  if (left < -DEATH_CARD.LINGER_MS) return null;
  return {
    title: 'You died',
    by: d.killer ? (d.pvp ? d.killer + (d.nml ? ' killed you in No man\'s land' : ' killed you') : 'Killed by ' + d.killer) : null,
    note: d.lost || (d.keptBag ? 'Your bag is safe' : null),
    back: 'Back in BroTown in ' + Math.max(0, Math.ceil(left / 1000)),
    secs: Math.max(0, Math.ceil(left / 1000)),
  };
}

/* a card older than this at a respawn is not that respawn's death (one the
   worker never brought you back from) and says nothing */
export const DEATH_LINE_STALE_MS = 30000;

/** The chat's line once you are back (game/respawn.js), and the card gone. */
export function deathLine(S, now) {
  const d = S && S._deathCard;
  if (!d) return null;
  S._deathCard = null;
  const t = typeof now === 'number' ? now : Date.now();
  if (t - (d.at + d.ms) > DEATH_LINE_STALE_MS) return null;
  if (!d.killer) return 'You died, and came back in BroTown.';
  if (d.pvp) return d.killer + (d.nml ? ' killed you in No man\'s land.' : ' killed you.') + ' You came back in BroTown.';
  return 'You were killed by ' + d.killer + ', and came back in BroTown.';
}
