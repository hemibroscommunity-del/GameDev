/* ═══ v2.3.5107: THE PLACES THE GAME PATCHES PIXI'S INSIDE, IN ONE TABLE (step 5.9; card B PR 8) ═══
 *
 * The game reaches into PixiJS's own classes and replaces their methods: to
 * draw from colour numbers, to let pictures go, to keep the heap lean.  Each
 * patch is written against ONE version of Pixi's inside (its private
 * methods, its argument order), so a new Pixi can break any of them without
 * a word.  This table names every one; tools/guards/pixi-pins.test.mjs fails
 * a patch that is not in it (and a row whose patch is gone), and holds Pixi
 * to the exact version the patches were written against (package.json).
 *
 * WHAT COUNTS AS A PATCH (pinned).  In src/, read without comments
 * (lib/codeOnly.mjs):
 *   - a function given to a member of an object that is not the game's own:
 *     `X.prototype.m = function`, `P.m = function`, `o.m = (...) =>`, where
 *     the object is not `this`, `window`, `self`, `globalThis`, `module`,
 *     `exports`, `document` or `S`, and the member is not a DOM event
 *     handler (`onload`: `on` and lower case letters);
 *   - `Object.defineProperty(o, 'name', ...)`, where o is not `window`.
 * Each is keyed `file + "o.m"` as the code writes it, and counted: two
 * patches of one key are two rows.
 *
 * WHAT IS NOT PIXI'S lands in NOT_PIXI, with why: the finder sees the game's
 * own objects (BT_AUDIO), WebGL's and the DOM's (`gl.drawElements`, a
 * canvas's `getContext`), React refs, QA probes on the game's objects, and
 * Pixi's PUBLIC hooks (a Container's `onRender` is meant to be set).
 *
 * STACKED PATCHES.  Some methods are patched by more than one file, each
 * wrapping the one before it (import order decides the order):
 *   BatcherPipe.prototype.addToBatch: fillBatch, sharpPixels, lightfx/shadows,
 *     lookPalette, paletteTex (five);
 *   GlTextureSystem.prototype.onSourceUpdate: heldNumbers, p256, picsOnce (three);
 *   glUploadBufferImageResource.upload: lookArmour, lookPalette, paletteTex (three);
 *   SpritePipe.prototype.validateRenderable: lookPalette, paletteTex (two).
 */

const p = (file, key, target, why) => Object.freeze({ file: 'src/rendering/' + file, key, target, why });

export const PIXI_PATCHES = Object.freeze([
  p('batchIdsLean.js', 'P.clear', 'BatchTextureArray.prototype.clear', 'v2.3.5007: a batch\'s texture ids emptied when Pixi empties the batch'),
  p('bindGroupFix.js', 'proto.onResourceChange', 'BindGroup.prototype.onResourceChange', 'v2.3.3152: a freed picture no longer breaks Pixi\'s pooled mask'),
  p('fillBatch.js', 'BatcherPipe.prototype.addToBatch', 'BatcherPipe.prototype.addToBatch', 'a filled shape to the fill batcher'),
  p('fillBatch.js', 'Object.defineProperty(obj,batcherName)', 'a renderable\'s batcherName', 'the fill batcher chosen per shape'),
  p('formShade.js', 'DefaultBatcher.prototype.packQuadAttributes', 'DefaultBatcher.prototype.packQuadAttributes', 'a form\'s shade packed with its quad'),
  p('hairClip.js', 'Object.defineProperty(B,batcherName)', 'a batcher\'s batcherName', 'the clip batchers by name'),
  p('heldNumbers.js', 'proto.onSourceUpdate', 'GlTextureSystem.prototype.onSourceUpdate', 'colour numbers uploaded, never read back on the CPU'),
  p('layerUniforms.js', 'proto._executeDirect', 'RenderGroupPipe.prototype._executeDirect', 'v2.3.3449: a layer draws with the world\'s own camera numbers'),
  p('lightfx/shadows.js', 'P.addToBatch', 'BatcherPipe.prototype.addToBatch', 'shadows to their own batcher'),
  p('lookArmour.js', 'U.upload', 'glUploadBufferImageResource.upload', 'armour looks uploaded as colour numbers'),
  p('lookPalette.js', 'P.addToBatch', 'BatcherPipe.prototype.addToBatch', 'a look to the look batcher'),
  p('lookPalette.js', 'P.validateRenderable', 'SpritePipe.prototype.validateRenderable', 'a look sprite kept in its batch'),
  p('lookPalette.js', 'U.upload', 'glUploadBufferImageResource.upload', 'look pages uploaded as colour numbers'),
  p('p256.js', 'P.onSourceUpdate', 'GlTextureSystem.prototype.onSourceUpdate', 'packed 256-colour pictures uploaded'),
  p('paletteTex.js', 'P.execute', 'GlBatchAdaptor.prototype.execute', 'the palette batch drawn'),
  p('paletteTex.js', 'P.addToBatch', 'BatcherPipe.prototype.addToBatch', 'a palette sprite to the palette batcher'),
  p('paletteTex.js', 'P.validateRenderable', 'SpritePipe.prototype.validateRenderable', 'a palette sprite kept in its batch'),
  p('paletteTex.js', 'P.validateRenderable', 'MeshPipe.prototype.validateRenderable', 'a palette mesh kept in its batch'),
  p('paletteTex.js', 'U.upload', 'glUploadBufferImageResource.upload', 'colour numbers uploaded'),
  p('paletteTex.js', 'P.execute', 'GlMeshAdaptor.prototype.execute', 'a palette mesh drawn'),
  p('picsOnce.js', 'P.onSourceUpdate', 'GlTextureSystem.prototype.onSourceUpdate', 'a picture uploaded once, then its pixels let go'),
  p('pixiApp.js', 'TextureSource.prototype.destroy', 'TextureSource.prototype.destroy', 'a texture source lets go of what it holds'),
  p('quietClear.js', 'proto.clear', 'GraphicsContext.prototype.clear', 'v2.3.3449: an empty shape wiped again is not a change'),
  p('sharpPixels.js', 'BatcherPipe.prototype.addToBatch', 'BatcherPipe.prototype.addToBatch', 'pixel art drawn sharp'),
  p('textRelease.js', 'proto.destroy', 'AbstractText.prototype.destroy', 'v2.3.3633: a Text lets go of its style when destroyed'),
  p('textRelease.js', 'Object.defineProperty(proto,style)', 'AbstractText.prototype.style', 'the same: the style\'s setter'),
  p('texturePoolTrim.js', 'pool.returnTexture', 'TexturePool.returnTexture', 'v2.3.3152: Pixi\'s texture pool gives back what it is not using'),
  /* QA probes and the Speed test: Pixi's methods wrapped while one runs */
  Object.freeze({ file: 'src/rendering/systems/effectsRenderer.js', key: 'gfx.circle', target: 'Graphics.circle (one instance)', why: 'the ring probe, opt-in (window.__btRingProbe)' }),
  Object.freeze({ file: 'src/game/speedTest.js', key: 'R.render', target: 'Renderer.render (the instance)', why: 'the Speed test counts the frame\'s passes while it runs' }),
]);

