import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { validateLinks } from './validate-links.mjs';
const need=['AGENTS.md','README.md','package.json','package-lock.json','CHANGELOG.md','docs/README.md','docs/adoption.md','docs/operations.md','docs/ui.md','docs/azure.md','docs/maintaining.md','.github/workflows/ci.yml','.github/workflows/web-ci.yml','kits/vercel/README.md','kits/github/repository-create/README.md','kits/github/release/README.md'];
const errors=[];
const read=path=>readFileSync(path,'utf8');
for(const path of need)if(!existsSync(path))errors.push('missing '+path);
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
if(pkg.version!==lock.version||pkg.version!==lock.packages?.['']?.version)errors.push('version/lock inconsistent');
if(!read('AGENTS.md').includes('Workは明示指示のみ'))errors.push('missing Work explicit opt-in');
if(/^Foundation-Version:/m.test(read('AGENTS.md')))errors.push('remove AGENTS version mirror');
if(/Current Foundation version:/i.test(read('README.md')))errors.push('remove README version mirror');
const scan=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(join(dir,e.name)):[join(dir,e.name)]);
errors.push(...validateLinks('.', [...scan('docs'), ...scan('kits')].filter(s=>s.endsWith('.md') && s!=='kits/web/starter/README.md').concat(['README.md','AGENTS.md'])));
for(const path of [...scan('.github/workflows'),...scan('kits')].filter(x=>/\.ya?ml$/.test(x))){
 try{const v=parseYaml(read(path));if(!v||typeof v!=='object')errors.push('invalid YAML: '+path);}
 catch(e){errors.push('invalid YAML: '+path+' '+e.message);}
}
if(errors.length){errors.forEach(e=>console.error(e));process.exitCode=1;}
else console.log('Foundation semantic validation succeeded.');
