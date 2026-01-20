'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authHelpers from '@/lib/auth-helpers';

interface User {
  name: string;
  email: string;
  date_birth?: string;
  phone_number?: string;
  balance: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, code: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string) => Promise<void>;
  requestLoginCode: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const userData = await authHelpers.getUserProfile() as User;
        setUser(userData);
      }
    } catch {
      // Silenciosamente limpa tokens inválidos sem fazer nada
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string) => {
    await authHelpers.registerUser(name, email);
  };

  const requestLoginCode = async (email: string) => {
    await authHelpers.requestLoginCode(email);
  };

  const login = async (email: string, code: string) => {
    const { access, refresh } = await authHelpers.loginWithCode(email, code);
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    await loadUser();
  };

  const loginWithPassword = async (email: string, password: string) => {
    const { access, refresh } = await authHelpers.loginWithPassword(email, password);
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    await loadUser();
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authHelpers.logout(refreshToken);
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithPassword,
        logout,
        register,
        requestLoginCode,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
