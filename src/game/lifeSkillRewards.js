/* ═══ LIFE-SKILL REWARDS — extraction minigame + fishing/cooking/wood/mining ═══ */
/* v2.3.841: moved verbatim from the useCallback bodies in
   src/ui/BroTown.jsx (behavior-frozen). The gather/extraction reward flow:
   startExtraction sets up the per-node swipe-window state machine;
   succeedExtraction (called on a valid swipe) routes to the per-skill
   reward applier; applyFishingReward/applyWoodReward/applyMiningReward grant
   resource + shard + life-skill XP (server-mediated in MP, local fallback
   in SP) and are module-internal (only succeedExtraction calls them);
   applyCookingResult handles the cooking minigame outcome.

   The component keeps thin useCallback wrappers for the three with external
   callers (startExtraction, succeedExtraction, applyCookingResult) so their
   referential identity for the gather/JSX handlers is unchanged. Each body
   opened with `var S = stateRef.current;`; here S is the param (passed at
   call time, identical). The only React setter any of them touches is
   setRpgState, threaded via deps; succeedExtraction forwards deps to the
   appliers. All other refs are module imports below. */
import { BT_AUDIO, EXTRACT_WINDOW_MS, MINE_SPOT_R, MINIGAME_REWARDS, TILE, addLifeSkillXp, computeOpenDelay, createDefaultCompStats, migrateLifeSkills } from '@/data/index.js';
import { rollHarvestShard, shardByKey } from '@/data/shards.js';
import { _objectSpread } from '@/lib/babelHelpers.js';

/* v2.3.849: fly a harvested-resource icon from its world node into the
   bottom-left inventory.  DOM-only (appended to document.body, like the
   resume spinner) so it floats above the canvas/HUD and animates on the
   compositor; world->screen is node minus camera (world canvas pinned
   top-left, 1:1 CSS px).  No-ops outside the browser. */
function _flyResourceToInventory(S, wx, wy, iconUrl) {
  try {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    var cam = (S && S.camera) || { x: 0, y: 0 };
    var sx = wx - cam.x, sy = wy - cam.y;
    var img = document.createElement('img');
    img.src = iconUrl;
    img.alt = '';
    img.style.cssText = 'position:fixed;left:0;top:0;width:34px;height:34px;z-index:99998;' +
      'pointer-events:none;image-rendering:pixelated;will-change:transform,opacity;' +
      'filter:drop-shadow(0 2px 4px rgba(0,0,0,.55));' +
      'transition:transform .7s cubic-bezier(.45,.05,.3,1),opacity .7s ease-in';
    img.style.transform = 'translate(' + sx + 'px,' + sy + 'px) scale(1)';
    img.style.marginLeft = '-17px';  // centre the 34px icon on the point
    img.style.marginTop = '-17px';
    document.body.appendChild(img);
    /* Target: bottom-left, just inside the dashboard where the inventory
       preview lives (--dash-h is ~28vh). */
    var dashH = Math.round(window.innerHeight * 0.28);
    var tx = 46, ty = window.innerHeight - dashH + 18;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(0.55)';
        img.style.opacity = '0.15';
      });
    });
    setTimeout(function () { try { img.remove(); } catch (e) {} }, 760);
  } catch (e) {}
}

