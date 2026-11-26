# 機能設計書：Snap-Redact（MVP）v1.6

最終更新：2026-11-26 ／ 対象要件：`docs/requirements.md` v1.2（確定版） ／ 関連：`docs/01-screen-design.md` v1.1

* v1.0（2026-11-22）：初版
* v1.6（2026-11-26）：S10 の実装に合わせ、Undo の描き直しに失敗したときの扱いを変更（3.8・3.9）
* v1.5（2026-11-26）：S9 の実装に合わせ、操作は「描けたら記録する」順に変更（3.6）。ダイアログ表示中の `Esc` はダイアログ自身が閉じることを明記（4章）
* v1.4（2026-11-26）：S8 の実装で見つけた `toRect` の判定の抜けを修正（画像の完全に外側で幅・高さが負になる場合。3.5.2）
* v1.3（2026-11-26）：S7 でサイズ上限を確定（8章 #2）
* v1.2（2026-11-25）：S5 の実装に合わせ、`EditorState` を型引数 `TImage` で元画像を受け取る形に変更
* v1.1（2026-11-22）：外部レビュー1回目を反映（透過画像へのモザイク、極小矩形の判定、読み込みの世代番号、描画できるかの事前確認、ドラッグ中の操作の無視、選択枠の描き方、Canvas の枠線、縮小時の補間品質、ドロップ表示の回数方式、`getAsFile()` / `getSelection()` の null）

基本設計の資料 2/6。画面の裏で「どんな状態を持ち、何をきっかけに、どう処理するか」を定める。ファイル構成とモジュールの責務は「03 アーキテクチャ設計書」、CSP などは「04 セキュリティ設計書」で扱う。

---

## 1. 機能一覧

| ID | 機能 | きっかけ | 関連要件 | 画面設計 |
| :--- | :--- | :--- | :--- | :--- |
| F-01 | 貼り付けで読み込む | `paste` イベント | IN-1 | 6 |
| F-02 | ドロップで読み込む | `drop` イベント | IN-2 | 3.3 |
| F-03 | ファイル選択で読み込む | ファイル選択の `change` | IN-2 | 3.3 |
| F-04 | 読み込みの共通処理（形式・デコード・サイズ・差し替え確認） | F-01〜03 から呼ぶ | IN-3〜IN-5, IN-7 | 4.1, 5.1 |
| F-05 | 矩形を指定する | Pointer Events | ED-1, ED-5, ED-6 | 3.3 |
| F-06 | 黒塗り・モザイクを適用する | F-05 の確定 | ED-2, ED-3 | — |
| F-07 | モードを切り替える | ボタン、`B` / `M` | ED-2〜ED-4 | 3.2 |
| F-08 | 元に戻す | ボタン、`Ctrl+Z` | ED-7, ED-9 | 3.2 |
| F-09 | クリア | ボタン | ED-8 | 3.2 |
| F-10 | 画像をコピー | ボタン、`Ctrl+C` | OUT-1, OUT-2, OUT-5 | 3.4 |
| F-11 | ダウンロード | ボタン | OUT-3, OUT-4 | 3.4 |
| F-12 | 通知（トースト） | 各機能から呼ぶ | IN-4, IN-7, OUT-5 | 5.1 |
| F-13 | ダイアログ（DL-01 / DL-02） | F-04、バッジ | IN-5, UI-2 | 4 |

---

## 2. 状態設計

### 2.1 編集状態（reducer で管理する）

```ts
type Mode = 'fill' | 'mosaic';

/** 画像の原寸座標。x, y, w, h はすべて整数、w, h は 1 以上 */
type Rect = { x: number; y: number; w: number; h: number };

type Op =
  | { kind: 'fill'; rect: Rect }
  | { kind: 'mosaic'; rect: Rect; blockSize: number };

// lib/core は DOM の型を使えない（03 の 4章）ため、元画像の型は型引数で受け取る。アプリでは EditorState<ImageBitmap>
type EditorState<TImage> =
  | { status: 'empty'; mode: Mode }
  | {
      status: 'loaded';
      mode: Mode;
      base: TImage;        // 元画像（読み込み時のまま変更しない）
      width: number;       // base の幅（原寸）
      height: number;      // base の高さ（原寸）
      ops: Op[];           // 操作の履歴（古い順）
      unsaved: boolean;    // 最後のコピー／ダウンロード以降に操作があるか
    };
```

