import { createContext, useContext, useState, type MouseEvent, type ReactNode } from 'react';

type Appearance = {
  collapsed: boolean;
  toggleSidebar: () => void;
  isDark: boolean;
  onThemeChange: (dark: boolean, event: MouseEvent<HTMLButtonElement>) => void;
};
const AppearanceContext = createContext<Appearance | null>(null);

/** Shared for this demo session; navigation keeps preferences and refresh resets them. */
export function AppearanceProvider({ isDark, onThemeChange, children }: Pick<Appearance, 'isDark' | 'onThemeChange'> & { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return <AppearanceContext.Provider value={{ collapsed, toggleSidebar: () => setCollapsed(value => !value), isDark, onThemeChange }}>
    {children}
  </AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('Dashboard appearance requires AppearanceProvider.');
  return value;
}
