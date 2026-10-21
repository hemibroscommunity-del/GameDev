import React, { useEffect, useState, useCallback } from 'react';
import { COL, getState } from '../mobile/dash/common.js';
import { BT_API_BASE } from '../../networking/index.js';
import { WORLDVIEW_EXITS } from '../../data/index.js';
import { runSpeedTest } from '../../game/speedTest.js';   /* v2.3.3339: the speed test, measured on this phone */
import { openSoundStudio } from '../../game/soundStudio.js';   /* v2.3.3523: every sound and where it plays */

/* v2.3.3525: the tour's steps, in order, for "Tour: jump to" (the worker's
   /dev/tour checks each is one) */
const TOUR_STEPS = [
  { id: 'tut_1', label: 'Tour 1: Slimes' }, { id: 'farm_1', label: '2: Plant' },
  { id: 'smith_1', label: '3: Ore' }, { id: 'smith_2', label: '4: Forge' },
  { id: 'wood_1', label: '5: Logs' }, { id: 'wood_2', label: '6: Bench' },
  { id: 'fish_1', label: '7: Fish' }, { id: 'farm_2', label: '8: Zoom Juice' },
  { id: 'race_1', label: '9: Race' }, { id: 'beast_1', label: '10: Traps' },
  { id: 'beast_2', label: '11: Spring' }, { id: 'tut_2', label: '12: Snowmen' },
];

/* ═══ v2.3.2240: THE OWNER'S TEST PANEL ═══
 *
 * Owner: "Is there a test suite you can build that allows me to test features
 * directly without needing to play through the quest line?  Having to play
 * through slows down development greatly."
 *
 * Concretely: the fire trail (v2.3.2238) lives in ember, ember is gated
 * behind tut_4, and tut_4 is the fourth link of a chain that crosses three
 * other zones.  Looking at a new ember mechanic on a phone meant replaying
 * the tutorial, and a feature you cannot look at is a feature you cannot
 * judge.
 *
 * ── WHY THIS IS NOT A CHEAT SURFACE ──────────────────────────────────────
 * Every privileged action here is an HTTP call to the ADMIN_KEY-gated
 * operator API (server/src/devtools.js).  This file adds NO client->server
 * websocket message, which is the whole argument rather than a detail: the
 * socket is deny-by-default precisely because anything a client can SAY a
 * cheater can say too.  Without the owner's key this panel is scaffolding —
 * the worker answers 401, or 404 when no key is configured at all.
 *
 * The key is typed once and kept in localStorage on the owner's own device.
 * It is never bundled, never sent anywhere but the worker's admin routes,
 * and clearing it is one button.
 *
 * ── HOW YOU OPEN IT ──────────────────────────────────────────────────────
 * A 1.2s long-press on the zone name in the header (ZoneHeader).  Chosen
 * because it is always on screen in the world, it is not a control anybody
 * taps by accident, and it needs no new furniture in a HUD the owner has
 * repeatedly asked to keep clear.  There is no discovery affordance: a
 * player who does not know it is there never finds it, and if they did it
 * would ask for a key they do not have.
 *
 * ── WARP IS "STAND ME AT THE DOOR" ───────────────────────────────────────
 * Deliberately NOT a teleport.  Entering a zone is a long, load-bearing
 * sequence — per-zone asset preload behind the loading overlay (CLAUDE.md's
 * ZONE-ASSET EXCEPTION), freeing the previous map, zone dimensions, ambient
 * audio, encyclopedia discovery, quest flags, depth reset, and the server
 * move — all of it inside handleZoneTransitions.  A dev button that
 * re-implemented that would drift from the real path and start reporting
 * bugs that do not exist, and one that skipped the preload would break the
 * animation-preloading law outright.
 *
 * So this puts the player ON the trail-head and lets the game walk itself
 * through its own front door.  It works from the worldview map, where every
 * zone's door is (WORLDVIEW_EXITS); from anywhere else the panel says so
 * rather than half-working.
 */

const KEY_LS = 'bt_dev_key';

/* ═══ v2.3.2440: AN ADMIN CALL THAT NEVER ANSWERS ═══
 *
 * Owner, on a phone, against production: "I tapped the flags button and
 * nothing was happening."  The panel said "Working…" and stayed there.
 *
 * Every control here is `disabled={busy}`, and `busy` was cleared only in
 * the `finally` of the fetch.  `fetch` has NO timeout — so a request the
 * network swallows never settles, the finally never runs, and the whole
 * panel sits dead behind one word with no error and no way back except
 * closing it.  From the outside that is indistinguishable from a button
 * that does nothing, which is exactly how it was reported.
 *
 * Two separate defects came out of that, and both are fixed here:
 *
 *   1. Every admin call now aborts at ADMIN_TIMEOUT_MS and SAYS SO.  A
 *      stalled request can no longer take the panel with it.  The point is
 *      not the twelve seconds — it is that the promise always settles, so
 *      `finally` always runs and `busy` can never stick.
 *
 *   2. The refresh that fires automatically when the panel opens is now
 *      QUIET.  It used to set `busy`, which disabled the flags button the
 *      owner had not pressed yet — one request's stall silencing a control
 *      that has nothing to do with it.  It also used to write its failure
 *      into the status line, so a panel opened while your character was not
 *      in the room greeted you with "this worker does not have the test
 *      routes yet" about a request you never made.  An automatic background
 *      probe now neither disables anything nor narrates.
 */
const ADMIN_TIMEOUT_MS = 12000;
const fetchWithTimeout = async (url, init) => {
  /* AbortController + setTimeout rather than AbortSignal.timeout(): this
     runs on whatever Safari the owner's phone is carrying, and the two-line
     version needs no version floor to reason about. */
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ADMIN_TIMEOUT_MS);
  try { return await fetch(url, Object.assign({}, init || {}, { signal: ac.signal })); }
  finally { clearTimeout(t); }
};
const isAbort = (e) => !!e && (e.name === 'AbortError' || e.name === 'TimeoutError');
const TIMEOUT_MSG = 'No answer from the server after ' + (ADMIN_TIMEOUT_MS / 1000)
  + 's. Check your connection and press it again.';

const box = {
  position: 'fixed', inset: 0, zIndex: 9800,
  background: 'rgba(5, 9, 12, 0.72)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '18px 12px', overflowY: 'auto',
};
const sheet = {
  width: '100%', maxWidth: 380, background: COL.bg,
  border: '1px solid ' + COL.borderStrong, borderRadius: 12,
  padding: 14, color: COL.text,
  font: '14px system-ui, -apple-system, sans-serif',
  boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
};
/* v2.3.3323: a bot flag in words (botfp.js `_botfpFlag` kinds; the Bot flags
   section).  Each says what was SEEN, never what it means for the player. */
const BOT_FLAG_WORDS = {
  'suspicion-threshold': 'Harvest gestures look scripted',
  'variance-collapse': 'Every harvest gesture nearly the same',
  'device-fleet': 'Many accounts harvesting on one device',
  'strikes-without-start': 'Harvests sent without starting them',
  test: 'A test flag, planted from this panel (not evidence)',
};
function botFlagWords(kind, detail) {
  const words = (kind && BOT_FLAG_WORDS[kind]) || (kind ? 'Flag: ' + kind : 'Flagged');
  const score = detail && typeof detail.score === 'number' ? ' (score ' + detail.score + ')' : '';
  const n = detail && typeof detail.count === 'number' ? ' (' + detail.count.toLocaleString() + ')' : '';
  const ids = detail && Array.isArray(detail.activeIds) ? ' (' + detail.activeIds.length + ' accounts)' : '';
  return words + score + n + ids;
}
/* v2.3.3398: a chat report's reason in words (chatmod.js REPORT_REASONS) */
const REPORT_WORDS = { spam: 'Spam', abuse: 'Abuse', harassment: 'Harassment', cheating: 'Cheating', other: 'Other' };
/* the counters worth reading, in words, the ones that are not zero */
const BOT_COUNTER_WORDS = [
  ['strikes', 'harvests'], ['noFpStrikes', 'with no gesture fingerprint'], ['replayHits', 'replayed gestures'],
  ['syntheticStrikes', 'scripted-looking gestures'], ['startless', 'refused, no start'], ['noFpPerfect', 'perfect claims with no fingerprint'],
  ['capClamps', 'stopped by the hour cap'], ['cooks', 'cooks'], ['taplessCooks', 'cooks with no tap'],
];
function botCountersWords(c) {
  if (!c || typeof c !== 'object') return '';
  const parts = [];
  for (const [k, w] of BOT_COUNTER_WORDS) {
    const v = Number(c[k]) || 0;
    if (v > 0) parts.push(v.toLocaleString() + ' ' + w);
  }
  return parts.join(' · ');
}
function agoWords(at) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 90) return 'just now';
  const m = Math.round(s / 60);
  if (m < 90) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 36) return h + ' h ago';
  return Math.round(h / 24) + ' days ago';
}

const btn = (on) => ({
  appearance: 'none', width: '100%', textAlign: 'left',
  background: on ? COL.accentFill : COL.raised,
  border: '1px solid ' + (on ? COL.accent : COL.border),
  color: COL.text, borderRadius: 9, padding: '11px 12px',
  font: '600 14px system-ui, sans-serif', marginBottom: 8, cursor: 'pointer',
  minHeight: 44,     /* a real touch target — this is used on a phone */
});
const chip = {
  appearance: 'none', background: COL.raised, border: '1px solid ' + COL.border,
  color: COL.text, borderRadius: 8, padding: '9px 10px',
  font: '600 13px system-ui, sans-serif', cursor: 'pointer', minHeight: 40,
};
const label = { color: COL.muted, font: '600 11px system-ui, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase', margin: '14px 0 7px' };

