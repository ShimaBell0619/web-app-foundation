# GitHub Release Kit（任意）

Ownerが版付きGitHub Releaseを明示的に依頼したアプリだけに使います。Foundation自身は [Changesets](../../../docs/maintaining.md) を使います。通常のPRマージからreleaseを推測しません。

## 導入と信頼条件

[workflow.yml](workflow.yml) をアプリの `.github/workflows/release.yml` へコピーし、信頼済みCI名（既定 `CI`）を設定します。公開前にmainをレビューとCIで保護します。未保護mainでは未レビューのコード／Workflowが信頼済みと扱われます。この任意の特権Kitの条件であり、全アプリの必須条件ではありません。

- root権限はread-only、release jobだけが `contents: write` を持ちます。
- 同じrepoのmainへのpush CI成功だけが公開を起動します。未信頼PRから公開しません。
- 成功runの正確なsource SHAを資格情報を残さずcheckoutし、preflight・公開直前にmainとの一致を検査します。mainが進んだら中止し、新SHAへ黙って移りません。
- repo単位で直列化し、既存 `vX.Y.Z` を移動しません。lightweight／annotated tagとも実commitを解決してCI SHAと比較します。
- Releaseはdraftでなくpublishedで、prereleaseは `PRERELEASE` と一致し、tagはCI SHAを指す必要があります。完全一致の再実行は冪等、相違・部分完了は失敗します。
- 公開jobではPRのコード、未信頼Artifact、特権cacheを実行・復元しません。

## 明示的なrelease

1. milestoneと版を承認し、アプリのpackage.jsonを `X.Y.Z` に更新します。
2. 品質ゲートを通し、保護されたmainへマージします。
3. main CI成功時、checkout commitの第一親から版が変わっていれば、生成notesでtagとReleaseを公開します。
4. tag、published Release、metadataを確認します。配備アプリはProductionと実動作も別に確認します。

tag、GitHub Release、Vercel配備、CI、実UIは別の証拠です。第一親による版比較と単純な `X.Y.Z` を前提にします。merge commit、独立release branch、SemVer suffix、別version正本へ適応する場合はレビュー・検証します。

## 失敗時

tag競合、draft、誤owner／branch、正確なCI成功の欠如、API障害、進んだmain、prerelease不整合は失敗です。暗黙の再試行やforce更新を許可しません。結果不明のAPI書き込みを再試行する前にtagとReleaseを照会し、未実行と部分成功を区別します。

このKitは資格情報やブランチ保護を設定せず、Foundation自身でも実行しません。