* 初期状態：`{ status: 'empty', mode: 'fill' }`
* reducer は純粋関数にする。`ImageBitmap` の `close()` や描画などの副作用は reducer の外（3章の各処理）で行う

### 2.2 アクションと状態遷移

| アクション | 発行する処理 | empty のとき | loaded のとき |
| :--- | :--- | :--- | :--- |
| `LOAD { base, width, height }` | F-04 | loaded（ops = []、unsaved = false） | 新しい画像の loaded（ops = []、unsaved = false）。mode は引き継ぐ |
| `ADD_OP { op }` | F-06 | 無視 | ops の末尾に追加、unsaved = true |
| `UNDO` | F-08 | 無視 | ops が 1 件以上なら末尾を削除し unsaved = true。0 件なら変化なし |
| `CLEAR` | F-09 | 無視 | empty（mode は引き継ぐ） |
| `EXPORTED` | F-10, F-11 の成功時 | 無視 | unsaved = false |
| `SET_MODE { mode }` | F-07 | mode を変更 | mode を変更 |

* 状態が変わらないアクション（empty での `ADD_OP` など、同じ mode の `SET_MODE`、保存済みでの `EXPORTED`）は、同じオブジェクトを返す（React の再描画を避ける。S5 で実装）
* reducer は「新しい状態」だけを返す。前の `base` を `close()` するのは、状態が変わったあとの処理（3.4 手順6、3.10）で行う

### 2.3 画面だけの状態（reducer の外）

| 状態 | 型 | 持つ場所 | 用途 |
| :--- | :--- | :--- | :--- |
| ドラッグ中の矩形 | `{ start: Point; current: Point } \| null` | `useRectDrag` | 選択枠の表示（F-05）。`isDragging` として他の処理からも参照する |
| ファイルを重ねている深さ | `number`（`dragenter` で +1、`dragleave` で −1） | `useDropImage` | 1 以上のときドロップ中の強調表示（3.2） |
| 読み込みの世代番号 | `number`（`useRef`） | `useImageLoader` | 非同期の読み込みが追い越されたかの判定（3.4） |
| トースト | `{ id: string; kind; text } \| null` | `useToast` | F-12 |
| 開いているダイアログ | `'replace' \| 'verify' \| null` | `App` | F-13 |
| 差し替え待ちの画像 | `{ base, width, height, canvas } \| null` | `App` | DL-01 の結果待ちの間だけ保持。`canvas` は 3.4 手順4 で描画まで済ませたもの |
| スマホ案内を閉じたか | `boolean` | `App` | NT-02（保存しない） |

### 2.4 状態から決まる表示（派生値）

| 派生値 | 計算 | 使う場所 |
| :--- | :--- | :--- |
| `canUndo` | `status === 'loaded' && ops.length > 0` | 元に戻すボタン、`Ctrl+Z` |
| `canExport` | `status === 'loaded'` | コピー・ダウンロードボタン、`Ctrl+C`、クリアボタン |
| `needsReplaceConfirm` | `status === 'loaded' && unsaved && ops.length > 0` | F-04 |
| `isModalOpen` | `dialog !== null` | キー操作・貼り付け・ドロップの無効化（3.1, 3.2, 4章） |
| `acceptsInput` | `!isModalOpen && !isDragging` | 貼り付け・ドロップ・ファイル選択を受け付けるか（3.1〜3.3 の共通ガード） |

---

## 3. 処理設計

### 3.1 F-01 貼り付けで読み込む