/* ═══ v2.3.2440: WHAT THIS WORKER SAYS IT CAN DO ═══
 *
 * The live-flags rail below answers "WHY is a system off".  It needs the
 * admin key, a network round trip and a working admin surface — and when
 * any of those is missing it can say nothing at all, which is how the owner
 * ended up staring at a panel that would not tell them anything.
 *
 * This answers the question they were actually asking — "IS a system off?"
 * — from state the client is already holding.  No key, no request, nothing
 * that can stall.  It is the first thing in the panel for that reason.
 *
 * `state_sync.caps` is how a worker advertises what it handles, and the
 * client gates a legacy fallback path on each one (handoff rule 19).  A cap
 * that is FALSE and a cap that is ABSENT read identically to the client —
 * both mean "this worker has not claimed the job" — so both list as off
 * here.  Pretending to distinguish them would be a lie about how the gates
 * actually read.
 *
 * CAP_GATES is a REGISTRY, not a nice-to-have list: precheck's cap-registry
 * check fails the push if the client reads a `_serverCaps.<name>` that is
 * not in it.  Without that, the next capability added to the client would
 * be invisible here, and this panel would quietly report "all clear" while
 * the very system the owner is chasing was switched off.
 */
const CAP_GATES = [
  'abil', 'aceFlip' /* v2.3.2618 */, 'aceItems' /* v2.3.2619 */, 'amuletForge', 'areaChat', 'arena', 'bigorb' /* v2.3.2842; v2.3.2849: lower case, a kill switch */, 'blockScale', 'botfp', 'broVerify', 'broCount' /* v2.3.3255: the wallet's Hemi Bro count */,
  'charLock', 'chatMute', 'clans', 'dungeon', 'elemBurst', 'eventCapes', 'friends',
  'gamble', 'gearRef' /* v2.3.2535 */, 'gemExtract', 'gems', 'guilds', 'harden', 'hpEndGrids', 'jackpot',
  'laststand', 'milestonesRetired' /* v2.3.2662 */, 'party', 'partyChat', 'partykeep' /* v2.3.3284: a party that lasts (party.js) */, 'alliance' /* v2.3.3313: a party of 20 active members (alliance.js) */, 'clanparty' /* v2.3.3321: clans are parties now (clanparty.js) */, 'petLoot', 'potionBag', 'prog3',   /* v2.3.3120: 'pets' gone with the 20% capture */
  'prog3Chan', 'prog3elem' /* v2.3.2512 */, 'prog3shared' /* v2.3.2592 */, 'prog3rel' /* v2.3.2680 */, 'gearq' /* v2.3.2664 */, 'prog3x', 'questTrack', 'sponsor', 'store',
  'storeGear' /* v2.3.2531 */, 'storeGearRef' /* v2.3.2551 */, 'storeChat' /* v2.3.2621 */, 'storeOffer' /* v2.3.2623 */,
  't2bench', 't2simple', 't2uniform', 'trade', 'trade2', 'trade2Review',
  'trade2Weapons', 'weaponDrops', 'whisper', 'zoneDepth' /* v2.3.2790 */, 'bowvolley' /* v2.3.2848 */, 'dailyChest' /* v2.3.2820 */, 'smelting' /* v2.3.2822 */, 'whirlWindup' /* v2.3.2824 */, 'gatherhits' /* v2.3.2956 */,
  'wheelmonsters' /* v2.3.2978: lower case, a kill switch */,
  'wheelsize' /* v2.3.3315: which Wheel the room plays -- a number, 5 the long one, 1 the short (its kill switch, `wheel5x: false`) */,
  'sprint' /* v2.3.3006: lower case, a kill switch */,
  'wheelnodes' /* v2.3.3012: lower case, a kill switch */,
  'shieldwear' /* v2.3.3091: the shield on the arm -- lower case, a kill switch */,
  'shieldgem' /* v2.3.3187: a gem goes into a shield on the worker -- lower case, a kill switch */,
  'weapongem' /* v2.3.3513: a gem goes into a weapon on the worker -- lower case, a kill switch */,
  'monsterhold' /* v2.3.3513: a freeze or root stops a monster 1.5 s, then not again for 3 s -- lower case, a kill switch */,
  'shardcrack' /* v2.3.3516: shards cracked for raw gems, three combined into a gem, gems in the bag -- lower case, a kill switch */,
  'elemup' /* v2.3.3518: a gem that beats the monster's element lands 25% harder, and the phone's "UP" is the worker's -- a kill switch */,
  'soakhit' /* v2.3.3518: a soaked monster's blows land 20% softer -- a kill switch */,
  'shockspark' /* v2.3.3518: a hit on a shocked monster sparks to the one beside it -- a kill switch */,
  'wheeldungeons' /* v2.3.3016: lower case, a kill switch */,
  'nomansland' /* v2.3.3058: No man's land -- lower case, a kill switch */,
  'nmlgroup' /* v2.3.3530: a group attacks you, one window -- every attacker yours to hit back, joining a fight you chose (nmlAsk.js nmlJoinFight) -- lower case, a kill switch */,
  'nmlchoice' /* v2.3.3530: the window's Attack is the attack -- `nml_attack` starts both skulls at once, the one attacked white before any blow (nomansland.js _handleNmlAttack) -- lower case, a kill switch */,
  'gatherreq' /* v2.3.3038: lower case, a kill switch */,
  'farm' /* v2.3.3127: the farm -- lower case, a kill switch */,
  'meals' /* v2.3.3130: meals and brews you carry -- lower case, a kill switch */,
  'cookRows' /* v2.3.3130: how many Cookhouse recipes the worker cooks -- a number, never a switch */,
  'farmCrops' /* v2.3.3131: how many crops the worker grows -- a number, never a switch */,
  'pvpbrew' /* v2.3.3133: the damage brew in a fight with a player is the worker's -- lower case, a kill switch */,
  'pvpheal' /* v2.3.3133: one bite at a time in a fight with a player -- lower case, a kill switch */,
  'farmorders' /* v2.3.3134: the Feed & Seed's order board -- lower case, a kill switch */,
  'armorforge' /* v2.3.3092: bars into armor -- lower case, a kill switch */,
  'dailyspin' /* v2.3.3140: the Gambling Den's free daily spin -- lower case, a kill switch */,
  'dailyquests' /* v2.3.3140: daily quests + the season -- lower case, a kill switch; v2.3.3400: the quests PUT AWAY, so a switch to turn them ON (`dailyquests: true`), and the season goes with dailyspin too */,
  'season' /* v2.3.3400: the season track DROPPED -- off, a switch to turn it ON (`season: true`) */,
  'salvage' /* v2.3.3141: salvage for bars, and the grades' essences -- lower case, a kill switch */,
  'trapping' /* v2.3.3120: arm a trap, then kill it -- lower case, a kill switch */,
  'trapcraft' /* v2.3.3120: box traps at the Woodworker -- lower case, a kill switch */,
  'petbook' /* v2.3.3120: the pets record and the Pets page -- lower case, a kill switch */,
  'petlevels' /* v2.3.3121: pets earn XP while out with you -- lower case, a kill switch */,
  'beastmaster' /* v2.3.3121: Beastmaster Bro and his quests -- lower case, a kill switch */,
  'tour' /* v2.3.3525: the tour's two new townsfolk (Woodworker Bro, Farmer Bro) -- lower case, a kill switch */,
  'race' /* v2.3.3525: Lil Bro's race -- lower case, a kill switch */,
  'tourgear' /* v2.3.3525: the tour's gear rules in the forge's and bench's windows (hardened wood, the equip gate) -- no switch, the tables */,
  'pettrade' /* v2.3.3122: pets in trades, the auction house and the mail -- lower case, a kill switch */,
  'petwards' /* v2.3.3123: the land ward of the pet out with you -- lower case, a kill switch */,
  'petshow' /* v2.3.3123: the others see your pet -- lower case, a kill switch */,
  'pethouse' /* v2.3.3123: more room in the Pet House for gold -- lower case, a kill switch */,
  'hardenmats' /* v2.3.3139: hardening takes a material (bars, or a bow's hardened wood) and a doubling gold ladder -- lower case, a kill switch */,
  'hardenedwood' /* v2.3.3139: five logs into one hardened wood at the Woodworker -- lower case, a kill switch */,
  'hardenwoodskill' /* v2.3.3481: a bow's or staff's hardening is gated on Woodworking, a sword's still on Blacksmithing (the owner: "Do woodworking") -- lower case, a kill switch */,
  'hardenkeep' /* v2.3.3529: a failed hardening keeps the weapon's level, the gold and material still spent (server hardening.js; the owner: "the worst that can happen is you just stay at hardening 2 and lose resources") -- lower case, a kill switch */,
  'forgeladder' /* v2.3.3524: the forge's ladder -- no wood tier, copper Smithing 1 / iron 5 / black steel 10, the forge's Melee gate the wear gate, hardening by the level that makes the tier (server/src/forgeladder.js) -- lower case, a kill switch */,
  'arenaap' /* v2.3.3481: the arena's champion is paid 500 achievement points with the prize (the owner: "an arena winner should be included") -- lower case, a kill switch */,
  'arenaapfirst' /* v2.3.3488: ...on a character's FIRST win only (server inbox.js AP_ONCE): the arena's window says so -- the owner: "I don't want anyone exploiting the achievement points from it" */,
  'movediet' /* v2.3.3204: a steady walk on the Wheel's safe ground sent every 66 ms -- lower case, a kill switch */,
  'codex' /* v2.3.3209: the monster codex's kill counts (server/src/codex.js) -- lower case, a kill switch */,
  'killroll' /* v2.3.3209: one roll a kill, each drop its own numbers, shown over the monster (server/src/killroll.js) -- lower case, a kill switch */,
  'hitladder' /* v2.3.3229: the hit ladder -- each life-skill level adds a 10% chance of one more (server/src/gathering.js gatherHitRoll) -- lower case, a kill switch */,
  'nodehp' /* v2.3.3251: each tier's HP twice as long as the one before (server/src/gathering.js GATHER_NODE_HP) -- lower case, a kill switch */,
  'tierxp' /* v2.3.3251: each tier's harvest XP twice the one before (server/src/gathering.js GATHER_TIER_XP) -- lower case, a kill switch; off with nodehp too */,
  'xpdecay' /* v2.3.3251: XP fades 5+ levels below you, harvests and fights (server/src/xpdecay.js) -- lower case, a kill switch */,
  'presence2' /* v2.3.3250: far players only while the world map is open, the online list, far copies parked (server/src/presence2.js) -- lower case, a kill switch */,
  'nearjoin' /* v2.3.3276: a join is told the players around it whole and the rest as list entries, a look sent when its player comes around (server/src/nearjoin.js) -- lower case, a kill switch */,
  'emotes' /* v2.3.3391: emotes you can see -- the listed emotes relayed and placed near the sender, the chat box's smiley and B (server/src/emotes.js) -- lower case, a kill switch */,
  'dice' /* v2.3.3393: /roll and /flip rolled by the worker (server/src/dice.js), shown in the chat and over the roller's head -- lower case, a kill switch */,
  'itemdrop' /* v2.3.3473: Drop on a bag item (server/src/itemdrop.js): yours a minute, then anyone's, flashing at two -- lower case, a kill switch */,
  'emotemoves' /* v2.3.3392: your bro moves -- a wave or a dance drawn in code, a held pose kept on the player (server/src/poses.js, tick.js po) -- off with emotes: false */,
  'bundle' /* v2.3.3254: several messages in one frame (server/src/bundle.js) -- lower case, a kill switch (the worker always takes one) */,
  'quiet' /* v2.3.3254: the quiet phone -- 66 ms moves with nobody near, a steady walk held out of a fight, keepalives and the look only when needed (src/game/quietPhone.js) -- lower case, a kill switch */,
  'pvpbalance' /* v2.3.3260: hits between players rolled by the worker, whole (the roll a monster takes), one sword hit a swing, paid specials (server/src/pvpbalance.js) -- lower case, a kill switch */,
  'oneformula' /* v2.3.3260: one formula for every fight -- health 100 + 50 a level + 40 a point, monsters' hits scaled with it, no blow over 30% of a player's bar, the sword's special 4.5x, the staff's big bolt x0.6, one bite every 15 s in any fight (server/src/oneformula.js) -- lower case, a kill switch */,
  'fishheal' /* v2.3.3260: the fish ladder (server/src/data.js FISH_HEAL) -- lower case, a kill switch */,
  'onelevel' /* v2.3.3538: one level -- the character level is the highest weapon skill (server prog3.js _prog3CharLevel) -- lower case, a kill switch */,
  'cropeat' /* v2.3.3537: every crop is food, eaten raw (server/src/farm.js CROP_HEAL) -- lower case, a kill switch */,
  'pvplunge' /* v2.3.3262: the sword's opening lunge lands on a player too, and dazes them (server/src/pvplunge.js) -- lower case, a kill switch */,
  'pvpextras' /* v2.3.3264: what a hit does to a monster it does to a player -- a gem's status, a collision, the splash, the burst, the bash, whirlwind and lunge, a kill's heal, a parry's stagger (server/src/pvpextras.js) -- lower case, a kill switch */,
  'spar' /* v2.3.3265: the Sparring section below -- clones of you that fight you through the real PvP code (server/src/spar.js) -- lower case, a kill switch */,
];

