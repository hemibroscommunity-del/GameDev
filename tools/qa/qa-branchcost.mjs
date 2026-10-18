/* ═══ v2.3.3407: WHAT A BRANCH NO PIXEL TAKES COSTS THIS BOX'S GPU ═══
 *
 * `node tools/qa/qa-branchcost.mjs` -- no worker, no game, one page.
 *
 * paletteTex.js's ONE_BATCHER draws every sprite with one program holding
 * three reads of a picture, one branch each.  A phone's graphics chip skips
 * a branch that every pixel of a quad agrees on, so a sprite pays for its own
 * read; a SOFTWARE rasterizer (this box's SwiftShader) runs every branch for
 * every pixel, the ones no pixel takes too, so it pays for all three -- the
 * QA phone drew 4.1 frames a second with the one program against 9.2 with
 * the three (mp-phoneframe, `BT_PF_AB='onebatch=0'`), and the game keeps the
 * three programs where the renderer names itself software (TRAPS §225).
 *
 * This measures the rule itself.  A full-screen quad, drawn with:
 *   A  a read through a chain of 15 picture slots (Pixi's batch read);
 *   B  A inside a branch whose other side -- 15 slots of 5 reads each -- no
 *      pixel takes (a flat varying, as ONE_BATCHER's kind code);
 *   C  that other side alone.
 * Each draw is waited for with a one-pixel read.  B near A: branches no pixel
 * takes are skipped.  B near C: every branch is run.  Measured 2026-10-18 at
 * 390 x 806 (ms a draw, three rounds): A 11.5-17.5, B 50-66, C 36-60 --
 * every branch is run.  (A phone's chip is not measured here; the game's
 * Speed test times the one program against the three on the phone itself.)
 */
import { launch } from './mp/harness.mjs';

const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 806 }, deviceScaleFactor: 1 });
  await page.setContent('<canvas id=c width=390 height=806></canvas>');
  const out = await page.evaluate(() => {
    const gl = document.getElementById('c').getContext('webgl2', { antialias: false });
    if (!gl) return { error: 'no WebGL2' };
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const SL = 15;
    const VS = `#version 300 es
in vec2 p; out vec2 vUV; flat out float vCode;
uniform float uCode;
void main(){ vUV = p * 0.5 + 0.5; vCode = uCode; gl_Position = vec4(p, 0.0, 1.0); }`;
    const chain = (body) => {
      let s = '';
      for (let t = 0; t < SL; t++) s += (t ? 'else ' : '') + (t < SL - 1 ? `if (vId < ${t}.5) ` : '') + `{ ${body(t)} }\n`;
      return s;
    };
    const cheap = chain((t) => `acc = texture(uT[${t}], vUV);`);
    const dear = chain((t) => `ivec2 sz = textureSize(uT[${t}], 0); ivec2 a = clamp(ivec2(vUV * vec2(sz)), ivec2(0), sz - 1);
      acc += texelFetch(uT[${t}], a, 0) + texelFetch(uT[${t}], a + ivec2(1, 0), 0) + texelFetch(uT[${t}], a + ivec2(0, 1), 0) + texelFetch(uT[${t}], a + ivec2(1, 1), 0);`);
    const head = `#version 300 es
precision highp float; in vec2 vUV; flat in float vCode; out vec4 o;
uniform highp sampler2D uT[${SL}]; uniform float uId;
void main(){ float vId = uId; vec4 acc = vec4(0.0);`;
    const FS = {
      A: head + cheap + ' o = acc * 0.5; }',
      B: head + ' if (vCode < 0.5) {' + cheap + '} else {' + dear + '} o = acc * 0.5; }',
      C: head + dear + ' o = acc * 0.125; }',
    };
    const shader = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const progs = {};
    for (const k of Object.keys(FS)) {
      const pr = gl.createProgram();
      gl.attachShader(pr, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(pr, shader(gl.FRAGMENT_SHADER, FS[k]));
      gl.bindAttribLocation(pr, 0, 'p');
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      progs[k] = pr;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const px = new Uint8Array(256 * 256 * 4);
    for (let i = 0; i < px.length; i++) px[i] = (i * 37) & 255;
    for (let u = 0; u < SL; u++) {
      gl.activeTexture(gl.TEXTURE0 + u);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    const one = new Uint8Array(4);
    const wait = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one);
    const ms = { A: [], B: [], C: [] };
    const N = 4;
    for (let round = 0; round < 3; round++) {
      for (const k of ['A', 'B', 'C']) {
        const pr = progs[k];
        gl.useProgram(pr);
        gl.uniform1iv(gl.getUniformLocation(pr, 'uT'), Array.from({ length: SL }, (_, i) => i));
        gl.uniform1f(gl.getUniformLocation(pr, 'uCode'), 0.0);
        gl.uniform1f(gl.getUniformLocation(pr, 'uId'), 3.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        wait();
        const t0 = performance.now();
        for (let i = 0; i < N; i++) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        wait();
        ms[k].push(+((performance.now() - t0) / N).toFixed(2));
      }
    }
    return { renderer, ms };
  });
  if (out.error) {
    console.log(out.error);
    process.exitCode = 1;
  } else {
    const mid = (a) => a.slice().sort((x, y) => x - y)[1];
    const A = mid(out.ms.A), B = mid(out.ms.B), C = mid(out.ms.C);
    console.log(`renderer: ${out.renderer}`);
    console.log(`ms a full-screen draw (three rounds): A ${out.ms.A.join(' ')} | B ${out.ms.B.join(' ')} | C ${out.ms.C.join(' ')}`);
    console.log(B > A * 2
      ? `every branch is run: B ${B} ms is ${(B / A).toFixed(1)}x A -- a program's branches all cost here (a software rasterizer)`
      : `a branch no pixel takes is skipped: B ${B} ms is ${(B / A).toFixed(1)}x A (C ${C})`);
  }
} finally {
  await browser.close();
}
