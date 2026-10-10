# Webアプリ用Kit

[PRODUCT.md](PRODUCT.md) は製品の動作、[DESIGN.md](DESIGN.md) はUI・UXの契約テンプレートです。製品固有の内容に置き換えてから実装します。

描画確認は [UI手順](../../docs/ui.md)、導入は [adoption.md](../../docs/adoption.md) を参照してください。アプリ固有のselectorと操作シナリオは採用先が所有します。

[starter](starter) は実行可能なReact／TypeScript／Viteと実lockfileの正本です。Foundationの外の空ディレクトリへ `node scripts/create-app.mjs <出力先> --name <名前> --foundation-sha <レビュー済み40桁SHA>` で生成します。npm installやGitHub／Vercel操作は行いません。

スターターにはChromium E2Eが含まれ、生成callerはrun_e2e=trueです。320／390／1440px、入力・更新・リセット、Tab／Enter／Space、見えるfocus、pageerror／console.error、成功時画像を確認します。アプリ固有の操作へ更新してください。
