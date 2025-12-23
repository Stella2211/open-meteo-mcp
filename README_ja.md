# @stella2211/open-meteo-mcp

プライバシーを考慮したOpen-Meteo MCPサーバーです。

[English](README.md) | 日本語

## 概要

大手AIプロバイダーが提供しているAIのほとんどは、ユーザーとの会話内容を学習に使用しています。ここに自宅の緯度経度を入力することは、プライバシー上の懸念があります。

しかし、利便性の観点から、「自宅の天気予報を教えて」のようにAIに指示したいです。

このMCPサーバーでは、AIが直接緯度経度に触れる機会を極限まで低減させ、プライバシー上のリスクを低減することを目的としています。

## 特徴

- Open-Meteo APIを使用した7日間の天気予報取得
- 都市名での場所検索（ジオコーディング内蔵）
- 座標情報はローカルに保存（AIには非公開）
- AIには場所の名前のみ表示、座標は非表示
- クロスプラットフォーム対応（Windows、macOS、Linux）

## インストール

npxまたはbunxを使用してGitHubから直接実行できます：

```bash
# npxを使用
npx github:Stella2211/open-meteo-mcp

# bunxを使用
bunx github:Stella2211/open-meteo-mcp
```

## Claude Desktop設定

Claude Desktopの設定ファイルに追加してください：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "open-meteo": {
      "command": "npx",
      "args": ["-y", "github:Stella2211/open-meteo-mcp"]
    }
  }
}
```

> **補足**: `-y`フラグはインストール確認プロンプトを自動的に承諾します。

## ツール一覧

### add_location_by_search（推奨）
都市名や地名で検索して場所を追加します。座標は内部で解決され、AIには公開されません。

```
例：「自宅」を「東京」で検索して追加
```

### add_location
緯度経度を直接指定して場所を追加します。特定の座標がある場合にのみ使用してください。

### delete_location
保存した場所を名前で削除します。

### list_locations
保存した場所の名前一覧を取得します（座標はプライバシーのため非表示）。

### get_forecast
保存した場所の7日間の天気予報を取得します。

## プライバシー設計

このMCPサーバーは、AIが位置座標に触れる機会を最小限に抑えるよう設計されています：

1. **場所の追加**: `add_location_by_search`を使用して都市名で検索。サーバーはOpen-Meteo Geocoding APIを介して内部的に座標を解決し、ローカルに保存します。
2. **場所の一覧**: 場所の名前のみが返され、座標は返されません。
3. **予報の取得**: サーバーは内部的にローカルストレージから座標を取得します。

`add_location`で緯度経度を明示的に指定した場合のみ、AIは座標を認識します。

## データ保存場所

場所データは以下に保存されます：
- **macOS/Linux**: `~/.config/stella2211-open-meteo-mcp/locations.json`
- **Windows**: `%USERPROFILE%\.config\stella2211-open-meteo-mcp\locations.json`

## 開発

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# ローカルで実行
npm start
```

## ライセンス

MIT
