import { create } from 'zustand';
import { AccountInfo } from '@azure/msal-browser';
import {
  login as authLogin,
  logout as authLogout,
  getAccount,
  isAuthenticated as checkIsAuthenticated
} from '../auth/authService';
import { initializeMsal, reinitializeMsal } from '../auth/msalConfig';

interface AuthState {
  // State
  isInitialized: boolean;
  isAuthenticated: boolean;
  account: AccountInfo | null;
  isLoading: boolean;
  error: string | null;
  needsCredentials: boolean;

  // Actions
  initialize: () => Promise<void>;
  reinitialize: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  isInitialized: false,
  isAuthenticated: false,
  account: null,
  isLoading: false,
  error: null,
  needsCredentials: false,

  // Initialize MSAL
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });
      await initializeMsal();

      const account = getAccount();
      const isAuthenticated = checkIsAuthenticated();

      set({
        isInitialized: true,
        isAuthenticated,
        account,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to initialize auth:', error);
      const needsCredentials = error.message === 'NO_CREDENTIALS';
      set({
        isInitialized: true,
        isLoading: false,
        needsCredentials,
        error: needsCredentials
          ? 'Azure AD credentials not configured'
          : (error.message || 'Failed to initialize authentication')
      });
    }
  },

  // Re-initialize MSAL (when credentials change)
  reinitialize: async () => {
    try {
      set({ isLoading: true, error: null });
      await reinitializeMsal();

      set({
        isInitialized: true,
        isAuthenticated: false,
        account: null,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to reinitialize auth:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to reinitialize authentication'
      });
    }
  },

  // Login
  login: async () => {
    try {
      set({ isLoading: true, error: null });

      const account = await authLogin();

      set({
        isAuthenticated: true,
        account,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      set({
        isLoading: false,
        error: error.message || 'Login failed'
      });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      set({ isLoading: true, error: null });

      await authLogout();

      set({
        isAuthenticated: false,
        account: null,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Logout failed:', error);
      set({
        isLoading: false,
        error: error.message || 'Logout failed'
      });
    }
  },

  // Check authentication status
  checkAuth: () => {
    const account = getAccount();
    const isAuthenticated = checkIsAuthenticated();

    set({
      isAuthenticated,
      account
    });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));
