// deploy/ の中身を dist/ 直下へコピーする（docs/05-devenv-cicd.md 3章）
// _headers と _redirects は Pages プロジェクトのルートに置く必要があるため、
// public/ ではなく deploy/ に置き、vite build の後でコピーする。
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const from = join(root, 'deploy');
const to = join(root, 'dist');

if (!existsSync(join(to, 'snap-redact', 'index.html'))) {
  console.error('dist/snap-redact/index.html がありません。先に vite build を実行してください。');
  process.exit(1);
}

mkdirSync(to, { recursive: true });
for (const name of readdirSync(from)) {
  copyFileSync(join(from, name), join(to, name));
  console.log(`copied deploy/${name} -> dist/${name}`);
}
