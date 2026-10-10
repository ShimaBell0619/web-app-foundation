# Foundation導入

1. 要求・受け入れ条件を確認し、レビュー済みFoundationの40桁コミットSHAを選び、そのcommitをcheckoutします。
2. Foundationの外に空ディレクトリを用意し、生成します。

```bash
node scripts/create-app.mjs /path/to/new-app --name new-app --foundation-sha <レビュー済み40桁SHA>
```

3. 生成されたPRODUCT.md／DESIGN.mdを製品固有の契約へ置き換えます。AGENTS.mdの固定SHAの共通規則を取得して適用します。
4. .node-versionのNodeでnpm ci、check、typecheck、test、buildを実行します。生成は外部リソース作成やnpm installを行いません。依存を変えたときだけlockfileを再生成します。
5. アプリを短命branchへ一括コミットし、PRでCIを確認します。callerのSHAが実際にレビュー済みか確認します。40桁の書式検査だけではレビューを証明しません。
6. 必要なら [Vercel](../kits/vercel/README.md) のSimple方式でmainを接続します。main保護はユーザー方針で選択し、GitHub CI成功後のProduction公開は保証しません。特権Kitの保護条件は維持します。
7. 最初の機能PRからアプリ固有の操作・実画面を検証し、VERIFICATION.mdへ採用元SHA・CI参照SHA・最終SHA・run ID・配備・ブラウザの証拠を記録します。

配布物の正本は [Web Kit](../kits/web/README.md) です。生成先にはlockfile、日本語文書、Node指定、Simple設定、SHA固定callerが揃います。未コミットのFoundationから生成した場合は検証記録にその状態が表示されます。正式採用前にclean checkoutから再生成してください。

必要な機能だけ [Release](../kits/github/release/README.md)、[Azure](azure.md)、Controlledから選択導入します。採用先を更新するときは、コピーしたテンプレートSHAとCI参照SHAを別々に点検し、アプリ固有差分を維持します。旧パス・権限・認証設定を暗黙に引き継ぎません。
