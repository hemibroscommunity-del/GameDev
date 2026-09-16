/* THE SIDE-BY-SIDE STRIPS (v2.3.2596).
 *
 * Three crops of the same panel — as it ships, the literal ask, the re-cut —
 * laid out in one labelled image per width, because the owner's question is a
 * comparison and three separate links are not one.  Composed in the browser
 * (no ImageMagick in this sandbox) from base64, so nothing depends on a path.
 *
 *   node tools/qa/mp/compose-mock4.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), 'out');
const b64 = (f) => `data:image/png;base64,${readFileSync(`${OUT}/${f}`).toString('base64')}`;

const PANES = [
  ['As it ships today', 'before', 'Two columns open at most (one weapon + Shared); the other two are 64px strips.'],
  ['A — the ask, literally', 'a', '4 equal columns, 3x icon in the same 48px cell, [+] 50% wider, bigger skill name.'],
  ['B — the ask, re-cut to fit', 'b', 'Same four changes; the icon gets its own row and the cell grows 48 -> 76px.'],
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });

for (const label of ['390-portrait', '360-portrait', '390-landscape', '360-landscape']) {
  const panes = PANES.filter(([, k]) => existsSync(`${OUT}/crop-${label}-${k}.png`));
  if (!panes.length) { console.log(`  ${label}: no crops, skipped`); continue; }
  const html = `<!doctype html><meta charset="utf-8"><style>
    :root{color-scheme:dark}
    body{margin:0;background:#141b22;font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#e8e2d6}
    .wrap{display:flex;gap:18px;padding:18px;align-items:flex-start}
    .pane{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
    h2{margin:0;font-size:15px;font-weight:800;letter-spacing:.02em;color:#d8a85f}
    p{margin:0;font-size:12px;color:#9fb0bd;min-height:32px}
    img{width:100%;height:auto;display:block;border:1px solid #2b3a47;border-radius:8px}
    .cap{font-size:11px;color:#6f8291}
  </style><div class="wrap">${panes.map(([t, k, d]) => `
    <div class="pane"><h2>${t}</h2><p>${d}</p>
      <img src="${b64(`crop-${label}-${k}.png`)}">
      <div class="cap">${label.replace('-', ' · ')} — ?mock4=${k === 'before' ? 'off' : k}</div></div>`).join('')}
  </div>`;
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(250);
  const el = await page.$('.wrap');
  await el.screenshot({ path: `${OUT}/strip-${label}.png` });
  console.log(`  strip-${label}.png (${panes.length} panes)`);
}
await browser.close();
