# __APP_NAME__

日本語のReact／TypeScript／Viteスターターです。製品固有の仕様を [PRODUCT.md](PRODUCT.md) と [DESIGN.md](DESIGN.md) へ記入し、最初の機能PRで代表テストを更新してください。

## 開発と検証

.node-versionに記載したNodeを使います。

```bash
npm ci
npm run check
npm run typecheck
npm test
npm run build
npm run dev
```

結果は [VERIFICATION.md](VERIFICATION.md) に記録します。開発規則は [AGENTS.md](AGENTS.md) を読みます。初期画面の検証は、後から作る製品の受け入れ検証とは別です。

この小さなスターターはsemantic HTMLとCSSを使います。通常のReact製品で部品が必要になったら、採用元のUI方針に沿って成熟したアクセシブルな部品を選びます。
