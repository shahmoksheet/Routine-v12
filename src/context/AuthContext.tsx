import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId?: string;
  workspaceId?: string;
  departmentId?: string;
  managerId?: string;
  subscriptionPlan?: 'Free' | 'Pro' | 'Enterprise';
  language?: string;
  themeColor?: string;
  isDarkMode?: boolean;
  kanbanColumns?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User, token?: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log('AuthProvider: Rendering', { isLoading, hasUser: !!user });

  useEffect(() => {
    const initAuth = async () => {
      console.log('AuthProvider: Initializing');
      const token = localStorage.getItem('taskops_token');
      
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setUser(data.user);
              localStorage.setItem('taskops_user', JSON.stringify(data.user));
              console.log('AuthProvider: Session verified', data.user);
            }
          } else {
            console.log('AuthProvider: Session invalid, clearing storage');
            localStorage.removeItem('taskops_user');
            localStorage.removeItem('taskops_token');
          }
        } catch (e) {
          console.error('AuthProvider: Failed to verify session:', e);
          // Fallback to stored user if offline
          const storedUser = localStorage.getItem('taskops_user');
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch (e) {}
          }
        }
      }
      
      setIsLoading(false);
      console.log('AuthProvider: Initialization complete');
    };

    initAuth();
  }, []);

  const login = (userData: User, token?: string) => {
    console.log('AuthProvider: login called with', userData);
    setUser(userData);
    localStorage.setItem('taskops_user', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('taskops_token', token);
    }
    console.log('AuthProvider: user state updated');
  };

  const logout = async () => {
    console.log('AuthProvider: logout called');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout API failed:', err);
    }
    setUser(null);
    localStorage.removeItem('taskops_user');
    localStorage.removeItem('taskops_token');
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-role': user.role,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      
      const data = await res.json();
      if (data.success) {
        const updatedUser = { ...user, ...data.user };
        setUser(updatedUser);
        localStorage.setItem('taskops_user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
