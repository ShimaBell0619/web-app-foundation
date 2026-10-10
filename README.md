# web-app-foundation

ChatGPTなどのAIを利用してWebアプリを開発するための、再利用可能な開発ルールとCIテンプレートです。アプリ固有の仕様・デザインは各アプリのリポジトリが管理します。

## バージョンと位置付け

Current Foundation version: **0.11.0 (pre-1.0)**.
実際のアプリで契約を検証するまでは`0.x`を維持します。標準構成はReact + TypeScript + Vite + npmですが、Next.jsなどの選択を禁止するものではありません。

## 最初に読むもの

- [`AGENTS.md`](AGENTS.md)：AI・開発者の共通ルール（承認、品質、Work明示指示）。
- [`docs/README.md`](docs/README.md)：**全文書とGitHub Actionsの一覧、用途別の読む順番**。
- [`docs/adoption.md`](docs/adoption.md)：アプリへの導入・Foundation更新。
- [`docs/ai-implementation.md`](docs/ai-implementation.md)：Chatからの実装・検証・ツール選択。
- `PRODUCT.base.md` / `DESIGN.base.md`：採用先アプリで個別に具体化する仕様の原型。

変更対象に関係する文書だけを読みます。IssueとPRは判断・変更の記録であり、アプリの最新仕様は採用先の`PRODUCT.md`と`DESIGN.md`が正本です。

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

## 詳細な運用ガイド

UI、Vercel、Azure OIDC、CI、独立レビュー、バージョン管理、GitHubの管理操作は [`docs/README.md`](docs/README.md) から必要な項目だけ参照してください。既存アプリを新しいFoundationの既定値へ合わせるためだけに変更しません。
