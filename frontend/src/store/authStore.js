import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null, // سيحتوي على { email, role }
      
      login: (token, userData) => set({ token, user: userData }),
      logout: () => set({ token: null, user: null }),
      
      isAuthenticated: () => !!useAuthStore.getState().token,
      getRole: () => useAuthStore.getState().user?.role || null,
    }),
    { name: 'auth-storage' } // اسم التخزين في LocalStorage
  )
);