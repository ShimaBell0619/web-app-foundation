import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

test('Fixed Staging keeps runner-scoped artifact paths at step scope', () => {
  const workflow = parseYaml(
    readFileSync('templates/vercel/fixed-staging/deploy-staging.yml', 'utf8'),
  );
  const resolve = workflow.jobs?.resolve;
  assert.ok(resolve, 'publisher resolve job must exist');
  assert.equal(
    resolve.env?.STAGING_REQUEST_FILE,
    undefined,
    'runner.temp must not be evaluated from job-level env',
  );

  const step = resolve.steps?.find(
    (candidate) => candidate?.name === 'Resolve exact Staging source',
  );
  assert.ok(step, 'publisher must resolve the exact source before validation');
  assert.equal(
    step.env?.STAGING_REQUEST_FILE,
    '${{ runner.temp }}/fixed-staging-request/request.json',
  );
});
