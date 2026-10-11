# Foundation導入

1. 要求・受け入れ条件を確認し、レビュー済みFoundationの40桁コミットSHAを選び、そのcommitをcheckoutします。
2. Foundationの外に空ディレクトリを用意し、生成します。

```bash
node scripts/create-app.mjs /path/to/new-app --name new-app --foundation-sha <レビュー済み40桁SHA>
```

3. 生成されたPRODUCT.mdを**製品目的・重要な保証・制約の短い契約**に、DESIGN.mdをGoogle公式形式の**視覚デザインシステム**に置き換えます。生成時のDESIGN.mdは名前のみ展開された未完成テンプレートです。採用したデザイントークンと視覚的な理由を記載し、対応するomitted項目を削除します。AGENTS.mdの固定SHAの共通規則を取得して適用します。
4. .node-versionのNodeでnpm ci、check、typecheck、test、buildを実行します。生成は外部リソース作成やnpm installを行いません。依存を変えたときだけlockfileを再生成します。
5. アプリを短命branchへ一括コミットし、PRでCIを確認します。callerのSHAが実際にレビュー済みか確認します。40桁の書式検査だけではレビューを証明しません。
6. 必要なら [Vercel](../kits/vercel/README.md) のSimple方式でmainを接続します。main保護はユーザー方針で選択し、GitHub CI成功後のProduction公開は保証しません。特権Kitの保護条件は維持します。
7. 最初の機能PRからアプリ固有の操作・実画面を検証し、採用元SHA・CI参照SHA・最終SHA・run ID・配備・ブラウザの証拠を、該当する**Issue／PRとGitHub Actions**に記録します。常設のVERIFICATION.mdは生成しません。長期保管が必要な成果物はRelease等へ別途保存します。

公式CLIによる検証コマンド（Google 0.4.0へ固定、ランタイム依存なし）：

```bash
npx --yes --package=@google/design.md@0.4.0 designmd lint DESIGN.md
```

設計値とCSSが一致するかは、CLIの構造検証に加えて実装差分・実画面で確認します。CLIはMarkdownのtoken参照、構造、contrast等を検査しますが、CSSとの自動一致や製品UIの良否までは保証しません。公式CLIは警告でも終了コード0のため、出力をレビューして採否を判断します。生成CIにはlintジョブが含まれます。

配布物の正本は [Web Kit](../kits/web/README.md) です。生成先にはlockfile、日本語文書、Node指定、Simple設定、SHA固定callerが揃います。生成APIはテンプレート取得時のHEADを返します。未コミットのFoundationから生成した場合は生成結果にその状態が表示されるため、正式採用前にclean checkoutから再生成してください。

必要な機能だけ [Release](../kits/github/release/README.md)、[Azure](azure.md)、Controlledから選択導入します。採用先を更新するときは、コピーしたテンプレートSHAとCI参照SHAを別々に点検し、アプリ固有差分を維持します。旧パス・権限・認証設定を暗黙に引き継ぎません。

## ゼロからの受け入れ実証

| 段階 | 確認する証拠 |
| --- | --- |
| clean checkout→空ディレクトリ生成 | 採用元SHA、caller SHA、生成リンク、lockfile一致、上書き拒否 |
| clean installと標準ゲート | 指定Node、実依存、JS構文、型、意味のある単体テスト、dist生成 |
| 新規repoの初回PR | 実callerのrun ID、PR HEAD、checkout SHA、資格情報なしのE2E、3画像の目視 |
| 失敗経路 | .mjs構文誤り、必須見出し欠落、期待状態未到達、ブラウザエラーが有限時間で失敗すること |
| Simple公開 | project／Deployment ID、Production source SHA、READY、alias、公開版の操作と3画面幅 |

ローカル生成smoke、Foundation consumer-smoke、新規repo caller、実Vercel公開は別の証拠です。新規Public repoの作成経路が使えなければ、その工程を未実施として残します。既存アプリの成功から新規repo作成まで実証済みと推測しません。

## 効率の測定

PHENOMENA初回実証の基準は25 Actions run（CI14、Chromium9、臨時lockfile2）、成功23／失敗2、6マージPR、観測区間41分54秒です。作業内訳や手動介入の全数は未計測です。

| 指標 | 初回実証 | 改善構成／次回に測る値 |
| --- | --- | --- |
| Foundation常設Workflow | 2 | 2を維持 |
| アプリの通常品質Workflow | 2 | 1へ統合 |
| lockfile生成用臨時Workflow／run | 1／2 | 0／0を目標。依存変更時は別集計 |
| 初期ファイル群の個別構築 | React・文書・caller等を組立 | 空ディレクトリへの生成1コマンド |
| Public作成の手動介入 | 1、その他不明 | 接続に作成機能がなければ1を維持 |
| GitHub書き込み | ファイル単位の更新が多い、総数不明 | 各commitのファイル数・tree/commit/ref呼出し数を記録 |
| CI待機 | run数のみ既知 | queue／実行時間と状態取得回数をrun IDで分けて記録 |
| UI手戻り | 後付けE2Eで入力・mobileを修正 | 初回PRの画像確認時刻と手戻りPR数を記録 |

25→14 runは、同じtrigger集合から別Chromium9と臨時2を除く構造上の比較です。新規構成の実測値や経過時間の短縮保証ではありません。初回からE2Eを実行することで、1runの時間は増え得ます。手順数は「生成・仕様記入・install/検証・一括commit・PR/CI・マージ・配備照合・公開ブラウザ」の8段階で数え、API呼出し数・ユーザー操作数とは混同しません。
