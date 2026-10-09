# web-app-foundation

ChatGPTなどのAIを利用してWebアプリを開発するための、再利用可能な開発ルールとCIテンプレートです。アプリ固有の仕様・デザインは各アプリのリポジトリが管理します。

## バージョンと位置付け

Current Foundation version: **0.10.0 (pre-1.0)**.

実際のアプリで契約を検証するまでは`0.x`を維持します。標準構成はReact + TypeScript + Vite + npmですが、Next.jsなどの選択を禁止するものではありません。

## 主要な文書

| ファイル | 役割 |
| --- | --- |
| `PRODUCT.base.md` | アプリの`PRODUCT.md`の原型。機能・制約・非対象を定義 |
| `DESIGN.base.md` | アプリの`DESIGN.md`の原型。UX・デザインを定義 |
| `AGENTS.md` | AI開発に共通する最小限の規則 |
| `docs/ai-implementation.md` | Chat + GitHub、Workを使った実装・引き継ぎの手順 |
| `docs/adoption.md` | 新規アプリへのFoundation導入手順 |

IssueとPRは判断・変更の記録です。製品の最新仕様はアプリ側の`PRODUCT.md`と`DESIGN.md`を正本とします。

## 開発の進め方

既定は **Chat-first** です。設計・GitHub変更・CI・画面の実ブラウザ検証・デプロイ・外部サービス操作を、利用可能な直接ツール、Chat実行環境、一時Sandbox、承認済みGitHub Actionsから選んで進めます。**Workはユーザーが明示的に指定した場合にのみ利用します。** 権限・承認・課金・秘密情報の境界は変更しません。

`AGENTS.md`は両方に共通です。受け入れ条件、必要な仕様、作業ブランチ、PR、CI結果で引き継ぐため、会話全文のコピーや専用Agentは必要ありません。

実質的な変更は、実装 → 自己レビュー → 修正 → 最終検証を行います。リスクの高い変更では`docs/independent-review.md`に従って独立レビューを検討します。

## アプリ実装の既定

- Web UI：Tailwind CSSとshadcn/ui相当のアクセシブルな基本部品を既定とする。画面の意味・階層・見た目はアプリの`DESIGN.md`が決める（`docs/ui-implementation.md`）。
- UIレビュー：見た目の変更は実際にレンダリングして確認する（`docs/ui-review.md`）。
- CI：再利用可能な`.github/workflows/web-ci.yml`で`check`、`typecheck`、`test`、`build`を実施する。許容された明示的な除外を除き必須。呼び出し元はレビュー済みコミットSHAに固定する。
- 変更管理：Semantic Versioning（SemVer）とChangesetsを使用する（`docs/versioning.md`）。

## Vercelの既定運用

Vercel Git Integrationを標準とします。リポジトリの`git.deploymentEnabled`により、Productionは`main`、必要時の非本番Previewは信頼された`preview/**`ブランチから配備します。通常のfeature/PRブランチは自動デプロイしません。

PRの`/preview`コメントから、対象HEADのCIを実施したうえで合成コミットを使ったOn-demand Previewを起動します。Productionと通常のReleaseは実際のソースSHAを使用します。OAuthなど固定URLが必要な場合だけFixed Stagingを採用します。

既定方式の詳細は`docs/vercel.md`、`docs/vercel-on-demand-preview.md`を参照してください。固定Stagingは`docs/vercel-fixed-staging.md`です。

## 補足資料

- `docs/application-releases.md`：必要時だけ導入するアプリのタグとGitHub Release。
- `docs/azure-oidc.md`：GitHub ActionsからAzureへアクセスする場合のOIDCと権限境界。
- `docs/ci-performance.md`：CIの速度とキャッシュ設計。
- `docs/ui-implementation.md`、`docs/ui-review.md`：UI実装と画面レビュー。
- `docs/independent-review.md`：Codexレビューを含む独立レビュー。
- `docs/adoption.md`：導入・更新・プロバイダー側の動作確認。

既存のアプリを新しい既定設定に合わせるためだけに改修しません。Foundationの改訂は採用先で影響を評価してから適用します。
