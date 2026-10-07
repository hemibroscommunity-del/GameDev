/* ═══ v2.3.3140: THE DAILY REWARDS, ON THE GAME'S SIDE ═══
 *
 * Owner, 2026-10-06: a layered daily system -- "a small reward just for
 * logging in, daily quests that get people playing, and both feeding a
 * longer progression track like a battle pass" -- then: "Personally I find
 * the login page with the chest intrusive.  I'd rather have it be something
 * like a free daily spin from the gambling building where you can win quite
 * good rewards but it's rare.  Like a layered reward spin system where the
 * first win has a 50% chance and it continues further spins at a 50% win
 * chance and the rewards double each time."
 *
 * The worker decides everything (server/src/dailyrewards.js): it rolls the
 * spin, counts the quests, pays the season.  This module only HOLDS what it
 * last said (`rewards_state`, and `daily_progress` between two of those),
 * turns its `news` into a toast and a sound, and sends the four asks.  It
 * never pays or predicts anything -- coins move on the player_state echo
 * (handoff rule 20).
 *
 * Read by: the Gambling Den's spin (panels/buildings/DailySpin.jsx), the
 * Daily Rewards window (mobile/DailyRewardsWindow.jsx), the Quests tab's card
 * and the Quests button's dot (BottomDashboard.jsx).  Fed by wsClient.js. */
import { storeToastBus } from '@/ui/mobile/storeToastBus.js';
import { BT_AUDIO } from '@/data/index.js';
import { ZONES } from '@/data/zones.js';

let _state = null;
let _lastSpin = null;   /* { news, at }: the last answer to a spin act, kept apart from `news` */
let _win = { open: false, tab: 'today', seq: 0 };
const _listeners = new Set();
const emit = () => { for (const fn of _listeners) { try { fn(); } catch (e) { /* one dead listener must not starve the rest */ } } };

export const dailyRewardsBus = {
  /** The worker's last word, or null before the first. */
  get() { return _state; },
  /** The last answer to a spin act ({news, at}), which a later state's news
      cannot replace before the wheel reads it. */
  lastSpin() { return _lastSpin; },
  /** The window: { open, tab, seq }. */
  win() { return _win; },
  openWindow(tab) { _win = { open: true, tab: tab || _win.tab || 'today', seq: _win.seq + 1 }; emit(); },
  closeWindow() { _win = { ..._win, open: false }; emit(); },
  setTab(tab) { _win = { ..._win, tab }; emit(); },
  subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); },
};

/** The game's state object (the same reach the dashboard panels use). */
function gameState() {
  try { return (typeof window !== 'undefined' && window._gameState && window._gameState.current) || null; } catch (e) { return null; }
}

/* ── the caps (deploy order, rule 19) ── */

/** The Gambling Den's free spin: only against a worker that settles it. */
export function spinLive(S) {
  const s = S || gameState();
  return !!(s && s._serverCaps && s._serverCaps.dailyspin);
}
/** The daily quests and the season: likewise. */
export function questsLive(S) {
  const s = S || gameState();
  return !!(s && s._serverCaps && s._serverCaps.dailyquests);
}

/* ── the asks ── */

function send(type, payload) {
  const S = gameState();
  if (!S || !S.channel) return false;
  try { S.channel.send({ type, payload: payload || {} }); return true; } catch (e) { return false; }
}
let _spinSeq = 0;
/** One act on the daily spin: 'spin' (a new lump sum), 'double' (double or
    nothing on the pot) or 'collect' (take the pot). */
export function askSpin(act) {
  const S = gameState();
  return send('daily_spin', {
    act: act === 'double' || act === 'collect' ? act : 'spin',
    opId: 'spin:' + ((S && S.myId) || 'me') + ':' + Date.now() + ':' + (++_spinSeq),
  });
}
export function askReroll(i) { return send('daily_reroll', { i }); }
export function askClaim(tier) { return send('season_claim', tier === 'all' ? { all: true } : { tier }); }
export function askRewards() { return send('rewards_get', {}); }

/* ── what the words say ── */

const LAND_NAMES = Object.freeze({
  frost: 'Frost Ridge', ember: 'Flame Fields', sky: 'Wind Dunes', hollows: 'Stone Hollows',
  thunder: 'Electric Foundry', tidal: 'Water Caves', mist: 'Poison Forest', verdant: 'Verdant Wilds',
});
export function landName(id) {
  if (typeof id !== 'string') return '';
  if (Object.prototype.hasOwnProperty.call(LAND_NAMES, id)) return LAND_NAMES[id];
  const z = ZONES && Object.prototype.hasOwnProperty.call(ZONES, id) ? ZONES[id] : null;
  return (z && z.name) || id;
}

