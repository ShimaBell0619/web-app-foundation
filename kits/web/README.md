# Webアプリ用Kit

[PRODUCT.md](PRODUCT.md) は目的・重要な保証・境界、[DESIGN.md](DESIGN.md) はGoogle公式形式の**視覚デザインシステム**のテンプレートです。生成直後のDESIGN.mdは未定義であり、採用する色・書体・形状・コンポーネントのトークンと理由を製品固有の内容に置き換えてからUIを実装します。重要な製品保証はPRODUCT.md、具体的な振る舞いはテスト、技術上の事実はコード、共通のUI原則とブラウザ検証は[UI手順](../../docs/ui.md)を正本とします。

描画確認は [UI手順](../../docs/ui.md)、導入は [adoption.md](../../docs/adoption.md) を参照してください。アプリ固有のselectorと操作シナリオは採用先が所有します。

[starter](starter) は実行可能なReact／TypeScript／Viteと実lockfileの正本です。レビュー済みのclean checkoutから、Foundationの外の空ディレクトリへ `node scripts/create-app.mjs <出力先> --name <名前>` で生成します。CIは採用元と同じSHAを既定とし、別pinは明示指定します。npm installやGitHub／Vercel操作は行いません。

生成するAGENTSはrootの共通規則の指定範囲と、このKitのアプリ固有規則から組み立てます。規範を別に手書きコピーせず、参照ガイドのリンクは採用元SHAへ固定します。starterのcheckは構成・JavaScript構文とReact Hooks規則、typecheckは型、design:lintはDESIGNの構造を検査します。これらと実画面の確認は別の証拠です。

スターターにはChromium E2Eが含まれ、生成callerはrun_e2e=trueです。320／390／1440px、入力・更新・リセット、Tab／Enter／Space、見えるfocus、pageerror／console.error、成功時画像を確認します。アプリ固有の操作へ更新してください。
