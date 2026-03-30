export type ThemeId = 'dark' | 'light' | 'felt' | 'neon';

const THEMES: ThemeId[] = ['dark', 'light', 'felt', 'neon'];

function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem('rivr-theme');
    if (stored && THEMES.includes(stored as ThemeId)) return stored as ThemeId;
  } catch {
    /* ignore */
  }
  return 'dark';
}

let currentTheme: ThemeId = readStoredTheme();
const listeners = new Set<() => void>();

if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', currentTheme);
}

function applyTheme(t: ThemeId) {
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  try {
    localStorage.setItem('rivr-theme', t);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function getThemeSnapshot(): ThemeId {
  return currentTheme;
}

export function subscribeTheme(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function setGlobalTheme(t: ThemeId): void {
  applyTheme(t);
}

/** Call once on app boot so the document matches stored preference. */
export function hydrateThemeFromStorage(): void {
  applyTheme(readStoredTheme());
}
