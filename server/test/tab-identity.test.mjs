/* ═══ v2.3.4560: WHICH CHARACTER A TAB PLAYS (the sweep's V5) ═══
 * (src/game/tabIdentity.js) Two tabs of one browser share one Login Key slot.
 * Tab 1 plays A, tab 2 switches to B; tab 1's next join read the slot afresh,
 * became B (putting tab 2 out, A's spare armour folded into B) or, with an
 * older key, was refused 'auth' and made a brand-new level-1 A.
 *   1. old keys: tab 1 rejoins -> the takeover banner, never B, never a mint;
 *      its Play here joins as A and gives A the slot back;
 *   2. new keys: never re-targeted to B's id (only behind ?tabid=0);
 *   3. an old-shaped key with the slot gone: no creation;
 *   4. the same character's key moved on in another tab: taken, same id;
 *   5. a tab's own new key, its id learnt late: the id follows its own key;
 *   6. a new key for this tab: the slot only while it is this character's,
 *      the roster's row renamed from this tab's own key, never B's;
 *   7. the fallback to an old key: only this character's;
 *   8. the caches: B never reads A's (spare armour included);
 *   9. a guest sends no key;
 *  10. the client wires it (wsClient, index.js, charRoster, BroTown);
 *  11. the off-ramp ?tabid=0.
 * The identity helpers are the real ones (src/networking/index.js) on a
 * stand-in localStorage both "tabs" share; each tab's memory is its own.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* one localStorage for the browser: every tab reads and writes it */
const store = new Map();
globalThis.window = globalThis.window || {};
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
const net = await import('../../src/networking/index.js');
let T = null;
try { T = await import('../../src/game/tabIdentity.js'); } catch (e) { console.log('(no src/game/tabIdentity.js: ' + e.message.split('\n')[0] + ')'); }
const has = !!(T && T.joinIdentity);
const slot = () => localStorage.getItem('bt_passphrase');
const idOf = net.idForKey, isNew = net.isNewKey;
/* a page start, as BroTown's myId initialiser does it: the slot's key, its id */
const startTab = () => { const key = slot(); return { key, id: idOf(key) || net.passphraseToId(key), old: null }; };
const join = (tab, extra) => (has ? T.joinIdentity(Object.assign({}, tab, extra || {}), slot(), idOf, isNew) : null);
const reset = () => store.clear();

/* 1. old-shaped keys (characters made before v2.3.3355 keep one) */
{
  reset();
  const A = 'alpha-blaze-coral-drift-12', B = 'echo-flare-ghost-haze-7';
  localStorage.setItem('bt_passphrase', A);
  const tab1 = startTab();
  localStorage.setItem('bt_passphrase', B);   /* tab 2: the list's row B (activateChar) */
  const tab2 = startTab();
  const r1 = join(tab1);
  check('1a tab 1 reconnects after tab 2 switched: the takeover banner', r1 && r1.act === 'moved', r1);
  check('1b ...never as B', !r1 || (r1.id !== tab2.id && r1.key !== B), r1);
  check('1c a refused \'auth\' never makes a character', has && T.authRefusal(tab1) === 'key');
  const r2 = join(tab2);
  check('1d tab 2 joins as B, with B\'s key', r2 && r2.act === 'join' && r2.key === B && r2.id === tab2.id, r2);
  const r3 = join(tab1, { claim: true });
  check('1e Play here in tab 1: joins as A with A\'s key, and claims the slot', r3 && r3.act === 'join' && r3.key === A && r3.id === tab1.id && r3.claim === true, r3);
  if (r3 && r3.claim) net.setActiveKey(r3.key, r3.id);
  const r4 = join(tab2);
  check('1f ...and tab 2\'s next join is the banner (one character per browser)', r4 && r4.act === 'moved', r4);
  check('1g a tab on its own key joins as before', (() => { reset(); localStorage.setItem('bt_passphrase', A); const t = startTab(); const r = join(t); return r && r.act === 'join' && r.key === A && r.id === t.id && !r.claim && !r.adopt; })());
}

/* 2. new keys: the id is the worker's, kept beside the key */
{
  reset();
  const NA = 'amber-bolt-dusk-echo-flare-ghost-haze-iron', NB = 'jade-knack-lava-mango-nova-onyx-pixel-ridge';
  net.setActiveKey(NA, 'bp_srv_a');
  const tab1 = startTab();
  net.setActiveKey(NB, 'bp_srv_b');
  const tab2 = startTab();
  const r = join(tab1);
  check('2a new keys: tab 1 is not re-targeted to B\'s id', r && r.act === 'moved', r);
  check('2b ...tab 1 still knows its own id', tab1.id === 'bp_srv_a' && tab2.id === 'bp_srv_b', [tab1.id, tab2.id]);
  const off = join(tab1, { off: true });
  check('2c ?tabid=0 keeps the old road (the slot, re-targeted): the bug, for one phone only', off && off.act === 'join' && off.id === 'bp_srv_b' && off.key === NB, off);
}

