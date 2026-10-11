import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserPreferences } from '../types.ts';
import { api, getStoredToken, setStoredToken } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => void;
  updatePreferences: (newPrefs: Partial<UserPreferences>) => Promise<void>;
  updateProfileName: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    api.getMe()
      .then((data) => {
        setUser(data.user);
        setPreferences(data.preferences);
      })
      .catch((err) => {
        console.warn('Session expired or invalid:', err);
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setStoredToken(data.token);
    setUser(data.user);
    // Fetch preferences
    try {
      const meData = await api.getMe();
      setPreferences(meData.preferences);
    } catch {
      // Ignore
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    const data = await api.register({ email, password, displayName });
    setStoredToken(data.token);
    setUser(data.user);
    try {
      const meData = await api.getMe();
      setPreferences(meData.preferences);
    } catch {
      // Ignore
    }
  };

  const guestLogin = async () => {
    const data = await api.guestLogin();
    setStoredToken(data.token);
    setUser(data.user);
    try {
      const meData = await api.getMe();
      setPreferences(meData.preferences);
    } catch {
      // Ignore
    }
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setPreferences(null);
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    try {
      const res = await api.updatePreferences(newPrefs);
      setPreferences(res.preferences);
    } catch (err) {
      console.error('Failed to update preferences:', err);
      throw err;
    }
  };

  const updateProfileName = async (displayName: string) => {
    const res = await api.updateProfile(displayName);
    if (user) {
      setUser({ ...user, displayName: res.user.displayName });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        isLoading,
        login,
        register,
        guestLogin,
        logout,
        updatePreferences,
        updateProfileName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
