// 線画の SVG アイコン（docs/01-screen-design.md 7章）。絵文字は OS ごとに見た目が変わるため使わない。
// アイコン用のライブラリは使わない（docs/03 の 6.4）。すべて装飾なので aria-hidden にする。

type IconProps = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  'aria-hidden': true as const,
  focusable: 'false' as const,
});

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function LogoIcon({ size = 24, className }: IconProps) {
  // 仮のロゴ。S12 で brand-assets の CircleNote ロゴに差し替える
  return (
    <svg {...base(size)} className={className} fill="none" stroke="#10B981" strokeWidth={2.5}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function ShieldIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} {...stroke} className={className}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </svg>
  );
}

export function FillIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
    </svg>
  );
}

export function MosaicIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="currentColor">
      <rect x="4" y="4" width="7" height="7" />
      <rect x="13" y="4" width="7" height="7" opacity="0.5" />
      <rect x="4" y="13" width="7" height="7" opacity="0.5" />
      <rect x="13" y="13" width="7" height="7" />
    </svg>
  );
}

export function UndoIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} {...stroke} className={className}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 010 12h-3" />
    </svg>
  );
}

export function TrashIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} {...stroke} className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

export function CopyIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} {...stroke} className={className}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" />
    </svg>
  );
}

export function DownloadIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} {...stroke} className={className}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

export function ImageIcon({ size = 40, className }: IconProps) {
  return (
    <svg {...base(size)} {...stroke} strokeWidth={1.5} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 16l5-5 4 4 3-3 6 6" />
    </svg>
  );
}

export function WarningIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} {...stroke} className={className}>
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} {...stroke} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