```text
document の paste イベント
  ├─ acceptsInput が false（ダイアログ表示中・ドラッグ中） → 何もしない（既定動作も止めない）
  ├─ clipboardData.items を先頭から最後まで走査し、kind === 'file' かつ type が image/* の最初の1件を探す
  │    （text/html や text/plain が先にあっても飛ばす）
  ├─ 見つかった → preventDefault() → getAsFile()
  │    ├─ File が得られた → F-04 へ
  │    └─ null（仕様上ありうる） → TS-01「画像が見つかりませんでした」
  └─ 見つからない → TS-01
```

* `navigator.clipboard.read()` は使わない（権限の確認が出るため）
* 画像型が `image/*` だが対応外（例：`image/bmp`）の場合も F-04 に渡し、形式チェックで TS-02 にする

### 3.2 F-02 ドロップで読み込む

```text
window の dragover
  ├─ 常に preventDefault()（ブラウザが画像を開いてページを離れるのを防ぐ）
  └─ dropEffect = acceptsInput ? 'copy' : 'none'
window の dragenter
  ├─ 常に preventDefault()
  └─ dataTransfer.types に 'Files' があれば 深さ +1
window の dragleave
  └─ dataTransfer.types に 'Files' があれば 深さ −1（0 未満にはしない）
window の drop
  ├─ 常に preventDefault()
  ├─ 深さを 0 に戻す
  ├─ acceptsInput が false（ダイアログ表示中・ドラッグ中） → 何もしない
  ├─ dataTransfer.files から type が image/* の最初の1件を探す
  ├─ 見つかった → F-04 へ
  └─ 見つからない → TS-01
window の dragend / blur、document の visibilitychange（hidden）
  └─ 深さを 0 に戻す（dragleave の取りこぼしで強調表示が残るのを防ぐ）
```

* 強調表示は「深さが 1 以上 かつ acceptsInput が true」のときだけ出す。ダイアログ表示中は出さない
* 子要素の間を移動すると `dragenter` と `dragleave` が対で発火するので、深さを数える方式にする（`relatedTarget` による判定はブラウザ差があるため使わない）
* キャンバスの外に落とした場合も読み込む（画面設計 3.3）
* 複数ファイルを落とした場合は最初の画像1件だけを使い、通知は出さない

### 3.3 F-03 ファイル選択で読み込む

* `<input type="file" accept="image/png,image/jpeg,image/webp,image/gif">` を使う（見た目はボタン）
* 選択されたら F-04 へ渡し、`input.value = ''` に戻す（同じファイルを続けて選べるように）
* ボタンはダイアログ表示中には押せない（ダイアログが前面を覆うため）。念のため `acceptsInput` も確認する

### 3.4 F-04 読み込みの共通処理

```text
入力：File（または Blob）
0. 世代番号を +1 し、この読み込みの番号として控える（gen）
1. 形式チェック
   type が image/png・image/jpeg・image/webp・image/gif 以外 → TS-02、終了
2. デコード
   createImageBitmap(file) → 失敗 → （gen が最新のときだけ）TS-03、終了
   ★ 完了後に gen が最新でなければ → bitmap.close()、通知なしで終了（後から来た読み込みに追い越された）
3. サイズチェック（lib/limits.ts）
   長辺 > MAX_EDGE または 幅×高さ > MAX_PIXELS → bitmap.close()、TS-04、終了
4. 描画できるかの確認（IN-7）
   新しい Canvas を作り、原寸に設定 → getContext('2d') → drawImage(bitmap, 0, 0)
   getContext が null、または例外 → bitmap.close()、Canvas を 0×0 に戻す、TS-05、終了
   （ここまで既存の状態には一切触れないので、失敗しても編集中の画像はそのまま残る）
5. 差し替え確認
   needsReplaceConfirm が true → bitmap と手順4の Canvas を差し替え待ちに保存し DL-01 を開く（3.4.1 へ）、ここで一旦終了
   （差し替え待ちがすでにある場合は、古い方を close() してから置き換える）
6. 読み込み
   LOAD を発行 → 手順4の Canvas を表示用 Canvas として差し込む（描き直しは不要） → 前の base を close()、前の Canvas を 0×0 に戻す
   ドラッグの状態をリセットする
   GIF のときは TS-09「GIF は最初のコマだけを読み込みました」
```

