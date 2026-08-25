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
import { BT_AUDIO, EXTRACT_WINDOW_MS, MINIGAME_REWARDS, addLifeSkillXp, computeOpenDelay, createDefaultCompStats, migrateLifeSkills } from '@/data/index.js';
import { celebrateLifeSkillLevel } from '@/game/levelCelebration.js'; /* v2.3.1915 */
import { rollHarvestShard, shardByKey } from '@/data/shards.js';
import { _objectSpread } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* v2.3.849: fly a harvested-resource icon from its world node into the
   bottom-left inventory.  DOM-only (appended to document.body, like the
   resume spinner) so it floats above the canvas/HUD and animates on the
   compositor; world->screen is node minus camera (world canvas pinned
   top-left, 1:1 CSS px).  No-ops outside the browser. */
function _flyResourceToInventory(S, wx, wy, iconUrl, opts) {
  try {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    var cam = (S && S.camera) || { x: 0, y: 0 };
    /* v2.3.1429: world->screen now applies the world canvas scale (the
       "1:1 CSS px" note above predates S._worldScaleX) -- same mapping
       the node-prompt anchor uses, so the icon launches ON the node at
       every viewport size. */
    var _scX = (S && S._worldScaleX) || 1, _scY = (S && S._worldScaleY) || 1;
    var sx = (wx - cam.x) * _scX, sy = (wy - cam.y) * _scY;
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
    /* Target: the toolbar's Bag button — the item visibly flies "into
       the bag".  v2.3.1290 (three-state nav): the resting band is
       toolbar-only, so the button rect IS the bag's home; fall back to
       just above the 72px bar if the toolbar isn't mounted. */
    var tx = 46, ty = window.innerHeight - 72 + 18;
    try {
      var bagBtn = document.querySelector('.bt-dashboard-nav-button[aria-label="Bag"]');
      if (bagBtn) {
        var br = bagBtn.getBoundingClientRect();
        tx = br.left + br.width / 2;
        ty = br.top + br.height / 2;
      }
    } catch (e2) {}
    var _fly = function () {
      img.style.transition = 'transform .7s cubic-bezier(.45,.05,.3,1),opacity .7s ease-in';
      img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(0.55)';
      img.style.opacity = '0.15';
      setTimeout(function () { try { img.remove(); } catch (e) {} }, 760);
    };
    if (opts && opts.pop) {
      /* v2.3.1429 (owner): "the icon appears out of the water and jumps
         to your bag" — stage 1 breaches: starts small AT the water line
         and pops up ~36 px to full size, THEN stage 2 flies to the bag. */
      img.style.transition = 'transform .25s ease-out';
      img.style.transform = 'translate(' + sx + 'px,' + sy + 'px) scale(0.35)';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          img.style.transform = 'translate(' + sx + 'px,' + (sy - 36) + 'px) scale(1.1)';
        });
      });
      setTimeout(_fly, 280);
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(_fly);
      });
    }
  } catch (e) {}
}

