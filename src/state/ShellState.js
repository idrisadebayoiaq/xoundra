import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useApp } from './AppState';

const ShellContext = React.createContext({
  desktop: false,
  sidebar: true,
  toggleSidebar: () => {},
  panel: false,
  openPanel: () => {},
  closePanel: () => {},
  search: '',
  setSearch: () => {},
});

export function ShellProvider({ children }) {
  const { width } = useWindowDimensions();
  const { userId, ready } = useApp();
  const path = usePathname();
  const desktop = Platform.OS === 'web' && width >= 760 && Boolean(userId) && ready;
  const [sidebar, setSidebar] = React.useState(width >= 1080);
  const [panel, setPanel] = React.useState(width >= 1180);
  const [search, setSearchState] = React.useState('');
  const sidebarChose = React.useRef(false);
  const panelChose = React.useRef(false);

  React.useEffect(() => {
    if (!desktop || sidebarChose.current) return;
    setSidebar(width >= 1080);
  }, [desktop, width]);

  React.useEffect(() => {
    if (!desktop || panelChose.current) return;
    setPanel(width >= 1180);
  }, [desktop, width]);

  const toggleSidebar = React.useCallback(() => {
    sidebarChose.current = true;
    setSidebar((open) => !open);
  }, []);

  const openPanel = React.useCallback(() => {
    panelChose.current = true;
    setPanel(true);
  }, []);

  const closePanel = React.useCallback(() => {
    panelChose.current = true;
    setPanel(false);
  }, []);

  const setSearch = React.useCallback((text) => {
    setSearchState(text);
    if (text.trim() && path !== '/explore') router.navigate('/explore');
  }, [path]);

  const value = React.useMemo(() => ({
    desktop,
    sidebar,
    toggleSidebar,
    panel,
    openPanel,
    closePanel,
    search,
    setSearch,
  }), [desktop, sidebar, toggleSidebar, panel, openPanel, closePanel, search, setSearch]);

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  return React.useContext(ShellContext);
}
