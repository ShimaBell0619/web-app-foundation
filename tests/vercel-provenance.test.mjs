import assert from 'node:assert/strict';
import test from 'node:test';
import { readUniqueTrailer, ownedBy, matchesSource } from '../kits/vercel/shared/provenance.mjs';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const preview = ['Preview commit', '', 'Foundation-Preview-PR: 42', 'Source-PR-HEAD: ' + A].join('\n');
const staging = ['Staging commit', '', 'Foundation-Fixed-Staging-PR: 42', 'Source-PR-HEAD: ' + A].join('\n');

test('both Vercel deployment modes use exact PR identity and SHA', () => {
  for (const [text, kind] of [[preview, 'Preview'], [staging, 'Fixed-Staging']]) {
    assert.equal(ownedBy(text, kind, 42), true);
    assert.equal(ownedBy(text, kind, 4), false);
    assert.equal(ownedBy(text, kind, 420), false);
    assert.equal(matchesSource(text, kind, 42, A), true);
    assert.equal(matchesSource(text, kind, 42, B), false);
    assert.equal(ownedBy(text, kind === 'Preview' ? 'Fixed-Staging' : 'Preview', 42), false);
  }
});

test('duplicate and ambiguous ownership records fail closed', () => {
  for (const [text, kind] of [[preview, 'Preview'], [staging, 'Fixed-Staging']]) {
    const trailer = 'Foundation-' + kind + '-PR: 42';
    for (const invalid of [
      text.replace(trailer, 'x' + trailer),
      text.replace(trailer, trailer + '0'),
      text.replace(trailer, 'Foundation-' + kind + '-PR: 42 extra'),
      text.replace(trailer, 'Foundation-' + kind + '-PR:  42'),
      text + '\n' + trailer,
    ]) assert.equal(ownedBy(invalid, kind, 42), false);
    assert.equal(matchesSource(text + '\nSource-PR-HEAD: ' + A, kind, 42, A), false);
  }
});

test('malformed input and unsupported types reject rather than silently authorize', () => {
  assert.equal(readUniqueTrailer('Source-PR-HEAD: a\nSource-PR-HEAD: b', 'Source-PR-HEAD'), null);
  assert.throws(() => ownedBy(preview, 'Admin', 42));
  assert.throws(() => ownedBy(preview, 'Preview', 0));
  assert.throws(() => matchesSource(preview, 'Preview', 42, 'short'));
});
