import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser } from '@smart-library/shared';
import { ApiClient } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  studentLogin: (params?: { studentId?: string; name?: string; department?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const stored = ApiClient.getStoredUser();
    const token = ApiClient.getToken();
    if (stored && token) {
      // Check token expiration
      const expDate = new Date(stored.expiresAt).getTime();
      if (Date.now() < expDate) {
        setUser(stored);
      } else {
        ApiClient.clearAuth();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, pass: string) => {
    const authData = await ApiClient.login(username, pass);
    setUser(authData);
  };

  const studentLogin = async (params?: { studentId?: string; name?: string; department?: string }) => {
    const authData = await ApiClient.studentLogin(params);
    setUser(authData);
  };

  const logout = async () => {
    await ApiClient.logout();
    setUser(null);
  };

  const isAdmin = !!user && user.role === 'admin';
  const isStudent = !!user && user.role === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin,
        isStudent,
        isLoading,
        login,
        studentLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
