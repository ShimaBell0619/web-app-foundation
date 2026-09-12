import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'README.md',
  'docs/adoption.md',
  'docs/vercel.md',
  'docs/vercel-fixed-staging.md',
  'templates/vercel/vercel-git.json',
  'templates/vercel/vite-spa-vercel.json',
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
    const expectedKeys = ['*', 'main', 'staging'];
    if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
      fail(`${path} git.deploymentEnabled must define only *, main, and staging`);
    }
    if (policy['*'] !== false) fail(`${path} must disable Git deployment for all branches by default`);
    if (policy.main !== true) fail(`${path} must enable Git deployment for main`);
    if (policy.staging !== true) fail(`${path} must enable Git deployment for staging`);
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

const docs = {
  'README.md': read('README.md'),
  'docs/adoption.md': read('docs/adoption.md'),
  'docs/vercel.md': read('docs/vercel.md'),
  'docs/vercel-fixed-staging.md': read('docs/vercel-fixed-staging.md'),
};

for (const [path, text] of Object.entries(docs)) {
  if (!text.includes('git.deploymentEnabled')) {
    fail(`${path} must reference the repository-owned Vercel deployment policy`);
  }
}

const providerGateDocs = ['docs/adoption.md', 'docs/vercel.md', 'docs/vercel-fixed-staging.md'];
for (const path of providerGateDocs) {
  const text = docs[path];
  if (!text.includes('Preview') || !text.includes('Branch Tracking')) {
    fail(`${path} must document the Vercel Preview Branch Tracking provider-side gate`);
  }
  if (!text.includes('post-adoption smoke')) {
    fail(`${path} must require a post-adoption smoke before the staging-only profile is complete`);
  }
}

const vercelContract = docs['docs/vercel.md'];
for (const marker of [
  'ordinary feature branch',
  'no Vercel deployment',
  '`staging`',
  'hosted review deployment',
  '`main`',
  'Production deployment',
]) {
  if (!vercelContract.includes(marker)) {
    fail(`docs/vercel.md must preserve the three-path post-adoption smoke evidence: ${marker}`);
  }
}

const staleMarkers = new Map([
  ['README.md', ['ordinary ephemeral PR Preview', 'optional fixed-origin Staging slot']],
  ['docs/adoption.md', ['keep ordinary PR previews', 'branch/PR Preview deployment', 'keep normal PR Preview']],
  ['docs/vercel.md', ['ordinary PR Preview intact', 'Ephemeral PR Preview: the Vercel-provided Preview URL', 'branch/PR Preview']],
  ['docs/vercel-fixed-staging.md', ['keeps ordinary Vercel PR Preview', 'ordinary Vercel PR Preview', 'ordinary PR Preview continues unchanged']],
]);

for (const [path, markers] of staleMarkers) {
  for (const marker of markers) {
    if (docs[path].includes(marker)) fail(`${path} contains retired Preview guidance: ${marker}`);
  }
}

if (failures.length) {
  console.error('Vercel profile validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Vercel staging-only deployment profile is valid.');