export function startExtraction(S, node, skill) {
    if (!S || !node) return;
    /* Mining is done from one tile NORTH of the vein so the south-facing swing
       lines up over the rock. Refuse to start unless the player is on that spot
       (the marker shows where). Covers every entry path. */
    if (skill === 'mining' && S.player) {
      var _sx = node.x, _sy = node.y - TILE;
      var _sdist = Math.sqrt(Math.pow(_sx - S.player.x, 2) + Math.pow(_sy - S.player.y, 2));
      if (_sdist > MINE_SPOT_R) return;
    }
    /* v2.3.844: fishing lines the character up with the pond.  The baked
       'fish' rod line drops down-LEFT of the body (tip ~(-52, +43) px from
       the body center at the south render scale), so seat the player up-and-
       right of the fish-spot and the line falls straight into the existing
       pond -- no separate hole needed.  67 px from the node keeps us inside
       EXTRACT_CANCEL_R (90).  Velocity zeroed so the snap holds. */
    if (skill === 'fishing' && S.player) {
      S.player.x = node.x + 52;
      S.player.y = node.y - 43;
      S.player.vx = 0; S.player.vy = 0;
    }
    /* One extraction at a time -- tapping a new node cancels the old. */
    if (S._extraction) S._extraction = null;
    var R = S.rpg;
    var skillLvl = (R && R.lifeSkills && R.lifeSkills[skill] && R.lifeSkills[skill].level) || 0;
    var nodeTier = node.gatherLvl || 1;
    var openDelay = computeOpenDelay(skillLvl, nodeTier);
    var now = Date.now();
    S._extraction = {
      nodeId: node.id,
      /* v2.3.253: keep the node reference too so the tick can find it
         even when nodes lack ids (SP locally-spawned nodes were
         missing the id field, which silently broke the loop). */
      nodeRef: node,
      skill: skill,
      startedAt: now,
      windowOpensAt: now + openDelay,
      windowClosesAt: now + openDelay + EXTRACT_WINDOW_MS,
      status: 'waiting',
      swipeSamples: [],
    };
    /* v2.3.230: tell the server we started so it can validate the
       eventual node_strike's timing against the same computeOpenDelay
       window we just rolled.  Server treats missing extraction_start
       as a permissive fallback (no rejection), so this is the latency
       anti-cheat hook, not a hard gate. */
    if (S.channel) {
      try {
        S.channel.send({ type: 'extraction_start', payload: {
          nodeId: node.id, zone: S.currentZone, skill: skill,
        }});
      } catch (e) {}
    }
    try { BT_AUDIO.beep(440, 0.03, 0.04, 'sine'); } catch (e) {}
}

export function succeedExtraction(S, accuracy, deps) {
    if (!S || !S._extraction || S._extraction.status !== 'ready') return false;
    var _ex = S._extraction;
    var node = (_ex.nodeRef && _ex.nodeRef.alive) ? _ex.nodeRef
              : (S.gatherNodes && _ex.nodeId
                 ? S.gatherNodes.find(function (n) { return n.id === _ex.nodeId; })
                 : null);
    if (!node) { S._extraction = null; return false; }
    /* accuracy comes from the phase-2 gesture grade (ExtractionSwipeLayer);
       defaults to 'good' for any legacy caller. Keyed into MINIGAME_REWARDS. */
    var result = { accuracy: (accuracy === 'perfect' || accuracy === 'ok') ? accuracy : 'good' };
    if (_ex.skill === 'fishing')      applyFishingReward(S, node, result, deps);
    else if (_ex.skill === 'woodcutting') applyWoodReward(S, node, result, deps);
    else if (_ex.skill === 'mining')      applyMiningReward(S, node, result, deps);
    S._extraction = null;
    return true;
}

