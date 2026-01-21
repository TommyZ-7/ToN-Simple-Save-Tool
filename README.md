![ToN Simple Save Tool](unnamed.jpg)

# ToN Simple Save Tool

VRChat の **Terrors of Nowhere (ToN)** 用セーブコード自動保存ツール。

## 機能

- VRChat ログからセーブコードを自動検出・保存
- ToN ワールドに入った際にコードを自動でクリップボードにコピー
- 生存/死亡の統計をラウンドタイプ別に記録
- コード履歴の管理（最大10件）
- システムトレイ常駐
- Windows 自動起動対応
- 自動アップデート機能

## インストール

[Releases](https://github.com/TommyZ-7/ToN-Simple-Save-Tool/releases) から最新版をダウンロードしてください。

## 開発

```bash
# 依存関係インストール
bun install

# 開発サーバー起動
bun run tauri dev

# ビルド
bun run tauri build
```

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Tailwind CSS
- **バックエンド**: Tauri 2 (Rust)
- **ビルドツール**: Vite
