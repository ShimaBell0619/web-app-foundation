import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import {
  requestFromComment, assertSource, leaseArgs, verifySynthetic,
  createGitHubClient, authorize, newerStagingRequest,
  validateDeploymentPayload, verifyProviderDeployment, notify,
} from '../kits/vercel/hosted-review/hosted-review.mjs';

const repo = 'example/app';
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const tree = 'c'.repeat(40);
const project = 'prj_123';
const pr = { state: 'open', base: { ref: 'main', repo: { full_name: repo } }, head: { sha: A, repo: { full_name: repo } } };
const event = { issue: { number: 42, pull_request: {} }, comment: { id: 500, body: '/staging', user: { login: 'writer' } } };
const parent = { sha: A, tree: { sha: tree } };
const child = {
  sha: B, parents: [{ sha: A }], tree: { sha: tree },
  message: 'Owned\n\nFoundation-Fixed-Staging-PR: 42\nSource-PR-HEAD: ' + A + '\nFoundation-Staging-Request-ID: 500',
};
const payload = { environment: 'staging', prNumber: 42, project: { id: project },
  git: { ref: 'staging', sha: B }, id: 'dpl_123',
  state: { type: 'success' }, url: 'https://preview.vercel.app' };
const provider = { id: 'dpl_123', projectId: project, readyState: 'READY',
  url: 'preview.vercel.app', meta: { githubCommitRef: 'staging', githubCommitSha: B } };
function response(body, status = 200) {
  return { ok: status < 400, status, json: async () => body, url: 'https://staging.example.com/' };
}

test('one installable workflow has separate exact-source and write boundaries', () => {
  const workflow = parseYaml(readFileSync('kits/vercel/hosted-review/workflow.yml', 'utf8'));
  assert.deepEqual(workflow.permissions, {});
  assert.deepEqual(Object.keys(workflow.jobs), ['authorize', 'validate-source', 'publish', 'notify', 'cleanup']);
  assert.deepEqual(workflow.on.issue_comment.types, ['created']);
  assert.deepEqual(workflow.on.pull_request_target.types, ['closed']);
  assert.deepEqual(workflow.on.repository_dispatch.types, ['vercel.deployment.success']);
  assert.match(workflow.jobs.authorize.if, /\/preview.*\/staging/s);
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.concurrency.queue, 'max');
  assert.deepEqual(workflow.jobs.authorize.permissions, { contents: 'read', 'pull-requests': 'read' });
  assert.deepEqual(workflow.jobs['validate-source'].permissions, { contents: 'read' });
  assert.match(workflow.jobs['validate-source'].uses, /web-ci\.yml@[0-9a-f]{40}$/);
  assert.equal(workflow.jobs['validate-source'].secrets, undefined);
  assert.equal(workflow.jobs['validate-source'].with.checkout_ref, '${{ needs.authorize.outputs.source_sha }}'.replace('@@', '$'));
  assert.equal(workflow.jobs.publish.permissions.contents, 'write');
  assert.equal(workflow.jobs.notify.permissions.issues, 'write');
  assert.equal(workflow.jobs.cleanup.permissions.contents, 'write');
  for (const [name, job] of Object.entries(workflow.jobs)) {
    if (name !== 'notify') assert.equal(job.env?.VERCEL_API_TOKEN, undefined);
    for (const step of job.steps ?? []) if (step.uses) {
      assert.match(step.uses, /@[0-9a-f]{40}$/, 'external action must be pinned by SHA');
      if (step.uses.startsWith('actions/checkout@')) assert.equal(step.with.ref, 'main');
    }
  }
});

