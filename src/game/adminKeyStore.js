/* ═══ v2.3.5718 (card SEC PR 19): THE TEST PANEL'S ADMIN KEY, FOR THE SESSION ═══
 *
 * The Test panel (src/ui/panels/DevPanel.jsx) kept the owner's admin key in
 * localStorage on any device it was typed on, for good: a borrowed phone, a
 * shared computer, a preview build's own address.  Now it is kept for the
 * BROWSER SESSION by default (sessionStorage: gone when the tab or browser
 * closes), and a tick, "Remember on this device", keeps today's way for the
 * owner's own phone.  A key remembered before this version is still read
 * (and shown as remembered), so nobody is logged out by the update.  No
 * imports, so node tests it (tools/guards/browser-secrets.test.mjs).
 *
 * `stores` is { local, session }, each a Storage (getItem/setItem/removeItem)
 * or null; every call survives a store that throws (Safari's private mode).
 */
export const ADMIN_KEY_STORE = 'bt_dev_key';

const get = (s) => { try { return (s && s.getItem(ADMIN_KEY_STORE)) || ''; } catch (e) { return ''; } };
const set = (s, v) => { try { if (s) s.setItem(ADMIN_KEY_STORE, v); } catch (e) { /* no store */ } };
const drop = (s) => { try { if (s) s.removeItem(ADMIN_KEY_STORE); } catch (e) { /* no store */ } };

/** The key and whether it is remembered on this device. */
export function loadAdminKey(stores) {
  const st = stores || {};
  const session = get(st.session);
  if (session) return { key: session, remembered: false };
  const local = get(st.local);
  return { key: local, remembered: !!local };
}

/** Keep `key`: on the device when `remember`, else for this session only --
 *  and never in both (the other copy goes). */
export function saveAdminKey(stores, key, remember) {
  const st = stores || {};
  const k = String(key || '').trim();
  if (!k) return false;
  if (remember) { set(st.local, k); drop(st.session); }
  else { set(st.session, k); drop(st.local); }
  return true;
}

/** Forget it everywhere. */
export function forgetAdminKey(stores) {
  const st = stores || {};
  drop(st.local); drop(st.session);
}

/** The page's own stores. */
export function pageStores() {
  let local = null, session = null;
  try { local = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { local = null; }
  try { session = typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch (e) { session = null; }
  return { local, session };
}
