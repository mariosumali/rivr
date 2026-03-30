import { useTheme } from '../../hooks/useTheme';
import type { ThemeId } from '../../theme/themeController';

function HollowHeart({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
      />
    </svg>
  );
}

function HollowSpade({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C8.5 5.5 3 9 3 13.5a5 5 0 004.88 5L7 22h10l-.88-3.5A5 5 0 0021 13.5C21 9 15.5 5.5 12 2z"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PRESETS: {
  id: ThemeId;
  name: string;
  tag: string;
  previewBg: string;
  footBg: string;
  nameColor: string;
  tagColor: string;
  cardColor: string;
  lineBorder: string;
  tableBorder: string;
}[] = [
  {
    id: 'dark',
    name: 'Dark Minimal',
    tag: 'Default',
    previewBg: '#000000',
    footBg: '#050505',
    nameColor: '#f0f0f0',
    tagColor: '#484848',
    cardColor: 'rgba(255,255,255,0.7)',
    lineBorder: 'rgba(255,255,255,0.18)',
    tableBorder: 'rgba(255,255,255,0.15)',
  },
  {
    id: 'light',
    name: 'Paper White',
    tag: 'Light',
    previewBg: '#f0ebe0',
    footBg: '#ede8df',
    nameColor: '#1a2e44',
    tagColor: '#8a8070',
    cardColor: 'rgba(0,0,0,0.6)',
    lineBorder: 'rgba(0,0,0,0.15)',
    tableBorder: 'rgba(0,0,0,0.12)',
  },
  {
    id: 'felt',
    name: 'Felt Green',
    tag: 'Casino',
    previewBg: '#060d08',
    footBg: '#0a100c',
    nameColor: '#c8b87a',
    tagColor: '#3a5a40',
    cardColor: 'rgba(255,255,255,0.7)',
    lineBorder: 'rgba(255,255,255,0.14)',
    tableBorder: 'rgba(255,255,255,0.1)',
  },
  {
    id: 'neon',
    name: 'Neon',
    tag: 'Cyberpunk',
    previewBg: '#020204',
    footBg: '#040408',
    nameColor: '#d0f0e0',
    tagColor: '#203830',
    cardColor: 'rgba(0,255,136,0.6)',
    lineBorder: 'rgba(0,255,136,0.2)',
    tableBorder: 'rgba(0,255,136,0.12)',
  },
];

export function ThemesView() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="piq-themes">
      <div className="piq-sidebar__lbl" style={{ marginBottom: 16 }}>
        Visual themes
      </div>
      <div className="piq-theme-row">
        {PRESETS.map((p) => {
          const selected = theme === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`piq-theme-tile ${selected ? 'piq-theme-tile--selected' : ''}`}
              onClick={() => setTheme(p.id)}
              style={{
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
              }}
            >
              <div className="piq-theme-preview" style={{ background: p.previewBg }}>
                {/* Table rectangle bezel */}
                <div
                  style={{
                    position: 'absolute',
                    width: 120,
                    height: 56,
                    borderRadius: 8,
                    border: `1px solid ${p.tableBorder}`,
                    background: 'transparent',
                  }}
                />
                {/* Card A */}
                <div
                  style={{
                    zIndex: 2,
                    transform: 'rotate(-8deg) translateX(-4px)',
                    width: 44,
                    height: 62,
                    borderRadius: 4,
                    border: `1px solid ${p.lineBorder}`,
                    background: p.previewBg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    fontSize: 14,
                    fontWeight: 500,
                    color: p.cardColor,
                  }}
                >
                  A
                  <HollowHeart size={16} color={p.cardColor} />
                </div>
                {/* Card K */}
                <div
                  style={{
                    zIndex: 2,
                    transform: 'rotate(5deg) translateX(4px)',
                    width: 44,
                    height: 62,
                    borderRadius: 4,
                    border: `1px solid ${p.lineBorder}`,
                    background: p.previewBg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    fontSize: 14,
                    fontWeight: 500,
                    color: p.cardColor,
                  }}
                >
                  K
                  <HollowSpade size={16} color={p.cardColor} />
                </div>
              </div>
              <div
                className="piq-theme-foot"
                style={{
                  background: p.footBg,
                  borderTopColor: p.id === 'light' ? 'rgba(0,0,0,0.07)' : undefined,
                }}
              >
                <span className="piq-theme-name" style={{ color: p.nameColor }}>
                  {p.name}
                </span>
                <span className="piq-theme-tag" style={{ color: p.tagColor }}>
                  {p.tag}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