function applyFishingReward(S, node, result, deps) {
  var setRpgState = deps.setRpgState;
    var R = S && S.rpg;
    if (!node || !R) return;
    var accuracy = (result && result.accuracy) || 'good';
    var reward = MINIGAME_REWARDS[accuracy] || MINIGAME_REWARDS.good;
    BT_AUDIO.beep(600, 0.03, 0.06, 'triangle');
    /* Consume node */
    node.alive = false;
    node.respawnAt = Date.now() + (node.respawnTime || 30000);
    /* When the server owns gather-node state, tell it about the harvest so
       it broadcasts the deplete + respawn to every other player.  Local
       mutation above stays as a client-prediction so the player sees the
       node disappear immediately; the tick delta reconciles on arrival. */
    if (S._serverGatherNodes && S.channel) {
      try {
        /* v2.3.229: attach extraction swipe fingerprint when present
           so the server's anomaly tracker (per the v2.3.229 hand-off
           note) can flag suspicious sessions. Field is optional. */
        var _swipeFp = (S._extraction && S._extraction.swipeFp) || null;
        var _np = { id: node.id, zone: S.currentZone, accuracy: accuracy };
        if (_swipeFp) _np.swipeFp = _swipeFp;
        S.channel.send({ type: 'node_strike', payload: _np });
      } catch (e) {}
    }
    /* Inventory grant for the resource itself (fish_clownfish, etc.).
       When the server owns gather nodes the worker's _handleNodeStrike
       applies the grant + emits player_state; we skip the local
       mutation here so the server's value isn't double-counted.  For
       dungeon / SP zones the local path stays as the fallback. */
    var baseName = node.baseName || node.name || 'Fish';
    /* v2.3.853: one fish per catch regardless of reel accuracy (owner) --
       matches the server's _harvestYieldMult cap for fishSpot.  Drives both
       the SP/dungeon local grant and the floating "+Minnow" popup, so neither
       shows a phantom x2. */
    var yieldQty = 1;
    if (!R.inventory) R.inventory = {};
    if (!S._serverGatherNodes) {
      var baseKey = (node.resourceType || 'fish') + '_' + baseName.replace(/\s+/g, '_').toLowerCase();
      R.inventory[baseKey] = (R.inventory[baseKey] || 0) + yieldQty;
    }
    /* Elemental shard is server-rolled in MP (worker's _handleNodeStrike
       owns the RNG and emits harvest_credit).  Skill XP is now applied
       LOCALLY in both modes as a client-side prediction so the skill
       level moves up immediately on harvest; the server's player_state
       push reconciles with authoritative xp/level on arrival. v2.3.224. */
    var xpAmt = Math.ceil((node.xp || 10) * reward.xpMult);
    var leveled = false;
    if (!S._serverGatherNodes) {
      var _shardF1 = rollHarvestShard(S.currentZone);
      if (_shardF1) {
        R.inventory[_shardF1] = (R.inventory[_shardF1] || 0) + 1;
        var _shardDesc1 = shardByKey(_shardF1);
        S.dmgNumbers.push({ x: node.x, y: node.y - 54, text: '+ ' + (_shardDesc1 ? _shardDesc1.label : 'Shard'), color: (_shardDesc1 && _shardDesc1.color) || '#cce6ff', ts: Date.now() });
      }
    }
    if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
    leveled = addLifeSkillXp(R.lifeSkills, 'fishing', xpAmt);
    /* Counters (client-side; not part of the rpg cheat surface). */
    if (!R._compStats) R._compStats = createDefaultCompStats();
    R._compStats.fishCaught = (R._compStats.fishCaught || 0) + 1;
    /* Floating numbers near the node (deterministic; safe to predict
       client-side regardless of who owns the state). */
    S.dmgNumbers.push({ x: node.x, y: node.y - 10, text: reward.label, color: reward.color, ts: Date.now() });
    S.dmgNumbers.push({ x: node.x, y: node.y - 22, text: baseName + (yieldQty > 1 ? ' x' + yieldQty : ''), color: node.color, ts: Date.now() });
    S.dmgNumbers.push({ x: node.x, y: node.y - 38, text: '+' + xpAmt + ' Fishing XP', color: '#00d4b8', ts: Date.now() });
    if (leveled) {
      S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 50, text: 'Fishing Level ' + R.lifeSkills.fishing.level + '!', color: '#f5c542', ts: Date.now() });
      BT_AUDIO.collect();
    }
    /* v2.3.845: the catch pops out of the pond and flies into the quick-bag.
       effectsRenderer._updateCatchFlights renders it; the pond (node) is the
       launch point and #bt-bag-target is the landing point. */
    if (!S._catchFlights) S._catchFlights = [];
    S._catchFlights.push({ wx: node.x, wy: node.y, t0: Date.now(), dur: 850, qty: yieldQty });
    setRpgState(_objectSpread({}, R));
    try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
}

