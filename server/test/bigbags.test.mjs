/* v2.3.4224: the bag limits (weapons 140, each gear list 48; kill switch
 * disable_bigbags) and the measured size of a full record against the
 * 128 KiB Durable Object value limit. */
import { GEAR_STASH_CAP, GEAR_STASH_CAP_LEGACY, WEAPON_STASH_CAP_NEW, WEAPON_STASH_CAP_LEGACY, gearStashCap, setGearStashCap, GEAR_STASH_FIELDS } from '../src/gearstash.js';
import { liveopsMethods } from '../src/liveops.js';
let failures = 0;
function check(n, c, d) { if (!c) { failures++; console.log('FAIL', n, d === undefined ? '' : JSON.stringify(d)); } else console.log('ok  ', n); }

check('defaults are 140 weapons / 48 gear', WEAPON_STASH_CAP_NEW === 140 && GEAR_STASH_CAP === 48 && gearStashCap() === 48);
const room = { _liveFlags: {}, ...liveopsMethods };
room._syncBagCaps();
check('flags off: new numbers', room.WEAPON_STASH_CAP === 140 && gearStashCap() === 48);
room._liveFlags.disable_bigbags = true; room._syncBagCaps();
check('disable_bigbags: 8 / 32 back', room.WEAPON_STASH_CAP === WEAPON_STASH_CAP_LEGACY && gearStashCap() === GEAR_STASH_CAP_LEGACY, { w: room.WEAPON_STASH_CAP, g: gearStashCap() });
delete room._liveFlags.disable_bigbags; room._syncBagCaps();
check('flag cleared: new numbers again', room.WEAPON_STASH_CAP === 140 && gearStashCap() === 48);
setGearStashCap(NaN);
check('a bad number falls back to the default', gearStashCap() === 48);

/* the size: worst-case pieces (every optional field, longest names) */
const piece = { name: 'Worldbreaker Greaves of the Deep', gearBase: 'ww_copper', tierMult: 7.84, tier: 't7', def: 48, slot: 'legs', mat: 'copper', quality: 'masterwork', hardness: 5, temper: 9999, unrevealed: 1, id: 'g_1730000000000_ab12' };
const weapon = { name: 'Worldbreaker Flame Greatsword', type: 'greatsword', gearBase: 'ww_iron', tierMult: 7.84, quality: 'masterwork', hardness: 5, temper: 9999, element1: 'fire', element2: 'ice', isVolatile: true, unrevealed: 1, id: 'w_1730000000000_ab12', gems: ['fire', 'ice'] };
const rec = { weaponStash: Array(140).fill(weapon) };
for (const f of GEAR_STASH_FIELDS) rec[f] = Array(48).fill(piece);
const bytes = JSON.stringify(rec).length;
console.log('full record, worst case:', (bytes / 1024).toFixed(1), 'KiB');
check('a full record leaves >= 30 KiB of the 128 KiB value for the rest', bytes <= 98 * 1024, bytes);
process.exit(failures === 0 ? 0 : 1);