* 手順4で描いた Canvas をそのまま表示に使うので、確認のために二重に描くことはない。`CanvasStage` は、用意された Canvas 要素を自分のコンテナに差し込む作りにする（03 アーキテクチャ設計書で詳細化）
* 世代番号は、デコードのように時間がかかる処理の後で必ず確認する。DL-01 表示中は `acceptsInput` が false なので、新しい読み込みは始まらない

* `fetch(URL.createObjectURL(file))` は使わない（`connect-src 'none'` で止められるため）。必ず `createImageBitmap(file)` で直接デコードする
* EXIF の向き（Orientation）はブラウザの既定（`imageOrientation: 'from-image'`）に任せる。メタデータそのものは読まない
* 上限の初期値：`MAX_EDGE = 16384`、`MAX_PIXELS = 100_000_000`。実機確認の結果で `lib/limits.ts` の定数を変更する

#### 3.4.1 DL-01 の結果

| 操作 | 処理 |
| :--- | :--- |
| 差し替える | 3.4 手順6 を差し替え待ちの画像で行う。差し替え待ちを空にする |
| キャンセル／`Esc`／背景クリック | 差し替え待ちの `bitmap.close()`、Canvas を 0×0 に戻す。差し替え待ちを空にする。編集中の画像はそのまま |

### 3.5 F-05 矩形を指定する

```text
キャンバスの pointerdown（主ボタンのみ、loaded のときのみ）
  ├─ setPointerCapture(pointerId)
  └─ 開始点 = 画面座標 → 原寸座標（3.5.1）
pointermove（ドラッグ中）
  └─ 現在点を更新し、選択枠を表示（表示に使う矩形は 3.5.2 で整数化したもの）
pointerup
  ├─ releasePointerCapture
  ├─ 矩形を確定（3.5.2）
  ├─ 幅・高さとも 3px 未満、または幅か高さが 0 → 破棄（何も起きない）
  └─ それ以外 → F-06 へ
pointercancel／Esc キー／LOAD／CLEAR
  └─ ドラッグを破棄
```

* **選択枠は Canvas に描かない**。Canvas の上に重ねた要素（`position: absolute; pointer-events: none`）で表示する。Canvas の画素には一切影響しないので、コピー・ダウンロードに選択枠が混ざることはない
* ドラッグ中は、貼り付け・ドロップ・ファイル選択・`Ctrl+Z`・`Ctrl+C`・`B`/`M` を受け付けない（3.1, 3.2, 4章）

#### 3.5.1 画面座標 → 原寸座標

```ts
function toImagePoint(clientX: number, clientY: number, canvasRect: DOMRect, width: number, height: number): Point {
  const sx = width / canvasRect.width;   // 表示の縮小率の逆数
  const sy = height / canvasRect.height;
  return {
    x: (clientX - canvasRect.left) * sx, // 小数のまま返す（整数化は矩形にするときに行う）
    y: (clientY - canvasRect.top) * sy,
  };
}
```

* `canvasRect` は `canvas.getBoundingClientRect()`。CSS で縮小表示していても、原寸の座標に戻せる
* `getBoundingClientRect()` は枠線と余白を含んだ大きさを返すため、**`<canvas>` 要素自体には `border` と `padding` を付けない**。枠線や余白が必要なときは、外側の要素に付ける（画面設計 3.3）
* キャンバスの外に出た点もそのまま返し、3.5.2 で画像の範囲内に切り詰める

#### 3.5.2 矩形の正規化と整数化（ED-5）

