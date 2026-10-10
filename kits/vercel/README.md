# Vercel公開方式

| 方式 | 用途 | main保護 | CIと公開の関係 |
| --- | --- | --- | --- |
| Simple | 非クリティカルなアプリを標準Git連携で公開 | ユーザー方針で選択 | GitHub CI成功を待つ保証はない |
| Controlled | 明示要求によるPR Preview・固定Staging | 特権Workflow有効化前に必須 | 正確なPR HEADのCI成功後にPreview／Staging refを更新。ProductionのCI連動は別契約 |

どちらもProduction公開元は `main` だけです。GitHub CI、Deployment READY、HTTP応答、実ブラウザの表示は別の証拠です。

## Simpleの導入

1. Vercel標準Git連携で対象リポジトリを接続し、Production Branchを `main` に設定します。
2. [simple.json](simple.json) の `git.deploymentEnabled` をアプリの `vercel.json` に取り込みます。通常ブランチを自動配備しない設定です。Vite SPAのrewriteはアプリのルーティング要件に応じて追加します。
3. SHA固定のWeb CI callerを導入します。特権Workflow、GitHub Secret、固定Stagingは不要です。ブランチ保護は一律必須にしません。
4. 配備記録でrepo、mainのsource SHA、project／deployment ID、Production、READY、公開aliasの対応を確認し、そのDeploymentのURLと公開URLをブラウザで検証します。

mainへのpushでGitHub CIとVercel buildは独立して進みます。CI失敗でもProductionへ公開され得ます。CI成功後の公開が必要なら、公開手順自体を別途設計してください。Controlled Kitだけでこの保証は得られません。

## Controlledの導入

この任意のアプリ所有Kitは、同じリポジトリのopen PR（base=`main`）に対する明示的な `/preview` と `/staging` だけを扱います。既存アプリへ自動導入しません。

1. [hosted-review/workflow.yml](hosted-review/workflow.yml) を `.github/workflows/hosted-review.yml` へコピーし、[hosted-review/hosted-review.mjs](hosted-review/hosted-review.mjs) と [shared/provenance.mjs](shared/provenance.mjs) をWorkflowの参照パスを保ってコピーします。Foundation自身の常設Workflowは2本のままです。
2. [vercel.json](vercel.json) または [vite-spa.json](vite-spa.json) のControlled設定を取り込みます。許可refは `main`、`preview/**`、`staging` だけです。Git連携の追跡設定と不要なブランチが配備されないことを確認します。固定枠が必要なら `staging` をmainから初期化し、固定ホスト名を設定します。
3. Repository Variable `VERCEL_PROJECT_ID`、Deployment読み取り用の最小権限Secret `VERCEL_API_TOKEN`、必要なら `VERCEL_TEAM_ID`、固定Staging用 `FIXED_STAGING_URL`（HTTPS origin・末尾 `/`）を設定します。標準の `repository_dispatch` 通知 `vercel.deployment.ready` を有効にします。独自通知ブリッジは不要です。tokenはコミットしません。
4. `web-ci.yml` のpinをレビュー済み40桁SHAへ更新します。正確なPR HEADでnpmの品質ゲートを通し、token権限、mainの保護／ruleset、Vercel account・projectの対応、スモークを確認します。

**保護されていないmainで特権Kitを有効化してはいけません。** writerは未保護mainを変更できるため、PRの権限検査だけでは特権publisherを保護できません。この条件はSimple方式には適用しません。

## Controlledの信頼境界

- writerの正確なコマンドを受け、コメント・権限・PR HEAD AをGitHub APIから再取得します。出力にAと要求コメントIDを記録します。
- 資格情報のないWeb CIで正確なAを検証します。成功後だけ、別権限の信頼済みmain publisherが子Bを作ります。`parent(B)=A`、`tree(B)=tree(A)`、一意のowner／source trailer、ref SHA leaseを確認します。HEAD変更やPR closeは書き込みを中止します。
- Previewは `preview/pr-N`、Stagingは単一refです。後続の正当な要求、直列化、要求IDの所有権を検査します。close時はそのPR所有のPreviewだけを削除し、Stagingも同じPRが所有する場合だけlease付きで戻します。
- ref更新はREADYを意味しません。通知をtoken付きVercel API（project／deployment ID、READY、URL、ref、正確なB）と現在のGitHub PR／ref／A／tree／ownerで照合します。通知自体は信頼しません。
- Previewまたは固定Staging URLの通知と、固定originへのHTTP確認を別に記録します。HTTP成功だけで実画面検証済みとしません。失敗・古い通知から成功コメントを出しません。

標準イベントは `environment: preview`、`project.id`、`state.type: ready`、`git.ref`、`git.sha`、`id`、`url` を必要とします。固定StagingもVercel上はPreview環境です。owner PRは検証済みcommitの一意なtrailerから導出します。

## 最小の受け入れ検査

- writerだけが要求でき、HEAD変更・CI失敗時は公開しない。古いStaging要求が新ownerを上書きしない。
- closeが別ownerの枠を戻さず、再送通知で重複通知しない。
- 偽READY、別project、古いB、誤ref／parent／tree、固定URL障害、並行ref変更を拒否、またはHTTP未確認として区別する。
- 実Vercelの配備ポリシー、記録、固定URL、ブラウザを採用先で検証する。Foundationの単体テストだけで実プロバイダー実証済みとしない。

操作・復旧は [operations.md](../../docs/operations.md)、採用は [adoption.md](../../docs/adoption.md)、共通規則は [AGENTS.md](../../AGENTS.md) を参照してください。