test('strict PR comment, actor and SHA validation', async () => {
  assert.deepEqual(requestFromComment(event), { kind: 'staging', number: 42, actor: 'writer', id: 500 });
  assert.equal(requestFromComment({ ...event, comment: { ...event.comment, body: '/preview' } }).kind, 'preview');
  for (const body of ['/staging please', '/Staging', ' /preview']) {
    assert.throws(() => requestFromComment({ ...event, comment: { ...event.comment, body } }));
  }
  assert.throws(() => requestFromComment({ ...event, issue: { number: 42 } }));
  assert.equal(assertSource(pr, repo, A), A);
  assert.throws(() => assertSource(pr, repo, B));
  assert.throws(() => assertSource({ ...pr, state: 'closed' }, repo));
  assert.throws(() => assertSource({ ...pr, base: { ...pr.base, ref: 'develop' } }, repo));
  assert.throws(() => assertSource({ ...pr, head: { ...pr.head, repo: { full_name: 'fork/app' } } }, repo));
  const client = createGitHubClient({
    token: 'test', repository: repo,
    fetchFn: async url => {
      if (url.endsWith('/collaborators/writer/permission')) return response({ permission: 'write' });
      if (url.endsWith('/pulls/42')) return response(pr);
      throw Error('unexpected request ' + url);
    },
  });
  assert.equal((await authorize(client, event)).source, A);
  const outsider = createGitHubClient({ token: 'test', repository: repo,
    fetchFn: async () => response({ permission: 'read' }) });
  await assert.rejects(authorize(outsider, event), /write permission/);
});

test('synthetic child and SHA leases reject wrong parents, tree and owner', () => {
  assert.deepEqual(leaseArgs('staging', B, A), [
    'push', 'origin', B + ':refs/heads/staging', '--force-with-lease=refs/heads/staging:' + A,
  ]);
  assert.equal(leaseArgs('preview/pr-42', B, null).at(-1), '--force-with-lease=refs/heads/preview/pr-42:');
  assert.throws(() => leaseArgs('main', B, A));
  verifySynthetic(child, parent, 'staging', 42);
  assert.throws(() => verifySynthetic({ ...child, parents: [{ sha: B }] }, parent, 'staging', 42));
  assert.throws(() => verifySynthetic({ ...child, tree: { sha: B } }, parent, 'staging', 42));
  assert.throws(() => verifySynthetic(child, parent, 'staging', 4));
  assert.throws(() => verifySynthetic({ ...child, message: child.message + '\nSource-PR-HEAD: ' + A }, parent, 'staging', 42));
});

test('Staging only rejects older requests if later request is authorized', async () => {
  const comments = [{ id: 501, body: '/staging', user: { login: 'outsider' } }];
  const client = { comments: async () => comments,
    permission: async user => ({ permission: user === 'outsider' ? 'read' : 'write' }) };
  assert.equal(await newerStagingRequest(client, 500, '2026-10-10T00:00:00Z'), false);
  comments.push({ id: 503, body: '/staging', user: { login: 'writer' } });
  assert.equal(await newerStagingRequest(client, 500, '2026-10-10T00:00:00Z'), true);
});

test('self-asserted webhook cannot override provider or GitHub source evidence', async () => {
  const valid = validateDeploymentPayload(payload, project);
  verifyProviderDeployment(provider, valid, project);
  assert.throws(() => validateDeploymentPayload({ ...payload, project: { id: 'other' } }, project));
  assert.throws(() => validateDeploymentPayload({ ...payload, state: { type: 'failed' } }, project));
  assert.throws(() => verifyProviderDeployment({ ...provider, readyState: 'BUILDING' }, valid, project));
  assert.throws(() => verifyProviderDeployment({ ...provider, meta: { ...provider.meta, githubCommitSha: A } }, valid, project));
  const posts = [];
  const github = { repo, pr: async () => pr, ref: async () => B,
    commit: async hash => hash === B ? child : parent,
    prComments: async () => posts.map(body => ({ body })),
    postComment: async (_number, body) => { posts.push(body); } };
  const options = { projectId: project, vercelToken: 'test', stagingUrl: 'https://staging.example.com/',
    fetchFn: async url => response(url.includes('api.vercel.com') ? provider : null) };
  assert.equal((await notify(github, payload, options)).notified, true);
  assert.match(posts[0], /HTTP 200 at fixed origin/);
  assert.match(posts[0], /browser\/UI verification: \*\*not performed\*\*/);
  assert.equal((await notify(github, payload, options)).duplicate, true);
  assert.equal(posts.length, 1);
  await assert.rejects(notify({ ...github, ref: async () => A }, payload, options), /stale deployment/);
  await assert.rejects(notify(github, payload,
    { ...options, fetchFn: async () => response({ ...provider, projectId: 'wrong' }) }), /Vercel API/);
});
