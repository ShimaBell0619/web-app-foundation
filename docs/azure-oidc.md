# GitHub Actions to Azure with OIDC

This document records a proven authentication/bootstrap pattern for applications that need GitHub Actions to operate Azure resources without a client secret.

It is provider-specific guidance, not a reusable Azure deployment framework. Applications remain responsible for their own Azure resource lifecycle, Bicep/Terraform, deployment workflow, and RBAC scope.

## Boundary

There are two independent authorization layers:

1. **Microsoft Entra federated identity credential (FIC)** decides which GitHub OIDC assertions may sign in as the application/service principal.
2. **Azure RBAC** decides what that identity may do after sign-in.

A successful OIDC login does not imply Owner/User Access Administrator privileges. Keep RBAC aligned with the operations the application actually needs.

Never add an `AZURE_CLIENT_SECRET` merely to work around a FIC mismatch.

## GitHub immutable/stable subject behavior

A real `ms-credentials-tracker` GitHub Actions run emitted a subject shaped like:

```text
repo:<owner>@<owner-id>/<repo>@<repo-id>:ref:refs/heads/main
```

A historical name-only FIC such as:

```text
repo:<owner>/<repo>:ref:refs/heads/main
```

therefore did not match and Microsoft Entra returned `AADSTS700213`.

For GitHub Flexible Federated Identity Credentials, Microsoft requires the expression to match `sub` and at least one immutable claim: `repository_id` and/or `repository_owner_id`.

## Convenience-first owner-wide Flexible FIC

For a personal owner that deliberately prioritizes convenience across current and future repositories, one Flexible FIC can trust repositories owned by that numeric GitHub owner ID.

Example:

```text
claims['sub'] matches 'repo:<OWNER>@<OWNER_ID>/*:*' and claims['repository_owner_id'] eq '<OWNER_ID>'
```

This intentionally allows multiple repositories, refs, and workflows under that owner. It avoids an Entra change every time a repository is created.

This is a broad trust boundary. A stricter deployment can additionally constrain repository IDs, refs, environments, or `job_workflow_ref`. Choose the expression deliberately and record the chosen boundary in the consuming repository.

Flexible FIC is a Microsoft Entra preview capability as of 2026-09. Azure CLI/PowerShell/Terraform do not yet have first-class Flexible FIC management support; Azure Portal or Microsoft Graph/`az rest` are the supported management paths.

## Azure Portal setup

For an existing application registration such as a shared GitHub Actions deployer:

1. Open **Microsoft Entra ID**.
2. Open **App registrations**.
3. Select the deployer application.
4. Open **Certificates & secrets**.
5. Open **Federated credentials**.
6. Select **Add credential**.
7. Choose **Other issuer**.
8. Set issuer to `https://token.actions.githubusercontent.com`.
9. Select **Claims matching expression (preview)** rather than an explicit subject identifier.
10. Enter the reviewed expression.
11. Use audience `api://AzureADTokenExchange`.
12. Give the credential a stable descriptive name and save it.

Do not accidentally configure a similarly named application registration. Confirm the application/client ID used by the GitHub repository variables before testing.

## Consuming repository contract

Use repository **Variables** for the public identifiers:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

These identifiers are configuration, not credentials. Do not store a client secret when OIDC is the selected authentication model.

A minimal app-owned workflow step is:

```yaml
permissions:
  contents: read
  id-token: write

jobs:
  azure:
    runs-on: ubuntu-latest
    steps:
      - name: Sign in to Azure with OIDC
        uses: Azure/login@<REVIEWED_FULL_COMMIT_SHA>
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
```

Pin `Azure/login` to a reviewed full commit SHA, consistent with the Foundation supply-chain rule.

## Validation pattern

When onboarding or changing the FIC, test the real trust path rather than assuming the portal configuration is correct:

1. request the GitHub OIDC assertion from an Actions job;
2. inspect only non-secret claims such as `sub`, `repository_id`, `repository_owner_id`, and `ref` when troubleshooting;
3. run `Azure/login`;
4. perform a narrowly scoped Azure read/smoke operation;
5. only then perform the intended create/update/delete operation;
6. verify the final Azure state explicitly.

Do not print the raw OIDC token.

## Proven consumer evidence

`ms-credentials-tracker` used an owner-wide Flexible FIC and then successfully ran:

```text
GitHub Actions
  -> GitHub OIDC assertion
  -> Azure/login
  -> Azure subscription context
  -> az group delete rg-mscred-prod-jpe-01
  -> az group exists == false
```

The successful cleanup workflow run is recorded in that repository's Issue #20 history. The temporary destructive workflow was removed after verification; the shared Entra application/service principal was intentionally retained for future GitHub-driven Azure experiments.

## References

- Microsoft Learn: Flexible federated identity credentials (preview)
  - https://learn.microsoft.com/en-us/entra/workload-id/workload-identities-flexible-federated-identity-credentials
- Microsoft Learn: Set up a Flexible Federated identity credential
  - https://learn.microsoft.com/en-us/entra/workload-id/workload-identities-set-up-flexible-federated-identity-credential
- Microsoft Learn: Migrate GitHub Actions federated credentials to immutable subjects
  - https://learn.microsoft.com/en-us/entra/workload-id/workload-identities-github-immutable-subjects
