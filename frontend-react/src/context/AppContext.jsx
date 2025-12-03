import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth.service';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentApp, setCurrentApp] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load current user from localStorage on mount
  useEffect(() => {
    const ownerData = authService.getCurrentOwner();
    if (ownerData) {
      setCurrentUser(ownerData);
    }

    const appId = localStorage.getItem('currentAppId');
    if (appId) {
      // Load app data if needed
      setCurrentApp({ id: appId });
    }

    setLoading(false);
  }, []);

  // Update current user
  const updateCurrentUser = (userData) => {
    setCurrentUser(userData);
    if (userData) {
      localStorage.setItem('ownerData', JSON.stringify(userData));
    } else {
      localStorage.removeItem('ownerData');
    }
  };

  // Update current app
  const updateCurrentApp = (appData) => {
    setCurrentApp(appData);
    if (appData?.id) {
      localStorage.setItem('currentAppId', appData.id);
    } else {
      localStorage.removeItem('currentAppId');
    }
  };

  // Logout
  const logout = async () => {
    await authService.logoutOwner();
    setCurrentUser(null);
    setCurrentApp(null);
  };

  const value = {
    currentUser,
    currentApp,
    loading,
    updateCurrentUser,
    updateCurrentApp,
    logout,
    isAuthenticated: authService.isAuthenticated(),
    isAdmin: authService.isWaterbaseAdmin(),
    userRole: authService.getUserRole(),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};


