'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface RecruiterUser {
  id: string;
  email: string;
  fullName: string;
  companyName?: string;
  role: string;
  isApproved: boolean;
}

interface LoginResult {
  success: boolean;
  error?: string;
  pendingApproval?: boolean;
}

interface AuthContextType {
  user: RecruiterUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isApproved: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<RecruiterUser | null>;
}

const CACHED_USER_KEY = 'intervue_cached_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<RecruiterUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(CACHED_USER_KEY);
        if (cached) return JSON.parse(cached);
      } catch {
        // Fallback
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(CACHED_USER_KEY);
        if (cached) return false;
      } catch {
        // Fallback
      }
    }
    return true;
  });
  const router = useRouter();

  const updateCachedUser = (userData: RecruiterUser | null) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      try {
        if (userData) {
          sessionStorage.setItem(CACHED_USER_KEY, JSON.stringify(userData));
        } else {
          sessionStorage.removeItem(CACHED_USER_KEY);
        }
      } catch {
        // Ignored
      }
    }
  };

  const refreshSession = useCallback(async (): Promise<RecruiterUser | null> => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const userData: RecruiterUser = {
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.fullName || 'Recruiter',
            companyName: data.user.companyName,
            role: data.user.role || 'recruiter',
            isApproved: data.user.isApproved !== false,
          };
          updateCachedUser(userData);
          return userData;
        }
      }
      updateCachedUser(null);
      return null;
    } catch {
      updateCachedUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!isSubscribed) return;

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            const userData: RecruiterUser = {
              id: data.user.id,
              email: data.user.email,
              fullName: data.user.fullName || 'Recruiter',
              companyName: data.user.companyName,
              role: data.user.role || 'recruiter',
              isApproved: data.user.isApproved !== false,
            };
            if (isSubscribed) {
              updateCachedUser(userData);
              setIsLoading(false);
            }
            return;
          }
        }
        if (isSubscribed) updateCachedUser(null);
      } catch {
        if (isSubscribed) updateCachedUser(null);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    })();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Authentication failed',
          pendingApproval: Boolean(data.pendingApproval),
        };
      }

      if (data.user) {
        const userData: RecruiterUser = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName || 'Recruiter',
          companyName: data.user.companyName,
          role: data.user.role || 'recruiter',
          isApproved: data.user.isApproved !== false,
        };
        updateCachedUser(userData);
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error during login';
      return { success: false, error: message };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.warn('Logout API invocation failed:', e);
    } finally {
      updateCachedUser(null);
      router.push('/login');
    }
  };

  const isAuthenticated = Boolean(user);
  const isApproved = user?.isApproved ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isApproved,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
