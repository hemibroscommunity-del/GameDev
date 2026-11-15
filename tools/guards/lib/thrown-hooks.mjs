/* ═══ v2.3.5307: the module hook behind tools/guards/lib/thrown.mjs (card T) ═══
 * When server/src/index.js loads, append a call that patches its GameRoom
 * (thrown-patch.mjs).  Nothing else is touched. */
let target = null;
let patch = null;
export async function initialize(data) {
  target = data && data.target;
  patch = data && data.patch;
}
export async function load(url, context, nextLoad) {
  const r = await nextLoad(url, context);
  if (!target || url !== target) return r;
  const src = String(r.source) + `\nimport { patchThrown as __btPatchThrown } from ${JSON.stringify(patch)};\n__btPatchThrown(GameRoom);\n`;
  return { ...r, source: src, shortCircuit: true };
}
