/* ═══ MULTIPLAYER SERVER — Cloudflare Durable Objects ═══ */

/* Server URLs */
const WS_BASE = window.BROTOWN_WS_URL || 'wss://brotown-server.hemibroscommunity.workers.dev';
export const BT_API_BASE = WS_BASE.replace('wss://', 'https://').replace('ws://', 'http://');

/* Legacy Supabase compat */
export const SUPA_URL = '';
export const SUPA_KEY = '';

/* ═══ RPC HELPER ═══ */
const _btRpcQueue = {};

export async function btRpc(fnName, params) {
  const key = fnName + JSON.stringify(params);
  if (_btRpcQueue[key]) return _btRpcQueue[key];

  const promise = (async () => {
    try {
      const r = await fetch(SUPA_URL + '/rest/v1/rpc/' + fnName, {
        method: 'POST',
        headers: {
          'apikey': SUPA_KEY,
          'Authorization': 'Bearer ' + SUPA_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    } finally {
      delete _btRpcQueue[key];
    }
  })();

  _btRpcQueue[key] = promise;
  return promise;
}

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
