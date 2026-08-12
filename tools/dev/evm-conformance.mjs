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
  settings:{optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['evm.bytecode.object','evm.methodIdentifiers']}}}})));
const C = out.contracts['S.sol'].BroTownScores;

/* v2.3.1682: the pragma is PINNED (0.8.26); refuse to certify anything a
   different compiler produced — a pass from the wrong solc would be exactly
   the false confidence this harness exists to prevent. */
{
  const v = solc.version();
  if (!v.startsWith('0.8.26')) throw new Error('need solc 0.8.26 (pinned pragma); CWD has ' + v);
}

const PRIV = normalizePrivKey('0x'+'01'.repeat(31)+'23');
const SIGNER = privToAddress(PRIV);
/* The guardian never signs anything in these tests — an EVM caller address
   is enough, since auth is msg.sender, not a signature. */
const GUARDIAN_ADDR = '0x'+'0d'.repeat(20);
const RANDO_ADDR = '0x'+'0e'.repeat(20);
const evm = await EVM.create();
const ctorArgs = (signerHex, guardianHex) =>
  '00'.repeat(12)+signerHex.slice(2)+'00'.repeat(12)+guardianHex.slice(2);
const dep = await evm.runCall({ data: hexToBytes('0x'+C.evm.bytecode.object+ctorArgs(SIGNER, GUARDIAN_ADDR)), gasLimit: 10000000n });
if (dep.execResult.exceptionError) throw new Error('deploy: '+dep.execResult.exceptionError);
const addr = new Address(hexToBytes('0x'+'ab'.repeat(20)));
await evm.stateManager.putContractCode(addr, dep.execResult.returnValue);
/* v2.3.1682: the code transplant to the fixture address (the digest binds
   address(this), and the pinned constant in chainwriter.test.mjs was minted
   against 0xab…ab) carries the runtime bytecode — which bakes in the
   IMMUTABLE guardian but NOT the signer, which is ordinary storage now that
   it can rotate.  The constructor's SSTORE happened at the throwaway deploy
   address, so seed slot 0 (signer is the first storage variable) here.
   Without this every valid signature "mismatches" a zero signer. */
await evm.stateManager.putContractStorage(addr, be(0, 32), hexToBytes('0x'+'00'.repeat(12)+SIGNER.slice(2)));
const CONTRACT = bytesToHex(addr.bytes);

function be(v,w){let n=BigInt(v);const o=new Uint8Array(w);for(let i=w-1;i>=0;i--){o[i]=Number(n&0xffn);n>>=8n;}return o;}
function cat(a){const t=a.reduce((s,x)=>s+x.length,0);const o=new Uint8Array(t);let i=0;for(const x of a){o.set(x,i);i+=x.length;}return o;}
const hex=u=>Buffer.from(u).toString('hex');
let pass=0, fail=0;
const ok=(n,c,d='')=>{ if(c){pass++;console.log('  PASS '+n);} else {fail++;console.log('  FAIL '+n+'  '+d);} };

