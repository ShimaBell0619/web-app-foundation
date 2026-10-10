# GitHub private repository creation (optional kit)

このkitは、ChatからOwnerによる明示的な承認を受けた**private repositoryの新規作成**だけに利用します。Foundation自身のGitHub Actionsでは実行されません。

## 導入
1. 既に存在する、Ownerが管理できる信頼済みの管理用リポジトリを選びます。新規repo作成には先にその実行場所が必要です。
2. `workflow.yml`を管理用リポジトリの`.github/workflows/create-private-repo.yml`へ、`create-private-repo.mjs`を`scripts/create-private-repo.mjs`へコピーします。
3. Workflow内の実行パスを`node scripts/create-private-repo.mjs`へ変更し、管理用リポジトリのmainとGitHub Environmentで実行者・ブランチを保護します。
4. 期限付きで必要最小限の「新規Repository作成」権限を持つユーザートークンを作成し、管理用Environmentに`REPO_CREATION_TOKEN`として保存します。**ChatやIssueには貼り付けないでください。**
5. Ownerが作成した `repo-create: <safe-name>` のIssueで、Ownerの正確な `/create-private-repo` コメントを受信した場合だけ起動します。

## 実行と検証
- プログラムはOwner・Issue作者・コメント作者・Tokenのユーザー一致、安全な名前、既存repoの不存在を確認します。作成はprivateのみ、auto_init=trueです。
- 初期設定がない場合、認証情報を探したり権限を昇格したりせず失敗します。
- POST失敗／タイムアウト／応答喪失の後は、既存repoの状態を読み直してから再試行の可否を判断します。
- 公開、削除、既存repoの権限変更はこのkitの対象外。実行後にGitHub APIでowner、private、branch/初期状態を確認します。