/* Plain language for the ones whose absence the owner has actually reported
   as a bug.  Deliberately NOT a full glossary: a made-up description is
   worse than the cap's own name, which at least matches what the flag is
   called and what OPERATIONS.md says about it. */
const CAP_NOTES = {
  prog3: 'the Points screen — combat levels read 0 without it',
  prog3x: 'the extra Points stats',
  prog3elem: 'Elem Pwr per weapon, plus the Elem Resist and Max Mana stats',
  prog3Chan: 'per-weapon point pools',
  prog3shared: 'the four-column Points screen — Luck, Range, Special, Move Speed and the shared point pool',
  prog3rel: 'relative points — every point felt early (a curve), fading against stronger monsters',
  gearq: 'gear that matters — weapon grade on the whole hit, steeper tiers, a five-tier armour ladder whose ceiling the grade raises',
  abil: 'special moves — the sword dash, shield bash and whirlwind',
  elemBurst: 'the elemental burst',
  milestonesRetired: 'the old level milestones are gone — Element Burst from level 1, no stamina bonus at 10',
  storeGear: 'selling armour, shields and legs in the store',
  storeGearRef: 'naming a piece for sale by its receipt number instead of its description',
  storeOffer: 'making a gold offer on a listing, with the gold held until the seller answers',
  storeChat: 'messaging the seller about one listing, in a thread attached to it',
  bigorb: 'the staff special as one big, swingy bolt that explodes (v2.3.2849; without it: the three-orb volley, no blast)',
  blockScale: 'the shield block count',
  zoneDepth: 'Wind Dunes perspective — things shrink and slow toward the north edge',
  gatherhits: 'gathering hits — a rock, tree or pond has HP that your swings knock off (each hit rolled off your skill level: see hitladder) before the gesture; without it: the old timer (v2.3.2956)',
  hitladder: 'the hit ladder — each life-skill level adds a 10% chance of hitting one more (level 3: 1 eight times in ten, 2 or 3 once each; from level 11 no more 1s); without it: every hit 1 to your level, evenly (v2.3.3229)',
  nodehp: 'each tier of a resource twice as long as the one before at the level it opens (copper 10 HP, iron 20, black steel 80, titanium 440, obsidian 1,680; pine and minnow 10, then 40, 220, 840, 2,480); without it: every tier 5 x (tier + 1), 10 to 110 (v2.3.3251)',
  tierxp: 'each tier of a resource pays twice the XP of the one before (163, 326, 652, 1,304, 2,608 a harvest before its grade); without it (or without nodehp): 163, 350, 538, 725, 913 (v2.3.3251)',
  xpdecay: 'XP fades for what is 5+ levels below you: a third at 5 below, 15% less each level past it -- a harvest by your skill against the resource\'s level, a fight by the weapon\'s skill against the monster\'s, and such a monster\'s name plate is grey; without it: full XP everywhere, no grey plates (v2.3.3251)',
  pvpbalance: 'the worker rolls each hit between players itself -- the roll a monster takes, whole -- one sword hit a swing, a special only after a paid swipe (with caps.oneformula); without it: the phone\'s claim x 0.5, two sword hits a swing (v2.3.3260)',
  oneformula: 'one formula for every fight: health 100 + 50 a level + 40 a point (was 6 and 8), every monster\'s hit scaled to match (the same share of your bar), no blow over 30% of a player\'s bar, the sword\'s special 4.5x, the staff\'s big bolt x0.6, one bite every 15 s in any fight; without it: all of it as before (v2.3.3260)',
  fishheal: 'the fish ladder (minnow 20, clownfish 30, trout 45, salmon 65, pike 95 on screen); without it: 20, 28, 36, 44, 52 (v2.3.3260)',
  bowvolley: 'the bow special as three white-hot arrows, two-thirds of a special each, a 2.5 s burn, no blast (v2.3.2849; without it: one arrow, its 4 s burn and the blast)',
  wheelmonsters: 'monsters in the Wheel (?trial=wheel): each land\'s own at the inner end of its spoke (v2.3.2978; without it: the Wheel has none)',
  sprint: 'the sprint button right of the movement stick (and Shift): a third faster while your stamina lasts (v2.3.3006; without it: no button, everyone walks)',
  wheelnodes: 'resources in the Wheel: copper, pine and fish round town, iron and softwood at levels 1-10, black steel and hardwood at 11-20 (v2.3.3012; without it: nothing to gather there)',
  wheeldungeons: 'dungeons in the Wheel: the Great Cave, the Foundry Dome and the Buried City open at their landmarks (v2.3.3016; without it: no mouths, no Enter button)',
  farm: 'the farm: the Feed & Seed window digs, plants, waters, fertilizes and harvests beds the worker owns, on its clock, and sells seeds and compost (v2.3.3127; without it: the old browser-only plots, which never kept anything)',
  meals: 'meals and brews you carry: the Cookhouse cooks a dish into the bag to eat or drink later, one meal and one brew at a time, and brews the three tonics Diego no longer sells (v2.3.3130; off: a cook is eaten at once instead of carried, nobody can brew a tonic, and dishes already in bags still eat and drink)',
  cookRows: 'how many Cookhouse recipes the worker cooks: the Cookhouse, the campfire and the bag offer only those (v2.3.3130; without it, the old three)',
  farmCrops: 'how many crops the worker grows: the Feed & Seed window offers only those (v2.3.3131; without it, the first four)',
  pvpbrew: 'damage brews in duels and player fights: every hit (swings, shots, the bow volley, the staff special) gets the Fury Tonic or Firebloom Tea the worker says you drank (v2.3.3133; off: pages that join afterwards claim the old way, where the volley and the staff special had no brew; pages already playing get no brew in a duel until they reload)',
  pvpheal: 'one bite at a time in a duel or a fight with a player: a Garden Stew, cooked fish or minnow bottle every 15 s (v2.3.3133; off: eat as fast as you can tap)',
  farmorders: 'the Feed & Seed order board: three orders a day for crops and dishes, each paid in gold and Farming XP (v2.3.3134; off: no Orders tab, and a delivery is refused)',
  spar: 'the Sparring section of this panel: clones of you with a sword, a bow or a staff that fight you through the real player-vs-player code (v2.3.3265; off: no section, and any clones out go away)',
};

