import { appendFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { matchesSource, ownedBy, readUniqueTrailer } from '../shared/provenance.mjs';

const SHA = /^[0-9a-f]{40}$/;
const kinds = { preview: { trailer: 'Preview', branch: n => 'preview/pr-' + n }, staging: { trailer: 'Fixed-Staging', branch: () => 'staging' } };

function required(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new Error(label + ' is required');
  return result;
}
function prNumber(value) {
  const valueString = String(value ?? '');
  if (!/^[1-9][0-9]*$/.test(valueString) || !Number.isSafeInteger(Number(valueString))) throw new Error('invalid PR number');
  return Number(valueString);
}
function sha(value) {
  if (!SHA.test(value ?? '')) throw new Error('invalid commit SHA');
  return value;
}
function commentId(value) {
  if (!/^[1-9][0-9]*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new Error('invalid comment ID');
  return Number(value);
}
function sameRepoPr(pr, repo) {
  return pr?.state === 'open' && pr?.base?.repo?.full_name === repo &&
    pr?.base?.ref === 'main' && pr?.head?.repo?.full_name === repo &&
    SHA.test(pr?.head?.sha ?? '');
}
function mode(value) {
  if (!Object.hasOwn(kinds, value)) throw new Error('invalid hosted review mode');
  return kinds[value];
}
export function requestFromComment(event) {
  if (!event?.issue?.pull_request || !['/preview', '/staging'].includes(event?.comment?.body)) {
    throw new Error('expected exact /preview or /staging comment on a PR');
  }
  return {
    kind: event.comment.body.slice(1),
    number: prNumber(event.issue.number),
    actor: required(event.comment.user?.login, 'comment author'),
    id: commentId(event.comment.id),
  };
}
export function assertSource(pr, repo, expected) {
  if (!sameRepoPr(pr, repo)) throw new Error('PR must be open, in this repository and target main');
  if (expected && pr.head.sha !== sha(expected)) throw new Error('PR HEAD changed after exact SHA CI; submit a new request');
  return pr.head.sha;
}
export function leaseArgs(branch, source, old) {
  if (branch !== 'staging' && !/^preview\/pr-[1-9][0-9]*$/.test(branch)) throw new Error('invalid target branch');
  return ['push', 'origin', sha(source) + ':refs/heads/' + branch,
    '--force-with-lease=refs/heads/' + branch + ':' + (old ? sha(old) : '')];
}
export function verifySynthetic(child, parent, kind, number) {
  if (child?.parents?.length !== 1 || child.parents[0]?.sha !== parent?.sha ||
      child.tree?.sha !== parent?.tree?.sha ||
      !matchesSource(child?.message, mode(kind).trailer, prNumber(number), parent.sha)) {
    throw new Error('synthetic B does not match validated source A and unique ownership');
  }
}

export function createGitHubClient({ token, repository, fetchFn = fetch, apiUrl = 'https://api.github.com' }) {
  const repo = required(repository, 'GITHUB_REPOSITORY');
  const auth = required(token, 'GH_TOKEN');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('invalid repository');
  const prefix = '/repos/' + repo;
  async function get(path, { method = 'GET', body, missing = false } = {}) {
    const response = await fetchFn(apiUrl + prefix + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + auth,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (missing && response.status === 404) return null;
    if (!response.ok) throw new Error('GitHub API ' + method + ' ' + path + ': ' + response.status);
    return response.status === 204 ? null : response.json();
  }
  return {
    repo,
    pr: n => get('/pulls/' + prNumber(n)),
    permission: user => get('/collaborators/' + encodeURIComponent(user) + '/permission'),
    comment: id => get('/issues/comments/' + commentId(id)),
    comments: (page, since) => get('/issues/comments?per_page=100&page=' + page + (since ? '&since=' + encodeURIComponent(since) : '')),
    prComments: n => get('/issues/' + prNumber(n) + '/comments?per_page=100'),
    postComment: (n, body) => get('/issues/' + prNumber(n) + '/comments', { method: 'POST', body: { body } }),
    ref: async (branch, missing = false) => {
      const response = await get('/git/ref/heads/' + branch, { missing });
      return response ? sha(response?.object?.sha) : null;
    },
    commit: hash => get('/git/commits/' + sha(hash)),
  };
}
async function writer(client, actor) {
  const permission = await client.permission(actor);
  if (!['write', 'maintain', 'admin'].includes(permission?.permission)) throw new Error('comment author lacks repository write permission');
}
function git(args, extra = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      input: extra.input,
      env: { ...process.env, ...(extra.env ?? {}) },
      stdio: extra.input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    throw new Error('git operation failed (' + args[0] + '): ' + String(error.stderr ?? error));
  }
}
function output(key, value) {
  appendFileSync(required(process.env.GITHUB_OUTPUT, 'GITHUB_OUTPUT'), key + '=' + value + '\n');
}
function summary(lines) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}
function remoteSha(branch) {
  const result = git(['ls-remote', '--heads', 'origin', 'refs/heads/' + branch]);
  return result ? sha(result.split(/\s+/)[0]) : null;
}
function verifyGitSource(source) {
  git(['fetch', '--no-tags', 'origin', source]);
  const tree = sha(git(['show', '-s', '--format=%T', source]));
  return tree;
}
function localCommit(hash) {
  git(['fetch', '--no-tags', 'origin', hash]);
  return {
    sha: hash,
    parent: git(['show', '-s', '--format=%P', hash]),
    tree: git(['show', '-s', '--format=%T', hash]),
    message: git(['show', '-s', '--format=%B', hash]),
  };
}
export function isOwnedSource(commit, kind, number, source, tree) {
  return commit && commit.parent === source && commit.tree === tree &&
    matchesSource(commit.message, mode(kind).trailer, number, source);
}
function buildSynthetic(source, tree, kind, number, id) {
  const trailer = mode(kind).trailer;
  const lines = [
    'Foundation ' + trailer + ' for PR #' + number,
    '',
    'Foundation-' + trailer + '-PR: ' + number,
    'Source-PR-HEAD: ' + source,
  ];
  if (kind === 'staging') lines.push('Foundation-Staging-Request-ID: ' + id);
  const created = git(['commit-tree', tree, '-p', source], {
    input: lines.join('\n') + '\n',
    env: {
      GIT_AUTHOR_NAME: 'github-actions[bot]',
      GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
      GIT_COMMITTER_NAME: 'github-actions[bot]',
      GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
    },
  });
  sha(created);
  const actual = {
    sha: created,
    parent: git(['show', '-s', '--format=%P', created]),
    tree: git(['show', '-s', '--format=%T', created]),
    message: git(['show', '-s', '--format=%B', created]),
  };
  if (!isOwnedSource(actual, kind, number, source, tree)) throw new Error('synthetic invariant failed');
  git(['diff', '--quiet', source, created]);
  return created;
}
async function validateCurrentRequest(client, number, comment, kind) {
  const actual = await client.comment(comment);
  if (actual?.body !== '/' + kind || !actual?.issue_url?.endsWith('/issues/' + number)) {
    throw new Error('the request comment was modified or removed');
  }
  await writer(client, required(actual?.user?.login, 'comment author'));
}
export async function newerStagingRequest(client, currentId, createdAt) {
  // Repository-wide comments are returned oldest-first. Scan bounded pages;
  // exhaustion fails closed rather than allowing an older request to overwrite a newer one.
  for (let page = 1; page <= 20; page++) {
    const items = await client.comments(page, createdAt);
    if (!Array.isArray(items)) throw new Error('invalid GitHub comments response');
    for (const candidate of items) {
      if (candidate?.body !== '/staging' || Number(candidate.id) <= currentId) continue;
      const p = await client.permission(candidate.user?.login ?? '');
      if (['write', 'maintain', 'admin'].includes(p?.permission)) return true;
    }
    if (items.length < 100) return false;
  }
  throw new Error('Staging comment audit exceeded safe pagination limit');
}

export async function authorize(client, event) {
  const request = requestFromComment(event);
  await writer(client, request.actor);
  const pr = await client.pr(request.number);
  const source = assertSource(pr, client.repo);
  return { ...request, source };
}

export async function publish(client, { kind, number, source, id }) {
  mode(kind);
  number = prNumber(number);
  source = sha(source);
  id = commentId(id);
  await validateCurrentRequest(client, number, id, kind);
  assertSource(await client.pr(number), client.repo, source);
  const original = await client.comment(id);
  const checkNewest = async () => kind === 'staging' &&
    await newerStagingRequest(client, id, original.created_at);
  if (await checkNewest()) return { skipped: 'superseded by a newer authorized /staging request' };

  const tree = verifyGitSource(source);
  const branch = mode(kind).branch(number);
  const old = remoteSha(branch);
  if (kind === 'staging' && !old) throw new Error('staging branch must already exist');
  let current = old ? localCommit(old) : null;
  if (isOwnedSource(current, kind, number, source, tree)) return { sha: old, branch, reused: true };
  if (kind === 'staging' && current) {
    const prev = readUniqueTrailer(current.message, 'Foundation-Staging-Request-ID');
    if (prev && Number(prev) > id) return { skipped: 'Staging is owned by a newer request' };
  }
  const synthetic = buildSynthetic(source, tree, kind, number, id);
  await validateCurrentRequest(client, number, id, kind);
  assertSource(await client.pr(number), client.repo, source);
  if (await checkNewest()) return { skipped: 'superseded immediately before ref mutation' };
  git(leaseArgs(branch, synthetic, old));
  if (remoteSha(branch) !== synthetic) throw new Error('ref SHA verification failed');
  return { sha: synthetic, branch, reused: false };
}

export async function cleanup(client, event) {
  const pr = event?.pull_request;
  const number = prNumber(pr?.number);
  if (pr?.base?.repo?.full_name !== client.repo || pr?.head?.repo?.full_name !== client.repo ||
      pr?.state !== 'closed') return [];
  const actions = [];
  for (const kind of ['preview', 'staging']) {
    const branch = mode(kind).branch(number);
    const observed = remoteSha(branch);
    if (!observed) continue;
    const current = localCommit(observed);
    if (!ownedBy(current.message, mode(kind).trailer, number)) continue;
    if (kind === 'preview') {
      git(['push', 'origin', ':refs/heads/' + branch, '--force-with-lease=refs/heads/' + branch + ':' + observed]);
      if (remoteSha(branch)) throw new Error('Preview cleanup failed');
    } else {
      const main = await client.ref('main');
      git(['fetch', '--no-tags', 'origin', main]);
      git(leaseArgs(branch, main, observed));
      if (remoteSha(branch) !== main) throw new Error('Staging cleanup failed');
    }
    actions.push(branch);
  }
  return actions;
}

export function validateDeploymentPayload(payload, projectId) {
  // Vercel identifies the fixed staging branch as a Preview environment too.
  if (payload?.environment !== 'preview') throw new Error('only Vercel Preview deployments are accepted');
  const branch = required(payload?.git?.ref, 'Vercel ref');
  const match = /^preview\/pr-([1-9][0-9]*)$/.exec(branch);
  const kind = branch === 'staging' ? 'staging' : 'preview';
  if (kind === 'preview' && !match) throw new Error('unexpected deployment ref');
  const number = match ? prNumber(match[1]) : null;
  const synthetic = sha(payload?.git?.sha);
  const id = required(payload?.id, 'deployment ID');
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('invalid deployment ID');
  if (!['ready', 'success'].includes(payload?.state?.type)) throw new Error('Vercel deployment event is not ready');
  if (payload?.project?.id !== projectId) throw new Error('unexpected Vercel project');
  const url = required(payload?.url, 'Vercel URL');
  if (!/^https:\/\/[a-zA-Z0-9.-]+\.vercel\.app$/.test(url)) throw new Error('invalid deployment URL');
  return { kind, branch, number, synthetic, id, url };
}
export function verifyProviderDeployment(deployment, expected, projectId) {
  if (deployment?.id !== expected.id || deployment.projectId !== projectId ||
      deployment.readyState !== 'READY' || deployment.target === 'production' ||
      deployment.url !== expected.url.slice(8) ||
      deployment.meta?.githubCommitSha !== expected.synthetic ||
      deployment.meta?.githubCommitRef !== expected.branch) {
    throw new Error('Vercel API did not corroborate project, READY, URL, ref and exact SHA');
  }
}

export async function notify(client, payload, { projectId, vercelToken, stagingUrl, fetchFn = fetch, teamId = '' }) {
  projectId = required(projectId, 'VERCEL_PROJECT_ID');
  const event = validateDeploymentPayload(payload, projectId);
  const url = 'https://api.vercel.com/v13/deployments/' + encodeURIComponent(event.id) +
    (teamId ? '?teamId=' + encodeURIComponent(teamId) : '');
  const response = await fetchFn(url, {
    headers: { Authorization: 'Bearer ' + required(vercelToken, 'VERCEL_API_TOKEN') },
  });
  if (!response.ok) throw new Error('Vercel deployment lookup failed: ' + response.status);
  verifyProviderDeployment(await response.json(), event, projectId);

  if (await client.ref(event.branch) !== event.synthetic) throw new Error('stale deployment: branch moved');
  const child = await client.commit(event.synthetic);
  const number = event.kind === 'staging'
    ? prNumber(readUniqueTrailer(child.message, 'Foundation-Fixed-Staging-PR'))
    : event.number;
  const pr = await client.pr(number);
  const source = assertSource(pr, client.repo);
  const parent = await client.commit(source);
  verifySynthetic(child, parent, event.kind, number);
  if (event.kind === 'staging') {
    const owner = readUniqueTrailer(child.message, 'Foundation-Staging-Request-ID');
    if (!owner || !/^[1-9][0-9]*$/.test(owner)) throw new Error('Staging request provenance missing');
  }

  let http = 'Not checked';
  if (event.kind === 'staging') {
    const fixed = new URL(required(stagingUrl, 'FIXED_STAGING_URL'));
    if (fixed.protocol !== 'https:' || fixed.username || fixed.password ||
        !fixed.hostname || fixed.pathname !== '/' || fixed.search || fixed.hash) {
      throw new Error('FIXED_STAGING_URL must be a plain HTTPS origin');
    }
    try {
      const check = await fetchFn(fixed.href, { method: 'GET', signal: AbortSignal.timeout(10000) });
      http = check.url.startsWith(fixed.origin + '/') && check.ok
        ? 'HTTP ' + check.status + ' at fixed origin'
        : 'HTTP verification failed (status ' + check.status + ')';
    } catch {
      http = 'HTTP verification failed (connection or timeout)';
    }
  }
  const marker = '<!-- foundation-review deployment=' + event.id + ' commit=' + event.synthetic + ' -->';
  const prior = await client.prComments(number);
  if (prior.some(item => String(item.body ?? '').includes(marker))) return { duplicate: true };
  // Recheck after external API/HTTP requests before any write.
  assertSource(await client.pr(number), client.repo, source);
  if (await client.ref(event.branch) !== event.synthetic) throw new Error('deployment was superseded before notification');
  const message = [
    (event.kind === 'preview' ? 'Preview' : 'Fixed Staging') + ' deployment verified with Vercel API.',
    '',
    '- Deployment URL: ' + event.url,
    '- Ref: ' + event.branch,
    '- Source A: ' + source,
    '- Synthetic B: ' + event.synthetic,
    '- Vercel deployment: ' + event.id,
    ...(event.kind === 'staging' ? ['- Fixed URL: ' + stagingUrl, '- Fixed URL check: ' + http] : []),
    '- Real browser/UI verification: **not performed**.',
    '',
    marker,
  ].join('\n');
  await client.postComment(number, message);
  return { notified: true, http };
}

async function main() {
  const cmd = process.argv[2];
  const client = createGitHubClient({
    token: process.env.GH_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
  });
  const event = JSON.parse(readFileSync(required(process.env.GITHUB_EVENT_PATH, 'GITHUB_EVENT_PATH'), 'utf8'));
  if (cmd === 'authorize') {
    const result = await authorize(client, event);
    output('kind', result.kind);
    output('pr_number', result.number);
    output('source_sha', result.source);
    output('comment_id', result.id);
  } else if (cmd === 'publish') {
    const result = await publish(client, {
      kind: process.env.REVIEW_KIND,
      number: process.env.PR_NUMBER,
      source: process.env.SOURCE_SHA,
      id: process.env.COMMENT_ID,
    });
    summary(['## Hosted review ref state', '', JSON.stringify(result), '',
      'Git ref update alone does not prove Vercel deployment, fixed origin HTTP or rendered UI.']);
  } else if (cmd === 'cleanup') {
    summary(['## Owned refs cleaned up', '', ...(await cleanup(client, event))]);
  } else if (cmd === 'notify') {
    summary(['## Hosted review provider verification', '', JSON.stringify(await notify(client, event.client_payload, {
      projectId: process.env.VERCEL_PROJECT_ID,
      vercelToken: process.env.VERCEL_API_TOKEN,
      stagingUrl: process.env.FIXED_STAGING_URL,
      teamId: process.env.VERCEL_TEAM_ID,
    }))]);
  } else throw new Error('usage: hosted-review.mjs <authorize|publish|notify|cleanup>');
}
const direct = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) main().catch(error => { console.error(error); process.exitCode = 1; });
