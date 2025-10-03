import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login failed');
          }

          const data = await response.json();
          
          set({
            user: data.user,
            token: data.token,
            isLoading: false,
            error: null,
          });

          return data;
        } catch (error) {
          set({
            user: null,
            token: null,
            isLoading: false,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Registration failed');
          }

          const data = await response.json();
          
          set({
            user: data.user,
            token: data.token,
            isLoading: false,
            error: null,
          });

          return data;
        } catch (error) {
          set({
            user: null,
            token: null,
            isLoading: false,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isLoading: false,
          error: null,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      clearError: () => {
        set({ error: null });
      },

      // Getters
      isAuthenticated: () => {
        const { user, token } = get();
        return !!(user && token);
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      hasRole: (role) => {
        const { user } = get();
        return user?.role === role;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);

export { useAuthStore };