```ts
function toRect(a: Point, b: Point, width: number, height: number): Rect | null {
  const left   = Math.max(0, Math.floor(Math.min(a.x, b.x)));      // 始点は切り捨て
  const top    = Math.max(0, Math.floor(Math.min(a.y, b.y)));
  const right  = Math.min(width,  Math.ceil(Math.max(a.x, b.x)));  // 終点は切り上げ
  const bottom = Math.min(height, Math.ceil(Math.max(a.y, b.y)));
  const w = right - left;
  const h = bottom - top;
  if (w <= 0 || h <= 0) return null;                               // 面積のない矩形（画像の完全に外側では負になる）
  if (w < 3 && h < 3) return null;                                 // ED-6：幅・高さとも 3px 未満
  return { x: left, y: top, w, h };
}
```

* 幅 80px × 高さ 2px のような細い矩形は有効にする（罫線や1行の細い文字を隠せるように）

* 画像の完全に外側でドラッグすると、切り詰めた結果の幅・高さが負になる（例：右の外で横にドラッグ）。`=== 0` ではなく `<= 0` で判定する
* 逆方向（右下 → 左上）のドラッグも `min` / `max` で正しく扱う
* 「切り捨て・切り上げ」により、ユーザーが覆った範囲より狭くならない

### 3.6 F-06 黒塗り・モザイクを適用する

```text
1. op を作る
   fill   → { kind: 'fill', rect }
   mosaic → { kind: 'mosaic', rect, blockSize: mosaicBlockSize(width, height) }
2. 追加した op だけをキャンバスに描く（applyOp、3.8）。全体の描き直しはしない
3. 描けたら ADD_OP を発行。描けなかったら（作業用 Canvas の getContext が null など）TS-05 を出し、記録しない
```

* 描いてから記録する：描けなかった操作が履歴に残ると、画面では隠れていないのに「隠した」ことになり、Undo の描き直しで初めて反映されるなど、見た目と履歴がずれるため（S9 で変更）
* モザイクは、作業用 Canvas が使えないと分かった時点で、描画先に触れずに失敗を返す（元の画素を消したまま戻せない状態にしない）

#### 3.6.1 黒塗り

```ts
ctx.fillStyle = '#000000';
ctx.fillRect(rect.x, rect.y, rect.w, rect.h); // 座標は整数なので、端に半透明の画素ができない
```

#### 3.6.2 モザイク

```ts
function mosaicBlockSize(width: number, height: number): number {
  return Math.max(16, Math.round(Math.min(width, height) * 0.02));
}

function applyMosaic(ctx: CanvasRenderingContext2D, work: HTMLCanvasElement, rect: Rect, block: number) {
  const sw = Math.max(1, Math.ceil(rect.w / block));
  const sh = Math.max(1, Math.ceil(rect.h / block));
  work.width = sw;
  work.height = sh;
  const wctx = work.getContext('2d')!;
  wctx.clearRect(0, 0, sw, sh);
  wctx.imageSmoothingEnabled = true;                       // 縮小時は平均化させる
  wctx.imageSmoothingQuality = 'high';                     // 大きく縮小しても画素を平均させる（非対応環境では無視される）
  wctx.drawImage(ctx.canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, sw, sh);
  ctx.save();
  ctx.clearRect(rect.x, rect.y, rect.w, rect.h);           // ★ 元の画素を消してから描く（透過画像で下の文字が透けないように）
  ctx.imageSmoothingEnabled = false;                       // 拡大時はぼかさずブロックにする
  ctx.drawImage(work, 0, 0, sw, sh, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}
```

* **`clearRect` が必須**：Canvas の既定の合成方法（`source-over`）では、モザイクのブロックが半透明だと、その下に元の画素が残って透ける。透過 PNG の文字の上にモザイクをかけた場合に、隠したはずの文字が読めてしまうため、描く前に対象範囲を透明にする
* 黒塗りは不透明の `#000000` で塗るので、この問題は起きない
* 描画済みのキャンバスから読むので、黒塗りの上にモザイクを重ねても結果は一貫する
* `blockSize` は op に保存する。描き直しても結果が変わらない
* 作業用 Canvas（`work`）は1枚を使い回す
* 例：1920×1080 → 22px、3840×2160 → 43px、800×600 → 16px

