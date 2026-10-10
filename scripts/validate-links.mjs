import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// 配布元と生成先で同じ相対リンクを検査する。外部URLの到達性は対象外。
export function validateLinks(root, paths) {
  const errors = [];
  for (const path of paths) {
    const text = readFileSync(resolve(root, path), 'utf8').replace(/```[\s\S]*?```/g, '');
    const references = new Map([...text.matchAll(/^\[([^\]]+)\]:\s*(\S+)/gm)]
      .map(m => [m[1].trim().toLowerCase(), m[2]]));
    const targets = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]);
    for (const m of text.matchAll(/\[([^\]]+)\]\[([^\]]*)\]/g)) {
      const label = (m[2] || m[1]).trim().toLowerCase();
      if (!references.has(label)) errors.push(`undefined link ${path} => ${label}`);
      else targets.push(references.get(label));
    }
    targets.push(...references.values());
    for (const target of targets) {
      if (/^(https?:|mailto:)/i.test(target)) continue;
      const [href, fragment] = target.split('#');
      const file = resolve(root, dirname(path), decodeURIComponent(href || path.split('/').at(-1)));
      if (!existsSync(file)) { errors.push(`broken link ${path} => ${target}`); continue; }
      if (fragment && file.endsWith('.md')) {
        const seen = new Map();
        const headings = [...readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '').matchAll(/^#{1,6}\s+(.+)$/gm)].map(m => {
          const slug = m[1].toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
          const count = seen.get(slug) || 0; seen.set(slug, count + 1);
          return count ? `${slug}-${count}` : slug;
        });
        if (!headings.includes(decodeURIComponent(fragment))) errors.push(`broken fragment ${path} => ${target}`);
      }
    }
  }
  return errors;
}
