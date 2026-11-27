# Snap-Redact

スクリーンショットを Slack や Issue、生成 AI に貼る前に、写り込んだ秘密の情報をブラウザの中で黒塗り・モザイクするツールです。画像を外に送らず、`Ctrl+V` で貼って、ドラッグで隠して、`Ctrl+C` でコピーするだけで終わります。CircleNote シリーズの第3弾です。

- URL：`https://circle-note.com/snap-redact/`
- 公開状態：公開前（初回公開 `v0.1.0` に向けて、公開前の確認中）

## 主な機能

- **送信しないことを、自分で確かめられる**：ブラウザの仕組み（CSP の `connect-src 'none'`）で外部への通信を禁止しています。画面右上のバッジから、DevTools で確かめる手順を開けます
- **貼る → 隠す → コピーで完結**：`Ctrl+V`（Mac は `⌘V`）で貼り付け、ドラッグで範囲を選び、`Ctrl+C`（`⌘C`）でそのまま貼り付けられる画像をコピーします
- **黒塗りとモザイク**：文字には黒塗りを推奨します（モザイクは復元されうるため）。透過 PNG でも、モザイクの下の文字は透けません
- **元に戻す**：`Ctrl+Z`（`⌘Z`）で1件ずつ戻せます
- **メタデータを残さない**：出力は Canvas から書き出した PNG なので、元画像の撮影情報や位置情報（EXIF）は含まれません

## 動作環境

| 環境                                      | 状態                                                                      |
| :---------------------------------------- | :------------------------------------------------------------------------ |
| Chrome・Edge・Firefox の最新版（Windows） | 対応                                                                      |
| Safari の最新版（macOS）                  | 対応予定。CI の WebKit で動作を確かめており、実機の確認は公開前に行います |
| スマホ（iOS Safari・Android Chrome）      | 画像の選択とダウンロードのみ。PC での利用を推奨します                     |

インストールは不要です。対応ブラウザで URL を開くだけで使えます。

## 使い方

1. スクリーンショットを撮り、ページで `Ctrl+V` を押します（ファイルのドロップや「画像を選択」でも読み込めます）
2. 隠したい部分をドラッグします。`B` で黒塗り、`M` でモザイクに切り替えます
3. `Ctrl+C` または「画像をコピー」でコピーし、貼り付け先にそのまま貼ります。ファイルが必要なときは「ダウンロード」で `redacted_image.png` を保存します

## 外部に送信しないことの確かめ方

1. `F12` で DevTools を開き、Network タブを表示します
2. 画像を貼り付けて黒塗りし、コピーします
3. ページ本体（HTML・JS・CSS）の読み込み以外に通信がないことを確認します
4. Console で `fetch('https://example.com')` を実行すると、CSP によってブロックされます
5. Network タブでページ本体を選び、Response Headers の `Content-Security-Policy` に `connect-src 'none'` があることを確認します

同じ手順は、画面右上のバッジ（外部通信ブロック中）からも開けます。CSP の設定は [`deploy/_headers`](deploy/_headers) にあり、仕組みの詳細は [セキュリティ設計書](docs/04-security-design.md) にまとめています。

## データの取扱いと制限事項

- 画像は開いているタブのメモリの中だけで処理し、どこにも送信・保存しません（localStorage などにも残しません）。タブを閉じると消えます
- ブラウザの拡張機能はページの内容を読めるため、この仕組みでは防げません。信頼できない拡張機能は無効にしてお使いください
- 隠し漏れがないかの最終確認は、利用者が行ってください
- 扱える画像は PNG・JPEG・WebP・GIF（最初のコマのみ）で、長辺 16,384px・1億画素までです

## サポート・不具合報告

- 不具合や改善の提案は [GitHub Issues](https://github.com/digi-garden/snap-redact/issues) へお願いします。秘密の情報が写った画像は投稿しないでください
- セキュリティ上の問題は、公開の Issue ではなく [SECURITY.md](SECURITY.md) の手順で非公開で報告してください

## ライセンス・権利表記

- ソースコードは [MIT ライセンス](LICENSE) で公開しています
- 配信物に含まれる第三者のソフトウェアのライセンスは、ツールのフッターの「OSSライセンス」（`/snap-redact/third-party-licenses/`）で表示しています
- サービスの利用条件は [利用規約](https://digi-garden.com/terms/)、データの取扱いは [プライバシーポリシー](https://digi-garden.com/privacy/) をご覧ください

## 提供元

[digi-garden](https://digi-garden.com/)（デジガーデン）

---

## 開発者向け

Node.js 24 LTS（`.nvmrc`）を使います。

```bash
npm ci
npm run dev       # 開発サーバー（CSP のヘッダーは付きません）
npm run verify    # 型チェック・lint・整形・単体テスト・ビルド・成果物の検査を一括実行（CI と同じ）
npm run preview   # ビルド結果を本番と同じ CSP 付きで確認（http://localhost:4173/snap-redact/）
npm run test:e2e  # ブラウザでの動作確認（事前に build が必要。CI では WebKit と Chromium）
```

- ビルド成果物は `dist/snap-redact/` に出力されます
- 外部への通信につながる API（`fetch`・`location` など）は ESLint で禁止し、ビルド成果物に許可していない URL がないことを `scripts/check-dist.mjs` で検査しています

### 資料

- [要件定義](docs/requirements.md)
- 基本設計：[画面](docs/01-screen-design.md)・[機能](docs/02-functional-design.md)・[アーキテクチャ](docs/03-architecture.md)・[セキュリティ](docs/04-security-design.md)・[開発環境・CI/CD](docs/05-devenv-cicd.md)・[テスト](docs/06-test-design.md)
- [実装計画](docs/07-implementation-plan.md)

### 既存2作（Mask & Unmask、Context-Packer）との違い

| 項目                    | 既存2作     | Snap-Redact         | 理由                                                                 |
| :---------------------- | :---------- | :------------------ | :------------------------------------------------------------------- |
| React / Vite / Tailwind | 18 / 5 / 3  | 19 / 8 / 4          | 実装開始時点（2026-11）の安定版を使う                                |
| Node.js（CI）           | 20          | 24 LTS              | Node 20 はサポート終了済み                                           |
| TypeScript              | 5           | 6.0                 | 7.0 は typescript-eslint が未対応のため 6.0                          |
| 成果物の出力先          | `dist/`     | `dist/snap-redact/` | Pages のプレビュー URL でも本番と同じパスで確かめるため（05 の 6.1） |
| OSS ライセンスの一覧    | `README.md` | `index.html`        | ブラウザでそのまま読めるようにするため                               |
