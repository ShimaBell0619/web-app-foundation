import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const foundation = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(foundation, path), 'utf8');

export function createApp(target, { name, foundationSha }) {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(name || '')) throw new Error('名前は小文字英字から始まる64文字以内の英数字・ハイフンにしてください。');
  if (!/^[a-f0-9]{40}$/.test(foundationSha || '')) throw new Error('レビュー済みの40桁コミットSHAを指定してください。');
  const output = resolve(target);
  if (output === foundation || output.startsWith(foundation + sep)) throw new Error('Foundationの外に出力してください。');
  if (existsSync(output) && readdirSync(output).length) throw new Error('出力先は空ディレクトリにしてください。');
  const pkg = JSON.parse(read('kits/web/starter/package.json'));
  if (pkg.engines.node !== JSON.parse(read('package.json')).engines.node) throw new Error('starterとFoundationのNode engineが一致しません。');
  const templateSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: foundation, encoding: 'utf8' }).trim();
  const state = execFileSync('git', ['status', '--porcelain'], { cwd: foundation, encoding: 'utf8' }).trim() ? '作業ツリーに未コミット変更あり（正式採用前に再生成）' : 'commitと一致';
  const replacements = { __APP_NAME__: name, __FOUNDATION_SHA__: foundationSha, __TEMPLATE_SHA__: templateSha, __TEMPLATE_STATE__: state };
  mkdirSync(dirname(output), { recursive: true });
  const staging = mkdtempSync(join(dirname(output), '.foundation-create-'));
  try {
    cpSync(join(foundation, 'kits/web/starter'), staging, {
      recursive: true,
      filter: path => !['node_modules', 'dist', 'test-results', 'playwright-report'].includes(basename(path)),
    });
    for (const name of ['PRODUCT.md', 'DESIGN.md', 'AGENTS.md', 'VERIFICATION.md']) writeFileSync(join(staging, name), read('kits/web/' + name));
    mkdirSync(join(staging, '.github/workflows'), { recursive: true });
    writeFileSync(join(staging, '.github/workflows/ci.yml'), read('kits/web/ci.yml'));
    writeFileSync(join(staging, '.node-version'), read('.node-version'));
    cpSync(join(foundation, 'kits/vercel/simple.json'), join(staging, 'vercel.json'));
    for (const path of ['README.md', 'AGENTS.md', 'VERIFICATION.md', '.github/workflows/ci.yml']) {
      let text = readFileSync(join(staging, path), 'utf8');
      for (const [key, value] of Object.entries(replacements)) text = text.replaceAll(key, value);
      writeFileSync(join(staging, path), text);
    }
    pkg.name = name;
    const lock = JSON.parse(readFileSync(join(staging, 'package-lock.json'), 'utf8'));
    lock.name = name; lock.packages[''].name = name;
    for (const [path, value] of [['package.json', pkg], ['package-lock.json', lock]]) writeFileSync(join(staging, path), JSON.stringify(value, null, 2) + '\n');
    // 非空になった出力先はrmdirで拒否する。失敗時は作業用のコピーだけを除去する。
    if (existsSync(output)) rmdirSync(output);
    renameSync(staging, output);
    return { output, templateSha, foundationSha };
  } finally { rmSync(staging, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [target, ...args] = process.argv.slice(2);
    if (!target || args.length !== 4) throw new Error('使い方: node scripts/create-app.mjs <出力先> --name <名前> --foundation-sha <40桁SHA>');
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--name', '--foundation-sha'].includes(args[i]) || options[args[i]]) throw new Error('不明または重複するオプションです。');
      options[args[i]] = args[i + 1];
    }
    console.log(createApp(target, { name: options['--name'], foundationSha: options['--foundation-sha'] }));
    console.log('生成完了。次にnpm ciと品質ゲートを実行してください。');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
