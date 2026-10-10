'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Role, authApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  register: (name: string, phone: string, delivery_address: string, password: string, email?: string) => Promise<User>;
  changePassword: (newPassword: string, currentPassword?: string, confirmPassword?: string) => Promise<void>;
  logout: () => void;
  redirectToDashboard: (role?: Role) => void;
  refreshUser: () => Promise<User | null>;
  markInstructionsAccepted: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('nutrisun_token');
      const storedUser = localStorage.getItem('nutrisun_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify with backend to get latest server state (e.g. instructions_accepted)
        authApi
          .getMe()
          .then((res) => {
            if (res.data?.user) {
              setUser(res.data.user);
              localStorage.setItem('nutrisun_user', JSON.stringify(res.data.user));
            }
          })
          .catch(() => {
            // Keep local cached user if offline or network error
          });
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const redirectToDashboard = (targetRole?: Role) => {
    const role = targetRole || user?.role;
    switch (role) {
      case 'admin':
        router.replace('/dashboard/admin');
        break;
      case 'chef':
        router.replace('/dashboard/chef');
        break;
      case 'delivery':
        router.replace('/dashboard/delivery');
        break;
      case 'customer':
      default:
        router.replace('/dashboard/customer');
        break;
    }
  };

  const login = async (phone: string, password: string): Promise<User> => {
    const response = await authApi.login({ phone, password });
    const { token: receivedToken, user: loggedUser } = response.data;
    setToken(receivedToken);
    setUser(loggedUser);
    localStorage.setItem('nutrisun_token', receivedToken);
    localStorage.setItem('nutrisun_user', JSON.stringify(loggedUser));
    return loggedUser;
  };

  const register = async (
    name: string,
    phone: string,
    delivery_address: string,
    password: string,
    email?: string
  ): Promise<User> => {
    const response = await authApi.register({ name, phone, delivery_address, password, email });
    const { token: receivedToken, user: newUser } = response.data;
    setToken(receivedToken);
    setUser(newUser);
    localStorage.setItem('nutrisun_token', receivedToken);
    localStorage.setItem('nutrisun_user', JSON.stringify(newUser));
    return newUser;
  };

  const changePassword = async (newPassword: string, currentPassword?: string, confirmPassword?: string): Promise<void> => {
    await authApi.changePassword({
      new_password: newPassword,
      current_password: currentPassword,
      confirm_password: confirmPassword,
    });
    if (user) {
      const updatedUser = { ...user, must_change_password: false };
      setUser(updatedUser);
      localStorage.setItem('nutrisun_user', JSON.stringify(updatedUser));
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const res = await authApi.getMe();
      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('nutrisun_user', JSON.stringify(res.data.user));
        return res.data.user;
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
    return user;
  };

  const markInstructionsAccepted = () => {
    if (user) {
      const updatedUser = {
        ...user,
        instructions_accepted: true,
        instructions_accepted_at: new Date().toISOString(),
        instructions_version: 'v1.0',
      };
      setUser(updatedUser);
      localStorage.setItem('nutrisun_user', JSON.stringify(updatedUser));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('nutrisun_token');
    localStorage.removeItem('nutrisun_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        changePassword,
        logout,
        redirectToDashboard,
        refreshUser,
        markInstructionsAccepted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
