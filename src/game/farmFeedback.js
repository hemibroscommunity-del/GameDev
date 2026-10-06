/* ═══ v2.3.3102: WHAT THE FARM SAYS BACK ═══
 *
 * The moment after the worker answers a farm request (server/src/farm.js):
 * the words over the player, the sound, the level celebration, and on join
 * the line saying beds are ready.  Called from wsClient.js's direct
 * 'farm_state' case AFTER farmBus has taken the answer, and only ever from it
 * -- never from processGameEvent, which the room's relayed events reach too.
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
  newer: 'The farm is closed for now',   /* v2.3.3102: the record is a newer worker's (farm.js FARM.V) */
  nothing: 'Nothing to do there',
  timeout: 'No answer, try again',
  'timeout-buy': 'No answer yet. Check your bag',   /* v2.3.3102: a buy is not safe to repeat blind (farmBus.js) */
  /* v2.3.3109: the order board (server farmorders.js) */
  'order-short': 'Not enough yet',
  'order-done': 'Already delivered',
  'order-stale': 'New orders are up',
  'order-gone': 'That order is gone',
};

/* A bag key's name as the farm says it: "Carrot", "Carrot Seeds", "Compost".
   v2.3.3102: a key the farm does not know is "Crop" (a newer worker's), never
   the key itself -- the words over a player are never text a message chose. */
export function farmItemName(key) {
  if (key === FARM.COMPOST) return 'Compost';
  const s = farmCropOfSeed(key);
  if (s) return FARM.CROPS[s].name + ' Seeds';
  const c = farmCropOfItem(key);
  if (c) return FARM.CROPS[c].name;
  return 'Crop';
}

/* v2.3.3102: how many ripe beds the player has already been told of this
   page session.  The worker sends the farm on EVERY join (farm.js
   _farmOnJoin), and an iPhone rejoins on nearly every return to the app, so
   "3 beds are ready" came back each time for crops that never wither.  Said
   again only when there is news: more beds ripe than last said.  Any other
   answer (a harvest, the window opening) brings it down to what is ripe now,
   so the next ripening is news again. */
let toldRipe = 0;
function ripeIn(payload) {
  if (!Array.isArray(payload.plots)) return null;
  const now = Number.isFinite(payload.now) ? payload.now : Date.now();
  return payload.plots.filter((p) => p && p.s === 'planted' && now >= p.readyAt).length;
}

function play(key, opts) { try { BT_AUDIO.play(key, opts); } catch (e) { /* sound only */ } }

const SOUND = {
  dig: () => play('footstep-v3', { vol: 0.7, rate: 0.75 }),
  plant: () => play('footstep-v3', { vol: 0.45, rate: 1.25 }),
  water: () => play('lure-drop', { vol: 0.5 }),
  feed: () => play('footstep-v3', { vol: 0.55, rate: 0.6 }),
  harvest: () => { try { BT_AUDIO.collect(); } catch (e) { /* sound only */ } },
  buy: () => play('coin-pickup', { vol: 0.5 }),
  order: () => play('coin-pickup', { vol: 0.7 }),   /* v2.3.3109: an order delivered, paid in gold */
};

function say(S, dy, text, color, extra) {
  if (!S || !S.player || !S.dmgNumbers) return;
  try { pushDmgPopup(S, S.player.x, S.player.y - dy, text, color, extra); } catch (e) { /* popup only */ }
}

export function farmFeedback(S, payload, deps) {
  if (!payload || typeof payload !== 'object') return;

  const ripeNow = ripeIn(payload);
  /* On join: say how many beds are ripe, in the chat log and over the
     player -- when it is news (toldRipe, above).  The farm itself already
     went into farmBus. */
  if (payload.login) {
    const ripe = ripeNow || 0;
    const news = ripe > toldRipe;
    toldRipe = ripe;
    if (news && S) {
      const text = FARM_LOOK.harvest + ' ' + ripe + (ripe === 1 ? ' bed is' : ' beds are') + ' ready at the Feed & Seed';
      try {
        S.chatLog = (S.chatLog || []).slice(-50).concat([{ id: 'farm-' + Date.now(), name: '', text, ts: Date.now() }]);
        if (deps && deps.setChatLog) deps.setChatLog(S.chatLog.slice());
      } catch (e) { /* the window still shows them */ }
      say(S, 55, text, GOOD, { ttl: 5 });
    }
    return;
  }

  if (ripeNow !== null) toldRipe = Math.min(toldRipe, ripeNow);
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
      /* v2.3.3102: the quest flag the old browser-only window set on a harvest
         (trader_3, "Plant and harvest a crop"), now on the worker's confirmed
         one.  Trader Tix is not in the game today, so nothing reads it yet;
         without it his chain would stall the day he returns.  The client's
         own flag (rule 18: the worker never writes _questFlags).  Safe only
         because this runs on the worker's direct answer (wsClient.js). */
      try {
        const R = S && S.rpg;
        if (R) { if (!R._questFlags) R._questFlags = {}; R._questFlags.harvestedCrop = true; }
      } catch (e) { /* a quest flag never blocks the moment */ }
    } else if (did.op === 'buy') {
      say(S, 34, '+' + did.n + ' ' + farmItemName(did.item), GOOD);
    } else if (did.op === 'order') {
      /* v2.3.3109: an order delivered -- what it paid; the gold and the XP
         themselves ride the player_state that follows. */
      say(S, 34, 'Order delivered', GOOD);
      if (did.gold > 0) say(S, 48, '+' + did.gold + ' gold', XP_GOLD);
      if (did.xp > 0) say(S, 62, '+' + did.xp + ' Farming XP', XP_GOLD);
      if (did.leveled && did.newLevel > did.fromLevel) {
        try { celebrateLifeSkillLevel(S, 'farming', did.newLevel, did.fromLevel); } catch (e) { /* visual */ }
      }
    }
  }
  /* A refusal the player can act on gets words; 'nothing' (a tap on a bed
     the tool does not fit) and a seed running out mid-drag are said by the
     window itself, which is where the player is looking. */
  if (payload.err && (!did || !did.n) && payload.err !== 'nothing') {
    say(S, 34, FARM_ERR_TEXT[payload.err] || 'Could not', BAD);
  }
}
