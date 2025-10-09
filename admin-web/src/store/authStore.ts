import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

// 从 localStorage 读取初始状态
const getInitialState = () => {
  try {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
      token,
      user,
      isAuthenticated: !!token && !!user,
    };
  } catch {
    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  ...getInitialState(),

  setAuth: (token: string, user: User) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

