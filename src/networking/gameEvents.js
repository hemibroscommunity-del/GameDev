/* ═══ GAME EVENTS — the server/peer event dispatcher (40+ message types) ═══ */
import { lockOntoDuelOpponent } from '@/game/duelLock.js'; /* v2.3.2145 */
import { DMG_CRIT_COLOR } from '@/rendering/systems/effectsRenderer.js'; /* v2.3.2212: one crit colour, every door */
/* v2.3.783: _processGameEvent moved verbatim from the inline WS client in
   src/ui/BroTown.jsx (REBUILD-PLAN Phase 4, behavior-frozen). It handles
   both batched `tick.events` entries and direct sends (see
   docs/WIRE-PROTOCOL.md for the full message inventory).
   Closure captures became explicit:
   - module imports below (data tables, variant helpers, combat/chat
     helpers, babel runtime) per the extracted-module rule — never rely on
     the globalThis copies;
   - React setters + the effect-scoped _buildServerPile arrive via `deps`
     (destructured to the original names so the body is untouched).
   S is stateRef.current. */
import { _onBroNonce, _onBroResult } from './broWallet.js'; /* v2.3.1576 */
import { shopBus } from '../ui/mobile/shopBus.js';   /* v2.3.2050 */
import { capeStatusBus } from '../ui/mobile/capeStatusBus.js'; /* v2.3.2118 */
import { BT_AUDIO, ZONES, TILE, ARENA_CHAMPION_REWARD, ARENA_WIN_REWARD, CLAN_WAR_REWARDS, createDefaultCompStats, recalcDerived, DEATH_GOLD_PENALTY, PVP_THREAT_CONSENT_MS, updateZoneDimensions, generateZoneMap, trainDefense, getGuildRank, SKILL_GUILDS } from '@/data/index.js';
import { MONSTER_VARIANTS, maybeTransformMonster, isRemnantSkull, xpMultFor } from '@/data/monsterVariants.js';
import { prog3Live } from '@/data/prog3.js'; /* v2.3.1727: the kill-XP popup is a legacy number under prog3 */
/* v2.3.1734: Element Burst paints the element's status onto the local
   monster objects (the server owns statuses and never syncs them) — see
   the element_nova case. */
import { ELEMENTS } from '@/data/elements.js';
import { STATUS_DEFS, applyStatus } from '@/data/gameSystems.js';
import { rollMonsterShard } from '@/data/shards.js';
import { isWearingArmor } from '@/rendering/gearCatalog.js'; /* v2.3.1598: armoured-hit SFX check */
/* BT_API_BASE: same window.BROTOWN_WS_URL-derived value BroTown computes at
   its own module scope — the barrel export is the canonical copy. */
