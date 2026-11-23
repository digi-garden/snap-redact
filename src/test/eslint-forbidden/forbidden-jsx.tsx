// ESLint の禁止ルールのテスト用ファイル（JSX）。forbidden.ts と同じ書式。
export function ForbiddenLink({ url, html }: { url: string; html: string }) {
  return (
    <div>
      <a href={url}>link</a> {/* expect: no-restricted-syntax */}
      <div dangerouslySetInnerHTML={{ __html: html }} /> {/* expect: no-restricted-syntax */}
      <a href="https://circle-note.com/mask-unmask/">ok</a>
    </div>
  );
}
