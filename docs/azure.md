# Azureの認証・操作

## 安全な既定
Microsoft Entra FIC（Federated Identity Credential）はGitHubが提示する主体を確認し、Azure RBACはその主体が操作できる範囲を限定します。両者を混同してはいけません。可能ならGitHub repository_idとmainまたは保護EnvironmentをFICに限定し、Subscription/Resource Group/Resource単位で最小RBACを付けます。Flexible FICを利用するときはsubとimmutable claimを照合します。

owner-wideや任意refを許すFICは既定にしません。read、What-if、apply、deleteを区別し、権限・承認・復旧手順を確認します。fork/未信頼PRから本番OIDC identityを使わせず、secretをChat、Artifact、PRに表示しません。

## 設定・運用の詳細

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

## Chat起点のAzure操作

ChatからAzureを直接操作する接続がない場合でも、認証済みGitHub接続で既存のIssueコメント等を投稿し、信頼済み`main`のGitHub Actions → OIDC → Azure CLI/Bicepを起動できる。ただしこれは**操作経路の代替であり、権限・承認の迂回ではない**。

- `read` / `what-if` は原則読み取り専用のRBACとし、結果を構造化して記録する。
- `apply` / `delete` は承認を得た対象Subscription・Resource Group・リソース・変更内容に限定し、可能なら専用のGitHub Environmentと保護ルールを適用する。
- 受信したIssueコメントは信頼できない入力。投稿者権限、正確なコマンド文字列（または固定操作種別）、Issue/PR、コミットSHA、対象スコープを`main`上の信頼済みWorkflowで確認する。無制限のShell、`az rest`や任意Bicepパスをそのまま特権実行しない。
- 資格情報はGitHub OIDCとAzure側の最小RBACを優先。Token、SAS、クライアントシークレットや環境変数の秘密をGitHubコメント・ログ・Chatに出さない。
- 操作後、デプロイ操作ID、対象SHA、Azureの実在リソース状態、API疎通/スモークを別々に確認して報告する。
- FIC/RBACの初回設定、規制や権限上の承認が不足するときは実行を止める。Workに自動移行しない。
- アプリが必要とする操作だけを実装し、汎用Azure管理権限を持つ共通Agentや無制限の実行ゲートウェイは作らない。

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
