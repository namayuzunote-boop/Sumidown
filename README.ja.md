# Sumidown

**[English](README.md) | [日本語](README.ja.md)**

軽量・シンプルな WYSIWYG Markdown エディタ。無料・MIT ライセンス(Tauri 2 製)。

*Sumidown* = **墨**(sumi)+ Mark**down** — 墨のように、書いたものが見たままの姿で紙(PDF)まで定着します。

コーディングエージェント時代の Markdown ワークフローにある3つの課題を解決するために作られました:

1. **PDF 変換でレイアウトが崩れる** → プレビューと同一のレンダラ(WebView)から印刷するため、構造的にレイアウト崩れが起きません
2. **プレビュー状態で編集できない** → 常に WYSIWYG。テーブルはセル直接編集+行/列のGUI追加・削除、Mermaid 図と数式はクリックでコード編集
3. **図が表示できない** → Mermaid(フローチャート・シーケンス図など)を即時レンダリング

## 機能

- **WYSIWYG 編集**(Typora スタイル)+ ソース表示トグル(⌘/)
- **テーブル GUI 編集**: セル直接編集、ホバーで行・列の追加/削除/整列/ドラッグ移動
- **Mermaid 図**: ```` ```mermaid ```` ブロックを即時描画。クリックでコード編集、ライブプレビュー
- **KaTeX 数式**: インライン `$...$` / ブロック `$$...$$`(クリックで編集)
- **レイアウト忠実な PDF 出力**(⌘E): プレビューと同じエンジンで描画 → システム印刷ダイアログから「PDFとして保存」。`@page` マージン、テーブル・図・コードの泣き別れ防止つき
- **単一ファイル HTML 出力**(CSS インライン)
- **フォルダツリー**: サイドバーで .md ファイルを一覧・切替
- **外部変更の自動リロード**: コーディングエージェントがファイルを書き換えると自動反映(未保存編集がある場合は通知バー)
- **画像ペースト**: クリップボードの画像を `assets/` に保存して相対パスで挿入
- **ダーク/ライトテーマ**(OS 追従)

## 対応OS

| OS | 状態 |
| --- | --- |
| **macOS**(Apple Silicon) | ✅ 動作確認済み(.dmg を配布) |
| macOS(Intel) | 未ビルド(ソースからのビルドは可能なはず・未検証) |
| Windows / Linux | ❌ 未対応(Tauri 自体はクロスプラットフォームですが、現状パス処理が Unix 前提のため、ビルドだけでは動作しません。対応予定) |

## セキュリティ

- ファイルアクセスは「ユーザーが開いたフォルダ」配下に制限(Rust 側でパス検証)
- 厳格な CSP(リモートスクリプト不可)
- Mermaid は `securityLevel: "strict"` で描画

## 開発

必要なもの: Node.js 20+、Rust(stable)、macOS は Xcode Command Line Tools

```bash
npm install
npm run tauri dev    # デスクトップアプリとして起動
npm run dev          # ブラウザでUIのみ確認(デモドキュメント)
npm run tauri build  # 配布用ビルド(.app / .dmg)
```

## ショートカット

| キー | 動作 |
| --- | --- |
| ⌘O | フォルダを開く |
| ⌘S | 保存 |
| ⌘/ | ソース表示 ⇔ プレビュー |
| ⌘E | PDF 出力 |

## 技術スタック

- [Tauri 2](https://tauri.app/)(Rust + OS WebView、バイナリ約10MB)
- [Milkdown](https://milkdown.dev/)(ProseMirror ベースの WYSIWYG Markdown フレームワーク)
- [Mermaid](https://mermaid.js.org/) / [KaTeX](https://katex.org/) / [CodeMirror 6](https://codemirror.net/)

## ライセンス

[MIT](LICENSE)
