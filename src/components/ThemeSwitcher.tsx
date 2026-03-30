import { useTheme } from '../hooks/useTheme';
import type { ThemeId } from '../theme/themeController';

const SWATCHES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'dark', label: 'Dark', swatch: '#1a1a1a' },
  { id: 'light', label: 'Paper', swatch: '#f5f0e8' },
  { id: 'felt', label: 'Felt', swatch: '#1b4d2e' },
  { id: 'neon', label: 'Neon', swatch: '#00ff88' },
];

/** Compact swatches — prefer Themes screen in the app shell for full previews. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div style={styles.container}>
      {SWATCHES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          title={t.label}
          style={{
            ...styles.swatch,
            backgroundColor: t.swatch,
            outline: theme === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            outlineOffset: '2px',
          }}
          aria-label={`Switch to ${t.label} theme`}
        />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '8px',
    padding: '8px',
  },
  swatch: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.15)',
    transition: 'outline-color 200ms ease',
  },
};
