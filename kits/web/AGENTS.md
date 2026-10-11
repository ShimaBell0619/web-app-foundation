# 採用先の開発規則

[Foundationの共通規則](https://github.com/ShimaBell0619/web-app-foundation/blob/__TEMPLATE_SHA__/AGENTS.md) を取得して適用してください。Chat-first、Workは明示指示のみ、日本語標準、承認・信頼境界を維持します。

- [PRODUCT.md](PRODUCT.md) は製品目的・利用者への重要な保証・制約を示し、機能一覧の追記を必須としません。実装とデータ形式はコード、重要な動作はテスト、視覚設計は [DESIGN.md](DESIGN.md) を正本とします。
- UIの初期設計から、採用元の[文言・装飾の採用基準とUI手順](https://github.com/ShimaBell0619/web-app-foundation/blob/__TEMPLATE_SHA__/docs/ui.md)を適用します。
- 利用方法は [README.md](README.md)、変更理由と受け入れ条件はIssue／PR、検証証拠はPRとGitHub Actionsに記録します。永続的な検証履歴Markdownを追加しません。
- npm ci、check、typecheck、test、buildを実行します。ブラウザの主要操作はアプリ固有のテストで確認します。
- main保護はユーザー方針で選択します。特権Kitを導入する場合は、その安全条件を別途満たします。
