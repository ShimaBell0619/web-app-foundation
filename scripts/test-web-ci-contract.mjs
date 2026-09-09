import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

const workflow = parseYaml(readFileSync('.github/workflows/web-ci.yml', 'utf8'));
const verifySteps = workflow.jobs?.verify?.steps ?? [];
const checkout = verifySteps.find((step) => step?.name === 'Checkout');
const contract = verifySteps.find((step) => step?.name === 'Validate npm script contract');

if (!checkout) throw new Error('could not locate reusable CI checkout step');
if (checkout.with?.ref !== '${{ github.sha }}') {
  throw new Error('reusable CI must checkout the exact workflow-run SHA');
}
if (checkout.with?.['persist-credentials'] !== false) {
  throw new Error('reusable CI checkout must not persist credentials');
}
if (!contract?.run) throw new Error('could not locate reusable CI script-contract step');

const match = String(contract.run).match(/node <<'NODE'\n([\s\S]*?)\nNODE\s*$/);
if (!match) throw new Error('could not extract executable npm script-contract JavaScript');

const source = match[1];
const defaultScripts = {
  check: 'echo check',
  typecheck: 'echo typecheck',
  test: 'echo test',
  build: 'echo build',
  'test:e2e': 'echo e2e',
};

function withoutScript(name) {
  const scripts = { ...defaultScripts };
  delete scripts[name];
  return scripts;
}

function runCase(label, {
  scripts = defaultScripts,
  env = {},
  shouldPass,
}) {
  const dir = mkdtempSync(join(tmpdir(), 'web-ci-contract-'));
  try {
    writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ scripts }, null, 2)}\n`);
    const result = spawnSync(process.execPath, ['-e', source], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        RUN_CHECK: 'true',
        CHECK_OPT_OUT_REASON: '',
        RUN_TYPECHECK: 'true',
        TYPECHECK_OPT_OUT_REASON: '',
        RUN_TEST: 'true',
        TEST_OPT_OUT_REASON: '',
        RUN_E2E: 'false',
        ...env,
      },
    });
    const passed = result.status === 0;
    if (passed !== shouldPass) {
      throw new Error(`${label}: expected ${shouldPass ? 'success' : 'failure'}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

runCase('default required scripts', { shouldPass: true });

const requiredGates = [
  ['check', 'RUN_CHECK', 'CHECK_OPT_OUT_REASON'],
  ['typecheck', 'RUN_TYPECHECK', 'TYPECHECK_OPT_OUT_REASON'],
  ['test', 'RUN_TEST', 'TEST_OPT_OUT_REASON'],
];

for (const [scriptName, runEnv, reasonEnv] of requiredGates) {
  const scripts = withoutScript(scriptName);

  runCase(`missing ${scriptName}`, {
    scripts,
    shouldPass: false,
  });
  runCase(`${scriptName} opt-out with empty reason`, {
    scripts,
    env: { [runEnv]: 'false', [reasonEnv]: '' },
    shouldPass: false,
  });
  runCase(`${scriptName} opt-out with whitespace-only reason`, {
    scripts,
    env: { [runEnv]: 'false', [reasonEnv]: '   \t' },
    shouldPass: false,
  });
  runCase(`${scriptName} opt-out with explicit reason and script absent`, {
    scripts,
    env: { [runEnv]: 'false', [reasonEnv]: `Approved ${scriptName} opt-out` },
    shouldPass: true,
  });
}

runCase('build cannot be opted out', {
  scripts: { ...defaultScripts, build: undefined },
  env: {
    RUN_CHECK: 'false',
    CHECK_OPT_OUT_REASON: 'approved',
    RUN_TYPECHECK: 'false',
    TYPECHECK_OPT_OUT_REASON: 'approved',
    RUN_TEST: 'false',
    TEST_OPT_OUT_REASON: 'approved',
  },
  shouldPass: false,
});
runCase('E2E enabled without script', {
  scripts: { ...defaultScripts, 'test:e2e': undefined },
  env: { RUN_E2E: 'true' },
  shouldPass: false,
});
runCase('E2E enabled with script', {
  env: { RUN_E2E: 'true' },
  shouldPass: true,
});

console.log('Reusable Web CI script-contract tests passed.');
