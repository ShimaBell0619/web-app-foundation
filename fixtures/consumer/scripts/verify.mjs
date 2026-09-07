import proof from '@foundation/ci-install-proof';

const gate = process.argv[2];
if (proof !== 'installed') throw new Error('npm ci did not install the fixture dependency');
if (!['check', 'typecheck', 'test', 'build'].includes(gate)) throw new Error(`unexpected gate: ${gate}`);
console.log(`consumer fixture ${gate} passed`);
