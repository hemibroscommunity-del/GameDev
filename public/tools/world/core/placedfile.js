/* ═══ v2.3.3298: THE WHEEL'S OBJECTS, AS A FILE ═══
 *
 * Where every building, tree, rock and prop stands on the Wheel
 * (core/placing.js placeObjects) is worked out from the WHOLE blueprint, one
 * object after another -- each keeps clear of the ones placed before it, so
 * it cannot be done a block at a time the way the ground now is
 * (core/worldblocks.js).  So it is worked out once, by
 * tools/world/bake-wheel-world.mjs, and the game's ground worker reads it
 * from public/world/placed/objects.bin instead: the same numbers, without
 * building the whole Wheel on the phone.  This is the file's format, both
 * ways (pure: no Node, no page).
 *
 *   'BTPL', u32 format, u32 header length, the header (JSON: everything but
 *   the per-object arrays), padding to 4, then per object: kind (u8), piece
 *   (u8), flip (u8) -- each a run of n -- padding to 4, and x and y as int32
 *   halves of a game px (placeObjects keeps them to the half px).
 */
const MAGIC = 0x4c505442;     /* 'BTPL', little-endian */
export const PLACED_FORMAT = 1;

const pad4 = (n) => (n + 3) & ~3;

export function encodePlaced(objects) {
  const n = objects.n;
  const head = { version: objects.version, kinds: objects.kinds, kindScale: Array.from(objects.kindScale || []), n,
    worldW: objects.worldW, worldH: objects.worldH, buildings: objects.buildings, buildingsOf: objects.buildingsOf,
    town: objects.town === undefined ? null : objects.town, fences: objects.fences === undefined ? null : objects.fences,
    counts: objects.counts || null };
  const json = new TextEncoder().encode(JSON.stringify(head));
  const at0 = pad4(12 + json.length), at1 = pad4(at0 + 3 * n);
  const buf = new ArrayBuffer(at1 + 8 * n);
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  dv.setUint32(0, MAGIC, true); dv.setUint32(4, PLACED_FORMAT, true); dv.setUint32(8, json.length, true);
  u8.set(json, 12);
  u8.set(objects.kind.subarray(0, n), at0);
  u8.set(objects.piece.subarray(0, n), at0 + n);
  u8.set(objects.flip.subarray(0, n), at0 + 2 * n);
  for (let i = 0; i < n; i++) {
    dv.setInt32(at1 + 4 * i, Math.round(objects.x[i] * 2), true);
    dv.setInt32(at1 + 4 * (n + i), Math.round(objects.y[i] * 2), true);
  }
  return u8;
}

/* The file back as placeObjects returns it (kind, piece and flip as
   Uint8Array, x and y as Float32Array), or null when it is not one. */
export function decodePlaced(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.length < 12) return null;
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== MAGIC || dv.getUint32(4, true) !== PLACED_FORMAT) return null;
  const jl = dv.getUint32(8, true);
  let head;
  try { head = JSON.parse(new TextDecoder().decode(u8.subarray(12, 12 + jl))); } catch (e) { return null; }
  const n = head.n | 0;
  const at0 = pad4(12 + jl), at1 = pad4(at0 + 3 * n);
  if (u8.length < at1 + 8 * n) return null;
  const x = new Float32Array(n), y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = dv.getInt32(at1 + 4 * i, true) / 2;
    y[i] = dv.getInt32(at1 + 4 * (n + i), true) / 2;
  }
  return {
    version: head.version, kinds: head.kinds, kindScale: Float32Array.from(head.kindScale || []), n,
    worldW: head.worldW, worldH: head.worldH, buildings: head.buildings, buildingsOf: head.buildingsOf,
    kind: u8.slice(at0, at0 + n), piece: u8.slice(at0 + n, at0 + 2 * n), flip: u8.slice(at0 + 2 * n, at0 + 3 * n), x, y,
    town: head.town, fences: head.fences, counts: head.counts, ms: 0,
  };
}
