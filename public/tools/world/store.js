/* ═══ v2.3.2931: WHERE THE WORLD BUILDER KEEPS ITS WORK ═══
 *
 * IndexedDB, in this browser, on this device.  Four stores:
 *   meta    the project record: which squares are done, in what order, how
 *           each was fused (planHash says which plan it was built against)
 *   raw     the picture ChatGPT made for each square, exactly as uploaded
 *           -- the real asset; everything else can be rebuilt from these
 *   chunks  the fused world, cut into 512 px PNG tiles (the squares layer;
 *           the town painting is laid on top at display time)
 *   misc    the overview picture shown on the map
 *
 * Browser storage can be cleared by the browser, by "clear website data", or
 * by a private window, so the page nags for a backup (Download backup) after
 * every few squares.  A backup .zip restores everything on any device.
 */

const DB_NAME = 'brotown-world-builder';
const STORES = ['meta', 'raw', 'chunks', 'misc'];

function req(r) {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}

export async function openStore(name = DB_NAME) {
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => { for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const tx = (store, mode) => db.transaction(store, mode).objectStore(store);
  return {
    get: (store, key) => req(tx(store, 'readonly').get(key)),
    put: (store, key, val) => req(tx(store, 'readwrite').put(val, key)),
    del: (store, key) => req(tx(store, 'readwrite').delete(key)),
    keys: (store) => req(tx(store, 'readonly').getAllKeys()),
    clear: (store) => req(tx(store, 'readwrite').clear()),
    async clearAll() { for (const s of STORES) await req(tx(s, 'readwrite').clear()); },
    close: () => db.close(),
  };
}
