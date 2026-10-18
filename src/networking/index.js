/* ═══ MULTIPLAYER SERVER — Cloudflare Durable Objects ═══ */

/* Server URLs.
   v2.3.2446: THE SERVER ON THE GAME'S OWN DOMAIN.  The worker has always
   been reached at brotown-server.hemibroscommunity.workers.dev while the
   page is served from brotown.net -- and workers.dev sits on enough DNS
   block lists (it is abused for phishing) that the owner's own network
   blocked it on 2026-09-10: the page loaded, then every call to the server
   hung ("No answer from the server after 12s", "Still connecting") while a
   GitHub runner joined the same room in 224ms.  v2.3.2443 gave the worker a
   custom domain on the game's zone; this points the client at it.  It is
   reachable exactly when the page is (same zone, same resolver), which the
   old address was not.  window.BROTOWN_WS_URL still overrides everything
   (the QA harness points it at localhost).  Every other default in the
   client (wsClient.js, BroTown.jsx, crashTrap.js) is the same string; keep
   them in step. */
const WS_BASE = window.BROTOWN_WS_URL || 'wss://api.brotown.net';
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

/* ═══ v2.3.3355: NEW LOGIN KEYS, MADE BY THE WORKER ═══
   (server/src/loginkeys.js, docs/specs/login-keys.md.)  A new key is eight
   short words the worker hands this phone (wsClient.js `key_new`), or one
   typed at the door.  Its player id is NOT made from it -- nothing public is
   -- so the phone KEEPS the id it is told beside the key: `bt_key_ids`, and
   the roster's rows.  `idForKey` is the one way from a key to its id; an old
   key's id is still passphraseToId's, exactly as before. */
export const NEW_KEY_RE = /^[a-z]{3,5}(?:-[a-z]{3,5}){7}$/;   /* server/src/keywords.js NEW_KEY_RE */

/** A key as typed in its one spelling, for the new shape: lower case, every
 *  run of spaces, dashes or underscores one dash (keywords.js normalizeKeyText). */
export function normalizeNewKey(input) {
  if (!input) return '';
  return String(input).trim().toLowerCase().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Is this a new key (eight words), as stored? */
export function isNewKey(phrase) {
  return typeof phrase === 'string' && NEW_KEY_RE.test(phrase);
}

const KEY_IDS = 'bt_key_ids';
const KEY_IDS_MAX = 24;
function _keyIdList() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY_IDS) || 'null');
    return o && Array.isArray(o.list) ? o.list.filter((r) => Array.isArray(r) && isNewKey(r[0]) && typeof r[1] === 'string') : [];
  } catch (e) { return []; }
}

/** Keep the id a new key belongs to (the worker said so). */
export function rememberKeyId(phrase, id) {
  if (!isNewKey(phrase) || typeof id !== 'string' || id.indexOf('bp_') !== 0) return;
  try {
    const list = _keyIdList().filter((r) => r[0] !== phrase);
    list.unshift([phrase, id]);
    localStorage.setItem(KEY_IDS, JSON.stringify({ v: 1, list: list.slice(0, KEY_IDS_MAX) }));
  } catch (e) { /* storage full or off: the roster's row still has it */ }
}

/** A key's player id: an old key's worked out as ever, a new key's as kept
 *  (bt_key_ids, then the roster's row) -- null when a new key's is not known. */
export function idForKey(phrase) {
  if (!phrase || typeof phrase !== 'string') return null;
  if (!isNewKey(phrase)) return passphraseToId(phrase);
  const hit = _keyIdList().find((r) => r[0] === phrase);
  if (hit) return hit[1];
  try {
    const o = JSON.parse(localStorage.getItem('bt_chars') || 'null');
    const row = o && Array.isArray(o.list) ? o.list.find((e) => e && e.phrase === phrase && typeof e.id === 'string' && e.id.indexOf('bp_') === 0) : null;
    if (row) return row.id;
  } catch (e) { /* no roster */ }
  return null;
}