/* 3. an old-shaped key with the slot gone (tab 2 forgot the active row) */
{
  reset();
  const A = 'grove-haven-ivory-jade-41';
  localStorage.setItem('bt_passphrase', A);
  const tab1 = startTab();
  localStorage.removeItem('bt_passphrase');
  const r = join(tab1);
  check('3a the slot gone: no join, no new key, the banner', r && r.act === 'moved' && slot() === null, r);
  check('3b ...and a refusal still never mints', has && T.authRefusal(tab1) !== 'mint');
  const c = join(tab1, { claim: true });
  check('3c Play here joins as A, with A\'s own key (never a fresh one)', c && c.act === 'join' && c.key === A && c.id === tab1.id, c);
}

/* 4. the same character, its key moved on in another tab (key_new there) */
{
  reset();
  const A = 'karma-lunar-mango-nexus-3';
  localStorage.setItem('bt_passphrase', A);
  const tab1 = startTab();
  const NA = 'quest-ridge-storm-titan-umbra-vault-wisp-zeal';
  net.setActiveKey(NA, tab1.id);   /* the worker handed tab 2 (also on A) a new key */
  const r = join(tab1);
  check('4a another tab of the same character took a new key: joined with it, same id', r && r.act === 'join' && r.key === NA && r.id === tab1.id && r.adopt === true, r);
}

/* 5. a tab's own new key whose id it learnt after it started */
{
  reset();
  const NX = 'alpha-coral-ember-frost-grove-ivory-lunar-orbit';
  localStorage.setItem('bt_passphrase', NX);
  const tab = startTab();   /* no id kept yet: worked out, nobody's */
  net.rememberKeyId(NX, 'bp_srv_x');   /* the door said whose it is */
  const r = join(tab);
  check('5a the id follows the tab\'s own new key (v2.3.3355 kept)', r && r.act === 'join' && r.key === NX && r.id === 'bp_srv_x', r);
}

/* 6. a new key handed to THIS tab's character */
{
  reset();
  const A = 'prism-quest-ridge-storm-8', B = 'titan-umbra-vault-wisp-9';
  localStorage.setItem('bt_passphrase', A);
  const tab1 = startTab();
  localStorage.setItem('bt_passphrase', B);
  const NA = 'amber-amber-amber-amber-bolt-bolt-bolt-bolt';
  const p = has ? T.keyNewPlan(tab1, B, NA, idOf, isNew) : null;
  check('6a the slot names B: tab 1\'s new key does not overwrite it', p && p.writeSlot === false, p);
  check('6b ...the roster\'s row renamed is A\'s, never B\'s', p && p.swapFrom === A, p);
  check('6c ...the tab plays the new key, its old one kept for the fallback', p && p.tabKey === NA && p.tabOld === A && p.keepOld === null, p);
  const q = has ? T.keyNewPlan(tab1, A, NA, idOf, isNew) : null;
  check('6d one tab, as before: the slot takes the new key, the old one kept beside', q && q.writeSlot === true && q.keepOld === A && q.swapFrom === A, q);
  const o = has ? T.keyNewPlan(Object.assign({}, tab1, { off: true }), B, NA, idOf, isNew) : null;
  check('6e ?tabid=0: as it was (the slot\'s row)', o && o.writeSlot === true && o.swapFrom === B, o);
}

/* 7. the fallback to an old key when a new one is refused */
{
  reset();
  const A = 'cipher-dusk-echo-flare-5', Bold = 'haze-iron-jet-knack-6';
  localStorage.setItem('bt_passphrase', A);
  const tab1 = startTab();
  check('7a this tab\'s own old key', has && T.fallbackKey(Object.assign({}, tab1, { old: A }), null, idOf) === A);
  check('7b the shared spare of ANOTHER character: never', has && T.fallbackKey(tab1, Bold, idOf) === null);
  check('7c the shared spare of this character', has && T.fallbackKey(tab1, A, idOf) === A);
}

/* 8. the per-character caches: B never reads A's */
{
  const idA = net.passphraseToId('alpha-blaze-coral-drift-12'), idB = net.passphraseToId('echo-flare-ghost-haze-7');
  const rpgA = has ? T.stampOwner({ power: 3, level: 9, armorStash: [{ name: 'Iron Plate', slot: 'chest' }] }, idA) : null;
  store.set('bt_rpg', JSON.stringify(rpgA));   /* tab 1 (A) saved last */
  const raw = JSON.parse(store.get('bt_rpg'));
  /* tab 2 (B) starts, as BroTown's initialiser and joinTown read the cache */
  const forB = has && T.ownedBy(raw, idB) ? raw : { power: 0, level: 1 };
  check('8a A\'s cache is not B\'s', has && T.ownedBy(raw, idB) === false);
  check('8b ...so B\'s join seeds none of A\'s spare armour', !(forB.armorStash && forB.armorStash.length), forB);
  check('8c A reads its own', has && T.ownedBy(raw, idA) === true);
  check('8d a cache written before v2.3.4560 (no stamp) is read as before', has && T.ownedBy({ power: 1 }, idB) === true);
  check('8e nothing is nobody\'s', has && T.ownedBy(null, idA) === false);
  check('8f a guest tab\'s save is never read as the player\'s', has && T.ownedBy(T.stampOwner({ power: 1 }, 'k2j3h4ab'), idA) === false);
  const snapA = has ? T.stampOwner({ t: Date.now(), name: 'Ann', traits: { hair: 3 } }, idA) : null;
  check('8g the resume snapshot: A\'s is not B\'s', has && T.ownedBy(snapA, idB) === false && T.ownedBy(snapA, idA) === true);
}

