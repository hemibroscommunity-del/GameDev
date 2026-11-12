/* ═══ v2.3.4930: A WORKER'S `document.createElement('canvas')` ═══
 *
 * The body bake (bodyRecolor.js, spriteScale.js, trimPack.js, toolRecolor.js,
 * playerDecal.js) makes its canvases with `document.createElement('canvas')`,
 * as it always has on the page.  A worker has no document, so the body bake's
 * worker (bodyBakeWorker.js) imports this FIRST: a document whose only skill
 * is a canvas, an OffscreenCanvas.
 *
 * Every 2D context it hands out reads back on the CPU (`willReadFrequently`),
 * whatever the caller asked: the bake reads its canvases back again and again,
 * and a canvas on the graphics chip pays a copy for each read (maskedBakeWorker
 * measured 1.7 s against 7 ms).  A CPU canvas also halves by nearest exactly
 * (the top-left texel of each block), as the page's software canvas does and
 * as the look palette's numbers were baked (look-palette.md, "the old path's
 * halvings").
 *
 * Imported only by the worker; on the page `document` exists and this does
 * nothing. */
if (typeof document === 'undefined' && typeof OffscreenCanvas !== 'undefined') {
  const cpuCanvas = () => {
    const c = new OffscreenCanvas(1, 1);
    const g = c.getContext.bind(c);
    c.getContext = (t, o) => g(t, Object.assign({}, o || {}, { willReadFrequently: true }));
    return c;
  };
  globalThis.document = {
    createElement(tag) {
      if (String(tag).toLowerCase() !== 'canvas') throw new Error('workerCanvas: only a canvas, not ' + tag);
      return cpuCanvas();
    },
  };
}
