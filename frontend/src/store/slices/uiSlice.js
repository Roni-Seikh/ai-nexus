import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    sidebarCollapsed: false,
    theme: localStorage.getItem('theme') || 'dark',
    commandPaletteOpen: false,
    settingsOpen: false,
    uploadModalOpen: false,
    modelSelectorOpen: false,
    mobileMenuOpen: false,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    toggleSidebarCollapsed: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed; },
    setTheme: (state, action) => { state.theme = action.payload; localStorage.setItem('theme', action.payload); },
    toggleCommandPalette: (state) => { state.commandPaletteOpen = !state.commandPaletteOpen; },
    setCommandPaletteOpen: (state, action) => { state.commandPaletteOpen = action.payload; },
    setSettingsOpen: (state, action) => { state.settingsOpen = action.payload; },
    setUploadModalOpen: (state, action) => { state.uploadModalOpen = action.payload; },
    setModelSelectorOpen: (state, action) => { state.modelSelectorOpen = action.payload; },
    setMobileMenuOpen: (state, action) => { state.mobileMenuOpen = action.payload; },
  },
});

export const { toggleSidebar, setSidebarOpen, toggleSidebarCollapsed, setTheme, toggleCommandPalette, setCommandPaletteOpen, setSettingsOpen, setUploadModalOpen, setModelSelectorOpen, setMobileMenuOpen } = uiSlice.actions;
export default uiSlice.reducer;
