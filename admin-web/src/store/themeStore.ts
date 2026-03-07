import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('agent-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  return 'light';
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('agent-theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
  setTheme: (t) => {
    localStorage.setItem('agent-theme', t);
    document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
  },
}));
