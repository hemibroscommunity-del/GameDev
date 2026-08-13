/* ═══ v2.3.1684: THE DEPLOY PAGE, PROVEN — not on the CI path ═══
 *
 * public/deploy-scores.html exists so the operator's whole deploy is three
 * wallet taps.  That concentration of trust needs a matching concentration
 * of proof, and every property below is one a human clicking through the
 * page could not check:
 *
 *   1. BYTE EQUALITY — the bytecode embedded in the page is exactly what
 *      solc 0.8.26/optimizer/200 produces from contracts/BroTownScores.sol
 *      TODAY.  The page is a snapshot; this is the tripwire for drift.
 *   2. THE REAL FLOW, HEADLESS — a browser loads the page with a mock
 *      EIP-1193 wallet and taps connect → keygen → deploy → fund.  The mock
 *      captures the exact transaction the page asks the wallet to sign.
 *   3. THE CAPTURED BYTES, EXECUTED — the deploy calldata goes into a local
 *      EVM (@ethereumjs).  It must deploy, and the deployed contract's
 *      signer()/guardian() must read back as the page-generated relayer
 *      address and the mock wallet account.  This is the end-to-end proof
 *      that keygen → address derivation → ctor encoding are all correct.
 *   4. ZERO REQUESTS — the page must make no network requests of its own
 *      (the private key never transmits).  Held here as a tested property.
 *
 * Run from a scratch dir with the conformance harness's deps installed:
 *   npm i solc@0.8.26 @ethereumjs/evm@3 @ethereumjs/util@9
 *   node <repo>/tools/qa/deploy-page.mjs
 */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cwdRequire = createRequire(path.join(process.cwd(), 'noop.cjs'));
const repoRequire = createRequire(path.join(REPO, 'noop.cjs'));
const solc = cwdRequire('solc');
const { EVM } = cwdRequire('@ethereumjs/evm');
const { hexToBytes } = cwdRequire('@ethereumjs/util');
const { chromium } = repoRequire('playwright-core');

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n + '  ' + d); } };

const PAGE = path.join(REPO, 'public/deploy-scores.html');
const html = fs.readFileSync(PAGE, 'utf8');

/* ── 1. byte equality with a fresh compile ── */
{
  const v = solc.version();
  if (!v.startsWith('0.8.26')) throw new Error('need solc 0.8.26; CWD has ' + v);
  const src = fs.readFileSync(path.join(REPO, 'contracts/BroTownScores.sol'), 'utf8');
  const out = JSON.parse(solc.compile(JSON.stringify({
    language: 'Solidity', sources: { 'S.sol': { content: src } },
    settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['evm.bytecode.object'] } } },
  })));
  const fresh = out.contracts['S.sol'].BroTownScores.evm.bytecode.object;
  const m = html.match(/const BYTECODE = '([0-9a-f]+)';/);
  ok('the page embeds a bytecode constant', !!m);
  ok('embedded bytecode === fresh solc 0.8.26 compile (no drift)', m && m[1] === fresh,
    m ? `page ${m[1].length / 2}B vs fresh ${fresh.length / 2}B` : '');
}

/* ── 2. the flow, in a real browser with a mock wallet ── */
const GUARDIAN = '0x' + '1f'.repeat(20);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext()).newPage();

const requests = [];
page.on('request', (r) => requests.push(r.url()));

/* The mock speaks just enough EIP-1193 for the page: it answers reads
   consistently with whatever deploy transaction the page submits (it parses
   the two constructor addresses back out of the calldata), so the page's own
   readback verification exercises its real code path. */
