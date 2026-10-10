import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildStagingPushArgs, stagingOwnershipMatches, sourceMarkers } from '../kits/vercel/fixed-staging/staging-slot.mjs';
import { ownedBy, matchesSource } from '../kits/vercel/shared/provenance.mjs';

test('real Git enforces exact tree, ownership, SHA lease and cleanup', () => {
  const root = mkdtempSync(join(tmpdir(), 'foundation-real-git-'));
  const work = join(root, 'work');
  const remote = join(root, 'remote.git');
  const command = (dir, args, options = {}) => execFileSync('git', args, {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  }).trim();
  const git = (args, options) => command(work, args, options);
  const remoteSha = (ref) => {
    const result = git(['ls-remote', '--heads', 'origin', ref]);
    return result ? result.split(/\s+/)[0] : '';
  };
  const synthetic = (parent, tree, kind, pr) => {
    const message = [
      'Foundation ' + kind + ' for PR #' + pr,
      '',
      'Foundation-' + kind + '-PR: ' + pr,
      'Source-PR-HEAD: ' + parent,
    ].join('\n');
    const sha = git(['commit-tree', tree, '-p', parent], { input: message + '\n' });
    assert.equal(git(['show', '-s', '--format=%P', sha]), parent);
    assert.equal(git(['show', '-s', '--format=%T', sha]), tree);
    git(['diff', '--quiet', parent, sha]);
    return { sha, message };
  };

  try {
    command(root, ['init', '--bare', remote]);
    command(root, ['init', work]);
    git(['config', 'user.name', 'Foundation Tests']);
    git(['config', 'user.email', 'foundation-test@example.invalid']);
    writeFileSync(join(work, 'app.txt'), 'verified source A\n');
    git(['add', 'app.txt']);
    git(['commit', '-m', 'Verified source A']);
    git(['branch', '-M', 'main']);
    git(['remote', 'add', 'origin', remote]);
    const A = git(['rev-parse', 'HEAD']);
    const sourceTree = git(['show', '-s', '--format=%T', A]);
    git(['push', 'origin', A + ':refs/heads/main']);
    git(['push', 'origin', A + ':refs/heads/staging']);

    const B = synthetic(A, sourceTree, 'Fixed-Staging', 42);
    assert.equal(sourceMarkers(B.message, 42, A), true);
    assert.equal(stagingOwnershipMatches(B.message, 4), false);
    git(buildStagingPushArgs(B.sha, A));
    assert.equal(remoteSha('refs/heads/staging'), B.sha);

    // A newer PR may overwrite the one shared Staging slot with a Git lease.
    const C = synthetic(A, sourceTree, 'Fixed-Staging', 43);
    git(buildStagingPushArgs(C.sha, B.sha));
    assert.equal(remoteSha('refs/heads/staging'), C.sha);

    // The old owner is not allowed to remove another PR's current slot.
    assert.equal(stagingOwnershipMatches(C.message, 42), false);
    assert.equal(stagingOwnershipMatches(C.message, 43), true);
    assert.throws(() => git(buildStagingPushArgs(A, B.sha)), /Command failed/);
    assert.equal(remoteSha('refs/heads/staging'), C.sha);

    // The verified current owner can reset to main, with the observed SHA as lease.
    git(buildStagingPushArgs(A, C.sha));
    assert.equal(remoteSha('refs/heads/staging'), A);

    const P = synthetic(A, sourceTree, 'Preview', 42);
    assert.equal(matchesSource(P.message, 'Preview', 42, A), true);
    assert.equal(ownedBy(P.message, 'Preview', 4), false);
    const previewRef = 'refs/heads/preview/pr-42';
    git(['push', 'origin', P.sha + ':' + previewRef]);
    assert.equal(remoteSha(previewRef), P.sha);
    git(['push', 'origin', ':' + previewRef, '--force-with-lease=' + previewRef + ':' + P.sha]);
    assert.equal(remoteSha(previewRef), '');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
