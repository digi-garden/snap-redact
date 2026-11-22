// S1 の仮の画面。S4 で画面の骨組み（docs/01-screen-design.md）に置き換える。
export function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">Snap-Redact</h1>
      <p className="text-zinc-400">スクショを貼る前の5秒前処理（準備中）</p>
    </main>
  );
}