export function startExtraction(S, node, skill, extra) {
    if (!S || !node) return;
    /* v2.3.854: mining lines the character up with the vein the same way
       fishing lines up with the pond.  Seat the player above the ore so the
       pickaxe strike (the baked rock in the south 'mine' sheet, centered
       ~(+7, +40) px from the body) lands on the real ore -- which is rendered
       ABOVE the player during mining (effectsRenderer) to hide that baked
       rock.  ~70 px keeps us inside EXTRACT_CANCEL_R (90).  This replaces the
       old "must stand one tile north" gate: tapping the vein from anywhere in
       range snaps you in, exactly like the fish-spot. */
    if (skill === 'mining' && S.player) {
      S.player.x = node.x - 7;
      S.player.y = node.y - 86;   /* baked rock (~+40 below body) lands on the
                                     ore's opaque mass (~46px above its base) */
      S.player.vx = 0; S.player.vy = 0;
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
    /* v2.3.853: cooking carries the chosen raw fish key so succeed/burn can
       apply the cook outcome (the "node" is the campfire, not a gather node). */
    if (extra) { for (var _k in extra) S._extraction[_k] = extra[_k]; }
    /* v2.3.230: tell the server we started so it can validate the
       eventual node_strike's timing against the same computeOpenDelay
       window we just rolled.  Server treats missing extraction_start
       as a permissive fallback (no rejection), so this is the latency
       anti-cheat hook, not a hard gate. */
    /* v2.3.853: cooking happens at a client-local campfire (no server gather
       node and no node_strike — the reward flows through cook_request), so
       skip the extraction_start handshake for it. */
    if (S.channel && skill !== 'cooking') {
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
    if (_ex.skill === 'cooking')      applyCookingResult(S, _ex.fishKey, 'cooked', [], deps);
    else if (_ex.skill === 'fishing')      applyFishingReward(S, node, result, deps);
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
    /* v2.3.1429 (owner): real water splash on the catch (the beep(600)
       it replaces has been a no-op since v2.3.1103). */
    try { BT_AUDIO.play('catch-splash', { vol: 0.65 }); } catch (e) {}
    /* v2.3.1445 (owner): the splash BURST plays only while reeling
       (effectsRenderer's _reelSpinAt beat) — the catch keeps just the
       splash sample + the fish-to-bag flight. */
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
        pushDmgPopup(S, node.x, node.y - 54, '+ ' + (_shardDesc1 ? _shardDesc1.label : 'Shard'), (_shardDesc1 && _shardDesc1.color) || '#cce6ff');
      }
    }
    if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
    /* v2.3.1915: the level BEFORE the award, so a multi-level jump can say
       so. The owner's report was not "I missed a level", it was "I missed
       TWO" — and a banner reading Level 7 tells someone who last looked at
       5 nothing about what happened in between. */
    var _fishLvlBefore = (R.lifeSkills['fishing'] && R.lifeSkills['fishing'].level) || 0;
    leveled = addLifeSkillXp(R.lifeSkills, 'fishing', xpAmt);
    /* Counters (client-side; not part of the rpg cheat surface). */
    if (!R._compStats) R._compStats = createDefaultCompStats();
    R._compStats.fishCaught = (R._compStats.fishCaught || 0) + 1;
    /* Floating numbers near the node (deterministic; safe to predict
       client-side regardless of who owns the state). */
    pushDmgPopup(S, node.x, node.y - 10, reward.label, reward.color);
    pushDmgPopup(S, node.x, node.y - 22, baseName + (yieldQty > 1 ? ' x' + yieldQty : ''), node.color);
    pushDmgPopup(S, node.x, node.y - 38, '+' + xpAmt + ' Fishing XP', '#00d4b8');
    if (leveled) {
      /* v2.3.1915: the BANNER, not just a world popup — see
         celebrateLifeSkillLevel. The popup stays as the in-world echo. */
      celebrateLifeSkillLevel(S, 'fishing', R.lifeSkills.fishing.level, _fishLvlBefore);
      pushDmgPopup(S, S.player.x, S.player.y - 50, 'Fishing Level ' + R.lifeSkills.fishing.level + '!', '#f5c542');
      BT_AUDIO.collect();
    }
    /* v2.3.845: the catch pops out of the pond and flies into the quick-bag.
       v2.3.1429 (owner: "show the ICON appear out of the water and jump to
       your bag"): the tiny procedural silhouette (_updateCatchFlights) is
       replaced by the wood-harvest DOM flyer carrying the fish's REAL bag
       icon, with a breach stage before the flight.  Icon mapping mirrors
       InventoryPanel's FISH_THUMBS (kept inline: rendering-free module,
       and the game layer shouldn't import the panel). */
    var _fishKey = 'fish_' + baseName.replace(/\s+/g, '_').toLowerCase();
    var _fishIcon = ({
      fish_clownfish: '/icons/items/fish-clownfish.webp?v=2.3.1452',
      fish_trout: '/icons/items/fish-trout.webp?v=2.3.1452',
    })[_fishKey] || '/icons/items/fish-minnow.webp?v=2.3.1452';
    _flyResourceToInventory(S, node.x, node.y - 4, _fishIcon, { pop: true });
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
       v2.3.1430 (owner: "make that true for each life skill"): upgraded to
       the fish-catch treatment — the CURRENT bag icon (icons/items/) with
       the breach-pop stage before the flight, launched from the trunk. */
    _flyResourceToInventory(S, node.x, node.y - 60, '/icons/items/wood-log.webp?v=2.3.1452', { pop: true });
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
        pushDmgPopup(S, node.x, node.y - 54, '+ ' + (_shardDesc2 ? _shardDesc2.label : 'Shard'), (_shardDesc2 && _shardDesc2.color) || '#cce6ff');
      }
    }
    if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
    /* v2.3.1915: the level BEFORE the award, so a multi-level jump can say
       so. The owner's report was not "I missed a level", it was "I missed
       TWO" — and a banner reading Level 7 tells someone who last looked at
       5 nothing about what happened in between. */
    var _wcLvlBefore = (R.lifeSkills['woodcutting'] && R.lifeSkills['woodcutting'].level) || 0;
    leveled = addLifeSkillXp(R.lifeSkills, 'woodcutting', xpAmt);
    if (!R._compStats) R._compStats = createDefaultCompStats();
    R._compStats.treesFelled = (R._compStats.treesFelled || 0) + 1;
    pushDmgPopup(S, node.x, node.y - 10, reward.label, reward.color);
    pushDmgPopup(S, node.x, node.y - 22, baseName + (yieldQty > 1 ? ' x' + yieldQty : ''), node.color);
    pushDmgPopup(S, node.x, node.y - 38, '+' + xpAmt + ' Woodcutting XP', '#00d4b8');
    if (leveled) {
      /* v2.3.1915 */
      celebrateLifeSkillLevel(S, 'woodcutting', R.lifeSkills.woodcutting.level, _wcLvlBefore);
      pushDmgPopup(S, S.player.x, S.player.y - 50, 'Woodcutting Level ' + R.lifeSkills.woodcutting.level + '!', '#f5c542');
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
      pushDmgPopup(S, node.x, node.y - 10, 'Miss!', '#ef4444');
      return;
    }
    var reward = MINIGAME_REWARDS[accuracy] || MINIGAME_REWARDS.good;
    BT_AUDIO.beep(700, 0.04, 0.07, 'square');
    node.alive = false;
    node.respawnAt = Date.now() + (node.respawnTime || 30000);
    /* v2.3.1430 (owner): the ore's bag icon pops out of the vein and flies
       into the Bag — fish-catch treatment for mining too.  ore-copper is
       the only ore art in the bag catalog (ItemsPanel ORE_THUMB_DEFAULT),
       so every tier ships it until per-tier art exists. */
    _flyResourceToInventory(S, node.x, node.y - 40, '/icons/items/ore-copper.webp?v=2.3.1452', { pop: true });
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
        pushDmgPopup(S, node.x, node.y - 54, '+ ' + (_shardDesc3 ? _shardDesc3.label : 'Shard'), (_shardDesc3 && _shardDesc3.color) || '#cce6ff');
      }
    }
    if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
    /* v2.3.1915: the level BEFORE the award, so a multi-level jump can say
       so. The owner's report was not "I missed a level", it was "I missed
       TWO" — and a banner reading Level 7 tells someone who last looked at
       5 nothing about what happened in between. */
    var _mnLvlBefore = (R.lifeSkills['mining'] && R.lifeSkills['mining'].level) || 0;
    leveled = addLifeSkillXp(R.lifeSkills, 'mining', xpAmt);
    if (!R._compStats) R._compStats = createDefaultCompStats();
    R._compStats.oresMined = (R._compStats.oresMined || 0) + 1;
    pushDmgPopup(S, node.x, node.y - 10, reward.label, reward.color);
    pushDmgPopup(S, node.x, node.y - 22, baseName + (yieldQty > 1 ? ' x' + yieldQty : ''), node.color);
    pushDmgPopup(S, node.x, node.y - 38, '+' + xpAmt + ' Mining XP', '#00d4b8');
    if (leveled) {
      /* v2.3.1915 */
      celebrateLifeSkillLevel(S, 'mining', R.lifeSkills.mining.level, _mnLvlBefore);
      pushDmgPopup(S, S.player.x, S.player.y - 50, 'Mining Level ' + R.lifeSkills.mining.level + '!', '#f5c542');
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Cooked!', '#f5c542');
      pushDmgPopup(S, S.player.x, S.player.y - 46, '+40 Cooking XP', '#00d4b8');   /* v2.3.1435: x5 (server lockstep) */
      /* v2.3.1429 (owner): success sizzle sting — distinct from the
         pan-sizzle loop, which the extraction clear silences this tick. */
      try { BT_AUDIO.play('cook-success', { vol: 0.6 }); } catch (e) {}
      /* v2.3.1430 (owner): the cooked dish pops off the pan and flies to
         the Bag — fish-catch treatment for cooking.  This runs BEFORE
         succeedExtraction nulls S._extraction (same ordering the swipeFp
         block below relies on), so the campfire node is still reachable;
         fall back to the player if it isn't. */
      try {
        var _cookNode = (S._extraction && S._extraction.nodeRef) || S._campfire;
        var _lx = (_cookNode && _cookNode.x != null) ? _cookNode.x : S.player.x;
        var _ly = (_cookNode && _cookNode.y != null) ? _cookNode.y - 36 : S.player.y - 20;
        var _cookedIcon = ({
          fish_clownfish: '/icons/items/cooked-clownfish.webp?v=2.3.1452',
          fish_trout: '/icons/items/cooked-trout.webp?v=2.3.1452',
        })[fishKey] || '/icons/items/cooked-minnow.webp?v=2.3.1452';
        _flyResourceToInventory(S, _lx, _ly, _cookedIcon, { pop: true });
      } catch (e) {}
    } else {
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Burnt!', '#ff5e6c');
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
      var _cookPayload = { fishKey: fishKey, kind: kind, taps: taps || [] };
      /* v2.3.1146: the flip GESTURE fingerprint (ExtractionSwipeLayer
         computes it for cooking like every other skill, but it never rode
         the wire — the tap mechanic the v2.3.694 `taps` field was built
         for was replaced by the swipe-flip).  Caps-gated so old workers
         never see the field; this call runs before succeedExtraction
         nulls S._extraction, so the fp is still reachable here. */
      if (S._serverCaps && S._serverCaps.botfp && S._extraction
          && S._extraction.skill === 'cooking' && S._extraction.swipeFp) {
        _cookPayload.swipeFp = S._extraction.swipeFp;
      }
      try { S.channel.send({ type: 'cook_request', payload: _cookPayload }); } catch (e) {}
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
      /* v2.3.1435: x5.  v2.3.1765 (owner: "Lifeskills xp is far too slow"):
         x5 again -> 25x.  Server mirror: cooking.js _handleCookRequest —
         keep in lockstep, the worker is authoritative and a drift here just
         means the client's number is taken back by the next player_state. */
      addLifeSkillXp(R.lifeSkills, 'cooking', 200);
    } else {
      R.inventory.burnt_dust = (R.inventory.burnt_dust || 0) + 1;
    }
    setRpgState(_objectSpread({}, R));
    try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
}
