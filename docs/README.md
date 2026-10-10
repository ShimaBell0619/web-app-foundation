# Docs：必要な情報の選び方

共通の開発規則は [AGENTS.md](../AGENTS.md) のみを正本とします。全ドキュメントを読み込まず、関係するものだけ参照してください。

| 文書 | 読むタイミング |
| --- | --- |
| [`docs/adoption.md`](adoption.md) | アプリ導入と更新 |
| [`docs/operations.md`](operations.md) | Chatからツール・GitHub・配備・検証を進める |
| [`docs/ui.md`](ui.md) | UI実装、実ブラウザ、キーボード・レスポンシブ |
| [`docs/azure.md`](azure.md) | Azure OIDC、FIC、RBACとリソース操作 |
| [`docs/maintaining.md`](maintaining.md) | Foundation自身のCI、Changesets、Release |

機能ごとの導入は[ Vercel ](../kits/vercel/README.md)、[ Repo作成 ](../kits/github/repository-create/README.md)、[ GitHub Release ](../kits/github/release/README.md)のREADMEを参照します。未導入のkitを稼働済みと報告しません。

| Foundationで常時有効なWorkflow | 役割 |
| --- | --- |
| [`.github/workflows/foundation-ci.yml`](../.github/workflows/foundation-ci.yml) | Foundation PR/mainの品質検証 |
| [`.github/workflows/web-ci.yml`](../.github/workflows/web-ci.yml) | 読み取り専用の再利用Web品質CI |
