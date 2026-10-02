/* ═══ v2.3.2931: WHERE THE WORLD BUILDER KEEPS ITS WORK ═══
 *
 * IndexedDB, in this browser, on this device.  Four stores:
 *   meta    the project record: which squares are done, in what order, how
 *           each was fused, and the key of the plan each was painted against
 *   raw     the picture ChatGPT made for each square, exactly as uploaded
 *           -- the real asset; everything else can be rebuilt from these
 *   chunks  the fused world, cut into 512 px PNG tiles (the squares layer;
 *           any anchor painting is laid on top at display time)
 *   misc    the overview picture shown on the map, and the style key picture
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

/* v2.3.2937: `stores` lets another tool keep its own database the same way
   (the Ground Studio); the World Builder's four are the default. */
export async function openStore(name = DB_NAME, stores = STORES) {
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => { for (const s of stores) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); };
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
    async clearAll() { for (const s of stores) await req(tx(s, 'readwrite').clear()); },
    close: () => db.close(),
  };
}
