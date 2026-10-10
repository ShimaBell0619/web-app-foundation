# Chatからの実装・外部操作

権限・承認・Work・Gitの規則は [AGENTS.md](../AGENTS.md) が正本です。この文書は実行手順を扱います。

## 実行経路

1. 目的・受け入れ条件・開始repo／main SHA・変更禁止事項を確認します。
2. 実際に利用できる接続と権限を確認し、直接コネクター、Chat内実行環境、許可済み一時環境、信頼済み既存CIから適切な経路を選びます。失敗だけを理由にWorkへ移りません。
3. [導入手順](adoption.md) で生成し、ローカルの実行経路が使える場合はnpmとブラウザをそこで準備します。使えなければ同じアプリ所有CIを代替にします。lockfileだけの臨時Workflowを先に作りません。
4. 作業branchへ一貫した変更をまとめ、PR・現在HEADのCI・自己レビューを確認します。
5. 編集、CI、配備READY、HTTP、実データ、実画面を別々に検証し、対象SHA／run／Deployment IDを記録します。

権限・認証・承認の迂回や、承認範囲外の有料リソース作成を代替経路に含めません。利用可能な安全な経路がなければ未完了の工程を明示します。

## 複数ファイルの一括コミット

Gitが利用できれば、差分を確認し、対象ファイルをstageして通常のcommit／pushを使います。利用できない場合はGitHub Git Data APIを使います。

1. 対象branch HEAD Pとそのtreeを再取得します。初回は最新mainの正確なSHAからbranchを作ります。
2. Pのtreeをbaseに、変更ファイルを一つのtreeへまとめます。削除はそのpathのsha=nullで表します。差分以外のファイルを失いません。
3. parent=P、作成treeを参照する一つのcommit Cを作ります。
4. branch HEADがPのままか照合し、force=falseでCへ更新します。接続がexpected_shaを提供する場合はPを渡します。
5. 更新後のHEADとtreeを再取得し、意図した全ファイルを確認してからPRを作ります。

標準RESTのref更新には原子的なexpected-old-SHA条件がありません。直前GETだけで完全な競合防止とは扱いません。専用短命branchで並行writerを避け、競合時は新HEADを読み直して変更を再構成します。非fast-forward更新やforceで押し切りません。未採用のtree／commit作成はbranch公開とは別の状態です。

## CIの追跡

最終PR HEAD SHAから該当runを取得し、run ID・attemptを固定して追跡します。待機中は原則30〜60秒間隔でrun状態だけを確認し、完了後にjobsを一度取得します。失敗jobのlogと必要なArtifactだけを読みます。ファイルごとのcommit、全run一覧の繰返し、実行中の全log取得は避けます。

runのhead_shaと、PRのmerge refをcheckoutしたgithub.shaは異なり得ます。双方を記録し、Artifactの対象SHAを確認します。HEADが進んだら旧runを最終証拠にしません。CI失敗は原因を修正し、最終差分で再実行します。

## Publicリポジトリの作成

現在の [管理Kit](../kits/github/repository-create/README.md) はPrivate専用です。Public化のために制約を緩めません。既存接続がPublic作成を提供しなければ、ユーザーがGitHubで一度作成する経路を使い、以降の生成・一括commit・CIをChatから実行します。作成自動化は必要性と権限影響を評価する別件です。

## 操作別の参照先

- 実画面： [ui.md](ui.md)。HTTP 200だけでは実ブラウザの証拠になりません。
- Vercelと結果不明時の復旧： [公開Kit](../kits/vercel/README.md)。source SHA、READY、alias、実画面を照合します。
- Private作成： [管理Kit](../kits/github/repository-create/README.md)。設定済み資格情報と明示承認の範囲だけで実行します。
- GitHub Release： [Release Kit](../kits/github/release/README.md)。tag、SHA、publishedを確認します。
- Azure： [azure.md](azure.md)。read／what-if／apply／deleteの承認・権限を区別します。
