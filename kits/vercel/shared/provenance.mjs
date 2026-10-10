// Shared by the on-demand Preview and optional fixed Staging kits.
// Git commit trailers are security-sensitive identity assertions, not fuzzy prose.
export function readUniqueTrailer(message, name) {
  const entries = String(message ?? '').split(/\r?\n/).filter(line => line.startsWith(name + ':'));
  if (entries.length !== 1) return null;
  const prefix = name + ': ';
  if (!entries[0].startsWith(prefix)) return null;
  const value = entries[0].slice(prefix.length);
  return value && !/\s/.test(value) ? value : null;
}

export function ownedBy(message, kind, number) {
  if (!['Preview', 'Fixed-Staging'].includes(kind)) throw new Error('unknown Vercel ref kind');
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error('invalid PR number');
  return readUniqueTrailer(message, 'Foundation-' + kind + '-PR') === String(number);
}

export function matchesSource(message, kind, number, sha) {
  if (!/^[0-9a-f]{40}$/.test(sha ?? '')) throw new Error('invalid source SHA');
  return ownedBy(message, kind, number) && readUniqueTrailer(message, 'Source-PR-HEAD') === sha;
}
