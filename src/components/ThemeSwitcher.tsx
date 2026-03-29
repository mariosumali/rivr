import { useState, useEffect } from 'react';

type ThemeId = 'dark' | 'light' | 'felt' | 'neon';

const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'dark', label: 'Dark', swatch: '#1a1a1a' },
  { id: 'light', label: 'Paper', swatch: '#f5f0e8' },
  { id: 'felt', label: 'Felt', swatch: '#1b4d2e' },
  { id: 'neon', label: 'Neon', swatch: '#00ff88' },
];

function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem('rivr-theme');
    if (stored && THEMES.some((t) => t.id === stored)) return stored as ThemeId;
  } catch {}
  return 'dark';
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>(getStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rivr-theme', theme);
  }, [theme]);

  return (
    <div style={styles.container}>
      {THEMES.map((t) => (
        <button
          key={t.id}
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