### 3.7 F-07 モードを切り替える

* `SET_MODE` を発行する。画像の状態には影響しない
* モザイクのときは NT-01 を表示する（画面設計 5.2）

### 3.8 描画

| 関数 | 処理 | 呼ぶ場面 |
| :--- | :--- | :--- |
| `prepareCanvas(base)` | 新しい Canvas を原寸で作り、`drawImage(base, 0, 0)` まで行って返す。失敗したら `null` | 読み込み時（3.4 手順4） |
| `renderAll(ctx, base, ops, work)` | `clearRect` → `drawImage(base, 0, 0)` → ops を先頭から `applyOp` | Undo 時 |
| `applyOp(ctx, op, work)` | `fill` → 3.6.1、`mosaic` → 3.6.2 | 操作の追加時、`renderAll` の中 |

* `canvas.width/height` の設定は `prepareCanvas` の中だけで行う（設定するとキャンバスの内容が消えるため）
* 読み込み時に描けない場合は 3.4 手順4 で弾くので、既存の状態は変わらない
* Undo の描き直しでモザイクが描けない操作は、その範囲を黒で塗り、TS-05 を出す（隠すべき範囲を見えたまま残さない）
* 元画像が描けない（例外）場合は TS-05 を出す。`clearRect` の後なので画面は空になり、隠すべき内容は見えない
* どちらの場合も UNDO は確定する（S10 で変更。以前の「状態は変えない」は、描き直しの途中で止まると画面と履歴がずれるため見直した）

### 3.9 F-08 元に戻す

```text
canUndo が false、またはドラッグ中 → 何もしない
renderAll（元画像から、最後の操作を除いて全体を描き直す） → UNDO を発行
```

* ドラッグ中は受け付けない（先にドラッグを終えるか `Esc` で破棄する）
* ボタンと `Ctrl+Z` は同じ処理を呼ぶ
* 開発ビルドだけ、`renderAll` の時間を `console.debug` で出す（本番ビルドでは `import.meta.env.DEV` の分岐ごと消える）

### 3.10 F-09 クリア

```text
ドラッグ中 → 何もしない
CLEAR を発行 → 前の base を close() → キャンバスを 0×0 にしてメモリを解放 → ドラッグの状態をリセット
```

* 確認は出さない（画面設計 11章 #1）

### 3.11 F-10 画像をコピー

```ts
async function copyImage(canvas: HTMLCanvasElement): Promise<'ok' | 'unsupported' | 'failed'> {
  if (!('ClipboardItem' in window) || !navigator.clipboard?.write) return 'unsupported';
  const blobPromise = new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png'),
  );
  try {
    // Safari はユーザー操作の中で同期的に write を呼ぶ必要があるため、Blob ではなく Promise を渡す
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
    return 'ok';
  } catch {
    return 'failed';
  }
}
```

| 結果 | 処理 |
| :--- | :--- |
| `ok` | `EXPORTED` を発行、TS-06「コピーしました。そのまま貼り付けできます」 |
| `unsupported` / `failed` | TS-07「コピーできませんでした。ダウンロードをご利用ください」 |

* ボタンのクリック、または `Ctrl+C` の `keydown` の中で、`await` を挟まずに呼ぶ（ユーザー操作の判定を切らさない）
* `toBlob` が `null` を返す（大きすぎる画像）場合も `failed` として扱う

### 3.12 F-11 ダウンロード

```text
canvas.toBlob(cb, 'image/png')
  ├─ null → TS-05、終了
  └─ Blob → URL.createObjectURL → <a download="redacted_image.png"> を作ってクリック
            → 次のタスクで URL.revokeObjectURL → EXPORTED を発行 → TS-08
```

* Canvas から書き出すので、元画像の EXIF などのメタデータは出力に含まれない（OUT-4）
* 出力は常に PNG。透過はそのまま残る

### 3.13 F-12 通知（トースト）

