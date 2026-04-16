import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export type ThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'cerulean' | 'violet';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_COLORS: Record<ThemeColor, Record<string, string>> = {
  indigo: {
    '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc',
    '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca',
    '800': '#3730a3', '900': '#312e81', 'rgb': '79, 70, 229'
  },
  emerald: {
    '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7',
    '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857',
    '800': '#065f46', '900': '#064e3b', 'rgb': '5, 150, 105'
  },
  rose: {
    '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af',
    '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c',
    '800': '#9f1239', '900': '#881337', 'rgb': '225, 29, 72'
  },
  amber: {
    '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
    '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
    '800': '#92400e', '900': '#78350f', 'rgb': '217, 119, 6'
  },
  cerulean: {
    '50': '#f0f9ff', '100': '#e0f2fe', '200': '#bae6fd', '300': '#7dd3fc',
    '400': '#38bdf8', '500': '#0ea5e9', '600': '#0284c7', '700': '#0369a1',
    '800': '#075985', '900': '#0c4a6e', 'rgb': '2, 132, 199'
  },
  violet: {
    '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd',
    '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9',
    '800': '#5b21b6', '900': '#4c1d95', 'rgb': '124, 58, 237'
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem('themeColor') as ThemeColor) || 'indigo';
  });

  useEffect(() => {
    if (user?.isDarkMode !== undefined) {
      setIsDarkMode(user.isDarkMode);
    }
    if (user?.themeColor) {
      setThemeColorState(user.themeColor as ThemeColor);
    }
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const root = document.documentElement;
    const colors = THEME_COLORS[themeColor];
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--primary-${key}`, value);
    });
    localStorage.setItem('themeColor', themeColor);
  }, [themeColor]);

  const updatePreferences = useCallback(async (color: ThemeColor, dark: boolean) => {
    if (!user) return;
    try {
      const token = localStorage.getItem('taskops_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
        'x-user-role': user.role
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ themeColor: color, isDarkMode: dark }),
      });
    } catch (err) {
      console.error('Failed to sync preferences:', err);
    }
  }, [user]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    updatePreferences(themeColor, newMode);
  };

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    updatePreferences(color, isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
