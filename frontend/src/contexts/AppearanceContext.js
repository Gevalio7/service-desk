import React, { createContext, useContext, useState, useEffect } from 'react';

const AppearanceContext = createContext();

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};

export const AppearanceProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'ru',
    compactMode: false,
    showAvatars: true,
    ticketRowSize: 'normal'
  });

  // Загрузка настроек из localStorage при инициализации
  useEffect(() => {
    const savedSettings = localStorage.getItem('appearanceSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Ошибка при загрузке настроек внешнего вида:', error);
      }
    }
  }, []);

  // Сохранение настроек в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('appearanceSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const resetSettings = () => {
    const defaultSettings = {
      theme: 'light',
      language: 'ru',
      compactMode: false,
      showAvatars: true,
      ticketRowSize: 'normal'
    };
    setSettings(defaultSettings);
  };

  const value = {
    settings,
    updateSetting,
    updateSettings,
    resetSettings
  };

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
};

export default AppearanceContext;