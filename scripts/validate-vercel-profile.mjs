import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'README.md',
  'docs/adoption.md',
  'docs/vercel.md',
  'docs/vercel-on-demand-preview.md',
  'docs/vercel-fixed-staging.md',
  'templates/vercel/vercel-git.json',
  'templates/vercel/vite-spa-vercel.json',
  'templates/vercel/on-demand-preview/preview.yml',
  'templates/vercel/on-demand-preview/on-demand-preview.mjs',
];

const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => readFileSync(path, 'utf8');

for (const path of requiredFiles) {
  if (!existsSync(path)) fail(`missing Vercel profile file: ${path}`);
}

function readJson(path) {
  try {
    return JSON.parse(read(path));
  } catch (error) {
    fail(`${path} must be valid JSON: ${error.message}`);
    return null;
  }
}

function validateDeploymentPolicy(path, { requireSpaRewrite = false } = {}) {
  const config = readJson(path);
  if (!config) return;

  if (config.$schema !== 'https://openapi.vercel.sh/vercel.json') {
    fail(`${path} must use the Vercel configuration schema`);
  }

  const policy = config.git?.deploymentEnabled;
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    fail(`${path} git.deploymentEnabled must be a branch-rule mapping`);
  } else {
    const keys = Object.keys(policy).sort();
    const expectedKeys = ['**', 'main', 'preview/**'].sort();
    if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
      fail(`${path} default git.deploymentEnabled must define only **, main, and preview/**`);
    }
    if (policy['**'] !== false) {
      fail(`${path} must disable ordinary Git deployment with ** so slash-containing branches are covered`);
    }
    if (policy.main !== true) fail(`${path} must enable Git deployment for main`);
    if (policy['preview/**'] !== true) {
      fail(`${path} must enable only trusted preview/** refs for default non-Production hosting`);
    }
    if (Object.hasOwn(policy, 'staging')) {
      fail(`${path} default profile must not enable optional Fixed Staging`);
    }
  }

  if (requireSpaRewrite) {
    const rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];
    const hasSpaFallback = rewrites.some(
      (rewrite) => rewrite?.source === '/(.*)' && rewrite?.destination === '/index.html',
    );
    if (!hasSpaFallback) fail(`${path} must preserve the Vite SPA fallback rewrite`);
  }
}

validateDeploymentPolicy('templates/vercel/vercel-git.json');
validateDeploymentPolicy('templates/vercel/vite-spa-vercel.json', { requireSpaRewrite: true });

const docs = Object.fromEntries([
  'README.md',
  'docs/adoption.md',
  'docs/vercel.md',
  'docs/vercel-on-demand-preview.md',
  'docs/vercel-fixed-staging.md',
].map((path) => [path, read(path)]));

for (const [path, text] of Object.entries(docs)) {
  if (!text.includes('git.deploymentEnabled')) {
    fail(`${path} must reference the repository-owned Vercel deployment policy`);
  }
}

for (const path of ['docs/adoption.md', 'docs/vercel.md', 'docs/vercel-on-demand-preview.md']) {
  const text = docs[path];
  if (!text.includes('Preview') || !text.includes('Branch Tracking')) {
    fail(`${path} must document the Vercel Preview/Branch Tracking provider-side gate`);
  }
  if (!text.includes('post-adoption smoke')) {
    fail(`${path} must require a post-adoption smoke before the default profile is complete`);
  }
}

const vercelContract = docs['docs/vercel.md'];
for (const marker of [
  'slash-containing',
  '`**`',
  '`preview/pr-N`',
  '/preview',
  'exact PR HEAD A',
  'parent(B)=A',
  'client_payload.url',
  'no Vercel deployment',
  'Production deployment',
  'Optional Fixed Staging',
]) {
  if (!vercelContract.includes(marker)) {
    fail(`docs/vercel.md must preserve the default Hosted Review evidence: ${marker}`);
  }
}

const onDemand = docs['docs/vercel-on-demand-preview.md'];
for (const marker of [
  'write`, `maintain`, or `admin`',
  'checkout_ref',
  'parent(B) = A',
  'tree(B)   = tree(A)',
  'diff(A,B) = empty',
  'repository_dispatch',
  'client_payload.url',
  'VERCEL_PROJECT_NAME',
  'Production credentials',
  'no Vercel deployment/status',
]) {
  if (!onDemand.includes(marker)) {
    fail(`docs/vercel-on-demand-preview.md missing contract marker: ${marker}`);
  }
}

const fixed = docs['docs/vercel-fixed-staging.md'];
for (const marker of [
  '**optional**',
  '"staging": true',
  'exact PR HEAD A',
  'Foundation-Fixed-Staging-PR:',
  'close-time PR HEAD',
  'fixed-staging-deploy-slot',
  '--force-with-lease',
]) {
  if (!fixed.includes(marker)) {
    fail(`docs/vercel-fixed-staging.md missing optional-profile hardening marker: ${marker}`);
  }
}

const staleMarkers = new Map([
  ['README.md', ['automatic Git deployment is intentionally limited to **`main` and `staging` only**', 'used as the default hosted non-Production review surface']],
  ['docs/adoption.md', ['`staging` -> Fixed Staging hosted review;\n- every other branch', 'Fixed Staging is the default hosted non-Production review path']],
  ['docs/vercel.md', ['default hosted topology is deliberately limited to two Git branches', '`staging` -> the single fixed non-Production review slot']],
  ['docs/vercel-fixed-staging.md', ['This profile defines the single hosted non-Production review slot used by the default Vercel hosting contract']],
]);

for (const [path, markers] of staleMarkers) {
  for (const marker of markers) {
    if (docs[path].includes(marker)) fail(`${path} contains retired default-Staging guidance: ${marker}`);
  }
}

if (failures.length) {
  console.error('Vercel profile validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Vercel On-demand Preview default profile is valid.');
