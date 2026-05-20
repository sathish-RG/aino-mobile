import { create } from 'zustand';
import { storage } from '@/src/lib/storage';

export type UserRole = 'Admin' | 'Owner' | 'Agent';

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoaded: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  updateAccessToken: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoaded: false,

  setAuth: async (user, accessToken, refreshToken) => {
    // Update in-memory state immediately so navigation guards fire without waiting on I/O.
    set({ user, accessToken, refreshToken });
    await Promise.all([
      storage.set('accessToken', accessToken),
      storage.set('refreshToken', refreshToken),
      storage.set('user', JSON.stringify(user)),
    ]);
  },

  updateAccessToken: async (accessToken) => {
    await storage.set('accessToken', accessToken);
    set({ accessToken });
  },

  logout: async () => {
    await Promise.all([
      storage.delete('accessToken'),
      storage.delete('refreshToken'),
      storage.delete('user'),
    ]);
    set({ user: null, accessToken: null, refreshToken: null });
  },

  loadFromStorage: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        storage.get('accessToken'),
        storage.get('refreshToken'),
        storage.get('user'),
      ]);
      const user = userJson ? (JSON.parse(userJson) as AuthUser) : null;
      set({ user, accessToken, refreshToken, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
}));