const QUEST_WORDS = Object.freeze({
  kill: (q) => 'Defeat ' + q.g + ' monsters',
  kill_land: (q) => 'Defeat ' + q.g + ' in ' + landName(q.p),
  mine: (q) => 'Mine ' + q.g + ' ore',
  chop: (q) => 'Chop ' + q.g + ' logs',
  fish: (q) => 'Catch ' + q.g + ' fish',
  cook: (q) => 'Cook ' + q.g + ' fish',
  smelt: (q) => 'Smelt ' + q.g + ' bars',
});
/** "Defeat 15 monsters" -- a quest the game does not know reads plainly. */
export function questLabel(q) {
  if (!q) return '';
  const f = Object.prototype.hasOwnProperty.call(QUEST_WORDS, q.t) ? QUEST_WORDS[q.t] : null;
  return f ? f(q) : 'Daily quest';
}
/* The land quests wear their land's element (wheelLands.js icons). */
const LAND_ICON = Object.freeze({
  frost: '/icons/ui/elem-frost.webp', ember: '/icons/ui/elem-flame.webp', sky: '/icons/ui/elem-wind.webp',
  hollows: '/icons/ui/elem-stone.webp', thunder: '/icons/ui/elem-storm.webp', tidal: '/icons/ui/elem-water.webp',
  mist: '/icons/ui/elem-venom.webp', verdant: '/icons/ui/elem-flora.webp',
});
const QUEST_ICON = Object.freeze({
  kill: '/icons/ui/combat-melee.webp',   /* the Melee icon: the copper sword read as a stick at 26 px */
  mine: '/icons/ui/skill-mining.webp',
  chop: '/icons/ui/skill-woodcutting.webp',
  fish: '/icons/ui/skill-fishing.webp',
  cook: '/icons/ui/skill-cooking.webp',
  smelt: '/icons/ui/skill-blacksmithing.webp',
});
export function questIcon(q) {
  if (!q) return null;
  if (q.t === 'kill_land') return (q.p && LAND_ICON[q.p]) || QUEST_ICON.kill;
  return Object.prototype.hasOwnProperty.call(QUEST_ICON, q.t) ? QUEST_ICON[q.t] : QUEST_ICON.kill;
}

const ITEM_WORDS = Object.freeze({
  rare_gem: ['Rare Gem', 'Rare Gems'],
  cooked_fish_minnow: ['Cooked Minnow', 'Cooked Minnows'],
  bar_iron: ['Iron Bar', 'Iron Bars'],
});
/** One grant in words: "150 coins", "2 Rare Gems", "a bonus spin", "a streak freeze". */
export function grantLabel(g) {
  if (!g) return '';
  const n = Math.max(1, Math.floor(Number(g.n) || 1));
  if (g.kind === 'coins') return n.toLocaleString('en-US') + ' coins';
  if (g.kind === 'spin') return n === 1 ? 'a bonus spin' : n + ' bonus spins';
  if (g.kind === 'freeze') return n === 1 ? 'a streak freeze' : n + ' streak freezes';
  if (g.kind === 'item') {
    const w = Object.prototype.hasOwnProperty.call(ITEM_WORDS, g.key) ? ITEM_WORDS[g.key] : null;
    const name = w ? (n === 1 ? w[0] : w[1]) : String(g.key || 'item').replace(/_/g, ' ');
    return (n === 1 ? 'a ' : n + ' ') + name;
  }
  return '';
}
export function grantsLabel(list) {
  return (Array.isArray(list) ? list : []).map(grantLabel).filter(Boolean).join(' + ');
}

/** Coins as the panels write them: 12,800 / 1.6k on a small chip. */
export function coinsShort(n) {
  const v = Math.floor(Number(n) || 0);
  if (v >= 10000) return (v / 1000).toFixed(v % 1000 ? 1 : 0).replace(/\.0$/, '') + 'k';
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(v);
}

/** "7h 12m" / "12m" / "under a minute" until `atMs` on the worker's clock. */
export function untilText(atMs, st) {
  const S = st || _state;
  const skew = S && S._skew ? S._skew : 0;
  const ms = Math.max(0, (Number(atMs) || 0) - (Date.now() + skew));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return Math.floor(h / 24) + ' days';
  if (h > 0) return h + 'h ' + m + 'm';
  if (m > 0) return m + 'm';
  return 'under a minute';
}

/* ── the season, read ── */

export function tierNeed(state, t) { return t * ((state && state.season && state.season.per) || 3); }
/** Tiers reached and not yet claimed. */
export function claimableTiers(state) {
  const s = state || _state;
  if (!s || !s.season || !Array.isArray(s.season.tiers)) return [];
  const out = [];
  for (let t = 1; t <= s.season.tiers.length; t++) {
    if (s.season.st >= tierNeed(s, t) && !(s.season.cl || []).includes(t)) out.push(t);
  }
  return out;
}
/** The tier the stars are working towards (or null past the last). */
export function nextTier(state) {
  const s = state || _state;
  if (!s || !s.season) return null;
  const n = (s.season.tiers || []).length;
  for (let t = 1; t <= n; t++) if (s.season.st < tierNeed(s, t)) return t;
  return null;
}
/** Something worth a dot on the Quests button: a season tier to claim. */
export function rewardsWaiting(S) {
  if (!questsLive(S)) return 0;
  return claimableTiers(_state).length;
}

