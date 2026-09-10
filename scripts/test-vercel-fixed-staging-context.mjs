import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

test('Fixed Staging keeps runner-scoped request paths at step scope', () => {
  const workflow = parseYaml(
    readFileSync('templates/vercel/fixed-staging/deploy-staging.yml', 'utf8'),
  );
  const deploy = workflow.jobs?.deploy;
  assert.ok(deploy, 'publisher deploy job must exist');
  assert.equal(
    deploy.env?.STAGING_REQUEST_FILE,
    undefined,
    'runner.temp must not be evaluated from job-level env',
  );

  const move = deploy.steps?.find(
    (step) => step?.name === 'Move fixed Staging slot to PR HEAD',
  );
  assert.ok(move, 'publisher must contain the Staging ref mutation step');
  assert.equal(
    move.env?.STAGING_REQUEST_FILE,
    '${{ runner.temp }}/fixed-staging-request/request.json',
  );
});
