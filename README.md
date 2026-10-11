# Web App Foundation

Chatが設計・実装・テスト・実ブラウザ検証・外部操作まで進めるための、必要最小限の開発ルールと導入用kitです。Workはユーザーが明示的に指示した場合だけ利用します。

- [AGENTS.md](AGENTS.md)：共通開発規則と承認・セキュリティ境界の正本
- [docs/README.md](docs/README.md)：必要な専門文書の入口
- [kits/web/README.md](kits/web/README.md)：lockfile付きReactスターターと生成スクリプト
- [docs/adoption.md](docs/adoption.md)：新規アプリへの導入
- [kits/vercel/README.md](kits/vercel/README.md)：通常公開はSimple。Controlledは明示要求時のみ

通常の採用・開発は上記の規則、Web Kit、生成器、基本CIとSimpleから始めます。次のKitは必要な場合だけ読み、導入します。

- [kits/github/repository-create/README.md](kits/github/repository-create/README.md)：任意の管理用GitHub機能
- [kits/github/release/README.md](kits/github/release/README.md)：GitHub Releaseの公開
- [docs/azure.md](docs/azure.md)：Azure連携

Node/npmとChangesetsを利用します。Foundationの**バージョン正本はpackage.json**。他文書にバージョンのコピーを持ちません。