* `showToast(kind, text)` を各機能から呼ぶ。表示中に新しいものが来たら置き換える
* 表示時間：成功・情報 2.5 秒、エラー 4 秒（画面設計 5.1）

---

## 4. キー操作の処理

`window` の `keydown` で一括して扱う（`useShortcuts`）。

| 判定の順番 | 条件 | 動作 |
| :--- | :--- | :--- |
| 1 | `e.isComposing`（日本語入力の変換中） | 何もしない |
| 2 | ダイアログ表示中 | 何もしない。`Esc` はネイティブの `<dialog>` の `cancel` でダイアログ自身が閉じる（二重に閉じないよう、ここでは扱わない） |
| 3 | `Esc` かつドラッグ中 | ドラッグを破棄 |
| 4 | `Ctrl+Z` / `⌘Z`（Shift なし） | `canUndo` かつドラッグ中でなければ `preventDefault()` → F-08 |
| 5 | `Ctrl+C` / `⌘C` | `canExport`、ドラッグ中でない、かつ選択中のテキストが空（`(window.getSelection()?.toString() ?? '') === ''`）なら `preventDefault()` → F-10。それ以外は何もしない（ブラウザ既定のコピー） |
| 6 | `B` / `M`（修飾キーなし） | ドラッグ中でなければ F-07 |

* `Ctrl` と `⌘` の判定：`e.ctrlKey || e.metaKey`
* キーは `e.key` を小文字にして比べる（`Caps Lock` 対策）
* `Ctrl+V` はキーではなく `paste` イベント（3.1）で扱う
* 日本語入力の変換中は `isComposing` に加え、`keyCode === 229` も変換中として扱う（確定の直後に `isComposing` が false で届くブラウザがあるため）
* `B` / `M` は Shift 付きも扱わない（`Caps Lock` 中は Shift なしで `e.key = 'B'` が届くので、切り替えられる）
* 判定は `lib/core/shortcuts.ts` の純粋関数で行い、処理が登録されている動作だけ `preventDefault()` する（S11 までは `Ctrl+C` を登録しないので、既定のコピーのまま）

---

## 5. エラーと通知の対応

| 起きること | 検出する場所 | 通知 | 状態への影響 |
| :--- | :--- | :--- | :--- |
| 貼り付け・ドロップに画像がない | 3.1, 3.2 | TS-01 | なし |
| 対応外の形式 | 3.4 手順1 | TS-02 | なし |
| デコード失敗 | 3.4 手順2 | TS-03 | なし |
| サイズ上限を超えた | 3.4 手順3 | TS-04 | なし |
| 貼り付けで `getAsFile()` が `null` | 3.1 | TS-01 | なし |
| 読み込み中に次の読み込みが来た | 3.4 手順2 | なし（古い方を黙って捨てる） | なし |
| 読み込む画像の Canvas が作れない・描けない | 3.4 手順4 | TS-05 | なし（編集中の画像はそのまま） |
| 黒塗り・モザイクが描けない | 3.6 | TS-05 | なし（操作を記録しない） |
| Undo の描き直しで例外 | 3.8 | TS-05 | なし |
| ダウンロードの `toBlob` が `null` | 3.12 | TS-05 | なし（編集内容は残す） |
| コピー失敗・非対応 | 3.11 | TS-07 | なし |
| GIF を読み込んだ | 3.4 手順5 | TS-09 | 通常どおり読み込む |

* 想定外の例外は、画面全体のエラー境界（React の Error Boundary）で受け、「問題が発生しました。ページを再読み込みしてください」を表示する。エラーの内容は Console に出すだけで、外部には送らない

---

## 6. 性能とメモリ

