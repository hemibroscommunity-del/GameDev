/* ═══ v2.3.3083: WHAT THE FARM SAYS BACK ═══
 *
 * The moment after the worker answers a farm request (server/src/farm.js):
 * the words over the player, the sound, the level celebration, and on join
 * the line saying beds are ready.  Called from gameEvents.js 'farm_state'
 * AFTER farmBus has taken the answer, and only ever from it.
 *
 * Feedback only.  The bag, the coins and the Farming XP arrive on the
 * player_state that follows every value-bearing answer (rule 20); nothing
 * here adds or takes anything.  Sounds are recordings already in the game
 * (SFX_MANIFEST): the dirt footstep for a spade in the ground, the fishing
 * lure's plop for a watering can, the pickup chime for a harvest. */
import { BT_AUDIO } from '@/data/index.js';
import { FARM, FARM_LOOK, farmCropOfSeed, farmCropOfItem } from '@/data/farmCrops.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { celebrateLifeSkillLevel } from '@/game/levelCelebration.js';

const GOOD = '#59BF91';
const XP_GOLD = '#D8A94D';
const BAD = '#D8635D';

/* Why nothing happened, in the words the window and the popup use. */
export const FARM_ERR_TEXT = {
  'no-seeds': 'Out of seeds',
  'no-compost': 'Out of compost',
  level: 'Farming level too low',
  coins: 'Not enough gold',
  off: 'The farm is closed for now',
  nothing: 'Nothing to do there',
  timeout: 'No answer, try again',
};

/* A bag key's name as the farm says it: "Carrot", "Carrot Seeds", "Compost". */
export function farmItemName(key) {
  if (key === FARM.COMPOST) return 'Compost';
  const s = farmCropOfSeed(key);
  if (s) return FARM.CROPS[s].name + ' Seeds';
  const c = farmCropOfItem(key);
  if (c) return FARM.CROPS[c].name;
  return String(key || '');
}

function play(key, opts) { try { BT_AUDIO.play(key, opts); } catch (e) { /* sound only */ } }

const SOUND = {
  dig: () => play('footstep-v3', { vol: 0.7, rate: 0.75 }),
  plant: () => play('footstep-v3', { vol: 0.45, rate: 1.25 }),
  water: () => play('lure-drop', { vol: 0.5 }),
  feed: () => play('footstep-v3', { vol: 0.55, rate: 0.6 }),
  harvest: () => { try { BT_AUDIO.collect(); } catch (e) { /* sound only */ } },
  buy: () => play('coin-pickup', { vol: 0.5 }),
};

function say(S, dy, text, color, extra) {
  if (!S || !S.player || !S.dmgNumbers) return;
  try { pushDmgPopup(S, S.player.x, S.player.y - dy, text, color, extra); } catch (e) { /* popup only */ }
}

export function farmFeedback(S, payload, deps) {
  if (!payload || typeof payload !== 'object') return;

  /* On join: say how many beds are ripe, once, in the chat log and over the
     player.  The farm itself already went into farmBus. */
  if (payload.login) {
    const now = Number.isFinite(payload.now) ? payload.now : Date.now();
    const ripe = Array.isArray(payload.plots)
      ? payload.plots.filter((p) => p && p.s === 'planted' && now >= p.readyAt).length : 0;
    if (ripe > 0 && S) {
      const text = FARM_LOOK.harvest + ' ' + ripe + (ripe === 1 ? ' bed is' : ' beds are') + ' ready at the Feed & Seed';
      try {
        S.chatLog = (S.chatLog || []).slice(-50).concat([{ id: 'farm-' + Date.now(), name: '', text, ts: Date.now() }]);
        if (deps && deps.setChatLog) deps.setChatLog(S.chatLog.slice());
      } catch (e) { /* the window still shows them */ }
      say(S, 55, text, GOOD, { ttl: 5 });
    }
    return;
  }

  const did = payload.did;
  if (did && did.n > 0) {
    const fx = SOUND[did.op];
    if (fx) fx();
    if (did.op === 'harvest' && did.items) {
      let dy = 34;
      for (const key of Object.keys(did.items)) {
        say(S, dy, '+' + did.items[key] + ' ' + farmItemName(key), GOOD);
        dy += 14;
      }
      if (did.xp > 0) say(S, dy, '+' + did.xp + ' Farming XP', XP_GOLD);
      if (did.leveled && did.newLevel > did.fromLevel) {
        try { celebrateLifeSkillLevel(S, 'farming', did.newLevel, did.fromLevel); } catch (e) { /* visual */ }
      }
    } else if (did.op === 'buy') {
      say(S, 34, '+' + did.n + ' ' + farmItemName(did.item), GOOD);
    }
  }
  /* A refusal the player can act on gets words; 'nothing' (a tap on a bed
     the tool does not fit) and a seed running out mid-drag are said by the
     window itself, which is where the player is looking. */
  if (payload.err && (!did || !did.n) && payload.err !== 'nothing') {
    say(S, 34, FARM_ERR_TEXT[payload.err] || 'Could not', BAD);
  }
}
