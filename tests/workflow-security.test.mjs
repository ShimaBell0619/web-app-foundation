import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
const files=readdirSync('.github/workflows').filter(x=>/\.ya?ml$/.test(x)).sort();
test('Foundation provides its ordinary validation and reusable CI entry points',()=>{
  assert.ok(files.includes('ci.yml')); assert.ok(files.includes('web-ci.yml'));
});
for(const filename of files){
  const source=readFileSync('.github/workflows/'+filename,'utf8');
  const workflow=parseYaml(source);
  test(filename+' has a read-only trust boundary',()=>{
    assert.equal(workflow.permissions?.contents,'read');
    assert.ok(Object.values(workflow.permissions).every(value=>value==='read'||value==='none'));
    assert.doesNotMatch(source, /\bsecrets(?:\.|\[)/);
    for(const job of Object.values(workflow.jobs||{})){
      assert.equal(job.secrets,undefined);
      if(job.permissions)assert.ok(Object.values(job.permissions).every(value=>value==='read'||value==='none'));
      for(const step of job.steps||[]){
        if(step.uses&&!step.uses.startsWith('./'))assert.match(step.uses,/@[0-9a-f]{40}$/i);
        if(step.uses?.startsWith('actions/checkout@'))assert.equal(step.with?.['persist-credentials'],false);
      }
    }
  });
}
test('web-ci executes without inherited secrets',()=>{
const ci=parseYaml(readFileSync('.github/workflows/web-ci.yml','utf8'));
assert.ok(ci.on?.workflow_call);assert.equal(ci.env?.CI,'true');
assert.equal(ci.jobs.verify.secrets,undefined);
});