function applyWoodReward(S, node, result, deps) {
  var setRpgState = deps.setRpgState;
    var R = S && S.rpg;
    if (!node || !R) return;
    var accuracy = (result && result.accuracy) || 'good';
    var reward = MINIGAME_REWARDS[accuracy] || MINIGAME_REWARDS.good;
    /* v2.3.849: the felled-tree "timber" crash (was a placeholder beep). */
    try { if (BT_AUDIO.play) BT_AUDIO.play('tree-fall', { vol: 0.8 }); else BT_AUDIO.beep(500, 0.03, 0.06, 'triangle'); } catch (e) {}
    node.alive = false;
    node.respawnAt = Date.now() + (node.respawnTime || 30000);
    /* v2.3.849: a wood-log icon pops out of the felled tree and flies into
       the bottom-left inventory, so the harvest reads as "collected".
       Pure DOM (document.body, like the resume spinner) — world->screen is
       node minus camera (the world canvas is pinned top-left, 1:1). */
    _flyResourceToInventory(S, node.x, node.y - 24, '/icons/wood/wood-log.png');
    /* When the server owns gather-node state, tell it about the harvest so
       it broadcasts the deplete + respawn to every other player.  Local
       mutation above stays as a client-prediction so the player sees the
       node disappear immediately; the tick delta reconciles on arrival. */
    if (S._serverGatherNodes && S.channel) {
      try {
        /* v2.3.229: attach extraction swipe fingerprint when present
           so the server's anomaly tracker (per the v2.3.229 hand-off
           note) can flag suspicious sessions. Field is optional. */
        var _swipeFp = (S._extraction && S._extraction.swipeFp) || null;
        var _np = { id: node.id, zone: S.currentZone, accuracy: accuracy };
        if (_swipeFp) _np.swipeFp = _swipeFp;
        S.channel.send({ type: 'node_strike', payload: _np });
      } catch (e) {}
    }
    /* Resource inventory grant on the worker when authoritative;
       local fallback for dungeon / SP. */
    var baseName = node.baseName || node.name || 'Pine';
    /* v2.3.851: one log per tree — woodcutting ignores the perfect-accuracy
       2x yield multiplier (owner: "should only give one").  (MP is server-
       authoritative; the matching server change is in server/src/index.js
       _harvestYieldMult and takes effect on deploy.) */
    var yieldQty = 1;
    if (!R.inventory) R.inventory = {};
    if (!S._serverGatherNodes) {
      var baseKeyW = (node.resourceType || 'wood') + '_' + baseName.replace(/\s+/g, '_').toLowerCase();
      R.inventory[baseKeyW] = (R.inventory[baseKeyW] || 0) + yieldQty;
    }
    /* v2.3.224: skill XP applied locally in both SP and MP for instant
       feedback; server's player_state reconciles. Shard roll is still
       MP-server-only (non-deterministic RNG). */
    var xpAmt = Math.ceil((node.xp || 10) * reward.xpMult);
    var leveled = false;
    if (!S._serverGatherNodes) {
      var _shardF2 = rollHarvestShard(S.currentZone);
      if (_shardF2) {
        R.inventory[_shardF2] = (R.inventory[_shardF2] || 0) + 1;
        var _shardDesc2 = shardByKey(_shardF2);
        S.dmgNumbers.push({ x: node.x, y: node.y - 54, text: '+ ' + (_shardDesc2 ? _shardDesc2.label : 'Shard'), color: (_shardDesc2 && _shardDesc2.color) || '#cce6ff', ts: Date.now() });
      }
    }
    if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
    leveled = addLifeSkillXp(R.lifeSkills, 'woodcutting', xpAmt);
    if (!R._compStats) R._compStats = createDefaultCompStats();
    R._compStats.treesFelled = (R._compStats.treesFelled || 0) + 1;
    S.dmgNumbers.push({ x: node.x, y: node.y - 10, text: reward.label, color: reward.color, ts: Date.now() });
    S.dmgNumbers.push({ x: node.x, y: node.y - 22, text: baseName + (yieldQty > 1 ? ' x' + yieldQty : ''), color: node.color, ts: Date.now() });
    S.dmgNumbers.push({ x: node.x, y: node.y - 38, text: '+' + xpAmt + ' Woodcutting XP', color: '#00d4b8', ts: Date.now() });
    if (leveled) {
      S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 50, text: 'Woodcutting Level ' + R.lifeSkills.woodcutting.level + '!', color: '#f5c542', ts: Date.now() });
      BT_AUDIO.collect();
    }
    setRpgState(_objectSpread({}, R));
    try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
}

