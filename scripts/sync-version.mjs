import { readFileSync, writeFileSync } from 'node:fs';
const read = path => readFileSync(path,'utf8');
const pkg=JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('invalid SemVer');
const lock=JSON.parse(read('package-lock.json'));
lock.version=pkg.version;
lock.packages[''].version=pkg.version;
writeFileSync('package-lock.json',JSON.stringify(lock,null,2)+'\n');
console.log('Synced package-lock.json to '+pkg.version);
