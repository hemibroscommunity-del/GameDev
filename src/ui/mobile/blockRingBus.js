// Block ring bus: block state + parry hooks. The ring component writes
// _shieldUp / _shieldAngle directly into stateRef so the existing combat
// loop keeps working. Parry detection is exposed as a hook so combat code
// can ask "did this hit land within a parry window?".

const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

const PARRY_WINDOW_MS = 150;
const PARRY_WINDOW_RELAXED_MS = 250;
const SHIELD_ARC_DEG = 120;

const state = {
  hostileNear: false,            // proximity-modulated opacity gate
  blockCount: 0,                 // visibility-fade progression
  relaxedParry: false,           // accessibility option
  blocking: false,
  blockStartedAt: 0,
  parryFlashAt: 0,               // ms timestamp of last parry burst
};

const loadCount = () => {
  try { return Number(localStorage.getItem('brotown_block_count') || 0); } catch { return 0; }
};
const saveCount = () => { try { localStorage.setItem('brotown_block_count', String(state.blockCount)); } catch {} };
state.blockCount = loadCount();

export const blockRingBus = {
  state,
  PARRY_WINDOW_MS, PARRY_WINDOW_RELAXED_MS, SHIELD_ARC_DEG,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  setHostileNear(v) { state.hostileNear = !!v; emit(); },
  setRelaxedParry(v) { state.relaxedParry = !!v; emit(); },

  beginBlock() {
    state.blocking = true;
    state.blockStartedAt = performance.now();
    state.blockCount++;
    saveCount();
    emit();
  },
  endBlock() {
    state.blocking = false;
    emit();
  },

  // Combat code calls this on each incoming damage instance to ask whether
  // the hit was parried. Returns:
  //   { blocked: bool, parried: bool, arcCovered: bool }
  // ringDir: radians the shield is currently pointing
  // attackDir: radians the attack is coming from (toward the player)
  resolveIncoming({ ringDir, attackDir }) {
    if (!state.blocking) return { blocked: false, parried: false, arcCovered: false };
    // Angle between shield direction and the incoming attack vector.
    let delta = Math.abs(((attackDir - ringDir + Math.PI) % (Math.PI * 2)) - Math.PI);
    const halfArc = (SHIELD_ARC_DEG * Math.PI) / 360; // half arc in radians
    const arcCovered = delta <= halfArc;
    if (!arcCovered) return { blocked: false, parried: false, arcCovered: false };
    // Parry if the block initiation was within the parry window.
    const sinceStart = performance.now() - state.blockStartedAt;
    const window = state.relaxedParry ? PARRY_WINDOW_RELAXED_MS : PARRY_WINDOW_MS;
    const parried = sinceStart <= window;
    if (parried) {
      state.parryFlashAt = performance.now();
      emit();
    }
    return { blocked: true, parried, arcCovered: true };
  },

  // Visibility opacity per spec: baseline → hostile → block-count progression.
  ringOpacity() {
    let cap = state.hostileNear ? 0.12 : 0.06;
    if (state.blockCount >= 100) cap = Math.min(cap, 0.05);
    else if (state.blockCount >= 20) cap = Math.min(cap, 0.08);
    return cap;
  },
};

if (typeof window !== 'undefined') window.blockRingBus = blockRingBus;
