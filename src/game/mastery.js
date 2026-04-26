/* §12.1 Surfaced Mastery Level + §12.2 Skill Certifications.
   Pedagogical infrastructure — informational, never gating gear/stats/unlocks.
   Storage is local for now; server-authoritative storage per §12.1 data model
   is a follow-up when the anti-cheat / signaling surface is needed. */

const STORAGE_KEY_LEVEL = 'bt_mastery_level';
const STORAGE_KEY_CERTS = 'bt_mastery_certs';
const STORAGE_KEY_TIMESTAMPS = 'bt_mastery_timestamps';

export const MASTERY_TIERS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4];
export const MASTERY_TIER_NAMES = {
  0:   'Newcomer',
  0.5: 'Initiate',
  1:   'Apprentice',
  1.5: 'Student',
  2:   'Skilled',
  2.5: 'Adept',
  3:   'Expert',
  4:   'Master',
};

export const TIER_HINTS = {
  0.5: 'You applied your first elemental status. Try a different element next to set up a collision.',
  1:   'You triggered your first collision. The Codex will start tracking pairs as you discover them.',
  1.5: 'Same input, different combat verbs. Locked enemies open lunge/retreat options.',
  2:   'Combo count 2 spreads the consumed status. Volatile collisions land a +30% bonus.',
  2.5: 'Trigger a collision in a status\'s final 25% — the resonance window — for bonus damage.',
  3:   'Matching armor attunement just shaved damage off an incoming hit.',
  4:   'Endgame capstone reached.',
};

/* §12.2 — 14 certifications (subset shipped here matches the mechanics
   already in code; the rest stay in the spec until their systems land).
   `first-attuned-defense` is defined here but no trigger site is wired —
   `armor.attunement` exists in the data shape (gameSystems.js ~L4560) but
   no damage-resistance pipeline reads it yet, so there's no honest hook.
   Wire it once the §13 resistance/immunity reduction path consumes
   `armor.attunement`. */
export const CERTIFICATIONS = {
  'first-grand-slam':       { name: 'First Grand Slam',         tier: 0   },
  'first-status':           { name: 'First Status Applied',     tier: 0.5 },
  'first-collision':        { name: 'First Collision',          tier: 1   },
  'first-lunge':            { name: 'First Lunge',              tier: 1.5 },
  'first-retreat-shot':     { name: 'First Retreat Shot',       tier: 1.5 },
  'first-combo-burst':      { name: 'First Combo Burst',        tier: 1.5 },
  'first-perfect-block':    { name: 'First Perfect Block',      tier: 1.5 },
  'first-combo-spread':     { name: 'First Combo Spread',       tier: 2   },
  'first-volatile':         { name: 'First Volatile Collision', tier: 2   },
  'first-resonance-hit':    { name: 'First Resonance-Timed Hit',tier: 2.5 },
  'first-combo-chain-3':    { name: 'First Combo Chain to 3',   tier: 2.5 },
  'first-attuned-defense':  { name: 'First Attuned Defense',    tier: 3   },
  'first-apex-defeat':      { name: 'First Apex Defeat',        tier: 4   },
  'first-capstone':         { name: 'First Endgame Capstone',   tier: 4   },
};

/* In-memory state, hydrated from localStorage on first read. */
let _level = null;
let _certs = null;
let _timestamps = null;
function _hydrate() {
  if (_level !== null) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEVEL);
    _level = raw === null ? 0 : Number(raw);
    if (!MASTERY_TIERS.includes(_level)) _level = 0;
  } catch { _level = 0; }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CERTS);
    _certs = new Set(raw ? JSON.parse(raw) : []);
  } catch { _certs = new Set(); }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TIMESTAMPS);
    _timestamps = raw ? JSON.parse(raw) : {};
  } catch { _timestamps = {}; }
}
function _persist() {
  try {
    localStorage.setItem(STORAGE_KEY_LEVEL, String(_level));
    localStorage.setItem(STORAGE_KEY_CERTS, JSON.stringify([..._certs]));
    localStorage.setItem(STORAGE_KEY_TIMESTAMPS, JSON.stringify(_timestamps));
  } catch {}
}

/* Tiny pub-sub for the React notification overlay. */
const subscribers = new Set();
function _emit(event) {
  for (const cb of subscribers) {
    try { cb(event); } catch {}
  }
}
export function subscribeMastery(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

export function getMasteryLevel() { _hydrate(); return _level; }
export function getCertifications() { _hydrate(); return new Set(_certs); }
export function hasCertification(id) { _hydrate(); return _certs.has(id); }

/* Advance to `tier` if it is greater than the current level. Returns true
   when an advancement actually happened (so callers can avoid double-firing
   feedback). */
export function advanceMastery(tier) {
  _hydrate();
  if (tier <= _level) return false;
  _level = tier;
  _timestamps['t' + tier] = Date.now();
  _persist();
  _emit({
    kind: 'tier',
    tier: tier,
    name: MASTERY_TIER_NAMES[tier] || ('Mastery ' + tier),
    hint: TIER_HINTS[tier] || '',
  });
  return true;
}

/* Earn a certification (no-op if already earned). Optionally raises the
   Mastery Level to the certification's tier as part of the same event. */
export function earnCertification(certId, opts) {
  _hydrate();
  const def = CERTIFICATIONS[certId];
  if (!def || _certs.has(certId)) return false;
  _certs.add(certId);
  _timestamps['c-' + certId] = Date.now();
  _persist();
  _emit({
    kind: 'cert',
    id: certId,
    name: def.name,
    tier: def.tier,
    context: (opts && opts.context) || '',
  });
  // Tier crossings happen as a separate event so the UI shows both the
  // certification and the (bigger) tier-cross notification when applicable.
  if (def.tier > _level) advanceMastery(def.tier);
  return true;
}