/* ═══ v2.3.3265: SPARRING ═══
   Owner: "I wish I could test PvP somehow. Can you make a special environment
   where I can go to attack clones of myself using different weapons and you
   just have them attack me using AI? Purely for testing purposes. Maybe this
   is better to add to the admin window".  The clones are the worker's
   (server/src/spar.js): players to the room with your look, level, points and
   armour and their own weapon, an AI fighting you through the room's own PvP
   code.  These are its labels; the tap that aims at one is game/spar.js. */
const SPAR_WEAPON_ROWS = [
  { w: 'sword', label: 'Sword clone' },
  { w: 'bow', label: 'Bow clone' },
  { w: 'staff', label: 'Staff clone' },
];
const SPAR_SKILL_ROWS = [
  { k: 'dummy', label: 'Dummy', note: 'stands still and never attacks -- read your own numbers on it' },
  /* v2.3.3267: a beginner (server spar.js SPAR_SKILLS.easy) -- the careless player it was beat the owner */
  { k: 'easy', label: 'Easy', note: 'a beginner: slow to attack, no specials, no lunge, no rolls, no shield' },
  { k: 'normal', label: 'Normal', note: 'an average player: keeps a distance, rolls and shields now and then, lunges' },
  { k: 'hard', label: 'Hard', note: 'a skilled player: kites, strafes, answers your specials, lunges from across the screen' },
];

