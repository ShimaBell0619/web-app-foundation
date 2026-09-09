# Vercel fixed Staging slot profile

This is an optional extension to `docs/vercel.md` for applications that keep Vercel's normal ephemeral PR Preview deployments but also need one **stable origin** for OAuth, redirect/origin allowlists, webhook callbacks, or other integration checks.

It is not a release branch, an integration branch, or a second Production environment.

## Use this profile when

Use fixed Staging when all of the following are true:

- ordinary Vercel PR Preview remains useful for UI/general feature review;
- at least one external integration requires an exact/stable origin;
- registering every generated `*.vercel.app` Preview origin is impractical or unsupported;
- a reviewer should explicitly choose which PR receives the privileged fixed-origin slot.

Do not add this profile merely because an application uses Vercel. If ephemeral PR Preview is sufficient, keep the simpler `docs/vercel.md` profile.

## Topology

```text
feature/*
   |
   +--> Pull Request --> Vercel PR Preview
   |                     *.vercel.app
   |
   +--> explicit "Deploy PR to Fixed Staging"
                         |
                         v
                  staging ref = PR HEAD SHA
                         |
                         v
                 Vercel Git Integration
                         |
                         v
                https://staging.example.com

main
   |
   +--> Vercel Production
        https://example.com
```

`staging` is a **single mutable validation slot**. It does not accumulate merge history from multiple PRs.

If PR #20 has HEAD `abc123`, Staging may temporarily be:

```text
feature/a -> abc123
staging   -> abc123
```

When PR #21 is selected later:

```text
feature/b -> def456
staging   -> def456
```

No merge commit is required. The `staging` branch pointer is moved directly to the selected PR HEAD.

## Responsibilities

The application-owned GitHub Actions workflows own only the trusted ref-selection operation:

1. validate the requested PR;
2. resolve and re-check its current HEAD SHA;
3. move `refs/heads/staging` with compare-and-swap semantics;
4. optionally report the selected URL/SHA on the PR;
5. clean up the slot after the selected PR closes.

Vercel Git Integration still owns the actual build/deployment. Do not add `vercel deploy` to these workflows merely to duplicate Git Integration.

Foundation reusable CI remains the application quality gate. Fixed Staging is integration-review evidence, not a replacement for check/typecheck/test/build/E2E.

## Security boundary

The deploy workflow is privileged because it has `contents: write` and can move the `staging` ref. Preserve all of these constraints:

- trigger deployment explicitly with `workflow_dispatch`; do not place every PR in Staging automatically;
- accept only an **open same-repository PR targeting `main`**;
- reject fork PRs;
- checkout the automation from trusted `main`, never from the requested PR HEAD;
- fetch the target commit as a Git object only; do not checkout or execute PR code inside the privileged GitHub Actions job;
- grant only the permissions required for ref mutation, PR lookup, workflow-run ordering, and the optional PR comment;
- pin external Actions to reviewed full commit SHAs;
- move Staging with `--force-with-lease`, not an unconditional force push.

The selected PR code **will** later execute in Vercel's Staging Preview deployment. Therefore the manual promotion decision is also a Vercel environment trust boundary.

Do not place Production secrets into branch-scoped Staging variables. Give Staging only the credentials/configuration required for validation, and assume the selected same-repository PR can observe any value exposed to its Vercel build/runtime.

## Race and latest-selection behavior

The copyable script uses two protections.

### Manual deploy ordering

`deploy-staging.yml` serializes deploy requests and the script checks whether a newer `workflow_dispatch` run already exists.

An older run yields before mutation when it can see a newer explicit request. If an older atomic ref update finishes immediately before a newer request, the newer run subsequently replaces it.

The final intended model is one Staging occupant: the most recent valid explicit selection.

### Compare-and-swap ref updates

Every ref mutation uses:

```text
git push --force-with-lease=<observed staging SHA>
```

This binds the write to the Staging SHA that the workflow actually observed. If another run changes Staging between read and write, the stale write fails instead of overwriting the newer occupant.

## Close / merge cleanup

A `pull_request: closed` workflow resets Staging to the current observed `main` SHA only when:

```text
current staging SHA == closed PR HEAD SHA
```

If PR #20 was previously staged, PR #21 later replaced it, and PR #20 then closes:

```text
staging == PR #21 HEAD
PR #20 closes
=> cleanup skips
```

This condition prevents an older PR close event from clearing a newer Staging selection.

After the currently staged PR closes or merges successfully, the idle state is:

```text
staging -> main HEAD observed by cleanup
```

## Bootstrap sequence

This profile has a one-time bootstrap constraint: a newly introduced `workflow_dispatch` workflow cannot be used as the normal default-branch operation until that workflow exists on the repository's default branch.

Adopt it in this order:

1. Confirm the existing Vercel Git Integration and Production Branch behavior.
2. Copy:
   - `templates/vercel/fixed-staging/deploy-staging.yml` -> `.github/workflows/deploy-staging.yml`
   - `templates/vercel/fixed-staging/cleanup-staging.yml` -> `.github/workflows/cleanup-staging.yml`
   - `templates/vercel/fixed-staging/staging-slot.mjs` -> `scripts/staging-slot.mjs`