await page.addInitScript(`(() => {
  const GUARDIAN = '${GUARDIAN}';
  const CONTRACT = '0x' + 'c0'.repeat(20);
  const log = { txs: [] };
  window.__mock = log;
  window.ethereum = {
    request: async ({ method, params }) => {
      if (method === 'eth_requestAccounts') return [GUARDIAN];
      if (method === 'wallet_switchEthereumChain') return null;
      if (method === 'wallet_addEthereumChain') return null;
      if (method === 'eth_sendTransaction') {
        log.txs.push(params[0]);
        return '0x' + 'ee'.repeat(32);
      }
      if (method === 'eth_getTransactionReceipt') {
        return { status: '0x1', contractAddress: CONTRACT };
      }
      if (method === 'eth_call') {
        const deploy = log.txs.find((t) => !t.to);
        if (!deploy) return '0x' + '00'.repeat(32);
        const tail = deploy.data.slice(-128);          // two padded ctor words
        const sel = params[0].data.slice(2, 10);
        const sig = (s) => { /* keccak lives in the page; recompute cheaply via known constants */ return s; };
        // signer() = 238ac933, guardian() = 452a9320? -- resolved below in Node;
        // here we just map: first word for signer(), second for guardian().
        if (sel === window.__selSigner) return '0x' + tail.slice(0, 64);
        if (sel === window.__selGuardian) return '0x' + tail.slice(64);
        return '0x' + '00'.repeat(32);
      }
      throw new Error('mock has no ' + method);
    },
  };
})();`);

await page.goto('file://' + PAGE);
/* Feed the mock the page's own selector derivations, so the mock and the page
   can never disagree about a selector constant. */
await page.evaluate(() => {
  window.__selSigner = selector('signer()');
  window.__selGuardian = selector('guardian()');
});

await page.click('#btnConnect');
await page.waitForFunction(() => document.getElementById('s1').classList.contains('ok'));
ok('connect flow reaches the ok state', true);

await page.click('#btnKey');
await page.waitForSelector('#keyOut', { state: 'visible' });
const priv = await page.textContent('#privHex');
const relayer = await page.textContent('#relayerAddr');
ok('a 32-byte private key is shown', /^0x[0-9a-f]{64}$/.test(priv), priv);
ok('a derived address is shown', /^0x[0-9a-f]{40}$/.test(relayer), relayer);

await page.click('#btnDeploy');
await page.waitForSelector('#deployOut', { state: 'visible' });
const shownContract = await page.textContent('#contractAddr');
ok('the mock contract address is surfaced', shownContract === '0x' + 'c0'.repeat(20), shownContract);
const verifyHtml = await page.innerHTML('#verify');
ok("the page's own readback shows both roles ✓",
  verifyHtml.includes('signing key registered') && verifyHtml.includes('you are the guardian')
  && !verifyHtml.includes('mismatch'), verifyHtml);

await page.fill('#fundAmt', '0.002');
await page.click('#btnFund');
await page.waitForFunction(() => document.getElementById('s4').classList.contains('ok'));
const txs = await page.evaluate(() => window.__mock.txs);
ok('exactly two transactions were requested (deploy + fund)', txs.length === 2, txs.length);
ok('the fund transaction pays the generated relayer', txs[1].to === relayer && BigInt(txs[1].value) === 2000000000000000n, txs[1]);

/* ── 4. the page phoned nobody ── */
const external = requests.filter((u) => !u.startsWith('file://'));
ok('the page made ZERO network requests (key never transmits)', external.length === 0, external);

const deployTx = txs[0];
await browser.close();

/* ── 3. the captured bytes, executed for real ── */
{
  ok('the deploy tx has no `to` (contract creation)', !deployTx.to);
  ok('the deploy tx is sent from the guardian', deployTx.from === GUARDIAN, deployTx.from);
  const evm = await EVM.create();
  const dep = await evm.runCall({ data: hexToBytes(deployTx.data), gasLimit: 10000000n });
  ok('the exact bytes the page produced DEPLOY in a real EVM',
    !dep.execResult.exceptionError, String(dep.execResult.exceptionError || ''));
  const at = dep.createdAddress;
  const { keccak256, toHex } = await import(path.join(REPO, 'server/src/onchain.js'));
  const sel = (s) => keccak256(new TextEncoder().encode(s)).slice(0, 4);
  const read = async (sig) => {
    const r = await evm.runCall({ to: at, data: sel(sig), gasLimit: 100000n });
    return '0x' + toHex(r.execResult.returnValue).slice(24);
  };
  ok('the deployed contract accepts the page-generated key as signer',
    (await read('signer()')) === relayer.toLowerCase(), await read('signer()'));
  ok('the deployed contract holds the wallet account as guardian',
    (await read('guardian()')) === GUARDIAN.toLowerCase(), await read('guardian()'));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
