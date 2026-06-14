import React, { createContext, useContext, useState, useCallback } from 'react';

export type UserRole = 'SystemAdmin' | 'TMCAdmin' | 'Reviewer' | 'ReadOnly';

export interface AuthUser {
  user_id: string;
  tenant_id: string;
  role: UserRole;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (_email: string, _password: string) => {
    // Stub: in production calls Cognito
    setUser({
      user_id: 'mock-user-id',
      tenant_id: 'mock-tenant-id',
      role: 'SystemAdmin',
      email: _email,
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
