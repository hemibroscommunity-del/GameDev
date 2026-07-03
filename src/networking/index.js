/* ═══ MULTIPLAYER SERVER — Cloudflare Durable Objects ═══ */

/* Server URLs */
const WS_BASE = window.BROTOWN_WS_URL || 'wss://brotown-server.hemibroscommunity.workers.dev';
export const BT_API_BASE = WS_BASE.replace('wss://', 'https://').replace('ws://', 'http://');

/* Legacy Supabase compat (Supabase removed; Durable Objects is the backend).
   btRpc is kept as a no-op because BroTown.jsx still calls it on legacy paths
   (bt_load_player / bt_register_player / bt_update_stats / bt_monster_kill /
   bt_sync_rpg) -- every caller already handles the null return.  The call
   sites go away with the BroTown decomposition. */
export const SUPA_URL = '';
export const SUPA_KEY = '';
export async function btRpc(fnName, params) { return null; }

/* ═══ PASSPHRASE IDENTITY SYSTEM ═══ */
const BT_WORDS = [
  'alpha','blaze','coral','drift','ember','frost','grove','haven','ivory','jade',
  'karma','lunar','mango','nexus','onyx','pixel','quartz','raven','solar','thunder',
  'ultra','viper','wrath','xenon','yeti','zenith','amber','bolt','cipher','dusk',
  'echo','flare','ghost','haze','iron','jet','knack','lava','mystic','nova',
  'orbit','prism','quest','ridge','storm','titan','umbra','vault','wisp','zeal',
];

export function generatePassphrase() {
  const w = [];
  for (let i = 0; i < 4; i++) w.push(BT_WORDS[Math.floor(Math.random() * BT_WORDS.length)]);
  return w.join('-') + '-' + Math.floor(Math.random() * 99);
}

export function passphraseToId(phrase) {
  let hash = 0;
  for (let i = 0; i < phrase.length; i++) {
    hash = ((hash << 5) - hash + phrase.charCodeAt(i)) | 0;
  }
  return 'bp_' + Math.abs(hash).toString(36) + '_' + phrase.split('-').slice(0, 2).join('');
}

export function getBtPlayerId() {
  const phrase = localStorage.getItem('bt_passphrase');
  if (!phrase) return null;
  return passphraseToId(phrase);
}

export function getBtPassphrase() {
  return localStorage.getItem('bt_passphrase');
}

/* ═══ v2.3.1143: ACCOUNT LOGIN ("Login Key") ═══
   The passphrase IS the account credential (see docs/specs/identity.md
   and docs/specs/account-login.md).  These helpers power the transfer
   UI: show your key on the old device, type it on the new one.  The
   typed key MUST be validated by the server BEFORE it is written to
   localStorage -- a wrong key would trip the join_rejected auto-regen
   (destroying this device's current key), and an unregistered typo
   would first-join-lock a brand-new character.  applyAccountLogin is
   therefore only ever called after checkAccountLogin confirmed
   exists:true and the player tapped Continue. */

export function normalizeLoginKey(input) {
  /* Keys are typed/pasted by hand ("Blaze Frost Nova Titan 42") but
     passphraseToId is char-exact: lowercase and collapse whitespace/
     underscore runs to the canonical '-' before checking OR storing. */
  if (!input) return '';
  return String(input).trim().toLowerCase().replace(/[\s_]+/g, '-');
}

export async function checkAccountLogin(phrase) {
  /* Deploy-order safety: an old worker answers unknown paths with
     HTTP 200 text/plain, so a status check proves nothing.  Require
     parseable JSON with settled:true before trusting the answer; on
     anything else report 'unavailable' and the UI refuses to switch. */
  try {
    const res = await fetch(BT_API_BASE + '/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase }),
    });
    const json = await res.json();
    if (!json || json.settled !== true) return { ok: false, reason: 'unavailable' };
    return json;
  } catch (e) {
    return { ok: false, reason: 'unavailable' };
  }
}

export function applyAccountLogin(phrase) {
  /* Only after checkAccountLogin returned exists:true + user confirm. */
  try {
    const prev = localStorage.getItem('bt_passphrase');
    if (prev && prev !== phrase) localStorage.setItem('bt_passphrase_prev', prev);
    localStorage.setItem('bt_passphrase', phrase);
    /* Stale per-character caches; bt_device stays (per-device nonce). */
    localStorage.removeItem('bt_rpg');
    localStorage.removeItem('bt_stats');
  } catch (e) {}
  window.location.reload();
}