import { BT_API_BASE } from '@/networking/index.js';
import { pushHudPopup } from '@/ui/XpFlyOverlay.jsx';
import { enqueuePeerDamage, peerDmgKey, distributeKillXpToBuild, applyMeleeLifesteal, addBuildUse, pushDmgPopup, monsterPopupY, isAttackInShieldArc, spawnHitDebris, spawnGroundDecal /* v2.3.2200 */ } from '@/game/combatHelpers.js';
import { dropShield } from '@/game/shieldToggle.js'; /* v2.3.2242: a landed block lowers the shield */
import { handleChatEvent, handleEmoteEvent, handlePartyChatEvent, handleAreaChatEvent, handleWhisperEvent, handleWhisperErrorEvent } from '@/game/chat.js'; /* v2.3.2136: the @area / @user lanes */
import { applyServerMuteList } from '@/game/chatMute.js'; /* v2.3.1981 */
import { pushAbilityRings } from '@/game/abilities.js'; /* v2.3.1735: a peer's bash draws the caster's own shockwave */
import { friendsSrv } from '@/ui/mobile/sheet/friendsSync.js'; /* v2.3.1324 */
import { _objectSpread, _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

/* ═══ v2.3.2232: THE DAMAGE NUMBER NAMES THE WEAPON THAT DEALT IT ═══
 *
 * Owner: "Monsters are showing melee damage from bow and melee and magic
 * damage from magic."
 *
 * Since v2.3.2220 the popup for EVERY own hit in a server zone is painted
 * from monster_hit rather than from the local prediction -- and that site
 * passed `iconKey: 'sword'` flat, so a bow hit and a staff hit both came
 * out marked as melee.  The mark had been right before: the local ranged
 * prediction picks 'arrow'/'spell' (projectiles.js) and still does; what
 * v2.3.2220 changed was WHICH popup the player ends up reading.
 *
 * `slot` now rides on the event (server/src/combat.js v2.3.2232), which
 * also answers it for PEER hits -- another player's weapon is not knowable
 * locally at any price, which is why peer numbers carried no mark at all.
 *
 * DEPLOY-ORDER (rule 19): an older worker sends no slot, so this falls back
 * to the slot WE are holding.  That is right for our own hits at anything
 * but a weapon swap inside the round trip, and for a peer it declines to
 * guess rather than marking their arrow with our sword. */
const SLOT_ICON = { melee: 'sword', ranged: 'arrow', staff: 'spell' };

/* ═══ v2.3.2233: A CRIT IS NOT ALWAYS A SWORD ═══
 *
 * Owner, after v2.3.2232 marked ordinary hits correctly: "Damage still shows
 * sword icon (melee) for bow damage."  It did, and this is why -- the crit
 * mark (/icons/ui/hero/crit.webp) is a gold starburst with a STEEL BLADE
 * through it, and it was stamped on every critical hit whatever dealt it.
 * Since v2.3.2211 a crit is also the loudest number on screen (38px in
 * DMG_CRIT_COLOR against 21px white), so the one number a player is sure to
 * read was the one asserting a sword.
 *
 * The crit reads as a crit from its SIZE and COLOUR alone -- that is what
 * v2.3.2211 built and what the owner approved ("I like the new crit") -- so
 * the icon slot is free to carry the thing it was getting wrong.  A crit now
 * takes the weapon mark; `crit: true` still drives the big yellow treatment.
 *
 * If the burst is wanted back, the fix is per-weapon crit art (a burst with
 * an arrow, a burst with a bolt) rather than one blade for all three; that
 * is an art call, not a code one. */
export function dmgIconForSlot(S, payload, isOwn) {
  const fromWire = payload && SLOT_ICON[payload.slot];
  if (fromWire) return fromWire;
  if (!isOwn) return undefined;
  const R = S && S.rpg;
  return SLOT_ICON[(R && R.activeSlot) || 'melee'] || 'sword';
}
import { saveRpgSoon } from '@/game/rpgSave.js'; /* v2.3.1356 */

/* v2.3.1107: angle -> 8-way compass, same SECTORS convention as
   entityRenderer (atan2(dy,dx) -> 'east' when dx>0).  Used to reconcile a
   remote's BODY facing with the angle carried by its action events
   (swing/dodge/bow) -- those angles were applied to the action stand-in
   only, so under broadcast latency the body could face one way while the
   swing pointed another.  The next move broadcast (sender's own `f`)
   overwrites this, so it's a between-packets correction, never a fork. */
/* v2.3.1193: threat-skull marks (docs/specs/threats.md, "Skull
   rendering").  S._threatMarks[pid] = { type:'red'|'white', until }
   drives the 💀 entityRenderer draws over OTHER players; the local
   player's own skull rides the previously ORPHANED S._pvpSkullType /
   S._pvpSkullUntil anchors (InspectPlayerPanel writes them at
   threat-issue; the handlers below keep them authoritative).  Pure
   display state derived from the relayed, server-validated handshake —
   never sent back to the server, and time-bounded (≤10-min consent
   window) so reconnects/deploys just let stale marks age out. */
/* v2.3.1970: mirrors PARTY.INVITE_TTL in server/src/party.js -- the window the
   worker keeps a recorded invite for.  Mirrored rather than imported because
   the client has no copy of the server's config objects; if that number moves,
   move this one (a client clock that is SHORTER would hide a still-valid
   invite, which is the failure worth avoiding). */
var PARTY_INVITE_TTL_MS = 60000;

function _setThreatMark(S, pid, type, until) {
  if (!pid || typeof pid !== 'string' || pid === S.myId) return;
  if (!S._threatMarks) S._threatMarks = {};
  S._threatMarks[pid] = { type: type, until: until };
}

/* v2.3.1574 (owner: "combat attacks broadcast to every zone in multiplayer
   where the other player is.  Keep it only where they are").
   Combat FX ride the room-wide broadcast channel -- there is one GameRoom for
   the whole world, and #327's tick scoping deliberately left this path alone
   because it carries chat/clan/trade alongside combat.  So a peer swinging in
   the Flame Fields sends their swing to everyone, in every zone.
   The BODY renderers already drop out-of-zone peers (entityRenderer's remote
   loop, this file's harvest stand-ins), which is why this never showed as a
   floating torso -- but the effects that do NOT go through a peer's body
   container still landed: their arrow flew across your screen, their dodge
   smear painted your zone, their damage popup opened over your ground.
   Peers carry their zone on every tick payload (wsClient sets `.zone` from
   `data.z`), so gate on that.  An UNKNOWN sender is dropped too: we cannot
   place them, and the renderers would not draw their body either. */
function _peerInZone(S, id) {
  var o = S && S.others && S.others[id];
  if (!o) return false;
  return (o.zone || o.z || 'town') === S.currentZone;
}

var _FACING8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
function _reconcileFacing(other, ang) {
  if (!other || typeof ang !== 'number' || !isFinite(ang)) return;
  var sector = Math.round(ang / (Math.PI / 4));
  other._renderFacing = _FACING8[((sector % 8) + 8) % 8];
}

export function processGameEvent(type, payload, S, deps) {
  var setRpgState = deps.setRpgState,
    pixiRef = deps.pixiRef,
    setChatLog = deps.setChatLog,
    setUnreadChats = deps.setUnreadChats,
    setDuelRequest = deps.setDuelRequest,
    setThreatIncoming = deps.setThreatIncoming,
    setLevelUpMsg = deps.setLevelUpMsg,
    setIncomingTrade = deps.setIncomingTrade,
    setTrade2 = deps.setTrade2,
    setParty = deps.setParty,
    setArenaTournament = deps.setArenaTournament,
    setArenaBets = deps.setArenaBets,
    setClanData = deps.setClanData, /* v2.3.1611 */
    _buildServerPile = deps._buildServerPile;
        switch (type) {
          case 'loot_drop':
            {
              /* Server-authoritative pile from a monster kill.  Push to
                 local groundLoot if not already present -- the worker
                 also includes new piles in state_sync / zone_loot for
                 joiners, so the same id may arrive twice. */
              if (!payload || !payload.pile || !S.groundLoot) break;
              var _existing = S.groundLoot.find(function (l) { return l.lootId === payload.pile.lootId; });
              if (_existing) break;
              S.groundLoot.push(_buildServerPile(payload.pile, S.myId));
              break;
            }
          case 'loot_claimed':
            {
              /* Broadcast: another player claimed against this pile.
                 If they were the first claimer, the one-of inventory
                 portion is gone -- null it on our local copy so the
                 visual reverts to a plain coin pile and a subsequent
                 pickup doesn't try to claim the inventory again. */
              if (!payload || !payload.lootId || !S.groundLoot) break;
              for (var _lcj = 0; _lcj < S.groundLoot.length; _lcj++) {
                var _loCl = S.groundLoot[_lcj];
                if (_loCl.lootId !== payload.lootId) continue;
                if (payload.inventoryClaimedNow) {
                  _loCl.inventoryClaimed = true;
                  _loCl.skull = null;
                  _loCl.shard = null;
                }
                /* v2.3.1141: weapon has its own claim flag; clear the
                   glow/label on everyone's copy once someone takes it. */
                if (payload.weaponClaimedNow) {
                  _loCl.hasWeapon = false;
                }
                /* If WE are the one who claimed, the loot_credit case
                   (top-level) handles the local despawn -- nothing
                   else to do here for the picker. */
                break;
              }
              break;
            }
          case 'loot_despawn':
            {
              /* Server says the pile is done -- last recipient claimed
                 or 60 s expiry hit.  Mark expired so renderer + filter
                 clear it.  v2.3.113: also immediate-dispose so a frame
                 of latency between _expired and the orphan sweep can't
                 leave a stale coin sprite (mummy / skeleton bug). */
              if (!payload || !payload.lootId || !S.groundLoot) break;
              for (var _lde = 0; _lde < S.groundLoot.length; _lde++) {
                if (S.groundLoot[_lde].lootId === payload.lootId) {
                  S.groundLoot[_lde]._expired = true;
                  break;
                }
              }
              try {
                if (pixiRef.current && pixiRef.current.disposeLootById) {
                  pixiRef.current.disposeLootById(payload.lootId);
                }
              } catch (_e) {}
              break;
            }
          /* ═══ v2.3.2050: SHOPKEEPER BRO'S TWO ANSWERS ═══
             Both are server-emitted (PRIVILEGED_EVENTS), so what arrives here
             is the room's own arithmetic and not another client's claim.
             `shop_state` is BROADCAST on every sale, not just to the player
             who made it: the pile is public, so someone with the window open
             watches it move as other people trade. */
          case 'shop_state': {
            const _sp = payload || {};
            shopBus.setStock(_sp.items || []);
            break;
          }
          /* v2.3.2057: a stack price, quoted without moving anything. */
          case 'shop_quoted': {
            const _sq = payload || {};
            shopBus.setQuote(_sq.ok ? _sq : null);
            break;
          }
          /* ═══ v2.3.2101: WHERE THE CONTEST STANDS, IN THE CHAT ═══
             The drop was reported dead four separate times and every round
             went on guessing at state nobody could see -- the kill switch,
             the rate and the ledger all live in durable worker storage,
             readable only through an admin endpoint behind a secret. The
             wiring was correct throughout (driving the kill resolver grants
             the ticket); what was missing was a window into it.

             So the worker now says, on join, whether the contest is running,
             how many of the three are left and the rate it will actually
             roll. A player wants to know all three during an event, and when
             it goes wrong again this line is the diagnosis instead of an
             afternoon of inference. */
          case 'cape_status': {
            const _cs = payload || {};
            const _c = (_cs.capes && _cs.capes.crimson) || null;
            const _pct = Math.round((_cs.rate || 0) * 100);
            const _line = !_cs.live
              ? 'Golden ticket event: not running.'
              : _c && _c.remaining === null
                ? 'Golden ticket event: running (counting tickets\u2026)'
                : _c && _c.remaining > 0
                  ? `Golden ticket event: ${_c.remaining} of ${_c.cap} left, ~${_pct}% per kill.`
                  : 'Golden ticket event: all tickets have been found.';
            /* ═══ v2.3.2117: OFF THE BOARD, NOT OUT OF REACH ═══
             * Owner: "Hide the gold ticket message board, it covers the left
             * joystick."
             *
             * This line used to go into world chat, and in a quiet room it was
             * the ONLY line — which is what made the board permanent.  The feed
             * renders nothing at all when nobody has said anything
             * (WorldChatFeed's "quiet when empty"), so a status message posted
             * on every single join is the difference between a lower-left
             * corner that is clear and one that has a 260px panel parked over
             * the joystick from the moment you load.  A status readout should
             * not be able to hold a chat panel open.
             *
             * It is not deleted, because of why it exists: v2.3.2101 added it
             * after the drop was reported dead four times and every round was
             * spent guessing at state nobody could see — the kill switch, the
             * rate and the ledger all live in durable storage and are invisible
             * from source.  Blinding that again to clear a corner would trade a
             * layout problem for the diagnostic one it was built to end.  So it
             * goes to the console, where it costs no pixels and is one devtools
             * tab away, and to a field QA can read without parsing chat. */
            try { console.log('[bt] ' + _line); } catch (e) { /* ignore */ }
            try { S._capeStatusLine = _line; } catch (e) { /* ignore */ }
            /* v2.3.2118: and to the chip (owner: "one line near chat like
               #/# golden tickets left").  The RAW payload, because the chip
               wants numbers, not this sentence.  Via a bus because this
               message arrives once, on join, usually before WorldChatFeed
               mounts — see capeStatusBus.js. */
            try { capeStatusBus.set(_cs); } catch (e) { /* ignore */ }
            break;
          }
          case 'shop_result': {
            const _sr = payload || {};
            if (_sr.ok && _sr.kind === 'shop_sell') {
              shopBus.setNote(`Sold ${_sr.sold} for ${_sr.paid} coins.`, true);
            } else if (_sr.ok && _sr.kind === 'shop_buy') {
              shopBus.setNote(`Bought ${_sr.bought} for ${_sr.cost} coins.`, true);
            } else {
              /* His refusal, in his words -- "He's full of those" reads as a
                 shopkeeper; "error" reads as a broken game. */
              shopBus.setNote(_sr.error || 'He shakes his head.', false);
            }
            break;
          }

          case 'chat':
            {
              /* v2.3.767: body moved to src/game/chat.js (Phase 2). */
              handleChatEvent(payload, S, { setChatLog: setChatLog, setUnreadChats: setUnreadChats });
              break;
            }
          case 'emote':
            {
              /* v2.3.767: body moved to src/game/chat.js (Phase 2). */
              handleEmoteEvent(payload, S);
              break;
            }
          case 'campfire_lit':
            {
              /* ═══ v2.3.1753: THE OTHER PLAYER'S FIRE ═══
                 Owner: "yes make both peers see a campfire."  A campfire used
                 to exist only on the client that lit it, so a watcher saw a
                 peer crouch, stand, and then cook over bare ground.
                 Kept in a MAP keyed by the lighter's id — rule 4, not a plain
                 object, because the key is client-supplied and a plain {}
                 no-ops on '__proto__' (three incidents on 2026-07-07).  One
                 entry per player, so the collection is bounded by the room
                 rather than by how many fires anyone lights, and re-lighting
                 replaces your own rather than stacking.
                 Everything here is defensive because the relay is room-wide
                 and a client emits this: own echo dropped, other zones
                 dropped (the v2.3.1748 rule), coordinates and lifetime
                 sanitised, and the fuse capped at the 45s the game itself
                 uses +5s of slack so a forged payload cannot plant a fire
                 that burns forever. */
              if (!payload || payload.id === S.myId) break;
              if ((payload.zone || 'town') !== S.currentZone) break;
              var _cfX = Number(payload.x), _cfY = Number(payload.y);
              if (!isFinite(_cfX) || !isFinite(_cfY)) break;
              if (!S._peerCampfires) S._peerCampfires = new Map();
              var _cfExp = Number(payload.expiresAt) || 0;
              var _cfCap = Date.now() + 50000;
              S._peerCampfires.set(String(payload.id), {
                x: _cfX, y: _cfY, zone: payload.zone || 'town',
                litAt: Date.now(),
                expiresAt: Math.min(_cfExp > Date.now() ? _cfExp : Date.now() + 45000, _cfCap),
              });
              break;
            }
          case 'party_chat':
            {
              /* v2.3.1212: server-validated party-only chat (item D
                 follow-up). Body in chat.js beside the room-chat path. */
              handlePartyChatEvent(payload, S, { setChatLog: setChatLog, setUnreadChats: setUnreadChats });
              break;
            }
          /* v2.3.2136: the @area and @user lanes (server/src/chatlanes.js).
             Bodies in chat.js beside the room and party paths, so all four
             lanes clamp, block and mute the same way. */
          case 'area_chat':
            {
              handleAreaChatEvent(payload, S, { setChatLog: setChatLog, setUnreadChats: setUnreadChats });
              break;
            }
          case 'whisper':
            {
              handleWhisperEvent(payload, S, { setChatLog: setChatLog, setUnreadChats: setUnreadChats });
              break;
            }
          case 'whisper_error':
            {
              handleWhisperErrorEvent(payload, S, { setChatLog: setChatLog });
              break;
            }
          /* v2.3.1324: friends system (server/src/friends.js).  The doc
             sync is the single truth for list/requests; DMs append to
             the local thread archive (the server backlog is delivered-
             once).  A one-time migration graduates the legacy local
             bt_friends follows into real requests. */
          case 'friend_sync':
            {
              friendsSrv.setDoc(payload);
              try {
                if (S._serverCaps && S._serverCaps.friends && S.channel
                    && !localStorage.getItem('bt_friendsMigrated')) {
                  var _legacy = JSON.parse(localStorage.getItem('bt_friends') || '[]');
                  for (var _li = 0; _li < _legacy.length && _li < 25; _li++) {
                    var _lf = _legacy[_li];
                    var _lid = (_lf && _lf.id) || _lf;
                    if (!_lid || (payload.list && payload.list[_lid]) || (payload.reqOut && payload.reqOut[_lid])) continue;
                    S.channel.send({ type: 'broadcast', event: 'friend_request', payload: { target: _lid, name: (_lf && _lf.name) || 'Bro' } });
                  }
                  localStorage.setItem('bt_friendsMigrated', '1');
                }
              } catch (_e) {}
              break;
            }
          case 'friend_request_in':
          case 'friend_accepted':
            /* Display state rides the friend_sync that accompanies
               every mutation; these are notification hooks (badge
               refresh happens via the store's emit on that sync). */
            break;
          case 'friend_dm':
            {
              if (payload && payload.from) friendsSrv.appendDm(payload.from, payload, false);
              break;
            }
          case 'friend_dm_backlog':
            {
              var _msgs = (payload && payload.messages) || [];
              for (var _mi = 0; _mi < _msgs.length; _mi++) {
                if (_msgs[_mi] && _msgs[_mi].from) friendsSrv.appendDm(_msgs[_mi].from, _msgs[_mi], false);
              }
              break;
            }
          case 'friend_error':
            {
              friendsSrv.setError(payload || null);
              break;
            }
          /* v2.3.1981: chat moderation (server/src/chatmod.js).  The mute
             list is the SERVER's — it arrives on join and after every
             mutation, and replaces this browser's localStorage mirror so
             a mute made on one device is in force on the next. */
          case 'chat_mute_list':
            {
              applyServerMuteList(payload, S);
              if (payload && payload.error === 'list-full' && S.player) {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Mute list is full', '#D95C54');
              }
              break;
            }
          case 'chat_report_ack':
            {
              /* The only feedback a reporter gets, and it matters: without
                 it the button is indistinguishable from a button that does
                 nothing, which is how a safety control loses its users. */
              var _rrOk = !!(payload && payload.ok);
              /* Last ack, kept on S so a headless check can ask what the
                 WORKER answered rather than racing the popup's 3s ttl
                 (tools/qa/mp/mp-chat.mjs). */
              S._lastReportAck = payload || null;
              var _rrMsg = _rrOk ? 'Report sent to the moderators'
                : (payload && payload.error) === 'duplicate' ? 'Already reported just now'
                  : (payload && String(payload.error || '').indexOf('rate-') === 0) ? 'Too many reports — try later'
                    : 'Report failed';
              if (S.player) pushDmgPopup(S, S.player.x, S.player.y - 30, _rrMsg, _rrOk ? '#59BF91' : '#D95C54', { ttl: 3 });
              break;
            }
          case 'gamble_result':
            {
              /* v2.3.1124: server-rolled gamble outcome (private).  The
                 coins already moved server-side and arrive via the
                 authoritative player_state echo -- this event only
                 drives the win/loss feedback, mirroring the visuals the
                 legacy local roll produced (GamblePanel). */
              var _gR = S.rpg;
              if (!_gR) break;
              if (!_gR._compStats) _gR._compStats = createDefaultCompStats();
              _gR._compStats.totalGambled += payload.wager || 0;
              _gR._compStats.totalGoldSpent += payload.wager || 0;
              if (payload.won) {
                _gR._compStats.totalGambleWon += payload.payout || 0;
                _gR._compStats.totalGoldEarned += payload.payout || 0;
                S._gambleResult = { won: true, amount: payload.payout || 0, ts: Date.now() };
                pushDmgPopup(S, S.player.x, S.player.y - 30, '+' + (payload.payout || 0) + 'g!', '#3dd497');
                S.screenShake = 3;
                BT_AUDIO.collect();
              } else {
                _gR._compStats.totalGambleLost += payload.wager || 0;
                S._gambleResult = { won: false, amount: payload.wager || 0, ts: Date.now() };
                pushDmgPopup(S, S.player.x, S.player.y - 30, '-' + (payload.wager || 0) + 'g', '#ff5e6c');
                BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
              }
              setRpgState(_objectSpread({}, _gR));
              break;
            }
          case 'jackpot_state':
            {
              /* v2.3.1149: server-authoritative jackpot pool (private;
                 sent on join and after a deposit).  Coins already moved
                 server-side (player_state echo) -- this drives the
                 GamblePanel pool display + the deposit popup. */
              S._jackpotPool = payload.pool || 0;
              S._jackpotTickets = payload.yourTickets || 0;
              if (payload.deposited) {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Deposited ' + payload.deposited + 'g to jackpot (' + (payload.yourTickets || 0) + ' 🎟️)', '#f5c542');
              }
              break;
            }
          case 'jackpot_result':
            {
              /* v2.3.1149: weekly draw settled (broadcast).  Winner's
                 gold rides _creditPlayer (online delivery or inbox). */
              S._jackpotPool = 0;
              S._jackpotTickets = 0;
              pushDmgPopup(S, S.player.x, S.player.y - 44, '🎰 ' + (payload.winnerName || 'Someone') + ' won the ' + (payload.amount || 0) + 'g jackpot!', '#f5c542', { ttl: 5 });
              try { BT_AUDIO.collect(); } catch (e) {}
              break;
            }
          case 'dungeon_started':
            {
              /* v2.3.1127: the worker accepted our dungeon_start (config
                 re-validated + clamped server-side) and pre-spawned wave
                 1 into a private instance zone.  Build the local arena
                 exactly like the legacy launchDungeon did, register a
                 synthetic ZONES entry so every ZONES[S.currentZone]
                 deref keeps working while we're inside, and step into
                 the instance -- the move's zone change makes the server
                 reply with zone_state, which flips S._serverMonsters
                 and delivers the wave. */
              if (!payload || !payload.zone) break;
              var _dCfg = payload.cfg || {};
              var _ddW = _dCfg.width || 25,
                _ddH = _dCfg.height || 20;
              S._preDungeonPos = { x: S.player.x, y: S.player.y };
              var _ddMap = Array.from({ length: _ddH }, function () { return Array(_ddW).fill(0); });
              for (var _ddx = 0; _ddx < _ddW; _ddx++) { _ddMap[0][_ddx] = 7; _ddMap[_ddH - 1][_ddx] = 7; }
              for (var _ddy = 0; _ddy < _ddH; _ddy++) { _ddMap[_ddy][0] = 7; _ddMap[_ddy][_ddW - 1] = 7; }
              var _ddMX = Math.floor(_ddW / 2),
                _ddMY = Math.floor(_ddH / 2);
              for (var _ddx2 = 1; _ddx2 < _ddW - 1; _ddx2++) _ddMap[_ddMY][_ddx2] = 1;
              for (var _ddy2 = 1; _ddy2 < _ddH - 1; _ddy2++) _ddMap[_ddy2][_ddMX] = 1;
              for (var _ddi = 0; _ddi < Math.floor(_ddW * _ddH * 0.08); _ddi++) {
                _ddMap[2 + Math.floor(Math.random() * (_ddH - 4))][2 + Math.floor(Math.random() * (_ddW - 4))] = 1;
              }
              _ddMap[_ddH - 1][_ddMX] = 9;
              _ddMap[_ddH - 1][_ddMX + 1] = 9;
              S.map = _ddMap;
              globalThis.TOWN_W = _ddW * TILE;
              globalThis.TOWN_H = _ddH * TILE;
              globalThis.COLS = _ddW;
              globalThis.ROWS = _ddH;
              /* Synthetic zone entry: not safe (combat works), not
                 lawless (PvP fails closed server-side anyway), empty
                 spawns (spawnMonstersForZone guards on it).  Tagged
                 _instance so exit paths only ever delete what we added
                 and the Encyclopedia can filter it. */
              ZONES[payload.zone] = {
                id: payload.zone, name: _dCfg.name || 'Dungeon', w: _ddW, h: _ddH,
                level: [_dCfg.monsterLevel || 1, _dCfg.monsterLevel || 1],
                element: _dCfg.element || null, safe: false, spawns: [], _instance: true
              };
              S._dungeonZone = S.currentZone; /* return zone for the tile-9 exit */
              S.currentZone = payload.zone;
              S._serverDungeon = payload.zone;
              S._inDungeon = true;
              S._inCustomDungeon = true;
              S._customDungeonConfig = _dCfg;
              S._dungeonDepth = 'shallow';
              S._dungeonWave = 0;
              S._dungeonMaxWaves = _dCfg.waves || 3;
              S._dungeonBossSpawned = false;
              S._dungeonComplete = false;
              S.monsters = [];
              S.gatherNodes = [];
              S.groundLoot = [];
              if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
              S.hitParticles = [];
              S.deathExplosions = [];
              S.arrows = [];
              S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */ S.snowballBursts = []; /* v2.3.2217: and an undrained burst would pop in the new zone at old coords */ S.arrowBlasts = []; /* v2.3.2279: same, for the bow blast */
              S.player.x = _ddMX * TILE;
              S.player.y = (_ddH - 3) * TILE;
              S._zoneWipe = Date.now();
              /* Step into the instance NOW (not on the next joystick
                 packet) so the wave-1 zone_state arrives immediately. */
              if (S.channel) {
                try { S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } }); } catch (e) {}
              }
              pushDmgPopup(S, S.player.x, S.player.y - 50, _dCfg.name || 'Dungeon', '#a070e0');
              pushDmgPopup(S, S.player.x, S.player.y - 35, 'Wave 1/' + (_dCfg.waves || 3), 'rgba(255,255,255,.5)');
              BT_AUDIO.beep(400, 0.1, 0.12, 'sine');
              break;
            }
          case 'dungeon_wave':
            {
              /* Server cleared the wave-advance check; the fresh wave
                 arrives via a zone_state re-push right before this. */
              if (!payload || payload.zone !== S._serverDungeon) break;
              S._dungeonWave = (payload.wave || 1) - 1;
              pushDmgPopup(S, S.player.x, S.player.y - 40, 'Wave ' + (payload.wave || 1) + '/' + (payload.total || S._dungeonMaxWaves), '#ff5e6c');
              BT_AUDIO.beep(300, 0.1, 0.15, 'sawtooth');
              S.screenShake = 4;
              break;
            }
          case 'dungeon_boss':
            {
              if (!payload || payload.zone !== S._serverDungeon) break;
              S._dungeonBossSpawned = true;
              pushDmgPopup(S, S.player.x, S.player.y - 50, 'BOSS FIGHT!', '#ff5e6c');
              BT_AUDIO.beep(100, 0.25, 0.3, 'sawtooth');
              S.screenShake = 8;
              break;
            }
          case 'dungeon_complete':
            {
              /* Rewards are settled server-side (coins ride the
                 authoritative player_state echo; XP is the server's
                 analytics counter) -- this event drives the win
                 feedback and the 3s return-home, mirroring the legacy
                 dungeonWaves completion visuals. */
              if (!payload || payload.zone !== S._serverDungeon) break;
              S._dungeonComplete = true;
              var _dcR = S.rpg;
              if (_dcR) {
                if (!_dcR._compStats) _dcR._compStats = createDefaultCompStats();
                if (payload.boss) _dcR._compStats.dungeonsCleared++;
                _dcR._compStats.totalGoldEarned += payload.gold || 0;
                setRpgState(_objectSpread({}, _dcR));
              }
              pushDmgPopup(S, S.player.x, S.player.y - 60, 'DUNGEON CLEARED!', '#f5c542');
              pushDmgPopup(S, S.player.x, S.player.y - 45, '+' + (payload.gold || 0) + 'G +' + (payload.xp || 0) + 'XP', '#f5c542');
              BT_AUDIO.levelUp();
              S.screenShake = 10;
              setTimeout(function () {
                if (!S._serverDungeon) return; /* already left via the exit tile */
                if (ZONES[S._serverDungeon] && ZONES[S._serverDungeon]._instance) delete ZONES[S._serverDungeon];
                S._serverDungeon = null;
                S._inDungeon = false;
                S._inCustomDungeon = false;
                S._customDungeonConfig = null;
                S._serverMonsters = false;
                /* v2.3.1406: per-zone loading — warm the farm map (idempotent;
                   usually still resident from the entry warp). */
                import('@/rendering/preloadAnimations.js').then(function (m) { return m.preloadZoneAssets('farm_home'); }).catch(function () {});
                S.currentZone = 'farm_home';
                updateZoneDimensions('farm_home');
                S.map = generateZoneMap('farm_home');
                var _fz = ZONES.farm_home;
                globalThis.TOWN_W = _fz.w * TILE;
                globalThis.TOWN_H = _fz.h * TILE;
                globalThis.COLS = _fz.w;
                globalThis.ROWS = _fz.h;
                S.monsters = [];
                S.gatherNodes = [];
                S.groundLoot = [];
                S.hitParticles = [];
                S.deathExplosions = [];
                S.arrows = [];
                S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */ S.snowballBursts = []; /* v2.3.2217: and an undrained burst would pop in the new zone at old coords */ S.arrowBlasts = []; /* v2.3.2279: same, for the bow blast */
                S.player.x = Math.floor(_fz.w / 2) * TILE;
                S.player.y = (_fz.h - 4) * TILE;
                S._zoneWipe = Date.now();
                if (S.channel) {
                  try { S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: 'farm_home', vx: 0, vy: 0 } }); } catch (e) {}
                }
              }, 3000);
              break;
            }
          case 'dungeon_error':
            {
              pushDmgPopup(S, S.player.x, S.player.y - 30, (payload && payload.message) || 'Dungeon unavailable', '#ff5e6c');
              BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
              break;
            }
          case 'parry':
            {
              /* ═══ v2.3.1731: PARRY ═══
                 Display-only.  The server decided this (it timestamps the
                 shield's raise and measures the hit against it) and the
                 damage negation already rode in on monster_attack — nothing
                 here may re-decide or re-apply anything.

                 NOT routed through blockRingBus.resolveIncoming, despite
                 that being the dormant parry code this feature was supposed
                 to wake: it runs its OWN 150ms timing test, so calling it
                 would mean two authorities disagreeing about whether a parry
                 happened, and the client would lose that argument on every
                 laggy phone.  The ring's decision function stays dormant;
                 only the celebration is wanted here. */
              if (!payload || !S.player) break;
              if (payload.targetId && S.myId && payload.targetId !== S.myId) break;
              var _pX = typeof payload.x === 'number' ? payload.x : S.player.x;
              var _pY = typeof payload.y === 'number' ? payload.y : S.player.y;
              pushDmgPopup(S, S.player.x, S.player.y - 46, 'PARRY!', '#8FD6A0');
              if (!S._impactRings) S._impactRings = [];
              S._impactRings.push({
                x: _pX, y: _pY, ts: Date.now(), color: '#8FD6A0', maxR: 46, duration: 320,
              });
              BT_AUDIO.beep(880, 0.07, 0.16, 'triangle');
            }
            break;

          /* ═══ v2.3.2279: THE BOW SPECIAL'S BLAST -- the visual half ═══
             Server-emitted (server/src/arrowblast.js) and DISPLAY-ONLY: every
             point of its damage already arrived on monster_hit, so a client
             that drops this still has a correct game, it just misses the
             fireball.  Drawn for EVERYONE in the zone, including the shooter
             -- the client does not predict it -- so there is one source of
             truth for where it went off and nobody sees a second ghost
             explosion beside the real one.
             The queue is drained by effectsRenderer._updateArrowBlasts, which
             sizes the sprite off `r`, the server's own blast radius, so a
             retune on the worker needs no client edit. */
          case 'arrow_boom':
            {
              if (!payload) break;
              if (payload.zone && S.currentZone && payload.zone !== S.currentZone) break;
              if (typeof payload.x !== 'number' || typeof payload.y !== 'number') break;
              if (!S.arrowBlasts) S.arrowBlasts = [];
              /* Bounded: a burst of these must never grow the queue faster
                 than the renderer drains it (one frame). */
              if (S.arrowBlasts.length < 8) {
                S.arrowBlasts.push({ x: payload.x, y: payload.y, r: payload.r, at: Date.now() });
              }
              /* v2.3.2279 QA: the server's own blast point, kept after the
                 renderer drains the queue.  A scenario that inferred it from
                 the arrow's last known position measured the wrong circle --
                 a stuck arrow rides a monster that is still walking. */
              S._lastArrowBoom = { x: payload.x, y: payload.y, r: payload.r, at: Date.now(),
                targets: payload.targets || [] };
              try { BT_AUDIO.play('tree-fall', { vol: 0.7 }); } catch (e) { /* audio is best-effort */ }
            }
            break;

          case 'element_nova':
            {
              /* ═══ v2.3.1734: ELEMENT BURST — the visual half ═══
                 Server-emitted (server/src/burst.js) and DISPLAY-ONLY for
                 damage: every point of it already arrived on monster_hit.
                 This paints two things, and the second one is why the
                 event exists at all:

                 1. The nova ring at the server's position and radius, in
                    the element's colour, plus a puff of that element's
                    ambient particles.  Drawn for everyone in the zone, so
                    a party sees each other's bursts.

                 2. THE STATUS, applied to each target's LOCAL monster
                    object.  The server owns statuses and does not sync
                    them — the client's own m.statuses map is what feeds
                    the ambient element particles (monsterCombat.js) and
                    the coloured pip row above the monster
                    (entityRenderer.js).  Without this the burst's whole
                    point (it applies your element to a pack) would be a
                    completely invisible mechanic.  Purely cosmetic: the
                    local tick runs with applyHp:false against a server
                    zone (v2.3.1114), so this never touches HP, and a
                    duration that drifts from the server's is a particle
                    fading early.  A status id the closed table doesn't
                    know renders nothing. */
              if (!payload || !S.monsters) break;
              if (payload.zone && S.currentZone && payload.zone !== S.currentZone) break;
              var _nvElem = ELEMENTS[payload.element] ? payload.element : null;
              if (!_nvElem) break; /* never render an arbitrary wire string */
              var _nvColor = ELEMENTS[_nvElem].color;
              var _nvNow = Date.now();
              var _nvX = payload.x || 0, _nvY = payload.y || 0;
              var _nvR = payload.r || 70;
              if (!S._impactRings) S._impactRings = [];
              /* Two rings at different rates read as an expanding shell
                 rather than a flat circle.  maxR is scaled by 1/1.5
                 because the renderer sweeps (0.5 + age) x maxR, so the
                 outer ring lands on the radius the server actually
                 tested — the same "never draw a lie about the radius"
                 rule the telegraph markers follow. */
              S._impactRings.push({ x: _nvX, y: _nvY, ts: _nvNow, color: _nvColor, maxR: _nvR / 1.5, duration: 420 });
              S._impactRings.push({ x: _nvX, y: _nvY, ts: _nvNow, color: '#ffffff', maxR: _nvR / 2.2, duration: 260 });
              if (S.hitParticles && S.hitParticles.length < 300) {
                for (var _nvI = 0; _nvI < 16; _nvI++) {
                  var _nvA = (_nvI / 16) * Math.PI * 2;
                  S.hitParticles.push({
                    x: _nvX, y: _nvY,
                    vx: Math.cos(_nvA) * (2 + Math.random() * 2.5),
                    vy: Math.sin(_nvA) * (1.4 + Math.random() * 1.8) - 0.6,
                    life: 0.55 + Math.random() * 0.3, color: _nvColor,
                    size: 1.5 + Math.random() * 1.5,
                  });
                }
              }
              if (payload.id === S.myId) S.screenShake = Math.max(S.screenShake || 0, 3);
              var _nvIds = Array.isArray(payload.targets) ? payload.targets : [];
              if (_nvIds.length && STATUS_DEFS[payload.status]) {
                /* One pass over the zone's monsters against a Set, rather
                   than a .find per target: a nova can name a dozen ids and
                   the zone list is walked every frame already. */
                var _nvSet = new Set(_nvIds);
                for (var _nvJ = 0; _nvJ < S.monsters.length; _nvJ++) {
                  var _nvM = S.monsters[_nvJ];
                  if (_nvM && _nvM.alive && _nvSet.has(_nvM.id)) {
                    applyStatus(_nvM, payload.status, null, _nvNow);
                  }
                }
              }
            }
            break;

          case 'monster_ability':
            {
              /* ═══ v2.3.1730: STANDARD-ZONE TELEGRAPHS ═══
                 Owner: "Monsters are also 'dumb' ... There's no strategy.
                 No timed blocking, no dodging."  Brutes and stalkers now
                 wind up a heavy attack (server/src/telegraph.js) and the
                 wind-up is the whole point — this renders the tell.

                 DISPLAY-ONLY, exactly like dungeon_boss_ability below: the
                 damage arrives on the authoritative monster_attack, so
                 nothing here may touch hp/alive/dmg.  An old client that
                 ignores this type still takes the correct damage and simply
                 does not see the warning, which is what makes the event
                 deploy-order safe with no caps flag (monster_projectile set
                 that precedent).

                 Separate case rather than a relaxed gate on the boss one:
                 that handler drops anything outside S._serverDungeon, and
                 widening it would let a dungeon event render in the
                 overworld.  The whitelist discipline is the same — an
                 unknown ability string renders nothing at all. */
              if (!payload || !S.player) break;
              if (payload.zone && S.currentZone && payload.zone !== S.currentZone) break;
              /* v2.3.1812: `lunge` is fodder's beginner tell (owner: "Yes
                 give fodder a tell").  This whitelist is the reason it
                 needs an entry AT ALL — an ability the client does not
                 know renders NOTHING, silently, which is this codebase's
                 signature failure.  server/test/mirror-audit now pins
                 these keys against TELEGRAPH.KITS so a future kit cannot
                 ship server-side and simply not appear.
                 Softer orange than the brute's amber and a smaller shake
                 below: the tell should read as "here it comes", not as
                 "you are in trouble". */
              var _maLabels = { slam: 'SLAM!', pounce: 'POUNCE!', lunge: 'LUNGE!' };
              var _maColors = { slam: '#f5c542', pounce: '#2C3E50', lunge: '#E8955A' };
              var _maShake = { slam: 8, pounce: 5, lunge: 3 };
              /* ═══ v2.3.2215: THE UNIVERSAL BASIC-ATTACK TELL ═══
                 Every monster now winds up before an ordinary swing or throw
                 (server/src/telegraph.js BASIC_WINDUP).  Handled ABOVE the
                 kit whitelist and returning early, because it is a different
                 kind of event: it fires roughly every 1.5s per engaged
                 monster, so it deliberately gets NO popup, NO screen shake
                 and NO beep — a label per jab would be noise, and the noise
                 is what made the shipped kit telegraphs unreadable.  What it
                 gets instead is the thing a player actually watches: the
                 monster's own body.  Whitelisted like the kits (mirror-audit
                 pins the pair) so a future server kind cannot render an
                 arbitrary wire string. */
              /* ═══ v2.3.2221: THE SNOW-PILE BURROW ═══
                 Three phases off one ability, each with its own strip.  The
                 pile sets _invulnerable, which is the SAME flag the boss
                 phases already use — so the IMMUNE popup on a swing into it
                 comes for free and reads identically to every other
                 "you can't hurt this right now" in the game.

                 Duration is stamped from the server's own ms, and the phase
                 self-clears when it expires (see entityRenderer): the server
                 sends no "done" event, and a delta cannot express a REMOVED
                 field, so a client that missed the last transition must be
                 able to recover on its own rather than hold the mound
                 forever. */
              /* ═══ v2.3.2224: THE BLUE SLIME'S DEATH BURST ═══
                 The swell IS the telegraph, so the ground ring uses the same
                 _telegraphZones the kits draw -- one visual language for
                 "this circle is about to hurt", rather than a second one the
                 player has to learn. */
              if (payload.ability === 'burst') {
                var _sbM = (S.monsters || []).find(function (mm) { return mm.id === payload.monsterId; });
                if (payload.phase === 'swell') {
                  var _sbMs = Math.max(120, Math.min(4000, Number(payload.ms) || 800));
                  if (_sbM) {
                    _sbM._burstFrom = Date.now();
                    _sbM._burstUntil = Date.now() + _sbMs;
                    _sbM._burstScale = Math.max(1, Math.min(6, Number(payload.scale) || 3.5));
                  }
                  /* v2.3.2226: THE DRAWN RING IS GONE.  Owner: "remove code
                     drawn impact areas for slime death" -- consistent with
                     their standing call that procedural effects read as
                     placeholder.  The SWELL is the telegraph now, on its own,
                     which is why the fuse doubled in the same change: a
                     slime tripling in size is the warning, and it needs the
                     extra time to be a fair one. */
                } else if (payload.phase === 'execute') {
                  if (_sbM) {
                    _sbM._burstUntil = 0; _sbM._burstFrom = 0;
                    /* v2.3.2227: hand the peak size to the death burst.  The
                       slime's own explosion (slime-death-v10, 15 frames) used
                       to play at 1x because clearing the swell snapped the
                       sprite back first -- so the thing that blew up was not
                       the thing that had just filled the screen.  The
                       renderer releases this on its own after the animation's
                       length, which it owns. */
                    _sbM._burstPeakFrom = Date.now();
                  }
                  /* v2.3.2226: and the ground splat with it -- it was a
                     minted radial blob sized to the blast, which is a
                     code-drawn impact area by another name.  What is left is
                     what does not look drawn: the camera kick and the sound.
                     A real goo-burst strip is the upgrade here. */
                  S.screenShake = Math.max(S.screenShake || 0, 10);
                  BT_AUDIO.beep(90, 0.16, 0.09, 'sawtooth');
                }
                break;
              }
              var _burPhases = { dig: 1, pile: 1, emerge: 1 };
              if (payload.ability === 'burrow' && _burPhases[payload.phase]) {
                var _buM = (S.monsters || []).find(function (mm) { return mm.id === payload.monsterId; });
                if (_buM) {
                  /* v2.3.2244 (post-review): the ceiling was 6000 from when
                     PILE_MAX_MS was 4000; v2.3.2225 doubled the pile to 8000
                     and left this behind, so the renderer's self-clear
                     (_burUntil + 500) surfaced him on the client at 6.5s
                     while the worker still had him intangible -- and, now,
                     hurting to touch -- for another 1.5s.  9000 covers the
                     cap with the same margin the old number had.
                     ═══ v2.3.2251: 9000 STAYS, THOUGH THE PILE IS NOW 3000 ═══
                     Tightening this to match the new cap looks tidy and is a
                     deploy-order regression: this client can meet a worker
                     still running the 8000ms pile (the worker deploys on merge,
                     the page can be a cached tab), and a 3000 ceiling would
                     self-clear the mound five seconds early -- rendering an
                     ordinary snowman who shrugs off hits and hurts to touch,
                     which is the v2.3.2244 bug in the other direction.  The
                     duration is carried on the event (`payload.ms`), so the
                     client never needs to know the constant; this is only a
                     sanity ceiling and it should stay ABOVE the largest value
                     any live worker might send. */
                  var _buMs = Math.max(80, Math.min(9000, Number(payload.ms) || 400));
                  _buM._burPhase = payload.phase;
                  _buM._burFrom = Date.now();
                  _buM._burUntil = Date.now() + _buMs;
                  _buM._invulnerable = payload.phase === 'pile';
                  /* A body mid-collapse has no swing to finish. */
                  _buM._shootAnimEnd = 0; _buM._tgUntil = 0;
                }
                break;
              }
              var _bwKinds = { swing: 1, throw: 1 };
              if (payload.phase === 'windup' && _bwKinds[payload.ability]) {
                var _bwMs = Math.max(80, Math.min(3000, Number(payload.ms) || 400));
                var _bwM = (S.monsters || []).find(function (mm) { return mm.id === payload.monsterId; });
                if (_bwM) {
                  /* The existing throb (entityRenderer _windupFx) reads these
                     two, so the tell is the same visual language as a kit
                     cast — just shorter and quieter. */
                  _bwM._tgFrom = Date.now();
                  _bwM._tgUntil = Date.now() + _bwMs;
                  /* And the ATTACK SHEET, for any monster that has one.  This
                     branch is why the sheets exist: _shootAnim* has been read
                     by the renderer for versions but was only ever written by
                     the client-local AI, which does not run for server-driven
                     monsters — so no monster in a live zone has ever played an
                     attack animation.  Every future per-monster attack strip
                     lights up here the moment its art lands, with no further
                     wiring. */
                  _bwM._shootAnimStart = Date.now();
                  _bwM._shootAnimEnd = Date.now() + _bwMs;
                  /* v2.3.2216: and WHICH basic this is, because the art is
                     not interchangeable.  The snowman's only attack strip is
                     a snowball throw, but he melee-pokes inside his 100px
                     minRange — which is exactly where you stand to fight him
                     — so stamping this field blind made every melee poke
                     play a throw: a ball appeared in his hand and no
                     projectile ever followed it.  The renderer gates the
                     throw strip on this. */
                  _bwM._shootAnimKind = payload.ability;
                  /* v2.3.2217: a stale release from the PREVIOUS throw would
                     make the renderer think this one has already left his
                     hand, so it plays the follow-through over the wind-up. */
                  _bwM._throwReleaseAt = 0;
                }
                break;
              }
              var _maLabel = _maLabels[payload.ability];
              if (!_maLabel) break; /* never render an arbitrary wire string */
              var _maX = typeof payload.x === 'number' ? payload.x : S.player.x;
              var _maY = typeof payload.y === 'number' ? payload.y : S.player.y;
              if (payload.phase === 'telegraph') {
                pushDmgPopup(S, _maX, _maY - 40, _maLabel, '#fbbf24');
                /* The ground marker is the readable half of the tell: it
                   shows WHERE, at the radius the server will actually test,
                   so stepping out is an informed choice rather than a
                   guess.  Drawn for the full wind-up. */
                if (typeof payload.ax === 'number' && typeof payload.ay === 'number') {
                  if (!S._telegraphZones) S._telegraphZones = [];
                  S._telegraphZones.push({
                    x: payload.ax, y: payload.ay, r: payload.radius || 55,
                    ts: Date.now(), duration: payload.ms || 800,
                    color: _maColors[payload.ability] || '#fbbf24',
                  });
                }
                /* ═══ v2.3.1811: AND MARK THE MONSTER ITSELF ═══
                   Owner: "add monster attack animations or just having you
                   add something to them so that way attacks are predictable
                   enough to block."
                   The ground marker above says WHERE and is genuinely the
                   readable half — but it is on the FLOOR, and the thing a
                   player watches in a fight is the enemy.  Stamping the
                   wind-up on the monster lets entityRenderer make the body
                   itself load up, so the tell is where the eye already is.
                   monsterId is already in this payload; no wire change. */
                if (payload.monsterId && S.monsters) {
                  for (var _tgi = 0; _tgi < S.monsters.length; _tgi++) {
                    var _tgm = S.monsters[_tgi];
                    if (_tgm && _tgm.id === payload.monsterId) {
                      _tgm._tgFrom = Date.now();
                      _tgm._tgUntil = Date.now() + (payload.ms || 800);
                      break;
                    }
                  }
                }
                BT_AUDIO.beep(400, 0.08, 0.1, 'sine');
                break;
              }
              /* execute — a landed hit shakes, a whiff deliberately does
                 not, so "I got out of the way" reads as a win on screen. */
              if (payload.hit) {
                if (!S._impactRings) S._impactRings = [];
                S._impactRings.push({
                  x: _maX, y: _maY, ts: Date.now(),
                  color: _maColors[payload.ability] || '#f5c542',
                  maxR: payload.radius || 55, duration: 400,
                });
                S.screenShake = _maShake[payload.ability] || 5;
                /* v2.3.2200: a landed telegraph also KICKS the camera
                   toward the impact — the big attacks should read bigger
                   than an ordinary hit's shake alone. */
                var _cpAngT = Math.atan2(_maY - S.player.y, _maX - S.player.x);
                S._camPunch = { dx: Math.cos(_cpAngT) * 8, dy: Math.sin(_cpAngT) * 8, ts: Date.now() };
                BT_AUDIO.beep(payload.ability === 'slam' ? 80 : (payload.ability === 'lunge' ? 200 : 150),
                  0.18, 0.22,
                  payload.ability === 'slam' ? 'sawtooth' : 'square');
              } else {
                pushDmgPopup(S, _maX, _maY - 30, 'MISS', '#8FD6A0');
                BT_AUDIO.beep(220, 0.06, 0.08, 'sine');
              }
            }
            break;

          case 'dungeon_boss_ability':
            {
              /* v2.3.1194: server-scripted boss ability notice
                 (handoff item F follow-up -- the slam/charge/summon/
                 sweep kit moved from the dead local boss AI into
                 dungeon.js).  DISPLAY-ONLY on purpose: warning popup at
                 telegraph, ring/shake/beep at execute, mirroring the
                 legacy monsterCombat.js visuals.  All damage arrives
                 via the authoritative monster_attack + player_state
                 events; never mutate HP or monsters here (v2.3.1199:
                 sole exception is the cosmetic color tint on enrage --
                 display state only, never hp/alive/dmg). */
              if (!payload || payload.zone !== S._serverDungeon) break;
              var _dbaLabels = { slam: 'SLAM!', charge: 'CHARGE!', summon: 'Summon!', sweep: 'SWEEP!', enrage: 'ENRAGED!', siphon: 'DRAIN!' };
              var _dbaColors = { slam: '#f5c542', charge: '#ea580c', summon: '#9333ea', sweep: '#a855f7', enrage: '#ff2020', siphon: '#22c55e' };
              var _dbaLabel = _dbaLabels[payload.ability];
              if (!_dbaLabel) break; /* whitelist -- never render arbitrary wire strings */
              var _dbaX = typeof payload.x === 'number' ? payload.x : S.player.x;
              var _dbaY = typeof payload.y === 'number' ? payload.y : S.player.y;
              if (payload.phase === 'telegraph') {
                /* Legacy telegraph read: amber "<ABILITY>!" over the boss. */
                pushDmgPopup(S, _dbaX, _dbaY - 40, _dbaLabel, '#fbbf24');
                BT_AUDIO.beep(400, 0.08, 0.1, 'sine');
                break;
              }
              /* Execute visuals per ability (legacy colors/shake). */
              pushDmgPopup(S, _dbaX, _dbaY - 30, _dbaLabel, _dbaColors[payload.ability]);
              if (payload.ability === 'slam' || payload.ability === 'sweep') {
                if (!S._impactRings) S._impactRings = [];
                S._impactRings.push({
                  x: _dbaX, y: _dbaY, ts: Date.now(),
                  color: _dbaColors[payload.ability],
                  maxR: payload.range || 80,
                  duration: payload.ability === 'slam' ? 400 : 300
                });
                S.screenShake = payload.ability === 'slam' ? 10 : 6;
                BT_AUDIO.beep(payload.ability === 'slam' ? 80 : 150, 0.2, 0.25, payload.ability === 'slam' ? 'sawtooth' : 'square');
              } else if (payload.ability === 'charge') {
                BT_AUDIO.beep(200, 0.15, 0.2, 'sawtooth');
              } else if (payload.ability === 'enrage') {
                /* v2.3.1199: soft anti-stall timer armed / ramped
                   server-side (BOSS_ABILITIES.ENRAGE).  Legacy enrage
                   visuals (monsterCombat.js: red popup + shake + low
                   sawtooth) plus a cosmetic red tint on the boss
                   sprite.  Best-effort tint: a full zone re-push (or
                   any v1 dirty-list resend) restores the server color,
                   but the event repeats every ramp step so it comes
                   back; the popup is the primary signal. */
                var _dbaBoss = (S.monsters || []).find(function (mm) { return mm && mm.id === payload.monsterId; });
                if (_dbaBoss) _dbaBoss.color = '#ff2020';
                if (payload.stacks > 1) {
                  pushDmgPopup(S, _dbaX, _dbaY - 45, '+' + (payload.pct || 0) + '% DMG', '#ff2020');
                }
                S.screenShake = 6;
                BT_AUDIO.beep(120, 0.2, 0.3, 'sawtooth');
              } else if (payload.ability === 'siphon') {
                /* v2.3.1217: life-drain.  DISPLAY-ONLY like the rest --
                   the boss's actual HP gain rides the authoritative
                   monster tick delta; here we just surface the heal as a
                   green "+N" over the boss and a rising two-note chime. */
                if (typeof payload.heal === 'number' && payload.heal > 0) {
                  pushDmgPopup(S, _dbaX, _dbaY - 45, '+' + payload.heal, '#22c55e');
                }
                BT_AUDIO.beep(500, 0.12, 0.18, 'sine');
              } else {
                /* summon -- the fresh minions arrive via the zone_state
                   re-push that precedes this event. */
                BT_AUDIO.beep(300, 0.1, 0.15, 'square');
              }
              break;
            }
          case 'arena_stake_placed':
            {
              /* v2.3.1128: the worker escrowed our sponsorship stake
                 (gold already debited server-side; the player_state
                 echo shows it).  Private ack -- just the confirm UI. */
              if (!payload) break;
              pushDmgPopup(S, S.player.x, S.player.y - 30, 'Staked ' + (payload.amount || 0) + 'G on ' + (payload.targetName || 'a gladiator'), '#f5c542');
              break;
            }
          case 'arena_stake_result':
            {
              /* v2.3.1128: server-observed match settled our stake --
                 3x credit already applied via _creditPlayer (or the
                 stake went to the winning competitor).  Visuals only. */
              if (!payload) break;
              var _stR = S.rpg;
              if (payload.won) {
                if (_stR && _stR._compStats) _stR._compStats.totalGoldEarned += payload.payout || 0;
                if (!S.stats._betsWon) S.stats._betsWon = 0;
                S.stats._betsWon++;
                pushDmgPopup(S, S.player.x, S.player.y - 50, 'SPONSORSHIP PAID! +' + (payload.payout || 0) + 'G', '#3dd497');
                BT_AUDIO.collect();
              } else {
                pushDmgPopup(S, S.player.x, S.player.y - 50, 'Stake lost (-' + (payload.amount || 0) + 'G)', '#ff5e6c');
              }
              if (_stR) setRpgState(_objectSpread({}, _stR));
              break;
            }
          case 'arena_stake_error':
            {
              pushDmgPopup(S, S.player.x, S.player.y - 30, (payload && payload.message) || 'Stake rejected', '#ff5e6c');
              BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
              break;
            }
          case 'arena_stake_board':
            {
              /* v2.3.1210: server-summed spectator stake board (display
                 only -- PRIVILEGED, so it can't be forged; the worker
                 recomputes it from the escrow ledger on each
                 placement/settlement).  Stored on the state object and
                 read by PartyPanel's arena view (which re-renders on its
                 3s poll) -- no self-mint, no coin touch.  This is NOT
                 the legacy arena_bet relay (TRAPS #1); it's a distinct
                 privileged type carrying only per-competitor sums. */
              S._arenaStakeBoard = (payload && Array.isArray(payload.board)) ? payload.board : [];
              break;
            }
          case 'guild_quest_result':
            {
              /* v2.3.1128: server-verified guild quest turn-in.  Gold
                 and AP are already applied server-side (authoritative
                 player_state echo); here we adopt the server's ladder
                 index into the client-owned _guildProgress UI field and
                 replay the completion visuals the old local mint drew
                 (GuildPanel).  ADOPT, don't increment -- a re-sent
                 result can't double-advance the ladder. */
              if (!payload || !payload.skill) break;
              var _gqR = S.rpg;
              if (!_gqR) break;
              if (!_gqR._guildProgress) _gqR._guildProgress = {};
              _gqR._guildProgress[payload.skill] = (payload.index || 0) + 1;
              var _gqLvl = (_gqR.lifeSkills && _gqR.lifeSkills[payload.skill] && _gqR.lifeSkills[payload.skill].level) || 1;
              var _gqRank = getGuildRank(_gqLvl);
              if (!_gqR._titles) _gqR._titles = [];
              var _gqTitle = _gqRank.title + ' ' + payload.skill.replace(/([A-Z])/g, ' $1').trim();
              if (!_gqR._titles.includes(_gqTitle)) _gqR._titles.push(_gqTitle);
              if (_gqR._compStats) {
                _gqR._compStats.totalGoldEarned += payload.gold || 0;
                _gqR._compStats.questsCompleted++;
              }
              if (!S.stats._guildRanksEarned) S.stats._guildRanksEarned = 0;
              S.stats._guildRanksEarned++;
              if (_gqRank.rank >= 5) {
                if (!S.stats._guildMasterCount) S.stats._guildMasterCount = 0;
                S.stats._guildMasterCount++;
              }
              var _gqG = SKILL_GUILDS[payload.skill] || {};
              pushDmgPopup(S, S.player.x, S.player.y - 40, (_gqG.name || 'Guild') + ' quest complete!', _gqG.color || '#f5c542');
              pushDmgPopup(S, S.player.x, S.player.y - 25, '+' + (payload.gold || 0) + 'G +' + (payload.ap || 0) + 'AP', '#f5c542');
              BT_AUDIO.collect();
              setRpgState(_objectSpread({}, _gqR));
              try {
                localStorage.setItem('bt_rpg', JSON.stringify(_gqR));
              } catch (e) {}
              break;
            }
          case 'guild_quest_error':
            {
              pushDmgPopup(S, S.player.x, S.player.y - 30, (payload && payload.message) || 'Turn-in rejected', '#ff5e6c');
              BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
              break;
            }
          case 'inbox_delivered':
            {
              /* v2.3.1117: offline mail landed (market refund, trade
                 payout, wager return).  The credits are already applied
                 server-side and arrive via the authoritative player_state
                 echo -- this event only drives the "you received X"
                 system message.  A dedicated mail panel can replace this
                 later; the payload shape is docs/specs/inbox-escrow.md. */
              var _inbEntries = (payload && payload.entries) || [];
              for (var _ie = 0; _ie < _inbEntries.length; _ie++) {
                var _e = _inbEntries[_ie] || {};
                var _ep = _e.payload || {};
                /* v2.3.2037 (owner: "remove the 25 gold message").  The daily
                   login reward is 25 gold (CADENCE.DAILY_BASE_GOLD) and it
                   rides _creditPlayer like any other delivery, so it printed
                   "📫 You received +25 gold (Daily reward — day 1)" into chat
                   on EVERY login -- the first thing anyone read, every time.
                   Only the LINE is dropped; the gold is still paid, and the
                   coin counter still moves. Filtered on `source`, which
                   inbox.js already puts on the wire, rather than on the text
                   or the amount: a real delivery of 25 gold from a trade is
                   still worth announcing, and a match on "25" would have
                   silenced that too. */
                if (_e.source === 'daily') continue;
                var _what = _e.kind === 'gold' ? '+' + (_ep.amount || 0) + ' gold'
                  : _e.kind === 'item' ? (_ep.count || 1) + '× ' + (_ep.invKey || 'item')
                  : _e.kind === 'weapon' ? ((_ep.weapon && _ep.weapon.name) || 'a weapon')
                  : 'a delivery';
                S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-50)), [{
                  id: 'inbox-' + Date.now() + '-' + _ie,
                  name: '',
                  text: '📫 You received ' + _what + (_e.note ? ' (' + _e.note + ')' : ''),
                  ts: Date.now()
                }]);
              }
              if (_inbEntries.length && setChatLog) setChatLog(_toConsumableArray(S.chatLog));
              if (payload && payload.queued) {
                S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-50)), [{
                  id: 'inbox-q-' + Date.now(),
                  name: '',
                  text: '📫 ' + payload.queued + ' more deliveries waiting (weapon stash is full)',
                  ts: Date.now()
                }]);
                if (setChatLog) setChatLog(_toConsumableArray(S.chatLog));
              }
              break;
            }
          case 'server_announce':
            {
              /* v2.3.1150: operator announcement (PRIVILEGED -- only the
                 worker can emit it; riding the un-privileged 'chat'
                 relay would let any client impersonate the server).
                 Sent as a broadcast from /api/admin/announce, and with
                 payload.motd:true on join when a sticky MOTD is set.
                 Pushed BOTH to the chat log (future mail/chat panel)
                 and as an on-screen banner -- the chat log currently
                 has no renderer (pre-existing gap), so the dmgNumbers
                 banner is the visible surface (gear_locked precedent). */
              var _annText = (payload && payload.text) || '';
              if (!_annText) break;
              S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-50)), [{
                id: 'sys-' + Date.now(),
                name: '',
                text: '📢 ' + _annText,
                ts: Date.now()
              }]);
              if (setChatLog) setChatLog(_toConsumableArray(S.chatLog));
              pushDmgPopup(S, S.player.x, S.player.y - 55, '📢 ' + (_annText.length > 60 ? _annText.slice(0, 57) + '…' : _annText), '#f5c542', { ttl: 5 });
              try { BT_AUDIO.beep(660, 0.08, 0.1, 'sine'); } catch (e) {}
              break;
            }
          /* v2.3.1576: Hemi Bro ownership handshake.  Both are SERVER-emitted
             (PRIVILEGED_EVENTS), so a peer cannot forge either one — a forged
             result would paint a badge that was never earned.  The flow lives
             in broWallet.js; this just hands the message over. */
          case 'bro_nonce':
            _onBroNonce(payload);
            break;
          case 'bro_verify_result':
            _onBroResult(payload);
            /* The badge itself comes from the authoritative echo, not from
               here — this only unblocks the UI's spinner. */
            if (payload && payload.ok && S.rpg) S.rpg._bro = payload.tokenId;
            break;

          case 'player_swing':
            {
              if (payload.id && _peerInZone(S, payload.id)) {
                S.others[payload.id]._swingTs = Date.now();
                S.others[payload.id]._swingSpecial = !!payload.special;
                /* v2.3.1735: Shield Bash rides this event with bash:true so a
                   watching player sees the same shove the caster does rather
                   than a sword slash (src/game/abilities.js).  Coerced to a
                   boolean — this payload is peer-supplied and only ever gates
                   which effect draws. */
                S.others[payload.id]._swingBash = !!payload.bash;
                /* ...and give the watcher the same shockwave the caster
                   sees, through the caster's own helper so the two can
                   never drift.  Drawn at the PEER's position, which is why
                   this lives here and not in abilities.js. */
                if (payload.bash) {
                  var _bo = S.others[payload.id];
                  pushAbilityRings(S, _bo.x || 0, (_bo.y || 0) - 10, 'bash',
                    typeof payload.ang === 'number' ? payload.ang : 0, 70);
                }
                /* v2.3.1011: weapon + angle let the remote render the full
                   sword/greatsword stand-in facing the right way. */
                S.others[payload.id]._swingWpn = payload.wpn || null;
                if (typeof payload.ang === 'number') S.others[payload.id]._swingAng = payload.ang;
                /* v2.3.1107: point the body the same way as the swing. */
                _reconcileFacing(S.others[payload.id], payload.ang);
              }
              break;
            }
          case 'player_projectile':
            {
              /* Another player fired an arrow or staff bolt */
              if (payload.id === S.myId) break;
              /* v2.3.1574: the worst of the cross-zone leaks -- this pushes onto a
                 GLOBAL array the projectile renderer walks without any zone
                 test, so a peer's arrow really did fly across your screen from
                 a zone away.  Every other combat case at least died at the
                 body renderer's own filter. */
              if (!_peerInZone(S, payload.id)) break;
              if (!S._remoteProjectiles) S._remoteProjectiles = [];
              S._remoteProjectiles.push({
                x: payload.x, y: payload.y, ang: payload.ang,
                isStaff: payload.isStaff, isSpecial: !!payload.isSpecial, dist: 14,
                life: payload.isStaff ? 68 : 90, /* v2.3.1335: mirror the -25% range */
                /* v2.3.2259: the staff special's three orbs share one ray and
                   are spaced in TIME (playerActions.js), so a peer needs the
                   same stagger or all three draw on top of each other and read
                   as one orb.  Absent/legacy payload -> 0 -> old behaviour. */
                holdUntil: Date.now() + (Number(payload.delayMs) > 0 ? Math.min(1000, Number(payload.delayMs)) : 0),
                /* v2.3.2262: the magic special's orbs fly fast / medium / slow,
                   so a peer needs the speed too or all three drift together and
                   the spread the caster sees is not the spread anyone else does.
                   Clamped, and absent on every other projectile -> the type's
                   own speed, exactly as before. */
                speedPx: (Number(payload.speedPx) > 0 ? Math.min(20, Number(payload.speedPx)) : null),
                ts: Date.now(), ownerId: payload.id
              });
              /* v2.3.1011: a bow shot (non-staff) drives the remote bow-draw
                 stand-in (Phase 4 reads _bowShotAt/_bowShotAng). */
              if (!payload.isStaff && payload.id && S.others[payload.id]) {
                S.others[payload.id]._bowShotAt = Date.now();
                S.others[payload.id]._bowShotAng = payload.ang;
                /* v2.3.1107: point the body the same way as the bow shot. */
                _reconcileFacing(S.others[payload.id], payload.ang);
              }
              break;
            }
          case 'player_shield':
            {
              if (payload.id && _peerInZone(S, payload.id)) {
                S.others[payload.id]._shieldUp = payload.up;
                S.others[payload.id]._shieldTs = Date.now();
              }
              break;
            }
          case 'player_dodge':
            {
              /* v2.3.1011: another player dodged/lunged/retreated -- mirror the
                 local _dodgeRoll shape so the remote render shows the move. */
              if (payload.id && _peerInZone(S, payload.id)) {
                S.others[payload.id]._dodgeRoll = {
                  angle: payload.angle, kind: payload.kind || 'dodge', startTime: Date.now()
                };
                /* v2.3.1107: dodge/lunge re-point the body along the dash.
                   retreat_shot is EXCLUDED: it dashes away while firing AT
                   the target -- its player_projectile event (which follows
                   immediately) carries the correct shooting facing. */
                if (payload.kind !== 'retreat_shot') {
                  _reconcileFacing(S.others[payload.id], payload.angle);
                }
              }
              break;
            }
          case 'fire_trail':
            {
              /* ═══ v2.3.2238: THE FIRE GOBLIN'S BURNING GROUND ═══
                 Owner: "build the fire trail for the fire goblin."

                 VISUAL ONLY, on exactly the terms monster_projectile set
                 below: the server owns every point of the damage and
                 delivers it as an ordinary monster_attack on each burn
                 tick, reported from the PATCH so the handler's 160px
                 attacker-distance gate passes.  This case exists so the
                 fire the player is walking into is a thing they can see.

                 Drawn rather than sprited, and that is a deliberate
                 simplification rather than a corner cut: the patch is a
                 flickering ember disc a Graphics call already makes well,
                 and adding a strip would mean registering a loader in the
                 preload manifest (CLAUDE.md's animation-preloading law)
                 for an effect that does not need one.  No new asset, no
                 new first-use hitch.

                 THE RADIUS ON SCREEN IS THE RADIUS THE SERVER TESTS, the
                 same promise the telegraph rings make: a hazard that drew
                 itself smaller than it burns would be worse than one that
                 did not draw itself at all. */
              if (payload && payload.zone === S.currentZone && S.player) {
                if (!S._fireTrail) S._fireTrail = [];
                /* Bounded client-side too.  The server caps at
                   FIRE_TRAIL.MAX_PER_ZONE (60); this is the same backstop
                   against a flood the client did not expect, and it drops
                   the OLDEST so the newest fire — the one under the
                   goblin chasing you — is never the one discarded. */
                if (S._fireTrail.length >= 80) S._fireTrail.shift();
                S._fireTrail.push({
                  zone: payload.zone,
                  x: payload.x, y: payload.y,
                  r: payload.r || 26,
                  ts: Date.now(),
                  /* The server sends the REMAINING life, which is what makes
                     the zone-entry replay expire in step with everyone
                     else's copy instead of restarting each patch's clock. */
                  duration: Math.max(200, Math.min(15000, Number(payload.ms) || 4000)),
                  arm: Math.max(0, Math.min(2000, Number(payload.arm) || 0)),
                });
              }
              break;
            }
          case 'monster_projectile':
            {
              /* v2.3.1640: server-thrown snowball — VISUAL ONLY.
                 The server owns the damage entirely: it scheduled the
                 impact when it threw, and delivers it as an ordinary
                 monster_attack on the impact tick (reported from the
                 impact point so the existing 160px attacker-distance
                 gate passes).  This entry exists purely so the player can
                 SEE the ball coming and step out of it.

                 It rides the existing S.slimeProjectiles pipeline —
                 already simulated in game/projectiles.js and drawn by
                 effectsRenderer — so it needs no new renderer and no new
                 art.  The `displayOnly` flag is what keeps it honest:
                 that simulator normally applies client-side damage on
                 contact, which for a server monster would double-hit and
                 violate server authority (rule zero). */
              if (payload && payload.zone === S.currentZone && S.player) {
                if (!S.slimeProjectiles) S.slimeProjectiles = [];
                /* v2.3.2217: launch it from the THROWING HAND, and tell the
                   renderer the ball is now real.

                   The server creates the ball at the monster's logical point
                   — the snowman's feet — because that is the only position
                   it has.  Drawn from there it appeared at his base instead
                   of out of his claw, 17-45px below the hand that just threw
                   it (owner, 2026-09-01).  The renderer publishes the hand
                   offset for the facing it is actually drawing
                   (_muzzleX/_muzzleY, see snowmanSprites.throwMuzzle); a
                   monster with no attack strip has none and launches from
                   its own point exactly as before.

                   Safe to move: this event is display-only.  The server
                   already scheduled the impact and aimed at a frozen point,
                   and delivers the damage itself — shifting the visual
                   origin changes the drawn path and nothing else.  Travel
                   time is unchanged (life is frames, speed is re-derived
                   from the new distance), so it still lands exactly when
                   the authoritative hit does. */
                var _pmM = (S.monsters || []).find(function (mm) { return mm.id === payload.monsterId; });
                if (_pmM) _pmM._throwReleaseAt = Date.now();
                var _sbX = (payload.x || 0) + ((_pmM && Number(_pmM._muzzleX)) || 0);
                var _sbY = (payload.y || 0) + ((_pmM && Number(_pmM._muzzleY)) || 0);
                var _sbDx = (payload.tx || 0) - _sbX;
                var _sbDy = (payload.ty || 0) - _sbY;
                var _sbDist = Math.sqrt(_sbDx * _sbDx + _sbDy * _sbDy);
                var _sbMs = Math.max(1, payload.travelMs || 900);
                /* Derive the per-frame step from the server's own travel
                   time rather than a hard-coded speed, so the visual
                   always lands when the authoritative hit does even if
                   the server retunes travelMs. ~60fps assumed, matching
                   the rest of this simulator's frame-based life/speed. */
                var _sbFrames = Math.max(1, Math.round((_sbMs / 1000) * 60));
                S.slimeProjectiles.push({
                  x: _sbX,
                  y: _sbY,
                  ang: Math.atan2(_sbDy, _sbDx),
                  speed: _sbDist / _sbFrames,
                  life: _sbFrames,
                  displayOnly: true,
                  ownerId: payload.monsterId,
                  rawDmg: 0,
                  /* v2.3.1678: carry the KIND through to the renderer.  Owner:
                     "I couldn't see the snowman projectile."  It was drawing —
                     as the green slime orb, because the renderer picks its
                     texture from the zone's variant map and Frost Ridge has no
                     entry, so every ball fell through to the slime fallback.
                     A green blob against snow at 25px is invisible in the way
                     that matters: you cannot tell it is coming at you. */
                  kind: payload.kind || 'slime',
                  ts: Date.now(),
                });
              }
              break;
            }
          case 'monster_transform':
            {
              /* Server-driven variant transform (currently just
                 mummy -> skeleton at HP <= 50%).  Worker detects the
                 threshold + emits this event for every client in the
                 zone, so every screen plays the shred animation at
                 the same tick.  Replaces the per-client
                 maybeTransformMonster() trigger in entityRenderer.js
                 -- that local path is now gated on !S._serverMonsters
                 (dungeon / SP only). */
              if (!payload || !S.monsters) break;
              var tm = S.monsters.find(function (mm) { return mm.id === payload.id; });
              if (!tm) break;
              var fromV = MONSTER_VARIANTS[payload.fromVariant];
              tm._transformStart = Date.now();
              tm._transformHoldMs = (fromV && fromV.transformHoldMs) || 480;
              tm._transformFromArch = payload.fromVariant;
              tm.archetype = payload.toVariant;
              tm.type = payload.toVariant;
              if (tm.arch !== undefined) tm.arch = payload.toVariant;
              var toV = MONSTER_VARIANTS[payload.toVariant];
              if (toV && toV.spd != null) tm.spd = toV.spd;
              break;
            }
          case 'monster_hit':
            {
              /* A monster was hit — show damage number and hit effects for everyone */
              if (S.monsters) {
                var hitM = S.monsters.find(function(m) { return m.id === payload.monsterId; });
                if (hitM) {
                  /* Update curHp from the server's authoritative hpPct,
                     but DON'T touch hitM.hp — that's the spawn-time
                     max-HP reference the HP bar uses as its denominator.
                     Clobbering it made curHp == hp on every hit, which
                     locked the bar percentage at 100%. */
                  hitM.curHp = Math.round(payload.hpPct * hitM.maxHp);
                  /* ═══ v2.3.2200: EVERY HIT VISIBLY LANDS ("floaty" #3) ═══
                     _hitFlash was written for years and read by nothing
                     (entityRenderer now renders it as a brief brightness
                     pulse).  And the recoil sheet/squash only fired from
                     OUR OWN local swing/arrow sites — a teammate's hits
                     moved nothing.  Stamp flash + hit-react here for peer
                     hits and for our own server-rolled hits (ability/
                     thorns/burst, which have no local prediction site).
                     OUR OWN swings/arrows already stamped BOTH at blade
                     contact — v2.3.2200b: the flash stamp used to sit
                     above this gate, so the echo of your own hit RE-FIRED
                     the flash a network round-trip later, and that
                     trailing second pulse read as "the flash is delayed"
                     (owner report, first playtest).  Everything
                     echo-driven now sits behind the same gate. */
                  if (payload.attackerId !== S.myId || payload.ability || payload.thorns || payload.burst) {
                    hitM._hitFlash = Date.now();
                    if (hitM.curHp > 0) {
                      hitM._hitAnimStart = Date.now();
                      hitM._hitAnimEnd = Date.now() + ((hitM.archetype || hitM.type) === 'snowman' ? 600 : 400);
                    }
                    /* Material debris + ground mark for hits with no local
                       spawn site.  Peer weapon/angle unknown: infer the
                       direction from the attacker's position when we can
                       see them, else default "up" (the _impactAngle
                       precedent below). */
                    var _dbAng = -Math.PI / 2;
                    var _dbAtk = payload.attackerId && S.others && S.others[payload.attackerId];
                    if (_dbAtk && typeof _dbAtk.x === 'number') {
                      _dbAng = Math.atan2((hitM.y || 0) - _dbAtk.y, (hitM.x || 0) - _dbAtk.x);
                    }
                    spawnHitDebris(S, hitM, _dbAng);
                    spawnGroundDecal(S, hitM.x || hitM.renderX || 0, hitM.y || hitM.renderY || 0,
                      hitM.archetype || hitM.type, { chance: 0.35, size: 5 });
                  }
                  /* v2.3.1124: ice-burst impact flash on snowmen for PEER hits
                     only -- our own hits stamp _impactAt at the local melee/
                     projectile site (with the real weapon size), so stamping
                     here too would double-flash.  Peer weapon is unknown, so
                     default to full size. */
                  if (payload.attackerId !== S.myId && (hitM.archetype || hitM.type) === 'snowman') {
                    hitM._impactAt = Date.now();
                    hitM._impactScale = 1;
                    /* v2.3.1127: peer weapon/facing unknown -> default the eruption
                       plume to "up". Set explicitly so a stale angle from an earlier
                       OWN hit on this snowman doesn't carry over. */
                    hitM._impactAngle = -Math.PI / 2;
                  }
                  /* Show damage number (skip our own — we already show it
                     locally).  Peer numbers go through the smoothing queue so
                     a coalesced burst drips out at a live cadence instead of
                     stacking into a column. */
                  if (payload.attackerId !== S.myId) {
                    enqueuePeerDamage(S, peerDmgKey(payload.monsterId, hitM.x || hitM.renderX, hitM.y || hitM.renderY), {
                      x: hitM.x || hitM.renderX, y: monsterPopupY(hitM, -20),
                      text: '-' + payload.dmg, color: payload.isCrit ? DMG_CRIT_COLOR : '#ff8888',
                      /* v2.3.2211: the server's crit gets the same treatment
                         the local swing gets -- big number + the crit mark.
                         These two doors painted the same event differently,
                         which is how a crit could read as ordinary depending
                         on which path produced its number. */
                      crit: !!payload.isCrit,
                      /* v2.3.2232: ...and a peer's arrow reads as an arrow.
                         Undefined until the worker names the slot -- better
                         no mark than OUR weapon on THEIR hit.
                         v2.3.2233: the crit takes the weapon here too. */
                      iconKey: dmgIconForSlot(S, payload, false),
                    });
                  } else if (payload.ability || S._serverMonsters) {
                    /* v2.3.1733: OUR OWN stamina-ability hit.  The rule
                       above ("skip our own — we already show it locally")
                       assumes a local prediction produced a popup, which is
                       true for swings and arrows and false for Shield Bash
                       and Whirlwind: those are rolled entirely server-side
                       (see src/game/abilities.js), so with no branch here
                       the ability chips the HP bar and prints NOTHING.
                       Same shape, same reason, as the thorns case below.

                       ═══ v2.3.2220: AND NOW EVERY OWN HIT IN A SERVER ZONE ═══
                       Owner: "I hit a 69 with a critical hit on a special
                       attack and the snowman didn't die."  The number was
                       never the damage.  In a server zone the worker rolls
                       its own variance AND its own crit and ignores the
                       client's entirely (_handleMonsterDamage: "Client
                       damage number is no longer trusted"), so the local
                       prediction was a SECOND, independent roll that only
                       ever agreed with the truth by luck.  v2.3.2218 made
                       the two use the same formula; it could not make two
                       Math.random() calls return the same thing.  A client
                       crit landing on a server non-crit shows ~2.5x the
                       damage actually dealt.

                       So the popup now reports the hit instead of guessing
                       it.  Everything that has to feel instant — the flash,
                       recoil, debris, decal, shake, knockback — is still
                       local and unchanged; only the NUMBER waits for the
                       truth, on the same schedule the HP bar already used.
                       A number half a round-trip late beats a number that
                       is wrong. */
                    pushDmgPopup(S, hitM.x || hitM.renderX, monsterPopupY(hitM, -20),
                      '-' + payload.dmg, payload.isCrit ? DMG_CRIT_COLOR : '#ffd08a',
                      /* v2.3.2232: the weapon that dealt it, not a flat sword.
                         v2.3.2233: ...and that now includes the crit, which
                         carried a bladed burst on bow and staff hits alike. */
                      { crit: !!payload.isCrit, iconKey: dmgIconForSlot(S, payload, true),
                        special: !!S._ownSpecialRecent });  /* v2.3.2211; v2.3.2220 */
                  } else if (payload.thorns) {
                    /* v2.3.1137: Thorns reflect is SERVER-rolled with no
                       local prediction (unlike swings), so our own thorns
                       hits DO need the popup or the block just silently
                       chips the monster's bar. */
                    pushDmgPopup(S, hitM.x || hitM.renderX, monsterPopupY(hitM, -20), '-' + payload.dmg + ' 🌵', '#a3e635');
                  } else if (payload.burst) {
                    /* v2.3.1734: same gap, same fix.  An Element Burst is
                       resolved entirely server-side (no local prediction —
                       see playerActions.elementBurst for why), so without
                       this branch the caster's own biggest button would
                       land in silence on their own screen while every
                       OTHER player in the zone saw the numbers. */
                    pushDmgPopup(S, hitM.x || hitM.renderX, monsterPopupY(hitM, -20), '-' + payload.dmg, '#c084fc');
                  }
                  /* Hit particles — v2.3.2200b: same gate as the flash
                     above.  "For everyone" meant bystanders; for the
                     ATTACKER it was a duplicate puff arriving a network
                     round-trip after their contact-time debris, which
                     contributed to the same "feedback trails the hit"
                     read the double flash did. */
                  if (payload.attackerId !== S.myId || payload.ability || payload.thorns || payload.burst) {
                    for (var hp2 = 0; hp2 < 3; hp2++) {
                      S.hitParticles.push({
                        x: hitM.x || hitM.renderX, y: hitM.y || hitM.renderY,
                        vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                        life: 0.5, color: hitM.color || '#ff5e6c', size: 2
                      });
                    }
                  }
                }
              }
              break;
            }
          case 'monster_kill':
            {
              /* A monster was killed — show death effects, award XP if
                 we're a recipient.  Gold no longer auto-adds: it rides
                 on the loot pickup so the player must walk over the
                 coin (matches the SP melee/staff/bow paths). */
              var _amRecipient = payload.recipients && payload.recipients.includes(S.myId);
              var _goldList = payload.goldRecipients || payload.recipients || [];
              var _amGoldRecipient = _amRecipient && _goldList.includes(S.myId);
              var _myShare = (payload.shares && typeof payload.shares[S.myId] === 'number') ? payload.shares[S.myId] : 1;
              var _killVarMult = xpMultFor(S.monsters && S.monsters.find(function(mm) { return mm.id === payload.monsterId; }));
              var _killXpPre = _amRecipient ? Math.max(0, Math.round((payload.xp || 0) * _myShare * _killVarMult)) : 0;
              var _killGoldPre = _amGoldRecipient ? Math.max(0, Math.round((payload.gold || 0) * _myShare)) : 0;
              if (S.monsters) {
                var deadM = S.monsters.find(function(m) { return m.id === payload.monsterId; });
                if (deadM) {
                  /* In server-mode the local m.curHp -= dmg branches are
                     all gated on !S._serverMonsters, so neither melee nor
                     arrow kill code ever fires `if (m.curHp <= 0)` --
                     meaning the local loot push never happens.  Drop the
                     remnant here so fodder + variants leave debris on the
                     ground in MP.  _lootDropped is the canonical
                     "already pushed" flag (cleared on respawn in the
                     tick handler) -- v2.3.17 fix: the previous _wasAlive
                     gate fired false-negative when the tick handler
                     arrived first and set alive=false silently. */
                  /* Mummy -> skeleton on overkill (v2.3.135): MP kill events
                     can arrive before any damage tick, so curHp may still be
                     full client-side. Force curHp to 0 so the transform
                     check fires regardless of the cached HP fraction. */
                  deadM.curHp = 0;
                  maybeTransformMonster(deadM);
                  deadM.alive = false;
                  /* Loot drop: push the pile on every client so two screens
                     show the same drop at the same position.  Each client
                     stores its own per-share coin amount on the pile (coin
                     icon glow stays visible even when coins=0 because the
                     renderer also gates on l.recipients).  The recipients
                     list gates pickup so a non-contributor walking over
                     just gets a "not yours" beep instead of taking the
                     loot.  Position uses the server's kill x/y (payload.x/y)
                     so every screen agrees -- no per-client jitter. */
                  var _lootX = (typeof payload.x === 'number') ? payload.x : (deadM.x || deadM.renderX);
                  var _lootY = (typeof payload.y === 'number') ? payload.y : (deadM.y || deadM.renderY);
                  /* Local loot-pile push.  Skipped when the worker is
                     authoritative for loot (S._serverLoot): in that
                     mode the server emits loot_drop and we receive the
                     pile via the loot_drop case in _processGameEvent
                     above.  This block remains as the fallback for
                     dungeons / SP / zones the worker doesn't model.
                     Death SFX, particles, and XP attribution still run
                     either way (see below). */
                  if (!S._serverLoot) {
                    var _lootId = 'mk-' + payload.monsterId;
                    /* Killer name for the "[X]'s loot" label on non-owner
                       screens.  Fall back to 'Player' if we don't have the
                       other-player entry yet (e.g. they just joined). */
                    var _killerName = (payload.killerId === S.myId)
                      ? (S.myName || 'You')
                      : ((S.others && S.others[payload.killerId] && S.others[payload.killerId].name) || 'Player');
                    if (!deadM._lootDropped && S.groundLoot && isRemnantSkull(deadM.type)) {
                      deadM._lootDropped = true;
                      var _shardB = rollMonsterShard(S.currentZone);
                      S.groundLoot.push({
                        lootId: _lootId,
                        x: _lootX, y: _lootY,
                        coins: _killGoldPre,
                        xp: 0,
                        skull: deadM.type,
                        skullEmoji: '🦴',
                        ts: Date.now(),
                        shard: _shardB,
                        recipients: _goldList,
                        killerName: _killerName,
                      });
                    } else if (!deadM._lootDropped && S.groundLoot) {
                      deadM._lootDropped = true;
                      S.groundLoot.push({
                        lootId: _lootId,
                        x: _lootX, y: _lootY,
                        coins: _killGoldPre,
                        xp: 0,
                        ts: Date.now(),
                        recipients: _goldList,
                        killerName: _killerName,
                      });
                    }
                  }
                  /* Per-archetype death SFX (snowman-death, monster-death
                     fallback; slime fodder is muted via its own splat
                     hook in entityRenderer).  Local hit paths call this
                     too but bail in MP before reaching it -- monster_kill
                     is the only path that knows the kill happened here. */
                  if (!deadM._deathSfxPlayed) {
                    deadM._deathSfxPlayed = true;
                    try { BT_AUDIO.monsterDeath(deadM.archetype || deadM.type); } catch (e) {}
                  }
                  /* Don't clobber deadM.hp — for server monsters it's
                     the spawn-time max-HP reference used by the HP bar
                     denominator.  Zeroing it broke every slime's bar
                     on its 2nd life after respawn. */
                  /* Death particles */
                  for (var dp = 0; dp < 8; dp++) {
                    S.hitParticles.push({
                      x: deadM.x || deadM.renderX, y: deadM.y || deadM.renderY,
                      vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3,
                      life: 1.0, color: deadM.color || '#ff5e6c', size: 3
                    });
                  }
                }
              }
              /* Award XP if we are a recipient.  GDD §7:
                 contribution-weighted split — each recipient gets
                 monster.xp * shares[myId].  Gold is no longer added
                 here; it spawned on the loot drop above and the player
                 must walk over it (pickup logic awards coins + shows
                 the +NG popup in gold w/ coin icon). */
              if (_amRecipient) {
                var R = S.rpg;
                if (R) {
                  var killXp = _killXpPre;
                  if (R._compStats) {
                    R._compStats.monstersKilled = (R._compStats.monstersKilled || 0) + 1;
                  }
                  /* Use-trained T1 split: divide killXp across stats by
                     their relative _buildUse share since the last kill,
                     then reset the tally.  T1 stats are still
                     client-side; T2 (xp/level/unspentT2) is server-
                     authoritative when S._serverMonsters is true. */
                  distributeKillXpToBuild(R, killXp);
                  /* Melee lifesteal — refund 90% of damage this monster
                     dealt to us, but only if we currently have melee equipped. */
                  applyMeleeLifesteal(S, R, deadM);
                  /* "+N XP" popup -- client-predicted from
                     payload.xp * shares[myId] * killVarMult for snappy
                     UX.  The actual R.xp update arrives via
                     player_state shortly after; combat_credit handles
                     the level-up popup + SFX. */
                  /* ═══ v2.3.1727: DON'T POP A NUMBER THAT MEANS NOTHING ═══
                     payload.xp is the monster's KILL xp, and under prog3 it
                     lands in _addCombatXp — a no-op that returns
                     {leveled:false} and moves no level anywhere.  Real
                     progression is 1 xp per point of DAMAGE dealt, into the
                     trained skill, and it is typically 5-6x this number.
                     So a prog3 player was watching "+10 XP" float past while
                     something entirely different drove their levels, which is
                     its own small contribution to "levelling doesn't feel
                     like anything".  Legacy (non-prog3) players still get it:
                     for them the number is real. */
                  if (!prog3Live(R)) {
                    pushHudPopup(S, { target: 'xpBar', text: '+' + killXp + ' XP', color: '#60a5fa' });
                  }
                  /* Local R.xp += / level-up loop runs only when the
                     worker doesn't own combat XP for this kill (i.e.
                     when _serverMonsters is false -- dungeons / SP).
                     For server monsters, _addCombatXp on the worker
                     applies XP + level-up + 5 unspentT2 per level,
                     then sends combat_credit (popup/SFX) and
                     player_state (authoritative totals). */
                  if (!S._serverMonsters) {
                    R.xp = (R.xp || 0) + killXp;
                    /* A1: combat level is determined PURELY by build
                       points -- 5 BP = 1 level. killXp accumulates on
                       R.xp for the bar UI but no longer gates anything. */
                    while ((R._buildPointsThisLvl || 0) >= 5) {
                      R._buildPointsThisLvl -= 5;
                      R.level++;
                      R.unspentT2 = 0; /* T2 retired — weapon points now come from per-category weapon-skill levels */
                      recalcDerived(R);
                      R.hp = R.maxHp; R.stamina = R.maxStamina; R.mana = R.maxMana;
                      setLevelUpMsg({ kind: 'combat', level: R.level, ts: Date.now() });
                      BT_AUDIO.levelUp();
                    }
                  }
                  setRpgState(_objectSpread({}, R));
                  /* v2.3.1356: debounced — a piercing special one-shotting
                     a pack delivers N monster_kill events back-to-back;
                     the inline full-blob write per event froze the frame
                     (owner report: bow specials vs snowmen).  rpgSave.js. */
                  saveRpgSoon();
                }
              }
              break;
            }
          case 'monster_attack':
            {
              /* Server monster attacked someone */
              if (payload.targetId !== S.myId) {
                /* Remote-player hit feedback: flash their sprite + float a
                   damage number over them so other players' fights read
                   as real, not invisible.  No HP math — server is
                   authoritative on remote HP; this is purely visual.
                   Suppress entirely when the remote is dead: prevents
                   phantom hit-flashes on a corpse while the server
                   hasn't yet stopped its monster AI from targeting
                   them (idle players, slow disconnect detection). */
                var rOther = S.others && S.others[payload.targetId];
                if (rOther && !rOther._isDead) {
                  rOther._hitFlash = Date.now();
                  pushDmgPopup(S, rOther.x || 0, (rOther.y || 0) - 20, '-' + (payload.dmg || 0), '#ff5e6c');
                }
                break;
              }
              var R2 = S.rpg;
              if (!R2 || R2.hp <= 0) break;
              /* v2.3.2242 (post-review): "IN COMBAT" HAS TO BE TRUE OF A
                 SERVER-ZONE HIT.  The shield button's liveness rule
                 (shieldToggle.js shieldButtonLive) counts damage taken in
                 the last 5s, and S.lastDamageTaken was only ever stamped by
                 the client-local legacy AI path -- so a snowman throwing
                 from its 300px band, outside the 220px perimeter, could hit
                 you and no shield button would appear.  The worker has just
                 said we were struck; that is the stamp, before any of the
                 display filters below decide whether to DRAW it. */
              S.lastDamageTaken = Date.now();
              /* ── Out-of-range filter ──
                 The server's monster-attack ranging was firing damage
                 events for monsters the player can't see (off-screen or
                 desynced from the local snapshot), which read as
                 mystery damage with no visible attacker. Drop the event
                 client-side when the attacker isn't a known nearby
                 monster. The server is authoritative on HP, so on the
                 next state_sync any genuine HP delta gets reconciled —
                 this just suppresses the visual "ghost hit" in the
                 normal case. */
              var atkSrc = (payload.monsterId && S.monsters) ? S.monsters.find(function (mm) { return mm.id === payload.monsterId; }) : null;
              /* Drop the event when the attacker isn't in our local
                 monster snapshot — even if the server provided
                 attackerX/Y. If the client doesn't have the monster
                 registered, it can't render the source, so the user
                 sees damage with no visible attacker. The
                 wsClient.js tick handler only UPDATES existing local
                 monsters, so a server-spawned monster the client
                 missed during initial sync stays invisible until a
                 zone change re-syncs. Server doesn't track player HP,
                 so dropping is safe — no desync to reconcile. */
              /* ═══ v2.3.2235: A TELEGRAPH HIT IS NOT A GHOST HIT ═══
                 Owner, on the exploding slime: "I don't think I saw damage
                 numbers on my own health bar ... once slime exploded."

                 Both filters in this handler -- attacker-in-snapshot, and
                 attacker-within-160px-of-where-we-are-NOW -- exist to
                 suppress melee ghost hits from monsters the client cannot
                 see.  They are the wrong question for a blast: it was
                 resolved against where we stood at DETONATION, by a monster
                 in the act of dying, and running from a swelling slime is
                 the correct thing to do.  Measured: each filter swallows
                 the number on its own (mp-burstdmg), while the same payload
                 floats one fine when neither trips.

                 `ability` is the worker saying "I resolved this one here"
                 (telegraph.js v2.3.2235), and it comes with the authoritative
                 dmgTaken, so there is nothing left to second-guess.  An older
                 worker omits it and every filter below behaves exactly as it
                 does today (rule 19). */
              var _srvResolved = !!(payload.ability && S._serverMonsters
                && typeof payload.dmgTaken === 'number');
              if (!atkSrc && !_srvResolved) {
                if (window.__dmgLog) try { console.log('[dmg] net-monster_attack DROPPED (not in snapshot)', { monsterId: payload.monsterId, srvAttackerXY: (typeof payload.attackerX === 'number') ? { x: Math.round(payload.attackerX), y: Math.round(payload.attackerY) } : null }); } catch (e) {}
                break;
              }
              /* Prefer the server's authoritative position (payload.attackerX/Y)
                 over the local snapshot — the server's view is what decided the
                 attack should fire, and the snapshot can lag a few ticks. */
              /* v2.3.2235: atkSrc may legitimately be null now (a blast from
                 a monster already gone), so every read of it below is
                 guarded.  The worker always sends attackerX/Y on a
                 telegraph hit, which is why the visuals still have a source
                 to point away from. */
              var _atkX = (typeof payload.attackerX === 'number') ? payload.attackerX : (atkSrc ? atkSrc.x : S.player.x);
              var _atkY = (typeof payload.attackerY === 'number') ? payload.attackerY : (atkSrc ? atkSrc.y : S.player.y);
              var _atkDx = _atkX - S.player.x, _atkDy = _atkY - S.player.y;
              var _atkDist = Math.sqrt(_atkDx * _atkDx + _atkDy * _atkDy);
              if (_atkDist > 160 && !_srvResolved) {
                if (window.__dmgLog) try { console.log('[dmg] net-monster_attack DROPPED (out of range)', { monsterId: payload.monsterId, dist: Math.round(_atkDist) }); } catch (e) {}
                break;
              }
              /* Server-side block resolution (v2.3.103+): worker fires
                 monster_attack with blocked:true + staminaDrain when
                 ps.blocking was set at attack time.  Show the "Blocked!"
                 popup, push the floating stamina-cost number, skip the
                 HP-damage path entirely.  Player_state will arrive
                 shortly after to mirror the authoritative stamina value. */
              if (payload.blocked) {
                /* ═══ v2.3.2248: THE BLOCK NO LONGER ENDS THE BLOCK ═══
                   v2.3.2242 dropped the shield here, from the owner's original
                   "Shield will automatically disengage upon receiving damage
                   (successful block)."  Overruled by the owner after playing
                   it: "Instead of dropping the shield at first hit I want it
                   to keep being held ... until you attack (thus breaking the
                   shield hold) or you tap the shield button again."
                   So a landed block is now just a landed block.  The hold ends
                   on exactly three things -- an attack (playerActions /
                   monsterCombat), a second tap (toggleShield), or stamina
                   running out (BroTown's auto-release) -- and the owner's own
                   balance argument is the third of those: "it costs stamina
                   and can't be held indefinitely".
                   The quest counter below stays: it counts blocks, and a block
                   still happened. */
                /* v2.3.2242 (post-review): the "block 10 hits" quest counted
                   only the client-local legacy AI's blocks (monsterCombat
                   ~863), so in every server zone it could never complete.
                   A worker-confirmed block is the better evidence. */
                if (!R2._questFlags) R2._questFlags = {};
                R2._questFlags.blocksLanded = (R2._questFlags.blocksLanded || 0) + 1;
                pushDmgPopup(S, S.player.x, S.player.y - 20, 'Blocked!', '#60a5fa');
                var _staminaDrainBlock = typeof payload.staminaDrain === 'number' ? payload.staminaDrain : 15;
                if (_staminaDrainBlock > 0) {
                  /* v2.3.1686 (owner: "I see negative numbers during blocks.
                     I don't know what that refers to").  This is the STAMINA
                     the block cost, and it said so only in yellow — next to a
                     red "-N" HP number that looks identical apart from hue,
                     during the one moment the player is being hit.  Colour was
                     carrying the whole meaning and it could not.  The ⚡ is the
                     same mark the energy readout under the character uses
                     (entityRenderer's stamina label), so the number now names
                     the bar it came out of. */
                  pushDmgPopup(S, S.player.x + 18, S.player.y - 4, '-' + _staminaDrainBlock + '⚡', '#facc15', { ts: Date.now() + 1 });
                }
                addBuildUse(R2, 'endurance', 3);
                /* v2.3.1113: DEFENSE LOOP REVIVAL -- awardDefenseXp/
                   trainDefense existed since v2.3.1021 but were never
                   called, so the 6th combat skill could not level and
                   Bulwark/Iron Skin points were unreachable.  Server-
                   confirmed block: prevented damage trains at full rate.
                   v2.3.1140: ±5 valid-threat gate re-enabled (atkSrc.level
                   from the local snapshot) -- the null bypass existed only
                   while every monster was pinned to level 1; zone bands
                   are now unpinned (BALANCE-PLAN §7/BF-1). */
                var _defUpBlk = trainDefense(R2, payload.dmg || 5, 0, (atkSrc && atkSrc.level) || null, false);
                if (_defUpBlk) pushDmgPopup(S, S.player.x, S.player.y - 34, '🛡️ Defense Lv ' + _defUpBlk.level, '#60a5fa', { ts: Date.now() + 2 });
                break;
              }
              var mDmg = payload.dmg || 5;
              /* Per-variant damage multiplier + range gating.  Server
                 doesn't know about variants, so we apply the local
                 attacker variant's scalars here:
                 - dmgMult: skeleton hits ~4x harder.
                 - noProjectile: server's fodder AI fires ranged
                   slime-orb attacks; the client suppresses the
                   visual via noProjectile, but the server's
                   monster_attack still applies the hit, which the
                   user reads as "invisible projectile".  Drop the
                   damage entirely when a noProjectile attacker is
                   outside melee range so mummies / skeletons can
                   only land melee swings. */
              var _atkArchKey = atkSrc ? (atkSrc.archetype || atkSrc.type) : null;   /* v2.3.2235: null on a blast from a departed monster */
              var _atkVariant = MONSTER_VARIANTS[_atkArchKey];
              /* v2.3.2235: ...and the melee-only filter is the same question
                 a third time.  The blue slime carries no noProjectile flag so
                 this is not what swallowed the owner's blast, but the next
                 variant to get an AoE would walk straight into it. */
              if (_atkVariant && _atkVariant.noProjectile && _atkDist > 60 && !_srvResolved) {
                if (window.__dmgLog) try { console.log('[dmg] net-monster_attack DROPPED (noProjectile out of melee)', { monsterId: payload.monsterId, dist: Math.round(_atkDist), arch: _atkArchKey }); } catch (e) {}
                break;
              }
              if (_atkVariant && _atkVariant.dmgMult) {
                mDmg = Math.ceil(mDmg * _atkVariant.dmgMult);
              }
              /* Apply player defense.  In MP the worker is the source of
                 truth for HP -- it ran the same formula and pushed the
                 resolved dmgTaken in the event payload.  Prefer that for
                 the popup; fall back to local recompute when serverMonsters
                 isn't set (SP-only mode, local AI). */
              var pDef2 = (R2.endurance || 0) * 0.5 + ((R2.armor ? R2.armor.tierMult : 1) || 1) * 3;
              var dmgTaken2 = (typeof payload.dmgTaken === 'number' && S._serverMonsters)
                ? payload.dmgTaken
                : Math.max(1, mDmg - pDef2 * 0.3);
              /* v2.3.1705: …and now the arc test is what KEEPS it agreeing —
                 the server went directional in the same version. */
              /* v2.3.1705: directional again (owner: "yes blocking should be
                 directional").  This is the FALLBACK path — the worker's own
                 `blocked` flag above is the authority in a server zone — but it
                 has to agree with the new rule or a client-side block would
                 keep a hit the server just landed. */
              /* ═══ v2.3.2238: ...AND THE LOCAL BLOCK MUST NOT EAT A HIT
                 THE WORKER ALREADY RESOLVED ═══
                 This branch is the FALLBACK — its own comment below says
                 the worker's `blocked` flag is the authority in a server
                 zone — but it was gated only on S._shieldUp, so it fired
                 against server-resolved damage too and zeroed the number
                 while player_state quietly dropped the HP.  That is the
                 same class of bug as v2.3.2235's three filters, found in
                 the same handler, and the fire trail is the case that
                 makes it certain rather than theoretical: fire under your
                 feet has no direction, so a shield pointed anywhere near
                 it would swallow every tick's popup.  `_srvResolved` means
                 the worker already priced block, parry and mitigation. */
              if (S._shieldUp && !_srvResolved && isAttackInShieldArc(S, _atkX, _atkY)) {
                /* Full block: no damage through.  (Was partial via
                   calcBlockReduction; user request is "the damage gets
                   blocked.")  In MP the server already skipped the
                   attack when ps.blocking was set on the move event,
                   so dmgTaken2 from payload is for non-block hits; but
                   if a stale shield-up arc-test landed here we still
                   want the local block visual. */
                dmgTaken2 = 0;
                R2.stamina = Math.max(0, (R2.stamina || 0) - 15);
                /* Count-based weight: 1 successful block = 3 hits worth
                   of endurance share.  Pairs with hit weight = 1 to
                   match the user's hits-vs-blocks ratio for the
                   Endurance share of killXp. */
                addBuildUse(R2, 'endurance', 3);
                /* v2.3.1113: fallback block trains defense too.
                   v2.3.1140: ±5 gate live (see block above). */
                trainDefense(R2, mDmg, 0, (atkSrc && atkSrc.level) || null, false);
              }
              /* Check dodge */
              if (S._dodgeRoll) break; /* in i-frames */
              /* HP mutation: worker authoritative in MP.  Don't decrement
                 local R.hp here -- the player_state event that follows
                 monster_attack carries the new authoritative hp.  Keep
                 the SP-only path for client-local monsters. */
              if (!S._serverMonsters) {
                R2.hp = Math.max(0, R2.hp - Math.ceil(dmgTaken2));
              }
              /* v2.3.1113: unblocked hit taken -> defense XP at quarter
                 rate (DEFENSE_XP_TAKEN inside trainDefense).  Runs in MP
                 too -- the damage really landed; only HP echo is deferred
                 to player_state. */
              if (dmgTaken2 > 0) {
                /* v2.3.1140: ±5 gate live (see block above). */
                var _defUpTk = trainDefense(R2, 0, Math.ceil(dmgTaken2), (atkSrc && atkSrc.level) || null, false);
                if (_defUpTk) pushDmgPopup(S, S.player.x, S.player.y - 34, '🛡️ Defense Lv ' + _defUpTk.level, '#60a5fa', { ts: Date.now() + 2 });
              }
              if (window.__dmgLog) try {
                console.log('[dmg] net-monster_attack', {
                  amt: Math.ceil(dmgTaken2),
                  monsterId: payload.monsterId,
                  /* server-side fields — present means brotown-server is deployed past 582553b */
                  srvAttackerXY: (typeof payload.attackerX === 'number') ? { x: Math.round(payload.attackerX), y: Math.round(payload.attackerY) } : null,
                  srvDeployed: typeof payload.attackerX === 'number',
                  /* local snapshot */
                  localAttacker: atkSrc ? { x: Math.round(atkSrc.x), y: Math.round(atkSrc.y), arch: atkSrc.arch || atkSrc.archetype, alive: atkSrc.alive } : 'NOT_IN_SNAPSHOT',
                  /* what the filter saw */
                  resolvedAtk: { x: Math.round(_atkX), y: Math.round(_atkY) },
                  player: { x: Math.round(S.player.x), y: Math.round(S.player.y) },
                  dist: Math.round(_atkDist),
                  shieldUp: !!S._shieldUp,
                  /* v2.3.1705: arc restored -- block is directional again */
                  inArc: !!S._shieldUp && isAttackInShieldArc(S, _atkX, _atkY),
                });
              } catch (e) {}
              /* v2.3.248: player sprite hit-flash on MP server-monster
                 hits.  SP paths (lines 7585 / 7653 / 7906 / 7950 / 10919)
                 already set this on local hits; the MP monster_attack
                 handler was missing it, so the renderer's
                 isHit = S._hitFlash && (now - S._hitFlash) < 250
                 check at entityRenderer.js:1943 never tripped and the
                 sprite never flashed red.  Only flash when actual damage
                 lands (block / dodge zero dmgTaken2 → no flash). */
              if (Math.ceil(dmgTaken2) > 0) {
                S._hitFlash = Date.now();
                /* v2.3.2200: directional camera kick AWAY from the
                   attacker — being hit should physically shove the view,
                   not just tint it.  Same single-slot _camPunch the melee
                   crit uses (BroTown.jsx applies + 300ms-decays it);
                   force 6 stays under the crit's 12 per LANTERN-SLATE
                   restraint.  Guarded on real damage so blocks/dodges
                   don't shove. */
                var _cpAng2 = Math.atan2(S.player.y - _atkY, S.player.x - _atkX);
                S._camPunch = { dx: Math.cos(_cpAng2) * 6, dy: Math.sin(_cpAng2) * 6, ts: Date.now() };
              }
              /* v2.3.110: heart glyph alongside "-N" popup so the
                 loss-of-HP intent reads instantly. */
              pushDmgPopup(S, S.player.x, S.player.y - 20, '-' + Math.ceil(dmgTaken2), '#ff5e6c', { iconKey: 'heart' });
              /* v2.3.1137: Second Wind — the worker healed us right after
                 this hit (defense channel, 10s cooldown); green popup.
                 The authoritative hp arrives via player_state as usual. */
              /* v2.3.1314: Last Stand — the killing blow left us at 1 HP. */
              if (payload.lastStand) {
                pushDmgPopup(S, S.player.x, S.player.y - 52, 'LAST STAND!', '#D8AA58', { ts: Date.now() + 3 });
              }
              if (payload.secondWind > 0) {
                pushDmgPopup(S, S.player.x + 16, S.player.y - 38, '+' + payload.secondWind + ' Second Wind', '#4ade80', { ts: Date.now() + 2 });
              }
              for (var hp3 = 0; hp3 < 4; hp3++) S.hitParticles.push({
                x: S.player.x, y: S.player.y,
                vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                life: 0.6, color: '#ff5e6c', size: 2
              });
              S.screenShake = 3;
              /* v2.3.1598 (owner): the armour clang, not a dead beep.
                 This is the SERVER-AUTHORITATIVE hit path — the one that
                 actually runs, since the game is 100% server-based — and it
                 still called beep(), which has been a no-op since v2.3.1103
                 removed all synthesised audio.  So being hit by a monster has
                 been SILENT ever since.  The real sound existed the whole
                 time: monsterHitHero() picks the metallic armor-hit-1/2 when
                 armoured and falls back to the bare 'monster-hit' thud, and
                 the legacy client-local combat path in monsterCombat.js has
                 called it since v2.3.1108.  Only the network path was missed,
                 and the network path is the only one players hear.
                 vol 0.85 matches the four monsterCombat.js call sites. */
              try { BT_AUDIO.monsterHitHero(isWearingArmor(), { vol: 0.85 }); } catch (e) {}
              /* Death path: in MP the worker fires player_died (which
                 handles the death animation + popup) and player_respawned
                 (which teleports to town) -- both wired in the WS switch
                 above.  Local R2.hp can lag the server by a tick, so we
                 must NOT trigger death from a local <=0 check in MP.
                 Keep the SP path for client-local monsters. */
              if (!S._serverMonsters && R2.hp <= 0 && !S._dying) {
                /* Player death from client-local monster (SP mode) */
                S._dying = true;
                if (!R2._compStats) R2._compStats = createDefaultCompStats();
                R2._compStats.deaths++;
                /* Death-anim timeline starts now; renderer plays the
                   21-frame sequence until respawn clears it. */
                S._deathStart = Date.now();
                /* Tell the server we died now so monster AI stops
                   targeting us during the 5 s respawn window, and
                   broadcast the death so remote clients render a
                   dead pose at our last position. */
                if (S.channel) S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } });
                if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_died_to_monster', payload: { id: S.myId, x: S.player.x, y: S.player.y } });
                /* Gold penalty */
                var goldLost2 = Math.floor(R2.coins * DEATH_GOLD_PENALTY);
                R2.coins = Math.max(0, R2.coins - goldLost2);
                /* Death particles */
                for (var dp2 = 0; dp2 < 25; dp2++) {
                  var dpA2 = dp2 / 25 * Math.PI * 2;
                  S.hitParticles.push({
                    x: S.player.x, y: S.player.y,
                    vx: Math.cos(dpA2) * (2 + Math.random() * 4),
                    vy: Math.sin(dpA2) * (2 + Math.random() * 4) - 1,
                    life: 1.0, color: ['#ff5e6c','#cc2233','#ff8888'][Math.floor(Math.random()*3)], size: 2 + Math.random() * 3
                  });
                }
                S.screenShake = 10;
                pushDmgPopup(S, S.player.x, S.player.y - 40, 'YOU DIED', '#ff5e6c');
                if (goldLost2 > 0) pushDmgPopup(S, S.player.x, S.player.y - 55, '-' + goldLost2 + 'G', '#fbbf24');
                BT_AUDIO.deathBoom();
                /* Respawn in town after delay */
                var respawnDelay = 5000;
                setTimeout(function() {
                  R2.hp = R2.maxHp;
                  R2.stamina = R2.maxStamina;
                  R2.mana = R2.maxMana;
                  S.currentZone = 'town';
                  updateZoneDimensions('town');
                  BT_AUDIO.startZoneAmbient('town');
                  S.map = generateZoneMap('town');
                  S.monsters = []; /* Town has no monsters */
                  S.gatherNodes = []; /* and no harvestable resources -- clear stale entries from the previous zone */
                  S.player.x = 24 * TILE;
                  S.player.y = 24 * TILE;
                  S.respawnTimer = Date.now() + 3000;
                  S._deathStart = 0;
                  S._dying = false;
                  /* Server learns dead=false + new zone via this move;
                     other clients clear our _isDead via the broadcast. */
                  if (S.channel) S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } });
                  if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_respawned', payload: { id: S.myId } });
                  setRpgState(_objectSpread({}, R2));
                  try { localStorage.setItem('bt_rpg', JSON.stringify(R2)); } catch(e) {}
                }, respawnDelay);
              }
              setRpgState(_objectSpread({}, R2));
              break;
            }
          case 'player_hurt_by_monster':
            {
              /* Client-local monster damage report — used in zones that
                 still run client-local AI (e.g. dungeon waves).  For
                 server-authoritative zones the monster_attack handler
                 above already does this; this case covers anything
                 else.  Visual only. */
              if (payload.id === S.myId) break;
              /* v2.3.1574: popup is drawn at THEIR world coords -- from another zone
                 those land at an arbitrary spot on your map. */
              if (!_peerInZone(S, payload.id)) break;
              var hurtOther = S.others && S.others[payload.id];
              if (!hurtOther) break;
              hurtOther._hitFlash = Date.now();
              pushDmgPopup(S, hurtOther.x || 0, (hurtOther.y || 0) - 20, '-' + (payload.dmg || 0), '#ff5e6c');
              break;
            }
          case 'monster_dmg_at':
            {
              /* Client-local monster damage broadcast — used in zones
                 that still run client-local AI.  Server-authoritative
                 zones use monster_hit instead, which the handler above
                 already covers.  Drops own echoes. */
              if (payload.id === S.myId) break;
              /* v2.3.1748: same missing zone gate as the death burst above —
                 and conspicuous here, because the sibling case immediately
                 above this one (player_hurt_by_monster) has always had it.
                 Cross-zone damage floaters drifted over your map at the
                 hitter's coordinates. */
              if (!_peerInZone(S, payload.id)) break;
              /* Client-local peer floater -> smoothing queue (keyed by a
                 coarse position bucket since this carries only x,y). */
              enqueuePeerDamage(S, peerDmgKey(null, payload.x || 0, payload.y || 0), {
                x: payload.x || 0,
                y: (payload.y || 0) - 20,
                text: '-' + (payload.dmg || 0),
                color: payload.isCrit ? DMG_CRIT_COLOR : '#ff8888',
                /* v2.3.2211: a peer's crit reads as a crit too -- found by the
                   crit-popup precheck rule, not by hand. */
                crit: !!payload.isCrit,
                iconKey: payload.isCrit ? 'crit' : undefined
              });
              break;
            }
          case 'player_died_to_monster':
            {
              /* Remote player died on their client.  Spawn the same
                 red death-burst + skull popup we render locally,
                 anchored to the reported position.  Also set
                 _isDead on the remote entry so we render a death
                 pose and suppress further hit-flash events for them
                 until they broadcast player_respawned (or their next
                 tick payload shows them alive in a new zone).  PvP
                 deaths are handled by pvp_confirmed and aren't
                 double-rendered. */
              if (payload.id === S.myId) break;
              /* v2.3.1748: and not from another zone.  The event relay is
                 room-wide by design (server/src/index.js: the one tick section
                 v2.3.1575's interest management deliberately did NOT
                 zone-scope), so EVERY zone-scoping decision for these effects
                 is the client's.  This one was missing: a death in Frost Ridge
                 painted a 20-particle burst and a 'KO' popup at those raw
                 world coordinates onto whatever map you were standing on. */
              if (!_peerInZone(S, payload.id)) break;
              var deadOther = S.others && S.others[payload.id];
              if (deadOther) {
                deadOther._isDead = true;
                deadOther._deathTs = Date.now();
              }
              var dthX = payload.x || 0, dthY = payload.y || 0;
              for (var dpx = 0; dpx < 20; dpx++) {
                var dpAx = dpx / 20 * Math.PI * 2;
                S.hitParticles.push({
                  x: dthX, y: dthY,
                  vx: Math.cos(dpAx) * (2 + Math.random() * 4),
                  vy: Math.sin(dpAx) * (2 + Math.random() * 4) - 1,
                  life: 1.0,
                  color: ['#ff5e6c','#cc2233','#ff8888'][Math.floor(Math.random()*3)],
                  size: 2 + Math.random() * 2
                });
              }
              pushDmgPopup(S, dthX, dthY - 40, 'KO', '#ff5e6c', { ttl: 2.0 });
              break;
            }
          case 'player_respawned':
            {
              /* Remote player respawned — clear the death visual.  We
                 also tolerate the tick-arrival ordering case where the
                 remote's move msg (with the new town position) arrives
                 first; the renderer simply reads _isDead each frame, so
                 clearing it here is sufficient. */
              if (payload.id === S.myId) break;
              var resOther = S.others && S.others[payload.id];
              if (resOther) {
                resOther._isDead = false;
                resOther._deathTs = 0;
              }
              break;
            }
          /* mkt_order removed — marketplace uses server API now */
          case 'clan_invite':
            {
              /* v2.3.1125: incoming invites used to have NO handler --
                 joining a clan was impossible.  Park the invite; the
                 Clan panel's no-clan view renders the accept button
                 (sends clan_join_accept, validated server-side). */
              if (payload.target === S.myId && !S._clanData) {
                S._pendingClanInvite = {
                  inviter: payload.from,
                  fromName: payload.fromName || 'Someone',
                  clanName: payload.clanName || '',
                  clanTag: payload.clanTag || '?',
                  ts: Date.now()
                };
                pushDmgPopup(S, S.player.x, S.player.y - 40, '[' + S._pendingClanInvite.clanTag + '] clan invite! (open Clans)', '#a78bfa');
                BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
              }
              break;
            }
          case 'clan_state':
            {
              /* v2.3.1125: the server's clan registry echo -- cache it
                 where the panel reads (S._clanData) and where the boot
                 path caches (bt_clan).  null = not in a clan. */
              S._clanData = payload.clan || null;
              try {
                if (payload.clan) localStorage.setItem('bt_clan', JSON.stringify(payload.clan));
                else localStorage.removeItem('bt_clan');
              } catch (e) {}
              /* v2.3.1611: ...and into REACT state, which is what the UI
                 actually renders from.  Every clan surface reads the
                 `clanData` prop, and setClanData was called from exactly two
                 places: the mount-time bt_clan restore, and ClanPanel's
                 LEGACY local-mint create path.  Against a real (caps.clans)
                 worker the create path returns early after sending
                 clan_create, so this echo was the only thing that could
                 update the UI — and it didn't.  Founding a clan therefore
                 charged the 500g, created the clan server-side, and left the
                 screen insisting you had no clan: the panel still offered
                 "Create Clan (500g)", and the inspect card's
                 "Invite to [TAG]" button — gated on clanData — never
                 appeared, so a founder could not invite anyone.  Only a page
                 reload (which reads bt_clan) fixed it.  The same echo lands a
                 JOIN, so an accepted invite was equally invisible.
                 Found by the headless clan scenario (tools/qa/mp): the clan
                 existed in S._clanData with the fee debited, while the UI
                 offered no way to act on it. */
              if (setClanData) setClanData(payload.clan || null);
              break;
            }
          case 'clan_error':
            {
              if (payload && payload.text) pushDmgPopup(S, S.player.x, S.player.y - 30, payload.text, '#ff5e6c');
              break;
            }
          case 'clan_war_declare':
            {
              /* Another clan declared war — check if we're the target */
              var war = payload.war;
              if (!war || !S._clanData) break;
              if (war.defender.tag === S._clanData.tag) {
                var _ZONES$war$zone;
                /* We're being challenged! */
                S._activeClanWar = war;
                war.defender.members.push(S.myId);
                pushDmgPopup(S, S.player.x, S.player.y - 40, '[' + war.challenger.tag + '] declared WAR!', '#ff5e6c');
                pushDmgPopup(S, S.player.x, S.player.y - 25, 'Battle zone: ' + (((_ZONES$war$zone = ZONES[war.zone]) === null || _ZONES$war$zone === void 0 ? void 0 : _ZONES$war$zone.name) || war.zone), 'rgba(255,255,255,.5)');
                BT_AUDIO.beep(200, 0.2, 0.25, 'sawtooth');
                S.screenShake = 6;
              } else if (war.challenger.tag === S._clanData.tag) {
                /* We're in the challenger clan — join the war */
                if (!S._activeClanWar) S._activeClanWar = war;
                S._activeClanWar.challenger.members.push(S.myId);
              }
              break;
            }
          case 'clan_war_kill':
            {
              /* A kill happened in the war zone */
              if (!S._activeClanWar) break;
              var _war = S._activeClanWar;
              if (payload.warId !== _war.id) break;
              _war.killLog.push(payload.kill);
              if (payload.scoreSide === 'challenger') _war.challenger.score += payload.kill.points;else if (payload.scoreSide === 'defender') _war.defender.score += payload.kill.points;
              pushDmgPopup(S, S.player.x, S.player.y - 50, payload.kill.killer + ' -> ' + payload.kill.victim, 'rgba(255,255,255,.4)');
              break;
            }
          case 'clan_war_end':
            {
              if (!S._activeClanWar || payload.warId !== S._activeClanWar.id) break;
              S._activeClanWar.status = 'ended';
              S._activeClanWar.winner = payload.winner;
              var isWinner = S._clanData && payload.winner === S._clanData.tag;
              var reward = isWinner ? CLAN_WAR_REWARDS.winner : CLAN_WAR_REWARDS.loser;
              /* v2.3.1125: clan-capable workers pay war rewards
                 server-side via the mail/escrow plumbing (gold arrives
                 through inbox_delivered + the player_state echo) -- the
                 local mint below was the other half of the forgeable
                 peer war.  Legacy workers only. */
              if (!(S._serverCaps && S._serverCaps.clans) && S.rpg) {
                S.rpg.coins += reward.gold;
                S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + reward.ap;
                if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += reward.gold;
              }
              pushDmgPopup(S, S.player.x, S.player.y - 50, isWinner ? 'WAR WON!' : 'War lost...', isWinner ? '#f5c542' : '#ff5e6c');
              pushDmgPopup(S, S.player.x, S.player.y - 35, '+' + reward.gold + 'G +' + reward.ap + 'AP', '#f5c542');
              if (isWinner) BT_AUDIO.levelUp();else BT_AUDIO.beep(150, 0.1, 0.15, 'triangle');
              setTimeout(function () {
                S._activeClanWar = null;
              }, 10000); /* clear after 10s */
              break;
            }
          case 'arena_bet':
            /* v2.3.1176: relayed spectator bets are deliberately
               IGNORED.  History: this switch carried TWO 'arena_bet'
               cases; the first (dead code -- it keyed on bettorId,
               which only one of the send sites carries, and fed an
               unread S._remoteBets array) shadowed this one, so no
               remote bet ever reached the UI.  Un-shadowing the old
               setArenaBets handler here was tried and is UNSAFE: the
               arenaBets consumers in PartyPanel predate remote
               delivery -- the Active Bets renderer crashes on
               bettorId-shaped bets (b.playerId.slice of undefined),
               'Your Bets' filters by tournament only (others' bets
               would render as yours), the sender's own server echo
               isn't filtered (double-count), and on legacy workers
               (!caps.sponsor) the local pot-split mint would count
               forged remote amounts straight into S.rpg.coins.  Real
               stakes settle server-side via arena_sponsor
               (docs/specs/sponsorship.md); a spectator stake board
               needs a server-owned validated feed (handoff item A).
               Until then this relay is display-noise: drop it. */
            break;
          case 'stunned':
            {
              if (payload.target === S.myId) S._stunEnd = Date.now() + (payload.duration || 2000);
              break;
            }
          case 'trade_offer':
            {
              if (payload.target === S.myId) setIncomingTrade({
                from: payload.from,
                fromName: payload.fromName,
                offer: payload.offer,
                ts: Date.now()
              });
              break;
            }
          case 'trade_accept':
            {
              if (payload.target === S.myId) {
                var _R = S.rpg;
                if (!_R) break;
                /* v2.3.1119: this is the SENDER hearing their offer was
                   accepted.  The old mint below was the other half of
                   the trade duplication engine -- the GIVER credited
                   themselves the goods they just gave away (it also
                   read a shape that trade offers never had, offer.coins
                   / offer.items vs the real {itemKey: qty, _gold}).
                   Settlement-aware workers annotate the relay with
                   settled:true and have already debited us server-side;
                   the legacy mint stays only for old workers. */
                if (!payload.settled) {
                  var offer = payload.offer || {};
                  if (offer.coins) _R.coins = (_R.coins || 0) + offer.coins;
                  if (offer.items && _R.inventory) Object.entries(offer.items).forEach(function (_ref10) {
                    var _ref11 = _slicedToArray(_ref10, 2),
                      k = _ref11[0],
                      v = _ref11[1];
                    _R.inventory[k] = (_R.inventory[k] || 0) + v;
                  });
                }
                pushDmgPopup(S, S.player.x, S.player.y - 40, 'Trade complete!', '#3dd497');
                BT_AUDIO.collect();
                setRpgState(_objectSpread({}, _R));
              }
              break;
            }
          case 'trade_reject':
            {
              if (payload.target === S.myId) {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Trade declined', '#ff5e6c');
                BT_AUDIO.beep(200, 0.05, 0.08, 'square');
              }
              break;
            }
          case 'pvp_hit':
            {
              var _R2$armor, _R2$_shieldBonus;
              // §16.12 — Server-authoritative PvP hit (lag-compensated)
              // Server already decided this is a hit. Defender applies own defense calc.
              /* v2.3.1917: stamp the target's authoritative HP onto the peer
                 record FIRST, before any of the my-target / my-hit branching
                 below, so the health bar is fed on every hit no matter who is
                 watching.  Spectators included — a duel is something a room
                 gathers to watch.  `hp` is absent on an old worker, in which
                 case nothing is written and the bar simply never arms
                 (deploy-order safe: no bar beats a wrong bar). */
              if (payload.hp !== undefined && S.others && S.others[payload.target]) {
                var _pvB = S.others[payload.target];
                _pvB.rpgHp = payload.hp;
                if (payload.maxHp) _pvB.rpgMaxHp = payload.maxHp;
                _pvB._hpSeenAt = Date.now();
              }
              if (payload.target !== S.myId) {
                // Not targeted at us — if we're the attacker, show hit confirmation
                if (payload.attacker === S.myId) {
                  /* v2.3.1605 (owner: "all it says is hit when I hit the other
                     player ... needs to actually show HP damage numbers").
                     This used to float the literal word "Hit!" over the
                     ATTACKER'S OWN HEAD — the wrong text in the wrong place.
                     The server has always sent the resolved dmgTaken on this
                     payload (combat.js builds it); nothing read it on the
                     attacker's side.  Now the real number floats over the
                     TARGET, matching how PvE damage reads, with crit and the
                     block/dodge outcomes distinguished. */
                  var _pvTgt = S.others && S.others[payload.target];
                  var _pvX = _pvTgt ? (_pvTgt.x != null ? _pvTgt.x : _pvTgt.renderX) : S.player.x + 20;
                  var _pvY = (_pvTgt ? (_pvTgt.y != null ? _pvTgt.y : _pvTgt.renderY) : S.player.y) - 30;
                  if (payload.dodged) {
                    pushDmgPopup(S, _pvX, _pvY, 'Dodged', '#9ca3af');
                  } else if (payload.blocked) {
                    pushDmgPopup(S, _pvX, _pvY, 'Blocked', '#607D8B');
                  } else if (typeof payload.dmgTaken === 'number') {
                    pushDmgPopup(S, _pvX, _pvY,
                      '-' + Math.ceil(payload.dmgTaken) + (payload.isCrit ? '!' : ''),
                      payload.isCrit ? DMG_CRIT_COLOR : '#ff5e6c',
                      /* v2.3.2211: this one already SAID crit with a '!' and
                         a colour, and still drew at ordinary size. */
                      payload.isCrit ? { crit: true, iconKey: 'crit' } : undefined);
                  }
                  /* Flash the opponent so a hit reads even off-centre, the same
                     feedback a monster gets. */
                  if (_pvTgt && !_pvTgt._isDead) _pvTgt._hitFlash = Date.now();
                }
                break;
              }
              var _R2 = S.rpg;
              if (!_R2) break;
              var pDef = _R2.endurance * 0.5 + (((_R2$armor = _R2.armor) === null || _R2$armor === void 0 ? void 0 : _R2$armor.tierMult) || 1) * 3 + (((_R2$_shieldBonus = _R2._shieldBonus) === null || _R2$_shieldBonus === void 0 ? void 0 : _R2$_shieldBonus.blockFlat) || 0);
              var rawDmg = payload.dmgBase || 10;
              var dmgTaken = Math.max(1, rawDmg - pDef * 0.3);
              // §16.12 — Server already resolved block via historical state
              if (payload.blocked) dmgTaken = Math.ceil(dmgTaken * 0.25);
              /* v2.3.2248: a blocked duel hit no longer lowers the shield --
                 same rule as the monster branch above, same one-line reason.
                 A duel is where a shield that survives its first block matters
                 most, so the two branches must not drift apart. */
              S.lastDamageTaken = Date.now();   /* v2.3.2242 (post-review): a duel hit is combat too */
              if (payload.isCrit) dmgTaken = Math.ceil(dmgTaken * 1.5);
              /* Prefer the server's resolved dmgTaken when present
                 (worker now applies HP damage and the value rides on
                 the payload).  Falls back to local recompute if a peer
                 hasn't deployed the new worker yet. */
              if (typeof payload.dmgTaken === 'number') dmgTaken = payload.dmgTaken;
              /* Worker authoritative HP store: don't mutate R2.hp here.
                 The player_state event that follows pvp_hit carries the
                 new authoritative value.  Death is driven by the server's
                 player_died event. */
              if (window.__dmgLog) try { console.log('[dmg] net-pvp_hit', { amt: Math.ceil(dmgTaken), attacker: payload.attacker, blocked: payload.blocked }); } catch (e) {}
              pushDmgPopup(S, S.player.x, S.player.y - 20, '-' + Math.ceil(dmgTaken), payload.blocked ? '#607D8B' : '#ff5e6c');
              /* v2.3.1137: Second Wind fires in PvP too (see server
                 _applyDamage); mirror the green heal popup here. */
              /* v2.3.1314: Last Stand — the killing blow left us at 1 HP. */
              if (payload.lastStand) {
                pushDmgPopup(S, S.player.x, S.player.y - 52, 'LAST STAND!', '#D8AA58', { ts: Date.now() + 3 });
              }
              if (payload.secondWind > 0) {
                pushDmgPopup(S, S.player.x + 16, S.player.y - 38, '+' + payload.secondWind + ' Second Wind', '#4ade80', { ts: Date.now() + 2 });
              }
              if (payload.blocked) pushDmgPopup(S, S.player.x, S.player.y - 35, 'BLOCKED', '#607D8B');
              for (var hp2 = 0; hp2 < 6; hp2++) S.hitParticles.push({
                x: S.player.x,
                y: S.player.y,
                vx: (Math.random() - .5) * 4,
                vy: -1 - Math.random() * 2,
                life: 0.8,
                color: '#ff5e6c',
                size: 2
              });
              S.screenShake = payload.blocked ? 2 : 4;
              /* v2.3.1605: real hit sound, not the beep() that has been a no-op
                 since v2.3.1103 — the same dead call the monster hit carried
                 until v2.3.1598.  Being hit by a PLAYER was silent for the same
                 reason and is fixed the same way. */
              try { BT_AUDIO.monsterHitHero(isWearingArmor(), { vol: 0.85 }); } catch (e) {}
              /* Predict "Killed by X" popup from the (server-resolved
                 or locally-computed) dmgTaken vs current local hp.  HP
                 doesn't mutate locally in MP anymore, so checking
                 _R2.hp <= 0 directly would never fire.  The server-side
                 player_died event drives the death animation; this
                 attribution popup is best-effort. */
              /* v2.3.1306: prefer the server's authoritative died flag —
                 the local-hp prediction reads STALE hp when several
                 pvp_hits land before one player_state flush (staff heavy
                 = 3 bolts/cast), under-counting real kills and minting
                 phantom ones when Second Wind saved the target. */
              var _wouldDiePvp = typeof payload.died === 'boolean'
                ? payload.died
                : (_R2.hp - Math.ceil(dmgTaken)) <= 0;
              if (_wouldDiePvp) {
                pushDmgPopup(S, S.player.x, S.player.y - 45, 'Killed by ' + (payload.attackerName || '???'), '#ff5e6c');
                BT_AUDIO.deathBoom();
              }
              // Send pvp_confirmed back for kill tracking, clan wars, arena
              if (S.channel) S.channel.send({
                type: 'broadcast',
                event: 'pvp_confirmed',
                payload: {
                  target: payload.attacker,
                  from: S.myId,
                  dmg: dmgTaken,
                  isCrit: payload.isCrit,
                  died: _wouldDiePvp,
                  name: S.myName,
                  blocked: payload.blocked,
                  /* v2.3.1612: "this one came from the SERVER's pvp_hit".  The
                     attacker uses it to skip the legacy hit popup, which would
                     otherwise double up on the real damage number — see the
                     pvp_confirmed handler below.  Old clients ignore the
                     field; old workers never produce a pvp_hit for us to set
                     it on, so both deploy orders keep working (rule 19). */
                  srv: true
                }
              });
              setRpgState(_objectSpread({}, _R2));
              break;
            }
          case 'player_attack':
            {
              var _S$_activeDuel, _ZONES$S$currentZone, _ZONES$S$currentZone2, _R3$armor, _R3$_shieldBonus;
              if (payload.target !== S.myId) break;
              var _R3 = S.rpg;
              if (!_R3) break;
              var isInDuel = ((_S$_activeDuel = S._activeDuel) === null || _S$_activeDuel === void 0 ? void 0 : _S$_activeDuel.partnerId) === payload.id;
              var isLawless = (_ZONES$S$currentZone = ZONES[S.currentZone]) === null || _ZONES$S$currentZone === void 0 ? void 0 : _ZONES$S$currentZone.lawless;
              if (!isInDuel && !isLawless && (_ZONES$S$currentZone2 = ZONES[S.currentZone]) !== null && _ZONES$S$currentZone2 !== void 0 && _ZONES$S$currentZone2.safe) {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Safe zone!', '#3dd497');
                break;
              }
              var _pDef = _R3.endurance * 0.5 + (((_R3$armor = _R3.armor) === null || _R3$armor === void 0 ? void 0 : _R3$armor.tierMult) || 1) * 3 + (((_R3$_shieldBonus = _R3._shieldBonus) === null || _R3$_shieldBonus === void 0 ? void 0 : _R3$_shieldBonus.blockFlat) || 0);
              var _rawDmg = payload.dmg || 10;
              var _dmgTaken = Math.max(1, _rawDmg - _pDef * 0.3);
              var isCrit = payload.isCrit;
              if (isCrit) _dmgTaken = Math.ceil(_dmgTaken * 1.5);
              /* Worker authoritative HP store: don't mutate R3.hp here.
                 The player_state event that follows player_attack carries
                 the new authoritative value.  Death is driven by the
                 server's player_died event. */
              if (window.__dmgLog) try { console.log('[dmg] net-player_attack', { amt: Math.ceil(_dmgTaken), attacker: payload.id, isCrit: isCrit }); } catch (e) {}
              pushDmgPopup(S, S.player.x, S.player.y - 20, '-' + Math.ceil(_dmgTaken), '#ff5e6c');
              for (var _hp = 0; _hp < 6; _hp++) S.hitParticles.push({
                x: S.player.x,
                y: S.player.y,
                vx: (Math.random() - .5) * 4,
                vy: -1 - Math.random() * 2,
                life: 0.8,
                color: '#ff5e6c',
                size: 2
              });
              S.screenShake = 4;
              BT_AUDIO.beep(200, 0.1, 0.15, 'sawtooth');
              if (S.channel) S.channel.send({
                type: 'broadcast',
                event: 'stunned',
                payload: {
                  target: payload.id,
                  duration: 2000
                }
              });
              /* Predict "Killed by X" popup from predicted dmg vs current
                 local hp (worker-authoritative store means _R3.hp won't
                 reflect the hit until player_state arrives). */
              var _wouldDieAtk = (_R3.hp - Math.ceil(_dmgTaken)) <= 0;
              if (_wouldDieAtk) {
                pushDmgPopup(S, S.player.x, S.player.y - 45, 'Killed by ' + payload.name, '#ff5e6c');
                BT_AUDIO.deathBoom();
              }
              if (S.channel) S.channel.send({
                type: 'broadcast',
                event: 'pvp_confirmed',
                payload: {
                  target: payload.id,
                  from: S.myId,
                  dmg: _dmgTaken,
                  isCrit: isCrit,
                  died: _wouldDieAtk
                }
              });
              setRpgState(_objectSpread({}, _R3));
              break;
            }
          case 'pvp_confirmed':
            {
              if (payload.target !== S.myId) break;
              /* v2.3.1612 (owner, again: "all it says is hit when I hit the
                 other player").  v2.3.1605 fixed the pvp_hit popup — the real
                 number now floats over the TARGET — but it never touched this
                 one, and this is the one the owner was looking at: bright
                 amber, over your OWN head, led by the literal word "Hit!".
                 Both fire on every single server-resolved hit, because the
                 defender answers pvp_hit with a pvp_confirmed for kill
                 tracking, and the attacker drew a second popup off that
                 bookkeeping message.  Caught by the headless duel scenario,
                 which read the attacker's popups and found "Hit! -4".
                 pvp_confirmed carries no damage information the attacker did
                 not already receive on pvp_hit, so on a server-resolved hit it
                 draws nothing and stays what it is: kill/clan-war/arena
                 bookkeeping.  Against a LEGACY worker that resolves no PvP
                 there is no pvp_hit, the defender sends no `srv`, and this
                 popup remains the attacker's only feedback — so it still
                 shows, exactly as before. */
              if (!payload.srv) {
                pushDmgPopup(S, S.player.x + 20, S.player.y - 20, 'Hit! -' + Math.ceil(payload.dmg), '#fbbf24');
              }
              if (payload.died) {
                pushDmgPopup(S, S.player.x, S.player.y - 50, 'KILL!', '#3dd497');
                BT_AUDIO.collect();
                if (!S.rpg._compStats) S.rpg._compStats = createDefaultCompStats();
                S.rpg._compStats.pvpKills++;
                /* §CW — Score clan war kill.  v2.3.1125: clan-capable
                   workers referee wars themselves (the server observes
                   its own pvp deaths and emits clan_war_kill) -- this
                   self-scoring block was half of the forgeable peer war
                   and runs only against legacy workers. */
                if (!(S._serverCaps && S._serverCaps.clans) && S._activeClanWar && S._activeClanWar.status === 'active' && S.currentZone === S._activeClanWar.zone) {
                  var _S$_clanData, _S$rpg4;
                  var _war2 = S._activeClanWar;
                  var isChallenger = ((_S$_clanData = S._clanData) === null || _S$_clanData === void 0 ? void 0 : _S$_clanData.tag) === _war2.challenger.tag;
                  var points = 1 + Math.floor((((_S$rpg4 = S.rpg) === null || _S$rpg4 === void 0 ? void 0 : _S$rpg4.level) || 1) / 20); /* higher level = more points */
                  var kill = {
                    killer: S.myName,
                    victim: payload.name || '???',
                    ts: Date.now(),
                    points: points
                  };
                  _war2.killLog.push(kill);
                  if (isChallenger) _war2.challenger.score += points;else _war2.defender.score += points;
                  if (S.channel) S.channel.send({
                    type: 'broadcast',
                    event: 'clan_war_kill',
                    payload: {
                      warId: _war2.id,
                      kill: kill,
                      scoreSide: isChallenger ? 'challenger' : 'defender'
                    }
                  });
                  pushDmgPopup(S, S.player.x, S.player.y - 65, '+' + points + ' war points!', '#ff5e6c');
                }
                /* §ARENA — Report arena match result if this was an arena fight.
                   v2.3.1126: refereeing workers (caps.arena) observe match
                   outcomes from their own duel resolution -- the client-claimed
                   winnerId POST below was the collusion hole (two clients could
                   trade fake wins), and the win/champion self-credit was
                   phantom.  Legacy workers only; the new flow renders from the
                   privileged arena_match_result / arena_tournament_complete
                   events instead. */
                if (!(S._serverCaps && S._serverCaps.arena) && S._arenaMatch && (payload.from === S._arenaMatch.p1 || payload.from === S._arenaMatch.p2)) {
                  var match = S._arenaMatch;
                  var loserId = payload.from; /* the person who sent pvp_confirmed with died=true is confirming WE killed THEM */
                  /* Actually: pvp_confirmed target=us, from=attacker. If died=true, the attacker got a kill confirmation.
                     So WE are the killer (target got confirmed as the killer) */
                  fetch(BT_API_BASE + '/api/arena/result', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      tournamentId: S._arenaTournamentId,
                      matchId: match.id,
                      winnerId: S.myId,
                      loserId: match.p1 === S.myId ? match.p2 : match.p1
                    })
                  }).then(function (r) {
                    return r.json();
                  }).then(function (d) {
                    if (d.ok) {
                      var _d$champion;
                      S._arenaMatch = null;
                      if (d.tournamentComplete && ((_d$champion = d.champion) === null || _d$champion === void 0 ? void 0 : _d$champion.id) === S.myId) {
                        /* WE ARE THE CHAMPION */
                        S.rpg.coins += ARENA_CHAMPION_REWARD.gold;
                        S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + ARENA_CHAMPION_REWARD.ap;
                        if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += ARENA_CHAMPION_REWARD.gold;
                        if (!S.rpg._titles) S.rpg._titles = [];
                        if (!S.rpg._titles.includes('Gladiator')) S.rpg._titles.push('Gladiator');
                        pushDmgPopup(S, S.player.x, S.player.y - 80, 'GLADIATOR CHAMPION!', '#f5c542');
                        pushDmgPopup(S, S.player.x, S.player.y - 65, '+' + ARENA_CHAMPION_REWARD.gold + 'G +' + ARENA_CHAMPION_REWARD.ap + 'AP', '#f5c542');
                        BT_AUDIO.levelUp();
                        S.screenShake = 10;
                      } else {
                        var _d$tournament;
                        S.rpg.coins += ARENA_WIN_REWARD.gold;
                        S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + ARENA_WIN_REWARD.ap;
                        pushDmgPopup(S, S.player.x, S.player.y - 80, 'Arena win! Round ' + ((_d$tournament = d.tournament) === null || _d$tournament === void 0 ? void 0 : _d$tournament.round), '#3dd497');
                      }
                      setRpgState(_objectSpread({}, S.rpg));
                      try {
                        localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                      } catch (_unused10) {}
                      if (d.tournament) setArenaTournament(d.tournament);
                    }
                  }).catch(function () {});
                }
              }
              break;
            }
          case 'arena_match_start':
            {
              /* v2.3.1126: the referee paired us -- server-observed
                 arena flow (spec: docs/specs/arena.md).  Damage works
                 via the duel consent pair; healing is server-gated. */
              pushDmgPopup(S, S.player.x, S.player.y - 50, '⚔️ ARENA R' + (payload.round || 1) + ': fight ' + (payload.opponentName || '???') + '!', '#f5c542');
              BT_AUDIO.beep(300, 0.15, 0.2, 'sawtooth');
              S.screenShake = 5;
              break;
            }
          case 'arena_match_result':
            {
              if (payload.winner === S.myId) {
                pushDmgPopup(S, S.player.x, S.player.y - 60, 'Arena win! (' + (payload.how || 'kill') + ')', '#3dd497');
                BT_AUDIO.collect();
              } else if (payload.loser === S.myId) {
                pushDmgPopup(S, S.player.x, S.player.y - 60, 'Eliminated from the arena', '#ff5e6c');
              }
              break;
            }
          case 'arena_tournament_complete':
            {
              /* v2.3.1210: the tournament is over -- clear the spectator
                 stake board so a stale board doesn't linger into the
                 gap before the next tournament. */
              S._arenaStakeBoard = [];
              var _champ = payload.champion || {};
              if (_champ.playerId === S.myId && S.rpg) {
                /* Gold arrives via _creditPlayer (player_state echo /
                   mail).  The title stays client-granted for now --
                   titles aren't server-owned yet (handoff backlog). */
                if (!S.rpg._titles) S.rpg._titles = [];
                if (!S.rpg._titles.includes('Gladiator')) S.rpg._titles.push('Gladiator');
                pushDmgPopup(S, S.player.x, S.player.y - 80, 'GLADIATOR CHAMPION!', '#f5c542');
                BT_AUDIO.levelUp();
                S.screenShake = 10;
                setRpgState(_objectSpread({}, S.rpg));
              } else if (_champ.playerName) {
                pushDmgPopup(S, S.player.x, S.player.y - 50, '🏆 ' + _champ.playerName + ' is the Gladiator champion!', '#f5c542');
              }
              break;
            }
          case 'duel_request':
            {
              if (payload.target === S.myId) setDuelRequest({
                fromId: payload.from,
                fromName: payload.fromName,
                ts: Date.now()
              });
              break;
            }
          case 'duel_accept':
            {
              if (payload.target === S.myId) {
                S._activeDuel = {
                  partnerId: payload.from,
                  startTs: Date.now()
                };
                /* v2.3.1306: the CHALLENGER never got S._inDuel — only the
                   accepter sets it (DuelRequestPanel).  Both PvP attack
                   gates key on it (monsterCombat melee, projectiles
                   ranged/staff), so the challenging side only landed hits
                   while tap-locked: the owner's "only melee hurt" duel
                   report was half challenger-side gating.  Mirror the
                   accepter's shape; duel_end clears both fields already. */
                S._inDuel = {
                  opponent: payload.from,
                  opponentName: payload.fromName || '',
                  wager: payload.wager || 0,
                  startTime: Date.now()
                };
                /* v2.3.2145: lock onto them, which is what a duel means -- and
                   is what puts the BLOCK BUTTON on screen at all
                   (LockOnActions returns null without a lock). See
                   src/game/duelLock.js. */
                lockOntoDuelOpponent(S, payload.from);
                pushDmgPopup(S, S.player.x, S.player.y - 40, 'DUEL STARTED!', '#fbbf24');
              }
              break;
            }
          case 'duel_end':
            {
              /* v2.3.1121: server duel resolution (kill / death /
                 forfeit).  The pot (if any) was settled server-side --
                 winner's gold arrives via player_state echo or mail.
                 This just closes out the local duel state + tells the
                 participants how it ended. */
              if (payload.winner === S.myId || payload.loser === S.myId) {
                var _won = payload.winner === S.myId;
                S._activeDuel = null;
                S._inDuel = null;
                /* v2.3.2242 (post-review): the duel took the lock and may have
                   raised the shield; neither outlives it.  A lock on a
                   player is only ever a duel lock (duelLock.js). */
                if (S.lockedTarget && S.lockedTarget.type === 'player') S.lockedTarget = null;
                try { dropShield(S, 'duel_end'); } catch (e) { /* display-only */ }
                pushDmgPopup(S, S.player.x, S.player.y - 40, _won ? ('DUEL WON!' + (payload.wager ? ' +' + payload.wager * 2 + 'g' : '')) : (payload.how === 'forfeit' ? 'Duel forfeited' : 'Duel lost' + (payload.wager ? ' -' + payload.wager + 'g' : '')), _won ? '#f5c542' : '#ff5e6c');
                if (_won) BT_AUDIO.levelUp();else BT_AUDIO.beep(180, 0.1, 0.15, 'triangle');
              }
              break;
            }
          case 'duel_decline':
            {
              if (payload.target === S.myId) pushDmgPopup(S, S.player.x, S.player.y - 30, 'Duel declined', '#888');
              break;
            }
          case 'pvp_threat':
            {
              if (payload.target === S.myId) {
                setThreatIncoming({
                  fromId: payload.from,
                  fromName: payload.fromName,
                  fromLevel: payload.fromLevel,
                  ts: Date.now(),
                  /* v2.3.1129: the panel does MILLISECOND math on this
                     value.  Settlement-aware workers stamp the
                     authoritative countdown in ms; the old default of
                     `120` (seconds) rendered a ~0.12s bar. */
                  countdown: payload.countdown || 120000,
                  responded: false
                });
                BT_AUDIO.beep(300, 0.1, 0.15, 'square');
                setTimeout(function () {
                  return BT_AUDIO.beep(200, 0.08, 0.12, 'square');
                }, 150);
              }
              /* v2.3.1193: skull state for EVERY receiver — the relay is
                 room-wide, matching the panel copy ("red 💀 above their
                 head" that anyone can see).  Red over the threatener
                 while the countdown runs; the renderer flips a lapsed
                 red mark white for the consent window (expiry == ignore
                 is the server's own semantics, _tickThreats). */
              {
                var _thFrom = payload.from || payload.id;
                var _thUntil = Date.now() + (payload.countdown || 120000);
                if (_thFrom === S.myId) {
                  /* Echo of my own threat — replace InspectPlayerPanel's
                     optimistic base-countdown anchor with the server's
                     authoritative (level-scaled) one. */
                  S._pvpSkullType = 'red';
                  S._pvpSkullUntil = _thUntil;
                  if (S.rpg) S.rpg._threatState = { target: payload.target, ts: Date.now(), type: 'red', expires: _thUntil };
                } else {
                  _setThreatMark(S, _thFrom, 'red', _thUntil);
                }
              }
              break;
            }
          case 'threat_response':
            {
              /* v2.3.1129: read `action` -- the field the panel has
                 ALWAYS sent.  The old `payload.accepted` branch was
                 dead (nothing ever set it), so every response showed
                 "They fled!".  Guard-fine details arrive separately
                 via the private threat_penalty event. */
              if (payload.target === S.myId) {
                if (payload.action === 'guards') pushDmgPopup(S, S.player.x, S.player.y - 40, 'They called the guards!', '#ff5e6c');else pushDmgPopup(S, S.player.x, S.player.y - 40, 'Threat ignored — they can fight back!', '#fbbf24');
              }
              /* v2.3.1193: skull transitions for EVERY receiver.
                 payload.target is the original THREATENER: guards clears
                 their skull (no consent granted), ignore turns it white
                 for the fight window.  Forged/expired responses are
                 dropped server-side, so a relayed response is truth. */
              if (payload.target === S.myId) {
                if (payload.action === 'guards') {
                  S._pvpSkullType = null;
                  S._pvpSkullUntil = 0;
                  if (S.rpg) S.rpg._threatState = null;
                } else {
                  S._pvpSkullType = 'white';
                  S._pvpSkullUntil = Date.now() + PVP_THREAT_CONSENT_MS;
                  if (S.rpg) S.rpg._threatState = { target: payload.from || payload.id, ts: Date.now(), type: 'white', expires: S._pvpSkullUntil };
                }
              } else if (payload.target) {
                if (payload.action === 'guards') {
                  if (S._threatMarks) delete S._threatMarks[payload.target];
                } else {
                  _setThreatMark(S, payload.target, 'white', Date.now() + PVP_THREAT_CONSENT_MS);
                }
              }
              break;
            }
          case 'threat_penalty':
            {
              /* v2.3.1129: private guard-fine notice to the threatener.
                 The coins already moved server-side (authoritative
                 player_state echo); this drives the feedback only. */
              if (!payload) break;
              if (payload.levy > 0) pushDmgPopup(S, S.player.x, S.player.y - 55, '-' + payload.levy + 'G guard fine!', '#ff5e6c');
              pushDmgPopup(S, S.player.x, S.player.y - 40, 'Gear locked 30m by the guards!', '#ff5e6c');
              BT_AUDIO.beep(150, 0.15, 0.2, 'sawtooth');
              /* v2.3.1193: guards were called on me — drop my own red
                 skull.  The threat_response guards branch above does the
                 same via the relay; this private event is the guaranteed
                 copy (it only exists when the levy/lock really landed). */
              S._pvpSkullType = null;
              S._pvpSkullUntil = 0;
              if (S.rpg) S.rpg._threatState = null;
              break;
            }
          case 'threat_expired':
            {
              /* v2.3.1129: an unanswered threat countdown ran out --
                 the pair may fight (same as an ignore). */
              pushDmgPopup(S, S.player.x, S.player.y - 40, 'Threat expired — fight is on!', '#fbbf24');
              /* v2.3.1193: expiry == ignore, so skulls go WHITE for the
                 fight window.  This event is private to the pair:
                 payload.from set => I'm the target (whiten THEIR mark);
                 payload.target set => I'm the threatener (whiten MINE).
                 Bystanders never get it — their red mark self-whitens in
                 the renderer when the countdown lapses. */
              {
                var _thWhiteUntil = Date.now() + PVP_THREAT_CONSENT_MS;
                if (payload && payload.from) _setThreatMark(S, payload.from, 'white', _thWhiteUntil);
                if (payload && payload.target) {
                  S._pvpSkullType = 'white';
                  S._pvpSkullUntil = _thWhiteUntil;
                  if (S.rpg) S.rpg._threatState = { target: payload.target, ts: Date.now(), type: 'white', expires: _thWhiteUntil };
                }
              }
              break;
            }
          case 'trade2_invite':
            {
              /* v2.3.1132: someone opened a two-sided trade toward us.
                 Park the invite stub; TradeWindowPanel renders the
                 accept/decline card (accepting sends trade2_open back,
                 which completes the mutual open server-side). */
              if (!payload || !payload.from) break;
              if (setTrade2) setTrade2({ invite: true, from: payload.from, fromName: payload.fromName || 'Someone', ts: Date.now() });
              pushDmgPopup(S, S.player.x, S.player.y - 40, '🤝 ' + (payload.fromName || 'Someone') + ' wants to trade!', '#3dd497');
              BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
              break;
            }
          case 'trade2_state':
            {
              /* v2.3.1132: the server's session snapshot -- the window
                 is a pure renderer of this.  Terminal states clear it;
                 goods from a settled swap arrive via the authoritative
                 player_state echo (coins + inventory adopted). */
              if (!payload || !setTrade2) break;
              /* v2.3.1235: trade-completion receipt — any newer session
                 snapshot supersedes a pending done-reveal watcher (guards
                 a hyper-fast re-open racing the ≤1.5s echo wait below). */
              if (S._t2DoneWatch && payload.state !== 'done') {
                try { clearInterval(S._t2DoneWatch); } catch (e) {}
                S._t2DoneWatch = null;
              }
              if (payload.state === 'open' || payload.state === 'invited') {
                setTrade2(payload);
              } else if (payload.state === 'done') {
                /* v2.3.1235: trade-completion receipt — HOLD the window
                   open and drop the old floating "Trade complete!" world
                   popup (it rendered before the wallet echo and the modal
                   just vanished).  Receipt = the final session snapshot
                   (my offers = what I sent, theirs = what I received;
                   the v2.3.1213 weapon lanes ride alongside).  The
                   swapped goods/gold arrive ONLY via the authoritative
                   player_state echo, which trade2.js QUEUES before this
                   broadcast but flushes on the next tick — so 'done'
                   normally lands first, and revealing now would show a
                   stale balance.  player_state is applied in
                   wsClient.js's own switch case (it never reaches this
                   dispatcher), so we chain off its OBSERVABLE effects
                   instead of the message: wsClient overwrites R.coins
                   (number) and replaces R.inventory (fresh object
                   identity) whenever the echo carries them — either
                   differing from the pre-'done' snapshot means the echo
                   has been APPLIED.  A 1500ms fallback reveals anyway so
                   a dropped (or delta-elided no-change) echo can't wedge
                   the modal.  One-shot: the watcher clears itself. */
                var _t2OtherId = payload.a === S.myId ? payload.b : payload.a;
                var _t2Receipt = {
                  sent: (payload.offers && payload.offers[S.myId]) || {},
                  received: (payload.offers && payload.offers[_t2OtherId]) || {},
                  sentWeapons: (payload.weapons && payload.weapons[S.myId]) || [],
                  receivedWeapons: (payload.weapons && payload.weapons[_t2OtherId]) || [],
                  otherName: payload.a === S.myId ? (payload.bName || 'Trader') : (payload.aName || 'Trader'),
                };
                var _t2PreCoins = S.rpg ? S.rpg.coins : null;      /* pre-trade coins */
                var _t2PreInv = S.rpg ? S.rpg.inventory : null;    /* pre-trade inventory ref */
                if (S._t2DoneWatch) { try { clearInterval(S._t2DoneWatch); } catch (e) {} }
                var _t2Deadline = Date.now() + 1500;
                S._t2DoneWatch = setInterval(function () {
                  var _t2Echoed = !!(S.rpg && (S.rpg.coins !== _t2PreCoins || S.rpg.inventory !== _t2PreInv));
                  if (!_t2Echoed && Date.now() < _t2Deadline) return;
                  try { clearInterval(S._t2DoneWatch); } catch (e) {}
                  S._t2DoneWatch = null;
                  /* Only NOW may "Trade complete" render — the receipt's
                     Balance line reads the server-echoed wallet.  The
                     panel auto-closes itself (~2800ms) via the existing
                     setTrade2(null); no after-close toast (the only
                     toast mechanism is the salvage-undo queue in
                     ItemTooltip.jsx — item/undo-specific, not suitable —
                     and the floating world text is deliberately gone). */
                  setTrade2({ state: 'done', receipt: _t2Receipt, ts: Date.now() });
                  BT_AUDIO.collect();
                  if (S.rpg) setRpgState(_objectSpread({}, S.rpg));
                }, 80);
              } else {
                /* v2.3.1235: trade-completion receipt — settlement
                   failure is a CANCEL: trade2.js _handleTrade2Confirm
                   validates at commit and calls _t2Cancel(s,
                   'insufficient:<pid>') when a side spent its staged
                   goods, deleting the session.  The session is DEAD
                   server-side, so "return to Editing with the same
                   session" would be a lie — instead the panel keeps its
                   shell up briefly with an honest in-modal notice
                   ("Trade failed — nothing was exchanged", state
                   'failed', auto-closes ~2200ms).  Inventory/gold are
                   never touched locally on any trade path — a failed
                   commit sends no credit and no player_state mutation.
                   True retry-in-place would need a server change (the
                   session surviving a failed commit) — out of scope.
                   Every other cancel reason keeps the legacy
                   clear-window + world-popup behavior. */
                var _t2SettleFail = !!(payload.reason && String(payload.reason).indexOf('insufficient') === 0);
                if (_t2SettleFail) {
                  setTrade2({ state: 'failed', reason: payload.reason, ts: Date.now() });
                } else {
                  setTrade2(null);
                  var _t2Why = {
                    'declined': 'Trade declined', 'disconnected': 'They disconnected',
                    'expired': 'Trade expired', 'busy': 'They are already trading',
                    'target-gone': 'Player unavailable', 'party-gone': 'Player unavailable',
                  }[payload.reason] || 'Trade cancelled';
                  pushDmgPopup(S, S.player.x, S.player.y - 40, _t2Why, '#ff5e6c');
                }
              }
              break;
            }
          case 'party_invited':
            {
              /* v2.3.1185: someone invited us to a party.  Park the
                 invite stub; PartyHUD renders the accept/decline card
                 (accepting sends party_accept, validated against the
                 inviter's own recorded invite server-side). */
              if (!payload || !payload.from) break;
              var _piTs = Date.now();
              if (setParty) setParty({ invite: true, from: payload.from, fromName: payload.fromName || 'Someone', partySize: payload.partySize || 1, ts: _piTs });
              pushDmgPopup(S, S.player.x, S.player.y - 40, '🎪 ' + (payload.fromName || 'Someone') + ' invites you to a party!', '#fbbf24');
              BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
              /* ═══ v2.3.1970: AN IGNORED INVITE HAS TO GO AWAY BY ITSELF ═══
                 The server drops the recorded invite after PARTY.INVITE_TTL
                 (party.js, 60 s) and _handlePartyAccept answers a late Join
                 with party_error 'expired'.  The CARD had no such clock: the
                 stub carried a `ts` that nothing ever read, so an invite
                 nobody answered sat on screen for the rest of the session.
                 That is not cosmetic on the primary platform -- v2.3.1966
                 portalled this card to document.body at Z_ABOVE_DASH_PROMPT
                 precisely so it outranks the dashboard, which means a dead
                 invite parks a 240px panel over the top-centre of a 390px
                 phone and nothing but tapping it will move it.  A demo crowd
                 invites strangers constantly and most of them will never
                 answer, so this is the common case, not the edge one.
                 Cleared with the functional setter and an identity check, so
                 a NEWER invite (or a party you have since joined -- the same
                 slot holds the roster) can never be swept away by an older
                 invite's timer. */
              setTimeout(function () {
                if (setParty) setParty(function (cur) {
                  return (cur && cur.invite && cur.from === payload.from && cur.ts === _piTs) ? null : cur;
                });
              }, PARTY_INVITE_TTL_MS);
              break;
            }
          case 'party_state':
            {
              /* v2.3.1185: the server's roster snapshot -- the party
                 HUD is a pure renderer of this (same posture as
                 trade2_state).  Re-echoed every ~2s while partied so
                 member HP/zone stay live cross-zone; terminal
                 {state:'none'} clears it. */
              if (!payload || !setParty) break;
              if (payload.state === 'open' && payload.members) {
                setParty(payload);
                /* v2.3.1185: mirror for the renderer's nameplate party
                   marker (entityRenderer reads S._party per frame --
                   grafted from the competing party build, PR #221). */
                S._party = payload;
              } else {
                setParty(null);
                S._party = null;
                var _ptyWhy = {
                  'left': 'You left the party', 'kicked': 'Kicked from the party',
                  'disbanded': 'Party disbanded', 'offline': 'Removed from party (offline)',
                }[payload.reason] || 'Party ended';
                pushDmgPopup(S, S.player.x, S.player.y - 40, _ptyWhy, '#fbbf24');
              }
              break;
            }
          case 'party_error':
            {
              /* v2.3.1185: private invite-flow notices (declines and
                 validation misses).  Display only. */
              if (!payload) break;
              var _ptyErr = {
                'declined': (payload.name || 'They') + ' declined the party',
                'target-busy': (payload.name || 'They') + ' is already in a party',
                'target-gone': 'Player unavailable',
                'busy': 'You are already in a party',
                'full': 'Party is full',
                'expired': 'Party invite expired', /* v2.3.1185 */
              }[payload.reason] || 'Party action failed';
              pushDmgPopup(S, S.player.x, S.player.y - 40, _ptyErr, '#ff5e6c');
              break;
            }
          case 'harden_result':
            {
              /* v2.3.1131: the §4.6c hardening roll came back (private).
                 Gold already debited + weapon hardness/temper already
                 mutated server-side -- the authoritative player_state
                 echo carries both; this event drives the feedback. */
              if (!payload) break;
              if (payload.error) {
                pushDmgPopup(S, S.player.x, S.player.y - 30, payload.message || 'Cannot harden', '#ff5e6c');
                BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
                break;
              }
              if (payload.success) {
                pushDmgPopup(S, S.player.x, S.player.y - 45, '⚒️ HARDENED! Now H' + payload.hardness + '/5', '#f5c542');
                S.screenShake = 6;
                BT_AUDIO.collect();
                setTimeout(function () { return BT_AUDIO.beep(784, 0.12, 0.1, 'sine'); }, 120);
              } else {
                pushDmgPopup(S, S.player.x, S.player.y - 45, 'Hardening failed! (-' + (payload.cost || 0) + 'G) → H' + payload.hardness, '#ff5e6c');
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Temper ' + (payload.temper || 0) + ' (pity softens future resets)', 'rgba(255,255,255,.5)');
                BT_AUDIO.beep(180, 0.12, 0.18, 'sawtooth');
              }
              if (S.rpg) setRpgState(_objectSpread({}, S.rpg));
              break;
            }
          case 'pet_capture_result':
            {
              /* v2.3.1130: server-rolled capture outcome (private).
                 On success the pet already sits in the authoritative
                 lifeSkills echo (the per-key merge adopts it) -- this
                 event only drives the feedback the legacy local roll
                 drew (MenuBar). */
              if (!payload) break;
              if (payload.captured && payload.pet) {
                var _pcPet = payload.pet;
                S.lockedTarget = null;
                pushDmgPopup(S, S.player.x, S.player.y - 35, 'Captured ' + _pcPet.name + '!', '#3dd497');
                pushDmgPopup(S, S.player.x, S.player.y - 50, (_pcPet.emoji || '') + ' ' + _pcPet.archetype + ' Lv' + _pcPet.level, _pcPet.color || '#3dd497');
                BT_AUDIO.collect();
                setTimeout(function () { return BT_AUDIO.beep(523, 0.1, 0.08, 'sine'); }, 100);
                setTimeout(function () { return BT_AUDIO.beep(659, 0.1, 0.08, 'sine'); }, 200);
                if (S.rpg) setRpgState(_objectSpread({}, S.rpg));
              } else if (payload.error) {
                var _pcMsg = {
                  'no-monster': 'Lock a weak monster first!',
                  'too-healthy': 'Too healthy! (<20% HP)',
                  'too-far': 'Too far away!',
                  'slots-full': 'Pet slots full!',
                  'no-trap': 'Need a trap! (Vendor sells them)',
                  'not-now': 'Cannot trap right now'
                }[payload.error] || 'Capture failed';
                pushDmgPopup(S, S.player.x, S.player.y - 30, _pcMsg, '#ff5e6c');
                BT_AUDIO.beep(200, 0.08, 0.12, 'square');
              } else {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Escaped!', '#ff5e6c');
                BT_AUDIO.beep(200, 0.08, 0.12, 'square');
              }
              break;
            }
          case 'gear_locked':
            {
              /* v2.3.1129: an equip attempt was rejected by the guard
                 gear lock; the player_state echo alongside snaps any
                 local equip mutation back. */
              var _glMin = payload && payload.until ? Math.max(1, Math.ceil((payload.until - Date.now()) / 60000)) : 30;
              pushDmgPopup(S, S.player.x, S.player.y - 40, 'Gear locked by guards! (' + _glMin + 'm left)', '#ff5e6c');
              BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
              break;
            }
          case 'duel_wager_request':
            {
              if (payload.target === S.myId) {
                setDuelRequest({
                  fromId: payload.from,
                  fromName: payload.fromName,
                  ts: Date.now(),
                  wager: payload.wager
                });
                BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
                setTimeout(function () {
                  return BT_AUDIO.beep(800, 0.04, 0.06, 'sine');
                }, 80);
              }
              break;
            }
        }
}
