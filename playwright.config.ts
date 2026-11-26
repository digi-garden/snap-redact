// ブラウザでの動作確認（E2E）。設計：docs/05-devenv-cicd.md 5.3、docs/06-test-design.md 4.2
// - 本番と同じビルドを vite preview（deploy/_headers の CSP 付き）で配信して確かめる
// - CI では WebKit（Safari 系）と Chromium で動かす。手元で Chrome を使うときは CHROME_PATH を指定する
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/snap-redact/`,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        ...(process.env.CHROME_PATH
          ? { launchOptions: { executablePath: process.env.CHROME_PATH } }
          : {}),
      },
    },
  ],
  webServer: {
    // ビルドは事前に行う（npm run build）。ここでは配信だけ
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/snap-redact/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
