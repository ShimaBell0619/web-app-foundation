# Versioning and Release Discipline

## Default model

Use Semantic Versioning (`MAJOR.MINOR.PATCH`) for Web App Foundation and, by default, for applications derived from it. `package.json` is the Foundation version source; root lockfile and the latest released CHANGELOG entry must agree with it. README/AGENTS do not mirror version strings.

Version numbers communicate product/repository compatibility. They are not substitutes for deployment identifiers, commit SHAs, database migration versions, or environment names.

Downstream application releases are a separate concern from Foundation releases. When an application explicitly publishes a versioned milestone, use `kits/github/release/README.md`; a Git tag alone is not considered a complete release when the requested contract calls for a published GitHub Release.

## Pre-1.0 policy

While Foundation `MAJOR = 0`:

- **patch** — backward-compatible fixes, clarifications, or small consumer-visible corrections that do not add a meaningful new Foundation capability,
- **minor** — new consumer-facing capabilities and any intentional breaking Foundation-contract change,
- breaking changes must be called out explicitly in `CHANGELOG.md` even though the numeric major remains `0`.

The decision to release `1.0.0` is a deliberate stability gate backed by real-consumer evidence. A downstream application may reach `1.0.0` independently.

## Stable SemVer policy

After `1.0.0`: patch = compatible bug fix, minor = compatible functionality, major = incompatible public/product/reusable-contract change.

## Changesets

Use Changesets to record version intent for consumer-visible or release-relevant work. Reusable workflow contract changes count as consumer-facing changes even though they live under `.github/`.

A Changeset is normally unnecessary only when the change truly does not alter a consumer-facing contract, such as test-only additions, formatting, or internal refactoring.

The CLI is an exact `@changesets/cli` devDependency covered by the committed lockfile. `npm ci` installs the release tooling used by these scripts:

```bash
npm run changeset
npm run version:status
npm run version-packages
npm run tag-version
```

`npm run version:status` is a **local diagnostic**, not an unconditional CI quality gate. A release/version PR has already consumed the pending Changesets, and a Changeset-exempt change is intentionally allowed to have none. CI therefore verifies that the locked CLI is installed and executable without requiring a pending Changeset on every PR.

Do not replace release tooling with ad-hoc `npx` resolution.

## Normal change PR versus release PR

A normal change PR and a release PR have different contracts:

### Normal change PR

- Add a Changeset when the change is consumer-visible or release-relevant.
- Use the PR template to state explicitly when a Changeset is not required.
- Quality CI validates the Foundation, but does not infer release intent solely from “some file changed in this root package”.
- `npm run version:status` may be used by a developer/agent as an additional diagnostic when appropriate.

### Release/version PR

- Run `npm run version-packages`.
- Changesets updates `package.json` and `CHANGELOG.md` and consumes the pending Changeset files.
- The committed sync script updates only the Foundation version in `package-lock.json`; `package.json` is the version source. README and AGENTS do not mirror it.
- Stage only the intended generated release-state files and the deletion of the specific consumed Changeset files. Do not use broad `git add -A` after `npm ci`; dependency trees and other generated local artifacts are not release metadata.
- Do **not** require a new Changeset merely because the release PR has no pending Changesets.
- Run `npm run foundation:release-validate` to verify package/lock/CHANGELOG consistency.

This separation prevents the release mechanism from rejecting its own version PR.

## Release sequence

A normal Foundation release is:

1. merge approved Issue-driven PRs with required Changesets,
2. start from a clean checkout and run `npm ci`, Foundation validation, validator regression tests, and `npm run version:tooling`,
3. create a release/version branch or PR and run `npm run version-packages`,
4. review the generated package version and changelog plus the synchronized lockfile (no README/AGENTS version mirrors),
5. run `npm ci`, `npm run foundation:validate`, `npm run foundation:test`, and `npm run foundation:release-validate` on the final release PR state,
6. merge only after the release PR quality gates pass,
7. create immutable `vX.Y.Z` release/tag evidence from that validated commit,
8. downstream apps adopt the new Foundation deliberately.

Do not mutate an existing released tag to point at different code. The complete release procedure should be exercised before the next Foundation release is treated as proven.

