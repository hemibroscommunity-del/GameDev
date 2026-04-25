// Inventory bus: open state, item list, equipped slots, shortcuts, layer state.
// Other modules push items here via setItems(); the bus emits to subscribers
// so the surface re-renders. State is intentionally separate from React.

const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

const SHORTCUT_KEY = 'brotown_inv_shortcuts_v1';
const LAYER_KEY    = 'brotown_inv_layers_v1';

// Item shape (canonical):
// {
//   id: string (stable),  type: 'weapon'|'armor'|'pet'|'tool'|'gem'|'potion'|'material',
//   name: string,         tier: number,    quality: 'normal'|'rare'|'elite'|'godly',
//   hardness: number,     temper: number,  count: number (stackables),
//   acquiredAt: ms,       crafter: string|null,
//   gems: ['flame', ...], gemSlots: number,
//   stats: { atk, def, ... },     // optional, for comparison
//   color: '#hex' (tile tint hint, optional),
//   isNew: bool,
// }
const state = {
  open: false,
  activeTab: 'inventory',  // 'inventory' | 'equipped'
  items: [],               // unequipped items
  equipped: { weapon: null, armor: null, pet: null, tool: null },
  shortcuts: [null, null], // 2 slots, each holds an item id (or null)
  ghosts: [null, null],    // ghost-slot state (lastItem, ts) per slot
  layers: { 1: false, 2: false, 3: false },
  hp: 1.0,                 // 0..1 fraction (for low-HP visuals)
  damageTick: 0,           // bump on each hit so the surface can react
  category: 'all',
  sort: 'newestFirst',
  search: '',
};

const loadShortcuts = () => {
  try { const v = JSON.parse(localStorage.getItem(SHORTCUT_KEY) || 'null'); if (Array.isArray(v) && v.length === 2) return v; } catch {}
  return [null, null];
};
const saveShortcuts = () => { try { localStorage.setItem(SHORTCUT_KEY, JSON.stringify(state.shortcuts)); } catch {} };
const loadLayers = () => {
  try { const v = JSON.parse(localStorage.getItem(LAYER_KEY) || 'null'); if (v && typeof v === 'object') return { ...state.layers, ...v }; } catch {}
  return state.layers;
};
const saveLayers = () => { try { localStorage.setItem(LAYER_KEY, JSON.stringify(state.layers)); } catch {} };
state.shortcuts = loadShortcuts();
state.layers = loadLayers();

export const inventoryBus = {
  state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  setOpen(v) { state.open = !!v; emit(); },
  setTab(t)  { state.activeTab = t; emit(); },
  setCategory(c) { state.category = c; emit(); },
  setSort(s)     { state.sort = s; emit(); },
  setSearch(q)   { state.search = q; emit(); },
  setHp(frac)    { state.hp = Math.max(0, Math.min(1, frac)); emit(); },

  setItems(items) {
    state.items = items.slice().sort((a, b) => (b.acquiredAt || 0) - (a.acquiredAt || 0));
    emit();
  },
  setEquipped(slot, item) { state.equipped[slot] = item; emit(); },

  // Shortcut assignment. itemId is a stable id from state.items or equipped.
  // slotIdx is 0 or 1.
  setShortcut(slotIdx, itemId) {
    state.shortcuts[slotIdx] = itemId;
    state.ghosts[slotIdx] = null;
    saveShortcuts();
    emit();
  },
  clearShortcut(slotIdx) {
    state.shortcuts[slotIdx] = null;
    state.ghosts[slotIdx] = null;
    saveShortcuts();
    emit();
  },

  pushDamage(amount = 1) {
    state.damageTick++;
    state.hp = Math.max(0, state.hp - amount);
    emit();
  },

  // Layer triggers (silent reveals — see spec §"Canonical rule for layer reveals").
  triggerLayer(n) {
    if (state.layers[n]) return false;
    state.layers[n] = true;
    saveLayers();
    emit();
    return true;
  },

  // Helpers --
  filteredItems() {
    let xs = state.items;
    if (state.category !== 'all') xs = xs.filter(it => it._cat === state.category);
    const q = state.search.trim().toLowerCase();
    if (q) xs = xs.filter(it => (it.name || '').toLowerCase().includes(q));
    const sortFns = {
      newestFirst: (a, b) => (b.acquiredAt || 0) - (a.acquiredAt || 0),
      oldestFirst: (a, b) => (a.acquiredAt || 0) - (b.acquiredAt || 0),
      tierHigh:    (a, b) => (b.tier || 0) - (a.tier || 0),
      tierLow:     (a, b) => (a.tier || 0) - (b.tier || 0),
      alpha:       (a, b) => (a.name || '').localeCompare(b.name || ''),
    };
    return xs.slice().sort(sortFns[state.sort] || sortFns.newestFirst);
  },
  countByCategory() {
    const counts = { all: state.items.length };
    for (const it of state.items) counts[it._cat] = (counts[it._cat] || 0) + 1;
    return counts;
  },
};

// Auto-categorize on push.
const TYPE_TO_CAT = {
  weapon: 'weapons', armor: 'armor', pet: 'other', tool: 'other',
  gem: 'gems', potion: 'potions', material: 'other',
};
const _origSetItems = inventoryBus.setItems;
inventoryBus.setItems = (items) => {
  const prepared = items.map(it => ({ ...it, _cat: TYPE_TO_CAT[it.type] || 'other' }));
  _origSetItems(prepared);
  // Layer 1 — auto-trigger past 100 items.
  if (prepared.length >= 100) inventoryBus.triggerLayer(1);
};

if (typeof window !== 'undefined') window.inventoryBus = inventoryBus;
