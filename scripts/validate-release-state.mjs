import { readFileSync } from 'node:fs';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
const failures=[];
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) failures.push('invalid semver');
if (pkg.version!==lock.version || pkg.version!==lock.packages?.['']?.version) failures.push('lock mismatch');
const escaped=String(pkg.version).replace(/\./g,'\\.');
const changelog=readFileSync('CHANGELOG.md','utf8');
if (!new RegExp('^## '+escaped+'(?:\\s+-\\s+\\d{4}-\\d{2}-\\d{2})?\\s*$','m').test(changelog)) failures.push('missing CHANGELOG entry');
if(failures.length){failures.forEach(x=>console.error(x));process.exitCode=1;}
else console.log('Release metadata matches '+pkg.version);
