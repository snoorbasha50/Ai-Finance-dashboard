import { create } from 'zustand';
import { User } from '../types';

interface AppStore {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useStore = create<AppStore>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),

  setAuth: (user, accessToken) => {
    localStorage.setItem('accessToken', accessToken);
    set({ user, accessToken });
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, accessToken: null });
  },
}));