| 項目 | 方針 |
| :--- | :--- |
| 読み込み | `createImageBitmap` はブラウザ側で非同期にデコードされ、画面は止まらない |
| 操作の追加 | 追加分だけを描く（`applyOp`）。4K でも 1 件あたり数ミリ秒の見込み |
| Undo | `renderAll` で描き直す。`drawImage` と `fillRect` だけで、画素のループ（`getImageData`）は使わない |
| 計測 | 開発時のみ `performance.now()` で `renderAll` の時間を Console に出す（本番ビルドでは出さない）。4K・操作 20 件で 100ms を超える場合は対策を検討する |
| 保持するもの | 元画像の `ImageBitmap` 1枚、ops 配列、表示用 Canvas 1枚、モザイクの作業用 Canvas 1枚。DL-01 表示中だけ、差し替え待ちの `ImageBitmap` と Canvas が1組増える |
| 解放 | 差し替え・クリア・DL-01 のキャンセル・世代番号で捨てるとき・読み込みの途中で失敗したときに `ImageBitmap.close()` し、使わなくなった Canvas は 0×0 に戻す。Blob URL はダウンロード後すぐ `revokeObjectURL` |
| 保存しないもの | localStorage・sessionStorage・IndexedDB・Cache には何も保存しない |

---

## 7. 要件との対応

| 要件 | 機能 | 本書の該当箇所 |
| :--- | :--- | :--- |
| IN-1 | F-01 | 3.1 |
| IN-2 | F-02, F-03 | 3.2, 3.3 |
| IN-3 | F-04 | 3.4 |
| IN-4 | F-01, F-02, F-04 | 3.1, 3.2, 3.4, 5 |
| IN-5 | F-04, F-13 | 2.4, 3.4, 3.4.1 |
| IN-6 | （画面） | 画面設計 3.3 |
| IN-7 | F-04 | 3.4, 3.8, 5 |
| ED-1, ED-6 | F-05 | 3.5 |
| ED-2, ED-3 | F-06 | 3.6 |
| ED-4 | F-07 | 3.7 |
| ED-5 | F-05 | 3.5.2 |
| ED-7, ED-9 | F-08 | 3.8, 3.9 |
| ED-8 | F-09 | 3.10 |
| OUT-1, OUT-2, OUT-5 | F-10 | 3.11, 4 |
| OUT-3, OUT-4 | F-11 | 3.12 |

---

## 8. 未決事項・実機で確かめること

| # | 内容 | いつ |
| :--- | :--- | :--- |
| 1 | `ClipboardItem` に Promise を渡す書き方が、Chrome・Edge・Firefox・Safari の最新版で動くか | 出力を実装するフェーズ |
| 2 | ~~`MAX_EDGE` / `MAX_PIXELS` の値~~ → S7 で確定：**長辺 16,384px・1億画素のまま**。Chromium 156 と Firefox 161（Windows）で、16384×16384（2.7億画素）まで作成・書き出しとも成功（書き出しはそれぞれ約2秒・約6.6秒）。上限の範囲内（1億画素）なら書き出しは約1.3秒以内。WebKit（Playwright の Windows 版、AppleWebKit/605.1.15）でも同じく 2.7億画素まで成功（書き出し約4.1秒、1億画素で約1.5秒）。本物の Safari（macOS・iOS）は未確認で、公開前セルフチェックで iPad・iPhone またはクラウドの実機サービスで確かめる。上限内でも Canvas を作れない環境（iPhone の Safari など）は TS-05 で断り、編集中の画像は残る | ― |
| 3 | ~~4K・操作 20 件（モザイクを含む）での `renderAll` の時間~~ → S10 で確認：3840×2160・操作 19 件（モザイク 10 件を含む）の描き直しが 41ms（Chromium）。基準の 100ms 以内のため対策は不要 | ― |
| 4 | Slack・Qiita のエディタに貼り付けたとき、透過 PNG が正しく表示されるか | 公開前セルフチェック |
| 5 | 透過 PNG の文字にモザイクをかけたとき、出力で文字が透けないこと（3.6.2 の `clearRect`） | 編集を実装するフェーズ（単体テストでは描画結果を見られないため、手動で確認） |
| 6 | `imageSmoothingQuality = 'high'` の効き方のブラウザ差 | 編集を実装するフェーズ |
