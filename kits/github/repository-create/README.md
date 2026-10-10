# GitHub private repository creation (optional kit)

このkitは、ChatからOwnerによる明示的な承認を受けた**private repositoryの新規作成**だけに利用します。Foundation自身のGitHub Actionsでは実行されません。

## 導入
1. 既に存在する、Ownerが管理できる信頼済みの管理用リポジトリを選びます。新規repo作成には先にその実行場所が必要です。
2. `workflow.yml`を管理用リポジトリの`.github/workflows/create-private-repo.yml`へ、`create-private-repo.mjs`を`scripts/create-private-repo.mjs`へコピーします。Foundationの`.node-version`もコピーします。実行パスの書き換えは不要です。
3. 管理用リポジトリのmainをPR・実際のCI check必須、force push・削除禁止、バイパスなしで保護します。個人開発では必須レビュー0件を利用できます。GitHub Environment `repository-creation` を作成し、実行可能なブランチをmainだけに制限します。WorkflowはこのEnvironmentを明示し、イベントの信頼済みmain SHAをcheckoutします。private repoで保護・Environmentを利用できないプランの場合は、特権kitを有効化せず代替案をOwnerに確認します。
4. 期限付きFine-grained PATをOwnerのResource ownerで作成します。[POST /user/reposの公式仕様](https://docs.github.com/en/rest/repos/repos?apiVersion=2026-03-10#create-a-repository-for-the-authenticated-user)で必要な `Repository creation: write` を優先し、既存・新規private repoのメタデータを読めるRepository accessと自動付与の `Metadata: read` のみにします。選択済みrepoだけのアクセスでは、新規repoの事後GETができるか確認が必要です。`Contents`・`Issues`の権限はPATには付与しません。作成専用権限が画面にない場合は、`Administration: write`が既存repoの設定・削除にも影響することを説明して別途判断を得ます。PAT自体はpublic作成も許可するため、private限定は保護されたWorkflowとスクリプトで強制します。管理用Environmentに `REPO_CREATION_TOKEN` として保存し、Repository Secretへの代替保存はしません。**値をChat・Issue・PR・コミット・ログ・スクリーンショットに残さず、発行とSecret入力は本人がGitHub画面で行います。**
5. Ownerが作成した `repo-create: <safe-name>` のIssueで、Ownerの正確な `/create-private-repo` コメントを受信した場合だけ起動します。

## 実行と検証
- プログラムはOwner・Issue作者・コメント作者のlogin/ID、Tokenのユーザー一致、安全な名前、既存repoの不存在を確認します。Issueとコメントを実行時にGitHub APIから再取得し、open Issue・作者・内容・所属Issueの一致を確認します。作成はprivateのみ、auto_init=trueです。同名の並行要求を含め管理repo内の作成処理を直列化します。
- `GITHUB_TOKEN`は `contents: read`（checkout）・`issues: read`（要求再確認）だけを使います。PATは作成ステップだけに渡し、依存インストール・キャッシュ・PRコード実行は行いません。
- 初期設定がない場合、認証情報を探したり権限を昇格したりせず失敗します。
- POST失敗／タイムアウト／応答喪失の後は、既存repoの状態を読み直してから再試行の可否を判断します。
- 公開、削除、既存repoの権限変更はこのkitの対象外。201応答後に別のGETでrepo ID、owner、private、名前、URL、空でないdefault_branchを確認します。実際の初期コミット・branchの存在はGitHub接続で別途確認し、メタデータだけで確認済みとしません。
- Chatの既存接続がIssue作成・コメント投稿をOwnerとして実行できる場合、この管理repoに作成名のIssueを作り、明示的なユーザー指示に対応するコメントを投稿します。Actionsの実行結果と作成後の実状態を確認してから完了を報告します。GitHub接続の新規repo作成機能が追加されるわけではありません。

