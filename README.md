# Snap-Redact

スクショを貼る前の5秒前処理。画像を外に送らず、ブラウザ内で黒塗り・モザイクして、そのままクリップボードへ戻す CircleNote シリーズ第3弾です。

- 公開予定 URL：`https://circle-note.com/snap-redact/`
- 状態：開発中（初回公開 `v0.1.0` に向けて実装中）

## 特長（予定）

- **送信しないことを確かめられる**：CSP（`connect-src 'none'`）で外部通信をブラウザの仕組みとして禁止し、その確かめ方を公開します
- **コピーで完結する**：`Ctrl+V` で貼る → ドラッグで隠す → `Ctrl+C` でコピー

## 開発

Node.js 24 LTS（`.nvmrc`）を使います。

```bash
npm ci
npm run dev       # 開発サーバー
npm run verify    # 型チェック・lint・整形・テスト・ビルドを一括実行（CI と同じ）
```

ビルド成果物は `dist/snap-redact/` に出力されます。

## 資料

- [要件定義](docs/requirements.md)
- 基本設計：[画面](docs/01-screen-design.md)・[機能](docs/02-functional-design.md)・[アーキテクチャ](docs/03-architecture.md)・[セキュリティ](docs/04-security-design.md)・[開発環境・CI/CD](docs/05-devenv-cicd.md)・[テスト](docs/06-test-design.md)
- [実装計画](docs/07-implementation-plan.md)

## 既存2作（Mask & Unmask、Context-Packer）との違い

| 項目                    | 既存2作    | Snap-Redact         | 理由                                                                 |
| :---------------------- | :--------- | :------------------ | :------------------------------------------------------------------- |
| React / Vite / Tailwind | 18 / 5 / 3 | 19 / 8 / 4          | 実装開始時点（2026-11）の安定版を使う                                |
| Node.js（CI）           | 20         | 24 LTS              | Node 20 はサポート終了済み                                           |
| TypeScript              | 5          | 6.0                 | 7.0 は typescript-eslint が未対応のため 6.0                          |
| 成果物の出力先          | `dist/`    | `dist/snap-redact/` | Pages のプレビュー URL でも本番と同じパスで確かめるため（05 の 6.1） |

## ライセンス

[MIT](LICENSE)
