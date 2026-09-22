import * as H from './harness.mjs';
import { writeFileSync } from 'node:fs';
export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Shot', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  await P.page.click('[data-nav="hero"]', { force: true }).catch(() => {});
  await P.page.waitForTimeout(700);
  /* the Points section tab */
  const tabs = await P.page.evaluate(() => [...document.querySelectorAll('button,[role="button"],div')]
    .filter((e) => /^(Equipment|Points|Journey)$/.test((e.textContent || '').trim()) && e.getBoundingClientRect().width > 0)
    .map((e) => { e.setAttribute('data-tabprobe', (e.textContent || '').trim()); return (e.textContent || '').trim(); }));
  rec.ok('tabs', false, tabs);
  await P.page.click('[data-tabprobe="Points"]', { force: true }).catch(() => {});
  await P.page.waitForTimeout(900);
  const b64 = await P.page.screenshot({ encoding: 'base64' });
  writeFileSync('/tmp/claude-0/points-now.png', Buffer.from(b64, 'base64'));
  rec.ok('shot written', false, { bytes: b64.length });
  await P.ctx.close().catch(() => {});
}