3. Keep the template filenames unless you also update `STAGING_WORKFLOW_FILE`.
4. Create the `staging` branch once from the current `main` commit.
5. Add the repository variable `FIXED_STAGING_URL`, for example `https://staging.example.com`.
6. Merge this bootstrap implementation to `main` after normal CI review.
7. In Vercel, map the fixed Staging custom/branch domain to Git branch `staging`.
8. Configure any required Vercel **Preview** environment values with a `staging` branch scope.
9. Register the exact Staging origin with external OAuth/integration providers as required.
10. Validate the first real feature PR through **Actions -> Deploy PR to Fixed Staging**.

The PR that introduces this profile normally cannot prove the complete manual-dispatch path through itself before step 6. Treat that as a bootstrap exception, not the steady-state workflow.

## Normal operation

For a PR that needs exact-origin validation:

1. Complete normal PR CI and ordinary Vercel Preview review as appropriate.
2. Open **Deploy PR to Fixed Staging** in GitHub Actions.
3. Run the workflow from `main` and enter the PR number.
4. The workflow resolves the current PR HEAD and moves `staging` to that exact SHA.
5. Vercel Git Integration builds the `staging` branch as a Preview deployment.
6. Validate through the fixed Staging domain.
7. If the PR receives additional commits, run the action again; Staging is intentionally SHA-specific.
8. Merge/close the PR only after the required integration review. Cleanup returns the slot to `main` only if that PR still owns the slot.

## Vercel configuration

The profile assumes:

- Production Branch remains the application's real production branch, normally `main`;
- ordinary PR Preview remains enabled;
- `staging` is a Preview branch, not the Vercel Production Branch;
- a Branch Domain/custom domain resolves the stable Staging hostname to `staging`;
- Staging-specific build/runtime values use Vercel Preview environment configuration scoped to the `staging` Git branch when needed.

The GitHub workflow does not configure Vercel or DNS. Those remain application/provider-owned settings.

## OAuth and exact-origin providers

A fixed origin solves the **address stability** problem; it does not prescribe one identity-provider design.

The consumer may:

- reuse the same OAuth client for Production and Staging and authorize both exact origins; or
- use separate clients when security/operations require stronger environment separation.

Do not bake a provider-specific client ID into this generic profile.

For browser-exposed configuration such as a Vite `VITE_*` OAuth client ID, remember that the value is public client configuration, not a secret. Sensitive credentials must not be exposed to browser bundles.

## Browser-origin state caveat

A fixed Staging hostname is still a different origin from Production.

For example:

```text
https://example.com
https://staging.example.com
```

have separate `localStorage`, IndexedDB, cookies, and other origin-scoped browser state.

Do not assume that a Production-side remote-resource identifier stored only in `localStorage` will automatically exist in Staging. If an integration creates durable remote resources, design remote ownership/discovery so Staging and Production can intentionally reuse the same resource when that is the product contract, or intentionally keep separate resources when isolation is desired.

Fixed Staging solves stable-origin integration testing; it does not create cross-origin browser state synchronization.

## Copyable templates

The profile provides:

- `templates/vercel/fixed-staging/deploy-staging.yml`
- `templates/vercel/fixed-staging/cleanup-staging.yml`
- `templates/vercel/fixed-staging/staging-slot.mjs`

The script uses only Node.js standard-library/runtime APIs plus Git. It does not require the GitHub CLI or an application dependency install.

The template assumes the normal Foundation defaults:

- production branch: `main`;
- fixed slot branch: `staging`;
- Node version file: `.node-version`;
- deploy workflow filename after copy: `deploy-staging.yml`.

Adapt those deliberately if the consuming application differs.

## Proven consumer evidence

`ms-credentials-tracker` proved the profile with:

- normal Vercel PR Preview retained for UI/general validation;
- `staging.credentials.shimabell.dev` mapped to the `staging` branch;
- the same Google OAuth Web Client used for Production and Staging with both exact origins authorized;
- `VITE_GOOGLE_CLIENT_ID` configured for the Staging Preview branch;
- explicit PR-to-Staging promotion;
- Staging ref movement to the exact selected PR HEAD;
- Vercel deployment triggered by Git Integration;
- successful private Google Calendar OAuth/embed validation on the fixed origin;
- conditional cleanup after merge;
- a real cross-origin `localStorage` discovery issue that reinforced the browser-origin state caveat above.

This real consumer validation is why the pattern is an optional Foundation profile rather than a universal deployment requirement.

## References

- `docs/vercel.md`
- GitHub Actions: manually running a workflow
  - https://docs.github.com/actions/managing-workflow-runs/manually-running-a-workflow
- GitHub: `GITHUB_TOKEN` permissions
  - https://docs.github.com/actions/security-guides/automatic-token-authentication
- Git: `--force-with-lease`
  - https://git-scm.com/docs/git-push
- Vercel: Git Integration
  - https://vercel.com/kb/git-integration
