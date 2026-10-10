# 採用先の開発規則

[Foundationの共通規則](https://github.com/ShimaBell0619/web-app-foundation/blob/__TEMPLATE_SHA__/AGENTS.md) を取得して適用してください。Chat-first、Workは明示指示のみ、日本語標準、承認・信頼境界を維持します。

- 製品の動作は [PRODUCT.md](PRODUCT.md)、UI・UXは [DESIGN.md](DESIGN.md) を正本とします。テンプレートを製品固有の内容へ置き換えてから実装します。
- 利用方法は [README.md](README.md)、証拠は [VERIFICATION.md](VERIFICATION.md) に記録します。
- npm ci、check、typecheck、test、buildを実行します。ブラウザの主要操作はアプリ固有のテストで確認します。
- main保護はユーザー方針で選択します。特権Kitを導入する場合は、その安全条件を別途満たします。
