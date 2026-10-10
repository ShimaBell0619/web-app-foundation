# Chatからの実装・外部操作

権限・承認・Workの使用条件・Gitの規則は[AGENTS.md](../AGENTS.md)が正本です。この文書は**実行手順**だけを扱います。

## 手順
1. 目的・受け入れ条件・開始repo/SHAと変更禁止事項を確認する。
2. この会話で実際に使える接続と権限を調べる。直接GitHub/Vercel等のツール → Chat内実行 → 許可済み一時環境 → 信頼済みGitHub Actionsの中から、最小権限と実効性で適切な経路を選ぶ。
3. 作業ブランチを作成し、変更・テスト・CIを現在HEADに対して実行する。編集・CI・公開・実表示・外部データの整合性を別々に確認する。
4. 実行結果、PR/CI/Deployment IDを記録。失敗・不明なPOSTはまず状態を再取得してから再実行を判断し、無条件に再送しない。
5. 本番操作と破壊的変更は対象範囲、承認、秘密境界、復旧性を確認する。承認済み範囲外の権限昇格や未確認の有料リソース作成を行わない。

## 操作別の参照先
- 実画面： [docs/ui.md](ui.md)。静的HTMLやHTTP 200は実ブラウザ証拠ではない。
- Vercel： [kits/vercel/README.md](../kits/vercel/README.md)。PR HEADとGit ref、deployment ID、READY、画面を区別する。
- 新規private repo： [管理kit](../kits/github/repository-create/README.md)。導入・Credential設定後のみ実行できる。
- GitHub Release： [Release kit](../kits/github/release/README.md)。タグ、SHA、公開状態を再確認する。
- Azure： [docs/azure.md](azure.md)。read/what-if/apply/deleteを別承認、別権限として扱う。

実行環境や接続がなければ、安全な代替経路を探索し、実施できなかった工程は未完了と明示します。
