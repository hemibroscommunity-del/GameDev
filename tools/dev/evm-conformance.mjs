/* EVM CONFORMANCE HARNESS — v2.3.1671.  NOT on the test path.
 *
 * `cd server && npm test` is deliberately zero-dependency (CLAUDE.md), and it
 * can only check that chainwriter.js agrees with ITSELF.  That is not enough
 * for the one thing that actually matters here: whether the digest this
 * server signs is byte-identical to the digest the deployed Solidity computes.
 * Disagree by one byte and every transaction reverts with BadSignature — on
 * mainnet, for real gas, with no local test having failed first.
 *
 * So this harness compiles contracts/BroTownScores.sol with solc and RUNS it
 * in a local EVM, then compares against the JS.  It found two real defects
 * the pure-JS suite could not have:
 *
 *   1. the gas limit.  A first-ever 14-skill write costs 1,087,613 gas of
 *      execution — three cold SSTOREs per new skill, not one.  The original
 *      budget of 45k/skill would have run out of gas on the first mainnet
 *      checkpoint.
 *   2. it pins abi.encodePacked's array-element padding (uint32[] hashes at
 *      32 bytes per element, not 4), which is the exact assumption a
 *      hand-written encoder gets wrong.
 *
 * RUN IT whenever you touch the contract, the digest, or the ABI encoder:
 *
 *   mkdir -p /tmp/evmconf && cd /tmp/evmconf && npm init -y
 *   npm i solc@0.8.26 @ethereumjs/evm@3 @ethereumjs/util@9
 *   node <repo>/tools/dev/evm-conformance.mjs
 *
 * It resolves its deps from the CWD, so run it from that scratch directory.
 * The known-answer vectors it prints are mirrored into
 * server/test/chainwriter.test.mjs, which DOES run in CI — so the conformance
 * result is preserved there without dragging solc into the server suite.
 */
import { createRequire } from 'module';
import path from 'path';
/* Resolve solc/ethereumjs from the CWD (a scratch dir with them installed),
   never from the repo — the repo must not gain these as dependencies. */
const require = createRequire(path.join(process.cwd(), 'noop.cjs'));
const solc = require('solc');
const { EVM } = require('@ethereumjs/evm');
const { Address, hexToBytes, bytesToHex } = require('@ethereumjs/util');
import fs from 'fs';
import { fileURLToPath } from 'url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { skillKey, scoreDigest, selector, encodeRecordScore, playerKey, signDigest, privToAddress, normalizePrivKey } =
  await import(path.join(REPO, 'server/src/chainwriter.js'));

const src = fs.readFileSync(path.join(REPO, 'contracts/BroTownScores.sol'), 'utf8');
const out = JSON.parse(solc.compile(JSON.stringify({
  language:'Solidity', sources:{'S.sol':{content:src}},
  settings:{optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['evm.bytecode.object']}}}})));
const C = out.contracts['S.sol'].BroTownScores;

const PRIV = normalizePrivKey('0x'+'01'.repeat(31)+'23');
const SIGNER = privToAddress(PRIV);
const evm = await EVM.create();
const dep = await evm.runCall({ data: hexToBytes('0x'+C.evm.bytecode.object+'00'.repeat(12)+SIGNER.slice(2)), gasLimit: 10000000n });
if (dep.execResult.exceptionError) throw new Error('deploy: '+dep.execResult.exceptionError);
const addr = new Address(hexToBytes('0x'+'ab'.repeat(20)));
await evm.stateManager.putContractCode(addr, dep.execResult.returnValue);
const CONTRACT = bytesToHex(addr.bytes);

function be(v,w){let n=BigInt(v);const o=new Uint8Array(w);for(let i=w-1;i>=0;i--){o[i]=Number(n&0xffn);n>>=8n;}return o;}
function cat(a){const t=a.reduce((s,x)=>s+x.length,0);const o=new Uint8Array(t);let i=0;for(const x of a){o.set(x,i);i+=x.length;}return o;}
const hex=u=>Buffer.from(u).toString('hex');
let pass=0, fail=0;
const ok=(n,c,d='')=>{ if(c){pass++;console.log('  PASS '+n);} else {fail++;console.log('  FAIL '+n+'  '+d);} };