/* ── fed by wsClient ── */

/* The worker paid this DURING the join, while the loading screen is still
   up -- a toast pushed now would time out behind it.  So it waits for the
   intro to lift and no veil to be covering the game (the v2.3.2820 daily
   toast's rule), and gives up quietly after 90 s. */
function toastWhenSeen(text) {
  if (!text) return;
  const t0 = Date.now();
  const tryNow = () => {
    const S = gameState();
    if (S && S.__introLiftedAt && !S._zoneLoading && !S._netHold) { storeToastBus.push(text); return; }
    if (Date.now() - t0 < 90000) setTimeout(tryNow, 400);
  };
  tryNow();
}

function play(key, opts) { try { BT_AUDIO.play(key, opts); } catch (e) { /* a sound never breaks a reward */ } }

/** The worker's word, and what it says happened. */
export function applyRewardsState(S, payload) {
  if (!payload || typeof payload !== 'object') return;
  const prev = _state;
  _state = { ...payload, _at: Date.now(), _skew: (Number(payload.now) || Date.now()) - Date.now() };
  if (S) S._dailyRewards = _state;
  try { if (typeof window !== 'undefined' && window.__btProbe) (window.__btRewardsLog || (window.__btRewardsLog = [])).push({ at: Date.now(), news: payload.news || null }); } catch (e) { /* probe only */ }
  const n = payload.news;
  if (n && typeof n === 'object' && n.kind === 'spin') _lastSpin = { news: n, at: _state._at };
  /* a pot left open was paid at the day's end (the worker's rollover): the
     coins moved on the echo, and this says why */
  if (Number(payload.kept) > 0) toastWhenSeen('Your daily spin\'s pot was kept for you: +' + Math.floor(payload.kept).toLocaleString('en-US') + ' coins.');
  if (n && typeof n === 'object') {
    if (n.kind === 'daily') {
      const q = prev && prev.dq && prev.dq.list ? prev.dq.list[n.i] : null;
      const label = questLabel(q || { t: n.t, p: n.p, g: (payload.dq && payload.dq.list && payload.dq.list[n.i] && payload.dq.list[n.i].g) || 0 });
      toastWhenSeen('Daily quest done: ' + label + ' · +' + n.coins + ' coins · +' + n.stars + ' ★');
      play('quest-complete-v2', { vol: 0.55 });
      if (n.all) setTimeout(() => {
        toastWhenSeen('All three done! +' + n.all.stars + ' ★ and ' + (n.all.spins === 1 ? 'a bonus spin' : n.all.spins + ' bonus spins') + ' at the Gambling Den');
      }, 700);
    } else if (n.kind === 'season_end') {
      const m = Array.isArray(n.mailed) ? n.mailed.length : 0;
      toastWhenSeen('Season ' + n.s + ' is over' + (m ? ' — the ' + m + ' reward' + (m === 1 ? '' : 's') + ' you hadn\'t claimed came to you' : '') + '. A new season starts now.');
    } else if (n.kind === 'claim') {
      /* the window is open and redraws the row as claimed; a toast would sit
         under its scrim, so the moment is a sound */
      play('coin-pickup', { vol: 0.55 });
      if (Array.isArray(n.grants) && n.grants.some((g) => g && g.kind === 'spin')) setTimeout(() => play('flip-win', { vol: 0.35 }), 140);
    } else if (n.kind === 'unlocked') {
      toastWhenSeen('Daily quests are open! Find them in Quests.');
    } else if (n.kind === 'newday') {
      toastWhenSeen('A new day: three new daily quests, and your free spin is waiting at the Gambling Den.');
    }
  }
  emit();
}

/** One quest's count went up (between two full states). */
export function applyDailyProgress(S, payload) {
  if (!_state || !payload || !_state.dq || !Array.isArray(_state.dq.list)) return;
  const i = payload.i;
  if (typeof i !== 'number' || !_state.dq.list[i]) return;
  const list = _state.dq.list.slice();
  list[i] = { ...list[i], n: Math.max(0, Math.floor(Number(payload.n) || 0)) };
  _state = { ..._state, dq: { ..._state.dq, list } };
  if (S) S._dailyRewards = _state;
  emit();
}

/* QA / console handle, the __btInfoPopup shape. */
try {
  if (typeof window !== 'undefined') {
    window.__btDailyRewards = {
      state: () => _state,
      open: (tab) => dailyRewardsBus.openWindow(tab),
      close: () => dailyRewardsBus.closeWindow(),
      claimable: () => claimableTiers(_state),
    };
  }
} catch (e) { /* probe only */ }
