/* ═══ v2.3.3207: A KILL'S ROLL, OVER THE MONSTER ═══
 *
 * The owner, on the codex's Roll column: "I think these should be number
 * ranges. That way a player hunting for something can also be looking for a
 * roll number within that range".  So the worker rolls each kill ONCE, 1 to
 * 10,000, every drop owning its own run of those numbers (server/src/
 * killroll.js), and tells every player the kill credits on its combat_credit:
 * `roll`, and `rh` -- the codex row id of the drop it landed on, when that
 * drop is theirs to have.
 *
 * This shows it over the monster, the dice before it: "7,431" in a quiet grey
 * when it dropped nothing more (held a second, gone in 2.4), or "640 Frost
 * Shard" in gold, held longer (1.8 s, gone in 3.2), when it landed on a drop -- the name from the codex's own rows
 * (data/codexDrops.js), so the popup and the page always agree.  World text
 * carries no emoji (the iPhone Safari crash, nodeLabels.js): the dice are the
 * popup's own mark, `dice` (effectsRenderer POPUP_ICONS, loaded with the
 * others at start, never on first use).
 *
 * Nothing here decides anything: the roll and the drop are the worker's. */
import { pushDmgPopup, monsterPopupY, heroPopupY } from '@/game/combatHelpers.js';
import { codexDropsFor, CODEX_ROLL_SIDES } from '@/data/codexDrops.js';
import { petKindOfMonster } from '@/data/trapping.js';

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* what a drop is called where the codex has no page for the monster */
const PLAIN_NAMES = Object.freeze({
  nugget: 'Gold Nugget', irongreatsword: 'Iron Great Sword', irongreaves: 'Iron Greaves', irontorso: 'Iron Torso',
  raregem: 'Rare Gem', rawgem: 'Raw Gem', shard: 'Shard',
});
export const KILL_ROLL_MISS = '#C9D2D0';   /* nothing more: quiet, readable on the ground */
export const KILL_ROLL_HIT = '#FFD54A';    /* a drop: the game's gold */

/** Does this worker roll once a kill?  (`caps.killroll`, set by state_sync) */
export function killRollLive(S) {
  return !!(S && S._serverCaps && S._serverCaps.killroll);
}

/** "7,431" */
export function killRollNumber(roll) {
  return Math.floor(Number(roll)).toLocaleString('en-US');
}

/** The name of the drop `rh` off monster `m` (its codex kind's row), or null. */
export function killRollDropName(m, rh, kind) {
  if (typeof rh !== 'string' || !has(PLAIN_NAMES, rh)) return null;
  const k = kind || petKindOfMonster(m);
  const rows = k ? codexDropsFor(k) : null;
  const row = rows ? rows.find((r) => r.id === rh) : null;
  return row ? row.name : PLAIN_NAMES[rh];
}

/* is it inside the view (the camera's world box, a little past its edges)?
   With no view known yet, the monster's own spot is trusted. */
function onScreen(S, m) {
  if (!(S.camera && S._viewW > 0 && S._viewH > 0)) return true;
  const x = m.x != null ? m.x : m.renderX, y = m.y != null ? m.y : m.renderY;
  if (!(typeof x === 'number' && typeof y === 'number')) return false;
  return x >= S.camera.x - 60 && x <= S.camera.x + S._viewW + 60 && y >= S.camera.y - 60 && y <= S.camera.y + S._viewH + 160;
}

/** combat_credit carried `roll`: show it over the monster it was for. */
export function onKillRoll(S, cc) {
  if (!S || !cc) return null;
  const roll = Math.floor(Number(cc.roll));
  if (!(roll >= 1 && roll <= CODEX_ROLL_SIDES)) return null;
  /* over the monster -- or, one off your screen (a burn or a poison finishing
     it out of sight, a party's kill across the field), over your own head:
     the roll is yours to see */
  const found = S.monsters && cc.monsterId ? S.monsters.find((mm) => mm && mm.id === cc.monsterId) : null;
  const m = found && onScreen(S, found) ? found : null;
  const P = S.player;
  if (!m && !P) return null;
  const kind = cc.cx && typeof cc.cx.k === 'string' ? cc.cx.k : null;
  const name = cc.rh ? killRollDropName(found, cc.rh, kind) : null;
  const text = killRollNumber(roll) + (name ? ' ' + name : '');
  const x = m ? (m.x != null ? m.x : (m.renderX || 0)) : P.x;
  const y = m ? monsterPopupY(m, -40) : heroPopupY(S);
  /* held to be read, as a damage number is not (1.5 s, fading from its
     first frame): a hunter reads every roll, and a drop's a while longer */
  pushDmgPopup(S, x, y, text, name ? KILL_ROLL_HIT : KILL_ROLL_MISS,
    name ? { roll: true, iconKey: 'dice', iconLead: true, ttl: 3.2, hold: 1.8, rise: 26 } : { roll: true, iconKey: 'dice', iconLead: true, ttl: 2.4, hold: 1.0, rise: 30 });
  /* QA (mp-codex), armed by the harness only */
  if (typeof window !== 'undefined' && window.__btProbe) {
    try {
      const log = window.__btKillRolls || (window.__btKillRolls = []);
      log.push({ roll, rh: cc.rh || null, name, text, monsterId: cc.monsterId, over: m ? 'monster' : 'you', at: Date.now() });
      if (log.length > 40) log.splice(0, log.length - 40);
    } catch (e) { /* a probe never breaks the game */ }
  }
  return text;
}
