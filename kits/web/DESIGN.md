---
version: alpha
name: __APP_NAME__
description: __APP_NAME__ の視覚デザインシステム。製品設計時に具体化する初期テンプレート。
omitted:
  - section: colors
    reason: 製品の意味を持つ配色が決まるまでは値を作らない。
  - section: typography
    reason: 画面に必要な文字階層と書体が決まるまでは値を作らない。
  - section: spacing
    reason: 実際のレイアウトから余白体系を定める。
  - section: rounded
    reason: コンポーネントの役割と視覚方針が決まってから定める。
  - section: components
    reason: 実際に繰り返す部品と状態が決まってから定める。
---

# Design System — __APP_NAME__

## Overview

このファイルは [Google DESIGN.md alpha仕様](https://github.com/google-labs-code/design.md/blob/9bf8eae67128b6cc55ad9bf86665767deb4c11cd/docs/spec.md) に沿った**製品固有の視覚デザイン**の正本です。生成直後はテンプレートであり、デザインの完成・承認を意味しません。

UI実装前に、主な利用者・作業・最初に見せる情報に基づく、見た目と密度の方向性を簡潔に記してください。別アプリのデザインを理由なくコピーしません。

front matterには、**実際に採用する値だけ**を公式キー（`colors`、`typography`、`spacing`、`rounded`、`components`）で定義します。値を追加したら該当項目を `omitted` から除外してください。トークンは正確な値、本文章は採用理由と使い方を担います。

本書に機能・データ・例外処理の契約は書きません（`PRODUCT.md` が正本）。共通のUI設計原則、不要な文言・装飾の抑制、アクセシビリティ、実画面検証手順は [FoundationのUIガイド](https://github.com/ShimaBell0619/web-app-foundation/blob/main/docs/ui.md) に従います。

## Colors

製品で採用する背景・文字・主操作・補助・警告・focus等の**意味**を記載します。選定後にfront matterへ具体的な色トークンを追加してください。

## Typography

見出し、本文、補助情報、入力など製品で実際に必要な文字階層と書体を記載します。選定後にfront matterへタイポグラフィトークンを追加してください。

## Layout

利用者の主な作業に対する情報順序、最大幅、狭い画面での優先順位、余白の意図を製品固有の内容で記載します。

## Elevation & Depth

一覧、dialog、popoverなどに必要な面の階層と、影や境界線を使う理由を記載します。

## Shapes

角丸と形状が表す役割・一貫性を記載し、採用した値をfront matterで定義します。

## Components

繰り返す視覚表現と状態の見せ方を記載します。必要なら公式 `components` トークンで色や角丸への参照を追加します。操作・保存などの機能契約は `PRODUCT.md` を参照します。

## Do's and Don'ts

この**製品の**デザインで守る判断と避ける表現を、具体的な理由とともに記載します。汎用的なレビュー規則やテスト手順は重複させません。