const n = (file, key, why) => Object.freeze({ file, key, why });
export const NOT_PIXI = Object.freeze([
  n('src/data/gameDisplay.js', 'BT_AUDIO.*', 'the game\'s own sound object, built a method at a time'),
  n('src/debug/debugBus.js', 'ws.send', 'the socket\'s send, wrapped for the debug log'),
  n('src/game/avatarHold.js', 'h._also', 'the game\'s own hold'),
  n('src/game/soundStudio.js', 'au.play', 'an Audio element'),
  n('src/game/speedTest.js', 'gl.bindFramebuffer', 'WebGL, counted by the Speed test'),
  n('src/game/speedTest.js', 'gl.drawElements', 'WebGL, counted by the Speed test'),
  n('src/game/speedTest.js', 'gl.drawArrays', 'WebGL, counted by the Speed test'),
  n('src/rendering/maskedBakeWorker.js', 'c.getContext', 'a canvas (DOM or a worker\'s)'),
  n('src/rendering/monsterDeathZonesFx.js', 'st.dispose', 'the game\'s own effect state'),
  n('src/rendering/slimeSplat.js', 'st.dispose', 'the game\'s own effect state'),
  n('src/rendering/pixiApp.js', 'canvas.getContext', 'the page\'s canvas (DOM)'),
  n('src/rendering/systems/effectsRenderer.js', 'probe.set', 'a QA probe, the game\'s own'),
  n('src/rendering/systems/effectsRenderer.js', 'probe.pieces', 'a QA probe, the game\'s own'),
  n('src/rendering/systems/entityRenderer.js', 'c.getContext', 'a canvas (DOM)'),
  n('src/rendering/systems/entityRenderer.js', 'g.onRender', 'Pixi\'s PUBLIC hook: a Container\'s onRender is meant to be set'),
  n('src/rendering/workerCanvas.js', 'c.getContext', 'a canvas (DOM or a worker\'s)'),
  n('src/ui/deskTeach.js', 'qa.forget', 'a QA handle, the game\'s own'),
  n('src/ui/guideArrow.js', 'qa.forget', 'a QA handle, the game\'s own'),
  n('src/ui/mobile/inventoryBus.js', 'inventoryBus.setItems', 'the game\'s own bus'),
  n('src/ui/mobile/sheet/HeroExpanded.jsx', 'stayCheckRef.current', 'a React ref'),
  n('src/ui/panels/TradeWindowPanel.jsx', 'weaponTapRef.current', 'a React ref'),
]);

/* the finder: every candidate patch in a file's comment-free code, as keys */
const OWN = /^(this|window|self|globalThis|module|exports|S|document)\b/;
export function patchesIn(code) {
  const out = [];
  const fn = /(?<![\w$.])((?:[A-Za-z_$][\w$]*)(?:\.[A-Za-z_$][\w$]*|\[[^\]]{1,40}\])*)\.([A-Za-z_$][\w$]*)\s*=(?!=)\s*(?:function\b|async\b|\([^()]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g;
  for (const m of code.matchAll(fn)) {
    if (OWN.test(m[1]) || /^on[a-z]+$/.test(m[2])) continue;
    out.push(m[1] + '.' + m[2]);
  }
  for (const m of code.matchAll(/Object\.defineProperty\(\s*([\w$.]+)\s*,\s*["'`]([\w$]+)["'`]/g)) out.push(`Object.defineProperty(${m[1]},${m[2]})`);
  return out;
}

/** Does a table row's key cover a found key? (`BT_AUDIO.*` covers every BT_AUDIO.x; `(window,*)` every window property) */
export function keyCovers(rowKey, found) {
  if (rowKey.endsWith('.*')) return found.startsWith(rowKey.slice(0, -1));
  if (rowKey.endsWith(',*)')) return found.startsWith(rowKey.slice(0, -2));
  return rowKey === found;
}