The v0.11.0-only publishing workflow (fixed Issue #93 and fixed `/publish-foundation-v0.11.0` command) has completed its release and was **removed from active `.github/workflows/`**. Its execution history and the published tag/Release remain the audit evidence. Do not reuse this release-specific workflow for a different version; implement an explicitly scoped, owner-approved publishing path for each future Foundation release (or introduce a separately reviewed generic release contract). The [documentation and workflow index](README.md) lists only currently active workflows.

## Downstream application release intent

Application release publication must remain explicit. Do not infer that every merged feature PR should bump an application version or publish a release.

When an Issue/user explicitly requests a versioned application release, the completion evidence should include:

- the application-owned version source at the requested SemVer;
- the exact validated commit intended for release;
- immutable `vX.Y.Z` tag evidence;
- a published GitHub Release associated with that tag;
- prerelease status when the milestone is intentionally beta/preview;
- Production deployment/status verification when the application has a Production host.

The optional downstream workflow in `kits/github/release/workflow.yml` binds publication to the successful `main` CI run's `workflow_run.head_sha` and refuses to move a conflicting existing tag. See `kits/github/release/README.md` for the full application contract.

## Downstream provenance

An application records both the commit from which copied Foundation rules/templates were adopted and the exact full commit SHA referenced by reusable workflows. These can differ and must be upgraded deliberately. Record app-specific deviations separately so Foundation upgrades do not erase local decisions.


## CI performance

# CIの性能とキャッシュ運用

## 既定のキャッシュ

共通Web CIでは、`actions/setup-node` のnpmキャッシュを使用する。キャッシュするのはnpmのパッケージダウンロード用キャッシュであり、**`node_modules` ではない**。`npm ci` はコミット済みのロックファイルを基に依存関係を再構築する。

`cache-dependency-path` には正本となるロックファイルを指定する。共通Workflowは特権を持たない品質検証向けであり、公開・配備の特権付きジョブに同じキャッシュ方針を無条件で適用しない。

## 既定では追加しないキャッシュ

以下は、存在するという理由だけでキャッシュしない。

- `node_modules`
- Playwrightなどのブラウザ実行ファイル
- `.next/cache` などのフレームワークのビルド出力
- テストランナーのキャッシュ
- 生成成果物

追加するたびに、無効化条件、保存容量、セキュリティ、障害調査の負担が増える。

## キャッシュを追加する条件

キャッシュ未使用時の実行時間、ヒット率、復元・保存時間、サイズ、無効化の正しさ、信頼境界とキャッシュ汚染のリスクを測定してから判断する。わずかな時間短縮のために、原因が分かりにくい古い状態を持ち込まない。

**秘密情報、認証情報、本番設定、特権のある変更可能な状態をキャッシュしない。** 特権付きの公開・配備ジョブではキャッシュを使用しないことを既定とし、利用する場合は脅威モデルを明示的にレビューする。

## 依存関係のインストール

npmアプリのCIでは`npm ci`を使用する。`package-lock.json`をコミットし、変更をレビューする。

Foundation CIでは採用先アプリを模したテスト用プロジェクトも実際に実行する。依存関係のインストールを単なる文字列や何もしない処理に置き換えても、検証を満たしたことにはならない。

## 必須の品質ゲート

既定では`check`、`typecheck`、`test`を実行し、`build`は常に実行する。前の3つを省略できるのは、Workflowの入力で理由を空文字にせず明示した場合だけとする。

これにより、必要なnpmスクリプトの削除・改名が、検証範囲の黙示的な縮小ではなくエラーとして検出される。

## E2Eテスト

ブラウザのセットアップや実行環境の起動に時間がかかるため、E2E（End-to-End）テストは任意とする。

`run_e2e`を有効にした場合、`test:e2e`は必要なブラウザ・サーバーの起動から終了処理までを含む、1回で終了するコマンドでなければならない。

Playwrightの複雑な準備、画面検証用の基盤、環境別の認証情報、プロバイダー固有サービスなどが必要な場合は、アプリ側で所有するE2Eジョブを利用する。

ブラウザやフレームワークのキャッシュを追加する場合も、測定結果に加え、バージョン・プラットフォームに対応したキーと信頼境界の明示的なレビューを必要とする。
