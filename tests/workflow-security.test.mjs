import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
const files=readdirSync('.github/workflows').filter(x=>/\.ya?ml$/.test(x)).sort();
test('only two permanent workflows plus exact one-shot release are present',()=>assert.deepEqual(files,['ci.yml','publish-foundation-v012.yml','web-ci.yml']));
for(const filename of files.filter(f => f !== 'publish-foundation-v012.yml')){
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

test('temporary publisher cannot run except from explicit owner comment on Issue 98',()=>{
const w=parseYaml(readFileSync('.github/workflows/publish-foundation-v012.yml','utf8'));
assert.deepEqual(w.on?.issue_comment?.types,['created']);
assert.deepEqual(w.permissions,{contents:'read'});
const p=w.jobs.publish;
assert.deepEqual(p.permissions,{contents:'write',actions:'read'});
for(const marker of ["github.event.issue.number == 98","!github.event.issue.pull_request","github.event.comment.author_association == 'OWNER'","/publish-foundation-v0.12.0"])assert.ok(p.if.includes(marker),marker);
assert.equal(p.env.EXPECTED_VERSION,'0.12.0');
assert.equal(p.env.RELEASE_TAG,'v0.12.0');
const checks=p.steps.map(s=>String(s.run||'')).join('\n');
for(const marker of ['main moved','Foundation CI','head_branch=="main"','git/matching-refs/tags/','Refusing to move it','--verify-tag','--notes-file'])assert.ok(checks.includes(marker),marker);
for(const s of p.steps) if(s.uses)assert.match(s.uses,/@[0-9a-f]{40}$/i);
});