/* 9. a guest (?guest=1: a random id) sends no key, whatever the slot */
{
  reset();
  localStorage.setItem('bt_passphrase', 'onyx-pixel-quartz-raven-2');
  const r = join({ key: null, id: 'k2j3h4ab' });
  check('9a a guest joins with no key', r && r.act === 'join' && r.key === null && r.id === 'k2j3h4ab', r);
}

/* 9b. which list row a tab stamps */
{
  const inList = (k) => k === 'listed-key-here-1';
  check('9b the tab\'s own key, while it is the slot', has && T.rowKey({ key: 'a-b-c-d-1' }, 'a-b-c-d-1', inList) === 'a-b-c-d-1');
  check('9c the tab\'s own key, while its row is listed (another tab switched)', has && T.rowKey({ key: 'listed-key-here-1' }, 'other-key-x-y-2', inList) === 'listed-key-here-1');
  check('9d never the slot\'s row when the slot is another character\'s', has && T.rowKey({ key: 'a-b-c-d-1' }, 'other-key-x-y-2', inList) === null);
  check('9e ?tabid=0: the slot\'s, as before', has && T.rowKey({ key: 'a-b-c-d-1', off: true }, 'other-key-x-y-2', inList) === 'other-key-x-y-2');
}

/* 10. the client wires it */
{
  const ws = src('src/networking/wsClient.js');
  const ix = src('src/networking/index.js');
  const cr = src('src/networking/charRoster.js');
  const bt = src('src/ui/BroTown.jsx');
  check('10a the join asks joinIdentity for its key and id', /joinIdentity\(/.test(ws));
  check('10b the join\'s key is not read from the shared slot at send time',
    !/phrase:\s*\(function \(\) \{[\s\S]{0,300}?localStorage\.getItem\('bt_passphrase'\)/.test(ws));
  check('10c a slot moved under the tab: the takeover\'s own banner, before a line opens and at the open',
    /function _tabMoved\([\s\S]{0,900}?showResumeBanner\('This account connected from another window\.', 'Play here instead'\)/.test(ws)
    && (ws.match(/\.act === 'moved'\)\s*\{[^}]{0,80}_tabMoved\(/g) || []).length === 2);
  check('10c2 the banner\'s Play here is the player choosing this tab (the claim)', /function _comeBack\(\)[\s\S]{0,700}?if \(S\._tabMoved\) \{ S\._tabMoved = false; S\._tabClaim = true; \}/.test(ws));
  check('10d \'auth\' mints only on the old road (authRefusal)', /authRefusal\(/.test(ws)
    && /authRefusal\([^)]*\) === 'mint'[\s\S]{0,2000}?generatePassphrase\(\)/.test(ws));
  check('10e key_new follows keyNewPlan', /keyNewPlan\(/.test(ws));
  check('10f the fallback follows fallbackKey', /fallbackKey\(/.test(ws));
  check('10g a typed key clears the whole list and the tab\'s copies',
    /export function applyAccountLogin[\s\S]{0,1400}?CHAR_CACHE_KEYS\.forEach[\s\S]{0,400}?CHAR_SESSION_KEYS/.test(ix));
  check('10h the roster\'s list is the one list', /import \{[^}]*CHAR_CACHE_KEYS[^}]*\} from '\.\.\/game\/tabIdentity\.js'/.test(cr)
    && !/export const CHAR_CACHE_KEYS = \[/.test(cr));
  check('10i the heartbeat stamps the tab\'s own key\'s row', /_hbPf = _tabRowKey\(S\)/.test(bt));
  check('10j joinTown stamps the tab\'s own key\'s row', /_rosterPf = _tabRowKey\(S\)/.test(bt));
  check('10k both bt_rpg readers ask ownedBy', (bt.match(/ownedBy\(_?(?:savedRpg|cachedRpg|_cachedRpg)/g) || []).length >= 2);
  check('10l the resume reader asks ownedBy', /ownedBy\(snap, S0\.myId\)/.test(bt));
  check('10m a tab knows its key from its first render (_tabKey)', /_tabKey: \(function/.test(bt));
}

/* 11. the off-ramp */
check('11a ?tabid=0 is the old road', has && T.tabIdOff('?tabid=0') === true && T.tabIdOff('?x=1&tabid=0&y') === true);
check('11b ...anything else the new', has && T.tabIdOff('') === false && T.tabIdOff('?tabid=1') === false && T.tabIdOff('?guest=1') === false);

console.log(`\ntab-identity: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
