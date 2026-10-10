# Foundation導入

1. 新規アプリの要求・受け入れ条件を確認し、Foundationのレビュー済みコミットSHAを確定します。
2. [PRODUCT.base.md](../PRODUCT.base.md)と[DESIGN.base.md](../DESIGN.base.md)を採用先のPRODUCT.md、DESIGN.mdへコピーして**製品固有**の内容に書き換えます。
3. [AGENTS.md](../AGENTS.md)を採用先に合わせてコピーし、実在しないローカルパスを参照しないよう調整します。共通規範の二重管理はしません。
4. Nodeのバージョン、lockfile、check/typecheck/test/buildを用意します。no-opで品質ゲートを偽装しません。
5. Foundationの[web-ci.yml](../.github/workflows/web-ci.yml)を40桁のレビュー済みコミットSHAで呼び出す、アプリ所有のCI callerを作ります。
6. 必要な機能だけ[ Vercel ](../kits/vercel/README.md)、[ GitHub Release ](../kits/github/release/README.md)、[ Azure ](azure.md)から選択導入します。
7. 採用元のタグ・40桁SHA・コピーしたkitと設定差分・テストrun IDを記録します。
8. clean install、実test/build、画面・外部連携の実スモークで導入結果を確認します。

**v0.12.0は旧採用先互換を保証しません。** 旧パスや古いWorkflowを自動的に置換したり、権限・認証設定を暗黙に引き継いだりしないでください。
