import { useCallback, useSyncExternalStore } from 'react';
import {
  getThemeSnapshot,
  subscribeTheme,
  setGlobalTheme,
  type ThemeId,
} from '../theme/themeController';

export type { ThemeId };

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeSnapshot);
  const setTheme = useCallback((t: ThemeId) => {
    setGlobalTheme(t);
  }, []);
  return { theme, setTheme };
}
