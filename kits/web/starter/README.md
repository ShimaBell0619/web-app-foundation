# __APP_NAME__

日本語のReact／TypeScript／Viteスターターです。製品の目的・重要な保証・境界を [PRODUCT.md](PRODUCT.md)、視覚デザインを [DESIGN.md](DESIGN.md) に記入してください。機能の細部はコードと代表テストで管理します。

## 開発と検証

.node-versionに記載したNodeを使います。

```bash
npm ci
npm run check
npm run typecheck
npm test
npm run build
npm run design:lint
npm run test:e2e
npm run dev
```

結果はGitHubのIssue・PR・Actionsへ記録します。開発規則は [AGENTS.md](AGENTS.md) を読みます。初期画面の検証は、後から作る製品の受け入れ検証とは別です。

checkは構成・JavaScript構文・React Hooks規則を、typecheckはTypeScriptの型を検査します。design:lintはlockfileに固定したGoogle CLIを使います。DESIGNとCSSの対応や実際の画面・操作は別に確認します。

この小さなスターターはsemantic HTMLとCSSを使います。通常のReact製品で部品が必要になったら、採用元のUI方針に沿って成熟したアクセシブルな部品を選びます。

Chromiumの初回実行はOS依存ライブラリを準備します。管理者権限のない環境では、準備済み環境または資格情報のないCIを利用してください。成功時も320／390／1440pxの画像をtest-resultsへ保存し、目視で確認します。CI Artifactは7日保持します。
