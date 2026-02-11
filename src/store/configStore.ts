import { create } from 'zustand';
import { SyncConfig, AuthConfig, dbHelpers } from '../db/schema';
import { getSites, getDrives, Site, Drive } from '../api/sitesApi';

interface ConfigState {
  // Sync Config
  syncConfig: SyncConfig | null;
  isLoadingSyncConfig: boolean;
  syncConfigError: string | null;

  // Auth Config
  authConfig: AuthConfig | null;
  isLoadingAuthConfig: boolean;
  authConfigError: string | null;

  // Sites and Drives
  sites: Site[];
  sourceDrives: Drive[];
  destDrives: Drive[];
  isLoadingSites: boolean;
  isLoadingDrives: boolean;

  // Actions - Sync Config
  loadSyncConfig: () => Promise<void>;
  saveSyncConfig: (config: Partial<Omit<SyncConfig, 'id' | 'updatedAt'>>) => Promise<void>;
  updateSourceSite: (siteId: string, siteUrl: string) => void;
  updateSourceLibrary: (libraryId: string, libraryName: string) => void;
  updateDestSite: (siteId: string, siteUrl: string) => void;
  updateDestLibrary: (libraryId: string, libraryName: string) => void;

  // Actions - Auth Config
  loadAuthConfig: () => Promise<void>;
  saveAuthConfig: (config: Omit<AuthConfig, 'id' | 'updatedAt'>) => Promise<void>;
  clearAuthConfig: () => Promise<void>;

  // Actions - Sites and Drives
  loadSites: () => Promise<void>;
  loadSourceDrives: (siteId: string) => Promise<void>;
  loadDestDrives: (siteId: string) => Promise<void>;

  // Utility
  reset: () => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  // Initial state
  syncConfig: null,
  isLoadingSyncConfig: false,
  syncConfigError: null,

  authConfig: null,
  isLoadingAuthConfig: false,
  authConfigError: null,

  sites: [],
  sourceDrives: [],
  destDrives: [],
  isLoadingSites: false,
  isLoadingDrives: false,

  // Load sync config from database
  loadSyncConfig: async () => {
    try {
      set({ isLoadingSyncConfig: true, syncConfigError: null });
      const config = await dbHelpers.getSyncConfig();
      set({ syncConfig: config || null, isLoadingSyncConfig: false });
    } catch (error: any) {
      console.error('Failed to load sync config:', error);
      set({
        isLoadingSyncConfig: false,
        syncConfigError: error.message || 'Failed to load configuration'
      });
    }
  },

  // Save sync config to database
  saveSyncConfig: async (config) => {
    try {
      set({ isLoadingSyncConfig: true, syncConfigError: null });

      const currentConfig = get().syncConfig;
      const updatedConfig = {
        ...currentConfig,
        ...config,
        lastSyncTime: currentConfig?.lastSyncTime || null,
        deltaToken: currentConfig?.deltaToken || null
      };

      await dbHelpers.saveSyncConfig(updatedConfig);

      const newConfig = await dbHelpers.getSyncConfig();
      set({ syncConfig: newConfig || null, isLoadingSyncConfig: false });
    } catch (error: any) {
      console.error('Failed to save sync config:', error);
      set({
        isLoadingSyncConfig: false,
        syncConfigError: error.message || 'Failed to save configuration'
      });
    }
  },

  // Update source site
  updateSourceSite: (siteId, siteUrl) => {
    const config = get().syncConfig;
    set({
      syncConfig: {
        ...config!,
        sourceSiteId: siteId,
        sourceSiteUrl: siteUrl,
        // Clear library when site changes
        sourceLibraryId: undefined,
        sourceLibraryName: undefined
      },
      sourceDrives: [] // Clear drives
    });
  },

  // Update source library
  updateSourceLibrary: (libraryId, libraryName) => {
    const config = get().syncConfig;
    set({
      syncConfig: {
        ...config!,
        sourceLibraryId: libraryId,
        sourceLibraryName: libraryName
      }
    });
  },

  // Update destination site
  updateDestSite: (siteId, siteUrl) => {
    const config = get().syncConfig;
    set({
      syncConfig: {
        ...config!,
        destSiteId: siteId,
        destSiteUrl: siteUrl,
        // Clear library when site changes
        destLibraryId: undefined,
        destLibraryName: undefined
      },
      destDrives: [] // Clear drives
    });
  },

  // Update destination library
  updateDestLibrary: (libraryId, libraryName) => {
    const config = get().syncConfig;
    set({
      syncConfig: {
        ...config!,
        destLibraryId: libraryId,
        destLibraryName: libraryName
      }
    });
  },

  // Load auth config from database
  loadAuthConfig: async () => {
    try {
      set({ isLoadingAuthConfig: true, authConfigError: null });
      const config = await dbHelpers.getAuthConfig();
      set({ authConfig: config || null, isLoadingAuthConfig: false });
    } catch (error: any) {
      console.error('Failed to load auth config:', error);
      set({
        isLoadingAuthConfig: false,
        authConfigError: error.message || 'Failed to load auth configuration'
      });
    }
  },

  // Save auth config to database
  saveAuthConfig: async (config) => {
    try {
      set({ isLoadingAuthConfig: true, authConfigError: null });
      await dbHelpers.saveAuthConfig(config);
      const newConfig = await dbHelpers.getAuthConfig();
      set({ authConfig: newConfig || null, isLoadingAuthConfig: false });
    } catch (error: any) {
      console.error('Failed to save auth config:', error);
      set({
        isLoadingAuthConfig: false,
        authConfigError: error.message || 'Failed to save auth configuration'
      });
    }
  },

  // Clear auth config
  clearAuthConfig: async () => {
    try {
      set({ isLoadingAuthConfig: true, authConfigError: null });
      await dbHelpers.clearAuthConfig();
      set({ authConfig: null, isLoadingAuthConfig: false });
    } catch (error: any) {
      console.error('Failed to clear auth config:', error);
      set({
        isLoadingAuthConfig: false,
        authConfigError: error.message || 'Failed to clear auth configuration'
      });
    }
  },

  // Load sites
  loadSites: async () => {
    try {
      set({ isLoadingSites: true });
      const sites = await getSites();
      set({ sites, isLoadingSites: false });
    } catch (error: any) {
      console.error('Failed to load sites:', error);
      set({ isLoadingSites: false, sites: [] });
      throw error;
    }
  },

  // Load source drives
  loadSourceDrives: async (siteId) => {
    try {
      set({ isLoadingDrives: true });
      const drives = await getDrives(siteId);
      set({ sourceDrives: drives, isLoadingDrives: false });
    } catch (error: any) {
      console.error('Failed to load source drives:', error);
      set({ isLoadingDrives: false, sourceDrives: [] });
      throw error;
    }
  },

  // Load destination drives
  loadDestDrives: async (siteId) => {
    try {
      set({ isLoadingDrives: true });
      const drives = await getDrives(siteId);
      set({ destDrives: drives, isLoadingDrives: false });
    } catch (error: any) {
      console.error('Failed to load dest drives:', error);
      set({ isLoadingDrives: false, destDrives: [] });
      throw error;
    }
  },

  // Reset store
  reset: () => {
    set({
      syncConfig: null,
      isLoadingSyncConfig: false,
      syncConfigError: null,
      authConfig: null,
      isLoadingAuthConfig: false,
      authConfigError: null,
      sites: [],
      sourceDrives: [],
      destDrives: [],
      isLoadingSites: false,
      isLoadingDrives: false
    });
  }
}));
