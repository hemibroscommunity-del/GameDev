/* Screenshots of the Auction House on the plaza, at the two phones the owner
   uses, portrait and landscape (v2.3.2626).  No assertions beyond "the door
   still works from here" -- this exists to produce pictures for review. */
import * as H from './harness.mjs';

const COACH_OFF = () => {
  try {
    const l = ['openDash','move','equip','dashAfterTurnIn','equipAll','cycle',
      'blockRanged','attack','special','chatTap','passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

const PHONES = [
  { label: '360', portrait: { width: 360, height: 640 }, landscape: { width: 640, height: 360 } },
  { label: '390', portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } },
];

export async function run({ browser, wsPort, webPort, rec }) {
  const door = await H.doorOf('auction-house');
  for (const phone of PHONES) {
    const P = await H.newPlayer(browser, {
      name: 'Looker' + phone.label, wsPort, webPort, touch: true,
      viewport: phone.portrait, init: COACH_OFF,
    });
    try {
      await H.enterWorld(P);
      await P.page.waitForTimeout(2200);
      for (const orient of ['portrait', 'landscape']) {
        if (orient === 'landscape') {
          await P.page.setViewportSize(phone.landscape);
          await P.page.waitForTimeout(1500);
        }
        /* Shut the dashboard tray and the welcome card first -- they cover a
           third of the frame, and these shots exist to show the building. */
        await H.closeDest(P).catch(() => {});
        await H.clickText(P, 'CLOSE').catch(() => {});
        await P.page.waitForTimeout(700);
        /* Stand back a little so the whole building is in frame, then at the door. */
        await H.hopTo(P, door.x, door.y + 110);
        await P.page.waitForTimeout(1400);
        await H.closeDest(P).catch(() => {});
        await H.clickText(P, 'CLOSE').catch(() => {});
        await P.page.waitForTimeout(500);
        await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/ah-${phone.label}-${orient}-wide.png` });
        await H.hopTo(P, door.x, door.y);
        await P.page.waitForTimeout(1200);
        const near = await H.readState(P, (S) => S.nearBuilding);
        rec.ok(`${phone.label} ${orient}: the door prompt is up at the new position`,
          near !== null && near !== undefined, { near, door });
        await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/ah-${phone.label}-${orient}-door.png` });
      }
    } finally { await P.ctx.close().catch(() => {}); }
  }
}
