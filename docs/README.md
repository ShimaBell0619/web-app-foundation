# 文書とGitHub Actionsの案内

このページは、Web App Foundationの**文書・実行経路を探すための索引**です。初回や毎回の作業で全ファイルを読み込まないでください。

## 最初に読むもの

1. **[AGENTS.md](../AGENTS.md)** — 承認境界、Chat-first、品質・Git操作の共通規則。恒常的な開発ルールの正本。
2. **[README.md](../README.md)** — Foundationの目的と利用方法（短い入口）。
3. **この索引** — 変更対象に応じて必要な文書とWorkflowを選択。
4. 新規アプリの導入時だけ **[docs/adoption.md](adoption.md)**、実装の進め方が必要なら **[docs/ai-implementation.md](ai-implementation.md)** を追加。

アプリの**機能・制約**は採用先`PRODUCT.md`、**画面・UX**は採用先`DESIGN.md`が正本です。Issue・PR・CIログは経緯と証拠であり、仕様の正本ではありません。

## 文書一覧（正本と使用条件）

`docs/`の既存パスは採用先アプリが参照しているため、今回は**移動・改名しません**。分野別の区分はこの表で管理します。

| ファイル | 役割・読むとき | 位置付け |
| --- | --- | --- |
| [`docs/adoption.md`](adoption.md) | 新規アプリ導入・Foundation更新・採用元記録 | 導入時 |
| [`docs/ai-implementation.md`](ai-implementation.md) | Chatの道具選択、Work明示指示、実装と検証 | 開発手順の正本 |
| [`docs/independent-review.md`](independent-review.md) | 独立レビューの判断・依頼・指摘対応 | 高リスク変更時 |
| [`docs/ui-implementation.md`](ui-implementation.md) | UI部品と構造の設計 | UI実装時 |
| [`docs/ui-review.md`](ui-review.md) | 実ブラウザによる表示・操作検証 | UIレビュー時 |
| [`docs/ci-performance.md`](ci-performance.md) | npmキャッシュ、CI効率、追加しない最適化 | CI最適化時 |
| [`docs/versioning.md`](versioning.md) | FoundationのChangesets・版管理・リリース手順 | Foundationリリース時 |
| [`docs/application-releases.md`](application-releases.md) | 採用先アプリのタグとGitHub Release | アプリの明示的な版公開時 |
| [`docs/vercel.md`](vercel.md) | Vercel Git Integrationと環境・品質境界の全体像 | Vercel採用時 |
| [`docs/vercel-on-demand-preview.md`](vercel-on-demand-preview.md) | PRの明示要求によるPreview（既定方式） | Preview構築・変更時 |
| [`docs/vercel-fixed-staging.md`](vercel-fixed-staging.md) | 固定URLを要するStaging（既定ではない） | 固定オリジンが必要なときだけ |
| [`docs/azure-oidc.md`](azure-oidc.md) | Azure OIDCの認証・RBAC・操作境界 | Azure連携時 |

**読み分け**：Vercelはまず`docs/vercel.md`、Previewの具体実装だけ`docs/vercel-on-demand-preview.md`。固定Stagingは採用する場合だけ読む。Foundationの版公開は`docs/versioning.md`、アプリ独自のReleaseは`docs/application-releases.md`で扱う。

## GitHub Actions（このリポジトリで有効）

以下は**Foundation自身の`.github/workflows/`**の一覧です。アプリへコピーするテンプレートとは区別します。

| ファイル | 起動条件と用途 | 権限・現在の状態 |
| --- | --- | --- |
| [`.github/workflows/foundation-ci.yml`](../.github/workflows/foundation-ci.yml) | PR・mainへのpush。Foundation検証と消費側CIスモーク | `contents: read`。**常時使用** |
| [`.github/workflows/web-ci.yml`](../.github/workflows/web-ci.yml) | `workflow_call`。採用先アプリがレビュー済みの40桁SHAで呼ぶ共通品質CI | チェック・テスト・ビルド。**再利用可能** |

**完了した一時運用**：`publish-foundation.yml`はv0.11.0のIssue #93専用で、[正式Release](https://github.com/ShimaBell0619/web-app-foundation/releases/tag/v0.11.0)の発行とSHA確認が完了しました。再利用できない固定コマンドを持つため、稼働Workflowから削除。実行証拠は[Actions履歴](https://github.com/ShimaBell0619/web-app-foundation/actions/runs/37979791524)とGit履歴に残します。今後のFoundation Releaseは`docs/versioning.md`に従って、その版に対応する検証・承認付き公開経路を用意します。

### 採用先アプリへコピーするテンプレート（Foundationでは実行しない）

| テンプレート | 用途・採用条件 |
| --- | --- |
| `templates/release/release.yml` | アプリに明示的な版公開要件があるときだけ |
| `templates/vercel/on-demand-preview/preview.yml` | Vercelの既定Preview方式を採用する場合 |
| `templates/vercel/fixed-staging/*.yml` | 固定Stagingが必要な場合だけ |

`/ui-review`、`/cleanup-branch`、`/azure-inventory`、`/azure-what-if`、`/deploy-azure`は**SwitchBot等の採用先アプリ固有のWorkflow**であり、Foundation本体の有効Workflowではありません。対象アプリの`AGENTS.md`と`.github/workflows/`を確認してから使います。

**任意管理kit**：`kits/github/repository-create/`はコピー先の管理用リポジトリでのみ稼働し、Foundation自身では起動しません。権限の初期設定は未実施です。

## 文書とWorkflowを増やす判断

- 同じ規範を複数ファイルで重複定義しない。共通ルールは`AGENTS.md`、実行手順は`docs/ai-implementation.md`、専門事項は該当1ファイルを正本とする。
- 新規文書が本当に必要な場合だけ作成し、**この索引の一覧と用途**を同じPRで更新する。単発作業はIssue/PRに記録し、恒久文書を作らない。
- 新規Workflowもトリガー、責務、権限、稼働条件、削除基準をこの一覧へ追加する。完了済みの一回限りWorkflowを常時稼働させない。
- 索引から漏れた`docs/*.md`と有効Workflowは`npm run foundation:validate`で検出する。パス互換性に影響する文書の移動・削除は別途検討し、採用先との参照関係を確認する。