export const DevPanel = ({ onClose }) => {
  const [key, setKey] = useState(() => { try { return localStorage.getItem(KEY_LS) || ''; } catch (e) { return ''; } });
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [state, setState] = useState(null);

  const S = getState();
  const myId = S && S.myId;

  /* v2.3.2412: `method` added so the flags section can DELETE.  Defaulted
     from `body` exactly as before, so every existing call site is unchanged
     -- the alternative was a second fetch helper that would have drifted from
     this one's 401/404 handling, which is the part worth having. */
  const call = useCallback(async (path, body, method, opts) => {
    /* v2.3.2440: `quiet` is for calls the owner did not make — see the
       header.  It suppresses BOTH halves of the feedback (busy + message),
       because a background probe that disables buttons or writes errors is
       reporting on a request nobody asked for. */
    const quiet = !!(opts && opts.quiet);
    const say = quiet ? () => {} : setMsg;
    if (!key) { say('Enter your admin key first.'); return null; }
    if (!quiet) setBusy(true);
    try {
      const _m = method || (body ? 'POST' : 'GET');
      const res = await fetchWithTimeout(BT_API_BASE + '/api/admin' + path, {
        method: _m,
        headers: Object.assign({ Authorization: 'Bearer ' + key },
          body ? { 'Content-Type': 'application/json' } : {}),
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      /* Say WHICH failure it was.  401 and 404 mean very different things
         here — a typo in the key versus no key configured on the worker at
         all — and guessing between them wastes an afternoon. */
      if (res.status === 401) { say('Key rejected (401). Check for a typo.'); return null; }
      if (res.status === 404 && !j.ok) {
        if (j.error !== 'Not found') { say('Not found (404) — is that character online?'); return null; }
        /* ═══ TWO VERY DIFFERENT 404s, AND THEY LOOK IDENTICAL ═══
           The admin surface answers {ok:false, error:'Not found'} with a 404
           BOTH when no ADMIN_KEY is configured (the deliberate fail-closed
           posture — the surface must be indistinguishable from a route that
           does not exist) and when the key is fine but the worker predates
           these routes.  That second case is the normal one right after
           setting a key: Pages previews rebuild only the CLIENT, so the
           worker keeps running whatever main last deployed.

           Reported as "no key set", it sends the owner back to Cloudflare to
           re-add a key that was never the problem.  So probe /overview,
           which every worker since v2.3.1148 has had: if THAT answers, the
           key is good and the worker is simply behind.  Deliberately not
           solved by making the fail-closed 404 distinguishable — that would
           trade away the security property on purpose. */
        if (quiet) return null;   /* v2.3.2440: no second round trip for a call nobody made */
        try {
          const probe = await fetchWithTimeout(BT_API_BASE + '/api/admin/overview', { headers: { Authorization: 'Bearer ' + key } });
          if (probe.ok) {
            say('Your key works, but this worker does not have the test routes yet — it needs the deploy that ships them.');
          } else if (probe.status === 401) {
            say('Key rejected (401). Check for a typo.');
          } else {
            say('No ADMIN_KEY set on the worker (404). See OPERATIONS.md.');
          }
        } catch (e) {
          say('No ADMIN_KEY set on the worker (404). See OPERATIONS.md.');
        }
        return null;
      }
      if (!res.ok || !j.ok) { say('Failed: ' + (j.error || res.status)); return null; }
      return j;
    } catch (e) {
      /* v2.3.2440: an abort is OUR timeout, not the network refusing —
         calling it a network error sends the owner to check their wifi when
         the request was simply never answered. */
      say(isAbort(e) ? TIMEOUT_MSG : 'Network error: ' + String(e).slice(0, 80));
      return null;
    } finally { if (!quiet) setBusy(false); }
  }, [key]);

  const refresh = useCallback(async (quiet) => {
    if (!key || !myId) return;
    const j = await call('/dev/state?id=' + encodeURIComponent(myId), null, null, { quiet: !!quiet });
    if (j) { setState(j); if (!quiet) setMsg(''); }
  }, [call, key, myId]);

  /* v2.3.2440: quiet — nobody pressed this.  See the header. */
  useEffect(() => { refresh(true); }, [refresh]);

  /* ═══ v2.3.2412: LIVE FLAGS, BECAUSE ONE OF THEM CAN BREAK THE GAME ═══
     Owner, 2026-09-09, on production: combat levels reading 0 on the Points
     screen while the panel behind it read Lv 1 for the same character.  That
     pair is diagnostic -- the grid is gated on prog3Live (worker cap AND
     blob) and the panel on prog3HasSkills (blob only) -- so the blob was fine
     and `caps.prog3` was false.  A clean worker built from this source
     advertises 42 caps with prog3 true, so the source was never the problem.

     The mechanism is in liveops.js's own header: the `liveflags` map is
     spread over the state_sync caps literal LAST, so a flag named after a
     capability overrides the baked-in `true`, and its warning says exactly
     what that costs -- "overriding a cap to false ... can re-enable legacy
     client-side fallback paths for some systems".  The legacy path is the one
     that prints Lv 0.

     The routes to read and clear that map have existed since v2.3.1150.  What
     did not exist was any way to reach them without a computer, and the owner
     runs this game from a phone.  So a flag set months ago in an emergency
     can sit in Durable Object storage indefinitely, silently disabling a
     system, with no surface anywhere that says so.  That is the actual bug
     this section fixes; the flags themselves are working as designed.

     Loaded on demand rather than with the state refresh: it is one more admin
     round trip on every panel open, and most opens are not about flags. */
  const [flags, setFlags] = useState(null);
  const loadFlags = useCallback(async () => {
    const j = await call('/flags');
    if (j) { setFlags(j.flags || {}); setMsg(''); }
  }, [call]);
  const clearFlag = useCallback(async (name) => {
    const j = await call('/flags?name=' + encodeURIComponent(name), null, 'DELETE');
    if (j) { setFlags(j.flags || {}); setMsg('Cleared "' + name + '". Reload the game to pick it up.'); }
  }, [call]);

  /* ═══ v2.3.3323: BOT FLAGS, WHERE THE OWNER CAN SEE THEM ═══
     The anti-bot review (docs/specs/antibot-review.md §3): botfp.js has written
     flags since v2.3.1146 and nobody could read them -- one curl command, with
     the key in a header no other admin command used, in no guide.  This lists
     every flagged player (devtools.js /dev/botflags), newest flag first, each
     flag said in words.  On demand, like the live flags: most opens are not
     about bots.  A flag still changes nothing in the game. */
  const [botFlags, setBotFlags] = useState(null);
  const loadBotFlags = useCallback(async () => {
    const j = await call('/dev/botflags');
    if (j) { setBotFlags(Array.isArray(j.flagged) ? j.flagged : []); setMsg(''); }
  }, [call]);

  /* ═══ v2.3.3398: CHAT REPORTS, WHERE THE OWNER CAN ACT ON THEM ═══
     Players have filed reports since v2.3.1981 (a player's card, Report), each
     stored with the server's own copy of what the reported player said
     (chatmod.js).  The owner could read them, and kick or freeze from them,
     only with curl -- and runs the game from a phone.  Found by the fun &
     social plan's check of the code (docs/FUN-SOCIAL-PLAN.md, Phase 0).  This
     lists them newest first (GET /reports, which says per row whether the
     player is online and frozen NOW, v2.3.3398) and acts through the admin
     routes that already exist: Kick (/kick: they can come straight back),
     Freeze (/freeze, two taps: they cannot join until unfrozen), Unfreeze,
     and Dismiss (DELETE /reports: the report is handled).  Every one of them
     is written to the admin log by the worker.  On demand, like the flags. */
  const [reports, setReports] = useState(null);
  const [sure, setSure] = useState('');   /* the Freeze waiting for its second tap */
  const loadReports = useCallback(async (keepMsg) => {
    const j = await call('/reports?limit=50');
    if (j) { setReports(Array.isArray(j.reports) ? j.reports : []); if (!keepMsg) setMsg(''); }
  }, [call]);
  const reportAct = useCallback(async (r, act) => {
    const who = r.targetName || r.target;
    if (act === 'freeze' && sure !== 'freeze:' + r.key) { setSure('freeze:' + r.key); return; }
    setSure('');
    if (act === 'dismiss') {
      const j = await call('/reports?id=' + encodeURIComponent(r.key), null, 'DELETE');
      if (j) { setReports((rs) => (rs || []).filter((x) => x.key !== r.key)); setMsg('Dismissed the report on ' + who + '.'); }
      return;
    }
    let j = null;
    if (act === 'kick') {
      j = await call('/kick', { playerId: r.target, reason: 'chat report ' + r.key });
      if (j) setMsg(j.wasOnline ? 'Kicked ' + who + '. They can join again straight away.' : who + ' was not online.');
    } else if (act === 'freeze') {
      j = await call('/freeze', { playerId: r.target, note: 'chat report: ' + (r.reason || 'other') });
      if (j) setMsg('Froze ' + who + ': they cannot join until you unfreeze them.');
    } else if (act === 'unfreeze') {
      j = await call('/freeze?id=' + encodeURIComponent(r.target), null, 'DELETE');
      if (j) setMsg('Unfroze ' + who + '.');
    }
    if (j) await loadReports(true);   /* the online and frozen words, fresh */
  }, [call, sure, loadReports]);

  /* ═══ v2.3.3344: A CHARACTER'S DEVICES (server/src/devicelock.js) ═══
     A character's key works only on devices it has been played on.  A player
     moving to a new device sees a code on their screen (DeviceScreen.js); the
     owner pastes it here.  "Let one new device in" gives that character 30
     minutes in which one new device may join it; "Forget all its devices" is
     for a character someone else got into -- whoever is playing it is put out
     and nobody gets in until a device is let in.  Two taps, as it puts a
     player out. */
  const [devCode, setDevCode] = useState('');
  const [devForgetArmed, setDevForgetArmed] = useState(false);
  /* v2.3.3355: "Give it a new key" (server/src/loginkeys.js) -- two taps, and
     the key it made, shown here once for the owner to send its player */
  const [devNewKeyArmed, setDevNewKeyArmed] = useState(false);
  const [devNewKey, setDevNewKey] = useState('');
  const letDeviceIn = useCallback(async () => {
    const id = devCode.trim();
    if (!id) return;
    const j = await call('/device-pass', { playerId: id });
    if (j) setMsg('One new device can join ' + id + ' until '
      + new Date(j.until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '. Ask its player to tap Try again.');
  }, [call, devCode]);
  const forgetDevices = useCallback(async () => {
    const id = devCode.trim();
    if (!id) return;
    if (!devForgetArmed) { setDevForgetArmed(true); setMsg('Tap Forget again to put out whoever is playing ' + id + ' and forget its devices.'); return; }
    setDevForgetArmed(false);
    const j = await call('/device-forget', { playerId: id });
    if (!j) return;
    /* v2.3.3355: what it did, as one sentence -- "Forgot 2 devices for X, took
       back 1 Login Key and put its player out." */
    const did = ['Forgot ' + j.forgot + ' device' + (j.forgot === 1 ? '' : 's') + ' for ' + id];
    if (j.taken) did.push('took back ' + j.taken + ' Login Key' + (j.taken === 1 ? '' : 's'));
    if (j.wasOnline) did.push('put its player out');
    const said = did.length > 1 ? did.slice(0, -1).join(', ') + ' and ' + did[did.length - 1] : did[0];
    setMsg(said + '. Nobody can play it until you let one device in.');
  }, [call, devCode, devForgetArmed]);
  /* v2.3.3355: the full reset for a stolen character: every device forgotten,
     every key taken back, the old key retired, and ONE new key, shown below
     for the owner to send its player (the worker keeps only its fingerprint,
     so it can never be shown again) */
  const giveNewKey = useCallback(async () => {
    const id = devCode.trim();
    if (!id) return;
    if (!devNewKeyArmed) { setDevNewKeyArmed(true); setDevNewKey(''); setMsg('Tap again to give ' + id + ' a new Login Key: every old key and device stops working.'); return; }
    setDevNewKeyArmed(false);
    const j = await call('/key-new', { playerId: id });
    if (j && j.key) {
      setDevNewKey(j.key);
      setMsg('New Login Key for ' + id + (j.wasOnline ? ' (its player was put out)' : '') + '. Send it to its player: it is shown only now.');
    }
  }, [call, devCode, devNewKeyArmed]);

  const saveKey = () => {
    const k = draft.trim();
    if (!k) return;
    try { localStorage.setItem(KEY_LS, k); } catch (e) {}
    setKey(k); setDraft(''); setMsg('');
  };
  const forgetKey = () => {
    try { localStorage.removeItem(KEY_LS); } catch (e) {}
    setKey(''); setState(null); setMsg('Key cleared from this device.');
  };

  /* ═══ v2.3.2308: FROM WHEREVER YOU ARE STANDING ═══
     This used to place you on a trail-head and required you to already be on
     the World View; from town -- where a session starts -- the chips printed
     "head there first" and did nothing at all.  Proven, not assumed:
     mp-devwarp pressed the Flame Fields chip from town and the player was
     still in town thirty seconds later on both the client and the worker.

     Now it hands a DESTINATION to the game loop (driveDevWarp in
     zoneTransitions.js), which walks the game's own front doors one leg at a
     time -- town -> World View -> the spoke, or out of a spoke through its
     return marker first.  Every leg is a real zone entry, so the per-zone
     asset preload behind the loading overlay still happens and the
     animation-preloading law is untouched.  Nothing here reimplements a
     transition, which is why it cannot drift from the one players use. */
  const warp = (zoneId) => {
    const st = getState();
    if (!st || !st.player) return;
    if (st.currentZone === zoneId) { setMsg('You are already there.'); return; }
    const ex = WORLDVIEW_EXITS.find((e) => e.zoneId === zoneId);
    if (!ex) { setMsg('No door to ' + zoneId + ' on the World View.'); return; }
    st._devWarp = { to: zoneId, legs: 0, t: Date.now(), nextAt: 0 };
    setMsg('Heading to ' + (ex.label || zoneId) + '…');
    if (onClose) onClose();
  };

  const zoneRows = WORLDVIEW_EXITS.filter((e) => e.zoneId !== 'town');

  return (
    <div style={box} onPointerDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div style={sheet}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <strong style={{ font: '700 16px system-ui, sans-serif' }}>Test panel</strong>
          <button type="button" style={{ ...chip, minHeight: 34 }} onClick={onClose}>Close</button>
        </div>
        <div style={{ color: COL.muted, fontSize: 12, marginBottom: 6 }}>
          Owner tools. Everything here needs your admin key.
        </div>

        {/* ═══ v2.3.2440: THE KEYLESS ANSWER ═══
            See the note by CAP_GATES.  This reads the caps the client
            already received on join, so it works with no admin key, no
            network and no worker cooperation -- which is precisely when the
            owner needs it most. */}
        <div style={label}>This worker</div>
        {(() => {
          const caps = S && S._serverCaps;
          if (!caps) {
            return (
              <div style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }}>
                Not joined yet — open this once you are standing in the world.
              </div>
            );
          }
          const off = CAP_GATES.filter((c) => !caps[c]);
          if (!off.length) {
            return (
              <div style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }} data-caps-ok="1">
                All {CAP_GATES.length} systems claimed. Nothing is falling back to old behaviour.
              </div>
            );
          }
          return (
            <div data-caps-off={off.join(',')} style={{
              background: COL.accentFill, border: '1px solid ' + COL.accent,
              color: COL.accent, borderRadius: 9, padding: '10px 11px',
              fontSize: 12.5, lineHeight: 1.4, marginBottom: 9,
            }}>
              <b>{off.length === 1 ? 'This system is' : 'These ' + off.length + ' systems are'} switched
              off for you:</b>
              <div style={{ margin: '4px 0 5px' }}>
                {off.map((c) => (
                  <div key={c}>• {c}{CAP_NOTES[c] ? ' — ' + CAP_NOTES[c] : ''}</div>
                ))}
              </div>
              The game falls back to its old behaviour for {off.length === 1 ? 'it' : 'them'}, which
              usually looks like wrong numbers rather than a missing feature. A live flag of the same
              name is the usual cause — check Live flags below.
            </div>
          );
        })()}

        {/* ═══ v2.3.3339: THE SPEED TEST ═══
            Keyless and on this phone only (game/speedTest.js): what makes a
            frame slow is mostly the phone's graphics chip, which no test
            machine has.  The panel closes first, so the test times the game
            and not the panel over it. */}
        <div style={label}>Speed test</div>
        <div style={{ color: COL.muted, fontSize: 12, marginBottom: 7, lineHeight: 1.4 }}>
          About 35 seconds. Stand still where you usually play: this panel closes and a card shows
          this phone's frames a second with everything on, then with the shadows, the metal shine,
          the moving water and the full resolution each switched off in turn. Everything goes back
          as it was and nothing is saved. A screenshot of the card says what costs the most here.
        </div>
        <button type="button" style={btn(false)} data-dev-speed-test=""
          onClick={() => { if (onClose) onClose(); setTimeout(() => { runSpeedTest(); }, 400); }}>
          Run the speed test
        </button>

        {/* ═══ v2.3.3523: THE SOUND STUDIO ═══
            The owner: "I think sounds were wired in the wrong places.  The
            labels should tell you where they go.  Might need to build a quick
            studio to show which sounds belong where."  Keyless: it only plays
            sounds (ui/panels/SoundStudio.jsx). */}
        <div style={label}>Sound studio</div>
        <div style={{ color: COL.muted, fontSize: 12, marginBottom: 7, lineHeight: 1.4 }}>
          Every sound in the game under the moment it plays at, with a play button and the recording it
          is made of. "Heard just now" names the last sounds the game played, so a wrong one can be found.
        </div>
        <button type="button" style={btn(false)} data-dev-sound-studio=""
          onClick={() => { if (onClose) onClose(); setTimeout(() => { openSoundStudio(); }, 150); }}>
          Open the sound studio
        </button>

        {!key && (
          <>
            <div style={label}>Admin key</div>
            <input
              type="password" value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder="paste your ADMIN_KEY"
              autoCapitalize="off" autoCorrect="off" spellCheck={false}
              style={{ width: '100%', boxSizing: 'border-box', background: COL.well, color: COL.text,
                border: '1px solid ' + COL.border, borderRadius: 8, padding: '11px 10px', marginBottom: 8, minHeight: 44 }}
            />
            <button type="button" style={btn(true)} onClick={saveKey}>Save key on this device</button>
            <div style={{ color: COL.muted, fontSize: 12 }}>
              Stored only in this browser. Set the key in Cloudflare → Workers → brotown-server → Settings → Variables (see OPERATIONS.md).
            </div>
          </>
        )}

        {key && (
          <>
            <div style={label}>Zones</div>
            <button type="button" style={btn(false)} disabled={busy}
              onClick={async () => { const j = await call('/dev/unlock', { playerId: myId }); if (j) { setMsg(j.opened.length ? 'Opened: ' + j.opened.join(', ') : 'Already open.'); refresh(); } }}>
              Unlock every gated zone
            </button>
            {state && (
              <div style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }}>
                {Object.keys(state.zones || {}).map((z) => (
                  <span key={z} style={{ marginRight: 10, color: state.zones[z] ? COL.accent : COL.disabled }}>
                    {state.zones[z] ? '● ' : '○ '}{z}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 4 }}>
              {zoneRows.map((e) => (
                <button key={e.zoneId} type="button" style={chip}
                  onClick={() => warp(e.zoneId)}>
                  {e.label}
                </button>
              ))}
            </div>
            <div style={{ color: COL.muted, fontSize: 12, marginBottom: 2 }}>
              Works from anywhere — it walks you through the doors, so each zone
              still loads properly on the way in.
            </div>

            <div style={label}>Character</div>
            <button type="button" style={btn(false)} disabled={busy}
              onClick={async () => { const j = await call('/dev/kit', { playerId: myId }); if (j) { setMsg('Kit granted (' + j.weapons + ' weapons' + (typeof j.armor === 'number' ? ', ' + j.armor + ' armour pieces' : '') + ') — check your bag.'); refresh(); } }}>
              {/* v2.3.2875: the kit hands out the copper and iron armour sets too (devtools.js DEVKIT.ARMOR) */}
              Give weapons + armor + levels
            </button>
            {/* v2.3.3142: the kit's armour in a grade, to wear and see its look
                (rare blue, elite orange, godly prismatic -- glint.js GRADE_LOOK) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 4 }}>
              {['rare', 'elite', 'godly'].map((q) => (
                <button key={q} type="button" style={chip} disabled={busy} data-dev-kit-grade={q}
                  onClick={async () => { const j = await call('/dev/kit', { playerId: myId, what: 'armor', quality: q }); if (j) { setMsg((typeof j.armor === 'number' ? j.armor : 0) + ' ' + q + ' armour pieces — check your bag.'); refresh(); } }}>
                  {q.charAt(0).toUpperCase() + q.slice(1)} armor
                </button>
              ))}
            </div>
            {/* v2.3.3516: the gem plan's Phase 2 to try at once -- each land's
                shards to crack, and raw gems to combine (devtools.js /dev/kit
                'shards', and 'gems' with raw) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 4 }}>
              <button type="button" style={chip} disabled={busy} data-dev-kit-shards
                onClick={async () => { const j = await call('/dev/kit', { playerId: myId, what: 'shards', count: 20 }); if (j) { setMsg('20 shards of each land — crack them at the Gem Works.'); refresh(); } }}>
                20 shards each
              </button>
              <button type="button" style={chip} disabled={busy} data-dev-kit-rawgems
                onClick={async () => { const j = await call('/dev/kit', { playerId: myId, what: 'gems', raw: true, count: 3 }); if (j) { setMsg('3 raw gems of each element — combine them at the Gem Works.'); refresh(); } }}>
                3 raw gems each
              </button>
            </div>
            <button type="button" style={btn(false)} disabled={busy}
              onClick={async () => { const j = await call('/dev/vitals', { playerId: myId, heal: true }); if (j) { setMsg('Topped up.'); refresh(); } }}>
              Heal / refill
            </button>
            <button type="button" style={btn(state && state.god)} disabled={busy}
              onClick={async () => { const on = !(state && state.god); const j = await call('/dev/vitals', { playerId: myId, heal: false, god: on }); if (j) { setMsg(on ? 'God mode ON — expires on its own.' : 'God mode off.'); refresh(); } }}>
              {state && state.god
                ? 'God mode ON — ' + Math.ceil((state.godMsLeft || 0) / 60000) + ' min left (tap to stop)'
                : 'God mode (stop taking damage)'}
            </button>
            {/* v2.3.3127: a Cloudpetal takes eight real hours -- this makes every
                planted bed ripe now, so a harvest can be tried without waiting
                (server devtools.js _devFarmRipe; the harvest itself is still the
                worker's own). */}
            <button type="button" style={btn(false)} disabled={busy}
              onClick={async () => { const j = await call('/dev/farmripe', { playerId: myId }); if (j) { setMsg(j.ripened ? 'Ripened ' + j.ripened + ' bed' + (j.ripened === 1 ? '' : 's') + ' — open the Feed & Seed to harvest.' : 'Nothing growing to ripen.'); } }}>
              Ripen my farm now
            </button>
            {/* v2.3.3229: the hit ladder is felt by level (Mining 3 hits 1 eight
                times in ten, Mining 11 never does) -- set the four hit skills
                (mining, woodcutting, fishing, cooking) to one level at once
                (server devtools.js _devLifeSkill); the next harvest rolls it. */}
            <div style={{ color: COL.muted, fontSize: 12, margin: '6px 0 4px' }}>
              Gathering + cooking level (the hit ladder)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 4 }}>
              {[1, 3, 5, 10, 11, 20].map((lv) => (
                <button key={lv} type="button" style={{ ...chip, minHeight: 34 }} disabled={busy || !myId} data-dev-hit-level={lv}
                  onClick={async () => { const j = await call('/dev/lifeskill', { playerId: myId, skill: 'hits', level: lv }); if (j) { setMsg('Mining, Woodcutting, Fishing and Cooking are level ' + j.level + ' -- open Skills to see each hit\'s odds.'); refresh(); } }}>
                  {lv}
                </button>
              ))}
            </div>

            {/* ═══ v2.3.3430: TEST MODE ═══
                The owner's option 2 (server/src/testmode.js through
                /dev/testmode): the worker stops doubting this character's
                phone -- the checks a script trips are also the ones a test
                session trips (a warp, a reload mid-harvest, a quest taken out
                of order).  Stored on the character, so it lasts through
                reconnects, deploys and launch until it is turned off here; the
                top bar wears a TEST MODE tag while it is on. */}
            <div style={label}>Test mode</div>
            <button type="button" style={btn(!!(state && state.testMode))} disabled={busy || !myId} data-dev-testmode="1"
              onClick={async () => {
                const on = !(state && state.testMode);
                const j = await call('/dev/testmode', { playerId: myId, on });
                if (j) {
                  setMsg(on ? 'Test mode ON for this character -- it stays on until you turn it off here.'
                    : 'Test mode off -- every check is back on for this character.');
                  refresh();
                }
              }}>
              {state && state.testMode ? 'Test mode ON (tap to turn off)' : 'Test mode (anti-cheat off for this character)'}
            </button>
            <div data-dev-testmode-note="1" style={{ color: COL.muted, fontSize: 12, marginBottom: 2, lineHeight: 1.4 }}>
              Turns off, for this character only: the speed limits on moving, the timing
              checks on harvesting and cooking, the limits on how fast and how far your hits
              on monsters land, the quest order, the dodge-roll check and the bot scoring.
              Everything that protects other players and the server stays on. What you earn
              with it on stays with the character.
              {state && state.testMode && state.testModeAllowed === false
                ? ' Right now the live flag "testmode" is off, so every check is on anyway.' : ''}
            </div>

            {/* ═══ v2.3.3265: SPARRING ═══
                Clones of you to fight (server/src/spar.js through /dev/spar).
                Adding one closes the panel so you can fight it; the game says
                in the chat that they arrived and how to target one. */}
            <div style={label}>Sparring (PvP practice)</div>
            {!(S && S._serverCaps && S._serverCaps.spar) ? (
              <div style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }} data-spar-off="1">
                This server does not have sparring yet -- it needs the deploy that ships it.
              </div>
            ) : (
              <>
                <div style={{ color: COL.muted, fontSize: 12, marginBottom: 7, lineHeight: 1.4 }}>
                  Clones of you -- your look, level, points and armour -- that fight only you,
                  through the real player-vs-player rules. Your attacks hit them like monsters
                  (a tap picks one to aim at). If they knock you out you are healed on the spot:
                  nothing is lost. Stand anywhere in the world.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 7 }}>
                  {SPAR_WEAPON_ROWS.map((r) => (
                    <button key={r.w} type="button" style={chip} disabled={busy || !myId} data-dev-spar-add={r.w}
                      onClick={async () => {
                        const j = await call('/dev/spar', { playerId: myId, add: r.w });
                        if (j) { setState((st) => Object.assign({}, st || {}, { spar: j })); if (onClose) onClose(); }
                      }}>
                      {r.label}
                    </button>
                  ))}
                </div>
                <button type="button" style={btn(false)} disabled={busy || !myId} data-dev-spar-add="all"
                  onClick={async () => {
                    const j = await call('/dev/spar', { playerId: myId, add: 'all' });
                    if (j) { setState((st) => Object.assign({}, st || {}, { spar: j })); if (onClose) onClose(); }
                  }}>
                  All three (sword, bow and staff)
                </button>
                <div style={{ color: COL.muted, fontSize: 12, margin: '2px 0 5px' }}>How they fight</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 4 }}>
                  {SPAR_SKILL_ROWS.map((r) => {
                    const on = !!(state && state.spar && state.spar.skill === r.k);
                    return (
                      <button key={r.k} type="button" disabled={busy || !myId} data-dev-spar-skill={r.k}
                        style={Object.assign({}, chip, { minHeight: 34, background: on ? COL.accentFill : COL.raised, borderColor: on ? COL.accent : COL.border })}
                        onClick={async () => {
                          const j = await call('/dev/spar', { playerId: myId, skill: r.k });
                          if (j) { setState((st) => Object.assign({}, st || {}, { spar: j })); setMsg(r.label + ': ' + r.note + '.'); }
                        }}>
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                {state && state.spar && (
                  <div style={{ color: COL.text2, fontSize: 12, margin: '4px 0 8px' }} data-dev-spar-status="1">
                    {state.spar.clones && state.spar.clones.length
                      ? state.spar.clones.map((c) => c.name + (c.down ? ' (down)' : ' ' + c.hp + '/' + c.maxHp)).join(' · ')
                      : 'No clones out.'}
                    {state.spar.rounds && (state.spar.rounds.you || state.spar.rounds.clones)
                      ? ' -- knockouts: you ' + state.spar.rounds.you + ', clones ' + state.spar.rounds.clones
                      : ''}
                  </div>
                )}
                <button type="button" style={btn(false)} disabled={busy || !myId} data-dev-spar-clear="1"
                  onClick={async () => {
                    const j = await call('/dev/spar', { playerId: myId, clear: true });
                    if (j) { setState((st) => Object.assign({}, st || {}, { spar: j })); setMsg('Clones sent home.'); }
                  }}>
                  Clear clones
                </button>
              </>
            )}

            <div style={label}>Key</div>
            {/* ═══ v2.3.2277: RESOURCES FOR TESTING ═══
                Owner: "also having access to extract resources for testing".
                No new server code: /api/admin/grant has credited arbitrary
                inventory keys since the operator API existed, and the QA
                harness has used it all along -- what was missing was a button.
                The TOOLS row is the one that actually unblocks him: without an
                axe/pole/pickaxe the renderer draws no nodes at all and the
                worker refuses both extraction_start and node_strike, so a
                fresh character cannot test gathering however many logs you
                hand him. */}
            <div style={label}>Resources</div>
            <button
              type="button" style={btn(false)} disabled={busy || !myId}
              onClick={async () => {
                let n = 0;
                for (const invKey of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) {
                  const j = await call('/grant', { playerId: myId, kind: 'item', payload: { invKey, count: 1 }, note: 'Test panel: gathering tools' });
                  if (j) n++;
                }
                setMsg(n ? 'Gathering tools granted (' + n + '/3) — trees, ponds and veins will draw now.' : 'Nothing granted.');
                refresh();
              }}>Give gathering tools (axe, pole, pickaxe)</button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
              {[
                { k: 'wood_pine_log', label: 'Logs' },
                { k: 'ore_copper_ore', label: 'Copper' },
                { k: 'fish_minnow', label: 'Minnow' },
              ].map((r) => (
                <button
                  key={r.k} type="button" style={{ ...chip, minHeight: 34 }} disabled={busy || !myId}
                  onClick={async () => {
                    const j = await call('/grant', { playerId: myId, kind: 'item', payload: { invKey: r.k, count: 10 }, note: 'Test panel: resources' });
                    if (j) { setMsg('+10 ' + r.label + '.'); refresh(); }
                  }}>+10 {r.label}</button>
              ))}
            </div>

            {/* ═══ v2.3.2277: FINISH EVERY QUEST ═══
                Owner: "Having the finish all quests button will be good in
                that mode."  A server op, because the worker is the only
                durable writer of quest state and its echo overwrites any
                client-local mark.  It pays no rewards -- see the note on
                _devFinishQuests -- and it opens the gated zones as a side
                effect, because 'turnedIn' satisfies the same gate 'active'
                does.  Said on the button rather than left to be discovered. */}
            <button
              type="button" style={btn(false)} disabled={busy || !myId}
              onClick={async () => {
                const j = await call('/dev/quests', { playerId: myId });
                if (j) {
                  setMsg(j.finished
                    ? 'Finished ' + j.finished + ' of ' + j.total + ' quests (no rewards paid) — the gated zones are open too.'
                    : 'Every quest was already finished.');
                  refresh();
                }
              }}>Finish all quests (no rewards)</button>

            {/* ═══ v2.3.3525: JUMP THE TOUR TO A STEP ═══
                The tour (Mayor Bro -> Farmer Bro -> Blacksmith Bro -> ...) is
                one line, each step waiting for the last; this puts this
                character at any step (the ones before it handed in, no
                rewards paid), so a step can be rehearsed without playing the
                ones before it.  The worker's /dev/tour (devtools.js). */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
              {TOUR_STEPS.map((t) => (
                <button
                  key={t.id} type="button" style={{ ...chip, minHeight: 34 }} disabled={busy || !myId}
                  data-dev-tour={t.id}
                  onClick={async () => {
                    const j = await call('/dev/tour', { playerId: myId, at: t.id });
                    if (j) { setMsg('Tour: step ' + j.step + ' of ' + j.of + ' (' + t.label + ') is on offer now.'); refresh(); }
                  }}>{t.label}</button>
              ))}
            </div>

            {/* ═══ v2.3.2412: LIVE FLAGS ═══
                See the note by loadFlags for why this exists.  Two jobs, and
                the second is the one that matters: list the map, and SAY OUT
                LOUD when a flag is overriding a server capability, because
                that is the case that silently breaks a system and it is
                indistinguishable from a bug unless something names it. */}
            <div style={label}>Live flags</div>
            <button type="button" style={btn(false)} disabled={busy}
              onClick={loadFlags}>
              {flags ? 'Reload live flags' : 'Show live flags'}
            </button>

            {flags && Object.keys(flags).length === 0 && (
              <div style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }}>
                No flags set. Every capability is whatever the deployed worker bakes in.
              </div>
            )}

            {flags && Object.keys(flags).length > 0 && (() => {
              /* A flag is OVERRIDING a capability when its name is also a caps
                 key -- because that is precisely what the spread does.  Value
                 false is the harmful direction: it tells the client "this
                 worker has not claimed the job", and the client falls back to
                 a legacy path.  `disable_*` kill switches are server-side and
                 never collide with a cap name, so they list as ordinary. */
              const caps = (S && S._serverCaps) || {};
              const names = Object.keys(flags).sort();
              const overriding = names.filter((n) => (n in caps) && flags[n] === false);
              return (
                <>
                  {overriding.length > 0 && (
                    <div style={{
                      background: COL.accentFill, border: '1px solid ' + COL.accent,
                      color: COL.accent, borderRadius: 9, padding: '10px 11px',
                      fontSize: 12.5, lineHeight: 1.4, marginBottom: 9,
                    }}>
                      <b>{overriding.length === 1 ? 'This flag is' : 'These flags are'} switching a
                      system off:</b> {overriding.join(', ')}.<br />
                      The game falls back to its old behaviour for {overriding.length === 1 ? 'it' : 'them'},
                      which usually looks like wrong numbers rather than a missing feature.
                      Clear {overriding.length === 1 ? 'it' : 'them'} unless you set {overriding.length === 1 ? 'it' : 'them'} on purpose.
                    </div>
                  )}
                  {names.map((n) => {
                    const isOverride = (n in caps) && flags[n] === false;
                    return (
                      <div key={n} style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                        background: COL.raised, borderRadius: 8, padding: '8px 9px',
                        border: '1px solid ' + (isOverride ? COL.accent : COL.border),
                      }}>
                        <span style={{ flex: 1, minWidth: 0, font: '600 13px system-ui, sans-serif',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n}
                        </span>
                        <span style={{
                          font: '600 12px system-ui, sans-serif',
                          color: flags[n] === false ? COL.danger : COL.text2,
                          fontVariantNumeric: 'tabular-nums',
                        }}>{String(flags[n])}</span>
                        <button type="button" style={{ ...chip, minHeight: 34, flex: 'none' }}
                          disabled={busy}
                          onClick={() => clearFlag(n)}>Clear</button>
                      </div>
                    );
                  })}
                  <div style={{ color: COL.muted, fontSize: 12, marginBottom: 2 }}>
                    Clearing takes effect on your next join — reload the game to see it.
                  </div>
                </>
              );
            })()}

            {/* ═══ v2.3.3344: PLAYER LOGINS ═══  See the note by letDeviceIn. */}
            <div style={label}>Player logins</div>
            <div style={{ color: COL.muted, fontSize: 12, marginBottom: 7, lineHeight: 1.4 }}>
              A character can be played only on devices it was played on before. To move one to a new
              device, ask its player for the code their screen shows.
            </div>
            <input
              data-devlock-code="1"
              value={devCode} onChange={(e) => { setDevCode(e.target.value); setDevForgetArmed(false); setDevNewKeyArmed(false); setDevNewKey(''); }}
              placeholder="the player's code (bp_…)"
              autoCapitalize="off" autoCorrect="off" spellCheck={false}
              style={{ width: '100%', boxSizing: 'border-box', background: COL.well, color: COL.text,
                border: '1px solid ' + COL.border, borderRadius: 8, padding: '11px 10px', marginBottom: 8, minHeight: 44 }}
            />
            <button type="button" data-devlock-pass="1" style={btn(false)} disabled={busy || !devCode.trim()}
              onClick={letDeviceIn}>
              Let one new device in (30 min)
            </button>
            <button type="button" data-devlock-forget="1"
              style={{ ...btn(false), borderColor: COL.danger, color: COL.danger }}
              disabled={busy || !devCode.trim()} onClick={forgetDevices}>
              {devForgetArmed ? 'Sure? Forget all its devices' : 'Forget all its devices'}
            </button>
            <div style={{ color: COL.muted, fontSize: 12, marginBottom: 4, lineHeight: 1.4 }}>
              Forget is for a character someone else got into: whoever is playing it is put out, and
              nobody can play it until you let one device in.
            </div>
            {/* v2.3.3355: the full reset, its key shown once */}
            <button type="button" data-devlock-newkey="1"
              style={{ ...btn(false), borderColor: COL.danger, color: COL.danger }}
              disabled={busy || !devCode.trim()} onClick={giveNewKey}>
              {devNewKeyArmed ? 'Sure? Give it a new key' : 'Give it a new key'}
            </button>
            {devNewKey && (
              <input data-devlock-newkey-value="1" readOnly value={devNewKey}
                onFocus={(e) => { try { e.target.select(); } catch (err) { /* nothing */ } }}
                style={{ width: '100%', boxSizing: 'border-box', background: COL.well, color: '#EAC675',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 700,
                  border: '1px solid ' + COL.border, borderRadius: 8, padding: '11px 10px', marginBottom: 8, minHeight: 44 }} />
            )}
            <div style={{ color: COL.muted, fontSize: 12, marginBottom: 4, lineHeight: 1.4 }}>
              Give it a new key when a character was stolen, or for a player who lost every device
              and key: the character's old keys and devices all stop working, and you send its player
              the new key, which works on any device.
            </div>

            {/* ═══ v2.3.3323: BOT FLAGS ═══  See the note by loadBotFlags. */}
            <div style={label}>Bot flags</div>
            <button type="button" style={btn(false)} disabled={busy}
              onClick={loadBotFlags}>
              {botFlags ? 'Reload flagged players' : 'Show flagged players'}
            </button>
            {botFlags && botFlags.length === 0 && (
              <div data-botflags-empty="1" style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }}>
                No player is flagged. A flag is evidence only: it changes nothing in the game.
              </div>
            )}
            {botFlags && botFlags.length > 0 && (
              <>
                <div style={{ color: COL.muted, fontSize: 12, marginBottom: 6, lineHeight: 1.4 }}>
                  Newest first. A flag is evidence only: it changes nothing in the game
                  (docs/OPERATIONS.md, "Bot flags").
                </div>
                {botFlags.map((f) => (
                  <div key={f.id} data-botflag={f.id} style={{
                    marginBottom: 6, background: COL.raised, borderRadius: 8, padding: '8px 9px',
                    border: '1px solid ' + COL.border,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span data-botflag-name="1" style={{ flex: 1, minWidth: 0, font: '600 13px system-ui, sans-serif',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name || f.id}
                      </span>
                      <span style={{ font: '600 11px system-ui, sans-serif', color: f.online ? COL.accent : COL.muted }}>
                        {f.online ? 'online' : 'offline'}
                      </span>
                    </div>
                    <div data-botflag-why="1" style={{ fontSize: 12.5, lineHeight: 1.4, marginTop: 3, color: COL.text2 }}>
                      {botFlagWords(f.last && f.last.kind, f.last && f.last.detail)}
                      {f.last && f.last.at ? ' · ' + agoWords(f.last.at) : ''}
                      {f.flags > 1 ? ' · ' + f.flags + ' flags' : ''}
                    </div>
                    {botCountersWords(f.counters) && (
                      <div style={{ fontSize: 11.5, lineHeight: 1.4, marginTop: 2, color: COL.muted }}>
                        {botCountersWords(f.counters)}
                      </div>
                    )}
                    <div style={{ fontSize: 11, marginTop: 2, color: COL.muted, wordBreak: 'break-all', userSelect: 'all' }}>
                      {f.id}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ═══ v2.3.3398: CHAT REPORTS ═══  See the note by loadReports. */}
            <div style={label}>Chat reports</div>
            <button type="button" style={btn(false)} disabled={busy}
              onClick={() => loadReports(false)}>
              {reports ? 'Reload chat reports' : 'Show chat reports'}
            </button>
            {reports && reports.length === 0 && (
              <div data-reports-empty="1" style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }}>
                No reports. Players report someone from that player's card (Report).
              </div>
            )}
            {reports && reports.length > 0 && (
              <>
                <div style={{ color: COL.muted, fontSize: 12, marginBottom: 6, lineHeight: 1.4 }}>
                  Newest first. What they said is the server's own copy, never the reporter's.
                  Kick lets them straight back in; Freeze keeps them out until you unfreeze them.
                </div>
                {reports.map((r) => (
                  <div key={r.key} data-report={r.key} style={{
                    marginBottom: 6, background: COL.raised, borderRadius: 8, padding: '8px 9px',
                    border: '1px solid ' + COL.border,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span data-report-name="1" style={{ flex: 1, minWidth: 0, font: '600 13px system-ui, sans-serif',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.targetName || r.target}
                      </span>
                      <span data-report-state="1" style={{ font: '600 11px system-ui, sans-serif',
                        color: r.frozen ? COL.danger : (r.onlineNow ? COL.accent : COL.muted) }}>
                        {r.frozen ? 'frozen' : (r.onlineNow ? 'online' : 'offline')}
                      </span>
                    </div>
                    <div data-report-why="1" style={{ fontSize: 12.5, lineHeight: 1.4, marginTop: 3, color: COL.text2 }}>
                      {(REPORT_WORDS[r.reason] || 'Other') + ' · reported by ' + (r.byName || r.by || '?')}
                      {r.at ? ' · ' + agoWords(r.at) : ''}
                    </div>
                    {Array.isArray(r.lines) && r.lines.length > 0 ? r.lines.slice(-3).map((l, i) => (
                      <div key={i} data-report-line="1" style={{ fontSize: 12, lineHeight: 1.4, marginTop: 2, color: COL.text, wordBreak: 'break-word' }}>
                        {'\u201C' + String((l && l.text) || '') + '\u201D'}
                        {l && l.lane && l.lane !== 'room' ? <span style={{ color: COL.muted }}>{' (' + l.lane + ')'}</span> : null}
                      </div>
                    )) : (
                      <div style={{ fontSize: 12, marginTop: 2, color: COL.muted }}>Nothing they said in the 15 minutes before.</div>
                    )}
                    <div style={{ fontSize: 11, marginTop: 2, color: COL.muted, wordBreak: 'break-all', userSelect: 'all' }}>
                      {r.target}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <button type="button" data-report-act="kick" style={{ ...chip, minHeight: 34, flex: 'none' }}
                        disabled={busy} onClick={() => reportAct(r, 'kick')}>Kick</button>
                      {r.frozen ? (
                        <button type="button" data-report-act="unfreeze" style={{ ...chip, minHeight: 34, flex: 'none' }}
                          disabled={busy} onClick={() => reportAct(r, 'unfreeze')}>Unfreeze</button>
                      ) : (
                        <button type="button" data-report-act="freeze" style={{ ...chip, minHeight: 34, flex: 'none',
                          borderColor: COL.danger, color: COL.danger }}
                          disabled={busy} onClick={() => reportAct(r, 'freeze')}>
                          {sure === 'freeze:' + r.key ? 'Sure? Freeze' : 'Freeze'}
                        </button>
                      )}
                      <button type="button" data-report-act="dismiss" style={{ ...chip, minHeight: 34, flex: 'none' }}
                        disabled={busy} onClick={() => reportAct(r, 'dismiss')}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            <button type="button" style={{ ...btn(false), borderColor: COL.danger, color: COL.danger }} onClick={forgetKey}>
              Forget key on this device
            </button>
          </>
        )}

        {msg && <div style={{ marginTop: 10, color: COL.text2, fontSize: 13 }}>{msg}</div>}
        {busy && <div style={{ marginTop: 6, color: COL.muted, fontSize: 12 }}>Working…</div>}
      </div>
    </div>
  );
};