function applyMiningReward(S, node, result, deps) {
  var setRpgState = deps.setRpgState;
    var R = S && S.rpg;
    if (!node || !R) return;
    var accuracy = (result && result.accuracy) || 'good';
    if (accuracy === 'miss') {
      BT_AUDIO.beep(180, 0.04, 0.08, 'sawtooth');
      S.dmgNumbers.push({ x: node.x, y: node.y - 10, text: 'Miss!', color: '#ef4444', ts: Date.now() });
      return;
    }
    var reward = MINIGAME_REWARDS[accuracy] || MINIGAME_REWARDS.good;
    BT_AUDIO.beep(700, 0.04, 0.07, 'square');
    node.alive = false;
    node.respawnAt = Date.now() + (node.respawnTime || 30000);
    /* When the server owns gather-node state, tell it about the harvest so
       it broadcasts the deplete + respawn to every other player.  Local
       mutation above stays as a client-prediction so the player sees the
       node disappear immediately; the tick delta reconciles on arrival. */
    if (S._serverGatherNodes && S.channel) {
      try {
        /* v2.3.229: attach extraction swipe fingerprint when present
           so the server's anomaly tracker (per the v2.3.229 hand-off
           note) can flag suspicious sessions. Field is optional. */
        var _swipeFp = (S._extraction && S._extraction.swipeFp) || null;
        var _np = { id: node.id, zone: S.currentZone, accuracy: accuracy };
        if (_swipeFp) _np.swipeFp = _swipeFp;
        S.channel.send({ type: 'node_strike', payload: _np });
      } catch (e) {}
    }
    /* Resource inventory grant on the worker when authoritative;
       local fallback for dungeon / SP. */
    var baseName = node.baseName || node.name || 'Copper Ore';
    var yieldQty = reward.yieldMult || 1;
    if (!R.inventory) R.inventory = {};
    if (!S._serverGatherNodes) {
      var baseKeyM = (node.resourceType || 'ore') + '_' + baseName.replace(/\s+/g, '_').toLowerCase();
      R.inventory[baseKeyM] = (R.inventory[baseKeyM] || 0) + yieldQty;
    }
    /* v2.3.224: skill XP applied locally in both SP and MP for instant
       feedback; server's player_state reconciles. Shard roll is still
       MP-server-only (non-deterministic RNG). */
    var xpAmt = Math.ceil((node.xp || 10) * reward.xpMult);
    var leveled = false;
    if (!S._serverGatherNodes) {
      var _shardF3 = rollHarvestShard(S.currentZone);
      if (_shardF3) {
        R.inventory[_shardF3] = (R.inventory[_shardF3] || 0) + 1;
        var _shardDesc3 = shardByKey(_shardF3);
        S.dmgNumbers.push({ x: node.x, y: node.y - 54, text: '+ ' + (_shardDesc3 ? _shardDesc3.label : 'Shard'), color: (_shardDesc3 && _shardDesc3.color) || '#cce6ff', ts: Date.now() });
      }
    }
    if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
    leveled = addLifeSkillXp(R.lifeSkills, 'mining', xpAmt);
    if (!R._compStats) R._compStats = createDefaultCompStats();
    R._compStats.oresMined = (R._compStats.oresMined || 0) + 1;
    S.dmgNumbers.push({ x: node.x, y: node.y - 10, text: reward.label, color: reward.color, ts: Date.now() });
    S.dmgNumbers.push({ x: node.x, y: node.y - 22, text: baseName + (yieldQty > 1 ? ' x' + yieldQty : ''), color: node.color, ts: Date.now() });
    S.dmgNumbers.push({ x: node.x, y: node.y - 38, text: '+' + xpAmt + ' Mining XP', color: '#00d4b8', ts: Date.now() });
    if (leveled) {
      S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 50, text: 'Mining Level ' + R.lifeSkills.mining.level + '!', color: '#f5c542', ts: Date.now() });
      BT_AUDIO.collect();
    }
    setRpgState(_objectSpread({}, R));
    try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
}

export function applyCookingResult(S, fishKey, kind, taps, deps) {
  var setRpgState = deps.setRpgState;
    var R = S && S.rpg;
    if (!R || !fishKey) return;
    /* Popups fire client-side regardless of who applies the state --
       they're deterministic from `kind`.  The actual inventory mutation
       + cooking XP gain go through the server when the channel is open;
       fallback to local apply otherwise (SP / disconnected). */
    if (kind === 'cooked') {
      S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 30, text: 'Cooked!', color: '#f5c542', ts: Date.now() });
      S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 46, text: '+8 Cooking XP', color: '#00d4b8', ts: Date.now() });
    } else {
      S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 30, text: 'Burnt!', color: '#ff5e6c', ts: Date.now() });
    }
    if (S.channel) {
      /* Server-mediated path: cook_request lets the worker validate
         the player has the raw fish, consume it, and apply cooked or
         burnt_dust + cooking XP server-side.  Authoritative inventory
         comes back via player_state.  Closes the "cook a fish you
         don't own" cheat. */
      /* v2.3.694: carry the flip taps ({t, frac}) so the server can re-verify
         both landed in the golden zone instead of trusting `kind`.  Old
         server tolerates the extra field; new server validates it. */
      try { S.channel.send({ type: 'cook_request', payload: { fishKey: fishKey, kind: kind, taps: taps || [] } }); } catch (e) {}
      return;
    }
    /* Fallback: no channel (SP / dungeon offline). */
    if (!R.inventory) R.inventory = {};
    if ((R.inventory[fishKey] || 0) > 0) R.inventory[fishKey] -= 1;
    if (R.inventory[fishKey] <= 0) delete R.inventory[fishKey];
    if (kind === 'cooked') {
      var cookedKey = 'cooked_' + fishKey;
      R.inventory[cookedKey] = (R.inventory[cookedKey] || 0) + 1;
      if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
      addLifeSkillXp(R.lifeSkills, 'cooking', 8);
    } else {
      R.inventory.burnt_dust = (R.inventory.burnt_dust || 0) + 1;
    }
    setRpgState(_objectSpread({}, R));
    try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
}
