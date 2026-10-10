import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
const files=readdirSync('.github/workflows').filter(x=>/\.ya?ml$/.test(x)).sort();
test('only two ordinary Foundation workflows are active',()=>assert.deepEqual(files,['ci.yml','web-ci.yml']));
for(const filename of files){
  const workflow=parseYaml(readFileSync('.github/workflows/'+filename,'utf8'));
  test(filename+' has a read-only trust boundary',()=>{
    assert.equal(workflow.permissions?.contents,'read');
    for(const job of Object.values(workflow.jobs||{})){
      assert.notEqual(job.permissions?.contents,'write');
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