/* ═══ RPG SERVER SYNC ═══ */
export function syncRpgToServer(rpg) {
  const pid = getBtPlayerId();
  if (!pid || !rpg) return;
  const payload = {
    p_id: pid,
    p_level: rpg.level || 1,
    p_coins: rpg.coins || 0,
    p_xp: rpg.xp || 0,
    p_hp: rpg.hp || 50,
    p_state: JSON.stringify({
      level: rpg.level, xp: rpg.xp, coins: rpg.coins,
      hp: rpg.hp, maxHp: rpg.maxHp,
      stamina: rpg.stamina, maxStamina: rpg.maxStamina,
      mana: rpg.mana, maxMana: rpg.maxMana,
      power: rpg.power, vitality: rpg.vitality, endurance: rpg.endurance,
      agility: rpg.agility, mind: rpg.mind, ferocity: rpg.ferocity,
      elementalMastery: rpg.elementalMastery, fortification: rpg.fortification,
      restoration: rpg.restoration, influence: rpg.influence,
      unspentT1: rpg.unspentT1, unspentT2: rpg.unspentT2,
      weapon: rpg.weapon, rangedWeapon: rpg.rangedWeapon,
      activeSlot: rpg.activeSlot, armor: rpg.armor,
      weaponStash: rpg.weaponStash || [],
      amulet: rpg.amulet,
      goldNuggets: rpg.goldNuggets || 0, goldBars: rpg.goldBars || 0,
      shield: rpg.shield,
      _compStats: rpg._compStats,
      achievementPoints: rpg.achievementPoints || 0,
      inventory: rpg.inventory,
      lifeSkills: rpg.lifeSkills ? {
        woodcutting: rpg.lifeSkills.woodcutting,
        fishing: rpg.lifeSkills.fishing,
        mining: rpg.lifeSkills.mining,
        farming: rpg.lifeSkills.farming,
        cooking: rpg.lifeSkills.cooking,
        blacksmithing: rpg.lifeSkills.blacksmithing,
        woodworking: rpg.lifeSkills.woodworking,
        gemCutting: rpg.lifeSkills.gemCutting,
        enchanting: rpg.lifeSkills.enchanting,
        trapping: rpg.lifeSkills.trapping,
        resources: rpg.lifeSkills.resources,
        gems: rpg.lifeSkills.gems,
        farmPlots: rpg.lifeSkills.farmPlots,
        dungeonClears: rpg.lifeSkills.dungeonClears,
        pets: rpg.lifeSkills.pets,
        activePet: rpg.lifeSkills.activePet,
      } : null,
      _quests: rpg._quests,
      _questFlags: rpg._questFlags,
      _questKills: rpg._questKills,
    }),
  };
  btRpc('bt_sync_rpg', payload);
}

/* ═══ DEVICE NONCE (v2.3.694) ═══
   A stable per-browser id + a coarse environment hash, attached to `join` so
   the server can CORRELATE multiple passphrase accounts coming from one device
   (the passphrase identity is only ~28 bits and trivially regenerated by
   clearing localStorage).  This is correlation signal for the anomaly tracker,
   NOT a hard device lock — a determined user can still reset it, but casual
   multi-accounting and bot fleets that don't bother get flagged.  Privacy:
   the hash is coarse (UA + screen + a tiny canvas render), not a precise
   cross-site fingerprint, and never leaves our own server. */
function _fnv1a(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
function _envHash() {
  try {
    var parts = [navigator.userAgent || '', navigator.language || '',
      (screen.width + 'x' + screen.height + 'x' + (window.devicePixelRatio || 1)),
      (new Date().getTimezoneOffset())];
    /* tiny canvas render — GPU/font stack varies subtly per device */
    try {
      var c = document.createElement('canvas'); c.width = 40; c.height = 16;
      var cx = c.getContext('2d');
      cx.textBaseline = 'top'; cx.font = '12px sans-serif';
      cx.fillStyle = '#069'; cx.fillText('bt', 1, 1);
      parts.push(c.toDataURL().slice(-48));
    } catch (e) { /* canvas blocked — skip, the rest still hashes */ }
    return _fnv1a(parts.join('|'));
  } catch (e) { return '0'; }
}
export function getDeviceNonce() {
  var id = null;
  try { id = localStorage.getItem('bt_device'); } catch (e) {}
  if (!id) {
    id = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
    try { localStorage.setItem('bt_device', id); } catch (e) {}
  }
  return { id: id, env: _envHash() };
}

/* ═══ Image proxy for CORS-safe NFT loading ═══ */
export function wsrvUrl(url, size) {
  if (!url) return '';
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=png`;
}

/* ═══ WebSocket connection factory ═══ */
export function createWebSocket(room = 'brotown') {
  const url = WS_BASE + '/ws?room=' + room;
  return new WebSocket(url);
}

export { WS_BASE };
