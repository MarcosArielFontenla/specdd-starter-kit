import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateEval, validateResult, normalizeScore, captureEvidence, definitionFingerprint, localResult, classificationResult, gateSatisfied } from '../dist/index.js';
import { compileWarpScorer, importWarpClassification } from '../dist/warp.js';
const read = name => JSON.parse(readFileSync(new URL(`../examples/${name}.eval.json`, import.meta.url)));
const ctx = {runId:'run-1',inputRef:'commit:abc',observedAt:'2026-09-05T00:00:00Z'};
const obs = {exitCode:0,signal:null,timedOut:false,launchError:null,stdout:'16 tests passed',stderr:''};
const binding = {passLabel:'passed',failLabel:'failed'};
test('host wrapper executes actual passing and failing Node test processes',()=>{
  const path = relative => fileURLToPath(new URL(relative, import.meta.url));
  for (const [fixture, code, outcome] of [['passing',0,'pass'],['failing',1,'fail']]) {
    const child = spawnSync(process.execPath,[path('../scripts/run-local.mjs'),path('../examples/documentation.eval.json'),path(`./fixtures/${fixture}.mjs`),'fixture:explicit','fixture-run','passed','failed'],{encoding:'utf8',timeout:10000,windowsHide:true});
    assert.equal(child.status,code,child.stderr);
    const result=JSON.parse(child.stdout);assert.equal(result.outcome,outcome);assert.equal(validateResult(result),true);
  }
});
test('real pilot result example validates and binds to its canonical definition',()=>{
  const result=JSON.parse(readFileSync(new URL('../examples/local-run.result.json',import.meta.url)));
  assert.equal(validateResult(result),true);assert.equal(gateSatisfied({evalRef:'implementation-quality',mode:'required',requiredOutcome:'pass'},read('documentation'),result,result),true);
});
test('examples satisfy published canonical schema',()=>{for(const name of ['documentation','review']) assert.equal(validateEval(read(name)).valid,true);});
test('unknown nested fields, duplicate labels, empty rubric, bad scores and one-sided thresholds reject',()=>{
  for(const mutate of [d=>d.labels[0].vendor='x',d=>d.labels[1].id=d.labels[0].id,d=>d.rubric=' ',d=>d.labels[0].score=NaN,d=>d.passingScore=0,d=>d.labels[0].score=2]){const d=read('review');mutate(d);assert.equal(validateEval(d).valid,false);}
});
test('normalization is bounded and never clamps invalid inputs',()=>{
  assert.equal(normalizeScore(75,0,100),.75);assert.equal(normalizeScore(75,0,100,'lower'),.25);assert.equal(normalizeScore(0,-Number.MAX_VALUE,Number.MAX_VALUE),.5);
  for(const args of [[NaN,0,1],[2,0,1],[0,1,1],[0,1,0],[Infinity,0,1]]) assert.throws(()=>normalizeScore(...args));
});
test('definition fingerprint ignores object key order but preserves semantic changes',()=>{
  const d=read('review');assert.equal(definitionFingerprint(d),definitionFingerprint(Object.fromEntries(Object.entries(d).reverse())));const before=definitionFingerprint(d);d.rubric+=' Changed';assert.notEqual(before,definitionFingerprint(d));
});
test('evidence captures hash and bytes, not raw secret-bearing logs',()=>{const e=captureEvidence('secret');assert.equal(e.bytes,6);assert.match(e.sha256,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(e).includes('secret'),false);});
test('local observed success and nonzero failure map explicitly',()=>{const d=read('documentation');const p=localResult(d,ctx,obs,binding);assert.equal(p.outcome,'pass');assert.equal(validateResult(p),true);assert.equal(localResult(d,ctx,{...obs,exitCode:1},binding).outcome,'fail');});
test('timeout, signal, launch failure and missing exit cannot become scores',()=>{
  for(const change of [{timedOut:true},{signal:'SIGTERM'},{launchError:'missing executable'},{exitCode:null}]){const r=localResult(read('documentation'),ctx,{...obs,...change},binding);assert.equal(r.outcome,'error');assert.equal(r.score,null);assert.equal(validateResult(r),true);}
});
test('invalid observations, binding and identities reject',()=>{
  assert.throws(()=>localResult(read('documentation'),ctx,{...obs,exitCode:.5},binding));assert.throws(()=>localResult(read('documentation'),ctx,obs,{passLabel:'failed',failLabel:'passed'}));assert.throws(()=>localResult(read('documentation'),{...ctx,runId:''},obs,binding));
});
test('classification imports require declared labels and nonempty evidence',()=>{const d=read('review');assert.equal(importWarpClassification(d,ctx,'supported','actual observed record').score,1);assert.throws(()=>classificationResult(d,ctx,'unknown','record'));assert.throws(()=>classificationResult(d,ctx,'supported',''));assert.throws(()=>importWarpClassification(read('documentation'),ctx,'passed','record'));});
test('gate binding rejects wrong run, stale definition and fabricated score',()=>{
  const d=read('documentation');const r=localResult(d,ctx,obs,binding);const gate={evalRef:d.id,mode:'required',requiredOutcome:'pass'};
  assert.equal(gateSatisfied(gate,d,r,ctx),true);
  for(const change of [{runId:'other'},{inputRef:'other'},{score:.8},{definitionSha256:'0'.repeat(64)},{evidence:null},{outcome:'error'}])assert.equal(gateSatisfied(gate,d,{...r,...change},ctx),false);
  assert.equal(gateSatisfied(gate,d,localResult(d,ctx,{...obs,exitCode:1},binding),ctx),false);
  assert.equal(gateSatisfied({...gate,mode:'advisory'},d,localResult(d,ctx,{...obs,exitCode:1},binding),ctx),true);
});
test('Warp projection is deterministic, preserves contracts, and is side-effect free',()=>{
  const d=read('review');const b={agents:['reviewer'],model:'explicit-review-model',samplingRate:25};const r=compileWarpScorer(d,b);
  assert.deepEqual(r,compileWarpScorer(d,b));const text=r.files['scorers/review-evidence/scorer.md'];assert.ok(text.includes(d.rubric));assert.match(text,/selfImprovement: false/);assert.match(text,/output: classification/);assert.equal(r.externalWritesPerformed,false);
  assert.throws(()=>compileWarpScorer(read('documentation'),b));assert.throws(()=>compileWarpScorer(d,{...b,model:''}));assert.throws(()=>compileWarpScorer(d,{...b,samplingRate:101}));assert.throws(()=>compileWarpScorer(d,{...b,agents:['../escape']}));
});
test('checked-in optional scorer is byte-identical to the compiler output',()=>{
  const binding=JSON.parse(readFileSync(new URL('../examples/warp-binding.json',import.meta.url)));
  const result=compileWarpScorer(read('review'),binding);
  assert.equal(result.files['scorers/review-evidence/scorer.md'],readFileSync(new URL('../examples/generated/scorers/review-evidence/scorer.md',import.meta.url),'utf8'));
});
