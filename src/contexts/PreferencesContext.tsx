import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useUserPreferences, UserPreferences } from '@/hooks/useUserPreferences';
import { useTheme } from '@/components/theme/ThemeProvider';

interface PreferencesContextType {
  preferences: UserPreferences;
  isLoading: boolean;
  isSaving: boolean;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  updateMultiplePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

// Accent color palette definitions (HSL values)
const ACCENT_COLORS: Record<string, { light: string; dark: string; glow: string }> = {
  blue: {
    light: '217 91% 60%',
    dark: '217 91% 65%',
    glow: '217 91% 60%',
  },
  teal: {
    light: '173 58% 39%',
    dark: '173 58% 50%',
    glow: '173 58% 39%',
  },
  purple: {
    light: '262 83% 58%',
    dark: '262 83% 68%',
    glow: '262 83% 58%',
  },
  rose: {
    light: '346 77% 49%',
    dark: '346 77% 60%',
    glow: '346 77% 49%',
  },
  orange: {
    light: '25 95% 53%',
    dark: '25 95% 60%',
    glow: '25 95% 53%',
  },
  green: {
    light: '142 76% 36%',
    dark: '142 76% 46%',
    glow: '142 76% 36%',
  },
  amber: {
    light: '37 92% 50%',
    dark: '43 96% 56%',
    glow: '37 92% 50%',
  },
  indigo: {
    light: '239 84% 67%',
    dark: '239 84% 72%',
    glow: '239 84% 67%',
  },
};

const FONT_SIZES: Record<string, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

const DENSITY_SPACING: Record<string, string> = {
  compact: '0.2rem',
  comfortable: '0.25rem',
  spacious: '0.35rem',
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const prefs = useUserPreferences();
  const { setTheme } = useTheme();

  // Apply accent color to CSS variables
  useEffect(() => {
    const accent = ACCENT_COLORS[prefs.preferences.accent_color] || ACCENT_COLORS.amber;
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');

    const color = isDark ? accent.dark : accent.light;
    root.style.setProperty('--primary', color);
    root.style.setProperty('--ring', color);
    root.style.setProperty('--sidebar-primary', color);
    root.style.setProperty('--sidebar-ring', color);
    root.style.setProperty('--shadow-glow', `0 0 20px hsl(${accent.glow} / 0.3)`);

    // Update gradient
    root.style.setProperty(
      '--gradient-primary',
      `linear-gradient(135deg, hsl(${accent.glow}) 0%, hsl(${accent.glow} / 0.7) 100%)`
    );
  }, [prefs.preferences.accent_color]);

  // Apply font size
  useEffect(() => {
    const size = FONT_SIZES[prefs.preferences.font_size] || FONT_SIZES.medium;
    document.documentElement.style.fontSize = size;
  }, [prefs.preferences.font_size]);

  // Apply layout density
  useEffect(() => {
    const spacing = DENSITY_SPACING[prefs.preferences.layout_density] || DENSITY_SPACING.comfortable;
    document.documentElement.style.setProperty('--spacing', spacing);
  }, [prefs.preferences.layout_density]);

  // Sync theme preference
  useEffect(() => {
    if (prefs.preferences.theme && !prefs.isLoading) {
      setTheme(prefs.preferences.theme);
    }
  }, [prefs.preferences.theme, prefs.isLoading, setTheme]);

  // Listen for dark mode changes to re-apply accent
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const accent = ACCENT_COLORS[prefs.preferences.accent_color] || ACCENT_COLORS.amber;
      const isDark = document.documentElement.classList.contains('dark');
      const color = isDark ? accent.dark : accent.light;
      document.documentElement.style.setProperty('--primary', color);
      document.documentElement.style.setProperty('--ring', color);
      document.documentElement.style.setProperty('--sidebar-primary', color);
      document.documentElement.style.setProperty('--sidebar-ring', color);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [prefs.preferences.accent_color]);

  return (
    <PreferencesContext.Provider value={prefs}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

export { ACCENT_COLORS, FONT_SIZES, DENSITY_SPACING };
