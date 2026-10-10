# バージョンと保守

## 版の正本とSemVer

Foundationと採用先は原則Semantic Versioning（MAJOR.MINOR.PATCH）を使います。Foundationの版の正本はpackage.json、root lockfileと最新releaseのCHANGELOGは一致させます。README／AGENTSへ版を重複記載しません。版はcommit SHA、Deployment ID、DB移行版、環境名の代用ではありません。

0.xでは互換修正・説明の補正をpatch、新しい採用先向け機能・意図的な契約破壊をminorにします。破壊的変更はCHANGELOGに明示します。1.0.0は実採用先の証拠に基づく安定性判断であり、採用先アプリは独立して1.0.0へ進めます。1.0.0以降は互換修正patch、互換機能minor、非互換の公開契約変更majorです。

## Changesetsと通常PR

採用先に影響する契約・共通Workflow・release関連変更にはChangesetを追加します。契約を変えないtest、書式、内部整理は不要な理由をPRへ記録します。品質CIはファイル変更だけからrelease意図を推測しません。

exact版の@changesets/cliをlockfileで管理し、npm ciで導入します。場当たり的なnpx解決へ置き換えません。

```bash
npm run changeset
npm run version:status
npm run version-packages
npm run tag-version
```

version:statusはローカル診断です。release PRはChangeset消費済み、対象外PRはChangesetなしで正当なため、すべてのCIでpending Changesetを必須にしません。CLIの実行可能性を検査します。

## release PRと公開

1. 承認済みの通常PRと必要なChangesetをマージします。
2. clean checkoutでnpm ci、Foundation検証・回帰テスト、version:toolingを実行します。
3. release branchでversion-packagesを実行します。package.json、CHANGELOG、lockfileの版を更新し、消費済みChangesetだけを削除します。
4. 生成されたrelease状態をレビューします。npm ci後に無差別なgit add -Aを使わず、対象metadataだけをstageします。release PRへ新Changesetを要求しません。
5. 最終状態でnpm ci、foundation:validate、foundation:test、foundation:release-validateを実行し、CI成功後にマージします。
6. 検証commitから不変のvX.Y.Z tag／GitHub Releaseを公開し、採用先は明示的に更新します。既存tagを移動しません。

v0.11.0／v0.12.0／v0.12.1は独立レビュー済み・Owner起動の一回限りWorkflowを使い、公開後に常設場所から削除しました（Issues #93・#98、v0.12.0 run 38030557699、v0.12.1 run 38030930756）。過去の公開用Workflowを再利用しません。今後も明示承認済みの公開経路を別途レビューし、利用後に削除します。[索引](README.md) は現行Workflowだけを列挙します。完全なrelease手順を実証してから次版の公開を実証済みとします。

## 採用先のreleaseと由来

通常の機能マージから版更新や公開を推測しません。明示的な版付きreleaseでは、要求SemVer、正確な検証commit、不変tag、published Release、beta等のprerelease、必要ならProductionの証拠を揃えます。tagだけでGitHub Release完了とは扱いません。[Release Kit](../kits/github/release/README.md) は成功main CIのworkflow_run.head_shaへ公開を結び付け、競合tagを拒否します。

コピーした規則／テンプレートの採用元SHAと共通Workflowの参照SHAは両方記録します。異なっていてもよく、明示的に更新します。アプリ固有差分を別に記録し、Foundation更新で上書きしません。

## CIの性能とキャッシュ運用

## 既定のキャッシュ

共通Web CIでは、`actions/setup-node` のnpmキャッシュを使用する。キャッシュするのはnpmのパッケージダウンロード用キャッシュであり、**`node_modules` ではない**。`npm ci` はコミット済みのロックファイルを基に依存関係を再構築する。

`cache-dependency-path` には正本となるロックファイルを指定する。共通Workflowは特権を持たない品質検証向けであり、公開・配備の特権付きジョブに同じキャッシュ方針を無条件で適用しない。

## 既定では追加しないキャッシュ

以下は、存在するという理由だけでキャッシュしない。

- `node_modules`
- Playwrightなどのブラウザ実行ファイル
- `.next/cache` などのフレームワークのビルド出力
- テストランナーのキャッシュ
- 生成成果物

追加するたびに、無効化条件、保存容量、セキュリティ、障害調査の負担が増える。

## キャッシュを追加する条件

キャッシュ未使用時の実行時間、ヒット率、復元・保存時間、サイズ、無効化の正しさ、信頼境界とキャッシュ汚染のリスクを測定してから判断する。わずかな時間短縮のために、原因が分かりにくい古い状態を持ち込まない。

**秘密情報、認証情報、本番設定、特権のある変更可能な状態をキャッシュしない。** 特権付きの公開・配備ジョブではキャッシュを使用しないことを既定とし、利用する場合は脅威モデルを明示的にレビューする。

## 依存関係のインストール

npmアプリのCIでは`npm ci`を使用する。`package-lock.json`をコミットし、変更をレビューする。

Foundation CIでは採用先アプリを模したテスト用プロジェクトも実際に実行する。依存関係のインストールを単なる文字列や何もしない処理に置き換えても、検証を満たしたことにはならない。

## 必須の品質ゲート

既定では`check`、`typecheck`、`test`を実行し、`build`は常に実行する。前の3つを省略できるのは、Workflowの入力で理由を空文字にせず明示した場合だけとする。

これにより、必要なnpmスクリプトの削除・改名が、検証範囲の黙示的な縮小ではなくエラーとして検出される。

## E2Eテスト

ブラウザのセットアップや実行環境の起動に時間がかかるため、共通WorkflowのE2E（End-to-End）入力は任意とする。ただし新規スターターのcallerとFoundation consumer-smokeは初回から有効にする。

`run_e2e`を有効にした場合、`test:e2e`は必要なブラウザ・サーバーの起動から終了処理までを含む、1回で終了するコマンドでなければならない。

Playwrightの複雑な準備、画面検証用の基盤、環境別の認証情報、プロバイダー固有サービスなどが必要な場合は、アプリ側で所有するE2Eジョブを利用する。

ブラウザやフレームワークのキャッシュを追加する場合も、測定結果に加え、バージョン・プラットフォームに対応したキーと信頼境界の明示的なレビューを必要とする。

## スターターの保守

配布依存とlockfileはkits/web/starterを正本にし、依存更新時は実際のnpmで更新します。create-appで生成した独立出力先のclean install・品質ゲートと、consumer-smokeのChromiumを確認します。ブラウザ実行ファイルのcacheは追加しません。生成文書は導入smokeでリンクを検査します。通常CIで同じ専用検査を重複実行しません。