async function call(data){ return evm.runCall({ to: addr, data, gasLimit: 8000000n }); }
async function send(skills, values, nonce, {badSig=false}={}){
  const player = playerKey('bp_alpha');
  const dg = scoreDigest({chainId:1, contract:CONTRACT, player, skills, values, nonce});
  let sig = await signDigest(dg, PRIV);
  if (badSig) { sig = new Uint8Array(sig); sig[5] ^= 0xff; }
  return call(encodeRecordScore({player, skills, values, nonce, sig}));
}
async function readLevel(pid, skill){
  const r = await call(cat([selector('levels(bytes32,bytes32)'), playerKey(pid), skillKey(skill)]));
  return Number(BigInt('0x'+hex(r.execResult.returnValue)));
}
async function readU(sig){ const r = await call(selector(sig)); return Number(BigInt('0x'+hex(r.execResult.returnValue))); }

console.log('\n— happy path —');
const SK=['melee','bow','magic','fishing','woodcutting','mining','farming','cooking','blacksmithing','woodworking','gemCutting','enchanting','trapping','kills'];
const V =[ 42,     7,     3,      61,        18,           9,       4,        22,        11,             6,             2,           15,          1,        4271];
let r = await send(SK, V, 1);
ok('14-skill write succeeds', !r.execResult.exceptionError, String(r.execResult.exceptionError));
console.log('    gas used:', r.execResult.executionGasUsed.toString());
ok('melee stored', await readLevel('bp_alpha','melee') === 42);
ok('trapping stored', await readLevel('bp_alpha','trapping') === 1);
ok('kills stored', await readLevel('bp_alpha','kills') === 4271);
ok('playerCount = 1', await readU('playerCount()') === 1);
ok('skillCount = 14', await readU('skillCount()') === 14, String(await readU('skillCount()')));

console.log('\n— rejections —');
r = await send(['melee'],[50],1);
ok('stale nonce reverts', !!r.execResult.exceptionError);
r = await send(['melee'],[41],2);
ok('non-monotonic reverts', !!r.execResult.exceptionError);
r = await send(['melee'],[50],2,{badSig:true});
ok('bad signature reverts', !!r.execResult.exceptionError);
r = await send([],[],2);
ok('empty update reverts', !!r.execResult.exceptionError);

console.log('\n— partial update (only what changed) —');
r = await send(['melee','kills'],[50,5000],2);
ok('partial write succeeds', !r.execResult.exceptionError, String(r.execResult.exceptionError));
console.log('    gas used:', r.execResult.executionGasUsed.toString());
ok('melee raised to 50', await readLevel('bp_alpha','melee') === 50);
ok('untouched fishing still 61', await readLevel('bp_alpha','fishing') === 61);
ok('skillCount still 14', await readU('skillCount()') === 14);

console.log('\n— equal value is accepted (idempotent resend) —');
r = await send(['fishing'],[61],3);
ok('resending an unchanged value succeeds', !r.execResult.exceptionError, String(r.execResult.exceptionError));

console.log('\n— a NEW skill needs no contract change —');
r = await send(['beekeeping'],[1],4);
ok('unknown future skill accepted', !r.execResult.exceptionError, String(r.execResult.exceptionError));
ok('beekeeping readable', await readLevel('bp_alpha','beekeeping') === 1);
ok('skillCount grew to 15', await readU('skillCount()') === 15);

console.log('\n— fixture for server/test/chainwriter.test.mjs —');
{
  const player = playerKey('bp_fixture');
  const fs2 = ['melee', 'fishing', 'kills'];
  const fv = [12, 5, 900];
  console.log('  contract  :', CONTRACT);
  console.log('  chainId   : 1');
  console.log('  digest    :', hex(scoreDigest({ chainId: 1, contract: CONTRACT, player, skills: fs2, values: fv, nonce: 7 })));
  const dcd = cat([
    selector('digest(bytes32,bytes32[],uint32[],uint64)'),
    player, be(4 * 32, 32), be(4 * 32 + 32 + fs2.length * 32, 32), be(7, 32),
    be(fs2.length, 32), ...fs2.map(skillKey),
    be(fv.length, 32), ...fv.map((v) => be(v, 32)),
  ]);
  const rr = await call(dcd);
  console.log('  solidity  :', hex(rr.execResult.returnValue));
}

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