async function call(data, caller){
  const opts = { to: addr, data, gasLimit: 8000000n };
  if (caller) opts.caller = new Address(hexToBytes(caller));
  return evm.runCall(opts);
}
async function send(skills, values, nonce, {badSig=false, highS=false, shortSig=false, pid='bp_alpha', priv=PRIV}={}){
  const player = playerKey(pid);
  const dg = scoreDigest({chainId:1, contract:CONTRACT, player, skills, values, nonce});
  let sig = await signDigest(dg, priv);
  if (badSig) { sig = new Uint8Array(sig); sig[5] ^= 0xff; }
  if (highS) {
    /* Flip s to the high half of the curve (s' = N - s, v' flipped).  Under
       malleable verification this recovers the SAME address; the EIP-2 check
       must reject it anyway — that is the whole point of the check. */
    const N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    sig = new Uint8Array(sig);
    const s = BigInt('0x'+hex(sig.slice(32,64)));
    sig.set(be(N - s, 32), 32);
    sig[64] = sig[64] === 27 ? 28 : 27;
  }
  if (shortSig) sig = new Uint8Array(sig).slice(0, 64);
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
/* v2.3.1682: the audit's coverage gaps — each of these paths existed and
   was simply never exercised. */
{
  const player = playerKey('bp_alpha');
  const dg = scoreDigest({chainId:1, contract:CONTRACT, player, skills:['melee'], values:[50], nonce:2});
  const sig = await signDigest(dg, PRIV);
  /* encodeRecordScore refuses mismatched lengths (it would be encoding a
     lie), so LengthMismatch calldata is hand-built: two keys, one value. */
  const cd = cat([
    selector('recordScore(bytes32,bytes32[],uint32[],uint64,bytes)'),
    player, be(5*32,32), be(5*32+32+2*32,32), be(2,32), be(5*32+32+2*32+32+1*32,32),
    be(2,32), skillKey('melee'), skillKey('bow'),
    be(1,32), be(50,32),
    be(65,32), sig, new Uint8Array(31),
  ]);
  r = await call(cd);
  ok('mismatched array lengths revert', !!r.execResult.exceptionError);
}
r = await send(['melee'],[50],2,{highS:true});
ok('malleable high-s signature rejected (EIP-2)', !!r.execResult.exceptionError);
r = await send(['melee'],[50],2,{shortSig:true});
ok('64-byte signature rejected', !!r.execResult.exceptionError);
/* v2.3.1682: duplicate keys in ONE call.  The old pre-pass guard checked
   both entries against the SAME stored value, so ("melee",50),("melee",45)
   over a stored 42 passed and last-write-wins stored 45 — below the 50 the
   very same message attested.  The in-loop guard sees 45 < 50 (the value
   just written) and reverts. */
r = await send(['melee','melee'],[50,45],2);
ok('duplicate keys cannot end below the attested max', !!r.execResult.exceptionError);
ok('...and the failed attempt wrote nothing', await readLevel('bp_alpha','melee') === 42);
r = await send(['melee','melee'],[48,48],2);   // consumes nonce 2
ok('duplicate keys with EQUAL values still pass (>= guard)', !r.execResult.exceptionError, String(r.execResult.exceptionError));

console.log('\n— partial update (only what changed) —');
r = await send(['melee','kills'],[50,5000],3);
ok('partial write succeeds', !r.execResult.exceptionError, String(r.execResult.exceptionError));
console.log('    gas used:', r.execResult.executionGasUsed.toString());
ok('melee raised to 50', await readLevel('bp_alpha','melee') === 50);
ok('untouched fishing still 61', await readLevel('bp_alpha','fishing') === 61);
ok('skillCount still 14', await readU('skillCount()') === 14);

console.log('\n— equal value is accepted (idempotent resend) —');
r = await send(['fishing'],[61],4);
ok('resending an unchanged value succeeds', !r.execResult.exceptionError, String(r.execResult.exceptionError));

console.log('\n— a NEW skill needs no contract change —');
r = await send(['beekeeping'],[1],5);
ok('unknown future skill accepted', !r.execResult.exceptionError, String(r.execResult.exceptionError));
ok('beekeeping readable', await readLevel('bp_alpha','beekeeping') === 1);
ok('skillCount grew to 15', await readU('skillCount()') === 15);

console.log('\n— a second player is independent (v2.3.1682) —');
r = await send(['melee'],[9],1,{pid:'bp_beta'});
ok('second player, nonce restarting at 1, accepted', !r.execResult.exceptionError, String(r.execResult.exceptionError));
ok('playerCount = 2', await readU('playerCount()') === 2);
ok("beta's melee is 9", await readLevel('bp_beta','melee') === 9);
ok("alpha's melee untouched at 50", await readLevel('bp_alpha','melee') === 50);

console.log('\n— reads a UI would make (v2.3.1682) —');
{
  /* page(melee, 0, 10): keys+levels in insertion order. */
  const r2 = await call(cat([selector('page(bytes32,uint256,uint256)'), skillKey('melee'), be(0,32), be(10,32)]));
  const words = hex(r2.execResult.returnValue).match(/.{64}/g) || [];
  // ret words: [0]=off(keys) [1]=off(out) [2]=keys.len [3][4]=keys [5]=out.len [6][7]=levels
  ok('page() returns both players', words[2] && Number(BigInt('0x'+words[2])) === 2, words[2]);
  ok('page() first key is alpha', words[3] === hex(playerKey('bp_alpha')), words[3]);
  ok('page() first level is 50', words[6] && Number(BigInt('0x'+words[6])) === 50, words[6]);
}
{
  /* playerSkills(alpha, [melee, beekeeping]) → [50, 1]. */
  const cd = cat([
    selector('playerSkills(bytes32,bytes32[])'),
    playerKey('bp_alpha'), be(64,32),
    be(2,32), skillKey('melee'), skillKey('beekeeping'),
  ]);
  const r2 = await call(cd);
  const words = hex(r2.execResult.returnValue).match(/.{64}/g) || [];
  ok('playerSkills() batches reads', words.length === 4
    && Number(BigInt('0x'+words[2])) === 50 && Number(BigInt('0x'+words[3])) === 1,
    words.join(','));
}

console.log('\n— constructor guards (v2.3.1682) —');
{
  const zero = '0x'+'00'.repeat(20);
  let d = await evm.runCall({ data: hexToBytes('0x'+C.evm.bytecode.object+ctorArgs(zero, GUARDIAN_ADDR)), gasLimit: 10000000n });
  ok('zero signer refused at deploy', !!d.execResult.exceptionError);
  d = await evm.runCall({ data: hexToBytes('0x'+C.evm.bytecode.object+ctorArgs(SIGNER, zero)), gasLimit: 10000000n });
  ok('zero guardian refused at deploy', !!d.execResult.exceptionError);
}

console.log('\n— signer rotation (v2.3.1682) — LAST: it retires the test key —');
const readAddr = async (sig) => {
  const r2 = await call(selector(sig));
  return '0x'+hex(r2.execResult.returnValue).slice(24);
};
{
  const PRIV2 = normalizePrivKey('0x'+'02'.repeat(31)+'47');
  const SIGNER2 = privToAddress(PRIV2);
  const rot = (a) => cat([selector('rotateSigner(address)'), hexToBytes('0x'+'00'.repeat(12)+a.slice(2))]);
  ok('guardian() reads back', (await readAddr('guardian()')) === GUARDIAN_ADDR.toLowerCase());
  ok('signer() reads back', (await readAddr('signer()')) === SIGNER.toLowerCase());
  r = await call(rot(SIGNER2), RANDO_ADDR);
  ok('a non-guardian cannot rotate', !!r.execResult.exceptionError);
  r = await call(rot('0x'+'00'.repeat(20)), GUARDIAN_ADDR);
  ok('rotating to the zero address is refused', !!r.execResult.exceptionError);
  ok('signer unchanged after both refusals', (await readAddr('signer()')) === SIGNER.toLowerCase());
  r = await call(rot(SIGNER2), GUARDIAN_ADDR);
  ok('the guardian rotates the signer', !r.execResult.exceptionError, String(r.execResult.exceptionError));
  ok('signer() now reads the new key', (await readAddr('signer()')) === SIGNER2.toLowerCase());
  r = await send(['melee'],[51],6);
  ok('the OLD key is dead here — its signature now reverts', !!r.execResult.exceptionError);
  r = await send(['melee'],[51],6,{priv:PRIV2});
  ok('the NEW key signs successfully', !r.execResult.exceptionError, String(r.execResult.exceptionError));
  ok('melee advanced under the new key', await readLevel('bp_alpha','melee') === 51);
  ok('history untouched by rotation (fishing still 61)', await readLevel('bp_alpha','fishing') === 61);
  ok('guardian is not rotatable — still the same address', (await readAddr('guardian()')) === GUARDIAN_ADDR.toLowerCase());
}

console.log('\n— selectors for the worker (pin these in chainwriter.test.mjs) —');
{
  const ids = C.evm.methodIdentifiers || (out.contracts['S.sol'].BroTownScores.evm || {}).methodIdentifiers || {};
  for (const sig of ['recordScore(bytes32,bytes32[],uint32[],uint64,bytes)', 'nonces(bytes32)', 'signer()', 'levels(bytes32,bytes32)']) {
    console.log('  ' + (ids[sig] || '(missing)') + '  ' + sig);
    ok('JS selector matches solc for ' + sig, ids[sig] === hex(selector(sig)), hex(selector(sig)));
  }
}

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