/** Make `phrase` the device's key, keeping a new key's id beside it. */
export function setActiveKey(phrase, id) {
  try { localStorage.setItem('bt_passphrase', phrase); } catch (e) { /* private mode */ }
  if (isNewKey(phrase) && id) rememberKeyId(phrase, id);
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
  /* v2.3.3355: a new key's id is kept, not worked out */
  return idForKey(phrase) || passphraseToId(phrase);
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
    /* ═══ v2.3.1921: A REQUEST THAT NEVER ANSWERS MUST STILL END ═══
       Owner: "it just keeps saying checking for character on login menu."

       This is the boot check, and BroTown.jsx holds bootPhase at 'checking'
       until the promise settles.  It handles a REJECTION fine — the catch
       below returns 'unavailable' and the door appears — but a bare fetch
       does not reject when the far end accepts the connection and then says
       nothing, which is exactly what a worker does mid-deploy or a phone
       does on a stalled cell handoff.  Nothing settles, the catch never
       runs, and the player is left on "Checking for your character…" with
       no way forward but a manual reload.  A dead screen, from a blip.

       8 seconds: long enough for a cold worker start on a slow phone (the
       lobby fetch next door uses 3, but that one has a fallback room to
       fall back TO, and this one decides whether you see your character),
       short enough that nobody sits looking at a lie.  On timeout the abort
       lands in the same catch as any other failure, so the caller's
       existing 'unavailable' road — the login door, with Continue and
       Create both live — is the road out. */
    const res = await fetch(BT_API_BASE + '/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* v2.3.3344: and this device, so the answer can say whether it could
         play the character (server/src/devicelock.js) */
      body: JSON.stringify({ phrase, device: getDeviceNonce().id }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    if (!json || json.settled !== true) return { ok: false, reason: 'unavailable' };
    return json;
  } catch (e) {
    return { ok: false, reason: 'unavailable' };
  }
}

/* ═══ v2.3.2194: RESTART A CHARACTER FROM THE PICKER ═══
 * Owner: an options menu on each bro, "choose to delete or restart the
 * character to lvl 1".
 *
 * The in-game restart (character_reset, v2.3.1347) travels over a live socket
 * and so can only reach the bro you are already playing.  This is the same
 * wipe over the same authenticated road the boot check uses -- the worker
 * verifies the phrase before touching anything, so the key IS the permission.
 *
 * IRREVERSIBLE FOR THE PLAYER, which is why the caller makes them type the
 * word.  Recoverable for the OWNER: the worker parachutes the old blob to
 * rpgsnap:<id>:prereset-<ts> first, reachable through admin /restore.
 *
 * Same 8s abort and same settled:true gate as checkAccountLogin, for the same
 * reason spelled out there: an old worker answers unknown paths with a 200 and
 * plain text, so a status check proves nothing and a hung socket never
 * rejects.  A worker without this endpoint reports 'unavailable' and the UI
 * says the restart did not happen -- rather than claiming a wipe that never
 * reached anyone. */
export async function resetAccountCharacter(phrase) {
  try {
    const res = await fetch(BT_API_BASE + '/api/account/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* v2.3.3344: from a device this character is played on only */
      body: JSON.stringify({ phrase, confirm: true, device: getDeviceNonce().id }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    if (!json || json.settled !== true) return { ok: false, reason: 'unavailable' };
    return json;
  } catch (e) {
    return { ok: false, reason: 'unavailable' };
  }
}

export function applyAccountLogin(phrase, id) {
  /* Only after checkAccountLogin returned exists:true + user confirm. */
  try {
    const prev = localStorage.getItem('bt_passphrase');
    if (prev && prev !== phrase) localStorage.setItem('bt_passphrase_prev', prev);
    /* v2.3.3355: a new key with the id the door said it belongs to */
    setActiveKey(phrase, id);
    /* Stale per-character caches; bt_device stays (per-device nonce). */
    localStorage.removeItem('bt_rpg');
    localStorage.removeItem('bt_stats');
  } catch (e) {}
  /* ═══ v2.3.1869: LAND IN THE GAME, NOT BACK ON THE DOOR ═══
     reload() keeps the query string, and the login door is most often reached
     BY LOGGING OUT — which navigates to `/?noresume=1&login=1` (v2.3.1840).
     So typing a valid Login Key at that door wrote the key correctly and then
     reloaded onto `login=1`, which routes straight back to the door: the key
     worked and the routing threw it away.  That is the same "it does nothing
     after you enter it" the owner reported in v2.3.1823, arriving through a
     different road.  Measured in mp-contblack: key written, route back to
     'login-forced', URL unchanged.
     Navigating to a clean path is the fix, and it does not weaken either
     flag — both describe what a fresh, deliberate navigation should do, and
     this is the end of one, not the start of another.  ?guest=1 is carried
     because it identifies WHICH browser identity this tab is. */
  /* v2.3.2447: typing a key IS the tap.  The landing page no longer walks a
     stored key in by itself (BroTown's boot check), so this reload marks
     itself as an explicit continuation or the player would type their key
     and land back on the door. */
  try { sessionStorage.setItem('bt_play_now', '1'); } catch (e) {}
  try {
    var _g = /[?&]guest=1\b/.test(window.location.search) ? '?guest=1' : '';
    window.location.replace(window.location.pathname + _g);
  } catch (e) { window.location.reload(); }
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
      agility: rpg.agility, mind: rpg.mind,
      /* v2.3.1155: the five retired T2 stats are off the wire. */
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
    /* v2.3.3355: a new token's random part from crypto when there is one --
       since v2.3.3344 the token is what a character's key is held to
       (server/src/devicelock.js), so it should be as hard to guess as a key */
    let r = '';
    try {
      const b = new Uint32Array(2);
      crypto.getRandomValues(b);
      r = b[0].toString(36) + b[1].toString(36);
    } catch (e) { r = Math.random().toString(36).slice(2, 10); }
    id = (Date.now().toString(36) + r).slice(0, 32);
    try { localStorage.setItem('bt_device', id); } catch (e) {}
  }
  return { id: id, env: _envHash() };
}

/* ═══ Image proxy for CORS-safe NFT loading ═══ */
export function wsrvUrl(url, size) {
  if (!url) return '';
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=png`;
}

/* v2.3.1182: createWebSocket factory removed -- zero importers, and it was
   stale (no lobby resolution, no encodeURIComponent, default room 'brotown'
   vs production 'brotown-1').  wsClient.js owns the live connection path. */
export { WS_BASE };
